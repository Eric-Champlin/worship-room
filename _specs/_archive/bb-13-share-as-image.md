# BB-13: Share as Image

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (reader + verse spans + WEB data), BB-6 (action sheet + registry + sub-view stack), BB-7 (highlight colors for optional card tinting)
**Hands off to:** BB-38 (deep linking upgrades chapter-level URLs to verse-anchored URLs), BB-40 (SEO + Open Graph reuses the card renderer server-side for link previews)

---

## Overview

When scripture hits someone and they want to share it — text it to a friend, post it to their Instagram story, save it as something beautiful — the Share button in the action sheet currently shows a stub. BB-13 replaces that stub with a full share-as-image flow: a share sub-view that renders the selected verse as a visually distinctive dark cinematic card, lets the user pick a format (Square, Story, Portrait, Wide), optionally tint the card with their highlight emotion color, and download, copy, or natively share the image.

Share is the cheapest marketing channel a Bible app has. A single beautiful verse card on someone's Instagram story reaches more potential users than any ad campaign. The card carries the Worship Room visual identity — dark gradient, glow orbs, serif typography, wordmark — so every share doubles as a brand artifact. YouVersion's share cards are cluttered and template-ish. She Reads Truth's are beautiful but paywalled. Ours should be free, fast, and so visually distinctive that seeing one on a friend's story makes you want to know where it came from.

After BB-13 ships, every button a user can tap in the verse action sheet does something real. The reader reaches interactive completeness.

## User Stories

As a **logged-in user** reading the Bible, I want to tap Share on a verse and get a beautiful branded image I can post to my Instagram story so that I can share scripture with my community without leaving the reader.

As a **logged-out visitor** reading the Bible, I want the same Share flow so that I can share a verse with a friend before I even create an account.

As any user sharing a multi-verse passage, I want the card to render all selected verses with inline verse numbers so that I can share a complete passage (e.g., John 3:16–18) as a single image.

## Requirements

### Functional Requirements

#### Share Sub-View

1. Tapping the Share primary action in the verse action sheet pushes a new sub-view into the sheet's view stack (same pattern as Highlight, Note, Cross-References)
2. The sub-view replaces the current BB-6 stub: `stubSubView('Share panel ships in BB-13')`

#### Sub-View Layout

**Header:**
3. Back button (top-left) pops to the action sheet root without closing the sheet
4. Title: "Share"
5. Subtitle: the verse reference (e.g., "John 3:16" or "John 3:16–18") using the `formatReference` helper from `verseActionRegistry.ts`
6. Close button (X) on the right closes the entire sheet

**Format Picker:**
7. A horizontal row of four format thumbnails: Square, Story, Portrait, Wide
8. Each thumbnail shows a live-rendered miniature preview of the card in that format (~60px tall, aspect-ratio-accurate)
9. Selected format has a glow ring (purple accent color, or tinted to match highlight color when the toggle is on)
10. Square is selected by default
11. Tapping a thumbnail selects that format and updates the main preview

**Main Preview:**
12. A live preview of the card in the selected format, rendered at full fidelity
13. On mobile, the preview scales down to fit the available width while maintaining aspect ratio
14. Preview background is transparent/dark so the card edges are clearly visible against the sheet

**Options Section:**
15. **"Match my highlight color"** toggle — visible only when the selected verse has an existing highlight from BB-7. Default on. Tinting maps highlight emotion colors to orb hue shifts on the card.
16. **"Include reference"** toggle — default on. When off, the verse reference line (e.g., "John 3:16") is omitted from the card. The WEB footer attribution and wordmark remain.

**Actions Row:**
17. Three large primary action buttons in a horizontal row below the preview:
    - **Download** — saves the card as a PNG file
    - **Copy image** — copies the card to the clipboard
    - **Share** (native) — invokes the Web Share API with the image as a file attachment
18. All action button tap targets >= 44px

**Footer:**
19. Small muted caption: "Cards include a link back to Worship Room"

**Long Passage Warning:**
20. If the combined verse text exceeds 800 characters, a small advisory appears above the preview: "This is a long passage — consider sharing a shorter selection." The share still works.

#### Card Dimensions and Rendering

21. Four card formats at 2x resolution for Retina quality:
    - **Square**: 2160×2160 (exports at 1080×1080)
    - **Story**: 2160×3840 (exports at 1080×1920)
    - **Portrait**: 2160×2700 (exports at 1080×1350)
    - **Wide**: 3840×2160 (exports at 1920×1080)

22. Cards are rendered using the **Canvas API** (programmatic draw calls), not HTML-to-canvas libraries. Canvas rendering provides pixel-perfect control, deterministic output, handles fonts cleanly via `FontFace.load()`, has zero library dependencies, and consistent output across browsers.

23. **Background**: The dark cinematic gradient from BB-1 (hero-dark `#0D0620` to hero-mid `#1E0B3E` to hero-deep `#251248`). Same gradient used on the Bible landing and reader.

24. **Glow orbs**: 2–3 radial gradient orbs at 0.25–0.50 opacity, using BB-1's established purple/lavender palette. Positioned to frame the verse text without competing with it. When highlight tinting is on, orb hues shift to match the emotion color (Peace → blue, Conviction → amber, Joy → gold, Struggle → violet, Promise → green).

25. **Verse text**: Rendered in the reading serif font (Lora), white, centered. For Wide format, left-aligned with verse text on the left ~60% and reference/wordmark on the right ~40%.

26. **Font auto-sizing** based on total character count:
    - Short (<100 chars): large display size
    - Medium (100–250 chars): medium size
    - Long (250–500 chars): smaller size
    - Very long (500+ chars): further reduction, but never below a legibility floor (~28px at 1080px card width, ~56px at 2x)

27. **Word wrapping**: Manual word-wrap implementation since Canvas has no built-in text wrapping. Split text into words, measure each word + space, accumulate lines within the safe area width. Handle extremely long words (e.g., "Mahershalalhashbaz").

28. **Multi-verse text**: Verses concatenated with inline verse numbers rendered in a muted color (like superscripts in the reader). Reference line shows the full range (e.g., "John 3:16–18").

29. **Verse reference**: Below the verse text, smaller, muted. Uses the display heading font token. Omitted when "Include reference" toggle is off.

30. **Worship Room wordmark**: Small, bottom of the card, muted (`rgba(255,255,255,0.3–0.4)`) so it doesn't compete with the verse.

31. **WEB footer attribution**: Tiny footer text on every card: "World English Bible · Public Domain". Bottom-center, muted, small but readable.

32. **Safe margins**: ~8% inset on each side of every card format. Text never touches the edge. Social platforms sometimes crop slightly; the safe area prevents clipping.

#### Font Loading

33. The renderer must await `document.fonts.load()` for the serif font (Lora) before drawing any text. No card should ever render with a fallback font. Block on font load.

#### Performance

34. Single card render: <200ms on desktop, <500ms on mobile for standard verse lengths
35. Thumbnail strip: four small renders at thumbnail dimensions (not downscaled from full render). Thumbnails fade in progressively as they complete.
36. The renderer caches rendered blobs per options shape (format + includeReference + highlightColor). Switching back to a previously viewed format/options combo is instant from cache.

#### Download Action

37. **Desktop**: Create a blob URL → temporary `<a download="...">` element → click → revoke URL
38. **iOS Safari**: Detection via `/iPhone|iPad/.test(navigator.userAgent)`. Open image in a new tab. Toast: "Long-press the image to save it to Photos."
39. **Android**: Standard download works
40. **Filename format**: `worship-room-{book-slug}-{chapter}-{start}{endSuffix}.png`
    - `worship-room-john-3-16.png` (single verse)
    - `worship-room-psalms-23-1-6.png` (range)

#### Copy Image Action

41. Uses `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` where supported (Chrome, Edge, modern Safari)
42. On success: toast "Copied to clipboard"
43. On failure: toast "Copy image isn't supported in this browser" — no fallback to text copying

#### Native Share Action

44. Uses `navigator.share({ files: [new File([blob], filename, { type: 'image/png' })], title, text })`
45. The button is completely hidden on platforms where `navigator.share` is unavailable or doesn't support file sharing. No disabled state.
46. Share text payload: verse reference + chapter-level link back to the reader (e.g., "John 3:16 — worshiproom.com/bible/john/3")

#### Link-Back URLs

47. Every share's text payload includes a URL: `worshiproom.com/bible/{book}/{chapter}` (chapter level only). BB-38 (deep linking) will upgrade this to verse-level anchoring by updating one helper function.
48. The URL does NOT appear on the card image itself — the card stays visually clean.

### Non-Functional Requirements

- **Performance**: Card renders in <200ms desktop / <500ms mobile. Thumbnails render progressively.
- **Accessibility**: All tap targets >= 44px. Focus trap within the sub-view. Format picker keyboard navigable. `prefers-reduced-motion` respected: thumbnail fade-in is instant, no preview animations. Lighthouse accessibility score >= 95.
- **No new localStorage keys**: Share preferences (last format, etc.) are ephemeral per session. No persistence needed.
- **Zero raw hex values in component code**: Hex values are allowed inside the canvas renderer (unavoidable for canvas gradient stops), but UI components import from shared color constants / Tailwind tokens.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap Share in action sheet | Opens share sub-view (no auth required) | Opens share sub-view | N/A |
| Download card | Works — downloads PNG | Works — downloads PNG | N/A |
| Copy image | Works where browser supports it | Works where browser supports it | N/A |
| Native share | Works on supported platforms | Works on supported platforms | N/A |

**Share is fully available without authentication.** This is intentional — share is the marketing funnel. Gating it behind auth would defeat its purpose. Every shared card carries the Worship Room brand and a link back to the reader.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Sub-view is full-width within the action sheet bottom panel. Format thumbnails scroll horizontally if needed. Main preview scales to fit available width. Action buttons stack 3-across with icon + label. |
| Tablet (640–1024px) | Same as mobile but more breathing room. Format thumbnails all visible without scroll. Preview has more margin. |
| Desktop (> 1024px) | Sub-view within the 440px-wide action sheet panel. Format thumbnails fit comfortably. Preview centered with generous padding. |

- Format picker thumbnails maintain correct aspect ratios at small sizes
- Main preview maintains aspect ratio and scales down as needed (never upscales)
- Action buttons maintain >= 44px tap targets at all breakpoints
- Swipe down on the sub-view pops to the action sheet root (mobile gesture)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The card renders existing WEB Bible text. No crisis detection required.

## Auth & Persistence

- **Logged-out users**: Full access to all share functionality. Cards render from verse data already loaded in the reader. Zero persistence — no cookies, no localStorage writes, no tracking.
- **Logged-in users**: Same behavior. No additional persistence.
- **localStorage usage**: None. The renderer cache is in-memory only (React state / module-level Map). User preferences like last-used format are ephemeral per session.

Note: The existing `wr_share_last_template` and `wr_share_last_size` keys (from the Verse of the Day share panel) are NOT reused here. BB-13's share sub-view is a different UI with different format options. Keeping preferences ephemeral avoids stale state.

## Completion & Navigation

N/A — standalone feature within the Bible reader. Not part of the Daily Hub tabbed experience.

## Design Notes

- **Card visual identity**: Dark cinematic gradient (hero-dark/hero-mid/hero-deep), glow orbs at 0.25–0.50 opacity, Lora serif for verse text, Inter for reference/wordmark. The card should feel like "a single shaft of light on a quiet page" — restrained, more negative space than competitors.
- **Existing canvas rendering precedent**: The codebase already has `verse-card-canvas.ts` (4 templates × 3 sizes for VotD sharing) and `challenge-share-canvas.ts`. BB-13's renderer follows the same Canvas API pattern but with a different visual design (dark cinematic vs. the VotD templates) and different format dimensions.
- **Existing share panel precedent**: `SharePanel.tsx` (VotD) handles download/copy/native-share with the same browser API patterns. BB-13 can reference its approach for iOS detection, clipboard API, and Web Share API usage.
- **Sub-view integration**: Uses the same `renderSubView` pattern as Highlight (color picker) and Note (editor). The action sheet's view stack handles back/close navigation.
- **FrostedCard**: Not used on the share sub-view itself (it lives inside the action sheet which has its own styling). The card preview is a raw canvas render displayed as an `<img>`.
- **Toast system**: Uses the existing `useToast()` hook for copy/download confirmation messages.
- **Highlight emotion colors (for optional tinting)**: Peace (blue), Conviction (amber), Joy (gold), Struggle (violet), Promise (green) — mapped from `HighlightColor` type in `types/bible.ts`.
- **The "Match my highlight color" feature is cuttable** — it's the most delightful detail in this spec but if execution runs long, defer it to a follow-up. Ship the rest without it.

## Out of Scope

- **No SEO/OG image generation** — BB-40 will reuse the renderer server-side for link preview cards; BB-13 ships client-side only
- **No user-uploaded background images** — the Worship Room gradient is the brand identity
- **No font selection** — Lora serif only, matching the reader
- **No color picker for the card** — BB-7 highlight tinting is the only color variation
- **No "add your caption" / text overlay editing** — the verse is the content
- **No watermarks beyond the tasteful wordmark** — no big logo, QR code, or app store badge
- **No social media direct-posting** — no Instagram/Twitter API integration. Users share via native share or manual upload.
- **No analytics on share events** — privacy over metrics
- **No share count or social proof** — no accounts, no aggregation
- **No animated cards** — static PNG only
- **No Parchment/Sepia theme variants** — dark Midnight only in BB-13. Future spec can add light variants.
- **No verse-anchor deep links** — `shareUrl` helper ships chapter-level URLs; BB-38 upgrades to verse-level
- **No image editing** (crop, filter, adjust)
- **No backend involvement** — fully client-side rendering and sharing

## Acceptance Criteria

- [ ] Tapping Share in the action sheet opens the share sub-view with back button, "Share" title, verse reference subtitle, and close (X) button
- [ ] The format picker shows four options: Square, Story, Portrait, Wide — all with live-rendered thumbnails
- [ ] Square format is selected by default
- [ ] The main preview updates immediately when the selected format changes
- [ ] The preview renders at full fidelity showing the actual card the user will download
- [ ] The dark cinematic gradient background renders correctly on all four formats
- [ ] Glow orbs render with correct opacity (0.25–0.50) and do not compete with verse text readability
- [ ] Verse text renders in the Lora serif font, centered (or left-aligned for Wide format), with correct auto-sizing
- [ ] Short verses (<100 chars) render at the largest font size
- [ ] Long verses (500+ chars) render at a reduced size but never below the legibility floor (~56px at 2x canvas)
- [ ] The verse reference appears below the verse text when "Include reference" is on
- [ ] Toggling "Include reference" off re-renders the preview without the reference line
- [ ] The Worship Room wordmark appears at the bottom of the card, muted
- [ ] The WEB footer attribution ("World English Bible · Public Domain") appears on every card
- [ ] Multi-verse selections render all verses with inline verse numbers in a muted color
- [ ] Multi-verse selections show the full range in the reference line (e.g., "John 3:16–18")
- [ ] Very long selections (>800 chars) show an advisory warning but still render
- [ ] If the verse has a BB-7 highlight, the "Match my highlight color" toggle appears and is on by default
- [ ] Toggling highlight color on/off updates the preview's glow orb tinting
- [ ] Download button saves the card as a PNG with filename `worship-room-{book}-{chapter}-{verse}.png`
- [ ] On iOS, download falls back to opening the image in a new tab with toast: "Long-press the image to save it to Photos."
- [ ] Copy image copies the card to the clipboard where supported and shows "Copied to clipboard" toast
- [ ] Copy image shows "Copy image isn't supported in this browser" toast on unsupported browsers (e.g., Firefox)
- [ ] Native share button invokes `navigator.share` with the image as a file attachment
- [ ] Native share button is completely hidden on platforms without the share API (not disabled — hidden)
- [ ] The native share payload includes the verse reference and a chapter-level link back to the reader
- [ ] Font loading completes before the first draw — no preview ever renders with a fallback font
- [ ] The renderer caches blobs per options shape; switching back to a previously viewed format is instant
- [ ] Renders complete in <200ms on desktop and <500ms on mobile for standard verse lengths
- [ ] Thumbnail strip renders progressively (thumbnails fade in as they complete)
- [ ] Unit tests for word wrapping cover: short text, long single word, multi-word wrapping, punctuation at line breaks
- [ ] Unit tests for font size calculation cover: short verse, medium verse, long verse, very long verse floor
- [ ] Unit tests for share URL builder cover: single verse, range, book slug normalization
- [ ] Back button pops to the action sheet root without closing the sheet
- [ ] Close button (X) closes the entire sheet
- [ ] Swipe down on the sub-view pops to the root (mobile)
- [ ] Focus trap stays within the sub-view while open
- [ ] All tap targets >= 44px on mobile
- [ ] `prefers-reduced-motion` respected: thumbnail fade-in is instant, no preview animations
- [ ] Share works identically for logged-out and logged-in users (no auth gating)
