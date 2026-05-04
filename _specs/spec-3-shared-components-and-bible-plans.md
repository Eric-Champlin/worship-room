# Spec 3: Shared Components Migration + /bible/plans Full Migration

**Master Plan Reference:** Continues the post-DailyHub rollout sequence. Builds on patterns locked by `_specs/dailyhub-1a-foundation-and-meditate.md`, `_specs/dailyhub-1b-pray-and-journal.md`, `_specs/dailyhub-2-devotional.md`, and `_specs/dailyhub-iteration-make-it-right.md`. First spec to migrate territory beyond DailyHub.

---

## Affected Frontend Routes

- `/daily?tab=pray`
- `/daily?tab=journal`
- `/daily?tab=devotional`
- `/daily?tab=meditate` _(regression check only)_
- `/grow/reading-plans`
- `/bible` _(regression check only — BibleLanding already shipped via pilot)_
- `/bible/plans`
- Bible chapter pages that surface a related plan callout (e.g. `/bible/john/3` — exact route(s) identified during recon)
- Any Echoes surface that consumes `EchoCard` (Dashboard or Echoes feature page — identified during recon)

---

## Overview

This spec extends the locked DailyHub visual language (FrostedCard tier system, Button variants, multi-bloom BackgroundCanvas, Tier 2 scripture-callout idiom, page-rhythm-tightening discipline, eyebrow patterns) to the rest of the app. It performs two coordinated migrations: (1) the four shared components used across multiple Worship Room pages — `RelatedPlanCallout` (already migrated in iteration spec; verify only), `EchoCard`, `VersePromptCard`, `DevotionalPreviewPanel` — and (2) the entire `/bible/plans` page across every visual state (browse, empty, loading, error if present). Migrating shared components in lockstep prevents the awkward state where some pages have the new visual language while shared components on those same pages still look pre-pilot. Migrating `/bible/plans` now sets the visual template for the rest of the Bible cluster (Spec 6) and removes a page that bothered the user during rollout.

This is a pure visual migration on locked patterns. No new patterns introduced, no patterns modified.

## User Story

As a **logged-in user** browsing across Worship Room, I want **shared components and the `/bible/plans` page to share the same visual language as the DailyHub trilogy** so that **the app feels like one coherent product instead of a patchwork of pre- and post-pilot surfaces**.

## Requirements

### Functional Requirements

1. **RelatedPlanCallout regression check (no code change).** Verify `RelatedPlanCallout` (already migrated in `dailyhub-iteration-make-it-right` to FrostedCard accent with "Go Deeper" eyebrow) still renders correctly on every consuming surface beyond the Devotional tab: `/grow/reading-plans` (if used there) and any Bible chapter page that surfaces it. If any consumer breaks because it assumed the old wrapper, fix in this spec.

2. **EchoCard migration.** Migrate `frontend/src/components/echoes/EchoCard.tsx` (path verified during recon) from rolls-own muted surface to `<FrostedCard variant="default">`. Preserve all inner content, handlers, and animation logic. Migrate any dismiss button to `<Button variant="ghost" size="sm">`. Treat "from your devotional on [date]" as inline attribution, NOT eyebrow material.

3. **VersePromptCard migration (decision tree).** Migrate `frontend/src/components/daily/VersePromptCard.tsx` (path verified during recon) using a source-determined decision:
   - If currently scripture-callout idiom → KEEP rolls-own with canonical Tier 2 class string `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`.
   - If currently card/FrostedCard treatment → MIGRATE to scripture-callout idiom (Tier 2). Verses are scripture; they belong in Tier 2 callout pattern, not in a card.
   - May be a no-op if already on Tier 2.
   - Header eyebrow (if present) preserved as inline `<p>` with Tier 2 eyebrow class string `text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3` (no leading dot). Interactive button elements migrated to subtle variant.

4. **DevotionalPreviewPanel migration.** Migrate `frontend/src/components/daily/DevotionalPreviewPanel.tsx` (path verified during recon) to `<FrostedCard variant="default">`. "View full devotional" CTA → subtle Button. Dismiss button (if present) → ghost Button. Preserve all hooks, state, click handlers. Internal eyebrow/category label converted to FrostedCard `eyebrow` prop if it fits the eyebrow pattern, else inline as Tier 2 eyebrow paragraph.

5. **`/bible/plans` — multi-bloom BackgroundCanvas.** Wrap page content in `<BackgroundCanvas>` (`frontend/src/components/ui/BackgroundCanvas.tsx`, shipped 1A). Replaces the basic dark gradient with the same atmospheric layer used on BibleLanding, DailyHub, and the rest of the system.

6. **`/bible/plans` — hero rhythm tightening.** Apply page-rhythm-tightening discipline (from iteration spec). Reduce the gap between the hero subtitle ("Guided daily reading to deepen your walk") and the "Browse plans" section heading from ~200px+ to ~32–48px. Apply minimum-blast-radius reduction (typically the hero container's bottom padding); verify no new voids appear elsewhere on the page.

7. **`/bible/plans` — plan cards to FrostedCard default.** Migrate the plan card component (likely `frontend/src/components/bible/PlanCard.tsx` or rendered inline — verified during recon) from `bg-white/[0.04] rounded-2xl p-6` style to `<FrostedCard variant="default">`. Preserve interactive semantic (button vs Link wrapping pattern — match existing source). Preserve inner content verbatim: icon (cyan book / yellow star / mint heart / lavender moon — STAYS AS-IS per user decision; categorical color is intentional), plan title, theme/category subtitle, duration metadata, "By Worship Room" attribution. Preserve the existing 2-column grid layout.

8. **`/bible/plans` — empty state migration (if present).** If page has an empty state, migrate to: `<FrostedCard variant="subdued" className="text-center p-8">` with muted lucide-react icon (~48px, `text-white/40`), heading paragraph, subtitle paragraph, optional subtle Button CTA. If no empty state exists in source today, do NOT fabricate; note as deferred.

9. **`/bible/plans` — loading state migration (if present).** If skeleton: migrate skeleton cards to `<FrostedCard variant="default" className="animate-pulse">` with placeholder rectangles matching real card silhouette (icon → title → subtitle → duration). If spinner: replace with the canonical loading spinner component if one exists. If no loading state exists today, do NOT fabricate.

10. **`/bible/plans` — error state migration (if present).** Migrate similarly to empty state: subdued FrostedCard wrapper, muted error icon, descriptive message, retry CTA as subtle Button. If no error state exists today, do NOT fabricate.

### Non-Functional Requirements

- **Performance:** No performance regression. Each migrated component is roughly the same DOM weight (FrostedCard adds backdrop blur but the iteration spec already validated this on DailyHub at all breakpoints).
- **Accessibility:** Preserve all existing semantics. Plan cards must remain keyboard-focusable and screen-reader-announceable; FrostedCard with `as="button"` retains native button semantics. Interactive elements maintain ≥44px touch targets per project rules.
- **No regression:** All existing tests pass; no test count regression beyond documented baseline.

## Auth Gating

This spec is a pure visual migration. **Auth behavior is unchanged from current source.** Each migrated component preserves whatever existing handlers, gates, and modal triggers it has today. No new auth gates added, none removed.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| View `/bible/plans` browse | Page renders with multi-bloom canvas, hero, and plan cards visible | Same | _(no gate — page is public)_ |
| Click a plan card on `/bible/plans` | Preserved from existing source — typically navigates to plan detail page | Same | _(no gate today; if a future spec gates plan-start, that spec defines it)_ |
| View EchoCard on Echoes/Dashboard surface | Preserved from existing source | Same | _(unchanged)_ |
| Dismiss EchoCard (if dismiss button present) | Preserved from existing source | Same | _(unchanged)_ |
| View VersePromptCard on Pray/Journal tabs | Preserved — visible without login | Same | _(unchanged)_ |
| View DevotionalPreviewPanel on Pray/Journal tabs | Preserved — visible without login | Same | _(unchanged)_ |
| Click "View full devotional" CTA in DevotionalPreviewPanel | Preserved from existing source — typically navigates to `/daily?tab=devotional` | Same | _(unchanged)_ |

If recon discovers any of these components currently has an auth gate not anticipated above (e.g., dismissing an EchoCard requires login because dismissals persist server-side), the implementation plan must enumerate it explicitly and preserve it through the migration.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All migrated components scale down per existing source. `/bible/plans` plan cards collapse to 1-column grid (existing behavior preserved). Multi-bloom canvas visible behind content. Hero rhythm tightening still readable. |
| Tablet (640–1024px) | Components render at intermediate widths. `/bible/plans` plan cards typically still 1-column or transition to 2-column at the existing source breakpoint. |
| Desktop (> 1024px) | Plan cards in 2-column grid (existing layout preserved). FrostedCard hover/lift treatment fully visible. Multi-bloom canvas layered atmosphere visible at full width. |

Additional notes:
- FrostedCard hover treatment is mouse-only; touch devices do not show the lift state but the cards remain tappable.
- Plan card icon colors (cyan book, yellow star, mint heart, lavender moon) are preserved at every breakpoint — categorical color is intentional per user decision.
- The hero rhythm tightening is a whole-page reduction — verify no new voids appear at any breakpoint.

## AI Safety Considerations

**N/A — This spec is a pure visual migration on locked patterns. It introduces no new AI-generated content, no new free-text user input, and no new crisis-detection surface area.** Existing components (EchoCard surfaces echoes derived from prior journal entries / devotional reflections — these have already gone through the AI safety pipeline at their source surface) preserve all current behavior. No crisis detection changes required.

## Auth & Persistence

- **Logged-out users:** Components render per existing source. No new persistence introduced. Demo-mode zero-persistence rule continues to apply to anything that wrote to backend before; nothing in this spec changes write behavior.
- **Logged-in users:** No persistence changes. Components preserve their existing read/write contracts (e.g., EchoCard dismissals continue to write to whatever store they currently use; VersePromptCard preserves existing favorite/dismiss behavior if present).
- **localStorage usage:** No new keys introduced. Existing reads/writes preserved verbatim through migration.
- **Route types:** All affected routes remain at their current type (`/bible/plans` and `/grow/reading-plans` are public; `/daily/*` is public per current state).

## Completion & Navigation

**N/A — this spec is a visual migration. It does not change Daily Hub completion tracking or navigation flow.** Components retain their current click handlers, navigation targets, and any completion signals they emit today.

## Design Notes

This spec uses patterns already shipped and locked. No new patterns introduced. No patterns modified.

**Patterns this spec USES (defined in `.claude/rules/09-design-system.md` and shipped in earlier specs):**

- **FrostedCard variants** (`accent`, `default`, `subdued`) — `frontend/src/components/ui/FrostedCard.tsx`, shipped pre-DailyHub-trilogy. The `default` variant is the workhorse for content cards (lift off canvas, hover treatment, frosted glass chrome, rounded-3xl corners). The `subdued` variant is for meta-content (empty states, error states). The `accent` variant is for elevated promotional callouts (RelatedPlanCallout uses it).
- **Button variants** (`gradient`, `subtle`, `ghost`) — note the iteration spec changes: `gradient` now uses `text-black`, `ghost` uses `text-white/80`. These changes flow through automatically since this spec migrates to existing variants.
- **Multi-bloom BackgroundCanvas** — `frontend/src/components/ui/BackgroundCanvas.tsx`, shipped in DailyHub 1A. Provides the violet atmospheric layer used across BibleLanding, DailyHub, and now `/bible/plans`.
- **Tier 2 scripture-callout idiom** — canonical class string `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7` (matches passage and reflection-question callouts). Used for VersePromptCard if it currently or after migration uses this idiom.
- **Page-rhythm-tightening discipline** — established in iteration spec (`dailyhub-iteration-make-it-right`). Whole-page reduction, not local-gap fix; minimum blast radius (typically reduce a single container's bottom padding rather than introducing margin negatives).
- **Eyebrow patterns** — Tier 1 with violet leading dot (used inside FrostedCard `eyebrow` prop), Tier 2 without leading dot (`text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3`). Eyebrows are category labels ("Today's reflection," "Go Deeper"), NOT metadata or attribution.

**Design system recon:** `_plans/recon/design-system.md` exists and is the source of computed CSS values for FrostedCard variants, Button variants, and BackgroundCanvas. Reference it during planning when exact spacing/shadow/blur values are needed.

**No new patterns introduced.** No `[UNVERIFIED]` flags expected.

**Components/files referenced (paths to verify during recon):**

- `frontend/src/components/echoes/EchoCard.tsx`
- `frontend/src/components/daily/VersePromptCard.tsx`
- `frontend/src/components/daily/DevotionalPreviewPanel.tsx`
- `frontend/src/components/bible/PlanCard.tsx` _(or inline within the page — verified during recon)_
- `frontend/src/pages/BiblePlanList.tsx` _(or whatever the actual `/bible/plans` page file is — verified during recon)_
- `frontend/src/components/ui/FrostedCard.tsx` _(consumed, not modified)_
- `frontend/src/components/ui/BackgroundCanvas.tsx` _(consumed, not modified)_

## Pre-Execution Recon (mandatory before any code change)

The plan generated from this spec must include a recon phase that:

1. **Reads each of the four shared components in source.** Captures current rolls-own class strings, prop API, and consumers (via `grep -r 'ComponentName' frontend/src/`). Documents any surprises (unexpected consumers, unexpected behaviors, deprecated prop APIs).
2. **Reads `/bible/plans` source.** Identifies the page component file path, the plan card component file path (or confirms inline rendering), and the state-handling logic (loading, empty, error). Captures current class strings and structure.
3. **Enumerates all consumers of each shared component.** If a component is imported on a page not anticipated by this spec (e.g., DevotionalPreviewPanel turns up on Settings or Dashboard), the migration affects that page too — flag it; the plan decides whether scope expands or whether to defer that consumer.
4. **Checks whether `/bible/plans` uses RelatedPlanCallout.** If yes, verify it renders correctly post-iteration-spec; if no, no action needed.
5. **Documents the actual visual states present on `/bible/plans`.** Browse / loading / empty / error — only the states actually present in source. Does NOT fabricate states. Also enumerates any logged-in-only sections (e.g., "your in-progress plans") that need migration too.
6. **For VersePromptCard specifically:** reads source first to determine which branch of the decision tree applies (Tier 2 keep vs card→Tier 2 migrate).
7. **For plan cards specifically:** reads source to determine current semantic — clickable button, wrapped in `<Link>`, or other — and matches the existing semantic through migration.

## Out of Scope

- Migrating any other shared component beyond the four in scope.
- Migrating any other page entirely (Dashboard, PrayerWall, Bible reader chrome, AskPage, Music, Settings, Auth surfaces, Site chrome, Homepage — all defer to later specs in the rollout sequence).
- Plan detail pages (e.g., `/bible/plans/30-days-in-psalms`) — separate spec.
- Adding filtering, sorting, or categorization to `/bible/plans` — product work, not visual.
- Modifying plan icon colors or SVG sources — categorical color (cyan book / yellow star / mint heart / lavender moon) is intentional and stays AS-IS per user decision.
- Modifying plan data structure or API contract.
- Adding new visual variants or patterns beyond what's already shipped.
- Spec Z routing migration (still deferred from earlier specs).
- Any homepage / marketing surface work.
- Any DailyHub tab content (already shipped via 1A, 1B, 2, and iteration spec).
- BibleLanding (already shipped via FrostedCard pilot).
- RelatedPlanCallout migration itself (shipped in iteration spec; only regression-checked here).

## Acceptance Criteria

### Shared component migrations

- [ ] **EchoCard** renders with `<FrostedCard variant="default">` chrome on every consuming surface (lift off canvas, hover treatment, visible frosted glass, rounded-3xl corners). Inner content unchanged. All existing handlers (click, dismiss, animation) preserved. Dismiss button (if present) uses `<Button variant="ghost" size="sm">`. "From your X" attribution remains inline content, NOT promoted to eyebrow.
- [ ] **VersePromptCard** renders with the correct idiom per the source-determined decision tree: either Tier 2 scripture-callout (canonical class string `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`) OR migrated from card to Tier 2 if it was a card before. Header eyebrow (if present) uses Tier 2 eyebrow class string (no leading dot). Interactive buttons migrated to subtle variant.
- [ ] **DevotionalPreviewPanel** renders with `<FrostedCard variant="default">` chrome on both `/daily?tab=pray` and `/daily?tab=journal`. "View full devotional" CTA uses subtle Button. Dismiss button (if present) uses ghost Button. Internal eyebrow/category label converted to FrostedCard `eyebrow` prop OR preserved as inline Tier 2 eyebrow paragraph.
- [ ] **RelatedPlanCallout** still renders correctly on `/daily?tab=devotional`, `/grow/reading-plans` (if used there), and any Bible chapter page that uses it (no regression from iteration spec). Inner content layout intact.

### `/bible/plans` migration

- [ ] `/bible/plans` has the multi-bloom `<BackgroundCanvas>` violet atmospheric layer behind page content, visible at desktop, tablet, and mobile.
- [ ] `/bible/plans` hero subtitle → "Browse plans" section heading gap is tightened to ~32–48px (down from ~200px+). Plan cards moved up correspondingly. No new voids appear elsewhere on the page.
- [ ] `/bible/plans` plan cards render as `<FrostedCard variant="default">` with: lift off canvas, working hover state (lift + shadow change), rounded-3xl corners, visible frosted glass chrome. Plan card icons retain their categorical colors (cyan book / yellow star / mint heart / lavender moon — UNCHANGED).
- [ ] `/bible/plans` plan cards preserve their existing interactive semantic (button vs Link wrapping pattern — matches source).
- [ ] `/bible/plans` 2-column grid layout preserved verbatim at desktop; collapses to 1-column at mobile per existing behavior.
- [ ] `/bible/plans` empty state migrated to `<FrostedCard variant="subdued" className="text-center p-8">` with muted lucide-react icon, heading, subtitle, optional subtle Button CTA — IF an empty state exists in source today. If not present, migration explicitly noted as deferred.
- [ ] `/bible/plans` loading state migrated: if skeleton, FrostedCard default with `animate-pulse` and silhouette-matching placeholders; if spinner, canonical spinner component — IF a loading state exists in source today. If not present, migration explicitly noted as deferred.
- [ ] `/bible/plans` error state migrated similarly to empty state — IF an error state exists in source today. If not present, migration explicitly noted as deferred.

### Cross-cutting

- [ ] All shared component consumers visually coherent post-migration (no orphan rolls-own treatments left behind on any consumer page).
- [ ] All existing tests pass; updated tests pass; no new failures.
- [ ] `pnpm typecheck` passes (or equivalent — match the project's existing command; the brief references `npm run typecheck`, but this repo uses pnpm per CLAUDE.md).
- [ ] `pnpm test` passes.
- [ ] No new failing test files; no fail count regression beyond the documented baseline.

### Manual eyeball checks (visual verification)

- [ ] `/bible/plans`:
  - Multi-bloom canvas visible behind content.
  - Hero and "Browse plans" read as continuous flow (no void).
  - Plan cards lift off canvas with frosted glass treatment.
  - Plan card icons retain their categorical colors.
  - Hover on plan cards shows lift + shadow change.
  - Click on plan card navigates correctly (preserved behavior).
- [ ] `/daily?tab=pray`: DevotionalPreviewPanel + VersePromptCard render with new chrome.
- [ ] `/daily?tab=journal`: DevotionalPreviewPanel + VersePromptCard render with new chrome.
- [ ] `/daily?tab=devotional`: RelatedPlanCallout regression check — no visual regression from iteration spec.
- [ ] Echoes consumer surface (Dashboard or Echoes feature page — confirmed during recon): EchoCard renders with new chrome.

### Regression checks on already-shipped surfaces

- [ ] `/daily?tab=meditate` unchanged.
- [ ] `/bible` (BibleLanding) unchanged.
- [ ] `/grow/reading-plans` — no regression from RelatedPlanCallout iteration migration.

---

## Notable Risk Areas (from brief — must be addressed in plan)

1. **Component consumer surprises.** Pre-execution grep should enumerate every consumer of each shared component. Any unexpected consumer flagged in the plan with a scope-expand-or-defer decision.
2. **`/bible/plans` state coverage.** Recon must enumerate ALL sections and states actually present in source — including logged-in-only sections (e.g., "your in-progress plans," "completed plans," "recommended for you"). If logged-in-only sections exist, they need migration too.
3. **VersePromptCard idiom decision.** Decision tree depends on what source actually uses today. Recon must read source first; plan must apply the right branch.
4. **Plan card semantic.** Plan cards may be wrapped in a Link, have onClick navigation, or be a button. Migration must preserve whatever pattern exists. FrostedCard supports `as="button"` and `as="div"` semantics; match existing source.

---

## Branch discipline (CRITICAL — propagated from spec brief)

This spec was written without creating a new branch and without any git operations. The current branch (`forums-wave-continued`) is the working branch. The user manages all git operations manually. The plan and execution that follow this spec must respect the same discipline: no `git checkout -b`, no `git branch`, no `git switch -c`, no commits, no pushes, no stashes, no resets. If at any point during execution the working branch is unexpectedly different, STOP and ask the user.
