#include "DeShopSDKClient.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Dom/JsonObject.h"

// ===========================================================================
// Construction
// ===========================================================================

UDeShopSDKClient::UDeShopSDKClient()
    : HttpRequester(nullptr)
    , WebSocketClient(nullptr)
    , bAuthenticated(false)
{
}

// ===========================================================================
// Initialisation & Authentication
// ===========================================================================

void UDeShopSDKClient::Initialize(const FDeShopConfig& InConfig)
{
    Config = InConfig;

    // Create the HTTP requester
    HttpRequester = NewObject<UDeShopHttpRequester>(this);
    if (HttpRequester)
    {
        HttpRequester->Initialize(Config.BackendUrl, Config.TimeoutSeconds);
    }

    // Create the WebSocket client
    WebSocketClient = NewObject<UDeShopWebSocket>(this);
    if (WebSocketClient)
    {
        WebSocketClient->OnMessage.AddDynamic(this, &UDeShopSDKClient::HandleWebSocketMessage);
    }

    if (Config.bDebug)
    {
        UE_LOG(LogTemp, Log, TEXT("DeShopSDK — initialised (Debug mode) — Backend: %s, Network: %s"),
            *Config.BackendUrl, *Config.Network);
    }
}

void UDeShopSDKClient::Authenticate(const FString& Wallet)
{
    if (!HttpRequester)
    {
        UE_LOG(LogTemp, Error, TEXT("DeShopSDK — Authenticate called before Initialize"));
        OnAuthenticateComplete.Broadcast(false, TEXT("SDK not initialised"));
        return;
    }

    CurrentWallet = Wallet;

    // Step 1: Request nonce
    // CurrentWallet is already set above so OnNonceReceived can reference it.
    FOnRequestComplete Delegate;
    Delegate.BindDynamic(this, &UDeShopSDKClient::OnNonceReceived);

    HttpRequester->PerformGet(FString::Printf(TEXT("/auth/nonce?wallet=%s"), *Wallet), Delegate);
}

bool UDeShopSDKClient::IsAuthenticated() const
{
    return bAuthenticated;
}

void UDeShopSDKClient::OnNonceReceived(bool bSuccess, const FString& Response)
{
    if (!bSuccess)
    {
        UE_LOG(LogTemp, Warning, TEXT("DeShopSDK — nonce request failed: %s"), *Response);
        OnAuthenticateComplete.Broadcast(false, TEXT("Nonce request failed"));
        return;
    }

    TSharedPtr<FJsonObject> JsonObj;
    if (!ParseJsonObject(Response, JsonObj))
    {
        OnAuthenticateComplete.Broadcast(false, TEXT("Failed to parse nonce response"));
        return;
    }

    FString Nonce = JsonObj->GetStringField(TEXT("nonce"));

    // Step 2: Verify (in a real client the wallet would sign the nonce here;
    // for the SDK we post the signed payload to /auth/verify)
    TSharedRef<FJsonObject> VerifyBody = MakeShared<FJsonObject>();
    VerifyBody->SetStringField(TEXT("wallet"), CurrentWallet);
    VerifyBody->SetStringField(TEXT("nonce"), Nonce);
    // The signature would be produced by the wallet extension / AlgoSDK on the client side.
    // This placeholder passes the nonce as-is — real integration must supply the actual signature.
    VerifyBody->SetStringField(TEXT("signature"), Nonce);

    FString BodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(VerifyBody, Writer);

    FOnRequestComplete Delegate;
    Delegate.BindDynamic(this, &UDeShopSDKClient::OnVerifyReceived);

    HttpRequester->PerformPost(TEXT("/auth/verify"), BodyString, Delegate);
}

void UDeShopSDKClient::OnVerifyReceived(bool bSuccess, const FString& Response)
{
    if (!bSuccess)
    {
        UE_LOG(LogTemp, Warning, TEXT("DeShopSDK — verify request failed: %s"), *Response);
        OnAuthenticateComplete.Broadcast(false, TEXT("Auth verification failed"));
        return;
    }

    TSharedPtr<FJsonObject> JsonObj;
    if (!ParseJsonObject(Response, JsonObj))
    {
        OnAuthenticateComplete.Broadcast(false, TEXT("Failed to parse verify response"));
        return;
    }

    AuthToken = JsonObj->GetStringField(TEXT("token"));
    bAuthenticated = true;

    if (HttpRequester)
    {
        HttpRequester->SetAuthToken(AuthToken);
    }

    UE_LOG(LogTemp, Log, TEXT("DeShopSDK — authenticated as %s"), *CurrentWallet);
    OnAuthenticateComplete.Broadcast(true, TEXT("Authenticated"));
}

// ===========================================================================
// Marketplace API
// ===========================================================================

void UDeShopSDKClient::MintNFT(const FMintParams& Params)
{
    if (!HttpRequester) return;

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("wallet"), Params.wallet);
    Body->SetStringField(TEXT("skin_name"), Params.skin_name);
    Body->SetStringField(TEXT("rarity"), Params.rarity);
    Body->SetStringField(TEXT("skin_type"), Params.skin_type);
    Body->SetNumberField(TEXT("royalty_bps"), Params.royalty_bps);

    FString BodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(Body, Writer);

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FMintResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                // Parse asset
                const TSharedPtr<FJsonObject>* AssetObj;
                if (JsonObj->TryGetObjectField(TEXT("asset"), AssetObj))
                {
                    Result.asset = ParseAssetFromJson(*AssetObj->Get());
                }
                Result.mode = JsonObj->GetStringField(TEXT("mode"));
            }
        }
        OnMintNFTComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformPost(TEXT("/nft/mint"), BodyString, Delegate);
}

void UDeShopSDKClient::GetAssets(const FString& Wallet)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FAssetsResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result.wallet = JsonObj->GetStringField(TEXT("wallet"));
                const TArray<TSharedPtr<FJsonValue>>* AssetsArr;
                if (JsonObj->TryGetArrayField(TEXT("assets"), AssetsArr))
                {
                    for (const TSharedPtr<FJsonValue>& Val : *AssetsArr)
                    {
                        if (Val->Type == EJson::Object)
                        {
                            Result.assets.Add(ParseAssetFromJson(Val->AsObject().Get()));
                        }
                    }
                }
            }
        }
        OnGetAssetsComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformGet(FString::Printf(TEXT("/assets?wallet=%s"), *Wallet), Delegate);
}

void UDeShopSDKClient::ListAsset(const FString& AssetId, int32 AsaId, int32 Price)
{
    if (!HttpRequester) return;

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("asset_id"), AssetId);
    Body->SetNumberField(TEXT("asa_id"), AsaId);
    Body->SetNumberField(TEXT("price"), Price);

    FString BodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(Body, Writer);

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this, AssetId](bool bSuccess, const FString& Response)
    {
        FString Message;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Message = JsonObj->GetStringField(TEXT("message"));
            }
            else
            {
                Message = TEXT("Asset listed");
            }
        }
        else
        {
            Message = Response;
        }
        OnListAssetComplete.Broadcast(bSuccess, AssetId, Message);
    });

    HttpRequester->PerformPost(TEXT("/marketplace/list"), BodyString, Delegate);
}

void UDeShopSDKClient::BuyAsset(const FString& AssetId, int32 MaxPrice)
{
    if (!HttpRequester) return;

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("asset_id"), AssetId);
    Body->SetStringField(TEXT("buyer_wallet"), CurrentWallet);
    Body->SetNumberField(TEXT("max_price"), MaxPrice);

    FString BodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(Body, Writer);

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FBuyResult Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result.bSuccess = JsonObj->GetBoolField(TEXT("success"));
                Result.message = JsonObj->GetStringField(TEXT("message"));
                Result.payment_txn_id = JsonObj->GetStringField(TEXT("payment_txn_id"));

                const TSharedPtr<FJsonObject>* AssetObj;
                if (JsonObj->TryGetObjectField(TEXT("asset"), AssetObj))
                {
                    Result.asset = ParseAssetFromJson(*AssetObj->Get());
                }

                const TSharedPtr<FJsonObject>* SaleObj;
                if (JsonObj->TryGetObjectField(TEXT("sale"), SaleObj))
                {
                    Result.sale = ParseSaleFromJson(*SaleObj->Get());
                }
            }
        }
        else
        {
            Result.bSuccess = false;
            Result.message = Response;
        }
        OnBuyAssetComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformPost(TEXT("/marketplace/buy"), BodyString, Delegate);
}

void UDeShopSDKClient::CancelListing(const FString& AssetId, int32 AsaId)
{
    if (!HttpRequester) return;

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("asset_id"), AssetId);
    Body->SetNumberField(TEXT("asa_id"), AsaId);
    Body->SetStringField(TEXT("wallet"), CurrentWallet);

    FString BodyString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&BodyString);
    FJsonSerializer::Serialize(Body, Writer);

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FString Message;
        TSharedPtr<FJsonObject> JsonObj;
        if (ParseJsonObject(Response, JsonObj))
        {
            Message = JsonObj->GetStringField(TEXT("message"));
        }
        else
        {
            Message = bSuccess ? TEXT("Listing cancelled") : Response;
        }
        OnCancelListingComplete.Broadcast(bSuccess, Message);
    });

    HttpRequester->PerformPost(TEXT("/marketplace/cancel"), BodyString, Delegate);
}

void UDeShopSDKClient::GetMarketplace()
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FMarketplaceResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                const TArray<TSharedPtr<FJsonValue>>* MktArr;
                if (JsonObj->TryGetArrayField(TEXT("marketplace"), MktArr))
                {
                    for (const TSharedPtr<FJsonValue>& Val : *MktArr)
                    {
                        if (Val->Type == EJson::Object)
                        {
                            Result.marketplace.Add(ParseAssetFromJson(Val->AsObject().Get()));
                        }
                    }
                }

                const TArray<TSharedPtr<FJsonValue>>* SalesArr;
                if (JsonObj->TryGetArrayField(TEXT("sales"), SalesArr))
                {
                    for (const TSharedPtr<FJsonValue>& Val : *SalesArr)
                    {
                        if (Val->Type == EJson::Object)
                        {
                            Result.sales.Add(ParseSaleFromJson(Val->AsObject().Get()));
                        }
                    }
                }
            }
        }
        OnGetMarketplaceComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformGet(TEXT("/marketplace"), Delegate);
}

void UDeShopSDKClient::GetAIPrice(const FString& SkinName, const FString& Rarity)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FPriceResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result = ParsePriceResponseFromJson(JsonObj.Get());
            }
        }
        OnGetAIPriceComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformGet(FString::Printf(TEXT("/ai/price?skin_name=%s&rarity=%s"), *SkinName, *Rarity), Delegate);
}

void UDeShopSDKClient::AnalyzeSkin(const FString& SkinName, const FString& Rarity, const FString& SkinType, const FString& Weapon)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FAnalyzeResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result = ParseAnalyzeResponseFromJson(JsonObj.Get());
            }
        }
        OnAnalyzeSkinComplete.Broadcast(bSuccess, Result);
    });

    const FString Endpoint = FString::Printf(
        TEXT("/ai/analyze?skin_name=%s&rarity=%s&skin_type=%s&weapon=%s"),
        *SkinName, *Rarity, *SkinType, *Weapon);

    HttpRequester->PerformGet(Endpoint, Delegate);
}

void UDeShopSDKClient::GetSkinPrice(const FString& SkinName)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FPriceResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result = ParsePriceResponseFromJson(JsonObj.Get());
            }
        }
        OnGetSkinPriceComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformGet(FString::Printf(TEXT("/steam/price?skin=%s"), *SkinName), Delegate);
}

void UDeShopSDKClient::GetAssetHistory(int32 AsaId)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        FHistoryResponse Result;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                Result.asset_id = JsonObj->GetIntegerField(TEXT("asset_id"));

                const TArray<TSharedPtr<FJsonValue>>* HistArr;
                if (JsonObj->TryGetArrayField(TEXT("history"), HistArr))
                {
                    for (const TSharedPtr<FJsonValue>& Val : *HistArr)
                    {
                        if (Val->Type == EJson::Object)
                        {
                            Result.history.Add(ParseHistoryEntryFromJson(Val->AsObject().Get()));
                        }
                    }
                }
            }
        }
        OnGetAssetHistoryComplete.Broadcast(bSuccess, Result);
    });

    HttpRequester->PerformGet(FString::Printf(TEXT("/assets/%d/history"), AsaId), Delegate);
}

void UDeShopSDKClient::GetSteamInventory(const FString& SteamId)
{
    if (!HttpRequester) return;

    FOnRequestComplete Delegate;
    Delegate.BindLambda([this](bool bSuccess, const FString& Response)
    {
        TArray<FSteamInventoryItem> Items;
        if (bSuccess)
        {
            TSharedPtr<FJsonObject> JsonObj;
            if (ParseJsonObject(Response, JsonObj))
            {
                const TArray<TSharedPtr<FJsonValue>>* InvArr;
                if (JsonObj->TryGetArrayField(TEXT("inventory"), InvArr))
                {
                    for (const TSharedPtr<FJsonValue>& Val : *InvArr)
                    {
                        if (Val->Type == EJson::Object)
                        {
                            Items.Add(ParseSteamItemFromJson(Val->AsObject().Get()));
                        }
                    }
                }
            }
        }
        OnGetSteamInventoryComplete.Broadcast(bSuccess, Items);
    });

    HttpRequester->PerformGet(FString::Printf(TEXT("/steam/inventory?steam_id=%s"), *SteamId), Delegate);
}

// ===========================================================================
// WebSocket real-time subscriptions
// ===========================================================================

void UDeShopSDKClient::SubscribeToMarketplace()
{
    if (!WebSocketClient) return;

    // Build WS URL from the REST base URL (swap http(s) → ws(s))
    FString WsUrl = Config.BackendUrl;
    WsUrl.ReplaceInline(TEXT("https://"), TEXT("wss://"));
    WsUrl.ReplaceInline(TEXT("http://"), TEXT("ws://"));
    WsUrl.Append(TEXT("/ws"));

    WebSocketClient->Connect(WsUrl);
    WebSocketClient->SubscribeRoom(TEXT("marketplace"));
}

void UDeShopSDKClient::UnsubscribeFromMarketplace()
{
    if (!WebSocketClient) return;

    WebSocketClient->UnsubscribeRoom(TEXT("marketplace"));
    WebSocketClient->Disconnect();
}

void UDeShopSDKClient::TickRealtime()
{
    if (WebSocketClient)
    {
        WebSocketClient->ProcessMessages();
    }
}

void UDeShopSDKClient::HandleWebSocketMessage(FWebSocketMessage Message)
{
    const FString& EventType = Message.event_type;

    // Dispatch real-time events
    TSharedPtr<FJsonObject> DataObj;
    ParseJsonObject(Message.data_json, DataObj);

    if (EventType == TEXT("asset_listed"))
    {
        if (DataObj.IsValid())
        {
            FString AssetId = DataObj->GetStringField(TEXT("asset_id"));
            int64 Price = static_cast<int64>(DataObj->GetNumberField(TEXT("price")));
            OnAssetListed.Broadcast(AssetId, Price);
        }
    }
    else if (EventType == TEXT("asset_sold"))
    {
        if (DataObj.IsValid())
        {
            FString AssetId = DataObj->GetStringField(TEXT("asset_id"));
            int64 Price = static_cast<int64>(DataObj->GetNumberField(TEXT("price")));
            OnAssetSold.Broadcast(AssetId, Price);
        }
    }
    else if (EventType == TEXT("asset_delisted"))
    {
        if (DataObj.IsValid())
        {
            FString AssetId = DataObj->GetStringField(TEXT("asset_id"));
            FString Reason = DataObj->GetStringField(TEXT("reason"));
            OnAssetDelisted.Broadcast(AssetId, Reason);
        }
    }
    else if (EventType == TEXT("price_update"))
    {
        if (DataObj.IsValid())
        {
            FString Name = DataObj->GetStringField(TEXT("name"));
            int64 OldPrice = static_cast<int64>(DataObj->GetNumberField(TEXT("old_price")));
            int64 NewPrice = static_cast<int64>(DataObj->GetNumberField(TEXT("new_price")));
            OnPriceUpdate.Broadcast(Name, OldPrice, NewPrice);
        }
    }
    else
    {
        if (Config.bDebug)
        {
            UE_LOG(LogTemp, Verbose, TEXT("DeShopSDK — unhandled WS event: %s"), *EventType);
        }
    }
}

// ===========================================================================
// JSON parsing helpers
// ===========================================================================

bool UDeShopSDKClient::ParseJsonObject(const FString& JsonString, TSharedPtr<FJsonObject>& OutObject)
{
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
    return FJsonSerializer::Deserialize(Reader, OutObject) && OutObject.IsValid();
}

FAssetMetadata UDeShopSDKClient::ParseAssetMetadataFromJson(const FJsonObject* Obj)
{
    FAssetMetadata Meta;
    if (!Obj) return Meta;

    Meta.skin_name = Obj->GetStringField(TEXT("skin_name"));
    Meta.rarity    = Obj->GetStringField(TEXT("rarity"));
    Meta.skin_type = Obj->GetStringField(TEXT("skin_type"));
    Meta.ipfs_uri  = Obj->GetStringField(TEXT("ipfs_uri"));
    Meta.image_url = Obj->GetStringField(TEXT("image_url"));
    return Meta;
}

FPriceSuggestion UDeShopSDKClient::ParsePriceSuggestionFromJson(const FJsonObject* Obj)
{
    FPriceSuggestion Suggestion;
    if (!Obj) return Suggestion;

    Suggestion.price        = static_cast<int64>(Obj->GetNumberField(TEXT("price")));
    Suggestion.confidence   = static_cast<float>(Obj->GetNumberField(TEXT("confidence")));
    Suggestion.trend        = Obj->GetStringField(TEXT("trend"));
    Suggestion.rarity_score = static_cast<float>(Obj->GetNumberField(TEXT("rarity_score")));
    Suggestion.demand_score = static_cast<float>(Obj->GetNumberField(TEXT("demand_score")));
    return Suggestion;
}

FDeShopAsset UDeShopSDKClient::ParseAssetFromJson(const FJsonObject* Obj)
{
    FDeShopAsset Asset;
    if (!Obj) return Asset;

    Asset.id          = Obj->GetStringField(TEXT("id"));
    Asset.asa_id      = static_cast<int64>(Obj->GetNumberField(TEXT("asa_id")));
    Asset.name        = Obj->GetStringField(TEXT("name"));
    Asset.rarity      = Obj->GetStringField(TEXT("rarity"));
    Asset.owner       = Obj->GetStringField(TEXT("owner"));
    Asset.creator     = Obj->GetStringField(TEXT("creator"));
    Asset.royalty_bps = Obj->GetIntegerField(TEXT("royalty_bps"));
    Asset.bListed     = Obj->GetBoolField(TEXT("listed"));
    Asset.list_price  = static_cast<int64>(Obj->GetNumberField(TEXT("list_price")));
    Asset.created_at  = Obj->GetStringField(TEXT("created_at"));

    const TSharedPtr<FJsonObject>* MetaObj;
    if (Obj->TryGetObjectField(TEXT("metadata"), MetaObj))
    {
        Asset.metadata = ParseAssetMetadataFromJson(MetaObj->Get());
    }

    const TSharedPtr<FJsonObject>* PriceObj;
    if (Obj->TryGetObjectField(TEXT("suggested_price"), PriceObj))
    {
        Asset.suggested_price = ParsePriceSuggestionFromJson(PriceObj->Get());
    }

    return Asset;
}

FSaleRecord UDeShopSDKClient::ParseSaleFromJson(const FJsonObject* Obj)
{
    FSaleRecord Sale;
    if (!Obj) return Sale;

    Sale.buyer          = Obj->GetStringField(TEXT("buyer"));
    Sale.seller         = Obj->GetStringField(TEXT("seller"));
    Sale.price          = static_cast<int64>(Obj->GetNumberField(TEXT("price")));
    Sale.royalty_paid   = static_cast<int64>(Obj->GetNumberField(TEXT("royalty_paid")));
    Sale.seller_proceeds = static_cast<int64>(Obj->GetNumberField(TEXT("seller_proceeds")));
    Sale.sold_at        = Obj->GetStringField(TEXT("sold_at"));
    return Sale;
}

FPriceResponse UDeShopSDKClient::ParsePriceResponseFromJson(const FJsonObject* Obj)
{
    FPriceResponse Price;
    if (!Obj) return Price;

    Price.name            = Obj->GetStringField(TEXT("name"));
    Price.min_price       = static_cast<int64>(Obj->GetNumberField(TEXT("min_price")));
    Price.suggested_price = static_cast<int64>(Obj->GetNumberField(TEXT("suggested_price")));
    Price.quantity        = Obj->GetIntegerField(TEXT("quantity"));
    Price.currency        = Obj->GetStringField(TEXT("currency"));
    Price.source          = Obj->GetStringField(TEXT("source"));
    return Price;
}

FAnalyzeResponse UDeShopSDKClient::ParseAnalyzeResponseFromJson(const FJsonObject* Obj)
{
    FAnalyzeResponse Analyze;
    if (!Obj) return Analyze;

    Analyze.type            = Obj->GetStringField(TEXT("type"));
    Analyze.rarity_score    = static_cast<float>(Obj->GetNumberField(TEXT("rarity_score")));
    Analyze.visual_style    = Obj->GetStringField(TEXT("visual_style"));
    Analyze.suggested_price = static_cast<int64>(Obj->GetNumberField(TEXT("suggested_price")));
    Analyze.confidence      = static_cast<float>(Obj->GetNumberField(TEXT("confidence")));

    const TArray<TSharedPtr<FJsonValue>>* TagsArr;
    if (Obj->TryGetArrayField(TEXT("tags"), TagsArr))
    {
        for (const auto& Val : *TagsArr)
        {
            Analyze.tags.Add(Val->AsString());
        }
    }

    const TArray<TSharedPtr<FJsonValue>>* EffectsArr;
    if (Obj->TryGetArrayField(TEXT("effects"), EffectsArr))
    {
        for (const auto& Val : *EffectsArr)
        {
            Analyze.effects.Add(Val->AsString());
        }
    }

    return Analyze;
}

FHistoryEntry UDeShopSDKClient::ParseHistoryEntryFromJson(const FJsonObject* Obj)
{
    FHistoryEntry Entry;
    if (!Obj) return Entry;

    Entry.type        = Obj->GetStringField(TEXT("type"));
    Entry.timestamp   = Obj->GetStringField(TEXT("timestamp"));
    Entry.txn_id      = Obj->GetStringField(TEXT("txn_id"));
    Entry.by          = Obj->GetStringField(TEXT("by"));
    Entry.from_str    = Obj->GetStringField(TEXT("from"));
    Entry.to_str      = Obj->GetStringField(TEXT("to"));
    Entry.price       = static_cast<int64>(Obj->GetNumberField(TEXT("price")));
    Entry.royalty_paid = static_cast<int64>(Obj->GetNumberField(TEXT("royalty_paid")));
    return Entry;
}

FSteamInventoryItem UDeShopSDKClient::ParseSteamItemFromJson(const FJsonObject* Obj)
{
    FSteamInventoryItem Item;
    if (!Obj) return Item;

    Item.asset_id                     = Obj->GetStringField(TEXT("asset_id"));
    Item.name                         = Obj->GetStringField(TEXT("name"));
    Item.rarity                       = Obj->GetStringField(TEXT("rarity"));
    Item.skin_type                    = Obj->GetStringField(TEXT("skin_type"));
    Item.weapon                       = Obj->GetStringField(TEXT("weapon"));
    Item.exterior                     = Obj->GetStringField(TEXT("exterior"));
    Item.bTradable                    = Obj->GetBoolField(TEXT("tradable"));
    Item.icon_url                     = Obj->GetStringField(TEXT("icon_url"));
    Item.real_market_price_usd        = static_cast<float>(Obj->GetNumberField(TEXT("real_market_price_usd")));
    Item.real_market_price_micro_algo = static_cast<int64>(Obj->GetNumberField(TEXT("real_market_price_micro_algo")));
    Item.price_source                 = Obj->GetStringField(TEXT("price_source"));
    return Item;
}
