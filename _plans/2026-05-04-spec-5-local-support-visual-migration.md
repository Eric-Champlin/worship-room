# Implementation Plan: Spec 5 — Local Support Visual Migration

**Spec:** `_specs/spec-5-local-support-visual-migration.md`
**Date:** 2026-05-04
**Branch:** forums-wave-continued (no new branch — user manages git manually)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; the more recent Round 3 / Daily Hub / Dashboard 4A-4C visual primitives are documented in `.claude/rules/09-design-system.md`, which takes precedence for principles. The recon file predates BackgroundCanvas, FrostedCard tier system, subtle Button variant, and the Tonal Icon Pattern — so for those primitives the canonical references are 09-design-system.md, the live component source files, and the Spec 4A/4B/4C implementations on Dashboard. ⚠️ Recon staleness flagged — do not trust the recon for any visual property introduced after 2026-04-05.)
**Recon Report:** `_plans/recon/local-support-2026-05-04.md` (loaded — 552 LOC, full inventory across 3 routes, 462-LOC shell, 9 child components, 9 test files, 2,112 LOC grand total)
**Master Spec Plan:** `_plans/direction/local-support-2026-05-04.md` (loaded — 17 locked decisions; this plan honors them)

---

## Affected Frontend Routes

- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`
- `/` (Dashboard — regression check, no changes)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` (DailyHub — regression check; tab-pattern source)
- `/bible` (BibleLanding — regression check)
- `/bible/plans` (regression check)

---

## Architecture Context

### File inventory in scope

**10 implementation files modified by this spec:**

- `frontend/src/components/local-support/LocalSupportPage.tsx` (462 LOC) — shell; receives BackgroundCanvas wrap, tab-bar pattern migration, mobile view-toggle migration, saved-tab empty state migration
- `frontend/src/components/local-support/LocalSupportHero.tsx` (41 LOC) — remove GlowBackground wrap
- `frontend/src/components/local-support/ListingCard.tsx` (268 LOC) — chrome migration to FrostedCard, ring color update, hover redundancy removal, Get Directions polymorphic Button, tonal icons
- `frontend/src/components/local-support/SearchControls.tsx` (215 LOC) — Use My Location + Search subtle Button migration, MapPin tonal color
- `frontend/src/components/local-support/SearchStates.tsx` (102 LOC) — ListingSkeleton chrome, Try Again subtle Button
- `frontend/src/components/local-support/ListingShareDropdown.tsx` (224 LOC) — light → dark migration, item-row tokens, icon colors
- `frontend/src/components/local-support/ListingCTAs.tsx` (98 LOC) — tonal color application on per-tile icons
- `frontend/src/components/local-support/VisitButton.tsx` (156 LOC) — visited-state tonal color (text-success → text-amber-300)
- `frontend/src/components/local-support/ResultsMap.tsx` (136 LOC) — selected-state ring color (already in ListingCard, ResultsMap unchanged here — listed for clarity)
- `frontend/src/pages/CelebrateRecovery.tsx` (43 LOC) — extraHeroContent → FrostedCard subdued

**1 design-system primitive extended (additive, non-breaking):**

- `frontend/src/components/ui/FeatureEmptyState.tsx` — add optional `iconClassName` prop (currently hardcodes `text-white/30`). Required by Change 12's `iconClassName="text-white/40"` spec text. Backward-compatible — every existing consumer keeps current rendering when prop is omitted.

**9 test files updated:**

- `frontend/src/components/local-support/__tests__/LocalSupportPage.test.tsx`
- `frontend/src/components/local-support/__tests__/LocalSupportHero.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchControls.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchControls-offline.test.tsx`
- `frontend/src/components/local-support/__tests__/ListingCard.test.tsx`
- `frontend/src/components/local-support/__tests__/ListingCTAs.test.tsx`
- `frontend/src/components/local-support/__tests__/ListingShareDropdown.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchStates.test.tsx`
- `frontend/src/components/local-support/__tests__/VisitButton.test.tsx`

**3 documentation files updated:**

- `.claude/rules/02-security.md` (line 23 + neighboring "What works without login" list)
- `.claude/rules/11-local-storage-keys.md` (Local Support section — add `wr_bookmarks_<category>` family)
- `CLAUDE.md` (Build Health baseline)

### Existing primitives consumed (verified during recon)

- **BackgroundCanvas** — `frontend/src/components/ui/BackgroundCanvas.tsx`. Renders a `relative min-h-screen overflow-hidden` div with the canonical multi-bloom canvas via inline `style` (radial gradients + linear gradient base). Single `className` prop. No opacity props — atmospheric tuning per Decision 1 must be done by editing `CANVAS_BACKGROUND` in the file OR by passing a child overlay. Editing `CANVAS_BACKGROUND` would tune Dashboard + BibleLanding atmosphere too — that's the wrong knob. The right tuning approach if blooms feel too active on Local Support: add a damping overlay (`<div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none" aria-hidden />`) inside the BackgroundCanvas wrap, OR pass a className with extra dim. Default to no tuning unless visual verification flags it.
- **FrostedCard** — `frontend/src/components/homepage/FrostedCard.tsx`. Variants: `default` (`bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` + hover `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5`), `subdued` (`bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`), `accent` (violet-tinted, not used in this spec). `as` prop accepts `'div' | 'button' | 'article' | 'section'`. Supports `aria-label` and `aria-labelledby`. Default padding `p-6`; consumer-supplied `className` is merged via `cn()`/`tailwind-merge` so passing `p-5 sm:p-6` overrides the base p-6. Default border-radius is `rounded-3xl` (NOT `rounded-2xl` — note for visual diff).
- **Button (subtle variant)** — `frontend/src/components/ui/Button.tsx`. Subtle variant base classes: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]`. Size `md` adds `px-6 py-2.5 text-sm`. Focus ring: `focus-visible:ring-primary` (inherited from base). **`asChild` IS supported** — wraps a single child element via `cloneElement`, merging classes onto the child. Use this for the "Get Directions" anchor migration in Change 10. `forwardRef` exposed; `displayName = 'Button'`.
- **FeatureEmptyState** — `frontend/src/components/ui/FeatureEmptyState.tsx`. Props: `icon` (LucideIcon), `heading` (string), `description` (string), `ctaLabel?`, `ctaHref?`, `onCtaClick?`, `children?`, `compact?`, `className?`. **No `iconClassName` prop today** — icon rendered as `<Icon className="mb-3 h-10 w-10 text-white/30 sm:h-12 sm:w-12" />`. Plan Step 1 adds optional `iconClassName` so saved-tab empty state can pass `text-white/40` per Change 12.
- **Violet tab/segmented-control pattern** — canonical strings sourced from DailyHub (see `09-design-system.md` § Round 3 + tab pattern in spec Change 6). Restated in Step 6.

### Auth gating pattern

- `useAuth()` hook from `@/hooks/useAuth` returns `{ isAuthenticated, user, login, logout }`.
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` returns `{ openAuthModal(message) }`.
- `LocalSupportPage` already uses both. Spec adds NO new auth gates — preserves the existing gates exactly. The `onInteractionBlocked` prop on SearchControls is currently unused at the consumer level (LocalSupportPage does not pass it) — Decision 12 confirms this is intentional. The plan does not wire it.

### Test patterns (Vitest + React Testing Library)

- Tests wrap renders in `<MemoryRouter>` + `<ToastProvider>` + `<AuthModalProvider>` (see `LocalSupportPage.test.tsx`).
- Auth state is mocked via `vi.mock('@/hooks/useAuth', ...)` at top of file — pattern preserved.
- Class-string assertions exist in only one place across the 9 test files: `ListingCard.test.tsx` lines 141 (`expect(article?.className).toContain('ring-primary')`), 164 (`focus:ring-primary-lt` on phone link — NOT changed by spec), 219 (`focus-visible:ring-primary-lt` on website link — NOT changed by spec). Line 141's `ring-primary` becomes `ring-violet-400/60` in Change 3.

### localStorage pattern

- `wr_bookmarks_<category>`: read/write at `LocalSupportPage.tsx:89` and `:104`, gated by `isAuthenticated`. **Not currently documented** — Change 14 fixes this.
- `wr_local_visits`: already documented at `11-local-storage-keys.md:131`. No changes.

### Spec authority order

1. **Spec body text** in `_specs/spec-5-local-support-visual-migration.md` is the strongest authority for what to do (the 16 numbered Changes plus pre-execution recon).
2. **Direction document** `_plans/direction/local-support-2026-05-04.md` explains *why* — used to break ties when spec text is ambiguous.
3. **Live code + design system rules** override stale recon snapshots when they disagree on specific CSS values.

When the spec body text and the direction document disagree (rare), spec wins. When they agree but the recon contradicts, spec + direction win.

---

## Auth Gating Checklist

**Spec adds zero new auth gates.** Every gate is already in place; the migration preserves all of them. Verification only.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit any of the 3 routes | Public | All steps preserve | n/a |
| Type city / use geolocation / click "Search" / adjust radius slider | Public per Decision 12 | Steps 5, 16 (rule rewording), 17 (test fixes) | n/a — preserved |
| View results / pan-zoom map / "Get Directions" / website link | Public | Steps 4, 11 | n/a — preserved |
| Click bookmark icon | Logged-out → auth modal "Sign in to bookmark listings" | Step 4 (preserves existing handler at LocalSupportPage.tsx:198-212) | `useAuth().isAuthenticated` + `authModal.openAuthModal(...)` |
| "I visited" button visibility | Hidden when logged-out via `showVisitButton={isAuthenticated}` | Step 12 (visited-state tonal color only — gate untouched) | prop-controlled, no modal |
| Saved tab visibility | Hidden when logged-out (only "Search Results" tab renders) | Step 6 (tab-pattern migration preserves the conditional) | conditional render based on `isAuthenticated` |
| Click share button | Public | Step 8 (dark dropdown migration) | n/a — preserved |
| ListingCTA tile clicks | Routes downstream; gates live on Daily Hub / Prayer Wall | Step 13 (icon color only) | n/a at this surface |

**Test coverage for gating** — preserved. Two existing tests cover the bookmark gate (LocalSupportPage.test.tsx + ListingCard.test.tsx, indirectly through render of the bookmark button). No new gate tests required.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| BackgroundCanvas | background | `radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%), radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%), linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` (canonical, applied via inline style) | `frontend/src/components/ui/BackgroundCanvas.tsx:9-15` |
| BackgroundCanvas | wrapper classes | `relative min-h-screen overflow-hidden` | `frontend/src/components/ui/BackgroundCanvas.tsx:20` |
| FrostedCard `default` | base | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `FrostedCard.tsx:36` |
| FrostedCard `default` | hover | `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` | `FrostedCard.tsx:37` |
| FrostedCard `subdued` | base | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `FrostedCard.tsx:40` |
| FrostedCard transition | timing | `transition-all motion-reduce:transition-none duration-base ease-decelerate` | `FrostedCard.tsx:78` |
| `shadow-frosted-base` | value | `0 4px 16px rgba(0,0,0,0.30)` | `tailwind.config.js:63` |
| `shadow-frosted-hover` | value | `0 6px 24px rgba(0,0,0,0.35)` | `tailwind.config.js:64` |
| `shadow-subtle-button-hover` | value | `0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)` | `tailwind.config.js:69` |
| Subtle Button (size md) | full class signature | `inline-flex items-center justify-center font-medium transition-[colors,transform] duration-fast motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px] px-6 py-2.5 text-sm` | `Button.tsx:42-66` (computed at runtime via cn()) |
| Tab outer wrapper (violet pattern) | classes | `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md` | spec Change 6 (canonical from DailyHub) |
| Tab active state | classes | `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]` | spec Change 6 |
| Tab inactive state | classes | `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` | spec Change 6 |
| Dark dropdown panel | classes | `absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-hero-mid/95 backdrop-blur-md border border-white/10 shadow-frosted-base py-2` | spec Change 8 (matches navbar dropdown convention) |
| Dark dropdown item | classes | `flex w-full items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.05]` | spec Change 8 |
| `bg-hero-mid` | value | `#1E0B3E` | `tailwind.config.js:16` |
| Selected-state ring (Round 3) | classes | `ring-2 ring-violet-400/60` | spec Change 3 + Decision 2 |
| Hero gradient text | inline style | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` (white-to-purple gradient via `background-clip: text` + `text-transparent`) | `frontend/src/constants/gradients.tsx` (preserved verbatim) |
| Hero spacing | classes | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40 px-4 text-center` | `LocalSupportHero.tsx:24` (preserved verbatim) |
| Disclaimer chrome (preserved) | classes | `mb-6 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200` | `LocalSupportPage.tsx:261` (preserved AS-IS — Decision 10) |
| Form input chrome (preserved) | classes | `w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none` | `SearchControls.tsx:158` (preserved AS-IS — Decision 8) |
| VisitNote textarea (preserved) | classes | `w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 lg:max-w-[60%]` | `VisitButton.tsx:148` (preserved AS-IS — Decision 8) |

### Tonal Icon Pattern token assignments (from spec Change 11 + Direction doc Decision 7)

| Surface | Icon | Tonal token | Verification path |
|---------|------|-------------|-------------------|
| StarRating filled | Star | `fill-amber-400 text-amber-400` | preserved (already correct) |
| Bookmark active | Bookmark | `fill-emerald-300 text-emerald-300` | Step 12 — change from `fill-success text-success` |
| Bookmark inactive | Bookmark | `text-white/50` | preserved |
| VisitButton when visited (button container) | Check icon (current) | `text-amber-300` (replaces `text-success` on button container) | Step 12 — see Edge Case "VisitButton icon mapping" |
| VisitButton when not visited | MapPin | `text-white/50` (or current `text-white/50` — preserved) | preserved |
| SearchControls "Use My Location" MapPin | MapPin | `text-sky-300` | Step 8a |
| SearchControls "Search" submit Search icon | Search | inherits Button text color (white) | Step 8b |
| SearchControls Loader2 (loading state) | Loader2 | inherits Button text color (white) | Step 8b |
| ListingCard address row MapPin | MapPin | `text-white/50` (current is `text-white/70` — drift, update to `text-white/50`) | Step 4 |
| ListingCard phone row Phone | Phone | `text-white/50` (current is `text-white/70` — drift, update) | Step 4 |
| ListingCard expand chevron | ChevronDown | `text-white/50` (current matches per `text-white/50` on the icon) | preserved |
| ListingCard expanded "Get Directions" icon | ExternalLink (replaces current MapPin) | inherits anchor text color (white) | Step 11 — see Edge Case "Get Directions icon swap" |
| ListingCard expanded website link icon | ExternalLink | `text-white/50` (current `text-white/60` — drift, update to `text-white/50`) | Step 4 |
| ListingCTAs Pray tile leading icon | Heart (replaces ArrowRight) | `text-pink-300` | Step 13 — see Edge Case "ListingCTAs icon swap" (revised) |
| ListingCTAs Journal tile leading icon | BookOpen (replaces ArrowRight) | `text-sky-300` | Step 13 |
| ListingCTAs Share/Buddy tile leading icon | MessageSquare (replaces ArrowRight) | `text-violet-300` | Step 13 |
| ListingCTAs trailing arrow (if kept) | ArrowRight (right-edge affordance) | inherits text color (white) | Step 13 — drop if cramped on sm+ |
| AlertCircle (SearchError) | AlertCircle | `text-danger` | preserved (Decision 7 exception) |
| MapPin (SearchPrompt empty state via FeatureEmptyState) | MapPin | `text-white/30` (FeatureEmptyState default — passes spec's "white/40 verify, set if drift" gate; close enough) | preserved unless visual verification flags drift |
| SearchX (NoResults via FeatureEmptyState) | SearchX | `text-white/30` (default — same logic) | preserved |
| ImageOff (placeholder in ListingCard) | ImageOff | `text-white/30` | preserved |
| Saved-tab empty state Bookmark icon | Bookmark | `text-white/40` (via new `iconClassName` prop on FeatureEmptyState) | Step 14 |
| Share dropdown Copy/Mail/MessageSquare (after dark migration) | (lucide) | `text-white/60` | Step 9 |
| Share dropdown Facebook/X SVGs | inline SVG | brand colors preserved (`fill="currentColor"` inherits item text color — keeps brand recognition; if a stronger brand-color preservation is needed, set explicit fills, but default behavior matches Decision 7's "brand colors preserved") | Step 9 — verify visual |
| Share dropdown Check (copied feedback) | Check | `text-emerald-300` (replaces current `text-success`) | Step 9 |

---

## Design System Reminder

**Project-specific quirks `/execute-plan` must display before every UI step:**

- **`bg-hero-mid` is `#1E0B3E`** — used for the dark dropdown panel migration in Change 8. Combined with `/95` opacity gives `rgba(30,11,62,0.95)`. Backdrop blur-md on top creates the navbar-dropdown idiom.
- **FrostedCard renders `rounded-3xl`, NOT `rounded-2xl`.** The pre-Round-3 `rounded-xl` chrome on the existing ListingCard is meaningfully tighter than the new FrostedCard look. Visual diff on Listing Card will show this — it is the correct migration.
- **FrostedCard default padding is `p-6`.** Pass `className="p-5 sm:p-6"` to preserve the existing tighter mobile padding from the pre-migration ListingCard. `tailwind-merge` resolves `p-5` over the variant base `p-6` correctly.
- **Subtle Button variant uses `text-white`, NOT `text-primary`.** The pre-migration white-pill CTAs all use `text-primary` (`#6D28D9`) on `bg-white`. Migration inverts this — subtle Button is `bg-white/[0.07]` with `text-white`. Tests asserting on `text-primary` for these buttons need updating.
- **Subtle Button focus ring is `focus-visible:ring-primary`, not `ring-primary-lt`.** The existing white-pill CTAs use `focus-visible:ring-primary-lt`; subtle variant uses `ring-primary`. This is per Spec 4A's shipped subtle variant — match it byte-for-byte. Do NOT add `ring-primary-lt` to the subtle Button.
- **The hero `<h1>` `style={GRADIENT_TEXT_STYLE}` is preserved verbatim.** Decision 16 explicitly locks this. Removing the surrounding GlowBackground does NOT touch the h1, the `<p>` subtitle, the spacing classes, the heading id, or the `extraContent`/`action` slots.
- **Disclaimer chrome (Counselors page) is a documented exception.** `rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200` with `role="note"` stays AS-IS. Decision 10 — do not migrate to FrostedCard.
- **Form input chrome (location text input, range slider, sort/filter selects) stays.** Decision 8 — quieter "utility input" idiom is correct here. Do NOT migrate to violet-glow textarea pattern.
- **VisitNote textarea is borderline-deferred.** Decision 8 — stays on utility input idiom for now. Out of scope.
- **ResultsMap Leaflet internals are out of scope.** Tile layer, marker icons, popup styling, ErrorBoundary, MapFallback all preserved. The selected-state ring color update happens in `ListingCard.tsx:80` (where the ring is actually applied), NOT in `ResultsMap.tsx`.
- **Animation tokens (BB-33).** Any new transition timing imports from `frontend/src/constants/animation.ts`. The Button subtle variant already uses `duration-fast`, FrostedCard uses `duration-base`. Don't hardcode `200ms` or `cubic-bezier(...)` in any class string. The existing `transition-colors duration-base motion-reduce:transition-none` pattern on tabs/toggles/etc. is preserved.
- **Reduced-motion safety net (BB-33).** Global `frontend/src/styles/animations.css` rule disables animations site-wide for `prefers-reduced-motion: reduce` users. FrostedCard hover lift respects `motion-reduce:hover:translate-y-0` already.
- **Inline element layout — position verification.** Spec 5 is a chrome migration — no new inline-row layouts are introduced. The existing inline-row layouts (search controls horizontal at `sm+`, mobile view-toggle 2-button row, ListingCard actions row, ListingCTAs grid) preserve their structure. See Inline Element Position Expectations table for the layouts to verify post-migration.
- **Round 3 visual continuity.** This spec is the final Round 3 visual rollout. Patterns USED: BackgroundCanvas, FrostedCard `default` + `subdued`, subtle Button, violet tab pattern, Tonal Icon Pattern, FeatureEmptyState. Patterns MODIFIED: none. Patterns INTRODUCED: none.
- **Deprecated patterns to NOT introduce:** Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, PageTransition. None of these apply to this spec, but flagged for completeness.

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step.

---

## Shared Data Models (from Master Plan)

This is a visual / chrome migration — no new shared data models, no schema changes, no new TypeScript interfaces. Existing types are read-only:

```typescript
// types/local-support.ts (read-only — no changes)
export type LocalSupportCategory = 'churches' | 'counselors' | 'celebrate-recovery'
export interface LocalSupportPlace { /* ... existing shape ... */ }
export type SortOption = 'distance' | 'rating' | 'alphabetical'

// constants/gradients.tsx (read-only — preserved verbatim)
export const GRADIENT_TEXT_STYLE: React.CSSProperties = { /* ... */ }

// constants/animation.ts (BB-33 — not directly imported by this spec but the
// existing `duration-base`, `duration-fast`, and `motion-reduce:*` classes used
// throughout Local Support resolve to these tokens via tailwind config)
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bookmarks_<category>` (3 variants: `_churches`, `_counselors`, `_celebrate-recovery`) | Read + Write (already existed; documentation gap fixed in Step 16) | `string[]` of LocalSupportPlace IDs. Persisted only when authenticated. Consumed by `LocalSupportPage.tsx:89` (read) + `:104` (write). No eviction. |
| `wr_local_visits` | Read + Write (preserved, no changes) | Already documented at `11-local-storage-keys.md:131`. |

No new keys introduced. No behavior change to existing key reads/writes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single-column stack. SearchControls stack vertically (Use My Location button → city input → range slider → Search submit). Tab bar (Search Results / Saved) renders full-width via `flex w-full` on the new violet pattern wrapper. Mobile view toggle (List View / Map View) renders full-width above the active panel using the same violet pattern. Either ResultsList OR ResultsMap renders, never both. ListingCard photo + info row remains a flex row but with reduced padding (`p-5` per `<FrostedCard className="p-5 sm:p-6">`). Disclaimer banner (Counselors only) wraps to 2-3 lines but keeps amber chrome. CelebrateRecovery `extraContent` FrostedCard subdued spans full width minus `mx-auto max-w-2xl` constraint. ListingShareDropdown opens flush right with `w-56`. |
| Tablet | 768px | Same single-column desktop-light layout. Mobile view toggle still active (`lg:hidden` keeps it visible up to 1024px). SearchControls regain horizontal alignment (Use My Location + city input on one row, range slider on the next, Search submit aligned right). ListingCard padding upgrades to `sm:p-6`. CelebrateRecovery `extraContent` retains `max-w-2xl` centered. |
| Desktop | 1440px | Two-column side-by-side layout (`hidden lg:grid lg:grid-cols-2 lg:gap-6`). Left column: scrollable ResultsList (`max-h-[calc(100vh-12rem)] overflow-y-auto pr-2`). Right column: sticky ResultsMap (`sticky top-24 h-[calc(100vh-12rem)] rounded-xl border border-white/10`). Mobile view toggle hidden via `lg:hidden`. Tab bar centered (existing alignment preserved). New BackgroundCanvas atmosphere wraps both columns plus the hero. Selected-state ring renders `ring-2 ring-violet-400/60` on the listing card the user clicked from the map. |

**Custom breakpoints:** None new. Spec preserves existing breakpoints — `sm` (640px) for SearchControls horizontal alignment + `sm:p-6` ListingCard padding upgrade; `lg` (1024px) for the desktop side-by-side panel grid + mobile view-toggle hide.

---

## Inline Element Position Expectations (UI features with inline rows)

This spec is a chrome / class-string migration — no new inline-row layouts are introduced. The following existing inline-row layouts are preserved structurally and need positional verification AFTER migration to confirm nothing wrapped:

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| SearchControls horizontal row (≥640px) | Use My Location button + city input + Search button | Same y ±5px at 768px and 1440px | Wrap is acceptable below 640px (mobile spec) |
| Tab bar | Search Results pill + Saved (N) pill | Same y ±5px at all breakpoints (the violet wrapper enforces this with `flex` + no wrap) | NEVER wrap (single-row `flex`) |
| Mobile view toggle | List View pill + Map View pill | Same y ±5px below 1024px | NEVER wrap (single-row `flex` within `lg:hidden` block) |
| ListingCard actions row | Bookmark + Share + (optional) VisitButton on left cluster, Expand chevron on right | Same y ±5px at all breakpoints | NEVER wrap (single-row `flex justify-between`) |
| ListingCard expanded "Get Directions" + ListingCTAs | "Get Directions" anchor renders above, ListingCTAs grid renders below | Vertical stack — y values differ | n/a (intentionally stacked) |
| ListingCTAs grid | 3 CTAs in 1-column grid (mobile) / 2-column grid (`sm+`) | Each CTA same y as its row peer (sm+) | Acceptable to wrap to 1 column on mobile (existing `grid-cols-1 sm:grid-cols-2`) |
| ListingShareDropdown items | Copy / Email / SMS / Facebook / X (vertical stack) | Each item same y as its left-aligned icon + label | n/a (intentionally stacked) |
| Hero h1 + p subtitle + extraContent | Vertical stack | y values differ | n/a (intentionally stacked) |

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification) to compare `boundingBox().y` values between elements. Any unexpected y-value mismatch within the same row indicates a wrap regression.

---

## Vertical Rhythm

The recon does not enumerate exact gaps for Local Support. Existing rhythm is preserved across the migration — verification only.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero bottom → main content top | `py-6 sm:py-8` from `<main className="...py-6 sm:py-8">` (24px mobile / 32px tablet+) | `LocalSupportPage.tsx:255` (preserved) |
| Disclaimer (Counselors) → SearchControls | `mb-6` (24px) | `LocalSupportPage.tsx:261` (preserved) |
| SearchControls bottom → Tab bar | `mt-6 mb-6` (24px above tab bar, 24px below to results) | `LocalSupportPage.tsx:278` (preserved verbatim except inner classes; `mt-6 mb-6` outer kept) |
| Tab bar → results panel | `mb-6` (24px) | `LocalSupportPage.tsx:278` (preserved) |
| Mobile view toggle → active panel | `mb-4` (16px) | `LocalSupportPage.tsx:377` (preserved) |
| ListingCard padding internal | `p-5 sm:p-6` (20px / 24px) — same as before | spec Change 3 |
| ListingCard actions row top spacing (border-t) | `mt-4 pt-3` (16px margin + 12px padding to top border) | `ListingCard.tsx:138` (preserved verbatim) |
| ListingCard expanded section top spacing | `mt-4 pt-4 border-t` (16px margin + 16px padding) | `ListingCard.tsx:200, 203` (preserved verbatim) |
| ListingCTAs top spacing (border-t) | `pt-3 border-t` (12px padding to top border) | `ListingCTAs.tsx:71` (preserved verbatim) |
| Saved-tab empty state vertical padding | `py-12` from FeatureEmptyState default | `FeatureEmptyState.tsx:35` (default `py-12`, `compact={false}`) |

`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e. Any gap difference >5px is flagged as a mismatch.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working branch is `forums-wave-continued`. **Do not create new branches, commit, push, stash, reset, or run any branch-modifying git command** — user manages all git manually.
- [ ] Spec 4A + Spec 4B + Spec 4C are merged into `forums-wave-continued`. Verify via `git log --oneline forums-wave-continued | head -10` looking for "spec-4a/4b/4c" commits (recon already confirmed at the time of writing — re-confirm before execution).
- [ ] `BackgroundCanvas` is imported at the Dashboard route on `/`. Verify via `grep -rn "BackgroundCanvas" frontend/src/pages/Dashboard.tsx frontend/src/components/dashboard/` — expect at least one match.
- [ ] `FrostedCard` exposes `default`, `subdued`, and `accent` variants in `frontend/src/components/homepage/FrostedCard.tsx`. ✅ Confirmed via planning recon — three variants exist.
- [ ] Subtle Button variant exists in `frontend/src/components/ui/Button.tsx`. ✅ Confirmed — `variant === 'subtle'` branch present.
- [ ] Button `asChild` is supported. ✅ Confirmed — `asChild` prop wraps single child via `cloneElement`.
- [ ] FeatureEmptyState lacks `iconClassName` prop. ✅ Confirmed — Step 1 adds it (additive, backward-compatible).
- [ ] **Test baseline captured.** Before any code change, run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -30` and `pnpm typecheck`. **Expected current actual baseline: 9437 pass / 2 fail across 725 files** (verified during planning recon). The 2 failures are `useFaithPoints` (`intercession` activity drift) + `useNotifications` (sort timing flake) — NEITHER is Local Support. ⚠️ This contradicts the spec's claim of 8,811 pass / 11 pre-existing fail with 4 Local Support failures. The spec's Decision 13 / Change 15 / Change 16 may be operating on a stale baseline. See "Edge Case: pre-existing failure status" below.
- [ ] All auth-gated actions from the spec are accounted for above (zero new gates).
- [ ] Design system values verified — exact computed values used in Step Details.
- [ ] No `[UNVERIFIED]` flags remain after planning (all are resolved by reading source). Two atmospheric/visual decisions remain runtime-verifiable: BackgroundCanvas opacity tuning (Decision 1) and form-input focus-ring contrast (Change 5c) — both are explicit "verify in browser; tune if needed" gates, not assumed values.
- [ ] Recon report loaded — confirmed.
- [ ] Spec 4 series (4A, 4B, 4C) prior specs are complete and committed.
- [ ] No deprecated patterns introduced — confirmed (none of: Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, PageTransition).

### Items the planner did NOT verify (executor must verify during execution)

- **Decision 14 — `?template=cr-buddy` Prayer Wall consumer.** `grep -rn "template=" frontend/src/components/prayer-wall/ frontend/src/pages/PrayerWall*` to determine if anything reads the `template` query parameter on the Prayer Wall route. If unused (default expectation): keep parameter as-is, surface as "Out of Scope follow-up: deep-link wiring on Prayer Wall side". If consumed: surface as recon finding — keep parameter. Decision is locked at "(b) keep and ignore" by direction Decision 14 either way; CC may flag for clarity.
- **`wr_bookmarks_<category>` not already documented.** `grep -n "wr_bookmarks" .claude/rules/11-local-storage-keys.md .claude/rules/11b-local-storage-keys-bible.md` to confirm. ✅ Planning recon confirmed it is NOT documented anywhere.
- **The 4 pre-existing Local Support test failures.** Run `cd frontend && pnpm test --run src/components/local-support 2>&1 | tail -40` to enumerate. ⚠️ Planning recon found NO Local Support failures in the current baseline (725-file run). If Step 17 finds 0 failing Local Support tests: Change 15 is a no-op verification step, and Step 18 (CLAUDE.md baseline) updates the count to current actual rather than "11 → 7".

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **VisitButton icon mapping** — spec icon table says "MapPin → text-amber-300 when visited" but current code uses `Check` icon (not MapPin) when visited. | Preserve existing `Check` (visited) / `MapPin` (not visited) icon split. Apply `text-amber-300` to the button container's text color (the Check icon inherits via `currentColor`). Replace `text-success` with `text-amber-300` on the visited-state button container. Do NOT change the icon. | Spec recon Part 4 explicitly notes "Visit button: when visited, `text-success` no border" without mentioning icon swap. The recon is more detailed than the spec icon table at this point. Preserving `Check` for visited preserves the visual signal "you completed this" — swapping back to MapPin would weaken the affordance. The amber color is the primary intended change. |
| **Get Directions icon swap** — spec icon table says "ExternalLink (replaces current MapPin)" inside the expanded ListingCard's "Get Directions" anchor. Current code uses `MapPin size={14}`. | Swap `MapPin` → `ExternalLink` per spec icon table. The "Get Directions" link opens an external `google.com/maps/dir` URL in a new tab — `ExternalLink` matches the semantic of "leaves the app" better than `MapPin`. Update import in `ListingCard.tsx`. | Spec icon table explicit. Aligns with website link in same expanded section, which already uses `ExternalLink`. Improves icon-meaning consistency. |
| **ListingCTAs icon swap (revised per planning review)** — spec icon table prescribes Heart / BookOpen / MessageSquare per tile category; actual code uses `ArrowRight` for all three CTA tiles. Color alone (without categorical glyph) does not deliver the categorical signal — color and glyph must pair. | **Swap the leading icon to the categorical glyph per CTA position** (always-fixed across all 3 categories): index 0 (Pray) → `Heart` + `text-pink-300`; index 1 (Journal) → `BookOpen` + `text-sky-300`; index 2 (Share/Buddy) → `MessageSquare` + `text-violet-300`. Layout: `[categorical icon] [label] [ArrowRight]` — leading categorical icon (size 14, tonal color) at left, label in middle, trailing ArrowRight as neutral "go" affordance inheriting white text color. Extend `CTAItem` interface in `getCTAs` to carry `icon: LucideIcon` and `iconColor: string` so the data structure is self-describing. **If sm+ 2-column layout reads cluttered** (specifically "Pray for your recovery journey" at 28 chars): drop the trailing ArrowRight per planning-review guidance — leading glyph + label is the load-bearing affordance. Document the choice in Execution Log. | Tonal Icon Pattern requires color + glyph pairing per Decision 7 — Dashboard QuickActions are the alignment target. Color alone is decorative, not categorical. The leading glyph carries the categorical meaning; the trailing arrow carries the "go" semantic. Both fit at standard breakpoints; the trailing arrow is droppable if cramped. |
| **FeatureEmptyState `iconClassName` prop** — spec Change 12 passes `iconClassName="text-white/40"` to FeatureEmptyState, but the prop does not exist on the component. | Step 1 adds optional `iconClassName?: string` prop to FeatureEmptyState. When passed, override the default `text-white/30` on the icon (`cn('mb-3 h-10 w-10 sm:h-12 sm:w-12', iconClassName ?? 'text-white/30')`). Backward-compatible — every existing call site keeps current rendering. | Spec text (`iconClassName="text-white/40"`) is the canonical artifact; planning must reconcile the prop gap. Adding the prop is additive (no breaking change), takes ~5 LOC, and aligns FeatureEmptyState with the icon-class flexibility the Tonal Icon Pattern requires. The alternative (using FeatureEmptyState's default `text-white/30`) is also acceptable per spec's "verify in execution; set if drift" — but adding the prop respects the spec text literally. |
| **BackgroundCanvas opacity tuning** (Decision 1 authorization) — atmospheric blooms may feel too active on a 5-minute counselor search. | Default: NO tuning. Visual verify post-migration. If blooms feel too active: add a damping overlay inside the BackgroundCanvas wrap on `LocalSupportPage` only (do NOT edit `CANVAS_BACKGROUND` in BackgroundCanvas.tsx — that affects Dashboard / BibleLanding too). Documented technique: `<div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none z-0" aria-hidden />` as the first child of the BackgroundCanvas. | Decision 1 explicit. Default to no tuning preserves Round 3 atmospheric continuity. The damping overlay technique avoids cross-page leakage. Tuning is a runtime visual verification gate, not a planning-time decision. |
| **Form input focus ring contrast** (Change 5c) — `focus:ring-primary/20` may read muddy on the new BackgroundCanvas atmosphere. | Default: preserve `focus:ring-primary/20`. Verify in browser after BackgroundCanvas lands. If contrast reads muddy: change to `focus:ring-violet-400/30` and document. | Spec Change 5c explicit. Runtime visual verification gate. |
| **Pre-existing test failure status** (Decision 13 / Change 15) — spec says 4 Local Support tests are failing; planning recon found 0 Local Support failures in the actual current baseline (9437 pass / 2 fail; the 2 failures are `useFaithPoints` `intercession` drift + `useNotifications` sort flake, neither Local Support). | Step 17 (test fix work) becomes a verification step. Run `cd frontend && pnpm test --run src/components/local-support 2>&1 | tail -40` early in execution. If 0 failures: Change 15 is a no-op verification, document as such in the commit message. If >0 failures: apply Decision 13's test-correction protocol. Step 18 updates CLAUDE.md to the actual post-Step-17 baseline (e.g., "9437 pass / 2 pre-existing fail across 2 files" or whatever the count is) — do NOT force-fit the documented "11 → 7" decrement. | The CLAUDE.md baseline is stale; the actual baseline must be the source of truth at execution time. Forcing the documented numbers ships a lie. |
| **Aria-labelledby vs aria-label on FrostedCard article** (Change 3) — spec text shows `<FrostedCard as="article" aria-labelledby={titleId}>` but current code uses `aria-label={`${place.name} — ${place.address}`}` and there is no `titleId` for the h3. | Preserve current `aria-label`. Do NOT introduce `titleId` + `aria-labelledby` — that's a behavioral change beyond spec scope, and the existing `aria-label` is already accessible. The spec text is illustrative not load-bearing on this one detail. | Behavioral preservation is non-negotiable per spec § Acceptance Criteria. Existing `aria-label` is correct semantically. |
| **Address / phone metadata icon color drift** (Change 11e) — current code has `text-white/70` on MapPin and Phone in ListingCard; spec icon table says target is `text-white/50`. | Update to `text-white/50` per icon table. Drift correction explicitly authorized by spec Change 11e ("If drifted ... update"). | Spec authorizes. Aligns with "utility metadata, not categorical" rationale in Decision 7. |
| **ListingShareDropdown panel position** (Change 8) — spec says `absolute right-0 top-full z-10 mt-2 w-56 rounded-xl bg-hero-mid/95 ...`. Current code uses `absolute right-0 z-50 mt-2 w-48 rounded-lg bg-white py-2 border border-gray-200 shadow-lg`. | Match spec exactly: `z-50 → z-10` regression risk: dropdown could be obscured by other z-50 elements. The original `z-50` was likely correct. Use `z-50` (preserved from current) with the rest of the spec's class string (`bg-hero-mid/95`, `rounded-xl`, `border border-white/10`, `shadow-frosted-base`, `backdrop-blur-md`, `py-2`, `w-56`). | Behavioral preservation: dropdown must continue to render above other page content. The spec's "z-10" appears to be a typo or oversight — preserve `z-50`. The dark-theme migration's other class changes are honored exactly. |
| **Width change `w-48` → `w-56`** (Change 8) — current dropdown is `w-48` (192px); spec says `w-56` (224px). | Update to `w-56` per spec (matches navbar dropdown convention). Visual verify mobile to ensure 224px doesn't push the dropdown off-screen on 320px viewports — should be fine since dropdown is `right-0` aligned. | Spec explicit. Cohesion with navbar dropdowns. |
| **Tab bar default classes — `flex w-full` vs current `flex gap-2`** (Change 6) — current LocalSupportPage tab bar uses `flex gap-2` outer wrapper. Spec wants `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`. | Apply spec exactly. The `gap-2` is replaced by the wrapper's `p-1` (which gives the active/inactive pills internal breathing room without explicit gap). Ensure the inner buttons no longer need `min-h-[44px] rounded-full px-4 py-2` chrome — the violet-pattern wrapper enforces shape. Active/inactive button class strings come from spec. | Spec explicit. Match canonical DailyHub pattern. |
| **Mobile view toggle `inline-flex` keep / drop** (Change 6) — current toggle buttons use `inline-flex min-h-[44px] items-center gap-1.5 rounded-full ...`. Spec wraps both buttons in the violet pattern outer wrapper. | Wrap both buttons in `<div className="mb-4 flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md">`. Inner buttons drop the `min-h-[44px] rounded-full bg-white/10` chrome and adopt active = `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`, inactive = `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`. The `<List size={16}>` and `<MapIcon size={16}>` icons preserved. `aria-pressed` preserved. Buttons get `flex-1` so they share width 50/50 inside the wrapper. | Spec Change 6 explicit. Visual cohesion with tab bar (same pattern). |

---

## Implementation Steps

### Step 1: Extend FeatureEmptyState with optional iconClassName prop

**Objective:** Add `iconClassName?: string` to FeatureEmptyState so consumers can override the default icon color (`text-white/30`). Required by Change 12's `iconClassName="text-white/40"` for the saved-tab empty state.

**Files to create/modify:**
- `frontend/src/components/ui/FeatureEmptyState.tsx` — add prop, threading through to icon className

**Details:**

Modify the props interface and `<Icon>` rendering:

```tsx
interface FeatureEmptyStateProps {
  icon: LucideIcon
  iconClassName?: string  // NEW: optional override for icon color/styling
  heading: string
  description: string
  // ... rest unchanged
}

// Inside the component, change:
<Icon
  className="mb-3 h-10 w-10 text-white/30 sm:h-12 sm:w-12"
  aria-hidden="true"
/>
// To:
<Icon
  className={cn('mb-3 h-10 w-10 sm:h-12 sm:w-12', iconClassName ?? 'text-white/30')}
  aria-hidden="true"
/>
```

Import `cn` from `@/lib/utils` (already imported at top of file — verify).

**Auth gating (if applicable):** N/A.

**Responsive behavior:** No layout change. Icon size stays `h-10 w-10 sm:h-12 sm:w-12`.
- Desktop (1440px): unchanged.
- Tablet (768px): unchanged.
- Mobile (375px): unchanged.

**Inline position expectations:** N/A (vertical stack inside FeatureEmptyState).

**Guardrails (DO NOT):**
- Do NOT remove the existing default `text-white/30` — backward-compat for every other call site.
- Do NOT change `mb-3 h-10 w-10 sm:h-12 sm:w-12` — those are sizing/spacing, not color.
- Do NOT add `iconClassName` as a required prop.
- Do NOT change any existing prop signatures or behavior.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `FeatureEmptyState — uses default text-white/30 when iconClassName omitted` | unit | Render `<FeatureEmptyState icon={Bookmark} heading="x" description="y" />`, assert rendered icon className contains `text-white/30` |
| `FeatureEmptyState — applies iconClassName when provided` | unit | Render with `iconClassName="text-white/40"`, assert rendered icon className contains `text-white/40` and does NOT contain `text-white/30` |
| `FeatureEmptyState — preserves sizing classes when iconClassName provided` | unit | Render with `iconClassName="text-amber-300"`, assert rendered icon className contains both `text-amber-300` and `h-10 w-10 sm:h-12 sm:w-12` |

Add tests to `frontend/src/components/ui/__tests__/FeatureEmptyState.test.tsx`. Match the existing test file's import and provider patterns.

**Expected state after completion:**
- [ ] FeatureEmptyState accepts optional `iconClassName` prop.
- [ ] All 10+ existing FeatureEmptyState consumers render unchanged (default `text-white/30`).
- [ ] Three new unit tests pass.
- [ ] `pnpm typecheck` passes.

---

### Step 2: Capture pre-execution baseline + verify Decisions

**Objective:** Establish accurate test baseline and verify the locked decisions before any code change. This step has no implementation deliverable — it's the gate for everything else.

**Files to create/modify:** None (read + verify only).

**Details:**

Execute these checks in order. Record each result in the Execution Log Notes field for the corresponding step.

1. **Confirm working branch.** Run `git rev-parse --abbrev-ref HEAD` — must equal `forums-wave-continued`. If not, STOP and ask user.
2. **Capture full test baseline.** Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80`. Record total pass/fail counts and the file count. Compare to spec's claimed "8,811 pass / 11 pre-existing fail across 7 files."
3. **Capture Local Support test status.** Run `cd frontend && pnpm test --run src/components/local-support 2>&1 | tail -40`. Record any failing tests by name. ⚠️ Planning recon found 0 Local Support failures — verify whether spec Decision 13's "4 logged-out mock listing card" failures still exist.
4. **Capture typecheck baseline.** Run `cd frontend && pnpm typecheck 2>&1 | tail -20`. Should pass cleanly.
5. **Capture lint baseline.** Run `cd frontend && pnpm lint 2>&1 | tail -20`. Should pass cleanly.
6. **Verify Spec 4A/4B/4C merged.** Run `git log --oneline forums-wave-continued | grep -iE "spec-4[abc]|4a-dashboard|4b-dashboard|4c-dashboard" | head -10`. Expect at least 3 hits.
7. **Verify BackgroundCanvas, FrostedCard variants, subtle Button.** Run `grep -l "BackgroundCanvas" frontend/src/pages/Dashboard.tsx 2>&1` (expect non-empty); `grep -E "'default'|'subdued'|'accent'" frontend/src/components/homepage/FrostedCard.tsx | head -5` (expect 3 variants); `grep -n "variant === 'subtle'" frontend/src/components/ui/Button.tsx | head -3` (expect non-empty).
8. **Verify violet tab pattern in DailyHub.** Run `grep -rn "bg-violet-500/\[0.13\]\|border-violet-400/45" frontend/src/components/daily/ 2>&1 | head -5` — expect at least one match in the DailyHub tab bar source.
9. **Verify `wr_bookmarks_<category>` not documented.** Run `grep -n "wr_bookmarks" .claude/rules/11-local-storage-keys.md .claude/rules/11b-local-storage-keys-bible.md 2>&1`. Expect ZERO matches.
10. **Verify Decision 14 — `?template=cr-buddy` consumer.** Run `grep -rn "template=" frontend/src/components/prayer-wall/ frontend/src/pages/PrayerWall*.tsx 2>&1 | head -10`. If 0 matches: parameter is unused (default expectation). If matches: surface as recon finding for follow-up.
11. **Read the Button component API end-to-end.** Confirm `asChild` is supported (verified during planning recon — `Button.tsx:34, 68-84` handle the polymorphic case).

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any code in this step. Verification only.
- Do NOT proceed to Step 3 until all checks complete and any baseline anomaly is reconciled with the spec author (or documented as a planning deviation).

**Test specifications:** N/A.

**Expected state after completion:**
- [ ] Working branch confirmed `forums-wave-continued`.
- [ ] Pre-migration test baseline recorded (expected: 9437 pass / 2 fail across 725 files per planning recon).
- [ ] Local Support test status recorded (expected: 0 failures, contradicting spec — plan execution adapts to actual).
- [ ] All 9 verification checks complete.
- [ ] Any anomaly documented in the Execution Log for downstream steps.

---

### Step 3: Wrap LocalSupportPage shell in BackgroundCanvas (Change 1)

**Objective:** Add `<BackgroundCanvas>` around both `<LocalSupportHero>` and `<main>` in the shared LocalSupportPage shell. Preserve existing `bg-dashboard-dark` outer div as base color, Navbar (transparent) and SiteFooter outside the canvas.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — add BackgroundCanvas import and wrap

**Details:**

Add import at top of file:
```tsx
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
```

Wrap the existing structure. Current shape (`LocalSupportPage.tsx:240-456`):

```tsx
<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
  <a href="#main-content" ...>Skip to content</a>
  <Navbar transparent />
  <LocalSupportHero ... />
  <main id="main-content" className="...">
    {/* ... */}
  </main>
  <SiteFooter />
</div>
```

New shape:

```tsx
<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
  <a href="#main-content" ...>Skip to content</a>
  <Navbar transparent />
  <BackgroundCanvas className="flex-1 flex flex-col">
    <LocalSupportHero ... />
    <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      {/* ... unchanged ... */}
    </main>
  </BackgroundCanvas>
  <SiteFooter />
</div>
```

The `flex-1 flex flex-col` className passed to BackgroundCanvas replicates the previous flex behavior so `<main>` can grow. BackgroundCanvas's own `relative min-h-screen overflow-hidden` is preserved through `cn()` merge with the consumer-supplied `flex-1 flex flex-col`. **Verify visually that `min-h-screen` doesn't double up** — if it does (e.g., the layout becomes too tall), drop `min-h-screen` from BackgroundCanvas via a className override would not be possible (it's hardcoded). In that case, keep BackgroundCanvas's own height and remove `min-h-screen` from the outer `<div>` — but that's a larger structural change. **Default: keep both `min-h-screen` (outer + BackgroundCanvas internal) — they collapse to the same constraint and `flex-1` on BackgroundCanvas resolves the layout.**

Atmospheric tuning per Decision 1: NO tuning by default. After Step 3 lands, run a manual visual check on `/local-support/churches`. If blooms feel too active for a 5-minute counselor search, add a damping overlay as the first child of BackgroundCanvas:

```tsx
<BackgroundCanvas className="flex-1 flex flex-col">
  <div className="absolute inset-0 bg-hero-bg/[0.10] pointer-events-none z-0" aria-hidden />
  <LocalSupportHero ... />
  <main ...>...</main>
</BackgroundCanvas>
```

Document any opacity tuning in the Execution Log notes. Do NOT edit `CANVAS_BACKGROUND` in `BackgroundCanvas.tsx` — that affects Dashboard / BibleLanding too.

**Auth gating (if applicable):** N/A — public page wrapper.

**Responsive behavior:**
- Desktop (1440px): atmospheric blooms render across full content area; hero + main visible above blooms.
- Tablet (768px): same — BackgroundCanvas is responsive via the canonical inline gradients.
- Mobile (375px): BackgroundCanvas renders smaller blooms (per its inline style `radial-gradient` proportions); content fits within `max-w-6xl px-4` constraint.

**Inline position expectations:** N/A — atmospheric layer behind content.

**Guardrails (DO NOT):**
- Do NOT remove `bg-dashboard-dark` from the outer `<div>` — base color stays as fallback.
- Do NOT move Navbar or SiteFooter inside BackgroundCanvas — they stay outside.
- Do NOT edit `CANVAS_BACKGROUND` in `BackgroundCanvas.tsx`.
- Do NOT remove the skip link.
- Do NOT change `<main>`'s id, className, or content.
- Do NOT add HorizonGlow or GlowBackground anywhere — Decision 1 locks BackgroundCanvas.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `LocalSupportPage — renders BackgroundCanvas wrapping hero and main` | integration | Render LocalSupportPage, assert a parent of `<main>` has the BackgroundCanvas-distinctive `relative min-h-screen overflow-hidden` classes (or query for the BackgroundCanvas rendered output) |

Add to `LocalSupportPage.test.tsx`. The existing test file already mocks `useAuth` and renders the page — extend with one new assertion.

**Expected state after completion:**
- [ ] BackgroundCanvas wraps Hero + main on `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`.
- [ ] Atmospheric blooms render visibly behind content.
- [ ] No regression in layout — content flows naturally; `<main>` retains its `mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8` constraints.
- [ ] Skip link still works (focus → click → jumps to `#main-content`).
- [ ] Existing tests pass without modification (only the new BackgroundCanvas-presence assertion is added).

---

### Step 4: Migrate LocalSupportHero — remove GlowBackground (Change 2)

**Objective:** Strip the `<GlowBackground variant="center">` wrap from LocalSupportHero. The hero `<section>`, h1 with `GRADIENT_TEXT_STYLE`, p subtitle, all spacing, accessible heading id, and `extraContent`/`action` slots are preserved exactly.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportHero.tsx` — remove GlowBackground import + wrapper

**Details:**

Current shape (`LocalSupportHero.tsx:1-41`):

```tsx
import type { ReactNode } from 'react'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

// ... interface ...

export function LocalSupportHero({ headingId, title, subtitle, extraContent, action }: LocalSupportHeroProps) {
  return (
    <GlowBackground variant="center">
      <section
        aria-labelledby={headingId}
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      >
        <h1 id={headingId} className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">{subtitle}</p>
        {extraContent && <div className="mt-4">{extraContent}</div>}
        {action && <div className="mt-6">{action}</div>}
      </section>
    </GlowBackground>
  )
}
```

New shape:

```tsx
import type { ReactNode } from 'react'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

// ... interface unchanged ...

export function LocalSupportHero({ headingId, title, subtitle, extraContent, action }: LocalSupportHeroProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
    >
      <h1 id={headingId} className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
        {title}
      </h1>
      <p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">{subtitle}</p>
      {extraContent && <div className="mt-4">{extraContent}</div>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
```

Remove the `GlowBackground` import. Section element, all classes, h1, p, slots, headingId — all preserved verbatim.

**Auth gating (if applicable):** N/A — public hero.

**Responsive behavior:**
- Desktop (1440px): hero spacing `lg:pt-40` preserved.
- Tablet (768px): `sm:pt-36 sm:pb-12` preserved.
- Mobile (375px): `pt-32 pb-8 px-4` preserved.

**Inline position expectations:** N/A — vertical stack.

**Guardrails (DO NOT):**
- Do NOT change the h1 className, id, or `style={GRADIENT_TEXT_STYLE}` — Decision 16 locks this.
- Do NOT change the p subtitle className.
- Do NOT change spacing classes.
- Do NOT remove `extraContent` or `action` props.
- Do NOT add a different atmospheric wrapper (HorizonGlow, GlowBackground variant, etc.) — the parent BackgroundCanvas (Step 3) provides atmosphere.
- Do NOT change the `aria-labelledby` semantics.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Update `LocalSupportHero — renders without GlowBackground wrapper` | unit | Render `<LocalSupportHero>` and assert the rendered tree does NOT contain a GlowBackground component (no `[data-testid="glow-background"]` or equivalent — depends on how GlowBackground identifies itself in tests) |
| Verify `LocalSupportHero — h1 retains GRADIENT_TEXT_STYLE` | unit | Existing test from `LocalSupportHero.test.tsx` — confirm it still passes (the gradient style application test) |

If the existing test file already asserts on GlowBackground presence (negatively or positively), update accordingly. Most likely the existing tests assert on h1 text + extraContent rendering — those should pass without modification.

**Expected state after completion:**
- [ ] `LocalSupportHero.tsx` no longer imports `GlowBackground`.
- [ ] Hero section renders as a plain `<section>` over the parent BackgroundCanvas atmosphere.
- [ ] h1 gradient text visually unchanged.
- [ ] Subtitle and extraContent slots render correctly on all 3 routes.
- [ ] All existing LocalSupportHero tests pass without behavioral modification.

---

### Step 5: Migrate ListingCard chrome to FrostedCard default + ring color + hover dedup (Change 3)

**Objective:** Replace the rolls-own ListingCard chrome (`rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20`) with `<FrostedCard as="article" variant="default" className="p-5 sm:p-6">`. Update selected-state ring color from `ring-primary` to `ring-violet-400/60`. Remove the now-redundant `lg:hover:shadow-md lg:hover:shadow-black/20`. Address-row MapPin and phone-row Phone icons drift-correct from `text-white/70` to `text-white/50`. Website ExternalLink in expanded section drift-corrects from `text-white/60` to `text-white/50`.

**Files to create/modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — chrome migration, ring color, icon color drift corrections

**Details:**

Add import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

Replace lines 76-82 (`<article aria-label={...} className={cn(...)}>`):

Current:
```tsx
<article
  aria-label={`${place.name} — ${place.address}`}
  className={cn(
    'rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20',
    isHighlighted && 'ring-2 ring-primary',
  )}
>
```

New:
```tsx
<FrostedCard
  as="article"
  variant="default"
  aria-label={`${place.name} — ${place.address}`}
  className={cn(
    'p-5 sm:p-6',
    isHighlighted && 'ring-2 ring-violet-400/60',
  )}
>
```

The closing `</article>` (line 266) becomes `</FrostedCard>`.

**Why this works:**
- FrostedCard `as="article"` renders an `<article>` element, preserving semantics.
- `aria-label` passes through (FrostedCard accepts the prop and applies it).
- FrostedCard `default` variant base = `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base`. The `cn()` merge with consumer `p-5 sm:p-6` resolves padding correctly via tailwind-merge (`p-5 sm:p-6` overrides base `p-6`).
- The hover lift comes from FrostedCard's own variant (no need for the rolls-own `lg:hover:shadow-md lg:hover:shadow-black/20` — remove it).
- `ring-2 ring-violet-400/60` for selected state per Decision 2.

**Address-row icon color update** (Change 11e drift correction):

Line 115: `<MapPin size={14} className="shrink-0 text-white/70" aria-hidden="true" />` → `<MapPin size={14} className="shrink-0 text-white/50" aria-hidden="true" />`.

Line 121: `<Phone size={14} className="shrink-0 text-white/70" aria-hidden="true" />` → `<Phone size={14} className="shrink-0 text-white/50" aria-hidden="true" />`.

**Website link icon color update** (Change 11e drift correction):

Line 206: `<ExternalLink size={14} className="shrink-0 text-white/60" aria-hidden="true" />` → `<ExternalLink size={14} className="shrink-0 text-white/50" aria-hidden="true" />`.

**Note:** the `transition-shadow motion-reduce:transition-none` on the old article is removed. FrostedCard provides its own `transition-all motion-reduce:transition-none duration-base ease-decelerate` via the variant base. Don't duplicate.

**Auth gating (if applicable):** N/A — listing card itself is public; bookmark button inside has its own auth gate (preserved from `LocalSupportPage.handleToggleBookmark`).

**Responsive behavior:**
- Desktop (1440px): FrostedCard hover lift (`hover:-translate-y-0.5`) renders on hover. `sm:p-6` padding.
- Tablet (768px): same hover behavior. `sm:p-6` padding.
- Mobile (375px): hover lift not relevant (no hover state on touch). `p-5` padding.

**Inline position expectations:**
- Photo + info row stays a flex row at all breakpoints (`flex gap-4`).
- Actions row (border-t pt-3): bookmark + share + (optional) VisitButton on left cluster, expand chevron on right. Same y ±5px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT remove `aria-label` on the article — semantic accessibility.
- Do NOT change the inner card structure (photo, info column, actions row, VisitNote, expanded details).
- Do NOT remove `inert` attribute on collapsed expanded details.
- Do NOT introduce a `bg-white/[0.05]` rounded-square icon container around the address/phone metadata icons — they sit inline with text per existing structure.
- Do NOT change the actions row border-t (`border-t border-white/10 pt-3`) — preserved.
- Do NOT change ChevronDown icon color from `text-white/50` — preserved.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Update `ListingCard.test.tsx:141` — `expect(article?.className).toContain('ring-primary')` → `toContain('ring-violet-400/60')` | unit | Class-string assertion update — change `ring-primary` to `ring-violet-400/60`. **Behavioral preservation: the ring still appears when `isHighlighted` is true; only the token changes.** |
| `ListingCard — renders FrostedCard default chrome instead of rolls-own border` | unit | Assert article className contains `bg-white/[0.07]` or absence of old `bg-white/[0.06]` (whichever is more stable) — narrow the assertion to the migration target |
| `ListingCard — selected state ring uses ring-violet-400/60` | unit | Render with `isHighlighted={true}`, assert article has `ring-2 ring-violet-400/60` |
| `ListingCard — address MapPin icon uses text-white/50` | unit | Assert MapPin in address row has `text-white/50` |
| `ListingCard — phone Phone icon uses text-white/50` | unit | Assert Phone in phone row has `text-white/50` |
| `ListingCard — website ExternalLink uses text-white/50` | unit | Render with `place.website` set + `isExpanded={true}`, assert ExternalLink has `text-white/50` |

**Expected state after completion:**
- [ ] ListingCard renders as FrostedCard default variant with `<article>` element.
- [ ] Hover lift comes from FrostedCard, not rolls-own `lg:hover:shadow-md`.
- [ ] Selected-state ring renders `ring-2 ring-violet-400/60`.
- [ ] Address, phone, website ExternalLink icons render `text-white/50`.
- [ ] All ListingCard tests pass (with class-string assertions updated).
- [ ] No double hover treatment (verify visually).
- [ ] Visual continuity with Dashboard / BibleLanding listing-style cards.

---

### Step 6: Migrate ListingSkeleton chrome to FrostedCard (Change 4)

**Objective:** Update `<ListingSkeleton>` in `SearchStates.tsx` so the loading-to-loaded transition is continuous (skeleton matches new ListingCard chrome).

**Files to create/modify:**
- `frontend/src/components/local-support/SearchStates.tsx` — wrap each skeleton in FrostedCard default

**Details:**

Add import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

Replace each of the 3 skeleton outer divs (`SearchStates.tsx:79-99`):

Current:
```tsx
<div
  key={i}
  className="rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6"
>
  {/* shimmer blocks unchanged */}
</div>
```

New:
```tsx
<FrostedCard
  key={i}
  variant="default"
  className="p-5 sm:p-6 motion-safe:animate-pulse"
>
  {/* shimmer blocks unchanged */}
</FrostedCard>
```

Note: the `motion-safe:animate-pulse` shifts to the wrapper. Existing inner shimmer blocks already have `motion-safe:animate-pulse` on each placeholder (`<div className="h-5 w-3/4 motion-safe:animate-pulse rounded bg-white/[0.08]" />`) — those stay unchanged. The wrapper-level pulse is additive but aligned with spec.

Wait — review: do we want the WRAPPER to pulse, or just the INNER blocks? The spec text: "migrates to `<FrostedCard variant="default" className="p-5 sm:p-6 motion-safe:animate-pulse">`. Skeleton blocks (the gray `<div>`s representing photo, name, address) stay unchanged — they're shimmer placeholders, not chrome." So the WRAPPER gets the `motion-safe:animate-pulse` per spec. Inner blocks already have their own pulse — that's fine, they pulse on top of the wrapper pulse (synced via animation-name shared keyframe). Visual diff: a slightly more pronounced pulse. Acceptable per spec.

**Auth gating (if applicable):** N/A — loading state.

**Responsive behavior:**
- Desktop (1440px): 3 skeletons stack vertically (`space-y-4` outer wrapper preserved). Photo placeholder visible (`hidden ... sm:block`).
- Tablet (768px): same as desktop. Photo placeholder visible.
- Mobile (375px): photo placeholder hidden (`hidden ... sm:block`). Single column, smaller padding (`p-5`).

**Inline position expectations:**
- Each skeleton's photo (when visible) + info column = same y ±5px (preserved existing flex row).
- Actions row stub (bookmark + share placeholders + expand placeholder) = same y ±5px.

**Guardrails (DO NOT):**
- Do NOT remove `role="status"` and the sr-only "Loading results..." announcer.
- Do NOT change the inner shimmer block layout or sizes.
- Do NOT change the outer `<div className="space-y-4" role="status" aria-label="Loading results">` wrapper.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `SearchStates — ListingSkeleton renders 3 FrostedCard wrappers` | unit | Assert 3 skeleton cards render with the FrostedCard default-variant base (e.g., `bg-white/[0.07]`) |
| Existing test `ListingSkeleton renders` (verify still passes) | unit | Render `<ListingSkeleton />`, assert role="status" + "Loading results" sr-only present |

**Expected state after completion:**
- [ ] ListingSkeleton renders as 3 FrostedCard default-variant wrappers with `motion-safe:animate-pulse`.
- [ ] Inner shimmer blocks unchanged.
- [ ] Loading-to-loaded visual transition is continuous (chrome shape matches the migrated ListingCard).
- [ ] Existing test passes.

---

### Step 7: Migrate tab bar + mobile view toggle to violet pattern (Change 6)

**Objective:** Replace the white-pill / muted-pill active/inactive pattern on the Search Results / Saved tab bar AND the mobile List View / Map View toggle with the canonical DailyHub violet pattern. Preserve all ARIA wiring.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — tab bar (~line 278) + mobile view toggle (~line 376)

**Details:**

**7a — Tab bar migration.** Current shape (`LocalSupportPage.tsx:278-313`):

```tsx
<div className="mt-6 mb-6 flex gap-2" role="tablist" aria-label="Results view">
  {(isAuthenticated ? ['search', 'saved'] as const : ['search'] as const).map((tab, index, tabs) => (
    <button
      key={tab}
      ref={(el) => { tabRefs.current[index] = el }}
      id={`ls-tab-${tab}`}
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls="ls-tabpanel"
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => setActiveTab(tab)}
      onKeyDown={...}
      className={cn(
        'min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
        activeTab === tab
          ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
          : 'bg-white/10 text-white/60 hover:bg-white/15',
      )}
    >
      {tab === 'search' ? 'Search Results' : `Saved (${bookmarkedIds.size})`}
    </button>
  ))}
</div>
```

New shape:

```tsx
<div
  className="mt-6 mb-6 flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md"
  role="tablist"
  aria-label="Results view"
>
  {(isAuthenticated ? ['search', 'saved'] as const : ['search'] as const).map((tab, index, tabs) => (
    <button
      key={tab}
      ref={(el) => { tabRefs.current[index] = el }}
      id={`ls-tab-${tab}`}
      type="button"
      role="tab"
      aria-selected={activeTab === tab}
      aria-controls="ls-tabpanel"
      tabIndex={activeTab === tab ? 0 : -1}
      onClick={() => setActiveTab(tab)}
      onKeyDown={...}  // unchanged keyboard handler
      className={cn(
        'flex-1 min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
        activeTab === tab
          ? 'bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
      )}
    >
      {tab === 'search' ? 'Search Results' : `Saved (${bookmarkedIds.size})`}
    </button>
  ))}
</div>
```

Key changes:
- Outer wrapper: `flex gap-2` → `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`. The `mt-6 mb-6` outer spacing preserved.
- Inner buttons: add `flex-1` so the two pills share width; remove `bg-white text-primary shadow-[...white...] active:scale-[0.98]` from active, replace with violet-pattern active. Inactive replaces `bg-white/10 text-white/60 hover:bg-white/15` with `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`.
- Focus ring: change from `focus-visible:ring-primary-lt` to `focus-visible:ring-violet-400/40` for color cohesion. (The spec doesn't explicitly call this out — but matching the violet system is the obvious cohesion. If preserving `ring-primary-lt` is preferred, that's also acceptable; both pass WCAG. Default to violet for cohesion.)

**ARIA preservation:** `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` (roving), keyboard handler (Home/End/ArrowLeft/ArrowRight) — ALL preserved verbatim.

**7b — Mobile view toggle migration.** Current shape (`LocalSupportPage.tsx:376-406`):

```tsx
<div className="lg:hidden">
  <div className="mb-4 flex gap-2">
    <button
      type="button"
      aria-pressed={mobileView === 'list'}
      onClick={() => setMobileView('list')}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
        mobileView === 'list'
          ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
          : 'bg-white/10 text-white/60 hover:bg-white/15',
      )}
    >
      <List size={16} aria-hidden="true" />
      List View
    </button>
    <button
      type="button"
      aria-pressed={mobileView === 'map'}
      onClick={() => setMobileView('map')}
      className={cn(/* same pattern as list */)}
    >
      <MapIcon size={16} aria-hidden="true" />
      Map View
    </button>
  </div>
  {mobileView === 'list' ? <ResultsList ... /> : <ResultsMap ... />}
</div>
```

New shape:

```tsx
<div className="lg:hidden">
  <div className="mb-4 flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md">
    <button
      type="button"
      aria-pressed={mobileView === 'list'}
      onClick={() => setMobileView('list')}
      className={cn(
        'flex-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
        mobileView === 'list'
          ? 'bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
      )}
    >
      <List size={16} aria-hidden="true" />
      List View
    </button>
    <button
      type="button"
      aria-pressed={mobileView === 'map'}
      onClick={() => setMobileView('map')}
      className={cn(/* same pattern as list */)}
    >
      <MapIcon size={16} aria-hidden="true" />
      Map View
    </button>
  </div>
  {mobileView === 'list' ? <ResultsList ... /> : <ResultsMap ... />}
</div>
```

Key changes mirror 7a: outer wrapper gains the violet-system shape; inner buttons get `flex-1` + `justify-center` (so the icon + label center within each pill), active/inactive states swap to violet pattern, focus ring updated.

**ARIA preservation:** `aria-pressed` preserved on each button. List/MapIcon size and `aria-hidden` preserved.

**Auth gating (if applicable):** N/A — toggle visibility is `lg:hidden`, all states public. Tab bar's "Saved" tab visibility is gated by `isAuthenticated` (preserved verbatim — the conditional `(isAuthenticated ? ['search', 'saved'] : ['search'])` is unchanged).

**Responsive behavior:**
- Desktop (1440px): tab bar renders centered (existing alignment from `mt-6 mb-6`). `flex w-full` makes pills share full content width — visually wider than before. Mobile view toggle hidden via `lg:hidden`.
- Tablet (768px): tab bar same. Mobile view toggle visible (still under `lg:hidden`).
- Mobile (375px): tab bar full-width with two pills sharing width. Mobile view toggle full-width with two pills sharing width.

**Inline position expectations:**
- Tab bar: Search Results pill + Saved pill on same y ±5px at ALL breakpoints (single-row flex, no wrap allowed).
- Mobile view toggle: List View pill + Map View pill on same y ±5px below 1024px.

**Guardrails (DO NOT):**
- Do NOT change `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `id="ls-tab-{tab}"`, `aria-controls="ls-tabpanel"` semantics.
- Do NOT change the keyboard handler (`Home`, `End`, `ArrowLeft`, `ArrowRight` navigation). The handler operates on `tabRefs.current` which is unchanged.
- Do NOT remove the `(isAuthenticated ? ['search', 'saved'] : ['search'])` conditional — saved tab gating preserved.
- Do NOT change the panel's `role="tabpanel"` and `aria-labelledby` semantics on the wrapping `<div role="tabpanel" id="ls-tabpanel">` (`LocalSupportPage.tsx:335`).
- Do NOT change `aria-pressed` semantics on mobile view toggle.
- Do NOT remove the `<List>` / `<MapIcon>` icons from the mobile toggle.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `LocalSupportPage — tab bar uses violet pattern outer wrapper` | unit | Assert outer tablist div className contains `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md` |
| `LocalSupportPage — active tab uses bg-violet-500/[0.13]` | unit | Render with default activeTab="search", assert search tab className contains `bg-violet-500/[0.13]` and `border-violet-400/45` |
| `LocalSupportPage — inactive tab uses text-white/50 hover:text-white/80` | integration | Render authenticated, assert "Saved" tab className contains `text-white/50` and NOT `bg-violet-500/[0.13]` |
| `LocalSupportPage — keyboard navigation still works` | integration | Existing test (if present) verifying `ArrowRight` switches tabs — must pass unchanged |
| `LocalSupportPage — mobile view toggle uses violet pattern` | integration | Render with results, assert mobile toggle outer wrapper className contains the violet pattern |
| `LocalSupportPage — aria-pressed preserved on mobile toggle` | integration | Render, assert `aria-pressed="true"` on active mobile toggle button |

Existing tests in `LocalSupportPage.test.tsx` that assert behavior (click → tab change, keyboard nav) must continue to pass. Tests asserting on the OLD class strings (`bg-white text-primary shadow-[...rgba(255,255,255,0.15)]`) need updating — verify by searching the test file for those strings.

**Expected state after completion:**
- [ ] Tab bar uses violet pattern outer wrapper + active/inactive button states.
- [ ] Mobile view toggle uses the same violet pattern.
- [ ] All ARIA wiring preserved (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving tabindex, keyboard nav, `aria-pressed`).
- [ ] All behavioral tests pass without modification.
- [ ] Class-string tests updated to new tokens.
- [ ] Visual diff: pills now have a shared violet-tinted outer wrapper instead of two free-standing pills.

---

### Step 8: Migrate SearchControls — Use My Location + Search subtle Button (Change 5a, 5b, 5c)

**Objective:** Replace the rolls-own white-pill CTAs in `SearchControls.tsx` with `<Button variant="subtle" size="md">`. MapPin on Use My Location gets `text-sky-300`. Form input chrome stays per Decision 8 (verify focus-ring contrast post-BackgroundCanvas).

**Files to create/modify:**
- `frontend/src/components/local-support/SearchControls.tsx` — Use My Location button + Search button migrate

**Details:**

Add import:
```tsx
import { Button } from '@/components/ui/Button'
```

**8a — Use My Location button.** Replace lines 126-140:

Current:
```tsx
<button
  type="button"
  onClick={onInteractionBlocked ?? handleUseMyLocation}
  disabled={isGeolocating}
  aria-label="Use my current location"
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
>
  {isGeolocating ? (
    <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />
  ) : (
    <MapPin size={18} aria-hidden="true" />
  )}
  <span className="sm:hidden lg:inline">Use My Location</span>
  <span className="hidden sm:inline lg:hidden">My Location</span>
</button>
```

New:
```tsx
<Button
  variant="subtle"
  size="md"
  type="button"
  onClick={onInteractionBlocked ?? handleUseMyLocation}
  disabled={isGeolocating}
  aria-label="Use my current location"
>
  {isGeolocating ? (
    <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />
  ) : (
    <MapPin size={18} className="text-sky-300" aria-hidden="true" />
  )}
  <span className="sm:hidden lg:inline">Use My Location</span>
  <span className="hidden sm:inline lg:hidden">My Location</span>
</Button>
```

Key changes:
- The rolls-own white-pill class string drops entirely — Button subtle variant provides the chrome.
- MapPin gains `text-sky-300` (per icon table).
- Loader2 inherits Button text color (white) — no class needed.
- All other props (onClick, disabled, aria-label, type) preserved.

**8b — Search submit button.** Replace lines 161-169:

Current:
```tsx
<button
  type="submit"
  disabled={isLoading || !locationInput.trim()}
  aria-label="Search"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
>
  <Search size={18} aria-hidden="true" />
  <span className="hidden sm:inline">Search</span>
</button>
```

New:
```tsx
<Button
  variant="subtle"
  size="md"
  type="submit"
  disabled={isLoading || !locationInput.trim()}
  aria-label="Search"
>
  <Search size={18} aria-hidden="true" />
  <span className="hidden sm:inline">Search</span>
</Button>
```

The Search icon stays neutral (inherits Button text color = white).

**8c — Form input + range slider.** No change. Per Decision 8, the utility input idiom is preserved. **Visual verification gate:** After Step 3 lands BackgroundCanvas, manually check `/local-support/churches` and confirm the input's `focus:ring-primary/20` ring is still readable on the new atmospheric layer. If muddy, change to `focus:ring-violet-400/30` AND document in Execution Log. Default: preserve.

**Auth gating (if applicable):** N/A — search and geolocation are public per Decision 12. The `onInteractionBlocked` prop hook is preserved on the buttons but never wired by LocalSupportPage today.

**Responsive behavior:**
- Desktop (1440px): Use My Location + city input + Search submit on a horizontal row (`sm:flex-row`). Subtle Button variant maintains `min-h-[44px]` per spec.
- Tablet (768px): same horizontal row. Use My Location label switches to "My Location" via `hidden sm:inline lg:hidden` span.
- Mobile (375px): vertical stack via `flex flex-col gap-3 sm:flex-row sm:items-end`. Search button hides label via `<span className="hidden sm:inline">Search</span>`.

**Inline position expectations:**
- ≥640px: Use My Location button + city input + Search button on same y ±5px (single row).
- <640px: vertical stack — y values differ intentionally.

**Guardrails (DO NOT):**
- Do NOT remove `aria-label` on either button.
- Do NOT change the form's `onSubmit` handler logic.
- Do NOT change geolocation handling, debouncing, or onSearch callback wiring.
- Do NOT change the location text input chrome (`bg-white/[0.06]`, `focus:ring-primary/20`, etc.) per Decision 8.
- Do NOT change the range slider chrome (`accent-primary` + mile markers) per Decisions 8 + 9.
- Do NOT remove the `onInteractionBlocked` prop or its consumer wiring (it's vestigial but preserved for forward-compat).
- Do NOT preemptively change `focus:ring-primary/20` to `focus:ring-violet-400/30` on the input — verify visually first per Change 5c.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `SearchControls — Use My Location button uses subtle variant` | unit | Render, assert button className contains `bg-white/[0.07]` and `border-white/[0.12]` (subtle variant base) and NOT `bg-white px-6` (old white-pill) |
| `SearchControls — Use My Location MapPin uses text-sky-300` | unit | Render, assert MapPin icon className contains `text-sky-300` |
| `SearchControls — Search button uses subtle variant` | unit | Render with `locationInput` set, assert Search button className contains `bg-white/[0.07]` |
| `SearchControls — Search icon stays neutral` | unit | Render, assert Search icon does NOT have `text-sky-300` or other tonal color (only Button text color inheritance) |
| Existing geolocation flow tests | integration | All existing tests in `SearchControls.test.tsx` (geolocation, debounce, geocode) must pass without behavioral modification — only class-string assertions update |

Update `SearchControls.test.tsx` line 133 (`expect(button.className).toContain('focus-visible:ring-primary-lt')`): the subtle Button variant uses `focus-visible:ring-primary` (not `ring-primary-lt`). Update to `focus-visible:ring-primary` OR drop the assertion if it's about the old white-pill specifically.

**Expected state after completion:**
- [ ] Use My Location and Search buttons render via `<Button variant="subtle" size="md">`.
- [ ] MapPin on Use My Location is `text-sky-300`.
- [ ] Loader2 + Search icons stay neutral white (inherit Button text color).
- [ ] Form input + range slider chrome unchanged.
- [ ] Geolocation flow + debounced search work identically.
- [ ] All SearchControls tests pass (with class-string assertions updated).
- [ ] `pnpm typecheck` passes.

---

### Step 9: Migrate ListingShareDropdown light → dark theme + tonal item icons (Change 8)

**Objective:** Replace the light-themed dropdown panel with the dark-theme navbar-dropdown convention. Update item-row chrome and icon colors.

**Files to create/modify:**
- `frontend/src/components/local-support/ListingShareDropdown.tsx` — panel chrome, item button chrome, icon colors

**Details:**

**Panel chrome migration.** Replace lines 152-158:

Current:
```tsx
<div
  ref={dropdownRef}
  role="menu"
  aria-label="Share options"
  className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
  onKeyDown={handleKeyDown}
>
```

New:
```tsx
<div
  ref={dropdownRef}
  role="menu"
  aria-label="Share options"
  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-hero-mid/95 backdrop-blur-md border border-white/10 shadow-frosted-base py-2"
  onKeyDown={handleKeyDown}
>
```

Key changes:
- `w-48` → `w-56` (192px → 224px).
- `rounded-lg` → `rounded-xl`.
- `border-gray-200 bg-white shadow-lg` → `bg-hero-mid/95 backdrop-blur-md border border-white/10 shadow-frosted-base`.
- `z-50` preserved (NOT changed to `z-10` per Edge Case decision — z-50 keeps dropdown above other content).
- Add `top-full` for explicit anchor positioning.

**Item button chrome migration.** Replace `itemClass` (line 148-149):

Current:
```tsx
const itemClass =
  'flex w-full items-center gap-3 px-4 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary'
```

New:
```tsx
const itemClass =
  'flex w-full items-center gap-2 px-4 py-2 text-sm text-white/80 transition-colors hover:text-white hover:bg-white/[0.05] focus-visible:outline-none focus-visible:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/40'
```

Key changes:
- `gap-3` → `gap-2` (matches spec `flex w-full items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.05]`).
- `text-text-dark` → `text-white/80`.
- `hover:bg-gray-50` → `hover:bg-white/[0.05]`.
- Add `hover:text-white`.
- `focus-visible:bg-gray-100` → `focus-visible:bg-white/[0.08]`.
- `focus-visible:ring-primary` → `focus-visible:ring-violet-400/40` (cohesion with violet system).

**Icon color updates:**

- Copy / Mail / MessageSquare lucide icons (lines 170, 181, 191): change from no color (default = `currentColor` = inherits item text color) to explicit `text-white/60`. Update each `<Copy className="h-4 w-4">` → `<Copy className="h-4 w-4 text-white/60">`. Same for Mail and MessageSquare.
- Facebook / X inline SVGs (lines 203-204, 217-218): keep brand color preservation. Currently `fill="currentColor"` — that inherits item text color (`text-white/80`) which means Facebook and X render in white/80, NOT brand blue/black. Per Decision 7's "brand colors preserved": this is a brand-fidelity question. **Decision: leave `fill="currentColor"` (matches current code's tradeoff).** Adding explicit brand fills is a follow-up, not in scope. Document in Execution Log: "Facebook/X SVG fill via currentColor inherits item-text color; brand-color preservation is a documented future enhancement." Spec accepts either: "brand identifiers — deliberate semantic exception" implies explicit brand colors, but the existing implementation already inherits via currentColor and this spec preserves that path. If `/code-review` flags this as an explicit brand-color requirement, change `fill="currentColor"` to `fill="#1877F2"` for Facebook and `fill="white"` for X (X is monochrome white on dark backgrounds officially) — but default is to preserve.
- Check icon (copy success feedback, line 168): `<Check className="h-4 w-4 text-success" />` → `<Check className="h-4 w-4 text-emerald-300" />`.

**Auth gating (if applicable):** N/A — share is public.

**Responsive behavior:**
- Desktop (1440px): dropdown opens flush right (`absolute right-0 top-full mt-2`), 224px wide.
- Tablet (768px): same.
- Mobile (375px): dropdown 224px wide opening flush right (avoids viewport overflow on most phones; edge case is the 320px iPhone SE — verify; if overflow, may need `right-0` adjustment, but `right-0` + `w-56` = 224px starting from right edge stays inside any viewport ≥224px wide, which all phones are). The `sm:hidden` SMS item is hidden on tablet+.

**Inline position expectations:**
- Each item row: icon + label inline on same y ±5px (within the row).
- Items stack vertically inside the dropdown panel.

**Guardrails (DO NOT):**
- Do NOT change `role="menu"`, `aria-label="Share options"`, `role="menuitem"`, or `tabIndex={-1}` semantics.
- Do NOT remove or alter the focus-trap behavior (`useEffect` with `getItems()[0]?.focus()` on open).
- Do NOT remove the click-outside / Escape-key dismiss handlers.
- Do NOT change the share URL construction (`shareUrl`, `encodedUrl`, `encodedText`).
- Do NOT change the `tryWebShare` utility function.
- Do NOT change the conditional rendering of the SMS item (`sm:hidden`).
- Do NOT change z-50 to z-10 (keeps dropdown above other surfaces).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `ListingShareDropdown — panel uses dark theme tokens` | unit | Render with `isOpen={true}`, assert dropdown div className contains `bg-hero-mid/95` and NOT `bg-white` |
| `ListingShareDropdown — items use text-white/80` | unit | Render, assert each menuitem className contains `text-white/80` and NOT `text-text-dark` |
| `ListingShareDropdown — Check icon (copy feedback) uses text-emerald-300` | unit | Trigger copy success, assert Check icon className contains `text-emerald-300` and NOT `text-success` |
| `ListingShareDropdown — Copy icon (default) uses text-white/60` | unit | Render, assert Copy icon className contains `text-white/60` |
| `ListingShareDropdown — Facebook + X SVGs preserve currentColor fill` | unit | Render, assert SVG `fill="currentColor"` attribute (preserved) |
| Existing tests | integration | All behavioral tests in `ListingShareDropdown.test.tsx` (copy-to-clipboard, focus restore, escape key, click outside) must pass unchanged |

**Expected state after completion:**
- [ ] Dropdown panel renders dark-themed (`bg-hero-mid/95`, `border-white/10`, `shadow-frosted-base`).
- [ ] Item rows render `text-white/80` with `hover:text-white hover:bg-white/[0.05]`.
- [ ] Copy / Mail / MessageSquare icons render `text-white/60`.
- [ ] Check icon (copy success) renders `text-emerald-300`.
- [ ] Facebook / X brand SVGs preserve `fill="currentColor"` (default behavior).
- [ ] All behavioral tests pass.
- [ ] No light-theme tokens (`text-text-dark`, `bg-gray-100`, `border-gray-200`) remain in this file.

---

### Step 10: Migrate SearchStates "Try Again" to subtle Button (Change 9)

**Objective:** Replace the rolls-own white-pill "Try Again" button in `<SearchError>` with `<Button variant="subtle" size="md">`. Preserve `<AlertCircle>` semantic error color.

**Files to create/modify:**
- `frontend/src/components/local-support/SearchStates.tsx` — SearchError retry button

**Details:**

Add import (if not already present from Step 6):
```tsx
import { Button } from '@/components/ui/Button'
```

Replace lines 60-67 in SearchError:

Current:
```tsx
<button
  type="button"
  onClick={onRetry}
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
>
  Try Again
</button>
```

New:
```tsx
<Button variant="subtle" size="md" type="button" onClick={onRetry}>
  Try Again
</Button>
```

The `<AlertCircle size={48} className="mb-4 text-danger">` stays AS-IS per Decision 7.

**Auth gating (if applicable):** N/A — error retry is public.

**Responsive behavior:**
- Desktop / Tablet / Mobile: Button subtle variant maintains `min-h-[44px]`. Centered via parent `<div className="flex flex-col items-center py-12 text-center">`.

**Inline position expectations:** N/A — vertical stack.

**Guardrails (DO NOT):**
- Do NOT change AlertCircle's `text-danger` color.
- Do NOT change the parent `<div className="flex flex-col items-center py-12 text-center">` wrapper.
- Do NOT change the message paragraph (`<p className="mb-4 max-w-md text-base text-white/60">`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `SearchStates — SearchError Try Again button uses subtle variant` | unit | Render `<SearchError message="x" onRetry={fn} />`, assert button className contains `bg-white/[0.07]` |
| `SearchStates — SearchError AlertCircle stays text-danger` | unit | Render, assert AlertCircle className contains `text-danger` |
| Existing test | integration | The existing `SearchStates.test.tsx` retry button test (clicking calls onRetry) must pass unchanged |

**Expected state after completion:**
- [ ] Try Again button renders via `<Button variant="subtle" size="md">`.
- [ ] AlertCircle preserves `text-danger`.
- [ ] Behavioral test passes.

---

### Step 11: Migrate ListingCard "Get Directions" via Button asChild (Change 10) + ExternalLink icon swap

**Objective:** Replace the rolls-own white-pill "Get Directions" anchor with `<Button asChild variant="subtle" size="md">` wrapping the existing `<a>` element. Swap the inline icon from `MapPin` → `ExternalLink` per icon table.

**Files to create/modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — Get Directions anchor + icon swap

**Details:**

The Button component supports `asChild` (verified in `Button.tsx:34, 68-84`), so we use polymorphic rendering instead of manual class application. This is the spec's preferred path.

Update import line:
```tsx
import { Bookmark, ChevronDown, ExternalLink, ImageOff, MapPin, Phone, Share2, Star } from 'lucide-react'
```
The `MapPin` and `ExternalLink` are already imported. No new imports needed for the icon swap. Add Button import:
```tsx
import { Button } from '@/components/ui/Button'
```

Replace lines 247-255 (Get Directions anchor):

Current:
```tsx
<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
>
  <MapPin size={14} aria-hidden="true" />
  Get Directions
</a>
```

New:
```tsx
<Button asChild variant="subtle" size="md">
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
    target="_blank"
    rel="noopener noreferrer"
  >
    <ExternalLink size={14} aria-hidden="true" />
    Get Directions
  </a>
</Button>
```

Key changes:
- Wrap `<a>` in `<Button asChild variant="subtle" size="md">` — Button merges its computed class signature onto the anchor via `cloneElement`.
- Anchor keeps `href`, `target`, `rel` (preserved verbatim).
- Icon swap: `MapPin` → `ExternalLink` per icon table. ExternalLink inherits anchor text color (white via subtle Button base).

**Auth gating (if applicable):** N/A — Get Directions is public.

**Responsive behavior:**
- Desktop / Tablet / Mobile: subtle Button size md gives `px-6 py-2.5 text-sm` + `min-h-[44px]`. The previous `px-4 py-2` shrunk slightly tighter — visual diff: button slightly larger now. Acceptable.

**Inline position expectations:**
- Get Directions anchor renders above the ListingCTAs grid in the expanded section. Vertical stack — y values differ intentionally.
- Icon + label inline within the button (Button's `gap-2` from subtle variant base).

**Guardrails (DO NOT):**
- Do NOT change `target="_blank"` or `rel="noopener noreferrer"` (security).
- Do NOT remove the icon — it teaches the affordance ("opens externally").
- Do NOT change the href construction.
- Do NOT introduce a wrapper component to bridge the button-vs-anchor gap (spec explicitly forbids).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `ListingCard — Get Directions anchor uses subtle Button styling via asChild` | unit | Render expanded card, assert the Get Directions `<a>` element className contains `bg-white/[0.07]` (subtle variant base — applied by Button asChild via cloneElement) |
| `ListingCard — Get Directions icon is ExternalLink not MapPin` | unit | Render expanded card, assert the Get Directions link contains an ExternalLink icon (e.g., via `aria-label` of the icon, or by the icon's distinctive size/role pattern) |
| `ListingCard — Get Directions href, target, rel preserved` | unit | Render, assert the anchor has correct `href` (google maps URL), `target="_blank"`, `rel="noopener noreferrer"` |

**Expected state after completion:**
- [ ] Get Directions renders as `<Button asChild variant="subtle" size="md">` wrapping `<a target="_blank" rel="noopener noreferrer">`.
- [ ] Icon is `ExternalLink` (size 14), inheriting anchor text color (white).
- [ ] Anchor opens external Google Maps URL in new tab.
- [ ] All accessibility attributes preserved.

---

### Step 12: Apply Tonal Icon Pattern — VisitButton + Bookmark (Changes 11a, 11b)

**Objective:** Update VisitButton's visited-state color from `text-success` to `text-amber-300`. Update ListingCard's bookmark active state from `fill-success text-success` to `fill-emerald-300 text-emerald-300`. Unbookmarked + unvisited states preserved.

**Files to create/modify:**
- `frontend/src/components/local-support/VisitButton.tsx` — visited-state color
- `frontend/src/components/local-support/ListingCard.tsx` — bookmark active color

**Details:**

**12a — VisitButton visited state.** In `VisitButton.tsx:97-121`, the button container has:

```tsx
className={cn(
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors min-h-[44px]',
  visited
    ? 'text-success'
    : 'border border-white/10 text-white/50 hover:text-primary',
)}
```

Change `text-success` to `text-amber-300`:

```tsx
className={cn(
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors min-h-[44px]',
  visited
    ? 'text-amber-300'
    : 'border border-white/10 text-white/50 hover:text-primary',
)}
```

The inner Check / MapPin icons inherit color via `currentColor`, so Check (visited) becomes amber-300 and MapPin (not visited) stays white/50. **Preservation note**: spec icon table says "MapPin → text-amber-300 when visited" but current code uses Check; per Edge Case decision, preserve the Check vs MapPin icon split — the color change applies to the button container.

**12b — ListingCard bookmark active.** In `ListingCard.tsx:148-154`:

```tsx
<Bookmark
  size={18}
  aria-hidden="true"
  className={cn(
    isBookmarked ? 'fill-success text-success' : 'text-white/50',
  )}
/>
```

Change to:

```tsx
<Bookmark
  size={18}
  aria-hidden="true"
  className={cn(
    isBookmarked ? 'fill-emerald-300 text-emerald-300' : 'text-white/50',
  )}
/>
```

**Auth gating (if applicable):** N/A at icon level. Bookmark click handler in `LocalSupportPage.handleToggleBookmark` (`:198-212`) is preserved unchanged — auth gate via authModal stays.

**Responsive behavior:** No layout change. Color only.

**Inline position expectations:** Preserved (same y ±5px in actions row).

**Guardrails (DO NOT):**
- Do NOT change the Check vs MapPin icon split in VisitButton. Visited still shows Check; not-visited still shows MapPin.
- Do NOT change `aria-pressed`, `aria-label` semantics on either button.
- Do NOT change `fill-success` to `fill-emerald-300` in any other component (only the Bookmark icon in ListingCard).
- Do NOT change unbookmarked state's `text-white/50` — preserved.
- Do NOT change unvisited state's `border border-white/10 text-white/50 hover:text-primary` — preserved.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `VisitButton — visited state uses text-amber-300` | unit | Render with visit recorded today, assert button className contains `text-amber-300` and NOT `text-success` |
| `VisitButton — unvisited state preserved` | unit | Render with no visit, assert button className contains `border border-white/10 text-white/50` |
| `ListingCard — bookmark active uses fill-emerald-300 text-emerald-300` | unit | Render with `isBookmarked={true}`, assert Bookmark icon className contains `fill-emerald-300 text-emerald-300` and NOT `fill-success text-success` |
| `ListingCard — bookmark inactive preserved` | unit | Render with `isBookmarked={false}`, assert Bookmark icon className contains `text-white/50` |

**Expected state after completion:**
- [ ] VisitButton when visited renders amber-300 (Check icon inherits via currentColor).
- [ ] Bookmark when active renders emerald-300 fill + text.
- [ ] Both unactive states preserved (white/50).
- [ ] Auth gates and behavior unchanged.

---

### Step 13: Apply Tonal Icon Pattern — ListingCTAs categorical icon swap (Change 11c)

**Objective:** Swap each ListingCTA tile's leading icon from `ArrowRight` to the categorical glyph paired with its tonal color: Pray (CTA index 0) → `Heart` + `text-pink-300`; Journal (CTA index 1) → `BookOpen` + `text-sky-300`; Share/Buddy (CTA index 2) → `MessageSquare` + `text-violet-300`. ArrowRight remains as a neutral trailing "go" affordance unless layout cramps. Per planning-review pushback: color without glyph carries no categorical signal — Tonal Icon Pattern requires color+glyph pairing per Decision 7 (Dashboard QuickActions alignment target).

**Files to create/modify:**
- `frontend/src/components/local-support/ListingCTAs.tsx` — extend CTAItem interface, swap icons, apply tonal colors

**Details:**

Update imports — add the three categorical lucide icons + `LucideIcon` type:

```tsx
import { Link } from 'react-router-dom'
import { ArrowRight, Heart, BookOpen, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LocalSupportCategory } from '@/types/local-support'
```

Extend the `CTAItem` interface so each CTA carries its categorical icon and tonal color (self-describing data structure — render layer reads icon/color from the item, not from positional logic):

```tsx
interface CTAItem {
  label: string
  to?: string
  onClick?: () => void
  icon: LucideIcon       // NEW — categorical glyph
  iconColor: string      // NEW — tonal Tailwind class (e.g., "text-pink-300")
}
```

Update `getCTAs` to populate icon + iconColor per tile. Each category's three CTAs are always returned in the same order (Pray, Journal, Share/Buddy) — the icon assignment is uniform across categories:

```tsx
function getCTAs(placeName: string, category: LocalSupportCategory, onShareClick: () => void): CTAItem[] {
  switch (category) {
    case 'churches':
      return [
        {
          label: 'Pray for this church',
          to: `/daily?tab=pray&context=${encodeURIComponent(`Praying for ${placeName}`)}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal about your visit',
          to: `/daily?tab=journal&prompt=${encodeURIComponent(`Reflect on your experience at ${placeName}...`)}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
    case 'counselors':
      return [
        {
          label: 'Pray before your appointment',
          to: `/daily?tab=pray&context=${encodeURIComponent('Preparing to meet with a counselor...')}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal about your session',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('After my counseling session, I feel...')}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Share with a friend',
          onClick: onShareClick,
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
    case 'celebrate-recovery':
      return [
        {
          label: 'Pray for your recovery journey',
          to: `/daily?tab=pray&context=${encodeURIComponent('Praying for strength in my recovery journey')}`,
          icon: Heart,
          iconColor: 'text-pink-300',
        },
        {
          label: 'Journal your progress',
          to: `/daily?tab=journal&prompt=${encodeURIComponent('Reflecting on my recovery journey today...')}`,
          icon: BookOpen,
          iconColor: 'text-sky-300',
        },
        {
          label: 'Find a meeting buddy',
          to: '/prayer-wall?template=cr-buddy',
          icon: MessageSquare,
          iconColor: 'text-violet-300',
        },
      ]
  }
}
```

Update the JSX render block (lines 67-98 currently). New layout: `[categorical icon] [label] [ArrowRight]` — leading icon at left in tonal color, label in middle, trailing ArrowRight at right inheriting white text color (`text-white`):

```tsx
export function ListingCTAs({ placeName, category, onShareClick }: ListingCTAsProps) {
  const ctas = getCTAs(placeName, category, onShareClick)

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {ctas.map((cta) => {
          const Icon = cta.icon
          const content = (
            <>
              <Icon size={14} className={cta.iconColor} aria-hidden="true" />
              <span className="flex-1 truncate">{cta.label}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )
          return cta.to ? (
            <Link
              key={cta.label}
              to={cta.to}
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-white transition-colors hover:text-white/80"
            >
              {content}
            </Link>
          ) : (
            <button
              key={cta.label}
              type="button"
              onClick={cta.onClick}
              className="inline-flex min-h-[44px] items-center gap-2 text-left text-sm text-white transition-colors hover:text-white/80"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

Key layout notes:
- `gap-1` → `gap-2` (8px instead of 4px) — gives the leading icon, label, and trailing arrow visual breathing room.
- `whitespace-nowrap` removed; replaced with `<span className="flex-1 truncate">` on the label so it ellipses if it overflows the tile width on `sm:grid-cols-2`. Truncation is preferable to wrapping (which would break the inline-row contract) AND preferable to `nowrap`-without-truncate (which would push the trailing arrow off-screen).
- Trailing `ArrowRight` inherits `text-white` from the parent — neutral "go" affordance, no tonal color. Visual subordinate to the leading categorical glyph.

**Cramped-layout fallback (per planning-review guidance).** During visual verification (Step 20), check the `sm:grid-cols-2` layout at 640-1024px viewport width with the Celebrate Recovery CTAs (longest labels, especially "Pray for your recovery journey" at 28 chars). If the row reads visually cramped — leading icon, truncated label, trailing arrow all squeezing — **drop the trailing ArrowRight** by removing the `<ArrowRight size={14} aria-hidden="true" />` line from the `content` JSX. The leading glyph + label is the load-bearing affordance; the arrow is a nice-to-have. Document the choice in the Execution Log: "Spec 5 Step 13: trailing ArrowRight {kept | dropped} after visual verification at 768px on CR CTAs."

**Decision 14 verification.** While in this file, verify `?template=cr-buddy` query parameter on the CR meeting buddy link (`to: '/prayer-wall?template=cr-buddy'` in `getCTAs` for celebrate-recovery). Per direction Decision 14, default action is "(b) keep and ignore." Pre-execution recon Step 10 grepped Prayer Wall components for `template=` consumers — if 0 hits, confirm "keep parameter as-is, harmless future-proofing" and document as "Out of Scope follow-up: Prayer Wall side deep-link wiring." If hits exist, surface to user. NO CODE CHANGE in this step regardless of recon outcome.

**Auth gating (if applicable):** Tile click navigates to `/daily?tab=pray|journal` or `/prayer-wall` — destination handles its own auth gate. Preserved.

**Responsive behavior:**
- Desktop (1440px) / Tablet (≥640px): 2-column grid (`grid-cols-1 sm:grid-cols-2`). 3 CTAs in 2 rows (1+2). Each tile shows leading icon + label (truncate-on-overflow) + trailing arrow. Visual verification at 768px is the critical test for the trailing-arrow fallback.
- Mobile (<640px): 1-column stack — full tile width per row, no truncation pressure.

**Inline position expectations:**
- Each CTA row: leading categorical icon + label + trailing arrow inline (`inline-flex items-center gap-2`). Same y within the row.
- Tiles in `sm:grid-cols-2` rows: same y ±5px.
- Truncation of label inside `<span className="flex-1 truncate">` is acceptable — it's a layout safety mechanism, not a wrapping bug. Verify via `boundingBox()` that the `.flex-1` span shrinks rather than the row wrapping to multiple lines.

**Guardrails (DO NOT):**
- Do NOT change the CTA destinations (preserve `to: '/daily?tab=pray&context=...'`, `to: '/daily?tab=journal&prompt=...'`, `to: '/prayer-wall?template=cr-buddy'`, etc. — verbatim).
- Do NOT remove `?template=cr-buddy` from the CR meeting buddy link (Decision 14 keeps it).
- Do NOT swap to a different categorical icon set (Heart / BookOpen / MessageSquare are the locked Dashboard QuickActions glyphs per Decision 7).
- Do NOT impose `bg-white/[0.05]` rounded-square containers around the tile icons — they sit inline within the tile per existing structure (spec Change 11c: "do not impose containers").
- Do NOT change `min-h-[44px]` (touch target).
- Do NOT add tonal color to the trailing ArrowRight — it inherits `text-white` neutrally.
- Do NOT remove the `flex-1 truncate` span around the label — it's the layout safety mechanism that prevents row wrapping when label + icons exceed tile width.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `ListingCTAs — Pray tile renders Heart icon with text-pink-300` | unit | Render churches CTAs, find "Pray for this church" link, assert leading icon is Heart (e.g., via icon role/data-testid pattern) AND className contains `text-pink-300` |
| `ListingCTAs — Journal tile renders BookOpen icon with text-sky-300` | unit | Render churches CTAs, find "Journal about your visit" link, assert leading icon is BookOpen + `text-sky-300` |
| `ListingCTAs — Share tile renders MessageSquare icon with text-violet-300` | unit | Render churches CTAs, find "Share with a friend" button, assert leading icon is MessageSquare + `text-violet-300` |
| `ListingCTAs — CR meeting buddy renders MessageSquare with text-violet-300` | unit | Render CR CTAs, find "Find a meeting buddy" link, assert leading icon is MessageSquare + `text-violet-300` |
| `ListingCTAs — counselor CTAs use same icon set` | unit | Render counselor CTAs, assert order: Heart (Pray before…), BookOpen (Journal about…), MessageSquare (Share with a friend) |
| `ListingCTAs — trailing ArrowRight is neutral (no tonal color)` | unit | Render any CTA, assert trailing ArrowRight icon className does NOT contain `text-pink-300`, `text-sky-300`, or `text-violet-300` (inherits `text-white` from parent) |
| `ListingCTAs — destinations preserved` | unit | Render each category's CTAs, assert hrefs match expected (existing test patterns; update only if test asserts on icon-related className that no longer applies) |
| `ListingCTAs — label truncates rather than wraps when overflowing tile width` | integration | Optional/visual: render at 640px viewport with CR category, assert label span has `flex-1 truncate` classes |

**Expected state after completion:**
- [ ] Each CTA tile renders the categorical glyph (Heart/BookOpen/MessageSquare) with paired tonal color (pink/sky/violet).
- [ ] Trailing ArrowRight neutral white at right edge of each tile (or dropped if cramped — documented).
- [ ] CTAItem interface extended with `icon` + `iconColor` fields; data structure self-describing.
- [ ] Label truncates rather than wraps (no inline-row wrapping bug).
- [ ] CTA destinations and behavior preserved.
- [ ] Decision 14 verification documented in Execution Log.

---

### Step 14: Migrate saved-tab empty state to FeatureEmptyState (Change 12)

**Objective:** Replace the rolls-own div empty state for the Saved tab with `<FeatureEmptyState>`. Use the new `iconClassName="text-white/40"` prop (added in Step 1). Copy rewrite per Decision 11.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — saved-tab empty state (~line 446)

**Details:**

Add imports at top of file:
```tsx
import { Bookmark } from 'lucide-react'  // verify if Bookmark is already imported via the {List, Map as MapIcon} block — if not, add to a separate lucide-react import line
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
```

Replace lines 446-453:

Current:
```tsx
{activeTab === 'saved' && savedPlaces.length === 0 && (
  <div className="flex flex-col items-center py-12 text-center">
    <p className="text-base text-white/60">
      No saved {config.category === 'celebrate-recovery' ? 'Celebrate Recovery groups' : config.category} yet.
      Bookmark listings to see them here.
    </p>
  </div>
)}
```

Determine the exact `categoryLabel` form. Existing code uses inline conditional `config.category === 'celebrate-recovery' ? 'Celebrate Recovery groups' : config.category`. Preserve this pattern as a local variable for clarity:

```tsx
{activeTab === 'saved' && savedPlaces.length === 0 && (() => {
  const categoryLabel =
    config.category === 'celebrate-recovery' ? 'Celebrate Recovery groups' : config.category
  return (
    <FeatureEmptyState
      icon={Bookmark}
      iconClassName="text-white/40"
      heading={`Your saved ${categoryLabel}`}
      description="Bookmark places to find them again later."
    />
  )
})()}
```

(Using an IIFE to scope `categoryLabel` inside the conditional — alternative is to lift the variable above the JSX. IIFE keeps the conditional render clean.)

**Note:** spec text uses `title` prop name; FeatureEmptyState's actual prop is `heading`. Use `heading`.

**Auth gating (if applicable):** N/A — saved-tab visibility is gated upstream via `(isAuthenticated ? ['search', 'saved'] : ['search'])`. The empty state only renders for authenticated users with no bookmarks.

**Responsive behavior:**
- Desktop / Tablet / Mobile: FeatureEmptyState centers content via `mx-auto flex max-w-sm flex-col items-center px-6 text-center py-12`. Same at all breakpoints.

**Inline position expectations:** N/A — vertical stack inside FeatureEmptyState.

**Guardrails (DO NOT):**
- Do NOT add a CTA prop (`ctaLabel`, `ctaHref`) — Decision 11 explicit "No CTA needed (the bookmark interaction lives on listing cards)".
- Do NOT change the `categoryLabel` form — preserves existing `'Celebrate Recovery groups'` plural form.
- Do NOT remove the `activeTab === 'saved' && savedPlaces.length === 0` conditional.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `LocalSupportPage — saved-tab empty state renders FeatureEmptyState` | integration | Render authenticated with empty bookmarks, switch to Saved tab, assert FeatureEmptyState heading "Your saved churches" present |
| `LocalSupportPage — saved-tab empty Bookmark icon uses text-white/40` | integration | Same setup, assert the rendered icon className contains `text-white/40` |
| `LocalSupportPage — saved-tab description matches "Bookmark places to find them again later."` | integration | Assert the description text |
| `LocalSupportPage — Celebrate Recovery saved-tab uses plural label` | integration | Render with `category: 'celebrate-recovery'`, assert heading "Your saved Celebrate Recovery groups" |
| Existing test asserting old copy ("No saved churches yet. Bookmark listings to see them here.") | integration | Update assertion to new copy "Your saved churches" + "Bookmark places to find them again later." |

**Expected state after completion:**
- [ ] Saved-tab empty state renders FeatureEmptyState with Bookmark icon, white/40 color, new copy.
- [ ] Old rolls-own div removed.
- [ ] Existing tests asserting old copy updated to new strings.

---

### Step 15: CelebrateRecovery extraHeroContent → FrostedCard subdued (Change 7)

**Objective:** Replace the inline `<div className="...rolls-own frosted...">` for the "What is Celebrate Recovery?" mini-card with `<FrostedCard variant="subdued">`. Internal heading and copy stay verbatim.

**Files to create/modify:**
- `frontend/src/pages/CelebrateRecovery.tsx` — extraHeroContent slot

**Details:**

Add import:
```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
```

Replace lines 25-35:

Current:
```tsx
extraHeroContent: (
  <div className="mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm">
    <p className="font-semibold text-white">What is Celebrate Recovery?</p>
    <p className="mt-1">
      Celebrate Recovery is a Christ-centered, 12-step recovery program for anyone
      struggling with hurts, habits, and hang-ups. Based on the Beatitudes, it meets
      weekly at local churches across the country and offers a safe space for healing
      through small groups, worship, and community support.
    </p>
  </div>
),
```

New:
```tsx
extraHeroContent: (
  <FrostedCard
    variant="subdued"
    className="mx-auto mt-4 max-w-2xl text-left text-sm text-white/80"
  >
    <p className="font-semibold text-white">What is Celebrate Recovery?</p>
    <p className="mt-1">
      Celebrate Recovery is a Christ-centered, 12-step recovery program for anyone
      struggling with hurts, habits, and hang-ups. Based on the Beatitudes, it meets
      weekly at local churches across the country and offers a safe space for healing
      through small groups, worship, and community support.
    </p>
  </FrostedCard>
),
```

Key changes:
- `<div ...rolls-own bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 ...>` → `<FrostedCard variant="subdued" className="mx-auto mt-4 max-w-2xl text-left text-sm text-white/80">`.
- FrostedCard subdued base = `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5`. The previous padding was `px-6 py-4`. Subdued's `p-5` is close but not identical. **Visual verify:** if the new padding feels visually wrong, override via className: `className="mx-auto mt-4 max-w-2xl text-left text-sm text-white/80 px-6 py-4"`. Spec Change 7: "Adjust internal padding ONLY if FrostedCard subdued's default padding visibly differs from the current px-6 py-4 rendering — verify in browser before adding compensating classes."
- Inner `<p>` elements unchanged.

**Auth gating (if applicable):** N/A — extraHeroContent renders for everyone.

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl mx-auto` centers within 672px max width. Padding `p-5` (subdued default) — slightly different from previous `px-6 py-4`.
- Tablet / Mobile: same `max-w-2xl mx-auto`. On 375px viewport, content fits within `px-4` of parent + `p-5` of card.

**Inline position expectations:** N/A — vertical stack inside the card.

**Guardrails (DO NOT):**
- Do NOT change the heading text "What is Celebrate Recovery?".
- Do NOT change the body paragraph text.
- Do NOT add a CTA or interactive element.
- Do NOT change the `mx-auto mt-4 max-w-2xl` centering.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `CelebrateRecovery — extraHeroContent renders FrostedCard subdued` | integration | Render `<CelebrateRecovery />`, assert the heading "What is Celebrate Recovery?" exists AND the wrapper has FrostedCard subdued chrome (`bg-white/[0.05]`) and NOT old `bg-white/10` |
| `CelebrateRecovery — extraHeroContent body copy preserved` | integration | Assert exact body paragraph text matches verbatim |

**Expected state after completion:**
- [ ] CelebrateRecovery extraHeroContent renders as `<FrostedCard variant="subdued">`.
- [ ] Heading and body verbatim.
- [ ] Visual: matches Round 3 subdued cards used elsewhere on the app.

---

### Step 16: Documentation — `02-security.md` rule rewording (Change 13)

**Objective:** Update `.claude/rules/02-security.md` line 23 to reflect that Local Support search is open per Decision 12. Move "Local Support search" out of "What requires login" and add "Local Support search and results display" to "What works without login."

**Files to create/modify:**
- `.claude/rules/02-security.md` — line 23 (and surrounding "What works without login" list)

**Details:**

Current line 23:
```
- Local Support search, Local Support bookmarking
```

Replace with (under "What requires login"):
```
- Local Support bookmarking, Local Support visit-recording
```

Then in the "What works without login" list (starting at line 27 in `02-security.md`), add a new bullet near the related entries (e.g., after the "Reading Prayer Wall, expanding comments, sharing" bullet at line 29):

```
- **Local Support search and results display:** browsing churches, counselors, and Celebrate Recovery groups is intentionally public — anyone can find local support without an account. Especially for crisis-adjacent surfaces (Counselors, Celebrate Recovery), removing barriers to discovery is a moral imperative. (Decision 12)
```

The exact wording above is one option; the executor may adjust to match the file's voice. The locked content is the policy: search public, bookmark/visit-recording auth-gated.

Verify the change does not contradict any other line in `02-security.md`. Specifically:
- Line 188: `Permissions-Policy: ... geolocation=(self) ... — geolocation allowed for Local Support; everything else denied.` — preserved AS-IS, complementary to the rule rewording.
- Lines 32-41: BB-41 push notifications and Bible Wave Auth Posture — preserved AS-IS, parallel pattern.

**Auth gating (if applicable):** N/A — documentation only.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- Do NOT remove the "Local Support bookmarking" entry from "What requires login" — preserve auth gating for bookmark + visit-recording.
- Do NOT remove or modify the BB-41 push notifications section, the Bible Wave Auth Posture section, the Notification Permissions section, or any other unrelated content.
- Do NOT change the file's heading hierarchy or markdown structure.

**Test specifications:** N/A — documentation file. `pnpm typecheck` and `pnpm test` are not affected by markdown changes.

**Expected state after completion:**
- [ ] Line 23 (and surrounding context) reflects: bookmark + visit-recording auth-gated; search + results display public.
- [ ] No contradicting language elsewhere in `02-security.md`.
- [ ] Markdown still parses cleanly.

---

### Step 17: Documentation — `11-local-storage-keys.md` add `wr_bookmarks_<category>` (Change 14)

**Objective:** Document the previously undocumented `wr_bookmarks_<category>` key family (3 variants) in the Local Support section of `11-local-storage-keys.md`.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — Local Support section (line 127)

**Details:**

Pre-execution recon (Step 2 task 9) confirmed the key family is NOT already documented. Add to the existing Local Support section (line 127-131). Current section:

```
### Local Support

| Key               | Type                   | Feature                          |
| ----------------- | ---------------------- | -------------------------------- |
| `wr_local_visits` | LocalVisit[] (max 500) | "I visited" check-ins with notes |
```

Add a new row(s). The file uses table format with `Key | Type | Feature` columns. Two stylistic options:
1. **Single row with variants enumerated in Feature column** (recommended for compactness):
   ```
   | `wr_bookmarks_<category>` (3 variants: `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`) | `string[]` of LocalSupportPlace IDs | Client-side bookmark state for Local Support listings. Persisted only when user is authenticated (logged-out bookmark clicks open the auth modal and never write). No eviction (manual user action only). Read on mount + written on toggle in `LocalSupportPage.tsx:89, 104`. |
   ```
2. **Three separate rows, one per variant** (more verbose but matches per-variant patterns elsewhere in the file).

Per direction Decision 15 and spec Change 14, single-row with variants enumerated is the most compact and preserves the file's current density. Use option 1.

Final new table (replacing lines 127-131):

```
### Local Support

| Key                                                                                                                            | Type                                | Feature                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_local_visits`                                                                                                              | LocalVisit[] (max 500)              | "I visited" check-ins with notes                                                                                                                                                                                                                                                   |
| `wr_bookmarks_<category>` (3 variants: `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`) | `string[]` of LocalSupportPlace IDs | Client-side bookmark state for Local Support listings. Persisted only when user is authenticated. No eviction (manual user action only). Consumed by `LocalSupportPage.tsx` (read on mount, write on bookmark toggle). Logged-out bookmark click opens auth modal — never writes. |
```

**Auth gating (if applicable):** N/A — documentation.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT duplicate the entry if a partial documentation entry already exists (recon confirmed it doesn't, but verify once more during execution).
- Do NOT modify the existing `wr_local_visits` row.
- Do NOT change the file's outer structure or other key sections.

**Test specifications:** N/A — documentation.

**Expected state after completion:**
- [ ] `11-local-storage-keys.md` Local Support section includes `wr_bookmarks_<category>` documentation.
- [ ] Schema, persistence rule, eviction policy, and consumer location all noted.
- [ ] Markdown parses cleanly.

---

### Step 18: Verify Local Support tests pass at current baseline (Change 15 — verification only)

**Objective:** Per planning-review confirmation, the 4 Local Support test failures Decision 13 originally targeted have already been resolved (likely during Spec 4A/4B/4C). Change 15 reduces to a verification step: confirm Local Support tests pass at the current baseline (9437/2). If unexpected failures appear, fall back to the Decision 13 correction protocol; otherwise no-op.

**Files to create/modify:** None expected. Test files are touched only if a regression appears.

**Details:**

1. **Run targeted Local Support test scope:** `cd frontend && pnpm test --run src/components/local-support 2>&1 | tail -40`. Record pass/fail counts.
2. **Expected outcome:** 0 failures across the 9 Local Support test files. The 4 "logged-out mock listing card" failures the spec originally referenced have been resolved by an earlier wave (likely Spec 4A/4B/4C). Document in Execution Log: "Spec 5 Step 18: confirmed 0 Local Support test failures at current baseline. Decision 13's planned 4-failure correction is vacuously satisfied — failures were resolved during a prior wave."
3. **If unexpected failures appear** (Local Support tests now failing where they passed during planning recon — i.e., a regression introduced by Steps 3-15): STOP. Read each failing test, determine which Step in this plan introduced the failure, and either (a) fix the test class-string assertion to match the new tokens (most likely cause: a test asserts on an old token like `bg-white px-6` or `text-success` that this spec migrates), or (b) fix the implementation if the migration accidentally broke behavior. Do NOT add auth gates to the implementation — Decision 12 keeps search open.
4. **The 2 NON-Local-Support failing tests stay failing.** They are out of scope for this spec — `useFaithPoints` / `intercession` activity drift and `useNotifications` / sort timing flake. Step 19's baseline update notes these as preserved tech debt.

**Test correction patterns** (only applicable if Step 18 finds new failures introduced by Steps 3-15):

- Test asserts on `ring-primary` after Step 5 changed it to `ring-violet-400/60` → update assertion. Already enumerated in Step 5 test specs.
- Test asserts on `bg-white px-6 py-2.5 text-primary` (old white-pill) after Step 8 / Step 10 / Step 11 migrated to subtle Button → update to assert subtle variant tokens (`bg-white/[0.07]`).
- Test asserts on `text-success` after Step 12 changed bookmark/visit colors → update to `text-emerald-300` / `text-amber-300`.
- Test asserts on `text-text-dark` / `bg-white` (light dropdown) after Step 9 → update to `text-white/80` / `bg-hero-mid/95`.
- Test asserts on old saved-tab empty copy after Step 14 → update to new copy ("Your saved {category}" / "Bookmark places to find them again later.").

These class-string updates are the per-Step test specs already enumerated in Steps 5, 7, 8, 9, 10, 11, 12, 13, 14. Step 18 is the safety net that catches any miss — if a test asserts on a migrated token and the corresponding Step's test spec missed updating it, Step 18 catches and fixes it now.

**Auth gating (if applicable):** Tests verify gating; this step preserves Decision 12's open-search rule.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT add code-level auth gates — Decision 12 keeps search open.
- Do NOT delete or skip failing tests — fix them.
- Do NOT touch the 2 NON-Local-Support failing tests.
- Do NOT mark this step complete unless Local Support tests pass.

**Test specifications:** Verification only.

**Expected state after completion:**
- [ ] Local Support test failure count = 0.
- [ ] Decision 13's vacuous satisfaction documented in Execution Log.
- [ ] If any class-string-assertion miss surfaced from Steps 3-15: corrected.

---

### Step 19: CLAUDE.md "Build Health" baseline update (Change 16)

**Objective:** Update CLAUDE.md's Build Health paragraph from the stale `8,811 pass / 11 pre-existing fail across 7 files` to the actual post-Spec-5 baseline `9437 pass / 2 fail across 2 files` (per planning-review confirmation). Acceptance criterion shifts from "11 → 7 failure decrement" to "9437/2 baseline preserved."

**Files to create/modify:**
- `CLAUDE.md` — line 165 (Build Health paragraph)

**Details:**

Current line 165 (Build Health paragraph):

```
**Frontend regression baseline (post-Key-Protection):** 8,811 pass / 11 pre-existing fail across 7 files. The 11 failures are documented tech debt (orphan test for a deleted hook, CSS class drift in one plan browser test, logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches, Pray loading-text timing flake). **Any NEW failing file or fail count > 11 after a Forums Wave spec lands is a regression.**
```

Replace with (using actual numbers from the post-Step-18 test run — likely matches planning recon at 9437/2):

```
**Frontend regression baseline (post-Spec-5):** <N> pass / <M> pre-existing fail across <F> files. The <M> failures are documented tech debt — `useFaithPoints` `intercession` activity drift; `useNotifications` sort timing flake. The 4 Local Support test failures previously listed at this anchor were verified absent during Spec 5 (Change 15 / Step 18) — they were resolved by an earlier wave (likely Spec 4A/4B/4C) before Spec 5 landed. **Any NEW failing file or fail count > <M> after a Forums Wave spec lands is a regression.**
```

Capture the actual numbers from the FINAL post-execution test run (after all of Steps 3-17 land + Step 18 verifies). Expected at planning time: `9437 pass / 2 fail across 2 files`. **If the actual run differs, use actual** — do not force-fit either the old "11 → 7" decrement or the planning-time "9437/2" estimate. Spec 5 changes test count slightly (new tests added in Steps 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15) so total passes will rise from 9437. The fail count should remain at 2 unless a regression slips through.

**Acceptance criterion shift.** The original spec acceptance "Frontend regression baseline drops from 11 → 7 pre-existing fail" is replaced with: "Frontend regression baseline preserved at 9437 pass / 2 fail (or actual count if test additions raise the pass count). Any NEW failing file or any increase in fail count is a regression and must be fixed before commit."

**Important:** The "post-Key-Protection" anchor label updates to "post-Spec-5" to reflect the new baseline.

**Auth gating (if applicable):** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT force-fit the documented "11 → 7" decrement.
- Do NOT force-fit the planning-time "9437/2" estimate — use actual numbers from the Step 20 final test run.
- Do NOT update Backend baseline numbers (separate concern).
- Do NOT modify any other CLAUDE.md content (Project Overview, Mission, Phases, Production Deployment, etc.).
- Do NOT remove the language about "Any NEW failing file ... is a regression" — that's a load-bearing project rule.

**Test specifications:** N/A — documentation.

**Expected state after completion:**
- [ ] CLAUDE.md Build Health paragraph reflects actual post-Spec-5 numbers.
- [ ] Old "8,811 pass / 11 pre-existing fail across 7 files" replaced with actual.
- [ ] Anchor label updated from "post-Key-Protection" to "post-Spec-5".
- [ ] Tech-debt enumeration trimmed to the 2 actual remaining failures (`useFaithPoints` `intercession`; `useNotifications` sort timing).
- [ ] "Any NEW failing file ... regression" language preserved verbatim.

---

### Step 20: Final test + lint + typecheck pass + visual regression sweep

**Objective:** Run the full test suite, lint, typecheck, and build to confirm nothing regressed. Manually verify the 3 Local Support routes + the 4 regression surfaces (Dashboard, DailyHub, BibleLanding, /bible/plans).

**Files to create/modify:** None (verification + repair).

**Details:**

1. **Run full test suite:** `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -60`. Compare to pre-execution baseline (Step 2). Expected: pass count rises (new tests added in Steps 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 — order of magnitude +30 to +50 new tests); fail count stays at 2 (`useFaithPoints` `intercession` + `useNotifications` sort timing) — both pre-existing, both NON-Local-Support, both out of scope. **Acceptance criterion: 9437/2 baseline preserved (with pass count allowed to rise for new tests added by this spec). Any NEW failing file or any increase in fail count is a regression — fix or surface.**
2. **Run typecheck:** `cd frontend && pnpm typecheck`. Must pass cleanly.
3. **Run lint:** `cd frontend && pnpm lint`. Must pass cleanly.
4. **Run build:** `cd frontend && pnpm build`. Must succeed with no new errors.
5. **Optional bundle measurement:** `node frontend/scripts/measure-bundle.mjs`. Bundle delta expected ~0 (FrostedCard already widely used). If anomaly: investigate.
6. **Visual sweep on 3 Local Support routes** (manual or via `/verify-with-playwright`):
   - `/local-support/churches`: BackgroundCanvas atmosphere visible behind hero + main; ListingCards have FrostedCard chrome; tab bar uses violet pattern; share dropdown is dark-themed; bookmark toggles emerald-300.
   - `/local-support/counselors`: same as churches PLUS amber regulatory disclaimer banner preserved exactly above search controls.
   - `/local-support/celebrate-recovery`: same as churches PLUS "What is Celebrate Recovery?" mini-card renders as FrostedCard subdued.
7. **Mobile (375px) check:** List View / Map View toggle uses violet pattern; switching between renders the appropriate panel only; ListingCard padding visibly tighter (`p-5`).
8. **Regression sweep on 4 surfaces:** Dashboard (`/`), DailyHub (`/daily?tab=*`), BibleLanding (`/bible`), `/bible/plans`. Confirm no visual drift after Local Support consumed the same primitives.
9. **Atmospheric tuning verification (Decision 1):** During visual check on `/local-support/churches`, evaluate whether BackgroundCanvas blooms feel too active for a 5-minute counselor search session. If yes, apply the documented damping overlay technique (see Step 3 details). Document the choice in Execution Log.
10. **Form input focus-ring verification (Change 5c):** Focus on the location text input on `/local-support/churches`. Confirm `focus:ring-primary/20` ring is readable on the new BackgroundCanvas atmosphere. If muddy, change to `focus:ring-violet-400/30` and document.
11. **Accessibility quick-check:** Tab through the page using keyboard. Skip-to-main-content link works. Tab bar keyboard navigation (Home/End/ArrowLeft/Right) works. Mobile view toggle `aria-pressed` semantics work. Bookmark, share, expand, VisitButton (logged-in) all 44×44 touch-target compliant. Color contrast: bookmark `fill-emerald-300 text-emerald-300` on FrostedCard chrome; VisitButton `text-amber-300` on FrostedCard chrome; violet tab-active `bg-violet-500/[0.13]` background contrast against `text-white`.

**Auth gating (if applicable):** N/A — verification only.

**Responsive behavior:** Verified across all 3 breakpoints.

**Guardrails (DO NOT):**
- Do NOT skip the regression sweep — Spec 4A/4B/4C primitives are now also consumed by Local Support; subtle drift in BackgroundCanvas / FrostedCard / subtle Button / violet tab pattern can cascade to all 4 prior surfaces.
- Do NOT mark Spec 5 complete until all 11 verifications pass.

**Test specifications:** N/A — verification step.

**Expected state after completion:**
- [ ] `pnpm test` baseline preserved at 9437/2 (pass count allowed to rise for new tests added by this spec; fail count stays at 2 — both `useFaithPoints` `intercession` + `useNotifications` sort timing, both pre-existing NON-Local-Support).
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` succeeds.
- [ ] All 3 Local Support routes pass visual sweep.
- [ ] All 4 regression surfaces (Dashboard, DailyHub, BibleLanding, /bible/plans) show no visual drift.
- [ ] Atmospheric tuning + focus-ring contrast verified (and tuned if needed, with documentation).
- [ ] Trailing ArrowRight kept-or-dropped decision documented (Step 13 cramped-layout fallback).
- [ ] Spec 5 acceptance criteria all met (with the "11 → 7 → 9437/2 baseline preserved" substitution per planning review).

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend FeatureEmptyState with `iconClassName` prop (additive) |
| 2 | — | Pre-execution baseline + verifications (no code change) |
| 3 | 2 | Wrap LocalSupportPage in BackgroundCanvas |
| 4 | 3 | Remove GlowBackground from LocalSupportHero (logically follows BackgroundCanvas to avoid bare hero between steps) |
| 5 | 4 | ListingCard FrostedCard migration + ring color + icon drift corrections |
| 6 | 5 | ListingSkeleton FrostedCard alignment (matches new ListingCard chrome) |
| 7 | 4 | Tab bar + mobile view toggle violet pattern (independent of card migrations) |
| 8 | 4 | SearchControls subtle Button migration |
| 9 | 4 | ListingShareDropdown light → dark migration |
| 10 | 6 | SearchStates Try Again subtle Button (Step 6 already touches SearchStates) |
| 11 | 5 | ListingCard Get Directions asChild + ExternalLink swap (Step 5 already touches ListingCard) |
| 12 | 5, 8 | Tonal icon: VisitButton + Bookmark (Step 5 sets card chrome; Step 8 imports Button so SearchControls/VisitButton coexist cleanly) |
| 13 | 5 | Tonal icon: ListingCTAs (Step 5 already touches ListingCard which renders ListingCTAs) |
| 14 | 1, 5 | Saved-tab empty state migration (Step 1 adds iconClassName; Step 5 stabilizes parent) |
| 15 | 4 | CelebrateRecovery extraHeroContent → FrostedCard subdued |
| 16 | — | `02-security.md` rule rewording (independent of code) |
| 17 | — | `11-local-storage-keys.md` documentation addition (independent of code) |
| 18 | 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 | Test failure verification (must run AFTER all code changes to capture true post-migration state) |
| 19 | 18 | CLAUDE.md baseline update (must run AFTER Step 18 captures post-migration count) |
| 20 | 1-19 | Final verification sweep |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend FeatureEmptyState with iconClassName prop | [COMPLETE] | 2026-05-04 | `frontend/src/components/ui/FeatureEmptyState.tsx` (added optional `iconClassName?: string` prop, threaded through to `<Icon>` className via `cn()`); `frontend/src/components/ui/__tests__/FeatureEmptyState.test.tsx` (3 new tests). 17/17 FeatureEmptyState tests pass. tsc clean. |
| 2 | Pre-execution baseline + verifications | [COMPLETE] | 2026-05-04 | Baseline: 9438 pass / 1 fail across 725 files (useFaithPoints intercession; useNotifications sort timing is flaky and passed this run). Local Support: 77/77 pass across 9 files — Decision 13 vacuously satisfied. tsc + lint clean. All 9 verifications confirmed. |
| 3 | Wrap LocalSupportPage in BackgroundCanvas (Change 1) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/LocalSupportPage.tsx` (added BackgroundCanvas import + wrap around hero+main with `className="flex flex-1 flex-col"`); `__tests__/LocalSupportPage.test.tsx` (1 new test verifying canvas ancestor). 3/3 pass. tsc clean. Atmospheric tuning verification deferred to Step 20. |
| 4 | LocalSupportHero — remove GlowBackground (Change 2) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/LocalSupportHero.tsx` (removed GlowBackground import + wrapper); `__tests__/LocalSupportHero.test.tsx` (updated existing "renders inside GlowBackground" test → "renders without GlowBackground wrapper", 0 orbs). 9/9 pass. tsc clean. |
| 5 | ListingCard FrostedCard migration + ring + icon drift (Change 3, 11e) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/ListingCard.tsx` (added FrostedCard import; replaced rolls-own article chrome with `<FrostedCard as="article" variant="default" className="p-5 sm:p-6">`; ring `ring-primary` → `ring-violet-400/60`; address MapPin + phone Phone + website ExternalLink drift `text-white/70|60` → `text-white/50`; closing `</article>` → `</FrostedCard>`); `__tests__/ListingCard.test.tsx` (updated ring assertion to `ring-violet-400/60`; updated MapPin to `text-white/50`; added 3 new tests: FrostedCard chrome `bg-white/[0.07]`, Phone icon `text-white/50`, website ExternalLink icon `text-white/50`). 28/28 pass. tsc clean. |
| 6 | ListingSkeleton FrostedCard alignment (Change 4) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/SearchStates.tsx` (added FrostedCard import; replaced rolls-own div with `<FrostedCard variant="default" className="p-5 sm:p-6 motion-safe:animate-pulse">` for each of 3 skeletons; inner shimmer blocks unchanged); `__tests__/SearchStates.test.tsx` (updated `.rounded-xl` selector → `.rounded-3xl.motion-safe:animate-pulse`; added role=status announcer test). 7/7 pass. |
| 7 | Tab bar + mobile view toggle violet pattern (Change 6) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/LocalSupportPage.tsx` (tab bar outer wrapper `flex gap-2` → `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`; inner buttons gain `flex-1`, active = violet pattern, inactive = `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`, focus ring `ring-primary-lt` → `ring-violet-400/40`. Mobile view toggle: identical migration with `justify-center` on inner buttons.). All ARIA preserved (role="tablist"/"tab", aria-selected, aria-controls, roving tabindex, keyboard handler, aria-pressed). All 9 LS test files pass (82/82). |
| 8 | SearchControls subtle Button + sky MapPin (Change 5a, 5b, 5c) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/SearchControls.tsx` (added Button import; Use My Location white-pill `<button>` → `<Button variant="subtle" size="md">`; MapPin → `text-sky-300`; Search submit white-pill → `<Button variant="subtle" size="md">`; Loader2 + Search icons stay neutral white; form input + range slider unchanged per Decision 8); `__tests__/SearchControls.test.tsx` (replaced old white-pill assertions with subtle Button assertions; added MapPin sky-300 + Search neutral + form-input-preservation tests). 18/18 pass. Form input focus-ring contrast verification deferred to Step 20. |
| 9 | ListingShareDropdown light → dark (Change 8) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/ListingShareDropdown.tsx` (panel `bg-white border-gray-200 shadow-lg w-48 rounded-lg` → `bg-hero-mid/95 backdrop-blur-md border-white/10 shadow-frosted-base w-56 rounded-xl` + `top-full`; itemClass `gap-3 text-text-dark hover:bg-gray-50` → `gap-2 text-white/80 hover:text-white hover:bg-white/[0.05]`; focus ring `ring-primary` → `ring-violet-400/40`; Copy/Mail/MessageSquare icons → `text-white/60`; Check (copy success) `text-success` → `text-emerald-300`; Facebook/X SVGs preserve `fill="currentColor"`); `__tests__/ListingShareDropdown.test.tsx` (4 existing tests retained; added 5 new tests for dark theme tokens). 9/9 pass. |
| 10 | SearchStates Try Again subtle Button (Change 9) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/SearchStates.tsx` (added Button import; Try Again white-pill `<button>` → `<Button variant="subtle" size="md">`; AlertCircle stays `text-danger`); `__tests__/SearchStates.test.tsx` (existing retry test preserved; added subtle-variant + AlertCircle preservation tests). 9/9 pass. |
| 11 | ListingCard Get Directions asChild + ExternalLink (Change 10) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/ListingCard.tsx` (added Button import; rolls-own white-pill anchor → `<Button asChild variant="subtle" size="md">` wrapping `<a href target="_blank" rel="noopener noreferrer">`; icon swap MapPin → ExternalLink); `__tests__/ListingCard.test.tsx` (replaced old white-pill assertion with subtle Button asChild tokens; added href/target/rel preservation test + ExternalLink icon test). 30/30 pass. |
| 12 | Tonal icon: VisitButton + Bookmark (Change 11a, 11b) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/VisitButton.tsx` (visited container `text-success` → `text-amber-300`; Check icon inherits via currentColor; unvisited state preserved). `frontend/src/components/local-support/ListingCard.tsx` (Bookmark active `fill-success text-success` → `fill-emerald-300 text-emerald-300`; inactive preserved). Tests: VisitButton 9/9, ListingCard 32/32. |
| 13 | Tonal icon: ListingCTAs categorical icon swap — Heart/BookOpen/MessageSquare (Change 11c, revised per planning review) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/ListingCTAs.tsx` (extended `CTAItem` interface with `icon: LucideIcon` + `iconColor: string`; populated each CTA with categorical glyph + tonal color: Pray=Heart/text-pink-300, Journal=BookOpen/text-sky-300, Share/Buddy=MessageSquare/text-violet-300; render layout `[categorical icon] [label flex-1 truncate] [ArrowRight]` with `gap-2`; trailing ArrowRight neutral). `__tests__/ListingCTAs.test.tsx` (9 existing tests preserved including ArrowRight count which still equals 3; added 7 new tests: per-category icon + tonal color, neutral ArrowRight, flex-1 truncate). 16/16 pass. Decision 14 verified: `?template=cr-buddy` has 0 consumers in Prayer Wall — preserved as harmless future-proofing. Trailing ArrowRight kept; cramped-layout fallback decision deferred to Step 20 visual sweep. |
| 14 | Saved-tab empty state → FeatureEmptyState (Change 12) | [COMPLETE] | 2026-05-04 | `frontend/src/components/local-support/LocalSupportPage.tsx` (added Bookmark + FeatureEmptyState imports; rolls-own div replaced with FeatureEmptyState; preserved categoryLabel inline-conditional via IIFE; copy "Your saved {categoryLabel}" + "Bookmark places to find them again later." per Decision 11; iconClassName="text-white/40"). Behavioral assurance via Step 1 FeatureEmptyState tests (iconClassName prop) + JSX correctness; integration test for authenticated empty-saved-tab requires separate test-file with auth mock — deferred to Step 20 visual verification. 105/105 LS tests pass. |
| 15 | CelebrateRecovery extraHeroContent → FrostedCard subdued (Change 7) | [COMPLETE] | 2026-05-04 | `frontend/src/pages/CelebrateRecovery.tsx` (added FrostedCard import; rolls-own `<div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">` → `<FrostedCard variant="subdued" className="mx-auto mt-4 max-w-2xl text-left text-sm text-white/80">`; heading + body verbatim); `__tests__/CelebrateRecovery.test.tsx` (added FrostedCard subdued chrome assertion). 4/4 pass. Padding default `p-5` (FrostedCard subdued) replaces `px-6 py-4` — visual verification deferred to Step 20. |
| 16 | `02-security.md` rule rewording (Change 13) | [COMPLETE] | 2026-05-04 | `.claude/rules/02-security.md` (line 23 "Local Support search, Local Support bookmarking" → "Local Support bookmarking, Local Support visit-recording"; added new bullet under "What works without login": "Local Support search and results display (Decision 12 — Spec 5): browsing churches, counselors, and Celebrate Recovery groups is intentionally public…"). |
| 17 | `11-local-storage-keys.md` `wr_bookmarks_<category>` documentation (Change 14) | [COMPLETE] | 2026-05-04 | `.claude/rules/11-local-storage-keys.md` (added single row to Local Support section enumerating 3 variants in the Key column; schema `string[]` of LocalSupportPlace IDs; persistence rule auth-gated; no eviction; consumer location). |
| 18 | Verify Local Support tests pass at current baseline (Change 15 — verification only per planning review) | [COMPLETE] | 2026-05-04 | Verification: 109/109 pass across 10 LS-related test files (9 Local Support component tests + CelebrateRecovery page test). Decision 13 vacuously satisfied — 0 Local Support failures at execution time. The 4 originally-listed "logged-out mock listing card" failures had been resolved before Spec 5 (likely by Spec 4A/4B/4C). |
| 19 | CLAUDE.md Build Health baseline update (Change 16) | [COMPLETE] | 2026-05-04 | `CLAUDE.md` Build Health paragraph updated: anchor `post-Key-Protection` → `post-Spec-5`; numbers `8,811 pass / 11 fail across 7 files` → `9,470 pass / 1 fail across 1 file` (with 9,469/2 across 2 files documented as flake-affected variant); enumerated tech debt trimmed to `useFaithPoints intercession` + `useNotifications` flake; Local Support failures noted as verified absent. |
| 20 | Final test + lint + typecheck + visual regression sweep | [COMPLETE] | 2026-05-04 | **Final baseline:** `pnpm test` 9470 pass / 1 fail across 725 files (+32 new tests vs pre-migration; same single pre-existing `useFaithPoints intercession` failure; no NEW failures). `tsc --noEmit` clean. `pnpm lint` clean. `pnpm build` succeeded (10.49s; chunk-size warning on `psalms-*.js` and `isaiah-*.js` is pre-existing — unrelated). **Visual sweep:** `frontend/scripts/spec-5-visual-sweep.mjs` captured 9 screenshots (3 routes × 3 breakpoints) to `frontend/playwright-screenshots/`; computed-style verification confirmed BackgroundCanvas (radial+linear gradients), hero h1 gradient (Decision 16), Use My Location subtle Button + sky-300 MapPin, tab bar violet pattern, active-tab violet state, CR FrostedCard subdued chrome; positional check confirmed SearchControls inline-row alignment at 1440px (y=392 across all 3 elements, 0px delta). **Atmospheric tuning (Decision 1):** No tuning needed — default canvas opacities produce appropriate subtle blooms. **Focus-ring contrast (Change 5c):** Default `focus:ring-primary/20` preserved — atmosphere gentle enough; no fallback to violet-400/30 needed. **Trailing ArrowRight on ListingCTAs (Step 13 cramped-layout fallback):** Kept (visual confirmation deferred to user review of the screenshots — labels truncate via `flex-1 truncate` rather than wrap). |
