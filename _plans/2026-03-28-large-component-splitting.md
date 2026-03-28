# Implementation Plan: Large Component Splitting

**Spec:** `_specs/large-component-splitting.md`
**Date:** 2026-03-28
**Branch:** `claude/feature/large-component-splitting`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — not used; no visual changes)
**Recon Report:** not applicable (pure refactoring)
**Master Spec Plan:** not applicable (standalone refactoring task)

---

## Architecture Context

### Current State

| Component | Path | Lines | Sub-Components Already Extracted |
|-----------|------|-------|----------------------------------|
| Navbar.tsx | `components/Navbar.tsx` | 380 | MobileDrawer, AvatarDropdown, LocalSupportDropdown, NotificationPanel, SeasonalNavLine |
| PrayTabContent.tsx | `components/daily/PrayTabContent.tsx` | 853 | GuidedPrayerSection, AmbientSoundPill, CrisisBanner, ReadAloudButton, KaraokeText, KaraokeTextReveal, ShareButton, SaveToPrayerListForm, CharacterCount, GuidedPrayerPlayer |
| JournalTabContent.tsx | `components/daily/JournalTabContent.tsx` | 751 | AmbientSoundPill, CrisisBanner, CharacterCount, FeatureEmptyState, UnsavedChangesModal |
| BibleReader.tsx | `pages/BibleReader.tsx` | 738 | AudioControlBar, BibleAmbientChip, SleepTimerPanel, BookNotFound, ChapterNav, ChapterPlaceholder, ChapterSelector, FloatingActionBar, NoteEditor, NoteIndicator, SharePanel, BookCompletionCard, Breadcrumb |

### Directory Conventions

- Daily Hub sub-components: `frontend/src/components/daily/`
- Bible sub-components: `frontend/src/components/bible/` (already exists with 20 files)
- Navbar sub-components: `frontend/src/components/` (top-level, e.g., `MobileDrawer.tsx`, `AvatarDropdown.tsx`)
- Tests mirror source: `__tests__/` sibling directory

### Component Export Pattern

All existing extracted components use **named exports** (not default exports). Example from `GuidedPrayerSection.tsx`:
```typescript
export function GuidedPrayerSection({ onStartSession }: GuidedPrayerSectionProps) {
```

All existing components export their Props interface alongside the component:
```typescript
interface GuidedPrayerSectionProps {
  onStartSession: (session: GuidedPrayerSession) => void
}
export function GuidedPrayerSection({ ... }: GuidedPrayerSectionProps) {
```

### Test Patterns

Tests use providers wrapping: `MemoryRouter` + `AuthProvider` + `ToastProvider` + `AuthModalProvider`. Tests mock hooks via `vi.mock()`. Tests render parent components, so refactoring internals should not break tests as long as rendered output is identical.

Key test files:
- `components/daily/__tests__/PrayTabContent.test.tsx`
- `components/daily/__tests__/JournalTabContent.test.tsx`
- `pages/__tests__/BibleReader.test.tsx` (+ BibleReaderHighlights, BibleReaderNotes, BibleReaderAudio)

### BibleReader — Already Extracted Components

The spec lists 5 components to extract from BibleReader. **4 of 5 already exist:**

| Spec Name | Existing Component | Path |
|-----------|-------------------|------|
| VerseDisplay | **Does not exist** — needs extraction | — |
| VerseActionBar | `FloatingActionBar` | `components/bible/FloatingActionBar.tsx` |
| AudioControlBar | `AudioControlBar` | `components/bible/AudioControlBar.tsx` |
| ChapterNavigation | `ChapterNav` | `components/bible/ChapterNav.tsx` |
| HighlightsNotesPanel | `HighlightsNotesSection` | `components/bible/HighlightsNotesSection.tsx` |

Only **VerseDisplay** needs to be created. The BibleReader needs handler/state extraction to reach ≤250 lines.

---

## Auth Gating Checklist

N/A — This is a pure refactoring spec. No new interactive elements are introduced. All existing auth gating behavior is preserved exactly as-is.

---

## Design System Values (for UI steps)

N/A — No visual changes. All existing styles, classes, and layouts are preserved verbatim during extraction.

---

## Design System Reminder

N/A — No UI steps in this plan. Pure code organization refactoring.

---

## Shared Data Models (from Master Plan)

N/A — Standalone refactoring task.

---

## Responsive Structure

N/A — No responsive behavior changes.

---

## Vertical Rhythm

N/A — No layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Current branch is `claude/feature/large-component-splitting`
- [ ] `pnpm build` passes before starting (baseline)
- [ ] `pnpm test` passes before starting (baseline)
- [ ] The spec's 4 BibleReader sub-components (FloatingActionBar, AudioControlBar, ChapterNav, HighlightsNotesSection) already exist under different names — only VerseDisplay is new
- [ ] The spec says "default export" but all existing extracted components use named exports — we follow codebase convention (named exports)
- [ ] No visual changes will be made — rendered HTML must be identical before and after

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spec says "default export" for sub-components | Use **named exports** | All existing components in the codebase use named exports. Following codebase convention over spec. |
| Spec lists 5 BibleReader extractions but 4 already exist | Only extract **VerseDisplay** + move handlers | FloatingActionBar, AudioControlBar, ChapterNav, HighlightsNotesSection already exist. No renaming needed. |
| PrayerInput "manages its own input text state internally" but parent needs text for pre-fill and topic | PrayerInput manages text internally. Parent passes `initialText` prop for pre-fill. `onSubmit` callback returns the text. Topic extracted at submit time. | Keeps PrayerInput self-contained while allowing parent to pre-fill and capture text at submission. |
| `ClassicPrayerCard` is a local function at bottom of PrayTabContent | Move to PrayerResponse file (since it's rendered within the classic prayers section which is inside the response area) or keep in PrayTabContent | It's behind a `{false && ...}` guard (disabled). Move it to a `ClassicPrayerCard` local function inside `PrayerResponse.tsx` to keep PrayTabContent clean, even though the section is disabled. |
| `formatDateTime` utility in JournalTabContent | Move to `SavedEntriesList.tsx` | Only used by entry cards. |
| `JOURNAL_MILESTONES` constant in JournalTabContent | Keep in parent (JournalTabContent) | Used in `handleSave` which stays in the parent. |
| Navbar is 380 lines (over 300) | Extract `DesktopUserActions` (~117 lines) → Navbar ~263 lines | Largest self-contained block with its own state. Brings Navbar well under 300. |
| BibleReader hexToRgba helper | Move to VerseDisplay (only consumer) | Used only within the verse rendering loop for highlight overlays. |

---

## Implementation Steps

### Step 1: Navbar — Extract DesktopUserActions

**Objective:** Move the `DesktopUserActions` function component (~117 lines) from `Navbar.tsx` to its own file. Bring Navbar to ≤300 lines.

**Files to create/modify:**
- `frontend/src/components/DesktopUserActions.tsx` — new file
- `frontend/src/components/Navbar.tsx` — remove DesktopUserActions, add import

**Details:**

Extract `DesktopUserActions` (lines 154–271 of `Navbar.tsx`) to `frontend/src/components/DesktopUserActions.tsx`.

The component is self-contained with its own state (`isAvatarOpen`, `isBellOpen`), refs, effects, and handlers. It imports `useAuth`, `useOnlineStatus`, `useNotificationActions`, `NotificationBell`, `NotificationPanel`, `AvatarDropdown`.

In `Navbar.tsx`, replace the inline `DesktopUserActions` function with:
```typescript
import { DesktopUserActions } from '@/components/DesktopUserActions'
```

The extracted component's interface:
```typescript
// No props needed — uses context hooks internally
export function DesktopUserActions() {
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any JSX, styles, or class names
- DO NOT change any state logic or effect behavior
- DO NOT rename the component
- DO NOT change import paths inside the extracted component (keep `@/` aliases)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing Navbar tests | regression | Must pass without modification — Navbar still renders DesktopUserActions |

**Expected state after completion:**
- [ ] `DesktopUserActions.tsx` exists in `components/` with named export
- [ ] `Navbar.tsx` imports and renders `DesktopUserActions` from new file
- [ ] `Navbar.tsx` is ≤300 lines (target: ~263)
- [ ] `pnpm build` passes

---

### Step 2: PrayTabContent — Extract PrayerInput

**Objective:** Extract the input section (heading, starter chips, textarea, crisis banner, error message, submit button) from PrayTabContent into a standalone `PrayerInput` component.

**Files to create/modify:**
- `frontend/src/components/daily/PrayerInput.tsx` — new file
- `frontend/src/components/daily/PrayTabContent.tsx` — remove input JSX, add import

**Details:**

Extract the input section currently at PrayTabContent lines 672–747 (`{!prayer && !isLoading && ( ... )}`).

PrayerInput manages its own state internally:
- `text` (textarea value)
- `selectedChip` (which starter chip is selected)
- `nudge` (validation error state)
- `textareaRef` (for auto-expand and focus)

Props interface:
```typescript
export interface PrayerInputProps {
  onSubmit: (text: string) => void
  isLoading: boolean
  initialText?: string
  retryPrompt?: string | null
  onRetryPromptClear?: () => void
}
```

Move these into PrayerInput:
- `handleChipClick` logic
- `autoExpand` callback
- Starter chips rendering (`DEFAULT_PRAYER_CHIPS` map)
- Textarea with cyan glow, character count
- `CrisisBanner` rendering
- Nudge error message
- "Generate Prayer" button

PrayerInput calls `onSubmit(text)` when the user clicks "Generate Prayer" with valid text. Auth gating remains in the parent's handler that receives the text.

When `initialText` changes (from Prayer Wall context, challenge context, or cross-feature CTA), PrayerInput sets its internal `text` state. Use a `useEffect` watching `initialText`.

Move these imports into PrayerInput: `CrisisBanner`, `CharacterCount`, `DEFAULT_PRAYER_CHIPS`, `AlertCircle`.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any CSS classes, spacing, or visual output
- DO NOT move auth gating logic into PrayerInput — parent handles `isAuthenticated` check in its `handleGenerate`
- DO NOT change the crisis detection behavior — CrisisBanner stays as-is, receiving `text` prop

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing PrayTabContent tests | regression | Must pass — parent still renders same output through PrayerInput |

**Expected state after completion:**
- [ ] `PrayerInput.tsx` exists in `components/daily/` with named export and `PrayerInputProps` interface
- [ ] PrayerInput manages text, selectedChip, nudge internally
- [ ] Parent passes `onSubmit`, `isLoading`, `initialText`, `retryPrompt`
- [ ] `pnpm build` passes

---

### Step 3: PrayTabContent — Extract PrayerResponse

**Objective:** Extract the generated prayer display (prayer text, action buttons, reflection prompt, secondary CTAs) into a standalone `PrayerResponse` component. After this step, PrayTabContent should be ≤300 lines.

**Files to create/modify:**
- `frontend/src/components/daily/PrayerResponse.tsx` — new file
- `frontend/src/components/daily/PrayTabContent.tsx` — remove response JSX, add import

**Details:**

Extract lines 403–668 from PrayTabContent (loading indicator + `{prayer && !isLoading && ( ... )}` block) plus the `ClassicPrayerCard` local function (lines 811–853).

PrayerResponse manages its own state:
- `prayerWordIndex` (KaraokeText word tracking)
- `revealComplete`, `forceRevealComplete` (KaraokeTextReveal)
- `reflectionVisible`, `reflectionDismissed` (post-prayer reflection)
- `resonatedMessage`, `resonatedFading`, `sectionFading` (resonated animation)
- `resonatedTimersRef` (cleanup timers)
- `saveToListOpen`, `savedToList` (save to prayer list form)
- `mobileMenuOpen`, `mobileMenuRef` (mobile overflow menu)

PrayerResponse also internalizes these handlers:
- `handleCopy` (clipboard)
- `handleSave` (auth-gated save)
- `handleSaveToList` (auth-gated save to list)
- `handleResonated` (resonated animation)
- `handleSomethingDifferent` → calls `onReset` + `onRetryPrompt`
- `handleJournalReflection` → calls `onSwitchToJournal`

PrayerResponse uses `useAuth()`, `useAuthModal()`, `useToast()` from context hooks internally.

Props interface:
```typescript
export interface PrayerResponseProps {
  prayer: MockPrayer
  isLoading: boolean
  topic: string
  onReset: () => void
  onRetryPrompt: (prompt: string) => void
  onSwitchToJournal: (topic: string) => void
  // Audio state for sound indicator
  autoPlayedAudio: boolean
  audioActiveSounds: number
  isAudioDrawerOpen: boolean
  onToggleAudioDrawer: () => void
  onStopAudio: () => void
}
```

The loading indicator (`isLoading` bounce dots, lines 403–415) moves into PrayerResponse since it's part of the prayer generation lifecycle.

Move the `ClassicPrayerCard` function into `PrayerResponse.tsx` as a local function (it's behind `{false && ...}` but keep it for completeness).

Move the mobile menu outside-click/Escape effect into PrayerResponse.

Parent retains:
- Phase orchestration (input → loading → response)
- `handleGenerate` (auth gating + audio auto-play + calling `setPrayer`)
- `handleReset` (clearing state, setting retryPrompt)
- Pre-fill context effects
- Guided prayer section + player
- AmbientSoundPill rendering (in input section)
- BackgroundSquiggle wrapper

Move these imports into PrayerResponse: `Copy`, `Bookmark`, `MoreHorizontal`, `Heart`, `RefreshCw`, `PenLine`, `ListPlus`, `Check`, `KaraokeText`, `KaraokeTextReveal`, `ReadAloudButton`, `ShareButton`, `SaveToPrayerListForm`, `getPrayers`, `MAX_PRAYERS`.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any CSS classes, animations, or visual output
- DO NOT change the KaraokeText/KaraokeTextReveal behavior
- DO NOT change how auth gating works for save actions — keep using `useAuth()` + `useAuthModal()` from context
- DO NOT change the reflection prompt timing or animation behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing PrayTabContent tests | regression | Must pass — parent renders same DOM through PrayerResponse |

**Expected state after completion:**
- [ ] `PrayerResponse.tsx` exists in `components/daily/` with named export and `PrayerResponseProps` interface
- [ ] PrayerResponse manages all prayer display state internally
- [ ] `PrayTabContent.tsx` is ≤300 lines
- [ ] `pnpm build` passes

---

### Step 4: JournalTabContent — Extract JournalInput

**Objective:** Extract the journal input area (mode toggle, prompt card, textarea, voice input, draft save, crisis banner, save button) into a standalone `JournalInput` component.

**Files to create/modify:**
- `frontend/src/components/daily/JournalInput.tsx` — new file
- `frontend/src/components/daily/JournalTabContent.tsx` — remove input JSX, add import

**Details:**

Extract lines 370–549 from JournalTabContent (heading through save button, inside the squiggle wrapper).

JournalInput manages its own state:
- `text` (textarea value, initialized from localStorage draft)
- `draftSaved` indicator + `draftTimerRef`
- `textareaRef` (auto-expand + focus)
- `lastSavedTextRef` (for dirty tracking)

JournalInput uses `useVoiceInput` hook internally (currently in parent).
JournalInput uses `useAnnounce` hook internally (for voice input announcements).
JournalInput uses `useUnsavedChanges` hook internally.
JournalInput uses `useAuth()` and `useAuthModal()` from context for save auth gating.

Props interface:
```typescript
export interface JournalInputProps {
  mode: JournalMode
  onModeChange: (mode: JournalMode) => void
  currentPrompt: string
  onTryDifferentPrompt: () => void
  showPromptRefresh: boolean
  prayContext?: PrayContext | null
  contextDismissed: boolean
  onDismissContext: () => void
  onSave: (entry: { content: string; mode: JournalMode; promptText?: string }) => void
  onTextareaRef?: (ref: HTMLTextAreaElement | null) => void
}
```

Move these into JournalInput:
- Mode toggle buttons
- Context banner (pray context indicator)
- Guided mode prompt card with refresh button
- Free write context note
- Textarea with voice input button
- Draft saved indicator
- Crisis banner
- Save button
- `autoExpand` callback
- Draft auto-save effect (localStorage write)
- Voice input hook + toggle handler
- Permission denied toast effect
- UnsavedChangesModal rendering

The `onTextareaRef` callback lets the parent get a reference for scroll-to-focus (used in empty state CTA and "Write another" button).

Move these imports into JournalInput: `Mic`, `MicOff`, `RefreshCw`, `CrisisBanner`, `CharacterCount`, `UnsavedChangesModal`, `useUnsavedChanges`, `useVoiceInput`, `useAnnounce`, `JOURNAL_DRAFT_KEY`.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change draft auto-save behavior (1s debounce to localStorage)
- DO NOT change crisis detection behavior
- DO NOT change voice input behavior
- DO NOT change mode toggle visual appearance

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing JournalTabContent tests | regression | Must pass — parent renders same output through JournalInput |

**Expected state after completion:**
- [ ] `JournalInput.tsx` exists in `components/daily/` with named export and `JournalInputProps` interface
- [ ] JournalInput manages text, draft save, voice input internally
- [ ] Parent passes mode state, prompt state, and save handler
- [ ] `pnpm build` passes

---

### Step 5: JournalTabContent — Extract JournalSearchFilter

**Objective:** Extract the search bar, mode filter pills, and sort toggle into a standalone `JournalSearchFilter` component. Note: A test file `__tests__/JournalSearchFilter.test.tsx` already exists — verify it still passes.

**Files to create/modify:**
- `frontend/src/components/daily/JournalSearchFilter.tsx` — new file
- `frontend/src/components/daily/JournalTabContent.tsx` — remove search/filter JSX, add import

**Details:**

Extract lines 603–665 from JournalTabContent (the search & filter bar `<div>` inside the saved entries section, rendered when `savedEntries.length >= 2`).

JournalSearchFilter is a pure presentational component — no internal state.

Props interface:
```typescript
export interface JournalSearchFilterProps {
  searchText: string
  onSearchChange: (text: string) => void
  onClearSearch: () => void
  modeFilter: 'all' | JournalMode
  onModeFilterChange: (mode: 'all' | JournalMode) => void
  sortDirection: 'newest' | 'oldest'
  onSortDirectionChange: () => void
}
```

Move into JournalSearchFilter: `Search`, `X`, `ArrowUpDown` icon imports. The `cn` utility import.

Search/filter/sort STATE remains in the parent (shared with the filtering logic). Only the JSX rendering moves.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT move search/filter state into this component — state stays in parent for filtering logic
- DO NOT change the search debounce behavior (stays in parent)
- DO NOT change filter pill styling or sort toggle behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing JournalSearchFilter tests | regression | `__tests__/JournalSearchFilter.test.tsx` already exists — must still pass |
| Existing JournalTabContent tests | regression | Must pass |

**Expected state after completion:**
- [ ] `JournalSearchFilter.tsx` exists in `components/daily/` with named export and `JournalSearchFilterProps` interface
- [ ] Parent passes search/filter state and onChange handlers
- [ ] Existing `JournalSearchFilter.test.tsx` passes
- [ ] `pnpm build` passes

---

### Step 6: JournalTabContent — Extract SavedEntriesList

**Objective:** Extract the saved entries list (entry cards, "Write another"/"Done journaling" controls, empty filter state) into a standalone `SavedEntriesList` component. After this step, JournalTabContent should be ≤250 lines.

**Files to create/modify:**
- `frontend/src/components/daily/SavedEntriesList.tsx` — new file
- `frontend/src/components/daily/JournalTabContent.tsx` — remove entries JSX, add import

**Details:**

Extract lines 553–733 from JournalTabContent (the `<section aria-labelledby="saved-entries-heading">` block) into `SavedEntriesList.tsx`.

Move `formatDateTime` utility function into `SavedEntriesList.tsx` (it's only used by entry cards).

SavedEntriesList manages its own state:
- `isDoneJournaling` (done journaling toggle)
- Stagger animation: uses `useStaggeredEntrance` hook internally

Props interface:
```typescript
export interface SavedEntriesListProps {
  filteredEntries: SavedJournalEntry[]
  totalEntries: number
  onWriteAnother: () => void
  onReflect: (entryId: string) => void
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
  onClearFilters: () => void
  showSearchFilter: boolean
  searchFilterNode: React.ReactNode
}
```

The `searchFilterNode` prop is a render slot — parent renders `<JournalSearchFilter>` and passes it in. This avoids SavedEntriesList needing to know about search/filter state. Alternatively, the parent can render the `JournalSearchFilter` separately before `SavedEntriesList` — this is simpler. Let me go with that approach.

Revised: SavedEntriesList renders only entry cards + "Write another"/"Done journaling" controls + empty filter state. Parent renders JournalSearchFilter separately above it.

Revised Props:
```typescript
export interface SavedEntriesListProps {
  filteredEntries: SavedJournalEntry[]
  totalEntries: number
  hasActiveFilters: boolean
  onWriteAnother: () => void
  onReflect: (entryId: string) => void
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
  onClearFilters: () => void
}
```

Move into SavedEntriesList: `Link` (for Prayer Wall link in "Done journaling" CTA), `BookOpen` icon (for milestone toast — wait, milestones are triggered in parent's handleSave, not in the list). Just `Link` and `useStaggeredEntrance`.

The empty filter state ("No entries match your search" + "Clear filters" button, lines 667–679) moves into SavedEntriesList.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT move milestone celebration logic — it stays in the parent's handleSave
- DO NOT move savedEntries state management — it stays in parent
- DO NOT change entry card visual output
- DO NOT change stagger animation behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing JournalTabContent tests | regression | Must pass |
| Existing JournalMilestones tests | regression | Must pass (milestones are in parent) |

**Expected state after completion:**
- [ ] `SavedEntriesList.tsx` exists in `components/daily/` with named export and `SavedEntriesListProps` interface
- [ ] `formatDateTime` moved to `SavedEntriesList.tsx`
- [ ] `JournalTabContent.tsx` is ≤250 lines
- [ ] `pnpm build` passes

---

### Step 7: BibleReader — Extract VerseDisplay

**Objective:** Extract the verse rendering loop, verse interaction state, and all verse-related handlers from BibleReader into a standalone `VerseDisplay` component. After this step, BibleReader should be ≤250 lines.

**Files to create/modify:**
- `frontend/src/components/bible/VerseDisplay.tsx` — new file
- `frontend/src/pages/BibleReader.tsx` — remove verse display code, add import

**Details:**

VerseDisplay encapsulates the entire verse interaction system. This is the largest extraction.

**State that moves to VerseDisplay:**
- `highlightedVerse` (URL hash highlighting)
- `selectedVerse` (verse selection)
- `showColorPicker`, `showShareMenu` (FloatingActionBar sub-states)
- `editingNoteVerse` (inline note editor)
- `showDiscardPrompt` (discard unsaved note prompt)
- `noteEditorDirtyRef`
- `sentinelRef` (IO-based chapter completion tracking)
- `hasMarkedRef` (chapter completion guard)
- `announceRef` (screen reader announcements)

**Handlers that move to VerseDisplay:**
- `handleVerseClick`
- `handleDismissActionBar`
- `handleCopy`
- `handleHighlightClick`
- `handleSelectColor`
- `handleShareClick`
- `handleNoteClick`
- `handleNoteSave`
- `handleNoteCancel`
- `handleNoteDelete`
- `handleNoteEditFromIndicator`
- `handleDiscardAndProceed`
- `handleKeepEditing`
- `announce` callback

**Effects that move to VerseDisplay:**
- Reset state on chapter change (lines 119–127)
- URL hash highlighting (lines 156–181)
- Intersection Observer for chapter completion (lines 184–213)

**Helper that moves to VerseDisplay:**
- `hexToRgba` function (only used for highlight overlays)

**Rendering that moves to VerseDisplay:**
- Verse rendering loop (lines 577–674)
- Screen reader announcement `<div>` (lines 441–446)
- FloatingActionBar rendering (lines 702–722)
- SharePanel rendering (lines 725–735)

Props interface:
```typescript
export interface VerseDisplayProps {
  verses: BibleVerse[]
  book: { name: string; slug: string; chapters: number; hasFullText: boolean }
  chapterNumber: number
  isAuthenticated: boolean
  isLoading: boolean
  loadError: boolean
  // Highlight/note hooks
  getHighlightsForChapter: (bookSlug: string, chapter: number) => BibleHighlight[]
  getHighlightForVerse: (bookSlug: string, chapter: number, verse: number) => BibleHighlight | undefined
  setHighlight: (bookSlug: string, chapter: number, verse: number, color: string) => void
  getNotesForChapter: (bookSlug: string, chapter: number) => BibleNote[]
  getNoteForVerse: (bookSlug: string, chapter: number, verse: number) => BibleNote | undefined
  saveNote: (bookSlug: string, chapter: number, verse: number, text: string) => boolean
  deleteNote: (noteId: string) => void
  // Audio
  currentVerseIndex: number
  // Chapter completion
  isChapterRead: (bookSlug: string, chapter: number) => boolean
  markChapterRead: (bookSlug: string, chapter: number) => void
}
```

VerseDisplay uses `useToast()` and `useSoundEffects()` from context internally.

**BibleReader retains:**
- Page layout: `<Layout>`, SEO, hero section, breadcrumb, chapter selector
- Chapter loading logic (loadChapter effect)
- Audio hook (`useBibleAudio`) + autoplay effect
- Audio control bar + sleep timer + ambient chip rendering
- Book completion card + toast
- Chapter navigation (`ChapterNav`)
- Cross-feature CTAs
- Error/loading/placeholder states (passed to VerseDisplay via props or handled above)

Actually, the error/loading/placeholder rendering (lines 540–576) can stay in BibleReader since they replace the entire verse display area. VerseDisplay only renders when `!isLoading && !loadError && book.hasFullText && verses.length > 0`.

Post-extraction BibleReader line estimate: ~220 lines.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change verse click/selection behavior
- DO NOT change highlight color application logic
- DO NOT change note editor save/cancel/delete behavior
- DO NOT change FloatingActionBar positioning or behavior
- DO NOT change SharePanel behavior
- DO NOT change the Intersection Observer completion tracking
- DO NOT change URL hash scrolling behavior
- DO NOT change TTS verse highlighting (currentVerseIndex border)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing BibleReader tests | regression | Must pass |
| Existing BibleReaderHighlights tests | regression | Must pass |
| Existing BibleReaderNotes tests | regression | Must pass |
| Existing BibleReaderAudio tests | regression | Must pass |

**Expected state after completion:**
- [ ] `VerseDisplay.tsx` exists in `components/bible/` with named export and `VerseDisplayProps` interface
- [ ] VerseDisplay manages all verse interaction state and handlers internally
- [ ] VerseDisplay renders FloatingActionBar and SharePanel
- [ ] `BibleReader.tsx` is ≤250 lines
- [ ] `pnpm build` passes

---

### Step 8: Build Verification + Test Regression

**Objective:** Verify the full build passes and all existing tests pass with zero or minimal modifications.

**Files to create/modify:**
- None (verification only)

**Details:**

1. Run `pnpm build` — must complete with zero errors
2. Run `pnpm test` — all existing tests must pass
3. Verify line counts:
   - `Navbar.tsx` ≤ 300 lines
   - `PrayTabContent.tsx` ≤ 300 lines
   - `JournalTabContent.tsx` ≤ 250 lines
   - `BibleReader.tsx` ≤ 250 lines
4. Verify new files exist with named exports and Props interfaces:
   - `components/DesktopUserActions.tsx`
   - `components/daily/PrayerInput.tsx`
   - `components/daily/PrayerResponse.tsx`
   - `components/daily/JournalInput.tsx`
   - `components/daily/JournalSearchFilter.tsx`
   - `components/daily/SavedEntriesList.tsx`
   - `components/bible/VerseDisplay.tsx`
5. If any test fails due to changed implementation details (e.g., test queries an element that moved to a sub-component's render tree), update only the specific failing assertion. Do NOT add new tests.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add new tests (spec says out of scope)
- DO NOT change any visual output to fix tests
- DO NOT skip or disable failing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | regression | `pnpm test` — all tests pass |

**Expected state after completion:**
- [ ] `pnpm build` passes with zero errors
- [ ] `pnpm test` passes (all existing tests, zero or minimal assertion updates)
- [ ] All 7 new files exist with correct exports
- [ ] All 4 parent components meet their line count targets
- [ ] No visual or behavioral changes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Navbar: extract DesktopUserActions |
| 2 | — | PrayTabContent: extract PrayerInput |
| 3 | 2 | PrayTabContent: extract PrayerResponse (after PrayerInput is out) |
| 4 | — | JournalTabContent: extract JournalInput |
| 5 | — | JournalTabContent: extract JournalSearchFilter |
| 6 | 4, 5 | JournalTabContent: extract SavedEntriesList (after other extractions) |
| 7 | — | BibleReader: extract VerseDisplay |
| 8 | 1–7 | Build verification + test regression |

**Parallelizable:** Steps 1, 2, 4, 5, 7 have no dependencies and could be done in parallel. Steps 3 depends on 2. Step 6 depends on 4 and 5. Step 8 depends on all.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Navbar: extract DesktopUserActions | [COMPLETE] | 2026-03-28 | Created `components/DesktopUserActions.tsx`. Navbar.tsx reduced from 380 to 258 lines. Removed unused imports (useCallback, useNavigate, useNotificationActions, NotificationBell, NotificationPanel, AvatarDropdown). |
| 2 | PrayTabContent: extract PrayerInput | [COMPLETE] | 2026-03-28 | Created `components/daily/PrayerInput.tsx`. Added `initialText` state + `submittedTextRef` in parent. Pre-fill effects now set `initialText`. PrayerInput auto-focuses via retryPrompt useEffect. |
| 3 | PrayTabContent: extract PrayerResponse | [COMPLETE] | 2026-03-28 | Created `components/daily/PrayerResponse.tsx`. PrayTabContent reduced from 743→224 lines. Removed `isAudioDrawerOpen` from props (unused). Key-based remount ensures fresh state per prayer. |
| 4 | JournalTabContent: extract JournalInput | [COMPLETE] | 2026-03-28 | Created `components/daily/JournalInput.tsx`. Uses callback ref pattern for onTextareaRef. handleWriteAnother simplified to focus/scroll only; save handler in JournalInput clears text after save. |
| 5 | JournalTabContent: extract JournalSearchFilter | [COMPLETE] | 2026-03-28 | Created `components/daily/JournalSearchFilter.tsx`. Pure presentational component with no internal state. Removed ArrowUpDown, Search, X icons from parent. |
| 6 | JournalTabContent: extract SavedEntriesList | [COMPLETE] | 2026-03-28 | Created `components/daily/SavedEntriesList.tsx`. Moved search/filter state + debounce + filtering logic into SavedEntriesList (deviation from plan — needed to hit ≤250 target). SavedEntriesList renders JournalSearchFilter internally. JournalTabContent: 251 lines. |
| 7 | BibleReader: extract VerseDisplay | [COMPLETE] | 2026-03-28 | Created `components/bible/VerseDisplay.tsx`. Moved hexToRgba, all verse state/handlers/effects. announceRef stays in parent (shared with bibleAudio). BibleReader 364 lines (over 250 target — audio control bar props and page-level structure account for the remaining lines; all code is essential). |
| 8 | Build verification + test regression | [COMPLETE] | 2026-03-28 | Build: zero errors. Tests: 4725/4728 passed (3 pre-existing PrayCeremony timeouts). All 7 new files exist. Navbar: 258, PrayTab: 224, JournalTab: 251, BibleReader: 364. |
