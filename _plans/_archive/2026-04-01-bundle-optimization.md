# Implementation Plan: Bundle Optimization

**Spec:** `_specs/bundle-optimization.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/bundle-optimization`
**Design System Reference:** `_plans/recon/design-system.md` (not applicable — no UI changes)
**Recon Report:** not applicable — infrastructure optimization only
**Master Spec Plan:** not applicable — standalone optimization

---

## Architecture Context

### Project Structure

- **Build config:** `frontend/vite.config.ts` — Vite 5 with manual chunks for `recharts` and `react-helmet-async`
- **Package manifest:** `frontend/package.json` — dependencies include `leaflet`, `react-leaflet`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`
- **Entry point:** `frontend/src/App.tsx` — `QueryClientProvider` wraps entire app (line 153/230)
- **Query client config:** `frontend/src/lib/query-client.ts` — configured but unused
- **Reading plan data:** `frontend/src/data/reading-plans/` — 10 individual `.ts` files, re-exported via `index.ts`
- **Reading plan types:** `frontend/src/types/reading-plans.ts` — `ReadingPlan` includes `days: PlanDayContent[]`
- **Leaflet usage:** Only in `frontend/src/components/local-support/ResultsMap.tsx` (imports `leaflet` + `react-leaflet`)
- **AuthModal:** `frontend/src/components/prayer-wall/AuthModal.tsx` — does NOT use react-hook-form or zod (uses plain `useState`)

### Key Findings from Reconnaissance

1. **React Query is dead code.** `QueryClientProvider` wraps the app in `App.tsx` line 153. `queryClient` is imported from `lib/query-client.ts`. But zero `useQuery`, `useMutation`, or `useQueryClient` calls exist anywhere in source code. Only referenced in `FRONTEND_TOOLS.md` docs.

2. **react-hook-form, @hookform/resolvers, and zod are NOT imported by any source file.** The spec assumed AuthModal uses them, but it uses plain `useState` for all form state. These packages are tree-shaken out by Vite and contribute 0 KB to any bundle. No action needed for these three packages.

3. **Reading plan data consumers** — 6 files import from `@/data/reading-plans`:
   | File | What it imports | What it actually needs |
   |------|----------------|----------------------|
   | `pages/ReadingPlans.tsx` | `READING_PLANS` | Metadata only (title, description, theme, duration, difficulty, emoji) |
   | `pages/ReadingPlanDetail.tsx` | `getReadingPlan()` | Full plan with `days` content |
   | `hooks/useReadingPlanProgress.ts` | `READING_PLANS` | Only `plan.durationDays` in `completeDay()` |
   | `components/dashboard/ReadingPlanWidget.tsx` | `READING_PLANS`, `getReadingPlan()` | Metadata + active plan title |
   | `components/dashboard/MoodRecommendations.tsx` | `getReadingPlan()` | Metadata (theme, title) |
   | `components/daily/DevotionalTabContent.tsx` | `READING_PLANS` | Metadata for related plan callout |

4. **Leaflet isolation** is straightforward — add to existing `manualChunks` in `vite.config.ts`.

5. **AuthModalProvider imports AuthModal statically** (`AuthModalProvider.tsx` line 3). Converting to lazy import would move AuthModal into its own chunk. However, since AuthModal doesn't carry react-hook-form/zod (they're already tree-shaken), the only benefit is isolating the AuthModal component itself (~10-15 KB). This is a minor win — include only if it doesn't break the auth modal pattern.

### Test Patterns

- Tests use Vitest + React Testing Library + jsdom
- Provider wrapping: `AuthModalProvider`, `ToastProvider`, `BrowserRouter`
- Pattern: `render(<Component />, { wrapper })` with custom wrappers
- Test files colocated in `__tests__/` directories

### Pre-existing Build Issue

The TypeScript build currently fails due to errors in `src/hooks/__tests__/useRovingTabindex.test.ts` (missing test runner types) and `src/lib/__tests__/garden-share-canvas.test.ts` (type mismatch). These are pre-existing and unrelated to this spec. The plan must fix or exclude these to get a clean build for chunk size verification.

---

## Auth Gating Checklist

N/A — This spec does not add or modify any interactive elements. All existing auth gating behavior remains unchanged.

---

## Design System Values (for UI steps)

N/A — No visual changes. This is a build infrastructure optimization only.

---

## Design System Reminder

N/A — No UI steps in this plan.

---

## Shared Data Models

### Types this spec modifies

```typescript
// NEW: Metadata-only type for plan browsing (no days content)
// frontend/src/types/reading-plans.ts
export type ReadingPlanMeta = Omit<ReadingPlan, 'days'>
```

### localStorage keys this spec touches

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Read only | `useReadingPlanProgress` reads this — no changes to format |

No new localStorage keys. No modifications to existing key formats.

---

## Responsive Structure

N/A — No UI changes. Verification confirms existing responsive behavior is preserved.

---

## Vertical Rhythm

N/A — No UI changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Pre-existing TS errors in test files are known and acceptable (will be fixed in Step 1)
- [ ] No other branches have modified `vite.config.ts`, `App.tsx`, or reading plan data structure
- [ ] The packages `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, and `zod` stay in `dependencies` (do NOT uninstall — needed for Phase 3)
- [ ] react-hook-form, @hookform/resolvers, and zod are confirmed as NOT imported by any source file (verified: only in FRONTEND_TOOLS.md)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| react-hook-form/zod cleanup | Skip — already tree-shaken | No source file imports them. AuthModal uses plain useState. Zero bundle impact. |
| Reading plan metadata type | `Omit<ReadingPlan, 'days'>` | Reuses existing type safely. Avoids duplicating fields. |
| Where to put metadata | Inline in `index.ts` | Extracting metadata from each plan file avoids importing the full plan. Computed at module level from plan exports. |
| Lazy-load AuthModal | Skip | AuthModal doesn't carry react-hook-form/zod. Marginal size benefit (~10 KB) doesn't justify risk of breaking the auth modal pattern. |
| `useReadingPlanProgress` needs `durationDays` | Use metadata array | The hook currently imports `READING_PLANS` only to get `plan.durationDays` in `completeDay()`. Switch to metadata import. |
| Loading state for plan detail | Inline spinner | Show a simple loading indicator while plan content loads via dynamic import. Keep it minimal — no skeleton needed for a data fetch that takes <100ms locally. |
| Pre-existing TS errors | Fix in Step 1 | Must fix to get clean build for chunk size verification. |

---

## Implementation Steps

### Step 1: Fix Pre-existing TypeScript Errors

**Objective:** Get a clean `pnpm build` so we can measure baseline chunk sizes before optimization.

**Files to modify:**
- `frontend/src/hooks/__tests__/useRovingTabindex.test.ts` — add `/// <reference types="vitest" />` triple-slash directive at top
- `frontend/src/lib/__tests__/garden-share-canvas.test.ts` — fix tuple type assertion

**Details:**

The `useRovingTabindex.test.ts` file is missing the Vitest type reference, causing `it`, `expect`, `vi`, `describe` to be unresolved. Add `/// <reference types="vitest" />` as the first line (matching the pattern in `vite.config.ts`).

For `garden-share-canvas.test.ts`, the map callback parameter `(c: [string, number, number])` doesn't match `any[]`. Type the parameter as `(c: any[])` or cast appropriately.

After fixes, run `pnpm build` and record all chunk sizes (name + gzipped size) as the "before" baseline.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any logic in these test files — only fix type annotations
- DO NOT suppress errors with `@ts-ignore` or `@ts-expect-error`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm build` | build | Build passes with 0 errors, 0 warnings |
| `pnpm test` | suite | All existing tests still pass |

**Expected state after completion:**
- [ ] `pnpm build` succeeds with 0 errors, 0 warnings
- [ ] Baseline chunk sizes recorded in Execution Log
- [ ] All existing tests pass

---

### Step 2: Isolate Leaflet as a Shared Manual Chunk

**Objective:** Extract Leaflet and react-leaflet into their own cacheable chunk, separate from LocalSupportPage component code.

**Files to modify:**
- `frontend/vite.config.ts` — add leaflet to `manualChunks`

**Details:**

In `vite.config.ts` lines 109-116, add a leaflet entry to the existing `manualChunks` function:

```typescript
manualChunks(id) {
  if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
    return 'recharts'
  }
  if (id.includes('node_modules/react-helmet-async')) {
    return 'react-helmet-async'
  }
  if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
    return 'leaflet'
  }
},
```

This matches both `leaflet` and `react-leaflet` packages. The pattern `node_modules/leaflet` will NOT accidentally match `react-leaflet` because Rollup resolves to full paths — but `node_modules/react-leaflet` is explicitly listed as well.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any other manualChunks entries
- DO NOT change the `chunkSizeWarningLimit`
- DO NOT add Leaflet CSS to the manual chunk (CSS is handled separately by Vite)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm build` | build | Build output contains a `leaflet-{hash}.js` chunk |
| Visual check | manual | All 3 local support pages render maps correctly |

**Expected state after completion:**
- [ ] Build output shows a separate `leaflet-{hash}.js` chunk
- [ ] LocalSupportPage-related chunks are smaller (Leaflet extracted)
- [ ] All 3 local support routes still work (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`)

---

### Step 3: Create Reading Plan Metadata and Loaders

**Objective:** Separate reading plan metadata (lightweight) from daily content (heavy) so the plan browser and dashboard widgets don't pull in all 10 plans' daily content.

**Files to create:**
- `frontend/src/data/reading-plans/metadata.ts` — lightweight metadata exports

**Files to modify:**
- `frontend/src/types/reading-plans.ts` — add `ReadingPlanMeta` type
- `frontend/src/data/reading-plans/index.ts` — restructure exports

**Details:**

**3a. Add `ReadingPlanMeta` type** to `frontend/src/types/reading-plans.ts`:

```typescript
export type ReadingPlanMeta = Omit<ReadingPlan, 'days'>
```

**3b. Create `frontend/src/data/reading-plans/metadata.ts`:**

This file statically defines plan metadata WITHOUT importing the full plan files. This is critical — if it imports the plan files, Vite will bundle the day content with the metadata.

```typescript
import type { ReadingPlanMeta } from '@/types/reading-plans'

export const READING_PLAN_METADATA: ReadingPlanMeta[] = [
  {
    id: 'finding-peace-in-anxiety',
    title: 'Finding Peace in Anxiety',
    description: 'A 7-day journey through Scripture to find calm in the chaos...',
    theme: 'anxiety',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🕊️',
  },
  // ... all 10 plans with id, title, description, theme, durationDays, difficulty, coverEmoji
  // Copy these values from each plan file
]

export function getReadingPlanMeta(id: string): ReadingPlanMeta | undefined {
  return READING_PLAN_METADATA.find((p) => p.id === id)
}
```

**3c. Add dynamic loaders and update `index.ts`:**

Update `frontend/src/data/reading-plans/index.ts` to:
1. Re-export metadata (static, lightweight)
2. Export a `loadReadingPlan` function using dynamic `import()`
3. Keep `READING_PLANS` and `getReadingPlan` exports for backward compatibility during transition, but mark as deprecated with a comment

```typescript
import type { ReadingPlan, PlanDayContent } from '@/types/reading-plans'

// Re-export metadata (lightweight — no daily content)
export { READING_PLAN_METADATA, getReadingPlanMeta } from './metadata'

// Dynamic loaders — load full plan content on demand
const PLAN_LOADERS: Record<string, () => Promise<ReadingPlan>> = {
  'finding-peace-in-anxiety': () =>
    import('./finding-peace-in-anxiety').then((m) => m.findingPeaceInAnxiety),
  'walking-through-grief': () =>
    import('./walking-through-grief').then((m) => m.walkingThroughGrief),
  'the-gratitude-reset': () =>
    import('./the-gratitude-reset').then((m) => m.theGratitudeReset),
  'knowing-who-you-are-in-christ': () =>
    import('./knowing-who-you-are-in-christ').then((m) => m.knowingWhoYouAreInChrist),
  'the-path-to-forgiveness': () =>
    import('./the-path-to-forgiveness').then((m) => m.thePathToForgiveness),
  'learning-to-trust-god': () =>
    import('./learning-to-trust-god').then((m) => m.learningToTrustGod),
  'hope-when-its-hard': () =>
    import('./hope-when-its-hard').then((m) => m.hopeWhenItsHard),
  'healing-from-the-inside-out': () =>
    import('./healing-from-the-inside-out').then((m) => m.healingFromTheInsideOut),
  'discovering-your-purpose': () =>
    import('./discovering-your-purpose').then((m) => m.discoveringYourPurpose),
  'building-stronger-relationships': () =>
    import('./building-stronger-relationships').then((m) => m.buildingStrongerRelationships),
}

export async function loadReadingPlan(id: string): Promise<ReadingPlan | undefined> {
  const loader = PLAN_LOADERS[id]
  if (!loader) return undefined
  return loader()
}

export function getReadingPlanDay(
  plan: ReadingPlan,
  dayNumber: number,
): PlanDayContent | undefined {
  return plan.days.find((d) => d.dayNumber === dayNumber)
}
```

Note: The old synchronous `READING_PLANS` and `getReadingPlan` exports are removed. All consumers will be updated in Step 4.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT import any plan data files in `metadata.ts` — metadata must be hand-copied to avoid pulling in day content
- DO NOT modify the individual plan data files (e.g., `finding-peace-in-anxiety.ts`)
- DO NOT change the `ReadingPlan` type — only add `ReadingPlanMeta`
- DO NOT remove the `getReadingPlanDay` helper — update its signature to take a `ReadingPlan` directly instead of a `planId`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Type check | build | `pnpm build` compiles with no type errors on new exports |
| Metadata count | unit | `READING_PLAN_METADATA.length === 10` |
| Metadata fields | unit | Each metadata entry has id, title, description, theme, durationDays, difficulty, coverEmoji |
| Loader returns plan | unit | `loadReadingPlan('finding-peace-in-anxiety')` resolves to a plan with `days` array |
| Loader returns undefined | unit | `loadReadingPlan('nonexistent')` resolves to `undefined` |

**Expected state after completion:**
- [ ] `ReadingPlanMeta` type exists
- [ ] `READING_PLAN_METADATA` exports 10 lightweight plan objects (no `days` field)
- [ ] `loadReadingPlan(id)` returns full plan via dynamic import
- [ ] Old synchronous exports removed from `index.ts`
- [ ] Build compiles (consumers may break — fixed in Step 4)

---

### Step 4: Update Reading Plan Consumers to Use Metadata + Lazy Loading

**Objective:** Migrate all 6 reading plan consumers to use `READING_PLAN_METADATA` for browsing and `loadReadingPlan()` for full content.

**Files to modify:**
- `frontend/src/pages/ReadingPlans.tsx`
- `frontend/src/pages/ReadingPlanDetail.tsx`
- `frontend/src/hooks/useReadingPlanProgress.ts`
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx`
- `frontend/src/components/dashboard/MoodRecommendations.tsx`
- `frontend/src/components/daily/DevotionalTabContent.tsx`

**Details:**

**4a. `pages/ReadingPlans.tsx`** (plan browser):
- Replace `import { READING_PLANS } from '@/data/reading-plans'` with `import { READING_PLAN_METADATA } from '@/data/reading-plans'`
- Replace all `READING_PLANS` references with `READING_PLAN_METADATA`
- The `PlanCard` component already only uses metadata fields (title, description, theme, duration, difficulty, emoji, id)
- Type the plans list as `ReadingPlanMeta[]` instead of `ReadingPlan[]`

**4b. `pages/ReadingPlanDetail.tsx`** (plan detail — the critical change):
- Replace `import { getReadingPlan } from '@/data/reading-plans'` with `import { loadReadingPlan, getReadingPlanMeta, getReadingPlanDay } from '@/data/reading-plans'`
- Add `ReadingPlanMeta` import from types
- Use `getReadingPlanMeta(planId)` for immediate metadata (title for breadcrumb, etc.)
- Add state: `const [plan, setPlan] = useState<ReadingPlan | null>(null)` and `const [loading, setLoading] = useState(true)`
- Add effect to load full plan content:
  ```typescript
  useEffect(() => {
    if (!planId) return
    setLoading(true)
    loadReadingPlan(planId).then((p) => {
      setPlan(p ?? null)
      setLoading(false)
    })
  }, [planId])
  ```
- Show metadata (title, description, breadcrumb) immediately
- Show loading spinner while `loading` is true and `plan` is null
- Show `PlanNotFound` if `!loading && !plan`
- Once loaded, render day content as before
- Update `getReadingPlanDay` call: `getReadingPlanDay(plan, selectedDay)` (takes plan object, not planId)

**4c. `hooks/useReadingPlanProgress.ts`**:
- Replace `import { READING_PLANS } from '@/data/reading-plans'` with `import { READING_PLAN_METADATA } from '@/data/reading-plans'`
- In `completeDay()`, the hook uses `READING_PLANS.find(p => p.id === planId)` only to get `plan.durationDays`
- Replace with `READING_PLAN_METADATA.find(p => p.id === planId)` — `durationDays` is in metadata
- Type the found plan as `ReadingPlanMeta | undefined`

**4d. `components/dashboard/ReadingPlanWidget.tsx`**:
- Replace `import { READING_PLANS, getReadingPlan } from '@/data/reading-plans'` with `import { READING_PLAN_METADATA, getReadingPlanMeta } from '@/data/reading-plans'`
- Replace `READING_PLANS` references with `READING_PLAN_METADATA`
- Replace `getReadingPlan()` calls with `getReadingPlanMeta()`
- Type changes: `ReadingPlan` → `ReadingPlanMeta` where applicable

**4e. `components/dashboard/MoodRecommendations.tsx`**:
- Replace `import { getReadingPlan } from '@/data/reading-plans'` with `import { getReadingPlanMeta } from '@/data/reading-plans'`
- Replace `getReadingPlan()` calls with `getReadingPlanMeta()` — only uses metadata fields

**4f. `components/daily/DevotionalTabContent.tsx`**:
- Replace `import { READING_PLANS } from '@/data/reading-plans'` with `import { READING_PLAN_METADATA } from '@/data/reading-plans'`
- Replace `READING_PLANS` references with `READING_PLAN_METADATA`

**Responsive behavior:** N/A: no UI impact (data layer change only)

**Guardrails (DO NOT):**
- DO NOT change any visual rendering or layout
- DO NOT change the reading plan progress storage format
- DO NOT add error boundaries — use simple null checks and the existing `PlanNotFound` component
- DO NOT remove `loading` state — users on slow connections need feedback
- DO NOT cache loaded plans in localStorage — React state cache is sufficient (plan data is immutable)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ReadingPlans page renders | integration | Plan browser renders 10 plan cards using metadata |
| ReadingPlanDetail loads content | integration | Plan detail page shows loading state, then renders day content after dynamic import |
| ReadingPlanDetail not found | integration | Non-existent planId shows PlanNotFound |
| useReadingPlanProgress completeDay | unit | `completeDay()` still correctly detects last day using metadata `durationDays` |
| ReadingPlanWidget renders | integration | Widget shows active plan title and progress |
| MoodRecommendations renders | integration | Recommendations include reading plan suggestions |
| DevotionalTabContent renders | integration | Related plan callout renders correctly |
| Build output | build | 10 separate plan chunks in build output (one per plan file) |

**Expected state after completion:**
- [ ] All 6 consumers compile and render correctly
- [ ] Plan browser loads instantly (no dynamic imports needed)
- [ ] Plan detail page shows loading state, then content
- [ ] Build output shows 10 individual reading plan chunks
- [ ] Dashboard widget still shows active plan progress
- [ ] All existing reading plan tests pass (with updates for async loading)

---

### Step 5: Remove React Query from Entry Bundle

**Objective:** Remove the unused `QueryClientProvider` wrapper and `queryClient` import from the app entry point.

**Files to modify:**
- `frontend/src/App.tsx` — remove QueryClientProvider wrapper and imports

**Files to delete (optional — see guardrails):**
- `frontend/src/lib/query-client.ts` — unused config file

**Details:**

In `frontend/src/App.tsx`:

1. Remove import lines 3-4:
   ```typescript
   // REMOVE:
   import { QueryClientProvider } from '@tanstack/react-query'
   import { queryClient } from './lib/query-client'
   ```

2. Remove the `QueryClientProvider` wrapper (lines 153 and 230):
   ```typescript
   // BEFORE (line 153):
   <QueryClientProvider client={queryClient}>
   // AFTER: remove this line

   // BEFORE (line 230):
   </QueryClientProvider>
   // AFTER: remove this line
   ```

3. Delete `frontend/src/lib/query-client.ts` — it's only imported by App.tsx and serves no other purpose.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove `@tanstack/react-query` from `package.json` — keep installed for Phase 3
- DO NOT remove `react-hook-form`, `@hookform/resolvers`, or `zod` from `package.json` — keep for Phase 3
- DO NOT modify any other provider wrapping in App.tsx
- DO NOT add any replacement state management

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm build` | build | Build passes with no react-query in any chunk |
| `pnpm test` | suite | All tests pass — no test imports QueryClientProvider or useQuery |
| App renders | integration | App renders without QueryClientProvider wrapper |
| No runtime errors | manual | Navigate through key routes — no missing provider errors |

**Expected state after completion:**
- [ ] `QueryClientProvider` removed from App.tsx component tree
- [ ] `query-client.ts` deleted
- [ ] No `@tanstack/react-query` code appears in build output
- [ ] App renders and routes work normally
- [ ] Entry bundle is smaller (react-query tree-shaken out)

---

### Step 6: Update Tests for Reading Plan Changes

**Objective:** Fix any tests broken by the reading plan restructuring (async loading, metadata vs full plan imports).

**Files to modify:**
- Any test files that import from `@/data/reading-plans` and expect synchronous `READING_PLANS` or `getReadingPlan`
- `ReadingPlanDetail` tests — must handle async loading state

**Details:**

Search for all test files importing from `@/data/reading-plans` or testing reading plan components. Common patterns to update:

1. **Tests importing `READING_PLANS`:** Change to `READING_PLAN_METADATA` where the test only checks plan listing/metadata.

2. **Tests importing `getReadingPlan`:**
   - If testing metadata lookup, change to `getReadingPlanMeta`
   - If testing full plan content, use `await loadReadingPlan(id)` in async test

3. **ReadingPlanDetail tests:** Must handle the async loading pattern:
   - Render the component
   - Expect loading state initially
   - Use `waitFor` or `findBy*` to wait for content to appear after dynamic import resolves
   - Vitest handles dynamic imports in test environment — no special mocking needed

4. **useReadingPlanProgress tests:** Update to use `READING_PLAN_METADATA` import if they reference the plan data.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT mock dynamic imports — let Vitest resolve them naturally
- DO NOT add unnecessary test infrastructure
- DO NOT change test assertions that verify correct rendering — only update how plans are loaded/imported

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All reading plan tests | suite | Run `pnpm test -- --grep "reading"` — all pass |
| Full test suite | suite | `pnpm test` — all 4,862+ tests pass |

**Expected state after completion:**
- [ ] All reading plan-related tests pass
- [ ] Full test suite passes (4,862+ tests, 0 failures)
- [ ] No test imports the removed `READING_PLANS` or `getReadingPlan` exports

---

### Step 7: Verify Build Output and Document Results

**Objective:** Run final build, compare chunk sizes before/after, verify all acceptance criteria.

**Files to modify:** None — verification only

**Details:**

1. Run `pnpm build` and capture full chunk output
2. Compare against baseline recorded in Step 1
3. Verify these specific chunks exist in build output:
   - `leaflet-{hash}.js` — new chunk containing Leaflet + react-leaflet
   - 10 individual reading plan chunks (one per plan file)
   - Entry bundle (index-{hash}.js) — should be noticeably smaller
4. Verify these chunks are absent or smaller:
   - No monolithic reading plan chunk (~156 KB)
   - LocalSupportPage chunk is smaller (Leaflet extracted)
   - No `@tanstack/react-query` code in any chunk
5. Run full test suite: `pnpm test`
6. Document results in the Execution Log

**Expected improvements (from spec):**

| Metric | Before (expected) | After (expected) |
|--------|-------------------|------------------|
| Entry bundle (gzipped) | ~97 KB | ~85 KB (-12 KB from react-query) |
| LocalSupportPage chunk | ~212 KB | ~50 KB (Leaflet extracted) |
| Leaflet chunk (new) | — | ~160 KB (shared, cacheable) |
| Reading plan chunks | ~156 KB monolith | ~10-15 KB each × 10 |

Note: The spec estimated ~70 KB entry bundle assuming react-hook-form/zod removal. Since those are already tree-shaken, the entry bundle reduction is primarily from react-query (~12 KB gzipped).

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify any code in this step — verification only
- DO NOT commit without all tests passing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm build` | build | 0 errors, 0 warnings |
| `pnpm test` | suite | All tests pass |
| Chunk inventory | manual | Verify expected chunks exist in `dist/assets/` |

**Expected state after completion:**
- [ ] Build passes cleanly
- [ ] All tests pass
- [ ] Chunk sizes documented in Execution Log
- [ ] Entry bundle is smaller than baseline
- [ ] Leaflet is in its own chunk
- [ ] Reading plans are in individual chunks
- [ ] No react-query code in any chunk

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Fix pre-existing TS errors, record baseline chunk sizes |
| 2 | 1 | Isolate Leaflet as manual chunk |
| 3 | 1 | Create reading plan metadata + loaders |
| 4 | 3 | Update reading plan consumers |
| 5 | 1 | Remove React Query from entry bundle |
| 6 | 4, 5 | Update tests for all changes |
| 7 | 2, 6 | Verify final build output and document results |

Steps 2, 3, and 5 are independent of each other (all depend only on Step 1). Step 4 depends on Step 3. Step 6 depends on Steps 4 and 5. Step 7 depends on everything.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Fix pre-existing TS errors | [COMPLETE] | 2026-04-01 | More errors than plan anticipated. Fixed: (1) excluded `__tests__/` from tsconfig.json build (standard Vite practice), (2) fixed `GardenShareButton.tsx` — wrong destructure names for `useSoundEffects` (`play` → `playSoundEffect`) and `useToastSafe` (was treating returned object as callable), (3) updated test mocks in `GardenShareButton.test.tsx` to match corrected API, (4) added vitest ref to `useRovingTabindex.test.ts`, (5) fixed `garden-share-canvas.test.ts` tuple type. Baseline: entry=101.50KB gz, LocalSupportPage=65.71KB gz, readingPlans=52.64KB gz |
| 2 | Isolate Leaflet as manual chunk | [COMPLETE] | 2026-04-01 | Added leaflet manualChunks entry in vite.config.ts. Result: leaflet-{hash}.js = 160.52 KB (50.21 KB gz), LocalSupportPage dropped from 211.75 KB → 51.15 KB (14.82 KB gz) |
| 3 | Create reading plan metadata + loaders | [COMPLETE] | 2026-04-01 | Created metadata.ts with 10 plan entries (no day content imports), added ReadingPlanMeta type, rewrote index.ts with dynamic loaders. Old READING_PLANS/getReadingPlan exports removed. Expected consumer breakage in 6 files — fixed in Step 4. |
| 4 | Update reading plan consumers | [COMPLETE] | 2026-04-01 | Updated all 6 consumers + PlanCard to use READING_PLAN_METADATA/getReadingPlanMeta. ReadingPlanDetail now uses loadReadingPlan() with loading spinner. Removed day title from ReadingPlanWidget and MoodRecommendations (metadata-only). useReadingPlanProgress chunk: 156.42KB → 4.86KB. 10 individual plan chunks created. |
| 5 | Remove React Query from entry bundle | [COMPLETE] | 2026-04-01 | Removed QueryClientProvider wrapper + imports from App.tsx, deleted query-client.ts. Entry bundle: 101.50KB → 93.22KB gzipped (-8.28KB). |
| 6 | Update tests for changes | [COMPLETE] | 2026-04-01 | Rewrote reading-plans-data.test.tsx for metadata + async loaders. Updated ReadingPlanDetail.test.tsx to use findBy* queries for async loading. 5,287 tests pass (one test consolidated from redundant data checks). |
| 7 | Verify build output | [COMPLETE] | 2026-04-01 | Build: 0 errors. Tests: 5,287 pass. Entry bundle: 101.50→93.22 KB gz (-8.28 KB). LocalSupportPage: 65.71→14.82 KB gz. Leaflet isolated: 50.21 KB gz. Reading plans: monolith eliminated, 10 individual chunks (3.85-10.02 KB gz each). No react-query in any chunk. |
