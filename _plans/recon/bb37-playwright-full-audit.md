# BB-37 Playwright Full-Audit Report

## Summary
- **Routes tested:** 25
- **Routes passing all checks:** 25
- **Routes with issues:** 0
- **Test runtime:** ~1.5 minutes (25 tests, 1 worker)
- **Run date:** 2026-04-13

### Checks per route
1. Page renders (body text > 50 characters)
2. No console errors (filtered by IGNORE_PATTERNS for Vite/HMR/devtools noise)
3. No horizontal overflow at 375px
4. No horizontal overflow at 1440px
5. Key element visible (at least one viewport)
6. No uncaught JavaScript exceptions

---

## Per-Route Results

### Public Routes (17 routes)

| # | Route | Renders | No Console Errors | No Overflow 375px | No Overflow 1440px | Key Element | No JS Errors | Status |
|---|-------|---------|-------------------|--------------------|--------------------|-------------|--------------|--------|
| 1 | `/` (logged-out) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 3 | `/bible/john/3?verse=16` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 4 | `/bible/genesis/1` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 5 | `/bible` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 6 | `/bible?mode=search&q=love` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 8 | `/daily?tab=devotional` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 9 | `/daily?tab=pray` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 10 | `/daily?tab=journal` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 11 | `/daily?tab=meditate` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 12 | `/ask` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 13 | `/prayer-wall` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 14 | `/prayer-wall/user/mock-1` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 16 | `/grow` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 20 | `/music` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 21 | `/register` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 23 | `/nonexistent-route` (404) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 24 | `/local-support/churches` | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

### Authenticated Routes (8 routes)

| # | Route | Renders | No Console Errors | No Overflow 375px | No Overflow 1440px | Key Element | No JS Errors | Status |
|---|-------|---------|-------------------|--------------------|--------------------|-------------|--------------|--------|
| 2 | `/` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 7 | `/bible/my` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 15 | `/settings` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 17 | `/insights` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 18 | `/friends` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 19 | `/friends?tab=leaderboard` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 22 | `/my-prayers` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| 25 | `/meditate/breathing` (authenticated) | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

---

## Notes

### Test Design
- Each route is tested at two viewports: **375x812** (mobile) and **1440x900** (desktop)
- Auth simulation uses `page.addInitScript()` to set `wr_auth_simulated`, `wr_user_name`, `wr_user_id`, `wr_onboarding_complete`, `wr_tooltips_seen`, `wr_getting_started_complete`, `wr_mood_entries`, and `wr_first_run_completed` in localStorage before navigation
- Console noise is filtered via the same `IGNORE_PATTERNS` used by the existing `full-site-audit.spec.ts`
- Key element selectors use comma-separated fallback lists (e.g., `main, h1, h2`) and check all matching elements, not just the first, to handle hidden tabpanel siblings correctly
- Horizontal overflow check uses a 2px tolerance (`scrollWidth > clientWidth + 2`) to avoid false positives from sub-pixel rounding

### Initial Fix During Development
- The `/daily?tab=journal` route initially failed the "key element visible" check because the helper was only checking `.first()` on multi-match selectors. The Daily Hub renders all four tabpanels simultaneously with `hidden` attributes, so `[role="tabpanel"].first()` would always return the devotional panel (hidden when journal is active). Fixed by iterating all matches with `.nth(i)`.

### Excluded Checks (per spec)
- CWV measurements (flaky in test environments)
- Full accessibility tree snapshots (too verbose)
- Keyboard navigation tests (covered by unit tests)
- Dynamic content announcement checks (covered by unit tests)

---

## Test File
- **Spec:** `frontend/e2e/bb37-full-audit.spec.ts`
- **Run command:** `npx playwright test e2e/bb37-full-audit.spec.ts`
