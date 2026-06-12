#pragma once

#include "CoreMinimal.h"
#include "Http.h"
#include "DeShopHttpRequester.generated.h"

/**
 * Delegate broadcast when an HTTP request completes.
 * @param bSuccess     True if the request returned a 2xx status code.
 * @param Response     Raw response body as a string (JSON).
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnRequestComplete, bool, bSuccess, FString, Response);

/**
 * Lightweight HTTP client for communicating with the De-Shop backend.
 * Supports GET / POST with automatic JWT Bearer token injection.
 */
UCLASS(BlueprintType)
class UDeShopHttpRequester : public UObject
{
    GENERATED_BODY()

public:
    /** Initialise the requester with a base URL and request timeout. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|HTTP")
    void Initialize(const FString& BaseUrl, float Timeout);

    /** Store (or clear) the JWT used for Authorization headers. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|HTTP")
    void SetAuthToken(const FString& Token);

    /** Perform an authenticated GET request. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|HTTP")
    void PerformGet(const FString& Endpoint, const FOnRequestComplete& CompleteDelegate);

    /** Perform an authenticated POST request with a JSON body. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|HTTP")
    void PerformPost(const FString& Endpoint, const FString& JsonBody, const FOnRequestComplete& CompleteDelegate);

private:
    /** Build an FHttpRequest and attach common headers. */
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> BuildRequest(const FString& Verb, const FString& Endpoint, const FString& Body);

    /** Handle the completed request and broadcast the delegate. */
    void OnRequestComplete_Internal(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful, FOnRequestComplete CompleteDelegate);

    /** Base URL for all API endpoints (e.g. "https://api.deshop.io/v1"). */
    FString BaseUrl;

    /** JWT bearer token — empty means no auth header. */
    FString AuthToken;

    /** Per-request timeout in seconds. */
    float RequestTimeout = 30.0f;
};
