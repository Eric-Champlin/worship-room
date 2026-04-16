# Feature: Bundle Optimization

**Master Plan Reference:** N/A — standalone performance optimization

---

## Overview

Worship Room's main bundle is healthy at 97 KB gzipped, but three optimization opportunities can significantly improve load times on slow mobile connections — the exact scenario for a user reaching for spiritual support during a difficult moment. By isolating Leaflet into its own cacheable chunk, lazy-loading reading plan content per-plan, and removing unused dependencies from the entry bundle, we reduce critical-path payload by ~25-30 KB and improve long-term caching for heavy libraries.

## User Story

As a **logged-out visitor on a slow mobile connection**, I want the app to load as fast as possible so that I can find comfort and support without waiting.

As a **logged-in user browsing reading plans**, I want only the plan I'm viewing to load so that navigation feels instant.

## Requirements

### 1. Isolate Leaflet as a Shared Manual Chunk

**Current state:** Leaflet and react-leaflet (212 KB) are bundled into the `LocalSupportPage` chunk. Since there's no manual chunk configuration for Leaflet, Vite bundles it with page logic. All 3 local support routes share this component, so the chunk loads once — but it's larger than necessary because Leaflet is mixed with page code.

**Target state:** Add Leaflet to the `manualChunks` configuration in `vite.config.ts` so it's extracted into its own chunk (`leaflet-{hash}.js`). This enables:
- Independent caching of the map library (Leaflet version changes are rare; page component changes are frequent)
- Shared chunk if Leaflet is ever used on another page

**Implementation:** In `vite.config.ts`, add to the existing `manualChunks` configuration (which already has `recharts` and `react-helmet-async`):

```typescript
leaflet: ['leaflet', 'react-leaflet'],
```

### 2. Lazy-Load Reading Plan Data Per-Plan

**Current state:** The `useReadingPlanProgress` chunk (156 KB) contains all 10 reading plan data files (3,400 lines of devotional text). When a user views ANY reading plan, all 10 plans' content loads.

**Target state:** Each reading plan's data loads only when that specific plan is accessed. The plan browser (`/grow?tab=plans`) loads only plan metadata (title, description, duration, difficulty) — the full daily content loads when the user navigates to a specific plan detail page.

**Approach — Dynamic imports per plan (Option A):**
- Restructure `data/reading-plans/index.ts` to separate metadata from content
- Export a `READING_PLAN_METADATA` array with lightweight plan summaries (statically imported)
- Export a `READING_PLAN_LOADERS` map with dynamic `import()` functions per plan (lazy-loaded)
- Update the consumer hook/page to call the loader for the specific plan, with a loading state while content loads
- Cache loaded plan data in React state so it doesn't re-fetch on re-render

**Consumer behavior:**
- Plan browser (`/grow?tab=plans`): uses only `READING_PLAN_METADATA` — lightweight, statically imported
- Plan detail page (`/reading-plans/:planId`): calls `READING_PLAN_LOADERS[planId]()` — lazy-loaded per plan
- Dashboard reading plan widget: should continue to show plan progress (uses progress data, not full plan content)

### 3. Remove Unused Production Dependencies from Entry Bundle

**Current state:** Four packages add ~28 KB gzipped to the critical entry bundle for features that don't function yet:

| Package | Gzipped Size | Current Usage |
|---------|-------------|---------------|
| `@tanstack/react-query` | ~12 KB | `QueryClientProvider` wraps the app, but zero active queries exist |
| `react-hook-form` | ~9 KB | Used only by `AuthModal` (a stub form) |
| `@hookform/resolvers` | ~2 KB | Zod resolver for react-hook-form |
| `zod` | ~5 KB | Schema validation for AuthModal form |

**Target state:** Remove these from the entry bundle while keeping packages installed for Phase 3 re-enablement.

**Step 1: Remove React Query wrapper**
- Remove `<QueryClientProvider>` from `App.tsx`
- Verify zero active `useQuery`/`useMutation`/`useQueryClient` consumers exist in the codebase
- Keep the package in `dependencies` (just tree-shaken out)

**Step 2: Lazy-load react-hook-form + zod into AuthModal chunk**
- If `AuthModal` is statically imported by `AuthModalProvider`, convert to a lazy import so `react-hook-form` and `zod` move into the AuthModal chunk
- If `AuthModal` is already lazily imported, these libraries are already isolated — verify and skip if so

**Step 3: Verify bundle impact**
- Entry bundle should be ~25-30 KB smaller gzipped
- A separate AuthModal chunk should contain react-hook-form + zod
- No `@tanstack/react-query` code should appear in any chunk

**Important:** Do NOT move packages from `dependencies` to `devDependencies` or uninstall them. They stay installed for Phase 3.

### 4. Verify Build Output

After all 3 optimizations, run `pnpm build` and document results.

**Expected improvements:**

| Metric | Before | After (expected) |
|--------|--------|-------------------|
| Entry bundle (gzipped) | 97 KB | ~70 KB (-27 KB) |
| LocalSupportPage chunk | 212 KB | ~50 KB (Leaflet extracted) |
| Leaflet chunk (new) | — | ~160 KB (shared, cacheable) |
| useReadingPlanProgress chunk | 156 KB | ~15 KB (metadata only) |
| Individual plan chunks (new, 10) | — | ~10-15 KB each |

Run the full test suite after optimization to ensure nothing broke.

## Auth Gating

N/A — This spec does not add or modify any interactive elements. All existing auth gating behavior remains unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View local support pages | Can search and view map (unchanged) | Same (unchanged) | N/A |
| Browse reading plans | Can view plan browser (unchanged) | Same (unchanged) | N/A |
| View reading plan detail | Can view plan content (unchanged) | Same (unchanged) | N/A |
| Open AuthModal | Form validation works (unchanged) | N/A | N/A |

## Responsive Behavior

N/A — This spec does not change any UI layouts. All existing responsive behavior remains unchanged. Verification should confirm that local support map pages and reading plan pages still render correctly at 375px, 768px, and 1440px after chunk restructuring.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No change — zero-persistence rule unaffected
- **Logged-in users:** No change — no data model changes
- **localStorage usage:** No change — no new keys or modifications

## Completion & Navigation

N/A — standalone infrastructure optimization. No user-facing flows change.

## Design Notes

N/A — No visual changes. This is a build infrastructure optimization only.

## Out of Scope

- Recharts optimization (506 KB, already isolated via manual chunk — revisit in Phase 4)
- Image optimization (minimal image footprint — 99 KB OG image only)
- Service worker precache strategy changes (runtime caching for Bible books — future optimization)
- Converting TypeScript data files to JSON (Option B for reading plans — future optimization)
- Tree-shaking analysis of Lucide icons (already tree-shaken per icon)
- Code splitting within page components (below-the-fold lazy loading — future optimization)
- Removing packages from `package.json` entirely (keep installed for Phase 3 re-enablement)

## Acceptance Criteria

### Leaflet Isolation
- [ ] Leaflet is extracted into its own manual chunk (`leaflet-{hash}.js`) in the build output
- [ ] `LocalSupportPage` chunk is smaller by ~150-200 KB compared to before
- [ ] All 3 local support pages (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`) still render the map correctly
- [ ] Map tiles load, markers display, and directions links work on all 3 local support pages

### Reading Plan Lazy Loading
- [ ] Plan browser (`/grow?tab=plans`) loads plan metadata without loading full plan content (verified by checking network/build output)
- [ ] Navigating to a specific plan detail page (`/reading-plans/:planId`) triggers a dynamic import for that plan's content
- [ ] A loading state is shown while plan content loads on the detail page
- [ ] 10 separate plan chunks exist in the build output (one per reading plan)
- [ ] The previous monolithic reading plan chunk (~156 KB) no longer exists or is dramatically smaller
- [ ] Plan daily content renders correctly after lazy load (scripture, reflection, prayer, action step all display)
- [ ] Plan progress tracking still works (day completion, faith points via `recordActivity`)
- [ ] Reading plan widget on dashboard still shows correct progress for active plans

### Dependency Cleanup
- [ ] `<QueryClientProvider>` is removed from the `App.tsx` component tree
- [ ] No `useQuery`, `useMutation`, or `useQueryClient` calls exist in the codebase (verified via search)
- [ ] `react-hook-form` and `zod` are isolated in the AuthModal chunk (not in the entry bundle)
- [ ] AuthModal still functions: form validation works, tab switching between login/register works, all inputs accept text
- [ ] No runtime errors from missing `QueryClient` provider or hooks

### Build Output
- [ ] `pnpm build` passes with 0 errors and 0 warnings
- [ ] Entry bundle is noticeably smaller than before (target: under 75 KB gzipped)
- [ ] Total number of chunks is reasonable (not exploded into hundreds of tiny files)
- [ ] All existing tests pass (`pnpm test` — 4,862+ tests)
- [ ] Precache manifest still includes all necessary assets

### Test Requirements
- [ ] Build output chunk sizes documented before and after optimization
- [ ] Local support pages verified at 375px, 768px, 1440px (map renders correctly)
- [ ] Reading plan detail pages load content correctly after lazy import at all breakpoints
- [ ] Reading plan browser shows all 10 plans with correct metadata
- [ ] AuthModal form validation works in both login and register views
- [ ] No console errors related to missing QueryClient or missing providers
- [ ] Full test suite passes — any failures from removed `QueryClientProvider` are fixed
