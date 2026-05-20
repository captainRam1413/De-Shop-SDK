"""
De-Shop SDK — Real-Time Skin Price Oracle
==========================================
Fetches live skin prices from Skinport's public API.

Skinport Public API Docs:
  https://docs.skinport.com/
  GET https://api.skinport.com/v1/items
    - No API key required for public endpoint!
    - Rate limit: ~10 req/min per IP

Buff163:
  - No official public API available
  - Prices via community scraping only (not implemented here)
  - Optional: use 3rd party aggregator like pricempire.com

Additional Providers (future):
  - CSFloat API:   https://csfloat.com/api (requires key)
  - Steam market:  https://steamcommunity.com/market/priceoverview/ (rate limited, TOS grey area)
"""

from __future__ import annotations

import time
from functools import lru_cache
from typing import Any

import requests

SKINPORT_API = "https://api.skinport.com/v1/items"
PRICE_CACHE_TTL = 300  # 5 minutes

# Simple in-memory price cache: {(market_hash_name, currency): (price, timestamp)}
_price_cache: dict[tuple[str, str], tuple[float, float]] = {}


def _cache_get(key: tuple[str, str]) -> float | None:
    if key in _price_cache:
        price, ts = _price_cache[key]
        if time.time() - ts < PRICE_CACHE_TTL:
            return price
    return None


def _cache_set(key: tuple[str, str], price: float) -> None:
    _price_cache[key] = (price, time.time())


@lru_cache(maxsize=1)
def _get_skinport_catalog(tradable_only: int = 0, app_id: int = 730) -> list[dict[str, Any]]:
    """
    Fetch the Skinport public item catalog. LRU-cached in-process.

    Returns list of items with min_price, quantity, etc.
    This is a one-time bulk fetch rather than per-item calls.

    Rate limits: ~10 req/min. Use the cache.
    """
    try:
        resp = requests.get(
            SKINPORT_API,
            params={"app_id": app_id, "tradable": tradable_only, "currency": "USD"},
            timeout=15,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return []


def get_skinport_price(market_hash_name: str, currency: str = "USD") -> dict[str, Any]:
    """
    Get the current Skinport price for a CS2 skin.

    Args:
        market_hash_name: e.g. "AK-47 | Redline (Field-Tested)"
        currency: "USD" (Skinport supports USD, EUR, GBP, CNY, etc.)

    Returns:
        {
          "name": str,
          "min_price": float | None,     # Cheapest listing
          "suggested_price": float | None, # Skinport's suggested price
          "quantity": int,
          "currency": str,
          "source": "skinport",
        }

    Notes:
        - Skinport public API only gives USD prices, convert manually for others.
        - Prices are in the currency of the item listing, usually USD.
    """
    cache_key = (market_hash_name, currency)
    cached = _cache_get(cache_key)
    if cached is not None:
        return {
            "name": market_hash_name,
            "min_price": cached,
            "suggested_price": round(cached * 1.05, 2),
            "quantity": None,
            "currency": currency,
            "source": "skinport_cache",
        }

    # Try catalog bulk fetch first (efficient)
    catalog = _get_skinport_catalog()
    for item in catalog:
        if item.get("market_hash_name") == market_hash_name:
            min_price = item.get("min_price")
            if min_price:
                _cache_set(cache_key, min_price)
            return {
                "name": market_hash_name,
                "min_price": min_price,
                "suggested_price": item.get("suggested_price"),
                "quantity": item.get("quantity"),
                "currency": currency,
                "source": "skinport",
            }

    # Not found in catalog
    return {
        "name": market_hash_name,
        "min_price": None,
        "suggested_price": None,
        "quantity": 0,
        "currency": currency,
        "source": "skinport_not_found",
        "note": "Item not found on Skinport. May be untradable or very rare.",
    }


def get_bulk_prices(market_hash_names: list[str]) -> list[dict[str, Any]]:
    """
    Get prices for multiple skins efficiently using the catalog.

    Args:
        market_hash_names: List of CS2 market hash names

    Returns:
        List of price dicts in same order as input
    """
    catalog = _get_skinport_catalog()
    catalog_by_name = {item.get("market_hash_name"): item for item in catalog}

    results = []
    for name in market_hash_names:
        item = catalog_by_name.get(name)
        if item:
            results.append({
                "name": name,
                "min_price": item.get("min_price"),
                "suggested_price": item.get("suggested_price"),
                "quantity": item.get("quantity"),
                "currency": "USD",
                "source": "skinport",
            })
        else:
            results.append({
                "name": name,
                "min_price": None,
                "suggested_price": None,
                "quantity": 0,
                "currency": "USD",
                "source": "not_found",
            })
    return results


def map_steam_item_to_sdk_asset(steam_item: dict[str, Any]) -> dict[str, Any]:
    """
    Map a Steam inventory item to De-Shop SDK asset format,
    including real Skinport price where available.

    Args:
        steam_item: Item dict from fetch_steam_inventory()

    Returns:
        SDK-compatible asset dict with real market price
    """
    name = steam_item.get("name", "Unknown Skin")
    rarity_map = {
        "Consumer Grade": "common",
        "Industrial Grade": "common",
        "Mil-Spec Grade": "uncommon",
        "Restricted": "rare",
        "Classified": "epic",
        "Covert": "legendary",
        "Contraband": "mythic",
        "Base Grade": "common",
        "Distinguished": "uncommon",
        "Exceptional": "rare",
        "Superior": "epic",
        "Master": "legendary",
    }
    raw_rarity = steam_item.get("rarity", "Consumer Grade")
    rarity = rarity_map.get(raw_rarity, "common")

    # Fetch Skinport price
    price_data = get_skinport_price(name)
    min_price_usd = price_data.get("min_price")

    # Convert USD → μALGO (approximate: 1 ALGO ≈ $0.20 at time of writing)
    algo_usd_rate = float(0.20)  # TODO: fetch live from CoinGecko
    price_micro_algo = round((min_price_usd / algo_usd_rate) * 1_000_000) if min_price_usd else 0

    return {
        "steam_asset_id": steam_item.get("asset_id"),
        "name": name,
        "rarity": rarity,
        "skin_type": "weapon" if steam_item.get("weapon") else "character",
        "weapon": steam_item.get("weapon", ""),
        "exterior": steam_item.get("exterior", ""),
        "tradable": steam_item.get("tradable", False),
        "icon_url": steam_item.get("icon_url"),
        "real_market_price_usd": min_price_usd,
        "real_market_price_micro_algo": price_micro_algo,
        "price_source": price_data.get("source"),
        "skinport_quantity": price_data.get("quantity"),
    }
