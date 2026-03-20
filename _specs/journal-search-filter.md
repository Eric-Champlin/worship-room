# Feature: Journal Search and Filter

## Overview

As journal entries accumulate over days and weeks of faithful reflection, users need a way to revisit specific entries without scrolling through an ever-growing chronological list. This feature adds a search and filter bar to the saved journal entries section in the Journal tab, enabling users to quickly find past entries by content, mode, or date order. It also introduces milestone celebrations that honor the user's journaling consistency — a gentle encouragement that their practice of writing with God is growing into something meaningful.

This directly supports Worship Room's mission of emotional healing through reflection: the ability to search past entries helps users recognize spiritual growth patterns, revisit moments of breakthrough, and return to prompts that were especially meaningful.

## User Stories

- As a **logged-in user**, I want to search through my saved journal entries by text content so that I can quickly find a specific entry or topic I wrote about previously.
- As a **logged-in user**, I want to filter my saved entries by mode (Guided vs Free Write) so that I can browse only the type of journaling I'm looking for.
- As a **logged-in user**, I want to sort my entries newest-first or oldest-first so that I can review them in the order that makes sense for my current need.
- As a **logged-in user**, I want to receive a warm celebration when I reach journaling milestones (10, 25, 50, 100 entries) so that I feel encouraged to keep writing.

## Requirements

### Search & Filter Bar

1. **Visibility condition**: The search/filter bar only appears when the user has 2 or more saved journal entries. With 0 or 1 entries, the bar is hidden entirely.

2. **Text search input**:
   - Displays a Search icon (Lucide `Search`) inside the input on the left side
   - Placeholder text: "Search your entries..."
   - Filters entries in real-time with 300ms debounce after the user stops typing
   - Case-insensitive matching
   - Matches against both the entry `content` text AND the `promptText` (if present on guided entries)
   - If a guided entry's `promptText` matches the search query but the `content` does not, the entry still appears in results
   - The input uses the existing `glow-pulse` cyan border animation on focus (the same `animate-glow-pulse` style used by the journal textarea)
   - A clear button (X icon) appears inside the input when text is present, allowing one-tap clearing

3. **Mode filter pills**:
   - Three pill buttons: "All" (default selected), "Guided", "Free Write"
   - Pill styling: `rounded-full` chip shape
     - Unselected: `bg-white/10` background with white text
     - Selected: `bg-primary/20` background with primary-colored text
   - Selecting a mode filters entries to only those saved in that journal mode
   - "All" shows entries from both modes

4. **Sort toggle**:
   - A single clickable text button displaying the current sort direction
   - Default: "Newest first"
   - Toggle states: "Newest first" / "Oldest first"
   - Accompanied by a Lucide `ArrowUpDown` icon
   - Clicking toggles between the two sort directions
   - Sort applies to the already-filtered result set

5. **Combined filtering logic**: All three controls work together with AND logic:
   - Text search narrows the set
   - Mode filter narrows further
   - Sort toggle orders the narrowed set
   - Example: searching "peace" + filtering "Guided" + sorting "Oldest first" shows only guided entries containing "peace" in chronological order

6. **Empty filter results state**: When the combination of search text + mode filter produces zero matching entries:
   - Display centered message: "No entries match your search"
   - Display a "Clear filters" button below the message
   - "Clear filters" resets: search text to empty, mode to "All", sort to "Newest first"

### Milestone Celebrations

7. **Milestone thresholds**: 10, 25, 50, 100 saved journal entries

8. **Celebration trigger**: Immediately after a successful save, check the total count of saved journal entries. If the count matches a milestone threshold, trigger the celebration.

9. **Celebration type**: Use the existing `celebration-confetti` toast tier (the toast with burst confetti particles) via `showCelebrationToast()`.

10. **Milestone messages**:
    - 10 entries: "10 entries! Your journal is becoming a treasure."
    - 25 entries: "25 entries! You're building a beautiful record of growth."
    - 50 entries: "50 entries! Half a hundred conversations with God."
    - 100 entries: "100 entries! What an incredible journey of reflection."

11. **One-time firing**: Each milestone celebration fires only once, ever. Track which milestones have fired in a `wr_journal_milestones` localStorage key (stored as a JSON array of numbers, e.g., `[10, 25]`). Before showing a celebration, check this array — if the threshold is already present, skip it.

12. **Celebration toast title**: Use "Journal Milestone" as the badge name parameter passed to `showCelebrationToast()`.

13. **Icon**: Use the Lucide `BookOpen` icon rendered in a small circle (matching the pattern used by badge celebration toasts — icon in a colored circle).

## Auth Gating

### Logged-out users:
- Cannot see the search/filter bar (they cannot save entries, so they will never have saved entries to search)
- Cannot trigger milestone celebrations (saving is auth-gated)
- The journal textarea is visible and typeable, but the "Save Entry" button triggers the auth modal — this is existing behavior, unchanged

### Logged-in users:
- Can see the search/filter bar when they have 2+ saved entries
- All search, filter, and sort interactions are available without additional auth prompts
- Milestone celebrations fire after successful saves

### No new auth modal messages are introduced by this feature.

## UX & Design Notes

### Filter Bar Styling
- **Container**: Frosted glass on dark background — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`
- **Position**: Appears directly above the saved entries list, below the "Write another" / "Done journaling" action buttons
- **Internal spacing**: `gap-3` between rows on mobile, `gap-4` between elements on desktop

### Search Input Styling
- **Background**: `bg-white/5` with `border border-white/10`
- **Text color**: White text, white/50 placeholder
- **Focus state**: Uses `animate-glow-pulse` cyan border glow (same as journal textarea)
- **Icon**: Lucide `Search` icon in `text-white/40`, positioned inside the input on the left
- **Clear button**: Lucide `X` icon in `text-white/40`, appears on the right when input has value
- **Border radius**: `rounded-lg`
- **Height**: Standard input height (~40px / `h-10`)

### Mode Pills Styling
- **Shape**: `rounded-full px-3 py-1` (compact pill)
- **Font**: `text-sm font-medium`
- **Unselected**: `bg-white/10 text-white/70` — subtle, not distracting
- **Selected**: `bg-primary/20 text-primary-lt` — clear active state using the primary violet
- **Hover (unselected)**: `bg-white/15` — slight brightening on hover
- **Transition**: `transition-colors duration-150`

### Sort Toggle Styling
- **Appearance**: Text button, not a pill — `text-sm text-white/60 hover:text-white/80`
- **Icon**: Lucide `ArrowUpDown` at 14px, inline with text
- **No background or border** — clean, minimal

### Empty Filter State
- **Container**: Same frosted glass style as the filter bar
- **Message**: `text-white/50 text-sm text-center`
- **"Clear filters" button**: `text-primary-lt text-sm underline hover:text-white` — link-style, not a heavy button

### Milestone Celebration Toast
- Uses the existing `celebration-confetti` toast tier (5s auto-dismiss, burst confetti particles)
- Toast title: "Journal Milestone"
- Toast message: The milestone-specific encouragement text
- Icon: `BookOpen` in a small purple circle (`bg-primary/20 text-primary-lt`)

## Responsive Behavior

### Mobile (< 640px)
- **Search input**: Full width on its own row
- **Mode pills + sort toggle**: Second row below the search input, with pills left-aligned and sort toggle right-aligned (flex with justify-between or similar)
- **Filter bar**: Stacks into 2 rows within the `p-3` container
- **Entry cards**: Full width, single column (unchanged from current)

### Tablet (640px - 1024px)
- **All controls on one row**: Search input takes available space (`flex-1`), mode pills center, sort toggle right
- **Entry cards**: Full width, single column (unchanged)

### Desktop (> 1024px)
- **Single row**: Search input (`flex-1 max-w-sm`), mode pills, sort toggle — all in one horizontal line
- **Entry cards**: Full width within the Journal tab's content area (unchanged)

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature does not introduce any new text input fields. The existing journal textarea already has crisis keyword detection via the `CrisisBanner` component, which is unchanged.
- **User input involved?**: The search input is a filter-only control that queries against already-saved content. It does not submit text to any backend or AI service. No crisis detection needed on the search input.
- **AI-generated content?**: No — milestone messages are hardcoded strings, not AI-generated.

## Auth & Persistence

- **Logged-out (demo mode)**: The search/filter bar never appears (no saved entries exist for logged-out users). Milestone celebrations never fire. Zero persistence — no localStorage writes for logged-out users.
- **Logged-in**: Search/filter state (search text, selected mode, sort direction) is ephemeral React state — not persisted to localStorage. Clearing or navigating away resets all filters to defaults. Milestone tracking (`wr_journal_milestones`) is persisted to localStorage.
- **Route type**: Public (the Journal tab at `/daily?tab=journal` is public, but saving entries is auth-gated, so the search bar only materializes for logged-in users who have saved entries)

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `wr_journal_milestones` | `number[]` (JSON) | Array of milestone thresholds already celebrated, e.g. `[10, 25]` |

## Accessibility

- **Search input**: Has a visible label or `aria-label="Search your entries"`. The Search icon is decorative (`aria-hidden="true"`).
- **Mode filter pills**: Implemented as a group of toggle buttons with `role="group"` and `aria-label="Filter by journal mode"`. Each pill uses `aria-pressed` to indicate selected state.
- **Sort toggle**: Uses `aria-label` that includes current state, e.g., `aria-label="Sort order: newest first. Click to change."` Updated dynamically when toggled.
- **Clear filters button**: Clearly labeled, keyboard-focusable.
- **Empty state message**: Uses `role="status"` so screen readers announce when results change to zero.
- **Touch targets**: All interactive elements meet the 44px minimum touch target size.
- **Keyboard navigation**: Tab through search input, mode pills, sort toggle. Enter/Space activates pills and sort toggle. The filter bar follows a logical tab order.
- **Reduced motion**: Celebration confetti respects `prefers-reduced-motion` (existing behavior in the toast system).

## Acceptance Criteria

### Search & Filter Bar
- [ ] Search/filter bar is hidden when user has 0 or 1 saved entries
- [ ] Search/filter bar appears when user has 2 or more saved entries
- [ ] Search input has Lucide Search icon on the left and placeholder "Search your entries..."
- [ ] Search input shows cyan glow-pulse border animation on focus (matching journal textarea)
- [ ] Search input has a clear (X) button that appears when text is entered
- [ ] Search filters entries in real-time with 300ms debounce
- [ ] Search is case-insensitive
- [ ] Search matches against entry content text
- [ ] Search matches against guided entry promptText (entry shows even if content doesn't match but prompt does)
- [ ] Mode filter has 3 pills: "All" (default), "Guided", "Free Write"
- [ ] Unselected pills use `bg-white/10` styling; selected pill uses `bg-primary/20` styling
- [ ] Mode filter correctly filters entries by their saved journal mode
- [ ] Sort toggle defaults to "Newest first"
- [ ] Sort toggle switches between "Newest first" and "Oldest first" on click
- [ ] Sort toggle has ArrowUpDown icon
- [ ] All three controls (search, mode, sort) work together with AND logic
- [ ] Empty state shows "No entries match your search" when no entries match combined filters
- [ ] "Clear filters" button resets search text, mode to "All", and sort to "Newest first"

### Filter Bar Styling & Responsiveness
- [ ] Filter bar container uses frosted glass styling: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3`
- [ ] On mobile (< 640px): search input is full-width on row 1; mode pills + sort toggle on row 2
- [ ] On desktop (> 1024px): all controls fit in a single row with search input taking flexible width

### Milestone Celebrations
- [ ] Saving the 10th journal entry triggers a `celebration-confetti` toast with message "10 entries! Your journal is becoming a treasure."
- [ ] Saving the 25th entry triggers toast: "25 entries! You're building a beautiful record of growth."
- [ ] Saving the 50th entry triggers toast: "50 entries! Half a hundred conversations with God."
- [ ] Saving the 100th entry triggers toast: "100 entries! What an incredible journey of reflection."
- [ ] Each milestone celebration fires only once (tracked in `wr_journal_milestones` localStorage)
- [ ] Milestone check uses total count of SavedJournalEntry objects in state
- [ ] Celebration toast uses BookOpen icon in a purple circle

### Accessibility
- [ ] Search input has `aria-label="Search your entries"`
- [ ] Mode filter pills use `role="group"` with `aria-label` and individual `aria-pressed` attributes
- [ ] Sort toggle has descriptive `aria-label` reflecting current state
- [ ] Empty state message has `role="status"`
- [ ] All interactive elements meet 44px minimum touch target
- [ ] Keyboard navigation works through all filter controls (Tab, Enter, Space)
- [ ] Confetti animation respects `prefers-reduced-motion`

### Auth & State
- [ ] Search/filter bar is only visible to logged-in users with saved entries (logged-out users never see it)
- [ ] Filter state (search text, mode, sort) is ephemeral — not persisted to localStorage
- [ ] `wr_journal_milestones` persists across sessions in localStorage
- [ ] No new auth modal messages introduced

## Out of Scope

- **Full-text search backend / API search**: Search is client-side only against in-memory entries. Backend search is Phase 3+.
- **Date range filtering**: No date picker or date range filter. Users can sort by date order but not filter to a specific date range.
- **Entry deletion from search results**: No delete functionality. Entry management (edit, delete) is a separate future feature.
- **Tag-based filtering**: No tags or labels on journal entries. This could be a future enhancement.
- **Pagination or infinite scroll**: All matching entries render in a single scrollable list. Pagination may be needed at scale but is not in scope.
- **Saved filter presets**: Users cannot save their filter combinations. Filters reset on navigation.
- **Search highlighting**: Matched search terms are not highlighted within the entry text. This could be a future polish item.
- **Milestones beyond 100**: Only 10, 25, 50, and 100 are milestone thresholds. Higher milestones (250, 500, 1000) are a future enhancement.
- **Persistent journal entry storage to localStorage**: Entries are currently session-only (React state). Persisting entries to localStorage or backend is a separate feature.
