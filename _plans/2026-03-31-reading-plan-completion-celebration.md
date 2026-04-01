# Implementation Plan: Reading Plan Completion Celebration

**Spec:** `_specs/reading-plan-completion-celebration.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/reading-plan-completion-celebration`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> **Recon staleness note:** Design system recon was captured 2026-03-06 — before the dark theme overhaul, inner page hero redesigns, and dashboard widget enhancements. Values for overlay styling (backdrop, frosted glass cards, button pills) are verified from current source code inspection below, not from the stale recon. Hero values are not relevant to this spec (overlay only).

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/reading-plans/PlanCompletionOverlay.tsx`** (168 lines) — Current overlay. Portal to `document.body`, `useFocusTrap`, scroll lock, confetti via `generateConfetti()`, single verse (2 Timothy 4:7), challenge suggestion card, single "Browse more plans" CTA. **This file is the primary modification target.**
- **`frontend/src/components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx`** (134 lines) — 9 tests covering rendering, ARIA, dismiss, confetti, challenge suggestion, reduced motion. Tests use `MemoryRouter`, `vi.mock` for `findMatchingChallenge`, `renderOverlay()` helper with partial overrides.
- **`frontend/src/pages/ReadingPlanDetail.tsx`** (294 lines) — Parent page. Passes `planTitle`, `totalDays`, `planTheme`, `onDismiss`, `onBrowsePlans` to overlay. Triggers overlay after 1.5s delay when `justCompletedDay === plan.durationDays` and `completedAt` is set. **Needs minor prop additions (planId, startDate).**
- **`frontend/src/hooks/useReadingPlanProgress.ts`** (122 lines) — Returns `progress: ReadingPlanProgressMap`. Each `PlanProgress` has `startedAt: string` (ISO 8601), `completedDays: number[]`, `completedAt: string | null`.
- **`frontend/src/components/challenges/ChallengeCompletionOverlay.tsx`** (257 lines) — Reference implementation for share canvas integration, auto-dismiss, staggered animation, focus trap, confetti.
- **`frontend/src/components/my-prayers/PrayerAnsweredCelebration.tsx`** (211 lines) — Reference for step-based staggered animation pattern: `[step, setStep]` state with `fadeStyle(threshold, durationMs)` utility. Sound plays at a specific step. Most relevant animation pattern to follow.
- **`frontend/src/lib/challenge-share-canvas.ts`** (112 lines) — Canvas rendering pattern: 1080x1080, `document.fonts.ready`, gradient background, Caveat title, Inter body, "Worship Room" watermark. Returns `Promise<Blob>`.
- **`frontend/src/hooks/useSoundEffects.ts`** (48 lines) — `playSoundEffect('ascending')`. Gated by `wr_sound_effects_enabled` + `prefers-reduced-motion`.
- **`frontend/src/hooks/useFocusTrap.ts`** (52 lines) — `useFocusTrap(isActive, onEscape)` returns ref. Handles Tab/Shift+Tab cycling and Escape key.
- **`frontend/src/hooks/useReducedMotion.ts`** — Returns boolean for `prefers-reduced-motion: reduce`.
- **`frontend/src/constants/z-index.ts`** — `Z.OVERLAY = 60`.
- **`frontend/src/constants/dashboard/badge-icons.ts`** — `CONFETTI_COLORS` array (7 colors).

### Directory Conventions

- Components: `frontend/src/components/reading-plans/`
- Canvas utils: `frontend/src/lib/` (e.g., `challenge-share-canvas.ts`, `verse-card-canvas.ts`)
- Constants: `frontend/src/constants/` (organized by feature)
- Tests: `__tests__/` directories alongside components
- Types: `frontend/src/types/`

### Component/Service Patterns

- Celebration overlays use `createPortal(jsx, document.body)` with `useFocusTrap`, scroll lock, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- Step-based staggered animations: `PrayerAnsweredCelebration.tsx` pattern — `[step, setStep]` with `setTimeout` array, `fadeStyle(threshold, durationMs)` helper for opacity+translateY transitions. `reducedMotion` sets step to max immediately.
- Canvas share images: async function returning `Promise<Blob>`, uses `document.fonts.ready`, offscreen `<canvas>`, gradient background, Caveat+Inter fonts, "Worship Room" watermark.
- Share flow: Web Share API with file sharing, fallback to programmatic download link. See `ChallengeCompletionOverlay.tsx` lines 123-152.

### Test Patterns

- Vitest + React Testing Library + `userEvent.setup()`.
- Portal components: query `document.body` directly for portal-rendered content.
- Mocks: `vi.hoisted()` + `vi.mock()` for hooks (`useSoundEffects`, `useReducedMotion`). `vi.useFakeTimers()` for auto-dismiss and staggered animation timing.
- Provider wrapping: `MemoryRouter` for components with `<Link>` or `useNavigate`.
- Animation tests: check class presence (`.animate-confetti-fall`), verify `motion-reduce:hidden`.
- Render helpers: `renderOverlay()` with partial prop overrides.

### Data Model

```typescript
// types/reading-plans.ts — existing, no changes needed
interface PlanProgress {
  startedAt: string      // ISO 8601
  currentDay: number
  completedDays: number[]
  completedAt: string | null // set when all days done
}
```

**localStorage keys touched (read only):**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Read | Derive start date from `progress.startedAt`, completion from `progress.completedAt`, days from `progress.completedDays` |
| `wr_sound_effects_enabled` | Read | Sound effect preference (via `useSoundEffects` hook) |

No new localStorage keys introduced.

---

## Auth Gating Checklist

**This feature is entirely within the reading plan detail page (`/reading-plans/:planId`). Completion tracking requires auth. Logged-out users cannot reach this overlay.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Complete final day | Auth-gated (progress tracking) | N/A (existing) | `isAuthenticated` check in `ReadingPlanDetail.tsx` |
| View completion overlay | Auth-gated (only fires after completion) | N/A (existing) | Overlay only mounts when `showPlanOverlay` is true, which requires authenticated day completion |
| Share completion card | Auth-gated (unreachable logged-out) | Step 3 | Same — overlay only exists in authenticated context |

No new auth gates required.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Overlay backdrop | background | `bg-black/70 backdrop-blur-sm` | `PlanCompletionOverlay.tsx:80` (existing) |
| Content card | background + border | `border border-white/15 bg-hero-mid/90 rounded-2xl` | `PlanCompletionOverlay.tsx:90` (existing) |
| Content card | padding | `p-8 sm:p-10` | `PlanCompletionOverlay.tsx:90` (existing) |
| "Plan Complete!" heading | font | Caveat (`font-script`), `text-4xl sm:text-5xl`, white | `PlanCompletionOverlay.tsx:104` (existing) |
| Plan title | font | Inter bold, `text-xl`, white | `PlanCompletionOverlay.tsx:109` (existing) |
| Stats inset card | background + border | `bg-white/5 border border-white/10 rounded-xl p-4` | spec design notes |
| Stats text | color/size | `text-sm text-white/60` | spec design notes |
| Scripture blockquote | font | `font-serif italic text-base leading-relaxed text-white/80` | `PlanCompletionOverlay.tsx:115` (existing) |
| Scripture reference | font | `text-sm text-white/60` | `PlanCompletionOverlay.tsx:119` (existing) |
| CTA buttons | style | Frosted glass pills: `rounded-xl border border-white/10 bg-white/[0.08] min-h-[44px] px-6 py-3 text-white hover:bg-white/[0.12]` | `ChallengeCompletionOverlay.tsx:230` |
| Confetti | colors | `CONFETTI_COLORS` from `badge-icons.ts`: `['#D97706', '#C2703E', '#8B7FA8', '#2DD4BF', '#34D399', '#FFFFFF', '#F59E0B']` | `PlanCompletionOverlay.tsx:6` (existing) |
| Canvas background | gradient | Dark purple: `#1E0B3E` → `#0D0620` (hero-mid → hero-dark) | `challenge-share-canvas.ts` pattern, adapted for purple |
| Canvas heading | font | `bold 72px Caveat, cursive`, white | `challenge-share-canvas.ts:64` |
| Canvas body text | font | `36px Inter, sans-serif`, white | `challenge-share-canvas.ts:69` |
| Canvas watermark | font | `28px Caveat, cursive`, `rgba(255,255,255,0.4)` | `challenge-share-canvas.ts:101-102` |

---

## Design System Reminder

**Project-specific quirks for UI steps:**

- Worship Room uses **Caveat** (`font-script`) for script/celebration headings, NOT Lora. Lora is for scripture/journal only.
- All celebration overlays render via `createPortal` to `document.body`, not inline in the component tree.
- Confetti particles use CSS variable `--confetti-duration` with `animate-confetti-fall` keyframe class and `motion-reduce:hidden`.
- Frosted glass cards in overlays: `border border-white/15 bg-hero-mid/90 rounded-2xl` (NOT `bg-white/5` — that's for dashboard cards).
- Stats inset cards use `bg-white/5 border border-white/10 rounded-xl` (slightly different from the outer overlay card).
- CTA button pills use `border border-white/10 bg-white/[0.08]` (NOT solid `bg-primary`).
- `Z.OVERLAY = 60` — all celebration overlays use `z-[60]` or `z-50` (current overlay uses z-50).
- Sound effects: `useSoundEffects()` hook handles all gating internally. Just call `playSoundEffect('ascending')`.
- Step-based animation pattern (from `PrayerAnsweredCelebration.tsx`): `[step, setStep]` state + `fadeStyle(threshold, durationMs)` helper. Reduced motion skips to max step immediately.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature. Uses existing types from `types/reading-plans.ts` and `types/dashboard.ts`.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Overlay `mx-4`, CTA buttons stack vertically (`flex-col`), stats card full-width, confetti count: 15 |
| Tablet | 768px | Overlay centered `max-w-md`, CTA buttons in a row (`sm:flex-row`), confetti count: 30 |
| Desktop | 1440px | Same as tablet — overlay is `max-w-md` centered, comfortable spacing |

No custom breakpoints needed — standard `sm:` (640px) breakpoint for layout changes.

---

## Vertical Rhythm

N/A — this is a modal overlay rendered in a portal, not a page section. Internal spacing is self-contained within the frosted glass card.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Existing `PlanCompletionOverlay` component exists and is working
- [x] `useReadingPlanProgress` returns `startedAt` in `PlanProgress` for start date derivation
- [x] `challenge-share-canvas.ts` pattern is available for canvas rendering reference
- [x] `useSoundEffects` and `useFocusTrap` hooks are available
- [x] `CONFETTI_COLORS` constant is importable from `@/constants/dashboard/badge-icons`
- [x] All auth-gated actions from the spec are accounted for in the plan (none needed — existing protection)
- [x] Design system values are verified from current source code inspection
- [x] No [UNVERIFIED] values — all styling comes from existing overlay patterns in source code
- [x] No recon report needed (overlay, not a new page)
- [x] No master plan dependencies

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Start date derivation | Use `progress.startedAt` from `wr_reading_plan_progress` | Spec says "derive start date from earliest completed day" but `startedAt` is already tracked and more reliable than inferring from day timestamps |
| Scripture selection stability | Use `useState(() => random)` so scripture persists for the overlay's lifecycle | Prevents re-render from changing the quote |
| Auto-dismiss cleanup | Clear timeout on unmount and on manual dismiss | Prevents stale timer from firing after user already closed |
| Share error handling | Silently catch errors (user cancel, API unavailable) | Same pattern as `ChallengeCompletionOverlay.tsx` lines 148-151 |
| Challenge suggestion removal | Remove the challenge suggestion card | Spec replaces it with stats section + 3 CTAs. The challenge cross-promo was secondary; the spec explicitly defines 3 buttons (Browse Plans, Share, Done) as the CTAs |
| Canvas story size (1080x1920) | Include if straightforward | Spec says "if straightforward to add" — it is, since it's just a different canvas height with repositioned elements |
| Step animation timing | Follow spec exactly: 0/300/500/900/1200/1700ms | Clear spec guidance, matches the `PrayerAnsweredCelebration` step pattern |
| Confetti counts | Keep existing: 15 mobile, 30 desktop | Spec confirms these are already implemented |
| Sound timing | Play at step 3 (500ms, when heading appears) | Spec: "Sound plays at 500ms (when heading appears)" |

---

## Implementation Steps

### Step 1: Add Curated Completion Scriptures Constant

**Objective:** Create the curated set of 4 completion scriptures as a constant file.

**Files to create/modify:**
- `frontend/src/constants/reading-plan-completion-scriptures.ts` — New file

**Details:**

Create a small constants file with the 4 curated WEB scriptures from the spec:

```typescript
export interface CompletionScripture {
  text: string
  reference: string
}

export const PLAN_COMPLETION_SCRIPTURES: CompletionScripture[] = [
  {
    text: 'All Scripture is inspired by God and profitable for teaching, for reproof, for correction, and for instruction in righteousness.',
    reference: '2 Timothy 3:16 WEB',
  },
  {
    text: 'Your word is a lamp to my feet, and a light for my path.',
    reference: 'Psalm 119:105 WEB',
  },
  {
    text: 'The word of God is living and active, and sharper than any two-edged sword.',
    reference: 'Hebrews 4:12 WEB',
  },
  {
    text: 'Heaven and earth will pass away, but my words will not pass away.',
    reference: 'Matthew 24:35 WEB',
  },
]
```

**Auth gating:** N/A — constants file.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT include non-WEB translations
- DO NOT add more than the 4 scriptures specified
- DO NOT create a hook or service — this is a simple constant

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Constants file, no tests needed |

**Expected state after completion:**
- [x] `frontend/src/constants/reading-plan-completion-scriptures.ts` exists with `PLAN_COMPLETION_SCRIPTURES` array of 4 entries
- [x] Each entry has `text` and `reference` fields
- [x] All references include "WEB" suffix

---

### Step 2: Create Canvas Rendering Utility for Plan Completion Card

**Objective:** Create `plan-completion-canvas.ts` following the `challenge-share-canvas.ts` pattern.

**Files to create/modify:**
- `frontend/src/lib/plan-completion-canvas.ts` — New file

**Details:**

Follow the `challenge-share-canvas.ts` pattern exactly (lines 44-111). The function signature:

```typescript
export interface PlanCompletionCanvasOptions {
  planTitle: string
  totalDays: number
  totalPoints: number
  scripture: { text: string; reference: string }
}

export async function generatePlanCompletionImage(
  options: PlanCompletionCanvasOptions,
): Promise<Blob>
```

**Canvas layout (1080x1080 square):**
1. Background: linear gradient from `#1E0B3E` (hero-mid, top-left) to `#0D0620` (hero-dark, bottom-right) — dark purple, consistent with app identity
2. "Plan Complete" header: `bold 64px Caveat, cursive`, white, centered at y≈300
3. Plan title in quotes: `italic 36px Lora, serif`, `rgba(255,255,255,0.85)`, centered at y≈390
4. Stats line: `28px Inter, sans-serif`, `rgba(255,255,255,0.7)`, centered at y≈470. Format: "{totalDays} days  ·  +{totalPoints} faith points"
5. Scripture text: `italic 24px Lora, serif`, `rgba(255,255,255,0.6)`, word-wrapped centered at y≈570. Use a simple `wrapText()` helper (same as `challenge-share-canvas.ts` approach — `ctx.measureText` loop).
6. Scripture reference: `20px Inter, sans-serif`, `rgba(255,255,255,0.5)`, centered below scripture
7. Watermark: `28px Caveat, cursive`, `rgba(255,255,255,0.4)`, "Worship Room" at y≈1020

**Story size (1080x1920):** Same content, repositioned vertically to center in the taller canvas. Background gradient same. Header at y≈580, title at y≈670, stats at y≈750, scripture at y≈850, watermark at y≈1860.

Use `document.fonts.ready` before drawing (same as `challenge-share-canvas.ts:53`).
Return via `canvas.toBlob()` promise pattern (same as `challenge-share-canvas.ts:105-110`).

**Auth gating:** N/A — utility function.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT use Caveat for scripture text — use Lora (serif) for scripture
- DO NOT add progress bar (spec doesn't call for one on the canvas card)
- DO NOT import from any component — this is a standalone utility
- DO NOT make more than 2 sizes (square + story)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns a Blob` | unit | Call with valid options, verify result is a Blob with type `image/png` |
| `handles missing fonts gracefully` | unit | Mock `document.fonts.ready` to resolve, verify no throw |

**Expected state after completion:**
- [x] `frontend/src/lib/plan-completion-canvas.ts` exists with `generatePlanCompletionImage()` export
- [x] Generates 1080x1080 PNG blob with dark purple gradient, Caveat header, Lora scripture, Inter stats, watermark
- [x] Optional `size` parameter for `'square' | 'story'` (default: `'square'`)

---

### Step 3: Rewrite PlanCompletionOverlay with Enhanced Celebration

**Objective:** Replace the current `PlanCompletionOverlay` with the enhanced version featuring staggered animations, journey stats, curated scripture, sound effect, auto-dismiss, and share functionality.

**Files to modify:**
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` — Rewrite

**Details:**

**New props interface:**
```typescript
interface PlanCompletionOverlayProps {
  planTitle: string
  totalDays: number
  planId: string
  startDate?: string | null  // ISO 8601 from progress.startedAt
  onDismiss: () => void
  onBrowsePlans: () => void
}
```

Remove `planTheme` prop (challenge suggestion is being replaced). Add `planId` (for canvas filename) and `startDate`.

**Imports to add:** `useSoundEffects`, `useReducedMotion`, `Z` from z-index, `PLAN_COMPLETION_SCRIPTURES` from new constants, `generatePlanCompletionImage` from new canvas util.

**Imports to remove:** `Link` (no longer needed — buttons use callbacks), `findMatchingChallenge`, `getParticipantCount`, `PlanTheme` type.

**Step-based animation sequence** (follow `PrayerAnsweredCelebration.tsx` pattern exactly):

```typescript
const [step, setStep] = useState(reducedMotion ? 7 : 0)

useEffect(() => {
  if (reducedMotion) return
  const timers = [
    setTimeout(() => setStep(1), 0),      // Backdrop fades in (300ms)
    setTimeout(() => setStep(2), 300),     // Confetti begins
    setTimeout(() => setStep(3), 500),     // Icon + heading appear
    setTimeout(() => setStep(4), 900),     // Plan title fades in
    setTimeout(() => setStep(5), 1200),    // Stats card fades in
    setTimeout(() => setStep(6), 1700),    // Scripture fades in
    setTimeout(() => setStep(7), 2000),    // CTA buttons fade in
  ]
  return () => timers.forEach(clearTimeout)
}, [reducedMotion])
```

**`fadeStyle` helper** (same as `PrayerAnsweredCelebration.tsx:102-109`):
```typescript
const fadeStyle = (threshold: number, durationMs = 300): React.CSSProperties =>
  reducedMotion ? {} : {
    opacity: step >= threshold ? 1 : 0,
    transform: step >= threshold ? 'translateY(0)' : 'translateY(10px)',
    transition: `opacity ${durationMs}ms ease-out, transform ${durationMs}ms ease-out`,
  }
```

**Sound effect:** Play `ascending` when step reaches 3 (500ms mark, heading appears):
```typescript
useEffect(() => {
  if (step === 3) playSoundEffect('ascending')
}, [step, playSoundEffect])
```

**Auto-dismiss after 15 seconds:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => onDismiss(), 15_000)
  return () => clearTimeout(timer)
}, [onDismiss])
```

**Scripture:** Randomly selected on mount via `useState()` initializer (same pattern as `PrayerAnsweredCelebration.tsx:63-65`):
```typescript
const [scripture] = useState(() =>
  PLAN_COMPLETION_SCRIPTURES[Math.floor(Math.random() * PLAN_COMPLETION_SCRIPTURES.length)]
)
```

**Stats section:**
- Days completed: `{totalDays} days completed`
- Date range (if `startDate` provided): format start/finish as "Started Mar 10 — Finished Mar 31"
  - Use `new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` for start
  - Use `new Date().toLocaleDateString(...)` for finish (today, since they just completed)
- Total faith points: `+{totalDays * 15} faith points earned`

**Stats card markup:**
```tsx
<div
  className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4"
  style={fadeStyle(5, 300)}
>
  <p className="text-lg font-bold text-white">{totalDays} days completed</p>
  {startDate && (
    <p className="mt-1 text-sm text-white/60">
      Started {formatDate(startDate)} — Finished {formatDate(new Date().toISOString())}
    </p>
  )}
  <p className="mt-1 text-sm text-white/60">+{totalDays * 15} faith points earned</p>
</div>
```

**Three CTA buttons** (replacing the old single button + challenge suggestion):
```tsx
<div
  className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
  style={fadeStyle(7)}
>
  <button onClick={onBrowsePlans} className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]">
    Browse Plans
  </button>
  <button onClick={handleShare} className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]">
    Share
  </button>
  <button onClick={onDismiss} className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.08] px-6 py-3 font-medium text-white transition-colors hover:bg-white/[0.12]">
    Done
  </button>
</div>
```

**Share handler** (follow `ChallengeCompletionOverlay.tsx:123-152`):
```typescript
const handleShare = useCallback(async () => {
  try {
    const blob = await generatePlanCompletionImage({
      planTitle,
      totalDays,
      totalPoints: totalDays * 15,
      scripture,
    })
    const file = new File([blob], `reading-plan-complete.png`, { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `${planTitle} — Plan Complete!`,
        text: `I completed the ${planTitle} reading plan on Worship Room!`,
        files: [file],
      })
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'reading-plan-complete.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  } catch (_e) {
    // User cancelled or share failed — silently ignore
  }
}, [planTitle, totalDays, scripture])
```

**Overlay structure (top to bottom):**
1. Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm` with `opacity` transition controlled by `step >= 1`
2. Confetti: render when `step >= 2 && !reducedMotion` (keep existing `generateConfetti` function)
3. Content card: `mx-4 max-w-md rounded-2xl border border-white/15 bg-hero-mid/90 p-8 sm:p-10 text-center`
4. Close button (X): same as existing, top-right corner
5. Checkmark or Book icon (Lucide `BookCheck`): `fadeStyle(3)`, `h-10 w-10 text-primary-lt mx-auto mb-3`
6. "Plan Complete!" heading: `font-script text-4xl sm:text-5xl text-white`, `fadeStyle(3)`
7. Plan title: `text-xl font-bold text-white mt-3`, `fadeStyle(4, 200)`
8. Stats card: `fadeStyle(5, 300)` — days, date range, points
9. Scripture blockquote: `font-serif italic text-base text-white/80 mt-5`, `fadeStyle(6, 300)` + reference below
10. CTA buttons: `fadeStyle(7, 200)`

**Focus management:** Use `useFocusTrap(true, onDismiss)` as the existing overlay does. Focus the "Done" button when step reaches 7 (buttons appear).

**Scroll lock:** Keep existing pattern (`document.body.style.overflow = 'hidden'` on mount, restore on cleanup).

**Auth gating:** N/A — overlay only renders in authenticated context.

**Responsive behavior:**
- Desktop (1440px): Overlay centered, `max-w-md`, CTA buttons in a row (`sm:flex-row`), 30 confetti
- Tablet (768px): Same as desktop
- Mobile (375px): Overlay `mx-4`, CTA buttons stack (`flex-col`), 15 confetti, all buttons `min-h-[44px]`

**Guardrails (DO NOT):**
- DO NOT keep the challenge suggestion card — spec replaces it with stats + 3 CTAs
- DO NOT use `Link` component for CTAs — use `button` with `onClick` callbacks for Browse Plans and Done
- DO NOT use inline `matchMedia` for reduced motion — use the `useReducedMotion` hook
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT add a progress bar to the overlay (spec doesn't include one)
- DO NOT change the confetti generation function or colors — keep existing `generateConfetti` with `CONFETTI_COLORS`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders heading and plan title` | unit | Verify "Plan Complete!" and plan title text |
| `shows stats section with days and points` | unit | Verify "7 days completed" and "+105 faith points earned" |
| `shows date range when startDate provided` | unit | Pass `startDate`, verify "Started" and "Finished" text |
| `omits date range when startDate is null` | unit | Pass no startDate, verify no "Started" text |
| `displays a scripture from the curated set` | unit | Verify one of the 4 scripture texts renders |
| `plays ascending sound effect` | unit | Mock `useSoundEffects`, advance timers to 500ms, verify `playSoundEffect('ascending')` called |
| `renders 3 CTA buttons` | unit | Verify "Browse Plans", "Share", "Done" buttons exist |
| `Browse Plans calls onBrowsePlans` | unit | Click "Browse Plans", verify callback |
| `Done calls onDismiss` | unit | Click "Done", verify callback |
| `Share triggers canvas generation` | integration | Mock `generatePlanCompletionImage`, click "Share", verify called |
| `dismisses on Escape key` | unit | Press Escape, verify `onDismiss` called |
| `dismisses on X button` | unit | Click close button, verify `onDismiss` called |
| `auto-dismisses after 15 seconds` | unit | Use fake timers, advance 15s, verify `onDismiss` called |
| `renders as dialog with correct ARIA` | unit | Verify `role="dialog"`, `aria-modal`, `aria-labelledby` |
| `shows confetti particles` | unit | Verify `.animate-confetti-fall` elements exist |
| `reduced motion disables animations and hides confetti` | unit | Mock reduced motion, verify no confetti, all content visible immediately |

**Expected state after completion:**
- [x] `PlanCompletionOverlay` renders enhanced overlay with staggered animations
- [x] Stats section shows days, date range (when available), and faith points
- [x] Curated scripture from 4-verse set displays
- [x] `ascending` sound plays at 500ms
- [x] Three CTA buttons: Browse Plans, Share, Done
- [x] Share generates canvas image and uses Web Share API / download fallback
- [x] Auto-dismiss after 15 seconds
- [x] Focus trap, Escape key, X button all dismiss
- [x] Confetti hidden when `prefers-reduced-motion`
- [x] All animations collapse to immediate render when reduced motion active

---

### Step 4: Update ReadingPlanDetail to Pass New Props

**Objective:** Pass `planId` and `startDate` to the enhanced `PlanCompletionOverlay`.

**Files to modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Minor prop additions

**Details:**

At line 282-290 (the `PlanCompletionOverlay` rendering), update the props:

**Before:**
```tsx
<PlanCompletionOverlay
  planTitle={plan.title}
  totalDays={plan.durationDays}
  planTheme={plan.theme}
  onDismiss={() => setShowPlanOverlay(false)}
  onBrowsePlans={() => navigate('/grow?tab=plans')}
/>
```

**After:**
```tsx
<PlanCompletionOverlay
  planTitle={plan.title}
  totalDays={plan.durationDays}
  planId={planId!}
  startDate={progress?.startedAt ?? null}
  onDismiss={() => setShowPlanOverlay(false)}
  onBrowsePlans={() => navigate('/grow?tab=plans')}
/>
```

Remove `planTheme` (no longer accepted). Add `planId` and `startDate`.

Also remove the `PlanTheme` import if it was only used for the overlay prop (check if used elsewhere in the file — it is NOT used elsewhere, so remove it from the import of `PlanCompletionOverlay` but note `plan.theme` is referenced by `plan` object itself which comes from `getReadingPlan`).

Actually, `PlanTheme` is not directly imported in `ReadingPlanDetail.tsx` — it was only passed as a prop. The `plan.theme` access works through the return type of `getReadingPlan`. No import cleanup needed beyond removing `planTheme` prop.

**Auth gating:** N/A — no change to auth behavior.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the overlay trigger timing (1.5s delay logic is correct as-is)
- DO NOT modify the day completion intersection observer
- DO NOT change `DayCompletionCelebration` behavior
- DO NOT add any new state variables

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Existing `ReadingPlanDetail` tests cover overlay rendering; new overlay tests in Step 3 cover prop handling |

**Expected state after completion:**
- [x] `ReadingPlanDetail` passes `planId` and `startDate` to `PlanCompletionOverlay`
- [x] `planTheme` prop removed
- [x] Overlay trigger timing unchanged (1.5s after last day completion)
- [x] All existing reading plan functionality unchanged

---

### Step 5: Update Tests

**Objective:** Update the existing `PlanCompletionOverlay.test.tsx` to match the new component API and behavior, and add canvas utility tests.

**Files to modify:**
- `frontend/src/components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx` — Rewrite to match new component
- `frontend/src/lib/__tests__/plan-completion-canvas.test.ts` — New file

**Details:**

**`PlanCompletionOverlay.test.tsx` rewrite:**

Update the `renderOverlay` helper to use new props:
```typescript
function renderOverlay(overrides: Partial<{
  planTitle: string
  totalDays: number
  planId: string
  startDate: string | null
  onDismiss: () => void
  onBrowsePlans: () => void
}> = {}) {
  return render(
    <MemoryRouter>
      <PlanCompletionOverlay
        planTitle={overrides.planTitle ?? 'Finding Peace in Anxiety'}
        totalDays={overrides.totalDays ?? 7}
        planId={overrides.planId ?? 'anxiety'}
        startDate={overrides.startDate ?? '2026-03-24T10:00:00.000Z'}
        onDismiss={overrides.onDismiss ?? vi.fn()}
        onBrowsePlans={overrides.onBrowsePlans ?? vi.fn()}
      />
    </MemoryRouter>,
  )
}
```

Add mocks for:
- `useSoundEffects` — mock `playSoundEffect` to a `vi.fn()`
- `useReducedMotion` — mock to return `false` by default, `true` in reduced motion test
- `generatePlanCompletionImage` — mock to return a `new Blob(['test'], { type: 'image/png' })`

Use `vi.useFakeTimers()` for:
- Auto-dismiss test (advance 15s)
- Sound effect timing test (advance to 500ms)
- Staggered animation tests

Remove mocks for:
- `findMatchingChallenge` — no longer used
- `getParticipantCount` — no longer used

Remove tests for:
- Challenge suggestion card
- Fallback card when no matching challenge

Add tests per Step 3 test specifications table (16 tests total).

**`plan-completion-canvas.test.ts`:**

Mock `document.createElement('canvas')` to return a mock canvas with `getContext('2d')` returning a mock context. Mock `document.fonts.ready` as `Promise.resolve()`. Mock `canvas.toBlob()` to call callback with a `new Blob(['test'], { type: 'image/png' })`.

```typescript
describe('generatePlanCompletionImage', () => {
  it('returns a PNG blob', async () => {
    const blob = await generatePlanCompletionImage({
      planTitle: 'Test Plan',
      totalDays: 7,
      totalPoints: 105,
      scripture: { text: 'Test verse', reference: 'Test 1:1' },
    })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })
})
```

**Auth gating:** N/A — test files.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT skip mocking `useSoundEffects` — unmocked hook tries to access AudioContext which fails in jsdom
- DO NOT forget `vi.useFakeTimers()` setup/teardown for timing tests
- DO NOT test canvas pixel content (fragile) — test that the function returns a Blob of correct type
- DO NOT remove the `MemoryRouter` wrapper — the component may use `useNavigate` indirectly

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 16 overlay tests | unit | Per Step 3 test specifications |
| 1 canvas blob test | unit | Verify `generatePlanCompletionImage` returns PNG Blob |

**Expected state after completion:**
- [x] All 16+ overlay tests pass
- [x] Canvas utility test passes
- [x] No regression in existing reading plan tests
- [x] `pnpm test` passes with 0 failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create completion scriptures constant |
| 2 | — | Create canvas rendering utility |
| 3 | 1, 2 | Rewrite PlanCompletionOverlay (imports constant + canvas util) |
| 4 | 3 | Update ReadingPlanDetail props (must match new overlay API) |
| 5 | 1, 2, 3, 4 | Update/create all tests (needs all code in place) |

Steps 1 and 2 can be done in parallel. Step 3 requires 1 and 2. Step 4 requires 3. Step 5 requires all.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Curated Completion Scriptures Constant | [COMPLETE] | 2026-03-31 | Created `frontend/src/constants/reading-plan-completion-scriptures.ts` with 4 WEB scriptures |
| 2 | Canvas Rendering Utility | [COMPLETE] | 2026-03-31 | Created `frontend/src/lib/plan-completion-canvas.ts` with square + story sizes, Caveat header, Lora scripture, Inter stats, watermark |
| 3 | Rewrite PlanCompletionOverlay | [COMPLETE] | 2026-03-31 | Rewrote `PlanCompletionOverlay.tsx` with step-based animations, curated scripture, stats card, sound effect, auto-dismiss, share canvas, 3 CTA buttons. TS errors remain in test + parent (Steps 4-5). |
| 4 | Update ReadingPlanDetail Props | [COMPLETE] | 2026-03-31 | Updated `ReadingPlanDetail.tsx` — replaced `planTheme` with `planId` + `startDate` props |
| 5 | Update Tests | [COMPLETE] | 2026-03-31 | Rewrote `PlanCompletionOverlay.test.tsx` (16 tests), created `plan-completion-canvas.test.ts` (2 tests). All 18 pass. 0 new regressions. |
