# Agent 2: Navigation & Information Architecture Audit

## 1. Complete Route Inventory

| Route | Component | Auth Required | Status | Breadcrumb |
|-------|-----------|---------------|--------|------------|
| `/` | `RootRoute` (Dashboard or Home) | No (conditional) | Working | No |
| `/health` | `Health` | No | Working | No |
| `/daily` | `DailyHub` | No | Working | No (JSON-LD only) |
| `/ask` | `AskPage` | No | Working | No |
| `/grow` | `GrowPage` | No | Working | No |
| `/bible` | `BibleBrowser` | No | Working | No (JSON-LD only) |
| `/bible/:book/:chapter` | `BibleReader` | No | Working | Yes |
| `/music` | `MusicPage` | No | Working | No (JSON-LD only) |
| `/music/routines` | `RoutinesPage` | No | Working | No |
| `/prayer-wall` | `PrayerWall` | No | Working | No (JSON-LD only) |
| `/prayer-wall/dashboard` | `PrayerWallDashboard` | Yes | Working | Yes |
| `/prayer-wall/user/:id` | `PrayerWallProfile` | No | Working | Yes |
| `/prayer-wall/:id` | `PrayerDetail` | No | Working | Yes |
| `/local-support/churches` | `Churches` | No | Working | No (JSON-LD only) |
| `/local-support/counselors` | `Counselors` | No | Working | No (JSON-LD only) |
| `/local-support/celebrate-recovery` | `CelebrateRecovery` | No | Working | No (JSON-LD only) |
| `/verse/:id` | `SharedVerse` | No | Working | No |
| `/prayer/:id` | `SharedPrayer` | No | Working | No |
| `/insights` | `Insights` | Yes | Working | No |
| `/insights/monthly` | `MonthlyReport` | Yes | Working | Yes |
| `/friends` | `Friends` | Yes | Working | No |
| `/settings` | `Settings` | Yes | Working | No |
| `/my-prayers` | `MyPrayers` | Yes | Working | No |
| `/profile/:userId` | `GrowthProfile` | No | Working | No |
| `/reading-plans/:planId` | `ReadingPlanDetail` | No | Working | Yes |
| `/challenges/:challengeId` | `ChallengeDetail` | No | Working | Yes |
| `/meditate/breathing` | `BreathingExercise` | Yes | Working | No |
| `/meditate/soaking` | `ScriptureSoaking` | Yes | Working | No |
| `/meditate/gratitude` | `GratitudeReflection` | Yes | Working | No |
| `/meditate/acts` | `ActsPrayerWalk` | Yes | Working | No |
| `/meditate/psalms` | `PsalmReading` | Yes | Working | No |
| `/meditate/examen` | `ExamenReflection` | Yes | Working | No |
| `/login` | `ComingSoon` | No | Stub | No |
| `/register` | `ComingSoon` | No | Stub | No |
| `/dev/mood-checkin` | `MoodCheckInPreview` | No | Dev-only | No |
| `*` | `NotFound` | No | Working | No |

**Redirect routes (all working):**

| Route | Redirects To |
|-------|-------------|
| `/devotional` | `/daily?tab=devotional` (preserves `?day=` param) |
| `/reading-plans` | `/grow?tab=plans` (preserves `?create=true` param) |
| `/challenges` | `/grow?tab=challenges` |
| `/pray` | `/daily?tab=pray` |
| `/journal` | `/daily?tab=journal` |
| `/meditate` | `/daily?tab=meditate` |
| `/scripture` | `/daily?tab=pray` |
| `/music/playlists` | `/music?tab=playlists` |
| `/music/ambient` | `/music?tab=ambient` |
| `/music/sleep` | `/music?tab=sleep` |

**Total: 35 real routes + 10 redirect routes + 1 catch-all = 46 route definitions.**

---

## 2. Navigation Tree

```
DESKTOP NAVBAR (5 top-level + 1 dropdown)
├── Daily Hub ─────── /daily
├── Bible ─────────── /bible
├── Grow ──────────── /grow
├── Prayer Wall ───── /prayer-wall
├── Music ─────────── /music
├── Local Support ▾ ─ /local-support/churches (clickable label)
│   ├── Churches ──── /local-support/churches
│   ├── Counselors ── /local-support/counselors
│   └── Celebrate Recovery ── /local-support/celebrate-recovery
│
├── [Logged Out] Log In / Get Started → auth modal
├── [Logged In] 🔔 Notification Bell → dropdown panel
└── [Logged In] Avatar ▾
    ├── Dashboard ──── /
    ├── My Prayers ─── /my-prayers
    ├── Friends ────── /friends
    ├── Mood Insights ─ /insights
    ├── Settings ───── /settings
    └── Log Out

MOBILE DRAWER (grouped sections)
├── DAILY
│   └── Daily Hub ─── /daily
├── STUDY
│   ├── Bible ─────── /bible
│   ├── Grow ──────── /grow
│   └── Ask God's Word ── /ask
├── COMMUNITY
│   └── Prayer Wall ─ /prayer-wall
├── LISTEN
│   └── Music ─────── /music
├── FIND HELP
│   ├── Churches ──── /local-support/churches
│   ├── Counselors ── /local-support/counselors
│   └── Celebrate Recovery ── /local-support/celebrate-recovery
├── MY WORSHIP ROOM [logged-in only]
│   ├── Dashboard ──── /
│   ├── My Prayers ─── /my-prayers
│   ├── Friends ────── /friends
│   ├── Mood Insights ─ /insights
│   └── Settings ───── /settings
├── Notifications [logged-in only]
└── Log Out / Log In + Get Started

SITE FOOTER (3 columns)
├── Daily: Pray, Journal, Meditate, Daily Hub
├── Music: Worship Playlists, Ambient Sounds, Sleep & Rest
└── Support: Prayer Wall, Churches, Counselors, Celebrate Recovery
```

---

## 3. Catch-All / 404 Route

**Status: Working.** The `*` catch-all route at `App.tsx:200` renders a `NotFound` component (lines 93-115) that:
- Wraps in `<Layout>` (includes Navbar + Footer)
- Displays "Page Not Found" with a message
- Provides a "Go Home" link to `/`
- Sets `noIndex` on the SEO component
- Has proper `<SEO>` metadata

**Minor issue:** The "Go Home" link uses a raw `<a href="/">` tag (line 106) instead of React Router's `<Link to="/">`. This causes a full page reload instead of client-side navigation. Low severity but inconsistent with the rest of the app.

---

## 4. Top-Level Nav Item Count Assessment

**Desktop: 5 primary items + 1 dropdown = 6 visible elements.** This matches the industry standard (5 or fewer primary items). The Local Support dropdown is a reasonable sixth element since it only appears as a label + chevron and groups 3 related items.

**Mobile drawer: 5 sections with 10 total links (logged out) or 6 sections with 15 total links (logged in).** The grouped section approach is well-executed and avoids the "flat list of 22 items" problem the nav consolidation spec set out to fix.

`[PLANNED FIX]` The nav consolidation spec (`_specs/navbar-consolidation-mobile-drawer.md`) covers this restructuring and it is already implemented.

**Assessment: Nav item count is good.** No action needed.

---

## 5. Ranked Problems

### P1 (High): `/ask` route missing from SiteFooter -- orphaned from desktop navigation

**Severity: High.** The `/ask` (Ask God's Word) page has no link from the desktop navbar and no link from the SiteFooter. The nav consolidation spec (`_specs/navbar-consolidation-mobile-drawer.md`, line 49) explicitly states `/ask` should remain accessible via "SiteFooter nav column," but it is not present in any footer column.

Current access paths for `/ask`:
- Mobile drawer only (STUDY section, `MobileDrawer.tsx:23`)
- Landing page hero TypewriterInput submit (`HeroSection.tsx:95`)
- Direct URL

A desktop user who has never seen the mobile drawer and who is logged in (thus sees the Dashboard instead of the landing page hero) has **no discoverable path to `/ask`**.

**File:** `frontend/src/components/SiteFooter.tsx:4-8` (FOOTER_DAILY_LINKS array)
**Fix:** Add `{ label: "Ask God's Word", to: '/ask' }` to a footer column (likely the "Daily" column or a new "Study" column).

---

### P2 (High): Six meditation sub-pages are dead ends with no in-page back navigation

**Severity: High.** All six meditation sub-pages (`/meditate/breathing`, `/meditate/soaking`, `/meditate/gratitude`, `/meditate/acts`, `/meditate/psalms`, `/meditate/examen`) lack any breadcrumb or "Back to Daily Hub" link. The only way back is:
- The browser back button
- The navbar (which does not highlight Daily Hub as active on `/meditate/*` routes)

The `isNavActive` function (`Navbar.tsx:24-33`) has no case for `/meditate/*` paths -- they match no nav item, so the user sees zero active indicators in the navbar.

After completing a meditation, the `CompletionScreen` component (`components/daily/CompletionScreen.tsx`) renders CTAs via the `ctas` prop, which are passed by the parent page. The `MiniHubCards` component provides links back to Daily Hub tabs. However, the user has no breadcrumb trail ("Daily Hub > Meditate > Breathing Exercise") and no visual orientation during the exercise itself.

**Files:**
- `frontend/src/components/Navbar.tsx:24-33` -- `isNavActive()` missing `/meditate/*` case
- All six files in `frontend/src/pages/meditate/` -- no `Breadcrumb` component imported or rendered

**Fix:** Add a `/meditate` case to `isNavActive` that maps to `/daily`, and add breadcrumbs (e.g., "Daily Hub > Meditate > Breathing Exercise") to each meditation sub-page.

---

### P3 (Medium): `/music/routines` page has no back navigation or breadcrumb

**Severity: Medium.** The Routines page (`/music/routines`) is a sub-page of Music but has no breadcrumb, no "Back to Music" link, and the navbar does correctly highlight Music as active (via `pathname.startsWith('/music')`). However, the user has no in-content navigation back to the parent `/music` page.

**File:** `frontend/src/pages/RoutinesPage.tsx` -- no Breadcrumb import or render
**Fix:** Add `<Breadcrumb items={[{ label: 'Music', href: '/music' }, { label: 'Bedtime Routines' }]} />`.

---

### P4 (Medium): Journey section "Give Thanks" step links to `/` (homepage/dashboard)

**Severity: Medium.** In `JourneySection.tsx:46`, step 4 ("Give Thanks") links to `/`, which renders either the landing page (logged out, creating a circular loop) or the dashboard (logged in, which is not a gratitude feature). The Gratitude Journal is a dashboard widget and has no standalone route, making this link misleading.

A better destination would be `/daily?tab=journal` with a gratitude context, or the `/meditate/gratitude` sub-page if the user is authenticated.

**File:** `frontend/src/components/JourneySection.tsx:46`
**Fix:** Change `to: '/'` to `to: '/daily?tab=journal'` or `/meditate/gratitude`, or remove the link and make the step non-clickable.

---

### P5 (Medium): Footer links missing key features (Bible, Grow)

**Severity: Medium.** The SiteFooter has three columns (Daily, Music, Support) but omits several major features:
- **Bible** (`/bible`) -- a primary nav item, not in the footer
- **Grow** (`/grow`) -- a primary nav item, not in the footer
- **Ask God's Word** (`/ask`) -- covered in P1
- **Insights** (`/insights`) -- auth-gated, but could still appear
- **Friends** (`/friends`) -- auth-gated

The footer is the last resort for users who scrolled past the navbar. Missing primary nav items makes the footer incomplete as a secondary navigation surface.

**File:** `frontend/src/components/SiteFooter.tsx:4-28` (column definitions)
**Fix:** Either add a "Study" column with Bible, Grow, and Ask God's Word, or fold Bible/Grow into an existing column.

---

### P6 (Medium): Insights page uses `ArrowLeft` back link instead of breadcrumb

**Severity: Medium.** The Insights page (`/insights`) renders an `<ArrowLeft>` + "Dashboard" link (line 195-201) as a back-navigation affordance. This is inconsistent with other detail pages (ReadingPlanDetail, ChallengeDetail, BibleReader, MonthlyReport) that all use the `<Breadcrumb>` component. The MonthlyReport (`/insights/monthly`) correctly uses a breadcrumb with "Insights" in the trail.

**File:** `frontend/src/pages/Insights.tsx:195-201`
**Fix:** Replace the ArrowLeft + "Dashboard" link with `<Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Mood Insights' }]} />`.

---

### P7 (Medium): `isNavActive` does not highlight any nav item on `/ask`, `/insights`, `/settings`, `/friends`, `/my-prayers`, `/profile/:userId`

**Severity: Medium.** The `isNavActive` function (`Navbar.tsx:24-33`) only handles 5 paths: `/daily`, `/bible`, `/grow`, `/prayer-wall`, `/music`. When the user is on any other page, zero nav items are highlighted. This is by design for the 5-item model, but means authenticated users on their most-used pages (Dashboard, Insights, Friends, Settings, My Prayers) see no active indicator.

For the avatar dropdown pages, this is arguably fine since those are "My Worship Room" features, not primary nav. But `/ask` (which is in the mobile drawer under STUDY) gets no active state on desktop at all.

**File:** `frontend/src/components/Navbar.tsx:24-33`
**Impact:** Low-medium. The spec explicitly decided not to highlight for these routes. Noting for completeness.

---

### P8 (Low): NotFound page "Go Home" link uses `<a>` instead of `<Link>`

**Severity: Low.** At `App.tsx:106`, the 404 page's "Go Home" link is `<a href="/">` which triggers a full page reload instead of a client-side navigation. All other internal links in the app use React Router's `<Link>` component.

**File:** `frontend/src/App.tsx:106`
**Fix:** Change `<a href="/">Go Home</a>` to `<Link to="/">Go Home</Link>`.

---

### P9 (Low): `/login` and `/register` routes render a placeholder with no way to actually log in

**Severity: Low.** These routes render a `ComingSoon` component that says "Coming Soon" with no further action. Meanwhile, the nav "Log In" and "Get Started" buttons open the auth modal (which also doesn't perform real auth). The routes exist for direct URL access but provide a worse experience than the auth modal. A user who bookmarks `/login` gets a dead end with no redirect to the auth modal.

**File:** `frontend/src/App.tsx:198-199`
**Fix:** Consider redirecting `/login` and `/register` to `/` with an auto-open auth modal trigger, or adding a "Log In with the button above" message with a click handler.

---

### P10 (Low): Shared verse/prayer pages (`/verse/:id`, `/prayer/:id`) have no breadcrumb

**Severity: Low.** These are standalone share pages designed for external sharing (social media, messaging). They include Navbar + Footer but no breadcrumb. The verse page has a "Go to Daily Hub" link in the not-found state but not in the success state. The prayer page similarly only has a "Go to Daily Hub" in the not-found state.

For externally shared links, this is acceptable -- users arriving from a social link should see the content without complex wayfinding. But the successful render of `/verse/:id` has no CTA to explore further (e.g., "Read more in the Bible," "Start your own prayer").

**Files:**
- `frontend/src/pages/SharedVerse.tsx`
- `frontend/src/pages/SharedPrayer.tsx`
**Fix:** Low priority. Consider adding a gentle CTA after the shared content (e.g., "Explore more on Worship Room" linking to `/daily`).

---

### P11 (Low): Friends page and Settings page have no breadcrumb or back link

**Severity: Low.** Both `/friends` and `/settings` are accessible only from the avatar dropdown and mobile drawer "My Worship Room" section. They have no breadcrumb trail back to the dashboard. The navbar is always present so navigation is not blocked, but these pages feel disconnected from the dashboard they logically belong to.

**Files:**
- `frontend/src/pages/Friends.tsx`
- `frontend/src/pages/Settings.tsx`
**Fix:** Optional. A breadcrumb ("Dashboard > Friends") would improve orientation but is low priority.

---

## 6. Link Verification Summary

Every link in every navigation component was verified against the route table in `App.tsx`:

| Component | File | Links | All Resolve? |
|-----------|------|-------|--------------|
| Desktop Nav (5 items) | `Navbar.tsx:16-21` | `/daily`, `/bible`, `/grow`, `/prayer-wall`, `/music` | Yes |
| Local Support Dropdown | `LocalSupportDropdown.tsx:6-9` | 3 links | Yes |
| Avatar Dropdown | `AvatarDropdown.tsx:5-11` | `/`, `/my-prayers`, `/friends`, `/insights`, `/settings` | Yes |
| Mobile Drawer | `MobileDrawer.tsx:16-39` | 15 links total | Yes |
| SiteFooter | `SiteFooter.tsx:4-22` | 11 links (all redirects resolve) | Yes |

**No broken links found.** All navigation links resolve to either a direct route or a valid redirect.

---

## 7. Summary of Navigation Health

**Strengths:**
- Clean 5-item primary nav (matches industry best practice)
- Well-organized mobile drawer with semantic group headings
- Breadcrumbs implemented on most detail pages (BibleReader, ReadingPlanDetail, ChallengeDetail, PrayerDetail, PrayerWallProfile, PrayerWallDashboard, MonthlyReport)
- All redirect routes work correctly and preserve query parameters
- Robust catch-all 404 page with Layout wrapping
- No broken links anywhere in the navigation

**Weaknesses (by severity):**
1. `/ask` orphaned from desktop navigation and footer (P1)
2. Six meditation sub-pages are dead ends with no active nav indicator (P2)
3. `/music/routines` has no breadcrumb (P3)
4. Journey "Give Thanks" links to `/` creating a circular path (P4)
5. Footer missing key features: Bible, Grow (P5)
6. Inconsistent back-navigation pattern on Insights page (P6)

**`[PLANNED FIX]` items already covered by existing specs:**
- The 5-item nav consolidation is implemented (`navbar-consolidation-mobile-drawer.md`)
- The `/grow` tabbed experience is implemented (`grow-page-tabbed-experience.md`)
- Breadcrumbs are implemented on detail pages (`breadcrumb-navigation.md`)
- Inner page hero redesigns are implemented
