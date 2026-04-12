import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import GameArena from './GameArena'
import SkinCard from './SkinCard'
import WalletModal from './WalletModal'
import GameDemo from './GameDemo'
import { DeShopSDK, type Asset } from '../sdk/DeShopSDK'

const sdk = new DeShopSDK(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000')

type Tab = 'inventory' | 'market' | 'terminal'

export default function GameShowcase() {
  const { wallets, activeAddress, transactionSigner, activeWallet } = useWallet()

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [inventory, setInventory] = useState<Asset[]>([])
  const [market, setMarket] = useState<Asset[]>([])
  const [activeSkin, setActiveSkin] = useState<Asset | null>(null)
  const [tab, setTab] = useState<Tab>('inventory')
  const [status, setStatus] = useState('')
  const [isMinting, setIsMinting] = useState(false)
  const [mintName, setMintName] = useState('')
  const [mintRarity, setMintRarity] = useState('rare')

  // Sync wallet signer with SDK
  useEffect(() => {
    sdk.setWalletSigner(activeAddress ?? null, transactionSigner ?? null)
  }, [activeAddress, transactionSigner])

  const refreshInventory = useCallback(async () => {
    if (!activeAddress) return
    try {
      const items = await sdk.getPlayerAssets(activeAddress)
      setInventory(items)
    } catch (e) {
      console.error(e)
    }
  }, [activeAddress])

  const refreshMarket = useCallback(async () => {
    try {
      const data = await sdk.getMarketplace()
      setMarket(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Load data on connect
  useEffect(() => {
    if (activeAddress) {
      refreshInventory()
      refreshMarket()
    }
  }, [activeAddress, refreshInventory, refreshMarket])

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMarket()
      if (activeAddress) refreshInventory()
    }, 5000)
    return () => clearInterval(interval)
  }, [activeAddress, refreshInventory, refreshMarket])

  const handleMint = async () => {
    if (!activeAddress || isMinting) return
    setIsMinting(true)
    setStatus('Minting NFT on Algorand TestNet...')
    try {
      const name = mintName || `Neon-${Math.floor(Math.random() * 9999)}`
      const asset = await sdk.mintNFT({
        wallet: activeAddress,
        skin_name: name,
        rarity: mintRarity,
      })
      setStatus(`✓ Minted "${asset.name}" [${asset.rarity.toUpperCase()}] — ASA #${asset.asa_id}`)
      setMintName('')
      await refreshInventory()
    } catch (e: any) {
      setStatus(`✗ ${e.message}`)
    } finally {
      setIsMinting(false)
    }
  }

  const handleEquip = (asset: Asset) => {
    setActiveSkin(asset)
    setStatus(`Equipped "${asset.name}" [${asset.rarity.toUpperCase()}]`)
  }

  const handleList = async (asset: Asset) => {
    if (!activeAddress) return
    setStatus(`Listing "${asset.name}" on marketplace...`)
    try {
      const ai = await sdk.getSuggestedPrice(asset.name, asset.rarity)
      await sdk.listAsset(activeAddress, asset.asa_id ?? asset.id, ai.price)
      setStatus(`✓ Listed "${asset.name}" at ${ai.price} μALGO`)
      await refreshInventory()
      await refreshMarket()
    } catch (e: any) {
      setStatus(`✗ ${e.message}`)
    }
  }

  const handleBuy = async (asset: Asset) => {
    if (!activeAddress) return
    setStatus(`Buying "${asset.name}"...`)
    try {
      await sdk.buyAsset(activeAddress, asset.asa_id ?? asset.id)
      setStatus(`✓ Purchased "${asset.name}" — now in your wallet!`)
      await refreshInventory()
      await refreshMarket()
    } catch (e: any) {
      setStatus(`✗ ${e.message}`)
    }
  }

  const addr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : null

  return (
    <div className="showcase">
      {/* ─── Top Bar ─── */}
      <header className="showcase__header">
        <div className="showcase__brand">
          <div className="showcase__logo">⬡</div>
          <div>
            <div className="showcase__title">DE-SHOP SDK</div>
            <div className="showcase__subtitle">AI-Powered NFT Marketplace on Algorand</div>
          </div>
        </div>
        <div className="showcase__header-right">
          <div className="showcase__net-badge">
            <span className="showcase__net-dot" />
            TESTNET
          </div>
          {activeAddress ? (
            <div className="showcase__wallet-info">
              <span className="showcase__addr">{addr}</span>
              <button className="showcase__disconnect" onClick={() => activeWallet?.disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="showcase__connect-btn" onClick={() => setShowWalletModal(true)}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* ─── Main ─── */}
      <div className="showcase__main">
        {/* Left: Game Arena */}
        <div className="showcase__arena-col">
          <div className="showcase__arena-header">
            <span>🎮 LIVE GAME PREVIEW</span>
            <span className="showcase__arena-hint">WASD to move — SPACE to attack</span>
          </div>
          <div className="showcase__arena-wrap">
            <GameArena activeSkin={activeSkin} />
          </div>
          <div className="showcase__weapon-wrap">
            <GameDemo activeSkin={activeSkin} />
          </div>
        </div>

        {/* Right: Panel */}
        <div className="showcase__panel-col">
          {/* Tabs */}
          <div className="showcase__tabs">
            <button className={`showcase__tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
              🎒 Inventory ({inventory.length})
            </button>
            <button className={`showcase__tab ${tab === 'market' ? 'active' : ''}`} onClick={() => setTab('market')}>
              🏪 Market ({market.length})
            </button>
          </div>

          {/* Mint Bar */}
          {activeAddress && tab === 'inventory' && (
            <div className="showcase__mint-bar">
              <input
                className="showcase__mint-input"
                placeholder="Skin name..."
                value={mintName}
                onChange={(e) => setMintName(e.target.value)}
              />
              <select
                className="showcase__mint-select"
                value={mintRarity}
                onChange={(e) => setMintRarity(e.target.value)}
              >
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
              <button
                className="showcase__mint-btn"
                onClick={handleMint}
                disabled={isMinting}
              >
                {isMinting ? '⏳ Minting...' : '⚡ Mint NFT'}
              </button>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`showcase__status ${status.startsWith('✓') ? 'success' : status.startsWith('✗') ? 'error' : ''}`}>
              {status}
            </div>
          )}

          {/* Card Grid */}
          <div className="showcase__cards">
            {!activeAddress && (
              <div className="showcase__empty">
                <div className="showcase__empty-icon">🔗</div>
                <div>Connect your Pera Wallet to get started</div>
                <button className="showcase__connect-btn" onClick={() => setShowWalletModal(true)}>
                  Connect Wallet
                </button>
              </div>
            )}

            {activeAddress && tab === 'inventory' && inventory.length === 0 && (
              <div className="showcase__empty">
                <div className="showcase__empty-icon">🎮</div>
                <div>No skins yet! Mint your first NFT above ↑</div>
              </div>
            )}

            {activeAddress && tab === 'inventory' && inventory.map((asset) => (
              <SkinCard
                key={asset.asa_id ?? asset.id}
                asset={asset}
                isActive={activeSkin?.id === asset.id}
                onEquip={handleEquip}
                onList={handleList}
                mode="inventory"
              />
            ))}

            {activeAddress && tab === 'market' && market.length === 0 && (
              <div className="showcase__empty">
                <div className="showcase__empty-icon">🏪</div>
                <div>No active listings</div>
              </div>
            )}

            {activeAddress && tab === 'market' && market.map((asset) => (
              <SkinCard
                key={asset.asa_id ?? asset.id}
                asset={asset}
                isActive={false}
                onEquip={handleEquip}
                onBuy={handleBuy}
                mode="market"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <WalletModal
          wallets={wallets}
          onClose={() => setShowWalletModal(false)}
        />
      )}
    </div>
  )
}
