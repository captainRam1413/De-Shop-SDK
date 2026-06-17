import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Terminal,
  Shield,
  Coins,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="h-4 w-4" />,
      content: (
        <div>
          <h3>🌌 Welcome to De-Shop SDK</h3>
          <p>
            De-Shop SDK is an advanced, production-grade toolkit designed for game developers to integrate peer-to-peer 
            NFT marketplaces directly into their games. Operating on the <strong>Algorand Blockchain</strong>, it provides 
            unparalleled speed, low transactional gas fees, and instant finality for digital assets.
          </p>
          
          <div className="docs-callout docs-callout--info">
            <strong>Key Benefit:</strong> Players truly own their in-game assets as Algorand Standard Assets (ASAs).
            Escrow smart contracts ensure trustless trading, preventing payment chargebacks or item duplication fraud.
          </div>

          <h4>📦 Installation</h4>
          <p>Install the official SDK package in your Node/React environment:</p>
          <div className="code-block-wrapper">
            <pre><code>npm install de-shop-sdk</code></pre>
            <button className="copy-btn" onClick={() => copyToClipboard('npm install de-shop-sdk', 'install')}>
              {copiedId === 'install' ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <h4>⚡ Quick Initialization</h4>
          <p>Instantiate the client to begin interacting with the Algorand testnet and visual intelligence APIs:</p>
          <div className="code-block-wrapper">
            <pre><code>{`import { DeShopSDK } from 'de-shop-sdk';

const sdk = new DeShopSDK({
  network: 'testnet',
  backendUrl: 'http://localhost:5000',
  debug: true
});`}</code></pre>
            <button className="copy-btn" onClick={() => copyToClipboard(`import { DeShopSDK } from 'de-shop-sdk';\n\nconst sdk = new DeShopSDK({\n  network: 'testnet',\n  backendUrl: 'http://localhost:5000',\n  debug: true\n});`, 'init')}>
              {copiedId === 'init' ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'smart-contracts',
      title: 'Smart Contracts',
      icon: <Shield className="h-4 w-4" />,
      content: (
        <div>
          <h3>🛡 On-Chain Smart Contracts</h3>
          <p>
            The escrow operations are handled by the <code>Deshopsdk</code> smart contract written in <strong>Algorand Python (PuyaPy)</strong>. 
            The compiled TEAL bytecode executes inside the Algorand Virtual Machine (AVM).
          </p>

          <div className="docs-callout docs-callout--warning">
            <strong>Minimum Balance Requirement (MBR):</strong> Opting the contract into a new asset requires 
            holding 0.1 ALGO (100,000 microAlgos) in reserve. This is automatically refunded upon closing the listing box.
          </div>

          <h4>Core ABI Methods</h4>
          
          <div className="api-endpoint-card">
            <span className="api-badge method-setup">SETUP</span>
            <span className="api-name">setupAsset(asset: Asset, mbr_pay: PaymentTransaction)</span>
            <p className="api-desc">Opts the contract into the target NFT so it can act as the escrow manager.</p>
          </div>

          <div className="api-endpoint-card">
            <span className="api-badge method-list">LIST</span>
            <span className="api-name">listAsset(axfer: AssetTransferTransaction, price: UInt64, creator: Address, royalty_bps: UInt64)</span>
            <p className="api-desc">Deposits 1 unit of the NFT asset into trustless escrow and initializes the listing box record.</p>
          </div>

          <div className="api-endpoint-card">
            <span className="api-badge method-buy">BUY</span>
            <span className="api-name">buyAsset(asset: Asset, payment: PaymentTransaction)</span>
            <p className="api-desc">Completes the swap: transfers ALGO to the seller, splits royalties (if applicable) to the creator, and sends the NFT to the buyer.</p>
          </div>

          <div className="api-endpoint-card">
            <span className="api-badge method-cancel">CANCEL</span>
            <span className="api-name">cancelListing(asset: Asset)</span>
            <p className="api-desc">Aborts the sale, returning the escrowed NFT back to the seller and reclaiming the MBR reserve.</p>
          </div>
        </div>
      )
    },
    {
      id: 'ai-pricing',
      title: 'Skin Intelligence',
      icon: <Cpu className="h-4 w-4" />,
      content: (
        <div>
          <h3>🧠 AI Visual Analysis Engine</h3>
          <p>
            De-Shop utilizes a custom machine learning model to classify item attributes, evaluate rarity, 
            and generate optimal pricing recommendations. This maintains stability in game-based barter networks 
            and curbs artificial wash trading.
          </p>

          <h4>Pricing Scarcity Formula</h4>
          <p>The pricing suggestions are calculated by mapping attributes to base weights:</p>
          <div className="math-container">
            {"\\text{Suggested Price} = \\text{Base Price} \\times (1.0 + \\text{Rarity Factor} \\times \\text{Wear Multiplier})"}
          </div>

          <h4>Calling Skin Intelligence</h4>
          <div className="code-block-wrapper">
            <pre><code>{`import { skinIntelligence } from 'de-shop-sdk';

const analysis = skinIntelligence.analyze({
  name: 'Golden Dragon AWP',
  image: 'ipfs://Qm...',
  attributes: {
    weapon: 'AWP',
    rarity: 'legendary',
    effect: 'reactive gold flame',
    style: 'galaxy'
  }
});

console.log(analysis.suggested_price); // e.g., 450 ALGO
console.log(analysis.rarity_score);    // e.g., 9.8 / 10
console.log(analysis.confidence);      // e.g., 94%`}</code></pre>
            <button className="copy-btn" onClick={() => copyToClipboard(`import { skinIntelligence } from 'de-shop-sdk';\n\nconst analysis = skinIntelligence.analyze({\n  name: 'Golden Dragon AWP',\n  image: 'ipfs://Qm...',\n  attributes: {\n    weapon: 'AWP',\n    rarity: 'legendary',\n    effect: 'reactive gold flame',\n    style: 'galaxy'\n  }\n});\n\nconsole.log(analysis.suggested_price);\nconsole.log(analysis.rarity_score);\nconsole.log(analysis.confidence);`, 'ai')}>
              {copiedId === 'ai' ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'live-oracle',
      title: 'Price Oracle',
      icon: <RefreshCw className="h-4 w-4" />,
      content: (
        <div>
          <h3>📊 Real-Time Price Oracle</h3>
          <p>
            For skins originating from traditional marketplaces (such as Steam / CS2), the SDK queries an on-chain 
            price oracle that synchronizes daily with public valuation indexes (e.g. Skinport APIs).
          </p>

          <div className="docs-callout docs-callout--success">
            <strong>Automatic Conversions:</strong> Fiat valuations are converted to ALGO on-the-fly 
            using the Algorand/USD oracle feed.
          </div>

          <h4>Oracle Methods</h4>
          <div className="code-block-wrapper">
            <pre><code>{`// Fetch current market prices
const prices = await sdk.getOraclePrices();

// Get suggested price for a specific item
const itemVal = await sdk.getSuggestedPrice('Butterfly Knife | Fade', 'legendary');
console.log(itemVal.price); // Price in microAlgos
console.log(itemVal.source); // 'skinport_oracle'`}</code></pre>
            <button className="copy-btn" onClick={() => copyToClipboard(`// Fetch current market prices\nconst prices = await sdk.getOraclePrices();\n\n// Get suggested price for a specific item\nconst itemVal = await sdk.getSuggestedPrice('Butterfly Knife | Fade', 'legendary');\nconsole.log(itemVal.price);\nconsole.log(itemVal.source);`, 'oracle')}>
              {copiedId === 'oracle' ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'p2p-trading',
      title: 'P2P Trading Flow',
      icon: <Coins className="h-4 w-4" />,
      content: (
        <div>
          <h3>🔄 End-to-End Trading Flow</h3>
          <p>
            Below is the full transaction sequence to list and purchase an asset using the SDK. Under the hood, 
            the SDK groups transactions into an **atomic transfer group** so that the operations either fail 
            entirely or succeed together.
          </p>

          <h4>Complete Integration Flow</h4>
          <div className="code-block-wrapper">
            <pre><code>{`import { DeShopSDK } from 'de-shop-sdk';

// 1. Connect User Wallet Signer
sdk.connectWallet(activeAddress, walletSigner);

// 2. Mint NFT skin on-chain
const skin = await sdk.mintNFT({
  wallet: activeAddress,
  skin_name: 'Asiimov M4A4',
  rarity: 'epic',
  royalty_bps: 500 // 5.0% royalty fee
});

// 3. List the minted NFT for 25 ALGO
await sdk.listAsset(
  activeAddress,
  skin.asa_id,
  25 * 1_000_000 // Price in microAlgos
);

console.log('Successfully escrowed and listed!');`}</code></pre>
            <button className="copy-btn" onClick={() => copyToClipboard(`import { DeShopSDK } from 'de-shop-sdk';\n\nsdk.connectWallet(activeAddress, walletSigner);\n\nconst skin = await sdk.mintNFT({\n  wallet: activeAddress,\n  skin_name: 'Asiimov M4A4',\n  rarity: 'epic',\n  royalty_bps: 500\n});\n\nawait sdk.listAsset(\n  activeAddress,\n  skin.asa_id,\n  25 * 1_000_000\n);\n\nconsole.log('Successfully escrowed and listed!');`, 'trade')}>
              {copiedId === 'trade' ? <Check className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )
    }
  ]

  const currentSection = sections.find(s => s.id === activeSection) ?? sections[0]

  return (
    <div className="macos-window-container">
      {/* macOS Window */}
      <div className="macos-window">
        {/* Title bar */}
        <div className="macos-window__titlebar">
          <div className="macos-window__traffic-lights">
            <div className="macos-window__traffic-light macos-window__traffic-light--red" />
            <div className="macos-window__traffic-light macos-window__traffic-light--yellow" />
            <div className="macos-window__traffic-light macos-window__traffic-light--green" />
          </div>
          <div className="macos-window__title">
            <Terminal className="h-3.5 w-3.5 mr-1.5 opacity-60" />
            De-Shop SDK Documentation
          </div>
        </div>

        {/* Window Body */}
        <div className="macos-window__body">
          {/* Docs Navigation Sidebar */}
          <div className="macos-window__sidebar">
            <div className="sidebar-group-title">REFERENCE</div>
            <div className="sidebar-menu">
              {sections.map(section => (
                <button
                  key={section.id}
                  className={`sidebar-menu-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="sidebar-menu-item-icon">{section.icon}</span>
                  <span className="sidebar-menu-item-label">{section.title}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
                  )}
                </button>
              ))}
            </div>

            <div className="sidebar-group-title" style={{ marginTop: 24 }}>HELP & RESOURCES</div>
            <div className="sidebar-menu">
              <a
                href="https://github.com/captainRam1413/De-Shop-SDK"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-menu-item sidebar-menu-item--link"
              >
                <span className="sidebar-menu-item-icon"><ExternalLink className="h-4 w-4" /></span>
                <span className="sidebar-menu-item-label">GitHub Repository</span>
              </a>
              <a
                href="https://www.npmjs.com/package/de-shop-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-menu-item sidebar-menu-item--link"
              >
                <span className="sidebar-menu-item-icon"><ExternalLink className="h-4 w-4" /></span>
                <span className="sidebar-menu-item-label">NPM Package Page</span>
              </a>
            </div>
          </div>

          {/* Docs Content Area */}
          <div className="macos-window__content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="docs-article"
              >
                {currentSection.content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
