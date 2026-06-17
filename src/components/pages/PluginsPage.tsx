'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  ExternalLink,
  Star,
  X,
  Check,
  ChevronDown,
  Github,
  Puzzle,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'

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

/* ===== PLUGIN DATA ===== */

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  language: string
  platform: string
  status: 'Stable' | 'Beta' | 'Alpha'
  downloads: number
  rating: number
  lastUpdated: string
  tags: string[]
  size: string
  checksum: string
  featured?: boolean
}

const PLUGINS: Plugin[] = [
  {
    id: 'minecraft',
    name: 'De-Shop Minecraft Plugin',
    description:
      'Full-featured Minecraft server integration with NFT skins, marketplace GUI, and in-game trading. Supports Bukkit/Spigot servers with automatic asset syncing and NPC shopkeepers.',
    version: 'v2.1.0',
    language: 'Java',
    platform: 'Bukkit/Spigot',
    status: 'Stable',
    downloads: 12450,
    rating: 4.8,
    lastUpdated: '2026-06-10',
    tags: ['Game Engine', 'Java', 'Minecraft', 'Server Plugin'],
    size: '4.2 MB',
    checksum: 'sha256:a1b2c3d4e5f6...',
    featured: true,
  },
  {
    id: 'unity',
    name: 'De-Shop Unity SDK',
    description:
      'Native Unity package for integrating De-Shop marketplace and NFT management. Includes prefabs, UI components, and full C# API bindings.',
    version: 'v1.8.0',
    language: 'C#',
    platform: 'Unity 2021+',
    status: 'Stable',
    downloads: 8320,
    rating: 4.6,
    lastUpdated: '2026-06-05',
    tags: ['Game Engine', 'C#', 'Unity', 'Package'],
    size: '2.8 MB',
    checksum: 'sha256:b2c3d4e5f6a1...',
  },
  {
    id: 'unreal',
    name: 'De-Shop Unreal Plugin',
    description:
      'Unreal Engine 5 plugin with Blueprint-compatible nodes, C++ API, and in-game marketplace widgets. Currently in active beta development.',
    version: 'v1.3.0',
    language: 'C++',
    platform: 'UE5',
    status: 'Beta',
    downloads: 3450,
    rating: 4.2,
    lastUpdated: '2026-05-28',
    tags: ['Game Engine', 'C++', 'Unreal', 'Plugin'],
    size: '6.1 MB',
    checksum: 'sha256:c3d4e5f6a1b2...',
  },
  {
    id: 'web3-bridge',
    name: 'De-Shop Web3 Bridge',
    description:
      'TypeScript bridge service for connecting De-Shop to other Web3 protocols and chains. Supports cross-chain asset verification and price feeds.',
    version: 'v1.0.0',
    language: 'TypeScript',
    platform: 'Node.js',
    status: 'Stable',
    downloads: 5670,
    rating: 4.5,
    lastUpdated: '2026-06-12',
    tags: ['Bridge', 'TypeScript', 'Node.js', 'Web3'],
    size: '1.4 MB',
    checksum: 'sha256:d4e5f6a1b2c3...',
  },
  {
    id: 'ai-pricing',
    name: 'De-Shop AI Pricing Engine',
    description:
      'AI-powered pricing engine that analyzes market data to suggest optimal NFT prices. Includes confidence scoring and historical trend analysis.',
    version: 'v0.9.0',
    language: 'Python',
    platform: 'Python 3.9+',
    status: 'Beta',
    downloads: 2180,
    rating: 4.0,
    lastUpdated: '2026-05-15',
    tags: ['AI/ML', 'Python', 'Pricing', 'Analytics'],
    size: '3.5 MB',
    checksum: 'sha256:e5f6a1b2c3d4...',
  },
  {
    id: 'steam',
    name: 'De-Shop Steam Integration',
    description:
      'Connect De-Shop assets to Steam inventory. Enables Steam overlay marketplace, achievement-linked NFTs, and Steam trade offer support.',
    version: 'v1.1.0',
    language: 'TypeScript',
    platform: 'Node.js',
    status: 'Stable',
    downloads: 4290,
    rating: 4.4,
    lastUpdated: '2026-06-08',
    tags: ['Platform', 'TypeScript', 'Steam', 'Integration'],
    size: '1.9 MB',
    checksum: 'sha256:f6a1b2c3d4e5...',
  },
]

/* ===== STATUS BADGE ===== */

function StatusBadge({ status }: { status: 'Stable' | 'Beta' | 'Alpha' }) {
  const styles = {
    Stable: 'bg-term-selection text-term-green border-term-green',
    Beta: 'bg-term-elevated text-term-amber border-term-amber',
    Alpha: 'bg-term-elevated text-term-red border-term-red',
  }
  return (
    <span
      className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {status}
    </span>
  )
}

/* ===== STAR RATING ===== */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          className={
            i <= Math.floor(rating)
              ? 'text-term-amber fill-term-amber'
              : i - 0.5 <= rating
                ? 'text-term-amber fill-term-amber/50'
                : 'text-term-border'
          }
        />
      ))}
      <span className="text-[10px] text-term-dim ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

/* ===== DOWNLOAD MODAL ===== */

function DownloadModal({
  plugin,
  onClose,
}: {
  plugin: Plugin
  onClose: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const addNotification = useDeShopStore((s) => s.addNotification)

  const startDownload = useCallback(() => {
    setDownloading(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setDownloading(false)
          setDownloaded(true)
          addNotification('success', `Downloaded ${plugin.name} ${plugin.version}`)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 200)
  }, [plugin, addNotification])

  const progressClamped = Math.min(100, Math.round(progress))
  const barWidth = progressClamped
  const filledBlocks = Math.floor(barWidth / 5)
  const emptyBlocks = 20 - filledBlocks
  const progressBar =
    '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="terminal-card w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">download_manager.log</span>
          <button
            onClick={onClose}
            className="text-term-dim hover:text-term-red transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        <div className="terminal-card-body space-y-4">
          {!downloaded ? (
            <>
              {/* File Info */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-term-dim">File:</span>
                  <span className="text-term-green">{plugin.name.toLowerCase().replace(/\s+/g, '-')}-{plugin.version}.zip</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-term-dim">Size:</span>
                  <span className="text-term-text">{plugin.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-term-dim">Version:</span>
                  <span className="text-term-cyan">{plugin.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-term-dim">Checksum:</span>
                  <span className="text-term-text text-[10px]">{plugin.checksum}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {downloading && (
                <div className="space-y-1 animate-slide-up-fade">
                  <div className="text-[10px] text-term-dim">Downloading...</div>
                  <div className="font-terminal text-[11px] text-term-green text-glow-green">
                    [{progressBar}] {progressClamped}%
                  </div>
                </div>
              )}

              {/* Installation Instructions */}
              {!downloading && (
                <div className="bg-[#1a1a1a] border border-term rounded-sm p-3">
                  <div className="text-[10px] text-term-amber mb-1">Installation:</div>
                  <pre className="text-[10px] text-term-green overflow-x-auto">
                    {plugin.id === 'minecraft'
                      ? `$ mv deshop-plugin-2.1.0.jar /server/plugins/\n$ ./restart.sh`
                      : plugin.id === 'unity'
                        ? `$ open Package Manager > Add from Git URL\n> https://github.com/deshop-sdk/unity-package.git`
                        : plugin.id === 'unreal'
                          ? `$ cd Plugins && git clone \n  https://github.com/deshop-sdk/unreal-plugin.git`
                          : `$ npm install @deshop/${plugin.id.replace(/-/g, '')}`}
                  </pre>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={startDownload}
                  disabled={downloading}
                  className="terminal-btn terminal-btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  {downloading ? 'Downloading...' : 'Confirm Download'}
                </button>
                <button
                  onClick={onClose}
                  disabled={downloading}
                  className="terminal-btn flex-1"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center space-y-3">
                <div className="text-2xl">✓</div>
                <div className="text-term-green font-bold text-sm">
                  Download Complete!
                </div>
                <div className="text-term-text text-xs">
                  {plugin.name} {plugin.version} has been downloaded successfully.
                </div>

                {/* Next Steps */}
                <div className="bg-[#1a1a1a] border border-term rounded-sm p-3 text-left">
                  <div className="text-[10px] text-term-amber mb-2">Next Steps:</div>
                  <ol className="text-[11px] text-term-text space-y-1 ml-3 list-decimal">
                    <li>Extract the archive to your project directory</li>
                    <li>Configure your API key in the settings file</li>
                    <li>Initialize the plugin with your De-Shop config</li>
                    <li>
                      Read the{' '}
                      <span className="text-term-cyan cursor-pointer hover:underline">
                        integration guide
                      </span>
                    </li>
                  </ol>
                </div>

                <button
                  onClick={onClose}
                  className="terminal-btn terminal-btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Check size={12} />
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ===== FEATURED PLUGIN ===== */

function FeaturedPlugin({ plugin, onDownload }: { plugin: Plugin; onDownload: (p: Plugin) => void }) {
  return (
    <div className="terminal-card terminal-card-glow border-term-green/30">
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">
          <span className="text-term-green">★ FEATURED</span> — {plugin.name}
        </span>
      </div>
      <div className="terminal-card-body">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-term-green text-lg font-bold glow-green">{plugin.name}</span>
              <StatusBadge status={plugin.status} />
              <span className="text-term-cyan text-xs">{plugin.version}</span>
            </div>
            <div className="text-xs text-term-text leading-relaxed">{plugin.description}</div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1">
                <Download size={11} className="text-term-cyan" />
                <span className="text-term-cyan">{plugin.downloads.toLocaleString()}</span>
                <span className="text-term-dim">downloads</span>
              </div>
              <StarRating rating={plugin.rating} />
              <div className="text-term-dim">
                Updated {plugin.lastUpdated}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {plugin.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-2 py-0.5 bg-term-elevated border border-term rounded-sm text-term-dim"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onDownload(plugin)}
                className="terminal-btn terminal-btn-primary flex items-center gap-2 text-xs"
              >
                <Download size={12} />
                Download {plugin.version}
              </button>
              <button className="terminal-btn flex items-center gap-2 text-xs">
                <ExternalLink size={12} />
                View Source
              </button>
            </div>
          </div>

          {/* Right: ASCII Preview */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-[#1a1a1a] border border-term rounded-sm p-3">
              <div className="text-[10px] text-term-amber mb-2">PREVIEW: Minecraft Server</div>
              <pre className="text-[9px] leading-tight text-term-green overflow-x-auto">
{`┌──────────────────────────┐
│  ⛏ De-Shop Plugin v2.1  │
├──────────────────────────┤
│  Status:  ● Connected    │
│  Assets:  47 synced      │
│  Shop:    ● Open         │
│  Bridge:  ● Active       │
├──────────────────────────┤
│  > /shop  - Marketplace  │
│  > /dshop - Inventory    │
│  > /mint  - Mint NFT     │
└──────────────────────────┘`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== PLUGIN CARD ===== */

function PluginCard({ plugin, onDownload }: { plugin: Plugin; onDownload: (p: Plugin) => void }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="terminal-card terminal-card-cyan-glow h-full flex flex-col"
    >
      <div className="terminal-card-header">
        <span className="text-[11px] text-term-green font-bold flex-1 truncate">
          {plugin.name}
        </span>
        <span className="text-[9px] text-term-cyan">{plugin.version}</span>
      </div>
      <div className="terminal-card-body flex-1 flex flex-col space-y-3">
        {/* Description */}
        <div className="text-[11px] text-term-text leading-relaxed line-clamp-3">
          {plugin.description}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {plugin.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[8px] px-1.5 py-0.5 bg-term-elevated border border-term rounded-sm text-term-dim"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <Download size={9} className="text-term-cyan" />
              <span className="text-term-cyan">{plugin.downloads.toLocaleString()}</span>
            </div>
            <StarRating rating={plugin.rating} />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <StatusBadge status={plugin.status} />
            </div>
            <span className="text-term-dim">{plugin.lastUpdated}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1 border-t border-term">
          <button
            onClick={() => onDownload(plugin)}
            className="terminal-btn terminal-btn-primary flex-1 flex items-center justify-center gap-1.5 text-[10px] py-1.5"
          >
            <Download size={10} />
            Download
          </button>
          <button className="terminal-btn flex-1 flex items-center justify-center gap-1.5 text-[10px] py-1.5">
            <ExternalLink size={10} />
            Docs
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== INSTALLATION GUIDE TABS ===== */

function InstallationGuide() {
  const [activeTab, setActiveTab] = useState<'minecraft' | 'unity' | 'unreal' | 'node'>('minecraft')

  const tabs = [
    { id: 'minecraft' as const, label: 'Minecraft', icon: '⛏️' },
    { id: 'unity' as const, label: 'Unity', icon: '🎮' },
    { id: 'unreal' as const, label: 'Unreal', icon: '🎯' },
    { id: 'node' as const, label: 'Node.js', icon: '📦' },
  ]

  const prerequisites: Record<string, string[]> = {
    minecraft: ['Java 17+', 'Bukkit/Spigot 1.19+', 'De-Shop API Key'],
    unity: ['Unity 2021.3+', '.NET Standard 2.1', 'De-Shop API Key'],
    unreal: ['Unreal Engine 5.0+', 'C++ Build Tools', 'De-Shop API Key'],
    node: ['Node.js 18+', 'npm/bun/pnpm', 'De-Shop API Key'],
  }

  const installCommands: Record<string, string> = {
    minecraft: `$ # Download the plugin JAR\n$ wget https://plugins.deshop.dev/minecraft/deshop-plugin-2.1.0.jar\n\n$ # Move to server plugins\n$ mv deshop-plugin-2.1.0.jar /server/plugins/\n\n$ # Edit configuration\n$ nano /server/plugins/DeShop/config.yml\n\n$ # Restart server\n$ ./restart.sh`,
    unity: `$ # Open Unity Package Manager\n$ # Window > Package Manager > + > Add from git URL\n\n$ # Paste the repository URL\n> https://github.com/deshop-sdk/unity-package.git#v1.8.0\n\n$ # Configure in Project Settings\n$ # Edit > Project Settings > De-Shop SDK\n$ # Enter your API key and select network`,
    unreal: `$ # Clone into your project plugins\n$ cd YourProject/Plugins\n$ git clone https://github.com/deshop-sdk/unreal-plugin.git DeShopSDK\n$ git checkout v1.3.0\n\n$ # Regenerate project files\n$ ./GenerateProjectFiles.sh\n\n$ # Build the project\n$ make\n\n$ # Enable plugin in Edit > Plugins > De-Shop`,
    node: `$ # Install the package\n$ npm install @deshop/sdk\n# or\n$ bun add @deshop/sdk\n\n$ # Create config file\n$ echo 'DESHOP_API_KEY=your-key' > .env\n\n$ # Import and initialize\n$ node -e "const { DeShopSDK } = require('@deshop/sdk'); \\nconsole.log('SDK loaded!')"`,
  }

  return (
    <div className="terminal-card">
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">installation_guide.sh</span>
      </div>
      <div className="terminal-card-body space-y-4">
        <div className="text-term-green font-bold text-sm"># Installation Guide</div>

        {/* Tab buttons */}
        <div className="flex gap-1 border-b border-term">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-[11px] transition-colors border-b-2 ${
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* Prerequisites */}
            <div>
              <div className="text-xs text-term-amber font-bold mb-2">Prerequisites</div>
              <div className="space-y-1">
                {prerequisites[activeTab]?.map((req) => (
                  <div key={req} className="flex items-center gap-2 text-[11px]">
                    <span className="text-term-green">☑</span>
                    <span className="text-term-text">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Install Commands */}
            <div>
              <div className="text-xs text-term-amber font-bold mb-2">Installation Steps</div>
              <div className="bg-[#1a1a1a] border border-term rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1 bg-term-elevated border-b border-term">
                  <span className="text-[10px] text-term-dim">bash</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(installCommands[activeTab] || '')
                    }}
                    className="text-[9px] px-1.5 py-0.5 bg-term-elevated border border-term rounded-sm text-term-dim hover:text-term-green transition-colors flex items-center gap-1"
                  >
                    <Download size={8} />
                    [COPY]
                  </button>
                </div>
                <pre className="p-3 text-[11px] text-term-green leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {installCommands[activeTab]}
                </pre>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ===== CONTRIBUTE SECTION ===== */

function ContributeSection() {
  return (
    <div className="terminal-card">
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">contribute.md</span>
      </div>
      <div className="terminal-card-body space-y-3">
        <div className="text-term-green font-bold text-sm"># Contribute</div>
        <div className="text-xs text-term-text leading-relaxed">
          All De-Shop plugins are open-source. We welcome contributions from the community!
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {/* GitHub */}
          <div className="border border-term rounded-sm p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Github size={14} className="text-term-text" />
              <span className="text-xs text-term-cyan font-bold">GitHub Repository</span>
            </div>
            <div className="text-[11px] text-term-dim">
              Browse source code, report issues, and submit pull requests.
            </div>
            <a
              href="https://github.com/deshop-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="terminal-btn text-[10px] inline-flex items-center gap-1.5"
            >
              <ExternalLink size={10} />
              github.com/deshop-sdk
            </a>
          </div>

          {/* Plugin Template */}
          <div className="border border-term rounded-sm p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Puzzle size={14} className="text-term-magenta" />
              <span className="text-xs text-term-magenta font-bold">Plugin Template</span>
            </div>
            <div className="text-[11px] text-term-dim">
              Start building your own plugin from our official template.
            </div>
            <div className="bg-[#1a1a1a] border border-term rounded-sm p-2 mt-1">
              <pre className="text-[10px] text-term-green overflow-x-auto">
{`$ npx @deshop/create-plugin my-plugin
$ cd my-plugin
$ npm install
$ npm run dev`}
              </pre>
            </div>
          </div>
        </div>

        {/* Development Setup */}
        <div className="mt-3">
          <div className="text-xs text-term-amber font-bold mb-2">Development Setup</div>
          <div className="bg-[#1a1a1a] border border-term rounded-sm p-3">
            <pre className="text-[10px] text-term-green overflow-x-auto whitespace-pre-wrap">
{`$ # Clone the monorepo
$ git clone https://github.com/deshop-sdk/monorepo.git
$ cd monorepo

$ # Install dependencies
$ npm install

$ # Build all packages
$ npm run build

$ # Run tests
$ npm run test

$ # Start development
$ npm run dev`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== API FETCH HELPERS ===== */

interface ApiPlugin {
  id: string
  name: string
  description: string
  version: string
  engine: string
  language: string
  status: string
  downloads: number
  rating: number
  fileSize: string
  checksum: string
  sourceUrl: string
  fileUrl: string
  createdAt: string
  updatedAt: string
}

const ENGINE_TO_PLATFORM: Record<string, string> = {
  minecraft: 'Bukkit/Spigot',
  unity: 'Unity 2021+',
  unreal: 'UE5',
  web: 'Node.js',
}

const ENGINE_TO_TAGS: Record<string, string[]> = {
  minecraft: ['Game Engine', 'Java', 'Minecraft', 'Server Plugin'],
  unity: ['Game Engine', 'C#', 'Unity', 'Package'],
  unreal: ['Game Engine', 'C++', 'Unreal', 'Plugin'],
  web: ['Bridge', 'TypeScript', 'Node.js', 'Web3'],
}

function mapApiPlugin(p: ApiPlugin, index: number): Plugin {
  const statusMap: Record<string, 'Stable' | 'Beta' | 'Alpha'> = {
    stable: 'Stable',
    beta: 'Beta',
    alpha: 'Alpha',
  }
  const engine = p.engine || 'web'
  return {
    id: `api-${index}`,
    name: p.name,
    description: p.description,
    version: p.version,
    language: p.language,
    platform: ENGINE_TO_PLATFORM[engine] || p.language,
    status: statusMap[p.status.toLowerCase()] || 'Stable',
    downloads: p.downloads,
    rating: p.rating,
    lastUpdated: p.updatedAt ? p.updatedAt.split('T')[0] : '',
    tags: ENGINE_TO_TAGS[engine] || [p.language, engine],
    size: p.fileSize || '',
    checksum: p.checksum || '',
    featured: index === 0,
  }
}

/* ===== MAIN PLUGINS PAGE ===== */

export default function PluginsPage() {
  const [downloadingPlugin, setDownloadingPlugin] = useState<Plugin | null>(null)
  const [apiPlugins, setApiPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setApiPlugins(data.map(mapApiPlugin))
        }
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const displayPlugins = apiPlugins.length > 0 ? apiPlugins : PLUGINS
  const featuredPlugin = displayPlugins.find((p) => p.featured) || displayPlugins[0]
  const otherPlugins = displayPlugins.filter((p) => p !== featuredPlugin)

  return (
    <div className="space-y-4">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">plugins@de-shop:~/plugins</span>
        </div>
        <div className="terminal-card-body space-y-6">
          {/* Page Title */}
          <div className="flex items-center gap-2 mb-2">
            <Puzzle size={16} className="text-term-magenta" />
            <span className="text-sm text-term-magenta glow-magenta font-bold">Plugin Marketplace</span>
            <span className="text-term-dim text-xs">— {displayPlugins.length} plugins available</span>
            {loading && <span className="text-term-amber text-[10px] font-terminal animate-pulse">[fetching plugins...]</span>}
          </div>

          {/* Featured Plugin */}
          <FeaturedPlugin plugin={featuredPlugin} onDownload={setDownloadingPlugin} />

          {/* Plugin Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="prompt-prefix text-xs">$</span>
              <span className="text-xs text-term-text">ls -la ~/plugins/</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherPlugins.map((plugin, i) => (
                <motion.div
                  key={plugin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <PluginCard plugin={plugin} onDownload={setDownloadingPlugin} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Installation Guide */}
          <InstallationGuide />

          {/* Contribute */}
          <ContributeSection />
        </div>
      </div>

      {/* Download Modal */}
      <AnimatePresence>
        {downloadingPlugin && (
          <DownloadModal
            plugin={downloadingPlugin}
            onClose={() => setDownloadingPlugin(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
