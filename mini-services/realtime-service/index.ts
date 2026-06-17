/**
 * Real-time Marketplace Event Service (De-Shop SDK)
 * --------------------------------------------------
 * Standalone Bun + socket.io service that broadcasts simulated
 * marketplace events (mints, trades, listings, transfers, bridges)
 * to all connected dashboard clients.
 *
 * Port: 3003 (HARDCODED - Caddy gateway requirement)
 * Path: "/" (required by Caddy to forward correctly)
 *
 * Client connection URL: io('/?XTransformPort=3003')
 */

import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

/* ------------------------------------------------------------------ */
/* Type definitions                                                    */
/* ------------------------------------------------------------------ */

type EventType = 'MINT' | 'TRADE' | 'LIST' | 'CANCEL' | 'TRANSFER' | 'BRIDGE'
type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

interface MarketEvent {
  id: string
  type: EventType
  assetName: string
  assetId: number
  rarity: Rarity
  amount: number
  from: string
  to: string
  timestamp: number
  txHash: string
}

interface LiveStats {
  onlineClients: number
  eventsPerMinute: number
  totalEvents: number
  volume24h: number
  activeWallets: number
  gasPrice: number
}

/* ------------------------------------------------------------------ */
/* Random data generators                                              */
/* ------------------------------------------------------------------ */

const ASSET_NAMES = [
  'Neon Blade',
  'Cyber Shield',
  'Quantum Helm',
  'Digital Crown',
  'Plasma Rifle',
  'Void Cape',
  'Iron Gauntlet',
  'Shadow Dagger',
  'Pixel Potion',
  'Titan Armor',
  'Storm Ring',
  'Byte Staff',
  'Chain Mail',
  'Data Crystal',
  'Flame Scroll',
  'Neural Core',
  'Phase Dagger',
  'Cryo Ring',
  'Ghost Skin',
  'Obsidian Staff',
]

const EVENT_TYPES: EventType[] = ['MINT', 'TRADE', 'LIST', 'CANCEL', 'TRANSFER', 'BRIDGE']
const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']
// Weighted rarity distribution (common > rare > epic > legendary)
const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (const key of Object.keys(weights) as T[]) {
    r -= weights[key]
    if (r <= 0) return key
  }
  return Object.keys(weights)[0] as T
}

function randomHex(len: number): string {
  let s = ''
  const chars = '0123456789abcdef'
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)]
  return s
}

function randomAddress(): string {
  // Format: 0x{4 hex}...{4 hex}
  return `0x${randomHex(4)}...${randomHex(4)}`
}

function randomTxHash(): string {
  // 64-char hex string
  let h = '0x'
  for (let i = 0; i < 32; i++) h += randomHex(2)
  return h
}

function generateEvent(): MarketEvent {
  const type = pick(EVENT_TYPES)
  const rarity = pickWeighted(RARITY_WEIGHTS)

  // Amount depends on rarity
  const amountRange: Record<Rarity, [number, number]> = {
    common: [0.5, 5],
    rare: [5, 25],
    epic: [25, 100],
    legendary: [100, 500],
  }
  const [min, max] = amountRange[rarity]
  const amount = Math.round((min + Math.random() * (max - min)) * 1000) / 1000

  return {
    id: `${Date.now()}-${randomHex(6)}`,
    type,
    assetName: pick(ASSET_NAMES),
    assetId: Math.floor(Math.random() * 90000) + 10000,
    rarity,
    amount,
    from: randomAddress(),
    to: randomAddress(),
    timestamp: Date.now(),
    txHash: randomTxHash(),
  }
}

/* ------------------------------------------------------------------ */
/* Live stats (random walk)                                            */
/* ------------------------------------------------------------------ */

let totalEventsEmitted = 0
let volume24h = 1240000 + Math.random() * 50000
let activeWallets = 1847 + Math.floor(Math.random() * 50)
let gasPrice = 0.0031 + Math.random() * 0.0005

function randomWalk(value: number, delta: number, min: number, max: number): number {
  const next = value + (Math.random() - 0.5) * delta * 2
  return Math.max(min, Math.min(max, next))
}

function getStats(onlineClients: number): LiveStats {
  volume24h = randomWalk(volume24h, 2000, 1200000, 1300000)
  activeWallets = Math.max(1800, Math.min(2000, activeWallets + Math.floor((Math.random() - 0.5) * 6)))
  gasPrice = Math.max(0.002, Math.min(0.005, randomWalk(gasPrice, 0.0001, 0.002, 0.005)))

  return {
    onlineClients,
    eventsPerMinute: Math.floor(8 + Math.random() * 12),
    totalEvents: totalEventsEmitted,
    volume24h: Math.round(volume24h),
    activeWallets,
    gasPrice: Math.round(gasPrice * 1000000) / 1000000,
  }
}

/* ------------------------------------------------------------------ */
/* HTTP server + Socket.io setup                                       */
/* ------------------------------------------------------------------ */

const httpServer = createServer((req, res) => {
  // Simple health endpoint (useful for raw curl checks, not used by socket.io)
  if (req.url && req.url.split('?')[0] === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'realtime-service',
        uptime: process.uptime(),
        onlineClients: io.engine.clientsCount,
        totalEvents: totalEventsEmitted,
      }),
    )
    return
  }

  // For any other GET, return a simple info page so curl checks don't 404
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('De-Shop realtime-service (socket.io). Connect via WebSocket to /?XTransformPort=3003')
})

const io = new Server(httpServer, {
  // DO NOT change path - Caddy uses it to route to this port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

/* ------------------------------------------------------------------ */
/* Connection lifecycle                                                */
/* ------------------------------------------------------------------ */

io.on('connection', (socket) => {
  console.log(`[+] client connected: ${socket.id} (total: ${io.engine.clientsCount})`)

  // Send welcome message with current server time
  socket.emit('welcome', {
    message: 'Connected to De-Shop realtime marketplace feed',
    serverTime: Date.now(),
    onlineClients: io.engine.clientsCount,
  })

  // Acknowledge subscribe events
  socket.on('subscribe', (data, ack) => {
    console.log(`[sub] ${socket.id} subscribed:`, data ?? '(no payload)')
    if (typeof ack === 'function') {
      ack({ ok: true, subscribed: true, serverTime: Date.now() })
    }
    socket.emit('subscribed', { ok: true, channel: 'marketplace-events' })
  })

  // Respond to client-triggered stats requests
  socket.on('request-stats', (_data, ack) => {
    const stats = getStats(io.engine.clientsCount)
    if (typeof ack === 'function') {
      ack(stats)
    } else {
      socket.emit('stats', stats)
    }
  })

  // Re-broadcast a client-triggered event to all OTHER clients
  // (used for events like a real mint the user just performed)
  socket.on('broadcast-event', (payload: Partial<MarketEvent>, ack) => {
    const event: MarketEvent = {
      id: `${Date.now()}-${randomHex(6)}`,
      type: payload.type ?? 'MINT',
      assetName: payload.assetName ?? pick(ASSET_NAMES),
      assetId: payload.assetId ?? Math.floor(Math.random() * 90000) + 10000,
      rarity: payload.rarity ?? 'rare',
      amount: payload.amount ?? Math.round(Math.random() * 50 * 1000) / 1000,
      from: payload.from ?? randomAddress(),
      to: payload.to ?? randomAddress(),
      timestamp: Date.now(),
      txHash: payload.txHash ?? randomTxHash(),
    }

    console.log(`[bc] ${socket.id} broadcasted ${event.type} ${event.assetName}`)
    socket.broadcast.emit('marketplace-event', event)
    totalEventsEmitted++

    if (typeof ack === 'function') {
      ack({ ok: true, broadcasted: true, event })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`[-] client disconnected: ${socket.id} reason=${reason} (total: ${io.engine.clientsCount})`)
  })

  socket.on('error', (err) => {
    console.error(`[err] socket ${socket.id}:`, err)
  })
})

/* ------------------------------------------------------------------ */
/* Periodic marketplace event broadcaster                              */
/* ------------------------------------------------------------------ */

function scheduleNextEvent() {
  // Random interval between 4 and 8 seconds
  const delay = 4000 + Math.floor(Math.random() * 4000)
  setTimeout(() => {
    const event = generateEvent()
    io.emit('marketplace-event', event)
    totalEventsEmitted++
    console.log(
      `[evt] ${event.type.padEnd(8)} ${event.rarity.padEnd(9)} ${event.assetName.padEnd(16)} #${event.assetId} ${event.amount} ALGO  ${event.from} -> ${event.to}`,
    )
    scheduleNextEvent()
  }, delay)
}

// Also emit periodic stats so dashboard numbers feel alive
setInterval(() => {
  const stats = getStats(io.engine.clientsCount)
  io.emit('stats', stats)
}, 5000)

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

httpServer.listen(PORT, () => {
  console.log('---------------------------------------------------------')
  console.log(` De-Shop realtime-service listening on port ${PORT}`)
  console.log(` socket.io path: /`)
  console.log(` Client URL:     io('/?XTransformPort=3003')`)
  console.log(` Health check:   http://localhost:${PORT}/health`)
  console.log('---------------------------------------------------------')
  // Kick off the first event
  scheduleNextEvent()
})

/* ------------------------------------------------------------------ */
/* Graceful shutdown                                                   */
/* ------------------------------------------------------------------ */

function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      console.log('realtime-service stopped.')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
