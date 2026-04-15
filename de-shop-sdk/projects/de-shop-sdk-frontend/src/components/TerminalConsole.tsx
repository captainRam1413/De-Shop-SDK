import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import GameDemo from './GameDemo'
import WalletModal from './WalletModal'
import { DeShopSDK, type Asset } from '../sdk/DeShopSDK'
import { skinIntelligence } from '../sdk/SkinIntelligence'
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  TransactionFailedError,
} from '../sdk/errors'

const sdk = new DeShopSDK({
  network: 'testnet',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
})

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
    }, 5000)
    return () => window.clearInterval(interval)
  }, [activeAddress, refreshMarket, refreshInventory])

  // SDK Events
  useEffect(() => {
    const unsubMint = sdk.on('mint', (asset) => push(`[SDK Event] Minted "${asset.name}"`, 'system'))
    const unsubList = sdk.on('list', (asset) => push(`[SDK Event] Listed "${asset.name}"`, 'system'))
    const unsubBuy = sdk.on('buy', (res) => push(`[SDK Event] Bought "${res.asset?.name}"`, 'system'))
    const unsubTransfer = sdk.on('transfer', (res) => push(`[SDK Event] Transferred Asset #${res.asset_id}`, 'system'))

    return () => { unsubMint(); unsubList(); unsubBuy(); unsubTransfer() }
  }, [push])

  // Auto-scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const printHelp = () => {
    push('┌─── COMMANDS ──────────────────────────────────────────┐')
    push('│')
    push('│  connect-wallet ........... Open wallet selector (Pera/Defly)')
    push('│  disconnect ............... Disconnect current wallet')
    push('│  mint-skin <name> [rarity] [type] Mint NFT skin')
    push('│  view-inventory ........... Show your owned assets')
    push('│  list-item <id> <price|auto> List an asset on marketplace')
    push('│  cancel-listing <id> ...... Cancel a marketplace listing')
    push('│  market ................... View marketplace listings')
    push('│  buy <id> ................. Buy a listed asset')
    push('│  transfer-skin <id> <addr>. Transfer/gift an asset')
    push('│  history <id> ............. View asset provenance history')
    push('│  apply-skin <id> .......... Apply skin to game demo')
    push('│  ai-price <name> [rarity] . Get AI price suggestion')
    push('│  analyze-skin <id|name> ... Skin Intelligence analysis')
    push('│  bridge-minecraft ......... Check Minecraft bridge')
    push('│  bridge-steam ............. Check Steam bridge')
    push('│  clear .................... Clear terminal')
    push('│  help ..................... Show this help')
    push('│')
    push('└────────────────────────────────────────────────────────┘')
  }

  const handleErrorDisplay = (e: any) => {
    if (e instanceof WalletNotConnectedError) {
      push('✗ Wallet not connected. Use connect-wallet first.', 'error')
    } else if (e instanceof InsufficientFundsError) {
      push(`✗ Insufficient funds. Need ${e.required} μALGO, have ${e.available}.`, 'error')
    } else if (e instanceof TransactionFailedError) {
       push(`✗ Transaction failed: ${e.message}`, 'error')
    } else if (e instanceof DeShopError) {
      push(`✗ SDK Error: ${e.message}`, 'error')
    } else {
      push(`✗ Error: ${e.message || 'Unknown network error'}`, 'error')
    }
  }

  const executeCommand = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    push(`> ${trimmed}`, 'command')
    setCommandHistory((prev) => [trimmed, ...prev.slice(0, 49)])
    setHistoryIndex(-1)

    const [cmd, ...args] = trimmed.split(/\s+/)

    try {
      if (cmd === 'help') return printHelp()
      if (cmd === 'clear') return setLogs([])

      if (cmd === 'connect-wallet') {
        if (activeAddress) return push(`Already connected: ${activeAddress}`, 'system')
        setShowWalletModal(true)
        push('Opening wallet selector...', 'system')
        return
      }

      if (cmd === 'disconnect') {
        if (!activeAddress || !activeWallet) return push('No wallet connected.', 'error')
        await activeWallet.disconnect()
        push('Wallet disconnected.', 'system')
        setInventory([])
        setActiveSkin(null)
        return
      }

      if (!activeAddress) {
        push('⚠ Connect a wallet first: connect-wallet', 'error')
        return
      }

      if (cmd === 'mint-skin') {
        const skinName = args[0] ?? `Neon-${Math.floor(Math.random() * 9999)}`
        const rarity = (args[1] ?? 'rare').toLowerCase()
        const type = (args[2] ?? 'weapon').toLowerCase() as any
        if (!['common', 'rare', 'epic', 'legendary'].includes(rarity)) {
          return push('Rarity must be: common, rare, epic, legendary', 'error')
        }
        if (!['weapon', 'character', 'accessory'].includes(type)) {
          return push('Type must be: weapon, character, accessory', 'error')
        }

        push('Querying AI pricing engine...', 'system')
        const ai = await sdk.getSuggestedPrice(skinName, rarity)
        push(`AI Analysis ► Price: ${ai.price} μALGO | Confidence: ${ai.confidence}%`, 'ai')
        push('Minting NFT on Algorand TestNet...', 'system')
        const asset = await sdk.mintNFT({ wallet: activeAddress, skin_name: skinName, rarity, skin_type: type, royalty_bps: 500 })

        const asaMsg = asset.asa_id ? ` | ASA: ${asset.asa_id}` : ''
        const txnMsg = asset.txn_id ? ` | TX: ${asset.txn_id.slice(0, 12)}...` : ''
        push(`✓ Minted "${asset.name}" (#${asset.id}) [${asset.rarity.toUpperCase()}]${asaMsg}${txnMsg}`, 'success')
        await refreshInventory(activeAddress)
        return
      }

      if (cmd === 'view-inventory') {
        const items = await refreshInventory(activeAddress)
        if (!items.length) return push('Inventory is empty. Mint some skins first!', 'system')
        push(`─── Inventory (${items.length} items) ───`)
        for (const asset of items) {
          const status = asset.listed ? `LISTED @ ${asset.list_price}` : 'OWNED'
          push(`  #${asset.id}  ${asset.name}  [${asset.rarity.toUpperCase()}]  ${status}`)
        }
        return
      }

      if (cmd === 'list-item') {
        const assetId = Number(args[0])
        let price = Number(args[1])
        if (!assetId) return push('Usage: list-item <assetId> <price|auto>', 'error')

        if (!price || args[1] === 'auto') {
          const target = inventory.find((a) => a.id === assetId)
          const ai = await sdk.getSuggestedPrice(target?.name ?? `Skin-${assetId}`, target?.rarity ?? 'rare')
          price = ai.price
          push(`AI auto-priced at ${price} μALGO`, 'ai')
        }

        const updated = await sdk.listAsset(activeAddress, assetId, price)
        push(`✓ Listed asset #${updated.id} at ${price} μALGO`, 'success')
        await refreshInventory(activeAddress); await refreshMarket()
        return
      }

      if (cmd === 'cancel-listing') {
        const assetId = Number(args[0])
        if (!assetId) return push('Usage: cancel-listing <assetId>', 'error')
        const updated = await sdk.cancelListing(activeAddress, assetId)
        push(`✓ Cancelled listing for asset #${updated.id}`, 'success')
        await refreshInventory(activeAddress); await refreshMarket()
        return
      }

      if (cmd === 'market') {
        const items = await refreshMarket()
        if (!items.length) return push('Marketplace is empty.', 'system')
        push(`─── Marketplace (${items.length} listings) ───`)
        for (const asset of items) {
          push(`  #${asset.id}  ${asset.name}  [${asset.rarity.toUpperCase()}]  ${asset.list_price} μALGO`)
        }
        return
      }

      if (cmd === 'buy') {
        const assetId = Number(args[0])
        if (!assetId) return push('Usage: buy <assetId>', 'error')

        push('Sending ALGO payment on-chain...', 'system')
        const result = await sdk.buyAsset(activeAddress, assetId)
        push(`✓ Purchased asset #${assetId}!`, 'success')
        if (result.payment_txn_id) push(`  Payment TX: ${result.payment_txn_id}`, 'success')
        await refreshInventory(activeAddress); await refreshMarket()
        return
      }

      if (cmd === 'transfer-skin') {
        const assetId = Number(args[0])
        const toAddr = args[1]
        if (!assetId || !toAddr) return push('Usage: transfer-skin <assetId> <address>', 'error')
        push(`Transferring asset #${assetId} to ${toAddr.slice(0,8)}...`, 'system')
        const result = await sdk.transferAsset(toAddr, assetId)
        push(`✓ Delivered to ${toAddr.slice(0, 8)}. TX: ${result.txn_id}`, 'success')
        await refreshInventory(activeAddress)
        return
      }

      if (cmd === 'history') {
         const assetId = Number(args[0])
         if (!assetId) return push('Usage: history <assetId>', 'error')
         const hist = await sdk.getAssetHistory(assetId)
         push(`─── Asset Provenance (#${assetId}) ───`)
         if (hist.length === 0) push('  No history recorded.')
         for (const h of hist) {
             const time = new Date(h.timestamp).toLocaleTimeString()
             push(`  [${time}] ${h.type.toUpperCase()} by ${h.by.slice(0,6)}... ${h.price ? '@ '+h.price+' μALGO' : ''}`)
         }
         return
      }

      if (cmd === 'apply-skin') {
        const assetId = Number(args[0])
        const asset = inventory.find((item) => item.id === assetId)
        if (!asset) return push(`Asset not found in your inventory.`, 'error')
        setActiveSkin(asset)
        push(`✓ Skin applied: "${asset.name}"`, 'success')
        return
      }

      if (cmd === 'analyze-skin') {
         const query = args.join(' ')
         if (!query) return push('Usage: analyze-skin <id|name>', 'error')
         push('Running Skin Intelligence Engine...', 'system')
         const assetId = Number(query)
         let target: Asset | undefined
         if (!isNaN(assetId)) {
            target = inventory.find((a) => a.id === assetId || a.asa_id === assetId) || market.find((a) => a.id === assetId || a.asa_id === assetId)
         } else {
            target = inventory.find((a) => a.name.toLowerCase().includes(query.toLowerCase()))
         }
         const meta = target ? { name: target.name, attributes: { rarity: target.rarity } } : { name: query, attributes: { rarity: args[1] || 'rare' } }
         const analysis = skinIntelligence.analyze(meta)
         
         const typeLabel = analysis.type === 'gun_skin' ? '🔫 Gun Skin' : analysis.type === 'character_skin' ? '🧑 Character Skin' : '✨ Accessory'
         push(`  [INFO] Skin Type: ${typeLabel}`, 'ai')
         push(`  [INFO] Game Mapping: ${analysis.game_mapping.category}`, 'ai')
         const scoreBar = '█'.repeat(Math.round(analysis.rarity_score)) + '░'.repeat(10 - Math.round(analysis.rarity_score))
         push(`  [INFO] Rarity Score: [${scoreBar}] ${analysis.rarity_score}/10`, 'ai')
         push(`  [INFO] Tags: ${analysis.tags.join(', ')}`, 'system')
         push(`  ${analysis.description}`, 'ai')

         if (target) setActiveSkin(target)
         return
      }

      if (cmd === 'ai-price') {
        const ai = await sdk.getSuggestedPrice(args[0] ?? 'GenericSkin', args[1] ?? 'rare')
        push(`Suggested Price: ${ai.price} μALGO (Conf: ${ai.confidence}%)`, 'ai')
        return
      }

      if (cmd === 'bridge-minecraft' || cmd === 'bridge-steam') {
        const info = cmd === 'bridge-minecraft' ? await sdk.getBridgeMinecraft(activeAddress) : await sdk.getBridgeSteam(activeAddress)
        push(`─── ${info.platform} Bridge ───`, 'success')
        push(`  Status: ${info.status}`)
        push(`  Items: ${info.skins.length}`)
        return
      }

      push(`Unknown command: "${cmd}". Type "help" for commands.`, 'error')
    } catch (error) {
       handleErrorDisplay(error)
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

  const addr = activeAddress ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}` : 'not connected'

  const onWalletConnected = () => {
    setShowWalletModal(false)
    if (activeAddress) {
      push(`✓ Wallet connected: ${activeAddress}`, 'success')
      push(`Network: Algorand TestNet | SDK v2.0`, 'system')
      void refreshInventory(activeAddress)
      void refreshMarket()
    }
  }

  useEffect(() => {
    if (activeAddress && showWalletModal) onWalletConnected()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress])

  return (
    <div className="app-container" onClick={() => inputRef.current?.focus()}>
      <div className="status-bar">
        <div className="left">
          <span>DE-SHOP SDK v2.0</span>
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

      <div className="terminal-layout">
        <div className="terminal-panel">
          <div className="terminal-header">
            <span>DE-SHOP SDK // AI + ALGORAND NFT MARKETPLACE</span>
            <span className="ver">{inventory.length} items | {market.length} listed</span>
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

        <div className="sidebar">
          <GameDemo activeSkin={activeSkin} />
          <div className="info-panel">
            <div className="info-title">System Info</div>
            <div className="info-row"><span className="info-label">Wallet</span><span className="info-value">{addr}</span></div>
            <div className="info-row"><span className="info-label">Network</span><span className="info-value">TestNet (v2.0)</span></div>
            <div className="info-row"><span className="info-label">Inventory</span><span className="info-value">{inventory.length} items</span></div>
            <div className="info-row"><span className="info-label">Marketplace</span><span className="info-value">{market.length} listings</span></div>
          </div>
        </div>
      </div>

      {showWalletModal && <WalletModal wallets={wallets} onClose={() => setShowWalletModal(false)} />}
    </div>
  )
}
