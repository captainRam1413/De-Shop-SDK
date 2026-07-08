/**
 * De-Shop SDK — Premium Game Showcase
 * ═══════════════════════════════════
 * Refactored to use shared Zustand store and SDK context.
 * Premium glassmorphism UI with Framer Motion animations.
 */

import { useCallback, useEffect, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import GameArena from './GameArena'
import SkinCard from './SkinCard.premium'
import GameDemo from './GameDemo'
import { useSDK } from '../context/SDKProvider'
import { useDeShopStore, type ActivePage } from '../store/useDeShopStore'
import { skinIntelligence, type SkinAnalysis } from '../sdk/SkinIntelligence'
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  TransactionFailedError,
} from '../sdk/errors'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Backpack,
  Store,
  Cloud,
  Sparkles,
  Package,
  Search,
  Loader2,
} from 'lucide-react'

type Tab = 'inventory' | 'market' | 'steam_inventory'

export default function GameShowcase() {
  const { wallets, activeAddress } = useWallet()
  const { sdk, isConnected } = useSDK()
  const store = useDeShopStore()

  // Derive tab from active page
  const tab: Tab = store.activePage === 'market' ? 'market'
    : store.activePage === 'inventory' ? 'inventory'
    : store.activePage === 'profile' ? 'steam_inventory'
    : 'inventory'

  // Parse Steam login callback from hash
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('steam_id=')) {
      const params = new URLSearchParams(hash.substring(1))
      const steamId = params.get('steam_id')
      if (steamId) {
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/auth/steam/profile/${steamId}`)
          .then(res => res.json())
          .then(data => {
            if (data.profile) store.setSteamProfile(data.profile)
          })
          .catch(err => console.error("Failed to fetch steam profile:", err))
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const refreshSteamInventory = useCallback(async () => {
    if (!store.steamProfile) return
    store.setStatus('Loading Steam Inventory...')
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/steam/inventory/${store.steamProfile.steamid}`)
      const data = await res.json()
      store.setSteamItems(data.items || [])
      store.setStatus(`✓ Loaded ${data.items?.length || 0} Steam items`)
    } catch (e) {
      console.error(e)
      store.setStatus('✗ Failed to load Steam Inventory')
    }
  }, [store.steamProfile])

  useEffect(() => {
    if (tab === 'steam_inventory') refreshSteamInventory()
  }, [tab, refreshSteamInventory])

  // Skin Intelligence analysis
  const analysis: SkinAnalysis | null = useMemo(() => {
    if (!store.analyzedAsset) return null
    return skinIntelligence.analyzeFromAsset(store.analyzedAsset)
  }, [store.analyzedAsset])

  // Error handler
  const handleErrorDisplay = (e: any) => {
    if (e instanceof WalletNotConnectedError) {
      store.setStatus('✗ Please connect your wallet first.')
      store.setShowWalletModal(true)
    } else if (e instanceof InsufficientFundsError) {
      store.setStatus(`✗ Insufficient funds. Need ${e.required} μALGO.`)
    } else if (e instanceof TransactionFailedError) {
      store.setStatus(`✗ TX Failed: ${e.message}`)
    } else if (e instanceof DeShopError) {
      store.setStatus(`✗ ${e.message}`)
    } else {
      store.setStatus(`✗ Error: ${e.message || 'Unknown error'}`)
    }
  }

  const handleMint = async () => {
    if (!activeAddress || store.isMinting) return
    store.setIsMinting(true)
    store.setStatus('Minting NFT on Algorand TestNet...')
    try {
      const name = store.mintName || `Neon-${Math.floor(Math.random() * 9999)}`
      await sdk.mintNFT({ wallet: activeAddress, skin_name: name, rarity: store.mintRarity, skin_type: store.mintType })
      store.setMintName('')
    } catch (e: any) {
      handleErrorDisplay(e)
    } finally {
      store.setIsMinting(false)
    }
  }

  const handleBatchMint = async () => {
    if (!activeAddress || store.isMinting) return
    store.setIsMinting(true)
    store.setStatus('Batch minting 3 Operator Skins...')
    try {
      await sdk.batchMint([
        { wallet: activeAddress, skin_name: 'Ghost Op (Desert)', rarity: 'epic', skin_type: 'character' },
        { wallet: activeAddress, skin_name: 'Ghost Op (Winter)', rarity: 'rare', skin_type: 'character' },
        { wallet: activeAddress, skin_name: 'Ghost Op (Night)', rarity: 'legendary', skin_type: 'character' }
      ])
    } catch (e: any) {
      handleErrorDisplay(e)
    } finally {
      store.setIsMinting(false)
    }
  }

  const handleEquip = (asset: any) => {
    const a = skinIntelligence.analyzeFromAsset(asset)
    if (a.type === 'gun_skin') store.setActiveGunSkin(asset)
    else store.setActiveCharSkin(asset)
    store.setAnalyzedAsset(asset)
    store.setShowAnalysis(true)
    const typeEmoji = a.type === 'gun_skin' ? '🔫' : a.type === 'character_skin' ? '🧑' : '✨'
    store.setStatus(`${typeEmoji} Equipped "${asset.name}" — ${a.game_mapping.category} [${a.rarity_score}/10]`)
  }

  const handleList = async (asset: any) => {
    if (!activeAddress) return
    store.setStatus(`Listing "${asset.name}" on marketplace...`)
    try {
      const ai = await sdk.getSuggestedPrice(asset.name, asset.rarity)
      await sdk.listAsset(activeAddress, asset.asa_id ?? asset.id, ai.price)
    } catch (e: any) {
      handleErrorDisplay(e)
    }
  }

  const handleBuy = async (asset: any) => {
    if (!activeAddress) return
    store.setStatus(`Buying "${asset.name}"...`)
    try {
      await sdk.buyAsset(activeAddress, asset.asa_id ?? asset.id)
    } catch (e: any) {
      handleErrorDisplay(e)
    }
  }

  const handleWithdraw = async (asset: any) => {
    if (!activeAddress || !store.steamProfile) {
      store.setStatus('✗ Connect your wallet and Steam account first.')
      return
    }
    store.setStatus(`Withdrawing "${asset.name}" to Steam...`)
    try {
      await sdk.steamWithdraw(activeAddress, store.steamProfile.steamid, asset.asa_id ?? asset.id)
      store.setStatus(`✓ Withdrawn "${asset.name}" to Steam!`)
    } catch (e: any) {
      handleErrorDisplay(e)
    }
  }

  const setActiveTab = (t: Tab) => {
    if (t === 'market') store.setActivePage('market')
    else if (t === 'steam_inventory') store.setActivePage('profile')
    else store.setActivePage('inventory')
  }

  return (
    <div className="showcase">
      <div className="showcase__main">
        {/* Left: Game Arena */}
        <div className="showcase__arena-col">
          <div className="showcase__arena-header">
            <span>🎮 3D Arena</span>
            <span className="showcase__arena-hint">
              {analysis
                ? `${analysis.type === 'gun_skin' ? '⚔ Weapon Equipped' : analysis.type === 'character_skin' ? '🧑 Character Equipped' : '✨ Accessory Equipped'}`
                : 'WASD to move — click to attack'}
            </span>
          </div>
          <div className="showcase__arena-wrap">
            <GameArena activeGunSkin={store.activeGunSkin} activeCharSkin={store.activeCharSkin} />
          </div>

          {/* Analysis Panel */}
          <AnimatePresence>
            {analysis && store.showAnalysis && (
              <motion.div
                className="showcase__analysis premium-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="showcase__analysis-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles className="h-3 w-3" style={{ color: 'var(--purple-bright)' }} />
                    SKIN INTELLIGENCE
                  </span>
                  <button className="showcase__analysis-close" onClick={() => store.setShowAnalysis(false)}>×</button>
                </div>
                <div className="showcase__analysis-body">
                  <div className="showcase__analysis-grid">
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">TYPE</div>
                      <div className="sia-value sia-type">
                        {analysis.type === 'gun_skin' ? '🔫 Gun Skin' : analysis.type === 'character_skin' ? '🧑 Character' : '✨ Accessory'}
                      </div>
                    </div>
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">GAME</div>
                      <div className="sia-value">{analysis.game_mapping.category}</div>
                    </div>
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">RARITY</div>
                      <div className="sia-value">
                        <span className="sia-score-bar">
                          {'█'.repeat(Math.round(analysis.rarity_score))}{'░'.repeat(10 - Math.round(analysis.rarity_score))}
                        </span>
                        <span className="sia-score-num">{analysis.rarity_score}/10</span>
                      </div>
                    </div>
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">PRICE</div>
                      <div className="sia-value sia-price">{analysis.suggested_price} μALGO</div>
                    </div>
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">CONFIDENCE</div>
                      <div className="sia-value">{analysis.confidence}%</div>
                    </div>
                    <div className="sia-item premium-card" style={{ padding: '6px 8px' }}>
                      <div className="sia-label">STYLE</div>
                      <div className="sia-value">{analysis.visual_style}</div>
                    </div>
                  </div>
                  <div className="sia-tags">
                    {analysis.tags.map((tag: string) => (
                      <span key={tag} className="premium-chip" style={{ fontSize: 9, padding: '2px 7px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weapon Preview */}
          {(!analysis || !store.showAnalysis) && store.analyzedAsset && (
            <div className="showcase__weapon-wrap">
              <GameDemo activeSkin={store.analyzedAsset} />
            </div>
          )}
        </div>

        {/* Right: Panel */}
        <div className="showcase__panel-col">
          {/* Tabs */}
          <div className="showcase__tabs">
            {[
              { id: 'inventory' as Tab, label: 'Inventory', icon: <Backpack className="h-3 w-3" />, count: store.inventory.length },
              { id: 'market' as Tab, label: 'Market', icon: <Store className="h-3 w-3" />, count: store.market.length },
              ...(store.steamProfile ? [{ id: 'steam_inventory' as Tab, label: 'Steam', icon: <Cloud className="h-3 w-3" />, count: store.steamItems.length || 0 }] : []),
            ].map((t) => (
              <button
                key={t.id}
                className={`showcase__tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                {t.icon}
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Mint Bar */}
          {activeAddress && tab === 'inventory' && (
            <div className="showcase__mint-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
              <input
                className="premium-input"
                placeholder="e.g. Dragon Flame AK"
                value={store.mintName}
                onChange={(e) => store.setMintName(e.target.value)}
                style={{ fontSize: 11, width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                <select className="premium-select" value={store.mintRarity} onChange={(e) => store.setMintRarity(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
                <select className="premium-select" value={store.mintType} onChange={(e) => store.setMintType(e.target.value as any)} style={{ flex: 1, fontSize: 11 }}>
                  <option value="weapon">Weapon</option>
                  <option value="character">Character</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                <button className="premium-btn premium-btn--sm premium-btn--green" onClick={handleMint} disabled={store.isMinting} style={{ flex: 1, justifyContent: 'center' }}>
                  {store.isMinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Mint
                </button>
                <button className="premium-btn premium-btn--sm premium-btn--cyan" onClick={handleBatchMint} disabled={store.isMinting} title="Batch Mint 3 Skins" style={{ flex: 1, justifyContent: 'center' }}>
                  <Package className="h-3 w-3" />
                  Batch
                </button>
              </div>
            </div>
          )}

          {/* Market Filter */}
          {activeAddress && tab === 'market' && (
            <div className="showcase__mint-bar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Search className="h-3 w-3" style={{ color: 'var(--cyan-bright)', flexShrink: 0 }} />
              <select className="premium-select" value={store.marketFilter} onChange={(e) => store.setMarketFilter(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
                <option value="">Any Rarity</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          )}

          {/* Card Grid */}
          <div className="showcase__cards">
            {!activeAddress && (
              <div className="premium-empty-state">
                <div className="premium-empty-state__icon" style={{ animation: 'float 3s ease-in-out infinite' }}>🔗</div>
                <div className="premium-empty-state__title">Connect Your Wallet</div>
                <div className="premium-empty-state__desc">Connect your Pera Wallet to get started</div>
              </div>
            )}

            {activeAddress && tab === 'inventory' && store.inventory.length === 0 && (
              <div className="premium-empty-state">
                <div className="premium-empty-state__icon" style={{ animation: 'float 3s ease-in-out infinite' }}>🎮</div>
                <div className="premium-empty-state__title">No Skins Yet</div>
                <div className="premium-empty-state__desc">Try minting "Dragon Flame AK" as Legendary ↑</div>
              </div>
            )}

            <AnimatePresence>
              {activeAddress && tab === 'inventory' && store.inventory.map((asset) => (
                <SkinCard
                  key={asset.asa_id ?? asset.id}
                  asset={asset}
                  isActive={store.activeGunSkin?.id === asset.id || store.activeCharSkin?.id === asset.id}
                  onEquip={handleEquip}
                  onList={handleList}
                  onWithdraw={store.steamProfile ? handleWithdraw : undefined}
                  mode="inventory"
                />
              ))}
            </AnimatePresence>

            {activeAddress && tab === 'market' && store.market.length === 0 && (
              <div className="premium-empty-state">
                <div className="premium-empty-state__icon" style={{ animation: 'float 3s ease-in-out infinite' }}>🏪</div>
                <div className="premium-empty-state__title">No Active Listings</div>
                <div className="premium-empty-state__desc">No listings found for the current filter.</div>
              </div>
            )}

            <AnimatePresence>
              {activeAddress && tab === 'market' && store.market.map((asset) => (
                <SkinCard
                  key={asset.asa_id ?? asset.id}
                  asset={asset}
                  isActive={false}
                  onEquip={handleEquip}
                  onBuy={handleBuy}
                  mode="market"
                />
              ))}
            </AnimatePresence>

            {activeAddress && tab === 'steam_inventory' && store.steamItems.length === 0 && (
              <div className="premium-empty-state">
                <div className="premium-empty-state__icon" style={{ animation: 'float 3s ease-in-out infinite' }}>♨️</div>
                <div className="premium-empty-state__title">No Steam Items</div>
                <div className="premium-empty-state__desc">No marketable items found in your Steam Inventory.</div>
                <button className="premium-btn premium-btn--sm" onClick={refreshSteamInventory}>
                  Reload Steam
                </button>
              </div>
            )}

            {activeAddress && tab === 'steam_inventory' && store.steamItems.map((item: any) => (
              <div key={item.asset_id} className="skin-card premium-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ textAlign: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={item.icon_url} className="skin-card__image" alt={item.name} style={{ maxHeight: '100px' }} />
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ color: '#fff', fontSize: 14, marginBottom: 8, fontWeight: 600 }}>{item.name}</div>
                  <span className="premium-badge premium-badge--rarity" style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    fontSize: 9, 
                    padding: '1px 6px',
                    borderRadius: 3,
                    fontWeight: 700,
                  }}>
                    {item.rarity?.toUpperCase() || 'COMMON'}
                  </span>
                </div>
                <div style={{ padding: '0 10px 10px' }}>
                  <button
                    className="premium-btn premium-btn--sm"
                    style={{ width: '100%', background: 'rgba(23,26,33,0.6)', borderColor: '#171a21', color: 'white', justifyContent: 'center' }}
                    onClick={async () => {
                      if (!activeAddress) return
                      store.setStatus(`Sending Steam Trade Offer for ${item.name}...`)
                      try {
                        await sdk.steamEscrow(activeAddress, store.steamProfile.steamid, item.name, item.rarity)
                        store.setStatus(`✓ Successfully Escrowed ${item.name}!`)
                        setActiveTab('inventory')
                        refreshSteamInventory()
                      } catch (e: any) {
                        handleErrorDisplay(e)
                      }
                    }}
                  >
                  <Cloud className="h-3 w-3" />
                    ESCROW & MINT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
