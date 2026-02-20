# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, community support, and worship music.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, and community support.

### End Goal

Guide users toward emotional healing and spiritual growth through:

- AI-matched scripture based on emotional state
- Personalized prayer generation
- Reflective journaling with AI prompts
- Community prayer support
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
- **Email notifications** require: SMTP configured + failure handling
- **Data encryption** require: key management + env/secret manager

**Non-Goals for MVP** (to prevent scope creep):

- ❌ Multi-language support (English only for MVP)
- ❌ Payments/subscriptions (free for MVP)
- ❌ Social login (OAuth) - email/password only for MVP
- ❌ Real-time chat or messaging
- ❌ Spotify OAuth (just embed + deep link for MVP)
- ❌ Mobile apps (web-responsive only for MVP)
- ❌ Complex user profiles (minimal profile for MVP)
- ❌ Multi-tenant / multiple admins / role systems (single-admin MVP)

### Foundation

1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, Journey to Healing timeline, feature cards, footer)
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

### Community Features

21. **Prayer Wall** - Community forum for prayer requests
22. **AI Auto-Moderation** - Flag inappropriate content (profanity, abuse, spam)
23. **Admin Moderation Interface** - Simple CRUD at `/admin/prayer-wall` for reviewing, editing, deleting posts
24. **Email Notifications** - Send flagged posts to admin email from `ADMIN_EMAIL` env var
25. **User Reporting** - Report button on each prayer post

### Locator Features

26. **Church Locator** - Google Maps Places API real-time search at `/churches`
27. **Christian Counselor Locator** - Google Maps Places API real-time search at `/counselors`

### Content Features

28. **Guided Meditations** - 20 text-based meditations organized by topic
29. **Verse of the Day** - Daily scripture on `/daily` page, homepage, and dashboard
30. **Song of the Day** - Daily worship song recommendation on `/daily` page, homepage, and dashboard

### Analytics & Personalization

31. **Mood History Dashboard** - 7-day snapshot on `/dashboard`
32. **Mood Insights Page** - Full history with calendar heatmap and line charts at `/insights`
33. **Trend Analysis** - AI-generated insights ("Your mood is improving this week!")
34. **Personalized Recommendations** - Scripture/music suggestions based on mood history

### Polish & Launch Prep

35. **Complete Landing Page** - Showcase all features with CTAs
36. **Performance Optimization** - Lazy loading, code splitting, caching
37. **Security Audit** - Vulnerability scanning, penetration testing
38. **SEO Optimization** - Meta tags, sitemap, structured data
39. **Production Deployment** - Production setup with CI/CD
40. **User Testing** - Beta testing with real users

---

## Routes

### Public Routes (No Authentication Required)

- `/` - Landing page (full marketing site)
- `/scripture` - Mood selector (buttons + text input) → Scripture display → AI reflection → Prayer generator button
- `/pray` - Standalone AI prayer generator
- `/music` - Spotify playlist page (embed + deep link)
- `/journal` - Journal editor (prompts login to save)
- `/daily` - Verse & Song of the Day
- `/meditate` - Guided meditations (20 text-based, organized by topic)
- `/prayer-wall` - Community prayer requests (view only when logged out)
- `/churches` - Church locator (Google Maps)
- `/counselors` - Counselor locator (Google Maps)
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Require Authentication)

- `/dashboard` - Personalized dashboard with widgets (daily verse/song, quick prayer, 7-day mood snapshot)
- `/insights` - Mood tracking charts & trends (calendar heatmap, line graph, AI insights)
- `/journal/my-entries` - Saved journal entries
- `/prayers/my-requests` - User's own prayer wall posts
- `/prayer-wall` - Community prayer requests (can post when logged in)

### Admin Routes (Requires `is_admin = true`)

- `/admin/prayer-wall` - Moderation interface (table view, edit/delete posts, view flagged, ban users, search)

---

## UX Flows

### Demo Mode (Logged-Out Experience) Data Policy

**Critical Privacy Rule**: Logged-out users can use all features (mood selection, scripture, prayers, journaling prompts), but **zero data persistence**.

- **No database writes** for logged-out users (no mood tracking, no journal saves, no prayer saves)
- **Session-only**: Mood/scripture shown in UI, stored in React state/memory only
- **Privacy-first**: No cookies, no anonymous IDs, no IP persistence for logged-out users
- **Rate limiting**: We may apply transient IP-based rate limiting at the edge for abuse prevention, but we do not persist or log IPs for logged-out users
- **Conversion**: Prompts to "Create account to save" appear after feature use (non-intrusive)

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
8. If logged in: Mood + scripture + timestamp saved to database
9. If logged out: Prompt to "Create account to save your mood history"

### Prayer Generation Flow

1. **Option A**: User clicks "Generate a prayer" on `/scripture` page after viewing scripture
2. **Option B**: User navigates to `/pray` page directly
3. **Option C**: User clicks prayer widget on `/dashboard`
4. User optionally provides context via text input
5. **AI Safety Check** (backend): Run crisis detection (classifier; keywords fallback). Scan input for inappropriate requests or crisis indicators
6. OpenAI generates personalized prayer
7. Prayer displays with copy button and option to save (if logged in)

### Journaling Flow

1. User navigates to `/journal`
2. AI prompt auto-appears based on:
   - Current mood (if just selected)
   - Recent mood history (if logged in)
   - Default encouraging prompt (if no mood context)
3. User writes in editor
4. User clicks "Save Entry"
5. If logged in: Entry saved to database (encrypted)
6. If logged out: Modal prompts "Create account to save"

### Mood Tracking Flow

1. Every time user submits mood (button OR text input), save to `mood_selections` table:
   - `user_id` (if logged in)
   - `mood` (if button clicked)
   - `description` (if text input used)
   - `scripture_id` (scripture shown)
   - `timestamp`
2. On `/dashboard`: Show 7-day snapshot (mini chart)
3. On `/insights`: Show full history with:
   - Calendar heatmap (like GitHub contributions)
   - Line chart showing mood over time
   - Stats: "This week you felt Good 4 times, Terrible 2 times"
   - AI insights: "Your mood is improving!" or "You've had a tough week"

### Prayer Wall Flow

1. User navigates to `/prayer-wall`
2. If logged out: Can view posts, prompted to login to post
3. If logged in: Can create new prayer request
4. **AI Safety Check** (backend): Run crisis detection (classifier; keywords fallback). Scan post for self-harm, abuse, spam, profanity
5. If flagged: Email sent to `ADMIN_EMAIL`, post goes to moderation queue
6. Users can report posts (adds to reports table)
7. Admin can view flagged posts at `/admin/prayer-wall` and edit/delete
8. Admin actions logged to `admin_audit_log`

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

---

**Remember**: This project touches on emotional and spiritual well-being. Approach features with empathy, respect, and care for users' experiences. Every feature should make users feel seen, supported, and hopeful. **User safety is paramount** - always provide crisis resources when needed and never attempt to replace professional mental health care.
