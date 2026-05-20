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
