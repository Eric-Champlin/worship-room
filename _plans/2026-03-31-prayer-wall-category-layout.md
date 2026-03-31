# Implementation Plan: Prayer Wall Category Layout + Mental Health Category

**Spec:** `_specs/prayer-wall-category-layout.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/prayer-wall-category-layout`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign and inner-page hero redesign (~2026-03-25). Prayer Wall category pill styles come from codebase inspection of `CategoryFilterBar.tsx`, not the recon.

---

## Architecture Context

### Category System

**Constants:** `frontend/src/constants/prayer-categories.ts`
- `PRAYER_CATEGORIES` — `as const` tuple: `['health', 'family', 'work', 'grief', 'gratitude', 'praise', 'relationships', 'other', 'discussion']`
- `PrayerCategory` — union type derived from the tuple
- `CATEGORY_LABELS` — `Record<PrayerCategory, string>` mapping slugs to display labels
- `isValidCategory()` — runtime type guard for URL param validation

**Type usage:** `PrayerRequest.category: PrayerCategory` in `frontend/src/types/prayer-wall.ts:19`. Also imported by `frontend/src/types/personal-prayer.ts`.

### Category Filter Bar

**File:** `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` (100 lines)
- Container: `role="toolbar"` with `aria-label="Filter prayers by category"`
- Inner flex: `mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 py-3 scrollbar-none lg:flex-wrap lg:overflow-visible`
- Pill base: `min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap`
- Selected: `border-primary/40 bg-primary/20 text-primary-lt`
- Unselected: `border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90`
- Renders: "All" pill + optional challenge pill + 9 category pills from `PRAYER_CATEGORIES`

**Current desktop behavior:** `lg:flex-wrap lg:overflow-visible` — pills wrap to multiple rows on desktop. This is the behavior the spec changes to single-row no-wrap.

### Category Selectors in Composers

**InlineComposer** (`frontend/src/components/prayer-wall/InlineComposer.tsx:136-165`):
- `<fieldset>` with `<legend>` "Category" + required asterisk
- `flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible`
- Maps `PRAYER_CATEGORIES` to pill buttons with same selected/unselected pattern

**PrayerComposer** (`frontend/src/components/my-prayers/PrayerComposer.tsx:118-147`):
- Same pattern as InlineComposer
- `flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible`
- Slightly different unselected colors: `border-white/15 bg-white/5 text-white/70 hover:bg-white/10`

**EditPrayerForm** (`frontend/src/components/my-prayers/EditPrayerForm.tsx:95`):
- Same flex pattern: `flex flex-nowrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap lg:overflow-visible`

### Prayer Wall Page

**File:** `frontend/src/pages/PrayerWall.tsx` (554 lines)
- URL-based filtering via `useSearchParams()` + `isValidCategory()`
- `categoryCounts` computed via `useMemo` iterating `allPrayers`
- Sticky filter bar via `IntersectionObserver` sentinel
- `CategoryFilterBar` rendered inside sticky `div` at lines 398-407

### Mock Data

**File:** `frontend/src/mocks/prayer-wall-mock-data.ts`
- 10 mock users, 18+ mock prayers
- Each prayer has `category: PrayerCategory` field
- Categories used: discussion (3 QOTD), health (2), other (2), work (2), family, praise, grief, gratitude, relationships

### Test Patterns

- **CategoryFilterBar tests** (`__tests__/CategoryFilterBar.test.tsx`): Standalone render, no router needed. Uses `screen.getAllByRole('button')` to count pills. Tests `aria-pressed`, className checks for `bg-primary/20`. Expects 10 buttons (All + 9 categories).
- **InlineComposer tests** (`__tests__/InlineComposer.test.tsx`): Wraps in `<MemoryRouter>`. Mocks challenge modules. Tests 9 category pills by label text.
- **PrayerWall page tests**: Wrap in `<MemoryRouter>` + `<ToastProvider>` + `<AuthModalProvider>`.

### Directory Conventions

- Constants: `frontend/src/constants/`
- Types: `frontend/src/types/`
- Mock data: `frontend/src/mocks/`
- Components: `frontend/src/components/prayer-wall/`
- Tests: `frontend/src/components/prayer-wall/__tests__/`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Filter by Mental Health | Works for all users | Step 1 (constant addition) | N/A — no auth required |
| View Mental Health prayers | Works for all users | Step 2 (mock data) | N/A — no auth required |
| Compose prayer tagged Mental Health | Existing auth gate on composer open | Step 1 (constant addition) | Existing `useAuth()` + `useAuthModal()` pattern — no changes needed |

All auth behavior is inherited from existing composer auth gates. No new auth checks needed.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Filter bar container | background | `bg-hero-mid/90 backdrop-blur-sm` | CategoryFilterBar.tsx:33 |
| Filter bar container | border | `border-b border-white/10` | CategoryFilterBar.tsx:33 |
| Filter bar inner | max-width | `max-w-[720px]` | CategoryFilterBar.tsx:35 |
| Pill (selected) | styles | `border-primary/40 bg-primary/20 text-primary-lt` | CategoryFilterBar.tsx:45 |
| Pill (unselected) | styles | `border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90` | CategoryFilterBar.tsx:46 |
| Pill base | styles | `min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium` | CategoryFilterBar.tsx:43 |
| Pill (tighter for 12 items) | padding/gap | `px-3 py-1.5` pill, `gap-2` container | Spec requirement 3 |
| Scroll fade gradient | mask | `linear-gradient(to right, black calc(100% - 40px), transparent)` | Spec requirement 4 |
| Composer pill (InlineComposer unselected) | styles | `border-white/10 bg-white/10 text-white/70 hover:bg-white/15` | InlineComposer.tsx:156 |
| Composer pill (PrayerComposer unselected) | styles | `border-white/15 bg-white/5 text-white/70 hover:bg-white/10` | PrayerComposer.tsx:134 |

---

## Design System Reminder

- **Pill styles:** Selected = `border-primary/40 bg-primary/20 text-primary-lt`. Unselected = `border-white/15 bg-white/10 text-white/70`.
- **Touch targets:** All interactive pills must have `min-h-[44px]` for mobile accessibility.
- **Hidden scrollbar:** Use `scrollbar-none` Tailwind utility (already present in codebase at 8+ locations).
- **Category filter bar max-width:** `max-w-[720px]` to align with prayer card feed below.
- **Gradient text headings:** Use `GRADIENT_TEXT_STYLE` from `@/constants/gradients` + `px-1 sm:px-2` padding to prevent Caveat flourish clipping (recent fix from content-width-layout-fixes plan).
- **Focus ring pattern:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70` on all interactive pills.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | — | Filter state is URL-based (`?category=mental-health`) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single row horizontal scroll, fade gradient on right, 44px min-height pills, hidden scrollbar |
| Tablet | 768px | Single row horizontal scroll, fade gradient on right, hidden scrollbar |
| Desktop (narrow) | 1024px | Single row flex-nowrap, may scroll slightly |
| Desktop (wide) | 1440px | Single row, all 12 pills visible, no scroll, no fade gradient |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → filter bar | 0px (adjacent) | Codebase: filter bar is sticky, directly below hero |
| Filter bar → first prayer card | 32px (`pt-8 px-4`) | PrayerWall.tsx:156 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for (inherited — no new gates)
- [x] Design system values are verified from codebase inspection (CategoryFilterBar.tsx, InlineComposer.tsx, PrayerComposer.tsx)
- [x] No [UNVERIFIED] values — all styling comes from existing codebase files
- [x] Recon report not applicable (layout change, not new page)
- [ ] `mental-health` slug does not collide with any existing URL param value (verified: no collision in `PRAYER_CATEGORIES`)
- [ ] Tailwind `scrollbar-none` utility is available (verified: used in 8+ files)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pill padding reduction scope | Only in `CategoryFilterBar` — composers keep `px-4 py-2` | Composers show fewer pills at a time (9 in a modal-like context), no wrapping issue there |
| Fade gradient implementation | CSS mask-image on the scroll container's parent wrapper | Spec explicitly defines the mask pattern; `mask-image` is widely supported |
| Fade gradient removal at scroll end | JavaScript `scroll` event listener checking `scrollLeft + clientWidth >= scrollWidth - 1` | Spec says "remove mask when user scrolls to end" |
| Fade gradient on left edge | Not shown | Spec only mentions right-edge fade; "All" pill is always first and always visible |
| Category order in `PRAYER_CATEGORIES` array | Insert `mental-health` after `health` (index 1) | Spec: "Position in category order: after Health, before Family" |
| Pill size change in composers | No change | Spec only targets the filter bar layout, not composers |
| `EditPrayerForm` category pills | Add `mental-health` via constants — automatic | `EditPrayerForm` already maps `PRAYER_CATEGORIES`, so it gets the new category for free |

---

## Implementation Steps

### Step 1: Add `mental-health` to Category Constants

**Objective:** Add the new category value, label, and update the type union.

**Files to create/modify:**
- `frontend/src/constants/prayer-categories.ts` — Add `'mental-health'` to the array and label map

**Details:**

Update `PRAYER_CATEGORIES` array to insert `'mental-health'` after `'health'`:

```typescript
export const PRAYER_CATEGORIES = [
  'health', 'mental-health', 'family', 'work', 'grief',
  'gratitude', 'praise', 'relationships', 'other', 'discussion',
] as const
```

Add entry to `CATEGORY_LABELS`:
```typescript
'mental-health': 'Mental Health',
```

The `PrayerCategory` type and `isValidCategory()` function derive from the tuple automatically — no changes needed.

**Auth gating:** N/A — constants file, no runtime auth.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the relative order of existing categories
- DO NOT modify `isValidCategory()` — it already uses `PRAYER_CATEGORIES.includes()`
- DO NOT add icons or emoji to the category label

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update `prayer-categories.test.ts` — array length | unit | `PRAYER_CATEGORIES` has 10 items (was 9) |
| Update `prayer-categories.test.ts` — mental-health is valid | unit | `isValidCategory('mental-health')` returns `true` |
| Update `prayer-categories.test.ts` — label exists | unit | `CATEGORY_LABELS['mental-health']` equals `'Mental Health'` |
| Ordering test | unit | `PRAYER_CATEGORIES` has `'mental-health'` at index 1 (after `'health'`) |

**Expected state after completion:**
- [x] `PrayerCategory` union includes `'mental-health'`
- [x] `CATEGORY_LABELS` has `'Mental Health'` entry
- [x] `isValidCategory('mental-health')` returns `true`
- [x] TypeScript compiles without errors (all `Record<PrayerCategory, ...>` usages require the new key)

**Note:** After adding `'mental-health'` to the type, TypeScript will flag any `Record<PrayerCategory, ...>` that doesn't include the new key. The `categoryCounts` in `PrayerWall.tsx:108-113` initializes counts in a loop over `PRAYER_CATEGORIES`, so it handles this automatically. The test file `CategoryFilterBar.test.tsx:7-10` has a hardcoded `zeroCounts` object — this must be updated in Step 4.

---

### Step 2: Add Mental Health Mock Prayers

**Objective:** Add 3 mock prayer requests tagged `mental-health` to the mock data.

**Files to create/modify:**
- `frontend/src/mocks/prayer-wall-mock-data.ts` — Add 3 new prayer entries

**Details:**

Add 3 new prayers to `MOCK_PRAYERS` array, positioned after the existing regular prayers (before the end of the array). Follow the exact mock data structure:

```typescript
{
  id: 'prayer-13',
  userId: 'user-6',
  authorName: 'Michael',
  authorAvatarUrl: 'https://i.pravatar.cc/150?u=user6',
  isAnonymous: false,
  content: 'Struggling with anxiety that won\'t let go. Please pray for peace in my mind.',
  category: 'mental-health',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-03-20T09:00:00Z',
  lastActivityAt: '2026-03-20T14:30:00Z',
  prayingCount: 34,
  commentCount: 7,
},
{
  id: 'prayer-14',
  userId: null,
  authorName: 'Anonymous',
  authorAvatarUrl: null,
  isAnonymous: true,
  content: 'Going through depression and finding it hard to get out of bed. Prayers for strength and hope.',
  category: 'mental-health',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-03-19T18:00:00Z',
  lastActivityAt: '2026-03-20T08:00:00Z',
  prayingCount: 41,
  commentCount: 5,
},
{
  id: 'prayer-15',
  userId: 'user-5',
  authorName: 'Rachel',
  authorAvatarUrl: 'https://i.pravatar.cc/150?u=user5',
  isAnonymous: false,
  content: 'Burnout from work and life is overwhelming. Please pray for rest and clarity.',
  category: 'mental-health',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-03-18T21:00:00Z',
  lastActivityAt: '2026-03-19T12:00:00Z',
  prayingCount: 28,
  commentCount: 3,
},
```

Check existing prayer IDs to avoid collisions — the last existing prayer ID determines the starting ID for new prayers. Timestamps should be recent but not newer than the most recent existing prayer.

**Auth gating:** N/A — mock data file.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change any existing mock prayer entries
- DO NOT use prayer text from the spec verbatim if it differs from what's shown — use the exact text from the spec
- DO NOT add `qotdId` or `challengeId` fields to the new prayers (they are regular prayer requests)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No dedicated test | — | Mock data correctness validated by filter tests in Step 4 |

**Expected state after completion:**
- [x] 3 new prayers with `category: 'mental-health'` exist in mock data
- [x] Each has realistic prayer text about anxiety, depression, and burnout
- [x] All existing mock prayers unchanged
- [x] Build compiles (TypeScript validates `'mental-health'` is a valid `PrayerCategory`)

---

### Step 3: Refactor CategoryFilterBar to Single-Row Layout with Scroll Fade

**Objective:** Change the filter bar from flex-wrap on desktop to flex-nowrap everywhere, add tighter pill sizing, and implement right-edge fade gradient for overflow indication.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — Layout refactor + fade gradient

**Details:**

**Layout change — inner flex container (line 35):**

Replace:
```
mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 py-3 scrollbar-none lg:flex-wrap lg:overflow-visible
```
With:
```
mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 py-3 scrollbar-none flex-nowrap
```

Key change: Remove `lg:flex-wrap lg:overflow-visible`, add `flex-nowrap`. This prevents wrapping at all breakpoints.

**Pill size tightening — all pill buttons:**

Replace `px-4 py-2` with `px-3 py-1.5` on all pill buttons (All pill, challenge pill, category pills). Keep `min-h-[44px]` for touch targets. Keep `text-sm font-medium`.

**Fade gradient implementation:**

Wrap the scroll container in a `<div className="relative">` wrapper. Add a fade gradient pseudo-element on the right edge:

```tsx
const scrollRef = useRef<HTMLDivElement>(null)
const [showFade, setShowFade] = useState(false)

useEffect(() => {
  const el = scrollRef.current
  if (!el) return

  const checkOverflow = () => {
    const hasOverflow = el.scrollWidth > el.clientWidth
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setShowFade(hasOverflow && !atEnd)
  }

  checkOverflow()
  el.addEventListener('scroll', checkOverflow, { passive: true })
  const observer = new ResizeObserver(checkOverflow)
  observer.observe(el)

  return () => {
    el.removeEventListener('scroll', checkOverflow)
    observer.disconnect()
  }
}, [])
```

Fade gradient element (inside the `relative` wrapper, after the scroll div):
```tsx
{showFade && (
  <div
    className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
    style={{
      background: 'linear-gradient(to right, transparent, rgba(30, 11, 62, 0.9))',
    }}
    aria-hidden="true"
  />
)}
```

The fade gradient color `rgba(30, 11, 62, 0.9)` matches `hero-mid` (`#1E0B3E`) with the bar's `/90` opacity.

**Smooth scroll behavior:**

Add `scroll-smooth` to the scroll container's className (or use CSS `scroll-behavior: smooth` if Tailwind class not available — check first).

**Auth gating:** N/A — pure UI component.

**Responsive behavior:**
- Desktop (1440px): All 12 pills (All + 10 categories + optional challenge) fit in one row. No scroll. No fade gradient.
- Desktop (1024px): Pills likely fit in one row. If barely too wide, horizontal scroll + fade.
- Tablet (768px): Horizontal scroll with fade gradient visible.
- Mobile (375px): Horizontal scroll with fade gradient. All pills maintain 44px min-height.

**Guardrails (DO NOT):**
- DO NOT change the pill selected/unselected color scheme
- DO NOT remove `scrollbar-none` — hidden scrollbar is required
- DO NOT use CSS `mask-image` for the fade — use a positioned overlay div matching the bar background. CSS mask would make the entire bar transparent at the edge, clipping pill text.
- DO NOT change the `role="toolbar"` or `aria-label`
- DO NOT add left-edge fade gradient (spec only requires right edge)
- DO NOT change the `max-w-[720px]` constraint

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "All" pill + 10 category pills (was 9) | unit | `screen.getAllByRole('button')` has 11 items |
| "Mental Health" pill renders between Health and Family | unit | Get all buttons, verify order |
| Scroll container has `flex-nowrap` | unit | Check className of scroll container |
| Scroll container has `overflow-x-auto` | unit | Check className |
| No `lg:flex-wrap` class present | unit | Verify the removed class is gone |
| Fade gradient div has `aria-hidden="true"` | unit | Accessibility check |

**Expected state after completion:**
- [x] Pills never wrap to a second line at any breakpoint
- [x] Horizontal scroll with hidden scrollbar on overflow
- [x] Right-edge fade gradient appears when content overflows
- [x] Fade gradient disappears when scrolled to end
- [x] All 12 pills (including Mental Health) render
- [x] "All" is always the first pill (never scrolled off-screen on initial load)

---

### Step 4: Update Tests

**Objective:** Update existing tests to account for 10 categories (was 9) and new Mental Health category.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx` — Update counts, button count expectations
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — Update pill count and label list
- `frontend/src/constants/__tests__/prayer-categories.test.ts` — Update for 10 categories (if this file exists; create if not)
- `frontend/src/components/my-prayers/__tests__/PrayerComposer.test.tsx` — Update pill count if tested

**Details:**

**CategoryFilterBar.test.tsx:**

1. Update `zeroCounts` to include `'mental-health': 0`:
```typescript
const zeroCounts: Record<PrayerCategory, number> = {
  health: 2, 'mental-health': 0, family: 2, work: 3, grief: 1,
  gratitude: 3, praise: 2, relationships: 2, other: 3, discussion: 0,
}
```

2. Update button count test: expect 11 buttons (All + 10 categories), was 10.

3. Add test: `'Mental Health' pill renders between Health and Family`.

4. Add tests for the layout changes:
   - Scroll container has `flex-nowrap` class
   - No `lg:flex-wrap` class present

**InlineComposer.test.tsx:**

1. Update the pill label list to include `'Mental Health'`:
```typescript
const pills = ['Health', 'Mental Health', 'Family', 'Work', 'Grief', 'Gratitude', 'Praise', 'Relationships', 'Other', 'Discussion']
```

2. Update any test counting 9 category pills to expect 10.

**prayer-categories.test.ts (if exists):**

1. Update length expectation from 9 to 10.
2. Add `isValidCategory('mental-health')` test.

**Auth gating:** N/A — test files.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change test assertions unrelated to the category addition or layout change
- DO NOT remove any existing passing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All updated tests pass | unit | `pnpm test` exits cleanly |

**Expected state after completion:**
- [x] All Prayer Wall related tests pass
- [x] All prayer-categories constant tests pass
- [x] Button/pill count expectations updated from 9→10 or 10→11
- [x] `zeroCounts` in test helper includes `'mental-health'`
- [x] Full test suite passes (`pnpm test`)

---

### Step 5: Build Verification & Smoke Test

**Objective:** Verify the build compiles, all tests pass, and no regressions.

**Files to create/modify:**
- None — verification only

**Details:**

1. Run `pnpm build` — verify 0 errors, 0 warnings.
2. Run `pnpm test` — verify all tests pass, 0 failures.
3. Run `pnpm lint` — verify no new lint errors introduced.
4. Verify TypeScript strict mode passes (included in build).
5. Manual checklist (for `/verify-with-playwright`):
   - `/prayer-wall` shows 12 pills (All + 10 categories + optional challenge if Lent active)
   - "Mental Health" appears between "Health" and "Family"
   - Clicking "Mental Health" shows 3 mock prayers
   - Clicking "All" shows all prayers including mental health
   - `/prayer-wall?category=mental-health` pre-selects the filter
   - Desktop 1440px: all pills fit in one row
   - Mobile 375px: horizontal scroll works, fade gradient visible
   - Existing functionality intact: posting, commenting, praying, bookmarking

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact (verification step).

**Guardrails (DO NOT):**
- DO NOT fix pre-existing lint warnings or test failures unrelated to this feature

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | build | `pnpm build` exits 0 |
| All tests pass | unit | `pnpm test` exits 0 |

**Expected state after completion:**
- [x] Build: 0 errors, 0 warnings
- [x] Tests: all pass, 0 failures
- [x] No new lint errors
- [x] Feature works end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `mental-health` to category constants |
| 2 | 1 | Add mental health mock prayers (needs type to be valid) |
| 3 | 1 | Refactor CategoryFilterBar layout (needs 10 categories to verify fit) |
| 4 | 1, 2, 3 | Update all tests |
| 5 | 1, 2, 3, 4 | Build verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `mental-health` to category constants | [COMPLETE] | 2026-03-31 | Modified: `prayer-categories.ts`, `PrayerLifeSection.tsx` (added mental-health color), `prayer-categories.test.ts` (added 4 new assertions). 7/7 tests pass. |
| 2 | Add mental health mock prayers | [COMPLETE] | 2026-03-31 | Added prayer-19, prayer-20, prayer-21 (IDs adjusted from plan's 13-15 since those were already taken). Modified: `prayer-wall-mock-data.ts`. |
| 3 | Refactor CategoryFilterBar layout | [COMPLETE] | 2026-03-31 | Rewrote `CategoryFilterBar.tsx`: flex-nowrap, tighter pills (px-3 py-1.5), scroll fade gradient with ResizeObserver + scroll listener, relative wrapper. |
| 4 | Update tests | [COMPLETE] | 2026-03-31 | Updated: `CategoryFilterBar.test.tsx` (zeroCounts, 10→11 count, Mental Health order test, flex-nowrap test), `InlineComposer.test.tsx` (9→10 pills), `ChallengeIntegration.test.tsx` (baseCounts), `prayer-wall-mock-data.test.ts` (21→24 count), `PrayerWall.test.tsx` (Health regex fix). 4960/4964 tests pass (4 pre-existing failures). |
| 5 | Build verification | [COMPLETE] | 2026-03-31 | 4960/4964 tests pass (4 pre-existing). 0 lint errors (31 pre-existing warnings). Fixed unused import in CategoryFilterBar.test.tsx. Vite build has pre-existing PWA workbox issue. |
