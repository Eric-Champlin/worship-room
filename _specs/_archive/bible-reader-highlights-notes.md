# Feature: Bible Reader — Highlighting, Notes & Sharing

**Spec sequence:** This is Spec 2 of a 3-spec Bible reader sequence, building on Spec 1's `/bible` browser and `/bible/:book/:chapter` reading view. Spec 3 will add cross-references, AI-powered verse explanations, and integration with existing features (reading plans, devotionals, prayer generation).

**Depends on:** `_specs/bible-reader-browser.md` (Spec 1 / Spec 23) — the reading view, verse display, and browser page must be built first.

---

## Overview

Reading Scripture is only the first step — real engagement happens when users interact with the text. Highlighting a verse that speaks to them, jotting down a personal reflection, sharing a verse with a friend — these are the actions that transform passive reading into active spiritual growth. Every major Bible app (YouVersion, Glorify, Abide) offers highlighting and notes as core features, and sharing is how users carry Scripture beyond the app into their daily lives.

This spec adds three interactive features to the chapter reading view built in Spec 1: **verse highlighting** (4 colors, tap-to-toggle), **personal notes** (inline editor with crisis detection), and **verse sharing** (copy text + share/download image card). It also adds a **"My Highlights & Notes"** section to the `/bible` browser page so users can revisit their annotations across all books.

All annotation features require authentication — reading Scripture is free, but marking it up is personal. Copy-to-clipboard remains available without login because sharing Scripture shouldn't require an account.

---

## User Stories

- As a **logged-in user**, I want to highlight verses in different colors so that I can mark passages that are meaningful to me and quickly spot them when I return to a chapter.
- As a **logged-in user**, I want to add personal notes to specific verses so that I can capture my thoughts, reflections, and prayers alongside the Scripture that inspired them.
- As a **logged-in user**, I want to see all my highlights and notes in one place on the Bible browser page so that I can revisit my annotations without remembering which book and chapter they came from.
- As any user, I want to copy a verse as formatted text so that I can paste it into a message, email, or social media post.
- As a **logged-in user**, I want to share a verse as a branded image card so that I can send a beautiful Scripture image to a friend or post it on social media.
- As a **logged-out visitor**, I want to read the Bible without interruption but see a clear path to sign in when I try to highlight or take notes so that I understand the value of creating an account.

---

## Requirements

### Verse Selection & Floating Action Bar

1. **Tapping or clicking a verse** in the chapter reading view selects that verse and shows a floating action bar. Only one verse can be selected at a time — selecting a new verse dismisses the previous action bar.

2. **Floating action bar** is a compact horizontal pill with 4 icon buttons: Highlight (Lucide `Highlighter` icon), Note (Lucide `StickyNote` icon), Copy (Lucide `Copy` icon), Share (Lucide `Share2` icon). The bar uses frosted glass styling: `bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2 py-1`. Icons are 20px, `text-white/70 hover:text-white`.

3. **Positioning:** The action bar is positioned using `getBoundingClientRect()` relative to the selected verse element. On desktop and tablet, it appears **above** the verse, centered horizontally. On mobile (< 640px), it appears **below** the verse to avoid being hidden under the user's thumb. The bar must be clamped to stay within viewport bounds (minimum 8px from any edge). Uses a portal to avoid overflow clipping.

4. **Appearance animation:** Quick fade-in (150ms, `opacity 0→1`). Respects `prefers-reduced-motion` (instant show, no animation).

5. **Dismissal:** Tapping/clicking outside the action bar and the selected verse dismisses it. Pressing Escape dismisses it. Navigating to another chapter dismisses it.

6. **Logged-out action bar:** When a logged-out user taps a verse, the action bar still appears but the Highlight, Note, and Share buttons are replaced with a single lock icon and the message "Sign in to highlight and take notes" in `text-white/60 text-xs`. The Copy button remains functional — copying Scripture should not require login.

### Verse Highlighting

7. **Highlight button behavior:** Tapping the Highlight icon in the action bar reveals a row of 4 color option circles below or beside the icon buttons. The color circles are small (24px diameter) with a 2px white border. Colors:
   - Yellow: `#FBBF24`
   - Green: `#34D399`
   - Blue: `#60A5FA`
   - Pink: `#F472B6`

8. **Applying a highlight:** Tapping a color circle highlights the selected verse with that color at 15% opacity as a background tint (e.g., `rgba(251, 191, 36, 0.15)` for yellow). The action bar dismisses after the highlight is applied.

9. **Removing a highlight:** If the selected verse is already highlighted in a given color and the user taps that same color again, the highlight is removed. Tapping a different color switches the highlight to the new color.

10. **Highlight persistence:** Highlights are stored in a `wr_bible_highlights` localStorage key as a JSON array of objects:
    ```
    { book: string, chapter: number, verseNumber: number, color: string, createdAt: string }
    ```
    - Maximum 500 highlights stored. When the limit is reached, the oldest highlights (by `createdAt`) are pruned to make room.
    - On page load, highlights for the current book/chapter are read from storage and applied to the verse display.

11. **Visual indicator on highlighted verses:** Highlighted verses show their background tint persistently while reading. The highlight color is subtle enough to not interfere with text readability.

### Personal Notes

12. **Note button behavior:** Tapping the Note icon in the action bar opens an inline note editor that appears directly below the selected verse in the reading flow (pushes subsequent verses down).

13. **Note editor UI:**
    - Textarea with placeholder "Add a note about this verse..."
    - 300 character maximum with a live character counter (e.g., "42/300")
    - Two buttons below the textarea: "Save" (primary style) and "Cancel" (text button)
    - Crisis keyword detection via the existing `CrisisBanner` component — if crisis keywords are detected in the note text, the crisis resource banner appears above the Save button
    - Editor styling: `bg-white/5 border border-white/10 rounded-xl p-3` — consistent with the reading view's dark theme
    - The action bar dismisses when the note editor opens

14. **Editing an existing note:** If the verse already has a note, tapping the Note icon opens the editor pre-filled with the existing note text. The Save button updates the note (sets `updatedAt`).

15. **Note persistence:** Notes are stored in a `wr_bible_notes` localStorage key as a JSON array of objects:
    ```
    { id: string, book: string, chapter: number, verseNumber: number, text: string, createdAt: string, updatedAt: string }
    ```
    - `id` is a UUID (generated via `crypto.randomUUID()`)
    - Maximum 200 notes stored. When the limit is reached, show a toast: "Note limit reached. Delete an existing note to add a new one." (do NOT silently prune notes — notes contain user-written content and should never be deleted without explicit action).

16. **Note indicator on verses:** Verses that have a saved note show a small `StickyNote` icon (Lucide) after the verse number, styled `text-amber-400/50` (unobtrusive amber tint). The icon is 14px.

17. **Expanding a note:** Tapping the note indicator icon on a verse expands the note text inline below the verse (same position as the editor, but in read-only display mode). The expanded note shows:
    - The note text in `text-white/70 text-sm`
    - An "Edit" button (Lucide `Pencil` icon) and a "Delete" button (Lucide `Trash2` icon), both small and muted
    - Tapping outside the expanded note collapses it

18. **Deleting a note:** Tapping Delete shows a brief confirmation: "Delete this note?" with "Delete" and "Cancel" buttons. Confirming removes the note from storage and removes the note indicator icon from the verse.

### Verse Sharing

19. **Copy button behavior:** Tapping the Copy icon in the action bar copies the verse text and reference to the clipboard in the format: `"[verse text]" — [Book] [Chapter]:[Verse] WEB`. Example: `"For God so loved the world..." — John 3:16 WEB`. A "Copied!" toast appears (using the existing toast system). The action bar dismisses after copy.

20. **Share button behavior:** Tapping the Share icon in the action bar opens the same share panel pattern used by the Verse of the Day feature (the `VerseSharePanel` component pattern). The panel has three options:
    - **Copy verse** — same as the Copy button behavior
    - **Share as image** — generates a canvas image card and triggers Web Share API on mobile or download on desktop
    - **Download image** — always triggers a PNG download

21. **Share image card:** Uses the same dark purple gradient card template as the Verse of the Day share image (via the existing `generateVerseImage` utility or an adapted version). The reference on the card includes the verse number (e.g., "John 3:16 WEB" not just "John 3:16"). Canvas dimensions: 400x600px. Background gradient: `#0D0620` → `#1E0B3E` → `#4A1D96`. Verse text in white Lora font, auto-sized. Reference below in `rgba(255,255,255,0.5)`. "Worship Room" watermark in Caveat at bottom, `rgba(255,255,255,0.3)`.

22. **Share panel positioning:** The share panel appears near the action bar (below on desktop, above on mobile if space allows). Uses the same frosted glass dropdown styling: `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2`. Dismisses on click outside or Escape.

### "My Highlights & Notes" Section on Browser Page

23. **Location:** Below the book listing (accordion) on the `/bible` browser page. Only visible for logged-in users who have at least one highlight or note saved.

24. **Section heading:** "My Highlights & Notes" with a small count badge (e.g., "12 items").

25. **Feed layout:** A chronological list (newest first) of recent highlights and notes across all books. Each entry shows:
    - The verse text (truncated to 2 lines with ellipsis if long)
    - The full reference (e.g., "Genesis 1:1")
    - For highlights: a small colored dot matching the highlight color
    - For notes: a preview of the note text (truncated to 1 line)
    - A clickable link/tap target that navigates to `/bible/:bookSlug/:chapter#verse-:verseNumber` to jump to that verse in context

26. **Feed limit:** Shows the 20 most recent items by default. If more than 20 exist, show a "Show more" button that reveals the next 20 (progressive disclosure, not pagination).

27. **Empty state:** This section simply does not render if the user has no highlights or notes. No explicit empty state message needed.

28. **Interleaving:** Highlights and notes are merged into a single chronological feed sorted by `createdAt` descending. If a verse has both a highlight and a note, they appear as separate entries.

---

## Auth & Persistence

### Auth Gating Per Interactive Element

| Element | Logged-out behavior | Logged-in behavior | Auth modal message |
|---------|--------------------|--------------------|-------------------|
| Read chapter text | Full access | Full access | — |
| Tap a verse (action bar) | Action bar appears with lock message + Copy only | Full action bar (Highlight, Note, Copy, Share) | — |
| Highlight a verse | Not available (lock message shown) | Full color picker, highlight applied | "Sign in to highlight verses" |
| Add/edit a note | Not available (lock message shown) | Note editor opens | "Sign in to take notes" |
| Copy a verse | Works without login | Works | — |
| Share a verse (image) | Not available (lock message shown) | Share panel opens | "Sign in to share verses" |
| "My Highlights & Notes" section | Not visible | Visible if highlights/notes exist | — |
| Note indicator icons on verses | Not visible (no data) | Visible for verses with notes | — |
| Highlight backgrounds on verses | Not visible (no data) | Visible for highlighted verses | — |

### Persistence

- **`wr_bible_highlights`** (NEW): JSON array of highlight objects. Written only for logged-in users. Read on page load to apply highlights. Max 500 entries, oldest pruned.
- **`wr_bible_notes`** (NEW): JSON array of note objects. Written only for logged-in users. Read on page load to show note indicators. Max 200 entries, hard limit (no pruning — user must delete).
- **Logged-out users:** Zero persistence for annotations. Can copy verses (clipboard only, no storage). Can read everything.
- **Route type:** Public. Both `/bible` and `/bible/:book/:chapter` remain public routes. Auth gating is per-interaction, not per-route.

### Storage Service Pattern

Both storage services follow existing Worship Room patterns:
- Pure functions for read/write (no class instances)
- `wr_` prefix for all localStorage keys
- `try-catch` for corrupted JSON recovery (return empty array `[]` on parse error)
- Typed TypeScript interfaces for all stored objects
- No side effects on read operations

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the note editor accepts free-form user text input. Crisis keyword detection via `CrisisBanner` is required on the note textarea, using the same pattern as the Pray tab and Journal tab.
- **User input involved?**: Yes — personal notes (300 char max). Text is stored in localStorage only (no backend in this phase).
- **AI-generated content?**: No. All displayed content is either curated Bible text (WEB translation) or user-written notes.
- **Content moderation**: Not needed for localStorage-only notes (private to the user's device). Backend moderation will be required when notes sync to the server in Phase 3+.
- **Theological boundaries**: No interpretive content added in this spec. Notes are the user's own words, not AI commentary.

---

## UX & Design Notes

### Emotional Tone

Highlighting and notes should feel like marking up a personal Bible — quiet, intimate, and mine. The color highlights are soft tints, not bold markers. The note editor is small and focused, not a distraction from the reading flow. The "My Highlights & Notes" section is a personal library, not a social feed. Everything reinforces the sense that this is your private space with God's Word.

### Visual Design — Floating Action Bar

- Frosted glass pill: `bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2 py-1`
- Icon buttons: 20px Lucide icons in `text-white/70 hover:text-white` with `min-h-[44px] min-w-[44px]` touch targets (padding around the icons)
- Color picker circles: 24px diameter, `border-2 border-white/40`, the fill color is the highlight color at full opacity. Active/selected color shows a checkmark overlay or thicker border.
- Fade-in: 150ms opacity transition
- Portal-rendered to avoid overflow clipping from the reading view container

### Visual Design — Note Editor

- Container: `bg-white/5 border border-white/10 rounded-xl p-3 mt-2 mb-2`
- Textarea: `bg-white/5 border border-white/10 rounded-lg p-3 text-white/90 text-sm placeholder:text-white/30 w-full resize-none` with focus ring `focus:ring-2 focus:ring-primary/50 focus:border-primary/50`
- Character counter: `text-xs text-white/30` aligned right below textarea. Turns `text-danger` when within 20 characters of limit.
- Save button: small primary button style (existing pattern)
- Cancel button: `text-sm text-white/40 hover:text-white/60`
- CrisisBanner: renders above Save button if crisis keywords detected

### Visual Design — Note Indicator

- `StickyNote` icon (Lucide) at 14px, `text-amber-400/50`, positioned after the verse number superscript
- On hover/tap: icon brightens to `text-amber-400/80`
- Expanded note: `bg-white/5 border border-white/10 rounded-lg p-3 mt-1 mb-2`
- Note text: `text-white/70 text-sm leading-relaxed`
- Edit/Delete buttons: `text-xs text-white/30 hover:text-white/50`

### Visual Design — My Highlights & Notes Section

- Section heading: `text-xl font-semibold text-white` with count badge in `text-white/40 text-sm`
- Card per entry: `bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors cursor-pointer`
- Verse text: `font-serif text-white/80 text-sm line-clamp-2`
- Reference: `text-xs text-white/40`
- Highlight color dot: 8px circle with the highlight color
- Note preview: `text-xs text-white/50 line-clamp-1 italic`
- "Show more" button: `text-sm text-primary hover:text-primary-lt`

### Design System Recon References

- **Frosted glass card pattern:** Design system recon — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- **Share panel pattern:** Existing `VerseSharePanel` component — `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2` with `role="menu"` keyboard navigation
- **Share image card:** Existing `generateVerseImage` utility — 400x600px canvas with dark purple gradient, Lora verse text, Caveat watermark
- **Toast system:** Existing `useToast()` hook — "Copied!" success toast pattern
- **Crisis banner:** Existing `CrisisBanner` component — crisis keyword detection on user text input
- **Positioning pattern:** Similar to `TooltipCallout` component — `getBoundingClientRect()` positioning with viewport clamping and mobile-aware placement

### New Visual Patterns

1. **Floating action bar:** Compact horizontal pill with icon buttons, positioned relative to a selected element using `getBoundingClientRect()`. Similar to `TooltipCallout` but interactive (buttons, not just text). Portal-rendered.
2. **Inline note editor:** A small editor that inserts into the reading flow below a verse, pushing content down. New pattern — existing editors (Journal, Prayer Wall) are at the top of the page, not inline between content items.
3. **Color picker circles:** Small colored circles for highlight color selection. New sub-pattern within the action bar.
4. **Verse highlight tinting:** Subtle background color on individual verse elements. New pattern — existing verse highlighting (`bg-primary/10` fade-out from Spec 1) is temporary; this is persistent.

---

## Responsive Behavior

### Mobile (< 640px)

- **Action bar:** Appears **below** the selected verse (not above) to avoid being hidden under the user's thumb. Full-width minus 16px side margins if the bar would overflow. Color picker circles appear in a row below the icon buttons (stacked layout if needed).
- **Note editor:** Full-width within the reading column. Textarea occupies full width. Save/Cancel buttons side by side at full width.
- **Note indicator:** Same positioning (after verse number). Tap expands the note below.
- **Share panel:** Full-width at bottom of viewport or near the action bar. Each row meets 44px touch target.
- **My Highlights & Notes:** Full-width cards. Feed entries stack vertically with comfortable spacing.

### Tablet (640px - 1024px)

- **Action bar:** Appears **above** the selected verse, centered. Standard sizing.
- **Note editor:** Width matches the reading column (`max-w-2xl`).
- **Share panel:** Popover near the Share button. Standard sizing.
- **My Highlights & Notes:** Cards in the centered browser layout within `max-w-4xl`.

### Desktop (> 1024px)

- **Action bar:** Appears **above** the selected verse, centered. Standard sizing.
- **Note editor:** Width matches the reading column (`max-w-2xl`).
- **Share panel:** Small popover dropdown near the Share button.
- **My Highlights & Notes:** Cards in the centered browser layout within `max-w-4xl`.

---

## Edge Cases

- **Very long verses (wrapping multiple lines):** The action bar centers above/below the full verse element, not just the first line. `getBoundingClientRect()` captures the full element height.
- **Verse near top of viewport:** If the action bar would be above the viewport when positioned above the verse, flip to below. On mobile, it's always below.
- **Verse near bottom of viewport:** If the action bar would be below the viewport, flip to above. Clamped to viewport bounds.
- **Multiple rapid verse taps:** Only one action bar shown at a time. Tapping a new verse dismisses the previous bar and shows a new one.
- **Note editor open + tap another verse:** Prompt "Discard unsaved changes?" if the note has been edited but not saved. "Discard" and "Keep editing" buttons.
- **Highlight on a verse that already has a different color:** The new color replaces the old one. Only one highlight color per verse.
- **500 highlight limit reached:** Oldest highlights are silently pruned. The user is not notified (highlight creation is a casual action, and pruning the oldest is unlikely to be noticed).
- **200 note limit reached:** Toast notification: "Note limit reached. Delete an existing note to add a new one." The Save button is disabled.
- **Corrupted `wr_bible_highlights` or `wr_bible_notes`:** Storage service recovers gracefully — return empty array `[]` on JSON parse error. User loses their annotations but the app doesn't crash.
- **Verse with both highlight and note:** Both are displayed — the highlight background tint is visible, and the note indicator icon appears. Both appear as separate entries in the "My Highlights & Notes" feed.
- **Navigating away from chapter with unsaved note:** Same unsaved-changes prompt as tapping another verse.
- **Copy on a verse with no text content (placeholder book):** Copy is disabled on placeholder chapters (books without full text). The action bar does not appear on placeholder content.
- **Share image with very long verse:** Font auto-sizes on the canvas (same logic as existing `generateVerseImage`). Very long verses get smaller font to fit.
- **Touch vs. click:** On touch devices, `touchend` triggers verse selection. On desktop, `click`. Ensure no double-firing.
- **Scrolling while action bar is open:** Action bar should reposition if the user scrolls, or dismiss on scroll (dismiss is simpler and preferred).

---

## Out of Scope

- **Backend API for highlights/notes sync:** Entirely frontend/localStorage. Server sync is Phase 3+.
- **AI-powered verse explanations:** Spec 3 — "Explain this verse" AI feature.
- **Cross-references:** Spec 3 — linking related verses.
- **Reading plans integration:** Spec 3 — deep linking from reading plans to the Bible reader.
- **Multi-verse selection:** Only single-verse selection in this spec. Highlighting a passage (multiple verses at once) is future work.
- **Highlight/note search:** No search within highlights or notes. Future enhancement.
- **Export highlights/notes:** No export to PDF, CSV, or other formats. Future enhancement.
- **Highlight/note sharing with friends:** Annotations are private. Social sharing of annotations is future work.
- **Gamification integration:** No faith points for highlighting or note-taking. May come in a future spec.
- **Note formatting:** Plain text only. No rich text, no markdown in notes.
- **Audio Bible:** TTS for Bible chapters is deferred.
- **Multiple translations:** Only WEB for now.
- **Annotation categories/tags:** No tagging or categorizing highlights or notes beyond the highlight color.

---

## Acceptance Criteria

### Floating Action Bar

- [ ] Tapping/clicking a verse in the reading view shows a floating action bar
- [ ] Action bar is a horizontal pill with 4 icon buttons: Highlight, Note, Copy, Share
- [ ] Action bar uses frosted glass styling: `bg-white/15 backdrop-blur-md border border-white/20 rounded-full`
- [ ] Action bar appears with a 150ms fade-in animation
- [ ] Animation respects `prefers-reduced-motion` (instant show)
- [ ] On desktop/tablet: action bar appears **above** the selected verse
- [ ] On mobile (< 640px): action bar appears **below** the selected verse
- [ ] Action bar is clamped to viewport bounds (never overflows any edge, min 8px margin)
- [ ] Action bar is rendered via portal (not clipped by parent overflow)
- [ ] Tapping outside dismisses the action bar
- [ ] Pressing Escape dismisses the action bar
- [ ] Only one action bar visible at a time (selecting a new verse replaces it)
- [ ] Action bar dismisses on scroll
- [ ] All icon buttons meet 44px minimum touch target

### Logged-Out Action Bar

- [ ] Logged-out users see a lock icon and "Sign in to highlight and take notes" message instead of Highlight/Note/Share buttons
- [ ] Copy button remains functional for logged-out users
- [ ] Tapping the lock message area does NOT trigger the auth modal (it's informational only)
- [ ] No highlights or note indicators are visible for logged-out users (no data)

### Verse Highlighting

- [ ] Tapping the Highlight icon reveals 4 color circles: yellow (#FBBF24), green (#34D399), blue (#60A5FA), pink (#F472B6)
- [ ] Color circles are 24px diameter with white border
- [ ] Tapping a color highlights the verse with that color at 15% opacity background
- [ ] Tapping the same color on an already-highlighted verse removes the highlight
- [ ] Tapping a different color on an already-highlighted verse switches to the new color
- [ ] Highlights persist in `wr_bible_highlights` localStorage key
- [ ] Highlights are restored on page load for the current chapter
- [ ] Maximum 500 highlights stored; oldest pruned when limit reached
- [ ] Highlight storage uses typed interface with `book`, `chapter`, `verseNumber`, `color`, `createdAt`
- [ ] Corrupted JSON in `wr_bible_highlights` recovers gracefully (returns empty array)
- [ ] Highlighted verses are readable (color tint does not interfere with text contrast)

### Personal Notes

- [ ] Tapping the Note icon opens an inline editor below the selected verse
- [ ] Editor has a textarea with placeholder "Add a note about this verse..."
- [ ] Textarea has 300 character maximum with live character counter
- [ ] Character counter turns red (`text-danger`) within 20 characters of limit
- [ ] Crisis keyword detection fires on note text (CrisisBanner appears if triggered)
- [ ] CrisisBanner appears above the Save button
- [ ] Save and Cancel buttons are present below the textarea
- [ ] Saving stores note in `wr_bible_notes` localStorage key with UUID, book, chapter, verseNumber, text, createdAt, updatedAt
- [ ] Existing note pre-fills the editor when the Note icon is tapped
- [ ] Maximum 200 notes; Save is disabled with toast when limit reached
- [ ] Verses with notes show a small `StickyNote` icon (14px, `text-amber-400/50`) after the verse number
- [ ] Tapping the note indicator expands the note inline below the verse
- [ ] Expanded note shows Edit and Delete buttons
- [ ] Delete shows a confirmation prompt before removing the note
- [ ] Corrupted JSON in `wr_bible_notes` recovers gracefully (returns empty array)

### Verse Sharing

- [ ] Tapping Copy copies `"[verse text]" — [Book] [Chapter]:[Verse] WEB` to clipboard
- [ ] "Copied!" toast appears after successful copy (existing toast system)
- [ ] Action bar dismisses after copy
- [ ] Tapping Share opens a share panel with Copy verse, Share as image, and Download image options
- [ ] Share panel uses `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2` styling
- [ ] Share panel has keyboard navigation (Arrow keys, Escape to close)
- [ ] Share panel dismisses on click outside or Escape
- [ ] "Share as image" generates a 400x600px PNG with dark purple gradient
- [ ] Share image includes verse text in white Lora font, reference with verse number + "WEB", and "Worship Room" watermark in Caveat
- [ ] On mobile with Web Share API: triggers `navigator.share({ files: [png] })`
- [ ] On desktop or without Web Share API: triggers PNG download
- [ ] "Download image" always triggers PNG download
- [ ] PNG filename follows format: `worship-room-verse-YYYY-MM-DD.png`
- [ ] Copy works for logged-out users; Share (image) requires login

### My Highlights & Notes Section

- [ ] Section appears below the book listing on `/bible` browser page
- [ ] Section heading is "My Highlights & Notes" with item count badge
- [ ] Only visible for logged-in users with at least 1 highlight or note
- [ ] Not visible for logged-out users
- [ ] Feed shows chronological list (newest first) of highlights and notes
- [ ] Each entry shows verse text (truncated to 2 lines), reference, and highlight color dot or note preview
- [ ] Entries are clickable and navigate to `/bible/:bookSlug/:chapter#verse-:verseNumber`
- [ ] Shows 20 items by default with "Show more" button if more exist
- [ ] Highlights and notes are interleaved chronologically (not separated by type)
- [ ] A verse with both a highlight and a note appears as two separate entries

### Unsaved Changes Protection

- [ ] Navigating away from a chapter with an unsaved note shows "Discard unsaved changes?" prompt
- [ ] Tapping another verse while a note editor is open with unsaved changes shows the same prompt
- [ ] "Discard" closes the editor without saving; "Keep editing" returns to the editor

### Responsive Layout

- [ ] Mobile (375px): Action bar below verse, full-width minus margins; note editor full-width; cards full-width
- [ ] Tablet (768px): Action bar above verse, centered; note editor in `max-w-2xl`; standard layout
- [ ] Desktop (1440px): Action bar above verse, centered; note editor in `max-w-2xl`; standard layout
- [ ] All interactive elements meet 44px minimum touch target on mobile
- [ ] No horizontal overflow at any breakpoint

### Accessibility

- [ ] Action bar buttons have `aria-label` (e.g., "Highlight verse", "Add note", "Copy verse", "Share verse")
- [ ] Color picker circles have `aria-label` (e.g., "Highlight yellow", "Highlight green")
- [ ] Currently selected highlight color is indicated with `aria-pressed="true"`
- [ ] Note editor textarea has associated label or `aria-label`
- [ ] Note editor has visible focus indicators on textarea and buttons
- [ ] Share panel uses `role="menu"` with `role="menuitem"` items and Arrow key navigation
- [ ] Expanded note section uses `aria-expanded` attribute
- [ ] Delete confirmation is keyboard-accessible
- [ ] Action bar is keyboard-accessible (focus moves to first button when opened)
- [ ] Screen reader announces when a highlight is applied or removed
- [ ] Screen reader announces when a note is saved or deleted
- [ ] CrisisBanner uses `role="alert"` with `aria-live="assertive"` (existing behavior)
- [ ] All color choices are distinguishable without relying on color alone (labels in aria, not just visual)

### Visual Verification

- [ ] Floating action bar frosted glass effect is visible against the dark reading background
- [ ] Highlight color tints are subtle (15% opacity) and don't interfere with text readability
- [ ] Note indicator icon is unobtrusive but discoverable (amber tint visible against dark background)
- [ ] Note editor blends into the reading flow without jarring visual contrast
- [ ] Share panel matches existing `VerseSharePanel` styling
- [ ] Generated PNG share image matches the Verse of the Day image card quality and style
- [ ] My Highlights & Notes section uses consistent frosted glass card styling

### No Regressions

- [ ] Existing verse highlight animation (search scroll-to from Spec 1) still works
- [ ] Reading progress tracking (Intersection Observer) still works
- [ ] Chapter navigation (previous/next, chapter selector) still works
- [ ] Cross-feature CTAs at bottom of chapter still work
- [ ] Placeholder for books without full text still works
- [ ] Browser page accordion and search still work
- [ ] Existing `VerseSharePanel` component and `generateVerseImage` utility are unaffected (or cleanly reused)
- [ ] No new routes created (all changes are on existing `/bible` and `/bible/:book/:chapter` routes)
