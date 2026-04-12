import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import GameDemo from './GameDemo'
import WalletModal from './WalletModal'
import { DeShopSDK, type Asset } from '../sdk/DeShopSDK'

const sdk = new DeShopSDK(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000')

type LogLine = {
  id: number
  text: string
  type?: 'command' | 'error' | 'success' | 'ai' | 'system'
}

const BANNER = [
  '',
  '  ██████╗ ███████╗    ███████╗██╗  ██╗ ██████╗ ██████╗',
  '  ██╔══██╗██╔════╝    ██╔════╝██║  ██║██╔═══██╗██╔══██╗',
  '  ██║  ██║█████╗█████╗███████╗███████║██║   ██║██████╔╝',
  '  ██║  ██║██╔══╝╚════╝╚════██║██╔══██║██║   ██║██╔═══╝',
  '  ██████╔╝███████╗    ███████║██║  ██║╚██████╔╝██║',
  '  ╚═════╝ ╚══════╝    ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝',
  '',
  '  AI-Powered Decentralized Game Marketplace on Algorand',
  '  ─────────────────────────────────────────────────────',
  '  Type "help" for available commands',
  '',
]

export default function TerminalConsole() {
  const { wallets, activeAddress, transactionSigner, activeWallet } = useWallet()

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>(
    BANNER.map((text, i) => ({ id: i + 1, text, type: 'system' as const })),
  )
  const [command, setCommand] = useState('')
  const [inventory, setInventory] = useState<Asset[]>([])
  const [market, setMarket] = useState<Asset[]>([])
  const [activeSkin, setActiveSkin] = useState<Asset | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const nextId = useRef(BANNER.length + 2)
  const terminalEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Sync wallet signer with SDK
  useEffect(() => {
    sdk.setWalletSigner(activeAddress ?? null, transactionSigner ?? null)
  }, [activeAddress, transactionSigner])

  const push = useCallback((text: string, type?: LogLine['type']) => {
    setLogs((prev) => [...prev, { id: nextId.current++, text, type }])
  }, [])

  const refreshMarket = useCallback(async () => {
    try {
      const data = await sdk.getMarketData()
      setMarket(data.marketplace)
      return data.marketplace
    } catch {
      return []
    }
  }, [])

  const refreshInventory = useCallback(
    async (wallet: string) => {
      try {
        const items = await sdk.getPlayerAssets(wallet)
        setInventory(items)
        return items
      } catch {
        return []
      }
    },
    [],
  )

  // Polling for real-time updates
  useEffect(() => {
    const interval = window.setInterval(async () => {
      await refreshMarket()
      if (activeAddress) {
        await refreshInventory(activeAddress)
      }
    }, 2500)
    return () => window.clearInterval(interval)
  }, [activeAddress, refreshMarket, refreshInventory])

  // Auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const printHelp = () => {
    push('┌─── COMMANDS ──────────────────────────────────────────┐')
    push('│')
    push('│  connect-wallet ........... Open wallet selector (Pera/Defly)')
    push('│  disconnect ............... Disconnect current wallet')
    push('│  mint-skin <name> [rarity]  Mint NFT skin (common|rare|epic|legendary)')
    push('│  view-inventory ........... Show your owned assets')
    push('│  list-item <id> <price|auto> List an asset on marketplace')
    push('│  cancel-listing <id> ...... Cancel a marketplace listing')
    push('│  market ................... View marketplace listings')
    push('│  buy <id> ................. Buy a listed asset')
    push('│  apply-skin <id> .......... Apply skin to game demo')
    push('│  ai-price <name> [rarity] . Get AI price suggestion')
    push('│  bridge-minecraft ......... Check Minecraft bridge')
    push('│  bridge-steam ............. Check Steam bridge')
    push('│  clear .................... Clear terminal')
    push('│  help ..................... Show this help')
    push('│')
    push('└────────────────────────────────────────────────────────┘')
  }

  const executeCommand = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    push(`> ${trimmed}`, 'command')
    setCommandHistory((prev) => [trimmed, ...prev.slice(0, 49)])
    setHistoryIndex(-1)

    const [cmd, ...args] = trimmed.split(/\s+/)

    try {
      // ── help ─────────────────────────────────────────────
      if (cmd === 'help') {
        printHelp()
        return
      }

      // ── clear ────────────────────────────────────────────
      if (cmd === 'clear') {
        setLogs([])
        return
      }

      // ── connect-wallet ───────────────────────────────────
      if (cmd === 'connect-wallet') {
        if (activeAddress) {
          push(`Already connected: ${activeAddress}`, 'system')
          return
        }
        setShowWalletModal(true)
        push('Opening wallet selector...', 'system')
        return
      }

      // ── disconnect ───────────────────────────────────────
      if (cmd === 'disconnect') {
        if (!activeAddress || !activeWallet) {
          push('No wallet connected.', 'error')
          return
        }
        await activeWallet.disconnect()
        push('Wallet disconnected.', 'system')
        setInventory([])
        setActiveSkin(null)
        return
      }

      // ── require wallet for all commands below ────────────
      if (!activeAddress) {
        push('⚠ Connect a wallet first: connect-wallet', 'error')
        return
      }

      // ── mint-skin ────────────────────────────────────────
      if (cmd === 'mint-skin') {
        const skinName = args[0] ?? `Neon-${Math.floor(Math.random() * 9999)}`
        const rarity = (args[1] ?? 'rare').toLowerCase()
        if (!['common', 'rare', 'epic', 'legendary'].includes(rarity)) {
          push('Rarity must be: common, rare, epic, legendary', 'error')
          return
        }

        push('Querying AI pricing engine...', 'system')
        const ai = await sdk.getSuggestedPrice(skinName, rarity)
        push(
          `AI Analysis ► Price: ${ai.price} μALGO | Confidence: ${ai.confidence}% | Trend: ${ai.trend}`,
          'ai',
        )

        push('Minting NFT on Algorand TestNet...', 'system')
        const asset = await sdk.mintNFT({
          wallet: activeAddress,
          skin_name: skinName,
          rarity,
        })

        const asaMsg = asset.asa_id ? ` | ASA: ${asset.asa_id}` : ''
        const txnMsg = asset.txn_id ? ` | TX: ${asset.txn_id.slice(0, 12)}...` : ''
        push(
          `✓ Minted "${asset.name}" (#${asset.id}) [${asset.rarity.toUpperCase()}]${asaMsg}${txnMsg}`,
          'success',
        )
        await refreshInventory(activeAddress)
        return
      }

      // ── view-inventory ───────────────────────────────────
      if (cmd === 'view-inventory') {
        const items = await refreshInventory(activeAddress)
        if (!items.length) {
          push('Inventory is empty. Mint some skins first!', 'system')
          return
        }
        push(`─── Inventory (${items.length} items) ───`)
        items.forEach((asset) => {
          const status = asset.listed ? `LISTED @ ${asset.list_price}` : 'OWNED'
          push(`  #${asset.id}  ${asset.name}  [${asset.rarity.toUpperCase()}]  ${status}`)
        })
        return
      }

      // ── list-item ────────────────────────────────────────
      if (cmd === 'list-item') {
        const assetId = Number(args[0])
        if (!assetId) {
          push('Usage: list-item <assetId> <price|auto>', 'error')
          return
        }

        let price = Number(args[1])
        if (!price || args[1] === 'auto') {
          const target = inventory.find((a) => a.id === assetId)
          const ai = await sdk.getSuggestedPrice(
            target?.name ?? `Skin-${assetId}`,
            target?.rarity ?? 'rare',
          )
          price = ai.price
          push(`AI auto-priced at ${price} μALGO (confidence ${ai.confidence}%)`, 'ai')
        }

        const updated = await sdk.listAsset(activeAddress, assetId, price)
        push(`✓ Listed asset #${updated.id} at ${price} μALGO`, 'success')
        await refreshInventory(activeAddress)
        await refreshMarket()
        return
      }

      // ── cancel-listing ───────────────────────────────────
      if (cmd === 'cancel-listing') {
        const assetId = Number(args[0])
        if (!assetId) {
          push('Usage: cancel-listing <assetId>', 'error')
          return
        }
        const updated = await sdk.cancelListing(activeAddress, assetId)
        push(`✓ Cancelled listing for asset #${updated.id}`, 'success')
        await refreshInventory(activeAddress)
        await refreshMarket()
        return
      }

      // ── market ───────────────────────────────────────────
      if (cmd === 'market') {
        const items = await refreshMarket()
        if (!items.length) {
          push('Marketplace is empty. List some items!', 'system')
          return
        }
        push(`─── Marketplace (${items.length} listings) ───`)
        items.forEach((asset) => {
          const seller = asset.owner.slice(0, 8) + '...'
          push(`  #${asset.id}  ${asset.name}  [${asset.rarity.toUpperCase()}]  ${asset.list_price} μALGO  by ${seller}`)
        })
        return
      }

      // ── buy ──────────────────────────────────────────────
      if (cmd === 'buy') {
        const assetId = Number(args[0])
        if (!assetId) {
          push('Usage: buy <assetId>', 'error')
          return
        }

        // Show what will be purchased
        const currentMarket = await refreshMarket()
        const listing = currentMarket.find((a) => a.id === assetId)
        if (listing) {
          push(`Buying "${listing.name}" [${listing.rarity.toUpperCase()}] for ${listing.list_price} μALGO...`, 'system')
          push(`Seller: ${listing.owner.slice(0, 8)}...${listing.owner.slice(-4)}`, 'system')
        }

        push('Sending ALGO payment on-chain...', 'system')
        const result = await sdk.buyAsset(activeAddress, assetId)

        push(
          `✓ Purchased asset #${result.asset?.id || assetId} "${result.asset?.name || ''}" — now owned by you!`,
          'success',
        )

        // Show on-chain payment details
        if (result.payment_txn_id) {
          push(`  Payment TX: ${result.payment_txn_id}`, 'success')
          push(`  Amount: ${result.amount_paid} μALGO → seller`, 'success')
        }
        if (result.royalty_txn_id) {
          push(`  Royalty TX: ${result.royalty_txn_id}`, 'success')
          push(`  Royalty paid to creator`, 'success')
        }
        if (result.sale) {
          const sale = result.sale
          push(`─── Sale Receipt ───`)
          push(`  Price: ${sale.price} μALGO`)
          push(`  Seller proceeds: ${sale.seller_proceeds} μALGO`)
          push(`  Royalty: ${sale.royalty_paid} μALGO → ${sale.creator?.slice(0, 8)}...`)
        }
        if (result.payment_txn_id) {
          push(
            `  Explorer: https://testnet.explorer.perawallet.app/tx/${result.payment_txn_id}`,
            'system',
          )
        }

        await refreshInventory(activeAddress)
        await refreshMarket()
        return
      }

      // ── apply-skin ───────────────────────────────────────
      if (cmd === 'apply-skin') {
        const assetId = Number(args[0])
        const asset = inventory.find((item) => item.id === assetId)
        if (!asset) {
          push(`Asset #${assetId} not found in your inventory.`, 'error')
          return
        }
        setActiveSkin(asset)
        push(`✓ Skin applied: "${asset.name}" [${asset.rarity.toUpperCase()}]`, 'success')
        push('Game engine updated with new skin texture.', 'system')
        return
      }

      // ── ai-price ─────────────────────────────────────────
      if (cmd === 'ai-price') {
        const name = args[0] ?? 'GenericSkin'
        const rarity = (args[1] ?? 'rare').toLowerCase()
        const ai = await sdk.getSuggestedPrice(name, rarity)
        push(`─── AI Price Analysis ───`, 'ai')
        push(`  Skin: ${name}  Rarity: ${rarity}`, 'ai')
        push(`  Suggested Price: ${ai.price} μALGO`, 'ai')
        push(`  Confidence: ${ai.confidence}%`, 'ai')
        push(`  Trend: ${ai.trend}`, 'ai')
        if (ai.rarity_score) push(`  Rarity Score: ${ai.rarity_score}`, 'ai')
        if (ai.demand_score) push(`  Demand Score: ${ai.demand_score}`, 'ai')
        return
      }

      // ── bridge-minecraft ─────────────────────────────────
      if (cmd === 'bridge-minecraft') {
        push('Querying Minecraft bridge...', 'system')
        try {
          const info = await sdk.getBridgeMinecraft(activeAddress)
          push(`─── Minecraft Bridge ───`, 'success')
          push(`  Platform: ${info.platform}`)
          push(`  Status: ${info.status}`)
          push(`  Synced skins: ${info.skins.length}`)
          info.skins.forEach((s: any) => {
            push(`    • ${s.name} [${s.rarity}] — ${s.applied ? 'APPLIED' : 'available'}`)
          })
        } catch (e) {
          push(`Bridge error: ${(e as Error).message}`, 'error')
        }
        return
      }

      // ── bridge-steam ─────────────────────────────────────
      if (cmd === 'bridge-steam') {
        push('Querying Steam trade bridge...', 'system')
        try {
          const info = await sdk.getBridgeSteam(activeAddress)
          push(`─── Steam Bridge ───`, 'success')
          push(`  Platform: ${info.platform}`)
          push(`  Status: ${info.status}`)
          push(`  Tradeable items: ${info.skins.length}`)
          info.skins.forEach((s: any) => {
            push(`    • ${s.name} [${s.rarity}]`)
          })
        } catch (e) {
          push(`Bridge error: ${(e as Error).message}`, 'error')
        }
        return
      }

      push(`Unknown command: "${cmd}". Type "help" for commands.`, 'error')
    } catch (error) {
      push(`Error: ${(error as Error).message}`, 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[newIndex])
      } else {
        setHistoryIndex(-1)
        setCommand('')
      }
    }
  }

  const addr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : 'not connected'

  const onWalletConnected = () => {
    setShowWalletModal(false)
    if (activeAddress) {
      push(`✓ Wallet connected: ${activeAddress}`, 'success')
      push(`Network: Algorand TestNet | ASA minting enabled`, 'system')
      void refreshInventory(activeAddress)
      void refreshMarket()
    }
  }

  // When wallet state changes externally (user connects via modal)
  useEffect(() => {
    if (activeAddress && showWalletModal) {
      onWalletConnected()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress])

  return (
    <div className="app-container" onClick={() => inputRef.current?.focus()}>
      {/* ── Status Bar ─────────────────────────────────── */}
      <div className="status-bar">
        <div className="left">
          <span>DE-SHOP SDK v1.0</span>
          <div className="status-indicator">
            <div className={`status-dot ${activeAddress ? 'connected' : ''}`} />
            <span>{activeAddress ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
        </div>
        <div className="right">
          <span>NETWORK: TESTNET</span>
          <span>WALLET: {addr}</span>
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────── */}
      <div className="terminal-layout">
        {/* Terminal */}
        <div className="terminal-panel">
          <div className="terminal-header">
            <span>DE-SHOP SDK // AI + ALGORAND NFT MARKETPLACE</span>
            <span className="ver">
              {inventory.length} items | {market.length} listed
            </span>
          </div>

          <div className="terminal-screen">
            {logs.map((line) => (
              <div key={line.id} className={`terminal-line ${line.type ?? ''}`}>
                {line.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          <form
            className="terminal-input-row"
            onSubmit={(event) => {
              event.preventDefault()
              const value = command
              setCommand('')
              void executeCommand(value)
            }}
          >
            <span className="prompt">
              {activeAddress ? `${activeAddress.slice(0, 6)}$` : 'guest$'}
            </span>
            <input
              ref={inputRef}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={handleKeyDown}
              className="terminal-input"
              placeholder="type a command..."
              autoFocus
            />
          </form>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <GameDemo activeSkin={activeSkin} />

          <div className="info-panel">
            <div className="info-title">System Info</div>
            <div className="info-row">
              <span className="info-label">Wallet</span>
              <span className="info-value">{addr}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Network</span>
              <span className="info-value">TestNet</span>
            </div>
            <div className="info-row">
              <span className="info-label">Inventory</span>
              <span className="info-value">{inventory.length} items</span>
            </div>
            <div className="info-row">
              <span className="info-label">Marketplace</span>
              <span className="info-value">{market.length} listings</span>
            </div>
            <div className="info-row">
              <span className="info-label">Active Skin</span>
              <span className="info-value">
                {activeSkin ? activeSkin.name : 'Default'}
              </span>
            </div>
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
