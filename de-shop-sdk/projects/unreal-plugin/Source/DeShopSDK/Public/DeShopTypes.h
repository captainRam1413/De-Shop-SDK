#pragma once

#include "CoreMinimal.h"
#include "DeShopTypes.generated.h"

/**
 * Configuration for the De-Shop SDK client.
 */
USTRUCT(BlueprintType)
struct FDeShopConfig
{
    GENERATED_BODY()

    /** Base URL of the De-Shop backend API. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString BackendUrl;

    /** Target Algorand network (e.g. "mainnet", "testnet", "betanet"). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString Network;

    /** Application identifier supplied by De-Shop. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString AppId;

    /** When true, enables verbose debug logging. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    bool bDebug = false;

    /** HTTP request timeout in seconds. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float TimeoutSeconds = 30.0f;
};

/**
 * Metadata describing an in-game skin / asset.
 */
USTRUCT(BlueprintType)
struct FAssetMetadata
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString skin_name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString rarity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString skin_type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString ipfs_uri;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString image_url;
};

/**
 * AI-generated price suggestion for an asset.
 */
USTRUCT(BlueprintType)
struct FPriceSuggestion
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float confidence = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString trend;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float rarity_score = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float demand_score = 0.0f;
};

/**
 * Core asset representation on the De-Shop marketplace.
 */
USTRUCT(BlueprintType)
struct FDeShopAsset
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 asa_id = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString rarity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FAssetMetadata metadata;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString owner;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString creator;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int32 royalty_bps = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    bool bListed = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 list_price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString created_at;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FPriceSuggestion suggested_price;
};

/**
 * Parameters required to mint a new NFT on De-Shop.
 */
USTRUCT(BlueprintType)
struct FMintParams
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString wallet;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString skin_name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString rarity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString skin_type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int32 royalty_bps = 0;
};

/**
 * Record of a completed sale on the marketplace.
 */
USTRUCT(BlueprintType)
struct FSaleRecord
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString buyer;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString seller;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 royalty_paid = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 seller_proceeds = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString sold_at;
};

/**
 * Result of a purchase operation.
 */
USTRUCT(BlueprintType)
struct FBuyResult
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    bool bSuccess = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FDeShopAsset asset;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FSaleRecord sale;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString payment_txn_id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString message;
};

/**
 * Response from the mint endpoint.
 */
USTRUCT(BlueprintType)
struct FMintResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FDeShopAsset asset;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString mode;
};

/**
 * Response containing marketplace data and recent sales.
 */
USTRUCT(BlueprintType)
struct FMarketplaceResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FDeShopAsset> marketplace;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FSaleRecord> sales;
};

/**
 * Response containing a wallet's assets.
 */
USTRUCT(BlueprintType)
struct FAssetsResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString wallet;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FDeShopAsset> assets;
};

/**
 * Response from the AI price endpoint.
 */
USTRUCT(BlueprintType)
struct FPriceResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 min_price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 suggested_price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int32 quantity = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString currency;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString source;
};

/**
 * Response from the skin analysis endpoint.
 */
USTRUCT(BlueprintType)
struct FAnalyzeResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float rarity_score = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString visual_style;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 suggested_price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float confidence = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FString> tags;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FString> effects;
};

/**
 * A Steam inventory item mapped to De-Shop.
 */
USTRUCT(BlueprintType)
struct FSteamInventoryItem
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString asset_id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString name;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString rarity;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString skin_type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString weapon;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString exterior;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    bool bTradable = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString icon_url;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    float real_market_price_usd = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 real_market_price_micro_algo = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString price_source;
};

/**
 * A single history entry for an asset.
 */
USTRUCT(BlueprintType)
struct FHistoryEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString timestamp;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString txn_id;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString by;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString from_str;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString to_str;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 price = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int64 royalty_paid = 0;
};

/**
 * Response containing the full history for an asset.
 */
USTRUCT(BlueprintType)
struct FHistoryResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int32 asset_id = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    TArray<FHistoryEntry> history;
};

/**
 * Response from the nonce endpoint (auth step 1).
 */
USTRUCT(BlueprintType)
struct FNonceResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString nonce;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString wallet;
};

/**
 * Response from the verify/auth endpoint (auth step 2).
 */
USTRUCT(BlueprintType)
struct FAuthResponse
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString token;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    int32 expires_in = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString wallet;
};

/**
 * Structured message received over WebSocket.
 */
USTRUCT(BlueprintType)
struct FWebSocketMessage
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString event_type;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "DeShop")
    FString data_json;
};
