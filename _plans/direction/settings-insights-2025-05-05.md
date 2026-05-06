# Direction — Specs 10A and 10B: Settings + Insights Round 3 Visual Migration

**Date:** 2026-05-05
**Recon:** `_plans/recon/settings-insights-2026-05-05.md`
**Scope:** All Settings and Insights surfaces — `/settings` (single tabbed route, 6 sections), `/insights` (mood trends + correlation cards), `/insights/monthly` (monthly report). Plus AvatarPickerModal (deferred from Spec 6D), DeleteAccountModal, ChangePasswordModal, EmailPreviewModal.

## Premise

Settings and Insights are the next surfaces in the visual rollout
after the Bible cluster (8B/8C/8A) and AskPage (9). Both surfaces
share the same `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` chrome
pattern and neither has reactive-store risk. The work shapes are
genuinely different — Settings is form chrome + toggle switches +
modal redesigns; Insights is chart polish + light narrative
additions + perf hoist + empty state fixes — so the recon
recommends a 2-spec split.

Both sub-specs share decisions on atmospheric layer, active-state
color pattern, and severity color migration. The direction doc
locks those decisions once and applies them across both sub-specs.

## Locked decisions

### 1. Atmospheric layer

**Keep `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero on both
surfaces. No migration to BackgroundCanvas or HorizonGlow.**

The current pattern is canonical for inner page surfaces (Friends,
Grow, MyPrayers also use it). Migrating Settings or Insights to
BackgroundCanvas would over-engineer utility surfaces. HorizonGlow
is Daily-Hub-only by design.

The recon's "Insights reads as flat compared to Daily Hub" framing
is addressed through Round 3 narrative additions in 10B (warmer
subtitle, time-of-day greeting, welcome-back framing) — not
through atmospheric layer change.

### 2. Active-state color pattern (applied across 5 sites)

**Muted white (`bg-white/15 text-white`) with orientation-appropriate
border indicators.**

This pattern aligns with the canonical Bible/Daily Hub tab active
state. Avoids introducing a new violet-on-white variant. Avoids
overloading violet semantics across the app (already used for
GRADIENT_TEXT_STYLE, textarea glows, decorative rings, hover states).

Five sites, one pattern, three orientations:

| Site                                     | Pattern                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| Settings desktop sidebar active          | `bg-white/15 text-white border-l-2 border-white/40`           |
| Settings mobile tablist active           | `bg-white/15 text-white border-b-2 border-white/40`           |
| RadioPillGroup selected pill             | `bg-white/15 text-white border border-white/30`               |
| TimeRangePills selected pill             | `bg-white/15 text-white border border-white/30`               |
| AvatarPickerModal Tab/Upload tabs active | `bg-white/15 text-white` (currently at `/10` — bump to `/15`) |

Apply uniformly across both sub-specs.

### 3. ToggleSwitch on-state color

**Keep `bg-primary` (#6D28D9) — do NOT migrate to `bg-violet-500`.**

Toggle on-state is a state indicator, not a decorative tint or CTA.
It needs unambiguous high-contrast distinction from off-state across
the 22-toggle Notifications panel. `bg-primary` at full saturation
provides that distinction. Native OS toggles (iOS, macOS, Android)
all use saturated primary colors for on-state — following that
convention is correct for established UX expectations.

The DailyHub 1B violet treatment is for decorative tints (pill
backgrounds at /15-/20 opacity, ring colors at /30) — not for
high-saturation state signals. Different semantic job, different
treatment.

### 4. `text-primary` text-button migration

**Migrate all 5 instances to `text-violet-300 hover:text-violet-200`.**

The `text-primary` (#6D28D9) on `bg-dashboard-dark` (#0f0a1e)
contrast ratio is ~3.4:1, failing WCAG AA (4.5:1 required for
normal text). This is a real accessibility bug across:

- ProfileSection.tsx:107 (Change avatar)
- AccountSection.tsx:56 (Change Email)
- AccountSection.tsx:66 (Change Password)
- PrivacySection.tsx:151 (Unblock)
- PrivacySection.tsx:182 (Unmute)

Migrate to `text-violet-300 hover:text-violet-200` per DailyHub 1B
canonical text-button treatment. Don't preserve as `text-primary-lt`
(deprecated even though that variant passes contrast).

### 5. `font-script` removals

**Drop all 3 `<span className="font-script">` instances.**

GRADIENT_TEXT_STYLE on the parent h1 already provides emphasis. The
font-script Caveat treatment is deprecated per Spec 6D Decision 6.

Sites:

- Settings.tsx:83 ("Settings")
- Insights.tsx:203 ("Insights")
- MonthlyReport.tsx:110 ("Report")

### 6. `font-serif italic` Insights subtitle

**Migrate to `font-sans` Inter, no italic, `text-white/60`.**

`Insights.tsx:205` currently `<p class="font-serif italic text-white/60">Reflect on your journey</p>`. The migration to canonical body prose pairs naturally with the warmer narrative one-liner from Decision 13 below.

### 7. Severity color system migration

**Migrate all severity-tinted UI to the canonical severity color
system.**

Sites:

- DeleteAccountModal.tsx:48 (`bg-red-500` Delete Everything button) → `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`
- AccountSection.tsx:82 (`bg-red-500/20 text-red-400` Delete Account trigger) → align to severity system, muted destructive variant
- NotificationsSection.tsx:55 (`text-success` push status indicator) → severity success color
- NotificationsSection.tsx:62 (`text-danger` push denied) → severity danger color
- ChangePasswordModal field-level errors (`text-red-400`) → `text-red-100` on appropriate background per severity system
- AvatarPickerModal photo error messages (`text-red-400 text-center`) → severity system

### 8. White-pill primary CTA migrations

**Migrate all `bg-primary text-white` solid CTAs to canonical
white-pill primary CTA pattern (Pattern 2 per `09-design-system.md`).**

Sites:

- AvatarPickerModal.tsx:346 (Save — Presets tab)
- AvatarPickerModal.tsx:418 (Save / Use This Photo — Upload tab)
- ChangePasswordModal.tsx:176 (Update password)
- NotificationsSection.tsx:238 (Send test notification — currently raw `bg-white` close to canonical, align fully)

Same canonical chrome as homepage Get Started + RegisterPage hero +
BibleLanding "Read this passage" pattern.

### 9. Tab pattern overhaul (Settings)

**Unify semantics + URL-back the active tab + apply Decision 2
muted-white active styling.**

Three changes folded into one pass:

**9a. Semantic unification.** Use `role="tab"` on both mobile and
desktop. Eliminate the desktop `<nav>` wrapper which incorrectly
implies cross-page navigation. Both contexts get `role="tablist"` +
6 `role="tab"` buttons + `aria-selected` + `aria-controls`.

**9b. URL state.** `useSearchParams` URL backing with `?tab=profile|dashboard|notifications|privacy|account|app`. Read on mount, set on click via `setSearchParams({ tab: id }, { replace: true })`. Default to `'profile'` when no param. Match Daily Hub and AskPage patterns.

**9c. Active styling.** Per Decision 2.

**9d. Arrow-key roving.** Add Home/End jump and arrow-key navigation
matching `RadioPillGroup` and `TimeRangePills` patterns already in
the codebase. `tabIndex={selected ? 0 : -1}` roving.

### 10. Delete account Bible data leak fix

**Fold the 5-line `bible:*` and `bb*-v*:*` prefix sweep into Spec
10A's `handleDeleteConfirm`.**

Current `handleDeleteConfirm` sweeps `wr_*` and `worship-room-*`
prefixes but leaves `bible:bookmarks`, `bible:notes`,
`bible:journalEntries`, `bible:plans`, `bible:streak`, and the
`bb*-v*:*` AI/audio cache keys orphaned. The modal copy promises
"all your Worship Room data" — the implementation should match.

Define the prefix list as a local const at the top of
`handleDeleteConfirm` with a comment explaining what's covered.
Doesn't justify a separate constants file.

### 11. MonthlyReport empty state fix

**Drop the silent-mock-fallback in `useMonthlyReportData`. Replace
with real `<FeatureEmptyState>` for empty months.**

Current behavior fabricates fake numbers when no entries exist for
a month. This is a trust violation — a user looking at last March's
report should not see invented data.

The fix:

- `useMonthlyReportData` returns clean empty state (`{ entries: [], hasData: false, ... }`) when no entries exist
- MonthlyReport.tsx renders `<FeatureEmptyState>` for `!hasData` case
- Empty state copy: anti-pressure framing
  - For current-month: "This month is just beginning. Check back at the end of the month for your report."
  - For past-empty months: "No entries yet for [Month Year]. The report will populate as you add mood entries."

### 12. `getMoodEntries()` perf hoist

**Hoist via unified `InsightsDataContext`. Cover both Insights and
MonthlyReport surfaces.**

Currently 8+ child components on `/insights` call `getMoodEntries()`
independently on cold load. Lift to page-level via React Context.

Implementation:

- New `InsightsDataContext` with `moodEntries: MoodEntry[]` (unfiltered) and `getMonthlyEntries(month, year)` selector
- `Insights.tsx` and `MonthlyReport.tsx` provide context
- Each child consumer migrates from `getMoodEntries()` direct call to `useInsightsData().moodEntries`
- Children continue to do their own `useMemo` filtering — context exposes raw data only
- Tests get a wrapper that injects test data via Provider, replacing 8 mock setups with 1

This is correctness-first, not perf-measurement-gated. The
architectural improvement matters regardless of cold-load savings.

### 13. Insights light-touch narrative additions

**Pick up enumerated light-touch items in Spec 10B. Defer rich items
to Spec 10c.**

Light-touch (Spec 10B):

- Replace "Reflect on your journey" subtitle with warmer narrative one-liner that may incorporate user data ("Your week in worship", "Your story so far", or computed: "April was a {bestMood} month. You {topActivity} {N} days.")
- Time-of-day greeting on Insights hero (match Daily Hub pattern — morning vs evening copy variants)
- Welcome-back warmth on returning-after-gap visits (avoid mentioning gaps; warm framing)
- Promote `MonthlyShareButton` above the fold on MonthlyReport

Deferred to Spec 10c (focused future spec):

- LLM-generated narrative summary ("Worship Wrapped")
- Annual recap surface ("Worship Year in Review")
- Spiritual archetype personality system
- Per-section share affordances on Insights
- Cross-cutting EchoCard mount on Insights hero
- Sound atmosphere during share-card reveals
- Friends-warmth integration

### 14. AvatarPickerModal scope

**Full chrome migration in Spec 10A.**

Per recon's ~3-4 hour estimate. Specifically:

- Migrate `bg-primary` solid CTA buttons (lines 346 + 418) to white-pill primary (Decision 8)
- Bump tab buttons (lines 198 + 210) to `min-h-[44px]` (touch target compliance)
- Move focus-on-open to currently-selected avatar instead of close X
- Migrate photo error messages to severity color system (Decision 7)
- Bump active Tab/Upload tab from `bg-white/10` to `bg-white/15` (Decision 2)
- KEEP `ring-primary` selection rings (lines 261 + 311 — Decision 11 preserve, decorative)
- KEEP container chrome (`bg-hero-mid border border-white/15` — utility modal, FrostedCard would over-engineer)
- KEEP drag-drop zone (`border-2 border-dashed border-white/20` — utility variant)
- KEEP animation (`animate-dropdown-in` — already canonical BB-33)

### 15. ChangePasswordModal alignment with Spec 7 auth canonical

**Align form chrome + validation timing + error display with
RegisterPage / AuthModal canonical patterns.**

- Submit button → white-pill primary (Decision 8)
- Cancel button → align to canonical secondary
- Error colors → severity color system (Decision 7)
- Validation timing for new password length: validate on blur instead of every keystroke. The "Use at least 8 characters." error appearing on the first keystroke is jarring. Show requirement as help hint until blur with too-short value, then promote to error.
- Form field input chrome: align to `bg-white/5 border border-white/15` per RegisterPage canonical

### 16. DeleteAccountModal a11y + chrome

- Add `aria-modal="true"` (single-line fix)
- Delete button → severity color system (Decision 7)
- Add `<AlertCircle>` or `<AlertTriangle>` icon in heading row (reinforces alertdialog purpose)
- KEEP "We'll miss you" copy (emotionally honest, anti-pressure)

### 17. Notification preferences scope (10A)

**Keep current layout. No progressive disclosure in 10A.**

22 items is dense but recon notes "decision-fatigue concern is mild."
Adding expand/collapse affordance is meaningful UX work that wants
its own focused spec.

Spec 10A DOES:

- Migrate Send test notification button to canonical white-pill (Decision 8)
- Migrate severity raw classes to severity system (Decision 7)
- Migrate sub-heading eyebrow style if visual continuity warranted (light touch)

Spec 10A does NOT:

- Add progressive disclosure for Notifications (defer to Spec 10c)
- Replace native `<input type="time">` with custom dropdown (defer)
- Add labeled chips or faded cards for "(coming soon)" treatments (defer)

### 18. Insights time-range UX

**Keep as-is. 5 windows (30d / 90d / 180d / 1y / All) + arrow-key
roving + 30d default.**

Recon's decision-fatigue concern is mild. Pills are accessible.
Reducing to 3 windows would lose granularity. Replacing with
dropdown reduces visual prominence — but time-range is a primary
control on Insights, prominence is correct.

Active-state pattern migration applies per Decision 2.

### 19. Spotify OAuth Phase 3.13 placeholder

**No placeholder in Spec 10A. Pure greenfield in Phase 3.13.**

Adding a "Connect Spotify (coming soon)" disabled-state entry-point
creates a UX commitment without a concrete shipping date and erodes
user trust. Phase 3.13 backend conversation will land the integration
with full architectural context.

### 20. Annual recap / Worship Year in Review

**Out of scope for Spec 10B.**

Spotify Wrapped + Strava Year in Sport are inspirational but the
implementation work is substantial (LLM narrative, per-scene shares,
summary share, full design system, generation pipeline scheduled for
December 1). Defer to focused Spec 10c or Phase 3 feature spec.

The narrow exception: Spec 10B promotes `MonthlyShareButton` above
the fold on MonthlyReport (Decision 13 light-touch). Don't expand
to per-section sharing or annual recap.

### 21. Insights rolls-own card chrome

**Preserve all `bg-white/5` rolls-own card chrome scattered across
18 insight components. No FrostedCard adoption sweep in 10B.**

Recon flagged this as low priority. Each component reproduces the
class string — could be migrated to `<FrostedCard>` for consistency,
but the visual rendering is already close enough to canonical. The
sweep would be ~30 LOC of mechanical changes across 18 files with
no visual delta.

Defer to Spec 10c if visual cohesion becomes a complaint post-launch.

### 22. Bible export overlap with BibleSettingsModal

**Verify during Spec 10A pre-execution. No anticipated changes.**

Recon Part 4 audit needs confirmation that Settings.tsx doesn't have
a parallel export flow that fragments UX with BibleSettingsModal's
existing export.

If found:

- Recommendation: replace Settings.tsx general-purpose export with a "Manage your Bible data" link routing to BibleSettingsModal
- OR unify into a single Settings-level export covering all features

Pre-execution recon in Spec 10A surfaces this. If no overlap, this
decision is moot.

### 23. Tests update strategy

- Tab pattern unification breaks Settings.test.tsx tab semantics assertions — update for `role="tab"` everywhere
- URL backing requires new tests for `?tab=` deep-link, refresh persistence, and history navigation
- `aria-modal="true"` addition on DeleteAccountModal — update test
- Bible-data sweep on delete — add tests asserting `bible:*` and `bb*-v*:*` keys are cleared
- AvatarPickerModal focus-on-open change — update test
- AvatarPickerModal `min-h-[44px]` tab buttons — update assertions
- `text-primary` migrations — update class-string assertions across 5 affected component tests
- `font-script` span removals — update h1 assertions
- White-pill CTA migrations — update class-string assertions across 4 affected modal/section tests
- Severity color system migrations — update class-string assertions
- ChangePasswordModal validation timing change (blur vs keystroke) — update tests
- MonthlyReport empty state — add tests for empty-month rendering
- `useMonthlyReportData` mock-fallback removal — update tests
- `InsightsDataContext` introduction — add provider wrapper tests, migrate 8 child component tests from individual `vi.mock(getMoodEntries)` to single Provider injection
- ToggleSwitch on-state preservation — verify class-string assertions still pass

## Out of scope across both sub-specs

- BackgroundCanvas / HorizonGlow atmospheric migration
- Notification preferences progressive disclosure (Spec 10c)
- Native `<input type="time">` custom dropdown replacement (Spec 10c)
- LLM-generated Insights narrative summary (Spec 10c / focused spec)
- Annual recap surface "Worship Year in Review" (Spec 10c / Phase 3)
- Spiritual archetype personality system (Spec 10c)
- Per-section share affordances on Insights (Spec 10c)
- Cross-cutting EchoCard mount on Insights hero (Spec 10c)
- Sound atmosphere during share reveals (Spec 10c)
- Friends-warmth integration on Insights (Spec 10c)
- FrostedCard adoption sweep on Insights rolls-own card chrome (Spec 10c)
- "Download your data first?" link on DeleteAccountModal (Spec 10c)
- Spotify OAuth Phase 3.13 placeholder (Phase 3.13 greenfield)
- Forums Wave backend account management (separate domain)
- Time-range UX consolidation (5 → 3 windows) — preserve current
- AppSection PWA install affordance migration — verification only
- DashboardSection (Customize, Reset) — verification only

## Sub-spec ordering and execution model

| Spec | Surface                                 | Model (execute)     | Dependency                                                                              |
| ---- | --------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| 10A  | Settings + AvatarPickerModal + 3 modals | **Sonnet 4.6 High** | Locks atmospheric, active-state, severity, white-pill, font-script patterns for cluster |
| 10B  | Insights + MonthlyReport                | **Sonnet 4.6 High** | Consumes 10A's pattern decisions; adds InsightsDataContext + light-touch narrative      |

Recon, plan, code review on Opus 4.7 xHigh per validated strategy.
Verify-with-playwright on Sonnet High.

10A first. After 10A ships clean and verifies, 10B starts.

Total cluster scope: ~4,500 LOC source + ~3,500 LOC tests across
both sub-specs.
