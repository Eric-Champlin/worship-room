# Forums Wave: Spec 1.9b — Error & Loading State Design System

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 1.9b
**Branch:** `claude/forums/round3-forums-wave`
**Date:** 2026-04-23

---

## Affected Frontend Routes

This spec is cross-cutting design-system work — there is no single "target" route. The audit + copy fixes touch primitives that render across the app; the `/verify-with-playwright` pass captures each new-or-modified component in its rendered states at three viewports (375×667, 768×1024, 1440×900). Representative routes where the audited / modified components surface today:

- `/register` — `FormField` (field errors, `aria-describedby`), `Button` (loading + disabled states), any form-level error surface
- `/daily` — `Toast` / `WhisperToast` usage, skeletons, empty states
- `/prayer-wall` — `FeatureEmptyState`, `Toast`, `WhisperToast`, `PrayerWallSkeleton`
- `/friends` — empty states, skeletons
- `/insights` — `ChartFallback`, empty states, `DashboardSkeleton` family
- `/bible` — `BibleBrowserSkeleton`, route-level `ChunkErrorBoundary` fallback
- `/bible/:book/:chapter` — skeletons, error boundaries on dynamic chapter loads

If the audit concludes that any NEW component is warranted, the plan phase will identify the representative demo route (or dedicated verification harness) used to capture it across viewports. If `/verify-with-playwright` cannot practically render a component in isolation, the plan documents the chosen consumer-route capture strategy.

---

## Spec 1.9b — Error & Loading State Design System

- **ID:** `round3-phase01-spec09b-error-loading-design-system`
- **Phase:** 1 — Backend Foundation (frontend-only design-system spec in the Phase 1 bucket)
- **Size:** M
- **Risk:** Low (additive + corrective; no behavioral change to consumer code)
- **Prerequisites:** None hard. Soft: best to land BEFORE Spec 1.9 (Frontend AuthContext JWT Migration) so 1.9 can consume the documented patterns instead of inventing ad-hoc treatments. No backend dependency.

> **⚠️ Divergence from master plan — read before planning.**
>
> The master plan's original Spec 1.9b (lines 1769–1860) frames this as a greenfield spec creating four new components (`<LoadingSkeleton>`, `<ErrorBoundary>`, `<EmptyState>`, `<RetryBanner>`) in `frontend/src/components/common/`, and positions 1.9b AFTER Spec 1.9 (consuming the auth flow as first integration).
>
> This brief supersedes that framing because actual codebase state is materially different from what the master plan anticipated when it was written:
>
> 1. **The "greenfield" assumption is wrong.** The codebase already has 13 page-specific skeletons + 4 atomic skeleton primitives (`SkeletonBlock`, `SkeletonCard`, `SkeletonCircle`, `SkeletonText`) with tests, 3 error boundaries (`ErrorBoundary`, `ChunkErrorBoundary`, `RouteErrorBoundary`), a `Toast` + `WhisperToast` pair, a `FeatureEmptyState`, a `ChartFallback`, and `FormField` with field-error wiring. ~80% of the infrastructure already exists. Creating parallel components without an audit would duplicate, not unify.
> 2. **Canonical UI primitive location is `frontend/src/components/ui/`, not `common/`.** That's where `Button`, `FormField`, `Toast`, `WhisperToast`, `FeatureEmptyState`, `ChartFallback`, and `CharacterCount` all live. New components go beside them.
> 3. **Ordering reversal is deliberate.** Landing this spec BEFORE 1.9 means 1.9's plan can cite a documented design-system section when describing AuthModal loading/error treatments, instead of inventing patterns that would later need retrofitting. The cost of reordering: 1.9b can't use AuthModal as a live integration canary — that's acceptable, 1.9 can still reference the documented patterns.
> 4. **AuthModal integration is EXPLICITLY out of scope here.** Spec 1.9 owns AuthModal. This spec produces the design system 1.9 consumes; it does not consume it.
>
> **What this means for `/plan-forums`:** follow the brief below, not the master-plan section. The canonical spec ID (`round3-phase01-spec09b-error-loading-design-system`) is preserved. If the audit matrix surfaces findings that contradict the master-plan wording, the audit is authoritative — document the drift in the Execution Log and update neither master plan nor this spec retroactively. The master plan's spec-tracker line gets a manual ✅ on completion.

---

## Goal

Produce an authoritative, documented **Error & Loading State Design System** covering every UI state the Forums Wave will produce: field-level errors, form-level errors, inline errors, full-page errors, loading (skeleton / spinner / button / full-page), and empty states. Audit what already exists, fill identified gaps with the minimum viable set of new components, and consolidate the whole system into one authoritative section of `.claude/rules/09-design-system.md` so every subsequent Forums Wave spec has a single reference for "which component do I use here?"

**This is not a greenfield spec.** Significant infrastructure already exists (see Current State). The work is audit + gap-fill + document, weighted heavily toward audit and documentation.

---

## Why this spec exists now

- Spec 1.9 (Frontend AuthContext JWT Migration, L/High) is next and touches login/register forms + app startup + token-expiry flows. Without a documented design system, Spec 1.9 will invent ad-hoc patterns and later specs will invent different ones. Convergence gets harder every spec.
- Phase 3+ (Prayer Wall backend migration) introduces real network latency for the first time — every feed and composer endpoint will surface loading and error states users haven't seen before. Consistent treatment from the start.
- First spec in the wave where `/verify-with-playwright` is a meaningful deliverable check. Establishing the pipeline habit here — on a low-stakes design spec — de-risks every visual spec that follows.
- The existing skeleton/error-boundary/Toast infrastructure is already good. It just isn't documented as a coherent system. 80% of the win here is documentation.

---

## Current state

Recon surface (partial — full audit is part of the spec's work):

**Exists in `frontend/src/components/ui/`:**

- `Button.tsx`, `FormField.tsx`, `Toast.tsx`, `WhisperToast.tsx`, `FeatureEmptyState.tsx`, `ChartFallback.tsx`, `CharacterCount.tsx`

**Exists in `frontend/src/components/skeletons/`:**

- 13 page-specific skeletons (`BibleBrowserSkeleton`, `DailyHubSkeleton`, `DashboardSkeleton`, `PrayerWallSkeleton`, etc.)
- 4 atomic primitives: `SkeletonBlock`, `SkeletonCard`, `SkeletonCircle`, `SkeletonText`
- `index.ts` barrel, `__tests__/` with existing coverage

**Exists in `frontend/src/components/`:**

- `ErrorBoundary.tsx`, `ChunkErrorBoundary.tsx`, `RouteErrorBoundary.tsx`

**Assumed to exist (verify during recon):**

- `frontend/src/constants/animation.ts` — BB-33 animation tokens
- `.claude/rules/09-design-system.md` — existing rule; new section added, nothing replaced
- Dark theme CSS custom properties / Tailwind config

**Likely gaps (verify during recon; do NOT invent gaps that don't exist):**

- Form-level error banner (distinct from field-level)
- Generic inline-error component for non-form contexts
- Full-page error state for failed route loads (skeleton → error transition)
- Standalone loading spinner for contexts skeletons don't fit

---

## Key design decisions (do not re-litigate during planning)

1. **Audit-first.** Before writing any new component, produce a component-state matrix in the plan document. Rows: every feature area in wave scope (auth forms, feed, composer, profile, notifications, admin). Columns: loading, error, empty, success. Cells: which existing component satisfies that state, OR "GAP — needs X." This matrix is the plan phase's primary deliverable and determines the actual implementation scope.

2. **Fill the minimum viable set.** Only create components for gaps the audit proves exist. If `FormField` already handles field errors, don't create a `FieldError`. If `FeatureEmptyState` already works, don't rename it. Fewer new components = less to document = fewer patterns to remember.

3. **Documentation is the primary deliverable.** Success is measured by whether a future spec author can open `.claude/rules/09-design-system.md`, read one section, and correctly pick the right component for any error/loading/empty state. Code changes support this goal; they don't replace it.

4. **Anti-pressure copy audit across existing components.** Every user-facing string in existing and new components passes the 6-point Anti-Pressure Copy Checklist. Violations get fixed in this spec. Specifically check: exclamation points ("Something went wrong!"), "Oops!" / "Whoops!", urgency language ("Try again NOW"), comparison framing, therapy-app jargon, false scarcity. Audit covers: `Toast.tsx`, `WhisperToast.tsx`, `FeatureEmptyState.tsx`, all 3 error boundary fallback messages, any skeleton copy.

5. **Accessibility baseline, non-negotiable.**
   - Dynamic errors use `aria-live="polite"` (or `assertive` for critical errors like form-submission failures)
   - Loading states announce to screen readers
   - Focus management: form-submission errors focus the first invalid field; page-level errors focus the error heading
   - Motion respects `prefers-reduced-motion` (skeletons already do per BB-33; verify during audit)
   - Color contrast meets WCAG AA (axe-core check in `/verify-with-playwright`)

6. **Dark-theme first.** Worship Room is dark-themed. All new components render correctly against dark backgrounds. No hard-coded light-mode colors.

7. **Design tokens only — no new tokens.** Use existing values from `frontend/src/constants/animation.ts` (BB-33) and the existing color system. If a needed token doesn't exist, that's a separate spec (Phase 5 Visual Migration). Document the need; don't solve it here.

8. **`/verify-with-playwright` is the primary quality gate.** Verify at 3 viewports: 375×667 (mobile), 768×1024 (tablet), 1440×900 (desktop). Capture each new-or-modified component in each of its states at each viewport. The verify pass IS the visual regression baseline for future specs.

9. **New components go in `frontend/src/components/ui/`.** That's where canonical UI primitives live. Do NOT create a new top-level directory. (This is a deliberate divergence from the master plan's `components/common/` wording — `ui/` is where `Button`, `FormField`, `Toast`, `WhisperToast`, `FeatureEmptyState`, `ChartFallback`, and `CharacterCount` already live.)

10. **Tests: Vitest + RTL for logic, Playwright for visual.** Unit tests for prop-driven behavior; Playwright for rendered output at each viewport. No Storybook.

11. **Out-of-scope for THIS spec, explicit:**
    - ErrorBoundary enhancement / Sentry integration (→ Spec 16.2b)
    - Offline banner (→ Spec 16.1b)
    - Toast system rewrite — if `Toast` and `WhisperToast` both have callers, document the split and leave them
    - New color or motion design tokens (→ Phase 5)
    - Retry logic / exponential backoff (belongs in the API client layer)
    - Crisis-specific error copy (→ handled per-feature; this spec documents the general pattern and flags that crisis-adjacent features need extra copy review)
    - **AuthModal integration (→ Spec 1.9 owns AuthModal's loading/error treatment). This spec produces the design system 1.9 consumes; it does not consume it.**

---

## Files to create

Determined by audit. Likely candidates (subject to recon):

- `frontend/src/components/ui/FormError.tsx` — form-level error banner, only if no existing component handles this
- `frontend/src/components/ui/InlineError.tsx` — generic inline error for non-form contexts, only if gap confirmed
- `frontend/src/components/ui/LoadingSpinner.tsx` — standalone spinner, only if Button's loading state doesn't cover the need
- `frontend/src/components/ui/PageError.tsx` — full-page error state, only if gap confirmed
- Corresponding `__tests__/` for each

**If the audit concludes zero gaps exist, this spec ships with ZERO new components** — purely documentation and copy-audit. That's a valid outcome.

---

## Files to modify

**Definitely:**

- `.claude/rules/09-design-system.md` — new "Error, Loading, and Empty States" section with: (1) component-state matrix, (2) decision tree, (3) copy guidelines with good/bad examples, (4) accessibility checklist, (5) anti-pressure checklist references

**Potentially (determined by audit + copy review):**

- `frontend/src/components/ui/Toast.tsx`, `WhisperToast.tsx`, `FeatureEmptyState.tsx` — copy fixes if violations found
- `frontend/src/components/ui/FormField.tsx` — error-display enhancement if `aria-describedby` wiring missing
- `frontend/src/components/ui/Button.tsx` — loading-state a11y if `aria-busy` / `aria-disabled` gaps
- `frontend/src/components/ErrorBoundary.tsx` + variants — copy fixes only (NOT functional — 16.2b owns that)
- Any skeleton's copy if violations found

**Do NOT modify without explicit justification:**

- Feature-specific components (`prayer-wall/`, `bible/`, `dashboard/`) — consumer changes, out of scope
- `frontend/src/constants/animation.ts` — no new tokens
- Any backend file — frontend-only

---

## Files to delete

Possibly one of `Toast.tsx` / `WhisperToast.tsx` if the audit proves one is unused legacy. Check commit history or ask Eric first. Otherwise nothing.

---

## Database changes

None.

---

## API changes

None.

---

## Copy Deck

Explicit strings this spec will embed are limited — the spec mostly audits existing copy and documents guidelines. However, if the audit produces new components, the following fallback copies MUST pass the Anti-Pressure Copy Checklist. These are defaults; consumers should override with their own Copy Deck strings.

**If `FormError` is created (form-level error banner, above a form):**

- Default message (generic): `"We couldn't finish that. Please check the fields below and try again."` — note: ends with a period, not an exclamation; uses "we couldn't" (blameless), not "you must have…" (blaming)

**If `InlineError` is created (generic inline error for non-form contexts):**

- No default — caller always supplies the message. Component is structure + a11y, not copy.

**If `LoadingSpinner` is created (standalone spinner for contexts skeletons don't fit):**

- Screen-reader label default: `"Loading"` (one word, no punctuation; announced via `aria-label` or visually-hidden span). Caller may override with a context-specific label (e.g., `"Loading prayers"`).

**If `PageError` is created (full-page error state for failed route loads):**

- Default headline: `"We couldn't load this page"` — blameless, complete sentence, period end
- Default body: `"Try reloading. Your other work is safe."` — calm, avoids emergency framing, affirms that state isn't lost
- Default action button: `"Reload"` — single verb, no exclamation

**Existing copy surfaces the audit MAY touch (violations get fixed; non-violations stay as-is):**

- `Toast.tsx`, `WhisperToast.tsx` user-facing strings
- `FeatureEmptyState.tsx` default / example copy
- `ErrorBoundary.tsx`, `ChunkErrorBoundary.tsx`, `RouteErrorBoundary.tsx` fallback headlines, bodies, and action labels
- Any skeleton that includes `aria-label` or visually-hidden screen-reader copy

**Explicit non-goals:**

- This spec does NOT define copy for feature-specific empty/error states (e.g., "No prayers yet" on Prayer Wall). Those live in the consuming spec's Copy Deck. This spec's rule-file section will include GOOD and BAD copy EXAMPLES to guide future spec authors, not mandated strings.

---

## Anti-Pressure Copy Checklist

Every audited and authored string in this spec MUST pass:

- [ ] **No comparison.** No "unlike other users", "you're behind", "X people already did this".
- [ ] **No urgency.** No "NOW", "today only", "hurry", "before it's too late". No exclamation points near vulnerability contexts (errors, empty states, loading).
- [ ] **No exclamation points near vulnerability.** "Something went wrong." (period), not "Something went wrong!". "Try again." not "Try again!". Empty states that say "Nothing yet." not "Nothing yet!".
- [ ] **No therapy-app jargon.** No "take a breath", "center yourself", "notice your feelings", "be kind to yourself" in error/loading copy. Warm, not clinical.
- [ ] **No streak-as-shame or missed-X framing.** "You've been quiet this week — that's fine" not "You haven't posted in 7 days!". Any copy that comments on absence of activity is rewritten as neutral or warm.
- [ ] **No false scarcity.** No "limited time", "running out", "only N left". (Generally n/a for error/loading/empty, but listed for completeness.)

Additional Worship-Room-specific checks:

- [ ] **Blameless.** "We couldn't reach our server" not "Your connection failed". "This didn't work" not "You entered bad input" — even when user input IS the cause, phrase it as the field being invalid, not the user being wrong.
- [ ] **Empty ≠ zero ≠ loading.** Each state gets its own copy treatment. Empty = "legitimately nothing here, and that's fine." Zero = "should be something but filter/search turned up nothing." Loading = "fetching, answer unknown."
- [ ] **Sentence case, complete sentences, period terminators.** "We couldn't finish that." not "WE COULDN'T FINISH THAT" or "we couldn't finish that" or "We couldn't finish that".

Every violation found in existing components gets fixed in this spec unless the fix would ripple into behavioral change (in which case document and defer to a targeted follow-up spec).

---

## Anti-Pressure Design Decisions

1. **Skeleton over spinner by default.** Spinners communicate "something is happening, unclear what or where." Skeletons communicate "something specific is loading here." Worship Room's quiet aesthetic favors the specificity of skeletons. Standalone `LoadingSpinner` exists only for contexts where a skeleton is infeasible (e.g., button loading state, tiny inline indicator). The rule file's decision tree reflects this priority: skeleton first, spinner as exception.

2. **`prefers-reduced-motion` always falls back to static opacity-60.** No scale pulses, no shimmer gradients, no translate sweeps when the OS setting is on. This is already the BB-33 pattern for existing skeletons; the spec verifies and documents it, does not invent it.

3. **Error severity without emergency-red.** Three severity levels (info, warning, error) use tonal color variation — quiet blue-gray for info, muted amber for warning, muted red-brown for error. NEVER a pure `#FF0000` or any "emergency red" — Prayer Wall vulnerability content would feel assaulted. Documented in the rule file.

4. **`aria-live="polite"` by default, `assertive` is a sharp edge.** `assertive` interrupts whatever the screen reader is currently saying. Reserve for urgent, user-action-required messages ("Your session has expired. Log in to continue."). Default everywhere else is `polite`. Rule file explains this tradeoff with concrete examples.

5. **Empty states affirm absence as valid.** "You haven't bookmarked any prayers yet." is neutral. "You haven't saved a single prayer yet!" is shame. The rule file includes paired good/bad examples so spec authors internalize the difference.

6. **Focus-on-error for forms.** When submission fails, programmatic focus moves to the error message (or first invalid field — audit determines which). Keeps screen-reader and keyboard users oriented without requiring them to re-discover the failure state. Rule file documents the pattern and points to the canonical implementation.

---

## Success criteria

- [ ] Audit matrix exists in the plan document (rows = feature areas, columns = loading/error/empty/success, cells = component name or GAP)
- [ ] `.claude/rules/09-design-system.md` has a new "Error, Loading, and Empty States" section enabling future spec authors to pick the right component without reading source
- [ ] Every user-facing string in audited components passes the Anti-Pressure Copy Checklist
- [ ] Every error state has correct `aria-live` wiring
- [ ] Every loading state announces to screen readers
- [ ] `prefers-reduced-motion` respected in all new components (Playwright verified)
- [ ] All new components work at 375×667, 768×1024, 1440×900 (Playwright verified)
- [ ] axe-core runs clean on every new-or-modified component (zero WCAG AA violations)
- [ ] All existing tests pass; new components have Vitest + RTL tests for prop variants, disabled states, keyboard interaction
- [ ] Spec 1.9's plan can reference this spec's design-system section by name when documenting consumed components
- [ ] Frontend regression baseline not exceeded (post-Key-Protection baseline: 8,811 pass / 11 documented pre-existing fail across 7 files). Any NEW failing file or fail count > 11 is a regression and blocks completion.

---

## Pre-execution recon items for `/plan-forums` to verify

Recon phase is larger than most. Plan should produce a written audit before implementation steps finalize.

1. **Read every component in `frontend/src/components/ui/`.** Document public API (props), variants, a11y state (aria, keyboard), copy. Build inventory.
2. **Read every component in `frontend/src/components/skeletons/`.** Document which page each serves. Confirm atomic primitives are exported from `index.ts` as the intended reusable set.
3. **Read the 3 error boundary components.** Document differences (chunk load vs route vs generic). Confirm 16.2b's enhancement scope doesn't overlap — this spec audits copy + a11y, NOT behavior.
4. **Read `.claude/rules/09-design-system.md`.** Understand existing structure. New section integrates; replaces nothing.
5. **Read `frontend/src/constants/animation.ts`.** Document available tokens. Confirm BB-33 is canonical.
6. **Build the component-state matrix.** Feature areas (not exhaustive — add as recon surfaces): auth forms, navbar/app shell, dashboard, daily hub, profile, prayer wall, bible reader, composer, friends, insights, settings. For each, identify which existing component serves loading/error/empty/success, or mark GAP.
7. **Grep for ad-hoc error handling.** `if (error)`, `{error &&`, `catch (` in `.tsx` files. Catalog as "future consumer migration" — don't refactor here.
8. **Grep for `Toast` / `WhisperToast` callers.** If one has zero callers, flag as deletion candidate. If both active, document intended split.
9. **Confirm `/verify-with-playwright` skill works** on this branch before Step 1. If broken, fix is out-of-scope and blocks this spec.
10. **Confirm dark theme CSS custom properties** are globally available, no wrapper needed.
11. **Copy-audit checklist** per component:
    - Zero exclamation points near vulnerability contexts
    - No "Oops!" / "Whoops!" / "Something went wrong!"
    - "Try again." (period, not exclamation)
    - No comparative framing, therapy-jargon, urgency manipulation, false scarcity
    - Error copy is blameless ("We couldn't reach our server" not "You must have lost connection")
    - Empty-state copy is warm ("It is quiet here today. That is fine." not "No results")

---

## Testing notes

- **Vitest + RTL** for new components: prop variants, disabled states, keyboard interaction, `aria-live` region presence, `aria-describedby` linkage for form errors. At least one test per new component verifies the focus-management behavior (focus moves to error heading / first invalid field on relevant trigger).
- **Snapshot handling:** copy fixes on existing components may invalidate existing snapshot files (`*.test.tsx.snap`). Update snapshots in the same commit as the copy fix; do not land the copy fix without regenerating the snapshot. Do NOT conflate snapshot updates with behavior regressions — snapshot diffs from pure copy fixes are expected.
- **Visual verification via `/verify-with-playwright`:** three viewports (375×667, 768×1024, 1440×900). Each new-or-modified component captured in each of its rendered states. The verify pass IS the baseline for future visual regression.
- **Accessibility testing:** axe-core runs inside `/verify-with-playwright` or via a Vitest + `vitest-axe` integration (whichever is faster given the current harness). Zero WCAG AA violations on new-or-modified components.
- **No backend tests.** This is a frontend-only spec; `./mvnw test` runs clean as a sanity check but is not the quality gate.
- **Reactive-store tests N/A.** This spec doesn't touch reactive stores. The BB-45 anti-pattern requirement from `06-testing.md` is not triggered.

---

## Out of scope

- Error boundary functional enhancements (→ Spec 16.2b)
- Offline banner (→ Spec 16.1b)
- Sentry or any error reporting (→ Spec 1.10d)
- New color or motion design tokens (→ Phase 5)
- Refactoring existing ad-hoc error handling to use the design system (catalog for future; don't migrate here — would balloon the spec)
- Retry logic, exponential backoff, API-client changes
- Storybook / component explorer
- Crisis-specific error copy (per-feature per Rule 13; document general pattern here)
- i18n of any strings (wave is English-only)
- Light-mode toggle (app is dark-only)
- AuthModal integration (Spec 1.9 owns that surface)

---

## Gotchas worth naming in the spec

- **The audit IS the spec.** Don't let the plan rush to "create X, Y, Z." The audit matrix comes first; components (if any) follow from proven GAPs. A spec shipping zero new components with a complete documented system + clean copy audit is a SUCCESSFUL 1.9b.
- **Copy fixes can break snapshots.** If existing components have `*.test.tsx.snap` files, expect snapshot updates as part of the copy audit. Don't conflate snapshot updates with behavior regressions.
- **Toast vs WhisperToast is probably intentional.** Don't delete one just because it has fewer callers. "Whisper" suggests a gentler variant (anti-pressure-compliant by design) — likely a deliberate choice. Check with Eric before removing.
- **`/verify-with-playwright` first use.** Infra might need debugging. Budget time for "oh, the Playwright config needs a tweak." Spec 1.10l formally stands up Playwright E2E + CI, but dev-time verification should work without it. Per memory: Playwright MUST run headless (`frontend/playwright.config.ts` has `headless: true`); for direct `chromium.launch()` calls always pass `{ headless: true }`.
- **Design-system rule file is authoritative — don't duplicate in JSDoc.** Link to the rule from component JSDoc if needed ("See `.claude/rules/09-design-system.md` § Error States"). The rule is single source of truth; keeps drift from happening.
- **Empty ≠ zero ≠ loading.** Empty = "legitimately nothing here, and that's fine" (e.g., "You haven't bookmarked any prayers yet"). Zero = "should be something but filter/search turned up nothing" (e.g., "No results for 'grace'"). Loading = "fetching, answer unknown." Each gets its own copy treatment; call this out explicitly in the rule file.
- **Focus management on form-submit errors.** When login returns an error, focus should land on the error message (not stay on submit). Common a11y miss. Audit `FormField` + any login integration for correct focus behavior.
- **`aria-live="assertive"` is a sharp edge.** Interrupts whatever the screen reader is saying. Reserve for urgent, user-action-required messages ("Your session has expired. Log in to continue."). Default to `polite` for most dynamic errors. Document in the rule file.
- **Playwright screenshots go in `frontend/playwright-screenshots/`.** Per memory: not project root, not `screenshots/`. That directory is gitignored.
- **BibleReader is a documented layout exception.** The audit covers the `BibleReader` error/empty/loading surfaces but does NOT reframe its `ReaderChrome` / no-SiteFooter layout — that's documented intentional drift per CLAUDE.md.

---

## Documentation safety

Additive and corrective. `.claude/rules/09-design-system.md` gets a new section; existing sections unchanged. No master plan changes. No Universal Rules changed. No past spec invalidated. Tracker gets a manual ✅ post-execution.

If the audit surfaces that an existing component's behavior diverges from its rule-file description, that's a drift finding — document in the Execution Log and either fix the component or update the rule, depending on which is "right." Don't silently change one to match the other.

The master-plan-divergence note at the top of this spec exists so `/plan-forums` doesn't try to reconcile the old master-plan wording against the brief below. The brief is authoritative. If anything in the master plan's 1.9b section (lines 1769–1860) reads like a prescription that would contradict this brief, treat it as superseded.

---

## See Also

- `.claude/rules/09-design-system.md` — existing design-system rule (the target of this spec's authoritative new section)
- `.claude/rules/04-frontend-standards.md` — React patterns, accessibility, responsive design
- `.claude/rules/06-testing.md` — testing conventions and the BB-45 reactive-store anti-pattern reference
- `frontend/src/constants/animation.ts` — BB-33 canonical animation tokens (consumed, not modified)
- `_specs/forums/spec-1-8.md` — most recent completed Forums Wave spec (format reference)
- `_forums_master_plan/round3-master-plan.md` § Universal Spec Rules — the 17 rules, especially the Anti-Pressure Copy Checklist
- `_forums_master_plan/round3-master-plan.md` lines 1769–1860 — the master plan's original 1.9b wording (SUPERSEDED by this brief; retained for traceability only)
