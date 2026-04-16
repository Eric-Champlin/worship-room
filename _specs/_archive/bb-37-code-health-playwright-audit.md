# BB-37: Code Health + Playwright Full Audit

**Master Plan Reference:** N/A — standalone cleanup-and-verification spec on `bible-redesign` branch

**Branch:** `bible-redesign` (no new branch — all work commits directly here)

**Depends on:**
- BB-36 (Performance — shipped) — performance optimizations must be in their final state before the code health sweep begins
- BB-35 (Accessibility audit — shipped) — accessibility remediation patterns must be in place before code health cleanup starts touching the same files
- BB-34 (Empty states & first-run — shipped)
- BB-33 (Animations & micro-interactions — shipped)
- BB-30 through BB-46 (the feature wave must be complete) — code health is the sweep-up that catches accumulated debt from the entire wave
- The pre-existing lint baseline (21 problems as of BB-39), the pre-existing failing test baseline (44 failing tests in 7 files), and the orphaned files and deprecated patterns accumulated across the wave

**Hands off to:**
- BB-37b (Bible Wave Integrity Audit) — the higher-level audit that verifies the wave holds together as a system, runs after BB-37 closes out individual-spec-level debt
- A future post-launch observability spec if monitoring, error tracking, or analytics are eventually needed
- A future automated testing infrastructure spec if CI-level performance budgets, accessibility gates, or visual regression testing are eventually added

---

## Overview

Worship Room promises a sanctuary for emotional healing and spiritual support. That sanctuary rests on a codebase that must be clean, consistent, and trustworthy — every lint warning, failing test, and orphaned file erodes the team's ability to ship confidently and iterate quickly. BB-37 is the sweep-up spec that closes out every piece of accumulated technical debt from the BB-30 through BB-46 wave, runs the deferred integration tests that earlier specs couldn't exercise in jsdom, and produces a comprehensive Playwright verification of every major surface in the app. After BB-37 ships, the codebase is in the cleanest state it's been since the wave started.

This is a cleanup-and-verification spec, not a new-feature spec. The explicit goal is "close out accumulated debt so BB-37b can verify the wave holds together as a system without being distracted by noise." BB-37 fixes the specific known issues that individual specs flagged but couldn't address within their own scope. It does NOT rewrite, refactor, or redesign anything — it tidies.

## User Story

As a **developer maintaining Worship Room**, I want **all accumulated technical debt from the BB-30–BB-46 wave resolved, all deferred integration tests implemented, and a comprehensive end-to-end verification completed** so that **the codebase is in a known-good state and BB-37b can focus on system-level integrity without being distracted by individual-spec-level noise**.

## Requirements

### Workstream 1: Debt Audit

A systematic inventory of all accumulated technical debt at `_plans/recon/bb37-debt-audit.md`, covering six categories. The complete audit must exist before any remediation begins.

#### 1A. Lint Baseline Resolution

1. The BB-39 lint baseline was 21 problems (16 errors, 5 warnings). Every one of these must reach a terminal state
2. Each lint problem is listed with its file, line, rule, and resolution: **fixed**, **accepted** (eslint-disable with comment explaining why), or **deferred** (to a documented follow-up with specific scope)
3. After BB-37 ships, `pnpm lint` returns zero problems that aren't explicitly accepted with a comment

#### 1B. Failing Test Baseline Resolution

4. The BB-39 test baseline was 44 failing tests across 7 files. Every one must reach a terminal state
5. Each failing test is listed with its file, test name, current failure reason, and resolution: **fixed**, **deleted** (feature no longer exists), **updated** (assertions match current shipped behavior), **skipped** (`.skip()` with TODO comment explaining what blocks it), or **deferred** (to a documented follow-up)
6. After BB-37 ships, `pnpm test` returns zero failing tests that aren't explicitly `.skip()` with a reason comment
7. Pre-existing failing tests are NOT preserved as a frozen baseline — BB-37 is where that baseline gets resolved

#### 1C. Orphaned Files Sweep

8. `HighlightsNotesSection.tsx` is deleted (orphaned per BB-38 recon)
9. `SegmentedControl.tsx` is deleted (orphaned per BB-38 recon)
10. A systematic scan (combination of manual grep and optionally `npx knip` or `npx ts-prune` without permanent install) identifies any other `.tsx`, `.ts`, `.css`, or asset files that exist but are never imported anywhere
11. Test files for deleted components are identified and deleted
12. Every orphaned file is verified to be truly unreachable using at least two methods (static analysis AND manual grep) before deletion. If any method says "this is used," don't delete

#### 1D. Deprecated Patterns Sweep

13. `animate-glow-pulse` — any remaining usages identified and removed
14. Cyan textarea borders — any remaining usages identified and replaced with current pattern
15. Italic Lora prompts — any remaining usages identified and replaced with Inter sans white
16. The deprecated cyan glow on `BibleSearchMode.tsx` specifically flagged by BB-38 — removed
17. Any `GlowBackground` usage on Daily Hub pages (homepage-only per Round 3) — identified and removed
18. Any Caveat font usage on headings (logo-only per Round 3) — identified and removed
19. `BackgroundSquiggle` usage on Daily Hub pages — identified and removed
20. Soft-shadow 8px-radius cards — any remaining usages identified and replaced

#### 1E. Dead Code Sweep

21. Unused imports, unused variables, unused function parameters identified and removed
22. Commented-out code blocks that have been commented out for more than one spec — identified and removed
23. Stale TODO comments (the TODO has been addressed but the comment wasn't removed) — identified and removed
24. Each item is fixed or accepted as "intentional for future use" with a comment explaining why

#### 1F. TypeScript Strictness Gaps

25. `any` types added during the wave that should be tightened — identified and fixed
26. `as unknown as` casts that bypass type checking — identified and either fixed or documented
27. `@ts-ignore` and `@ts-expect-error` directives without justification comments — either given a comment or removed
28. The few that genuinely need `any` (untyped third-party APIs, deeply dynamic data) get a comment explaining why

### Workstream 2: Debt Remediation

29. Every item in the debt audit receives its documented resolution — no item left in an ambiguous state
30. After remediation, `pnpm lint` returns zero unexplained problems
31. After remediation, `pnpm test` returns zero failing tests that aren't explicitly `.skip()` with a reason
32. After remediation, `pnpm build` succeeds with zero TypeScript errors and zero warnings

### Workstream 3: Playwright Full-Audit Sweep

A comprehensive Playwright verification covering every major route, producing a report at `_plans/recon/bb37-playwright-full-audit.md`.

#### Routes to verify (25 total):

| # | Route | Description |
|---|-------|-------------|
| 1 | `/` | Landing page — hero, first-run welcome detection |
| 2 | `/` (authenticated) | Dashboard — echo card, streak display, garden |
| 3 | `/bible/john/3?verse=16` | Bible reader — deep-linked verse, ReaderChrome, verse selection, action menu |
| 4 | `/bible/genesis/1` | Bible reader — chapter-to-chapter navigation |
| 5 | `/bible` | Bible landing — book browser, search mode entry point |
| 6 | `/bible?mode=search&q=love` | Bible search — full-text search with BB-42 index |
| 7 | `/bible/my` | My Bible — heatmap, progress map, memorization deck, echoes, activity feed |
| 8 | `/daily?tab=devotional` | Daily Hub devotional — devotional content, echo card |
| 9 | `/daily?tab=pray` | Daily Hub pray — prayer composer, drafts |
| 10 | `/daily?tab=journal` | Daily Hub journal — journal entry composer |
| 11 | `/daily?tab=meditate` | Daily Hub meditate — meditation options |
| 12 | `/ask` | Ask page — AI interaction surface |
| 13 | `/prayer-wall` | Prayer Wall — community feed |
| 14 | `/prayer-wall/user/:id` | Prayer Wall profile — individual user profile |
| 15 | `/settings` | Settings — notifications section, preferences |
| 16 | `/accessibility` | Accessibility statement (BB-35) |
| 17 | `/grow` or `/bible/plans` | Grow page — reading plans list |
| 18 | `/insights` | Insights — mood trends, reading patterns |
| 19 | `/friends` | Friends — social connections |
| 20 | `/leaderboard` | Leaderboard — global and friends rankings |
| 21 | `/music` | Music page — ambient sounds, scripture audio |
| 22 | `/register` | Register page — signup flow |
| 23 | `/` (fresh localStorage) | First-run welcome — BB-34 welcome appearance |
| 24 | `/nonexistent-route` | 404 page |
| 25 | (offline state) | Navigate with network disabled — BB-39 offline indicator |

#### Checks per route:

33. Page renders without console errors
34. Core Web Vitals within bounds: LCP under 2.5s, INP under 200ms, CLS under 0.1
35. Accessibility tree has proper landmarks, headings, and ARIA labels
36. Keyboard navigation works (Tab, Shift+Tab, Enter, Escape)
37. All interactive elements have accessible names
38. No horizontal overflow at any breakpoint (375px, 768px, 1440px)
39. The page's primary action or flow completes successfully
40. Dynamic content updates are announced properly

### Workstream 4: Deferred Integration Tests

41. **BibleReader contextual prompt trigger test** — Playwright spec at `frontend/tests/integration/`. When `recordReadToday()` returns `delta: 'same-day'` on the second reading session of the day, the notification permission prompt appears on the BibleReader page
42. **SW notificationclick deep-link test** — Playwright spec at `frontend/tests/integration/`. When a push notification is clicked, the service worker's `notificationclick` handler extracts the target URL from `data.url` and either focuses an existing client window or opens a new one at that URL
43. Any other deferred tests discovered by grepping for `it.skip`, `describe.skip`, `xit`, `xdescribe`, and `TODO: BB-37` across the test codebase — each either implemented or documented as a continued skip with a clear reason
44. If either BB-41 deferred test reveals a real bug, the bug is fixed within BB-37's scope

### Workstream 5: Process Lessons & Final State

45. A process lessons document at `frontend/docs/process-lessons.md` capturing wave-level lessons: BB-33's completeness gap from not grepping after token migration, BB-35's "verify" terminal state ambiguity, BB-35's BibleReader layout exception, BB-36's measurement discipline, and any other patterns worth documenting
46. A final state document at `_plans/recon/bb37-final-state.md` recording: lint baseline, test baseline, orphaned files status, deprecated patterns status, Playwright audit summary, deferred integration test results, bundle size, Lighthouse scores, process lessons link, and all follow-up items deferred to BB-37b or future specs

### Non-Functional Requirements

- **Performance:** Bundle size after BB-37 is smaller or equal to the BB-36 baseline (dead code removal and orphan deletion should shrink it)
- **Accessibility:** Lighthouse Accessibility scores from BB-36's final measurements do not regress
- **No regressions:** All BB-30 through BB-36 tests continue to pass (net of tests explicitly deleted, updated, or skipped during remediation)

## Auth Gating

N/A — BB-37 makes no user-facing changes. Zero new auth gates. Zero changes to existing auth behavior.

## Responsive Behavior

N/A — BB-37 makes no UI changes. The Playwright audit verifies existing responsive behavior at 375px, 768px, and 1440px but does not modify it.

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** No behavior changes
- **Logged-in users:** No behavior changes
- **localStorage usage:** Zero new keys. No changes to existing schemas
- **Route type:** N/A — no new routes

## Completion & Navigation

N/A — standalone cleanup spec, not a Daily Hub feature.

## Design Notes

- No visual changes. No changes to design system tokens or Tailwind configuration
- The deprecated patterns sweep references patterns documented in `.claude/rules/09-design-system.md` § "Round 3 Visual Patterns" and § "Daily Hub HorizonGlow Architecture"
- Deprecated pattern replacements use current design system values, not new patterns
- No new visual patterns introduced

## Out of Scope

- **No new features.** Pure cleanup and verification
- **No architectural refactors.** Issues flagged as follow-ups, not restructured in place
- **No refactoring of working code.** "Could be cleaner" is not a reason to change anything
- **No changes to feature behavior.** User-visible experience is identical before and after
- **No changes to the audio cluster (BB-26–29, BB-44).** Blocked on FCBH API key, out of scope
- **No changes to Bible data or content.** Scripture text, devotionals, reading plans, prayer prompts all stay as shipped
- **No changes to existing localStorage schemas.** Data migrations are out of scope
- **No changes to BB-33 animation system, BB-34 empty state copy, BB-35 accessibility patterns, or BB-36 performance optimizations.** Those specs are finalized
- **No new npm packages.** One-off tool invocations via `npx` are allowed without installation
- **No backend changes.** Pure client-side
- **No changes to user-facing copy.** All spec-approved text stays
- **No changes to design system tokens or Tailwind configuration**
- **No changes to BB-40 SEO metadata**
- **No changes to BB-39 PWA manifest or service worker** beyond the deferred notificationclick integration test
- **No CI pipeline changes**
- **No rewriting of any spec, plan, or recon document.** Earlier wave artifacts are history
- **No new automated testing infrastructure.** No CI integration, performance budgets, or visual regression testing

## Acceptance Criteria

### Debt Audit
- [ ] A complete debt audit document exists at `_plans/recon/bb37-debt-audit.md` listing every lint problem, failing test, orphaned file, deprecated pattern, dead code item, and TypeScript strictness gap
- [ ] Every item in the audit has a resolution: fixed, explicitly accepted with a comment, deferred to a documented follow-up, or deleted

### Lint
- [ ] `pnpm lint` returns zero unexplained problems (accepted problems have `eslint-disable` comments with reasons)
- [ ] The 21 pre-existing lint problems from the BB-39 baseline are all resolved (fixed, accepted, or deferred)

### Tests
- [ ] `pnpm test` returns zero failing tests that aren't explicitly `.skip()` with a reason comment
- [ ] The 44 pre-existing failing tests from the BB-39 baseline are all resolved (fixed, deleted, updated, skipped with reason, or deferred)
- [ ] All BB-30 through BB-36 tests continue to pass unchanged (net of tests explicitly deleted, updated, or skipped)

### Orphaned Files
- [ ] All orphaned files identified in the audit are deleted (after dual-method verification)
- [ ] `HighlightsNotesSection.tsx` specifically is deleted
- [ ] `SegmentedControl.tsx` specifically is deleted

### Deprecated Patterns
- [ ] All deprecated patterns identified in the audit are replaced or removed
- [ ] The deprecated cyan glow on `BibleSearchMode.tsx` specifically is removed

### Playwright Full Audit
- [ ] A Playwright full-audit report exists at `_plans/recon/bb37-playwright-full-audit.md` covering all 25 routes
- [ ] Each route checked for: console errors, Core Web Vitals, accessibility tree, keyboard navigation, responsive behavior at 375/768/1440, primary flow completion

### Deferred Integration Tests
- [ ] BibleReader contextual prompt trigger integration test exists at `frontend/tests/integration/` and runs in Playwright
- [ ] SW notificationclick deep-link integration test exists at `frontend/tests/integration/` and runs in Playwright
- [ ] If either test reveals a bug, the bug is fixed
- [ ] Any other deferred tests (`it.skip`, `xit`, `TODO: BB-37`) are either implemented or documented as continued skips

### Build Health
- [ ] No TypeScript errors (`pnpm build` succeeds with zero errors, zero warnings)
- [ ] No new lint warnings (strictly zero)
- [ ] Bundle size after BB-37 is smaller or equal to the BB-36 baseline
- [ ] Lighthouse Performance, Accessibility, Best Practices, and SEO scores do not regress from BB-36

### Documentation
- [ ] `frontend/docs/process-lessons.md` exists and is committed
- [ ] `_plans/recon/bb37-debt-audit.md` exists and is committed
- [ ] `_plans/recon/bb37-playwright-full-audit.md` exists and is committed
- [ ] `_plans/recon/bb37-final-state.md` exists and is committed as the handoff document to BB-37b
- [ ] All follow-up items deferred from BB-37 are documented with clear scope and priority

### Guardrails
- [ ] Zero new auth gates
- [ ] Zero new localStorage keys
- [ ] No user-facing behavior changes from the shipped state of BB-36

## Notes for Execution

- **The debt audit is the load-bearing step.** The complete audit must exist before any remediation begins. Without it, BB-37 becomes a collection of spot fixes that misses systemic issues.
- **Apply the process lessons from every prior spec.** BB-33: grep verification at the end. BB-35: "verify" is not a terminal state — everything must reach a terminal state. BB-36: measure before and after, not assume.
- **Be aggressive about deletion but cautious about verification.** Every deletion preceded by dual-method verification. If any method says "this is used," don't delete.
- **Don't let the debt audit turn into a rewrite.** The charter is tidying. If the audit surfaces a file that "needs refactoring," flag it as a follow-up and move on.
- **The Playwright full-audit sweep is the most time-consuming step.** Plan phase should allocate time explicitly. If a route reveals an issue, it gets investigated and either fixed or documented.
- **The deferred BB-41 tests may reveal real bugs.** Fix within BB-37's scope — don't punt to BB-37b.
- **The final state document is the handoff to BB-37b.** Must be thorough and accurate. BB-37b starts from this document.
- **Pre-existing failing tests are NOT preserved anymore.** Every test must reach a terminal state.

## Pre-Execution Checklist

1. BB-36 is shipped and committed
2. The full debt audit is produced at `_plans/recon/bb37-debt-audit.md` before any remediation begins (pending recon)
3. Every item in the audit has a proposed resolution before execution starts
4. The Playwright full-audit route list is confirmed (25-route list above)
5. The BB-41 deferred integration tests are scoped and expected behavior documented
6. Any new deferred items discovered during the audit are triaged: fix now, skip with reason, or defer to BB-37b
7. The process lessons document content is drafted during recon
8. The orphan file detection method is chosen and documented
9. Stay on `bible-redesign` branch — no new branch, no merge
10. Zero new auth gates, zero new localStorage keys, zero new npm packages
11. The Lighthouse baseline from BB-36 is on hand as the reference
12. The pre-existing failing test baseline (44 tests in 7 files) is the input to the remediation pass, not a frozen baseline to preserve
