'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  Gamepad2,
  Monitor,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/* ===== TYPES ===== */

interface Achievement {
  id: string
  emoji: string
  name: string
  unlockDate: string | null
  unlocked: boolean
  description: string
}

interface Transaction {
  id: string
  date: string
  type: 'MINT' | 'BUY' | 'SELL' | 'TRANSFER' | 'LIST'
  description: string
  amount: string
  status: 'confirmed' | 'pending'
  details: {
    assetId: string
    from?: string
    to?: string
    txId: string
  }
}

interface Holding {
  name: string
  rarity: string
  value: string
  quantity: number
}

/* ===== MOCK DATA ===== */

const ACHIEVEMENTS: Achievement[] = [
  { id: '1', emoji: '🎨', name: 'First Mint', unlockDate: '2024-01-20', unlocked: true, description: 'Mint your first NFT on the platform' },
  { id: '2', emoji: '💰', name: 'Trader', unlockDate: '2024-02-14', unlocked: true, description: 'Complete 10 trades on the marketplace' },
  { id: '3', emoji: '📦', name: 'Collector', unlockDate: '2024-03-05', unlocked: true, description: 'Own 5 or more NFTs simultaneously' },
  { id: '4', emoji: '🐋', name: 'Whale Watcher', unlockDate: '2024-04-12', unlocked: true, description: 'Execute a trade over 50 ALGO' },
  { id: '5', emoji: '🌟', name: 'Early Adopter', unlockDate: '2024-01-15', unlocked: true, description: 'Join the platform in its first month' },
  { id: '6', emoji: '💎', name: 'Diamond Hands', unlockDate: '2024-05-22', unlocked: true, description: 'Hold an NFT for 90+ days without selling' },
  { id: '7', emoji: '🌉', name: 'Bridge Builder', unlockDate: null, unlocked: false, description: 'Complete a cross-chain bridge transfer' },
  { id: '8', emoji: '📊', name: 'Market Maker', unlockDate: null, unlocked: false, description: 'List 20+ items on the marketplace' },
  { id: '9', emoji: '⚡', name: 'Speed Demon', unlockDate: null, unlocked: false, description: 'Execute 5 trades in under 1 minute' },
  { id: '10', emoji: '🏆', name: 'Champion', unlockDate: null, unlocked: false, description: 'Win a community vote or contest' },
  { id: '11', emoji: '🔮', name: 'Oracle Eye', unlockDate: null, unlocked: false, description: 'Use AI pricing for 50+ assets' },
  { id: '12', emoji: '🛡️', name: 'Guardian', unlockDate: null, unlocked: false, description: 'Verify all transactions for 30 days' },
]

const TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2024-06-15', type: 'MINT', description: 'Minted Neon Blade #44721', amount: '+1 NFT', status: 'confirmed', details: { assetId: '#44721', txId: 'TX8F3K...M2P9' } },
  { id: '2', date: '2024-06-14', type: 'BUY', description: 'Bought Quantum Helm from ALGO1C...Q8W3', amount: '-7.8 ALGO', status: 'confirmed', details: { assetId: '#33102', from: 'ALGO1C...Q8W3', txId: 'TX2A7B...N5K1' } },
  { id: '3', date: '2024-06-13', type: 'SELL', description: 'Sold Pixel Sword to ALGO9D...R2T5', amount: '+4.2 ALGO', status: 'confirmed', details: { assetId: '#22098', to: 'ALGO9D...R2T5', txId: 'TX5C9D...Q7W3' } },
  { id: '4', date: '2024-06-12', type: 'LIST', description: 'Listed Shadow Dagger for 3.5 ALGO', amount: '3.5 ALGO', status: 'confirmed', details: { assetId: '#18456', txId: 'TX1E4F...L8R2' } },
  { id: '5', date: '2024-06-11', type: 'TRANSFER', description: 'Sent Chain Mail to ALGO7B...M4P1', amount: '-1 NFT', status: 'confirmed', details: { assetId: '#29301', to: 'ALGO7B...M4P1', txId: 'TX3G6H...J9S4' } },
  { id: '6', date: '2024-06-10', type: 'MINT', description: 'Minted Storm Ring #52891', amount: '+1 NFT', status: 'confirmed', details: { assetId: '#52891', txId: 'TX7I8J...K1T6' } },
  { id: '7', date: '2024-06-09', type: 'BUY', description: 'Bought Titan Armor from ALGO5E...N6Y7', amount: '-9.2 ALGO', status: 'confirmed', details: { assetId: '#41203', from: 'ALGO5E...N6Y7', txId: 'TX9K2L...M3U8' } },
  { id: '8', date: '2024-06-08', type: 'SELL', description: 'Sold Crystal Shard to ALGO2F...J1H9', amount: '+2.1 ALGO', status: 'confirmed', details: { assetId: '#15678', to: 'ALGO2F...J1H9', txId: 'TX4M5N...O6V1' } },
  { id: '9', date: '2024-06-07', type: 'LIST', description: 'Listed Iron Gauntlet for 5.0 ALGO', amount: '5.0 ALGO', status: 'pending', details: { assetId: '#38762', txId: 'TX6P7Q...R8W2' } },
  { id: '10', date: '2024-06-06', type: 'MINT', description: 'Minted Void Cape #61024', amount: '+1 NFT', status: 'confirmed', details: { assetId: '#61024', txId: 'TX8R9S...T1X4' } },
  { id: '11', date: '2024-06-05', type: 'BUY', description: 'Bought Digital Crown from ALGO9D...R2T5', amount: '-25.0 ALGO', status: 'confirmed', details: { assetId: '#44155', from: 'ALGO9D...R2T5', txId: 'TX2S3T...U5Y6' } },
  { id: '12', date: '2024-06-04', type: 'TRANSFER', description: 'Received Plasma Rifle from ALGO3F...X9K2', amount: '+1 NFT', status: 'confirmed', details: { assetId: '#47890', from: 'ALGO3F...X9K2', txId: 'TX6U7V...W8Z1' } },
  { id: '13', date: '2024-06-03', type: 'SELL', description: 'Sold Bronze Shield to ALGO7B...M4P1', amount: '+1.8 ALGO', status: 'confirmed', details: { assetId: '#23456', to: 'ALGO7B...M4P1', txId: 'TX9V0W...X2A3' } },
  { id: '14', date: '2024-06-02', type: 'LIST', description: 'Listed Pixel Potion for 0.8 ALGO', amount: '0.8 ALGO', status: 'pending', details: { assetId: '#56789', txId: 'TX3W4X...Y5B6' } },
  { id: '15', date: '2024-06-01', type: 'MINT', description: 'Minted Cyber Shield #73102', amount: '+1 NFT', status: 'confirmed', details: { assetId: '#73102', txId: 'TX7Y8Z...A9C0' } },
]

const PORTFOLIO_DATA = [
  { day: 'Day 1', value: 45 },
  { day: 'Day 2', value: 52 },
  { day: 'Day 3', value: 48 },
  { day: 'Day 4', value: 61 },
  { day: 'Day 5', value: 58 },
  { day: 'Day 6', value: 67 },
  { day: 'Day 7', value: 72 },
  { day: 'Day 8', value: 69 },
  { day: 'Day 9', value: 78 },
  { day: 'Day 10', value: 85 },
  { day: 'Day 11', value: 82 },
  { day: 'Day 12', value: 91 },
  { day: 'Day 13', value: 88 },
  { day: 'Day 14', value: 95 },
]

const RARITY_DISTRIBUTION = [
  { rarity: 'Common', count: 5, max: 10, color: '#888888' },
  { rarity: 'Rare', count: 7, max: 10, color: '#00D4FF' },
  { rarity: 'Epic', count: 4, max: 10, color: '#FF00FF' },
  { rarity: 'Legendary', count: 3, max: 10, color: '#FFB800' },
]

const TOP_HOLDINGS: Holding[] = [
  { name: 'Digital Crown', rarity: 'Legendary', value: '25.0 ALGO', quantity: 1 },
  { name: 'Titan Armor', rarity: 'Epic', value: '9.2 ALGO', quantity: 1 },
  { name: 'Void Cape', rarity: 'Epic', value: '8.9 ALGO', quantity: 1 },
  { name: 'Quantum Helm', rarity: 'Epic', value: '7.8 ALGO', quantity: 1 },
  { name: 'Plasma Rifle', rarity: 'Rare', value: '4.1 ALGO', quantity: 1 },
]

const RARITY_COLOR: Record<string, string> = {
  Common: '#888888',
  Rare: '#00D4FF',
  Epic: '#FF00FF',
  Legendary: '#FFB800',
}

/* ===== CUSTOM TOOLTIP ===== */

function PortfolioTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#2D2D2D] border border-[#444] p-2 text-xs font-terminal">
      <div className="text-term-dim">{label}</div>
      <div className="text-term-green">{payload[0].value.toFixed(1)} ALGO</div>
    </div>
  )
}

/* ===== API FETCH HELPERS ===== */

interface ApiTransaction {
  id: string
  type: string
  assetId: number
  assetName: string
  from: string
  to: string
  amount: number
  status: string
  txHash: string
  createdAt: string
}

function mapApiTransaction(tx: ApiTransaction, index: number): Transaction {
  const typeMap: Record<string, Transaction['type']> = {
    mint: 'MINT', buy: 'BUY', sell: 'SELL', transfer: 'TRANSFER', list: 'LIST', cancel: 'LIST',
  }
  const txType = typeMap[tx.type.toLowerCase()] || 'MINT'
  const isPositive = tx.type === 'mint' || tx.type === 'sell' || (tx.type === 'buy' && false)
  let amountStr = ''
  if (tx.type === 'mint') amountStr = '+1 NFT'
  else if (tx.type === 'sell') amountStr = `+${tx.amount} ALGO`
  else if (tx.type === 'buy') amountStr = `-${tx.amount} ALGO`
  else if (tx.type === 'list') amountStr = `${tx.amount} ALGO`
  else if (tx.type === 'transfer') amountStr = '-1 NFT'
  else amountStr = `${tx.amount} ALGO`

  const description = (() => {
    switch (tx.type.toLowerCase()) {
      case 'mint': return `Minted ${tx.assetName} #${tx.assetId}`
      case 'buy': return `Bought ${tx.assetName} from ${tx.from || 'market'}`
      case 'sell': return `Sold ${tx.assetName} to ${tx.to || 'buyer'}`
      case 'list': return `Listed ${tx.assetName} for ${tx.amount} ALGO`
      case 'transfer': return `Sent ${tx.assetName} to ${tx.to || 'receiver'}`
      default: return `${tx.type} ${tx.assetName}`
    }
  })()

  return {
    id: tx.id || String(index + 1),
    date: tx.createdAt ? tx.createdAt.split('T')[0] : '',
    type: txType,
    description,
    amount: amountStr,
    status: tx.status as 'confirmed' | 'pending',
    details: {
      assetId: `#${tx.assetId}`,
      from: tx.from || undefined,
      to: tx.to || undefined,
      txId: tx.txHash,
    },
  }
}

/* ===== COMPONENT ===== */

export default function ProfilePage() {
  const { walletConnected, walletAddress, setShowWalletModal } = useDeShopStore()

  const [username, setUsername] = useState('anon_user')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(username)
  const [copied, setCopied] = useState(false)
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [steamConnected, setSteamConnected] = useState(false)
  const [minecraftConnected, setMinecraftConnected] = useState(true)
  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setApiTransactions(data.map(mapApiTransaction))
        }
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const displayTransactions = apiTransactions.length > 0 ? apiTransactions : TRANSACTIONS

  const displayAddress = walletAddress || 'NOT_CONNECTED___________________________'

  const handleCopy = useCallback(() => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [walletAddress])

  const handleSaveUsername = useCallback(() => {
    if (editValue.trim()) {
      setUsername(editValue.trim())
    }
    setIsEditing(false)
  }, [editValue])

  const toggleExpand = useCallback((id: string) => {
    setExpandedTx((prev) => (prev === id ? null : id))
  }, [])

  const txTypeColor = (type: Transaction['type']): string => {
    switch (type) {
      case 'MINT': return 'text-[#33FF33]'
      case 'BUY': return 'text-[#00D4FF]'
      case 'SELL': return 'text-[#FFB800]'
      case 'TRANSFER': return 'text-[#FF00FF]'
      case 'LIST': return 'text-[#FFB800]'
      default: return 'text-[#CCCCCC]'
    }
  }

  const txTypeBg = (type: Transaction['type']): string => {
    switch (type) {
      case 'MINT': return 'bg-[#33FF33]/10 border-[#33FF33]/30'
      case 'BUY': return 'bg-[#00D4FF]/10 border-[#00D4FF]/30'
      case 'SELL': return 'bg-[#FFB800]/10 border-[#FFB800]/30'
      case 'TRANSFER': return 'bg-[#FF00FF]/10 border-[#FF00FF]/30'
      case 'LIST': return 'bg-[#FFB800]/10 border-[#FFB800]/30'
      default: return 'bg-[#3D3D3D] border-[#444]'
    }
  }

  const barChar = (count: number, max: number): string => {
    const total = 20
    const filled = Math.round((count / max) * total)
    return '█'.repeat(filled) + '░'.repeat(total - filled)
  }

  return (
    <div className="space-y-4">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-chrome">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="terminal-dot terminal-dot-red" />
            <span className="terminal-dot terminal-dot-yellow" />
            <span className="terminal-dot terminal-dot-green" />
          </div>
          <span className="terminal-title">profile@de-shop:~/profile</span>
        </div>
        <div className="terminal-card-body">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* ASCII Avatar */}
            <div className="flex-shrink-0 bg-[#1A1A1A] border border-[#444] p-3 text-term-green text-[10px] leading-tight font-terminal select-none">
              <pre className="ascii-art text-[9px]">{`
  ┌──────┐
  │ ◉  ◉ │
  │ ╰──╯ │
  │ └──┘ │
  └──────┘
`}</pre>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                      className="terminal-input text-sm w-48"
                      autoFocus
                      maxLength={20}
                    />
                    <button onClick={handleSaveUsername} className="terminal-btn-primary terminal-btn p-1.5">
                      <Save className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditValue(username) }} className="terminal-btn-danger terminal-btn p-1.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-term-green text-lg font-bold font-terminal glow-green">{username}</span>
                    <button
                      onClick={() => { setIsEditing(true); setEditValue(username) }}
                      className="terminal-btn p-1 opacity-50 hover:opacity-100"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-2">
                <span className="text-term-dim text-xs font-terminal">addr:</span>
                <span className="text-term-cyan text-xs font-terminal truncate max-w-[280px]">
                  {walletConnected ? displayAddress : 'NOT CONNECTED'}
                </span>
                {walletConnected && (
                  <button
                    onClick={handleCopy}
                    className="terminal-btn p-1 text-[10px]"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3 h-3 text-term-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Member Since & Status */}
              <div className="flex items-center gap-4 text-xs font-terminal">
                <span className="text-term-dim">
                  joined: <span className="text-term-text">2024-01-15</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`status-dot ${walletConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
                  <span className={walletConnected ? 'text-term-green' : 'text-term-red'}>
                    {walletConnected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </span>
              </div>

              {!walletConnected && (
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="terminal-btn terminal-btn-primary text-xs mt-1"
                >
                  <span className="prompt-prefix mr-1">$</span> connect wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Achievements */}
        <div className="terminal-card lg:col-span-2">
          <div className="terminal-card-header">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">achievements.log</span>
            <span className="text-[10px] text-term-dim font-terminal">
              {ACHIEVEMENTS.filter((a) => a.unlocked).length}/{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="terminal-card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ACHIEVEMENTS.map((ach) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: parseInt(ach.id) * 0.03 }}
                  className={`
                    relative border p-3 text-center font-terminal transition-all
                    ${ach.unlocked
                      ? 'border-[#33FF33]/40 bg-[#33FF33]/5'
                      : 'border-[#444] bg-[#1A1A1A] opacity-50'
                    }
                  `}
                  style={ach.unlocked ? { boxShadow: '0 0 8px rgba(51, 255, 51, 0.1)' } : {}}
                >
                  {/* Lock overlay for locked achievements */}
                  {!ach.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]/60 z-10">
                      <span className="text-term-dim text-lg">🔒</span>
                    </div>
                  )}
                  <div className="text-2xl mb-1">{ach.emoji}</div>
                  <div className={`text-[11px] font-bold ${ach.unlocked ? 'text-term-green glow-green' : 'text-term-dim'}`}>
                    {ach.name}
                  </div>
                  <div className="text-[9px] text-term-dim mt-1">
                    {ach.unlockDate || 'LOCKED'}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="terminal-card">
          <div className="terminal-card-header">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">transactions.log</span>
            <span className="text-[10px] text-term-dim font-terminal">{displayTransactions.length} entries</span>
          </div>
          <div className="terminal-card-body p-0">
            <div className="max-h-96 overflow-y-auto">
              {displayTransactions.map((tx) => (
                <div key={tx.id}>
                  <button
                    onClick={() => toggleExpand(tx.id)}
                    className="w-full text-left px-4 py-2.5 border-b border-[#333] hover:bg-[#333]/50 transition-colors font-terminal text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[9px] px-1.5 py-0.5 border ${txTypeBg(tx.type)} ${txTypeColor(tx.type)} whitespace-nowrap`}>
                          {tx.type}
                        </span>
                        <span className="text-term-text truncate">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={tx.amount.startsWith('+') ? 'text-term-green' : tx.amount.startsWith('-') ? 'text-term-red' : 'text-term-amber'}>
                          {tx.amount}
                        </span>
                        <span className="text-[10px]">
                          {tx.status === 'confirmed' ? '✓' : '⏳'}
                        </span>
                        {expandedTx === tx.id ? (
                          <ChevronUp className="w-3 h-3 text-term-dim" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-term-dim" />
                        )}
                      </div>
                    </div>
                    <div className="text-term-dim text-[9px] mt-0.5">
                      [{tx.date}]
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedTx === tx.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-[#1A1A1A]"
                      >
                        <div className="px-4 py-3 font-terminal text-[11px] space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-term-dim">Asset:</span>
                            <span className="text-term-cyan">{tx.details.assetId}</span>
                          </div>
                          {tx.details.from && (
                            <div className="flex items-center gap-2">
                              <span className="text-term-dim">From:</span>
                              <span className="text-term-text">{tx.details.from}</span>
                            </div>
                          )}
                          {tx.details.to && (
                            <div className="flex items-center gap-2">
                              <span className="text-term-dim">To:</span>
                              <span className="text-term-text">{tx.details.to}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-term-dim">TxID:</span>
                            <span className="text-term-amber">{tx.details.txId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-term-dim">Status:</span>
                            <span className={tx.status === 'confirmed' ? 'text-term-green' : 'text-term-amber'}>
                              {tx.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Analytics */}
        <div className="terminal-card">
          <div className="terminal-card-header">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">portfolio.log</span>
          </div>
          <div className="terminal-card-body space-y-4">
            {/* Total Value */}
            <div className="flex items-baseline gap-2">
              <span className="text-term-dim text-xs font-terminal">total_value:</span>
              <span className="text-term-green text-xl font-bold font-terminal glow-green">95.4 ALGO</span>
              <span className="text-term-green text-xs font-terminal">(+12.3%)</span>
            </div>

            {/* Area Chart */}
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PORTFOLIO_DATA}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#33FF33" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#33FF33" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip content={<PortfolioTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#33FF33"
                    strokeWidth={1.5}
                    fill="url(#portfolioGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Rarity Distribution (ASCII bar chart) */}
            <div>
              <div className="text-term-dim text-[10px] font-terminal mb-2">{'// rarity_distribution'}</div>
              <div className="space-y-1.5 font-terminal text-[10px]">
                {RARITY_DISTRIBUTION.map((r) => (
                  <div key={r.rarity} className="flex items-center gap-2">
                    <span className="w-20 text-right" style={{ color: r.color }}>{r.rarity}</span>
                    <span style={{ color: r.color }}>{barChar(r.count, r.max)}</span>
                    <span className="text-term-dim">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Holdings */}
            <div>
              <div className="text-term-dim text-[10px] font-terminal mb-2">{'// top_holdings'}</div>
              <div className="space-y-1.5 font-terminal text-[11px]">
                {TOP_HOLDINGS.map((h, i) => (
                  <div key={h.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-term-dim w-4">{i + 1}.</span>
                      <span className="text-term-text">{h.name}</span>
                      <span
                        className="text-[9px] px-1 border"
                        style={{ color: RARITY_COLOR[h.rarity], borderColor: RARITY_COLOR[h.rarity] + '66' }}
                      >
                        {h.rarity}
                      </span>
                    </div>
                    <span className="text-term-green">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="terminal-card lg:col-span-2">
          <div className="terminal-card-header">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">accounts.log</span>
          </div>
          <div className="terminal-card-body">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Wallet Connection */}
              <div className="border border-[#444] p-4 font-terminal">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-term-cyan" />
                    <span className="text-term-text text-sm">Algorand Wallet</span>
                  </div>
                  <span className={`status-dot ${walletConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
                </div>
                <div className="text-[10px] text-term-dim mb-2">
                  {walletConnected
                    ? `Connected: ${walletAddress?.substring(0, 16)}...`
                    : 'Not connected'
                  }
                </div>
                {!walletConnected && (
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="terminal-btn terminal-btn-primary text-[10px] w-full"
                  >
                    Connect Wallet
                  </button>
                )}
                {walletConnected && (
                  <div className="text-[10px] text-term-green">✓ Active</div>
                )}
              </div>

              {/* Steam Integration */}
              <div className="border border-[#444] p-4 font-terminal">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-term-amber" />
                    <span className="text-term-text text-sm">Steam</span>
                  </div>
                  <span className={`status-dot ${steamConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
                </div>
                <div className="text-[10px] text-term-dim mb-2">
                  {steamConnected
                    ? 'Steam ID: 76561198052348'
                    : 'Not connected'
                  }
                </div>
                {!steamConnected ? (
                  <button
                    onClick={() => setSteamConnected(true)}
                    className="terminal-btn terminal-btn-primary text-[10px] w-full"
                  >
                    Connect Steam
                  </button>
                ) : (
                  <div className="text-[10px] text-term-green">✓ Synced — 12 items</div>
                )}
              </div>

              {/* Minecraft Integration */}
              <div className="border border-[#444] p-4 font-terminal">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-term-magenta" />
                    <span className="text-term-text text-sm">Minecraft</span>
                  </div>
                  <span className={`status-dot ${minecraftConnected ? 'status-dot-online' : 'status-dot-offline'}`} />
                </div>
                <div className="text-[10px] text-term-dim mb-2">
                  {minecraftConnected
                    ? 'IGN: pixel_crafter_42'
                    : 'Not connected'
                  }
                </div>
                {!minecraftConnected ? (
                  <button
                    onClick={() => setMinecraftConnected(true)}
                    className="terminal-btn terminal-btn-primary text-[10px] w-full"
                  >
                    Connect Minecraft
                  </button>
                ) : (
                  <div className="text-[10px] text-term-green">✓ Bridge Active — 142 assets synced</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
