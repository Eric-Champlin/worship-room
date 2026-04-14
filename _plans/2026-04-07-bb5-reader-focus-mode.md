# Implementation Plan: BB-5 Reader Focus Mode

**Spec:** `_specs/bb5-reader-focus-mode.md`
**Date:** 2026-04-07
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec within Bible Redesign wave

---

## Architecture Context

### Project Structure

Bible reader files:
- **Page:** `frontend/src/pages/BibleReader.tsx` (358 lines) — mounts ReaderChrome, TypographySheet, main content, ReaderChapterNav, VerseJumpPill, BibleDrawer. Root div uses `data-reader-theme={settings.theme}` and `style={{ background: 'var(--reader-bg)' }}`.
- **Components:** `frontend/src/components/bible/reader/` — `ReaderChrome.tsx` (94 lines, fixed top chrome with ICON_BTN class), `ReaderChapterNav.tsx` (nav footer, no opacity control), `TypographySheet.tsx` (264 lines, settings panel with Theme/Size/LineHeight/Font sections + Reset), `ReaderBody.tsx` (verse rendering), `ChapterHeading.tsx` (book name + chapter number), `VerseJumpPill.tsx` (fixed bottom-right, z-30)
- **Hooks:** `frontend/src/hooks/useChromeDim.ts` (43 lines, BB-4 placeholder — 4s idle timer, dims to 0.3, mousemove/touchstart/scroll only, no jitter filtering), `useReaderSettings.ts` (settings + localStorage persistence), `useReducedMotion.ts` (boolean for prefers-reduced-motion), `useChapterSwipe.ts` (mobile swipe navigation)
- **Provider:** `BibleDrawerProvider.tsx` — `useBibleDrawer()` exposes `{ isOpen, open, close, toggle, triggerRef }`

### Existing Patterns to Follow

- **ICON_BTN class:** `'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white'` — used for all chrome icon buttons (Back, Aa, Books). Focus toggle will use this exact class.
- **TypographySheet panel style:** `{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }` — dark frosted glass. Section headings: `text-xs font-medium uppercase tracking-wider text-white/40`. SegmentedControl sub-component available for reuse.
- **TypographySheet layout:** Mobile bottom sheet / desktop floating panel at `lg:top-16 lg:right-20 lg:w-[320px]`. Sections in `<div className="space-y-6 p-5">`. "Reset to defaults" link at bottom: `text-sm text-white/50 underline`.
- **useReducedMotion:** Returns boolean. When true, all transitions use 0ms duration. Already used by useChromeDim — BB-5 hook will use the same pattern.
- **useBibleDrawer().isOpen:** Boolean state. BB-5 watches this to pause focus mode.
- **Reader theme CSS variables:** `--reader-bg` (background), `--reader-text`, `--reader-verse-num`, `--reader-divider`. Set via `[data-reader-theme="midnight|parchment|sepia"]` in `index.css`. Midnight: `#08051A`, Parchment: `#F5F0E8`, Sepia: `#E8D5B7`.
- **VerseJumpPill:** Fixed `z-30` bottom-right with `pointer-events-none` outer / `pointer-events-auto` inner pattern, same as DailyAmbientPillFAB. Unaffected by focus mode.
- **ReaderChrome z-index:** `z-30` fixed top. Opacity currently controlled by `useChromeDim().opacity` via inline style `{ opacity, transition: 'opacity 500ms ease' }`.
- **Test patterns:** Vitest + RTL + jsdom. Wrap in `MemoryRouter` for routing. Mock localStorage. `@testing-library/user-event` for interactions. `vi.useFakeTimers()` for timeout tests.

### Key Integration Points

- **BibleReaderInner** in `BibleReader.tsx` currently calls `useChromeDim` nowhere — it passes nothing to ReaderChrome (which calls it internally at line 26). BB-5 lifts focus mode to BibleReaderInner so it can coordinate across chrome, chapter nav, vignette, and drawer.
- **TypographySheet** receives `settings` and `onUpdate` for reader settings. BB-5 adds focus settings as separate props (focus settings are distinct from reader typography settings).
- **BibleDrawer** `isOpen` is available via `useBibleDrawer()` context. BB-5 watches this to auto-pause.

---

## Auth Gating Checklist

**The Bible reader is fully public. No auth gates.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Auto focus mode | Public | Step 1 | N/A |
| Manual focus toggle | Public | Step 4 | N/A |
| Focus mode settings | Public, localStorage | Step 3 | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Chrome background | backdrop | `bg-hero-bg/80 backdrop-blur-md` | ReaderChrome.tsx:45 |
| ICON_BTN | class | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | ReaderChrome.tsx:7-8 |
| TypographySheet panel | background | `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)` | TypographySheet.tsx:40-44 |
| Section heading (sheet) | class | `text-xs font-medium uppercase tracking-wider text-white/40` | TypographySheet.tsx:142, 178, 190, 202 |
| SegmentedControl | container | `flex rounded-full border border-white/10 bg-white/[0.06] p-1` | TypographySheet.tsx:245 |
| SegmentedControl selected | class | `bg-white/[0.15] text-white` | TypographySheet.tsx:253 |
| SegmentedControl unselected | class | `text-white/50 hover:text-white/70` | TypographySheet.tsx:254 |
| Reader bg (Midnight) | hex | `#08051A` | index.css |
| Reader bg (Parchment) | hex | `#F5F0E8` | index.css |
| Reader bg (Sepia) | hex | `#E8D5B7` | index.css |
| Primary purple | hex | `#6D28D9` (`bg-primary`) | design-system.md |
| Primary light | hex | `#8B5CF6` (`bg-primary-lt`) | design-system.md |
| Vignette gradient | value | `linear-gradient(to bottom/top, rgba(0,0,0,0.12), transparent)` | [UNVERIFIED] |
| Vignette height | desktop | `120px` | [UNVERIFIED] |
| Vignette height | mobile | `80px` | [UNVERIFIED] |
| Armed dot | color | `bg-primary-lt` (`#8B5CF6`) | spec Design Notes |
| Armed dot | size | `6px` (w-1.5 h-1.5) | [UNVERIFIED] |

**[UNVERIFIED] values:**
- Vignette gradient opacity (0.12): the spec says 10-15% darker. A black overlay at 12% creates subtle framing without obscuring text. → To verify: run `/verify-with-playwright` and evaluate visual impact. → If wrong: adjust opacity up/down within 0.08-0.18 range.
- Vignette height (120px desktop / 80px mobile): proportional to viewport. → To verify: visual inspection on 1440px and 375px. → If wrong: adjust to 100-150px desktop / 60-100px mobile.
- Armed dot size (6px): small enough to be subtle, large enough to be visible. → To verify: visual inspection next to 20px icon. → If wrong: try 4px or 8px.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Bible reader uses CSS custom properties (`var(--reader-bg)`, `var(--reader-text)`, etc.) for theming. All new visual elements must use these tokens, not raw hex values. Zero raw hex values in new code.
- ReaderChrome is a `fixed left-0 right-0 top-0 z-30` element. Its opacity is currently controlled via inline `style={{ opacity, transition: 'opacity 500ms ease' }}`. BB-5 replaces this with variable transition duration (600ms out, 200ms in) and adds pointer-events control.
- The ICON_BTN class provides 44px minimum touch targets. The focus toggle icon must use this exact class.
- TypographySheet uses a SegmentedControl sub-component for multi-option selections. Reuse it for the timing buttons (3s/6s/12s).
- VerseJumpPill is at `z-30` fixed bottom-right and must remain unaffected by focus mode. It does NOT receive opacity from focus mode.
- The TypographySheet opens at `z-50`. Focus mode vignettes should be below this (z-20 or lower) so they don't cover the settings panel.
- `useReducedMotion()` returns a boolean. When true, set all transition durations to 0ms. The reduced-motion check applies to chrome fade and vignette fade, but focus/active state changes still happen (just instant).
- Drawer-aware pattern: `useBibleDrawer().isOpen` should trigger focus mode pause. This is the same conceptual pattern as `DailyAmbientPillFAB` hiding when AudioDrawer opens.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_focus_enabled` | Both | Focus mode enabled/disabled ('true'/'false', default 'true') |
| `wr_bible_focus_delay` | Both | Idle timeout in ms ('3000'/'6000'/'12000', default '6000') |
| `wr_bible_focus_dim_orbs` | Both | Dim orbs in focused state ('true'/'false', default 'true') |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Focus toggle in same icon row. Vignette: 80px height. Touch start primary restore trigger. TypographySheet focus section in bottom sheet. |
| Tablet | 768px | Same as mobile. Swipe navigation still works alongside focus mode. |
| Desktop | 1440px | Focus toggle in icon row. Vignette: 120px height. Mouse jitter filtering relevant. TypographySheet focus section in floating panel. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Chrome icon row | Aa button, Focus toggle, Books button | Same y ±2px at all breakpoints | Never wraps — `flex gap-1` with 3 icons at 44px each = 140px total, container is ~180px |

---

## Vertical Rhythm

N/A — BB-5 adds overlay elements (vignette, opacity changes) without changing the reader's vertical spacing. No sections are added or moved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-4 is complete and committed (provides ReaderChrome, ReaderChapterNav, TypographySheet, useChromeDim, reader theme system)
- [x] All auth-gated actions from the spec are accounted for (none — fully public)
- [x] Design system values are verified (from ReaderChrome.tsx, TypographySheet.tsx, index.css, design-system.md)
- [x] All [UNVERIFIED] values are flagged with verification methods (vignette opacity, height, armed dot size)
- [x] No deprecated patterns used
- [ ] `useChromeDim.ts` exists and is only imported by `ReaderChrome.tsx` (verify before deleting)
- [ ] Lucide `Minimize2` icon available (or pick alternative: `EyeOff`, `Focus`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vignette gradient color | `rgba(0,0,0,0.12)` on all themes | Black overlay works universally; avoids per-theme gradient calculations. 12% is within the spec's 10-15% range. |
| Focus toggle icon | `Minimize2` from lucide-react | Conveys "minimize distractions" / "enter immersive mode". Compact design fits the icon row. |
| Chrome transition duration | Dynamic — 600ms fade-out, 200ms fade-in | Spec requires different durations for entering vs exiting focus. Applied via inline `transition` style that changes based on direction. |
| pointer-events timing | Managed via `setTimeout` in the hook | Fade-out: set `pointer-events: none` after 600ms delay (after fade completes). Fade-in: set `pointer-events: auto` immediately before opacity change. |
| Focus mode state lifted to BibleReaderInner | Yes — hook called in BibleReaderInner, not ReaderChrome | Needed because focus mode drives chrome, chapter nav, AND vignette. ReaderChrome no longer calls useChromeDim internally. |
| TypographySheet focus section position | Below "Reset to defaults" link | Spec says "at the bottom of the existing TypographySheet". The Reset link is the current bottom element. |
| Vignette z-index | `z-20` | Below chrome (z-30), below TypographySheet (z-50), above reader content. Decorative only with `pointer-events: none`. |
| Reduced motion behavior | All transitions instant (0ms) but state changes still occur | Spec: "preserves the focused/active state changes and vignette appearance." Vignette still shows, chrome still hides — just instantly. |
| Mousemove debounce | 100ms via `setTimeout` | Spec says ~100ms. Using `setTimeout` (not `requestAnimationFrame`) for predictable timing. |
| Cumulative delta tracking | `useRef` accumulating px moved since last timer reset | Reset delta accumulator when the idle timer resets. Only fire activity if delta > 5px. |
| Manual trigger armed state | `useRef<boolean>` cleared on next activity | Not persisted — transient visual indicator only. |
| TypographySheet open pauses focus | Yes — isTypographyOpen passed to hook | The sheet overlays the reader; focus mode dimming chrome while the sheet is open would be confusing. |

---

## Implementation Steps

### Step 1: useFocusMode Hook

**Objective:** Create the core focus mode hook that replaces useChromeDim with a full state machine, activity detection with jitter filtering, pause/resume ref-counting, manual trigger, and settings persistence.

**Files to create/modify:**
- `frontend/src/hooks/useFocusMode.ts` — NEW: focus mode hook (~200 lines)

**Details:**

**Exported interface:**

```typescript
interface FocusModeSettings {
  enabled: boolean
  delay: number       // 3000 | 6000 | 12000
  dimOrbs: boolean
}

interface FocusModeReturn {
  // Visual state
  chromeOpacity: 0 | 1
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number  // 600 (fading out) or 200 (fading in)
  vignetteVisible: boolean
  dimmed: boolean             // forward-compatible orb dimming
  isManuallyArmed: boolean

  // Actions
  triggerFocused: () => void
  pauseFocusMode: () => void
  resumeFocusMode: () => void

  // Settings
  settings: FocusModeSettings
  updateFocusSetting: <K extends keyof FocusModeSettings>(key: K, value: FocusModeSettings[K]) => void
}
```

**State machine implementation:**

Three states via `useRef<'idle' | 'active' | 'focused'>` (ref, not useState, to avoid re-render on every state change — visual updates are driven by the derived opacity/pointerEvents state values):

- `idle` → `active`: when `enabled && pauseCount === 0`. Start idle timer.
- `active` → `focused`: idle timer fires (delay elapsed with no interaction). Set `chromeOpacity=0`, start 600ms timeout for `chromePointerEvents='none'`, set `vignetteVisible=true`.
- `focused` → `active`: qualifying interaction detected. Immediately set `chromePointerEvents='auto'`, set `chromeTransitionMs=200`, set `chromeOpacity=1`, set `vignetteVisible=false`. Reset idle timer.
- `active|focused` → `idle`: pause called, or enabled set to false. Immediately restore chrome (opacity=1, pointerEvents=auto), hide vignette. Clear all timers.
- `idle` → `active`: resume called (when pauseCount returns to 0). Reset idle timer from 0.

**Activity detection:**

Register event listeners in a single `useEffect`:
- `mousemove`: debounced via `setTimeout` at 100ms. Track cumulative delta via `useRef<{x: number, y: number}>`. On each mousemove, add `|e.movementX| + |e.movementY|` to accumulator. Only trigger activity if cumulative > 5px. Reset accumulator when activity fires.
- `touchstart`: direct trigger (no debounce)
- `scroll`: direct trigger, `{ passive: true }`
- `keydown`: direct trigger
- `wheel`: direct trigger, `{ passive: true }`
- `focus` on window: direct trigger (tab becoming active)

All listeners call the same `handleActivity()` function that:
1. If phase is `idle`, no-op
2. If phase is `focused`, transition to `active` (restore chrome)
3. If phase is `active`, reset idle timer
4. Clear manual-armed state

**Pause/resume ref-counting:**

```typescript
const pauseCountRef = useRef(0)

function pauseFocusMode() {
  pauseCountRef.current += 1
  if (pauseCountRef.current === 1) {
    // First pause — transition to idle, restore chrome
    transitionToIdle()
  }
}

function resumeFocusMode() {
  pauseCountRef.current = Math.max(0, pauseCountRef.current - 1)
  if (pauseCountRef.current === 0) {
    // All consumers resumed — transition to active, start timer
    transitionToActive()
  }
}
```

**Manual trigger:**

```typescript
function triggerFocused() {
  if (!settings.enabled) return
  manuallyArmedRef.current = true
  transitionToFocused()  // Skip the idle timer
}
```

**Settings persistence:**

Read from localStorage on mount with defaults:
- `wr_bible_focus_enabled`: default `'true'` → `true`
- `wr_bible_focus_delay`: default `'6000'` → `6000`
- `wr_bible_focus_dim_orbs`: default `'true'` → `true`

`updateFocusSetting` writes to localStorage and updates state. Changing `enabled` to false immediately transitions to idle. Changing `delay` takes effect on the next idle period (no need to restart the current timer — the spec says "takes effect immediately on the next idle period").

**Reduced motion:**

If `useReducedMotion()` returns true, set `chromeTransitionMs = 0` always. State changes still happen (focused/active), vignette still appears — just instant.

**Cleanup:**

Clear all timeouts, remove all event listeners on unmount.

**Auth gating (if applicable):**
- N/A — fully public

**Responsive behavior:**
- N/A: no UI impact — hook logic only

**Guardrails (DO NOT):**
- DO NOT use `useState` for the phase — use `useRef` to avoid unnecessary re-renders on every mousemove/scroll. Only `useState` for the visual outputs (`chromeOpacity`, `chromePointerEvents`, `vignetteVisible`, etc.) that actually drive UI.
- DO NOT use `requestAnimationFrame` for the mousemove debounce — use `setTimeout(100)` for predictable timing
- DO NOT register event listeners on the reader container — register on `window` so events from overlapping elements (VerseJumpPill) are captured
- DO NOT re-render on every mouse move — the debounce and jitter filter prevent this
- DO NOT couple to TypographySheet — the paused prop is passed from BibleReaderInner

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| returns opacity 1 and pointerEvents auto initially | unit | Default active state |
| transitions to focused after configured delay | unit | `vi.useFakeTimers()`, advance 6000ms, verify opacity=0 |
| resets timer on qualifying interactions | unit | Advance 5999ms, fire scroll, advance 6000ms more — should NOT be focused |
| respects custom delay setting | unit | Set delay=3000, advance 3000ms → focused |
| ignores mousemove with delta < 5px | unit | Fire mousemove with small movementX/Y, verify no timer reset |
| triggers activity on mousemove with delta > 5px | unit | Fire mousemoves accumulating > 5px, verify timer resets |
| debounces mousemove to ~100ms | unit | Fire 10 rapid mousemoves, verify activity handler fires once |
| manual trigger enters focused immediately | unit | Call triggerFocused(), verify opacity=0 without timer |
| manual trigger sets isManuallyArmed | unit | Call triggerFocused(), verify isManuallyArmed=true |
| armed state clears on next activity | unit | Trigger focus, fire scroll → armed should be false |
| pause increments ref count | unit | Call pause twice, resume once — still paused |
| resume at count 0 restores active | unit | Call pause, resume → transitions to active |
| enabled=false prevents focus | unit | Set enabled=false, advance delay → opacity stays 1 |
| changing enabled=false restores chrome | unit | Enter focused, set enabled=false → opacity=1 |
| pointer-events: none set AFTER fade-out (600ms) | unit | Enter focused, verify pointerEvents='auto' at 0ms, then 'none' after 600ms |
| pointer-events: auto set BEFORE fade-in | unit | Restore from focused, verify pointerEvents='auto' immediately |
| respects reduced motion (instant transitions) | unit | Mock useReducedMotion=true, verify transitionMs=0 |
| settings persist to localStorage | unit | Update delay, verify localStorage written |

**Expected state after completion:**
- [ ] `useFocusMode` hook exists at `frontend/src/hooks/useFocusMode.ts`
- [ ] Hook returns all interface fields
- [ ] State machine transitions are correct
- [ ] Activity detection with jitter filtering works
- [ ] Pause/resume is ref-counted
- [ ] Settings persist to localStorage
- [ ] Reduced motion respected

---

### Step 2: FocusVignette Component

**Objective:** Create the decorative vignette overlay that frames the reader content during focused state.

**Files to create/modify:**
- `frontend/src/components/bible/reader/FocusVignette.tsx` — NEW (~45 lines)

**Details:**

```typescript
interface FocusVignetteProps {
  visible: boolean
  reducedMotion: boolean
}
```

Renders two fixed-position gradient overlays — one at the top of the viewport, one at the bottom. Both have `pointer-events: none` always (decorative only).

**Structure:**

```tsx
export function FocusVignette({ visible, reducedMotion }: FocusVignetteProps) {
  const transitionMs = reducedMotion ? 0 : 600

  return (
    <>
      {/* Top vignette */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-20"
        style={{
          height: 'clamp(80px, 10vh, 120px)',
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.12), transparent)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease`,
        }}
        aria-hidden="true"
      />
      {/* Bottom vignette */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20"
        style={{
          height: 'clamp(80px, 10vh, 120px)',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.12), transparent)',
          opacity: visible ? 1 : 0,
          transition: `opacity ${transitionMs}ms ease`,
        }}
        aria-hidden="true"
      />
    </>
  )
}
```

**Key decisions:**
- `z-20`: below chrome (z-30) and TypographySheet (z-50), above reader content
- `clamp(80px, 10vh, 120px)`: responsive height — 80px min (mobile), scales with viewport, 120px max (desktop)
- `rgba(0, 0, 0, 0.12)`: theme-agnostic darkening [UNVERIFIED]
- `fixed inset-x-0`: full viewport width
- `pointer-events: none` always — never intercepts taps
- `aria-hidden="true"` — decorative element
- Transition duration matches chrome fade-out (600ms). Uses 0ms when reduced motion is on.

**Auth gating:**
- N/A

**Responsive behavior:**
- Desktop (1440px): vignette up to 120px tall
- Tablet (768px): vignette scales with 10vh
- Mobile (375px): vignette minimum 80px tall

**Guardrails (DO NOT):**
- DO NOT use any raw hex color values — `rgba(0,0,0,0.12)` is a functional notation, not a design token violation (there is no `--reader-shadow` token; this is a new decorative element)
- DO NOT use `will-change` — these are simple opacity transitions that don't need GPU hints
- DO NOT add the vignette to any page other than the Bible reader
- DO NOT give the vignette a background color or backdrop-filter — gradient only

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders two gradient divs | unit | Mount with visible=true, verify 2 children with aria-hidden |
| applies opacity 0 when not visible | unit | Mount with visible=false, verify inline opacity is 0 |
| applies opacity 1 when visible | unit | Mount with visible=true, verify inline opacity is 1 |
| has pointer-events none always | unit | Both states: verify className includes pointer-events-none |
| uses 0ms transition when reducedMotion | unit | Mount with reducedMotion=true, verify transition includes '0ms' |

**Expected state after completion:**
- [ ] FocusVignette component exists at the specified path
- [ ] Renders top and bottom gradient overlays
- [ ] Responds to visible prop with opacity transition
- [ ] Always has pointer-events: none and aria-hidden

---

### Step 3: Focus Mode Settings in TypographySheet

**Objective:** Add a "Focus mode" section at the bottom of the TypographySheet with enabled toggle, timing buttons, dim-orbs toggle, and explanatory caption.

**Files to modify:**
- `frontend/src/components/bible/reader/TypographySheet.tsx`

**Details:**

**New props added to TypographySheetProps:**

```typescript
interface TypographySheetProps {
  // ... existing props ...
  focusSettings: FocusModeSettings
  onFocusSettingUpdate: <K extends keyof FocusModeSettings>(key: K, value: FocusModeSettings[K]) => void
}
```

Import `FocusModeSettings` type from the hook file.

**New section rendered BELOW the existing "Reset to defaults" link (still inside the `<div className="space-y-6 p-5">` wrapper):**

```tsx
{/* Divider */}
<div className="border-t border-white/10" />

{/* Focus Mode Section */}
<section>
  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
    Focus mode
  </h3>

  {/* Enabled toggle */}
  <div className="flex items-center justify-between">
    <span className="text-sm text-white/70">Enabled</span>
    <ToggleSwitch
      checked={focusSettings.enabled}
      onChange={(v) => onFocusSettingUpdate('enabled', v)}
      label="Focus mode enabled"
    />
  </div>

  {/* Timing — only visible when enabled */}
  {focusSettings.enabled && (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-medium text-white/40">Timing</h4>
      <SegmentedControl
        options={FOCUS_DELAYS}
        value={String(focusSettings.delay)}
        onChange={(v) => onFocusSettingUpdate('delay', Number(v))}
      />
    </div>
  )}

  {/* Dim orbs toggle — only visible when enabled */}
  {focusSettings.enabled && (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-white/70">Dim orbs in focus</span>
      <ToggleSwitch
        checked={focusSettings.dimOrbs}
        onChange={(v) => onFocusSettingUpdate('dimOrbs', v)}
        label="Dim orbs in focus mode"
      />
    </div>
  )}

  {/* Caption */}
  <p className="mt-3 text-xs leading-relaxed text-white/40">
    The chrome fades when you're still. Move or tap to bring it back.
  </p>
</section>
```

**FOCUS_DELAYS constant (add at top of file):**

```typescript
const FOCUS_DELAYS: Array<{ value: string; label: string }> = [
  { value: '3000', label: '3s' },
  { value: '6000', label: '6s' },
  { value: '12000', label: '12s' },
]
```

**ToggleSwitch sub-component (add at bottom of file, after SegmentedControl):**

A minimal accessible toggle switch:

```typescript
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-primary' : 'bg-white/20',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
```

**Auth gating:**
- N/A

**Responsive behavior:**
- Desktop (1440px): Focus section renders inside the 320px floating panel
- Tablet (768px): Focus section renders inside the bottom sheet
- Mobile (375px): Same as tablet — inside the bottom sheet (scrollable if content exceeds max-h)

**Guardrails (DO NOT):**
- DO NOT move the existing "Reset to defaults" link — focus section goes BELOW it
- DO NOT affect focus mode settings when the "Reset to defaults" button is clicked — focus settings are independent from typography settings (theme/size/lineHeight/font)
- DO NOT use raw hex values — use `bg-primary` for the toggle, `text-white/*` for text
- DO NOT add a separate close/save button — settings take effect immediately like the existing typography controls

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders Focus mode section when sheet is open | unit | Mount with isOpen=true, verify "Focus mode" heading present |
| toggle calls onFocusSettingUpdate with enabled | unit | Click the enabled toggle, verify callback fires |
| timing buttons hidden when disabled | unit | Set enabled=false, verify timing buttons not in DOM |
| timing buttons visible when enabled | unit | Set enabled=true, verify 3s/6s/12s buttons present |
| timing button calls onFocusSettingUpdate with delay | unit | Click 3s button, verify callback fires with (delay, 3000) |
| dim orbs toggle hidden when disabled | unit | Set enabled=false, verify dim orbs toggle not in DOM |
| caption text is correct | unit | Verify "The chrome fades when you're still..." text |
| ToggleSwitch has role=switch and aria-checked | unit | Verify accessible attributes |

**Expected state after completion:**
- [ ] TypographySheet renders focus mode section below Reset link
- [ ] Toggle controls enabled state
- [ ] Timing buttons use SegmentedControl (3s/6s/12s)
- [ ] Dim orbs toggle present
- [ ] Caption text matches spec
- [ ] Timing and dim-orbs controls hidden when disabled

---

### Step 4: Update ReaderChrome — Focus Toggle + Focus-Driven Opacity

**Objective:** Replace useChromeDim usage with focus mode props from BibleReaderInner, add the focus toggle icon between Aa and Books, and implement proper pointer-events sequencing.

**Files to modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx`

**Details:**

**Remove:**
- Remove `import { useChromeDim } from '@/hooks/useChromeDim'`
- Remove `const { opacity } = useChromeDim()`

**New props:**

```typescript
interface ReaderChromeProps {
  bookName: string
  chapter: number
  onTypographyToggle: () => void
  isTypographyOpen: boolean
  aaRef: React.RefObject<HTMLButtonElement | null>
  // BB-5 focus mode
  chromeOpacity: number
  chromePointerEvents: 'auto' | 'none'
  chromeTransitionMs: number
  isManuallyArmed: boolean
  onFocusToggle: () => void
}
```

**Add focus toggle icon between Aa and Books in the icon row:**

```tsx
{/* Right: Aa + Focus + Books icons */}
<div className="flex items-center gap-1">
  <button
    ref={aaRef as React.RefObject<HTMLButtonElement>}
    type="button"
    className={ICON_BTN}
    aria-label="Typography settings"
    aria-expanded={isTypographyOpen}
    onClick={onTypographyToggle}
  >
    <Type className="h-5 w-5" />
  </button>
  <button
    type="button"
    className={cn(ICON_BTN, 'relative')}
    aria-label="Toggle focus mode"
    onClick={onFocusToggle}
  >
    <Minimize2 className="h-5 w-5" />
    {isManuallyArmed && (
      <span
        className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-lt"
        aria-hidden="true"
      />
    )}
  </button>
  <button
    ref={booksRef}
    type="button"
    className={ICON_BTN}
    aria-label="Browse books"
    onClick={() => handleOpenDrawer(booksRef.current)}
  >
    <BookOpen className="h-5 w-5" />
  </button>
</div>
```

**Update the outer div's inline style:**

```tsx
<div
  className="fixed left-0 right-0 top-0 z-30"
  style={{
    paddingTop: 'env(safe-area-inset-top)',
    opacity: chromeOpacity,
    pointerEvents: chromePointerEvents,
    transition: `opacity ${chromeTransitionMs}ms ease`,
  }}
>
```

**Add import:**
```typescript
import { Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
```

**Auth gating:**
- N/A

**Responsive behavior:**
- Desktop (1440px): 3 icons in row (Aa + Focus + Books), each 44px min, within ~180px container
- Tablet (768px): Same layout
- Mobile (375px): Same layout — gap-1 (4px) keeps icons tight

**Inline position expectations:**
- Aa, Focus, and Books buttons share the same y-coordinate (±2px) at all breakpoints

**Guardrails (DO NOT):**
- DO NOT keep the useChromeDim import — it is fully replaced
- DO NOT add a tooltip to the focus toggle — keep it minimal like the other chrome icons
- DO NOT add any z-index to the armed dot — it's positioned within the button which is already in the chrome z-30 layer
- DO NOT change the existing Aa or Books button behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders focus toggle between Aa and Books | unit | Verify button order: Type icon, Minimize2 icon, BookOpen icon |
| focus toggle calls onFocusToggle | unit | Click focus button, verify callback fires |
| shows armed dot when isManuallyArmed is true | unit | Set prop=true, verify dot element exists with bg-primary-lt |
| hides armed dot when isManuallyArmed is false | unit | Set prop=false, verify dot element absent |
| applies chromeOpacity and pointerEvents from props | unit | Pass opacity=0, pointerEvents='none', verify inline styles |
| applies transition duration from chromeTransitionMs | unit | Pass 600, verify transition style contains '600ms' |

**Expected state after completion:**
- [ ] ReaderChrome no longer imports useChromeDim
- [ ] Focus toggle icon renders between Aa and Books
- [ ] Armed dot visible when manually triggered
- [ ] Chrome opacity, pointer-events, and transition driven by props

---

### Step 5: Update ReaderChapterNav + BibleReader Page

**Objective:** Add focus-driven opacity/pointer-events to ReaderChapterNav, wire useFocusMode through BibleReaderInner, mount FocusVignette, connect drawer pause, and pass focus props to all consumers.

**Files to modify:**
- `frontend/src/components/bible/reader/ReaderChapterNav.tsx`
- `frontend/src/pages/BibleReader.tsx`

**Details:**

**ReaderChapterNav changes:**

Add new props:

```typescript
interface ReaderChapterNavProps {
  bookSlug: string
  currentChapter: number
  // BB-5 focus mode
  chromeOpacity?: number
  chromePointerEvents?: 'auto' | 'none'
  chromeTransitionMs?: number
}
```

Wrap the `<nav>` in a container div that applies opacity/pointer-events (optional props default to `1` / `'auto'` / `200` for backward compatibility):

```tsx
<div
  style={{
    opacity: chromeOpacity ?? 1,
    pointerEvents: (chromePointerEvents ?? 'auto') as React.CSSProperties['pointerEvents'],
    transition: `opacity ${chromeTransitionMs ?? 200}ms ease`,
  }}
>
  <nav aria-label="Chapter navigation" className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
    {/* existing nav content */}
  </nav>
</div>
```

**BibleReader.tsx (BibleReaderInner function) changes:**

1. **Add imports:**
```typescript
import { useFocusMode } from '@/hooks/useFocusMode'
import { FocusVignette } from '@/components/bible/reader/FocusVignette'
import { useReducedMotion } from '@/hooks/useReducedMotion'
```

2. **Call useFocusMode in BibleReaderInner:**
```typescript
const reducedMotion = useReducedMotion()
const focusMode = useFocusMode()
```

3. **Pause focus when drawer or typography sheet is open:**
```typescript
// Pause focus mode when drawer is open
useEffect(() => {
  if (bibleDrawer.isOpen) {
    focusMode.pauseFocusMode()
    return () => focusMode.resumeFocusMode()
  }
}, [bibleDrawer.isOpen])

// Pause focus mode when typography sheet is open
useEffect(() => {
  if (typographyOpen) {
    focusMode.pauseFocusMode()
    return () => focusMode.resumeFocusMode()
  }
}, [typographyOpen])
```

4. **Pass focus props to ReaderChrome:**
```tsx
<ReaderChrome
  bookName={book.name}
  chapter={chapterNumber}
  onTypographyToggle={() => setTypographyOpen((p) => !p)}
  isTypographyOpen={typographyOpen}
  aaRef={aaRef}
  chromeOpacity={focusMode.chromeOpacity}
  chromePointerEvents={focusMode.chromePointerEvents}
  chromeTransitionMs={focusMode.chromeTransitionMs}
  isManuallyArmed={focusMode.isManuallyArmed}
  onFocusToggle={focusMode.triggerFocused}
/>
```

5. **Pass focus settings to TypographySheet:**
```tsx
<TypographySheet
  isOpen={typographyOpen}
  onClose={() => setTypographyOpen(false)}
  settings={settings}
  onUpdate={updateSetting}
  onReset={resetToDefaults}
  anchorRef={aaRef}
  focusSettings={focusMode.settings}
  onFocusSettingUpdate={focusMode.updateFocusSetting}
/>
```

6. **Pass focus props to ReaderChapterNav:**
```tsx
<ReaderChapterNav
  bookSlug={bookSlug!}
  currentChapter={chapterNumber}
  chromeOpacity={focusMode.chromeOpacity}
  chromePointerEvents={focusMode.chromePointerEvents}
  chromeTransitionMs={focusMode.chromeTransitionMs}
/>
```

7. **Mount FocusVignette (inside the root div, after BibleDrawer):**
```tsx
<FocusVignette
  visible={focusMode.vignetteVisible}
  reducedMotion={reducedMotion}
/>
```

**Auth gating:**
- N/A

**Responsive behavior:**
- N/A: no new responsive patterns — focus mode works identically at all breakpoints

**Guardrails (DO NOT):**
- DO NOT pass focus mode opacity to VerseJumpPill — it remains visible and interactive always
- DO NOT modify the error state renders (invalid book, invalid chapter, load error) — focus mode only runs on the happy path
- DO NOT add focus mode to the loading spinner state — focus starts only after content is loaded
- DO NOT change any swipe gesture behavior — swipe navigation coexists with focus mode (a swipe is a qualifying interaction that restores chrome)
- DO NOT add `focusMode` to the keyboard shortcut handler's dependencies — keyboard events are already captured by the hook's global listener

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ReaderChapterNav applies opacity from props | unit | Pass chromeOpacity=0, verify container opacity |
| ReaderChapterNav defaults to opacity 1 | unit | Omit prop, verify opacity is 1 |
| BibleReaderInner mounts FocusVignette | integration | Render BibleReader, verify FocusVignette in DOM |
| drawer open pauses focus mode | integration | Open drawer, verify chrome stays visible |
| typography sheet open pauses focus mode | integration | Open typography, verify chrome stays visible |
| focus toggle in chrome triggers focused state | integration | Click focus toggle, verify chrome fades |

**Expected state after completion:**
- [ ] ReaderChapterNav fades with focus mode
- [ ] BibleReaderInner wires useFocusMode to all consumers
- [ ] FocusVignette mounted in reader page
- [ ] Drawer and typography sheet pause focus mode
- [ ] Focus toggle triggers focused state

---

### Step 6: Delete useChromeDim + Update localStorage Key Docs

**Objective:** Remove the replaced placeholder hook and document the new localStorage keys.

**Files to modify/delete:**
- `frontend/src/hooks/useChromeDim.ts` — DELETE
- `frontend/src/hooks/__tests__/useChromeDim.test.ts` — DELETE (if exists)

**Details:**

1. Verify `useChromeDim` is no longer imported anywhere:
   - `grep -r "useChromeDim" frontend/src/` should return zero results after Step 4
2. Delete `frontend/src/hooks/useChromeDim.ts`
3. Delete its test file if it exists
4. The new localStorage keys (`wr_bible_focus_enabled`, `wr_bible_focus_delay`, `wr_bible_focus_dim_orbs`) are already documented in the spec's Auth & Persistence section and will be added to `11-local-storage-keys.md` as part of this step.

**Update `11-local-storage-keys.md`** — add under the "Bible Reader" section:

```markdown
| `wr_bible_focus_enabled` | `'true' \| 'false'` | Focus mode enabled (default: true) |
| `wr_bible_focus_delay` | `'3000' \| '6000' \| '12000'` | Focus mode idle delay in ms (default: 6000) |
| `wr_bible_focus_dim_orbs` | `'true' \| 'false'` | Dim orbs during focus (default: true, forward-compatible) |
```

**Responsive behavior:**
- N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT delete useChromeDim before verifying Step 4 removed all imports
- DO NOT modify any other hooks

**Test specifications:**

No new tests — this is cleanup only.

**Expected state after completion:**
- [ ] `useChromeDim.ts` deleted
- [ ] No remaining imports of useChromeDim in the codebase
- [ ] localStorage keys documented in `11-local-storage-keys.md`

---

### Step 7: Tests

**Objective:** Write comprehensive tests for useFocusMode hook, FocusVignette component, and integration tests for the full focus mode flow.

**Files to create:**
- `frontend/src/hooks/__tests__/useFocusMode.test.ts` — hook unit tests
- `frontend/src/components/bible/reader/__tests__/FocusVignette.test.tsx` — component tests
- `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx` — update existing or create

**Details:**

**useFocusMode.test.ts (~18 tests):**

Test setup: use `renderHook` from `@testing-library/react`, `vi.useFakeTimers()` for timer control, mock `useReducedMotion`, mock `localStorage`.

Tests (from Step 1 test specifications):
1. Default state: opacity=1, pointerEvents='auto', vignetteVisible=false
2. Transitions to focused after 6000ms (default delay)
3. Resets timer on scroll event
4. Resets timer on keydown event
5. Resets timer on touchstart event
6. Resets timer on wheel event
7. Respects custom delay (3000ms)
8. Ignores mousemove with cumulative delta < 5px
9. Triggers activity on mousemove with cumulative delta > 5px
10. Manual trigger enters focused immediately
11. Manual trigger sets isManuallyArmed=true
12. Armed state clears on next activity
13. Pause increments ref count, keeps idle
14. Resume at count=0 restores active state
15. Enabled=false prevents focus mode
16. Disabling restores chrome from focused state
17. Pointer-events='none' set after 600ms (fade-out completion)
18. Pointer-events='auto' set immediately on restore
19. Reduced motion: transitionMs=0
20. Settings persist to localStorage

**FocusVignette.test.tsx (~5 tests):**
From Step 2 test specifications.

**TypographySheet focus section tests (~8 tests):**
From Step 3 test specifications. These may be additions to existing TypographySheet tests.

**Auth gating:**
- N/A

**Responsive behavior:**
- N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test implementation details (internal refs, timer IDs) — test the public interface
- DO NOT mock the entire hook in integration tests — let it run with fake timers
- DO NOT skip reduced-motion tests — accessibility compliance is mandatory

**Expected state after completion:**
- [ ] All tests pass: `pnpm test`
- [ ] Build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] ~33 new tests covering focus mode

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | useFocusMode hook (core logic) |
| 2 | — | FocusVignette component (decorative overlay) |
| 3 | — | TypographySheet focus settings section (UI) |
| 4 | 1 | Update ReaderChrome (uses focus mode props) |
| 5 | 1, 2, 3, 4 | Wire everything in BibleReader + ReaderChapterNav |
| 6 | 4, 5 | Delete useChromeDim + doc cleanup |
| 7 | 1, 2, 3, 4, 5, 6 | Comprehensive tests |

Steps 1, 2, and 3 are independent and can be built in parallel.
Steps 4 depends on 1 (needs the hook's return type).
Step 5 depends on 1-4 (wires everything together).
Step 6 depends on 4+5 (all useChromeDim references removed).
Step 7 depends on all previous steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | useFocusMode Hook | [COMPLETE] | 2026-04-07 | Created `frontend/src/hooks/useFocusMode.ts` (~230 lines). State machine (idle/active/focused), activity detection with mousemove jitter filtering (5px cumulative delta, 100ms debounce), pause/resume ref-counting, manual trigger, localStorage persistence for 3 settings keys. |
| 2 | FocusVignette Component | [COMPLETE] | 2026-04-07 | Created `frontend/src/components/bible/reader/FocusVignette.tsx` (~35 lines). Top+bottom fixed gradient overlays with z-20, clamp(80px,10vh,120px) height, pointer-events:none, aria-hidden. |
| 3 | Focus Settings in TypographySheet | [COMPLETE] | 2026-04-07 | Modified `TypographySheet.tsx`: added focusSettings/onFocusSettingUpdate props, Focus mode section below Reset link with ToggleSwitch (enabled), SegmentedControl (3s/6s/12s timing), dim-orbs toggle, caption. Added ToggleSwitch sub-component with role=switch. |
| 4 | Update ReaderChrome | [COMPLETE] | 2026-04-07 | Modified `ReaderChrome.tsx`: removed useChromeDim import, added 5 focus mode props, added Minimize2 icon between Aa and Books with armed dot indicator. |
| 5 | Wire BibleReader + ReaderChapterNav | [COMPLETE] | 2026-04-07 | Modified `BibleReader.tsx`: added useFocusMode/useReducedMotion hooks, pause/resume effects for drawer+typography, passed focus props to ReaderChrome/TypographySheet/ReaderChapterNav, mounted FocusVignette. Modified `ReaderChapterNav.tsx`: added optional focus props with wrapper div. |
| 6 | Delete useChromeDim + Doc Cleanup | [COMPLETE] | 2026-04-07 | Deleted `frontend/src/hooks/useChromeDim.ts`. Added 3 new localStorage keys to `11-local-storage-keys.md`. |
| 7 | Tests | [COMPLETE] | 2026-04-07 | 52 tests passing across 4 files: useFocusMode (21 tests), FocusVignette (5 tests), ReaderChrome (12 tests, 6 new), TypographySheet (14 tests, 8 new). Updated existing test helpers for new required props. Pre-existing failures in BibleReaderAudio/Highlights/Notes (20 tests) confirmed unrelated. |
