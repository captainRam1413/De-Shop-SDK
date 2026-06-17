'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDeShopStore } from '@/store/useDeShopStore'

/* ===== TYPES ===== */

type LogType = 'command' | 'output' | 'error' | 'success' | 'system'

interface LogEntry {
  id: string
  type: LogType
  text: string
  timestamp: string
}

/* ===== HELPERS ===== */

function getTimestamp(): string {
  const now = new Date()
  return now.toTimeString().split(' ')[0] // HH:MM:SS
}

function generateAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let addr = ''
  for (let i = 0; i < 58; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

/* ===== COMMANDS ===== */

const COMMANDS = [
  'help', 'clear', 'connect', 'disconnect', 'status', 'mint', 'list', 'buy',
  'inventory', 'price', 'bridge', 'whoami', 'ls', 'cd', 'cat', 'uname',
]

const MODULES = ['dashboard', 'market', 'inventory', 'profile', 'docs', 'plugins']

const MARKETPLACE_LISTINGS = [
  { id: '001', name: 'Neon Blade', rarity: 'Legendary', price: '12.5 ALGO', seller: 'ALGO3F...X9K2' },
  { id: '002', name: 'Cyber Shield', rarity: 'Rare', price: '3.2 ALGO', seller: 'ALGO7B...M4P1' },
  { id: '003', name: 'Quantum Helm', rarity: 'Epic', price: '7.8 ALGO', seller: 'ALGO1C...Q8W3' },
  { id: '004', name: 'Digital Crown', rarity: 'Legendary', price: '25.0 ALGO', seller: 'ALGO9D...R2T5' },
  { id: '005', name: 'Plasma Rifle', rarity: 'Rare', price: '4.1 ALGO', seller: 'ALGO5E...N6Y7' },
  { id: '006', name: 'Void Cape', rarity: 'Epic', price: '8.9 ALGO', seller: 'ALGO2F...J1H9' },
]

const INVENTORY_ITEMS = [
  { name: 'Shadow Dagger', rarity: 'Rare', value: '3.5 ALGO' },
  { name: 'Pixel Potion', rarity: 'Common', value: '0.8 ALGO' },
  { name: 'Titan Armor', rarity: 'Epic', value: '9.2 ALGO' },
  { name: 'Storm Ring', rarity: 'Legendary', value: '15.0 ALGO' },
  { name: 'Chain Mail', rarity: 'Common', value: '1.2 ALGO' },
]

const RARITY_COLORS: Record<string, string> = {
  Common: '#888888',
  Rare: '#00D4FF',
  Epic: '#FF00FF',
  Legendary: '#FFB800',
}

/* ===== COMPONENT ===== */

export default function TerminalPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { walletConnected, walletAddress, connectWallet, disconnectWallet, setActivePage, addNotification } = useDeShopStore()

  // Banner on mount
  useEffect(() => {
    const banner: LogEntry[] = [
      { id: 'b1', type: 'system', text: '  ╔══════════════════════════════════════╗', timestamp: getTimestamp() },
      { id: 'b2', type: 'system', text: '  ║   DE-SHOP SDK — Terminal Console    ║', timestamp: getTimestamp() },
      { id: 'b3', type: 'system', text: '  ║   Type \'help\' for available commands ║', timestamp: getTimestamp() },
      { id: 'b4', type: 'system', text: '  ╚══════════════════════════════════════╝', timestamp: getTimestamp() },
      { id: 'b5', type: 'output', text: '', timestamp: getTimestamp() },
    ]
    setLogs(banner)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // Focus input on click
  const handleAreaClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const addLog = useCallback((type: LogType, text: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text, timestamp: getTimestamp() }])
        resolve()
      }, 30 + Math.random() * 50) // Slight delay for realism
    })
  }, [])

  const addLogsSequential = useCallback(async (entries: Array<{ type: LogType; text: string }>) => {
    for (const entry of entries) {
      await addLog(entry.type, entry.text)
    }
  }, [addLog])

  const processCommand = useCallback(async (cmd: string) => {
    if (isProcessing) return
    setIsProcessing(true)

    const trimmed = cmd.trim()
    const parts = trimmed.split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1)

    // Log the command
    setLogs((prev) => [...prev, { id: `${Date.now()}-cmd`, type: 'command', text: trimmed, timestamp: getTimestamp() }])

    switch (command) {
      case 'help':
        await addLogsSequential([
          { type: 'system', text: '┌─────────────────────────────────────────────┐' },
          { type: 'system', text: '│          AVAILABLE COMMANDS                  │' },
          { type: 'system', text: '├─────────────────────────────────────────────┤' },
          { type: 'output', text: '  help              Show this help message' },
          { type: 'output', text: '  clear             Clear the terminal' },
          { type: 'output', text: '  connect           Connect wallet' },
          { type: 'output', text: '  disconnect        Disconnect wallet' },
          { type: 'output', text: '  status            Show network status' },
          { type: 'output', text: '  mint <name> [rarity]  Mint a new NFT' },
          { type: 'output', text: '  list              Show marketplace listings' },
          { type: 'output', text: '  buy <id>          Buy an asset by ID' },
          { type: 'output', text: '  inventory         Show owned assets' },
          { type: 'output', text: '  price <name>      Get AI-suggested price' },
          { type: 'output', text: '  bridge <network>  Show bridge status' },
          { type: 'output', text: '  whoami            Show wallet info' },
          { type: 'output', text: '  ls                List available modules' },
          { type: 'output', text: '  cd <module>       Navigate to module' },
          { type: 'output', text: '  cat readme        Show SDK readme' },
          { type: 'output', text: '  uname             Show SDK version' },
          { type: 'system', text: '└─────────────────────────────────────────────┘' },
        ])
        break

      case 'clear':
        setLogs([])
        setIsProcessing(false)
        return

      case 'connect':
        if (walletConnected) {
          await addLog('output', `Already connected: ${walletAddress}`)
        } else {
          await addLog('system', 'Connecting to Algorand wallet...')
          await new Promise((r) => setTimeout(r, 800))
          const addr = generateAddress()
          connectWallet(addr)
          addNotification('success', 'Wallet connected successfully')
          await addLog('success', `✓ Wallet connected!`)
          await addLog('output', `  Address: ${addr}`)
          await addLog('output', `  Network: ALGORAND TESTNET`)
          await addLog('output', `  Balance: ${(Math.random() * 100 + 10).toFixed(2)} ALGO`)
        }
        break

      case 'disconnect':
        if (!walletConnected) {
          await addLog('output', 'No wallet connected.')
        } else {
          disconnectWallet()
          addNotification('info', 'Wallet disconnected')
          await addLog('success', '✓ Wallet disconnected.')
        }
        break

      case 'status': {
        const status = walletConnected ? 'Connected' : 'Disconnected'
        const addr = walletAddress || 'N/A'
        await addLogsSequential([
          { type: 'system', text: '┌── SYSTEM STATUS ──────────────────────┐' },
          { type: walletConnected ? 'success' : 'error', text: `  Wallet:    ${status}` },
          { type: 'output', text: `  Address:   ${addr.substring(0, 20)}...` },
          { type: 'output', text: `  Network:   ALGORAND TESTNET` },
          { type: 'success', text: `  Node:      ● Online` },
          { type: 'output', text: `  Block:     ${(31247891 + Math.floor(Math.random() * 100)).toLocaleString()}` },
          { type: 'output', text: `  Latency:   ${Math.floor(Math.random() * 200 + 50)}ms` },
          { type: 'system', text: '└──────────────────────────────────────┘' },
        ])
        break
      }

      case 'mint': {
        const name = args[0]
        const rarity = args[1] || 'Common'
        if (!name) {
          await addLog('error', 'Usage: mint <name> [rarity]')
          await addLog('output', '  Rarities: Common, Rare, Epic, Legendary')
          break
        }
        const validRarities = ['common', 'rare', 'epic', 'legendary']
        if (!validRarities.includes(rarity.toLowerCase())) {
          await addLog('error', `Invalid rarity: ${rarity}`)
          await addLog('output', '  Valid: Common, Rare, Epic, Legendary')
          break
        }
        await addLog('system', `Forging "${name}" [${rarity}]...`)
        // Progress bar
        const steps = 10
        for (let i = 1; i <= steps; i++) {
          const filled = '█'.repeat(i)
          const empty = '░'.repeat(steps - i)
          await new Promise((r) => setTimeout(r, 150))
          setLogs((prev) => [
            ...prev.slice(0, -1),
            { ...prev[prev.length - 1], text: `  [${filled}${empty}] ${(i / steps * 100).toFixed(0)}%` },
          ])
        }
        const price = (Math.random() * 20 + 0.5).toFixed(2)
        await addLog('success', `✓ NFT Minted: "${name}" [${rarity}]`)
        await addLog('output', `  Asset ID:   #${Math.floor(Math.random() * 999999)}`)
        await addLog('output', `  Value:      ${price} ALGO`)
        addNotification('success', `Minted "${name}" [${rarity}]`)
        break
      }

      case 'list': {
        const rows = MARKETPLACE_LISTINGS.map(
          (item) => `  ${item.id}  ${item.name.padEnd(14)} ${item.rarity.padEnd(10)} ${item.price.padStart(10)}  ${item.seller}`
        )
        await addLogsSequential([
          { type: 'system', text: '┌── MARKETPLACE LISTINGS ─────────────────────────────────────┐' },
          { type: 'output', text: '  ID   NAME             RARITY         PRICE      SELLER' },
          { type: 'system', text: '  ───  ──────────────  ──────────  ──────────  ────────────' },
          ...rows.map((r) => ({ type: 'output' as LogType, text: r })),
          { type: 'system', text: '└──────────────────────────────────────────────────────────┘' },
        ])
        break
      }

      case 'buy': {
        const id = args[0]
        if (!id) {
          await addLog('error', 'Usage: buy <id>')
          break
        }
        const item = MARKETPLACE_LISTINGS.find((l) => l.id === id)
        if (!item) {
          await addLog('error', `Asset #${id} not found on marketplace.`)
          break
        }
        if (!walletConnected) {
          await addLog('error', 'Wallet not connected. Use "connect" first.')
          break
        }
        await addLog('system', `Purchasing "${item.name}" for ${item.price}...`)
        await new Promise((r) => setTimeout(r, 1000))
        await addLog('success', `✓ Purchased "${item.name}" [${item.rarity}] for ${item.price}`)
        addNotification('success', `Bought "${item.name}" for ${item.price}`)
        break
      }

      case 'inventory': {
        if (!walletConnected) {
          await addLog('error', 'Wallet not connected. Use "connect" first.')
          break
        }
        const rows = INVENTORY_ITEMS.map(
          (item) => `  ${item.name.padEnd(16)} ${item.rarity.padEnd(10)} ${item.value.padStart(10)}`
        )
        await addLogsSequential([
          { type: 'system', text: '┌── INVENTORY ─────────────────────────────┐' },
          { type: 'output', text: '  NAME               RARITY         VALUE' },
          { type: 'system', text: '  ────────────────  ──────────  ──────────' },
          ...rows.map((r) => ({ type: 'output' as LogType, text: r })),
          { type: 'system', text: '└────────────────────────────────────────┘' },
        ])
        break
      }

      case 'price': {
        const name = args.join(' ')
        if (!name) {
          await addLog('error', 'Usage: price <name>')
          break
        }
        await addLog('system', `Querying AI price oracle for "${name}"...`)
        await new Promise((r) => setTimeout(r, 700))
        const basePrice = Math.random() * 30 + 1
        const confidence = Math.floor(Math.random() * 30 + 70)
        await addLogsSequential([
          { type: 'success', text: `✓ AI Price Suggestion for "${name}":` },
          { type: 'output', text: `  Estimated:  ${basePrice.toFixed(2)} ALGO` },
          { type: 'output', text: `  Range:      ${(basePrice * 0.8).toFixed(2)} - ${(basePrice * 1.2).toFixed(2)} ALGO` },
          { type: 'output', text: `  Confidence: ${confidence}%` },
        ])
        break
      }

      case 'bridge': {
        const network = args[0]?.toLowerCase()
        if (!network) {
          await addLog('error', 'Usage: bridge <minecraft|steam>'  )
          break
        }
        if (network === 'minecraft') {
          await addLogsSequential([
            { type: 'system', text: 'Checking Minecraft bridge...' },
            { type: 'success', text: '  ✓ Bridge: ACTIVE' },
            { type: 'output', text: '  Protocol:  v1.2.0' },
            { type: 'output', text: '  Assets synced:  142' },
            { type: 'output', text: '  Last sync:     2m ago' },
          ])
        } else if (network === 'steam') {
          await addLogsSequential([
            { type: 'system', text: 'Checking Steam bridge...' },
            { type: 'output', text: '  ○ Bridge: STANDBY' },
            { type: 'output', text: '  Protocol:  v0.9.1 (beta)' },
            { type: 'output', text: '  Assets synced:  0' },
            { type: 'output', text: '  Use "connect steam" in profile to activate' },
          ])
        } else {
          await addLog('error', `Unknown network: ${network}. Available: minecraft, steam`)
        }
        break
      }

      case 'whoami': {
        if (!walletConnected) {
          await addLog('output', 'Not connected. Use "connect" to link wallet.'  )
        } else {
          await addLogsSequential([
            { type: 'system', text: '┌── IDENTITY ──────────────────────────┐' },
            { type: 'output', text: `  Address:   ${walletAddress}` },
            { type: 'output', text: `  Balance:   ${(Math.random() * 100 + 10).toFixed(2)} ALGO` },
            { type: 'output', text: `  Network:   ALGORAND TESTNET` },
            { type: 'success', text: '  Status:    ● Online' },
            { type: 'system', text: '└─────────────────────────────────────┘' },
          ])
        }
        break
      }

      case 'ls': {
        await addLogsSequential([
          { type: 'system', text: '┌── AVAILABLE MODULES ──────────────────┐' },
          ...MODULES.map((m) => ({ type: 'output' as LogType, text: `  📁 ${m}/` })),
          { type: 'system', text: '└───────────────────────────────────────┘' },
          { type: 'output', text: 'Use "cd <module>" to navigate.' },
        ])
        break
      }

      case 'cd': {
        const targetModule = args[0]?.toLowerCase()
        if (!targetModule) {
          await addLog('error', 'Usage: cd <module>')
          await addLog('output', '  Available: dashboard, market, inventory, profile, docs, plugins')
          break
        }
        const validPages: Record<string, string> = {
          dashboard: 'dashboard',
          market: 'market',
          marketplace: 'market',
          inventory: 'inventory',
          profile: 'profile',
          docs: 'docs',
          documentation: 'docs',
          plugins: 'plugins',
        }
        const page = validPages[targetModule]
        if (!page) {
          await addLog('error', `Module not found: ${targetModule}`)
          await addLog('output', '  Available: dashboard, market, inventory, profile, docs, plugins')
        } else {
          await addLog('success', `Navigating to ${targetModule}...`)
          setTimeout(() => {
            setActivePage(page as 'dashboard' | 'market' | 'inventory' | 'profile' | 'docs' | 'plugins')
          }, 300)
        }
        break
      }

      case 'cat': {
        const file = args[0]?.toLowerCase()
        if (file === 'readme') {
          await addLogsSequential([
            { type: 'system', text: '┌── README.md ──────────────────────────────────────┐' },
            { type: 'output', text: '  # De-Shop SDK v2.0.0' },
            { type: 'output', text: '' },
            { type: 'output', text: '  A decentralized marketplace for gaming digital assets,' },
            { type: 'output', text: '  powered by Algorand blockchain technology.' },
            { type: 'output', text: '' },
            { type: 'output', text: '  ## Features' },
            { type: 'output', text: '  - NFT Minting & Trading' },
            { type: 'output', text: '  - AI-Powered Price Oracle' },
            { type: 'output', text: '  - Cross-Chain Bridge (Minecraft, Steam)' },
            { type: 'output', text: '  - Terminal Interface for Power Users' },
            { type: 'output', text: '' },
            { type: 'output', text: '  ## Quick Start' },
            { type: 'output', text: '  $ connect          # Connect your wallet' },
            { type: 'output', text: '  $ list             # Browse marketplace' },
            { type: 'output', text: '  $ mint <name>      # Mint a new NFT' },
            { type: 'output', text: '' },
            { type: 'output', text: '  ## Support' },
            { type: 'output', text: '  Discord: discord.gg/de-shop' },
            { type: 'output', text: '  GitHub:  github.com/de-shop-sdk' },
            { type: 'system', text: '└──────────────────────────────────────────────────┘' },
          ])
        } else {
          await addLog('error', `cat: ${file || '(no file)'}: No such file`)
          await addLog('output', '  Available: readme')
        }
        break
      }

      case 'uname': {
        await addLogsSequential([
          { type: 'system', text: 'De-Shop SDK v2.0.0 (algorand-testnet)' },
          { type: 'output', text: '  Protocol:   ARC3/ARC69' },
          { type: 'output', text: '  Runtime:    Next.js 16 / Terminal Mode' },
          { type: 'output', text: '  Chain:      Algorand Testnet v3.19.1' },
          { type: 'output', text: '  Build:      2024.06.17-stable' },
        ])
        break
      }

      default:
        await addLog('error', `command not found: ${command}`)
        await addLog('output', 'Type "help" for available commands.')
    }

    await addLog('output', '')
    setIsProcessing(false)
  }, [isProcessing, walletConnected, walletAddress, connectWallet, disconnectWallet, setActivePage, addNotification, addLog, addLogsSequential])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !isProcessing) {
      const cmd = input.trim()
      setCommandHistory((prev) => [cmd, ...prev])
      setHistoryIndex(-1)
      setInput('')
      processCommand(cmd)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const parts = input.split(/\s+/)
      const current = parts[0]?.toLowerCase()
      // Tab complete command names
      if (parts.length <= 1) {
        const matches = COMMANDS.filter((c) => c.startsWith(current))
        if (matches.length === 1) {
          setInput(matches[0] + ' ')
        } else if (matches.length > 1) {
          // Show completions
          setLogs((prev) => [
            ...prev,
            { id: `${Date.now()}-cmd`, type: 'command', text: input, timestamp: getTimestamp() },
            { id: `${Date.now()}-tab`, type: 'output', text: matches.join('  '), timestamp: getTimestamp() },
            { id: `${Date.now()}-empty`, type: 'output', text: '', timestamp: getTimestamp() },
          ])
        }
      } else if (current === 'cd') {
        // Tab complete module names
        const partial = parts[1]?.toLowerCase() || ''
        const matches = MODULES.filter((m) => m.startsWith(partial))
        if (matches.length === 1) {
          setInput(`cd ${matches[0]}`)
        }
      }
    }
  }, [input, commandHistory, historyIndex, isProcessing, processCommand])

  const logColorClass = (type: LogType): string => {
    switch (type) {
      case 'command': return 'text-white'
      case 'output': return 'text-[#CCCCCC]'
      case 'error': return 'text-[#FF5555] text-glow-red'
      case 'success': return 'text-[#33FF33] text-glow-green'
      case 'system': return 'text-[#00D4FF] text-glow-cyan'
      default: return 'text-[#CCCCCC]'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Window */}
      <div className="terminal-card flex-1 flex flex-col overflow-hidden crt-screen">
        {/* Chrome Bar */}
        <div className="terminal-chrome">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="terminal-dot terminal-dot-red" />
            <span className="terminal-dot terminal-dot-yellow" />
            <span className="terminal-dot terminal-dot-green" />
          </div>
          <span className="terminal-title">de-shop-sdk@terminal:~</span>
          <div className="flex items-center gap-2">
            <span className={`status-dot ${walletConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
            <span className="text-[10px] text-term-dim font-terminal">
              {walletConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Scrollable Log Area */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto font-terminal text-xs leading-relaxed cursor-text relative z-10"
          style={{ background: '#1A1A1A' }}
          onClick={handleAreaClick}
        >
          {logs.map((entry) => (
            <div key={entry.id} className={`${logColorClass(entry.type)} whitespace-pre-wrap`}>
              {entry.type === 'command' ? (
                <>
                  <span className="text-term-dim">[{entry.timestamp}]</span>{' '}
                  <span className="text-term-green">$</span>{' '}
                  {entry.text}
                </>
              ) : entry.text ? (
                <>
                  <span className="text-term-dim">[{entry.timestamp}]</span>{' '}
                  {entry.text}
                </>
              ) : (
                '\u00A0'
              )}
            </div>
          ))}

          {/* Input Line */}
          <div className="flex items-center mt-1">
            <span className="text-term-green mr-2 whitespace-nowrap text-glow-green">user@de-shop:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-term-green outline-none text-xs font-terminal caret-term-green"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              disabled={isProcessing}
            />
            {!input && !isProcessing && <span className="blink-cursor" />}
          </div>
        </div>
      </div>
    </div>
  )
}
