# Feature: Dark Theme — Prayer Wall, Prayer Detail, Prayer Wall Profiles, Prayer Wall Dashboard & Local Support

## Overview

The Prayer Wall routes (`/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard`) and Local Support routes (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`) currently use light backgrounds (`neutral-bg` / `#F5F5F5`) that visually clash with the dashboard, landing page, Daily Hub, and Bible pages, which now use a fully dark theme. This spec converts all seven routes to the unified dark theme, creating a seamless experience across the entire app.

This is the **third of 6 visual foundation specs**. It builds on the dark theme pattern established in Spec 1 (Daily Hub Dark Theme) and Spec 2 (Bible & Ask Dark Theme), applying the same conventions: `#0f0a1e` page background, frosted glass cards at `bg-white/[0.06]` for content and `bg-white/[0.08]` for structural elements, flush dark gradients, and white/opacity text hierarchy.

## User Story

As a **logged-out visitor or logged-in user**, I want the Prayer Wall pages and Local Support pages to share the same dark theme as the dashboard, landing page, Daily Hub, and Bible pages, so that navigating between pages feels like one unified, immersive experience rather than jumping between two different visual styles.

## Requirements

### 1. Prayer Wall Feed (`/prayer-wall`)

#### 1.1 Page Background
- Replace `neutral-bg` (#F5F5F5) page background with solid dark (`#0f0a1e`) edge-to-edge from navbar to footer
- No white or light gray sections anywhere on the page

#### 1.2 Hero Section
- The hero currently renders via `PrayerWallHero` / `PageHero` with the Inner Page Hero gradient that fades to `#F5F5F5` — make the gradient flush dark (no floating box, blends seamlessly into the `#0f0a1e` background below)
- Hero text (title, subtitle) stays white — only the background changes
- `HeadingDivider` should remain visible against the dark gradient

#### 1.3 CTA Section (Below Hero)
- "Share a Prayer Request" button and "My Dashboard" button currently sit between the hero and the feed
- Secondary action buttons: `bg-white/10 text-white/70 hover:bg-white/15`
- Primary action button (if applicable): stays primary purple

#### 1.4 Inline Composer
- Composer container: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Textarea: `bg-white/[0.06]` with cyan glow-pulse border on focus, `text-white` input text, `placeholder text-white/40`
- Anonymous checkbox: `text-white/70` label text, visible check indicator styled for dark
- Category selector pills — unselected: `bg-white/10 text-white/70`; selected: `bg-primary/20 border-primary/40 text-primary-lt`

#### 1.5 Sticky Filter Bar
- Becomes frosted glass: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10` (matching the navbar style)
- Filter category pills use same selected/unselected pattern as the composer category pills
- Must remain sticky and functional at all breakpoints

#### 1.6 Question of the Day Card
- Currently uses `primary/10` background — change to `bg-primary/[0.12] border border-primary/20`
- Question text: `text-white`
- Secondary text: `text-white/60`

#### 1.7 Prayer Cards
- Currently white cards on light background — change to `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Author name: `text-white`
- Timestamp: `text-white/40`
- Prayer content: `text-white/80` (pre-wrap preserved)
- "Answered Prayer" badge: stays green (no change)
- Category badge: `bg-white/[0.06] text-white/40`

#### 1.8 Interaction Bar
- Pray, Comments, Bookmark, Share buttons: `text-white/50 hover:text-white/70`
- "Pray for this" ceremony animation: verify glow pulse and ripple effects are visible on dark background — increase opacity slightly if needed
- Active/toggled state for Bookmark: ensure it is distinguishable on dark

#### 1.9 Comments Section
- Comment section background: `bg-white/[0.04]` for subtle nesting
- Comment input: `bg-white/[0.06]` with `text-white` and `placeholder text-white/40`
- Comment author name: `text-white`
- Comment text: `text-white/70`
- Comment timestamp: `text-white/40`

#### 1.10 Load More
- "Load More" button: `bg-white/10 text-white/60 hover:bg-white/15`

### 2. Prayer Detail (`/prayer-wall/:id`)

#### 2.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 2.2 Prayer Content Card
- Same dark frosted glass treatment as feed cards: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- All text colors match the prayer card spec from section 1.7

#### 2.3 Comments List
- Same dark treatment as section 1.9
- Each comment uses `bg-white/[0.04]` nesting

#### 2.4 Owner Actions
- "Mark as Answered" and "Delete" buttons: frosted glass dark treatment (`bg-white/10 text-white/70`)
- Destructive "Delete" button: `bg-danger/20 text-danger hover:bg-danger/30`

#### 2.5 Report Dialog
- Dialog overlay and panel: dark frosted glass (`bg-[#1a0f2e] border border-white/10`)
- Dialog text: `text-white`
- Dialog secondary text: `text-white/60`
- Report reason options: styled for dark

#### 2.6 Back Navigation
- Back link/button: `text-white/70 hover:text-white`

### 3. Prayer Wall Profile (`/prayer-wall/user/:id`)

#### 3.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 3.2 Profile Header Card
- Frosted glass: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- User name: `text-white`
- Bio/description text: `text-white/70`
- Stats (prayer count, etc.): `text-white/60`

#### 3.3 Tab Bar (Prayers / Replies / Reactions)
- Dark tab bar treatment matching Daily Hub tabs:
  - Bar background: `bg-white/[0.08] border-b border-white/10`
  - Inactive tab: `text-white/60`
  - Active tab: `text-white` with primary underline
- Tab content cards: frosted glass (`bg-white/[0.06] border border-white/10`)
- Card text follows same hierarchy as prayer cards (section 1.7)

### 4. Prayer Wall Dashboard (`/prayer-wall/dashboard`)

#### 4.1 Page Background
- Solid dark (`#0f0a1e`) edge-to-edge

#### 4.2 Editable Profile Section
- Frosted glass card: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Form inputs: `bg-white/[0.06] text-white` with `placeholder text-white/40`
- Labels: `text-white/70`

#### 4.3 Tab Bar (5 tabs)
- Same dark tab bar treatment as section 3.3
- Inactive tab: `text-white/60`, active tab: `text-white` with primary underline

#### 4.4 Tab Content
- All content cards within tabs: frosted glass (`bg-white/[0.06] border border-white/10 rounded-xl`)
- Text hierarchy matches prayer card conventions

### 5. Local Support — All 3 Routes

#### 5.1 Page Background
- All three pages (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`): solid dark (`#0f0a1e`) edge-to-edge

#### 5.2 Hero Section
- Uses `LocalSupportHero` component — make the gradient flush dark (no floating box, blends seamlessly into `#0f0a1e` background)
- Hero text stays white

#### 5.3 Search Section
- Search panel container: `bg-white/[0.06] border border-white/10 rounded-xl`
- Geolocation button: `bg-white/10 text-white/70 hover:bg-white/15`
- Search text input: `bg-white/[0.06] text-white` with `placeholder text-white/40`
- Radius slider: track `bg-white/10`, primary-colored thumb
- Sort dropdown: `bg-white/[0.08] border border-white/10 text-white`
- Dropdown options: dark background with `hover:bg-white/10`
- List/Map toggle buttons — unselected: `bg-white/10 text-white/60`; selected: `bg-primary/20 text-white`

#### 5.4 Listing Cards
- Card container: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- Location name: `text-white`
- Address: `text-white/60`
- Phone number: `text-primary-lt` (clickable link)
- Rating stars: stay amber (no change)
- Distance badge: `bg-white/10 text-white/50`
- Expanded details section: `bg-white/[0.04]`
- "I visited" button: `bg-white/10 text-white/60 hover:bg-white/15`
- Cross-feature CTA links ("Pray for this church", "Journal about your visit"): `text-primary-lt`
- Bookmark button: same pattern as Prayer Wall bookmarks

#### 5.5 Map View
- The default Leaflet tile layer is light-themed — switch to a dark map tile provider (CartoDB Dark Matter or Stadia Dark) to match the dark page aesthetic
- Map popups: dark-styled with `bg-[#1a0f2e] text-white border border-white/10`
- Popup close button: visible on dark background

#### 5.6 Celebrate Recovery Info Panel
- "What is CR?" info panel: frosted glass (`bg-white/[0.06] border border-white/10 rounded-xl`)
- Heading: `text-white`
- Body text: `text-white/70`

#### 5.7 Counselor Disclaimer
- Disclaimer text: `text-white/50` in a frosted glass callout (`bg-white/[0.06] border border-white/10 rounded-xl`)

#### 5.8 Loading States
- Skeleton loading cards (3 pulse cards): `bg-white/[0.06]` with pulse animation adjusted for dark (animate from `white/4` to `white/8` instead of `gray-200` to `gray-300`)

#### 5.9 Empty & Error States
- No results message: `text-white/60` on dark background
- Error state message: `text-white/60` on dark background
- All states (idle, loading, no results, error) must be verified on the dark background

### 6. Cross-Page Consistency

- Verify the SiteFooter has no visible seam where dark content meets the dark footer on all seven pages
- Verify the navbar frosted glass looks correct over the dark page backgrounds (no double-layering or opacity issues)
- All frosted glass structural elements use `bg-white/[0.08]`; content cards and inputs use `bg-white/[0.06]`
- All text meets WCAG AA contrast on dark backgrounds

## Acceptance Criteria

### Prayer Wall Feed (`/prayer-wall`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer with no light gray or white sections
- [ ] Hero gradient is flush dark — no visible box edges, borders, or floating appearance; blends seamlessly into the dark background below
- [ ] HeadingDivider is visible against the dark gradient
- [ ] CTA buttons below hero use `bg-white/10 text-white/70 hover:bg-white/15` for secondary actions
- [ ] Inline composer container uses `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Composer textarea has `bg-white/[0.06]` with cyan glow-pulse border, `text-white` input, `placeholder text-white/40`
- [ ] Anonymous checkbox has `text-white/70` label and visible check indicator on dark
- [ ] Category pills: unselected `bg-white/10`, selected `bg-primary/20 border-primary/40 text-primary-lt`
- [ ] Sticky filter bar uses `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- [ ] Filter pills use same selected/unselected pattern as composer pills
- [ ] QOTD card uses `bg-primary/[0.12] border border-primary/20` with `text-white` question text
- [ ] Prayer cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Prayer card text: author `text-white`, timestamp `text-white/40`, content `text-white/80`
- [ ] "Answered Prayer" badge stays green
- [ ] Category badge is `bg-white/[0.06] text-white/40`
- [ ] Interaction bar buttons are `text-white/50 hover:text-white/70`
- [ ] "Pray for this" ceremony animation glow/ripple is visible on dark background
- [ ] Comment section background is `bg-white/[0.04]`
- [ ] Comment input is `bg-white/[0.06]` with `text-white`
- [ ] "Load More" button is `bg-white/10 text-white/60 hover:bg-white/15`

### Prayer Detail (`/prayer-wall/:id`)
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer
- [ ] Prayer content card uses frosted glass (`bg-white/[0.06] border border-white/10`)
- [ ] Comments list uses `bg-white/[0.04]` nesting
- [ ] Owner action buttons use dark frosted glass treatment
- [ ] Delete button uses `bg-danger/20 text-danger`
- [ ] Report dialog uses dark panel (`bg-[#1a0f2e] border border-white/10`) with white text
- [ ] Back navigation link is `text-white/70 hover:text-white`

### Prayer Wall Profile (`/prayer-wall/user/:id`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Profile header card uses frosted glass (`bg-white/[0.06] border border-white/10`)
- [ ] User name is `text-white`, bio is `text-white/70`, stats are `text-white/60`
- [ ] Tab bar uses `bg-white/[0.08] border-b border-white/10` with active `text-white` + primary underline, inactive `text-white/60`
- [ ] Tab content cards use frosted glass

### Prayer Wall Dashboard (`/prayer-wall/dashboard`)
- [ ] Page background is solid dark (#0f0a1e)
- [ ] Editable profile section uses frosted glass card
- [ ] Form inputs use `bg-white/[0.06] text-white`
- [ ] 5-tab bar uses dark treatment matching profile tabs
- [ ] All content cards within tabs use frosted glass

### Local Support (All 3 Routes)
- [ ] All three page backgrounds are solid dark (#0f0a1e) from navbar to footer
- [ ] Hero gradients are flush dark with no floating box appearance on all three pages
- [ ] Search panel uses `bg-white/[0.06] border border-white/10 rounded-xl`
- [ ] Search input is `bg-white/[0.06] text-white` with `placeholder text-white/40`
- [ ] Radius slider track is `bg-white/10` with primary thumb
- [ ] Sort dropdown is `bg-white/[0.08] border border-white/10`
- [ ] List/Map toggle: unselected `bg-white/10`, selected `bg-primary/20`
- [ ] Listing cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- [ ] Card text: name `text-white`, address `text-white/60`, phone `text-primary-lt`
- [ ] Rating stars stay amber
- [ ] Distance badge is `bg-white/10 text-white/50`
- [ ] Expanded details section is `bg-white/[0.04]`
- [ ] "I visited" button is `bg-white/10 text-white/60 hover:bg-white/15`
- [ ] Cross-feature CTA links are `text-primary-lt`
- [ ] Map tiles use a dark provider (CartoDB Dark Matter or Stadia Dark)
- [ ] Map popups use dark styling (`bg-[#1a0f2e] text-white border border-white/10`)
- [ ] CR info panel uses frosted glass
- [ ] Counselor disclaimer uses `text-white/50` in frosted glass callout
- [ ] Skeleton loading cards use `bg-white/[0.06]` with dark pulse animation (white/4 to white/8)
- [ ] No results and error state messages are `text-white/60`

### Responsive
- [ ] Dark theme renders correctly at mobile (375px) on all seven pages — no light edges, gaps, or overflow
- [ ] Dark theme renders correctly at tablet (768px) on all seven pages
- [ ] Dark theme renders correctly at desktop (1440px) on all seven pages
- [ ] Dark background extends full-width with no light edges or gaps at any breakpoint
- [ ] All frosted glass cards are distinguishable from the background (border-white/10 provides edge definition)
- [ ] Sticky filter bar on Prayer Wall remains sticky and looks correct at all breakpoints

### Accessibility
- [ ] Text contrast meets WCAG AA on the dark background (white/80 on #0f0a1e is approximately 11:1 ratio)
- [ ] All interactive elements remain keyboard-navigable
- [ ] Focus indicators are visible on the dark background
- [ ] Screen readers are unaffected (no changes to ARIA attributes or semantic structure)
- [ ] Dark map tiles do not reduce map label legibility below usable levels

### General
- [ ] No changes to functionality, layout, spacing, or interactive behavior — purely visual
- [ ] All existing tests pass (update test assertions for class name changes if needed)

## UX & Design Notes

- **Tone**: The dark theme creates a more immersive, prayerful atmosphere for community prayer and local support discovery
- **Colors**: Follows the pattern established in Spec 1 (Daily Hub Dark Theme) and Spec 2 (Bible & Ask Dark Theme) — `#0f0a1e` page background, `bg-white/[0.06]` content cards, `bg-white/[0.08]` structural elements, white/opacity text hierarchy
- **Typography**: No font changes — only color changes. All fonts (Inter, Lora, Caveat) remain the same
- **Design system recon reference**: The Prayer Wall Hero pattern is documented in `_plans/recon/design-system.md` under "Prayer Wall Hero (Variant)" and "Hero Section Pattern" sections. The Local Support hero uses the same Inner Page Hero gradient. The new dark values replace these for these pages.
- **Map tile provider**: Switching from the default OpenStreetMap light tiles to CartoDB Dark Matter (or Stadia Dark) is a new visual element specific to this spec. The tile URL is a standard, freely available tile provider — no API key required for CartoDB Dark Matter.
- **New visual patterns**: The dark map tile integration and dark map popups are new patterns introduced in this spec. All other patterns (frosted glass cards, flush dark gradients, white/opacity text hierarchy, cyan glow inputs) are established in prior specs.
- **Animations**: All existing animations ("Pray for this" ceremony glow/ripple, comment expand, card hover) remain unchanged. Verify the ceremony animation's glow and ripple effects are visible on the dark background; increase opacity slightly if needed (implementation decision for `/plan`).

### Responsive Behavior

- **Mobile (< 640px)**: Dark background extends full-width. Prayer cards stack in single column. Local support listing cards stack vertically. Search controls stack vertically within the frosted glass panel. Map view is full-width. Sticky filter bar on Prayer Wall remains functional. All text colors use the same dark theme values. Touch targets remain 44px minimum.
- **Tablet (640px - 1024px)**: Same dark theme. Prayer Wall content centered within existing max-width (`max-w-3xl`). Local support may show listing cards in a wider layout. Map view uses available width.
- **Desktop (> 1024px)**: Same dark theme. Content centered within existing max-width constraints. Frosted glass effects render with full backdrop-blur support. Local support listing cards in wider layout with map beside the list (if existing layout supports it).

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the Prayer Wall inline composer and comment input accept user text. The existing crisis keyword detection and moderation rules remain unchanged. Crisis banners must remain clearly visible on the dark background.
- **User input involved?**: Yes — Prayer Wall composer textarea, comment input, Report dialog reason field. No changes to input handling, validation, or crisis detection.
- **AI-generated content?**: No — Prayer Wall and Local Support pages do not display AI-generated content.

## Auth & Persistence

- **No changes to auth gating** — all existing auth gates remain exactly as they are
- **No changes to persistence** — all localStorage keys and data flows remain unchanged
- **Route types**: Public (`/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/local-support/*`), Protected (`/prayer-wall/dashboard`)
- This spec is purely visual — it changes CSS classes, not component structure or data flow

### Auth Behavior Summary (unchanged, for reference)

- **Logged-out users CAN**: Browse the Prayer Wall feed, read prayer cards, expand comments, share prayers, search Local Support locations, view map, view prayer profiles
- **Logged-out users CANNOT**: Post prayers (auth modal: "Sign in to share a prayer request"), comment on prayers (auth modal: "Sign in to comment"), bookmark prayers (auth modal: "Sign in to bookmark"), pray for prayers (auth modal: "Sign in to pray"), access Prayer Wall Dashboard (redirect to `/login`), bookmark Local Support locations (auth modal: "Sign in to bookmark"), use "I visited" check-in (auth modal: "Sign in to check in")

## Out of Scope

- **Dark theme for other pages** — this spec covers only Prayer Wall routes and Local Support routes. Other pages (Music, Reading Plans, Devotional, Settings, etc.) will be converted in subsequent specs (4-6 of the visual foundation series)
- **Meditation sub-pages** — separate routes with their own visual treatment, addressed in a future spec
- **Dark mode toggle** — this is a permanent dark theme conversion, not a user-togglable dark mode
- **New component creation** — this spec reuses existing components with updated Tailwind classes
- **Backend changes** — no API or backend changes
- **New animations or interactions** — all existing animations stay; no new ones are added. The only animation-related work is verifying ceremony animation visibility on dark
- **Navbar or footer changes** — the navbar is already glassmorphic and the footer is already dark; this spec only ensures no visual seams
- **Tailwind config changes** — the required color tokens should be achievable with Tailwind arbitrary values. If a new config token is truly needed, that's an implementation decision for `/plan`
- **Map tile API keys** — CartoDB Dark Matter tiles are freely available without an API key. No API key procurement is in scope
- **Prayer Wall content or moderation logic** — no changes to how prayers are created, moderated, or displayed beyond color
- **Local Support search logic or geolocation** — no changes to search functionality
