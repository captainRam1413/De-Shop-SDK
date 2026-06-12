#pragma once

#include "CoreMinimal.h"
#include "DeShopTypes.h"
#include "DeShopHttpRequester.h"
#include "DeShopWebSocket.h"
#include "DeShopSDKClient.generated.h"

// ---------------------------------------------------------------------------
// Result delegates — one per async API method
// ---------------------------------------------------------------------------

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAuthenticateComplete, bool, bSuccess, FString, Message);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnMintNFTComplete, bool, bSuccess, FMintResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetAssetsComplete, bool, bSuccess, FAssetsResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnListAssetComplete, bool, bSuccess, FString, AssetId, FString, Message);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnBuyAssetComplete, bool, bSuccess, FBuyResult, Result);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnCancelListingComplete, bool, bSuccess, FString, Message);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetMarketplaceComplete, bool, bSuccess, FMarketplaceResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetAIPriceComplete, bool, bSuccess, FPriceResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAnalyzeSkinComplete, bool, bSuccess, FAnalyzeResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetSkinPriceComplete, bool, bSuccess, FPriceResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetAssetHistoryComplete, bool, bSuccess, FHistoryResponse, Response);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGetSteamInventoryComplete, bool, bSuccess, const TArray<FSteamInventoryItem>&, Items);

// ---------------------------------------------------------------------------
// Real-time event delegates (driven by WebSocket)
// ---------------------------------------------------------------------------

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAssetListed, FString, AssetId, int64, Price);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAssetSold, FString, AssetId, int64, Price);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAssetDelisted, FString, AssetId, FString, Reason);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnPriceUpdate, FString, AssetName, int64, OldPrice, int64, NewPrice);

/**
 * Main SDK client for the De-Shop marketplace.
 *
 * Typical usage:
 *   1. Call Initialize() with your configuration.
 *   2. Call Authenticate() with a wallet address.
 *   3. Use any API method and listen to the corresponding OnXxxComplete delegate.
 *   4. (Optional) Use SubscribeToMarketplace() for real-time events.
 */
UCLASS(BlueprintType)
class UDeShopSDKClient : public UObject
{
    GENERATED_BODY()

public:
    UDeShopSDKClient();

    // -----------------------------------------------------------------------
    // Initialisation & Authentication
    // -----------------------------------------------------------------------

    /** Initialise the SDK with the given configuration. Must be called first. */
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void Initialize(const FDeShopConfig& Config);

    /** Authenticate with a wallet address (nonce → verify flow). */
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void Authenticate(const FString& Wallet);

    /** Is the client currently authenticated? */
    UFUNCTION(BlueprintCallable, BlueprintPure, Category = "DeShop")
    bool IsAuthenticated() const;

    // -----------------------------------------------------------------------
    // Marketplace API
    // -----------------------------------------------------------------------

    /** Mint a new NFT skin asset. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void MintNFT(const FMintParams& Params);

    /** Get all assets owned by the given wallet. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetAssets(const FString& Wallet);

    /** List an asset on the marketplace at the specified price. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void ListAsset(const FString& AssetId, int32 AsaId, int32 Price);

    /** Purchase a listed asset. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void BuyAsset(const FString& AssetId, int32 MaxPrice);

    /** Cancel an existing listing. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void CancelListing(const FString& AssetId, int32 AsaId);

    /** Retrieve the full marketplace listing and recent sales. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetMarketplace();

    /** Get AI-powered price suggestion for a skin. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetAIPrice(const FString& SkinName, const FString& Rarity);

    /** Analyse a skin using the AI engine. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void AnalyzeSkin(const FString& SkinName, const FString& Rarity, const FString& SkinType, const FString& Weapon);

    /** Get the real-time Steam market price for a skin. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetSkinPrice(const FString& SkinName);

    /** Get the full history for an on-chain asset. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetAssetHistory(int32 AsaId);

    /** Retrieve the Steam inventory for a Steam ID. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|API")
    void GetSteamInventory(const FString& SteamId);

    // -----------------------------------------------------------------------
    // WebSocket real-time subscriptions
    // -----------------------------------------------------------------------

    /** Connect to the real-time event WebSocket and subscribe to marketplace events. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|Realtime")
    void SubscribeToMarketplace();

    /** Unsubscribe from marketplace events and disconnect. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|Realtime")
    void UnsubscribeFromMarketplace();

    /** Must be called every game tick so WebSocket messages are processed on the game thread. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|Realtime")
    void TickRealtime();

    // -----------------------------------------------------------------------
    // Async result delegates
    // -----------------------------------------------------------------------

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnAuthenticateComplete OnAuthenticateComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnMintNFTComplete OnMintNFTComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetAssetsComplete OnGetAssetsComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnListAssetComplete OnListAssetComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnBuyAssetComplete OnBuyAssetComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnCancelListingComplete OnCancelListingComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetMarketplaceComplete OnGetMarketplaceComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetAIPriceComplete OnGetAIPriceComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnAnalyzeSkinComplete OnAnalyzeSkinComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetSkinPriceComplete OnGetSkinPriceComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetAssetHistoryComplete OnGetAssetHistoryComplete;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Delegates")
    FOnGetSteamInventoryComplete OnGetSteamInventoryComplete;

    // -----------------------------------------------------------------------
    // Real-time event delegates
    // -----------------------------------------------------------------------

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Realtime")
    FOnAssetListed OnAssetListed;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Realtime")
    FOnAssetSold OnAssetSold;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Realtime")
    FOnAssetDelisted OnAssetDelisted;

    UPROPERTY(BlueprintAssignable, Category = "DeShop|Realtime")
    FOnPriceUpdate OnPriceUpdate;

private:
    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /** Handle the nonce step of the auth flow. */
    UFUNCTION()
    void OnNonceReceived(bool bSuccess, const FString& Response);

    /** Handle the verify step of the auth flow. */
    UFUNCTION()
    void OnVerifyReceived(bool bSuccess, const FString& Response);

    /** Generic JSON-to-struct parsing helper. Returns true on success. */
    static bool ParseJsonObject(const FString& JsonString, TSharedPtr<FJsonObject>& OutObject);

    /** Handle a WebSocket message and dispatch the correct real-time delegate. */
    UFUNCTION()
    void HandleWebSocketMessage(FWebSocketMessage Message);

    // -----------------------------------------------------------------------
    // Static JSON-to-struct parsers
    // -----------------------------------------------------------------------

    static FAssetMetadata    ParseAssetMetadataFromJson(const FJsonObject* Obj);
    static FPriceSuggestion  ParsePriceSuggestionFromJson(const FJsonObject* Obj);
    static FDeShopAsset      ParseAssetFromJson(const FJsonObject* Obj);
    static FSaleRecord       ParseSaleFromJson(const FJsonObject* Obj);
    static FPriceResponse    ParsePriceResponseFromJson(const FJsonObject* Obj);
    static FAnalyzeResponse  ParseAnalyzeResponseFromJson(const FJsonObject* Obj);
    static FHistoryEntry     ParseHistoryEntryFromJson(const FJsonObject* Obj);
    static FSteamInventoryItem ParseSteamItemFromJson(const FJsonObject* Obj);

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /** Active SDK configuration. */
    UPROPERTY()
    FDeShopConfig Config;

    /** HTTP requester instance. */
    UPROPERTY()
    UDeShopHttpRequester* HttpRequester;

    /** WebSocket client instance. */
    UPROPERTY()
    UDeShopWebSocket* WebSocketClient;

    /** Current auth token. */
    FString AuthToken;

    /** Wallet address of the authenticated user. */
    FString CurrentWallet;

    /** Whether the client has completed authentication. */
    bool bAuthenticated = false;
};
