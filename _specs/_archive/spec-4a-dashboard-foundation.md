# Spec 4A: Dashboard Foundation

**Master Plan Reference:** Direction document at `_plans/direction/dashboard-2026-05-04.md` is the locked decision set for the three Dashboard sub-specs (4A foundation, 4B data widgets, 4C social/recap/tiles). Recon at `_plans/recon/dashboard-2026-05-04.md` (879 lines) is the verified pre-state. This spec implements direction-doc Decisions 1, 5, 6, 14, 15 plus the structural prerequisites (BackgroundCanvas wrap, DashboardCard chrome migration, CustomizePanel chrome alignment) that 4B and 4C depend on. Per-widget content polish (Decisions 4, 7, 8, 11) lives in 4B and 4C.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. If the working tree is on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard, logged-in users) — every change in this spec lands here
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surfaces (DailyHub uses Button subtle/ghost variants and FrostedCard primitives that this spec touches indirectly via the global `bg-primary`/`text-primary` migration)
- `/bible` (BibleLanding) — regression surface (consumes BackgroundCanvas, FrostedCard already; verify nothing changes)
- `/bible/plans` — regression surface (consumes FrostedCard accent already; verify nothing changes)
- `/prayer-wall` — regression surface (Button ghost variant consumers)

---

## Overview

Dashboard is the largest single surface in the visual rollout — recon catalogued ~6,000 LOC of source plus ~11,000 LOC of tests across 56 test files, 16 widgets, 41 localStorage keys, and 25+ hooks. It currently has zero FrostedCard usage; every card rolls its own `bg-white/5 border-white/10 rounded-2xl backdrop-blur-sm` chrome. Spec 4A lands the visual foundation that 4B and 4C will build on.

The load-bearing change is the DashboardCard primitive migration to `<FrostedCard variant="default">`. Roughly 12 widgets consume DashboardCard, so migrating the primitive ripples to all of them automatically — every consumer picks up the new frosted-glass surface, the rounded-3xl radius, and the lift-on-hover affordance without per-widget edits. This is why 4A ships first: per-widget content treatment (4B/4C) becomes a content concern only, not a chrome concern.

Alongside the primitive migration, 4A adds the multi-bloom BackgroundCanvas atmospheric layer to the page wrapper (matching DailyHub, BibleLanding, and `/bible/plans`), migrates the DashboardHero greeting and status strip, fixes the GrowthGarden double-mount ref-staleness bug, fixes the liturgical greeting recency bug ("Happy Easter" still showing 30 days post-Easter), aligns the CustomizePanel chrome, and migrates every `bg-primary` solid button + every `text-primary` ghost link across the page surfaces in 4A's scope. Per-widget content polish (tonal icons, anti-pressure copy review, scripture italic preservation) is deferred to 4B and 4C. Modal/overlay sweep is deferred to 4D.

This is the largest single spec since DailyHub 1B. Behavioral preservation is non-negotiable — every existing test must continue to pass, every collapse/aria/storage behavior on DashboardCard must be preserved verbatim, and the GrowthGarden palette is a locked exception (illustration, not iconography — the earth-tone metaphor stays).

## User Story

As a **logged-in user landing on the Dashboard**, I want the page to read as part of the same atmospheric family as the DailyHub and Bible reader — multi-bloom violet backdrop behind the content, frosted-glass cards that lift on hover, system-consistent buttons and links, an accurate liturgical greeting that doesn't fire "Happy Easter" a month after Easter, and a Growth Garden that produces correct share images regardless of viewport — so that Dashboard locks into the visual system without disturbing any of its underlying behavior, completion tracking, or data persistence.

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. Verify the working branch contains the four DailyHub specs + the iteration spec. Specifically: FrostedCard `default` and `accent` variants exist at `frontend/src/components/ui/FrostedCard.tsx`, Button `subtle` variant + the iteration's gradient `text-black` / ghost `text-white/80` text-color decisions are landed in `frontend/src/components/ui/Button.tsx`, and the multi-bloom BackgroundCanvas exists at `frontend/src/components/ui/BackgroundCanvas.tsx`.
2. Verify the direction doc at `_plans/direction/dashboard-2026-05-04.md` is present and matches the locked decisions referenced throughout this spec.
3. Verify the recon at `_plans/recon/dashboard-2026-05-04.md` is present.
4. Capture a test baseline before any change: `cd frontend && pnpm test -- --run --reporter=verbose 2>&1 | tail -50` and `pnpm typecheck`. Record total pass/fail counts. Any new failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. Run the two grep audits referenced in Changes 6 and 7 to enumerate exact consumers:
   - `grep -rn 'bg-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx frontend/src/components/ui/InstallCard.tsx`
   - `grep -rn 'text-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx`
6. Read the FrostedCard source to confirm whether it forwards `aria-labelledby` (Change 2 — small prop-API enhancement may be required).

#### Change 1 — Add multi-bloom BackgroundCanvas to Dashboard

Modify `frontend/src/pages/Dashboard.tsx`. Wrap the existing `<main id="main-content">` in `<BackgroundCanvas>`. Navbar (transparent), SiteFooter, and overlays (CustomizePanel, ChallengeCompletionOverlay, CelebrationQueue, GettingStartedCelebration, EveningReflection, DevAuthToggle, TooltipCallout) stay OUTSIDE the canvas. The existing `bg-dashboard-dark` on the outer wrapper div stays — BackgroundCanvas layers atmospheric blooms on top of that base.

Add `import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'`.

DashboardHero's existing `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark pt-24` interacts with BackgroundCanvas. Read the file during execution and choose:

- Option A: keep DashboardHero's gradient as-is — likely correct because the hero anchors visual weight at the top of the page and the gradient overlays cleanly on top of the canvas.
- Option B: remove DashboardHero's gradient if BackgroundCanvas provides equivalent atmospheric effect and the gradient becomes redundant.

Test both visually during execution and pick what reads best. Document the decision inline in the implementation plan.

#### Change 2 — Migrate DashboardCard to FrostedCard default

Modify `frontend/src/components/dashboard/DashboardCard.tsx`. Replace the rolls-own `<section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 backdrop-blur-sm">` chrome with `<FrostedCard as="section" variant="default" className="p-4 md:p-6">`.

**Mandatory preservation** (any drift here is a bug):

- All collapse logic — `useState`, the `dashboard-collapse-storage` localStorage integration, chevron rotation, `aria-expanded`, `aria-controls`.
- All semantic structure — the rendered element must remain a `<section>` with `aria-labelledby={titleId}` so the existing accessibility contract holds.
- All header layout — icon + title `<h2 id={titleId}>` + chevron button + `headerAction` slot.
- All padding overrides — `p-4 md:p-6` continues to apply.
- The `motion-safe:animate-widget-enter` class on the outer wrapper from `DashboardWidgetGrid` — that class lives on the wrapping div around DashboardCard, NOT on the card itself, so it stays in place.

**aria-labelledby forwarding decision.** Read FrostedCard during execution. If FrostedCard does not currently forward `aria-labelledby` as an arbitrary prop, choose between:

- Option A (preferred when FrostedCard's prop API permits): add `aria-labelledby` to FrostedCard's prop API. This is a small, additive change that benefits future consumers.
- Option B (fallback): keep FrostedCard as visual chrome only and wrap inner content in a `<section aria-labelledby={titleId}>`. Slightly more layered DOM, but zero risk to FrostedCard's existing API.

Pick A when feasible.

**Documented chrome upgrade side effect.** This migration intentionally upgrades the surface from `bg-white/5` to `bg-white/[0.07]`, the border from `border-white/10` to `border-white/[0.12]`, the radius from `rounded-2xl` to `rounded-3xl`, and adds `shadow-frosted-base` plus the FrostedCard hover treatment (`hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5`). Every widget that consumes DashboardCard inherits this upgrade automatically. This is the load-bearing visual change of the spec — every downstream widget reads as part of the system after this single migration.

#### Change 3 — Migrate DashboardHero greeting + status strip

Modify `frontend/src/components/dashboard/DashboardHero.tsx`.

**3a — Greeting.** Currently the greeting is `<h1 font-serif text-2xl text-white/90 md:text-3xl>` with the seasonal greeting span using inline `style={{ color: themeColor }}`. Preserve heading structure and the seasonal color binding. If the typography drifts from the rest of the system (font-serif vs system font for the heading line), align with page conventions. Read the file and judge.

**3b — Status strip (streak, min, level, FP).** The inline status strip ("Start your streak today | 0 min this week | Seedling | 0 Faith Points + progress bar") stays mostly as-is — the inline-strip visual treatment is correct for this content density. Specific tweaks:

- Progress bar `bg-primary` fill stays violet — it's a progress affordance and violet is the system's active color.
- Direction-aware glow on the progress bar (violet on increase, amber on decrease, via inline `boxShadow`) is preserved verbatim. This is a deliberate UX touch documented in the recon.
- Tier label ("Seedling," "Sprout," etc.) typography aligns with the rest of the strip (`text-xs text-white/60` or matched tone).
- "Start your streak today" / "X day streak" text aligns with strip typography.
- Any segment using `text-primary` migrates to `text-white/80` per direction doc Decision 6.

#### Change 4 — Liturgical greeting recency window

Modify `frontend/src/hooks/useLiturgicalSeason.ts`. Read the existing source to determine current structure (the hook today returns `{ greeting, themeColor, isNamedSeason, seasonName }` based on date — confirm the exact shape and the per-holiday greeting logic).

Add recency-window logic so holiday-specific greetings ("Happy Easter," "Merry Christmas," "Happy Holy Week," "Happy Pentecost," "Happy Advent"/"Advent blessings") only fire within ~14 days of the actual day. After 14 days, fall back to the season name without the "Happy" prefix, OR no liturgical greeting at all (whichever reads more natural per holiday).

Apply the same 14-day pattern consistently to:

- **Easter:** "Happy Easter" fires Easter Sunday through Easter + 14 days. Easter season runs liturgically to Pentecost (~50 days), but the greeting cuts at 14.
- **Christmas:** "Merry Christmas" fires Dec 25 through ~Jan 8.
- **Holy Week:** "Happy Holy Week" (or equivalent) within the Holy Week range only.
- **Pentecost:** "Happy Pentecost" fires Pentecost Sunday through Pentecost + 14 days.
- **Advent:** "Happy Advent" / "Advent blessings" within the first 14 days of Advent; after that, season name only or no liturgical greeting.

Holidays without a "Happy [holiday]" greeting today (e.g., Ordinary Time) need no change.

Tests for this hook may currently assert specific greetings. Update them to validate the new recency window: greeting fires on Easter Sunday, fires on Easter + 14, does NOT fire on Easter + 30. Add fixtures for each holiday's window.

#### Change 5 — GrowthGarden double-mount fix

Modify `frontend/src/components/dashboard/GrowthGarden.tsx` and the mount site in `frontend/src/pages/Dashboard.tsx`.

Currently two GrowthGarden instances mount, gated by `lg:hidden` (mobile, `size="md"`) and `hidden lg:block` (desktop, `size="lg"`), both sharing the same `gardenRef`. Only the visible one's ref is current; the offscreen instance writes to the same ref. This is a ref-staleness bug for `GardenShareButton` — when the user generates a share image, the ref may point to the desktop SVG even on a mobile viewport, producing a broken-aspect-ratio share image.

Consolidate to a single GrowthGarden instance with responsive `size` selection. Choose between:

- **Option A — useEffect-based size detection.** A `useState<'md' | 'lg'>` initialized via `window.matchMedia('(min-width: 1024px)')`, kept in sync via `mq.addEventListener('change', update)`. Single `<GrowthGarden ref={gardenRef} size={size} ... />`. Safer if GrowthGarden has hard-coded SVG dimensions per size value.
- **Option B — CSS-driven responsive sizing inside GrowthGarden itself.** Single SVG, single instance, scaling via responsive Tailwind classes. Cleaner if GrowthGarden's internal absolute-positioned plant stages can scale via CSS without breaking layout.

Read GrowthGarden source during execution to determine which is viable. Fix the bug regardless of which option is chosen.

After the fix, manually verify `GardenShareButton` continues to generate share images correctly across viewport sizes, including resize during the share-image generation flow (tracked as direction-doc follow-up #3).

#### Change 6 — Migrate `bg-primary` solid buttons to `<Button variant="subtle">`

For each consumer in 4A's scope, replace the rolls-own `bg-primary` solid pill with `<Button variant="subtle" size="md">`. Preserve every click handler, disabled state, aria attribute, and conditional rendering branch.

**Migrate in 4A:**

- `frontend/src/components/dashboard/EveningReflectionBanner.tsx` — "Reflect Now" button
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — "Save" button (Save action only — the widget's content treatment is 4B; the button migration belongs here as part of the global pattern cleanup)
- `frontend/src/components/dashboard/PrayerListWidget.tsx` — "Add Prayer" button
- `frontend/src/components/ui/InstallCard.tsx` — "Install" button (the widget's promotion to first-class belongs to 4C; the button migration belongs here)
- `frontend/src/components/dashboard/CustomizePanel.tsx` — "Reset to default," "Done," and any other internal buttons
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — submit button only. MoodCheckIn IS technically a modal, but the `bg-primary` migration is a global pattern cleanup, not a per-component visual treatment. The full MoodCheckIn redesign is deferred to 4D; this spec migrates only the submit button's solid pill.

**Defer to 4D (do NOT migrate in 4A):**

- WelcomeWizard buttons (full modal redesign)
- WelcomeBack buttons (full modal redesign)
- EveningReflection 4-step modal buttons
- GettingStartedCelebration buttons

Read each file during execution to confirm classification. If any consumer is ambiguous (e.g., a Dashboard widget that was missed in the recon), flag and ask before migrating.

#### Change 7 — Migrate `text-primary` ghost links to `text-white/80`

For each `text-primary` consumer in 4A's scope, apply judgment:

- **If used as a ghost-style link** (text-primary, no background, inline anchor or button): replace with `text-white/80 hover:text-white`, OR migrate to `<Button variant="ghost" size="sm">` if the context calls for a button affordance (e.g., wrapped in a click target with padding/hit area).
- **If used as a status indicator color** (e.g., `text-primary` on an icon to indicate active/selected state): preserve. That's semantic active-state color, not a ghost link.

Per the recon, most instances are ghost-style links. Expected consumers (verify exhaustively via the grep audit in Pre-execution recon, this list is illustrative):

- `DashboardCard.tsx` action link rendered via the `headerAction` slot pattern
- `MoodChart.tsx` "Check in now"
- `ReadingPlanWidget.tsx` links
- `RecentHighlightsWidget.tsx` links
- `PrayerListWidget.tsx` link
- `TodaysDevotionalCard.tsx` links
- `VerseOfTheDayCard.tsx` link
- `FriendsPreview.tsx` links (Change 7 only — the widget's content treatment is 4C)
- `WeeklyRecap.tsx` links (Change 7 only — content treatment is 4C)
- `StreakCard.tsx` "View all badges"
- `GettingStartedCard.tsx` Go buttons (verify whether ghost links or subtle Buttons by source — different decision per case)

This change touches 4B-and-4C-scoped widget files for the link migration ONLY. Per-widget content treatment (Tonal Icon Pattern, scripture italic preservation, anti-pressure copy review) stays in 4B and 4C — 4A's edits to those files are surgical text-color migrations only.

#### Change 8 — CustomizePanel chrome alignment

Modify `frontend/src/components/dashboard/CustomizePanel.tsx`. Currently uses rolls-own chrome `bg-hero-mid/95 backdrop-blur-xl`. The panel functions as a side flyout (desktop) / bottom sheet (mobile).

For 4A:

- Migrate the panel wrapper to use `<FrostedCard variant="subdued">` OR a styled wrapper that uses the same surface tokens as the rest of the system. Pick whichever produces the closer visual fit.
- Each card row inside the panel (drag-reorder controls, toggle visibility) inherits the new chrome automatically because they use the DashboardCard primitive (Change 2 already covers them).
- Internal buttons (Reset to default, Done) migrate to `<Button variant="subtle">` per Change 6.

If the panel's structure makes the chrome migration risky (e.g., the panel relies on specific positioning behavior that FrostedCard would disturb), propose a smaller-scope change at the plan stage: button migration only, defer panel chrome to 4D. Read the file during execution and judge.

### Non-Functional Requirements

- **TypeScript strict** — `pnpm typecheck` must pass post-migration.
- **Test baseline preservation** — every existing test must continue to pass. Tests that assert on specific class names (`bg-white/5`, `border-white/10`, `rounded-2xl`, `bg-primary`) are expected to need updates because the chrome literally changed; update them to assert the new tokens. Tests that assert on behavior (collapse open/close, aria-expanded toggling, click handlers firing, localStorage writes) MUST continue to pass without modification.
- **Accessibility (WCAG 2.2 AA)** — `aria-labelledby`, `aria-expanded`, `aria-controls` contracts on DashboardCard preserved verbatim. Skip-to-main-content link unaffected. No new modals introduced (focus trap not in scope).
- **Performance** — no regression in TTI/LCP. BackgroundCanvas adds DOM weight on Dashboard for the first time; verify Lighthouse Performance stays at 90+ on `/`.
- **Reduced motion** — FrostedCard's hover translate (`hover:-translate-y-0.5`) must be gated by `motion-safe:`. The animation token discipline at `frontend/src/constants/animation.ts` continues to govern any new motion.
- **Animation token discipline** — any new transition durations or easings come from `frontend/src/constants/animation.ts`. No hardcoded `200ms` or `cubic-bezier(...)` strings.

## Auth Gating

This spec is a visual migration on existing Dashboard surfaces. It does NOT introduce new interactive elements, new gated actions, or new auth-modal triggers. Auth behavior is inherited from the existing widgets and remains unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|--------------------|
| Visit `/` | Renders `Home` (landing page), NOT Dashboard. Dashboard is auth-gated by `AuthProvider` — see `02-security.md` § "Auth Gating — Dashboard & Growth Features". | Renders Dashboard with all widgets. | N/A — handled at route level by `AuthProvider`. |
| Click "Reflect Now" on EveningReflectionBanner | N/A — banner only renders for logged-in users. | Opens EveningReflection modal (4-step). Behavior unchanged by this spec. | N/A |
| Click "Save" on GratitudeWidget | N/A — widget only renders for logged-in users. | Saves gratitude entry to `wr_gratitude_entries`. Behavior unchanged. | N/A |
| Click "Add Prayer" on PrayerListWidget | N/A — widget auth-gated. | Opens prayer-add inline form. Behavior unchanged. | N/A |
| Click "Install" on InstallCard | Logged-out users CAN see InstallCard on certain surfaces (PWA install is a browser-level action separate from app login per BB-41 posture). On Dashboard specifically the card only renders for logged-in users. | Triggers PWA install prompt via `beforeinstallprompt` event. Behavior unchanged. | N/A |
| Click "Done" / "Reset to default" in CustomizePanel | N/A — panel only opens for logged-in users (Customize entry point is auth-gated at the trigger). | Saves panel state to `wr_dashboard_layout` / `wr_dashboard_collapsed`. Behavior unchanged. | N/A |
| MoodCheckIn submit | N/A — modal only opens for logged-in users (mood check-in is auth-gated per `02-security.md`). | Persists mood entry to `wr_mood_entries`. Behavior unchanged. | N/A |
| Hover on any DashboardCard | Cards lift +1px and surface tone brightens (new affordance from FrostedCard hover treatment). | Same as logged-out — hover is purely visual, not gated. | N/A |
| Liturgical greeting display | Hero only renders for logged-in users. Greeting now respects 14-day recency window for holiday-specific phrases. | Same. | N/A |

**Auth-related regression watchout:** the `useFaithPoints.recordActivity` no-op for logged-out users (per `02-security.md`) and the `wr_auth_simulated` legacy fallback path are upstream of any change in this spec — verify they're unaffected by reading test output for the AuthContext / activity-engine tests.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | BackgroundCanvas blooms scale down per existing canvas behavior. DashboardHero status strip wraps to multiple lines if needed. DashboardCard chrome (rounded-3xl, frosted) renders identically — surface tokens are viewport-independent. GrowthGarden renders at `size="md"` via the consolidated single-instance approach (no longer two SVGs). CustomizePanel renders as a bottom sheet (existing behavior). MoodCheckIn submit button renders as full-width subtle Button. |
| Tablet (640–1024px) | DashboardHero remains single-line where space permits; status strip pills lay out inline. DashboardCard chrome unchanged. GrowthGarden still at `size="md"` (the breakpoint switch is at 1024px). CustomizePanel still bottom sheet. |
| Desktop (≥ 1024px) | Full multi-bloom canvas visible. DashboardHero renders at `md:text-3xl`. DashboardCard hover treatment (`hover:-translate-y-0.5`, shadow upgrade) becomes meaningful with cursor input. GrowthGarden switches to `size="lg"` via the consolidated responsive logic — single SVG instance, ref always current. CustomizePanel renders as a right-side flyout (existing behavior). |

**Responsive notes specific to Change 5 (GrowthGarden consolidation):**

- Previously `lg:hidden` / `hidden lg:block` rendered two SVGs gated by Tailwind class. Post-fix: a single SVG instance whose `size` prop is driven either by `useState` + `matchMedia` (Option A) or by CSS-driven responsive sizing internal to GrowthGarden (Option B).
- During viewport resize, the consolidated implementation must update `size` smoothly without unmounting/remounting the SVG (which would interrupt any in-progress share-image generation or share button interaction).
- GardenShareButton must produce correct share images at every viewport: read the ref AT click time, not at mount time, so the ref is always pointing to the live SVG.

**Responsive notes for Change 6 (Button migration):**

- The `<Button variant="subtle">` component already handles responsive sizing via its `size` prop. No per-consumer responsive logic is needed; the migration inherits whatever responsive behavior Button provides.

## AI Safety Considerations

N/A — This spec is a visual migration. It does NOT introduce new AI-generated content, new free-text input surfaces, or new crisis-detection touchpoints. Existing surfaces (MoodCheckIn 280-char text, GratitudeWidget entries, PrayerListWidget items) retain their existing AI safety behavior — no changes to crisis detection, no changes to content boundaries, no changes to keyword detection. Crisis resource banner integration and `01-ai-safety.md` policies remain authoritative for the underlying widgets.

## Auth & Persistence

- **Logged-out users:** Visiting `/` renders the landing page (`Home`), not Dashboard. Logged-out users never see any of the surfaces this spec migrates. No persistence changes.
- **Logged-in users:** All persistence behavior is preserved verbatim. Specifically:
  - DashboardCard collapse state persists to `wr_dashboard_collapsed` via the existing `dashboard-collapse-storage` integration (Change 2 preserves this exactly).
  - GratitudeWidget Save persists to `wr_gratitude_entries` (Change 6 migrates the button visual only — handler unchanged).
  - PrayerListWidget Add Prayer persists to `wr_prayer_list` (handler unchanged).
  - CustomizePanel persists to `wr_dashboard_layout` and `wr_dashboard_collapsed` (handlers unchanged).
  - MoodCheckIn submit persists to `wr_mood_entries` (handler unchanged).
  - GrowthGarden share-image generation reads the live SVG via `gardenRef` (Change 5 fixes the ref-staleness bug; data path unchanged).
  - Liturgical greeting `useLiturgicalSeason` is computed-from-date and stateless — no localStorage read/write change.
- **localStorage usage:** No new keys. No key shape changes. No key migrations. Reference `11-local-storage-keys.md` for the canonical inventory; this spec touches none of them at the storage layer.

## Completion & Navigation

N/A — Dashboard is not part of the Daily Hub completion flow. No completion signals are emitted by this spec's changes. The existing per-widget completion flows (mood check-in completion firing into the activity engine, gratitude save firing into faith points, etc.) are preserved verbatim; this spec only migrates their visual chrome.

## Design Notes

- **Locked decisions reference.** All structural choices in this spec follow the locked decisions in `_plans/direction/dashboard-2026-05-04.md`. Specifically: Decision 1 (atmospheric layer), Decision 2 (GrowthGarden palette exception), Decision 3 (no gradient showstopper on Dashboard), Decision 5 (`bg-primary` → subtle), Decision 6 (`text-primary` → `text-white/80`), Decision 14 (GrowthGarden double-mount fix), Decision 15 (liturgical recency window). Decisions 4, 7, 8, 11 (per-widget content treatment, Lora italic preservation, anti-pressure copy review, Tonal Icon Pattern application) are explicitly DEFERRED to 4B and 4C.
- **Recon reference.** Pre-state details (current chrome tokens, current rolls-own patterns, current button consumers, current ref structure on GrowthGarden, line numbers on DashboardCard collapse logic) live in `_plans/recon/dashboard-2026-05-04.md`. Read it during planning to enumerate exact files and lines.
- **System patterns this spec USES (already shipped, do not modify):** FrostedCard `default` variant chrome and hover treatment. Multi-bloom BackgroundCanvas. `<Button variant="subtle">` and `<Button variant="ghost">` (with iteration's gradient `text-black` and ghost `text-white/80` decisions baked in). The `09-design-system.md` § "Round 3 Visual Patterns" frosted glass conventions.
- **System patterns this spec MODIFIES:** None. This spec consumes existing patterns and migrates Dashboard to use them. No primitive component changes beyond the optional `aria-labelledby` prop forwarding on FrostedCard (Change 2 Option A).
- **System patterns this spec INTRODUCES:** None. The Tonal Icon Pattern is locked in the direction doc but applied per-widget in 4B/4C, not 4A. After 4C ships, the pattern gets documented in `09-design-system.md` for system-wide adoption.
- **Visual reference for matching.** When migrating DashboardCard, the visual target is the FrostedCard `default` rendering already shipped on DailyHub (`/daily?tab=*`) and BibleLanding (`/bible`). Same surface token (`bg-white/[0.07]`), same border (`border-white/[0.12]`), same radius (`rounded-3xl`), same hover (`hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5`). After migration, hover-toggling between Dashboard and DailyHub should show identical card chrome and identical hover affordance.
- **Anti-pressure voice continuity.** The liturgical greeting recency fix (Change 4) is itself an anti-pressure-voice alignment — "Happy Easter" 30 days post-Easter feels like a system error or a passive-aggressive nudge to remember the holiday. The 14-day window restores warmth-at-the-right-moment, then quietly fades to season name or no greeting. Documented as Decision 15 in the direction doc.

## Out of Scope

**Deferred to Spec 4B (data widgets):**

- Per-widget content treatment for: StreakCard, MoodChart, ActivityChecklist, GettingStartedCard, TodaysDevotionalCard, VerseOfTheDayCard, ReadingPlanWidget, RecentHighlightsWidget, GratitudeWidget (form 3-input layout, save flow polish), ChallengeWidget, BadgeGrid.
- Tonal Icon Pattern application per the table in direction-doc Decision 11.
- 4A modifies these files only for `text-primary` → `text-white/80` link migration (Change 7); content/icon treatment stays for 4B.

**Deferred to Spec 4C (social/recap/tiles):**

- FriendsPreview (leaderboard, MilestoneFeed, empty CircleNetwork).
- WeeklyRecap (with copy rewrite per direction-doc Decision 8).
- WeeklyGodMoments banner alignment.
- QuickActions 4-tile grid with tonal colors per tile.
- AnniversaryCard.
- EveningReflectionBanner content treatment (Reflect Now button migration belongs to 4A, banner content stays for 4C).
- InstallCard first-class widget promotion per Decision 12 (Install button migration belongs to 4A, widget promotion stays for 4C).
- EchoCard regression check (already shipped in Spec 3).
- Caveat-to-gradient-text migration in GettingStartedCelebration / WelcomeWizard / WelcomeBack ceremony headings.

**Deferred to Spec 4D (modal/overlay sweep — not yet scheduled):**

- WelcomeWizard full visual treatment.
- WelcomeBack full visual treatment.
- MoodCheckIn full visual treatment (this spec migrates submit button only).
- MoodRecommendations.
- EveningReflection 4-step modal full treatment.
- ChallengeCompletionOverlay.
- CelebrationQueue + per-celebration overlays.

**Locked exceptions (NEVER changed):**

- GrowthGarden palette stays earth-tone (browns, leaves, sky). The garden is illustration, not iconography. Tonal Icon Pattern does NOT apply.
- BackgroundCanvas, FrostedCard, Button primitive components — already shipped, this spec consumes them, does not modify them.

**Out of rollout entirely (not Spec 4 anything):**

- StreakCard FP progress glow visual review (preserved as-is for now; visual review possible in 4B if needed).
- Performance optimization on Dashboard (separate post-migration spec — recon flagged re-render cascades from non-memoized prop objects).
- API/backend changes (none required).
- Anti-pressure copy review on filled WeeklyRecap state (4C scope).
- PrayerWall migration (Forums project Phase 5).
- Bible reader chrome (Spec 8).
- AskPage (Spec 9).
- Settings/Insights cluster (Spec 10).
- Music feature (Spec 11).
- Site chrome — Navbar, SiteFooter, SongPickSection (Spec 12).
- Homepage (Spec 13).

## Acceptance Criteria

### Structural

- [ ] Dashboard wraps `<main>` content in `<BackgroundCanvas>`. Multi-bloom violet atmospheric layer is visible behind all widgets on `/`. Navbar (transparent), SiteFooter, and overlays remain OUTSIDE the canvas.
- [ ] DashboardCard primitive renders as `<FrostedCard variant="default">` (or wraps a section inside FrostedCard if Option B was chosen for `aria-labelledby` forwarding).
- [ ] Every widget that consumes DashboardCard (~12 widgets) automatically renders with the new FrostedCard chrome — `bg-white/[0.07]` surface, `border-white/[0.12]`, `rounded-3xl`, `shadow-frosted-base`, hover treatment (`hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5`).
- [ ] DashboardCard preserves all existing functionality: collapse via `dashboard-collapse-storage`, chevron rotation on toggle, `aria-expanded` and `aria-controls` semantics, `<section>` element with `aria-labelledby={titleId}`, header layout (icon + title `<h2>` + chevron + headerAction slot), `p-4 md:p-6` padding override.

### Hero

- [ ] DashboardHero greeting renders with preserved seasonal color (inline `style={{ color: themeColor }}` on the seasonal span).
- [ ] DashboardHero status strip preserves: streak segment with Flame icon (amber when active, white/30 inactive), "X min this week" with Wind icon, level tier label ("Seedling" / "Sprout" / etc.), Faith Points segment with AnimatedCounter, progress bar (`h-1.5 w-32 rounded-full bg-white/10` track, `bg-primary` violet fill, direction-aware `boxShadow` glow — violet on increase, amber on decrease).
- [ ] Any `text-primary` segment in the status strip is migrated to `text-white/80`.

### Liturgical recency

- [ ] On May 4, 2026 (today, ~30 days post-Easter Sunday 2026-04-04 — Easter 2026 is April 5), "Happy Easter" does NOT show in the DashboardHero greeting.
- [ ] On Easter Sunday + 0 to + 14 days (inclusive), "Happy Easter" DOES show.
- [ ] On Easter Sunday + 15 days and beyond, the greeting falls back to season name (e.g., "Eastertide") OR no liturgical greeting at all per the implementation choice — but specifically NOT "Happy Easter".
- [ ] Same 14-day pattern applied to Christmas, Holy Week, Pentecost, Advent — verified by unit tests for each holiday.
- [ ] Existing tests for `useLiturgicalSeason` are updated to match the new recency window. No tests fail.

### GrowthGarden

- [ ] GrowthGarden renders as a SINGLE responsive SVG (not two SVGs gated by `lg:hidden` / `hidden lg:block`).
- [ ] `gardenRef` points to a single live element regardless of viewport size.
- [ ] GardenShareButton continues to generate share images correctly at mobile (375px), tablet (768px), and desktop (1280px) viewports.
- [ ] Resizing the window does not cause SVG unmount/remount that would interrupt share-image generation.
- [ ] GrowthGarden palette (earth tones — browns, leaves, sky) is unchanged.

### Button + link migrations

- [ ] All `bg-primary` solid buttons in 4A scope are migrated to `<Button variant="subtle">`:
  - EveningReflectionBanner "Reflect Now"
  - GratitudeWidget "Save"
  - PrayerListWidget "Add Prayer"
  - InstallCard "Install"
  - CustomizePanel "Reset to default" / "Done" / etc.
  - MoodCheckIn submit button
- [ ] `bg-primary` does NOT appear in any of the 4A-scope files post-migration (verified via grep).
- [ ] Modal buttons explicitly deferred to 4D (WelcomeWizard, WelcomeBack, EveningReflection 4-step, GettingStartedCelebration) remain UNCHANGED.
- [ ] All `text-primary` ghost links across the 4A grep audit are migrated to either `text-white/80 hover:text-white` (inline links) or `<Button variant="ghost" size="sm">` (button-affordance contexts).
- [ ] `text-primary` instances that are semantic active-state colors on icons are PRESERVED (case-by-case judgment documented in execution).
- [ ] After migration, `grep -rn 'text-primary' frontend/src/components/dashboard/ frontend/src/pages/Dashboard.tsx` returns only the legitimate active-state cases (with rationale documented per remaining match).

### CustomizePanel

- [ ] CustomizePanel chrome aligns with the system — either `<FrostedCard variant="subdued">` wrapper OR equivalent surface tokens.
- [ ] Internal panel buttons (Reset / Done / etc.) use `<Button variant="subtle">`.
- [ ] If panel chrome migration was scoped down at plan stage (button-only migration with chrome deferred to 4D), the rationale is documented inline in the execution plan and this acceptance criterion is split into "buttons migrated" + "chrome deferred to 4D, tracked".

### Modal/overlay non-touch

- [ ] WelcomeWizard, WelcomeBack, GettingStartedCelebration, EveningReflection 4-step modal, ChallengeCompletionOverlay, CelebrationQueue, individual CelebrationOverlay components remain UNCHANGED in 4A. (MoodCheckIn submit button is the explicit exception per Change 6.)

### Quality gates

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes — every test that asserted behavior continues to pass; tests that asserted on specific old chrome class names (`bg-white/5`, `border-white/10`, `rounded-2xl`, `bg-primary`) are updated to the new tokens. Net regression count is 0.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` baseline (post-Key-Protection: 8,811 pass / 11 pre-existing fail) is preserved. Any new failure is documented with rationale.

### Visual eyeball checks on `/`

- [ ] Multi-bloom violet canvas is visible behind content.
- [ ] Hero renders with greeting + status strip; "Happy Easter" is NOT showing (post-recency-window verification on 2026-05-04).
- [ ] Every DashboardCard consumer shows new FrostedCard chrome — visible lift off canvas, `rounded-3xl` corners, frosted-glass surface.
- [ ] Hover on any DashboardCard shows the lift-and-shadow treatment (`-translate-y-0.5`, `shadow-frosted-hover`, surface brightens to `bg-white/[0.10]`).
- [ ] GrowthGarden is a single SVG (verified via DOM inspection — no `lg:hidden` / `hidden lg:block` siblings).
- [ ] GardenShareButton generates a correct share image at multiple viewports.
- [ ] All migrated buttons render as subtle pills (translucent surface, white text, no `bg-primary` violet fill).
- [ ] All migrated links render as `text-white/80` with `hover:text-white`.

### Regression checks (cross-surface)

- [ ] DailyHub tabs (`/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`) render unchanged.
- [ ] BibleLanding (`/bible`) renders unchanged.
- [ ] `/bible/plans` renders unchanged.
- [ ] PrayerWall (`/prayer-wall`) Button ghost variant consumers render unchanged.
- [ ] Any non-Dashboard surface that consumes the 4A-touched components (FrostedCard, BackgroundCanvas, Button subtle/ghost, InstallCard) renders correctly.

### Lighthouse + accessibility

- [ ] Lighthouse Performance ≥ 90 on `/`.
- [ ] Lighthouse Accessibility ≥ 95 on `/`.
- [ ] No new axe-core violations introduced by the migration.
- [ ] Skip-to-main-content link continues to work.
- [ ] Keyboard navigation through DashboardCard collapse toggles (Tab, Enter/Space) works as before.

### Definition of done

- [ ] All eight changes implemented.
- [ ] All acceptance criteria checked.
- [ ] Test baseline preserved or net-positive.
- [ ] No new localStorage keys (verified against `11-local-storage-keys.md`).
- [ ] No new animation tokens hardcoded (verified against `frontend/src/constants/animation.ts`).
- [ ] Implementation plan documents the Change 1 gradient decision (Option A vs Option B), the Change 2 `aria-labelledby` decision (Option A vs Option B), the Change 5 GrowthGarden consolidation decision (Option A vs Option B), and the Change 8 CustomizePanel scope decision (full chrome migration or button-only).
- [ ] Master plan acceptance criteria (direction-doc Decisions 1, 5, 6, 14, 15) are checked off.
- [ ] No commits, no branch creation, no push — user manages all git operations manually.
