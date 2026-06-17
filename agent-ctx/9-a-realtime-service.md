# Task 9-a: Real-time WebSocket Mini-Service

**Agent**: Main Agent (subagent for Task 9)
**Date**: 2026-06-17
**Task ID**: 9-a

## Summary
Built a standalone Bun + socket.io WebSocket mini-service at `mini-services/realtime-service/` (port 3003, path `/`, CORS allow-all) that broadcasts simulated marketplace events every 4-8 seconds. Wired the dashboard activity feed to consume these live events via a new `useRealtimeEvents` React hook that connects through the Caddy gateway using `io('/?XTransformPort=3003')` (never direct URL).

## Files Created / Modified

### Created
1. **`/home/z/my-project/mini-services/realtime-service/package.json`** — Bun project, deps: `socket.io`, scripts: `dev` (`bun --hot`), `start`
2. **`/home/z/my-project/mini-services/realtime-service/index.ts`** — socket.io server on hardcoded port 3003, path `/`, CORS `*`
3. **`/home/z/my-project/mini-services/realtime-service/start-realtime.sh`** — Bash helper that fully detaches the service via `setsid`
4. **`/home/z/my-project/src/hooks/useRealtimeEvents.ts`** — React hook returning `{ events, isConnected, stats, broadcastEvent, requestStats }`

### Modified
5. **`/home/z/my-project/src/components/pages/DashboardPage.tsx`** — `ActivityFeed` component now uses `useRealtimeEvents`:
   - Added `useMemo` import, `useRealtimeEvents`, `MarketEvent` import
   - Extended `ActivityItem.type` to include `TRANSFER | BRIDGE`
   - Added `TRANSFER` / `BRIDGE` color configs (magenta)
   - Added `marketEventToActivity()` mapper
   - Rewrote `ActivityFeed` to use realtime events with simulated fallback
   - Added LIVE / OFFLINE pulsing badge + "Realtime via WebSocket" label in card header

### Installed
- `socket.io` in `mini-services/realtime-service/`
- `socket.io-client@4.8.3` in main project

## Service Behavior (per spec)

- **Port**: 3003 (HARDCODED)
- **Path**: `/` (required by Caddy)
- **CORS**: `*` (all origins)
- **Welcome**: emits `welcome` event on connect with server time + online client count
- **Periodic events**: emits `marketplace-event` every 4-8s (random) with full MarketEvent payload
- **Event types**: MINT, TRADE, LIST, CANCEL, TRANSFER, BRIDGE
- **Rarity**: weighted distribution (common 60%, rare 25%, epic 12%, legendary 3%)
- **Asset names**: 20 names from spec (Neon Blade, Cyber Shield, Quantum Helm, ...)
- **Address format**: `0x${4 hex}...${4 hex}`
- **Tx hash**: `0x` + 64 hex chars
- **Amount**: scaled by rarity (common 0.5-5, rare 5-25, epic 25-100, legendary 100-500 ALGO)
- **subscribe**: acknowledged with `subscribed` event + ack callback
- **request-stats**: responds with random-walk LiveStats (onlineClients, eventsPerMinute, totalEvents, volume24h, activeWallets, gasPrice)
- **broadcast-event**: re-broadcasts client-triggered event to all OTHER clients (for real mints)
- **stats**: also pushed automatically every 5s

## Frontend Hook (`useRealtimeEvents`)

- Connects via `io('/?XTransformPort=3003', { transports: ['websocket','polling'], reconnection: true, ... })`
- Keeps last 50 events in state (newest first)
- Tracks `isConnected` (true on `connect`, false on `disconnect` / `connect_error`)
- Auto-reconnects indefinitely (reconnectionDelayMax: 10s)
- Exposes `broadcastEvent()` and `requestStats()` for client-triggered events
- Cleans up socket on unmount (`removeAllListeners` + `disconnect`)

## Dashboard Integration

- `ActivityFeed` uses `useRealtimeEvents()` for `events` and `isConnected`
- When `isConnected === true`: real WebSocket events take priority, simulated feed is paused (frozen as visual continuity tail)
- When `isConnected === false`: simulated feed resumes (every 8s)
- Card header now contains:
  - Pulsing green dot + "LIVE" badge when connected
  - Solid red dot + "OFFLINE" badge when disconnected
  - "Realtime via WebSocket" label (hidden on mobile, `hidden sm:inline-flex`)
  - Activity icon (green pulsing when live, dim when offline)
- Footer copy: "live events streaming..." (live) / "offline - showing simulated feed..." (offline)
- Auto-scroll to bottom on new events

## Verification

### ESLint
```
$ bun run lint
$ (clean - 0 errors, 0 warnings)
```

### Service Startup
- PID 8240 (stable, `bun --hot index.ts`)
- Listening on `*:3003`
- Log file: `/home/z/my-project/realtime-service.log`
- Sample event log:
  ```
  [evt] TRADE    common    Digital Crown    #65239 2.03 ALGO  0xe104...e586 -> 0x30c8...904e
  [+] client connected: W9D9NvAtkAhg2fgAAAAB (total: 1)
  [sub] W9D9NvAtkAhg2fgAAAAB subscribed: { channel: "marketplace-events" }
  ```

### Frontend (via agent-browser through Caddy port 81)
1. Loaded dashboard via `http://localhost:81/` (Caddy → Next.js)
2. Snapshot shows `LIVE` badge + `Realtime via WebSocket` label in activity.log card header
3. Console logs confirm:
   - `[realtime] welcome: {message: "Connected to De-Shop realtime marketplace feed", serverTime: 1781682729698, onlineClients: 1}`
   - `[realtime] subscribed: {ok: true, channel: "marketplace-events"}`
4. Screenshot: `/home/z/my-project/qa-16-realtime-dashboard.png`
5. VLM verification confirms all 4 acceptance criteria visible:
   - ✅ Green LIVE badge in card header
   - ✅ "Realtime via WebSocket" label visible
   - ✅ Activity items with asset names + ALGO amounts
   - ✅ Footer shows "live events streaming..."

## Critical Rules Compliance

- ✅ Port 3003 hardcoded (no env var)
- ✅ Path `/` (Caddy requirement)
- ✅ Frontend uses `io('/?XTransformPort=3003')` — never direct URL
- ✅ `bun --hot` for dev script (auto-restart on file change)
- ✅ Service is independent (own `package.json`, own deps)
- ✅ Existing functionality preserved (simulated fallback when service offline)

## Notes for Future Agents

- The service was started with `setsid` to fully detach from the controlling terminal — without it, the bash tool's subshell exit kills the bun process.
- When accessing the dashboard via `http://localhost:3000` directly (bypassing Caddy), the LIVE indicator will show OFFLINE because the relative `/?XTransformPort=3003` URL resolves to `localhost:3000` (Next.js, not Caddy). Always test via port 81 to verify realtime behavior.
- The service logs every emitted event to `/home/z/my-project/realtime-service.log` for easy debugging.
- Hook exposes `broadcastEvent()` and `requestStats()` — currently unused by UI but ready for the Mint flow to push real events to other dashboards.
