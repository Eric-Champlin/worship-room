# Implementation Plan: Spec 11B — RoutinesPage Round 3 Visual Migration + Active-Routine-Delete Cleanup

**Spec:** `_specs/spec-11b-routines.md`
**Date:** 2026-05-06
**Branch:** `forums-wave-continued` (do NOT branch — spec section "Branch discipline" mandates staying on this branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** `_plans/recon/music-2026-05-06.md` (loaded — covers RoutinesPage stack at Part 1, Part 4, Part 9 audit)
**Direction Document:** `_plans/direction/music-2026-05-06.md` (loaded — Decisions 13, 14, 17, 18, 20 are authoritative for 11B)
**Master Spec Plan:** Spec 11A (`_plans/2026-05-06-spec-11a-music.md`) is the prerequisite that established the cluster patterns 11B applies (loaded)

---

## Affected Frontend Routes

- `/music/routines` — RoutinesPage (logged-out + logged-in). Hero `<h1>` + subtitle migration, Create Routine CTA migration, empty-state hint paragraph addition, `handleDelete` behavioral fix.
- `/music/routines` (when `showBuilder === true`) — RoutineBuilder Save Routine CTA migration; conditional active-state UI verification.
- `/music/routines` (DeleteRoutineDialog open state) — DeleteRoutineDialog already canonical alertdialog (verified — see "Critical Pre-Existing State Findings" below); only border opacity drift may need migration.
- `/music/routines` (ContentPicker open state) — conditional chrome verification.

All other Music-cluster routes (`/music`, the 3 tabs) are out of scope (shipped via Spec 11A, preserved).

---

## CRITICAL — Spec Assumption Errors Discovered During Recon

These deviations from the spec body MUST be incorporated into Step 5's behavioral fix. Surface to the user before execution.

### Error 1: `STOP_ROUTINE` action does NOT exist

The spec body says "dispatch the existing `STOP_ROUTINE` action." Reality: the audio reducer's action type for routine teardown is **`END_ROUTINE`**, not `STOP_ROUTINE`. Verified by reading:

- `frontend/src/types/audio.ts:101` → `| { type: 'END_ROUTINE' }`
- `frontend/src/components/audio/audioReducer.ts:255` → `case 'END_ROUTINE': { ... }`
- `frontend/src/hooks/useRoutinePlayer.ts:453` → `dispatch({ type: 'END_ROUTINE' })` (canonical call site)

`STOP_ROUTINE` returns zero matches across the entire codebase. The spec's prescription is a name typo. Use `END_ROUTINE`.

### Error 2: `state.activeRoutine?.id` does NOT exist

The spec body says "check whether `state.activeRoutine?.id === deletingRoutine.id`." Reality: per `frontend/src/types/audio.ts:38-45`, `AudioRoutine` carries `routineId: string`, not `id`. The spec compares `state.activeRoutine?.id` (always `undefined`) against `deletingRoutine.id` (a `RoutineDefinition.id`); this would never match. The correct field on `AudioRoutine` is **`routineId`**.

```ts
export interface AudioRoutine {
  routineId: string         // ← compare THIS to deletingRoutine.id
  routineName: string
  currentStepIndex: number
  steps: RoutineStep[]
  phase: 'playing' | 'transition-gap' | 'ambient-only'
  sleepTimerConfig: { durationMinutes: number; fadeDurationMinutes: number }
}
```

Confirmed by usage at `useRoutinePlayer.ts:437` (`audioState.activeRoutine.routineId`) and at `audioReducer.ts:255+` (the `END_ROUTINE` branch clears `activeRoutine`).

### Resolution

Step 5 uses the canonical action name and field name: `state.activeRoutine?.routineId === deletingRoutine.id` → `dispatch({ type: 'END_ROUTINE' })`. The cleanup behavior the spec wants — clearing `activeRoutine` from state, the AudioPill / AudioDrawer no longer claiming "Currently in routine: <name>" — is exactly what `END_ROUTINE` already provides. The spec's intent is preserved; only the names are corrected.

**Even cleaner option (recommended):** RoutinesPage already calls `useRoutinePlayer()` for `startRoutine` (line 24). The hook also returns `endRoutine`, which (a) performs the same `dispatch({ type: 'END_ROUTINE' })`, (b) logs the listening session as incomplete via `storageService.logListeningSession`, (c) clears `gapTimerRef`, `currentStepIndexRef`, `routineIdRef`, `routineStartTimeRef`. Calling `endRoutine()` is functionally equivalent for state-cleanup purposes AND avoids leaking refs/timers belonging to the player. **Plan adopts this option:** destructure `endRoutine` from `useRoutinePlayer()` and call it inside `handleDelete` when the active routine matches. Reading `state.activeRoutine?.routineId` still requires `useAudioState()`; the dispatch path is replaced by `endRoutine()`.

This adjustment touches the same lines, has the same semantics the spec wants, and follows the cluster's encapsulation discipline (Direction Decision 24: "no new dispatch call sites; consume the existing engine API"). If the user prefers raw dispatch instead, switch to `dispatch({ type: 'END_ROUTINE' })` + add `useAudioDispatch()` import — both shapes are documented above.

---

## Architecture Context

### Files this spec touches (production)

- `frontend/src/pages/RoutinesPage.tsx` (206 LOC) — Changes 1, 2, 3, 4, 5
- `frontend/src/components/music/RoutineBuilder.tsx` (331 LOC) — Change 6 (Save Routine CTA only; conditional active-state audit)
- `frontend/src/components/music/RoutineCard.tsx` (233 LOC) — Change 7 (Start CTA + Template badge text)
- `frontend/src/components/music/ContentPicker.tsx` (203 LOC) — Change 8 (conditional)
- `frontend/src/components/music/RoutineStepCard.tsx` (83 LOC) — Change 9 (conditional)
- `frontend/src/components/music/DeleteRoutineDialog.tsx` (52 LOC) — Change 10 (conditional)

### Files this spec touches (tests)

- `frontend/src/pages/__tests__/RoutinesPage.test.tsx` (155 LOC, EXISTS) — extend
- `frontend/src/components/music/__tests__/RoutineBuilder.test.tsx` (95 LOC, EXISTS) — extend
- `frontend/src/components/music/__tests__/RoutineCard.test.tsx` (DOES NOT EXIST) — create
- `frontend/src/components/music/__tests__/ContentPicker.test.tsx` (DOES NOT EXIST) — create only if Change 8 applies
- `frontend/src/components/music/__tests__/DeleteRoutineDialog.test.tsx` (DOES NOT EXIST) — create only if Change 10 applies

### Patterns to follow

- **White-pill primary CTA Pattern 2** — verbatim class string from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 and from Spec 11A canonical migration sites. The exact string is in the "Design System Values" table below.
- **Spec 10A canonical alertdialog** — `DeleteAccountModal` at `frontend/src/components/settings/DeleteAccountModal.tsx` is the reference. DeleteRoutineDialog already mirrors it on every count except border opacity (`border-white/10` → `border-white/[0.12]`).
- **Spec 11A muted destructive Cancel button** — `bg-white/10 text-white border border-white/15`. DeleteRoutineDialog's Cancel button at line 37 is already canonical via the `bg-white/10 ... hover:bg-white/15` chrome (verified canonical — see "Critical Pre-Existing State Findings").
- **AudioProvider hooks** — `useAudioState()` for reads, `useAudioDispatch()` for writes. Reference call sites: `frontend/src/components/music/SavedMixCard.tsx:22-23`, `frontend/src/components/daily/AmbientSoundPill.tsx:19-20`. Already imported in `useRoutinePlayer.ts`.
- **Existing test mock pattern for AudioProvider** — `RoutinesPage.test.tsx:41-57` already mocks `useAudioState`, `useAudioDispatch`, `useAudioEngine` via `vi.mock('@/components/audio/AudioProvider', ...)`. Extend the existing mock to control `activeRoutine` per test (the current mock returns `activeRoutine: null` always — Change 5's behavioral tests need to flip it to `{ routineId: '<matching-id>', ... }`).

### Critical Pre-Existing State Findings (vs. spec assumptions)

These are NOT spec errors; they're state of the codebase that the spec's "audited during pre-execution recon" steps would surface during execution. Surfacing now prevents over-scoping the conditional Changes 8, 9, 10:

- **DeleteRoutineDialog is ALREADY canonical alertdialog.** Verified: it has `role="alertdialog"` (line 20), `aria-modal="true"` (line 21), `aria-labelledby` + `aria-describedby` (lines 22-23), `useFocusTrap(true, onCancel)` (line 14, with focus restoration via the hook), and the Cancel button (line 37) uses the canonical `bg-white/10 ... hover:bg-white/15` muted-white chrome from Spec 11A. **Drift remaining:**
  1. NO `AlertTriangle` icon in the heading row (line 27) — DeleteAccountModal has one at line 30. **Migration: ADD `AlertTriangle` import + render in heading row with `aria-hidden="true"`.**
  2. Border opacity drift: `border-white/10` (line 24) → migrate to `border-white/[0.12]` per Spec 11A border-opacity unification (Direction Decision 4).
  3. Delete CTA at line 41-47 uses `bg-red-700 ... hover:bg-red-800 text-white` saturated red — NOT the canonical muted-destructive severity (`bg-red-950/30 border border-red-400/30 text-red-100`). **Migration: replace with canonical muted-destructive class string from `DeleteAccountModal.tsx:53` verbatim** (drop the `flex-1` since DeleteRoutineDialog uses `flex justify-end gap-3` not full-width side-by-side, and adapt the focus-ring offset to `focus-visible:ring-offset-hero-dark` since the dialog background is `rgba(15, 10, 30, 0.95)` ≈ hero-dark).
  4. Confirmation copy is preserved exactly per spec — no copy edits.

- **DeleteRoutineDialog Change 10 IS triggered.** The conditional fires; do NOT skip Change 10.

- **ContentPicker has chrome drift requiring migration:**
  1. Active tab indicator at line 109: `border-primary text-primary` is saturated primary (Spec 11A active-state migration applies — should become muted-white for tabs).
  2. Card hover tint at lines 134, 163, 186: `hover:border-primary` is saturated; per Spec 11A precedent (cards within modals), should become `hover:border-white/[0.18]` (matching RoutineCard hover canonical).
  3. Border opacity drift on dialog wrapper (line 70: `border-white/10`), header (line 74: `border-b border-white/10`), tablist (line 89: `border-b border-white/10`), and 5 card buttons (lines 134, 163, 186: `border-white/10`). Migrate to `border-white/[0.12]`.
  4. Focus-ring drift: 7 sites use `focus-visible:ring-primary-lt/70`. Direction Decision 19 left this as-is for some sites; cross-reference with Spec 11A's actual decision. **Default: preserve `focus-visible:ring-primary-lt/70` unless Spec 11A migrated identical surfaces.** Verify by reading Spec 11A's executed changes (file did not appear in 11A's affected files list per recon Part 1, so 11A's migration scope did NOT touch ContentPicker focus rings). **Decision: preserve `focus-visible:ring-primary-lt/70` on ContentPicker; migrating focus rings is out of scope without explicit direction.**

- **ContentPicker Change 8 IS triggered.** The conditional fires; do NOT skip Change 8. Migrations are limited to active-tab class, hover tints, and border opacity. Focus rings preserved.

- **RoutineStepCard has NO chrome drift requiring migration.** Verified: `border-l-2` colored borders (`border-glow-cyan` / `border-amber-400` / `border-primary-lt`) are decorative type indicators (Decision 20 precedent — preserve), `bg-white/5` background is canonical, focus rings use `focus-visible:ring-primary-lt/70` (preserve per ContentPicker decision above). No active-state, no `bg-primary` solid CTA, no `text-primary` text-button. **Change 9 is SKIPPED.** No production edit, no test file created.

- **RoutineBuilder has active-state drift in the Step Type Picker:** `border-glow-cyan/30 bg-glow-cyan/10 text-glow-cyan` (line 227) and equivalents at lines 234, 241 are colored chip selectors for type categorization (Scene = cyan, Scripture = amber, Story = primary-lt). These are categorical/decorative type indicators matching the RoutineStepCard `BORDER_COLOR_MAP` palette — preserve per Decision 20 precedent. The Sleep Timer / Fade Duration `<select>` elements (lines 270-298) are native selects, not chip selectors — no active-state class to migrate. **Change 6 active-state audit finds NO additional drift beyond the Save Routine CTA (line 315).** Only the Save Routine CTA migrates. The Cancel button at line 304-309 uses `border border-white/20 ... text-white/70` — also canonical secondary, preserve.

- **RoutineBuilder name input border** at line 155 (`border-white/10`) — per Spec 11A border-opacity unification (Direction Decision 4), MIGRATE to `border-white/[0.12]`. Same for the gap-input borders at line 200 and the dialog wrapper at line 138 (`border-white/10`) and `select` borders at lines 274, 291. **Augment Change 6:** include 5 RoutineBuilder border-opacity migrations (`border-white/10` → `border-white/[0.12]`) + the connecting line at line 181 (`bg-white/10` → `bg-white/[0.12]`, decorative line) — per Direction Decision 4.

- **RoutineCard kebab-menu popover border** at line 172 (`border-white/10`) — same migration as above. **Augment Change 7c:** include 1 RoutineCard border-opacity migration on the kebab popover.

### Test setup patterns to follow

The existing `RoutinesPage.test.tsx` already mocks the full module surface:

- `useAuth` (lines 15-17) — toggles `mockIsAuthenticated`
- `useAuthModal` (lines 19-21) — captures `mockOpenAuthModal`
- `useToast` (lines 23-27) — captures `mockShowToast`
- `useRoutinePlayer` (lines 29-39) — captures `mockStartRoutine`, returns `endRoutine: vi.fn()` already
- `useAudioState` / `useAudioDispatch` / `useAudioEngine` (lines 41-57) — mock module
- `storageService` (lines 59-68) — captures `deleteRoutine`, `saveRoutine`, etc.
- `useElementWidth` (lines 70-72)

The existing mock for `useRoutinePlayer` already returns `endRoutine: vi.fn()`. **For Change 5's behavioral tests**, capture this `endRoutine` mock at module scope so tests can assert on it. Refactor:

```ts
const mockEndRoutine = vi.fn()
vi.mock('@/hooks/useRoutinePlayer', () => ({
  useRoutinePlayer: () => ({
    startRoutine: mockStartRoutine,
    skipStep: vi.fn(),
    endRoutine: mockEndRoutine,
    pendingInterrupt: null,
    confirmInterrupt: vi.fn(),
    cancelInterrupt: vi.fn(),
    isRoutineActive: false,
  }),
}))
```

The existing `useAudioState` mock (lines 41-54) returns a frozen object with `activeRoutine: null`. To test the active-routine-matches branch, expose `activeRoutine` as a mutable variable controlled per test (mirroring the `mockIsAuthenticated` pattern at line 13):

```ts
let mockActiveRoutine: { routineId: string } | null = null
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: mockActiveRoutine,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
}))
```

`beforeEach` resets both `mockIsAuthenticated = false` and `mockActiveRoutine = null`.

---

## Auth Gating Checklist

11B introduces NO new auth gates and removes NO existing auth gates. Per spec § "Auth Gating" — only chrome migrates; behavior unchanged. The table below enumerates the existing auth gates that MUST be preserved through the chrome migrations:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click Create Routine CTA (chrome migrates in Change 3) | Auth-gated; opens auth modal when logged out with copy "Sign in to create bedtime routines" | Step 3 | `useAuth()` + `useAuthModal()` — `handleCreate` reads `isAuthenticated` (RoutinesPage.tsx:39-46) — preserved exactly through Change 3's className-only edit |
| Click Start CTA on RoutineCard (chrome migrates in Change 7a) | Auth-gated; opens auth modal when logged out with copy "Sign in to use bedtime routines" | Step 7 | `useAuth()` + `useAuthModal()` — `handleStart` reads `isAuthenticated` (RoutineCard.tsx:65-71) — preserved exactly through Change 7a's className-only edit |
| Click Clone in template card kebab menu | Auth-gated; opens auth modal when logged out with copy "Sign in to create bedtime routines" | N/A — no chrome change to Clone in 11B | `useAuth()` + `useAuthModal()` — `handleClone` reads `isAuthenticated` (RoutineCard.tsx:89-96) — preserved by NOT touching the kebab menu items in 11B |
| Click Save Routine inside RoutineBuilder (chrome migrates in Change 6) | N/A — RoutineBuilder is only mounted post-auth (Create Routine routes through auth modal first) | Step 6 | Indirect: gated by Create Routine auth modal upstream — preserved exactly |
| Click Delete on user-routine kebab menu | Logged-in only (user routines only render for authenticated users) | Step 5 | Indirect: gated by RoutineBuilder mount upstream — preserved exactly |

**Auth gate verification tests:**
- `Create Routine button shows auth modal when logged out` — already exists at `RoutinesPage.test.tsx:122-132`; no changes needed
- `Start button shows auth modal when logged out` — already exists at `RoutinesPage.test.tsx:108-120`; no changes needed
- Clone gate test — not in current test file; out of scope (no chrome change in 11B)

---

## Design System Values (for UI steps)

All values verified against `_plans/recon/design-system.md` AND `09-design-system.md` AND Spec 11A's executed canonical class string.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| **White-pill primary CTA Pattern 2** (Create Routine, Save Routine, Start) | className | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 + Spec 11A canonical |
| **White-pill primary — Start CTA on RoutineCard** | adjustment | RoutineCard sits inside a card inside a max-w-5xl page container. The Start CTA is currently `flex min-h-[44px] items-center gap-1.5 ... px-6 py-2.5 text-sm` (smaller chrome to fit inside the card). Use Pattern 2 verbatim (`px-8 py-3.5 text-base sm:text-lg`) — the canonical class string is identical at all 3 sites per cluster precedent. The Play icon stays at `size={14}` inside the pill. **Note**: the larger px-8 + sm:text-lg may push the kebab-menu button down on mobile; verify visually during execution. If the larger CTA breaks the card layout, switch to inline canonical pattern (Pattern 1 — `px-6 py-2.5 text-sm`). Default: Pattern 2 verbatim per spec § Acceptance Criteria. | Spec § "RoutineCard Start CTA migration" + Spec 11A canonical |
| **Hero `<h1>` — preserved classes** | className | `px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2` | RoutinesPage.tsx:122 (preserve) |
| **Hero `<h1>` — gradient style** | inline style | `GRADIENT_TEXT_STYLE` (imported from `@/constants/gradients`) | preserved exactly |
| **Hero subtitle — migrated** | className | `mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg` | Spec 10A migration pattern |
| **Empty-state hint paragraph** | className | `text-white/60 text-sm sm:text-base text-center mt-6 mb-4` | Spec § Change 4 |
| **Empty-state hint copy** | text content | `Tap a template to start, or create your own.` | Spec § Change 4 (verbatim — period terminator, sentence case) |
| **RoutineCard Template badge** | className | `mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300` | Spec § Change 7b (only `text-primary` → `text-violet-300`; `bg-primary/10` background preserved per Decision 20) |
| **DeleteRoutineDialog AlertTriangle icon** | element | `<AlertTriangle className="h-5 w-5 text-red-300 shrink-0" aria-hidden="true" />` placed inside a new `<div className="flex items-center gap-3 mb-2">` heading row | DeleteAccountModal.tsx:30 canonical |
| **DeleteRoutineDialog Delete CTA — migrated** | className | `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 rounded-lg px-6 py-2 text-sm font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark` | Severity color system from `09-design-system.md` § "Severity color system" + DeleteAccountModal.tsx:53 canonical |
| **DeleteRoutineDialog Cancel CTA** | className | preserve existing — `rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` (already canonical muted-white per Spec 11A precedent) + add `min-h-[44px]` if missing | DeleteRoutineDialog.tsx:37 (verified canonical except for explicit `min-h-[44px]`) |
| **Border opacity unification** | class swap | `border-white/10` → `border-white/[0.12]` and `bg-white/10` → `bg-white/[0.12]` (decorative connecting line) | Direction Decision 4 + Spec 11A precedent |
| **ContentPicker active tab** | className | replace `border-primary text-primary` → `border-white/30 text-white` (active-foreground variant of Spec 11A muted-white pattern) | Spec 11A § active-state class strings |
| **ContentPicker card hover** | className | replace `hover:border-primary` → `hover:border-white/[0.18]` (matching RoutineCard hover canonical at RoutineCard.tsx:104) | RoutineCard canonical hover |
| **Eyebrow / brand chrome on RoutinesPage** | preserved | `<Layout>` wrapper, inline `ATMOSPHERIC_HERO_BG`, `HeadingDivider`, `Breadcrumb` — all preserved exactly | Direction Decision 1 |

---

## Design System Reminder

Project-specific quirks that `/execute-plan` displays before every UI step:

- **Worship Room uses `GRADIENT_TEXT_STYLE`** (white-to-purple gradient via `background-clip: text`) for hero headings on dark backgrounds. Caveat font (`font-script`) has been deprecated for headings — used only for the logo. The RoutinesPage `<h1>` parent still applies `GRADIENT_TEXT_STYLE` after Change 1; the wordmark visual emphasis comes from the gradient + bold weight, not from the `font-script` span being removed.
- **`font-serif italic` on prose body text is deprecated.** The canonical body chrome on inner pages is `font-sans` Inter (page default), no italic, with `text-white/60` opacity per the Text Opacity Standards table.
- **White-pill primary CTA Pattern 2 is verbatim across the cluster.** Use the exact class string from the Design System Values table — do NOT re-derive or paraphrase. Spec 11A locked this string at 6 sites; Spec 11B applies it at 3 more (Create Routine, Save Routine, Start). Inconsistent class strings are a cluster-pattern violation.
- **Severity color system uses muted tonal colors, NEVER pure red.** Worship Room vulnerability content would feel assaulted by `#FF0000`. The canonical destructive Delete CTA is `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40` — copied verbatim from `DeleteAccountModal.tsx:53`.
- **Decorative tints are preserved per Direction Decision 20.** The Template badge `bg-primary/10` background is decorative chrome (categorical signal — "this card is a curated template"). It is NOT a CTA chrome and does NOT migrate. Only the failing-contrast text color (`text-primary` → `text-violet-300`) migrates. RoutineStepCard's colored `border-l-2` indicators (cyan / amber / primary-lt) and RoutineBuilder's Step Type Picker chip colors (cyan / amber / primary-lt) follow the same precedent — preserved as decorative type indicators.
- **Border opacity unification:** `border-white/10` → `border-white/[0.12]` site-wide per Direction Decision 4. Includes decorative connecting lines using `bg-white/10`. RoutineCard chrome at line 104 is already canonical `border-white/[0.12]` and preserved.
- **`useFocusTrap()` is the canonical accessibility primitive** for modals and dialogs (used in 37 components per BB-35). DeleteRoutineDialog (line 14), ContentPicker (line 26), and the RoutineCard kebab menu (lines 44-63 — uses inline `mousedown` + `keydown` handlers, NOT `useFocusTrap`) — Direction Decision 23 says "verify during 11A QA, no code change unless drift found." For 11B: the kebab menu's inline pattern is pre-existing and out of scope; DeleteRoutineDialog and ContentPicker are verified canonical (focus trap working).
- **Atmospheric layer is preserved per Direction Decision 1.** Do NOT introduce `BackgroundCanvas`, `HorizonGlow`, or `GlowBackground` on RoutinesPage. The canonical inner-page atmospheric pattern is `<Layout>` + inline `ATMOSPHERIC_HERO_BG` on the hero section.
- **AudioProvider state schema is read-only per Direction Decision 24.** Reading `state.activeRoutine?.routineId` is allowed; mutating the state schema is not. The behavioral fix in Step 5 dispatches an existing action (`END_ROUTINE`) — no new action types, no reducer logic.
- **Test pattern for AudioProvider mock:** the existing `RoutinesPage.test.tsx` mock pattern is canonical. Extend it to expose `mockActiveRoutine` as a mutable module-scoped variable (mirroring `mockIsAuthenticated`) so behavioral tests can flip the active-routine state per test.
- **Anti-pressure copy voice:** the new empty-state hint per Change 4 follows the project's anti-pressure copy voice — sentence case, period terminator, no exclamation point, no instruction-text imperative voice, no urgency. The single hint reads as a soft invitation. CLAUDE.md "Anti-pressure voice" + `01-ai-safety.md` § Community Guidelines.

---

## Shared Data Models (from Master Plan)

11B does not invent or modify shared data models. Schemas consumed (read-only):

```ts
// From frontend/src/types/audio.ts (preserved per Direction Decision 24)
export interface AudioRoutine {
  routineId: string                                 // ← Step 5 reads this
  routineName: string
  currentStepIndex: number
  steps: RoutineStep[]
  phase: 'playing' | 'transition-gap' | 'ambient-only'
  sleepTimerConfig: { durationMinutes: number; fadeDurationMinutes: number }
}

// From frontend/src/types/storage.ts (preserved per Direction Decision 24)
export interface RoutineDefinition {
  id: string                                        // ← compared against AudioRoutine.routineId
  name: string
  isTemplate: boolean
  steps: RoutineStepDef[]
  sleepTimer: { durationMinutes: number; fadeDurationMinutes: number }
  description?: string
  createdAt: string
  updatedAt: string
}

// Existing audio action used by Step 5 (NO new actions introduced)
export type AudioAction =
  | { type: 'END_ROUTINE' }                         // ← spec said 'STOP_ROUTINE'; that doesn't exist
  | ...
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_routines` | Read (via `storageService.getRoutines`) and Write (via `storageService.deleteRoutine`) — no schema changes | User-saved routines. Direction Decision 24 read-only schema. |
| `wr_session_state.activeRoutine` | Read (via `useAudioState`); cleared by `END_ROUTINE` action — no schema changes | Active routine playback state. Direction Decision 25 read-only schema. |

No new keys added. No keys removed. No schema migrations.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | RoutinesPage hero `<h1>` `text-3xl font-bold` (preserved); subtitle `text-base text-white/60` (no italic after Change 2); RoutineCard grid single-column; new empty-state hint `text-sm text-white/60 text-center` (Change 4); Create Routine CTA Pattern 2 `min-h-[44px]` `text-base`; DeleteRoutineDialog stacks Cancel/Delete in `flex justify-end gap-3` row (existing layout preserved) |
| Tablet | 768px | Hero `<h1>` scales to `text-4xl` per `sm:text-4xl`; subtitle `sm:text-lg`; RoutineCard grid 2-column (`sm:grid-cols-2`); empty-state hint `sm:text-base`; Create Routine CTA Pattern 2 `sm:text-lg` |
| Desktop | 1440px | Hero `<h1>` `lg:text-5xl`; RoutineCard grid 3-column (`lg:grid-cols-3`); page container `mx-auto max-w-5xl px-4 py-8` (preserved); white-pill CTAs scale per Pattern 2 (`px-8 py-3.5`, `sm:text-lg`) |

**Custom breakpoints:** None. RoutinesPage uses Tailwind defaults.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected alignment | Wrap Tolerance |
|---------------|----------|--------------------|----------------|
| RoutineCard "Actions" row (after Change 7a) | Start CTA (white-pill Pattern 2) + kebab menu button | Both elements share the row (`flex items-center gap-2`); kebab pushed to `ml-auto`. With Pattern 2's larger sizing (`px-8 py-3.5` and `sm:text-lg`), the Start CTA grows. **Risk: at narrow widths (sm-breakpoint cards in 2-column grid) the Start CTA may dominate the row width and force the kebab to wrap or shrink.** The kebab is `min-h-[44px] min-w-[44px]` so it cannot shrink below 44×44. Expectation: **No wrap allowed at 1440px and 768px**; the row stays single-line. If the row wraps at 768px, fall back to Pattern 1 (inline canonical, `px-6 py-2.5 text-sm`) for the Start CTA — this is documented in the Design System Values table as the contingency. | Wrap acceptable below 640px (single-column grid; cards have full row width) |
| DeleteRoutineDialog actions row | Cancel button + Delete CTA | `flex justify-end gap-3` (preserved). Both buttons `min-h-[44px]`. **No wrap allowed at any breakpoint** — the dialog is `max-w-sm` (24rem ≈ 384px); two buttons at ~80-100px each + 12px gap fit at all viewports. | No wrap at any breakpoint |
| DeleteRoutineDialog heading row (after Change 10) | AlertTriangle icon + heading text | New `<div className="flex items-center gap-3 mb-2">` wraps the icon + h2. **No wrap allowed.** | No wrap at any breakpoint |
| Empty-state hint paragraph (after Change 4) | Single text line | Centered (`text-center`). Long enough on mobile to wrap to 2 lines naturally; that's expected text wrapping, not layout breakage. | Natural text wrap acceptable |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero section bottom → Breadcrumb | `pt-4` on Breadcrumb wrapper (RoutinesPage.tsx:136) | preserved |
| Breadcrumb → routines grid section | `py-8` on Content section (RoutinesPage.tsx:147) | preserved |
| Routines grid → empty-state hint paragraph (NEW) | `mt-6` on hint paragraph | Change 4 — `mt-6 mb-4` |
| Empty-state hint paragraph → Create Routine CTA wrapper | `mb-4` on hint + existing `mt-8` on CTA wrapper | Change 4 + RoutinesPage.tsx:183 — net 12px between hint and CTA after the spec's tuning |
| **Net change at Vertical Rhythm checkpoint:** before Change 4 the gap from grid to CTA was `mt-8` (32px); after Change 4 the visual rhythm is grid (24px = mt-6) → hint → (16px = mb-4) → CTA wrapper (32px = mt-8 from the existing wrapper, which gives 16+32=48px between hint and CTA). Spec calls margins "tuned during execution if needed for visual balance." Adjust `mb-4` down to `mb-2` if 48px reads as too much air; verify visually before committing. | Spec § Change 4 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] **Critical:** the spec body's `STOP_ROUTINE` action name is a TYPO. Use `END_ROUTINE` (verified existing action). The spec body's `state.activeRoutine?.id` is incorrect — use `state.activeRoutine?.routineId` (verified `AudioRoutine` schema).
- [ ] **Recommended over raw dispatch:** in Step 5, prefer calling `endRoutine()` from `useRoutinePlayer()` over `dispatch({ type: 'END_ROUTINE' })` — same semantics + cleans up player refs/timers.
- [ ] DeleteRoutineDialog conditional Change 10 IS triggered (drift found: missing AlertTriangle, border-white/10, saturated red Delete CTA).
- [ ] ContentPicker conditional Change 8 IS triggered (drift found: active-tab `border-primary text-primary`, hover `border-primary`, border-white/10 at 5+ sites).
- [ ] RoutineStepCard conditional Change 9 is SKIPPED (no chrome drift found — all colors are decorative type indicators preserved per Decision 20).
- [ ] RoutineBuilder Change 6 active-state audit finds NO active-state drift beyond Save Routine CTA (Step Type Picker chips are decorative, native selects have no active-state class). Border opacity migrations folded in.
- [ ] All auth-gated actions from the spec are accounted for (Create Routine, Start, Clone — all preserved through className-only edits).
- [ ] Design system values are verified — white-pill Pattern 2 verbatim, severity destructive verbatim from DeleteAccountModal.
- [ ] No deprecated patterns introduced (no Caveat headings, no font-serif italic, no animate-glow-pulse, no GlowBackground/HorizonGlow on RoutinesPage, no PageTransition).
- [ ] Spec 11A is shipped (`_plans/2026-05-06-spec-11a-music.md` Execution Log = COMPLETE) — confirmed by checking the plan file's Execution Log status before running 11B.
- [ ] No git operations performed by CC. User manages all git operations.
- [ ] Branch stays at `forums-wave-continued` per spec § Branch discipline.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `STOP_ROUTINE` does not exist | Use `END_ROUTINE` | Verified by reading `audio.ts`, `audioReducer.ts`, `useRoutinePlayer.ts`. The spec's intent (clear `activeRoutine` from state, trigger AudioPill cleanup) is exactly what `END_ROUTINE` already does. |
| `state.activeRoutine?.id` does not exist | Use `state.activeRoutine?.routineId` | The `AudioRoutine` schema has `routineId`, not `id`. Verified by `audio.ts:38-45`. |
| Raw dispatch vs. `endRoutine()` from `useRoutinePlayer` | Use `endRoutine()` | Cleaner: handles ref cleanup, timer cleanup, listening session logging. RoutinesPage already imports `useRoutinePlayer` for `startRoutine` — no new import. |
| RoutineCard Start CTA — Pattern 2 may dominate the card | Default Pattern 2 verbatim; fallback to Pattern 1 if visual breaks at 768px | Spec § Acceptance Criteria explicitly says "canonical white-pill primary CTA Pattern 2"; visual fallback documented. |
| DeleteRoutineDialog already canonical alertdialog | Apply only the 3 deltas (AlertTriangle icon, border opacity, severity destructive Delete CTA) | Pre-execution verification confirmed `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `useFocusTrap` already present. |
| ContentPicker focus rings | Preserve `focus-visible:ring-primary-lt/70` | Spec 11A did not migrate this surface's focus rings; out of scope without explicit direction. |
| ContentPicker active tab | Migrate to `border-white/30 text-white` (Spec 11A muted-white) | Per Direction Decision 19's pattern of unifying audio cluster active states. |
| RoutineStepCard colored borders (cyan/amber/primary-lt) | Preserve | Decorative type indicators per Decision 20 — same shape as Template badge `bg-primary/10` background and Step Type Picker chips. |
| RoutineBuilder Step Type Picker chip colors | Preserve | Decorative type categorization (matches RoutineStepCard's `BORDER_COLOR_MAP`). Decision 20 precedent. |
| Empty-state hint margins | `mt-6 mb-4` default; tune `mb-4` → `mb-2` if 48px between hint and CTA reads as too much air | Spec § Change 4 explicit guidance. Visual verification at execution time. |
| Connecting line in RoutineBuilder Steps editor | Migrate `bg-white/10` → `bg-white/[0.12]` | Direction Decision 4 unification applies to decorative `bg-white/10` lines too. |
| Test mock pattern for `mockActiveRoutine` | Module-scoped mutable variable, reset in `beforeEach` | Mirrors existing `mockIsAuthenticated` pattern in `RoutinesPage.test.tsx:13`. |

---

## Implementation Steps

### Step 1: RoutinesPage hero `<h1>` — remove `font-script` span (Change 1)

**Objective:** Remove the `font-script` Caveat-font span wrapping the word "Routines" so the heading reads "Bedtime Routines" as plain text inside the parent `<h1>`. Preserve `GRADIENT_TEXT_STYLE`, `headingRef`, all sizing classes, and the `HeadingDivider` width sync.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — line 125 className edit only

**Details:**

Replace:
```tsx
Bedtime <span className="font-script">Routines</span>
```
With:
```tsx
Bedtime Routines
```

Verify line 122-124 preserved exactly:
```tsx
<h1
  ref={headingRef}
  className="px-1 sm:px-2 text-3xl font-bold sm:text-4xl lg:text-5xl pb-2"
  style={GRADIENT_TEXT_STYLE}
>
```

The wordmark visual emphasis comes from `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) plus `font-bold`. The `font-script` decoration is removed per `09-design-system.md` § "Deprecated Patterns" → "Caveat font on headings".

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): `<h1>` renders at `lg:text-5xl` with gradient + bold. No font-script word.
- Tablet (768px): `<h1>` at `sm:text-4xl`. Same.
- Mobile (375px): `<h1>` at `text-3xl`. Same.

**Inline position expectations:** N/A — single heading.

**Guardrails (DO NOT):**
- Do NOT remove `GRADIENT_TEXT_STYLE` from the parent `<h1>`.
- Do NOT remove `headingRef`.
- Do NOT change any other class on the `<h1>`.
- Do NOT touch the `<HeadingDivider>` below.
- Do NOT remove the `pb-2` (it gives the gradient text breathing room above the divider).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `<h1>` does not contain font-script span | unit | After render, `screen.getByRole('heading', { name: /Bedtime Routines/i })` should NOT have a child element with class `font-script` (use `.querySelector('.font-script')` and assert null) |
| `<h1>` text content unchanged | unit | `screen.getByRole('heading', { name: /Bedtime Routines/i }).textContent` equals `'Bedtime Routines'` (no extra whitespace from removed span) |

**Expected state after completion:**
- [ ] No `font-script` class on any element inside the RoutinesPage hero
- [ ] Heading reads "Bedtime Routines" as plain text inside the parent `<h1>`
- [ ] All preserved classes intact

---

### Step 2: RoutinesPage subtitle — remove `font-serif italic` (Change 2)

**Objective:** Migrate the subtitle from `font-serif italic` (deprecated) to canonical body chrome (`font-sans` Inter inherited from page default, no italic). Preserve `text-white/60`, responsive sizing, and layout classes.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — line 127 className edit only

**Details:**

Replace:
```tsx
<p className="mx-auto mt-4 max-w-lg font-serif italic text-base text-white/60 sm:text-lg">
  Build your path to peaceful sleep
</p>
```
With:
```tsx
<p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
  Build your path to peaceful sleep
</p>
```

Removed: `font-serif italic`. Preserved: `mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg`. Subtitle copy unchanged.

`font-sans` Inter is inherited from the page default (`<Layout>` body). No explicit `font-sans` class needed.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): subtitle at `sm:text-lg` (18px), Inter sans, no italic.
- Tablet (768px): same.
- Mobile (375px): subtitle at `text-base` (16px), Inter sans, no italic.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT remove `text-white/60` (canonical secondary text tier — meets WCAG AA on `bg-dashboard-dark`).
- Do NOT change subtitle copy.
- Do NOT remove `mx-auto mt-4 max-w-lg` (layout).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Subtitle does not have font-serif class | unit | `screen.getByText(/Build your path to peaceful sleep/i)` should NOT have class `font-serif` |
| Subtitle does not have italic class | unit | Same element should NOT have class `italic` |
| Subtitle copy preserved | unit | Existing `RoutinesPage.test.tsx:149-153` test already covers this — preserve |

**Expected state after completion:**
- [ ] Subtitle has no `font-serif` or `italic` classes
- [ ] Copy "Build your path to peaceful sleep" intact
- [ ] `text-white/60` opacity preserved

---

### Step 3: RoutinesPage Create Routine CTA — migrate to white-pill Pattern 2 (Change 3)

**Objective:** Replace the saturated `bg-primary` Create Routine CTA chrome with the canonical white-pill primary CTA Pattern 2 verbatim. Preserve `onClick={handleCreate}` (which contains the auth gate via `useAuthModal`), accessible name "Create Routine", and the surrounding centered wrapper.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — lines 184-190 className edit only

**Details:**

Replace:
```tsx
<button
  type="button"
  onClick={handleCreate}
  className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
>
  Create Routine
</button>
```
With:
```tsx
<button
  type="button"
  onClick={handleCreate}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
>
  Create Routine
</button>
```

Class string is verbatim from `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 + Spec 11A canonical (locked at 6 sites in 11A).

Surrounding wrapper at line 183 (`<div className="mt-8 text-center">`) preserved exactly.

**Auth gating:**
- `onClick={handleCreate}` preserved exactly. `handleCreate` (RoutinesPage.tsx:39-46) reads `isAuthenticated` and routes through `authModal?.openAuthModal('Sign in to create bedtime routines')` when logged out.
- Existing test at `RoutinesPage.test.tsx:122-132` covers the auth gate; preserve.

**Responsive behavior:**
- Desktop (1440px): Pattern 2 at `sm:text-lg`, `min-h-[44px]`, white-pill chrome with white drop shadow.
- Tablet (768px): same `sm:text-lg`.
- Mobile (375px): Pattern 2 at `text-base`, `min-h-[44px]` ensures touch target.

**Inline position expectations:** Centered in `text-center` wrapper.

**Guardrails (DO NOT):**
- Do NOT change `onClick={handleCreate}`.
- Do NOT change accessible name "Create Routine" (button text content).
- Do NOT remove `min-h-[44px]` (touch target).
- Do NOT remove `focus-visible:ring-white/50` (canonical focus ring).
- Do NOT change the `<div className="mt-8 text-center">` wrapper.
- Do NOT add or change copy.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Create Routine CTA matches white-pill Pattern 2 | unit | Get button by name `/Create Routine/i`; assert className contains `'bg-white'`, `'rounded-full'`, `'min-h-[44px]'`, `'text-hero-bg'`, `'shadow-[0_0_30px_rgba(255,255,255,0.20)]'` |
| Create Routine CTA does NOT have bg-primary | unit | className does NOT contain `'bg-primary'` |
| Auth gate preserved | unit | Existing test at `RoutinesPage.test.tsx:122-132` — preserve unchanged |

**Expected state after completion:**
- [ ] Create Routine CTA renders with canonical white-pill Pattern 2 chrome
- [ ] Auth gate preserved
- [ ] All other handlers + accessibility preserved

---

### Step 4: RoutinesPage empty-state hint paragraph (Change 4)

**Objective:** Insert a single warm one-liner hint paragraph between the routine cards grid and the Create Routine CTA wrapper. The hint reads "Tap a template to start, or create your own." and bridges the curated templates and the Create Routine action.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — insert new `<p>` between line 180 (closing `</div>` of grid) and line 183 (opening `<div className="mt-8 text-center">` of CTA wrapper)

**Details:**

Insert this `<p>` immediately after the grid's closing `</div>` and immediately before the CTA wrapper's opening `<div>`:

```tsx
<p className="text-white/60 text-sm sm:text-base text-center mt-6 mb-4">
  Tap a template to start, or create your own.
</p>
```

The hint:
- Renders inside the `{showBuilder ? <RoutineBuilder ... /> : <>...</>}` ternary's else branch — automatically hidden when `showBuilder === true` (RoutineBuilder mounts instead).
- `text-white/60` matches the canonical secondary-text tier (WCAG AA on `bg-dashboard-dark`).
- `text-sm sm:text-base` matches the cluster's secondary-text responsive sizing.
- `text-center` aligns with the centered Create Routine CTA below.
- `mt-6 mb-4` margins are tuned per spec § Change 4. Verify visually during execution; if 48px between hint and CTA reads as too much air (mb-4 + the existing mt-8 on the CTA wrapper = 48px), reduce `mb-4` → `mb-2` (giving 32px total).
- Copy is verbatim: "Tap a template to start, or create your own." — sentence case, period terminator, no exclamation point, anti-pressure voice per Spec 10B + Direction Decision 13.

**Auth gating:** N/A — decorative copy, no interactive elements.

**Responsive behavior:**
- Desktop (1440px): `sm:text-base` (16px), centered. Single line at typical viewport widths.
- Tablet (768px): same.
- Mobile (375px): `text-sm` (14px), centered. May wrap naturally to 2 lines.

**Inline position expectations:** Single paragraph, centered. Natural text wrap acceptable on mobile.

**Guardrails (DO NOT):**
- Do NOT add an exclamation point (anti-pressure voice).
- Do NOT use instruction-text imperative voice ("Click here to..." or "Try a template!" — both wrong).
- Do NOT replace the templates with `FeatureEmptyState` (Direction Decision 13 — templates are real content).
- Do NOT render the hint when `showBuilder === true` (the existing conditional render already handles this — the hint sits inside the `<>...</>` else branch).
- Do NOT add interactive elements.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Hint copy renders | unit | `screen.getByText('Tap a template to start, or create your own.')` is in the document |
| Hint has canonical secondary-text styling | unit | The matched element has class `text-white/60` and `text-center` |
| Hint hidden when showBuilder true | unit | After clicking Create Routine (logged in), the hint is no longer in the document |

**Expected state after completion:**
- [ ] Hint paragraph rendered between routine grid and Create Routine CTA
- [ ] Copy verbatim
- [ ] Hidden when RoutineBuilder is mounted

---

### Step 5: RoutinesPage handleDelete — active-routine cleanup (Change 5)

**Objective:** Augment `handleDelete` (RoutinesPage.tsx:80-86) to call `endRoutine()` from `useRoutinePlayer` BEFORE `storageService.deleteRoutine` when the deleted routine is the currently-active routine. Resolves the orphaned `state.activeRoutine` reference that causes the AudioPill / AudioDrawer to claim "Currently in routine: <name>" against a deleted routine.

**Files to create/modify:**
- `frontend/src/pages/RoutinesPage.tsx` — modify `useRoutinePlayer` destructure (line 24) to also pull `endRoutine`; add `useAudioState` import; modify `handleDelete` (lines 80-86)

**Details:**

**Step 5a — Add `useAudioState` import + add `endRoutine` to existing destructure:**

At line 15-16 (already imports `useRoutinePlayer`), add:

```tsx
import { useAudioState } from '@/components/audio/AudioProvider'
```

At line 24, change:
```tsx
const { startRoutine } = useRoutinePlayer()
```
To:
```tsx
const { startRoutine, endRoutine } = useRoutinePlayer()
```

After line 24, add:
```tsx
const audioState = useAudioState()
```

**Step 5b — Augment `handleDelete`:**

Replace (lines 80-86):
```tsx
const handleDelete = () => {
  if (!deletingRoutine) return
  storageService.deleteRoutine(deletingRoutine.id)
  refreshRoutines()
  showToast(`Deleted "${deletingRoutine.name}"`)
  setDeletingRoutine(null)
}
```

With:
```tsx
const handleDelete = () => {
  if (!deletingRoutine) return

  // If the user is deleting the actively-playing routine, end it first so the
  // AudioPill / AudioDrawer don't continue claiming "Currently in routine: <name>"
  // against an orphaned reference. END_ROUTINE clears state.activeRoutine and
  // tears down player refs/timers via useRoutinePlayer.endRoutine().
  if (audioState.activeRoutine?.routineId === deletingRoutine.id) {
    endRoutine()
  }

  storageService.deleteRoutine(deletingRoutine.id)
  refreshRoutines()
  showToast(`Deleted "${deletingRoutine.name}"`)
  setDeletingRoutine(null)
}
```

**Critical notes (from "Critical Pre-Existing State Findings" above):**
- The action name is `END_ROUTINE`, NOT `STOP_ROUTINE` (spec error).
- The schema field is `routineId`, NOT `id` (spec error).
- Calling `endRoutine()` from the hook is preferred over raw `dispatch({ type: 'END_ROUTINE' })` because it also cleans up `gapTimerRef`, `currentStepIndexRef`, `routineIdRef`, `routineStartTimeRef` and logs the listening session as incomplete via `storageService.logListeningSession`.

Order of operations preserved:
1. Conditional `endRoutine()` (only if active routine matches)
2. `storageService.deleteRoutine(deletingRoutine.id)`
3. `refreshRoutines()`
4. `showToast(...)`
5. `setDeletingRoutine(null)`

**Auth gating:** Indirect — DeleteRoutineDialog only opens for user routines (logged-in only). No new auth check.

**Responsive behavior:** N/A — no UI rendered by this step.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT use `STOP_ROUTINE` (does not exist).
- Do NOT use `state.activeRoutine?.id` (field is `routineId`).
- Do NOT mutate `audioReducer` or add new action types (Direction Decision 24).
- Do NOT modify `storageService.deleteRoutine` signature.
- Do NOT remove `refreshRoutines()`, `showToast(...)`, or `setDeletingRoutine(null)`.
- Do NOT reorder operations — `endRoutine()` MUST run before `deleteRoutine` so subscribed UI updates with consistent state.
- Do NOT add the `endRoutine()` call unconditionally — it MUST be gated by the `routineId === deletingRoutine.id` check (otherwise deleting a non-active routine would also stop the unrelated active routine).

**Test specifications:**

Refactor `RoutinesPage.test.tsx` mocks to expose `mockActiveRoutine` and `mockEndRoutine` at module scope (see "Test setup patterns to follow" in Architecture Context above).

| Test | Type | Description |
|------|------|-------------|
| handleDelete calls endRoutine when active routine matches | unit | Set `mockActiveRoutine = { routineId: 'matching-id' }`. Seed a user routine with `id: 'matching-id'` via `storageService.getRoutines` mock. Render page, open kebab menu on the user routine, click Delete, click Confirm in DeleteRoutineDialog. Assert `mockEndRoutine` was called once. Assert `storageService.deleteRoutine` was called with `'matching-id'`. |
| handleDelete does NOT call endRoutine when active routine differs | unit | Set `mockActiveRoutine = { routineId: 'other-id' }`. Seed user routine with `id: 'matching-id'`. Same flow. Assert `mockEndRoutine` was NOT called. Assert `storageService.deleteRoutine` was called with `'matching-id'`. |
| handleDelete does NOT call endRoutine when no active routine | unit | `mockActiveRoutine = null`. Same flow. Assert `mockEndRoutine` was NOT called. |
| handleDelete still calls refreshRoutines + showToast + setDeletingRoutine on both paths | unit | One test per path; assert `mockShowToast` called with `'Deleted "<name>"'`; assert DeleteRoutineDialog disappears from DOM after confirm. |
| Order of operations: endRoutine before deleteRoutine | unit | Use `vi.fn()` with `mockImplementation` to record call order; assert `mockEndRoutine.mock.invocationCallOrder[0] < deleteRoutineSpy.mock.invocationCallOrder[0]`. |

**Expected state after completion:**
- [ ] `useAudioState` and `endRoutine` imported and consumed in RoutinesPage
- [ ] `handleDelete` dispatches `END_ROUTINE` (via `endRoutine()`) when active routine matches
- [ ] No new actions, no reducer changes
- [ ] All preserved handlers intact
- [ ] 5 new behavioral assertions in RoutinesPage.test.tsx

---

### Step 6: RoutineBuilder — Save Routine CTA + border opacity unification (Change 6)

**Objective:** Migrate the Save Routine CTA chrome to canonical white-pill Pattern 2. Apply Direction Decision 4 border-opacity unification (`border-white/10` → `border-white/[0.12]`) to 5 RoutineBuilder sites + 1 decorative connecting line. Verify Cancel button is canonical (it is). Verify NO active-state drift to migrate (Step Type Picker chips preserved as decorative type indicators per Decision 20).

**Files to create/modify:**
- `frontend/src/components/music/RoutineBuilder.tsx` — multiple className edits

**Details:**

**Step 6a — Save Routine CTA migration (line 311-318):**

Replace:
```tsx
<button
  type="button"
  onClick={handleSave}
  disabled={steps.length === 0}
  className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
>
  Save Routine
</button>
```

With:
```tsx
<button
  type="button"
  onClick={handleSave}
  disabled={steps.length === 0}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  Save Routine
</button>
```

Note: `disabled:opacity-40` preserved (was already on the button). `focus-visible:ring-offset-hero-dark` instead of `hero-bg` because the dialog wrapper background is `rgba(15, 10, 30, 0.95)` ≈ `hero-dark`.

**Step 6b — Border opacity migrations (Direction Decision 4):**

| Line | Current | Migrated |
|------|---------|----------|
| 138 | `rounded-2xl border border-white/10 p-6` (dialog wrapper) | `rounded-2xl border border-white/[0.12] p-6` |
| 155 | `border border-white/10 bg-white/5` (name input) | `border border-white/[0.12] bg-white/5` |
| 181 | `bg-white/10` (decorative connecting line) | `bg-white/[0.12]` |
| 200 | `border border-white/10 bg-white/5` (gap-input) | `border border-white/[0.12] bg-white/5` |
| 274 | `border border-white/10 bg-white/5` (sleep-timer select) | `border border-white/[0.12] bg-white/5` |
| 291 | `border border-white/10 bg-white/5` (fade-duration select) | `border border-white/[0.12] bg-white/5` |

**Step 6c — Cancel button verification:**

Line 304-309 — `border border-white/20 px-6 py-2.5 text-sm font-medium text-white/70 ... hover:bg-white/5`. Preserve exactly. Already canonical secondary per Spec 11A precedent. Add `min-h-[44px]` (currently missing) for touch-target compliance:

```tsx
<button
  type="button"
  onClick={onCancel}
  className="min-h-[44px] rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
>
  Cancel
</button>
```

**Step 6d — Active-state UI audit verdict:**

- Step Type Picker chip selectors at lines 224-244 (Scene = cyan, Scripture = amber, Story = primary-lt) — DECORATIVE type indicators matching RoutineStepCard's `BORDER_COLOR_MAP` palette. **Preserved per Direction Decision 20.** No migration.
- Sleep Timer / Fade Duration `<select>` elements at lines 270-298 — native selects, no active-state class. **No migration needed beyond border opacity.**
- "Add Step" button at line 254-261 — `border border-dashed border-white/20 ... hover:border-white/40 ... focus-visible:ring-primary` — preserve as-is (dashed pattern is intentional add-affordance chrome; `border-white/20` is decorative, NOT a `border-white/10` candidate).

**Auth gating:** N/A — RoutineBuilder is post-auth.

**Responsive behavior:**
- Desktop (1440px): Save Routine Pattern 2 `sm:text-lg`. Cancel canonical secondary.
- Tablet (768px): same.
- Mobile (375px): Pattern 2 `text-base`, `min-h-[44px]`.

**Inline position expectations:** Cancel + Save Routine in `flex justify-end gap-3`. Both `min-h-[44px]`. **No wrap allowed at any breakpoint** (dialog max-width is reasonable, two buttons fit).

**Guardrails (DO NOT):**
- Do NOT migrate Step Type Picker chip colors (Decision 20).
- Do NOT change form behavior (validation, name input, steps editor, sleep timer, fade duration, Cancel/Save flow).
- Do NOT modify ContentPicker mount.
- Do NOT change `disabled` logic on Save Routine (`steps.length === 0`).
- Do NOT remove `disabled:opacity-40`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Save Routine CTA matches white-pill Pattern 2 | unit | After mounting RoutineBuilder, get button by name `/Save Routine/i`; assert className contains `'bg-white'`, `'rounded-full'`, `'min-h-[44px]'`, `'text-hero-bg'` |
| Save Routine CTA does NOT have bg-primary | unit | className does NOT contain `'bg-primary'` |
| Save Routine disabled when steps.length === 0 | unit | With no steps added, the button has `disabled` attribute |
| Cancel button has min-h-[44px] | unit | Get button by name `/Cancel/i`; assert className contains `'min-h-[44px]'` |
| RoutineBuilder dialog wrapper border opacity | unit | Query the dialog container; className contains `'border-white/[0.12]'` (NOT `'border-white/10'`) |

**Expected state after completion:**
- [ ] Save Routine CTA = canonical white-pill Pattern 2
- [ ] All 5 border-opacity migrations applied + 1 decorative line
- [ ] Cancel button has min-h-[44px]
- [ ] Step Type Picker chips preserved (decorative)
- [ ] Form behavior unchanged

---

### Step 7: RoutineCard — Start CTA + Template badge text + kebab popover border (Change 7)

**Objective:** Migrate the Start CTA to canonical white-pill Pattern 2. Migrate the Template badge text from `text-primary` to `text-violet-300` while preserving the `bg-primary/10` decorative background. Migrate kebab-menu popover border from `border-white/10` to `border-white/[0.12]`.

**Files to create/modify:**
- `frontend/src/components/music/RoutineCard.tsx` — 3 className edits at lines 108, 145-151, 172

**Details:**

**Step 7a — Start CTA migration (lines 145-151):**

Replace:
```tsx
<button
  type="button"
  onClick={handleStart}
  className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
>
  <Play size={14} fill="currentColor" aria-hidden="true" /> Start
</button>
```

With:
```tsx
<button
  type="button"
  onClick={handleStart}
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  <Play size={14} fill="currentColor" aria-hidden="true" /> Start
</button>
```

`focus-visible:ring-offset-hero-dark` because RoutineCard sits on `bg-dashboard-dark` body. Pattern 2 `gap-2` (was `gap-1.5`) verbatim from canonical.

**Visual verification at execution:** the RoutineCard "Actions" row (line 144) is `flex items-center gap-2` with the kebab pushed `ml-auto`. Pattern 2's `px-8 py-3.5 sm:text-lg` Start CTA may dominate the row width on the 768px 2-column grid. Verify visually:
- 1440px (3-column grid, ~390px card width): expect comfortable fit.
- 768px (2-column grid, ~340px card width): risk of layout pressure. If the kebab wraps OR the card height jumps awkwardly, fall back to Pattern 1: `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100`.
- 375px (1-column, full card width): expect comfortable fit.

Default: Pattern 2 verbatim per spec. Document the fallback Pattern 1 string if visual regression is observed during execution.

**Step 7b — Template badge text migration (line 108):**

Replace:
```tsx
<span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
  Template
</span>
```

With:
```tsx
<span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">
  Template
</span>
```

Only `text-primary` → `text-violet-300` changes. `bg-primary/10` background preserved per Direction Decision 20 (decorative tint — categorical signal "this is a curated template").

**Step 7c — Kebab popover border migration (line 172):**

Replace:
```tsx
className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-white/10 py-1 shadow-lg"
```

With:
```tsx
className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-white/[0.12] py-1 shadow-lg"
```

Direction Decision 4 border-opacity unification.

**Auth gating:**
- `onClick={handleStart}` preserved exactly. `handleStart` (lines 65-71) reads `isAuthenticated` and routes through `authModal?.openAuthModal('Sign in to use bedtime routines')` when logged out.
- Existing test at `RoutinesPage.test.tsx:108-120` covers this; preserve.

**Responsive behavior:**
- Desktop (1440px): Pattern 2 Start CTA `sm:text-lg` in 3-column grid; Template badge with violet text on subtle violet tint.
- Tablet (768px): Pattern 2 Start CTA `sm:text-lg` in 2-column grid (visual verify — fallback Pattern 1 if layout breaks).
- Mobile (375px): Pattern 2 Start CTA `text-base` in single-column grid, `min-h-[44px]`.

**Inline position expectations:** Start CTA + kebab on same row (`flex items-center gap-2 ... ml-auto` on kebab). **No wrap at 1440px.** **At 768px:** verify visually — fall back to Pattern 1 if wrap observed. **At < 640px:** wrap acceptable (full-row card width).

**Guardrails (DO NOT):**
- Do NOT change `bg-primary/10` background on Template badge (Decision 20 decorative preservation).
- Do NOT change kebab menu items (Clone / Edit / Duplicate / Delete) class strings — they're already canonical and out of scope for 11B.
- Do NOT change menu item `text-danger` on Delete (preserved as-is — that's an internal menu item color, not a CTA).
- Do NOT change `onClick` handlers for any kebab menu item.
- Do NOT modify the kebab menu's inline `mousedown` + `keydown` handlers (lines 44-63) — Direction Decision 23 says verify, not migrate.
- Do NOT change card chrome at line 104 (`border-white/[0.12] bg-white/[0.06] ... shadow-[0_0_25px_...]` — already canonical).

**Test specifications:**

Create `frontend/src/components/music/__tests__/RoutineCard.test.tsx`:

| Test | Type | Description |
|------|------|-------------|
| Start CTA matches white-pill Pattern 2 | unit | Render with a template routine; get button by name `/Start/i`; assert className contains `'bg-white'`, `'rounded-full'`, `'min-h-[44px]'`, `'text-hero-bg'` |
| Start CTA does NOT have bg-primary | unit | className does NOT contain `'bg-primary'` |
| Template badge has text-violet-300 | unit | `screen.getByText('Template')` className contains `'text-violet-300'` |
| Template badge has bg-primary/10 (preserved) | unit | Same element className contains `'bg-primary/10'` |
| Template badge does NOT have text-primary | unit | Same element className does NOT contain `'text-primary'` (whole-word match — `'text-primary-'` substring is fine if it appears for unrelated reasons) |
| Kebab popover has border-white/[0.12] | unit | After clicking kebab trigger, the menu container className contains `'border-white/[0.12]'` |
| Auth gate on Start preserved | unit | With `mockIsAuthenticated = false`, click Start → `mockOpenAuthModal` called with `'Sign in to use bedtime routines'` |

Test setup pattern: mock `useAuth` and `useAuthModal` per `RoutinesPage.test.tsx` pattern. Render `<RoutineCard routine={mockTemplate} onStart={vi.fn()} onClone={vi.fn()} />` standalone.

**Expected state after completion:**
- [ ] Start CTA = canonical white-pill Pattern 2 (or Pattern 1 fallback documented if visual regression)
- [ ] Template badge text migrated to `text-violet-300`
- [ ] Template badge background `bg-primary/10` preserved
- [ ] Kebab popover border migrated
- [ ] Auth gate intact
- [ ] New `RoutineCard.test.tsx` file with 7 assertions

---

### Step 8: ContentPicker — active tab + hover tints + border opacity (Change 8 conditional, FIRES)

**Objective:** Migrate ContentPicker active tab from saturated `border-primary text-primary` to muted-white. Migrate card hover tints from `hover:border-primary` to `hover:border-white/[0.18]`. Apply Direction Decision 4 border-opacity unification at 5 sites. Preserve focus rings (`focus-visible:ring-primary-lt/70`) per the Critical Pre-Existing State Findings analysis.

**Files to create/modify:**
- `frontend/src/components/music/ContentPicker.tsx` — multiple className edits

**Details:**

**Step 8a — Active tab class string (lines 107-111):**

Replace:
```tsx
className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 ${
  isActive
    ? 'border-primary text-primary'
    : 'border-transparent text-white/60 hover:text-white'
}`}
```

With:
```tsx
className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 ${
  isActive
    ? 'border-white/30 text-white'
    : 'border-transparent text-white/60 hover:text-white'
}`}
```

Spec 11A active-foreground variant for tabs in a parent surface.

**Step 8b — Card hover tint migrations (lines 134, 163, 186):**

Three card buttons. Each has `border border-white/10 ... transition-colors hover:border-primary hover:bg-white/[0.06]`. Migrate to:

`border border-white/[0.12] ... transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]`

This matches RoutineCard's canonical hover at RoutineCard.tsx:104 (`hover:bg-white/[0.09] hover:border-white/[0.18]`).

**Step 8c — Border opacity migrations (Direction Decision 4):**

| Line | Current | Migrated |
|------|---------|----------|
| 70 | `border border-white/10` (dialog wrapper) | `border border-white/[0.12]` |
| 74 | `border-b border-white/10` (header) | `border-b border-white/[0.12]` |
| 89 | `border-b border-white/10` (tablist) | `border-b border-white/[0.12]` |
| 134 | (covered in Step 8b) | (covered in Step 8b) |
| 163 | (covered in Step 8b) | (covered in Step 8b) |
| 186 | (covered in Step 8b) | (covered in Step 8b) |

**Step 8d — Focus rings preserved.** Per Critical Pre-Existing State Findings, ContentPicker's `focus-visible:ring-primary-lt/70` rings (7 sites) are preserved — Spec 11A did not migrate this surface's focus rings, so 11B does not either without explicit direction.

**Auth gating:** N/A — ContentPicker is post-auth (only opens inside RoutineBuilder, which is post-auth).

**Responsive behavior:**
- Desktop (1440px): tablist horizontal across the dialog top; selected tab muted-white.
- Tablet (768px): same.
- Mobile (< 640px): dialog renders as bottom-sheet (`items-end justify-center sm:items-center` per line 56). Tablist horizontal across full width. Selected tab muted-white.

**Inline position expectations:** Tablist row (3 tabs) — already inline; no migration affects layout.

**Guardrails (DO NOT):**
- Do NOT migrate ContentPicker focus rings.
- Do NOT change scene/scripture/story selection flow.
- Do NOT change modal focus trap, click-outside dismiss, or Escape dismiss.
- Do NOT change tab keyboard navigation logic (lines 30-45).
- Do NOT add or remove tabs.

**Test specifications:**

Create `frontend/src/components/music/__tests__/ContentPicker.test.tsx`:

| Test | Type | Description |
|------|------|-------------|
| Active tab uses muted-white | unit | Render with `type='scene'`; get the Scene tab (active by default); assert className contains `'border-white/30'` and `'text-white'` (NOT `'border-primary'`, NOT `'text-primary'`) |
| Inactive tab preserved muted | unit | Get the Scripture tab; assert className contains `'border-transparent'` and `'text-white/60'` |
| Dialog wrapper border-white/[0.12] | unit | Get dialog by `role="dialog"`; assert className contains `'border-white/[0.12]'` |
| Card buttons use border-white/[0.12] and hover:border-white/[0.18] | unit | Get a scene card button; className contains `'border-white/[0.12]'` and `'hover:border-white/[0.18]'` |

**Expected state after completion:**
- [ ] Active tab uses Spec 11A muted-white pattern
- [ ] Card hover tints use canonical white-tier pattern
- [ ] All 5 border-opacity migrations applied
- [ ] Focus rings preserved
- [ ] Selection flow unchanged
- [ ] New `ContentPicker.test.tsx` file with 4 assertions

---

### Step 9: RoutineStepCard — verification only (Change 9 conditional, SKIPPED)

**Objective:** Verify RoutineStepCard has no chrome drift requiring migration. Per Critical Pre-Existing State Findings: colored `border-l-2` borders are decorative type indicators (preserve per Decision 20), `bg-white/5` is canonical, focus rings preserved per ContentPicker decision.

**Files to create/modify:** NONE. No production edits, no test file created.

**Details:**

Verification checklist (NO code changes):
- ✅ `border-l-2 border-glow-cyan` / `border-amber-400` / `border-primary-lt` — DECORATIVE type indicators (Decision 20 — preserve)
- ✅ `bg-white/5` background — canonical
- ✅ Focus rings `focus-visible:ring-primary-lt/70` — preserved per ContentPicker decision
- ✅ `min-h-[44px] min-w-[44px]` on Remove button (line 77) — canonical touch target
- ✅ No `bg-primary` solid CTA, no `text-primary` text-button, no `font-script`, no `font-serif italic`

**Auth gating:** N/A.

**Responsive behavior:** N/A — no changes.

**Inline position expectations:** N/A — no changes.

**Guardrails (DO NOT):**
- Do NOT migrate the colored borders (Decision 20).
- Do NOT touch the Up/Down/Remove icon buttons.

**Test specifications:** NONE. No new test file. Existing `RoutineBuilder.test.tsx` indirectly covers RoutineStepCard rendering.

**Expected state after completion:**
- [ ] No production code changes
- [ ] No test file created
- [ ] Verification documented in execution log

---

### Step 10: DeleteRoutineDialog — AlertTriangle + border opacity + severity destructive Delete CTA (Change 10 conditional, FIRES)

**Objective:** Apply 3 deltas to DeleteRoutineDialog (already canonical alertdialog otherwise): (a) add `AlertTriangle` icon to heading row, (b) migrate dialog wrapper border-white/10 → border-white/[0.12], (c) migrate Delete CTA from saturated `bg-red-700` to canonical muted-destructive `bg-red-950/30 border border-red-400/30 text-red-100`. Preserve everything else (role, aria, focus trap, copy, Cancel button).

**Files to create/modify:**
- `frontend/src/components/music/DeleteRoutineDialog.tsx` — multiple className edits + AlertTriangle import

**Details:**

**Step 10a — Add AlertTriangle import:**

At line 1, add:
```tsx
import { AlertTriangle } from 'lucide-react'
```

(Existing import line at line 1 is `import { useFocusTrap } from '@/hooks/useFocusTrap'`. After this change, two import lines.)

**Step 10b — Modify heading row (lines 27-29):**

Replace:
```tsx
<h2 id="delete-routine-title" className="text-lg font-semibold text-white">
  Delete {routineName}?
</h2>
```

With:
```tsx
<div className="flex items-center gap-3 mb-2">
  <AlertTriangle className="h-5 w-5 text-red-300 shrink-0" aria-hidden="true" />
  <h2 id="delete-routine-title" className="text-lg font-semibold text-white">
    Delete {routineName}?
  </h2>
</div>
```

Note: the existing `<p id="delete-routine-desc" className="mt-2 text-sm text-white/70">` at line 30 has `mt-2`. After the new heading row's `mb-2`, the description's `mt-2` will give 16px gap (looks correct vs. DeleteAccountModal where the heading container has `mb-2` and the description has no `mt-*`, getting 8px). **Tune at execution:** if the gap reads as too much, change description from `mt-2` to `mt-0`.

**Step 10c — Migrate dialog wrapper border (line 24):**

Replace:
```tsx
className="mx-4 max-w-sm rounded-2xl border border-white/10 p-6"
```

With:
```tsx
className="mx-4 max-w-sm rounded-2xl border border-white/[0.12] p-6"
```

**Step 10d — Migrate Delete CTA (lines 41-47):**

Replace:
```tsx
<button
  type="button"
  onClick={onConfirm}
  className="rounded-lg bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
>
  Delete
</button>
```

With:
```tsx
<button
  type="button"
  onClick={onConfirm}
  className="rounded-lg bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40 px-6 py-2 text-sm font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
>
  Delete
</button>
```

`min-h-[44px]` added for touch target. `focus-visible:ring-offset-hero-dark` because dialog background is `rgba(15, 10, 30, 0.95)` ≈ hero-dark.

**Step 10e — Cancel button verification (lines 34-40):**

Already canonical via `bg-white/10 ... hover:bg-white/15`. Add `min-h-[44px]` if missing:

```tsx
<button
  type="button"
  onClick={onCancel}
  className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
>
  Cancel
</button>
```

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): centered modal `max-w-sm`. AlertTriangle + heading inline. Cancel + Delete in `flex justify-end gap-3`.
- Tablet (768px): same.
- Mobile (375px): `mx-4` insets, modal still centered. AlertTriangle + heading inline. Cancel + Delete fit at this width.

**Inline position expectations:**
- Heading row: AlertTriangle + h2 in `flex items-center gap-3`. No wrap at any breakpoint.
- Actions row: Cancel + Delete in `flex justify-end gap-3`. Both `min-h-[44px]`. No wrap at any breakpoint.

**Guardrails (DO NOT):**
- Do NOT change `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`.
- Do NOT change `useFocusTrap(true, onCancel)`.
- Do NOT change confirmation copy (`Delete {routineName}?`, `This action cannot be undone.`) — out of scope.
- Do NOT change dialog background `rgba(15, 10, 30, 0.95)` (Direction Decision 15 preserves this for AudioDrawer; same precedent applies to dialogs).
- Do NOT use saturated red (`bg-red-500`, `bg-red-700`, etc.) — must use muted destructive palette.

**Test specifications:**

Create `frontend/src/components/music/__tests__/DeleteRoutineDialog.test.tsx`:

| Test | Type | Description |
|------|------|-------------|
| Dialog has aria-modal="true" | unit | After mounting, `screen.getByRole('alertdialog')` has attribute `aria-modal="true"` |
| Dialog has role="alertdialog" | unit | `screen.getByRole('alertdialog')` is in document |
| Heading row contains AlertTriangle icon | unit | The dialog contains an svg child of the heading row (lucide AlertTriangle has `aria-hidden`) — query via `dialog.querySelector('svg[aria-hidden="true"]')` |
| Delete CTA uses canonical muted destructive | unit | Get button by name `/^Delete$/`; className contains `'bg-red-950/30'`, `'border-red-400/30'`, `'text-red-100'` |
| Delete CTA does NOT have bg-red-700 | unit | className does NOT contain `'bg-red-700'` |
| Delete CTA has min-h-[44px] | unit | className contains `'min-h-[44px]'` |
| Cancel CTA canonical secondary | unit | className contains `'bg-white/10'` and `'hover:bg-white/15'` and `'min-h-[44px]'` |
| Dialog wrapper border-white/[0.12] | unit | The alertdialog className contains `'border-white/[0.12]'` |
| Confirm copy preserved | unit | Heading text matches `Delete <routineName>?`; description text contains `'cannot be undone'` |

Test setup: render `<DeleteRoutineDialog routineName="Test Routine" onConfirm={vi.fn()} onCancel={vi.fn()} />` in isolation. No additional mocks needed (no auth, no audio).

**Expected state after completion:**
- [ ] AlertTriangle icon present in heading row
- [ ] Dialog wrapper border migrated
- [ ] Delete CTA = canonical muted destructive
- [ ] Cancel CTA min-h-[44px] added
- [ ] All a11y attributes preserved
- [ ] Confirmation copy preserved
- [ ] New `DeleteRoutineDialog.test.tsx` with 9 assertions

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | RoutinesPage `<h1>` font-script removal |
| 2 | — | RoutinesPage subtitle font-serif italic removal |
| 3 | — | RoutinesPage Create Routine CTA white-pill Pattern 2 |
| 4 | — | RoutinesPage empty-state hint paragraph |
| 5 | — | RoutinesPage handleDelete behavioral fix (uses END_ROUTINE / endRoutine + routineId) |
| 6 | 3 (white-pill canonical class string established by Step 3, reused verbatim) | RoutineBuilder Save Routine + border opacity migrations |
| 7 | 3 (white-pill canonical class string), 6 | RoutineCard Start CTA + Template badge text + kebab border |
| 8 | — | ContentPicker active tab + hover + border opacity |
| 9 | — | RoutineStepCard verification (SKIPPED — no production change) |
| 10 | — | DeleteRoutineDialog AlertTriangle + border + severity destructive |

Steps 1, 2, 3, 4 can be merged into a single edit pass on RoutinesPage.tsx if executor prefers. Step 5 is best done as its own edit pass because it adds imports. Steps 6, 7, 8, 10 each touch independent files. Step 9 is a no-op.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | RoutinesPage hero font-script removal | [COMPLETE] | 2026-05-06 | RoutinesPage.tsx h1 simplified to plain text; RoutinesPage.test.tsx updated (2 tests) |
| 2 | RoutinesPage subtitle font-serif italic removal | [COMPLETE] | 2026-05-06 | Removed font-serif italic from subtitle p tag; RoutinesPage.test.tsx (2 tests) |
| 3 | RoutinesPage Create Routine CTA → white-pill Pattern 2 | [COMPLETE] | 2026-05-06 | Replaced bg-primary with canonical Pattern 2 class string; RoutinesPage.test.tsx (2 tests) |
| 4 | RoutinesPage empty-state hint paragraph | [COMPLETE] | 2026-05-06 | Added hint p between grid and Create button; RoutinesPage.test.tsx (3 tests including hidden-when-builder) |
| 5 | RoutinesPage handleDelete active-routine cleanup (END_ROUTINE / routineId) | [COMPLETE] | 2026-05-06 | Used endRoutine() from useRoutinePlayer() (not raw dispatch); checked routineId field; RoutinesPage.test.tsx (6 behavioral tests including invocationCallOrder assertion) |
| 6 | RoutineBuilder Save CTA + border opacity migrations | [COMPLETE] | 2026-05-06 | 8 edits: dialog border, name input border, connecting line, gap input border, sleep timer select border, fade duration select border, Cancel min-h-[44px], Save CTA → Pattern 2 (with disabled:opacity-40). RoutineBuilder.test.tsx: 5 new tests in new describe block |
| 7 | RoutineCard Start CTA + Template badge text + kebab border | [COMPLETE] | 2026-05-06 | text-primary → text-violet-300 on template badge (bg-primary/10 preserved per Direction Decision 20); Start CTA → Pattern 2 with focus-visible:ring-offset-hero-dark; kebab popover border-white/10 → border-white/[0.12]. New RoutineCard.test.tsx: 7 tests |
| 8 | ContentPicker active tab + hover + border opacity (FIRES) | [COMPLETE] | 2026-05-06 | 7 edits: dialog wrapper, header border-b, tablist border-b → border-white/[0.12]; active tab border-primary text-primary → border-white/30 text-white; all 3 card types → border-white/[0.12] + hover:border-white/[0.18]. Focus rings (ring-primary-lt/70) preserved. New ContentPicker.test.tsx: 4 tests |
| 9 | RoutineStepCard verification (SKIPPED — no drift) | [COMPLETE] | 2026-05-06 | Read RoutineStepCard.tsx — no border-primary, no text-primary, no font-script/font-serif; already canonical. No edits needed. No new tests needed. |
| 10 | DeleteRoutineDialog AlertTriangle + border + severity destructive (FIRES) | [COMPLETE] | 2026-05-06 | Complete rewrite: AlertTriangle import + heading row flex gap-3 mb-2; dialog border-white/[0.12]; frosted glass style; description mt-2 (16px gap — judgment call: kept mt-2 for visual hierarchy weight); Cancel min-h-[44px] + bg-white/10 hover:bg-white/15; Delete CTA → bg-red-950/30 border-red-400/30 text-red-100 hover:bg-red-900/40 min-h-[44px]. New DeleteRoutineDialog.test.tsx: 9 tests all passing |
