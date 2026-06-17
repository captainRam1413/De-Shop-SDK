'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Copy, Check, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'

/* ===== TRAFFIC LIGHTS ===== */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ===== COPY BUTTON ===== */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="text-[10px] px-2 py-0.5 bg-term-elevated border border-term rounded-sm hover:bg-term-border transition-colors text-term-dim hover:text-term-green flex items-center gap-1"
    >
      {copied ? (
        <>
          <Check size={10} className="text-term-green" />
          <span className="text-term-green">COPIED</span>
        </>
      ) : (
        <>
          <Copy size={10} />
          <span>[COPY]</span>
        </>
      )}
    </button>
  )
}

/* ===== CODE BLOCK ===== */

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="bg-[#1a1a1a] border border-term rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-term-elevated border-b border-term">
          <span className="text-[10px] text-term-dim">{language}</span>
          <CopyButton text={code} />
        </div>
        <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed">
          <code className="text-term-green">{code}</code>
        </pre>
      </div>
    </div>
  )
}

/* ===== SECTION IDs ===== */

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'sdk-methods', label: 'SDK Methods' },
  { id: 'smart-contracts', label: 'Smart Contracts' },
  { id: 'plugin-development', label: 'Plugin Development' },
  { id: 'game-integration', label: 'Game Integration' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'faq', label: 'FAQ' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/* ===== FAQ ITEM ===== */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-term rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-term-elevated transition-colors"
      >
        <span className="text-term-cyan text-xs font-bold">
          {open ? '[-]' : '[+]'}
        </span>
        <span className="text-sm text-term-green flex-1">{question}</span>
        <ChevronDown
          size={14}
          className={`text-term-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 text-term-text text-xs leading-relaxed border-t border-term bg-[#1a1a1a]">
              <span className="text-term-dim prompt-prefix">$ </span>
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ===== GAME INTEGRATION TABS ===== */

function GameIntegration() {
  const [activeTab, setActiveTab] = useState<'minecraft' | 'unity' | 'unreal'>('minecraft')

  const tabs = [
    { id: 'minecraft' as const, label: 'Minecraft', icon: '⛏️' },
    { id: 'unity' as const, label: 'Unity', icon: '🎮' },
    { id: 'unreal' as const, label: 'Unreal', icon: '🎯' },
  ]

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-1 border-b border-term pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-term-green border-term-green bg-term-elevated'
                : 'text-term-dim border-transparent hover:text-term-text'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'minecraft' && (
            <div className="space-y-3">
              <div className="text-xs text-term-text">
                <span className="text-term-amber font-bold">## Bukkit/Spigot Plugin Setup</span>
              </div>
              <div className="text-xs text-term-dim">
                Integrate De-Shop into your Minecraft server to enable NFT-based skins, items, and trading.
              </div>
              <CodeBlock
                language="bash"
                code={`# Download the plugin
$ wget https://plugins.deshop.dev/minecraft/deshop-plugin-2.1.0.jar

# Move to plugins directory
$ mv deshop-plugin-2.1.0.jar /server/plugins/

# Restart server
$ ./stop.sh && ./start.sh`}
              />
              <div className="text-xs text-term-amber font-bold mt-4">## config.yml</div>
              <CodeBlock
                language="yaml"
                code={`# De-Shop Minecraft Plugin Configuration
deshop:
  api-key: "your-api-key-here"
  network: "testnet"
  enabled: true
  
  # Skin integration
  skins:
    enabled: true
    auto-apply: true
    cache-duration: 300
    
  # Marketplace
  marketplace:
    enabled: true
    command: "/shop"
    npc-integration: true
    
  # Commands
  commands:
    shop: "/shop"
    inventory: "/dshop inv"
    mint: "/dshop mint <name> <rarity>"`}
              />
              <div className="text-xs text-term-amber font-bold mt-4">## Commands</div>
              <div className="bg-[#1a1a1a] border border-term rounded-sm p-3 text-[11px] space-y-1">
                <div><span className="text-term-green">/shop</span> <span className="text-term-dim">— Open marketplace GUI</span></div>
                <div><span className="text-term-green">/dshop inv</span> <span className="text-term-dim">— View your NFT inventory</span></div>
                <div><span className="text-term-green">/dshop mint &lt;name&gt; &lt;rarity&gt;</span> <span className="text-term-dim">— Mint a new NFT</span></div>
                <div><span className="text-term-green">/dshop list &lt;id&gt; &lt;price&gt;</span> <span className="text-term-dim">— List NFT on marketplace</span></div>
                <div><span className="text-term-green">/dshop buy &lt;id&gt;</span> <span className="text-term-dim">— Buy an NFT</span></div>
                <div><span className="text-term-green">/dshop transfer &lt;id&gt; &lt;player&gt;</span> <span className="text-term-dim">— Transfer NFT to player</span></div>
              </div>
            </div>
          )}

          {activeTab === 'unity' && (
            <div className="space-y-3">
              <div className="text-xs text-term-text">
                <span className="text-term-amber font-bold">## Unity Package Setup</span>
              </div>
              <div className="text-xs text-term-dim">
                Add De-Shop SDK to your Unity project for NFT asset management and marketplace integration.
              </div>
              <CodeBlock
                language="bash"
                code={`# Install via Unity Package Manager
# Window > Package Manager > Add package from git URL

https://github.com/deshop-sdk/unity-package.git#v1.8.0`}
              />
              <div className="text-xs text-term-amber font-bold mt-4">## DeShopSDK.cs Setup</div>
              <CodeBlock
                language="csharp"
                code={`using DeShop.SDK;
using UnityEngine;

public class DeShopManager : MonoBehaviour
{
    private DeShopSDK sdk;
    
    async void Start()
    {
        // Initialize SDK
        sdk = new DeShopSDK(new DeShopConfig
        {
            Network = "testnet",
            ApiKey = "your-api-key",
            AutoConnect = true
        });
        
        // Connect wallet
        await sdk.ConnectWallet();
        
        // Mint an NFT
        var asset = await sdk.Mint(new MintParams
        {
            Name = "Legendary Sword",
            Type = "weapon",
            Rarity = "legendary"
        });
        
        Debug.Log($"Minted: {asset.Name} (ID: {asset.Id})");
    }
    
    // Load player inventory
    async void LoadInventory()
    {
        var items = await sdk.GetInventory();
        foreach (var item in items)
        {
            Debug.Log($"{item.Name} - {item.Rarity}");
        }
    }
}`}
              />
            </div>
          )}

          {activeTab === 'unreal' && (
            <div className="space-y-3">
              <div className="text-xs text-term-text">
                <span className="text-term-amber font-bold">## Unreal Engine Plugin Setup</span>
              </div>
              <div className="text-xs text-term-dim">
                Integrate De-Shop into your Unreal Engine 5 project for blockchain-based asset management.
              </div>
              <CodeBlock
                language="bash"
                code={`# Clone the plugin into your project
$ cd YourProject/Plugins
$ git clone https://github.com/deshop-sdk/unreal-plugin.git DeShopSDK
$ git checkout v1.3.0

# Regenerate project files
$ ./GenerateProjectFiles.bat   # Windows
$ ./GenerateProjectFiles.sh    # Linux/Mac`}
              />
              <div className="text-xs text-term-amber font-bold mt-4">## DeShopSDKClient.h Setup</div>
              <CodeBlock
                language="cpp"
                code={`#pragma once

#include "CoreMinimal.h"
#include "DeShopSDKClient.generated.h"

UCLASS()
class ADeShopSDKClient : public AActor
{
    GENERATED_BODY()
    
public:
    ADeShopSDKClient();
    
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString ApiKey;
    
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Network = TEXT("testnet");
    
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void Initialize();
    
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void MintAsset(const FString& Name, const FString& Type, 
                   const FString& Rarity);
    
    UFUNCTION(BlueprintCallable, Category = "DeShop")
    void GetInventory();
    
private:
    UPROPERTY()
    class UDeShopSDK* SDKInstance;
};`}
              />
              <div className="bg-[#1a1a1a] border border-term rounded-sm p-3 mt-3">
                <div className="text-[10px] text-term-amber mb-2">⚠ Beta Status</div>
                <div className="text-[11px] text-term-dim">
                  The Unreal plugin is currently in Beta. Some features may be incomplete. 
                  Check the GitHub repo for the latest updates and known issues.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ===== MAIN DOCS PAGE ===== */

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SectionId>('getting-started')
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToSection = useCallback((id: SectionId) => {
    setActiveSection(id)
    const el = document.getElementById(`doc-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">docs@de-shop:~/documentation</span>
        </div>
        <div className="terminal-card-body">
          {/* Page Title */}
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-term-cyan" />
            <span className="text-sm text-term-cyan glow-cyan font-bold">De-Shop SDK Documentation</span>
            <span className="text-term-dim text-xs">v2.0</span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-term-green text-xs">$</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search --query <section-name>"
              className="terminal-input pl-7 text-xs"
            />
            <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-term-dim" />
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Table of Contents Sidebar */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="terminal-card lg:sticky lg:top-4">
                <div className="terminal-card-header">
                  <span className="text-[10px] text-term-dim">TABLE_OF_CONTENTS</span>
                </div>
                <div className="p-2 space-y-0.5 max-h-80 lg:max-h-[600px] overflow-y-auto">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-1.5 text-[11px] rounded-sm transition-colors flex items-center gap-2 ${
                        activeSection === section.id
                          ? 'bg-term-selection text-term-green'
                          : 'text-term-dim hover:bg-term-elevated hover:text-term-text'
                      }`}
                    >
                      <span className="text-[9px]">
                        {activeSection === section.id ? '>' : '$'}
                      </span>
                      <span>cd {section.id.replace(/-/g, '_')}</span>
                    </button>
                  ))}
                  {filteredSections.length === 0 && (
                    <div className="text-term-dim text-[10px] p-2 text-center">
                      No sections found for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 space-y-6 min-w-0">

              {/* Getting Started */}
              <div id="doc-getting-started" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">getting_started.md</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Getting Started</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    De-Shop SDK is a comprehensive toolkit for building decentralized marketplace applications
                    on the Algorand blockchain. It provides NFT minting, trading, AI-powered pricing, and
                    cross-game asset bridging capabilities.
                  </div>
                  <div className="text-xs text-term-amber font-bold mt-3">## Architecture</div>
                  <pre className="bg-[#1a1a1a] border border-term rounded-sm p-4 text-[10px] leading-tight text-term-green overflow-x-auto">
{`┌─────────────────────────────────────────────────────┐
│                   De-Shop SDK                       │
├─────────────┬──────────────┬────────────────────────┤
│   Frontend  │    Core      │     Blockchain         │
│   Module    │    Engine    │     Layer              │
├─────────────┼──────────────┼────────────────────────┤
│ React Hooks │ Mint Engine  │ Algorand Smart         │
│ UI Comps    │ Trade Engine │ Contracts (ARC-3/19/69)│
│ Theme Sys   │ Price Oracle │ Atomic Transfers       │
│ Wallet Conn │ Bridge Engine│ ASA Management         │
├─────────────┴──────────────┴────────────────────────┤
│              Plugin / Integration Layer              │
├──────────┬──────────┬──────────┬────────────────────┤
│ Minecraft│  Unity   │  Unreal  │   Custom Plugins   │
│  Plugin  │   SDK    │  Plugin  │   via API          │
└──────────┴──────────┴──────────┴────────────────────┘`}
                  </pre>
                  <div className="text-xs text-term-dim mt-2">
                    <span className="text-term-cyan">Key Features:</span>
                  </div>
                  <ul className="text-xs text-term-text space-y-1 ml-4">
                    <li><span className="text-term-green">✓</span> NFT Minting with rarity system (Common → Legendary)</li>
                    <li><span className="text-term-green">✓</span> Decentralized marketplace with AI-powered pricing</li>
                    <li><span className="text-term-green">✓</span> Cross-game asset bridging (Minecraft, Unity, Unreal)</li>
                    <li><span className="text-term-green">✓</span> Wallet connectivity (Pera, Defly)</li>
                    <li><span className="text-term-green">✓</span> Plugin system for custom integrations</li>
                  </ul>
                </div>
              </div>

              {/* Installation */}
              <div id="doc-installation" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">installation.sh</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Installation</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Install the De-Shop SDK using your preferred package manager.
                  </div>
                  <div className="text-xs text-term-amber font-bold mt-2">## npm</div>
                  <CodeBlock
                    language="bash"
                    code={`$ npm install @deshop/sdk`}
                  />
                  <div className="text-xs text-term-amber font-bold mt-3">## bun</div>
                  <CodeBlock
                    language="bash"
                    code={`$ bun add @deshop/sdk`}
                  />
                  <div className="text-xs text-term-amber font-bold mt-3">## yarn</div>
                  <CodeBlock
                    language="bash"
                    code={`$ yarn add @deshop/sdk`}
                  />
                  <div className="text-xs text-term-amber font-bold mt-3">## pnpm</div>
                  <CodeBlock
                    language="bash"
                    code={`$ pnpm add @deshop/sdk`}
                  />
                  <div className="bg-[#1a1a1a] border border-term rounded-sm p-3 mt-3">
                    <div className="text-[10px] text-term-amber mb-1">⚠ Prerequisites</div>
                    <ul className="text-[11px] text-term-dim space-y-0.5 ml-3">
                      <li>• Node.js 18+ or Bun 1.0+</li>
                      <li>• An Algorand wallet (Pera or Defly)</li>
                      <li>• API key from <span className="text-term-cyan">dashboard.deshop.dev</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div id="doc-quick-start" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">quick_start.ts</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Quick Start</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Get up and running with De-Shop SDK in under 5 minutes.
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-2">## Step 1: Initialize the SDK</div>
                  <CodeBlock
                    language="typescript"
                    code={`import { DeShopSDK } from '@deshop/sdk'

const sdk = new DeShopSDK({
  network: 'testnet',
  apiKey: 'your-api-key'
})`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Step 2: Connect Wallet</div>
                  <CodeBlock
                    language="typescript"
                    code={`// Connect using Pera wallet
await sdk.connect('pera')

// Or connect using Defly wallet
await sdk.connect('defly')

console.log('Connected:', sdk.walletAddress)`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Step 3: Mint an NFT</div>
                  <CodeBlock
                    language="typescript"
                    code={`// Mint a new asset
const asset = await sdk.mint({
  name: 'My Skin',
  type: 'weapon',
  rarity: 'rare'
})

console.log('Minted:', asset.id, asset.name)`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Step 4: List on Marketplace</div>
                  <CodeBlock
                    language="typescript"
                    code={`// List your NFT for sale
await sdk.listAsset(asset.id, 5.0) // 5 ALGO

// Browse marketplace
const listings = await sdk.getMarketplace({
  rarity: 'rare',
  sort: 'price_asc'
})`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Step 5: Bridge to Game</div>
                  <CodeBlock
                    language="typescript"
                    code={`// Bridge asset to Minecraft server
const result = await sdk.bridgeToGame(asset.id, 'minecraft')
console.log('Bridged:', result.gameId, result.assetRef)`}
                  />
                </div>
              </div>

              {/* API Reference */}
              <div id="doc-api-reference" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">api_reference.md</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># API Reference</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Complete reference for all De-Shop SDK methods and types.
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-2">## SDK Constructor</div>
                  <CodeBlock
                    language="typescript"
                    code={`new DeShopSDK(config: DeShopConfig)

interface DeShopConfig {
  network: 'testnet' | 'mainnet'
  apiKey: string
  timeout?: number        // default: 30000ms
  retryCount?: number     // default: 3
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-4">## Core Methods</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border border-term rounded-sm">
                      <thead>
                        <tr className="bg-term-elevated">
                          <th className="text-left p-2 border-b border-term text-term-amber">Method</th>
                          <th className="text-left p-2 border-b border-term text-term-cyan">Parameters</th>
                          <th className="text-left p-2 border-b border-term text-term-amber">Return Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-term">
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">mint</td>
                          <td className="p-2 text-term-cyan">(params: MintParams)</td>
                          <td className="p-2 text-term-amber">Promise&lt;Asset&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">buyAsset</td>
                          <td className="p-2 text-term-cyan">(assetId: number)</td>
                          <td className="p-2 text-term-amber">Promise&lt;BuyResult&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">listAsset</td>
                          <td className="p-2 text-term-cyan">(assetId: number, price: number)</td>
                          <td className="p-2 text-term-amber">Promise&lt;void&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">getInventory</td>
                          <td className="p-2 text-term-cyan">()</td>
                          <td className="p-2 text-term-amber">Promise&lt;Asset[]&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">getMarketplace</td>
                          <td className="p-2 text-term-cyan">(query?: MarketplaceQuery)</td>
                          <td className="p-2 text-term-amber">Promise&lt;Asset[]&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">transferAsset</td>
                          <td className="p-2 text-term-cyan">(assetId: number, to: string)</td>
                          <td className="p-2 text-term-amber">Promise&lt;TransferResult&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">getPriceSuggestion</td>
                          <td className="p-2 text-term-cyan">(name: string)</td>
                          <td className="p-2 text-term-amber">Promise&lt;PriceSuggestion&gt;</td>
                        </tr>
                        <tr className="hover:bg-term-elevated">
                          <td className="p-2 text-term-green font-bold">bridgeToGame</td>
                          <td className="p-2 text-term-cyan">(assetId: number, game: string)</td>
                          <td className="p-2 text-term-amber">Promise&lt;BridgeResult&gt;</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SDK Methods - Detailed */}
              <div id="doc-sdk-methods" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">sdk_methods.ts</span>
                </div>
                <div className="terminal-card-body space-y-4">
                  <div className="text-term-green font-bold text-sm"># SDK Methods — Detailed</div>

                  <div className="space-y-4">
                    {/* mint */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">mint</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">CORE</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">mint(params: MintParams): Promise&lt;Asset&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Creates a new NFT on the Algorand blockchain with specified properties.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const asset = await sdk.mint({
  name: 'Neon Blade',
  type: 'weapon',       // 'weapon' | 'character' | 'accessory'
  rarity: 'rare',       // 'common' | 'rare' | 'epic' | 'legendary'
  metadata: {
    description: 'A glowing neon blade',
    image: 'ipfs://Qm...'
  }
})
// Returns: { id: 12345, name: 'Neon Blade', rarity: 'rare', ... }`}
                      />
                    </div>

                    {/* buyAsset */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">buyAsset</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">TRADE</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">buyAsset(assetId: number): Promise&lt;BuyResult&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Purchases an asset from the marketplace using atomic transfers.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const result = await sdk.buyAsset(12345)
// Returns: { success: true, txId: 'ALGO...', asset: {...} }`}
                      />
                    </div>

                    {/* listAsset */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">listAsset</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">TRADE</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">listAsset(assetId: number, price: number): Promise&lt;void&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Lists an owned asset on the marketplace for a specified price in ALGO.</div>
                      <CodeBlock
                        language="typescript"
                        code={`await sdk.listAsset(12345, 5.0) // List for 5 ALGO`}
                      />
                    </div>

                    {/* getInventory */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">getInventory</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">QUERY</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">getInventory(): Promise&lt;Asset[]&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Retrieves all assets owned by the connected wallet.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const items = await sdk.getInventory()
items.forEach(item => {
  console.log(\`\${item.name} [\${item.rarity}] - \${item.value} ALGO\`)
})`}
                      />
                    </div>

                    {/* getMarketplace */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">getMarketplace</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">QUERY</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">getMarketplace(query?: MarketplaceQuery): Promise&lt;Asset[]&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Searches the marketplace with optional filters and sorting.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const listings = await sdk.getMarketplace({
  rarity: 'epic',
  type: 'weapon',
  sort: 'price_asc',
  limit: 20,
  offset: 0
})`}
                      />
                    </div>

                    {/* transferAsset */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">transferAsset</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-selection text-term-green rounded-sm">TRADE</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">transferAsset(assetId: number, to: string): Promise&lt;TransferResult&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Transfers an asset to another wallet address.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const result = await sdk.transferAsset(
  12345,
  'ALGO7K4BRCDFND2J4...X3F9QM'
)
// Returns: { success: true, txId: 'ALGO...', from: '...', to: '...' }`}
                      />
                    </div>

                    {/* getPriceSuggestion */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">getPriceSuggestion</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-elevated text-term-cyan rounded-sm">AI</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">getPriceSuggestion(name: string): Promise&lt;PriceSuggestion&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Gets AI-powered price suggestion for an asset based on market data.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const suggestion = await sdk.getPriceSuggestion('Neon Blade')
// Returns: {
//   suggested: 4.2,
//   range: { min: 3.5, max: 5.0 },
//   confidence: 0.87,
//   factors: ['rarity', 'demand', 'supply']
// }`}
                      />
                    </div>

                    {/* bridgeToGame */}
                    <div className="border border-term rounded-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-term-green text-xs font-bold">bridgeToGame</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-term-elevated text-term-magenta rounded-sm">BRIDGE</span>
                      </div>
                      <div className="text-[11px] text-term-cyan mb-2">bridgeToGame(assetId: number, game: string): Promise&lt;BridgeResult&gt;</div>
                      <div className="text-[11px] text-term-dim mb-2">Bridges an NFT asset to a supported game platform.</div>
                      <CodeBlock
                        language="typescript"
                        code={`const result = await sdk.bridgeToGame(12345, 'minecraft')
// Returns: {
//   success: true,
//   gameId: 'mc-server-001',
//   assetRef: 'deshop:asset:12345',
//   status: 'active'
// }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Contracts */}
              <div id="doc-smart-contracts" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">smart_contracts.md</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Smart Contracts</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    De-Shop uses Algorand smart contracts for secure, trustless transactions.
                    All contracts follow ARC standards for maximum compatibility.
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-2">## ARC Standards</div>
                  <div className="space-y-2">
                    <div className="border border-term rounded-sm p-2">
                      <div className="text-term-cyan text-xs font-bold">ARC-3: NFT Standard</div>
                      <div className="text-[10px] text-term-dim mt-1">
                        Used for minting unique digital assets with immutable metadata stored on IPFS.
                      </div>
                    </div>
                    <div className="border border-term rounded-sm p-2">
                      <div className="text-term-cyan text-xs font-bold">ARC-19: Mutable Metadata</div>
                      <div className="text-[10px] text-term-dim mt-1">
                        Enables updating asset metadata (e.g., game state changes) while maintaining provenance.
                      </div>
                    </div>
                    <div className="border border-term rounded-sm p-2">
                      <div className="text-term-cyan text-xs font-bold">ARC-69: Enhanced Metadata</div>
                      <div className="text-[10px] text-term-dim mt-1">
                        Rich metadata format supporting properties, description, and external URLs.
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-3">## Contract Addresses</div>
                  <CodeBlock
                    language="typescript"
                    code={`// Testnet Contract Addresses
const CONTRACTS = {
  mintVault:   'APP_ID_123456',
  marketplace: 'APP_ID_234567',
  priceOracle: 'APP_ID_345678',
  bridgeProxy: 'APP_ID_456789',
}

// Mainnet Contract Addresses
const CONTRACTS_MAINNET = {
  mintVault:   'APP_ID_987654',
  marketplace: 'APP_ID_876543',
  priceOracle: 'APP_ID_765432',
  bridgeProxy: 'APP_ID_654321',
}`}
                  />
                </div>
              </div>

              {/* Plugin Development */}
              <div id="doc-plugin-development" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">plugin_dev.md</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Plugin Development</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Create custom plugins to extend De-Shop functionality. Plugins follow a simple interface
                    and can hook into the SDK lifecycle.
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-2">## Plugin Interface</div>
                  <CodeBlock
                    language="typescript"
                    code={`import { DeShopPlugin, PluginContext } from '@deshop/sdk'

export class MyPlugin implements DeShopPlugin {
  name = 'my-plugin'
  version = '1.0.0'
  
  async onInit(ctx: PluginContext) {
    // Called when SDK initializes
    console.log('Plugin initialized:', this.name)
  }
  
  async onMint(asset: Asset) {
    // Called after an asset is minted
    console.log('Asset minted:', asset.id)
  }
  
  async onTrade(result: TradeResult) {
    // Called after a trade completes
    console.log('Trade completed:', result.txId)
  }
  
  async onDestroy() {
    // Cleanup when plugin is removed
    console.log('Plugin destroyed:', this.name)
  }
}`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Register Plugin</div>
                  <CodeBlock
                    language="typescript"
                    code={`const sdk = new DeShopSDK({ network: 'testnet', apiKey: 'key' })
sdk.registerPlugin(new MyPlugin())`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Plugin Template</div>
                  <CodeBlock
                    language="bash"
                    code={`# Create from template
$ npx @deshop/create-plugin my-plugin

# Or use the CLI
$ deshop plugin create my-plugin --template typescript

# Development mode
$ cd my-plugin && npm run dev`}
                  />
                </div>
              </div>

              {/* Game Integration */}
              <div id="doc-game-integration" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">game_integration.md</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Game Integration</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Integrate De-Shop into your game to enable blockchain-based assets and trading.
                    We provide dedicated plugins for popular game engines.
                  </div>
                  <GameIntegration />
                </div>
              </div>

              {/* Configuration */}
              <div id="doc-configuration" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">configuration.json</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Configuration</div>
                  <div className="text-xs text-term-text leading-relaxed">
                    Configure the De-Shop SDK to match your application requirements.
                  </div>

                  <div className="text-xs text-term-amber font-bold mt-2">## Full Configuration</div>
                  <CodeBlock
                    language="typescript"
                    code={`import { DeShopSDK } from '@deshop/sdk'

const sdk = new DeShopSDK({
  // Network configuration
  network: 'testnet',           // 'testnet' | 'mainnet'
  apiKey: 'your-api-key',       // Get from dashboard.deshop.dev
  
  // Performance
  timeout: 30000,               // Request timeout in ms
  retryCount: 3,                // Max retry attempts
  concurrency: 5,               // Max concurrent requests
  
  // Logging
  logLevel: 'info',             // 'debug' | 'info' | 'warn' | 'error'
  
  // Features
  autoConnect: false,           // Auto-connect wallet on init
  enableCache: true,            // Cache API responses
  cacheTTL: 300,                // Cache TTL in seconds
  
  // Bridge
  bridgeEndpoint: 'https://bridge.deshop.dev',
  
  // IPFS
  ipfsGateway: 'https://ipfs.deshop.dev',
  pinOnMint: true,              // Auto-pin metadata to IPFS
})`}
                  />

                  <div className="text-xs text-term-amber font-bold mt-3">## Environment Variables</div>
                  <CodeBlock
                    language="bash"
                    code={`# .env file
DESHOP_API_KEY=your-api-key
DESHOP_NETWORK=testnet
DESHOP_LOG_LEVEL=info
DESHOP_WALLET_PROVIDER=pera`}
                  />
                </div>
              </div>

              {/* FAQ */}
              <div id="doc-faq" className="terminal-card">
                <div className="terminal-card-header">
                  <TrafficLights />
                  <span className="terminal-title">faq.log</span>
                </div>
                <div className="terminal-card-body space-y-3">
                  <div className="text-term-green font-bold text-sm"># Frequently Asked Questions</div>
                  <div className="space-y-2 mt-2">
                    <FaqItem
                      question="What blockchain does De-Shop use?"
                      answer="De-Shop is built on the Algorand blockchain, leveraging its low fees, fast finality, and carbon-negative status. All NFTs follow ARC-3, ARC-19, and ARC-69 standards."
                    />
                    <FaqItem
                      question="How do I get an API key?"
                      answer="Visit dashboard.deshop.dev and create an account. Navigate to the API Keys section and generate a new key. Free tier includes 1,000 requests/day."
                    />
                    <FaqItem
                      question="Which wallets are supported?"
                      answer="Currently, De-Shop supports Pera Wallet and Defly Wallet for Algorand. More wallet providers will be added in future releases."
                    />
                    <FaqItem
                      question="Can I use De-Shop in production?"
                      answer="Yes! De-Shop SDK is production-ready. Use network: 'mainnet' in your configuration. Make sure to test thoroughly on testnet first."
                    />
                    <FaqItem
                      question="How does the AI pricing work?"
                      answer="The AI pricing engine analyzes market data including rarity, demand, supply, and historical sales to suggest optimal prices. Confidence scores indicate prediction reliability."
                    />
                    <FaqItem
                      question="Is the Minecraft plugin free?"
                      answer="Yes, all De-Shop plugins are open-source and free to use. You can find them on our GitHub organization at github.com/deshop-sdk."
                    />
                    <FaqItem
                      question="How do asset bridges work?"
                      answer="Bridge operations lock the NFT on-chain and create a corresponding reference in the target game. The original NFT remains on Algorand while the game reads the ownership proof."
                    />
                    <FaqItem
                      question="What is the gas fee for minting?"
                      answer="Algorand transactions have minimal fees (0.001 ALGO per transaction). Minting an NFT typically requires 2-3 transactions, costing approximately 0.003 ALGO total."
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
