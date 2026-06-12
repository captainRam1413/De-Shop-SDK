/*
 * De-Shop SDK — Unity Plugin
 * ==========================
 * DeShopTypes.cs — All data types used by the SDK.
 *
 * Usage: Add to your Unity project under Assets/DeShopSDK/Runtime/
 */

using System;
using System.Collections.Generic;

namespace DeShop
{
    // ─── Configuration ──────────────────────────────────────────────────────

    [Serializable]
    public class DeShopConfig
    {
        /// <summary>Your De-Shop backend URL (e.g. http://localhost:5000)</summary>
        public string BackendUrl = "http://localhost:5000";

        /// <summary>Algorand network: testnet | mainnet | localnet</summary>
        public string Network = "testnet";

        /// <summary>Smart contract application ID on Algorand.</summary>
        public long AppId = 758710979L;

        /// <summary>Enable verbose debug logging.</summary>
        public bool Debug = false;

        /// <summary>Request timeout in seconds.</summary>
        public float TimeoutSeconds = 15f;
    }

    // ─── Assets ─────────────────────────────────────────────────────────────

    [Serializable]
    public class AssetMetadata
    {
        public string skin_name;
        public string rarity;
        public string skin_type;   // weapon | character | accessory
        public string ipfs_uri;
        public string image_url;
    }

    [Serializable]
    public class PriceSuggestion
    {
        public int price;
        public int confidence;
        public string trend;
        public float rarity_score;
        public float demand_score;
    }

    [Serializable]
    public class Asset
    {
        public int id;
        public int asa_id;
        public string txn_id;
        public string name;
        public string rarity;
        public AssetMetadata metadata;
        public string owner;
        public string creator;
        public int royalty_bps;
        public bool listed;
        public int list_price;
        public string created_at;
        public PriceSuggestion suggested_price;

        public bool IsWeaponSkin => metadata?.skin_type == "weapon";
        public bool IsCharacterSkin => metadata?.skin_type == "character";

        public string RarityColor => rarity?.ToLower() switch
        {
            "common" => "#9D9D9D",
            "uncommon" => "#5E98D9",
            "rare" => "#4B69FF",
            "epic" => "#8847FF",
            "legendary" => "#D32CE6",
            "mythic" => "#EB4B4B",
            _ => "#FFFFFF"
        };
    }

    [Serializable]
    public class MarketData
    {
        public List<Asset> marketplace;
        public List<SaleRecord> sales;
    }

    [Serializable]
    public class SaleRecord
    {
        public string buyer;
        public string seller;
        public int price;
        public int royalty_paid;
        public int seller_proceeds;
        public string sold_at;
    }

    [Serializable]
    public class MintParams
    {
        public string wallet;
        public string skin_name;
        public string rarity = "rare";
        public string skin_type = "weapon";
        public int royalty_bps = 500;
    }

    [Serializable]
    public class BuyResult
    {
        public bool success;
        public Asset asset;
        public SaleRecord sale;
        public string payment_txn_id;
        public string message;
    }

    [Serializable]
    public class SteamInventoryItem
    {
        public string asset_id;
        public string name;
        public string rarity;
        public string skin_type;
        public string weapon;
        public string exterior;
        public bool tradable;
        public string icon_url;
        public float real_market_price_usd;
        public long real_market_price_micro_algo;
        public string price_source;
    }

    // ─── Responses ──────────────────────────────────────────────────────────

    [Serializable]
    public class AssetsResponse
    {
        public string wallet;
        public List<Asset> assets;
    }

    [Serializable]
    public class MintResponse
    {
        public Asset asset;
        public string mode;
    }

    [Serializable]
    public class BuyResponse
    {
        public Asset asset;
        public SaleRecord sale;
    }

    [Serializable]
    public class PriceResponse
    {
        public string name;
        public float min_price;
        public float suggested_price;
        public int quantity;
        public string currency;
        public string source;
    }

    [Serializable]
    public class SteamInventoryResponse
    {
        public string steam_id;
        public int item_count;
        public List<SteamInventoryItem> items;
        public string note;
    }

    // ─── Auth Responses ────────────────────────────────────────────────────

    [Serializable]
    public class NonceResponse
    {
        public string nonce;
        public string wallet;
    }

    [Serializable]
    public class AuthResponse
    {
        public string token;
        public int expires_in;
        public string wallet;
    }

    // ─── Marketplace Response ──────────────────────────────────────────────

    [Serializable]
    public class MarketplaceResponse
    {
        public List<Asset> marketplace;
        public List<SaleRecord> sales;
    }

    // ─── Asset History ─────────────────────────────────────────────────────

    [Serializable]
    public class HistoryEntry
    {
        public string type;
        public string timestamp;
        public string txn_id;
        public string by;
        public string from;
        public string to;
        public int price;
        public int royalty_paid;
    }

    [Serializable]
    public class HistoryResponse
    {
        public int asset_id;
        public List<HistoryEntry> history;
    }

    // ─── Skin Intelligence / Analyze ───────────────────────────────────────

    [Serializable]
    public class GameMapping
    {
        public string game;
        public string category;
        public string weapon_class;
        public string operator_type;
    }

    [Serializable]
    public class AnalyzeResponse
    {
        public string type;
        public GameMapping game_mapping;
        public float rarity_score;
        public string visual_style;
        public int suggested_price;
        public int confidence;
        public List<string> tags;
        public List<string> effects;
    }

    // ─── WebSocket ─────────────────────────────────────────────────────────

    [Serializable]
    public class WebSocketMessage
    {
        public string event_type;
        public string data_json;
    }

    // ─── Request Parameter Types ───────────────────────────────────────────

    [Serializable]
    public class ListParams
    {
        public string wallet;
        public int asset_id;
        public int price;
    }

    [Serializable]
    public class CancelParams
    {
        public string wallet;
        public int asset_id;
    }

    [Serializable]
    public class BuyParams
    {
        public string buyer_wallet;
        public int asset_id;
    }

    [Serializable]
    public class AIPriceParams
    {
        public string skin_name;
        public string rarity;
    }

    [Serializable]
    public class StringWrapper
    {
        public string value;

        public StringWrapper(string v) { value = v; }
    }

    // ─── List / Cancel Response Wrappers ───────────────────────────────────

    [Serializable]
    public class ListResponse
    {
        public Asset asset;
    }

    [Serializable]
    public class CancelResponse
    {
        public Asset asset;
    }

    // ─── Events ─────────────────────────────────────────────────────────────

    public enum DeShopEventType
    {
        Minted,
        Listed,
        Purchased,
        Cancelled,
        WalletConnected,
        WalletDisconnected,
        Error,
    }

    [Serializable]
    public class DeShopEvent
    {
        public DeShopEventType Type;
        public Asset Asset;
        public string Message;
        public Exception Error;
    }
}
