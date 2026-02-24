# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, and worship music.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, and community support.

### End Goal

Guide users toward emotional healing and spiritual growth through:

- AI-matched scripture based on emotional state
- Personalized prayer generation
- Reflective journaling with AI prompts
- Audio scripture, prayers, and sleep content (TTS + ambient sounds)
- Community prayer support
- Mood tracking with AI-powered insights
- Curated Spotify worship playlists
- Access to local churches and Christian counselors

---

## Implementation Details

**All technical standards, security policies, and coding conventions are in `.claude/rules/`:**

- 🚨 **[AI Safety & Ethics](.claude/rules/01-ai-safety.md)** - Crisis detection, content boundaries, moderation
- 🔒 **[Security](.claude/rules/02-security.md)** - Auth, rate limiting, encryption, input validation
- ⚙️ **[Backend Standards](.claude/rules/03-backend-standards.md)** - Spring Boot conventions, API contract
- 🎨 **[Frontend Standards](.claude/rules/04-frontend-standards.md)** - React patterns, accessibility, design system
- 🗄️ **[Database](.claude/rules/05-database.md)** - Schema, indexes, data retention
- ✅ **[Testing](.claude/rules/06-testing.md)** - Testing strategy, coverage requirements
- 📊 **[Logging & Monitoring](.claude/rules/07-logging-monitoring.md)** - Structured logging, PII handling
- 🚀 **[Deployment](.claude/rules/08-deployment.md)** - Environment variables, deployment platforms

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Complete Feature List

Full launch targets a complete feature set; features may ship incrementally (alpha/beta) for early feedback.

**Prerequisites Cheatsheet** (build features in any order, just satisfy dependencies first):

- **AI features** require: safety checks + rate limiting + logging + backend crisis detection
- **Community features** (prayer wall) require: auth + moderation + admin audit log + email notifications
- **Analytics** require: mood tracking persisted to database
- **Audio features** require: TTS API integration (OpenAI TTS or browser Speech Synthesis for MVP)
- **Email notifications** require: SMTP configured + failure handling
- **Data encryption** require: key management + env/secret manager

**Non-Goals for MVP** (to prevent scope creep):

- ❌ Multi-language support (English only for MVP)
- ❌ Payments/subscriptions (free for MVP)
- ❌ Social login (OAuth) - email/password only for MVP
- ❌ Real-time chat or messaging
- ❌ Spotify OAuth (just embed + deep link for MVP)
- ❌ Mobile apps (web-responsive only for MVP; native app planned post-launch)
- ❌ Complex user profiles (minimal profile for MVP)
- ❌ Multi-tenant / multiple admins / role systems (single-admin MVP)
- ❌ Human-narrated audio content (AI TTS for MVP; human narration is a future enhancement)
- ❌ Community prayer groups / small groups (post-MVP growth feature)
- ❌ Church partnership portal (post-MVP growth feature)
- ❌ Apple Health / Google Fit integration (app-only, post-launch)
- ❌ Standalone "Listen" page (audio features are distributed across Scripture, Meditation, and Journal pages)
- ❌ Points / leaderboard / social features (post-launch growth feature requiring auth + friends system)

### Foundation

1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, Journey to Healing timeline, starting point quiz, values section, impact counter, CTA, footer)
4. **Dashboard Skeleton** - Logged-in user view with widgets
5. **PostgreSQL + Docker** - Database setup with Docker Compose
6. **Design System** - Colors, typography, responsive components

### Core Features

7. **Mood Selector** - 5 buttons (Terrible, Bad, Neutral, Good, Excellent) + text input for custom descriptions
8. **Scripture Display** - AI-matched scripture with fade-in animation
9. **AI Scripture Reflection** - AI-generated reflection notes below each verse
10. **Scripture Database** - PostgreSQL with 100 seeded scriptures (20 per mood; translation TBD—must be legally usable)
11. **AI Pre-Tagging** - OpenAI API to tag scriptures with mood/theme mappings
12. **Mood Tracking** - Save mood selections with timestamp and scripture shown

### Journaling & Music

13. **Journal Page** - Text editor with save functionality
14. **AI Journaling Prompts** - Auto-generated prompts based on mood
15. **Saved Journal Entries** - View past entries at `/journal/my-entries`
16. **Spotify Integration** - Embed player + "Open in Spotify" deep link
17. **Music Page** - Dedicated `/music` page with playlist

### AI-Powered Features

18. **AI-Generated Prayers** - Available on `/scripture` page, `/pray` page, and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs
21. **AI Scripture Follow-Up Chat** - Conversational follow-up after scripture display ("Dig Deeper" — context-aware cross-references, historical context, practical applications)

### Audio Features (Distributed — No Standalone Page)

Audio is a feature layer that enhances existing pages, not a standalone destination.

22. **Audio Scripture Playback** - "Read Aloud" TTS on `/scripture` page (browser Speech Synthesis API for MVP, upgrade to OpenAI TTS or ElevenLabs later)
23. **Audio Prayer Playback** - "Read Aloud" TTS on AI-generated prayers and reflections
24. **Ambient Background Sounds** - Dedicated page under Music section (`/music/ambient`). Nature sounds, gentle piano, rain, ocean, forest soundscapes.
25. **Sleep & Bedtime Content** - Dedicated page under Music section (`/music/sleep`). Calming narrated scripture with ambient sounds, sleep timer with audio fade-out, "Wind Down" dimmed UI mode.
26. **Read Aloud Button** - Available on all text content (scriptures, prayers, reflections, meditations) for accessibility

### Community Features

27. **Prayer Wall** - Community forum for prayer requests
28. **AI Auto-Moderation** - Flag inappropriate content (profanity, abuse, spam)
29. **Admin Moderation Interface** - Simple CRUD at `/admin/prayer-wall` for reviewing, editing, deleting posts
30. **Email Notifications** - Send flagged posts to admin email from `ADMIN_EMAIL` env var
31. **User Reporting** - Report button on each prayer post
32. **Answered Prayer Tracking** - "Mark as Answered" button, answered prayers log / gratitude journal, optional testimony sharing to prayer wall

### Locator Features

33. **Church Locator** - Google Maps Places API real-time search at `/churches`
34. **Christian Counselor Locator** - Google Maps Places API real-time search at `/counselors`

### Content Features

35. **Guided Meditations** - 20 text-based meditations organized by topic (with audio playback via TTS)
36. **Verse of the Day** - Daily scripture on `/daily` page, homepage, and dashboard
37. **Song of the Day** - Daily worship song recommendation on `/daily` page, homepage, and dashboard
38. **Guided Reading Plans** - 7-day and 21-day themed plans ("Overcoming Anxiety," "Healing from Grief," etc.) with daily scripture + reflection + journal prompt + prayer

### Analytics & Personalization

39. **Mood History Dashboard** - 7-day snapshot on `/dashboard`
40. **Mood Insights Page** - Full history with calendar heatmap and line charts at `/insights` (accessible from dashboard, not top-level nav)
41. **Trend Analysis** - AI-generated insights ("Your mood is improving this week!")
42. **Mood Correlations** - "You tend to feel better on days you journal"
43. **Personalized Recommendations** - Scripture/music suggestions based on mood history
44. **Monthly Mood Report** - Email or in-app summary of mood patterns

### Engagement & Retention

45. **Daily Streak Tracking** - Consecutive days using any feature (prayer, journal, meditation, etc.) with visual streak display
46. **Streak Recovery Grace Period** - Miss one day without losing streak
47. **Weekly Summary** - "You prayed 5 times this week and journaled 3 times"
48. **Shareable Scripture Cards** - Auto-generated branded images with verse text, share to social/messaging
49. **Saved / Favorited Content** - Bookmark button on scriptures, prayers, reflections; "My Favorites" page
50. **Dark Mode** - System-preference-aware toggle, auto-switch at bedtime

### Landing Page Sections

51. **Starting Point Quiz** - 3-5 question quiz ("Not Sure Where to Start?") that recommends a personalized entry point based on user's emotional state, spiritual background, and preferences. Client-side only, no data persistence for logged-out users. Includes crisis resource note if answers indicate distress.
52. **Values Section** - "Why Worship Room?" — 4 value cards: Always Free, Privacy-First, Built with Safety, Grounded in Scripture (replaces testimonials for new site)
53. **Impact Counter** - Growing stats (scriptures matched, prayers generated, community prayer requests)
54. **CTA Section** - Bottom call-to-action repeating hero input or "Get Started Free" button
55. **Footer** - Nav links, crisis resources, mission statement, disclaimers

### Polish & Launch Prep

56. **Personalized Onboarding Flow** - 3-5 question onboarding at signup to curate starting experience
57. **Performance Optimization** - Lazy loading, code splitting, caching
58. **Security Audit** - Vulnerability scanning, penetration testing
59. **SEO Optimization** - Meta tags, sitemap, structured data
60. **Production Deployment** - Production setup with CI/CD
61. **User Testing** - Beta testing with real users

### Post-Launch Growth Features

62. **Community Prayer Groups** - Private small groups (3-12 people) with group prayer requests, "I prayed for this" notifications, group streaks
63. **Church Partnership Portal** - Church admin dashboard, congregation-wide prayer wall, weekly digest to pastor
64. **Kids / Family Mode** - Simplified mood selector, age-appropriate scripture, bedtime Bible stories
65. **Apple Health / Google Fit Sync** - Sync meditation minutes and prayer time (app only)
66. **AI Pastoral Companion** - Persistent conversational AI with session memory, draws from mood history and journal patterns
67. **Faith Points & Leaderboard** - Gamification system to encourage daily spiritual habits:
    - **Points**: Earn points for completing activities (pray, journal, meditate, post to prayer wall, mark prayer answered, maintain streaks, etc.)
    - **Point values**: Configurable per activity (e.g., daily prayer = 10 pts, journal entry = 15 pts, 7-day streak bonus = 50 pts)
    - **Leaderboard**: Friends-only leaderboard (not global — keeps it encouraging, not competitive). Weekly and all-time views.
    - **Friends system**: Add friends by username or invite link. See friends' points and streaks. No access to friends' private content (journals, mood data).
    - **Profile badges**: Milestone badges ("First Prayer", "7-Day Streak", "100 Prayers", "Prayer Warrior" etc.)
    - **Accessibility**: Leaderboard visible from Dashboard. NOT in main navbar (logged-in feature only).
    - **Logged-out teaser**: Landing page or post-activity prompt shows a locked leaderboard preview: "Sign up to start earning Faith Points and see how you and your friends are growing together."
    - **Requires**: Auth + friends system + points tracking table + leaderboard API
    - **Tone**: Frame as mutual encouragement ("growing together"), never as competition. Avoid shame-based language for low scores.

---

## Navigation Structure

### Desktop Navbar

```
[Worship Room logo]   [Daily ▾]   [Music ▾]   Prayer Wall   [Local Support ▾]   [Log In]  [Get Started]
```

**Top-level link (1):** Prayer Wall — your community differentiator, always visible.

**"Daily" dropdown** (clickable label goes to `/daily`; dropdown expands on hover/click):
```
├── Pray
├── Journal
├── Meditate
├── Verse & Song
```

**"Music" dropdown** (clickable label goes to `/music`; dropdown expands on hover/click):
```
├── Worship Playlists
├── Ambient Sounds
├── Sleep & Rest
```

**"Local Support" dropdown** (clickable label goes to `/churches`; dropdown expands on hover/click):
```
├── Churches
├── Counselors
```

**Design rationale:** The navbar uses a clean content-type separation. "Daily" groups the active daily habits (reading, writing, reflecting). "Music" groups everything audio-based (worship playlists, ambient soundscapes, sleep content). "Prayer Wall" stands alone as the community differentiator. "Local Support" groups real-world help. The rule is simple: if it involves reading/doing, it's under Daily. If it involves listening, it's under Music. 3 dropdowns + 1 standalone link + auth is clean and balanced at all screen sizes.

**Content-type rule:**
- **Meditate = reading.** Text-based guided devotionals, scripture soaking, breathing exercises, reading plans. Quiet, focused, screen-based.
- **Music = listening.** Anything with audio — worship playlists, ambient soundscapes, sleep/bedtime content with narrated scripture.
- **Exception:** "Read Aloud" TTS buttons on Scripture and Prayer pages are accessibility features that stay on those pages, not standalone audio content under Music.

### Mobile Drawer

```
DAILY
  Pray
  Journal
  Meditate
  Verse & Song
──────────────
MUSIC
  Worship Playlists
  Ambient Sounds
  Sleep & Rest
──────────────
Prayer Wall
──────────────
LOCAL SUPPORT
  Churches
  Counselors
──────────────
[Log In]
[Get Started]
```

### Post-Login Navbar

Replace "Log In / Get Started" with user avatar dropdown:
```
├── Dashboard
├── My Journal Entries
├── My Prayer Requests
├── My Favorites
├── Mood Insights
├── Settings
├── ─────────────────
└── Log Out
```

**Note:** Mood Insights (`/insights`) is accessible from the user dropdown and from the Dashboard, not from the main nav. It's a personal analytics feature that only makes sense for logged-in users.

---

## Routes

### Public Routes (No Authentication Required)

- `/` - Landing page (hero, journey timeline, starting point quiz, values section, impact counter, CTA, footer)
- `/scripture` - Mood selector (buttons + text input) → Scripture display → AI reflection → Prayer generator button → Read Aloud button
- `/pray` - Standalone AI prayer generator
- `/journal` - Journal editor with ambient sounds toggle (prompts login to save)
- `/meditate` - Guided text-based meditations organized by topic (devotionals, breathing exercises, scripture soaking, reading plans)
- `/music` - Music hub: Worship Playlists, Ambient Sounds, Sleep & Rest
- `/music/playlists` - Curated Spotify worship playlists (embed + deep link)
- `/music/ambient` - Ambient soundscapes (rain, ocean, gentle piano, forest)
- `/music/sleep` - Sleep & bedtime content (narrated scripture, sleep timer, wind-down mode)
- `/prayer-wall` - Community prayer requests (view only when logged out)
- `/daily` - Verse & Song of the Day
- `/churches` - Church locator (Google Maps)
- `/counselors` - Counselor locator (Google Maps)
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Require Authentication)

- `/dashboard` - Personalized dashboard with widgets (daily verse/song, quick prayer, 7-day mood snapshot, streak counter, link to insights)
- `/insights` - Mood tracking charts & trends (calendar heatmap, line graph, AI insights, correlations)
- `/journal/my-entries` - Saved journal entries
- `/prayers/my-requests` - User's own prayer wall posts (with answered prayer tracking)
- `/favorites` - Saved/bookmarked scriptures, prayers, and reflections
- `/prayer-wall` - Community prayer requests (can post when logged in)

### Admin Routes (Requires `is_admin = true`)

- `/admin/prayer-wall` - Moderation interface (table view, edit/delete posts, view flagged, ban users, search)

---

## Landing Page Structure

The landing page sections render in this order:

```
1. Navbar (transparent glassmorphic pill — Daily dropdown, Music dropdown, Prayer Wall, Local Support dropdown)
2. Hero Section (dark purple gradient, "How're You Feeling Today?", typewriter input → /scripture, quiz teaser link scrolls to #quiz)
3. Journey Section (6-step vertical timeline: Pray → Journal → Meditate → Music → Prayer Wall → Local Support)
4. Starting Point Quiz (id="quiz" — "Not Sure Where to Start?" — 3-5 questions, Ramsey-style progress bar, routes to recommended feature)
5. Values Section ("Why Worship Room?" — 4 cards: Always Free, Privacy-First, Built with Safety, Grounded in Scripture)
6. Impact Counter (growing stats: scriptures matched, prayers generated, community prayer requests)
7. CTA Section (repeat hero input or "Get Started Free" button)
8. Footer (nav links, crisis resources, mission statement, disclaimers)
```

### Journey Steps (6 Steps)

| # | Step | Description | Route |
|---|------|-------------|-------|
| 1 | Pray | Begin with what's on your heart. Share your feelings and receive a personalized prayer grounded in Scripture. | `/scripture` |
| 2 | Journal | Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life. | `/journal` |
| 3 | Meditate | Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in. | `/meditate` |
| 4 | Music | Let music carry you deeper. Curated worship playlists matched to where you are right now. | `/music` |
| 5 | Prayer Wall | You're not alone. Share prayer requests and lift others up in a safe, supportive community. | `/prayer-wall` |
| 6 | Local Support | Find churches and Christian counselors near you. The next step in your healing may be just around the corner. | `/churches` |

**The flow tells a story:** Start with God (Pray) → Process internally (Journal, Meditate) → Worship (Music) → Connect with others (Prayer Wall) → Get real-world help (Local Support).

---

## UX Flows

### Demo Mode (Logged-Out Experience) Data Policy

**Critical Privacy Rule**: Logged-out users can use all features (mood selection, scripture, prayers, journaling prompts, audio playback, quiz), but **zero data persistence**.

- **No database writes** for logged-out users (no mood tracking, no journal saves, no prayer saves)
- **Session-only**: Mood/scripture shown in UI, stored in React state/memory only
- **Privacy-first**: No cookies, no anonymous IDs, no IP persistence for logged-out users
- **Rate limiting**: We may apply transient IP-based rate limiting at the edge for abuse prevention, but we do not persist or log IPs for logged-out users
- **Conversion**: See "Logged-Out Conversion Strategy" section below for full details.

### Mood Selection & Scripture Display Flow

1. User lands on `/scripture` page
2. Sees two input options:
   - **5 mood buttons**: Terrible, Bad, Neutral, Good, Excellent
   - **Text input**: "Tell us how you're feeling..." with submit button
3. User selects mood OR types description
4. **AI Safety Check** (backend): Run crisis detection (classifier; keywords fallback). If detected → Show crisis resources immediately
5. Scripture fades in with animation
6. AI-generated reflection appears below scripture (2-3 sentences)
7. "Generate a prayer for this" button appears
8. "Read Aloud" button appears (TTS playback of scripture + reflection)
9. "Dig Deeper" button for AI follow-up chat (cross-references, context, practical applications)
10. If logged in: Mood + scripture + timestamp saved to database
11. If logged out: Prompt to "Create account to save your mood history"

### Prayer Generation Flow

1. **Option A**: User clicks "Generate a prayer" on `/scripture` page after viewing scripture
2. **Option B**: User navigates to `/pray` page directly
3. **Option C**: User clicks prayer widget on `/dashboard`
4. User optionally provides context via text input
5. **AI Safety Check** (backend): Run crisis detection (classifier; keywords fallback). Scan input for inappropriate requests or crisis indicators
6. OpenAI generates personalized prayer
7. Prayer displays with copy button, "Read Aloud" button, and option to save (if logged in)

### Journaling Flow

1. User navigates to `/journal`
2. AI prompt auto-appears based on:
   - Current mood (if just selected)
   - Recent mood history (if logged in)
   - Default encouraging prompt (if no mood context)
3. Optional: Ambient background sounds toggle (rain, gentle piano, nature)
4. User writes in editor
5. User clicks "Save Entry"
6. If logged in: Entry saved to database (encrypted)
7. If logged out: Modal prompts "Create account to save"

### Meditation Flow

1. User navigates to `/meditate`
2. Sees text-based meditations organized by topic (Peace & Calm, Anxiety Relief, Healing, Gratitude, Forgiveness, Trust, etc.)
3. User selects a meditation → text displays with "Read Aloud" TTS button
4. Content types on this page:
   - **Guided Devotionals** — 5-10 minute scripture-based readings by topic
   - **Breathing Exercise** — inhale/hold/exhale timer with scripture displayed during each phase
   - **Scripture Soaking** — single verse in large text with a contemplation timer (2, 5, or 10 min)
   - **Reading Plans** — 7-day and 21-day themed plans (structured meditation series)
5. This page is text/reading focused. Audio content (ambient sounds, sleep/bedtime) lives under Music.

### Mood Tracking Flow

1. Every time user submits mood (button OR text input), save to `mood_selections` table:
   - `user_id` (if logged in)
   - `mood` (if button clicked)
   - `description` (if text input used)
   - `scripture_id` (scripture shown)
   - `timestamp`
2. On `/dashboard`: Show 7-day snapshot (mini chart) + streak counter
3. On `/insights` (accessible from dashboard + user dropdown): Show full history with:
   - Calendar heatmap (like GitHub contributions)
   - Line chart showing mood over time
   - Stats: "This week you felt Good 4 times, Terrible 2 times"
   - AI insights: "Your mood is improving!" or "You've had a tough week"
   - Correlations: "You tend to feel better on days you journal"

### Prayer Wall Flow

1. User navigates to `/prayer-wall`
2. If logged out: Can view posts, prompted to login to post
3. If logged in: Can create new prayer request
4. **AI Safety Check** (backend): Run crisis detection (classifier; keywords fallback). Scan post for self-harm, abuse, spam, profanity
5. If flagged: Email sent to `ADMIN_EMAIL`, post goes to moderation queue
6. Users can report posts (adds to reports table)
7. Users can "Mark as Answered" on their own posts → optional testimony sharing
8. Admin can view flagged posts at `/admin/prayer-wall` and edit/delete
9. Admin actions logged to `admin_audit_log`

### Hero Quiz Teaser

Below the hero input box, add a secondary entry point:
- Text: "Not sure where to start? Take a 30-second quiz and we'll help you find your path."
- "Take the quiz" is a clickable link/button that smooth-scrolls to the `#quiz` section further down the landing page.
- Styling: subtle, secondary text (Text Light color, smaller font). Not competing with the main input box — just a gentle alternative for people who feel overwhelmed or curious.
- Uses `scrollIntoView({ behavior: 'smooth' })` or an `<a href="#quiz">` with CSS `scroll-behavior: smooth` on the html element.
- The quiz section (built later) must have `id="quiz"` on its container.

### Starting Point Quiz Flow

1. Quiz section has `id="quiz"` so the hero teaser can scroll to it. User can also scroll to it naturally.
2. Sees: "Not Sure Where to Start?" with subheading
3. 3-5 multiple-choice questions with progress bar (single-select, forward/back navigation)
4. Questions cover: what brought them, emotional state, what sounds helpful, existing practice
5. Client-side result mapping → personalized recommendation card with:
   - Recommended feature + CTA button
   - Relevant scripture verse
   - "Or explore all features →" secondary link
6. **Safety**: If answers indicate distress → include crisis resource note on result page
7. **Privacy**: 100% client-side (React state), no data persistence for logged-out users
8. **If logged in**: Optionally save quiz results to inform future AI recommendations

### Logged-Out Conversion Strategy

**Core principle: Give the output, withhold the history.** Every feature works fully on first use. The account wall appears at the moment of *accumulation* — when someone would benefit from their history, patterns, progress, or community. People don't sign up for features. They sign up because they've invested something and don't want to lose it.

**Model: Free to use, meaningful to keep.** The account isn't a gate — it's a gift. It turns a one-time moment of comfort into an ongoing journey with visible progress.

**Rules:**
- **Never gate the first use of any feature.** Every core action (pray, journal, meditate, read prayer wall, find churches) works without an account. The moment you block the first use, you lose the trust of someone who's hurting and just wants help.
- **Never nag on the first visit.** Let them complete one full flow uninterrupted before any conversion prompt appears.
- **Never use countdown timers, limited tries, or "3 free prayers" limits.** That's the Hallow/Glorify subscription model that users complain about. Our conversion model is generosity-first.
- **All prompts are dismissible.** Never block the UI or force signup. Soft cards, overlays with close buttons, gentle nudges — never hard walls.
- **Show prompts after value delivery, never before.** The user should already feel helped before we ask for anything.

**Per-Feature Conversion Triggers:**

**After Praying (Scripture Match):**
- Full experience: scripture, reflection, prayer, Read Aloud — all free, no interruption.
- After the result displays, show a soft card at the bottom: *"This is your 3rd prayer this week. Create an account to track your journey and see how God is meeting you over time."*
- Include a small preview: mini mood chart with sample data, slightly blurred. The message: you already have a story building — don't you want to see it?
- Track visit count in React state (session memory only, lost on refresh — no cookies).

**After Journaling:**
- Full experience: AI prompt, writing, ambient sounds — all free.
- When they navigate away or try to close: *"You just wrote something meaningful. Sign up to save it — your words won't be here when you come back."*
- This is a real loss. People don't want to lose something they just created. The conversion trigger is the fear of losing their own words, not a feature gate.

**On the Prayer Wall:**
- Full read access: browse all posts, see the community.
- Conversion trigger: when they want to *participate* — post their own request or encourage someone else. *"Join the community to share your prayer or encourage someone."*
- The desire to participate is the conversion trigger, not the desire to consume.

**After 2-3 Visits (Streak & Points Teasers):**
- After the 2nd or 3rd session (tracked in React state, session-only): *"You've been here 3 days in a row. That's a streak worth keeping. Sign up so we can track it for you."*
- Show a small Faith Points preview: *"If you had an account, you'd have earned 45 Faith Points this week."* Make the invisible visible.

**After Completing a Meditation:**
- Full access to all meditations and ambient sounds.
- After completing one, show: *"You just spent 8 minutes in God's Word. Imagine seeing a month of moments like this. Create an account to build your meditation history."*

**On the Daily Page (Verse & Song):**
- Verse & Song of the Day works for everyone, no gate.
- Below the content, show a "Your Week at a Glance" section that's locked: blurred calendar with mood colors, blurred streak counter, blurred "3 prayers this week" stat. All sample data, clearly labeled as preview. The preview makes the abstract concrete.

**On the Landing Page:**
- In the Values Section or near the CTA, consider a "See What You're Building" interactive preview: a mock dashboard that fills in as someone scrolls, showing mood heatmap populating, streak counter climbing, Faith Points accumulating, journal entries stacking up.
- This is aspirational. It says: this is what your spiritual life looks like when you show up consistently, and we'll help you see it.

**Conversion Prompt Component (`ConversionPrompt.tsx`):**
- Reusable component used across all pages.
- Props: `message` (string), `previewType` (optional: "mood-chart" | "streak" | "points" | "blurred-dashboard" | none), `dismissible` (boolean, default true)
- Renders as a soft card with warm styling (not aggressive banner). Matches design system.
- "Create Account" button routes to `/register`.
- "Maybe Later" dismisses for the session (stored in React state).
- Once dismissed on a page, does not reappear during that session.
- Never renders on a user's first interaction with a feature — only after they've received value at least once.

---

## Design System

### Color Palette

- **Primary**: `#6D28D9` (deep violet)
- **Primary Light**: `#8B5CF6` (lighter violet accent)
- **Hero Dark**: `#0D0620` (dark purple for hero gradient)
- **Glow Cyan**: `#00D4FF` (cyan for input glow effects)
- **Neutral Background**: `#F5F5F5` (warm off-white)
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue)
- **Text Light**: `#7F8C8D` (medium gray)
- **Success**: `#27AE60` (green for positive moods)
- **Warning**: `#F39C12` (orange for neutral moods)
- **Danger**: `#E74C3C` (red for negative moods/flags)

### Typography

- **Body Font**: Inter (sans-serif)
  - Regular: 400
  - Medium: 500
  - Semi-bold: 600
  - Bold: 700
- **Scripture Font**: Lora (serif)
  - Regular: 400
  - Italic: 400 italic
  - Bold: 700
- **Decorative Font**: Caveat (cursive) — used for script emphasis in headings and branding
- **Heading Font**: Inter (same as body for consistency)
  - Semi-bold: 600
  - Bold: 700

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

---

## Build Approach

### Spec-Driven Workflow

Use this workflow for all new features:

1. **`/spec <feature description>`** — Generates a spec file in `_specs/`, switches to a new feature branch, then auto-enters Plan Mode to generate a technical plan saved to `_plans/YYYY-MM-DD-<feature>.md`
2. **Review** — User reviews and approves the plan before implementation begins
3. **Implement** — Build the feature following the plan
4. **`/code-review`** — Runs accessibility + code quality review on uncommitted changes before merging

### Development Strategy

1. **Build logged-out experience first**:
   - Landing page with all features showcased
   - All features work in "demo mode" without requiring login
   - Users can try features before signing up
   - Prompt to create account when trying to save data
   - **Implement AI safety from day one**

2. **Then add authentication and personalization**:
   - Implement Spring Security + JWT
   - Add login/register pages
   - Enable data saving (moods, journals, prayers)
   - Add protected routes and dashboard
   - Enable mood tracking and insights

3. **Benefits of this approach**:
   - Can demo the app to users early
   - Easier to test core UX without auth complexity
   - Users can explore before committing
   - Reduces barrier to entry
   - Safety measures baked in from the start

### Implementation Phases

**Phase 1 — Complete the Landing Page**
- Update Navbar (Daily dropdown + Music + Prayer Wall + Local Support dropdown)
- Keep JourneySection at 6 steps (Pray, Journal, Meditate, Music, Prayer Wall, Local Support) — update descriptions if needed
- Build Footer (nav links, crisis resources, mission statement)
- Build ValuesSection (4 value cards)
- Build CTASection (bottom call-to-action)
- Build StartingPointQuiz (Ramsey-style quiz)
- Build ImpactCounter (growing stats)

**Phase 2 — Core Product Experience**
- Build `/scripture` page (mood selector → AI scripture match → reflection → prayer → Read Aloud)
- Build mood selector (5 buttons + text)
- Wire up OpenAI API for scripture matching + prayer generation
- Add TTS "Read Aloud" button to scripture display
- Build `/meditate` page (text-based devotionals, breathing exercises, scripture soaking)
- Build `/music` hub page with sub-routes (playlists, ambient, sleep)

**Phase 3 — Auth & Persistence**
- Auth system (login/register)
- Dashboard skeleton (with link to /insights)
- Journaling with save + ambient sounds
- Prayer wall with moderation
- Mood tracking to database

**Phase 4 — Polish & Growth Features**
- Dark mode
- Streaks & habit tracking
- Shareable scripture cards
- Saved/favorited content
- Reading plans
- Expanded mood insights
- Sleep & bedtime content on /meditate

---

## Definition of Done (For Any Feature)

Before considering a feature "complete", ensure:

- ✅ **UI implemented** + responsive (mobile, tablet, desktop)
- ✅ **Backend endpoint** implemented (if needed)
- ✅ **Tests added/updated** (frontend + backend)
- ✅ **Rate limiting** + logging on AI endpoints (if applicable)
- ✅ **Error states** + loading states handled
- ✅ **Accessibility basics** (labels, keyboard nav, ARIA where needed)
- ✅ **No secrets committed** (API keys, passwords, etc.)
- ✅ **AI safety checks** implemented (if user input involved)
- ✅ **Audio playback** tested if applicable (TTS, ambient sounds)
- ✅ **Documentation updated** (if public-facing feature or API change)

---

## Important Reminders

1. **AI Safety First** - Always prioritize user safety, implement crisis detection, never replace professional help
2. **Ask clarifying questions** - If a prompt is unclear, ask before coding
3. **Commit at completion points** - Ask before commits unless it's an obvious completion point
4. **Run tests automatically** - Ensure quality with every change
5. **Be autonomous** - Implement features without micro-management when the goal is clear
6. **Feature branches** - Always work on feature branches, never directly on main
7. **Responsive design** - Always test mobile, tablet, and desktop views
8. **Accessibility** - Use semantic HTML, ARIA labels, keyboard navigation
9. **Security** - Never commit API keys, sanitize user input, validate everything
10. **Performance** - Optimize images, lazy load routes, minimize bundle size
11. **Empathy** - This app touches emotional/spiritual topics - approach with care
12. **Rate limiting** - Protect AI endpoints from abuse and control costs
13. **Logging** - Log everything important for debugging and audit trails
14. **Data privacy** - Encrypt sensitive data, respect user privacy
15. **Audio accessibility** - All audio content must have text equivalents; TTS is an enhancement, not a replacement for readable text

---

**Remember**: This project touches on emotional and spiritual well-being. Approach features with empathy, respect, and care for users' experiences. Every feature should make users feel seen, supported, and hopeful. **User safety is paramount** - always provide crisis resources when needed and never attempt to replace professional mental health care.
