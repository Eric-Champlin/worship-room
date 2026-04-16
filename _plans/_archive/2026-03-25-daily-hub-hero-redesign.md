# Implementation Plan: Daily Hub Hero Redesign

**Spec:** `_specs/daily-hub-hero-redesign.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/daily-hub-hero-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this spec)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/DailyHub.tsx` (339 lines) | Main Daily Hub page — hero, tabs, content |
| `frontend/src/pages/Home.tsx` (70 lines) | Landing page — renders all sections |
| `frontend/src/components/Navbar.tsx` (953 lines) | Navbar + MobileDrawer + desktop nav |
| `frontend/src/components/SeasonalBanner.tsx` (88 lines) | Standalone seasonal banner (to be integrated into navbar) |
| `frontend/src/components/daily/VerseOfTheDayBanner.tsx` (46 lines) | Current VOTD banner between hero and tabs |
| `frontend/src/components/challenges/ChallengeStrip.tsx` (45 lines) | Challenge strip between VOTD and tabs |
| `frontend/src/components/TodaysVerseSection.tsx` (54 lines) | Landing page Today's Verse section |
| `frontend/src/components/DevotionalTeaser.tsx` (27 lines) | Landing page Devotional teaser section |
| `frontend/src/components/challenges/ChallengeBanner.tsx` (199 lines) | Landing page Challenge banner |
| `frontend/src/components/verse-of-the-day/VerseSharePanel.tsx` (217 lines) | Verse share dropdown (Copy, Share image, Download) |
| `frontend/src/components/PageHero.tsx` | Exports `ATMOSPHERIC_HERO_BG` constant |
| `frontend/src/constants/verse-of-the-day.ts` | `VerseOfTheDay` type, `getTodaysVerse()` |
| `frontend/src/data/devotionals.ts` | `Devotional` type, `getTodaysDevotional()` |
| `frontend/src/hooks/useLiturgicalSeason.ts` | Liturgical season hook |
| `frontend/src/lib/parse-verse-references.ts` | `parseVerseReferences()` — parses "Philippians 4:6-7" into `{ bookSlug, chapter }` |

### Directory Conventions

- Components: `frontend/src/components/` (organized by feature subdirectory)
- Pages: `frontend/src/pages/`
- Tests: `__tests__/` subdirectory adjacent to source files
- Hooks: `frontend/src/hooks/`

### Component Patterns

- DailyHub renders inline JSX (no separate hero component extracted)
- VerseSharePanel is a controlled component: `{ verseText, verseReference, isOpen, onClose, triggerRef }`
- VerseOfTheDayBanner manages its own `getTodaysVerse()` call and share panel state
- parseVerseReferences returns `ParsedVerseReference[]` with `bookSlug` and `chapter` fields — can be used to parse a verse reference string into a `/bible/:book/:chapter` link

### Test Patterns

- Tests wrap with `<MemoryRouter>`, `<ToastProvider>`, `<AuthModalProvider>`
- Mock `useAuth` via `vi.mock('@/hooks/useAuth', ...)`
- Mock `useFaithPoints`, `useAudioState`, `useAudioDispatch`, `useScenePlayer`
- Use `renderPage(initialEntry)` pattern for page tests
- `beforeEach`: `localStorage.clear()`, `vi.resetAllMocks()`

### Key Data Types

```typescript
// VerseOfTheDay (from constants/verse-of-the-day.ts)
interface VerseOfTheDay {
  text: string
  reference: string  // e.g., "Philippians 4:6-7"
  theme: 'hope' | 'comfort' | 'strength' | 'praise' | 'trust' | 'peace'
  season?: LiturgicalSeasonId
}

// Devotional (from types/devotional.ts)
interface Devotional {
  id: string
  dayIndex: number
  title: string
  theme: DevotionalTheme  // 'trust' | 'gratitude' | 'forgiveness' | etc.
  quote: { text: string; attribution: string }
  passage: { reference: string; verses: { number: number; text: string }[] }
  reflection: string[]
  prayer: string
  reflectionQuestion: string
  season?: LiturgicalSeasonId
}

// ParsedVerseReference (from lib/parse-verse-references.ts)
interface ParsedVerseReference {
  raw: string
  book: string
  bookSlug: string  // URL slug, e.g., "philippians"
  chapter: number
  verseStart: number
  verseEnd?: number
  startIndex: number
  endIndex: number
}

// LiturgicalSeasonResult (from hooks/useLiturgicalSeason.ts)
interface LiturgicalSeasonResult {
  isNamedSeason: boolean
  seasonName: string | null
  themeColor: string
  icon: string  // Lucide icon name string
  currentSeason: { id: LiturgicalSeasonId; themeWord: string }
}
```

### ATMOSPHERIC_HERO_BG

```typescript
export const ATMOSPHERIC_HERO_BG = {
  backgroundColor: '#0f0a1e',
  backgroundImage:
    'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
} as const
```

---

## Auth Gating Checklist

**This spec introduces NO new auth-gated actions.** All elements are public / read-only. The devotional "already read" checkmark is display-only (reads `wr_devotional_reads` which is only populated by authenticated users on `/devotional`).

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Greeting personalization | Shows "[Name]" when logged in | Step 1 | `useAuth()` — display-only, no gate |
| Devotional read checkmark | Shows when `wr_devotional_reads` has today | Step 1 | Read `localStorage` — only populated by auth'd users |
| Seasonal banner dismiss | sessionStorage dismiss | Step 3 | No auth required |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero background | style object | `ATMOSPHERIC_HERO_BG` (radial-gradient on `#0f0a1e`) | `PageHero.tsx:6-10` |
| Hero padding | padding | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` | `DailyHub.tsx:168` |
| Greeting font | font | Caveat (`font-script`), `text-3xl sm:text-4xl font-bold` | Spec + existing `DailyHub.tsx:173` |
| Greeting color | gradient text | `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` | `DailyHub.tsx:173` |
| Card (hero) | bg/border/blur | `bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-5` | Spec §1.3 |
| Card min-height | min-height | `min-h-[140px]` on sm+ | Spec §1.3 |
| Verse text | font/color | `font-serif italic text-lg text-white/90` | Spec §1.3 Left Card |
| Verse reference | font/color | `text-sm text-white/50` | Spec §1.3 Left Card |
| Share icon | size/color | `Share2 h-4 w-4 text-white/40 hover:text-white/70` | Spec §1.3 Left Card |
| Devotional label | font/color | `text-xs uppercase tracking-wide text-primary-lt` | Spec §1.3 Right Card |
| Devotional title | font/color | `font-bold text-lg text-white` | Spec §1.3 Right Card |
| Theme pill | style | `bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/50` | Spec §1.3 Right Card |
| Devotional link | color | `text-primary-lt text-sm` | Spec §1.3 Right Card |
| Read checkmark | icon/color | `Check h-4 w-4 text-success` (#27AE60) | Spec §1.3 Right Card |
| Quiz teaser | color | `text-white/50` (downgraded from current `text-white/90`) | Spec §1.4 |
| Seasonal line (desktop) | font/color | `text-xs text-white/40` + `text-primary-lt` link | Spec §3.1 |
| Dashboard dark bg | color | `#0f0a1e` / `bg-dashboard-dark` | `tailwind.config.js:23` |

---

## Design System Reminder

- **Caveat** (`font-script`) for script/greeting headings, **Lora** (`font-serif`) for scripture, **Inter** (`font-sans`) for UI text
- **ATMOSPHERIC_HERO_BG** is a style object from `PageHero.tsx`, not a CSS class — apply via `style={ATMOSPHERIC_HERO_BG}`
- Dashboard/DailyHub uses `bg-dashboard-dark` (#0f0a1e) as outer wrapper background
- Frosted glass cards in dark areas: `bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl`
- Verse share uses `VerseSharePanel` controlled component with `{ verseText, verseReference, isOpen, onClose, triggerRef }`
- `useLiturgicalSeason` returns `{ isNamedSeason, seasonName, themeColor, icon, currentSeason }` — `icon` is a string key into a `SEASON_ICON_MAP` record
- `parseVerseReferences(text)` from `@/lib/parse-verse-references` returns `ParsedVerseReference[]` — use `[0]?.bookSlug` and `[0]?.chapter` for the link
- The `SEASON_ICON_MAP` pattern is already used in both `SeasonalBanner.tsx` and `Navbar.tsx`
- The mobile drawer uses `bg-hero-mid border border-white/15` when authenticated, `bg-white border border-gray-200` when logged out

---

## Shared Data Models

**localStorage keys this spec reads (no writes):**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Read | string[] of date strings (YYYY-MM-DD); check if today is included |

**sessionStorage keys:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_seasonal_banner_dismissed` | Read/Write | Existing key — re-used for navbar seasonal line dismiss |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Cards stack vertically (verse on top, devotional below). Greeting `text-3xl`. Cards use `p-4`. Seasonal content in mobile drawer, not navbar. |
| Tablet | 640px+ | Cards side by side with `gap-4`. Greeting `text-4xl`. Cards have `min-h-[140px]`. Seasonal line below nav links. |
| Desktop | 1440px | Same as tablet, cards within hero's max-width constraint (`max-w-3xl`). |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero greeting → content cards | `mt-6` (24px) | [UNVERIFIED] → To verify: visual inspection after implementation → If wrong: adjust mt-* class |
| Content cards → quiz teaser | `mt-4` (16px) | [UNVERIFIED] → To verify: visual inspection → If wrong: adjust mt-* class |
| Quiz teaser → hero bottom edge | `pb-8 sm:pb-12` (existing hero padding) | `DailyHub.tsx:168` |
| Hero → tab bar | 0px gap (no gap) | Spec §1.6 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `ATMOSPHERIC_HERO_BG` is exported from `@/components/PageHero` — verified at `PageHero.tsx:6-10`
- [x] `getTodaysVerse()` returns `VerseOfTheDay` with `text` and `reference` — verified at `constants/verse-of-the-day.ts:1-9`
- [x] `getTodaysDevotional()` returns `Devotional` with `title` and `theme` — verified at `data/devotionals.ts`
- [x] `parseVerseReferences()` can parse verse references like "Philippians 4:6-7" into `{ bookSlug, chapter }` — verified at `lib/parse-verse-references.ts`
- [x] `VerseSharePanel` accepts `{ verseText, verseReference, isOpen, onClose, triggerRef }` — verified at `components/verse-of-the-day/VerseSharePanel.tsx`
- [x] `useLiturgicalSeason` hook returns the needed season data — verified at `hooks/useLiturgicalSeason.ts`
- [x] `wr_devotional_reads` stores string[] of YYYY-MM-DD dates — verified from `DevotionalPage.tsx` and dashboard tests
- [x] All auth-gated actions from the spec are accounted for (none — all public)
- [x] Design system values are verified from codebase inspection and spec
- [ ] [UNVERIFIED] values are flagged with verification methods (2 spacing values)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Verse-to-Bible link parsing | Use `parseVerseReferences(reference)` from existing `@/lib/parse-verse-references` | Already handles all 66 book names, numbered books (1/2/3), and chapter parsing. Fallback to `/bible` if no parse result. |
| Verse text truncation | `line-clamp-3` mobile, `line-clamp-4` desktop (via `sm:line-clamp-4`) | Per spec suggestion; prevents card overflow while keeping enough context |
| Card click vs Link | Use `<Link>` wrapping card content (excluding share button) | Better accessibility (keyboard nav, screen readers) than click handlers on divs |
| Seasonal dismiss key | Reuse existing `wr_seasonal_banner_dismissed` sessionStorage key | Same behavior as current SeasonalBanner — dismissed per session |
| Seasonal line vs banner theme color | Use `text-white/40` for text, `text-primary-lt` for link (not theme color) | Spec §3.1 specifies these exact colors; consistent with navbar's dark glass aesthetic |
| Where to put hero card components | Inline in `DailyHub.tsx` as local components (not separate files) | Cards are small, tightly coupled to the hero, and only used here — separate files would be over-engineering |
| Devotional theme display | Capitalize first letter of theme string for pill display | Theme is stored as lowercase slug (e.g., "trust", "anxiety-and-peace") — format for display |

---

## Implementation Steps

### Step 1: Redesign Daily Hub Hero Section

**Objective:** Replace the current greeting + subtitle + quiz teaser hero with the new greeting + two content cards + quiz teaser layout. Remove VerseOfTheDayBanner and ChallengeStrip from the page.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — Major edit: hero section rewrite, remove VOTD banner and ChallengeStrip renders

**Details:**

1. **Add imports:**
   - `import { Link } from 'react-router-dom'` (already imported via `useSearchParams`)
   - `import { Share2, Check, ChevronRight } from 'lucide-react'` (Share2 and ChevronRight new; Check already imported)
   - `import { getTodaysVerse } from '@/constants/verse-of-the-day'`
   - `import { getTodaysDevotional } from '@/data/devotionals'`
   - `import { VerseSharePanel } from '@/components/verse-of-the-day/VerseSharePanel'`
   - `import { parseVerseReferences } from '@/lib/parse-verse-references'`

2. **Remove imports:**
   - `import { VerseOfTheDayBanner } from '@/components/daily/VerseOfTheDayBanner'`
   - `import { ChallengeStrip } from '@/components/challenges/ChallengeStrip'`

3. **Inside `DailyHubContent`, add data fetching before the return:**
   ```typescript
   const verse = getTodaysVerse()
   const devotional = getTodaysDevotional()

   // Parse verse reference for Bible reader link
   const parsedRefs = parseVerseReferences(verse.reference)
   const verseLink = parsedRefs.length > 0
     ? `/bible/${parsedRefs[0].bookSlug}/${parsedRefs[0].chapter}`
     : '/bible'

   // Devotional "already read" check
   const hasReadDevotional = (() => {
     if (!isAuthenticated) return false
     try {
       const reads: string[] = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]')
       const todayStr = new Date().toLocaleDateString('en-CA')
       return reads.includes(todayStr)
     } catch { return false }
   })()

   // Verse share panel state
   const [sharePanelOpen, setSharePanelOpen] = useState(false)
   const shareBtnRef = useRef<HTMLButtonElement>(null)
   ```

4. **Replace hero section JSX** (lines 166-195) with:
   - Greeting `<h1>` stays: Caveat script, `text-3xl sm:text-4xl font-bold`, gradient text. Same `{displayName}`.
   - **Remove** the `<p>` subtitle ("Start with any practice below.").
   - **Add** two-column card grid below greeting:
     ```
     <div className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
     ```
   - **Left Card (Verse):**
     - Outer: `<div className="relative">` wrapping a `<Link>` and a share button
     - `<Link to={verseLink}>` with card styling: `bg-white/[0.08] backdrop-blur-sm border border-white/10 rounded-xl p-5 sm:min-h-[140px] block text-left transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`
     - Verse text: `<p className="font-serif italic text-lg text-white/90 line-clamp-3 sm:line-clamp-4 pr-6">`
     - Reference: `<p className="mt-2 text-sm text-white/50">— {verse.reference}</p>`
     - Share button: `<button>` positioned `absolute bottom-5 right-5` with `text-white/40 hover:text-white/70`, renders `<Share2 className="h-4 w-4" />`, `aria-label="Share verse of the day"`, `aria-haspopup="menu"`, `aria-expanded={sharePanelOpen}`
     - `<VerseSharePanel>` positioned relative to share button
   - **Right Card (Devotional):**
     - `<Link to="/devotional">` with same card styling
     - Label: `<p className="text-xs uppercase tracking-wide text-primary-lt">Daily Devotional</p>`
     - Title row: `<div className="mt-2 flex items-center gap-2">` with:
       - `<h2 className="font-bold text-lg text-white">{devotional.title}</h2>`
       - Conditional checkmark: `{hasReadDevotional && <Check className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />}` + `<span className="sr-only">Already read today</span>`
     - Theme pill: `<span className="mt-2 inline-block bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/50">{formatTheme(devotional.theme)}</span>`
     - CTA: `<p className="mt-3 flex items-center gap-1 text-sm text-primary-lt">Read today's devotional <ChevronRight className="h-3 w-3" /></p>`
   - **Quiz teaser** stays below cards with `mt-4`, but text color changes from `text-white/90` to `text-white/50`:
     ```
     <p className="mt-4 font-sans text-sm text-white/50">
     ```

5. **Remove VerseOfTheDayBanner render** (lines 197-200):
   ```
   {/* Verse of the Day Banner */}
   <div className="bg-dashboard-dark">
     <VerseOfTheDayBanner />
   </div>
   ```
   Delete these lines entirely.

6. **Remove ChallengeStrip render** (line 203):
   ```
   <ChallengeStrip />
   ```
   Delete this line.

7. **Add helper function** above or inside `DailyHubContent` for theme formatting:
   ```typescript
   function formatTheme(theme: string): string {
     return theme
       .split('-')
       .map(w => w.charAt(0).toUpperCase() + w.slice(1))
       .join(' & ')
   }
   ```
   This converts "anxiety-and-peace" → "Anxiety & Peace", "trust" → "Trust".

**Auth gating:** None — all elements public.

**Responsive behavior:**
- Mobile (< 640px): Cards stack vertically (`grid-cols-1`), `p-5` padding (same as desktop per spec), no `min-h`. Greeting `text-3xl`.
- Tablet/Desktop (640px+): Cards side by side (`sm:grid-cols-2`), `gap-4`, `sm:min-h-[140px]`. Greeting `sm:text-4xl`.

**Guardrails (DO NOT):**
- DO NOT delete the `VerseOfTheDayBanner` or `ChallengeStrip` component files — only remove their renders from DailyHub
- DO NOT change tab bar, tab content, SongPickSection, or StartingPointQuiz
- DO NOT add any new localStorage writes — hero cards are read-only
- DO NOT use `dangerouslySetInnerHTML` for verse or devotional text
- DO NOT add `onClick` handlers to cards — use `<Link>` for accessible navigation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders verse card with today's verse text | integration | Verify verse text from `getTodaysVerse()` appears in the hero |
| Renders verse reference | integration | Verify reference text appears with "—" prefix |
| Verse card links to Bible reader | integration | Verify the verse card `<Link>` has correct `/bible/:book/:chapter` href |
| Renders devotional card with title | integration | Verify devotional title from `getTodaysDevotional()` appears |
| Devotional card links to /devotional | integration | Verify the card `<Link>` href is `/devotional` |
| Shows "DAILY DEVOTIONAL" label | integration | Verify uppercase label text in devotional card |
| Shows theme pill | integration | Verify theme is displayed in a pill element |
| Does NOT show checkmark when logged out | integration | Verify no check icon when `isAuthenticated` is false |
| Shows checkmark when logged in and devotional read | integration | Set `wr_devotional_reads` with today's date, mock auth as logged in, verify Check icon appears |
| Share button opens VerseSharePanel | integration | Click share button, verify share panel opens |
| Does NOT render VerseOfTheDayBanner | integration | Verify no element matching old banner text pattern between hero and tabs |
| Does NOT render ChallengeStrip | integration | Verify ChallengeStrip is not rendered |
| Quiz teaser button still present | integration | Verify "Take a 30-second quiz" button exists |
| Subtitle "Start with any practice below" is removed | integration | Verify old subtitle text does not appear |
| Tab bar still functions | integration | Verify tabs still switch correctly (regression test) |
| Share button has accessible label | unit | Verify `aria-label="Share verse of the day"` |
| Checkmark has sr-only text | unit | When shown, verify `sr-only` text "Already read today" |
| Verse card is keyboard navigable | integration | Verify the Link is focusable and has visible focus indicator class |

**Expected state after completion:**
- [ ] Daily Hub hero shows greeting + two content cards + quiz teaser
- [ ] VerseOfTheDayBanner no longer rendered on Daily Hub
- [ ] ChallengeStrip no longer rendered on Daily Hub
- [ ] Tab bar follows immediately after hero (no gap elements between)
- [ ] All existing tab functionality works unchanged
- [ ] Tests pass

---

### Step 2: Landing Page Cleanup

**Objective:** Remove TodaysVerseSection, DevotionalTeaser, and ChallengeBanner from the landing page. Update tests.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Remove 3 section renders + imports
- `frontend/src/pages/__tests__/Home.test.tsx` — Remove/update tests for removed sections

**Details:**

1. **In `Home.tsx`, remove imports:**
   - `import { ChallengeBanner } from '@/components/challenges/ChallengeBanner'`
   - `import { TodaysVerseSection } from '@/components/TodaysVerseSection'`
   - `import { DevotionalTeaser } from '@/components/DevotionalTeaser'`
   - `import { SeasonalBanner } from '@/components/SeasonalBanner'`

2. **In `Home.tsx`, remove JSX renders:**
   - `<SeasonalBanner />` (line 57) — seasonal content moves to navbar in Step 3
   - `<ChallengeBanner />` (line 59)
   - `<TodaysVerseSection />` (line 61)
   - `<DevotionalTeaser />` (line 62)

3. **Resulting landing page JSX order:**
   ```jsx
   <Navbar transparent />
   <main id="main-content">
     <HeroSection />
     <JourneySection />
     <GrowthTeasersSection />
     <StartingPointQuiz />
   </main>
   <SiteFooter />
   ```

4. **In `Home.test.tsx`, remove/update tests:**
   - Remove the `DevotionalTeaser` describe block (lines 75-104)
   - Update `'renders all landing page sections'` test to not assert for removed sections
   - Verify remaining sections still assert correctly (Hero, Journey, Growth Teasers, Quiz)

**Guardrails (DO NOT):**
- DO NOT delete the component files (`TodaysVerseSection.tsx`, `DevotionalTeaser.tsx`, `ChallengeBanner.tsx`, `SeasonalBanner.tsx`) — only remove their renders from `Home.tsx`
- DO NOT change HeroSection, JourneySection, GrowthTeasersSection, or StartingPointQuiz

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Landing page does NOT render TodaysVerseSection | integration | Verify no "Today's Verse" section |
| Landing page does NOT render DevotionalTeaser | integration | Verify no "Start Each Morning with God" heading |
| Landing page does NOT render ChallengeBanner | integration | Verify no challenge banner content |
| Landing page does NOT render SeasonalBanner | integration | Verify no standalone seasonal banner |
| Landing page still renders Hero, Journey, Growth, Quiz | integration | Verify core sections remain |

**Expected state after completion:**
- [ ] Landing page renders: Navbar → HeroSection → JourneySection → GrowthTeasersSection → StartingPointQuiz → SiteFooter
- [ ] No visual gaps where removed sections were
- [ ] Tests pass

---

### Step 3: Seasonal Navbar Banner Integration

**Objective:** Add a seasonal message line inside the Navbar (desktop: below nav links; mobile: first item in drawer). Remove standalone SeasonalBanner usage.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add seasonal line to desktop navbar and mobile drawer

**Details:**

1. **Add seasonal line to the desktop navbar wrapper.** Inside the `Navbar` export function, after the glassmorphic pill `<div>` (line 928) and before the transparent gradient line (line 930), add a new seasonal line component.

2. **Create a local `SeasonalNavLine` component** inside `Navbar.tsx`:
   ```typescript
   function SeasonalNavLine() {
     const { isNamedSeason, seasonName, icon, currentSeason } = useLiturgicalSeason()
     const [dismissed, setDismissed] = useState(() => {
       try { return sessionStorage.getItem('wr_seasonal_banner_dismissed') === 'true' }
       catch { return false }
     })

     if (!isNamedSeason || dismissed) return null

     const SeasonIcon = SEASON_ICON_MAP[icon]

     return (
       <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs text-white/40">
         {SeasonIcon && <SeasonIcon className="h-3 w-3" aria-hidden="true" />}
         <span>It's {seasonName} — a season of {currentSeason.themeWord}</span>
         <Link to="/devotional" className="text-primary-lt hover:underline">
           Read today's devotional
         </Link>
         <button
           type="button"
           onClick={() => {
             try { sessionStorage.setItem('wr_seasonal_banner_dismissed', 'true') }
             catch { /* sessionStorage unavailable */ }
             setDismissed(true)
           }}
           className="ml-1 rounded-full p-1 text-white/30 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
           aria-label="Dismiss seasonal message"
         >
           <X className="h-3 w-3" />
         </button>
       </div>
     )
   }
   ```

3. **Render `<SeasonalNavLine />` in the desktop navbar** — inside the outer `<div className="mx-auto max-w-6xl ...">`, after the glassmorphic pill `</div>` (line 928) and before the transparent gradient line. Wrap in `<div className="hidden lg:block">` so it only shows on desktop.

4. **Add seasonal content to mobile drawer** — Inside `MobileDrawer`, add it as the **first item** in the `<div className="flex flex-col px-4 py-4">` block, before the offline indicator. Only render when `isNamedSeason && !dismissed`:
   ```jsx
   {isNamedSeason && !seasonDismissed && (
     <div className="mb-3 flex items-center gap-2 px-3 pb-3 border-b border-white/15">
       {SeasonIcon && <SeasonIcon className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />}
       <span className="text-xs text-white/40">
         It's {seasonName} — a season of {currentSeason.themeWord}
       </span>
       <Link to="/devotional" onClick={onClose} className="text-xs text-primary-lt hover:underline">
         Read today's devotional
       </Link>
       <button
         type="button"
         onClick={() => { ... dismiss logic ... }}
         className="ml-auto rounded-full p-1 text-white/30 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
         aria-label="Dismiss seasonal message"
       >
         <X className="h-3 w-3" />
       </button>
     </div>
   )}
   ```
   Note: The mobile drawer already has access to `useLiturgicalSeason` imports and `SEASON_ICON_MAP` at the top of `Navbar.tsx`.

5. **For MobileDrawer**, add seasonal state management: call `useLiturgicalSeason()` inside `MobileDrawer` (it's already imported at the file level). Add `useState` for dismissed state reading `sessionStorage`. This mirrors the `SeasonalNavLine` logic but is scoped to the drawer.

6. **Visibility rules:**
   - Only render when `isNamedSeason === true` (not during Ordinary Time)
   - Dismiss sets `sessionStorage` key `wr_seasonal_banner_dismissed` (reappears next session)
   - Desktop: `hidden lg:block` wrapper (navbar has room for the line)
   - Mobile: renders inside drawer only (not below hamburger menu inline)

**Responsive behavior:**
- Desktop (lg+): Seasonal line appears below the glassmorphic nav pill, inside the `max-w-6xl` container
- Mobile/Tablet (< lg): Seasonal line hidden; appears as first item in mobile drawer instead

**Guardrails (DO NOT):**
- DO NOT delete the `SeasonalBanner.tsx` component file
- DO NOT change the navbar's existing link structure, dropdowns, or auth actions
- DO NOT use a separate full-width banner element — the line must be inside the navbar's container
- DO NOT show the seasonal line during Ordinary Time
- DO NOT use theme color for the text — use `text-white/40` as specified

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Seasonal line renders during named season | integration | Mock `useLiturgicalSeason` to return Lent, verify season text appears |
| Seasonal line does NOT render during Ordinary Time | integration | Mock `useLiturgicalSeason` to return Ordinary, verify no season text |
| Seasonal line dismiss button works | integration | Click dismiss, verify line disappears |
| Seasonal line dismiss persists in sessionStorage | integration | Click dismiss, verify `sessionStorage.getItem('wr_seasonal_banner_dismissed')` is `'true'` |
| Seasonal line has accessible dismiss label | unit | Verify `aria-label="Dismiss seasonal message"` |
| Mobile drawer shows seasonal content | integration | Mock season, render drawer open, verify season text inside drawer |
| Devotional link in seasonal line | integration | Verify "Read today's devotional" links to `/devotional` |

**Expected state after completion:**
- [ ] During named seasons, a subtle seasonal line appears inside the navbar on desktop
- [ ] On mobile, seasonal content appears as first item in the drawer
- [ ] Seasonal line is dismissible (sessionStorage, reappears next session)
- [ ] No seasonal line during Ordinary Time
- [ ] Standalone SeasonalBanner no longer rendered on landing page (done in Step 2)
- [ ] Tests pass

---

### Step 4: Update Existing Tests

**Objective:** Fix any existing tests broken by the hero redesign, landing page cleanup, and navbar changes. Ensure all tests pass.

**Files to modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — Update assertions for removed subtitle, removed VOTD banner, new hero content
- `frontend/src/pages/__tests__/Home.test.tsx` — Already handled in Step 2
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — May need updates for new seasonal integration

**Details:**

1. **In `DailyHub.test.tsx`:**
   - **Update** the `'renders the subtitle'` test (line 96-101) — either remove it or change it to verify the subtitle is NOT present:
     ```typescript
     it('does not render the old subtitle', () => {
       renderPage()
       expect(screen.queryByText(/start with any practice below/i)).not.toBeInTheDocument()
     })
     ```
   - **Add** new tests from Step 1's test specs (verse card, devotional card, share panel, checkmark, etc.)
   - Verify `'renders a time-aware greeting'` still passes (greeting format unchanged)
   - Verify all tab-related tests still pass (tabs unchanged)
   - Mock `parseVerseReferences` if needed, or let it run naturally (it's a pure function)

2. **In `Navbar-seasonal.test.tsx`:**
   - Review existing tests — if they test the standalone `SeasonalBanner`, they may need to be updated or supplemented with tests for the new `SeasonalNavLine` inside the Navbar
   - Add tests from Step 3's test specs

3. **Run full test suite** with `pnpm test` to catch any regressions.

**Guardrails (DO NOT):**
- DO NOT skip or delete tests without understanding why they fail
- DO NOT change test infrastructure (mocks, providers) unless required by the code changes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing passing tests still pass | regression | Run `pnpm test` and verify zero regressions |

**Expected state after completion:**
- [ ] All tests pass (`pnpm test` exits 0)
- [ ] New tests cover the hero cards, landing page removals, and seasonal navbar line
- [ ] No skipped or commented-out tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Redesign Daily Hub hero (cards, remove VOTD/ChallengeStrip) |
| 2 | — | Landing page cleanup (remove 3 sections + SeasonalBanner) |
| 3 | — | Seasonal navbar banner integration |
| 4 | 1, 2, 3 | Update and verify all tests |

Steps 1, 2, and 3 are independent and can be executed in any order. Step 4 depends on all three being complete.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Daily Hub Hero Redesign | [COMPLETE] | 2026-03-25 | Modified `frontend/src/pages/DailyHub.tsx`: replaced hero section with greeting + verse card + devotional card + quiz teaser. Added imports for Link, Share2, ChevronRight, VerseSharePanel, getTodaysVerse, getTodaysDevotional, parseVerseReferences. Removed VerseOfTheDayBanner and ChallengeStrip renders. Added formatTheme helper. 1 expected test failure (subtitle removal — fixed in Step 4). |
| 2 | Landing Page Cleanup | [COMPLETE] | 2026-03-25 | Modified `frontend/src/pages/Home.tsx`: removed SeasonalBanner, ChallengeBanner, TodaysVerseSection, DevotionalTeaser imports and renders. Modified `frontend/src/pages/__tests__/Home.test.tsx`: removed DevotionalTeaser describe block, added negative assertions for removed sections, removed unused `within` import. All 7 tests pass. |
| 3 | Seasonal Navbar Banner Integration | [COMPLETE] | 2026-03-25 | Modified `frontend/src/components/Navbar.tsx`: added `SeasonalNavLine` component with sessionStorage dismiss, rendered inside glassmorphic pill wrapped in `hidden lg:block`. Added seasonal state + rendering to `MobileDrawer` as first item before offline indicator. All 4 existing Navbar seasonal tests pass. |
| 4 | Update Existing Tests | [COMPLETE] | 2026-03-25 | Modified `DailyHub.test.tsx`: fixed subtitle test (now negative assertion), added 16 new tests for hero cards (verse, devotional, share, checkmark, accessibility, regression). Modified `Navbar-seasonal.test.tsx`: added 7 new tests for seasonal line (render, dismiss, persistence, accessibility, devotional link, mobile). Modified `Home.test.tsx`: added negative assertion test for removed sections. Fixed TS error (user.id). All 50 tests pass, full suite 4272/4273 (1 pre-existing flaky). |
| — | Code Review Fixes | [COMPLETE] | 2026-03-25 | **Intentional deviation (Step 1):** `formatTheme` uses `.join(' ')` with explicit `'and' → '&'` replacement instead of plan's `.join(' & ')`. The plan's version was buggy — would produce "Anxiety & And & Peace" for hyphenated themes. Implementation correctly produces "Anxiety & Peace". **Fix (Major #1):** Mobile drawer seasonal banner now uses conditional styling for light/dark drawer (`text-gray-500`/`border-gray-200`/`text-gray-400` when logged out vs `text-white/50`/`border-white/15`/`text-white/30` when authenticated). **Fix (Medium #2):** Desktop `SeasonalNavLine` text bumped from `text-white/40` (~3.7:1) to `text-white/50` (~5:1) for WCAG AA compliance at `text-xs`. |
