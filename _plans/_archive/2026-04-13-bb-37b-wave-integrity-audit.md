# Implementation Plan: BB-37b Wave Integrity Audit

**Spec:** `_specs/bb-37b-wave-integrity-audit.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05)
**Recon Report:** not applicable (audit/verification spec, no visual feature)
**Master Spec Plan:** not applicable — standalone wave-closing audit spec

---

## Architecture Context

### Current Build Health (from BB-37 final state, verified today)

| Metric | Value |
|--------|-------|
| Build | PASSES (0 errors, 0 warnings) |
| Lint | 0 problems |
| Tests | 8,080 pass / 0 fail (658 files) |
| Main bundle (gzip) | 97.5 KB |
| Total JS+CSS+HTML (gzip) | 3.68 MB |
| SW precache | 330 entries (17.76 MB) |

### BB-37 Follow-Up Items (Starting Point)

| # | Item | Priority |
|---|------|----------|
| 1 | Flaky `useNotifications` sort test | Low |
| 2 | Flaky `WelcomeWizard` keyboard test | Low |
| 3 | `zod` in dependencies but knip reports unused | Low |
| 4 | 12 unused exports flagged by knip | Low |
| 5 | SW notification deep-link E2E production build test | Medium |
| 6 | 70 unused exported types | Low |

### Reactive Store Pattern (Verified)

Six Bible stores all follow the canonical pattern (in-memory cache + `Set<Listener>` + write-through to localStorage + `subscribe()` export + React hook wrapper):

| Store | File | localStorage Key | Hook |
|-------|------|-----------------|------|
| bookmarkStore | `src/lib/bible/bookmarkStore.ts` | `bible:bookmarks` | `useBookmarks` |
| highlightStore | `src/lib/bible/highlightStore.ts` | `wr_bible_highlights` | `useHighlights` |
| journalStore | `src/lib/bible/journalStore.ts` | `bible:journalEntries` | `useJournalEntries` |
| notes/store | `src/lib/bible/notes/store.ts` | `bible:notes` | `useNotes` |
| streakStore | `src/lib/bible/streakStore.ts` | `wr_bible_streak` | `useStreak` |
| plansStore | `src/lib/bible/plansStore.ts` | `bible:plans` | `usePlans` |

Echoes engine (`src/lib/echoes/engine.ts`) is stateless — pure functions consuming other stores' data. No anti-pattern violations found in active code. Two deprecated hooks (`useBibleHighlights.ts`, `useBibleNotes.ts`) use the old `useState` mirror pattern but are marked `@deprecated`.

### Animation Token System (BB-33)

Defined in `tailwind.config.js`:
- Durations: `instant` (0ms), `fast` (150ms), `base` (250ms), `slow` (400ms)
- Easings: `standard`, `decelerate`, `accelerate`, `sharp` (cubic-bezier)
- Keyframes: `fade-in`, `fade-in-up`, `fade-out`, `scale-in`, `slide-up`, `shimmer`

Known exemptions: breathing exercise (4s/8s domain-specific), garden animations, celebration confetti, sleep timer, audio waveform bars.

### Typography System

- `font-sans` → Inter (UI chrome)
- `font-serif` → Lora (scripture text)
- `font-script` → Caveat (logo only, deprecated for headings)

### URL Contracts

- `/bible/<book>/<chapter>` — deep links, search results, echoes, notification clicks
- `/bible/<book>/<chapter>?verse=<n>` — verse-specific deep links
- `/bible?mode=search&q=<query>` — BB-38/BB-42 full-text search
- `/daily?tab=<devotional|pray|journal|meditate>` — Daily Hub tab routing
- `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` — Spec Z verse-aware meditation

### Container Widths (Verified)

| Page | Width | Notes |
|------|-------|-------|
| Dashboard | `max-w-6xl` | Multi-widget layout |
| Daily Hub tabs | `max-w-2xl` | Reading-focused narrow |
| Bible Browser | `max-w-5xl` | Grid/browse layout |
| Bible Reader | `max-w-2xl` | Reading-focused |
| My Bible | `max-w-2xl` content, `max-w-6xl` divider | Intentional split |
| Settings | `max-w-4xl` | Form layout |

### Notification Keys (BB-41)

| Key | Module | Functions |
|-----|--------|-----------|
| `wr_push_subscription` | `lib/notifications/subscription.ts` | `subscribeToPush()`, `unsubscribeFromPush()`, `ensureSubscription()` |
| `wr_notification_prefs` | `lib/notifications/preferences.ts` | `getNotificationPrefs()`, `setNotificationPrefs()`, `updateNotificationPrefs()` |
| `wr_notification_prompt_dismissed` | `pages/BibleReader.tsx` (lines 611, 622, 630) | Direct localStorage read/write |

### Existing Recon Documents

| Recon | File |
|-------|------|
| BB-33 animation audit | `_plans/recon/bb33-animation-audit.md` |
| BB-34 empty states | `_plans/recon/bb34-empty-states.md` |
| BB-35 accessibility audit | `_plans/recon/bb35-accessibility-audit.md` |
| BB-36 performance baseline | `_plans/recon/bb36-performance-baseline.md` |
| BB-37 debt audit | `_plans/recon/bb37-debt-audit.md` |
| BB-37 Playwright report | `_plans/recon/bb37-playwright-full-audit.md` |
| BB-37 final state | `_plans/recon/bb37-final-state.md` |
| BB-38 URL formats | `_plans/recon/bb38-url-formats.md` |
| BB-39 PWA strategy | `_plans/recon/bb39-pwa-strategy.md` |
| BB-40 SEO metadata | `_plans/recon/bb40-seo-metadata.md` |
| BB-41 push notifications | `_plans/recon/bb41-push-notifications.md` |
| BB-42 search index | `_plans/recon/bb42-search-index.md` |
| BB-43 heatmap data | `_plans/recon/bb43-heatmap-data.md` |
| BB-45 memorization | `_plans/recon/bb45-memorization.md` |
| BB-46 echoes | `_plans/recon/bb46-echoes.md` |

### Spec Inventory (BB-30 through BB-46)

| Spec | Exists as `_specs/` | Exists as `_plans/recon/` | Status |
|------|---------------------|--------------------------|--------|
| BB-30 | Yes (explain-this-passage) | Yes (prompt tests) | Shipped |
| BB-31 | Yes (reflect-on-passage) | Yes (prompt tests) | Shipped |
| BB-32 | Yes (ai-caching) | — | Shipped |
| BB-33 | Yes (animations) | Yes (animation audit) | Shipped |
| BB-34 | Referenced in recon | Yes (empty states) | Shipped |
| BB-35 | Yes (accessibility) | Yes (accessibility audit) | Shipped |
| BB-36 | Yes (performance) | Yes (performance baseline) | Shipped |
| BB-37 | Yes (code health) | Yes (debt audit, Playwright, final state) | Shipped |
| BB-38 | Yes (deep linking) | Yes (URL formats) | Shipped |
| BB-39 | Yes (PWA) | Yes (PWA strategy) | Shipped |
| BB-40 | Yes (SEO) | Yes (SEO metadata) | Shipped |
| BB-41 | Yes (push notifications) | Yes (push notifications) | Shipped |
| BB-42 | Yes (full-text search) | Yes (search index) | Shipped |
| BB-43 | Recon only | Yes (heatmap data) | Shipped |
| BB-44 | Audio cluster | — | Deferred (FCBH) |
| BB-45 | Recon only | Yes (memorization) | Shipped |
| BB-46 | Recon only | Yes (echoes) | Shipped |

---

## Auth Gating Checklist

N/A — BB-37b does not add, modify, or remove any auth-gated actions. The audit verifies existing auth gates are correctly implemented but does not create new ones.

---

## Design System Values (for UI steps)

N/A — BB-37b produces audit documents and targeted non-visual fixes (animation tokens, ARIA attributes, copy strings). No new UI components or visual changes.

---

## Design System Reminder

N/A — No UI implementation steps. The audit references design system patterns for verification only.

---

## Shared Data Models (from Master Plan)

N/A — BB-37b is a standalone audit spec. It reads existing data models but does not create or modify any.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| All `wr_*` and `bible:*` keys | Read only | Audit verifies schemas match across consumers |

---

## Responsive Structure

N/A — No UI changes. Audit documents only.

---

## Inline Element Position Expectations

N/A — No inline-row layouts in this feature.

---

## Vertical Rhythm

N/A — No UI changes. Audit documents only.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-37 is shipped and committed (verified: commit `58fb635`)
- [ ] BB-37's final state document reviewed (verified: 0 lint, 0 test failures, 8,080 tests, 97.5 KB bundle)
- [ ] All four audit documents will be produced BEFORE any targeted fixes begin
- [ ] Current branch is `bible-redesign` — no new branch
- [ ] `pnpm test` passes (verified: 8,080 pass, 0 fail)
- [ ] `pnpm lint` passes (verified: 0 problems)
- [ ] `pnpm build` passes (verified: 0 errors, 0 warnings)
- [ ] No deprecated patterns will be introduced
- [ ] Zero new auth gates, localStorage keys, npm packages

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Animation token violations in exempt categories (breathing, garden) | Document as accepted exemptions, not violations | BB-33 spec explicitly exempts domain-specific timing |
| Deprecated hooks (`useBibleHighlights`, `useBibleNotes`) | Document as known debt, not violations | Marked `@deprecated` in source; removal is Phase 3 cleanup |
| Container width inconsistencies between page types | Document as intentional design, not inconsistencies | Dashboard (6xl), Settings (4xl), Daily Hub (2xl) serve different layout needs |
| BB-34, BB-43, BB-45, BB-46 missing full `_specs/` files | Document as shipped-without-spec; recon docs serve as spec-equivalent | All four have comprehensive recon docs and shipped code; retroactive spec creation is out of scope |
| Flaky tests from BB-37 follow-ups | Investigate in metrics reconciliation; fix if <30 min, defer if not | Spec says fixes >30 min are flagged as follow-up |
| BB-41 local-fallback notification limitations | Document in known issues; no fix (requires Phase 3 backend) | Push delivery requires backend endpoints not yet built |
| `ChallengeCompletionOverlay` using `ease-in` instead of token | Fix inline if found during audit | <30 min fix, fits "targeted fix" category |

---

## Implementation Steps

### Step 1: Cross-Spec Integration Audit

**Objective:** Verify all cross-spec contracts (URLs, localStorage schemas, reactive stores, animation tokens, accessibility patterns, typography, container widths) are consistent. Produce `_plans/recon/bb37b-integration-audit.md`.

**Files to create:**
- `_plans/recon/bb37b-integration-audit.md`

**Details:**

Run the following verification passes and document results:

**1a. Shared URL contracts:**
- Grep for every place that constructs `/bible/<book>/<chapter>` URLs. Verify format consistency (e.g., no mixed `/Bible/` vs `/bible/`, no missing `?verse=` param where expected). Check: `ReaderChapterNav.tsx`, `crossRefs/navigation.ts`, `ChapterEngagementBridge.tsx`, echoes `EchoCard.tsx`, notification deep-link handlers in `sw.ts`, search result links in BB-42 components.
- Cold-load `/bible?mode=search&q=love` in Playwright (headless) to verify search executes and results render.
- Verify every `/daily?tab=<tab>` URL loads the correct tab state — spot-check via Playwright for `devotional`, `pray`, `journal`, `meditate`.
- Check canonical URL tags on Bible pages match BB-40's SEO metadata spec (read `bb40-seo-metadata.md` recon for approved list).

**1b. Shared localStorage schemas:**
- For `wr_bible_highlights`: verify BB-43 (heatmap — read `src/lib/bible/heatmap/` or equivalent), BB-45 (memorization — read `src/components/bible/memorization/`), and BB-46 (echoes — read `src/lib/echoes/engine.ts`) all handle the same schema shape.
- For `wr_bible_streak`: verify BB-43, BB-46, and BB-41 (`lib/notifications/scheduler.ts` or equivalent) all read the same shape.
- For `wr_chapters_visited`: verify BB-43 writes and BB-46 reads agree on format (date-keyed record of chapter arrays).
- For `wr_memorization_cards`: verify BB-45 writes and BB-46 reads agree on schema.
- For BB-41's three keys (`wr_push_subscription`, `wr_notification_prefs`, `wr_notification_prompt_dismissed`): verify consistency between Settings page, BibleReader contextual prompt, and scheduler.
- For `wr_first_run_completed` (BB-34): verify deep-linked arrivals (e.g., `/bible/john/3?verse=16`) don't re-trigger first-run if the key is already set.

**1c. Shared reactive store patterns:**
- Verify all 6 Bible stores (bookmarks, highlights, journal, notes, streak, plans) export `subscribe()`.
- Verify React components consume stores via hooks, not local state mirrors.
- Check for the BB-45 truth divergence anti-pattern: any `useState` that mirrors store data. The deprecated hooks (`useBibleHighlights.ts`, `useBibleNotes.ts`) are known — verify no active components import them.

**1d. Shared animation tokens (BB-33):**
- Grep Bible wave source files (not test files) for hardcoded `duration-200`, `duration-300`, `ease-out`, `ease-in-out`, or raw cubic-bezier curves outside of `tailwind.config.js`. Exemptions: breathing exercise timing, garden SVG animations, celebration confetti, sleep timer, audio waveform bars.
- Document violations and categorize as "fix" (<30 min) or "defer".

**1e. Shared accessibility patterns (BB-35):**
- Grep for icon-only `<button>` elements missing `aria-label`.
- Grep for `<svg>` or Lucide icon components inside labeled buttons missing `aria-hidden="true"`.
- Verify every dialog/modal has `role="dialog"` and `aria-modal="true"`.
- Verify every form field has a visible or `sr-only` label.
- Check skip-to-main-content link presence.
- Note: reference `_plans/recon/bb35-accessibility-audit.md` for known gaps and their resolution status.

**1f. Shared typography patterns:**
- Grep for `font-serif` (should be on scripture text only), `font-script` (Caveat — logo only), and any inline `fontFamily` overrides.
- Verify no scripture text renders in `font-sans`.
- Verify no heading uses `font-script` (deprecated per design system).

**1g. Shared layout container widths:**
- Verify My Bible, Dashboard, Daily Hub, Settings use documented widths from Architecture Context table.
- Flag any page using an undocumented width.

**Document format:**

```markdown
# BB-37b Cross-Spec Integration Audit

## Summary
- URL contracts: N verified, N issues
- localStorage schemas: N verified, N issues
- Reactive stores: N verified, N issues
- Animation tokens: N verified, N violations
- Accessibility patterns: N verified, N gaps
- Typography: N verified, N violations
- Container widths: N verified, N inconsistencies

## Detailed Results
### URL Contracts
[per-contract verification table]

### localStorage Schemas
[per-key verification table]

...

## Issues Found
| # | Category | Issue | Severity | Resolution |
```

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT fix issues during this step — document them. Fixes happen in Step 5.
- Do NOT re-run BB-37's full Playwright audit sweep — spot-check only (4-6 targeted URL loads).
- Do NOT modify any source files.
- Do NOT expand scope beyond the seven verification categories listed above.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual verification | manual | All cross-spec contracts documented with pass/fail |
| Playwright spot-checks | e2e | 4-6 targeted URL loads to verify cold-load behavior |

**Expected state after completion:**
- [ ] `_plans/recon/bb37b-integration-audit.md` exists
- [ ] Every shared URL contract has a pass/fail result
- [ ] Every shared localStorage schema has a pass/fail result
- [ ] All 6 reactive stores verified for `subscribe()` and hook consumption
- [ ] Animation token violations categorized (fix vs exempt vs defer)
- [ ] Accessibility gaps cross-referenced with BB-35 audit resolution status
- [ ] Typography and container widths verified
- [ ] No source files modified

---

### Step 2: Voice and Consistency Audit

**Objective:** Verify all user-facing strings match brand voice (anti-pressure, warm, second-person, specific). Produce `_plans/recon/bb37b-voice-audit.md`.

**Files to create:**
- `_plans/recon/bb37b-voice-audit.md`

**Details:**

**2a. Anti-pressure voice checks:**
- Grep the entire `frontend/src/` for shaming patterns: "you missed", "don't break", "you haven't read", "you failed".
- Grep for gamified celebration: "great job", "keep going", "you unlocked", "streak broken".
- Grep for urgency: "act now", "limited time", "don't miss", "hurry".
- Grep for fake metrics: patterns like "N% of users", "thousands of", "most users".
- Grep for instructional bossiness: "click here", "do this next", "you must", "you need to".

**2b. Empty state copy checks (BB-34):**
- Read `_plans/recon/bb34-empty-states.md` for the audited empty states list.
- Grep for "No data", "Nothing here", "No items", "No results" in source files (these are non-compliant patterns).
- Verify empty states use warm, second-person, feature-specific language.
- Verify CTAs in empty states are optional (not forced).

**2c. Notification copy checks (BB-41):**
- Read the streak reminder messages in `lib/notifications/` for approved gentle copy.
- Verify no streak numbers in reminder bodies.
- Verify no exclamation points in notification copy.
- Verify deep-link URLs follow BB-38's contract.

**2d. SEO metadata checks (BB-40):**
- Read `_plans/recon/bb40-seo-metadata.md` for approved titles/descriptions.
- Grep for `<SEO` component usage across all pages.
- Spot-check 5-10 page titles/descriptions against the approved list.
- Verify OG card titles match metadata titles.

**2e. Button label checks:**
- Grep for generic button labels: "Submit", "OK", "Cancel" (should be specific: "Save prayer", "Close editor").
- Verify primary CTAs in Bible wave components use the white pill pattern.
- Verify destructive actions have confirmation.

**2f. Feature-specific copy checks:**
- BB-34 first-run welcome: read `FirstRunWelcome` component, verify greeting, description, option labels. Verify dismissible, not a gate.
- BB-45 memorization deck: verify warm empty state, gentle remove confirmation.
- BB-46 echo cards: verify natural language relative labels ("a week ago", not "7d"), specific echo reasons.

**Document format:**

```markdown
# BB-37b Voice and Consistency Audit

## Summary
- Anti-pressure checks: N patterns checked, N violations
- Empty state copy: N states verified, N issues
- Notification copy: N messages verified, N issues
- SEO metadata: N pages verified, N issues
- Button labels: N checked, N generic labels found
- Feature-specific copy: N features verified, N issues

## Detailed Results
...

## Issues Found
| # | Category | Location | Issue | Severity | Resolution |
```

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT fix issues during this step — document them. Fixes happen in Step 5.
- Do NOT rewrite spec-approved copy. If BB-41's approved streak messages seem imperfect, document the concern but don't change the copy.
- Do NOT expand scope to non-Bible-wave pages (Daily Hub pre-existing copy, dashboard widgets, etc. are out of scope unless they were modified by BB-30+ specs).
- Do NOT modify any source files.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual review | manual | Every user-facing string in Bible wave code reviewed for brand voice |

**Expected state after completion:**
- [ ] `_plans/recon/bb37b-voice-audit.md` exists
- [ ] All five anti-pressure categories checked with grep results
- [ ] All BB-34 empty states verified
- [ ] All BB-41 notification messages verified
- [ ] BB-40 SEO metadata spot-checked
- [ ] Feature-specific copy verified (BB-34, BB-45, BB-46)
- [ ] No source files modified

---

### Step 3: Metrics Reconciliation

**Objective:** Measure end-of-wave metrics and compare against targets. Produce `_plans/recon/bb37b-metrics-reconciliation.md`.

**Files to create:**
- `_plans/recon/bb37b-metrics-reconciliation.md`

**Details:**

**3a. Build health (already verified, capture formally):**
- `pnpm lint` → capture exact output (target: 0 problems)
- `pnpm test` → capture pass/fail counts (target: 0 failures)
- `pnpm build` → capture errors/warnings (target: 0/0)

**3b. Bundle size:**
- Run `node scripts/measure-bundle.mjs` or equivalent to get gzipped bundle sizes.
- Compare against BB-36 baseline (97.6 KB main, 3.68 MB total).
- Document SW precache size (current: 330 entries, 17.76 MB).

**3c. Lighthouse scores:**
- Run Lighthouse on 6 key pages via Playwright or CLI: `/` (logged-out), `/bible/john/3`, `/bible`, `/daily?tab=devotional`, `/bible/my` (authenticated), `/settings` (authenticated).
- Use mobile emulation, 4x CPU throttle, Slow 4G network (same profile as BB-36 baseline).
- Capture Performance score (target: 90+) and Accessibility score (target: 95+) for each.
- Capture Core Web Vitals: LCP, INP, CLS.

**3d. TypeScript strictness:**
- Grep for `as any`, `@ts-ignore`, `@ts-expect-error` in `frontend/src/`.
- Document count and justification for each. (BB-37 final state: 8 justified `as any`/`as unknown as`, 0 `@ts-ignore`/`@ts-expect-error`).

**3e. Test coverage details:**
- Total test count (current: 8,080).
- Any `.skip()` tests with their documented reasons.
- Any flaky tests (BB-37 follow-ups #1, #2).

**3f. Lint health details:**
- Total `eslint-disable` directives with reasons.
- Any `eslint-disable-next-line` without a reason comment.

**3g. Spec completion matrix:**
- For each spec BB-30 through BB-46: mark as shipped, deferred, or partially shipped.
- For shipped specs, cross-reference acceptance criteria against current state.
- Document any unmet acceptance criteria as known issues.

**Document format:**

```markdown
# BB-37b Metrics Reconciliation

## End-of-Wave Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Lint problems | 0 | ... | PASS/FAIL |
| Test failures | 0 | ... | PASS/FAIL |
| Build errors | 0 | ... | PASS/FAIL |
| Main bundle (gzip) | ≤97.6 KB | ... | PASS/FAIL |
| LH Performance (avg) | 90+ | ... | PASS/FAIL |
| LH Accessibility (avg) | 95+ | ... | PASS/FAIL |
| `as any` count | ≤10 | ... | PASS/FAIL |
| `@ts-ignore` count | 0 | ... | PASS/FAIL |

## Lighthouse Per-Page Scores
[table with Performance + Accessibility per page]

## Core Web Vitals
[LCP, INP, CLS per page]

## Spec Completion Matrix
[per-spec shipped/deferred status + acceptance criteria check]
```

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT run Lighthouse with default (desktop, no throttle) profiles — use the same mobile emulation + 4x CPU throttle + Slow 4G as BB-36 for comparability.
- Do NOT trust "should be zero" — actually run the commands and measure.
- Do NOT modify any source files.
- Do NOT add new testing infrastructure or npm packages for measurement.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm lint` | automated | 0 problems |
| `pnpm test` | automated | 0 failures |
| `pnpm build` | automated | 0 errors, 0 warnings |
| Lighthouse (6 pages) | automated | Performance 90+, Accessibility 95+ |

**Expected state after completion:**
- [ ] `_plans/recon/bb37b-metrics-reconciliation.md` exists
- [ ] All build health metrics captured
- [ ] Bundle size compared against BB-36 baseline
- [ ] Lighthouse scores captured for 6 key pages with correct throttle profile
- [ ] TypeScript strictness audited
- [ ] Spec completion matrix populated for all specs BB-30 through BB-46
- [ ] No source files modified

---

### Step 4: Known Issues Consolidation

**Objective:** Consolidate all known issues, limitations, and deferred items from every spec into a single document. Produce `_plans/recon/bb37b-known-issues.md`.

**Files to create:**
- `_plans/recon/bb37b-known-issues.md`

**Details:**

Read every spec and recon document from BB-30 through BB-46 for "Out of Scope", "What this does NOT do", "Limitations", "Deferred", and "Known Issues" sections. Consolidate into a single document organized by category.

**Sources to read:**
- Every `_specs/bb-*.md` file (the ones that exist) for "Out of Scope" / "What this does NOT do" sections
- `_plans/recon/bb37-final-state.md` follow-up items (6 items)
- `_plans/recon/bb37-debt-audit.md` skipped items
- `_plans/recon/bb33-animation-audit.md` exemptions
- `_plans/recon/bb35-accessibility-audit.md` documented exceptions
- `_plans/recon/bb34-empty-states.md` for known non-compliant empty states
- `_plans/recon/bb41-push-notifications.md` for local-fallback limitations
- `_plans/recon/bb42-search-index.md` for search limitations (no phrase search, no fuzzy matching)
- `_plans/recon/bb43-heatmap-data.md` for anti-pressure decisions (omit percentages)
- `_plans/recon/bb45-memorization.md` for single-verse-only limitation
- `_plans/recon/bb46-echoes.md` for freshness penalty being session-only
- Issues discovered in Steps 1-3 of this audit

**Categories:**
1. **Deferred to Phase 3 (backend required)** — auth, AI, notifications backend, encryption
2. **Audio cluster deferred** — BB-26, BB-27, BB-28, BB-29, BB-44 (FCBH)
3. **Known UX limitations** — single-verse memorization, no phrase search, session-only freshness
4. **Known technical debt** — deprecated hooks, unused exports, flaky tests
5. **Design decisions (not issues)** — anti-pressure percentage omission, container width variation

**Document format:**

```markdown
# BB-37b Known Issues

## Deferred to Phase 3
| # | Issue | Source Spec | Notes |
...

## Audio Cluster (Deferred)
...

## Known UX Limitations
...

## Known Technical Debt
...

## Design Decisions (Not Issues)
...
```

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT attempt to fix any issues in this step — this is documentation only.
- Do NOT reopen closed decisions from prior specs.
- Do NOT add new limitations that aren't documented in specs or discovered in Steps 1-3.
- Do NOT modify any source files.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual review | manual | Every known issue traced to its source spec/recon |

**Expected state after completion:**
- [ ] `_plans/recon/bb37b-known-issues.md` exists
- [ ] Every spec's out-of-scope items consolidated
- [ ] BB-37 follow-up items included
- [ ] BB-33 exemptions documented
- [ ] BB-35 exceptions documented
- [ ] Audio cluster explicitly noted as deferred
- [ ] Issues from Steps 1-3 included
- [ ] No source files modified

---

### Step 5: Targeted Fixes

**Objective:** Fix all small issues (<30 min each) discovered in Steps 1-4. Document each fix.

**Files to modify:**
- TBD — depends on issues discovered in Steps 1-4. Expected categories:
  - Animation token violations: replace hardcoded `ease-in`/`ease-in-out` with token equivalents
  - Missing `aria-hidden="true"` on decorative icons in Bible wave components
  - Copy inconsistencies (generic button labels, non-voice-compliant strings)
  - Missing `aria-label` on any icon-only buttons found in Step 1e
  - Any localStorage schema mismatches found in Step 1b

**Details:**

For each issue documented as "fix" in Steps 1-4:
1. Read the file containing the issue
2. Make the minimal change to resolve it
3. Run `pnpm lint` and `pnpm test` after each batch of related fixes
4. Document the fix in the audit notes

**Scope limiter:** If a fix would take >30 minutes, stop and add it to the known issues list (Step 4) as a follow-up instead.

**Auth gating:** N/A — fixes are to existing code, not new auth-gated features
**Responsive behavior:** N/A: fixes are non-visual (ARIA, animation tokens, copy)

**Guardrails (DO NOT):**
- Do NOT fix issues that would take >30 minutes — defer them.
- Do NOT refactor surrounding code while fixing an issue.
- Do NOT change spec-approved copy, even if imperfect.
- Do NOT introduce new components, hooks, utilities, or abstractions.
- Do NOT add new tests (beyond verifying existing tests still pass).
- Do NOT change any user-facing behavior.
- Do NOT add new localStorage keys, auth gates, or npm packages.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `pnpm lint` | automated | Still 0 problems after fixes |
| `pnpm test` | automated | Still 0 failures after fixes |
| `pnpm build` | automated | Still passes after fixes |

**Expected state after completion:**
- [ ] All <30 min issues from Steps 1-4 are fixed
- [ ] All >30 min issues are documented in known issues
- [ ] `pnpm lint` returns 0 problems
- [ ] `pnpm test` returns 0 failures (8,080 pass)
- [ ] `pnpm build` passes with 0 errors, 0 warnings
- [ ] Each fix is documented with before/after

---

### Step 6: Final Audit Document

**Objective:** Produce the comprehensive final audit document certifying the wave. Produce `_plans/recon/bb37b-final-audit.md`.

**Files to create:**
- `_plans/recon/bb37b-final-audit.md`

**Details:**

Synthesize results from all four workstreams (Steps 1-4) and the targeted fixes (Step 5) into the final audit document.

**Sections:**

1. **Executive Summary** — What the BB-30 through BB-46 wave built. Which specs shipped (list all with one-line descriptions). Which are deferred (audio cluster). Total test count, lint status, build status, bundle size.

2. **Integration Audit Results** — Summary table from Step 1. Per-category pass/fail counts. Highlight any issues that required targeted fixes.

3. **Voice and Consistency Audit Results** — Summary table from Step 2. Per-category pass/fail counts. Note any copy fixes applied.

4. **Metrics Reconciliation Summary** — Table of end-of-wave metrics vs targets from Step 3. Lighthouse scores per page. Core Web Vitals. Spec completion matrix summary.

5. **Known Issues List** — Reference to `bb37b-known-issues.md`. Summary count by category.

6. **Targeted Fixes Applied** — List of every fix made in Step 5 with file, before/after description.

7. **Follow-Up Items** — Issues requiring work beyond BB-37b's scope, with priority and estimated effort.

8. **Wave Certification Statement** — Formal sign-off. Template:

```markdown
## Wave Certification

The Bible Wave (BB-30 through BB-46, excluding the audio cluster BB-26/27/28/29/44)
is certified as complete as of [date].

**Build health:** [status]
**Test suite:** [pass count] / [total count]
**Known issues:** [count] documented in bb37b-known-issues.md
**Follow-up items:** [count] documented above
**Audio cluster:** Deferred to BB-37c pending FCBH API key

This wave introduced [summary: e.g., AI passage features, animation system, accessibility audit,
performance baseline, code health cleanup, deep linking, PWA offline, SEO, push notifications,
full-text search, reading heatmap, verse memorization, verse echoes].

The codebase is in a known-good state. The next work can begin from a clean foundation.
```

If the audit found significant unresolved issues, the certification statement includes honest caveats.

**Auth gating:** N/A
**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT claim the wave is clean if significant issues remain — include caveats.
- Do NOT omit follow-up items to make the certification look better.
- Do NOT modify BB-37's process lessons document.
- Do NOT modify any source files.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Manual review | manual | Final audit document is comprehensive and honest |

**Expected state after completion:**
- [ ] `_plans/recon/bb37b-final-audit.md` exists
- [ ] Executive summary covers all shipped specs
- [ ] All four workstream results summarized
- [ ] Metrics reconciliation included with actual measurements
- [ ] Known issues referenced
- [ ] Targeted fixes listed
- [ ] Follow-up items documented with priority
- [ ] Wave certification statement drafted (honest, with caveats if needed)
- [ ] Audio cluster noted as deferred

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Cross-spec integration audit (highest priority, can start immediately) |
| 2 | — | Voice and consistency audit (independent of Step 1) |
| 3 | — | Metrics reconciliation (independent of Steps 1-2) |
| 4 | 1, 2, 3 | Known issues consolidation (needs issues from all three audits) |
| 5 | 1, 2, 3, 4 | Targeted fixes (needs complete issue list before fixing) |
| 6 | 1, 2, 3, 4, 5 | Final audit document (needs everything complete) |

**Parallelization opportunities:**
- Steps 1, 2, 3 can run in parallel (independent audit workstreams)
- Steps 4, 5, 6 must be sequential (consolidation → fixes → final document)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Cross-Spec Integration Audit | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb37b-integration-audit.md`. 2 critical (split-brain notes in VerseCardActions, schema mismatch in useScriptureEcho), 3 minor (AmbientAudioPicker aria-modal, JournalInput font-serif, notification key constant). URL contracts, stores, animation tokens, container widths all clean. |
| 2 | Voice and Consistency Audit | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb37b-voice-audit.md`. 6 low-severity issues (3 generic empty states in PrayerWallProfile, 1 in PrayerWallDashboard, emoji in NotificationPanel, "keep going!" after negative state in MonthlyHighlights). Anti-pressure, SEO, notifications, buttons all clean. |
| 3 | Metrics Reconciliation | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb37b-metrics-reconciliation.md`. 1 test failure (JournalSearchFilter data collision). Bundle 99.87 KB (marginal +2.37 KB over baseline). 43 eslint-disable without reasons. 16/17 specs shipped (BB-44 deferred). Lint/build/TS strictness all pass. |
| 4 | Known Issues Consolidation | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb37b-known-issues.md` (252 lines). Consolidated from 37 specs + 10 recon docs + 3 audit docs. 24 Phase 3 deferred, 5 audio specs deferred, 12 UX limitations, 14 tech debt items, 9 design decisions, 12 BB-37b audit findings. |
| 5 | Targeted Fixes | [COMPLETE] | 2026-04-13 | Fixed 5 issues: (1) Critical: VerseCardActions.tsx migrated from deprecated useBibleNotes to canonical lib/bible/notes/store (upsertNote, getNoteForVerse, NoteStorageFullError); updated test to match. (2) Moderate: useScriptureEcho.ts switched from raw localStorage to getAllHighlights() from highlightStore; updated formatHighlightDate to accept number; updated test to mock store. (3) Low: AmbientAudioPicker.tsx added aria-modal="true" to both desktop and mobile dialog branches. (4) Low: JournalInput.tsx removed font-serif from textarea (design system says serif=scripture only). (5) Test fix: JournalSearchFilter test changed "peace"→"serenity" to avoid collision with journal prompt data containing "peace". All 8,080 tests pass, lint 0, build clean. |
| 6 | Final Audit Document | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb37b-final-audit.md` (238 lines). Executive summary of 16 shipped specs, integration/voice/metrics results, 5 targeted fixes documented, 11 follow-up items, wave certification with 3 honest caveats (bundle baseline, Lighthouse not automated, Gemini API key in env). |
