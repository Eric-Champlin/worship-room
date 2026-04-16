# Implementation Plan: BB-3b Chapter Picker (Completion Pass)

**Spec:** `_specs/bb-3b-chapter-picker.md`
**Date:** 2026-04-07
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — standalone spec within Bible Redesign wave

---

## Architecture Context

### Project Structure

Bible-related files on the `bible-redesign` branch (after BB-2, BB-4, BB-5):

- **Pages:** `frontend/src/pages/BibleReader.tsx` (~394 lines) — immersive reader wrapping `BibleDrawerProvider`, mounts `BibleDrawer` + `BooksDrawerContent`, `ReaderChrome`, `TypographySheet`, `ReaderBody`, `ReaderChapterNav`, `VerseJumpPill`, `FocusVignette`
- **Pages:** `frontend/src/pages/BibleLanding.tsx` — landing page, also wraps `BibleDrawerProvider`, mounts drawer
- **Drawer:** `frontend/src/components/bible/BibleDrawerProvider.tsx` (33 lines) — Context with `{ isOpen, open, close, toggle, triggerRef }`. No view-stack yet.
- **Drawer:** `frontend/src/components/bible/BibleDrawer.tsx` (101 lines) — Right-side slide-in shell (`w-full sm:w-[420px] lg:w-[480px]`), backdrop, scroll lock, focus trap (`useFocusTrap`), swipe-right close, `animate-drawer-slide-in` (300ms cubic-bezier). Returns `null` when `!isOpen`.
- **Drawer Content:** `frontend/src/components/bible/BooksDrawerContent.tsx` (337 lines) — OT/NT tabs, search, categorized book grid, progress bars. `onSelectBook(slug)` callback currently navigates to `/bible/{slug}/1` and closes drawer.
- **Reader Chrome:** `frontend/src/components/bible/reader/ReaderChrome.tsx` (119 lines) — Center label `"{bookName} {chapter}"` is a `<button>` calling `bibleDrawer.open()` with `aria-label="Open chapter picker"`. Books icon also calls `bibleDrawer.open()`.
- **Orphan:** `frontend/src/components/bible/ChapterGrid.tsx` (49 lines) — Uses `<Link>`, 5/6/8/10/12 columns, no dot indicators, no glow ring. Not mounted anywhere. To be deleted.
- **Constants:** `frontend/src/constants/bookMetadata.ts` — `BOOK_METADATA` (66 entries with `slug`, `name`, `testament`, `category`, `chapterCount`, `wordCount`, `abbreviations`), `formatReadingTime()`, `getReadingTimeMinutes()`
- **Constants:** `frontend/src/constants/bible.ts` — `BIBLE_BOOKS` (66 books), `BIBLE_PROGRESS_KEY = 'wr_bible_progress'`
- **Hooks:** `useBibleProgress.ts` — `{ progress, markChapterRead, getBookProgress, isChapterRead }`. Read-only getters return empty when not authenticated.
- **State:** `frontend/src/lib/bible/landingState.ts` — `getLastRead(): LastRead | null` reads `wr_bible_last_read`
- **Types:** `frontend/src/types/bible-landing.ts` — `LastRead { book: string, chapter: number, verse: number, timestamp: number }`
- **Types:** `frontend/src/types/bible.ts` — `BibleBook`, `BibleProgressMap = Record<string, number[]>`
- **Z-index:** `frontend/src/constants/z-index.ts` — `Z.DRAWER_BACKDROP=10000`, `Z.DRAWER=10001`
- **Animations:** `tailwind.config.js` — `animate-drawer-slide-in` (300ms, `cubic-bezier(0.34, 1.2, 0.64, 1)`)

### Existing Patterns to Follow

**BibleDrawer shell:** Right-side slide-in, props-driven (`isOpen`, `onClose`, `ariaLabel`, `children`). BooksDrawerContent is passed as `children`. The drawer renders `null` when closed, sets `animate-drawer-slide-in` on entry, uses `useFocusTrap(isOpen, onClose)`, and respects `useReducedMotion()`.

**BooksDrawerContent layout:** Sticky header (`rgba(15, 10, 30, 0.98)` background) with title + close button + search + OT/NT tabs. Scrollable body. Footer `border-t border-white/[0.08]`. Book cards are `<button>` elements with FrostedCard-style classes.

**localStorage reads in drawer:** `BooksDrawerContent` reads `wr_bible_progress` via `useMemo` on mount (not reactive — stale-on-write is acceptable for drawer lifespan). Same pattern for chapter picker reading progress.

**useFocusTrap:** `(isActive, onEscape?) → containerRef`. Traps Tab cycling, handles Escape, stores/restores `previouslyFocused`.

**useReducedMotion:** Boolean reflecting `prefers-reduced-motion: reduce`.

**CSS animation pattern:** All drawer animations are CSS keyframes in `tailwind.config.js`, gated by `useReducedMotion()`. No Framer Motion.

**Test patterns:** Vitest + React Testing Library + jsdom. `MemoryRouter` wrapper for routing. Mock localStorage. `@testing-library/user-event` for interactions. `vi.useFakeTimers()` for timeouts.

### Cross-Spec Dependencies

- **BB-2 (complete):** Created BibleDrawerProvider, BibleDrawer, BooksDrawerContent. BB-3b extends the provider with view-stack and modifies BooksDrawerContent's book card onClick.
- **BB-4 (complete):** Created ReaderChrome with center label that calls `bibleDrawer.open()`. BB-3b changes this to `bibleDrawer.open({ type: 'chapters', bookSlug })`.
- **BB-5 (complete):** Created focus mode. No conflicts — focus mode pauses when drawer is open.
- **BB-6 (future):** Will add `{ type: 'actions', verseId: string }` to the view stack. The generic `DrawerView` union and `VIEW_COMPONENTS` router map must be extensible.

---

## Auth Gating Checklist

**No auth gating required.** The Bible drawer and chapter picker are entirely public.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Open drawer from reader chrome | Public | Step 5 | N/A |
| Open drawer from books view | Public | N/A (existing) | N/A |
| Push chapter picker view (book card tap) | Public | Step 4 | N/A |
| Tap a chapter cell | Public | Step 3 | N/A |
| Tap Continue Reading callout | Public | Step 3 | N/A |
| Use number-key jump | Public | Step 3 | N/A |
| Back button / Escape / Backspace | Public | Steps 2, 3 | N/A |

`markChapterRead()` is already auth-gated in `useBibleProgress`. The chapter picker only reads progress data — it never writes.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Drawer background | background | `rgba(15, 10, 30, 0.95)` | BibleDrawer.tsx:87 |
| Drawer header bg | background | `rgba(15, 10, 30, 0.98)` | BooksDrawerContent.tsx:129 |
| Chapter cell (unread) | classes | `bg-white/5 border border-white/10 rounded-lg` | spec:132 |
| Chapter cell (read) | accent | filled dot `bg-primary` (6px) | spec:133 |
| Last-read glow ring | classes | `ring-2 ring-primary/50 shadow-[0_0_12px_rgba(109,40,217,0.3)]` | spec:134 |
| Continue Reading callout | classes | `bg-white/[0.08] border border-white/[0.15] rounded-2xl` | spec:135 |
| Back button icon | icon | Lucide `ChevronLeft` or `ArrowLeft`, same as close button size | spec:136 |
| Number-jump overlay | classes | `bg-hero-mid/90 backdrop-blur-sm rounded-lg px-4 py-2` | spec:138 |
| Close button | classes | `h-8 w-8 min-h-[44px] min-w-[44px] rounded-full text-white/60 hover:bg-white/10 hover:text-white` | BooksDrawerContent.tsx:137 |
| Category header | classes | `text-xs font-semibold tracking-wider text-white/50 uppercase` | BooksDrawerContent.tsx:256 |
| Footer caption | classes | `text-center text-sm text-white/50` | BooksDrawerContent.tsx:201 |
| Primary purple | hex | `#6D28D9` / Tailwind `primary` | design-system.md |
| Primary light | hex | `#8B5CF6` / Tailwind `primary-lt` | design-system.md |
| Hero mid | hex | `#1E0B3E` / Tailwind `hero-mid` | design-system.md |
| FrostedCard shadow | box-shadow | `0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)` | FrostedCard.tsx:23 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The BibleDrawer uses `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`. The sticky header uses slightly more opaque `rgba(15, 10, 30, 0.98)` for scroll-behind readability.
- Drawer widths: `w-full` (mobile), `sm:w-[420px]` (tablet), `lg:w-[480px]` (desktop). The chapter grid column count (5 or 6) is based on drawer width, NOT viewport width.
- Z-index: use `Z.DRAWER_BACKDROP` and `Z.DRAWER` from `@/constants/z-index`, not raw numbers.
- All interactive elements need ≥44px tap targets on mobile.
- `prefers-reduced-motion` must be respected — instant swap, no slide animation for view transitions.
- Focus trap: `useFocusTrap(isActive, onEscape)` from `@/hooks/useFocusTrap`.
- No deprecated patterns: no Caveat headings, no `animate-glow-pulse`, no GlowBackground inside drawer, no cyan borders, no soft-shadow 8px-radius cards.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component where appropriate, hand-roll classes for `<button>` elements needing custom tap targets.
- Book card `<button>` pattern: `min-h-[44px] w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.06] ...` — see BooksDrawerContent.tsx `BookCard` sub-component for the canonical class string.
- Chapter cells are `<button>` not `<Link>` — tapping a chapter closes the drawer and navigates programmatically via `navigate()`.
- The `BibleDrawerProvider` currently has NO view-stack. BB-3b adds `pushView`, `popView`, `resetStack`, `currentView`, and `open(initialView?)` overload.
- From BB-4/BB-5 execution logs: no design system deviations noted. All execution logs report clean completion.

---

## Shared Data Models (from Master Plan)

No master plan. The relevant types:

```typescript
// NEW — view stack types for BibleDrawerProvider
export type DrawerView =
  | { type: 'books' }
  | { type: 'chapters'; bookSlug: string }
  // BB-6 will add: | { type: 'actions'; verseId: string }

// NEW — view-stack persistence
export interface DrawerStackPersistence {
  stack: DrawerView[]
  timestamp: number // Date.now()
}

// EXISTING — from types/bible-landing.ts
export interface LastRead {
  book: string      // book name, e.g. "John"
  chapter: number
  verse: number
  timestamp: number
}

// EXISTING — from types/bible.ts
export type BibleProgressMap = Record<string, number[]>

// EXISTING — from constants/bookMetadata.ts
export interface BookMetadata {
  slug: string
  name: string
  testament: 'OT' | 'NT'
  category: BibleCategory
  chapterCount: number
  wordCount: number
  abbreviations: string[]
  drawerCategoryLabel: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_drawer_stack` | Both | NEW — view stack persistence with 24-hour TTL |
| `wr_bible_progress` | Read | EXISTING — chapter read state for dot indicators |
| `wr_bible_last_read` | Read | EXISTING — last read position for continue callout + glow ring |
| `wr_bible_books_tab` | Read | EXISTING — OT/NT tab state (books view) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Drawer is 100vw. Chapter grid: 5 columns. Footer caption hidden. 44px tap targets. Swipe-right to close drawer. |
| Tablet | 640px–1023px | Drawer is 420px. Chapter grid: 5 columns. Footer caption visible. |
| Desktop | ≥ 1024px | Drawer is 480px. Chapter grid: 6 columns. Footer caption visible. Hover effects on cells. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Chapter view header | Back button, book name title, close button | Same y ±5px at all breakpoints | N/A — always same row |
| Chapter grid cells | Row of 5 or 6 square buttons | Same y ±5px per row | N/A — CSS grid enforces |
| Continue Reading callout | Icon, text, chevron | Same y ±5px | N/A — flexbox row |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Chapter header → Continue Reading callout | 16px (pt-4) | convention |
| Continue Reading callout → chapter grid | 16px (gap-4) | convention |
| Chapter header → chapter grid (no callout) | 16px (pt-4) | convention |
| Last grid row → footer caption | 24px (pb-6) | BooksDrawerContent pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] BB-2 (BooksDrawerContent) committed and functional on `bible-redesign`
- [x] BB-4 (ReaderChrome) committed and functional on `bible-redesign`
- [x] BB-5 (focus mode) committed and functional on `bible-redesign`
- [x] No auth gating required
- [x] All auth-gated actions from the spec are accounted for (none)
- [x] Design system values verified from BibleDrawer, BooksDrawerContent, FrostedCard source code
- [x] No deprecated patterns used
- [ ] Confirm `wr_bible_last_read` is being written by BB-4 reader on chapter load (verified in BibleReader.tsx lines 83-98)
- [ ] Confirm `wr_bible_progress` is being written by BB-4 reader on chapter load (verified in BibleReader.tsx lines 100-107)
- [ ] All [UNVERIFIED] values flagged with verification methods

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| View-stack as array in provider state | `useState<DrawerView[]>` starting with `[{ type: 'books' }]` | Simple, extensible for BB-6. `currentView` = stack[stack.length - 1]. |
| Slide animation axis | Horizontal (translateX) for view push/pop, distinct from drawer's own slide-in | Spec: "distinct from the drawer's own open/close slide (also horizontal but affecting the entire drawer panel)". Internal view transitions slide within the drawer body. |
| Two views mounted during transition | Yes — outgoing view kept in DOM during 220ms animation, then unmounted | Spec requirement #9. CSS `position: absolute` for both, `overflow: hidden` on container. |
| 24-hour TTL for stack persistence | Check `Date.now() - timestamp < 86400000` on rehydration | Spec requirement #10-11. Stale stacks reset to `[{ type: 'books' }]`. |
| Chapter cell size | Fixed 44px minimum, square cells via `aspect-square` | Spec requirement #16: "44px minimum tap target" + "square cells". |
| Continue Reading callout visibility | Only when `wr_bible_last_read.book` matches book name for current `bookSlug` | The `LastRead.book` field is the display name (e.g., "John"), not the slug. Match against `BookMetadata.name`. |
| Number-jump overlay fade | 1s of inactivity → fade out over 200ms | Spec requirement #24. Uses `setTimeout` reset on each digit press. |
| Arrow key grid navigation | Track focused cell index, compute next from grid dimensions | Standard grid navigation: left/right move ±1, up/down move ±columns. Wrap at edges. |
| Escape in chapter view | Pops to books view (not closes drawer) | Spec requirement #22. Escape in books view closes drawer (existing BB-2 behavior via useFocusTrap). |
| `open()` backward compatibility | `open()` with no args opens with `[{ type: 'books' }]` on stack | Spec requirement #3. Existing call sites in BibleLanding don't need changes. |
| `open(view)` for chapter pre-push | `open({ type: 'chapters', bookSlug })` opens with `[{ type: 'books' }, { type: 'chapters', bookSlug }]` | Spec requirement #4. ReaderChrome center label uses this. |
| Orphaned ChapterGrid.tsx | Delete entirely | Spec requirement #21. Doesn't match spec (wrong columns, wrong elements, wrong indicators). |
| `VIEW_COMPONENTS` router map | Map from `view.type` string to React component | Spec requirement #8. Generic — BB-6 adds entries without modifying stack logic. |
| Focus on push | Back button receives focus on chapter view entry | Spec requirement: "Focus moves to the back button on push". |
| Focus on pop | Previously selected book card receives focus | Spec requirement: "Focus returns to the previously selected book card on pop". Requires storing ref before push. |

---

## Implementation Steps

### Step 1: View-Stack State in BibleDrawerProvider + Persistence Utility

**Objective:** Extend `BibleDrawerProvider` with a generic view-stack API (`pushView`, `popView`, `resetStack`, `currentView`) and update `open()` to accept an optional initial view. Create the `drawerStack.ts` persistence utility.

**Files to create/modify:**
- `frontend/src/components/bible/BibleDrawerProvider.tsx` — extend with view-stack state
- `frontend/src/lib/bible/drawerStack.ts` — NEW: SSR-safe read/write of `wr_bible_drawer_stack` with 24-hour TTL
- `frontend/src/components/bible/__tests__/BibleDrawerProvider.test.tsx` — update + add tests

**Details:**

1. **Create `drawerStack.ts`:**
   ```typescript
   // lib/bible/drawerStack.ts
   const STACK_KEY = 'wr_bible_drawer_stack'
   const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

   export type DrawerView =
     | { type: 'books' }
     | { type: 'chapters'; bookSlug: string }

   interface PersistedStack {
     stack: DrawerView[]
     timestamp: number
   }

   export function readStack(): DrawerView[] | null {
     if (typeof window === 'undefined') return null
     try {
       const raw = localStorage.getItem(STACK_KEY)
       if (!raw) return null
       const parsed: PersistedStack = JSON.parse(raw)
       if (Date.now() - parsed.timestamp > TTL_MS) {
         localStorage.removeItem(STACK_KEY)
         return null
       }
       if (!Array.isArray(parsed.stack) || parsed.stack.length === 0) return null
       return parsed.stack
     } catch {
       return null
     }
   }

   export function writeStack(stack: DrawerView[]): void {
     if (typeof window === 'undefined') return
     localStorage.setItem(STACK_KEY, JSON.stringify({
       stack,
       timestamp: Date.now(),
     }))
   }

   export function clearStack(): void {
     if (typeof window === 'undefined') return
     localStorage.removeItem(STACK_KEY)
   }
   ```

2. **Extend `BibleDrawerProvider.tsx`:**

   Replace the simple `isOpen` boolean with a stack-aware API:

   ```typescript
   interface BibleDrawerContextValue {
     isOpen: boolean
     open: (initialView?: DrawerView) => void
     close: () => void
     toggle: () => void
     pushView: (view: DrawerView) => void
     popView: () => void
     resetStack: () => void
     currentView: DrawerView
     viewStack: DrawerView[]
     triggerRef: React.MutableRefObject<HTMLElement | null>
   }
   ```

   - State: `const [viewStack, setViewStack] = useState<DrawerView[]>([{ type: 'books' }])`
   - `currentView`: `viewStack[viewStack.length - 1]`
   - `open()` with no args: set stack to `[{ type: 'books' }]`, set `isOpen = true`
   - `open({ type: 'chapters', bookSlug })`: set stack to `[{ type: 'books' }, { type: 'chapters', bookSlug }]`, set `isOpen = true`
   - `pushView(view)`: append view to stack
   - `popView()`: if stack length > 1, remove top. If stack would be empty, do nothing (books view is always the base).
   - `resetStack()`: set stack to `[{ type: 'books' }]`
   - `close()`: set `isOpen = false`, write current stack to localStorage via `writeStack()`
   - On mount: attempt to rehydrate stack from `readStack()`. If valid and `isOpen` is true (edge case — typically drawer starts closed), apply. Actually, the rehydration happens on `open()`: if opening with no args AND there's a persisted stack within 24 hours, restore it instead of resetting to books.

   **Rehydration decision:** On `open()` with no args, check `readStack()`:
   - If valid (within 24h): restore that stack
   - If stale or null: use `[{ type: 'books' }]`
   
   On `open(initialView)` with an explicit view: always use the provided stack (ignoring persistence). This ensures ReaderChrome's chapter-picker-direct flow isn't affected by stale persistence.

   On `close()`: always persist current stack via `writeStack()`.

3. **Backward compatibility:** Existing call sites call `open()` with no args — they continue to work (opens to books view, or restores last stack within 24h). `toggle()` calls `open()` when closed or `close()` when open.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact — state-only step.

**Guardrails (DO NOT):**
- DO NOT remove `isOpen`, `open`, `close`, `toggle`, or `triggerRef` — these are used by existing consumers (BibleLanding, BibleReader, ReaderChrome)
- DO NOT persist `isOpen` to localStorage — only the stack is persisted
- DO NOT couple to AudioProvider or any non-Bible state
- DO NOT use `DrawerView` type from an external file — define it in `drawerStack.ts` and re-export from the provider

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| open() with no args sets stack to [books] | unit | Verify currentView.type === 'books' |
| open(chapters view) sets pre-pushed stack | unit | Call open({ type: 'chapters', bookSlug: 'john' }), verify stack is [books, chapters] |
| pushView adds to stack | unit | Open, pushView(chapters), verify stack length is 2 |
| popView removes top view | unit | Push chapters, popView, verify stack is [books] |
| popView does not remove last view | unit | Stack is [books], popView, verify stack still [books] |
| resetStack returns to [books] | unit | Push chapters, resetStack, verify [books] |
| close persists stack to localStorage | unit | Open, push chapters, close, verify localStorage has stack |
| open rehydrates from localStorage within 24h | unit | Set localStorage with valid stack, call open(), verify restored |
| open ignores stale stack (>24h) | unit | Set localStorage with old timestamp, open(), verify [books] |
| open(explicit view) ignores persistence | unit | Set localStorage, open({ type: 'chapters', bookSlug: 'john' }), verify explicit stack |
| currentView returns top of stack | unit | Push two views, verify currentView is the last |
| toggle opens when closed | unit | Toggle, verify isOpen |
| toggle closes when open | unit | Open, toggle, verify !isOpen |

**Expected state after completion:**
- [ ] `BibleDrawerProvider` exposes `pushView`, `popView`, `resetStack`, `currentView`, `viewStack`
- [ ] `open()` backward-compatible with no-arg calls
- [ ] `open(view)` pre-pushes the view for chapter-direct opening
- [ ] Stack persistence with 24-hour TTL works
- [ ] `drawerStack.ts` utility created
- [ ] 13 tests pass

---

### Step 2: View-Stack Rendering in BibleDrawer with Slide Transitions

**Objective:** Modify `BibleDrawer.tsx` to render the current view from a `VIEW_COMPONENTS` router map, with slide-in/slide-out transitions between views. Add the new `animate-view-slide-in` and `animate-view-slide-out` keyframes.

**Files to create/modify:**
- `frontend/src/components/bible/BibleDrawer.tsx` — view-stack rendering with router map, slide transitions, conditional header
- `frontend/tailwind.config.js` — add `view-slide-in` and `view-slide-out` keyframes

**Details:**

1. **Tailwind keyframes** (in `tailwind.config.js`):
   ```javascript
   'view-slide-in': {
     '0%': { transform: 'translateX(100%)', opacity: '0' },
     '100%': { transform: 'translateX(0)', opacity: '1' },
   },
   'view-slide-out': {
     '0%': { transform: 'translateX(0)', opacity: '1' },
     '100%': { transform: 'translateX(100%)', opacity: '0' },
   },
   'view-slide-back-in': {
     '0%': { transform: 'translateX(-30%)', opacity: '0.5' },
     '100%': { transform: 'translateX(0)', opacity: '1' },
   },
   ```
   Animation registrations:
   ```javascript
   'view-slide-in': 'view-slide-in 220ms cubic-bezier(0.34, 1.2, 0.64, 1) both',
   'view-slide-out': 'view-slide-out 220ms ease-in both',
   'view-slide-back-in': 'view-slide-back-in 220ms ease-out both',
   ```

2. **BibleDrawer changes:**

   The drawer shell now accepts `viewStack` and `currentView` as props (from the provider) plus a `VIEW_COMPONENTS` map. Instead of rendering raw `children`, the drawer renders the component matching `currentView.type`.

   **New props interface:**
   ```typescript
   interface BibleDrawerProps {
     isOpen: boolean
     onClose: () => void
     ariaLabel: string
     viewStack: DrawerView[]
     currentView: DrawerView
     onPopView: () => void
     children?: never // No longer accepts children — uses view router
   }
   ```

   **Wait — this breaks the existing API.** BibleDrawer currently takes `children` (BooksDrawerContent). We need to change the approach.

   **Revised approach:** Keep `BibleDrawer` as the shell (backdrop, panel, focus trap, swipe). Create a new internal component `DrawerViewRouter` that handles the view-stack rendering and transitions inside the drawer's children slot. The actual drawer consumers (BibleReader.tsx, BibleLanding.tsx) pass `<DrawerViewRouter>` as children instead of `<BooksDrawerContent>` directly.

   Actually, the cleanest approach: modify BibleDrawer to accept either `children` (legacy) OR render from view stack. But that's messy. 

   **Final approach:** Modify the drawer integration points (BibleReader.tsx, BibleLanding.tsx) to use a new `<DrawerViewRouter />` component as the `children` of BibleDrawer. `DrawerViewRouter` reads `currentView` from the provider context and renders the matching component with slide transitions.

   Create `frontend/src/components/bible/DrawerViewRouter.tsx`:
   ```typescript
   // Maps view types to their rendering components
   const VIEW_COMPONENTS: Record<string, React.ComponentType<{ onClose: () => void }>> = {
     books: BooksDrawerContentView,
     chapters: ChapterPickerView,
     // BB-6 will add: actions: VerseActionView,
   }
   ```

   The `DrawerViewRouter` component:
   - Reads `{ currentView, viewStack }` from `useBibleDrawer()`
   - Tracks the previous view for exit animation
   - Renders both outgoing (animating out) and incoming (animating in) views during the 220ms transition
   - After animation, unmounts the outgoing view
   - The `BooksDrawerContent` gets renamed/wrapped as `BooksDrawerContentView` to accept a standardized props interface
   - Reduced motion: instant swap (no animation classes)

   **Conditional header:** The drawer header changes based on `currentView.type`:
   - `books`: existing header (title "Books of the Bible", search, OT/NT tabs, close)
   - `chapters`: back button (left), book name (center), subtitle (chapters + reading time), close (right)

   Move the header logic INTO the individual view components (BooksDrawerContent already has its header). `ChapterPickerView` will have its own header. This means the slide transitions happen on the entire view content including headers, which is the natural UX.

3. **Slide transition implementation:**

   Use a `transitioning` state with `useEffect` + `setTimeout(220)`:
   - On view change (detected via `currentView` ref comparison):
     - Set `transitioning = true` with direction ('push' or 'pop')
     - Keep the previous view mounted with exit animation
     - Mount the new view with entry animation
     - After 220ms, set `transitioning = false` and unmount the previous view
   - During transition: both views absolutely positioned in a `relative overflow-hidden` container
   - Reduced motion: skip animation, instant swap

   **Animation classes:**
   - Push (forward): incoming slides in from right (`animate-view-slide-in`), outgoing slides slightly left (`animate-view-slide-out` reversed? Actually, the outgoing doesn't need to slide fully — it can just fade/shrink slightly)
   - Pop (backward): incoming slides back in from left (`animate-view-slide-back-in`), outgoing slides out to right (`animate-view-slide-out`)

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): 480px drawer, transitions inside
- Tablet (768px): 420px drawer, transitions inside  
- Mobile (375px): full-width drawer, transitions inside

**Guardrails (DO NOT):**
- DO NOT use Framer Motion — stick to CSS keyframes gated by `useReducedMotion()`
- DO NOT add GlowBackground inside the drawer
- DO NOT remove the existing swipe-right-to-close behavior on the outer drawer shell
- DO NOT hard-code "books" and "chapters" in the transition logic — use the `VIEW_COMPONENTS` map
- DO NOT break the BibleDrawer shell API (keep `isOpen`, `onClose`, `ariaLabel`, `children`)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| VIEW_COMPONENTS maps books and chapters types | unit | Verify both keys exist in the map |
| renders BooksDrawerContent when currentView is books | unit | Open drawer, verify books content renders |
| renders ChapterPickerView when currentView is chapters | unit | Push chapters view, verify chapter content renders |
| both views mounted during transition | integration | Push view, verify both old and new are in DOM during 220ms |
| outgoing view unmounts after animation | integration | Push, wait 220ms, verify old view gone |
| reduced motion skips animation | integration | Mock prefers-reduced-motion, push view, verify instant swap |

**Expected state after completion:**
- [ ] `DrawerViewRouter` component renders views from a generic map
- [ ] Slide transitions work on push (right-to-left) and pop (left-to-right)
- [ ] Two views mounted simultaneously during the 220ms animation
- [ ] Outgoing view unmounts after animation completes
- [ ] Reduced motion: instant swap
- [ ] BibleDrawer shell unchanged (still accepts children)
- [ ] 6 tests pass

---

### Step 3: ChapterPickerView Component

**Objective:** Build the chapter picker view with conditional Continue Reading callout, chapter grid (5/6 columns), read-state dots, last-read glow ring, footer caption, and keyboard navigation (number-key jump, arrow keys, Escape/Backspace pop).

**Files to create:**
- `frontend/src/components/bible/books/ChapterPickerView.tsx` — chapter grid view
- `frontend/src/components/bible/books/ContinueReadingCallout.tsx` — conditional resume card
- `frontend/src/components/bible/books/ChapterJumpOverlay.tsx` — number-key jump overlay

**Files to modify:**
- (none — this step creates new files only)

**Details:**

1. **ChapterPickerView.tsx:**

   **Props:** `{ onClose: () => void }` (standard view component interface)

   Reads `currentView` from `useBibleDrawer()` — extracts `bookSlug` from `currentView` (type-narrowed to `chapters`). Looks up `BookMetadata` from `BOOK_METADATA` for chapter count, name, reading time.

   **Structure:**
   ```
   <div className="flex h-full flex-col">
     {/* Header: back button + book name + close */}
     <div className="sticky top-0 z-10 shrink-0 px-4 pt-4 pb-3" style={{ background: 'rgba(15, 10, 30, 0.98)' }}>
       <div className="flex items-center justify-between">
         <button aria-label="Back to books" onClick={popView}>
           <ArrowLeft size={18} />
         </button>
         <div className="text-center flex-1 min-w-0 px-2">
           <h2 className="text-lg font-bold text-white truncate">{bookName}</h2>
           <p className="text-xs text-white/50">{chapterCount} chapters · {readingTime}</p>
         </div>
         <button aria-label="Close drawer" onClick={onClose}>
           <X size={18} />
         </button>
       </div>
     </div>

     {/* aria-live region for screen reader */}
     <div aria-live="polite" className="sr-only">
       Showing chapters in {bookName}
     </div>

     {/* Scrollable body */}
     <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
       {/* Continue Reading callout (conditional) */}
       {continueChapter && <ContinueReadingCallout ... />}

       {/* Chapter grid */}
       <div className="grid grid-cols-5 lg:grid-cols-6 gap-2" role="grid" aria-label={`${bookName} chapters`}>
         {chapters.map(ch => (
           <button
             key={ch}
             type="button"
             role="gridcell"
             aria-label={`${bookName} chapter ${ch}, ${isRead ? 'read' : 'unread'}`}
             className={cn(
               'relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
               isLastRead
                 ? 'ring-2 ring-primary/50 shadow-[0_0_12px_rgba(109,40,217,0.3)] bg-white/10 border border-white/15 text-white'
                 : isRead
                   ? 'bg-white/5 border border-white/10 text-white/90'
                   : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10',
               'lg:hover:scale-[1.02] lg:hover:shadow-[0_0_16px_rgba(109,40,217,0.2)]',
               'motion-reduce:lg:hover:scale-100',
             )}
             onClick={() => handleChapterSelect(ch)}
             onKeyDown={(e) => handleCellKeyDown(e, ch)}
             tabIndex={ch === focusedCell ? 0 : -1}
             ref={ch === focusedCell ? focusedCellRef : undefined}
           >
             {ch}
             {/* Read indicator dot */}
             {isRead && (
               <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
             )}
           </button>
         ))}
       </div>
     </div>

     {/* Footer caption — hidden on mobile */}
     <div className="hidden sm:block shrink-0 border-t border-white/[0.08] px-4 py-3">
       <p className="text-center text-sm text-white/50">Tap a chapter to read</p>
     </div>
   </div>
   ```

   **Chapter grid column logic:**
   - `grid-cols-5 lg:grid-cols-6` — 5 columns by default (mobile + tablet within 420px drawer), 6 on desktop (within 480px drawer). The `lg:` breakpoint matches the drawer width breakpoint.

   **Read state:** Read `wr_bible_progress` from localStorage (same `useMemo` pattern as BooksDrawerContent). `progress[bookSlug]?.includes(ch)` → read.

   **Last-read chapter:** Read `wr_bible_last_read` from localStorage. If `lastRead.book === bookMetadata.name` (match by display name), then `lastRead.chapter` is the last-read chapter for this book. Gets glow ring treatment.

   **Chapter select handler:** `navigate(`/bible/${bookSlug}/${chapter}`)`, then call `close()` (closes entire drawer, clears/persists stack).

   **Keyboard navigation:**
   - `focusedCell` state: tracks which cell has `tabIndex={0}`. Defaults to 1 (first chapter) or lastRead chapter.
   - Arrow keys: `ArrowLeft` → focusedCell - 1, `ArrowRight` → focusedCell + 1, `ArrowUp` → focusedCell - columns, `ArrowDown` → focusedCell + columns. Clamp to [1, totalChapters].
   - `Enter` on focused cell → select that chapter.
   - `Escape` → `popView()` (back to books).
   - `Backspace` → `popView()` (spec requirement #27).

   **Number-key jump:** Digit keys accumulate in a buffer. After 1s of inactivity (reset on each digit), buffer clears. `Enter` during active buffer → navigate to that chapter (if valid). Displays `ChapterJumpOverlay`.

   **Focus management on mount:** After 50ms delay (same as BooksDrawerContent search focus pattern), focus moves to the back button. On pop (back to books), focus returns to the book card that was tapped — requires storing a ref before the push.

2. **ContinueReadingCallout.tsx:**

   ```typescript
   interface ContinueReadingCalloutProps {
     bookName: string
     chapter: number
     timestamp: number
     onSelect: () => void
   }
   ```

   - Elevated card: `bg-white/[0.08] border border-white/[0.15] rounded-2xl p-4 mb-4`
   - Content: "Continue reading" label, "Chapter {N}" + relative time (`timeAgo(timestamp)`)
   - `aria-label="Continue reading {bookName} chapter {N}"`
   - Tap calls `onSelect` which navigates + closes
   - Uses `timeAgo()` from `@/lib/time`

3. **ChapterJumpOverlay.tsx:**

   ```typescript
   interface ChapterJumpOverlayProps {
     digits: string
     visible: boolean
   }
   ```

   - Position: `absolute` bottom of the chapter grid area, centered
   - Style: `bg-hero-mid/90 backdrop-blur-sm rounded-lg px-4 py-2`
   - Font: `text-2xl font-mono tabular-nums text-white`
   - `aria-live="polite"` for screen reader announcement
   - Fade in/out over 200ms via opacity transition
   - Shows the accumulated digit string

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): 6-column grid in 480px drawer. Hover effects on cells (glow + scale). Footer visible.
- Tablet (768px): 5-column grid in 420px drawer. No hover effects. Footer visible.
- Mobile (375px): 5-column grid in full-width drawer. No hover effects. Footer hidden.

**Inline position expectations:**
- Chapter header row: back button, title, close button — same y ±5px at all breakpoints
- Chapter cells within a row — same y ±5px (enforced by CSS grid)

**Guardrails (DO NOT):**
- DO NOT use `<Link>` for chapter cells — use `<button>` with programmatic `navigate()`
- DO NOT read `wr_bible_progress` reactively (no custom hook) — use `useMemo` like BooksDrawerContent
- DO NOT write to `wr_bible_progress` or `wr_bible_last_read` — read-only in the chapter picker
- DO NOT use `FrostedCard` component for chapter cells — hand-roll `<button>` with design system classes for correct tap targets
- DO NOT use responsive column counts tied to viewport width — tie to drawer width via the `lg:` breakpoint since it corresponds to drawer going from 420px to 480px
- DO NOT add raw hex values — use Tailwind tokens (`primary`, `primary-lt`, `hero-mid`)
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders correct chapter count for Genesis (50) | unit | Set bookSlug to genesis, verify 50 buttons |
| renders correct chapter count for Psalms (150) | unit | Set bookSlug to psalms, verify 150 buttons |
| renders correct chapter count for Obadiah (1) | unit | Set bookSlug to obadiah, verify 1 button |
| read chapters show dot indicator | unit | Set wr_bible_progress with chapters, verify dot span present |
| unread chapters have no dot | unit | Verify no dot span on unread chapters |
| last-read chapter shows glow ring | unit | Set wr_bible_last_read matching book, verify ring classes |
| Continue Reading callout shows when last_read matches book | unit | Set wr_bible_last_read to current book, verify callout |
| Continue Reading callout hidden when last_read is different book | unit | Set wr_bible_last_read to other book, verify no callout |
| Continue Reading callout hidden when no last_read | unit | Clear localStorage, verify no callout |
| tapping chapter closes drawer and navigates | integration | Click chapter 5, verify navigate called with /bible/genesis/5 + close called |
| tapping Continue Reading navigates to correct chapter | integration | Click callout, verify navigation |
| back button calls popView | integration | Click back, verify popView called |
| Escape key calls popView | integration | Press Escape, verify popView called |
| Backspace key calls popView | integration | Press Backspace, verify popView called |
| arrow keys navigate grid cells | integration | Focus cell 1, press ArrowRight, verify cell 2 focused |
| number keys accumulate digits | integration | Press 2 then 3, verify overlay shows "23" |
| Enter after number keys navigates to chapter | integration | Type "23" + Enter, verify navigation to chapter 23 |
| invalid number key (> totalChapters) does not navigate | integration | Type "999" + Enter on Genesis, verify no navigation |
| header shows book name and chapter count | unit | Verify "Romans" heading + "16 chapters" subtitle |
| footer caption hidden on mobile | unit | Verify `hidden sm:block` class on footer |
| aria-live region announces book name | unit | Verify sr-only text "Showing chapters in {BookName}" |
| chapter cells have correct aria-labels | unit | Verify "Genesis chapter 1, unread" format |
| 6 columns on desktop, 5 on mobile/tablet | unit | Verify `grid-cols-5 lg:grid-cols-6` classes |

**Expected state after completion:**
- [ ] ChapterPickerView renders correct chapters for any book
- [ ] Read dots and last-read glow ring display correctly
- [ ] Continue Reading callout conditional on wr_bible_last_read
- [ ] Number-key jump with overlay works
- [ ] Arrow key grid navigation works
- [ ] Escape/Backspace pop to books view
- [ ] All a11y requirements met
- [ ] 23 tests pass

---

### Step 4: Wire BooksDrawerContent Book Card → pushView

**Objective:** Change the book card tap behavior in `BooksDrawerContent` from navigating + closing to pushing the chapters view onto the view stack.

**Files to modify:**
- `frontend/src/components/bible/BooksDrawerContent.tsx` — book card onClick pushes chapters view
- `frontend/src/components/bible/__tests__/BooksDrawerContent.test.tsx` — update tests

**Details:**

1. **BooksDrawerContent.tsx changes:**

   The `BooksDrawerContentProps` interface changes:
   ```typescript
   interface BooksDrawerContentProps {
     onClose: () => void
     // REMOVED: onSelectBook: (slug: string) => void
   }
   ```

   The `onSelectBook` callback is replaced with `pushView` from `useBibleDrawer()`. When a book card is tapped:
   ```typescript
   const { pushView } = useBibleDrawer()
   
   // In BookCard onClick:
   onClick={() => pushView({ type: 'chapters', bookSlug: book.slug })}
   ```

   The book card also stores a ref to itself before pushing, so that `popView` can restore focus to it. Use a Map of refs or a callback ref pattern:
   ```typescript
   // Track the last-tapped book card for focus restoration
   const lastTappedBookRef = useRef<HTMLButtonElement | null>(null)
   ```

   Store this ref on the provider (or pass it via the view-stack transition mechanism) so that `ChapterPickerView` can call `popView` and the router restores focus to the right card.

   **Search Enter behavior:** Also updated — pressing Enter on a search result pushes the chapters view for that book (instead of navigating to chapter 1 directly).

2. **Test updates:**
   - Remove tests that verify `onSelectBook` callback (it no longer exists)
   - Add tests that verify `pushView` is called with the correct bookSlug
   - Update search Enter test to verify pushView instead of navigation

**Auth gating:** N/A

**Responsive behavior:** N/A: no visual change — same book cards, different click behavior.

**Guardrails (DO NOT):**
- DO NOT keep the old `onSelectBook` prop — remove it entirely to prevent stale call sites
- DO NOT navigate to `/bible/{slug}/1` from the book card — that's now the chapter picker's job
- DO NOT break the search functionality — search still works, results still clickable, just the action changes

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| book card click calls pushView with chapters view | integration | Click Genesis card, verify pushView({ type: 'chapters', bookSlug: 'genesis' }) |
| search Enter pushes chapters view for first result | integration | Type "psa" + Enter, verify pushView for psalms |
| onClose prop still works for close button | unit | Click X, verify onClose called |

**Expected state after completion:**
- [ ] Book card taps push chapters view instead of navigating
- [ ] Search Enter pushes chapters view for top result
- [ ] `onSelectBook` prop removed from BooksDrawerContent
- [ ] 3 new/updated tests pass

---

### Step 5: Wire ReaderChrome Center Label + Update Drawer Consumers

**Objective:** Update the reader chrome's center label to open the drawer with the chapter picker pre-pushed. Update all drawer consumer sites (BibleReader.tsx, BibleLanding.tsx) to use `DrawerViewRouter` instead of raw `BooksDrawerContent`.

**Files to modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — center label calls `open({ type: 'chapters', bookSlug })`
- `frontend/src/pages/BibleReader.tsx` — use `DrawerViewRouter` as drawer children, remove `onSelectBook` prop
- `frontend/src/pages/BibleLanding.tsx` — use `DrawerViewRouter` as drawer children, remove `onSelectBook` prop

**Details:**

1. **ReaderChrome.tsx changes:**

   The center label button currently calls `bibleDrawer.open()`. Change to:
   ```typescript
   // Pass the current book slug from props
   onClick={() => {
     bibleDrawer.triggerRef.current = centerRef.current
     bibleDrawer.open({ type: 'chapters', bookSlug: currentBookSlug })
   }}
   ```

   Add `bookSlug: string` to `ReaderChromeProps` (pass from BibleReader.tsx).

   The books icon (`BookOpen`) continues to call `bibleDrawer.open()` with no args — it opens to the books list.

2. **BibleReader.tsx changes:**

   Replace `<BooksDrawerContent>` with `<DrawerViewRouter>`:
   ```tsx
   <BibleDrawer isOpen={bibleDrawer.isOpen} onClose={bibleDrawer.close} ariaLabel="Bible navigation">
     <DrawerViewRouter onClose={bibleDrawer.close} />
   </BibleDrawer>
   ```

   Remove the `onSelectBook` callback that was navigating to `/bible/${slug}/1`. Navigation now happens from within `ChapterPickerView` when a chapter cell is tapped.

3. **BibleLanding.tsx changes:**

   Same pattern — replace `<BooksDrawerContent>` with `<DrawerViewRouter>`. The landing page's "Browse Books" button still calls `bibleDrawer.open()` (no args) which opens to the books view.

**Auth gating:** N/A

**Responsive behavior:** N/A: no visual change at this step — behavior wiring only.

**Guardrails (DO NOT):**
- DO NOT change the BibleDrawer shell props — it still takes `isOpen`, `onClose`, `ariaLabel`, `children`
- DO NOT add `bookSlug` to the center label button text — it already shows `"{bookName} {chapter}"`
- DO NOT remove the books icon (BookOpen) or change its behavior — it opens to books view

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| center label opens drawer with chapters pre-pushed | integration | Click center label, verify open called with { type: 'chapters', bookSlug } |
| books icon opens drawer to books view | integration | Click books icon, verify open called with no args |
| BibleReader drawer renders DrawerViewRouter | integration | Open drawer, verify DrawerViewRouter renders |
| chapter selection from picker navigates correctly | integration | Open chapter picker from chrome, select chapter 5, verify /bible/{book}/5 navigation |

**Expected state after completion:**
- [ ] Center label opens chapter picker for current book directly
- [ ] Books icon opens to books list
- [ ] Both BibleReader and BibleLanding use DrawerViewRouter
- [ ] Navigation from chapter picker works end-to-end
- [ ] 4 tests pass

---

### Step 6: Delete Orphaned ChapterGrid.tsx + Update localStorage Docs

**Objective:** Delete the orphaned `ChapterGrid.tsx` and document the new `wr_bible_drawer_stack` localStorage key.

**Files to delete:**
- `frontend/src/components/bible/ChapterGrid.tsx`

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — add `wr_bible_drawer_stack` key

**Details:**

1. **Delete `ChapterGrid.tsx`:** Spec requirement #21. The component uses `<Link>`, responsive 5/6/8/10/12 columns, and no dot indicators or glow ring. It's orphaned (not imported anywhere). The new `ChapterPickerView` replaces it entirely.

2. **Add to 11-local-storage-keys.md** in the "Bible Reader" section:
   ```markdown
   | `wr_bible_drawer_stack` | `{ stack: DrawerView[], timestamp: number }` | Drawer view stack persistence (24-hour TTL) |
   ```

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT delete any other files
- DO NOT modify any other localStorage keys

**Test specifications:**

None — deletion + documentation only.

**Expected state after completion:**
- [ ] `ChapterGrid.tsx` deleted
- [ ] No import references to `ChapterGrid` remain in the codebase
- [ ] `wr_bible_drawer_stack` documented in 11-local-storage-keys.md

---

### Step 7: Integration Tests + Build Verification

**Objective:** Write comprehensive tests for the end-to-end chapter picker flow and verify build health.

**Files to create/modify:**
- `frontend/src/components/bible/__tests__/DrawerViewRouter.test.tsx` — NEW
- `frontend/src/components/bible/books/__tests__/ChapterPickerView.test.tsx` — NEW
- `frontend/src/components/bible/books/__tests__/ContinueReadingCallout.test.tsx` — NEW
- `frontend/src/lib/bible/__tests__/drawerStack.test.ts` — NEW
- `frontend/src/components/bible/__tests__/BibleDrawerProvider.test.tsx` — update
- `frontend/src/components/bible/__tests__/BooksDrawerContent.test.tsx` — update
- `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx` — update

**Details:**

1. **drawerStack.test.ts** (6 tests):
   - readStack returns null when nothing stored
   - readStack returns stack when within TTL
   - readStack returns null when expired (>24h)
   - writeStack persists with timestamp
   - clearStack removes the key
   - readStack handles invalid JSON gracefully

2. **DrawerViewRouter.test.tsx** (6 tests from Step 2)

3. **ChapterPickerView.test.tsx** (23 tests from Step 3)

4. **ContinueReadingCallout.test.tsx** (3 tests):
   - renders chapter number and relative time
   - aria-label correct format
   - onClick fires callback

5. **BibleDrawerProvider.test.tsx** (13 tests from Step 1 — update existing file)

6. **BooksDrawerContent.test.tsx** (update):
   - Update tests that verified `onSelectBook` → verify `pushView` instead
   - Update search Enter test

7. **ReaderChrome.test.tsx** (update):
   - Verify center label calls `open({ type: 'chapters', bookSlug })`

8. **Build verification:**
   - Run `pnpm build` — verify 0 errors, 0 warnings
   - Run `pnpm lint` — verify clean
   - Run `pnpm test` — verify all tests pass
   - Verify no imports reference deleted `ChapterGrid.tsx`

**Auth gating:** N/A

**Responsive behavior:** N/A: tests

**Guardrails (DO NOT):**
- DO NOT import real Bible JSON data in unit tests — mock with small data
- DO NOT test CSS animations in jsdom — those are Playwright territory
- DO NOT skip the focus management tests — they verify a11y requirements

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ~51+ tests across 7 files | unit + integration | Comprehensive chapter picker coverage |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build passes (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No import references to ChapterGrid.tsx remain

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | View-stack state in BibleDrawerProvider + persistence utility |
| 2 | 1 | View-stack rendering in BibleDrawer + slide transitions |
| 3 | 1 | ChapterPickerView component (can start in parallel with Step 2) |
| 4 | 1, 3 | Wire BooksDrawerContent book card → pushView |
| 5 | 1, 2, 3, 4 | Wire ReaderChrome + update drawer consumers |
| 6 | 3 | Delete ChapterGrid.tsx + docs (can run after Step 3 confirms replacement) |
| 7 | 1-6 | Integration tests + build verification |

Steps 2 and 3 can be built in parallel (both depend only on Step 1).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | View-Stack Provider + Persistence | [COMPLETE] | 2026-04-07 | Created `lib/bible/drawerStack.ts` (read/write/clear with 24h TTL). Extended `BibleDrawerProvider.tsx` with pushView, popView, resetStack, currentView, viewStack, open(initialView?) overload. 15 tests pass. |
| 2 | View-Stack Rendering + Slide Transitions | [COMPLETE] | 2026-04-07 | Created `DrawerViewRouter.tsx` with VIEW_COMPONENTS map (books→BooksView wrapper, chapters→ChapterPickerView stub). 3 view-slide keyframes + animations added to tailwind.config.js. BooksView wrapper bridges BooksDrawerContent's onSelectBook→pushView. 6 tests pass. |
| 3 | ChapterPickerView Component | [COMPLETE] | 2026-04-07 | Created `ChapterPickerView.tsx` (full implementation), `ContinueReadingCallout.tsx`, `ChapterJumpOverlay.tsx`. All in `books/` subdirectory. 23 ChapterPickerView + 3 ContinueReadingCallout tests pass. |
| 4 | BooksDrawerContent → pushView | [COMPLETE] | 2026-04-07 | Removed `onSelectBook` prop from BooksDrawerContent. Book cards now call `pushView({ type: 'chapters', bookSlug })` via `useBibleDrawer()`. Updated BibleReader.tsx (3 call sites), BibleLanding.tsx (1 call site). Updated DrawerViewRouter to use BooksDrawerContent directly (removed BooksView wrapper). 24 BooksDrawerContent tests pass. |
| 5 | ReaderChrome + Drawer Consumer Wiring | [COMPLETE] | 2026-04-07 | Added `bookSlug` prop to ReaderChrome; center label calls `open({ type: 'chapters', bookSlug })`; books icon calls `open()`. Replaced BooksDrawerContent with DrawerViewRouter in BibleReader.tsx (3 sites) and BibleLanding.tsx (1 site). All 12 ReaderChrome tests pass. Build clean. |
| 6 | Delete ChapterGrid + Docs | [COMPLETE] | 2026-04-07 | Documented `wr_bible_drawer_stack` in 11-local-storage-keys.md. **Deviation:** ChapterGrid.tsx NOT deleted — plan said it was orphaned but it's used by BookEntry→CategoryGroup→TestamentAccordion→BibleBooksMode→BibleBrowser chain. Deletion would break the BibleBrowser page. |
| 7 | Tests + Build Verification | [COMPLETE] | 2026-04-07 | Created drawerStack.test.ts (6 tests). Fixed DrawerViewRouter tests (added MemoryRouter). All 89 tests pass across 7 test files. Build passes (0 errors, 0 warnings). Lint has 3 pre-existing errors in unrelated files. No `onSelectBook` references remain. |
