import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import GameArena from './GameArena'
import SkinCard from './SkinCard'
import WalletModal from './WalletModal'
import GameDemo from './GameDemo'
import { DeShopSDK, type Asset } from '../sdk/DeShopSDK'
import { skinIntelligence, type SkinAnalysis } from '../sdk/SkinIntelligence'
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  TransactionFailedError,
} from '../sdk/errors'

const sdk = new DeShopSDK({
  network: 'testnet',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  debug: true,
})

type Tab = 'inventory' | 'market'

export default function GameShowcase() {
  const { wallets, activeAddress, transactionSigner, activeWallet } = useWallet()

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [inventory, setInventory] = useState<Asset[]>([])
  const [market, setMarket] = useState<Asset[]>([])
  const [activeGunSkin, setActiveGunSkin] = useState<Asset | null>(null)
  const [activeCharSkin, setActiveCharSkin] = useState<Asset | null>(null)
  const [analyzedAsset, setAnalyzedAsset] = useState<Asset | null>(null)
  const [tab, setTab] = useState<Tab>('inventory')
  const [status, setStatus] = useState('')
  const [isMinting, setIsMinting] = useState(false)
  const [mintName, setMintName] = useState('')
  const [mintRarity, setMintRarity] = useState('rare')
  const [mintType, setMintType] = useState<'weapon' | 'character'>('weapon')
  const [marketFilter, setMarketFilter] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)

  // Skin Intelligence analysis of active skin
  const analysis: SkinAnalysis | null = useMemo(() => {
    if (!analyzedAsset) return null
    return skinIntelligence.analyzeFromAsset(analyzedAsset)
  }, [analyzedAsset])

  // Sync wallet signer with SDK
  useEffect(() => {
    sdk.setWalletSigner(activeAddress ?? null, transactionSigner ?? null)
  }, [activeAddress, transactionSigner])

  // Auto-close wallet modal once connected
  useEffect(() => {
    if (activeAddress && showWalletModal) {
      setShowWalletModal(false)
    }
  }, [activeAddress, showWalletModal])

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
      const data = await sdk.getMarketplace(marketFilter ? { rarity: marketFilter } : undefined)
      setMarket(data)
    } catch (e) {
      console.error(e)
    }
  }, [marketFilter])

  // Initial loads and interval
  useEffect(() => {
    if (activeAddress) {
      refreshInventory()
      refreshMarket()
    }
  }, [activeAddress, refreshInventory, refreshMarket])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMarket()
      if (activeAddress) refreshInventory()
    }, 5000)
    return () => clearInterval(interval)
  }, [activeAddress, refreshInventory, refreshMarket])

  // ─── Setup SDK Event Listeners ───
  useEffect(() => {
    const unsubMint = sdk.on('mint', (asset) => {
      setStatus(`✓ Minted "${asset.name}" successfully!`)
      refreshInventory()
    })
    const unsubList = sdk.on('list', (asset) => {
      setStatus(`✓ Listed "${asset.name}" on the marketplace!`)
      refreshInventory()
      refreshMarket()
    })
    const unsubBuy = sdk.on('buy', (result) => {
      setStatus(`✓ Purchased "${result.asset?.name}" successfully!`)
      refreshInventory()
      refreshMarket()
    })
    const unsubError = sdk.on('error', (err) => {
       console.error("SDK Event Error:", err)
    })

    return () => {
      unsubMint()
      unsubList()
      unsubBuy()
      unsubError()
    }
  }, [refreshInventory, refreshMarket])

  // ─── Helper for typed errors ───
  const handleErrorDisplay = (e: any) => {
    if (e instanceof WalletNotConnectedError) {
      setStatus('✗ Please connect your wallet first.')
      setShowWalletModal(true)
    } else if (e instanceof InsufficientFundsError) {
      setStatus(`✗ Insufficient funds. Need ${e.required} μALGO.`)
    } else if (e instanceof TransactionFailedError) {
      setStatus(`✗ TX Failed: ${e.message}`)
    } else if (e instanceof DeShopError) {
      setStatus(`✗ ${e.message}`)
    } else {
      setStatus(`✗ Error: ${e.message || 'Unknown error'}`)
    }
  }

  const handleMint = async () => {
    if (!activeAddress || isMinting) return
    setIsMinting(true)
    setStatus('Minting NFT on Algorand TestNet...')
    try {
      const name = mintName || `Neon-${Math.floor(Math.random() * 9999)}`
      await sdk.mintNFT({ wallet: activeAddress, skin_name: name, rarity: mintRarity, skin_type: mintType })
      setMintName('')
      // State & inventory update handled by the event listener now!
    } catch (e: any) {
      handleErrorDisplay(e)
    } finally {
      setIsMinting(false)
    }
  }

  const handleBatchMint = async () => {
    if (!activeAddress || isMinting) return
    setIsMinting(true)
    setStatus('Batch minting 3 Operator Skins...')
    try {
      await sdk.batchMint([
        { wallet: activeAddress, skin_name: 'Ghost Op (Desert)', rarity: 'epic', skin_type: 'character' },
        { wallet: activeAddress, skin_name: 'Ghost Op (Winter)', rarity: 'rare', skin_type: 'character' },
        { wallet: activeAddress, skin_name: 'Ghost Op (Night)', rarity: 'legendary', skin_type: 'character' }
      ])
      refreshInventory() // Manually refresh as batch triggers individual mint events anyway
    } catch (e: any) {
      handleErrorDisplay(e)
    } finally {
      setIsMinting(false)
    }
  }

  const handleEquip = (asset: Asset) => {
    const a = skinIntelligence.analyzeFromAsset(asset)
    if (a.type === 'gun_skin') setActiveGunSkin(asset)
    else setActiveCharSkin(asset)
    
    setAnalyzedAsset(asset)
    setShowAnalysis(true)
    
    const typeEmoji = a.type === 'gun_skin' ? '🔫' : a.type === 'character_skin' ? '🧑' : '✨'
    setStatus(`${typeEmoji} Equipped "${asset.name}" — ${a.game_mapping.category} [${a.rarity_score}/10]`)
  }

  const handleList = async (asset: Asset) => {
    if (!activeAddress) return
    setStatus(`Listing "${asset.name}" on marketplace...`)
    try {
      const ai = await sdk.getSuggestedPrice(asset.name, asset.rarity)
      await sdk.listAsset(activeAddress, asset.asa_id ?? asset.id, ai.price)
    } catch (e: any) {
      handleErrorDisplay(e)
    }
  }

  const handleBuy = async (asset: Asset) => {
    if (!activeAddress) return
    setStatus(`Buying "${asset.name}"...`)
    try {
      await sdk.buyAsset(activeAddress, asset.asa_id ?? asset.id)
    } catch (e: any) {
      handleErrorDisplay(e)
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
            <span>⛏ MINECRAFT WORLD</span>
            <span className="showcase__arena-hint">
              {analysis
                ? `${analysis.type === 'gun_skin' ? '⚔ WEAPON SKIN' : analysis.type === 'character_skin' ? '🧑 CHARACTER SKIN' : '✨ ACCESSORY'} EQUIPPED`
                : 'Click to play — WASD + Mouse'}
            </span>
          </div>
          <div className="showcase__arena-wrap">
            <GameArena activeGunSkin={activeGunSkin} activeCharSkin={activeCharSkin} />
          </div>

          {/* Analysis Panel — slides up when skin equipped */}
          {analysis && showAnalysis && (
            <div className="showcase__analysis">
              <div className="showcase__analysis-header">
                <span>🧠 SKIN INTELLIGENCE</span>
                <button className="showcase__analysis-close" onClick={() => setShowAnalysis(false)}>×</button>
              </div>
              <div className="showcase__analysis-body">
                <div className="showcase__analysis-grid">
                  <div className="sia-item">
                    <div className="sia-label">TYPE</div>
                    <div className="sia-value sia-type">
                      {analysis.type === 'gun_skin' ? '🔫 Gun Skin' : analysis.type === 'character_skin' ? '🧑 Character' : '✨ Accessory'}
                    </div>
                  </div>
                  <div className="sia-item">
                    <div className="sia-label">GAME</div>
                    <div className="sia-value">{analysis.game_mapping.category}</div>
                  </div>
                  <div className="sia-item">
                    <div className="sia-label">RARITY</div>
                    <div className="sia-value">
                      <span className="sia-score-bar">
                        {'█'.repeat(Math.round(analysis.rarity_score))}{'░'.repeat(10 - Math.round(analysis.rarity_score))}
                      </span>
                      <span className="sia-score-num">{analysis.rarity_score}/10</span>
                    </div>
                  </div>
                  <div className="sia-item">
                    <div className="sia-label">PRICE</div>
                    <div className="sia-value sia-price">{analysis.suggested_price} μALGO</div>
                  </div>
                  <div className="sia-item">
                    <div className="sia-label">CONFIDENCE</div>
                    <div className="sia-value">{analysis.confidence}%</div>
                  </div>
                  <div className="sia-item">
                    <div className="sia-label">STYLE</div>
                    <div className="sia-value">{analysis.visual_style}</div>
                  </div>
                </div>
                <div className="sia-tags">
                  {analysis.tags.map((tag) => (
                    <span key={tag} className="sia-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Weapon Preview — only when no analysis panel */}
          {(!analysis || !showAnalysis) && analyzedAsset && (
            <div className="showcase__weapon-wrap">
              <GameDemo activeSkin={analyzedAsset} />
            </div>
          )}
        </div>

        {/* Right: Panel */}
        <div className="showcase__panel-col">
          <div className="showcase__tabs">
            <button className={`showcase__tab ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>
              🎒 Inventory ({inventory.length})
            </button>
            <button className={`showcase__tab ${tab === 'market' ? 'active' : ''}`} onClick={() => setTab('market')}>
              🏪 Market ({market.length})
            </button>
          </div>

          {activeAddress && tab === 'inventory' && (
            <div className="showcase__mint-bar">
              <input
                className="showcase__mint-input"
                placeholder="e.g. Dragon Flame AK"
                value={mintName}
                onChange={(e) => setMintName(e.target.value)}
              />
              <select className="showcase__mint-select" value={mintRarity} onChange={(e) => setMintRarity(e.target.value)}>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
              <select className="showcase__mint-select" value={mintType} onChange={(e) => setMintType(e.target.value as any)}>
                <option value="weapon">Weapon</option>
                <option value="character">Character</option>
              </select>
              <button className="showcase__mint-btn" onClick={handleMint} disabled={isMinting}>
                {isMinting ? '⏳...' : '⚡ Mint'}
              </button>
              <button className="showcase__mint-btn showcase__mint-btn--alt" onClick={handleBatchMint} disabled={isMinting} title="Showcase Batch Mint API">
                📦 Batch (3)
              </button>
            </div>
          )}

          {activeAddress && tab === 'market' && (
             <div className="showcase__mint-bar">
               <span style={{color: '#8be9fd', fontSize: '11px', flex:1}}>MARKET FILTER:</span>
               <select className="showcase__mint-select" value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
                <option value="">Any Rarity</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
             </div>
          )}

          {status && (
            <div className={`showcase__status ${status.startsWith('✓') ? 'success' : status.startsWith('✗') ? 'error' : ''}`}>
              {status}
            </div>
          )}

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
                <div>No skins yet! Try minting "Dragon Flame AK" as Legendary ↑</div>
              </div>
            )}

            {activeAddress && tab === 'inventory' && inventory.map((asset) => (
              <SkinCard
                key={asset.asa_id ?? asset.id}
                asset={asset}
                isActive={activeGunSkin?.id === asset.id || activeCharSkin?.id === asset.id}
                onEquip={handleEquip}
                onList={handleList}
                mode="inventory"
              />
            ))}

            {activeAddress && tab === 'market' && market.length === 0 && (
              <div className="showcase__empty">
                <div className="showcase__empty-icon">🏪</div>
                <div>No active listings found for the current filter.</div>
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

      {showWalletModal && (
        <WalletModal wallets={wallets} onClose={() => setShowWalletModal(false)} />
      )}
    </div>
  )
}
