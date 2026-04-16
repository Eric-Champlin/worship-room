# Feature: Personal Prayer List

## Overview

The Prayer Wall serves the community — a shared space for collective intercession. But personal prayer life is inherently private. Users who want to track their own requests, celebrate answered prayers, and organize their spiritual conversations with God currently have no dedicated space. Competitive analysis against PrayerMate and Echo Prayer confirms this gap: a private prayer management tool is a core expectation for Christian wellness apps.

The Personal Prayer List gives logged-in users a `/my-prayers` page where they can create, organize, and track their own prayer requests. Each prayer has a title, description, category, and status (active or answered). When a prayer is answered, users can record a testimony note and the prayer displays with a visual celebration of God's faithfulness. A gentle "Pray for this" interaction lets users mark when they've lifted a prayer, creating a personal rhythm of intentional prayer.

This is the first of a 2-spec sequence. This spec covers the data model, list page, CRUD operations, and core interactions. Spec 19 will add answered tracking enhancements, reminder functionality, and deeper engagement features.

## User Stories

As a **logged-in user**, I want to maintain a private list of my own prayer requests so that I can organize my prayer life and track what I'm bringing to God.

As a **logged-in user**, I want to mark a prayer as answered and record what happened so that I can look back and see God's faithfulness over time.

As a **logged-out visitor**, I want to be redirected away from the prayer list page so that I understand this is a personal feature requiring an account.

## Requirements

### Data Model

- localStorage key: `wr_prayer_list`
- Stores an array of prayer items with the following fields:
  - `id`: UUID (generated via `crypto.randomUUID()`)
  - `title`: string, required, max 100 characters (short summary of the prayer)
  - `description`: string, optional, max 1000 characters (full prayer request text)
  - `category`: one of 8 values — `health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other` (same categories as Prayer Wall)
  - `status`: `"active"` or `"answered"`
  - `createdAt`: ISO 8601 timestamp
  - `updatedAt`: ISO 8601 timestamp
  - `answeredAt`: ISO 8601 timestamp or `null` (set when status changes to "answered")
  - `answeredNote`: string, optional, max 500 characters (testimony text when marked answered)
  - `lastPrayedAt`: ISO 8601 timestamp or `null` (set when user taps "Pray for this")
- Maximum 200 prayer items stored; attempting to add beyond 200 shows a message: "You've reached the 200 prayer limit. Consider archiving answered prayers to make room."
- Storage service follows the same pattern as other storage services in the project: pure functions, typed interfaces, corrupted data recovery (JSON parse with try/catch, fallback to empty array)

### Page Layout — `/my-prayers`

- Dark background matching the inner page hero pattern (purple gradient fading to neutral background)
- Uses existing `PageHero` component with:
  - Heading: "My Prayers"
  - Subheading: "Your personal conversation with God."
- Below the hero, the page body uses a neutral `#F5F5F5` background with content constrained to max-width `720px` (same as Prayer Wall) centered with `mx-auto`

### Action Bar

- Positioned below the hero, above the prayer list
- Sticky behavior: becomes fixed below the navbar when the user scrolls past it
- Contains:
  - **"Add Prayer" button**: Primary CTA style (violet background, white text, Plus icon from Lucide). Opens the inline composer at the top of the list.
  - **Filter pills**: "All", "Active" (default), "Answered" — each showing a count in parentheses (e.g., "Active (12)")
- The "Active" filter is selected by default when the page loads
- Selecting a filter updates the displayed list immediately (client-side filtering)
- Action bar styling: neutral background with subtle bottom border, matching the sticky filter bar pattern from Prayer Wall category filtering

### Prayer Cards

- Displayed as a vertical list of cards below the action bar
- Each card shows:
  - **Title**: bold text, full display
  - **Description**: truncated to 2 lines with a "Show more" / "Show less" toggle. When expanded, full text displays.
  - **Category pill**: muted styling matching the Prayer Wall category badge pattern — small rounded pill with subtle background and muted text color
  - **Relative timestamp**: e.g., "3 days ago", "just now" — using the existing `timeAgo()` utility from `lib/time.ts`
  - **Last prayed indicator**: if the user has tapped "Pray for this" at least once, show a small "Prayed" text with the date below the timestamp (e.g., "Prayed today", "Prayed 2 days ago")

### Card Actions

Each prayer card has the following action buttons:

1. **"Pray for this"**: Triggers a brief devotional moment — the card border/background glows softly in primary color (`#6D28D9` at low opacity) for approximately 1 second, then fades back. Updates `lastPrayedAt` to the current timestamp. Shows/updates the "Prayed" indicator on the card.

2. **"Mark Answered"** (active prayers only): Opens an inline form directly on the card with:
   - Optional testimony text input (placeholder: "What happened?", max 500 characters, character counter)
   - "Confirm" and "Cancel" buttons
   - Crisis detection on the testimony text input via `CrisisBanner`
   - On confirm: sets `status` to `"answered"`, `answeredAt` to current timestamp, stores the testimony note

3. **"Edit"**: Toggles the card into inline edit mode where:
   - Title becomes an editable text input (pre-filled)
   - Description becomes an editable textarea (pre-filled)
   - Category pills appear for re-selection
   - "Save" and "Cancel" buttons replace the action buttons
   - Crisis detection on both title and description inputs via `CrisisBanner`
   - On save: updates the prayer item and sets `updatedAt` to current timestamp

4. **"Delete"**: Shows a confirmation dialog: "Remove this prayer? This cannot be undone." with "Remove" (danger style) and "Cancel" buttons. On confirm: removes the prayer from localStorage permanently.

### Answered Prayer Display

- Answered prayers have a distinct visual treatment:
  - Green left border (using `success` color `#27AE60`)
  - "Answered" badge with a CheckCircle icon (Lucide) and the answered date
  - If a testimony note exists, it displays below the description in a slightly different text style (italic or muted)
- Answered prayers sort to the bottom of the list within their date order (active prayers first, then answered, each sub-group sorted by `createdAt` descending)

### Inline Composer

- Opens at the top of the prayer list when "Add Prayer" is clicked
- Slides open with a 300ms ease animation
- Contains:
  - **Title input**: required, placeholder "What do you want to pray about?", max 100 characters with character counter shown when > 80 characters typed
  - **Description textarea**: optional, placeholder "Add details...", max 1000 characters with character counter shown when > 800 characters typed
  - **Category selector**: 8 category pills in a wrapping/scrollable row, required — uses the same styling as the Prayer Wall composer category selector
  - **Validation**: Title is required, category is required. Show inline validation messages on attempted submit: "Please add a title" and "Please choose a category" in warning color (`#F39C12`)
  - **Crisis detection**: Both title and description inputs trigger `CrisisBanner` if crisis keywords are detected
  - **"Save Prayer" button**: Primary CTA style, disabled until title and category are selected
  - **"Cancel" button**: Text/secondary style, collapses the composer with reverse animation
- After saving, the composer collapses and the new prayer appears at the top of the active list

### Empty State

- Shown when the user has zero prayer items (no active or answered prayers)
- Centered layout with:
  - A subtle icon or decorative element (e.g., a hands-praying icon from Lucide or similar)
  - Heading text: "Your prayer list is empty"
  - Subtext: "Start tracking what's on your heart"
  - "Add Prayer" CTA button (primary style, Plus icon)
- The empty state uses gentle styling consistent with other empty states in the app (see Phase 2.75 empty states spec for pattern)

### Navbar Integration

- Add a "My Prayers" link to the navbar for logged-in users
- Placement: in the logged-in user's dropdown menu (avatar dropdown), grouped near prayer-related items
- The link only appears when the user is authenticated
- On mobile, the link appears in the mobile drawer menu in the same logical position

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Visiting `/my-prayers` redirects to the landing page (`/`)
  - The "My Prayers" navbar link does not appear for logged-out users
  - Zero data persistence — no localStorage reads or writes for the prayer list when logged out
- **Logged-in**:
  - Full access to all features: viewing, creating, editing, deleting, filtering, praying
  - All data stored in `wr_prayer_list` localStorage key
  - `logout()` clears auth state but preserves prayer list data (consistent with existing behavior where logout preserves all user data)
- **Route type**: Protected — entire `/my-prayers` route is auth-gated

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the title input, description textarea, and answered testimony text input all accept free text. Crisis keywords must be detected and the `CrisisBanner` shown when triggered.
- **User input involved?**: Yes — three text input fields: prayer title (100 chars), prayer description (1000 chars), answered testimony note (500 chars)
- **AI-generated content?**: No — this spec involves no AI generation. All content is user-authored.
- **Content is private**: Unlike the Prayer Wall, personal prayers are not visible to other users, so community moderation is not applicable. However, crisis detection still applies because the user may express self-harm ideation in their private prayers.

## UX & Design Notes

- **Tone**: Intimate and personal. This is the user's private prayer journal — the UI should feel like a sacred, quiet space. Gentle typography, generous whitespace, no gamification elements on this page.
- **Colors**: Dark hero gradient (inner page pattern), neutral content background. Cards on white/near-white. Answered prayers use success green accent. Primary violet for CTAs and the "pray" glow effect.
- **Typography**: Inter for all UI text. Lora (serif) may be used for the testimony note display to give it a journal-like quality.
- **Responsive**: Mobile-first design with specific breakpoint behaviors defined below.
- **Animations**: Composer slide open/close (300ms ease). "Pray for this" glow (1s fade in/out on card). Minimal motion otherwise — this is a utility page, not a showcase.

### Design System References

- **Page hero**: Uses existing `PageHero` component — same inner page hero gradient from `_plans/recon/design-system.md`
- **Prayer cards**: Same card pattern as Prayer Wall cards — `rounded-xl border border-gray-200 bg-white p-6`
- **Category pills**: Same muted pill styling as Prayer Wall category badges — `text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-1`
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- **Filter pills in action bar**: Similar to Prayer Wall filter bar but on a light background — `bg-white border border-gray-200 text-text-dark rounded-full` for unselected, `bg-primary text-white rounded-full` for selected
- **Sticky action bar**: Similar to Prayer Wall sticky filter bar pattern
- **Empty state**: Follow the empty state pattern from Phase 2.75 empty states spec

**New visual patterns introduced:**
1. **Pray glow effect on card** — a soft primary-colored glow that temporarily highlights a card border/background when "Pray for this" is tapped. Not used elsewhere in the app. Similar concept to the glow-pulse on textareas but applied to a card element with a single pulse (not infinite).
2. **Green left border for answered prayers** — a `border-l-4 border-success` treatment to visually distinguish answered prayers. New pattern.
3. **Light-background sticky action bar** — the action bar uses neutral/white styling rather than the dark frosted glass of the Prayer Wall filter bar, since the content area below it is light. New variant of the sticky bar pattern.

## Responsive Behavior

### Mobile (< 640px)
- Prayer cards: full width with `px-4` side padding
- Action buttons on cards: collapsed into a three-dot overflow menu (ellipsis icon). Tapping the menu shows a dropdown with "Pray for this", "Mark Answered" / "Edit", "Delete" options. The dropdown follows existing dropdown patterns (dark background, white text, `animate-dropdown-in`).
- Composer: full width, category pills horizontally scrollable with hidden scrollbar
- Filter pills in action bar: horizontally scrollable with hidden scrollbar
- Action bar: full width, Add Prayer button and filter pills in a single row (button on left, pills scroll on right) or stacked if space is tight (button above, pills below)
- Sticky action bar: sticks below mobile navbar (~56px top offset)
- Empty state: centered, padded, icon scales down

### Tablet (640–1024px)
- Prayer cards: constrained to 720px max-width, centered
- Action buttons on cards: displayed inline on the card (same as desktop)
- Composer: constrained width, category pills may wrap
- Filter pills: may wrap or scroll depending on width
- Sticky action bar: adjusted for tablet navbar height

### Desktop (> 1024px)
- Prayer cards: constrained to 720px max-width, centered
- Action buttons on cards: displayed inline on the card right side — icon buttons with tooltips for "Pray for this", "Edit", "Delete"; text button for "Mark Answered"
- Composer: constrained width, category pills wrap naturally
- Filter pills: wrap if needed, all visible without scrolling
- Sticky action bar: adjusted for desktop navbar height
- Hover states on cards: subtle shadow elevation on hover

## Acceptance Criteria

### Data Model & Storage
- [ ] `wr_prayer_list` localStorage key stores a JSON array of prayer items
- [ ] Each prayer item has: `id` (UUID), `title` (string, max 100), `description` (string, max 1000), `category` (one of 8 slugs), `status` ("active" | "answered"), `createdAt`, `updatedAt`, `answeredAt` (nullable), `answeredNote` (nullable, max 500), `lastPrayedAt` (nullable)
- [ ] Storage service uses pure functions with typed interfaces and corrupted data recovery (try/catch JSON parse, fallback to empty array)
- [ ] Maximum 200 items enforced — attempting to add item 201 shows a limit message
- [ ] All localStorage writes are no-ops when the user is not authenticated

### Page & Layout
- [ ] `/my-prayers` route exists and renders the personal prayer list page
- [ ] Page uses existing `PageHero` component with heading "My Prayers" and subheading "Your personal conversation with God."
- [ ] Hero gradient matches the inner page hero pattern from the design system recon
- [ ] Content area below hero uses neutral `#F5F5F5` background with 720px max-width centered
- [ ] Page is wrapped in the shared `Layout` component (Navbar + Footer)

### Auth Gating
- [ ] Logged-out user visiting `/my-prayers` is redirected to `/` (landing page)
- [ ] "My Prayers" navbar link only appears for authenticated users
- [ ] "My Prayers" link appears in the logged-in user's avatar dropdown menu
- [ ] "My Prayers" link appears in the mobile drawer for authenticated users
- [ ] No localStorage reads or writes occur for `wr_prayer_list` when the user is not authenticated

### Action Bar
- [ ] Action bar displays below the hero with "Add Prayer" button and filter pills
- [ ] "Add Prayer" button uses primary CTA style with Plus icon
- [ ] Filter pills show "All", "Active", "Answered" with counts in parentheses
- [ ] "Active" filter is selected by default on page load
- [ ] Selecting a filter updates the displayed list immediately
- [ ] Action bar becomes sticky below the navbar when scrolling past it

### Prayer Cards
- [ ] Each prayer card shows title (bold), description (truncated to 2 lines), category pill, and relative timestamp
- [ ] "Show more" / "Show less" toggle expands/collapses the description on cards with long text
- [ ] Category pill uses muted styling matching Prayer Wall category badges
- [ ] Relative timestamps use the existing `timeAgo()` utility
- [ ] "Prayed" indicator with date appears on cards where `lastPrayedAt` is set

### Card Actions — Desktop
- [ ] Desktop cards display action buttons inline: "Pray for this", "Mark Answered"/"Edit", "Delete"
- [ ] "Pray for this" triggers a 1-second soft glow on the card in primary color and updates `lastPrayedAt`
- [ ] "Mark Answered" opens an inline form with optional testimony text input (max 500 chars), character counter, "Confirm" and "Cancel" buttons
- [ ] "Mark Answered" form has crisis detection via `CrisisBanner` on the testimony text input
- [ ] Confirming "Mark Answered" sets status to "answered", sets `answeredAt`, and stores the testimony note
- [ ] "Edit" toggles the card into inline edit mode with editable title, description, and category pills
- [ ] Edit mode has crisis detection via `CrisisBanner` on title and description inputs
- [ ] Saving edits updates the prayer item and sets `updatedAt`
- [ ] "Delete" shows a confirmation dialog: "Remove this prayer? This cannot be undone." with "Remove" and "Cancel"
- [ ] Confirming delete permanently removes the prayer from localStorage

### Card Actions — Mobile
- [ ] On mobile (< 640px), action buttons are hidden behind a three-dot overflow menu
- [ ] Tapping the overflow menu shows a dropdown with all action options
- [ ] Dropdown follows existing dropdown styling patterns

### Answered Prayers
- [ ] Answered prayers display with a green left border (`#27AE60`)
- [ ] Answered prayers show an "Answered" badge with CheckCircle icon and answered date
- [ ] Testimony note displays below the description when present
- [ ] Answered prayers sort to the bottom of the list (active first, then answered, each sorted by `createdAt` descending)

### Inline Composer
- [ ] Clicking "Add Prayer" opens the inline composer at the top of the list with a 300ms slide animation
- [ ] Composer has: title input (required, placeholder "What do you want to pray about?", max 100 chars), description textarea (optional, placeholder "Add details...", max 1000 chars), 8 category pills (required), "Save Prayer" and "Cancel" buttons
- [ ] Character counters appear when title > 80 chars and description > 800 chars
- [ ] "Save Prayer" button is disabled until title is entered and a category is selected
- [ ] Submitting without title shows "Please add a title" in warning color
- [ ] Submitting without category shows "Please choose a category" in warning color
- [ ] Crisis detection via `CrisisBanner` is active on both title and description inputs
- [ ] Saving collapses the composer and the new prayer appears at the top of the active list
- [ ] "Cancel" collapses the composer with reverse animation

### Empty State
- [ ] When user has zero prayers, empty state displays with prayer icon, "Your prayer list is empty" heading, "Start tracking what's on your heart" subtext, and "Add Prayer" CTA
- [ ] Empty state CTA opens the inline composer

### Responsive
- [ ] On mobile (< 640px): cards full width, action buttons in overflow menu, pills horizontally scrollable, sticky bar below mobile navbar
- [ ] On tablet (640–1024px): cards at 720px max-width centered, action buttons inline, pills may wrap
- [ ] On desktop (> 1024px): cards at 720px max-width centered, action buttons inline with hover states, pills wrap naturally

### Accessibility
- [ ] All interactive elements have minimum 44px touch targets
- [ ] Keyboard users can navigate all pills, buttons, and form elements with Tab
- [ ] Enter/Space activates pills and buttons
- [ ] Delete confirmation dialog traps focus
- [ ] Screen readers announce filter changes, composer open/close, and action outcomes
- [ ] "Pray for this" glow animation respects `prefers-reduced-motion` (skip animation, still update data)

## Out of Scope

- Prayer reminders and notification scheduling (Spec 19)
- Answered prayer statistics and celebration enhancements (Spec 19)
- Prayer categories different from the Prayer Wall's 8 categories
- Prayer sharing from personal list to Prayer Wall
- Backend API persistence (Phase 3+ — data stays in localStorage)
- Multi-select or bulk operations on prayers
- Prayer sorting options (fixed sort: active first by date, answered last by date)
- Import/export of prayer data
- Tags or sub-categories beyond the 8 predefined categories
- AI-generated prayer suggestions or prompts on this page
- Collaborative/shared prayer lists
- Prayer groups
- Drag-and-drop reordering
