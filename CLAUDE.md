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

## Complete Feature List

Full launch targets a complete feature set; features may ship incrementally (alpha/beta) for early feedback.

**Note on Phases**: Phases are guidance for logical dependencies, not strict order. It's okay to jump around as long as prerequisites are satisfied.

**Prerequisites Cheatsheet**:
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

### Phase 1: Foundation
1. **Authentication System** - Spring Security + JWT, email/password login (Auth scaffolding early; core flows must work logged-out in demo mode)
2. **React Router Setup** - Protected routes, public routes
3. **Landing Page** - Full marketing site (hero, feature cards, how it works, footer)
4. **Dashboard Skeleton** - Logged-in user view with widgets
5. **PostgreSQL + Docker** - Database setup with Docker Compose
6. **Design System** - Colors, typography, responsive components

### Phase 2: Core Features
7. **Mood Selector** - 5 buttons (Terrible, Bad, Neutral, Good, Excellent) + text input for custom descriptions
8. **Scripture Display** - AI-matched scripture with fade-in animation
9. **AI Scripture Reflection** - AI-generated reflection notes below each verse
10. **Scripture Database** - PostgreSQL with 100 seeded scriptures (20 per mood; translation TBD—must be legally usable)
11. **AI Pre-Tagging** - OpenAI API to tag scriptures with mood/theme mappings
12. **Mood Tracking** - Save mood selections with timestamp and scripture shown

### Phase 3: Journaling & Music
13. **Journal Page** - Text editor with save functionality
14. **AI Journaling Prompts** - Auto-generated prompts based on mood
15. **Saved Journal Entries** - View past entries at `/journal/my-entries`
16. **Spotify Integration** - Embed player + "Open in Spotify" deep link
17. **Music Page** - Dedicated `/music` page with playlist

### Phase 4: AI-Powered Features
18. **AI-Generated Prayers** - Available on `/scripture` page, `/pray` page, and dashboard widget
19. **Text-Based Scripture Matching** - OpenAI analyzes user's custom text input to find matching scripture
20. **Prayer Request Generation** - AI helps users articulate prayer needs

### Phase 5: Community Features
21. **Prayer Wall** - Community forum for prayer requests
22. **AI Auto-Moderation** - Flag inappropriate content (profanity, abuse, spam)
23. **Admin Moderation Interface** - Simple CRUD at `/admin/prayer-wall` for reviewing, editing, deleting posts
24. **Email Notifications** - Send flagged posts to admin email from `ADMIN_EMAIL` env var
25. **User Reporting** - Report button on each prayer post

### Phase 6: Locator Features
26. **Church Locator** - Google Maps Places API real-time search at `/churches`
27. **Christian Counselor Locator** - Google Maps Places API real-time search at `/counselors`

### Phase 7: Content Features
28. **Guided Meditations** - 20 text-based meditations organized by topic
29. **Verse of the Day** - Daily scripture on `/daily` page, homepage, and dashboard
30. **Song of the Day** - Daily worship song recommendation on `/daily` page, homepage, and dashboard

### Phase 8: Analytics & Personalization
31. **Mood History Dashboard** - 7-day snapshot on `/dashboard`
32. **Mood Insights Page** - Full history with calendar heatmap and line charts at `/insights`
33. **Trend Analysis** - AI-generated insights ("Your mood is improving this week!")
34. **Personalized Recommendations** - Scripture/music suggestions based on mood history

### Phase 9: Polish & Launch Prep
35. **Complete Landing Page** - Showcase all features with CTAs
36. **Performance Optimization** - Lazy loading, code splitting, caching
37. **Security Audit** - Vulnerability scanning, penetration testing
38. **SEO Optimization** - Meta tags, sitemap, structured data
39. **Production Deployment** - Production setup with CI/CD
40. **User Testing** - Beta testing with real users

---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router (required)
- **Data Fetching**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge
- **Testing**: Vitest + React Testing Library + jsdom

### Backend
- **Framework**: Spring Boot 3.x (pin exact version in pom.xml, currently 3.2.2)
- **Language**: Java 21
- **Build**: Maven
- **API Style**: RESTful
- **Security**: Spring Security + JWT
- **Testing**: JUnit 5 + Spring Boot Test + Testcontainers (for PostgreSQL integration tests)
- **Email**: Spring Mail (SMTP for admin notifications)
- **Logging**: Logback with JSON structured logging
- **Monitoring**: Spring Boot Actuator + error tracking (Sentry or similar)

### Database
- **Local Development**: PostgreSQL via Docker Compose
- **Production**: PostgreSQL hosted on Railway, Render, or Supabase
- **ORM**: Spring Data JPA
- **Migrations**: Flyway or Liquibase (TBD)

### External APIs
- **AI**: OpenAI API (default model: `gpt-4o`, configurable via `OPENAI_MODEL` env var for scripture matching, prayer generation, reflections, prompts, moderation)
- **Maps**: Google Maps Places API (church/counselor locator)
- **Music**: Spotify Embed Player + Deep Link (Spotify Web API only if personalization/playback control is needed later)

### Deployment
- **Frontend**: Vercel (React app with CI/CD)
- **Backend**: Railway, Render, or Fly.io (Spring Boot API)
- **Database**: Railway PostgreSQL, Supabase, or Neon
- **Containerization**: Docker (configured for local dev)
- **CI/CD**: GitHub Actions (integrated with deployment platforms)
- **Error Tracking**: Sentry or Rollbar
- **Monitoring**: Vercel Analytics (frontend), Spring Boot Actuator (backend)

---

## AI Safety & Ethics

**CRITICAL**: This application deals with emotional and spiritual well-being. AI safety guardrails are mandatory.

### Crisis Intervention Protocol
- **Self-Harm Detection**: Use a lightweight classifier step (LLM or rules+LLM) for crisis detection; keywords are a fallback, not the sole method
  - **Primary**: Send user input to OpenAI with system prompt: "Is this text indicating self-harm, suicide ideation, or immediate danger? Return JSON only: { \"isCrisis\": boolean, \"confidence\": 0-1, \"category\": \"self-harm|abuse|other|none\" }"
  - **Fallback Keywords**: "suicide", "kill myself", "end it all", "not worth living", "hurt myself", etc.
  - **Important**: Run crisis detection on the backend (not the client) to prevent bypassing
  - **Response Parsing**:
    - Parse JSON response deterministically
    - Show crisis resources if: `isCrisis: true` AND `confidence > 0.7`
    - **OR** if `category == "self-harm"` regardless of confidence (fail safe for self-harm)
    - **Fail Closed (UI only)**: If parsing fails OR model returns invalid JSON → treat as `isCrisis=true` and show crisis resources in the UI (better to show resources unnecessarily than miss a real crisis)
    - **Important**: Fail-closed applies to showing crisis resources in the UI. Do NOT auto-flag content or notify admin unless classification parsing succeeds (or clear keyword match). This prevents false admin alerts when OpenAI returns malformed JSON.
  - Action: Immediately display crisis resources if detected
- **Crisis Resources Display**:
  - 988 Suicide & Crisis Lifeline: 988
  - Crisis Text Line: Text HOME to 741741
  - SAMHSA National Helpline: 1-800-662-4357
  - Encourage user to seek professional help immediately
- **Escalation**: Prayer wall posts with self-harm content flagged and emailed to admin immediately

### AI Content Boundaries
- **Medical Disclaimer**: "This is not professional medical, psychological, or psychiatric advice. If you are experiencing a mental health crisis, please contact a licensed professional or crisis hotline."
- **Theological Boundaries**:
  - Never claim divine authority or revelation
  - Avoid "God told me" or deterministic theological claims
  - No denominational bias
  - Always phrase as encouragement, not authoritative interpretation
  - Use language like "Scripture encourages us..." not "God is telling you..."
- **Never Provide**:
  - Medical or psychological diagnoses
  - Prescription or treatment recommendations
  - Definitive life decisions ("You should break up", "You should quit your job")
  - Financial advice
  - Legal advice

### AI-Generated Content Guidelines
- **Tone**: Always encouraging, hopeful, compassionate, never preachy or judgmental
- **Personalization**: Use user's context sensitively without making assumptions
- **Respect**: Honor user's emotional state, never minimize or dismiss feelings
- **Boundaries**: If user's request is inappropriate or beyond AI capabilities, gracefully decline and suggest alternatives (e.g., "I'm here to provide spiritual encouragement. For medical concerns, please consult a healthcare professional.")
- **Accuracy**: Scripture references must be accurate and properly attributed
- **Cultural Sensitivity**: Respect diverse Christian traditions and cultural contexts

### Content Moderation
- **AI Auto-Moderation** (Prayer Wall):
  - Flag: Profanity, hate speech, abuse, spam, self-harm content, inappropriate sexual content
  - Do NOT auto-delete - send to admin review queue
  - Email admin immediately for flagged posts
- **User Reporting**: Allow users to report concerning content
- **Admin Oversight**: Human (admin) final decision on content removal

### Data Privacy & Safety
- **User Data**: Never share user's personal information, mood data, or journal entries with third parties
- **AI Training**: Do not use user data to train AI models (per OpenAI API terms)
- **Encryption**: Encrypt sensitive private content at the application layer before writing to database (not only disk-level encryption)
  - **Journal Entries**: Always encrypted (private content)
  - **Prayer Wall Posts**: NOT encrypted (public by design for community sharing)
  - **Mood Selections**: NOT encrypted (analytics data, user_id can be NULL for logged-out users)
  - **Key Management**: Encryption keys stored in env/secret manager; rotate keys periodically; never commit keys to repository
  - **Important**: Encrypt/decrypt only on backend; frontend never sees encryption keys
- **Anonymization**: Mood tracking analytics should be anonymized

### Disclaimers (Required on Site)
- **Homepage Footer**:
  - "Worship Room provides spiritual encouragement and support. It is not a substitute for professional medical, psychological, or psychiatric care. If you are in crisis, please call 988 (Suicide & Crisis Lifeline) or contact a licensed mental health professional."
- **AI-Generated Content**:
  - Small disclaimer below AI-generated prayers/reflections: "AI-generated content for encouragement. Not professional advice."

### Data Retention & Deletion
- **Account Deletion**: User can delete their account via profile settings
  - **Journal Entries**: Hard deleted (permanently removed from database)
  - **Mood Selections**: Hard deleted OR anonymized (user_id set to NULL, description cleared if present)
  - **Prayer Wall Posts**: Soft deleted with precise definition:
    - `is_deleted = true`
    - `content` replaced with `"[deleted]"` or empty string
    - `title` replaced with `"[deleted]"`
    - `user_id` set to NULL
    - Timestamps retained (`created_at`, `updated_at`)
    - Post remains in database for audit/moderation history but content is unrecoverable
  - **Audit Logs**: Retained indefinitely (does not contain journal content, only admin actions)
- **Backups**: Database backups retained for 30 days, then purged
- **Data Export**: User can export their data (journal entries, mood history) before deletion (future feature)

---

## API Contract

### REST API Conventions
- **Base Path**: `/api`
- **Authentication**: `Authorization: Bearer <JWT_token>` header for protected endpoints
- **Content Type**: `application/json` for request/response bodies
- **Response Headers**:
  - `X-Request-Id`: Unique identifier for every request/response (for tracking and debugging)
  - **Rate Limiting Headers** (on all responses):
    - `X-RateLimit-Limit`: Maximum requests allowed in window (e.g., "20")
    - `X-RateLimit-Remaining`: Requests remaining in current window (e.g., "15")
    - `X-RateLimit-Reset`: Unix timestamp when limit resets (e.g., "1708095600")
  - **On 429 Too Many Requests**:
    - `Retry-After`: Seconds until user can retry (e.g., "3600" for 1 hour)
- **Standard Error Response Shape**:
  ```json
  {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "unique-request-id-for-tracking",
    "timestamp": "2026-02-16T10:30:00Z"
  }
  ```
- **Standard Success Response Shape**:
  ```json
  {
    "data": { ... },
    "meta": {
      "requestId": "unique-request-id"
    }
  }
  ```
- **Pagination** (when needed):
  - Query params: `?page=1&limit=20`
  - Response includes: `{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100 } }`
- **HTTP Status Codes**:
  - `200 OK` - Success
  - `201 Created` - Resource created
  - `400 Bad Request` - Invalid input
  - `401 Unauthorized` - Missing/invalid auth token
  - `403 Forbidden` - Insufficient permissions
  - `404 Not Found` - Resource not found
  - `429 Too Many Requests` - Rate limit exceeded
  - `500 Internal Server Error` - Server error

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

## Database Schema

### users
```sql
id (UUID, primary key)
email (VARCHAR, unique, not null)
password_hash (VARCHAR, not null)
name (VARCHAR)
is_admin (BOOLEAN, default false)
is_banned (BOOLEAN, default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
last_login_at (TIMESTAMP)
```

### scriptures
```sql
id (UUID, primary key)
reference (VARCHAR, e.g., "John 3:16", "Psalm 23:1-4")
text (TEXT, the verse content)
translation (VARCHAR, not null) -- Translation TBD; must be legally usable (WEB, KJV, or licensed)
themes (JSONB, e.g., ["hope", "peace", "comfort"])
mood_tags (JSONB, e.g., ["terrible", "bad", "neutral"])
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### mood_selections
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, nullable for future anonymous tracking only - MVP: no logged-out persistence)
mood (ENUM: terrible, bad, neutral, good, excellent, nullable if text input used)
description (TEXT, for free-form text input)
scripture_id (UUID, foreign key → scriptures.id)
timestamp (TIMESTAMP)
created_at (TIMESTAMP)
```

**Logged-Out Mood Tracking Policy**:
- **MVP**: Do NOT persist mood selections for logged-out users (privacy-first approach)
  - Mood selection only stored in session memory/React state
  - No database write if `user_id` is NULL
  - User sees scripture but no history tracking
- **Future Enhancement**: If anonymous tracking is added later:
  - Use cookie-based anonymous ID (not IP address)
  - Retention window: 7 days maximum
  - Clear privacy disclosure
  - Allow opt-out

### journal_entries
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, not null)
mood (ENUM: terrible, bad, neutral, good, excellent, nullable)
content (TEXT, encrypted, not null)
ai_prompt_used (TEXT, nullable - the AI prompt that was shown)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### prayer_wall_posts
```sql
id (UUID, primary key)
user_id (UUID, foreign key → users.id, not null)
title (VARCHAR, not null)
content (TEXT, not null)
is_flagged (BOOLEAN, default false)
flagged_reason (TEXT, nullable - AI moderation reason)
is_deleted (BOOLEAN, default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### prayer_wall_reports
```sql
id (UUID, primary key)
post_id (UUID, foreign key → prayer_wall_posts.id)
reporter_user_id (UUID, foreign key → users.id, nullable)
reason (TEXT)
created_at (TIMESTAMP)
```

### guided_meditations
```sql
id (UUID, primary key)
title (VARCHAR, not null)
topic (VARCHAR, e.g., "Peace & Calm", "Anxiety Relief")
content (TEXT, not null - the meditation text)
duration_minutes (INTEGER, estimated reading time)
order_index (INTEGER, for display ordering)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### daily_content
```sql
id (UUID, primary key)
date (DATE, unique, not null)
verse_id (UUID, foreign key → scriptures.id)
song_title (VARCHAR)
song_artist (VARCHAR)
song_spotify_url (VARCHAR)
created_at (TIMESTAMP)
```

### admin_audit_log
```sql
id (UUID, primary key)
admin_user_id (UUID, foreign key → users.id)
action (VARCHAR, e.g., "deleted_post", "banned_user", "edited_post")
target_type (VARCHAR, e.g., "prayer_wall_post", "user")
target_id (UUID)
details (JSONB, additional context)
created_at (TIMESTAMP)
```

### Database Indexes & Constraints

**Performance-Critical Indexes**:
```sql
-- Mood tracking (dashboard, insights page)
CREATE INDEX idx_mood_selections_user_timestamp ON mood_selections(user_id, timestamp DESC);

-- Journal entries (my entries page)
CREATE INDEX idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);

-- Prayer wall (moderation, flagged posts)
CREATE INDEX idx_prayer_wall_flagged ON prayer_wall_posts(is_flagged, created_at DESC);
CREATE INDEX idx_prayer_wall_user ON prayer_wall_posts(user_id, created_at DESC);

-- Admin audit logs
CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_log_target ON admin_audit_log(target_type, target_id);
```

**Unique Constraints**:
```sql
-- Only one verse/song per day
ALTER TABLE daily_content ADD CONSTRAINT unique_daily_date UNIQUE (date);

-- Unique emails
ALTER TABLE users ADD CONSTRAINT unique_user_email UNIQUE (email);
```

**Future Considerations** (non-goals for MVP):
- Full-text search on prayer wall posts (PostgreSQL `tsvector` or external search engine)
- Composite indexes for complex queries as usage patterns emerge

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
- **Primary Blue**: `#4A90E2` (soft, calming blue)
- **Secondary Blue**: `#5BA3F5` (lighter accent)
- **Neutral Background**: `#F5F5F5` (warm off-white)
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue)
- **Text Light**: `#7F8C8D` (medium gray)
- **Success**: `#27AE60` (green for positive moods)
- **Warning**: `#F39C12` (orange for neutral moods)
- **Error**: `#E74C3C` (red for negative moods/flags)

### Typography
- **Body Font**: Inter or Open Sans (sans-serif)
  - Regular: 400
  - Medium: 500
  - Bold: 700
- **Scripture Font**: Lora or Merriweather (serif)
  - Regular: 400
  - Italic: 400 italic
  - Bold: 700
- **Font Sizes**:
  - Hero: 3rem (mobile: 2rem)
  - H1: 2.5rem (mobile: 1.75rem)
  - H2: 2rem (mobile: 1.5rem)
  - H3: 1.5rem (mobile: 1.25rem)
  - Body: 1rem
  - Small: 0.875rem

### Responsive Breakpoints (TailwindCSS defaults)
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

### Responsive Design Requirements
- **Mobile-first approach**: Design for mobile, enhance for larger screens
- **Touch-friendly**: Minimum 44px tap targets on mobile
- **Readable text**: Minimum 16px body font on mobile
- **Optimized layouts**:
  - Mobile: Single column, stacked navigation
  - Tablet: Two columns where appropriate, side navigation
  - Desktop: Multi-column layouts, expanded navigation
- **Responsive images**: Use `srcset` and `sizes` for optimal loading
- **Fluid typography**: Scale font sizes smoothly between breakpoints

### Component Patterns
- **Mood Selector Buttons**: Large, clear buttons with subtle icons (emoji or Lucide icons)
- **Scripture Display**: Centered text, large serif font, gentle fade-in animation (CSS transition)
- **Cards**: Soft shadows, rounded corners (8px border-radius)
- **Forms**: Clear labels, inline validation, accessible error messages
- **Navigation**: Clean, minimal, sticky header
- **Crisis Alert**: Prominent, accessible alert banner with hotline numbers (red/orange, high contrast)

---

## Development Workflow

### Git Workflow
1. Create feature branch from main (`git checkout -b feature/feature-name`)
2. Work on feature branch
3. Commit changes when ready
4. Push to remote (`git push -u origin feature/feature-name`)
5. Create pull request on GitHub
6. Squash merge into main after review

### Commit Guidelines
- **Ask before commits** UNLESS the work represents a clear, self-contained completion point:
  - ✅ Initial setup (like this initial commit)
  - ✅ Fully implemented feature (e.g., "Complete mood selector with 5 buttons and text input")
  - ✅ Completed bug fix (e.g., "Fix scripture fade-in animation timing")
  - ✅ Agreed refactor (e.g., "Refactor API client to use Axios interceptors")
  - ❌ Partial work (e.g., "WIP: Started mood selector")
  - ❌ Exploratory changes (e.g., "Trying different animation approach")
- Use descriptive commit messages that explain "why" not just "what"
- Follow conventional commit format when possible:
  - `feat:` - New feature
  - `fix:` - Bug fix
  - `docs:` - Documentation changes
  - `style:` - Code style changes (formatting, no logic change)
  - `refactor:` - Code refactoring
  - `test:` - Adding or updating tests
  - `chore:` - Build process, dependencies, etc.

### Testing
- **Run tests automatically** after code changes
- Write tests for new features
- Ensure tests pass before commits
- **Frontend**: Vitest + React Testing Library
  - Unit tests for utilities and hooks
  - Component tests for UI components
  - Integration tests for page flows
- **Backend**: JUnit 5 + Spring Boot Test + Testcontainers
  - Unit tests for services
  - Integration tests for controllers
  - Repository tests with Testcontainers PostgreSQL
  - AI safety tests (self-harm detection, content moderation)

### Code Organization
```
worship-room/
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── api/      # API client layer
│   │   ├── components/ # Reusable components
│   │   │   └── ui/   # Base UI primitives
│   │   ├── lib/      # Utilities
│   │   ├── pages/    # Route pages
│   │   ├── hooks/    # Custom React hooks
│   │   ├── types/    # TypeScript types
│   │   ├── constants/ # Crisis resources, AI prompts, etc.
│   │   └── ...
│   └── ...
├── backend/          # Spring Boot API
│   └── src/main/java/com/example/worshiproom/
│       ├── config/   # Configuration classes
│       ├── controller/ # REST controllers
│       ├── service/  # Business logic
│       ├── repository/ # Data access (JPA)
│       ├── model/    # Entities/DTOs
│       ├── security/ # Auth/JWT logic
│       ├── ai/       # AI safety, moderation logic
│       └── ...
└── ...
```

---

## Coding Standards

### General Principles
- Write clean, readable code
- Prefer functional React components
- Use TypeScript types for everything
- Keep components focused and single-purpose
- Follow SOLID principles
- Write self-documenting code (clear names, simple logic)
- **Security-first**: Validate all inputs, sanitize outputs, check AI responses

### Frontend
- Use `@/` path aliases for imports
- Export components from `components/index.ts`
- Use `cn()` utility for conditional classNames
- Validate forms with Zod schemas
- Use React Query for data fetching
- Prefer composition over prop drilling
- Extract complex logic into custom hooks
- Use TypeScript interfaces for props
- Avoid inline styles (use TailwindCSS classes)

### Backend
- Follow standard Spring Boot patterns
- Use service layer for business logic
- Use DTOs for API requests/responses
- Validate inputs with Spring Validation (`@Valid`, `@NotNull`, etc.)
- Keep controllers thin (delegate to services)
- Use constructor injection for dependencies
- Follow RESTful conventions for endpoints
- Use meaningful HTTP status codes
- **AI Safety**: Always check AI inputs/outputs for safety violations

### Naming Conventions
- **Components**: PascalCase (e.g., `MoodSelector.tsx`)
- **Files**: Match component name (e.g., `MoodSelector.tsx`)
- **Variables/functions**: camelCase (e.g., `getUserMoods()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_JOURNAL_LENGTH`, `CRISIS_HOTLINE`)
- **Interfaces/Types**: PascalCase (e.g., `UserMood`, `ScriptureDTO`)
- **CSS classes**: kebab-case (via TailwindCSS utilities)

---

## Rate Limiting & Security

### Rate Limiting
- **Backend**: Per-user rate limiting on AI endpoints to prevent abuse and control costs
  - **AI Requests**: 20 requests per hour per user (scripture matching, prayers, reflections, prompts) - configurable via environment variables (dev vs prod)
  - **Prayer Wall Posts**: 5 posts per day per user - configurable via environment variables
  - **Implementation**: Spring Security + Redis (production) or in-memory cache (local dev only)
  - **Important**: Local dev can use in-memory; production must use Redis (multi-instance safe)
  - **Configuration**: Rate limits are environment-specific (`.env` or platform env vars), not hardcoded
- **Global**: IP-based rate limiting to prevent DDoS
  - **API Endpoints**: 100 requests per minute per IP
  - **Implementation**: Nginx or Spring Security

### API Key Security & Environment Variables
- **Never commit API keys to repository**
- Use environment variables (`.env` for local, platform env vars for production)
- Rotate keys periodically
- Monitor OpenAI API usage to detect anomalies

### JWT Storage & Security
- **JWT Storage for MVP**: In-memory JWT (React state/context)
  - **MVP Implementation**: Store token in React state/context, lost on page refresh (user must re-login)
  - **Benefits**: Simpler implementation, no CSRF concerns, better XSS protection than localStorage
  - **Trade-off**: User logs out on page refresh (acceptable for MVP)
  - **Future Enhancement**: Migrate to httpOnly cookie + CSRF protection for persistent sessions
- **CSRF Protection**: Not needed for in-memory JWT; required if migrating to cookie-based JWT
- **Token Expiration**: Short-lived tokens (1 hour), refresh token mechanism (future enhancement)

### Password Policy (MVP)
- **Minimum Length**: 12 characters (strong length requirement for sensitive content)
- **Requirements**: No complexity rules (length is more important than uppercase/number requirements)
- **Rate Limiting**: Login attempts rate-limited to prevent brute force
  - **Per email**: 5 attempts per 15 minutes
  - **Per IP**: 20 attempts per 15 minutes (uses hashed IP with short TTL)
  - **Lockout behavior**: When rate limit hit, return `429 Too Many Requests` with `Retry-After` header (do not reveal whether email exists)
- **Auth Failures**: Invalid credentials return `401 Unauthorized` with generic message (same for unknown email vs wrong password: "Invalid email or password")
  - **Timing leak prevention**: Perform password hash verification even for unknown emails (dummy hash comparison) to equalize response timing (more robust than fixed delay)
- **Registration (MVP)**: Do not expose email existence via `/register` endpoint
  - **Guarantee**: Response body, status code, and response time must be indistinguishable for existing vs new emails
  - **New email**: Create account, return `200 OK` with message "Registration successful"
  - **Existing email**: No-op (do not create duplicate), return same `200 OK` with same message (prevents enumeration)
  - **Rationale**: Generic message works for both cases without lying (more honest than "Account created" for existing emails)
  - **Email sending**: Do not send different emails (or any email) based solely on account existence (prevents inbox-based enumeration)
  - **Future Enhancement**: Add email verification flow (send confirmation link before account activation)
- **Validation**: Frontend validation (React Hook Form + Zod) + backend validation (Spring Validation)
- **Storage**: BCrypt hashing with salt (Spring Security default)
- **Future Enhancement**: Password strength meter, common password blacklist, 2FA

### CORS Policy
- **Allowed Origins**:
  - **Local Development**: `http://localhost:5173` (Vite dev server)
  - **Production**: `https://worshiproom.com` (or actual production domain)
- **Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization, X-Request-Id`
- **Credentials**: `true` (if using cookies for auth)
- **Implementation**: Spring Boot `@CrossOrigin` or global CORS configuration

**Standard Environment Variable Naming**:
```bash
# AI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
JWT_EXPIRATION=3600

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
ADMIN_EMAIL=admin@example.com

# Maps
GOOGLE_MAPS_API_KEY=...

# Encryption
ENCRYPTION_KEY=...
ENCRYPTION_SALT=...

# Rate Limiting
RATE_LIMIT_AI_REQUESTS_PER_HOUR=20
RATE_LIMIT_PRAYER_POSTS_PER_DAY=5

# Environment
NODE_ENV=development|production
SPRING_PROFILES_ACTIVE=dev|prod
```

### Input Validation & Sanitization
- **All User Inputs**: Validate length, format, content
- **Scripture References**: Validate format (e.g., "John 3:16")
- **Prayer Wall Posts & Journal Entries**:
  - **Content Policy**: Store as plain text only (NO HTML, NO Markdown in MVP)
  - **Rendering**: Display as plain text with line breaks preserved (`white-space: pre-wrap`)
  - **XSS Prevention**:
    - Backend: Defensively strip/remove all `<...>` tags on input (belt-and-suspenders approach)
    - Frontend: Treat all content as text - React escapes by default, NEVER use `dangerouslySetInnerHTML`
    - Hard rule: No HTML rendering for user-generated content
  - **Future Enhancement**: Consider Markdown support with safe renderer (sanitized, no inline HTML/JS)
- **AI-Generated Content** (prayers, reflections, prompts, insights):
  - **Rendering Policy**: Same as user content - plain text only, no HTML/Markdown
  - **XSS Prevention**: AI output is untrusted input - escape on render, never use `dangerouslySetInnerHTML`
  - **Length Limits**: Enforce max length (e.g., prayers: 1000 chars, reflections: 500 chars)
  - **Content Moderation**: AI output is pre-moderated by OpenAI, but implement profanity filter as additional safety layer
- **Journal Entries**: Encrypt at rest (in addition to plain text policy)
- **AI Prompts**: Check for injection attacks

---

## Logging & Monitoring

### Structured Logging
- **Format**: JSON logs for easy parsing (Logback configuration)
- **Levels**: INFO, WARN, ERROR
- **Include**:
  - Timestamp
  - User ID (if applicable)
  - Request ID (for tracing)
  - Action (e.g., "mood_selected", "prayer_generated")
  - Metadata (mood, scripture ID, etc.)
- **PII Handling**: Never log PII in application logs (emails, names, passwords, journal content, prayer text)
  - **Safe to log**: User IDs, timestamps, actions, mood values, scripture IDs, error codes
  - **Never log in app logs**: User input text (journals, prayers), email addresses, raw IP addresses
  - **IP addresses**: May be used transiently in-memory for rate limiting, never stored/logged
    - **Hashed IPs for rate limiting**: Stored only in Redis/in-memory rate-limit cache with short TTL (15 minutes), never in app logs, never in database
  - **Admin audit trail**: Emails stored only in database `admin_audit_log` table (never in application logs)

### Error Tracking
- **Platform**: Sentry or Rollbar
- **Track**:
  - Application errors (500s)
  - AI API failures
  - Database errors
  - Authentication failures
- **Alerts**: Email admin on critical errors

### Audit Logs
- **Admin Actions**: Log all admin moderation actions to `admin_audit_log` table
  - Who did what, when, and to whom
  - Action: deleted_post, banned_user, edited_post
- **Retention**: Keep audit logs indefinitely for accountability

### Analytics
- **User Behavior**: Track key metrics (optional: PostHog, Mixpanel, or custom)
  - Mood selections per day
  - Scripture views
  - Prayer wall posts
  - Journal entries
- **Performance**: Monitor page load times, API response times
- **AI Usage**: Track OpenAI API calls, costs, response times

---

## Claude's Behavior Guidelines

### Autonomy Level
- **Be autonomous**: Implement features and fixes without asking for permission when the goal is clear
- **Ask clarifying questions**: When requirements are unclear or ambiguous
- **Confirm understanding**: If a prompt doesn't make sense, ask before proceeding
- **Suggest alternatives**: When you see better approaches or potential issues
- **Proactive**: Point out potential issues, security concerns, or UX improvements
- **AI Safety First**: Always prioritize user safety and ethical AI use

### Communication Style
- **Regular/conversational**: No need to be overly formal
- **Clear and concise**: Explain what you're doing and why
- **Context-aware**: Reference previous decisions and patterns in the codebase
- **Empathetic**: Remember this app serves people in emotional distress

### What to Ask About
- Unclear feature requirements
- Ambiguous prompts
- Design decisions that significantly impact UX/architecture
- Breaking changes
- When multiple valid approaches exist
- Security implications
- Performance trade-offs
- **AI safety edge cases**

### What NOT to Ask About
- Standard code organization (follow this guide)
- Common patterns and best practices (use industry standards)
- Bug fixes and improvements (just fix them)
- Refactoring for clarity (go ahead)
- Adding tests (always do it)
- Small UX decisions (use good judgment)

---

## Project Context

### Target Users
- **Primary**: Christians seeking emotional support and spiritual growth
- **Secondary**: Anyone looking for peace and encouragement
- **Accessibility**: Designed to be welcoming and easy to use for all ages
- **Tech-savviness**: Assume varying levels (make UX simple and intuitive)
- **Emotional State**: May be in distress, anxious, grieving, or struggling

### Tone & Design Philosophy
- **Safe and peaceful**: Create a calming, non-judgmental space
- **Encouraging**: Focus on hope and healing
- **Accessible**: Simple, intuitive interface
- **Authentic**: Genuine spiritual support, not superficial
- **Personal**: Make users feel seen and understood
- **Hopeful**: Always point toward growth and healing
- **Responsible**: Prioritize safety, never replace professional help

### Content Sensitivity
- Handle emotional/spiritual content with care
- Respect diverse Christian traditions (avoid denominational bias)
- Maintain appropriate tone for mental health topics
- Never dismiss or minimize user's emotional state
- Prayer wall requires moderation for safety
- AI-generated content should be encouraging, never preachy
- **Always provide crisis resources when needed**

---

## Implementation Details

### Spotify Integration
- **Playlist ID**: `5Ux99VLE8cG7W656CjR2si`
- **Playlist URL**: `https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si`
- **Implementation** (MVP - no Spotify Web API needed):
  - Embed player on `/music` page (Spotify iframe embed)
  - "Open in Spotify" button (deep link to Spotify app/web player)
  - Also embed player on `/scripture` page below scripture display (contextual music)
- **Future Enhancement** (if needed): Spotify Web API for user OAuth, personalized playback control, or playlist management

### Scripture Seeding
- **Total**: 100 scriptures
- **Per Mood**: 20 scriptures each (Terrible, Bad, Neutral, Good, Excellent)
- **Translation**: TBD - must be legally usable (public domain like KJV, WEB, or properly licensed like ESV/NIV with commercial license)
  - **Important**: NIV and ESV have licensing restrictions for commercial use - verify licensing before using
  - **Recommended**: Start with public domain (KJV, WEB, ASV) or use Bible API with proper attribution
- **AI Tagging**: Use OpenAI API once to tag each scripture with:
  - Mood mappings (which moods it applies to)
  - Themes (e.g., "hope", "peace", "comfort", "strength", "joy")
- **Source**: Manually curate or use Bible API (API.Bible, ESV API, Bible Gateway API)

### Guided Meditation Topics (20 at Launch)

**Emotional Healing (9 topics)**
1. Peace & Calm
2. Anxiety Relief
3. Grief & Loss
4. Loneliness & Isolation
5. Fear & Worry
6. Anger & Frustration
7. Depression & Sadness
8. Stress Relief
9. Overwhelm & Burnout

**Spiritual Growth (7 topics)**
10. Gratitude & Thankfulness
11. Forgiveness (Self & Others)
12. Hope & Encouragement
13. Faith Building
14. Trust & Surrender
15. Patience & Waiting
16. Joy & Contentment

**Daily Rhythms (4 topics)**
17. Morning Devotion
18. Evening Reflection
19. Better Sleep / Bedtime Peace
20. Midday Reset

### Admin Configuration
- **Admin User**: Seed database with admin user using email from `ADMIN_EMAIL` env var, set `is_admin = true`
- **Admin Access**: Backend checks `user.is_admin` boolean (NOT hardcoded email)
- **Email Notifications**: Send flagged prayer posts to admin email from `ADMIN_EMAIL` env var via SMTP
- **Moderation**: Simple CRUD interface at `/admin/prayer-wall`
- **Audit Logging**: All admin actions logged to `admin_audit_log` table

### AI Integration (OpenAI)
- **Model**: Default `gpt-4o` (configurable via `OPENAI_MODEL` env var; alternative: `gpt-4o-mini` for cost savings)
- **Use Cases**:
  - Scripture matching from text input
  - Scripture reflection generation (2-3 sentences)
  - Prayer generation
  - Journaling prompts
  - Mood insights and trends
  - Prayer wall auto-moderation (profanity, abuse, spam detection)
  - **Self-harm detection** (crisis intervention)
- **API Key**: Store in environment variables (`.env` for local, platform env vars for production)
- **Rate Limiting**: 20 AI requests per hour per user (backend enforcement)
- **Safety**: Always check inputs for crisis keywords, inappropriate content

### Google Maps Integration
- **API**: Google Maps Places API
- **Use Cases**:
  - Church locator at `/churches`
  - Christian counselor locator at `/counselors`
- **Implementation**: Real-time search (no database caching)
- **API Key**: Store in environment variables

### Crisis Resources (Hardcoded Constants)
```typescript
// frontend/src/constants/crisis-resources.ts
export const CRISIS_RESOURCES = {
  suicide_prevention: {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    link: "https://988lifeline.org",
  },
  crisis_text: {
    name: "Crisis Text Line",
    text: "Text HOME to 741741",
    link: "https://www.crisistextline.org",
  },
  samhsa: {
    name: "SAMHSA National Helpline",
    phone: "1-800-662-4357",
    link: "https://www.samhsa.gov/find-help/national-helpline",
  },
};

export const SELF_HARM_KEYWORDS = [
  "suicide", "kill myself", "end it all", "not worth living",
  "hurt myself", "end my life", "want to die", "better off dead",
  // Add more as needed
];
```

---

## Development Commands

### Frontend
```bash
cd frontend
pnpm install      # Install dependencies
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Build for production
pnpm lint         # Lint code
pnpm format       # Format with Prettier
pnpm test         # Run Vitest tests
pnpm test:watch   # Run tests in watch mode
```

### Backend
```bash
cd backend
./mvnw spring-boot:run  # Start dev server (http://localhost:8080)
./mvnw test             # Run tests
./mvnw clean package    # Build JAR
```

### Docker
```bash
docker-compose up --build  # Start both services + PostgreSQL
docker-compose down        # Stop services
docker-compose logs -f     # View logs
```

### Just (Task Runner)
```bash
just install         # Install frontend dependencies
just dev-frontend    # Start frontend
just dev-backend     # Start backend
just build           # Build both projects
just test            # Run all tests
```

---

## Current Status

### ✅ Completed
- Project scaffolding (frontend + backend)
- Development environment setup
- TailwindCSS configuration
- React Query setup
- Form validation (React Hook Form + Zod)
- Basic UI components (Button, Card, Layout)
- API client structure
- Docker configuration
- Git repository initialized and pushed to GitHub
- Complete project planning and feature definition
- AI safety guidelines defined

### 🚧 In Progress
- Phase 1: Foundation (starting next)

### 📋 TODO (In Order)
1. **Phase 1**: Auth, Router, Landing Page, Dashboard, PostgreSQL, Design System
2. **Phase 2**: Mood Selector, Scripture Display, Scripture Database, **AI Safety Implementation**
3. **Phase 3**: Journaling, Spotify Integration
4. **Phase 4**: AI-Powered Features (prayers, text matching) with safety guardrails
5. **Phase 5**: Prayer Wall, Moderation, Crisis Detection
6. **Phase 6**: Church/Counselor Locators
7. **Phase 7**: Guided Meditations, Verse/Song of the Day
8. **Phase 8**: Mood Tracking, Insights, Personalization
9. **Phase 9**: Polish, Security Audit, Performance, Deployment

---

## Build Approach

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

### Testing Strategy
- Write tests alongside feature development
- Aim for 80%+ code coverage
- Focus on critical paths (auth, data saving, AI integrations, **AI safety**)
- Use Testcontainers for realistic database tests
- Manual testing for UX flows
- **AI Safety Testing**:
  - Test self-harm keyword detection
  - Test crisis resource display
  - Test AI content moderation
  - Test inappropriate input handling

### Deployment Strategy
- Deploy frontend to Vercel when MVP features are ready
- Deploy backend to Railway, Render, or Fly.io
- Deploy database to Railway PostgreSQL, Supabase, or Neon
- Use preview deployments for feature branches
- Set up CI/CD with GitHub Actions
- Environment variables for API keys (never commit keys)
- Monitor performance with Vercel Analytics (frontend), Spring Boot Actuator (backend)
- Error tracking with Sentry or Rollbar

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
