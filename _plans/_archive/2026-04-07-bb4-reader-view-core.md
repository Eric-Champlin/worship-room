# Implementation Plan: BB-4 Reader View Core

**Spec:** `_specs/bb4-reader-view-core.md`
**Date:** 2026-04-07
**Branch:** `bible-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** N/A — part of Bible Redesign series, no master plan document

---

## Architecture Context

### Project Structure

Bible-related files:
- **Pages:** `frontend/src/pages/BibleReader.tsx` (current reader — 364 lines, heavily coupled to audio/highlights/notes), `BibleLanding.tsx` (BB-0), `BibleBrowse.tsx` (old), `BibleBrowser.tsx` (legacy)
- **Components:** `frontend/src/components/bible/` — `VerseDisplay.tsx` (422 lines, current verse rendering with click handlers, highlights, notes), `ChapterNav.tsx` (45 lines, simple prev/next within same book), `BibleDrawer.tsx` (101 lines, slide-in drawer shell), `BooksDrawerContent.tsx` (337 lines, book browsing with search), `BibleDrawerProvider.tsx` (33 lines, context for drawer open/close/toggle)
- **Data:** `data/bible/index.ts` loads from `./books/json/[slug].json` (old format: `BibleChapter[]` array). New BB-4 data lives in `data/bible/web/[slug].json` (new format: `{ book, slug, testament, chapters: [{ number, verses, paragraphs }] }`)
- **Types:** `types/bible.ts` — `BibleChapter { bookSlug, chapter, verses }`, `BibleVerse { number, text }`. Missing: `paragraphs` field.
- **Types:** `types/bible-landing.ts` — `LastRead { book, chapter, verse, timestamp }` (BB-0 reads, BB-4 writes)
- **Constants:** `constants/bible.ts` — `BIBLE_BOOKS` (66 entries, canonical order Genesis→Revelation), `BIBLE_PROGRESS_KEY`
- **Hooks:** `useBibleProgress.ts` (reads/writes `wr_bible_progress`), `useBibleHighlights.ts`, `useBibleNotes.ts`, `useBibleAudio.ts`
- **Landing state:** `lib/bible/landingState.ts` — `getLastRead()` reads `wr_bible_last_read`

### Key Data Shape Difference

Old JSON (`books/json/john.json`): flat array `[{ bookSlug: "john", chapter: 1, verses: [...] }, ...]`
New JSON (`web/john.json`): nested `{ book: "John", slug: "john", testament: "NT", chapters: [{ number: 1, verses: [...], paragraphs: [] }] }`

BB-4 loads from the `web/` directory. The `loadChapter` function needs updating to adapt the new shape.

### Existing Patterns to Follow

- **BibleDrawer + BibleDrawerProvider:** Right-side slide-in drawer with focus trap, scroll lock, Escape to close. `useBibleDrawer()` context exposes `{ isOpen, open, close, toggle, triggerRef }`. The provider does NOT have a view-stack or `pushView` API — opening always defaults to the book list. The spec's center-label tap (open chapter picker for current book) must simply call `open()` — the drawer starts at book list; user taps into the current book.
- **useFocusTrap():** `hooks/useFocusTrap.ts` — `(isActive, onEscape?) → containerRef`. Focus cycling + Escape handling.
- **useReducedMotion():** `hooks/useReducedMotion.ts` — boolean reflecting `prefers-reduced-motion`.
- **FrostedCard:** `components/homepage/FrostedCard.tsx` — `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl p-6`.
- **Z-index scale:** `constants/z-index.ts` — `Z.DRAWER_BACKDROP=10000`, `Z.DRAWER=10001`.
- **ATMOSPHERIC_HERO_BG:** Radial gradient used by PageHero — `radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)` over `#0f0a1e`.
- **Scroll lock:** `document.body.style.overflow = 'hidden'` in useEffect cleanup.
- **Route code splitting:** All pages use `React.lazy()` in `App.tsx`.
- **Test patterns:** Vitest + React Testing Library + jsdom. Wrap in `MemoryRouter` for routing. Mock localStorage. Use `@testing-library/user-event` for interactions.

### Cross-Book Navigation

`BIBLE_BOOKS` array is ordered Genesis→Revelation (66 entries). For cross-book boundary:
- Find current book's index in `BIBLE_BOOKS`
- Next chapter from last chapter → book at `index + 1`, chapter 1
- Previous chapter from chapter 1 → book at `index - 1`, last chapter
- Genesis 1 (index 0, chapter 1): no previous
- Revelation 22 (index 65, chapter 22): no next

### Blank Verses

Five WEB critical-text omissions have empty text: Luke 17:36, Acts 8:37, 15:34, 24:7, Romans 16:25. The reader skips rendering these (filter out verses where `text` is empty/whitespace).

---

## Auth Gating Checklist

**The Bible reader is fully public. No auth gates.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Read any chapter | Public | All steps | N/A — no auth required |
| Typography settings | Public, localStorage | Step 4 | N/A |
| Read tracking writes | Public, localStorage | Step 7 | N/A (writes for all users) |

The spec explicitly states: "The Bible reader is fully public. No auth gates." Read tracking writes to localStorage for all users (not auth-gated like `markChapterRead` in `useBibleProgress`).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `#08051A` (`bg-hero-bg`) | design-system.md |
| Reader body (Midnight) | background | `#08051A` to `#0D0620` gradient | codebase hero-bg/hero-dark |
| Reader body (Parchment) | background | `#F5F0E8` cream | [UNVERIFIED] → verify with Playwright |
| Reader body (Parchment) | text color | `#3E2C1A` dark brown | [UNVERIFIED] → verify with Playwright |
| Reader body (Sepia) | background | `#E8D5B7` warm tan | [UNVERIFIED] → verify with Playwright |
| Reader body (Sepia) | text color | `#2C1A0A` darker brown | [UNVERIFIED] → verify with Playwright |
| Verse number superscript | class | `text-xs text-white/30 align-super font-sans mr-1` | codebase VerseDisplay.tsx:330 |
| Verse text (Midnight, serif, M) | class | `font-serif text-lg leading-[1.8] text-white/90` | spec requirement |
| Chrome background | backdrop | `backdrop-blur-md bg-hero-bg/70` with gradient fade | [UNVERIFIED] — new pattern |
| Chapter heading book name | style | `text-white text-2xl sm:text-3xl font-serif font-normal tracking-wide` | [UNVERIFIED] — new pattern |
| Chapter heading number | style | `text-white/40 text-6xl sm:text-7xl font-serif font-light` | [UNVERIFIED] — new pattern |
| Bottom nav buttons | class | (matches existing ChapterNav) `border border-white/20 bg-white/10 px-6 py-3 text-sm text-white/70 rounded-lg min-h-[44px]` | codebase ChapterNav.tsx:24-26 |
| Primary purple | hex | `#6D28D9` | design-system.md |
| FrostedCard (error states) | class | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | design-system.md |

**[UNVERIFIED] values:**
- Parchment/Sepia theme colors: best guesses based on common Bible reader patterns. → To verify: Run `/verify-with-playwright` side-by-side with YouVersion. → If wrong: adjust based on visual review.
- Chrome backdrop: new pattern not in design system. → To verify: visual inspection. → If wrong: tune opacity/blur.
- Chapter heading sizes: new "hardcover" treatment. → To verify: visual inspection for balance. → If wrong: adjust font sizes.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. **BB-4 chapter heading deliberately does NOT use this** — it uses a restrained classical serif treatment (white text + muted chapter number) to feel like a hardcover chapter opening.
- The reader page does NOT use `Layout` component wrapper (no Navbar, no SiteFooter) — it's an immersive reading experience with its own chrome. This is a NEW pattern — no other page in the app omits the global navbar.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component for error states.
- All colors must use design system tokens — no raw hex values in component code. Parchment/Sepia theme colors should be defined as CSS custom properties or Tailwind tokens.
- Mood colors, textarea glow, HorizonGlow, and Daily Hub patterns are NOT relevant to the Bible reader.
- The `BibleDrawerProvider` does NOT have a `pushView` or `initialView` prop. Calling `open()` always opens to the default book list view. The "center label opens chapter picker" spec requirement is handled by opening the drawer (which starts at book list — user taps into the book to see chapters).
- Touch targets: minimum 44px on all interactive elements (icon buttons, nav buttons, verse jump pill input).
- `prefers-reduced-motion`: all animations become instant (no swipe visual, no chapter transition, no chrome auto-dim fade). Swipe gesture detection still works — just no visual displacement during the gesture.
- `env(safe-area-inset-*)`: the verse jump pill uses the Sticky FAB Pattern with safe area insets.

---

## Shared Data Models (from Master Plan)

N/A — no master plan. BB-4 uses existing types with one extension.

```typescript
// Extended BibleChapter — add optional paragraphs field
export interface BibleChapter {
  bookSlug: string
  chapter: number
  verses: BibleVerse[]
  paragraphs?: number[] // verse numbers that start new paragraphs
}

// New: Reader typography settings
export interface ReaderSettings {
  theme: 'midnight' | 'parchment' | 'sepia'
  typeSize: 's' | 'm' | 'l' | 'xl'
  lineHeight: 'compact' | 'normal' | 'relaxed'
  fontFamily: 'serif' | 'sans'
}

// Existing — no changes
export interface LastRead {
  book: string      // book name, e.g. "John"
  chapter: number
  verse: number
  timestamp: number
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_reader_theme` | Both | NEW — reading theme (default: midnight) |
| `wr_bible_reader_type_size` | Both | NEW — type size (default: m) |
| `wr_bible_reader_line_height` | Both | NEW — line height (default: normal) |
| `wr_bible_reader_font_family` | Both | NEW — font family (default: serif) |
| `wr_bible_last_read` | Write | EXISTING — last read position stub |
| `wr_bible_progress` | Write | EXISTING — chapter completion tracking |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-width reader body `px-5`. Compact chrome (smaller label). Typography sheet as full-width bottom sheet. Swipe navigation enabled. Chapter nav full-width. Verse jump pill 44px touch target. |
| Tablet | 768px | Reader body centered `max-w-2xl`. Standard chrome. Typography sheet as bottom sheet. Swipe enabled. Chapter nav standard row. |
| Desktop | 1440px | Reader body centered `max-w-2xl`. Full chrome. Typography sheet as floating panel near Aa icon. **No swipe** (desktop only). Chapter nav with generous spacing. |

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Top chrome icons | Back button, center label, Aa icon, Books icon | Same y ±5px at all breakpoints | N/A — always single row |
| Bottom nav buttons | Previous chapter, Next chapter | Same y ±5px at ≥640px | Stacked at <640px is acceptable |
| Typography size buttons | S, M, L, XL | Same y ±5px at all sizes | N/A — fixed-width buttons |
| Typography line height buttons | Compact, Normal, Relaxed | Same y ±5px | N/A |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Top chrome → chapter heading | ≥64px padding-top on reader body | spec requirement #19 |
| Chapter heading → first verse | 24-32px | [UNVERIFIED] — new pattern |
| Last verse → bottom nav footer | ≥48px | spec requirement #20 |
| Bottom nav → page bottom | 64px (`pb-16`) | matches current reader |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 66 WEB JSON files exist in `frontend/src/data/bible/web/` (verified — 66 files present)
- [x] `BibleDrawerProvider` wraps the reader route (verify in `App.tsx` or page component)
- [x] `paragraphs` field is `[]` for all chapters in current data (verified — empty arrays, fall back to continuous text)
- [ ] BB-2 (BooksDrawerContent) is committed and functional on this branch
- [ ] BB-3 (chapter picker inside drawer) is committed — UNCLEAR: spec says BB-4 depends on BB-3 but BooksDrawerContent already has chapter selection via `onSelectBook`. Resolve: confirm BB-3 is done or adjust center-label click behavior.
- [x] All auth-gated actions from the spec are accounted for (none — fully public)
- [x] Design system values are verified (from reference or codebase inspection)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [x] No deprecated patterns used

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Center label tap behavior | Opens BibleDrawer to book list (default view) | BibleDrawerProvider has no `pushView` API. User taps into current book to see chapters. Simple and consistent. |
| Data source | Load from `web/` JSON files, keep old `books/json/` loaders intact | Spec requirement #4 mandates `web/` path. Old loaders remain for backward compatibility with existing search, audio, etc. |
| Blank verses (5 WEB omissions) | Skip rendering — filter `verse.text.trim() !== ''` | Spec says "skip rendering these rather than showing an empty verse marker" |
| Theme CSS scoping | CSS data-attribute on reader body container (`data-reader-theme="parchment"`) | Chrome and nav stay dark; only the reader body container changes colors |
| No Layout/Navbar | Reader renders without `<Layout>` wrapper | Immersive reading experience; back button provides escape hatch to `/bible` |
| Cross-book nav labels | Show "Book Chapter" (e.g., "Mark 1") not just "Next" | Users need to know where they're going, especially at book boundaries |
| Verse jump pill visibility | Show after scroll past verse 20 on chapters with >40 verses | Spec requirements #43-44 |
| `loadChapter` backward compat | Add new `loadChapterWeb()` function instead of modifying existing `loadChapter` | Existing consumers (search, audio, highlights) continue to work unchanged |
| Swipe threshold | 50% viewport width OR velocity > 0.5 px/ms | Spec requirement #35 |
| Chrome auto-dim | 30% opacity after 4s idle; restored on any interaction | Spec requirement #12 |
| Typography sheet on desktop | Small floating panel anchored below Aa icon (not bottom sheet) | Spec requirement #24 |

---

## Implementation Steps

### Step 1: Data Layer — WEB JSON Loader + Type Extension

**Objective:** Add a new data loader for the BB-4 `web/` JSON format and extend the `BibleChapter` type with the `paragraphs` field.

**Files to create/modify:**
- `frontend/src/types/bible.ts` — add optional `paragraphs` to `BibleChapter`
- `frontend/src/data/bible/index.ts` — add `loadChapterWeb()` function + `WEB_BOOK_LOADERS`

**Details:**

1. In `types/bible.ts`, add `paragraphs?: number[]` to `BibleChapter` interface.

2. In `data/bible/index.ts`:
   - Define a new raw type for the WEB JSON shape:
     ```typescript
     interface WebBookJson {
       book: string
       slug: string
       testament: string
       chapters: Array<{
         number: number
         verses: BibleVerse[]
         paragraphs: number[]
       }>
     }
     ```
   - Create `WEB_BOOK_LOADERS: Record<string, () => Promise<WebBookJson>>` mapping all 66 slugs to `() => import('./web/[slug].json').then(m => m.default as WebBookJson)`.
   - Create `loadChapterWeb(bookSlug: string, chapter: number): Promise<BibleChapter | null>` that:
     - Looks up the loader in `WEB_BOOK_LOADERS`
     - Awaits the JSON
     - Finds the chapter by `number` field
     - Returns `{ bookSlug, chapter, verses: ch.verses.filter(v => v.text.trim() !== ''), paragraphs: ch.paragraphs }` — note: filters blank verses
     - Returns `null` on any failure

3. Export `getAdjacentChapter(bookSlug: string, chapter: number, direction: 'prev' | 'next'): { bookSlug: string, bookName: string, chapter: number } | null` utility:
   - Uses `BIBLE_BOOKS` array index for cross-book navigation
   - Returns `null` for Genesis 1 prev / Revelation 22 next

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT modify the existing `BOOK_LOADERS` or `loadChapter` — they serve existing consumers (search, audio, highlights)
- DO NOT duplicate the 66-entry loader map manually — generate it programmatically from `BIBLE_BOOKS` or `BOOKS_WITH_FULL_TEXT` if possible; if not, copy the `BOOK_LOADERS` pattern but point to `./web/` paths

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| loadChapterWeb returns correct data for john/3 | unit | Verify 36 verses, chapter heading correct |
| loadChapterWeb filters blank verses | unit | Mock a verse with empty text, verify it's excluded |
| loadChapterWeb returns null for invalid book | unit | Pass "notabook", expect null |
| loadChapterWeb returns null for invalid chapter | unit | Pass john/99, expect null |
| getAdjacentChapter cross-book forward | unit | matthew/28 next → mark/1 |
| getAdjacentChapter cross-book backward | unit | mark/1 prev → matthew/28 |
| getAdjacentChapter genesis/1 prev is null | unit | No previous for first chapter |
| getAdjacentChapter revelation/22 next is null | unit | No next for last chapter |

**Expected state after completion:**
- [ ] `loadChapterWeb('john', 3)` returns `BibleChapter` with 36 verses and `paragraphs: []`
- [ ] `getAdjacentChapter('matthew', 28, 'next')` returns `{ bookSlug: 'mark', bookName: 'Mark', chapter: 1 }`
- [ ] Existing `loadChapter` function unchanged and still works

---

### Step 2: Reader Settings Hook + Theme Tokens

**Objective:** Create a custom hook for reader typography settings persistence and define CSS tokens for the three reading themes.

**Files to create/modify:**
- `frontend/src/hooks/useReaderSettings.ts` — NEW: hook for reader settings
- `frontend/src/index.css` — add CSS custom properties for Parchment/Sepia themes

**Details:**

1. Create `useReaderSettings()` hook:
   ```typescript
   const DEFAULTS: ReaderSettings = {
     theme: 'midnight',
     typeSize: 'm',
     lineHeight: 'normal',
     fontFamily: 'serif',
   }
   
   export function useReaderSettings() {
     // Read each setting from its own localStorage key on mount
     // Return { settings, updateSetting(key, value), resetToDefaults() }
     // Each updateSetting writes to the individual localStorage key
     // Settings apply live (no Apply button)
   }
   ```
   - Keys: `wr_bible_reader_theme`, `wr_bible_reader_type_size`, `wr_bible_reader_line_height`, `wr_bible_reader_font_family`
   - Type-safe: validate stored values against allowed options

2. Define theme color tokens in `index.css` (used by `data-reader-theme` attribute):
   ```css
   [data-reader-theme="midnight"] {
     --reader-bg: #08051A;
     --reader-text: rgba(255, 255, 255, 0.90);
     --reader-verse-num: rgba(255, 255, 255, 0.30);
     --reader-divider: rgba(255, 255, 255, 0.10);
   }
   [data-reader-theme="parchment"] {
     --reader-bg: #F5F0E8;
     --reader-text: #3E2C1A;
     --reader-verse-num: rgba(62, 44, 26, 0.35);
     --reader-divider: rgba(62, 44, 26, 0.15);
   }
   [data-reader-theme="sepia"] {
     --reader-bg: #E8D5B7;
     --reader-text: #2C1A0A;
     --reader-verse-num: rgba(44, 26, 10, 0.35);
     --reader-divider: rgba(44, 26, 10, 0.15);
   }
   ```

3. Define size/line-height/font lookup maps in the hook:
   - Type size: `{ s: 'text-base', m: 'text-lg', l: 'text-xl', xl: 'text-2xl' }`
   - Line height: `{ compact: 'leading-snug', normal: 'leading-[1.8]', relaxed: 'leading-loose' }`
   - Font: `{ serif: 'font-serif', sans: 'font-sans' }`

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT use inline styles for theme colors — use CSS custom properties so the theme scoping works via a data attribute
- DO NOT add raw hex values in component code — define tokens and reference them
- DO NOT use `animate-glow-pulse` or any deprecated patterns

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| useReaderSettings returns defaults when no localStorage | unit | All 4 settings match defaults |
| useReaderSettings reads from localStorage | unit | Set keys, verify hook returns stored values |
| updateSetting persists to localStorage | unit | Call update, verify localStorage value |
| resetToDefaults clears all 4 keys | unit | Set non-defaults, reset, verify defaults |
| invalid localStorage values fall back to defaults | unit | Store garbage, verify defaults returned |

**Expected state after completion:**
- [ ] `useReaderSettings()` hook reads/writes 4 localStorage keys
- [ ] CSS custom properties defined for 3 themes
- [ ] Settings survive page reload

---

### Step 3: Reader Page Shell + Chapter Heading + Verse Body

**Objective:** Create the new immersive reader page with chapter heading, flowing prose verse rendering, and data attributes on verse spans.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — REWRITE: new immersive reader replacing the current 364-line component
- `frontend/src/components/bible/reader/ChapterHeading.tsx` — NEW: two-line classical heading
- `frontend/src/components/bible/reader/ReaderBody.tsx` — NEW: flowing prose with verse spans

**Details:**

1. **BibleReader.tsx** — new page component:
   - Does NOT wrap in `<Layout>` (no global navbar/footer — immersive reading)
   - Wraps in `<BibleDrawerProvider>` (for drawer access)
   - Reads `useParams<{ book, chapter }>()` from route
   - Validates book slug via `getBookBySlug()`, chapter number via parseInt
   - Calls `loadChapterWeb(bookSlug, chapterNumber)` in useEffect
   - Three-zone layout:
     ```
     <div className="relative min-h-screen" style={{ background: 'var(--reader-bg)' }} data-reader-theme={settings.theme}>
       <ReaderChrome />           {/* Step 4 */}
       <main className="mx-auto max-w-2xl px-5 sm:px-6 pt-20 sm:pt-24 pb-8">
         <ChapterHeading bookName={book.name} chapter={chapterNumber} />
         <ReaderBody verses={verses} bookSlug={bookSlug} chapter={chapterNumber} settings={settings} />
       </main>
       <ReaderChapterNav />       {/* Step 5 */}
     </div>
     ```
   - Provides `aria-busy="true"` on main during loading
   - SEO: `<SEO title="{Book} {Chapter} (WEB)" description="Read {Book} chapter {chapter}..." />`

2. **ChapterHeading.tsx**:
   - Two-line classical treatment:
     - Line 1: Book name — `text-2xl sm:text-3xl font-serif font-normal tracking-wide` in `var(--reader-text)`
     - Line 2: Chapter number — `text-6xl sm:text-7xl font-serif font-light` in `var(--reader-verse-num)` (muted accent)
   - Thin divider rule below: `border-b` using `var(--reader-divider)`, `max-w-[4rem] mx-auto mt-4 mb-8`
   - Centered text (`text-center`)
   - Semantic: `<header>` with `<h1>` containing both lines (visually styled, semantically one heading)

3. **ReaderBody.tsx**:
   - Renders verses as continuous flowing prose:
     ```tsx
     {verses.filter(v => v.text.trim()).map(verse => (
       <span
         key={verse.number}
         data-verse={String(verse.number)}
         data-book={bookSlug}
         data-chapter={String(chapter)}
         className={/* themed text classes */}
       >
         <sup className="mr-1 align-super font-sans" style={{ fontSize: '0.7em', color: 'var(--reader-verse-num)' }}>
           {verse.number}
         </sup>
         {verse.text}{' '}
       </span>
     ))}
     ```
   - Paragraph breaks: if `paragraphs` array is non-empty, insert `<br /><br />` before verses whose number is in the `paragraphs` array (except the first verse). Falls back to continuous text when `paragraphs` is empty.
   - Theme-responsive text: `style={{ color: 'var(--reader-text)' }}`
   - Size/line-height/font from settings (class names from Step 2 lookup maps)
   - **DOM contract for BB-6/7/8:** every verse wrapped in `<span>` with `data-verse`, `data-book`, `data-chapter`
   - **No click handler** on verses — BB-4 contract: tapping a verse does nothing
   - `tabIndex` is NOT set on verse spans (they are not interactive in BB-4)

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl` centered, `px-6`
- Tablet (768px): `max-w-2xl` centered, `px-6`
- Mobile (375px): full-width, `px-5`

**Guardrails (DO NOT):**
- DO NOT use `<Layout>` wrapper — the reader is immersive (no global navbar/footer)
- DO NOT add `onClick`, `onKeyDown`, `role="button"`, or `tabIndex` to verse spans — BB-4 verse taps do nothing (BB-6 adds interaction)
- DO NOT use `GRADIENT_TEXT_STYLE` on the chapter heading — this uses a distinct classical serif treatment
- DO NOT use Caveat font anywhere
- DO NOT use `dangerouslySetInnerHTML` for verse text

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders all verses of John 3 | integration | Load /bible/john/3, verify 36 verse spans present |
| verse spans have correct data attributes | integration | Each span has data-verse, data-book="john", data-chapter="3" |
| tapping a verse does nothing | integration | Click verse span, verify no modal/navigation/highlight |
| chapter heading shows book name and number | integration | Verify "John" and "3" text in heading |
| blank verses are skipped | unit | Pass verse with empty text, verify not rendered |
| paragraph breaks inserted when paragraphs array has entries | unit | Pass paragraphs: [5, 10], verify breaks before v5 and v10 |
| no paragraph breaks when paragraphs is empty | unit | Pass paragraphs: [], verify continuous text |
| theme data attribute applied | integration | Verify `data-reader-theme` on container matches settings |

**Expected state after completion:**
- [ ] `/bible/john/3` renders John 3 in flowing prose
- [ ] Every verse span has `data-verse`, `data-book`, `data-chapter` attributes
- [ ] Verse taps do nothing
- [ ] Chapter heading is a classical two-line treatment

---

### Step 4: Top Chrome — Sticky Header with Auto-Dim

**Objective:** Create the sticky transparent header with back button, center label, Aa icon, Books icon, and 4-second auto-dim behavior.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderChrome.tsx` — NEW: sticky top chrome
- `frontend/src/hooks/useChromeDim.ts` — NEW: auto-dim behavior hook

**Details:**

1. **useChromeDim()** hook:
   - Returns `{ opacity, handlers }` where:
     - `opacity` is 1.0 normally, 0.3 after 4 seconds of no interaction
     - `handlers` = `{ onMouseMove, onTouchStart, onScroll }` to reset the timer
   - Uses `useReducedMotion()` — if reduced motion, opacity is always 1.0 (no auto-dim)
   - Timer: `setTimeout` set to 4000ms, reset on any mouse/touch/scroll event
   - CSS transition: `transition-opacity duration-500` for smooth dim/restore

2. **ReaderChrome.tsx**:
   - Position: `fixed top-0 left-0 right-0 z-30`
   - Background: `bg-hero-bg/80 backdrop-blur-md` with a gradient fade at bottom edge (`bg-gradient-to-b from-hero-bg/80 to-transparent h-4` pseudo-element below chrome)
   - Height: ~56px with safe area: `pt-[env(safe-area-inset-top)]`
   - Layout: `flex items-center justify-between px-4 h-14`
   - **Left:** Back button → navigates to `/bible`
     - Lucide `ArrowLeft` icon, `min-h-[44px] min-w-[44px]` touch target
     - `aria-label="Back to Bible"` 
   - **Center:** Book + chapter label (e.g., "John 3")
     - `button` element that calls `bibleDrawer.open()` and sets `bibleDrawer.triggerRef.current` to itself
     - `text-white/90 text-base font-medium`
     - `aria-label="Open chapter picker"`
   - **Right:** Two icon buttons in a `flex items-center gap-1`
     - Aa icon (Lucide `Type` or custom "Aa" text): opens typography sheet
       - `aria-label="Typography settings"`
       - `aria-expanded={isTypographyOpen}`
     - Books icon (Lucide `BookOpen`): opens books drawer
       - `aria-label="Browse books"`
       - Calls `bibleDrawer.open()` + sets triggerRef
   - All icon buttons: `min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors`
   - **Leave empty space** between Aa and Books icons for future BB-5 (focus mode) and BB-26 (audio) icons
   - Auto-dim: container `style={{ opacity: chromeOpacity }}` with `transition: opacity 500ms ease`
   - The dim handlers are attached to the window (scroll, mousemove, touchstart) via the hook

3. Integrate into BibleReader.tsx from Step 3:
   - Mount `<ReaderChrome>` above `<main>`
   - Pass typography sheet open/close state as props
   - The chrome dims independently — main content is not affected

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): full chrome, all icons visible
- Tablet (768px): same
- Mobile (375px): slightly smaller label font (`text-sm`), same icons

**Inline position expectations:**
- Back button, center label, and right icons must share y-coordinate at all breakpoints (±5px)

**Guardrails (DO NOT):**
- DO NOT use the global Navbar component — the reader has its own chrome
- DO NOT add additional navigation items beyond what the spec defines (back, label, Aa, books)
- DO NOT use `position: sticky` — use `position: fixed` so chrome stays visible during long chapters

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| back button navigates to /bible | integration | Click back, verify navigation |
| center label opens books drawer | integration | Click "John 3", verify drawer.open called |
| Aa icon toggles typography sheet | integration | Click, verify sheet opens |
| books icon opens drawer | integration | Click books icon, verify drawer opens |
| chrome auto-dims after 4s | unit | Fast-forward 4s, verify opacity is 0.3 |
| interaction restores chrome opacity | unit | Dim, then fire mousemove, verify opacity is 1 |
| reduced motion skips auto-dim | unit | Set prefers-reduced-motion, verify opacity stays 1 |
| all icon buttons have 44px touch targets | integration | Verify min-height/width |

**Expected state after completion:**
- [ ] Sticky chrome with 4 interactive elements
- [ ] Chrome auto-dims after 4 seconds, restores on interaction
- [ ] Chrome stays dark theme regardless of reader body theme

---

### Step 5: Typography Settings Sheet

**Objective:** Create the typography settings sheet as a bottom sheet (mobile/tablet) or floating panel (desktop) with theme cards, size/line-height/font controls, and live preview.

**Files to create/modify:**
- `frontend/src/components/bible/reader/TypographySheet.tsx` — NEW: settings UI
- `frontend/src/pages/BibleReader.tsx` — integrate sheet open/close state

**Details:**

1. **TypographySheet.tsx**:
   - Props: `isOpen`, `onClose`, `settings: ReaderSettings`, `onUpdate: (key, value) => void`, `onReset: () => void`, `anchorRef?: RefObject<HTMLElement>` (Aa button ref for desktop positioning)
   - **Mobile/Tablet (<1024px):** Full-width bottom sheet, slide-up animation (`animate-bottom-sheet-slide-in`), backdrop scrim `bg-black/40`, max-height `max-h-[85vh]`, rounded-t-2xl
   - **Desktop (≥1024px):** Small floating panel `w-[320px]`, positioned below and right-aligned to the Aa icon, `rounded-2xl`, no backdrop (click outside closes)
   - Both variants: `useFocusTrap(isOpen, onClose)`, dark frosted glass `bg-[rgba(15,10,30,0.95)] backdrop-blur-md border border-white/10`
   - Close: X button (top right), Escape (via focus trap), backdrop click (mobile), click-outside (desktop)
   - Scroll lock on mobile only

2. **Content layout:**
   - **Section 1: Reading Theme** — 3 small preview cards in a row
     - Each card: `w-full aspect-[3/2] rounded-xl border cursor-pointer` showing a mini text preview
     - Midnight card: dark bg, white text sample
     - Parchment card: cream bg, brown text sample
     - Sepia card: tan bg, brown text sample
     - Active card: `border-primary ring-2 ring-primary/30`
     - Inactive: `border-white/10 hover:border-white/20`
   - **Section 2: Type Size** — 4 buttons in a row: S, M, L, XL
     - Segmented control pattern: `flex rounded-full border border-white/10 bg-white/[0.06] p-1`
     - Active: `bg-white/[0.15] text-white`
     - Inactive: `text-white/50`
   - **Section 3: Line Height** — 3 buttons: Compact, Normal, Relaxed
     - Same segmented control pattern
   - **Section 4: Font Family** — 2 buttons: Serif (Lora), Sans (Inter)
     - Same segmented control pattern
   - **Footer:** "Reset to defaults" text link — `text-white/50 text-sm underline`
   - All controls apply live via `onUpdate` callback — no Apply button

3. Integrate into BibleReader.tsx:
   - State: `const [typographyOpen, setTypographyOpen] = useState(false)`
   - Aa button ref for desktop positioning: `const aaRef = useRef<HTMLButtonElement>(null)`
   - Mount `<TypographySheet>` as a sibling to the reader, passing settings and handlers
   - Keyboard shortcut `,` toggles the sheet (Step 6)

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): floating panel ~320px wide, anchored near Aa icon
- Tablet (768px): full-width bottom sheet
- Mobile (375px): full-width bottom sheet, larger touch targets

**Guardrails (DO NOT):**
- DO NOT use an Apply button — settings apply live
- DO NOT persist settings to any server/API — localStorage only
- DO NOT use the AudioDrawer component — the typography sheet is lighter and uses different positioning

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| sheet opens when Aa icon clicked | integration | Click Aa, verify sheet renders |
| sheet closes on X button | integration | Click X, verify unmounted |
| sheet closes on Escape | integration | Press Escape, verify closed |
| theme cards switch theme live | integration | Click Parchment card, verify settings.theme === 'parchment' |
| type size buttons update setting | integration | Click L, verify settings.typeSize === 'l' |
| line height buttons update setting | integration | Click Relaxed, verify setting |
| font family buttons toggle | integration | Click Sans, verify setting |
| reset to defaults restores all | integration | Change settings, click reset, verify all defaults |
| desktop renders as floating panel | integration | Set viewport 1440px, verify panel positioning |
| mobile renders as bottom sheet | integration | Set viewport 375px, verify bottom-sheet layout |

**Expected state after completion:**
- [ ] Typography sheet opens/closes correctly
- [ ] All settings apply live to the reader body
- [ ] Settings persist across reload
- [ ] Desktop: floating panel; mobile: bottom sheet

---

### Step 6: Chapter Navigation — Bottom Footer + Cross-Book + Animation + Swipe + Keyboard

**Objective:** Build the bottom chapter navigation with cross-book boundary support, chapter change animation, mobile swipe gestures, and keyboard shortcuts.

**Files to create/modify:**
- `frontend/src/components/bible/reader/ReaderChapterNav.tsx` — NEW: bottom nav footer with cross-book support
- `frontend/src/hooks/useChapterSwipe.ts` — NEW: horizontal swipe gesture hook
- `frontend/src/pages/BibleReader.tsx` — integrate chapter transition animation, swipe, and keyboard shortcuts

**Details:**

1. **ReaderChapterNav.tsx**:
   - Props: `bookSlug, bookName, currentChapter, totalChapters`
   - Uses `getAdjacentChapter()` from Step 1 for prev/next
   - Left button: `← {PrevBook} {PrevChapter}` (e.g., "← Matthew 28" when on Mark 1)
   - Right button: `{NextBook} {NextChapter} →` (e.g., "Mark 1 →" when on Matthew 28)
   - Hide prev button when no previous (Genesis 1); hide next when no next (Revelation 22)
   - Both are `<Link>` elements using `to={/bible/${slug}/${chapter}}`
   - Styling matches existing `ChapterNav.tsx` pattern: `border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/70 rounded-lg min-h-[44px] transition-colors hover:bg-white/15` with `ChevronLeft`/`ChevronRight` icons
   - Layout: `flex justify-between` on desktop/tablet, `flex flex-col gap-3` on mobile (<640px)
   - Container: `mx-auto max-w-2xl px-5 sm:px-6 py-8 mt-8 border-t` using `var(--reader-divider)` for border color

2. **useChapterSwipe()** hook:
   - Only active on viewports <1024px (check `window.innerWidth` or media query)
   - Returns `{ touchHandlers, swipeOffset, isSwiping }` where:
     - `touchHandlers` = `{ onTouchStart, onTouchMove, onTouchEnd }`
     - `swipeOffset` = current finger displacement in px (for visual tracking)
     - `isSwiping` = true when a valid horizontal swipe is in progress
   - Angle threshold: only activate when swipe angle is within 30 degrees of horizontal (prevents interfering with vertical scroll)
   - Threshold: complete swipe if `|displacement| > 50% viewport width` OR `velocity > 0.5 px/ms`
   - Direction: left swipe = next chapter, right swipe = previous chapter
   - During swipe: reader body `transform: translateX(${swipeOffset}px)` tracks the finger
   - On incomplete swipe: snap back (`transition: transform 200ms ease-out`)
   - Uses `useReducedMotion()` — if reduced motion, no visual displacement but swipe detection still works (instant navigation on threshold)
   - Calls `navigate(/bible/${slug}/${chapter})` on successful swipe

3. **Chapter change animation:**
   - When chapter changes (detected by `bookSlug` or `chapterNumber` changing):
     - Outgoing: slide slightly to the exit side + fade to 0
     - Incoming: slide in from the opposite side + fade from 0 to 1
     - Duration: 280ms
     - Use CSS transitions on a wrapper div with `key={bookSlug}-${chapterNumber}` to force remount
     - `motion-safe:animate-fade-in` for the incoming content
     - Reduced motion: instant swap (no animation)
   - Scroll to top on chapter change

4. **Keyboard shortcuts** (add to BibleReader.tsx):
   - `ArrowLeft` → previous chapter (same as nav button)
   - `ArrowRight` → next chapter
   - `,` → toggle typography sheet
   - `b` → open books drawer
   - `Escape` → close typography sheet if open
   - Only active when no input/textarea is focused
   - Event listener on `window` with cleanup

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): no swipe. Nav buttons in row with generous spacing. Keyboard shortcuts active.
- Tablet (768px): swipe enabled. Nav buttons in row.
- Mobile (375px): swipe enabled. Nav buttons may stack (`flex-col` below 640px).

**Inline position expectations:**
- Prev and next buttons: same y at ≥640px (±5px). Stacked at <640px is acceptable.

**Guardrails (DO NOT):**
- DO NOT enable swipe on desktop (≥1024px) — swipe is mobile/tablet only per spec
- DO NOT interfere with vertical scrolling — the 30-degree angle threshold prevents this
- DO NOT use `e.preventDefault()` on touchmove unless a valid horizontal swipe is detected (allows vertical scroll to work normally)
- DO NOT reuse the existing `ChapterNav.tsx` component — the new one has cross-book navigation and themed divider

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| prev button navigates to previous chapter | integration | On John 3, verify link to /bible/john/2 |
| next button navigates to next chapter | integration | On John 3, verify link to /bible/john/4 |
| cross-book: Matthew 28 next goes to Mark 1 | integration | Verify correct link |
| Genesis 1 hides prev button | integration | Verify no prev button rendered |
| Revelation 22 hides next button | integration | Verify no next button rendered |
| keyboard ArrowRight navigates next | integration | Press ArrowRight, verify navigation |
| keyboard , toggles typography sheet | integration | Press comma, verify sheet opens |
| keyboard b opens books drawer | integration | Press b, verify drawer open called |
| swipe detection only on <1024px | unit | Set viewport, verify swipe handlers active/inactive |
| chapter change scrolls to top | integration | Navigate, verify scrollTop is 0 |

**Expected state after completion:**
- [ ] Bottom nav shows prev/next with book names, crosses book boundaries
- [ ] Swipe navigates chapters on mobile/tablet
- [ ] Keyboard shortcuts work (arrows, comma, b, escape)
- [ ] Chapter transition has 280ms slide-and-fade animation

---

### Step 7: Read Tracking Stub + Verse Jump Pill

**Objective:** Write read tracking data to localStorage on chapter load, and create the floating verse jump pill for long chapters.

**Files to create/modify:**
- `frontend/src/components/bible/reader/VerseJumpPill.tsx` — NEW: floating pill with verse number input
- `frontend/src/pages/BibleReader.tsx` — add read tracking writes and verse jump integration

**Details:**

1. **Read tracking stub** (in BibleReader.tsx):
   - On successful chapter load (when `verses` state is populated):
     ```typescript
     // TODO BB-17: replace stub
     localStorage.setItem('wr_bible_last_read', JSON.stringify({
       book: book.name,       // e.g., "John" (not slug)
       chapter: chapterNumber,
       verse: 1,
       timestamp: Date.now(),
     }))
     
     // TODO BB-17: replace stub
     const progressRaw = localStorage.getItem('wr_bible_progress')
     const progress: Record<string, number[]> = progressRaw ? JSON.parse(progressRaw) : {}
     const bookChapters = progress[bookSlug] ?? []
     if (!bookChapters.includes(chapterNumber)) {
       progress[bookSlug] = [...bookChapters, chapterNumber]
       localStorage.setItem('wr_bible_progress', JSON.stringify(progress))
     }
     ```
   - These writes happen for ALL users (logged in or out) — no auth check
   - Marked with `// TODO BB-17: replace stub` comments

2. **VerseJumpPill.tsx**:
   - Visibility condition: chapter has >40 verses AND user has scrolled past verse 20
   - Uses Intersection Observer on a sentinel element placed after verse 20
   - Position: fixed bottom-right, using Sticky FAB Pattern:
     ```tsx
     <div
       className="pointer-events-none fixed z-30 transition-opacity duration-200"
       style={{
         bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
         right: 'max(1.5rem, env(safe-area-inset-right))',
       }}
     >
       <div className="pointer-events-auto">
         {/* Pill content */}
       </div>
     </div>
     ```
   - Pill UI: rounded pill shape (`rounded-full`), dark frosted glass `bg-hero-bg/90 backdrop-blur-md border border-white/10 shadow-lg`
   - Contains: small number input (`type="number"`, `min=1`, `max={totalVerses}`, `inputMode="numeric"`) + "Go" button
   - Width: compact — ~120px
   - On submit: smooth-scroll to `#verse-{n}` element (`document.getElementById().scrollIntoView({ behavior: 'smooth', block: 'center' })`)
   - Reduced motion: `scrollIntoView({ behavior: 'auto' })` instead of smooth
   - Accessible: `aria-label="Jump to verse"`, input has `aria-label="Verse number"`

3. Integration in BibleReader.tsx:
   - Place a sentinel `<div>` after verse 20 in the verse list (if chapter has >40 verses)
   - Mount `<VerseJumpPill>` conditionally based on `verses.length > 40 && hasScrolledPastSentinel`
   - The pill has `id` attributes on verse spans to scroll to (e.g., `id="verse-100"`) — these are on the `<span>` elements in ReaderBody from Step 3

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): pill bottom-right with `1.5rem` offset
- Tablet (768px): same
- Mobile (375px): same, respects safe-area-inset

**Guardrails (DO NOT):**
- DO NOT use `useBibleProgress()` hook for the stub writes — that hook is auth-gated and has badge tracking side effects. BB-4 does raw localStorage writes for all users.
- DO NOT show the verse jump pill on chapters with ≤40 verses
- DO NOT show the pill before the user scrolls past verse 20

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| chapter load writes wr_bible_last_read | integration | Load john/3, verify localStorage value |
| chapter load appends to wr_bible_progress | integration | Load john/3, verify john:[3] in progress |
| duplicate chapter load doesn't duplicate progress | integration | Load john/3 twice, verify john:[3] not john:[3,3] |
| verse jump pill hidden on short chapters | integration | John 3 (36 verses), verify pill not rendered |
| verse jump pill shown on long chapters after scroll | integration | Psalm 119 (176 verses), scroll past v20, verify pill visible |
| verse jump scrolls to target verse | integration | Enter 100, click Go, verify scroll position |
| verse jump pill respects safe-area-inset | integration | Verify env() in styles |

**Expected state after completion:**
- [ ] Chapter load writes `wr_bible_last_read` and `wr_bible_progress`
- [ ] Resume Reading card on `/bible` reflects the chapter just read
- [ ] Verse jump pill appears on Psalm 119 after scrolling past verse 20
- [ ] Pill correctly smooth-scrolls to the target verse

---

### Step 8: Error States

**Objective:** Implement the three error states: invalid book, invalid chapter, and failed data load.

**Files to create/modify:**
- `frontend/src/pages/BibleReader.tsx` — add error state rendering logic

**Details:**

1. **Invalid book slug** (e.g., `/bible/notabook/1`):
   - `getBookBySlug(bookSlug)` returns undefined
   - Render centered FrostedCard:
     ```
     "That book doesn't exist."
     [Browse books] button → opens BibleDrawer
     ```
   - FrostedCard component from `components/homepage/FrostedCard.tsx`
   - Page still has dark background with subtle glow (use `ATMOSPHERIC_HERO_BG` or plain `bg-hero-bg`)
   - Include a simple back link: "← Back to Bible" link to `/bible`

2. **Invalid chapter** (e.g., `/bible/john/99`):
   - Book exists but `chapterNumber < 1 || chapterNumber > book.chapters || isNaN(chapterNumber)`
   - Render centered FrostedCard:
     ```
     "{Book.name} only has {book.chapters} chapters."
     [Go to Chapter {book.chapters}] button → navigates to last valid chapter
     [Browse books] button → opens BibleDrawer
     ```

3. **Failed data load**:
   - `loadChapterWeb` returns null or throws (after valid book + chapter)
   - Render centered FrostedCard:
     ```
     "Couldn't load this chapter. Check your connection."
     [Try Again] button → retries the load
     ```

4. All error states:
   - Dark background (`bg-hero-bg min-h-screen`)
   - Card centered vertically and horizontally
   - Buttons use `rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-primary-lt min-h-[44px]`
   - Include the simple top chrome (back button only) so users can navigate away

**Auth gating:** N/A

**Responsive behavior:** N/A: single centered card at all breakpoints

**Guardrails (DO NOT):**
- DO NOT redirect on invalid chapter — show the error state inline (spec says "renders a 404 error state" not "redirects")
- DO NOT use the existing `BookNotFound` component from the current reader (it doesn't match the new design)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| invalid book shows "doesn't exist" message | integration | Navigate to /bible/notabook/1, verify error card |
| invalid chapter shows chapter count | integration | Navigate to /bible/john/99, verify "21 chapters" message |
| invalid chapter has jump-to-last button | integration | Verify button links to /bible/john/21 |
| failed load shows retry button | integration | Mock loadChapterWeb to fail, verify retry button |
| retry button retries the load | integration | Click retry, verify loadChapterWeb called again |
| error states use FrostedCard | integration | Verify FrostedCard component rendered |

**Expected state after completion:**
- [ ] All 3 error states render correctly
- [ ] Users can recover from errors via buttons

---

### Step 9: Integration Tests + Playwright Smoke Test

**Objective:** Comprehensive test coverage for the reader view.

**Files to create/modify:**
- `frontend/src/components/bible/reader/__tests__/ReaderBody.test.tsx` — NEW: unit tests for verse rendering
- `frontend/src/components/bible/reader/__tests__/ReaderChrome.test.tsx` — NEW: chrome behavior tests
- `frontend/src/components/bible/reader/__tests__/TypographySheet.test.tsx` — NEW: settings tests
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — NEW: integration tests for the full page

**Details:**

1. **ReaderBody.test.tsx** (8 tests):
   - Renders all verses with correct data attributes
   - Skips blank verses
   - Paragraph breaks: renders breaks when paragraphs has entries
   - No click handler on verse spans
   - Theme-responsive colors via CSS custom properties
   - Size/line-height/font classes apply correctly

2. **ReaderChrome.test.tsx** (6 tests):
   - All 4 interactive elements render with correct aria-labels
   - Auto-dim behavior (mock timers)
   - Touch target sizes (44px minimum)
   - Keyboard shortcut handlers

3. **TypographySheet.test.tsx** (6 tests):
   - Opens and closes correctly
   - Theme selection updates setting
   - Size/line-height/font controls work
   - Reset to defaults
   - Focus trap behavior

4. **BibleReader.test.tsx** (10 tests):
   - Full page integration: load john/3, verify verse rendering
   - Error states: invalid book, invalid chapter, load failure
   - Chapter navigation: prev/next links correct
   - Cross-book navigation: matthew/28 next is mark/1
   - Read tracking: localStorage writes on load
   - Verse jump pill visibility conditions
   - SEO meta tags correct
   - No Layout/Navbar wrapper (verify immersive mode)

5. **Playwright smoke test** (`frontend/e2e/bible-reader.spec.ts`) — optional Playwright test to confirm:
   - Data attribute contract: every verse span has `data-verse`, `data-book`, `data-chapter`
   - Tapping a verse does NOT navigate or open anything
   - This confirms the BB-6/7/8 contract from a real browser

**Auth gating:** N/A

**Responsive behavior:** N/A: tests

**Guardrails (DO NOT):**
- DO NOT import real Bible JSON data in unit tests — mock the data with small verse arrays
- DO NOT test swipe gestures in jsdom (no real touch events) — those are Playwright territory
- DO NOT skip the data-attribute contract test — it's the most important test for downstream spec compatibility

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| 30+ tests across 4 files | unit + integration | Comprehensive reader coverage |
| Playwright contract test | e2e | data-verse/book/chapter attributes on all spans |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build passes (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Data attribute contract verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Data layer: WEB loader + type extension |
| 2 | — | Reader settings hook + theme tokens |
| 3 | 1, 2 | Reader page shell + heading + verse body |
| 4 | 3 | Top chrome with auto-dim |
| 5 | 2, 3, 4 | Typography settings sheet |
| 6 | 1, 3, 4, 5 | Chapter nav + swipe + keyboard shortcuts |
| 7 | 3 | Read tracking stub + verse jump pill |
| 8 | 3, 4 | Error states |
| 9 | 1-8 | Tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Data Layer — WEB JSON Loader | [COMPLETE] | 2026-04-07 | `types/bible.ts` (added `paragraphs?`), `data/bible/index.ts` (added `loadChapterWeb`, `getAdjacentChapter`, `WEB_BOOK_LOADERS`), `data/bible/__tests__/index.test.ts` (11 tests) |
| 2 | Reader Settings Hook + Theme Tokens | [COMPLETE] | 2026-04-07 | `hooks/useReaderSettings.ts` (hook + class maps), `index.css` (3 theme token blocks), `hooks/__tests__/useReaderSettings.test.ts` (5 tests) |
| 3 | Reader Page Shell + Heading + Body | [COMPLETE] | 2026-04-07 | `pages/BibleReader.tsx` (rewritten — immersive, no Layout), `components/bible/reader/ChapterHeading.tsx`, `components/bible/reader/ReaderBody.tsx`. Visual verified at 1440px + 375px. |
| 4 | Top Chrome — Sticky Header + Auto-Dim | [COMPLETE] | 2026-04-07 | `components/bible/reader/ReaderChrome.tsx`, `hooks/useChromeDim.ts`. All 4 icons aligned (0px y-diff). 44px touch targets verified. |
| 5 | Typography Settings Sheet | [COMPLETE] | 2026-04-07 | `components/bible/reader/TypographySheet.tsx` (single responsive panel — bottom sheet mobile, floating desktop). All 3 themes live-switch verified. Escape close works. Desktop: 320px panel at top-16 right-20. |
| 6 | Chapter Nav + Swipe + Keyboard | [COMPLETE] | 2026-04-07 | `components/bible/reader/ReaderChapterNav.tsx`, `hooks/useChapterSwipe.ts`, updated `BibleReader.tsx`. Cross-book nav verified (Matthew 28→Mark 1). Genesis 1 hides prev. Keyboard arrows + comma + b work. |
| 7 | Read Tracking + Verse Jump Pill | [COMPLETE] | 2026-04-07 | `components/bible/reader/VerseJumpPill.tsx` (with sentinel), updated `ReaderBody.tsx` (sentinel after v20), updated `BibleReader.tsx` (tracking + pill). localStorage writes verified, no duplicates, pill visibility conditions verified on Psalm 119. |
| 8 | Error States | [COMPLETE] | 2026-04-07 | Updated `BibleReader.tsx` with 3 FrostedCard error states (invalid book, invalid chapter, load failure). All have recovery buttons. Visual verified. |
| 9 | Integration Tests | [COMPLETE] | 2026-04-07 | 4 test files: `ReaderBody.test.tsx` (9), `ReaderChrome.test.tsx` (6), `TypographySheet.test.tsx` (6), `BibleReader.test.tsx` (10, rewritten for BB-4). Plus existing: `index.test.ts` (11), `useReaderSettings.test.ts` (5), `bible-data.test.ts` (22). Total 69 tests pass. Build + lint clean. |
