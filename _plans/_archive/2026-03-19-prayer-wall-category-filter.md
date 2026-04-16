# Implementation Plan: Prayer Wall Category Filter

**Spec:** `_specs/prayer-wall-category-filter.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/prayer-wall-category-filter`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

**Project structure:**
- Types: `frontend/src/types/prayer-wall.ts` — `PrayerRequest`, `PrayerComment`, `PrayerReaction`, `PrayerWallUser`
- Mock data: `frontend/src/mocks/prayer-wall-mock-data.ts` — 18 mock prayers, 10 users, 35 comments
- Prayer Wall page: `frontend/src/pages/PrayerWall.tsx` — renders hero, inline composer, prayer feed with interaction bars and comments
- Components: `frontend/src/components/prayer-wall/` — `PrayerCard.tsx`, `InlineComposer.tsx`, `PrayerWallHero.tsx`, `InteractionBar.tsx`, `CommentsSection.tsx`, `AuthModalProvider.tsx`, etc.
- Tests: component tests in `__tests__/` subdirectories, page tests in `pages/__tests__/`

**Key patterns:**
- `useSearchParams` from React Router for URL state (used in DailyHub for `?tab=`, Friends for `?tab=`)
- `IntersectionObserver` sentinel pattern for sticky detection (DailyHub line 55-67, Insights line 198-218)
- `scrollbar-none` Tailwind utility used throughout music components for hidden scrollbar horizontal scroll
- Auth gating via `useAuth()` + `useAuthModal()` — composer open triggers auth modal for logged-out users
- Provider wrapping in tests: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`, with `vi.mock('@/hooks/useAuth')` and `vi.mock('@/hooks/useFaithPoints')`
- The Navbar uses `absolute` positioning (`top-0 z-50`) with `transparent` prop on the Prayer Wall page
- Prayer Wall content area: `max-w-[720px]` centered, `px-4 py-6 sm:py-8`
- Prayer cards are `<article>` elements with `rounded-xl border border-gray-200 bg-white p-5 sm:p-6`
- The `PrayerCard` header shows avatar + author name + " — " + timestamp, followed by content body, then `{children}` (where InteractionBar and CommentsSection go), then AnsweredBadge

**Sticky bar pattern (from DailyHub):**
A `sentinelRef` div is placed just above where the bar should stick. An `IntersectionObserver` detects when the sentinel scrolls out of view and sets `isSticky`. The bar uses `sticky top-0 z-40`. The Insights page uses a different approach: `fixed top-0 left-0 right-0` when sticky. For the Prayer Wall filter bar, we'll use the CSS `sticky` approach (like DailyHub) since the Prayer Wall uses `<Navbar transparent />` which is `absolute`, so `sticky top-0` will stick to the viewport top, not below a fixed navbar.

**Important note about Navbar + sticky:** The Navbar is `absolute` (not `fixed` or `sticky`), so it scrolls away with the hero. A `sticky top-0` element will stick to the top of the viewport once scrolled past. This is the correct behavior for this feature.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Select category in composer | Logged-in only (composer already auth-gated) | Step 3 | Existing: composer only opens for authenticated users |
| Click empty state CTA "Share a Prayer Request" | Auth-gated for logged-out | Step 5 | useAuth + openAuthModal("Sign in to share a prayer request") |
| Browse feed with filters | No auth required | Step 4 | N/A — public |
| Click category badge on cards | No auth required | Step 4 | N/A — public |

---

## Design System Values (for UI steps)

Values from design-system.md recon (captured 2026-03-06) and codebase inspection.

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Filter bar frosted glass | background | `bg-hero-mid/90 backdrop-blur-sm` i.e. `rgba(30, 11, 62, 0.9)` | Spec + design-system.md (`hero-mid: #1E0B3E`) |
| Filter bar border | border-bottom | `border-b border-white/10` | Spec |
| Pill unselected (dark bg) | background, border, text | `bg-white/10 border border-white/15 text-white/70 rounded-full` | Spec design references |
| Pill selected (dark bg) | background, border, text | `bg-primary/20 border-primary/40 text-primary-lt rounded-full` i.e. `bg-[#6D28D9]/20 border-[#6D28D9]/40 text-[#8B5CF6]` | Spec + design-system.md |
| Pill unselected (light bg / composer) | background, border, text | `border-gray-200 bg-white text-text-dark` | Codebase inspection (light card context) |
| Pill selected (light bg / composer) | background, border, text | `bg-primary/10 text-primary border-primary/40` | Spec + design-system.md |
| Pill touch target | min-height | `44px` (`min-h-[44px]`) | Spec + 04-frontend-standards.md |
| Pill padding | padding | `px-4 py-2` | design-system.md chip pattern |
| Pill text | font | Inter 14px (`text-sm font-medium`) | design-system.md |
| Pill transition | transition | `transition-colors duration-150 ease-in-out` | Spec (~150ms ease) |
| Category badge on cards | styling | `text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5` | Spec (light card background) |
| Validation message | color | `text-warning` (`#F39C12`) | Spec |
| Prayer Wall main | max-width | `max-w-[720px]` | Codebase: PrayerWall.tsx line 184 |
| Prayer Wall hero gradient | background-image | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | PrayerWallHero.tsx line 14-15 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for hero headings, not Lora
- Prayer Wall hero uses an inline `style` gradient, not the standard inner-page hero
- Prayer Wall cards have NO box-shadow (unlike meditation cards with `shadow-sm`)
- Prayer Wall content max-width is 720px (`max-w-[720px]`), not `max-w-3xl`
- `scrollbar-none` is the existing utility for hidden scrollbars on horizontal scroll rows
- All interactive elements need `min-h-[44px]` for touch targets
- `cn()` from `@/lib/utils` for conditional classnames (clsx + tailwind-merge)
- The `AnsweredBadge` is rendered AFTER `{children}` in `PrayerCard` — the category badge goes in the header area, above content
- Filter bar pills on dark background use `bg-white/10 text-white/70` unselected; composer pills on white card use `border-gray-200 bg-white text-text-dark` unselected

---

## Shared Data Models

```typescript
// New type: PRAYER_CATEGORIES union
export type PrayerCategory = 'health' | 'family' | 'work' | 'grief' | 'gratitude' | 'praise' | 'relationships' | 'other'

// Updated PrayerRequest interface: add category field
export interface PrayerRequest {
  // ... existing fields ...
  category: PrayerCategory
}
```

**localStorage keys this spec touches:** None. Filter state is URL-only (`?category=<slug>`). Category is stored on prayer objects (mock data, not localStorage).

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Filter pills single horizontal scroll row, hidden scrollbar. Composer pills horizontal scroll. Sticky filter bar at `top: 0`. |
| Tablet | 640-1024px | Filter pills may scroll or begin wrapping. Composer pills begin wrapping. |
| Desktop | > 1024px | Filter pills wrap (`flex-wrap`). Composer pills wrap. Content centered at max-w-[720px]. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero section → Filter bar | 0px (filter bar sits directly below hero) | Spec: "below the Prayer Wall hero section" |
| Filter bar → Prayer feed | Standard content padding (`py-6 sm:py-8`) | Codebase: PrayerWall.tsx line 184 |
| Prayer card → Prayer card | `gap-4` (16px) | Codebase: PrayerWall.tsx line 195 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/prayer-wall-category-filter` exists and is checked out
- [ ] All 18 existing mock prayers will be assigned categories with natural distribution
- [ ] The `PrayerRequest` type change is a breaking change — all test fixtures need updating
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified from design-system.md recon (captured 2026-03-06)
- [ ] No [UNVERIFIED] values — all styling from spec design references + recon
- [ ] Prior specs in the sequence are complete and committed (no multi-spec dependency)
- [ ] The `scrollbar-none` Tailwind utility is available in the project (confirmed via AmbientBrowser, ScriptureCollectionRow, etc.)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Invalid `?category=` URL param | Fall back to "All" (no filter) | Spec requirement: "Invalid category values in the URL are ignored" |
| Category on newly submitted prayer | Required field in composer, included in the `PrayerRequest` object | Spec: "Every prayer must have exactly one category" |
| Counts shown on pills | Only when a filter is active (not "All") | Spec: "When 'All' is active, no counts are shown on any pill" |
| Category badge click behavior | Filters the feed in place (URL updates, feed re-renders) | Consistent with pill filter behavior |
| Filter bar z-index | `z-30` (below navbar z-50 and dropdown z-50, above content) | Prevents overlapping navbar dropdowns while staying above card content |
| `onSubmit` signature change | Add `category` parameter: `(content, isAnonymous, category)` | Minimal change to existing interface, keeps it explicit |
| `setSearchParams` replace option | `{ replace: true }` | Avoids polluting browser history with every filter click |
| Category counts source | Computed from full `allPrayers` (not paginated subset) | Ensures correct counts regardless of pagination state |

---

## Implementation Steps

### Step 1: Define Category Constants and Update Types

**Objective:** Add the category type, constants array, display label map, and validation helper. Update `PrayerRequest` interface with required `category` field.

**Files to create/modify:**
- `frontend/src/constants/prayer-categories.ts` — new file with category constants
- `frontend/src/types/prayer-wall.ts` — add `category: PrayerCategory` field to `PrayerRequest`

**Details:**

Create `frontend/src/constants/prayer-categories.ts`:
```typescript
export const PRAYER_CATEGORIES = [
  'health', 'family', 'work', 'grief',
  'gratitude', 'praise', 'relationships', 'other',
] as const

export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<PrayerCategory, string> = {
  health: 'Health',
  family: 'Family',
  work: 'Work',
  grief: 'Grief',
  gratitude: 'Gratitude',
  praise: 'Praise',
  relationships: 'Relationships',
  other: 'Other',
}

export function isValidCategory(value: string | null): value is PrayerCategory {
  return value !== null && PRAYER_CATEGORIES.includes(value as PrayerCategory)
}
```

Update `frontend/src/types/prayer-wall.ts`:
- Import `PrayerCategory` from `@/constants/prayer-categories`
- Add `category: PrayerCategory` to the `PrayerRequest` interface, placed after `content`

**Guardrails (DO NOT):**
- DO NOT use an enum — use a const array + union type for better DX
- DO NOT add optional `category?: PrayerCategory` — it is required per spec

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `isValidCategory` returns true for all 8 slugs | unit | Test each valid category string |
| `isValidCategory` returns false for invalid strings | unit | Test `null`, `""`, `"invalid"`, `"HEALTH"` (case-sensitive) |
| `CATEGORY_LABELS` has entry for every category | unit | Verify keys match `PRAYER_CATEGORIES` |

**Expected state after completion:**
- [ ] `PrayerCategory` type exported from constants
- [ ] `PrayerRequest` interface has `category: PrayerCategory` field
- [ ] Validation helper `isValidCategory` exported
- [ ] TypeScript will show errors everywhere a `PrayerRequest` is constructed without `category` — this is expected and will be fixed in Step 2

---

### Step 2: Update Mock Data and Test Fixtures

**Objective:** Add `category` field to all 18 mock prayers with natural distribution, and update all test fixtures that construct `PrayerRequest` objects.

**Files to modify:**
- `frontend/src/mocks/prayer-wall-mock-data.ts` — add `category` to all 18 MOCK_PRAYERS
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add `category` to `SHORT_PRAYER`, `LONG_PRAYER`, `ANONYMOUS_PRAYER`, `ANSWERED_PRAYER`
- `frontend/src/components/prayer-wall/__tests__/InteractionBar.test.tsx` — add `category` to any test prayer fixtures
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — likely no changes (uses `getMockPrayers()`)
- Any other test files that construct `PrayerRequest` objects — find with: `grep -r "PrayerRequest" --include="*.test.tsx"`

**Details:**

Category distribution across 18 mock prayers (natural feel — more Health/Family/Relationships, fewer Praise/Other):

| Prayer ID | Content Theme | Category |
|-----------|--------------|----------|
| prayer-1 | Sarah's mother cancer | `health` |
| prayer-2 | Church pastor transition | `other` |
| prayer-3 | Anonymous addiction | `health` |
| prayer-4 | Emily's finals | `work` |
| prayer-5 | James's daughter infertility answered | `praise` |
| prayer-6 | Rachel's student lost parent | `grief` |
| prayer-7 | Michael's new job | `work` |
| prayer-8 | Grace's husband lost job | `family` |
| prayer-9 | Daniel disconnected from God | `other` |
| prayer-10 | Maria's grandchildren gratitude | `gratitude` |
| prayer-11 | Anonymous marriage | `relationships` |
| prayer-12 | Sarah's son college answered | `praise` |
| prayer-13 | David's worship team | `work` |
| prayer-14 | Rachel grateful for community | `gratitude` |
| prayer-15 | Emily's roommate hard time | `relationships` |
| prayer-16 | Grace's husband answered | `family` |
| prayer-17 | James persecuted church | `other` |
| prayer-18 | Michael baptized | `gratitude` |

Distribution: Health 2, Family 2, Work 3, Grief 1, Gratitude 3, Praise 2, Relationships 2, Other 3.

For test fixtures, add `category: 'health'` (or appropriate) to every `PrayerRequest` literal.

**Guardrails (DO NOT):**
- DO NOT change the content of any prayer — only add the `category` field
- DO NOT change test assertions — only add `category` to fixtures to fix type errors
- DO NOT skip any test file that constructs a `PrayerRequest` — find all with grep

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All mock prayers have a category | unit | Verify `getMockPrayers().every(p => isValidCategory(p.category))` |
| All 8 categories represented | unit | Verify at least 6 of 8 categories represented in mock data |
| Existing tests still pass | integration | Run full test suite — no regressions |

**Expected state after completion:**
- [ ] All 18 mock prayers have a `category` field
- [ ] All test fixtures that construct `PrayerRequest` have `category`
- [ ] All existing tests pass without modification to assertions
- [ ] No TypeScript errors in mock data or test files

---

### Step 3: Add Category Selector to InlineComposer

**Objective:** Add a row of 8 category pills to the composer, below the textarea and above the anonymous checkbox. Category selection is required for submission. Update the `onSubmit` callback to include the category.

**Files to modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — add category pills, validation, update onSubmit signature
- `frontend/src/pages/PrayerWall.tsx` — update `handleComposerSubmit` to accept and use `category` parameter
- `frontend/src/components/prayer-wall/__tests__/InlineComposer.test.tsx` — add tests for category selection and validation

**Details:**

In `InlineComposer.tsx`:
- Add state: `const [selectedCategory, setSelectedCategory] = useState<PrayerCategory | null>(null)`
- Add validation state: `const [showCategoryError, setShowCategoryError] = useState(false)`
- Import `PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory` from `@/constants/prayer-categories`
- Update props interface: `onSubmit: (content: string, isAnonymous: boolean, category: PrayerCategory) => void`
- In `handleSubmit`: if `!selectedCategory`, set `setShowCategoryError(true)` and return early (before crisis check)
- When a category is selected, clear the error: `setShowCategoryError(false)`
- On cancel/reset, clear: `setSelectedCategory(null)`, `setShowCategoryError(false)`
- In onSubmit call: `onSubmit(content.trim(), isAnonymous, selectedCategory)`

Category pill row JSX (placed below textarea, above anonymous checkbox label):
```tsx
<fieldset className="mt-3">
  <legend className="mb-2 text-sm font-medium text-text-dark">Category</legend>
  <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-none lg:flex-wrap">
    {PRAYER_CATEGORIES.map((cat) => (
      <button
        key={cat}
        type="button"
        onClick={() => { setSelectedCategory(cat); setShowCategoryError(false) }}
        className={cn(
          'min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-in-out whitespace-nowrap',
          selectedCategory === cat
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-gray-200 bg-white text-text-dark hover:bg-gray-50',
        )}
        aria-pressed={selectedCategory === cat}
      >
        {CATEGORY_LABELS[cat]}
      </button>
    ))}
  </div>
  {showCategoryError && (
    <p className="mt-2 text-sm text-warning" role="alert">
      Please choose a category
    </p>
  )}
</fieldset>
```

Note: Composer pills are on a WHITE card background, so they use the light chip pattern (`border-gray-200 bg-white text-text-dark`), not the dark-background pill pattern. The selected state uses `bg-primary/10 text-primary border-primary/40` on light background.

In `PrayerWall.tsx`, update `handleComposerSubmit`:
```typescript
const handleComposerSubmit = useCallback(
  (content: string, isAnonymous: boolean, category: PrayerCategory) => {
    // ...existing logic...
    const newPrayer: PrayerRequest = {
      // ...existing fields...
      category,
    }
    // ...rest unchanged...
  },
  [user, isAuthenticated, showToast],
)
```

**Responsive behavior:**
- Mobile (< 640px): Pills in a single-row horizontal scroll with `scrollbar-none`. Use `flex-nowrap overflow-x-auto` on mobile, `flex-wrap` on lg+.
- Tablet (640-1024px): Pills begin to wrap.
- Desktop (> 1024px): Pills wrap within the composer card.

**Guardrails (DO NOT):**
- DO NOT remove the existing anonymous checkbox or textarea
- DO NOT change the crisis detection logic
- DO NOT make category optional — it is required per spec
- DO NOT use radio inputs — use button pills with `aria-pressed` for better UX

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders 8 category pills when open | unit | All 8 category labels visible |
| Selecting a pill highlights it (aria-pressed) | unit | Click "Health", verify `aria-pressed="true"` |
| Only one pill can be selected at a time | unit | Click "Health", then "Grief" — only "Grief" has `aria-pressed="true"` |
| Submit without category shows validation error | unit | Type text, click submit — "Please choose a category" visible |
| Submit with category calls onSubmit with category | unit | Type text, select "Health", click submit — `onSubmit("text", false, "health")` |
| Validation error clears when category selected | unit | Show error, then click a pill — error disappears |
| Cancel resets category selection | unit | Select "Health", cancel — no pill selected |

**Expected state after completion:**
- [ ] Composer shows 8 category pills below textarea
- [ ] Category is required for submission with inline validation
- [ ] `onSubmit` callback includes category parameter
- [ ] New prayers created via composer have a `category` field
- [ ] All existing + new tests pass

---

### Step 4: Build CategoryFilterBar Component and Integrate into Prayer Wall Page

**Objective:** Create a standalone `CategoryFilterBar` component that shows "All" + 8 category pills, reads/writes `?category=` URL param, and filters the prayer feed. Integrate into the Prayer Wall page between the hero and the feed. Add sticky behavior.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — new component
- `frontend/src/pages/PrayerWall.tsx` — integrate filter bar, add filtering logic, add `useSearchParams`, add sticky sentinel
- `frontend/src/components/prayer-wall/__tests__/CategoryFilterBar.test.tsx` — new test file

**Details:**

**CategoryFilterBar component:**

Props:
```typescript
interface CategoryFilterBarProps {
  activeCategory: PrayerCategory | null  // null = "All"
  onSelectCategory: (category: PrayerCategory | null) => void
  categoryCounts: Record<PrayerCategory, number>
  showCounts: boolean  // true when a filter is active
}
```

JSX structure:
```tsx
<div
  role="toolbar"
  aria-label="Filter prayers by category"
  className="w-full border-b border-white/10 bg-hero-mid/90 backdrop-blur-sm"
>
  <div className="mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 py-3 scrollbar-none lg:flex-wrap lg:overflow-visible">
    {/* "All" pill */}
    <button
      type="button"
      onClick={() => onSelectCategory(null)}
      className={cn(
        'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
        activeCategory === null
          ? 'border-primary/40 bg-primary/20 text-primary-lt'
          : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
      )}
      aria-pressed={activeCategory === null}
    >
      All
    </button>
    {/* Category pills */}
    {PRAYER_CATEGORIES.map((cat) => (
      <button
        key={cat}
        type="button"
        onClick={() => onSelectCategory(cat)}
        className={cn(
          'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
          activeCategory === cat
            ? 'border-primary/40 bg-primary/20 text-primary-lt'
            : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
        )}
        aria-pressed={activeCategory === cat}
      >
        {CATEGORY_LABELS[cat]}
        {showCounts && ` (${categoryCounts[cat]})`}
      </button>
    ))}
  </div>
</div>
```

**PrayerWall.tsx integration:**

Add imports and state:
```typescript
import { useSearchParams } from 'react-router-dom'
import { isValidCategory, PRAYER_CATEGORIES, type PrayerCategory } from '@/constants/prayer-categories'
import { CategoryFilterBar } from '@/components/prayer-wall/CategoryFilterBar'
```

Inside `PrayerWallContent`:
```typescript
const [searchParams, setSearchParams] = useSearchParams()
const rawCategory = searchParams.get('category')
const activeCategory: PrayerCategory | null = isValidCategory(rawCategory) ? rawCategory : null
```

Filter prayers:
```typescript
const filteredPrayers = useMemo(() => {
  if (!activeCategory) return prayers
  return prayers.filter(p => p.category === activeCategory)
}, [prayers, activeCategory])
```

Compute category counts (from `allPrayers`, not paginated subset):
```typescript
const categoryCounts = useMemo(() => {
  const counts = {} as Record<PrayerCategory, number>
  for (const cat of PRAYER_CATEGORIES) counts[cat] = 0
  for (const p of allPrayers) counts[p.category]++
  return counts
}, [allPrayers])
```

Handle category selection:
```typescript
const handleSelectCategory = useCallback(
  (category: PrayerCategory | null) => {
    if (category) {
      setSearchParams({ category }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  },
  [setSearchParams],
)
```

Sticky sentinel pattern (following DailyHub):
```typescript
const filterSentinelRef = useRef<HTMLDivElement>(null)
const [isFilterSticky, setIsFilterSticky] = useState(false)

useEffect(() => {
  const sentinel = filterSentinelRef.current
  if (!sentinel) return
  const observer = new IntersectionObserver(
    ([entry]) => setIsFilterSticky(!entry.isIntersecting),
    { threshold: 0 },
  )
  observer.observe(sentinel)
  return () => observer.disconnect()
}, [])
```

Layout in JSX:
```tsx
<PrayerWallHero action={...} />

{/* Sentinel for sticky filter bar */}
<div ref={filterSentinelRef} aria-hidden="true" />

{/* Filter Bar */}
<div className={cn(
  'sticky top-0 z-30 transition-shadow',
  isFilterSticky && 'shadow-md',
)}>
  <CategoryFilterBar
    activeCategory={activeCategory}
    onSelectCategory={handleSelectCategory}
    categoryCounts={categoryCounts}
    showCounts={activeCategory !== null}
  />
</div>

<main id="main-content" className="mx-auto max-w-[720px] flex-1 px-4 py-6 sm:py-8">
  {/* Inline Composer */}
  ...
  {/* Filtered prayer cards feed */}
  <div className="flex flex-col gap-4">
    {filteredPrayers.map(...)}
  </div>
  ...
</main>
```

Render `filteredPrayers` instead of `prayers` in the feed.

Add a visually hidden `aria-live` region for filter changes:
```tsx
<div className="sr-only" aria-live="polite">
  {activeCategory
    ? `Showing ${filteredPrayers.length} ${CATEGORY_LABELS[activeCategory]} prayers`
    : `Showing all ${prayers.length} prayers`}
</div>
```

**Responsive behavior:**
- Mobile (< 640px): Pills horizontal scroll with `scrollbar-none`, `overflow-x-auto`. No `flex-wrap`.
- Tablet (640-1024px): Same horizontal scroll or natural wrapping as space allows.
- Desktop (> 1024px): `lg:flex-wrap lg:overflow-visible` — pills wrap to multiple rows.

**Guardrails (DO NOT):**
- DO NOT add a fixed position filter bar (use `sticky`, not `fixed`) — the DailyHub pattern is the reference
- DO NOT use `router.push` or `navigate` — use `setSearchParams` with `{ replace: true }` to avoid polluting browser history
- DO NOT show counts when "All" is selected
- DO NOT break the existing composer toggle or comment expansion

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "All" pill and 8 category pills | unit | 9 buttons total in the toolbar |
| "All" is selected by default (no query param) | integration | `aria-pressed="true"` on "All" |
| Clicking a category pill calls onSelectCategory | unit | Click "Health" → callback called with `"health"` |
| Clicking "All" calls onSelectCategory(null) | unit | Click "All" → callback called with `null` |
| Active pill has selected styling | unit | Check className contains `bg-primary/20` |
| Counts shown when showCounts is true | unit | "Health (2)" visible |
| Counts NOT shown when showCounts is false | unit | "Health" with no parenthetical |
| Filter bar has toolbar role | unit | `role="toolbar"` present |
| Pills are keyboard-navigable | unit | Tab focuses pills, Enter activates |
| Screen reader announces filter state | integration | `aria-live` region updates |

**Expected state after completion:**
- [ ] Filter bar renders between hero and feed
- [ ] Clicking a category filters the feed
- [ ] URL updates with `?category=<slug>`
- [ ] Visiting `/prayer-wall?category=health` pre-selects filter
- [ ] Invalid `?category=` falls back to "All"
- [ ] Filter bar sticks below navbar on scroll
- [ ] Counts appear on pills when a filter is active
- [ ] All tests pass

---

### Step 5: Add Empty State for Filtered Views and Category Badge on Prayer Cards

**Objective:** Show a centered empty state when a filtered category has no results. Add a small category badge to each prayer card below the author/timestamp line. Badge click filters the feed.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` — new component
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add CategoryBadge to header
- `frontend/src/pages/PrayerWall.tsx` — add empty state, pass onCategoryClick to PrayerCard
- `frontend/src/components/prayer-wall/__tests__/CategoryBadge.test.tsx` — new test file
- `frontend/src/components/prayer-wall/__tests__/PrayerCard.test.tsx` — add tests for badge

**Details:**

**CategoryBadge component:**
```tsx
interface CategoryBadgeProps {
  category: PrayerCategory
  onClick?: (category: PrayerCategory) => void
}

export function CategoryBadge({ category, onClick }: CategoryBadgeProps) {
  const label = CATEGORY_LABELS[category]

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(category)}
        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        aria-label={`Filter by ${label}`}
      >
        {label}
      </button>
    )
  }

  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
      {label}
    </span>
  )
}
```

**PrayerCard update:**

Add `onCategoryClick?: (category: PrayerCategory) => void` to `PrayerCardProps`.

In the header, after the timestamp `<time>` element, add:
```tsx
{prayer.category && (
  <div className="mt-1">
    <CategoryBadge
      category={prayer.category}
      onClick={onCategoryClick}
    />
  </div>
)}
```

This goes inside the header `<div>` block, after the author name + timestamp line.

**Empty state in PrayerWall.tsx:**

After the filtered prayer cards, if `filteredPrayers.length === 0 && activeCategory !== null`:
```tsx
{filteredPrayers.length === 0 && activeCategory && (
  <div className="flex flex-col items-center py-16 text-center">
    <p className="mb-4 text-lg text-text-light">
      No prayers in this category yet. Be the first to share.
    </p>
    <button
      type="button"
      onClick={() => {
        if (isAuthenticated) {
          setComposerOpen(true)
        } else {
          openAuthModal?.('Sign in to share a prayer request')
        }
      }}
      className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
    >
      Share a Prayer Request
    </button>
  </div>
)}
```

Pass `handleSelectCategory` to each PrayerCard so badge clicks can filter:
```tsx
<PrayerCard
  key={prayer.id}
  prayer={prayer}
  onCategoryClick={handleSelectCategory}
>
  ...
</PrayerCard>
```

**Auth gating:**
- Empty state CTA: auth-gated. If logged out, calls `openAuthModal?.('Sign in to share a prayer request')`. If logged in, opens composer.

**Responsive behavior:**
- Badge: same size and position at all breakpoints (small pill, does not change layout)
- Empty state: centered text, full width. Same at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT show empty state when "All" is selected and there are no prayers at all — that's a different empty state
- DO NOT change the AnsweredBadge styling or positioning
- DO NOT make the badge clickable on PrayerDetail page — pass `onCategoryClick` only from PrayerWall page. PrayerDetail renders badge without onClick.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CategoryBadge renders label text | unit | "Health" visible for `category="health"` |
| CategoryBadge with onClick renders as button | unit | Role is `button`, aria-label includes category |
| CategoryBadge without onClick renders as span | unit | No button role |
| PrayerCard renders category badge | unit | Add `category: 'health'` to fixture, verify "Health" badge visible |
| Badge click calls onCategoryClick | unit | Click badge → callback with `'health'` |
| Empty state shows when filtered results empty | integration | Filter by a category with 0 results → "No prayers in this category yet" |
| Empty state CTA opens composer for logged-in | integration | Mock auth, click CTA → composer opens |
| Empty state CTA opens auth modal for logged-out | integration | Mock no auth, click CTA → auth modal opened with correct message |

**Expected state after completion:**
- [ ] Every prayer card shows a category badge below author/timestamp
- [ ] Badge click filters the feed to that category
- [ ] Empty filtered view shows message + CTA
- [ ] CTA is auth-gated appropriately
- [ ] PrayerDetail page shows badge but without click handler
- [ ] All tests pass

---

### Step 6: Update PrayerDetail and PrayerWallProfile Pages, Integration Tests

**Objective:** Ensure `PrayerDetail` and `PrayerWallProfile` pages correctly display the category badge on prayer cards without breaking. Add integration tests for the full filter flow on the Prayer Wall page.

**Files to modify:**
- `frontend/src/pages/PrayerDetail.tsx` — ensure PrayerCard renders with badge (no onClick)
- `frontend/src/pages/PrayerWallProfile.tsx` — ensure PrayerCard renders with badge (no onClick)
- `frontend/src/pages/__tests__/PrayerWall.test.tsx` — add filter integration tests

**Details:**

In `PrayerDetail.tsx`: `PrayerCard` is already used with `showFull`. Since `onCategoryClick` is optional, no change is needed — the badge will render as a `<span>` (non-interactive) by default.

In `PrayerWallProfile.tsx`: Same — `PrayerCard` used without `onCategoryClick`, badge renders non-interactive.

Update the main Prayer Wall page test (`PrayerWall.test.tsx`) to:
1. Test that filter bar is rendered
2. Test that clicking a filter pill filters the feed (check article count changes)
3. Test URL query param integration

**Guardrails (DO NOT):**
- DO NOT add filtering to PrayerDetail or PrayerWallProfile
- DO NOT change any logic in these pages beyond what's needed for the new `category` prop

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWall renders filter bar | integration | Filter toolbar is present |
| Clicking a filter pill reduces visible prayer cards | integration | Click "Health" → fewer articles than "All" |
| Filter bar pills include "All" | integration | "All" button present |
| PrayerWall page: URL param pre-selects filter | integration | Render with `initialEntries={['/prayer-wall?category=health']}` → "Health" pill has `aria-pressed="true"` |

**Expected state after completion:**
- [ ] PrayerDetail shows category badge (non-interactive)
- [ ] PrayerWallProfile shows category badge (non-interactive)
- [ ] PrayerWall page integration tests cover filtering
- [ ] All existing tests still pass
- [ ] Full feature is functional end-to-end

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Define category constants and update types |
| 2 | 1 | Update mock data and test fixtures with category field |
| 3 | 1, 2 | Add category selector to InlineComposer |
| 4 | 1, 2 | Build CategoryFilterBar and integrate into PrayerWall page |
| 5 | 1, 2, 4 | Add empty state for filtered views and category badge on cards |
| 6 | 2, 5 | Update PrayerDetail/PrayerWallProfile, integration tests |

Note: Steps 3 and 4 can be done in parallel after Step 2, but Step 5 depends on Step 4 (needs the filter state handler for badge clicks).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Define Category Constants and Update Types | [COMPLETE] | 2026-03-19 | Created `constants/prayer-categories.ts` (type, labels, validator). Added `category: PrayerCategory` to `PrayerRequest` in `types/prayer-wall.ts`. Tests in `constants/__tests__/prayer-categories.test.ts` (3 passing). |
| 2 | Update Mock Data and Test Fixtures | [COMPLETE] | 2026-03-19 | Added `category` to all 18 mock prayers, test fixtures in PrayerCard.test.tsx, InteractionBar.test.tsx, and PrayerWall.tsx handleComposerSubmit. All 71 prayer wall tests pass. |
| 3 | Add Category Selector to InlineComposer | [COMPLETE] | 2026-03-19 | Updated InlineComposer with 8 category pills (fieldset/legend, aria-pressed, validation). Updated onSubmit signature to include category. Updated PrayerWall.tsx handleComposerSubmit. 14 InlineComposer tests pass (7 new). Bumped max-h to 800px for expanded composer. |
| 4 | Build CategoryFilterBar and Integrate | [COMPLETE] | 2026-03-19 | Created `CategoryFilterBar.tsx`. Integrated into PrayerWall.tsx with useSearchParams, filtering logic, sticky sentinel, aria-live region. 9 CategoryFilterBar tests + 6 PrayerWall tests pass. Build succeeds. |
| 5 | Add Empty State and Category Badge | [COMPLETE] | 2026-03-19 | Created `CategoryBadge.tsx`. Added badge to PrayerCard header (after timestamp). Added empty state with auth-gated CTA. Passed `onCategoryClick` to PrayerCard from PrayerWall. 4 CategoryBadge tests + 3 new PrayerCard tests pass. |
| 6 | Update PrayerDetail/Profile, Integration Tests | [COMPLETE] | 2026-03-19 | PrayerDetail and PrayerWallProfile need no changes — badge renders as non-interactive span by default. Added 4 integration tests to PrayerWall.test.tsx (filter bar renders, click filters feed, "All" selected by default, URL param pre-selects). All 97 prayer wall tests pass. |
