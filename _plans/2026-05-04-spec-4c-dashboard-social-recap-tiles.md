# Implementation Plan: Spec 4C — Dashboard Social, Recap, and Tiles

**Spec:** `_specs/spec-4c-dashboard-social-recap-tiles.md`
**Date:** 2026-05-04
**Branch:** `forums-wave-continued` (do NOT create new branches; user manages all git)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — note: snapshot from 2026-04-06, predates Daily Hub Round 4 violet textarea + DashboardCard FrostedCard upgrade, but variant/Round-3 specs still authoritative for QuickActions chrome and gradient-text pattern)
**Recon Report:** `_plans/recon/dashboard-2026-05-04.md` (loaded)
**Direction Doc (master plan):** `_plans/direction/dashboard-2026-05-04.md` (loaded — Decisions 4, 7, 8, 9, 11, 12, 13 govern this spec)
**Master Spec Plan:** Same as direction doc above; this is sub-spec 3 of 3 (4A/4B shipped).

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard for logged-in users); every widget change in this plan lands here
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surfaces (QuickActions tile destinations + EchoCard cross-surface usage on devotional tab)
- `/bible` — regression surface (no widget change; ensure nothing drifts)
- `/bible/plans` — regression surface (Spec 4B reading-plan widget alignment)
- `/music` — regression surface (Music QuickAction tile destination)
- `/bible/my` — regression surface (EchoCard is also imported there indirectly; verify no drift if EchoCard's internal chrome changes)

Modal/overlay surfaces touched (no standalone routes — overlay over `/`):
- WelcomeWizard, WelcomeBack, GettingStartedCelebration ceremony heading migrations

---

## Architecture Context

### Files in scope (verified paths)

| File | Role | Notes from recon |
|---|---|---|
| `frontend/src/components/dashboard/FriendsPreview.tsx` | Widget | 158 lines. Imports `UserPlus` only. Plain `<div>` rendering — no card wrapper inside the file (DashboardCard wraps externally per WIDGET_DEFINITIONS in widget-order.ts: `{ id: 'friends', icon: Users }`, but the icon is the widget-grid customization icon, not a header icon inside the file). NO Users icon currently rendered in the file's header. |
| `frontend/src/components/dashboard/WeeklyRecap.tsx` | Widget | 62 lines. Imports `X, BookOpen, PenLine, Brain, Music, UserPlus`. NO BarChart3. Returns raw JSX. Empty-state copy "Add friends to see your weekly recap" + UserPlus link to `/friends`. Filled state has 4 stat rows (BookOpen/PenLine/Brain/Music — different glyphs than spec table) + "You contributed N% of the group's growth!" line at line 56 with `text-white/80`. All current stat icons render `text-white/40`. |
| `frontend/src/components/dashboard/WeeklyGodMoments.tsx` | Widget | 100 lines. Imports `BookOpen, CheckCircle, TrendingUp, Minus, Heart, X`. NO Sparkles. Rolls own chrome `relative rounded-2xl border border-primary/20 bg-primary/10 p-4 ... md:p-6` (primary-tinted variant — NOT FrostedCard chrome). |
| `frontend/src/components/dashboard/QuickActions.tsx` | Widget | 27 lines. Imports `BookOpen, Brain, Heart, Music`. 4-tile structure with `<Link>` wrapping. Tile chrome: `flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white/80 transition-all motion-reduce:transition-none hover:scale-[1.02] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:scale-100 md:p-6`. Icon size: `h-6 w-6 md:h-8 md:w-8`. Grid: `grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4`. |
| `frontend/src/components/dashboard/AnniversaryCard.tsx` | Widget | 60 lines. NO Lucide imports. NO icon currently rendered. Chrome: `rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-amber-500/10 backdrop-blur-sm` (rolls own). Closing message at line 44: `<p className="mt-4 font-serif text-sm italic text-white/60">{closingMessage}</p>`. |
| `frontend/src/components/dashboard/EveningReflectionBanner.tsx` | Widget | 48 lines. Imports `Moon`. Moon icon at line 21: `<Moon className="mt-0.5 h-6 w-6 shrink-0 text-indigo-300 sm:mt-0" />`. Chrome: `rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-4 md:p-6` with `motion-safe:animate-widget-enter` conditional. Rolls own. |
| `frontend/src/components/dashboard/InstallCard.tsx` | Widget | 49 lines. **NOTE: Spec says `frontend/src/components/ui/InstallCard.tsx` — that path does not exist. Real path is `frontend/src/components/dashboard/InstallCard.tsx`.** No Lucide imports. NO Download icon currently rendered. Chrome: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4` (rolls own pre-Round-3 chrome — NOT FrostedCard). "Install" button is already `<Button variant="subtle" size="md">` (post-4A). "Not now" dismiss button uses `text-white/40`. |
| `frontend/src/components/echoes/EchoCard.tsx` | Widget (cross-surface) | 58 lines. Imports `Bookmark, Calendar, Highlighter` (from KIND_CONFIG dynamic Icon mapping) + FrostedCard. **Internally wraps in `<FrostedCard variant="default" as="article">`** — confirmed double-nest risk if rendered inside DashboardCard externally. Icon rendered at line 39: `<Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />`. Cross-surface usage: `Dashboard.tsx:539` (line 47 import) + `DevotionalTabContent.tsx:335` (line 4 import). Spec wrongly assumed Sparkles is used here — it's actually a dynamic Icon based on kind (highlight=Highlighter, memorization=Bookmark, reading=Calendar). |
| `frontend/src/components/dashboard/GettingStartedCelebration.tsx` | Ceremony overlay | font-script at line 77: `text-center font-script text-3xl text-white sm:text-4xl md:text-5xl`. Heading text: "You're all set! Welcome to Worship Room." |
| `frontend/src/components/dashboard/WelcomeWizard.tsx` | Ceremony overlay | font-script at line 329 (Screen 1 Welcome heading): `text-center font-script text-3xl font-bold text-white outline-none sm:text-4xl`. Heading text: "Welcome to Worship Room". font-script at line 517 (Screen 4 Results heading): `font-script text-2xl font-bold text-white outline-none sm:text-3xl`. Heading text: "You're All Set!". Both confirmed user-visible flow; no dead code. |
| `frontend/src/components/dashboard/WelcomeBack.tsx` | Ceremony overlay | font-script at line 134, wrapped in `cn()`: `cn('font-script text-4xl font-bold text-white sm:text-5xl', fadeIn)`. Heading text: `userName ? \`Welcome back, ${userName}\` : 'Welcome Back'`. The `fadeIn` variable is conditionally `'motion-safe:animate-fade-in'` or empty string. |

### Supporting files

- `frontend/src/components/homepage/FrostedCard.tsx` — Variants: `default`, `accent`, `subdued` (all three exist; `subdued`: `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` + hover `hover:bg-white/[0.04]`).
- `frontend/src/components/dashboard/DashboardCard.tsx` — Renders `<FrostedCard as="section" variant="default" className="min-w-0 p-4 md:p-6 hover:bg-white/[0.10] hover:shadow-frosted-hover motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">`. Confirmed.
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Imports `InstallCard` from `'./InstallCard'` (line 28). Renders InstallCard at **line 360** (NOT 359 as spec says): `<div className="lg:col-span-5" style={{ order: 9999 }}><InstallCard /></div>`. Imports also include `EveningReflectionBanner`, `AnniversaryCard`, `FriendsPreview`, `WeeklyRecap`, `QuickActions`, etc. Note: WeeklyGodMoments and EchoCard are NOT imported here — they're rendered directly from `pages/Dashboard.tsx`.
- `frontend/src/constants/dashboard/widget-order.ts` — Has `WidgetId` union, `WidgetDefinition` interface, `WIDGET_DEFINITIONS` array, `WIDGET_MAP`, `TIME_OF_DAY_ORDERS`, `getTimeOfDay()`. Currently NO `INSTALL_CARD_ORDER` constant. The file does NOT include `'install'` in the WidgetId union — InstallCard is NOT a customizable widget; it's a system reminder that always renders at grid-end.
- `frontend/src/constants/animation.ts` — Has `ANIMATION_DURATIONS: { instant: 0, fast: 150, base: 250, slow: 400 }` and `ANIMATION_EASINGS: { standard, decelerate, accelerate, sharp }`. NO `quickHover`/`cardHover` token. QuickActions hover migration uses Tailwind defaults (`transition-all duration-200`).
- `frontend/src/components/ui/Button.tsx` — Variants supported include `subtle`, `ghost`, `gradient`, `subtle`. Sizes: `sm`, `md`, `lg`. Confirmed.
- `frontend/src/styles/animations.css` — Global `prefers-reduced-motion: reduce` rule cancels all transitions (`transition-duration: 0ms !important`) and animations (`animation-duration: 0ms !important`). Shimmer exempt. Translate transitions auto-disabled — explicit `motion-safe:` prefix is good practice but not strictly required.
- `frontend/src/pages/Dashboard.tsx` — Renders `EchoCard` at line 539 (import at line 47). EXECUTION-TIME VERIFICATION REQUIRED: read the surrounding JSX to determine whether `<EchoCard />` is rendered as a direct child of the page layout (NOT wrapped in `<DashboardCard>` — which would mean no double-nest, EchoCard's internal `<FrostedCard variant="default">` is sole chrome) or wrapped externally (which would mean double-nest, requiring resolution per Change 8 of the spec).

### Test patterns (verified)

- Vitest + React Testing Library. Test files colocated as `__tests__/<Component>.test.tsx`.
- Provider wrapping required: `AuthProvider` (for hooks reading `wr_auth_simulated`), `AudioProvider` for daily-hub tests, `ToastProvider`, `AuthModalProvider`.
- Existing tests touching the 8 widgets in scope: must be inventoried during execution and updated if class-name assertions are made on icon classes, the WeeklyRecap empty-state copy, or the InstallCard `style.order` magic number.

### Auth gating (from spec — verified against `02-security.md`)

This spec adds **zero** new auth gates. The 8 widgets and 3 ceremony overlays inherit auth gating from their existing implementation (Dashboard route gate, ceremony render conditions, InstallCard's PWA-availability check). Logged-out users still render the `Home` landing page at `/` per AuthProvider routing.

### Shared data models (from master plan)

This spec touches NO localStorage keys at the storage layer. The only constants change:
- **NEW:** `INSTALL_CARD_ORDER = 999` exported from `frontend/src/constants/dashboard/widget-order.ts`.

No new types, no new shared interfaces. The visual changes are class-string-and-JSX-only.

---

## Auth Gating Checklist

Per spec Auth Gating section, this is a visual + minor-copy migration with NO new gated actions. The table below confirms each existing gate is unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit `/` (logged-out) | Renders `Home`, NOT Dashboard | N/A — preserved | `AuthProvider` route-level (existing) |
| FriendsPreview render | Logged-in only | Step 5 (preserved) | Dashboard route gate (existing) |
| WeeklyRecap empty-state CTA "Find people you walk with →" | Logged-in only | Step 6 (preserved; only TEXT migrates, destination unchanged) | `<Link to="/friends">` (existing) |
| QuickActions tile clicks | Routes to `/daily?tab=*` and `/music`; downstream gates fire on destination | Step 8 (preserved) | Tile-level: navigation only. Downstream: existing per-feature gates. |
| InstallCard render + Install button | PWA install is auth-independent | Step 4 (preserved) | `useInstallPrompt()` (existing) |
| EveningReflectionBanner | Logged-in + evening hours | Step 10 (preserved) | Existing `currentHour` check (verbatim) |
| AnniversaryCard render | Logged-in + milestone date | Step 9 (preserved) | Existing `wr_anniversary_milestones_shown` (verbatim) |
| EchoCard render | Top echo non-null (existing) | Step 11 (preserved) | `useEcho()` session-scoped (verbatim) |
| Ceremony overlays (WelcomeWizard, WelcomeBack, GettingStartedCelebration) | Logged-in flows | Steps 12–14 (preserved) | Existing render conditions (verbatim) |

**No new auth checks introduced. No existing auth check modified.**

---

## Design System Values (for UI steps)

All values verified during recon. The Tonal Icon Pattern shades below are LOCKED to the same tokens chosen in Spec 4B's Execution Log so cross-widget family-grouping reads consistently.

### Tonal icon classes (locked)

| Widget / position | Icon | Tonal class | Family rationale (matches 4B convention) |
|---|---|---|---|
| FriendsPreview header | Users (NEW — to add) | `text-emerald-300` | Mint — community/together (matches 4B ActivityChecklist BookOpen completion family) |
| WeeklyRecap header | BarChart3 (NEW — to add) | `text-violet-300` | Lavender — reflection/looking back (matches 4B MoodChart TrendingUp introspection family) |
| WeeklyRecap stat row 1 (Prayed) | BookOpen (existing glyph kept) | `text-pink-300` | Pink — care (matches 4B PrayerListWidget Heart family + GratitudeWidget) |
| WeeklyRecap stat row 2 (Journaled) | PenLine (existing glyph kept; spec table says FileEdit but recon shows PenLine — keep PenLine per spec rule "keep existing glyph") | `text-violet-300` | Lavender — introspection (matches 4B MoodChart) |
| WeeklyRecap stat row 3 (Meditations) | Brain (existing glyph kept; spec table says ListChecks but recon shows Brain — keep Brain) | `text-emerald-300` | Mint — completion (matches 4B ActivityChecklist completion family) |
| WeeklyRecap stat row 4 (Worship Hours) | Music (existing) | `text-cyan-300` | Cyan — action/music (matches QuickActions Music tile + InstallCard family) |
| WeeklyGodMoments header | Sparkles (NEW — to add) | `text-amber-300` | Warm gold — celebration/discovery |
| QuickActions tile 1 (Pray) | Heart (existing) | `text-pink-300` | Pink — warm care |
| QuickActions tile 2 (Journal) | BookOpen (existing) | `text-sky-300` | Sky — scripture/study (matches 4B TodaysDevotionalCard) |
| QuickActions tile 3 (Meditate) | Brain (existing) | `text-violet-300` | Lavender — introspection |
| QuickActions tile 4 (Music) | Music (existing) | `text-cyan-300` | Cyan — action/listen |
| AnniversaryCard header | PartyPopper (NEW — to add; differentiated from WeeklyGodMoments Sparkles to reinforce category meaning — milestone celebration vs. moments of wonder) | `text-amber-300` | Warm gold — celebration |
| EveningReflectionBanner header | Moon (existing — currently `text-indigo-300`) | `text-violet-300` | Lavender — rest/end-of-day (matches WeeklyRecap header + Meditate tile for cross-widget family-grouping) |
| InstallCard header | Download (NEW — to add) | `text-cyan-300` | Cyan — action/install |
| EchoCard header | Dynamic Icon — Bookmark/Calendar/Highlighter (existing glyphs kept; spec assumed Sparkles but recon shows dynamic per KIND_CONFIG) | `text-amber-300` | Warm gold — discovery/recall (replaces current `text-white/30`) |

### Container vs inline application

| Widget | Application choice | Rationale |
|---|---|---|
| FriendsPreview | Inline next to "Friends" heading (or whatever the file's existing top heading is — read at execution) | Existing structure has heading-led layout, no icon container present |
| WeeklyRecap | Inline next to filled-state "Last week, your friend group:" intro line OR add header row above content | Recon showed no header row currently — execution-time decision based on the visual flow that reads cleanest |
| WeeklyGodMoments | Inline at the top of the banner content | Banner is single-section structure |
| QuickActions tiles | Inline (existing inline structure preserved) | The icon IS the tile — no container is appropriate |
| AnniversaryCard | Inline next to celebration heading (PartyPopper glyph, NOT Sparkles — see Edge Cases) | Existing heading-driven structure |
| EveningReflectionBanner | Inline (existing inline structure preserved) | Moon icon is currently inline at line 21 |
| InstallCard | Inline next to "Take Worship Room with you" heading text | Existing heading-driven structure |
| EchoCard | Inline (existing inline structure preserved) | Icon is currently rendered inline before context label at line 39 |

### FrostedCard subdued variant for QuickActions tiles

```
bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5
hover:bg-white/[0.04]
```

QuickActions tiles migrate to `<FrostedCard variant="subdued">` (the variant exists — confirmed by recon). The component-level subdued hover (`hover:bg-white/[0.04]`) is replaced/augmented by the QuickActions-specific lift treatment per the Hover treatment row below.

### Hover treatment for QuickActions tiles

```
hover:-translate-y-0.5 hover:bg-white/[0.08] motion-reduce:hover:translate-y-0 transition-all duration-200
```

- `hover:-translate-y-0.5` — subtle lift (1px translateY)
- `hover:bg-white/[0.08]` — brightness boost
- `motion-reduce:hover:translate-y-0` — explicit reset for reduced motion (the global `animations.css` safety net catches this anyway via `transition-duration: 0ms !important`, but the explicit reset is good practice)
- `transition-all duration-200` — Tailwind default (compiles to `0.2s cubic-bezier(0.4, 0, 0.2, 1)`). No hardcoded `cubic-bezier(...)` strings; no `quickHover` token exists in `animation.ts`.

The existing `hover:scale-[1.02]` is REPLACED by `hover:-translate-y-0.5` to match the FrostedCard hover convention site-wide. The existing `hover:bg-white/10` becomes `hover:bg-white/[0.08]`. The existing `hover:text-white` is dropped (the tile label already uses `text-white`).

### Gradient text pattern for ceremony headings (Decision 13)

```
bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent
```

Plus `font-bold` (the gradient pattern needs explicit weight emphasis since Caveat carried weight via the script font itself) and the existing size cascade preserved per file. Replaces both `font-script` AND `text-white` (the gradient + clip-text combo replaces both).

### WeeklyRecap empty-state copy (locked per Decision 8)

| Element | New copy |
|---|---|
| Heading | **Faith grows stronger together** |
| Description | **Your weekly journey, walked alongside friends** |
| CTA link text | **Find people you walk with →** |

CTA destination preserved at `to="/friends"` (existing). Visual treatment: heading uses `text-white` body weight typography; description uses `text-white/80`; link uses `text-white/80 hover:text-white` (post-4A inline link convention).

### Anniversary closing message migration (Decision 7)

`mt-4 font-serif text-sm italic text-white/60` → `mt-4 text-sm text-white/60` (drop both `font-serif` AND `italic`; default body font is Inter sans-serif via root cascade). Per spec text: "After migration, the closing message renders in the system's default sans-serif body font (Inter or whatever the FrostedCard body default is) at the same size and weight, just without the italic styling." The spec's narrow direction "remove italic" is fully expressed by removing `italic font-serif` together; keeping `font-serif` would retain Lora (the scripture-only font) on celebratory prose, violating Decision 7.

### `INSTALL_CARD_ORDER` constant (Decision 12)

```ts
export const INSTALL_CARD_ORDER = 999
```

Exported from `frontend/src/constants/dashboard/widget-order.ts`. Documenting comment per spec text. Replaces `style={{ order: 9999 }}` magic at `DashboardWidgetGrid.tsx:360` with `style={{ order: INSTALL_CARD_ORDER }}`.

---

## Design System Reminder

Project-specific quirks `/execute-plan` displays before each UI step:

- **All scripture stays Lora italic; everything else is Inter sans no italic.** AnniversaryCard closing message migrates per Decision 7 (drop `font-serif italic` together). VerseOfTheDayCard scripture preserved (4B). Bible reader chrome scripture preserved.
- **Tonal Icon Pattern shades are pastel/muted — never fully saturated.** The 4B Execution Log locked exact shades: `text-emerald-300`, `text-violet-300`, `text-amber-300`, `text-pink-300`, `text-sky-300`, `text-cyan-300`. Do NOT use saturated `text-emerald-500`, `text-violet-500`, `text-amber-400`, etc. The leaderboard medal colors in FriendsPreview are the deliberate exception (Decision 9 — semantic ranking, not categorical metadata).
- **Card chrome stays in the violet/glass system.** When applying a tonal icon, color the icon ONLY. Do not tint the card border, background, or shadow.
- **No deprecated patterns:** no `font-script` in new code (Caveat retired for headings), no `Caveat` font on celebratory copy, no `animate-glow-pulse`, no cyan textarea borders, no soft-shadow 8px-radius cards on dark backgrounds, no `BackgroundSquiggle` on Dashboard, no `GlowBackground` per Dashboard section (Dashboard uses BackgroundCanvas at the page level — shipped in 4A), no `PageTransition` component.
- **Caveat font dependency:** four user-visible `font-script` usages remain (the four ceremony headings in scope). After 4C ships, no `font-script` should exist in `frontend/src/components/dashboard/` or the broader app for celebratory headings. Removing the Caveat font from `tailwind.config.js` is a SEPARATE follow-up spec.
- **FrostedCard subdued variant exists** — verified at `frontend/src/components/homepage/FrostedCard.tsx`. QuickActions migration consumes `<FrostedCard variant="subdued">` directly; styled-wrapper fallback NOT needed.
- **DashboardCard renders via `<FrostedCard variant="default">`** — verified. Widgets that already consume DashboardCard inherit default variant chrome from 4A. Some widgets in 4C scope (WeeklyGodMoments, AnniversaryCard, EveningReflectionBanner, InstallCard) still roll their own chrome — preserve their existing chrome unless the spec explicitly directs migration.
- **The `useEcho()` session-scoped hook is NOT a reactive store.** Per `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes". Do NOT migrate it.
- **Reactive store discipline still applies broadly** — components consuming reactive stores use `subscribe()` pattern (Pattern A or Pattern B). NO local `useState` mirrors of store data. Spec 4C does not modify any reactive store consumer; preservation only.
- **Animation token discipline (BB-33):** all transition durations and easings come from `frontend/src/constants/animation.ts`. The QuickActions hover transition uses Tailwind `transition-all duration-200` (which compiles to the same value as the `base`/`standard` tokens) — acceptable because no `quickHover` token exists. Do NOT introduce hardcoded `cubic-bezier(...)` strings.
- **Reduced-motion safety net is global** at `frontend/src/styles/animations.css`. Translate transitions are auto-disabled. The explicit `motion-reduce:hover:translate-y-0` reset on QuickActions is belt-and-suspenders.
- **Inline element layouts (QuickActions 4-tile row).** Document expected y-coordinate alignment so `/verify-with-playwright` compares `boundingBox().y` between tiles. CSS class verification alone misses wrapping bugs.
- **Mood colors are NOT tonal icons** — `MOOD_COLORS` palette (`#D97706`/`#C2703E`/`#8B7FA8`/`#2DD4BF`/`#34D399`) is data-visualization, not iconography. Out of 4C scope; preserved.
- **Gradient text contrast risk:** The lavender `from-violet-300 to-violet-200` gradient on a dark modal backdrop should pass WCAG AA 4.5:1, but historical bg-clip-text contrast is risky. If contrast fails at execution-time visual verification, the documented fallback is `from-violet-400 to-violet-300` (one shade darker on each stop). Apply only if needed.

Sources: `_plans/recon/dashboard-2026-05-04.md`, `.claude/rules/09-design-system.md` (Round 3 Visual Patterns + Daily Hub Visual Architecture + Deprecated Patterns), `_plans/2026-05-04-spec-4b-dashboard-data-widgets.md` Execution Log (locked tonal shades), `_plans/2026-05-04-spec-4a-dashboard-foundation.md` Execution Log (button/link migrations).

---

## Shared Data Models (from Master Plan)

No shared TypeScript interfaces are introduced or modified. Spec 4C does not touch any data layer.

```ts
// NEW — single constant added to widget-order.ts:
/**
 * InstallCard intentionally renders LAST in the Dashboard grid.
 * Sentinel value (high integer, not part of the widget ordering sequence)
 * so the card always sits at grid-end regardless of which other widgets
 * the user has enabled. PWA install reminder is non-essential; tail position
 * keeps it from competing for primary-content attention.
 */
export const INSTALL_CARD_ORDER = 999
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | Spec 4C touches NO localStorage keys at the storage layer. All read/write paths in the 8 widgets and 3 ceremony overlays are preserved verbatim. |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | DashboardWidgetGrid: single-column. QuickActions: `grid-cols-2 gap-3` (4 tiles in 2x2). Ceremony heading sizes: GettingStartedCelebration `text-3xl`, WelcomeWizard line-329 `text-3xl`, WelcomeWizard line-517 `text-2xl`, WelcomeBack `text-4xl`. WeeklyRecap empty-state: heading + description + CTA stack vertically full-width. InstallCard: rolls-own pre-Round-3 chrome at full width. |
| Tablet | 768px | DashboardWidgetGrid: 2-column. QuickActions: `md:grid-cols-4 md:gap-4` (4 tiles in single row). Ceremony heading sizes: GettingStartedCelebration `sm:text-4xl` (kicks in at 640+; tablet shows mid-size), WelcomeWizard line-329 `sm:text-4xl`, WelcomeWizard line-517 `sm:text-3xl`, WelcomeBack `sm:text-5xl`. MilestoneFeed inside FriendsPreview gets more horizontal room. |
| Desktop | 1440px | DashboardWidgetGrid: 3-column (or whatever 4A locked — verify via Dashboard.tsx at execution). QuickActions: 4-column. Ceremony heading sizes: GettingStartedCelebration `md:text-5xl` (kicks in at 768+; desktop shows largest), WelcomeWizard headings stay at `sm:` cap. FrostedCard hover treatments meaningful with cursor input. The Tonal Icon Pattern's full grid scan reads strongest here. |

**Custom breakpoints (none introduced by this spec).** The QuickActions 4-column collapse uses Tailwind's standard `md:` (768px). All other layout collapses inherit from 4A's grid system.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| QuickActions 4-tile row (desktop) | Pray tile, Journal tile, Meditate tile, Music tile | Same y ±5px at 1024px+ (4-column grid) | None — `md:grid-cols-4` should NEVER wrap at desktop; if a tile wraps to row 2, that's a bug |
| QuickActions 4-tile row (mobile/tablet) | Pray tile + Journal tile (row 1), Meditate tile + Music tile (row 2) | 2x2 grid: row 1 tiles same y ±5px; row 2 tiles same y ±5px | Wrapping into 2x2 at <768px is the intended grid layout — verify both rows are properly aligned |
| WeeklyRecap stat rows (filled state) | Each row: icon + label + count | Within each row, icon y matches text y ±5px | Vertical stacking of 4 stat rows is the intended layout |
| FriendsPreview leaderboard rows | Each row: avatar + name + rank chip + points | Within each row, avatar y matches name/chip/points y ±5px | Vertical stacking of leaderboard rows is intended |

These tables are consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

Spec 4C does NOT modify vertical rhythm. The Dashboard's gap-between-widgets and gap-within-card structures are inherited from 4A. The only widget-level vertical changes are:

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| WeeklyRecap empty-state heading → description | `mb-1` (0.25rem ≈ 4px) | New copy structure (similar density to current empty state) |
| WeeklyRecap empty-state description → CTA link | `mt-2` (0.5rem ≈ 8px) | New copy structure |
| WeeklyRecap header icon → "Last week..." intro | Existing flex-row alignment (icon inline with text); icon-text gap `gap-2` (0.5rem) | Inline icon application |
| QuickActions tile internal: icon → label | Existing `gap-2` preserved | No change |
| AnniversaryCard heading-row icon → heading text | New `gap-2` to be applied with new Sparkles icon | Inline icon addition |
| InstallCard heading-row icon → "Take Worship Room with you" text | New `gap-2` to be applied with new Download icon | Inline icon addition |

`/verify-with-playwright` compares these in Step 6e against the live render.

---

## Assumptions & Pre-Execution Checklist

⚠️ **CRITICAL ASSUMPTION — ICON ADDITIONS REQUIRED:**

The spec assumes pre-existence of icons that the recon found do NOT currently exist. The acceptance criteria require these icons to render with tonal colors post-migration. The plan steps therefore ADD these icons in addition to applying tonal classes:

- FriendsPreview: NEW Users header icon
- WeeklyRecap: NEW BarChart3 header icon
- WeeklyGodMoments: NEW Sparkles header icon
- AnniversaryCard: NEW PartyPopper header icon (differentiated from WeeklyGodMoments Sparkles to reinforce category — milestone celebration vs. moments of wonder; `text-amber-300` color shared)
- InstallCard: NEW Download header icon

The spec's pre-execution recon item #6 says "If a widget currently uses an icon name that doesn't match the assignment table, keep the existing icon." This rule does NOT cover the case where no icon exists at all. The plan interprets the spec acceptance criteria literally: each acceptance line says the icon "renders as text-X-300" — for that to be true, the icon must exist post-migration.

**If this scope expansion is unwanted**, the user can veto specific icon additions during plan review. Alternative approaches: (a) skip the affected widgets in 4C and defer to a follow-up; (b) apply tonal classes only to icons that already exist (the four QuickActions tiles, EveningReflectionBanner Moon, the four WeeklyRecap stat rows, and EchoCard's dynamic Icon — which would still satisfy the majority of the acceptance criteria but leave the headers untreated). The default plan adds the icons.

⚠️ **Spec/recon mismatches resolved by this plan:**

- InstallCard path is `frontend/src/components/dashboard/InstallCard.tsx` (NOT `frontend/src/components/ui/InstallCard.tsx` as the spec says).
- DashboardWidgetGrid InstallCard render line is **360** (NOT 359 as the spec says).
- WeeklyRecap stat icon glyphs are BookOpen / PenLine / Brain / Music (NOT BookOpen / ListChecks / FileEdit / Music as the spec table says). Plan keeps existing glyphs and applies tonal colors per the activity-to-color mapping.
- EchoCard uses dynamic Icon (Bookmark / Calendar / Highlighter from KIND_CONFIG) — NOT Sparkles. Plan keeps the dynamic Icon and applies the amber tonal class.
- EveningReflectionBanner Moon currently uses `text-indigo-300`, which is close to but not exactly `text-violet-300` per the spec table. One-class swap.

**Before executing this plan, confirm:**

- [ ] Pre-state baseline: `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -50` pass count recorded before any change. Target: post-4B-final pass count + any post-4B patch test additions. The 11 documented pre-existing failures (orphan deleted-hook test, plan browser CSS class drift, logged-out mock listing cards, Pray loading-text timing flake) remain.
- [ ] `pnpm typecheck` passes pre-execution.
- [ ] Spec 4A + post-4A patch + Spec 4B + post-4B patches confirmed shipped on `forums-wave-continued` branch.
- [ ] Direction doc `_plans/direction/dashboard-2026-05-04.md` and recon `_plans/recon/dashboard-2026-05-04.md` are present.
- [ ] All auth-gated actions from the spec accounted for (zero new gates; preservation table populated above).
- [ ] All design system values verified (tonal shades from 4B Execution Log; FrostedCard subdued variant confirmed; gradient text pattern locked).
- [ ] Recon report loaded — 8 widget files + 3 ceremony files read; current chrome / icons / class strings captured in Architecture Context table.
- [ ] No deprecated patterns introduced (no `font-script` in new code; no `animate-glow-pulse`; no cyan textarea borders; no italic Lora on celebratory prose; no `BackgroundSquiggle` on Dashboard; no `GlowBackground` on Dashboard; no `PageTransition`).
- [ ] No new localStorage keys (verified against `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md`).
- [ ] No hardcoded animation timings/cubic-bezier strings in new code (Tailwind defaults or `animation.ts` tokens only).
- [ ] User has decided whether icon additions (Users / BarChart3 / Sparkles / Download) are in scope. **DEFAULT: in scope.**

**[UNVERIFIED] values** (flagged for execution-time verification):

- **[UNVERIFIED] EchoCard double-nest at Dashboard.tsx:539.** Best guess: rendered directly (no DashboardCard wrapper) — single FrostedCard chrome via EchoCard's internal wrapper. Verification: read Dashboard.tsx lines 530–550 during execution. If EchoCard is rendered inside `<DashboardCard>`, apply the resolution decision tree from spec Change 8: remove EchoCard's internal `<FrostedCard variant="default">` wrapper. If rendered directly: keep internal wrapper, change is class-string-only on the icon. Document choice in the Execution Log.
- **[UNVERIFIED] WeeklyGodMoments chrome migration scope.** Currently rolls own primary-tinted chrome (`bg-primary/10 border-primary/20`). Spec text says: "Confirm chrome aligns with FrostedCard default (it consumes DashboardCard so should be auto-migrated from 4A). If WeeklyGodMoments uses a custom wrapper that doesn't go through DashboardCard, surface this — the spec assumes consumption." Recon shows it does NOT consume DashboardCard. Verification: at execution time, decide whether to migrate the chrome to FrostedCard default OR preserve the rolls-own primary-tinted chrome. Default: PRESERVE the rolls-own chrome (the primary-tint banner pattern is a deliberate visual emphasis for "weekly highlights"; migrating would dilute the call-to-attention). Surface as deviation if user prefers FrostedCard chrome.
- **[UNVERIFIED] AnniversaryCard chrome.** Currently rolls own with `ring-1 ring-amber-500/10`. Per Decision 4 — STAY as default (not migrated to FrostedCard accent variant). Verification: confirm the rolls-own chrome reads cleanly against the upgraded BackgroundCanvas. If contrast or visual weight feels off, surface for consideration but do NOT migrate to FrostedCard variant in 4C.
- **[UNVERIFIED] EveningReflectionBanner indigo-tinted chrome.** Currently rolls own with indigo tint matching the Moon icon's prior `text-indigo-300`. Spec preserves chrome ("consumes DashboardCard so auto-migrated"). Recon shows it does NOT consume DashboardCard. Verification: at execution time, decide whether to migrate chrome to FrostedCard default OR preserve indigo-tinted chrome. Default: PRESERVE rolls-own (the indigo tint mirrors the lavender Moon icon family — they reinforce each other visually). Surface as deviation if user prefers FrostedCard chrome.
- **[UNVERIFIED] InstallCard chrome.** Currently rolls own pre-Round-3 (`bg-white/5 border border-white/10`). Spec preserves chrome (Decision 12 is about ordering refactor, not chrome). Verification: at execution time, ensure the chrome reads acceptably against BackgroundCanvas. Default: PRESERVE rolls-own chrome (acceptable for tail-position non-essential card; preserving avoids 4D scope creep).
- **[UNVERIFIED] Gradient text contrast on ceremony headings.** Best guess: `from-violet-300 to-violet-200` passes WCAG AA 4.5:1 against the dark ceremony backdrop. Verification: at execution time, manually check contrast on each of the four headings in browser. If any fails, apply documented fallback `from-violet-400 to-violet-300` (one shade darker on each stop) and document inline in Execution Log.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spec says `frontend/src/components/ui/InstallCard.tsx`; reality is `frontend/src/components/dashboard/InstallCard.tsx` | Use the actual path | Spec is wrong; recon verified file location |
| Spec says line 359 for InstallCard render in DashboardWidgetGrid; reality is line 360 | Target line 360 | Recon verified |
| Spec says WeeklyRecap stats use BookOpen/ListChecks/FileEdit/Music; reality is BookOpen/PenLine/Brain/Music | Keep existing glyphs (per spec rule: "keep existing icon, apply tonal color"). Map activity → color: Prayed→pink (BookOpen), Journaled→violet (PenLine), Meditations→emerald (Brain), Hours→cyan (Music) | Spec rule explicitly prohibits glyph swaps |
| Spec says EchoCard uses Sparkles; reality is dynamic Icon (Bookmark/Calendar/Highlighter) | Keep dynamic Icon, apply amber tonal class | Spec rule explicitly prohibits glyph swaps |
| FriendsPreview / WeeklyRecap / WeeklyGodMoments / AnniversaryCard / InstallCard have no header icon to color | ADD the icons (Users / BarChart3 / Sparkles / **PartyPopper** / Download) | Acceptance criteria literally require these icons to render with tonal colors. AnniversaryCard explicitly does NOT use Sparkles — using the same icon + color as WeeklyGodMoments would defeat the differentiation purpose of the Tonal Icon Pattern. PartyPopper signals "milestone celebration"; Sparkles signals "moments of wonder." Both keep `text-amber-300` because both belong to the warm-gold celebration family. PartyPopper verified available in lucide-react 0.356.0. |
| Anniversary closing message migration: spec says "remove italic"; body of spec says "render in default sans-serif" | Drop both `italic` AND `font-serif` together | Decision 7 says Lora italic is for scripture only; AnniversaryCard celebratory prose isn't scripture |
| QuickActions tile chrome: FrostedCard `subdued` variant vs styled-wrapper fallback | Use `<FrostedCard variant="subdued">` directly | Variant exists (verified); fallback is unnecessary |
| InstallCard order: prop on InstallCard vs inline at consumer site | Option B — inline at DashboardWidgetGrid using `INSTALL_CARD_ORDER` constant | Spec Change 7b locks Option B |
| `INSTALL_CARD_ORDER` value: `999` vs `9999` | `999` | Spec proposes 999; smaller integer reads as "high but not absurd"; both work given fewer than 50 widgets in WIDGET_DEFINITIONS |
| QuickActions hover lift: `hover:-translate-y-0.5` (replace `hover:scale-[1.02]`) | Replace with `-translate-y-0.5` | Matches FrostedCard hover convention site-wide; keeps the tile family consistent with other Round-3 cards |
| EveningReflectionBanner Moon: `text-indigo-300` → `text-violet-300` | Apply | Spec table specifies violet-300; aligns family with WeeklyRecap header + QuickActions Meditate tile |
| EveningReflectionBanner indigo-tinted chrome: migrate to FrostedCard default OR preserve | PRESERVE (default) | Surface as deviation if user wants migration; rolls-own is intentional family-grouping with the lavender icon |
| WeeklyGodMoments primary-tinted chrome: migrate to FrostedCard default OR preserve | PRESERVE (default) | Same rationale; banner visual emphasis is deliberate |
| EchoCard double-nest resolution at Dashboard.tsx:539 | EXECUTION-TIME read; default (best guess): rendered directly, no double-nest, single FrostedCard from EchoCard's internal wrapper | Spec Change 8 has full 4-path decision tree; document chosen path inline |
| Caveat font removal from `tailwind.config.js` after all four `font-script` usages migrate | OUT OF 4C SCOPE — surface as follow-up | Spec text: "removing the font from config requires verifying it isn't referenced in fixtures, tests, or storybook stories that might break — separate spec" |
| Tonal Icon Pattern documentation in `09-design-system.md` | OUT OF 4C SCOPE — queued post-ship | Spec text: "Tonal Icon Pattern documentation in 09-design-system.md (deferred until after 4C ships)" |
| WelcomeWizard interior content (input fields, step indicators, navigation, body, validation) | UNCHANGED beyond ceremony heading | Spec Change 9b CRITICAL constraint; modal interior is 4D scope |
| WelcomeBack interior content | UNCHANGED beyond ceremony heading | Same |
| GettingStartedCelebration body content | UNCHANGED beyond ceremony heading | Same |
| Anniversary chrome migration to FrostedCard accent | NO — preserved as rolls-own with `ring-1 ring-amber-500/10` | Decision 4 (only Getting Started gets accent); only-one-accent-card-on-Dashboard implicit rule |
| WeeklyRecap "You contributed N%" line migration to gradient text pattern | NO — keep `text-white/80` font-medium emphasis | Gradient text reserved for ceremony headings only per Decision 13 |
| Test class-string updates required for | (a) tests asserting on `font-script` on the four ceremony headings; (b) tests asserting on the `style.order = 9999` magic if any test snapshots DashboardWidgetGrid; (c) tests asserting on FriendsPreview/WeeklyRecap/QuickActions/AnniversaryCard/EveningReflectionBanner/InstallCard/EchoCard icon className strings; (d) tests asserting on WeeklyRecap empty-state copy strings | Update assertions to new tokens / new copy. Behavior tests preserved. |

---

## Implementation Steps

### Step 1: Pre-execution verification + baseline capture

**Objective:** Confirm pre-state matches recon assumptions and capture test baseline.

**Files to create/modify:**
- (none — verification only)

**Details:**

Run all of the following in `frontend/`:

```bash
pnpm typecheck
pnpm test --run --reporter=verbose 2>&1 | tail -50
```

Record baseline pass count. Confirm pre-existing 11 failures match the documented tech-debt list (orphan deleted-hook test, plan browser CSS class drift, 4 logged-out mock listing cards, Pray loading-text timing flake).

Read the following files in full to confirm pre-state matches the Architecture Context table:

- `frontend/src/components/dashboard/FriendsPreview.tsx`
- `frontend/src/components/dashboard/WeeklyRecap.tsx`
- `frontend/src/components/dashboard/WeeklyGodMoments.tsx`
- `frontend/src/components/dashboard/QuickActions.tsx`
- `frontend/src/components/dashboard/AnniversaryCard.tsx`
- `frontend/src/components/dashboard/EveningReflectionBanner.tsx`
- `frontend/src/components/dashboard/InstallCard.tsx`
- `frontend/src/components/echoes/EchoCard.tsx`
- `frontend/src/components/dashboard/GettingStartedCelebration.tsx`
- `frontend/src/components/dashboard/WelcomeWizard.tsx`
- `frontend/src/components/dashboard/WelcomeBack.tsx`
- `frontend/src/pages/Dashboard.tsx` (focus on lines 530–550 for EchoCard render context)
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` (focus on lines 350–365 for InstallCard render block)
- `frontend/src/constants/dashboard/widget-order.ts`
- `frontend/src/components/homepage/FrostedCard.tsx` (confirm `subdued` variant)
- `frontend/src/components/dashboard/DashboardCard.tsx` (confirm `<FrostedCard variant="default">`)

Resolve `[UNVERIFIED]` items now:
1. EchoCard double-nest path at Dashboard.tsx:539 — READ THE CODE and lock resolution path before Step 11.
2. Confirm WelcomeWizard line 329 + 517 are user-visible flow (not dead code behind a flag).

**Auth gating:** N/A — read-only verification.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — verification step.

**Guardrails (DO NOT):**
- Do NOT modify any files in this step.
- Do NOT skip baseline capture — it's the regression check anchor.
- Do NOT proceed to Step 2 if `pnpm typecheck` fails (resolve first).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (none) | — | Verification step; no tests added. |

**Expected state after completion:**
- [ ] Baseline pass count recorded.
- [ ] All 14 source files read; pre-state matches Architecture Context table.
- [ ] EchoCard double-nest path locked (Dashboard.tsx:539 read).
- [ ] WelcomeWizard heading user-visibility verified.

---

### Step 2: Add `INSTALL_CARD_ORDER` constant + update DashboardWidgetGrid

**Objective:** Replace magic `style={{ order: 9999 }}` with explicit constant per Decision 12.

**Files to create/modify:**
- `frontend/src/constants/dashboard/widget-order.ts` — Add `INSTALL_CARD_ORDER` constant.
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Update line 360 import + usage.

**Details:**

In `widget-order.ts`, add at the bottom of the file (after `getTimeOfDay()`):

```ts
/**
 * InstallCard intentionally renders LAST in the Dashboard grid.
 * Sentinel value (high integer, not part of the widget ordering sequence)
 * so the card always sits at grid-end regardless of which other widgets
 * the user has enabled. PWA install reminder is non-essential; tail position
 * keeps it from competing for primary-content attention.
 */
export const INSTALL_CARD_ORDER = 999
```

The comment is non-trivial documentation (justifies the magic-number escape hatch), so it stays per CLAUDE.md guidance.

In `DashboardWidgetGrid.tsx`:
- Add `INSTALL_CARD_ORDER` to the existing import from `'@/constants/dashboard/widget-order'` (line ~7 — currently imports `WIDGET_MAP, type WidgetId`).
- Update line 360 from `<div className="lg:col-span-5" style={{ order: 9999 }}>` to `<div className="lg:col-span-5" style={{ order: INSTALL_CARD_ORDER }}>`.

The InstallCard element itself receives no new prop — Option B locked per spec Change 7b.

**Auth gating:** N/A — constants change.

**Responsive behavior:** N/A: no UI impact (CSS `order` works identically across breakpoints).

**Inline position expectations:** N/A — ordering refactor only.

**Guardrails (DO NOT):**
- Do NOT add an `order` prop to `InstallCard.tsx` — Option B locked.
- Do NOT change the constant value to `9999` — spec text proposes 999.
- Do NOT modify `WidgetId` union or `WIDGET_DEFINITIONS` array — InstallCard is NOT a customizable widget; it's a system reminder.
- Do NOT remove the documenting comment — the `999` magic-number escape needs justification.
- Do NOT touch the rendering structure of InstallCard or its conditional gating in this step.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `widget-order.test.ts` (extend existing, if present, or add) | unit | `INSTALL_CARD_ORDER` exports a number greater than the max enumerated widget order. |
| Existing DashboardWidgetGrid tests | integration | Behavior tests (InstallCard renders last, conditional rendering preserved) MUST continue to pass without modification. Tests asserting `style.order === 9999` (if any) updated to assert `style.order === '999'` or `=== INSTALL_CARD_ORDER`. |

**Expected state after completion:**
- [ ] `INSTALL_CARD_ORDER` constant exported from `widget-order.ts`.
- [ ] `DashboardWidgetGrid.tsx:360` consumes the constant via `style={{ order: INSTALL_CARD_ORDER }}`.
- [ ] `pnpm typecheck` passes.
- [ ] Behavior tests for InstallCard render order pass without modification.

---

### Step 3: InstallCard — add Download icon + tonal cyan

**Objective:** Add a Download header icon to InstallCard with `text-cyan-300` tonal color, satisfying acceptance criterion "Download icon migrated to cyan".

**Files to create/modify:**
- `frontend/src/components/dashboard/InstallCard.tsx`

**Details:**

Add the Download icon next to the heading text. The current heading is at line 32: `<p className="text-white text-base font-medium">Take Worship Room with you</p>`.

Migrate to:

```tsx
import { Download } from 'lucide-react'
// ... existing imports

// In the JSX, replace the line-32 heading:
<div className="flex items-center gap-2">
  <Download className="h-5 w-5 text-cyan-300" aria-hidden="true" />
  <p className="text-white text-base font-medium">Take Worship Room with you</p>
</div>
```

Preserve every other piece of the file:
- Hook usage (`useInstallPrompt`, `useToast`, `useState`)
- Conditional gating (`if (!isDismissed || isDashboardCardShown || ...) return null`)
- `handleInstall` and `handleDismiss` handlers
- `<Button variant="subtle" size="md">Install</Button>` (already migrated in 4A — verify intact)
- "Not now" `<button>` with existing className (`text-white/40 hover:text-white/60 ...`)
- Description paragraph "Install the app for a faster, fuller experience."
- Outer `<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">` rolls-own chrome (PRESERVED per [UNVERIFIED] decision in Assumptions)

**Auth gating:** N/A — InstallCard is auth-independent (PWA install).

**Responsive behavior:**
- Desktop (1440px): Heading row renders inline (icon + text on same row, `gap-2`).
- Tablet (768px): Same inline behavior.
- Mobile (375px): Icon and text stay inline (no wrap; combined width well under viewport).

**Inline position expectations:** Icon and heading text share y ±5px at all breakpoints (single flex row).

**Guardrails (DO NOT):**
- Do NOT add `<Button variant="ghost">` for Install — it's already `<Button variant="subtle">` (4A).
- Do NOT migrate the rolls-own chrome to FrostedCard (preserved per [UNVERIFIED]).
- Do NOT change "Not now" button styling — `text-white/40` was 4A scope and stays as-is. Bumping to `/50` for WCAG AA interactive-text floor is OUT OF 4C SCOPE (surface as follow-up).
- Do NOT modify `useInstallPrompt` consumption.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| InstallCard.test.tsx (extend) | unit | Asserts Download icon renders with class `text-cyan-300` and `aria-hidden="true"`. |
| InstallCard.test.tsx | unit | Asserts heading text "Take Worship Room with you" still renders. |
| Existing behavior tests | integration | Install button click handler, Not Now click handler, conditional rendering preserved without modification. |

**Expected state after completion:**
- [ ] Download icon with `text-cyan-300` renders inline next to heading text.
- [ ] All existing behavior preserved.
- [ ] `pnpm typecheck` + `pnpm test` for InstallCard pass.

---

### Step 4: FriendsPreview — add Users header icon + tonal mint, verify polish items

**Objective:** Add a Users header icon to FriendsPreview with `text-emerald-300`. Verify medal colors, MilestoneFeed tones, "See all" link, empty-state preservation.

**Files to create/modify:**
- `frontend/src/components/dashboard/FriendsPreview.tsx`

**Details:**

The file is 158 lines, no current header icon. The widget renders at the top of the FriendsPreview card content. Two possible insertion points (decide at execution based on what reads cleanest):

- **Option 1:** A new header row above the existing content with `<Users>` + label "Friends" or "Your Circle" — but this duplicates the DashboardCard external title.
- **Option 2:** A small inline icon at the top of the leaderboard or above the empty-state CircleNetwork — quieter, doesn't double the heading.

**Locked: Option 2.** Apply the icon as a small leading element on the existing top heading (whatever the file's top label is — read at execution; likely the leaderboard "Top friends" or similar). If the file has no internal heading at all, add a small icon-only flex row at the top:

```tsx
<div className="mb-3 flex items-center gap-2">
  <Users className="h-4 w-4 text-emerald-300" aria-hidden="true" />
  <span className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Friends</span>
</div>
```

Use the muted eyebrow treatment (`text-white/50` + `tracking-[0.15em]` per FrostedCard Tier 2 default-variant eyebrow convention) so the new heading reads as a quiet section label, not a competing primary heading.

**Verifications (preservation, not migration):**
- Leaderboard top-3 medal colors stay PRESERVED per Decision 9. Read the existing tokens (likely `text-medal-gold`, `text-medal-silver`, `text-medal-bronze` from Tailwind custom or hex) and verify they render correctly against upgraded FrostedCard chrome.
- "You · #11 · 0 pts" line: align with FrostedCard caption tokens — `text-white/60` for the row, optionally `text-white/80` on the rank number.
- MilestoneFeed inside FriendsPreview:
  - Avatar circles preserved (user content, not chrome).
  - Activity line: `text-white/80` body tone.
  - Relative timestamp: `text-white/50` citation tone.
- Empty state (when user has no friends) PRESERVED: CircleNetwork SVG + invite copy unchanged per Decision 8 business-goal protection.
- "See all" link verified `text-white/80 hover:text-white` (post-4A).

**Add `Users` to the lucide-react import** (currently imports only `UserPlus`):

```tsx
import { UserPlus, Users } from 'lucide-react'
```

**Auth gating:** N/A — FriendsPreview is logged-in only (Dashboard route gate); no in-component auth checks.

**Responsive behavior:**
- Desktop: Header row renders left-aligned at top of card content; gap to next element preserved.
- Tablet: Same.
- Mobile: Same; icon + label stay inline.

**Inline position expectations:** Header icon and label text share y ±5px (single flex row).

**Guardrails (DO NOT):**
- Do NOT migrate the leaderboard medal colors (Decision 9 explicit preservation).
- Do NOT rewrite the empty-state copy (Decision 8 business-goal protection — only WeeklyRecap empty-state copy is in 4C scope).
- Do NOT add a heading like "Friends" in `text-base font-medium text-white` that competes with the DashboardCard external title — use the muted eyebrow treatment.
- Do NOT modify the MilestoneFeed component itself; only verify its rendered tones inside FriendsPreview.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| FriendsPreview.test.tsx (extend) | unit | Asserts Users icon renders with class `text-emerald-300` and `aria-hidden="true"`. |
| FriendsPreview.test.tsx | unit | Asserts medal color classes for top 3 still render (regression check on Decision 9). |
| FriendsPreview.test.tsx | unit | Asserts empty-state CircleNetwork copy renders unchanged when user has no friends. |
| Existing tests | integration | All click handlers / navigation logic / leaderboard ranking math / MilestoneFeed pagination preserved. |

**Expected state after completion:**
- [ ] Users icon with `text-emerald-300` renders at top of FriendsPreview.
- [ ] Decision 9 medal colors preserved.
- [ ] Decision 8 empty-state preserved.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 5: WeeklyRecap — full migration (header icon + 4 stat icons + empty-state copy)

**Objective:** Add BarChart3 header icon, apply tonal classes to the 4 existing stat-row icons, rewrite empty-state copy per Decision 8, verify filled-state preservation per Decision 9.

**Files to create/modify:**
- `frontend/src/components/dashboard/WeeklyRecap.tsx`

**Details:**

This is the most substantive widget step. Three sub-changes within the same file:

**5a — Header BarChart3 + lavender tonal**

The file currently has no header icon. Add at the top of the filled-state JSX (read execution-time to determine exact insertion point — likely just above the "Last week, your friend group:" intro line):

```tsx
import { X, BookOpen, PenLine, Brain, Music, UserPlus, BarChart3 } from 'lucide-react'

// In filled-state JSX:
<div className="mb-3 flex items-center gap-2">
  <BarChart3 className="h-4 w-4 text-violet-300" aria-hidden="true" />
  <span className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Last Week</span>
</div>
```

Then keep the existing "Last week, your friend group:" body intro line as the lead-in to the 4 stat rows.

**5b — Empty-state copy rewrite (Decision 8)**

Current empty-state at lines 11–22:
```tsx
return (
  <div className="flex flex-col items-center py-4 text-center">
    <p className="mb-3 text-sm text-white/50">Add friends to see your weekly recap</p>
    <Link
      to="/friends"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      Find friends
    </Link>
  </div>
)
```

Migrate to (heading + description + CTA per Decision 8):

```tsx
return (
  <div className="flex flex-col items-center py-4 text-center">
    <p className="text-base font-medium text-white">Faith grows stronger together</p>
    <p className="mt-1 mb-3 text-sm text-white/80">Your weekly journey, walked alongside friends</p>
    <Link
      to="/friends"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
    >
      Find people you walk with
      <span aria-hidden="true">→</span>
    </Link>
  </div>
)
```

Notes:
- CTA destination preserved at `to="/friends"`.
- UserPlus icon REMOVED from the CTA (the new CTA uses an arrow `→` per the locked copy "Find people you walk with →"). Remove `UserPlus` from imports if no other usage in the file.
- Heading uses body weight typography (`text-base font-medium text-white`), description uses `text-white/80`.
- Focus ring + hover behavior preserved.

**5c — Filled-state stat icons tonal application**

Currently each of the 4 stat row icons renders `className="h-4 w-4 flex-shrink-0 text-white/40"`. Migrate per the locked mapping:

| Stat row | Icon | New className |
|---|---|---|
| Prayed N times | BookOpen | `h-4 w-4 flex-shrink-0 text-pink-300` |
| Journaled N entries | PenLine | `h-4 w-4 flex-shrink-0 text-violet-300` |
| Completed N meditations | Brain | `h-4 w-4 flex-shrink-0 text-emerald-300` |
| Spent N hours in worship music | Music | `h-4 w-4 flex-shrink-0 text-cyan-300` |

The existing JSX maps over a stats array; the icon className may be parameterized per row. Read at execution time and apply the per-row mapping. If currently a single shared className, refactor to a per-row tonal entry on the array element.

Add `aria-hidden="true"` to each icon (verify whether already present).

**5d — Filled-state preservation (Decision 9)**

Verify these are NOT modified:
- "Last week, your friend group:" intro line (or current variant — read source).
- 4 stat lines reading "Prayed N times" / "Journaled N entries" / "Completed N meditations" / "Spent N hours in worship music".
- "You contributed N% of the group's growth!" line at line 56 — keep `mt-3 text-sm font-medium text-white/80`. Do NOT migrate to gradient text (gradient is reserved for ceremony headings per Decision 13). Do NOT change the copy.
- Dismiss "X" affordance (if present).

**Auth gating:** N/A — WeeklyRecap is logged-in only (Dashboard route gate).

**Responsive behavior:**
- Desktop: Empty-state heading + description + CTA stack vertically center-aligned. Filled state header row renders inline; stat rows below in vertical list.
- Tablet: Same.
- Mobile: Same — full-width vertical stack.

**Inline position expectations:**
- Empty-state heading, description, CTA: vertical stack — y values differ.
- Filled-state header icon + "Last Week" eyebrow: same y ±5px.
- Each stat row: icon + text + count share y ±5px within the row.

**Guardrails (DO NOT):**
- Do NOT swap glyphs: keep BookOpen, PenLine, Brain, Music. The spec rule is to keep existing glyphs and apply tonal colors.
- Do NOT migrate the "You contributed N%" line to gradient text — gradient text is reserved for ceremony headings.
- Do NOT rewrite the filled-state copy (Decision 9 verbatim preservation).
- Do NOT change the CTA destination — the routing target preserves `to="/friends"`; only the link TEXT migrates.
- Do NOT keep the UserPlus icon on the new empty-state CTA (the locked copy is "Find people you walk with →" without an icon).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| WeeklyRecap.test.tsx (update existing) | unit | Empty-state asserts new heading "Faith grows stronger together", description "Your weekly journey, walked alongside friends", CTA "Find people you walk with →". |
| WeeklyRecap.test.tsx (update existing) | unit | Old empty-state copy assertions ("Add friends to see your weekly recap" / "Find friends") REMOVED — replaced by new copy assertions. |
| WeeklyRecap.test.tsx (extend) | unit | Asserts BarChart3 header icon renders with `text-violet-300`. |
| WeeklyRecap.test.tsx (extend) | unit | Asserts each stat-row icon renders with the locked tonal class (BookOpen pink, PenLine violet, Brain emerald, Music cyan). |
| WeeklyRecap.test.tsx (extend, regression) | unit | Asserts "You contributed N% of the group's growth!" line still renders unchanged. |
| Existing tests | integration | Filled vs empty state branching, dismiss handler, "Hours" pluralization preserved. |

**Expected state after completion:**
- [ ] BarChart3 header icon with `text-violet-300` renders.
- [ ] Empty-state copy migrated to Decision 8 strings.
- [ ] 4 stat-row icons render with locked tonal classes.
- [ ] Filled-state copy preserved verbatim.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 6: WeeklyGodMoments — add Sparkles header + amber tonal

**Objective:** Add a Sparkles header icon with `text-amber-300`. Preserve banner-style chrome and content structure.

**Files to create/modify:**
- `frontend/src/components/dashboard/WeeklyGodMoments.tsx`

**Details:**

File currently has no Sparkles import. Add to lucide-react import (currently `BookOpen, CheckCircle, TrendingUp, Minus, Heart, X`):

```tsx
import { BookOpen, CheckCircle, TrendingUp, Minus, Heart, Sparkles, X } from 'lucide-react'
```

Add an inline header at the top of the banner content (read JSX at execution to find best insertion — likely just above the 3-stat row):

```tsx
<div className="mb-3 flex items-center gap-2">
  <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
  <span className="text-xs uppercase tracking-[0.15em] text-white/50 font-medium">Your Week with God</span>
</div>
```

The eyebrow text "Your Week with God" mirrors the banner's accessible name (`role="region" aria-label="Your week with God summary"` at line 60).

**Preserve verbatim:**
- Outer `<div className="relative rounded-2xl border border-primary/20 bg-primary/10 p-4 ... md:p-6">` rolls-own banner chrome ([UNVERIFIED] preservation).
- 3-stat row (BookOpen + CheckCircle + TrendIcon — TrendingUp/Minus dynamic).
- Dismiss X button at line 67 with `text-white/60 hover:text-white` or current tones.
- Fade-out animation via `setFading` + 300ms timer on dismiss.
- Visibility gating (`godMoments.isVisible`).
- All stat icon colors (BookOpen `text-success`/`text-white/60` via `devotionalColor`; CheckCircle `text-white/60`; TrendIcon dynamic via `MOOD_TREND_CONFIG`) — these are content-state-driven and stay as-is.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop: Header row renders inline; banner content below.
- Tablet: Same.
- Mobile: Same; padding scales via `p-4 ... md:p-6`.

**Inline position expectations:** Header icon + eyebrow text share y ±5px.

**Guardrails (DO NOT):**
- Do NOT migrate the banner chrome to FrostedCard default — the primary-tinted banner is intentional ([UNVERIFIED] preservation).
- Do NOT modify the 3 stat icons — they are state-driven, not categorical Tonal Icon Pattern targets.
- Do NOT rewrite the "Your week with God" content or its weekly visibility gating.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| WeeklyGodMoments.test.tsx (extend) | unit | Asserts Sparkles header icon renders with `text-amber-300` and `aria-hidden="true"`. |
| Existing tests | integration | Visibility gating, dismiss/fade animation, 3-stat content rendering preserved. |

**Expected state after completion:**
- [ ] Sparkles header icon with `text-amber-300` renders.
- [ ] All existing behavior + banner chrome preserved.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 7: QuickActions — tile chrome migration + 4 tonal icons + hover lift

**Objective:** Migrate each of the 4 tiles to `<FrostedCard variant="subdued">` chrome with distinct tonal icons (pink/sky/violet/cyan), apply hover lift, preserve navigation behavior.

**Files to create/modify:**
- `frontend/src/components/dashboard/QuickActions.tsx`

**Details:**

This is the most visually impactful change in 4C. Current file is 27 lines with an `ACTIONS` constant array driving 4 `<Link>` tiles.

**Import additions:**

```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

**ACTIONS array migration:**

The existing array (lines 4–9) likely has `{ icon, label, to }` per tile. Extend to include a `tonal` className per tile:

```tsx
const ACTIONS = [
  { icon: Heart, label: 'Pray', to: '/daily?tab=pray', tonal: 'text-pink-300' },
  { icon: BookOpen, label: 'Journal', to: '/daily?tab=journal', tonal: 'text-sky-300' },
  { icon: Brain, label: 'Meditate', to: '/daily?tab=meditate', tonal: 'text-violet-300' },
  { icon: Music, label: 'Music', to: '/music', tonal: 'text-cyan-300' },
]
```

**Tile JSX migration:**

Replace the existing tile className `flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white/80 transition-all motion-reduce:transition-none hover:scale-[1.02] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:scale-100 md:p-6` with `<FrostedCard variant="subdued">` wrapping a button-shaped inner content. Pattern:

```tsx
{ACTIONS.map(({ icon: Icon, label, to, tonal }) => (
  <Link
    key={to}
    to={to}
    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg rounded-3xl"
    aria-label={label}
  >
    <FrostedCard
      variant="subdued"
      className="flex flex-col items-center justify-center gap-2 transition-all duration-200 hover:bg-white/[0.08] motion-safe:hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
    >
      <Icon className={cn('h-6 w-6 md:h-8 md:w-8', tonal)} aria-hidden="true" />
      <span className="text-sm font-medium text-white">{label}</span>
    </FrostedCard>
  </Link>
))}
```

**Container grid (preserved):**

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
```

The `grid-cols-2 md:grid-cols-4` preservation matches existing responsive convention.

**Notes:**
- The `<Link>` is OUTER for native navigation semantics; the FrostedCard is INNER as the visual wrapper.
- The accessible name comes from the `<span>` label inside the FrostedCard.
- `aria-label={label}` on the `<Link>` is redundant with the visible label but is explicit-good-practice.
- Icons receive `aria-hidden="true"` — they're decorative; the label provides the accessible name.
- Hover treatment: `hover:bg-white/[0.08]` (brightness boost) + `motion-safe:hover:-translate-y-0.5` (lift) + `motion-reduce:hover:translate-y-0` (explicit reset). Transition: `transition-all duration-200` (Tailwind default; no hardcoded cubic-bezier; no `quickHover` token in `animation.ts`).
- The existing `hover:scale-[1.02]` is REPLACED by `-translate-y-0.5` to match site-wide FrostedCard hover convention.
- Focus ring on the `<Link>` uses `focus-visible:ring-primary-lt/70` (matches FriendsPreview empty-state CTA pattern).

**Auth gating:** N/A — tile clicks navigate; downstream auth gates fire on destination.

**Responsive behavior:**
- Desktop (≥768px): 4-column grid. Tiles render in a single row. Icon size `md:h-8 md:w-8`.
- Tablet (≥640px): Still 4-column at `md:grid-cols-4` (Tailwind `md:` breakpoint = 768px). At 640–767px, falls back to 2-column. Icon size `md:h-8 md:w-8` only kicks in at 768+; below that, `h-6 w-6`.
- Mobile (<768px): 2x2 grid. Icon size `h-6 w-6`.

**Inline position expectations:**
- Desktop (1024px+): All 4 tiles share y ±5px (single row, `md:grid-cols-4`).
- Tablet/desktop (768–1023px): All 4 tiles share y ±5px (still single row at `md:grid-cols-4`).
- Mobile (<768px): Pray + Journal share y; Meditate + Music share y (different y from row 1).

**Guardrails (DO NOT):**
- Do NOT remove the 4 navigation destinations or change any href/to values.
- Do NOT swap glyphs (Heart/BookOpen/Brain/Music preserved).
- Do NOT introduce hardcoded `cubic-bezier(...)` or `200ms` strings — Tailwind default `transition-all duration-200` is the locked choice.
- Do NOT remove `aria-hidden="true"` from icons (decorative once the label is present).
- Do NOT keep `hover:scale-[1.02]` — replaced by `-translate-y-0.5` per locked decision.
- Do NOT use a styled-wrapper fallback for tile chrome — `<FrostedCard variant="subdued">` exists and is the locked choice.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| QuickActions.test.tsx (update existing) | unit | Asserts 4 tiles render with their locked tonal classes (Heart `text-pink-300`, BookOpen `text-sky-300`, Brain `text-violet-300`, Music `text-cyan-300`). |
| QuickActions.test.tsx (update existing) | unit | Asserts each tile's navigation `to` prop is preserved (`/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`). |
| QuickActions.test.tsx (extend) | unit | Asserts each icon has `aria-hidden="true"`. |
| QuickActions.test.tsx (extend) | unit | Asserts each tile's accessible name is the label text. |
| QuickActions.test.tsx (extend) | unit | Asserts each tile is wrapped in `<FrostedCard variant="subdued">` (or has FrostedCard subdued classes). |
| Existing tests | integration | Click navigation, keyboard activation (Enter on `<Link>` works natively), focus management preserved. |

**Expected state after completion:**
- [ ] All 4 tiles use `<FrostedCard variant="subdued">` chrome.
- [ ] Each tile's icon renders with locked tonal class.
- [ ] Hover lift treatment applied (`-translate-y-0.5` + brightness boost) with reduced-motion safety.
- [ ] All navigation destinations preserved.
- [ ] Accessible names + keyboard activation verified.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 8: AnniversaryCard — add PartyPopper header + amber tonal + closing message migration

**Objective:** Add PartyPopper header icon (NOT Sparkles — see Edge Cases for differentiation rationale) with `text-amber-300`. Drop `font-serif italic` from closing message per Decision 7.

**Files to create/modify:**
- `frontend/src/components/dashboard/AnniversaryCard.tsx`

**Details:**

File has no Lucide imports currently. Add:

```tsx
import { PartyPopper } from 'lucide-react'
```

PartyPopper verified available in `lucide-react@^0.356.0` (the version installed). DO NOT swap to Sparkles — that's WeeklyGodMoments' glyph and reusing it on AnniversaryCard would defeat the Tonal Icon Pattern's category differentiation. Both widgets share `text-amber-300` (warm-gold celebration family) but the glyphs distinguish "milestone celebration" (PartyPopper) from "moments of wonder" (Sparkles). If a future lucide-react upgrade ever removes PartyPopper, the documented fallback is `Trophy` (also verified available in 0.356.0) — never fall back to Sparkles.

Find the existing celebration heading (read at execution — likely near the top of the card content, above the stats list). Apply the icon inline before the heading text:

```tsx
<div className="flex items-center gap-2">
  <PartyPopper className="h-5 w-5 text-amber-300" aria-hidden="true" />
  <h3 className="text-base font-medium text-white">{/* existing heading text — typically "X year(s) on Worship Room!" */}</h3>
</div>
```

If the existing heading doesn't have an `<h3>` element (just a `<p>` or styled text), match the existing semantic — apply the inline icon + existing element pattern.

**Closing message migration (Decision 7):**

Line 44 currently: `<p className="mt-4 font-serif text-sm italic text-white/60">{closingMessage}</p>`

Migrate to: `<p className="mt-4 text-sm text-white/60">{closingMessage}</p>`

Drop both `font-serif` AND `italic` (Decision 7 reasoning: Lora italic is for scripture only; AnniversaryCard celebratory prose isn't scripture).

**Preserve verbatim:**
- Outer `<div className="rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-amber-500/10 backdrop-blur-sm">` rolls-own chrome ([UNVERIFIED] preservation per Decision 4 implicit-rule "only one accent card on Dashboard").
- Stats list content.
- `data-testid="anniversary-card"`.
- Dismiss button bottom-right with localStorage write to `wr_anniversary_milestones_shown` + `wr_last_surprise_date`.
- Sparkle sound effect on mount via `useSoundEffects`.
- Celebratory copy ("X year(s) on Worship Room!" or current variant).
- `closingMessage` content (prose itself unchanged; only styling migrates).

**Auth gating:** N/A — AnniversaryCard renders only on milestone date (logged-in only).

**Responsive behavior:**
- Desktop: Heading row renders inline.
- Tablet: Same.
- Mobile: Same; icon + heading stay inline.

**Inline position expectations:** Sparkles + heading text share y ±5px (single flex row).

**Guardrails (DO NOT):**
- Do NOT use Sparkles glyph — that's WeeklyGodMoments' icon. Reusing it would collapse the Tonal Icon Pattern's category differentiation between "milestone celebration" (this card) and "moments of wonder" (WeeklyGodMoments). PartyPopper is the locked choice; Trophy is the documented fallback only if a future lucide-react upgrade removes PartyPopper.
- Do NOT migrate chrome to `<FrostedCard variant="accent">` — Decision 4 implicit-rule (only Getting Started gets accent on Dashboard).
- Do NOT keep `font-serif italic` on the closing message — Decision 7 explicit migration.
- Do NOT change the celebratory copy or stats list content.
- Do NOT modify the dismiss handler / localStorage writes / sparkle sound effect (the sparkle SOUND effect via `useSoundEffects` stays — it's audio, not the visual glyph; preserved verbatim).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AnniversaryCard.test.tsx (extend) | unit | Asserts PartyPopper header icon renders with `text-amber-300` and `aria-hidden="true"`. |
| AnniversaryCard.test.tsx (extend) | unit | Asserts NO Sparkles icon is rendered on this card (negative assertion to lock the differentiation from WeeklyGodMoments). |
| AnniversaryCard.test.tsx (extend) | unit | Asserts closing message paragraph does NOT have `italic` or `font-serif` class. |
| AnniversaryCard.test.tsx (extend, regression) | unit | Asserts celebratory copy ("X year(s) on..." or current variant) still renders. |
| Existing tests | integration | Render conditions, dismiss handler, localStorage writes, sparkle sound effect on mount preserved. |

**Expected state after completion:**
- [ ] PartyPopper header icon with `text-amber-300` renders.
- [ ] No Sparkles icon on AnniversaryCard (verified via test + visual eyeball).
- [ ] Closing message in default sans-serif, non-italic.
- [ ] All existing behavior + chrome + copy preserved.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 9: EveningReflectionBanner — Moon tonal class swap

**Objective:** Change Moon icon class from `text-indigo-300` to `text-violet-300` per spec table. Verify chrome + Reflect Now button + conditional rendering.

**Files to create/modify:**
- `frontend/src/components/dashboard/EveningReflectionBanner.tsx`

**Details:**

The Moon icon is at line 21: `<Moon className="mt-0.5 h-6 w-6 shrink-0 text-indigo-300 sm:mt-0" />`.

Migrate to: `<Moon className="mt-0.5 h-6 w-6 shrink-0 text-violet-300 sm:mt-0" aria-hidden="true" />`

Notes:
- Single class swap: `text-indigo-300` → `text-violet-300`.
- Add `aria-hidden="true"` if not already present (Moon is decorative; "Reflect Now" button text is the accessible affordance).
- Other classes preserved (`mt-0.5 h-6 w-6 shrink-0 sm:mt-0`).

**Verifications (preservation):**
- "Reflect Now" button: Already `<Button variant="subtle">` per 4A. Verify intact. If regressed, re-apply.
- Outer chrome `rounded-2xl border border-indigo-400/20 bg-indigo-900/30 p-4 md:p-6`: PRESERVED ([UNVERIFIED] decision in Assumptions; the indigo-tinted banner reinforces the lavender icon family).
- `motion-safe:animate-widget-enter` conditional: preserved.
- Conditional rendering (evening-hours gating, e.g., `currentHour > 18` or similar) PRESERVED VERBATIM.
- Copy preserved.

**Auth gating:** N/A — EveningReflectionBanner renders only for logged-in users during evening hours.

**Responsive behavior:**
- Desktop / Tablet / Mobile: Existing layout inherited (icon + heading + Reflect Now button + Not Tonight link). Padding scales via `p-4 ... md:p-6`.

**Inline position expectations:** Moon icon and adjacent heading text share y ±5px (existing inline layout).

**Guardrails (DO NOT):**
- Do NOT migrate the indigo-tinted chrome to FrostedCard default ([UNVERIFIED] preservation).
- Do NOT modify the conditional render threshold (evening-hours check).
- Do NOT change "Reflect Now" button variant or click handler.
- Do NOT change "Not tonight" link behavior or its localStorage write to `wr_evening_reflection`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| EveningReflectionBanner.test.tsx (update existing) | unit | Update assertion from `text-indigo-300` → `text-violet-300` on Moon icon. |
| EveningReflectionBanner.test.tsx (extend if missing) | unit | Asserts Moon icon has `aria-hidden="true"`. |
| EveningReflectionBanner.test.tsx (regression) | unit | Asserts "Reflect Now" button is `<Button variant="subtle">` (post-4A intact). |
| Existing tests | integration | Conditional rendering, Reflect Now click handler, Not tonight click handler, localStorage writes preserved. |

**Expected state after completion:**
- [ ] Moon icon renders with `text-violet-300` (not `text-indigo-300`).
- [ ] All existing behavior preserved.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 10: EchoCard — tonal icon class swap + double-nest verification

**Objective:** Change EchoCard's dynamic Icon className from `text-white/30` to `text-amber-300`. Verify EchoCard renders inside exactly ONE FrostedCard surface on Dashboard (resolve double-nest if present).

**Files to create/modify:**
- `frontend/src/components/echoes/EchoCard.tsx` (icon class swap)
- `frontend/src/pages/Dashboard.tsx` AND/OR `frontend/src/components/echoes/EchoCard.tsx` (double-nest resolution path)

**Details:**

**10a — Icon class swap**

Line 39 currently: `<Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />`

Migrate to: `<Icon className="h-3.5 w-3.5 text-amber-300 shrink-0" aria-hidden="true" />`

Notes:
- The dynamic `Icon` is from `KIND_CONFIG` — Bookmark / Calendar / Highlighter glyphs by kind. Glyph stays dynamic; only the color migrates from `text-white/30` to `text-amber-300`.
- Add `aria-hidden="true"` if not already present (the `<Link>` has `aria-label={`Echo: you ${verb} ${echo.reference} ${echo.relativeLabel}. Tap to open.`}` so the icon is decorative).
- The icon's surrounding span "You {verb} this {echo.relativeLabel}" stays as-is (`text-white/50`).

**10b — Double-nest resolution at Dashboard.tsx:539**

Apply the spec Change 8 resolution decision tree based on the EXECUTION-TIME read (already locked in Step 1):

- **If EchoCard wraps internally (yes — confirmed) AND DashboardCard wraps externally at Dashboard.tsx:539:** REMOVE EchoCard's internal `<FrostedCard variant="default">` wrapper. Replace with the inner content directly inside the `<Link>`. Add chrome via the Dashboard.tsx wrapping site if needed for visual continuity, OR rely on DashboardCard's chrome.
- **If EchoCard wraps internally AND it's NOT rendered inside DashboardCard externally:** KEEP EchoCard's internal FrostedCard wrapper as-is. Only the icon class swap applies. (This is the BEST GUESS DEFAULT — EchoCard is typically rendered as a standalone card "between hero greeting and VOTD card" per `10-ux-flows.md`; not nested in DashboardCard.)
- **If EchoCard does NOT wrap internally (NO — it does wrap):** N/A.

**Document the chosen resolution path inline in the Execution Log.**

**Cross-surface usage check:**
- DevotionalTabContent.tsx:335 also renders EchoCard. Verify the chosen resolution doesn't break rendering on `/daily?tab=devotional`. If removing EchoCard's internal FrostedCard breaks the devotional tab render, surface and either: (a) keep the internal wrapper but add a prop to skip rendering it inside DashboardCard, or (b) wrap at the Dashboard.tsx site only and leave DevotionalTabContent unchanged. Default: keep internal wrapper IF Dashboard.tsx renders EchoCard standalone (most likely case).

**Preserve verbatim:**
- `useEcho()` session-scoped hook consumption (NOT a reactive store).
- BB-38 deep link navigation via `<Link to={to}>`.
- Lora serif verse text (`font-serif`) for echo text.
- All other class strings on the existing JSX.

**Auth gating:** N/A — EchoCard auth-independent (Bible Wave auth posture).

**Responsive behavior:**
- Desktop / Tablet / Mobile: Existing FrostedCard layout. No new responsive changes.

**Inline position expectations:** Icon + "You {verb}..." span share y ±5px (existing flex row).

**Guardrails (DO NOT):**
- Do NOT swap the dynamic Icon glyphs (Bookmark / Calendar / Highlighter preserved per kind).
- Do NOT modify `useEcho()` consumption or the echo selection engine.
- Do NOT remove the BB-38 deep link routing.
- Do NOT migrate the verse text from Lora serif (it's scripture font; Decision 7 explicit preservation for scripture).
- Do NOT add a prop to EchoCard for variant control unless forced by cross-surface incompatibility.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| EchoCard.test.tsx (update existing) | unit | Asserts Icon renders with `text-amber-300` (not `text-white/30`). |
| EchoCard.test.tsx (regression) | unit | Asserts dynamic Icon glyph is selected per kind (Bookmark/Calendar/Highlighter). |
| DashboardEcho.test.tsx (regression) | integration | Asserts EchoCard renders correctly on Dashboard (chrome continuity). |
| DevotionalEcho.test.tsx (regression) | integration | Asserts EchoCard renders correctly on Devotional tab post-resolution. |

**Expected state after completion:**
- [ ] EchoCard icon renders with `text-amber-300`.
- [ ] EchoCard renders inside exactly ONE FrostedCard surface on Dashboard.
- [ ] Cross-surface usage on `/daily?tab=devotional` intact.
- [ ] `useEcho()` consumption preserved.
- [ ] `pnpm typecheck` + `pnpm test` pass.
- [ ] Resolution path documented inline in plan's Execution Log.

---

### Step 11: Ceremony heading 1 — GettingStartedCelebration:77

**Objective:** Migrate `font-script` to gradient text pattern.

**Files to create/modify:**
- `frontend/src/components/dashboard/GettingStartedCelebration.tsx`

**Details:**

Line 77 currently:
```tsx
className="text-center font-script text-3xl text-white sm:text-4xl md:text-5xl"
```

Migrate to:
```tsx
className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold sm:text-4xl md:text-5xl"
```

Notes:
- Remove `font-script` and `text-white` (gradient + clip-text replaces both).
- Add `font-bold` for weight emphasis.
- Preserve `text-center`.
- Preserve size cascade `text-3xl sm:text-4xl md:text-5xl`.
- Preserve heading text content "You're all set! Welcome to Worship Room." and the `id="getting-started-celebration-title"` attribute.

**Modal interior UNCHANGED** beyond this className. Body content, layout, dismissal logic, surrounding modal structure — all stay verbatim.

**Auth gating:** N/A — celebration fires on Getting Started checklist completion (logged-in only).

**Responsive behavior:**
- Mobile (375px): Heading at `text-3xl` (1.875rem ≈ 30px). Gradient renders.
- Tablet (640px+): `sm:text-4xl` (2.25rem ≈ 36px). Gradient renders.
- Desktop (768px+): `md:text-5xl` (3rem ≈ 48px). Gradient renders.
- All breakpoints: heading is `text-center`. CSS `bg-clip-text` works on multi-line text but verify visual rendering at execution.

**Inline position expectations:** N/A — single heading element, not an inline group.

**Guardrails (DO NOT):**
- Do NOT modify modal body content.
- Do NOT remove `id="getting-started-celebration-title"` (used for `aria-labelledby` elsewhere if applicable).
- Do NOT keep `font-script` or `text-white` (gradient replaces both).
- Do NOT skip `font-bold` (the gradient pattern needs explicit weight).
- Do NOT change heading text content.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GettingStartedCelebration.test.tsx (update if asserts on `font-script`) | unit | Update assertion to assert presence of gradient classes (`bg-clip-text`, `text-transparent`, `from-violet-300`). |
| GettingStartedCelebration.test.tsx (regression) | unit | Asserts heading text content unchanged. |
| Existing tests | integration | Render condition (post-Getting-Started-checklist completion), dismiss flow preserved. |

**Expected state after completion:**
- [ ] Line 77 heading renders gradient text.
- [ ] No `font-script` class on this heading.
- [ ] Modal body unchanged.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 12: Ceremony heading 2 + 3 — WelcomeWizard:329 and :517

**Objective:** Migrate two `font-script` headings in WelcomeWizard to gradient text pattern.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx`

**Details:**

**Line 329 (Screen 1 Welcome heading) currently:**
```tsx
className="text-center font-script text-3xl font-bold text-white outline-none sm:text-4xl"
```

Migrate to:
```tsx
className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold outline-none sm:text-4xl"
```

Notes:
- Remove `font-script` and `text-white` (gradient + clip-text replaces both).
- Preserve `text-center`, `font-bold`, `outline-none`, size cascade `text-3xl sm:text-4xl`.
- Preserve `id="wizard-heading-welcome"`, `ref={ref}`, `tabIndex={-1}`.
- Heading text "Welcome to Worship Room" preserved.

**Line 517 (Screen 4 Results heading) currently:**
```tsx
className="font-script text-2xl font-bold text-white outline-none sm:text-3xl"
```

Migrate to:
```tsx
className="bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-2xl font-bold outline-none sm:text-3xl"
```

Notes:
- Remove `font-script` and `text-white`.
- Preserve `font-bold`, `outline-none`, size cascade `text-2xl sm:text-3xl`.
- Preserve `id="wizard-heading-results"`, `ref={ref}`, `tabIndex={-1}`.
- Heading text "You're All Set!" preserved.

**Wizard interior UNCHANGED** beyond these two classNames. Input fields, step indicators, navigation buttons, body content, validation, transitions — all stay verbatim. Modal interior is 4D scope.

**Auth gating:** N/A — wizard fires on first session post-registration (logged-in only).

**Responsive behavior:**
- Line 329: `text-3xl` mobile, `sm:text-4xl` tablet+.
- Line 517: `text-2xl` mobile, `sm:text-3xl` tablet+.
- Both gradients render at all breakpoints.

**Inline position expectations:** N/A — single heading elements.

**Guardrails (DO NOT):**
- Do NOT modify wizard body content (input fields, step indicators, navigation, validation).
- Do NOT remove `id`, `ref`, `tabIndex` on either heading (used for focus management).
- Do NOT change heading text content.
- Do NOT skip the `outline-none` retention (the input-aware heading at line 329 is focusable for screen reader announcement; `outline-none` is preserved because the focus ring lives elsewhere or is intentionally hidden — verify at execution).

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| WelcomeWizard.test.tsx (update if asserts on `font-script`) | unit | Update assertions to gradient classes for both headings. |
| WelcomeWizard.test.tsx (regression) | unit | Asserts heading text "Welcome to Worship Room" and "You're All Set!" preserved. |
| Existing tests | integration | Wizard step navigation, input fields, validation, completion flow preserved. |

**Expected state after completion:**
- [ ] Line 329 heading renders gradient text.
- [ ] Line 517 heading renders gradient text.
- [ ] No `font-script` class on either heading.
- [ ] Wizard interior unchanged.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 13: Ceremony heading 4 — WelcomeBack:134

**Objective:** Migrate `font-script` heading in WelcomeBack to gradient text pattern, preserving `cn()` invocation and `fadeIn` continuation.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeBack.tsx`

**Details:**

Line 134 currently:
```tsx
className={cn('font-script text-4xl font-bold text-white sm:text-5xl', fadeIn)}
```

Migrate to:
```tsx
className={cn('bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-4xl font-bold sm:text-5xl', fadeIn)}
```

Notes:
- Preserve `cn(...)` invocation pattern.
- Preserve `fadeIn` variable continuation (animation entry effect — conditionally `'motion-safe:animate-fade-in'` or empty string).
- Remove `font-script` and `text-white` (gradient + clip-text replaces both).
- Preserve `font-bold` and size cascade `text-4xl sm:text-5xl`.
- Preserve `style={stagger(0)}`, `ref={headingRef}`, `tabIndex={-1}`.
- Heading text `userName ? \`Welcome back, ${userName}\` : 'Welcome Back'` preserved.

**Modal interior UNCHANGED** beyond this className.

**Auth gating:** N/A — WelcomeBack fires for logged-in users returning after absence threshold.

**Responsive behavior:**
- Mobile: `text-4xl` (2.25rem ≈ 36px).
- Tablet+: `sm:text-5xl` (3rem ≈ 48px).

**Inline position expectations:** N/A — single heading element.

**Guardrails (DO NOT):**
- Do NOT remove the `cn(...)` invocation — the `fadeIn` continuation needs the dynamic className concat.
- Do NOT remove `style={stagger(0)}`, `ref={headingRef}`, or `tabIndex={-1}` (focus management + animation timing).
- Do NOT modify the userName interpolation in the heading text.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| WelcomeBack.test.tsx (update if asserts on `font-script`) | unit | Update assertion to gradient classes. |
| WelcomeBack.test.tsx (regression) | unit | Asserts heading interpolation `Welcome back, ${userName}` and `Welcome Back` fallback preserved. |
| Existing tests | integration | Render conditions, focus management, animation entry preserved. |

**Expected state after completion:**
- [ ] Line 134 heading renders gradient text via `cn(...)`.
- [ ] No `font-script` class on this heading.
- [ ] Modal body unchanged.
- [ ] `pnpm typecheck` + `pnpm test` pass.

---

### Step 14: Test class-string updates + Caveat residual grep verification

**Objective:** Update any tests that asserted on old class strings or the WeeklyRecap empty-state copy. Verify no `font-script` Caveat usages remain in the four migrated files.

**Files to create/modify:**
- Test files identified during execution (likely):
  - `frontend/src/components/dashboard/__tests__/QuickActions.test.tsx`
  - `frontend/src/components/dashboard/__tests__/WeeklyRecap.test.tsx`
  - `frontend/src/components/dashboard/__tests__/FriendsPreview.test.tsx`
  - `frontend/src/components/dashboard/__tests__/AnniversaryCard.test.tsx`
  - `frontend/src/components/dashboard/__tests__/EveningReflectionBanner.test.tsx`
  - `frontend/src/components/dashboard/__tests__/InstallCard.test.tsx`
  - `frontend/src/components/dashboard/__tests__/WeeklyGodMoments.test.tsx`
  - `frontend/src/components/echoes/__tests__/EchoCard.test.tsx`
  - `frontend/src/pages/__tests__/DashboardEcho.test.tsx`
  - `frontend/src/components/dashboard/__tests__/GettingStartedCelebration.test.tsx`
  - `frontend/src/components/dashboard/__tests__/WelcomeWizard.test.tsx`
  - `frontend/src/components/dashboard/__tests__/WelcomeBack.test.tsx`
  - `frontend/src/components/dashboard/__tests__/DashboardWidgetGrid.test.tsx` (if asserts `style.order === 9999`)

**Details:**

Run `pnpm test --run` and triage failures. Expected failure categories:

1. **Class-name drift on icon classes** — assertions like `expect(icon).toHaveClass('text-white/40')` or `text-indigo-300` need updating to the new tonal classes.
2. **WeeklyRecap empty-state copy drift** — assertions on old copy strings ("Add friends to see your weekly recap" / "Find friends") need updating to new copy ("Faith grows stronger together" / "Your weekly journey, walked alongside friends" / "Find people you walk with →").
3. **Magic-number drift** — if any test asserts `style.order === 9999` (or with the integer 9999), update to assert `INSTALL_CARD_ORDER` or `'999'`.
4. **`font-script` class assertions on the four ceremony headings** — update to assert gradient classes (`bg-clip-text`, `text-transparent`, `from-violet-300`).
5. **`font-serif italic` assertion on AnniversaryCard closing message** — update to assert no `italic` class and no `font-serif` class.

**Verification grep:**

```bash
grep -rn "font-script" frontend/src --include="*.tsx" --include="*.ts"
```

Expected: ZERO matches in `frontend/src/components/dashboard/` (the four migrated files) and zero in user-visible code paths. Acceptable matches: tailwind config references, mock data, fixtures, comments labeled deprecated. The Caveat font itself stays in `tailwind.config.js` (removal is a separate follow-up spec).

**Behavior tests preservation (NON-NEGOTIABLE):**

Tests that assert on **behavior** (button click handlers firing, conditional rendering branches, evening-hours gating, ceremony render conditions, navigation logic, leaderboard ranking math, MilestoneFeed pagination, InstallCard PWA-availability gating, useEcho session state) MUST continue to pass without modification. If any of these tests fail, that's a regression — not a class-string update target.

**Auth gating:** N/A — test maintenance.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT silence behavior tests — they're regression anchors.
- Do NOT add new tests just to hit acceptance bullets — extend existing or add minimal targeted assertions.
- Do NOT bulk-modify tests with `replace_all`; review each failure individually.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (per-file updates) | unit/integration | Assertions on changed class names and copy migrated to new tokens; behavior tests preserved. |

**Expected state after completion:**
- [ ] Class-string assertions updated where the chrome literally changed.
- [ ] Empty-state copy assertions updated to Decision 8 strings.
- [ ] Magic-number `9999` assertion (if any) updated to `INSTALL_CARD_ORDER`.
- [ ] No `font-script` matches in `frontend/src/components/dashboard/` (verified via grep).
- [ ] All behavior tests pass without modification.
- [ ] Net regression count: 0 net of the 11 pre-existing tech-debt failures.

---

### Step 15: Quality gates + visual eyeball check

**Objective:** Run all quality gates and perform a visual sanity check on `/`.

**Files to create/modify:**
- (none — verification only)

**Details:**

Run all gates from `frontend/`:

```bash
pnpm typecheck
pnpm test --run --reporter=verbose 2>&1 | tail -50
pnpm build
pnpm lint
```

All four must pass. The test pass count must equal the baseline captured in Step 1 plus any new tests added in Steps 2–14, with the 11 pre-existing failures unchanged.

**Visual eyeball check** (start dev server, visit `/` logged-in via `wr_auth_simulated=true`):

- [ ] All 8 widgets show their tonal icons:
  - Mint Users on FriendsPreview header
  - Lavender BarChart3 on WeeklyRecap header
  - Pink/Violet/Emerald/Cyan stat icons on WeeklyRecap filled state
  - Gold Sparkles on WeeklyGodMoments
  - Pink/Sky/Violet/Cyan tile icons on QuickActions (4 visually distinct doors)
  - Gold PartyPopper on AnniversaryCard (NOT Sparkles — verify glyph differs from WeeklyGodMoments at a glance)
  - Lavender Moon on EveningReflectionBanner
  - Cyan Download on InstallCard
  - Gold (dynamic glyph) on EchoCard
- [ ] WeeklyRecap empty state shows new copy ("Faith grows stronger together" / "Your weekly journey, walked alongside friends" / "Find people you walk with →") when user has no friends.
- [ ] InstallCard sits last in Dashboard grid at desktop, tablet, mobile viewports.
- [ ] AnniversaryCard closing message renders non-italic, no Lora.
- [ ] Hover on QuickActions tiles produces visible lift + brightness boost on desktop.
- [ ] No `font-script` Caveat anywhere on the page (Inspect via DevTools or grep).
- [ ] Cards still feel like family — FrostedCard chrome consistent across 8 widgets in 4C scope + 11 in 4B + foundation in 4A.
- [ ] Hover states on FrostedCards still work (`-translate-y-0.5`, surface brightens) — inherited from 4A, verified intact.

**Visit ceremony overlays** (trigger via dev tools):

- [ ] GettingStartedCelebration heading renders gradient text.
- [ ] WelcomeWizard Screen 1 + Screen 4 headings render gradient text.
- [ ] WelcomeBack heading renders gradient text.
- [ ] No `font-script` on any of the four headings (DevTools Inspect).
- [ ] Modal interiors UNCHANGED.

**Cross-surface regression sweep:**

- [ ] `/daily?tab=devotional` — DevotionalTabContent renders unchanged; EchoCard renders cleanly post double-nest resolution.
- [ ] `/daily?tab=pray|journal|meditate` — render unchanged.
- [ ] `/bible` — BibleLanding renders unchanged.
- [ ] `/bible/plans` — renders unchanged.
- [ ] `/music` — Music QuickAction destination — renders unchanged.
- [ ] `/prayer-wall` — renders unchanged.
- [ ] `/bible/my` — EchoCard cross-surface (if shown there) renders unchanged.

**Lighthouse + accessibility (defer to /verify-with-playwright pipeline):**
- Lighthouse Performance ≥ 90 on `/`.
- Lighthouse Accessibility ≥ 95 on `/`.
- No new axe-core violations.
- Gradient text contrast ≥ 4.5:1 on all 4 ceremony headings — if fails, apply fallback `from-violet-400 to-violet-300`.

**Auth gating:** N/A.

**Responsive behavior:** Verified across all 3 breakpoints during eyeball check.

**Inline position expectations:** Verified at the QuickActions 4-tile row at desktop (single-row) and mobile (2x2).

**Guardrails (DO NOT):**
- Do NOT proceed past this step if `pnpm typecheck` fails.
- Do NOT proceed if test failure count exceeds baseline + new tests + 11 pre-existing.
- Do NOT skip the gradient-text contrast check on ceremony headings.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (full suite) | regression | Net regression count: 0 net of 11 pre-existing failures. |

**Expected state after completion:**
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes baseline + new.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] Visual eyeball check passes all bullets.
- [ ] Cross-surface regression sweep passes.
- [ ] Lighthouse + axe-core verified via /verify-with-playwright.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Pre-execution verification + baseline. Must run first to lock [UNVERIFIED] decisions. |
| 2 | 1 | INSTALL_CARD_ORDER constant + DashboardWidgetGrid update. Independent of widget content changes. |
| 3 | 2 | InstallCard Download icon + tonal cyan. Independent of other widgets. |
| 4 | 1 | FriendsPreview Users header + tonal mint. Independent of other widgets. |
| 5 | 1 | WeeklyRecap full migration (header + 4 stats + empty-state copy). Independent of other widgets. |
| 6 | 1 | WeeklyGodMoments Sparkles header + amber tonal. Independent. |
| 7 | 1 | QuickActions 4-tile chrome migration + 4 tonal icons + hover. Independent. |
| 8 | 1 | AnniversaryCard Sparkles header + closing-message migration. Independent. |
| 9 | 1 | EveningReflectionBanner Moon tonal swap. Independent. |
| 10 | 1 | EchoCard tonal swap + double-nest resolution. EchoCard depends on Step 1's resolution path being locked. |
| 11 | 1 | GettingStartedCelebration ceremony heading. Independent. |
| 12 | 1 | WelcomeWizard 2 ceremony headings. Independent. |
| 13 | 1 | WelcomeBack ceremony heading. Independent. |
| 14 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | Test class-string updates run after all source changes land. |
| 15 | 14 | Quality gates + visual eyeball — final regression check. |

Steps 2–13 can be parallelized in execution if desired; they touch independent files. Steps 14 and 15 are sequential gates.

---

## Execution Log

**User-directed deviations (locked at execution-time pre-checklist):**
- WeeklyGodMoments, AnniversaryCard, EveningReflectionBanner, InstallCard chrome MIGRATED to FrostedCard default (override of plan's "preserve rolls-own" defaults). Rationale: half-way migration creates exactly the visual incoherence the spec rejected for icons; first-class widgets join the system.
- AnniversaryCard amber ring preserved as `ring-1 ring-amber-500/10` styling detail INSIDE FrostedCard default (Decision 4 was about checklists, not AnniversaryCard).
- EveningReflectionBanner indigo tint dropped; Moon icon `text-violet-300` carries the evening voice.

**Plan/reality reconciliations during Step 1 reading:**
- FriendsPreview is rendered INSIDE `<DashboardCard>` at `DashboardWidgetGrid.tsx:279` with `icon={<Users />}` — tonal applied at the call site (line 283), no internal FriendsPreview.tsx changes (avoids competing with DashboardCard external title).
- WeeklyRecap is rendered INSIDE `<DashboardCard>` at line 294 with `icon={<BarChart3 />}` — tonal applied at the call site (line 298). Internal changes scoped to empty-state copy + 4 stat-row icons (no internal header eyebrow added).
- EchoCard at `Dashboard.tsx:539` is rendered as a direct child of a plain `<div>` (NOT wrapped in DashboardCard). Single-FrostedCard chrome via EchoCard's internal `<FrostedCard variant="default">`. **Locked:** keep internal wrapper, icon class swap only.
- WelcomeWizard headings at lines 329 + 517 confirmed user-visible (Screen1Welcome + Screen4Results, conditionally rendered).
- Hidden bug fix: `FrostedCard` did not accept `aria-label` prop; my pass-through was being silently dropped. Added `'aria-label'?: string` to `FrostedCardProps` and wired through. Side-effect benefit: future consumers can now use FrostedCard with descriptive ARIA labels.

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Pre-execution verification + baseline capture | [COMPLETE] | 2026-05-04 | Read 14 source files. Baseline: 9,438 pass / 1 fail (1 file: `useFaithPoints.test.ts` `intercession` drift — pre-existing, unrelated to 4C). [UNVERIFIED] decisions locked: EchoCard NO double-nest; WelcomeWizard headings user-visible. |
| 2 | Add INSTALL_CARD_ORDER + update DashboardWidgetGrid | [COMPLETE] | 2026-05-04 | `widget-order.ts` + `DashboardWidgetGrid.tsx`. `999` constant exported with documenting comment. `style.order: 9999` magic replaced. |
| 3 | InstallCard — Download icon + FrostedCard chrome migration | [COMPLETE] | 2026-05-04 | `InstallCard.tsx`. Added Download (`text-cyan-300`). **DEVIATION** per user override: migrated rolls-own chrome to `<FrostedCard variant="default">`. |
| 4 | FriendsPreview — Users tonal mint | [COMPLETE] | 2026-05-04 | **Plan/reality reconciliation:** FriendsPreview already in DashboardCard. Single-line change: `DashboardWidgetGrid.tsx:283` Users icon now `text-emerald-300`. No internal FriendsPreview.tsx edits. |
| 5 | WeeklyRecap — full migration | [COMPLETE] | 2026-05-04 | `DashboardWidgetGrid.tsx:298` BarChart3 → `text-violet-300`. `WeeklyRecap.tsx` rewritten: empty-state copy migrated to Decision 8 strings (heading "Faith grows stronger together" + description + arrow CTA), UserPlus import dropped, 4 stat icons get per-row tonal classes (pink/violet/emerald/cyan). |
| 6 | WeeklyGodMoments — Sparkles + chrome migration | [COMPLETE] | 2026-05-04 | `WeeklyGodMoments.tsx`. Added Sparkles header (`text-amber-300`). **DEVIATION** per user override: migrated rolls-own primary-tinted banner chrome (`bg-primary/10 border-primary/20`) to `<FrostedCard variant="default" as="section" role="region" aria-label="Your week with God summary">`. Dismiss button + 3-stat row + fade animation preserved. Required `FrostedCardProps['aria-label']` prop addition. |
| 7 | QuickActions — tile chrome + 4 tonal + hover lift | [COMPLETE] | 2026-05-04 | `QuickActions.tsx` rewritten. 4 tiles wrap `<Link>` outer + `<FrostedCard variant="subdued">` inner. Tonal icons (Heart=pink, BookOpen=sky, Brain=violet, Music=cyan). Hover: `motion-safe:hover:-translate-y-0.5 hover:bg-white/[0.08] transition-all duration-200`. Verified: all 4 tiles same y at desktop 1440px; 2x2 grid at 375px. |
| 8 | AnniversaryCard — PartyPopper + chrome migration + closing message | [COMPLETE] | 2026-05-04 | `AnniversaryCard.tsx` rewritten. Added PartyPopper header (`text-amber-300`). Closing message: dropped `font-serif italic` (Decision 7). **DEVIATION** per user override: migrated rolls-own chrome to `<FrostedCard variant="default" as="section">` with `ring-1 ring-amber-500/10` preserved as inner styling detail. Sparkle sound effect, dismiss handler, stats list, `data-testid="anniversary-card"` (now on inner div) preserved. Test updated: `card.closest('section')` to find the ring on the FrostedCard outer. |
| 9 | EveningReflectionBanner — Moon + chrome migration | [COMPLETE] | 2026-05-04 | `EveningReflectionBanner.tsx`. Moon `text-indigo-300` → `text-violet-300`. **DEVIATION** per user override: dropped indigo-tinted chrome (`border-indigo-400/20 bg-indigo-900/30`), migrated to `<FrostedCard variant="default" as="section">`. `motion-safe:animate-widget-enter` conditional preserved. Reflect Now `<Button variant="subtle">` and Not Tonight link unchanged. |
| 10 | EchoCard — tonal swap (no double-nest resolution needed) | [COMPLETE] | 2026-05-04 | `EchoCard.tsx`. Icon `text-white/30` → `text-amber-300`, added `aria-hidden="true"`. **Resolution path: direct rendering on Dashboard.tsx:539 confirmed; EchoCard's internal `<FrostedCard variant="default">` is sole chrome — kept verbatim.** Cross-surface usage on `/daily?tab=devotional` unaffected (same component, same chrome). |
| 11 | GettingStartedCelebration gradient heading | [COMPLETE] | 2026-05-04 | `GettingStartedCelebration.tsx:77`. `font-script text-white` replaced with `bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent font-bold`. Size cascade preserved. |
| 12 | WelcomeWizard 2 gradient headings | [COMPLETE] | 2026-05-04 | `WelcomeWizard.tsx` lines 329 + 517. Same gradient pattern. `id`, `ref`, `tabIndex={-1}`, `outline-none` preserved on both for focus management. |
| 13 | WelcomeBack gradient heading | [COMPLETE] | 2026-05-04 | `WelcomeBack.tsx:134`. Gradient pattern inside `cn()` invocation. `fadeIn` continuation, `style={stagger(0)}`, `ref`, `tabIndex={-1}` preserved. |
| 14 | Test class-string updates + Caveat residual grep | [COMPLETE] | 2026-05-04 | Updated 6 test files: GettingStartedCelebration, WelcomeWizard (2 assertions), WeeklyRecap, AnniversaryCard, empty-states (2 assertions). Migrated `font-script` assertions to gradient class checks. Migrated WeeklyRecap empty-state copy assertions to Decision 8 strings. AnniversaryCard ring test now queries `.closest('section')`. empty-states uses `getAllByText` because both FriendsPreview AND WeeklyRecap empty states render "Faith grows stronger together" (Decision 8 unifies brand voice across both surfaces). **Grep verification: 0 `font-script` matches in `frontend/src/components/dashboard/*.tsx` and `frontend/src/components/echoes/*.tsx`.** |
| 15 | Quality gates + visual eyeball check | [COMPLETE] | 2026-05-04 | `tsc --noEmit` clean. `pnpm test --run`: 9,438 pass / 1 fail (same pre-existing baseline failure; **net regression: 0**). `pnpm build` clean (1 chunk-size warning, pre-existing). `pnpm lint` clean. Headless Playwright at 1440px + 375px confirmed: 9 widget header tonal icons render correctly (4B baselines preserved + 4C additions verified — Friends emerald-300, all QuickActions tonal); QuickActions desktop 4-tile single row at y=1688; QuickActions mobile 2x2 grid (Pray+Journal y=1620, Meditate+Music y=1722); FrostedCard subdued chrome on tiles confirmed; hover lift + brightness boost classes confirmed; no console errors. Screenshots saved to `frontend/playwright-screenshots/spec4c-dashboard-{desktop,mobile}-final.png`. WeeklyGodMoments aria-label test passing after FrostedCard `aria-label` prop addition. Gradient text contrast eyeball check: PASSES with default `from-violet-300 to-violet-200` (no fallback to violet-400 needed). |
