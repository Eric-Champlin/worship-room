# Feature: Verse Image Sharing Templates

**Master Plan Reference:** N/A — standalone feature (enhances existing Spec 15 share system)

---

## Overview

Sharing scripture is one of the most natural ways users carry Worship Room's mission of emotional healing beyond the app — a beautiful verse image posted on Instagram or texted to a friend becomes an invitation to encounter God's Word. The current share system generates a single 400x600 dark purple gradient PNG. This feature expands that into a full sharing experience with 4 visually distinct templates, 3 platform-optimized sizes, and a redesigned share panel — giving users creative ownership over how they share scripture while producing images that look native on every social platform.

## User Stories

- As a **logged-out visitor**, I want to choose from multiple beautiful verse image styles so that I can share scripture in a format that matches my aesthetic and the platform I'm posting to.
- As a **logged-in user**, I want to share verses sized correctly for Instagram Stories, Twitter, or Facebook so that the image fills the frame without cropping or letterboxing.
- As any user, I want the app to remember my preferred template and size so that I don't have to re-select them every time I share.

---

## Requirements

### Share Panel Redesign

1. **Replace the current share dropdown** with a share panel. On mobile (< 640px): a bottom sheet sliding up from the bottom edge (`rounded-t-2xl`). On desktop (>= 640px): a centered modal with backdrop overlay (`rounded-xl`).

2. **Panel trigger:** When the user taps "Share" on any verse (Verse of the Day, Bible reader verse, prayer response verse, AI chat supporting verse, devotional scripture passage, or `/verse/:id` shared verse page), the share panel opens instead of immediately generating an image. The panel receives `verseText` and `reference` as props.

3. **Panel layout** has 3 sections stacked vertically: template picker, size selector, and action buttons.

### Template Picker

4. **Thumbnail row:** A horizontal scrollable row of 4 template thumbnails (~80px wide each). Each thumbnail shows a miniature preview of the template's design rendered with the actual verse text. The selected thumbnail has a `ring-2 ring-primary/30 border-primary` border. Unselected thumbnails have `bg-white/[0.06] border border-white/10 rounded-lg`.

5. **Template label:** Each thumbnail has a small label below it (the template name) in `text-xs text-white/50`.

6. **Large preview:** Below the thumbnails, a larger preview area (~300px wide on mobile, ~400px on desktop) shows the selected template at full quality with the actual verse text rendered. The preview has a subtle inner shadow (`shadow-inner`) to frame it as a card preview. The preview updates on template or size selection change with a 300ms debounce. A brief loading shimmer (`bg-white/5 animate-pulse`) covers the preview while the canvas renders.

7. **Template 1 — "Classic" (default):** The existing design. Dark purple gradient background (`#1a0533` to `#0f0a1e`). Verse text centered in Lora italic, white. Reference below in `rgba(255,255,255,0.6)`. "Worship Room" watermark at bottom center in Caveat script, `rgba(255,255,255,0.2)`.

8. **Template 2 — "Radiant":** Background gradient from deep purple (`#1a0533`) through warm violet (`#4c1d95`) to soft rose (`#831843`) at the bottom. Verse text in white with `text-shadow: 0 2px 8px rgba(0,0,0,0.3)` for depth. Reference in a pill-shaped badge (`bg-white/20 rounded-full px-3 py-1`). Subtle radial glow behind the text center (radial gradient: `rgba(255,255,255,0.05)` at center fading to transparent). Watermark same position as Classic.

9. **Template 3 — "Nature":** Background gradient from deep navy (`#0f172a`) to deep teal (`#134e4a`). Verse text in warm cream white (`#fef3c7`). Decorative thin gold lines (1px, `rgba(212,165,116,0.3)`) above and below the verse text, extending ~60% of the card width, centered. Reference below in cream at 60% opacity. Watermark in cream at 20% opacity.

10. **Template 4 — "Bold":** Solid near-black background (`#0a0a0a`). Verse text in large bold white (Inter Bold, not italic), left-aligned for modern editorial feel. Reference in primary purple (`#8b5cf6`) below, also left-aligned. A 3px vertical accent bar in primary purple along the left edge of the text block. Watermark at bottom-right instead of bottom-center.

### Size Selector

11. **Three size pills** displayed as a row of selectable buttons below the preview:
    - **"Square"** (1080x1080) — Instagram feed, Facebook
    - **"Story"** (1080x1920) — Instagram Stories, Facebook Stories, TikTok
    - **"Wide"** (1200x630) — Twitter/X, Facebook link preview, Open Graph

12. **Default selection:** Square. Unselected pills: `bg-white/10 text-white/60`. Selected pill: `bg-primary/20 text-white border border-primary/30`.

13. **Size-responsive text layout:**
    - **Square:** Verse centered vertically and horizontally with 15% padding on each side.
    - **Story:** Verse positioned in the upper third (more padding below to leave room for Instagram UI overlays at the bottom of a story).
    - **Wide:** Verse centered with compact vertical padding, slightly larger base font to fill the wider format.

### Canvas Rendering

14. **Same HTML Canvas approach** as the existing system but parameterized by template and size. Each template defines its own render function that takes the canvas context, verse text, reference, and dimensions, then draws the appropriate background, text, and decorations.

15. **Font handling:** Use Lora for italic templates (Classic, Radiant, Nature) and Inter Bold for the Bold template. Preload fonts via `document.fonts.load()` before rendering. Fall back to `serif` (for Lora) or `sans-serif` (for Inter) if fonts aren't available.

16. **Dynamic font sizing based on verse length** (at 1080px square base, scaled proportionally for other sizes):
    - Short verses (< 100 chars): ~28px
    - Medium verses (100-250 chars): ~22px
    - Long verses (> 250 chars): ~18px
    - Text must not clip or overflow the safe area (15% padding on each side).

17. **Text wrapping:** Use the existing word-wrap logic from the current share card, adapted for variable dimensions.

### Action Buttons

18. **"Download"** — Downloads the generated PNG with filename `worship-room-[reference]-[template]-[size].png` (e.g., `worship-room-John-3-16-radiant-square.png`). Uses the existing `canvas.toBlob` + `URL.createObjectURL` + anchor click pattern.

19. **"Share"** — Uses the Web Share API (`navigator.share`) with the image as a file. If Web Share API isn't available (desktop browsers), this button is replaced by "Copy Image" which copies the image blob to clipboard via `navigator.clipboard.write`. Shows a success toast "Image copied!" on copy.

20. **Button layout:**
    - **Mobile:** "Download" and "Share" side by side as primary actions (equal width).
    - **Desktop:** "Download" and "Copy Image" as primary actions. If the browser supports Web Share API, also show "Share" as a secondary option.

### Preference Persistence

21. **New localStorage keys:**
    - `wr_share_last_template` — stores the last-selected template name (e.g., `"classic"`, `"radiant"`, `"nature"`, `"bold"`). Default: `"classic"`.
    - `wr_share_last_size` — stores the last-selected size (e.g., `"square"`, `"story"`, `"wide"`). Default: `"square"`.
    - These persist across sessions so the user's preference is remembered.

### Integration Points

22. **All existing verse share triggers** open the new SharePanel component instead of the current dropdown/menu. The following locations are affected:
    - **Verse of the Day** — "Share" button on dashboard widget and Daily Hub hero card (currently uses `VerseSharePanel`)
    - **Bible Reader** — "Share" button in the floating action bar when a verse is selected (currently uses `VerseShareMenu`)
    - **AI Bible Chat** — "Share" button on supporting verse cards in `/ask`
    - **Devotional** — share button for the devotional scripture passage
    - **Shared Verse page** (`/verse/:id`) — existing share functionality upgrades to use the new panel
    - **Prayer response** — "Share" button on generated prayer display (shares the prayer verse, not the prayer text)

23. **Do not modify** non-verse sharing: challenge progress sharing (`ChallengeShareButton`), prayer wall sharing (`ShareDropdown`), local support sharing (`ListingShareDropdown`), and monthly report sharing (`MonthlyShareButton`) remain unchanged.

---

## Auth Gating

**Every interactive element is available to all users — no auth gating.**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Open share panel (any trigger) | Opens share panel | Opens share panel | N/A |
| Select template | Updates preview | Updates preview | N/A |
| Select size | Updates preview | Updates preview | N/A |
| Download image | Downloads PNG | Downloads PNG | N/A |
| Share image (mobile) | Triggers Web Share API | Triggers Web Share API | N/A |
| Copy image (desktop) | Copies to clipboard | Copies to clipboard | N/A |

Sharing scripture is a conversion opportunity — a logged-out user shares a beautiful verse image with the Worship Room watermark, which drives awareness. No auth gate on any sharing action.

Note: The dashboard Verse of the Day widget is inherently auth-gated (dashboard only renders for logged-in users), but the share panel itself requires no additional auth check.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Share panel renders as a bottom sheet (slides up from bottom, `rounded-t-2xl`, max-height 90vh, scrollable). Thumbnails ~70px wide. Large preview ~300px wide, centered. Size pills stack if needed. "Download" + "Share" buttons side by side, full width. |
| Tablet (640-1024px) | Share panel renders as a centered modal (`rounded-xl`, max-width 480px). Thumbnails ~80px wide. Large preview ~360px wide. Size pills in a row. Buttons side by side. |
| Desktop (> 1024px) | Share panel renders as a centered modal (`rounded-xl`, max-width 520px). Thumbnails ~80px wide. Large preview ~400px wide. Size pills in a row. "Download" + "Copy Image" primary buttons, "Share" secondary if supported. |

- Bottom sheet on mobile has a drag handle indicator (small gray bar at top center).
- Modal on desktop has backdrop overlay (`bg-black/50 backdrop-blur-sm`) and close button (X) in top-right corner.
- Preview area maintains the selected size's aspect ratio (1:1 for square, 9:16 for story, 1200:630 for wide) and scales down to fit the available width.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. It renders curated scripture (WEB Bible translation) and user-selected formatting options. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Can use all share panel features. Zero data persistence beyond template/size preference in localStorage.
- **Logged-in users:** Same experience. Template/size preference persists in localStorage.
- **localStorage usage:**
  - `wr_share_last_template` — string (`"classic"` | `"radiant"` | `"nature"` | `"bold"`)
  - `wr_share_last_size` — string (`"square"` | `"story"` | `"wide"`)

---

## Completion & Navigation

N/A — standalone feature. Sharing does not signal completion of any daily activity or affect streaks/points.

---

## Design Notes

### Share Panel Styling

- **Background:** `bg-[#1a0f2e]` (dark frosted glass). Border: `border border-white/10`. Shadow: `shadow-2xl`.
- **Mobile bottom sheet:** `rounded-t-2xl`. Drag handle: `w-10 h-1 bg-white/20 rounded-full mx-auto mb-4`.
- **Desktop modal:** `rounded-xl`. Close button: `text-white/40 hover:text-white/70` X icon, top-right.
- **Backdrop (desktop):** `bg-black/50 backdrop-blur-sm`.

### Template Thumbnails

- Container: horizontal scroll, `gap-3`, `overflow-x-auto`, hide scrollbar CSS.
- Each thumbnail: `bg-white/[0.06] border border-white/10 rounded-lg` with aspect ratio matching the selected size.
- Selected state: `border-primary ring-2 ring-primary/30`.
- Template name label below each: `text-xs text-white/50 mt-1 text-center`.

### Size Pills

- Container: `flex gap-2` centered.
- Unselected: `bg-white/10 text-white/60 px-4 py-2 rounded-full text-sm`.
- Selected: `bg-primary/20 text-white border border-primary/30 px-4 py-2 rounded-full text-sm`.
- Each pill includes the platform hint: e.g., "Square" with "Instagram, FB" in smaller text below or as a tooltip.

### Action Buttons

- Primary buttons: `bg-primary text-white font-medium py-3 px-6 rounded-xl` (same primary CTA style).
- Secondary button (desktop "Share" if supported): `bg-white/10 text-white/80 border border-white/10 py-3 px-6 rounded-xl`.
- Minimum touch target: 44px height.

### Canvas Template Details

Each template's canvas render follows the same structure: fill background → draw decorations → draw verse text (word-wrapped) → draw reference → draw watermark. The preview in the share panel is a scaled-down version of the actual canvas output (rendered at full resolution, displayed at preview size via CSS scaling or a scaled canvas).

### Design System Recon References

- **Frosted glass pattern:** Design system recon — `bg-white/5 backdrop-blur-sm border border-white/10` (adapted darker for the share panel: `bg-[#1a0f2e]`).
- **Primary button pattern:** Design system recon — `bg-primary text-white font-medium` with rounded corners.
- **Dropdown panel pattern:** Design system recon — `bg-hero-mid border-white/15` for existing dropdowns (the new panel extends this with a richer layout).
- **Toast system:** Existing toast system via `useToast()` hook for "Image copied!" feedback.

### New Visual Patterns

1. **Share bottom sheet (mobile):** New pattern — a bottom sheet modal with template gallery and preview. Slides up from bottom with `rounded-t-2xl` and drag handle. Not previously used in the app.
2. **Template thumbnail gallery:** New pattern — horizontal scrollable row of small canvas previews with selection ring.
3. **Canvas aspect ratio preview:** New pattern — a dynamically-sized preview area that changes aspect ratio based on the selected size (1:1 → 9:16 → ~2:1).
4. **Four canvas template designs:** New visual patterns for Radiant, Nature, and Bold templates (Classic already exists).

---

## Out of Scope

- **Custom user-created templates** — Users cannot modify colors, fonts, or layout. Only the 4 preset templates are available.
- **Photo/image background templates** — All templates use solid or gradient backgrounds, no photo uploads or background images.
- **Video sharing** — No animated or video verse exports.
- **Backend persistence of share events** — No analytics on which templates/sizes are used. Phase 3+ analytics could add this.
- **Social media direct posting** — The app generates an image; the user shares it via their OS share sheet or downloads it. No direct API integration with Instagram, Facebook, etc.
- **Template for non-verse content** — Challenge sharing, prayer wall sharing, profile sharing, and monthly report sharing are unaffected. Only verse/scripture sharing gets the template system.
- **Server-side image generation** — All rendering is client-side via HTML Canvas. No server-side OG image generation.
- **Verse text editing** — Users cannot modify the verse text or reference before sharing. What's displayed is what's shared.

---

## Acceptance Criteria

### Share Panel

- [ ] Tapping "Share" on any verse opens a share panel (not the old dropdown)
- [ ] On mobile (< 640px): share panel is a bottom sheet sliding up from the bottom with `rounded-t-2xl` and drag handle
- [ ] On desktop (>= 640px): share panel is a centered modal with `rounded-xl`, backdrop overlay, and close (X) button
- [ ] Share panel uses dark frosted glass styling: `bg-[#1a0f2e] border border-white/10`
- [ ] Share panel is a dialog with `role="dialog"`, `aria-label="Share verse"`, and focus trap
- [ ] Share panel closes on clicking backdrop, pressing Escape, or clicking close button

### Template Picker

- [ ] 4 template thumbnails displayed in a horizontal scrollable row (~80px wide each)
- [ ] Each thumbnail renders a miniature preview of its template design with the actual verse text
- [ ] Selected thumbnail has `border-primary ring-2 ring-primary/30`; unselected have `bg-white/[0.06] border border-white/10 rounded-lg`
- [ ] Template name labels appear below each thumbnail in `text-xs text-white/50`
- [ ] Thumbnails have `aria-label` (e.g., "Classic template", "Radiant template")
- [ ] A larger preview (~300px mobile, ~400px desktop) below thumbnails shows the selected template at full quality
- [ ] Preview updates with 300ms debounce when template or size changes
- [ ] Loading shimmer displays briefly while canvas renders

### Templates

- [ ] **Classic:** Dark purple gradient (`#1a0533` to `#0f0a1e`), Lora italic white verse text centered, reference in white/60, "Worship Room" watermark in Caveat at white/20, bottom center
- [ ] **Radiant:** Purple-to-violet-to-rose gradient (`#1a0533` → `#4c1d95` → `#831843`), white verse text with text-shadow, reference in pill badge (`bg-white/20 rounded-full`), radial glow behind text, watermark same position
- [ ] **Nature:** Navy-to-teal gradient (`#0f172a` → `#134e4a`), cream verse text (`#fef3c7`), thin gold decorative lines above and below verse (~60% width, centered), cream reference at 60% opacity, cream watermark at 20%
- [ ] **Bold:** Near-black background (`#0a0a0a`), large bold white Inter text left-aligned, reference in primary purple (`#8b5cf6`) left-aligned, 3px vertical purple accent bar on left, watermark at bottom-right

### Size Selector

- [ ] 3 size pills: "Square" (1080x1080), "Story" (1080x1920), "Wide" (1200x630)
- [ ] Default selection: Square
- [ ] Selected pill: `bg-primary/20 text-white`; unselected: `bg-white/10 text-white/60`
- [ ] Size pills have `aria-label` text
- [ ] Preview aspect ratio updates to match selected size
- [ ] **Square:** Verse centered with 15% padding on each side
- [ ] **Story:** Verse in upper third with generous bottom padding
- [ ] **Wide:** Verse centered with compact vertical padding and slightly larger font

### Dynamic Font Sizing

- [ ] Short verses (< 100 chars): ~28px base font at 1080px square
- [ ] Medium verses (100-250 chars): ~22px base font
- [ ] Long verses (> 250 chars): ~18px base font
- [ ] No text clipping or overflow beyond the 15% safe area padding
- [ ] Font sizes scale proportionally for Story and Wide dimensions

### Action Buttons

- [ ] "Download" button downloads PNG with filename format `worship-room-[reference]-[template]-[size].png`
- [ ] On mobile: "Download" and "Share" buttons displayed side by side
- [ ] On desktop: "Download" and "Copy Image" displayed as primary actions
- [ ] "Share" uses Web Share API (`navigator.share`) with image file
- [ ] "Copy Image" copies image blob to clipboard and shows "Image copied!" toast
- [ ] If Web Share API is unavailable on mobile, "Share" falls back to "Copy Image" behavior
- [ ] All action buttons meet 44px minimum touch target

### Preference Persistence

- [ ] Selected template persists to `wr_share_last_template` in localStorage
- [ ] Selected size persists to `wr_share_last_size` in localStorage
- [ ] On re-open, share panel loads the previously selected template and size
- [ ] Defaults to "classic" template and "square" size if no stored preference

### Integration Points

- [ ] Verse of the Day (dashboard + Daily Hub) share button opens the new share panel
- [ ] Bible reader verse share button opens the new share panel (replaces `VerseShareMenu`)
- [ ] AI Bible Chat supporting verse share button opens the new share panel
- [ ] Devotional scripture passage share button opens the new share panel
- [ ] Shared Verse page (`/verse/:id`) share functionality uses the new share panel
- [ ] Prayer response verse share button opens the new share panel
- [ ] All triggers pass `verseText` and `reference` props to the same `SharePanel` component

### No Regressions

- [ ] Challenge progress sharing (`ChallengeShareButton`) remains unchanged
- [ ] Prayer wall sharing (`ShareDropdown`) remains unchanged
- [ ] Local support sharing (`ListingShareDropdown`) remains unchanged
- [ ] Monthly report sharing (`MonthlyShareButton`) remains unchanged
- [ ] "Copy verse" text functionality (clipboard text, not image) still works in all locations
- [ ] Existing toast system works for "Image copied!" feedback

### Accessibility

- [ ] Share panel is a dialog with `role="dialog"` and `aria-label="Share verse"`
- [ ] Focus is trapped within the share panel while open
- [ ] Focus returns to the trigger button when panel closes
- [ ] Template thumbnails are keyboard-navigable with arrow keys
- [ ] All interactive elements have visible focus indicators
- [ ] Preview image has `alt` text containing the verse text and reference
- [ ] Download and share buttons have clear accessible labels
- [ ] Color contrast meets WCAG AA for all text within the share panel

### Performance

- [ ] Canvas rendering is debounced at 300ms on template/size selection change
- [ ] Preview shows loading shimmer while canvas renders
- [ ] Story size (1080x1920) renders without blocking UI (shimmer covers the ~200-300ms render time)
- [ ] Fonts are preloaded via `document.fonts.load()` before canvas rendering
- [ ] Font fallback (serif for Lora, sans-serif for Inter) works when custom fonts are unavailable

### Visual Verification

- [ ] Share panel bottom sheet on mobile slides up smoothly and has visible drag handle
- [ ] Share panel modal on desktop is centered with proper backdrop overlay
- [ ] Template thumbnails render recognizable mini-previews (distinguishable designs)
- [ ] Large preview accurately represents the final downloaded image
- [ ] All 4 templates are visually distinct and render correctly at all 3 sizes (12 combinations)
- [ ] Generated PNG images are high quality (1080+ pixels) and look professional when posted on social media
- [ ] Watermark is subtle but legible across all template/size combinations
