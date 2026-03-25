# Worship Room Frontend Feature Audit (Post-41 Specs)
**Date:** 2025-03-24
**Scope:** Full frontend codebase after all Phase 2.x implementations
**Purpose:** Feed into competitive analysis and UX enhancement round

---

## EXECUTIVE SUMMARY: TOP 10 MOST IMPACTFUL ISSUES

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| **1** | **Build is broken** — 61 TypeScript errors across 28 files. Cannot deploy. Root cause: `localVisit` activity type added without updating downstream references (tests + production code). | P0 | Blocks all deployments and CI/CD |
| **2** | **Two navbar links 404** — `/journal/my-entries` and `/favorites` in avatar dropdown have no routes or components. Users who click these hit the 404 page. | P0 | Broken navigation for logged-in users |
| **3** | **Main JS bundle is 2.29 MB** — All application code ships in one chunk. Bible books are lazy-loaded but the core app is not code-split. First load on mobile 3G would exceed 10 seconds. | P1 | Unacceptable load time for mobile-first audience |
| **4** | **Empty states missing across the board** — New users see blank areas for Journal, Prayer Wall, Bible highlights, Friends, Insights, and Reading Plans. Only My Prayers has a warm empty state. | P1 | Cold first impression; users don't know what to do |
| **5** | **AI Bible Chat verses aren't clickable** — `/ask` responses reference Scripture but don't link to `/bible/:book/:chapter`. Users can't jump to verse context. | P1 | Breaks the natural read flow; most valuable cross-feature link is missing |
| **6** | **26 cross-feature integration gaps** — Features feel siloed. Gratitude data not in Insights. Local Support visits don't earn points. Challenge completion has no dashboard CTA. Meditation has no link to Insights. | P1 | Features exist in isolation; undermines holistic growth narrative |
| **7** | **Navbar has 8+ top-level items** — Spec called for 3 (Daily Hub, Prayer Wall, Music). Current nav has 8 links + Local Support dropdown + auth buttons. On mobile, the drawer has 22+ items. | P2 | Information overload; dilutes feature hierarchy |
| **8** | **Form accessibility gaps** — No `aria-invalid`, no inline validation messages, textareas lack `aria-label`, no character count indicators on limited inputs. | P2 | Screen reader users can't navigate forms effectively |
| **9** | **28 badges vs ~45 specified** — Badge system covers streaks, levels, and activities but is thinner than spec (missing granular community/reading plan/challenge tier badges). | P2 | Gamification feels less rewarding than designed |
| **10** | **No professional audio content** — TTS narration for Bible readings and guided prayers vs. Hallow/Abide studio-quality recordings. 50 devotionals vs. YouVersion's 100+. | P2 | Perception gap with competitors on content quality |

---

## SECTION 1: WHAT'S BROKEN OR DEGRADED

### 1.1 Build & CI/CD Failures

**The build (`pnpm build`) fails with 61 TypeScript errors in 28 files.**

The most widespread root cause is the addition of `localVisit` as an `ActivityType` without updating all downstream references:

| Error Pattern | Count | Files Affected |
|---------------|-------|----------------|
| Missing `localVisit` in `DailyActivities`/`Record<ActivityType, boolean>` | 9+ | badge-engine.test, leaderboard.test, ActivityChecklist, EveningReflection.test, empty-states.test |
| `user` type changed (nullable vs object) but tests still pass `{ name, id }` | 17 | AskPage.test, VerseCardActions.test, and others |
| `UserSettings` not assignable to `Record<string, unknown>` | 2 | settings-storage.ts (production code) |
| Missing `FriendRequest` type in useFriends.ts | 2 | useFriends.ts (production code) |
| `RefObject` type mismatches | 2 | VisitButton.tsx, CreatePlanFlow.tsx |
| Missing icon `"bible-navigate"` in RoutineStepper.tsx | 1 | RoutineStepper.tsx (production code) |
| Unused variables/imports | 4 | Various test files |

**Production code with TypeScript errors (not just tests):**
- `src/components/audio/RoutineStepper.tsx` — missing icon mapping
- `src/components/local-support/VisitButton.tsx` — RefObject mismatch
- `src/components/music/RoutineBuilder.tsx` — StepType issues
- `src/components/reading-plans/CreatePlanFlow.tsx` — RefObject readonly
- `src/components/SeasonalBanner.tsx` — extra `description` property
- `src/hooks/useFriends.ts` — missing `FriendRequest` type
- `src/services/settings-storage.ts` — type mismatch

### 1.2 Lint Failures

**69 problems: 45 errors + 24 warnings** (ESLint configured with `--max-warnings 0`)

| Rule | Count | Type |
|------|-------|------|
| `@typescript-eslint/no-unused-vars` | 13 | Error |
| `@typescript-eslint/no-explicit-any` | 10 | Error |
| `react-refresh/only-export-components` | 9 | Warning |
| `react-hooks/exhaustive-deps` | 8 | Warning |
| `@typescript-eslint/no-this-alias` | 3 | Error |
| Other | 2 | Error |

### 1.3 Test Failures

**14 tests fail out of 4,254 (99.67% pass rate)**

| Test File | Failures | Root Cause |
|-----------|----------|------------|
| `ActivityChecklist.test.tsx` | 8/21 | Activity count changed (localVisit added), assertions expect old count |
| `dashboard-widgets-integration.test.tsx` | 4/5 | Same activity count mismatch (`0/7` vs actual) |
| `DashboardWidgetGrid.test.tsx` | 1/8 | Same root cause |
| `MyPrayers.test.tsx` | 1/26 | Timeout at 5000ms rendering 200 prayer items |
| `full-site-audit.spec.ts` | 0 | Playwright test accidentally in Vitest run |

### 1.4 Broken Navigation Links

Two links in the avatar dropdown menu (desktop + mobile drawer) point to non-existent routes:

| Link Label | Target Route | Status |
|------------|-------------|--------|
| "My Journal Entries" | `/journal/my-entries` | **404** — no route, no component |
| "My Favorites" | `/favorites` | **404** — no route, no component |

These are in `AVATAR_MENU_LINKS` (Navbar.tsx:361) and `MOBILE_DRAWER_EXTRA_LINKS` (Navbar.tsx:375).

### 1.5 Known Regressions Since Last Audit

- **Hero video background** — previously identified as a regression; status unchanged
- **Activity count assertions** — all dashboard test assertions off by 1 due to `localVisit` addition

---

## SECTION 2: NAVIGATION AND INFORMATION ARCHITECTURE

### 2.1 Current Navigation Structure

**Desktop Navbar (8 top-level items + dropdown + auth):**
1. Daily Hub → `/daily`
2. Ask → `/ask` (Sparkles icon)
3. Bible → `/bible` (Book icon)
4. Daily Devotional → `/devotional` (Sparkles icon)
5. Reading Plans → `/reading-plans` (BookOpen icon)
6. Challenges → `/challenges` (Flame icon + animated pulse)
7. Prayer Wall → `/prayer-wall`
8. Music → `/music`
9. [Dropdown] Local Support → Churches / Counselors / Celebrate Recovery
10. [Auth] Log In / Get Started (logged out) OR Notification Bell + Avatar (logged in)

**Avatar Dropdown (logged in, 11 items):**
1. Dashboard → `/`
2. Friends → `/friends`
3. My Journal Entries → `/journal/my-entries` (BROKEN)
4. My Prayer Requests → `/prayer-wall/dashboard`
5. My Prayers → `/my-prayers`
6. My Favorites → `/favorites` (BROKEN)
7. Mood Insights → `/insights`
8. Monthly Report → `/insights/monthly` (not in spec)
9. Settings → `/settings`
10. [Divider]
11. Log Out

**Mobile Drawer (logged in, 22+ items):**
All desktop nav items + avatar dropdown items + profile link + notifications button.

### 2.2 Navigation Overload Assessment

**The spec (CLAUDE.md UX flows) called for 3 top-level nav items: Daily Hub, Prayer Wall, Music.**

Current implementation has **8 top-level items**, nearly 3x the original design. This happened incrementally as features were built — each new feature got a navbar slot.

**Impact on mobile:**
- The mobile drawer scrolls with 22+ items
- No clear visual hierarchy between "daily use" and "explore" items
- A first-time user faces decision paralysis

**Recommendation:** Consolidate navigation into a tiered structure:
- **Tier 1 (always visible):** Daily Hub, Bible, Music
- **Tier 2 (dropdown "Explore"):** Ask, Devotional, Reading Plans, Challenges, Prayer Wall
- **Tier 3 (dropdown "Local Support"):** Churches, Counselors, Celebrate Recovery
- **Tier 4 (avatar menu):** Dashboard, Friends, Insights, My Prayers, Settings

### 2.3 Dead Ends and Circular Paths

**Dead ends identified:** None — all pages have back navigation or navbar access.

**Circular paths:** None detected.

**Missing breadcrumbs:**
- Bible Reader has no breadcrumb back to Bible Browser
- Challenge Detail has no breadcrumb to Challenge Browser
- Reading Plan Detail has no breadcrumb to Plans Browser

### 2.4 Z-Index Management

No conflicts detected. Ordering is correct:
- Mobile backdrop: `z-40`
- Navbar + dropdowns: `z-50`
- Notification panel: `z-[60]`
- Audio components: `z-9999+`

---

## SECTION 3: CROSS-FEATURE INTEGRATION GAPS

### 3.1 What Works Well (Strong Cross-Links)

| Flow | Integration | Quality |
|------|-------------|---------|
| Pray → Journal | "Journal about this prayer" CTA | Excellent |
| Journal → Meditate | "Continue to Meditate" CTA | Excellent |
| Bible Reader → Pray/Journal | "Pray about this chapter" / "Journal your thoughts" | Excellent |
| Devotional → Journal | "Journal about this" CTA with context | Excellent |
| Evening Reflection → Sleep | "Go to Sleep & Rest" CTA | Good |
| Mood Check-In → Recommendations | Mood-to-content recommendation cards | Good |
| Dashboard Widgets → Features | All widgets link to full feature pages | Good |
| "Enhance with Sound" pills | Ambient cross-pollination on Pray, Journal, Bible | Good |
| Activity Tracking → Gamification | `recordActivity()` called across all features | Excellent |

### 3.2 Critical Missing Integrations

#### 1. Ask God's Word → Bible Reader (HIGH)
**Gap:** AI chat responses include verse references but they're plain text, not clickable links.
**Expected:** `John 3:16` in a response should link to `/bible/john/3#verse-16`
**Impact:** Users can't explore verse context; breaks the natural reading flow.

#### 2. Meditation → Insights (HIGH)
**Gap:** Completing a meditation shows "Continue to Pray/Journal" but never links to Insights.
**Expected:** After 7+ sessions, show "View your meditation trends" → `/insights`
**Impact:** Users don't discover the value of tracking their practice.

#### 3. Gratitude Journal → Insights (HIGH)
**Gap:** Gratitude entries (`wr_gratitude_entries`) are saved but never surfaced in Insights correlations.
**Expected:** "Your gratitude practice correlates with higher mood" in Activity Correlations.
**Impact:** Gratitude data exists but provides no feedback loop.

#### 4. Local Support "I Visited" → Gamification (HIGH)
**Gap:** Users record visits but `recordActivity()` is never called. No points, no badges, no dashboard widget.
**Expected:** "I visited" should award faith points and trigger "Local Support Seeker" badge.
**Impact:** Local Support feature is completely disconnected from growth system.

#### 5. Challenge Completion → Dashboard CTAs (MEDIUM)
**Gap:** `ChallengeCompletionOverlay` shows "Browse more challenges" but no link to Dashboard, badge display, or leaderboard.
**Expected:** "See your growth" → dashboard, "Check the leaderboard" → `/friends?tab=leaderboard`

#### 6. Bible Reader → Dashboard (MEDIUM)
**Gap:** Bible reading tracks progress in localStorage but has no CTA to Dashboard or Insights.
**Expected:** After completing a book, show "Check your reading progress" or a celebration.

#### 7. Reading Plan → Challenge Integration (MEDIUM)
**Gap:** Completing a reading plan doesn't suggest thematically related challenges.
**Expected:** After "Lent Reflection" plan → suggest "Pray40: A Lenten Journey" challenge.

#### 8. Badge Celebrations → Feature Suggestions (MEDIUM)
**Gap:** Badge earned → celebration toast, but no CTA to related features.
**Expected:** "Prayer Warrior" badge → "Try audio-guided prayer!" suggestion.

#### 9. Prayer List → Insights (MEDIUM)
**Gap:** Answered prayers, categories, frequency not visualized in Insights.
**Expected:** "You prayed about X, and mood improved" correlation.

#### 10. Crisis Detection → Counselor Locator (HIGH — safety)
**Gap:** Crisis banner shows 988/Crisis Text Line but no CTA to the Local Support counselor locator.
**Expected:** "Find a counselor near you" → `/local-support/counselors`

#### 11. Prayer Wall → Personal Prayer List (MEDIUM)
**Gap:** No "Save to my prayers" button on community prayer cards.
**Expected:** Easy conversion from community prayer to personal tracking.

#### 12. Bible Highlights → Dashboard (MEDIUM)
**Gap:** Highlights and notes stored in localStorage but never surfaced on Dashboard.
**Expected:** "Recently highlighted verses" widget or feed.

#### 13. Verse of the Day → Meditation (LOW)
**Gap:** VOTD is isolated; no "Meditate on this verse" → `/meditate/soaking?verse=...`

#### 14. Sleep Content → Morning Follow-Up (LOW)
**Gap:** Sleep timer ends in silence. No "Good morning" check-in or reflection prompt.

#### 15. Monthly Report → Recommendations (LOW)
**Gap:** Data shown but no actionable CTAs based on trends (e.g., "Try meditation more").

**Total missing integrations found: 26**

---

## SECTION 4: FEATURE-BY-FEATURE UX FRICTION AUDIT

### 4.1 Click Depth from Landing Page

| Feature | Clicks (Logged Out) | Clicks (Logged In) | Auth Required? |
|---------|--------------------|--------------------|----------------|
| Prayer Generation | 2 (nav → type → submit) | 2 | Yes (to generate) |
| Journal | 2 (nav → tab → type) | 2 | Yes (to save) |
| Meditation | 3 (nav → tab → card → sub-page) | 3 | Yes |
| Bible Reader | 3 (nav → book → chapter) | 3 | No |
| Devotional | 1 (nav link) | 1 | No |
| Reading Plans | 2 (nav → select plan) | 2 | Yes (to start) |
| Prayer Wall | 1 (nav link) | 1 | No (to read) |
| Challenges | 2 (nav → select challenge) | 2 | Yes (to join) |
| AI Bible Chat | 2 (nav → type question) | 2 | Yes |
| Music/Ambient | 2 (nav → tab) | 2 | No |
| Sleep Content | 2 (nav → Sleep tab) | 2 | No |
| My Prayers | 2 (avatar → My Prayers) | 2 | Yes |
| Insights | 2 (avatar → Insights) | 2 | Yes |
| Local Support | 2 (dropdown → select type) | 2 | No (to search) |
| Mood Check-In | N/A | 0 (auto on dashboard) | Yes |
| Evening Reflection | N/A | 0 (auto after 6 PM) | Yes |

### 4.2 Empty State Audit

| Feature | Has Empty State? | Quality |
|---------|-----------------|---------|
| My Prayers | Yes | Warm, encouraging, with CTA |
| Journal (saved entries) | **No** | Blank area, no guidance |
| Prayer Wall (no posts) | **No** | Blank feed |
| Bible Highlights/Notes | **No** | Empty list, no encouragement |
| Friends (no friends) | **No** | Empty list |
| Leaderboard (not participating) | **No** | No "join" prompt |
| Insights (no mood data) | **No** | Charts render with no data |
| Reading Plan progress | **No** | Just shows plan cards |
| Dashboard (brand new user) | **Partial** | Widgets show but feel empty |
| Gratitude widget | **No** | Empty inputs, no explanation |

**Assessment:** 9 out of 10 major features lack proper empty states. This is a critical new-user experience gap.

### 4.3 Loading State Audit

| Component | Has Loading State? | Quality |
|-----------|-------------------|---------|
| Bible Reader (chapter load) | Yes | ChapterPlaceholder skeleton |
| Spotify Embed | Partial | Timeout-based error, no visual loader |
| Prayer Generation | Partial | Button disabled, no spinner |
| Bible Audio | **No** | No indicator for TTS load |
| Insights calculations | **No** | Synchronous, could lag on 365 days |
| Dashboard widgets | **No** | Instant (localStorage), but no skeleton for Phase 3 |

**Pattern:** No global loading pattern. Each component implements independently. No consistent skeleton screen system.

### 4.4 Form UX Issues

| Form | Issues |
|------|--------|
| Auth Modal (Login/Register) | No `aria-invalid`, no inline errors, no password strength indicator, no confirm-password validation |
| Prayer Wall Composer | No `aria-label` on textarea, no character count display |
| Pray Tab Input | No visible char count (500 limit), no `aria-label` |
| Journal Input | No visible char count (5000 limit), no `aria-label`, no "unsaved changes" warning |
| Comment Input | No `aria-label`, no character count |
| Bible Note Editor | No `aria-label`, no visible limit |
| Settings Forms | Not reviewed in detail |

**Systemic issues:**
- No inline validation messages anywhere (errors shown as toasts only)
- No `aria-invalid` or `aria-describedby` on any form input
- No character count indicators on any textarea
- No "Leave without saving?" prompt on any form
- No required field indicators (asterisks or text)

### 4.5 Touch Target Compliance

Most interactive elements meet the 44px minimum. Some `p-2` (8px padding) buttons on icon-only controls are borderline. The floating action bar and chapter grid buttons properly use `min-h-[44px]`.

### 4.6 Features That Feel Half-Baked

| Feature | Issue |
|---------|-------|
| `/login` and `/register` | ComingSoon placeholder pages |
| Challenge share button | TODO comment — not implemented |
| AI plan generation | Keyword matching to presets, not real AI |
| All AI features | Hardcoded mock responses (Phase 3 dependency) |
| Search (Bible) | BibleSearchMode exists but search across all books is not fully implemented |

---

## SECTION 5: MISSING POLISH AND DELIGHT

### 5.1 Where It Feels Flat or Clinical

| Location | Issue | Recommendation |
|----------|-------|----------------|
| Error boundary | "Something went wrong" — cold, generic | "Oops! Something didn't load right. Let's try again." with warm icon |
| Empty lists | Blank space, no visual cue | Illustrated empty states with encouraging messages |
| Form validation | Red toast notification, no inline context | Inline messages near the input with helpful text |
| Bible chapter load | Just text appearing | Subtle fade-in animation on verse text |
| Settings page | Functional toggles, no personality | Could use section descriptions explaining *why* each setting matters |
| Profile page | Data-heavy, metric-focused | Could add encouraging narrative ("Your garden is growing!") |

### 5.2 Where It Feels Abrupt

| Transition | Current | Better |
|------------|---------|--------|
| Route changes | Instant mount/unmount | Subtle page fade (200ms) |
| List items appearing | Instant render | Staggered fade-in (50ms delay each) |
| Modal opening | Fade-in (basic) | Spring animation (scale + fade) |
| Tab switching | CSS show/hide | Slide animation (already on Daily Hub, not elsewhere) |
| Toast appearing | Slide from right | Scale + spring from bottom-right |
| Prayer wall card load | Instant batch | Staggered entrance (50ms per card) |

### 5.3 Where Sound Could Add Emotional Weight

| Moment | Current | Opportunity |
|--------|---------|-------------|
| Badge earned | Visual confetti + toast | Soft chime or harp note |
| Streak milestone | Visual celebration | Bell tone |
| Prayer answered | Celebration overlay | Angelic chord |
| Level up | Celebration screen | Ascending tone sequence |
| Evening reflection start | Silent transition | Gentle bell to signal wind-down |
| Mood check-in completion | Instant transition | Soft confirmation tone |

Note: Sound should always respect user preferences (mute toggle, `prefers-reduced-motion`).

### 5.4 Where It Feels Disconnected

| Feature | Isolation Issue |
|---------|----------------|
| Gratitude widget | Exists on dashboard but data never appears in Insights |
| Bible highlights | Stored but never surfaced outside Bible Reader |
| Local Support visits | Tracked but disconnected from gamification |
| QOTD responses | Submitted but not integrated into any analytics |
| Badge system | Celebrates but doesn't suggest next features |
| Verse of the Day | Dashboard widget but no link to meditation or devotional |

### 5.5 Where It Feels Overwhelming

| Location | Issue |
|----------|-------|
| Mobile navbar drawer | 22+ items with no visual grouping |
| Dashboard (returning user) | Widgets + garden + streak + points + badges + checklist + evening banner + challenge overlay competing for attention |
| Reading Plans browser | 10 plans with full descriptions, no filtering |
| Prayer Wall categories | 9 categories as horizontal scroll, plus QOTD, plus composer, plus filter |
| Challenges page | 5 challenges with lengthy descriptions |

---

## SECTION 6: CONTENT AND DATA COMPLETENESS

### 6.1 Content Inventory

| Content Area | Spec | Actual | Status |
|-------------|------|--------|--------|
| Bible Books | 66 | 66 | Complete |
| Verse of the Day | 60 | 61 | Complete (slightly over) |
| Devotionals | 50 (30+20 seasonal) | 50 (30+20) | Complete |
| Reading Plans | 10 | 10 (7/14/21 days) | Complete |
| Community Challenges | 5 seasonal | 5 (Lent/Easter/Pentecost/Advent/NewYear) | Complete |
| Questions of the Day | 72 (60+12 seasonal) | 72 (60+12) | Complete |
| Prayer Wall Categories | 9 | 9 | Complete |
| Ambient Sounds | 24 | 24 | Complete |
| Bible Reading Scenes | 3 | 3 | Complete |
| Scene Presets | 11 | 11 | Complete |
| Spotify Playlists | 7 | 9 | Over-delivered |
| Scripture Readings | — | 24 | Complete |
| Guided Prayer Sessions | 8 | 8 (5/10/15 min) | Complete |
| Bedtime Stories | — | 12 | Complete |
| Meditation Types | 6 | 6 | Complete |
| Badges | ~45 | 28 | **Under-delivered** |
| Faith Levels | 6 | 6 (Seedling→Lighthouse) | Complete |
| Avatar Presets | — | 16 (4 categories × 4) | Complete |
| Crisis Resources | 3 | 3 | Complete |
| Self-Harm Keywords | 8+ | 8 | Complete |
| Encouragement Presets | 4 | 4 | Complete |

### 6.2 Badge Gap Analysis

Spec estimated ~45 badges. Implementation has 28:
- Streak: 7 (7d through 365d)
- Level: 6 (all 6 stages)
- Activity Milestones: 6 (First Prayer, Prayer 100, First Journal, Journal 50, Journal 100, First Meditate)
- Reading Plans: 3 (First Plan, 5 Plans, All Plans)
- Community: 2 (Friend added, First encouragement)
- Challenges: 4 (various seasonal)
- Special: 1 (Welcome)

**Missing badge categories:** Meditation milestones (10/25/50/100 sessions), Prayer Wall milestones (10/25/50 posts), Bible reading milestones (10/25/50 chapters), Gratitude milestones, Local Support badges, Audio listening milestones, more granular challenge tier badges.

### 6.3 Liturgical Calendar Accuracy

- Easter calculation uses Computus algorithm — **correct**
- 8 seasons defined: Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time
- Season-dependent features: dashboard greeting, devotional priority, VOTD, landing page banner, QOTD, navbar icon
- Date calculations tested for current year

### 6.4 Mock Data Quality

| Data Type | Entries | Realism |
|-----------|---------|---------|
| Prayer Wall prayers | 21 | Generic names (Johnson, Smith), adequate |
| Mock friends | 10 | Generic names/avatars |
| Global leaderboard | 50 entries | Generated names |
| Local Support locations | 30 | Real Columbia, TN addresses |
| AI chat responses | 3 threads | Hardcoded but realistic |
| Prayer generation | Templates | Realistic WEB-based prayers |

All mock data is tagged as Phase 2 frontend-first. 6 intentional TODO comments mark Phase 3 API integration points.

---

## SECTION 7: PERFORMANCE AND TECHNICAL HEALTH

### 7.1 Bundle Size

| Asset | Size | Concern |
|-------|------|---------|
| **Main JS bundle** | **2.29 MB** | Very large — needs code splitting |
| CSS | 107 KB | Acceptable |
| Bible book chunks (66 files) | 10-262 KB each | Correctly lazy-loaded |
| Psalms chunk | 262 KB | Largest Bible chunk |
| **Total dist** | **7.2 MB** | 70 asset files |

The main bundle includes all application code, Recharts, React Router, and other dependencies. It needs route-level code splitting.

### 7.2 Source Code Size

- **Total:** 129,265 lines across 875 `.ts`/`.tsx` files
- **Test files:** 390 (4,254 individual tests)

**Large components (over 500 lines, non-data):**

| File | Lines | Concern |
|------|-------|---------|
| `Navbar.tsx` | 957 | Should extract MobileDrawer, dropdowns |
| `PrayTabContent.tsx` | 850 | Should extract sub-components |
| `GrowthGarden.tsx` | 765 | SVG complexity; acceptable for visual component |
| `JournalTabContent.tsx` | 719 | Should extract search, voice input |
| `BibleReader.tsx` | 697 | Should extract audio, highlights panels |
| `WelcomeWizard.tsx` | 557 | Multi-step wizard; acceptable |
| `ChallengeDetail.tsx` | 513 | Could extract daily content panel |
| `useRoutinePlayer.ts` | 504 | Complex hook; acceptable |

### 7.3 localStorage Dependency

**1,021 references** to `localStorage` across the codebase. This is the expected Phase 2 architecture (all persistence is client-side). Migration to API in Phase 3 will be substantial.

**Storage keys:** 40+ keys with `wr_` prefix (see CLAUDE.md `11-local-storage-keys.md`).

**Potential concerns:**
- `wr_mood_entries` capped at 365 entries — could approach 100+ KB
- `wr_bible_highlights` capped at 500 — could be large with note text
- `wr_meditation_history` capped at 365 sessions
- No cross-tab synchronization (localStorage updates don't sync)
- No data corruption recovery mechanism

### 7.4 TypeScript Configuration

Strong strict settings:
- `"strict": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`
- `"skipLibCheck": true` (standard optimization)

### 7.5 Dependency Health

- **Production dependencies:** 14 (lean)
- **Dev dependencies:** 24
- **Total:** 38
- **Lockfile:** 7,344 lines

### 7.6 TODO Comments

Only 6 TODOs in the codebase — all are intentional Phase 3 markers:

| File | TODO |
|------|------|
| `ChallengeCompletionOverlay.tsx` | Implement share functionality |
| `ListenTracker.tsx` | Replace `readAuthFromStorage()` with `useAuth()` |
| `CommentInput.tsx` | Replace keyword check with backend crisis API |
| `InlineComposer.tsx` | Replace keyword check with backend crisis API |
| `PrayerWall.tsx` | POST to `/api/prayer-replies` |
| `PrayerWallDashboard.tsx` | Fetch real user profile |

No FIXME, HACK, or XXX comments found.

---

## SECTION 8: COMPETITOR FEATURE GAPS

### 8.1 Worship Room's Competitive Advantages

| Advantage | Details | Competitor Comparison |
|-----------|---------|----------------------|
| **Liturgical Calendar** | Seasons dynamically customize all content | YouVersion/Hallow: static content |
| **Visual Growth Garden** | 6-stage animated SVG with ambient effects | No competitor equivalent |
| **Grace-Based Gamification** | Free streak repair, never punishes absence | YouVersion: strict streak reset |
| **AI Bible Chat** | `/ask` for theology Q&A with verse linking | YouVersion: no equivalent |
| **Local Support Locator** | Churches, counselors, CR with distance | No competitor equivalent |
| **Audio Mixer** | User-created ambient mixes (24 sounds) | Hallow/Abide: fixed playlists only |
| **Evening Reflection** | 4-step wind-down ritual | Competitors: mood tracking only |
| **Meditation Variety** | 6 distinct types | Competitors: 1-2 types |
| **Personal Prayer Tracking** | Categories, reminders, answered celebrations | Competitors: community prayer focus |

### 8.2 Critical Competitor Gaps

| Gap | Competitor(s) | Impact | Difficulty |
|-----|---------------|--------|------------|
| **Professional audio narration** | Hallow (250+ sessions), Abide (400+) | TTS feels less premium; core content perception issue | High (budget) |
| **Native mobile apps** | All competitors | PWA limitations: no push notifications, no offline reliability, no App Store discovery | High (Phase 4) |
| **Content library scale** | YouVersion (100+ devotionals, 1000+ plans) | 50 devotionals and 10 plans feel limited | Medium |
| **Real-time community** | YouVersion (live events), Hallow (group challenges) | Worship Room is async-only | Medium |
| **Celebrity/pastor voices** | Pray.com, Hallow | No authority figures, all AI-generated | Low priority |
| **Family plans** | Pray.com | No family/group accounts | Low (future) |
| **Verse image sharing** | YouVersion | No pre-made shareable verse cards for social media | Low-Medium |
| **Church integration** | YouVersion (church admin panel, church-wide plans) | No institutional features | Low (future) |
| **Health app integration** | Hallow (Apple Health meditation minutes) | No Apple Health / Google Fit sync | Low |
| **Email digest** | YouVersion, Hallow | In-app reminders only, no email | Low |

### 8.3 Feature Depth Comparison

| Dimension | Worship Room | YouVersion | Hallow | Abide | Pray.com |
|-----------|-------------|-----------|--------|-------|----------|
| Daily Practices | 6 | 5 | 6 | 4 | 4 |
| Gamification | 5 (streak, points, badges, levels, garden) | 2 | 2 | 0 | 1 |
| Social Features | 5 (friends, encouragements, leaderboard, wall, challenges) | 4 | 3 | 0 | 4 |
| Audio Content | Mixer + 24 sounds + 8 scenes + TTS | TTS Bible only | 250+ guided | 400+ guided | Podcasts |
| Bible | 66 books + highlights + notes + audio | 100+ translations | None | None | None |
| AI Features | Chat + prayer gen + plan gen (mock) | Verse suggestions | Mood matching | None | Real AI chat |
| Onboarding | Wizard + checklist + tooltips | Minimal | Moderate | Minimal | Moderate |
| Test Coverage | 4,254 tests | Proprietary | Proprietary | N/A | N/A |

### 8.4 Strategic Positioning

**Worship Room is deepest on:** Gamification + visual metaphor, liturgical awareness, meditation variety, personal prayer tracking, local community integration.

**Worship Room is weakest on:** Audio production quality, content library scale, native mobile apps, real-time social, celebrity content.

**Competitive niche:** Faith-driven emotional healing for introspective, liturgically-aware users who value grace-based gamification and personalization over celebrity content or massive content breadth.

---

## APPENDIX A: ROUTE INVENTORY

### Public Routes (27)
| Route | Component | Status |
|-------|-----------|--------|
| `/` | Home (logged-out) / Dashboard (logged-in) | Working |
| `/daily` | DailyHub | Working |
| `/ask` | AskPage | Working |
| `/devotional` | DevotionalPage | Working |
| `/reading-plans` | ReadingPlans | Working |
| `/reading-plans/:planId` | ReadingPlanDetail | Working |
| `/challenges` | Challenges | Working |
| `/challenges/:challengeId` | ChallengeDetail | Working |
| `/bible` | BibleBrowser | Working |
| `/bible/:book/:chapter` | BibleReader | Working |
| `/verse/:id` | SharedVerse | Working |
| `/prayer/:id` | SharedPrayer | Working |
| `/prayer-wall` | PrayerWall | Working |
| `/prayer-wall/dashboard` | PrayerWallDashboard | Working |
| `/prayer-wall/user/:id` | PrayerWallProfile | Working |
| `/prayer-wall/:id` | PrayerDetail | Working |
| `/music` | MusicPage | Working |
| `/music/routines` | RoutinesPage | Working |
| `/local-support/churches` | Churches | Working |
| `/local-support/counselors` | Counselors | Working |
| `/local-support/celebrate-recovery` | CelebrateRecovery | Working |
| `/meditate/breathing` | BreathingExercise | Working |
| `/meditate/soaking` | ScriptureSoaking | Working |
| `/meditate/gratitude` | GratitudeReflection | Working |
| `/meditate/acts` | ActsPrayerWalk | Working |
| `/meditate/psalms` | PsalmReading | Working |
| `/meditate/examen` | ExamenReflection | Working |
| `/login` | ComingSoon | Stub |
| `/register` | ComingSoon | Stub |
| `/health` | Health | Working |
| `*` | NotFound | Working |

### Protected Routes (7)
| Route | Component | Status |
|-------|-----------|--------|
| `/` | Dashboard | Working |
| `/insights` | Insights | Working |
| `/insights/monthly` | MonthlyReport | Working |
| `/friends` | Friends | Working |
| `/settings` | Settings | Working |
| `/my-prayers` | MyPrayers | Working |
| `/profile/:userId` | GrowthProfile | Working |

### Legacy Redirects (7)
| From | To |
|------|-----|
| `/pray` | `/daily?tab=pray` |
| `/journal` | `/daily?tab=journal` |
| `/meditate` | `/daily?tab=meditate` |
| `/scripture` | `/daily?tab=pray` |
| `/music/playlists` | `/music?tab=playlists` |
| `/music/ambient` | `/music?tab=ambient` |
| `/music/sleep` | `/music?tab=sleep` |

---

## APPENDIX B: ANIMATION INVENTORY

40+ custom keyframes in tailwind.config.js:
- **Entrance:** fade-in, slide-from-right/left, widget-enter, dropdown-in
- **Celebration:** confetti-burst, confetti-fall, celebration-spring, sparkle-rise
- **Ambient:** garden-leaf-sway, garden-butterfly-float, water-shimmer, glow-pulse
- **Interactive:** breathe-expand/contract, pray-ripple, pray-float-text, mic-pulse
- **Audio:** waveform-bar (3 variations)
- **UI:** pulse, slide, dropdown

All animations respect `prefers-reduced-motion` via `motion-safe:` prefix and `useReducedMotion()` hook.

---

## APPENDIX C: ACCESSIBILITY SCORECARD

| Category | Status | Notes |
|----------|--------|-------|
| Semantic HTML | Good | Proper elements, roles, landmarks |
| Focus indicators | Good | Consistent `focus-visible:ring-2` |
| Keyboard navigation | Good | Arrow keys, Escape, Tab, focus traps |
| ARIA attributes | Good | tablist/tab, dialog, alert, live regions |
| Screen reader | Good | sr-only text, aria-hidden on decoratives |
| Color contrast | Good | Dark theme with proper text opacity hierarchy |
| Touch targets | Good | Most ≥44px; some p-2 icon buttons borderline |
| Form accessibility | **Weak** | Missing aria-invalid, aria-describedby, aria-label on textareas |
| Empty state a11y | **Weak** | No guidance for screen readers when content is empty |
| Loading announcements | **Weak** | No aria-busy on loading elements |
| Motion sensitivity | Good | Respects prefers-reduced-motion throughout |

---

*End of audit. Total findings: 61 TypeScript errors, 69 lint issues, 14 test failures, 2 broken nav links, 26 cross-feature integration gaps, 9 missing empty states, 6 form accessibility patterns missing, and 17 badges under-delivered vs spec.*
