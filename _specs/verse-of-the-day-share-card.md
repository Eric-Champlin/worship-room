# Feature: Verse of the Day Shareable Card

## Overview

Scripture is the foundation of emotional healing in Worship Room — every feature eventually leads back to a verse. But right now, there's no persistent daily verse that greets users across the app and that they can carry with them into the world. This feature introduces a daily rotating verse that appears in three locations (dashboard, Daily Hub, landing page) and can be shared as a beautiful branded image card — turning a private moment of encouragement into something users can send to a friend, post on social media, or save to their camera roll.

The verse rotates daily using a deterministic index (day-of-year modulo total verse count), so all users see the same verse on the same day — creating a shared experience across the community. The verse pool expands from 30 to 60 curated WEB translation verses, with the new 30 covering themes of hope, comfort, strength, praise, trust, and peace.

---

## User Stories

- As a **logged-out visitor**, I want to see today's verse on the landing page so that I encounter scripture the moment I arrive, before I even create an account.
- As a **logged-out visitor**, I want to share today's verse as a beautiful image card so that I can send it to a friend or post it on social media without needing to sign up.
- As a **logged-in user**, I want to see today's verse on my dashboard so that scripture is the first thing I see when I start my day in the app.
- As a **logged-in user**, I want to see a compact verse banner on the Daily Hub so that I'm reminded of today's verse as I move through my daily practices.
- As any user, I want to copy the verse as formatted text or download/share it as a branded image so that I have multiple ways to share it with others.

---

## Requirements

### Verse Data & Rotation

1. **Expand the verse pool to 60 entries.** Add 30 new WEB translation verses to the existing 30 daily verses. Each entry has: `text` (verse text), `reference` (e.g., "Isaiah 41:10"), and `theme` (one of: hope, comfort, strength, praise, trust, peace). The new verses should be distributed evenly across the 6 themes (5 per theme).

2. **No duplicates.** The 30 new verses must not duplicate any verse already in the codebase — this includes the existing 30 daily verses, 20 breathing meditation verses, 20 scripture soaking verses, 4 gratitude verses, 4 ACTS verses, and the 5 mood check-in encouragement verses (Psalm 34:18, Psalm 55:22, Psalm 46:10, Psalm 107:1, Psalm 118:24). Check by reference — no two entries should share the same Bible reference.

3. **Deterministic daily rotation.** The verse for any given day is computed as: `versePool[dayOfYear % versePool.length]`. Day of year is based on the user's local date (midnight local time boundary — same reset logic as mood check-in). All users see the same verse on the same day. No randomness, no localStorage, no backend — purely computed from the date.

4. **Store as a constants file.** The verse array lives in a dedicated constants file, separate from the existing mock data. The existing `DAILY_VERSES` array and `getVerseOfTheDay()` function in the mock data file should remain unchanged — the new Verse of the Day feature uses its own expanded pool.

### Display Location 1: Dashboard Widget

5. **New "Verse of the Day" widget card** in the dashboard widget grid, positioned after the Mood Chart widget (MoodChart) in grid order.

6. **Card content:**
   - Verse text in Lora italic (`font-serif italic`), `text-lg` size
   - Reference below the verse text in `text-sm text-white/50`
   - A "Share" button at the bottom of the card
   - Uses the standard frosted glass dashboard card style (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)

7. **Card header:** "Verse of the Day" title with a book icon, matching the existing dashboard card header pattern (collapsible).

### Display Location 2: Daily Hub Banner

8. **Compact verse banner** on the Daily Hub page, positioned below the hero greeting section and above the tab bar.

9. **Banner content:**
   - Verse text in Lora italic (`font-serif italic`), `text-sm` size
   - On mobile: single line, truncated with ellipsis (`line-clamp-1`)
   - On desktop: full text displayed (no truncation)
   - Reference displayed after the verse text in `text-sm text-white/50`
   - Small share icon button (Lucide `Share2` icon) at the right edge
   - Styling: `bg-white/5 rounded-xl p-3` — sits on the dark hero gradient background

10. **Banner interaction:** Clicking the share icon opens the share panel (same as dashboard and landing page share behavior).

### Display Location 3: Landing Page Section

11. **New "Today's Verse" section** on the landing page, positioned between the JourneySection and GrowthTeasersSection.

12. **Section design:**
    - Dark background matching the landing page's dark sections (same gradient family as Growth Teasers: dark purple `bg-hero-dark` to `bg-hero-mid`)
    - Verse text centered, in Lora italic, `text-2xl` on desktop, `text-lg` on mobile, white
    - Reference below in smaller text (`text-sm text-white/50`), centered
    - "Share this verse" button below the reference — uses the Hero Outline CTA style (`bg-white/10 text-white border border-white/30 rounded-lg py-3 px-8`)
    - Adequate vertical padding to give the verse breathing room (`py-16 sm:py-20`)

13. **Section heading:** A small label above the verse: "Today's Verse" in `text-xs uppercase tracking-widest text-white/40 font-medium` — deliberate understatement so the verse itself is the focus.

### Share Functionality

14. **Share panel** opens when any Share button is clicked (dashboard, Daily Hub, or landing page). The panel has two options:
    - **"Copy verse"** — copies formatted text `"[verse text] — [reference]"` to the clipboard, shows a "Copied!" toast notification (using existing toast system)
    - **"Share image"** — generates a shareable image card and triggers sharing/download

15. **Share panel UI:** A small dropdown/popover that appears near the Share button. Two rows, each with an icon and label:
    - Row 1: Clipboard icon (Lucide `Copy`) + "Copy verse"
    - Row 2: Image icon (Lucide `Image`) + "Share as image"
    - Optional third row (always visible): Download icon (Lucide `Download`) + "Download image" — always triggers a PNG download regardless of platform

16. **Image card generation** (client-side, HTML Canvas):
    - Dimensions: 400x600px portrait
    - Background: dark purple gradient (same angle and colors as the landing page hero gradient — `linear-gradient(to bottom, #0D0620 0%, #1E0B3E 35%, #4A1D96 100%)`)
    - Verse text: centered, white, Lora font, sized to fit within the card with comfortable margins (auto-size based on text length — longer verses get smaller font, shorter verses get larger)
    - Reference: below the verse, centered, smaller text, `rgba(255, 255, 255, 0.5)`
    - Watermark: "Worship Room" at the bottom center in Caveat script font, `rgba(255, 255, 255, 0.3)`, small size
    - Output: PNG blob

17. **Share behavior by platform:**
    - **Mobile with Web Share API:** `navigator.share({ files: [pngFile] })` — allows sharing directly to Instagram, iMessage, WhatsApp, etc.
    - **Desktop or without Web Share API:** Triggers a download of the PNG file (named `worship-room-verse-YYYY-MM-DD.png`)
    - **"Download image" button:** Always available as a fallback, always triggers a PNG download regardless of platform

### Visibility & Auth

18. **No auth gating on viewing or sharing.** The Verse of the Day is visible to all users (logged-in and logged-out) in all three locations. Share functionality (copy, image generation, download) works without login.

19. **Dashboard widget is inherently auth-gated** because the entire dashboard page only renders for authenticated users. No additional auth check needed for the widget itself.

20. **Daily Hub banner is visible to all users** — the Daily Hub is a public page.

21. **Landing page section is visible to all users** — the landing page is public.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| View verse (all 3 locations) | Visible, no restrictions | Visible, no restrictions |
| "Share" button (dashboard) | Not reachable (dashboard is auth-gated) | Opens share panel |
| Share icon (Daily Hub banner) | Opens share panel | Opens share panel |
| "Share this verse" button (landing) | Opens share panel | Opens share panel |
| "Copy verse" in share panel | Copies to clipboard, shows toast | Same |
| "Share as image" in share panel | Generates PNG, triggers share/download | Same |
| "Download image" in share panel | Downloads PNG | Same |

### Persistence

- **Logged-out**: Zero persistence. No data saved. No cookies. No localStorage writes. The verse is computed from the date each time.
- **Logged-in**: Zero new persistence. No new localStorage keys. The verse is computed from the date each time.
- **Route type**: All three locations are on existing routes (no new routes). Dashboard (`/`) is protected; Daily Hub (`/daily`) and landing page (`/`) are public.

---

## AI Safety Considerations

- **Crisis detection needed?**: No. This feature displays curated scripture — no user text input, no AI-generated content.
- **User input involved?**: No. The verse is selected deterministically from a curated pool.
- **AI-generated content?**: No. All verse text is from the WEB Bible translation (public domain, pre-curated).

---

## UX & Design Notes

### Emotional Tone

The Verse of the Day should feel like a quiet gift — not loud, not demanding, just present. The dashboard widget is a still point amid the activity cards. The Daily Hub banner is a gentle whisper before the user dives into their practice. The landing page section is an invitation that lets scripture speak for itself.

### Visual Design — Dashboard Widget

- Uses the standard frosted glass dashboard card pattern (see design system recon: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`)
- Verse text: `font-serif italic text-lg text-white leading-relaxed`
- Reference: `text-sm text-white/50 mt-2`
- Share button: small, right-aligned, `text-sm text-white/40 hover:text-white/70` with Lucide `Share2` icon
- Collapsible like all dashboard cards (using existing collapse pattern)

### Visual Design — Daily Hub Banner

- Container: `bg-white/5 rounded-xl p-3 mx-4 sm:mx-6` — sits on the dark hero gradient, below the greeting, above the tabs
- Layout: flex row with verse text on the left, share icon on the right
- Verse text: `font-serif italic text-sm text-white/80` — on mobile: `line-clamp-1`, on desktop: full text
- Reference: `text-xs text-white/40 ml-2` — inline after the verse on desktop, on its own line on mobile if full text shown
- Share icon: `text-white/40 hover:text-white/70`, 20px, Lucide `Share2`
- This is a **new visual pattern** (compact verse banner on hero gradient) — similar to the existing `bg-white/5` frosted glass pattern but as a slim banner

### Visual Design — Landing Page Section

- Background: dark gradient section matching Growth Teasers section aesthetic. Use `bg-hero-dark` base or a subtle gradient between `#0D0620` and `#1E0B3E`.
- Section label: `text-xs uppercase tracking-widest text-white/40 font-medium mb-4`
- Verse text: `font-serif italic text-lg sm:text-2xl text-white leading-relaxed max-w-2xl mx-auto`
- Reference: `text-sm text-white/50 mt-3`
- CTA button: Hero Outline CTA style from design system recon (`bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30 hover:bg-white/15 transition-colors`)
- Vertical padding: `py-16 sm:py-20`
- Text alignment: center
- Content max-width: `max-w-3xl` centered

### Visual Design — Share Panel

- Popover/dropdown near the share button: `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2` (matches existing dropdown panel pattern from navbar)
- Each row: `flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 cursor-pointer text-sm text-white/80 hover:text-white transition-colors`
- Icons: 18px Lucide icons
- Min touch target: 44px height per row
- Dismiss: click outside, Escape key, or after action completes
- On landing page (dark bg): same styling works naturally
- On Daily Hub (dark hero area): same styling works naturally
- On dashboard (dark bg): same styling works naturally

### Visual Design — Share Image Card (Canvas)

- Canvas: 400x600px
- Background gradient: linear, top-to-bottom, `#0D0620` → `#1E0B3E` → `#4A1D96` (matching landing page hero)
- Verse text: white, Lora font, centered horizontally and vertically in upper 70% of card. Auto-sized: start at ~24px, reduce if text overflows available space.
- Reference: white at 50% opacity, centered, below the verse, ~14px
- Watermark: "Worship Room" in Caveat font, `rgba(255, 255, 255, 0.3)`, centered at the bottom (~12px from bottom edge), ~16px
- Margins: ~40px on left/right, ~60px on top, ~40px above watermark
- The gradient, typography, and watermark should make the card instantly recognizable as Worship Room content

### Design System Recon References

- **Dashboard card pattern**: Design system recon "Dashboard Card Pattern" — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`
- **Hero Outline CTA button**: Design system recon "Button Patterns" — `bg-white/10 text-white font-medium py-3 px-8 rounded-lg border border-white/30`
- **Dark section background**: Design system recon "Footer Pattern" — `bg-hero-dark` (#0D0620)
- **Dropdown panel style**: Design system recon "Navigation Pattern" — `bg-hero-mid border-white/15` for dropdown panels

### New Visual Patterns

1. **Compact verse banner** (Daily Hub, `bg-white/5 rounded-xl p-3` with verse text + share icon): New pattern. A slim inline banner on the hero gradient. Plan should verify contrast and readability of `text-white/80` on the hero gradient.
2. **Landing page verse section** (dark bg section with centered scripture): New pattern — a dark interstitial section between two existing sections. Similar to Growth Teasers/Song Pick dark sections but with a quieter, more contemplative layout.
3. **Canvas-generated share image**: New pattern — client-side image generation. Font loading for Canvas needs verification (Lora and Caveat must be loaded before canvas render).

---

## Responsive Behavior

### Mobile (< 640px)

- **Dashboard widget**: Full-width card in single-column stack. Verse text wraps naturally. Share button below verse.
- **Daily Hub banner**: Full-width with `mx-4` side margins. Verse text truncated to single line (`line-clamp-1`). Share icon right-aligned. Reference on same line as verse (hidden if truncated — show only on hover/tap expansion, or omit on mobile).
- **Landing page section**: Verse text `text-lg`, full padding (`py-16`). CTA button full-width or auto-width centered.
- **Share panel**: Full-width bottom sheet or centered popover. Rows sized for 44px touch targets.
- **Share image**: Uses `navigator.share()` with Web Share API if available (direct share to apps). Falls back to download.

### Tablet (640px - 1024px)

- **Dashboard widget**: Appears in the 2-column grid layout at its designated position.
- **Daily Hub banner**: Verse text fully visible (no truncation). Reference inline.
- **Landing page section**: Verse text `text-2xl`. Same layout as desktop but with tighter side margins.
- **Share panel**: Centered popover near button. Same as desktop.

### Desktop (> 1024px)

- **Dashboard widget**: In the left column of the 2-column dashboard grid, after MoodChart.
- **Daily Hub banner**: Full verse text visible. Reference inline. Share icon at right edge. Max-width matches the hero content area.
- **Landing page section**: Verse text `text-2xl`, `max-w-2xl` centered. Generous vertical padding (`py-20`).
- **Share panel**: Small popover dropdown, positioned below/beside the Share button.

---

## Edge Cases

- **Very long verses (50+ words)**: On mobile Daily Hub banner, truncated to one line with ellipsis. On dashboard widget and landing page, text wraps naturally. On share image card, font size auto-reduces to fit within the card boundaries.
- **Very short verses (under 10 words)**: Share image card uses larger font for visual balance.
- **Canvas font loading**: Lora and Caveat fonts must be loaded before rendering the canvas. Use `document.fonts.ready` or `FontFace.load()` to ensure fonts are available. If fonts fail to load, fall back to serif/cursive system fonts.
- **Web Share API not available**: "Share as image" triggers a PNG download instead. The "Download image" option is always available as a separate fallback.
- **Clipboard API not available**: "Copy verse" falls back to the legacy `document.execCommand('copy')` approach. If that also fails, show an error toast.
- **Day boundary**: Verse changes at midnight local time. If the user has the app open across midnight, the verse does NOT auto-update — it updates on the next page load/navigation (same pattern as mood check-in reset).
- **Leap year**: Day-of-year 366 is handled by modulo (366 % 60 = 6, so it maps to verse index 6). No special handling needed.
- **User has dashboard collapsed**: The verse widget respects the existing collapse/expand pattern. Collapsed shows only the header; expanded shows verse + share button.

---

## Out of Scope

- **Backend API for verse rotation**: Entirely frontend. No API endpoints. No database storage. Verse is computed client-side from the date.
- **User-selected favorite verses**: No favoriting/bookmarking of verse of the day. The existing favorites system may integrate in a future spec.
- **Verse notifications/reminders**: No push notifications or email with the daily verse. Post-MVP feature.
- **Animated verse transitions**: No entrance animation for the verse (beyond standard page load). KaraokeText reveal for verse of the day is a future enhancement.
- **Verse history**: No "see past verses" feature. Each day shows only today's verse.
- **Custom share image themes**: No user choice of image card background/style. Single branded design.
- **Social media meta tags (OG)**: No server-side OG image generation for link previews. Client-side image only.
- **Backend persistence of share events**: No analytics on shares. Phase 3+ analytics could add this.
- **New routes**: No new pages or routes. This adds components to three existing pages.
- **Modifications to existing DAILY_VERSES array**: The existing 30-verse array and `getVerseOfTheDay()` function remain unchanged. The new feature uses its own expanded pool.

---

## Acceptance Criteria

### Verse Data

- [ ] Verse pool contains exactly 60 verses (30 existing + 30 new), all WEB translation
- [ ] Each new verse has `text`, `reference`, and `theme` (one of: hope, comfort, strength, praise, trust, peace)
- [ ] New verses are distributed: 5 per theme (5 hope + 5 comfort + 5 strength + 5 praise + 5 trust + 5 peace = 30)
- [ ] No Bible reference in the new 30 duplicates any reference in the existing daily verses, breathing verses, soaking verses, gratitude verses, ACTS verses, or mood check-in encouragement verses
- [ ] Verse pool is stored in a dedicated constants file (not in the existing mock data file)

### Verse Rotation

- [ ] Verse is computed as `versePool[dayOfYear % versePool.length]` using local date
- [ ] All users see the same verse on the same calendar day
- [ ] Verse changes at midnight local time (consistent with mood check-in reset boundary)
- [ ] No localStorage, no randomness, no backend — purely date-based computation

### Dashboard Widget

- [ ] "Verse of the Day" widget card appears in the dashboard grid after the MoodChart widget
- [ ] Card uses frosted glass style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Verse text displays in `font-serif italic text-lg text-white leading-relaxed`
- [ ] Reference displays below verse in `text-sm text-white/50`
- [ ] "Share" button is visible and functional
- [ ] Card is collapsible (matching existing dashboard card behavior)
- [ ] Widget is only visible on the dashboard (which is auth-gated — logged-out users see the landing page)

### Daily Hub Banner

- [ ] Compact verse banner appears below the hero greeting and above the tab bar on `/daily`
- [ ] Banner uses `bg-white/5 rounded-xl p-3` styling
- [ ] Verse text is Lora italic, `text-sm`
- [ ] On mobile (< 640px): verse text is truncated to a single line with ellipsis
- [ ] On desktop (> 1024px): full verse text is displayed without truncation
- [ ] Reference is displayed alongside or below the verse text
- [ ] Share icon button (Lucide `Share2`) is at the right edge
- [ ] Clicking the share icon opens the share panel
- [ ] Banner is visible to all users (logged-in and logged-out)

### Landing Page Section

- [ ] "Today's Verse" section appears between the JourneySection and GrowthTeasersSection
- [ ] Section has dark background matching the landing page dark sections
- [ ] "Today's Verse" label appears above the verse in small uppercase tracking-widest text
- [ ] Verse text is Lora italic, `text-2xl` on desktop, `text-lg` on mobile, white, centered
- [ ] Reference appears below in `text-sm text-white/50`, centered
- [ ] "Share this verse" button uses Hero Outline CTA style (`bg-white/10 border border-white/30 text-white rounded-lg`)
- [ ] Section has adequate vertical padding (`py-16 sm:py-20`)
- [ ] Content is centered with appropriate max-width
- [ ] Section is visible to all users (logged-in and logged-out)

### Share Panel

- [ ] Share panel opens when any Share button is clicked (dashboard, Daily Hub, or landing page)
- [ ] Panel has "Copy verse" option with Clipboard icon
- [ ] Panel has "Share as image" option with Image icon
- [ ] Panel has "Download image" option with Download icon
- [ ] Panel styling matches existing dropdown panel pattern (`bg-hero-mid border border-white/15 rounded-xl`)
- [ ] Panel dismisses on click outside or Escape key
- [ ] Each row has minimum 44px touch target height

### Copy Verse

- [ ] "Copy verse" copies formatted text `"[verse text] — [reference]"` to clipboard
- [ ] "Copied!" toast notification appears after successful copy (using existing toast system)
- [ ] Share panel closes after copy action

### Share Image Generation

- [ ] "Share as image" generates a 400x600px PNG using HTML Canvas
- [ ] Image has dark purple gradient background (matching landing page hero gradient angle and colors)
- [ ] Verse text is centered in white Lora font, sized to fit within margins
- [ ] Reference appears below verse in smaller text at 50% white opacity
- [ ] "Worship Room" watermark appears at the bottom in Caveat script font at 30% white opacity
- [ ] On mobile with Web Share API: triggers `navigator.share({ files: [pngFile] })` for direct sharing
- [ ] On desktop or without Web Share API: triggers PNG download
- [ ] PNG filename follows format: `worship-room-verse-YYYY-MM-DD.png`

### Download Image

- [ ] "Download image" option always triggers a PNG download regardless of platform
- [ ] Download works on mobile (even when Web Share API is available — download is a separate action from share)

### Responsive Layout

- [ ] Mobile (< 640px): Dashboard widget full-width; Daily Hub banner with truncated verse; Landing section with `text-lg` verse
- [ ] Tablet (640-1024px): Dashboard widget in grid; Daily Hub banner with full verse; Landing section with `text-2xl` verse
- [ ] Desktop (> 1024px): Dashboard widget in left column after MoodChart; Daily Hub banner full-width with inline reference; Landing section with `text-2xl` verse and generous padding

### Accessibility

- [ ] Share buttons are keyboard-accessible with visible focus indicators
- [ ] Share panel is keyboard-navigable and dismissible with Escape
- [ ] Share panel uses appropriate ARIA attributes (e.g., `role="menu"` or `role="dialog"`)
- [ ] Verse text is readable by screen readers in all three locations
- [ ] "Copied!" toast uses appropriate announcement for screen readers (`aria-live="polite"`)
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] Share image has meaningful alt text (for any preview, if shown)
- [ ] Color contrast meets WCAG AA for all verse text against backgrounds

### Visual Verification

- [ ] Dashboard widget matches existing frosted glass card pattern (same border, backdrop-blur, padding as other dashboard cards)
- [ ] Daily Hub banner sits naturally between the hero greeting and tab bar without disrupting the existing layout flow
- [ ] Landing page section's dark background transitions smoothly from the JourneySection above and into the GrowthTeasersSection below
- [ ] Share panel popover is visually consistent with existing navbar dropdown panels
- [ ] Generated PNG image has the dark purple gradient, white Lora text, reference, and Caveat watermark — all legible and well-positioned
- [ ] Verse text on the share image is properly centered and sized (not overflowing, not tiny)

### No Regressions

- [ ] Existing `DAILY_VERSES` array and `getVerseOfTheDay()` function in mock data are unchanged
- [ ] Existing dashboard widget order is preserved (new widget inserted after MoodChart, not replacing anything)
- [ ] Daily Hub hero, tab bar, and tab content are unchanged
- [ ] Landing page JourneySection and GrowthTeasersSection are unchanged
- [ ] No new localStorage keys written
- [ ] No new routes created
- [ ] Existing share functionality on other features (prayers, scripture) is unaffected
