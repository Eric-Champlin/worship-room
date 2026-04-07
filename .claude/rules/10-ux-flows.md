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
 
Round 3 redesign (HP-1 through HP-15) established the current structure. All sections sit on the dark `bg-hero-bg` background with thin `border-white/[0.08] max-w-6xl mx-auto` dividers between each major section.
 
```
1. Navbar (transparent glassmorphic — Daily Hub, Prayer Wall, Music, Local Support dropdown)
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
9. SiteFooter (nav columns, crisis resources, app download badges, "Listen on Spotify" badge, copyright)
```
 
See `09-design-system.md` § "Round 3 Visual Patterns" for the visual specs (glow opacities, frosted card styles, section heading treatment).
 
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
 
### Daily Hub Architecture (`/daily`)
 
The Daily Hub is a single-page tabbed experience at `/daily`. Old routes (`/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional`) redirect here with the appropriate `?tab=` query param.
 
**Page-level visual architecture (Spec Y + Wave 7):**
 
The DailyHub root is structured as:
 
```
<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
  <HorizonGlow />              {/* atmospheric purple glow layer, z-0 */}
  <Navbar />                   {/* z-10 */}
  <Hero section>               {/* z-10, time-aware greeting in GRADIENT_TEXT_STYLE */}
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
 
**Hero Section (above tabs):**
 
- Time-aware greeting in GRADIENT_TEXT_STYLE (white-to-purple gradient, large text matching home hero size)
- Compact Verse of the Day card (frosted glass, single-line on mobile)
- Hero sits at `z-10 relative` over the HorizonGlow layer
 
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
   - Click the chevron to expand the panel — reveals the full passage, reflection question, reflection body, and quote in an animated max-height transition (300ms). Internal scroll capped at `max-h-[50vh]` so long devotionals don't push the textarea off-screen.
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
 
**Draft persistence preserves work across auth wall:** When a logged-out user types into the Pray or Journal textarea and clicks the submit button, the draft auto-saves to localStorage BEFORE the auth modal opens. The AuthModal subtitle shows "Your draft is safe — we'll bring it back after" (Spec V). After successful authentication, the user lands back on the same tab with their draft restored.
 
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
 
---
 
### Growth Teasers Section
 
3 blurred preview cards (Mood Insights, Streaks & Faith Points, Friends & Leaderboard) with lock icons. Dark purple gradient. CTA: "Create a Free Account" → `/register`. These preview the real dashboard features built in Phase 2.75.
 
---
 
### Footer
 
Dark purple (#0D0620). 3 nav columns (Daily, Music, Support) + crisis resources + app download badges (Coming Soon) + "Listen on Spotify" badge + copyright.
 
---
 
### Starting Point Quiz Flow
 
5-question points-based quiz. `id="quiz"` scroll target on the homepage. Single-select, auto-advance. Points-based scoring → result card with CTA. 100% client-side, no persistence. Only appears on the landing page (removed from Daily Hub in Round 3 redesign).
 
---
 
### Logged-Out Conversion Strategy
 
**Core principle: "Free to use, meaningful to keep."** Give the output, withhold the history.
 
**Rules:** Never gate first use. Never nag on first visit. No countdown timers. All prompts dismissible. Show prompts after value delivery only.
 
**Triggers (Phase 3+):** Blurred mood chart after praying, save prompt after journaling, streak teaser after 2-3 visits, "Week at a Glance" preview on daily page.
 
**Draft persistence is the conversion bridge:** A logged-out user who has invested time in writing a prayer or journal entry is the ideal conversion candidate. The draft auto-save + "Your draft is safe — we'll bring it back after" pattern (Specs J + V) reduces the perceived risk of signing up at exactly the moment the user is most invested.