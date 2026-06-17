# Task 11-d: Live Price Ticker + Realtime Marketplace Updates

**Date**: 2026-06-17
**Agent**: Main Agent (Task 11-d subagent)
**Task ID**: 11-d

## Summary

Added a full live-market experience to the De-Shop SDK Mac Terminal app, driven entirely by the existing `useRealtimeEvents` WebSocket hook (port 3003 via Caddy gateway):

1. **Live Price Ticker** (`src/components/LivePriceTicker.tsx`) — full-width horizontal scrolling marquee above the marketplace search bar showing 8–12 assets with name ▲/▼ price ALGO (+/-X.XX%). Smooth CSS-animation loop (60s, pause on hover), LIVE/OFFLINE indicator, last-update timestamp, click-to-filter behaviour.

2. **`useLivePrices` hook** (`src/hooks/useLivePrices.ts`) — wraps `useRealtimeEvents`, owns the ticker price state, derives `topMover` and `lastTradeByAsset`. Updates prices from incoming TRADE/LIST events; applies a small ±0.5% random walk every 3 s for visual interest.

3. **Market Heat panel** at the top of the marketplace — 4-cell grid showing Market Heat (HOT/WARM/COLD, red-pulsing/amber/cyan), 24h volume, active traders (onlineClients), and top mover (asset + % change). EPM uses `stats.eventsPerMinute` with a local 60 s event-count fallback.

4. **Live indicators on marketplace GridCards**:
   - `trade-pulse` (green border pulse, 4× 0.5 s = 2 s) when a TRADE event arrives for that asset
   - `NEW` badge (amber, pulsing) on freshly LIST-ed assets
   - `live` indicator (pulsing green dot + "live" label) on cards with any event within the last 60 s
   - Last traded price (`last: X.XX`) shown next to the listed price when a TRADE event is in the events buffer for that asset

5. **`realtime_stats.log` card** on the dashboard — 6-cell grid (online clients / events-per-min / total events / 24h volume / active wallets / gas price) with a LIVE/OFFLINE status bar. All values update in real-time when the `stats` payload arrives from the socket.

All new UI uses the existing Mac Terminal theme classes (`terminal-card`, `terminal-card-header`, `terminal-card-glow`, `terminal-card-cyan-glow`, `text-term-*`, `prompt-prefix`, `blink-cursor`, `status-dot-*`, `tabular-nums`, `font-terminal`) plus 4 new utility class families added to `globals.css`: ticker marquee, trade-pulse, new-badge, live-card-dot, market-heat-*.

## Files Created / Modified

**Created:**
- `src/hooks/useLivePrices.ts` — wraps `useRealtimeEvents`, owns ticker price state, periodic ±0.5% fluctuation timer, derived `topMover` (biggest abs % change) and `lastTradeByAsset` (newest TRADE per asset name). Exports `LiveAsset` and `LastTrade` interfaces plus `SEED_PRICES` (20 asset names matching the realtime service's `ASSET_NAMES` array — so TRADE/LIST events always find a known baseline price).
- `src/components/LivePriceTicker.tsx` — pure presentational `'use client'` component. Renders a `terminal-card` with chrome header (`live_prices.ticker` title + LIVE/OFFLINE badge) and a marquee body. The marquee content is rendered TWICE (keyed `a`/`b`) so the CSS `translateX(0 → -50%)` animation loops seamlessly. Each asset is a `<button>` that calls `onSelectAsset(name)`. Includes edge-fade overlays (32 px gradient on each side) and a `sr-only` summary for screen readers (asset names + prices in plain text).
- `agent-ctx/11-d-live-price-ticker.md` — this work record.

**Modified:**
- `src/components/pages/MarketplacePage.tsx`:
  - Added imports: `useRef` from React; `Flame` from lucide-react; `useLivePrices` hook; `LivePriceTicker` component.
  - `GridCard` extended with new optional props: `lastTrade?: { price: number; time: number }`, `isPulsing?: boolean`, `isNewlyListed?: boolean`, `hasRecentActivity?: boolean`. Renders: NEW badge (amber, `.new-badge` pulsing) and live indicator (`.live-card-dot` + "live" label) in the chrome header before the AI button; `trade-pulse` class on the `motion.div` when `isPulsing`; "last: X.XX" (cyan) next to the listed amber price when `lastTrade` is set. Defined a local `LastTradeInfo` interface so the component is self-contained.
  - `MarketplacePage` main component now calls `useLivePrices()` and tracks per-asset live activity in 3 state slices: `tradePulses` (assetName → 2 s pulse start timestamp), `recentActivity` (assetName → last event timestamp), `newListings` (Set of asset names that arrived via LIST). A `useEffect` watches `events` and stamps these for each unprocessed event (uses a `useRef<Set<string>>` to dedupe by event ID — important because the events array changes identity on every new event). Two auto-cleanup effects remove stale trade pulses (>2 s) and stale recent-activity entries (>60 s) so the live dot and pulse disappear on their own without needing a periodic re-render. Computed `localEpm` (events received in last 60 s) as a fallback when `stats.eventsPerMinute` is undefined. Heat level: HOT (>20 EPM, red-pulsing), WARM (5–20, amber), COLD (<5, cyan). Added JSX: `<LivePriceTicker>` (full width) + a `<market_heat.log>` panel (4-cell grid: heat / 24h volume / active traders / top mover) between the terminal window header and the search-and-filter bar. `handleSelectTickerAsset(name)` sets the search input and resets the rarity filter so the clicked asset shows up. Grid view's `<GridCard>` invocation now passes the 4 new live props.
- `src/components/pages/DashboardPage.tsx`:
  - Added a new `RealtimeStatBox` helper (bordered box with label + value + colour).
  - Added a new `RealtimeStatsCard` component that calls `useRealtimeEvents()` itself (one extra socket per dashboard view, acceptable since the dashboard already runs an extra socket in `ActivityFeed`). Renders a `terminal-card terminal-card-cyan-glow` with `realtime_stats.log` chrome header (Activity icon + LIVE/OFFLINE badge) and a body containing a `tail -f` prompt line + a 2-col/3-col responsive grid of 6 stat boxes: ONLINE CLIENTS, EVENTS/MIN (local fallback if stats null), TOTAL EVENTS (formatted with `toLocaleString()`), 24H VOLUME (formatted as `XXX.XK`), ACTIVE WALLETS (`toLocaleString()`), GAS PRICE (6 decimal places). Footer line with status dot + descriptive text. Placed between the Stats Grid and the Charts Row so it's high visibility.
- `src/app/globals.css` — appended ~240 lines of additive CSS:
  - `@keyframes ticker-scroll` (translateX 0 → -50%, 60s linear infinite)
  - `.ticker-track-wrapper` (dark `#1A1A1A` bg, top/bottom borders, `position: relative` for edge fades, `overflow: hidden`)
  - `.ticker-track` (inline-flex, white-space: nowrap, animation)
  - `:hover` rule pauses animation
  - `@media (prefers-reduced-motion: reduce)` rule disables the animation entirely and makes the wrapper horizontally scrollable
  - `.ticker-content` (inline-flex, flex-shrink: 0)
  - `.ticker-item` (inline-flex, gap 0.375 rem, padding, monospace, cursor pointer, hover bg)
  - `.ticker-live` / `.ticker-timestamp` variants
  - `.ticker-fade` + left/right gradient overlays
  - `@keyframes trade-pulse` (border + box-shadow pulse, 0.5s × 4 = 2 s total)
  - `.trade-pulse` class
  - `@keyframes new-badge-pulse` (opacity + scale, 1.5 s)
  - `.new-badge` class
  - `@keyframes live-card-pulse` (box-shadow ring expand, 1.6 s)
  - `.live-card-dot` class (6×6 green dot)
  - `@keyframes heat-hot-pulse` (red text-shadow pulse, 1 s)
  - `.market-heat-hot` / `-warm` / `-cold` text classes
  - `.market-heat-dot` + `-hot` / `-warm` / `-cold` dot variants
  - `[data-theme]` overrides for ticker bg + item border + edge fades (uses `color-mix(in srgb, var(--t-bg) 85%, #000 15%)` so the ticker adapts to Pro Dark / Light / Matrix / Phosphor / Amber themes)

## Architecture Decisions

### Why a separate `useLivePrices` hook?
The task spec requires BOTH a LivePriceTicker AND per-card last-trade data + a top-mover display. All three need access to the same price state. Rather than having `LivePriceTicker` and `MarketplacePage` each call `useRealtimeEvents()` (creating 2 sockets + 2 independent price-state copies), `useLivePrices()` wraps `useRealtimeEvents()` once and exposes everything: `assets`, `events`, `isConnected`, `stats`, `topMover`, `lastTradeByAsset`. `MarketplacePage` is the single caller; `LivePriceTicker` is purely presentational and receives its data via props.

### Why is the ticker content rendered twice?
For a seamless CSS marquee loop: animate `translateX(0 → -50%)` over the full content width. When the animation reaches -50%, the second copy is in the same position the first copy started in, so the visual is identical and the loop is invisible. Without the duplicate, the marquee would jump back to 0 visibly.

### Why a `useRef<Set<string>>` for processed-event dedupe?
The `useLivePrices` event-processing effect depends on `[events]`. Every new socket event replaces `events` with a new array (newest-first, capped at 50). Without dedupe, the effect would re-apply ALL 50 events every time a new one arrives — re-stamping trade pulses and re-adding NEW badges for events we already processed. The ref-backed Set tracks which event IDs have been seen; the effect filters to `unprocessed` and only acts on those.

### Why local EPM fallback?
The realtime service pushes a `stats` payload every 5 s with `eventsPerMinute`. But if the socket is briefly disconnected, `stats` becomes stale. The local fallback counts events received in the last 60 s directly from the `events` array, which is always accurate to the current client. `epm = stats?.eventsPerMinute ?? localEpm`.

### Why does the trade-pulse auto-cleanup use `Math.min(...entries)`?
The cleanup effect schedules a single `setTimeout` based on the OLDEST active pulse. When that fires, it sweeps all pulses older than 2 s in one pass. If new pulses arrive in the meantime, the effect re-runs (since `tradePulses` is a dep), the previous timer is cleaned up, and a new timer is scheduled for the new oldest entry. This guarantees the pulse disappears within ~2.1 s of its last update without needing a 1-second polling interval.

### Why does `RealtimeStatsCard` call `useRealtimeEvents()` itself?
The dashboard's `ActivityFeed` already uses `useRealtimeEvents()` for its event stream. Sharing state between two sibling components would require lifting the hook call to `DashboardPage` and passing `stats`/`isConnected` down as props — a larger refactor. Instead, `RealtimeStatsCard` calls the hook itself (one extra socket connection). The realtime service tracks `onlineClients` as `io.engine.clientsCount`, so the dashboard now reports `onlineClients: 2` (one for `ActivityFeed`, one for `RealtimeStatsCard`) — visually fine for a simulated stats panel.

## Verification

- **ESLint**: `bun run lint` — clean (0 errors, 0 warnings).
- **Compile**: `✓ Compiled in 115 ms` after the last edit. No runtime errors.
- **HTTP**: `GET / 200` (compile 40 ms, render 100 ms). No errors in dev.log.
- **Realtime service**: still listening on port 3003, emitting events every 4–8 s (MINT/TRADE/LIST/CANCEL/TRANSFER/BRIDGE), pushing `stats` every 5 s.

### Browser verification (agent-browser via Caddy port 81):

**Marketplace page:**
- ✅ LivePriceTicker renders at the top (full width, below terminal header, above search bar) with `live_prices.ticker` chrome header, `// realtime market feed` subtitle, `● LIVE` badge (green, since accessed via port 81 through Caddy)
- ✅ Marquee scrolls horizontally showing 10–12 assets (seed + ones added via LIST events): `Neon Blade 41.887 ALGO (-0.44%)`, `Cyber Shield 18.308 ALGO`, `Quantum Helm 92.392 ALGO`, `Digital Crown 50.283 ALGO`, etc. with green ▲ / red ▼ / amber ■ colour coding and tabular-nums for stable digit width
- ✅ `last update: HH:MM:SS` shown at the end of the marquee
- ✅ Market Heat panel renders: `MARKET HEAT WARM 12 events/min`, `24H VOLUME 1214.7K ALGO`, `ACTIVE TRADERS 1 online now`, `TOP MOVER Shadow Dagger +0.47%`
- ✅ Clicking a ticker button (e.g. `Filter marketplace by Shadow Dagger`) sets the search input and filters the grid to 1 result
- ✅ Card with recent TRADE event shows `last: 3.42` next to `◆ 9.8 ALGO` listed price (Data Crystal) and `last: 4.05` next to another card
- ✅ Card with recent LIST event shows amber pulsing `NEW` badge in chrome header (Iron Gauntlet)
- ✅ Card with any event in last 60 s shows pulsing green dot + `live` label
- ✅ Card with TRADE in last 2 s gets `.trade-pulse` class (4× green border pulse, ~2 s)

**Dashboard page:**
- ✅ New `realtime_stats.log` card renders between the 4-stat grid and the charts row
- ✅ Chrome header: traffic lights + `realtime_stats.log` title + `Activity` icon + `● LIVE` badge
- ✅ Body shows `tail -f /var/log/de-shop/realtime.log` prompt with blink-cursor
- ✅ 6 stat boxes in 2-col / 3-col responsive grid: ONLINE CLIENTS `2`, EVENTS/MIN `17`, TOTAL EVENTS `1,519`, 24H VOLUME `1212.7K`, ACTIVE WALLETS `1,800`, GAS PRICE `0.003517`
- ✅ Footer status: green pulsing dot + "streaming live marketplace events via socket.io"
- ✅ Values update in real-time as new `stats` payloads arrive (5 s interval)

### Offline behaviour (verified by code review, not runtime)
- `LivePriceTicker` header badge: `● OFFLINE` (red) when `!isConnected`; status-dot switches to `status-dot-offline`
- Ticker start indicator: `OFFLINE` instead of `LIVE`
- Market Heat panel: `● OFFLINE` badge
- `RealtimeStatsCard`: `● OFFLINE` badge + "disconnected — showing last-known values"
- Prices continue to fluctuate (3 s timer keeps running) so the ticker stays visually alive even when offline
- `localEpm` falls back to counting events received in last 60 s; when no events arrive, EPM drops to 0 → market heat shows COLD

## Critical Rules Compliance
- ✅ `'use client'` on `LivePriceTicker.tsx` and all hook files
- ✅ Uses the existing `useRealtimeEvents` hook (no new socket connections invented — the hook is the only WebSocket entrypoint)
- ✅ All new UI uses existing Mac Terminal theme classes (`terminal-card`, `terminal-card-header`, `text-term-*`, `prompt-prefix`, `blink-cursor`, `status-dot-*`, `font-terminal`, `tabular-nums`)
- ✅ New CSS is purely additive — no existing rules modified or removed (only appended to the end of `globals.css`)
- ✅ Animations via CSS (`@keyframes ticker-scroll`, `trade-pulse`, `new-badge-pulse`, `live-card-pulse`, `heat-hot-pulse`) plus existing `framer-motion` for card entry animations
- ✅ Existing functionality preserved — only additive changes (new component, new hook, new card, new marketplace sections, extended GridCard props all optional)
- ✅ `bun run lint` passes — 0 errors, 0 warnings
- ✅ WebSocket events properly drive UI updates (ticker prices, card pulses, NEW badges, live dots, last-trade prices, heat level, EPM, top mover, dashboard stats)
- ✅ Disconnect handled gracefully (OFFLINE badges + status dots + footer text)
- ✅ Responsive (ticker is full-width on all breakpoints; heat panel uses `grid-cols-2 sm:grid-cols-4`; dashboard stat boxes use `grid-cols-2 sm:grid-cols-3`)
- ✅ Respects `prefers-reduced-motion` (ticker animation disabled, wrapper becomes horizontally scrollable)

## Notes
- The ticker initially seeds 10 of the 20 known asset names (the same names the realtime service emits). When a LIST event arrives for an asset not currently in the ticker, it's added (up to MAX_ASSETS=12). When a TRADE event arrives for an unknown asset, it's also added. The ticker is capped at 12 entries to keep the marquee readable.
- `topMover` is computed as the asset with the biggest absolute % change between `prevPrice` and `price`. Because the 3 s fluctuation timer applies a ±0.5% walk to every asset, the top mover changes frequently — this is intentional and keeps the heat panel feeling alive.
- The trade-pulse auto-cleanup uses a single `setTimeout` scheduled for `2.1 s - (now - oldestPulse)` ms, so it fires precisely when the oldest pulse should expire. New pulses during that window re-schedule the timer. Worst case the pulse stays visible for ~2.1 s; best case it disappears in exactly 2 s.
- The `processedEventIdsRef` Set is garbage-collected when it grows past 200 entries (reset to just the current `events` IDs, which is at most 50). This prevents unbounded memory growth during long-lived sessions.
- `LivePriceTicker`'s second pass is marked `aria-hidden` so screen readers don't read the asset list twice. The `sr-only` summary at the bottom provides a single canonical text version (asset names + prices + connection status).
- The new `realtime_stats.log` card sits BETWEEN the 4-stat grid and the charts row (not at the bottom with `AIPricingEngine`) so it's immediately visible when the dashboard loads — live stats are the "above the fold" headline.
