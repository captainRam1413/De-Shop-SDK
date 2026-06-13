# De-Shop SDK — Production Architecture

## Executive Summary

De-Shop SDK is a middleware platform enabling real-world game asset tokenization, cross-platform trading, and blockchain-backed ownership. This document outlines the production-grade architecture.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DE-SHOP SDK ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
├──────────────────┬──────────────────┬──────────────────┬────────────────────────┤
│   Unity Plugin   │   React Frontend │   Mobile SDK     │   Server-to-Server     │
│   (C#/.NET)      │   (TypeScript)   │   (React Native) │   API Clients          │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────────┘
         │                  │                  │                     │
         └──────────────────┴──────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Kong/Traefik)                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────────┐   │
│  │   Auth      │   Rate      │   Request   │   Circuit   │   Analytics     │   │
│  │   Middleware│   Limiting  │   Validation│   Breaker   │   & Logging     │   │
│  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐
│  Auth Service    │    │  Core API        │    │  Webhook Service             │
│  (JWT + OAuth)   │    │  (Flask/FastAPI) │    │  (Async Events)              │
└──────────────────┘    └────────┬─────────┘    └──────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│  Steam Service   │  │  Blockchain      │  │  Price Oracle                │
│  - OpenID Login  │  │  Service         │  │  - Skinport API              │
│  - Inventory     │  │  - NFT Minting   │  │  - Buff163 API               │
│  - Trade Offers  │  │  - Marketplace   │  │  - Market Analytics          │
└──────────────────┘  └────────┬─────────┘  └──────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│  PostgreSQL      │  │  Redis Cache     │  │  Message Queue               │
│  (Primary DB)    │  │  - Sessions      │  │  (RabbitMQ/Celery)           │
│  - Users         │  │  - Prices        │  │  - Async Jobs                │
│  - Assets        │  │  - Rate Limits   │  │  - Webhook Delivery          │
│  - NFTs          │  │  - Inventory     │  │                              │
│  - Transactions  │  │                  │  │                              │
└──────────────────┘  └──────────────────┘  └──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL INTEGRATIONS                                 │
├──────────────────┬──────────────────┬──────────────────┬────────────────────────┤
│   Steam API      │   OpenSea API    │   Algorand/Polygon│   Skinport/Buff163    │
│   (OpenID + IGS) │   (NFT Market)   │   (Blockchain)    │   (Price Feeds)       │
└──────────────────┴──────────────────┴──────────────────┴────────────────────────┘
```

---

## 2. Service Boundaries

### 2.1 Auth Service
```
Responsibilities:
├── Steam OpenID authentication
├── JWT token issuance/refresh
├── Session management
├── API key management (for server clients)
└── OAuth2 provider integration (future: Discord, Google)

Tech Stack:
├── Flask + Flask-JWT-Extended
├── Redis (session store)
└── SQLAlchemy (user persistence)
```

### 2.2 Core API Service
```
Responsibilities:
├── Asset management (CRUD)
├── Inventory operations
├── Marketplace listings
├── Transaction processing
└── Game integration webhooks

Tech Stack:
├── FastAPI (async support)
├── SQLAlchemy + Alembic
└── Pydantic (validation)
```

### 2.3 Blockchain Service
```
Responsibilities:
├── NFT minting/burning
├── Smart contract interactions
├── Wallet signature verification
├── Transaction monitoring
└── Cross-chain bridge (future)

Tech Stack:
├── Web3.py (EVM) or algokit-utils (Algorand)
├── IPFS/Arweave (metadata storage)
└── Celery (async job processing)
```

### 2.4 Price Oracle Service
```
Responsibilities:
├── Real-time price fetching
├── Price history tracking
├── Market trend analysis
├── Arbitrage detection
└── Price webhook notifications

Tech Stack:
├── aiohttp (async HTTP)
├── Redis (price cache)
├── TimescaleDB (time-series data)
└── Prophet/ML (price prediction - future)
```

### 2.5 Unity Plugin
```
Responsibilities:
├── SDK initialization
├── User authentication
├── Asset fetching
├── Skin application
├── Inventory UI
└── Marketplace integration

Tech Stack:
├── C#/.NET Standard 2.1
├── Unity Asset Bundle system
├── Newtonsoft.Json
└── UnityWebRequest
```

---

## 3. Data Flow Diagrams

### 3.1 Authentication Flow
```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  Client │                    │  Auth   │                    │  Steam  │
│         │                    │ Service │                    │  OpenID │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  1. GET /auth/steam          │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │  2. Redirect to Steam        │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  3. User authenticates       │                              │
     │────────────────────────────────────────────────────────────>│
     │                              │                              │
     │  4. Redirect back + openid   │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │  5. Validate assertion       │                              │
     │────────────────────────────────────────────────────────────>│
     │                              │                              │
     │  6. Issue JWT                │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  7. Store session            │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
```

### 3.2 NFT Minting Flow
```
┌─────────┐      ┌─────────┐      ┌─────────────┐      ┌──────────┐      ┌───────┐
│  Unity  │      │  Core   │      │  Blockchain │      │  IPFS    │      │Chain  │
│  Client │      │  API    │      │  Service    │      │  Storage │      │       │
└────┬────┘      └────┬────┘      └──────┬──────┘      └────┬─────┘      └───┬───┘
     │                │                   │                  │                │
     │ POST /mint     │                   │                  │                │
     │───────────────>│                   │                  │                │
     │                │ Verify ownership  │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │                  │                │
     │                │ Upload metadata   │                  │                │
     │                │─────────────────────────────────────>│                │
     │                │                   │                  │                │
     │                │ CID returned      │                  │                │
     │                │<─────────────────────────────────────│                │
     │                │                   │                  │                │
     │                │ Mint NFT          │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │  Create TX       │                │
     │                │                   │──────────────────────────────────>│
     │                │                   │                  │                │
     │                │                   │  TX confirmed    │                │
     │                │                   │<──────────────────────────────────│
     │                │                   │                  │                │
     │                │ NFT minted        │                  │                │
     │                │<──────────────────│                  │                │
     │                │                   │                  │                │
     │ Response       │                   │                  │                │
     │<───────────────│                   │                  │                │
     │                │                   │                  │                │
```

### 3.3 Marketplace Purchase Flow
```
┌─────────┐      ┌─────────┐      ┌─────────────┐      ┌──────────┐      ┌─────────┐
│  Buyer  │      │  Core   │      │  Blockchain │      │  Seller  │      │  Price  │
│  Client │      │  API    │      │  Service    │      │  (Owner) │      │ Oracle  │
└────┬────┘      └────┬────┘      └──────┬──────┘      └────┬─────┘      └────┬────┘
     │                │                   │                  │                │
     │ GET /price     │                   │                  │                │
     │───────────────────────────────────────────────────────────────────────>│
     │                │                   │                  │                │
     │ Price response │                   │                  │                │
     │<───────────────────────────────────────────────────────────────────────│
     │                │                   │                  │                │
     │ POST /buy      │                   │                  │                │
     │───────────────>│                   │                  │                │
     │                │ Verify listing    │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │                  │                │
     │                │ Verify funds      │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │                  │                │
     │                │ Execute swap      │                  │                │
     │                │──────────────────>│                  │                │
     │                │                   │                  │                │
     │                │  Transfer NFT     │                  │                │
     │                │─────────────────────────────────────>│                │
     │                │                   │                  │                │
     │                │  Transfer funds   │                  │                │
     │                │<─────────────────────────────────────│                │
     │                │                   │                  │                │
     │                │ Update DB         │                  │                │
     │                │                   │                  │                │
     │ Purchase       │                   │                  │                │
     │ complete       │                   │                  │                │
     │<───────────────│                   │                  │                │
     │                │                   │                  │                │
```

---

## 4. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION DEPLOYMENT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Kubernetes Cluster (EKS/GKE)                      │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Auth Pod   │  │  Core Pod   │  │  Blockchain │                  │   │
│  │  │  (x3)       │  │  (x5)       │  │  Pod (x3)   │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Price      │  │  Webhook    │  │  Worker     │                  │   │
│  │  │  Oracle     │  │  Pod (x2)   │  │  Pod (x3)   │                  │   │
│  │  │  (x2)       │  │             │  │             │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │   RDS PostgreSQL     │  │   ElastiCache Redis  │                        │
│  │   (Multi-AZ)         │  │   (Cluster Mode)     │                        │
│  └──────────────────────┘  └──────────────────────┘                        │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │   Amazon MQ          │  │   IPFS Pinning       │                        │
│  │   (RabbitMQ)         │  │   (Pinata/NFT.Storage)│                       │
│  └──────────────────────┘  └──────────────────────┘                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **API Framework** | FastAPI | Async support, auto OpenAPI docs, Pydantic validation |
| **Auth** | Flask-JWT-Extended + Authlib | Mature JWT handling, OAuth2 support |
| **Database** | PostgreSQL 15 | ACID compliance, JSONB for flexible schemas |
| **Cache** | Redis 7 | Sub-millisecond latency, pub/sub for events |
| **Message Queue** | RabbitMQ | Reliable delivery, dead letter queues |
| **Blockchain** | Polygon (EVM) | Low gas fees, Ethereum compatibility |
| **NFT Storage** | IPFS + Pinata | Decentralized, reliable pinning |
| **Unity SDK** | .NET Standard 2.1 | Cross-platform compatibility |
| **Frontend** | React 18 + Vite | Fast HMR, modern ecosystem |
| **API Gateway** | Kong | Rate limiting, auth plugins, analytics |
| **Monitoring** | Prometheus + Grafana | Metrics, alerting |
| **Logging** | ELK Stack | Centralized log aggregation |

---

## 6. Next Steps

1. **Phase 1**: Implement Auth Service with Steam OpenID
2. **Phase 2**: Build Core API with database models
3. **Phase 3**: Integrate blockchain layer (Polygon)
4. **Phase 4**: Build Price Oracle with Skinport API
5. **Phase 5**: Create Unity plugin
6. **Phase 6**: End-to-end demo integration

---

## 7. Phase 2: Frontend Architecture

Phase 2 introduces a complete premium frontend layer built on React 18, Vite, Zustand, Recharts, and Framer Motion. This section documents the new frontend-specific architecture.

### 7.1 Component Hierarchy

```
App.premium.tsx (Root)
│
├── ParticleBackground              ← Canvas layer (z-index: 0, pointer-events: none)
│
├── AnimatedBorder → Sidebar        ← Left panel with animated gradient border
│   ├── Brand (Hexagon icon + "DE-SHOP SDK v2.0")
│   ├── NavItems (6 routes)
│   │   ├── Dashboard               ← LayoutDashboard icon
│   │   ├── Game Arena              ← Gamepad2 icon
│   │   ├── Marketplace             ← Store icon
│   │   ├── Inventory               ← Backpack icon
│   │   ├── Terminal                ← Terminal icon
│   │   └── Profile                 ← User icon
│   ├── ThemeToggle                 ← Sun/Moon with Framer Motion
│   └── Footer (Connection status + Collapse toggle)
│
├── Main Content Area
│   ├── Header
│   │   ├── Network Badge (TESTNET)
│   │   ├── Status Message
│   │   ├── ThemeToggle (duplicate for header)
│   │   ├── Steam Profile (avatar + name)
│   │   └── Wallet Info / Connect Button
│   │
│   └── Page Content (AnimatePresence → motion.div)
│       │
│       ├── DashboardPremium
│       │   ├── StatsCard × 4          ← Volume, Listings, Floor, Trades
│       │   ├── PriceChart             ← Recharts AreaChart (7-day)
│       │   ├── RarityChart            ← Recharts BarChart (horizontal)
│       │   ├── ActivityFeed           ← 12 items with Framer Motion stagger
│       │   └── QuickActions           ← 4 navigation buttons
│       │
│       ├── GameShowcase               ← Premium game arena
│       │
│       ├── MarketplaceV2
│       │   ├── Search + Filter Bar
│       │   │   ├── SearchInput        ← Full-text query
│       │   │   ├── RarityFilter       ← Dropdown (common/rare/epic/legendary)
│       │   │   ├── PriceRangeFilter   ← Min/max ALGO
│       │   │   ├── SortDropdown       ← price_asc/desc, newest, rarity
│       │   │   └── ViewToggle         ← Grid / List
│       │   ├── ListingGrid / ListingList
│       │   │   └── SkinCard × 18+     ← With Wishlist heart icon
│       │   └── ItemDetailModal
│       │       ├── Item Info (name, rarity, price, seller, description)
│       │       ├── PriceHistory       ← Recharts AreaChart sparkline
│       │       ├── AI Analysis        ← Confidence score + recommendation
│       │       └── Action Buttons     ← Buy / List / Add to Wishlist
│       │
│       ├── TerminalConsole            ← Existing terminal component
│       │
│       └── ProfilePage
│           ├── UserHeader             ← Avatar, username, wallet, stats row
│           ├── AchievementBadges × 8  ← 3 earned (glow) + 5 locked (dim)
│           ├── TransactionHistory     ← 12 rows with type icons + status dots
│           ├── PortfolioAnalytics
│           │   ├── Portfolio Value    ← 312.5 ALGO with change %
│           │   ├── PieChart           ← Recharts rarity distribution
│           │   └── AreaChart          ← 7-day performance trend
│           └── ConnectedAccounts      ← Steam + Algorand Wallet status cards
│
├── WalletModal (overlay)             ← Premium wallet connection
├── Notifications (toast stack)       ← Framer Motion animated toasts
└── ConfettiEffect (triggered)        ← Success celebration particles
```

### 7.2 State Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Zustand Store (useDeShopStore)                │
│                                                                  │
│  ┌─────────────── State Slices ───────────────┐                 │
│  │                                             │                 │
│  │  Navigation                                 │                 │
│  │  ├── activePage: ActivePage                 │                 │
│  │  └── sidebarCollapsed: boolean              │                 │
│  │                                             │                 │
│  │  Data                                       │                 │
│  │  ├── inventory: Asset[]                     │                 │
│  │  ├── market: Asset[]                        │                 │
│  │  ├── steamItems: any[]                      │                 │
│  │  └── steamProfile: object | null            │                 │
│  │                                             │                 │
│  │  UI State                                   │                 │
│  │  ├── showWalletModal: boolean               │                 │
│  │  ├── showAnalysis: boolean                  │                 │
│  │  ├── analyzedAsset: Asset | null            │                 │
│  │  ├── marketFilter: string                   │                 │
│  │  ├── status: string                         │                 │
│  │  └── notifications: Notification[]          │                 │
│  │                                             │                 │
│  │  Minting                                    │                 │
│  │  ├── isMinting: boolean                     │                 │
│  │  ├── mintName: string                       │                 │
│  │  ├── mintRarity: string                     │                 │
│  │  └── mintType: MintSkinType                 │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  ┌─────────────── Actions ────────────────────┐                 │
│  │                                             │                 │
│  │  Navigation                                 │                 │
│  │  ├── setActivePage(page)                    │                 │
│  │  ├── setSidebarCollapsed(bool)              │                 │
│  │  └── toggleSidebar()                        │                 │
│  │                                             │                 │
│  │  Data                                       │                 │
│  │  ├── setInventory(Asset[])                  │                 │
│  │  ├── setMarket(Asset[])                     │                 │
│  │  ├── setSteamItems(any[])                   │                 │
│  │  └── setSteamProfile(object)                │                 │
│  │                                             │                 │
│  │  Notifications                              │                 │
│  │  ├── addNotification(type, message)         │                 │
│  │  │   └── auto-dismiss after 6 seconds       │                 │
│  │  ├── removeNotification(id)                 │                 │
│  │  └── clearNotifications()                   │                 │
│  │                                             │                 │
│  │  Reset                                      │                 │
│  │  └── resetOnDisconnect()                    │                 │
│  │      └── Clears inventory, skins, analysis  │                 │
│  │                                             │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
  ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
  │  Components  │   │  Backend API │    │  @txnlab/    │
  │  (subscribe  │   │  (Flask at   │    │  use-wallet  │
  │   via hooks) │   │  :5000)      │    │  (Algorand)  │
  └──────────────┘   └──────────────┘    └──────────────┘
```

**Data flow patterns:**
1. **User Action** → Component calls Zustand action → State updates → Subscribed components re-render
2. **API Fetch** → Component calls backend → Response updates Zustand state → UI reflects new data
3. **Wallet Event** → `@txnlab/use-wallet` hook → Component reads `activeAddress` → Conditional rendering

### 7.3 Theme System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Theme System                             │
│                                                              │
│  ┌──────────────── ThemeToggle.tsx ──────────────────┐      │
│  │                                                    │      │
│  │  Initialization Priority:                          │      │
│  │  1. localStorage('de-shop-theme')                  │      │
│  │  2. window.matchMedia('(prefers-color-scheme)')    │      │
│  │  3. Fallback: 'dark'                               │      │
│  │                                                    │      │
│  │  Toggle Action:                                    │      │
│  │  1. Flip theme state (dark ↔ light)                │      │
│  │  2. Apply to DOM:                                  │      │
│  │     dark → removeAttribute('data-theme')            │      │
│  │     light → setAttribute('data-theme', 'light')     │      │
│  │  3. Persist to localStorage                         │      │
│  │                                                    │      │
│  │  System Listener:                                  │      │
│  │  MediaQueryList 'change' event                     │      │
│  │  Only applies if no explicit user preference       │      │
│  │                                                    │      │
│  └────────────────────────────────────────────────────┘      │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────── CSS Variable Switching ──────────────┐       │
│  │                                                    │      │
│  │  :root {                          [data-theme="light"] { │
│  │    --space-void: #030508;           --space-void: #f8f9fa│
│  │    --green-neon: #00ff88;           --green-neon: #16a34a│
│  │    --green-dim: #166534;           --green-dim: #bbf7d0 │
│  │    --cyan-bright: #22d3ee;         --cyan-bright: #0891b2│
│  │    --purple-bright: #a855f7;       --purple-bright:#7c3aed│
│  │    --gold-bright: #fbbf24;         --gold-bright: #d97706│
│  │    --text-primary: #e0e0e0;        --text-primary: #1a1a2e│
│  │    --text-secondary: #888;         --text-secondary: #666│
│  │    --border-subtle: rgba(...);     --border-subtle: rgba(...)│
│  │    ... 50+ variables              ... 50+ variables    │
│  │  }                                                }      │
│  │                                                    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Icon Transition:                                            │
│  Moon ←→ Sun via Framer Motion                               │
│  rotate(-90/90) + scale(0→1) with 250ms easeInOut            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Animation System Design

```
┌─────────────────────────────────────────────────────────────┐
│                   Animation System Layers                    │
│                                                              │
│  ┌── Layer 1: Canvas Background ──────────────────────┐    │
│  │  Component: ParticleBackground.tsx                  │    │
│  │  Tech: HTML5 Canvas API (not DOM)                   │    │
│  │  Render: requestAnimationFrame loop                 │    │
│  │  Config:                                            │    │
│  │  ├── 65 particles (green/cyan theme colors)         │    │
│  │  ├── Drift: upward (0.15–0.45 px/frame)            │    │
│  │  ├── Wobble: sinusoidal horizontal offset           │    │
│  │  ├── Connections: lines between <120px particles    │    │
│  │  ├── DPR: devicePixelRatio-aware canvas sizing      │    │
│  │  └── Resize: debounced re-init on window resize     │    │
│  │  Accessibility: respects prefers-reduced-motion      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Layer 2: Framer Motion Transitions ──────────────┐    │
│  │  Library: framer-motion                            │    │
│  │  Patterns:                                         │    │
│  │  ├── Page transitions: opacity + y:8px slide       │    │
│  │  │   (AnimatePresence mode="wait")                 │    │
│  │  ├── Sidebar active bar: layoutId spring           │    │
│  │  │   (stiffness:300, damping:30)                   │    │
│  │  ├── Sidebar width: 220↔60px tween                │    │
│  │  │   (200ms easeInOut)                             │    │
│  │  ├── Card hover: scale(1.02) + shadow              │    │
│  │  ├── Toast notifications: slide-in-right + scale   │    │
│  │  │   (250ms easeOut, auto-dismiss 6s)              │    │
│  │  ├── Theme icon: rotate(±90°) + scale(0→1)        │    │
│  │  │   (250ms easeInOut)                             │    │
│  │  └── Activity feed: staggered fade-in              │    │
│  │       (0.05s delay between items)                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Layer 3: CSS Keyframe Animations ────────────────┐    │
│  │  Defined in: App.premium.css                        │    │
│  │  Animations:                                        │    │
│  │  ├── border-rotate: 4s linear infinite              │    │
│  │  │   (AnimatedBorder conic-gradient angle)          │    │
│  │  ├── shimmer: 1.5s ease infinite                   │    │
│  │  │   (loading skeleton gradient sweep)              │    │
│  │  ├── pulse-glow: 2s ease-in-out infinite           │    │
│  │  │   (active status indicators)                     │    │
│  │  ├── float: 3s ease-in-out infinite                │    │
│  │  │   (decorative floating elements)                 │    │
│  │  └── spin: 1s linear infinite                       │    │
│  │       (loading spinners)                            │    │
│  │  All paused under: prefers-reduced-motion: reduce   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Layer 4: Celebration Effects ────────────────────┐    │
│  │  Component: ConfettiEffect.tsx                      │    │
│  │  Tech: Framer Motion divs (DOM-based)               │    │
│  │  Config:                                            │    │
│  │  ├── 35 confetti particles per burst                │    │
│  │  ├── 8 colors: green, cyan, purple, gold variants   │    │
│  │  ├── 3 shapes: circle, rect, diamond                │    │
│  │  ├── Physics: velocity (300–600), gravity (400–700) │    │
│  │  ├── Drag: 0.97–0.99 per frame                     │    │
│  │  ├── Wobble: sinusoidal horizontal offset           │    │
│  │  ├── Duration: 3 seconds + 200ms cleanup            │    │
│  │  └── Trigger: success type notifications            │    │
│  │  Accessibility: disabled when prefers-reduced-motion │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 Responsive Breakpoint Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Mobile-First Responsive Strategy                │
│                                                              │
│  ┌── Mobile (≤640px) — Base Styles ──────────────────┐    │
│  │  Navigation:  Bottom nav bar (6 icon tabs)         │    │
│  │  Sidebar:     Hidden (overlay on toggle)           │    │
│  │  Cards:       Single column, full-width            │    │
│  │  Modals:      Edge-to-edge full screen             │    │
│  │  Touch:       44px minimum hit targets             │    │
│  │  Fonts:       Reduced sizes (12–18px)              │    │
│  │  Padding:     p-3 / gap-3                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Tablet (≤768px) ────────────────────────────────┐    │
│  │  Navigation:  Collapsed sidebar (60px icons only)  │    │
│  │  Cards:       2-column grid                        │    │
│  │  Header:      Compact (reduced padding)            │    │
│  │  Modals:      Side sheet (partial overlay)         │    │
│  │  Padding:     p-4 / gap-4                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Desktop (≤1024px) ──────────────────────────────┐    │
│  │  Navigation:  Expanded sidebar (220px + labels)    │    │
│  │  Cards:       3-column grid                        │    │
│  │  Header:      Full (all elements visible)          │    │
│  │  Modals:      Centered with backdrop               │    │
│  │  Padding:     p-5 / gap-5                          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌── Wide (>1280px) ─────────────────────────────────┐    │
│  │  Navigation:  Full sidebar + generous spacing      │    │
│  │  Cards:       4-column grid                        │    │
│  │  Container:   max-width: 1400px centered           │    │
│  │  Padding:     p-6 / gap-6                          │    │
│  │  Extra:       Wider charts, larger stat cards      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Special Breakpoints:                                        │
│  ├── ≤900px:  Original responsive (preserved for legacy)    │
│  ├── ≤480px:  Extra-small adjustments (MarketplaceV2)       │
│  └── High contrast: @media (prefers-contrast: high)         │
│                                                              │
│  CSS Implementation:                                         │
│  @media (max-width: 640px)  { /* mobile */ }                │
│  @media (max-width: 768px)  { /* tablet */ }                │
│  @media (max-width: 1024px) { /* desktop compact */ }       │
│  @media (max-width: 1280px) { /* desktop */ }               │
│  @media (prefers-reduced-motion: reduce) { /* a11y */ }     │
│  @media (prefers-contrast: high) { /* a11y */ }             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.6 Frontend Technology Additions (Phase 2)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Zustand** | 4.x | Global state management (replaces scattered `useState`) |
| **Recharts** | 2.x | Data visualization (AreaChart, BarChart, PieChart, sparklines) |
| **Framer Motion** | 11.x | Page transitions, micro-interactions, confetti, animated layout |
| **Lucide React** | latest | Icon system (40+ icons used across Phase 2 components) |

### 7.7 Phase 2 API Integration Points

```
┌───────────────────────────────────────────────────────────┐
│              Frontend ↔ Backend Data Flow                 │
│                                                           │
│  DashboardPremium                                        │
│  ├── GET /api/analytics/market-stats     → StatsCards    │
│  ├── GET /api/analytics/price-history/*  → PriceChart    │
│  └── GET /api/analytics/rarity-distribution → RarityChart│
│                                                           │
│  MarketplaceV2                                           │
│  ├── GET /api/search?q=&rarity=&...      → ListingGrid  │
│  ├── GET /api/analytics/price-history/*  → Sparkline    │
│  ├── POST /ai-price                      → AI Analysis  │
│  ├── GET  /api/wishlist                  → Wishlist     │
│  ├── POST /api/wishlist/<id>             → Add favorite │
│  └── DELETE /api/wishlist/<id>           → Remove fav   │
│                                                           │
│  ProfilePage                                             │
│  ├── GET /api/user/<wallet>/achievements → Badges       │
│  ├── GET /api/user/<wallet>/transactions → TxHistory    │
│  └── GET /api/analytics/portfolio/<wallet> → Portfolio  │
│                                                           │
│  App Shell                                               │
│  ├── GET /auth/nonce                     → Wallet auth  │
│  ├── POST /auth/verify                   → JWT issue    │
│  ├── GET /steam/inventory/<id>           → Steam items  │
│  └── WebSocket events                    → Live updates │
│                                                           │
└───────────────────────────────────────────────────────────┘
```
