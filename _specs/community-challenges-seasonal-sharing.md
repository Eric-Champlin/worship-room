# Feature: Community Challenges Seasonal Content & Social Sharing

**Spec sequence:** This is Spec 3 of a 3-spec community challenges sequence, building on Spec 1 (`community-challenges-data-page.md`) which delivers the `/challenges` browser page, `/challenges/:challengeId` detail page, challenge data model (5 seasonal challenges), day navigation, and progress storage, and Spec 2 (`community-challenges-progress.md`) which adds gamification integration (faith points, badges, auto-detection), dashboard widget, completion celebrations, and challenge nudges.

**Master Plan Reference:** Consumes data models and integration points from the previous 2 challenge specs and from other Phase 2.75+ specs:
- Spec 1 (Community Challenges Data & Page): `wr_challenge_progress` localStorage key, challenge data model with `season`, `themeColor`, `dailyContent` array (each with `actionType`), `communityGoal`, participant count mock formula, `/challenges` browser page, `/challenges/:challengeId` detail page, "Mark Complete" button
- Spec 2 (Community Challenges Progress): Enhanced `wr_challenge_progress` with `streak`, `status`, `completedDays`, gamification via `recordActivity()`, dashboard widget, challenge badges, completion celebration overlay, auto-detection
- Liturgical Calendar spec (Spec 30): `useLiturgicalSeason()` hook, `LITURGICAL_SEASONS` constants, `computeEasterDate()`, season date range computation
- Verse of the Day Share Card spec (Spec 15): HTML Canvas share card generation pattern, Web Share API integration, clipboard copy pattern
- Pray Tab: `PrayTabContent.tsx` textarea with chips and crisis banner
- Journal Tab: `JournalTabContent.tsx` with prompt card and guided/free write modes
- Meditate Tab: `MeditateTabContent.tsx` with 6 meditation cards
- Prayer Wall: `InlineComposer.tsx`, category filter system (Spec 7), pray ceremony animation (Spec 8)
- Music Page: Ambient scenes, playlists
- Dashboard: `DashboardCard`, grid layout, faith points widget
- Celebrations & Badge UI: `CelebrationOverlay`, `toast-confetti` tier

---

## Overview

Spec 1 built the challenge data and pages. Spec 2 wired challenges into the gamification ecosystem. But challenges still feel isolated — you discover them only if you navigate to `/challenges`, and completing one is a private experience. This final spec transforms challenges into a shared community event that reverberates across the entire app during active seasons.

Three capabilities work together. **Seasonal content integration** connects challenges to the liturgical calendar so that during Lent, Easter, Advent, or any active season, the challenge surfaces everywhere: a banner on the landing page inviting visitors to join, a reminder strip on the Daily Hub keeping participants on track, and a "Challenge Prayers" filter on the Prayer Wall connecting the community's prayers to the shared journey. **Social sharing** lets participants share their progress as beautiful branded images — milestone moments (Day 7, Day 14, Day 21, Day 40) get special celebratory treatment that encourages sharing. **Community engagement** adds a simulated activity feed on the challenge detail page so users feel they're walking alongside others, plus a "Hall of Fame" on the browser page that celebrates past collective achievements.

The fourth piece is **challenge-to-feature deep links** — each day's action has smart routing that pre-fills, pre-selects, or contextualizes the destination feature, making the daily action feel like a seamless extension of the challenge rather than a generic redirect.

The result: during an active season, Worship Room feels alive with shared purpose. The challenge is the thread that connects individual daily practices into a communal spiritual journey.

---

## User Stories

- As a **logged-out visitor** arriving on the landing page during Lent, I want to see a seasonal challenge banner so that I immediately sense this is a living, active community and feel invited to participate.
- As a **logged-in user** with an active challenge, I want a reminder on the Daily Hub showing today's challenge action so that I stay on track without navigating away from my daily routine.
- As a **logged-in user** on the Prayer Wall during an active challenge season, I want to tag my prayer as a "challenge prayer" and filter to see others' challenge prayers so that I feel connected to the community's shared spiritual journey.
- As a **logged-in user** who just completed Day 7 of a challenge, I want to share a beautiful milestone image to social media so that I can celebrate my progress and invite friends to join.
- As a **logged-in user** on the challenge detail page, I want to see what other participants are doing so that I feel like I'm not doing this challenge alone.
- As a **logged-out visitor** browsing past challenges, I want to see how many people completed each one so that the challenges feel like real community events with history.
- As a **logged-in user** whose challenge action is "pray," I want the "Go to Prayer" link to pre-fill the prayer textarea with a contextual starter so that the transition from challenge to action feels seamless.

---

## Requirements

### Feature 1: Seasonal Content Integration

#### Landing Page Challenge Banner

1. **Add a seasonal challenge banner** on the landing page between the HeroSection and JourneySection. The banner only renders when a challenge's season is currently active (determined by checking each challenge's computed date range against today's date using the liturgical calendar system from Spec 30).

2. **Banner content:**
   - Challenge title in prominent heading
   - Mock participant count (using Spec 1's deterministic formula)
   - For non-participants: days remaining in the challenge's calendar window ("23 days remaining") + "Join the Challenge" CTA button
   - For active participants: personal progress indicator ("Day 12 of 40") + "Continue Today's Challenge" CTA button
   - The challenge's theme color gradient as background at 10% opacity, blending with a dark card background

3. **Banner dismissal:** Dismissible via a small close icon (Lucide `X`). Dismissed state stored in `sessionStorage` (key: `wr_challenge_banner_dismissed`). Reappears on next browser session. Not persisted to localStorage — this is ephemeral UI state.

4. **Banner visibility:** Appears for all users (logged-in and logged-out). Logged-out users see the "Join the Challenge" CTA which, when clicked, triggers the auth modal: "Sign in to join this challenge." Logged-in non-participants see "Join the Challenge" which joins directly. Logged-in participants see "Continue Today's Challenge" which navigates to `/challenges/:challengeId`.

5. **No active season:** When no challenge season is active, the banner does not render at all — no placeholder, no empty state.

#### Daily Hub Challenge Reminder Strip

6. **Add a challenge reminder strip** on the Daily Hub page, positioned above the tab bar. Only visible to logged-in users who have an active challenge (`status: "active"` in `wr_challenge_progress`).

7. **Strip content:**
   - Challenge's Lucide icon (small, 16px)
   - "Day X: [today's action summary]" — the action summary is the current day's `dailyAction` text, truncated to one line with ellipsis
   - "Go" link (right-aligned) linking to `/challenges/:challengeId`
   - Background uses the challenge's theme color at 15% opacity

8. **Strip visibility:** Only for authenticated users with an active challenge. Logged-out users never see it. Users with no active challenge never see it.

#### Prayer Wall Challenge Prayers

9. **During active challenge seasons**, add challenge prayer integration to the Prayer Wall:
   - **Composer checkbox:** When a challenge is currently active (any challenge in its season window), add a "This is a challenge prayer" checkbox below the prayer text input in the InlineComposer. Checking it adds a `challengeId` field to the prayer object when submitted. The checkbox label includes the challenge title (e.g., "This is a Pray40 prayer").
   - **Challenge Prayers filter:** Add "Challenge Prayers" as a filter option in the Prayer Wall category filter bar (from Spec 7). When selected, shows only prayers that have a `challengeId` field matching the currently active challenge.
   - **Challenge prayer badge:** Prayers with a `challengeId` display a small themed badge/pill on the prayer card showing the challenge name (e.g., "Pray40") in the challenge's theme color.

10. **When no challenge season is active:** The composer checkbox is hidden. The "Challenge Prayers" filter option is hidden. Existing challenge-tagged prayers still display their badge but can't be filtered specifically.

11. **Prayer Wall auth gating for challenge features:** The composer already requires auth. The challenge checkbox inherits the composer's auth gate. The "Challenge Prayers" filter is visible to all users (including logged-out) — it filters the public feed. Posting a challenge prayer requires auth (inherited from composer).

### Feature 2: Social Sharing

#### Share Progress Image

12. **Add a "Share Progress" button** on the challenge detail page, positioned below the daily content area (after the daily action callout). Available to logged-in users who have joined the challenge.

13. **Share image generation** using HTML Canvas (same pattern as Verse of the Day share cards from Spec 15):
    - Canvas size: 1080x1080 pixels (Instagram-optimized square)
    - Background: gradient using the challenge's theme color (theme color at full saturation top-left, fading to a darker shade bottom-right)
    - Challenge title: large, white, Caveat font (rendered via Canvas font API)
    - Progress text: "Day X of Y Complete" in white, Inter font
    - Visual progress bar: horizontal bar showing completion percentage, white track with filled portion in white at full opacity
    - Challenge streak: "X day streak" with flame emoji if streak > 3
    - Watermark: "Worship Room" in Caveat font, bottom-center, white at 40% opacity
    - Overall feel: branded, beautiful, shareable — not a screenshot

14. **Share behavior:**
    - **Mobile (Web Share API available):** Trigger `navigator.share()` with the generated PNG as a file attachment. Fallback to download if share fails.
    - **Desktop (no Web Share API):** Download the PNG directly (auto-trigger download via `<a>` tag with `download` attribute).
    - **Text share option:** Additionally provide a "Copy text" button that copies to clipboard: "I'm on Day X of [Challenge Title] on Worship Room! Join me: [link to /challenges/:challengeId]". Show "Copied!" toast on success.

#### Milestone Share Prompts

15. **At milestone days** (Day 7, Day 14, Day 21, and Day 40 when applicable), show a celebratory milestone card on the challenge detail page after the user completes that day's action:
    - **Day 7:** "Week 1 Complete!"
    - **Day 14:** "Two Weeks Strong!"
    - **Day 21:** "Three Weeks of Faithfulness!" (or "Halfway There!" for 40-day challenges)
    - **Day 40:** "The Full Journey Complete!" (only for 40-day challenges — completion celebration from Spec 2 also fires)

16. **Milestone card content:**
    - Celebratory heading (see above) in Caveat script font, challenge theme color
    - The share image pre-generated and displayed as a preview (scaled down to fit)
    - "Share Your Milestone" primary button (triggers the share flow from requirement 14)
    - "Keep Going" secondary button (dismisses the milestone card)
    - Uses the `toast-confetti` celebration tier from the existing celebration system (confetti particles in challenge theme color + gold + white)

17. **Milestone card display logic:** The card appears once per milestone per challenge. Track shown milestones in `wr_challenge_progress` as a new field `shownMilestones` (array of day numbers). If the milestone was already shown (user revisiting the day), don't show it again.

18. **Milestone for 7-day challenges:** Only Day 7 milestone applies (it maps to "Challenge Complete!" which is handled by Spec 2's completion celebration). No separate milestone card needed — the completion celebration is sufficient. For 21-day challenges: Day 7 and Day 14 milestones apply, plus Day 21 maps to the completion celebration. For 40-day challenges: all 4 milestones apply (Day 7, 14, 21, 40), plus a separate completion celebration.

### Feature 3: Community Engagement

#### Challenge Community Activity Feed

19. **Add a "Challenge Community" section** on the challenge detail page, below the daily content and share button. Shows simulated recent activity from other participants.

20. **Mock community activity items:** 5-8 hardcoded community activity items that rotate deterministically based on the current day number within the challenge:
    - Activity types: "[Name] completed Day X", "[Name] shared a prayer", "[Name] hit a 7-day challenge streak", "[Name] joined the challenge", "[Name] shared their milestone"
    - Each item has: mock avatar (initials in a colored circle using a deterministic color from a palette), display name, action text, relative timestamp (e.g., "2 hours ago", "just now")
    - The items rotate daily — on Day 5 of the challenge, users see a different set of items than on Day 6. Formula: use `(dayNumber * 7 + index) % totalMockItems` to select from a pool of ~20 pre-written activity items.
    - Names should be diverse and realistic: "Sarah M.", "David K.", "Maria L.", "James T.", etc.

21. **"Pray for the community" button** at the bottom of the community section. Navigates to `/prayer-wall` with the "Challenge Prayers" filter pre-selected (via URL query parameter, e.g., `/prayer-wall?filter=challenge`).

#### Hall of Fame

22. **Add a "Hall of Fame" section** on the `/challenges` browser page, below the past challenges section. Shows mock completion statistics for each past challenge.

23. **Hall of Fame content per challenge:**
    - Challenge title
    - Trophy icon (Lucide `Trophy`)
    - Mock completion count: deterministic number based on challenge ID (e.g., `800 + (challengeId.length * 53)`), displayed as "X people completed [Challenge Title] in [year]"
    - The year is the year the challenge last ran (computed from the challenge's start date function)

24. **Hall of Fame visibility:** Always visible (logged-in and logged-out). Only shows challenges whose most recent season has passed.

### Feature 4: Challenge-to-Feature Deep Links

25. **Each day's daily action should have smart routing** via the feature link ("Go to Prayer", "Go to Journal", etc.) on the challenge detail page. The routing passes contextual data to the destination feature:

26. **Action type routing:**

    | `actionType` | Destination | Context Passed |
    |-------------|-------------|----------------|
    | `pray` | `/daily?tab=pray` | Pre-fill the prayer textarea with a contextual starter based on the day's theme (e.g., "Lord, on Day 5 of this Lenten journey, I pray for..." — derived from the day's `title` and `dailyAction`) |
    | `journal` | `/daily?tab=journal` | Pass the day's reflection question as the journal prompt context (use the day's `dailyAction` text as a guided journal prompt) |
    | `meditate` | `/daily?tab=meditate` | Suggest a specific meditation type matching the day's theme (e.g., Lent prayer-focused days suggest ACTS Prayer Walk, gratitude days suggest Gratitude Reflection) |
    | `music` | `/music` | Link to a specific ambient scene or the worship playlists tab matching the day's mood (e.g., contemplative themes link to Sleep & Rest tab, praise themes link to Worship Playlists) |
    | `gratitude` | `/daily?tab=meditate` | Link to the Gratitude Reflection meditation specifically (`/meditate/gratitude`) |
    | `prayerWall` | `/prayer-wall` | Navigate with the composer open and the challenge prayer checkbox pre-checked (via URL parameters or state) |

27. **Context passing mechanism:** Use URL query parameters or React Router `state` to pass context. The receiving page should check for challenge context and apply it if present, but function normally if no context is provided (graceful degradation). The context is ephemeral — consumed once and not stored.

28. **Pre-fill safety:** Prayer textarea pre-fill text is a starter only — the user can edit or clear it before submitting. The pre-filled text should never contain crisis keywords. Pre-fill text is hardcoded per challenge day, not AI-generated.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Landing page challenge banner | Visible. "Join the Challenge" triggers auth modal: "Sign in to join this challenge" | Visible. "Join the Challenge" joins directly. "Continue Today's Challenge" navigates to detail page. |
| Banner dismiss (X button) | Works (sessionStorage write is ephemeral, not user data) | Same |
| Daily Hub challenge strip | Not visible | Visible only if user has active challenge |
| Prayer Wall challenge checkbox | Not visible (composer requires auth) | Visible during active challenge season |
| Prayer Wall "Challenge Prayers" filter | Visible, functional (filters public feed) | Same |
| Challenge prayer badge on cards | Visible | Same |
| "Share Progress" button | Not visible (challenge detail requires joining) | Visible if user has joined the challenge |
| Share image generation | N/A | Generates and shares/downloads image |
| "Copy text" share | N/A | Copies to clipboard |
| Milestone share card | N/A | Shows once per milestone for joined users |
| Community activity feed | Visible (viewable by all) | Same |
| "Pray for the community" button | Visible, navigates to Prayer Wall (Prayer Wall handles its own auth for posting) | Same |
| Hall of Fame section | Visible | Same |
| Feature deep links ("Go to Prayer") | Visible, navigates (destination handles its own auth gating) | Same, with context pre-filled |

### Persistence

- **Logged-out**: Zero persistence to localStorage. The banner dismiss uses `sessionStorage` only (ephemeral, not user data).
- **Logged-in**: Extends existing localStorage keys:
  - `wr_challenge_progress` — adds `shownMilestones` array to each challenge entry
  - No new localStorage keys
- **sessionStorage key**: `wr_challenge_banner_dismissed` — boolean, controls landing page banner visibility
- **Route type**: No new routes. All changes integrate into existing routes and pages.

---

## AI Safety Considerations

- **Crisis detection needed?**: Partially. The prayer textarea pre-fill (requirement 26, `pray` action type) introduces text into the prayer input. However, this text is hardcoded per challenge day, not AI-generated and not user-generated. The hardcoded pre-fill text must be reviewed to ensure it does not contain crisis keywords. The Pray tab's existing crisis detection continues to function on the full textarea content (pre-fill + any user additions).
- **User input involved?**: Indirectly. The Prayer Wall challenge prayer checkbox adds a field to user-submitted prayers, but the prayer text itself goes through existing Prayer Wall moderation and crisis detection. No new user text input fields are introduced.
- **AI-generated content?**: No. All content is pre-authored: mock community activity items, milestone messages, pre-fill starters, Hall of Fame stats.
- **Theological boundaries**: Pre-fill prayer starters must follow existing guidelines: encouraging tone, no divine authority claims, second-person language ("Lord, I pray for..." not "God is telling you to..."). Review all hardcoded starters against `01-ai-safety.md` theological boundaries.
- **Gentle gamification compliance**: Milestone messages celebrate achievement without creating FOMO or guilt. "Week 1 Complete!" is celebratory. Never "You're falling behind!" or "Others are ahead of you!" Community activity feed shows positive actions only — no "X people are ahead of you" or competitive framing.

---

## UX & Design Notes

### Emotional Tone

The seasonal integration should make the app feel alive — like entering a church that's decorated for the season. The banner is an invitation, not a sales pitch. The Daily Hub strip is a gentle companion, not a nag. The Prayer Wall challenge prayers create a sense of "we're all in this together." Sharing milestones should feel like celebrating with friends, not showing off. The community activity feed should feel like being in a room with others doing the same thing — warm presence, not surveillance.

### Visual Design — Landing Page Challenge Banner

- **Container**: Full-width card between HeroSection and JourneySection. `rounded-2xl border overflow-hidden` with a dark background (`bg-hero-dark/95`).
- **Background accent**: The challenge's theme color gradient at 10% opacity as a radial overlay: `radial-gradient(circle at 70% 50%, {themeColor}1A 0%, transparent 70%)` layered on the dark background.
- **Layout**: Horizontal on desktop (text left, CTA right), stacked on mobile.
- **Challenge title**: Inter bold, white, `text-xl sm:text-2xl`.
- **Participant count**: Lucide `Users` icon + count in `text-white/60 text-sm`.
- **Progress/countdown text**: `text-white/80 text-base font-medium`. Days remaining in the challenge's theme color for emphasis.
- **CTA button**: Uses challenge's theme color as background, white text. `font-semibold py-3 px-6 sm:px-8 rounded-lg`.
- **Dismiss button**: Small `X` icon, `text-white/40 hover:text-white/60`, positioned top-right. `min-h-[44px] min-w-[44px]` touch target.
- **Outer padding**: `p-5 sm:p-8`. Side margins: `mx-4 sm:mx-8 lg:mx-auto max-w-5xl` — inset from the page edges for visual separation from the hero.

### Visual Design — Daily Hub Challenge Strip

- **Container**: `rounded-xl p-3 mx-4` positioned above the tab bar.
- **Background**: Challenge's theme color at 15% opacity: `bg-[{themeColor}]/15` (dynamic Tailwind or inline style).
- **Icon**: Challenge's Lucide icon, 16px, in the challenge's theme color.
- **Text**: `text-white text-sm truncate` for the "Day X: [action]" text. The "Day X:" portion is `font-medium`.
- **"Go" link**: `text-sm font-medium` in the challenge's theme color with a right arrow icon (Lucide `ChevronRight`, 14px). Hover: underline.
- **Layout**: Horizontal flex, icon left, text center (flex-1), link right. Single line.

### Visual Design — Prayer Wall Challenge Integration

- **Composer checkbox**: Standard checkbox styling. Label in `text-sm text-text-dark`. Challenge title in the label uses the challenge's theme color. Positioned below the textarea and above the submit button.
- **Challenge prayer badge on cards**: Small pill: `rounded-full px-2.5 py-0.5 text-xs font-medium` using the challenge's theme color at 15% opacity as background and theme color as text. Positioned near the prayer card's category tag (if present) or below the author info.
- **"Challenge Prayers" filter pill**: Same styling as existing category filter pills, with the challenge's theme color. Positioned at the end of the filter bar (or prominently if currently active season).

### Visual Design — Share Progress Image (Canvas)

- **Canvas dimensions**: 1080x1080px
- **Background**: Linear gradient from the challenge's theme color (top-left corner) to a darkened version (bottom-right). E.g., for Lent (`#6B21A8`): gradient from `#6B21A8` to `#2E0854`.
- **Challenge title**: Caveat font, white, ~72px, centered, top third of the image.
- **"Day X of Y Complete"**: Inter font, white, ~36px, centered below title.
- **Progress bar**: 600px wide, 12px tall, rounded-full. Track: `rgba(255,255,255,0.2)`. Fill: white. Centered horizontally.
- **Streak text**: Inter font, `rgba(255,255,255,0.7)`, ~24px. With flame emoji if streak > 3.
- **Watermark**: "Worship Room" in Caveat font, white at 40% opacity, ~28px, bottom-center, 60px from bottom edge.
- **Padding**: 100px from all edges for content safe zone.

### Visual Design — Milestone Card

- **Container**: Frosted glass card on the dark detail page background: `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8`. Positioned above the day content when the milestone is triggered (between the hero and the day content).
- **Heading**: Caveat script font, challenge theme color, `text-3xl sm:text-4xl`. E.g., "Week 1 Complete!"
- **Image preview**: The generated share image rendered at reduced size (`max-w-xs rounded-xl shadow-lg mx-auto`), centered.
- **"Share Your Milestone" button**: Primary style using challenge theme color as background. `font-semibold py-3 px-8 rounded-lg text-white`.
- **"Keep Going" button**: Outline style: `border border-white/30 text-white/80 py-3 px-6 rounded-lg`.
- **Buttons**: Horizontal on desktop, stacked on mobile. Centered.
- **Confetti**: `toast-confetti` celebration tier fires when the milestone card appears.

### Visual Design — Community Activity Feed

- **Section heading**: "Challenge Community" in `text-white font-semibold text-lg`, with a Lucide `Users` icon.
- **Activity items**: Vertical list with subtle dividers (`border-b border-white/5 last:border-0`).
- **Each item**: Horizontal layout — avatar (initials in a 32px colored circle), text content, timestamp.
  - Avatar: 32px circle, deterministic background color from a 6-color palette, white initials `text-xs font-semibold`.
  - Name: `text-white/90 text-sm font-medium`.
  - Action text: `text-white/60 text-sm` (e.g., "completed Day 12", "shared a prayer").
  - Timestamp: `text-white/40 text-xs` (e.g., "2h ago", "just now").
  - Padding: `py-3` per item.
- **"Pray for the community" button**: Outline style at the bottom of the section: `border border-white/20 text-white/70 text-sm py-2.5 px-5 rounded-lg hover:bg-white/5`. Lucide `Heart` icon before text.

### Visual Design — Hall of Fame

- **Section heading**: "Hall of Fame" in `text-text-dark font-bold text-xl` on the light `/challenges` browser page background.
- **Cards**: White cards matching the past challenge card style but with a trophy accent. `bg-white rounded-xl border border-gray-200 shadow-sm p-5`.
- **Each card**: Trophy icon (Lucide `Trophy`, `text-amber-500`, 20px) + challenge title in `font-semibold text-text-dark` + completion stat in `text-text-light text-sm` (e.g., "1,247 people completed this in 2026").
- **Layout**: 2-column grid on desktop, single column on mobile.

### Design System Recon References

- **Inner page hero gradient**: Design system recon "Inner Page Hero" pattern (for landing page banner context)
- **Frosted glass card (dark)**: Dashboard card pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) — used for milestone card
- **White card (light)**: Meditation/Reading Plans card pattern (`bg-white rounded-xl border border-gray-200 shadow-sm`) — used for Hall of Fame
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` — adapted with theme color
- **Outline button (dark)**: `border border-white/30 text-white/80 rounded-lg`
- **Outline button (light)**: `border border-gray-300 text-text-dark rounded-lg`
- **Category filter pills**: Prayer Wall category filter pattern from Spec 7
- **Canvas share card**: Verse of the Day share card pattern from Spec 15
- **Toast-confetti celebration**: Existing celebration system

### New Visual Patterns

1. **Landing page seasonal banner**: A full-width dark card with theme-colored radial gradient accent, positioned between major landing page sections. New landing page element.
2. **Daily Hub contextual strip**: A small colored notification-style strip above the tab bar. New Daily Hub element.
3. **Challenge prayer badge**: A small theme-colored pill on prayer cards indicating challenge association. New Prayer Wall element.
4. **Share progress image (Canvas-generated)**: A 1080x1080 branded social sharing image with challenge theming. Extends the Verse of the Day share card pattern with new layout.
5. **Milestone celebration card**: A frosted glass card with image preview and dual-action buttons, appearing inline in the page flow. New celebration pattern.
6. **Community activity feed**: A list of mock user activity items with avatars, names, and timestamps. New social proof pattern.
7. **Hall of Fame section**: Trophy-accented completion statistics cards for past challenges. New historical/achievement pattern.

---

## Responsive Behavior

### Mobile (< 640px)

- **Landing page banner**: Stacked layout — title, participant count, progress/countdown, CTA button all stack vertically. Full-width CTA button. Dismiss X in top-right corner. `p-5 mx-4`.
- **Daily Hub strip**: Full-width (within `mx-4` margins). Icon, text, and "Go" link all on one line. Text truncates as needed.
- **Prayer Wall checkbox**: Full-width below textarea. Label wraps if needed.
- **Share button area**: Full-width "Share Progress" button + full-width "Copy text" button, stacked.
- **Milestone card**: Full-width, stacked layout. Image preview at `max-w-[240px]`. Buttons stacked vertically, full-width.
- **Community activity feed**: Full-width list. Avatar size remains 32px. Text wraps naturally.
- **Hall of Fame**: Single-column card layout.
- **All touch targets**: 44px minimum.

### Tablet (640px - 1024px)

- **Landing page banner**: Horizontal layout — text content left (flex-1), CTA right. `p-6 mx-8`.
- **Daily Hub strip**: Same as mobile (single line strip).
- **Milestone card**: Horizontal layout possible — image left, text/buttons right.
- **Hall of Fame**: 2-column grid.

### Desktop (> 1024px)

- **Landing page banner**: Horizontal layout with generous spacing. `p-8 max-w-5xl mx-auto`. Challenge icon decorative element on the far left.
- **Daily Hub strip**: Same single-line strip, within `max-w-2xl` content column.
- **Milestone card**: `max-w-2xl mx-auto`. Image and buttons can be side-by-side.
- **Community activity feed**: Within `max-w-2xl` content column.
- **Hall of Fame**: 2-column grid within `max-w-4xl mx-auto`.
- **Share image preview in milestone card**: `max-w-xs` — doesn't expand past natural size.

---

## Edge Cases

- **No active challenge season**: Landing page banner not rendered. Daily Hub strip not rendered. Prayer Wall checkbox hidden. "Challenge Prayers" filter hidden. Community feed still shows if user is on a detail page for a challenge they're completing outside the calendar window.
- **Multiple active challenges**: If two challenge seasons overlap (rare), the landing page banner shows the one with the nearest end date (more urgent). The Daily Hub strip shows the user's active challenge (only one can be active per Spec 2's single active constraint).
- **User joined but hasn't completed any days**: Share button shows but the share image shows "Day 0 of X" — this feels odd. Guard: only show "Share Progress" button after at least 1 day is completed.
- **Milestone already shown**: The `shownMilestones` array prevents re-showing. If the user clears localStorage, milestones may re-trigger — acceptable for frontend-first implementation.
- **7-day challenges and milestones**: Only Day 7 applies, but Day 7 = completion, handled by Spec 2's celebration. No separate milestone card needed. The "Share Progress" button is still available for sharing at any point.
- **Canvas font loading**: Caveat font must be loaded before rendering the Canvas share image. Use `document.fonts.ready` promise or pre-load the font. If font loading fails, fall back to sans-serif.
- **Web Share API not available**: Fall back to PNG download on desktop. Show both "Download image" and "Copy text" options.
- **Challenge prayer on a past challenge**: If a user writes a prayer and checks "challenge prayer" during a season, then the season ends, the prayer retains its `challengeId` tag and badge. The "Challenge Prayers" filter reappears only during active seasons, but tagged prayers remain visible in the regular feed.
- **Deep link context consumed**: Challenge context passed via URL params or state should be consumed once (cleared after the receiving page reads it). Refreshing the page should not re-apply the context.
- **Pre-fill text and crisis detection**: Hardcoded pre-fill starters must not contain crisis keywords. The Pray tab's existing `CrisisBanner` continues to monitor the full textarea content including the pre-fill.
- **Banner dismissed then challenge changes**: If the user dismisses the Lent banner and then the Easter challenge starts during the same session, the banner should reappear. The `sessionStorage` key should include the challenge ID: `wr_challenge_banner_dismissed_{challengeId}`.
- **Hall of Fame for challenges that haven't run yet**: Only shows challenges whose most recent computed date range has fully passed. New challenges that haven't had their first season yet are excluded.
- **Community activity feed on past challenges**: Shows a static set of items (frozen at the challenge's duration — day number capped at `durationDays`).

---

## Acceptance Criteria

### Seasonal Content Integration — Landing Page Banner

- [ ] Banner renders on the landing page between HeroSection and JourneySection during an active challenge season
- [ ] Banner does not render when no challenge season is currently active
- [ ] Banner shows challenge title, mock participant count (using Spec 1's deterministic formula), and days remaining
- [ ] Logged-out user sees "Join the Challenge" CTA; clicking shows auth modal: "Sign in to join this challenge"
- [ ] Logged-in non-participant sees "Join the Challenge" CTA; clicking joins the challenge
- [ ] Logged-in active participant sees progress ("Day X of Y") and "Continue Today's Challenge" CTA linking to detail page
- [ ] Banner background uses the challenge's theme color at 10% opacity as a radial gradient accent
- [ ] Dismiss X button hides the banner for the current session (sessionStorage, keyed by challenge ID)
- [ ] Banner reappears on new browser session
- [ ] Banner reappears if a different challenge becomes active during the same session
- [ ] On mobile (< 640px): stacked layout, full-width CTA button, 44px touch targets
- [ ] On desktop (> 1024px): horizontal layout with text left and CTA right, `max-w-5xl` centered

### Seasonal Content Integration — Daily Hub Strip

- [ ] Challenge strip renders above the Daily Hub tab bar for logged-in users with an active challenge
- [ ] Strip shows the challenge's icon, "Day X: [action summary]" (truncated to 1 line), and "Go" link
- [ ] Strip background uses the challenge's theme color at 15% opacity
- [ ] "Go" link navigates to `/challenges/:challengeId`
- [ ] Strip does not render for logged-out users
- [ ] Strip does not render for logged-in users with no active challenge

### Seasonal Content Integration — Prayer Wall

- [ ] During an active challenge season, InlineComposer shows "This is a [Challenge Title] prayer" checkbox
- [ ] Checking the checkbox adds `challengeId` to the submitted prayer object
- [ ] Checkbox is hidden when no challenge season is active
- [ ] "Challenge Prayers" filter appears in the Prayer Wall filter bar during active challenge seasons
- [ ] Selecting "Challenge Prayers" filter shows only prayers with matching `challengeId`
- [ ] Prayers with `challengeId` display a themed badge/pill with the challenge name
- [ ] Challenge prayer badge uses the challenge's theme color (15% opacity background, theme color text)
- [ ] Filter is visible to all users (including logged-out); posting requires auth (inherited from composer)

### Social Sharing — Share Progress

- [ ] "Share Progress" button appears below daily content on challenge detail page for joined users with at least 1 completed day
- [ ] Button does not appear for logged-out users or users who haven't joined
- [ ] Clicking generates a 1080x1080 PNG via HTML Canvas
- [ ] Canvas image includes: theme color gradient background, challenge title (Caveat), "Day X of Y Complete" (Inter), progress bar, streak text, "Worship Room" watermark
- [ ] On mobile with Web Share API: triggers `navigator.share()` with the image file
- [ ] On desktop: downloads PNG automatically
- [ ] "Copy text" option copies "I'm on Day X of [Challenge Title] on Worship Room! Join me: [link]" to clipboard
- [ ] "Copied!" toast shows after successful clipboard copy

### Social Sharing — Milestones

- [ ] Milestone card appears at Day 7 ("Week 1 Complete!"), Day 14 ("Two Weeks Strong!"), Day 21 ("Three Weeks of Faithfulness!" / "Halfway There!"), Day 40 ("The Full Journey Complete!")
- [ ] Milestone card shows celebratory heading in Caveat font with challenge theme color
- [ ] Milestone card shows a preview of the generated share image
- [ ] "Share Your Milestone" button triggers the share flow (image generation + share/download)
- [ ] "Keep Going" button dismisses the milestone card
- [ ] Milestone uses `toast-confetti` celebration tier with challenge theme color + gold + white confetti
- [ ] Each milestone shows only once per challenge (tracked via `shownMilestones` in `wr_challenge_progress`)
- [ ] Revisiting a milestone day does not re-trigger the milestone card
- [ ] For 7-day challenges: no separate milestone card at Day 7 (completion celebration from Spec 2 is sufficient)
- [ ] For 21-day challenges: milestones at Day 7 and Day 14; Day 21 = completion celebration
- [ ] For 40-day challenges: milestones at Day 7, Day 14, Day 21; Day 40 = milestone card + completion celebration

### Community Engagement — Activity Feed

- [ ] "Challenge Community" section renders below daily content on the challenge detail page
- [ ] Section shows 5-8 mock activity items with avatars (initials in colored circles), names, action text, and timestamps
- [ ] Activity items rotate deterministically based on the challenge day number
- [ ] Each item has a distinct mock avatar with deterministic color and initials
- [ ] Activity types include: completed a day, shared a prayer, hit a streak, joined the challenge, shared a milestone
- [ ] "Pray for the community" button navigates to `/prayer-wall` with the "Challenge Prayers" filter pre-selected
- [ ] Community section is visible to all users (logged-in and logged-out)

### Community Engagement — Hall of Fame

- [ ] "Hall of Fame" section renders on `/challenges` browser page below past challenges
- [ ] Each past challenge shows trophy icon, challenge title, and mock completion count
- [ ] Completion count is deterministic based on challenge ID
- [ ] Stat text format: "X people completed [title] in [year]"
- [ ] Only challenges whose most recent season has fully passed are shown
- [ ] Section is visible to all users
- [ ] Desktop: 2-column grid; Mobile: single column

### Challenge-to-Feature Deep Links

- [ ] `pray` action: "Go to Prayer" link navigates to `/daily?tab=pray` with prayer textarea pre-filled with a contextual starter
- [ ] Pre-fill text is derived from the day's theme and does not contain crisis keywords
- [ ] `journal` action: link passes the day's action text as journal prompt context to `/daily?tab=journal`
- [ ] `meditate` action: link suggests a specific meditation type matching the day's theme
- [ ] `music` action: link navigates to `/music` with tab/scene matching the day's mood
- [ ] `gratitude` action: link navigates to `/meditate/gratitude` specifically
- [ ] `prayerWall` action: link navigates to `/prayer-wall` with composer open and challenge checkbox pre-checked
- [ ] Context is consumed once — refreshing the page does not re-apply the pre-fill/context
- [ ] Destination pages function normally if no challenge context is provided (graceful degradation)

### Responsive Layout

- [ ] Mobile (< 640px): Landing banner stacked, strip single-line truncated, milestone card stacked with full-width buttons, Hall of Fame single column, 44px touch targets on all interactive elements
- [ ] Tablet (640-1024px): Landing banner horizontal, milestone card horizontal optional, Hall of Fame 2-column
- [ ] Desktop (> 1024px): Landing banner `max-w-5xl` centered horizontal, milestone `max-w-2xl`, feed and content within `max-w-2xl`, Hall of Fame 2-column `max-w-4xl`

### Accessibility

- [ ] Landing page banner dismiss button has `aria-label="Dismiss challenge banner"`
- [ ] "Share Progress" and "Share Your Milestone" buttons have descriptive `aria-label` including challenge title
- [ ] "Copy text" button announces "Copied to clipboard" to screen readers via live region
- [ ] Community activity feed items are in a `<ul>` list with `<li>` items for proper semantics
- [ ] Hall of Fame section has a heading for screen reader navigation
- [ ] Prayer Wall challenge checkbox has a visible label associated via `htmlFor`/`id`
- [ ] Challenge strip "Go" link has `aria-label` including challenge name and current day
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] `prefers-reduced-motion`: milestone confetti is disabled (static display), share image generation is unaffected (it's a static canvas render)
- [ ] Canvas-generated images have no accessibility requirements (they are downloaded/shared files, not in-page content), but the share button itself and all surrounding UI meet WCAG AA

### Visual Verification

- [ ] Landing page banner visually integrates between HeroSection and JourneySection without breaking the page flow
- [ ] Banner theme color accent is subtle (10% opacity) — visible but not overwhelming
- [ ] Daily Hub strip is compact and doesn't push content down excessively
- [ ] Share canvas image is visually polished: gradient background, white text, proper font rendering, progress bar, watermark
- [ ] Milestone card frosted glass matches dashboard card style
- [ ] Community activity avatars are colorful and visually distinct
- [ ] Hall of Fame cards match the existing past challenge card style on the browser page
- [ ] Challenge prayer badge on Prayer Wall cards is small and non-intrusive
- [ ] Theme colors (Lent purple, Easter gold, Pentecost red, Advent violet, New Year teal) render correctly across all integration points

### No Regressions

- [ ] Landing page existing sections (Hero, Journey, Growth Teasers, Quiz, Footer) are unaffected
- [ ] Daily Hub tab bar and tab content functionality unchanged
- [ ] Prayer Wall existing functionality (posting, commenting, reactions, sharing, category filtering) unchanged
- [ ] Challenge detail page from Specs 1 and 2 continues to function — this spec adds to it, not replaces
- [ ] Challenge browser page from Spec 1 continues to function — Hall of Fame is additive
- [ ] Existing canvas share card functionality (Verse of the Day) is unaffected
- [ ] Existing toast and celebration systems continue to work
- [ ] Existing gamification (faith points, badges, streaks) is unaffected
- [ ] Dashboard widget from Spec 2 is unaffected
- [ ] No existing localStorage keys are modified (only `wr_challenge_progress` gains `shownMilestones`)

---

## Out of Scope

- **Backend API**: Entirely frontend with localStorage/mock data. Backend persistence is Phase 3+.
- **Real community activity feed**: Mock data only. Real-time activity from other users requires a backend.
- **Real participant counts and Hall of Fame stats**: Deterministic mock numbers. Real aggregation is Phase 3+.
- **Push notifications for seasonal challenges**: The landing page banner and Daily Hub strip are the notification mechanisms. Real push notifications are Phase 3+.
- **Team challenges**: Organized group challenges with shared goals are a future feature.
- **Challenge leaderboards**: Rankings within a challenge are a future feature.
- **Video/audio sharing**: Only static image and text sharing. Video stories or audio clips are future.
- **Deep link to specific music tracks**: Music deep links go to tabs/scenes, not individual tracks. Per-track deep linking requires the music feature to support URL-based track selection.
- **AI-personalized pre-fill text**: Pre-fill starters are hardcoded per challenge day. AI-generated contextual starters are Phase 4+.
- **Cross-challenge social sharing (friend-to-friend invites)**: Inviting specific friends to join a challenge requires the friends system backend. Future feature.
- **Challenge-specific chat or discussion threads**: Real-time community interaction requires backend infrastructure. Future feature.
- **Animated share images / video share cards**: Only static PNG. Animated GIF or video generation is future.
- **Landing page challenge section (permanent)**: The banner is seasonal and ephemeral. A permanent "Challenges" section on the landing page is a separate feature.
