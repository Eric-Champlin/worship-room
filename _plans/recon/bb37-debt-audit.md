# BB-37 Debt Audit

Captured: 2026-04-13
Branch: `bible-redesign` (commit `5b898dd` — BB-36 performance)

## 1A. Lint Baseline (26 problems: 21 errors, 5 warnings)

### Test file errors (17 errors)

| # | File | Line | Rule | Severity | Proposed Resolution |
|---|------|------|------|----------|---------------------|
| 1 | `src/data/bible/__tests__/index.test.ts` | 24 | no-unused-vars | error | Remove unused `verseNumbers` |
| 2 | `src/hooks/__tests__/useEcho.test.ts` | 2 | no-unused-vars | error | Remove unused `afterEach` import |
| 3 | `src/hooks/__tests__/useEcho.test.ts` | 162 | no-unused-vars | error | Remove unused `rerender` |
| 4 | `src/hooks/__tests__/useVerseTap.test.ts` | 19 | no-extra-semi | error | Remove extra semicolon |
| 5 | `src/lib/bible/__tests__/bookmarkStore.test.ts` | 364 | prefer-rest-params | error | Replace `arguments` with rest params |
| 6 | `src/lib/bible/__tests__/highlightStore.test.ts` | 3 | no-unused-vars | error | Remove unused `HighlightColor` import |
| 7 | `src/lib/bible/__tests__/highlightStore.test.ts` | 11 | no-unused-vars | error | Remove unused `makeHighlight` import |
| 8 | `src/lib/bible/__tests__/highlightStore.test.ts` | 453 | prefer-rest-params | error | Replace `arguments` with rest params |
| 9 | `src/lib/bible/__tests__/importApplier.test.ts` | 169 | no-explicit-any | error | Accept with eslint-disable — intentional for testing untyped import data |
| 10 | `src/lib/bible/__tests__/importApplier.test.ts` | 179 | no-explicit-any | error | Accept with eslint-disable — intentional for testing untyped import data |
| 11 | `src/lib/bible/__tests__/journalStore.test.ts` | 261 | prefer-rest-params | error | Replace `arguments` with rest params |
| 12 | `src/lib/bible/__tests__/storeMutations.test.ts` | 5 | no-unused-vars | error | Remove unused `MergeResult` import |
| 13 | `src/lib/bible/__tests__/verseActionRegistry.test.ts` | 497 | prefer-rest-params | error | Replace `arguments` with rest params |
| 14 | `src/lib/bible/__tests__/votdSelector.test.ts` | 1 | no-unused-vars | error | Remove unused `vi` import |
| 15 | `src/lib/bible/__tests__/votdSelector.test.ts` | 4 | no-unused-vars | error | Remove unused `VotdListEntry` import |
| 16 | `src/lib/echoes/__tests__/engine.test.ts` | 1 | no-unused-vars | error | Remove unused `vi`, `beforeEach` imports |

### Non-test file errors (4 errors)

| # | File | Line | Rule | Severity | Proposed Resolution |
|---|------|------|------|----------|---------------------|
| 17 | `src/components/__tests__/bb35-a11y-remediation.test.tsx` | 218 | no-unused-vars | error | Remove unused `h3s` variable |
| 18 | `src/components/bible/landing/__tests__/QuickActionsRow.test.tsx` | 1 | no-unused-vars | error | Remove unused `fireEvent` import |
| 19 | `src/components/bible/landing/__tests__/QuickActionsRow.test.tsx` | 3 | no-unused-vars | error | Remove unused `vi` import |
| 20 | `src/components/bible/streak/__tests__/MiniGrid.test.tsx` | 8 | no-unused-vars | error | Remove unused `yesterday` variable |

### Source file warnings (5 warnings)

| # | File | Line | Rule | Severity | Proposed Resolution |
|---|------|------|------|----------|---------------------|
| 21 | `src/components/bible/BibleDrawerProvider.tsx` | 100 | react-refresh/only-export-components | warning | Accept — Provider + context export is a standard React pattern |
| 22 | `src/components/bible/reader/AmbientAudioPicker.tsx` | 86 | react-hooks/exhaustive-deps | warning | Verify `panelRef` dep — ref objects are stable, likely a false positive; add eslint-disable if confirmed |
| 23 | `src/components/daily/SaveToPrayerListForm.tsx` | 55 | react-hooks/exhaustive-deps | warning | Verify `verseContext` dep — add to deps if the callback should react to context changes |
| 24 | `src/pages/meditate/BreathingExercise.tsx` | 170 | react-hooks/exhaustive-deps | warning | Add `meditationVerseContext` to useCallback deps (Spec Z verse context) |
| 25 | `src/pages/meditate/ScriptureSoaking.tsx` | 125 | react-hooks/exhaustive-deps | warning | Add `meditationVerseContext` to useCallback deps (Spec Z verse context) |

**Note:** The plan baseline said 19 test errors + 2 source warnings + 5 additional = 26 total. Actual breakdown is 16 test errors + 4 additional test-adjacent errors + 1 react-refresh warning + 2 exhaustive-deps warnings (new beyond plan) + 2 exhaustive-deps warnings (from plan) = 26 total. Counts match.

---

## 1B. Failing Test Baseline (52 consistent failures in 11 files + 2 flaky in 2 files)

### Consistent failures (52 tests, 11 files)

| # | File | Failures | Test Names | Root Cause | Proposed Resolution |
|---|------|----------|------------|------------|---------------------|
| 1 | `BibleReaderAudio.test.tsx` | 10 | Audio control bar renders, hidden when TTS unsupported, ambient chip, TTS verse highlighting (3), non-regression (4) | Mock/context issues — tests use old BibleReader structure pre-BB-redesign | Update mocks and selectors to match current BibleReader component |
| 2 | `BibleReaderHighlights.test.tsx` | 6 | Action bar, lock message, color picker, verse replacement, Escape dismissal, Copy button | Action bar/verse tap API changed in BB-redesign wave | Update selectors and event simulation to match current verse action system |
| 3 | `BibleReaderNotes.test.tsx` | 7 | Note editor open, char counter, localStorage save, action bar dismiss, cancel, logged-out, corrupted localStorage | Note system redesigned in BB-8; tests still target old API | Update to match BB-8 note store and current inline editor |
| 4 | `Journal.test.tsx` | 4 | Reflect shows reflection, saved entries section, auth gate Save, auth gate Reflect | Multiple elements matched by queries (DOM structure changed) | Narrow queries with `within()` or more specific selectors |
| 5 | `JournalMilestones.test.tsx` | 7 | Milestone at 25, fires once, tracked in localStorage, confetti type, badge name, icon, skip celebrated | Milestone celebration logic not triggering — likely threshold or event path changed | Read current milestone logic and update test expectations |
| 6 | `JournalSearchFilter.test.tsx` | 10 | Filter bar visibility, search filters (3), mode filter (2), sort toggle, combined filtering, clear filters, search+mode AND | Multiple element queries + mode filter DOM changes | Narrow queries; update selectors to match current filter UI |
| 7 | `MarkAsAnsweredForm.test.tsx` | 3 | Expand form, confirm with text, cancel | Label text changed from "Share how God answered this prayer" to "Share how God answered this prayer (optional):" | Update `getByLabelText` queries to match current label text |
| 8 | `MeditateLanding.test.tsx` | 1 | Logged-in user clicking card navigates to route | Navigation target or auth gating changed | Verify current route behavior and update assertion |
| 9 | `MyBiblePage.test.tsx` | 2 | Renders hero with gradient heading, SEO correct title | Duplicate "My Bible" headings — likely added sr-only heading in BB-35 | Use specific heading role/level queries |
| 10 | `BibleSearchMode.test.tsx` | 1 | aria-describedby linking to status | BB-35 connected hint via `aria-describedby`; test expects old state | Update assertion to match current accessible state |
| 11 | `streakStore.test.ts` | 1 | 2-day gap without grace | Grace logic returns `'used-grace'` instead of expected `'reset'` | Update test to match shipped grace behavior |

### Flaky failures (1 test each, pass individually)

| # | File | Test Name | Root Cause | Proposed Resolution |
|---|------|-----------|------------|---------------------|
| F1 | `WelcomeWizard.test.tsx` | keyboard: Tab navigates, Enter/Space activates | Focus state flaky in jsdom full-suite run | Investigate; may need `await waitFor` or skip with reason |
| F2 | `useNotifications.test.ts` | returns notifications sorted newest first | Mock data ordering affected by parallel test runs | Investigate sort stability; may need deterministic timestamps |

---

## 1C. Orphaned Files

| # | File | Detection Method 1 | Detection Method 2 | Resolution |
|---|------|--------------------|---------------------|------------|
| 1 | `HighlightsNotesSection.tsx` | File not found | File not found | Already resolved — does not exist |
| 2 | `SegmentedControl.tsx` | File not found | File not found | Already resolved — does not exist |

**Systematic scan (Step 6 — knip + grep dual verification):**

| # | File | Knip | Grep | Resolution |
|---|------|------|------|------------|
| 3 | `src/components/bible/BookNotFound.tsx` | Unused | No imports | Deleted — pre-redesign component |
| 4 | `src/components/bible/ChapterNav.tsx` | Unused | No imports | Deleted — replaced by ReaderChapterNav |
| 5 | `src/components/bible/ChapterPlaceholder.tsx` | Unused | No imports | Deleted — pre-redesign component |
| 6 | `src/components/bible/ChapterSelector.tsx` | Unused | No imports | Deleted — pre-redesign component |
| 7 | `src/components/audio/__tests__/helpers.ts` | Unused | No imports | Deleted — test helper not used by any test |
| 8 | `src/components/index.ts` | Unused | No barrel imports | Deleted — unused barrel export |
| 9 | `src/components/social/index.ts` | Unused | No barrel imports | Deleted — unused barrel export |
| 10 | `src/components/ui/index.ts` | Unused | No barrel imports | Deleted — unused barrel export |
| 11 | `src/lib/accessibility/index.ts` | Unused | No barrel imports | Deleted — unused barrel export |
| 12 | `src/lib/notifications/index.ts` | Unused | No barrel imports | Deleted — unused barrel export |
| — | `scripts/*` (7 files) | Unused | N/A — CLI entry points | Kept — build/utility scripts run directly, not imported |
| — | `src/sw.ts` | Unused | N/A — SW entry point | Kept — service worker source compiled separately |

---

## 1D. Deprecated Patterns

| # | Pattern | Grep Result | Resolution |
|---|---------|-------------|------------|
| 1 | `animate-glow-pulse` | Zero matches in src/ | Already clean |
| 2 | Cyan textarea borders | Zero matches | Already clean |
| 3 | Italic Lora prompts | Zero matches | Already clean |
| 4 | `GlowBackground` on Daily Hub | Zero matches on Daily Hub (only used on homepage StatsBar + DashboardPreview — valid usage) | Already clean |
| 5 | `BackgroundSquiggle` on Daily Hub | Zero matches on Daily Hub (only on AskPage — valid usage) | Already clean |
| 6 | `Caveat` on headings | Used in `gradients.tsx` GRADIENT_TEXT_STYLE (valid) + test assertions. Caveat is the current heading font — NOT deprecated. | Already clean |
| 7 | BibleSearchMode cyan glow | Not present (uses white borders) | Already clean |
| 8 | `as any` in src/ (non-test) | 1 match: `ResultsMap.tsx:16` — Leaflet icon URL fix | Accepted — standard Leaflet workaround, no alternative API |
| 9 | `as unknown as` in src/ (non-test) | 6 matches — 4× `inert` attribute typing, 1× `webkitSpeechRecognition`, 1× `periodicSync` API, 1× validated parse result | Accepted — all are workarounds for missing/incomplete TypeScript DOM types |
| 10 | `@ts-ignore` in src/ | Zero matches | Already clean |
| 11 | `@ts-expect-error` in src/ | Zero matches | Already clean |

---

## 1E. Dead Code

**Step 6 scan:** No significant dead code found. The knip report identified 12 unused exports and 70 unused exported types, but these are:
- Unused exports: mostly barrel re-exports, utility functions reserved for Phase 3, or test helper exports (`_resetCacheForTesting`). All are intentional or future-facing.
- Unused types: Props interfaces exported for type-safety (standard React pattern). Not worth deleting.

---

## 1F. TypeScript Strictness

| # | File | Line | Issue | Resolution |
|---|------|------|-------|------------|
| 1 | `ResultsMap.tsx` | 16 | `(L.Icon.Default.prototype as any)._getIconUrl` | Accepted — Leaflet private API access for icon fix, no typed alternative |
| 2 | `PrayerComposer.tsx` | 75 | `inert: '' as unknown as string` | Accepted — React doesn't type `inert` attribute (DOM spec mismatch) |
| 3 | `CommentsSection.tsx` | 43 | `inert: '' as unknown as string` | Accepted — same `inert` workaround |
| 4 | `QotdComposer.tsx` | 56 | `inert: '' as unknown as string` | Accepted — same `inert` workaround |
| 5 | `InlineComposer.tsx` | 107 | `inert: '' as unknown as string` | Accepted — same `inert` workaround |
| 6 | `useVoiceInput.ts` | 42 | `window as unknown as Record<string, unknown>` | Accepted — webkitSpeechRecognition not in standard TypeScript DOM types |
| 7 | `importValidator.ts` | 169 | `parsed as unknown as BibleExport` | Accepted — cast after Zod validation, type is guaranteed by schema |
| 8 | `scheduler.ts` | 119 | `registration as unknown as { periodicSync: ... }` | Accepted — Periodic Background Sync API not yet in TypeScript DOM types |

**Summary:** Zero `@ts-ignore`/`@ts-expect-error`. 8 type assertions, all justified and documented. No remediation needed.

---

## 1G. Deferred/Skipped Tests

| Scan | Result |
|------|--------|
| `it.skip` / `describe.skip` | Zero matches |
| `xit` / `xdescribe` | Zero matches |
| `TODO: BB-37` / `FIXME: BB-37` | Zero matches |

**Conclusion:** No deferred tests found. BB-41 integration tests were never written, not skipped.
