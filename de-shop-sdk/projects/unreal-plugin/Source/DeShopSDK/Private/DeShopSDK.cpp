#include "DeShopSDK.h"

#define LOCTEXT_NAMESPACE "FDeShopSDKModule"

void FDeShopSDKModule::StartupModule()
{
    // Module startup logic — register any delegates or singletons here
    UE_LOG(LogTemp, Log, TEXT("DeShopSDK module started"));
}

void FDeShopSDKModule::ShutdownModule()
{
    // Module shutdown logic — clean up any allocated resources here
    UE_LOG(LogTemp, Log, TEXT("DeShopSDK module shut down"));
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FDeShopSDKModule, DeShopSDK)
