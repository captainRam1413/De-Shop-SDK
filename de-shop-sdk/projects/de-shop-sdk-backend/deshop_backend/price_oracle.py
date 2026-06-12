"""
De-Shop SDK — Real-Time Skin Price Oracle
==========================================
Fetches live skin prices from Skinport's public API.
Fetches live crypto prices from CoinGecko's public API.

Skinport Public API Docs:
  https://docs.skinport.com/
  GET https://api.skinport.com/v1/items
    - No API key required for public endpoint!
    - Rate limit: ~10 req/min per IP

CoinGecko Public API Docs:
  https://www.coingecko.com/en/api/documentation
  GET https://api.coingecko.com/api/v3/simple/price
    - No API key required (free tier)
    - Rate limit: ~30 req/min on free tier
    - 60-second cache implemented locally

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
from collections import deque
from functools import lru_cache
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Skinport configuration
# ---------------------------------------------------------------------------

SKINPORT_API = "https://api.skinport.com/v1/items"
PRICE_CACHE_TTL = 300  # 5 minutes

# ---------------------------------------------------------------------------
# CoinGecko configuration
# ---------------------------------------------------------------------------

COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price"
COINGECKO_CACHE_TTL = 60  # 60 seconds
HARDCODED_ALGO_USD = 0.20  # Last-resort fallback rate

# CoinGecko in-memory cache: {cache_key: (price, timestamp)}
_cg_cache: dict[str, tuple[float, float]] = {}

# Last known good prices (for 3-tier fallback): {cache_key: float}
_cg_last_known: dict[str, float] = {"algorand_usd": HARDCODED_ALGO_USD}

# Price history — rolling window of up to 24 data points
MAX_HISTORY_POINTS = 24
_price_history: deque[dict[str, Any]] = deque(maxlen=MAX_HISTORY_POINTS)

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

    # Convert USD → μALGO using live CoinGecko rate
    algo_usd_rate = get_algo_usd_price()
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


# ===========================================================================
# CoinGecko — Crypto Price Oracle
# ===========================================================================


def _coingecko_cache_get(cache_key: str) -> float | None:
    """Return cached CoinGecko price if still within TTL, else None."""
    if cache_key in _cg_cache:
        price, ts = _cg_cache[cache_key]
        if time.time() - ts < COINGECKO_CACHE_TTL:
            return price
    return None


def _coingecko_cache_set(cache_key: str, price: float) -> None:
    """Store a CoinGecko price in cache and update last-known-good."""
    _cg_cache[cache_key] = (price, time.time())
    _cg_last_known[cache_key] = price


def _fetch_coingecko_price(coin_id: str, currency: str = "usd") -> float | None:
    """
    Fetch a crypto price from CoinGecko's ``/simple/price`` endpoint.

    Implements a 3-tier fallback:
      1. Live CoinGecko response
      2. Last known good price (from previous successful fetch)
      3. Hardcoded ``$0.20`` for ALGO, or ``None`` for other coins

    Args:
        coin_id:   CoinGecko coin identifier (e.g. ``"algorand"``).
        currency:  Target fiat currency (e.g. ``"usd"``).

    Returns:
        Price as a float, or ``None`` if unavailable.
    """
    cache_key = f"{coin_id}_{currency}"

    # 0. Check local cache first
    cached = _coingecko_cache_get(cache_key)
    if cached is not None:
        return cached

    # 1. Try live CoinGecko fetch
    try:
        resp = requests.get(
            COINGECKO_API,
            params={"ids": coin_id, "vs_currencies": currency},
            timeout=10,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        price = data.get(coin_id, {}).get(currency)
        if price is not None:
            price = float(price)
            _coingecko_cache_set(cache_key, price)
            # Record in price history
            _price_history.append({
                "coin_id": coin_id,
                "currency": currency,
                "price": price,
                "timestamp": time.time(),
                "source": "coingecko",
            })
            return price
    except Exception:
        pass  # fall through to fallback

    # 2. Try last known good price
    if cache_key in _cg_last_known:
        return _cg_last_known[cache_key]

    # 3. Hardcoded fallback (only for ALGO/USD)
    if coin_id == "algorand" and currency == "usd":
        return HARDCODED_ALGO_USD

    return None


# ---------------------------------------------------------------------------
# Public CoinGecko API
# ---------------------------------------------------------------------------

def get_algo_usd_price() -> float:
    """
    Get the current ALGO/USD exchange rate.

    Uses the 3-tier fallback: Live CoinGecko → last known → $0.20.

    Returns:
        ALGO/USD price as float (always returns a value due to hardcoded fallback).
    """
    price = _fetch_coingecko_price("algorand", "usd")
    if price is not None:
        return price
    # Should never reach here for ALGO/USD due to hardcoded fallback
    return HARDCODED_ALGO_USD


def get_crypto_price(coin_id: str, currency: str = "usd") -> float | None:
    """
    Get the current price of any cryptocurrency from CoinGecko.

    Args:
        coin_id:   CoinGecko coin identifier (e.g. ``"bitcoin"``, ``"ethereum"``).
        currency:  Target fiat currency (default ``"usd"``).

    Returns:
        Price as float, or ``None`` if unavailable.
    """
    return _fetch_coingecko_price(coin_id, currency)


def convert_usd_to_microalgo(usd_amount: float) -> int:
    """
    Convert a USD amount to microALGO using the live ALGO/USD rate.

    Args:
        usd_amount: Amount in USD.

    Returns:
        Equivalent amount in microALGO (1 ALGO = 1,000,000 μALGO).
    """
    rate = get_algo_usd_price()
    if rate <= 0:
        return 0
    return round((usd_amount / rate) * 1_000_000)


def get_price_history() -> list[dict[str, Any]]:
    """
    Return the last 24 price data points recorded from CoinGecko fetches.

    Returns:
        List of dicts with keys ``coin_id``, ``currency``, ``price``,
        ``timestamp``, ``source``.
    """
    return list(_price_history)


def get_price_trend() -> str:
    """
    Determine the recent ALGO/USD price trend.

    Compares the most recent data point to the oldest in the history window.

    Returns:
        ``"rising"``  if latest price > oldest price by ≥1%
        ``"falling"`` if latest price < oldest price by ≥1%
        ``"stable"``  otherwise
    """
    algo_history = [p for p in _price_history if p["coin_id"] == "algorand"]
    if len(algo_history) < 2:
        return "stable"
    oldest = algo_history[0]["price"]
    newest = algo_history[-1]["price"]
    if oldest <= 0:
        return "stable"
    change_pct = ((newest - oldest) / oldest) * 100
    if change_pct >= 1.0:
        return "rising"
    if change_pct <= -1.0:
        return "falling"
    return "stable"


def get_oracle_status() -> dict[str, Any]:
    """
    Return a comprehensive status dict for the price oracle.

    Includes current prices, cache ages, trend info, and provider status.
    """
    now = time.time()

    # ALGO/USD details
    algo_price = get_algo_usd_price()
    algo_cache_key = "algorand_usd"
    algo_cache_age = None
    if algo_cache_key in _cg_cache:
        _, ts = _cg_cache[algo_cache_key]
        algo_cache_age = round(now - ts, 1)

    # BTC/USD if available
    btc_price = _coingecko_cache_get("bitcoin_usd")
    btc_cache_age = None
    if "bitcoin_usd" in _cg_cache:
        _, ts = _cg_cache["bitcoin_usd"]
        btc_cache_age = round(now - ts, 1)

    # Skinport cache age (best-effort)
    sp_cache_age = None
    if _price_cache:
        newest_ts = max(ts for _, ts in _price_cache.values())
        sp_cache_age = round(now - newest_ts, 1)

    return {
        "algo_usd": algo_price,
        "algo_usd_source": "coingecko" if algo_cache_age is not None else "fallback",
        "algo_cache_age_seconds": algo_cache_age,
        "btc_usd": btc_price,
        "btc_cache_age_seconds": btc_cache_age,
        "algo_price_trend": get_price_trend(),
        "price_history_points": len(_price_history),
        "skinport_cache_age_seconds": sp_cache_age,
        "skinport_cached_items": len(_price_cache),
        "coingecko_cache_ttl": COINGECKO_CACHE_TTL,
        "skinport_cache_ttl": PRICE_CACHE_TTL,
        "hardcoded_fallback_algo_usd": HARDCODED_ALGO_USD,
    }
