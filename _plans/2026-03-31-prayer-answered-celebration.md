# Implementation Plan: Prayer Answered Celebration + Testimony Share Card

**Spec:** `_specs/prayer-answered-celebration.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/prayer-answered-celebration`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/my-prayers/PrayerAnsweredCelebration.tsx`** — Current celebration overlay (113 lines). Full-screen portal with purple confetti (`CONFETTI_COLORS` from badge-icons), "Prayer Answered!" heading in `font-script` (Caveat), dismiss button "Praise God!". Uses `useFocusTrap`, scroll lock, `createPortal` to `document.body`. Z-index: `Z.OVERLAY` (60).
- **`frontend/src/pages/MyPrayers.tsx`** — Page component (285 lines). State `celebrationPrayer: { title: string; note?: string } | null`. Calls `playSoundEffect('harp')` in `handleMarkAnswered` (line 131). Passes `prayerTitle` + `testimonyNote` + `onDismiss` to celebration component (lines 276-282).
- **`frontend/src/components/my-prayers/__tests__/PrayerAnsweredCelebration.test.tsx`** — 7 tests: heading, title, testimony, no-testimony, dismiss button text, dismiss callback, dialog role/aria, confetti motion-reduce class.
- **`frontend/src/lib/verse-card-canvas.ts`** — Canvas rendering for verse share cards. Pattern: `wrapText()` for word wrapping, `fitVerseText()` for dynamic font sizing, `drawLines()` for multi-line rendering, `generateVerseImageTemplated()` as async public API returning `Promise<Blob>`. Waits for fonts via `document.fonts.load()`. 4 templates × 3 sizes (square 1080×1080, story 1080×1920, wide 1200×630).
- **`frontend/src/lib/challenge-share-canvas.ts`** — Simpler canvas pattern (111 lines). Single 1080×1080 size. `generateChallengeShareImage(options): Promise<Blob>`. Uses `document.fonts.ready`, gradient background, Caveat title, Inter body text, "Worship Room" watermark in Caveat 28px at white 40%.
- **`frontend/src/components/sharing/SharePanel.tsx`** — Full share UI (479 lines). **Tightly coupled to verse sharing** — imports `generateVerseImageTemplated`, uses template picker (4 templates), size picker (3 sizes), live preview, download, Web Share API / clipboard copy. Props: `{ verseText, reference, isOpen, onClose }`. This component is NOT reusable for testimony cards without significant modification.
- **`frontend/src/hooks/useSoundEffects.ts`** — `playSoundEffect('harp')` already called in MyPrayers.tsx line 131 on `handleMarkAnswered`. The harp plays when the form is submitted, before the celebration mounts.
- **`frontend/src/hooks/useReducedMotion.ts`** — Returns boolean for `prefers-reduced-motion: reduce`.
- **`frontend/src/constants/z-index.ts`** — `Z.OVERLAY = 60`.
- **`frontend/src/constants/dashboard/badge-icons.ts`** — `CONFETTI_COLORS` array: `['#D97706', '#C2703E', '#8B7FA8', '#2DD4BF', '#34D399', '#FFFFFF', '#F59E0B']`.

### Directory Conventions

- Components: `frontend/src/components/my-prayers/` (celebration, card, composer, etc.)
- Lib utilities: `frontend/src/lib/` (canvas rendering, utils)
- Constants: `frontend/src/constants/` (organized by feature)
- Tests: `__tests__/` directories alongside components
- Types: `frontend/src/types/`

### Component/Service Patterns

- Celebration overlays use `createPortal(jsx, document.body)` with `useFocusTrap`, scroll lock, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- Canvas share images: async function returning `Promise<Blob>`, uses `document.fonts.load()` or `document.fonts.ready`, creates offscreen `<canvas>`, draws with 2D context, returns via `canvas.toBlob()`.
- Sound effects: `useSoundEffects()` hook → `playSoundEffect(id)`. Respects `wr_sound_effects_enabled` and `prefers-reduced-motion`.

### Test Patterns

- Vitest + React Testing Library + `userEvent.setup()`.
- Mocks: `vi.hoisted()` + `vi.mock()` for hooks like `useAuth`.
- Provider wrapping: `ToastProvider` for components using `useToast()`. `MemoryRouter` for routed pages.
- Portal components: query `document.body` directly (not `screen`) for portal-rendered elements.
- Animation tests: query by class name (`.animate-confetti-fall`), check `motion-reduce:hidden`.
- No `AuthModalProvider` needed — My Prayers is a protected route that redirects when not authenticated.

### Data Flow for Celebration

1. `MyPrayers.tsx` line 121-133: `handleMarkAnswered(id, note)` → `markAnswered(id, note)` → `refreshPrayers()` → `setCelebrationPrayer({ title, note })` → `playSoundEffect('harp')`.
2. Line 276-282: `celebrationPrayer && <PrayerAnsweredCelebration prayerTitle={...} testimonyNote={...} onDismiss={...} />`.
3. The harp sound fires in `handleMarkAnswered` (line 131), which is BEFORE the celebration overlay mounts. The spec wants it at 300ms into the overlay animation. The trigger needs to move from `handleMarkAnswered` to inside the celebration component.

---

## Auth Gating Checklist

**This feature is entirely within the My Prayers page (`/my-prayers`), which is a protected route. All actions are inaccessible to logged-out users.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View My Prayers page | Protected route | N/A (existing) | `useAuth` + `<Navigate>` redirect |
| Mark prayer as answered | Protected route | N/A (existing) | Same redirect |
| See celebration overlay | Protected route | N/A (existing) | Same redirect |
| Share testimony card | Protected route | Step 4 | Same redirect (no additional gate needed) |

No new auth gates required — existing route-level protection covers all actions.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Overlay backdrop | background | `radial-gradient(ellipse at center, rgba(217, 119, 6, 0.15) 0%, rgba(13, 6, 32, 0.95) 60%)` | spec (new golden treatment) [UNVERIFIED] |
| Overlay backdrop | backdrop-filter | `blur(24px)` (`backdrop-blur-xl`) | design-system.md |
| Heading "God Answered Your Prayer" | font | Inter bold, `text-2xl` mobile / `text-3xl` desktop | spec + design-system.md (Inter = `font-sans`) |
| Heading | color | `#FFFFFF` (`text-white`) | design-system.md |
| Prayer topic text | font | Lora italic, `text-lg` | spec + design-system.md (Lora = `font-serif`) |
| Prayer topic text | color | `rgba(255,255,255,0.8)` (`text-white/80`) | spec |
| Scripture text | font | Lora italic, `text-base` | spec |
| Scripture text | color | `rgba(255,255,255,0.6)` (`text-white/60`) | spec + design-system.md (meets WCAG AA for large text) |
| Scripture reference | font | Inter, `text-sm` | spec |
| Scripture reference | color | `rgba(255,255,255,0.5)` (`text-white/50`) | spec |
| Gold particle colors | values | `#D97706`, `#F59E0B`, `#FBBF24` | spec [UNVERIFIED] |
| Share button | style | `bg-primary text-white font-medium py-3 px-6 rounded-xl min-h-[44px]` | SharePanel.tsx line 459 |
| Close button | style | `border border-white/30 px-8 py-3 rounded-lg text-white hover:bg-white/10` | existing PrayerAnsweredCelebration.tsx line 100 |
| Canvas card background | gradient | dark-to-golden gradient (hero-dark → amber accent) | spec [UNVERIFIED] |
| Canvas watermark | font | Caveat 28px, `rgba(255,255,255,0.4)` | challenge-share-canvas.ts line 101 |
| Z-index | value | `Z.OVERLAY` = 60 | z-index.ts |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Caveat (`font-script`) is for script/decorative headings ONLY — the spec explicitly says Inter bold for "God Answered Your Prayer" (a declaration, not a greeting)
- Lora (`font-serif`) is for scripture text and prayer topic (italic) — consistent with all scripture display across the app
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Text opacity WCAG AA minimums on hero-dark: body text ≥ `text-white/60`, headings ≥ `text-white/60`, interactive ≥ `text-white/50`
- All celebration overlays use `createPortal(jsx, document.body)` with `useFocusTrap`, scroll lock, dialog role
- Existing confetti uses `animate-confetti-fall` with `--confetti-duration` CSS variable — the golden variant needs a DIFFERENT animation name to avoid collision
- Sound effects gated behind BOTH `wr_sound_effects_enabled` AND `prefers-reduced-motion` (via `useSoundEffects` hook)
- All canvas share images use `document.fonts.load()` (not `.ready`) for specific fonts, return `Promise<Blob>` via `canvas.toBlob()`
- Canvas watermark: "Worship Room" in Caveat, positioned near bottom center, white at 20-40% opacity
- Minimum touch targets: 44px on all breakpoints
- Named exports for all components (not default exports)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_list` | Read | Existing. Prayer data read by MyPrayers.tsx. No changes. |
| `wr_sound_effects_enabled` | Read | Existing. Checked by `useSoundEffects` hook. No changes. |

No new localStorage keys introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Overlay fills viewport. Content `px-6`. Heading `text-2xl`. Buttons stack vertically, full-width, `min-h-[44px]`. |
| Tablet | 768px | Overlay fills viewport. Content centered, `max-w-[500px]`. Heading `text-3xl`. Buttons side-by-side. |
| Desktop | 1440px | Same as tablet — content centered, `max-w-[500px]`. Heading `text-3xl`. Buttons side-by-side. |

---

## Vertical Rhythm

Not applicable — this is a full-screen overlay, not a page section. No inter-section spacing to verify.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/prayer-answered-celebration` exists and is checked out
- [x] All auth-gated actions from the spec are accounted for (all behind existing route protection)
- [x] Design system values verified from recon (golden palette is new — marked [UNVERIFIED])
- [x] All [UNVERIFIED] values flagged with verification methods
- [ ] The `harp` sound currently plays in `handleMarkAnswered` (line 131 of MyPrayers.tsx) — it needs to MOVE into the celebration component to align with the 300ms animation timing. This is a behavior change in Step 2.
- [ ] `SharePanel.tsx` is tightly coupled to verse sharing — a simpler, dedicated share flow will be built for testimony cards (not reusing SharePanel directly). The spec says "Use the same `SharePanel` component" but the interface mismatch (`verseText`/`reference` vs testimony data) makes a lightweight dedicated share approach cleaner.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reuse SharePanel vs. dedicated share flow | Build lightweight `TestimonyShareActions` inline in celebration | SharePanel is tightly coupled to verse templates/sizes with 4-template picker + 3-size picker + live preview. Testimony cards have 1 fixed design. A simple Download + Share/Copy inline button pair (following SharePanel's action pattern) is more appropriate. |
| Move harp sound trigger | Move from `handleMarkAnswered` to celebration component `useEffect` with 300ms delay | Spec requires sound at 300ms into overlay animation. Currently fires before overlay mounts. |
| Golden confetti animation | New `animate-golden-sparkle` keyframe, NOT modifying `animate-confetti-fall` | Existing confetti-fall is used by 4+ components. Golden variant needs slower speed (3-4s) and different colors. |
| Canvas sizes | Square (1080×1080) only for MVP, Story/Wide as stretch | Spec says square required, story/wide are "bonus". Single size keeps the share flow simple (no size picker). |
| Scripture randomization | `Math.floor(Math.random() * 6)` on component mount, stored in `useState` | Spec says use `Math.random()` on mount. Simple and deterministic per celebration instance. |
| Testimony card without testimony text | Omit testimony section, show topic + scripture only | Spec explicitly states: "If no testimony text was entered, omit this section." |
| Overlay dismiss timing | Close button + backdrop click, NO auto-dismiss | Spec: "do NOT auto-dismiss this overlay." Close button appears after 2s (0ms if reduced motion). |

---

## Implementation Steps

### Step 1: Create faithfulness scriptures constant + golden sparkle animation

**Objective:** Add the 6 faithfulness scriptures as a constant and create the golden sparkle CSS animation in Tailwind config.

**Files to create/modify:**
- `frontend/src/constants/faithfulness-scriptures.ts` — new file, 6 WEB scripture verses
- `frontend/tailwind.config.js` — add `golden-sparkle` keyframe + animation

**Details:**

Create `frontend/src/constants/faithfulness-scriptures.ts`:
```typescript
export interface FaithfulnessScripture {
  text: string
  reference: string
}

export const FAITHFULNESS_SCRIPTURES: FaithfulnessScripture[] = [
  { text: 'The Lord has heard my cry for mercy; the Lord accepts my prayer.', reference: 'Psalm 6:9' },
  { text: 'You will call on me and come and pray to me, and I will listen to you.', reference: 'Jeremiah 29:12' },
  { text: 'Before they call, I will answer; and while they are yet speaking, I will hear.', reference: 'Isaiah 65:24' },
  { text: 'The righteous cry out, and the Lord hears, and delivers them out of all their troubles.', reference: 'Psalm 34:17' },
  { text: 'Cast your burden on the Lord, and he will sustain you.', reference: 'Psalm 55:22' },
  { text: 'Every good gift and every perfect gift is from above, coming down from the Father of lights.', reference: 'James 1:17' },
]
```

Add to `tailwind.config.js` keyframes:
```javascript
'golden-sparkle': {
  '0%': { transform: 'translateY(-10px) scale(0)', opacity: '0' },
  '20%': { opacity: '1', transform: 'translateY(10vh) scale(1)' },
  '80%': { opacity: '0.8' },
  '100%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0' },
},
```

Add to `tailwind.config.js` animation:
```javascript
'golden-sparkle': 'golden-sparkle var(--sparkle-duration, 3.5s) ease-in-out forwards',
```

Golden sparkle particles: slower (3-4s via CSS variable), drift downward gently (not fast confetti cannon). Colors: `#D97706`, `#F59E0B`, `#FBBF24`. Fewer particles (10 mobile, 20 desktop). Smaller (3-6px), all circles (no squares — sparkles, not confetti).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify existing `confetti-fall` animation — it's used by 4+ celebration components
- DO NOT use non-WEB translations — all 6 scriptures must be WEB
- DO NOT add more than 6 scriptures — spec is explicit about the count

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Faithfulness scriptures has 6 entries | unit | Verify `FAITHFULNESS_SCRIPTURES.length === 6` |
| Each scripture has text and reference | unit | Verify all entries have non-empty `text` and `reference` fields |
| References match expected format | unit | Verify references match pattern like "Psalm 6:9", "Jeremiah 29:12" |

**Expected state after completion:**
- [x] `frontend/src/constants/faithfulness-scriptures.ts` exists with 6 WEB scriptures
- [x] `tailwind.config.js` has `golden-sparkle` keyframe and animation
- [x] Existing `confetti-fall` animation unchanged
- [x] 3 constant tests pass

---

### Step 2: Redesign PrayerAnsweredCelebration overlay with golden treatment + animation sequence

**Objective:** Replace the generic purple confetti celebration with the unique golden radial gradient, sparkle particles, scripture, and sequenced animation. Move harp sound trigger into this component.

**Files to create/modify:**
- `frontend/src/components/my-prayers/PrayerAnsweredCelebration.tsx` — full rewrite
- `frontend/src/pages/MyPrayers.tsx` — remove `playSoundEffect('harp')` from `handleMarkAnswered`

**Details:**

Rewrite `PrayerAnsweredCelebration.tsx` with:

**Props interface (extended):**
```typescript
interface PrayerAnsweredCelebrationProps {
  prayerTitle: string
  testimonyNote?: string
  onDismiss: () => void
  onShareRequest: (scripture: FaithfulnessScripture) => void
}
```

**Background:** Replace `bg-black/70 backdrop-blur-md` with golden radial gradient:
```
background: radial-gradient(ellipse at center, rgba(217, 119, 6, 0.15) 0%, rgba(13, 6, 32, 0.95) 60%)
```
Keep `backdrop-blur-xl`.

**Golden sparkle particles:** Replace `generateConfetti` with `generateGoldenSparkles`. Use `animate-golden-sparkle` (from Step 1). Colors: cycle through `['#D97706', '#F59E0B', '#FBBF24']`. Count: 10 mobile, 20 desktop. Size: 3-6px circles. Duration: 3-4s via `--sparkle-duration`. Start at 300ms delay (via `animationDelay`).

**Scripture:** On mount, select random scripture from `FAITHFULNESS_SCRIPTURES` via `useState(() => FAITHFULNESS_SCRIPTURES[Math.floor(Math.random() * FAITHFULNESS_SCRIPTURES.length)])`.

**Animation sequence (using `useReducedMotion`):**

If `reducedMotion` is true: show everything immediately, no delays, no animations.

If `reducedMotion` is false, use CSS `opacity` + `transform` transitions with staggered delays via inline styles:
- 0ms: Backdrop fades in (300ms) — use `animate-fade-in` or opacity transition on mount
- 300ms: Sparkle particles begin (handled by `animationDelay` on particles)
- 500ms: "God Answered Your Prayer" heading fades in + translateY(10px→0)
- 900ms: Prayer topic text fades in
- 1400ms: Scripture fades in (400ms — slower)
- 2000ms: "Share Your Testimony" + "Close" buttons fade in

Implementation approach: Use a `step` state that increments via `setTimeout` chain in a `useEffect`:
```typescript
const [step, setStep] = useState(reducedMotion ? 6 : 0)
useEffect(() => {
  if (reducedMotion) return
  const timers = [
    setTimeout(() => setStep(1), 0),     // backdrop
    setTimeout(() => setStep(2), 300),    // sparkles
    setTimeout(() => setStep(3), 500),    // heading
    setTimeout(() => setStep(4), 900),    // prayer topic
    setTimeout(() => setStep(5), 1400),   // scripture
    setTimeout(() => setStep(6), 2000),   // buttons
  ]
  return () => timers.forEach(clearTimeout)
}, [reducedMotion])
```

Each element uses `opacity` and `transform` with CSS transitions:
```typescript
style={{
  opacity: step >= 3 ? 1 : 0,
  transform: step >= 3 ? 'translateY(0)' : 'translateY(10px)',
  transition: 'opacity 300ms ease-out, transform 300ms ease-out',
}}
```

**Harp sound:** Import `useSoundEffects` and play at step 2 (300ms):
```typescript
useEffect(() => {
  if (step === 2) playSoundEffect('harp')
}, [step, playSoundEffect])
```

**Remove harp from MyPrayers.tsx:** Delete `playSoundEffect('harp')` call from `handleMarkAnswered` (line 131). Keep the `useSoundEffects` import since it may be used elsewhere — check; if not used elsewhere, remove it.

**Layout:**
```
<div portal to body>
  <div fixed inset-0 z-[60] golden-radial-gradient backdrop-blur-xl>
    {sparkle particles}
    <div flex min-h-screen flex-col items-center justify-center px-6 sm:px-8>
      <Sparkles icon (lucide) text-amber-400 w-8 h-8 mb-4 />
      <h2> God Answered Your Prayer </h2>
      <p> "{prayerTitle}" </p>
      <p> "{scripture.text}" </p>
      <p> -- {scripture.reference} </p>
      <div buttons>
        <button> Share Your Testimony </button>
        <button> Close </button>
      </div>
    </div>
  </div>
</div>
```

**Typography:**
- "God Answered Your Prayer": `text-white text-2xl sm:text-3xl font-bold font-sans` (Inter)
- Prayer topic: `text-white/80 text-lg font-serif italic` (Lora) — wrapped in quotes
- Scripture text: `text-white/60 text-base font-serif italic mt-6` (Lora)
- Scripture reference: `text-white/50 text-sm mt-1 font-sans` (Inter)

**Buttons:**
- "Share Your Testimony": `bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 px-6 rounded-xl min-h-[44px]` — amber to match golden theme
- "Close": `border border-white/30 px-8 py-3 rounded-lg text-white hover:bg-white/10 min-h-[44px]`
- Mobile: buttons stack vertically (`flex-col w-full`), each full-width
- Desktop: buttons side-by-side (`flex-row gap-3`), auto-width

**Share button click:** Calls `onShareRequest(selectedScripture)` — the parent (MyPrayers) will handle opening the share flow.

**Close button + backdrop click:** Both call `onDismiss`.

**`aria-live="polite"`** region wrapping the content area so screen readers announce the celebration text.

**Auth gating:** N/A (existing route-level protection)

**Responsive behavior:**
- Desktop (1440px): Content centered in `max-w-[500px]`, heading `text-3xl`, buttons side-by-side
- Tablet (768px): Same as desktop
- Mobile (375px): Content `px-6`, heading `text-2xl`, buttons stack vertically full-width

**Guardrails (DO NOT):**
- DO NOT use Caveat (`font-script`) for the heading — spec explicitly says Inter bold
- DO NOT auto-dismiss the overlay — spec says user closes manually
- DO NOT show buttons before 2 seconds (or immediately if reduced motion)
- DO NOT import `CONFETTI_COLORS` — use dedicated golden colors
- DO NOT remove the `useSoundEffects` import from MyPrayers.tsx if it's still used by other handlers — check first

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "God Answered Your Prayer" heading | unit | `screen.getByText('God Answered Your Prayer')` |
| Renders prayer title in quotes | unit | Verify prayer title text appears |
| Renders testimony note when provided | unit | Verify testimony text appears |
| Does not render testimony when absent | unit | Verify no testimony element |
| Displays a scripture from faithfulness set | unit | Verify at least one of the 6 scripture texts appears in the document |
| Displays scripture reference | unit | Verify a reference like "Psalm 6:9" appears |
| Has dialog role and aria-modal | unit | Check `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Sparkle particles have motion-reduce:hidden | unit | Query `.animate-golden-sparkle` spans, check `motion-reduce:hidden` |
| Close button calls onDismiss | unit | Click Close, verify `onDismiss` called |
| Backdrop click calls onDismiss | unit | Click backdrop area, verify `onDismiss` called |
| Share button calls onShareRequest | unit | Click "Share Your Testimony", verify `onShareRequest` called with a scripture object |
| Golden sparkle particles use amber colors | unit | Check sparkle span `backgroundColor` is one of the 3 gold colors |
| Has aria-live polite region | unit | Verify `aria-live="polite"` attribute on content wrapper |

**Expected state after completion:**
- [x] Golden radial gradient background (not purple/black)
- [x] Golden sparkle particles (not purple confetti)
- [x] "God Answered Your Prayer" heading in Inter bold
- [x] Prayer topic in Lora italic with quotes
- [x] Random scripture from 6-verse set
- [x] Sequenced animation (or all-at-once for reduced motion)
- [x] Harp sound plays at 300ms (from within celebration, not from MyPrayers)
- [x] "Share Your Testimony" + "Close" buttons appear at 2s
- [x] All 13 tests pass
- [x] MyPrayers.tsx no longer calls `playSoundEffect('harp')` directly

---

### Step 3: Create testimony card canvas renderer

**Objective:** Create `testimony-card-canvas.ts` following the existing canvas patterns to generate a shareable testimony card image.

**Files to create/modify:**
- `frontend/src/lib/testimony-card-canvas.ts` — new file

**Details:**

Follow `challenge-share-canvas.ts` pattern (simpler than verse-card-canvas since there's only 1 design).

```typescript
export interface TestimonyCardOptions {
  prayerTitle: string
  testimonyNote?: string
  scriptureText: string
  scriptureReference: string
}

export async function generateTestimonyCardImage(
  options: TestimonyCardOptions,
): Promise<Blob>
```

**Canvas: 1080×1080 (square only for MVP).**

**Background:** Dark gradient with golden accent:
```typescript
// Base gradient (hero-dark tones)
const gradient = ctx.createLinearGradient(0, 0, 1080, 1080)
gradient.addColorStop(0, '#1a0a2e')  // dark purple-black
gradient.addColorStop(1, '#0D0620')  // hero-dark
ctx.fillStyle = gradient
ctx.fillRect(0, 0, 1080, 1080)

// Golden radial glow (subtle)
const radial = ctx.createRadialGradient(540, 400, 0, 540, 400, 500)
radial.addColorStop(0, 'rgba(217, 119, 6, 0.12)')
radial.addColorStop(1, 'transparent')
ctx.fillStyle = radial
ctx.fillRect(0, 0, 1080, 1080)
```

**Content layout (top to bottom, centered):**

1. **"God Answered" heading** — Caveat 64px bold, white, centered, ~y=300
2. **Decorative line** — 200px wide, 1px, `rgba(217,119,6,0.4)`, centered, ~y=350
3. **Prayer title in quotes** — Lora italic, dynamic size (24-36px based on length), white 90%, centered, word-wrapped, ~y=400+
4. **Testimony note** (if present) — Inter 22px, white 70%, centered, word-wrapped, below title
5. **Scripture text** — Lora italic 20px, white 60%, centered, word-wrapped, near bottom third
6. **Scripture reference** — Inter 16px, white 50%, centered, below scripture
7. **"Worship Room" watermark** — Caveat 28px, white 40%, bottom center, ~y=1020

Use `wrapText` from `verse-card-canvas.ts` — import it (it's already exported).

Font loading:
```typescript
await Promise.all([
  document.fonts.load('italic 36px Lora'),
  document.fonts.load('bold 64px Caveat'),
  document.fonts.load('22px Inter'),
])
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (canvas is fixed 1080×1080)

**Guardrails (DO NOT):**
- DO NOT add template selection — testimony cards have 1 fixed design
- DO NOT add size selection beyond square for MVP
- DO NOT use `dangerouslySetInnerHTML` or render user text as HTML
- DO NOT include user name on the card (spec: "omit from the card")

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| generateTestimonyCardImage returns a Blob | unit | Call with valid options, verify result is a Blob with type `image/png` |
| Includes prayer title text on canvas | unit | Mock canvas context, verify `fillText` called with prayer title |
| Includes scripture text on canvas | unit | Mock canvas context, verify `fillText` called with scripture text |
| Includes scripture reference on canvas | unit | Mock canvas context, verify `fillText` called with reference |
| Includes "Worship Room" watermark | unit | Mock canvas context, verify `fillText` called with "Worship Room" |
| Handles missing testimony note | unit | Call without `testimonyNote`, verify no error and Blob returned |
| Canvas dimensions are 1080×1080 | unit | Mock `createElement('canvas')`, verify width/height set to 1080 |

**Expected state after completion:**
- [x] `frontend/src/lib/testimony-card-canvas.ts` exists
- [x] Exports `generateTestimonyCardImage(options): Promise<Blob>`
- [x] Imports `wrapText` from `verse-card-canvas.ts`
- [x] 7 canvas tests pass

---

### Step 4: Add testimony share flow to MyPrayers page

**Objective:** Wire the "Share Your Testimony" button to generate a testimony card and present download/share/copy actions. Handle the share state in MyPrayers.tsx.

**Files to create/modify:**
- `frontend/src/components/my-prayers/TestimonyShareActions.tsx` — new component (lightweight share UI)
- `frontend/src/pages/MyPrayers.tsx` — add share state + TestimonyShareActions rendering

**Details:**

**`TestimonyShareActions.tsx`** — A simple bottom-sheet/modal with:
- Preview of the generated testimony card (as an `<img>` from object URL)
- Three action buttons: Download, Share (Web Share API) / Copy Image (clipboard fallback)
- Close button

Props:
```typescript
interface TestimonyShareActionsProps {
  isOpen: boolean
  onClose: () => void
  prayerTitle: string
  testimonyNote?: string
  scriptureText: string
  scriptureReference: string
}
```

On open: generate the testimony card via `generateTestimonyCardImage()`, store as object URL for preview. Clean up URL on unmount.

**Download handler:** Same pattern as `SharePanel.tsx` lines 240-258:
```typescript
const blob = await generateTestimonyCardImage(options)
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `worship-room-testimony-${Date.now()}.png`
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
showToast('Image downloaded!')
```

**Share handler:** Same pattern as `SharePanel.tsx` lines 260-282:
```typescript
const blob = await generateTestimonyCardImage(options)
if (canUseWebShare()) {
  const file = new File([blob], 'worship-room-testimony.png', { type: 'image/png' })
  await navigator.share({ files: [file] })
} else {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  showToast('Image copied!')
}
```

**Styling:** Follow SharePanel's modal structure:
- Fixed inset-0 z-50, backdrop `bg-black/50 backdrop-blur-sm`
- Panel: `bg-surface-dark border border-white/10 shadow-2xl rounded-t-2xl sm:rounded-xl sm:max-w-[420px]`
- Mobile: bottom sheet. Desktop: centered modal.
- Focus trap via `useFocusTrap`
- `role="dialog"`, `aria-modal="true"`, body scroll lock

**MyPrayers.tsx changes:**

Add state:
```typescript
const [shareData, setShareData] = useState<{
  prayerTitle: string
  testimonyNote?: string
  scriptureText: string
  scriptureReference: string
} | null>(null)
```

Update `PrayerAnsweredCelebration` props to pass `onShareRequest`:
```typescript
<PrayerAnsweredCelebration
  prayerTitle={celebrationPrayer.title}
  testimonyNote={celebrationPrayer.note}
  onDismiss={() => setCelebrationPrayer(null)}
  onShareRequest={(scripture) => {
    setShareData({
      prayerTitle: celebrationPrayer.title,
      testimonyNote: celebrationPrayer.note,
      scriptureText: scripture.text,
      scriptureReference: scripture.reference,
    })
  }}
/>
```

Render `TestimonyShareActions` below celebration:
```typescript
{shareData && (
  <TestimonyShareActions
    isOpen={!!shareData}
    onClose={() => setShareData(null)}
    {...shareData}
  />
)}
```

**Auth gating:** N/A (protected route)

**Responsive behavior:**
- Desktop (1440px): Centered modal, max-width 420px, preview image scaled to fit
- Tablet (768px): Same as desktop
- Mobile (375px): Bottom sheet, full-width, preview image 100% width, buttons full-width stacked

**Guardrails (DO NOT):**
- DO NOT reuse `SharePanel` directly — it's coupled to verse templates/sizes
- DO NOT add template or size pickers — testimony cards have 1 fixed design
- DO NOT persist share preferences to localStorage — not needed
- DO NOT force sharing — user can close without sharing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| TestimonyShareActions renders when open | unit | Verify dialog is in DOM when `isOpen={true}` |
| TestimonyShareActions not rendered when closed | unit | Verify no dialog when `isOpen={false}` |
| Shows Download button | unit | Verify "Download" button present |
| Shows Share or Copy button | unit | Verify "Share" (if Web Share) or "Copy Image" button |
| Close button calls onClose | unit | Click close, verify callback |
| Preview image renders | unit | Verify `<img>` element with `alt` text |
| Dialog has correct aria attributes | unit | `role="dialog"`, `aria-modal="true"` |
| MyPrayers passes onShareRequest to celebration | integration | Verify celebration receives the prop |

**Expected state after completion:**
- [x] `TestimonyShareActions.tsx` exists with download/share/copy functionality
- [x] MyPrayers.tsx manages share state
- [x] Clicking "Share Your Testimony" in celebration opens share actions with correct data
- [x] Share flow generates canvas image and offers download/share/copy
- [x] 8 tests pass

---

### Step 5: Update existing tests + build verification

**Objective:** Update the existing `PrayerAnsweredCelebration.test.tsx` to match the new design, verify no regressions, run full build + test suite.

**Files to create/modify:**
- `frontend/src/components/my-prayers/__tests__/PrayerAnsweredCelebration.test.tsx` — rewrite to match new design
- No other test files should need changes (MyPrayers tests don't test celebration internals)

**Details:**

The existing test file has 7 tests that need updating:

1. **"Prayer Answered!" → "God Answered Your Prayer"** — Update heading assertion
2. **Prayer title** — Still passes (unchanged behavior)
3. **Testimony note** — Still passes (unchanged behavior)
4. **No testimony** — Still passes (unchanged behavior)
5. **"Praise God!" → "Close"** — Update button text assertion
6. **Dismiss callback** — Update to click "Close" button instead of "Praise God!"
7. **Dialog role** — Still passes (unchanged attributes)
8. **Confetti → sparkle class** — Update `.animate-confetti-fall` → `.animate-golden-sparkle`

Add new tests for:
- Scripture appears (from faithfulness set)
- "Share Your Testimony" button present
- `onShareRequest` callback fires on share button click
- `aria-live="polite"` region exists
- Golden sparkle colors (amber, not purple)

**Mock `useSoundEffects`** since the component now calls `playSoundEffect('harp')` internally:
```typescript
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))
```

**Mock `useReducedMotion`** to return `true` for most tests (so all elements render immediately without waiting for animation timers):
```typescript
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))
```

**Build verification:** Run `pnpm build` and `pnpm test` to verify:
- 0 build errors
- All existing tests pass
- All new tests pass
- No TypeScript errors

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete tests that still apply — update them
- DO NOT skip mocking `useSoundEffects` — the component now imports it
- DO NOT test animation timing in unit tests — test that elements eventually render (use reduced motion mock)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes with 0 errors | integration | `pnpm build` exits cleanly |
| All celebration tests pass | integration | Updated test suite: ~12-13 tests pass |
| MyPrayers tests still pass | regression | Existing MyPrayers.test.tsx passes without modification (or with minimal updates for removed `playSoundEffect` call) |
| Full test suite | regression | `pnpm test` — no new failures introduced |

**Expected state after completion:**
- [x] All celebration tests updated and passing
- [x] No regressions in MyPrayers tests
- [x] Build: 0 errors
- [x] Full test suite: no new failures

---

## [UNVERIFIED] Values

| Value | Best Guess | Verification | Correction |
|-------|-----------|-------------|------------|
| Golden radial gradient | `radial-gradient(ellipse at center, rgba(217,119,6,0.15) 0%, rgba(13,6,32,0.95) 60%)` | Run `/verify-with-playwright /my-prayers` — visually confirm warm amber glow fading to dark | Adjust amber opacity (0.10-0.20 range) and gradient stop position (50%-70%) |
| Gold particle colors | `#D97706`, `#F59E0B`, `#FBBF24` | Visual comparison in browser — should feel like candlelight, not neon | Adjust saturation/brightness if too harsh |
| Canvas card golden glow | `rgba(217,119,6,0.12)` radial | Generate test image, verify warm accent is subtle not dominant | Reduce opacity to 0.06-0.08 if too strong |
| Golden sparkle animation timing | 3.5s duration, gentle drift | Check in browser — should feel like slow floating candlelight | Adjust to 3-4s range, tweak translateY distance |
| Share button amber color | `bg-amber-600 hover:bg-amber-500` | Verify against golden overlay — should feel cohesive | Could use `bg-primary` if amber clashes |

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create constants + golden sparkle animation |
| 2 | 1 | Redesign celebration overlay (uses constants + animation) |
| 3 | — | Create testimony card canvas renderer (independent of overlay) |
| 4 | 2, 3 | Wire share flow (needs overlay + canvas) |
| 5 | 2, 3, 4 | Update tests + build verification |

**Parallelizable:** Steps 1 and 3 can be done in parallel. Step 2 depends only on Step 1. Step 4 depends on Steps 2 and 3.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Constants + golden sparkle animation | [COMPLETE] | 2026-03-31 | Created `faithfulness-scriptures.ts` (6 WEB scriptures), added `golden-sparkle` keyframe + animation to tailwind.config.js. 3 tests pass. |
| 2 | Redesign celebration overlay | [COMPLETE] | 2026-03-31 | Full rewrite of PrayerAnsweredCelebration.tsx with golden treatment, animation sequence, scripture, sparkle particles. Moved harp sound from MyPrayers into celebration component. Removed `useSoundEffects` from MyPrayers.tsx. Added `onShareRequest` prop + `shareData` state to MyPrayers. |
| 3 | Testimony card canvas renderer | [COMPLETE] | 2026-03-31 | Created `testimony-card-canvas.ts` (1080×1080 square). Imports `wrapText` from verse-card-canvas. 7 tests pass. |
| 4 | Testimony share flow | [COMPLETE] | 2026-03-31 | Created `TestimonyShareActions.tsx` with download/share/copy. Updated MyPrayers.tsx to render it with `shareData` state. 7 tests pass. |
| 5 | Update tests + build verification | [COMPLETE] | 2026-03-31 | Rewrote celebration tests (13 pass). Updated MyPrayers.test.tsx with mocks for useReducedMotion + useSoundEffects, changed "Praise God!" to "Close" (26 pass). TestimonyShareActions tests (7 pass). Canvas tests (7 pass). Constants tests (3 pass). Build: 0 errors. Full suite: 4993 pass, 8 pre-existing failures in unrelated files. |
