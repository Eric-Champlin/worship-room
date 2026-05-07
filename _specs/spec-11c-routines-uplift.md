# Spec 11c — RoutinesPage Atmospheric Uplift

**Branch:** `forums-wave-continued`
**Cluster:** Music (follows 11A + 11B + 6-patch round)
**Posture:** Visual + light behavioral (favorites read/write, active-routine query). Audio engine + schemas read-only.
**Direction doc:** locked in chat — recap in Section "Direction summary" below.
**Recon:** `_plans/recon/routines-redesign-2026-05-06.md`

---

## Problem statement

After Spec 11B + 6-patch round, `/music/routines` migrated cleanly but reads as structurally underdesigned compared to peer surfaces. The biggest gap, per recon Closing Note #1: a user clicks "Build a Bedtime Routine" on MusicPage's Sleep tab (which ships ~8 atmospheric tiers) and lands on RoutinesPage (one tier — the card grid). The card-level visual chrome is canonical but carries no bedtime metaphor forward from the page that linked here.

Spec 11c addresses three gaps:

1. **Hero atmosphere** — add the bedtime metaphor visually (subtle starfield overlay) and personalize via adaptive pre-h1 greeting line (Insights pattern).
2. **Card per-type identity** — adopt the cyan/amber/violet palette already present in RoutineBuilder so step icons differentiate scene/scripture/story.
3. **Card atmospheric continuity** — surface the routine's first scene as a 1px-tall gradient strip on each card, derived from `SCENE_BY_ID` lookup. This is the primary hook back to the Sleep-tab visual language.

Plus four smaller polish items: section eyebrow promotion when user has routines, active-routine card treatment, Start CTA quieting, favorite affordance.

---

## Direction summary (locked)

Numbered decisions from chat, copied here for execution reference:

1. Hero atmospheric: keep `ATMOSPHERIC_HERO_BG` + add subtle starfield overlay (5–7 small white radial dots, no animation).
2. Hero structure: add adaptive pre-h1 greeting line (Insights pattern). Three states (copy below in Step 2).
3. Heading size stays `text-3xl/4xl/5xl` — calmness > magnitude.
4. A11y: add `aria-labelledby="routines-heading"` to hero `<section>` + `id="routines-heading"` on h1.
5. Eyebrows: "Templates" stays muted; "Your routines" gets violet leading dot + `text-violet-300` (when `hasUserRoutines`).
6. Step icons: cyan/amber/violet trio from RoutineBuilder. Per-type background tint at icon container.
7. Card top strip: 1px-tall scene-color gradient derived from `SCENE_BY_ID` lookup of routine's first scene step.
8. Active routine treatment: `border-primary/40` override + "Now playing" chip with **static** dot (no pulse).
9. Start CTA per-card: quieted to peer-tier (`px-6 py-2.5 text-sm` + `min-h-[44px]`). Create Routine CTA stays showstopper.
10. Favorite button top-right (visual flag only — no reorder behavior).
11. Sleep-timer iconography: small Moon glyph next to duration meta when `sleepTimer.durationMinutes > 0`.
12. Empty-state hint placement: keep current.
13. Mobile gap-4: keep.
14. RoutineBuilder + ContentPicker + DeleteRoutineDialog + RoutineStepCard: NO CHANGES.
15. Decision 13 from 11A direction (no `FeatureEmptyState` for templates) STAYS.
16. 4 routine templates in `data/music/routines.ts`: NO content changes.

---

## Affected frontend routes

- `/music/routines` — full surface

No new routes. No route-level changes to `App.tsx`.

---

## Architecture context

### Files this spec touches (production)

- `frontend/src/pages/RoutinesPage.tsx` — Steps 1, 2, 3, 4, 5
- `frontend/src/components/music/RoutineCard.tsx` — Steps 6, 7, 8, 9, 10, 11
- `frontend/src/services/storage-service.ts` — Step 10 (favorites read/write API)
- `frontend/src/types/storage.ts` — Step 10 (add `wr_routine_favorites` constant; no schema change to `RoutineDefinition`)

### Files this spec touches (tests)

- `frontend/src/pages/__tests__/RoutinesPage.test.tsx` (post-6-patch, EXISTS) — extend
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` (post-11B, EXISTS) — extend
- `frontend/src/services/__tests__/storage-service.test.ts` (post-6-patch, EXISTS) — extend (3 favorites tests)

### Files this spec does NOT touch (preservation)

- `RoutineBuilder.tsx` / `ContentPicker.tsx` / `DeleteRoutineDialog.tsx` / `RoutineStepCard.tsx` — chrome migrated cleanly in 11A/11B; recon found no density gaps. Out of scope.
- `AudioProvider.tsx` / `audioReducer.ts` / `lib/audio-engine.ts` — Decision 24 read-only.
- `hooks/useRoutinePlayer.ts` — engine API stays read-only. Spec 11c consumes existing `startRoutine` / `endRoutine`.
- `data/music/routines.ts` (4 templates) — content unchanged.
- `data/scene-backgrounds.ts` — read-only consumer (lookup `SCENE_BY_ID` for top-strip gradient derivation).

### Patterns to follow

- **Adaptive narrative subtitle:** `pages/Insights.tsx` has the canonical pattern at the `narrativeSubtitle` `useMemo` (recon Section G.2). RoutinesPage adapts by user state.
- **Pre-h1 greeting line:** `pages/Insights.tsx` `<p className="mb-2 text-sm text-white/50">{greeting}, {user.name}!</p>` — verbatim chrome, RoutinesPage gets its own three-state copy.
- **Eyebrow with violet leading dot:** Tier 1 FrostedCard `variant="accent"` — search for `tracking-[0.15em]` in the codebase to find the canonical class string. Recon Section F notes the spec.
- **Per-type chip pattern:** `bg-violet-500/15 text-violet-300` from `BedtimeStoryCard` / `ScriptureSessionCard`.
- **TonightScripture ring accent:** `border-2 border-primary/40` for "centerpiece" treatment — used here for active routine.
- **BibleSleepSection top-strip:** `<div className="h-1 bg-gradient-to-r from-amber-500 to-purple-600" />` is the visual idiom; RoutineCard adapts it per-routine via scene lookup.
- **Starfield idiom:** `data/scene-backgrounds.ts` `starfield` scene has the dot pattern. Re-create as a CSS `radial-gradient` overlay on the hero.

### Critical pre-execution recon notes

- **Per-type palette already in codebase.** `RoutineBuilder.tsx:227-241` (Add Step type-picker chips) and `RoutineStepCard.tsx` `BORDER_COLOR_MAP` use cyan / amber / violet. RoutineCard step icons currently render neutral gray. Spec 11c surfaces the existing palette on RoutineCard step icons — no new design tokens.
- **`SCENE_BY_ID` in `data/scene-backgrounds.ts`** is the lookup for scene gradient. The `step.contentId` for scene steps maps to scene IDs (e.g., `still-waters`, `midnight-rain`). Recon confirmed.
- **`useAudioState()` already imported in RoutinesPage** post-6-patch (Step 5 of 11B added it). Step 8 of 11c reuses this hook — no new imports needed in RoutinesPage. RoutineCard receives `isActive` as a prop derived in RoutinesPage.
- **`bible-navigate` step type** collapses to scripture treatment (cyan no, amber yes). Per direction Decision 6.
- **`text-glow-cyan` token caveat:** still used by RoutineBuilder. Spec 11c reuses it for scene step icons. If future cluster migrates RoutineBuilder away from cyan, RoutineCard step icons follow at the same time.

---

## Auth gating checklist

| Action | Auth required | Path |
|---|---|---|
| Tap Start on a template | NO | `useRoutinePlayer.startRoutine()` — runs for both auth states |
| Tap Start on a user routine | YES | (User routines only render when authenticated — gate at fetch) |
| Tap Create Routine | YES | `useAuthModal.openAuthModal()` if `!isAuthenticated` |
| Tap kebab → Edit | YES | (Only renders on user routines, which only render when authenticated) |
| Tap kebab → Duplicate | YES | Same |
| Tap kebab → Delete | YES | Same |
| Tap Clone (template kebab) | YES | `useAuthModal.openAuthModal()` if `!isAuthenticated` |
| **Tap Favorite (NEW — Step 10)** | **YES** | `useAuthModal.openAuthModal()` if `!isAuthenticated`; otherwise toggle `wr_routine_favorites` |

All gates preserved through 11c chrome edits. Step 10 introduces ONE new auth gate (Favorite button on logged-out users).

---

## Design system values

| Token | Value | Source |
|---|---|---|
| Hero greeting line class | `mb-2 text-sm text-white/50` | Insights pattern (recon B.2) |
| Hero h1 (existing) | `style={GRADIENT_TEXT_STYLE}` + `text-3xl font-bold sm:text-4xl lg:text-5xl pb-2` + `id="routines-heading"` | Preserved + a11y fix |
| Hero subtitle (existing) | `text-base text-white/60 sm:text-lg` | Preserved |
| Starfield overlay | `pointer-events-none absolute inset-0` with CSS `radial-gradient` (5-7 dots) at varied opacity 0.05–0.15 — see Step 1 for exact CSS | New, derived from `starfield` scene gradient idiom |
| Eyebrow muted (Templates) | `text-xs text-white/60 uppercase tracking-wider mb-3 mt-4` | Post-6-patch canonical |
| Eyebrow accent (Your routines) | Container with violet leading dot + `text-violet-300 font-semibold tracking-[0.15em] text-xs uppercase mb-3 mt-8 sm:mt-10` — see Step 4 for exact JSX | Tier 1 FrostedCard `variant="accent"` pattern |
| Step icon — scene | `bg-glow-cyan/15 text-glow-cyan` (container 24×24 round, icon 12×12) | RoutineBuilder palette |
| Step icon — scripture | `bg-amber-400/15 text-amber-400` | RoutineBuilder palette |
| Step icon — story | `bg-primary-lt/15 text-primary-lt` | RoutineBuilder palette |
| Step icon — bible-navigate | (collapses to scripture treatment) | Decision 6 |
| Card top strip (when scene step exists) | `h-1 w-full bg-gradient-to-r` + inline style derived from `SCENE_BY_ID` | New per-routine derivation |
| Active routine card border override | `border-primary/40` (overrides default `border-white/[0.12]`) | TonightScripture pattern |
| Active routine "Now playing" chip | `inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300` + static violet dot | New, replaces Template badge slot when `isActive` |
| Card Start CTA (per-card, quieted) | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark` | Quieted from Pattern 2 — same chrome, smaller size |
| Create Routine CTA (page-level, showstopper preserved) | (Existing 11B Pattern 2 class string — DO NOT change) | Hierarchy preservation |
| Favorite button | Heart icon (lucide), 32×32 round, `bg-white/10 hover:bg-white/15 text-white/60 hover:text-white/80` for unfav state; `bg-pink-500/15 text-pink-300 fill-pink-300` for fav state | New |
| Sleep-timer Moon glyph | Moon icon (lucide) `size={12} className="text-violet-300"` inline before duration text | New |

---

## Shared data models (read-only consumers)

- `RoutineDefinition` (`types/storage.ts`) — UNCHANGED. No new fields.
- `AudioRoutine` (`types/audio.ts`) — read-only via `useAudioState().activeRoutine?.routineId`.
- `Scene` from `data/scene-backgrounds.ts` — read-only consumer for top-strip gradient.
- `SCENE_BY_ID` lookup function — used in `RoutineCard` to derive top strip from `routine.steps[0].contentId` when first step type is `scene`.

### NEW persistence (Step 10)

- `wr_routine_favorites` localStorage key
- Type: `string[]` of routine IDs
- API in `storageService`:
  - `getRoutineFavorites(): string[]` — defensive read with `Array.isArray` filter
  - `toggleRoutineFavorite(routineId: string): void` — toggle membership in the array
  - `isRoutineFavorited(routineId: string): boolean` — convenience check

This is a NEW key, not a modification to existing schemas. Decision 25 (`wr_listening_history` read-only) stays.

---

## Responsive structure

- **Desktop (≥1024px):** 3-column card grid (`lg:grid-cols-3`). Hero centered with starfield overlay. Per-card top strip + Start CTA + favorite button + kebab visible.
- **Tablet (≥640px, <1024px):** 2-column card grid (`sm:grid-cols-2`). Hero same. Cards same.
- **Mobile (<640px):** 1-column card grid. Hero same (heading at `text-3xl`). Cards stack with gap-4. Start CTA, kebab, favorite button all preserved at 44×44 touch targets.

---

## Inline element position expectations

- Hero: greeting (line 1) → h1 (line 2) → subtitle (line 3). Vertical stack, centered. No wrap concerns at any breakpoint.
- Card top strip: full-width 1px tall, sits above all card content (same plane as `rounded-2xl` border, but a separate element inside the card with `rounded-t-2xl` to clip).
- Card actions row (Start + favorite + kebab): `flex items-center gap-2`. Start button left, favorite + kebab pushed right via `ml-auto`. No wrap at any breakpoint (Start at `px-6 py-2.5 text-sm` is ~80–90px wide; favorite is 32×32; kebab is 44×44; total ~176px max — fits in mobile card width 343px easily).
- "Now playing" chip occupies the Template-badge slot when `isActive` — same position (top-left of card body, mb-2 spacer to title).

---

## Vertical rhythm

- Hero pre-h1 greeting → h1: `mb-2` (8px)
- h1 → subtitle: `mt-4` (16px) — preserved
- Hero section bottom padding: `pb-8 sm:pb-12` — preserved
- Card top strip → first card content: padding starts after the strip (no extra spacer needed since strip is `h-1`)
- Card content internal: preserved (mb-2, mt-1, mt-3, mt-2, mt-4 between rows — see Step 7 for explicit hierarchy)

---

## Assumptions & pre-execution checklist

- [ ] Spec 11A + 11B + 6-patch round shipped (verified — see Spec 11B verification report)
- [ ] `forums-wave-continued` branch active
- [ ] No uncommitted changes in working tree
- [ ] Tests pass before starting (RoutinesPage 22/22, RoutineCard 7/7, storage-service tests passing)
- [ ] `useAudioState` already imported in RoutinesPage post-6-patch
- [ ] `SCENE_BY_ID` lookup confirmed in `data/scene-backgrounds.ts` — verify before Step 7 begins
- [ ] `text-glow-cyan` token still defined in tailwind config — verify before Step 6
- [ ] `text-primary-lt` and `text-amber-400` tokens defined — verify before Step 6

---

## Edge cases & decisions

- **Routine has no scene step at all** (rare — would require a user-built routine with only scripture/story steps). Top strip in Step 7 does NOT render. Card chrome stays default `border-white/[0.12]` with no top strip.
- **Routine is active AND favorited.** "Now playing" chip takes precedence in the Template-badge slot (favorites still visible in top-right corner via favorite button). Both signals coexist.
- **Logged-out user taps favorite.** Auth modal opens (`useAuthModal.openAuthModal()`); favorite NOT persisted until they auth.
- **`wr_routine_favorites` corrupted.** `getRoutineFavorites()` returns `[]` defensively (matches Spec 11B 6-patch defensive pattern for `wr_routines`). Console.warn for visibility.
- **Active routine matches a routine that's been deleted (race).** `state.activeRoutine?.routineId` won't match any rendered routine; no card gets the active treatment. Acceptable.
- **Reduced motion preference set.** Starfield does not animate (it doesn't anyway in v1). "Now playing" dot is static (Decision 8 — no pulse regardless of motion preference). All transitions respect `motion-reduce:transition-none` already on RoutineCard.
- **Tablet breakpoint with single user routine + 4 templates.** "Templates" eyebrow renders, 4-template grid (2 cols), "Your routines" eyebrow renders (with leading dot accent), 1-card grid. Visual rhythm preserved.

---

## Implementation steps

### Step 1: RoutinesPage hero starfield overlay

**Objective:** Add a subtle starfield decorative overlay to the hero `<section>`. CSS-only (no SVG), 5-7 white radial dots at varied opacity, no animation, `pointer-events-none`, `aria-hidden="true"`.

**Files to modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify hero `<section>` to add overlay div

**Details:**

The hero section currently looks like (post-6-patch):

```tsx
<section className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40" style={ATMOSPHERIC_HERO_BG}>
  <Link to="/music" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Music
  </Link>
  <h1 className="px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
    Bedtime Routines
  </h1>
  <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
    End your day in stillness.
  </p>
</section>
```

Add a starfield overlay div as the FIRST child of `<section>`. The overlay uses `position: absolute` to fill the section without affecting layout:

```tsx
<section
  aria-labelledby="routines-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
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
  {/* existing back link, h1, subtitle remain — see Step 2, 3, 4 for further hero changes */}
</section>
```

The starfield uses 7 small radial gradients at varied positions (avoiding the center where the h1 lives). Opacities range 0.08–0.15 — visible against the purple ellipse atmospheric BG without competing with text.

**A11y:** the overlay has `aria-hidden="true"` so screen readers ignore it. The hero `<section>` gains `aria-labelledby="routines-heading"` (added in same step — see Step 2 for the matching `id` on h1).

**Step 1 also adds the a11y fix from Decision 4** to the same section (`aria-labelledby="routines-heading"`).

**Auth gating:** N/A.

**Responsive behavior:** Starfield positions are percentage-based, so they reflow with section dimensions. Visible at all breakpoints.

**Inline position expectations:** Overlay sits behind content (z-stacking via CSS source order — the overlay is the first child, content paints on top). No layout shift.

**Guardrails (DO NOT):**
- Do NOT animate the starfield (Decision 1 explicitly: no animation).
- Do NOT exceed 7 dots (Decision 1: subtle).
- Do NOT use SVG — CSS radial-gradient only.
- Do NOT add `aria-label`; this is decorative.

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Hero section has aria-labelledby | unit | `screen.getByRole('region')` with name "Bedtime Routines" — confirms `aria-labelledby` resolves correctly. Or query the `<section>` directly via `container.querySelector('section[aria-labelledby="routines-heading"]')` and assert presence. |
| h1 has matching id | unit | `screen.getByRole('heading', { level: 1, name: 'Bedtime Routines' })` has `id="routines-heading"` |
| Starfield overlay renders with aria-hidden | unit | Query `container.querySelector('[aria-hidden="true"][class*="pointer-events-none"]')` is in document |

**Expected state after completion:**
- [ ] Starfield overlay rendered as first child of hero section
- [ ] Hero `<section>` has `aria-labelledby="routines-heading"`
- [ ] h1 has `id="routines-heading"`
- [ ] No animation on starfield
- [ ] 3 new test assertions

---

### Step 2: RoutinesPage adaptive pre-h1 greeting line

**Objective:** Add an adaptive pre-h1 greeting line above the existing h1, with three states based on auth + active routine. Mirrors Insights pattern.

**Files to modify:**
- `frontend/src/pages/RoutinesPage.tsx` — derive greeting copy via `useMemo`, render pre-h1

**Details:**

**Step 2a — Derive the greeting copy:**

After the existing hooks block (around line 24-30 post-6-patch), add:

```tsx
const greetingCopy = useMemo(() => {
  if (audioState.activeRoutine) return 'Currently winding down.'
  if (!isAuthenticated) return 'Your bedtime sanctuary.'
  if (userRoutines.length > 0 && user?.name) return `Welcome back, ${user.name}.`
  return 'Your bedtime sanctuary.'
}, [audioState.activeRoutine, isAuthenticated, userRoutines.length, user?.name])
```

Reads:
- `audioState.activeRoutine` from existing `useAudioState()` (already imported post-6-patch)
- `isAuthenticated` from existing `useAuth()` (already imported)
- `userRoutines` from existing data flow (already in scope post-6-patch)
- `user?.name` from `useAuth()` — verify the `user` shape exposes `name`. If not, fall back to `'Welcome back.'`

Verify the actual shape of `useAuth()` return value at execution time. The 6-patch RoutinesPage imports `useAuth` for the `isAuthenticated` flag; if `user.name` isn't directly on that return, derive it from the canonical pattern Insights uses.

**Step 2b — Render the pre-h1 line:**

Inside the hero `<section>`, BEFORE the back-link, add:

```tsx
<p className="mb-2 text-sm text-white/50">
  {greetingCopy}
</p>
```

Then the existing back-link follows (with its `mb-4`), then h1, then subtitle.

Wait — the back-link currently has `mb-4`. With a pre-h1 line above it, the order changes. Re-order:

```tsx
<section aria-labelledby="routines-heading" className="..." style={ATMOSPHERIC_HERO_BG}>
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ /* starfield */ }} />
  <Link to="/music" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Music
  </Link>
  <p className="mb-2 text-sm text-white/50">
    {greetingCopy}
  </p>
  <h1 id="routines-heading" className="..." style={GRADIENT_TEXT_STYLE}>
    Bedtime Routines
  </h1>
  <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
    End your day in stillness.
  </p>
</section>
```

Order: back-link → greeting → h1 → subtitle. The greeting sits between back-link and h1, with `mb-2` separating it from the h1.

**Auth gating:** N/A (read-only auth state derivation).

**Responsive behavior:** Greeting renders at all breakpoints with same `text-sm` size.

**Inline position expectations:** Single-line copy at all breakpoints (longest variant is `Welcome back, {name}.` — bounded by name length; assume reasonable name lengths fit on a single line at 375px).

**Edge cases:**
- If `user.name` is unusually long (>30 chars), the line might wrap on mobile. Acceptable; do not add truncation logic.
- If `audioState.activeRoutine` exists but `routineName` is missing from the audio state shape, the copy "Currently winding down." doesn't reference the name, so this edge case is handled.

**Guardrails (DO NOT):**
- Do NOT include exclamation points in any copy variant (anti-pressure pattern).
- Do NOT pluralize, address explicitly, or add imperatives.
- Do NOT use the routine's name in the active-state copy (intentional simplicity per direction).
- Do NOT add a 4th state.

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Greeting renders 'Your bedtime sanctuary.' when logged out | unit | `mockIsAuthenticated = false`. Assert `screen.getByText('Your bedtime sanctuary.')` is in document. |
| Greeting renders 'Welcome back, {name}.' when logged in with routines | unit | `mockIsAuthenticated = true`, `mockUserName = 'Eric'`, seed 1 user routine. Assert `screen.getByText('Welcome back, Eric.')` is in document. |
| Greeting renders 'Your bedtime sanctuary.' when logged in with no routines | unit | `mockIsAuthenticated = true`, seed 0 user routines. Assert `screen.getByText('Your bedtime sanctuary.')` (fallback). |
| Greeting renders 'Currently winding down.' when active routine | unit | Set `mockActiveRoutine = { routineId: 'x', routineName: 'y' }`. Assert `screen.getByText('Currently winding down.')`. Active state takes precedence over auth/routines state. |

**Expected state after completion:**
- [ ] `greetingCopy` derived via useMemo with three states
- [ ] Pre-h1 line rendered with `mb-2 text-sm text-white/50` chrome
- [ ] Back-link → greeting → h1 → subtitle order in hero
- [ ] 4 new test assertions

---

### Step 3: RoutinesPage hero a11y fix (already partially in Step 1)

**Objective:** Confirm `aria-labelledby="routines-heading"` is on the hero `<section>` and `id="routines-heading"` is on the h1.

This was added in Step 1 alongside the starfield. This step is a **verification-only** step in the dependency map — no separate code edit. Listed for traceability against Direction Decision 4.

If for any reason Step 1's structural changes lose the `aria-labelledby` attribute or h1 `id`, restore them in Step 3.

**Test specifications:** Covered in Step 1 tests.

**Expected state after completion:**
- [ ] `aria-labelledby` confirmed on hero section
- [ ] `id` confirmed on h1
- [ ] No additional code changes beyond Step 1

---

### Step 4: RoutinesPage section eyebrow promotion

**Objective:** Promote "Your routines" eyebrow to centerpiece tier with violet leading dot + `text-violet-300`. Keep "Templates" eyebrow muted.

**Files to modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify the conditional eyebrow render block

**Details:**

Current state (post-6-patch, around lines 184-202):

```tsx
{hasUserRoutines && <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-4">Templates</h2>}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {ROUTINE_TEMPLATES.map(renderRoutineCard)}
</div>
{hasUserRoutines && (
  <>
    <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 mt-8 sm:mt-10">Your routines</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{userRoutines.map(renderRoutineCard)}</div>
  </>
)}
```

Modify the "Your routines" eyebrow ONLY. Replace the second `<h2>` with:

```tsx
<h2 className="mb-3 mt-8 sm:mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-violet-300 font-semibold">
  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
  Your routines
</h2>
```

Changes:
- `text-white/60` → `text-violet-300`
- `tracking-wider` → `tracking-[0.15em]` (matches Tier 1 FrostedCard accent variant)
- Adds `font-semibold`
- Adds violet leading dot (1.5×1.5 round, `bg-violet-400`, with `aria-hidden`)

The "Templates" eyebrow (first `<h2>`) stays exactly as-is post-6-patch — muted curatorial scaffolding.

**Auth gating:** N/A.

**Responsive behavior:** Same as post-6-patch. The leading dot + tighter tracking renders identically at all breakpoints.

**Inline position expectations:** Dot + label inline, `gap-2` between. Single-line at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT change "Templates" eyebrow chrome (stays muted).
- Do NOT add a leading dot to "Templates."
- Do NOT change the conditional rendering — both eyebrows still gated on `hasUserRoutines`.
- Do NOT change spacing constants (`mb-3 mt-8 sm:mt-10`) — preserved.

**Test specifications (RoutinesPage.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Templates eyebrow stays muted | unit | When `hasUserRoutines === true`, the "Templates" h2 has className containing `text-white/60` and NOT `text-violet-300`. |
| Your routines eyebrow has violet leading dot | unit | When `hasUserRoutines === true`, find the "Your routines" h2 and assert it contains a child span with className containing `bg-violet-400` and attribute `aria-hidden="true"`. |
| Your routines eyebrow uses violet text + tighter tracking | unit | When `hasUserRoutines === true`, the "Your routines" h2 className contains `text-violet-300` AND `tracking-[0.15em]` AND `font-semibold`. |
| Empty state still suppresses both eyebrows | unit | When `hasUserRoutines === false`, neither "Templates" nor "Your routines" h2 renders (existing 6-patch behavior preserved). |

**Expected state after completion:**
- [ ] "Your routines" eyebrow chrome migrated to centerpiece tier
- [ ] "Templates" eyebrow unchanged
- [ ] Leading dot a11y-hidden
- [ ] Empty-state behavior preserved
- [ ] 4 test assertions (1 new, 3 verifying preservation/migration)

---

### Step 5: RoutinesPage `isActive` prop derivation per card

**Objective:** Compute `isActive` for each rendered RoutineCard so it can apply active-routine treatment. RoutinesPage already has `audioState` in scope post-6-patch; pass `isActive={audioState.activeRoutine?.routineId === routine.id}` to each card.

**Files to modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify the `renderRoutineCard` helper

**Details:**

Current state (post-6-patch — `renderRoutineCard` helper around lines 145-165, exact line varies):

```tsx
const renderRoutineCard = (routine: RoutineDefinition) => (
  <RoutineCard
    key={routine.id}
    routine={routine}
    onStart={handleStart}
    onClone={handleClone}
    onEdit={handleEdit}
    onDuplicate={handleDuplicate}
    onDelete={handleDelete}
  />
)
```

Modify to add `isActive` prop:

```tsx
const renderRoutineCard = (routine: RoutineDefinition) => (
  <RoutineCard
    key={routine.id}
    routine={routine}
    isActive={audioState.activeRoutine?.routineId === routine.id}
    onStart={handleStart}
    onClone={handleClone}
    onEdit={handleEdit}
    onDuplicate={handleDuplicate}
    onDelete={handleDelete}
  />
)
```

**RoutineCard interface change:** Add `isActive?: boolean` to props (default `false`). This is implemented in Step 8.

**Auth gating:** N/A (read-only state derivation).

**Responsive behavior:** N/A.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT mutate `audioState.activeRoutine` — read-only.
- Do NOT add a fallback that always treats the routine as active when no active routine exists.

**Test specifications:** Coverage via Step 8 RoutineCard tests (which exercise the `isActive` prop directly). RoutinesPage.test.tsx adds:

| Test | Type | Description |
|---|---|---|
| Active routine card receives isActive=true prop | unit | Set `mockActiveRoutine = { routineId: 'evening-peace' }`. Assert the rendered RoutineCard for `'evening-peace'` has the active treatment (verify by querying for "Now playing" chip text within that card's DOM subtree). |
| Non-active routines receive isActive=false (no chip) | unit | Same active state as above. Other routine cards do NOT contain "Now playing" text. |

**Expected state after completion:**
- [ ] `isActive` prop passed per card
- [ ] No mutation of `audioState`
- [ ] 2 test assertions in RoutinesPage tests

---

### Step 6: RoutineCard step icons — per-type color identity

**Objective:** Replace neutral gray step icon backgrounds with per-type cyan/amber/violet tint. Adopt the existing RoutineBuilder palette.

**Files to modify:**
- `frontend/src/components/music/RoutineCard.tsx` — modify the step-icon render block

**Details:**

Current state (line ~98-99 post-11B):

```tsx
<div className="mt-3 flex items-center gap-1.5">
  {routine.steps.map((step) => (
    <span
      role="img"
      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10"
      aria-label={step.type}
      key={/* ... */}
    >
      <Icon size={12} className="text-white/60" aria-hidden="true" />
    </span>
  ))}
</div>
```

Add a `STEP_ICON_TINT_MAP` constant at the top of the file (after imports):

```tsx
const STEP_ICON_TINT_MAP: Record<string, { container: string; icon: string }> = {
  scene: { container: 'bg-glow-cyan/15', icon: 'text-glow-cyan' },
  scripture: { container: 'bg-amber-400/15', icon: 'text-amber-400' },
  story: { container: 'bg-primary-lt/15', icon: 'text-primary-lt' },
  'bible-navigate': { container: 'bg-amber-400/15', icon: 'text-amber-400' }, // collapses to scripture per Direction Decision 6
}

const DEFAULT_STEP_TINT = { container: 'bg-white/10', icon: 'text-white/60' }
```

Modify the step-icon render to use the tint map:

```tsx
<div className="mt-3 flex items-center gap-1.5">
  {routine.steps.map((step, idx) => {
    const tint = STEP_ICON_TINT_MAP[step.type] ?? DEFAULT_STEP_TINT
    const Icon = STEP_ICON_MAP[step.type] ?? /* existing fallback */
    return (
      <span
        role="img"
        className={`flex h-6 w-6 items-center justify-center rounded-full ${tint.container}`}
        aria-label={step.type}
        key={`${step.type}-${idx}`}
      >
        <Icon size={12} className={tint.icon} aria-hidden="true" />
      </span>
    )
  })}
</div>
```

The existing `STEP_ICON_MAP` (Mountain / BookOpen / Moon / BookOpen) stays unchanged — only the tint colors migrate.

**Pre-execution verification:**
- Confirm `text-glow-cyan`, `text-amber-400`, `text-primary-lt` tokens exist in tailwind config.
- Confirm `bg-glow-cyan/15`, `bg-amber-400/15`, `bg-primary-lt/15` resolve correctly.
- If any token is missing, FAIL FAST and surface to user before proceeding (do not invent fallback colors).

**Auth gating:** N/A.

**Responsive behavior:** Step icons render at same 24×24 size at all breakpoints. Tint visible at all sizes.

**Inline position expectations:** Step icons preserved in horizontal flex row with `gap-1.5`. No layout change.

**Guardrails (DO NOT):**
- Do NOT change icon glyphs (Mountain/BookOpen/Moon mapping preserved).
- Do NOT change icon container size (24×24).
- Do NOT change icon size (12×12).
- Do NOT change `bg-white/10` to a different value if the step type isn't in the map — fall back to canonical neutral.
- Do NOT migrate RoutineBuilder's chip colors (out of scope).

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Scene step icon has cyan tint | unit | Render a routine with one scene step. Query for `[role="img"][aria-label="scene"]`; className contains `bg-glow-cyan/15`. Inner icon className contains `text-glow-cyan`. |
| Scripture step icon has amber tint | unit | Same but `aria-label="scripture"`; className contains `bg-amber-400/15` and inner icon `text-amber-400`. |
| Story step icon has violet-lt tint | unit | Same but `aria-label="story"`; className contains `bg-primary-lt/15` and inner icon `text-primary-lt`. |
| Bible-navigate step icon collapses to scripture | unit | Same but `aria-label="bible-navigate"`; className contains `bg-amber-400/15` (NOT cyan, NOT a 4th color). |
| Step icon container size unchanged | unit | All step icons retain `h-6 w-6` regardless of type. |

**Expected state after completion:**
- [ ] `STEP_ICON_TINT_MAP` constant added
- [ ] Step icon containers per-type tinted
- [ ] Step icon glyphs unchanged
- [ ] 5 test assertions

---

### Step 7: RoutineCard scene-color top strip

**Objective:** Add a 1px-tall scene-color gradient strip to the top of each RoutineCard, derived from the routine's first scene step via `SCENE_BY_ID` lookup. If no scene step exists, no strip renders.

**Files to modify:**
- `frontend/src/components/music/RoutineCard.tsx` — add top-strip element + scene derivation logic

**Details:**

**Step 7a — Verify `SCENE_BY_ID` API:**

Read `frontend/src/data/scene-backgrounds.ts` to confirm:
- `SCENE_BY_ID` exists and is a `Record<string, Scene>` lookup
- `Scene` shape includes a CSS-gradient-derivable color set (e.g., `baseColor`, `gradient`, or similar)
- Scene IDs match what `step.contentId` would carry for scene-type steps

If the API differs, adapt — but do NOT mutate `data/scene-backgrounds.ts` itself. Read-only consumer.

**Step 7b — Derive top-strip gradient:**

At the top of `RoutineCard.tsx` (after imports), add a helper:

```tsx
const getRoutineSceneStripGradient = (routine: RoutineDefinition): string | null => {
  const firstSceneStep = routine.steps.find((s) => s.type === 'scene')
  if (!firstSceneStep) return null
  const scene = SCENE_BY_ID[firstSceneStep.contentId]
  if (!scene) return null
  // Scene shape has a gradient or color-trio. Derive a horizontal 2-color CSS gradient.
  // Verify the actual Scene shape during execution and compose a gradient string accordingly.
  // Example shape: `linear-gradient(to right, ${scene.gradientStart}, ${scene.gradientEnd})`
  return /* derived gradient string */
}
```

The exact gradient derivation depends on the `Scene` shape — verify at execution time and compose a 2-color or 3-color horizontal gradient (`to right`).

If the Scene shape only exposes a single base color, derive a strip like:

```tsx
`linear-gradient(to right, ${scene.baseColor}aa, ${scene.baseColor}33)`
```

(alpha hex suffixes — `aa` = ~67% alpha, `33` = ~20% alpha — for a fade-out effect from left to right).

**Step 7c — Render the top strip:**

Inside the RoutineCard JSX, as the FIRST child of the outer `<div>`:

```tsx
<div role="article" className="relative ... rounded-2xl border border-white/[0.12] bg-white/[0.06] ..." /* etc */>
  {topStripGradient && (
    <div
      aria-hidden="true"
      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
      style={{ backgroundImage: topStripGradient }}
    />
  )}
  {/* existing card content (Template badge, name, description, step icons, meta, action row) */}
</div>
```

Where `topStripGradient = useMemo(() => getRoutineSceneStripGradient(routine), [routine])`.

**Note:** The strip uses `absolute top-0` to sit at the very edge of the card without affecting padding. `rounded-t-2xl` clips it to match the card's rounded corners. `aria-hidden` because decorative.

**Auth gating:** N/A.

**Responsive behavior:** Strip is full-width at all breakpoints. Renders identically.

**Inline position expectations:** Strip is the topmost visual element of each card. Card padding (p-5) means content starts well below the strip.

**Edge cases:**
- Routine has only scripture/story steps → `topStripGradient === null` → no strip renders. Card chrome unchanged.
- Routine's first scene step has an `contentId` that isn't in `SCENE_BY_ID` → `topStripGradient === null` → no strip renders. Defensive.
- All 4 templates have scene as first step (verified in `data/music/routines.ts`) — they all get strips.
- User routines may or may not have scene as first step — handled by the `find` lookup.

**Guardrails (DO NOT):**
- Do NOT mutate `data/scene-backgrounds.ts`.
- Do NOT add `Scene` schema fields if a needed property is missing — derive from what's there.
- Do NOT use full-card background tints (only the 1px top strip).
- Do NOT add a left-border or right-border accent (top strip only — Direction Decision 7).
- Do NOT animate the gradient.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Routine with scene first step renders top strip | unit | Render with a routine whose `steps[0]` has `type: 'scene'` and a known `contentId`. Query for `[aria-hidden="true"][class*="rounded-t-2xl"][class*="h-1"]` inside the article — assert presence + has inline `style.backgroundImage` containing `linear-gradient`. |
| Routine without scene step does NOT render top strip | unit | Render with a routine whose steps are all scripture/story. Same query returns null. |
| Routine with unknown scene contentId does NOT render top strip | unit | Render with a routine whose `steps[0].contentId === 'invalid-scene-id'`. Query returns null (defensive). |
| Top strip is rounded to card corners | unit | When strip renders, className contains `rounded-t-2xl`. |
| Top strip is aria-hidden | unit | When strip renders, has attribute `aria-hidden="true"`. |

**Expected state after completion:**
- [ ] `getRoutineSceneStripGradient` helper added
- [ ] Top strip renders conditionally
- [ ] Card chrome otherwise unchanged
- [ ] 5 test assertions

---

### Step 8: RoutineCard active-routine treatment

**Objective:** When `isActive === true`, override the card border to `border-primary/40` and replace the Template badge slot with a "Now playing" chip (static dot, no animation). Preserve a sensible visual when both `isActive` and `routine.isTemplate` are true (Now playing chip wins).

**Files to modify:**
- `frontend/src/components/music/RoutineCard.tsx` — add `isActive` prop, conditional border + badge slot

**Details:**

**Step 8a — Add `isActive` prop:**

Modify `RoutineCardProps`:

```tsx
interface RoutineCardProps {
  routine: RoutineDefinition
  isActive?: boolean // NEW
  onStart: (routine: RoutineDefinition) => void
  onClone: (routine: RoutineDefinition) => void
  onEdit: (routine: RoutineDefinition) => void
  onDuplicate: (routine: RoutineDefinition) => void
  onDelete: (routine: RoutineDefinition) => void
}
```

Default `isActive = false` in the function signature destructure.

**Step 8b — Override border conditionally:**

Modify the outer card `<div>`:

```tsx
<div
  role="article"
  aria-label={routine.name}
  className={`relative rounded-2xl ${
    isActive ? 'border border-primary/40' : 'border border-white/[0.12]'
  } bg-white/[0.06] p-5 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] hover:bg-white/[0.09] hover:border-white/[0.18]`}
>
```

Note: hover `border-white/[0.18]` doesn't override `border-primary/40` for active cards because active cards are typically the one card the user isn't hovering. If the user hovers an active card, `hover:border-white/[0.18]` wins via Tailwind's hover specificity — that's fine; minor edge case.

**Step 8c — Replace Template badge slot conditionally:**

Current Template badge render (line ~108):

```tsx
{routine.isTemplate && (
  <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">
    Template
  </span>
)}
```

Replace with conditional logic — `isActive` takes precedence:

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

User routines with no active state and no Template badge: nothing renders in the badge slot (existing behavior).

**Auth gating:** N/A.

**Responsive behavior:** Chip + dot render identically at all breakpoints.

**Inline position expectations:** Chip occupies the same DOM position as the Template badge (top-left of card body, mb-2 spacer to title). Same layout, different content.

**Guardrails (DO NOT):**
- Do NOT animate the dot (Direction Decision 8 explicitly: static).
- Do NOT change the chip position.
- Do NOT show both Template badge and Now playing chip simultaneously (active state takes precedence).
- Do NOT change card chrome elsewhere — only the border override and badge slot.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Active routine has primary border override | unit | Render with `isActive={true}`. Article element className contains `border-primary/40` and does NOT contain `border-white/[0.12]`. |
| Inactive routine has canonical border | unit | Render with `isActive={false}` (or omit). className contains `border-white/[0.12]` and does NOT contain `border-primary/40`. |
| Active routine renders Now playing chip with static dot | unit | Render with `isActive={true}`. Find element with text "Now playing"; it contains a child span with className containing `bg-violet-400` and attribute `aria-hidden="true"`. |
| Now playing chip dot is NOT animated | unit | The dot span className does NOT contain `animate-` classes. |
| Active routine suppresses Template badge | unit | Render with `isActive={true}` AND `routine.isTemplate === true`. Find element by text "Now playing" (present); element by text "Template" (NOT present). |
| Inactive template renders Template badge | unit | Render with `isActive={false}` AND `routine.isTemplate === true`. "Template" text present; "Now playing" text NOT present. |
| User routine inactive renders neither badge | unit | Render with `isActive={false}` AND `routine.isTemplate === false`. Neither "Template" nor "Now playing" text present. |

**Expected state after completion:**
- [ ] `isActive` prop on RoutineCard
- [ ] Border override conditional
- [ ] Badge slot conditional with active precedence
- [ ] No animation
- [ ] 7 test assertions

---

### Step 9: RoutineCard Start CTA quieting

**Objective:** Reduce per-card Start CTA from showstopper-tier (`px-8 py-3.5 text-base sm:text-lg`) to peer-tier (`px-6 py-2.5 text-sm`). Preserve white-pill chrome canonical otherwise. Touch target `min-h-[44px]` preserved.

**Files to modify:**
- `frontend/src/components/music/RoutineCard.tsx` — modify the Start button class string

**Details:**

Current state (Start button class string from 11B Step 7):

```tsx
<button
  onClick={() => onStart(routine)}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  <Play size={14} fill="currentColor" />
  Start
</button>
```

Replace with quieted class string:

```tsx
<button
  onClick={() => onStart(routine)}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  <Play size={14} fill="currentColor" />
  Start
</button>
```

Changes:
- `px-8 py-3.5` → `px-6 py-2.5`
- `text-base sm:text-lg` → `text-sm` (no responsive bump)
- `shadow-[0_0_30px_rgba(255,255,255,0.20)]` → `shadow-[0_0_20px_rgba(255,255,255,0.15)]`
- `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` → `hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]`

Preserved:
- `min-h-[44px]` (touch target)
- `bg-white` / `text-hero-bg` (chrome)
- Hover, focus-visible, transition
- Play icon

**Important:** Step 9 affects ONLY RoutineCard's Start CTA. The page-level Create Routine CTA in `RoutinesPage.tsx` keeps the SHOWSTOPPER size (Pattern 2 verbatim). Do NOT modify Create Routine CTA.

**Auth gating:** Start CTA preserves auth gate (existing handler — chrome-only edit).

**Responsive behavior:** Same `text-sm` at all breakpoints. No `sm:text-lg` bump (intentional quieting).

**Inline position expectations:** Smaller button leaves more room in the actions row for the favorite button (Step 10) and kebab. Verify in screenshots.

**Guardrails (DO NOT):**
- Do NOT modify the Create Routine CTA in RoutinesPage.tsx.
- Do NOT modify Save Routine CTA in RoutineBuilder (out of scope per Decision 14).
- Do NOT change the Play icon size.
- Do NOT remove `min-h-[44px]`.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Start CTA uses peer-tier sizing | unit | Find Start button by name `/^Start$/` (or `getByRole('button', { name: /Start/ })`); className contains `px-6` AND `py-2.5` AND `text-sm`. |
| Start CTA does NOT use showstopper sizing | unit | Same button; className does NOT contain `px-8` AND does NOT contain `py-3.5` AND does NOT contain `text-lg`. |
| Start CTA preserves min-h-[44px] | unit | className contains `min-h-[44px]`. |
| Start CTA preserves white-pill chrome | unit | className contains `bg-white` AND `rounded-full` AND `text-hero-bg`. |
| Start CTA shadow is quieted | unit | className contains `shadow-[0_0_20px_rgba(255,255,255,0.15)]` (not the showstopper `0_0_30px` value). |

**Expected state after completion:**
- [ ] Start CTA quieted to peer-tier
- [ ] Touch target preserved
- [ ] Chrome canonical preserved
- [ ] Create Routine CTA unchanged in RoutinesPage
- [ ] 5 test assertions

---

### Step 10: Favorite button + storage service favorites API

**Objective:** Add favorite affordance to RoutineCard top-right. Persist to `wr_routine_favorites` localStorage key. Logged-out users tapping favorite open auth modal. Visual flag only (no reorder behavior).

**Files to modify:**
- `frontend/src/types/storage.ts` — add `wr_routine_favorites` key constant
- `frontend/src/services/storage-service.ts` — add `getRoutineFavorites`, `toggleRoutineFavorite`, `isRoutineFavorited`
- `frontend/src/components/music/RoutineCard.tsx` — add favorite button + state + handler
- `frontend/src/services/__tests__/storage-service.test.ts` — extend (3 new tests)
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` — extend (favorite button tests)

**Details:**

**Step 10a — Add storage key constant:**

In `types/storage.ts`, find the `KEYS` constant (or wherever localStorage key strings are centralized — match the canonical pattern in this codebase). Add:

```tsx
export const KEYS = {
  // ... existing keys
  routineFavorites: 'wr_routine_favorites',
} as const
```

If the codebase uses a different pattern for key constants, match it. If keys are scattered as plain strings, add `wr_routine_favorites` consistently with the closest neighbor key (e.g., `wr_routines`).

**Step 10b — Add favorites API to storage-service:**

In `services/storage-service.ts`, add three methods to the `storageService` object:

```tsx
getRoutineFavorites(): string[] {
  try {
    const raw = readJSON<string[]>(KEYS.routineFavorites, [])
    if (!Array.isArray(raw)) {
      console.warn('[storageService] wr_routine_favorites is not an array, returning empty')
      return []
    }
    // Filter to strings only (defensive)
    const valid = raw.filter((id): id is string => typeof id === 'string')
    if (valid.length !== raw.length) {
      console.warn(`[storageService] Filtered ${raw.length - valid.length} non-string entries from wr_routine_favorites`)
    }
    return valid
  } catch (error) {
    console.error('[storageService] Failed to parse wr_routine_favorites, returning empty', error)
    return []
  }
},

toggleRoutineFavorite(routineId: string): void {
  const current = this.getRoutineFavorites()
  const next = current.includes(routineId)
    ? current.filter((id) => id !== routineId)
    : [...current, routineId]
  writeJSON(KEYS.routineFavorites, next)
},

isRoutineFavorited(routineId: string): boolean {
  return this.getRoutineFavorites().includes(routineId)
},
```

Verify the canonical `readJSON` / `writeJSON` helper imports — match the patterns used by `getRoutines` post-6-patch.

**Step 10c — Add favorite button to RoutineCard:**

Add to the top-right of the card (same plane as `position: absolute` if needed, or inside the card content with `ml-auto` in the action row).

Direction picks: place it in the action row (Start button + favorite + kebab), ml-auto on favorite. This avoids overlapping the top strip and keeps a single action affordance row.

Modify the action row (current line ~145+ post-11B):

```tsx
<div className="mt-4 flex items-center gap-2">
  <button onClick={() => onStart(routine)} className="...quieted Start CTA from Step 9...">
    <Play size={14} fill="currentColor" />
    Start
  </button>
  <button
    type="button"
    onClick={handleFavoriteToggle}
    aria-label={isFavorited ? `Unfavorite ${routine.name}` : `Favorite ${routine.name}`}
    aria-pressed={isFavorited}
    className={`ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark ${
      isFavorited
        ? 'bg-pink-500/15 text-pink-300 hover:bg-pink-500/20'
        : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
    }`}
  >
    <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
  </button>
  <div className="relative">{/* existing kebab MoreVertical button + popover */}</div>
</div>
```

Wait — review: the current action row has Start + kebab (with `ml-auto` on kebab to push it right). With favorite added, the layout becomes Start + favorite + kebab. Reorder so the spacing is right:
- Start: left (no `ml-auto`)
- Favorite: middle (no `ml-auto`)
- Kebab: right (gets `ml-auto` to push right)

```tsx
<div className="mt-4 flex items-center gap-2">
  <button /* Start */>...</button>
  <button /* Favorite, NO ml-auto */>...</button>
  <div className="relative ml-auto">{/* Kebab */}</div>
</div>
```

Touch target: 44×44 via `h-11 w-11`. Min size preserved.

**Step 10d — Wire favorite state + handler in RoutineCard:**

Add at the top of RoutineCard component (after props destructure):

```tsx
const { isAuthenticated } = useAuth()
const { openAuthModal } = useAuthModal()
const [isFavorited, setIsFavorited] = useState<boolean>(() =>
  storageService.isRoutineFavorited(routine.id)
)

const handleFavoriteToggle = () => {
  if (!isAuthenticated) {
    openAuthModal()
    return
  }
  storageService.toggleRoutineFavorite(routine.id)
  setIsFavorited((prev) => !prev)
}
```

Verify `useAuth` and `useAuthModal` imports already exist or need to be added. RoutineCard currently imports from auth context for the kebab options — likely already present.

**Step 10e — Add storage service tests:**

```tsx
// services/__tests__/storage-service.test.ts

describe('routine favorites', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty array when wr_routine_favorites is not set', () => {
    expect(storageService.getRoutineFavorites()).toEqual([])
  })

  it('toggles routine favorite on and off', () => {
    storageService.toggleRoutineFavorite('routine-1')
    expect(storageService.isRoutineFavorited('routine-1')).toBe(true)
    expect(storageService.getRoutineFavorites()).toEqual(['routine-1'])

    storageService.toggleRoutineFavorite('routine-1')
    expect(storageService.isRoutineFavorited('routine-1')).toBe(false)
    expect(storageService.getRoutineFavorites()).toEqual([])
  })

  it('filters non-string entries defensively', () => {
    localStorage.setItem(
      'wr_routine_favorites',
      JSON.stringify(['valid-id', 123, null, 'another-valid-id'])
    )
    expect(storageService.getRoutineFavorites()).toEqual(['valid-id', 'another-valid-id'])
  })

  it('returns empty array when wr_routine_favorites is malformed JSON', () => {
    localStorage.setItem('wr_routine_favorites', 'not valid json')
    expect(storageService.getRoutineFavorites()).toEqual([])
  })
})
```

**Step 10f — Add RoutineCard favorite button tests:**

```tsx
it('renders favorite button with default unfavorited state', () => {
  // ... seed wr_routine_favorites = []
  const button = screen.getByRole('button', { name: /Favorite/ })
  expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(button.className).toContain('bg-white/10')
})

it('renders favorite button with favorited state when routine is in wr_routine_favorites', () => {
  // ... seed wr_routine_favorites = [routine.id]
  const button = screen.getByRole('button', { name: /Unfavorite/ })
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(button.className).toContain('bg-pink-500/15')
})

it('toggles favorite state on click when authenticated', () => {
  // ... mockIsAuthenticated = true
  const button = screen.getByRole('button', { name: /Favorite/ })
  fireEvent.click(button)
  expect(storageService.toggleRoutineFavorite).toHaveBeenCalledWith(routine.id)
  // After toggle, button label changes
  expect(screen.getByRole('button', { name: /Unfavorite/ })).toBeInTheDocument()
})

it('opens auth modal on click when unauthenticated', () => {
  // ... mockIsAuthenticated = false
  const button = screen.getByRole('button', { name: /Favorite/ })
  fireEvent.click(button)
  expect(mockOpenAuthModal).toHaveBeenCalledOnce()
  expect(storageService.toggleRoutineFavorite).not.toHaveBeenCalled()
})

it('favorite button has 44x44 touch target', () => {
  const button = screen.getByRole('button', { name: /Favorite/ })
  expect(button.className).toContain('h-11')
  expect(button.className).toContain('w-11')
})
```

**Auth gating:** YES — favorite click is gated on `isAuthenticated`. Logged-out users get auth modal.

**Responsive behavior:** Favorite button is 44×44 at all breakpoints. Action row layout preserved.

**Inline position expectations:** Action row reads Start | Favorite | Kebab from left to right. Favorite + Kebab cluster on the right via `ml-auto` on kebab. No wrap at any breakpoint (Start ~80-90px + Favorite 44px + Kebab 44px + 2× gap-2 (16px) = ~184px max — fits at mobile card width 343px).

**Guardrails (DO NOT):**
- Do NOT reorder favorited routines (visual flag only — Direction Decision 10).
- Do NOT modify `RoutineDefinition` schema.
- Do NOT mutate `wr_routines` storage in this step.
- Do NOT add favorites to user routines and templates separately — same key for both.
- Do NOT animate the heart icon's fill state change (use a clean transition only).

**Test specifications:** See Step 10e + 10f above.

**Expected state after completion:**
- [ ] `wr_routine_favorites` key constant added
- [ ] storage-service has 3 favorites methods
- [ ] RoutineCard has favorite button
- [ ] Auth gate on logged-out tap
- [ ] Visual flag only (no reorder)
- [ ] 4 storage tests + 5 RoutineCard tests

---

### Step 11: RoutineCard sleep-timer Moon glyph

**Objective:** Add a small Moon icon next to the duration meta line when `routine.sleepTimer.durationMinutes > 0`. Signals "this is a bedtime routine with a timer."

**Files to modify:**
- `frontend/src/components/music/RoutineCard.tsx` — modify the meta line

**Details:**

Current state (line ~100 post-11B):

```tsx
<p className="mt-2 text-xs text-white/60">
  {routine.steps.length} steps · ~{durationEstimate} min
</p>
```

Modify to conditionally include Moon glyph:

```tsx
<p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/60">
  {routine.sleepTimer && routine.sleepTimer.durationMinutes > 0 && (
    <Moon size={12} className="text-violet-300" aria-hidden="true" />
  )}
  <span>
    {routine.steps.length} steps · ~{durationEstimate} min
  </span>
</p>
```

Note: `flex items-center justify-center` aligns Moon + text inline. `gap-1.5` between glyph and text.

Wait — the current `<p>` has no `flex` styling. The card is centered text by default? Verify card content alignment in execution. If the card's text isn't centered (left-aligned via natural flow), use `flex items-center` without `justify-center`:

```tsx
<p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
  {routine.sleepTimer && routine.sleepTimer.durationMinutes > 0 && (
    <Moon size={12} className="text-violet-300" aria-hidden="true" />
  )}
  <span>
    {routine.steps.length} steps · ~{durationEstimate} min
  </span>
</p>
```

Verify alignment at execution time and adjust if necessary.

**Pre-execution verification:**
- Confirm the `Moon` icon is already imported in RoutineCard (likely is — used in `STEP_ICON_MAP` for story type).
- Verify `routine.sleepTimer` shape on `RoutineDefinition` — should be `{ durationMinutes: number; fadeDurationMinutes: number }` per recon Section A.5.

**Auth gating:** N/A.

**Responsive behavior:** Moon glyph renders at same size at all breakpoints.

**Inline position expectations:** Moon + meta text inline. Single line at all breakpoints.

**Edge cases:**
- `routine.sleepTimer` is undefined or null (defensive) → no Moon glyph renders. Safe fallback.
- `routine.sleepTimer.durationMinutes === 0` → no Moon glyph renders.
- All 4 templates have `sleepTimer.durationMinutes > 0` (verified — Evening Peace 30 min, Scripture & Sleep 45 min, Deep Rest 60 min, Bible Before Bed 30 min) — they all get Moon glyphs.

**Guardrails (DO NOT):**
- Do NOT change duration calculation logic.
- Do NOT add a tooltip on the Moon glyph (decorative only).
- Do NOT use `text-violet-400` or different shade — use `text-violet-300` to match the "Now playing" chip palette.

**Test specifications (RoutineCard.test.tsx):**

| Test | Type | Description |
|---|---|---|
| Routine with sleep timer renders Moon glyph in meta line | unit | Render with `routine.sleepTimer = { durationMinutes: 30, fadeDurationMinutes: 10 }`. Find the meta `<p>`; query for `svg[aria-hidden="true"]` inside it; assert it has class `text-violet-300`. |
| Routine without sleep timer does NOT render Moon glyph | unit | Render with `routine.sleepTimer = { durationMinutes: 0, fadeDurationMinutes: 0 }`. The meta `<p>` has no Moon svg. |
| Routine with undefined sleepTimer does NOT render Moon glyph | unit | Defensive: if `routine.sleepTimer === undefined`. No Moon. |
| Moon glyph is aria-hidden | unit | When rendered, has `aria-hidden="true"`. |

**Expected state after completion:**
- [ ] Moon glyph conditionally renders next to meta line
- [ ] All 4 templates show Moon (sleep timer enabled)
- [ ] User routines show Moon only when their sleep timer is enabled
- [ ] 4 test assertions

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | RoutinesPage hero starfield overlay + a11y fix |
| 2 | 1 (hero structure) | RoutinesPage adaptive pre-h1 greeting |
| 3 | 1 (a11y added in Step 1) | Verification only — no code change |
| 4 | — | Section eyebrow promotion |
| 5 | — | RoutineCard `isActive` prop wiring (RoutinesPage side) |
| 6 | — | RoutineCard step icon per-type tints |
| 7 | — | RoutineCard scene-color top strip |
| 8 | 5 (prop introduced) | RoutineCard active-routine treatment (border + chip) |
| 9 | — | RoutineCard Start CTA quieting |
| 10 | — | Favorite button + storage favorites API |
| 11 | — | Sleep-timer Moon glyph |

Steps 1–4 can be merged into a single edit pass on RoutinesPage.tsx if executor prefers. Step 5 lives in RoutinesPage.tsx (adds `isActive` prop pass-through). Steps 6–11 each touch RoutineCard.tsx and can be batched into a single multi-edit pass on that file. Step 10 also touches storage-service.ts and types/storage.ts as separate files.

Suggested execution order: Steps 1+2+3+4+5 as one RoutinesPage pass. Step 10's storage-service changes as one pass. Steps 6+7+8+9+10's RoutineCard side+11 as one RoutineCard pass.

---

## Pre-MR checklist

Before opening MR (when Eric is ready to commit):

- [ ] `pnpm test pages/__tests__/RoutinesPage.test.tsx` — all tests pass (existing 22 + new ~10 from this spec)
- [ ] `pnpm test components/music/__tests__/RoutineCard.test.tsx` — all tests pass (existing 7 + new ~25 from this spec)
- [ ] `pnpm test services/__tests__/storage-service.test.ts` — all tests pass (existing + new 4 favorites tests)
- [ ] `pnpm tsc --noEmit -p tsconfig.json` — clean
- [ ] `pnpm lint` — clean
- [ ] `pnpm test` — full suite, no NEW regressions (2 known pre-existing failures inherited from before Spec 11B are acceptable)
- [ ] Visual verification at desktop 1280px AND mobile 375px on `/music/routines`
- [ ] Visual verification of active-routine state (start a routine, navigate to /music/routines, confirm "Now playing" chip + violet border on the matching card)
- [ ] Visual verification of favorited state (favorite a routine, confirm pink heart fill; unfavorite, confirm reverts)
- [ ] DevTools Console — no new errors
- [ ] DevTools Network — no new failed requests
- [ ] Reduced-motion verification (browser prefers-reduced-motion: reduce — confirm no animation regressions)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Hero starfield overlay + a11y fix | [NOT STARTED] | | |
| 2 | Adaptive pre-h1 greeting | [NOT STARTED] | | |
| 3 | A11y verification (no code change) | [NOT STARTED] | | |
| 4 | Section eyebrow promotion | [NOT STARTED] | | |
| 5 | `isActive` prop wiring (RoutinesPage side) | [NOT STARTED] | | |
| 6 | RoutineCard step icon per-type tints | [NOT STARTED] | | |
| 7 | RoutineCard scene-color top strip | [NOT STARTED] | | |
| 8 | RoutineCard active-routine treatment | [NOT STARTED] | | |
| 9 | RoutineCard Start CTA quieting | [NOT STARTED] | | |
| 10 | Favorite button + storage favorites API | [NOT STARTED] | | |
| 11 | Sleep-timer Moon glyph | [NOT STARTED] | | |

---

## Out-of-scope reminder (Decision 14, 15, 16, plus Section H from recon)

- RoutineBuilder.tsx — NO CHANGES
- ContentPicker.tsx — NO CHANGES
- DeleteRoutineDialog.tsx — NO CHANGES
- RoutineStepCard.tsx — NO CHANGES
- AudioProvider, audioReducer, audio-engine — read-only (Decision 24)
- RoutineDefinition schema — unchanged
- AudioRoutine schema — read-only
- 4 routine template content — unchanged
- HorizonGlow on RoutinesPage — DO NOT introduce
- FeatureEmptyState for templates — DO NOT swap (Decision 13)
- wr_session_state.activeRoutine semantics — read-only (Decision 25)
- wr_listening_history schema — read-only (Decision 25)
- BB-26 / BB-27 audio Bible cross-cutting — untouched (Decision 26)

---

## Pipeline

1. Eric reviews this brief
2. `/plan _specs/spec-11c-routines-uplift.md` (CC's plan-from-jira2 or equivalent)
3. `/execute-plan _plans/<plan-filename>`
4. `/verify-with-playwright /music/routines _plans/<plan-filename>`
5. `/code-review _plans/<plan-filename>`
6. Eric commits when satisfied

Stay on `forums-wave-continued`. CC does NOT commit, push, or branch — Eric handles all git operations manually.
