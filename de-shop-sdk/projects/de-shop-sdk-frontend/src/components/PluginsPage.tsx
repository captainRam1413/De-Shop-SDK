import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Terminal,
  Puzzle,
  Settings,
  Code,
  FileCode,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import { useDeShopStore } from '../store/useDeShopStore'

interface Plugin {
  id: string
  name: string
  version: string
  language: string
  description: string
  platform: string
  icon: string
  color: string
  downloadSize: string
  codeSnippet: string
  setupSteps: string[]
}

export default function PluginsPage() {
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const store = useDeShopStore()

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const plugins: Plugin[] = [
    {
      id: 'minecraft',
      name: 'Minecraft Java Bridge',
      version: 'v1.4.2',
      language: 'Java (Spigot/Paper)',
      description: 'Allows servers to link player UUIDs with Algorand wallets and mint skins directly from in-game commands.',
      platform: 'Minecraft 1.20+',
      icon: '⛏️',
      color: '#4a8c2a',
      downloadSize: '1.2 MB',
      codeSnippet: `// Registering the DeShop bridge in your Spigot plugin
import com.deshop.sdk.DeShopBridge;

public class MyGamePlugin extends JavaPlugin {
    private DeShopBridge deShop;

    @Override
    public void onEnable() {
        // Initialize DeShop connection
        this.deShop = new DeShopBridge("http://localhost:5000");
        getLogger().info("De-Shop Bridge successfully linked!");
    }

    public void rewardPlayerSkin(Player player, String skinName, String rarity) {
        // Mint NFT and send it to player's linked wallet
        deShop.mintToPlayer(player.getUniqueId(), skinName, rarity)
              .thenAccept(tx -> player.sendMessage("§aSkin NFT minted! Tx: " + tx.getHash()))
              .exceptionally(err -> {
                  player.sendMessage("§cFailed to mint skin: " + err.getMessage());
                  return null;
              });
    }
}`,
      setupSteps: [
        'Download the deshop-bridge-1.4.2.jar file.',
        'Place the jar in your server\'s "plugins/" folder.',
        'Restart the server to generate the default config.yml file.',
        'Open config.yml and configure your De-Shop Gateway URL and Sandbox Application ID.',
        'Link players using the "/deshop link <wallet_address>" command.'
      ]
    },
    {
      id: 'unity',
      name: 'Unity Engine Core SDK',
      version: 'v2.1.0',
      language: 'C#',
      description: 'Integrates real-time P2P item marketplaces and web3 inventory syncing inside Unity C# game engines.',
      platform: 'Unity 2021.3 LTS+',
      icon: '🎮',
      color: '#00d4aa',
      downloadSize: '3.4 MB',
      codeSnippet: `using DeShop.SDK;
using UnityEngine;

public class InventorySync : MonoBehaviour {
    private DeShopClient client;

    void Start() {
        // Set up client reference
        client = new DeShopClient("http://localhost:5000");
        
        // Listen to wallet connections
        client.OnWalletConnected += (address) => {
            Debug.Log($"Syncing items for address: {address}");
            FetchSkins(address);
        };
    }

    async void FetchSkins(string walletAddress) {
        var skins = await client.GetInventoryAsync(walletAddress);
        foreach (var skin in skins) {
            Debug.Log($"Found owned skin: {skin.name} ({skin.rarity})");
            // Instantiate 3D prefab with the skin applied
        }
    }
}`,
      setupSteps: [
        'Download the DeShopSDK.unitypackage file.',
        'In Unity, go to Assets > Import Package > Custom Package and select the file.',
        'Check all files and click "Import".',
        'Add the "DeShopManager" prefab to your start scene.',
        'Configure the Algorand RPC endpoints and API Gateway in the Inspector panel.'
      ]
    },
    {
      id: 'unreal',
      name: 'Unreal Engine Plugin',
      version: 'v1.0.5',
      language: 'C++ / Blueprints',
      description: 'Ultra-low latency HTTP and WebSocket client wrapper enabling Unreal games to fetch, buy, and trade skins.',
      platform: 'UE 5.1+',
      icon: '🌌',
      color: '#bf5af2',
      downloadSize: '7.8 MB',
      codeSnippet: `// UDeShopComponent.h
#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DeShopSDK.h"
#include "UDeShopComponent.generated.h"

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class DESHOPSDK_API UUDeShopComponent : public UActorComponent {
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void BuySkin(FString SkinID);

    UPROPERTY(BlueprintAssignable, Category = "DeShop")
    FOnPurchaseComplete OnPurchaseComplete;
};`,
      setupSteps: [
        'Download the DeShopSDK-Unreal.zip file.',
        'Extract it inside your project\'s "Plugins/" directory.',
        'Regenerate Visual Studio project files and compile the project.',
        'Enable the DeShopSDK plugin inside Edit > Plugins.',
        'Use the Blueprint nodes or C++ classes to request inventory lists and handle item purchases.'
      ]
    }
  ]

  const handleDownload = (plugin: Plugin) => {
    if (downloadingId) return
    setDownloadingId(plugin.id)
    setDownloadProgress(0)

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setDownloadingId(null)
            store.addNotification('success', `✓ Downloaded ${plugin.name} successfully!`)
          }, 400)
          return 100
        }
        return prev + 10
      })
    }, 150)
  }

  return (
    <div className="plugins-page-wrap">
      {/* Page Header */}
      <div className="plugins-header-block">
        <h2>🔌 SDK Plugin Hub</h2>
        <p>Connect your game engines with the Algorand blockchain and AI Visual Classifier.</p>
      </div>

      {/* Grid Layout */}
      <div className="plugins-grid">
        {plugins.map(plugin => (
          <div key={plugin.id} className="plugin-card-wrapper">
            <div className="plugin-card-header" style={{ borderColor: `${plugin.color}40` }}>
              <span className="plugin-card-icon" style={{ textShadow: `0 0 16px ${plugin.color}40` }}>
                {plugin.icon}
              </span>
              <div className="plugin-card-header-meta">
                <span className="plugin-card-platform">{plugin.platform}</span>
                <span className="plugin-card-version">{plugin.version}</span>
              </div>
            </div>
            <div className="plugin-card-body">
              <h3 style={{ color: '#fff', fontSize: 16, margin: '8px 0 4px' }}>{plugin.name}</h3>
              <span className="plugin-card-language" style={{ background: `${plugin.color}20`, color: plugin.color }}>
                {plugin.language}
              </span>
              <p className="plugin-card-desc">{plugin.description}</p>
            </div>
            <div className="plugin-card-footer">
              <button
                className="plugin-action-btn plugin-action-btn--docs"
                onClick={() => setSelectedPlugin(plugin)}
              >
                Setup Guide
              </button>
              <button
                className="plugin-action-btn plugin-action-btn--download"
                style={{ background: plugin.color }}
                onClick={() => handleDownload(plugin)}
                disabled={downloadingId !== null}
              >
                {downloadingId === plugin.id ? (
                  <span>Downloading {downloadProgress}%</span>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    Get ({plugin.downloadSize})
                  </>
                )}
              </button>
            </div>
            {/* Download Progress Bar */}
            {downloadingId === plugin.id && (
              <div className="plugin-download-progress-track">
                <div
                  className="plugin-download-progress-bar"
                  style={{ width: `${downloadProgress}%`, background: plugin.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Setup Guide Modal */}
      <AnimatePresence>
        {selectedPlugin && (
          <div className="premium-modal-overlay" onClick={() => setSelectedPlugin(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="macos-window plugin-modal-window"
              onClick={e => e.stopPropagation()}
            >
              {/* title bar */}
              <div className="macos-window__titlebar">
                <div className="macos-window__traffic-lights">
                  <button className="macos-window__traffic-light macos-window__traffic-light--red" onClick={() => setSelectedPlugin(null)} />
                  <div className="macos-window__traffic-light macos-window__traffic-light--yellow" />
                  <div className="macos-window__traffic-light macos-window__traffic-light--green" />
                </div>
                <div className="macos-window__title">
                  <Puzzle className="h-3.5 w-3.5 mr-1.5 opacity-60" />
                  {selectedPlugin.name} Setup Guide
                </div>
              </div>

              {/* modal body */}
              <div className="macos-window__body plugin-modal-body">
                {/* left side: steps */}
                <div className="plugin-modal-steps-column">
                  <h4><Settings className="h-4 w-4 mr-1.5 inline" />Installation Steps</h4>
                  <ol className="setup-steps-list">
                    {selectedPlugin.setupSteps.map((step, idx) => (
                      <li key={idx}>
                        <span className="step-num">{idx + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <button
                    className="premium-btn"
                    style={{ background: selectedPlugin.color, width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                    onClick={() => handleDownload(selectedPlugin)}
                    disabled={downloadingId !== null}
                  >
                    {downloadingId === selectedPlugin.id ? (
                      <span>Downloading {downloadProgress}%...</span>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download SDK Files ({selectedPlugin.downloadSize})
                      </>
                    )}
                  </button>
                </div>

                {/* right side: code snippet */}
                <div className="plugin-modal-code-column">
                  <h4><Code className="h-4 w-4 mr-1.5 inline" />Integration Code Example</h4>
                  <div className="code-block-wrapper" style={{ flex: 1, maxHeight: '350px' }}>
                    <pre><code>{selectedPlugin.codeSnippet}</code></pre>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(selectedPlugin.codeSnippet, selectedPlugin.id)}
                    >
                      {copiedId === selectedPlugin.id ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
