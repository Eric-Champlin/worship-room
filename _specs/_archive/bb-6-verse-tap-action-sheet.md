# BB-6: Verse Tap Action Sheet

**Master Plan Reference:** N/A — standalone feature within the Bible redesign wave
**Branch:** `bible-redesign`
**Depends on:** BB-4 (reader + verse spans), BB-5 (focus mode pause/resume primitive)
**Hands off to:** BB-7 (highlights), BB-7.5 (bookmarks), BB-8 (notes), BB-9 (cross-references), BB-10/11/12 (Daily Hub bridges), BB-13 (share), BB-30 (AI explain), BB-45 (memorize)

---

## Overview

When a user reads scripture, the most meaningful moments happen when a verse speaks to them and they want to *do something* with it — highlight it, pray about it, journal a reflection, share it with a friend. BB-6 ships the single interaction surface that makes all of those actions discoverable and accessible: a slide-up action sheet that appears when any verse is tapped.

This is the foundational interactive spec for the Bible redesign wave. Every future verse-level feature (highlights, notes, bookmarks, Daily Hub bridges, share, AI explain, memorize) plugs into the handler registry and sub-view stack that BB-6 establishes. The spec ships the sheet shell, tap handling with event delegation, multi-verse selection, a sub-view stack, a typed action handler registry with stub handlers for all future actions, and real implementations for Copy and Copy with Reference.

## User Stories

As a **logged-in user** reading the Bible, I want to tap a verse and see every action I can take on it so that I can highlight, note, bookmark, pray, journal, meditate, share, or copy without leaving the reader.

As a **logged-out visitor** reading the Bible, I want to tap a verse and see the same action sheet so that I can copy verse text and discover what actions become available when I sign up.

As a **logged-in user** reading a passage, I want to select a range of verses (e.g., John 3:16–18) and act on the entire range so that I can highlight or copy a full passage, not just one verse at a time.

## Requirements

### Functional Requirements

#### Tap Target & Event Delegation

1. Each verse is rendered as a `<span>` with `data-verse`, `data-book`, `data-chapter` attributes (existing from BB-4)
2. A single event listener on the reader body container handles all verse taps via event delegation — walking up from the tap target to find the nearest verse span
3. A quick tap (pointerdown + pointerup within 300ms, movement < 10px) on verse text or the verse number superscript triggers the action sheet
4. A long-press (500ms hold) also triggers the action sheet — gives mobile users a second mental model
5. Tapping empty space between paragraphs, on the chapter heading, or on non-verse elements does NOT trigger the sheet
6. Text selection (drag across verse text) does NOT trigger the sheet — browser-native text selection wins so users can copy raw text the browser way
7. If the user is in BB-5 focused state when they tap a verse, the chrome restores AND the sheet opens on the same tap (no two-tap penalty — the tap is not consumed by focus mode restoration)

#### Visual Feedback on Tap

8. The tapped verse receives a subtle selection background (~15% accent opacity using a design system token) that persists while the sheet is open
9. On sheet close, the selection highlight fades over 200ms
10. If the verse already has a BB-7 highlight color, the selection indicator is an outline ring instead of a background fill so the user's existing highlight stays visible

#### Multi-Verse Selection

11. **Mobile:** Tap the first verse (sheet opens with single-verse context). While the sheet is open, tapping additional verses extends the selection to include that verse *and every verse between* — e.g., tap verse 16 then tap verse 18 selects 16, 17, 18. Tapping an already-selected verse deselects it and trims the range.
12. **Desktop:** Click a verse (single selection + sheet). Shift+click another verse extends to range. Cmd/Ctrl+click toggles individual verse in selection (snaps to contiguous range if non-adjacent). Drag across verses selects the swept range (only when sheet is already open; initial drag on closed sheet is browser text selection).
13. Selection is always contiguous: `{ book, chapter, startVerse, endVerse }`. The sheet header and all action handlers receive this selection model, not individual verse data.
14. The sheet header updates live when the selection range changes — e.g., "John 3:16" becomes "John 3:16–18"

#### Action Sheet Structure

15. The sheet is a slide-up panel anchored to the bottom of the viewport, reusing or extending the `BibleDrawer` component with a bottom anchor (prefer extending `BibleDrawer` with an `anchor` prop over forking a separate component)
16. **Mobile (< 640px):** full width, height auto-fits content up to 85vh, slides up from bottom edge
17. **Tablet (640–1023px):** 440px wide, centered horizontally, slides up from bottom
18. **Desktop (>= 1024px):** 440px wide, positioned bottom-center of the reader with ~40px margin from the bottom edge, slides up
19. Slide-up animation over 240ms using the design system ease token; backdrop fades to ~30% opacity (lighter than the books drawer to keep the reader more visible)
20. `prefers-reduced-motion`: instant appear, no slide

#### Sheet Layout

**Header:**

21. Selection reference on the left (e.g., "John 3:16–18") in the established heading token (serif or design system heading)
22. A small "copy reference" icon button next to the reference — tap copies "John 3:16–18" to clipboard with brief toast
23. Close button (X icon) on the right
24. Thin divider rule below

**Verse Preview Strip:**

25. A 1–2 line preview of the selected verse text, truncated with ellipsis if long
26. For multi-verse selections: verse numbers inline, total truncated to ~120 characters (e.g., "16 For God so loved the world... 17 For God didn't send his Son...")
27. Muted token color, smaller than body type — purely decorative

**Primary Actions Row:**

28. Horizontal row of 4 large icon buttons with labels underneath (44px minimum tap targets):
    - **Highlight** — paintbrush icon; opens stub color picker sub-view (real implementation in BB-7)
    - **Note** — pencil icon; opens stub note editor sub-view (real implementation in BB-8)
    - **Bookmark** — bookmark icon; toggles bookmark state immediately (real implementation in BB-7.5)
    - **Share** — share icon; opens stub share sub-view (real implementation in BB-13)
29. If a verse is already highlighted, the Highlight icon shows a filled version in the highlight color. Same for bookmark (filled when active).

**Secondary Actions List:**

30. Vertical list of secondary action rows, each with icon, label, optional subtext, and right-chevron:
    - **Pray about this** — "Open in Daily Hub · Pray" (BB-10 stub)
    - **Journal about this** — "Open in Daily Hub · Journal" (BB-11 stub)
    - **Meditate on this** — "Open in Daily Hub · Meditate" (BB-12 stub)
    - **Cross-references** — "See related verses" with optional count badge (BB-9 stub)
    - **Explain this passage** — "Understand the context" (BB-30 stub)
    - **Memorize** — "Add to your deck" (BB-45 stub)
    - **Copy** — "Copy verse text" (real implementation in BB-6)
    - **Copy with reference** — "Copy with 'John 3:16 — WEB'" (real implementation in BB-6)

**Footer:**

31. Small caption: "WEB · Public Domain" — trust signal repeated from landing page

#### Sub-View Stack

32. Same view-stack pattern as BB-3b's drawer: the sheet supports pushing sub-views (color picker, note editor, explain, cross-refs, memorize) on top of the action list
33. Each sub-view has a back button that pops back to the action list without closing the sheet
34. The sheet title updates to reflect the current sub-view (e.g., "Highlight Colors" when the color picker is active)
35. BB-6 ships stub sub-views for: Highlight Color Picker, Note Editor, Explain, Cross-References, Memorize. Each stub displays "This feature ships in BB-X" placeholder text so QA can exercise the navigation.

#### Action Handler Registry

36. All actions route through a typed `VerseActionHandler` interface registered in a single registry file
37. The sheet component reads from the registry and renders whatever is registered — no hardcoded action list in the sheet component itself
38. BB-6 populates the registry with stub handlers for: highlight, bookmark, note, share, pray, journal, meditate, cross-refs, explain, memorize. Future specs replace their stub with a real handler without modifying the sheet.
39. The handler interface shape:
    ```
    VerseSelection: { book, chapter, startVerse, endVerse, verses: Array<{ number, text }> }
    VerseAction: 'highlight' | 'bookmark' | 'note' | 'share' | 'pray' | 'journal' | 'meditate' | 'cross-refs' | 'explain' | 'memorize' | 'copy' | 'copy-with-ref'
    VerseActionHandler: { action, label, icon, isAvailable(selection), getState?(selection), onInvoke(selection, ctx) }
    ```
40. This contract is load-bearing for the entire wave — changing it after BB-6 ships requires coordinating across many specs

#### Real Actions (shipped in BB-6, not stubbed)

41. **Copy:** Copies plain verse text to clipboard (multi-verse: joined with space). Shows "Copied" toast. Closes sheet after ~400ms delay. Uses `navigator.clipboard.writeText` with hidden textarea fallback.
42. **Copy with reference:** Copies verse text with trailing reference: `"...text..." — John 3:16 (WEB)` (multi-verse: `"...text..." — John 3:16–18 (WEB)`). Shows "Copied with reference" toast. Closes sheet after ~400ms delay.

#### Focus Mode Coordination

43. On sheet open, call `pauseFocusMode()` — focus timer stops, focused state (if active) restores to active
44. On sheet close, call `resumeFocusMode()` — timer resets and starts counting from 0
45. If the user is in focused state when they tap a verse, the chrome restores AND the sheet opens on the same tap (the tap handler must not treat the first tap as "just restoring chrome")

#### Dismiss Behavior

46. Sheet closes on: backdrop tap, X button, Escape key, swipe down (80px threshold or fast flick), browser back if at root view
47. On close: selection clears, selection highlight fades over 200ms, any open sub-view pops, focus mode resumes, focus returns to the tapped verse span

### Non-Functional Requirements

- **Performance:** Event delegation (one listener on reader body, not N listeners on N verse spans)
- **Accessibility:** WCAG AA. `role="dialog"`, `aria-modal="true"`, `aria-label="Actions for [reference]"`. Focus moves into sheet on open (to first primary action). Focus trap inside sheet. Focus returns to tapped verse on close. All tap targets 44px minimum. Sub-view navigation announced to screen readers. Selected verse range announced when multi-verse selection extends.
- **Animation:** 240ms slide-up with design system ease token. `prefers-reduced-motion`: instant appear/disappear.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Tap verse to open sheet | Sheet opens normally | Sheet opens normally | N/A |
| Copy | Works — copies to clipboard | Works — copies to clipboard | N/A |
| Copy with reference | Works — copies to clipboard | Works — copies to clipboard | N/A |
| Highlight (stub) | Shows stub sub-view (BB-7 will add auth gate) | Shows stub sub-view | N/A (BB-7 decides) |
| Note (stub) | Shows stub sub-view (BB-8 will add auth gate) | Shows stub sub-view | N/A (BB-8 decides) |
| Bookmark (stub) | Fires stub handler (BB-7.5 will add auth gate) | Fires stub handler | N/A (BB-7.5 decides) |
| Share (stub) | Shows stub sub-view (BB-13 will add auth gate) | Shows stub sub-view | N/A (BB-13 decides) |
| Pray about this (stub) | Fires stub handler (BB-10 will add auth gate) | Fires stub handler | N/A (BB-10 decides) |
| Journal about this (stub) | Fires stub handler (BB-11 will add auth gate) | Fires stub handler | N/A (BB-11 decides) |
| Meditate on this (stub) | Fires stub handler (BB-12 will add auth gate) | Fires stub handler | N/A (BB-12 decides) |
| Cross-references (stub) | Shows stub sub-view | Shows stub sub-view | N/A |
| Explain (stub) | Shows stub sub-view (BB-30 will add auth gate) | Shows stub sub-view | N/A (BB-30 decides) |
| Memorize (stub) | Shows stub sub-view (BB-45 will add auth gate) | Shows stub sub-view | N/A (BB-45 decides) |

**Key principle:** BB-6 does not add auth gates to stub actions. Each future spec owns its own auth gating decision. The sheet itself is always accessible to all users — Copy and Copy with reference work without login.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Full-width sheet, slides up from bottom, max height 85vh, auto-fits content. Swipe-down to dismiss. Multi-verse selection via sequential taps. |
| Tablet (640–1023px) | 440px wide, centered, slides up from bottom. Same gesture model as mobile. |
| Desktop (>= 1024px) | 440px wide, bottom-center of reader with ~40px bottom margin. Shift+click for range selection, Cmd/Ctrl+click for toggle. |

Primary actions row: 4 icons in a single row at all breakpoints (icons are large enough at 44px minimum). Secondary actions list: full-width vertical list at all breakpoints. Verse preview strip: 1–2 lines with ellipsis truncation, same at all breakpoints.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. (The "Explain this passage" action will involve AI in BB-30 — that spec will address AI safety.)

## Auth & Persistence

- **Logged-out users:** Sheet opens, Copy/Copy with Reference work. All stub actions fire without errors. No data is persisted — zero-persistence rule applies.
- **Logged-in users:** Same behavior in BB-6. Future specs (BB-7, BB-8, etc.) will add persistence for highlights, notes, bookmarks via localStorage.
- **localStorage usage:** None in BB-6. Future specs will introduce keys for highlights (`wr_bible_highlights` — already exists), notes (`wr_bible_notes` — already exists), bookmarks.
- **Route type:** Public (the Bible reader is public)

## Completion & Navigation

N/A — standalone reader interaction, not a Daily Hub tab feature. The "Pray about this" / "Journal about this" / "Meditate on this" actions will navigate to the Daily Hub in their respective specs (BB-10/11/12).

## Design Notes

- **Sheet visual language:** Same design family as `BibleDrawer.tsx` — frosted glass background, design system border tokens, consistent animation timing. The sheet is the drawer's bottom-anchored cousin.
- **FrostedCard tier:** The sheet itself uses frosted glass treatment matching the books drawer (not a FrostedCard component — it's a full modal surface). Sub-views and action list items use the standard dark theme styling.
- **Action icons:** Lucide React icons throughout (Paintbrush, PenLine, Bookmark, Share2, Heart, BookOpen, Sparkles, Link2, Brain, Layers, Copy, ClipboardCopy). Use filled variants for active states (BookmarkCheck when bookmarked, etc.).
- **Toast:** Use the existing `useToast()` hook for copy confirmation toasts.
- **Text colors:** All text inside the sheet uses `text-white` for primary content, muted tokens for secondary content (verse preview strip). No raw hex values — use design system tokens.
- **Backdrop:** 30% opacity backdrop (lighter than the books drawer's backdrop to keep the reader more visible while the sheet is open).
- **Design system recon:** `_plans/recon/design-system.md` exists and should be referenced during planning for exact CSS values (frosted glass treatment, border tokens, animation timing).

### New Visual Patterns

1. **Bottom-anchored sheet:** The books drawer slides from the right; this sheet slides from the bottom. If `BibleDrawer` is extended with an `anchor` prop, this establishes a reusable bottom-sheet pattern. **[NEW — mark values UNVERIFIED during planning]**
2. **Verse selection highlight:** ~15% accent opacity background on selected verses, with outline ring fallback when a highlight color is already present. **[NEW]**
3. **Primary actions row:** Horizontal 4-icon row with labels below — distinct from the secondary vertical list. **[NEW]**

## Keyboard Support

- `Escape` — close sheet (or pop sub-view if in one)
- `1` / `2` / `3` / `4` — activate primary actions (highlight/note/bookmark/share) — power-user shortcut, not visually advertised
- `Tab` — cycle through actions in order
- `Enter` / `Space` — activate focused action
- Arrow keys (up/down) — navigate secondary action list
- `c` — copy (same as Copy action)

## Out of Scope

- **No real highlights** — BB-7 ships the color picker and persistence
- **No real notes** — BB-8
- **No real bookmarks** — BB-7.5
- **No real share** — BB-13
- **No real Daily Hub bridges** — BB-10/11/12
- **No real cross-references** — BB-9
- **No real AI explain** — BB-30
- **No real memorize** — BB-45
- **No multi-paragraph browser-native text selection for copy** — BB-6's copy is verse-scoped; browser native selection still works independently
- **No "define this word" or "look up in lexicon"** — out of scope permanently (wrong audience)
- **No swipe-up to expand sheet to full screen** — the sheet stays a sheet; sub-views grow within constraints
- **No drag-to-reorder actions** — action order is fixed in the registry
- **No auth gating on stub actions** — each future spec owns its own auth decision
- **Backend/API work** — Phase 3+

## Acceptance Criteria

- [ ] Tapping a verse in the reader opens the action sheet anchored to the bottom of the viewport
- [ ] Tapping a verse number superscript triggers the sheet (same as tapping verse text)
- [ ] Tapping empty space between paragraphs or on the chapter heading does NOT trigger the sheet
- [ ] Text selection (dragging across verse text) does NOT trigger the sheet
- [ ] Event delegation is used (one listener on reader body, not N listeners on N verse spans)
- [ ] The sheet header shows the correct formatted reference (e.g., "John 3:16")
- [ ] The verse preview strip shows the selected verse text, truncated with ellipsis if longer than ~120 characters
- [ ] The primary actions row shows 4 large icon buttons: Highlight, Note, Bookmark, Share (all 44px minimum tap targets)
- [ ] The secondary actions list shows 8 items: Pray, Journal, Meditate, Cross-references, Explain, Memorize, Copy, Copy with reference
- [ ] Tapping Copy copies plain verse text to clipboard and shows a "Copied" toast
- [ ] Tapping Copy with reference copies verse text with "— John 3:16 (WEB)" appended and shows a "Copied with reference" toast
- [ ] Multi-verse Copy joins verse texts with a space; Copy with reference uses the range format "John 3:16–18 (WEB)"
- [ ] Tapping Highlight pushes the stub color picker sub-view with a back button
- [ ] Tapping Note pushes the stub note editor sub-view with a back button
- [ ] Back button in sub-views returns to the action list without closing the sheet
- [ ] Stub handlers for all 10 stubbed actions (highlight, bookmark, note, share, pray, journal, meditate, cross-refs, explain, memorize) fire without errors
- [ ] Stub sub-views display placeholder text indicating which BB-X spec will implement the feature
- [ ] Multi-verse selection on mobile: tap verse A while sheet is open, then tap verse B — selects the contiguous range [A, B] and header updates
- [ ] Multi-verse selection on desktop: Shift+click extends selection to range
- [ ] Selected verse(s) show a visual selection background (~15% accent opacity) while the sheet is open
- [ ] If a verse is already highlighted (BB-7), the selection indicator is an outline ring instead of a background fill
- [ ] Selection highlight fades over 200ms on sheet close
- [ ] Tapping the backdrop closes the sheet
- [ ] Escape key closes the sheet (or pops sub-view first if in one)
- [ ] Swipe down on the sheet closes it (80px threshold or fast flick)
- [ ] X button closes the sheet
- [ ] On sheet open, focus mode is paused; on close, focus mode resumes and timer resets
- [ ] Tapping a verse while in focused state restores chrome AND opens the sheet on the same tap (no two-tap penalty)
- [ ] Focus moves into the sheet on open (to first primary action) and returns to the tapped verse on close
- [ ] Focus is trapped inside the sheet while open
- [ ] Sheet has `role="dialog"` and `aria-modal="true"` with `aria-label="Actions for [reference]"`
- [ ] Sheet animation (240ms slide-up) respects `prefers-reduced-motion` (instant appear when reduced motion is preferred)
- [ ] Mobile: sheet is full-width, height fits content up to 85vh
- [ ] Desktop: sheet is 440px wide, positioned bottom-center with ~40px margin
- [ ] All action handlers are registered through the `verseActions/registry` — no hardcoded action list in the sheet component
- [ ] "WEB · Public Domain" footer caption is visible at the bottom of the sheet
- [ ] Zero raw hex values in the implementation — all colors use design system tokens
- [ ] Lighthouse accessibility score >= 95 with the sheet open
