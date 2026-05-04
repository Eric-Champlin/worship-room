# Dashboard Migration — Direction Document

**Created:** 2026-05-04
**Status:** Locked decisions for Spec 4A, 4B, 4C
**Branch:** forums-wave-continued
**Save location:** `_plans/direction/dashboard-2026-05-04.md`

This is a decision document, not a spec. It captures the locked design
decisions for the Dashboard visual migration. All three Dashboard sub-
specs (4A foundation, 4B data widgets, 4C social/recap/tiles) reference
this document. Decisions here are LOCKED — changes require explicit
revision of this document, not ad-hoc per-spec adjustment.

## Context

Dashboard is the largest single surface in the rollout. Recon at
`_plans/recon/dashboard-2026-05-04.md` (879 lines) catalogued ~6,000
LOC of source + ~11,000 LOC of tests across 56 test files, 16
widgets, 41 localStorage keys, 25+ hooks. Dashboard has zero
FrostedCard usage today — every card rolls its own
`bg-white/5 border-white/10 rounded-2xl backdrop-blur-sm` chrome.

This document locks structural and pattern decisions before specs
begin so the three sub-specs land coherently.

## Locked decisions

### Structural

**1. Atmospheric layer.** Add multi-bloom BackgroundCanvas to
Dashboard, matching the rest of the system. Rationale: visual
consistency with DailyHub, BibleLanding, /bible/plans. Dashboard
becomes part of the same atmospheric family.

**2. GrowthGarden palette.** Keep earth-tone palette (browns, leaves,
sky) as a documented exception. Rationale: the garden is the brand's
signature visual. Restyling to violet would erase the metaphor's
visual logic (real plants are green, not violet). The Tonal Icon
Pattern (below) does NOT apply to GrowthGarden — the garden is
illustration, not iconography.

**3. No gradient showstopper on Dashboard.** Dashboard is an overview
surface. Multiple actions are roughly co-equal in importance. Making
any one of them gradient would erode the showstopper hierarchy
elsewhere. Glass (subtle) Buttons are the default for all primary
actions. Gradient stays reserved for true emotional peaks (e.g.,
"Help Me Pray" on Pray, "Save Entry" on Journal).

**4. Two checklists stay distinct, both migrate.** Getting Started
becomes `<FrostedCard variant="accent">` (one-time onboarding,
celebratory). Today's Activity becomes `<FrostedCard variant="default">`
(daily-reset utility). Different visual weight matches different
purposes. They share the FrostedCard system without sharing a single
component.

### Pattern decisions

**5. All `bg-primary` solid buttons migrate to subtle Button.**
~10+ instances across the page (EveningReflectionBanner Reflect Now,
GratitudeWidget Save, PrayerListWidget Add Prayer, InstallCard
Install, CustomizePanel buttons, etc.). All become subtle. No
exceptions on Dashboard.

**6. All `text-primary` ghost links migrate to `text-white/80`.**
Pervasive across widgets. The ghost Button variant change shipped in
the iteration spec (`text-primary` → `text-white/80`); this picks up
the same change for inline links. Affected: DashboardCard action
links, MoodChart "Check in now," ReadingPlanWidget links,
RecentHighlightsWidget links, PrayerListWidget link, TodaysDevotional
links, VerseOfTheDay link, FriendsPreview links, WeeklyRecap links,
StreakCard "View all badges," GettingStartedCard Go buttons.

**7. Lora italic prose preserved for scripture only; non-italic
everywhere else.** VerseOfTheDayCard verse text stays italic
(scripture is the canonical Lora italic case). AnniversaryCard
closing message and StreakCard repair message migrate to non-italic
(currently use Lora italic; not scripture).

### Anti-pressure and copy

**8. WeeklyRecap empty state stays visible BUT copy rewrites for
healthier framing.**

- Current copy: "Add friends to see your weekly recap"
  (transactional — "unlock the feature")
- New copy: "Faith grows stronger together" (heading) + "Find people
  you walk with →" (CTA link)
- Same business goal (encourage adding friends), healthier framing.

**9. Leaderboard preserved as-is.** Medal-color #1/#2/#3 treatment
stays. "You contributed N% of the group's growth!" stays. User
confirmed.

**10. MoodChart ghosted empty state preserved.** Inviting "your mood
journey starts today" with ghosted dummy chart stays. NOT migrated to
FeatureEmptyState.

### New visual pattern: Tonal Icon Pattern

**11. Categorical icons within FrostedCard chrome carry desaturated
tonal colors.**

The pattern:

- Card chrome stays in violet/glass system (white text, white/violet
  borders, frosted backgrounds)
- Icon container is a small rounded square at `bg-white/[0.05]` —
  quiet, in-system
- The icon itself carries a tonal color that signals category
- Colors are muted/pastel, never fully saturated
- The icon is the ONLY colored element in the card; everything else
  stays in violet/glass system

Why this works:

- Color carries function, not decoration (each color signals category)
- The container stays in-system (the colored icon sits inside a
  violet-system FrostedCard, looks like family not outlier)
- Restraint preserved (soft tones, not aggressive)
- Tier 1/Tier 2 hierarchy still reads (card is visual unit; icon is
  metadata inside the unit)
- Reintroduces scannability without breaking the system

Specific tonal color assignments for Dashboard:

| Widget                | Icon                             | Tonal color                              | Rationale                                 |
| --------------------- | -------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Today's Gratitude     | Heart                            | Soft rose/pink                           | Gratitude/care                            |
| Today's Devotional    | BookOpen                         | Muted blue                               | Study/scripture                           |
| Verse of the Day      | BookOpen                         | Warm cream/parchment                     | Scripture differentiation from devotional |
| 7-Day Mood            | Activity/heart-pulse             | Lavender                                 | Introspection/feeling                     |
| Streak & Faith Points | Flame                            | Amber when active, white/30 inactive     | Warm/burning (preserved current behavior) |
| Today's Activity      | CheckCircle                      | Mint/green                               | Growth/completion                         |
| Quick Actions tiles   | Heart / BookOpen / Brain / Music | Pink / blue / lavender / teal            | Match destination tab tonal               |
| My Prayers            | Heart                            | Pink-violet (cooler than gratitude rose) | Prayer differentiation from gratitude     |
| Friends & Leaderboard | Users                            | Mint/green                               | Community/together                        |
| Weekly Recap          | BarChart                         | Lavender                                 | Reflection/looking back                   |
| Getting Started       | Rocket                           | Amber/yellow                             | Energy/start                              |
| Anniversary           | Sparkles                         | Gold                                     | Celebration                               |
| Evening Reflection    | Moon                             | Deep lavender                            | Rest/end-of-day                           |
| Echo card             | Sparkles                         | Soft gold                                | Discovery/recall                          |
| Weekly God Moments    | Sparkles                         | Soft gold                                | Discovery/recall                          |
| Reading Plan          | BookOpen                         | Muted blue                               | Match Devotional family                   |
| Recent Highlights     | Bookmark/StickyNote              | Warm yellow                              | Note/highlight metaphor                   |
| Challenge             | Flame                            | Amber                                    | Challenge/effort                          |
| Install Card          | Download                         | Teal                                     | Action/install                            |

Color forms a coherent system: warm tones (amber, rose, gold, yellow)
for active/celebratory; cool tones (blue, mint, lavender, teal) for
contemplative/reflective.

Specific Tailwind tokens to use:

- Pink/rose: `text-pink-300` or `text-rose-300` (final selection
  during 4B execution)
- Blue (study): `text-sky-300` or `text-blue-300`
- Cream/parchment: `text-amber-100` or `text-yellow-200`
- Lavender: `text-violet-300` (shares family with system violet)
- Amber: `text-amber-400` (existing flame color)
- Mint: `text-emerald-300` or `text-teal-300`
- Gold: `text-amber-300` or `text-yellow-300`
- Teal/cyan: `text-cyan-300` or `text-teal-300`

CC chooses exact tokens during execution based on what reads best
against the FrostedCard chrome. Final palette gets documented in
`09-design-system.md` after Spec 4C ships.

This pattern becomes a SYSTEM-WIDE addition. After Dashboard ships,
it gets documented in `09-design-system.md` and is available for
future surfaces (Music, Local Support, etc.).

### Cleanup

**12. InstallCard promoted to first-class widget.** Currently uses
`style={{ order: 9999 }}` magic number to pin to grid-end. Migrate
to explicit ordering rule in `widget-order.ts` constants.

**13. Caveat font (font-script) in ceremony moments migrates to
gradient text pattern.** GettingStartedCelebration, WelcomeWizard,
WelcomeBack ceremony headings move from `font-script Caveat` to the
gradient text pattern used elsewhere. Eliminates the deprecated font
dependency. Aligns with the rest of the rollout's typography
trajectory.

**14. GrowthGarden double-mount fix.** Currently two SVG instances
(mobile via `lg:hidden`, desktop via `hidden lg:block`) sharing one
`gardenRef`. Consolidate to single responsive SVG. Saves DOM weight

- eliminates ref-staleness bug for share-image generation.

### Bonus

**15. Liturgical greeting recency window.** "Happy Easter" currently
shows 30 days after Easter Sunday. Add recency window: liturgical-
moment greetings ("Happy Easter," "Merry Christmas," etc.) only fire
within ~14 days of the actual day. After that, greeting falls back to
season name without "Happy" prefix, or no liturgical greeting if
beyond the season's prominent window.

## Three-spec breakdown

### Spec 4A: Foundation

**Lands the visual baseline for the entire page.**

Files modified:

- `frontend/src/pages/Dashboard.tsx` — wrap in BackgroundCanvas
- `frontend/src/components/dashboard/DashboardCard.tsx` — migrate
  rolls-own chrome to FrostedCard default
- `frontend/src/components/dashboard/DashboardHero.tsx` — greeting +
  status strip migration, Easter recency fix
- `frontend/src/components/dashboard/GrowthGarden.tsx` — double-mount
  fix (single responsive SVG)
- `frontend/src/components/dashboard/CustomizePanel.tsx` — chrome
  alignment, button migration
- `frontend/src/hooks/useLiturgicalSeason.ts` — recency window logic
- All `bg-primary` solid buttons across Dashboard surfaces migrate to
  subtle (10+ files)
- All `text-primary` ghost links migrate to `text-white/80`
  (15+ files — many small touches)

What 4A does NOT do:

- Per-widget tonal icon application (that's 4B)
- Social widget visual changes (that's 4C)
- Modal/overlay sweep (deferred to 4D)

Why 4A first: every other widget consumes DashboardCard. Migrating
the card primitive first means every downstream widget picks up the
new chrome automatically. Then 4B/4C can focus on widget-specific
content treatment, not chrome.

### Spec 4B: Data widgets

**Migrates the 10+ widgets that wrap DashboardCard.**

Widgets in scope:

- MoodChart (chart styling, empty state preservation)
- StreakCard (badge pills, repair UI, FP progress glow)
- ActivityChecklist (ring, item rows)
- GettingStartedCard (accent FrostedCard variant)
- TodaysDevotionalCard
- VerseOfTheDayCard (preserve scripture italic)
- ReadingPlanWidget
- PrayerListWidget
- RecentHighlightsWidget
- GratitudeWidget (3-input form, save flow)
- ChallengeWidget
- BadgeGrid overlay

Tonal Icon Pattern applied per the table in Decision 11.

### Spec 4C: Social, recap, tiles

**Migrates the social-leaning + utility widgets, plus celebration
overlays' Caveat-to-gradient migration.**

Widgets in scope:

- FriendsPreview (leaderboard, MilestoneFeed, empty CircleNetwork)
- WeeklyRecap (with copy rewrite per Decision 8)
- WeeklyGodMoments (banner pattern alignment)
- QuickActions (4-tile grid with tonal colors per tile)
- AnniversaryCard
- EveningReflectionBanner
- InstallCard (with first-class widget promotion per Decision 12)
- Echo card (small visual touchups)
- Caveat-to-gradient migration in:
  - GettingStartedCelebration
  - WelcomeWizard ceremony heading
  - WelcomeBack ceremony heading

### Spec 4D (deferred): Modal/overlay sweep

NOT scheduled now. Will write later if user wants to migrate the
full-screen modals. Components in scope if/when 4D runs:

- WelcomeWizard (full visual treatment, not just heading)
- WelcomeBack
- MoodCheckIn
- MoodRecommendations
- EveningReflection (4-step modal)
- ChallengeCompletionOverlay
- CelebrationQueue + per-celebration overlays

These don't block daily Dashboard usage. Defer until after 4A-C ship
and we have signal on whether modals need the same treatment.

## Open follow-up items

Items that don't block 4A but should be addressed at the right time:

1. **Tonal Icon Pattern documentation in `09-design-system.md`** —
   added after Spec 4C ships. Documents the pattern for system-wide
   adoption on Music, Local Support, etc.

2. **InstallCard ordering rule** — explicit constant in
   `widget-order.ts` rather than magic 9999. Specifically the
   constant pattern needs naming during 4C execution.

3. **GrowthGarden ref-staleness on responsive resize** — verify the
   double-mount fix doesn't introduce a different bug in
   GardenShareButton. Test by resizing the window during share-image
   generation.

4. **Liturgical greeting recency window for ALL holidays** —
   Decision 15 needs implementation across the full liturgical
   calendar, not just Easter. Christmas, Pentecost, Good Friday, etc.
   Pattern: ~14-day window for "Happy [Holiday]" greetings; falls
   back to season name afterward. Implementation lives in
   `useLiturgicalSeason.ts`.

5. **Anti-pressure copy review on WeeklyRecap** beyond the empty
   state — once 4C ships, review the filled state's copy too. "You
   contributed N% of the group's growth!" was preserved per user
   decision but worth a sanity-check after seeing it in the new
   chrome.

6. **Dashboard performance audit** post-migration. The recon flagged
   re-render cascades from non-memoized prop objects. Address in a
   follow-up performance spec, not visual.

## What's NOT in scope for any Spec 4

For clarity, none of the following land in Spec 4A, 4B, or 4C:

- PrayerWall migration (deferred to forums-project Phase 5)
- Bible reader chrome (Spec 8 in rollout)
- AskPage (Spec 9)
- Settings/Insights cluster (Spec 10)
- Music feature (Spec 11)
- Site chrome — Navbar, SiteFooter, SongPickSection (Spec 12)
- Homepage (Spec 13)
- Dashboard performance audit (separate)
- API/backend changes
- Plan data structure changes

## Decision lock

This document represents locked decisions as of 2026-05-04. Specs
4A, 4B, 4C reference these decisions. Changes require explicit
update to this document with rationale, not silent per-spec drift.
