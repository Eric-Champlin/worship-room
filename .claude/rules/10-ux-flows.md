---
paths: ["frontend/**"]
---
 
## UX Flows
 
Detailed user experience flows for every major feature. Read this file before implementing or modifying any user-facing flow.
 
---
 
## Navigation Structure
 
### Desktop Navbar (Logged Out)
 
```
[Worship Room logo]   Daily Hub   Bible   Grow   Prayer Wall   Music   [Local Support ▾]   [Log In]  [Get Started]
```
 
**Top-level links:** Daily Hub, Bible, Grow, Prayer Wall, and Music — all always visible, no dropdowns. Bible links to `/bible` (BibleBrowser). Grow links to `/grow` (Reading Plans + Challenges).
 
**"Local Support" dropdown** (clickable label goes to `/local-support/churches`; dropdown expands on hover/click):
 
```
├── Churches
├── Counselors
├── Celebrate Recovery
```
 
### Desktop Navbar (Logged In)
 
```
[Worship Room logo]   Daily Hub   Bible   Grow   Prayer Wall   Music   [Local Support ▾]   [🔔]  [Avatar ▾]
```
 
**Notification bell** (🔔): Lucide `Bell` icon. Badge count for unread notifications (red circle, white text, top-right). Only shows when count > 0. Click opens dropdown panel (see Notification Flow below).
 
**Avatar dropdown**:
 
```
├── Dashboard
├── Friends
├── My Bible
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
Bible
──────────────
Grow
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
Bible
──────────────
Grow
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
My Bible
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
 
**BibleReader exception:** The Navbar is NOT mounted on the BibleReader page (`/bible/:book/:chapter`). The BibleReader uses its own `ReaderChrome` component with reader-specific top and bottom toolbars. See "Bible Reader Flow" section below.
 
---
 
## Landing Page Structure
 
Round 3 redesign (HP-1 through HP-15) established the current structure. All sections sit on the dark `bg-hero-bg` background with thin `border-white/[0.08] max-w-6xl mx-auto` dividers between each major section.
 
```
1. Navbar (transparent glassmorphic — Daily Hub, Bible, Grow, Prayer Wall, Music, Local Support dropdown)
2. HeroSection (dark purple gradient, "How're You Feeling Today?", typewriter input → /daily?tab=pray, quiz teaser link scrolls to #quiz)
3. JourneySection (7-step vertical timeline: Devotional → Pray → Journal → Meditate → Music → Prayer Wall → Local Support)
   ─── section divider ───
4. StatsBar (6 animated scroll-triggered counters: 50 Devotionals, 10 Reading Plans, 24 Ambient Sounds, 6 Meditation Types, 5 Seasonal Challenges, 8 Worship Playlists)
   ─── section divider ───
5. DashboardPreview ("See How You're Growing" — 6 locked preview cards with blurred mockup + clear icon/title/description, "Create a Free Account" CTA)
   ─── section divider ───
6. DifferentiatorSection ("Built for Your Heart" — 6 competitive advantage cards)
   ─── section divider ───
7. StartingPointQuiz (id="quiz" — 5-question points-based quiz, result card routes to recommended feature)
   ─── section divider ───
8. FinalCTA ("Your Healing Starts Here" — no glow orb, "Get Started — It's Free" button with white shadow → auth modal)
9. SiteFooter (nav columns, crisis resources, app download badges, "Listen on Spotify" badge, accessibility statement link, copyright)
```
 
See `09-design-system.md` § "Round 3 Visual Patterns" for the visual specs (glow opacities, frosted card styles, section heading treatment).
 
---
 
## First-Run Welcome Flow (BB-34)
 
For visitors who have never used Worship Room before, a single-screen welcome card appears once and never again. **It is not a tour, not a quiz, not an account gate, and not a feature walkthrough.**
 
### Detection
 
- New localStorage key `wr_first_run_completed` (stores a timestamp when the user dismisses or completes the welcome).
- If the key is absent, the user is on their first run.
- If the key is present, the welcome never shows again on any future visit.
 
### Trigger conditions
 
The first-run welcome appears ONLY when ALL of the following are true:
 
1. `wr_first_run_completed` is absent
2. The user is on the home page (`/`) or Dashboard (logged-in version of `/`)
3. The current route was reached without a deep link (no path beyond `/`, no `?verse=`, no `?tab=`, no `?mode=`)
 
**The welcome does NOT appear on deep-linked routes.** A user who arrives via a shared Bible verse URL (`/bible/john/3?verse=16`) sees the verse, not the welcome. A user who arrives at `/daily?tab=pray` from a shared link sees the Pray tab, not the welcome. This is non-negotiable — deep links are for users who came for a specific thing, and a welcome modal would block their actual goal.
 
### The welcome card
 
A single FrostedCard centered on the page with:
 
- A warm one-line headline ("Welcome to your quiet place" or similar)
- 2-3 sentences of brand voice describing what Worship Room is
- 3-4 tappable "start here" cards with icons and short labels:
  - **Read a verse** → `/bible`
  - **Today's devotional** → `/daily?tab=devotional`
  - **Pray** → `/daily?tab=pray`
  - **Browse the Bible** → `/bible` (alternative entry; could be combined with "Read a verse")
- An X close button in the top-right corner
- An optional "Take the Starting Point Quiz" link below the start-here cards (links to `#quiz` on the homepage)
 
### Dismissal
 
- Tap the X button → set `wr_first_run_completed` to a timestamp, fade out the card.
- Tap any "start here" card → set `wr_first_run_completed` to a timestamp AND navigate to the destination.
- The card cannot be dismissed by clicking outside it (avoids accidental dismissal).
 
### What the first-run welcome explicitly is NOT
 
- NOT a multi-step tour or walkthrough
- NOT a forced account creation flow
- NOT a personality quiz on first run (the existing Starting Point Quiz is OPTIONAL via the link, not mandatory)
- NOT an email capture
- NOT a celebration animation or "you unlocked X" toast
- NOT a getting-started checklist
 
The welcome is a single screen that takes 5 seconds to read and 1 tap to leave.
 
---
 
## Dashboard UX Flow (Logged-In Users) — Phase 2.75
 
**Full specifications in `_plans/_archive/dashboard-growth-spec-plan-v2.md`.** (Archived after Phase 2.75 completion — kept for historical reference and shared-data-model lookups.)
 
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
 
**Echo card (BB-46):** A small `EchoCard` mounts between the hero greeting and the VOTD card. The card surfaces a single verse the user has engaged with in the past — typically a recent highlight, a verse they memorized, or a verse from a significant past reading day. Format: "30 days ago you highlighted this" + verse reference + verse text. Tappable, navigates to the verse via BB-38 deep link. **Renders nothing if the user has zero history** (brand-new users see no echo card placeholder).
 
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
- **Echo card**: Renders nothing (no placeholder)
 
All empty states use the canonical `FeatureEmptyState` component standardized in BB-34. See `09-design-system.md` § "First-Run & Empty State Components".
 
---
 
### Friends & Leaderboard Flow — Phase 2.75
 
**Route:** `/friends` with two tabs: Friends (default) | Leaderboard (`?tab=friends|leaderboard`).
 
**Friends tab:** Search bar → invite section (link + email) → pending requests → friend list → "People you may know" from Prayer Wall.
 
**Leaderboard tab:** Friends (default, weekly + all-time toggle) | Global (weekly only, display names only, resets Monday). Current user highlighted. Dashboard widget shows top 3 + "See all."
 
### Notification Flow — Phase 2.75 + BB-41
 
**Bell icon in navbar** → dropdown panel (dark frosted glass, ~360px desktop, full-width mobile). Notification types include: encouragement, friend_request, milestone, friend_milestone, nudge, weekly_recap, level_up, daily_verse (BB-41), streak_reminder (BB-41). Each: icon + message + relative timestamp. Unread dot indicator. "Mark all as read" link.
 
In-app notifications (the bell) and BB-41 push notifications (system-level) are independent channels — user preferences in `wr_notification_prefs` control push delivery. Some notification types appear in both channels (daily verse, streak reminders); some only in the bell (friend interactions).
 
### Settings Flow — Phase 2.75 + BB-41
 
**Route:** `/settings` (from avatar dropdown). Left sidebar desktop / top tabs mobile. Sections:
 
- **Profile** — name, avatar, bio stub
- **Notifications** — per-channel in-app toggles + BB-41 push notification preferences (enable/disable push, daily verse delivery time, streak reminder enable/disable)
- **Privacy** — 6 controls: global leaderboard visibility, activity status, nudge permissions, streak/level visibility, blocked users
- **Account** — email, password, delete account
 
The Notifications section also includes the "Enable push notifications" entry point that triggers the browser permission flow. This is the explicit opt-in path; the contextual prompt in BibleReader is the implicit path.
 
### Social Interactions — Phase 2.75
 
- **Encouragements:** 4 presets ("🙏 Praying for you", "🌟 Keep going!", "💪 Proud of you", "❤️ Thinking of you"). 3/day/friend limit.
- **Nudges:** 1/week, only for friends inactive 3+ days. Always gentle: "❤️ [Name] is thinking of you." Users can disable in privacy settings.
- **Milestone feed:** "🔥 Sarah hit a 30-day streak!" in dashboard widget.
- **Weekly recap:** Monday card: "Your friend group prayed 23 times... You contributed 34%."
 
### Streak Reset Messaging Guidelines
 
**Never punitive.** When streak resets: "Every day is a new beginning. Start fresh today." No mention of how many days were lost. No red/negative colors. The longest streak record persists as encouragement.
 
This anti-pressure tone applies to BB-41 streak reminder push notifications too. Acceptable copy: "Still time to read a verse today if you'd like." Unacceptable copy: "Don't break your streak!"
 
---
 
### Demo Mode & Auth Gating
 
See [02-security.md](02-security.md) for the canonical Demo Mode Data Policy and Auth Gating Strategy (what requires login, what works without login, implementation pattern).
 
---
 
### Daily Hub Architecture (`/daily`)
 
The Daily Hub is a single-page tabbed experience at `/daily`. Old routes (`/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional`) redirect here with the appropriate `?tab=` query param.
 
**Page-level visual architecture (Spec Y + Wave 7):**
 
The DailyHub root is structured as:
 
```
<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
  <HorizonGlow />              {/* atmospheric purple glow layer, z-0 */}
  <Navbar />                   {/* z-10 */}
  <Hero section>               {/* z-10, time-aware greeting only */}
  <Tab bar>                    {/* z-40 sticky */}
  <Tab content>                {/* z-10, transparent backgrounds */}
  <SongPickSection />          {/* z-10, transparent */}
  <SiteFooter />               {/* z-10 */}
  <DailyAmbientPillFAB />      {/* z-40 fixed bottom-right */}
</div>
```
 
There is **no per-section GlowBackground** anywhere on the Daily Hub. The HorizonGlow layer provides continuous atmospheric depth across all tab content and section boundaries. Tab content components use plain `<div>` wrappers with transparent backgrounds. See `09-design-system.md` § "Daily Hub Visual Architecture" for full detail.
 
**Tab Structure:**
 
- 4 tabs: **Devotional** (default) | **Pray** | **Journal** | **Meditate** (query param: `?tab=devotional|pray|journal|meditate`)
- Pill-shaped tab container (rounded-full, frosted glass border). Active tab shows filled pill with purple glow shadow. Inactive tabs show hover fade effect. No underline.
- Tab content is mounted at all times but hidden (preserves state between switches)
- Sticky tab bar appears below hero on scroll (via Intersection Observer sentinel)
- Tab transitions use opacity crossfade. Route flicker / white flash is prevented by setting `html`, `body`, and `#root` backgrounds to `#08051A` in `src/index.css` (PageTransition.tsx was removed in Wave 2).
- **Tab state is derived from the URL `?tab=` query param on every render** (not stored in `useState`). Deep links to `/daily?tab=pray|journal|meditate` work correctly for both logged-in and logged-out users. There is no logged-out redirect that would force users back to the devotional tab.
 
**Hero Section (above tabs):**
 
The hero section contains **only the time-aware greeting** — a single `<h1>` styled with `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`). The greeting reads "Good Morning!" / "Good Afternoon!" / "Good Evening!" when logged out, or "Good Morning, [Name]!" when logged in. The hero sits at `z-10 relative` over the HorizonGlow layer.
 
**The hero does NOT contain:**
- A Verse of the Day card (the `VerseOfTheDayBanner` was removed from the Daily Hub in commit `4da1b34` as part of the daily-hub-hero-redesign — the component still exists in the codebase for use elsewhere but is not mounted in DailyHub.tsx)
- A VerseSharePanel
- Any decorative cards
- Any subtitle, tagline, or supporting copy
 
The intentional minimalism is part of the Spec Y "looking out into space" atmospheric design — the HorizonGlow does the visual work, and the greeting alone sets the tone before the user engages with the tabs. Do NOT add cards or banners to the hero without an explicit spec; the minimalism is load-bearing.
 
**Echo card on Devotional tab (BB-46):** The devotional tab includes a single `EchoCard` mounted below the devotional content, before the footer area. Same component as the Dashboard echo card — surfaces a verse from the user's past engagement. Renders nothing if the user has no history. See "Verse Echoes Flow" below.
 
**Below Tab Content (always visible):**
 
1. **SongPickSection** — Centered single-column layout: "Today's" (GRADIENT_TEXT_STYLE) + "Song Pick" (white) heading stacked vertically, equal-width treatment via tracking adjustment, Spotify 352px iframe centered below, `max-w-2xl` container. Transparent background — no GlowBackground.
2. **SiteFooter** — Standard footer with "Listen on Spotify" badge
 
**Tab content padding pattern (consistent across all 4 tabs):**
 
Each tab content component uses a plain wrapper:
 
```
<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
  {/* tab-specific content */}
</div>
```
 
No headings on Pray, Journal, or Meditate tabs (the "What's On Your Heart/Mind/Spirit?" headings were removed in Wave 5 because the content speaks for itself). The Devotional tab also has no heading — it leads directly into the date navigation and devotional title.
 
**Persistent Ambient Pill (DailyAmbientPillFAB) — Wave 7:**
 
A floating pill button is mounted as the last child of the DailyHub root, anchored to the bottom-right of the viewport via `position: fixed` with `env(safe-area-inset-*)` for iOS/Android safe areas. It is:
 
- Visible on every Daily Hub tab (Devotional, Pray, Journal, Meditate)
- Auto-hidden via `opacity-0 pointer-events-none` when `state.drawerOpen === true` (chat-widget pattern — when the AudioDrawer is open, the FAB fades out)
- A unified entry point to the AudioDrawer right-side flyout. Clicking the pill in either idle or active state dispatches `OPEN_DRAWER`.
- NOT mounted on meditation activity sub-pages (`/meditate/breathing`, `/meditate/soaking`, etc.) because those pages have their own transport controls that would conflict with the bottom-right anchor.
 
**Cross-Feature Context Passing:**
 
The Daily Hub supports passing context between tabs via the `PrayContext` state (held in `DailyHub.tsx`). When a user clicks a cross-feature CTA from one tab to another, the destination tab receives the originating context. See "Cross-Feature Flow" section below for full detail.
 
---
 
### Devotional Tab Flow
 
1. User lands on `/daily?tab=devotional` (default tab)
2. Date navigation strip at top (← Today →) with day-of-week and date
3. Devotional title (no theme tag pill — removed in Wave 5)
4. **Passage** rendered in Tier 2 scripture callout: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`
5. **Reflection body** rendered in Tier 1 FrostedCard with `text-white leading-[1.75-1.8] text-[17px] sm:text-lg`, `max-w-2xl` line length. NOT italic. (Spec T)
6. **Saint quote** rendered in Tier 1 FrostedCard, positioned BELOW the reflection body (Wave 5 reordered this — the quote used to appear above the passage)
7. **Reflection question** rendered in Tier 1 FrostedCard with the question prominent, and an embedded "Journal about this question" white pill button INSIDE the card (Spec O — the CTA is part of the question card, not a separate section below)
8. **Authentic Pray flow CTA** (Spec P) — "Pray about today's reading" white pill button. The static "Closing Prayer" section was removed; clicking this button uses an enhanced `getMockPrayer` function that detects the devotional context and generates a contextual prayer.
9. **Meditate on this passage** white pill button (Wave 5 — restyled to match other CTAs). Clicking this navigates to `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` (Spec Z — see "Verse-Aware Meditation Flow" below).
10. **EchoCard (BB-46)** — Below the devotional content, before the footer. Surfaces a verse from past engagement. Renders nothing if no history.
 
**No "Closing Prayer" section** — removed in Spec P. The authentic Pray flow replaces the static closing prayer.
 
**Completion tracking:** `markDevotionalComplete()` fires after the user has scrolled past the reflection body or interacts with one of the CTAs.
 
---
 
### Cross-Feature Flow (Devotional → Journal/Pray)
 
**Devotional → Journal flow (Spec B + Spec O + Spec X):**
 
1. User reads the devotional and reaches the reflection question card
2. Clicks the embedded "Journal about this question" white pill (inline with the question card)
3. `DevotionalTabContent` calls `onSwitchToJournal(theme, customPrompt, snapshot)` where:
   - `theme` is the devotional theme
   - `customPrompt` is the reflection question text (with "Something to think about today: " stripped)
   - `snapshot` is a `DevotionalSnapshot` object containing the full passage, reflection body, question, and quote (Spec X)
4. `DailyHub.tsx` stores this in `prayContext` state with `from: 'devotional'`, then navigates to `/daily?tab=journal`
5. Journal tab renders. **`DevotionalPreviewPanel` mounts at the top** of the page (Spec X) — sticky `top-2 z-30`, collapsed by default, showing a small pill with the devotional title + reference + chevron
6. User can:
   - Click the chevron to expand the panel — reveals the full passage, reflection question, reflection body, and quote in an animated max-height transition (300ms `decelerate`). Internal scroll capped at `max-h-[50vh]` so long devotionals don't push the textarea off-screen.
   - Dismiss the panel via the X close button (Wave 6) — clears `contextDismissed` state, panel disappears, user can write about something else
7. Journal mode is set to **Guided** automatically with the reflection question as the prompt
8. The "Try a different prompt" link is HIDDEN when `prayContext.from === 'devotional'` (Wave 6) — it would be irrelevant since the prompt IS the reflection question
9. The journal prompt renders in **Inter sans, NOT italic, white text, leading-relaxed** (Wave 5 fixed the previous Lora italic styling)
10. User writes their entry. Draft auto-saves to `wr_journal_draft` localStorage every 1s.
11. On save: `markJournalComplete()` fires; entry persists.
 
**Devotional → Pray flow (Spec B + Spec P + Spec X):**
 
Same pattern with `onSwitchToPray`. The Pray tab also mounts `DevotionalPreviewPanel` at the top with the same sticky/collapsible behavior. The textarea is pre-filled with a contextual prayer prompt generated by `getMockPrayer` that references the devotional theme and passage.
 
**Both flows support draft conflict detection:** if the user already has a draft in `wr_journal_draft` or `wr_prayer_draft`, a confirmation dialog appears asking whether to overwrite the draft with the devotional context or keep their existing draft.
 
**Banner removal (Wave 6):** The earlier "Reflecting on today's devotional" context banner that appeared above the textarea was REMOVED. The DevotionalPreviewPanel handles all dismissal/visibility now via its X close button. No standalone context banner exists for either devotional-context flow.
 
---
 
### Prayer Generation Flow
 
1. User lands on `/daily?tab=pray`
2. 3 starter chips: "I'm struggling with...", "Help me forgive...", "I feel lost about..." (chip text is white per Wave 5)
3. **Textarea:** `rows={8} min-h-[200px] max-h-[500px] resize-y` (Spec U — larger than the original size). Static white box-shadow glow `shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)]` (Wave 7). White border. NO animation (the previous `animate-glow-pulse` was removed in Wave 6 because the pulsing motion competed with the user's focus).
4. 500 char limit, character count below textarea
5. **Draft auto-save:** localStorage `wr_prayer_draft` with 1s debounce (Spec J). "Draft saved" indicator with `CheckCircle2` icon fades after 2s.
6. **Client-side crisis keyword check:** `CrisisBanner` shows crisis resources if detected
7. **"Help Me Pray" white pill button** matching the homepage primary CTA pattern (Spec U) — auth-gated (logged out → auth modal)
8. Auth modal subtitle reads "Your draft is safe — we'll bring it back after" (Spec V) so users know their draft persists across the auth flow
9. Loading state → mock prayer with `KaraokeText` word-by-word reveal
10. Action buttons: Copy / Read Aloud / Save / Share
11. "Journal about this →" CTA (switches to Journal tab with context)
12. **Guided Prayer Sessions** section below: 8 cards (Wave 6 — `min-h-[260px]` with no `line-clamp`, full descriptions render). 4-column × 2-row grid on desktop, 2-column on tablet, horizontal carousel on mobile.
13. Completion tracked: `markPrayComplete()`
 
---
 
### Journaling Flow
 
1. User lands on `/daily?tab=journal`
2. **Mode toggle:** Guided | Free Write (persisted to `wr_journal_mode` localStorage)
3. **Guided mode:** prompt card in Inter sans (NOT italic), white text, leading-relaxed (Wave 5). Includes "Try a different prompt" link UNLESS `prayContext.from === 'devotional'` (Wave 6) — devotional-context users see the reflection question and shouldn't be offered alternatives.
4. **Free Write mode:** plain textarea, no prompt. The "Try a different prompt" link is hidden in Free Write mode entirely (Wave 6).
5. **Textarea:** auto-expanding, static white glow shadow matching the Pray tab (Wave 7). 5000 char limit.
6. **Draft auto-save:** localStorage `wr_journal_draft` with 1s debounce (Spec J). "Draft saved" indicator (Spec V).
7. Crisis keyword check on input
8. **DevotionalPreviewPanel** mounts at the top when arriving from devotional context (Spec X)
9. **"Save Entry" white pill button** matching the homepage primary CTA pattern (Wave 5) — auth-gated
10. After saving: entries list, "Write another", "Done journaling" toggle → CTA cards
11. "Reflect on my entry" — auth-gated AI reflection
12. Completion tracked: `markJournalComplete()`
 
---
 
### Meditation Flow
 
1. User lands on `/daily?tab=meditate`
2. 6 meditation cards in 2-column grid (Breathing, Soaking, Gratitude, ACTS, Psalms, Examen)
3. **Auth-gated**: card click when logged out → auth modal
4. Logged in: navigates to meditation sub-page
5. Green checkmark on completed cards
6. All-6-complete celebration banner (golden glow)
7. Completion tracked per type
8. **Persistent ambient pill FAB** is visible bottom-right throughout (Wave 7)
 
---
 
### Verse-Aware Meditation Flow (Spec Z — shipped)
 
When a user clicks "Meditate on this passage" from a devotional, the verse context flows through to the individual meditation sub-page.
 
**Logged-in flow:**
 
1. User clicks "Meditate on this passage" white pill on the Devotional tab
2. Link navigates to `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` (URL params encode the verse data)
3. `DailyHub.tsx` reads the URL params and constructs a `pendingVerse` object: `{ reference, text, theme }`
4. `MeditateTabContent` receives `pendingVerse` as a prop
5. **Verse banner appears at the top of the meditate tab** showing:
   - "📖 MEDITATING ON" label
   - The passage reference
   - The italicized verse text in quotes
   - "Recommended: Scripture Soaking or Breathing Exercise" hint
   - X close button to dismiss
6. **Two meditation cards are visually highlighted** as verse-compatible:
   - **Scripture Soaking** — gets a "Recommended" badge (top-right, primary purple background) and a primary ring + glow shadow
   - **Breathing Exercise** — same treatment
7. Other 4 cards (Gratitude, ACTS, Psalms, Examen) remain visible and clickable but don't highlight or consume the verse
8. Clicking **Scripture Soaking** navigates to `/meditate/soaking?verse=...&verseText=...&verseTheme=...` — note `verseRef` from the meditate tab URL becomes `verse` for the soaking sub-page (avoids collision with soaking's existing `verse` param)
9. ScriptureSoaking displays the devotional passage as the active verse (uses the existing URL param consumption from Spec H)
10. Clicking **Breathing Exercise** navigates to `/meditate/breathing?verse=...&verseText=...` — BreathingExercise renders the devotional verse instead of its default scripture during the breathing pattern
11. Clicking any of the other 4 meditations navigates without verse params — those meditations run their normal flow
 
**Logged-out flow:**
 
1. User clicks "Meditate on this passage" while logged out
2. Lands on `/daily?tab=meditate?verseRef=...` — the URL params are preserved
3. Verse banner appears at the top (visible to logged-out users)
4. User clicks a verse-compatible meditation card
5. Auth modal triggers (existing meditation auth gate)
6. After login, user lands on the meditation sub-page WITH the verse params intact
7. Meditation sub-page consumes the verse correctly
 
**Banner dismissal:**
 
- User clicks the X on the verse banner → banner disappears, card highlighting disappears, clicking a card no longer passes verse params
 
**Tab switching cleanup:**
 
- When user navigates away from the meditate tab (to devotional/pray/journal), `DailyHub.tsx` clears `verseRef`, `verseText`, `verseTheme` from the URL params via `setSearchParams` with `{ replace: true }`. Returning to the meditate tab will not show the banner unless the user clicks "Meditate on this passage" again.
 
**Page refresh preservation:**
 
- Refreshing the browser preserves the URL params, so the verse banner survives a refresh. This is intentional — users sometimes refresh by accident and losing context would be bad UX.
 
**Verse-compatible meditations:** Only Scripture Soaking and Breathing Exercise consume the verse. Gratitude, ACTS, Psalms (which has its own scripture), and Examen are NOT verse-compatible by design — each of those meditations has its own structured content that an arbitrary devotional verse would not fit.
 
---
 
## Bible Reader Flow
 
The BibleReader at `/bible/:book/:chapter` is the primary scripture reading surface and was substantially rebuilt during the Bible wave (BB-0 through BB-29) and extended throughout the polish cluster (BB-30 through BB-46). It is a documented layout exception — uses `ReaderChrome` instead of `Navbar`/`SiteFooter`.
 
### Entry points
 
- `/bible` (BibleBrowser) → tap a book → tap a chapter → BibleReader
- Daily Hub Devotional tab → "Meditate on this passage" → Scripture Soaking → tap the reference → BibleReader
- Search results (BB-42) → tap a verse → BibleReader scrolled to that verse
- Deep link from anywhere: `/bible/john/3?verse=16` (BB-38)
- Echo card (BB-46) → tap → BibleReader at the echo's verse
- Memorization deck (BB-45) → tap a card → BibleReader at the card's verse
- My Bible heatmap (BB-43) → tap a chapter cell → BibleReader
- Push notification (BB-41) → tap → BibleReader at the daily verse
- Resume Reading card on `/bible` → tap → BibleReader at last-read position
 
### Reader chrome
 
- **Top toolbar:** theme switcher (`midnight` / `parchment` / `sepia`), type size (s/m/l/xl), line height (compact/normal/relaxed), font family (serif/sans), focus mode toggle, back button, chapter selector, AI Explain button, AI Reflect button.
- **Right-edge icon cluster (top toolbar):** AudioPlayButton (BB-26 — opens the bottom-sheet audio player, last icon in the cluster after Books).
- **Bottom toolbar:** drawer trigger (highlights/notes/bookmarks/journal entries), verse number toggle.
- All preference selections persist to localStorage (`wr_bible_reader_theme`, `wr_bible_reader_type_size`, `wr_bible_reader_line_height`, `wr_bible_reader_font_family`).
 
### Focus mode
 
- Enabled by default (`wr_bible_focus_enabled = 'true'`).
- After `wr_bible_focus_delay` ms of inactivity (default 6 seconds, configurable to 3000/6000/12000), the top and bottom toolbars dim.
- Any tap, scroll, or keyboard interaction resets the timer and brings the chrome back to full opacity.
- The skip-to-main-content link remains accessible regardless of focus mode state.
- Per-user override via the focus mode toggle in the top toolbar.
 
### Verse interaction
 
- **Tap or long-press a verse** → verse action menu opens with: Highlight (4 colors), Bookmark, Add Note, Add Journal Entry, Add to Memorize (BB-45), Share, Copy.
- **Highlights (BB-7):** Tap a color to highlight. Highlights persist via `useHighlightStore()` and appear in the My Bible activity feed.
- **Bookmarks (BB-7):** Toggle to bookmark/unbookmark. Persists via `useBookmarkStore()`.
- **Notes (BB-8):** Opens the note composer. Notes are range-based (can span multiple verses) with a 10K char limit. Persists via `useNoteStore()`.
- **Journal entries (BB-11b):** Opens a journal composer linked to the verse range. Persists via `useJournalStore()`.
- **Add to Memorize (BB-45):** Captures the verse text into a memorization card. If already in the deck, the action becomes "Remove from Memorize". See "Verse Memorization Flow" below.
- **Multi-verse range selection:** If the BibleReader exposes a range selection, all actions apply to the range. A single memorization card represents the range with `startVerse` and `endVerse` and concatenated text.
 
### AI Explain Panel (BB-30)
 
- Triggered from the top toolbar "Explain" button.
- Opens a side panel (desktop) or bottom sheet (mobile) with the explanation streaming in from Gemini 2.5 Flash Lite via the BB-32 cache layer.
- First request hits Gemini, subsequent requests for the same verse range return from the local `bb32-v1:explain:*` cache (7-day TTL).
- Explanations are short (3-4 paragraphs), theologically careful, anti-pressure tone — never claim divine authority, never make denominational arguments.
- Loading state: skeleton text + subtle shimmer. Error state: gentle copy ("We couldn't load the explanation right now") with a retry button.
- The panel can be dismissed via X button or by tapping outside on desktop. State persists in `wr_bible_drawer_stack` for cross-chapter continuity.
 
### AI Reflect Panel (BB-31)
 
- Triggered from the top toolbar "Reflect" button.
- Same panel surface and same Gemini model as Explain, but generates first-person reflection prompts instead of explanations.
- Prompts are personal: "What in this passage speaks to your current circumstances?" rather than "This passage means X."
- Cached separately from Explain in `bb32-v1:reflect:*`.
- Same anti-pressure voice, same loading/error states.
 
### Notification Permission Prompt (BB-41)
 
After the user completes a reading session (chapter scroll past 80% + 3+ seconds spent on the chapter), the BibleReader may show the BB-41 notification permission prompt:
 
- Conditions: it's the user's second or later reading session of the day (not the first), `wr_notification_prompt_dismissed` is not set, and the browser supports push notifications.
- A small non-modal card appears at the bottom of the screen: "Want a daily verse to keep this rhythm going? Enable notifications" with "Enable" and "Maybe later" buttons.
- "Enable" → triggers the browser permission flow → on grant, creates a Push API subscription via `lib/notifications/` and stores it in `wr_push_subscription`. On deny or grant, sets `wr_notification_prompt_dismissed = "true"`.
- "Maybe later" → sets `wr_notification_prompt_dismissed = "true"` and the prompt never appears again.
- The prompt is never shown on a user's first reading session of the day — that's too early to pitch a permission ask.
 
### iOS-specific behavior
 
- iOS Safari before 16.4 does not support web push at all. The BB-41 prompt is never shown on these versions.
- iOS Safari 16.4+ supports push only for PWAs added to the home screen. The prompt shows a modified message with PWA install instructions, mirroring BB-39's install prompt approach.
 
### Reading session tracking
 
- On chapter mount, BibleReader writes to `wr_chapters_visited` with today's date and the `{ book, chapter }` pair via `useChapterVisitStore()`.
- This data feeds the BB-43 reading heatmap and the Bible progress map on the My Bible page.
- The store caps at 400 days of history; older entries are pruned.
 
---
 
## Personal Layer Overview (My Bible at `/bible/my`)
 
The My Bible page consolidates everything the user has personally engaged with into a single feed. It is the canonical "your stuff" surface for the Bible features.
 
### Page structure (top to bottom)
 
1. **Page header** — "My Bible" + brief description
2. **Reading Heatmap (BB-43)** — GitHub-contribution-style 365-day grid
3. **Bible Progress Map (BB-43)** — All 66 books with visual chapter completion indicators
4. **Memorization Deck (BB-45)** — Flip card grid for verses the user is memorizing
5. **Activity feed** — Unified chronological feed of highlights, notes, bookmarks, and journal entries
 
The page reads from seven reactive stores via hooks: `useChapterVisitStore()`, `useHighlightStore()`, `useBookmarkStore()`, `useNoteStore()`, `useJournalStore()`, `useMemorizationStore()`, and `useEchoStore()`. **Components on this page must use the hooks, never local `useState` mirrors.** See `11-local-storage-keys.md` § "Reactive Store Consumption" for the BB-45 anti-pattern.
 
---
 
## Reading Heatmap Flow (BB-43)
 
A GitHub-contribution-style heatmap showing daily reading activity for the past year, mounted on the My Bible page.
 
### Visual
 
- A grid of cells, one per day, for the past 365 days
- Each cell is 8-12px on mobile, 12-14px on desktop, with subtle 2px rounded corners
- Empty cells (no reading): `bg-white/5`
- Active cells use a 4-step intensity scale based on chapter count read that day (1-2, 3-5, 6-10, 11+ chapters)
- Today's cell has a subtle border to mark the current day
- Month labels along the top, day-of-week labels along the left
- Total chapters read in the past year shown in a summary line below
 
### Interaction
 
- **Hover (desktop) or tap (mobile)** any cell → tooltip shows the date and a summary ("March 12, 2026 — 3 chapters read: John 3, Romans 8, Psalm 23")
- **Tap-and-hold** keeps the tooltip open on mobile
- **Tap a chapter reference** in the tooltip → navigates to that chapter via `/bible/<book>/<chapter>` (BB-38 deep link)
 
### Anti-pressure tone
 
- No "you missed N days" copy
- No streak shaming
- No completion percentage
- No comparative messaging ("you read less than last month")
- Sparse activity is treated as visually valid — gaps are not a failure state
- The summary line uses neutral framing: "245 days of reading in the past year" not "120 days missed"
 
### Data source
 
Reads from `useChapterVisitStore()` which aggregates `wr_chapters_visited`. The store is written to on every BibleReader chapter mount.
 
---
 
## Bible Progress Map Flow (BB-43)
 
A visual map of all 66 Bible books showing read/partially read/unread chapters, mounted on the My Bible page below the heatmap.
 
### Visual
 
- Two sections: Old Testament (39 books) and New Testament (27 books)
- Each book is a labeled row with chapter cells
- Cells are colored:
  - Unread chapter: muted gray
  - Partially read (e.g., highlights present but not flagged as fully read): light primary tint
  - Fully read: solid primary
- Books with all chapters read get a subtle completion indicator
- Hover/tap a chapter cell shows a tooltip with the chapter reference and read status
 
### Interaction
 
- **Tap any chapter cell** → navigates to that chapter via `/bible/<book>/<chapter>` (BB-38 deep link)
- **Tap a book name** → navigates to chapter 1 of that book
 
### Use case
 
The user wants to see how much of the Bible they've covered. The map answers "what should I read next?" by visually surfacing gaps. Same anti-pressure tone as the heatmap — sparse coverage is valid.
 
---
 
## Verse Memorization Flow (BB-45)
 
A quiet flip-card memorization feature on the My Bible page. **No quiz, no scoring, no spaced repetition** — closer to a notecard in your wallet than a Duolingo drill.
 
### Adding a card
 
**From the BibleReader verse menu:**
 
1. User taps or long-presses a verse in the BibleReader
2. The verse action menu opens with the existing actions (Highlight, Bookmark, Note, etc.)
3. BB-45 adds a new action: "Add to memorize" with a bookmark-with-flip icon
4. Tapping it captures the verse data and creates a card via `useMemorizationStore()`
5. If the verse is already in the deck, the action becomes "Remove from memorize" instead
6. **Multi-verse selection:** If the user has selected a range (e.g., Psalm 23:1-3), the action creates a single card with `startVerse: 1`, `endVerse: 3`, and concatenated text. The card displays "Psalm 23:1-3" as the reference.
 
**From the My Bible activity feed:**
 
1. User browses their existing highlights in the activity feed
2. Each highlight item has an "Add to memorize" affordance (icon button or menu item)
3. Tapping it promotes the highlight to a memorization card without requiring the user to navigate back to the BibleReader
 
### The deck
 
Mounted on the My Bible page between the BB-43 progress map and the activity feed.
 
- Cards rendered as a grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card has a front (reference) and a back (verse text)
- **Tap a card → flip animation reveals the back** (300ms `decelerate` easing per BB-33 animation tokens)
- Tap again → flip back to the front
- Long-press or menu icon on a card → "Remove from deck" confirmation
- Empty state: `FeatureEmptyState` component with friendly copy ("Cards you want to remember will live here") and a CTA pointing to the BibleReader
 
### What memorization deck does NOT do
 
- **No quiz mode.** The user reads the cards. They are not tested.
- **No scoring or completion tracking.** The card store records `reviewCount` and `lastReviewedAt` for sorting, but there's no "you mastered this verse" celebration.
- **No spaced repetition algorithm.** Cards are sorted by recency or alphabetically, never by "next review date."
- **No streak pressure.** Reviewing cards is not part of the reading streak system.
- **No notifications nudging review.** BB-41 notifications are limited to daily verse and reading streak; memorization is not a notification source.
- **No leaderboard or social comparison.** The deck is private.
 
The point is that memorization should feel like a quiet companion, not a productivity tool.
 
---
 
## Verse Echoes Flow (BB-46)
 
Contextual callbacks to verses the user has engaged with in the past, surfaced on the home page and the Daily Hub. **No new tracking** — the echo selection engine reads from existing user history (highlights, memorization, reading activity).
 
### Where echoes appear
 
1. **Home page / Dashboard** — A single `EchoCard` mounted between the hero greeting and the VOTD card
2. **Daily Hub Devotional tab** — A single `EchoCard` mounted below the devotional content, before the footer
 
Both surfaces use the same `EchoCard` component and the same `useEcho()` hook. Each surface shows at most one echo.
 
### The echo
 
A small frosted-glass card containing:
 
- A relative label: "30 days ago you highlighted this" / "You memorized this 2 weeks ago" / "From your reading on March 12"
- The verse reference (e.g., "John 3:16")
- The verse text (rendered in Lora serif for reading weight)
 
### Interaction
 
- **Tap the card** → navigates to the verse via BB-38 deep link (`/bible/<book>/<chapter>?verse=<n>`)
- **Tap the X (if shown)** → dismisses this specific echo. Dismissed echo IDs persist in `wr_echo_dismissals` via `useEchoStore()`. The selection engine excludes dismissed echoes from future picks.
 
### Selection engine
 
A pure TypeScript module at `frontend/src/lib/echoes/`. Inputs:
 
- Current date
- Current surface (home / daily hub)
- User history: highlights, memorization cards, reading activity
 
The engine scores candidate verses based on:
 
- Significance of the date interval (30 days, 7 days, 1 year — anniversary-style intervals score higher than random gaps)
- Source type (highlights and memorization weighted higher than passive reading)
- Recency tiebreaker (more recent within the same interval scores higher)
- Dismissal exclusion (anything in `wr_echo_dismissals` is filtered out)
 
Returns the top candidate, or `null` if there are zero candidates.
 
### Brand-new user behavior
 
A user with no history sees no echo card. The component renders nothing — **no placeholder, no "come back when you've read more" message, no first-run hint.** Echoes are a quiet feature that only exists for users who have something to be reminded of.
 
### Anti-pressure tone
 
- "30 days ago you highlighted this" — a quiet observation
- NOT "REMEMBER WHAT YOU HIGHLIGHTED?!" or "Don't forget your highlights!"
- The card is present-tense and reflective, never urgent
- Echoes are dismissable; users who don't want them can dismiss them and the engine respects that
 
---
 
## Full-Text Scripture Search Flow (BB-42)
 
Client-side full-text search across the entire WEB Bible, integrated into `/bible` via the existing `BibleSearchMode` component.
 
### Entry
 
1. User navigates to `/bible` (BibleBrowser)
2. Tap the search input at the top of the browser
3. The browser switches to search mode (URL becomes `/bible?mode=search`)
 
Alternatively, deep link directly to `/bible?mode=search&q=peace` to load search mode with a pre-filled query.
 
### Index loading
 
- The pre-built inverted index lives at `frontend/public/search/bible-index.json` and is generated at build time
- The index is loaded on demand the first time the user enters search mode
- Loading state: skeleton with shimmer
- The PWA service worker (BB-39) precaches the index so search works offline after the first visit
 
### Querying
 
- User types a query into the search input
- Debounced 200ms after last keystroke
- Tokenization matches the index: lowercase, punctuation stripped (except apostrophes inside words), 20 stopwords removed, light stemming for plurals/tense
- Multi-word queries are AND'd by default (all tokens must appear in the same verse)
- Phrase search (with quotes) matches exact sequences
 
### Results
 
- Verse text rendered with the matching tokens highlighted
- Reference shown above each verse (e.g., "Psalm 23:1")
- Results sorted by relevance (token frequency + position)
- Tap any result to navigate to the verse via BB-38 deep link
- Pagination or infinite scroll for large result sets
- Empty state: friendly "no results" copy with a suggestion to try a broader query
 
### Performance
 
- Target: sub-100ms query time for typical searches on the WEB Bible
- The index is loaded once per session and held in memory; subsequent queries are pure lookups
 
### Offline behavior
 
- Once the index is in the service worker cache, search works fully offline
- The Bible JSON files for results are also cached, so tapping a result navigates to a working chapter even without network
 
---
 
## PWA Install Flow (BB-39)
 
Worship Room is a real Progressive Web App. Users can install it to their home screen on iOS, Android, and desktop.
 
### The install prompt
 
Triggered after the user has visited the app at least 2-3 times (tracked via `wr_visit_count`). Surfaces as:
 
- A dismissible card on the Dashboard for logged-in users (`wr_install_dashboard_shown` flag prevents repeat showings)
- An entry point in the BibleReader settings drawer
- The browser's native install affordance (Chrome address bar icon, etc.)
 
### iOS-specific instructions
 
iOS Safari does not support the standard `beforeinstallprompt` event. For iOS users, the install prompt shows a modal with step-by-step instructions:
 
1. Tap the Share icon at the bottom of the browser
2. Scroll down and tap "Add to Home Screen"
3. Confirm by tapping "Add"
 
The instructions include screenshots or icons matching iOS Safari's actual UI.
 
### After install
 
- App opens in standalone mode (no browser chrome)
- Splash screen shows the Worship Room logo on `#08051A` background
- Theme color `#08051A` matches the app's dark theme
 
### Offline indicator
 
When the user goes offline, a small indicator appears at the top of the page (or in the BibleReader chrome) acknowledging offline mode. Cached chapters and the search index continue to work; uncached content shows a friendly offline message.
 
### Dismissal
 
- The install prompt is dismissible via X button → sets `wr_install_dismissed` timestamp → the prompt is suppressed for at least 30 days
- Users can always install via the browser's native affordance even if they dismissed the prompt
 
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
 
### Auth Gating — Implementation Details
 
See [02-security.md](02-security.md) for the canonical auth gating list.
 
**Provider wrapping:** `AuthModalProvider` and `ToastProvider` wrap the Daily Hub and Prayer Wall pages.
 
**Meditation auth gating is two-layered:** card-click level (auth modal) + route-level redirect on all 6 sub-pages.
 
**Bible features have NO auth gating.** Reading the Bible, highlighting verses, taking notes, bookmarking, building memorization decks, viewing the heatmap, and using AI Explain/Reflect are all available without an account. The Bible wave deliberately does not require login for any of its core features. Phase 3 backend wiring will introduce optional sync for users who DO have accounts, but the unauthenticated experience remains complete.
 
**Push notifications (BB-41) are auth-independent.** A logged-out user can grant notification permission and receive daily verse pushes. The subscription is keyed by browser, not by user account.
 
**Draft persistence preserves work across auth wall:** When a logged-out user types into the Pray or Journal textarea and clicks the submit button, the draft auto-saves to localStorage BEFORE the auth modal opens. The AuthModal subtitle shows "Your draft is safe — we'll bring it back after" (Spec V). After successful authentication, the user lands back on the same tab with their draft restored.
 
**Daily Hub tab deep links work for all users:** Direct links to `/daily?tab=pray|journal|meditate` work correctly whether the user is logged in or logged out. Tab state is derived from the URL `?tab=` query param on every render rather than stored in `useState`, so there is no race condition between a default tab and the URL param. There is no logged-out redirect that would force users away from a deep-linked tab. (Verified manually after a Phase 4 false-positive caused by concurrent Playwright agents triggering Vite HMR module reloads.)
 
---
 
### Audio Drawer Flow (AmbientSoundPill / AudioDrawer)
 
The Daily Hub has a single, persistent ambient sound entry point: the `DailyAmbientPillFAB` (sticky bottom-right floating button on the Daily Hub root). All ambient sound interaction flows through this:
 
1. User clicks the floating ambient pill
2. **AudioDrawer right-side flyout slides in** from the right (desktop, 400px wide, full height) or **bottom sheet slides up** (mobile, 70vh, swipe-down to dismiss)
3. The drawer has dark frosted glass styling: `rgba(15, 10, 30, 0.95)` background with `backdrop-blur(16px)`
4. Drawer contains tabbed content: Now Playing, Ambient Browser, Sleep Browse, Routine Stepper
5. **The DailyAmbientPillFAB auto-hides** while the drawer is open (`opacity-0 pointer-events-none`) to avoid visual stacking — chat-widget pattern
6. User can dismiss the drawer via:
   - The X close button inside the drawer
   - Clicking outside the drawer (desktop only)
   - Pressing Escape (handled by the drawer's focus trap)
   - Swiping down (mobile only)
7. When the drawer closes, the FAB fades back in over 200ms
 
**Wave 7 unification:** Previously, the AmbientSoundPill in idle state opened an inline expanding dropdown panel below the pill, while the active state opened the AudioDrawer. This created two competing UIs for the same feature. Wave 7 unified them — both states now dispatch `OPEN_DRAWER` and route through the AudioDrawer flyout. The inline dropdown panel JSX has been deleted from `AmbientSoundPill.tsx`.
 
**Inline ambient pills removed from tab content (Wave 7):** Previous waves placed the AmbientSoundPill inline within the chip rows of PrayerInput, JournalInput, and below the meditation cards in MeditateTabContent. All of those inline placements were REMOVED in Wave 7. The single FAB is the canonical entry point.
 
**BibleReader audio:** The BibleReader has its own audio entry point in the right-edge icon cluster of `ReaderChrome` (BB-26-29 wave shipped on `audio-wave-bb-26-29-44`). The audio button opens a non-modal bottom-sheet player. It does NOT use the DailyAmbientPillFAB. BB-27 coordinates the two: when Bible audio starts playing via the ReaderChrome button, any active ambient sound from the DailyAmbientPillFAB pauses automatically and resumes when Bible audio stops.
 
---
 
### Growth Teasers Section
 
3 blurred preview cards (Mood Insights, Streaks & Faith Points, Friends & Leaderboard) with lock icons. Dark purple gradient. CTA: "Create a Free Account" → `/register`. These preview the real dashboard features built in Phase 2.75.
 
---
 
### Footer
 
Dark purple (#0D0620). 3 nav columns (Daily, Music, Support) + crisis resources + app download badges (Coming Soon) + "Listen on Spotify" badge + accessibility statement link (BB-35) + copyright.
 
---
 
### Starting Point Quiz Flow
 
5-question points-based quiz. `id="quiz"` scroll target on the homepage. Single-select, auto-advance. Points-based scoring → result card with CTA. 100% client-side, no persistence. Only appears on the landing page (removed from Daily Hub in Round 3 redesign). Optionally linked from the BB-34 first-run welcome.
 
---
 
### Logged-Out Conversion Strategy
 
**Core principle: "Free to use, meaningful to keep."** Give the output, withhold the history.
 
**Rules:** Never gate first use. Never nag on first visit. No countdown timers. All prompts dismissible. Show prompts after value delivery only.
 
**Triggers (Phase 3+):** Blurred mood chart after praying, save prompt after journaling, streak teaser after 2-3 visits, "Week at a Glance" preview on daily page.
 
**Draft persistence is the conversion bridge:** A logged-out user who has invested time in writing a prayer or journal entry is the ideal conversion candidate. The draft auto-save + "Your draft is safe — we'll bring it back after" pattern (Specs J + V) reduces the perceived risk of signing up at exactly the moment the user is most invested.
 
**Bible features intentionally bypass conversion pressure.** The Bible reader, search, highlights, notes, memorization, and AI features are fully available without an account. A logged-out user can build up significant personal history (highlights, memorization cards, notes) in localStorage. Phase 3 will offer optional account sync to preserve that history across devices, but the unauthenticated experience is never crippled to push signup.