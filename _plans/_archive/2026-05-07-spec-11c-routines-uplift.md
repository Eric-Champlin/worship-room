# Implementation Plan: Spec 11c — RoutinesPage Atmospheric Uplift

**Spec:** `_specs/spec-11c-routines-uplift.md`
**Date:** 2026-05-07
**Branch:** `forums-wave-continued`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — 1125 lines)
**Recon Report:** `_plans/recon/routines-redesign-2026-05-06.md` (loaded — 783 lines)
**Master Spec Plan:** N/A — Spec 11c is a self-contained Music-cluster polish spec following 11A + 11B + 6-patch round (no overarching master plan; reads master visual rules from `09-design-system.md`).

---

## Affected Frontend Routes

- `/music/routines`

No new routes. No `App.tsx` route-level changes.

---

## Architecture Context

### Files this spec touches (production)

- `frontend/src/pages/RoutinesPage.tsx` (234 lines) — Steps 1, 2, 3, 4, 5
- `frontend/src/components/music/RoutineCard.tsx` (233 lines) — Steps 6, 7, 8, 9, 10, 11
- `frontend/src/services/storage-service.ts` (357 lines) — Step 10 (favorites read/write)
- `frontend/src/types/storage.ts` (52 lines) — Step 10 (no schema changes; the spec's "add `wr_routine_favorites` constant" lives in `services/storage-service.ts` `KEYS` map, since `types/storage.ts` carries types only — see "Pre-execution clarifications" below)

### Files this spec touches (tests)

- `frontend/src/pages/__tests__/RoutinesPage.test.tsx` (444 lines, exists post-6-patch) — extend
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` (88 lines, exists post-11B) — extend
- `frontend/src/services/__tests__/storage-service.test.ts` (390 lines, exists) — extend

### Files this spec does NOT touch (read-only consumers / out of scope)

- `RoutineBuilder.tsx` / `ContentPicker.tsx` / `DeleteRoutineDialog.tsx` / `RoutineStepCard.tsx` (Decision 14)
- `AudioProvider.tsx` / `audioReducer.ts` / `lib/audio-engine.ts` (Decision 24 — read-only)
- `hooks/useRoutinePlayer.ts` (read-only consumer of `startRoutine` / `endRoutine`)
- `data/music/routines.ts` (4 templates — content unchanged)
- `data/scenes.ts` and `data/scene-backgrounds.ts` (read-only consumers via `SCENE_BY_ID`)

### Pre-execution clarifications (verified during reconnaissance)

- **`SCENE_BY_ID` lives in `frontend/src/data/scenes.ts`** as `new Map<string, ScenePreset>(...)` — NOT in `data/scene-backgrounds.ts` as the spec says. Recon confirmed via `grep -rn 'SCENE_BY_ID' frontend/src/` (used by 7 components/hooks today). The scene-backgrounds module exports `SCENE_BACKGROUNDS: Record<string, CSSProperties>` (richer multi-stop CSSProperties for full-card scene tiles); for a 1px strip, the simpler `themeColor` field on `ScenePreset` is correct.
- **`ScenePreset` exposes `themeColor?: string`** (verified at `types/music.ts:77`). Used today by RoutineBuilder and EveningReflection. Hex value (e.g., `#3c4531`, `#356060`). Spec's gradient derivation in Step 7b uses this.
- **`storageService` is exported as a singleton** of type `StorageService` (interface) in `services/storage-service.ts`. Adding favorites methods requires updating BOTH the `StorageService` interface AND the `LocalStorageService` class. The plan addresses both.
- **Storage key constant location:** `KEYS` map lives at `services/storage-service.ts:12-18` (NOT in `types/storage.ts`, which the spec refers to). The new `routineFavorites: 'wr_routine_favorites'` line goes in the `KEYS` map. `types/storage.ts` is types-only and gets no edit (the spec's mention of `types/storage.ts` for the key constant is a minor recon error; the plan corrects it).
- **`useAudioState()` already imported in RoutinesPage.tsx:16** (verified — `audioState` already in scope, confirming Spec Step 5's claim).
- **`useAuth()` returns `{ user, isAuthenticated, ... }`** where `user.name` is the display name (verified at `pages/Insights.tsx:164`+ and `contexts/AuthContext.tsx:103-115`).
- **Mocking convention in RoutinesPage.test.tsx:** `vi.mock('@/components/audio/AudioProvider', ...)` already exposes `mockActiveRoutine` (line 16-17, 54). New tests in Step 5 reuse this. The mock for `vi.mock('@/services/storage-service', ...)` already exists (line 62-71); new favorites methods need to be added to the mock object so RoutineCard renders without error inside RoutinesPage tests.
- **The current Start CTA on RoutineCard is Pattern 2 chrome** (`px-8 py-3.5 text-base sm:text-lg`) — Spec 11B's Step 7 migrated it to white-pill. Spec 11c quiets it back. Existing test at `RoutineCard.test.tsx:39` ("Start CTA uses white-pill Pattern 2 chrome") will need its assertions adjusted in Step 9 since Pattern 2 sizing is being downgraded.
- **Storage tests do NOT use `setAuthState(true)` for favorites.** Reading the spec's Step 10e example carefully: the favorites API is intentionally NOT auth-gated at the service layer (unlike `saveRoutine`, `getRoutines`, etc.). Auth gating happens at the component layer (Step 10d's `handleFavoriteToggle`). This is a deliberate design: the persistence module is pure; the component decides who's allowed to call it. The plan follows this verbatim.
- **Spec's recommended batching:** Steps 1+2+3+4+5 as one RoutinesPage edit pass; Step 10's storage-service edits as one pass; Steps 6+7+8+9+10's RoutineCard side + Step 11 as one RoutineCard pass. Documented in the Step Dependency Map.

### Patterns to follow

- **Adaptive pre-h1 greeting (Insights idiom):** `pages/Insights.tsx:173-180` — the `useMemo` derivation of `greeting` (time-of-day) plus `greetingDisplay` (`user ? \`${greeting}, ${user.name}!\` : \`${greeting}!\``). Spec 11c adapts this pattern, but with three states based on auth + activeRoutine + hasUserRoutines, and **NO exclamation points** in any copy variant (per Spec Step 2 guardrails — anti-pressure tone).
- **Section eyebrow violet leading dot (Tier 1 FrostedCard accent variant):** `09-design-system.md` § "FrostedCard Tier System" / "Eyebrow distinction (DailyHub 2)" documents the dot signature. Class string from spec Step 4 verbatim.
- **Per-type tint palette:** `RoutineStepCard.tsx:9-13` — `BORDER_COLOR_MAP` uses `border-glow-cyan`, `border-amber-400`, `border-primary-lt`. Spec 11c reuses these as `bg-{color}/15` and `text-{color}` for step icon containers/glyphs.
- **BibleSleepSection top-strip idiom:** `components/audio/BibleSleepSection.tsx:55` — `<div className="h-1 bg-gradient-to-r from-amber-500 to-purple-600" />`. Spec 11c adapts per-routine via `SCENE_BY_ID.get(contentId)?.themeColor`.
- **TonightScripture-style centerpiece border:** `border-2 border-primary/40` is the centerpiece signal (spec Step 8 uses `border border-primary/40` — single-thickness preserves card weight).
- **Storage service patterns:** `services/storage-service.ts:272-328` (`getRoutines` / `saveRoutine` / `updateRoutine`) — same `readJSON` / `writeJSON` helpers, same `console.warn` defensive logging on shape mismatch.

### Test patterns to match

- **Mock surface:** Both `RoutinesPage.test.tsx` and `RoutineCard.test.tsx` mock `useAuth`, `useAuthModal`, `useToast`, `useAudioState`, `useRoutinePlayer`, and `storageService` directly via `vi.mock(...)`. New tests extend the same mock objects (mutating module-level let variables like `mockIsAuthenticated`, `mockActiveRoutine`, `mockOpenAuthModal`).
- **Provider wrapping:** RoutinesPage tests use `<MemoryRouter>` only (no AuthModalProvider, no ToastProvider — those are mocked). RoutineCard tests render bare (no router needed).
- **Storage service tests:** Direct `LocalStorageService` instantiation with `localStorage.clear()` in `beforeEach`. Spec's favorites tests use `storageService` (the singleton) instead — verify which is preferred when extending. Plan defaults to `LocalStorageService` instances for parity with existing tests, with a small wrapper deviation noted in Step 10e if the spec verbatim doesn't compile cleanly.

### Auth gating patterns

The standard pattern in this codebase: component reads `isAuthenticated` from `useAuth()`, calls `authModal.openAuthModal('Sign in to <action>')` on auth-gated actions when not authed, otherwise proceeds. Service-layer methods either:
1. Throw via `requireAuth(action)` (write methods on auth-gated data), or
2. Return safe defaults when not authed (e.g., `getRoutines` returns `[]`)

The spec deliberately keeps the new favorites service methods un-gated at the service layer (component handles the gate). This is consistent with the spec's intent — the favorites API is a thin persistence layer the component fully controls.

### Cross-spec dependencies

None. Spec 11c is the third spec in the Music-cluster atmospheric-polish series (11A + 11B + 6-patch round) and depends on their post-merge state being on `forums-wave-continued`. The Pre-Execution Checklist verifies this.

---

## Auth Gating Checklist

Every action in the spec that requires login must have an auth check in the plan. Verified against spec § "Auth gating checklist":

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Tap Start on a template | NO | Step 9 (preserves existing handler in `RoutineCard.tsx:65-71`) | (Service-side `useRoutinePlayer.startRoutine()` runs for both auth states; logged-out users still receive the routine player flow) |
| Tap Start on a user routine | YES | Preserved by existing handler (`RoutineCard.tsx:66-69`) | `useAuthModal.openAuthModal('Sign in to use bedtime routines')` if `!isAuthenticated` |
| Tap Create Routine | YES | Preserved (RoutinesPage.tsx:40-47) | `authModal.openAuthModal('Sign in to create bedtime routines')` if `!isAuthenticated` |
| Tap kebab → Edit / Duplicate / Delete | YES | Preserved (only renders on user routines, which only render when authenticated) | Existing |
| Tap Clone (template kebab) | YES | Preserved (RoutinesPage.tsx:49-66 + RoutineCard.tsx:89-96) | `authModal.openAuthModal('Sign in to create bedtime routines')` if `!isAuthenticated` |
| **Tap Favorite (NEW — Step 10)** | **YES** | **Step 10d** | `authModal.openAuthModal('Sign in to favorite routines')` if `!isAuthenticated`; otherwise toggle `wr_routine_favorites` |

All gates preserved through 11c chrome edits. Step 10 introduces ONE new auth gate (Favorite button on logged-out users).

---

## Design System Values (for UI steps)

All values transcribed verbatim from spec § "Design system values" (lines 116-137). No [UNVERIFIED] entries below — every value either ships in the spec or is a preserved class string from current code.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero greeting line (NEW) | className | `mb-2 text-sm text-white/50` | Insights pattern (`pages/Insights.tsx:230`) |
| Hero h1 | className | `px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2` + `id="routines-heading"` | Preserved from current `RoutinesPage.tsx:149-154` + a11y addition |
| Hero h1 | style | `GRADIENT_TEXT_STYLE` | Preserved |
| Hero `<section>` | aria | `aria-labelledby="routines-heading"` | NEW (Decision 4) |
| Hero subtitle | className | `mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg` | Preserved |
| Starfield overlay (NEW) | element | `<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ backgroundImage: '...' }} />` | NEW (spec Step 1 — see Step 1 Details below for the exact `backgroundImage` value) |
| Eyebrow muted (Templates) | className | `text-xs text-white/60 uppercase tracking-wider mb-3 mt-4` | Preserved from `RoutinesPage.tsx:185-187` (post-6-patch canonical) |
| Eyebrow accent (Your routines, NEW) | className | `mb-3 mt-8 sm:mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-violet-300 font-semibold` | Tier 1 FrostedCard `variant="accent"` pattern (`09-design-system.md` § "Eyebrow distinction") |
| Violet leading dot (NEW, inside eyebrow) | element | `<span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />` | DailyHub 2 dot signature |
| Step icon — scene | container `bg-glow-cyan/15` + icon `text-glow-cyan` | (24×24 round container, 12×12 icon) | RoutineBuilder/RoutineStepCard palette (`RoutineStepCard.tsx:9-13`) |
| Step icon — scripture | container `bg-amber-400/15` + icon `text-amber-400` | (same dimensions) | Same palette |
| Step icon — story | container `bg-primary-lt/15` + icon `text-primary-lt` | (same dimensions) | Same palette |
| Step icon — bible-navigate | (collapses to scripture treatment: `bg-amber-400/15` + `text-amber-400`) | (same dimensions) | Decision 6 |
| Step icon fallback (DEFAULT_STEP_TINT) | container `bg-white/10` + icon `text-white/60` | — | Current canonical neutral (preserved from `RoutineCard.tsx:129-132`) |
| Card top strip (when scene step exists) | className | `absolute top-0 left-0 right-0 h-1 rounded-t-2xl` + inline `style.backgroundImage` derived from `SCENE_BY_ID.get(contentId)?.themeColor` | NEW per-routine derivation |
| Card top-strip gradient formula | (themeColor present) | `linear-gradient(to right, ${themeColor}aa, ${themeColor}33)` | NEW — spec Step 7b (alpha hex `aa` ≈ 0.67, `33` ≈ 0.20) |
| Active card border override | className | `border border-primary/40` (replaces default `border border-white/[0.12]`) | TonightScripture pattern |
| Active card "Now playing" chip (NEW) | className | `mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300` + static violet dot child | Spec Step 8c |
| Card Start CTA (per-card, quieted) | className | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark` | Quieted from Pattern 2 (smaller, subtler glow) |
| Create Routine CTA (page-level, showstopper preserved) | (existing 11B Pattern 2 class string at `RoutinesPage.tsx:215`) | DO NOT change | Hierarchy preservation |
| Favorite button (unfavorited) | className | `ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark` | NEW |
| Favorite button (favorited) | className | (same scaffold as above, but `bg-pink-500/15 text-pink-300 hover:bg-pink-500/20` replaces the bg/text section) | NEW |
| Favorite icon (lucide `Heart`) | size + fill | `size={18}` + `fill={isFavorited ? 'currentColor' : 'none'}` + `aria-hidden="true"` | NEW |
| Sleep-timer Moon glyph (NEW, conditional) | element | `<Moon size={12} className="text-violet-300" aria-hidden="true" />` placed inline before duration text | Spec Step 11 |
| Card meta `<p>` (modified for moon glyph) | className | `mt-2 flex items-center gap-1.5 text-xs text-white/60` (was `mt-2 text-xs text-white/60`) | Spec Step 11 |

---

## Design System Reminder

**Project-specific quirks `/execute-plan` will display before each UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font is deprecated for headings.
- RoutinesPage stays on `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG`. **Do NOT introduce HorizonGlow on RoutinesPage** — HorizonGlow is scoped to Daily Hub only (Decision 1 of Spec 11A/11B already established this; recon Section H restated it).
- **Do NOT introduce `<GlowBackground>` on RoutinesPage.** Out-of-scope reminder applies.
- **Do NOT swap to `FeatureEmptyState` for templates.** Decision 13/15 from spec stays — templates ARE the content, not an empty-state placeholder.
- **Do NOT modify `RoutineDefinition` schema.** No new fields. Favorites live in a separate localStorage key.
- **Do NOT animate the starfield, the "Now playing" dot, the favorite heart fill state, or the card top strip.** Direction Decisions 1, 8, and 10 explicitly say static. Reduced-motion users see no regression.
- **Do NOT add exclamation points to greeting copy.** Anti-pressure rule — spec Step 2 explicitly forbids them in all four greeting variants.
- **Do NOT use SVG for the starfield.** CSS `radial-gradient` overlay only (Decision 1 — keeps overlay weightless).
- **Do NOT add a 4th greeting state.** Three states only per spec.
- **Do NOT change the page-level Create Routine CTA size.** Hierarchy: Create Routine stays showstopper Pattern 2; per-card Start quiets to peer-tier.
- **Do NOT include both Template badge and "Now playing" chip in the same card.** Active state takes precedence; Template badge suppresses when `isActive === true`.
- **Frosted glass cards:** continue using current chrome (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` plus dual box-shadow). Active routines override only the border to `border-primary/40` — keep the rest of the chrome intact.
- **Animation tokens:** any transition durations come from `frontend/src/constants/animation.ts` (BB-33). Don't hardcode `200ms` or `cubic-bezier(...)`. Only the existing `transition-all duration-200` class on the Start CTA is preserved verbatim per spec; do not introduce new hardcoded values elsewhere.
- **Inline element layout discipline (RoutineCard actions row):** Step 10's actions row reads Start | Favorite | Kebab. The kebab gets `ml-auto` (pushed right); Start and Favorite cluster on the left. At mobile width 343px, total ~184px max. Verify y-coordinate alignment in `/verify-with-playwright` Step 6l.

**Source for these reminders:** `09-design-system.md` § "Daily Hub Visual Architecture" + § "Deprecated Patterns"; spec § "Direction summary" + § "Out-of-scope reminder"; recon Section H ("Out of scope confirmations"); plus the recent Spec 11B Execution Log deviations (Pattern 2 chrome on Start CTA — now reverted; preservation of muted "Templates" eyebrow).

This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent mid-implementation drift.

---

## Shared Data Models (read-only consumers + ONE new key)

```typescript
// Existing — UNCHANGED
interface RoutineDefinition {
  id: string
  name: string
  description?: string
  isTemplate: boolean
  steps: {
    id: string
    type: 'scene' | 'scripture' | 'story' | 'bible-navigate'
    contentId: string
    transitionGapMinutes: number
  }[]
  sleepTimer: { durationMinutes: number; fadeDurationMinutes: number }
  createdAt: string
  updatedAt: string
}

// Read-only consumers
interface ScenePreset {       // from types/music.ts:62-78
  id: string
  name: string
  // ...
  themeColor?: string         // hex, used in Step 7b for top-strip gradient
}

// AudioState shape (read-only via useAudioState())
interface AudioState {
  activeRoutine: { routineId: string; routineName: string } | null
  // ...
}
```

### NEW persistence (Step 10)

- `wr_routine_favorites` — `string[]` of routine IDs
- New methods on `StorageService` interface AND `LocalStorageService` class:
  - `getRoutineFavorites(): string[]` — defensive read with `Array.isArray` filter
  - `toggleRoutineFavorite(routineId: string): void` — toggle membership
  - `isRoutineFavorited(routineId: string): boolean` — convenience check

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_routine_favorites` | Both (NEW) | `string[]` of favorited routine IDs (visual flag only — no reorder) |
| `wr_routines` | Read (preserved by existing flow) | RoutineDefinition[] (preserved) |
| (none other this spec writes) | — | — |

**Documentation pointer:** Once shipped, `wr_routine_favorites` must be added to `.claude/rules/11-local-storage-keys.md` § "Music & Audio" (between `wr_routines` and `wr_sound_effects_enabled`) with row: `| \`wr_routine_favorites\` | string[] | Spec 11c — IDs of favorited bedtime routines (visual flag, no reorder) |`. Step 10 instructions include this docs touch.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | 1-column card grid (`grid-cols-1`), hero h1 at `text-3xl`, subtitle at `text-base`, action row reads Start (peer-tier) + Favorite (44×44) + Kebab (44×44) — total ~184px well within 343px card width. Greeting renders single-line. Starfield positions reflow with section width. |
| Tablet | 768px | 2-column card grid (`sm:grid-cols-2`), hero h1 at `text-4xl`, subtitle at `text-lg`. Starfield, greeting, eyebrows render same as mobile. |
| Desktop | 1440px | 3-column card grid (`lg:grid-cols-3`), hero h1 at `text-5xl`. All affordances visible. Card padding `p-5`. |

**Custom breakpoints (none beyond Tailwind defaults).** Card grid breakpoints (`sm:grid-cols-2 lg:grid-cols-3`) preserved from post-6-patch — Decision 13 ("gap-4 keep").

---

## Inline Element Position Expectations

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| Hero stack | Back-link → greeting → h1 → subtitle | Vertical stack, centered horizontally. Each element on its own line. No horizontal-row constraints. | N/A — vertical-only stack |
| Card top strip | 1px-tall gradient strip | Top edge of each RoutineCard, full-width via `absolute top-0 left-0 right-0 h-1`, clipped to `rounded-t-2xl` | N/A — single element, absolute-positioned |
| Card actions row (Start + Favorite + Kebab) | Start CTA, Favorite button, Kebab trigger | All three elements share the same row inside `<div className="mt-4 flex items-center gap-2">`. Kebab carries `ml-auto` to push right; Favorite sits inline with `ml-auto` originally — RE-PARSED: the spec calls for Start (no ml-auto) → Favorite (no ml-auto) → Kebab (ml-auto in its wrapper `<div className="relative ml-auto">`). Children stay within row's vertical span at every breakpoint. | No wrapping at 1440px / 768px / 375px — total combined width fits the card content area at all breakpoints |
| "Now playing" chip + dot | static violet dot + "Now playing" label | `inline-flex items-center gap-1.5` — children share the same vertical center | No wrap — chip is a single inline-flex container |
| "Your routines" eyebrow | violet dot + "Your routines" label | `flex items-center gap-2` — children share the same vertical center | No wrap |
| Card meta line (with Moon glyph) | Moon icon + `<span>` with steps + duration text | `mt-2 flex items-center gap-1.5 text-xs` — Moon and span share the same vertical center | No wrap at any breakpoint |
| Step icons row | Step icon containers (24×24) | `mt-3 flex items-center gap-1.5` — preserved from current code | No wrap (max ~5 icons × 30px = 150px) |

**Verification approach for `/verify-with-playwright` Step 6l:**

For the action row (Start | Favorite | Kebab) and the eyebrow + dot pair, use **"No wrap"** assertion (children stay within the row's vertical span — Spec 11c heading-row pattern from Spec 6A). Top-y matching is appropriate for the "Now playing" chip (chip + dot are structurally identical small inline-flex children — top-y delta should be ≤5px).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Back-link → greeting | `mb-4` on back-link, no top margin on greeting (16px) | Preserved + Step 2 |
| Greeting → h1 | `mb-2` on greeting (8px) | Insights pattern (`pages/Insights.tsx:230`) |
| h1 → subtitle | `mt-4` on subtitle (16px) | Preserved (`RoutinesPage.tsx:155`) |
| Hero bottom padding | `pb-8 sm:pb-12` | Preserved |
| Templates eyebrow → templates grid | `mb-3` on eyebrow (12px) | Preserved post-6-patch |
| Templates grid → "Your routines" eyebrow | `mt-8 sm:mt-10` (32/40px) | Preserved post-6-patch |
| "Your routines" eyebrow → user routines grid | `mb-3` on eyebrow (12px) | Preserved |
| Card top strip → card content | Card padding `p-5` (20px) starts immediately after the absolute-positioned strip | NEW |
| Card content internal | `mb-2` (Template/Now playing chip → name), `mt-1` (name → description), `mt-3` (→ step icons), `mt-2` (→ meta), `mt-4` (→ actions) | Preserved from current `RoutineCard.tsx` |

`/verify-with-playwright` Step 6e compares these — any gap difference >5px is flagged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Spec 11A + 11B + 6-patch round shipped (verified via `git log --oneline -- frontend/src/pages/RoutinesPage.tsx` showing 11B commit + 6-patch follow-up)
- [ ] `forums-wave-continued` branch active (verified)
- [ ] No uncommitted changes in working tree (verified at recon — only `_specs/spec-11c-routines-uplift.md` and `_plans/recon/routines-redesign-2026-05-06.md` are untracked, nothing modified)
- [ ] `pnpm test` baseline: ≥9,470 pass / 1 known pre-existing fail (`useFaithPoints — intercession`); current RoutinesPage.test.tsx 22/22, RoutineCard.test.tsx 7/7, storage-service.test.ts existing tests passing
- [ ] `useAudioState` already imported in RoutinesPage post-6-patch (verified at line 16)
- [ ] `SCENE_BY_ID` lookup confirmed in `data/scenes.ts:241+` (verified — `new Map<string, ScenePreset>(...)`); also confirmed `ScenePreset.themeColor` exists at `types/music.ts:77` for top-strip gradient derivation
- [ ] Tailwind tokens `text-glow-cyan`, `text-amber-400`, `text-primary-lt`, `bg-glow-cyan/15`, `bg-amber-400/15`, `bg-primary-lt/15` resolve correctly (verified — `glow-cyan: '#00D4FF'` at tailwind.config.js:18; amber-400 and primary-lt are part of canonical token list per `09-design-system.md` § "Color Palette")
- [ ] `lucide-react` exports `Heart` and `Moon` (Moon already imported in RoutineCard.tsx:2; Heart needs adding)
- [ ] All auth-gated actions from spec § "Auth gating checklist" are accounted for in the plan (verified above — 7 preserved gates + 1 new gate at Step 10)
- [ ] Design system values are verified against current tokens (verified — no [UNVERIFIED] entries)
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, PageTransition component) — verified
- [ ] `wr_routine_favorites` documentation row to be added to `.claude/rules/11-local-storage-keys.md` (Step 10g)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Routine has no scene step at all | Top strip does NOT render; card chrome stays default `border-white/[0.12]` | Defensive — `find` returns undefined; `getRoutineSceneStripGradient` returns `null`; conditional render suppresses the strip |
| Routine's first scene step has unknown contentId | Top strip does NOT render | `SCENE_BY_ID.get(contentId)` returns undefined; gradient resolver returns `null` |
| `ScenePreset.themeColor` is undefined | Top strip does NOT render | `themeColor` is optional on ScenePreset; the resolver returns `null` if absent |
| Routine is active AND favorited | "Now playing" chip in badge slot (top-left); favorite button shows favorited state in actions row | Both signals coexist in distinct positions |
| Active routine matches a deleted routine (race) | No card gets active treatment (no match); nothing breaks | Acceptable — `state.activeRoutine?.routineId` compares against rendered routines only |
| Logged-out user taps Favorite | Auth modal opens with "Sign in to favorite routines" subtitle; favorite NOT persisted | Step 10d guards with `isAuthenticated` check |
| `wr_routine_favorites` corrupted (non-array, non-string entries) | `getRoutineFavorites()` returns `[]` (or filtered subset for non-string entries) with `console.warn` | Mirrors Spec 11B 6-patch defensive pattern for `wr_routines` (storage-service.ts:272-283) |
| `routine.sleepTimer` is undefined or `durationMinutes === 0` | No Moon glyph renders | Defensive — Step 11 conditional |
| Reduced motion preference set | Starfield does not animate (it doesn't anyway). "Now playing" dot is static (Decision 8). Card transitions use `motion-reduce:transition-none` already present | No regression — feature is static by design |
| Tablet (768px), single user routine + 4 templates | "Templates" eyebrow renders (muted), 4-card grid (2 cols), "Your routines" eyebrow renders (violet leading dot, accent), 1-card grid | Preserved layout |
| All 4 templates have scene as first step (verified at `data/music/routines.ts`: Evening Peace → still-waters; Scripture & Sleep → midnight-rain; Deep Rest → garden-of-gethsemane; Bible Before Bed → evening-scripture) | All 4 templates render top strips with their scene's `themeColor` gradient | Visual consistency across templates |
| Storage service tests don't call `setAuthState(true)` for favorites | Favorites methods are deliberately NOT auth-gated at the service layer | Spec design — auth lives at component layer; service is a pure persistence layer |
| Spec mentions `types/storage.ts` for the `wr_routine_favorites` constant, but `KEYS` lives in `services/storage-service.ts` | The plan adds the constant to `services/storage-service.ts`'s `KEYS` map — `types/storage.ts` is types-only | Reconciliation of minor recon error in spec |

---

## Implementation Steps

### Step 1: RoutinesPage hero starfield overlay + a11y additions

**Objective:** Add a subtle starfield decorative overlay (CSS-only, 7 white radial dots, no animation, `pointer-events-none`, `aria-hidden`) to the hero `<section>`, plus the `aria-labelledby="routines-heading"` on the section and `id="routines-heading"` on the h1 (Decision 4).

**Files to create/modify:**

- `frontend/src/pages/RoutinesPage.tsx` — modify hero `<section>` (lines 138-158)

**Details:**

Open `RoutinesPage.tsx`. Locate the `<section>` at lines 138-158. Modify it as follows:

1. Add `aria-labelledby="routines-heading"` to the `<section>` opening tag (preserve all existing className/style attributes).
2. Insert as the FIRST child of `<section>` (before the existing `<Link>` back-link):

```tsx
<div
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 overflow-hidden"
  style={{
    backgroundImage: `
      radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.15), transparent),
      radial-gradient(1px 1px at 28% 42%, rgba(255,255,255,0.10), transparent),
      radial-gradient(1.5px 1.5px at 47% 22%, rgba(255,255,255,0.12), transparent),
      radial-gradient(1px 1px at 63% 58%, rgba(255,255,255,0.08), transparent),
      radial-gradient(1.5px 1.5px at 78% 31%, rgba(255,255,255,0.13), transparent),
      radial-gradient(1px 1px at 88% 14%, rgba(255,255,255,0.09), transparent),
      radial-gradient(1.5px 1.5px at 91% 67%, rgba(255,255,255,0.11), transparent)
    `,
  }}
/>
```

3. Add `id="routines-heading"` to the existing `<h1>` (currently at lines 149-154). Preserve `className`, `style`, and children verbatim.

The starfield uses 7 small radial gradients at varied positions (avoiding center where h1 lives). Opacities range 0.08–0.15 — visible against the purple ellipse `ATMOSPHERIC_HERO_BG` without competing with text. The `<section>` already has `relative` so `absolute inset-0` resolves correctly.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): starfield positions reflow with section width; visible against purple ellipse.
- Tablet (768px): same — percentage-based positions.
- Mobile (375px): same; opacity values low enough to remain unobtrusive on small screens.

**Inline position expectations:** Starfield sits behind hero content via DOM source order (first child). Hero content is centered via `flex flex-col items-center` and is not absolute-positioned, so it paints on top naturally.

**Guardrails (DO NOT):**
- DO NOT animate the starfield (Decision 1).
- DO NOT use SVG (Decision 1 — CSS radial-gradient only).
- DO NOT exceed 7 dots (Decision 1: subtle).
- DO NOT add `aria-label` to the overlay (decorative only — `aria-hidden` is correct).
- DO NOT modify hero className, padding, `style={ATMOSPHERIC_HERO_BG}`, or text-center.

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Hero section has aria-labelledby attribute | unit | Render the page; query `container.querySelector('section[aria-labelledby="routines-heading"]')`; assert non-null. |
| h1 has matching id | unit | `screen.getByRole('heading', { level: 1, name: 'Bedtime Routines' })` has `id` attribute equal to `"routines-heading"`. |
| Starfield overlay renders with aria-hidden + pointer-events-none | unit | Query `container.querySelector('div[aria-hidden="true"][class*="pointer-events-none"][class*="absolute"]')`; assert non-null and inside the hero section. |

**Expected state after completion:**
- [ ] Starfield overlay rendered as first child of hero `<section>`
- [ ] Hero `<section>` has `aria-labelledby="routines-heading"`
- [ ] h1 has `id="routines-heading"`
- [ ] No animation, no SVG
- [ ] 3 new test assertions pass

---

### Step 2: RoutinesPage adaptive pre-h1 greeting line

**Objective:** Add an adaptive pre-h1 greeting line above h1 with three states based on auth + active routine + has-user-routines. Mirror the Insights pattern's chrome (`mb-2 text-sm text-white/50`). NO exclamation points in any variant.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — add `useMemo` derivation, render new `<p>` before h1

**Details:**

1. Update imports at top of file: add `useMemo` to the `react` import (currently `import { useState, useCallback } from 'react'` → `import { useState, useCallback, useMemo } from 'react'`).
2. After the existing hooks block (line 27, after `const { showToast } = useToast()`), destructure `user` from `useAuth`:

```tsx
const { isAuthenticated, user } = useAuth()
```

(The existing line at 23 reads `const { isAuthenticated } = useAuth()` — extend the destructure to include `user`.)

3. After `userRoutines` and the `hasUserRoutines` derivation (which is already at line 120), add:

```tsx
const greetingCopy = useMemo(() => {
  if (audioState.activeRoutine) return 'Currently winding down.'
  if (!isAuthenticated) return 'Your bedtime sanctuary.'
  if (userRoutines.length > 0 && user?.name) return `Welcome back, ${user.name}.`
  return 'Your bedtime sanctuary.'
}, [audioState.activeRoutine, isAuthenticated, userRoutines.length, user?.name])
```

4. Inside the hero `<section>` (modified in Step 1), insert AFTER the existing back-link `<Link>` (which ends at line 148) and BEFORE the h1 (line 149):

```tsx
<p className="mb-2 text-sm text-white/50">
  {greetingCopy}
</p>
```

Final hero JSX order: starfield overlay (Step 1) → back-link (preserved) → greeting (NEW) → h1 (preserved) → subtitle (preserved).

**Note on copy variants:**
- Active state takes precedence over auth/routines state (it's the first branch of the conditional).
- "Currently winding down." NOT "Currently winding down with {routineName}." — Decision 2 explicitly says no routine name in active copy (intentional simplicity).
- "Your bedtime sanctuary." used for both logged-out AND logged-in-with-zero-routines (the spec considers these equivalent — no personalization to offer until the user has data).
- "Welcome back, {name}." — the `user?.name` access uses optional chaining, so if `user` is `null` (transitional auth state) the line falls through to "Your bedtime sanctuary."

**Auth gating:** N/A — read-only auth state derivation.

**Responsive behavior:**
- All breakpoints: same `text-sm` size, single line. Longest variant `Welcome back, {name}.` bounded by user.name length; assume reasonable name lengths fit on mobile 375px.
- If a name is unusually long (>30 chars), the line may wrap on mobile. Acceptable; do NOT add truncation logic (Decision: no edge-case complexity for an unlikely path).

**Inline position expectations:** Greeting is a single-line block element above h1, centered horizontally via parent's `text-center` + `items-center` flex.

**Guardrails (DO NOT):**
- DO NOT include exclamation points in any copy variant (anti-pressure pattern, Decision 2).
- DO NOT pluralize, address explicitly, or add imperatives.
- DO NOT use the routine's name in the active-state copy (Decision 2).
- DO NOT add a 4th state.
- DO NOT use the user's first name vs full name distinction — `user.name` as-is.
- DO NOT remove or rewrite the back-link.

**Test specifications (RoutinesPage.test.tsx):**

Update mocks at top of file: change `vi.mock('@/hooks/useAuth', ...)` to allow `user.name` to be set. Currently at line 18-20:

```tsx
let mockUserName: string | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUserName ? { name: mockUserName } : null,
    isAuthenticated: mockIsAuthenticated,
  }),
}))
```

(Use a module-level `let mockUserName` mirroring the existing `mockIsAuthenticated` / `mockActiveRoutine` pattern.)

| Test | Type | Description |
|------|------|-------------|
| Greeting renders 'Your bedtime sanctuary.' when logged out | unit | `mockIsAuthenticated = false`. Render. Assert `screen.getByText('Your bedtime sanctuary.')` is in document. |
| Greeting renders 'Welcome back, {name}.' when logged in with at least one routine | unit | `mockIsAuthenticated = true`, `mockUserName = 'Eric'`, mock `storageService.getRoutines` to return one routine. Assert `screen.getByText('Welcome back, Eric.')`. |
| Greeting renders 'Your bedtime sanctuary.' when logged in with zero routines | unit | `mockIsAuthenticated = true`, `mockUserName = 'Eric'`, mock `getRoutines` returns `[]`. Assert `screen.getByText('Your bedtime sanctuary.')` (fallback). |
| Greeting renders 'Currently winding down.' when active routine | unit | `mockActiveRoutine = { routineId: 'x', routineName: 'y' }`. Render. Assert `screen.getByText('Currently winding down.')`. Active state takes precedence over auth/routines. |

**Expected state after completion:**
- [ ] `greetingCopy` derived via `useMemo` with three states (active / unauthenticated-or-zero-routines / authenticated-with-routines)
- [ ] Pre-h1 line rendered with `mb-2 text-sm text-white/50` chrome
- [ ] DOM order: back-link → greeting → h1 → subtitle (inside hero)
- [ ] No exclamation points anywhere in greetingCopy variants
- [ ] 4 new test assertions pass

---

### Step 3: RoutinesPage hero a11y verification (no code change)

**Objective:** Confirm the `aria-labelledby="routines-heading"` and `id="routines-heading"` from Step 1 are still present after Step 2's edits. This is a **traceability-only** step — no code change.

**Files to create/modify:** None.

**Details:**

If Step 2's hero edits inadvertently dropped Step 1's a11y attributes, restore them. The plan's expected state is that Step 1 + Step 2 leave the a11y attributes intact.

**Auth gating:** N/A.
**Responsive behavior:** N/A — no UI impact.
**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT add new code in this step. Verification only.

**Test specifications:** Coverage via Step 1 tests.

**Expected state after completion:**
- [ ] `aria-labelledby` confirmed on hero section
- [ ] `id` confirmed on h1
- [ ] Step 1 tests still passing after Step 2 changes

---

### Step 4: RoutinesPage section eyebrow promotion ("Your routines" centerpiece tier)

**Objective:** Promote the "Your routines" eyebrow to centerpiece tier with a violet leading dot + `text-violet-300 font-semibold tracking-[0.15em]`. Keep "Templates" eyebrow muted (unchanged).

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify the second `<h2>` block (currently at lines 195-197)

**Details:**

Locate `RoutinesPage.tsx` lines 193-202 (the `{hasUserRoutines && ( ... )}` block containing the second `<h2>`). Replace the second `<h2>` ONLY:

**Before:**
```tsx
<h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-8 sm:mt-10">
  Your routines
</h2>
```

**After:**
```tsx
<h2 className="mb-3 mt-8 sm:mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-violet-300 font-semibold">
  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
  Your routines
</h2>
```

The "Templates" eyebrow (first `<h2>` at lines 184-187) stays exactly as-is post-6-patch — muted curatorial scaffolding.

Spacing constants `mb-3 mt-8 sm:mt-10` preserved verbatim.

**Auth gating:** N/A.
**Responsive behavior:** Same at all breakpoints — leading dot + tighter tracking renders identically.
**Inline position expectations:** Dot + label inline via `flex items-center gap-2`. Single-line at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT change "Templates" eyebrow chrome (stays muted).
- DO NOT add a leading dot to "Templates."
- DO NOT change the conditional rendering (both eyebrows still gated on `hasUserRoutines`).
- DO NOT change spacing constants (`mb-3 mt-8 sm:mt-10`) — preserved.
- DO NOT use `text-violet-400` or other shade — `text-violet-300` matches the "Now playing" chip palette (Step 8c).

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Templates eyebrow stays muted | unit | When `hasUserRoutines === true` (mock `getRoutines` returns ≥1 user routine), the "Templates" h2 className contains `text-white/60` and does NOT contain `text-violet-300`. |
| Your routines eyebrow has violet leading dot (aria-hidden) | unit | When `hasUserRoutines === true`, find the "Your routines" h2; assert it has a child `span` with className containing `bg-violet-400` AND attribute `aria-hidden="true"`. |
| Your routines eyebrow uses violet text + tighter tracking | unit | When `hasUserRoutines === true`, the "Your routines" h2 className contains `text-violet-300` AND `tracking-[0.15em]` AND `font-semibold`. |
| Empty state still suppresses both eyebrows | unit | When `hasUserRoutines === false` (mock `getRoutines` returns `[]`), neither "Templates" nor "Your routines" h2 renders (preserve 6-patch behavior). |

**Expected state after completion:**
- [ ] "Your routines" eyebrow chrome migrated to centerpiece tier
- [ ] "Templates" eyebrow unchanged
- [ ] Leading dot a11y-hidden
- [ ] Empty-state behavior preserved
- [ ] 4 test assertions pass

---

### Step 5: RoutinesPage `isActive` prop derivation per card

**Objective:** Compute `isActive` for each rendered RoutineCard using `audioState.activeRoutine?.routineId === routine.id` and pass it as a prop. Page-side wiring; the corresponding RoutineCard prop addition lives in Step 8.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify the `renderRoutineCard` helper (currently at lines 122-132)

**Details:**

Open `RoutinesPage.tsx`. Locate `renderRoutineCard` at lines 122-132. Add an `isActive` prop:

**Before:**
```tsx
const renderRoutineCard = (routine: RoutineDefinition) => (
  <RoutineCard
    key={routine.id}
    routine={routine}
    onStart={() => startRoutine(routine)}
    onClone={routine.isTemplate ? () => handleClone(routine) : undefined}
    onEdit={!routine.isTemplate ? () => handleEdit(routine) : undefined}
    onDuplicate={!routine.isTemplate ? () => handleDuplicate(routine) : undefined}
    onDelete={!routine.isTemplate ? () => setDeletingRoutine(routine) : undefined}
  />
)
```

**After:**
```tsx
const renderRoutineCard = (routine: RoutineDefinition) => (
  <RoutineCard
    key={routine.id}
    routine={routine}
    isActive={audioState.activeRoutine?.routineId === routine.id}
    onStart={() => startRoutine(routine)}
    onClone={routine.isTemplate ? () => handleClone(routine) : undefined}
    onEdit={!routine.isTemplate ? () => handleEdit(routine) : undefined}
    onDuplicate={!routine.isTemplate ? () => handleDuplicate(routine) : undefined}
    onDelete={!routine.isTemplate ? () => setDeletingRoutine(routine) : undefined}
  />
)
```

`audioState` is already in scope (line 26: `const audioState = useAudioState()`).

**Note:** This step changes the call site only. The `RoutineCard` prop signature change (adding `isActive?: boolean`) lives in Step 8a. TypeScript will surface the missing prop interface mismatch when both files compile together; the `?` (optional) on Step 8a's prop signature ensures the existing tests don't break in the brief window between Steps 5 and 8 if executed sequentially.

**Auth gating:** N/A — read-only state derivation.
**Responsive behavior:** N/A.
**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT mutate `audioState.activeRoutine` — read-only.
- DO NOT add a fallback that always treats the routine as active when no active routine exists.
- DO NOT pass `isActive` only for templates or only for user routines — pass for all rendered cards.

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Active routine card receives isActive=true (verified via "Now playing" chip presence) | unit | Set `mockActiveRoutine = { routineId: 'template-evening-peace', routineName: 'Evening Peace' }`. Render. Find the RoutineCard for `'Evening Peace'` (via `screen.getAllByRole('article')` filtered by name); assert it contains text "Now playing". |
| Non-active routines do NOT show "Now playing" chip | unit | Same active-routine fixture as above. Other RoutineCards (e.g., "Scripture & Sleep") do NOT contain "Now playing" text. |

(These tests depend on Step 8 being complete — they verify the integration. If executed in strict sequence Step 5 → Step 6 → ... → Step 8, defer these specific assertions to land after Step 8.)

**Expected state after completion:**
- [ ] `isActive` prop passed per card
- [ ] No mutation of `audioState`
- [ ] 2 test assertions added (verified after Step 8 ships)

---

### Step 6: RoutineCard step icons — per-type color identity

**Objective:** Replace neutral gray step icon backgrounds with per-type cyan/amber/violet tint. Adopt RoutineBuilder's existing palette without introducing new tokens.

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — add `STEP_ICON_TINT_MAP` constant + modify step-icon render block (lines 122-136)

**Details:**

1. After the imports (line 5) and before `STEP_ICON_MAP` (line 7), add:

```tsx
const STEP_ICON_TINT_MAP: Record<string, { container: string; icon: string }> = {
  scene: { container: 'bg-glow-cyan/15', icon: 'text-glow-cyan' },
  scripture: { container: 'bg-amber-400/15', icon: 'text-amber-400' },
  story: { container: 'bg-primary-lt/15', icon: 'text-primary-lt' },
  'bible-navigate': { container: 'bg-amber-400/15', icon: 'text-amber-400' },
} as const

const DEFAULT_STEP_TINT = { container: 'bg-white/10', icon: 'text-white/60' }
```

2. Modify the step-icon render block at lines 122-136. Replace:

```tsx
<div className="mt-3 flex items-center gap-1.5">
  {routine.steps.map((step) => {
    const Icon = STEP_ICON_MAP[step.type]
    return (
      <span
        key={step.id}
        role="img"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10"
        aria-label={step.type}
      >
        <Icon size={12} className="text-white/60" aria-hidden="true" />
      </span>
    )
  })}
</div>
```

with:

```tsx
<div className="mt-3 flex items-center gap-1.5">
  {routine.steps.map((step) => {
    const Icon = STEP_ICON_MAP[step.type]
    const tint = STEP_ICON_TINT_MAP[step.type] ?? DEFAULT_STEP_TINT
    return (
      <span
        key={step.id}
        role="img"
        className={`flex h-6 w-6 items-center justify-center rounded-full ${tint.container}`}
        aria-label={step.type}
      >
        <Icon size={12} className={tint.icon} aria-hidden="true" />
      </span>
    )
  })}
</div>
```

The existing `STEP_ICON_MAP` (lines 7-12: Mountain / BookOpen / Moon / BookOpen) stays unchanged — only tint colors migrate.

**Pre-execution verification:**
- Confirm `text-glow-cyan` class resolves (verified — `glow-cyan: '#00D4FF'` at `tailwind.config.js:18`).
- Confirm `text-amber-400` and `text-primary-lt` tokens resolve (verified via `RoutineStepCard.tsx:9-13` already using `border-amber-400` and `border-primary-lt` and `border-glow-cyan`; `bg-{token}/15` and `text-{token}` are auto-generated by Tailwind for these tokens).

**Auth gating:** N/A.
**Responsive behavior:** Step icons render at same 24×24 size at all breakpoints. Tint visible at all sizes.
**Inline position expectations:** Step icons preserved in horizontal flex row with `gap-1.5`. No layout change.

**Guardrails (DO NOT):**
- DO NOT change icon glyphs (Mountain/BookOpen/Moon mapping preserved).
- DO NOT change icon container size (24×24 / `h-6 w-6`).
- DO NOT change icon size (12×12 / `size={12}`).
- DO NOT migrate RoutineBuilder's chip colors (out of scope).
- DO NOT introduce new tokens — reuse existing palette only.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Scene step icon has cyan tint | unit | Render with one scene step. Query `[role="img"][aria-label="scene"]`; className contains `bg-glow-cyan/15`. Inner SVG className contains `text-glow-cyan`. |
| Scripture step icon has amber tint | unit | Same with `aria-label="scripture"`; className contains `bg-amber-400/15` and inner `text-amber-400`. |
| Story step icon has violet-lt tint | unit | Same with `aria-label="story"`; className contains `bg-primary-lt/15` and inner `text-primary-lt`. |
| Bible-navigate step icon collapses to scripture | unit | Same with `aria-label="bible-navigate"`; className contains `bg-amber-400/15` (NOT cyan, NOT a 4th color). |
| Step icon container size unchanged | unit | All step icons retain `h-6 w-6` regardless of type. |

**Expected state after completion:**
- [ ] `STEP_ICON_TINT_MAP` constant added
- [ ] Step icon containers per-type tinted
- [ ] Step icon glyphs unchanged
- [ ] 5 test assertions pass

---

### Step 7: RoutineCard scene-color top strip

**Objective:** Add a 1px-tall scene-color gradient strip to the top of each RoutineCard, derived from the routine's first scene step via `SCENE_BY_ID.get(...)?.themeColor`. If no scene step exists OR themeColor is missing, no strip renders.

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — add `SCENE_BY_ID` import + helper function + render conditional

**Details:**

1. Add import at the top of `RoutineCard.tsx` (after line 5 — `import type { RoutineDefinition } from '@/types/storage'`):

```tsx
import { SCENE_BY_ID } from '@/data/scenes'
```

2. Add a helper function at the module level (after `STEP_ICON_TINT_MAP` from Step 6, before the `interface RoutineCardProps`):

```tsx
function getRoutineSceneStripGradient(routine: RoutineDefinition): string | null {
  const firstSceneStep = routine.steps.find((s) => s.type === 'scene')
  if (!firstSceneStep) return null
  const scene = SCENE_BY_ID.get(firstSceneStep.contentId)
  if (!scene?.themeColor) return null
  return `linear-gradient(to right, ${scene.themeColor}aa, ${scene.themeColor}33)`
}
```

The 2-stop gradient uses alpha hex suffixes: `aa` ≈ 0.67 alpha (left), `33` ≈ 0.20 alpha (right) — produces a fade-out effect from left to right.

3. Inside the RoutineCard component (around line 98-99 — after `const durationEstimate = estimateDuration(routine)`):

```tsx
const topStripGradient = getRoutineSceneStripGradient(routine)
```

4. Inside the JSX, as the FIRST child of the outer `<div role="article">` at line 101 (BEFORE the Template badge `{routine.isTemplate && (...)}` block):

```tsx
{topStripGradient && (
  <div
    aria-hidden="true"
    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
    style={{ backgroundImage: topStripGradient }}
  />
)}
```

The strip uses `absolute top-0 left-0 right-0 h-1` to sit at the very edge of the card without affecting padding. `rounded-t-2xl` clips it to match the card's rounded corners. The card's outer div has `relative` already (line 104) so `absolute` resolves to the card's bounding box.

**Note:** The card's `box-shadow` and `border` styles are not affected by the strip — the strip sits inside the card's bounding box (because `absolute top-0 left-0 right-0` resolves to the card's content edges, accounting for the card's `border`). Visual verification will confirm the strip clips cleanly to the rounded corners.

**Auth gating:** N/A.
**Responsive behavior:** Strip is full-width at all breakpoints. Renders identically.
**Inline position expectations:** Strip is the topmost visual element of each card. Card padding (`p-5`) means content starts 20px below the card's top edge — the strip sits on the very top edge.

**Guardrails (DO NOT):**
- DO NOT mutate `data/scenes.ts` or `data/scene-backgrounds.ts`.
- DO NOT add `Scene` schema fields if `themeColor` is missing — return `null`.
- DO NOT use full-card background tints (only the 1px top strip — Decision 7).
- DO NOT add a left-border or right-border accent (top strip only).
- DO NOT animate the gradient.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Routine with scene first step renders top strip | unit | Render with a routine whose `steps[0]` has `type: 'scene'` and `contentId: 'still-waters'`. Query for `[aria-hidden="true"][class*="rounded-t-2xl"][class*="h-1"]` inside the article; assert non-null AND its `style.backgroundImage` contains `linear-gradient`. |
| Routine without scene step does NOT render top strip | unit | Render with a routine whose steps are all scripture/story (no scene). Same query returns null. |
| Routine with unknown scene contentId does NOT render top strip | unit | Render with `steps[0].contentId === 'invalid-scene-id'`. Query returns null. |
| Top strip is rounded to card corners | unit | When strip renders, its className contains `rounded-t-2xl`. |
| Top strip is aria-hidden | unit | When strip renders, has attribute `aria-hidden="true"`. |

**Expected state after completion:**
- [ ] `getRoutineSceneStripGradient` helper added
- [ ] `SCENE_BY_ID` imported
- [ ] Top strip renders conditionally
- [ ] Card chrome otherwise unchanged
- [ ] 5 test assertions pass

---

### Step 8: RoutineCard active-routine treatment (border + "Now playing" chip)

**Objective:** When `isActive === true`, override the card border to `border-primary/40` and replace the Template badge slot with a "Now playing" chip (static violet dot — no animation). Active state takes precedence over Template badge when both are true.

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — extend `RoutineCardProps`, modify outer `<div>` className, modify badge-slot render

**Details:**

**Step 8a — Extend `RoutineCardProps`:**

Modify the interface at line 14-21:

```tsx
interface RoutineCardProps {
  routine: RoutineDefinition
  isActive?: boolean // NEW — defaults to false
  onStart: () => void
  onClone?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}
```

In the component function signature destructure (line 29-36), add `isActive = false`:

```tsx
export function RoutineCard({
  routine,
  isActive = false,
  onStart,
  onClone,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
```

**Step 8b — Override outer `<div>` border conditionally:**

Modify the outer `<div role="article">` className (line 104):

**Before:**
```tsx
className="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] p-5 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18]"
```

**After:**
```tsx
className={`relative rounded-2xl border ${isActive ? 'border-primary/40' : 'border-white/[0.12]'} bg-white/[0.06] p-5 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18]`}
```

(Use a template literal so the conditional border class slots in cleanly. The hover override `hover:border-white/[0.18]` will win over `border-primary/40` when the user hovers an active card — minor edge case acknowledged in spec.)

**Step 8c — Replace Template badge slot conditionally:**

Locate the Template badge render at lines 107-111:

**Before:**
```tsx
{routine.isTemplate && (
  <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">
    Template
  </span>
)}
```

**After:**
```tsx
{isActive ? (
  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
    Now playing
  </span>
) : routine.isTemplate ? (
  <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">
    Template
  </span>
) : null}
```

User routines with no active state and no Template badge: nothing renders in the badge slot (preserves current behavior — `null`).

**Auth gating:** N/A.
**Responsive behavior:** Chip + dot render identically at all breakpoints.
**Inline position expectations:** Chip occupies the same DOM position as the Template badge (top-left of card body, `mb-2` spacer to title). `inline-flex items-center gap-1.5` keeps dot and label vertically centered.

**Guardrails (DO NOT):**
- DO NOT animate the dot (Decision 8 — static).
- DO NOT change the chip position (preserves badge slot).
- DO NOT show both Template badge and "Now playing" chip simultaneously (active takes precedence).
- DO NOT change card chrome elsewhere — only the border override and badge slot.

**Test specifications (RoutineCard.test.tsx):**

Update the existing test "Start CTA uses white-pill Pattern 2 chrome" (line 39) — that test's assertions verify pre-Step-9 chrome (`bg-white`, `rounded-full`, `min-h-[44px]`, `text-hero-bg`). After Step 9, the test must be updated to no longer require Pattern 2 sizing (`px-8 py-3.5 text-base sm:text-lg`); see Step 9 test plan.

| Test | Type | Description |
|------|------|-------------|
| Active routine has primary border override | unit | Render with `isActive={true}`. Article element className contains `border-primary/40` and does NOT contain `border-white/[0.12]`. |
| Inactive routine has canonical border | unit | Render with `isActive={false}` (or omit). className contains `border-white/[0.12]` and does NOT contain `border-primary/40`. |
| Active routine renders Now playing chip with static violet dot | unit | Render with `isActive={true}`. Find element with text "Now playing"; it contains a child span with className containing `bg-violet-400` AND `aria-hidden="true"`. |
| Now playing chip dot is NOT animated | unit | The dot span className does NOT contain `animate-` substring. |
| Active routine suppresses Template badge | unit | Render with `isActive={true}` AND `routine.isTemplate === true`. Find by text "Now playing" (present); find by text "Template" (NOT present). |
| Inactive template renders Template badge | unit | Render with `isActive={false}` AND `routine.isTemplate === true`. "Template" present; "Now playing" NOT present. |
| User routine inactive renders neither badge | unit | Render with `isActive={false}` AND `routine.isTemplate === false`. Neither "Template" nor "Now playing" present. |

**Expected state after completion:**
- [ ] `isActive` prop on RoutineCard with default `false`
- [ ] Border override conditional via template literal
- [ ] Badge slot conditional with active precedence
- [ ] No animation on dot
- [ ] 7 test assertions pass

---

### Step 9: RoutineCard Start CTA quieting

**Objective:** Reduce per-card Start CTA from showstopper-tier (`px-8 py-3.5 text-base sm:text-lg`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`) to peer-tier (`px-6 py-2.5 text-sm`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`). Touch target `min-h-[44px]` preserved. White-pill chrome canonical otherwise.

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — modify Start button class string (line 148)
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` — update Pattern 2 test (line 39) to reflect quieted size

**Details:**

Modify the Start button at lines 145-151:

**Before:**
```tsx
<button
  type="button"
  onClick={handleStart}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  <Play size={14} fill="currentColor" aria-hidden="true" /> Start
</button>
```

**After:**
```tsx
<button
  type="button"
  onClick={handleStart}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  <Play size={14} fill="currentColor" aria-hidden="true" /> Start
</button>
```

Changes (verbatim from spec § "Design system values"):
- `px-8 py-3.5` → `px-6 py-2.5`
- `text-base sm:text-lg` → `text-sm` (no responsive bump)
- `shadow-[0_0_30px_rgba(255,255,255,0.20)]` → `shadow-[0_0_20px_rgba(255,255,255,0.15)]`
- `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` → `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`

Preserved verbatim:
- `min-h-[44px]` (touch target)
- `bg-white` / `text-hero-bg` (chrome)
- Hover, focus-visible, transition class
- Play icon (`size={14}`, fill="currentColor")
- `transition-all duration-200` (note: this hardcoded 200ms is preserved — it predates the Spec 11c spec. Migrating to BB-33 animation tokens is not in scope.)

**Existing test update (RoutineCard.test.tsx line 39 "Start CTA uses white-pill Pattern 2 chrome"):**

The current test asserts `bg-white`, `rounded-full`, `min-h-[44px]`, `text-hero-bg`. These all remain valid post-Step-9. Add the new size assertions but keep the existing checks. Rename test to "Start CTA uses white-pill peer-tier (quieted) chrome".

**Important:** The page-level Create Routine CTA in `RoutinesPage.tsx:215` keeps the SHOWSTOPPER size (Pattern 2 verbatim). Do NOT modify it.

**Auth gating:** Start CTA preserves auth gate via existing `handleStart` handler (lines 65-71) — chrome-only edit.

**Responsive behavior:** Same `text-sm` at all breakpoints (no `sm:text-lg` bump — intentional quieting per Decision 9).

**Inline position expectations:** Smaller button leaves more room in the actions row for the favorite button (Step 10) and kebab.

**Guardrails (DO NOT):**
- DO NOT modify the Create Routine CTA in `RoutinesPage.tsx`.
- DO NOT modify Save Routine CTA in RoutineBuilder (out of scope per Decision 14).
- DO NOT change the Play icon size (`size={14}`).
- DO NOT remove `min-h-[44px]`.
- DO NOT introduce `text-primary` or `bg-primary` (existing test guards against it).

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Start CTA uses peer-tier sizing | unit | Find Start button via `screen.getByRole('button', { name: /Start/i })`; className contains `px-6` AND `py-2.5` AND `text-sm`. |
| Start CTA does NOT use showstopper sizing | unit | className does NOT contain `px-8` AND does NOT contain `py-3.5` AND does NOT contain `text-lg`. |
| Start CTA preserves min-h-[44px] | unit | className contains `min-h-[44px]`. |
| Start CTA preserves white-pill chrome | unit | className contains `bg-white` AND `rounded-full` AND `text-hero-bg`. (Update existing test at line 39 to match.) |
| Start CTA shadow is quieted | unit | className contains `shadow-[0_0_20px_rgba(255,255,255,0.15)]` (NOT `0_0_30px`). |
| Start auth gate preserved when logged out | unit | (existing test at line 82) — verify no regression. |

**Expected state after completion:**
- [ ] Start CTA quieted to peer-tier
- [ ] Touch target preserved
- [ ] Chrome canonical preserved
- [ ] Create Routine CTA in RoutinesPage unchanged
- [ ] Existing test at line 39 updated (renamed + size assertions adjusted)
- [ ] 5 new test assertions + existing test still passing

---

### Step 10: Favorite button + storage service favorites API

**Objective:** Add favorite affordance to RoutineCard top-right of the actions row. Persist to `wr_routine_favorites` localStorage. Logged-out users tapping favorite open auth modal. Visual flag only — NO reorder behavior.

**Files to create/modify:**
- `frontend/src/services/storage-service.ts` — add `KEYS.routineFavorites` + 3 new methods on `StorageService` interface AND `LocalStorageService` class
- `frontend/src/components/music/RoutineCard.tsx` — add `Heart` import, favorite state + handler, action row reorder, favorite button render
- `frontend/src/services/__tests__/storage-service.test.ts` — extend (4 favorites tests)
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` — extend (5 favorite-button tests)
- `frontend/src/pages/__tests__/RoutinesPage.test.tsx` — extend storage-service mock (line 62-71) to expose new methods so RoutineCard renders without error
- `.claude/rules/11-local-storage-keys.md` — add `wr_routine_favorites` row in § "Music & Audio"

**Details:**

**Step 10a — Add storage key constant:**

In `services/storage-service.ts` lines 12-18, extend the `KEYS` map:

```tsx
const KEYS = {
  favorites: 'wr_favorites',
  savedMixes: 'wr_saved_mixes',
  listeningHistory: 'wr_listening_history',
  sessionState: 'wr_session_state',
  routines: 'wr_routines',
  routineFavorites: 'wr_routine_favorites', // NEW (Spec 11c)
} as const
```

**Step 10b — Add favorites methods to `StorageService` interface:**

Modify the `StorageService` interface (lines 32-69). Add a new section under `// Routines`:

```tsx
  // Routine Favorites (NEW — Spec 11c)
  getRoutineFavorites(): string[]
  toggleRoutineFavorite(routineId: string): void
  isRoutineFavorited(routineId: string): boolean
```

**Step 10c — Implement on `LocalStorageService`:**

After the `duplicateRoutine` implementation (line 328) and before `// ── Sharing` (line 330), add:

```tsx
  // ── Routine Favorites (NEW — Spec 11c) ──────────────────────────
  // Note: NOT auth-gated at the service layer. Component-level gate (RoutineCard)
  // checks isAuthenticated before calling these. Mirrors the spec's design.
  getRoutineFavorites(): string[] {
    const raw = readJSON<unknown>(KEYS.routineFavorites, [])
    if (!Array.isArray(raw)) {
      console.warn('[storageService] wr_routine_favorites is not an array, returning empty')
      return []
    }
    const valid = raw.filter((id): id is string => typeof id === 'string')
    if (valid.length !== raw.length) {
      console.warn(
        `[storageService] Filtered ${raw.length - valid.length} non-string entries from wr_routine_favorites`,
      )
    }
    return valid
  }

  toggleRoutineFavorite(routineId: string): void {
    const current = this.getRoutineFavorites()
    const next = current.includes(routineId)
      ? current.filter((id) => id !== routineId)
      : [...current, routineId]
    writeJSON(KEYS.routineFavorites, next)
  }

  isRoutineFavorited(routineId: string): boolean {
    return this.getRoutineFavorites().includes(routineId)
  }
```

The `readJSON` / `writeJSON` helpers at lines 72-92 are already in scope. The `getRoutineFavorites` defensive shape mirrors `getRoutines` at lines 272-283.

**Step 10d — Add `Heart` import + favorite state + handler in RoutineCard:**

1. Update lucide imports at line 2:

```tsx
import { Mountain, BookOpen, Moon, MoreVertical, Play, Heart } from 'lucide-react'
```

2. Add `useState` is already imported (line 1). Add `storageService` import after line 5:

```tsx
import { storageService } from '@/services/storage-service'
```

3. In the component body, after the existing `useState`/`useRef` declarations (around line 41), add:

```tsx
const [isFavorited, setIsFavorited] = useState<boolean>(() =>
  storageService.isRoutineFavorited(routine.id),
)

const handleFavoriteToggle = () => {
  if (!isAuthenticated) {
    authModal?.openAuthModal('Sign in to favorite routines')
    return
  }
  storageService.toggleRoutineFavorite(routine.id)
  setIsFavorited((prev) => !prev)
}
```

`useAuth()` is already destructured at line 37. `useAuthModal()` is already at line 38.

**Step 10e — Render favorite button in actions row:**

Modify the actions row at lines 144-152. The current order is Start (left) + Kebab (right via `ml-auto`). Insert favorite between them:

**Before:**
```tsx
<div className="mt-4 flex items-center gap-2">
  <button
    type="button"
    onClick={handleStart}
    className="...quieted Start CTA from Step 9..."
  >
    <Play size={14} fill="currentColor" aria-hidden="true" /> Start
  </button>

  {/* Three-dot menu */}
  <div ref={menuRef} className="relative ml-auto">
    {/* ... */}
  </div>
</div>
```

**After:**
```tsx
<div className="mt-4 flex items-center gap-2">
  <button
    type="button"
    onClick={handleStart}
    className="...quieted Start CTA from Step 9..."
  >
    <Play size={14} fill="currentColor" aria-hidden="true" /> Start
  </button>

  {/* Favorite button (NEW — Spec 11c Step 10) */}
  <button
    type="button"
    onClick={handleFavoriteToggle}
    aria-label={isFavorited ? `Unfavorite ${routine.name}` : `Favorite ${routine.name}`}
    aria-pressed={isFavorited}
    className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark ${
      isFavorited
        ? 'bg-pink-500/15 text-pink-300 hover:bg-pink-500/20'
        : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
    }`}
  >
    <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
  </button>

  {/* Three-dot menu (kebab pushes right via ml-auto on its wrapper) */}
  <div ref={menuRef} className="relative ml-auto">
    {/* preserved verbatim */}
  </div>
</div>
```

Order: Start (no `ml-auto`) → Favorite (no `ml-auto`) → Kebab (`ml-auto` on wrapper). Favorite button is 44×44 (`h-11 w-11`) — meets WCAG touch target.

**Step 10f — Update RoutinesPage.test.tsx storage-service mock:**

Locate `vi.mock('@/services/storage-service', ...)` at lines 62-71. Extend the mock object:

```tsx
vi.mock('@/services/storage-service', () => ({
  storageService: {
    getRoutines: vi.fn().mockReturnValue([]),
    saveRoutine: vi.fn(),
    updateRoutine: vi.fn(),
    deleteRoutine: vi.fn(),
    duplicateRoutine: vi.fn(),
    logListeningSession: vi.fn(),
    // NEW (Spec 11c Step 10)
    getRoutineFavorites: vi.fn().mockReturnValue([]),
    toggleRoutineFavorite: vi.fn(),
    isRoutineFavorited: vi.fn().mockReturnValue(false),
  },
}))
```

Without these, RoutineCard mounts inside RoutinesPage tests will throw because `storageService.isRoutineFavorited(...)` is undefined.

**Step 10g — Document the new key:**

Open `.claude/rules/11-local-storage-keys.md`. Locate the "Music & Audio" section. Add a row in the table between `wr_routines` and `wr_sound_effects_enabled`:

```markdown
| `wr_routine_favorites` | string[] | Spec 11c — IDs of favorited bedtime routines (visual flag, no reorder). NOT auth-gated at the storage layer; the RoutineCard component handles the auth gate. |
```

(The exact table structure should match existing rows — verify column count and alignment when applying.)

**Auth gating:** YES — favorite click is gated on `isAuthenticated` in `handleFavoriteToggle`. Logged-out users get the auth modal with "Sign in to favorite routines" subtitle.

**Responsive behavior:** Favorite button is 44×44 at all breakpoints. Action row layout preserved.

**Inline position expectations:** Action row reads Start | Favorite | Kebab from left to right. Kebab clusters on the right via `ml-auto` on its wrapper. No wrap at any breakpoint:
- Mobile 343px card width: Start (~80-90px peer-tier) + 8px gap + Favorite (44px) + 8px gap + Kebab (44px) = ~184px ≪ 343px (with `p-5` interior padding subtracted, ~303px usable width — still ample).
- Tablet/Desktop: same affordances, more horizontal space.

**Guardrails (DO NOT):**
- DO NOT reorder favorited routines (visual flag only — Decision 10).
- DO NOT modify `RoutineDefinition` schema.
- DO NOT mutate `wr_routines` storage in this step.
- DO NOT separate favorites for templates vs user routines — same key for both (single source of truth per routine ID).
- DO NOT animate the heart icon's fill state change (use the `transition-colors` class only — clean tonal transition).
- DO NOT add the favorite button in a corner (top-right of card overlapping the strip) — keep it inline in the actions row per Decision 10 + spec Step 10c reorder rationale.
- DO NOT auth-gate the storage service methods at the service layer — gate at the component (Step 10d) per spec design.

**Test specifications:**

**Storage service tests (services/__tests__/storage-service.test.ts):**

Add a new `describe('Routine Favorites', () => { ... })` block following the existing `describe('Routines', ...)` block (after line 369):

| Test | Type | Description |
|------|------|-------------|
| returns empty array when wr_routine_favorites is not set | unit | `localStorage.clear()`. Assert `service.getRoutineFavorites()` returns `[]`. |
| toggles routine favorite on and off | unit | `service.toggleRoutineFavorite('routine-1')`. Assert `service.isRoutineFavorited('routine-1') === true` AND `service.getRoutineFavorites()` equals `['routine-1']`. Toggle again. Assert `false` AND `[]`. |
| filters non-string entries defensively (with console.warn) | unit | `localStorage.setItem('wr_routine_favorites', JSON.stringify(['valid-id', 123, null, 'another-valid-id']))`. Spy on `console.warn`. Assert `service.getRoutineFavorites()` equals `['valid-id', 'another-valid-id']` AND warn was called. |
| returns empty array when wr_routine_favorites holds invalid JSON | unit | `localStorage.setItem('wr_routine_favorites', 'not valid json')`. Assert `service.getRoutineFavorites()` returns `[]`. |

Use `LocalStorageService` instances (consistent with existing test patterns: `let service: LocalStorageService` in `beforeEach`).

**RoutineCard tests (components/music/__tests__/RoutineCard.test.tsx):**

Add a new `describe('Step 10 — Favorite button', ...)` block. Mock `storageService` directly via `vi.mock('@/services/storage-service', ...)`:

```tsx
const mockToggleRoutineFavorite = vi.fn()
const mockIsRoutineFavorited = vi.fn().mockReturnValue(false)

vi.mock('@/services/storage-service', () => ({
  storageService: {
    isRoutineFavorited: (id: string) => mockIsRoutineFavorited(id),
    toggleRoutineFavorite: (id: string) => mockToggleRoutineFavorite(id),
    getRoutineFavorites: vi.fn().mockReturnValue([]),
  },
}))
```

| Test | Type | Description |
|------|------|-------------|
| renders favorite button with default unfavorited state | unit | `mockIsRoutineFavorited.mockReturnValue(false)`. Render. Find `screen.getByRole('button', { name: /^Favorite Evening Peace$/ })`; assert `aria-pressed="false"` AND className contains `bg-white/10`. |
| renders favorite button with favorited state when isRoutineFavorited returns true | unit | `mockIsRoutineFavorited.mockReturnValue(true)`. Render. Find `screen.getByRole('button', { name: /^Unfavorite Evening Peace$/ })`; assert `aria-pressed="true"` AND className contains `bg-pink-500/15`. |
| toggles favorite state on click when authenticated | unit | `mockIsAuthenticated = true`, `mockIsRoutineFavorited.mockReturnValue(false)`. Render. Click favorite button. Assert `mockToggleRoutineFavorite` called with `routine.id`. After click, button label changes to `/^Unfavorite/`. |
| opens auth modal on click when unauthenticated | unit | `mockIsAuthenticated = false`. Render. Click favorite button. Assert `mockOpenAuthModal` called with `'Sign in to favorite routines'`. Assert `mockToggleRoutineFavorite` NOT called. |
| favorite button has 44x44 touch target | unit | Find favorite button; className contains `h-11` AND `w-11`. |

**Expected state after completion:**
- [ ] `wr_routine_favorites` key constant added in `KEYS`
- [ ] `StorageService` interface gains 3 favorites methods
- [ ] `LocalStorageService` implements 3 methods (NOT auth-gated at service layer)
- [ ] RoutineCard imports `Heart` from lucide
- [ ] RoutineCard has favorite button between Start and Kebab
- [ ] Auth gate at component layer with "Sign in to favorite routines" subtitle
- [ ] Visual flag only (no reorder)
- [ ] RoutinesPage.test.tsx mock extended (3 new methods)
- [ ] `.claude/rules/11-local-storage-keys.md` updated
- [ ] 4 storage tests + 5 RoutineCard tests pass

---

### Step 11: RoutineCard sleep-timer Moon glyph

**Objective:** Add a small Moon icon next to the duration meta line when `routine.sleepTimer.durationMinutes > 0`. Signals "this is a bedtime routine with a timer."

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — modify the meta `<p>` (line 139-141)

**Details:**

`Moon` is already imported at line 2. Modify the meta `<p>` at lines 139-141:

**Before:**
```tsx
<p className="mt-2 text-xs text-white/60">
  {routine.steps.length} steps &middot; ~{durationEstimate} min
</p>
```

**After:**
```tsx
<p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
  {routine.sleepTimer && routine.sleepTimer.durationMinutes > 0 && (
    <Moon size={12} className="text-violet-300" aria-hidden="true" />
  )}
  <span>
    {routine.steps.length} steps &middot; ~{durationEstimate} min
  </span>
</p>
```

The `<p>` becomes a `flex items-center` container so Moon + text align inline. `gap-1.5` between glyph and text. The text is wrapped in `<span>` so JSX rendering is consistent whether or not the Moon glyph is present.

**Note on alignment:** Current `<p>` is a block element with no flex. After this edit, it becomes `flex items-center` (left-aligned, since the card content is left-aligned by default — `text-center` is on the hero section, not on the card). The card is currently left-aligned inside its `p-5` padding, so `flex items-center` matches the existing visual flow.

**Pre-execution verification:**
- `Moon` icon already imported (line 2).
- `routine.sleepTimer` shape: `{ durationMinutes: number; fadeDurationMinutes: number }` — verified at `types/storage.ts:49`. Always present on `RoutineDefinition` (no optional `?`).
- Defensive check `routine.sleepTimer && ...` covers the unlikely case of malformed data.

**Auth gating:** N/A.

**Responsive behavior:** Moon glyph renders at same `size={12}` at all breakpoints.

**Inline position expectations:** Moon + meta text inline via `flex items-center gap-1.5`. Single line at all breakpoints.

**Edge cases:**
- `routine.sleepTimer` undefined or null → no Moon glyph (defensive).
- `routine.sleepTimer.durationMinutes === 0` → no Moon glyph.
- All 4 templates have `sleepTimer.durationMinutes > 0` (verified: Evening Peace 45 min, Scripture & Sleep 30 min, Deep Rest 90 min, Bible Before Bed 30 min — see `data/music/routines.ts`). All 4 templates render Moon glyphs.
- (Note: spec Step 11 § "Edge cases" mentions Evening Peace 30 min, but the actual file shows 45 min — minor recon discrepancy, doesn't affect plan logic.)

**Guardrails (DO NOT):**
- DO NOT change duration calculation logic (`estimateDuration` preserved).
- DO NOT add a tooltip on the Moon glyph (decorative only).
- DO NOT use `text-violet-400` or other shade — `text-violet-300` matches "Now playing" chip + "Your routines" eyebrow palette.
- DO NOT use a different icon (must be `Moon`).
- DO NOT change icon size (must be `size={12}`).

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|------|------|-------------|
| Routine with sleep timer renders Moon glyph in meta line | unit | Render with `sleepTimer: { durationMinutes: 30, fadeDurationMinutes: 10 }`. Find the meta `<p>` (the one containing "steps"); query for `svg[aria-hidden="true"]` inside it; assert it has class `text-violet-300`. |
| Routine without sleep timer (durationMinutes=0) does NOT render Moon glyph | unit | Render with `sleepTimer: { durationMinutes: 0, fadeDurationMinutes: 0 }`. The meta `<p>` has NO Moon svg. |
| Routine with undefined sleepTimer does NOT render Moon glyph | unit | (Type-coerce: cast routine to bypass strict checks, OR rely on the truthy check.) Defensive — no Moon. |
| Moon glyph is aria-hidden | unit | When rendered, has `aria-hidden="true"`. |

**Expected state after completion:**
- [ ] Moon glyph conditionally renders next to meta line
- [ ] Meta `<p>` is now `flex items-center gap-1.5`
- [ ] All 4 templates show Moon (sleep timer enabled)
- [ ] User routines show Moon only when sleep timer is enabled
- [ ] 4 test assertions pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | RoutinesPage hero starfield overlay + a11y (`aria-labelledby`, h1 `id`) |
| 2 | 1 (hero structure modified) | RoutinesPage adaptive pre-h1 greeting |
| 3 | 1 (a11y added in Step 1) | Verification only — no code change |
| 4 | — | Section eyebrow promotion ("Your routines") |
| 5 | — (parallelizable with Steps 1-4 on RoutinesPage if batched) | RoutineCard `isActive` prop wiring (RoutinesPage side); requires Step 8a's prop interface to land in RoutineCard for clean TypeScript compile |
| 6 | — (parallelizable on RoutineCard.tsx) | RoutineCard step icon per-type tints |
| 7 | — | RoutineCard scene-color top strip |
| 8 | 5 (prop introduced; Step 8a fulfills it) | RoutineCard active-routine treatment (border + chip) |
| 9 | — | RoutineCard Start CTA quieting |
| 10 | — | Favorite button + storage favorites API + RoutinesPage test mock + 11-local-storage-keys.md docs |
| 11 | — | Sleep-timer Moon glyph |

**Suggested execution order (batched):**

1. **Pass 1 — RoutinesPage** (Steps 1, 2, 3 verify, 4, 5): one edit pass on `RoutinesPage.tsx` covering starfield + a11y + greeting + eyebrow + isActive prop wiring. Run `pnpm test pages/__tests__/RoutinesPage.test.tsx`.
2. **Pass 2 — Storage service** (Step 10a, 10b, 10c, plus 10g docs): one edit pass on `services/storage-service.ts` + `.claude/rules/11-local-storage-keys.md`. Run `pnpm test services/__tests__/storage-service.test.ts`.
3. **Pass 3 — RoutineCard** (Steps 6, 7, 8, 9, 10d-10e, 11): one edit pass on `components/music/RoutineCard.tsx`. Update `RoutineCard.test.tsx` (Step 9 test rename + Step 6/7/8/10/11 new tests). Run `pnpm test components/music/__tests__/RoutineCard.test.tsx`.
4. **Pass 4 — Cross-cutting test fixups** (Step 10f): update `RoutinesPage.test.tsx` storage-service mock. Re-run all three test files.
5. **Pass 5 — Full regression**: `pnpm test` to confirm baseline (≥9,470 pass / 1 known fail). Verify no NEW failures.

This batching matches the spec's recommendation in § "Step Dependency Map".

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Hero starfield overlay + a11y additions | [COMPLETE] | 2026-05-07 | RoutinesPage.tsx |
| 2 | Adaptive pre-h1 greeting | [COMPLETE] | 2026-05-07 | RoutinesPage.tsx |
| 3 | A11y verification (no code change) | [COMPLETE] | 2026-05-07 | No code change |
| 4 | Section eyebrow promotion | [COMPLETE] | 2026-05-07 | RoutinesPage.tsx |
| 5 | `isActive` prop wiring (RoutinesPage side) | [COMPLETE] | 2026-05-07 | RoutinesPage.tsx |
| 6 | RoutineCard step icon per-type tints | [COMPLETE] | 2026-05-07 | RoutineCard.tsx, RoutineCard.test.tsx |
| 7 | RoutineCard scene-color top strip | [COMPLETE] | 2026-05-07 | RoutineCard.tsx, RoutineCard.test.tsx |
| 8 | RoutineCard active-routine treatment | [COMPLETE] | 2026-05-07 | RoutineCard.tsx, RoutineCard.test.tsx |
| 9 | RoutineCard Start CTA quieting | [COMPLETE] | 2026-05-07 | RoutineCard.tsx, RoutineCard.test.tsx |
| 10 | Favorite button + storage favorites API + docs | [COMPLETE] | 2026-05-07 | storage-service.ts, RoutineCard.tsx, RoutineCard.test.tsx, RoutinesPage.test.tsx, 11-local-storage-keys.md |
| 11 | Sleep-timer Moon glyph | [COMPLETE] | 2026-05-07 | RoutineCard.tsx, RoutineCard.test.tsx |
