# BB-4: Reader View Core

**Master Plan Reference:** N/A — standalone spec within the Bible Redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-0 (landing), BB-1 (theme), BB-2 (drawer + book metadata), BB-3 (chapter picker)
**Hands off to:** BB-5 (focus mode), BB-6 (verse tap action sheet), BB-7 (highlights), BB-8 (notes)

---

## Overview

The Bible reader is the spiritual heart of the Bible section — the page where users sit with scripture in stillness. Unlike a search engine or reference tool, this reader should feel like opening a beautiful hardcover in a quiet room with a single beam of light on the page. Three reading themes (Midnight, Parchment, Sepia), generous typography, mobile swipe navigation, and clean verse rendering create a sanctuary for reading. Every interactive feature later in the wave (highlights, notes, action sheets, focus mode) attaches to this page, making the DOM contract and reading experience the most consequential decision in the wave.

## User Story

As a **logged-out visitor or logged-in user**, I want to read any chapter of the Bible in a beautiful, distraction-free reader with customizable typography so that I can engage deeply with scripture in a space that feels peaceful and immersive.

## Recon Targets (run before /plan)

Run `/playwright-recon` against these three competitors before writing the plan. The plan should reference specific patterns observed and explicitly state what Worship Room does differently and why.

- **YouVersion:** `https://www.bible.com/bible/206/JHN.3.WEB`
- **Bible Gateway:** `https://www.biblegateway.com/passage/?search=John+3&version=WEB`
- **ESV.org:** `https://www.esv.org/John+3/`

Capture: verse number rendering, chapter navigation affordances, typography defaults, section headings, footnote markers, long chapter handling (Psalm 119), mobile vs desktop chrome, reading theme toggles.

## Requirements

### Functional Requirements

#### Route and Data Loading

1. Route: `/bible/[book]/[chapter]` (e.g., `/bible/john/3`, `/bible/psalms/119`, `/bible/1-corinthians/13`)
2. Book slugs match `bookMetadata.ts` from BB-2 (lowercase, hyphenated: `1-samuel`, `song-of-solomon`, `1-corinthians`)
3. Chapter is a positive integer; invalid book or chapter renders a 404 error state
4. WEB scripture loads from `src/data/bible/web/[bookSlug].json` via dynamic import (code-split per book)
5. Only the current chapter's verse data is extracted from the loaded book JSON — the full book loads but the reader renders one chapter at a time
6. Data prerequisite confirmed: all 66 WEB JSON files exist in `src/data/bible/web/` (committed on this branch)

#### Reader Layout — Three Zones

**Zone 1: Top Chrome (sticky)**
7. Thin, mostly-transparent sticky header with backdrop blur and gradient fade
8. Left: Back button (arrow icon) — navigates to `/bible` (the books browser)
9. Center: Book and chapter label (e.g., "John 3") — tapping opens the chapter picker for the current book (uses existing BibleDrawer)
10. Right: Aa icon (opens typography sheet) + Books icon (opens books drawer to book list view)
11. Leave space for BB-5 (focus mode toggle) and BB-26 (audio play button) to add icons later
12. Chrome auto-dims to 30% opacity after 4 seconds of no interaction; any touch/mouse/scroll restores full opacity

**Zone 2: Reader Body (the verses)**
13. Centered column, max-width ~65-75 characters per line (reading measure)
14. Chapter heading: book name on line 1, chapter number on line 2, restrained classical treatment (white text, muted accent for the number), thin divider rule below
15. Verses rendered as continuous flowing text (not one-per-line) with paragraph breaks at pericope boundaries when paragraph data is available (falls back to continuous text when `paragraphs` array is empty)
16. Verse numbers as small muted superscript inline in the text flow
17. Each verse wrapped in a `<span>` with `data-verse`, `data-book`, `data-chapter` attributes — this is a **contract** for BB-6/7/8
18. Generous line height (1.7-1.8 in serif themes)
19. Generous top padding so first verse isn't crammed under the sticky chrome
20. Generous bottom padding before the nav footer

**Zone 3: Bottom Chapter Nav Footer**
21. Previous chapter button on left (e.g., "John 2"), next chapter button on right (e.g., "John 4")
22. Crosses book boundaries: Matthew 28 next goes to Mark 1; Revelation 22 next is hidden; Genesis 1 prev is hidden
23. Tapping triggers the same slide-and-fade animation as swipe navigation

#### Typography and Theme Settings Sheet

24. Tapping Aa icon opens a slide-up sheet (bottom sheet on mobile, small floating panel on desktop)
25. **Three reading themes** as preview cards:
    - **Midnight** (default): dark cinematic, white serif text on dark gradient background
    - **Parchment**: warm cream background, dark brown text, no glow orbs
    - **Sepia**: warm tan background, slightly darker brown text, no glow orbs
26. Theme override is **scoped to the reader body only** — top chrome and bottom nav stay in the global dark theme
27. **Type size**: S / M (default) / L / XL — scales verse text; heading scales proportionally
28. **Line height**: Compact / Normal (default) / Relaxed
29. **Font family**: Serif (default, Lora) / Sans (Inter)
30. "Reset to defaults" link at bottom of sheet
31. All settings apply live (no Apply button) and persist in localStorage
32. Sheet closes on backdrop tap, Escape, or X button

#### Chapter Navigation

33. **Tap targets**: center label opens chapter picker; bottom prev/next buttons navigate; Books icon opens drawer
34. **Mobile swipe** (viewports <1024px): swipe left = next chapter, swipe right = previous chapter
35. Swipe threshold: 50% viewport width or fast flick (>0.5 px/ms velocity)
36. Current content tracks finger during swipe; next/prev slides in from edge
37. If swipe doesn't pass threshold, content snaps back
38. Vertical scroll always wins — horizontal swipe only activates within 30 degrees of horizontal
39. **Keyboard shortcuts**: Left/Right arrows for chapter navigation, `,` for typography sheet, `b` for books drawer, Escape to close typography sheet
40. **Reduced motion**: all animations become instant swaps; swipe still works but no visual transition

#### Chapter Change Animation

41. Outgoing chapter slides slightly to the side and fades to 0; incoming slides in from opposite side and fades from 0 to 1
42. Duration ~280ms; instant swap when `prefers-reduced-motion` is set

#### Long Chapter Handling

43. All verses rendered at once (no virtualization — preserves literary flow and Cmd+F search)
44. Verse jump pill: floating bottom-right pill appears on chapters with >40 verses after scrolling past verse 20
45. Pill accepts a verse number input and smooth-scrolls to that verse

#### Stub Interaction Layer

46. Tapping a verse does **nothing** in BB-4 — the data attributes exist but no click handler is attached
47. BB-6 will wire the action sheet onto these spans without modifying BB-4 rendering code
48. A Playwright integration test confirms: every verse span has the three data attributes with correct values, and tapping a verse does not navigate or open anything

#### Read Tracking Stub

49. On successful chapter load, write to localStorage:
    - `wr_bible_last_read` — `{ book, chapter, verse: 1, timestamp }` (aligns with existing key shape from BB-0)
    - `wr_bible_progress` — append chapter to the book's read chapters array (aligns with existing key)
50. Mark these writes with `// TODO BB-17: replace stub` comments for future streak/scroll-position tracking

#### Error States

51. **Invalid book slug**: centered card "That book doesn't exist." + "Browse books" button opening the drawer
52. **Invalid chapter**: "[Book name] only has [N] chapters." + button to jump to last valid chapter + "Browse books" button
53. **Failed data load**: "Couldn't load this chapter. Check your connection." + "Try again" retry button
54. All error states use the global dark theme with glow orbs

### Non-Functional Requirements

- **Performance**: Lighthouse performance >= 90 on John 3; >= 80 on Psalm 119 (176 verses)
- **Accessibility**: Lighthouse accessibility >= 95; all interactive elements keyboard-accessible; 44px minimum touch targets; semantic headings for chapter heading; `aria-label` on all icon buttons; reduced-motion respected throughout
- **No raw hex values**: all colors must use design system tokens

## Auth Gating

**The Bible reader is fully public. No auth gates.**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Read any chapter | Full access | Full access | N/A |
| Change typography settings | Full access, persists in localStorage | Full access, persists in localStorage | N/A |
| Navigate chapters (swipe, keyboard, buttons) | Full access | Full access | N/A |
| Open books drawer / chapter picker | Full access | Full access | N/A |
| Use verse jump pill | Full access | Full access | N/A |

Read tracking writes (`wr_bible_last_read`, `wr_bible_progress`) happen for all users since they use localStorage, not server persistence. BB-17 may add auth-gating to streak tracking later.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Full-width reader body with `px-5` horizontal padding. Top chrome compact (smaller label font). Typography sheet slides up as bottom sheet (full-width). Swipe navigation enabled. Chapter nav buttons full-width stacked or side-by-side with smaller text. Verse jump pill 44px touch target. |
| Tablet (640-1024px) | Reader body centered with `max-w-2xl`. Top chrome standard size. Typography sheet as bottom sheet. Swipe navigation enabled. Chapter nav buttons standard row layout. |
| Desktop (> 1024px) | Reader body centered with `max-w-2xl`. Top chrome full. Typography sheet as small floating panel anchored near the Aa icon. **No swipe navigation** (swipe is mobile/tablet only). Chapter nav buttons with generous spacing. |

**Mobile-specific interactions:**
- Horizontal swipe for chapter navigation (only on viewports <1024px)
- Bottom sheet for typography settings (not floating panel)
- Touch targets minimum 44px on all icon buttons and nav buttons

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Full reading access. Typography settings persist in localStorage. Read tracking writes to localStorage.
- **Logged-in users:** Same behavior. Phase 3 will sync read progress to server.
- **Route type:** Public
- **localStorage keys:**

| Key | Type | Purpose |
|-----|------|---------|
| `wr_bible_reader_theme` | `'midnight' \| 'parchment' \| 'sepia'` | Reading theme selection (default: midnight) |
| `wr_bible_reader_type_size` | `'s' \| 'm' \| 'l' \| 'xl'` | Type size preference (default: m) |
| `wr_bible_reader_line_height` | `'compact' \| 'normal' \| 'relaxed'` | Line height preference (default: normal) |
| `wr_bible_reader_font_family` | `'serif' \| 'sans'` | Font family preference (default: serif) |
| `wr_bible_last_read` | `{ book: string, chapter: number, verse: number, timestamp: number }` | **Existing key** — BB-4 stub writes `verse: 1` on chapter load |
| `wr_bible_progress` | `{ [book: string]: number[] }` | **Existing key** — BB-4 appends chapter number on load |

**Note:** The spec input used `bible:*` key names. These have been normalized to the project's `wr_*` convention to align with the canonical key inventory in `11-local-storage-keys.md`. Four new keys are introduced (`wr_bible_reader_theme`, `wr_bible_reader_type_size`, `wr_bible_reader_line_height`, `wr_bible_reader_font_family`). Two existing keys are written to (`wr_bible_last_read`, `wr_bible_progress`).

## Completion & Navigation

N/A — The Bible reader is a standalone page, not part of the Daily Hub tabbed experience. No completion tracking signal is needed (BB-17 will add reading streak logic later).

## Design Notes

### Existing Components to Reuse
- **BibleDrawer** — the existing books/chapter picker drawer (from BB-2/BB-3)
- **BibleDrawerProvider** — provides `open`/`close`/`toggle` for the drawer
- **BOOK_METADATA** from `bookMetadata.ts` — canonical book slugs, names, chapter counts, testaments
- **Lora** (serif) and **Inter** (sans) from the design system typography
- Use the existing `useFocusTrap` hook for the typography settings sheet
- Use the existing `FrostedCard` component pattern for error state cards
- Design system color tokens: `hero-bg` (#08051A), `hero-dark` (#0D0620), `hero-mid` (#1E0B3E), `primary` (#6D28D9), `primary-lt` (#8B5CF6)

### New Visual Patterns (flagged for /plan)

1. **Reader top chrome** — NEW: sticky transparent header with backdrop blur, gradient fade-out at bottom edge, auto-dim behavior (30% opacity after 4s). No existing equivalent in the app.
2. **Chapter heading treatment** — NEW: two-line heading (book name + chapter number) styled like a hardcover chapter opening. Restrained, classical, white + muted accent. Not `GRADIENT_TEXT_STYLE` — this is a distinct literary treatment.
3. **Parchment/Sepia theme override** — NEW: reader body-only theme override that doesn't leak into chrome or global dark theme. Requires a scoping strategy (CSS class or data attribute on the reader body container).
4. **Verse superscript rendering** — NEW: inline muted superscript verse numbers within flowing prose text. Not currently used anywhere in the app.
5. **Typography settings sheet** — NEW: bottom sheet (mobile) / floating panel (desktop) with theme preview cards, size buttons, line height buttons, font toggle. Different from AudioDrawer pattern — smaller, lighter, no tab content.
6. **Swipe chapter navigation** — NEW: touch gesture handler with finger-tracking content displacement, velocity detection, and angle threshold. No existing swipe pattern in the app.
7. **Verse jump pill** — NEW: floating bottom-right pill with verse number input, only visible on long chapters. Similar concept to the DailyAmbientPillFAB sticky pattern but with input functionality.

### Visual Direction
- The reader should feel more atmospheric than YouVersion (cluttered), Bible Gateway (dense), or ESV.org (academic)
- "A quiet room with a single beam of light on the page"
- Chapter heading is the signature moment — restraint is the move, don't over-decorate
- Midnight theme maintains the dark cinematic feel of the rest of the app
- Parchment/Sepia themes provide warm alternatives for extended reading sessions

## Out of Scope

- **Verse tap interaction** — BB-6 wires the action sheet onto BB-4's verse spans
- **Highlights** — BB-7
- **Notes** — BB-8
- **Cross-references** — BB-9
- **Share-as-image** — BB-13
- **Deep linking to specific verses** (`/bible/john/3/16`) — BB-38
- **Audio playback** — BB-26
- **Read-along** — BB-44
- **Full focus mode** (beyond basic 4s chrome auto-dim) — BB-5
- **Reading streak logic** — BB-17 (BB-4 only stubs the localStorage writes)
- **Font loading optimization** — separate workstream; assume design system fonts are preloaded
- **Section/pericope headings** — no curated section titles; only paragraph breaks from source data
- **Footnotes** — WEB has very few; if any appear, render as a small superscript marker that does nothing yet
- **Backend API persistence** — Phase 3

## Acceptance Criteria

- [ ] Navigating to `/bible/john/3` renders the reader with all John 3 verses in flowing prose
- [ ] Chapter heading displays "John" on line 1 and "3" on line 2 in the cinematic treatment, with thin divider below
- [ ] Verse numbers render as small muted superscript inline within the text flow (not on separate lines)
- [ ] Each verse `<span>` has `data-verse`, `data-book`, `data-chapter` attributes with correct values (e.g., John 3:16 has `data-verse="16"` `data-book="john"` `data-chapter="3"`)
- [ ] Tapping a verse does nothing — no navigation, no modal, no highlight (BB-4 contract)
- [ ] Top chrome displays back button (left), "John 3" label (center), Aa icon and Books icon (right)
- [ ] Tapping "John 3" label opens the chapter picker for John via the existing BibleDrawer
- [ ] Tapping Books icon opens the BibleDrawer to the book list view
- [ ] Bottom nav footer shows "John 2" on left and "John 4" on right, both navigating correctly
- [ ] Navigating from Matthew 28 next goes to Mark 1 (cross-book boundary)
- [ ] Genesis 1 has no previous chapter button
- [ ] Revelation 22 has no next chapter button
- [ ] On mobile (<1024px), swiping left advances to next chapter; swiping right goes to previous chapter
- [ ] Vertical scrolling on mobile is not accidentally triggered by horizontal swipe gesture (30-degree angle threshold)
- [ ] Keyboard Left/Right arrows navigate chapters; `,` opens typography sheet; `b` opens books drawer; Escape closes typography sheet
- [ ] Tapping Aa icon opens the typography settings sheet
- [ ] Switching to Parchment theme changes only the reader body background and text colors; top chrome and bottom nav remain in dark theme
- [ ] Switching to Sepia theme similarly overrides only the reader body
- [ ] Type size S/M/L/XL all apply live to verse text and persist across page reload (stored in `wr_bible_reader_type_size`)
- [ ] Line height Compact/Normal/Relaxed all apply live and persist (stored in `wr_bible_reader_line_height`)
- [ ] Font family Serif/Sans toggles between Lora and Inter, applies live and persists (stored in `wr_bible_reader_font_family`)
- [ ] "Reset to defaults" returns all settings to Midnight / M / Normal / Serif
- [ ] All settings survive page reload (read from localStorage on mount)
- [ ] Psalm 119 (176 verses) renders completely without crash or visible jank
- [ ] Verse jump pill appears on Psalm 119 after scrolling past verse 20
- [ ] Typing "100" into the verse jump pill and submitting scrolls smoothly to verse 100
- [ ] Verse jump pill does NOT appear on chapters with <= 40 verses (e.g., John 3 with 36 verses)
- [ ] Invalid book slug (e.g., `/bible/notabook/1`) shows "That book doesn't exist." with Browse books button
- [ ] Invalid chapter (e.g., `/bible/john/99`) shows "John only has 21 chapters." with jump-to-last-chapter button
- [ ] Failed data load shows retry state with "Try again" button
- [ ] With `prefers-reduced-motion: reduce`, no swipe animation, no chapter transition animation, no chrome auto-fade
- [ ] Loading John 3 writes `wr_bible_last_read` with `{ book: "john", chapter: 3, verse: 1, timestamp: ... }`
- [ ] Loading John 3 appends `3` to `wr_bible_progress.john` if not already present
- [ ] The "Resume Reading" card on the Bible landing page (`/bible`) reflects the chapter just read
- [ ] Lighthouse accessibility score >= 95 on `/bible/john/3`
- [ ] Lighthouse performance score >= 90 on `/bible/john/3`; >= 80 on `/bible/psalms/119`
- [ ] Zero raw hex color values in any new code — all colors use design system tokens
- [ ] Playwright integration test confirms `data-verse`/`data-book`/`data-chapter` attributes on all verse spans with correct values
- [ ] Top chrome auto-dims to 30% opacity after 4 seconds of no interaction; any touch/mouse/scroll restores full opacity
- [ ] Chapter change animation is a subtle slide-and-fade (~280ms) in both directions

## Data Prerequisite Status

**Confirmed:** All 66 WEB Bible JSON files exist in `src/data/bible/web/` on the `bible-redesign` branch. 1,189 chapters, 31,103 verses, 6.9 MB total. Paragraph data is shipped as `paragraphs: []` for all chapters — the reader should fall back to continuous text rendering (no paragraph breaks) until paragraph data is added in a future pass. Five verses are intentionally blank (WEB critical-text omissions: Luke 17:36, Acts 8:37, 15:34, 24:7, Romans 16:25) — the reader should skip rendering these rather than showing an empty verse marker.

## BibleDrawerProvider Note

The current `BibleDrawerProvider` exposes `{ isOpen, open, close, toggle, triggerRef }` — it does **not** have a `pushView` API or view stack. The spec's original reference to `pushView` for navigating back to a specific drawer view will need to be resolved during the plan phase. Options: extend the provider to accept an initial view state, or simply open the drawer (it defaults to the book list, which the user can then navigate).
