#include "DeShopHttpRequester.h"
#include "Serialization/JsonSerializer.h"

void UDeShopHttpRequester::Initialize(const FString& InBaseUrl, float InTimeout)
{
    BaseUrl = InBaseUrl;
    RequestTimeout = InTimeout;

    // Strip trailing slash so we can safely append "/endpoint"
    BaseUrl.TrimEndInline(&BaseUrl, [](TCHAR C) { return C == TEXT('/'); });

    UE_LOG(LogTemp, Log, TEXT("DeShopHttpRequester initialised — BaseUrl: %s, Timeout: %.1fs"), *BaseUrl, RequestTimeout);
}

void UDeShopHttpRequester::SetAuthToken(const FString& InToken)
{
    AuthToken = InToken;
    UE_LOG(LogTemp, Verbose, TEXT("DeShopHttpRequester auth token updated"));
}

TSharedRef<IHttpRequest, ESPMode::ThreadSafe> UDeShopHttpRequester::BuildRequest(const FString& Verb, const FString& Endpoint, const FString& Body)
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();

    const FString Url = BaseUrl + Endpoint;
    Request->SetURL(Url);
    Request->SetVerb(Verb);
    Request->SetTimeout(RequestTimeout);

    // Content type
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetHeader(TEXT("Accept"), TEXT("application/json"));

    // JWT Bearer injection
    if (!AuthToken.IsEmpty())
    {
        Request->SetHeader(TEXT("Authorization"), FString::Printf(TEXT("Bearer %s"), *AuthToken));
    }

    if (!Body.IsEmpty())
    {
        Request->SetContentAsString(Body);
    }

    return Request;
}

void UDeShopHttpRequester::OnRequestComplete_Internal(
    FHttpRequestPtr Request,
    FHttpResponsePtr Response,
    bool bWasSuccessful,
    FOnRequestComplete CompleteDelegate)
{
    if (!bWasSuccessful || !Response.IsValid())
    {
        UE_LOG(LogTemp, Warning, TEXT("DeShopHTTPRequest failed — no response received"));
        CompleteDelegate.Broadcast(false, TEXT("{\"error\":\"No response received\"}"));
        return;
    }

    const int32 Code = Response->GetResponseCode();
    const FString Body = Response->GetContentAsString();

    const bool bSuccess = (Code >= 200 && Code < 300);

    if (!bSuccess)
    {
        UE_LOG(LogTemp, Warning, TEXT("DeShopHTTP error %d — %s"), Code, *Body);
    }
    else
    {
        UE_LOG(LogTemp, Verbose, TEXT("DeShopHTTP %d — %s"), Code, *Body.Left(256));
    }

    CompleteDelegate.Broadcast(bSuccess, Body);
}

void UDeShopHttpRequester::PerformGet(const FString& Endpoint, const FOnRequestComplete& CompleteDelegate)
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = BuildRequest(TEXT("GET"), Endpoint, FString());

    Request->OnProcessRequestComplete().BindUObject(this, &UDeShopHttpRequester::OnRequestComplete_Internal, CompleteDelegate);

    if (!Request->ProcessRequest())
    {
        UE_LOG(LogTemp, Error, TEXT("DeShopHTTPRequest GET failed to start for endpoint: %s"), *Endpoint);
        CompleteDelegate.Broadcast(false, TEXT("{\"error\":\"Failed to start GET request\"}"));
    }
}

void UDeShopHttpRequester::PerformPost(const FString& Endpoint, const FString& JsonBody, const FOnRequestComplete& CompleteDelegate)
{
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = BuildRequest(TEXT("POST"), Endpoint, JsonBody);

    Request->OnProcessRequestComplete().BindUObject(this, &UDeShopHttpRequester::OnRequestComplete_Internal, CompleteDelegate);

    if (!Request->ProcessRequest())
    {
        UE_LOG(LogTemp, Error, TEXT("DeShopHTTPRequest POST failed to start for endpoint: %s"), *Endpoint);
        CompleteDelegate.Broadcast(false, TEXT("{\"error\":\"Failed to start POST request\"}"));
    }
}
