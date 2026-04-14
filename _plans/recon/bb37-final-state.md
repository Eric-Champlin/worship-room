# BB-37 Final State

## Build Health

| Metric | BB-36 Baseline | BB-37 Final | Delta |
|--------|---------------|-------------|-------|
| Lint problems | 26 | 0 | -26 |
| Failing tests | 52 (11 files) | 0 (0 files) | -52 |
| Total tests | 8,081 | 8,080 | -1 (net: deleted obsolete tests, added new coverage) |
| Build errors | 0 | 0 | = |
| Build warnings | 0 | 0 | = |
| Main bundle (gzip) | 97.6 KB | 97.5 KB | -0.1 KB |
| Total JS+CSS+HTML (gzip) | 3.68 MB | 3.68 MB | = |

## Debt Audit Summary

### Lint (26 → 0)
- **16 fixed:** Unused imports/variables in test files (removed)
- **4 fixed:** prefer-rest-params in test files (modernized to rest syntax)
- **2 accepted:** `no-explicit-any` in importApplier.test.ts (intentional for testing untyped data, eslint-disable with comment)
- **1 accepted:** `react-refresh/only-export-components` in BibleDrawerProvider.tsx (standard Provider + hook pattern, eslint-disable with comment)
- **5 fixed:** `exhaustive-deps` warnings in source files (added missing deps to useEffect/useCallback after verifying safety)

### Tests (52 → 0)
- **BibleReaderAudio (10):** Rewritten — old TTS/AudioControlBar tests replaced with ReaderChrome ambient audio tests
- **BibleReaderHighlights (6):** Rewritten — updated for URL-driven VerseActionSheet + emotion-based color palette
- **BibleReaderNotes (7):** Rewritten — updated for BB-8 note store + action sheet deep-linking
- **Journal (4):** Fixed — journalStore module-level cache reset in beforeEach
- **JournalMilestones (7):** Fixed — same cache reset pattern
- **JournalSearchFilter (10):** Fixed — cache reset + scoped mode toggle queries with `within()`
- **MarkAsAnsweredForm (3):** Fixed — label text updated to include "(optional):" suffix
- **MeditateLanding (1):** Fixed — navigate() options argument
- **MyBiblePage (2):** Fixed — specific heading level query for sr-only h1
- **BibleSearchMode (1):** Fixed — aria-describedby value includes hint ID
- **streakStore (1):** Fixed — dynamic ISO week start calculation

### Orphaned Files (10 deleted)
- 4 pre-redesign Bible components: BookNotFound, ChapterNav, ChapterPlaceholder, ChapterSelector
- 5 unused barrel exports: components/index, social/index, ui/index, accessibility/index, notifications/index
- 1 orphaned test helper: audio/__tests__/helpers.ts
- All deletions dual-verified (knip + grep)

### Deprecated Patterns
All clean (confirmed). Zero instances of any deprecated pattern in source code.

### Dead Code
No significant dead code found beyond the orphaned files above. 12 unused exports and 70 unused exported types identified by knip — all intentional (Phase 3 prep, barrel re-exports, Props interfaces for type-safety).

### TypeScript Strictness
All clean. Zero `@ts-ignore`/`@ts-expect-error`. 8 `as any`/`as unknown as` type assertions, all justified (Leaflet private API, React `inert` attribute, webkitSpeechRecognition, periodicSync API, Zod parse result).

## Playwright Full-Audit Summary
- 25 routes tested (17 public + 8 authenticated)
- 25 routes passing all checks
- 0 issues found
- Checks per route: renders, no console errors (filtered), no horizontal overflow (375px + 1440px), key element visible, no JS exceptions

## Deferred Integration Tests (BB-41)
- Contextual prompt test: **PASS** (4 tests — prompt on same-day re-read, negative cases, dismiss persistence)
- Notification deep-link test: **PASS** (8 tests — 5 structural SW source verification + 3 runtime localStorage contract tests)

## Follow-Up Items for BB-37b

| # | Item | Priority | Scope |
|---|------|----------|-------|
| 1 | Flaky `useNotifications` sort test (passes individually, fails intermittently in full suite) | Low | Investigate localStorage collision or sort stability |
| 2 | Flaky `WelcomeWizard` keyboard test (focus state in jsdom) | Low | Add `waitFor` or investigate focus management |
| 3 | `zod` in dependencies but knip reports unused | Low | Verify if used by any runtime code or only by removed features |
| 4 | 12 unused exports flagged by knip (crossRefs, search, heatmap, env, echoes) | Low | Audit for Phase 3 readiness vs truly dead code |
| 5 | SW notification deep-link needs production build E2E test | Medium | Test with actual compiled SW in production build |
| 6 | 70 unused exported types | Low | Standard Props pattern, no action needed |

## Process Lessons
See `frontend/docs/process-lessons.md` — 7 lessons covering grep discipline, terminal states, layout exceptions, measurement discipline, living baselines, cache invalidation, and test-component alignment.

## Handoff to BB-37b
BB-37b can now focus on system-level integrity verification without being distracted by individual-spec-level noise. The codebase is at zero lint problems, zero test failures, zero build warnings, with comprehensive Playwright coverage across all 25 routes.
