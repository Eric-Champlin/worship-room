# Worship Room Frontend - Exhaustive Feature Audit

> **Purpose**: This document provides an extreme-detail inventory of every feature, interaction, state, animation, and UX pattern in the Worship Room frontend. It is intended as the foundation for competitive analysis against Christian wellness/prayer/meditation/worship apps and for UX enhancement recommendations.
>
> **Date**: March 18, 2026
> **Codebase State**: Phase 2.75 (frontend-first, all data mock/localStorage, simulated auth)
> **No backend exists yet** — all data is hardcoded or localStorage-persisted. This is expected.

---

# SECTION 1: Route-by-Route Feature Inventory

## 1.1 `/` — Landing Page (Logged Out) / Dashboard (Logged In)

### Landing Page (Anonymous Users)

**Route**: `/` when `isAuthenticated === false`
**Component**: `Home.tsx`
**Background**: `bg-neutral-bg` (#F5F5F5 warm off-white)
**Clicks from entry**: 0 (this IS the entry point)

#### Hero Section (`HeroSection.tsx`)

**Visual Design**:
- Full-viewport dark purple background (`bg-hero-bg` / #08051A)
- **Video background**: Auto-playing, muted, looping MP4 from CloudFront CDN
  - Max opacity: 40% (blended with dark overlay)
  - Fade-in/out: 500ms at start/end
  - Respects `prefers-reduced-motion` (hidden when reduced motion preferred)
  - Source: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4`
- Top and bottom gradient overlays (hero-bg -> transparent) for text readability

**Content**:
- **Headline**: "How're You Feeling Today?" in gradient text (white -> primary-lt #8B5CF6)
  - Font sizes: 4xl mobile, 5xl tablet, 7xl desktop
  - Font weight: bold
- **Subheading**: "Get AI-powered guidance built on Biblical principles."
  - Text: white/60 opacity, responsive sizing (1rem -> 1.25rem)
- **TypewriterInput**: Glass-styled input field with animated typewriter placeholder
  - Cycles through 3 phrases at 55ms typing speed, 30ms deleting speed
  - Cursor blink animation (1s step animation)
  - `liquid-glass` styling: `rgba(255,255,255,0.01)` bg, 4px backdrop blur, shimmer border gradient
  - Submit arrow button (gradient icon)
  - If logged out and submitted -> auth modal
  - If logged in and submitted -> navigates to `/daily?tab=pray&q={value}`
- **Quiz teaser link**: "Not sure where to start? Take a 30-second quiz"
  - Smooth-scrolls to `#quiz` anchor
  - Underlined, white text, hover opacity change

**Empty states**: N/A (always has content)
**Loading states**: Video loads asynchronously; content is static
**Error states**: Video fails silently (decorative only)
**Mobile responsiveness**: Full-width, responsive text scaling, video scales with object-cover
**Auth gating**: TypewriterInput submit requires auth; everything else public
**Accessibility**: `aria-label` on section, video `aria-hidden`, gradient overlays `aria-hidden`, focus indicators on links/buttons, sr-only label on TypewriterInput
**Micro-interactions**: Video fade-in, typewriter cycling, cursor blink, hover opacity on quiz link
**Persistence**: None (stateless)

#### Journey Section (`JourneySection.tsx`)

**Content**: "Your Journey to **Healing**" heading with "Healing" in Caveat script font with gradient
**6-step vertical timeline** with numbered circles, each linking to a feature:

| Step | Title | Link | Description |
|------|-------|------|-------------|
| 1 | Pray | `/pray` | "Begin with what's on your heart..." |
| 2 | Journal | `/journal` | "Put your thoughts into words..." |
| 3 | Meditate | `/meditate` | "Quiet your mind with guided meditations..." |
| 4 | Music | `/music` | "Let music carry you deeper..." |
| 5 | Prayer Wall | `/prayer-wall` | "You're not alone..." |
| 6 | Local Support | `/local-support/churches` | "Find churches and Christian counselors..." |

**Visual**: Vertical line connecting steps (white/20 border), numbered circles with gradient background (white -> primary-lt), decorative `BackgroundSquiggle` SVG at 30% opacity
**Animation**: Staggered fade-in on scroll via Intersection Observer (120ms delay per step, translate-y-4 -> 0, opacity 0 -> 100)
**Accessibility**: `aria-labelledby="journey-heading"`, `role="list"` on `<ol>`, keyboard-navigable links with focus-ring-2
**Mobile**: Single column, full width, responsive text sizing

#### Growth Teasers Section (`GrowthTeasersSection.tsx`)

**Heading**: "See How You're **Growing**" (Growing in large 5xl-7xl gradient script text)
**3 blurred preview cards** showing locked features:

| Card | Icon | Description | Preview Content |
|------|------|-------------|-----------------|
| Mood Insights | BarChart3 (purple) | "See how God is meeting you over time." | Blurred heatmap + line chart |
| Streaks & Faith Points | Flame (orange) | "Build daily habits and watch your faith grow." | Blurred fire emoji + points + badge |
| Friends & Leaderboard | Users (cyan) | "Grow together and encourage each other." | Blurred leaderboard rows |

**Card styling**: Dark purple bg (#1a1030), border-dark-border, 150px preview area with frosted overlay (`bg-hero-dark/50 backdrop-blur-sm`) and Lock icon
**CTA**: "Create a Free Account" button with gradient background (white -> primary-lt), rounded-full, 44px+ touch targets. Secondary text: "It's free. No catch."
**Animation**: Staggered card fade-in on scroll (120ms per card), hover: translate-y[-4px] + shadow-xl
**Mobile**: Stack to single column below sm breakpoint

#### Starting Point Quiz (`StartingPointQuiz.tsx`)

**Visual**: Frosted glass card (`border-white/15, bg-white/[0.08], backdrop-blur-sm`), background squiggle, gradient progress bar at top
**Anchor**: `id="quiz"` for smooth-scroll targeting from hero

**5 questions with auto-advance (400ms after answer)**:

| Q# | Question | Options (4 each) |
|----|----------|-------------------|
| 1 | What brought you here today? | Hard time / Spiritual growth / Anxious/overwhelmed / All of the above |
| 2 | How are you feeling right now? | Need comfort / Stuck in faith / Okay but want more / Doing well |
| 3 | What sounds most helpful? | Prayer & Scripture / Writing thoughts / Quiet meditation / Music |
| 4 | When do you most need support? | Morning / Stressful moments / Nighttime / All day |
| 5 | What's your experience with faith practices? | Regular / Inconsistent / Used to/stopped / Brand new |

**Scoring**: Points-based system mapping answers to 7 features (pray, journal, meditate, music, sleepRest, prayerWall, localSupport). Each answer awards 1-3 points to 1-2 features. Tie-breaker: feature order priority.

**Result card**: Recommendation title + description + blockquote Bible verse (WEB) + "Go to [Feature]" CTA + "Or explore all features" scroll link + "Retake Quiz" link
**Animation**: Slide left/right transitions (300ms) between questions, progress bar width animation
**Accessibility**: `aria-labelledby="quiz-heading"`, progress bar `role="progressbar"` with `aria-valuenow/min/max`, answer buttons `aria-pressed`, respects `prefers-reduced-motion`
**Back button**: Visible for Q2-Q5, allows revisiting previous questions

**7 possible result destinations**:

| Feature | Route | Verse |
|---------|-------|-------|
| Prayer | /pray | 1 Peter 5:7 |
| Journal | /journal | Psalm 139:23 |
| Meditation | /meditate | Psalm 46:10 |
| Worship Music | /music | Psalm 98:1 |
| Sleep & Rest | /music/sleep | Psalm 4:8 |
| Prayer Wall | /prayer-wall | Galatians 6:2 |
| Local Support | /local-support/churches | Matthew 18:20 |

#### Site Footer (`SiteFooter.tsx`)

**Background**: `bg-hero-dark` (#0D0620)
**Logo**: Script font "Worship Room" (5xl), white, centered

**3-column nav grid**:
- **Daily**: Pray, Journal, Meditate, Daily Hub
- **Music**: Worship Playlists, Ambient Sounds, Sleep & Rest
- **Support**: Prayer Wall, Churches, Counselors, Celebrate Recovery

**App download badges** (visual only, not functional):
- App Store (Apple icon + text)
- Google Play (multi-color icon + text)
- Spotify (`SpotifyBadge` component linking to Worship Room playlist)

**Crisis resources** (text-[13px]):
- 988 Suicide & Crisis Lifeline: 988 (`tel:988` link)
- Crisis Text Line: Text HOME to 741741
- SAMHSA National Helpline: 1-800-662-4357 (`tel:` link)

**Medical disclaimer** (text-[11px]): "Worship Room provides spiritual encouragement and support. It is not a substitute for professional medical, psychological, or psychiatric care..."
**Copyright**: Dynamic year

**Accessibility**: All links have `focus-visible:ring-2`, `tel:` links for emergency numbers, semantic `<nav>`, `<footer>`, `<hr>` dividers
**Mobile**: Single-column flex on mobile, 3-column grid sm+

---

### Dashboard (Authenticated Users)

**Route**: `/` when `isAuthenticated === true`
**Component**: `Dashboard.tsx`
**Background**: Full dark (`bg-[#0f0a1e]`)
**Clicks from landing**: 1 (simulate login via DevAuthToggle)

#### Phase System

The dashboard has 3 rendering phases:

**Phase 1: Mood Check-In** (full-screen takeover on first daily visit)
- Component: `MoodCheckIn` (see detailed breakdown in Section 1.2)
- Appears once per day (resets at midnight local time)
- Skippable via "Not right now" link
- On completion or skip -> Phase 2

**Phase 2: Dashboard Enter** (800ms transition)
- Brief fade-in animation before full dashboard renders
- Auto-advances after 800ms
- Respects `prefers-reduced-motion` (skips directly to Phase 3)

**Phase 3: Full Dashboard**

#### Dashboard Hero (`DashboardHero.tsx`)

**Background**: `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]`
**Content**:
- Time-aware greeting: "Good morning/afternoon/evening, [Name]"
- Streak display: fire emoji (orange-400 if > 0, white/30 if 0) + current streak count + "day(s) streak"
- Level badge: Icon + level name (e.g., "Blooming")
- Faith points: Animated counter (600ms duration) + progress bar to next level
- Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

#### Dashboard Widget Grid (`DashboardWidgetGrid.tsx`)

**Layout**: Mobile = single column stacked; Desktop = 2-column (60%/40%) expanding to 5-column grid on lg
**All cards use frosted glass**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
**Cards are collapsible** with animated height transition (300ms), state persisted to `wr_dashboard_collapsed` localStorage

**Widget 1: 7-Day Mood Chart** (`MoodChart.tsx`)
- Recharts `LineChart` showing last 7 days of mood entries
- Dots colored by mood value (Struggling=amber #D97706, Heavy=copper #C2703E, Okay=gray-purple #8B7FA8, Good=teal #2DD4BF, Thriving=green #34D399)
- Tooltip: date + mood label
- Empty state: Ghosted example chart (15% opacity) + "Your mood journey starts today" + "Check in now" CTA
- Action link: "See More" -> `/insights`

**Widget 2: Streak & Faith Points** (`StreakCard.tsx`)
- Current streak count (large text) + longest streak
- Encouragement message (varies by streak state)
- Total faith points (animated counter) + level name + icon
- Progress bar to next level with percentage text
- Multiplier badge (if > 1x): "1.25x", "1.5x", or "2x bonus today!"
- Recent badges (last 3 earned) as small icon buttons
- "View all badges" link -> expands `BadgeGrid` overlay
- Animation on entry: `motion-safe:animate-streak-bump`

**Widget 3: Activity Checklist** (`ActivityChecklist.tsx`)
- 6 items with checkmark icons:
  - Log your mood (5 pts)
  - Pray (10 pts)
  - Listen to worship (10 pts)
  - Pray for someone (15 pts)
  - Meditate (20 pts)
  - Journal (25 pts)
- SVG progress ring: 60x60px, fills 0-100% as activities complete
- Multiplier preview: "Complete 2 more for 1.25x bonus!"
- Full completion: "Full Worship Day! 2x points earned!" in golden text
- Accessibility: `role="img"` on SVG, `aria-label` with X/6 count

**Widget 4: Friends & Leaderboard Preview** (`FriendsPreview.tsx`)
- Top 3 friends ranked by weekly points + "You" rank if not in top 3
- No-friends state: "Faith grows stronger together" + "Invite a friend" CTA + "You vs. Yesterday" card
- 3-item milestone feed below (friend achievements)
- Action: "See all" -> `/friends?tab=leaderboard`

**Widget 5: Weekly Recap** (`WeeklyRecap.tsx`)
- Summary: "Your friend group prayed 23 times. You contributed 34%."
- Visible on Mondays or if no friends exist

**Widget 6: Quick Actions** (`QuickActions.tsx`)
- 4 buttons: Pray, Journal, Meditate, Music
- Routes to: `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`

#### Celebration System (`CelebrationOverlay.tsx` + `CelebrationQueue.tsx`)
- Fires on badge unlocks and level-ups
- 4 celebration tiers:
  - **toast**: Small notification at bottom-right (6s auto-dismiss)
  - **toast-confetti**: Toast + confetti particles
  - **special-toast**: Golden-styled full-day badge toast
  - **full-screen**: Full-screen overlay with confetti rain (15-30 particles), badge icon, name, encouragement message, optional scripture verse, Continue button (appears after 6s)
- All animations respect `prefers-reduced-motion`
- `role="dialog"`, `aria-modal="true"`, focus trap, auto-focus on Continue button

---

## 1.2 Mood Check-In (Full-Screen Daily Flow)

**Component**: `MoodCheckIn.tsx`
**Trigger**: First visit to dashboard each day (checks `hasCheckedInToday()` against `wr_mood_entries`)

### Phase: Idle (Greeting + Mood Selection)

- **Greeting**: "How are you feeling today, [Name]?" (serif font, 2xl md:3xl)
- **5 mood orbs** in `role="radiogroup"`:

| Mood | Value | Label | Color | Verse | Reference |
|------|-------|-------|-------|-------|-----------|
| Struggling | 1 | Struggling | #D97706 (amber) | "The Lord is near to the brokenhearted..." | Psalm 34:18 |
| Heavy | 2 | Heavy | #C2703E (copper) | "Cast your burden on the Lord..." | Psalm 55:22 |
| Okay | 3 | Okay | #8B7FA8 (gray-purple) | "Be still, and know that I am God." | Psalm 46:10 |
| Good | 4 | Good | #2DD4BF (teal) | "Give thanks to the Lord, for he is good..." | Psalm 107:1 |
| Thriving | 5 | Thriving | #34D399 (green) | "This is the day that the Lord has made..." | Psalm 118:24 |

- **Orb interaction**: Selected orb scales 1.15x with color glow (`boxShadow: 0 0 20px ${color}, 0 0 40px ${color}66`), unselected fade to 30% opacity
- **Orb sizes**: h-14 w-14 (mobile), ~60px (sm), h-16 w-16 (lg)
- **Animation**: Gentle pulse on unselected orbs (`motion-safe:animate-mood-pulse`)
- **Keyboard**: Arrow keys cycle through orbs (wraps around), Enter/Space selects
- **Skip link**: "Not right now" — skips for that day permanently (no re-prompt)

### Phase: Mood Selected (Optional Text Input)

- **Textarea slides in**: "Want to share what's on your heart?" (280-char limit)
- Auto-expanding, cyan glow border on focus
- Character warning at 250+ chars
- **Crisis detection**: Background keyword check against `SELF_HARM_KEYWORDS`
- Continue button -> Phase: Verse Display (or Crisis Banner)

### Phase: Verse Display (3-Second Encouragement)

- Fixed verse per mood (WEB translation) with reference fades in
- Auto-advances to dashboard after 3000ms (`VERSE_DISPLAY_DURATION_MS`)
- Verse text in serif italic

### Phase: Crisis Banner (If Keywords Detected)

- Red alert banner with crisis resources:
  - 988 Suicide & Crisis Lifeline: 988
  - Crisis Text Line: Text HOME to 741741
  - SAMHSA National Helpline: 1-800-662-4357
- `role="alert"`, `aria-live="assertive"`
- User must click "Continue to Dashboard" to proceed

### Data Persistence
- Saved to `wr_mood_entries` localStorage
- Entry: `{ id, date (YYYY-MM-DD), mood (1-5), moodLabel, text?, timestamp, verseSeen }`
- Max 365 entries (oldest pruned)
- Used by: activity tracking (mood = 5 pts), streak counting, mood chart, insights pages

---

## 1.3 `/daily` — Daily Hub (Tabbed Experience)

**Component**: `DailyHub.tsx`
**Clicks from landing**: 1 (navbar "Daily Hub" link)
**Query param**: `?tab=pray|journal|meditate` (default: `pray`)

### Page Structure

- **Navbar**: Glassmorphic with `transparent` prop (absolute over hero)
- **Hero**: Time-aware greeting + "Start with any practice below." + quiz teaser scroll link
- **Sticky tab bar**: 3 tabs (Heart/PenLine/Wind icons) with animated sliding underline (200ms ease-in-out)
  - Completion checkmarks (green) for authenticated users who've completed that tab's activity
  - Sticky shadow appears when scrolling past sentinel (Intersection Observer)
  - **Keyboard**: Arrow Right/Left navigate tabs, Home/End jump to first/last
  - All 3 tab contents always mounted but CSS-hidden (preserves form state when switching)
- **Below tabs**: SongPickSection (Spotify embed) + StartingPointQuiz + SiteFooter

### Pray Tab (`PrayTabContent.tsx`)

**User Flow** (6 steps):

1. **Initial state**: 3 starter chips ("I'm struggling with...", "Help me forgive...", "I feel lost about...") + textarea (500 char limit, cyan glow pulse, auto-expanding)
2. **Chip click**: Pre-fills textarea, moves cursor to end, auto-expands, focuses textarea
3. **Crisis check**: Real-time keyword detection -> `CrisisBanner` if detected
4. **Empty submit nudge**: If "Generate Prayer" clicked with empty text: "Tell God what's on your heart -- even a few words is enough." (warning color)
5. **Generate Prayer** (auth-gated):
   - Loading: 3 bouncing dots (150ms staggered), "Generating prayer for you..."
   - Mock delay: 1500ms
   - Prayer displays in rounded card with primary/5 bg, serif font
   - **KaraokeText**: Word-by-word highlighting during read-aloud (current word `bg-primary/20`)
6. **Action buttons**:
   - Copy (clipboard icon, toast "Prayer copied to clipboard")
   - Read Aloud (TTS via Speech Synthesis, Play/Pause/Resume/Stop)
   - Save (auth-gated, placeholder "coming soon")
   - Share (Web Share API on mobile, dropdown fallback: copy link, email, SMS, Facebook, X/Twitter)
   - Mobile: 3-dot overflow menu for Share
7. **Cross-tab CTA**: "Journal about this ->" switches to Journal tab with prayer topic context

**Accessibility**: `aria-label="Prayer request"` on textarea, `aria-describedby="pray-char-count"`, loading in `aria-live="polite"`, all buttons labeled, Escape closes mobile menu

### Journal Tab (`JournalTabContent.tsx`)

**User Flow**:

1. **Mode toggle**: "Guided" | "Free Write" buttons (`aria-pressed` for toggle state)
   - Persisted to localStorage (`wr_journal_mode`)
2. **Guided mode**: Prompt card (Lora italic, left border accent) with "Try a different prompt" refresh button
   - Context banner if coming from Pray tab: "Continuing from your prayer about [topic]" with dismiss
3. **Free Write mode**: No prompt, placeholder: "What's on your heart today?"
4. **Textarea**: 5000-char limit, min-height 200px, auto-expanding, character counter with comma thousands, crisis banner
5. **Draft auto-save**: 1s debounce to `wr_journal_draft` localStorage. "Draft saved" indicator (2s fade, aria-live)
6. **Save Entry** (auth-gated):
   - Clears textarea + removes draft + creates SavedJournalEntry + toast "Entry saved"
   - Marks journal complete, records activity for faith points
7. **Saved entries display** (after 1+ entries):
   - Entry cards: Timestamp, mode badge (if Guided), prompt text (if present), entry content (serif, pre-wrap)
   - "Reflect on my entry" button (auth-gated) -> AI reflection mock
   - "Write another" / "Done journaling" toggle with CTAs

**Persistence**: Draft in `wr_journal_draft`, mode in `wr_journal_mode`, completion in `worship-room-daily-completion`

### Meditate Tab (`MeditateTabContent.tsx`)

**6 meditation cards** in 2-column grid:

| Meditation | Icon | Description | Duration |
|------------|------|-------------|----------|
| Breathing Exercise | Wind | Guided 4-7-8 breathing with scripture | 2-10 min |
| Scripture Soaking | BookOpen | Sit quietly with a single verse | 2-10 min |
| Gratitude Reflection | Heart | Name things you're thankful for | 5 min |
| ACTS Prayer Walk | Footprints | 4-step guided prayer framework | 10-15 min |
| Psalm Reading | Scroll | Read through a Psalm verse by verse | 5-10 min |
| Examen | Search | 5-step evening reflection | 10-15 min |

**Auth gating**: Card click when logged out -> auth modal "Sign in to start meditating"
**Completion badges**: Green checkmarks on completed meditations (logged-in only)
**All-6-complete celebration**: Golden glow banner with `animate-golden-glow`

---

## 1.4 Meditation Sub-Pages (6 Routes)

**All sub-pages share**: Route-level auth redirect (logged-out -> `/daily?tab=meditate`), `Layout` wrapper with `PageHero`, `CompletionScreen` with CTAs on finish

### `/meditate/breathing` — Breathing Exercise (4-7-8)

**3 screens**:

1. **Pre-Start**: Duration selector (2/5/10 min), toggles for voice guidance (TTS) and chime sounds (Web Audio 528Hz sine wave), Begin button
2. **Exercise**: Centered breathing circle (192px mobile, 256px desktop) with phase-based scaling:
   - Breathe In (4s): Scale to 1.0
   - Hold (7s): Stay at 1.0
   - Breathe Out (8s): Scale to 0.75
   - Phase label (`aria-live="polite"`), countdown timer (aria-hidden visual), scripture verse (updates each cycle)
   - Voice speaks phase label (SpeechSynthesis, rate 0.9, volume 0.7)
   - Chime plays on phase change (Web Audio API)
   - Wake lock (`navigator.wakeLock`) keeps screen on
   - Leave warning: "Leave exercise? Your progress will be lost."
3. **Completion**: Records activity, shows CTAs to other features

### `/meditate/soaking` — Scripture Soaking

**3 screens**:
1. **Pre-Start**: Random verse preview with "Try another verse" button, duration selector (2/5/10 min)
2. **Exercise**: Large centered verse (serif, 2xl-4xl responsive), pause/resume button, bottom progress bar (`role="progressbar"` with aria attributes), wake lock
3. **Completion**: Records activity + CTAs

### `/meditate/gratitude` — Gratitude Reflection

1. **Input**: 3 text fields "I'm grateful for...", "Add another" button after 3 filled (unlimited items), auto-focus on new inputs
2. **Completion**: Affirmation message + random gratitude verse

### `/meditate/acts` — ACTS Prayer Walk

**4-step progression**: Adoration -> Confession -> Thanksgiving -> Supplication
- Each step: Progress bar, title, prompt text, supporting verse in callout, optional notes textarea
- Navigation: Previous/Skip/Next buttons, "Finish" on last step

### `/meditate/psalms` — Psalm Reading

**3-screen flow**:
1. **Selection**: List of 10 Psalms (Psalm 119 has special section selection)
2. **Section Selection** (Psalm 119 only): 22 Hebrew letter sections
3. **Reading**: Intro screen, then verse-by-verse with Previous/Next/Finish navigation

### `/meditate/examen` — Ignatian Examen

**5-step progression** (same navigation pattern as ACTS)
- Intro note: "The Examen is traditionally an evening practice..."
- Each step: Progress bar, title, prompt, optional notes

---

## 1.5 `/prayer-wall` — Community Prayer Feed

**Component**: `PrayerWall.tsx`
**Clicks from landing**: 1 (navbar "Prayer Wall")

### Page Structure

- **Hero**: Dark purple gradient, "Prayer Wall" (script font), "You're not alone."
- **CTA section**: Logged in = "Share a Prayer Request" + "My Dashboard"; Logged out = "Share a Prayer Request" (triggers auth modal)
- **Inline Composer** (collapsible): Textarea (1000 char limit), anonymous checkbox, crisis detection blocks submission, character counter at 500+, helper text "Be kind and respectful"
- **Prayer Card Feed**: 20 per page, lazy load via "Load More" button

### Prayer Card Anatomy

Each card contains:
- **Header**: Avatar (initials or photo) + author name (links to profile) + timestamp (relative)
- **Content**: Plain text, `white-space: pre-wrap`, truncated at 150 chars with "Show more/less"
- **Answered badge**: Green CheckCircle + "Answered Prayer" + testimony text + date (if applicable)
- **Interaction Bar**:
  - "Pray for this" toggle (HandHelping icon + count, records `prayerWall` activity)
  - "Comments" toggle (MessageCircle + count, expands `CommentsSection`)
  - "Bookmark" toggle (Bookmark icon, filled when bookmarked, auth-gated)
  - "Share" (Share2 icon, Web Share API / dropdown: copy, email, SMS, Facebook, X)
- **Comments Section** (expandable): First 5 comments inline, "See more" link to detail page, comment input (auth-gated, 500 char, crisis check, Shift+Enter submits)

### Sub-Pages

**`/prayer-wall/:id`** — Prayer Detail: Full prayer + all comments + owner actions (Mark as Answered form, Delete dialog) + Report dialog
**`/prayer-wall/user/:id`** — Public Profile: Avatar, name, bio, joined date, 3 tabs (Prayers/Replies/Reactions)
**`/prayer-wall/dashboard`** — Private Dashboard (auth-gated): Editable profile, 5 tabs (My Prayers/My Comments/Bookmarks/Reactions/Settings)

### Auth Gating
- **Requires login**: Posting, commenting, bookmarking, mark as answered, delete, dashboard access
- **Works without login**: Reading feed, expanding comments, sharing, reporting, viewing profiles

---

## 1.6 `/music` — Music Hub (3-Tab Experience)

**Component**: `MusicPage.tsx`
**Clicks from landing**: 1 (navbar "Music")
**Query param**: `?tab=playlists|ambient|sleep` (default: `ambient`)

### Tab 1: Worship Playlists (`WorshipPlaylistsTab.tsx`)

- **8 Spotify playlist iframes** (352px height each):
  - 4 Worship: Top Christian Hits 2026 (hero), Top Christian Songs 2025, Top Worship Hits 2026, Top Christian Pop 2026
  - 4 Explore: Indie, Rap, Afrobeats, Lofi
- "Follow Our Playlist" CTA linking to Worship Room Spotify playlist
- Display sizes: hero (large), prominent (medium), standard (smaller grid)

### Tab 2: Ambient Sounds (`AmbientBrowser.tsx`)

**24 ambient sounds** across 4 categories:

| Category | Count | Sounds |
|----------|-------|--------|
| Nature | 7 | Gentle Rain, Heavy Rain, Ocean Waves, Forest Birds, Gentle Wind, Thunder (Distant), Flowing Stream |
| Environments | 6 | Fireplace, Night Crickets, Cafe Ambience, Night Garden, Rainy Window, Campfire |
| Spiritual | 5 | Church Bells (Distant), Choir Hum, Singing Bowl, Wind Chimes, Cathedral Reverb |
| Instruments | 6 | Soft Piano, Acoustic Guitar, Gentle Harp, Ambient Pads, Cello (Slow), Flute (Meditative) |

**8 scene presets** (each combines 3-4 sounds):

| Scene | Animation | Sounds |
|-------|-----------|--------|
| Garden of Gethsemane | pulse | Night Crickets + Gentle Wind + Night Garden + Singing Bowl |
| Still Waters | drift | Flowing Stream + Gentle Wind + Forest Birds + Gentle Harp |
| Midnight Rain | drift | Gentle Rain + Rainy Window + Thunder Distant |
| Ember & Stone | pulse | Fireplace + Campfire + Soft Piano + Wind Chimes |
| Morning Mist | drift | Forest Birds + Flowing Stream + Gentle Wind + Flute |
| The Upper Room | glow | Cathedral Reverb + Choir Hum + Ambient Pads + Church Bells |
| Starfield | glow | Night Crickets + Gentle Wind + Ambient Pads + Cello |
| Mountain Refuge | drift | Gentle Wind + Flowing Stream + Church Bells + Acoustic Guitar |

**Sound interaction**: Click card to toggle, max 6 simultaneous, individual volume sliders per sound
**User features**: Favorites, saved mixes, shareable mix URLs (Base64 encoded in query params)

### Tab 3: Sleep & Rest (`SleepBrowse.tsx`)

**24 scripture readings** (WEB translation) across 4 collections:
- Psalms of Peace (6), Comfort & Rest (6), Trust in God (6), God's Promises (6)
- Each: title, reference, duration (180-480s), voice gender (male/female), full text

**12 bedtime stories**:
- Biblical narratives: Noah, David, Daniel, Joseph, Good Samaritan, Prodigal Son, Jesus Calms the Storm, Garden of Eden, Psalm 23 Journey, Stars of Abraham, Ruth & Naomi, Elijah & Still Small Voice
- Durations: 480-1800s, short/medium/long categories

**Content Switch Dialog**: Prompts if switching foreground while another plays

### Audio Infrastructure (Global `AudioProvider`)

**Web Audio API architecture**:
- Single `AudioContext` (never recreated)
- `masterGainNode` -> individual `GainNode` per sound -> `AudioContext.destination`
- Crossfade looping: 1500ms overlap between buffer end and new buffer start for seamless ambient loops
- Buffer caching: Decoded audio buffers cached per sound ID
- Retry logic: Exponential backoff [1s, 2s, 4s] on load failure

**Controls**:
- Master volume (0-100%)
- Per-sound volume (0-100%)
- Foreground/background balance slider
- Global keyboard: Space = play/pause, Arrow Up/Down = volume +/-5%

**Sleep Timer**:
- Presets: 15, 30, 45, 60, 90 min + custom (5-480 min)
- Fade durations: 5, 10, 15, 30 min
- Wall-clock timing (not setTimeout) for accuracy
- Smart fade: Foreground fades first (0-60% of fade duration), ambient fades second (40-100%)
- Pause/resume preserves timer state
- SVG progress ring countdown display
- `aria-live="polite"` announces remaining time every minute

**AudioPill** (persistent floating player):
- Fixed bottom-right (mobile: bottom-center with safe-area-inset)
- Two modes: Now-playing (play/pause + waveform + title + timer indicator) or Routine shortcut (suggested routine start button)
- Tapping opens `AudioDrawer`

**AudioDrawer** (modal/panel):
- Desktop: Fixed right sidebar (400px); Mobile: Bottom sheet (70vh)
- 3 tabs: Mixer (active sounds + volumes), Timer (setup/countdown), Saved (user mixes)
- Swipe-down to close on mobile, click-outside on desktop, focus trap

---

## 1.7 `/music/routines` — Bedtime Routines

**Component**: `RoutinesPage.tsx`
**Clicks from landing**: 2 (Music -> Routines link)

**3 built-in templates**:
| Template | Total Duration | Fade | Steps |
|----------|---------------|------|-------|
| Evening Peace | 45 min | 15 min | Still Waters scene -> Psalm 23 scripture |
| Scripture & Sleep | 30 min | 10 min | Midnight Rain scene -> Random Comfort & Rest scripture |
| Deep Rest | 90 min | 30 min | Garden of Gethsemane scene -> Elijah story |

**Routine builder**: Create/edit custom routines with scene/scripture/story steps, transition gaps, sleep timer config
**Auth gating**: Creating/cloning requires login
**Storage**: `wr_routines` localStorage

---

## 1.8 `/insights` — Mood Insights Page

**Auth-gated** (redirects to `/`)
**Time range pills** (sticky on scroll): 30d | 90d | 180d | 1y | All

**Sections** (staggered fade-in):
1. **Calendar Heatmap**: Grid of dates colored by mood value
2. **Mood Trend Chart**: Recharts line chart with colored dots
3. **Insight Cards**: 4 AI insight cards (mocked: trends, patterns, correlations, scripture connections)
4. **Activity Correlations**: "Days you journaled, mood improved by X%"
5. **Scripture Connections**: "Psalm 34:18 appears 5 times when you're Struggling"
6. **CTA**: "View Monthly Report" -> `/insights/monthly`

**Empty states**: 0 entries = "Start checking in to unlock your mood insights"; 1-6 entries = "After 7 days, you'll see trends emerge"

---

## 1.9 `/insights/monthly` — Monthly Report

**Auth-gated**
**Navigation**: Left/right arrows to navigate months

**Content**:
- **Stat cards**: Days active, points earned, level progression, mood trend %
- **Monthly heatmap**: Full-month calendar grid
- **Activity bar chart**: 6 activity types
- **Monthly highlights**: Longest streak, badges earned, best day
- **Monthly insight cards**: 3-4 reflections
- **Share button** + **Email preview modal** (mockup of monthly email)

---

## 1.10 `/friends` — Friends & Leaderboard

**Auth-gated**
**2 tabs**: Friends (default) | Leaderboard

### Friends Tab
- **Friend Search**: Text input (min 2 chars), results with status badges
- **Invite Section**: Copy invite link + email invite stub
- **Pending Requests**: Incoming (Accept/Decline) + Outgoing (Cancel)
- **Friend List**: Sorted by last active, per friend: avatar, name, Encourage button (opens preset message popover), Menu (Remove/Block)
- **Suggestions**: "People you may know" from mock data

### Leaderboard Tab
- **Board Selector**: Friends | Global
- **Friends Leaderboard**: Weekly + All-Time toggle, ranked with medal icons (#1 gold, #2 silver, #3 bronze), current user highlighted
- **Global Leaderboard**: Weekly only (resets Monday), top 50, display names only (privacy)

---

## 1.11 `/profile/:userId` — Growth Profile

**Public** (viewable by anyone, actions auth-gated)

**Profile Header**: Avatar (preset/unlockable/custom/initials), name, level + badge, streak, progress bar
**Relationship buttons**: Self = "Edit Profile" -> `/settings`; Friend = "Send Encouragement" (popover with 4 presets, 3/day limit); Not friend = "Add Friend"; Pending = "Accept Request" or "Request Sent"
**Badge Showcase**: Grid of all ~35 badges (earned = color + glow, locked = grayscale + lock)
**Profile Stats**: Total points, days active, most active activity, recent badges

### Avatar System
- **16 presets** (4 categories x 4 icons): Nature (Dove, Tree, Mountain, Sunrise), Faith (Cross, Ichthys, Flame, Crown), Water (Wave, Raindrop, River, Anchor), Light (Star, Candle, Lighthouse, Rainbow)
- **4 unlockable avatars**: Golden Dove (streak_365), Crystal Tree (level_6), Phoenix Flame (10+ full worship days), Diamond Crown (all 7 streak badges)
- **Fallback**: Initials in colored circle (color computed from userId hash)

---

## 1.12 `/settings` — Settings Page

**Auth-gated**
**Layout**: Desktop = left sidebar + content; Mobile = top tab bar

### 4 Sections:

1. **Profile**: Avatar picker modal (16 presets + 4 unlockable + photo upload), display name (2-30 chars), bio (160 chars)
2. **Notifications**: Per-channel toggles (email, push stub, in-app, digest stub) + per-type checkboxes (encouragements, friend requests, milestones, level-ups, nudges, weekly recap)
3. **Privacy**: 6 controls:
   - Show on global leaderboard (toggle)
   - Activity status (toggle)
   - Who can send nudges (everyone/friends/nobody)
   - Who can see streak & level (everyone/friends/only me)
   - Blocked users list with Unblock buttons
4. **Account**: Email display (read-only), Change Password (Phase 3), Delete Account (confirmation: type "DELETE")

---

## 1.13 Local Support Pages (3 Routes)

All use `LocalSupportPage.tsx` with different configs.

### `/local-support/churches` — Church Locator
- Filter: Denomination dropdown (Baptist, Catholic, Methodist, etc.)
- Mock data: 12 churches near Columbia, TN

### `/local-support/counselors` — Counselor Locator
- Filter: Specialty dropdown (Anxiety, Depression, Trauma, Marriage, etc.)
- Disclaimer: "Worship Room does not endorse or verify any counselor..."
- Mock data: 10 counselors near Columbia, TN

### `/local-support/celebrate-recovery` — CR Locator
- Extra hero content: "What is Celebrate Recovery?" info panel
- No filters
- Mock data: 8 CR locations near Columbia, TN

### Common Features (All 3)
- **Search**: Geolocation or text input (city/zip), radius slider (1-100 miles, 500ms debounce)
- **Two views**: List (scrollable cards) + Map (Leaflet with markers/popups)
- **Sort**: Distance, Rating, Alphabetical
- **Listing Card**: Photo/placeholder, name, distance badge, address (MapPin), phone (tel: link), star rating, bookmark (auth-gated), share dropdown, expandable details (website, hours, denomination/specialties, Get Directions Google Maps link)
- **States**: Idle (search prompt), Loading (3 skeleton cards with pulse), No Results (expand radius suggestion), Error (retry button)
- **Auth gating**: Searching and bookmarking require login; demo mode loads mock data immediately for logged-out users
- **URL deep-linking**: `?lat=X&lng=Y&radius=Z&placeId=ID`

---

## 1.14 Shared Content Pages

### `/verse/:id` — Shareable Verse Card
- Hero with verse as large blockquote (serif, 2-3xl) + reference
- Spotify iframe (352px) + "Follow our playlist" link
- CTAs: "Explore Worship Room" + "Start your daily time with God"
- 404: "Verse not found"

### `/prayer/:id` — Shareable Prayer Card
- Phase 1 stub (no persistence yet; all direct visits show fallback)
- Fallback: "This prayer was shared with you..." + Spotify embed + CTAs

---

## 1.15 Utility Pages

### `/login` — Login Stub
- Centered card: "Log In" heading + "Coming Soon" subtitle (serif font)

### `/register` — Register Stub
- Centered card: "Get Started" heading + "Coming Soon" subtitle

### `/health` — Backend Health Check
- Card with loading spinner -> JSON display of health/hello API responses
- Error state: XCircle icon + red banner + error message

### `*` — 404 Not Found
- "Page Not Found" + "The page you're looking for doesn't exist." + "Go Home" link

### `/dev/mood-checkin` — Dev-Only Preview
- Full-screen MoodCheckIn for visual development (only in `import.meta.env.DEV`)

---

# SECTION 2: Global Systems and Shared Components

## 2A. Global Component Inventory

### Navbar (`Navbar.tsx`)
- **Glassmorphic** on all pages (transparent prop only controls positioning, not visual style)
- **Desktop nav**: Daily Hub, Prayer Wall, Music links + Local Support dropdown + auth buttons (logged out) or notification bell + avatar dropdown (logged in)
- **Mobile**: Hamburger menu -> `MobileDrawer` (full-height, dark-themed matching desktop dropdowns)
- **Dropdown animations**: `animate-dropdown-in` (150ms)
- **Active link**: Animated underline pseudo-element (300ms scale-x)
- **Accessibility**: Semantic `<nav>/<menu>`, `role="menu"`, `aria-expanded`, `aria-controls`, focus trap in mobile drawer, Escape/arrow key support, 44px tap targets

### SiteFooter (`SiteFooter.tsx`)
- See Section 1.1 for full details. Appears on every page.

### Toast System (`Toast.tsx`)
- **ToastProvider** context wrapping all routes
- **Standard toasts**: Top-right, slide-from-right, success (green) / error (red), 6s auto-dismiss
- **Celebration toasts**: Bottom-right (desktop) / bottom-center (mobile), slide-from-bottom/right, badge name + message + optional confetti particles, 4-5s duration
- **Types**: success, error, celebration, celebration-confetti, special-celebration
- **Accessibility**: `role="alert"` for errors, `role="status"` for success/celebration, `aria-live` regions, sr-only announcements

### Button (`Button.tsx`)
- 4 variants: primary (bg-primary), secondary (bg-gray-200), outline (border primary), ghost (transparent)
- 3 sizes: sm (h-8), md (h-10), lg (h-12)
- Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Disabled: `opacity-50 cursor-not-allowed`

### Card (`Card.tsx`)
- Card, CardHeader, CardTitle, CardContent subcomponents
- Default: `rounded-lg border bg-white p-6 shadow-sm`

### DashboardCard (`DashboardCard.tsx`)
- Frosted glass: `bg-white/5 backdrop-blur-sm border-white/10 rounded-2xl`
- Collapsible with `grid-rows` animation, state persisted to localStorage
- Header: icon + title + action link + collapse chevron

### ProfileAvatar (`ProfileAvatar.tsx`)
- 5 sizes: xs (40px) through xl (160px)
- 5 fallback strategies: custom photo -> unlockable avatar -> preset avatar -> initials -> default
- Accessibility: `role="img"` + `aria-label` when not decorative

### AuthModal (`AuthModal.tsx` + `AuthModalProvider.tsx`)
- UI shell only (Phase 3 for real auth)
- Triggered by `useAuthModal()` context
- Customizable subtitle and initial view (login/register)
- Focus trap, backdrop dismiss, Escape close

### CrisisBanner (`CrisisBanner.tsx`)
- Real-time keyword detection against `SELF_HARM_KEYWORDS`
- `role="alert"`, `aria-live="assertive"` (safety-critical)
- 3 hotlines with `tel:` links
- Appears in: Pray tab, Journal tab, Mood check-in, Prayer Wall composer, Comment input

---

## 2B. Audio System

See Section 1.6 for complete audio documentation. Summary:

- **AudioProvider**: Global context with 4 sub-contexts (state, dispatch, engine, sleep timer)
- **Web Audio API**: Single AudioContext, GainNode per sound, crossfade looping (1500ms overlap), buffer caching
- **24 ambient sounds** in 4 categories with individual volume control
- **8 scene presets** combining 3-4 sounds each
- **Foreground audio**: `<audio>` element for scripture (24 readings) and stories (12 stories)
- **Sleep timer**: Wall-clock based, smart fade, SVG progress ring, pause/resume
- **Bedtime routines**: 3 templates + user-created, multi-step with scenes and foreground content
- **AudioPill**: Persistent floating player (now-playing or routine shortcut)
- **AudioDrawer**: Modal/panel with Mixer, Timer, Saved tabs
- **Keyboard shortcuts**: Space (play/pause), Arrow Up/Down (volume)
- **Media Session API**: Browser media controls integration
- **Session persistence**: Auto-save to localStorage with 24h expiry
- **Accessibility**: `useAnnounce()` hook, full ARIA, 44px touch targets, `prefers-reduced-motion`

---

## 2C. Theming and Visual Design

### Color Palette

| Category | Name | Hex | Usage |
|----------|------|-----|-------|
| Brand | Primary | #6D28D9 | Buttons, links, accents |
| Brand | Primary Light | #8B5CF6 | Hover states |
| Dark | Hero Dark | #0D0620 | Footer, dark backgrounds |
| Dark | Hero Mid | #1E0B3E | Navbar backdrop, dropdown panels |
| Dark | Hero Deep | #251248 | Accent backgrounds |
| Dark | Hero BG | #08051A | Hero section base |
| Accent | Glow Cyan | #00D4FF | Input glow, tech accents |
| Light | Neutral BG | #F5F5F5 | Landing page background |
| Text | Dark | #2C3E50 | Primary text on light |
| Text | Light | #7F8C8D | Secondary text |
| Status | Success | #27AE60 | Positive/completed |
| Status | Warning | #F39C12 | Neutral/caution |
| Status | Danger | #E74C3C | Error/negative |
| Mood | Struggling | #D97706 | Mood value 1 |
| Mood | Heavy | #C2703E | Mood value 2 |
| Mood | Okay | #8B7FA8 | Mood value 3 |
| Mood | Good | #2DD4BF | Mood value 4 |
| Mood | Thriving | #34D399 | Mood value 5 |

### Typography
- **Sans (Body)**: Inter (400, 500, 600, 700) — UI text, labels, buttons
- **Serif**: Lora (400, 700, italic) — Scripture, long-form content
- **Script**: Caveat (400, 700) — Branding, heading accents

### Theme Patterns
- **Landing page**: Light (`neutral-bg`), dark hero gradient at top, dark footer
- **Inner pages**: Varies — most use dark backgrounds with white/light text
- **Dashboard**: Always dark (gradient `from-[#1a0533] to-[#0f0a1e]`)
- **No dark mode toggle** on inner pages (no system preference detection for theme switching)

### Glassmorphism
- `liquid-glass` utility: `rgba(255,255,255,0.01)` bg, 4px backdrop-blur, shimmer border gradient
- Dashboard cards: `bg-white/5 backdrop-blur-sm border border-white/10`
- Navbar: `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25`

### Animations (24 custom keyframes)
- `glow-pulse` (2.5s) — textarea cyan/violet glow
- `cursor-blink` (1s) — typewriter cursor
- `dropdown-in` (150ms) — menu dropdown
- `golden-glow` (2s) — celebration
- `breathe-expand/contract` (4s/8s) — meditation breathing
- `fade-in` (500ms) — general entrance
- `waveform-bar-1/2/3` (1.2-1.4s) — audio visualization
- `mood-pulse` (3s) — mood selector
- `celebration-spring` (600ms) — badge celebration (cubic-bezier spring)
- `confetti-fall/burst` (1.5-3s) — confetti particles
- `bell-ring` (300ms) — notification alert
- `streak-bump` (300ms) — streak counter pulse
- All respect `prefers-reduced-motion`

### Video Background
- Source: CloudFront CDN MP4
- Max opacity: 40%, auto-play muted loop
- Fade: 500ms in/out, hidden with `prefers-reduced-motion`
- Only appears on landing page hero

---

## 2D. Authentication UI

### Mock Auth System (Phase 2.75)
- **AuthProvider** context: `{ isAuthenticated, user: {name, id}, login(name), logout() }`
- **localStorage keys**: `wr_auth_simulated` ("true"|null), `wr_user_name` (string), `wr_user_id` (UUID)
- **DevAuthToggle**: Dev-only "Simulate Login" button visible when `import.meta.env.DEV`
- **login(name)**: Sets auth keys, generates/preserves UUID
- **logout()**: Removes auth keys but **preserves ALL user data** (mood, points, badges, friends, etc.)
- **Cross-tab sync**: Listens to `storage` events for `wr_auth_simulated` changes

### Auth Modal
- UI shell only (no real authentication)
- Displays "Sign in to [action]" with login/register button stubs
- Focus trap, backdrop dismiss, Escape close
- Triggered by `useAuthModal()` context hook

### Soft-Gate Pattern
- Protected routes: `Navigate` redirect to `/` (landing) or `/login`
- Protected actions: Auth modal triggered inline (user stays on page)
- After "login": Intended action completes automatically (no retry needed)

---

## 2E. Data Model (Frontend)

### All localStorage Keys

| Key | Type | Feature | Survives Refresh | Survives Logout |
|-----|------|---------|------------------|-----------------|
| `wr_auth_simulated` | "true"/null | Auth | Yes | No |
| `wr_user_name` | string | Auth | Yes | No |
| `wr_user_id` | UUID | Auth | Yes | Yes |
| `wr_mood_entries` | MoodEntry[] (max 365) | Mood | Yes | Yes |
| `wr_daily_activities` | DailyActivityLog | Activities | Yes | Yes |
| `wr_faith_points` | FaithPointsData | Points | Yes | Yes |
| `wr_streak` | StreakData | Streak | Yes | Yes |
| `wr_badges` | BadgeData | Badges | Yes | Yes |
| `wr_friends` | FriendsData | Friends | Yes | Yes |
| `wr_social_interactions` | SocialInteractionsData | Social | Yes | Yes |
| `wr_milestone_feed` | MilestoneEvent[] (max 50) | Social | Yes | Yes |
| `wr_notifications` | NotificationEntry[] | Notifications | Yes | Yes |
| `wr_leaderboard_global` | LeaderboardEntry[] | Leaderboard | Yes | Yes |
| `wr_settings` | UserSettings | Settings | Yes | Yes |
| `wr_dashboard_collapsed` | {cardId: bool} | Dashboard | Yes | Yes |
| `wr_favorites` | Favorite[] | Music | Yes | Yes |
| `wr_saved_mixes` | SavedMix[] | Music | Yes | Yes |
| `wr_listening_history` | ListeningSession[] (max 100) | Music | Yes | Yes |
| `wr_session_state` | SessionState (24h expiry) | Music | Yes | Yes |
| `wr_routines` | RoutineDefinition[] | Music | Yes | Yes |
| `worship-room-daily-completion` | DailyCompletion | Daily | Yes | Yes |
| `worship-room-journal-draft` | string | Daily | Yes | Yes |
| `worship-room-journal-mode` | "guided"/"free" | Daily | Yes | Yes |

### Key Data Types

**MoodEntry**: `{ id, date (YYYY-MM-DD), mood (1-5), moodLabel, text?, timestamp, verseSeen }`
**DailyActivities**: `{ mood, pray, listen, prayerWall, meditate, journal (booleans), pointsEarned, multiplier }`
**FaithPointsData**: `{ totalPoints, currentLevel, currentLevelName, pointsToNextLevel, lastUpdated }`
**StreakData**: `{ currentStreak, longestStreak, lastActiveDate }`
**BadgeData**: `{ earned {badgeId: {earnedAt, count?}}, newlyEarned [], activityCounts {} }`
**FriendsData**: `{ friends [], pendingIncoming [], pendingOutgoing [], blocked [] }`
**UserSettings**: `{ profile {name, avatarId, avatarUrl?, bio?}, notifications {9 toggles}, privacy {leaderboard, activity, nudge, streak, blocked[]} }`

### Service Layer
All storage operations go through pure-function services (`badge-storage.ts`, `faith-points-storage.ts`, `mood-storage.ts`, `friends-storage.ts`, `settings-storage.ts`, `social-storage.ts`, `storage-service.ts`) with a `StorageService` abstraction for easy API swap in Phase 3.

---

## 2F. Third-Party Integrations

| Integration | Library/Method | Depth | Unused Capabilities |
|-------------|---------------|-------|---------------------|
| **Spotify** | iframe embeds only | Surface (no API) | Track search, playback control, user playlists, recommendations |
| **Leaflet** | react-leaflet + leaflet | Full map integration | Custom markers, clustering, route drawing, heatmap layers |
| **Recharts** | recharts | Charts for mood/activity | Brush selection, zoom, radar charts, scatter plots |
| **Google Fonts** | CDN preconnect | 3 font families | Variable fonts, font subsetting |
| **Web Audio API** | Native browser API | Deep (crossfade looping) | Spatial audio, convolution reverb, analyzer nodes |
| **Speech Synthesis** | Native browser API | Basic TTS | Voice selection, SSML, pitch/rate tuning |
| **Web Share API** | Native browser API | Basic sharing | File sharing, contact picking |
| **Wake Lock API** | Native browser API | Screen-on during meditations | — |
| **Media Session API** | Native browser API | Play/pause controls | Seek, position state, custom actions |
| **CloudFront CDN** | Direct MP4 URL | Hero video only | Image optimization, adaptive bitrate |

---

## 2G. Content Inventory

| Category | Count | Details |
|----------|-------|---------|
| **Ambient sounds** | 24 | 7 nature, 6 environments, 5 spiritual, 6 instruments |
| **Scene presets** | 8 | 3 featured + 5 standard, each with 3-4 sounds |
| **Scripture readings** | 24 | 4 collections x 6 readings, WEB translation, male/female TTS |
| **Bedtime stories** | 12 | Biblical narratives, 480-1800s, short/medium/long |
| **Spotify playlists** | 8 | 4 worship + 4 explore genres |
| **Routine templates** | 3 | Evening Peace (45m), Scripture & Sleep (30m), Deep Rest (90m) |
| **Daily verses** | 30 | WEB translation, mood-tagged |
| **Daily songs** | 10 | Spotify track IDs |
| **Mock prayers** | 5 | Topic-based prayer templates |
| **Classic prayers** | 10 | Historical prayers with attribution |
| **Journal prompts** | 10 | Theme-based prompts |
| **Journal reflections** | 10 | AI reflection templates |
| **Psalms** | 10 | Full text with intros and verse-by-verse |
| **ACTS steps** | 4 | With prompts and supporting verses |
| **Examen steps** | 5 | With prompts |
| **Gratitude affirmations** | 5 | Template strings |
| **Quiz questions** | 5 | 4 options each, points-based scoring |
| **Mock prayer wall posts** | 18+ | With comments and reactions |
| **Mock prayer wall users** | 10 | Varied profiles |
| **Mock friends** | 10 | With levels, streaks, points |
| **Mock global leaderboard** | 50 | Display names + weekly points |
| **Badge definitions** | ~35 | 5 categories (streak, level, activity, community, special) |
| **Avatar presets** | 16 | 4 categories x 4 icons |
| **Unlockable avatars** | 4 | Require specific badge criteria |
| **Mock churches** | 12 | Columbia, TN area |
| **Mock counselors** | 10 | Columbia, TN area |
| **Mock CR locations** | 8 | Columbia, TN area |
| **Crisis keywords** | 8+ | Self-harm detection |
| **Notification types** | 7 | encouragement, friend_request, milestone, etc. |

---

## 2H. PWA and Offline Capabilities

**Current state: None implemented.**
- No `manifest.json`
- No service worker
- No offline fallback page
- No caching strategy
- No install prompt
- No app icons configured

---

## 2I. Performance Observations

### Strengths
- Single AudioContext reused globally (never recreated)
- Audio buffer caching (decoded once, reused on re-add)
- 350+ `useMemo/useCallback` instances for memoization
- Tab content mounted but CSS-hidden (preserves state without re-render)
- `requestAnimationFrame` for smooth timing in meditations
- Intersection Observer for lazy operations (sticky detection, scroll animations)
- O(1) lookups via Map objects (SOUND_BY_ID, SCENE_BY_ID, SCRIPTURE_READING_BY_ID)

### Opportunities
- Only 1 `React.lazy()` instance (dev route) — no route-level code splitting
- No image optimization library (basic `<img>` tags with error fallback)
- No bundle size monitoring tool
- Audio placeholder MP3s (~1.4MB) shipped in dist
- Recharts and Leaflet loaded eagerly even for routes that don't use them
- No Error Boundaries implemented

---

## 2J. SEO and Metadata

**Current state: Minimal.**
- `<title>`: Static "Worship Room" only (no per-page titles)
- `<meta name="description">`: Single global description
- `<meta name="viewport">`: Configured with `viewport-fit=cover`
- **Missing**: No sitemap.xml, robots.txt, Open Graph tags, Twitter cards, structured data (JSON-LD), canonical URLs, dynamic per-page titles, react-helmet or equivalent

---

## 2K. Test Coverage Summary

| Area | Test Files | Status |
|------|-----------|--------|
| **Audio/Music** | 43 | Comprehensive (infrastructure + UI) |
| **Dashboard/Growth** | 23 | Strong (gamification logic + UI) |
| **Prayer Wall** | 13 | Strong (274+ tests per git status) |
| **Insights** | 12 | Good coverage |
| **Leaderboard** | 9 | Good coverage |
| **Layout/Shared** | 9 | Covered |
| **Local Support** | 5 | Moderate |
| **Friends** | 5 | Moderate |
| **Settings** | 4 | Moderate |
| **Daily Hub** | 4 | Moderate |
| **Social** | 3 | Basic |
| **Hooks** | 26 | Strong |
| **Services** | 9 | Good |
| **Pages** | 26 | All major pages |
| **TOTAL** | 227 files | 29,357 LOC of tests |

**Testing stack**: Vitest + React Testing Library + @testing-library/user-event
**Test setup**: Mocks for IntersectionObserver, ResizeObserver, matchMedia

---

## 2L. Feature Completeness Flags

### Partially Implemented / Stubbed

| Feature | Status | What's Missing |
|---------|--------|----------------|
| **Real authentication** | UI shell only | Spring Security + JWT (Phase 3) |
| **AI prayer generation** | Mock 1500ms delay | OpenAI API integration |
| **AI journal reflection** | Mock data | OpenAI API integration |
| **AI mood insights** | Mocked per day-of-year | Real AI analysis |
| **Backend crisis detection** | Client-side keywords only | LLM classifier on backend |
| **TTS audio files** | Placeholder MP3s | Real TTS generation (Google Cloud TTS WaveNet) |
| **Prayer sharing** | Fallback page (no persistence) | Backend prayer storage |
| **Login/Register pages** | "Coming Soon" stubs | Real forms + validation |
| **Email notifications** | Stubs/disabled | SMTP integration |
| **Push notifications** | Stubs | Service worker + push API |
| **Photo avatar upload** | UI built, processing mocked | Backend storage |
| **Change password** | Button only | Form + backend |
| **Delete account** | Confirmation modal only | Backend deletion |
| **Prayer Wall notifications** | 4 toggles, all disabled | Backend notification system |
| **Ambient search/filter** | Components exist but hidden | Re-enable planned |
| **Music personalization** | Components hidden (TimeOfDay, Personalization, MusicHint, ResumePrompt, RecentlyAdded) | Re-enable planned |
| **Spotify OAuth** | No integration | Not planned for MVP |
| **PWA** | Not configured | manifest.json, service worker |
| **SEO** | Minimal | sitemap, OG tags, structured data |

### TODO/FIXME Comments Found
1. `ListenTracker.tsx` — "Replace readAuthFromStorage() with useAuth() when real JWT auth (Phase 3)"
2. `CommentInput.tsx` & `InlineComposer.tsx` — "Replace keyword check with backend crisis detection API (Phase 3)"
3. `PrayerWall.tsx` — "POST to /api/prayer-replies with { prayerId, content } (Phase 3)"
4. `PrayerWallDashboard.tsx` — "Fetch real user profile from backend (Phase 3)"

---

# SECTION 3: Cross-Cutting UX Observations

## 3.1 Friction Points

1. **No onboarding flow for new users**: After simulating login, user lands on dashboard with empty widgets and no guided introduction. The quiz on the landing page is helpful but disconnected from the post-login experience. There's no tooltip tour, welcome wizard, or progressive disclosure to help users discover features.

2. **Auth modal is a dead end**: The auth modal shows "Sign in to [action]" with login/register buttons that go to "Coming Soon" pages. In the current demo state, users must use the dev toggle — which is hidden and non-obvious even in dev mode.

3. **Meditation auth redirect is jarring**: Clicking a meditation card when logged out redirects to `/daily?tab=meditate` with a toast message, but the toast is easy to miss. The user may not understand why they were redirected.

4. **Journal draft auto-save is invisible on first use**: The 1s debounce auto-save to localStorage is excellent, but there's no proactive indication that drafts are being saved until the "Draft saved" message appears. A first-time user might not trust that their writing is preserved.

5. **No way to recover deleted prayers**: Delete prayer dialog warns "cannot be undone" but there's no undo/soft-delete grace period.

6. **Local Support requires login for searching**: Logged-out users see mock data immediately but can't search their own location. The auth modal for search feels unnecessarily restrictive for a non-personal action.

7. **Quiz result has no persistence**: Taking the quiz gives a recommendation, but there's no way to save or revisit the result. If the user navigates away, they must retake.

8. **Saved journal entries have no search/filter**: As entries accumulate, there's no way to search by content, filter by date range, or sort by mode.

9. **Friend suggestions are static**: "People you may know" always shows the same mock users with no explanation of why they're suggested.

10. **Prayer Wall has no category/topic filtering**: All prayers appear in one chronological feed. As the community grows, finding relevant prayers will be difficult.

## 3.2 Missing Feedback Loops

1. **No confirmation after mood check-in completion**: The check-in auto-advances to dashboard after the verse display, but there's no "mood logged" toast or visual confirmation that the entry was saved.

2. **No feedback when streak resets**: If a user misses a day, they see 0 with no acknowledgment of the lost streak. A gentle "Your streak reset, but every day is a fresh start" message would soften the blow.

3. **No progress celebration for journal entries**: Saving a journal entry shows a brief toast, but there's no milestone tracking (10th entry, 50th entry) or encouragement specific to journaling consistency.

4. **Share actions lack confirmation on some platforms**: Copy link shows "Copied!" but social share (Facebook, Twitter) opens a new window with no confirmation that the share completed.

5. **No sound when audio starts playing**: When ambient sounds load and begin, there's no visual or haptic feedback confirming playback has started beyond the waveform bars animation.

6. **Encouragement sent has minimal feedback**: Sending an encouragement shows a toast, but there's no animation on the recipient's profile or any sense of the encouragement "traveling" to them.

7. **Prayer Wall "Praying for you" lacks weight**: Tapping "Pray for this" increments a counter silently. This is a deeply meaningful spiritual action that deserves more ceremony — perhaps a brief prayer animation, a haptic pulse, or a visual ripple.

## 3.3 Missed Delight Opportunities

1. **Mood check-in orbs could have ambient sound**: A soft tone corresponding to each mood (lower for Struggling, higher for Thriving) when selecting would create an emotional connection.

2. **Breathing exercise lacks ambient audio**: The 4-7-8 breathing exercise has a chime and voice guidance but no ambient soundscape. Pairing it with an ambient scene from the Music feature would create a more immersive experience.

3. **Scripture display has no reveal animation**: Verses appear with a basic fade-in. A word-by-word or line-by-line reveal (like the KaraokeText component already built for prayers) would create a more contemplative reading moment.

4. **No transition between features**: Moving from Prayer to Journal shows "Journal about this ->" but the transition is an instant tab switch. A brief cross-fade or contextual animation would make the journey feel more intentional.

5. **Dashboard widgets appear instantly**: On initial load, all widgets pop in simultaneously. A staggered entrance animation (like the Journey section on landing) would feel more polished.

6. **Level-up progress bar has no micro-animation**: The progress bar fills based on points but doesn't animate when new points are earned. A brief fill animation with a subtle glow would make earning points feel more rewarding.

7. **Badge grid is static**: Locked badges sit silently with no interaction. Tapping a locked badge could show a tooltip with the unlock criteria and current progress toward it.

8. **No seasonal or time-based content**: The app has time-aware greetings but no seasonal themes, special holiday content, Advent calendars, Lent devotionals, or time-of-year scripture selections.

9. **No haptic feedback**: On mobile, meaningful actions (mood selection, prayer generation, badge unlock) could use `navigator.vibrate()` for subtle haptic confirmation.

10. **Sleep timer completion is silent**: When the sleep timer ends, audio just stops. A brief notification or soft chime (even if quiet) would let a still-awake user know the timer completed rather than wondering if something broke.

## 3.4 Flow Continuity

**Strengths**:
- Cross-tab CTAs in Daily Hub ("Journal about this ->", "Continue to Pray ->") create deliberate feature bridges
- Quick Actions on dashboard provide 4-button hub for daily practices
- Activity checklist visually connects all 6 features into one daily journey
- Meditation completion screen offers CTAs to try other practices

**Gaps**:
- **Music and Daily Hub are disconnected**: There's no "Play ambient sounds while you journal" suggestion or automatic ambient pairing for meditations
- **Prayer Wall and Daily are disconnected**: Posting on the Prayer Wall doesn't suggest "Now pray about this" and vice versa
- **Local Support is isolated**: No connection between finding a church and any other feature. Could suggest "Journal about your visit" or "Pray for this church"
- **Insights page is view-only**: The mood insights show patterns but don't suggest actions ("You tend to feel better on days you meditate — try starting a streak")
- **Friends and activities don't cross-pollinate**: There's no "Pray together" feature, shared journal prompts, or collaborative meditation sessions

## 3.5 Emotional Arc

**Current state**: The app feels like a **well-organized toolkit** more than a **guided journey**. Each feature is polished in isolation, but the overall experience doesn't build a sense of narrative progression through a day.

**What's working**:
- The mood check-in as a daily entry point creates a personal, vulnerable moment
- The verse display after mood selection is a meaningful comfort bridge
- The gamification system (streaks, points, levels, badges) provides long-term motivation
- Crisis detection and resources show genuine care for user safety

**What could strengthen the emotional arc**:
- A "daily devotional" flow that guides users through mood -> verse -> prayer -> journal -> meditation as one connected experience rather than 6 separate tools
- End-of-day reflection prompts based on the morning mood and activities completed
- Weekly "God moments" summaries that help users see spiritual growth patterns they might miss
- Ambient sound that persists as background across features (not just on the Music page) to create a continuous worship atmosphere
- Seasonal progressions that make the app feel alive and connected to the church calendar
- More visible emotional response to user actions — when someone prays for another person, journals a breakthrough, or completes their first meditation, the app should visually "rejoice" with them

---

# Appendix: Technical Summary

## Codebase Stats

| Metric | Value |
|--------|-------|
| Total source files | 301 |
| Total test files | 227 |
| Total source LOC | 38,682 |
| Total test LOC | 29,357 |
| Components | 177 files |
| Custom hooks | 36 files |
| Services | 11 files |
| Type definitions | 8 files |
| Constants | 11 files |
| NPM dependencies | 29 (15 production, 14 dev) |
| Routes | 38 defined |
| Custom animations | 24 keyframes |
| Custom colors | 22 Tailwind extensions |

## Key Technology Decisions
- **React 18** with concurrent features
- **TypeScript 5.6** strict mode
- **Vite 5** for build tooling
- **TailwindCSS 3.4** (JIT, mobile-first)
- **Vitest 4** for testing
- **React Router 6** for routing
- **React Query 5** (minimal usage, Phase 3 expansion)
- **Recharts 3** for data visualization
- **Leaflet** for maps
- **Lucide React** for icons
- **Web Audio API** for ambient sounds
- **Speech Synthesis API** for TTS
- **No UI component library** (all custom)
- **No CSS-in-JS** (pure Tailwind + custom CSS)
- **No state management library** (Context API + localStorage)
