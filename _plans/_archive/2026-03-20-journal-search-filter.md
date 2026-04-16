# Implementation Plan: Journal Search and Filter

**Spec:** `_specs/journal-search-filter.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/journal-search-filter`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Components: `frontend/src/components/daily/` — journal lives here
- Types: `frontend/src/types/daily-experience.ts` — `SavedJournalEntry`, `JournalMode`
- Constants: `frontend/src/constants/daily-experience.ts` — journal localStorage keys
- Hooks: `frontend/src/hooks/` — `useAuth`, `useFaithPoints`, `useCompletionTracking`
- Tests: `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`
- Toast: `frontend/src/components/ui/Toast.tsx` — `showCelebrationToast(badgeName, message, type, icon)`

### Key Existing Patterns

**JournalTabContent.tsx** (the single file this feature primarily modifies):
- State: `savedEntries: SavedJournalEntry[]` (line 76), `mode: JournalMode` (line 52)
- Save flow: `handleSave()` (lines 147-166) — creates entry, prepends to `savedEntries`, calls `showToast('Entry saved')`
- Entries render: lines 408-452 — `savedEntries.map()` producing `<article>` cards
- Auth gating: `useAuth()` + `useAuthModal()` pattern (lines 43-44, 149-151)
- No search/filter currently exists

**SavedJournalEntry type** (`types/daily-experience.ts:94-101`):
```typescript
interface SavedJournalEntry {
  id: string
  content: string
  timestamp: string
  mode: JournalMode  // 'guided' | 'free'
  promptText?: string
  reflection?: string
}
```

**Debounce pattern** (no `useDebounce` hook exists): Manual `useRef<ReturnType<typeof setTimeout>>` + `clearTimeout`/`setTimeout` in useEffect. See `JournalTabContent.tsx:73,86-99` (1000ms draft save) and `SearchControls.tsx:32,90-101` (500ms).

**Toast celebration icon pattern** (`useCelebrationQueue.ts:140-154`):
```tsx
const iconElement = createElement(
  'div',
  { className: `flex h-8 w-8 items-center justify-center rounded-full ${iconConfig.bgColor}` },
  createElement(IconComponent, { className: `h-4 w-4 ${iconConfig.textColor}` }),
)
await showCelebrationToast(badgeName, message, tierToToastType(tier), iconElement)
```

**Test wrapping pattern** (`__tests__/JournalTabContent.test.tsx:67-79`):
```tsx
<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <AuthProvider>
    <ToastProvider>
      <AuthModalProvider>
        <JournalTabContent />
      </AuthModalProvider>
    </ToastProvider>
  </AuthProvider>
</MemoryRouter>
```

Required mocks: `AudioProvider` (useAudioState, useAudioDispatch), `useScenePlayer`, `useFaithPoints`.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Search/filter bar visibility | Only visible to logged-in users with 2+ saved entries | Step 1 | `isAuthenticated` + `savedEntries.length >= 2` conditional render |
| Milestone celebrations | Only fire after authenticated save | Step 2 | Existing `handleSave()` already gates on `isAuthenticated` |

No new auth modal messages are introduced by this feature. All auth gating leverages existing checks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Filter bar container | background | `bg-white/5 backdrop-blur-sm` | Spec (frosted glass on dark = dashboard card style) |
| Filter bar container | border | `border border-white/10 rounded-xl p-3` | Spec |
| Search input bg | background | `bg-white/5` | Spec |
| Search input border | border | `border border-white/10` | Spec |
| Search input focus | animation | `animate-glow-pulse` (2.5s infinite, cyan/violet) | `tailwind.config.js:82`, design-system.md |
| Search input text | color | `text-white placeholder:text-white/50` | Spec |
| Search input radius | border-radius | `rounded-lg` | Spec |
| Search input height | height | `h-10` (40px) | Spec |
| Mode pill (unselected) | background + text | `bg-white/10 text-white/70` | Spec |
| Mode pill (selected) | background + text | `bg-primary/20 text-primary-lt` | Spec |
| Mode pill (hover) | background | `hover:bg-white/15` | Spec |
| Mode pill shape | border-radius + padding + font | `rounded-full px-3 py-1 text-sm font-medium` | Spec |
| Sort toggle | text style | `text-sm text-white/60 hover:text-white/80` | Spec |
| Empty state message | text | `text-white/50 text-sm text-center` | Spec |
| Clear filters link | text | `text-primary-lt text-sm underline hover:text-white` | Spec |
| Celebration icon | circle | `bg-primary/20 text-primary-lt` — BookOpen icon | Spec |

---

## Design System Reminder

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- All tabs share `max-w-2xl` container width
- Glow-pulse uses cyan `#00D4FF` + violet `#8B5CF6`, defined in `tailwind.config.js`
- Journal entry cards use `rounded-lg border border-gray-200 bg-white p-4` (lighter card style, not frosted glass)
- The filter bar uses dark frosted glass style because it sits on the light `neutral-bg` background — this contrasts with the entry cards which are `bg-white`
- `cn()` from `@/lib/utils` for conditional classNames
- All interactive elements need `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

**Wait — spec styling conflict:** The filter bar uses frosted glass (`bg-white/5 backdrop-blur-sm border border-white/10`) but the journal tab content area has a light `neutral-bg` background. Frosted glass on a light background will look nearly invisible. However, the spec explicitly defines these values, so follow them exactly. The filter bar sits in the saved entries section which is below the squiggle background — the actual visual context should work because the parent `max-w-2xl` container sits on the page's neutral background. The spec author chose these values intentionally.

**[UNVERIFIED]** Filter bar visual appearance on light background may need adjustment after visual testing.
→ To verify: Run `/verify-with-playwright` and check contrast
→ If wrong: Consider `bg-white/80 backdrop-blur-sm border border-gray-200` or similar light-mode frosted glass

---

## Shared Data Models

No master spec plan applicable.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_journal_milestones` | Read/Write | Array of milestone thresholds already celebrated (e.g., `[10, 25]`) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Search input full-width row 1; mode pills + sort toggle row 2 (flex justify-between) |
| Tablet | >= 640px | All controls single row: search flex-1, pills center, sort right |
| Desktop | >= 1024px | Single row: search `flex-1 max-w-sm`, pills, sort toggle |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Action buttons ("Write another"/"Done journaling") → Filter bar | `space-y-6` (24px, inherits from parent `space-y-6`) | JournalTabContent.tsx:359 |
| Filter bar → first entry card | `space-y-6` (24px) | Same parent `space-y-6` |
| Entry card → entry card | `space-y-6` (24px) | Same parent |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file exists at `_specs/journal-search-filter.md`
- [x] `JournalTabContent.tsx` is the primary file to modify
- [x] `showCelebrationToast` exists in Toast system with `celebration-confetti` type
- [x] `BookOpen` is already imported in `badge-icons.ts` — available from `lucide-react`
- [x] No `useDebounce` hook exists — use manual ref pattern
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from spec + design-system.md
- [ ] **[UNVERIFIED]** Frosted glass filter bar on light background contrast — verify visually
- [x] `animate-glow-pulse` is available in Tailwind config for search input focus

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put filter/search logic | Inline in `JournalTabContent.tsx`, not a separate component | Filter bar is tightly coupled to `savedEntries` state; extracting would require prop drilling or lifting state. Keeps it simple. |
| Debounce approach | Manual `useRef` + `setTimeout` (300ms) | Matches codebase pattern (no `useDebounce` hook). Spec requires 300ms. |
| Milestone localStorage key | `wr_journal_milestones` | Matches `wr_` prefix convention. Spec-defined key. |
| Milestone check timing | After `setSavedEntries` in `handleSave` | Use the new array length (prev.length + 1) to check threshold. |
| Filter state persistence | Ephemeral React state only | Spec explicitly says "not persisted to localStorage." |
| Filter bar position | Inside `<section>` after action buttons, before entry cards | Spec: "directly above the saved entries list, below the action buttons." |
| Entry cards render from filtered list | `filteredEntries` derived via `useMemo` | Search + mode filter + sort applied as chain. |

---

## Implementation Steps

### Step 1: Search & Filter Bar UI + Filtering Logic

**Objective:** Add the search input, mode filter pills, sort toggle, and filtering logic to `JournalTabContent.tsx`. Add the empty filter results state.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — Add filter state, filter bar UI, filtering logic, update entries rendering

**Details:**

1. **Add imports:** `Search`, `X`, `ArrowUpDown` from `lucide-react`. (Already imported: `cn` from `@/lib/utils`.)

2. **Add filter state** (after existing state declarations, around line 77):
   ```typescript
   const [searchText, setSearchText] = useState('')
   const [debouncedSearch, setDebouncedSearch] = useState('')
   const [modeFilter, setModeFilter] = useState<'all' | JournalMode>('all')
   const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest')
   ```

3. **Add search debounce effect** (300ms, manual ref pattern):
   ```typescript
   const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
   useEffect(() => {
     if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
     searchTimerRef.current = setTimeout(() => {
       setDebouncedSearch(searchText)
     }, 300)
     return () => {
       if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
     }
   }, [searchText])
   ```

4. **Add `filteredEntries` useMemo** (after filter state):
   ```typescript
   const filteredEntries = useMemo(() => {
     let entries = savedEntries

     // Text search (case-insensitive, matches content + promptText)
     if (debouncedSearch.trim()) {
       const query = debouncedSearch.toLowerCase()
       entries = entries.filter(
         (e) =>
           e.content.toLowerCase().includes(query) ||
           (e.promptText && e.promptText.toLowerCase().includes(query)),
       )
     }

     // Mode filter
     if (modeFilter !== 'all') {
       entries = entries.filter((e) => e.mode === modeFilter)
     }

     // Sort
     if (sortDirection === 'oldest') {
       entries = [...entries].reverse()
     }

     return entries
   }, [savedEntries, debouncedSearch, modeFilter, sortDirection])
   ```

5. **Add `clearFilters` handler:**
   ```typescript
   const clearFilters = () => {
     setSearchText('')
     setDebouncedSearch('')
     setModeFilter('all')
     setSortDirection('newest')
   }
   ```

6. **Add filter bar JSX** — Insert inside the `<section>` after the action buttons div (line ~382) and before the entry cards `{savedEntries.map(...)}`. Only render when `savedEntries.length >= 2`:
   ```tsx
   {savedEntries.length >= 2 && (
     <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
         {/* Search input */}
         <div className="relative flex-1 sm:max-w-none lg:max-w-sm">
           <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
           <input
             type="text"
             value={searchText}
             onChange={(e) => setSearchText(e.target.value)}
             placeholder="Search your entries..."
             aria-label="Search your entries"
             className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-8 text-sm text-white placeholder:text-white/50 focus:animate-glow-pulse focus:outline-none"
           />
           {searchText && (
             <button
               type="button"
               onClick={() => { setSearchText(''); setDebouncedSearch('') }}
               className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
               aria-label="Clear search"
             >
               <X className="h-4 w-4" />
             </button>
           )}
         </div>

         {/* Mode pills + Sort toggle row */}
         <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
           {/* Mode filter pills */}
           <div role="group" aria-label="Filter by journal mode" className="flex gap-1.5">
             {(['all', 'guided', 'free'] as const).map((m) => (
               <button
                 key={m}
                 type="button"
                 onClick={() => setModeFilter(m)}
                 aria-pressed={modeFilter === m}
                 className={cn(
                   'min-h-[44px] rounded-full px-3 py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                   modeFilter === m
                     ? 'bg-primary/20 text-primary-lt'
                     : 'bg-white/10 text-white/70 hover:bg-white/15',
                 )}
               >
                 {m === 'all' ? 'All' : m === 'guided' ? 'Guided' : 'Free Write'}
               </button>
             ))}
           </div>

           {/* Sort toggle */}
           <button
             type="button"
             onClick={() => setSortDirection((d) => d === 'newest' ? 'oldest' : 'newest')}
             aria-label={`Sort order: ${sortDirection === 'newest' ? 'newest first' : 'oldest first'}. Click to change.`}
             className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/60 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
           >
             <ArrowUpDown className="h-3.5 w-3.5" />
             {sortDirection === 'newest' ? 'Newest first' : 'Oldest first'}
           </button>
         </div>
       </div>
     </div>
   )}
   ```

7. **Update entry rendering** — Change `{savedEntries.map((entry) => (` to `{filteredEntries.map((entry) => (`.

8. **Add empty filter state** — After the filter bar, before the entries map, add:
   ```tsx
   {filteredEntries.length === 0 && savedEntries.length >= 2 && (
     <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm" role="status">
       <p className="text-sm text-white/50">No entries match your search</p>
       <button
         type="button"
         onClick={clearFilters}
         className="mt-2 text-sm text-primary-lt underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
       >
         Clear filters
       </button>
     </div>
   )}
   ```

9. **Also update `hasSavedEntries`** — Currently used to show/hide the entire saved entries section. Keep it: `const hasSavedEntries = savedEntries.length > 0`. The filter bar visibility uses `savedEntries.length >= 2` separately.

**Auth gating:**
- Filter bar renders only when `savedEntries.length >= 2` — since saving requires auth, logged-out users will never have saved entries, so the bar is inherently auth-gated.

**Responsive behavior:**
- Mobile (< 640px): Search full-width row 1, pills + sort toggle row 2 (flex-col on outer, flex justify-between on inner)
- Tablet (>= 640px): Single row via `sm:flex-row sm:items-center`
- Desktop (>= 1024px): Single row, search `lg:max-w-sm`

**Guardrails (DO NOT):**
- DO NOT persist filter state to localStorage (spec says ephemeral)
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT modify the existing entry card rendering (only change the data source from `savedEntries` to `filteredEntries`)
- DO NOT add crisis detection to the search input (spec explicitly says not needed)
- DO NOT extract a separate component — keep inline in JournalTabContent

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| filter bar hidden with 0 entries | integration | Render with no saved entries → filter bar not in DOM |
| filter bar hidden with 1 entry | integration | Save 1 entry → filter bar not in DOM |
| filter bar visible with 2+ entries | integration | Save 2 entries → filter bar visible |
| search filters by content | integration | Save entries, type in search → only matching entries shown |
| search filters by promptText | integration | Save guided entry with prompt, search prompt text → entry shown |
| search is case-insensitive | integration | Save entry with "Peace", search "peace" → entry shown |
| search debounce 300ms | integration | Type text, verify entries don't filter immediately, advance timers, verify filter applies |
| clear search button appears/works | integration | Type text → X button visible, click → search cleared |
| mode filter pills default "All" | integration | "All" pill has aria-pressed=true by default |
| mode filter "Guided" | integration | Click "Guided" → only guided entries shown |
| mode filter "Free Write" | integration | Click "Free Write" → only free entries shown |
| sort toggle default "Newest first" | integration | Default sort label is "Newest first" |
| sort toggle switches direction | integration | Click sort → label changes to "Oldest first", entries reorder |
| combined filtering (AND logic) | integration | Search + mode filter → intersection of both |
| empty filter state shows message | integration | Filter to zero results → "No entries match your search" visible |
| clear filters resets all | integration | Set filters, click "Clear filters" → all reset to defaults |
| search input has aria-label | unit | `aria-label="Search your entries"` present |
| mode pills have role="group" | unit | Filter pills group has `role="group"` |
| sort toggle has descriptive aria-label | unit | Dynamic aria-label includes current sort state |
| empty state has role="status" | unit | Empty state container has `role="status"` |
| filter bar not visible for logged-out users | integration | Don't set auth → no filter bar (because no saved entries possible) |

**Expected state after completion:**
- [ ] Filter bar appears above entry cards when 2+ entries saved
- [ ] Search, mode filter, and sort toggle work together with AND logic
- [ ] Empty filter state shows clear message with reset button
- [ ] All accessibility attributes present
- [ ] Responsive layout matches spec (mobile 2-row, desktop 1-row)

---

### Step 2: Milestone Celebrations

**Objective:** Add milestone celebration toasts (10, 25, 50, 100 entries) that fire after journal entry save, with one-time tracking via localStorage.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — Add milestone check in `handleSave`, add constants
- `frontend/src/constants/daily-experience.ts` — Add `JOURNAL_MILESTONES_KEY` constant

**Details:**

1. **Add constant** in `frontend/src/constants/daily-experience.ts`:
   ```typescript
   export const JOURNAL_MILESTONES_KEY = 'wr_journal_milestones'
   ```

2. **Add milestone definitions** at the top of `JournalTabContent.tsx` (above the component):
   ```typescript
   const JOURNAL_MILESTONES: Record<number, string> = {
     10: '10 entries! Your journal is becoming a treasure.',
     25: '25 entries! You\'re building a beautiful record of growth.',
     50: '50 entries! Half a hundred conversations with God.',
     100: '100 entries! What an incredible journey of reflection.',
   }
   ```

3. **Import `BookOpen`** from `lucide-react` (add to existing import).

4. **Import `JOURNAL_MILESTONES_KEY`** from `@/constants/daily-experience`.

5. **Update `handleSave`** — After the existing `showToast('Entry saved')` call, add milestone check:
   ```typescript
   // Milestone celebration check
   const newCount = savedEntries.length + 1 // current savedEntries + new entry being added
   const milestoneMessage = JOURNAL_MILESTONES[newCount]
   if (milestoneMessage) {
     const celebrated: number[] = JSON.parse(
       localStorage.getItem(JOURNAL_MILESTONES_KEY) ?? '[]',
     )
     if (!celebrated.includes(newCount)) {
       celebrated.push(newCount)
       localStorage.setItem(JOURNAL_MILESTONES_KEY, JSON.stringify(celebrated))
       const milestoneIcon = (
         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
           <BookOpen className="h-4 w-4 text-primary-lt" />
         </div>
       )
       showCelebrationToast(
         'Journal Milestone',
         milestoneMessage,
         'celebration-confetti',
         milestoneIcon,
       )
     }
   }
   ```

6. **Update `useToast` destructuring** — Change `const { showToast } = useToast()` to `const { showToast, showCelebrationToast } = useToast()`.

**Auth gating:**
- Milestone check is inside `handleSave()` which already gates on `isAuthenticated` (lines 149-151). No additional auth check needed.

**Guardrails (DO NOT):**
- DO NOT write to `wr_journal_milestones` for logged-out users (impossible since save is auth-gated)
- DO NOT use the milestone count from `filteredEntries` — always use `savedEntries.length` (total count, not filtered)
- DO NOT fire milestones more than once (check localStorage array before showing)
- DO NOT show milestone toast AND regular toast simultaneously — the regular `showToast('Entry saved')` is fine alongside the celebration toast (they render in different positions: top-right vs bottom)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| milestone at 10 entries fires celebration toast | integration | Save 10 entries → `showCelebrationToast` called with correct message |
| milestone at 25 entries | integration | Save 25 entries → correct message |
| milestone fires only once | integration | Save 10th entry, save 11th → celebration only on 10th |
| milestone tracked in localStorage | integration | Save 10th → `wr_journal_milestones` contains `[10]` |
| non-milestone saves don't fire celebration | integration | Save 5th entry → no celebration toast |
| milestone uses BookOpen icon | integration | Verify icon element passed to `showCelebrationToast` |
| milestone uses 'celebration-confetti' type | integration | Verify type parameter |
| milestone uses 'Journal Milestone' as badge name | integration | Verify first parameter |
| previously celebrated milestones skip | integration | Pre-set localStorage with `[10]`, save 10th again → no celebration |

**Expected state after completion:**
- [ ] 10th, 25th, 50th, 100th saves trigger celebration-confetti toast
- [ ] Each milestone fires only once (tracked in `wr_journal_milestones`)
- [ ] Toast shows "Journal Milestone" title with BookOpen icon in purple circle
- [ ] Milestone messages match spec exactly
- [ ] Regular "Entry saved" toast still fires alongside milestone

---

### Step 3: Tests

**Objective:** Write comprehensive tests for the search/filter bar and milestone celebrations.

**Files to create/modify:**
- `frontend/src/components/daily/__tests__/JournalSearchFilter.test.tsx` — New test file for search/filter
- `frontend/src/components/daily/__tests__/JournalMilestones.test.tsx` — New test file for milestones

**Details:**

1. **Test file structure** — Use the same provider wrapping and mock patterns from the existing `JournalTabContent.test.tsx`:

   ```typescript
   // Required mocks (same as existing test):
   vi.mock('@/components/audio/AudioProvider', () => ({ ... }))
   vi.mock('@/hooks/useScenePlayer', () => ({ ... }))
   vi.mock('@/hooks/useFaithPoints', () => ({ ... }))

   // Auth setup in beforeEach:
   localStorage.setItem('wr_auth_simulated', 'true')
   localStorage.setItem('wr_user_name', 'Eric')
   ```

2. **Helper function** to save N entries quickly:
   ```typescript
   async function saveEntries(user: ReturnType<typeof userEvent.setup>, count: number) {
     for (let i = 0; i < count; i++) {
       const textarea = screen.getByLabelText('Journal entry')
       await user.type(textarea, `Entry ${i + 1} content`)
       await user.click(screen.getByRole('button', { name: /save entry/i }))
     }
   }
   ```

3. **Search/filter tests** (`JournalSearchFilter.test.tsx`):
   - Use `vi.useFakeTimers()` for debounce testing (advance by 300ms)
   - Save entries with known content/modes to test filtering
   - For guided entries: switch to guided mode before saving to ensure `promptText` is set
   - Test all accessibility attributes via `getByRole` and `getByLabelText`

4. **Milestone tests** (`JournalMilestones.test.tsx`):
   - Mock `showCelebrationToast` by spying on the toast context
   - Since `showCelebrationToast` is provided by `ToastProvider`, either:
     - Create a custom wrapper that exposes the mock, OR
     - Use `vi.mock('@/components/ui/Toast')` to mock `useToast` and track calls
   - Recommended approach: Mock `useToast` to return mock functions and assert calls:
     ```typescript
     const mockShowCelebrationToast = vi.fn().mockResolvedValue(undefined)
     vi.mock('@/components/ui/Toast', () => ({
       useToast: () => ({
         showToast: vi.fn(),
         showCelebrationToast: mockShowCelebrationToast,
       }),
       ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
     }))
     ```
   - Test each milestone threshold individually (may need to batch-save to reach counts efficiently)
   - For the 10-entry test: call `saveEntries(user, 10)` and assert `mockShowCelebrationToast` was called once with correct args
   - For one-time check: pre-populate `localStorage` with `wr_journal_milestones: [10]` and verify no celebration at 10

**Guardrails (DO NOT):**
- DO NOT skip `act()` warnings — wrap async state updates properly
- DO NOT use snapshot tests — use explicit assertions
- DO NOT import internal Toast state — only test through the component interface
- DO NOT make tests depend on each other — each test should start clean

**Test specifications:**

| Test File | Test Count (approx.) | Coverage |
|-----------|---------------------|----------|
| JournalSearchFilter.test.tsx | ~20 tests | Filter bar visibility, search, mode pills, sort, combined, empty state, accessibility |
| JournalMilestones.test.tsx | ~9 tests | Milestone triggers at 10/25/50/100, one-time firing, localStorage tracking, icon/type verification |

**Expected state after completion:**
- [ ] All tests pass with `pnpm test`
- [ ] Filter bar behavior fully covered (visibility, search, mode, sort, combined, empty state)
- [ ] Milestone celebrations fully covered (triggers, one-time, localStorage, correct parameters)
- [ ] Accessibility assertions included (aria-label, role, aria-pressed)
- [ ] No flaky tests (fake timers for debounce, proper async handling)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Search & Filter Bar UI + Logic |
| 2 | — | Milestone Celebrations |
| 3 | 1, 2 | Tests for both features |

Steps 1 and 2 can be implemented in parallel (both modify `JournalTabContent.tsx` but different sections). Step 3 must come after both.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Search & Filter Bar UI + Logic | [COMPLETE] | 2026-03-20 | Modified `JournalTabContent.tsx`: added filter state, debounce, filteredEntries useMemo, clearFilters, filter bar JSX, empty filter state, updated entry rendering to use filteredEntries. Added imports: ArrowUpDown, Search, X from lucide-react. |
| 2 | Milestone Celebrations | [COMPLETE] | 2026-03-20 | Modified `JournalTabContent.tsx`: added JOURNAL_MILESTONES constant, BookOpen import, showCelebrationToast destructuring, milestone check in handleSave. Added `JOURNAL_MILESTONES_KEY` to `daily-experience.ts`. |
| 3 | Tests | [COMPLETE] | 2026-03-20 | Created `JournalSearchFilter.test.tsx` (21 tests) and `JournalMilestones.test.tsx` (9 tests). Used fireEvent for fast saves in search tests, userEvent in milestone tests. All 31 tests pass. |
