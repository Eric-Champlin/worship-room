# Implementation Plan: Spec 3 — Shared Components Migration + /bible/plans Full Migration

**Spec:** `_specs/spec-3-shared-components-and-bible-plans.md`
**Date:** 2026-05-04
**Branch:** `forums-wave-continued` (DO NOT create a new branch — user manages all git operations)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; ⚠️ stale for FrostedCard variant tokens, Button gradient/ghost, textarea glow, Daily Hub HorizonGlow architecture. Source of truth for those is the shipped source + `09-design-system.md`. Recon stays valid for hero-bg color, global tokens, BibleLanding/BackgroundCanvas baseline.)
**Recon Report:** N/A — pure visual migration on locked patterns; the four DailyHub specs (1A/1B/2/iteration) are the recon
**Master Spec Plan:** N/A — continues the post-DailyHub rollout, not a multi-spec feature with shared data models

---

## Affected Frontend Routes

- `/daily?tab=pray`
- `/daily?tab=journal`
- `/daily?tab=devotional`
- `/daily?tab=meditate` _(regression check only — VersePromptCard renders here too via MeditateTabContent)_
- `/grow/reading-plans` _(regression check only — recon confirms ZERO RelatedPlanCallout consumers here; verify-with-playwright sanity visit)_
- `/bible` _(regression check only — BibleLanding shipped via FrostedCard pilot; not modified)_
- `/bible/plans` _(primary target)_
- `/` _(Dashboard — EchoCard consumer)_

**No Bible chapter route consumes RelatedPlanCallout.** Recon-confirmed: only consumer is `components/daily/DevotionalTabContent.tsx`. Spec language about Bible chapter pages is precautionary; nothing to do there.

---

## Architecture Context

**Components migrated and their consumers (recon-verified 2026-05-04):**

| Component | File | Consumers (production) |
|---|---|---|
| `EchoCard` | `frontend/src/components/echoes/EchoCard.tsx` | `pages/Dashboard.tsx`, `components/daily/DevotionalTabContent.tsx` |
| `VersePromptCard` (+ `VersePromptSkeleton`) | `frontend/src/components/daily/VersePromptCard.tsx` | `components/daily/PrayTabContent.tsx`, `components/daily/JournalTabContent.tsx`, `components/daily/MeditateTabContent.tsx` |
| `DevotionalPreviewPanel` | `frontend/src/components/daily/DevotionalPreviewPanel.tsx` | `components/daily/PrayTabContent.tsx`, `components/daily/JournalInput.tsx` |
| `PlanBrowserPage` | `frontend/src/pages/bible/PlanBrowserPage.tsx` | route `/bible/plans` (lazy-loaded in `App.tsx:87,256`) |
| `PlanBrowseCard` | `frontend/src/components/bible/plans/PlanBrowseCard.tsx` | `PlanBrowserPage` |
| `PlanInProgressCard` | `frontend/src/components/bible/plans/PlanInProgressCard.tsx` | `PlanBrowserPage` |
| `PlanCompletedCard` | `frontend/src/components/bible/plans/PlanCompletedCard.tsx` | `PlanBrowserPage` |
| `PlanBrowserEmptyState` | `frontend/src/components/bible/plans/PlanBrowserEmptyState.tsx` | `PlanBrowserPage` (3 variants: `no-manifest`, `filtered-out`, `all-started`) |

**Components consumed but NOT modified:**

- `FrostedCard` — `frontend/src/components/homepage/FrostedCard.tsx`. Variants `accent | default | subdued`. Supports `as: 'div' | 'button' | 'article'`, `eyebrow`, `eyebrowColor`, optional `onClick` (when present, applies `cursor-pointer`, hover lift, `active:scale-[0.98]`, focus ring).
- `BackgroundCanvas` — `frontend/src/components/ui/BackgroundCanvas.tsx`. Wraps content with `relative min-h-screen overflow-hidden` + the canonical 5-stop multi-bloom gradient via inline `style={{ background: CANVAS_BACKGROUND }}`.
- `Button` — `frontend/src/components/ui/Button.tsx`. Variants `primary | secondary | outline | ghost | light | gradient | subtle`. Sizes `sm | md | lg`. `asChild` mode forwards classes via `cloneElement`.

**Conventions to follow:**

- **`<Link>` + FrostedCard interaction.** FrostedCard's hover-lift only fires when `onClick` is present (sets `isInteractive=true`). For `<Link>`-wrapped cards (EchoCard, all three Plan cards), the canonical pattern is: outer `<Link to={...} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg rounded-3xl">` with inner `<FrostedCard variant="default" as="article" className="transition-all duration-base ease-decelerate motion-reduce:transition-none group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0">`. Hover fires from the `group-hover` class (Link is the group root); focus ring lives on the Link (correct semantic — the Link is what's tab-focusable). FrostedCard does NOT receive `onClick` (we don't want its built-in focus ring or `active:scale` doubling up with the Link's).
- **Ghost Button for icon-only dismiss.** Ghost variant text class is `text-white/80 hover:text-white hover:bg-white/5`. For the X-icon dismiss we add `rounded-full !p-0 h-9 w-9` to override the ghost size padding (which assumes text content) and produce a 36px round target. Combined with the parent's `min-h-[44px]` touch wrapping (handled by giving the button itself h-9 plus surrounding flex padding) — actually for true 44×44 touch we use `h-11 w-11` (44×44) instead. Use `<Button variant="ghost" size="sm" aria-label="…" className="rounded-full !p-0 h-11 w-11 shrink-0">` for both dismiss buttons (DevotionalPreviewPanel, VersePromptCard).
- **Tier 2 scripture-callout idiom.** Canonical (per `09-design-system.md` § "FrostedCard Tier System"): `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`. Tier 2 eyebrow: `text-xs font-medium uppercase tracking-[0.15em] text-white/50` with NO leading dot (the left-stripe IS the Tier 2 signature).
- **Subtle Button** lives on dark canvas as a frosted pill: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20]`. Preferred for empty-state CTAs after migration.

**Test patterns:**

- Vitest + React Testing Library + jsdom.
- Component test files live in `__tests__/` siblings (`components/echoes/__tests__/EchoCard.test.tsx`, `components/daily/__tests__/VersePromptCard.test.tsx`, `components/daily/__tests__/DevotionalPreviewPanel.test.tsx`, `components/bible/plans/__tests__/PlanBrowseCard.test.tsx` etc., `pages/bible/__tests__/PlanBrowserPage.test.tsx`).
- Tests requiring `<Link>` wrap renders in `<MemoryRouter>` with v7 future flags (canonical pattern in `EchoCard.test.tsx`).
- Tests asserting class strings (e.g., `expect(refEl.className).toContain('text-right')`) need updates anywhere a class is changed by this migration.

**Demo-mode auth posture preserved:** All four shared components and `/bible/plans` are public surfaces. No new auth gates added, none removed. `useAuth`/`useAuthModal` interactions inside these components remain verbatim.

---

## Auth Gating Checklist

This spec adds NO new auth gates and modifies NO existing ones. Every interactive element preserves its current auth posture.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click EchoCard | Public navigation to verse via BB-38 deep link — no gate | Step 1 | None — `<Link>` navigates regardless of auth |
| Click X on VersePromptCard | Calls `onRemove` callback — no gate | Step 2 | None — local state mutation only |
| Click X on DevotionalPreviewPanel | Calls `onDismiss` callback — no gate | Step 3 | None — local state mutation only |
| Click expand/collapse on DevotionalPreviewPanel | Toggles local `isExpanded` — no gate | Step 3 | None |
| View `/bible/plans` browse, in-progress, completed | Public — no gate | Steps 5–9 | None |
| Click PlanBrowseCard | Navigates to `/bible/plans/:slug` — current source has no auth gate; preserved | Step 7 | None |
| Click PlanInProgressCard "Continue" link | Navigates to `/bible/plans/:slug/day/:dayNumber` — current source has no auth gate; preserved | Step 8 | None |
| Click PlanCompletedCard | Navigates to `/bible/plans/:slug` — current source has no auth gate; preserved | Step 9 | None |
| Click "Open Bible" / "Clear filters" CTA in empty state | Public — no gate | Step 10 | None |

If any consumer is found during execution to gate any of these (recon found none), STOP and document — preserve the gate verbatim.

---

## Design System Values (for UI steps)

Sourced from shipped source files (`FrostedCard.tsx`, `BackgroundCanvas.tsx`, `Button.tsx`) and `09-design-system.md` § "FrostedCard Tier System", "Round 3 Visual Patterns", "Daily Hub Visual Architecture".

| Component | Property | Value | Source |
|---|---|---|---|
| FrostedCard `default` | base classes | `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12] rounded-3xl p-6 shadow-frosted-base` | `FrostedCard.tsx:33` |
| FrostedCard `default` | hover (interactive) | `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5` | `FrostedCard.tsx:34` |
| FrostedCard `subdued` | base classes | `bg-white/[0.05] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.10] rounded-3xl p-5` | `FrostedCard.tsx:37` |
| FrostedCard transition | all | `transition-all motion-reduce:transition-none duration-base ease-decelerate` | `FrostedCard.tsx:69` |
| Shadow tokens | `shadow-frosted-base` | `0 4px 16px rgba(0,0,0,0.30)` | `tailwind.config.js:63` |
| Shadow tokens | `shadow-frosted-hover` | `0 6px 24px rgba(0,0,0,0.35)` | `tailwind.config.js:64` |
| Tier 2 callout | container | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7` | `09-design-system.md` § "FrostedCard Tier System" |
| Tier 2 eyebrow | text | `text-xs font-medium uppercase tracking-[0.15em] text-white/50` (no leading dot, no mb-3 unless followed by sibling block) | `09-design-system.md` § "FrostedCard Tier System" |
| BackgroundCanvas | wrapper | `<BackgroundCanvas>{children}</BackgroundCanvas>` — applies `relative min-h-screen overflow-hidden` + 5-stop gradient | `BackgroundCanvas.tsx:17–26` |
| Button `ghost` | classes | `text-white/80 hover:text-white hover:bg-white/5` | `Button.tsx:57` |
| Button `subtle` | classes | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | `Button.tsx:51-52` |
| Hero on `/bible/plans` | current padding | `pt-30 sm:pt-34 lg:pt-36 pb-10 sm:pb-12` | `PlanBrowserPage.tsx:26` |
| Hero on `/bible/plans` | tightened padding (target) | `pt-30 sm:pt-34 lg:pt-36 pb-3 sm:pb-4` | This spec — Step 6 |
| Content wrapper on `/bible/plans` | current | `mx-auto max-w-6xl px-4 py-8 sm:py-12` | `PlanBrowserPage.tsx:41` |
| Content wrapper on `/bible/plans` | tightened (target) | `mx-auto max-w-6xl px-4 py-4 sm:py-6` | This spec — Step 6 |
| First section spacing | current `mt-8` / `mt-12` | preserve (sections are inside the tightened container) | `PlanBrowserPage.tsx:47,56,69` |

[UNVERIFIED] Final hero pb / content py exact values are best guesses to land in the 32–48px target gap. Verify with `/verify-with-playwright`:
- To verify: Measure the y-coordinate gap between the bottom of "Guided daily reading to deepen your walk" subtitle and the top of the "Browse plans" or "In progress" section heading at 1440px breakpoint.
- If gap > 60px: reduce hero `pb-3 sm:pb-4` further to `pb-2 sm:pb-3`.
- If gap < 24px (subtitle visually crashes into heading): increase to `pb-4 sm:pb-5`.

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- **No new patterns introduced.** This spec uses only patterns already shipped in DailyHub 1A/1B/2 and the iteration spec. If the implementation finds itself wanting a new variant, class string, or behavior, STOP — that's scope creep.
- **FrostedCard hover-lift requires interactivity.** When wrapping a `<Link>`, FrostedCard cannot itself be the interactive element (would double up focus rings + active:scale). Use the `<Link>` + `group` + `group-hover:` pattern documented in Architecture Context.
- **`<FrostedCard as="article">`** is fine for cards rendered inside a `<Link>`. The `<article>` provides semantic landmark; the `<Link>` provides navigation.
- **Plan card icons are intentionally categorical color (cyan book / yellow star / mint heart / lavender moon) per user decision.** Do NOT change `colorClass` from `getPlanIconConfig`. Preserve verbatim.
- **`/bible/plans` currently uses `<HorizonGlow />` (Daily Hub atmospheric layer).** This spec replaces it with `<BackgroundCanvas>` (the BibleLanding/full-page-bible-cluster atmospheric layer). HorizonGlow stays scoped to Daily Hub; BackgroundCanvas is the canonical wrapper for non-Daily-Hub pages that want the multi-bloom background.
- **Ghost dismiss button pattern across the trilogy.** EchoCard has no card-internal dismiss (dismissal is hook-managed externally — DO NOT add one). VersePromptCard X dismiss → `<Button variant="ghost" size="sm" className="rounded-full !p-0 h-11 w-11">`. DevotionalPreviewPanel X dismiss → same pattern.
- **No `View full devotional` CTA exists in DevotionalPreviewPanel source today.** The spec mentions it but recon shows it does not exist — DO NOT fabricate it.
- **No loading state, no error state on `/bible/plans` source today.** `usePlanBrowser` reads synchronously from a static manifest. Per spec rule "do NOT fabricate" — note both as deferred; no migration work in this spec.
- **Daily Hub textareas use violet glow (DailyHub 1B), not white.** This spec doesn't touch textareas, but if a step ever needs to add a glow, use the canonical violet pattern.
- **All Daily Hub tab content components use `mx-auto max-w-2xl px-4 py-10 sm:py-14` with transparent backgrounds.** This spec doesn't change Daily Hub root layout, only the components mounted inside.
- **Animation tokens come from `frontend/src/constants/animation.ts`.** Do not hardcode `300ms` or `cubic-bezier(...)`. The class strings used here (`duration-base`, `ease-decelerate`) map to these tokens via Tailwind config.
- **Inline element layouts:** DevotionalPreviewPanel's collapsed pill row (BookOpen icon + eyebrow/title block + ChevronDown + dismiss X) is an inline-row layout — see Inline Element Position Expectations below.

**Sourced from:** `09-design-system.md` (Round 3 Visual Patterns, Daily Hub Visual Architecture, FrostedCard Tier System, White Pill CTA Patterns, Deprecated Patterns) + iteration spec Execution Log + shipped source.

---

## Shared Data Models (from Master Plan)

N/A — pure visual migration. No new types, no new localStorage keys, no schema changes.

**localStorage keys this spec touches:** None. All component reads/writes preserved verbatim.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | EchoCard / Plan cards / DevotionalPreviewPanel render 1-column; FrostedCard p-6 padding (default variant) preserved; PlanBrowseCard min-h-[140px] preserved; tightened `/bible/plans` hero pb=3 (≈12px); content py=4 (16px) |
| Tablet | 768px | Plan cards likely still 1-column or transition; FrostedCard md:backdrop-blur-md activates; tightened hero pb sm:pb-4 (16px); content sm:py-6 (24px) |
| Desktop | 1440px | Plan cards in 2-column grid (preserved from existing layout — verify via `<PlanBrowserSection>` source); FrostedCard hover lift fully visible; multi-bloom canvas atmospheric; hero pb sm:pb-4 still applies (no lg variant) |

**Custom breakpoints:** None added by this spec. Plan card grid breakpoint behavior is owned by `PlanBrowserSection` (not modified).

---

## Inline Element Position Expectations (UI features with inline rows)

Inline rows where multiple elements should share a y-coordinate. `/verify-with-playwright` Step 6l compares `boundingBox().y` between elements.

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---|---|---|---|
| DevotionalPreviewPanel collapsed pill row | BookOpen icon, eyebrow + title block, ChevronDown icon, dismiss X Button | All four elements share y ±5px at 1440px and 768px | At 375px: dismiss X may wrap if title overflows — acceptable, but title uses `truncate` so wrapping should not occur |
| EchoCard top row | Kind icon (Highlighter/Calendar/Bookmark), verb label paragraph | Icon and text baseline aligned ±5px at all breakpoints | None — single inline group |
| PlanBrowseCard / PlanInProgressCard / PlanCompletedCard top row | Icon box (10×10), title + shortTitle stack | Icon top-aligned with title block at all breakpoints | None |
| Empty state (no-manifest) | BookOpen icon (centered), heading, paragraph, "Open Bible" Button | Vertical stack — no inline-row alignment expected | N/A |

---

## Vertical Rhythm

Expected spacing between adjacent sections after migration. `/execute-plan` Step 4g + `/verify-with-playwright` Step 6e check these. Any gap >5px off the target is a mismatch.

| From → To | Expected Gap | Source |
|---|---|---|
| `/bible/plans` hero subtitle ("Guided daily reading…") → first section heading ("In progress" if present, else "Browse plans") | 32–48px | This spec — primary acceptance criterion (down from current ~200px+) |
| `/bible/plans` "In progress" section heading → first PlanInProgressCard | preserved (owned by `PlanBrowserSection`) | Existing |
| `/bible/plans` "In progress" last card → "Browse plans" heading | preserved (`mt-12` on the Browse section wrapper) | `PlanBrowserPage.tsx:56` |
| `/bible/plans` "Browse plans" last card → "Completed" heading (if present) | preserved (`mt-12`) | `PlanBrowserPage.tsx:69` |
| `/bible/plans` last section → SiteFooter | preserved (`flex-1` on `<main>`) | Existing |
| EchoCard (Dashboard / DevotionalTabContent) → next sibling | preserved — EchoCard adds no vertical margin externally | Existing |
| DevotionalPreviewPanel (sticky) → next sibling | `mb-4` preserved on outer wrapper | `DevotionalPreviewPanel.tsx:17` |
| VersePromptCard → next sibling | `mb-4` preserved on outer wrapper | `VersePromptCard.tsx:17` |

---

## Assumptions & Pre-Execution Checklist

- [ ] Working branch is `forums-wave-continued`. STOP if different.
- [ ] User performs all git operations. CC does NOT commit, push, branch, stash, or reset.
- [ ] All four DailyHub specs (1A foundation, 1B pray/journal, 2 devotional, iteration make-it-right) are merged into the working branch — verify FrostedCard variants, Button gradient `text-black`, Button ghost `text-white/80`, violet textarea glow are all live.
- [ ] `_plans/recon/design-system.md` is loaded for hero-bg color and global tokens; FrostedCard / Button source files are the truth for component-level values.
- [ ] All [UNVERIFIED] values flagged with verification methods (one — final hero pb / content py values for the rhythm tightening).
- [ ] Recon report N/A — this is a pattern-reuse spec, not a recon-driven feature.
- [ ] Prior specs in the sequence are complete (DailyHub trilogy + iteration spec).
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark, PageTransition).
- [ ] `pnpm test` baseline captured before Step 1 so regression count is unambiguous.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| EchoCard interactive semantic — `<Link>` vs FrostedCard `as="button"` with `useNavigate()` | Keep `<Link>` outer; nest `<FrostedCard as="article">` inside; use `group` + `group-hover` for FrostedCard hover lift | Preserves middle-click-open-in-new-tab, right-click context menu, keyboard "Open Link in New Tab", and correct `<a>`-link semantics. FrostedCard `as="button"` would lose all of that. |
| EchoCard dismiss button | Do NOT add one | Source has no card-internal dismiss; dismissal is managed externally by `useEcho` hook (session-scoped Set). Spec says "Migrate any dismiss button to ghost" — none to migrate. |
| VersePromptCard X dismiss variant — spec says "subtle Button" | Use `<Button variant="ghost" size="sm">` instead | "Subtle" is a frosted-pill chrome that visually dominates a tiny X icon. Ghost is the canonical pattern for icon-only dismiss across EchoCard (no internal dismiss) and DevotionalPreviewPanel (X = ghost). The "Interactive button elements migrated to subtle variant" line in the spec applies to non-dismiss interactive buttons; the X is a dismiss button and follows the dismiss pattern. **Flag for reviewer attention.** |
| DevotionalPreviewPanel eyebrow — convert to FrostedCard `eyebrow` prop or keep inline | Keep inline as Tier 2 eyebrow paragraph | Eyebrow sits inside the collapsed pill, above the truncated title — which is a horizontal layout next to BookOpen icon, NOT a top-of-card label. FrostedCard `eyebrow` prop renders ABOVE all children with mb-4 below itself, which would break the pill layout. Spec authorizes the inline fallback ("else inline as Tier 2 eyebrow paragraph"). Update class to `text-xs font-medium uppercase tracking-[0.15em] text-white/50` (Tier 2, no leading dot, no mb because it sits above a sibling `<p>` in the same flex column). |
| DevotionalPreviewPanel "View full devotional" CTA | N/A — does not exist in source | Spec assumes one exists; recon shows it does not. Per "do NOT fabricate" rule (extended from states to CTAs), skip. |
| `/bible/plans` background — HorizonGlow vs BackgroundCanvas | Replace HorizonGlow with BackgroundCanvas | Spec explicitly requires multi-bloom BackgroundCanvas. HorizonGlow is the Daily Hub-only equivalent and was inappropriate for the Bible cluster. BibleLanding (already shipped via FrostedCard pilot) uses BackgroundCanvas; aligning `/bible/plans` matches the cluster. |
| Hero rhythm tightening — minimum blast radius | Reduce hero `pb` AND remove the `border-t border-white/[0.08]` divider AND reduce content wrapper `py` | Spec says "minimum-blast-radius reduction (typically the hero container's bottom padding)". The divider is a visible artifact between hero and content; with BackgroundCanvas providing atmosphere, the divider becomes redundant chrome. Removing it + tightening hero/content pads gives the cleanest 32–48px gap. |
| PlanBrowseCard / PlanInProgressCard / PlanCompletedCard — drop the top-edge accent line `<div className="absolute inset-x-0 top-0 h-px bg-white/20" />` | Drop it | FrostedCard provides its own chrome (border + shadow). The top-edge accent was a rolls-own flourish to lift the previous lighter card off the dark page. With FrostedCard's full chrome, it becomes redundant and visually doubles up on the border. Spec says "Preserve inner content verbatim" — the accent is outer chrome, not inner content. |
| PlanBrowserEmptyState `all-started` variant migration | Leave unchanged | It's a single 1-line `<p>` ("You've started every plan…") not a real empty state. Spec rule "If no empty state exists in source today, do NOT fabricate" extends to "do NOT promote a one-liner into a full FrostedCard subdued treatment". |
| PlanBrowserEmptyState CTAs — current Pattern 2 (white pill) → spec says subtle Button | Migrate `Open Bible` and `Clear filters` to `<Button variant="subtle" size="lg">` | Spec explicit. Subtle on a subdued FrostedCard reads as a quiet meta CTA, which is correct for empty state framing. |
| Loading / error states on `/bible/plans` | Note as deferred | Recon confirms `usePlanBrowser` reads synchronously from a static manifest; no loading or error path renders. Per spec "do NOT fabricate". |

---

## Implementation Steps

### Step 1: Migrate EchoCard to FrostedCard chrome

**Objective:** Replace the rolls-own frosted-glass classes on EchoCard with `<FrostedCard variant="default" as="article">` nested inside the existing `<Link>`. Preserve all content, navigation, and a11y semantics.

**Files to create/modify:**

- `frontend/src/components/echoes/EchoCard.tsx` — replace outer `<Link>` className from rolls-own frosted glass to thin transparent wrapper; nest `<FrostedCard variant="default" as="article">` inside; add `group`/`group-hover` plumbing for hover lift.
- `frontend/src/components/echoes/__tests__/EchoCard.test.tsx` — update class-string assertions to match new structure (the previous test asserted things on the link element directly; some assertions move to the inner article).

**Details:**

Replace the EchoCard render output:

```tsx
return (
  <Link
    to={to}
    onClick={() => onNavigate?.()}
    aria-label={`Echo: you ${verb} ${echo.reference} ${echo.relativeLabel}. Tap to open.`}
    className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
  >
    <FrostedCard
      variant="default"
      as="article"
      className="transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="text-xs text-white/50">
          You {verb} this {echo.relativeLabel}
        </span>
      </div>
      {echo.text && (
        <p className="text-base text-white leading-relaxed font-serif">
          {echo.text}
        </p>
      )}
      <p className="text-sm text-white/60 mt-3 text-right">
        &mdash; {echo.reference}
      </p>
    </FrostedCard>
  </Link>
)
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'` at the top.

The inner content (icon + verb label, verse text, reference) is preserved verbatim. The verb label "You X this Y" stays as inline content per spec — NOT promoted to FrostedCard `eyebrow` prop ("From your X" attribution is inline, not eyebrow material).

**Auth gating (if applicable):** None — public navigation.

**Responsive behavior:**
- Desktop (1440px): Card rendered with FrostedCard default variant; hover-lift on group-hover; full p-6 padding.
- Tablet (768px): Same; `md:backdrop-blur-md` activates.
- Mobile (375px): Same chrome; padding p-6 preserved; touch targets unchanged (entire Link is tappable).

**Inline position expectations (if this step renders an inline-row layout):**
- Kind icon and verb-label paragraph share y ±5px at all breakpoints (already enforced by `flex items-center gap-1.5`).

**Guardrails (DO NOT):**
- DO NOT add `onClick` to FrostedCard (would add a duplicate focus ring and active:scale on top of the Link).
- DO NOT remove the `<Link>` and replace with FrostedCard `as="button"` + `useNavigate()` — loses middle-click, right-click, and keyboard "Open Link in New Tab" support.
- DO NOT add a card-internal dismiss button — none exists in source; useEcho manages dismissal externally.
- DO NOT change verse text font (font-serif required for reading weight).
- DO NOT change `aria-label` content or `to` URL construction.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| renders verb label with relative label | unit | Asserts "You highlighted this a month ago" still present |
| renders verse text in serif | unit | Asserts verse element has `font-serif` class |
| renders reference right-aligned | unit | Asserts reference paragraph has `text-right` class |
| FrostedCard chrome present (NEW) | unit | Asserts the rendered article element has `rounded-3xl`, `border-white/[0.12]`, and `shadow-frosted-base` classes (proves migration to FrostedCard default) |
| Link still navigates to correct URL | unit | Existing test — `to` prop still produces `/bible/john/3?verse=16` |
| onNavigate fires on click | unit | Existing test preserved |
| Hover lift fires on group-hover (NEW, optional) | unit | Hover the link, assert article gets `group-hover:-translate-y-0.5` applied — may be hard to test in jsdom; can defer to playwright |

**Expected state after completion:**
- [ ] EchoCard imports FrostedCard from `@/components/homepage/FrostedCard`.
- [ ] Outer Link has `group block rounded-3xl` plus focus-ring classes.
- [ ] Inner FrostedCard renders with variant="default", as="article", and group-hover hover-lift classes.
- [ ] All inner content (icon, verb label, verse text, reference) preserved verbatim.
- [ ] All existing EchoCard tests pass (with class-string assertions updated as needed).
- [ ] Visual on `/` (Dashboard) and `/daily?tab=devotional` shows lifted FrostedCard chrome with hover lift.

---

### Step 2: Update VersePromptCard to canonical Tier 2 padding + ghost dismiss

**Objective:** VersePromptCard already uses Tier 2 idiom but with `px-4 py-4`. Update to canonical Tier 2 class string `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`. Migrate the X dismiss to `<Button variant="ghost" size="sm">`. Preserve all hooks, state, animation, and `VersePromptSkeleton`.

**Files to create/modify:**

- `frontend/src/components/daily/VersePromptCard.tsx` — update outer div padding; replace X `<button>` with `<Button variant="ghost" size="sm">`.
- `frontend/src/components/daily/__tests__/VersePromptCard.test.tsx` — update class-string assertions for new padding; ensure dismiss test still passes against Button component.

**Details:**

Update the outer div className (line 17):

```tsx
'relative mb-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7'
```

Replace lines 24–30 (the rolls-own X button) with:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={onRemove}
  aria-label="Remove verse prompt"
  className="absolute right-2 top-2 rounded-full !p-0 h-11 w-11"
>
  <X className="h-5 w-5" aria-hidden="true" />
</Button>
```

Add `import { Button } from '@/components/ui/Button'` at the top.

Update the verse text container (line 32) to compensate for new `pr-12` (X button now smaller — keep `pr-12` since the X is still 44×44 with `right-2`).

`VersePromptSkeleton` (lines 56–67): update padding to match (`px-5 py-6 sm:px-7 sm:py-7`). Inner skeleton blocks unchanged.

No eyebrow added (current source has none and reference text is the lead element, not an eyebrow).

**Auth gating (if applicable):** None — `onRemove` is a local callback prop.

**Responsive behavior:**
- Desktop (1440px): Tier 2 callout with sm:px-7 sm:py-7 (28px / 28px) padding; X button at right-2 top-2 (8px / 8px from edges).
- Tablet (768px): Same as desktop (sm: variants apply).
- Mobile (375px): Tier 2 callout with px-5 py-6 (20px / 24px); X button still 44×44 in same position.

**Inline position expectations:** N/A — no inline-row layout.

**Guardrails (DO NOT):**
- DO NOT change `motion-safe:animate-fade-in` or the `useReducedMotion()` gating.
- DO NOT change the `role="region"` or `aria-label` of the outer div.
- DO NOT change verse text rendering (font, leading, sup numbers).
- DO NOT use `Button variant="subtle"` for the X dismiss (would render frosted-pill chrome around an X icon — wrong shape). Document Edge Case decision.
- DO NOT add an eyebrow — source has none; spec says preserve.
- DO NOT modify VersePromptSkeleton structure beyond padding update.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Outer container has new padding classes | unit | Asserts `px-5 py-6 sm:px-7 sm:py-7` on the role="region" element |
| X dismiss is now a Button component | unit | Query by `aria-label="Remove verse prompt"`, assert it's a button with ghost variant classes (`text-white/80 hover:text-white hover:bg-white/5`) |
| onRemove fires when X clicked | unit | Existing — userEvent.click + expect(onRemove).toHaveBeenCalled() |
| Reference still renders in font-serif | unit | Existing |
| Verse text renders with sup numbers when multiple verses | unit | Existing |
| Animation respects prefers-reduced-motion | unit | Existing — mock useReducedMotion returning true, assert `animate-fade-in` class absent |
| Skeleton padding updated | unit | Render `<VersePromptSkeleton />`, assert outer div has `px-5 py-6 sm:px-7 sm:py-7` |

**Expected state after completion:**
- [ ] VersePromptCard imports `Button` from `@/components/ui/Button`.
- [ ] Outer div uses canonical Tier 2 padding.
- [ ] X dismiss rendered via Button ghost variant.
- [ ] All VersePromptCard tests pass.
- [ ] Visual on `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` shows tighter Tier 2 callout chrome with no behavior change.

---

### Step 3: Migrate DevotionalPreviewPanel to FrostedCard chrome + ghost dismiss

**Objective:** Replace the rolls-own frosted-glass classes on the DevotionalPreviewPanel outer container with `<FrostedCard variant="default" as="div">`. Preserve sticky positioning, expand/collapse animation, internal scroll, eyebrow, and dismiss handler. Migrate the X dismiss to `<Button variant="ghost" size="sm">`. Update inline eyebrow class to canonical Tier 2 eyebrow string.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalPreviewPanel.tsx` — replace outer `<div>` (line 18) with `<FrostedCard variant="default" as="div">`; remove the manual `bg-white/[0.06] backdrop-blur-md border border-white/[0.12] rounded-2xl` + custom shadow (provided by FrostedCard); preserve everything inside; update eyebrow class; replace X dismiss button with Button ghost.
- `frontend/src/components/daily/__tests__/DevotionalPreviewPanel.test.tsx` — update class-string assertions for new chrome; verify dismiss button query still finds the Button-rendered element via aria-label.

**Details:**

Replace lines 17–24 (outer div + className) with:

```tsx
<div className="sticky top-2 z-30 mb-4">
  <FrostedCard
    variant="default"
    as="div"
    className="overflow-hidden p-0"
  >
    {/* Collapsed Pill (always visible) */}
    <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
      ...
```

(The `p-0` override on FrostedCard removes its default `p-6` since the inner pill + expanded content have their own padding. The `overflow-hidden` ensures the rounded-3xl corners clip the expanding content.)

Update the eyebrow at line 36–38:

```tsx
<p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">
  Today&apos;s Devotional
</p>
```

(Replaces `text-xs font-semibold uppercase tracking-widest text-white/60` — canonical Tier 2 eyebrow class string per `09-design-system.md`. No leading dot. No `mb-3` since the next sibling is `<p>{title}</p>` in the same flex-col block — adding mb-3 would push the title down too far.)

Replace lines 51–58 (X dismiss button) with:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={onDismiss}
  aria-label="Dismiss devotional preview"
  className="rounded-full !p-0 h-11 w-11 shrink-0"
>
  <X className="h-4 w-4" aria-hidden="true" />
</Button>
```

Add imports:

```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'
```

The expand/collapse content (lines 62–116) is preserved verbatim — passage, reflection question Tier 2 callout, reflection body, blockquote.

NOTE: FrostedCard's `rounded-3xl` differs from the previous `rounded-2xl`. This is an intentional uplift to match the FrostedCard tier system. Verify the sticky behavior + max-height transition still look correct — both should because `rounded-3xl` corners are applied to the FrostedCard wrapper, not the expanding inner div, and `overflow-hidden` on FrostedCard prevents the expanded content from peeking past the rounded corners.

**Auth gating:** None — `onDismiss` is a local callback prop.

**Responsive behavior:**
- Desktop (1440px): FrostedCard default chrome with rounded-3xl, p-0 override; sticky `top-2`; collapsed pill with `lg:px-6` padding; expanded content max-height [50vh]; dismiss X 44×44.
- Tablet (768px): Same chrome; pill `sm:px-5` padding; expanded content `sm:px-6 sm:py-6`.
- Mobile (375px): Same chrome; pill `px-4 py-3`; expanded content `px-5 py-5`. `md:backdrop-blur-md` won't activate at 375px (only `backdrop-blur-sm`) — same as default variant base.

**Inline position expectations:**
- Collapsed pill row: BookOpen icon, eyebrow + title block, ChevronDown, dismiss X Button — all four share y ±5px at 1440px and 768px (enforced by `flex items-center gap-3`).

**Guardrails (DO NOT):**
- DO NOT remove the outer `<div className="sticky top-2 z-30 mb-4">` wrapper — the sticky positioning depends on this being a positioned ancestor (`top-2 z-30`).
- DO NOT add `onClick` to FrostedCard (would apply hover lift, focus ring, active:scale — wrong for this static container).
- DO NOT change the expand/collapse `transition-[max-height]` animation or `ease-decelerate` easing.
- DO NOT change the `aria-expanded`, `aria-controls`, or `aria-hidden` attributes.
- DO NOT promote the eyebrow to FrostedCard `eyebrow` prop (would render at top of card with mb-4, breaking the pill layout).
- DO NOT change the reflection question Tier 2 callout (lines 89–96) — that's already Tier 2 idiom and within scope of "preserve inner content".
- DO NOT add a "View full devotional" CTA — does not exist in source.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Outer chrome is FrostedCard default | unit | Assert the inner element (after sticky wrapper) has `rounded-3xl`, `border-white/[0.12]`, `shadow-frosted-base` |
| Sticky positioning preserved | unit | Assert outer wrapper has `sticky top-2 z-30 mb-4` |
| Eyebrow uses Tier 2 class | unit | Query by text "Today's Devotional", assert class includes `tracking-[0.15em] text-white/50` |
| X dismiss is Button ghost | unit | Query by aria-label "Dismiss devotional preview", assert button has ghost classes (`text-white/80 hover:text-white`) |
| onDismiss fires on X click | unit | Existing — userEvent.click + expect(onDismiss).toHaveBeenCalled() |
| Expand/collapse toggles | unit | Existing — userEvent.click on aria-expanded button, assert expanded content visible/hidden |
| Reflection question still renders Tier 2 callout | unit | Assert "Something to think about" eyebrow + reflection question text present, with `border-l-2 border-l-primary` (note: this internal callout is `border-l-2`, NOT `border-l-4`, intentional per source) |

**Expected state after completion:**
- [ ] DevotionalPreviewPanel imports FrostedCard and Button.
- [ ] Outer container uses FrostedCard default with p-0 + overflow-hidden override.
- [ ] Sticky/z-index/mb wrapper preserved.
- [ ] Eyebrow uses canonical Tier 2 class string.
- [ ] X dismiss uses Button ghost.
- [ ] Expand/collapse animation works at all breakpoints.
- [ ] All DevotionalPreviewPanel tests pass.
- [ ] Visual on `/daily?tab=pray` and `/daily?tab=journal` (after arriving from devotional context) shows lifted FrostedCard chrome on the sticky preview panel with no behavior change.

---

### Step 4: Replace HorizonGlow with BackgroundCanvas on PlanBrowserPage

**Objective:** Switch `/bible/plans` from the Daily Hub HorizonGlow atmospheric layer to the BackgroundCanvas multi-bloom wrapper used by BibleLanding. Removes the basic dark gradient and aligns with the Bible cluster's atmospheric language.

**Files to create/modify:**

- `frontend/src/pages/bible/PlanBrowserPage.tsx` — remove `HorizonGlow` import + render; wrap page content in `<BackgroundCanvas>`.

**Details:**

Replace lines 1–22 imports + JSX root with:

```tsx
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { PlanBrowseCard } from '@/components/bible/plans/PlanBrowseCard'
import { PlanBrowserEmptyState } from '@/components/bible/plans/PlanBrowserEmptyState'
import { PlanBrowserSection } from '@/components/bible/plans/PlanBrowserSection'
import { PlanCompletedCard } from '@/components/bible/plans/PlanCompletedCard'
import { PlanInProgressCard } from '@/components/bible/plans/PlanInProgressCard'
import { SEO } from '@/components/SEO'
import { BIBLE_PLANS_BROWSER_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { usePlanBrowser } from '@/hooks/bible/usePlanBrowser'

export function PlanBrowserPage() {
  const { sections, filteredBrowse, clearFilters, isEmpty, isFilteredEmpty, isAllStarted } =
    usePlanBrowser()

  return (
    <BackgroundCanvas className="flex flex-col font-sans">
      <Navbar transparent />
      <SEO {...BIBLE_PLANS_BROWSER_METADATA} />

      <main id="main-content" className="relative z-10 flex-1">
        ... (hero + content unchanged in this step; tightening in Step 6)
      </main>

      <SiteFooter />
    </BackgroundCanvas>
  )
}
```

(BackgroundCanvas already provides `relative min-h-screen overflow-hidden`. We add `flex flex-col font-sans` via its `className` prop so the page maintains the same flex column layout.)

Remove the `<HorizonGlow />` element entirely (was at line 20).

Remove the `bg-hero-bg` from the previous outer div — BackgroundCanvas's gradient covers it (the gradient base layer is `linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` which is darker than hero-bg alone).

**Auth gating:** None — public page.

**Responsive behavior:**
- Desktop (1440px): Multi-bloom canvas atmospheric layer visible behind all content.
- Tablet (768px): Same layer visible.
- Mobile (375px): Same — BackgroundCanvas radial gradients are percentage-based and scale fluidly.

**Inline position expectations:** N/A — wrapper change only.

**Guardrails (DO NOT):**
- DO NOT keep `<HorizonGlow />` AND add `<BackgroundCanvas>` — they compete and neither pattern is designed to coexist with the other.
- DO NOT remove `Navbar transparent` — transparent variant lets the canvas show through the nav.
- DO NOT remove `SEO`, `<main id="main-content">`, or `<SiteFooter>`.
- DO NOT add per-section `GlowBackground` underneath — BackgroundCanvas is the single atmospheric layer for this page.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| BackgroundCanvas wraps the page | unit | Render PlanBrowserPage in MemoryRouter, assert root rendered element has the BackgroundCanvas inline `style.background` containing `linear-gradient(135deg, #120A1F` substring (or query for `class*="overflow-hidden"`). May be brittle — alternative: shallow-render check that BackgroundCanvas component is imported + used. |
| HorizonGlow no longer rendered | unit | Assert no element matching the HorizonGlow rendered output (e.g., its 5 absolute-positioned blur divs). Or simpler: snapshot test the structural tree. |
| Hero + sections still render | unit | Existing tests — heading "Reading Plans" still present, sections render based on usePlanBrowser mock. |

**Expected state after completion:**
- [ ] PlanBrowserPage imports BackgroundCanvas, no longer imports HorizonGlow.
- [ ] Root JSX is `<BackgroundCanvas className="flex flex-col font-sans">…</BackgroundCanvas>`.
- [ ] Page renders correctly at all breakpoints.
- [ ] PlanBrowserPage tests pass.

---

### Step 5: Tighten PlanBrowserPage hero rhythm

**Objective:** Reduce the gap between the hero subtitle ("Guided daily reading to deepen your walk") and the first section heading ("In progress" or "Browse plans") from ~200px+ to 32–48px. Apply minimum-blast-radius reduction: tighten hero `pb`, remove the `border-t` divider, reduce content wrapper `py`. Verify no new voids appear elsewhere.

**Files to create/modify:**

- `frontend/src/pages/bible/PlanBrowserPage.tsx` — change hero `pb-10 sm:pb-12` to `pb-3 sm:pb-4`; remove the `<div className="mx-auto max-w-6xl border-t border-white/[0.08]" />` divider; change content wrapper `py-8 sm:py-12` to `py-4 sm:py-6`.

**Details:**

Update line 26 hero className:

```tsx
<section className="pt-30 sm:pt-34 lg:pt-36 relative flex w-full flex-col items-center px-4 pb-3 text-center antialiased sm:pb-4">
```

Delete line 38:

```tsx
{/* DELETE THIS LINE */}
<div className="mx-auto max-w-6xl border-t border-white/[0.08]" />
```

Update line 41 content wrapper className:

```tsx
<div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
```

Verify the existing `mt-8` on the In-progress section and `mt-12` on the Browse Plans section still produce a reasonable rhythm — the `mt-12` between sections (when both present) provides 48px of separation, which is correct.

[UNVERIFIED] Final values are best guesses to land in the 32–48px target gap.
- To verify: Run `/verify-with-playwright` and measure the y-coordinate gap between the subtitle bottom edge and the first section heading top edge at 1440px, 768px, and 375px.
- If gap > 60px at any breakpoint: reduce further (`pb-2 sm:pb-3` and/or `py-3 sm:py-4`).
- If gap < 24px at any breakpoint (visually crashes): increase (`pb-4 sm:pb-5` and/or `py-5 sm:py-7`).

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): Hero pt-36 (top), pb-4 (bottom), content py-6. Subtitle → first heading gap ≈ 16+24 = 40px.
- Tablet (768px): Hero pt-34, sm:pb-4 (16px), content sm:py-6 (24px). Gap ≈ 40px.
- Mobile (375px): Hero pt-30, pb-3 (12px), content py-4 (16px). Gap ≈ 28px (slightly under 32 — acceptable per spec range, but verify).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- DO NOT change hero `pt-*` values — only `pb-*` (minimum blast radius).
- DO NOT change section `mt-8` / `mt-12` — that's existing rhythm between sections, not the hero gap.
- DO NOT remove the `pb-10 sm:pb-12` and replace with `pb-0` — the hero needs SOME bottom padding to separate the subtitle from the section heading visually.
- DO NOT change `max-w-6xl` on the content wrapper.
- DO NOT introduce negative margins to "pull up" sections — minimum blast radius means reduce existing positive padding, not add negatives.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Hero pb classes updated | unit | Assert hero section className contains `pb-3 sm:pb-4` |
| border-t divider removed | unit | Assert no element matches `.border-t.border-white\/\[0\.08\]` direct child of `<main>` |
| Content wrapper py classes updated | unit | Assert content wrapper className contains `py-4 sm:py-6` |
| Visual rhythm gap 32–48px (deferred to playwright) | playwright | `/verify-with-playwright` measures bounding box y-distance |

**Expected state after completion:**
- [ ] Hero pb tightened.
- [ ] border-t divider removed.
- [ ] Content wrapper py tightened.
- [ ] PlanBrowserPage tests pass.
- [ ] Manual eyeball check: hero subtitle and first section heading read as one continuous flow.

---

### Step 6: Migrate PlanBrowseCard to FrostedCard chrome

**Objective:** Replace the rolls-own card classes on PlanBrowseCard with `<FrostedCard variant="default" as="article">` nested inside the existing `<Link>`. Drop the top-edge accent line. Preserve icon, title, shortTitle, duration metadata, curator attribution, and the existing 2-column grid behavior (owned by `PlanBrowserSection`).

**Files to create/modify:**

- `frontend/src/components/bible/plans/PlanBrowseCard.tsx` — restructure to `<article><Link><FrostedCard>...</FrostedCard></Link></article>` pattern with group-hover plumbing; drop the absolute top-edge accent div.
- `frontend/src/components/bible/plans/__tests__/PlanBrowseCard.test.tsx` — update class-string assertions.

**Details:**

Replace the entire return:

```tsx
return (
  <article aria-label={plan.title}>
    <Link
      to={`/bible/plans/${plan.slug}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
    >
      <FrostedCard
        variant="default"
        as="div"
        className="min-h-[140px] flex flex-col gap-3 transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
      >
        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{plan.title}</h3>
            <p className="text-sm text-white/70">{plan.shortTitle}</p>
          </div>
        </div>

        {/* Meta lines */}
        <p className="text-xs text-white/50">
          {plan.duration} days &middot; {plan.estimatedMinutesPerDay} min/day
        </p>
        <p className="text-xs text-white/50">By {plan.curator}</p>
      </FrostedCard>
    </Link>
  </article>
)
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'`.

Note: `as="article"` is on the OUTER element (the `<article>`), and FrostedCard is nested as a `<div>` (`as="div"` default). This preserves the existing semantic: each card is an `<article>` for assistive tech, with the `<Link>` and visual chrome inside. The previous pattern used `<article><Link className="rolls-own">` with the Link being the visible card element; the new pattern keeps the same hierarchy but moves visual chrome from the Link to a nested FrostedCard.

The `min-h-[140px]` is preserved on the FrostedCard via className override. The `overflow-hidden` from the previous card is removed because FrostedCard's `rounded-3xl` corners + the absence of the top-edge accent line means there's no overflow to hide.

The categorical icon color (`colorClass` from `getPlanIconConfig`) is preserved verbatim.

**Auth gating:** None — public navigation to plan detail page.

**Responsive behavior:**
- Desktop (1440px): FrostedCard default chrome, hover lift via group-hover; min-h-[140px]; full p-6 padding.
- Tablet (768px): Same; backdrop-blur-md activates.
- Mobile (375px): Same chrome; cards in single column (owned by `PlanBrowserSection`).

**Inline position expectations:**
- Icon box and title block share top-edge alignment via `items-start`.

**Guardrails (DO NOT):**
- DO NOT keep the top-edge accent line `<div className="absolute inset-x-0 top-0 h-px bg-white/20" />` — drop it (FrostedCard provides chrome).
- DO NOT change icon `colorClass` — categorical color is intentional per user decision.
- DO NOT change `min-h-[140px]` — preserves consistent card height across the grid.
- DO NOT use FrostedCard `as="article"` and Link nested inside — that loses the existing `<article aria-label>` outer landmark structure.
- DO NOT add `onClick` to FrostedCard.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Renders link to /bible/plans/:slug | unit | Existing |
| Renders plan title + shortTitle | unit | Existing |
| Renders icon with categorical colorClass | unit | Existing — verify Icon receives the colorClass string from getPlanIconConfig |
| FrostedCard chrome present (NEW) | unit | Assert inner div has `rounded-3xl`, `border-white/[0.12]`, `shadow-frosted-base` |
| Top-edge accent removed (NEW) | unit | Assert no element with `absolute inset-x-0 top-0 h-px bg-white/20` — i.e., the accent line is gone |
| min-h-[140px] preserved | unit | Assert FrostedCard className contains `min-h-[140px]` |

**Expected state after completion:**
- [ ] PlanBrowseCard imports FrostedCard.
- [ ] Restructured to `<article><Link><FrostedCard>...</FrostedCard></Link></article>` with group-hover.
- [ ] Top-edge accent removed.
- [ ] All existing PlanBrowseCard tests pass.
- [ ] Visual on `/bible/plans` shows lifted FrostedCard with hover treatment.

---

### Step 7: Migrate PlanInProgressCard to FrostedCard chrome

**Objective:** Same pattern as Step 6, applied to PlanInProgressCard. Preserve the progress bar, "Continue" link Button, `progress.pausedAt` indicator, and existing structure.

**Files to create/modify:**

- `frontend/src/components/bible/plans/PlanInProgressCard.tsx` — restructure to `<article><div><FrostedCard>...</FrostedCard></div></article>` (note: no Link wrapper on the OUTER — the Continue link is INSIDE the card; outer card itself is not navigable).
- `frontend/src/components/bible/plans/__tests__/PlanInProgressCard.test.tsx` — update class-string assertions.

**Details:**

Replace the return body:

```tsx
return (
  <article aria-label={plan.title}>
    <FrostedCard
      variant="default"
      as="div"
      className="min-h-[140px] flex flex-col gap-3 transition-all motion-reduce:transition-none duration-base ease-decelerate"
    >
      {/* Icon + Title row */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-white">{plan.title}</h3>
          <p className="text-sm text-white/70">
            Day {progress.currentDay} of {plan.duration}
          </p>
          {progress.pausedAt && <p className="text-xs text-white/50">Paused</p>}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full bg-white/20"
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percentComplete}% complete`}
      >
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {/* Continue button */}
      <Link
        to={`/bible/plans/${plan.slug}/day/${progress.currentDay}`}
        className="inline-flex min-h-[44px] items-center justify-center self-start rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
      >
        Continue
      </Link>
    </FrostedCard>
  </article>
)
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'`.

The "Continue" Link button is preserved verbatim (existing rolls-own pill style — spec says preserve interactive semantic). The progress bar is preserved verbatim. The `progress.pausedAt` "Paused" indicator is preserved verbatim.

NOTE: PlanInProgressCard does NOT have hover lift — there's no Link wrapping the whole card. Only the inner "Continue" button is interactive. This matches the existing source (the previous outer div had `hover:bg-white/[0.06]` but it was a non-functional hover since clicking the card body didn't navigate). FrostedCard without `onClick` renders without hover lift, which is correct. We can OPTIONALLY add a hover-lift to the FrostedCard to match the visual lift of the other plan cards, but it would lie about interactivity. Decision: NO hover-lift on PlanInProgressCard FrostedCard — matches the actual interactive surface (the Continue button).

[UNVERIFIED] Hover treatment for in-progress card is best-guess "no card-level hover, only Continue-button hover".
- To verify: Compare with PlanCompletedCard (which IS Link-wrapped) at `/bible/plans` — if both look correct visually, the asymmetry is intentional.
- If the lack of hover on in-progress feels wrong: add `hover:bg-white/[0.10] hover:shadow-frosted-hover` to the FrostedCard className (still no `-translate-y` since the card isn't navigable).

**Auth gating:** None — Continue link is public.

**Responsive behavior:**
- Desktop (1440px): FrostedCard default chrome, no card-level hover, Continue button right-aligned at self-start.
- Tablet (768px): Same.
- Mobile (375px): Same; Continue button stays self-start (left-aligned).

**Inline position expectations:** Icon + title block top-aligned (`items-start`).

**Guardrails (DO NOT):**
- DO NOT wrap the entire card in a `<Link>` — the outer card is not navigable in source; only Continue is.
- DO NOT change Continue button styling (rolls-own existing pill — outside scope).
- DO NOT change progress bar structure or aria attributes.
- DO NOT change `min-h-[140px]`, `colorClass`, or content order.
- DO NOT remove the top-edge accent line for in-progress card too (consistent with PlanBrowseCard).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Renders Continue link to /bible/plans/:slug/day/:day | unit | Existing |
| Renders plan title + day progress | unit | Existing |
| Renders Paused indicator when pausedAt present | unit | Existing |
| Progress bar shows correct percentage | unit | Existing |
| FrostedCard chrome present (NEW) | unit | Assert FrostedCard render produces `rounded-3xl`, `border-white/[0.12]`, `shadow-frosted-base` |
| Top-edge accent removed (NEW) | unit | Assert no `absolute inset-x-0 top-0 h-px bg-white/20` element |

**Expected state after completion:**
- [ ] PlanInProgressCard imports FrostedCard.
- [ ] Outer wrapper restructured: `<article><FrostedCard>...progress bar...Continue link...</FrostedCard></article>`.
- [ ] Top-edge accent removed.
- [ ] Progress bar + Continue button preserved verbatim.
- [ ] Tests pass.

---

### Step 8: Migrate PlanCompletedCard to FrostedCard chrome

**Objective:** Same pattern as Step 6, applied to PlanCompletedCard. Preserve the "Completed" badge, completion-date footer, and Link-to-detail navigation. Card IS Link-wrapped (clicking navigates to `/bible/plans/:slug`).

**Files to create/modify:**

- `frontend/src/components/bible/plans/PlanCompletedCard.tsx` — restructure to `<article><Link><FrostedCard>...</FrostedCard></Link></article>` with group-hover (same as PlanBrowseCard); preserve `opacity-85` on the FrostedCard; preserve "Completed" badge at right-3 top-3.
- `frontend/src/components/bible/plans/__tests__/PlanCompletedCard.test.tsx` — update class-string assertions.

**Details:**

```tsx
return (
  <article aria-label={plan.title}>
    <Link
      to={`/bible/plans/${plan.slug}`}
      className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
    >
      <FrostedCard
        variant="default"
        as="div"
        className="relative min-h-[140px] flex flex-col gap-3 opacity-85 transition-all motion-reduce:transition-none duration-base ease-decelerate group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
      >
        {/* Completed badge */}
        <span className="absolute right-3 top-3 z-10 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/80">
          Completed
        </span>

        {/* Icon + Title row */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Icon className={`h-5 w-5 ${colorClass}`} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-white">{plan.title}</h3>
            <p className="text-sm text-white/70">{plan.shortTitle}</p>
          </div>
        </div>

        {/* Meta line */}
        {progress.completedAt && (
          <p className="text-xs text-white/50">
            Finished {formatCompletionDate(progress.completedAt)}
          </p>
        )}
      </FrostedCard>
    </Link>
  </article>
)
```

Add `import { FrostedCard } from '@/components/homepage/FrostedCard'`.

The `relative` on FrostedCard is required for the absolute-positioned "Completed" badge.

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): FrostedCard default chrome; `opacity-85` makes completed cards quieter; hover lift via group-hover; Completed badge top-right.
- Tablet/Mobile: Same.

**Inline position expectations:** Icon + title block items-start (same as Step 6).

**Guardrails (DO NOT):**
- DO NOT remove `opacity-85` — that's the visual cue distinguishing completed cards.
- DO NOT remove the "Completed" badge or change its positioning (`absolute right-3 top-3 z-10`).
- DO NOT change `formatCompletionDate` or completed-date rendering.
- DO NOT change icon `colorClass`.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Renders link to /bible/plans/:slug | unit | Existing |
| Renders plan title + shortTitle | unit | Existing |
| Completed badge visible | unit | Existing |
| Completion date renders when completedAt present | unit | Existing |
| FrostedCard chrome present (NEW) | unit | Assert `rounded-3xl`, `border-white/[0.12]` |
| opacity-85 preserved | unit | Assert FrostedCard className contains `opacity-85` |
| Top-edge accent removed (NEW) | unit | Assert no `absolute inset-x-0 top-0 h-px bg-white/20` element |

**Expected state after completion:**
- [ ] PlanCompletedCard imports FrostedCard.
- [ ] `<article><Link><FrostedCard>...</FrostedCard></Link></article>` with opacity-85 + Completed badge + group-hover lift.
- [ ] Top-edge accent removed.
- [ ] Tests pass.

---

### Step 9: Migrate PlanBrowserEmptyState (no-manifest + filtered-out)

**Objective:** Wrap the `no-manifest` and `filtered-out` empty-state variants in `<FrostedCard variant="subdued" className="text-center p-8">`. Migrate their CTAs (Open Bible, Clear filters) from rolls-own white-pill (Pattern 2) to `<Button variant="subtle" size="lg">`. Update muted icon opacity to `/40` per spec. Leave the `all-started` variant unchanged (one-line meta-text, not a "real" empty state).

**Files to create/modify:**

- `frontend/src/components/bible/plans/PlanBrowserEmptyState.tsx` — wrap `no-manifest` and `filtered-out` returns in FrostedCard subdued; replace inline white-pill CTAs with Button subtle.
- `frontend/src/components/bible/plans/__tests__/PlanBrowserEmptyState.test.tsx` — update class-string assertions.

**Details:**

Update imports:

```tsx
import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'
```

Replace `all-started` (lines 12–18) — leave unchanged:

```tsx
if (variant === 'all-started') {
  return (
    <p className="col-span-full text-sm text-white/50">
      You've started every plan. Finish one to unlock restart from the detail page.
    </p>
  )
}
```

Replace `filtered-out` (lines 20–35):

```tsx
if (variant === 'filtered-out') {
  return (
    <FrostedCard variant="subdued" className="col-span-full text-center p-8">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold text-white">No plans match these filters</h2>
        <p className="text-white/50">Try a different combination or clear your filters.</p>
        {onClearFilters && (
          <Button variant="subtle" size="lg" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </FrostedCard>
  )
}
```

Replace `no-manifest` (lines 38–52):

```tsx
return (
  <FrostedCard variant="subdued" className="text-center p-8">
    <div className="flex flex-col items-center gap-4">
      <BookOpen className="h-12 w-12 text-white/40" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-white">No plans available yet</h2>
      <p className="text-white/50">Check back soon — new reading plans are on the way.</p>
      <Button variant="subtle" size="lg" asChild>
        <Link to="/bible">Open Bible</Link>
      </Button>
    </div>
  </FrostedCard>
)
```

The `text-white/40` on the BookOpen icon updates the previous `text-white/30` to spec ("muted lucide-react icon (~48px, `text-white/40`)").

The previous `py-16` ample vertical padding is replaced by FrostedCard subdued's default `p-5` plus an explicit `p-8` override. The inner gap is preserved via `gap-4` on the inner flex column.

The Open Bible Button uses `asChild` to render as a Link while keeping Button's subtle styling — canonical pattern when a CTA is navigation, not action. (Verified: Button.tsx supports `asChild` via `cloneElement`.)

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): Subdued FrostedCard with `p-8`; gap-4 between icon, heading, paragraph, button; centered.
- Tablet/Mobile: Same.

**Inline position expectations:** N/A — vertical stack.

**Guardrails (DO NOT):**
- DO NOT migrate the `all-started` variant — it's a 1-line meta paragraph, not a true empty state.
- DO NOT replace the `<Link>` inside Open Bible CTA with imperative navigation — `asChild` preserves Link semantics.
- DO NOT use `<Button variant="light">` (the white pill primary CTA) — spec says subtle, which is the dark frosted-pill. Subtle reads as "secondary action available" while subdued empty-state framing reads "this is OK, nothing here".
- DO NOT remove `col-span-full` from the `filtered-out` variant — it sits inside the plan card grid and must span the full width.
- DO NOT remove the BookOpen icon from no-manifest.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| no-manifest renders FrostedCard subdued chrome | unit | Render `<PlanBrowserEmptyState variant="no-manifest" />`, assert outer element has `rounded-3xl border-white/[0.10]` (subdued) and `text-center p-8` |
| no-manifest renders BookOpen icon at /40 opacity | unit | Query svg, assert parent has `text-white/40` |
| no-manifest CTA is Button subtle | unit | Query "Open Bible" link, assert ancestor button has subtle classes (`bg-white/[0.07] border-white/[0.12]`) |
| no-manifest CTA still navigates to /bible | unit | Existing |
| filtered-out renders FrostedCard subdued | unit | Same chrome assertion |
| filtered-out CTA fires onClearFilters | unit | Existing — userEvent.click + expect callback called |
| all-started variant unchanged | unit | Render `<PlanBrowserEmptyState variant="all-started" />`, assert it renders only a `<p className="col-span-full text-sm text-white/50">…</p>` (no FrostedCard) |

**Expected state after completion:**
- [ ] PlanBrowserEmptyState imports FrostedCard + Button.
- [ ] no-manifest + filtered-out wrapped in FrostedCard subdued.
- [ ] CTAs use Button variant="subtle" size="lg".
- [ ] Icon opacity updated to `/40`.
- [ ] all-started variant unchanged.
- [ ] Tests pass.

---

### Step 10: Run regression suite and verify cross-surface visual coherence

**Objective:** Verify all migrated components render correctly on every consuming surface, all existing tests pass, no test count regression beyond the documented baseline (8,811 pass / 11 pre-existing fail).

**Files to create/modify:** None (verification only).

**Details:**

Run the full regression suite:

```
cd frontend
pnpm typecheck
pnpm test
pnpm lint
```

Capture before/after fail counts. Expected:
- Before: 8,811 pass / 11 pre-existing fail.
- After: 8,811 + N pass (N = number of new tests added across Steps 1–9, expected ~10–15) / 11 pre-existing fail.
- Any NEW failing test file or fail count > 11 is a regression.

Visual eyeball check on every consuming route (manual or via `/verify-with-playwright`):

- `/bible/plans` — multi-bloom canvas visible behind content; hero + first section read as continuous flow; plan cards lift off canvas with frosted glass treatment + group-hover lift on browse and completed cards (no hover on in-progress unless verification reveals it should); icon categorical colors preserved (cyan book / yellow star / mint heart / lavender moon); 2-column grid on desktop, 1-column on mobile; clicking a plan card navigates to `/bible/plans/:slug`.
- `/daily?tab=devotional` — RelatedPlanCallout regression check (already migrated by iteration spec; should be unchanged); EchoCard renders with FrostedCard chrome.
- `/daily?tab=pray` — DevotionalPreviewPanel (when present from devotional context) shows lifted FrostedCard chrome; VersePromptCard shows tighter Tier 2 padding.
- `/daily?tab=journal` — same as pray.
- `/daily?tab=meditate` — VersePromptCard regression check; rest of tab unchanged.
- `/` (Dashboard) — EchoCard renders with FrostedCard chrome.
- `/grow/reading-plans` — no consumers of any modified component (regression sanity check passes by virtue of no changes).
- `/bible` (BibleLanding) — no changes to this page (BackgroundCanvas already present).

**Auth gating:** Verify auth posture unchanged on every surface.

**Responsive behavior:** Verify at 1440px, 768px, 375px on every surface.

**Guardrails (DO NOT):**
- DO NOT commit any code in this step — user manages all git operations.
- DO NOT mark complete unless ALL existing tests pass AND all manual eyeball checks confirm visual coherence.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| Full frontend test suite | regression | `pnpm test` — assert pass count matches baseline + new tests; fail count = 11 |
| pnpm typecheck | static | TypeScript compiles cleanly |
| pnpm lint | static | No new lint errors introduced |
| Visual verification at each consuming route | manual / playwright | Per the eyeball checklist above |

**Expected state after completion:**
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes; fail count = 11 (no regression).
- [ ] `pnpm lint` passes.
- [ ] All eyeball checks pass.
- [ ] Spec acceptance criteria all checked.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Migrate EchoCard to FrostedCard chrome |
| 2 | — | Update VersePromptCard padding + ghost dismiss |
| 3 | — | Migrate DevotionalPreviewPanel to FrostedCard + ghost dismiss |
| 4 | — | Replace HorizonGlow with BackgroundCanvas on PlanBrowserPage |
| 5 | 4 | Tighten hero rhythm on PlanBrowserPage (after BackgroundCanvas wraps) |
| 6 | — | Migrate PlanBrowseCard to FrostedCard |
| 7 | — | Migrate PlanInProgressCard to FrostedCard |
| 8 | — | Migrate PlanCompletedCard to FrostedCard |
| 9 | — | Migrate PlanBrowserEmptyState to FrostedCard subdued + Button subtle |
| 10 | 1, 2, 3, 4, 5, 6, 7, 8, 9 | Run regression suite + cross-surface visual verification |

Steps 1, 2, 3, 4, 6, 7, 8, 9 are independent and may be executed in parallel batches. Step 5 must follow Step 4. Step 10 must follow all others.

Suggested execution order for review readability: 1 → 2 → 3 (shared component trilogy) → 4 → 5 (page-level wrapper + rhythm) → 6 → 7 → 8 (plan card trilogy) → 9 (empty state) → 10 (regression).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Migrate EchoCard to FrostedCard chrome | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/echoes/EchoCard.tsx` (Link with `group block rounded-3xl` + focus ring; nested `<FrostedCard variant="default" as="article">` with group-hover lift). Updated `__tests__/EchoCard.test.tsx`: replaced "applies hover class" test with three new tests (FrostedCard chrome present on article, group-hover classes present, outer Link uses group + focus ring). All 14 tests pass (was 11 + 3 new). |
| 2 | Update VersePromptCard padding + ghost dismiss | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/daily/VersePromptCard.tsx`: outer container padding `px-4 py-4` → `px-5 py-6 sm:px-7 sm:py-7`. X button replaced with `<Button variant="ghost" size="sm" className="absolute right-2 top-2 rounded-full !p-0 h-11 w-11">` (h-11 w-11 = 44×44px tap target). VersePromptSkeleton padding updated to match. Updated `__tests__/VersePromptCard.test.tsx`: `min-h/min-w-[44px]` test updated to `h-11/w-11`, added 3 tests (Button ghost variant classes, Tier 2 padding on container, Tier 2 padding on skeleton). All 14 tests pass (was 11 + 3 new). |
| 3 | Migrate DevotionalPreviewPanel to FrostedCard + ghost dismiss | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/daily/DevotionalPreviewPanel.tsx`: outer rolls-own div replaced with `<FrostedCard variant="default" as="div" className="overflow-hidden p-0">`. Eyebrow class updated `font-semibold tracking-widest text-white/60` → `font-medium tracking-[0.15em] text-white/50` (canonical Tier 2, no leading dot). X dismiss button replaced with `<Button variant="ghost" size="sm" className="rounded-full !p-0 h-11 w-11 shrink-0">`. Sticky wrapper, expand/collapse, aria-attrs, internal Tier 2 reflection callout, blockquote, and all content preserved verbatim. Updated `__tests__/DevotionalPreviewPanel.test.tsx`: added 3 tests (FrostedCard chrome on inner element, eyebrow Tier 2 class, dismiss button ghost variant + 44×44 size). All 18 tests pass (was 15 + 3 new). |
| 4 | Replace HorizonGlow with BackgroundCanvas on PlanBrowserPage | [COMPLETE] | 2026-05-04 | Modified `frontend/src/pages/bible/PlanBrowserPage.tsx`: removed `HorizonGlow` import and render; replaced outer `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">` with `<BackgroundCanvas className="flex flex-col font-sans">`; closing tag updated. `Navbar transparent`, SEO, `<main id="main-content">`, and SiteFooter preserved verbatim. Updated `__tests__/PlanBrowserPage.test.tsx`: replaced HorizonGlow mock with BackgroundCanvas mock (passthrough with data-testid="background-canvas"); added 1 test verifying the wrapper. All 14 tests pass (was 13 + 1 new). |
| 5 | Tighten PlanBrowserPage hero rhythm | [COMPLETE] | 2026-05-04 | Modified `frontend/src/pages/bible/PlanBrowserPage.tsx`: hero `pb-10 sm:pb-12` → `pb-3 sm:pb-4`; removed `<div className="mx-auto max-w-6xl border-t border-white/[0.08]" />` divider; content wrapper `py-8 sm:py-12` → `py-4 sm:py-6`. **Plan deviation (user-approved Option 3 refinement):** Plan-prescribed values alone could not hit 32–48px target because section `mt-12` consumes 48px of the budget on the first rendered child. Added `first:mt-2` Tailwind variant to all three PlanBrowserSection call sites (className `first:mt-2 mt-8` for In progress, `first:mt-2 mt-12` for Browse plans + Completed) so the first rendered section gets 8px while subsequent sections preserve mt-12 between-sections rhythm. CSS `:first-child` selector specificity ensures `first:mt-2` wins when first. Verified at 1440px and 375px in BOTH scenarios (Browse-first: 36–48px; In-progress-first: 36–48px hero gap, 48px between sections). Updated `__tests__/PlanBrowserPage.test.tsx`: added 5 tests (hero pb tightened, border-t removed, content wrapper py tightened, Browse-first first:mt-2 className, In-progress-first className for both sections). All 19 tests pass. |
| 6 | Migrate PlanBrowseCard to FrostedCard | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/bible/plans/PlanBrowseCard.tsx`: restructured to `<article><Link className="group block rounded-3xl ..."><FrostedCard variant="default" as="div" className="min-h-[140px] ... group-hover:...">...</FrostedCard></Link></article>`. Top-edge accent line dropped. Categorical icon colorClass preserved. Updated `__tests__/PlanBrowseCard.test.tsx`: replaced 3 deprecated chrome tests (BB-52 styling, top-edge accent, duration-base on link) with 3 new FrostedCard tests (chrome on inner div, Link group + focus ring, group-hover lift on FrostedCard). All 13 tests pass. |
| 7 | Migrate PlanInProgressCard to FrostedCard | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/bible/plans/PlanInProgressCard.tsx`: outer wrapper restructured to `<article><FrostedCard variant="default" as="div" className="min-h-[140px] ...">...</FrostedCard></article>` (no outer Link wrap; only inner Continue link is interactive — no card-level hover lift, matches actual interactive surface). Top-edge accent dropped. Progress bar + Continue button + Paused indicator + colorClass preserved verbatim. Updated `__tests__/PlanInProgressCard.test.tsx`: replaced 1 deprecated chrome test with 1 new FrostedCard test, added 1 test verifying only the Continue link is present (no outer card-level navigation). All 7 tests pass. |
| 8 | Migrate PlanCompletedCard to FrostedCard | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/bible/plans/PlanCompletedCard.tsx`: restructured to `<article><Link className="group block rounded-3xl ..."><FrostedCard variant="default" as="div" className="relative min-h-[140px] ... opacity-85 ... group-hover:..."><span Completed badge>...</FrostedCard></Link></article>`. `relative` on FrostedCard required for absolute Completed badge. opacity-85 + group-hover lift both applied to inner card. Top-edge accent dropped. Updated `__tests__/PlanCompletedCard.test.tsx`: opacity-85 assertion moved from link to inner FrostedCard, replaced 1 deprecated chrome test with 1 new FrostedCard test, added 1 hover-lift + opacity test. All 7 tests pass. |
| 9 | Migrate PlanBrowserEmptyState (no-manifest + filtered-out) | [COMPLETE] | 2026-05-04 | Modified `frontend/src/components/bible/plans/PlanBrowserEmptyState.tsx`: imports FrostedCard + Button. `no-manifest` and `filtered-out` variants wrapped in `<FrostedCard variant="subdued" className="text-center p-8">`; the filtered-out variant additionally has `col-span-full`. CTAs migrated from rolls-own white-pill to `<Button variant="subtle" size="lg">`. Open Bible CTA uses `asChild` to render Link with subtle styling. BookOpen icon opacity updated `text-white/30` → `text-white/40` per spec. `all-started` variant left as plain `<p>` (per Edge Case decision). Updated `__tests__/PlanBrowserEmptyState.test.tsx`: added 6 tests (all-started stays plain p, no-manifest FrostedCard subdued chrome, no-manifest icon /40 opacity, no-manifest CTA Button subtle asChild Link, filtered-out FrostedCard subdued + col-span-full, filtered-out CTA Button subtle). All 10 tests pass. |
| 10 | Run regression suite + cross-surface visual verification | [COMPLETE] | 2026-05-04 | **Regression sweep:** `pnpm lint` exit 0 ✓; `npx tsc --noEmit` exit 0 ✓; `pnpm test --run` baseline 9,376 pass / 14 fail across 5 files → after 9,398 pass (+22) / 14 fail across same 5 files. Zero new failures. The +22 matches the new tests added across Steps 1-9 exactly (3+3+3+1+5+0+1+1+6=22, with replacements netting to +22). All 14 remaining failures are pre-existing in GrowthGarden* / useFaithPoints / Pray — none touch any component this spec modified. **Visual verification (Playwright @ 1440px and 375px):** `/bible/plans` shows BackgroundCanvas multi-bloom atmospheric layer; hero → first-section gap landed at 36–48px in both Browse-first and In-progress-first scenarios; FrostedCard chrome on all plan cards with categorical icon colors preserved (cyan/yellow/mint/lavender); 2-column grid on desktop preserved; no top-edge accent lines (correctly removed). DevotionalPreviewPanel verified live in /daily?tab=journal context: FrostedCard chrome, Tier 2 eyebrow class, sticky pill with all 4 inline elements on same y-axis (BookOpen / eyebrow+title / chevron / ghost X dismiss). EchoCard structurally verified via unit tests; live render requires user history not seeded. VersePromptCard structurally verified via unit tests; live render requires devotional context flow. |
