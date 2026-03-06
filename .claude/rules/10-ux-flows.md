---
paths: ["frontend/**"]
---

## UX Flows

Detailed user experience flows for every major feature. Read this file before implementing or modifying any user-facing flow.

---

### Demo Mode & Auth Gating

See [02-security.md](02-security.md) for the canonical Demo Mode Data Policy and Auth Gating Strategy (what requires login, what works without login, implementation pattern).

---

### Mood Selection & Scripture Display Flow

1. User lands on `/scripture` page (redirects to `/daily?tab=pray`)
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

---

### Daily Hub Architecture (`/daily`)

The Daily Hub is a single-page tabbed experience at `/daily`. Old routes (`/pray`, `/journal`, `/meditate`, `/scripture`) redirect here with the appropriate `?tab=` query param.

**Tab Structure:**
- 3 tabs: **Pray** | **Journal** | **Meditate** (query param: `?tab=pray|journal|meditate`)
- Default tab: `pray`
- Animated underline slides horizontally across active tab
- Tab content is mounted at all times but hidden (preserves state between switches)
- Sticky tab bar appears below hero on scroll (via Intersection Observer sentinel)

**Hero Section (above tabs):**
- Radial + linear gradient background
- Time-aware greeting: "Good Morning!", "Good Afternoon!", "Good Evening!" (personalized with name if logged in)
- Subtitle: "Start with any practice below."
- Quiz teaser: "Not sure where to start? Take a 30-second quiz..." → scrolls to `#quiz`

**Below Tab Content (always visible):**
1. **SongPickSection** — Today's Song Pick with Spotify 352px iframe embed + "Follow Our Playlist" CTA ("Join 117K+ other followers!")
2. **StartingPointQuiz** — 5-question points-based quiz with `id="quiz"` scroll target
3. **SiteFooter** — Standard footer with "Listen on Spotify" badge

**Heading Pattern (consistent across all 3 tabs):**
- Pray: "What's On Your **Heart?**" (Caveat script font)
- Journal: "What's On Your **Mind?**" (Caveat script font)
- Meditate: "What's On Your **Spirit?**" (Caveat script font)

All 3 tabs share: `BackgroundSquiggle` decorative SVG, `max-w-2xl` container width, `SQUIGGLE_MASK_STYLE` fade mask.

**Context Passing:** Pray tab can pass context to Journal tab (e.g., "Continuing from your prayer about anxiety"). This auto-selects Guided mode and pre-fills a relevant prompt.

---

### Prayer Generation Flow

1. User lands on `/daily?tab=pray` (or is redirected from `/pray` or `/scripture`)
2. Sees heading "What's On Your Heart?" with squiggle background
3. 3 starter chips appear: "I'm struggling with...", "Help me forgive...", "I feel lost about..."
4. Clicking a chip fills the textarea; chips disappear
5. Textarea has cyan glow pulse animation, 500 char limit, auto-expanding
6. **Client-side crisis keyword check**: `CrisisBanner` component checks input against `SELF_HARM_KEYWORDS`; if detected, shows crisis resources banner and blocks submission
7. User clicks "Generate Prayer"
8. If logged out: Auth modal opens ("Sign in to generate a prayer") — no generation
9. If logged in: Loading state (3 bouncing dots), then mock prayer displays with:
   - `KaraokeText` word-by-word highlighting for Read Aloud
   - Copy, Read Aloud, Save, Share buttons
   - "Journal about this →" CTA (switches to Journal tab with context)
   - "Pray about something else" reset link
10. Completion tracked: `markPrayComplete()` updates localStorage

**Classic Prayers section** exists in code but is hidden behind a `false` guard. Can be re-enabled by removing the guard.

**Phase 3+:** Replace mock prayer generation with real OpenAI API call + backend crisis detection.

---

### Journaling Flow

1. User lands on `/daily?tab=journal` (or is redirected from `/journal`)
2. Sees heading "What's On Your Mind?" with squiggle background
3. Mode toggle: **Guided** | **Free Write** (persisted to localStorage)
4. **Guided mode**: Shows prompt card (Lora italic font, left border accent) with "Try a different prompt" refresh button. If coming from Pray tab, shows context-aware prompt.
5. **Free Write mode**: Plain textarea with optional context banner from Pray tab
6. Textarea: 5000 char limit, auto-expanding, cyan glow pulse
7. **Draft auto-save**: Debounced 1-second save to localStorage; "Draft saved" indicator flashes for 2 seconds
8. **Client-side crisis keyword check**: Same `CrisisBanner` pattern as Pray tab
9. User clicks "Save Entry"
10. If logged out: Auth modal opens ("Sign in to save your journal")
11. If logged in: Entry saved to localStorage entries list (Phase 3+: encrypted database)
12. After saving, shows saved entries list + "Write another" button + "Done journaling" toggle
13. "Done journaling" reveals CTA cards: "Continue to Meditate" + "Visit Prayer Wall"
14. "Reflect on my entry" button triggers AI reflection — auth-gated
15. Completion tracked: `markJournalComplete()` updates localStorage

---

### Meditation Flow

1. User lands on `/daily?tab=meditate` (or is redirected from `/meditate`)
2. Sees heading "What's On Your Spirit?" with squiggle background
3. 6 meditation cards in 2-column grid, each with icon, title, description, time estimate:
   - **Breathing Exercise** (Wind icon) → `/meditate/breathing` — 4-7-8 pattern with scripture phases
   - **Scripture Soaking** (BookOpen icon) → `/meditate/soaking` — Single verse contemplation timer
   - **Gratitude Reflection** (Heart icon) → `/meditate/gratitude` — Gratitude journaling with affirmations
   - **ACTS Prayer Walk** (Footprints icon) → `/meditate/acts` — Adoration, Confession, Thanksgiving, Supplication
   - **Psalm Reading** (Scroll icon) → `/meditate/psalms` — Psalms with historical context
   - **Examen** (Search icon) → `/meditate/examen` — Ignatian daily reflection
4. **Auth-gated**: Clicking any card when logged out opens auth modal ("Sign in to start meditating")
5. When logged in: Clicking a card navigates to the meditation sub-page
6. Green checkmark appears on completed meditation cards (logged-in only)
7. All-6-complete celebration banner: "You completed all 6 meditations today!" (golden glow animation)
8. Completion tracked per meditation type via `completedMeditationTypes` in localStorage

---

### Auth Gating — Implementation Details

See [02-security.md](02-security.md) for the canonical auth gating list. Key implementation details for UX:

**Provider wrapping:** `AuthModalProvider` and `ToastProvider` wrap the Daily Hub and Prayer Wall pages.

**Note:** Meditation auth gating is two-layered: card-click level in `MeditateTabContent` (opens auth modal) + route-level redirect on all 6 sub-pages (logged-out users are redirected to `/daily?tab=meditate` via `<Navigate>`).

---

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

---

### Prayer Wall Flow

1. User navigates to `/prayer-wall` — sees hero section (purple gradient) + prayer card feed on neutral background
2. **Logged-out users** can: read prayers, expand "Show more" text in-place, expand/read inline comments, tap "Praying for you" (session-only, anonymous), share prayers, view public profiles
3. **Logged-out users cannot**: post prayers, post comments, bookmark (these open an auth modal instead of redirecting to `/login`)
4. **Logged-in users** click "Share a Prayer Request" → inline composer slides down at top of feed (no separate `/prayer-wall/new` route)
5. **Client-side crisis keyword check** runs on prayer text and comment text before submission (interim until backend API exists). If detected, a crisis resource banner with hotline numbers is shown and submission is blocked
6. **AI Safety Check** (backend, Phase 3+): Run crisis detection (classifier; keywords fallback). Scan post for self-harm, abuse, spam, profanity
7. If flagged: Email sent to `ADMIN_EMAIL`, post goes to moderation queue
8. **Inline comments**: Expand/collapse per card. Comments show avatar, name, relative time, @mention styling. Logged-out users see "Log in to comment" placeholder
9. **Share**: Desktop dropdown (copy link, email, SMS, Facebook, X); mobile uses Web Share API with fallback
10. **Detail page** (`/prayer-wall/:id`): Full prayer with all comments expanded, owner actions (mark as answered, delete), report link, back navigation
11. **Public profile** (`/prayer-wall/user/:id`): Avatar, name, bio, join date, tabs (Prayers, Replies, Reactions)
12. **Private dashboard** (`/prayer-wall/dashboard`): Requires login (redirects to `/login` if not). Edit name/bio, tabs (My Prayers with mark-as-answered/delete, My Comments, Bookmarks, Reactions, Settings with notification preference placeholders)
13. Users can report posts via report dialog (adds to reports table)
14. Admin can view flagged posts at `/admin/prayer-wall` and edit/delete
15. Admin actions logged to `admin_audit_log`

**Current state**: Frontend fully implemented with mock data (274 tests). Backend API wiring is Phase 3+.

---

### Growth Teasers Section

"See How You're Growing" — 3 blurred preview cards showing logged-out visitors what they unlock with an account. Sits between Journey Section and Starting Point Quiz on landing page.

- Background: gradient from white → dark purple (#0D0620)
- 3 cards: Mood Insights (heatmap), Streaks & Faith Points (counter + badges), Friends & Leaderboard (mini table). All have frosted glass blur overlay + lock icon.
- CTA: "Create a Free Account" → /register

---

### Footer

Dark purple (#0D0620) background. 3 nav columns (Daily, Music, Support) + crisis resources + app download badges (Coming Soon placeholders) + "Listen on Spotify" badge + copyright.

---

### Hero Quiz Teaser

Below the hero input box, a secondary entry point:
- Text: "Not sure where to start? Take a 30-second quiz and we'll help you find your path."
- "Take the quiz" smooth-scrolls to the `#quiz` section further down the page.
- Styling: subtle, secondary text (Text Light color, smaller font).

---

### Starting Point Quiz Flow

"Not Sure Where to Start?" — 5-question points-based quiz. `id="quiz"` for hero teaser scroll target. Sits below Growth Teasers, background transitions from dark purple back to white.

- 5 questions, 4 options each, single-select, auto-advance on selection
- Points-based scoring: each answer adds points to features (Pray, Journal, Meditate, Music, Sleep & Rest, Prayer Wall, Local Support). Highest score wins. Tiebreaker: Pray.
- Result card: headline, description, scripture verse, CTA to recommended page, "Retake Quiz" link
- 100% client-side React state. No backend, no cookies, no persistence.
- Tone: gentle and guided, like a counselor intake.

---

### Logged-Out Conversion Strategy

**Core principle: "Free to use, meaningful to keep."** Give the output, withhold the history. Every feature works fully on first use. Conversion prompts appear only after value delivery.

**Rules:**
- Never gate the first use of any feature
- Never nag on the first visit
- Never use countdown timers or limited tries
- All prompts are dismissible (soft cards, never hard walls)
- Show prompts after value delivery, never before

**Triggers (Phase 3+):**
- After praying: blurred mood chart preview + "Track your journey"
- After journaling: "Sign up to save — your words won't be here when you come back"
- Prayer Wall: gate posting/encouraging, not reading
- After 2-3 visits: streak teaser + Faith Points preview
- After meditation: "Imagine a month of moments like this"
- Daily page: blurred "Your Week at a Glance" preview

**Reusable `ConversionPrompt.tsx` component** (Phase 3+): soft card, dismissible per session, routes to /register.
