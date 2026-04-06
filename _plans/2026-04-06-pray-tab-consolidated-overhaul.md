# Implementation Plan: Pray Tab — Consolidated Overhaul

**Spec:** `_specs/pray-tab-consolidated-overhaul.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/pray-tab-consolidated-overhaul`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a CSS/className-only overhaul of two existing components plus their test files. No new components, no new state, no new hooks, no routing changes, no data model changes.

**Files to modify:**

1. **`frontend/src/components/daily/PrayerInput.tsx`** (183 lines) — contains the heading, textarea, chips, and "Help Me Pray" button
2. **`frontend/src/components/daily/GuidedPrayerSection.tsx`** (96 lines) — contains heading, subtitle, and session cards
3. **`frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx`** (184 lines) — tests for subtitle, card classes
4. **`frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`** (~500 lines) — integration tests; verify no breakage

**Component hierarchy:**
- `PrayTabContent.tsx` renders `PrayerInput` (lines 191-200) then `GuidedPrayerSection` (line 220) inside a `GlowBackground` wrapper
- `PrayerInput` is self-contained: heading + chips + textarea + button
- `GuidedPrayerSection` is self-contained: heading + subtitle + card grid

**Current PrayerInput.tsx structure (key lines):**
- Line 7: `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'` — used ONLY for the heading (line 109). Removing heading means removing this import.
- Lines 35-38: `autoExpand` callback — auto-grows textarea height. Must be removed since spec switches to manual `resize-y`.
- Lines 106-113: Heading `<h2>` with `GRADIENT_TEXT_STYLE` — to be removed entirely (heading + wrapper div).
- Line 151: `rows={3}` — change to `rows={8}`.
- Line 152: `resize-none` — change to `resize-y min-h-[200px] max-h-[500px]`.
- Lines 146, 148: `autoExpand(e.target)` calls in `onChange`/`onInput` — remove both.
- Lines 172-179: Button uses purple `bg-primary` — restyle to white pill matching FinalCTA.

**Current GuidedPrayerSection.tsx structure (key lines):**
- Lines 48-52: Heading `<h2>` — add `mb-5`
- Lines 54-56: Subtitle `<p>` — remove entirely
- Line 58: Grid container — update gaps from `gap-3` to `sm:gap-4 lg:gap-5`
- Lines 64-90: Card `<button>` — enlarge padding, icons, text, add hover glow, update border, layout

**Test patterns (from GuidedPrayerSection.test.tsx):**
- Provider wrapping: `MemoryRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider` → component
- Line 95-101: Tests for heading text AND subtitle text — subtitle test must be removed
- Line 182: Asserts `p-4` on card className — must update to `p-6`

**FinalCTA button pattern to match (from FinalCTA.tsx line 51):**
```
rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg
shadow-[0_0_30px_rgba(255,255,255,0.20)]
transition-all duration-200
hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]
sm:text-lg
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
```

The spec adds `focus-visible:ring-white/50` and `focus-visible:ring-offset-hero-bg` (instead of FinalCTA's generic offset).

---

## Auth Gating Checklist

No auth gating changes. All existing auth gates preserved as-is.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Help Me Pray" click (logged out) | Existing: auth modal | N/A — unchanged | useAuth + useAuthModal (in PrayTabContent) |
| Guided Prayer card click (logged out) | Existing: auth modal | N/A — unchanged | useAuth + useAuthModal (in GuidedPrayerSection) |

---

## Design System Values (for UI steps)

All values from design-system.md recon (captured 2026-04-05) and codebase inspection.

| Component | Property | Current Value | Target Value | Source |
|-----------|----------|---------------|--------------|--------|
| PrayerInput heading | existence | Present (lines 106-113) | Removed | spec requirement |
| PrayerInput GRADIENT_TEXT_STYLE import | existence | Present (line 7) | Removed | spec requirement |
| Textarea | rows | `3` | `8` | spec requirement |
| Textarea | resize | `resize-none` | `resize-y` | spec requirement |
| Textarea | min-height | none | `min-h-[200px]` | spec requirement |
| Textarea | max-height | none | `max-h-[500px]` | spec requirement |
| Textarea | autoExpand | Active (lines 35-38, 146, 148) | Removed | spec requirement (manual resize replaces auto-expand) |
| "Help Me Pray" button | background | `bg-primary` | `bg-white` | spec requirement (match FinalCTA) |
| "Help Me Pray" button | text color | `text-white` | `text-hero-bg` | spec requirement |
| "Help Me Pray" button | shadow | `shadow-[0_0_20px_rgba(139,92,246,0.25)]` | `shadow-[0_0_30px_rgba(255,255,255,0.20)]` | FinalCTA.tsx:51 |
| "Help Me Pray" button | hover shadow | `hover:shadow-[0_0_30px_rgba(139,92,246,0.35)]` | `hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` | FinalCTA.tsx:51 |
| "Help Me Pray" button | hover bg | `hover:bg-primary-light` | `hover:bg-white/90` | FinalCTA.tsx:51 |
| "Help Me Pray" button | padding | `px-8 py-3` | `px-8 py-3.5` | FinalCTA.tsx:51 |
| "Help Me Pray" button | font size | `text-base` | `text-base sm:text-lg` | spec requirement |
| "Help Me Pray" button | focus ring | `ring-primary ring-offset-hero-bg` | `ring-white/50 ring-offset-hero-bg` | spec requirement |
| "Help Me Pray" button | disabled | `disabled:cursor-not-allowed disabled:opacity-50` | unchanged | spec requirement |
| GuidedPrayer subtitle | existence | Present (lines 54-56) | Removed | spec requirement |
| GuidedPrayer heading | margin-bottom | none | `mb-5` | spec requirement |
| Card grid | gap (mobile) | `gap-3` | `gap-3` (unchanged) | spec |
| Card grid | gap (tablet) | `sm:gap-3` | `sm:gap-4` | spec requirement |
| Card grid | gap (desktop) | `lg:gap-4` | `lg:gap-5` | spec requirement |
| Card grid | container mt | `mt-4` | `mt-0` | spec requirement |
| Card button | padding | `p-4` | `p-6` | spec requirement |
| Card button | min-width (mobile) | `min-w-[200px]` | `min-w-[220px]` | spec requirement |
| Card button | min-height (tablet+) | none | `sm:min-h-[180px]` | spec requirement |
| Card button | layout | none | `flex flex-col` | spec requirement |
| Card button | border | `border-white/10` | `border-white/[0.12]` | spec requirement |
| Card button | hover | `hover:bg-white/[0.10] hover:border-white/20` | `hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]` | spec requirement |
| Card button | transition | `transition-colors` | `transition-all duration-200` | spec requirement |
| Card button | focus ring offset | `ring-offset-dashboard-dark` | `ring-offset-hero-bg` | spec requirement |
| Card icon | size | `h-6 w-6` | `h-8 w-8` | spec requirement |
| Card icon | margin | `mb-2` | `mb-3` | spec requirement |
| Card title | style | `font-medium text-sm text-white` | `font-semibold text-base text-white` | spec requirement |
| Card description | style | `mt-1 text-xs text-white/60 line-clamp-2` | `mt-1 text-sm text-white/70 line-clamp-3 flex-1` | spec requirement |
| Card duration badge | style | `mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60` | `mt-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70` | spec requirement |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- FinalCTA white pill button: `bg-white text-hero-bg rounded-full shadow-[0_0_30px_rgba(255,255,255,0.20)] hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)]` — this is the exact pattern from FinalCTA.tsx:51
- FrostedCard-adjacent cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` — note `border-white/[0.12]`, NOT `border-white/10`
- Glow orb opacity for Pray tab: `glowOpacity={0.30}` — unchanged
- `ring-offset-hero-bg` is the correct focus ring offset for elements on `bg-hero-bg` backgrounds (NOT `ring-offset-dashboard-dark`)
- Textarea glow: `border-glow-cyan/30 motion-safe:animate-glow-pulse` — preserved
- AmbientSoundPill inline with chips: existing Spec C behavior — do NOT move or wrap
- BackgroundSquiggle + GlowBackground layering in PrayTabContent: untouched
- All Daily Hub tabs share `max-w-2xl` container width

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new localStorage keys. Existing `wr_prayer_draft` behavior unchanged.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Textarea full width, button full-width or auto, guided prayer cards in horizontal snap carousel with `min-w-[220px]` |
| Tablet | 640-1024px | Textarea full width, button auto width, guided prayer cards 2-column grid with `gap-4` and `min-h-[180px]` |
| Desktop | > 1024px | Same textarea/button, guided prayer cards 4-column grid with `gap-5` and `min-h-[180px]` |

---

## Vertical Rhythm

No changes to inter-section spacing. The `GuidedPrayerSection` sits at `mt-12` below the prayer input area (set in PrayTabContent.tsx line 220). This is unchanged.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Chips row → textarea | `mb-6` (chips div) | PrayerInput.tsx:122 — unchanged |
| Textarea → button | `mb-4` (textarea wrapper) | PrayerInput.tsx:137 — unchanged |
| Button → GuidedPrayerSection | `mt-12` | PrayTabContent.tsx:220 — unchanged |
| GuidedPrayer heading → card grid | `mb-5` (heading) + `mt-0` (grid) | spec requirement (currently mt-4 with no mb) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is CSS/className only — no new components, state, hooks, or routes
- [x] `GRADIENT_TEXT_STYLE` is used ONLY at line 109 in PrayerInput.tsx — safe to remove import
- [x] `autoExpand` is used ONLY by the textarea in PrayerInput.tsx — safe to remove
- [x] FinalCTA button pattern is the authoritative source for the white pill CTA style
- [x] All auth-gated actions from the spec are preserved (no changes)
- [x] Design system values verified from codebase inspection (exact line numbers cited)
- [x] No [UNVERIFIED] values — all values are from spec or direct codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Remove `autoExpand` function entirely? | Yes — remove the callback, `onInput` handler, and `autoExpand` calls in `onChange` | Spec switches to manual `resize-y`. Auto-expand fights with min/max height constraints and resize handle. The function is unused after removing its call sites. |
| Keep `onInput` prop on textarea? | Remove it — it was only used for `autoExpand` | No other functionality depends on `onInput` |
| Button disabled state styling | Keep `disabled:cursor-not-allowed disabled:opacity-50` | Spec explicitly says "Disabled state shows `opacity-50` and `cursor-not-allowed`" |
| Button `min-h-[44px]` | Keep for touch target compliance | Accessibility requirement |
| Card `inline-block` on duration badge | Change to `self-start` | Spec requires `self-start` for flex-col layout (pushes badge to bottom left) |
| Card CheckCircle2 positioning | Keep `absolute right-3 top-3` | Unchanged — spec doesn't modify completion checkmarks |

---

## Implementation Steps

### Step 1: PrayerInput.tsx — heading removal, textarea overhaul, button restyle

**Objective:** Remove the "What's On Your Heart?" heading, make the textarea taller with manual resize, and restyle the "Help Me Pray" button to match the FinalCTA white pill pattern.

**Files to modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — heading removal, textarea changes, button restyle

**Details:**

1. **Remove `GRADIENT_TEXT_STYLE` import** (line 7):
   - Delete: `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'`

2. **Remove heading wrapper div** (lines 106-113):
   - Delete the entire `<div className="mb-4">` block containing the `<h2>` heading

3. **Remove `autoExpand` callback** (lines 35-38):
   - Delete the `const autoExpand = useCallback(...)` block

4. **Remove `autoExpand` call from `onChange`** (line 146):
   - In the `onChange` handler, remove `autoExpand(e.target)`

5. **Remove `onInput` handler** (line 148):
   - Delete `onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}`

6. **Remove `autoExpand` call from `handleChipClick`** (line 89):
   - In the `setTimeout` callback inside `handleChipClick`, remove `autoExpand(textareaRef.current)`

7. **Update textarea attributes** (lines 150-152):
   - Change `rows={3}` → `rows={8}`
   - Change className: replace `resize-none` with `resize-y min-h-[200px] max-h-[500px]`
   - Full new textarea className:
     ```
     w-full resize-y min-h-[200px] max-h-[500px] rounded-lg border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 motion-safe:animate-glow-pulse focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50
     ```

8. **Restyle "Help Me Pray" button** (lines 172-179):
   - Current className:
     ```
     inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-8 py-3 text-base font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all duration-200 hover:bg-primary-light hover:shadow-[0_0_30px_rgba(139,92,246,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50
     ```
   - New className:
     ```
     inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50
     ```

9. **Remove unused `useCallback` import** if `autoExpand` was the only usage:
   - Check if `useCallback` is still used elsewhere in the file. It is NOT used elsewhere — remove from import.

**Auth gating:** No changes.

**Responsive behavior:**
- Desktop (1440px): Textarea full width within `max-w-2xl` container, button auto width, `sm:text-lg` on button
- Tablet (768px): Same as desktop
- Mobile (375px): Textarea full width, button full width or auto, `text-base` on button

**Guardrails (DO NOT):**
- DO NOT remove the `useRef` for `textareaRef` — it's still used for `focus()` calls
- DO NOT remove the `useEffect` for `retryPrompt` focus — still needed
- DO NOT change any state management, submission logic, or crisis detection
- DO NOT remove `aria-label="Prayer request"` or any other ARIA attributes
- DO NOT touch the chips section or AmbientSoundPill
- DO NOT change the CharacterCount component or its positioning
- DO NOT add any new imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders textarea with correct attributes | unit | Verify `rows=8`, `resize-y` in className, `min-h-[200px]`, `max-h-[500px]`, `aria-label="Prayer request"` |
| Help Me Pray button has white pill styling | unit | Verify button has `bg-white`, `text-hero-bg`, white glow shadow classes |
| heading "What's On Your Heart?" is not rendered | unit | Verify no `<h2>` with that text exists |
| chips are the first visible content | unit | Verify starter chips render as first content block |

**Expected state after completion:**
- [ ] "What's On Your Heart?" heading is gone
- [ ] `GRADIENT_TEXT_STYLE` import is removed from PrayerInput.tsx
- [ ] `autoExpand` callback and all its call sites are removed
- [ ] `useCallback` removed from import if no longer used
- [ ] Textarea uses `rows={8}`, `resize-y`, `min-h-[200px]`, `max-h-[500px]`
- [ ] "Help Me Pray" button is white pill with `bg-white text-hero-bg` and white glow shadow
- [ ] All ARIA attributes preserved
- [ ] All existing functionality (chips, draft save, crisis detection, submit) unchanged

---

### Step 2: GuidedPrayerSection.tsx — subtitle removal, card enlargement, grid gaps

**Objective:** Remove the subtitle, enlarge the guided prayer cards, and update grid gaps.

**Files to modify:**
- `frontend/src/components/daily/GuidedPrayerSection.tsx` — subtitle removal, heading margin, card overhaul, grid gaps

**Details:**

1. **Add `mb-5` to heading** (line 50):
   - Change: `className="font-bold text-white text-xl sm:text-2xl"`
   - To: `className="mb-5 font-bold text-white text-xl sm:text-2xl"`

2. **Remove subtitle** (lines 54-56):
   - Delete the entire `<p className="mt-1 font-serif italic text-white/50 text-base">Close your eyes and let God lead</p>`

3. **Update grid container** (line 58):
   - Current: `mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-4`
   - New: `mt-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-5`
   - Changes: `mt-4` → `mt-0`, `sm:gap-3` → `sm:gap-4`, `lg:gap-4` → `lg:gap-5`

4. **Overhaul card `<button>` className** (line 68):
   - Current:
     ```
     relative min-w-[200px] flex-shrink-0 snap-center rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4 text-left transition-colors hover:bg-white/[0.10] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark sm:min-w-0
     ```
   - New:
     ```
     relative min-w-[220px] flex flex-col flex-shrink-0 snap-center rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-left transition-all duration-200 hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:min-w-0 sm:min-h-[180px]
     ```
   - Changes: `min-w-[200px]` → `min-w-[220px]`, add `flex flex-col`, `border-white/10` → `border-white/[0.12]`, `p-4` → `p-6`, `transition-colors` → `transition-all duration-200`, add `hover:shadow-[...]`, `ring-offset-dashboard-dark` → `ring-offset-hero-bg`, add `sm:min-h-[180px]`

5. **Update card icon** (line 78):
   - Current: `className="mb-2 h-6 w-6 text-primary"`
   - New: `className="mb-3 h-8 w-8 text-primary"`

6. **Update card title** (line 81):
   - Current: `className="font-medium text-sm text-white"`
   - New: `className="font-semibold text-base text-white"`

7. **Update card description** (line 83):
   - Current: `className="mt-1 text-xs text-white/60 line-clamp-2"`
   - New: `className="mt-1 text-sm text-white/70 line-clamp-3 flex-1"`

8. **Update card duration badge** (line 87):
   - Current: `className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"`
   - New: `className="mt-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70"`

**Auth gating:** No changes. Existing `handleCardClick` with `useAuth()` + `useAuthModal()` preserved.

**Responsive behavior:**
- Desktop (1440px): 4-column grid, `gap-5` (20px), cards `min-h-[180px]`
- Tablet (768px): 2-column grid, `gap-4` (16px), cards `min-h-[180px]`
- Mobile (375px): Horizontal carousel, `min-w-[220px]`, snap scroll, no min-height

**Guardrails (DO NOT):**
- DO NOT change `handleCardClick` function or auth logic
- DO NOT change the `isComplete` checkmark logic or positioning
- DO NOT remove `aria-labelledby`, `aria-hidden`, or any ARIA attributes
- DO NOT change the icon mapping (`ICON_COMPONENTS`)
- DO NOT change session data source (`GUIDED_PRAYER_SESSIONS`)
- DO NOT add or remove any imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| heading renders with mb-5 | unit | Verify heading element has `mb-5` in className |
| subtitle is not rendered | unit | Verify "Close your eyes and let God lead" text is absent |
| cards have p-6 padding | unit | Verify first card button className contains `p-6` |
| cards have flex-col layout | unit | Verify card className contains `flex flex-col` |
| cards have enlarged icons | unit | Verify icon element has `h-8 w-8` classes |
| cards have min-h on tablet+ | unit | Verify card className contains `sm:min-h-[180px]` |

**Expected state after completion:**
- [ ] "Close your eyes and let God lead" subtitle is gone
- [ ] Heading has `mb-5` bottom margin
- [ ] Grid container uses `mt-0`, `sm:gap-4`, `lg:gap-5`
- [ ] Cards use `p-6`, `flex flex-col`, `min-w-[220px]`, `sm:min-h-[180px]`
- [ ] Cards have `border-white/[0.12]` and purple hover glow shadow
- [ ] Card focus ring offset is `ring-offset-hero-bg`
- [ ] Icons are `h-8 w-8`, titles `text-base font-semibold`, descriptions `text-sm text-white/70 line-clamp-3 flex-1`
- [ ] Duration badges have `self-start px-3 py-1 font-medium text-white/70`
- [ ] All auth gating preserved

---

### Step 3: Update GuidedPrayerSection tests

**Objective:** Update tests to reflect subtitle removal and card class changes.

**Files to modify:**
- `frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx` — update/remove subtitle test, update card class assertions

**Details:**

1. **Update test "renders section heading and subheading"** (lines 95-101):
   - Rename to "renders section heading without subtitle"
   - Remove the assertion for `'Close your eyes and let God lead'`
   - Add assertion that subtitle text is NOT in the document

2. **Update test "cards have minimum touch target size via padding"** (line 178-183):
   - Change assertion from `expect(firstButton.className).toContain('p-4')` to `expect(firstButton.className).toContain('p-6')`

**Auth gating:** N/A — test file only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change provider wrapping pattern
- DO NOT change mock setup
- DO NOT remove any auth-related test (logged-out card click, logged-in card click)
- DO NOT change any test that doesn't directly assert removed/changed content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Test file compiles and all tests pass | integration | Run `pnpm test frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx` |

**Expected state after completion:**
- [ ] Subtitle test updated to assert absence of subtitle
- [ ] Card padding test updated from `p-4` to `p-6`
- [ ] All other tests unchanged and passing

---

### Step 4: Run full test suite and verify

**Objective:** Confirm no test regressions across the Pray tab and related components.

**Files to verify (no modifications):**
- `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — integration tests should still pass (they query by `aria-label` and button name, not heading text or classNames)

**Details:**

1. Run `pnpm test frontend/src/components/daily/__tests__/GuidedPrayerSection.test.tsx` — all tests pass
2. Run `pnpm test frontend/src/components/daily/__tests__/PrayTabContent.test.tsx` — all tests pass
3. Run `pnpm test` — full suite passes with 0 failures
4. Run `pnpm build` — clean build, 0 errors, 0 warnings

**Potential test issues to watch for:**
- PrayTabContent.test.tsx line 134: queries `screen.getByRole('button', { name: /help me pray/i })` — will still work (button text unchanged)
- PrayTabContent.test.tsx line 132: queries `screen.getByLabelText('Prayer request')` — will still work (`aria-label` unchanged)
- No PrayTabContent test asserts "What's On Your Heart?" text, so heading removal won't break anything
- GuidedPrayerSection.test.tsx line 106: `expect(buttons.length).toBe(8)` — unchanged (same number of cards)

**Auth gating:** N/A — verification step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any test files in this step
- DO NOT skip test failures — investigate and fix

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | integration | `pnpm test` passes with 0 failures |
| Build | build | `pnpm build` succeeds with 0 errors |

**Expected state after completion:**
- [ ] All GuidedPrayerSection tests pass
- [ ] All PrayTabContent tests pass
- [ ] Full test suite passes (4,862+ tests, 0 failures)
- [ ] Production build succeeds

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | PrayerInput: heading removal, textarea overhaul, button restyle |
| 2 | — | GuidedPrayerSection: subtitle removal, card enlargement, grid gaps |
| 3 | 2 | Update GuidedPrayerSection tests |
| 4 | 1, 2, 3 | Run full test suite and verify build |

Steps 1 and 2 are independent and can be executed in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | PrayerInput overhaul | [COMPLETE] | 2026-04-06 | Removed heading, GRADIENT_TEXT_STYLE import, autoExpand + useCallback. Textarea rows=8, resize-y, min/max height. Button restyled to white pill. |
| 2 | GuidedPrayerSection overhaul | [COMPLETE] | 2026-04-06 | Removed subtitle, added mb-5 to heading. Grid gaps updated. Cards enlarged with flex-col, p-6, bigger icons/text, hover glow, hero-bg offset. |
| 3 | GuidedPrayerSection test updates | [COMPLETE] | 2026-04-06 | Renamed subtitle test to assert absence, updated padding assertion from p-4 to p-6. Also fixed PrayTabContent.test.tsx (6 tests querying removed heading/subtitle) and Pray.test.tsx (1 test). All 12 GuidedPrayerSection tests pass. |
| 4 | Full test suite verification | [COMPLETE] | 2026-04-06 | 5613 pass, 2 fail (pre-existing SongPickSection failures unrelated to this plan). Build clean, 0 errors. |
