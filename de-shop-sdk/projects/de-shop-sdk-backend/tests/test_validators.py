"""
Tests — Input Validators
==========================
Unit tests for the deshop_backend.validators module.
"""

import pytest
from deshop_backend.validators import (
    validate_algorand_address,
    validate_wallet_param,
    validate_skin_name,
    validate_rarity,
    validate_skin_type,
    validate_royalty_bps,
    validate_price,
    validate_asset_id,
    validate_steam_id,
    validate_mint_request,
    validate_list_request,
    validate_buy_request,
    validate_cancel_request,
    ValidationResult,
)


class TestAlgorandAddressValidation:
    """Tests for Algorand wallet address validation."""

    def test_valid_address(self):
        address = "A" * 58
        valid, msg = validate_algorand_address(address)
        assert valid is True
        assert msg == ""

    def test_valid_lowercase_address(self):
        address = "a" * 58
        valid, msg = validate_algorand_address(address)
        assert valid is True

    def test_empty_address(self):
        valid, msg = validate_algorand_address("")
        assert valid is False
        assert "required" in msg.lower()

    def test_too_short(self):
        valid, msg = validate_algorand_address("ABC")
        assert valid is False
        assert "58" in msg

    def test_too_long(self):
        valid, msg = validate_algorand_address("A" * 59)
        assert valid is False
        assert "58" in msg

    def test_invalid_characters(self):
        # '0' and '1' are not valid base32 characters
        address = "0" * 58
        valid, msg = validate_algorand_address(address)
        assert valid is False
        assert "base32" in msg.lower()

    def test_whitespace_stripped(self):
        address = "  " + "A" * 58 + "  "
        valid, msg = validate_algorand_address(address.strip())
        assert valid is True


class TestSkinNameValidation:
    """Tests for skin name validation."""

    def test_valid_name(self):
        valid, msg = validate_skin_name("Neon Phantom")
        assert valid is True

    def test_valid_name_with_special_chars(self):
        valid, msg = validate_skin_name("AK-47 | Redline (Field-Tested)")
        assert valid is True

    def test_empty_name(self):
        valid, msg = validate_skin_name("")
        assert valid is False

    def test_too_long_name(self):
        valid, msg = validate_skin_name("A" * 129)
        assert valid is False
        assert "128" in msg

    def test_name_with_invalid_chars(self):
        valid, msg = validate_skin_name("<script>alert('xss')</script>")
        assert valid is False


class TestRarityValidation:
    """Tests for rarity level validation."""

    def test_valid_rarities(self):
        for rarity in ["common", "uncommon", "rare", "epic", "legendary", "mythic"]:
            valid, _ = validate_rarity(rarity)
            assert valid is True, f"{rarity} should be valid"

    def test_case_insensitive(self):
        valid, _ = validate_rarity("RARE")
        assert valid is True

    def test_invalid_rarity(self):
        valid, msg = validate_rarity("ultra")
        assert valid is False
        assert "common" in msg  # Should list valid options

    def test_empty_rarity(self):
        valid, _ = validate_rarity("")
        assert valid is False


class TestSkinTypeValidation:
    """Tests for skin type validation."""

    def test_valid_types(self):
        for st in ["weapon", "character", "accessory"]:
            valid, _ = validate_skin_type(st)
            assert valid is True

    def test_empty_is_valid(self):
        # skin_type is optional, defaults to 'weapon'
        valid, _ = validate_skin_type("")
        assert valid is True

    def test_invalid_type(self):
        valid, _ = validate_skin_type("vehicle")
        assert valid is False


class TestRoyaltyBpsValidation:
    """Tests for royalty basis points validation."""

    def test_valid_bps(self):
        valid, _ = validate_royalty_bps(500)
        assert valid is True

    def test_zero_bps(self):
        valid, _ = validate_royalty_bps(0)
        assert valid is True

    def test_max_bps(self):
        valid, _ = validate_royalty_bps(1000)
        assert valid is True

    def test_negative_bps(self):
        valid, _ = validate_royalty_bps(-1)
        assert valid is False

    def test_over_max_bps(self):
        valid, _ = validate_royalty_bps(1001)
        assert valid is False

    def test_string_bps(self):
        valid, _ = validate_royalty_bps("500")
        assert valid is True


class TestPriceValidation:
    """Tests for price validation."""

    def test_valid_price(self):
        valid, _ = validate_price(1000)
        assert valid is True

    def test_zero_price(self):
        valid, _ = validate_price(0)
        assert valid is False

    def test_negative_price(self):
        valid, _ = validate_price(-1)
        assert valid is False

    def test_excessive_price(self):
        valid, _ = validate_price(100_000_000_001)
        assert valid is False


class TestAssetIdValidation:
    """Tests for asset ID validation."""

    def test_valid_id(self):
        valid, _ = validate_asset_id(1)
        assert valid is True

    def test_zero_id(self):
        valid, _ = validate_asset_id(0)
        assert valid is False

    def test_negative_id(self):
        valid, _ = validate_asset_id(-1)
        assert valid is False


class TestSteamIdValidation:
    """Tests for Steam ID validation."""

    def test_valid_steam_id(self):
        valid, _ = validate_steam_id("76561198715018502")
        assert valid is True

    def test_short_steam_id(self):
        valid, _ = validate_steam_id("12345")
        assert valid is False

    def test_non_numeric_steam_id(self):
        valid, _ = validate_steam_id("abcdefghijklmnopq")
        assert valid is False

    def test_empty_steam_id(self):
        valid, _ = validate_steam_id("")
        assert valid is False


class TestMintRequestValidation:
    """Tests for full mint request validation."""

    def test_valid_mint_request(self):
        data = {
            "wallet": "A" * 58,
            "skin_name": "Neon Phantom",
            "rarity": "rare",
            "skin_type": "weapon",
            "royalty_bps": 500,
        }
        result = validate_mint_request(data)
        assert result.is_valid is True

    def test_invalid_wallet_in_mint(self):
        data = {
            "wallet": "short",
            "skin_name": "Test",
            "rarity": "rare",
        }
        result = validate_mint_request(data)
        assert result.is_valid is False
        assert any(e["field"] == "wallet" for e in result.errors)

    def test_multiple_errors(self):
        data = {
            "wallet": "",
            "rarity": "ultra",
            "royalty_bps": 5000,
        }
        result = validate_mint_request(data)
        assert result.is_valid is False
        assert len(result.errors) >= 2


class TestValidationResult:
    """Tests for the ValidationResult aggregator."""

    def test_initially_valid(self):
        result = ValidationResult()
        assert result.is_valid is True

    def test_add_error(self):
        result = ValidationResult()
        result.add("field", "error message")
        assert result.is_valid is False
        assert len(result.errors) == 1

    def test_to_dict(self):
        result = ValidationResult()
        result.add("wallet", "required")
        d = result.to_dict()
        assert "error" in d
        assert "details" in d
