# Large Component Splitting

**Master Plan Reference:** N/A — standalone refactoring task

---

## Overview

Several core components have grown beyond 700 lines, making them difficult to review, test, and maintain. This pure refactoring spec extracts sub-components from the 3 remaining oversized files — PrayTabContent (853 lines), JournalTabContent (751 lines), and BibleReader (738 lines) — to improve readability and enable more targeted testing. The Navbar (380 lines) was already split in a prior spec and only needs verification. No user-facing behavior changes.

## User Story

As a **developer**, I want each component file to be under 300 lines with clearly separated sub-components so that I can reason about, review, and test individual pieces in isolation.

## Requirements

### Current State (as audited)

| Component | Path | Lines | Already Extracted |
|-----------|------|-------|-------------------|
| Navbar.tsx | `components/Navbar.tsx` | 380 | MobileDrawer (346), AvatarDropdown (74), LocalSupportDropdown (220), NotificationPanel (141), SeasonalBanner (88) |
| PrayTabContent.tsx | `components/daily/PrayTabContent.tsx` | 853 | GuidedPrayerSection (106), AmbientSoundPill (228) |
| JournalTabContent.tsx | `components/daily/JournalTabContent.tsx` | 751 | None (useVoiceInput hook exists at 171 lines but no VoiceInputButton component) |
| BibleReader.tsx | `pages/BibleReader.tsx` | 738 | None |

### Functional Requirements

#### 1. Navbar.tsx — Verify Only (target: ≤ 300 lines)

Navbar sub-components were already extracted in a prior spec. Verify:

1. Navbar.tsx imports and renders MobileDrawer, AvatarDropdown, LocalSupportDropdown, NotificationPanel, and SeasonalBanner as separate components
2. Navbar.tsx is ≤ 300 lines after prior extraction
3. If Navbar.tsx is still over 300 lines, identify remaining extractable sections and split them out

#### 2. PrayTabContent.tsx — Extract 2 Sub-Components (target: ≤ 300 lines)

GuidedPrayerSection and AmbientSoundPill are already extracted. Extract:

1. **PrayerInput** (`components/daily/PrayerInput.tsx`) — The textarea with cyan glow border, starter prompt chips, character count, crisis keyword detection (via CrisisBanner), and submit button. Receives `onSubmit` and `isLoading` as props. Manages its own input text state internally.

2. **PrayerResponse** (`components/daily/PrayerResponse.tsx`) — The generated prayer display area including KaraokeText/KaraokeTextReveal, action buttons (Copy, Read Aloud via ReadAloudButton, Save via SaveToPrayerListForm, Share via ShareButton), post-prayer reflection prompt, and the "Journal about this" cross-tab CTA. Receives prayer text, verse reference, and action handler callbacks as props.

After extraction, PrayTabContent.tsx retains: tab layout, heading, phase state management (input → loading → response), orchestration between PrayerInput/PrayerResponse/GuidedPrayerSection/AmbientSoundPill, and completion tracking.

#### 3. JournalTabContent.tsx — Extract 3 Sub-Components (target: ≤ 250 lines)

1. **JournalInput** (`components/daily/JournalInput.tsx`) — The textarea with Guided/Free Write mode toggle, guided prompt card with refresh button, voice input button (using useVoiceInput hook), character count, draft auto-save logic (localStorage), and save button. Receives mode, onSave, and draft state as props.

2. **JournalSearchFilter** (`components/daily/JournalSearchFilter.tsx`) — The search bar, mode filter dropdown, sort toggle, and results count display. Receives filter/search state and onChange handlers as props.

3. **SavedEntriesList** (`components/daily/SavedEntriesList.tsx`) — The list of saved journal entries with entry cards, milestone celebration triggers, and empty state. Receives entries array and current search/filter state as props.

Note: VoiceInputButton does not need to be a separate component — the useVoiceInput hook already encapsulates the Web Speech API logic. JournalInput will use the hook directly.

After extraction, JournalTabContent.tsx retains: tab layout, heading, state management (mode, draft, entries, search/filter), orchestration between JournalInput/SavedEntriesList/JournalSearchFilter, and completion tracking.

#### 4. BibleReader.tsx — Extract 5 Sub-Components (target: ≤ 250 lines)

1. **VerseDisplay** (`components/bible/VerseDisplay.tsx`) — Chapter text rendering with verse numbers, verse tap/click handling, highlight color overlays, and scroll-to-verse logic. Receives chapter data, highlights array, notes array, and onVerseTap handler as props.

2. **VerseActionBar** (`components/bible/VerseActionBar.tsx`) — Floating action bar that appears on verse selection with 4 highlight color buttons, note button, copy button, share button. Receives selected verse, current highlight state, and action handlers as props.

3. **AudioControlBar** (`components/bible/AudioControlBar.tsx`) — Sticky TTS playback controls with play/pause toggle, speed selector, voice toggle, progress indicator, sleep timer button, and ambient sound chip. Receives playback state object and control handler callbacks as props.

4. **ChapterNavigation** (`components/bible/ChapterNavigation.tsx`) — Previous/next chapter buttons and chapter info display (book name, chapter number). Receives current book, chapter, and navigation handler callbacks as props.

5. **HighlightsNotesPanel** (`components/bible/HighlightsNotesPanel.tsx`) — Collapsible "My Highlights & Notes" section showing the user's highlights and notes for the current chapter. Receives highlights and notes arrays as props.

Note: BibleReader.tsx is in `pages/` but its sub-components go in `components/bible/` (create directory if needed — check if it already exists).

After extraction, BibleReader.tsx retains: page layout, chapter loading logic (lazy JSON), verse selection state, audio state coordination, and renders the 5 extracted sub-components.

### Extraction Rules (apply to all)

1. Each sub-component gets its own file in the appropriate directory
2. Each sub-component exports a typed `Props` interface alongside the component
3. Each sub-component is a default export
4. State only relevant to one sub-component moves into that sub-component (local state)
5. State shared between sub-components stays in the parent, passed as props (lifted state)
6. Event handlers affecting only one sub-component move into that sub-component
7. Event handlers affecting multiple sub-components stay in the parent as callbacks
8. Custom hooks used by only one sub-component move with that sub-component
9. Custom hooks used for orchestration stay in the parent

### Non-Functional Requirements

- **Zero visual changes**: The rendered HTML must be identical before and after extraction
- **Zero behavior changes**: No feature behavior, user interactions, or component APIs change
- **Test stability**: Existing tests must pass without modification (since parents still render the same output). If any test references internal implementation details that change, update only those specific assertions
- **Build stability**: `pnpm build` must succeed with zero errors after extraction

## Auth Gating

N/A — This is a pure refactoring spec. No new interactive elements are introduced. All existing auth gating behavior is preserved exactly as-is since the parent components still orchestrate the same child elements.

## Responsive Behavior

N/A — No responsive behavior changes. All breakpoint-specific layouts are preserved exactly as they exist in the current components. The extraction moves JSX into sub-component files but does not alter any responsive classes or layout logic.

## AI Safety Considerations

N/A — No changes to crisis detection, content filtering, or safety guardrails. All existing CrisisBanner integration in PrayTabContent and JournalTabContent is preserved. The crisis keyword detection logic stays wherever it currently lives (if in the parent, it stays in the parent and results are passed as props; if inline with the input, it moves with the input sub-component).

## Auth & Persistence

N/A — No changes to authentication, data persistence, or localStorage usage. All existing localStorage reads/writes are preserved in whichever component currently owns them.

## Completion & Navigation

N/A — No changes to completion tracking or navigation. All existing completion signals are preserved in the parent orchestrators.

## Design Notes

N/A — No visual changes. No new components, patterns, or styles introduced. This is a code organization refactoring only.

## Out of Scope

- Adding new tests for individual sub-components (optional follow-up, not required)
- Changing any visual output, styles, or layout
- Changing any feature behavior or user interactions
- Refactoring hooks or utilities (only moving them with their consumer)
- Splitting components not listed above (MobileDrawer at 346 lines, AmbientSoundPill at 228 lines, etc. are acceptable sizes)
- Changing component public APIs or prop interfaces of parent components
- Any backend changes
- Dark mode or theming changes

## Acceptance Criteria

- [ ] **Navbar.tsx** is ≤ 300 lines and imports all 5 previously extracted sub-components (MobileDrawer, AvatarDropdown, LocalSupportDropdown, NotificationPanel, SeasonalBanner)
- [ ] **PrayTabContent.tsx** is ≤ 300 lines after extracting PrayerInput and PrayerResponse
- [ ] **PrayerInput.tsx** exists in `components/daily/` with exported Props interface and default export
- [ ] **PrayerResponse.tsx** exists in `components/daily/` with exported Props interface and default export
- [ ] **JournalTabContent.tsx** is ≤ 250 lines after extracting JournalInput, JournalSearchFilter, and SavedEntriesList
- [ ] **JournalInput.tsx** exists in `components/daily/` with exported Props interface and default export
- [ ] **JournalSearchFilter.tsx** exists in `components/daily/` with exported Props interface and default export
- [ ] **SavedEntriesList.tsx** exists in `components/daily/` with exported Props interface and default export
- [ ] **BibleReader.tsx** is ≤ 250 lines after extracting VerseDisplay, VerseActionBar, AudioControlBar, ChapterNavigation, and HighlightsNotesPanel
- [ ] **VerseDisplay.tsx** exists in `components/bible/` with exported Props interface and default export
- [ ] **VerseActionBar.tsx** exists in `components/bible/` with exported Props interface and default export
- [ ] **AudioControlBar.tsx** exists in `components/bible/` with exported Props interface and default export
- [ ] **ChapterNavigation.tsx** exists in `components/bible/` with exported Props interface and default export
- [ ] **HighlightsNotesPanel.tsx** exists in `components/bible/` with exported Props interface and default export
- [ ] `pnpm build` completes with zero errors
- [ ] `pnpm test` passes — all existing tests pass without modification (or with minimal assertion updates if DOM structure changed)
- [ ] No visual output changes — rendered HTML is identical before and after extraction
- [ ] Each extracted sub-component manages only its own local state; shared state is lifted to parent
- [ ] Each extracted sub-component has a typed Props interface (not `any` or inline types)
