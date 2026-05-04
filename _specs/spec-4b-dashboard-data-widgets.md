# Spec 4B: Dashboard Data Widgets

**Master Plan Reference:** Direction document at `_plans/direction/dashboard-2026-05-04.md` is the locked decision set for the three Dashboard sub-specs (4A foundation, 4B data widgets, 4C social/recap/tiles). Recon at `_plans/recon/dashboard-2026-05-04.md` is the verified pre-state. Spec 4A (`_specs/spec-4a-dashboard-foundation.md`) shipped the visual baseline — BackgroundCanvas, DashboardCard → FrostedCard primitive migration, DashboardHero migration, GrowthGarden double-mount fix, CustomizePanel chrome alignment, the global `bg-primary` solid → subtle Button migration, the global `text-primary` ghost → `text-white/80` link migration, the liturgical greeting recency fix, and a follow-up patch promoting GettingStartedCard to `<FrostedCard variant="accent">`. This spec implements direction-doc Decision 11 (Tonal Icon Pattern, system-wide debut) plus the per-widget content polish that 4A deliberately deferred. Decisions 4 (Getting Started accent variant — already shipped via post-4A patch), 7 (Lora italic for scripture only), and 10 (MoodChart ghosted empty state preserved) are honored throughout.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. If the working tree is on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard, logged-in users) — every change in this spec lands here
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surfaces (DailyHub uses Button subtle/ghost variants and FrostedCard primitives that this spec touches indirectly via shared design system)
- `/bible` (BibleLanding) — regression surface (consumes BackgroundCanvas + FrostedCard already; verify nothing changes)
- `/bible/plans` — regression surface (consumes FrostedCard accent already; verify the Tonal Icon Pattern's mini-card alignment in ReadingPlanWidget is consistent with the existing /bible/plans treatment)

---

## Overview

Spec 4A landed the chrome — every Dashboard widget now sits inside a `<FrostedCard variant="default">` surface with the system's frosted-glass tokens, multi-bloom atmospheric backdrop, and migrated buttons/links. What 4A deliberately did NOT do was per-widget content polish: the icons inside each card still read as a generic violet-monochrome wash with no scannability cue, the GratitudeWidget save flow still uses the pre-system `border-white/10 bg-white/5` input chrome, the StreakCard badge pill still uses an inline `backgroundColor: rgba(139,92,246,0.2)` style, and the ActivityChecklist progress ring still hardcodes `stroke="#6D28D9"`. Spec 4B fixes all of that across the data-leaning half of the widget grid.

The load-bearing change is the **Tonal Icon Pattern** — a system-wide visual addition introduced for the first time on Dashboard. Each card's category icon adopts a desaturated tonal color that signals what the widget is FOR (warm rose for gratitude, muted blue for scripture, mint for completion, lavender for introspection, amber for warmth/effort), while everything else in the card stays in the violet/glass system. Color carries function, not decoration. The icon is the only colored element; the chrome stays familial. After Spec 4C ships, the pattern gets documented in `09-design-system.md` for system-wide adoption on Music, Local Support, and other surfaces.

Alongside the icon pattern, this spec applies the per-widget polish that 4A deferred: StreakCard badge-pill class migration, MoodChart tooltip alignment, ActivityChecklist ring-stroke + special-icon tonal application, TodaysDevotionalCard category-pill treatment, VerseOfTheDayCard scripture italic preservation (Decision 7), ReadingPlanWidget mini-card verification, PrayerListWidget content polish, RecentHighlightsWidget tonal application across empty + filled states, GratitudeWidget input-chrome migration to the violet-glow textarea pattern from DailyHub Pray/Journal, ChallengeWidget polish across its 3 conditional states, and BadgeGrid overlay alignment.

This spec is visual-only. No data fetching changes, no hook changes, no localStorage keys, no API/backend changes. Behavioral preservation is non-negotiable — every existing test that asserts on behavior (click handlers, data flows, form submission, conditional rendering branches, completion tracking) must continue to pass without modification. Tests that asserted on specific class names changed by this spec are updated to the new tokens. The MoodChart ghosted-chart empty state stays inviting (Decision 10 — NOT migrated to FeatureEmptyState). The MoodChart morning line stroke stays `#8B5CF6` violet (data visualization color, not categorical icon). The GrowthGarden palette stays earth-tone (Decision 2 — locked exception, not in scope here either). The StreakCard "Restore Streak" amber emergency button stays amber (deliberate warm-emergency cue that conflicts intentionally with the violet system).

## User Story

As a **logged-in user landing on the Dashboard**, I want each widget to read at a glance — a soft rose Heart on the gratitude card, a muted blue BookOpen on the devotional card, a lavender Activity icon on the mood chart, a mint CheckCircle on today's activity — so that the page becomes scannable by category color while still feeling like a single coherent atmospheric system, and so that when I sit down to write three things I'm grateful for, the input fields glow softly the same way the Pray and Journal textareas do — sanctuary continuity across surfaces.

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. Verify the working branch contains Spec 4A plus the GettingStartedCard accent FrostedCard patch. Specifically:
   - `frontend/src/pages/Dashboard.tsx` wraps `<main>` in `<BackgroundCanvas>`.
   - `frontend/src/components/dashboard/DashboardCard.tsx` renders as `<FrostedCard variant="default">` (or wraps a section inside FrostedCard if 4A's Option B was chosen for `aria-labelledby` forwarding).
   - `frontend/src/components/dashboard/GrowthGarden.tsx` renders as a single responsive SVG.
   - `frontend/src/components/dashboard/GettingStartedCard.tsx` renders as `<FrostedCard variant="accent">`.
   - All `bg-primary` solid buttons in 4A scope (EveningReflectionBanner Reflect Now, GratitudeWidget Save, PrayerListWidget Add Prayer, InstallCard Install, CustomizePanel buttons, MoodCheckIn submit) are migrated to `<Button variant="subtle">`.
   - All `text-primary` ghost links in 4A scope are migrated to `text-white/80 hover:text-white` (or `<Button variant="ghost" size="sm">` where button-affordance is appropriate).
2. Verify the direction doc at `_plans/direction/dashboard-2026-05-04.md` is present and matches the locked decisions referenced throughout this spec — particularly Decision 11 (Tonal Icon Pattern with the per-widget assignment table), Decision 7 (scripture italic), Decision 10 (MoodChart empty state preserved).
3. Verify the recon at `_plans/recon/dashboard-2026-05-04.md` is present.
4. Capture a test baseline before any change: `cd frontend && pnpm test -- --run --reporter=verbose 2>&1 | tail -50` and `pnpm typecheck`. Record total pass/fail counts. The post-4A baseline target is **9437 pass / 2 fail** (the 2 documented flakes carried over). Any new failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. Read each of the 11 widget files in scope to confirm the current import set (lucide-react icons), the existing structure (icon-with-container vs. inline-with-heading), and any conditional rendering branches (empty state, filled state, intermediate states for ChallengeWidget and ReadingPlanWidget). The Tonal Icon Pattern application choice (use a `bg-white/[0.05]` rounded-square container vs. apply tonal color inline) is per-widget and depends on existing structure — read first, then apply.
6. Verify what the `text-success` token resolves to in `tailwind.config` (referenced in ActivityChecklist) — if it resolves to a green that doesn't match the mint family the Tonal Icon Pattern wants, plan to migrate item-row check icons to `text-emerald-300` or `text-emerald-400` instead.
7. Verify whether BadgeGrid is structurally coupled to StreakCard (rendered inline within StreakCard) or is a standalone overlay component imported elsewhere. The brief permits both shapes — read the source to determine which approach the implementation should take.
8. Verify the existing icon imports in each widget. If a widget currently uses an icon name that doesn't match the assignment table in Decision 11 (e.g., RecentHighlightsWidget might already use Bookmark, StickyNote, or BookOpen depending on the state), keep the existing icon and apply the tonal color rather than swapping the icon glyph. Icon glyph swaps are out of scope.

#### Tonal Icon Pattern — application convention

The pattern lives in the direction doc Decision 11 and the brief. Restated here for executor reference:

**The pattern:**

- Card chrome stays in the violet/glass system (already shipped in 4A via DashboardCard → FrostedCard).
- Icon container is a small rounded square at `bg-white/[0.05]` — quiet, in-system. When the existing structure uses a container.
- Icon itself carries a tonal color signaling category. When the existing structure has the icon inline with the heading (no container), keep it inline and apply the tonal color directly.
- Colors are muted/pastel, never fully saturated.
- The icon is the ONLY colored element in the card; everything else stays violet/glass.

**Container pattern (when applied):**

```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
  <BookOpen className="h-5 w-5 text-sky-300" aria-hidden="true" />
</div>
```

**Inline pattern (when applied):**

```tsx
<BookOpen className="h-5 w-5 text-sky-300" aria-hidden="true" />
```

**Tonal token families** (CC selects the exact shade per widget during execution based on rendered contrast against the FrostedCard chrome — these are the families, not the literal final values):

| Family                       | Suggested tokens                       | Used by                                  |
| ---------------------------- | -------------------------------------- | ---------------------------------------- |
| Pink/rose (gratitude/care)   | `text-pink-300` or `text-rose-300`     | GratitudeWidget                          |
| Pink-violet (prayer)         | `text-pink-300` slightly cooler        | PrayerListWidget                         |
| Muted blue (study/scripture) | `text-sky-300` or `text-blue-300`      | TodaysDevotionalCard, ReadingPlanWidget  |
| Warm cream/parchment         | `text-amber-100` or `text-yellow-200`  | VerseOfTheDayCard                        |
| Lavender (introspection)     | `text-violet-300`                      | MoodChart                                |
| Mint/green (completion)      | `text-emerald-300` or `text-teal-300`  | ActivityChecklist                        |
| Amber (active/warm)          | `text-amber-400` (existing flame)      | StreakCard, ChallengeWidget              |
| Warm yellow (highlight/note) | `text-yellow-300` or `text-amber-300`  | RecentHighlightsWidget                   |

**Application discipline:** Apply the pattern in a way that fits the existing widget structure. Do not impose a container where none exists if it would disturb the layout; do not strip a container if it already reads correctly. The end-state contract is "icon carries tonal color, everything else stays in-system" — the pattern is a convention, not a forced template.

#### Change 1 — StreakCard

Modify `frontend/src/components/dashboard/StreakCard.tsx`.

**Tonal icon (PRESERVED):** The Flame icon stays amber when the streak is active and `white/30` when inactive. This is a preservation, not a migration — the existing flame color logic was verified on 4A screenshots and is documented as Decision 11's amber assignment for StreakCard. NO change to flame color logic.

**Per-widget polish:**

- **AnimatedCounter typography.** Align the streak counter typography with the StreakCard header so it reads as an active state. If the counter currently uses `text-white`, consider bumping to `text-white/95` or matching whatever weight/size the StreakCard header uses. Read the file during execution and choose what reads best at viewport.
- **"Longest: N days" muted tone.** Confirm the longest-streak label uses `text-white/60` or a similarly muted tone. If it currently uses a different shade, migrate.
- **Badge pills (3 inline recent badges that open BadgeGrid).** Migrate the current `rounded-full` element with inline `style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}` to a Tailwind class. Use `bg-violet-500/20 hover:bg-violet-500/30 transition-colors`. Preserve every other class on the element (rounded shape, padding, click handler, aria-label). The migration is class-only — the visual appearance should be near-identical, just system-aligned and removed from inline styles.
- **"Restore Streak" amber button (PRESERVED).** When the free repair is available, the button renders with amber treatment. Preserve the amber as-is — this is a deliberate "warm emergency" color cue that intentionally conflicts with the violet system to signal urgency. Do NOT migrate to subtle Button or to the violet system. Per direction doc Decision 5's exception clause.
- **"View all badges" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify still working post-execution; if it regressed, re-apply.
- **FP progress bar with direction-aware glow (PRESERVED).** The progress bar uses inline `boxShadow` with violet glow on increase and amber glow on decrease. Preserve verbatim. This is a deliberate UX touch documented in the recon and in 4A's spec.

#### Change 2 — MoodChart

Modify `frontend/src/components/dashboard/MoodChart.tsx`.

**Tonal icon:** Apply `text-violet-300` (lavender — signals introspection / feeling) to the existing chart-related icon in the card header. Common candidates already in use: Activity, HeartPulse, LineChart, TrendingUp. Whichever is currently imported, keep it and apply the lavender tonal color.

**Per-widget polish:**

- **Empty state preservation (Decision 10).** The ghosted-chart-with-overlay empty state ("Your mood journey starts today" + "Check in now" link) stays. Do NOT migrate to FeatureEmptyState. Decision 10 is explicit and locked. The ghosted dummy chart is the inviting affordance — replacing it with a generic empty-state component would lose the "this is what your data will look like" hint. Verify the "Check in now" link uses `text-white/80 hover:text-white` (already migrated in 4A).
- **MoodTooltip alignment with FrostedCard tooltip styling.** When the user hovers a data point, Recharts renders a custom tooltip via the `<MoodTooltip>` component. Align its styling with the FrostedCard system: frosted dark background (e.g., `bg-white/[0.07] backdrop-blur-md`), white text, `rounded-lg`, soft border (`border-white/[0.12]`), subtle shadow. The tooltip becomes a small floating frosted-glass element matching the rest of the page's surfaces.
- **Chart axis tick text.** Currently uses `rgba(255,255,255,0.5)` via Recharts' `tick` API. Judgment call: keep as-is if Recharts doesn't accept Tailwind class strings cleanly through its prop API, or migrate to a Tailwind class equivalent if it does. Document the decision inline. The visual target is "muted axis labels" — `text-white/50` semantically.
- **Chart line strokes (PRESERVED).** The morning mood line stays violet `#8B5CF6`, the evening line stays transparent with custom dots, the connecting lines between morning/evening dots stay `rgba(255,255,255,0.15)`. NO color change to the line strokes. They are scientific data visualization, not categorical icons. The Tonal Icon Pattern explicitly does NOT apply to chart strokes.
- **"See More" link in card header (VERIFY).** Already migrated to `text-white/80` in 4A. Verify.

#### Change 3 — ActivityChecklist

Modify `frontend/src/components/dashboard/ActivityChecklist.tsx`.

**Tonal icon:** Apply `text-emerald-300` (mint/green — signals completion / growth) to the CheckCircle icon (or whichever completion-themed icon is currently in the card header). If the choice between `text-emerald-300` and `text-teal-300` is ambiguous at execution, render both side-by-side and pick what reads cleaner against the FrostedCard surface.

**Per-widget polish:**

- **60×60 progress ring stroke.** Currently `stroke="#6D28D9"` hardcoded. Migrate to a Tailwind violet token if Tailwind supports stroke-only color tokens at the version in use (`stroke-violet-600` or similar). If Tailwind in this project does NOT support stroke-only color utilities cleanly, keep the hardcoded `#6D28D9` and document the constraint inline. Either choice preserves the violet visual.
- **Item rows (Circle / CircleCheck icons).** Preserve the structure. If the completed-item check icon currently uses `text-success` and `text-success` resolves to a green that doesn't match the mint family the pattern wants, migrate to `text-emerald-300` (or `text-emerald-400` if `300` reads too pale on the FrostedCard surface). Verify what `text-success` resolves to in `tailwind.config` during pre-execution recon.
- **Special icons inside item rows.** ActivityChecklist surfaces certain activity types with specific icons: BookOpen for the readingPlan item, Moon for the reflection item. Apply tonal colors per the pattern: `text-sky-300` for BookOpen (matches Devotional family), `text-violet-300` for Moon (matches end-of-day / introspection family). Document the per-icon application choice inline.
- **Multiplier preview message at the bottom.** Typography review: ensure it reads as utility text (`text-white/60` or similar muted tone). If it currently uses `text-white` or `text-primary` it pulls focus inappropriately — migrate to muted utility tone.

#### Change 4 — TodaysDevotionalCard

Modify `frontend/src/components/dashboard/TodaysDevotionalCard.tsx`.

**Tonal icon:** Apply `text-sky-300` (or `text-blue-300` — pick during execution based on contrast) to the BookOpen icon in the card header. This is the muted-blue / study/scripture family.

**Per-widget polish:**

- **Category pill ("Anxiety and Peace" example from screenshot).** Keep the `rounded-full` shape. Align the color treatment with the FrostedCard surface — replace whatever the current treatment is with `bg-white/[0.05] text-white/70 px-2 py-0.5 rounded-full text-xs` (or equivalent tokens that match the system's muted category-indicator pattern). Read the existing implementation and migrate cleanly.
- **Reflection preview (line-clamp-2).** Confirm the body text reads as content (`text-white/80` or similar). If it currently uses a more saturated or more muted tone that competes with the heading or fades into the background, align with `text-white/80`.
- **"Read today's devotional →" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.
- **Check icon on read state.** When the user has read today's devotional, a Check icon renders. Apply `text-emerald-300` (mint) to this icon to signal completion — this matches the ActivityChecklist completion family.

#### Change 5 — VerseOfTheDayCard

Modify `frontend/src/components/dashboard/VerseOfTheDayCard.tsx`.

**Tonal icon:** Apply `text-amber-100` (or `text-yellow-200` — pick during execution) to the BookOpen icon in the card header. Warm cream / parchment — this differentiates VerseOfTheDay from TodaysDevotional's muted blue, signaling "scripture text" (the verse itself) vs. "scripture-based teaching" (devotional reflection). Both use BookOpen; the tonal color differentiates the function.

**Per-widget polish:**

- **Verse text PRESERVED in `font-serif italic` (Decision 7).** The verse body stays in Lora italic. Do NOT migrate to non-italic. Scripture is the canonical Lora italic case per direction doc Decision 7. Verify the existing implementation already uses `font-serif italic`; if it has drifted, restore.
- **Reference styling (e.g., "Romans 8:28").** Keep as `text-white/50` (citation, muted). If it currently uses a different shade, align.
- **"Meditate on this verse →" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.
- **Share button.** Render as `<Button variant="ghost" size="sm">` if not already. Preserve every click handler and the SharePanel modal trigger behavior verbatim.
- **SharePanel modal (NOT MODIFIED).** The modal triggered by Share is out of scope — modal sweep is deferred to 4D. Spec 4B's edits stop at the trigger button.

#### Change 6 — ReadingPlanWidget

Modify `frontend/src/components/dashboard/ReadingPlanWidget.tsx`.

**Tonal icon:** Apply `text-sky-300` (matches the Devotional muted-blue family) to the BookOpen icon in the card header. Reading plans are scripture-study; the family alignment is intentional.

**Per-widget polish across 4 conditional states:**

- **Active plan state (progress bar visible).** Progress bar styling: keep `bg-white/10` track and `bg-primary` violet fill. This matches the StreakCard FP progress bar pattern. NO change to the bar tokens.
- **All-completed state.** Verify the celebratory framing reads warmly without competing for attention. Typography alignment with `text-white/80` for body text.
- **Recently-completed state.** Verify the typography and framing match the all-completed state's voice.
- **Discovery state (3 mood-matched plan cards).** PRESERVE the existing colored category icons (cyan book, yellow star, mint heart, lavender moon already applied per the `/bible/plans` pattern). These mini-cards already use a flavor of the Tonal Icon Pattern. Verify color alignment against the new FrostedCard surface — if any of the pre-existing mini-card colors look wrong against the upgraded chrome, migrate them to the closest tonal family in the table.
- **"Continue reading" / "Browse all plans" links (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.

#### Change 7 — PrayerListWidget

Modify `frontend/src/components/dashboard/PrayerListWidget.tsx`.

**Tonal icon:** Apply pink-violet (slightly cooler than gratitude rose to differentiate from GratitudeWidget) to the Heart icon in the card header. Default to `text-pink-300`; CC tunes the exact shade during execution if `text-pink-300` reads too close to the GratitudeWidget rose.

**Per-widget polish:**

- **Empty state ("Start your prayer list" + Add Prayer subtle button).** Add Prayer button already migrated to `<Button variant="subtle">` in 4A — verify. The empty-state Heart icon in the body (if any) should also receive the pink-violet tonal color.
- **Filled state (active count + most recent title + answered-this-month + "View all →" link).** Typography review for `text-white/80` body content alignment. The active count number can stay prominent (`text-white` or `text-white/95`); supporting text aligns muted.
- **"View all →" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.

#### Change 8 — RecentHighlightsWidget

Modify `frontend/src/components/dashboard/RecentHighlightsWidget.tsx`.

**Tonal icon:** Apply `text-yellow-300` (or `text-amber-300` — pick during execution) to the icon in the card header. The icon glyph is whatever is currently imported (BookOpen or Bookmark or StickyNote depending on state) — keep the existing glyph and apply the warm-yellow tonal color. Warm yellow signals the note/highlight metaphor.

**Per-widget polish:**

- **Empty state.** Renders BookOpen icon + "Start highlighting as you read" + "Open Bible →" link. Apply the warm-yellow tonal color to the empty-state body icon as well (not just the header icon). The empty state should read as a quiet invitation, not a generic placeholder.
- **Filled state (3 most-recent highlight/note items).** Each item displays a color dot or a StickyNote icon depending on whether it's a highlight or a note:
  - **Color dots (highlights).** PRESERVE — these are user-selected highlight colors (4-color highlight palette per BB-7). Do NOT migrate. The user's color choice is meaningful data, not categorical chrome.
  - **StickyNote icon (notes).** Apply mint (`text-emerald-300`) or warm yellow (`text-yellow-300`) per the note metaphor. Pick during execution; mint signals "personal annotation," yellow signals "highlight family." Either is acceptable; lock the choice in execution and document inline.
- **"See all →" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.

#### Change 9 — GratitudeWidget

Modify `frontend/src/components/dashboard/GratitudeWidget.tsx`.

**Tonal icon:** Apply `text-pink-300` or `text-rose-300` (soft rose/pink) to the Heart icon in the card header. The brief notes the pink Heart icon was visible in 4A screenshots — verify whether this is already partially applied or needs full application. If already applied with a similar token, this is a verification rather than a migration. Pick the final token during execution based on contrast.

**Per-widget polish:**

- **3 NumberedHeart input rows.** Confirm the numbered hearts (the "1", "2", "3" prefix hearts inside each input row) render with consistent muted pink that matches the header Heart icon's tonal color. If they are rendering with a different pink/rose tone, align them.
- **Input chrome migration (the load-bearing visual change in this widget).** Each `<input>` currently uses `border-white/10 bg-white/5`. Migrate to the **violet-glow textarea pattern** from DailyHub Pray and Journal:

  ```text
  border-violet-400/30 bg-white/[0.04]
  shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
  focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30
  ```

  Apply to all 3 input fields. The visual target: the same soft violet glow that surrounds the Pray and Journal textareas — sanctuary continuity across surfaces. Read the DailyHub Pray/Journal source during execution to confirm the exact class string that's actually in use; the brief's snippet is the documented pattern but the implementation may have evolved. Match what's live.
- **Save button (VERIFY).** Already migrated to `<Button variant="subtle">` in 4A. Verify.
- **CrisisBanner (NOT MODIFIED).** The CrisisBanner component renders behind crisis keyword detection and its own visual treatment is out of scope. Keyword detection logic is documented in `01-ai-safety.md` and stays authoritative; this spec does not touch the banner visually or behaviorally.
- **Saved state (after submission — 3 read-only entries with Check icons + Edit button).** Apply `text-emerald-300` (mint) to the Check icons to signal completion. Render the Edit button as `<Button variant="ghost" size="sm">` if it's not already.

#### Change 10 — ChallengeWidget

Modify `frontend/src/components/dashboard/ChallengeWidget.tsx`.

**Tonal icon:** Apply `text-amber-300` (or `text-amber-400` — slightly distinct from StreakCard's amber to avoid feeling identical, but close in family) to the Flame icon in the card header. Both StreakCard and ChallengeWidget sit in the warm/amber/effort family; the small shade differentiation prevents the two cards from reading as duplicates.

**Per-widget polish across 3 conditional states + fallback:**

- **Active state (48px progress ring + day count + themeColor accent + "Continue →").** Preserve the `themeColor` accent currently injected via inline style — challenge themes have their own brand colors documented per challenge config. The themeColor accent is data-driven content, not categorical chrome; keep it. Day count typography: align with the overall card typography hierarchy (large prominent number with muted "of N days" supporting text). The streak indicator within the active challenge (mini-flame) receives the same amber tonal color as the header flame.
- **No-active-but-season-open state ("Join challenge X").** Verify CTA framing reads as warm invitation, not transactional pressure. Typography alignment with `text-white/80` for body content.
- **No-active-no-season state ("Next challenge starts in N days" + reminder toggle).** Verify the reminder toggle button renders as either `<Button variant="subtle">` or `<Button variant="ghost">` depending on context — judgment call during execution. The toggle is a low-stakes preference, ghost is likely correct; subtle if it needs more affordance weight.
- **FeatureEmptyState fallback.** If ChallengeWidget falls through all conditional branches and renders FeatureEmptyState, no per-widget treatment is needed — FeatureEmptyState is a shared system component with its own design.
- **"Continue →" link (VERIFY).** Already migrated to `text-white/80 hover:text-white` in 4A. Verify.

#### Change 11 — BadgeGrid overlay

Modify `frontend/src/components/dashboard/BadgeGrid.tsx`.

This is the modal-style overlay shown when the user clicks "View all badges" or one of the recent-badge pills in StreakCard. The grid renders ~45 badges in 11 sections.

**Structural verification before edits:** Determine via source read whether BadgeGrid is structurally tightly coupled to StreakCard (rendered inline as a sibling) or is a standalone overlay component imported elsewhere. Both shapes are acceptable. If coupled, modify in-place with care to not regress StreakCard. If standalone, modify independently.

**Per-widget polish:**

- **Section heading typography.** Align with FrostedCard heading patterns — likely `text-white/90 text-sm font-medium` or matching whatever the system uses for sub-section labels inside cards. Read existing FrostedCard consumers (DailyHub tabs, BibleLanding sections) to anchor the visual.
- **Earned badge visual.** Keep the colored icon + label. Apply a slight glow or violet-tinted background (`bg-violet-500/10` or similar) to indicate earned state. The earned badge should read as "achievement, present" — soft warmth, not aggressive.
- **Unearned badge visual.** `<Lock>` silhouette + greyed label. Ensure contrast is muted enough to NOT compete with earned badges (e.g., `text-white/30` for the label, `text-white/20` for the lock icon). The unearned state communicates "available, not yet" — quiet, not actively shaming.
- **Overlay backdrop.** Align with the system overlay pattern — semi-transparent dark backdrop with blur (`bg-black/60 backdrop-blur-sm` or matching whatever the existing modal overlays use). Verify against the SharePanel and BadgeGrid's own existing backdrop tokens; pick the closer match to the system.
- **Close button.** Render as `<Button variant="ghost">` (sized appropriately for a modal close action — `size="sm"` if it sits in a header bar, larger if it's a dedicated close affordance).

### Non-Functional Requirements

- **TypeScript strict** — `pnpm typecheck` must pass post-migration.
- **Test baseline preservation** — every existing test must continue to pass. Tests that asserted on specific class names changed by this spec (e.g., the StreakCard badge pill `style.backgroundColor` assertion, GratitudeWidget input border/background class assertions, ActivityChecklist `text-success` class assertion if any) are expected to need updates because the chrome literally changed; update them to assert the new tokens. Tests that assert on **behavior** (button click handlers firing, conditional rendering branches selecting correctly, gratitude save persisting, badge grid open/close, mood chart hover triggering tooltip, completion tracking firing into faith points / activity engine) MUST continue to pass without modification. Net regression count is 0.
- **Accessibility (WCAG 2.2 AA)** — all icons receive `aria-hidden="true"` if they are purely decorative (which most categorical icons are once accompanied by a heading text). All interactive elements (buttons, links, badge pills) preserve their accessible name and keyboard activation. The BadgeGrid overlay must continue to trap focus when open and return focus to the trigger on close (use `useFocusTrap()` if not already wired). Color contrast for the new tonal icons is not a concern at WCAG-AA's 3:1 graphic-object minimum because the icons are accompanied by readable text labels — but verify any text rendered in the new tonal colors meets the 4.5:1 contrast threshold against the FrostedCard surface (if the spec inadvertently introduces tonal-color TEXT, which it shouldn't — tonal colors are icon-only).
- **Performance** — no regression in TTI/LCP. Tonal Icon Pattern adds zero DOM weight and zero JS — it's class-string changes only. Lighthouse Performance must stay at 90+ on `/`.
- **Reduced motion** — no new animations introduced by this spec. The existing FrostedCard hover treatments inherited from 4A continue to be `motion-safe:`-gated. The global reduced-motion safety net at `frontend/src/styles/animations.css` continues to govern.
- **Animation token discipline** — no new animation tokens introduced. If the BadgeGrid overlay or any tooltip transition is touched and a duration/easing must be specified, source it from `frontend/src/constants/animation.ts`. No hardcoded `200ms` or `cubic-bezier(...)` strings.

## Auth Gating

This spec is a visual migration on existing Dashboard widgets. It does NOT introduce new interactive elements, new gated actions, or new auth-modal triggers. Auth behavior is inherited from the existing widgets and remains unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Visit `/` | Renders `Home` (landing page), NOT Dashboard. Dashboard is auth-gated by `AuthProvider` per `02-security.md`. | Renders Dashboard with all 11 widgets covered by this spec. | N/A — handled at route level by `AuthProvider`. |
| Click streak repair "Restore Streak" button | N/A — StreakCard only renders for logged-in users. | Triggers streak repair flow (existing behavior). | N/A |
| Click any of the 3 recent-badge pills in StreakCard | N/A — only renders for logged-in users. | Opens BadgeGrid overlay (existing behavior). | N/A |
| Click "View all badges" link in StreakCard | N/A | Opens BadgeGrid overlay. | N/A |
| Hover a MoodChart data point | N/A — MoodChart only renders for logged-in users. | MoodTooltip displays for the hovered point. Behavior unchanged; visual treatment now aligns with FrostedCard tooltip pattern. | N/A |
| Click "Check in now" link in MoodChart empty state | N/A | Routes to mood check-in (existing behavior). | N/A |
| Toggle ActivityChecklist item | N/A — only renders for logged-in users. | Records activity (existing behavior). | N/A |
| Click "Read today's devotional" in TodaysDevotionalCard | N/A | Routes to today's devotional (existing behavior). | N/A |
| Click "Meditate on this verse" in VerseOfTheDayCard | N/A | Routes to meditation flow with verse context (existing behavior). | N/A |
| Click Share button on VerseOfTheDayCard | N/A | Opens SharePanel modal (existing behavior; SharePanel itself is not modified by this spec). | N/A |
| Click Continue/Browse plans in ReadingPlanWidget | N/A | Routes to plan reading or plan browser (existing behavior). | N/A |
| Click Add Prayer button in PrayerListWidget | N/A | Opens prayer-add inline form (existing behavior). | N/A |
| Click highlight item in RecentHighlightsWidget | N/A | Routes to highlight in BibleReader (existing behavior). | N/A |
| Type into a GratitudeWidget input row | N/A — widget only renders for logged-in users. | Input accepts text. The new violet-glow chrome activates focus state. Behavior unchanged. | N/A |
| Click Save in GratitudeWidget | N/A | Persists 3 entries to `wr_gratitude_entries` (existing behavior). | N/A |
| Click Edit in GratitudeWidget saved state | N/A | Returns the widget to edit state (existing behavior). | N/A |
| Click Continue/Join challenge in ChallengeWidget | N/A — widget auth-gated. | Routes to challenge detail (existing behavior). | N/A |
| Toggle reminder in ChallengeWidget no-active-no-season state | N/A | Sets reminder preference (existing behavior). | N/A |
| Open BadgeGrid overlay (any trigger) | N/A — overlay only opens from StreakCard, which is logged-in only. | Overlay opens with focus trap; close returns focus to trigger. | N/A |

**Auth-related regression watchout:** the `useFaithPoints.recordActivity` no-op for logged-out users (per `02-security.md`) and the `wr_auth_simulated` legacy fallback path are upstream of any change in this spec — verify they're unaffected by reading test output for the AuthContext / activity-engine tests.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All 11 widgets render in a single-column grid (existing DashboardWidgetGrid layout from 4A). FrostedCard chrome is viewport-independent — same surface tokens at every breakpoint. Tonal icons render at the same `h-5 w-5` (or whatever each widget's existing icon size was — the tonal application is color-only, not size). The icon container (when applied) at `h-9 w-9` taps to a 36×36 touch target — does not meet the 44×44 minimum for primary actions, but the icon container is decorative, not interactive (the badge pills, links, and buttons remain the touch targets). GratitudeWidget input rows render full-width with the violet-glow shadow visible at the smaller viewport. MoodChart resizes responsively per Recharts' default container behavior; the new tooltip styling renders correctly at narrow widths. BadgeGrid overlay renders as a full-screen modal sheet (existing behavior). |
| Tablet (640–1024px) | DashboardWidgetGrid switches to 2-column layout (existing behavior from 4A). All widgets render with the same tonal icon application. The MoodChart card has more horizontal room — the chart strokes and the new tooltip styling have more breathing room. |
| Desktop (≥ 1024px) | DashboardWidgetGrid switches to 3-column layout (existing behavior). FrostedCard hover treatments (`hover:-translate-y-0.5`, `shadow-frosted-hover`) become meaningful with cursor input. The Tonal Icon Pattern's "color carries function, not decoration" reads strongest at desktop because the user can scan the full grid at a glance — the rose, blue, mint, lavender, amber, yellow assignments work as visual signposting across the full layout. |

**Responsive notes specific to GratitudeWidget input chrome (Change 9):** the violet-glow shadow uses fixed pixel values (`0_0_20px` and `0_0_40px`). This is the same pattern in use on DailyHub Pray and Journal textareas — the glow renders correctly at every breakpoint there and should render correctly here. If the glow visually overflows the FrostedCard at narrow viewports (extremely unlikely given the existing precedent), document and adjust during execution.

**Responsive notes specific to BadgeGrid overlay (Change 11):** verify the overlay's responsive behavior at 375px / 768px / 1280px viewports. The grid of ~45 badges in 11 sections must scroll cleanly within the overlay; sections must not overflow horizontally on narrow viewports.

## AI Safety Considerations

N/A — This spec is a visual migration. It does NOT introduce new AI-generated content, new free-text input surfaces, or new crisis-detection touchpoints. The GratitudeWidget already has crisis keyword detection wired (the CrisisBanner explicitly noted as out-of-scope here — its rendering condition and visual treatment are preserved verbatim). The 3 input rows in GratitudeWidget continue to be plain-text user content (no Markdown, no HTML rendering) per `02-security.md`. Existing `01-ai-safety.md` policies remain authoritative for the underlying widget behavior.

## Auth & Persistence

- **Logged-out users:** Visiting `/` renders the landing page (`Home`), not Dashboard. Logged-out users never see any of the surfaces this spec migrates. No persistence changes.
- **Logged-in users:** All persistence behavior is preserved verbatim. Specifically:
  - StreakCard reads from `wr_streak`, `wr_streak_repairs`, `wr_badges`, `wr_faith_points` (no changes).
  - MoodChart reads from `wr_mood_entries` (no changes).
  - ActivityChecklist reads from `wr_daily_activities`, writes via `recordActivity` (no changes).
  - TodaysDevotionalCard reads from `wr_devotional_reads` and devotional content (no changes).
  - VerseOfTheDayCard reads from verse-of-day content (no persistence on widget; share opens SharePanel which has its own flow — out of scope).
  - ReadingPlanWidget reads from `wr_reading_plan_progress`, `wr_custom_plans` (no changes).
  - PrayerListWidget reads from `wr_prayer_list` (no changes).
  - RecentHighlightsWidget reads from the Bible reactive stores (`wr_bible_highlights`, `bible:notes`) — see `11b-local-storage-keys-bible.md` § "Reactive Store Consumption". Existing subscription pattern is preserved verbatim.
  - GratitudeWidget reads/writes `wr_gratitude_entries` (no changes — Save handler unchanged; visual chrome only).
  - ChallengeWidget reads from `wr_challenge_progress`, `wr_challenge_reminders` (no changes).
  - BadgeGrid reads from `wr_badges` (no changes).
- **localStorage usage:** No new keys. No key shape changes. No key migrations. Reference `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md` for the canonical inventory; this spec touches none of them at the storage layer.
- **Reactive store discipline:** RecentHighlightsWidget consumes `wr_bible_highlights` and `bible:notes` reactive stores via the existing Pattern B (inline `subscribe()` in `useEffect`) wiring shipped in BB-7/BB-8. This spec does NOT modify that subscription wiring. If during execution any change to RecentHighlightsWidget's render structure inadvertently breaks the subscription pattern, it's a regression — restore the existing pattern.

## Completion & Navigation

N/A — Dashboard is not part of the Daily Hub completion flow. No completion signals are emitted by this spec's changes. The existing per-widget completion flows (gratitude save firing into faith points, ActivityChecklist toggle firing into the activity engine, devotional read marking firing into completion tracking) are preserved verbatim; this spec only migrates their visual chrome.

## Design Notes

- **Locked decisions reference.** All structural choices in this spec follow the locked decisions in `_plans/direction/dashboard-2026-05-04.md`. Specifically: Decision 11 (Tonal Icon Pattern with the per-widget assignment table — this spec is the system-wide debut), Decision 7 (Lora italic preserved for VerseOfTheDayCard scripture text), Decision 10 (MoodChart ghosted-chart empty state preserved). Decisions 4 (Getting Started accent variant — already shipped via post-4A patch), 5 (`bg-primary` → subtle — already shipped in 4A), 6 (`text-primary` → `text-white/80` — already shipped in 4A) are honored as preservation, not re-application. Decision 8 (WeeklyRecap copy rewrite) is 4C scope. Decisions 1, 2, 3, 12, 13, 14, 15 are out of scope here.
- **Recon reference.** Pre-state details (current icon imports, current chrome tokens, current hardcoded values like `#6D28D9` and `rgba(139,92,246,0.2)`, current conditional rendering branches) live in `_plans/recon/dashboard-2026-05-04.md` and the widget source files themselves. Read the recon during planning to enumerate exact files and line numbers.
- **System patterns this spec USES (already shipped, do not modify):** FrostedCard `default` and `accent` variants. Multi-bloom BackgroundCanvas. `<Button variant="subtle">` and `<Button variant="ghost">` (with the iteration's gradient `text-black` and ghost `text-white/80` decisions baked in). The page-rhythm-tightening discipline applied in 4A. The violet-glow textarea pattern from DailyHub Pray and Journal (the visual reference for GratitudeWidget input chrome migration).
- **System patterns this spec MODIFIES:** None. This spec consumes existing patterns and applies them per-widget.
- **System patterns this spec INTRODUCES:** The **Tonal Icon Pattern** (Decision 11). This is the system-wide debut. After Spec 4C ships, this pattern gets documented in `09-design-system.md` for system-wide adoption on Music, Local Support, and other future surfaces. Do NOT add a `09-design-system.md` section in this spec — that documentation lands after 4C.
- **Visual reference for matching.** When migrating GratitudeWidget input chrome, the visual target is the violet-glow textarea pattern shipped on DailyHub Pray (`/daily?tab=pray`) and Journal (`/daily?tab=journal`). Open both in a browser at execution time and replicate the exact glow shadow, border, focus state. When migrating MoodChart's MoodTooltip, the visual target is the system's frosted-glass tooltip convention (read existing FrostedCard consumers to anchor the surface tokens). When migrating BadgeGrid overlay backdrop, the visual target is the existing modal backdrop convention used elsewhere on the site (likely SharePanel or one of the celebration overlays — check before picking tokens).
- **Anti-pressure voice continuity.** Decision 10 (MoodChart ghosted empty state preserved) is itself an anti-pressure-voice protection. Replacing the inviting "Your mood journey starts today" + ghosted dummy chart with a generic FeatureEmptyState would lose the warmth — the user sees what their data WILL look like, not a "no data" placeholder. Preserve this. Similarly, the GratitudeWidget input chrome migration to violet-glow does not change the widget's anti-pressure voice (no copy changes); it's purely a sanctuary-continuity visual upgrade.
- **Tier 1/Tier 2 hierarchy maintained.** The Tonal Icon Pattern works precisely BECAUSE the cards still feel like family. Spec 4A established that family. Spec 4B adds metadata (icon = category color) inside the family unit (card = system chrome). After 4B, scanability is restored without breaking the system. This is the design intent — verify during execution by hovering between cards on `/`: each card should read as a category at a glance, but no card should compete for attention against the others.

## Out of Scope

**Already shipped in Spec 4A (preserved here, not re-applied):**

- BackgroundCanvas wrap on `<main>`.
- DashboardCard primitive migration to `<FrostedCard variant="default">`.
- DashboardHero migration.
- GrowthGarden double-mount fix.
- CustomizePanel chrome alignment.
- Liturgical greeting recency window (Decision 15).
- All `bg-primary` solid → subtle Button migrations in 4A scope (StreakCard, GratitudeWidget Save, PrayerListWidget Add Prayer, etc.).
- All `text-primary` ghost link → `text-white/80` migrations in 4A scope.

**Already shipped in post-4A patch (preserved here, not re-applied):**

- GettingStartedCard promotion to `<FrostedCard variant="accent">`. Note: although the brief's goal sentence mentions "GettingStartedCard content," GettingStartedCard is NOT in the Files-to-modify list and is NOT one of the 11 changes — this spec treats GettingStartedCard as already shipped. If during execution it becomes clear GettingStartedCard's content treatment needs additional polish beyond the accent chrome migration, surface it as a follow-up rather than expanding 4B scope.

**Deferred to Spec 4C (social/recap/tiles):**

- FriendsPreview (leaderboard, MilestoneFeed, empty CircleNetwork).
- WeeklyRecap (with copy rewrite per direction-doc Decision 8).
- WeeklyGodMoments banner alignment.
- QuickActions 4-tile grid with tonal colors per tile.
- AnniversaryCard.
- EveningReflectionBanner content treatment (Reflect Now button migration belongs to 4A; banner content stays for 4C).
- InstallCard first-class widget promotion per Decision 12 (Install button migration belongs to 4A; widget promotion stays for 4C).
- EchoCard regression check.
- Caveat-to-gradient-text migration in GettingStartedCelebration / WelcomeWizard / WelcomeBack ceremony headings.

**Deferred to Spec 4D (modal/overlay sweep — not yet scheduled):**

- WelcomeWizard full visual treatment.
- WelcomeBack full visual treatment.
- MoodCheckIn full visual treatment.
- MoodRecommendations.
- EveningReflection 4-step modal.
- ChallengeCompletionOverlay.
- CelebrationQueue + per-celebration overlays.
- SharePanel modal (triggered by VerseOfTheDayCard Share button — this spec does NOT touch SharePanel).
- CrisisBanner visual treatment (component is gated behind crisis keyword detection in GratitudeWidget — its visual treatment is out of scope here).

**Locked exceptions (NEVER changed):**

- StreakCard "Restore Streak" amber emergency button (preserved deliberately — warm-emergency cue that intentionally conflicts with the violet system).
- StreakCard FP progress bar direction-aware glow (violet on increase, amber on decrease — preserved verbatim).
- MoodChart morning line stroke `#8B5CF6` (data visualization color, not categorical icon — Tonal Icon Pattern explicitly does NOT apply).
- MoodChart connecting lines and evening dot styling (preserved verbatim).
- MoodChart ghosted-chart empty state per Decision 10.
- VerseOfTheDayCard verse text `font-serif italic` per Decision 7.
- ReadingPlanWidget discovery mini-cards' user-selected theme colors (preserved — these mini-cards already use a flavor of the Tonal Icon Pattern from `/bible/plans`).
- RecentHighlightsWidget user-selected highlight color dots (preserved — meaningful user data, not categorical chrome).
- ChallengeWidget themeColor accent (preserved — challenge-config-driven brand color).
- GrowthGarden palette (Decision 2 — illustration, not iconography; not in this spec's scope at all).

**Out of rollout entirely (not Spec 4 anything):**

- Per-widget functional changes (data fetching, hooks, state management) — visual only.
- Anti-pressure copy review on widgets in this spec (handled in 4C for WeeklyRecap; other widgets stay).
- Performance optimization on Dashboard (separate post-migration spec — recon flagged re-render cascades from non-memoized prop objects).
- API/backend changes (none required).
- Tonal Icon Pattern documentation in `09-design-system.md` (deferred until after 4C ships).
- PrayerWall migration (Forums project Phase 5).
- Bible reader chrome (Spec 8).
- AskPage (Spec 9).
- Settings/Insights cluster (Spec 10).
- Music feature (Spec 11).
- Site chrome — Navbar, SiteFooter, SongPickSection (Spec 12).
- Homepage (Spec 13).

## Acceptance Criteria

### Tonal Icon Pattern application

- [ ] Each of the 11 widgets in scope has its tonal icon applied per the table in direction-doc Decision 11. Specifically:
  - StreakCard Flame: amber when active, white/30 when inactive (preserved — verify still working).
  - MoodChart Activity/HeartPulse/LineChart icon: lavender (`text-violet-300`).
  - ActivityChecklist CheckCircle: mint (`text-emerald-300` or `text-teal-300`).
  - TodaysDevotionalCard BookOpen: muted blue (`text-sky-300` or `text-blue-300`).
  - VerseOfTheDayCard BookOpen: warm cream/parchment (`text-amber-100` or `text-yellow-200`).
  - ReadingPlanWidget BookOpen: muted blue (matches Devotional family).
  - PrayerListWidget Heart: pink-violet (cooler than gratitude rose).
  - RecentHighlightsWidget icon: warm yellow (`text-yellow-300` or `text-amber-300`).
  - GratitudeWidget Heart: soft rose/pink (`text-pink-300` or `text-rose-300`).
  - ChallengeWidget Flame: amber (`text-amber-300` or `text-amber-400`, slightly distinct from StreakCard).
  - BadgeGrid section/header icons (where applicable): aligned with the section's category family.
- [ ] Final per-widget token selections are documented inline in the implementation plan (the brief lists token families; the plan locks the exact shade picked during execution).
- [ ] Tonal colors are muted/pastel — no fully-saturated jewel-tone icons appear post-migration.
- [ ] Icon glyphs are NOT swapped — only colors are applied. If a widget's existing icon glyph differs from the assignment table's suggested icon, the existing glyph is preserved (icon glyph swap is out of scope per Pre-execution recon item 8).

### StreakCard

- [ ] Flame icon: amber when streak is active, white/30 when inactive (preserved per Decision 11 and the brief).
- [ ] AnimatedCounter typography aligned with header (e.g., bumped to `text-white/95` if it was `text-white`).
- [ ] "Longest: N days" text uses `text-white/60` or similarly muted tone.
- [ ] 3 inline badge pills migrated from `style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}` to `bg-violet-500/20 hover:bg-violet-500/30 transition-colors` Tailwind class. Inline `style.backgroundColor` no longer present on the badge pill elements.
- [ ] "Restore Streak" amber emergency button preserved (NOT migrated to subtle Button or violet system).
- [ ] "View all badges" link verified to use `text-white/80 hover:text-white` (post-4A migration intact).
- [ ] FP progress bar with direction-aware glow (violet on increase, amber on decrease) preserved verbatim — no class changes, no inline-style changes.

### MoodChart

- [ ] Header icon migrated to `text-violet-300` lavender.
- [ ] MoodTooltip styling aligned with FrostedCard tooltip pattern: frosted dark background, white text, rounded-lg, soft border, subtle shadow.
- [ ] Empty state ("Your mood journey starts today" + ghosted dummy chart + "Check in now" link) PRESERVED — NOT migrated to FeatureEmptyState (Decision 10).
- [ ] Morning mood line stroke remains `#8B5CF6` violet (data visualization, not categorical icon).
- [ ] Evening line transparent + custom-dot styling preserved.
- [ ] Connecting lines between morning/evening dots preserved (`rgba(255,255,255,0.15)`).
- [ ] Chart axis tick text decision documented inline (kept as `rgba(255,255,255,0.5)` OR migrated to Tailwind class — judgment call per Recharts API constraints).
- [ ] "See More" link verified `text-white/80` (post-4A migration intact).

### ActivityChecklist

- [ ] Header CheckCircle migrated to mint tonal color (`text-emerald-300` or `text-teal-300`).
- [ ] Progress ring stroke decision documented inline: migrated to `stroke-violet-600` Tailwind token if the version supports stroke-only color utilities, OR kept hardcoded `stroke="#6D28D9"` with constraint documented.
- [ ] Item-row Circle/CircleCheck icons aligned with mint family (migrated from `text-success` to `text-emerald-300` or `text-emerald-400` if `text-success` resolved to a non-mint green).
- [ ] BookOpen special icon (readingPlan item) tonal blue (`text-sky-300`).
- [ ] Moon special icon (reflection item) tonal lavender (`text-violet-300`).
- [ ] Multiplier preview message at bottom uses muted utility text tone (`text-white/60` or similar).

### TodaysDevotionalCard

- [ ] Header BookOpen migrated to muted blue (`text-sky-300` or `text-blue-300`).
- [ ] Category pill (e.g., "Anxiety and Peace") aligned with FrostedCard surface — `bg-white/[0.05] text-white/70 px-2 py-0.5 rounded-full text-xs` or equivalent.
- [ ] Reflection preview (line-clamp-2) typography aligned with body content tone (`text-white/80`).
- [ ] Check icon on read state migrated to mint (`text-emerald-300`) for completion signal.
- [ ] "Read today's devotional →" link verified `text-white/80` (post-4A intact).

### VerseOfTheDayCard

- [ ] Header BookOpen migrated to warm cream/parchment (`text-amber-100` or `text-yellow-200`).
- [ ] Verse text PRESERVED in `font-serif italic` (Decision 7 — scripture exception).
- [ ] Reference (e.g., "Romans 8:28") rendered as `text-white/50` (citation, muted).
- [ ] Share button rendered as `<Button variant="ghost" size="sm">`.
- [ ] SharePanel modal NOT modified by this spec (deferred to 4D).
- [ ] "Meditate on this verse →" link verified `text-white/80` (post-4A intact).

### ReadingPlanWidget

- [ ] Header BookOpen migrated to muted blue (matches Devotional family).
- [ ] Active plan progress bar: `bg-white/10` track + `bg-primary` violet fill preserved.
- [ ] Active plan / all-completed / recently-completed / discovery states all render correctly with the new chrome.
- [ ] Discovery mini-cards (3 mood-matched plan cards): user-facing colored category icons (cyan, yellow, mint, lavender) preserved and verified to read correctly against the upgraded FrostedCard surface. Any pre-existing colors that read wrong are migrated to the closest tonal family in the table; otherwise preserved as-is.
- [ ] "Continue reading" / "Browse all plans" links verified `text-white/80` (post-4A intact).

### PrayerListWidget

- [ ] Header Heart migrated to pink-violet (cooler than GratitudeWidget rose; default `text-pink-300`).
- [ ] Empty-state icon (if any in body) receives same pink-violet tonal color.
- [ ] Add Prayer button verified `<Button variant="subtle">` (post-4A intact).
- [ ] Filled-state typography: active count prominent, supporting text muted (`text-white/80`).
- [ ] "View all →" link verified `text-white/80` (post-4A intact).

### RecentHighlightsWidget

- [ ] Header icon (existing glyph) migrated to warm yellow (`text-yellow-300` or `text-amber-300`).
- [ ] Empty state body icon receives same warm-yellow tonal color.
- [ ] User-selected highlight color dots (in filled state) PRESERVED — no migration.
- [ ] StickyNote icon (notes in filled state) migrated to mint or warm yellow (decision documented inline).
- [ ] "See all →" link verified `text-white/80` (post-4A intact).

### GratitudeWidget

- [ ] Header Heart migrated to or verified as soft rose/pink (`text-pink-300` or `text-rose-300`).
- [ ] 3 NumberedHeart prefix hearts in input rows aligned with header Heart tonal color.
- [ ] Each `<input>` migrated from `border-white/10 bg-white/5` to the violet-glow textarea pattern from DailyHub Pray/Journal: `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30` (or whatever exact class string DailyHub Pray/Journal uses live — match what's in production).
- [ ] Save button verified `<Button variant="subtle">` (post-4A intact).
- [ ] Saved-state Check icons migrated to mint (`text-emerald-300`).
- [ ] Edit button rendered as `<Button variant="ghost" size="sm">` if not already.
- [ ] CrisisBanner NOT modified (visual treatment + crisis keyword logic preserved verbatim).

### ChallengeWidget

- [ ] Header Flame migrated to amber (`text-amber-300` or `text-amber-400`, slightly distinct from StreakCard's amber).
- [ ] All 3 conditional states + FeatureEmptyState fallback render correctly with new chrome.
- [ ] Active-state themeColor accent preserved (data-driven brand color).
- [ ] Active-state mini-flame streak indicator receives same amber tonal color.
- [ ] Day count typography aligned with overall card typography hierarchy.
- [ ] No-active-no-season reminder toggle rendered as appropriate Button variant (subtle or ghost — judgment call documented).
- [ ] "Continue →" link verified `text-white/80` (post-4A intact).

### BadgeGrid overlay

- [ ] BadgeGrid coupling decision verified during recon (inline within StreakCard vs. standalone overlay) and documented inline.
- [ ] Section heading typography aligned with FrostedCard heading patterns.
- [ ] Earned badges render with colored icon + label + soft glow or violet-tinted background indicating earned state.
- [ ] Unearned badges render with `<Lock>` silhouette + greyed label, contrast muted to NOT compete with earned (e.g., `text-white/30` for label, `text-white/20` for lock).
- [ ] Overlay backdrop aligned with system overlay pattern (semi-transparent dark + blur, matching existing modals).
- [ ] Close button rendered as `<Button variant="ghost">` with appropriate size.
- [ ] BadgeGrid renders cleanly at mobile (375px), tablet (768px), and desktop (1280px) viewports — no horizontal overflow, no broken section grids.
- [ ] Focus trap works on overlay open; focus returns to trigger on close.

### Quality gates

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes — every test that asserted behavior continues to pass; tests that asserted on specific old class names changed by this spec are updated to new tokens. Net regression count is 0.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] Test baseline preserved: 9437 pass / 2 fail (the 2 documented flakes carried from 4A). Any new failure documented with rationale.

### Visual eyeball checks on `/`

- [ ] Each widget shows its tonal icon (rose Heart on Gratitude, blue BookOpen on Devotional, mint CheckCircle on Activity, lavender Activity-icon on Mood, etc.).
- [ ] Cards still feel like family — the violet-system FrostedCard chrome is consistent across all 11 widgets; only icons carry tonal color.
- [ ] The page reads more scannable than pre-4B (color signals category; user can locate widgets at a glance).
- [ ] No widget looks visually "off" or competes for other widgets for attention.
- [ ] Hover states on FrostedCards still work (`-translate-y-0.5`, surface brightens, shadow upgrades — inherited from 4A, verified intact post-4B).
- [ ] GratitudeWidget input rows render with the soft violet glow visible on DailyHub Pray and Journal — sanctuary continuity verified by hover-toggling between `/` and `/daily?tab=pray`.
- [ ] StreakCard recent badge pills render with `bg-violet-500/20` (verified via DOM inspection that no inline `style.backgroundColor` remains).
- [ ] BadgeGrid opens, displays badges by section, scrolls cleanly, closes — focus management correct.

### Regression checks (cross-surface)

- [ ] DailyHub tabs (`/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`) render unchanged.
- [ ] BibleLanding (`/bible`) renders unchanged.
- [ ] `/bible/plans` renders unchanged — verify the discovery mini-cards in ReadingPlanWidget on Dashboard align visually with `/bible/plans` mini-cards (both use a flavor of the Tonal Icon Pattern; no drift introduced).
- [ ] PrayerWall (`/prayer-wall`) renders unchanged.
- [ ] FriendsPreview, WeeklyRecap, WeeklyGodMoments, QuickActions, AnniversaryCard, EveningReflectionBanner, InstallCard, EchoCard widgets on `/` render UNCHANGED (4C scope; no drift introduced by 4B).
- [ ] All modal/overlay components (WelcomeWizard, WelcomeBack, GettingStartedCelebration, EveningReflection, ChallengeCompletionOverlay, CelebrationQueue, SharePanel, CrisisBanner) render UNCHANGED (4D scope or out-of-scope; no drift introduced by 4B).

### Lighthouse + accessibility

- [ ] Lighthouse Performance ≥ 90 on `/`.
- [ ] Lighthouse Accessibility ≥ 95 on `/`.
- [ ] No new axe-core violations introduced by the migration.
- [ ] All migrated icons receive `aria-hidden="true"` if purely decorative; interactive elements preserve accessible name and keyboard activation.
- [ ] BadgeGrid overlay focus trap works on open; focus returns to trigger on close.
- [ ] Keyboard navigation through all 11 widgets and the BadgeGrid overlay works as before.

### Definition of done

- [ ] All 11 changes implemented per the brief.
- [ ] All acceptance criteria checked.
- [ ] Test baseline preserved or net-positive.
- [ ] No new localStorage keys (verified against `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md`).
- [ ] No new animation tokens hardcoded (verified against `frontend/src/constants/animation.ts`).
- [ ] Implementation plan documents the per-widget tonal token selection (final shade chosen during execution), the ActivityChecklist progress ring stroke decision (Tailwind token vs. hardcoded), the MoodChart axis tick text decision (kept vs. migrated), the BadgeGrid coupling decision (inline vs. standalone), and the RecentHighlightsWidget StickyNote icon color decision (mint vs. warm yellow).
- [ ] Master plan acceptance criteria (direction-doc Decision 11 system-wide debut, Decision 7 scripture italic preserved, Decision 10 MoodChart empty state preserved) are checked off.
- [ ] No commits, no branch creation, no push — user manages all git operations manually.
