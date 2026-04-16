# Implementation Plan: Bible Reader — Highlighting, Notes & Sharing

**Spec:** `_specs/bible-reader-highlights-notes.md`
**Date:** 2026-03-22
**Branch:** `claude/feature/bible-reader-highlights-notes`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon needed — extends existing Bible reader)
**Master Spec Plan:** not applicable (Phase 2.9 specs are independent; this is Spec 2 of 3-spec Bible reader sequence)

---

## Architecture Context

### Existing Bible Reader Structure

**Key files this spec modifies:**
- `frontend/src/pages/BibleReader.tsx` — Chapter reading view. Currently renders verses as simple `<span>` elements with `<sup>` verse numbers and serif text. No interactivity beyond URL-hash highlighting (2s fade for search scroll-to). Uses `Layout` wrapper, `hero-dark` background, `max-w-2xl` content container.
- `frontend/src/pages/BibleBrowser.tsx` — `/bible` browser page. Currently has hero + `SegmentedControl` (Books | Search) + content area in `max-w-4xl`. The "My Highlights & Notes" section goes below the existing content.

**Key files this spec reuses:**
- `frontend/src/components/verse-of-the-day/VerseSharePanel.tsx` — Menu-style share panel with Copy/Share as Image/Download. Uses `role="menu"` with Arrow key nav, `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2`. Has `handleCopy`, `handleShareImage`, `handleDownload` handlers.
- `frontend/src/lib/verse-card-canvas.ts` — `generateVerseImage(text, reference)` → PNG Blob. 400×600 canvas, gradient `#0D0620→#1E0B3E→#4A1D96`, italic Lora for verse, Inter for reference, Caveat for watermark.
- `frontend/src/components/daily/CrisisBanner.tsx` — `<CrisisBanner text={string} />`. Shows crisis resources if `containsCrisisKeyword(text)` returns true. Uses `role="alert" aria-live="assertive"`.
- `frontend/src/components/ui/Toast.tsx` — `useToast()` → `{ showToast(message, type) }`. Top-right, 6s auto-dismiss.
- `frontend/src/components/ui/TooltipCallout.tsx` — Portal-rendered positioned element using `getBoundingClientRect()`, viewport clamping (VIEWPORT_MARGIN=8px), mobile override positioning. Good reference for the floating action bar positioning logic.

**Auth pattern:**
- `useAuth()` from `@/hooks/useAuth` → `{ isAuthenticated, user }`. Auth-gated writes return early when `!isAuthenticated`.
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` → `{ openAuthModal(subtitle?) }`. Available globally (App.tsx wraps with `AuthModalProvider`).
- Bible reader tests mock `useAuth` and `useBibleProgress` at module level.

**localStorage pattern (from `useBibleProgress`):**
- `readX()` / `writeX()` helper functions with try/catch for JSON parsing
- Auth-gated writes: `if (!isAuthenticated) return`
- useState initialized from localStorage: `useState<T>(readX)`
- Quota exceeded silently caught in writes

**Verse rendering (BibleReader.tsx lines 187-203):**
```tsx
{verses.map((verse) => (
  <span key={verse.number} id={`verse-${verse.number}`} className={cn(...)}>
    <sup className="mr-1 align-super font-sans text-xs text-white/30">{verse.number}</sup>
    <span className="font-serif text-base leading-[1.8] text-white/90 sm:text-lg">{verse.text}</span>{' '}
  </span>
))}
```
This will need modification to support click-to-select, highlight backgrounds, and note indicator icons.

**Test patterns (BibleReader.test.tsx):**
- `vi.mock('@/hooks/useAuth')` with `mockAuth` object
- `vi.mock('@/hooks/useBibleProgress')` with mock functions
- `vi.mock('@/data/bible')` with `loadChapter` returning mock data
- `vi.mock('@/hooks/useNotificationActions')` for navbar bell
- `renderReader(route)` helper using `MemoryRouter` + `Routes`
- `localStorage.clear()` in `beforeEach`

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Highlight a verse | Requires login | Step 3 | `useAuth()` — logged-out action bar shows lock message instead of Highlight/Note/Share |
| Add/edit a note | Requires login | Step 4 | `useAuth()` — Note button hidden in logged-out action bar |
| Share a verse (image) | Requires login | Step 5 | `useAuth()` — Share button hidden in logged-out action bar |
| Copy a verse | No login required | Step 2 | No auth check — always available |
| "My Highlights & Notes" section | Only visible for logged-in users with data | Step 6 | `useAuth()` — section not rendered when `!isAuthenticated` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Floating action bar | background | `bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-2 py-1` | Spec |
| Floating action bar icons | size/color | 20px Lucide, `text-white/70 hover:text-white` | Spec |
| Action bar icon touch target | min size | `min-h-[44px] min-w-[44px]` | Spec + a11y |
| Highlight color: Yellow | hex | `#FBBF24` (15% opacity bg: `rgba(251, 191, 36, 0.15)`) | Spec |
| Highlight color: Green | hex | `#34D399` (15% opacity bg: `rgba(52, 211, 153, 0.15)`) | Spec |
| Highlight color: Blue | hex | `#60A5FA` (15% opacity bg: `rgba(96, 165, 250, 0.15)`) | Spec |
| Highlight color: Pink | hex | `#F472B6` (15% opacity bg: `rgba(244, 114, 182, 0.15)`) | Spec |
| Color picker circles | size/border | 24px diameter, `border-2 border-white/40` | Spec |
| Note editor container | styling | `bg-white/5 border border-white/10 rounded-xl p-3 mt-2 mb-2` | Spec |
| Note textarea | styling | `bg-white/5 border border-white/10 rounded-lg p-3 text-white/90 text-sm placeholder:text-white/30 w-full resize-none` | Spec |
| Note textarea focus | ring | `focus:ring-2 focus:ring-primary/50 focus:border-primary/50` | Spec |
| Character counter | color | `text-xs text-white/30`, danger when ≤20 chars left: `text-danger` | Spec |
| Note indicator icon | styling | `StickyNote` 14px, `text-amber-400/50`, hover: `text-amber-400/80` | Spec |
| Expanded note | container | `bg-white/5 border border-white/10 rounded-lg p-3 mt-1 mb-2` | Spec |
| Expanded note text | styling | `text-white/70 text-sm leading-relaxed` | Spec |
| Edit/Delete buttons | styling | `text-xs text-white/30 hover:text-white/50` | Spec |
| Share panel | styling | `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2` | Existing `VerseSharePanel` |
| Highlights & Notes heading | styling | `text-xl font-semibold text-white` + count in `text-white/40 text-sm` | Spec |
| Feed card | styling | `bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors cursor-pointer` | Spec |
| Verse text in card | styling | `font-serif text-white/80 text-sm line-clamp-2` | Spec |
| Reference in card | styling | `text-xs text-white/40` | Spec |
| Color dot in card | size | 8px circle | Spec |
| Note preview in card | styling | `text-xs text-white/50 line-clamp-1 italic` | Spec |
| Show more button | styling | `text-sm text-primary hover:text-primary-lt` | Spec |
| Primary button (Save) | styling | `rounded-lg bg-primary py-2 px-4 text-sm font-semibold text-white` | design-system.md (scaled down for inline editor) |
| Cancel button | styling | `text-sm text-white/40 hover:text-white/60` | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Bible reader uses full dark theme (`bg-hero-dark` entire page, `#0D0620`), NOT the neutral-bg pattern of other inner pages
- Bible reader verse text is `font-serif text-base leading-[1.8] text-white/90 sm:text-lg` — Lora serif
- Verse numbers are `<sup>` with `mr-1 align-super font-sans text-xs text-white/30`
- The existing URL-hash highlight uses `bg-primary/10` with 2s transition-colors fade — the NEW persistent highlights must coexist without conflict
- The Bible reader content container is `max-w-2xl px-4 sm:px-6 mx-auto`
- The Bible browser content container is `max-w-4xl px-4 mx-auto`
- Share panels use `bg-hero-mid border border-white/15` (NOT `bg-white/15 backdrop-blur`)
- Crisis banner uses `border-warning/30 bg-warning/10` styling (warm yellow/orange)
- Toast system: `showToast(message, 'success')` for success, `showToast(message, 'error')` for error
- Auth modal: `useAuthModal()?.openAuthModal('Sign in to highlight verses')` pattern
- All localStorage keys prefixed `wr_`

---

## Shared Data Models

```typescript
// New types for this spec (add to types/bible.ts)

export interface BibleHighlight {
  book: string        // bookSlug (e.g., "genesis")
  chapter: number
  verseNumber: number
  color: string       // hex color (e.g., "#FBBF24")
  createdAt: string   // ISO timestamp
}

export interface BibleNote {
  id: string          // UUID via crypto.randomUUID()
  book: string        // bookSlug
  chapter: number
  verseNumber: number
  text: string        // 300 char max
  createdAt: string   // ISO timestamp
  updatedAt: string   // ISO timestamp
}
```

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_highlights` | Both | JSON array of BibleHighlight objects (max 500, oldest pruned) |
| `wr_bible_notes` | Both | JSON array of BibleNote objects (max 200, hard limit) |
| `wr_bible_progress` | Read | Existing — chapter completion tracking (not modified by this spec) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Action bar below verse, full-width minus margins; note editor full-width; H&N cards full-width stacked |
| Tablet | 768px | Action bar above verse, centered; note editor within `max-w-2xl`; H&N cards in `max-w-4xl` |
| Desktop | 1440px | Action bar above verse, centered; note editor within `max-w-2xl`; H&N cards in `max-w-4xl` |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Last verse → sentinel div | 0px (sentinel is `h-1`) | BibleReader.tsx:207 |
| Verse area → ChapterNav | 0px (sequential in same container) | BibleReader.tsx:212 |
| ChapterNav → Cross-feature CTAs | 32px (`mt-8`) | BibleReader.tsx:219 |
| Browser SegmentedControl → mode content | 0px (adjacent) | BibleBrowser.tsx:40-41 |
| Mode content → My H&N section | 32px (`mt-8`) | New — matches existing section spacing |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (`bible-reader-browser.md`) is complete and committed on main
- [ ] `useAuth()` and `useAuthModal()` are accessible in Bible reader components (confirmed: `AuthModalProvider` wraps all routes in App.tsx)
- [ ] `useToast()` is accessible (confirmed: `ToastProvider` wraps all routes)
- [ ] `VerseSharePanel` and `generateVerseImage` can be reused or adapted
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from spec + design-system.md + codebase inspection
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior Spec 1 is complete and committed

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Action bar dismiss on scroll | Dismiss | Simpler than repositioning; spec says "dismiss on scroll is simpler and preferred" |
| Touch vs click handling | Use `onClick` only (not `touchend`) | React's synthetic `onClick` fires correctly on both touch and mouse; avoids double-fire |
| Unsaved note prompt | Simple inline confirmation (not browser `beforeunload`) | Consistent with spec; no `confirm()` or alerts (blocks browser automation) |
| Verse element wrapping | Change `<span>` to `<div>` for verses | Needed for proper block-level click target, inline note editor placement, and highlight background spanning full width |
| Action bar portal target | `document.body` | Same pattern as `TooltipCallout.tsx` |
| Color picker expand direction | Inline within the action bar pill (icons + color circles on same row) | Spec says "reveals a row of 4 color option circles below or beside the icon buttons" — beside is cleaner for desktop, below for mobile if space is tight |
| Share panel reuse | Adapt `VerseSharePanel` pattern, not reuse component directly | The existing component is positioned with `absolute right-0` relative to its parent; the Bible reader needs portal-based positioning near the action bar |
| Note editor position | Below the selected verse, pushing content down | Spec requirement. Uses conditional rendering within the verse list, not a portal |

---

## Implementation Steps

### Step 1: Data Layer — Types, Constants, Storage Hooks

**Objective:** Create the type definitions, localStorage constants, and two custom hooks (`useBibleHighlights`, `useBibleNotes`) that manage highlight and note persistence.

**Files to create/modify:**
- `frontend/src/types/bible.ts` — Add `BibleHighlight` and `BibleNote` interfaces
- `frontend/src/constants/bible.ts` — Add `BIBLE_HIGHLIGHTS_KEY`, `BIBLE_NOTES_KEY`, `HIGHLIGHT_COLORS`, `MAX_HIGHLIGHTS`, `MAX_NOTES`
- `frontend/src/hooks/useBibleHighlights.ts` — New hook for highlight CRUD
- `frontend/src/hooks/useBibleNotes.ts` — New hook for note CRUD

**Details:**

**types/bible.ts additions:**
```typescript
export interface BibleHighlight {
  book: string
  chapter: number
  verseNumber: number
  color: string
  createdAt: string
}

export interface BibleNote {
  id: string
  book: string
  chapter: number
  verseNumber: number
  text: string
  createdAt: string
  updatedAt: string
}
```

**constants/bible.ts additions:**
```typescript
export const BIBLE_HIGHLIGHTS_KEY = 'wr_bible_highlights'
export const BIBLE_NOTES_KEY = 'wr_bible_notes'
export const MAX_HIGHLIGHTS = 500
export const MAX_NOTES = 200
export const NOTE_MAX_CHARS = 300
export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#FBBF24' },
  { name: 'Green', hex: '#34D399' },
  { name: 'Blue', hex: '#60A5FA' },
  { name: 'Pink', hex: '#F472B6' },
] as const
```

**useBibleHighlights hook API:**
```typescript
export function useBibleHighlights() {
  // Returns:
  // getHighlightsForChapter(book, chapter): BibleHighlight[]
  // getHighlightForVerse(book, chapter, verseNumber): BibleHighlight | undefined
  // setHighlight(book, chapter, verseNumber, color): void  // auth-gated
  // removeHighlight(book, chapter, verseNumber): void       // auth-gated
  // getAllHighlights(): BibleHighlight[]
}
```
- Follow `useBibleProgress` pattern: `readHighlights()` / `writeHighlights()` helpers with try/catch
- `setHighlight`: if same color exists, remove (toggle). If different color, replace. If new, add. Prune oldest if > 500.
- Auth-gated: `if (!isAuthenticated) return` on all mutations

**useBibleNotes hook API:**
```typescript
export function useBibleNotes() {
  // Returns:
  // getNotesForChapter(book, chapter): BibleNote[]
  // getNoteForVerse(book, chapter, verseNumber): BibleNote | undefined
  // saveNote(book, chapter, verseNumber, text): boolean  // auth-gated, returns false if limit reached
  // deleteNote(id): void                                  // auth-gated
  // getAllNotes(): BibleNote[]
}
```
- `saveNote`: if note exists for verse, update `text` and `updatedAt`. If new, create with `crypto.randomUUID()`. If count >= 200 and new, return `false`.
- Auth-gated: `if (!isAuthenticated) return` on mutations

**Guardrails (DO NOT):**
- Do NOT create a class-based storage service — use pure functions following `useBibleProgress` pattern
- Do NOT allow writes when `!isAuthenticated`
- Do NOT silently prune notes (only highlights auto-prune)
- Do NOT use `Date.now()` — use `new Date().toISOString()` for consistency

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useBibleHighlights: add highlight | unit | Adds highlight to localStorage, reads it back |
| useBibleHighlights: toggle off | unit | Adding same color to same verse removes it |
| useBibleHighlights: switch color | unit | Adding different color to same verse replaces it |
| useBibleHighlights: max 500 pruning | unit | When 500 reached, oldest pruned when adding new |
| useBibleHighlights: auth-gated | unit | Returns early / no-ops when not authenticated |
| useBibleHighlights: corrupted JSON | unit | Returns empty array on parse error |
| useBibleNotes: add note | unit | Creates note with UUID, stores in localStorage |
| useBibleNotes: edit existing note | unit | Updates text and updatedAt for existing verse note |
| useBibleNotes: max 200 hard limit | unit | Returns false when limit reached, does not add |
| useBibleNotes: delete note | unit | Removes note from localStorage |
| useBibleNotes: auth-gated | unit | Returns early / no-ops when not authenticated |
| useBibleNotes: corrupted JSON | unit | Returns empty array on parse error |

**Expected state after completion:**
- [ ] Two new hooks in `hooks/` directory
- [ ] Types added to `types/bible.ts`
- [ ] Constants added to `constants/bible.ts`
- [ ] All 12+ unit tests pass
- [ ] No existing tests broken

---

### Step 2: Verse Selection & Floating Action Bar

**Objective:** Make verses clickable in the reading view, show a floating action bar with icon buttons (Highlight, Note, Copy, Share) positioned relative to the selected verse. Implement copy-to-clipboard functionality. Portal-rendered, responsive positioning, accessible.

**Files to create/modify:**
- `frontend/src/components/bible/FloatingActionBar.tsx` — New component
- `frontend/src/pages/BibleReader.tsx` — Modify verse rendering to support click-to-select

**Details:**

**Verse rendering changes in BibleReader.tsx:**
- Change each verse wrapper from `<span>` to a clickable container
- Add `onClick` handler to select the verse (set `selectedVerse` state)
- Each verse element needs a stable ref for positioning (use `id={`verse-${verse.number}`}` already present)
- Selected verse state: `useState<number | null>(null)`
- Dismiss selected verse on: click outside, Escape, scroll, chapter navigation

**FloatingActionBar component:**
```typescript
interface FloatingActionBarProps {
  verseNumber: number
  verseText: string
  bookName: string      // For copy/share reference (e.g., "Genesis")
  bookSlug: string
  chapter: number
  isAuthenticated: boolean
  hasHighlight: boolean
  hasNote: boolean
  onHighlight: () => void
  onNote: () => void
  onCopy: () => void
  onShare: () => void
  onDismiss: () => void
  targetElement: HTMLElement | null
}
```

**Positioning logic** (adapted from `TooltipCallout`):
- Use `getBoundingClientRect()` on the target verse element
- Desktop/tablet (≥ 640px): position above the verse, horizontally centered
- Mobile (< 640px): position below the verse
- Viewport clamping: minimum 8px from any edge
- Render via `createPortal(…, document.body)`
- `position: fixed` with computed `top`/`left`
- Reposition not needed (dismiss on scroll instead)

**Copy handler** (works for all users):
- Format: `"[verse text]" — [Book] [Chapter]:[Verse] WEB`
- Use `navigator.clipboard.writeText()` with fallback (same pattern as `VerseSharePanel`)
- Show toast: `showToast('Copied!', 'success')`
- Dismiss action bar after copy

**Logged-out action bar:**
- When `!isAuthenticated`: show Lock icon + "Sign in to highlight and take notes" text + Copy button only
- Lock message is informational only — does NOT trigger auth modal on tap

**Animation:**
- 150ms fade-in (`opacity 0→1` via CSS transition)
- Respect `prefers-reduced-motion` (instant show)

**Accessibility:**
- Each icon button has `aria-label`: "Highlight verse", "Add note", "Copy verse", "Share verse"
- Focus moves to first button when action bar opens
- Tab through buttons
- Escape dismisses

**Responsive behavior:**
- Desktop (1440px): Above verse, centered, standard icon sizes
- Tablet (768px): Above verse, centered
- Mobile (375px): Below verse, full-width minus 16px margins if needed

**Guardrails (DO NOT):**
- Do NOT use `touchend` events — `onClick` handles both touch and mouse
- Do NOT use `window.confirm()` or `alert()` — these block browser automation
- Do NOT render action bar on placeholder chapters (books without `hasFullText`)
- Do NOT allow multiple action bars — selecting a new verse replaces the previous

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Clicking a verse shows action bar | integration | Renders 4 icon buttons (logged in) |
| Logged-out action bar shows lock message + Copy | integration | Lock icon, message text, only Copy button functional |
| Copy button copies formatted text | integration | Clipboard contains `"text" — Book Ch:V WEB` |
| Escape dismisses action bar | integration | Action bar removed from DOM after Escape |
| Click outside dismisses | integration | Action bar removed when clicking non-verse area |
| Selecting new verse replaces action bar | integration | Only one action bar at a time |
| Action bar has correct aria-labels | unit | Each button has descriptive aria-label |
| Action bar not shown on placeholder chapters | integration | No action bar when `!hasFullText` |

**Expected state after completion:**
- [ ] Clicking a verse in the reading view shows a floating action bar
- [ ] Action bar has 4 buttons (logged in) or lock + copy (logged out)
- [ ] Copy button works for all users
- [ ] Action bar dismisses on click outside, Escape, scroll
- [ ] Action bar renders via portal, responsive positioning
- [ ] All tests pass

---

### Step 3: Verse Highlighting

**Objective:** Implement the highlight color picker within the action bar, apply persistent highlight background tints to verses, and integrate with the `useBibleHighlights` hook.

**Files to create/modify:**
- `frontend/src/components/bible/FloatingActionBar.tsx` — Add color picker UI within the bar
- `frontend/src/pages/BibleReader.tsx` — Apply highlight backgrounds to verses on load

**Details:**

**Color picker in action bar:**
- Tapping the Highlight icon reveals 4 color circles
- Color circles: 24px diameter, `border-2 border-white/40`, fill at full opacity
- Active/selected color (verse already highlighted in that color): thicker border (`border-white`) + checkmark overlay
- Each circle has `aria-label` (e.g., "Highlight yellow") and `aria-pressed="true"` if that color is active
- Tapping a color: calls `setHighlight(book, chapter, verseNumber, color)` or `removeHighlight()` if toggling off
- Action bar dismisses after highlight applied

**Highlight rendering in BibleReader.tsx:**
- On mount/chapter change: read highlights for current chapter via `getHighlightsForChapter(bookSlug, chapterNumber)`
- Each verse checks if it has a highlight, applies background inline style: `backgroundColor: rgba(r, g, b, 0.15)`
- Use a helper function `hexToRgba(hex, opacity)` to convert hex to rgba
- Highlights must coexist with the existing `bg-primary/10` URL-hash highlight. The URL-hash highlight is temporary (2s fade) and uses a CSS class; persistent highlights use inline `style`. The temporary highlight overlays the persistent one (both can be active simultaneously but the temporary one fades away).

**Screen reader announcements:**
- When highlight applied: announce "Verse [N] highlighted [color]" via `aria-live` region
- When highlight removed: announce "Highlight removed from verse [N]"

**Responsive behavior:**
- Desktop: Color circles in a row beside the icon buttons within the pill
- Mobile: Color circles in a row below the icon buttons if horizontal space is tight (the action bar becomes slightly taller). Use a flex-wrap approach.

**Guardrails (DO NOT):**
- Do NOT use Tailwind color classes for highlight backgrounds — they can't represent the 4 specific hex colors at 15% opacity. Use inline `style={{ backgroundColor: ... }}`
- Do NOT modify the existing `highlightedVerse` URL-hash feature — it must continue working
- Do NOT allow highlights on placeholder chapters

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Highlight icon reveals color picker | integration | 4 color circles appear |
| Selecting a color highlights the verse | integration | Verse has background style applied |
| Selecting same color removes highlight | integration | Background style removed (toggle off) |
| Selecting different color switches | integration | Old color replaced with new |
| Highlights persist across navigation | integration | Leave chapter, return — highlights visible |
| Color circles have aria-label | unit | Each circle labeled "Highlight yellow" etc. |
| Active color has aria-pressed=true | unit | Currently highlighted color has pressed state |
| Screen reader announcement on highlight | integration | aria-live region announces action |
| Highlight + URL hash coexist | integration | Both bg-primary/10 and persistent highlight visible |

**Expected state after completion:**
- [ ] Tapping Highlight icon shows 4 color circles
- [ ] Applying a color adds a 15% opacity background to the verse
- [ ] Toggle/switch highlight colors works
- [ ] Highlights persist in localStorage and restore on page load
- [ ] Screen reader announces highlight actions
- [ ] All tests pass

---

### Step 4: Personal Notes

**Objective:** Implement the inline note editor below selected verses, note indicator icons on verses with notes, expandable read-only note display, edit/delete functionality, crisis keyword detection, and unsaved changes protection.

**Files to create/modify:**
- `frontend/src/components/bible/NoteEditor.tsx` — New: inline note editor component
- `frontend/src/components/bible/NoteIndicator.tsx` — New: small icon + expandable note display
- `frontend/src/pages/BibleReader.tsx` — Integrate note editor and indicators into verse rendering

**Details:**

**NoteEditor component:**
```typescript
interface NoteEditorProps {
  verseNumber: number
  book: string
  chapter: number
  existingNote?: BibleNote
  onSave: (text: string) => boolean  // returns false if limit reached
  onCancel: () => void
  onDelete?: () => void
}
```
- Textarea: `bg-white/5 border border-white/10 rounded-lg p-3 text-white/90 text-sm placeholder:text-white/30 w-full resize-none`, focus ring: `focus:ring-2 focus:ring-primary/50 focus:border-primary/50`
- Placeholder: "Add a note about this verse..."
- 300 character max with live counter: `text-xs text-white/30`, turns `text-danger` when ≤20 chars remaining
- Textarea label: `aria-label="Personal note for verse [N]"`
- `CrisisBanner` rendered above Save button: `<CrisisBanner text={noteText} />`
- Save button: small primary style (`rounded-lg bg-primary py-2 px-4 text-sm font-semibold text-white`)
- Cancel button: `text-sm text-white/40 hover:text-white/60`
- Save disabled when: empty text, at character limit with no change from existing, or note limit reached (show toast)
- Container: `bg-white/5 border border-white/10 rounded-xl p-3 mt-2 mb-2`
- Renders inline below the selected verse (within the verse list, not a portal)
- Action bar dismisses when note editor opens

**NoteIndicator component:**
```typescript
interface NoteIndicatorProps {
  note: BibleNote
  onEdit: () => void
  onDelete: (noteId: string) => void
}
```
- Icon: `StickyNote` (Lucide) 14px, `text-amber-400/50`, hover: `text-amber-400/80`
- Positioned after the verse number superscript
- Click/tap expands note text inline below the verse
- Expanded state:
  - Container: `bg-white/5 border border-white/10 rounded-lg p-3 mt-1 mb-2`
  - Text: `text-white/70 text-sm leading-relaxed`
  - Edit button: Lucide `Pencil` icon, `text-xs text-white/30 hover:text-white/50`
  - Delete button: Lucide `Trash2` icon, `text-xs text-white/30 hover:text-white/50`
  - `aria-expanded` attribute on the indicator button
- Tap outside expanded note: collapse it
- Delete: inline confirmation ("Delete this note?" with Delete/Cancel buttons) — NOT `window.confirm()`

**Unsaved changes protection:**
- Track `isDirty` state (note text differs from original)
- When user taps another verse or navigates away with dirty editor: show inline prompt "Discard unsaved changes?" with "Discard" and "Keep editing" buttons
- Use `useRef` to track the dirty state so event handlers see the latest value
- Prompt appears within the note editor area (not a modal or browser dialog)

**BibleReader.tsx integration:**
- Add `useBibleNotes` hook call
- For each verse, check `getNoteForVerse(book, chapter, verseNumber)` — if note exists, render `NoteIndicator` after the verse number `<sup>`
- When Note action bar button is tapped: set `editingNoteVerse` state, render `NoteEditor` below that verse
- Note editor and expanded note are mutually exclusive with the action bar (action bar dismisses when either appears)

**Auth gating:**
- Note button only appears in logged-in action bar (handled in Step 2's logged-out variant)
- Note indicators only visible for logged-in users with notes

**Responsive behavior:**
- Desktop/Tablet: Note editor width matches reading column (`max-w-2xl`)
- Mobile: Note editor full-width within padding, Save/Cancel side by side

**Guardrails (DO NOT):**
- Do NOT use `window.confirm()` for delete confirmation — use inline confirmation buttons
- Do NOT use `window.beforeunload` for unsaved changes — use React state
- Do NOT silently delete notes when at limit — show toast and return false
- Do NOT render CrisisBanner for empty text (handled by `containsCrisisKeyword` returning false for empty strings)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Note button opens inline editor below verse | integration | Editor textarea visible below selected verse |
| Note editor has 300 char limit with counter | integration | Counter updates, enforces max |
| Character counter turns red near limit | unit | `text-danger` class when ≤20 chars left |
| Saving a note stores in localStorage | integration | Note persisted, indicator appears on verse |
| Editing existing note pre-fills textarea | integration | Existing text shown in editor |
| Deleting note shows inline confirmation | integration | "Delete this note?" with Delete/Cancel |
| Confirming delete removes note | integration | Note removed from storage, indicator gone |
| Note indicator expands on click | integration | Note text visible below verse |
| Expanded note has Edit and Delete buttons | integration | Both buttons present and functional |
| Crisis banner appears on crisis keywords | integration | CrisisBanner visible when typing crisis text |
| Note limit toast at 200 | integration | Toast shown, Save disabled when limit reached |
| Unsaved changes prompt on verse switch | integration | "Discard unsaved changes?" when dirty editor |
| Note editor textarea has aria-label | unit | Accessible label present |
| Expanded note has aria-expanded | unit | Attribute toggles on expand/collapse |
| Screen reader announces note save/delete | integration | aria-live announcement |

**Expected state after completion:**
- [ ] Tapping Note opens inline editor below verse
- [ ] Notes save to localStorage with UUID, timestamps
- [ ] Note indicator icons appear on verses with notes
- [ ] Expand/edit/delete flow works
- [ ] Crisis banner shows on crisis keywords
- [ ] 200-note limit enforced with toast
- [ ] Unsaved changes protection works
- [ ] All tests pass

---

### Step 5: Verse Sharing (Share Panel + Image Generation)

**Objective:** Implement the Share button in the action bar, opening a share panel with Copy, Share as Image, and Download Image options. Reuse existing `generateVerseImage` utility and adapt the `VerseSharePanel` pattern for portal-based positioning.

**Files to create/modify:**
- `frontend/src/components/bible/VerseShareMenu.tsx` — New: share panel adapted for Bible reader context
- `frontend/src/components/bible/FloatingActionBar.tsx` — Wire Share button to open the share menu

**Details:**

**VerseShareMenu component** (adapted from `VerseSharePanel`):
```typescript
interface VerseShareMenuProps {
  verseText: string
  reference: string      // e.g., "Genesis 1:1 WEB"
  isOpen: boolean
  onClose: () => void
  anchorElement: HTMLElement | null  // Position relative to this element
}
```
- Three menu items: Copy verse, Share as image, Download image
- Uses same `role="menu"` / `role="menuitem"` pattern as existing `VerseSharePanel`
- Arrow key navigation (up/down), Home/End, Escape to close, Enter/Space to select
- Focus moves to first item on open
- Click outside dismisses
- Styling: `bg-hero-mid border border-white/15 rounded-xl shadow-lg p-2`

**Share reference format:**
- Include verse number: `"[Book] [Chapter]:[Verse] WEB"` (e.g., "John 3:16 WEB")
- Copy format: `"[verse text]" — [Book] [Chapter]:[Verse] WEB`

**Image generation:**
- Reuse `generateVerseImage(verseText, reference)` from `lib/verse-card-canvas.ts` directly
- Reference passed includes verse number + "WEB" suffix
- File name: `worship-room-verse-YYYY-MM-DD.png` (same pattern as existing)

**Share panel positioning:**
- Render via portal to `document.body`
- Position near the action bar anchor element using `getBoundingClientRect()`
- Desktop: Below the action bar, aligned right
- Mobile: Below the action bar, centered with margins
- Viewport clamping (min 8px from edges)

**Auth gating:**
- Share button only in logged-in action bar (Step 2 already handles this)
- Copy always works (even from the share panel — no auth check)
- Share as Image and Download are auth-gated (only reachable from logged-in action bar)

**Responsive behavior:**
- Desktop: Small popover dropdown near Share button
- Tablet: Same as desktop
- Mobile: Full-width near action bar area, each row 44px touch target

**Guardrails (DO NOT):**
- Do NOT modify the existing `VerseSharePanel` component — create a new adapted version for Bible reader
- Do NOT modify `generateVerseImage` — reuse it as-is
- Do NOT use `window.open()` for sharing — use Web Share API with download fallback

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Share button opens share panel | integration | 3 menu items visible |
| Copy verse from share panel | integration | Clipboard contains formatted text |
| Share panel has keyboard navigation | unit | Arrow keys, Escape, Enter work |
| Share panel has role="menu" | unit | ARIA roles correct |
| Share panel dismisses on click outside | integration | Panel removed from DOM |
| Share panel dismisses on Escape | integration | Panel removed, focus returned |
| Download generates PNG | integration | File download triggered (mock) |
| Share image uses Web Share API on mobile | integration | navigator.share called with file |

**Expected state after completion:**
- [ ] Share button opens a 3-option menu panel
- [ ] Copy works from the share panel
- [ ] Share as Image generates PNG and shares/downloads
- [ ] Download always downloads PNG
- [ ] Panel has proper keyboard navigation and ARIA
- [ ] All tests pass

---

### Step 6: "My Highlights & Notes" Section on Browser Page

**Objective:** Add a section below the book listing on `/bible` that shows a chronological feed of all highlights and notes for logged-in users. Each entry links back to the verse in context.

**Files to create/modify:**
- `frontend/src/components/bible/HighlightsNotesSection.tsx` — New: the feed section component
- `frontend/src/pages/BibleBrowser.tsx` — Render the new section below existing content

**Details:**

**HighlightsNotesSection component:**
```typescript
interface HighlightsNotesSectionProps {
  highlights: BibleHighlight[]
  notes: BibleNote[]
}
```

**Feed item type:**
```typescript
interface FeedItem {
  type: 'highlight' | 'note'
  book: string          // bookSlug
  chapter: number
  verseNumber: number
  verseText?: string    // Loaded lazily for display
  createdAt: string
  // Highlight-specific
  color?: string
  // Note-specific
  noteText?: string
  noteId?: string
}
```

**Feed construction:**
- Merge highlights and notes into a single array
- Sort by `createdAt` descending (newest first)
- If a verse has both a highlight and a note, they appear as separate entries
- Show 20 items initially, "Show more" loads next 20

**Verse text loading:**
- Feed items need the verse text for display
- Load verse text lazily: for each unique book+chapter in the visible feed, call `loadChapter(bookSlug, chapter)` to get the verse text
- Cache loaded chapters in a `useRef<Map>` to avoid re-loading
- Show the verse text truncated to 2 lines (`line-clamp-2`)
- While loading: show a subtle skeleton/placeholder

**Entry rendering:**
- Card: `bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors cursor-pointer`
- Verse text: `font-serif text-white/80 text-sm line-clamp-2`
- Reference: `text-xs text-white/40` (e.g., "Genesis 1:1")
- For highlights: 8px colored circle dot
- For notes: `text-xs text-white/50 line-clamp-1 italic` preview
- Click navigates to `/bible/:bookSlug/:chapter#verse-:verseNumber`

**Section heading:**
- "My Highlights & Notes" in `text-xl font-semibold text-white`
- Count badge: `text-white/40 text-sm` (total count of highlights + notes)

**Visibility rules:**
- Only render for `isAuthenticated` users
- Only render when total count > 0
- If no items, section simply doesn't render (no empty state)

**BibleBrowser.tsx changes:**
- Import `useBibleHighlights` and `useBibleNotes` hooks
- Import `useAuth`
- Below `{mode === 'books' ? <BibleBooksMode /> : <BibleSearchMode />}`, conditionally render `<HighlightsNotesSection>`
- Only when `isAuthenticated && (highlights.length > 0 || notes.length > 0)`

**Book name lookup:**
- Use `getBookBySlug(bookSlug)` from `@/data/bible` to get the display name for references

**Responsive behavior:**
- Desktop/Tablet: Cards within `max-w-4xl mx-auto` (same as browser content)
- Mobile: Full-width with `px-4` padding, cards stacked vertically with `space-y-3`

**Guardrails (DO NOT):**
- Do NOT load all Bible text upfront — lazy-load only chapters that appear in the feed
- Do NOT show this section for logged-out users
- Do NOT create a separate route for this — it's a section on the existing `/bible` page
- Do NOT paginate (use "Show more" progressive disclosure)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Section not visible when logged out | integration | Section not in DOM |
| Section not visible when no data | integration | Section not rendered with 0 items |
| Section shows when logged in with highlights | integration | Heading + entries visible |
| Feed sorted newest first | integration | First entry has most recent createdAt |
| Highlight entry shows color dot | integration | 8px circle with highlight color |
| Note entry shows preview text | integration | Italic truncated note text visible |
| Click entry navigates to verse | integration | Router navigated to `/bible/:book/:ch#verse-:v` |
| "Show more" reveals next 20 | integration | Hidden items become visible |
| Count badge shows total | integration | Badge text matches total count |
| Both highlight and note for same verse = 2 entries | integration | Two separate feed items |

**Expected state after completion:**
- [ ] "My Highlights & Notes" section visible on `/bible` for logged-in users with data
- [ ] Chronological feed with highlight dots and note previews
- [ ] Clicking an entry navigates to the verse in context
- [ ] "Show more" progressive disclosure works
- [ ] Section hidden for logged-out users or users with no data
- [ ] All tests pass

---

### Step 7: Integration Testing & Edge Cases

**Objective:** Write integration tests covering cross-component interactions, edge cases from the spec, and regression tests for existing Bible reader functionality.

**Files to create/modify:**
- `frontend/src/pages/__tests__/BibleReaderHighlights.test.tsx` — New: integration tests for highlighting flow
- `frontend/src/pages/__tests__/BibleReaderNotes.test.tsx` — New: integration tests for notes flow
- `frontend/src/pages/__tests__/BibleBrowserHighlightsNotes.test.tsx` — New: browser page section tests

**Details:**

**Cross-component integration tests:**
- Full flow: select verse → highlight → navigate away → return → highlight visible
- Full flow: select verse → add note → indicator appears → expand note → edit → save
- Full flow: select verse → copy → toast appears → action bar dismisses
- Verse with both highlight and note: both visible simultaneously
- Unsaved note + tap different verse: discard prompt appears
- Unsaved note + chapter navigation: discard prompt appears

**Edge case tests:**
- Very long verse: action bar positions correctly
- Verse near top of viewport: action bar flips to below (desktop)
- Multiple rapid verse taps: only one action bar visible
- 500 highlight limit: oldest pruned silently
- 200 note limit: toast appears, save disabled
- Corrupted localStorage JSON: graceful recovery
- Placeholder chapter: no action bar appears
- Copy on verse with special characters: correct clipboard content

**Regression tests:**
- URL hash verse highlight still works (`#verse-3`)
- Chapter completion tracking (Intersection Observer) still works
- Chapter navigation (prev/next) still works
- ChapterSelector still works
- Cross-feature CTAs still present
- BibleBrowser accordion + search still work

**Guardrails (DO NOT):**
- Do NOT test implementation details — test user-visible behavior
- Do NOT skip accessibility assertions (aria-labels, roles, keyboard nav)
- Do NOT mock localStorage — use actual localStorage (cleared in beforeEach)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Highlight + note on same verse | integration | Both background tint and note icon visible |
| Full highlight flow: apply → navigate → return | integration | Highlight persists across chapter navigation |
| Full note flow: add → expand → edit → delete | integration | Complete CRUD lifecycle |
| Unsaved note prompt on verse switch | integration | Discard confirmation appears |
| URL hash highlight still works | regression | `#verse-3` scrolls and highlights verse 3 |
| Chapter completion tracking still works | regression | IO-based mark-as-read fires correctly |
| No action bar on placeholder chapters | edge case | Action bar never appears |
| Corrupted storage recovery | edge case | Empty arrays returned, no crash |

**Expected state after completion:**
- [ ] All integration tests pass
- [ ] All edge case tests pass
- [ ] All regression tests pass
- [ ] No existing Bible reader tests broken
- [ ] `pnpm test` passes with no failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data layer: types, constants, storage hooks |
| 2 | 1 | Verse selection & floating action bar with Copy |
| 3 | 1, 2 | Verse highlighting (color picker + persistent backgrounds) |
| 4 | 1, 2 | Personal notes (inline editor, indicators, expand/edit/delete) |
| 5 | 2 | Verse sharing (share panel + image generation) |
| 6 | 1 | "My Highlights & Notes" section on browser page |
| 7 | 1-6 | Integration testing & edge cases |

Steps 3, 4, and 5 can be implemented in parallel after Steps 1 and 2 are complete. Step 6 only depends on Step 1 (the hooks). Step 7 requires all prior steps.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Layer — Types, Constants, Hooks | [COMPLETE] | 2026-03-22 | Added BibleHighlight/BibleNote types to types/bible.ts, constants to constants/bible.ts, created hooks/useBibleHighlights.ts and hooks/useBibleNotes.ts. 23 unit tests passing. |
| 2 | Verse Selection & Floating Action Bar | [COMPLETE] | 2026-03-22 | Created FloatingActionBar.tsx (portal-rendered, responsive positioning). Modified BibleReader.tsx: verses are clickable, action bar shows 4 buttons (auth) or lock+Copy (unauth), copy-to-clipboard, dismiss on Escape/click-outside/scroll. Added mocks for useToast/useBibleHighlights/useBibleNotes to existing BibleReader tests. 10 new FloatingActionBar tests + 13 existing passing. |
| 3 | Verse Highlighting | [COMPLETE] | 2026-03-22 | Added color picker UI to FloatingActionBar (4 circles with aria-pressed, checkmark overlay). Wired handleSelectColor in BibleReader with highlight hook. Highlight backgrounds rendered via inline style with hexToRgba. Screen reader announcements via aria-live region. 15 FloatingActionBar tests + 13 BibleReader tests passing. |
| 4 | Personal Notes | [COMPLETE] | 2026-03-22 | Created NoteEditor.tsx (inline editor, 300 char limit, crisis banner, delete confirmation, dirty state tracking). Created NoteIndicator.tsx (expandable note display, edit/delete). Integrated into BibleReader: note indicators on verses, inline editor below verse, unsaved changes prompt. 14 NoteEditor + 8 NoteIndicator tests passing. |
| 5 | Verse Sharing | [COMPLETE] | 2026-03-22 | Created VerseShareMenu.tsx (portal-rendered, role="menu", keyboard nav, Copy/ShareImage/Download). Integrated into BibleReader. Reuses generateVerseImage utility. 8 tests passing. |
| 6 | My Highlights & Notes Section | [COMPLETE] | 2026-03-22 | Created HighlightsNotesSection.tsx (chronological feed, lazy verse text loading, color dots, note previews, Show more, click-to-navigate). Integrated into BibleBrowser.tsx with auth gating. Added hook mocks to BibleBrowser tests. 11 tests passing. |
| 7 | Integration Testing & Edge Cases | [COMPLETE] | 2026-03-22 | Created 3 integration test files: BibleReaderHighlights (7 tests), BibleReaderNotes (7 tests), BibleBrowserHighlightsNotes (5 tests). Tests cover: verse click→action bar, color picker reveal, logged-out lock message, copy clipboard, note editor lifecycle, auth gating, corrupted localStorage, placeholder chapters, Escape dismissal. All 128 tests passing across 12 files. Fixed TS errors (unused hexToRgba, unused variable). |
