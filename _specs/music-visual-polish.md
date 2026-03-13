# Feature: Music Visual Polish — Light Theme, Layout Cleanup, Card Redesign

## Overview

Visual overhaul of all 3 Music tabs to create a unified, light-themed (#F5F5F5) experience that matches the warmth and approachability of the rest of Worship Room. Currently the Ambient and Sleep tabs use a dark (#0D0620) background that feels disconnected from the app's neutral, welcoming aesthetic. This polish pass brings visual consistency across all tabs, declutters the page by removing several unused/premature UI sections, reorganizes the Playlists layout for better focus, and adds nature-themed CSS artwork to ambient scene cards — making each scene feel distinct and inviting before a user even presses play.

No new features or functionality — this is a pure visual polish pass. The goal is a cleaner, more cohesive music experience that feels intentional and finished.

---

## User Stories

- As a **logged-out visitor**, I want all three Music tabs to look visually consistent so the page feels polished and intentional, not like different sections were built at different times.
- As a **logged-out visitor**, I want scene cards to have unique, nature-themed artwork so I can visually distinguish between scenes and feel drawn to explore them.
- As a **logged-out visitor**, I want the Playlists tab to prominently feature the best playlist (Top Christian Hits) and let me easily browse all others in a clean grid.
- As a **logged-in user**, I want the Music page to load without clutter (no time-of-day recommendations, no resume prompts, no personalization sections) so I can quickly get to the content I want.

---

## Requirements

### Global Changes (All Tabs)

#### Remove Time-of-Day Section
- The "Great for Focus" / "Wind Down Tonight" / "Suggested for You" / "Ready for Rest" recommendation section that appears above the tab bar must be removed from rendering.
- The night-mode default tab override (10pm-6am defaulting to sleep tab) must be removed. Default tab should always be `ambient` regardless of time.
- The component and hook remain in the codebase for potential future use — just not rendered.

#### Remove Personalization Section
- The "Continue Listening" / "Your Favorites" / "Your Saved Mixes" personalization section above the tabs must be removed from rendering.
- Component remains in the codebase.

#### Remove Recently Added Section
- The "Recently Added" section must be removed from rendering.
- Component remains in the codebase.

#### Remove Resume Prompt
- The session resume prompt must be removed from rendering.
- Component remains in the codebase.

### Playlists Tab (`?tab=playlists`)

#### Remove Spotify Auto-Pause Toggle
- The "Pause ambient while playing playlists" checkbox/toggle must be removed from the Playlists tab.
- The auto-pause hook remains in the codebase — just not used.

#### Restructure Featured Section
- Rename the "Worship & Praise" heading to "Featured".
- Style the heading in the decorative Caveat font (same `font-script` class used in page heroes), centered alignment.
- Add the white decorative underline/divider below the heading (same pattern used on other pages).
- **Only** the "Top Christian Hits 2026" playlist appears in the Featured section — displayed as a large hero embed at 500px height, centered.
- Remove the follower count text ("117,000+ followers") below the hero embed.

#### Restructure Explore Section
- Move "Top Christian Songs 2025", "Top Worship Hits 2026", and "Top Christian Pop 2026" from Featured into the Explore section.
- Explore now contains 6 playlists total (the 3 moved + Indie + Rap + Afrobeats).
- Display in a 2-column responsive grid (single column on mobile, 2 columns on tablet+), all at standard 352px embed height.
- Style the "Explore" heading in the decorative Caveat font, centered, with white decorative divider below.

#### Remove Lofi Playlist
- The "Top Christian Lofi" playlist must be removed from the data source (or excluded from rendering).
- Remove the `id="lofi-embed"` scroll target.
- Remove the "Want music with your mix?" cross-reference card from the Ambient tab.
- Clean up all Lofi cross-reference rendering. Components can remain in codebase.

### Ambient Tab (`?tab=ambient`)

#### Light Background Theme
- Change the ambient tab background from dark (#0D0620) to light (#F5F5F5).
- Recolor ALL ambient components from white-on-dark to dark-on-light:
  - Scene cards: white card background with border and shadow, dark text
  - Sound cards: dark text/icons, light card background, active state with purple glow on light background
  - Sound grid category headings: dark text
  - Search bar (hidden but recolored for future re-enable): white background, dark text, gray border
  - Filter bar (hidden but recolored for future re-enable): light chip styling
  - Undo toast: white background, dark text, purple accent
  - All section headings: dark text instead of white
  - Saved mix cards: light card styling

#### Remove Hint Tooltip
- Remove the purple arrow hint tooltip from the ambient tab.
- Component and hook remain in the codebase.

#### Redesign "Build Your Own Mix" Section
- Wrap the sound mixer content in a bordered card container matching the "Build a Bedtime Routine" CTA card style on the Sleep tab.
- The card uses white background with rounded corners, border, and subtle shadow.
- The "Build Your Own Mix" heading is styled as a section title inside the card.
- The Nature, Environments, Spiritual, and Instruments category sections with their sound icon grids remain inside this card wrapper.
- This is a visual wrapper change only — the sound grid content is unchanged.

#### Hide Search and Filter
- Remove the search bar and filter chips from rendering on the ambient tab.
- Keep the components and search hook in the codebase — just skip rendering them.
- The filtered data flow can remain wired up (returns all results when no filters active).

#### Scene Card Nature-Themed CSS Backgrounds
- Replace the current solid/gradient backgrounds on scene cards with unique, nature-themed CSS-only patterns for each of the 8 scenes:
  - **Garden of Gethsemane**: Dark olive gradient with subtle diagonal lines suggesting foliage/vines
  - **Still Waters**: Soft blue-green gradient with curved repeating gradients suggesting gentle water ripples
  - **Midnight Rain**: Dark blue-gray gradient with thin vertical repeating lines suggesting rain streaks
  - **Ember & Stone**: Warm amber-orange gradient with scattered radial-gradient dots suggesting floating embers
  - **Morning Mist**: Soft sage-gold gradient with large soft radial-gradient circles suggesting fog
  - **The Upper Room**: Warm amber-brown gradient with subtle repeating arched shapes suggesting cathedral windows
  - **Starfield**: Deep indigo-purple gradient with tiny scattered radial-gradient dots suggesting stars
  - **Mountain Refuge**: Golden-brown gradient with angled linear-gradients creating triangular mountain silhouettes
- All patterns are CSS-only (`background-image` with layered gradients). No image assets.
- Pattern layers should be subtle (10-20% opacity over base gradient) so text remains readable.
- These patterns apply to both the square grid scene cards and the featured landscape carousel cards.
- Patterns are static CSS — no animation — so `prefers-reduced-motion` compliance is automatic.
- A semi-transparent overlay may be needed on some patterns to ensure WCAG AA text contrast.

### Sleep Tab (`?tab=sleep`)

#### Light Background Theme
- Change the sleep tab background from dark (#0D0620) to light (#F5F5F5).
- Recolor ALL sleep components from white-on-dark to dark-on-light:
  - Tonight's Scripture featured card: white background with border/shadow, dark text, purple accent border stays
  - Scripture session cards: white card background, dark text, purple type badge stays
  - Scripture collection row headings: dark text
  - Bedtime story cards: white card background, dark text, indigo type badge stays
  - Bedtime stories grid heading: dark text
  - Build a Bedtime Routine CTA: ensure it matches the light card pattern
  - Voice indicator text: dark muted color instead of white
  - Duration badges: light chip style (light gray background, dark text)
  - "Tonight's Scripture" accent label: purple stays (works on light background)

#### Fix Duration Badge Overflow
- The "[X] min" text doesn't fit inside the small circle badge on scripture and bedtime story cards.
- Change from a fixed-size circle to a pill-shaped badge (rounded-full with horizontal padding) so the text fits naturally regardless of content length.
- Use a small font size with the pill shape.

#### Fix Squished Play Button
- The small play icon button on scripture and bedtime story cards appears visually distorted/squished.
- Ensure the play button container is a perfect circle with the icon centered.
- Prevent flex/grid parents from compressing the button by making it non-shrinkable.

---

## UX & Design Notes

### Visual Direction
- **Tone**: Clean, warm, inviting — a peaceful browsing experience
- **Color scheme**: Light neutral background (#F5F5F5) with white card surfaces, dark text (#2C3E50), purple accents (#6D28D9) for badges and highlights
- **Card pattern**: White background, rounded corners (`rounded-xl`), subtle border (`border-gray-200`), light shadow (`shadow-sm`) — consistent across all three tabs
- **Typography**: Inter for all UI text, Caveat (`font-script`) for section headings on Playlists tab
- **Animations**: No new animations. Existing animations remain. Reduced motion compliance maintained.

### What Stays Dark-Themed
The following overlay UI components are NOT affected by this visual polish — they remain dark-themed:
- AudioDrawer (bottom sheet / side panel)
- AudioPill (floating control)
- DrawerNowPlaying, DrawerTabs
- TimerTabContent, MixerTabContent, SavedTabContent

The RoutinesPage (`/music/routines`) is also not affected — it already has its own hero + neutral background content area.

### Responsive Behavior

**Mobile (< 640px):**
- Playlists: Featured hero embed at full width, ~400px height. Explore grid is single-column.
- Ambient: Scene cards in 2-column grid. Sound grid 3-column. "Build Your Own Mix" card at full width with horizontal padding.
- Sleep: Scripture/story cards full-width or 2-column. Duration pill badges at smallest readable size.

**Tablet (640px - 1024px):**
- Playlists: Featured hero embed centered at ~80% width, 500px height. Explore grid 2-column.
- Ambient: Scene cards 3-column grid. Sound grid 4-column. Featured scene carousel scrollable.
- Sleep: Scripture/story cards in horizontal scroll rows.

**Desktop (> 1024px):**
- Playlists: Featured hero embed centered at ~70% width, 500px height. Explore grid 2-column.
- Ambient: Scene grid 3-4 columns. Sound grid 6-column. Featured scenes in 3-column grid.
- Sleep: Full-width layout with collection rows.

No layout changes from current responsive behavior — only background/text/card colors change. Existing responsive breakpoints are preserved.

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature involves no user text input
- **User input involved?**: No — this is a visual polish pass with no new input fields
- **AI-generated content?**: No — no AI integration changes

---

## Auth & Persistence

- **Auth gating changes**: None. All existing auth gates remain exactly as-is. This is a visual-only change.
- **Logged-out (demo mode)**: All three tabs are fully browsable without login, same as before.
- **Logged-in**: No changes to logged-in behavior. Sound toggling, scene loading, favorites, saved mixes — all existing auth-gated actions remain gated.
- **Route type**: Public (unchanged)
- **Data persistence**: No changes. localStorage keys and patterns unchanged.

---

## Out of Scope

- **New features**: No new functionality, interactions, or data flows
- **Dark mode toggle**: The app-wide dark mode feature is a separate future initiative
- **Audio behavior changes**: No changes to how sounds play, mix, fade, or interact
- **Drawer/pill restyling**: These overlay components stay dark-themed
- **Routines page**: `/music/routines` is unaffected
- **Backend changes**: No API or database changes
- **Component deletion**: Components being removed from rendering are kept in the codebase for potential re-enable
- **New search/filter UX**: Search and filter are hidden, not redesigned
- **Real audio files**: Placeholder MP3s remain — real TTS audio is a separate effort
- **Mobile app**: Web-responsive only (no native changes)

---

## Acceptance Criteria

### Global
- [ ] No "Great for Focus" / "Wind Down Tonight" / time-of-day section visible above the tabs
- [ ] No personalization section (Continue Listening, Favorites, Saved Mixes) visible on the page
- [ ] No "Recently Added" section visible on the page
- [ ] No resume prompt visible on the page
- [ ] Default tab is always `ambient` regardless of time of day (no night-mode override)

### Playlists Tab
- [ ] "Featured" heading is displayed in Caveat font (`font-script`), centered, with white decorative divider below
- [ ] Only "Top Christian Hits 2026" appears in the Featured section as a large hero embed (~500px height)
- [ ] No follower count text visible below the hero embed
- [ ] No "Pause ambient while playing playlists" toggle visible
- [ ] "Explore" heading is displayed in Caveat font (`font-script`), centered, with white decorative divider below
- [ ] Explore section contains exactly 6 playlists in a 2-column grid (single column on mobile)
- [ ] No "Top Christian Lofi" playlist visible anywhere on the page
- [ ] All 6 Explore playlists render at 352px height

### Ambient Tab
- [ ] Background color is #F5F5F5 (neutral-bg), not #0D0620 (hero-dark)
- [ ] All scene card text is dark on light card backgrounds (white bg, border, shadow)
- [ ] All sound card text/icons are dark on light backgrounds
- [ ] Sound grid category headings are dark text
- [ ] Active sound cards show purple glow accent on light background
- [ ] No search bar visible
- [ ] No filter chips visible
- [ ] No purple hint tooltip visible
- [ ] No "Want music with your mix?" / Lofi cross-reference card visible
- [ ] "Build Your Own Mix" section is wrapped in a white card container with border and shadow
- [ ] Each of the 8 scene cards has a unique nature-themed CSS background pattern
- [ ] Scene card patterns are subtle (text remains readable over patterns)
- [ ] Scene card patterns are CSS-only (no image assets loaded)
- [ ] Featured scene cards (carousel) use the same nature patterns as grid scene cards
- [ ] Undo toast (when switching scenes) uses light styling (white bg, dark text)

### Sleep Tab
- [ ] Background color is #F5F5F5 (neutral-bg), not #0D0620 (hero-dark)
- [ ] Tonight's Scripture card has white background with border/shadow, dark text
- [ ] Scripture session cards have white background, dark text, purple type badge
- [ ] Bedtime story cards have white background, dark text, indigo type badge
- [ ] All section headings are dark text
- [ ] Duration badges are pill-shaped (not circles) and text fits without overflow
- [ ] Play buttons on cards are perfectly circular, not visually squished/distorted
- [ ] Voice indicator text uses dark muted color
- [ ] "Build a Bedtime Routine" CTA card matches the light card pattern

### Cross-Cutting
- [ ] All three tabs have the same #F5F5F5 background — visually consistent
- [ ] All card styles across tabs follow the same pattern (white bg, border, shadow)
- [ ] All existing tests pass (assertions updated for changed classes/text)
- [ ] Build succeeds with no errors
- [ ] No horizontal overflow at 375px, 768px, or 1440px viewport widths
- [ ] WCAG AA contrast ratios maintained (dark text on light backgrounds is inherently higher contrast)
- [ ] Reduced motion preferences still respected (no new animations introduced)
- [ ] AudioDrawer and AudioPill remain dark-themed and function correctly
- [ ] Existing auth gates unchanged — all gated actions still require login
- [ ] Scene card nature patterns are static CSS (no animation, automatic `prefers-reduced-motion` compliance)

### Visual Verification Targets (for `/verify-with-playwright`)
- [ ] Ambient tab background computed color is `rgb(245, 245, 245)` at the tab panel wrapper
- [ ] Sleep tab background computed color is `rgb(245, 245, 245)` at the tab panel wrapper
- [ ] Scene cards have `background-image` CSS property set (not just `background-color`)
- [ ] "Featured" and "Explore" headings on Playlists tab use `font-family` containing "Caveat"
- [ ] Duration badges on sleep cards have `border-radius: 9999px` (pill shape) and horizontal padding
- [ ] Play buttons on sleep cards have equal `width` and `height` computed values (perfect circle)
- [ ] No element with text "Lofi" visible on any tab
- [ ] No element with text "117,000+" visible on the Playlists tab
- [ ] "Build Your Own Mix" section has a parent with white background, border, and box-shadow
