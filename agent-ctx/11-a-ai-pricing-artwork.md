# Task 11-a: AI NFT Pricing + AI Artwork Generation

**Agent**: Main Agent (Task 11-a)
**Date**: 2026-06-17
**Task ID**: 11-a

## Summary

Added two AI-powered features to the De-Shop SDK Mac Terminal app, both using `z-ai-web-dev-sdk` strictly on the server side:

1. **AI NFT Pricing Oracle** — POST `/api/ai-price` uses the ZAI chat completions LLM (temperature 0.7) to suggest an ALGO price for an NFT given its name, rarity, type, and description. The LLM is prompted to return strict JSON `{price, confidence, reasoning, trend}`. A `safeParseJSON` helper strips markdown fences and falls back to extracting the first `{...}` block. If parsing fails (or the LLM call throws), the route degrades gracefully to a deterministic **heuristic** estimate that clamps the price to the rarity's allowed range (common=0.5–5, rare=5–15, epic=15–35, legendary=35–60). Each response carries a `source: 'ai' | 'heuristic'` field so the UI can badge the origin.

2. **AI Artwork Generator** — POST `/api/ai-artwork` uses the ZAI `images.generations.create` API (model `cogview-3-plus`, size `1024x1024`) to generate pixel-art NFT artwork. The prompt is auto-built from the rarity (legendary→amber accents, epic→magenta, rare→cyan, common→gray), type, name, and description. The returned base64 image is decoded into a `Buffer` and written to `/home/z/my-project/public/nft-artwork/{assetId}.png` so Next.js serves it directly as a static asset. If generation fails (any error), the route falls back to a `placehold.co` URL with rarity-coloured text. Response shape: `{url, source: 'ai' | 'placeholder', prompt}`.

Both endpoints were verified live:
- `POST /api/ai-price` → `{"price":48,"confidence":85,"reasoning":"Legendary weapon with plasma-infused trait...","trend":"up","source":"ai"}` (1048 ms)
- `POST /api/ai-artwork` → `{"url":"/nft-artwork/test-1.png","source":"ai","prompt":"Pixel art style NFT artwork for a rare weapon called \"Test Sword\"..."}` (38 s, 84 KB PNG saved to disk)

## Files Created / Modified

### Created
1. **`src/app/api/ai-price/route.ts`** — POST-only endpoint. Validates `{name, rarity, type}` are present (400 otherwise). Calls `ZAI.create()` + `zai.chat.completions.create` with a strict JSON system prompt. `safeParseJSON` handles markdown fences and `{...}` extraction. Clamps parsed price to `0.5×range[0]` … `1.5×range[1]` and confidence to 0–100. Falls back to `heuristicPrice()` on any failure.
2. **`src/app/api/ai-artwork/route.ts`** — POST-only endpoint. Validates `{name, rarity, type}`. Builds a rarity-coloured pixel-art prompt. Calls `zai.images.generations.create({model:'cogview-3-plus', prompt, size:'1024x1024'})`. Writes base64 → `Buffer` → `public/nft-artwork/{slug(assetId)}.png`. Returns `{url, source:'ai', prompt}`. Falls back to `placehold.co/512x512/{bg}/{fg}?text=...&font=monospace` on any error with `source:'placeholder'`.
3. **`public/nft-artwork/`** — directory for generated PNGs (auto-created by the route via `fs/promises.mkdir({recursive:true})`).

### Modified
4. **`src/components/pages/MarketplacePage.tsx`** — added:
   - New imports: `Bot`, `Image as ImageIcon`, `TrendingUp`, `TrendingDown`, `Minus`, `Loader2` from lucide-react.
   - New types: `AIPriceResult`, `AIArtResult`.
   - New `useAIPrices()` hook returning `{aiPrices: Record<id, AIPriceResult>, loadingIds: Set<id>, errors: Record<id, string>, fetchPrice(asset)}` — manages per-asset loading/error state.
   - New `TrendIcon` component mapping `up/down/stable` → green `TrendingUp` / red `TrendingDown` / dim `Minus`.
   - New `AIPricePopover` component — absolutely-positioned 288-px terminal card shown below the AI button on a GridCard. Shows loading (`Loader2` + "querying AI oracle..." + blink-cursor), error (`> ERR: ...`), or result (suggested price + trend icon, confidence progress bar, reasoning text, listed-price delta in green/red/dim). Includes source badge (ai-oracle / heuristic).
   - `DetailModal` rewritten to accept `aiPrices`, `loadingIds`, `aiErrors`, `onFetchPrice` props. Adds two new border-highlighted panels inside the modal:
     - **AI PRICE ORACLE** (green border) — shows current AI price + confidence + reasoning + "Get AI Price" / "Re-query Oracle" button. Also surfaces the AI price as a green "AI: X ALGO" badge next to the listed price in the asset header.
     - **AI ARTWORK GEN** (magenta border) — calls `/api/ai-artwork` on click, shows `Loader2` spinner + "generating pixel art..." with blink-cursor while loading, then renders the generated image in a square `<img>` (max-h-64) with an "AI-GENERATED" or "PLACEHOLDER" badge overlay. The asset header emoji is replaced by the generated thumbnail (16×16) once art exists.
   - `GridCard` rewritten to accept `aiPrice`, `aiPriceLoading`, `aiPriceError`, `onFetchPrice` props. Adds an `AI` button in the card chrome header (top-right) that `stopPropagation`s the card click, triggers `onFetchPrice` if no result yet, and toggles a popover. When `aiPrice` exists, an "AI: X ALGO" badge with trend icon appears below the listed price on the card body. While loading, an amber "querying..." badge appears; on error, a red `! message` appears. The whole card now uses `position: relative` so the `AIPricePopover` can anchor to it.
   - `MarketplacePage` main component instantiates `useAIPrices()` and passes the relevant slice to each `GridCard` (per-asset) and to the single `DetailModal`.

5. **`src/components/pages/InventoryPage.tsx`** — `MintSection` component rewritten:
   - Added new state: `description`, `aiPrice`, `aiPriceLoading`, `aiPriceError`, `artUrl`, `artSource`, `artLoading`, `artError`.
   - Added a DESCRIPTION input row below the name/rarity/type grid.
   - Added an "AI Assist" row with two buttons:
     - **AI Suggest Price** (green border) → calls `/api/ai-price` with current form values, stores result, fires success/info toast.
     - **Generate Preview Art** (magenta border) → calls `/api/ai-artwork` with `assetId: 'mint-{timestamp}'`, stores URL + source.
   - Added an **AI INSIGHT** panel (green border, animated height) that appears when there is a price/loading/error: shows suggested price + trend icon, confidence progress bar, reasoning text inside a green left-bordered quote block, and an `ai` / `heuristic` source badge.
   - Added a **PREVIEW ART** panel (magenta border, animated height) that appears when there is art/loading/error: shows a centered 240-px square thumbnail with an AI / PLACEHOLDER corner badge, or a `Loader2` + "generating pixel art..." spinner with blink-cursor, or a red `> ERR: ...` message.
   - All AI state is reset when the mint completes (inside the `setProgress` interval's `>= 100` branch).
   - Added `Bot`, `Image as ImageIcon`, `TrendingUp`, `TrendingDown`, `Minus`, `Loader2` imports and new `AIPriceResult`, `AIArtResult` interfaces + `TrendIcon` helper.

6. **`src/components/pages/DashboardPage.tsx`** — added a new `AIPricingEngine` component rendered at the bottom of the dashboard (after `QuickActions`):
   - Terminal card with `ai_pricing.log` chrome header + `Bot` icon + "z-ai-web-dev-sdk" badge.
   - Prompt-style command line: `./ai-pricing-engine --query --rarity --type`.
   - Two-column responsive grid (`1fr / 240px` on lg+):
     - **Left**: form with asset name input (Enter-to-submit), rarity select (common/rare/epic/legendary), type select (weapon/character/accessory), description input, and a primary "Get Price" button. Below: a results panel showing the suggested price + trend icon, an `ai`/`heuristic` source badge, a colour-coded confidence progress bar (green ≥75, amber ≥50, red otherwise), and the reasoning text in a left-bordered quote.
     - **Right**: scrollable "last 5 queries" history panel. Each entry shows asset name + trend icon, rarity + price, source + confidence, and timestamp. New entries prepend and the list is capped at 5.
   - New imports: `Bot`, `Minus`, `Loader2`, `Clock` from lucide-react. New types: `AIPriceResult`, `HistoryEntry`. New helper `TrendIcon`.

## Critical Rules Compliance

- ✅ `z-ai-web-dev-sdk` used **only** in API routes (server-side). No client component imports the SDK.
- ✅ All new UI uses existing Mac Terminal theme classes (`terminal-card`, `terminal-btn`, `terminal-btn-primary`, `terminal-input`, `terminal-card-header`, `terminal-card-glow`, `text-term-*`, `prompt-prefix`, `glow-green`, `blink-cursor`, `terminal-dot`, etc.).
- ✅ API errors handled gracefully — both routes catch all exceptions and return a fallback response (heuristic price / placehold.co image) with a `note` field. Client UI shows red `> ERR: ...` text.
- ✅ Loading states use `Loader2` spinner + "querying..." / "generating..." text + `blink-cursor` (terminal-styled).
- ✅ Image generation fallback to `https://placehold.co/512x512/{bg}/{fg}?text={name}&font=monospace` with rarity-coloured fg.
- ✅ `bun run lint` passes — 0 errors, 0 warnings (after removing 3 unused `@next/next/no-img-element` eslint-disable directives that ESLint flagged as unused).
- ✅ No existing functionality broken — only additive changes (new props to `DetailModal`/`GridCard`, new state in `MintSection`, new component in `DashboardPage`). All existing button handlers (Buy, List, Equip, Transfer, Forge NFT) unchanged.

## Verification

- **ESLint**: `bun run lint` — clean (0 errors, 0 warnings).
- **Dev server**: `GET / 200` (compile 7 ms, render 26 ms). No errors in dev.log.
- **AI Price API**: `POST /api/ai-price` → `200` in ~1 s with valid JSON `{price, confidence, reasoning, trend, source:'ai'}`.
- **AI Artwork API**: `POST /api/ai-artwork` → `200` in ~38 s, returned `{url:'/nft-artwork/test-1.png', source:'ai', prompt}`. Verified the 84 KB PNG was written to `public/nft-artwork/test-1.png`.
- **Static asset**: generated image is served directly by Next.js at `/nft-artwork/test-1.png` (public dir).

## Notes

- Image generation is slow (~30–40 s for cogview-3-plus at 1024×1024). The UI shows a spinner with blinking cursor the entire time; if the user navigates away the in-flight request is harmless (state is local to the modal/section).
- The AI price LLM was instructed to respond with raw JSON (no markdown). The `safeParseJSON` helper still strips ```` ```json ```` fences just in case — defensive parsing.
- The AI price is **not** persisted to the database. It is ephemeral UI state (per-session). Persisting it would require adding a column to the `Asset` model and a PATCH endpoint; out of scope for this task.
- The "AI: X ALGO" badge on GridCard is intentionally small (`text-[10px]`) and uses a green border with `bg-term-green/5` to distinguish it from the amber listed price.
- The popover is positioned `absolute top-full right-0 mt-1 w-72` so it appears below the AI button, anchored to the card (which is now `position: relative`). It uses `z-30` so it sits above sibling cards in the grid.
- The dashboard's confidence bar uses a 3-tier colour scheme (green/amber/red) rather than always-green, to give the user a quick visual sense of how trustworthy the estimate is.
- The history panel in the dashboard caps at 5 entries (newest first) — matches the spec's "last 5 queries" requirement.
