using UnrealBuildTool;

public class DeShopSDK : ModuleRules
{
    public DeShopSDK(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "HTTP",
            "WebSockets",
            "Json",
            "JsonUtilities"
        });
    }
}
