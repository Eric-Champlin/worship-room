---
paths: ["frontend/**"]
---

## UX Flows

Detailed user experience flows for every major feature. Read this file before implementing or modifying any user-facing flow.

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

**Notification bell** (🔔): Lucide `Bell` icon. Badge count for unread notifications (red circle, white text, top-right). Only shows when count > 0. Click opens dropdown panel (see Notification Flow below).

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

**Implementation:** The Navbar component checks `isAuthenticated` from the auth context and conditionally renders the appropriate button set. The logged-in state applies on ALL pages, not just the dashboard.

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

## Dashboard UX Flow (Logged-In Users) — Phase 2.75

**Full specifications in `dashboard-growth-spec-plan-v2.md`.**

### Route Switching

`/` renders `Dashboard` when `isAuthenticated` is true, `Home` (landing page) when false. Checked via `AuthProvider` context.

### Daily Mood Check-In → Dashboard Transition

1. **Full-screen check-in appears** (once per day, resets at midnight). Dark background, soft radial gradient. "How are you feeling today, [Name]?" in warm serif typography. Five mood buttons: Struggling, Heavy, Okay, Good, Thriving — abstract colored orbs (~56px mobile, ~64px desktop) with labels beneath. Horizontal row desktop, 2-row stacked mobile. Gentle pulse animation. "Not right now" skip link at bottom.

2. **User taps a mood.** Selected orb scales up (1.15x) with glow. Others fade to 30% opacity. Optional textarea slides in: "Want to share what's on your heart?" — 280-char limit. Crisis keyword detection on text input (same pattern as Pray tab).

3. **Encouragement verse** (3 seconds, auto-advance, no Continue button). One fixed verse per mood level (WEB translation):
   - Struggling: Psalm 34:18 — "The Lord is near to the brokenhearted..."
   - Heavy: Psalm 55:22 — "Cast your burden on the Lord..."
   - Okay: Psalm 46:10 — "Be still, and know that I am God."
   - Good: Psalm 107:1 — "Give thanks to the Lord, for he is good..."
   - Thriving: Psalm 118:24 — "This is the day that the Lord has made..."

4. **Dashboard arrives alive.** Streak counter animates (count-up 800ms). New mood dot fades onto 7-day chart. Activity checklist shows mood as completed. Badge celebrations fire after 1.5s delay.

### Skip Behavior

"Not right now" → skip directly to dashboard. No mood recorded. Does NOT re-appear later that day. Activity checklist shows "Log your mood" unchecked as the only gentle reminder.

### Returning Same Day

If mood already logged today, skip check-in and show dashboard directly.

### Dashboard Layout

**Hero section (dark gradient):** Time-of-day greeting + streak (🔥 + count) + level badge + faith points + progress bar.

**Widget grid (frosted glass cards, priority order):**
1. Streak & Faith Points (right column on desktop)
2. 7-day Mood Chart (left column)
3. Today's Activity Checklist with progress ring (left column)
4. Friends & Leaderboard Preview (right column)
5. Quick Actions — Pray, Journal, Meditate, Music (full width)

Desktop: 2-column (60%/40%). Mobile: single column stacked. All cards collapsible.

### Empty States (new users)

- **Mood chart**: Ghosted example + "Your mood journey starts today"
- **Streak**: "🔥 Day 1 — every journey begins with a single step"
- **Badges**: Locked silhouettes + glowing "Welcome to Worship Room" badge (earned on signup)
- **Friends/Leaderboard**: "Faith grows stronger together" + invite CTA + "You vs. Yesterday"
- **Activity checklist**: All 6 unchecked + "A new day, a new opportunity to grow"

---

### Friends & Leaderboard Flow — Phase 2.75

**Route:** `/friends` with two tabs: Friends (default) | Leaderboard (`?tab=friends|leaderboard`).

**Friends tab:** Search bar → invite section (link + email) → pending requests → friend list → "People you may know" from Prayer Wall.

**Leaderboard tab:** Friends (default, weekly + all-time toggle) | Global (weekly only, display names only, resets Monday). Current user highlighted. Dashboard widget shows top 3 + "See all."

### Notification Flow — Phase 2.75

**Bell icon in navbar** → dropdown panel (dark frosted glass, ~360px desktop, full-width mobile). 7 notification types: encouragement, friend_request, milestone, friend_milestone, nudge, weekly_recap, level_up. Each: icon + message + relative timestamp. Unread dot indicator. "Mark all as read" link.

### Settings Flow — Phase 2.75

**Route:** `/settings` (from avatar dropdown). Left sidebar desktop / top tabs mobile. 4 sections: Profile (name, avatar, bio stub), Notifications (per-channel toggles), Privacy (6 controls: global leaderboard visibility, activity status, nudge permissions, streak/level visibility, blocked users), Account (email, password, delete account).

### Social Interactions — Phase 2.75

- **Encouragements:** 4 presets ("🙏 Praying for you", "🌟 Keep going!", "💪 Proud of you", "❤️ Thinking of you"). 3/day/friend limit.
- **Nudges:** 1/week, only for friends inactive 3+ days. Always gentle: "❤️ [Name] is thinking of you." Users can disable in privacy settings.
- **Milestone feed:** "🔥 Sarah hit a 30-day streak!" in dashboard widget.
- **Weekly recap:** Monday card: "Your friend group prayed 23 times... You contributed 34%."

### Streak Reset Messaging Guidelines

**Never punitive.** When streak resets: "Every day is a new beginning. Start fresh today." No mention of how many days were lost. No red/negative colors. The longest streak record persists as encouragement.

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

The Daily Hub is a single-page tabbed experience at `/daily`. Old routes (`/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional`) redirect here with the appropriate `?tab=` query param.

**Tab Structure:**
- 4 tabs: **Devotional** | **Pray** | **Journal** | **Meditate** (query param: `?tab=devotional|pray|journal|meditate`)
- Default tab: `devotional`
- Animated underline slides horizontally across active tab
- Tab content is mounted at all times but hidden (preserves state between switches)
- Sticky tab bar appears below hero on scroll (via Intersection Observer sentinel)

**Hero Section (above tabs):**
- Radial + linear gradient background
- Time-aware greeting: "Good Morning!", "Good Afternoon!", "Good Evening!" (personalized with name if logged in)
- Subtitle: "Start with any practice below."
- Quiz teaser: "Not sure where to start? Take a 30-second quiz..." → scrolls to `#quiz`

**Below Tab Content (always visible):**
1. **SongPickSection** — Today's Song Pick with Spotify 352px iframe embed + "Follow Our Playlist" CTA
2. **StartingPointQuiz** — 5-question quiz with `id="quiz"` scroll target
3. **SiteFooter** — Standard footer with "Listen on Spotify" badge

**Heading Pattern (consistent across all 4 tabs):**
- Devotional: "What's On Your **Soul?**" (Caveat script font)
- Pray: "What's On Your **Heart?**" (Caveat script font)
- Journal: "What's On Your **Mind?**" (Caveat script font)
- Meditate: "What's On Your **Spirit?**" (Caveat script font)

All 4 tabs share: `BackgroundSquiggle` decorative SVG, `max-w-2xl` container width, `SQUIGGLE_MASK_STYLE` fade mask.

**Context Passing:** Pray tab can pass context to Journal tab (e.g., "Continuing from your prayer about anxiety"). Devotional tab can pass context to Journal (theme) and Pray (passage reference) tabs. This auto-selects Guided mode and pre-fills a relevant prompt.

---

### Prayer Generation Flow

1. User lands on `/daily?tab=pray`
2. 3 starter chips: "I'm struggling with...", "Help me forgive...", "I feel lost about..."
3. Textarea: cyan glow pulse, 500 char limit, auto-expanding
4. **Client-side crisis keyword check**: `CrisisBanner` shows crisis resources if detected
5. "Generate Prayer" — auth-gated (logged out → auth modal)
6. Loading state → mock prayer with KaraokeText, Copy/ReadAloud/Save/Share buttons
7. "Journal about this →" CTA (switches to Journal tab with context)
8. Completion tracked: `markPrayComplete()`

---

### Journaling Flow

1. User lands on `/daily?tab=journal`
2. Mode toggle: **Guided** | **Free Write** (persisted to localStorage)
3. Guided: prompt card (Lora italic) with refresh. Free Write: plain textarea
4. Textarea: 5000 char limit, auto-expanding, cyan glow, draft auto-save (1s debounce)
5. Crisis keyword check on input
6. "Save Entry" — auth-gated
7. After saving: entries list, "Write another", "Done journaling" toggle → CTA cards
8. "Reflect on my entry" — auth-gated AI reflection
9. Completion tracked: `markJournalComplete()`

---

### Meditation Flow

1. User lands on `/daily?tab=meditate`
2. 6 meditation cards in 2-column grid (Breathing, Soaking, Gratitude, ACTS, Psalms, Examen)
3. **Auth-gated**: card click when logged out → auth modal
4. Logged in: navigates to meditation sub-page
5. Green checkmark on completed cards
6. All-6-complete celebration banner (golden glow)
7. Completion tracked per type

---

### Auth Gating — Implementation Details

See [02-security.md](02-security.md) for the canonical auth gating list.

**Provider wrapping:** `AuthModalProvider` and `ToastProvider` wrap the Daily Hub and Prayer Wall pages.

**Meditation auth gating is two-layered:** card-click level (auth modal) + route-level redirect on all 6 sub-pages.

---

### Mood Tracking Flow

1. Mood submitted → save to `mood_selections` table (Phase 3) or `wr_mood_entries` localStorage (Phase 2.75)
2. Dashboard: 7-day snapshot + streak counter
3. `/insights`: calendar heatmap, line chart, AI insights, correlations

---

### Prayer Wall Flow

1. Hero section + prayer card feed on neutral background
2. **Logged-out**: read, expand comments, share, anonymous "Praying for you" (session-only)
3. **Logged-out cannot**: post, comment, bookmark (→ auth modal)
4. **Logged-in**: inline composer at top of feed
5. Crisis keyword check on prayer/comment text
6. Inline comments, share (Web Share API + fallback), detail page, public profiles, private dashboard
7. Report dialog, admin moderation at `/admin/prayer-wall`

**Current state**: Frontend with mock data (274 tests). Backend API wiring Phase 3+.

---

### Growth Teasers Section

3 blurred preview cards (Mood Insights, Streaks & Faith Points, Friends & Leaderboard) with lock icons. Dark purple gradient. CTA: "Create a Free Account" → `/register`. These preview the real dashboard features built in Phase 2.75.

---

### Footer

Dark purple (#0D0620). 3 nav columns (Daily, Music, Support) + crisis resources + app download badges (Coming Soon) + "Listen on Spotify" badge + copyright.

---

### Starting Point Quiz Flow

5-question points-based quiz. `id="quiz"` scroll target. Single-select, auto-advance. Points-based scoring → result card with CTA. 100% client-side, no persistence.

---

### Logged-Out Conversion Strategy

**Core principle: "Free to use, meaningful to keep."** Give the output, withhold the history.

**Rules:** Never gate first use. Never nag on first visit. No countdown timers. All prompts dismissible. Show prompts after value delivery only.

**Triggers (Phase 3+):** Blurred mood chart after praying, save prompt after journaling, streak teaser after 2-3 visits, "Week at a Glance" preview on daily page.
