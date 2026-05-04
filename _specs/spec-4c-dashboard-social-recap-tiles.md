# Spec 4C: Dashboard Social, Recap, and Tiles

**Master Plan Reference:** Direction document at `_plans/direction/dashboard-2026-05-04.md` is the locked decision set for the three Dashboard sub-specs (4A foundation, 4B data widgets, 4C social/recap/tiles). Recon at `_plans/recon/dashboard-2026-05-04.md` is the verified pre-state. Spec 4A (`_specs/spec-4a-dashboard-foundation.md`) shipped the visual baseline (BackgroundCanvas, DashboardCard → FrostedCard primitive, DashboardHero, GrowthGarden double-mount fix, CustomizePanel chrome, global `bg-primary` solid → subtle Button migration, global `text-primary` ghost → `text-white/80` link migration, liturgical greeting recency window, and the post-4A patch promoting GettingStartedCard to `<FrostedCard variant="accent">`). Spec 4B (`_specs/spec-4b-dashboard-data-widgets.md`) shipped the Tonal Icon Pattern across the 11 data-leaning widgets (StreakCard, MoodChart, ActivityChecklist, TodaysDevotionalCard, VerseOfTheDayCard, ReadingPlanWidget, PrayerListWidget, RecentHighlightsWidget, GratitudeWidget, ChallengeWidget, BadgeGrid) with associated per-widget polish, plus the StreakCard / PrayerListWidget post-4B icon patches. This spec — 4C — finishes the Dashboard visual migration by landing the remaining 8 widgets that 4A/4B deliberately deferred (FriendsPreview, WeeklyRecap, WeeklyGodMoments, QuickActions, AnniversaryCard, EveningReflectionBanner, InstallCard, EchoCard), three small system additions (Decision 8 WeeklyRecap copy rewrite, Decision 12 InstallCard first-class widget promotion via explicit `widget-order.ts` constant, Decision 13 Caveat font → gradient text migration in three ceremony headings). Decisions 4 (Getting Started accent — already shipped), 7 (Lora italic for scripture only), 9 (leaderboard medal colors preserved), 10 (MoodChart ghosted empty state preserved — out of scope here) are honored throughout.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. If the working tree is on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/` — primary surface (Dashboard, logged-in users) — every change in this spec lands here, including the InstallCard ordering swap and the WelcomeBack / GettingStartedCelebration ceremony heading typography migration when those overlays render
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surfaces (QuickActions tiles route here; verify navigation logic intact)
- `/bible` (BibleLanding) — regression surface (no widget on this route changes; verify nothing drifts)
- `/bible/plans` — regression surface (no widget on this route changes; ensure Spec 4B's reading-plan mini-card alignment is unaffected)
- `/music` — regression surface (Music QuickAction tile routes here; verify navigation intact)

---

## Overview

Spec 4A landed the chrome (BackgroundCanvas, FrostedCard primitive, button/link system migrations). Spec 4B landed the Tonal Icon Pattern across the 11 data widgets and their per-widget polish. What remained were the 8 social/recap/utility widgets that deliberately got pushed to a third sub-spec because they collectively introduced two small additions to the system — the WeeklyRecap copy rewrite (Decision 8 — relational framing instead of transactional "unlock the feature" framing) and the ceremony heading typography migration (Decision 13 — Caveat `font-script` retired in favor of the gradient text pattern used elsewhere in the rollout).

Spec 4C migrates: **FriendsPreview** (Users icon mint, leaderboard medal colors preserved per Decision 9, MilestoneFeed timestamp typography muted, empty-state CircleNetwork preserved per Decision 8 business-goal protection); **WeeklyRecap** (BarChart3 lavender header icon, 4 stat-row icons each with their tonal color, empty-state copy rewritten to "Faith grows stronger together" / "Your weekly journey, walked alongside friends" / "Find people you walk with →" per Decision 8, filled state preserved verbatim including the contributed-percentage line per Decision 9); **WeeklyGodMoments** (Sparkles amber, banner alignment); **QuickActions** (the most visually impactful change in 4C — 4 tiles each adopt distinct tonal icon colors matching their destination tab: Pray pink, Journal sky, Meditate violet, Music cyan, with FrostedCard subdued chrome and a soft hover lift); **AnniversaryCard** (Sparkles amber, Lora italic closing message migrated to non-italic per Decision 7 — celebratory prose, not scripture); **EveningReflectionBanner** (Moon violet, evening-hours conditional rendering preserved); **InstallCard** (Download cyan, plus the first-class widget promotion per Decision 12 — replace the `style={{ order: 9999 }}` magic number in `DashboardWidgetGrid.tsx:359` with an explicit `INSTALL_CARD_ORDER` constant in `frontend/src/constants/dashboard/widget-order.ts` which already exists from Spec 4A); **EchoCard regression check** (Sparkles amber, plus a structural verification that EchoCard does not double-nest FrostedCard inside a DashboardCard — the file lives at `frontend/src/components/echoes/EchoCard.tsx`, NOT `frontend/src/components/dashboard/EchoCard.tsx` as the brief shorthand implied).

The third addition is the **ceremony heading typography migration** (Decision 13). Three files have a `font-script` Caveat usage on a celebratory heading:

- `frontend/src/components/dashboard/GettingStartedCelebration.tsx:77`
- `frontend/src/components/dashboard/WelcomeWizard.tsx:329` AND `:517` (the wizard has TWO ceremony headings, both render with `font-script` — both migrate)
- `frontend/src/components/dashboard/WelcomeBack.tsx:134`

All four usages migrate to the gradient text pattern: `bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent` with appropriate weight/size for the celebratory moment. CRITICAL constraint: the migration touches the heading element ONLY. Modal interiors (input fields, step indicators, navigation buttons, body content, layout) stay UNCHANGED — full modal redesigns are deferred to Spec 4D.

This spec is visual-only with one copy change (WeeklyRecap empty state) and one constants addition (`INSTALL_CARD_ORDER`). No data fetching changes, no hook changes, no localStorage keys, no API/backend changes. The InstallCard ordering refactor preserves the rendered behavior exactly — the card still renders last in the Dashboard grid. The copy change is visible only in the WeeklyRecap empty state (when `hasFriends === false`); the filled state stays verbatim per Decision 9. Behavioral preservation is non-negotiable: every existing test that asserts on behavior (click handlers, navigation logic, conditional rendering branches, evening-hours gating, ceremony-render conditions) must continue to pass without modification. Tests that asserted on specific class names changed by this spec are updated to the new tokens. Tests that asserted on the old WeeklyRecap empty-state copy strings are updated to the new copy.

After this spec ships, **Dashboard migration is complete**. The Tonal Icon Pattern then gets documented in `09-design-system.md` as a system-wide pattern (a separate small task, not part of this spec). Modal/overlay sweep (Spec 4D) is deferred and may or may not run.

## User Story

As a **logged-in user landing on the Dashboard**, I want the social half of the page to read with the same coherent restraint as the data half — a mint Users icon on Friends, a lavender BarChart on the recap card, a soft amber Sparkles on the weekly highlights and anniversary, a violet Moon on the evening reflection nudge, a cyan Download on the install card — so that the entire grid reads as a single scannable system rather than a frosted-half plus a flat-half. When I have no friends yet, I want WeeklyRecap to invite me into "Faith grows stronger together" rather than tell me to "unlock the feature." When I look at QuickActions, I want each tile to wear its destination's color — pink for prayer, sky-blue for journaling, violet for meditation, cyan for music — so the row feels like four distinct doors rather than four undifferentiated icons. And when an onboarding ceremony or anniversary fires, I want the celebratory heading to feel like the rest of the rollout's typography (gradient, intentional) rather than a leftover Caveat handwritten font from an earlier era.

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. Verify the working branch contains Spec 4A + post-4A patch + Spec 4B + post-4B patches. Specifically:
   - `frontend/src/components/dashboard/DashboardCard.tsx` renders as `<FrostedCard variant="default">`.
   - `frontend/src/components/dashboard/GettingStartedCard.tsx` renders as `<FrostedCard variant="accent">`.
   - All 11 widgets in 4B scope have their tonal icons applied per the audit table from the 4B execution log.
   - StreakCard header Flame is conditional (amber when streak active, white/30 when inactive).
   - PrayerListWidget Heart icon renders as `text-fuchsia-300` (the post-4B patch finalized this shade; the spec text mentioning `text-pink-300` is now superseded).
2. Verify the direction doc at `_plans/direction/dashboard-2026-05-04.md` is present and the locked decisions referenced throughout this spec match — particularly Decision 8 (WeeklyRecap copy rewrite), Decision 9 (leaderboard medal colors + contributed-percentage line preserved), Decision 11 (Tonal Icon Pattern with the per-widget assignment table — extends from Dashboard data widgets shipped in 4B to the social/recap/utility widgets in 4C), Decision 12 (InstallCard first-class widget promotion), Decision 13 (Caveat → gradient text migration).
3. Verify the recon at `_plans/recon/dashboard-2026-05-04.md` is present.
4. Capture a test baseline before any change: `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -50` and `pnpm typecheck`. Record total pass/fail counts. The post-4B-with-patches baseline target is the 4B-final-pass-count + any tests added in the 4B post-patch work. The 11 documented frontend regression failures (orphan deleted-hook test, plan browser CSS class drift, logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches, Pray loading-text timing flake) are pre-existing tech debt and remain. Any NEW failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. Read each of the 8 widget files in scope plus the 3 ceremony heading files to confirm current import sets (lucide-react icons), current chrome tokens, current conditional rendering branches, current Caveat `font-script` usages. The Tonal Icon Pattern application choice (use a `bg-white/[0.05]` rounded-square container vs. apply tonal color inline) is per-widget and depends on existing structure — read first, then apply.
6. Verify the existing icon imports per widget. If a widget currently uses an icon name that doesn't match the assignment table (e.g., AnniversaryCard might already use Cake or Calendar instead of Sparkles), keep the existing icon and apply the tonal color rather than swapping the icon glyph. Icon glyph swaps are out of scope.
7. Verify the file path of EchoCard. The brief lists it as `frontend/src/components/dashboard/EchoCard.tsx` but recon confirms it lives at `frontend/src/components/echoes/EchoCard.tsx`. Modify the actual path; the brief's listing is shorthand, not literal.
8. Verify the `widget-order.ts` constants file path. It exists at `frontend/src/constants/dashboard/widget-order.ts` (NOT `frontend/src/lib/dashboard/widget-order.ts` as the brief speculated). Add the `INSTALL_CARD_ORDER` constant to the existing file alongside the current `WidgetId` exports.
9. Verify the magic `order: 9999` location. It lives at `frontend/src/components/dashboard/DashboardWidgetGrid.tsx:359` (an inline `style={{ order: 9999 }}` on a wrapping `<div>` containing `<InstallCard />`, not on the `<InstallCard />` element itself). The refactor decision (consume `INSTALL_CARD_ORDER` via prop on InstallCard internally vs. inline in DashboardWidgetGrid via the constant) lives below in Change 7b.
10. Verify the WeeklyWizard ceremony heading count. Recon confirms TWO `font-script` headings in `WelcomeWizard.tsx` (lines 329 and 517 in the current source). Both migrate. The brief's "celebration heading at the top of the wizard" is shorthand; the migration applies to all `font-script` usages in that file. Read the file in execution to confirm whether both render in user-visible flow or whether one is dead code; if dead code, surface as follow-up rather than expanding scope.

#### Tonal Icon Pattern — application convention (continuation from 4B)

The pattern lives in the direction doc Decision 11 and was debuted in Spec 4B. Restated here for executor reference:

**The pattern:**

- Card chrome stays in the violet/glass system (already shipped in 4A via DashboardCard → FrostedCard).
- Icon container is a small rounded square at `bg-white/[0.05]` — quiet, in-system. When the existing structure uses a container.
- Icon itself carries a tonal color signaling category. When the existing structure has the icon inline with the heading (no container), keep it inline and apply the tonal color directly.
- Colors are muted/pastel, never fully saturated.
- The icon is the ONLY colored element in the card; everything else stays violet/glass.

**Container pattern (when applied):**

```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
  <Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
</div>
```

**Inline pattern (when applied):**

```tsx
<Sparkles className="h-5 w-5 text-amber-300" aria-hidden="true" />
```

**Tonal token assignments for Spec 4C** (CC selects exact shade per widget during execution based on rendered contrast against the FrostedCard chrome — these are the families/defaults locked at planning time):

| Widget                              | Icon                              | Tonal default        | Family rationale                                   |
| ----------------------------------- | --------------------------------- | -------------------- | -------------------------------------------------- |
| FriendsPreview header               | Users                             | `text-emerald-300`   | Mint — community/together                          |
| WeeklyRecap header                  | BarChart3                         | `text-violet-300`    | Lavender — reflection/looking back                 |
| WeeklyRecap stat row 1 (Prayed)     | BookOpen                          | `text-pink-300`      | Prayer/care (matches PrayerListWidget family)      |
| WeeklyRecap stat row 2 (Completed)  | ListChecks                        | `text-emerald-300`   | Mint — completion                                  |
| WeeklyRecap stat row 3 (Journaled)  | FileEdit                          | `text-violet-300`    | Lavender — introspection                           |
| WeeklyRecap stat row 4 (Hours)      | Music                             | `text-cyan-300`      | Action/music (matches QuickAction Music tile)      |
| WeeklyGodMoments header             | Sparkles                          | `text-amber-300`     | Warm gold — celebration/discovery                  |
| QuickActions tile 1 (Pray)          | Heart                             | `text-pink-300`      | Warm care                                          |
| QuickActions tile 2 (Journal)       | BookOpen                          | `text-sky-300`       | Study/scripture family                             |
| QuickActions tile 3 (Meditate)      | Brain                             | `text-violet-300`    | Introspection                                      |
| QuickActions tile 4 (Music)         | Music                             | `text-cyan-300`      | Action/listen                                      |
| AnniversaryCard header              | Sparkles (or existing glyph)      | `text-amber-300`     | Gold — celebration                                 |
| EveningReflectionBanner header      | Moon                              | `text-violet-300`    | Lavender — rest/end-of-day                         |
| InstallCard header                  | Download                          | `text-cyan-300`      | Action/install                                     |
| EchoCard header                     | Sparkles                          | `text-amber-300`     | Warm gold — discovery/recall                       |

**Application discipline:** Apply the pattern in a way that fits each widget's existing structure. Do not impose a container where none exists if it would disturb the layout; do not strip a container if it already reads correctly. The end-state contract is "icon carries tonal color, everything else stays in-system." For QuickActions specifically, each tile's icon is part of the tile's primary visual affordance (the tile IS the button), so the icon sits inline at a larger size — the application is class-string-only, the size and structure of each tile stay as-is.

#### Change 1 — FriendsPreview

Modify `frontend/src/components/dashboard/FriendsPreview.tsx`.

**Tonal icon:** Apply `text-emerald-300` (mint — signals community/together) to the Users icon at the card header. If the existing structure uses an icon-with-container layout, container stays at `bg-white/[0.05]`; if inline with heading, apply tonal color inline.

**Per-widget polish:**

- **Leaderboard top-3 medal-color treatment (PRESERVED — Decision 9).** #1 stays `text-amber-400` (or whatever existing gold token), #2 stays the existing silver-ish token, #3 stays the existing bronze-ish token. Do NOT migrate medal colors to muted tones. The leaderboard's medal-color signaling is a deliberate exception to the Tonal Icon Pattern because it carries semantic ranking information, not categorical metadata. Verify all three medal tokens render correctly against the upgraded FrostedCard surface; if any look wrong (e.g., the bronze drops contrast below readable on the new chrome), adjust to the closest acceptable shade and document inline.
- **"You · #11 · 0 pts" line.** Currently a small caption-style row showing the user's own ranking. Align with FrostedCard caption patterns: `text-white/60` or similar muted tone for the row, with the rank number subtly more prominent (`text-white/80`) if the existing implementation already has a hierarchy.
- **MilestoneFeed (recent activity feed at bottom).** Preserve the structural shape verbatim. Each row currently has: avatar circle + activity line + relative timestamp. Avatar circle stays as is (avatar imagery / initials are user-content, not categorical chrome). The activity line ("Maria L. hit a 90-day streak!") reads as default body text (`text-white/80`). The relative timestamp ("8 hours ago") gets `text-white/50` (citation/utility tone). If MilestoneFeed already uses these tones, this is verification rather than migration.
- **Empty state (when user has no friends).** Currently shows the "CircleNetwork" empty illustration with copy encouraging finding friends. PRESERVE — friends growth is a business goal per Decision 8. The empty state stays inviting, not collapsed. If the current empty-state copy reads transactional rather than relational, surface for consideration but do NOT rewrite it in this spec — only WeeklyRecap empty-state copy is in 4C scope per Decision 8. (The FriendsPreview copy is implicitly fine; if it needs work, that's a follow-up spec, not 4C.)
- **"See all" link in card header (VERIFY).** Should already be migrated to `text-white/80 hover:text-white` from 4A. Verify still working post-execution.

#### Change 2 — WeeklyRecap

Modify `frontend/src/components/dashboard/WeeklyRecap.tsx`.

The most substantive content change in 4C: copy rewrite + tonal icon application + 4 stat-row icon tonal application + filled-state preservation.

**2a — Tonal icon (header)**

Apply `text-violet-300` (lavender — signals reflection / looking back) to the BarChart3 icon at the card header. If the widget uses a different icon glyph (e.g., TrendingUp, Activity, Clock), keep the existing glyph and apply the lavender tonal color.

**2b — Empty-state copy rewrite (Decision 8)**

The condition for the empty state is whatever combination triggers "no recap data available" in the current implementation — likely `hasFriends === false` AND/OR `lastWeek === undefined`. Read the source during execution to confirm the exact condition. Whatever the condition is, the empty state UI structure migrates as follows:

| Element     | Current copy (read source to confirm exact strings)              | New copy                                                  |
| ----------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| Heading     | (current — likely "Add friends to see your weekly recap" or similar transactional framing) | **"Faith grows stronger together"**                        |
| Description | (current — likely missing or minimal supporting copy)            | **"Your weekly journey, walked alongside friends"**        |
| CTA link    | (current — likely "Add friends" or "Find friends")               | **"Find people you walk with →"**                          |

**CTA destination:** the link routes to the friend-discovery flow. Read the source to confirm the current href — likely `/friends` (the Friends + Leaderboard tabbed page) or a more specific discovery sub-route. Preserve the existing destination; only the link TEXT migrates, not the routing target.

**Empty-state structure simplification rule:** If the existing empty state has MORE elements than these three (heading, subhead/description, CTA), simplify down to these three. If it has FEWER, extend to match. If it has these three but with different element order, keep the migrated copy in the existing element order.

**Visual treatment:** The empty state still sits inside the WeeklyRecap FrostedCard. The heading uses the same heading typography as other widget headings (likely `text-white text-base font-medium` or similar — match what the rest of the page uses). The description uses body content tone (`text-white/80`). The CTA link uses `text-white/80 hover:text-white` (matches the post-4A inline link migration).

**Anti-pressure voice check:** the new copy is relational ("walked alongside friends") not transactional ("unlock the feature"). The CTA frames addition as "find people" not "add friends to see content." This is intentional per Decision 8; the user explicitly requested this shift. If during execution the new copy feels stiff in context, the heading/description/CTA strings are LOCKED — do not rewrite. The phrasing was decided in the direction doc.

**2c — Filled-state preservation (Decision 9)**

When the user has friends AND there is recap data, the WeeklyRecap renders its full content. PRESERVE this state's copy verbatim:

- "Last week, your friend group:" intro line (or current variant)
- 4 stat lines: Prayed N times / Completed N meditations / Journaled N entries / Hours N (read source to confirm exact stat counts)
- "You contributed N% of the group's growth!" celebratory line — Decision 9 explicitly preserves this. Do NOT reword, do NOT remove.

The dismiss "X" affordance at top-right (if present) stays as `<Button variant="ghost" size="sm">` (or matches whatever the post-4A icon-button convention is). If currently rendered as raw `<button>`, render via Button ghost.

**2d — Stat-row icon tonal application**

Each of the 4 stat row icons receives a distinct tonal color per the table in the Tonal Icon Pattern section above:

- BookOpen (Prayed): `text-pink-300` — prayer/care family
- ListChecks (Completed meditations): `text-emerald-300` — completion family
- FileEdit (Journaled): `text-violet-300` — introspection family
- Music (Hours): `text-cyan-300` — action/music family (matches Music QuickAction tile for cross-widget consistency)

Each stat row's text and count typography aligns with FrostedCard caption patterns: count is prominent (`text-white` or `text-white/95`); supporting label is muted (`text-white/70` or `text-white/60`). If the existing implementation already has this hierarchy, this is verification rather than migration.

**"You contributed N%" line:** should remain visually emphasized (likely currently rendered with `text-primary` or `text-white` plus a slightly larger size or font weight). KEEP the emphasis but ensure it reads as in-system, not loud. If currently uses `text-primary`, migrate to `text-white` or a violet-system token (e.g., `text-violet-200` if the gradient text pattern is acceptable here — though the gradient text pattern is reserved for ceremony headings per Decision 13, so default to plain `text-white` weight emphasis instead).

#### Change 3 — WeeklyGodMoments

Modify `frontend/src/components/dashboard/WeeklyGodMoments.tsx`.

**Tonal icon:** Apply `text-amber-300` (warm gold — signals celebration/discovery) to the Sparkles icon at the card header. If a different glyph is in use (e.g., Star, Award), keep the existing glyph and apply the warm-gold tonal color. (Note: this matches the EchoCard tonal color — both widgets sit in the "discovery/recall" family in Decision 11's table, and the visual collision is intentional family-grouping.)

**Per-widget polish:**

- **Banner-style chrome.** WeeklyGodMoments renders as a banner-style card showing weekly highlights. Confirm chrome aligns with FrostedCard default (it consumes DashboardCard so should be auto-migrated from 4A). If WeeklyGodMoments uses a custom wrapper that doesn't go through DashboardCard, surface this — the spec assumes consumption.
- **"Moment" entries inside.** Preserve structure verbatim. Ensure typography reads as in-system body content (`text-white/80` for moment text, muted citation tone for any timestamps/contexts).
- **"View all" link if present.** Migrate to `text-white/80 hover:text-white`. If 4A already migrated this, verification only.

#### Change 4 — QuickActions

Modify `frontend/src/components/dashboard/QuickActions.tsx`.

The most visually impactful change in 4C. Currently the 4 tiles (Pray, Journal, Meditate, Music) render as uniform white-icon affordances. Per Decision 11, each tile gets a distinct tonal icon color matching its destination tab. After migration, the row reads as four visually-distinct doors rather than four undifferentiated tiles.

**Tile-to-icon-to-tonal-color assignments** (locked):

| Tile     | Icon     | Tonal color       | Destination         |
| -------- | -------- | ----------------- | ------------------- |
| Pray     | Heart    | `text-pink-300`   | `/daily?tab=pray`     |
| Journal  | BookOpen | `text-sky-300`    | `/daily?tab=journal`  |
| Meditate | Brain    | `text-violet-300` | `/daily?tab=meditate` |
| Music    | Music    | `text-cyan-300`   | `/music`              |

**Per-tile polish:**

- **Tile chrome.** Each tile's wrapper element migrates to consume the FrostedCard subdued variant — `<FrostedCard variant="subdued">` if that variant exists in the FrostedCard component (verify during execution). Subdued reads as slightly less visual weight than default — appropriate because the 4 tiles together form a single navigation row, so subdued reads better than each-tile-as-full-card-default. **Fallback:** if FrostedCard does not currently expose a `subdued` variant, render each tile as a styled wrapper using the subdued variant tokens directly: `bg-white/[0.05] border border-white/[0.10] rounded-3xl p-5` (or whatever the FrostedCard default rounding/padding is, scaled down one step). Lock the choice during execution and document inline.
- **Tile label typography.** Keep simple: `text-white text-sm font-medium` (or match whatever the current label tokens are if they already align with the FrostedCard system). Preserve the existing tile structure (icon-above-label vs. icon-beside-label).
- **Hover treatment.** Each tile lifts slightly on hover, signaling affordance. Apply `hover:bg-white/[0.08] hover:-translate-y-0.5` (or `motion-safe:hover:-translate-y-0.5` to be reduced-motion-safe — the global animation safety net at `frontend/src/styles/animations.css` already governs, but explicit `motion-safe:` on the translate is good practice). Transition duration uses `transition-all duration-200` or pulls from `frontend/src/constants/animation.ts` if there's a `quickHover` token defined there. NO hardcoded `cubic-bezier(...)` strings.
- **Click target.** Each tile is either a `<button>`, `<Link>`, or `<a>` element routing to the destination tab. Preserve every existing click handler / navigation prop / href verbatim. The migration is class-string-only at the tile level; no behavior changes.
- **Grid layout.** 4-column grid on desktop, 2-column on mobile. Read the existing grid CSS to confirm the current breakpoint behavior. If currently using `grid-cols-4` only, add `grid-cols-2 sm:grid-cols-4` for responsive collapse. If already responsive, verify intact.
- **Accessibility.** Each tile preserves its accessible name. Icons receive `aria-hidden="true"` since the tile label provides the accessible name. Keyboard activation works (Enter/Space if `<button>`; native if `<Link>` or `<a>`).

#### Change 5 — AnniversaryCard

Modify `frontend/src/components/dashboard/AnniversaryCard.tsx`.

**Tonal icon:** Apply `text-amber-300` (gold — celebration) to the Sparkles icon at the card header. If a different glyph is in use (Cake, PartyPopper, Calendar), keep the existing glyph and apply the gold tonal color.

**Per-widget polish:**

- **Card chrome (PRESERVED as default, NOT accent).** AnniversaryCard is celebratory (e.g., "1 year on Worship Room!"). The brief considered migrating to `<FrostedCard variant="accent">` to match GettingStartedCard but locked the decision: KEEP as default. Direction doc Decision 4 said only Getting Started gets accent on Dashboard; the implicit rule is "only one accent card visible at a time" — adding a second accent card on Dashboard would dilute the visual emphasis. If the user later wants accent on Anniversary, that's a follow-up spec, not 4C. The card consumes DashboardCard which renders FrostedCard default — confirm this consumption path.
- **Closing message Lora italic → non-italic (Decision 7).** The closing message currently uses Lora italic via `font-serif italic` (or `font-serif` + `italic` separate classes). Migrate to non-italic by removing the `italic` class. Decision 7 is explicit: Lora italic is preserved for scripture only; AnniversaryCard's closing message is celebratory prose, not scripture. After migration, the closing message renders in the system's default sans-serif body font (Inter or whatever the FrostedCard body default is) at the same size and weight, just without the italic styling. Read the source to confirm the exact class string.
- **Specific celebratory copy stays.** "X year(s) on Worship Room!" or whatever the current content reads — the COPY is preserved. Only the visual styling of the closing message migrates.

#### Change 6 — EveningReflectionBanner

Modify `frontend/src/components/dashboard/EveningReflectionBanner.tsx`.

**Tonal icon:** Apply `text-violet-300` (lavender — rest/end-of-day) to the Moon icon at the card header. If the widget uses a different glyph (Sunset, Star), keep the existing glyph and apply the lavender tonal color. (Note: this lavender shade matches the WeeklyRecap header and the QuickActions Meditate tile — three lavender-introspection touchpoints across Dashboard. The visual repetition is intentional family-grouping per Decision 11.)

**Per-widget polish:**

- **"Reflect Now" button (VERIFY).** Already migrated to `<Button variant="subtle">` in 4A per the brief's Files-modified inventory. Verify still working. If the button regressed back to `bg-primary`, re-apply the subtle migration.
- **Banner card chrome.** Consumes DashboardCard so auto-migrated from 4A. Confirm it reads cleanly against the upgraded FrostedCard surface.
- **Conditional rendering.** This banner only shows during evening hours (typically after 7 PM local time, gated by the `currentHour` check or similar). Preserve the gating logic VERBATIM. Read the source during execution to confirm the exact threshold; do NOT change it.
- **Copy.** Keep current copy unless it reads stale on the upgraded chrome. If migration to the new chrome reveals copy that competes for attention or feels stiff, surface for consideration but do NOT rewrite — copy changes are out of scope for 4C except for the WeeklyRecap empty state.

#### Change 7 — InstallCard (first-class widget promotion)

Modify `frontend/src/components/ui/InstallCard.tsx` AND `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` AND `frontend/src/constants/dashboard/widget-order.ts`.

Three parts: tonal icon, ordering refactor, visual chrome verification.

**7a — Tonal icon**

Apply `text-cyan-300` (action/install) to the Download icon at the card header. If the widget uses a different glyph (e.g., DownloadCloud, AppWindow), keep the existing glyph and apply the cyan tonal color.

**7b — First-class widget promotion (Decision 12)**

Replace the magic `style={{ order: 9999 }}` at `frontend/src/components/dashboard/DashboardWidgetGrid.tsx:359` with an explicit ordering rule sourced from a constant.

Add to `frontend/src/constants/dashboard/widget-order.ts` (the file already exists with the `WidgetId` type and presumably an order array):

```ts
/**
 * InstallCard intentionally renders LAST in the Dashboard grid.
 * Sentinel value (high integer, not part of the widget ordering sequence)
 * so the card always sits at grid-end regardless of which other widgets
 * the user has enabled. PWA install reminder is non-essential; tail position
 * keeps it from competing for primary-content attention.
 */
export const INSTALL_CARD_ORDER = 999
```

The exact value (`999` vs. `9999`) is a judgment call — both work given that the `WidgetId` order array has fewer than 50 entries. The brief proposed `999`; the existing inline value is `9999`. Lock at `999` for the new constant; the smaller value reads as "high but not absurd." (CSS flex/grid `order` is integer; any value greater than the max enumerated widget order achieves the same end-of-grid behavior.)

Then update `DashboardWidgetGrid.tsx:359` from:

```tsx
<div className="lg:col-span-5" style={{ order: 9999 }}>
  <InstallCard />
</div>
```

to:

```tsx
import { INSTALL_CARD_ORDER } from '@/constants/dashboard/widget-order'

// ... inside the render

<div className="lg:col-span-5" style={{ order: INSTALL_CARD_ORDER }}>
  <InstallCard />
</div>
```

**Refactor decision:** the brief floated two options for InstallCard's order prop:

- **Option A:** InstallCard takes an `order` prop and applies `style={{ order }}` internally.
- **Option B:** Order stays inline at the consumer site (DashboardWidgetGrid) but uses the constant rather than the magic number.

**Locked: Option B.** Rationale — the consumer site (DashboardWidgetGrid) is the only place that knows about the grid's ordering scheme. Pushing `order` into InstallCard's prop API leaks layout knowledge into a generic UI component. InstallCard lives at `frontend/src/components/ui/InstallCard.tsx` (the `ui` namespace, suggesting cross-feature reuse — though current usage is Dashboard-only, the path implies generic). Keeping ordering at the consumer site preserves the cleaner architecture. The constant is the abstraction; the consumer applies it. If a future surface needs to render InstallCard with different ordering, the consumer specifies its own constant.

**Preserve any conditional rendering.** InstallCard only shows if the PWA install prompt is available (read InstallCard internals to confirm the gating — likely `useInstallPrompt()` or `wr_install_dismissed` check). The wrapping `<div>` and its conditional logic at `DashboardWidgetGrid.tsx:357–360` (or wherever) stay as-is functionally; only the magic-number-to-constant swap changes.

**7c — Visual chrome (verification)**

The CTA button on InstallCard ("Install" or whatever the copy is) was already migrated to `<Button variant="subtle">` in 4A per the direction-doc Files-modified inventory. Verify still working. If regressed, re-apply the subtle migration.

If InstallCard's content currently competes visually with primary widgets (e.g., uses an aggressive accent color or large dismiss "X"), surface for consideration but do NOT rewrite. The visual treatment migration is icon-tonal-color + Button subtle verification only; structural redesign is out of scope.

#### Change 8 — EchoCard regression check

Modify `frontend/src/components/echoes/EchoCard.tsx` (note: NOT `frontend/src/components/dashboard/EchoCard.tsx` — recon confirmed the file lives in the `echoes` namespace).

EchoCard was migrated to FrostedCard default in Spec 3 (the shared-components migration that ran before 4A). This change does TWO things: a regression check for double-FrostedCard nesting, plus a tonal icon application.

**Tonal icon:** Apply `text-amber-300` (warm gold — discovery/recall) to the Sparkles icon at the card header. If a different glyph is in use (Echo, Repeat, Refresh), keep the existing glyph and apply the warm-gold tonal color.

**Per-widget polish:**

- **Double-nest detection.** EchoCard, when rendered on Dashboard, sits inside whatever wrapping the Dashboard provides. If EchoCard internally wraps in its OWN `<FrostedCard>` (from the Spec 3 migration) AND it's rendered inside a `<DashboardCard>` (which wraps in `<FrostedCard>` from 4A), this is double-nesting — two frosted-glass surfaces stacked on top of each other, producing a visibly heavier card chrome than the rest of the page.

  **Detection step:** read `EchoCard.tsx` source to determine if it wraps in `<FrostedCard>`. Then read the consumption site on Dashboard (likely `DashboardWidgetGrid.tsx` or `Dashboard.tsx`) to determine if EchoCard is rendered as a direct child of the grid (no extra wrapper) or inside a `<DashboardCard>` (wrapper present).

  **Resolution decision (during execution):**

  - If EchoCard wraps internally AND DashboardCard wraps externally → REMOVE EchoCard's internal FrostedCard wrapper; let DashboardCard provide chrome (single source of frosted-glass surface).
  - If EchoCard wraps internally AND it's NOT rendered inside DashboardCard externally → KEEP EchoCard's internal FrostedCard wrapper as-is (single source preserved).
  - If EchoCard does NOT wrap internally AND DashboardCard wraps externally → no change needed (single source preserved); the only edit is the tonal icon application.
  - If EchoCard does NOT wrap internally AND it's NOT rendered inside DashboardCard → ADD an internal FrostedCard wrapper to EchoCard so it sits in the system. Document this case as the most edit-heavy outcome.

  Lock the resolution path during execution and document inline. The end-state contract is "EchoCard renders inside exactly ONE FrostedCard surface, regardless of how it's rendered on Dashboard."

- **EchoCard cross-surface usage check.** EchoCard might be used on surfaces other than Dashboard (e.g., `/bible/my` or other personal-layer pages). Verify any cross-surface usage isn't broken by the resolution decision. If removing the internal FrostedCard wrapper breaks rendering on `/bible/my`, surface and either (a) keep the internal wrapper but skip rendering the wrapper inside DashboardCard via prop, or (b) add a parent FrostedCard wrapping at the `/bible/my` consumption site. Document the chosen approach inline.

#### Change 9 — Ceremony heading typography (Caveat → gradient)

Three files. Migrate every `font-script` usage on a celebratory heading to the gradient text pattern.

**Gradient text pattern (locked for ceremony headings):**

```tsx
<h2 className="bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold md:text-4xl">
  {/* heading text */}
</h2>
```

The size (`text-3xl md:text-4xl`) is a default; adjust per heading to match the celebration moment's existing visual weight. Read each file before migrating to determine the current size class — preserve if already at `text-3xl`/`text-4xl`/`text-5xl`; bump up or down a step if needed to match the surrounding layout.

**9a — GettingStartedCelebration (`frontend/src/components/dashboard/GettingStartedCelebration.tsx`)**

Recon confirms the ceremony heading at line 77:

```tsx
className="text-center font-script text-3xl text-white sm:text-4xl md:text-5xl"
```

Migrate to:

```tsx
className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold sm:text-4xl md:text-5xl"
```

Notes:
- Remove `font-script` and `text-white` (gradient + clip-text replaces both).
- Add `font-bold` for weight emphasis (Caveat carries weight via the script font itself; the gradient pattern needs explicit bold).
- Preserve `text-center`, the size cascade, and the `md:text-5xl` upper bound.
- Preserve the heading text content verbatim.

**9b — WelcomeWizard ceremony headings (`frontend/src/components/dashboard/WelcomeWizard.tsx`)**

Recon confirms TWO `font-script` usages at lines 329 and 517. Both migrate. Apply the same gradient text pattern, preserving each heading's size cascade and surrounding classes (e.g., `outline-none` on the input-aware heading at line 329).

Line 329 current:
```tsx
className="text-center font-script text-3xl font-bold text-white outline-none sm:text-4xl"
```

Migrate to:
```tsx
className="text-center bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-3xl font-bold outline-none sm:text-4xl"
```

Line 517 current:
```tsx
className="font-script text-2xl font-bold text-white outline-none sm:text-3xl"
```

Migrate to:
```tsx
className="bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-2xl font-bold outline-none sm:text-3xl"
```

**CRITICAL constraint:** Do NOT redesign the rest of WelcomeWizard. The wizard's interior — input fields, step indicators, navigation buttons, layout, copy, validation, transitions — stays UNCHANGED. ONLY the two `font-script` heading classes migrate. Modal interior is 4D scope.

**Recon validation step during execution:** Both `font-script` headings should be on the user-visible flow (line 329 = early step heading; line 517 = later-step heading). If during execution one of the two is dead code (component branch never renders, e.g., behind a flag that's permanently off), surface as a follow-up to remove the dead code rather than expanding 4C scope. The migration applies to whichever ceremony headings actually render to users; dead-code paths get the migration too (cheap to do; keeps the file clean) but should be flagged.

**9c — WelcomeBack ceremony heading (`frontend/src/components/dashboard/WelcomeBack.tsx`)**

Recon confirms the ceremony heading at line 134:

```tsx
className={cn('font-script text-4xl font-bold text-white sm:text-5xl', fadeIn)}
```

Migrate to:

```tsx
className={cn('bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent text-4xl font-bold sm:text-5xl', fadeIn)}
```

Notes:
- `cn(...)` invocation pattern preserved.
- The `fadeIn` class continuation preserved (animation entry effect).
- Remove `font-script` and `text-white`; gradient + clip-text replaces both.
- Preserve `font-bold` and the size cascade.

**Same CRITICAL constraint as 9b:** WelcomeBack interior stays UNCHANGED. ONLY the heading className migrates.

**Caveat font dependency cleanup (deferred follow-up):** This spec migrates the THREE files where `font-script` Caveat is used on celebration headings. After all four usages are migrated, the Caveat font should no longer be referenced in user-visible code. Verify by searching the codebase for `font-script` and `Caveat` post-migration. If no usages remain, the `Caveat` font can be removed from the Tailwind config and any imports — but that font-removal is a SEPARATE follow-up spec, not part of 4C, because removing the font from config requires verifying it isn't referenced in fixtures, tests, or storybook stories that might break. Surface the cleanup opportunity in the post-execution log.

### Non-Functional Requirements

- **TypeScript strict** — `pnpm typecheck` must pass post-migration.
- **Test baseline preservation** — every existing test must continue to pass. Tests that asserted on specific class names changed by this spec (e.g., `font-script` class assertions on the ceremony headings, the `style={{ order: 9999 }}` inline-style assertion if any test snapshots DashboardWidgetGrid, FriendsPreview/WeeklyRecap/QuickActions/AnniversaryCard/EveningReflectionBanner/InstallCard/EchoCard icon className assertions, the WeeklyRecap empty-state copy strings) are expected to need updates because the chrome / copy literally changed; update them to assert the new tokens / new copy. Tests that assert on **behavior** (button click handlers firing, conditional rendering branches selecting correctly, evening-hours gating, ceremony render conditions, navigation logic firing on tile click, leaderboard ranking math, MilestoneFeed pagination, InstallCard PWA-availability gating) MUST continue to pass without modification. Net regression count is 0 net of pre-existing tech debt.
- **Accessibility (WCAG 2.2 AA)** — all icons receive `aria-hidden="true"` if they are purely decorative (which all categorical icons are once accompanied by a heading text or tile label). All interactive elements (buttons, links, tile click targets, dismiss "X" affordances) preserve their accessible name and keyboard activation. The QuickActions tiles preserve keyboard activation (Enter/Space if `<button>`, native if `<Link>`/`<a>`). Color contrast for the new tonal icons is not a concern at WCAG-AA's 3:1 graphic-object minimum because the icons are accompanied by readable text labels — but verify any text rendered in the gradient text pattern (`text-violet-300`-to-`text-violet-200` clip-text) meets the 4.5:1 contrast threshold against the WelcomeWizard / WelcomeBack / GettingStartedCelebration backgrounds. Gradient clip-text has historically been a contrast risk; if the lavender gradient drops below 4.5:1, fall back to a darker gradient (e.g., `from-violet-400 to-violet-300`) or surface for consideration.
- **Performance** — no regression in TTI/LCP on `/`. Tonal Icon Pattern adds zero DOM weight and zero JS — class-string changes only. The InstallCard ordering refactor is also class-string-only (constant import + inline style change); zero runtime cost. The QuickActions hover treatment adds CSS transitions but `motion-safe:` gating prevents reduced-motion users from paying the cost. Lighthouse Performance must stay at 90+ on `/`.
- **Reduced motion** — the QuickActions hover lift uses `motion-safe:hover:-translate-y-0.5` (or `motion-reduce:hover:translate-y-0` as an explicit reset). The global reduced-motion safety net at `frontend/src/styles/animations.css` already governs broadly; the explicit `motion-safe:` on the new lift is good practice. No new animations introduced beyond the hover lift.
- **Animation token discipline** — if the QuickActions hover transition needs an explicit duration/easing, source from `frontend/src/constants/animation.ts` (likely a `quickHover` or `cardHover` token). NO hardcoded `200ms` or `cubic-bezier(...)` strings in new code. If no suitable token exists, default to Tailwind's `transition-all duration-200` (which compiles to `0.2s` cubic-bezier`(0.4, 0, 0.2, 1)` per Tailwind's default — this is documented and acceptable as a fallback).
- **Anti-pressure voice continuity.** Decision 8's WeeklyRecap copy migration is itself an anti-pressure-voice protection. The new copy ("Faith grows stronger together," "Your weekly journey, walked alongside friends," "Find people you walk with →") is relational, not transactional. No copy elsewhere in 4C scope changes; the FriendsPreview empty state stays as-is per the Decision 8 business-goal protection clause (CircleNetwork inviting illustration preserved); the AnniversaryCard celebratory copy stays verbatim. The Tonal Icon Pattern application across QuickActions, WeeklyGodMoments, EveningReflectionBanner, EchoCard does not affect copy at all.

## Auth Gating

This spec is a visual + minor-copy migration on existing Dashboard widgets and ceremony overlays. It does NOT introduce new interactive elements, new gated actions, or new auth-modal triggers. Auth behavior is inherited from the existing widgets and remains unchanged.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Visit `/` | Renders `Home` (landing page), NOT Dashboard. Dashboard is auth-gated by `AuthProvider` per `02-security.md`. | Renders Dashboard with all 8 widgets covered by this spec. | N/A — handled at route level by `AuthProvider`. |
| Click any FriendsPreview leaderboard row or "See all" link | N/A — FriendsPreview only renders for logged-in users. | Routes to `/friends` (existing behavior). | N/A |
| Click WeeklyRecap empty-state CTA "Find people you walk with →" | N/A — WeeklyRecap only renders for logged-in users. | Routes to `/friends` or current friend-discovery destination (existing behavior; only the CTA TEXT migrates). | N/A |
| Click WeeklyRecap dismiss "X" | N/A | Dismisses the WeeklyRecap card (existing behavior). | N/A |
| Click any WeeklyGodMoments "moment" entry | N/A | Routes to the moment's source content (existing behavior). | N/A |
| Click QuickActions Pray tile | N/A — QuickActions only renders for logged-in users (or, if visible logged-out per recon, then routes to `/daily?tab=pray` and the auth gate for AI prayer generation fires within the destination). | Routes to `/daily?tab=pray`. | N/A from QuickActions itself; downstream auth-gate behavior on Pray is governed by 02-security.md. |
| Click QuickActions Journal tile | N/A | Routes to `/daily?tab=journal`. | N/A from tile; downstream gate on Journal save behavior. |
| Click QuickActions Meditate tile | N/A | Routes to `/daily?tab=meditate`. | N/A from tile; downstream gate on Meditate cards (auth modal on click for logged-out, route-level redirect on `/meditate/*` sub-pages). |
| Click QuickActions Music tile | N/A | Routes to `/music`. | N/A — Music is unauthenticated. |
| AnniversaryCard render | N/A — anniversary milestone tracked from join-date in `wr_anniversary_milestones_shown` (logged-in only). | Renders on milestone date (existing behavior). | N/A |
| EveningReflectionBanner render | N/A — only renders for logged-in users during evening hours. | Renders during evening hours (existing behavior). | N/A |
| Click EveningReflectionBanner "Reflect Now" button | N/A | Routes to evening-reflection flow (existing behavior). | N/A |
| InstallCard render | Visible to logged-out AND logged-in users (PWA install is auth-independent — see `02-security.md` § Bible Wave Auth Posture, also applies to PWA prompts more broadly). | Same. | N/A — PWA install is unauthenticated. |
| Click InstallCard "Install" button | Triggers PWA install prompt (browser-native flow). | Same. | N/A |
| EchoCard render | EchoCard surfaces session-scoped echo state. Visibility on Dashboard is auth-gated by Dashboard itself (logged-in only). On `/bible/my` if cross-surface, EchoCard is auth-independent per Bible Wave auth posture. | Renders on Dashboard for logged-in users. | N/A |
| Click EchoCard echo entry | N/A on Dashboard (logged-in only). | Routes to source verse / source content (existing behavior). | N/A |
| Open WelcomeWizard ceremony (first-run) | N/A — wizard fires for logged-in users on first session post-registration. | Renders ceremony heading with new gradient text. | N/A |
| Open WelcomeBack ceremony (post-absence) | N/A — fires for logged-in users returning after absence threshold. | Renders heading with new gradient text. | N/A |
| Open GettingStartedCelebration | N/A — fires when user completes Getting Started checklist (logged-in only). | Renders ceremony heading with new gradient text. | N/A |

**Auth-related regression watchout:** the `useFaithPoints.recordActivity` no-op for logged-out users (per `02-security.md`) and the `wr_auth_simulated` legacy fallback path (per 11-local-storage-keys.md) are upstream of any change in this spec — verify they're unaffected by reading test output for the AuthContext / activity-engine tests post-migration.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All 8 widgets render in the single-column DashboardWidgetGrid layout (existing behavior from 4A). FrostedCard chrome is viewport-independent. Tonal icons render at the same size as their pre-migration counterparts (class-string-only application). The QuickActions tiles render in a 2-column grid on mobile (`grid-cols-2`) — verify during execution that the existing layout uses this convention. The hover lift treatment (`hover:-translate-y-0.5`) is a no-op on touch devices but the underlying CSS transition fires on `:active` state — touch-tap reads as a brief lift. The InstallCard ordering refactor preserves the card's grid-end position at every viewport (CSS `order` works identically across breakpoints). The WeeklyRecap empty-state copy renders cleanly at narrow widths (heading, description, CTA each on their own line). The ceremony heading gradient text pattern renders at the size cascade documented per file (`text-3xl sm:text-4xl md:text-5xl` for GettingStartedCelebration, `text-3xl sm:text-4xl` and `text-2xl sm:text-3xl` for WelcomeWizard's two headings, `text-4xl sm:text-5xl` for WelcomeBack). Modal viewports on small screens show the gradient at its smallest size; verify legibility (lavender gradient on a dark modal backdrop should retain 4.5:1 contrast — see Non-Functional Requirements). |
| Tablet (640–1024px) | DashboardWidgetGrid switches to 2-column layout (existing behavior from 4A). All 8 widgets render with the same tonal icon application. QuickActions tiles likely stay 2-column at this breakpoint (verify); they bump to 4-column on desktop. The MilestoneFeed inside FriendsPreview has more horizontal room — relative timestamps no longer wrap awkwardly. WeeklyRecap's 4 stat rows render full-width with each stat's tonal icon visible in line. The InstallCard at grid-end has a wider canvas to render its CTA button. |
| Desktop (≥ 1024px) | DashboardWidgetGrid switches to 3-column layout (existing behavior). FrostedCard hover treatments (`hover:-translate-y-0.5`, `shadow-frosted-hover`) become meaningful with cursor input. The Tonal Icon Pattern's "color carries function, not decoration" reads strongest at desktop because the user can scan the full grid at a glance — the mint Users on Friends, the lavender BarChart on WeeklyRecap, the four-color QuickActions row, the gold Sparkles on Anniversary and WeeklyGodMoments and EchoCard, the violet Moon on EveningReflectionBanner, the cyan Download on InstallCard all read as visual signposting across the layout. The QuickActions tiles render in a 4-column grid at this breakpoint; the hover lift on each tile becomes meaningful with mouse input. |

**Responsive notes specific to QuickActions tiles (Change 4):** the 4-column-on-desktop / 2-column-on-mobile collapse must work cleanly at the 640px breakpoint boundary. Verify each tile maintains a minimum touch target of 44×44 (per WCAG 2.5.5 enhanced and `04-frontend-standards.md` 44px touch target rule). At mobile, the smaller-screen 2-column grid means each tile is roughly half the viewport width — well above the 44px floor. At desktop, each tile is roughly a quarter of the viewport width minus gaps — also above the floor.

**Responsive notes specific to ceremony headings (Change 9):** the gradient text at `text-3xl sm:text-4xl md:text-5xl` (GettingStartedCelebration) renders cleanly at every breakpoint. On the smallest viewports (~320px width), the heading might wrap to two lines — verify wrapping behavior and ensure both lines render the gradient consistently (CSS `bg-clip-text` works on multi-line text but some browsers historically had quirks). If wrapping looks awkward, consider an explicit `text-balance` or layout adjustment — but only if the rendered output is broken; do NOT pre-emptively add wrapping logic.

## AI Safety Considerations

N/A — This spec is a visual + minor-copy migration. It does NOT introduce new AI-generated content, new free-text input surfaces, or new crisis-detection touchpoints. The WeeklyRecap copy rewrite is a static-copy change (heading, description, CTA strings); no AI involvement. The ceremony heading typography migration is a class-string change; no copy or content changes there. The QuickActions tiles route to existing flows (Pray, Journal, Meditate, Music); auth and AI behavior on those destinations is governed by their existing specs and `01-ai-safety.md` policies. Existing crisis-detection wiring on GratitudeWidget (out of scope here per Spec 4B) remains authoritative for that surface.

## Auth & Persistence

- **Logged-out users:** Visiting `/` renders the landing page (`Home`), not Dashboard. Logged-out users never see FriendsPreview, WeeklyRecap, WeeklyGodMoments, AnniversaryCard, EveningReflectionBanner, EchoCard, or the GettingStartedCelebration / WelcomeWizard / WelcomeBack ceremonies. They MAY see InstallCard if it's promoted to a logged-out surface elsewhere (PWA install is auth-independent per Bible Wave auth posture in `02-security.md`); on Dashboard, InstallCard is auth-gated by Dashboard itself. They may interact with QuickActions tiles if QuickActions is also rendered on a logged-out surface (verify during execution; if so, tile clicks route to the destination's logged-out experience). No persistence changes.
- **Logged-in users:** All persistence behavior is preserved verbatim. Specifically:
  - FriendsPreview reads from `wr_friends`, `wr_milestone_feed`, `wr_leaderboard_global` (no changes).
  - WeeklyRecap reads from `wr_friends`, `wr_daily_activities`, `wr_meditation_history`, `wr_journal_milestones`, plus listening history (no changes — the spec only changes the empty-state copy strings and the stat-row icon class strings; data shape is untouched).
  - WeeklyGodMoments reads from various activity sources (no changes).
  - QuickActions has no persistence — it's pure navigation (no changes).
  - AnniversaryCard reads from user join-date and `wr_anniversary_milestones_shown` (no changes).
  - EveningReflectionBanner reads from `wr_evening_reflection` and current time (no changes).
  - InstallCard reads from `wr_install_dismissed`, `wr_install_dashboard_shown`, `wr_visit_count`, `wr_session_counted`, plus PWA install prompt availability (no changes).
  - EchoCard reads from session-scoped echo state inside `useEcho()` hook (per `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes" — echo dismissals are session-scoped, not persisted) (no changes).
  - GettingStartedCelebration, WelcomeWizard, WelcomeBack each have their own render conditions (`wr_first_run_completed`, `wr_welcome_back_shown`, `wr_getting_started_complete`); ceremony heading typography migration does not touch any of these (no changes).
- **localStorage usage:** No new keys. No key shape changes. No key migrations. Reference `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md` for the canonical inventory; this spec touches none of them at the storage layer.
- **Reactive store discipline:** EchoCard consumes session-scoped echo state via the existing `useEcho()` hook pattern (NOT a reactive store per `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes" — echo dismissals were intentionally implemented as session-scoped state, not a reactive store). This spec does NOT modify that wiring. If during the EchoCard double-nest resolution any change to its render structure inadvertently breaks the `useEcho()` hook consumption, it's a regression — restore the existing pattern.

## Completion & Navigation

N/A — Dashboard is not part of the Daily Hub completion flow. No completion signals are emitted by this spec's changes. The existing per-widget completion / navigation flows are preserved verbatim:

- WeeklyRecap dismiss writes to whatever current dismiss-tracking key exists (likely `wr_weekly_summary_dismissed` per `11-local-storage-keys.md`).
- QuickActions tile click navigates to the destination tab/page (preserved).
- AnniversaryCard dismiss / acknowledge writes to `wr_anniversary_milestones_shown`.
- EveningReflectionBanner "Reflect Now" routes to evening-reflection flow (preserved).
- InstallCard "Install" triggers browser PWA prompt; "Dismiss" writes to `wr_install_dismissed`.
- EchoCard click navigates to source content; dismissals stay session-scoped per BB-46.
- Ceremony overlays (GettingStartedCelebration, WelcomeWizard, WelcomeBack) each have their own completion flows that are preserved verbatim — this spec only changes a heading className.

## Design Notes

- **Locked decisions reference.** All structural choices in this spec follow the locked decisions in `_plans/direction/dashboard-2026-05-04.md`. Specifically: Decision 8 (WeeklyRecap empty-state copy rewrite — relational framing), Decision 9 (leaderboard medal colors + WeeklyRecap filled-state contributed-percentage line preserved), Decision 11 (Tonal Icon Pattern continuation — the social/recap/utility widgets in 4C scope each adopt their tonal color per the per-widget assignment table; this spec is the back-half of the system-wide debut started in 4B), Decision 12 (InstallCard first-class widget promotion via explicit `INSTALL_CARD_ORDER` constant in `widget-order.ts`), Decision 13 (Caveat `font-script` → gradient text migration in three ceremony heading files). Decisions 4 (Getting Started accent — already shipped via post-4A patch), 5 (`bg-primary` → subtle — already shipped in 4A), 6 (`text-primary` → `text-white/80` — already shipped in 4A), 7 (Lora italic preserved for scripture only — applied to AnniversaryCard closing message migration here), 10 (MoodChart ghosted empty state — out of 4C scope, preserved by 4B) are honored as preservation, not re-application. Decisions 1, 2, 3, 14, 15 are not in 4C scope.
- **Recon reference.** Pre-state details (current icon imports, current chrome tokens, current copy strings, current Caveat usages, current `style={{ order: 9999 }}` location) live in `_plans/recon/dashboard-2026-05-04.md` and the widget source files themselves. Read the recon during planning to enumerate exact files and line numbers.
- **System patterns this spec USES (already shipped, do not modify):** FrostedCard `default` and `accent` variants (and `subdued` if it exists; verify). Multi-bloom BackgroundCanvas. `<Button variant="subtle">` and `<Button variant="ghost">`. The page-rhythm-tightening discipline applied in 4A. The Tonal Icon Pattern (debuted in 4B; this spec is the back-half application). The post-4A inline link migration (`text-white/80 hover:text-white`).
- **System patterns this spec MODIFIES:** None. This spec consumes existing patterns and applies them per-widget.
- **System patterns this spec INTRODUCES:** The **gradient text pattern for ceremony headings** (Decision 13). This is a small typography addition, NOT a new pattern category — it's documented inline in this spec. The pattern is `bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent` plus appropriate weight (`font-bold`) and size cascade per heading. After Spec 4C ships, this pattern can be referenced for any future ceremony heading work — it lives inline in the three migrated files for now; if it gets applied broadly, a `<CeremonyHeading>` component could extract it (out of scope here).
- **Visual reference for matching.** When migrating the QuickActions tile chrome, the visual target is whatever `<FrostedCard variant="subdued">` renders (or, if subdued doesn't exist, the manually-applied `bg-white/[0.05] border border-white/[0.10] rounded-3xl p-5` token set). Read the FrostedCard component during execution to verify variant availability. When migrating the ceremony headings, the visual target is the gradient text style — open the migrated headings in a browser at execution time and verify the gradient renders smoothly (no banding, no clipped text, full readability against the modal backdrop).
- **Anti-pressure voice continuity.** Decision 8 is itself an anti-pressure-voice protection: "Faith grows stronger together" / "Your weekly journey, walked alongside friends" / "Find people you walk with →" reads as relational invitation, not transactional pressure to "unlock" content. Decision 9 preserves the celebratory "You contributed N%" line because, in the FILLED state with friends present, the celebration is earned and warm, not pressured. The two decisions together honor the anti-pressure voice: empty state invites without pressuring; filled state celebrates without flexing.
- **Tier 1/Tier 2 hierarchy maintained.** Spec 4A established the FrostedCard chrome family. Spec 4B added the Tonal Icon Pattern as metadata inside the family. Spec 4C completes the application across the social/recap/utility half. After 4C, the Dashboard reads as a single coherent system: chrome unified, icons signal category, ceremony headings unified in typography, ordering rules explicit. The pattern application discipline ("only the icon carries tonal color, everything else stays in-system") holds across all 8 widgets in scope here, with the locked exception of leaderboard medal colors (Decision 9) and the WeeklyRecap "You contributed N%" emphasis (white-weight, not gradient).

## Out of Scope

**Already shipped in Spec 4A (preserved here, not re-applied):**

- BackgroundCanvas wrap on `<main>`.
- DashboardCard primitive migration to `<FrostedCard variant="default">`.
- DashboardHero migration.
- GrowthGarden double-mount fix.
- CustomizePanel chrome alignment.
- Liturgical greeting recency window (Decision 15).
- All `bg-primary` solid → subtle Button migrations in 4A scope (EveningReflectionBanner Reflect Now, GratitudeWidget Save, PrayerListWidget Add Prayer, InstallCard Install, CustomizePanel buttons, MoodCheckIn submit, etc.).
- All `text-primary` ghost link → `text-white/80` migrations in 4A scope.

**Already shipped in post-4A patch (preserved here, not re-applied):**

- GettingStartedCard promotion to `<FrostedCard variant="accent">`.

**Already shipped in Spec 4B (preserved here, not re-applied):**

- Tonal Icon Pattern application across all 11 data widgets (StreakCard, MoodChart, ActivityChecklist, TodaysDevotionalCard, VerseOfTheDayCard, ReadingPlanWidget, PrayerListWidget, RecentHighlightsWidget, GratitudeWidget, ChallengeWidget, BadgeGrid).
- StreakCard badge pill class migration from inline `style.backgroundColor` to `bg-violet-500/20 hover:bg-violet-500/30`.
- StreakCard FP progress bar direction-aware glow preservation.
- StreakCard "Restore Streak" amber emergency button preservation.
- MoodChart empty state preservation (Decision 10).
- MoodChart MoodTooltip alignment with FrostedCard tooltip pattern.
- MoodChart morning line stroke `#8B5CF6` preservation.
- ActivityChecklist progress ring stroke decision (Tailwind token vs. hardcoded).
- VerseOfTheDayCard scripture italic preservation (Decision 7).
- ReadingPlanWidget discovery mini-cards' user-selected theme colors preservation.
- RecentHighlightsWidget user-selected highlight color dots preservation.
- GratitudeWidget violet-glow textarea pattern migration.
- ChallengeWidget themeColor accent preservation.

**Already shipped in post-4B patches (preserved here, not re-applied):**

- StreakCard header Flame conditional rendering (amber when streak active, white/30 when inactive).
- PrayerListWidget Heart icon shade lock at `text-fuchsia-300`.

**Deferred to Spec 4D (modal/overlay sweep — not yet scheduled):**

- WelcomeWizard interior content (only the two ceremony headings touched in 4C — input fields, step indicators, navigation buttons, body content, validation, transitions stay UNCHANGED).
- WelcomeBack interior content (only the ceremony heading touched in 4C — the rest of the modal interior stays UNCHANGED).
- GettingStartedCelebration body content (only the ceremony heading touched in 4C — the rest of the celebration body stays UNCHANGED).
- EveningReflection 4-step modal (the Reflect Now button on `EveningReflectionBanner` is in 4C scope; the modal it opens is 4D).
- ChallengeCompletionOverlay.
- CelebrationQueue + per-celebration overlays.
- MoodCheckIn modal.
- MoodRecommendations modal.
- SharePanel modal.
- CrisisBanner visual treatment.

**Locked exceptions (NEVER changed):**

- FriendsPreview leaderboard medal colors (#1 amber-400, #2 silver-ish, #3 bronze-ish — Decision 9).
- WeeklyRecap filled-state copy ("Last week, your friend group:" / 4 stat lines / "You contributed N%" — Decision 9).
- WeeklyRecap empty-state CTA destination (only the link TEXT migrates per Decision 8; the routing target stays whatever it currently is).
- AnniversaryCard celebratory copy ("X year(s) on Worship Room!" — only the styling of the Lora italic closing message migrates per Decision 7).
- EveningReflectionBanner conditional rendering threshold (evening-hours gating preserved verbatim).
- EveningReflectionBanner copy (preserved unless reads stale on new chrome — copy changes are out of 4C scope).
- InstallCard PWA-availability gating logic (only the magic number → constant refactor is in scope; the gating is preserved).
- EchoCard's `useEcho()` hook consumption pattern (session-scoped echo state, NOT a reactive store).
- WelcomeWizard / WelcomeBack / GettingStartedCelebration interior content beyond the heading className changes.
- GrowthGarden palette (Decision 2 — illustration, not iconography; not in this spec's scope at all).

**Out of rollout entirely (not Spec 4 anything):**

- Per-widget functional changes (data fetching, hooks, state management) — visual + minor-copy only.
- Anti-pressure copy review on widgets in 4C scope beyond WeeklyRecap empty state (FriendsPreview empty state stays per Decision 8 business-goal protection; other copy untouched).
- Performance optimization on Dashboard (separate post-migration spec — recon flagged re-render cascades from non-memoized prop objects).
- API/backend changes (none required).
- Tonal Icon Pattern documentation in `09-design-system.md` (deferred until after 4C ships).
- Caveat font removal from Tailwind config (deferred follow-up after this spec migrates the four user-visible usages).
- Gradient text pattern extraction into `<CeremonyHeading>` component (premature abstraction; lives inline in three files for now).
- PrayerWall migration (Forums project Phase 5).
- Bible reader chrome (Spec 8).
- AskPage (Spec 9).
- Settings/Insights cluster (Spec 10).
- Music feature (Spec 11).
- Site chrome — Navbar, SiteFooter, SongPickSection (Spec 12).
- Homepage (Spec 13).

## Acceptance Criteria

### Tonal Icon Pattern application

- [ ] FriendsPreview Users icon renders as `text-emerald-300` (mint).
- [ ] WeeklyRecap header BarChart3 (or current glyph) renders as `text-violet-300` (lavender).
- [ ] WeeklyRecap stat-row icons render with their distinct tonal colors: BookOpen `text-pink-300`, ListChecks `text-emerald-300`, FileEdit `text-violet-300`, Music `text-cyan-300`.
- [ ] WeeklyGodMoments Sparkles icon renders as `text-amber-300` (warm gold).
- [ ] QuickActions Pray tile Heart icon renders as `text-pink-300`.
- [ ] QuickActions Journal tile BookOpen icon renders as `text-sky-300`.
- [ ] QuickActions Meditate tile Brain icon renders as `text-violet-300`.
- [ ] QuickActions Music tile Music icon renders as `text-cyan-300`.
- [ ] AnniversaryCard Sparkles icon renders as `text-amber-300`.
- [ ] EveningReflectionBanner Moon icon renders as `text-violet-300`.
- [ ] InstallCard Download icon renders as `text-cyan-300`.
- [ ] EchoCard Sparkles icon renders as `text-amber-300`.
- [ ] Final per-widget token selections are documented inline in the implementation plan (the spec lists token defaults; the plan locks final shades chosen during execution).
- [ ] Tonal colors are muted/pastel — no fully-saturated jewel-tone icons appear post-migration.
- [ ] Icon glyphs are NOT swapped — only colors are applied. Existing glyph imports preserved.

### FriendsPreview

- [ ] Users header icon migrated to mint (`text-emerald-300`).
- [ ] Leaderboard top-3 medal colors PRESERVED (#1 amber-400, #2 silver-ish, #3 bronze-ish — Decision 9).
- [ ] "You · #11 · 0 pts" caption row aligned with FrostedCard caption tokens (`text-white/60` or hierarchy with rank slightly more prominent).
- [ ] MilestoneFeed avatar circles preserved.
- [ ] MilestoneFeed activity line uses default body tone (`text-white/80`).
- [ ] MilestoneFeed timestamp uses citation tone (`text-white/50`).
- [ ] Empty state "CircleNetwork" inviting illustration + copy PRESERVED (Decision 8 business-goal protection).
- [ ] "See all" link verified `text-white/80 hover:text-white` (post-4A intact).

### WeeklyRecap

- [ ] BarChart3 header icon migrated to lavender (`text-violet-300`).
- [ ] 4 stat-row icons migrated per the table.
- [ ] Empty-state heading reads "Faith grows stronger together".
- [ ] Empty-state description reads "Your weekly journey, walked alongside friends".
- [ ] Empty-state CTA reads "Find people you walk with →".
- [ ] Empty-state CTA destination preserved (no routing change; only text).
- [ ] Filled state preserves "Last week, your friend group:" intro line.
- [ ] Filled state preserves 4 stat lines (Prayed / Completed / Journaled / Hours).
- [ ] Filled state preserves "You contributed N% of the group's growth!" line (Decision 9).
- [ ] "You contributed N%" line emphasized via `text-white` weight, NOT migrated to gradient text (gradient is reserved for ceremony headings only per Decision 13).
- [ ] Dismiss "X" rendered as `<Button variant="ghost" size="sm">` (or matches post-4A icon-button convention).

### WeeklyGodMoments

- [ ] Sparkles header icon migrated to warm gold (`text-amber-300`).
- [ ] Banner-style chrome consumed from DashboardCard (no custom wrapper drift).
- [ ] "Moment" entries' typography aligned with body content tone (`text-white/80`).
- [ ] "View all" link (if present) verified `text-white/80 hover:text-white`.

### QuickActions

- [ ] All 4 tiles render with distinct tonal icons per the table.
- [ ] Each tile's chrome uses `<FrostedCard variant="subdued">` if available, OR equivalent styled wrapper with subdued tokens (`bg-white/[0.05] border border-white/[0.10] rounded-3xl p-5` or matching). Decision documented inline.
- [ ] Tile labels use simple typography (`text-white text-sm font-medium` or matching).
- [ ] Hover treatment lifts each tile slightly (`motion-safe:hover:-translate-y-0.5` or equivalent) with `hover:bg-white/[0.08]` brightness boost.
- [ ] Each tile preserves its existing click handler / Link href / navigation prop.
- [ ] Pray tile routes to `/daily?tab=pray`.
- [ ] Journal tile routes to `/daily?tab=journal`.
- [ ] Meditate tile routes to `/daily?tab=meditate`.
- [ ] Music tile routes to `/music`.
- [ ] Grid responsive behavior: 4-column desktop, 2-column mobile (verified at 375px and 1280px).
- [ ] Each tile maintains 44×44 minimum touch target at every breakpoint.
- [ ] Icons receive `aria-hidden="true"`; tile label provides accessible name.
- [ ] Keyboard activation works (Enter/Space if `<button>`, native if `<Link>`/`<a>`).

### AnniversaryCard

- [ ] Sparkles header icon migrated to gold (`text-amber-300`).
- [ ] Card chrome PRESERVED as `<FrostedCard variant="default">` (NOT migrated to accent — Decision 4 implicit-rule preserved).
- [ ] Closing message migrated from Lora italic to non-italic (Decision 7) — `italic` class removed from the message element.
- [ ] Celebratory copy ("X year(s) on Worship Room!" or current variant) PRESERVED verbatim.

### EveningReflectionBanner

- [ ] Moon header icon migrated to lavender (`text-violet-300`).
- [ ] "Reflect Now" button verified `<Button variant="subtle">` (post-4A intact).
- [ ] Banner card chrome consumed from DashboardCard.
- [ ] Conditional rendering (evening-hours gating) PRESERVED verbatim.
- [ ] Copy preserved (no copy changes).

### InstallCard (first-class widget promotion)

- [ ] Download icon migrated to cyan (`text-cyan-300`).
- [ ] `INSTALL_CARD_ORDER` constant added to `frontend/src/constants/dashboard/widget-order.ts` with documenting comment.
- [ ] `DashboardWidgetGrid.tsx:359` updated to consume `INSTALL_CARD_ORDER` constant via `style={{ order: INSTALL_CARD_ORDER }}` in place of magic `9999`.
- [ ] InstallCard renders LAST in Dashboard grid at all viewports (no functional regression — manually verified by viewing `/`).
- [ ] InstallCard does NOT take a new `order` prop (Option B locked — ordering stays at consumer site).
- [ ] PWA install conditional rendering preserved (card only shows if PWA install prompt available + dismissal flags allow).
- [ ] CTA button verified `<Button variant="subtle">` (post-4A intact).
- [ ] Existing widget-order tests continue to pass; new test covers `INSTALL_CARD_ORDER` constant value if appropriate.

### EchoCard

- [ ] Sparkles header icon migrated to warm gold (`text-amber-300`).
- [ ] Path verified at `frontend/src/components/echoes/EchoCard.tsx` (NOT `frontend/src/components/dashboard/EchoCard.tsx`).
- [ ] Double-FrostedCard nesting detected and resolved per the resolution decision tree in Change 8. Resolution choice documented inline.
- [ ] EchoCard renders inside exactly ONE FrostedCard surface on Dashboard (single source of frosted-glass chrome).
- [ ] Cross-surface usage (e.g., `/bible/my`) verified intact post-resolution.
- [ ] `useEcho()` hook consumption pattern PRESERVED (session-scoped echo state, not migrated to reactive store).

### Ceremony heading typography (Caveat → gradient)

- [ ] `frontend/src/components/dashboard/GettingStartedCelebration.tsx:77` ceremony heading migrated from `font-script` to gradient text pattern (`bg-gradient-to-br from-violet-300 to-violet-200 bg-clip-text text-transparent` + `font-bold` + size cascade preserved).
- [ ] `frontend/src/components/dashboard/WelcomeWizard.tsx:329` ceremony heading migrated.
- [ ] `frontend/src/components/dashboard/WelcomeWizard.tsx:517` ceremony heading migrated.
- [ ] `frontend/src/components/dashboard/WelcomeBack.tsx:134` ceremony heading migrated (via `cn(...)` invocation; `fadeIn` class preserved).
- [ ] WelcomeWizard interior (input fields, step indicators, navigation, body content) UNCHANGED beyond heading className.
- [ ] WelcomeBack interior UNCHANGED beyond heading className.
- [ ] GettingStartedCelebration body content UNCHANGED beyond heading className.
- [ ] Heading text content preserved verbatim across all four migrations.
- [ ] No `font-script` Caveat usages remain in the four migrated files post-execution (verified via grep).
- [ ] Gradient text contrast verified at WCAG-AA 4.5:1 against the modal backdrop at every breakpoint where the heading renders. If contrast fails, fallback gradient (`from-violet-400 to-violet-300`) applied and documented.

### Quality gates

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes — every test that asserted behavior continues to pass; tests that asserted on specific old class names (`font-script`, `style.order` magic, header icon class strings on the 8 widgets, WeeklyRecap empty-state copy strings) updated to new tokens / new copy. Net regression count is 0 net of the 11 pre-existing tech-debt failures.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] Test baseline preserved: post-4B-final pass count + any new tests added in 4C. Any new failure documented with rationale.

### Visual eyeball checks on `/`

- [ ] All 8 widgets show their tonal icons (mint Users on Friends, lavender BarChart on WeeklyRecap, gold Sparkles on WeeklyGodMoments / Anniversary / EchoCard, four-color row on QuickActions, violet Moon on EveningReflectionBanner, cyan Download on InstallCard).
- [ ] QuickActions tiles each look distinct (no two same-colored — Pray pink, Journal sky-blue, Meditate violet, Music cyan).
- [ ] Hover on QuickActions tiles produces visible lift on desktop with mouse input.
- [ ] WeeklyRecap empty state shows new copy ("Faith grows stronger together" / "Your weekly journey, walked alongside friends" / "Find people you walk with →").
- [ ] InstallCard sits last in Dashboard grid at desktop, tablet, and mobile viewports.
- [ ] AnniversaryCard closing message renders non-italic (no Lora italic styling visible on the celebratory prose).
- [ ] No `font-script` Caveat anywhere on the page (run grep post-migration to confirm zero usages in `frontend/src/components/dashboard/` and `frontend/src/components/ui/`).
- [ ] Cards still feel like family — the violet-system FrostedCard chrome is consistent across all 8 widgets in 4C scope plus the 11 widgets in 4B scope plus the foundation chrome in 4A scope.
- [ ] The page reads more scannable post-4C than post-4B (color signals category fully across the grid).
- [ ] Hover states on FrostedCards still work (`-translate-y-0.5`, surface brightens, shadow upgrades — inherited from 4A, verified intact post-4C).
- [ ] BadgeGrid (Spec 4B scope) opens, displays badges by section, scrolls cleanly, closes — focus management correct (regression verification).

### Regression checks (cross-surface)

- [ ] DailyHub tabs (`/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`) render unchanged.
- [ ] BibleLanding (`/bible`) renders unchanged.
- [ ] `/bible/plans` renders unchanged.
- [ ] `/music` renders unchanged (Music QuickAction tile destination — verify navigation works).
- [ ] PrayerWall (`/prayer-wall`) renders unchanged.
- [ ] All 11 widgets in 4B scope render UNCHANGED on `/` post-4C (no drift introduced by 4C).
- [ ] All foundation pieces in 4A scope render UNCHANGED on `/` post-4C.
- [ ] Modal/overlay components NOT in 4C scope (EveningReflection 4-step modal, ChallengeCompletionOverlay, CelebrationQueue, SharePanel, CrisisBanner, MoodCheckIn, MoodRecommendations) render UNCHANGED.
- [ ] Modal/overlay components in 4C scope (WelcomeWizard, WelcomeBack, GettingStartedCelebration) render UNCHANGED beyond the heading className migration — interior contents identical pre/post.
- [ ] EchoCard cross-surface usage (`/bible/my` if applicable) renders correctly post double-nest resolution.

### Lighthouse + accessibility

- [ ] Lighthouse Performance ≥ 90 on `/`.
- [ ] Lighthouse Accessibility ≥ 95 on `/`.
- [ ] No new axe-core violations introduced by the migration.
- [ ] All migrated icons receive `aria-hidden="true"` if purely decorative; interactive elements (QuickActions tiles, InstallCard CTA, EveningReflectionBanner Reflect Now, AnniversaryCard, etc.) preserve accessible name and keyboard activation.
- [ ] Keyboard navigation through all 8 widgets and the 4 ceremony headings (when overlays render) works as before.
- [ ] Gradient text contrast verified ≥ 4.5:1 against modal backdrop on all 4 ceremony headings.

### Definition of done

- [ ] All 9 changes implemented per the spec (FriendsPreview, WeeklyRecap copy + icons, WeeklyGodMoments, QuickActions tiles, AnniversaryCard, EveningReflectionBanner, InstallCard ordering refactor, EchoCard double-nest resolution, ceremony heading typography migration in three files / four headings).
- [ ] All acceptance criteria checked.
- [ ] Test baseline preserved or net-positive (excluding the 11 pre-existing tech-debt failures).
- [ ] No new localStorage keys (verified against `11-local-storage-keys.md` and `11b-local-storage-keys-bible.md`).
- [ ] No new animation tokens hardcoded (verified against `frontend/src/constants/animation.ts` — QuickActions hover transition uses Tailwind `transition-all duration-200` default or constants-file token, never an inline `cubic-bezier(...)` string).
- [ ] Implementation plan documents the per-widget tonal token selection (final shade chosen during execution), the QuickActions chrome decision (FrostedCard subdued variant vs. styled wrapper fallback), the EchoCard double-nest resolution choice (4 paths in the resolution decision tree), the WelcomeWizard dead-code surfacing decision (if either of the two `font-script` headings is dead code), and any contrast fallback applied to the ceremony heading gradient if the lavender gradient drops below 4.5:1.
- [ ] Master plan acceptance criteria (Decision 8 WeeklyRecap copy rewrite, Decision 9 leaderboard + filled-state preservation, Decision 11 Tonal Icon Pattern continuation, Decision 12 InstallCard widget-order constant, Decision 13 Caveat → gradient migration) are checked off.
- [ ] Caveat font dependency cleanup surfaced as a follow-up (the spec migrates the four user-visible usages; removing Caveat from Tailwind config and font imports is a separate spec).
- [ ] Tonal Icon Pattern documentation in `09-design-system.md` queued as the next task post-4C ship.
- [ ] Dashboard migration is COMPLETE — no further sub-spec needed for Dashboard chrome / widgets / ordering / typography. Spec 4D (modal/overlay sweep) remains deferred.
- [ ] No commits, no branch creation, no push — user manages all git operations manually.
