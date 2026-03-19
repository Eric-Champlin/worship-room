# Feature: Prayer Wall Category Filtering

## Overview

The Prayer Wall currently shows all prayer requests in a single undifferentiated feed. As the community grows, users need a way to find prayers that resonate with their own season of life — whether they're navigating grief, celebrating a praise report, or seeking health-related prayer support. Category filtering transforms the Prayer Wall from a chronological stream into an organized, navigable community space where users can both target their intercession and feel seen by sharing in a specific category.

This feature adds two connected pieces: a **category selector** in the inline composer (so every new prayer is tagged) and a **sticky filter bar** on the feed (so users can browse by category). Categories are bookmarkable via URL query parameters, making it easy to share a filtered view (e.g., "Check out the Gratitude prayers on Worship Room").

## User Stories

As a **logged-out visitor**, I want to filter the Prayer Wall feed by category so that I can find prayers relevant to my current situation and feel a deeper connection to the community before creating an account.

As a **logged-in user**, I want to select a category when composing a prayer request so that my prayer reaches the people most likely to relate to my situation and pray with understanding.

As a **logged-out visitor or logged-in user**, I want to share a link to a filtered category view so that I can direct someone to a specific set of prayers (e.g., "Here are prayers about grief — you're not alone").

## Requirements

### Categories

- 8 categories: **Health**, **Family**, **Work**, **Grief**, **Gratitude**, **Praise**, **Relationships**, **Other**
- Stored as a `category` field on the prayer data model (string, lowercase slug: `health`, `family`, `work`, `grief`, `gratitude`, `praise`, `relationships`, `other`)
- Every prayer must have exactly one category — no multi-select, no uncategorized prayers

### Composer Category Selector

- Appears in the inline composer, below the textarea and above the anonymous checkbox
- Shows all 8 categories as horizontally scrollable pills in a single row
- Category is required — submitting without a category shows an inline validation message
- Validation message: "Please choose a category" in warning color (`#F39C12`), displayed below the pill row
- Only one category can be selected at a time (radio-button behavior)
- Selected category is submitted with the prayer and stored on the prayer object

### Feed Filter Bar

- Positioned below the Prayer Wall hero section and above the prayer card feed
- Contains "All" (default) plus all 8 category pills in a horizontally scrollable row
- "All" is selected by default and shows all prayers
- Selecting a category filters the feed to show only prayers matching that category
- Selecting "All" clears the filter and shows all prayers
- When a filter is active, each category pill shows the count of matching prayers in parentheses — e.g., "Health (12)"
- When "All" is active, no counts are shown on any pill
- The filter bar uses frosted glass styling matching the Prayer Wall hero area
- The filter bar becomes sticky (fixed below the navbar) when the user scrolls past it
- Active filter persists across scroll position — scrolling up/down does not reset the filter

### URL-Based Filter State

- Active filter is stored as a URL query parameter: `?category=health`, `?category=grief`, etc.
- "All" removes the query parameter (clean URL: `/prayer-wall`)
- Filtered views are shareable and bookmarkable — visiting `/prayer-wall?category=gratitude` pre-selects that filter
- The URL updates without a full page reload (use browser history pushState or React Router search params)
- Invalid category values in the URL are ignored — fall back to "All"

### Empty State for Filtered Views

- When a category filter returns zero results, show an empty state message:
  - Text: "No prayers in this category yet. Be the first to share."
  - CTA button: "Share a Prayer Request" — opens the inline composer (auth-gated for logged-out users)
- The empty state uses the same centered, gentle styling as other empty states in the app

### Category Badge on Prayer Cards

- Each prayer card shows a small category badge below the author name / timestamp line
- Badge styling: muted and unobtrusive — small text, translucent background, pill shape
- The badge text is the category name in title case (e.g., "Health", "Gratitude")
- Tapping/clicking the badge filters the feed to that category (same as selecting the pill in the filter bar)

### Category Pill Styling

The same pill styling is used in both the composer selector and the feed filter bar:

- **Unselected**: translucent background with subtle border, muted text — matching the existing dark-on-translucent chip patterns used elsewhere in the app
- **Selected**: primary-tinted background with primary border, primary-light text — clearly distinguished from unselected state
- Pills use `rounded-full` shape
- Minimum touch target: 44px height for accessibility
- Pill row is horizontally scrollable on mobile with hidden scrollbar
- On desktop, pills wrap to multiple lines if needed (flex-wrap)

### Mock Data Updates

- All existing mock prayer data must be updated to include a `category` field
- Categories should be distributed across all 8 options (not all the same category)
- Distribution should feel natural — e.g., more Health/Family/Relationships prayers, fewer Praise/Other

## Acceptance Criteria

- [ ] `PrayerRequest` TypeScript interface includes a `category` field typed as a union of the 8 category slugs
- [ ] All 18+ existing mock prayers have a `category` assigned, distributed across all 8 categories
- [ ] Inline composer shows 8 category pills below textarea and above anonymous checkbox when expanded
- [ ] Attempting to submit a prayer without selecting a category shows "Please choose a category" in warning color below the pills
- [ ] Selecting a category pill in the composer highlights it with the selected style and deselects any previous selection
- [ ] Submitted prayers include the selected category in the prayer object
- [ ] Filter bar appears below the Prayer Wall hero and above the prayer cards
- [ ] Filter bar shows "All" plus 8 category pills with correct unselected/selected styling
- [ ] Clicking a category pill in the filter bar filters the feed to show only matching prayers
- [ ] Clicking "All" shows all prayers and clears the URL query parameter
- [ ] Active category filter is reflected in the URL as `?category=<slug>`
- [ ] Visiting `/prayer-wall?category=health` pre-selects the Health filter and shows only Health prayers
- [ ] Invalid `?category=` values fall back to showing all prayers
- [ ] When a filter is active, category pills show counts — e.g., "Health (12)"
- [ ] Counts are not shown when "All" is selected
- [ ] Filtered view with zero results shows empty state: "No prayers in this category yet. Be the first to share." with CTA
- [ ] Empty state CTA opens the composer (auth-gated for logged-out users)
- [ ] Each prayer card displays a category badge below the author name / timestamp line
- [ ] Category badge uses muted styling: small text, translucent background, pill shape
- [ ] Clicking a category badge on a prayer card filters the feed to that category
- [ ] Filter bar has frosted glass styling matching the Prayer Wall hero aesthetic
- [ ] Filter bar becomes sticky below the navbar when scrolling past it
- [ ] On mobile (< 640px), filter pills are horizontally scrollable with hidden scrollbar
- [ ] On tablet (640–1024px), filter pills are horizontally scrollable or wrap depending on space
- [ ] On desktop (> 1024px), filter pills wrap to multiple lines if needed (flex-wrap)
- [ ] Composer category pills are horizontally scrollable on mobile, wrap on desktop
- [ ] All pill touch targets are at least 44px in height
- [ ] Logged-out users can browse the feed, use all filter pills, and click category badges — no auth required for filtering
- [ ] Logged-out users clicking the empty state CTA see the auth modal (same pattern as existing composer auth gate)
- [ ] Filter state persists when expanding/collapsing prayer text, comments, or interacting with cards
- [ ] Keyboard users can navigate filter pills with Tab and activate with Enter/Space
- [ ] Screen readers announce the active filter state and pill selection changes

## UX & Design Notes

- **Tone**: Organized but warm — categories help users find where they belong, not bureaucratically sort content
- **Colors**: Pill styling uses translucent whites and primary accents on the dark hero/filter bar background. Category badge on cards uses very muted styling on the white card background so it doesn't compete with prayer content
- **Typography**: Pill text in Inter, category badge in Inter small/extra-small weight
- **Responsive**: Mobile-first. Pills scroll horizontally on mobile (no wrapping, prevents excessive vertical space). Desktop pills wrap naturally. Filter bar full-width, content constrained to Prayer Wall max-width (720px)
- **Animations**: Pill selection has a subtle transition (background/border color, ~150ms ease). Filter bar sticky transition is instant (no slide-in). Feed filtering is immediate (no loading state needed for client-side mock data)
- **Sticky behavior**: Filter bar sticks below the navbar. On mobile where the navbar is ~56px, the filter bar's `top` accounts for this. The Prayer Wall hero scrolls away normally; only the filter bar sticks.

### Design System References

- **Pill unselected style**: `bg-white/10 border border-white/15 text-white/70 rounded-full` — similar pattern to the existing prayer starter chips but adapted for dark backgrounds
- **Pill selected style**: `bg-primary/20 border-primary/40 text-primary-lt rounded-full` — uses the primary violet accent for clear selection state
- **Category badge on cards**: `text-xs bg-white/5 rounded-full px-2 py-0.5 text-white/40` — wait, cards are white background, so badge should use `bg-gray-100 text-gray-500` or similar muted light-background styling instead
- **Filter bar frosted glass**: Match the Prayer Wall hero's dark gradient aesthetic — `bg-hero-mid/90 backdrop-blur-sm border-b border-white/10`
- **Warning validation color**: `text-warning` (#F39C12)
- **Inner Page Hero Pattern**: Reference from `_plans/recon/design-system.md` — the filter bar visually connects to the hero gradient

**New visual patterns introduced:**
1. **Sticky filter bar** — not yet used elsewhere in the app. Dark frosted glass that becomes sticky on scroll. This is a new pattern.
2. **Category badge on white cards** — small muted pill badge. Similar concept to the "Answered" badge but different styling for categories.
3. **Dark-background pill selector** — the filter bar pills and composer pills use translucent styling on dark backgrounds. The existing Prayer Wall chips are on white backgrounds, so this is a new pattern variant.

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature adds filtering and categorization, not new text input fields. The existing inline composer already has its own crisis detection handling.
- **User input involved?**: No new user input — category selection is predefined pill buttons. The existing textarea in the composer is unchanged.
- **AI-generated content?**: No — purely UI/UX feature with client-side filtering.
- **Moderation note**: Categories do not bypass existing moderation. Flagged content is still flagged regardless of category.

## Auth & Persistence

- **Logged-out (demo mode)**:
  - Can browse the full feed, use all filter pills, click category badges, share filtered URLs
  - Can see the category badge on every prayer card
  - Cannot open the composer (existing auth gate) — so cannot select a composer category
  - Clicking the empty state CTA triggers the auth modal with message "Sign in to share a prayer request"
  - Zero data persistence — filter state is URL-only (no cookies, no localStorage for logged-out users)
- **Logged-in**:
  - Full access: filtering + composing prayers with required category selection
  - Category is stored on the prayer object (mock data in Phase 2, `prayer_requests` table in Phase 3)
- **Route type**: `/prayer-wall` remains Public
- **Filter state**: URL query parameter only (`?category=<slug>`) — works for both logged-in and logged-out

## Responsive Behavior

### Mobile (< 640px)
- Filter bar: full width, pills in a single horizontal scroll row with hidden scrollbar. "All" is always first and visible without scrolling. A subtle fade/shadow on the right edge hints at more pills.
- Composer pills: same horizontal scroll behavior within the composer card
- Category badge on cards: same size and position, no layout change
- Sticky filter bar: sticks below the mobile navbar (~56px top offset)
- Touch targets: all pills are at least 44px tall

### Tablet (640–1024px)
- Filter bar: pills may still scroll horizontally or begin to wrap depending on available width
- Composer pills: may begin to wrap in the wider composer card
- Sticky behavior: same as mobile, adjusted for tablet navbar height

### Desktop (> 1024px)
- Filter bar: pills wrap to multiple rows if needed (flex-wrap). Content constrained to Prayer Wall max-width (720px) and centered
- Composer pills: wrap within the composer, fitting all 8 + reasonable spacing
- Sticky behavior: same, adjusted for desktop navbar height
- Category pills may show hover states (subtle background shift)

## Out of Scope

- Multi-select categories (only one category per prayer)
- User-created custom categories
- Category-based notifications ("Notify me when someone posts in Grief")
- Category analytics or trending categories
- Backend API for categories (Phase 3+)
- Category editing after posting (future enhancement)
- Category on the Prayer Wall detail page filter (detail page shows a single prayer — no feed to filter)
- Search/text-based filtering within a category
- Category icons or emoji decorations on pills
- Sorting options within a filtered view (existing sort by last activity applies)
- Admin management of categories (hardcoded list for MVP)
