"""
De-Shop SDK — Input Validation
================================
Validates all incoming request parameters against expected formats.

Prevents:
  - Invalid Algorand wallet addresses
  - SQL injection via malformed input
  - Oversized or missing required fields
  - Invalid rarity/range values
"""

from __future__ import annotations

import re
from typing import Any

# ─── Algorand Address Validation ──────────────────────────────────────────────

# Algorand addresses are 58-character base32 strings
ALGORAND_ADDRESS_RE = re.compile(r"^[A-Z2-7]{58}$")
# Also allow lowercase (some SDKs produce lowercase)
ALGORAND_ADDRESS_RE_CI = re.compile(r"^[A-Za-z2-7]{58}$")


def validate_algorand_address(address: str) -> tuple[bool, str]:
    """
    Validate an Algorand wallet address format.

    Args:
        address: The wallet address string to validate

    Returns:
        Tuple of (is_valid, error_message)
        If valid, error_message is empty string
    """
    if not address:
        return False, "Wallet address is required"

    address = address.strip()

    if len(address) != 58:
        return False, f"Algorand address must be 58 characters, got {len(address)}"

    if not ALGORAND_ADDRESS_RE_CI.match(address):
        return False, "Algorand address must contain only base32 characters (A-Z, 2-7)"

    return True, ""


def validate_wallet_param(wallet: str | None) -> tuple[bool, str]:
    """Validate a wallet parameter from request data."""
    if not wallet:
        return False, "wallet is required"
    return validate_algorand_address(wallet.strip())


# ─── Skin Name Validation ─────────────────────────────────────────────────────

# Allow alphanumeric, spaces, hyphens, underscores, pipes, parentheses
SKIN_NAME_RE = re.compile(r"^[A-Za-z0-9\s\-_|()\.]{1,128}$")


def validate_skin_name(name: str) -> tuple[bool, str]:
    """
    Validate a skin name.

    Rules:
      - 1-128 characters
      - Only alphanumeric, spaces, hyphens, underscores, pipes, parens, dots
    """
    if not name or not name.strip():
        return False, "skin_name is required"
    name = name.strip()
    if len(name) > 128:
        return False, f"skin_name must be at most 128 characters, got {len(name)}"
    if not SKIN_NAME_RE.match(name):
        return False, "skin_name contains invalid characters"
    return True, ""


# ─── Rarity Validation ───────────────────────────────────────────────────────

VALID_RARITIES = {"common", "uncommon", "rare", "epic", "legendary", "mythic"}


def validate_rarity(rarity: str) -> tuple[bool, str]:
    """Validate a rarity level."""
    if not rarity:
        return False, "rarity is required"
    rarity = rarity.strip().lower()
    if rarity not in VALID_RARITIES:
        return False, f"rarity must be one of: {', '.join(sorted(VALID_RARITIES))}"
    return True, ""


# ─── Skin Type Validation ────────────────────────────────────────────────────

VALID_SKIN_TYPES = {"weapon", "character", "accessory"}


def validate_skin_type(skin_type: str) -> tuple[bool, str]:
    """Validate a skin type."""
    if not skin_type:
        return True, ""  # Optional, defaults to 'weapon'
    skin_type = skin_type.strip().lower()
    if skin_type not in VALID_SKIN_TYPES:
        return False, f"skin_type must be one of: {', '.join(sorted(VALID_SKIN_TYPES))}"
    return True, ""


# ─── Royalty BPS Validation ──────────────────────────────────────────────────

def validate_royalty_bps(royalty_bps: int) -> tuple[bool, str]:
    """
    Validate royalty basis points.

    Rules:
      - Must be an integer between 0 and 1000 (0% to 10%)
    """
    if not isinstance(royalty_bps, int):
        try:
            royalty_bps = int(royalty_bps)
        except (ValueError, TypeError):
            return False, "royalty_bps must be an integer"
    if royalty_bps < 0 or royalty_bps > 1000:
        return False, "royalty_bps must be between 0 and 1000"
    return True, ""


# ─── Price Validation ─────────────────────────────────────────────────────────

def validate_price(price: int) -> tuple[bool, str]:
    """
    Validate a listing price in microALGO.

    Rules:
      - Must be a positive integer
      - Maximum 100 billion microALGO (100,000 ALGO)
    """
    if not isinstance(price, int):
        try:
            price = int(price)
        except (ValueError, TypeError):
            return False, "price must be an integer"
    if price <= 0:
        return False, "price must be greater than 0"
    if price > 100_000_000_000:  # 100k ALGO in microALGO
        return False, "price exceeds maximum allowed value"
    return True, ""


# ─── Asset ID Validation ─────────────────────────────────────────────────────

def validate_asset_id(asset_id: int) -> tuple[bool, str]:
    """Validate an asset ID."""
    if not isinstance(asset_id, int):
        try:
            asset_id = int(asset_id)
        except (ValueError, TypeError):
            return False, "asset_id must be an integer"
    if asset_id <= 0:
        return False, "asset_id must be a positive integer"
    return True, ""


# ─── Steam ID Validation ─────────────────────────────────────────────────────

STEAM_ID_RE = re.compile(r"^\d{17}$")


def validate_steam_id(steam_id: str) -> tuple[bool, str]:
    """
    Validate a SteamID64.

    Rules:
      - Must be a 17-digit number
    """
    if not steam_id:
        return False, "steam_id is required"
    steam_id = steam_id.strip()
    if not STEAM_ID_RE.match(steam_id):
        return False, "steam_id must be a 17-digit SteamID64"
    return True, ""


# ─── Batch Validation Helper ─────────────────────────────────────────────────

class ValidationResult:
    """Aggregates multiple validation errors."""

    def __init__(self):
        self.errors: list[dict[str, str]] = []

    def add(self, field: str, message: str) -> None:
        self.errors.append({"field": field, "message": message})

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": "Validation failed",
            "details": self.errors,
        }


def validate_mint_request(data: dict[str, Any]) -> ValidationResult:
    """Validate all fields for a /mint request."""
    result = ValidationResult()

    wallet = str(data.get("wallet", "")).strip()
    valid, msg = validate_wallet_param(wallet)
    if not valid:
        result.add("wallet", msg)

    skin_name = str(data.get("skin_name", "Neon Phantom")).strip()
    valid, msg = validate_skin_name(skin_name)
    if not valid:
        result.add("skin_name", msg)

    rarity = str(data.get("rarity", "rare")).strip().lower()
    valid, msg = validate_rarity(rarity)
    if not valid:
        result.add("rarity", msg)

    skin_type = str(data.get("skin_type", "weapon")).strip().lower()
    valid, msg = validate_skin_type(skin_type)
    if not valid:
        result.add("skin_type", msg)

    royalty_bps = data.get("royalty_bps", 500)
    valid, msg = validate_royalty_bps(royalty_bps)
    if not valid:
        result.add("royalty_bps", msg)

    return result


def validate_list_request(data: dict[str, Any]) -> ValidationResult:
    """Validate all fields for a /list request."""
    result = ValidationResult()

    wallet = str(data.get("wallet", "")).strip()
    valid, msg = validate_wallet_param(wallet)
    if not valid:
        result.add("wallet", msg)

    asset_id = data.get("asset_id", 0)
    valid, msg = validate_asset_id(asset_id)
    if not valid:
        result.add("asset_id", msg)

    price = data.get("price", 0)
    valid, msg = validate_price(price)
    if not valid:
        result.add("price", msg)

    return result


def validate_buy_request(data: dict[str, Any]) -> ValidationResult:
    """Validate all fields for a /buy request."""
    result = ValidationResult()

    buyer_wallet = str(data.get("buyer_wallet", "")).strip()
    valid, msg = validate_wallet_param(buyer_wallet)
    if not valid:
        result.add("buyer_wallet", msg)

    asset_id = data.get("asset_id", 0)
    valid, msg = validate_asset_id(asset_id)
    if not valid:
        result.add("asset_id", msg)

    return result


def validate_cancel_request(data: dict[str, Any]) -> ValidationResult:
    """Validate all fields for a /cancel request."""
    result = ValidationResult()

    wallet = str(data.get("wallet", "")).strip()
    valid, msg = validate_wallet_param(wallet)
    if not valid:
        result.add("wallet", msg)

    asset_id = data.get("asset_id", 0)
    valid, msg = validate_asset_id(asset_id)
    if not valid:
        result.add("asset_id", msg)

    return result
