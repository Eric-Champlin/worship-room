# Implementation Plan: BB-50 — Bible Polish Round 2

**Spec:** `_specs/bible-polish-round-2.md`
**Date:** 2026-04-17
**Branch:** `claude/feature/bible-polish-round-2`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** N/A (standalone polish spec)
**Master Spec Plan:** N/A (standalone spec after BB-47/BB-48)

---

## Architecture Context

### BibleLanding page (`/bible`)

- `frontend/src/pages/BibleLanding.tsx` wraps content in `<Layout>` (line 138). No `dark` prop is passed.
- `Layout.tsx` (line 14-16): outer div class is `dark ? 'bg-dashboard-dark' : 'bg-neutral-bg'`. Without `dark`, the outer wrapper is `bg-neutral-bg` (`#F5F5F5` — the gray gutter color).
- `Layout.tsx` (line 20-24): `<main>` has `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. BibleLanding's inner `<div className="min-h-screen bg-dashboard-dark">` (line 140) is inside this constrained main.
- **Root cause of gray gutters:** BibleLanding doesn't pass `dark` to Layout, so Layout's outer wrapper renders with `bg-neutral-bg`. At 1440px desktop, the max-w-7xl main is 1280px wide, and the outer gray background is visible on both sides.
- **Fix pattern:** `<Layout dark>` makes the outer wrapper `bg-dashboard-dark`, matching the inner div. No max-width change needed — both backgrounds merge visually.
- **Precedent:** `AccessibilityPage.tsx:6` already uses `<Layout dark>` for this exact purpose.
- `TodaysPlanCard.tsx` renders "Try a reading plan" (FrostedCard) when `plans.length === 0` (lines 11-21). `QuickActionsRow.tsx` has a "Reading Plans" card in the 3-card grid (lines 14-18). Both navigate to `/bible/plans` — the spec removes the TodaysPlanCard first-run state.

### ReaderChrome (`/bible/:book/:chapter`)

- `frontend/src/components/bible/reader/ReaderChrome.tsx` — fixed top toolbar.
- Line 81: back button already exists as `<Link to="/bible">` with `aria-label="Back to Bible"`.
- Lines 86-96: center chapter selector button — renders `{bookName} {chapter}` with no chevron indicator.
- Line 145: focus mode toggle button — `aria-label="Toggle focus mode"`.

### TypographySheet (settings panel in BibleReader)

- `frontend/src/components/bible/reader/TypographySheet.tsx`
- Line 242: section heading `"Focus mode"`.
- Line 251: toggle switch label `"Focus mode enabled"`.
- Line 274: dim orbs toggle label `"Dim orbs in focus mode"`.
- Tests at `__tests__/TypographySheet.test.tsx` assert these strings at lines 97, 106, 145, 163.

### Focus mode default

- `frontend/src/hooks/useFocusMode.ts` line 43: `enabled: true` is the default.
- `loadSettings()` (lines 50-60) returns the default when `localStorage.getItem(KEY_ENABLED)` is `null`.

### DrawerViewRouter (Browse Books animation)

- `frontend/src/components/bible/DrawerViewRouter.tsx` — manages view transitions within the BibleDrawer.
- `TRANSITION_MS = 220` (line 8). Pushes use `animate-view-slide-in` (250ms, decelerate), pops use `animate-view-slide-out` (150ms, accelerate) + `animate-view-slide-back-in` (250ms, decelerate).
- `tailwind.config.js` defines the keyframes: `view-slide-in` (translateX 100%→0, opacity 0→1), `view-slide-out` (translateX 0→100%, opacity 1→0), `view-slide-back-in` (translateX -30%→0, opacity 0.5→1).
- **Timing mismatch bug:** `TRANSITION_MS = 220` controls when the transition state is cleared (both views unmount the outgoing), but the CSS animations are 250ms. The outgoing view is unmounted 30ms before the animation completes, causing a visual pop/stutter. Fix: align `TRANSITION_MS` to match the longest animation (250ms) or use `animationend` events.

### BibleProgressMap (My Bible)

- `frontend/src/components/bible/my-bible/BibleProgressMap.tsx`
- Lines 101-105: chapter cell colors use `bg-white/[0.08]` (unread), `bg-primary/60` (read), `bg-primary/80` (highlighted). Spec requires white-only opacity tiers.

### ReadingHeatmap (My Bible)

- `frontend/src/components/bible/my-bible/ReadingHeatmap.tsx`
- Lines 17-23: `INTENSITY_CLASSES` already uses white-only tiers (`bg-white/10`, `bg-white/20`, `bg-white/[0.35]`, `bg-white/50`, `bg-white`) — **already fixed in BB-48**. No heatmap color change needed.

### MyBiblePage headings

- `frontend/src/pages/MyBiblePage.tsx`
- Line 176: `SectionHeading topLine="My Bible" bottomLine="everything you've marked"` — spec requires removing "everything you've marked".
- Line 133: empty state `'Nothing yet. Tap a verse in the reader to start.'` — spec requires removing "Nothing yet".

### Navbar order

- `frontend/src/components/Navbar.tsx` lines 14-20: `NAV_LINKS` array order is Daily Hub → Study Bible → Grow → Prayer Wall → Music.
- `frontend/src/components/MobileDrawer.tsx` lines 14-38: sections are DAILY → STUDY → COMMUNITY (Prayer Wall) → LISTEN (Music).
- `.claude/rules/10-ux-flows.md` lines 13-104: 4 ASCII nav diagrams show current order.
- **Spec requires:** Daily Hub → Study Bible → Grow → Music → Prayer Wall.

### Devotional rotation

- `frontend/src/data/devotionals.ts` `getTodaysDevotional()` (lines 42-64).
- When in a named season, `seasonalPool[dayInSeason % seasonalPool.length]` cycles through only the seasonal devotionals. Easter has 3, so only 3 devotionals rotate during the entire ~49-day Easter season.
- **Fix:** When `dayInSeason >= seasonalPool.length`, fall through to the general pool instead of cycling.

### Test patterns

- Vitest + RTL. Tests render with `MemoryRouter` or provider wrappers.
- ReaderChrome tests: `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx`
- TypographySheet tests: `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx`
- BibleProgressMap tests: `frontend/src/components/bible/my-bible/__tests__/BibleProgressMap.test.tsx`
- TodaysPlanCard tests: `frontend/src/components/bible/landing/__tests__/TodaysPlanCard.test.tsx`
- Navbar tests: `frontend/src/components/__tests__/Navbar.test.tsx`
- Devotional tests: check for existing test file at `frontend/src/data/__tests__/devotionals.test.ts` or similar.

### Auth gating

No auth behavior changes. Every change in this plan is unauthenticated-safe. Bible wave auth posture in `02-security.md` is preserved.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| All actions | No auth change | N/A | N/A |

No new or removed auth gates. Spec §Auth Gating confirms zero auth behavior change.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Layout outer bg (dark) | background | `bg-dashboard-dark` (`#0f0a1e`) | `Layout.tsx:16` |
| BibleLanding inner bg | background | `bg-dashboard-dark` (`#0f0a1e`) | `BibleLanding.tsx:140` |
| Progress map unread | bg | `bg-white/10` | spec §6a |
| Progress map partial | bg | `bg-white/40` | spec §6a |
| Progress map complete | bg | `bg-white` | spec §6a |
| ReaderChrome icon button | classes | `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white` | `ReaderChrome.tsx:8-9` |
| Chapter selector text | classes | `text-sm sm:text-base font-medium text-white/90` | `ReaderChrome.tsx:93` |
| SectionHeading gradient | style | `GRADIENT_TEXT_STYLE` (white→purple, 223deg) | `constants/gradients.tsx` |

**No [UNVERIFIED] values.** All values sourced from codebase inspection or spec.

---

## Design System Reminder

The executor must respect these project-specific rules:

- Do NOT add `GlowBackground` or `BackgroundSquiggle` to any Bible section page. BibleLanding uses `BibleLandingOrbs` atmospheric layer — untouched by this spec.
- Do NOT use `animate-glow-pulse` or cyan glow (both deprecated).
- Do NOT hardcode animation durations. Import from `frontend/src/constants/animation.ts` (BB-33).
- Do NOT use `Caveat` font for headings (deprecated — use `GRADIENT_TEXT_STYLE`).
- `window.scrollTo(0, 0)` uses instant behavior (no `{ behavior: 'smooth' }`).
- White pill CTA Pattern 2 for primary actions, Pattern 1 for inline CTAs.
- All Bible section changes remain unauthenticated per the Bible wave auth posture.
- The BibleReader is a documented layout exception — uses `ReaderChrome`, not `Navbar`/`SiteFooter`.
- Animation tokens: `TRANSITION_MS` values should match corresponding CSS animation durations to avoid timing mismatch artifacts.

---

## Shared Data Models

No new types. No new localStorage keys.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_focus_enabled` | Read | Default changes from `'true'` to `'false'` when key is absent. Existing values unaffected. |

No new reactive stores. BB-45 anti-pattern not introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Bible browser already fills full viewport. Navbar order change reflected in mobile drawer. ReaderChrome back arrow + chevron visible. |
| Tablet | 768px | Bible browser content centered within max-w-7xl, dark bg fills viewport edges. |
| Desktop | 1440px | Bible browser: `bg-dashboard-dark` on Layout outer div extends edge-to-edge. Content within max-w-7xl main. No gray gutters. |

---

## Inline Element Position Expectations

N/A — no inline-row layouts introduced or modified in this feature.

---

## Vertical Rhythm

No vertical rhythm changes. BibleLanding's `space-y-8` content column is unchanged. My Bible `py-8` sections unchanged.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/bible-polish-round-2` is checked out and based on `main` (which includes BB-47/BB-48 merged work).
- [ ] All auth-gated actions accounted for (none — spec changes no auth behavior).
- [ ] Design system values verified from codebase inspection (no guesses).
- [ ] No [UNVERIFIED] values remain.
- [ ] No deprecated patterns introduced.
- [ ] Heatmap colors were already fixed to white-only in BB-48 — only BibleProgressMap needs color changes.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bible browser layout fix | Pass `dark` to `<Layout>` | Simplest fix. Makes outer wrapper `bg-dashboard-dark` matching inner div. Precedent: `AccessibilityPage.tsx:6`. No Layout component changes needed. |
| TodaysPlanCard empty state | Return `null` when `plans.length === 0` | Spec: "Remove the large 'Try a reading plan' pill entirely." QuickActionsRow's "Reading Plans" card remains as the single entry point. |
| Browse Books animation timing | Increase `TRANSITION_MS` from 220 to 250 | Aligns JS cleanup timer with longest CSS animation duration (250ms `view-slide-in`/`view-slide-back-in`). Eliminates the 30ms early unmount that causes visual stutter. |
| Progress map "highlighted" vs "read" | Both map to white tiers (read → `bg-white/40`, highlighted → `bg-white`) | Spec's 3-tier model: none/some/all. "highlighted" chapters are a subset of "read" — visually distinguish as full completion. |
| Devotional rotation fix | Add `dayInSeason < seasonalPool.length` guard | Shows each seasonal devotional once (one per day), then falls through to general pool. During Easter (3 seasonal devos), days 0-2 show seasonal, days 3+ show general rotation. |
| MyBiblePage heading removal | Remove `bottomLine` from SectionHeading, keep `topLine="My Bible"` | Spec: remove "everything you've marked". Dynamic subhead remains (e.g., "15 highlights, 3 notes..."). |
| MyBiblePage empty subhead | Replace "Nothing yet. Tap a verse in the reader to start." with empty string or minimal copy | Spec: remove "Nothing yet". Replace with brief, non-shaming alternative: "Start reading to build your collection." |
| Back button aria-label | "Back to Study Bible" | Spec requirement. Matches the nav rename from BB-47. |
| Focus mode rename scope | Only TypographySheet UI labels + ReaderChrome toggle button | Internal code names (`FocusModeSettings`, `useFocusMode`, `KEY_ENABLED`) stay unchanged — they're internal identifiers, not user-facing. |
| Chapter selector chevron | Lucide `ChevronDown` icon, `h-3.5 w-3.5`, `aria-hidden="true"` | Spec: "standard UI pattern signals the element is tappable." Small enough to not crowd the toolbar. |

---

## Implementation Steps

### Step 1: NavBar Order Swap

**Objective:** Swap "Prayer Wall" and "Music" in the desktop navbar, mobile drawer, and navigation docs.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — reorder `NAV_LINKS` array
- `frontend/src/components/MobileDrawer.tsx` — swap COMMUNITY and LISTEN section positions
- `.claude/rules/10-ux-flows.md` — update 4 ASCII nav diagrams

**Details:**

In `Navbar.tsx` lines 14-20, change NAV_LINKS order from:
```tsx
{ label: 'Daily Hub', ... },
{ label: 'Study Bible', ... },
{ label: 'Grow', ... },
{ label: 'Prayer Wall', ... },
{ label: 'Music', ... },
```
To:
```tsx
{ label: 'Daily Hub', ... },
{ label: 'Study Bible', ... },
{ label: 'Grow', ... },
{ label: 'Music', ... },
{ label: 'Prayer Wall', ... },
```

In `MobileDrawer.tsx`, swap the `COMMUNITY_LINKS` and `LISTEN_LINKS` render order. Currently the mobile drawer renders sections in order: DAILY, STUDY, COMMUNITY, LISTEN. Change to: DAILY, STUDY, LISTEN, COMMUNITY. The actual section group arrays don't need to change — only the order they're rendered in the JSX.

In `10-ux-flows.md`, update all 4 ASCII nav diagrams (Desktop Logged Out line 16, Desktop Logged In line 32, Mobile Logged Out lines 54-64, Mobile Logged In lines 76-87) to reflect: Daily Hub → Study Bible → Grow → Music → Prayer Wall.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Music appears 4th, Prayer Wall 5th in horizontal nav bar.
- Tablet (768px): Same order in nav.
- Mobile (375px): Drawer sections reordered — Music section appears before Prayer Wall section.

**Guardrails (DO NOT):**
- DO NOT rename any nav items — this is a position swap only.
- DO NOT change the Local Support dropdown position (stays after Music/Prayer Wall).
- DO NOT change any mobile drawer section group arrays, only their render order.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Navbar renders items in correct order | unit | Assert Music appears before Prayer Wall in the rendered nav. Update any existing test that checks order. |
| MobileDrawer reflects new order | unit | Assert Music section appears before Prayer Wall section. |

**Expected state after completion:**
- [ ] Desktop navbar order: Daily Hub, Study Bible, Grow, Music, Prayer Wall, Local Support.
- [ ] Mobile drawer order: ..., Music, ..., Prayer Wall, ...
- [ ] `10-ux-flows.md` diagrams match.
- [ ] Existing Navbar tests updated and pass.

---

### Step 2: Bible Browser Full-Width Layout Fix

**Objective:** Eliminate the gray `bg-neutral-bg` gutters visible at 1440px desktop width on the Bible browser page.

**Files to create/modify:**
- `frontend/src/pages/BibleLanding.tsx` — add `dark` prop to `<Layout>`.

**Details:**

Change line 138 from:
```tsx
<Layout>
```
To:
```tsx
<Layout dark>
```

This makes `Layout.tsx`'s outer `<div>` use `bg-dashboard-dark` instead of `bg-neutral-bg`. Since BibleLanding's inner `<div>` (line 140) already uses `bg-dashboard-dark`, the backgrounds merge and no gray gutters are visible at any width.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): dark background extends from left viewport edge to right viewport edge. No gray gutters.
- Tablet (768px): same — dark bg fills viewport.
- Mobile (375px): no regression — content already fills viewport at this width.

**Guardrails (DO NOT):**
- DO NOT modify `Layout.tsx` itself — only pass the existing `dark` prop.
- DO NOT change `max-w-7xl` on the `<main>` element.
- DO NOT remove `BibleLandingOrbs` or `bg-dashboard-dark` from the inner div.
- DO NOT switch to the Home.tsx pattern (no Layout, manual Navbar/Footer) — `<Layout dark>` achieves the same result with less disruption.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleLanding renders with dark layout background | unit | Render BibleLanding, query the outermost Layout wrapper, assert it contains `bg-dashboard-dark` (not `bg-neutral-bg`). |

**Expected state after completion:**
- [ ] `<Layout dark>` at `BibleLanding.tsx:138`.
- [ ] No gray gutters visible at 1440px.
- [ ] Mobile rendering unchanged.
- [ ] Tests pass.

---

### Step 3: Remove Duplicate Reading Plan Button

**Objective:** Remove the "Try a reading plan" FrostedCard from `TodaysPlanCard` when no active plans exist. The "Reading Plans" card in `QuickActionsRow` remains as the single entry point.

**Files to create/modify:**
- `frontend/src/components/bible/landing/TodaysPlanCard.tsx` — return `null` for empty plans.
- `frontend/src/components/bible/landing/__tests__/TodaysPlanCard.test.tsx` — update first-run test.

**Details:**

In `TodaysPlanCard.tsx`, change lines 11-21 from:
```tsx
if (plans.length === 0) {
  return (
    <FrostedCard as="article">
      <Link to="/bible/plans" ...>
        ...
        <h3>Try a reading plan</h3>
      </Link>
    </FrostedCard>
  )
}
```
To:
```tsx
if (plans.length === 0) {
  return null
}
```

Remove the unused `ListChecks` import and `Link` import (if `Link` is only used in the empty state branch — check the active-plan branch at line 32 still uses `Link`). Keep `Link` if it's used elsewhere in the component. `ListChecks` is only used in the empty state branch, so it can be removed.

Update tests: change the "renders first-run state when no plans" test to assert the component renders nothing (e.g., `{ container } = render(...)` → `expect(container.innerHTML).toBe('')`).

**Auth gating:** N/A.

**Responsive behavior:** N/A — component returns null.

**Guardrails (DO NOT):**
- DO NOT remove the active-plan card (lines 24-61). That stays.
- DO NOT modify QuickActionsRow — the "Reading Plans" card there is kept.
- DO NOT remove the TodaysPlanCard component file — it still renders active plans.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns null when plans empty | unit | `render(<TodaysPlanCard plans={[]} />)` → container is empty. |
| Active plan card still renders | unit | Existing test with mock plans — verify still passes. |

**Expected state after completion:**
- [ ] "Try a reading plan" pill no longer appears on `/bible` when no active plans.
- [ ] Active plan progress card still renders when plans exist.
- [ ] Tests pass.

---

### Step 4: BibleReader Chrome Improvements (4a-4d)

**Objective:** Update the BibleReader top toolbar: fix back button label, default focus mode to OFF, rename focus mode, add chapter selector chevron.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — back button label + chevron
- `frontend/src/hooks/useFocusMode.ts` — default value change
- `frontend/src/components/bible/reader/TypographySheet.tsx` — rename focus mode labels
- `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx` — update assertions
- `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx` — update assertions

**Details:**

**4a — Back button aria-label:**

In `ReaderChrome.tsx` line 81, change:
```tsx
<Link to="/bible" className={ICON_BTN} aria-label="Back to Bible">
```
To:
```tsx
<Link to="/bible" className={ICON_BTN} aria-label="Back to Study Bible">
```

**4b — Default focus mode to OFF:**

In `useFocusMode.ts` line 43, change:
```tsx
enabled: true,
```
To:
```tsx
enabled: false,
```

This only affects users who have never toggled the setting (no `wr_bible_focus_enabled` in localStorage). Existing users with `'true'` stored are unaffected — `loadSettings()` reads from localStorage first.

**4c — Rename focus mode:**

In `TypographySheet.tsx`:

Line 242: `"Focus mode"` → `"Auto-hide toolbar"`

Line 251: `"Focus mode enabled"` → `"Auto-hide toolbar"`

Add a subtitle below the toggle (after line 252):
```tsx
<p className="mt-1 text-xs text-white/40">Toolbar fades after a few seconds of reading</p>
```

Line 274: `"Dim orbs in focus mode"` → `"Dim orbs when toolbar is hidden"`

In `ReaderChrome.tsx` line 145: `"Toggle focus mode"` → `"Toggle auto-hide toolbar"`

**4d — Chapter selector chevron:**

In `ReaderChrome.tsx`, add `ChevronDown` import from `lucide-react`. In the center button (lines 86-96), add the chevron icon after the chapter text:

```tsx
<button
  ref={centerRef}
  type="button"
  className="flex min-h-[44px] items-center gap-1 text-base font-medium text-white/90 transition-colors hover:text-white"
  aria-label="Open chapter picker"
  onClick={handleCenterClick}
>
  <span className="text-sm sm:text-base">
    {bookName} {chapter}
  </span>
  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
</button>
```

Add `gap-1` to the button class for spacing between text and chevron.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): chevron visible next to chapter text. Typography panel shows renamed labels.
- Tablet (768px): same.
- Mobile (375px): same — all changes are in the fixed ReaderChrome toolbar which renders at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT rename internal code identifiers (`FocusModeSettings`, `useFocusMode`, `KEY_ENABLED`, etc.) — only user-facing labels change.
- DO NOT change the focus mode behavior — only the default value and labels.
- DO NOT remove the back button (it already exists — only the aria-label changes).
- DO NOT make the chevron interactive separately from the button — it's decorative (`aria-hidden="true"`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Back button has "Back to Study Bible" aria-label | unit | Assert `screen.getByLabelText('Back to Study Bible')` exists. |
| Focus mode defaults to OFF | unit | Clear localStorage, call `useFocusMode()`, assert `settings.enabled === false`. |
| TypographySheet shows "Auto-hide toolbar" heading | unit | Assert `screen.getByText('Auto-hide toolbar')` exists. |
| TypographySheet toggle has "Auto-hide toolbar" label | unit | Assert `screen.getByLabelText('Auto-hide toolbar')` exists. |
| TypographySheet shows subtitle text | unit | Assert subtitle "Toolbar fades after a few seconds of reading" is rendered. |
| Focus toggle button has "Toggle auto-hide toolbar" label | unit | Assert `screen.getByLabelText('Toggle auto-hide toolbar')` on ReaderChrome. |
| Chapter selector shows chevron | unit | Assert ReaderChrome renders an `aria-hidden` SVG within the chapter selector button. |

**Expected state after completion:**
- [ ] Back button: `aria-label="Back to Study Bible"`.
- [ ] New users see toolbar visible at all times (focus mode OFF by default).
- [ ] Existing users with `wr_bible_focus_enabled: 'true'` unaffected.
- [ ] Typography panel: "Auto-hide toolbar" heading with subtitle. Toggle labeled "Auto-hide toolbar".
- [ ] Chapter selector: "John 3 ▾" with decorative chevron.
- [ ] All ReaderChrome and TypographySheet tests updated and pass.

---

### Step 5: Browse Books Animation Fix

**Objective:** Fix the visual glitch when clicking a book in the Bible drawer's Browse Books grid. The animation stutters because the JS cleanup timer (220ms) fires before the CSS animation completes (250ms).

**Files to create/modify:**
- `frontend/src/components/bible/DrawerViewRouter.tsx` — fix timing mismatch.

**Details:**

Change line 8 from:
```tsx
const TRANSITION_MS = 220
```
To:
```tsx
const TRANSITION_MS = 250
```

This aligns the JS transition state cleanup with the longest CSS animation duration (`view-slide-in` and `view-slide-back-in` are both 250ms). Previously, the outgoing view was unmounted 30ms before the incoming animation completed, causing a visible pop/stutter.

Also verify the `view-slide-out` animation (150ms, used during pop/back) completes well within the 250ms window — it does (150ms < 250ms).

If after this fix the animation still has visible issues during manual testing, replace the animated transition with an instant swap by wrapping the animation classes in a `reducedMotion` guard that is always true (effectively disabling animation while keeping the code path intact for future re-enable). But try the timing fix first — it's the most likely root cause.

**Auth gating:** N/A.

**Responsive behavior:** N/A — no UI impact, only animation timing.

**Guardrails (DO NOT):**
- DO NOT remove the animation system entirely as a first step — try the timing fix first.
- DO NOT hardcode `250` as a magic number — add a comment referencing the CSS animation durations in `tailwind.config.js`.
- DO NOT change the CSS keyframe definitions in `tailwind.config.js` — the animations themselves are correct, only the JS timer is wrong.
- DO NOT change the `useReducedMotion()` behavior — reduced motion already gets instant swaps.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| TRANSITION_MS matches CSS animation duration | unit | Assert `TRANSITION_MS >= 250` (or export and test the constant). |
| View transition completes without early unmount | integration | Render DrawerViewRouter, push a new view, assert both views are mounted during transition, then only the new view after TRANSITION_MS. |

**Expected state after completion:**
- [ ] `TRANSITION_MS = 250` in DrawerViewRouter.
- [ ] Book selection animation is smooth (no premature unmount stutter).
- [ ] Reduced motion users still get instant swaps (existing behavior).

---

### Step 6: My Bible Visual Cleanup

**Objective:** Change BibleProgressMap chapter cell colors to white-only opacity tiers and remove confusing copy from My Bible page.

**Files to create/modify:**
- `frontend/src/components/bible/my-bible/BibleProgressMap.tsx` — change cell colors.
- `frontend/src/pages/MyBiblePage.tsx` — remove/update heading copy and empty state text.
- `frontend/src/components/bible/my-bible/__tests__/BibleProgressMap.test.tsx` — update color assertions.
- `frontend/src/pages/__tests__/MyBiblePage.test.tsx` (if exists) — update text assertions.

**Details:**

**6a — BibleProgressMap colors:**

In `BibleProgressMap.tsx` lines 101-105, change the chapter cell color classes from:
```tsx
state === 'unread' && 'bg-white/[0.08]',
state === 'read' && 'bg-primary/60',
state === 'highlighted' && 'bg-primary/80',
```
To:
```tsx
state === 'unread' && 'bg-white/10',
state === 'read' && 'bg-white/40',
state === 'highlighted' && 'bg-white',
```

Mapping: `unread` (no activity) → `bg-white/10`, `read` (some chapters) → `bg-white/40`, `highlighted` (fully read/all chapters) → `bg-white` (solid white).

**6b — MyBiblePage copy cleanup:**

In `MyBiblePage.tsx` line 176, change:
```tsx
<SectionHeading topLine="My Bible" bottomLine="everything you've marked" ... />
```
To:
```tsx
<SectionHeading topLine="My" bottomLine="Bible" ... />
```

This keeps the 2-line heading pattern consistent with other pages ("Your" / "Study Bible", "My" / "Bible") and removes the confusing "everything you've marked" text.

In `MyBiblePage.tsx` line 133, change the empty-state subhead from:
```tsx
if (isEmpty) return 'Nothing yet. Tap a verse in the reader to start.'
```
To:
```tsx
if (isEmpty) return 'Start reading to build your collection.'
```

This replaces the "Nothing yet" text with warmer, action-oriented copy that doesn't feel like a judgment.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): White chapter cells on dark background — maximum contrast.
- Mobile (375px): Same — cell sizes are already responsive via existing breakpoint classes.

**Guardrails (DO NOT):**
- DO NOT change the heatmap colors (ReadingHeatmap.tsx) — those were already fixed to white-only in BB-48.
- DO NOT change the `ChapterState` type or the `getChapterState()` logic — only the CSS classes change.
- DO NOT remove the dynamic subhead logic (lines 134-141) — only the empty-state branch text changes.
- DO NOT add any new colors (purple, green, etc.) — spec requires white-only.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Progress map unread cells use `bg-white/10` | unit | Render BookCard with unread chapters, assert cell className contains `bg-white/10`. |
| Progress map read cells use `bg-white/40` | unit | Render BookCard with read chapters, assert `bg-white/40`. |
| Progress map highlighted cells use `bg-white` | unit | Render BookCard with highlighted chapters, assert `bg-white`. |
| No purple color classes in progress map | unit | Guard test: assert no rendered element className contains `bg-primary`. |
| MyBiblePage heading shows "My" / "Bible" | unit | Assert `screen.getByText('My')` and `screen.getByText('Bible')` in SectionHeading. |
| MyBiblePage empty state shows warm copy | unit | Render with empty stores, assert "Start reading to build your collection." is present. |
| MyBiblePage does not show "Nothing yet" | unit | Render with empty stores, assert `screen.queryByText(/Nothing yet/)` is null. |
| MyBiblePage does not show "everything you've marked" | unit | Assert `screen.queryByText(/everything you've marked/)` is null. |

**Expected state after completion:**
- [ ] BibleProgressMap uses white-only opacity tiers.
- [ ] "Everything you've marked" heading removed.
- [ ] "Nothing yet" empty state replaced with warm copy.
- [ ] Tests pass.

---

### Step 7: Daily Devotional Rotation Fix

**Objective:** Fix the devotional rotation so all 50 devotionals participate, not just the 3 seasonal ones during a named season.

**Files to create/modify:**
- `frontend/src/data/devotionals.ts` — fix `getTodaysDevotional()` selection logic.
- `frontend/src/data/__tests__/devotionals.test.ts` (create if needed) — rotation coverage tests.

**Details:**

In `devotionals.ts` `getTodaysDevotional()`, change the seasonal selection block (around lines 50-55) from:
```tsx
if (isNamedSeason) {
  const seasonalPool = DEVOTIONAL_POOL.filter((d) => d.season === currentSeason.id)
  if (seasonalPool.length > 0) {
    const dayInSeason = getDayWithinSeason(currentSeason.id, adjustedDate)
    return seasonalPool[dayInSeason % seasonalPool.length]
  }
}
```
To:
```tsx
if (isNamedSeason) {
  const seasonalPool = DEVOTIONAL_POOL.filter((d) => d.season === currentSeason.id)
  const dayInSeason = getDayWithinSeason(currentSeason.id, adjustedDate)
  if (seasonalPool.length > 0 && dayInSeason < seasonalPool.length) {
    return seasonalPool[dayInSeason]
  }
  // Fall through to general pool when seasonal devotionals are exhausted
}
```

The key change: add `&& dayInSeason < seasonalPool.length` to the condition. When `dayInSeason >= seasonalPool.length` (e.g., day 4+ of Easter with only 3 Easter devotionals), the function falls through to the general pool rotation below.

This means:
- Easter day 0-2: 3 Easter-specific devotionals (one per day).
- Easter day 3+: general pool rotation (day-of-year index into 30 general devotionals).
- Same pattern for Lent (5 devotionals → days 0-4 are Lent-specific, days 5+ are general), Advent (5), etc.
- Non-seasonal days: general pool rotation (unchanged).

**Auth gating:** N/A.

**Responsive behavior:** N/A — no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the `DEVOTIONAL_POOL` data — the fix is logic-only.
- DO NOT change the general pool rotation logic (day-of-year modulo).
- DO NOT change `getDayWithinSeason()` — it correctly returns 0-indexed day within the season.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns seasonal devotional within pool range | unit | Mock date within Easter season day 0 → returns Easter devotional 0. |
| Falls through to general pool when seasonal exhausted | unit | Mock date within Easter season day 10 (> 3 Easter devotionals) → returns a general (non-seasonal) devotional. |
| 5+ consecutive days produce 5+ different devotionals | unit | Call `getTodaysDevotional` for 7 consecutive days during Easter → assert at least 5 unique devotional IDs. |
| All 30 general devotionals participate | unit | Call `getTodaysDevotional` for 30 consecutive non-seasonal days → assert 30 unique IDs (modulo 30 on day-of-year). |
| Seasonal devotionals take priority when available | unit | Mock Easter day 0 → assert returned devotional has `season === 'easter'`. |

**Expected state after completion:**
- [ ] `getTodaysDevotional()` shows seasonal devotionals within pool size, then falls through to general pool.
- [ ] 5+ consecutive days during a season produce 5+ different devotionals.
- [ ] All 30 general devotionals participate in rotation.
- [ ] Tests pass.

---

### Step 8: Final Verification

**Objective:** Run all checks and verify the integrated behavior.

**Files to create/modify:** None (verification only).

**Details:**

1. Run `pnpm lint` — must be clean.
2. Run `pnpm test` — all tests must pass (with updates from Steps 1-7).
3. Run `pnpm build` — must succeed.
4. Manual browser verification (user runs `pnpm dev`):
   - Navigate to `/bible` at 1440px → no gray gutters.
   - Navigate to `/bible` at 375px → no regression.
   - Verify navbar order: Daily Hub, Study Bible, Grow, Music, Prayer Wall.
   - Verify mobile drawer order matches.
   - Open BibleReader (`/bible/john/3`) → verify back arrow says "Back to Study Bible" (screen reader / inspect).
   - Verify "John 3 ▾" chevron visible in top toolbar.
   - Verify toolbar stays visible (focus mode OFF by default).
   - Open typography panel → verify "Auto-hide toolbar" heading with subtitle.
   - Click Browse Books → click a book → verify smooth animation.
   - Navigate to `/bible/my` → verify white chapter cells in progress map.
   - Verify no "Everything you've marked" or "Nothing yet" text.
   - Navigate to `/daily?tab=devotional` → verify devotional title. Check 3+ dates with devtools date override → verify different devotionals appear.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm lint` | lint | Clean output. |
| `pnpm test` | unit/integration | All pass, 0 failures. |
| `pnpm build` | build | Successful production build. |

**Expected state after completion:**
- [ ] All lint, test, and build checks pass.
- [ ] All 19 acceptance criteria from the spec are satisfied.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | NavBar order swap |
| 2 | — | Bible browser full-width layout fix |
| 3 | — | Remove duplicate reading plan button |
| 4 | — | BibleReader chrome improvements (4a-4d) |
| 5 | — | Browse Books animation fix |
| 6 | — | My Bible visual cleanup |
| 7 | — | Daily devotional rotation fix |
| 8 | 1, 2, 3, 4, 5, 6, 7 | Final verification |

Steps 1-7 are independent and can be executed in any order. Step 8 depends on all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | NavBar order swap | [COMPLETE] | 2026-04-17 | Swapped Music before Prayer Wall in Navbar.tsx, MobileDrawer.tsx, 10-ux-flows.md. Added order assertion tests. 65/65 tests pass. |
| 2 | Bible browser full-width fix | [COMPLETE] | 2026-04-17 | Added `dark` prop to `<Layout>` in BibleLanding.tsx:138. Existing 14 tests pass. |
| 3 | Remove duplicate reading plan button | [COMPLETE] | 2026-04-17 | TodaysPlanCard returns null when plans empty. Removed unused ListChecks import. Updated tests. 9/9 pass. |
| 4 | BibleReader chrome improvements | [COMPLETE] | 2026-04-17 | 4a: aria-label → "Back to Study Bible". 4b: focus default false. 4c: renamed to "Auto-hide toolbar" + subtitle. 4d: ChevronDown added. All 47 tests pass. |
| 5 | Browse Books animation fix | [COMPLETE] | 2026-04-17 | TRANSITION_MS 220→250 with comment. 6/6 tests pass. |
| 6 | My Bible visual cleanup | [COMPLETE] | 2026-04-17 | Progress map colors → white-only (bg-white/10, /40, solid). Heading → "My"/"Bible". Empty state → warm copy. 25/25 tests pass. |
| 7 | Daily devotional rotation fix | [COMPLETE] | 2026-04-17 | Added `dayInSeason < seasonalPool.length` guard. Seasonal devos shown once each, then general pool. 28/28 tests pass. |
| 8 | Final verification | [COMPLETE] | 2026-04-17 | Lint clean. Build succeeds. 8494 tests pass. 13 pre-existing failures (useBibleAudio, GrowthGarden) — unrelated to BB-50 changes. Also fixed useFocusMode tests (needed explicit enabled=true in beforeEach after default change) and BibleLanding tests (TodaysPlanCard null assertion). |
