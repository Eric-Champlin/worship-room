# Feature: Prayer Wall Question of the Day

## Overview

The Prayer Wall currently serves users who have a specific prayer request to share or who want to intercede for others. But many users visit the Prayer Wall without a prayer need — they want to connect with the community but don't have something to "pray about" in that moment. The Question of the Day addresses this gap by placing a daily rotating faith question at the top of the feed that invites open-ended community discussion. This transforms the Prayer Wall from a prayer-only space into a broader community gathering place where believers encourage one another through shared experiences, reflections, and practical wisdom.

This feature was identified through competitive analysis against Glorify's "Question of the Day" feature and serves the app's mission of emotional healing through community connection.

## User Stories

As a **logged-out visitor**, I want to see today's faith question on the Prayer Wall so that I feel invited into the community conversation and motivated to create an account to participate.

As a **logged-in user**, I want to respond to a daily faith question so that I can share my experiences and connect with other believers beyond just prayer requests.

As a **logged-in user**, I want to read other people's responses to the daily question so that I feel encouraged by the community's shared faith journey.

As a **logged-out visitor or logged-in user**, I want to share today's question with friends so that I can invite them into the conversation.

## Requirements

### Question Content Pool

- 60 hardcoded questions stored in a constants file
- 6 theme categories with 10 questions each:
  - **Faith Journey** — reflections on personal faith growth (e.g., "What Bible verse has meant the most to you this year?")
  - **Practical** — daily faith-in-action tips (e.g., "How do you make time for God in a busy schedule?")
  - **Reflective** — deeper spiritual contemplation (e.g., "When was the last time you felt God's presence clearly?")
  - **Encouraging** — positive faith experiences (e.g., "What's one thing God has taught you recently?")
  - **Community** — believer-to-believer connection (e.g., "How has another believer encouraged you this week?")
  - **Seasonal/Topical** — timely and seasonal (e.g., "What are you praying for this season?")
- Each question has: `id` (string), `text` (string), `theme` (one of the 6 theme tags), and an optional `hint` (a brief 1-sentence conversation-starter prompt to help users who aren't sure how to respond, e.g., "Think about a moment this week where you felt peace.")
- Questions rotate daily using the same day-of-year modulo pattern used by Verse of the Day and devotionals (deterministic — same date always returns same question, resets at midnight local time)

### Question of the Day Card

- Positioned at the very top of the Prayer Wall feed, above the category filter bar and prayer cards, but below the hero section and CTA area
- Visually distinct from prayer cards: uses a `primary/10` background with a `primary/20` border (not the standard `white/5` frosted glass) so it stands out as a special daily feature
- Card content (top to bottom):
  1. **Icon**: MessageCircle icon (Lucide) in primary color
  2. **Label**: "Question of the Day" in uppercase, tracking-wide, small text, muted (`text-white/50`)
  3. **Question text**: Bold, larger text (`text-lg`)
  4. **Conversation-starter hint**: Lora italic, small text, muted (`text-white/50`). Only shown if the question has a hint.
  5. **Response count**: "X responses" (or "Be the first to respond" if zero) — tapping scrolls down to the first QOTD response in the feed
  6. **Action row**: "Share Your Thoughts" button + Share button
- The "Share Your Thoughts" button opens an inline response composer directly below the card
- The Share button uses the same share pattern as other content (Web Share API with fallback) and shares: "Today's question on Worship Room: [question text]"

### Response Composer

- Opens inline below the QOTD card when "Share Your Thoughts" is tapped
- Simpler than the Prayer Wall inline composer:
  - Textarea: 500 character max, placeholder "Share your thoughts...", crisis keyword detection (same `CrisisBanner` pattern as Pray tab and Prayer Wall composer)
  - No anonymous checkbox — QOTD responses are always attributed to the user
  - No category selector — responses are automatically tagged with the "Discussion" category and linked to the question via a `qotdId` field
  - "Post Response" submit button
- After posting, the response appears in the feed as a regular prayer wall item with the QOTD badge

### Response Storage & Display

- Responses are stored as regular prayer wall items (same `PrayerRequest` data model) with two special fields:
  - `qotdId`: string linking the response to the question's ID
  - `category`: set to `"discussion"` (the new 9th category)
- In the feed, QOTD responses display a small "Re: Question of the Day" badge above the author name to distinguish them from prayer requests
- QOTD responses otherwise behave identically to prayer cards — same interaction bar (praying, comments, share, bookmark), same expand/collapse, same detail page

### Category Integration

- Add "Discussion" as a 9th category in the prayer category system (slug: `discussion`, label: "Discussion"), added after "Other" in the filter bar
- When the "Discussion" category filter is active, QOTD responses are included in the filtered feed
- When any other category filter is active, QOTD responses are excluded (they're discussion, not prayers)
- When "All" is active, QOTD responses appear in the feed alongside prayer requests
- The QOTD card itself is always visible at the top regardless of active filter (it's above the filter bar)

### Response Count on QOTD Card

- Shows the number of responses to today's question: "X responses" (plural) or "1 response" (singular)
- If zero responses: "Be the first to respond"
- Tapping the response count scrolls the page down to the first QOTD response in the feed
- If no responses exist yet, tapping opens the response composer instead

### Faith Points Integration

- Posting a QOTD response counts as a `prayerWall` activity for faith points (reuses the existing 15-point `prayerWall` activity type, since it's community engagement)
- No new activity types needed

## Acceptance Criteria

### QOTD Content
- [ ] Constants file contains exactly 60 questions, 10 per theme (faith_journey, practical, reflective, encouraging, community, seasonal)
- [ ] Each question has `id`, `text`, `theme`, and optional `hint` fields
- [ ] `getTodaysQuestion()` function uses day-of-year modulo 60 pattern (same approach as `getTodaysVerse()`)
- [ ] Same date always returns the same question (deterministic)
- [ ] Question changes at midnight local time

### QOTD Card
- [ ] QOTD card appears at the top of the Prayer Wall feed, above the category filter bar and prayer cards, below the hero
- [ ] Card uses `bg-primary/10 border border-primary/20` styling (visually distinct from frosted glass prayer cards)
- [ ] Card shows MessageCircle icon in primary color
- [ ] Card shows "QUESTION OF THE DAY" label in `text-xs uppercase tracking-wider text-white/50`
- [ ] Question text displays in bold `text-lg`
- [ ] Conversation-starter hint displays in Lora italic `text-sm text-white/50` (only when hint exists)
- [ ] Response count shows "X responses" / "1 response" / "Be the first to respond"
- [ ] Tapping response count scrolls to first QOTD response in feed (or opens composer if none exist)
- [ ] Share button shares "Today's question on Worship Room: [question text]" via Web Share API with fallback
- [ ] QOTD card is visible to all users (logged-in and logged-out)

### Response Composer
- [ ] "Share Your Thoughts" button opens inline response composer below the QOTD card
- [ ] Composer has textarea with 500 char max, placeholder "Share your thoughts..."
- [ ] Crisis keyword detection triggers `CrisisBanner` on the textarea input (same pattern as Pray tab)
- [ ] No anonymous checkbox present in the QOTD composer
- [ ] No category selector present in the QOTD composer
- [ ] "Post Response" button submits the response
- [ ] Submitted response has `category: 'discussion'` and `qotdId` linking to today's question
- [ ] After posting, response appears in the feed with the QOTD badge
- [ ] Character count shows remaining characters near the limit

### Feed Integration
- [ ] QOTD responses in the feed show a "Re: Question of the Day" badge above the author name
- [ ] Badge uses muted styling consistent with the category badge pattern (small text, translucent background, pill shape)
- [ ] QOTD responses appear when "All" filter is active
- [ ] QOTD responses appear when "Discussion" filter is active
- [ ] QOTD responses are excluded when any other category filter (Health, Family, etc.) is active
- [ ] QOTD responses otherwise behave identically to prayer cards (interactions, comments, expand, share, bookmark, detail page)

### Category System
- [ ] "Discussion" added as 9th category (slug: `discussion`, label: "Discussion") in the prayer categories constants
- [ ] "Discussion" pill appears after "Other" in the filter bar
- [ ] `PrayerCategory` type union includes `'discussion'`
- [ ] `isValidCategory('discussion')` returns true

### Auth Gating
- [ ] Logged-out users can see the QOTD card, read the question, see the response count, and use the Share button
- [ ] Logged-out users clicking "Share Your Thoughts" see the auth modal with message "Sign in to share your thoughts"
- [ ] Logged-out users cannot open the response composer
- [ ] Logged-in users can open the response composer and post responses
- [ ] Posting a QOTD response triggers `recordActivity('prayerWall')` for faith points

### Responsive Behavior
- [ ] On mobile (< 640px): QOTD card takes full width, response composer expands below, card padding `p-4`
- [ ] On tablet (640-1024px): same single-column layout as the rest of the Prayer Wall feed
- [ ] On desktop (> 1024px): same single-column layout, content constrained to Prayer Wall max-width (720px)
- [ ] All interactive elements meet 44px minimum touch targets
- [ ] Composer textarea and buttons are full-width on mobile

### Accessibility
- [ ] QOTD card has appropriate heading hierarchy
- [ ] Composer textarea has an accessible label
- [ ] "Post Response" button is keyboard accessible
- [ ] Response count link/button is keyboard accessible
- [ ] Screen readers announce the QOTD content meaningfully
- [ ] Crisis banner uses `role="alert"` with `aria-live="assertive"` when triggered

## UX & Design Notes

- **Tone**: Inviting and conversational — the QOTD card should feel like a warm invitation to share, not a survey or assignment
- **Colors**: The `primary/10` background with `primary/20` border creates a subtle violet-tinted card that stands out from the standard frosted glass prayer cards without being garish
- **Typography**: Question text in Inter bold for clarity. Hint in Lora italic for warmth and visual differentiation from the question itself. Label in uppercase tracking-wide Inter for a "section header" feel.
- **Responsive**: Same single-column layout as the rest of the Prayer Wall. The QOTD card simply sits above the filter bar. On mobile, full-width with appropriate padding.
- **Animations**: Gentle fade-in for the composer when it opens. No complex animations needed — the card itself is static content.
- **Scroll behavior**: When tapping response count, use smooth scrolling to the first QOTD response in the feed

### Design System References

- **QOTD card background**: `bg-primary/10 border border-primary/20 rounded-2xl` — new pattern, distinct from the standard frosted glass `bg-white/5 border border-white/10`
- **Label style**: Same `text-xs uppercase tracking-wider text-white/50` pattern used in other section headers
- **Question text**: `text-lg font-bold text-white`
- **Hint text**: `font-serif italic text-sm text-white/50` (Lora)
- **Response count**: `text-sm text-white/60` with hover underline
- **Share button**: Reuse existing `ShareDropdown` or `ShareButton` component pattern from Prayer Wall
- **Composer**: Similar to existing `InlineComposer` but simplified (no anonymous toggle, no category selector)
- **QOTD badge on responses**: Similar pattern to the category badge — small, muted, pill-shaped. Use a slightly different color tint (e.g., `bg-primary/10 text-primary-lt`) to visually connect it to the QOTD card's primary tint
- **Inner Page Hero Pattern**: Reference from `_plans/recon/design-system.md` — the QOTD card sits in the `bg-neutral-bg` feed area below the hero gradient

**New visual patterns introduced:**
1. **Primary-tinted card** — `bg-primary/10 border border-primary/20` is a new card variant not used elsewhere. The existing pattern is `bg-white/5 border border-white/10` frosted glass.
2. **"Re: Question of the Day" badge** — small pill badge on response cards linking them visually to the QOTD. Similar to category badges but with primary tinting.

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the QOTD response composer accepts free-text user input (up to 500 characters). Must run `containsCrisisKeyword()` on input and show `CrisisBanner` if detected, identical to the existing Pray tab and Prayer Wall composer pattern.
- **User input involved?**: Yes — textarea for QOTD responses. Same crisis detection, same 500 char limit, same plain text rendering (no HTML/Markdown).
- **AI-generated content?**: No — questions are hardcoded constants, not AI-generated. Responses are user-generated plain text.
- **Moderation note**: QOTD responses flow through the same moderation pipeline as prayer posts (AI auto-moderation in Phase 3, user reporting available now). The "Discussion" category does not bypass any moderation.

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Can see the QOTD card, read the question text and hint, see the response count
  - Can use the Share button on the QOTD card
  - Can read QOTD responses in the feed (browse, expand comments, share)
  - Cannot open the response composer — "Share Your Thoughts" triggers auth modal: "Sign in to share your thoughts"
  - Cannot post QOTD responses
  - Zero data persistence — everything is read-only from mock data
- **Logged-in**:
  - Full access: view QOTD card, open composer, post responses, interact with responses
  - Responses stored as prayer wall items (mock data in Phase 2, `prayer_requests` table in Phase 3) with `qotdId` and `category: 'discussion'`
  - Posting triggers `recordActivity('prayerWall')` for faith points
- **Route type**: `/prayer-wall` remains Public
- **No new localStorage keys** — responses are stored as prayer wall items with the existing mock data pattern. The `qotdId` field is added to the prayer wall item data model.

## Responsive Behavior

### Mobile (< 640px)
- QOTD card: full width with `p-4` padding, no horizontal margins (matches prayer card layout)
- Response composer: full width below the QOTD card, textarea and button both full width
- Response count and action buttons stack if needed
- All interactive elements (buttons, textarea, response count link) meet 44px minimum touch targets

### Tablet (640-1024px)
- Same single-column layout as mobile and desktop — Prayer Wall is a single-column feed
- QOTD card constrained to the Prayer Wall content max-width
- Slightly more padding (`p-5` or `p-6`)

### Desktop (> 1024px)
- Same single-column layout constrained to Prayer Wall max-width (720px), centered
- QOTD card with `p-6` padding
- Hover states on Share button, response count link, and "Share Your Thoughts" button

## Out of Scope

- Backend API for QOTD (Phase 3+)
- AI-generated questions (questions are hardcoded constants)
- User-submitted questions
- Question voting or popularity ranking
- Multiple responses per user per day (no limit enforced in Phase 2 — users can respond multiple times)
- Question history / archive page ("What was yesterday's question?")
- Dashboard nudge for unanswered QOTD (described as optional/low-priority in the brief — deferred)
- Notification when someone responds to the same QOTD you responded to
- Question theming based on liturgical calendar or holidays
- Admin ability to override the daily question
- QOTD on the Prayer Wall detail page (detail page shows a single prayer — no QOTD card)
- Real-time response count updates (page reload shows updated count)
