# BB-36: Performance

**Master Plan Reference:** N/A — standalone measurement-and-remediation spec on `bible-redesign` branch

**Branch:** `bible-redesign` (no new branch — all work commits directly here)

**Depends on:**
- BB-35 (Accessibility audit — shipped) — performance optimizations must not regress accessibility
- BB-34 (Empty states & first-run — shipped) — first-run welcome affects initial load timing
- BB-33 (Animations & micro-interactions — shipped) — animation work is the layer performance optimization most often conflicts with
- BB-30 through BB-46 (feature wave substantially complete) — performance can only be measured accurately once all features are in their final shipping form
- BB-39 (PWA + offline reading) — service worker precache size is a performance concern
- BB-42 (Full-text search) — the search index is one of the largest static assets in the app
- BB-40 (SEO + canonical URLs) — canonical URLs and metadata affect Lighthouse SEO which is tangentially related

**Hands off to:**
- BB-37 (Code health + Playwright full audit) — will verify performance fixes hold up in real-browser conditions and catch any regressions
- BB-37b (Bible Wave Integrity Audit) — will verify the final wave meets its performance targets
- Any future spec that adds a substantial new feature (the audio cluster BB-26-29 especially) which will need its own performance review at ship time

---

## Overview

Worship Room promises a quiet, calm space for emotional healing and spiritual support. Performance is the invisible dimension that makes or breaks that promise — a slow app feels frustrating, and users rarely identify performance as the cause of their frustration. They just leave. For users on mid-range Android phones over spotty cellular connections, old iPads in church pews, and shared family computers, every unnecessary second of load time erodes the sanctuary experience. BB-36 systematically measures, optimizes, and verifies Worship Room's performance so the app feels effortless on the devices that matter most.

This is a measurement-and-remediation spec, not a new-feature spec. Worship Room already has reasonable performance for most flows — vite-plugin-pwa precaches the app shell, BB-39 established runtime caching rules, and Bible data is dynamically imported per chapter. What's missing is systematic measurement and targeted optimization of the biggest remaining wins. The spec is framed around "measure first, optimize second, verify third" and treats performance as a quantitative discipline.

## User Story

As a **logged-out visitor or logged-in user on any device**, I want **every page to load quickly and every interaction to respond immediately** so that **my devotional experience feels effortless and immersive, never interrupted by waiting**.

## Requirements

### Functional Requirements

#### Baseline Measurement

1. A complete performance baseline document is produced at `_plans/recon/bb36-performance-baseline.md` before any optimization work begins
2. The baseline captures Lighthouse scores (Performance, Accessibility, Best Practices, SEO) and Core Web Vitals (LCP, INP, CLS, TBT, TTFB) for every major page
3. The baseline uses realistic device profiles: mobile emulation, 4x CPU throttle, Slow 4G network — not idealized desktop metrics
4. Pages measured: home (`/`), Bible reader cold load (`/bible/john/3`), Bible reader subsequent chapter navigation, My Bible (`/bible/my`), Daily Hub all tabs (`/daily?tab=devotional`, `pray`, `journal`), settings, search results (`/bible?mode=search&q=love`), accessibility statement
5. Bundle size analysis captures: total `dist/` size raw and gzipped, per-chunk sizes for the top 20 largest JS chunks, CSS size, static asset sizes (images, fonts, search index, Bible JSON), service worker precache manifest size
6. Real-world flow timings captured via Playwright script: cold load to first paint, home-to-Bible navigation, chapter-to-chapter navigation, verse selection + action menu, Daily Hub tab switching, search query to results, My Bible page load

#### Optimization Priority List

7. A prioritized list of optimization opportunities is produced with impact estimates, cost estimates, and priority ranking (impact / cost)
8. The priority list is reviewed and approved before any optimization work begins

#### Route-Level Code Splitting (Target 1)

9. Every route in `App.tsx` is verified to use lazy loading via `React.lazy` and `Suspense`, or documented why it's exempt
10. Any eagerly imported route component is converted to lazy-loaded

#### Bible Chapter JSON Loading (Target 2)

11. Bible chapter JSON is verified to load lazily per chapter, not eagerly on initial visit
12. Service worker precaching of Bible data does not block the initial page load for new users

#### Search Index Loading (Target 3)

13. The BB-42 search index loads non-blockingly on first search
14. The search UI shows a skeleton/loading state while the index loads rather than freezing the interface

#### Image Optimization (Target 4)

15. All image assets in the app are inventoried with file sizes
16. Images larger than needed are resized or converted to modern formats (WebP/AVIF) where the build pipeline supports it

#### Font Loading (Target 5)

17. All fonts (Inter, Lora) use `font-display: swap` or equivalent non-blocking loading strategy
18. Self-hosted font file sizes are verified to be reasonable

#### Third-Party Script Audit (Target 6)

19. All third-party scripts are inventoried (analytics, embeds, error reporting, feature flags)
20. Unnecessary scripts are removed; remaining scripts are deferred where possible

#### React Re-Render Optimization (Target 7)

21. Components with excessive re-renders are identified and remediated or documented as acceptable
22. Common culprits checked: components subscribing to too-broad store state, missing memoization, parent re-renders propagating unnecessarily

#### Memoization Verification (Target 8)

23. Expensive derived state (BB-43 reading heatmap computation, BB-46 echo selection engine) is verified to use proper `useMemo` with correct dependency arrays

#### List Virtualization (Target 9)

24. Any list that can exceed 100 items (activity feed, search results, prayer wall) is verified to be virtualized or naturally capped at a small number

#### Icon Tree-Shaking (Target 10)

25. Lucide React icon imports are verified to be tree-shakeable (per-icon imports, not namespace imports like `import * as Icons`)

#### Service Worker Precache Tuning (Target 11)

26. Service worker precache size is verified to be within acceptable bounds (no more than 5 MB gzipped)
27. Runtime caching rules are verified to be optimal — precache isn't including anything that could be runtime-cached instead

#### CSS Optimization (Target 12)

28. Tailwind CSS purge/JIT is verified to be correctly configured with no unused utilities in the final CSS

#### HTML Critical Path (Target 13)

29. The initial HTML response is verified to be minimal with no blocking external requests

#### Preconnect/Preload Hints (Target 14)

30. `<link rel="preconnect">` added for any third-party origins the app fetches from
31. `<link rel="preload">` added for critical assets where beneficial

#### Verification Pass

32. After all optimizations ship, the full baseline measurement is re-run and compared against pre-optimization numbers
33. Results documented as a before-and-after comparison table in the baseline document
34. Target: Lighthouse Performance score of 90+ on all major pages
35. No Core Web Vital regresses — all stay within 10% of baseline or improve
36. Lighthouse Accessibility score does not regress from BB-35's baseline (minimum 95 on all major pages)
37. Bundle size after BB-36 is smaller or equal to pre-BB-36 baseline

#### Measurement Framework

38. A documentation file at `frontend/docs/performance-measurement.md` explains how to re-run baseline measurements
39. A script at `frontend/scripts/measure-bundle.mjs` produces a structured bundle size report (total size, top 10 chunks, CSS size, asset sizes)
40. A Playwright performance test at `frontend/tests/performance/core-flows.spec.ts` runs key flows and captures timings (not CI-integrated, ready for manual runs)

### Non-Functional Requirements

- **Performance targets:** Lighthouse Performance score 90+ on all major pages; LCP < 2.5s on mobile; CLS < 0.1; TBT < 200ms
- **Accessibility:** No regression from BB-35 baseline — minimum 95 Lighthouse Accessibility on all pages
- **Bundle size:** No increase from pre-BB-36 baseline without documented justification
- **Dependencies:** Zero new npm packages unless explicitly approved during the plan phase

## Auth Gating

N/A — BB-36 is a pure optimization and measurement spec. It adds no new interactive elements, no new UI, and no new user-facing functionality. Existing auth behavior is unchanged.

## Responsive Behavior

N/A — BB-36 does not add or modify any UI elements. Performance optimizations apply equally across all breakpoints. Responsive behavior of existing features is verified to be unchanged by the verification pass.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No change to behavior. Performance improvements benefit all users equally.
- **Logged-in users:** No change to behavior or data persistence.
- **localStorage usage:** Zero new keys. Existing keys are unchanged.
- **Route type:** No new routes.

## Design Notes

- No visual changes. BB-36 is invisible to users — they experience the results (faster loads, smoother interactions) but see no UI differences.
- BB-33's animations are preserved exactly as shipped. If an animation is causing layout thrashing, BB-36 can adjust how it's rendered (`will-change`, `transform` instead of `top`/`left`) but does not remove or redesign animations.
- BB-35's accessibility additions are preserved even if they have a small bundle-size cost. No optimization trades accessibility for performance.

## Execution Rules

- Each optimization is a separate commit so any regression can be bisected
- Each optimization is measured before-and-after to confirm it actually helped
- If an optimization doesn't improve the target metric by at least the estimated amount, it gets rolled back and the plan is updated
- No optimization ships that breaks functionality, regresses accessibility, or regresses visual appearance
- No optimization adds new dependencies unless the plan phase explicitly approves them
- "Fast enough" is the target, not "as fast as theoretically possible" — if a metric is already green, leave it alone
- Micro-optimizations that save less than 10-20% on the measured metric are not worth readability costs

## Out of Scope

- **No new features.** Pure optimization and measurement. No new UI, no new functionality.
- **No CI integration of performance checks.** BB-37 can decide whether to add automated performance budgets.
- **No performance monitoring service.** No Sentry Performance, SpeedCurve, Calibre, or RUM.
- **No SSR or SSG.** Worship Room is a client-rendered SPA and BB-36 doesn't change that.
- **No PWA work beyond verifying BB-39's existing infrastructure.** Service worker is BB-39's domain.
- **No new image pipeline or build tool changes** beyond what's needed for specific optimizations.
- **No major architectural refactors.** Fundamental design flaws are flagged as follow-up specs.
- **No database or backend optimization.** Worship Room is pure client-side in this phase.
- **No changes to BB-42 search index format.**
- **No new auth gates, no new localStorage keys, no new npm packages** (unless explicitly approved).
- **No Lighthouse CI or automated Lighthouse runs.** Manual runs documented in the recon file.
- **WebP/AVIF conversion** deferred to follow-up if the build pipeline doesn't already support it.
- **Subresource Integrity hashes** for external scripts — low priority, may defer.
- **HTTP/2 push or 103 Early Hints** — server-side, out of scope.

## Acceptance Criteria

- [ ] A complete performance baseline document exists at `_plans/recon/bb36-performance-baseline.md` capturing Lighthouse scores, bundle sizes, flow timings, and memory profile for all major pages
- [ ] The baseline uses realistic device profiles (mobile emulation, 4x CPU throttle, Slow 4G network)
- [ ] A prioritized optimization list is included with impact/cost estimates for each target
- [ ] Every route in `App.tsx` is verified to use lazy loading via `React.lazy` and `Suspense`, or documented why exempt
- [ ] Bible chapter JSON is verified to load lazily per chapter, not eagerly
- [ ] BB-42 search index is verified to load non-blockingly with skeleton UI during load
- [ ] All images inventoried; oversized images resized or converted to modern formats
- [ ] Fonts verified to use `font-display: swap` or equivalent non-blocking strategy
- [ ] Third-party scripts inventoried; unnecessary ones removed or deferred
- [ ] React re-render hotspots identified and remediated or documented as acceptable
- [ ] Expensive derived state (BB-43 heatmap, BB-46 echoes) verified to use proper `useMemo`
- [ ] Long lists verified to be virtualized or naturally capped at small numbers
- [ ] Lucide React icon imports verified to be tree-shakeable (per-icon imports)
- [ ] Service worker precache size verified within bounds (no more than 5 MB gzipped)
- [ ] Tailwind CSS verified to be properly purged with no unused utilities
- [ ] Every optimization committed separately with before-and-after metrics in commit message
- [ ] Any optimization that doesn't deliver estimated impact is rolled back and documented
- [ ] Lighthouse Performance score reaches 90+ on all major pages after BB-36 ships
- [ ] Lighthouse Accessibility score does not regress from BB-35 baseline (minimum 95 on all pages)
- [ ] No Core Web Vital regresses (LCP, INP, CLS, TBT all within 10% of baseline or improve)
- [ ] Bundle size after BB-36 is smaller or equal to pre-BB-36 baseline (documented exceptions only)
- [ ] `frontend/docs/performance-measurement.md` exists explaining how to re-run measurements
- [ ] `frontend/scripts/measure-bundle.mjs` exists producing structured bundle size report
- [ ] `frontend/tests/performance/core-flows.spec.ts` exists (not CI-integrated, ready for manual runs)
- [ ] Baseline document updated with final "after BB-36" comparison table showing deltas on every metric
- [ ] All BB-30 through BB-35 tests continue to pass unchanged
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys, zero new npm packages (unless explicitly approved)
- [ ] The recon document is committed as the durable reference for future specs
- [ ] Any performance issues identified but not fixable within scope are documented as follow-up items

## Pre-Execution Checklist

1. BB-35 is shipped and committed.
2. The full performance baseline is captured at `_plans/recon/bb36-performance-baseline.md` before any optimization work begins. Pending recon.
3. The prioritized optimization list is produced with impact/cost estimates and reviewed before execution.
4. Realistic device profiles (mobile emulation, 4x CPU throttle, Slow 4G) are used for every Lighthouse measurement.
5. The list of major pages to measure is confirmed: home, Bible reader cold load, Bible reader subsequent chapter, My Bible, Daily Hub (all tabs), settings, search results, accessibility statement.
6. Stay on `bible-redesign` branch. No new branch, no merge.
7. Zero new auth gates, zero new localStorage keys, zero new npm packages (unless explicitly approved).
8. The service worker precache size before BB-36 is recorded for comparison.
9. Each optimization will be committed individually with before-and-after metrics in the commit message.
