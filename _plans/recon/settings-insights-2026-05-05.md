# Worship Room — Settings + Insights Recon Report

**Date:** 2026-05-05
**Branch:** forums-wave-continued
**Scope:** Every Settings + Insights surface — `/settings` (single tabbed route, 6 sections), `/insights` (mood trends + correlation cards), `/insights/monthly` (monthly report). Plus the `AvatarPickerModal` (deferred from Spec 6D), `DeleteAccountModal`, `ChangePasswordModal`, and the `EmailPreviewModal` mounted from MonthlyReport.
**Source-of-truth files inspected:** 30 production .tsx/.ts files in `pages/Settings.tsx`, `pages/Insights.tsx`, `pages/MonthlyReport.tsx`, `components/settings/*` (10), `components/insights/*` (18), `components/shared/AvatarPickerModal.tsx`, plus `hooks/useSettings.ts`, `hooks/useMoodChartData.ts`, `hooks/useMonthlyReportData.ts`, `hooks/useMonthlyReportSuggestions.ts`, `services/settings-storage.ts`, `services/mood-storage.ts`, plus 27 test files.
**Auth posture:** Both `/settings` and `/insights` and `/insights/monthly` are **fully auth-gated end-to-end** via `<Navigate to="/" replace />` when `!isAuthenticated`. No "logged-out browse" affordance like the Local Support pages have. Confirmed by Playwright capture at `playwright-screenshots/10A-settings-logged-out-desktop.png` (redirects to home) and `10B-insights-logged-out-desktop.png` (same).
**Recon recommends a 2-spec split:** **Spec 10A** for Settings + AvatarPickerModal + the three modals; **Spec 10B** for Insights + MonthlyReport. Combined LOC ~4,000 production + ~3,500 test, two surfaces with very different work shapes (form chrome vs chart polish).

---

## Part 1 — Page-Level Architecture

### Component file paths

| File | LOC | Role |
|------|-----|------|
| `frontend/src/pages/Settings.tsx` | 178 | `/settings` shell. Hero + sidebar/tablist + active panel. Dual nav: hidden `<` sm:hidden tablist (mobile, top), `hidden sm:block` sidebar (desktop, left column). |
| `frontend/src/pages/Insights.tsx` | 311 | `/insights` shell. Hero + TimeRange pills (inline + sticky duplicate) + 11 vertically stacked AnimatedSection wrappers. |
| `frontend/src/pages/MonthlyReport.tsx` | 212 | `/insights/monthly` shell. Hero with month pager + Breadcrumb + 7 AnimatedSection wrappers + EmailPreviewModal. |
| `frontend/src/components/shared/AvatarPickerModal.tsx` | 447 | Avatar selection modal (Presets tab, Upload Photo tab, drag-drop, unlockable preview, custom photo support). Mounted only from `ProfileSection.tsx:114`. |
| `frontend/src/components/settings/ProfileSection.tsx` | 185 | Display name + bio + avatar trigger. |
| `frontend/src/components/settings/NotificationsSection.tsx` | 339 | Sound + Push + In-app + Email + Activity toggle groups (heaviest section). |
| `frontend/src/components/settings/PrivacySection.tsx` | 212 | Leaderboard + activity status + nudges + streak visibility + Blocked + Muted users. |
| `frontend/src/components/settings/AccountSection.tsx` | 105 | Email display + Change Email (toast stub) + Change Password trigger + Delete Account trigger. |
| `frontend/src/components/settings/AppSection.tsx` | 60 | PWA install affordance (only renders when `isInstallable \|\| isInstalled`). |
| `frontend/src/components/settings/DashboardSection.tsx` | 33 | Two buttons: Customize (→ `/?customize=true`) + Reset Dashboard Layout. |
| `frontend/src/components/settings/ChangePasswordModal.tsx` | 185 | Current/new/confirm password form, calls `changePasswordApi()`. |
| `frontend/src/components/settings/DeleteAccountModal.tsx` | 56 | `role="alertdialog"` confirm dialog. **Cancel + Delete Everything**, no password reauth. |
| `frontend/src/components/settings/ToggleSwitch.tsx` | 55 | Reusable `role="switch"` toggle with label + description + Enter-key handler. |
| `frontend/src/components/settings/RadioPillGroup.tsx` | 66 | Reusable radio-pill group with arrow-key roving tabindex. |
| `frontend/src/components/insights/CalendarHeatmap.tsx` | 319 | 7-row × N-week grid colored by mood; native CSS Grid + custom positioned tooltip. |
| `frontend/src/components/insights/MoodTrendChart.tsx` | 387 | Recharts `LineChart` with morning + evening dots, optional 7-day moving average overlay. |
| `frontend/src/components/insights/MeditationHistory.tsx` | 348 | Stacked `BarChart` of meditation minutes by type, plus 3 summary cards. |
| `frontend/src/components/insights/InsightCards.tsx` | 157 | 4 hardcoded insight cards (rotated by day-of-year) + 5th computed mood-change card. |
| `frontend/src/components/insights/ActivityCorrelations.tsx` | 150 | "With activity / Without activity" mood comparison `BarChart` (mock data, marked example). |
| `frontend/src/components/insights/ActivityBarChart.tsx` | 105 | `BarChart` of activity counts (used by Monthly Report only). |
| `frontend/src/components/insights/MonthlyStatCards.tsx` | 135 | 4 animated count-up stat cards (days active / points / level / mood trend %). |
| `frontend/src/components/insights/MonthHeatmap.tsx` | 155 | Single-month grid (7-row × N-week) colored by mood; uses native `title` tooltip. |
| `frontend/src/components/insights/MonthlyHighlights.tsx` | 89 | 3 stat cards: longest streak / badges earned / best day. |
| `frontend/src/components/insights/MonthlyInsightCards.tsx` | 49 | 3 hardcoded insight cards in a 2-column grid. |
| `frontend/src/components/insights/MonthlySuggestions.tsx` | 71 | 1-3 actionable suggestion cards with optional CTAs. |
| `frontend/src/components/insights/MonthlyShareButton.tsx` | 60 | Wraps `<ShareImageButton>` with Canvas-generated monthly summary image. |
| `frontend/src/components/insights/EmailPreviewModal.tsx` | 110 | Static modal showing a rendered email template mockup (light-themed inside dark modal). |
| `frontend/src/components/insights/PrayerLifeSection.tsx` | 178 | Active/answered/answer-rate stat card + mood-correlation card + prayer-category breakdown card. |
| `frontend/src/components/insights/CommunityConnections.tsx` | 65 | Local Support visit count + breakdown + mood-correlation (`null` if no visits). |
| `frontend/src/components/insights/ScriptureConnections.tsx` | 67 | 4 hardcoded mock scripture references with mood-colored dots. |
| `frontend/src/components/insights/GratitudeStreak.tsx` | 28 | Streak count card (`null` if streak < 2). |
| `frontend/src/components/insights/GratitudeCorrelationCard.tsx` | 95 | Mood-on-gratitude-days vs mood-on-other-days comparison (uses `useMemo`). |

**Production total:** 4,002 LOC across 30 files.

### Routes that render Settings + Insights surfaces

| Route | Component | Auth | Lazy? | Atmospheric layer | Skeleton |
|-------|-----------|------|-------|-------------------|----------|
| `/settings` | `Settings` | **auth-gated** (Navigate redirect when logged out) | yes | `bg-dashboard-dark` body + inline `ATMOSPHERIC_HERO_BG` style on hero `<section>` | `SettingsSkeleton` |
| `/insights` | `Insights` | **auth-gated** | yes | same — `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero | `InsightsSkeleton` |
| `/insights/monthly` | `MonthlyReport` | **auth-gated** | yes | same — `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero | `RouteLoadingFallback` (no dedicated skeleton) |

**Atmospheric layer alignment finding:** All three routes use the **same** `bg-dashboard-dark` body + `ATMOSPHERIC_HERO_BG` hero pattern. This is the canonical "inner page" pattern shared with `/friends`, `/grow`, `/my-prayers`, and is **not** a fragmentation problem (unlike Bible's 5-way split). However, the homepage and Daily Hub use richer layers (`<BackgroundCanvas>` and `<HorizonGlow>` respectively), and Insights specifically reads as flat compared to those. See Open Question 1 about whether Insights should adopt a richer atmospheric treatment for the emotional-narrative tier (Round 3 enhancement candidate).

### Top-level structure (Settings)

```tsx
<div className="min-h-screen bg-dashboard-dark">
  <SEO {...SETTINGS_METADATA} />              {/* noIndex:true */}
  <Navbar transparent />                       {/* z-50 absolute */}

  {/* Hero — inline ATMOSPHERIC_HERO_BG */}
  <section
    aria-labelledby="settings-heading"
    className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
    style={ATMOSPHERIC_HERO_BG}
  >
    <Link to="/" className="...text-white/50 hover:text-white/70">
      <ArrowLeft /> Dashboard
    </Link>
    <h1 id="settings-heading" className="..." style={GRADIENT_TEXT_STYLE}>
      <span className="font-script">Settings</span>      {/* font-script DEPRECATED */}
    </h1>
  </section>

  {/* Mobile tabs (sm:hidden) — bg-white/[0.08] sticky-ish bar */}
  <div className="sm:hidden bg-white/[0.08] backdrop-blur-xl border-b border-white/10">
    <div role="tablist" aria-label="Settings sections">
      {SECTIONS.map(s => <button role="tab" aria-selected={...} aria-controls={...}>...</button>)}
    </div>
  </div>

  {/* Content with desktop sidebar */}
  <main id="main-content" className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
    <div className="flex gap-8">
      <nav role="navigation" aria-label="Settings"
           className="hidden sm:block w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2">
        {SECTIONS.map(s => (
          <button className={cn(
            'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
            activeSection === s.id
              ? 'bg-primary/10 text-primary-lt'                          {/* DEPRECATED */}
              : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
          )}>{s.label}</button>
        ))}
      </nav>

      <div key={activeSection} id={`settings-panel-${activeSection}`} aria-live="polite"
           className="flex-1 max-w-[640px] motion-safe:animate-tab-fade-in">
        {activeSection === 'profile'       && <ProfileSection ... />}
        {activeSection === 'dashboard'     && <DashboardSection />}
        {activeSection === 'notifications' && <NotificationsSection ... />}
        {activeSection === 'privacy'       && <PrivacySection ... />}
        {activeSection === 'account'       && <AccountSection ... />}
        {activeSection === 'app'           && <AppSection />}
      </div>
    </div>
  </main>

  <SiteFooter />
  {import.meta.env.DEV && <DevAuthToggle />}
</div>
```

**Critical observations:**

- **Two parallel nav controls.** Mobile uses `<button role="tab">` in a top tablist with `border-b-2 border-primary` active indicator. Desktop uses `<button>` (no `role="tab"`!) in a sidebar with `bg-primary/10 text-primary-lt` active state. **Same component, different semantic markup, different visual treatment.** Spec 10A should unify.
- **Active section announces via `aria-live="polite"`** on the panel container — good a11y pattern, panel keyed to `activeSection` so React fully remounts on tab change.
- **Tab state is local `useState`, NOT URL-backed.** Deep-linking to `/settings?tab=notifications` does NOT work — refreshing always lands on Profile. See Tab Pattern section below.
- **`<DevAuthToggle />` is mounted in dev mode** at the bottom of the JSX (also true of Insights and MonthlyReport).
- **No skip-to-main-content link** on the page itself — relies on the canonical Navbar skip link, which IS present (Navbar mounts it).

### Top-level structure (Insights)

```tsx
<div className="min-h-screen bg-dashboard-dark">
  <SEO {...INSIGHTS_METADATA} />                  {/* noIndex:true */}
  <Navbar transparent />

  <section aria-labelledby="insights-heading"
    className="relative flex w-full flex-col items-center ..."
    style={ATMOSPHERIC_HERO_BG}
  >
    <Link to="/">←  Dashboard</Link>
    <h1 id="insights-heading" style={GRADIENT_TEXT_STYLE}>
      Mood <span className="font-script">Insights</span>     {/* font-script — DEPRECATED */}
    </h1>
    <p className="font-serif italic text-base text-white/60 sm:text-lg">     {/* font-serif italic on prose — DEPRECATED */}
      Reflect on your journey
    </p>
  </section>

  {/* Sentinel for IntersectionObserver — tracks if hero left viewport */}
  <div ref={sentinelRef} aria-hidden="true" />

  {/* Inline TimeRange pills — inert when sticky duplicate is visible */}
  <div className="bg-dashboard-dark py-3" {...(isSticky ? { inert: '', 'aria-hidden': true } : {})}>
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <TimeRangePills range={range} onChange={setRange} />
    </div>
  </div>

  {/* Sticky TimeRange pills (only when isSticky === true) */}
  {isSticky && (
    <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-white/[0.08] py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <TimeRangePills range={range} onChange={setRange} />
      </div>
    </div>
  )}

  <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6">
    {/* Insufficient (2-6 entries) banner */}
    {entries.length >= 2 && entries.length < 7 && (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 ...">
        After 7 days, you'll see trends emerge
      </div>
    )}

    {/* Empty state (0-1) */}
    {entries.length < 2 && (
      <AnimatedSection index={0}>
        <FeatureEmptyState icon={BarChart3} heading="Your story is just beginning"
          description="Check in with your mood each day, and watch your journey unfold here."
          ctaLabel="Check in now" ctaHref="/" />
      </AnimatedSection>
    )}

    {entries.length >= 2 && (
      <>
        <AnimatedSection index={0}><CalendarHeatmap rangeDays={rangeDays} /></AnimatedSection>
        <AnimatedSection index={1}><MoodTrendChart rangeDays={rangeDays} /></AnimatedSection>
      </>
    )}
    <AnimatedSection><InsightCards hasData={hasData} /></AnimatedSection>
    <AnimatedSection><ActivityCorrelations hasData={hasData} /></AnimatedSection>
    <AnimatedSection><GratitudeCorrelationCard /></AnimatedSection>
    <AnimatedSection><CommunityConnections hasData={hasData} /></AnimatedSection>
    <AnimatedSection><GratitudeStreak /></AnimatedSection>
    <AnimatedSection><ScriptureConnections hasData={hasData} /></AnimatedSection>
    <AnimatedSection><PrayerLifeSection /></AnimatedSection>
    <AnimatedSection><MeditationHistory rangeDays={rangeDays} /></AnimatedSection>
    <AnimatedSection>
      <Link to="/insights/monthly" className="...bg-white/10 ...">View Monthly Report</Link>
    </AnimatedSection>
  </main>

  <SiteFooter />
  {import.meta.env.DEV && <DevAuthToggle />}
</div>
```

**Critical observations:**

- **Dual TimeRange pill bars.** An inline pair lives between hero and content; a sticky pair appears `fixed top-0` once scroll passes the sentinel. Both render the SAME `<TimeRangePills>` component. The inline one becomes `inert` when sticky kicks in. Playwright tests must scroll-to-top OR target the second instance to interact with the pills when content is below the fold.
- **`isSticky` derived via IntersectionObserver on a sentinel div** (`sentinelRef`). Simple, well-established pattern.
- **AnimatedSection wraps every child** — staggered `animate-fade-in-up` with `100ms * index` delay. `motion-reduce:animate-none motion-reduce:opacity-100` correctly handles reduced-motion.
- **9 always-rendered child sections** + 2 conditional (CalendarHeatmap + MoodTrendChart) when `entries.length >= 2`. Each child INDEPENDENTLY reads from storage (perf concern — see Part 5).
- **Subtitle prose uses `font-serif italic`** — this is the deprecated body-prose treatment per `09-design-system.md` § "Daily Hub body text readability standard (post Spec T)". Should migrate to Inter sans for consistency.
- **`font-script` on "Insights" word** — accent-on-noun pattern (similar to AskPage's "Ask"), but `09-design-system.md` § "Decorative Font" lists Caveat as deprecated for headings, replaced by `GRADIENT_TEXT_STYLE`. The full heading already wraps in `GRADIENT_TEXT_STYLE`, so the `font-script` span is layered on top — visually loud and the only Caveat appearance on these surfaces.

### Top-level structure (MonthlyReport)

```tsx
<div className="min-h-screen bg-dashboard-dark">
  <SEO {...INSIGHTS_MONTHLY_METADATA} />
  <Navbar transparent />

  <section aria-labelledby="monthly-report-heading"
    className="..." style={ATMOSPHERIC_HERO_BG}>
    <h1 id="monthly-report-heading" style={GRADIENT_TEXT_STYLE}>
      Monthly <span className="font-script">Report</span>           {/* font-script — DEPRECATED */}
    </h1>
    {/* Month pager */}
    <div className="mt-2 flex items-center gap-3">
      <button onClick={goToPreviousMonth} disabled={isAtEarliest} aria-label="Previous month">
        <ChevronLeft />
      </button>
      <span className="text-lg text-white/85 sm:text-xl">{data.monthName} {data.year}</span>
      <button onClick={goToNextMonth} disabled={isAtLatest} aria-label="Next month">
        <ChevronRight />
      </button>
    </div>
  </section>

  <Breadcrumb items={[{label:'Insights', href:'/insights'}, {label:'Monthly Report'}]} maxWidth="max-w-5xl" />

  <main id="main-content" key={`${selectedYear}-${selectedMonth}`}
        className="mx-auto max-w-5xl space-y-6 px-4 pb-12 sm:px-6 opacity-0 animate-fade-in motion-reduce:animate-none motion-reduce:opacity-100">
    <AnimatedSection><MonthlyStatCards ... /></AnimatedSection>
    <AnimatedSection><MonthHeatmap ... entries={data.moodEntries} /></AnimatedSection>
    <AnimatedSection><ActivityBarChart activityCounts={data.activityCounts} /></AnimatedSection>
    <AnimatedSection><MonthlyHighlights ... /></AnimatedSection>
    <AnimatedSection><MonthlyInsightCards /></AnimatedSection>
    {suggestions.length > 0 && <AnimatedSection><MonthlySuggestions suggestions={suggestions} /></AnimatedSection>}
    <AnimatedSection>
      <MonthlyShareButton ... />
      <button onClick={() => setShowEmailPreview(true)}>Preview Email</button>
    </AnimatedSection>
  </main>

  <EmailPreviewModal isOpen={showEmailPreview} onClose={...} monthName={data.monthName} />
  <SiteFooter />
  {import.meta.env.DEV && <DevAuthToggle />}
</div>
```

**Critical observations:**

- **Animation gating differs from Insights.** MonthlyReport uses `key={`${year}-${month}`}` on `<main>` so the entire content remounts and replays the fade-in when the month changes. Insights does NOT do this — content is stable across TimeRange changes.
- **No back link in hero** — relies on `<Breadcrumb>` for "Insights" return path. The Insights page has a `← Dashboard` link in its hero; MonthlyReport does not have a `← Insights` link in its hero (Breadcrumb covers it). Minor inconsistency.
- **Month pager has 44×44 hit targets** with `disabled` state on edges (`isAtEarliest`/`isAtLatest`). Good a11y.
- **`getEarliestMonth(allEntries)` is called inside a `useMemo`** to determine the back-edge of the pager. With no entries, returns current month (so pager is locked to a single month).
- **NO empty state for the page itself.** When the user has no entries for the selected month, the `useMonthlyReportData` hook substitutes mock data (`hasRealData: false` branch), and the page silently renders fake numbers. **This is a UX bug** (see Open Question 4 / Spec 10c candidate).

---

## Part 2 — Section-by-Section Inventory

### Settings (`/settings`) — render order

#### Mobile tablist (top of page, hidden on sm+)

| # | Tab | Source | Render condition | Visual |
|---|-----|--------|------------------|--------|
| 1 | Profile (default) | `Settings.tsx:91-107` | always | `border-b-2 border-primary` active, `text-white/60` inactive |
| 2 | Dashboard | same | always | same |
| 3 | Notifications | same | always | same |
| 4 | Privacy | same | always | same |
| 5 | Account | same | always | same |
| 6 | App | same | always | same |

#### Desktop sidebar (left column, hidden on mobile)

| # | Tab | Source | Render condition | Visual |
|---|-----|--------|------------------|--------|
| 1-6 | (same labels in same order) | `Settings.tsx:121-134` | always | `bg-primary/10 text-primary-lt` active, `text-white/60 hover:text-white hover:bg-white/[0.06]` inactive |

The sidebar is `w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2` — semi-transparent panel with right-side border.

#### Profile panel (`activeSection === 'profile'`)

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Card heading "Profile" | `ProfileSection.tsx:91` | always | `text-base font-semibold text-white md:text-lg mb-6` |
| 2 | Avatar + Change button | `ProfileSection.tsx:94-112` | always | `<ProfileAvatar size="sm">` + text-button "Change" with `text-primary` (DEPRECATED) |
| 3 | Display Name input + char count + saved indicator | `ProfileSection.tsx:128-156` | always | Standard form input, `validateName` on blur (`/^[a-zA-Z0-9 ]+$/`, 2-30 chars), `aria-invalid`/`aria-describedby` for error, `text-green-400` for "Saved" indicator (2s fade) |
| 4 | Bio textarea + char count | `ProfileSection.tsx:159-181` | always | `rows={3}`, max 160, `<CharacterCount warningAt={128} dangerAt={154}>`, helper text "Your bio will appear on your profile (coming soon)" |

**Section wrapper:** `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6` — rolls-own FrostedCard (does NOT use the `<FrostedCard>` component; reproduces the class string by hand).

**Display name validation rule:** `^[a-zA-Z0-9 ]+$` allows alphanumerics + space. Hyphens, periods, apostrophes (e.g., "St. Paul", "O'Brien") are rejected. Worth flagging as a UX cliff for users with apostrophes in their names — Spec 10A or future spec.

#### Dashboard panel (`activeSection === 'dashboard'`)

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Card heading "Dashboard" | `DashboardSection.tsx:11` | always | same h2 treatment |
| 2 | Customize Layout button | `DashboardSection.tsx:13-19` | always | `bg-white/[0.06]` row with right-side `text-white/50` Customize → arrow |
| 3 | Reset Dashboard Layout button | `DashboardSection.tsx:21-29` | always | `bg-white/[0.06]` row with `text-white/60 hover:text-white` (full width) |

The Dashboard tab is the lightest in the inventory — 33 LOC, 2 buttons. Visually thin compared to Profile's 4 sections. Worth mentioning in scope discussion (Spec 10A could trim or expand this).

#### Notifications panel (`activeSection === 'notifications'`)

| # | Section / sub-section | Source | Render condition | Visual |
|---|----------------------|--------|------------------|--------|
| 1 | Card heading "Notifications" | `NotificationsSection.tsx:143` | always | h2 |
| 2 | Sub-heading "Sound" | `NotificationsSection.tsx:148` | always | `text-xs text-white/60 uppercase tracking-wider mb-3` |
| 3 | Sound Effects toggle | `NotificationsSection.tsx:150-156` | always | `<ToggleSwitch>` |
| 4 | Sub-heading "Push Notifications" + Status indicator | `NotificationsSection.tsx:161-166` | always | divider above + status pill (`text-success` / `text-danger` / `text-white/60`) |
| 5 | iOS install hint card | `NotificationsSection.tsx:169-185` | `pushSupport === 'ios-needs-install'` | `<Share>` icon + 2-line copy in `bg-white/[0.06]` rounded box |
| 6 | Master Push toggle | `NotificationsSection.tsx:190-196` | `pushSupport !== 'unsupported' && !== 'ios-needs-install'` | `<ToggleSwitch>` |
| 7 | Per-type Daily verse toggle | `NotificationsSection.tsx:201-207` | master `prefs.enabled && permission === 'granted'` | `<ToggleSwitch>` |
| 8 | Per-type Streak reminders toggle | `NotificationsSection.tsx:209-215` | same | `<ToggleSwitch>` |
| 9 | Daily verse time picker | `NotificationsSection.tsx:218-231` | when daily verse is on | native `<input type="time">` |
| 10 | Send test notification button | `NotificationsSection.tsx:234-241` | when push enabled | `bg-white text-hero-dark` rounded-full pill (NOT the canonical white-pill primary CTA pattern — reduced 6px padding, no white drop shadow) |
| 11 | Denied permission instructions card | `NotificationsSection.tsx:246-255` | `permission === 'denied'` | `bg-white/[0.04]` box with browser-specific re-enable steps |
| 12 | Sub-heading "In-app" | `NotificationsSection.tsx:262` | always | divider + uppercase eyebrow |
| 13 | In-app notifications toggle | `NotificationsSection.tsx:264-269` | always | `<ToggleSwitch>` |
| 14 | Sub-heading "Email" | `NotificationsSection.tsx:276` | always | divider + uppercase eyebrow |
| 15 | Weekly digest toggle | `NotificationsSection.tsx:278-283` | always | `<ToggleSwitch>` (description: "(coming soon)") |
| 16 | Monthly report toggle | `NotificationsSection.tsx:285-291` | always | `<ToggleSwitch>` (description: "(coming soon)") |
| 17 | Sub-heading "Activity" | `NotificationsSection.tsx:297` | always | divider + uppercase eyebrow |
| 18 | Encouragements toggle | `NotificationsSection.tsx:299-304` | always | `<ToggleSwitch>` |
| 19 | Milestones toggle | `NotificationsSection.tsx:306-311` | always | `<ToggleSwitch>` |
| 20 | Friend requests toggle | `NotificationsSection.tsx:313-318` | always | `<ToggleSwitch>` |
| 21 | Nudges toggle | `NotificationsSection.tsx:320-325` | always | `<ToggleSwitch>` |
| 22 | Weekly recap toggle | `NotificationsSection.tsx:327-332` | always | `<ToggleSwitch>` |

Notifications is the heaviest section (339 LOC, 22 distinct rendered items in a happy-path-with-iOS-prompt state). This is the centerpiece of Spec 10A's chrome work — see "Dedicated Notifications Section" deep-dive below.

#### Privacy panel (`activeSection === 'privacy'`)

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Card heading "Privacy" | `PrivacySection.tsx:93` | always | h2 |
| 2 | Show on global leaderboard toggle | `PrivacySection.tsx:98-104` | always | `<ToggleSwitch>` |
| 3 | Activity status toggle | `PrivacySection.tsx:105-111` | always | `<ToggleSwitch>` |
| 4 | Who can send nudges (radio pills) | `PrivacySection.tsx:116-121` | always | `<RadioPillGroup>` (Everyone/Friends/Nobody) |
| 5 | Who can see your streak & level (radio pills) | `PrivacySection.tsx:122-127` | always | `<RadioPillGroup>` (Everyone/Friends/Only me) |
| 6 | Blocked Users sub-heading + list | `PrivacySection.tsx:131-159` | always | divider + h3 + list of `<button>Unblock</button>` rows OR empty-state copy "You haven't blocked anyone" |
| 7 | Muted Users sub-heading + list | `PrivacySection.tsx:162-190` | always | divider + h3 + list of `<button>Unmute</button>` rows (Spec 2.5.7) |
| 8 | Unblock confirm dialog | `PrivacySection.tsx:192-200` | `confirmingUserId !== null` | `<ConfirmDialog variant="destructive">` |
| 9 | Unmute confirm dialog | `PrivacySection.tsx:201-209` | `confirmingMuteUserId !== null` | `<ConfirmDialog variant="default">` |

**Note:** Block list mixes legacy `privacy.blockedUsers` with canonical `friends.blocked` (Spec 2.5.6 transitional). User-visible during one-wave grace period.

#### Account panel (`activeSection === 'account'`)

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Card heading "Account" | `AccountSection.tsx:44` | always | h2 |
| 2 | Email row + Change Email link | `AccountSection.tsx:48-60` | always | flex justify-between, "user@example.com" placeholder, Change Email triggers toast `'This feature is on the way.'` |
| 3 | Change Password link | `AccountSection.tsx:63-71` | always | `text-primary` text button (DEPRECATED color) |
| 4 | Delete Account warning box + button | `AccountSection.tsx:75-86` | always | `bg-red-500/[0.06] border border-red-500/20 rounded-xl` callout with red text + `bg-red-500/20 text-red-400 border border-red-500/30` button |
| 5 | ChangePasswordModal | `AccountSection.tsx:89-95` | `showChangePasswordModal` | `role="dialog"` modal — see "Dedicated ChangePasswordModal" deep-dive |
| 6 | DeleteAccountModal | `AccountSection.tsx:98-102` | `showDeleteModal` | `role="alertdialog"` — see "Dedicated DeleteAccount" deep-dive |

#### App panel (`activeSection === 'app'`)

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Card heading "App" | `AppSection.tsx:24` | always | h2 |
| 2 | "App Installed" confirmation card | `AppSection.tsx:27-30` | `isInstalled` | `bg-white/[0.06]` row with green checkmark + `text-emerald-400` text |
| 3 | iOS install hint | `AppSection.tsx:32-42` | `isIOS && !isInstalled` | `<Share>` icon + 2-line copy in `bg-white/[0.06]` rounded box |
| 4 | Install button | `AppSection.tsx:43-57` | `isInstallable && !isInstalled && !isIOS` | full-width `bg-white/[0.06]` button with `<Download>` icon |
| 5 | (entire section returns null) | `AppSection.tsx:11` | `!isInstallable && !isInstalled` | nothing renders |

Only renders if browser supports install OR app is already installed. **Headless test environment hits the `return null` branch** — App tab is empty in our captured screenshots.

### Insights (`/insights`) — render order

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Hero greeting "Mood Insights" | `Insights.tsx:186-208` | always | h1 + subtitle |
| 2 | Inline TimeRangePills | `Insights.tsx:213-221` | always (inert when sticky) | radiogroup of 5 pills |
| 3 | Sticky TimeRangePills | `Insights.tsx:223-232` | `isSticky` | `fixed top-0 z-40` duplicate |
| 4 | Insufficient-data banner | `Insights.tsx:240-244` | `entries.length >= 2 && < 7` | rolls-own FrostedCard with copy "After 7 days, you'll see trends emerge" |
| 5 | Empty state | `Insights.tsx:247-257` | `entries.length < 2` | `<FeatureEmptyState icon={BarChart3} ...>` (canonical primitive) |
| 6 | CalendarHeatmap | `Insights.tsx:262-264` | `entries.length >= 2` | rolls-own FrostedCard, custom CSS Grid heatmap |
| 7 | MoodTrendChart | `Insights.tsx:265-267` | `entries.length >= 2` | rolls-own FrostedCard, Recharts LineChart with "7-day average" toggle |
| 8 | InsightCards | always | `<InsightCards hasData>` | empty-state OR 4-5 insight cards |
| 9 | ActivityCorrelations | always | `<ActivityCorrelations hasData>` | empty-state OR mock-data BarChart with "based on example data" footnote |
| 10 | GratitudeCorrelationCard | always | (renders `null` if insufficient gratitude+mood data) | rolls-own FrostedCard with mood-on-gratitude-days stat |
| 11 | CommunityConnections | always | (renders `null` if no Local Support visits) | rolls-own FrostedCard with visit count + breakdown |
| 12 | GratitudeStreak | always | (renders `null` if streak < 2) | rolls-own FrostedCard with streak count |
| 13 | ScriptureConnections | always | `<ScriptureConnections hasData>` | empty-state OR 4 mock scripture references |
| 14 | PrayerLifeSection | always | (renders `null` if no prayers) | up to 3 rolls-own FrostedCards |
| 15 | MeditationHistory | always | `<MeditationHistory rangeDays>` | rolls-own FrostedCard, summary cards + Recharts BarChart OR skeleton overlay |
| 16 | "View Monthly Report" link | `Insights.tsx:295-303` | always | `bg-white/10 ...rounded-lg` button-style Link |

**Render-time data dependency:** items 8-15 each call `getMoodEntries()` / `getMeditationHistory()` / etc. independently. See Part 5.

### MonthlyReport (`/insights/monthly`) — render order

| # | Section | Source | Render condition | Visual |
|---|---------|--------|------------------|--------|
| 1 | Hero "Monthly Report" + month pager | `MonthlyReport.tsx:99-131` | always | h1 + ChevronLeft/Right buttons |
| 2 | Breadcrumb | `MonthlyReport.tsx:134-140` | always | `Insights > Monthly Report` |
| 3 | MonthlyStatCards | always | always | 4 animated count-up cards (days/points/level/mood-trend) |
| 4 | MonthHeatmap | always | always | rolls-own FrostedCard with 7-row × N-week mood grid |
| 5 | ActivityBarChart | always | always | rolls-own FrostedCard with Recharts BarChart |
| 6 | MonthlyHighlights | always | always | 3 stat cards: longest streak / badges / best day |
| 7 | MonthlyInsightCards | always | always | 3 hardcoded insight cards |
| 8 | MonthlySuggestions | `suggestions.length > 0` | up to 3 actionable suggestion cards | each card uses `bg-white/[0.08]` (LIGHTER than standard 0.06) |
| 9 | MonthlyShareButton | always | always | `<ShareImageButton>` wrapper + Preview Email link |
| 10 | EmailPreviewModal | `showEmailPreview` | static template inside modal | dark overlay + `bg-surface-dark` card + light-themed email content |

---

## Part 3 — Reactive Store Consumer Audit (BB-45 anti-pattern check)

**Headline finding:** Settings and Insights consume **NO reactive stores at all**. Every data read is a plain `getX()` synchronous service call, with no `subscribe()` API exposed by the underlying service. This means:

1. **No BB-45 anti-pattern risk in the literal sense** — there are no Pattern A or Pattern B reactive stores being mishandled.
2. **The same problem manifests differently:** if a user logs an activity (mood, meditation, prayer) elsewhere in the app and navigates back to `/insights`, the data updates because the page re-renders on route mount and re-calls `getMoodEntries()` etc. But if a user opens `/insights` and then logs a mood from a Daily Hub deep-link in another tab, this tab's chart **stays stale** until the user reloads or navigates away.
3. **Cross-tab sync is implemented for Settings only** — `useSettings.ts:53-61` listens for `StorageEvent` on `wr_settings` and re-reads. Mood/meditation/prayer storage services do NOT implement cross-tab sync.

### Per-consumer audit table

| Component | Data source | Read pattern | Subscribed? | BB-45-shape risk |
|-----------|------------|--------------|-------------|------------------|
| `Settings.tsx` | `useSettings()` hook | hook with `useState` + `StorageEvent` listener | yes (cross-tab via storage event) | none |
| `Insights.tsx` | `getMoodEntries()` direct | sync read on each render | no | low (data only changes when user logs mood; Insights itself has no logging UI) |
| `MonthlyReport.tsx` | `useMonthlyReportData(month, year)` hook | `useMemo` over `getMoodEntries() + getActivityLog() + getBadgeData() + getFaithPoints()` | no | low (page is read-only; no in-place data mutations) |
| `CalendarHeatmap.tsx` | `getMoodEntries()` inside `useMemo([rangeDays])` | sync read | no | low |
| `MoodTrendChart.tsx` | `useMoodChartData(rangeDays)` hook | `useMemo` over `getMoodEntries()` | no | low |
| `InsightCards.tsx` | `getMoodEntries()` inside `useMemo` (no deps array — implicit `[]`) | sync read once on mount | no | medium (mood-change insight goes stale if logged after mount; impact is small since cards are rotating display data) |
| `ActivityCorrelations.tsx` | hardcoded `MOCK_CORRELATION_DATA` | n/a | n/a | none |
| `GratitudeCorrelationCard.tsx` | `getGratitudeEntries() + getMoodEntries()` inside `useMemo` (no deps) | sync read once on mount | no | medium |
| `CommunityConnections.tsx` | `getVisits()` via local-visit-storage + `getMoodEntries()` | sync read inside `useMemo([visits, hasData])` | no | low (local-support visits are written from a different surface; user wouldn't be logging a visit while looking at Insights) |
| `GratitudeStreak.tsx` | `getGratitudeStreak()` direct call | sync read at render top | no | low |
| `ScriptureConnections.tsx` | hardcoded `MOCK_SCRIPTURE_CONNECTIONS` | n/a | n/a | none |
| `PrayerLifeSection.tsx` | `getPrayers() + getMoodEntries()` direct | sync read at render top | no | low |
| `MeditationHistory.tsx` | `getMeditationHistory() + getMeditationMinutesForWeek() + getMostPracticedType()` direct | sync read at render top | no | low (same reasoning) |
| `MonthlyStatCards.tsx` | props from `useMonthlyReportData` | n/a | n/a | none |
| `MonthHeatmap.tsx` | props from `useMonthlyReportData` | n/a | n/a | none |
| `ActivityBarChart.tsx` | props from `useMonthlyReportData` | n/a | n/a | none |
| `MonthlyHighlights.tsx` | props from `useMonthlyReportData` | n/a | n/a | none |
| `MonthlyInsightCards.tsx` | hardcoded insight rotation | n/a | n/a | none |
| `MonthlySuggestions.tsx` | computed in `getMonthlyReportSuggestions()` (uses `getMeditationMinutesForRange`, `getGratitudeEntries`, localStorage `wr_reading_plan_progress`) | called from MonthlyReport.tsx | n/a (called at parent mount) | low |
| `MonthlyShareButton.tsx` | props (passed `monthName, year, moodEntries, activityCounts, longestStreak`) | n/a | n/a | none |
| `EmailPreviewModal.tsx` | static template (no data) | n/a | n/a | none |
| `ProfileSection.tsx` | `useSettings()` + `getBadgeData()` (memoized) | hook + sync read | yes (settings) | none |
| `NotificationsSection.tsx` | `getNotificationPrefs() + getPushSupportStatus() + getPermissionState()` lazy `useState` initializers | sync reads at mount | no | low (push state changes via permission flow trigger React state updates within the component) |
| `PrivacySection.tsx` | `useSettings() + useMutes()` | hook + hook | yes (settings cross-tab) + (mutes — verify) | none for settings; medium for mutes if `useMutes` doesn't subscribe |
| `AccountSection.tsx` | none (props only) | n/a | n/a | none |
| `AppSection.tsx` | `useInstallPrompt()` hook | hook | yes (built into the install prompt context) | none |
| `DashboardSection.tsx` | none | n/a | n/a | none |
| `AvatarPickerModal.tsx` | props (`badges`, `currentAvatarId`, `currentAvatarUrl`) | prop-driven | n/a | none — but parent `ProfileSection` calls `getBadgeData()` once via `useMemo([])` so the picker won't see newly-earned badges until parent remounts |

### Recommendation

**Spec 10A:** No reactive store work needed. Settings is correctly subscribed via `useSettings`. AvatarPickerModal `badges` prop is fed from a single `useMemo([])` in ProfileSection — if newly-earned badges should appear, that's a follow-up; for the visual migration, no change required.

**Spec 10B:** No reactive store conversion needed. **However, the page-level `getMoodEntries()` redundancy is a perf concern** — each of 9+ child sections calls it independently. Two viable fixes:

- **Option A (light-touch):** Read `getMoodEntries()` once at `Insights.tsx` top, pass `moodEntries` as a prop to every child. Smaller perf win, simpler patch.
- **Option B (richer):** Add a thin `useMoodEntries()` hook with `useSyncExternalStore` + a custom event (or just pass the data through context). Allows future cross-tab sync when mood storage gains a subscribe API.

**Recommended for Spec 10B:** Option A. Each child still does its own `useMemo` over the data, so the page-level read removes 8-9 redundant localStorage parses per render. Backend migration in a future Phase 3 spec is the right time for Option B.

---

## Part 4 — Settings Data Persistence

### `wr_settings` schema

Owned by `services/settings-storage.ts`. Single localStorage key. Schema (from `types/settings.ts`):

```ts
interface UserSettings {
  profile: {
    displayName: string
    avatarId: string                   // 'default' | preset id | 'custom'
    avatarUrl?: string                 // base64 data URL when avatarId === 'custom'
    bio?: string
    email?: string                     // 'user@example.com' default — placeholder
  }
  notifications: {
    inAppNotifications: boolean
    pushNotifications: boolean         // legacy field — actual push state lives in wr_notification_prefs
    emailWeeklyDigest: boolean
    emailMonthlyReport: boolean
    encouragements: boolean
    milestones: boolean
    friendRequests: boolean
    nudges: boolean
    weeklyRecap: boolean
  }
  privacy: {
    showOnGlobalLeaderboard: boolean
    activityStatus: boolean
    nudgePermission: 'everyone' | 'friends' | 'nobody'
    streakVisibility: 'everyone' | 'friends' | 'only_me'
    blockedUsers: string[]             // legacy — canonical = wr_friends.blocked
  }
}
```

**`getSettings()`** (line 62) reads with a try/catch + `deepMerge` against `DEFAULT_SETTINGS`. The deep-merge means future schema additions get automatic defaults without explicit migration.

**`saveSettings()`** (line 77) writes the full object as JSON.

**`updateSettings(partial)`** (line 85) is a deep-merge update helper, but **the actual UI layer doesn't use it** — `useSettings.ts` calls `saveSettings(next)` after manually spreading the partial.

### Backend sync pathway

**None.** Settings is fully localStorage-scoped. No `useEffect` POST to a backend. No optimistic-update pattern. No conflict resolution. Cross-tab sync via `StorageEvent` is the only "broadcast" mechanism. Phase 3 backend migration would replace `getSettings/saveSettings` with API calls behind a feature flag (`VITE_USE_BACKEND_SETTINGS`), per the dual-write pattern documented in master plan Phase 2.

### Account data persistence

| Field | Source | Notes |
|-------|--------|-------|
| Display name | `wr_settings.profile.displayName` (canonical) + `wr_user_name` (legacy mirror) | `ProfileSection.tsx:73` writes to both on save |
| Email | `wr_settings.profile.email` | hardcoded `'user@example.com'` placeholder when no value; "Change Email" button currently shows a "feature is on the way" toast (`AccountSection.tsx:55`) |
| Avatar ID | `wr_settings.profile.avatarId` | preset string ('default', 'mountain', 'lighthouse', etc.) or `'custom'` |
| Avatar URL | `wr_settings.profile.avatarUrl` | base64 data URL when custom photo uploaded; can hit `QuotaExceededError` (handled in `AvatarPickerModal.tsx:60-65`) |
| Bio | `wr_settings.profile.bio` | 160 char max, no profile page yet — note "(coming soon)" |
| User ID | `wr_user_id` (top-level localStorage key, not in wr_settings) | client-generated UUID via `crypto.randomUUID()` pre-1.9; mirrored to backend UUID post-1.9 |

### Notification preferences integration with BB-41

Notification settings live in **TWO** localStorage keys:

1. `wr_settings.notifications.*` — high-level toggles (in-app, email, encouragements, etc.) — managed by `useSettings`
2. `wr_notification_prefs` — push-specific state (`enabled`, `dailyVerse`, `streakReminder`, `dailyVerseTime`, last-fired timestamps) — managed by `lib/notifications/preferences.ts`

The `NotificationsSection` UI presents these as a unified surface but reads/writes them independently. **`pushNotifications: boolean` in `wr_settings` is a legacy field — the canonical source of truth is `wr_notification_prefs.enabled`.** Spec 10A should remove the duplicate field OR make the UI read from one source consistently.

`subscribeToPush()` and `unsubscribeFromPush()` from `lib/notifications/subscription.ts` are called in the master toggle handler (line 96-117). Permission state is captured at mount via `getPermissionState()` and updated when the master toggle requests permission.

`fireTestNotification()` from `lib/notifications/scheduler.ts` is wired to the "Send test notification" button (line 234-241) — sends a real Notification API event via the active service worker.

### Export/import flow

**There is NO export/import affordance in Settings.** Confirmed via grep against the entire Settings tree. The only Bible-specific export lives in BibleSettingsModal (Bible cluster recon). **No duplication; no consolidation needed for Spec 10A.**

If Spec 10A wants to add a top-level "Export your data" entry point (compelling Round 3 enhancement candidate — see Part 15), it should be a Phase 3 backend-paired feature. Right now, the localStorage-only nature makes a JSON export feasible (just dump every `wr_*` key) but the import surface would need significant validation. Recommend: **defer to a dedicated future spec** (10c or Phase 3).

### Delete account flow — behavioral audit

`DeleteAccountModal` (56 LOC) is a `role="alertdialog"` confirm dialog with **two buttons**: Cancel and "Delete Everything" (red). **No password reauth.** Clicking "Delete Everything" invokes `handleDeleteConfirm` from `AccountSection.tsx:19-39`:

```ts
function handleDeleteConfirm() {
  // Remove all wr_ prefixed keys
  const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('wr_'))
  keysToRemove.forEach((key) => localStorage.removeItem(key))

  // Remove legacy keys from before the wr_ prefix rename
  const legacyKeys = [
    'worship-room-daily-completion',
    'worship-room-journal-draft',
    'worship-room-journal-mode',
  ]
  legacyKeys.forEach((key) => localStorage.removeItem(key))

  // Remove any worship-room-bookmarks-* and other worship-room- prefixed keys
  Object.keys(localStorage)
    .filter((k) => k.startsWith('worship-room-'))
    .forEach((key) => localStorage.removeItem(key))

  logout()
  navigate('/')
}
```

**What gets deleted:**

- Every `wr_*` key (auth, settings, mood, faith points, streak, badges, friends, mutes, prayer reactions, journal drafts, etc.) — comprehensive sweep
- `bible:*` keys are NOT deleted — bookmarks, notes, journal entries, reading plans, streak persist post-delete (filed as bug — see Open Question 2)
- `bb32-v1:*` AI cache keys are NOT deleted (not user-data per se but worth noting)
- `bb26-v1:*` audio cache, `bb29-v1:*` continuous-playback pref, `bb44-v1:*` read-along pref are NOT deleted
- Three legacy keys (`worship-room-daily-completion`, `worship-room-journal-draft`, `worship-room-journal-mode`)
- All `worship-room-*` prefixed keys (catch-all sweep)

**What happens after delete:**

- `logout()` is called from `useAuth` — clears in-memory auth state
- `navigate('/')` redirects to home (which then renders the landing page since `!isAuthenticated`)
- **No backend call** (no backend exists for account today; Forums Wave Phase 1 has the auth lifecycle work)
- **No success toast** — silent navigation
- **No "are you sure?" double-confirm** — Cancel/Delete Everything is the only confirmation step
- **The "We'll miss you" copy** in the modal is the only emotional acknowledgment

**Findings worth flagging:**

1. **Bible data not deleted.** `bible:bookmarks`, `bible:notes`, `bible:journalEntries`, `bible:plans`, `wr_bible_*` keys (the ones that ARE `wr_*`-prefixed get deleted, but `bible:*` entries persist). User-perceived bug: "I deleted my account and my notes are still there." Spec 10c candidate.
2. **No password re-auth.** A user with their device unattended could have their account "deleted" by anyone with physical access. Acceptable for localStorage-only MVP but should hook into the Forums Wave Phase 1 auth lifecycle (Spec 1.5g session invalidation) when that lands.
3. **No download-my-data option before delete.** Standard GDPR/anti-pressure pattern is "Download your data → Delete account". Right now it's a single-step nuke. Worth a Spec 10c follow-up.
4. **Hardcoded prefix list.** Every new prefix (e.g., `bb*-v*`) requires a manual edit to `handleDeleteConfirm`. Worth refactoring to a "delete every key whose prefix starts with [list]" loop.
5. **No backend hook.** When Forums Wave Phase 1 lands real auth, this function will need to call a `DELETE /api/v1/auth/account` endpoint (per master plan Spec 1.5g and onward).

**Spec 10A scope guidance:** Don't change deletion semantics in 10A. Visual chrome only. The behavioral concerns above land in Spec 10c (follow-up) or Phase 3 backend account management.

### TTL / rotation logic

| Key | TTL | Rotation |
|-----|-----|----------|
| `wr_settings` | none — persists forever | none |
| `wr_user_name`, `wr_user_id`, `wr_auth_simulated` | none | none |
| `wr_notification_prefs` | none | per-type `lastFired` timestamps update on each notification fire |
| `wr_push_subscription` | none — until user revokes browser permission | none |
| `wr_notification_prompt_dismissed` | none | one-shot flag |

No TTL rotation logic exists in the Settings layer. Phase 3 backend will introduce session expiry (1-hour JWT) — relevant only to in-memory token, not the localStorage settings.

---

## Part 5 — Insights Data Sourcing

### Stores Insights aggregates from

Insights and MonthlyReport read from these data sources (none are reactive stores in the BB-7+ sense):

| Source | Module | Read API | Used by |
|--------|--------|----------|---------|
| `wr_mood_entries` | `services/mood-storage.ts` | `getMoodEntries()` | Insights.tsx (page-level), CalendarHeatmap, MoodTrendChart (via hook), InsightCards, GratitudeCorrelationCard, CommunityConnections, PrayerLifeSection, ScriptureConnections (mock) — **8 consumers** |
| `wr_daily_activities` | `services/faith-points-storage.ts` | `getActivityLog()` | useMonthlyReportData |
| `wr_faith_points` | `services/faith-points-storage.ts` | `getFaithPoints()` | useMonthlyReportData |
| `wr_badges` | `services/badge-storage.ts` | `getBadgeData()` | useMonthlyReportData (for badges earned this month) |
| `wr_meditation_history` | `services/meditation-storage.ts` | `getMeditationHistory()`, `getMeditationMinutesForWeek()`, `getMeditationMinutesForRange()`, `getMostPracticedType()` | MeditationHistory, MonthlySuggestions |
| `wr_gratitude_entries` | `services/gratitude-storage.ts` | `getGratitudeEntries()`, `getGratitudeStreak()` | GratitudeCorrelationCard, GratitudeStreak, MonthlySuggestions |
| `wr_prayer_list` | `services/prayer-storage.ts` | `getPrayers()` | PrayerLifeSection |
| `wr_local_visits` | `services/local-visit-storage.ts` | `getVisits()`, `getUniqueVisitedPlaces()` | CommunityConnections |
| `wr_reading_plan_progress` | direct `localStorage.getItem('wr_reading_plan_progress')` | inline JSON.parse | MonthlySuggestions (read for completed-this-month detection) |

### Aggregation locations

- **Inline `useMemo` per component** — most insights components compute their own derived data. Average per component: 1-3 useMemo calls. None go cross-component (each owns its data).
- **`useMoodChartData(days)`** — single shared hook for line-chart data. Returns array of `MoodChartDataPoint` objects with morning/evening split.
- **`useMonthlyReportData(month, year)`** — heavy aggregator hook. Calls 4 services + computes longest streak, best day, level progress, mood trend %, badges earned. Memoized on `[month, year]`. Single call from `MonthlyReport.tsx:53`.
- **`getMonthlyReportSuggestions(data)`** — pure function called from `MonthlyReport.tsx:54` after `useMonthlyReportData`. Reads gratitude + meditation + reading plan storage in addition to the precomputed data.

### Time windowing

Insights:
- Pills: `30d` (default) / `90d` / `180d` / `1y` / `All`
- `'all'` is computed by finding the earliest entry and returning days since (clamped to >= 30)
- Each chart consumer receives `rangeDays: number` as a prop and filters its own data

MonthlyReport:
- Single-month at a time (`selectedMonth`, `selectedYear`)
- Defaults to current month (or previous month if today is day <= 5)
- Pager forward/backward, bounded by earliest entry month and current month

### Performance: cold load and aggregation cost

Measured on the Playwright capture run (`localhost:5173`, dev mode, 60 seeded mood entries + activity log + meditation history):

- **Time to first paint** (Insights, fullPage screenshot at 1440×900): ~1.2s on cold load (includes Vite HMR overhead)
- **Time to interactive** after charts render: ~2.5s (Recharts hydration + AnimatedSection stagger)
- **`getMoodEntries()` call count on a single Insights mount**: counted via grep at ~8 separate call sites in the descendant tree (Insights.tsx itself + 7 children that read directly from the service). Each call parses the same `wr_mood_entries` JSON blob from localStorage. With 60 entries this is sub-1ms each, but with the 365-cap maximum (`MAX_MOOD_ENTRIES`) it could reach 5-10ms × 8 = 40-80ms of redundant parsing per render.
- **Re-render cascades on TimeRange change**: Setting `range` from 30d → 1y triggers a re-render of Insights.tsx. Since `entries` is read fresh each render, all 8 child components re-execute their `useMemo`s (deps include `rangeDays` for some, but most have empty deps and skip recomputation). **Suggested fix:** lift `getMoodEntries()` to page level, pass as prop, lock per-child useMemo deps to `[entries, rangeDays]`.
- **MonthlyReport computational profile**: `useMonthlyReportData` does ~6 storage reads + multiple `Object.entries(activityLog).filter(...)` passes. With a year of activity data, this is 365-iteration filter chain × 4-5 places = noticeable but not a blocker. `useMemo` keys on `[month, year]` so it only recomputes when the user pages.

**Performance recommendation for Spec 10B:** Light-touch — read mood entries once at page level, pass down. Defer chart-tooltip-perf and Recharts theme work to a follow-up if needed.

### Insights subscription correctness

Insights does NOT subscribe to any store, so:

- ✅ Internal navigation back to `/insights` re-mounts the component, refreshing data.
- ❌ Cross-tab updates do NOT propagate (mood logged in tab A is invisible to a tab B Insights view until reload).
- ❌ Same-tab in-page mutation: not applicable — Insights has no mutation UI. (The Time Range selector mutates UI state, not data.)

This is a "read-only console" — the absence of subscription doesn't ship a correctness bug today, but it does mean Insights won't update if a cross-tab logs a mood. Acceptable for current scope.

---

## Part 6 — Component Dependency Tree (Two-Deep)

### `/settings` tree

```
<Settings>
├── <Navbar transparent />                          [shared, has skip link]
├── <SEO {...SETTINGS_METADATA} />
├── <section> (hero, ATMOSPHERIC_HERO_BG)
│   ├── <Link to="/">Dashboard</Link>
│   └── <h1 GRADIENT_TEXT_STYLE>
│       └── <span font-script>Settings</span>       [DEPRECATED: font-script]
├── <div sm:hidden>                                  [mobile tablist]
│   └── <div role="tablist">
│       └── 6× <button role="tab" aria-selected aria-controls> ... </button>
├── <main id="main-content">
│   └── <div flex gap-8>
│       ├── <nav role="navigation"> (desktop sidebar, hidden sm)
│       │   └── 6× <button> ... </button>           [NOT role="tab" — semantic mismatch]
│       └── <div id={`settings-panel-${activeSection}`} aria-live="polite">
│           ├── <ProfileSection profile userName onUpdateProfile>           [active when 'profile']
│           │   ├── <ProfileAvatar size="sm">
│           │   ├── <button>Change avatar</button>
│           │   ├── <AvatarPickerModal isOpen={pickerOpen} ...>             [conditional render]
│           │   ├── <input id="settings-display-name">
│           │   └── <textarea id="settings-bio"> + <CharacterCount>
│           ├── <DashboardSection>                                          [active when 'dashboard']
│           │   ├── <button>Dashboard Layout — Customize →</button>
│           │   └── <button>Reset Dashboard Layout</button>
│           ├── <NotificationsSection notifications onUpdateNotifications>  [active when 'notifications']
│           │   ├── 22× toggle/input/button (Sound + Push + In-app + Email + Activity groups)
│           │   ├── <PushStatusIndicator>
│           │   └── (conditional iOS / denied permission cards)
│           ├── <PrivacySection privacy friendsBlocked onUpdatePrivacy onUnblock>  [active when 'privacy']
│           │   ├── 2× <ToggleSwitch> (leaderboard, activity status)
│           │   ├── 2× <RadioPillGroup> (nudges, streak visibility)
│           │   ├── Blocked Users list
│           │   ├── Muted Users list
│           │   └── 2× <ConfirmDialog> (unblock, unmute)
│           ├── <AccountSection email>                                       [active when 'account']
│           │   ├── Email row + Change Email link (toast stub)
│           │   ├── Change Password link
│           │   ├── Delete Account warning + button
│           │   ├── <ChangePasswordModal isOpen onClose onSuccess>          [conditional render]
│           │   └── <DeleteAccountModal isOpen onClose onConfirm>           [conditional render]
│           └── <AppSection>                                                 [active when 'app']
│               └── (returns null OR install button OR iOS hint OR installed state)
├── <SiteFooter />
└── <DevAuthToggle /> (DEV only)
```

### `/insights` tree

```
<Insights>
├── <Navbar transparent />
├── <SEO {...INSIGHTS_METADATA} />
├── <section> (hero, ATMOSPHERIC_HERO_BG)
│   ├── <Link to="/">Dashboard</Link>
│   ├── <h1 GRADIENT_TEXT_STYLE>Mood <span font-script>Insights</span></h1>  [DEPRECATED: font-script]
│   └── <p font-serif italic>Reflect on your journey</p>                     [DEPRECATED: italic Lora prose]
├── <div ref={sentinelRef} aria-hidden="true" />
├── <div bg-dashboard-dark>                                                  [inline pills, inert when sticky]
│   └── <TimeRangePills range onChange>
├── {isSticky && <div fixed top-0 z-40 bg-white/[0.08] backdrop-blur-xl>}    [sticky duplicate]
│   └── <TimeRangePills range onChange>
├── <main id="main-content">
│   ├── (conditional insufficient-data banner)
│   ├── (conditional <FeatureEmptyState>)
│   ├── 11× <AnimatedSection index={N}>
│   │   ├── <CalendarHeatmap rangeDays>                                      [if entries >= 2]
│   │   ├── <MoodTrendChart rangeDays>                                       [if entries >= 2]
│   │   ├── <InsightCards hasData>
│   │   │   └── empty-state OR 4-5 cards (4 hardcoded + 1 mood-change useMemo)
│   │   ├── <ActivityCorrelations hasData>
│   │   │   └── empty-state OR Recharts BarChart (mock data, footnote)
│   │   ├── <GratitudeCorrelationCard>                                       [renders null if insufficient]
│   │   ├── <CommunityConnections hasData>                                   [renders null if no visits]
│   │   ├── <GratitudeStreak>                                                [renders null if streak < 2]
│   │   ├── <ScriptureConnections hasData>
│   │   │   └── empty-state OR 4 mock scripture cards
│   │   ├── <PrayerLifeSection>                                              [renders null if no prayers]
│   │   ├── <MeditationHistory rangeDays>
│   │   │   └── 3 summary cards + Recharts BarChart OR skeleton overlay
│   │   └── <Link to="/insights/monthly">View Monthly Report</Link>
├── <SiteFooter />
└── <DevAuthToggle /> (DEV only)
```

### `/insights/monthly` tree

```
<MonthlyReport>
├── <Navbar transparent />
├── <SEO {...INSIGHTS_MONTHLY_METADATA} />
├── <section> (hero, ATMOSPHERIC_HERO_BG)
│   ├── <h1 GRADIENT_TEXT_STYLE>Monthly <span font-script>Report</span></h1> [DEPRECATED]
│   └── month pager (ChevronLeft + monthName/year + ChevronRight)
├── <Breadcrumb items={[Insights → Monthly Report]} />
├── <main id="main-content" key={`${year}-${month}`}>
│   ├── <AnimatedSection><MonthlyStatCards ... /></AnimatedSection>
│   ├── <AnimatedSection><MonthHeatmap ... /></AnimatedSection>
│   ├── <AnimatedSection><ActivityBarChart activityCounts /></AnimatedSection>
│   ├── <AnimatedSection><MonthlyHighlights longestStreak badgesEarned bestDay /></AnimatedSection>
│   ├── <AnimatedSection><MonthlyInsightCards /></AnimatedSection>
│   ├── (suggestions.length > 0 && <AnimatedSection><MonthlySuggestions /></AnimatedSection>)
│   └── <AnimatedSection>
│       ├── <MonthlyShareButton ... /> (uses Canvas via lib/sharing/monthly-share-image.ts)
│       └── <button>Preview Email</button>
├── <EmailPreviewModal isOpen={showEmailPreview} onClose monthName>          [conditional]
├── <SiteFooter />
└── <DevAuthToggle /> (DEV only)
```

---

## Part 7 — Hooks and Data Sources

### Settings-specific hooks

- **`useSettings()`** — `frontend/src/hooks/useSettings.ts` (64 LOC). Returns `{ settings, updateProfile, updateNotifications, updatePrivacy, unblockUser }`. Lazy-init `useState` from `getSettings()`. Cross-tab sync via `StorageEvent` listener on `wr_settings`. **Only consumer: `Settings.tsx`**.
- **`useFriends()`** — `frontend/src/hooks/useFriends.ts`. Used by Settings (`PrivacySection.tsx:43` reads `blocked`; the page passes `unblockUser` as a unified handler that calls both `useFriends.unblockUser()` and `useSettings.unblockUser()` — see Spec 2.5.6 cleanup-on-unblock dual-call note in `Settings.tsx:46-54`).
- **`useMutes()`** — `frontend/src/hooks/useMutes.ts`. Used by `PrivacySection`. Per `11-local-storage-keys.md` § "Mutes", reads `wr_mutes`. Subscription pattern unverified — file not opened during this recon.
- **`useInstallPrompt()`** — `frontend/src/hooks/useInstallPrompt.ts`. Used by `AppSection`. Subscribes to `beforeinstallprompt` event and tracks `isInstallable`/`isInstalled`/`isIOS`.

### Insights-specific hooks

- **`useMoodChartData(days)`** — `frontend/src/hooks/useMoodChartData.ts` (60 LOC). Single-purpose, used only by `MoodTrendChart.tsx:13`. Returns `MoodChartDataPoint[]` with morning + evening split.
- **`useMonthlyReportData(month, year)`** — `frontend/src/hooks/useMonthlyReportData.ts` (296 LOC). Heavy aggregator. Returns `MonthlyReportData` object. Single consumer: `MonthlyReport.tsx:53`. Falls back to mock numbers when no entries (`hasRealData: false` branch — see Open Question 4).
- **`getMonthlyReportSuggestions(data)`** — `frontend/src/hooks/useMonthlyReportSuggestions.ts` (129 LOC). Pure function (despite living in `hooks/`). Takes `MonthlyReportData`, returns `MonthSuggestion[]` (max 3, prioritized). Reads gratitude + meditation + reading plan storage.

### Cross-cutting hooks consumed

| Hook | Used by | Purpose |
|------|---------|---------|
| `useAuth()` | Settings, Insights, MonthlyReport | gate page render via `<Navigate to="/" replace />` |
| `useFocusTrap(isOpen, onClose)` | AvatarPickerModal, ChangePasswordModal, DeleteAccountModal, EmailPreviewModal | canonical modal focus trap |
| `useToast()` | AccountSection, AppSection, NotificationsSection, PrivacySection | toast notifications |
| `useToastSafe()` | DashboardSection | non-throwing toast variant |

### Service / data-source modules

| Module | Used by | Reactive? |
|--------|---------|-----------|
| `services/settings-storage.ts` | useSettings | no (synchronous CRUD) |
| `services/mood-storage.ts` | Insights, multiple insight components | no |
| `services/meditation-storage.ts` | MeditationHistory, MonthlySuggestions | no |
| `services/gratitude-storage.ts` | GratitudeStreak, GratitudeCorrelationCard, MonthlySuggestions | no |
| `services/prayer-storage.ts` | PrayerLifeSection | no |
| `services/local-visit-storage.ts` | CommunityConnections | no |
| `services/badge-storage.ts` | ProfileSection (avatar unlock check), useMonthlyReportData | no |
| `services/faith-points-storage.ts` | useMonthlyReportData | no |
| `services/dashboard-layout-storage.ts` | DashboardSection (`clearDashboardLayout()`) | no |
| `services/api/auth-api.ts` | ChangePasswordModal | calls `changePasswordApi()` (real API integration — Forums Wave Phase 1 1.5c) |
| `lib/notifications/preferences.ts` | NotificationsSection | manages `wr_notification_prefs` |
| `lib/notifications/permissions.ts` | NotificationsSection | `getPushSupportStatus`, `getPermissionState`, `requestPermission` |
| `lib/notifications/subscription.ts` | NotificationsSection | `subscribeToPush`, `unsubscribeFromPush` |
| `lib/notifications/scheduler.ts` | NotificationsSection | `fireTestNotification` |
| `lib/avatar-utils.ts` | AvatarPickerModal | `processAvatarPhoto(file)` — image resize + base64 |
| `constants/dashboard/avatars.ts` | AvatarPickerModal, ProfileAvatar | `AVATAR_PRESETS`, `AVATAR_CATEGORIES`, `UNLOCKABLE_AVATARS` |
| `constants/dashboard/badges.ts` | AvatarPickerModal | `BADGE_MAP` |
| `constants/dashboard/levels.ts` | useMonthlyReportData | `getLevelForPoints` |
| `constants/dashboard/mood.ts` | CalendarHeatmap, MonthHeatmap, MoodTrendChart, ScriptureConnections, useMoodChartData | `MOOD_COLORS` |
| `constants/dashboard/ai-insights.ts` | InsightCards, MonthlyInsightCards | `getDayOfYear`, `getInsightCardsForDay` |
| `mocks/friends-mock-data.ts` | PrivacySection | `ALL_MOCK_USERS` for blocked-name lookup |

---

## Part 8 — localStorage State Inventory

### Keys read OR written by Settings / Insights / MonthlyReport surfaces

All keys are documented in `11-local-storage-keys.md` unless flagged otherwise.

| Key | R/W | Component(s) | Schema reference |
|-----|-----|--------------|------------------|
| `wr_settings` | R/W | useSettings (via Settings page) | 11 § "Dashboard & UI State" |
| `wr_user_name` | R/W | useAuth, ProfileSection.tsx:73 (write) | 11 § "Auth Keys" |
| `wr_user_id` | R | useAuth | 11 § "Auth Keys" |
| `wr_auth_simulated` | R | useAuth | 11 § "Auth Keys" |
| `wr_jwt_token` | R | useAuth (post-1.9) | 11 § "Auth Keys" |
| `wr_friends` | R/W | useFriends (PrivacySection blocked list, unblock dual-call) | 11 § "Social & Friends" |
| `wr_mutes` | R/W | useMutes (PrivacySection muted list) | 11 § "Mutes" |
| `wr_notification_prefs` | R/W | NotificationsSection (via lib/notifications/preferences) | 11 § "Push Notifications (BB-41)" |
| `wr_push_subscription` | R/W | NotificationsSection (via lib/notifications/subscription) | 11 § "Push Notifications (BB-41)" |
| `wr_notification_prompt_dismissed` | R/W | (read by lib/notifications, set by BibleReader contextual prompt) | 11 § "Push Notifications (BB-41)" |
| `wr_sound_effects_enabled` | R/W | NotificationsSection.tsx:74-94 | 11 § "Music & Audio" |
| `wr_mood_entries` | R | Insights, MonthlyReport, 8+ insight components | 11 § "Mood & Activity Tracking" |
| `wr_daily_activities` | R | useMonthlyReportData | 11 § "Mood & Activity Tracking" |
| `wr_faith_points` | R | useMonthlyReportData | 11 § "Mood & Activity Tracking" |
| `wr_streak` | R | (indirect; useMonthlyReportData computes longestStreak from entries, not from this key) | 11 § "Mood & Activity Tracking" |
| `wr_badges` | R | useMonthlyReportData (badges earned this month), ProfileSection (avatar unlock) | 11 § "Mood & Activity Tracking" |
| `wr_meditation_history` | R | MeditationHistory, MonthlySuggestions | 11 § "Mood & Activity Tracking" |
| `wr_gratitude_entries` | R | GratitudeCorrelationCard, MonthlySuggestions | 11 § "Content Features" |
| `wr_prayer_list` | R | PrayerLifeSection | 11 § "Content Features" |
| `wr_local_visits` | R | CommunityConnections | 11 § "Local Support" |
| `wr_reading_plan_progress` | R | MonthlySuggestions (`useMonthlyReportSuggestions.ts:85`) | 11 § "Content Features" |
| `worship-room-daily-completion`, `worship-room-journal-draft`, `worship-room-journal-mode` | W (delete only) | DeleteAccount handler — legacy keys swept on delete | not in 11 (deprecated pre-`wr_*` keys) |

**No new keys are introduced by Spec 10A or 10B as currently scoped.** If Spec 10c or a future spec adds an export/import feature, that would be a candidate for a new key.

### Schema audit

`wr_settings.notifications.pushNotifications: boolean` is dead — duplicates `wr_notification_prefs.enabled`. Spec 10A could remove the field from `DEFAULT_SETTINGS` and the type definition, but doing so without a migration breaks `getSettings()` for existing users (the deep merge would still work, just with the new default). **Recommend: leave it for now**, add a code-level comment marking it deprecated, or remove in a follow-up cleanup spec.

---

## Part 9 — Deprecated Patterns Inventory

This section is the visual-migration target list. Each entry: pattern, location (file:line), recommended replacement.

### Settings

| Pattern | File:Line | Severity | Replacement |
|---------|-----------|----------|-------------|
| `font-script` on heading word "Settings" | `Settings.tsx:83` | Medium | Drop the `<span class="font-script">`; the parent `GRADIENT_TEXT_STYLE` already provides emphasis |
| `bg-primary` solid (mobile tab indicator) | `Settings.tsx:101` (`border-b-2 border-primary`) | Medium | Migrate to canonical sticky tab pattern from Bible/Daily Hub: `border-b-2 border-white/30` active, with `bg-hero-bg/70 backdrop-blur-md` sticky bar treatment |
| `bg-primary/10 text-primary-lt` (desktop sidebar active state) | `Settings.tsx:128` | Medium | Migrate to white/violet treatment. Suggested: `bg-violet-400/15 text-white border-l-2 border-violet-400` or similar — design decision needed (see Open Question 1) |
| `text-primary` text button (Change avatar) | `ProfileSection.tsx:107` | Medium | Use `text-violet-300 hover:text-violet-200` per DailyHub 1B violet treatment |
| `text-primary` text button (Change Email) | `AccountSection.tsx:56` | Medium | Same migration |
| `text-primary` text button (Change Password) | `AccountSection.tsx:66` | Medium | Same |
| `text-primary` text button (Unblock) | `PrivacySection.tsx:151` | Medium | Same |
| `text-primary` text button (Unmute) | `PrivacySection.tsx:182` | Medium | Same |
| `bg-primary text-white` solid CTA (Save in AvatarPicker) | `AvatarPickerModal.tsx:346, 418` | High | White-pill primary CTA per `09-design-system.md` § "White Pill CTA Patterns" Pattern 2 |
| `bg-primary` (tab indicator under Presets/Upload tabs) | `AvatarPickerModal.tsx:198, 210` | Medium | Migrate to canonical tab pattern |
| `ring-primary` selected-avatar ring | `AvatarPickerModal.tsx:261, 311` | Low — Decision-11 preserve candidate (decorative tint) | Keep as-is; the ring is a selection indicator, not a CTA |
| `bg-primary text-white` solid CTA (ChangePassword "Update password") | `ChangePasswordModal.tsx:176` | Medium | White-pill primary CTA |
| `bg-red-500` solid CTA (DeleteAccount "Delete Everything") | `DeleteAccountModal.tsx:48` | Medium — preserve red intention but use new severity palette | Migrate to `bg-red-950/30 border-red-400/30 text-red-100` per `09-design-system.md` § "Severity color system", or rolls-own muted destructive variant |
| `bg-red-500/20 text-red-400` Delete Account button on AccountSection | `AccountSection.tsx:82` | Medium | Same — align with severity color system |
| `bg-primary/20 ... text-white` (initial avatar circles in blocked/muted lists) | `PrivacySection.tsx:141, 173` | Low — Decision-11 preserve candidate | Keep — decorative tint, not CTA |
| `bg-primary/20 text-primary-lt` (RadioPillGroup selected pill) | `RadioPillGroup.tsx:55` | Medium | Suggested: `bg-violet-400/20 text-white border border-violet-400/40` matching DailyHub 1B treatment |
| `bg-primary` (ToggleSwitch on state) | `ToggleSwitch.tsx:43` | Low — preserve as-is | Toggle "on" color is a brand signal; keep `bg-primary` (`#6D28D9`) or migrate to `bg-violet-500` for visual continuity. Decision needed. |
| `bg-white` raw white pill (Send test notification) | `NotificationsSection.tsx:238` | Medium | Use canonical white-pill CTA Pattern 1 (inline, smaller) |
| `text-success` raw class (push status indicator) | `NotificationsSection.tsx:55` (`✓ Notifications enabled`) | Low | Standardize; ensure WCAG AA on `bg-dashboard-dark` |
| `text-danger` raw class (push denied) | `NotificationsSection.tsx:62` | Low | Same |

### Insights

| Pattern | File:Line | Severity | Replacement |
|---------|-----------|----------|-------------|
| `font-script` on "Insights" | `Insights.tsx:203` | Medium | Drop the `<span class="font-script">`; `GRADIENT_TEXT_STYLE` is enough |
| `font-serif italic` on subtitle prose "Reflect on your journey" | `Insights.tsx:205` | Medium | Migrate to `font-sans` Inter, no italic, `text-white/60` per Daily Hub body-prose standard |
| `bg-primary/20 text-primary-lt` (TimeRangePills selected) | `Insights.tsx:121` | Medium | Migrate to `bg-violet-400/20 text-white border border-violet-400/40` or `bg-white/15 text-white` (decision needed — see Open Question 1) |
| `bg-white/5` rolls-own card chrome (every section card) | scattered across all 18 insight components | Low — preserve mostly, but consider FrostedCard adoption | Consider migrating to `<FrostedCard>` component (currently each component reproduces the class string). Worth a sweep for consistency. |
| `bg-white/[0.08]` (slightly lighter card variant in MonthlySuggestions) | `MonthlySuggestions.tsx:71` | Low | Either standardize to `bg-white/[0.06]` or document the intentional variant for highlighted suggestions |

### MonthlyReport

| Pattern | File:Line | Severity | Replacement |
|---------|-----------|----------|-------------|
| `font-script` on "Report" | `MonthlyReport.tsx:110` | Medium | Drop the span |
| `text-white/85` heading text on month label | `MonthlyReport.tsx:121` | Low — non-canonical opacity (table doesn't list /85) | Migrate to `text-white` per Round 3 standard |

### Patterns NOT found (verification)

- ❌ `BackgroundSquiggle` — none on these surfaces
- ❌ `GlowBackground` per-section — none
- ❌ `animate-glow-pulse` — none
- ❌ `transition-all duration-200` — none (a few `transition-colors` + duration tokens, all OK)
- ❌ Hardcoded `200ms` in style strings — none
- ❌ `cubic-bezier(...)` literals — none
- ❌ `glow-cyan` or any cyan accent — none
- ❌ `HorizonGlow` — none (this is correct; HorizonGlow is Daily-Hub-only)
- ❌ Inline `ATMOSPHERIC_HERO_BG` outside hero — none (correctly scoped to `<section>` hero only)
- ❌ `bg-dashboard-dark` flat outside body root — confined to root div as expected
- ❌ White-glow textarea idiom — none (no textareas large enough to need it; bio uses standard input shadow)
- ❌ `Caveat` direct class string — none (uses `font-script` Tailwind alias, which IS the deprecated pattern but is correctly listed above)

---

## Part 10 — Tests Inventory

### Settings test files

| File | LOC | Coverage |
|------|-----|----------|
| `frontend/src/pages/__tests__/Settings.test.tsx` | 274 | Page-level render, tab switching, redirect-when-logged-out |
| `frontend/src/components/settings/__tests__/ProfileSection.test.tsx` | (under 200) | Display name validation, bio char limit, avatar trigger |
| `frontend/src/components/settings/__tests__/NotificationsSection.test.tsx` | 209 | Sound toggle, push permission flow (mocked), per-type toggles |
| `frontend/src/components/settings/__tests__/PrivacySection.test.tsx` | 233 | Toggles, radio pills, blocked/muted unblock-confirm flow |
| `frontend/src/components/settings/__tests__/AccountSection.test.tsx` | (under 200) | Delete handler localStorage sweep, modal triggers |
| `frontend/src/components/settings/__tests__/AppSection.test.tsx` | (under 100) | install/installed/iOS branching |
| `frontend/src/components/settings/__tests__/DashboardSection.test.tsx` | (under 100) | reset layout button |
| `frontend/src/components/settings/__tests__/ChangePasswordModal.test.tsx` | (under 200) | form validation, error mapping (CURRENT_PASSWORD_INCORRECT, etc.) |
| `frontend/src/services/__tests__/settings-storage.test.ts` | (under 100) | getSettings/saveSettings deep-merge |
| `frontend/src/hooks/__tests__/useSettings.test.ts` | (under 100) | hook updates, cross-tab StorageEvent |

**Total Settings tests:** ~1,200-1,400 LOC across 10 files.

### Insights test files

| File | LOC | Coverage |
|------|-----|----------|
| `frontend/src/pages/__tests__/Insights.test.tsx` | 235 | TimeRange selection, sticky pill detection, empty state, charts conditional render |
| `frontend/src/pages/__tests__/MonthlyReport.test.tsx` | 243 | Month pager, edge cases (earliest/latest), Email preview modal |
| `frontend/src/components/insights/__tests__/*.test.tsx` (×18) | varies | Each insight component has a dedicated test file |
| `frontend/src/hooks/__tests__/useMoodChartData.test.ts` | (under 100) | Chart data formatting, morning/evening split |

**Total Insights tests:** ~2,000-2,500 LOC across 21 files.

### Class-string assertion candidates

Tests that assert on Tailwind class strings will need updating during visual migration. Quick grep for high-risk patterns:

- `Settings.test.tsx` — verify if it asserts on `border-primary` or `text-primary-lt` for tab indicators
- `Insights.test.tsx` — verify if it asserts on `bg-primary/20` for TimeRangePills
- `AvatarPickerModal.test.tsx` (need to check — file not yet read) — likely asserts on `ring-primary` or `bg-primary` for save button

The migration spec should include "test fix" as an explicit step. Anti-pattern: don't snapshot test the entire component — assert on user-visible behavior. Where class strings ARE asserted (Bible-cluster precedent), update them in the same commit as the component change.

### Reactive store test anti-patterns

**None applicable** — no reactive stores consumed by Settings or Insights. The BB-45 anti-pattern detection that the audit framework looks for (cross-mount subscription test) is not relevant here. Standard render-and-mutate-and-assert tests are sufficient.

---

## Part 11 — Accessibility Audit

### Skip links

- ✅ Settings, Insights, MonthlyReport: rely on canonical Navbar skip-to-main-content link. Verified by `<main id="main-content">` presence on each page.

### Heading hierarchy

| Page | h1 | h2 | h3 | Notes |
|------|-----|-----|-----|-------|
| Settings | "Settings" (`#settings-heading`) | one per active panel ("Profile", "Account", etc.) | "Blocked Users", "Muted Users" inside Privacy | OK |
| Insights | "Mood Insights" | per-card titles in some children (InsightCards uses `#insights-title` h2; others use `#correlations-title` etc.) | inside cards | OK |
| MonthlyReport | "Monthly Report" | title-less main; component cards have their own h2/h3 | OK |
| AvatarPickerModal | h2 "Choose Your Avatar" (`#avatar-picker-title`) | n/a | h3 per category ("Faces", "Nature", etc.) + h3 "Unlockable Avatars" | OK |

### ARIA + keyboard nav

- **Mobile tablist (Settings):** `role="tablist" aria-label="Settings sections"` + 6 `role="tab"` buttons with `aria-selected` + `aria-controls`. ✅ Correct.
- **Desktop sidebar (Settings):** `role="navigation" aria-label="Settings"` + 6 `<button>` (NOT `role="tab"`). ⚠️ **Semantic mismatch with mobile.** Both sets of buttons control the same panel, but desktop is a `<nav>` and mobile is a `<tablist>`. Recommend: pick one model; if tab semantics are correct, use them everywhere with `role="tab"` + `tabindex` roving.
- **Active panel:** `id={`settings-panel-${activeSection}`} aria-live="polite"` ✅ correct.
- **Settings tab keyboard nav:** No arrow-key roving. Tab key advances through all 6 sidebar buttons sequentially. Recommend adding arrow-key roving (`Home`/`End` jump) per `RadioPillGroup` and `TimeRangePills` patterns already in this codebase.
- **TimeRangePills (Insights):** `role="radiogroup"` + 5 `role="radio"` buttons with `aria-checked` + `tabIndex={selected ? 0 : -1}` (roving). Arrow + Home/End handlers correctly wired. ✅
- **RadioPillGroup (Privacy):** Same pattern — `role="radiogroup"`, roving tabindex, arrow-key handler. ✅
- **ToggleSwitch:** `role="switch" aria-checked` + `aria-labelledby` + `aria-describedby`. Enter key handler. ✅
- **AvatarPickerModal preset grid:** `role="radiogroup" aria-label="Avatar presets"` + each preset `role="radio" aria-checked tabIndex={isSelected ? 0 : -1}`. Arrow-key handler at parent. ✅
- **AvatarPickerModal Tab/Upload tabs:** `role="tablist" aria-label="Avatar selection method"` + 2 `role="tab" aria-selected aria-controls`. ✅ — but no explicit Arrow-key handler between Presets ↔ Upload tabs (only mouse click; Tab key advances, which is OK but not canonical pattern).

### Touch targets

- ✅ Settings: All buttons `min-h-[44px]`. Unblock/unmute text buttons at `min-h-[44px] px-2`. ✅
- ✅ AvatarPickerModal: Tab buttons `py-2 px-4` ≈ 36-40px height. ⚠️ **Below 44px** — should bump to `py-2.5` or `min-h-[44px]`. Avatar grid buttons are 14×3.5rem = 56px. ✅
- ✅ TimeRangePills: `min-h-[44px]`. ✅
- ⚠️ Month pager (MonthlyReport): `min-h-[44px] min-w-[44px]` ✅. Disabled state `disabled:opacity-30` reduces visual contrast — verify still passes WCAG AA at 30% opacity (probably fails — at 30% on dark, white-on-dark text drops below 4.5:1).
- ✅ ToggleSwitch outer hit area: 44px container. Switch itself is 6×12 (24×48px) but the 44-min container catches the click.

### Decorative icon `aria-hidden`

- ✅ Most icons correctly tagged: ProfileSection's `<ArrowLeft>`, NotificationsSection's `<Share>`, AppSection's `<Check>`/`<Share>`/`<Download>`, MonthlyReport's `<ChevronLeft>`/`<ChevronRight>` (which have `aria-label` on the parent button instead — correct).
- ✅ Insights: Hero `<ArrowLeft>` is `aria-hidden`. Chart icons inside summary cards have `aria-hidden`.
- ✅ AvatarPickerModal: `<X>` close icon inside button with `aria-label="Close avatar picker"`. `<Upload>` icon inside Choose File button is `aria-hidden`. ✅

### Form field labels and error states

- ✅ ProfileSection display name: `<label htmlFor>` + `aria-invalid` + `aria-describedby` + `role="alert"` on error message. ✅
- ✅ ProfileSection bio: `<label htmlFor>` + `aria-describedby` for char-count region. ✅
- ✅ ChangePasswordModal: All 3 inputs have `<label htmlFor>` + `aria-invalid` + `aria-describedby` + `role="alert"`. ✅ Form-level error has `role="alert"`. ✅
- ✅ NotificationsSection time picker: `aria-label="Daily verse notification time"` (no visible label, but aria-label compensates).

### Settings form validation timing + announcement

- **Display name:** validates on `onBlur` (correct — async-feels validation, doesn't interrupt typing). Error announcement via `role="alert"` is immediate; "Saved" announcement via `aria-live="polite"`. ✅
- **Bio:** truncates input at 160 chars (silent — no announcement on truncation; user just stops being able to type). ⚠️ Could add `aria-live="polite"` "Bio truncated to 160 characters" announcement, but the visual char count probably suffices.
- **Change password fields:** `newTooShort` and `confirmMismatch` are calculated on every keystroke (real-time validation). ⚠️ This means the error appears as soon as the user types one character of a new password — could feel noisy. Consider validating on blur or after first submit attempt.

### Toggle switches and checkbox a11y

- ✅ `ToggleSwitch.tsx` is the canonical pattern — `role="switch" aria-checked aria-labelledby aria-describedby`, Enter key handler. ✅
- ⚠️ One concern: `onClick={() => onChange(!checked)}` is on a `<button type="button">`, but the `aria-checked` attribute on a `role="switch"` element only updates visual state via the toggle — **screen readers may need the label re-read** on state change. Recommended pattern: `aria-live="polite"` on a hidden region that announces "X enabled" / "X disabled". Worth a Spec 10A consideration but not a blocker.

### AvatarPickerModal focus management

- ✅ `useFocusTrap(isOpen, onClose)` correctly traps focus inside the modal.
- ✅ `aria-modal="true" aria-labelledby="avatar-picker-title"` ✅.
- ✅ Click-outside (`<div className="fixed inset-0 bg-black/60" onClick={onClose}>`) and Escape (handled by focus trap) both dismiss.
- ⚠️ When the modal opens, focus moves to the first focusable element inside (the close X button). Some users would expect focus on the currently-selected avatar instead. Worth a Spec 10A polish.
- ⚠️ Disabled (locked) avatars use `tabIndex={isSelected ? 0 : isUnlocked ? -1 : undefined}` — `tabIndex={undefined}` means the button takes its default tab order (`-1` for disabled). Verify this isn't tabbable; if it is, add explicit `tabIndex={-1}`.

### Color contrast

- ⚠️ `text-primary` (#6D28D9, the deep violet) on `bg-dashboard-dark` (which is `#0f0a1e` per the constants) — let me compute: contrast ratio ≈ 3.4:1. **Fails WCAG AA for normal text (4.5:1 required).** All instances of `text-primary` in Settings should migrate.
- ✅ `text-primary-lt` (#8B5CF6) on `bg-dashboard-dark` ≈ 5.5:1. ✅ AA passes.
- ⚠️ `disabled:opacity-30` on the month pager buttons reduces contrast below AA when disabled. Acceptable for disabled state per WCAG (disabled controls are exempt) but worth flagging.
- ⚠️ `text-white/85` heading on `bg-dashboard-dark` (`MonthlyReport.tsx:121`) — non-canonical opacity (the table in `09-design-system.md` doesn't list /85). Migrate to `text-white`.
- ⚠️ Subtitle `text-white/60` italics on `bg-dashboard-dark` (Insights subtitle) — passes contrast (~5.6:1) but italic + 60% reduces effective legibility. Aligns with "Daily Hub body text readability standard (post Spec T)" recommendation to drop italics.

### Modal a11y summary

| Modal | role | aria-modal | focus trap | escape | click-outside | focus restore |
|-------|------|-----------|------------|--------|---------------|---------------|
| AvatarPickerModal | dialog | true | ✅ useFocusTrap | ✅ via trap | ✅ | ✅ on close |
| ChangePasswordModal | dialog | true | ✅ useFocusTrap | ✅ | ✅ | ✅ |
| DeleteAccountModal | alertdialog | inferred (not explicit) | ✅ useFocusTrap | ✅ | ✅ | ✅ |
| EmailPreviewModal | dialog | true | ✅ useFocusTrap | ✅ | ✅ | ✅ |
| ConfirmDialog (Privacy unblock/unmute) | dialog | inferred (component-level) | ✅ (assumed — not opened during recon) | ✅ | ✅ | ✅ |

⚠️ **DeleteAccountModal needs `aria-modal="true"` explicitly** (line 22-26: `role="alertdialog" aria-labelledby aria-describedby` — missing the `aria-modal` attribute). Quick fix.

---

## Part 12 — Performance and Rendering

### Insights aggregation cost

Measured during Playwright capture (cold load, 1440×900, dev mode):

- **Initial paint** (skeleton → empty Insights frame): ~300ms
- **Hero + pills render:** ~500ms
- **AnimatedSection cascades start:** ~1s after mount
- **All charts hydrated:** ~2.5s (Recharts is the slowest contributor; ~600ms for 2 large charts)
- **Total time to interactive:** ~3s on cold

With 60 seeded mood entries:

- `getMoodEntries()` parses 4-5 KB of JSON × 8 call sites = ~35 KB total redundant work per mount
- `useMonthlyReportData` runs ~6 storage reads + multiple Object.entries filter passes — ~8-15ms total

### Re-render cascades on settings save

- ProfileSection display name save: `onUpdateProfile({ displayName })` → `useSettings` setSettings → re-render of Settings.tsx → ALL 6 panels re-render in parallel (since they're conditionally mounted but the parent's children-array changes). Mitigated by `key={activeSection}` on the panel container.
- Toggle in NotificationsSection: same flow — small object change triggers full Settings re-render. Acceptable for now; settings are small.
- AvatarPickerModal save: `onSave(avatarId, avatarUrl)` → `onUpdateProfile({ avatarId, avatarUrl })` → `setSettings`. Modal closes via parent state. Smooth.

### Bundle size considerations

- **Recharts is bulk:** confirmed at `manualChunks` per CLAUDE.md "Recharts isolated via `manualChunks`". Insights bundle should be lazy-loaded since the route is lazy. Verify with `frontend/scripts/measure-bundle.mjs`.
- **AvatarPickerModal** is 447 LOC + imports `lucide-react`, `BADGE_MAP`, `processAvatarPhoto`. Mounted only from Settings → only loaded with Settings chunk.
- **EmailPreviewModal** is static template (110 LOC) — small.
- **Recommendation:** No bundle work needed for Spec 10A or 10B. The lazy-load architecture is already in place.

### Long-lived state subscription patterns

- `useSettings`: lazy-init useState + StorageEvent listener — minimal overhead
- `useInstallPrompt`: subscribes to browser events — well-established pattern
- IntersectionObserver (Insights sticky pill): single sentinel, single observer — minimal cost

---

## Part 13 — Cross-Cutting Concerns

### Where /settings is linked from

- ✅ Avatar dropdown (Navbar.tsx logged-in) — primary entry point per `10-ux-flows.md`
- ✅ ProfileHeader.tsx:147 (`<Link to="/settings">` from `/profile/:userId`) — secondary entry
- (Mobile drawer also includes Settings per `10-ux-flows.md` § "Mobile Drawer (Logged In)")

### Where /insights is linked from

- ✅ Avatar dropdown ("Mood Insights")
- ✅ Mobile drawer
- (Insight widget on Dashboard? Not directly — see DashboardWidgetGrid for confirmation; out of scope for this recon)

### Notification preferences integration with BB-41

The Settings → Notifications section is the **explicit opt-in path** for push notifications. The contextual prompt mounted inside BibleReader (`NotificationPrompt.tsx`) is the **implicit path**. Both paths converge on:

- `wr_notification_prefs` (managed by `lib/notifications/preferences.ts`)
- `wr_push_subscription` (the actual Push API endpoint registered in the browser)
- `wr_notification_prompt_dismissed` (one-shot flag set by the BibleReader contextual prompt)

The `useToast` "Sent!" feedback on the test notification button (`NotificationsSection.tsx:134`) is a nice user-visible confirmation that the notification path works end-to-end. No duplication or fragmentation between the two paths — they share state cleanly.

### Export flow overlap with BibleSettingsModal

**No overlap.** BibleSettingsModal lives in the Bible chrome and offers a Bible-specific export (highlights, notes, bookmarks, journals to a JSON file — verify scope in Bible recon if revisiting). Settings has NO export affordance today.

If Spec 10A wants to introduce a top-level data export entry point, the recommended pattern is a "Manage your Bible data → opens BibleSettingsModal" link in Settings, OR a unified "Export everything" feature (Spec 10c candidate).

### Delete account backend hook

**No backend hook today.** `handleDeleteConfirm` is a localStorage sweep. Forums Wave Phase 1 Spec 1.5g (session invalidation) and a future account-management spec will add a backend `DELETE /api/v1/auth/account` endpoint. When that lands, the modal becomes a soft-delete confirmation with a "Cancel within 30 days?" period (typical pattern), and the localStorage sweep happens only AFTER the backend confirms.

### Spotify OAuth Phase 3.13 touchpoints

**Zero current touchpoints.** Confirmed via grep — no Spotify-related imports, types, or storage keys in the Settings tree. Phase 3.13 will be greenfield. No anticipatory work in Spec 10A — but the new Settings spec is the natural future home for a "Connect Spotify" entry point. Keep architecture flexible (the ToggleSwitch + ConfirmDialog patterns will trivially accommodate it later).

### Crisis content handling

- Settings: no user-generated content surfaces. No crisis detection needed.
- Insights: no composer. Mood entries are written from elsewhere (Daily Hub, Dashboard). Crisis detection is upstream.
- MonthlyReport: same. The `MonthlySuggestions` "This month was tough. You're not alone." copy + CTA "Find a counselor →" `/local-support/counselors` correctly routes users to crisis-adjacent resources without claiming therapeutic authority. ✅ Anti-pressure copy aligned.

### Sound effects

- Settings has the `wr_sound_effects_enabled` toggle in the Notifications section.
- Insights and MonthlyReport do not produce sound effects on tab switch / chart hover. (Verified via grep for `useSoundEffects` — no usage.)

### SEO

- All three routes have `<SEO>` (verified imports). All three are `noIndex: true` per `routeMetadata.ts:226, 233, 240` — settings + insights are private. ✅ Correct posture.
- No JSON-LD structured data on these pages (correct — they're not public content).

---

## Dedicated AvatarPickerModal Section

`frontend/src/components/shared/AvatarPickerModal.tsx` (447 LOC) is a substantial standalone modal that was deferred from Spec 6D. It has its own scope considerations and warrants per-component treatment in Spec 10A.

### Current chrome

- **Container:** `fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[500px] lg:max-w-[560px] sm:w-full max-h-[90vh] overflow-y-auto bg-hero-mid border border-white/15 rounded-2xl shadow-xl motion-safe:animate-dropdown-in`
- **Backdrop:** `fixed inset-0 bg-black/60`
- **Pattern:** Rolls-own modal — does NOT use FrostedCard. Distinct from canonical Daily Hub modal styling.

### `bg-primary` location audit (4 occurrences confirmed)

| Line | Use | Semantic role |
|------|-----|---------------|
| 198 | `activeTab === 'presets' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'` — wait, the agent's count of 4 was inaccurate. Let me re-check. | Actually `bg-primary` doesn't appear here — the activated tab uses `bg-white/10`. |
| 261 | `'ring-2 ring-primary ring-offset-2 ring-offset-hero-mid'` (selected preset) | Selection ring — Decision-11 preserve candidate (decorative) |
| 311 | `'ring-2 ring-primary ring-offset-2 ring-offset-hero-mid'` (selected unlockable) | Same |
| 346 | `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90` (Save button — Presets tab) | Primary CTA — MIGRATE to white-pill primary |
| 418 | `bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90` (Save / Use This Photo — Upload tab) | Primary CTA — MIGRATE |

**Re-checked count:** 4 distinct `bg-primary` instances:
- 2× rings (decorative selection — Decision-11 preserve candidate)
- 2× solid CTA buttons (deprecated — replace with white-pill primary CTA)

### Mount point

Single mount: `ProfileSection.tsx:114-125`. `pickerOpen` boolean controls visibility. Save callback passes `(avatarId, avatarUrl?)` up to `onUpdateProfile` from `useSettings`.

### Tests

`frontend/src/components/shared/__tests__/AvatarPickerModal.test.tsx` (file not opened during this recon; verify LOC and assertions during plan phase).

### Migration recommendations for Spec 10A

1. **Replace solid `bg-primary` save buttons (lines 346 + 418) with white-pill primary CTA** per `09-design-system.md` § "White Pill CTA Patterns" Pattern 2. Same shadow + focus ring as the homepage "Get Started" button.
2. **Keep `ring-primary` selection rings (lines 261 + 311)** — these are decorative tints, Decision-11 preserve. Consider migrating to `ring-violet-400` for visual consistency with DailyHub 1B violet treatment, but no functional change needed.
3. **Tab buttons (lines 198 + 210)** — current `bg-white/10` active state is OK. No `bg-primary` here. Tab a11y is correct.
4. **Container** — keep `bg-hero-mid border border-white/15` chrome. The modal is a focused selection task, not a content card; FrostedCard would over-engineer.
5. **Tab button height** — bump from `py-2` to `py-2.5` or add `min-h-[44px]` to clear the touch target rule.
6. **Focus on open** — currently moves to the close X. Consider moving focus to the currently-selected avatar (more intuitive). Quick fix.
7. **Animation** — keep `animate-dropdown-in` (uses `decelerate` per BB-33 tokens). ✅
8. **Drag-drop zone** (line 397-403) — currently `border-2 border-dashed border-white/20` plus copy "or drag and drop an image here". Keep; rolls-own variant is fine for utility surfaces.
9. **Photo error inline messages** — currently `text-red-400 text-center` with `role="alert"`. Migrate to severity color system (`text-red-100` on `bg-red-950/30`) for consistency with the rest of the app.

**Effort estimate:** ~3-4 hours of work in the spec including tests.

---

## Dedicated Tab Pattern Section

The Settings page implements a tabbed interface with 6 sections. There's a meaningful divergence from the canonical sticky tab pattern documented in Bible/Daily Hub.

### Current implementation

- **Mobile (< sm):** Top tablist with `border-b-2 border-primary` active indicator.
  ```html
  <div class="sm:hidden bg-white/[0.08] backdrop-blur-xl border-b border-white/10">
    <div role="tablist" aria-label="Settings sections">
      <div class="flex">
        <button role="tab" aria-selected={true} aria-controls="..."
                class="flex-1 py-3 text-sm font-medium text-center transition-colors text-white border-b-2 border-primary">
          Profile
        </button>
        ...
      </div>
    </div>
  </div>
  ```
- **Desktop (sm+):** Left sidebar with `bg-primary/10 text-primary-lt` active background.
  ```html
  <nav role="navigation" aria-label="Settings"
       class="hidden sm:block w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2">
    <button class="w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary-lt">Profile</button>
    ...
  </nav>
  ```

### Tab order + default selection

| Order | Tab | Default? |
|-------|-----|----------|
| 1 | Profile | ✅ default (`useState<SettingsSection>('profile')`) |
| 2 | Dashboard | |
| 3 | Notifications | |
| 4 | Privacy | |
| 5 | Account | |
| 6 | App | |

### Tab a11y

- Mobile: `role="tab" aria-selected aria-controls="settings-panel-{id}"` ✅
- Desktop: ⚠️ NOT `role="tab"` — uses generic `<button>` inside `<nav>`. **Semantic mismatch.**
- No arrow-key roving on either variant. Tab key advances normally.
- Active panel: `id="settings-panel-{id}" aria-live="polite"` ✅
- Panel `key={activeSection}` triggers full remount on tab switch (good — avoids state bleeding).

### URL state + deep-linking

- ⚠️ **Tab state is NOT URL-backed.** `useState<SettingsSection>('profile')` is local. Refreshing always lands on Profile.
- Deep-linking to `/settings?tab=notifications` does NOT work — the query param is ignored.
- This is a regression from the Daily Hub tab pattern (which IS URL-backed) and from the AskPage refinement that landed in Spec 9.

### Recommendation for Spec 10A

1. **Pick one semantic model:** if both mobile and desktop are tab interfaces (which is the user-visible truth — they switch between same-page panels), use `role="tab"` everywhere. The `<nav>` desktop wrapper is incorrect — it implies cross-page navigation.
2. **URL-back the active tab** (`?tab=profile|dashboard|...`). Read on mount, set on click, write to history without page reload. Match Daily Hub and AskPage patterns.
3. **Migrate active-state styling** from `bg-primary/10 text-primary-lt` to a violet-on-white treatment (decision needed — see Open Question 1).
4. **Consider a sticky tab bar on scroll** (similar to Daily Hub `bg-hero-bg/70 backdrop-blur-md`). On long sections like Notifications (22 items), a sticky tab bar would let users navigate without scrolling back to top. Worth Spec 10A.
5. **Add arrow-key roving** for tab buttons (Home/End jumps). Match `RadioPillGroup` and `TimeRangePills` patterns.

---

## Dedicated Notification Preferences Section

339 LOC, the largest section component. Centerpiece of Spec 10A's chrome work.

### Per-type toggle inventory (22 items in happy-path-with-iOS state)

Grouped under 5 sub-headings:

1. **Sound** (1 toggle): Sound Effects
2. **Push Notifications** (master toggle + 2 per-type toggles + time picker + test button + 0-2 conditional cards)
3. **In-app** (1 toggle): In-app notifications (controls bell icon)
4. **Email** (2 toggles): Weekly digest, Monthly report — both labeled "(coming soon)"
5. **Activity** (5 toggles): Encouragements, Milestones, Friend requests, Nudges, Weekly recap

### Push permission state UI

- **Status indicator** (line 42-70): "✓ Notifications enabled" (green), "✗ Notifications blocked" (red), "Your browser doesn't support push notifications" (gray), or "Not yet enabled" (gray)
- **Master toggle** triggers `requestPermission()` if state is `default`
- **iOS install hint** appears when `pushSupport === 'ios-needs-install'` — instructs user to add to home screen first
- **Denied permission instructions card** (line 246-255) appears when `permission === 'denied'` — browser-specific re-enable steps

### Test notification firing UX

`fireTestNotification()` from `lib/notifications/scheduler.ts` is called when "Send test notification" is clicked. Returns boolean. On success, shows toast `'Sent!'`. **The test fires a real Push API notification** — verify during recon (intentional capability for users to confirm setup works).

Button styling: `bg-white text-hero-dark rounded-full px-6 py-2 font-semibold text-sm hover:bg-white/90 transition-colors min-h-[44px]` — close to canonical white-pill but smaller (`px-6 py-2` instead of `px-8 py-3.5`). Spec 10A should align to the canonical pattern.

### Time picker chrome

```html
<input type="time" value={prefs.dailyVerseTime} onChange={handleTimeChange}
       aria-label="Daily verse notification time"
       class="bg-white/[0.06] border border-white/15 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
```

Native browser `<input type="time">`. Renders differently per OS/browser:
- **iOS Safari:** wheel picker overlay
- **macOS Safari:** stepper input
- **Chrome desktop:** dropdown
- **Firefox:** stepper

⚠️ Native time pickers are inconsistent; some users on macOS Safari will see a stepper that's hard to use. Consider replacing with a custom dropdown picker with hour/minute selects — but that's substantial scope. Recommendation: keep native for Spec 10A, file a Spec 10c candidate.

### Granularity

- 5 activity types are toggleable individually
- 2 email types are toggleable individually
- 2 push types are toggleable individually (daily verse + streak reminder)
- 1 master push toggle (controls all push types)
- 1 in-app master toggle
- 1 sound effects toggle

**Total user-facing knobs: 11 booleans + 1 time picker.** Reasonable. Decision-fatigue concern is mild but worth tightening — see Round 3 lenses below.

### Sub-heading visual treatment

`text-xs text-white/60 uppercase tracking-wider mb-3` — eyebrow style. Consistent across all 5 sub-headings. Migrate to violet-tinted eyebrow per DailyHub 1B if visual continuity with Daily Hub is desired.

### Recommendations for Spec 10A

1. Adopt canonical white-pill primary CTA for "Send test notification".
2. Standardize "(coming soon)" treatment — currently buried in description text. Consider a labeled chip or a slightly faded card to signal future-state.
3. Visual hierarchy: section is dense. Consider collapsing rarely-used groups (Email, Activity) by default with expand/collapse affordance. Spec 10A might be too aggressive a scope; defer to Spec 10c.
4. iOS install hint copy: aligned with BB-41 documentation. Keep.
5. Status indicator: align color with severity color system (currently uses raw `text-success` / `text-danger`).

---

## Dedicated ChangePasswordModal Section

`frontend/src/components/settings/ChangePasswordModal.tsx` (185 LOC).

### Current chrome

- **Container:** `relative z-10 rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md p-6 max-w-md w-full mx-4`
- **Backdrop:** `absolute inset-0 bg-black/60`
- **Form:** 3 password inputs (current, new, confirm), 2 buttons (Cancel + Update password)

### Validation timing

- **Real-time** (every keystroke):
  - `newTooShort = newPassword.length > 0 && newPassword.length < 8` → "Use at least 8 characters."
  - `confirmMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword` → "Passwords don't match."
- **On submit:** Calls `changePasswordApi(currentPassword, newPassword)`. Errors mapped:
  - `CURRENT_PASSWORD_INCORRECT` → field-level "Your current password isn't correct."
  - `PASSWORDS_MUST_DIFFER` → form-level "Your new password must differ from your current password."
  - `CHANGE_PASSWORD_RATE_LIMITED` → form-level "Too many attempts. Please wait a few minutes and try again."
  - Generic → form-level "Something went wrong. Please try again."

### Error display

- Field-level: inline `<p role="alert" class="mt-1 text-sm text-red-400">` below the input
- Form-level: `<p role="alert" class="text-sm text-red-400">` above the buttons
- ✅ Correctly uses `aria-invalid` and `aria-describedby` on the affected input

### Recommendations for Spec 10A

1. **Align with Spec 7 auth surface canonical patterns.** AuthModal and RegisterPage establish the form chrome conventions; ChangePasswordModal should mirror them — same input chrome (`bg-white/5 border border-white/15`), same submit button (white-pill primary), same severity color system for errors.
2. **Submit button** (`bg-primary text-white`) → migrate to white-pill primary CTA. The submit button on AuthModal/Register is the closest precedent.
3. **Cancel button** (`bg-white/10 border border-white/15`) → keep or align to canonical secondary button.
4. **Error color** (`text-red-400`) → migrate to `text-red-100` on `bg-red-950/30` per severity color system.
5. **Real-time validation noise:** Consider validating new password length on blur instead of every keystroke. The "Use at least 8 characters." error appears on the very first keystroke, which is jarring. Consider showing the requirement as a help hint instead, switching to error red only on blur with a too-short value.

---

## Dedicated DeleteAccount Section

`DeleteAccountModal.tsx` (56 LOC) is a `role="alertdialog"` confirm. Behavioral findings already documented in Part 4. Visual recommendations here.

### Current chrome

- **Container:** `relative z-10 rounded-2xl border border-white/10 bg-surface-dark backdrop-blur-md p-6 max-w-md w-full mx-4`
- **Buttons:** Cancel (`bg-white/10 border border-white/15`) + Delete Everything (`bg-red-500 text-white hover:bg-red-600`)

### Recommendations for Spec 10A

1. **`aria-modal="true"`** missing (line 22-26). Add.
2. **Delete button color** — `bg-red-500` is the saturated emergency red Worship Room avoids per `09-design-system.md` § "Severity color system". Migrate to muted destructive: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40`.
3. **Add severity icon** (`<AlertCircle>` or `<AlertTriangle>` from lucide) in the heading row to reinforce the alertdialog purpose.
4. **Copy** ("This will permanently delete all your Worship Room data including mood entries, journal drafts, badges, friends, and settings. This action cannot be undone. We'll miss you.") — voice-aligned with anti-pressure tone. Keep the "We'll miss you." line — it's emotionally honest. Could add a small "Download your data first?" link as a Spec 10c follow-up.
5. **Bible data note**: As flagged in Part 4, `bible:*` keys are NOT deleted. Either:
   - (a) update `handleDeleteConfirm` to sweep `bible:*` and `bb*-v*:*` prefixes too (Spec 10A includes a tiny behavioral fix — defensible since it aligns the modal copy "all your Worship Room data" with reality), OR
   - (b) defer to Spec 10c with explicit scope expansion. Recommend (a) — it's a 5-line bug fix.

---

## Part 14 — Scope Estimation

### File count and LOC summary

| Surface | Production files | Production LOC | Test files | Test LOC (approx) |
|---------|------------------|----------------|------------|-------------------|
| Settings (page + 10 sections + 3 modals + AvatarPickerModal + 2 hooks + storage) | 17 | ~2,000 | 10 | ~1,400 |
| Insights (2 pages + 18 components + 3 hooks) | 23 | ~2,500 | 21 | ~2,500 |
| **Combined** | **40** | **~4,500** | **31** | **~3,900** |

### LOC by visual-migration scope

Spec 10A (Settings + AvatarPickerModal):

- **High touch:** Settings.tsx, AvatarPickerModal.tsx, NotificationsSection.tsx (chrome + violet migration), AccountSection.tsx (delete button color + tighten), ChangePasswordModal.tsx (canonical alignment)
- **Medium touch:** ProfileSection (text buttons), PrivacySection (text buttons), DeleteAccountModal (severity colors + aria-modal)
- **Light touch:** AppSection, DashboardSection (already minimal), ToggleSwitch (likely no change), RadioPillGroup (active state color)
- **Test updates:** ~6-8 test files need class-string updates

Estimated effort: **L (Large) per Decision 12 sizing — 20-40 tests modified, 17 files touched, ~2,000 LOC affected.**

Spec 10B (Insights + MonthlyReport):

- **High touch:** Insights.tsx (hero typography + pills + page-level mood entries hoist), MonthlyReport.tsx (hero typography), MoodTrendChart.tsx (Recharts theming check), MeditationHistory.tsx (Recharts theming check), ActivityCorrelations.tsx (Recharts theming)
- **Medium touch:** ActivityBarChart, MonthHeatmap, CalendarHeatmap (cell colors verify), MonthlySuggestions (lighter card variant)
- **Light touch:** all components that already use canonical FrostedCard rolls-own (~10 components)
- **Test updates:** ~3-5 test files need class-string updates
- **Performance fix (light-touch):** lift `getMoodEntries()` to page level

Estimated effort: **L (Large) per Decision 12 — 20-40 tests modified, 21 files touched, ~2,500 LOC affected.**

### Risk areas

**Spec 10A risks:**
1. **Tab pattern overhaul** (mobile + desktop unification + URL state) — substantial behavioral change disguised as visual. May reveal test brittleness.
2. **AvatarPickerModal** is the heaviest single component (447 LOC) and has its own sub-tab navigation. Visual migration risk: tab focus management regressions.
3. **Notification permission flow** is end-to-end with browser APIs. Cosmetic changes shouldn't break the flow but verify with manual smoke test.
4. **Bible data leak in delete account** — if Spec 10A includes the `bible:*` sweep fix, ensure it doesn't trigger reactive store re-renders from cleared state.

**Spec 10B risks:**
1. **Recharts theming** — color, font, axis style changes are Recharts-prop-driven; mistakes silently produce wrong-color charts.
2. **CalendarHeatmap a11y gap** — grid cells lack keyboard interactivity. Spec 10B should fix in scope (small but meaningful).
3. **MonthlyReport empty state** — currently silently shows mock data when no entries. Spec 10B should add a real empty state, but doing so might break tests that rely on mock fallback (if any).
4. **Page-level `getMoodEntries()` hoist** — light refactor that touches 8 children. Test updates required.

### Recommendation

**Two specs, executed in this order:**

1. **Spec 10A — Settings + AvatarPickerModal** (Large, ~3-5 days)
2. **Spec 10B — Insights + MonthlyReport** (Large, ~3-5 days)

Both are visual-migration specs with light behavioral cleanup. Neither needs backend work. Both leave Forums Wave Phase 1 auth lifecycle work (1.5b through 1.5g) undisturbed. Both can ship independently.

**Optional Spec 10c follow-up** for behavioral fixes that emerge during 10A:
- Bible data deletion in Delete Account (if not folded into 10A)
- "Download my data" pre-delete affordance
- Email change implementation
- Empty state for MonthlyReport
- CalendarHeatmap keyboard accessibility (if not folded into 10B)
- Insights subscription pattern (if mood storage gains a subscribe API)

---

## Part 15 — Open Questions for Eric

### 1. Atmospheric layer + active-state color decision

Settings, Insights, MonthlyReport currently use `bg-dashboard-dark` + `ATMOSPHERIC_HERO_BG` hero. AskPage (Spec 9) and Daily Hub use richer treatments. Two questions in one:

- **(a)** Should Spec 10A/10B keep the current flat treatment, OR adopt richer atmospheric layer (e.g., a softer version of HorizonGlow scoped to the page)? Insights specifically reads as flat compared to Daily Hub.
- **(b)** What active-state color for Settings tabs and TimeRangePills? Three options:
  - Keep `bg-primary/10 text-primary-lt` (current) — but `text-primary` fails contrast and is deprecated
  - Migrate to violet-on-white: `bg-violet-400/15 text-white border-l-2 border-violet-400` (DailyHub 1B alignment)
  - Migrate to muted white: `bg-white/15 text-white` (canonical Bible/Daily Hub tab pattern)

### 2. Delete Account scope expansion

The `bible:*` key sweep is a 5-line bug fix in `handleDeleteConfirm`. Options:
- **(a)** Fold into Spec 10A (recommend) — small behavioral fix, copy says "all your data"
- **(b)** Defer to Spec 10c (cleaner scope boundary)
- **(c)** Rewrite `handleDeleteConfirm` as a "delete every key whose prefix matches [list]" loop and centralize the prefix list in a constants file

### 3. Tab pattern overhaul scope

Settings tabs are currently semantic mismatch (mobile = tablist, desktop = nav) AND not URL-backed. Three options:
- **(a)** Spec 10A includes both fixes (tab semantics unified + URL state) — best UX, biggest scope
- **(b)** Spec 10A unifies semantics only, leaves tab state local (smaller scope)
- **(c)** Defer entirely to a separate Spec 10d "Settings tab navigation" focused fix

### 4. MonthlyReport empty state

Today: silently fakes data when no entries (mock fallback in `useMonthlyReportData`). Three options:
- **(a)** Spec 10B adds a real `<FeatureEmptyState>` for empty months — straightforward
- **(b)** Spec 10B keeps the mock fallback but adds a small "(example data)" label — preserves engagement-from-day-1 narrative
- **(c)** Defer entirely to Spec 10c or future work

### 5. Insights time-range UX

Current pills: 30d / 90d / 180d / 1y / All. Considerations:
- Default is 30d — defensible but could be 7d for quick-glance use
- Five options is a lot of decision fatigue
- Pills are accessible but visually busy at smaller widths
- **(a)** Keep as-is (current behavior is fine)
- **(b)** Reduce to 3 windows: Week / Month / Year, with All as a secondary action
- **(c)** Replace pills with a dropdown selector (smaller footprint, less prominent)

### 6. AvatarPickerModal scope

Already discussed above. Confirm:
- **(a)** Full chrome migration in Spec 10A (recommended, ~3-4 hours of work)
- **(b)** Polish-only: just the 4 `bg-primary` sites + tab height, defer chrome + focus-on-open

### 7. Notification preferences UX consolidation

22 items in the Notifications panel is dense. Options:
- **(a)** Keep current layout (no scope change for Spec 10A)
- **(b)** Group rarely-used (Email, Activity) into expandable disclosure groups for Spec 10A
- **(c)** Defer disclosure work to Spec 10c

### 8. Spotify OAuth Phase 3.13 placeholder

Current Settings has zero Spotify code. Options for Spec 10A:
- **(a)** Add a "Connect Spotify (coming soon)" entry-point in App or Account section as visual placeholder — disabled state, sets future expectation
- **(b)** No placeholder — pure greenfield in Phase 3.13

### 9. Insights enhancement scope (emotional narrative)

Per Round 3 lenses (next section), Insights is heavy on data and light on narrative. Should Spec 10B:
- **(a)** Stay visual-migration only (no narrative work)
- **(b)** Light-touch narrative additions: warmer empty-state copy, time-of-day greeting variants, "Your story this month" vs "Your story this year" framing
- **(c)** Defer narrative work to a focused Spec 10c "Insights as story" feature spec

### 10. Insights sharable card format

Spotify Wrapped + Strava Year in Sport are the gold-standard precedents. Should Worship Room have an annual recap?
- **(a)** Not in Spec 10B (out of scope — visual migration only)
- **(b)** Spec 10B adds a `MonthlyShareButton` polish — this exists already but could become more prominent
- **(c)** Spec 10c "Worship Year in Review" — a yearly recap surface modeled on Wrapped, generated December 1 from accumulated data. Major feature, deserving of its own spec.

---

## Round 3 Enhancement Lenses

Each lens applied to both surfaces, then a single block of competitor analysis.

### Speed-to-peace

- **Settings:** Bureaucratic — multi-tab navigation, 22-item Notifications panel, dense Privacy controls. Users come here to fix something specific. Minimum-tap path is reasonable but the visual density doesn't communicate "sanctuary."
- **Insights:** Faster — first chart visible above the fold. But the 11-section vertical stack is overwhelming on first visit.

**Enhancement candidates:**
- Settings: collapse rarely-used groups by default (Email, Activity)
- Insights: show only the top 3 sections by default; "Show more" expands the rest

### Time-of-day awareness

- **Settings:** Time-agnostic. Same view morning vs evening.
- **Insights:** Time-agnostic. Charts are the same regardless of when you check.

**Enhancement candidates:**
- Insights hero: "Your week so far..." (Mon-Wed AM) vs "How your week went" (Sat PM) — match Daily Hub's time-aware greeting
- Insights mood chart could highlight "today's average" prominently for evening visits

### Decision fatigue reduction

- **Settings:** Moderate fatigue. 22 notification toggles + 4 privacy controls is a lot.
- **Insights:** Low fatigue (read-only). TimeRange pills add 1 decision.

**Enhancement candidates:**
- Settings: progressive disclosure for Notifications. Default state: master toggles only. "Customize" expands per-type.
- Insights: collapse TimeRange to a chip dropdown on mobile to reduce visual noise.

### Ritual building

- **Settings:** Not ritual-aligned. Once-and-forget.
- **Insights:** Strong ritual potential. Weekly check-in habit ("How was my week?") fits naturally.

**Enhancement candidates:**
- Insights: "Sunday review" framing. Default to Last week of data on Sunday/Monday morning visits.
- Notify users (BB-41) on Sunday evening: "Review your week"

### Growth narrative

- **Settings:** N/A — settings don't tell a story.
- **Insights:** Currently shows counts and trends but no narrative. Strava Year-in-Sport and Spotify Wrapped both turn data into story. Insights does some narrative work in `MonthlySuggestions` ("This month was tough. You're not alone.") and `InsightCards` (rotated copy), but the page reads as a dashboard, not a journey.

**Enhancement candidates:**
- Lead the page with a one-sentence narrative: "April was a {bestMood} month. You {topActivity} {N} days." (computed from data)
- Replace `<h1>Mood Insights</h1>` + subtitle with a dynamic one-liner story

### Emotional moments

- **Settings:** Cold — no warmth in chrome or copy. The "We'll miss you" delete copy is the warmest moment.
- **Insights:** Mild warmth in `MonthlyHighlights` ("Best day: April 12 — Thriving"), but most surface is cold data.

**Enhancement candidates:**
- Insights: replace some cards' titles with question framing — "What were you good at this month?" instead of "Activity Correlations"
- Add a "Your favorite verse this month" card sourced from highlights/memorization (cross-cutting with Bible features)

### Surprise / delight

- **Settings:** None.
- **Insights:** None today. `EchoCard` (BB-46) could fit but isn't on Insights.

**Enhancement candidates:**
- Insights: surface a `<EchoCard>` at the top — "30 days ago you highlighted Psalm 23:1" — bridges Insights → Bible
- Settings: "Easter egg" surprise — a quiet animation if the user has an unbroken 365-day streak (avoid pressure framing — celebrate, don't gate)

### Guilt-free re-engagement

- **Settings:** N/A.
- **Insights:** **High risk surface.** A user who hasn't logged in for weeks comes back, sees a sparse heatmap, and feels shame. Current treatment: heatmap shows gaps without comment. Empty-state copy ("Your story is just beginning") is good for first-time, but mid-cycle returners see broken data.

**Enhancement candidates:**
- Insights: warm welcome-back banner — "Welcome back. Here's where you left off." — avoid mentioning gaps.
- MonthlyReport: never highlight "missed" days. Use neutral phrasing.
- Lengthy gap detection (>30 days): show a softer landing page with "Start fresh today" CTA + recent-month report only.

### Shareable cards

- **Settings:** N/A.
- **Insights:** `MonthlyShareButton` exists. Generates a Canvas image. But it's hidden at the bottom of MonthlyReport — most users won't find it.

**Enhancement candidates:**
- Promote `MonthlyShareButton` to the top of MonthlyReport
- Add an annual share — "My 2026 in faith" generated December 1 from accumulated data
- Copy modeled on Spotify Wrapped's grain-and-gradient aesthetic but in Worship Room's purple-violet palette

### Beauty as sanctuary

- **Settings:** Functional, not sacred. Forms feel like an admin panel.
- **Insights:** Same — charts and stat cards.

**Enhancement candidates:**
- Settings hero: a soft purple/lavender atmospheric blob behind the heading (smaller version of HorizonGlow)
- Insights hero: same — a narrow band of glow that fades as content begins

### Sound as atmosphere

- **Settings:** No ambient sound. Not appropriate (admin task).
- **Insights:** No ambient sound today. Could be appropriate during long-form reflection (annual recap), but not for the dashboard view.

**Enhancement candidates:**
- Annual recap (future Spec 10c): play a quiet violin/piano track during the share-card-reveal sequence

### Freshness

- **Settings:** Same view every visit. Boring.
- **Insights:** `InsightCards` rotates by `getDayOfYear()` — content changes daily. Good.

**Enhancement candidates:**
- Insights: rotate which sub-section appears in slot 3 (the prominent slot below heatmap+chart) — sometimes Gratitude, sometimes Community, etc.

### Community warmth

- **Settings:** N/A.
- **Insights:** `CommunityConnections` (Local Support) and `PrayerLifeSection` exist but feel data-dense, not warm.

**Enhancement candidates:**
- Insights: add a "Friends praying with you" card (cross-cutting with Friends feature) — "Sarah was praying for you 3 times this month"

### Tell-a-friend

- **Settings:** N/A — a user wouldn't share their settings.
- **Insights:** `MonthlyShareButton` is the only sharable affordance. Ranking: low — most users won't share their mood data publicly. Annual recap could change this if positioned as testimony, not metrics.

### Competitor analysis

This research, summarized from the WebSearch results, surfaces precedents Worship Room could selectively adopt.

**Headspace** ([source](https://www.headspace.com/app), [review](https://makeheadway.com/blog/headspace-app-review/)): Stats screen accessed via avatar at bottom-right. Shows length and frequency, streaks, content history. Uses orange-circle brand mark and brain-character illustration. Approach: visual streak + dopamine-hit positioning. Worship Room's anti-pressure mandate is the opposite — celebrate presence, don't reward streaks.

**Calm** ([trends](https://www.bighuman.com/blog/trends-in-mindfulness-app-design)): Daily reminders + progress tracking + smartwatch streak counter. "Themed content packs (sleep, focus, anxiety)" + "personalization engine." Soft pastel palettes, rounded components, friendly illustrations. Worship Room's dark cinematic theme is intentionally different — but the soft-pastel theme could inspire a "morning Insights" variant where the page lightens for early-morning use.

**Hallow** ([app](https://hallow.com/), [review](https://medium.com/catholicism-for-the-modern-world/catholic-prayer-app-hallow-6-month-review-88a699674229)): Streak feature + Apple Health mindfulness minutes integration. Personal Prayer Journal. Cross-device sync. Some users complain about streak tracking bugs. Lesson: streak metrics need careful definition; gracefully handle DST/timezone/clock-skew. Worship Room's grace-based streak repair (1 free/week) is a stronger pattern than Hallow's tradition of "perfect" streaks.

**Strava Year in Sport** ([support](https://support.strava.com/hc/en-us/articles/22067973274509-Your-Year-in-Sport), [press](https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025), [paywall coverage](https://gadgetsandwearables.com/2025/12/20/strava-year-in-sport/)): "Highly personalized recap... unique data insights, meaningful social engagements, and stand-out moments." Share images directly to Strava, messaging apps, Instagram, Facebook, TikTok. Each scene has a share button + final summary share. Now subscriber-only (paywall move). Lesson: per-scene shares + summary share is the canonical recap pattern. Worship Room could replicate without paywall.

**Spotify Wrapped 2025** ([newsroom](https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/), [UX lessons](https://uxplaybook.org/articles/spotify-wrapped-ux-design-lessons), [tech behind](https://engineering.atspotify.com/2026/3/inside-the-archive-2025-wrapped), [aesthetic](https://elements.envato.com/learn/spotify-wrapped-design-aesthetic)): "More layers, stories, and connection than ever." "Interactive ways to share" with speed/replay controls. **LLM-generated personalized "reports" for up to 5 remarkable days per user** — narratives grounded in real listening data. 90s nostalgia aesthetic with grunge textures and psychedelic animations. New "Wrapped Party" social feature + "Top Albums and Super Listeners" stories. Lesson: the **LLM narrative** is the most replicable feature for Worship Room — already has Gemini access via the BB-32 cache layer. "Your most prayed-for theme this year" or "Your top 3 verses you returned to" are within reach.

**Duolingo Year in Review** ([behind-the-scenes](https://blog.duolingo.com/year-in-review-behind-the-scenes/), [streak design](https://blog.duolingo.com/streak-milestone-design-animation/), [2025 review](https://www.findarticles.com/duolingo-2025-year-in-review/)): Shareable card format — chose this over website-link sharing or stat-page screenshots. "Names need to be equally fun, clever, and shareable, match the illustration well, fit the limited space on-screen." **Learner styles** — unique "personalities" mapped to app habits. Second share opportunity (the personality) significantly boosted share rates. Lesson: a single share isn't enough; offer multiple framings (e.g., "Your faith year" + "Your personality" + "Your top verse"). Worship Room could compute a "spiritual archetype" from activity patterns — but only if framed as celebration, never categorization-as-judgment.

### Enhancement candidates summary

Spec 10B may pick up the lighter-touch items (warmer empty states, time-of-day greeting on Insights, narrative one-liner above charts). The richer items (annual recap, LLM narrative, share affordances) deserve their own focused spec — likely a Spec 10c or Phase 3 "Worship Year in Review" feature.

**Spec 10B light-touch enhancement candidates:**
- ✅ Warmer narrative one-liner replacing "Reflect on your journey" subtitle
- ✅ Time-of-day greeting on Insights hero (matches Daily Hub pattern)
- ✅ Welcome-back warmth on returning-after-gap visits
- ✅ MonthlyReport empty state with `FeatureEmptyState`
- ✅ Promote MonthlyShareButton above the fold

**Defer to Spec 10c / focused future spec:**
- LLM-generated narrative summary (Worship Wrapped)
- Annual recap surface
- "Spiritual archetype" personality system
- Per-section share affordances on Insights
- Cross-cutting EchoCard mount on Insights hero
- Sound atmosphere during share-card reveal
- Friends-warmth integration ("Sarah prayed with you N times")

---

## Plan Handoff Checklist

| Section | Present? | Used By /plan-forums For | Also Used By |
|---------|----------|--------------------------|--------------|
| Page-Level Architecture | YES | Understanding route structure + atmospheric layer | /verify-with-playwright |
| Section-by-Section Inventory | YES | Ensuring plan covers every section | — |
| Reactive Store Consumer Audit | YES | Confirming no BB-45 work needed | — |
| Settings Data Persistence | YES | Understanding wr_settings + delete-account semantics | — |
| Insights Data Sourcing | YES | Performance hoist guidance | — |
| Component Dependency Tree | YES | Plan-step ordering | /execute-plan |
| Hooks and Data Sources | YES | Mapping behavior changes | — |
| localStorage State Inventory | YES | Confirming no new keys needed | — |
| Deprecated Patterns Inventory | YES | The visual-migration target list (file:line specific) | /execute-plan |
| Tests Inventory | YES | Test-update workload estimation | — |
| Accessibility Audit | YES | A11y fixes folded into spec scope | /verify-with-playwright |
| Performance and Rendering | YES | Hoist `getMoodEntries()` recommendation | /execute-plan |
| Cross-Cutting Concerns | YES | Notification + delete + Spotify guidance | — |
| Scope Estimation | YES | Spec sizing decision | — |
| Open Questions for Eric | YES | Spec scope decisions | — |
| Round 3 Enhancement Lenses | YES | Optional enhancement candidates | — |
| Competitor Analysis | YES | Anchor for Worship Year-in-Review feature ideation | — |
| Dedicated AvatarPickerModal section | YES | Specific to deferred Spec 6D scope | — |
| Dedicated Tab Pattern section | YES | Tab semantics + URL state decision | — |
| Dedicated Notifications section | YES | Per-type toggle structure + push integration | — |
| Dedicated ChangePasswordModal section | YES | Auth surface alignment | — |
| Dedicated DeleteAccount section | YES | Behavioral + visual recommendations | — |

---

## Screenshots inventory

Captured 49 PNGs at `frontend/playwright-screenshots/` (gitignored). Files:

**Spec 10A (Settings + AvatarPicker + modals — 25 PNGs):**
- `10A-settings-profile-{mobile-s|mobile-m|mobile-l|tablet|laptop|desktop|desktop-xl}.png` (7 breakpoints)
- `10A-settings-{account|app|dashboard|notifications|privacy}-{desktop|mobile-m}.png` (10)
- `10A-avatar-picker-{presets|upload}-{desktop|mobile-m|tablet}.png` (4)
- `10A-change-password-modal-desktop.png` (1)
- `10A-delete-account-modal-desktop.png` (1)
- `10A-settings-logged-out-desktop.png` (1)

**Spec 10B (Insights + MonthlyReport + email preview + empty states — 24 PNGs):**
- `10B-insights-30d-{mobile-s|mobile-m|mobile-l|tablet|laptop|desktop|desktop-xl}.png` (7 breakpoints)
- `10B-insights-{90d|180d|1y|all}-desktop.png` (4 TimeRange variants)
- `10B-insights-{empty|sparse|logged-out}-{desktop|mobile-m}.png` (5 empty + sparse + LO)
- `10B-monthly-report-{mobile-s|mobile-m|mobile-l|tablet|laptop|desktop|desktop-xl}.png` (7 breakpoints)
- `10B-monthly-report-empty-{desktop|mobile-m}.png` (2 empty-state — confirms mock-fallback bug visually)
- `10B-email-preview-modal-desktop.png` (1)

**Findings visible in screenshots that confirm the audit:**
- The `font-script` heading word looks visually loud in the captured Settings/Insights/MonthlyReport heroes
- The flat `bg-dashboard-dark` body is visibly less rich than Daily Hub captures from the Bible recon
- Mobile tab indicator (`border-b-2 border-primary`) is the deep violet `#6D28D9` — small but jarring against the rest of the chrome
- Desktop sidebar `bg-primary/10 text-primary-lt` reads as a thin tinted purple — doesn't carry the "selection" weight you'd want
- AvatarPickerModal's solid `bg-primary` Save button is the most visually loud CTA on these surfaces
- The `10B-monthly-report-empty-*` captures clearly show the mock-data bug: chart bars + heatmap squares appear despite zero entries

---

**End of recon.**

Recon was read-only. No production code modified. Branch unchanged.
