# Task 5-b — full-stack-developer (LeaderboardPage)

## Task
Create `/home/z/my-project/src/components/pages/LeaderboardPage.tsx` — a Mac Terminal themed "Top Traders Leaderboard" page for the De-Shop SDK Next.js 16 project. Ranks 20 mock Algorand traders by 24h volume with podium, full rankings table, live events side panel, timeframe selector, CSV export, and trader detail card.

## Files Created
- `/home/z/my-project/src/components/pages/LeaderboardPage.tsx` — **1185 lines**, `'use client'` React component. (Not wired into TerminalLayout — main agent handles that.)

## Files Modified
- `/home/z/my-project/worklog.md` — appended the Task 5-b section.

## Implementation Notes

### Structure (top to bottom)
1. **Header card** — `terminal-card` with traffic lights + `leaderboard@de-shop:~/top-traders` chrome bar. Title `top_traders.log` (green, bold, glow). Live "updated Ns ago" timer (increments every second, resets at 60s with a flash refresh animation). Subtitle `// live rankings • algorand testnet • 24h rolling window`. Rarity legend row (6 colored dots: common/uncommon/rare/epic/legendary/mythic). Export CSV button in the header.
2. **Timeframe selector** — segmented control (24H / 7D / 30D / ALL). Active = `var(--t-primary)` bg / `var(--t-bg)` text bold. Inactive = border-only dim. Switching timeframe swaps the dataset (4 deterministic datasets with shuffled rankings).
3. **Top-3 podium** — 3 cards. #1 center (amber border + glow + `★`, taller via `-mt-4`), #2 left (cyan + `◆`), #3 right (magenta + `◈`). Each card: rank, avatar emoji, handle + verified ✓, volume, trades, win rate, trend arrow, sparkline. Mobile order: 1→2→3 (stacked). Desktop order: 2→1→3 (1 tallest in center).
4. **Full rankings table (ranks 4–20)** — semantic `<table>` with `<th scope="col">`. Cols: #, Trader, Volume, Trades, Win%, Best, 7D, Status. Hover bg tint, clickable rows, bio tooltip on hover, win-rate color tiers, rarity badges, inline 60×20 SVG sparklines (deterministic per handle hash), status dots. `overflow-x-auto` on mobile.
5. **Side panel** — `live_events.log` card with traffic lights + LIVE indicator. Auto-prepends a new event every 4–6s (random), max 12. 30 event templates, 6 types (buy/sell/list/mint/cancel/transfer) each colored. `[HH:MM:SS]` timestamps. AnimatePresence enter/exit.
   - When a trader row is clicked, this panel swaps to a `TraderDetailCard` (identity, bio, 4-stat grid, 7D sparkline, last 5 mock trades, best 3 mock assets) with a close button.

### Layout
- 2-col grid on `lg:` — main (podium + table) takes `lg:col-span-2`, side panel takes `lg:col-span-1`.
- Single column on mobile/tablet.
- Sticky totals footer at bottom (total volume / active traders / avg trade) — `sticky bottom-0` with backdrop blur.

### Data Generation (deterministic, in-component)
- 20 trader handles (exact list from spec).
- 16 avatar emojis.
- FNV-1a string hash → mulberry32 PRNG per handle for volume/trades/winRate/bestRarity/status/trend7d/verified/bio.
- 4 timeframe datasets: base 24h × per-trader deterministic factor (24h=1, 7d≈5.5–8, 30d≈22–32, all≈85–155) so rankings shuffle across timeframes.
- Sparklines: 7 points from `hash(handle) ^ 0x9e3779b9` seed. Up/down determined by first-half vs second-half average.

### Theme Compatibility
- All colors via CSS vars (`var(--t-primary)` for green, `var(--t-cyan)`, `var(--t-amber)`, `var(--t-magenta)`, `var(--t-red)`, `var(--t-bg)`, `var(--t-text)`, `var(--t-dim)`, `var(--t-border)`, `var(--t-surface)`, `var(--t-elevated)`) or theme-aware Tailwind classes (`text-term-green`, `text-term-dim`, `terminal-card`, `terminal-dot-*`).
- Used `color-mix(in srgb, var(--t-*) N%, transparent)` for all tinted backgrounds and glows so they derive from the active theme. Verified theme-agnostic across pro-dark / light / matrix / phosphor / amber.
- Note: the spec said `var(--t-green)` but the project's CSS defines the green variable as `var(--t-primary)` — used the correct one.

### Accessibility
- Semantic `<table>` with `<th scope="col">`.
- `aria-label` on action buttons (export, close, timeframe).
- `role="button"` + `tabIndex={0}` on clickable table rows; `title={bio}` for native tooltip + custom hover tooltip.
- `role="img"` + `aria-label` on sparkline SVGs.
- `role="tooltip"` on the bio popover.

### Interactivity
- Hover trader row → bio tooltip (desktop, `hidden sm:block`).
- Click trader row → opens `TraderDetailCard` replacing the live-events panel (AnimatePresence `mode="wait"`).
- Timeframe buttons → swap dataset.
- Export CSV → Blob + `URL.createObjectURL`, downloads `leaderboard-{timeframe}-YYYY-MM-DD.csv` with all 20 rows (Rank/Trader/Volume/Trades/Win Rate/Best Rarity/Status/7D Trend).

### Reduced Motion
- Subscribed via `useSyncExternalStore` (not `useEffect`+`setState`) to satisfy the project's strict `react-hooks/set-state-in-effect` lint rule.
- When `prefers-reduced-motion: reduce`, framer-motion `initial` is set to `false` and `exit` to `undefined` (no enter/exit animations).

### Lint Result
- `npx eslint src/components/pages/LeaderboardPage.tsx` → **exit 0, no errors, no warnings.**
- `bun run lint` (whole project) → only remaining error is a pre-existing `react-hooks/set-state-in-effect` violation in `src/components/OnboardingTour.tsx:105` (outside this task's scope).

### Dev Server
- Dev server still compiles cleanly (`✓ Compiled in 248ms`). The component is NOT yet wired into TerminalLayout (per instructions — main agent will add the import + switch case).

## Decisions / Assumptions
1. Spec said `var(--t-green)` but project CSS uses `var(--t-primary)` for green — used the correct variable.
2. Spec listed 6 rarities (common/uncommon/rare/epic/legendary/mythic) but project CSS only ships `rarity-border-common/rare/epic/legendary`. Mapped all 6 to the 6 available accent CSS vars (common→dim, uncommon→primary/green, rare→cyan, epic→magenta, legendary→amber, mythic→red) and rendered badges inline with `color-mix` backgrounds.
3. Spec said "Full rankings table (ranks 4-20)" AND "Top 3 ranks — highlight with subtle bg tint of their medal color". Interpreted as: podium shows top 3 (with medal borders/glows), table shows ranks 4–20. The medal tint applies to the podium cards.
4. Used `useSyncExternalStore` for reduced-motion instead of the `useEffect`+`setState` pattern (which the project's lint rule forbids and which `OnboardingTour.tsx` currently violates).
5. Live events use recursive `setTimeout` (not `setInterval`) to honor the random 4–6s interval.
6. Sparklines are deterministic per-handle (hash seed) so they're stable across renders and timeframe switches.
7. The sticky footer is `sticky bottom-0` within the page content area (TerminalLayout already owns the global app footer).
