# Feature: Prayer Wall Redesign

## Overview

The Prayer Wall is the community heart of Worship Room — a place where users can share prayer requests, encourage one another, and experience the power of communal faith. This redesign transforms the existing static list into a warm, interactive social feed inspired by CaringBridge, making the experience feel alive, personal, and deeply connected.

The existing backend API, database tables, and test infrastructure remain unchanged. This is a visual and UX overhaul: new card layouts, inline interactions, user profiles, and mock-data-driven development so every UI state can be tested without backend calls.

## User Stories

As a **logged-out visitor**, I want to browse prayer requests in a warm, social-feed layout so that I feel welcomed into a supportive community before creating an account.

As a **logged-in user**, I want to post a prayer request inline (without leaving the feed), expand comments on any card, @mention others in replies, share prayers with friends, and manage my activity from a personal dashboard so that the Prayer Wall feels like a living, breathing community — not a static bulletin board.

As a **logged-in user viewing my own prayer**, I want to mark it as answered with a praise update, delete it, and see my full activity history so that I can steward my prayer journey.

## Requirements

### Hero Section
- Full-width purple gradient hero matching the home page style (dark purple fading to neutral background)
- Title: "Prayer Wall" in large white bold text
- Subtitle: "You're not alone." in white
- The hero does NOT contain the post button — that lives in the feed section below

### Prayer Card Redesign
- Each card shows a circular avatar (initials-based for Phase 1), author first name, em-dash date separator, and full date ("Feb 24, 2026")
- Clicking avatar or name navigates to public profile (except anonymous posts)
- Prayer text truncates at ~150 characters with "Show more" that expands the full text in-place (no navigation), and "Show less" to collapse
- Interaction bar: Praying for you (with count), Light a candle (with count), Comment (with count, toggles inline comments), Bookmark (logged-in only), Share (opens share sheet)
- Answered prayers show a green badge with optional praise text in serif italic (testimony style)
- White card with subtle border, 12px border radius, hover shadow on desktop

### Inline Post Composer
- "Share a Prayer Request" button at the top of the feed
- Logged-out: redirects to login with return URL
- Logged-in: expands an inline card that pushes the feed down (not a modal or separate page)
- Smooth slide-down animation (300ms ease)
- Textarea with auto-grow, placeholder "What's on your heart?", anonymous checkbox, character counter at 500+, disclaimer text
- Cancel button collapses the composer; submit adds the prayer to the top of the feed with a slide-in animation and success toast
- Replaces the current separate `/prayer-wall/new` page

### Inline Comments
- Clicking the Comment button on any card expands a comments section inline below the interaction bar
- Clicking again collapses it (smooth height transition)
- Shows up to 5 comments initially (newest first) with "See more comments" link
- Each comment shows avatar, name, relative date, and comment text
- @mention replies: clicking Reply on a comment auto-populates input with `@FirstName`; @mentions styled in bold purple and link to the user's profile
- Comment input: single-line that grows on focus; placeholder "Write a comment..."
- Logged-out users can expand and read comments but cannot post (input shows "Log in to comment")

### Share Functionality
- Share button opens native Web Share API on mobile (with fallback)
- On desktop: dropdown with Copy Link, Email, SMS, Facebook, Twitter/X options
- Share URL points to the detail page (`/prayer-wall/:id`)
- Share text template: "Please pray with me [first 100 chars]... -- Worship Room Prayer Wall"

### Detail Page (Updated Role)
- Serves as the standalone view for shared links and direct navigation
- Shows full prayer text (no truncation), all comments expanded (no 5-comment limit), comment input, interaction buttons, answered section, owner actions, report link, back link
- Visually matches the feed card style but full-width with all content expanded

### Bump/Sort Logic
- Default: newest first by last activity timestamp
- New comment or "marked as answered" bumps a prayer to the top
- Praying and candle taps do NOT bump

### Public Profile Page (`/prayer-wall/user/:id`)
- Shows avatar, first name, bio (500 char max), join date
- Three tabs: Prayers (user's posts), Replies (comments they've made), Reactions (prayers they've supported)
- Anonymous prayers do not appear on profiles
- Back link to Prayer Wall

### Private Dashboard (`/prayer-wall/dashboard`)
- Protected route (login required)
- Editable avatar, display name, and bio
- Five tabs: My Prayers (with Mark as Answered + Delete actions), My Comments, Bookmarks, Reactions, Settings
- Settings tab: profile editing and notification preference toggles (toggles shown but marked "coming soon" for Phase 1)

### Profile Photo System
- Phase 1: initials avatar only (auto-generated circle with first + last initials on a consistent colored background)
- Phase 2 (out of scope): photo upload and stock photo library
- Mock data should include a mix of initials avatars and placeholder image URLs to test both visual states

### Mock Data
- All UI work powered by hardcoded mock data arrays (no backend calls required)
- 8-10 mock users with varying avatar types (initials, placeholder URLs, one anonymous)
- 15-20 mock prayers with varying lengths, dates, interaction counts, and answered states
- 30-40 mock comments spread across prayers, including @mention replies
- Mock reaction and bookmark states

## Acceptance Criteria

- [ ] Hero section matches home page purple gradient style with "Prayer Wall" title and "You're not alone." subtitle
- [ ] Prayer cards show avatar, author name + date, truncated text with "Show more" / "Show less" in-place expansion
- [ ] Interaction bar renders all 5 buttons (Pray, Candle, Comment, Bookmark, Share) with correct active/inactive/logged-out states
- [ ] Inline composer expands/collapses smoothly at the top of the feed when "Share a Prayer Request" is clicked
- [ ] Comments expand/collapse inline below each prayer card when Comment button is toggled
- [ ] @mentions in comments are styled bold purple and link to the user's public profile
- [ ] Share button opens native share sheet on mobile and dropdown on desktop
- [ ] Detail page shows full prayer with all comments expanded, owner actions for own prayers
- [ ] Public profile page shows user info with Prayers/Replies/Reactions tabs
- [ ] Private dashboard shows editable profile, My Prayers/My Comments/Bookmarks/Reactions/Settings tabs
- [ ] Answered prayers display green badge with optional praise text in testimony style
- [ ] All UI states testable via mock data without backend dependency
- [ ] Responsive: mobile (full-width cards, sticky bottom post button), tablet (padded cards), desktop (720px max-width, hover shadows)
- [ ] Smooth animations on all expand/collapse interactions (300ms ease)
- [ ] Logged-out users can read, expand text, expand comments, pray, light candles, and share — but cannot post, comment, or bookmark
- [ ] `/prayer-wall/new` route removed; posting handled by inline composer

## UX & Design Notes

- **Tone**: Warm, communal, alive — like a social feed for prayer, not a static bulletin board
- **Colors**: White cards (`#FFFFFF`) on neutral background (`#F5F5F5`), subtle border (`#E5E7EB`), primary purple (`#6D28D9`) for active praying/bookmark states, warm amber (`#F59E0B`) for candle, success green (`#27AE60`) for answered badges
- **Typography**: Inter for body/headings, Lora Italic for answered prayer testimony text (praise updates). Author names in Inter Semi-bold 600, dates in Inter Regular 400 text-light, prayer body in Inter Regular 400 text-dark with line-height 1.6
- **Cards**: 12px border radius, 20-24px padding, 16px gap between cards, subtle hover shadow on desktop
- **Responsive**: Mobile-first. Mobile: full-width cards, sticky bottom post button. Tablet: padded cards. Desktop: 720px max-width centered feed with hover effects.
- **Animations**: Composer expand (300ms ease + opacity fade), text expand (200ms ease), comments expand (300ms ease), prayer tap pulse, candle glow ripple, card hover lift, toast slide-in from top-right (4s auto-dismiss)
- **Avatar**: 40-48px circular. Initials on colored background for Phase 1. Generic silhouette for anonymous.

## AI Safety Considerations

- **Crisis detection needed?**: No (deferred from this phase -- the spec explicitly excludes crisis detection)
- **User input involved?**: Yes -- prayer post text and comment text. Both rendered as plain text only (`white-space: pre-wrap`). No HTML, no Markdown, no `dangerouslySetInnerHTML`. React's default escaping handles XSS prevention.
- **AI-generated content?**: No -- this redesign is purely UI/UX with mock data. No AI features involved.
- **Moderation note**: The existing reporting mechanism (Report button on prayers) is preserved. Admin moderation interface updates are out of scope for this phase.

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Can read all prayers, expand text, expand comments, use Pray/Candle (session dedup, anonymous increment -- not persisted to any profile), share links, view public profiles
  - Cannot post prayers, post comments, bookmark, or access dashboard
  - Zero data persistence for logged-out users (session-only state)
- **Logged-in**:
  - Full access to all features: post prayers, post comments, bookmark, access dashboard, manage own prayers
  - Prayers saved to `prayer_requests` table, comments to `prayer_replies`, bookmarks to `prayer_bookmarks`, reports to `prayer_reports`
- **Route types**:
  - `/prayer-wall` -- Public
  - `/prayer-wall/:id` -- Public
  - `/prayer-wall/user/:id` -- Public
  - `/prayer-wall/dashboard` -- Protected (login required)
- **Removed route**: `/prayer-wall/new` -- replaced by inline composer on feed page

## Out of Scope

- Crisis detection on post/comment submit (deferred)
- Real push notifications (Phase 2 -- show UI placeholder toggles only)
- Stock photo library for avatars (Phase 2 -- initials avatar only)
- Photo upload for avatars (Phase 2 -- show placeholder UI)
- Real backend wiring for new features (all new UI uses mock data)
- Categories, tags, or search
- Rich text or image uploads in prayers/comments
- Auto-archiving or expiration of prayers
- Private/group prayer walls
- Admin moderation interface updates
- Real-time WebSocket updates
- Conversion prompts for logged-out users (explicitly removed)
- Nested/threaded comments (flat list with @mentions only)
- Notification backend wiring (UI toggles only, marked "coming soon")
