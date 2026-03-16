# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application (with native mobile apps on the roadmap) that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, and personal growth tracking.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, community support, and measurable spiritual growth.

---

## Implementation Details

**All technical standards, security policies, coding conventions, design system details, UX flows, and component architecture are in `.claude/rules/`. Read the relevant rule file before implementing any feature.**

- 🚨 **[AI Safety & Ethics](.claude/rules/01-ai-safety.md)** - Crisis detection, content boundaries, moderation
- 🔒 **[Security](.claude/rules/02-security.md)** - Auth, rate limiting, encryption, input validation, auth gating strategy, demo mode data policy
- ⚙️ **[Backend Standards](.claude/rules/03-backend-standards.md)** - Spring Boot conventions, API contract
- 🎨 **[Frontend Standards](.claude/rules/04-frontend-standards.md)** - React patterns, accessibility, responsive design
- 🗄️ **[Database](.claude/rules/05-database.md)** - Schema, indexes, data retention
- ✅ **[Testing](.claude/rules/06-testing.md)** - Testing strategy, coverage requirements, definition of done
- 📊 **[Logging & Monitoring](.claude/rules/07-logging-monitoring.md)** - Structured logging, PII handling
- 🚀 **[Deployment](.claude/rules/08-deployment.md)** - Environment variables, deployment platforms, dev commands
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - All detailed user experience flows (Daily Hub, Prayer, Journal, Meditate, Prayer Wall, etc.)

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Complete Feature List

Full launch targets a complete feature set; features may ship incrementally (alpha/beta) for early feedback.

**Prerequisites Cheatsheet** (build features in any order, just satisfy dependencies first):

- **AI features** require: safety checks + rate limiting + logging + backend crisis detection
- **Community features** (prayer wall) require: auth + moderation + admin audit log + email notifications
- **Analytics** require: mood tracking persisted to database (localStorage for frontend-first build)
- **Audio features** require: TTS API integration (OpenAI TTS or browser Speech Synthesis for MVP)
- **Email notifications** require: SMTP configured + failure handling
- **Data encryption** require: key management + env/secret manager
- **Dashboard & Growth features** require: mood check-in system + localStorage (frontend-first), API persistence in Phase 3+
- **Friends & Leaderboard** require: user auth + friend data model (mock data for frontend-first build)

**Non-Goals for MVP**: No multi-language, no payments, no OAuth (email/password only), no real-time chat, no Spotify OAuth, no complex user profiles, no multi-admin, no human-narrated audio (TTS only), no prayer groups, no church portal, no Apple Health/Google Fit, no standalone Listen page.

**Future Platform Goals** (post-MVP):

- **Native iOS & Android apps** — on the roadmap. Web app is the primary platform; native apps will add phone contacts friend discovery, push notifications, and native audio background playback. Architecture decisions should be made with native apps in mind (API-first data layer, platform-agnostic friend system).

**Key Decisions:**

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si). "Follow our playlist on Spotify" CTA links to this URL.
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Framing is encouragement and growth, not competition or guilt. Mood data is always private; only engagement data (streaks, points, level) is visible to friends.

### Foundation

1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, Journey to Healing timeline, starting point quiz, values section, impact counter, CTA, footer)
4. **Dashboard** - Logged-in user home at `/` (replaces landing page when authenticated). Dark theme with frosted glass cards and vibrant accent colors for charts/data.
5. **PostgreSQL + Docker** - Database setup with Docker Compose
6. **Design System** - Colors, typography, responsive components

### Core Features

7. **Daily Mood Check-In** - Full-screen takeover on first daily visit. "How are you feeling today, [Name]?" with 5 mood buttons using soft labels: Struggling, Heavy, Okay, Good, Thriving. Optional text input ("Want to share what's on your heart?"). Skippable via "Not right now" link. Once per day (resets at midnight). Transitions to dashboard with brief scripture encouragement matching selected mood. Dark background, warm typography, gentle animations.
8. **Scripture Display** - AI-matched scripture with fade-in animation
9. **AI Scripture Reflection** - AI-generated reflection notes below each verse
10. **Scripture Database** - PostgreSQL with 100 seeded scriptures (20 per mood; WEB translation — public domain)
11. **AI Pre-Tagging** - OpenAI API to tag scriptures with mood/theme mappings
12. **Mood Tracking** - Save mood selections with timestamp, selected mood level, optional text, and scripture shown. localStorage for frontend-first build, API persistence in Phase 3+.

### Journaling & Music

13. **Journal Page** - Text editor with save functionality
14. **AI Journaling Prompts** - Auto-generated prompts based on mood
15. **Saved Journal Entries** - View past entries at `/journal/my-entries`
16. **Spotify Integration** - Embed player + "Open in Spotify" deep link. Uses Worship Room playlist: https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si. No Spotify API required — iframe embeds with hardcoded track IDs.
17. **Music Page** - Dedicated `/music` page with 3 tabs: Worship Playlists (default), Ambient Sounds, Sleep & Rest. All tabs use light `#F5F5F5` background with dark text on light card patterns.

### AI-Powered Features

18. **AI-Generated Prayers** - Available on `/daily?tab=pray` and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs
21. **AI Scripture Follow-Up Chat** - Conversational follow-up after scripture display ("Dig Deeper" — context-aware cross-references, historical context, practical applications)

### Audio Features — Music Page (`/music`)

The Music page is a fully built 3-tab experience with global audio infrastructure. All 3 tabs use the light `#F5F5F5` (`bg-neutral-bg`) background with dark-on-light card styling. The AudioDrawer, AudioPill, and overlay components remain dark-themed.

22. **Audio Infrastructure** — Global `AudioProvider` wrapping the app with split contexts (`AudioStateContext`, `AudioDispatchContext`, `AudioEngineContext`, `SleepTimerControlsContext`). `AudioEngineService` using Web Audio API with `<audio>` elements for foreground content and `AudioBufferSourceNode` for ambient mixing with crossfade looping. Floating `AudioPill` with waveform bars and progress arc. Slide-up `AudioDrawer` (bottom sheet mobile, side panel desktop) with `DrawerNowPlaying` and `DrawerTabs` (Mixer, Timer, Saved).
23. **Ambient Sound Mixer** — 24 sounds across 4 categories (Nature, Environments, Spiritual, Instruments). Icon grid (3-col mobile, 4-col tablet, 6-col desktop) on light background with dark text/icons. Tap-to-toggle with 60% default volume, crossfade looping, 6-sound hard limit with toast. `SoundGrid` with roving tabindex arrow key navigation. "Build Your Own Mix" section wrapped in white card container.
24. **Ambient Scene Presets** — 8 curated scene presets (Garden of Gethsemane, Still Waters, Midnight Rain, Ember & Stone, Morning Mist, The Upper Room, Starfield, Mountain Refuge). Square scene card grid with nature-themed CSS background patterns unique to each scene (CSS-only, no images). Scene crossfade transitions with 5-second undo toast (light-themed). Scene artwork in drawer with CSS animations (drift/pulse/glow) respecting `prefers-reduced-motion`. Search and tag filtering built but hidden from UI (components kept in codebase for re-enable).
25. **Sleep & Rest Content** — 24 scripture readings (WEB translation) across 4 collections (Psalms of Peace, Comfort & Rest, Trust in God, God's Promises) with male/female voice alternation. 12 bedtime stories (4 short, 5 medium, 3 long). "Tonight's Scripture" daily rotation. All cards use white background with dark text, purple accent badges. Foreground audio via `<audio>` element with progress bar, scrub, and scripture text toggle with verse-level highlighting. Content switching confirmation dialog. Currently using placeholder MP3s — real TTS audio sourced via Spec 10 content guide.
26. **Sleep Timer** — Preset durations (15/30/45/60/90 min) + custom (5-480 min). Configurable fade (5/10/15/30 min, default 10). Smart fade: foreground fades over first 60% of fade period, ambient starts at 40%. Self-correcting wall-clock timer using `Date.now()`. SVG progress ring. Pause/resume during fade with gain freeze/restore. Timer tab with notification dot. `SleepTimerControlsContext` running in AudioProvider for persistence across drawer close.
27. **Worship Playlists** — 7 Spotify playlist embeds via `<iframe>` with lazy loading and error fallback. "Featured Playlists" section with 1 hero playlist (Top Christian Hits 2026) at 500px height. "Explore Playlists" section with 6 playlists in 2-column grid. Headings use split styling: accent word in `font-script` (Caveat) purple + "Playlists" in regular dark text. No Lofi playlist. No Spotify auto-pause feature (hook kept in codebase). No follower count.
28. **User Features (localStorage)** — `StorageService` abstraction with `LocalStorageService` implementation (keys prefixed `wr_`). Favorites (heart icon on scene/sleep cards, optimistic UI with revert on error). Saved mixes (inline drawer input, 50-char max, edit/delete/duplicate/share via three-dot menu). Shareable mix URLs (Base64url-encoded sound IDs + volumes in query params, "Play This Mix" hero). Session persistence (60s auto-save + `beforeunload`, resume prompt built but not rendered). Listening analytics (capped 100 entries). Time-of-day recommendations and personalization section built but not rendered (components kept in codebase).
29. **Bedtime Routines** — `/music/routines` dedicated page (NOT in nav dropdown). 3 pre-built templates (Evening Peace, Scripture & Sleep, Deep Rest). Visual step builder with up/down reorder buttons, content picker modal, transition gap inputs, sleep timer config. `useRoutinePlayer` hook orchestrating sequential step execution with scene loading, foreground playback, transition gaps with ambient breathe-up, error retry (3x with backoff then skip), and sleep timer start at routine end. Enhanced `RoutineStepper` in drawer with content type icons and ARIA progressbar. Pill routine shortcut mode. Routine interrupt dialog when manually loading content during active routine.
30. **Accessibility Audit** — `useAnnounce` hook with dual live regions (polite 300ms debounce, assertive immediate). Full ARIA coverage: `aria-valuetext` on sliders, `role="list"`/`role="listitem"` on mixer, Arrow key menu navigation, SoundGrid roving tabindex grid navigation, AudioPill keyboard activation. 44px minimum touch targets on all interactive elements. Color contrast verified for light backgrounds. Reduced motion: all music animations in `@media (prefers-reduced-motion: reduce)` CSS block + `motion-safe:` Tailwind prefix. Focus management: drawer returns focus to pill, dialogs return focus to trigger.
31. **Read Aloud Button** - Available on all text content (scriptures, prayers, reflections, meditations) for accessibility

### Dashboard & Growth Features — Personal Dashboard (`/`)

The Dashboard is the logged-in user's home page (replaces the landing page at `/` when authenticated). All-dark theme matching the Growth Teasers section aesthetic — dark purple gradient background, frosted glass cards, vibrant accent colors for data visualization. Fixed layout with collapsible/expandable cards.

**Dashboard Layout:**

- **Hero section (dark)**: Personalized greeting ("Good morning, [Name]"), current streak with flame animation, faith level with progress indicator, faith points count
- **Widget grid below hero (frosted glass cards, priority order)**:
  1. Streak & Faith Points summary card
  2. 7-day mood chart (line chart with mood-colored dots, "See More" → `/insights`)
  3. Today's activity checklist with progress ring (6 trackable activities)
  4. Friends activity feed / leaderboard preview ("See all" → `/friends`)
  5. Quick-action buttons (Pray, Journal, Meditate, Music) — navigation shortcuts
- **Desktop**: 2-column layout below hero (~60% left for data, ~40% right for social)
- **Mobile**: Single-column stack in priority order

**Mood Color Palette** (for charts, heatmap, check-in accents):

- Struggling → Deep red/warm amber
- Heavy → Muted orange/copper
- Okay → Neutral gray-purple
- Good → Soft teal/green
- Thriving → Vibrant green/gold

32. **Mood Insights Widget** — 7-day snapshot on dashboard showing mood trend line with colored dots. Links to full `/insights` page via "See More."

33. **Mood Insights Page (`/insights`)** — Single scrolling page (no tabs). Default 30-day view with toggles for 90/180/365/all-time. Sections in order: GitHub-style calendar heatmap (colored squares per day) → line chart (mood trend over time) → AI insight cards → activity correlations → scripture connections. Dark theme matching dashboard.

34. **AI Mood Insights** — Four types of AI-generated insight (mock data for frontend-first build, real AI in Phase 3+):

- **Trend summaries**: "You felt better this week" — mood trajectory analysis
- **Activity correlations**: "Your mood improves on days you journal" — cross-referencing mood with activity data
- **Scripture connections**: "You found peace in Psalms" — linking mood improvements to scripture engagement
- **Monthly mood report**: Email summary + in-app interactive report at `/insights/monthly`. Email drives re-engagement with "View full report" CTA. Report includes: days active, level-ups, mood trends, top activities, scripture highlights.

35. **Streak System** — Consecutive days performing any trackable activity. No grace period; streak resets on missed days with gentle messaging ("Every day is a new beginning. Start fresh today."). Tracks "current streak" and "longest streak" (record persists even when current resets). Visual flame animation on dashboard.

Six trackable activities (any one keeps the streak alive for that day):

- Logged mood (daily check-in)
- Prayed (used the Pray tab)
- Journaled (saved a journal entry)
- Meditated (completed a meditation)
- Listened to music/ambient sounds
- Visited the Prayer Wall (prayed for someone)

36. **Faith Points System** — Weighted + tiered point system rewarding both depth and breadth of engagement. Visible number paired with visual growth metaphor.

**Base activity points (weighted by depth):**

- Mood check-in: 5 pts
- Prayed: 10 pts
- Listened to music/ambient: 10 pts
- Visited Prayer Wall (prayed for someone): 15 pts
- Meditated (completed): 20 pts
- Journaled (saved entry): 25 pts

**Daily multiplier tiers (breadth bonus):**

- 1 activity: 1x (base points)
- 2–3 activities: 1.25x
- 4–5 activities: 1.5x
- All 6 activities: 2x ("Full Worship Day" — bonus celebration)

**Maximum daily earning**: ~170 pts (all 6 activities at 2x). Typical engaged user: ~50-100 pts/day.

37. **Faith Levels** — Growth-themed progression tied to cumulative faith points:

| Level | Name        | Points      | Meaning                              | Approx. Timeline |
| ----- | ----------- | ----------- | ------------------------------------ | ---------------- |
| 1     | Seedling    | 0–99        | "You've planted something beautiful" | Days 1–2         |
| 2     | Sprout      | 100–499     | "Your roots are growing deeper"      | ~3–7 days        |
| 3     | Blooming    | 500–1,499   | "Your faith is coming alive"         | ~1–2 weeks       |
| 4     | Flourishing | 1,500–3,999 | "You're bearing fruit"               | ~3–4 weeks       |
| 5     | Oak         | 4,000–9,999 | "Strong and deeply rooted"           | ~2–3 months      |
| 6     | Lighthouse  | 10,000+     | "Your light shines for others"       | ~6+ months       |

38. **Badge & Milestone System** — Six badge categories with scaled celebration animations (toast for minor milestones, full-screen moment for major ones like level-ups and 100-day streaks):

- **Streak milestones**: 7, 14, 30, 60, 90, 180, 365 days
- **Level-up badges**: One per level achieved (Seedling through Lighthouse)
- **Activity milestones**: 50th journal entry, 100th prayer, etc.
- **"Full Worship Day" badge**: All 6 activities completed in one day
- **First-time badges**: First prayer, first journal entry, first meditation, etc.
- **Community badges**: 10 friends, 50 encouragements sent, etc.
- **Welcome badge**: "Welcome to Worship Room" — earned on signup so badge collection never starts at zero

39. **Friends System (`/friends`)** — Dedicated friends page accessible from dashboard leaderboard widget ("See all") and avatar dropdown. Mutual friend model (request + accept, like Facebook). Privacy-first: mood data is never visible to friends; only engagement data (streak, points, level, badges) is shared.

**Friend discovery methods (web-first build):**

- Search by username/display name
- Invite-by-link (shareable personal invite URL for texting, WhatsApp, church groups)
- Invite-by-email (type a friend's email; they get a notification on signup)
- "People you may know" from Prayer Wall interactions (prayed for, commented on)

**Future native app additions:** Phone contacts sync, push notification invites, "Share to Instagram Stories" for milestones.

**Friends page sections:** Search bar → pending friend requests → friend list (name, level, streak, last active) → invite mechanisms (link, email)

40. **Leaderboard** — Two views: friends-only (default) and global (optional toggle).

- **Friends leaderboard**: Shows weekly faith points + current streak + level/badge for each friend. Weekly + all-time toggle.
- **Global leaderboard**: Weekly faith points only (resets every Monday). Display names only, no profile photos. Tap name to see level and public badge collection. Weekly reset ensures new users can compete immediately — prevents "I can never catch up" discouragement.

41. **Social Interactions** — Four friend interaction types:

- **Quick-tap encouragements**: Pre-set messages ("🙏 Praying for you", "🌟 Keep going", "💪 Proud of you"). Low-effort to send, show as notifications to recipient.
- **Milestone feed**: Lightweight activity stream on friends section of dashboard ("🔥 Sarah hit a 30-day streak!", "🌱 James leveled up to Sprout!", "📖 Maria completed her 100th journal entry!")
- **Nudges**: Gentle, warm-toned nudge when a friend has been away ("❤️ Sarah is thinking of you"). User controls who can send nudges in privacy settings.
- **Weekly community recap**: Monday notification/card — "Last week, your friend group prayed 23 times, journaled 15 entries, and completed 8 meditations together. You contributed 34% of the group's growth."

42. **Notification System** — Four channels, all user-controllable in settings:

- **In-app notification bell**: Navbar icon with unread badge count. Dropdown panel showing recent notifications grouped by type (encouragements, friend requests, milestones, recaps). "Mark all as read" link. Mock notification data for frontend-first build.
- **Toast/snackbar**: Real-time in-app events (badge earned, encouragement received, level-up).
- **Push notifications**: Browser (web) and native (future mobile apps). Engagement-driving: friend requests, encouragements, milestone celebrations.
- **Email digests**: Weekly summary emails. Monthly mood report emails with "View full report" CTA.

43. **Profile & Avatars** — Public profile page showing display name + level + badge collection + streak. Two avatar options: preset faith-themed avatars (dove, cross, flame, tree, etc.) OR photo upload. Initials as fallback. Some preset avatars unlockable via badges (light gamification). Photo uploads require moderation pipeline in Phase 3+.

44. **Settings Page (`/settings`)** — Full dedicated page linked from avatar dropdown. Four sections:

- **Profile**: Display name, avatar selection/upload, favorite verse (optional)
- **Notifications**: Per-channel toggles (in-app bell, push, email), frequency controls for email digests
- **Privacy**: Toggle leaderboard visibility (hide from global), toggle activity status (appear offline), control who can send nudges, control who can see streak/level, block/remove friends
- **Account**: Email, password change, delete account

45. **Empty States** — Every empty widget shows a preview of what it'll look like filled + one clear CTA to start:

- **Empty mood chart**: Faded/ghosted example chart + "Your mood journey starts today" + check-in prompt
- **Empty streak**: "Day 1 — every journey begins with a single step" + subtle animation
- **Empty friends/leaderboard**: "Faith grows stronger together" + invite button + "You vs. Yesterday" self-comparison
- **Empty badges**: Grid of locked badge silhouettes with one unlocked ("Welcome to Worship Room" — earned on signup)
- **Empty activity checklist**: All 6 items unchecked with gentle encouragement to start

### Community Features

46. **Prayer Wall** - Community prayer feed with inline composer, inline comments, share functionality, public user profiles (`/prayer-wall/user/:id`), private dashboard (`/prayer-wall/dashboard`), auth modal for login/register gates, report dialog, answered prayer tracking with testimony sharing, and standalone detail page (`/prayer-wall/:id`) for shared links. Frontend implemented with mock data (no backend wiring yet). No candle/light-a-candle feature.
47. **AI Auto-Moderation** - Flag inappropriate content (profanity, abuse, spam)
48. **Admin Moderation Interface** - Simple CRUD at `/admin/prayer-wall` for reviewing, editing, deleting posts
49. **Email Notifications** - Send flagged posts to admin email from `ADMIN_EMAIL` env var
50. **User Reporting** - Report button on each prayer post
51. **Answered Prayer Tracking** - "Mark as Answered" button, answered prayers log / gratitude journal, optional testimony sharing to prayer wall

### Locator Features

52. **Church Locator** - Google Maps Places API real-time search at `/local-support/churches`. Search UI is auth-gated; logged-out users see hero with "Sign In to Search" CTA. Frontend implemented with mock data and Leaflet map; Google Places API wiring is Phase 3+.
53. **Christian Counselor Locator** - Google Maps Places API real-time search at `/local-support/counselors`. Same auth-gated pattern. Includes disclaimer banner.
54. **Celebrate Recovery Locator** - Google Maps Places API real-time search at `/local-support/celebrate-recovery`. Same auth-gated pattern. Includes CR explainer section in hero.

### Content Features

55. **Guided Meditations** - 6 text-based meditations (Breathing, Scripture Soaking, Gratitude, ACTS, Psalm Reading, Examen) with audio playback via TTS
56. **Verse of the Day** - Daily scripture on `/daily` page, homepage, and dashboard
57. **Song of the Day** - Daily worship song recommendation on `/daily` page with Spotify embed
58. **Guided Reading Plans** - 7-day and 21-day themed plans ("Overcoming Anxiety," "Healing from Grief," etc.) with daily scripture + reflection + journal prompt + prayer

### Additional Engagement Features

59. **Shareable Scripture Cards** - Auto-generated branded images with verse text, share to social/messaging
60. **Saved / Favorited Content** - Bookmark button on scriptures, prayers, reflections; "My Favorites" page
61. **Dark Mode** - System-preference-aware toggle, auto-switch at bedtime

### Landing Page Sections

62. **Growth Teasers Section** - "See How You're Growing" — 3 blurred preview cards (Mood Insights, Streaks & Faith Points, Friends & Leaderboard) showing logged-out visitors what they unlock with an account. Dark purple gradient background with frosted glass card previews. CTA: "Create a Free Account". These teasers preview the real dashboard features built in Phase 2.75.
63. **Starting Point Quiz** - 5-question points-based quiz ("Not Sure Where to Start?") that recommends a personalized entry point. Client-side only, no data persistence for logged-out users.
64. **Footer** - Nav columns (Daily, Music, Support), crisis resources, app download badges (Coming Soon), "Listen on Spotify" badge, copyright.

### Polish & Launch Prep

65. **Personalized Onboarding Flow** - 3-5 question onboarding at signup to curate starting experience
66. **Performance Optimization** - Lazy loading, code splitting, caching
67. **Security Audit** - Vulnerability scanning, penetration testing
68. **SEO Optimization** - Meta tags, sitemap, structured data
69. **Production Deployment** - Production setup with CI/CD
70. **User Testing** - Beta testing with real users

### Post-Launch Growth Features

71. **Community Prayer Groups** — Private small groups with group prayer requests
72. **Church Partnership Portal** — Church admin dashboard, congregation-wide prayer wall
73. **Kids / Family Mode** — Age-appropriate scripture, bedtime Bible stories
74. **Apple Health / Google Fit Sync** — Sync meditation minutes (native app only)
75. **AI Pastoral Companion** — Persistent conversational AI with session memory
76. **Native iOS & Android Apps** — Phone contacts friend discovery, push notifications, native audio background playback, App Store/Play Store distribution
77. **Social Platform OAuth** — Facebook/Google friend import for enhanced friend discovery (native apps)

---

## Navigation Structure

### Desktop Navbar (Logged Out)

```
[Worship Room logo]   Daily Hub   Prayer Wall   Music   [Local Support ▾]   [Log In]  [Get Started]
```

**Top-level links (3):** Daily Hub, Prayer Wall, and Music — all always visible, no dropdowns. Music links directly to `/music`.

**"Local Support" dropdown** (clickable label goes to `/local-support/churches`; dropdown expands on hover/click):

```
├── Churches
├── Counselors
├── Celebrate Recovery
```

### Desktop Navbar (Logged In)

```
[Worship Room logo]   Daily Hub   Prayer Wall   Music   [Local Support ▾]   [🔔]  [Avatar ▾]
```

**Notification bell** (🔔): Badge count for unread notifications. Click opens dropdown panel with recent notifications grouped by type.

**Avatar dropdown**:

```
├── Dashboard
├── Friends
├── My Journal Entries
├── My Prayer Requests
├── My Favorites
├── Mood Insights
├── Settings
├── ─────────────────
└── Log Out
```

### Mobile Drawer (Logged Out)

```
Daily Hub
──────────────
Prayer Wall
──────────────
Music
──────────────
LOCAL SUPPORT
  Churches
  Counselors
  Celebrate Recovery
──────────────
[Log In]
[Get Started]
```

### Mobile Drawer (Logged In)

```
Dashboard
──────────────
Daily Hub
──────────────
Prayer Wall
──────────────
Music
──────────────
LOCAL SUPPORT
  Churches
  Counselors
  Celebrate Recovery
──────────────
Friends
Mood Insights
My Journal Entries
My Prayer Requests
My Favorites
Settings
──────────────
[🔔 Notifications]
[Log Out]
```

---

## Routes

### Public Routes (No Authentication Required)

| Route                               | Component                         | Status                             | Description                                                                                                                                               |
| ----------------------------------- | --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                 | `Home` / `Dashboard`              | Built (Home) / Planned (Dashboard) | Landing page for logged-out users; Dashboard for logged-in users                                                                                          |
| `/daily`                            | `DailyHub`                        | Built                              | Tabbed daily experience: Pray \| Journal \| Meditate (default: `?tab=pray`)                                                                               |
| `/pray`                             | Redirect → `/daily?tab=pray`      | Built                              | Legacy route redirect                                                                                                                                     |
| `/journal`                          | Redirect → `/daily?tab=journal`   | Built                              | Legacy route redirect                                                                                                                                     |
| `/meditate`                         | Redirect → `/daily?tab=meditate`  | Built                              | Legacy route redirect                                                                                                                                     |
| `/scripture`                        | Redirect → `/daily?tab=pray`      | Built                              | Legacy route redirect                                                                                                                                     |
| `/meditate/breathing`               | `BreathingExercise`               | Built                              | 4-7-8 breathing with scripture phases                                                                                                                     |
| `/meditate/soaking`                 | `ScriptureSoaking`                | Built                              | Single verse contemplation timer                                                                                                                          |
| `/meditate/gratitude`               | `GratitudeReflection`             | Built                              | Gratitude journaling with affirmations                                                                                                                    |
| `/meditate/acts`                    | `ActsPrayerWalk`                  | Built                              | ACTS prayer framework walkthrough                                                                                                                         |
| `/meditate/psalms`                  | `PsalmReading`                    | Built                              | Psalm reading with historical context                                                                                                                     |
| `/meditate/examen`                  | `ExamenReflection`                | Built                              | Ignatian Examen daily reflection                                                                                                                          |
| `/verse/:id`                        | `SharedVerse`                     | Built                              | Shareable verse card (social sharing)                                                                                                                     |
| `/prayer/:id`                       | `SharedPrayer`                    | Built                              | Shareable prayer card (social sharing)                                                                                                                    |
| `/prayer-wall`                      | `PrayerWall`                      | Built                              | Community prayer feed (mock data, 274 tests)                                                                                                              |
| `/prayer-wall/:id`                  | `PrayerDetail`                    | Built                              | Standalone prayer detail page                                                                                                                             |
| `/prayer-wall/user/:id`             | `PrayerWallProfile`               | Built                              | Public user profile                                                                                                                                       |
| `/prayer-wall/dashboard`            | `PrayerWallDashboard`             | Built                              | Private prayer wall dashboard                                                                                                                             |
| `/local-support/churches`           | `Churches`                        | Built                              | Church locator (Leaflet map, mock data)                                                                                                                   |
| `/local-support/counselors`         | `Counselors`                      | Built                              | Counselor locator (Leaflet map, mock data)                                                                                                                |
| `/local-support/celebrate-recovery` | `CelebrateRecovery`               | Built                              | CR locator (Leaflet map, mock data)                                                                                                                       |
| `/music`                            | `MusicPage`                       | Built                              | 3-tab music hub: Worship Playlists (default), Ambient Sounds, Sleep & Rest. Tab state via `?tab=playlists\|ambient\|sleep`. Light background on all tabs. |
| `/music/playlists`                  | Redirect → `/music?tab=playlists` | Built                              | Legacy route redirect                                                                                                                                     |
| `/music/ambient`                    | Redirect → `/music?tab=ambient`   | Built                              | Legacy route redirect                                                                                                                                     |
| `/music/sleep`                      | Redirect → `/music?tab=sleep`     | Built                              | Legacy route redirect                                                                                                                                     |
| `/music/routines`                   | `RoutinesPage`                    | Built                              | Bedtime routine builder and templates (NOT in nav dropdown, accessed via direct links)                                                                    |
| `/login`                            | `ComingSoon`                      | Stub                               | Login page placeholder                                                                                                                                    |
| `/register`                         | `ComingSoon`                      | Stub                               | Registration page placeholder                                                                                                                             |
| `/health`                           | `Health`                          | Built                              | Backend health check (dev utility)                                                                                                                        |
| `*`                                 | `NotFound`                        | Built                              | 404 page                                                                                                                                                  |

### Protected Routes (Requires Authentication)

| Route                 | Component             | Status  | Description                                                                                |
| --------------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `/insights`           | `MoodInsights`        | Planned | Full mood analytics: heatmap, line chart, AI insights, correlations, scripture connections |
| `/insights/monthly`   | `MonthlyReport`       | Planned | Monthly mood report (in-app version of email report)                                       |
| `/friends`            | `Friends`             | Planned | Friend management: search, requests, friend list, full leaderboard, invite mechanisms      |
| `/settings`           | `Settings`            | Planned | Profile, notifications, privacy, account sections                                          |
| `/journal/my-entries` | `SavedJournalEntries` | Planned | Saved journal entries                                                                      |
| `/favorites`          | `Favorites`           | Planned | Saved/bookmarked scriptures, prayers, reflections                                          |

### Admin Routes (Phase 3+)

- `/admin/prayer-wall` - Moderation interface

---

## Landing Page Structure

```
1. Navbar (transparent glassmorphic pill — Daily Hub link, Prayer Wall link, Music link, Local Support dropdown)
2. Hero Section (dark purple gradient, "How're You Feeling Today?", typewriter input → /daily?tab=pray, quiz teaser link scrolls to #quiz)
3. Journey Section (6-step vertical timeline: Pray → Journal → Meditate → Music → Prayer Wall → Local Support)
4. Growth Teasers Section ("See How You're Growing" — 3 blurred preview cards. Dark purple gradient. CTA: "Create a Free Account")
5. Starting Point Quiz (id="quiz" — 5 questions, points-based scoring, result card routes to recommended feature)
6. Footer (nav columns, crisis resources, app download badges, "Listen on Spotify" badge, copyright)
```

---

## Dashboard UX Flow (Logged-In Users)

### Daily Mood Check-In → Dashboard Transition

1. **Full-screen check-in appears** (once per day, resets at midnight). Dark background, soft gradient. "How are you feeling today, [Name]?" in warm serif typography. Five mood buttons horizontally: Struggling, Heavy, Okay, Good, Thriving — each with subtle icon and mood-colored glow. Gentle idle pulse animation. "Not right now" skip link at bottom (small, no guilt).

2. **User taps a mood.** Selected button scales up with glow in its mood color. Others fade back. Optional text area slides in below: "Want to share what's on your heart?" + "Skip" link. Text saves with mood entry if provided.

3. **Brief encouragement transition.** A short scripture matching the selected mood displays for 2–3 seconds. Examples: "The Lord is close to the brokenhearted" (Struggling), "This is the day the Lord has made" (Thriving). Graceful fade.

4. **Dashboard arrives alive.** Streak counter animates from yesterday's number to today's. New mood dot fades onto the 7-day chart. If a badge was earned or level-up triggered, the scaled celebration fires. Activity checklist shows mood check-in as completed.

### Returning Same Day

If the user has already checked in today, they skip the check-in and go straight to the dashboard. The check-in only appears once per day.

---

## Music Feature — Technical Architecture

### Audio Provider & Context System

The global `AudioProvider` wraps the entire app (between `AuthModalProvider` and `Routes` in `App.tsx`). It exposes 4 React contexts:

- `AudioStateContext` — read-only state via `useAudioState()`
- `AudioDispatchContext` — actions via `useAudioDispatch()` (wraps reducer with engine side effects)
- `AudioEngineContext` — Web Audio API service via `useAudioEngine()`
- `SleepTimerControlsContext` — timer controls via `useSleepTimerControls()`

**AudioState** includes: `activeSounds`, `masterVolume`, `isPlaying`, `pillVisible`, `drawerOpen`, `currentSceneName`, `foregroundContent`, `sleepTimer`, `activeRoutine`.

**AudioEngineService** manages a single `AudioContext` (suspend/resume, never destroy/recreate). Ambient sounds use `AudioBufferSourceNode` with crossfade looping (double-buffer, 1.5s overlap). Foreground content uses `<audio>` elements via `MediaElementAudioSourceNode` for mobile background survival. Smart fade uses `linearRampToValueAtTime` on the Web Audio API timeline.

### Visual Theme

All 3 Music page tabs use light `#F5F5F5` (`bg-neutral-bg`) background with dark-on-light card styling (`bg-white rounded-xl border border-gray-200 shadow-sm`). Scene cards use nature-themed CSS gradient patterns on darker backgrounds with white text overlay. The AudioDrawer, AudioPill, and all overlay/dialog components remain dark-themed (`rgba(15,10,30,0.85)` with white text).

Components built but not currently rendered (kept in codebase for potential re-enable): `TimeOfDaySection`, `PersonalizationSection`, `RecentlyAddedSection`, `ResumePrompt`, `MusicHint`, `LofiCrossReference`, `AmbientSearchBar`, `AmbientFilterBar`. Hooks kept but not used: `useSpotifyAutoPause`, `useMusicHints`, `useTimeOfDayRecommendations`.

### Key Audio Components

| Component          | Location            | Description                                                                                                               |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `AudioPill`        | `components/audio/` | Floating pill (z-9999). 3 states: hidden, routine shortcut, now-playing. Keyboard-accessible with `role="button"`.        |
| `AudioDrawer`      | `components/audio/` | Bottom sheet (70vh mobile) / side panel (400px desktop). Focus-trapped. Contains DrawerNowPlaying + DrawerTabs.           |
| `DrawerNowPlaying` | `components/audio/` | Scene artwork with animations, play/pause, master volume, foreground progress bar, scripture text toggle, balance slider. |
| `DrawerTabs`       | `components/audio/` | Mixer \| Timer \| Saved. ARIA tablist with roving tabindex. Timer tab shows notification dot when active.                 |
| `AmbientBrowser`   | `components/audio/` | Scene grid with CSS patterns, "Build Your Own Mix" card with sound grid. Search/filter hidden but in codebase.            |
| `SleepBrowse`      | `components/audio/` | Tonight's Scripture, 4 scripture collection rows, bedtime stories grid, routine CTA. Light-themed cards.                  |
| `RoutineStepper`   | `components/audio/` | Horizontal step progress with content type icons, ARIA progressbar.                                                       |

### Key Audio Hooks

| Hook                  | Location | Description                                                                                                            |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `useSoundToggle`      | `hooks/` | Auth-gated sound play/toggle with loading/retry/6-sound limit.                                                         |
| `useScenePlayer`      | `hooks/` | Scene loading with crossfade, undo, routine interrupt check.                                                           |
| `useForegroundPlayer` | `hooks/` | Foreground playback with content-switch dialog, routine interrupt check. Dispatches `FOREGROUND_ENDED` on natural end. |
| `useSleepTimer`       | `hooks/` | Wall-clock timer, phase tracking, smart fade scheduling via Web Audio API timeline. Runs in AudioProvider.             |
| `useRoutinePlayer`    | `hooks/` | Routine step sequencing, transition gaps, error retry, sleep timer start.                                              |
| `useAmbientSearch`    | `hooks/` | Client-side search + tag filtering (OR within dimension, AND across). Built but not rendered.                          |
| `useAnnounce`         | `hooks/` | Dual aria-live regions (polite debounced, assertive immediate) for screen reader announcements.                        |

### Data Files

| File                    | Location      | Contents                                                               |
| ----------------------- | ------------- | ---------------------------------------------------------------------- |
| `sound-catalog.ts`      | `data/`       | 24 sounds, `SOUND_BY_ID` Map, `SOUND_CATEGORIES` grouped array         |
| `scenes.ts`             | `data/`       | 8 scene presets, `SCENE_BY_ID` Map, `FEATURED_SCENE_IDS`               |
| `scene-backgrounds.ts`  | `data/`       | CSS background patterns for each scene, `getSceneBackground()` utility |
| `scripture-readings.ts` | `data/music/` | 24 WEB scripture readings across 4 collections                         |
| `bedtime-stories.ts`    | `data/music/` | 12 bedtime stories (4 short, 5 medium, 3 long)                         |
| `playlists.ts`          | `data/music/` | 8 Spotify playlists (7 rendered — Lofi excluded at component level)    |
| `routines.ts`           | `data/music/` | 3 template routines (Evening Peace, Scripture & Sleep, Deep Rest)      |

### Storage Service

`StorageService` interface with `LocalStorageService` implementation in `services/storage-service.ts`. All keys prefixed `wr_`:

- `wr_favorites` — favorited scenes, sleep sessions, custom mixes
- `wr_saved_mixes` — user-created ambient sound mixes
- `wr_listening_history` — listening sessions (capped 100)
- `wr_session_state` — auto-saved session for resume (24h expiry)
- `wr_routines` — user-created/cloned routine definitions
- `wr_mood_entries` — daily mood check-in data (Phase 2.75, localStorage)
- `wr_streak` — current streak count and longest streak record
- `wr_faith_points` — cumulative faith points and current level
- `wr_activity_log` — daily activity tracking for streak/points calculation
- `wr_badges` — earned badges and milestone progress
- `wr_friends` — friend list and pending requests (mock data)
- `wr_notifications` — notification history (mock data)

All writes are auth-gated. Abstraction designed to swap to API calls in Phase 3+ without changing consumers.

### Audio Constants (`constants/audio.ts`)

`MAX_SIMULTANEOUS_SOUNDS: 6`, `DEFAULT_SOUND_VOLUME: 0.6`, `MASTER_VOLUME: 0.8`, `SCENE_CROSSFADE_MS: 3000`, `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`, `LOAD_RETRY_MAX: 3`, `LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000]`, `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]`.

### Audio Files

Placeholder silent MP3s in `public/audio/` (gitignored). Subdirectories: `ambient/` (24 sounds), `scripture/` (24 readings), `stories/` (12 stories), `artwork/` (8 scene SVG placeholders). Real TTS audio to be generated via Spec 10 content guide using Google Cloud TTS WaveNet (Male: en-US-Wavenet-D, Female: en-US-Wavenet-F). CDN target: Cloudflare R2 (zero egress fees), base URL in `VITE_AUDIO_BASE_URL` env var.

### Known Issues

- **Footer touch targets**: Crisis resource links (988, SAMHSA) are undersized on mobile. Pre-existing, not Music-specific.
- **Spotify embed loading**: Embeds may show "Player couldn't load" fallback in headless/restricted environments. Works in real browsers with Spotify access.

---

## Build Approach

### Spec-Driven Workflow

Use this workflow for all new features:

1. **`/spec <feature description>`** — Generates a spec file in `_specs/`, switches to a new feature branch
2. **`/plan _specs/<feature>.md`** — Reads spec, explores codebase, generates implementation plan in `_plans/YYYY-MM-DD-<feature>.md`
3. **Review** — User reviews and approves the plan before implementation begins
4. **`/execute-plan _plans/<plan>.md`** — Implements the feature step-by-step following the approved plan
5. **`/code-review`** — Runs accessibility + code quality review on uncommitted changes. Pass plan path for plan-aware review.
6. **`/verify-with-playwright`** — Visual verification of frontend changes using Playwright browser automation (rendering, interactions, responsive breakpoints, console errors)

### Development Strategy

1. **Build logged-out experience first** — All features work in "demo mode" without login. Prompt to create account when trying to save data. Implement AI safety from day one.
2. **Then add authentication and personalization** — Spring Security + JWT, data saving, protected routes, mood tracking.
3. **Dashboard & Growth features built frontend-first** — localStorage with mock data, same pattern as Music and Prayer Wall. Backend wiring in Phase 3+.

### Implementation Phases

**Phase 1 — Landing Page & Navigation** ✅ COMPLETE

- Navbar: glassmorphic pill with Daily Hub link, Prayer Wall link, Music link, Local Support dropdown
- JourneySection: 6-step vertical timeline
- Hero section with typewriter input → `/daily?tab=pray`
- GrowthTeasers, StartingPointQuiz, SiteFooter, HeadingDivider

**Phase 2 — Daily Experience (Pray, Journal, Meditate)** ✅ COMPLETE

- Daily Hub tabbed layout (`/daily` with `?tab=pray|journal|meditate`)
- Pray tab: "What's On Your Heart?", starter chips, crisis banner, mock prayer generation, KaraokeText, action buttons, cross-tab CTA
- Journal tab: "What's On Your Mind?", Guided/Free Write, draft auto-save, saved entries, AI reflection
- Meditate tab: "What's On Your Spirit?", 6 auth-gated meditation cards, completion tracking
- 6 meditation sub-pages, SongPickSection (Spotify embed), shared verse/prayer pages
- Legacy route redirects, completion tracking, auth gating via AuthModal
- Prayer Wall frontend (274 tests), Local Support (3 locators with Leaflet)
- 424+ frontend tests passing

**Phase 2.5 — Music Feature** ✅ COMPLETE

- Audio infrastructure: AudioProvider, AudioEngineService, AudioPill, AudioDrawer (Spec 1)
- Ambient sound mixer: 24 sounds, icon grid, crossfade looping, 6-sound limit (Spec 2)
- Scene presets: 8 scenes, crossfade transitions, search, tag filtering (Spec 3)
- Sleep & rest: 24 scripture readings, 12 bedtime stories, foreground audio, content switching (Spec 4)
- Sleep timer: smart fade, self-correcting wall-clock timer, pause/resume during fade (Spec 5)
- Music page shell: 3-tab page, Spotify playlists, nav update (Spec 6)
- User features: favorites, saved mixes, sharing, analytics, session persistence (Spec 7)
- Bedtime routines: builder, playback engine, 3 templates, routine interrupt (Spec 8)
- Accessibility audit: ARIA, focus management, reduced motion, touch targets, contrast, announcements (Spec 9)
- Visual polish: light theme on all tabs, playlist restructure, scene CSS patterns, layout cleanup (Visual Polish)
- Content guide: TTS generation, Cloudflare R2 setup, sound sourcing reference (Spec 10 — manual reference)
- 960+ frontend tests passing across 100+ test files

**Phase 2.75 — Dashboard & Growth Feature** (NEXT — 16 specs, frontend-first with localStorage/mock data)

- Spec 1: **Mood Check-In System** — Full-screen daily check-in, mood data model, 5 soft labels (Struggling/Heavy/Okay/Good/Thriving), optional text input with crisis keyword detection, localStorage persistence, skip flow, shared `utils/date.ts` utilities
- Spec 2: **Dashboard Shell** — Route switching (`/` renders Dashboard when authenticated, Home when not), `AuthProvider` context (frontend-first with simulated login), dark hero section (greeting + streak + level), widget grid with frosted glass cards, collapsible/expandable cards, navbar logged-in state globally (bell icon placeholder + avatar dropdown), responsive 2-column (desktop) / single-column (mobile) layout
- Spec 3: **Mood Insights Dashboard Widget** — 7-day mood line chart using Recharts (new dependency), mood-colored dots, empty state, `useMoodChartData` hook
- Spec 4: **`/insights` Full Page** — Single scrolling page with custom CSS Grid calendar heatmap + Recharts line chart + time range toggles (30d/90d/180d/1y/all) + AI insight card placeholders + activity correlation placeholders + scripture connection placeholders
- Spec 5: **Streak & Faith Points Engine** — `useFaithPoints` hook, activity tracking data model (`wr_daily_activities`), weighted point calculation, daily multiplier tiers, streak logic (no grace period), level thresholds, 30-second listen timer for AudioProvider. No UI — engine only.
- Spec 6: **Dashboard Widgets + Activity Integration** — Streak & Faith Points dashboard card, Today's Activity Checklist card with SVG progress ring, `recordActivity()` calls added to 5 existing components (Pray tab, Journal, Meditation, AudioProvider, Prayer Wall)
- Spec 7: **Badge Definitions & Unlock Logic** — ~35 badges across 6 categories, badge data model with activity counters, `checkForNewBadges()` trigger detection, level-up verses (WEB translation), `newlyEarned` queue. No celebration UI — engine only.
- Spec 8: **Celebrations & Badge Collection UI** — Toast system (extend existing or create `useToast`), full-screen celebration overlays with CSS confetti, scaled celebration tiers, streak reset gentle messaging, badge collection grid (earned vs locked), `newlyEarned` queue processing with 1.5s delay
- Spec 9: **Friends System** — `/friends` page with two tabs (Friends + Leaderboard), mutual friend model (request + accept), friend discovery (search, invite-by-link, invite-by-email, Prayer Wall suggestions), 10 mock friends with varied data, configurable invite URL via `VITE_APP_URL`
- Spec 10: **Leaderboard** — Friends leaderboard (default, weekly + all-time) + global leaderboard (weekly only, display names only), weekly reset logic, compact dashboard widget with top 3 + position, 50 mock global users
- Spec 11: **Social Interactions** — Quick-tap encouragements (4 presets, 3/day/friend limit), milestone feed (mock events), gentle nudges (1/week, 3+ day inactive, "❤️ Sarah is thinking of you"), weekly community recap
- Spec 12: **Notification System** — Bell dropdown panel behavior, notification data model, 7 notification types, mock notification data, toast/snackbar system, push notification stubs
- Spec 13: **Settings & Privacy** — `/settings` page with 4 sections (Profile, Notifications, Privacy, Account), all 6 privacy toggles, per-channel notification controls, delete account clears all `wr_*` keys
- Spec 14: **Profile & Avatars** — Public profile page at `/profile/:userId` (name + level + badges + streak), 16 preset faith-themed avatars + 4 unlockable + photo upload (200x200 resize), initials fallback
- Spec 15: **AI Insights & Monthly Report** — Mock AI insight cards with daily rotation (11 cards across 4 types), monthly report page at `/insights/monthly` with 7 sections, email template component (stub)
- Spec 16: **Empty States & Polish** — All empty state designs for every widget/page, check-in → dashboard transition animations, streak counter roll-up, mood dot chart animation, micro-interactions, `prefers-reduced-motion` compliance, visual polish checklist (WCAG AA, 44px touch targets, consistent frosted glass)

**Phase 3 — Auth & Backend Wiring**

- Spring Security + JWT auth system (login/register pages)
- Real OpenAI API integration (replace mock data)
- Backend crisis detection (classifier + keyword fallback, fail-closed)
- Prayer Wall + Local Support backend API wiring
- Journal entry persistence (encrypted database)
- Mood tracking to database
- Dashboard & Growth data persistence (swap localStorage to API)
- Friend system backend (user relationships, friend requests)
- Leaderboard backend (weekly reset cron, ranking queries)
- Notification backend (push notifications, email digests)
- Photo upload with moderation pipeline
- Rate limiting

**Phase 4 — Polish & Native Prep**

- Dark mode system-preference toggle
- Real TTS audio (replace placeholder MP3s using Spec 10 guide)
- Re-enable personalization section, time-of-day recommendations, resume prompt when auth is wired
- Real AI insights (replace mock insight cards with OpenAI-generated analysis)
- Performance optimization, SEO, production deployment
- Native app architecture planning (React Native or similar)

---

## Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help (see `01-ai-safety.md`)
- **Ask before coding** if requirements are unclear; **ask before commits** unless obvious completion point
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — test mobile/tablet/desktop; semantic HTML, ARIA labels, keyboard nav
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — this app touches emotional/spiritual topics; approach with care and respect
- **Gentle gamification** — celebrate presence, never punish absence; frame everything as encouragement, not competition
- **Privacy by default** — mood data is always private; users control visibility of engagement data; provide full privacy controls
