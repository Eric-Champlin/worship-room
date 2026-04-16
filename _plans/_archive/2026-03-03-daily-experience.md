# Implementation Plan: Daily Experience (Hub + Pray + Journal + Meditate)

**Spec:** `_specs/daily-experience.md`
**Date:** 2026-03-03
**Branch:** `claude/feature/daily-experience`

---

## Architecture Context

### Project Structure

Frontend lives at `frontend/src/` with this layout:
- `pages/` — top-level page components (e.g., `Daily.tsx`, `PrayerWall.tsx`)
- `components/` — shared components + feature sub-dirs (e.g., `prayer-wall/`, `local-support/`)
- `components/ui/` — generic UI primitives (`Toast.tsx`, `Button.tsx`, `Card.tsx`)
- `hooks/` — custom React hooks (`useAuth.ts`, `useFocusTrap.ts`, `useOpenSet.ts`)
- `types/` — TypeScript interfaces per feature (`prayer-wall.ts`, `local-support.ts`)
- `mocks/` — mock data modules (`prayer-wall-mock-data.ts`, `local-support-mock-data.ts`)
- `constants/` — constants (`crisis-resources.ts`)
- `lib/` — utilities (`utils.ts` has `cn()`, `time.ts` has formatters)
- `services/` — service layer abstraction

### Existing Patterns

**Page pattern** (from `PrayerWall.tsx`):
- Inner content function + exported function wrapping with providers
- Skip-to-content link → `<Navbar transparent />` → Hero → `<main id="main-content">`
- Auth check via `useAuth()` hook (currently returns `{ isLoggedIn: false, user: null }`)
- `ToastProvider` + `AuthModalProvider` wrap pages needing those features

**Layout pattern** (from `Layout.tsx`):
- Wraps children with skip-to-content link, `<Navbar />`, `<main id="main-content">` with max-width container
- Used by simpler pages that don't need custom hero sections

**Hero pattern** (from `HeroSection.tsx`, `PrayerWallHero`):
- `<section aria-labelledby="...">` with inline `style` for gradient backgrounds
- Gradient: layered radial + linear from `#0D0620` → `#1E0B3E` → `#4A1D96` → `#F5F5F5`
- `pt-32 sm:pt-36 lg:pt-40` to clear absolute Navbar

**Card pattern** (from `PrayerCard.tsx`):
- `<article>` with `rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md`
- Semantic `aria-label` on article

**Share dropdown** (from `components/prayer-wall/ShareDropdown.tsx`):
- Absolute-positioned with `role="menu"`, keyboard nav (ArrowUp/Down/Home/End/Escape)
- Items: Copy Link, Email, SMS (mobile only), Facebook, X
- Props: `{ prayerId, prayerContent, isOpen, onClose }`
- Tightly coupled to prayer wall URLs — needs a generalized version

**Auth modal** (from `components/prayer-wall/AuthModalProvider.tsx`):
- Context + hook pattern: `AuthModalProvider` wraps page, `useAuthModal()` returns `{ openAuthModal }`
- Located in `components/prayer-wall/` but fully reusable — import from there

**Crisis detection** (from `constants/crisis-resources.ts`):
- `containsCrisisKeyword(text)` checks against `SELF_HARM_KEYWORDS` array
- `CRISIS_RESOURCES` object with phone/text/link for 988, Crisis Text Line, SAMHSA

**Mock data** (from `mocks/prayer-wall-mock-data.ts`):
- Private `const ARRAY: Type[]` with string IDs
- Named getter functions exported: `getMockPrayers()`, `getMockUser(id)`, etc.
- ISO 8601 date strings

**Test pattern** (from `PrayerWall.test.tsx`, `Toast.test.tsx`):
- `describe` + `it` blocks (vitest)
- `MemoryRouter` with `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` wrapping rendered component
- `screen.getByRole()` preferred for queries, `userEvent.setup()` for interactions
- Render helper function per test file
- `vi.useFakeTimers()` for time-dependent tests

**Routing** (from `App.tsx`):
- React Router v6 with `BrowserRouter` and `future` flags
- Static segments precede dynamic (`:id`) segments
- Currently: `/daily` → `<Daily />` (placeholder), `/scripture` → `<ComingSoon title="Pray" />`, `/journal` and `/meditate` → `<ComingSoon>`

**Navbar** (from `Navbar.tsx` lines 6-11):
- `DAILY_LINKS`: Pray → `/scripture`, Journal → `/journal`, Meditate → `/meditate`, Verse & Song → `/daily`
- The navbar "Pray" link points to `/scripture` (mood-based scripture matching — a separate feature). The Daily Hub practice card "Pray" will link to `/pray` (this feature). These are intentionally different routes.

**Footer** (from `SiteFooter.tsx`):
- `FOOTER_DAILY_LINKS`: Pray → `/scripture`, same issue — will NOT change per this spec
- No Spotify CTA currently — spec requires adding "Follow our playlist on Spotify" to footer

**Tailwind custom values** (from `tailwind.config.js`):
- Colors: `primary` (#6D28D9), `primary-lt` (#8B5CF6), `neutral-bg` (#F5F5F5), `text-dark` (#2C3E50), `text-light` (#7F8C8D), `success` (#27AE60), `hero-dark` (#0D0620), `hero-mid` (#1E0B3E), `glow-cyan` (#00D4FF)
- Fonts: `font-sans` (Inter), `font-serif` (Lora), `font-script` (Caveat)
- Animations: `animate-dropdown-in`, `animate-slide-from-right`

### Dependencies (already installed)
- React 18 + TypeScript, React Router DOM v6, TanStack React Query v5
- Lucide React (icons), clsx + tailwind-merge, TailwindCSS
- Vitest + React Testing Library + jsdom

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] On branch `claude/feature/daily-experience` with clean working directory
- [ ] The Navbar "Pray" link stays at `/scripture` (mood-based scripture page — separate feature). The Daily Hub practice card "Pray" links to `/pray` (this feature)
- [ ] Meditation sub-types use sub-routes (`/meditate/breathing`, `/meditate/soaking`, etc.) for clean browser history and direct URL access
- [ ] The existing `AuthModalProvider` from `components/prayer-wall/` is imported as-is (no relocation in this feature)
- [ ] All 30 Verse of the Day entries and 30 Song of the Day Spotify track IDs need actual content — the executor will populate WEB translation verses and real Spotify track IDs from the Worship Room playlist
- [ ] All 15 Psalm texts (full WEB translation) need actual content — the executor will populate complete verse text
- [ ] Chime sounds for breathing/soaking exercises will use Web Audio API (oscillator tone) — no audio file dependencies
- [ ] The Spotify playlist URL is `https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Meditation routing | Sub-routes (`/meditate/breathing`, etc.) | Enables browser back, bookmarkable URLs, cleaner "Leave exercise?" guards |
| Chime implementation | Web Audio API oscillator | No audio file dependencies, works cross-browser, zero cost |
| Voice guidance | Browser Speech Synthesis API | Same API as Read Aloud — consistent, free, built-in |
| "Leave exercise?" guard | `window.onbeforeunload` + React state confirmation dialog | `useBlocker` requires data router (not currently used); `onbeforeunload` handles tab close; custom dialog handles in-app nav |
| Karaoke word highlighting | Split text into `<span>` elements, highlight current word via Speech Synthesis `onboundary` event | Standard approach for word-level TTS tracking |
| Psalm 119 section IDs | Use Hebrew letter names as identifiers (e.g., `aleph`, `beth`) | Natural, meaningful IDs matching traditional divisions |
| localStorage key | `worship-room-daily-completion` | Follows existing naming convention (`worship-room-bookmarks-{category}`) |
| Journal draft key | `worship-room-journal-draft` | Consistent with app-wide localStorage naming |
| Journal mode key | `worship-room-journal-mode` | Stores `'guided'` or `'free'` |
| Mock prayer selection | Keyword matching on user input → fallback to general prayer | Spec requirement: topic-matched with graceful fallback |
| ShareDropdown generalization | New `ShareButton` component in `components/daily/` with configurable URL/text | Avoids modifying existing prayer-wall ShareDropdown |
| Where to put daily components | `components/daily/` directory with `meditate/` sub-dir | Follows existing pattern of feature directories (`prayer-wall/`, `local-support/`) |

---

## Implementation Steps

### Step 1: Types and Constants

**Objective:** Define all TypeScript interfaces and shared constants for the daily experience feature.

**Files to create:**
- `frontend/src/types/daily-experience.ts` — all interfaces
- `frontend/src/constants/daily-experience.ts` — localStorage keys, Spotify config, meditation types

**Details:**

`types/daily-experience.ts`:
```typescript
export interface DailyVerse {
  id: string           // e.g., 'verse-1'
  reference: string    // e.g., 'Philippians 4:6-7'
  text: string         // full verse text (WEB)
  theme: string        // e.g., 'peace', 'hope', 'healing'
}

export interface DailySong {
  id: string
  trackId: string      // Spotify track ID
  title: string
  artist: string
}

export interface MockPrayer {
  id: string
  topic: string        // keyword for matching (e.g., 'anxiety', 'gratitude')
  text: string         // full prayer text: "Dear God, ... Amen."
}

export interface ClassicPrayer {
  id: string
  title: string
  attribution: string
  text: string
}

export interface JournalPrompt {
  id: string
  theme: string
  text: string
}

export interface JournalReflection {
  id: string
  text: string         // 2-3 sentence encouraging reflection
}

export interface GratitudeAffirmation {
  template: string     // e.g., "You named {n} things you're grateful for today. What a beautiful heart."
}

export interface PsalmInfo {
  id: string           // e.g., 'psalm-23'
  number: number
  title: string        // e.g., "The Lord Is My Shepherd"
  description: string  // one-line description
  intro: string        // brief historical context
  verses: string[]     // array of verse texts (index = verse number - 1)
}

export interface Psalm119Section {
  id: string           // e.g., 'aleph'
  hebrewLetter: string // e.g., 'Aleph'
  verseRange: string   // e.g., 'vv. 1-8'
  startVerse: number
  endVerse: number
  verses: string[]
}

export interface ACTSStep {
  id: string
  title: string
  prompt: string
  verse: DailyVerse
}

export interface ExamenStep {
  id: string
  title: string
  prompt: string
}

export type MeditationType = 'breathing' | 'soaking' | 'gratitude' | 'acts' | 'psalm' | 'examen'

export interface DailyCompletion {
  date: string         // YYYY-MM-DD
  pray: boolean
  journal: boolean
  meditate: {
    completed: boolean
    types: MeditationType[]
  }
}

export type JournalMode = 'guided' | 'free'

export interface SavedJournalEntry {
  id: string
  content: string
  timestamp: string    // ISO 8601
  mode: JournalMode
  promptText?: string  // the prompt shown (if guided mode)
  reflection?: string  // mock AI reflection (if requested)
}

export interface PrayContext {
  from: 'pray'
  topic: string
}
```

`constants/daily-experience.ts`:
```typescript
export const DAILY_COMPLETION_KEY = 'worship-room-daily-completion'
export const JOURNAL_DRAFT_KEY = 'worship-room-journal-draft'
export const JOURNAL_MODE_KEY = 'worship-room-journal-mode'
export const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si'
export const SPOTIFY_EMBED_BASE = 'https://open.spotify.com/embed/track'

export const MEDITATION_TYPES = [
  { id: 'breathing', title: 'Breathing Exercise', icon: 'Wind', description: 'A guided 4-7-8 breathing pattern with scripture', time: '2-10 min' },
  { id: 'soaking', title: 'Scripture Soaking', icon: 'BookOpen', description: 'Sit quietly with a single verse and let it sink in', time: '2-10 min' },
  { id: 'gratitude', title: 'Gratitude Reflection', icon: 'Heart', description: 'Name the things you\'re thankful for today', time: '5 min' },
  { id: 'acts', title: 'ACTS Prayer Walk', icon: 'Footprints', description: 'A four-step guided prayer through Adoration, Confession, Thanksgiving, and Supplication', time: '10-15 min' },
  { id: 'psalm', title: 'Psalm Reading', icon: 'Scroll', description: 'Read through a Psalm slowly, one verse at a time', time: '5-10 min' },
  { id: 'examen', title: 'Examen', icon: 'Search', description: 'A five-step evening reflection on your day with God', time: '10-15 min' },
] as const

export const PRAYER_STARTER_CHIPS = [
  "I'm anxious about...",
  "I'm grateful for...",
  "I need healing for...",
  "I'm struggling with...",
  "Help me forgive...",
  "I need guidance about...",
  "I'm grieving over...",
  "I feel lost about...",
] as const

export const BREATHING_PHASES = {
  breatheIn: { label: 'Breathe in', duration: 4 },
  hold: { label: 'Hold', duration: 7 },
  breatheOut: { label: 'Breathe out', duration: 8 },
} as const

export const DURATION_OPTIONS = [2, 5, 10] as const // minutes
```

**Guardrails (DO NOT):**
- Do NOT add runtime logic in type files — types only
- Do NOT include actual verse/prayer text in constants — that goes in mock data (Step 2)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Types compile | type-check | Run `pnpm tsc --noEmit` — all types resolve without errors |

**Expected state after completion:**
- [ ] Types file exports all interfaces needed by the feature
- [ ] Constants file exports all configuration values
- [ ] `pnpm tsc --noEmit` passes

---

### Step 2: Mock Data — Verses, Songs, Prayers, and Content

**Objective:** Create all mock data except full Psalm texts (which go in Step 3 due to size).

**Files to create:**
- `frontend/src/mocks/daily-experience-mock-data.ts`

**Details:**

This file contains all mock data exported via getter functions (following `prayer-wall-mock-data.ts` pattern):

```typescript
// Exports:
export function getVerseOfTheDay(dayOfMonth: number): DailyVerse
export function getSongOfTheDay(dayOfMonth: number): DailySong
export function getBreathingVerses(): DailyVerse[]
export function getSoakingVerses(): DailyVerse[]
export function getMockPrayer(userInput: string): MockPrayer
export function getClassicPrayers(): ClassicPrayer[]
export function getJournalPrompts(): JournalPrompt[]
export function getJournalReflection(): JournalReflection
export function getGratitudeAffirmation(count: number): string
export function getGratitudeVerses(): DailyVerse[]
export function getACTSSteps(): ACTSStep[]
export function getExamenSteps(): ExamenStep[]
```

**Content to include:**
- 30 `DailyVerse` entries — WEB translation, covering themes: peace, hope, healing, anxiety, gratitude, strength, trust, grief, joy, forgiveness (3 per theme). `getVerseOfTheDay(dayOfMonth)` returns `VERSES[dayOfMonth % 30]`
- 30 `DailySong` entries — Spotify track IDs from the Worship Room playlist. `getSongOfTheDay(dayOfMonth)` uses `(dayOfMonth * 7) % 30` for independent rotation from verses
- 8-10 `MockPrayer` entries — topic-matched via keyword search on user input. "Dear God, ... Amen." structure, 5-8 sentences each. Topics: anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength, general (fallback)
- 6 `ClassicPrayer` entries — full text: Lord's Prayer, Serenity Prayer, Prayer of St. Francis, Psalm 23 (as prayer), St. Patrick's Breastplate (shortened), Prayer for Healing
- 15-20 `JournalPrompt` entries covering themes: gratitude, anxiety, healing, relationships, forgiveness, hope, identity, purpose, grief, peace, trust, patience, joy, strength, surrender
- 8-10 `JournalReflection` entries — warm, encouraging, 2-3 sentences each
- 20 breathing exercise verses — calming/peace themes (WEB)
- 20 scripture soaking verses — deeper/reflective themes (WEB), separate from breathing pool
- 3-5 gratitude affirmation templates with `{n}` placeholder
- 3-5 gratitude-themed verses (WEB)
- 4 ACTS supporting verses (one per step: Adoration, Confession, Thanksgiving, Supplication)
- 5 Examen step definitions (prompts from spec — these are static, not mock)

**`getMockPrayer(userInput)` algorithm:**
1. Lowercase the input
2. Check each MockPrayer's `topic` against input keywords (e.g., "anxious" → "anxiety", "grateful" → "gratitude")
3. Return first match, or fallback to the "general" prayer

**Guardrails (DO NOT):**
- Do NOT use any translation other than WEB (World English Bible) for scripture
- Do NOT include HTML or Markdown in any text content — plain text only
- Do NOT include crisis-related content in mock prayers — prayers should be encouraging and hopeful
- Do NOT include Psalm full text here — that's Step 3

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getVerseOfTheDay returns valid verse | unit | Every day 1-31 returns a verse with id, reference, text, theme |
| getSongOfTheDay returns valid song | unit | Every day 1-31 returns a song with trackId |
| getMockPrayer matches topic | unit | Input "I'm anxious" returns anxiety-themed prayer |
| getMockPrayer fallback | unit | Input "idk" returns general prayer |
| getClassicPrayers returns 6 | unit | Array length is 6, each has title/attribution/text |
| getJournalPrompts returns 15+ | unit | Array length >= 15 |
| Verse and song rotation are independent | unit | Day 1 verse ≠ day 1 song topic (different rotation) |

**Expected state after completion:**
- [ ] All getter functions return valid typed data
- [ ] `pnpm tsc --noEmit` passes
- [ ] Every verse includes WEB translation text

---

### Step 3: Mock Data — Psalm Texts

**Objective:** Create full Psalm texts in WEB translation for the Psalm Reading meditation.

**Files to create:**
- `frontend/src/mocks/daily-experience-psalms.ts`

**Details:**

```typescript
import type { PsalmInfo, Psalm119Section } from '@/types/daily-experience'

export function getPsalms(): PsalmInfo[]
export function getPsalm(id: string): PsalmInfo | undefined
export function getPsalm119Sections(): Psalm119Section[]
export function getPsalm119Section(sectionId: string): Psalm119Section | undefined
```

**15 Psalms to include** (complete WEB text):
- Psalm 23, 27, 34, 42, 46, 51, 62, 63, 91, 100, 103, 121, 139, 145, 119 (sectioned)

Each `PsalmInfo` includes:
- `number`, `title` (e.g., "The Lord Is My Shepherd"), `description` (one-line), `intro` (2-3 sentences of historical context)
- `verses`: array of strings, one per verse (index 0 = verse 1)

**Psalm 119**: Stored as 22 `Psalm119Section` objects, each with 8 verses. Hebrew letter names: Aleph, Beth, Gimel, Daleth, He, Vav, Zayin, Cheth, Teth, Yod, Kaph, Lamedh, Mem, Nun, Samekh, Ayin, Pe, Tsade, Qoph, Resh, Shin, Tav.

**Guardrails (DO NOT):**
- Do NOT use any Bible translation other than WEB
- Do NOT abbreviate or paraphrase verses — use complete text
- Do NOT include verse numbers in the text string (just the content)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getPsalms returns 15 | unit | Array length is 15 |
| Each psalm has non-empty verses | unit | Every psalm.verses.length > 0 |
| Psalm 119 has 22 sections | unit | getPsalm119Sections().length === 22 |
| Each Psalm 119 section has 8 verses | unit | Every section.verses.length === 8 |

**Expected state after completion:**
- [ ] All 15 psalms have complete WEB text
- [ ] Psalm 119 is fully sectioned into 22 parts

---

### Step 4: Completion Tracking Hook

**Objective:** Create a custom hook for reading/writing daily completion state to localStorage with midnight reset.

**Files to create:**
- `frontend/src/hooks/useCompletionTracking.ts`

**Details:**

```typescript
import type { DailyCompletion, MeditationType } from '@/types/daily-experience'

interface CompletionTracking {
  completion: DailyCompletion
  markPrayComplete: () => void
  markJournalComplete: () => void
  markMeditationComplete: (type: MeditationType) => void
  isPrayComplete: boolean
  isJournalComplete: boolean
  isMeditateComplete: boolean
  completedMeditationTypes: MeditationType[]
}

export function useCompletionTracking(): CompletionTracking
```

**Logic:**
1. On mount: read `DAILY_COMPLETION_KEY` from localStorage
2. Parse JSON, check `date` field against today (`new Date().toISOString().slice(0, 10)`)
3. If date doesn't match today → return fresh/empty completion (midnight reset)
4. Expose boolean getters and setter functions
5. Setter functions: read current state, update field, write back to localStorage, update React state
6. `markMeditationComplete(type)`: adds type to `meditate.types` array (deduplicated), sets `meditate.completed: true`
7. Use `useState` with lazy initializer for the completion state
8. Use `useCallback` for all setters

**Helper:**
```typescript
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function getEmptyCompletion(): DailyCompletion {
  return {
    date: getTodayString(),
    pray: false,
    journal: false,
    meditate: { completed: false, types: [] },
  }
}
```

**Guardrails (DO NOT):**
- Do NOT check `isLoggedIn` — completion tracking works for ALL users via localStorage (spec requirement)
- Do NOT use `useEffect` for persistence — write synchronously in setter functions to avoid stale state races
- Do NOT use `window.addEventListener('storage')` — single-tab usage is fine for MVP

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Returns empty state when no localStorage | unit | Fresh hook returns all false |
| Returns empty state when date is yesterday | unit | Set localStorage with yesterday's date → all false |
| Persists pray completion | unit | Call markPrayComplete → re-mount hook → isPrayComplete is true |
| Persists meditation type | unit | Call markMeditationComplete('breathing') → completedMeditationTypes includes 'breathing' |
| Deduplicates meditation types | unit | Call markMeditationComplete('breathing') twice → types array has length 1 |
| isMeditateComplete after any meditation | unit | After any markMeditationComplete, isMeditateComplete is true |

**Expected state after completion:**
- [ ] Hook reads/writes localStorage correctly
- [ ] Midnight reset works (stale date → fresh state)
- [ ] All tests pass

---

### Step 5: Crisis Banner Component

**Objective:** Create a reusable non-blocking crisis resource banner that appears when crisis keywords are detected in user input.

**Files to create:**
- `frontend/src/components/daily/CrisisBanner.tsx`

**Details:**

```typescript
interface CrisisBannerProps {
  text: string  // the user's input text to check
}

export function CrisisBanner({ text }: CrisisBannerProps)
```

**Behavior:**
1. Import `containsCrisisKeyword` from `@/constants/crisis-resources`
2. If `containsCrisisKeyword(text)` returns false → render nothing
3. If true → render a non-blocking informational banner:
   - `role="alert"` with `aria-live="assertive"` (safety-critical per `.claude/rules/04-frontend-standards.md`)
   - Yellow/amber background (not red — non-blocking, informational tone)
   - Content: "If you're in crisis, help is available:" + 988 Lifeline + Crisis Text Line
   - Phone numbers are clickable `<a href="tel:...">` links
   - Dismissible? NO — per spec, this is informational and always visible when keywords detected
4. Positioned inline (not fixed/absolute) — appears near the textarea
5. Styling: `rounded-lg border border-warning/30 bg-warning/10 p-4` with warning text

**Guardrails (DO NOT):**
- Do NOT block form submission — user can continue typing and submitting
- Do NOT auto-report or flag content — this is frontend-only in Phase 1
- Do NOT use `role="alertdialog"` — this is informational, not a dialog
- Do NOT use `danger` color — amber/warning tone is gentler and still visible

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Does not render for normal text | unit | text="I'm feeling sad" → no banner |
| Renders for crisis keyword | unit | text="I want to kill myself" → banner visible |
| Shows 988 and Crisis Text Line | unit | Banner contains "988" and "741741" |
| Has role="alert" | unit | Banner has correct ARIA role |
| Phone numbers are links | unit | `<a href="tel:988">` exists |

**Expected state after completion:**
- [ ] Banner renders only for crisis keywords
- [ ] Banner is accessible with correct ARIA attributes
- [ ] Tests pass

---

### Step 6: Read Aloud Hook and Component

**Objective:** Create a TTS hook using the browser Speech Synthesis API with play/pause/stop controls and karaoke-style word-by-word highlighting.

**Files to create:**
- `frontend/src/hooks/useReadAloud.ts`
- `frontend/src/components/daily/ReadAloudButton.tsx`
- `frontend/src/components/daily/KaraokeText.tsx`

**Details:**

`useReadAloud.ts`:
```typescript
export type ReadAloudState = 'idle' | 'playing' | 'paused'

interface UseReadAloudReturn {
  state: ReadAloudState
  currentWordIndex: number  // -1 when not playing
  play: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useReadAloud(): UseReadAloudReturn
```

**Implementation:**
1. Create `SpeechSynthesisUtterance` on `play(text)`
2. Use `utterance.onboundary` event (type `'word'`) to track current word index — increment a counter each time a word boundary fires
3. `onend` → reset to idle
4. `pause()` → `speechSynthesis.pause()`, `resume()` → `speechSynthesis.resume()`
5. `stop()` → `speechSynthesis.cancel()`, reset state
6. Cleanup on unmount: `speechSynthesis.cancel()`

`ReadAloudButton.tsx`:
```typescript
interface ReadAloudButtonProps {
  text: string
  className?: string
}
```
- Renders Play/Pause/Stop icon buttons using Lucide (`Play`, `Pause`, `Square`)
- Accessible labels: "Read aloud", "Pause", "Resume", "Stop"

`KaraokeText.tsx`:
```typescript
interface KaraokeTextProps {
  text: string
  currentWordIndex: number
  className?: string
}
```
- Splits text into words, wraps each in a `<span>`
- Highlights the current word with `bg-primary/20 rounded` class
- When `currentWordIndex === -1`, no highlighting

**Guardrails (DO NOT):**
- Do NOT assume Speech Synthesis is available everywhere — check `window.speechSynthesis` before using
- Do NOT start speaking without user interaction (browser autoplay policies)
- Do NOT use `dangerouslySetInnerHTML` — split text into spans safely

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| KaraokeText highlights correct word | unit | currentWordIndex=2 → third span has highlight class |
| KaraokeText no highlight when -1 | unit | currentWordIndex=-1 → no spans highlighted |
| ReadAloudButton shows Play initially | unit | Button has "Read aloud" label |
| Hook starts in idle state | unit | state is 'idle', currentWordIndex is -1 |

**Expected state after completion:**
- [ ] Read Aloud works in browser with play/pause/stop
- [ ] Karaoke highlighting tracks spoken words
- [ ] Components are accessible with ARIA labels

---

### Step 7: Generalized Share Button and Completion Screen

**Objective:** Create a reusable share dropdown (not tied to prayer wall) and a shared completion screen component used across all practices.

**Files to create:**
- `frontend/src/components/daily/ShareButton.tsx`
- `frontend/src/components/daily/CompletionScreen.tsx`
- `frontend/src/components/daily/MiniHubCards.tsx`

**Details:**

`ShareButton.tsx`:
```typescript
interface ShareButtonProps {
  shareUrl: string       // full URL to share (e.g., '/verse/verse-1')
  shareText: string      // text description for social sharing
  shareTitle: string     // title for email subject / social title
  className?: string
}
```
- Follow the keyboard navigation and accessibility pattern from `components/prayer-wall/ShareDropdown.tsx` (ArrowUp/Down/Home/End/Escape, `role="menu"`)
- Options: Copy link, Email, SMS (mobile only), Facebook, X
- Mobile: use `navigator.share()` (Web Share API) if available, with dropdown fallback
- On desktop: dropdown menu triggered by share icon button
- `shareUrl` should be a relative path — component prepends `window.location.origin`

`MiniHubCards.tsx`:
```typescript
interface MiniHubCardsProps {
  className?: string
}
```
- Shows 3 small cards: Pray, Journal, Meditate
- Each card shows icon + label + green checkmark if completed today
- Uses `useCompletionTracking()` to read completion state
- Cards are tappable `<Link>` elements to `/pray`, `/journal`, `/meditate`
- Compact layout: horizontal row, smaller than the Daily Hub cards

`CompletionScreen.tsx`:
```typescript
interface CompletionScreenProps {
  title?: string                        // default: "Well done!"
  ctas: { label: string; to: string; primary?: boolean }[]
  className?: string
}
```
- Renders: title in Lora serif → `<MiniHubCards />` → CTA buttons/links
- Primary CTA uses `Button` component, secondary CTAs are text links
- Gentle fade-in animation on mount

**Guardrails (DO NOT):**
- Do NOT import from `components/prayer-wall/ShareDropdown` — create independent component
- Do NOT hardcode practice routes in CompletionScreen — accept CTAs as props
- Do NOT add Spotify embed to CompletionScreen — only on shared pages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ShareButton renders share icon | unit | Button with "Share" label renders |
| ShareButton copy link copies URL | unit | Click copy → clipboard.writeText called with correct URL |
| MiniHubCards shows 3 cards | unit | 3 links render for Pray, Journal, Meditate |
| MiniHubCards shows checkmark when complete | unit | Set localStorage with pray:true → checkmark visible on Pray card |
| CompletionScreen renders title | unit | "Well done!" heading renders |
| CompletionScreen renders CTAs | unit | Passed CTAs render as links |

**Expected state after completion:**
- [ ] ShareButton works standalone with configurable URLs
- [ ] MiniHubCards reads completion state from localStorage
- [ ] CompletionScreen composes MiniHubCards + CTAs

---

### Step 8: Route Registration and Navigation Updates

**Objective:** Register all new routes in App.tsx and add the Spotify CTA to the site footer.

**Files to modify:**
- `frontend/src/App.tsx` — add routes for `/pray`, `/verse/:id`, `/prayer/:id`, meditation sub-routes; replace `/daily`, `/journal`, `/meditate` ComingSoon stubs
- `frontend/src/components/SiteFooter.tsx` — add "Follow our playlist on Spotify" CTA

**Details:**

`App.tsx` — add imports and routes:
```typescript
import { DailyHub } from './pages/DailyHub'
import { Pray } from './pages/Pray'
import { Journal } from './pages/Journal'
import { MeditateLanding } from './pages/MeditateLanding'
import { BreathingExercise } from './pages/meditate/BreathingExercise'
import { ScriptureSoaking } from './pages/meditate/ScriptureSoaking'
import { GratitudeReflection } from './pages/meditate/GratitudeReflection'
import { ActsPrayerWalk } from './pages/meditate/ActsPrayerWalk'
import { PsalmReading } from './pages/meditate/PsalmReading'
import { ExamenReflection } from './pages/meditate/ExamenReflection'
import { SharedVerse } from './pages/SharedVerse'
import { SharedPrayer } from './pages/SharedPrayer'

// Replace existing routes:
<Route path="/daily" element={<DailyHub />} />
<Route path="/pray" element={<Pray />} />
<Route path="/journal" element={<Journal />} />
<Route path="/meditate" element={<MeditateLanding />} />

// Add new routes:
<Route path="/meditate/breathing" element={<BreathingExercise />} />
<Route path="/meditate/soaking" element={<ScriptureSoaking />} />
<Route path="/meditate/gratitude" element={<GratitudeReflection />} />
<Route path="/meditate/acts" element={<ActsPrayerWalk />} />
<Route path="/meditate/psalms" element={<PsalmReading />} />
<Route path="/meditate/examen" element={<ExamenReflection />} />
<Route path="/verse/:id" element={<SharedVerse />} />
<Route path="/prayer/:id" element={<SharedPrayer />} />
```

Place `/meditate/breathing` etc. BEFORE `/meditate` if using the same path prefix, OR keep `/meditate` as exact match (React Router v6 handles this correctly — specific paths match before less specific).

`SiteFooter.tsx` — add Spotify CTA above the crisis resources section:
```tsx
{/* Spotify CTA — between App Download and Crisis Resources */}
<div className="text-center">
  <a
    href={SPOTIFY_PLAYLIST_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-muted-gray transition-colors hover:text-white"
  >
    Follow our playlist on Spotify →
  </a>
</div>
```

Also update `FOOTER_DAILY_LINKS` — change "Pray" from `/scripture` to `/pray`:
```typescript
const FOOTER_DAILY_LINKS = [
  { label: 'Pray', to: '/pray' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Verse & Song', to: '/daily' },
]
```

**Guardrails (DO NOT):**
- Do NOT change the Navbar `DAILY_LINKS` "Pray" link (it correctly points to `/scripture` — a different feature)
- Do NOT remove the existing `/scripture` ComingSoon route
- Do NOT create the page components in this step — just register the routes (pages are stubs/imports; they'll be built in subsequent steps). Use temporary `<ComingSoon>` for pages not yet built, or accept import errors will be resolved in subsequent steps.

**Note:** This step can be done AFTER Steps 9-18 (when all page components exist) to avoid import errors. Alternatively, create minimal stub exports for each page first, then flesh them out in subsequent steps.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Footer contains Spotify CTA | unit | Link to playlist URL renders |
| Footer Pray link goes to /pray | unit | Pray link has href="/pray" |

**Expected state after completion:**
- [ ] All routes registered in App.tsx
- [ ] Footer has Spotify CTA and updated Pray link
- [ ] App compiles (all imported pages exist)

---

### Step 9: Daily Hub Page

**Objective:** Build the complete Daily Hub page at `/daily` with greeting, verse hero, Spotify embed, and practice cards.

**Files to create:**
- `frontend/src/pages/DailyHub.tsx`

**Details:**

**Component structure:**
```typescript
export function DailyHub() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a href="#main-content" className="sr-only ...">Skip to content</a>
      <Navbar transparent />
      <main id="main-content">
        <VerseHeroSection />
        <PracticeCardsSection />
      </main>
      <SiteFooter />
    </div>
  )
}
```

Follow the PrayerWall page pattern — no `<Layout>` wrapper since it has a custom hero.

**Greeting Section** (inside `VerseHeroSection`):
```typescript
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
```
- Check `useAuth()` for user name — if logged in, append name: `"Good morning, Eric!"`
- If logged out: `"Good morning!"`
- Subtitle: `"Start with any practice below."` in Inter regular

**Verse Hero Section:**
- Purple gradient background (follow HeroSection.tsx gradient pattern)
- `getVerseOfTheDay(new Date().getDate())` for today's verse
- Verse text in `font-serif text-xl sm:text-2xl lg:text-3xl text-white leading-relaxed`
- Reference in `font-sans text-sm text-white/80` (e.g., "Philippians 4:6-7 WEB")
- `<ShareButton>` positioned top-right of verse area
- `pt-32 sm:pt-36 lg:pt-40` to clear Navbar

**Song of the Day** (inside hero, below verse):
- Label: "Today's Song Pick" in `font-sans text-sm text-white/70`
- Spotify embed: `<iframe src="${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0" height="80" ...>`
- Allow attributes: `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`
- "Follow our playlist on Spotify" CTA link below embed

**Practice Cards Section:**
- 3 cards in `grid grid-cols-1 sm:grid-cols-3 gap-4` below the hero
- Each card: Lucide icon (`HandHeart` or `Hand` for Pray, `PenLine` for Journal, `Wind` for Meditate), label, preview text
- Green checkmark (`Check` icon with `text-success`) when completed today — use `useCompletionTracking()`
- Cards are `<Link to="/pray">` etc. wrapped in styled card divs
- Card styling: `rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md`

**Guardrails (DO NOT):**
- Do NOT add Read Aloud button on the hub — spec says "No Read Aloud button on the hub"
- Do NOT persist anything to backend — all completion tracking is localStorage
- Do NOT show a login prompt on the hub — it's fully public

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders greeting | integration | Heading contains "Good morning" or "Good afternoon" or "Good evening" |
| Renders verse text | integration | Verse text from mock data is visible |
| Renders Spotify embed | integration | iframe element is present |
| Renders 3 practice cards | integration | 3 links to /pray, /journal, /meditate |
| Shows checkmark when pray is complete | integration | Set localStorage → checkmark icon visible |
| Share button renders | integration | Share button is present near verse |

**Expected state after completion:**
- [ ] Daily Hub renders with greeting, verse, Spotify, and cards
- [ ] Practice cards link to correct routes
- [ ] Completion checkmarks update from localStorage

---

### Step 10: Shared Verse Page

**Objective:** Build the public shared verse page at `/verse/:id` for social sharing.

**Files to create:**
- `frontend/src/pages/SharedVerse.tsx`

**Details:**

```typescript
import { useParams } from 'react-router-dom'

export function SharedVerse() {
  const { id } = useParams<{ id: string }>()
  // Look up verse by ID from mock data
  // If not found → show "Verse not found" message
}
```

**Layout:**
- Purple gradient hero with verse text in Lora serif (white)
- Verse reference below in Inter
- Worship Room branding: `font-script text-3xl text-white` "Worship Room" at top
- Below hero: Spotify compact embed with "While you're here, listen to today's worship pick"
- "Follow our playlist on Spotify" CTA
- CTAs: Primary "Explore Worship Room →" to `/`, Secondary "Start your daily time with God →" to `/daily`
- No Navbar (clean shareable page) — OR include Navbar for site navigation. Spec doesn't specify explicitly. Include Navbar for consistency.

**Open Graph meta tags:**
- Use `document.title` and meta tags set via `useEffect`
- `<title>` = verse reference
- `<meta property="og:title" content="Philippians 4:6-7 — Worship Room">`
- `<meta property="og:description" content="[verse text truncated to 155 chars]">`
- Note: SPA meta tags require SSR or a prerender service for social crawlers. For now, set them client-side (they won't work for link previews without SSR, but the spec acknowledges this as future work).

**Guardrails (DO NOT):**
- Do NOT require authentication — this is a public page
- Do NOT show checkmarks or completion tracking on shared pages
- Do NOT assume the verse ID exists — handle missing verse gracefully

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders verse text for valid ID | integration | Navigate to /verse/verse-1 → verse text visible |
| Shows "not found" for invalid ID | integration | Navigate to /verse/invalid → error message |
| Renders Spotify embed | integration | iframe present |
| Renders CTAs | integration | Links to / and /daily present |

**Expected state after completion:**
- [ ] `/verse/:id` renders correctly for valid verse IDs
- [ ] Graceful fallback for invalid IDs
- [ ] Page is publicly accessible

---

### Step 11: Meditate Landing Page

**Objective:** Build the meditation selection page with 6 cards in a 2-column grid.

**Files to create:**
- `frontend/src/pages/MeditateLanding.tsx`

**Details:**

```typescript
export function MeditateLanding() {
  const { completedMeditationTypes } = useCompletionTracking()
  const allComplete = completedMeditationTypes.length === 6
  // ...
}
```

**Layout:**
- Use `<Layout>` wrapper (no custom hero needed)
- Intro text: "Take a moment to slow down and be present with God. Choose how you'd like to be still today."
- 6 cards in `grid grid-cols-2 gap-4 sm:gap-6` (2 columns on all breakpoints)
- Each card: Lucide icon, title, one-line description, time estimate
- Individual green `Check` icon when that type is completed today
- Cards are `<Link to="/meditate/breathing">` etc.
- Card styling: same as practice cards but slightly larger, with icon sized `h-8 w-8`

**All-6-Complete Celebration:**
- When `completedMeditationTypes.length === 6`: show celebratory message
- Text: "You completed all 6 meditations today! What a beautiful time with God."
- Styling: golden glow animation — add a custom `animate-golden-glow` keyframe in Tailwind config: `@keyframes golden-glow { 0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.3) } 50% { box-shadow: 0 0 40px rgba(251,191,36,0.6) } }`

**Lucide icon mapping:**
- Breathing: `Wind`
- Scripture Soaking: `BookOpen`
- Gratitude: `Heart`
- ACTS: `Footprints`
- Psalm Reading: `ScrollText`
- Examen: `Search`

**Guardrails (DO NOT):**
- Do NOT gate any meditation behind auth — all 6 are fully public
- Do NOT add golden glow animation to Tailwind config in this step — add it inline or as a CSS class. If it's needed in Tailwind config, note it as a config change.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders intro text | integration | "Take a moment" text visible |
| Renders 6 meditation cards | integration | 6 links render |
| Cards link to correct routes | integration | /meditate/breathing, /meditate/soaking, etc. |
| Shows checkmark for completed type | integration | Set localStorage with breathing → checkmark on that card |
| Shows celebration when all 6 complete | integration | Set all 6 types → celebration message visible |
| No celebration with 5 complete | integration | Set 5 types → no celebration message |

**Expected state after completion:**
- [ ] `/meditate` shows 6 cards in 2-column grid
- [ ] Each card links to its meditation sub-route
- [ ] Checkmarks and celebration message work correctly

---

### Step 12: Breathing Exercise

**Objective:** Build the breathing exercise meditation with pre-start screen, animated circle, chimes, voice guidance, and completion screen.

**Files to create:**
- `frontend/src/pages/meditate/BreathingExercise.tsx`

**Details:**

**Pre-Start Screen:**
- Explanation text from spec
- Duration selector: 3 buttons (2 min, 5 min, 10 min) — no default selected
- Voice guidance toggle (on by default)
- Chime toggle (on by default)
- "Begin" button — disabled until duration selected
- Scripture verse NOT shown yet

**Exercise Screen:**
- Expanding/contracting circle: CSS `transition` on `width`/`height` or `transform: scale()`, with `box-shadow` for violet glow
- Phase cycle: Breathe in (4s) → Hold (7s) → Breathe out (8s) = 19s per cycle
- Total cycles = `(durationMinutes * 60) / 19` (rounded)
- Phase label + countdown: "Breathe in 4...3...2...1"
- Scripture verse below circle (random from `getBreathingVerses()`, selected once on "Begin")
- Chime: Web Audio API oscillator — gentle sine wave at ~528Hz, 200ms duration, with gain envelope fade-out
- Voice guidance: `speechSynthesis.speak(new SpeechSynthesisUtterance("Breathe in"))` at each transition
- `aria-live="polite"` region announces phase changes for screen readers
- Wake Lock: `navigator.wakeLock?.request('screen')` on start, release on complete/unmount

**Navigation Guard:**
- `useEffect` sets `window.onbeforeunload` during active exercise
- Custom state-based confirmation: if user clicks a `<Link>`, show a custom dialog "Leave exercise?" before navigating. Use `useNavigate` + state flag — intercept navigation by wrapping links in a guard component, or use React Router's `unstable_usePrompt` if available.
- Simpler approach: render a custom modal "Leave exercise? Your progress will be lost." with "Leave" and "Stay" buttons. Track `isExerciseActive` state. When active, intercept all internal link clicks.

**Completion Screen:**
- On final cycle end: write `'breathing'` to completion tracking, show `<CompletionScreen>` with CTAs: "Meditate more" → `/meditate/breathing`, "Try a different meditation" → `/meditate`, "Continue to Pray →" → `/pray`, "Continue to Journal →" → `/journal`, "Visit the Prayer Wall →" → `/prayer-wall`

**Timer implementation:**
- Use `useRef` for animation frame ID and start time
- `requestAnimationFrame` loop for smooth countdown
- Calculate elapsed time, determine current phase and countdown number
- Trigger chime/voice at phase transitions (track previous phase to detect change)

**Guardrails (DO NOT):**
- Do NOT use `setInterval` for the timer — use `requestAnimationFrame` for smooth animation
- Do NOT play chime/voice on initial render — only after "Begin" is pressed
- Do NOT auto-advance from pre-start to exercise — wait for explicit "Begin" click
- Do NOT forget to release Wake Lock on unmount or completion
- Do NOT block the completion screen behind auth

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pre-start renders duration buttons | integration | 3 buttons: "2 min", "5 min", "10 min" |
| Begin disabled without duration | integration | Begin button has disabled attribute |
| Begin enabled after selecting duration | integration | Click "5 min" → Begin enabled |
| Voice/chime toggles render and toggle | integration | Toggle buttons change state |
| Completion screen shows after exercise | integration | After timer completes → "Well done!" visible |
| Writes to localStorage on completion | integration | After completion → breathing in meditate.types |

**Expected state after completion:**
- [ ] Breathing exercise animates circle with correct 4-7-8 timing
- [ ] Chimes play at phase transitions (when enabled)
- [ ] Voice guidance speaks (when enabled)
- [ ] Completion writes to localStorage
- [ ] Wake Lock activates on mobile

---

### Step 13: Scripture Soaking

**Objective:** Build the scripture soaking meditation with pre-start, timer with progress bar, pause, and completion.

**Files to create:**
- `frontend/src/pages/meditate/ScriptureSoaking.tsx`

**Details:**

**Pre-Start Screen:**
- Explainer text from spec
- "Try another verse" button shuffles verse (excludes previous)
- Duration selector (2/5/10 min, no default)
- "Begin" disabled until duration selected
- Verse text NOT shown until Begin

**During Exercise:**
- Verse in large `font-serif text-2xl sm:text-3xl lg:text-4xl text-text-dark leading-relaxed` centered
- Progress bar at bottom: `<div>` with width percentage based on elapsed/total time
- Pause button: toggles between Pause and Resume
- Timer uses `requestAnimationFrame` with start time tracking, pausing stores elapsed
- Wake Lock active
- Soft chime when timer completes (same Web Audio approach as breathing)

**Completion:**
- Write `'soaking'` to completion tracking
- Show `<CompletionScreen>` with same CTA pattern

**Guardrails (DO NOT):**
- Do NOT dim the screen or add focus mode — spec says "regular screen (NO dimming/focus mode)"
- Do NOT show verse on pre-start screen — revealed only on Begin

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Pre-start shows explainer | integration | Explainer text visible |
| "Try another verse" changes selection | integration | Click → verse reference changes |
| Begin disabled without duration | integration | Button disabled |
| Progress bar advances | integration | After some time, progress bar width > 0 |
| Pause stops timer | integration | Click pause → progress bar stops |
| Completion writes to localStorage | integration | After timer end → soaking in types |

**Expected state after completion:**
- [ ] Scripture soaking timer works with pause/resume
- [ ] Progress bar reflects elapsed time
- [ ] Verse shuffling excludes previous

---

### Step 14: Gratitude Reflection

**Objective:** Build the gratitude reflection meditation with dynamic text fields and count-aware affirmation.

**Files to create:**
- `frontend/src/pages/meditate/GratitudeReflection.tsx`

**Details:**

- 3 initial text fields with placeholder "I'm grateful for..."
- When all 3 are non-empty: show "+ Add another" button
- No upper limit on additional fields
- "Done" button: always visible, but show gentle nudge if < 3 filled ("Name at least 3 things you're grateful for")
- Completion screen: count-aware affirmation (from `getGratitudeAffirmation(count)`) + scripture verse (from `getGratitudeVerses()`)
- Write `'gratitude'` to completion tracking

**Guardrails (DO NOT):**
- Do NOT save gratitude entries anywhere — they are ephemeral (session only)
- Do NOT apply crisis detection to gratitude fields (spec says only Pray and Journal)
- Do NOT require all fields to be filled — user can submit with 3+ filled

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders 3 initial fields | integration | 3 textboxes visible |
| "+ Add another" appears after all 3 filled | integration | Fill 3 → button appears |
| Completion shows count-aware message | integration | Fill 5, click Done → "You named 5 things" |
| Completion shows scripture | integration | Scripture verse visible on completion |

**Expected state after completion:**
- [ ] Dynamic fields work correctly
- [ ] Count-aware affirmation renders
- [ ] Completion writes to localStorage

---

### Step 15: ACTS Prayer Walk

**Objective:** Build the 4-step ACTS stepper with progress indicator, prompts, scripture, and ephemeral notes.

**Files to create:**
- `frontend/src/pages/meditate/ActsPrayerWalk.tsx`

**Details:**

- 4 steps: Adoration, Confession, Thanksgiving, Supplication
- Progress indicator: "Step 1 of 4: Adoration" at top
- Each step: prompt text (from spec) + supporting WEB verse (from `getACTSSteps()`) + optional "Add a note" expandable textarea
- Navigation: Next + Previous + Skip buttons
  - Previous: disabled on step 1
  - Next: advances to next step
  - Skip: same as Next (no validation — notes are optional)
- After step 4 (or navigating past it): completion screen
- Notes are ephemeral — stored in component state only, never persisted
- Write `'acts'` to completion tracking on completion

**Guardrails (DO NOT):**
- Do NOT save notes to localStorage or backend — ephemeral only
- Do NOT require notes to be filled — always optional
- Do NOT apply crisis detection to ACTS notes (spec says only Pray and Journal)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders step 1 of 4 | integration | "Step 1 of 4: Adoration" visible |
| Next advances to step 2 | integration | Click Next → "Step 2 of 4: Confession" |
| Previous returns to step 1 | integration | On step 2, click Previous → step 1 |
| Skip works like Next | integration | Click Skip → advances |
| Note textarea is optional | integration | Can complete without notes |
| Completion screen after step 4 | integration | Navigate to step 4, click Next → "Well done!" |

**Expected state after completion:**
- [ ] 4-step stepper navigates correctly
- [ ] Each step shows prompt + verse
- [ ] Ephemeral notes work without persistence

---

### Step 16: Psalm Reading

**Objective:** Build the Psalm selection and verse-by-verse reading experience.

**Files to create:**
- `frontend/src/pages/meditate/PsalmReading.tsx`

**Details:**

**Psalm Selection View:**
- Scrollable list of 15 Psalm cards
- Each card: "Psalm 23 — The Lord Is My Shepherd" + one-line description
- Psalm 119: shows section cards instead — "Psalm 119: Aleph (vv. 1-8)" etc.
- Click a card → reading view

**Reading View:**
- Brief intro (historical context) shown before verse 1
- One verse at a time in large `font-serif text-xl sm:text-2xl text-text-dark leading-relaxed`
- Progress indicator: "Verse 3 of 12"
- Previous + Next buttons
- Previous disabled on verse 1 (or intro)
- After final verse → completion screen

**Psalm 119 Flow:**
- Section selection screen → reading view for that section (8 verses)
- After section completion: "Continue to next section" option + standard completion
- "Back to section selection" option

**State management:**
- `selectedPsalm: string | null` — null = selection view, set = reading view
- `currentVerse: number` — 0 = intro, 1+ = verse index
- For Psalm 119: `selectedSection: string | null`

Write `'psalm'` to completion tracking on completing any psalm or Psalm 119 section.

**Guardrails (DO NOT):**
- Do NOT use a timer — Psalm reading is self-paced
- Do NOT truncate verse text — show complete text even for long verses

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders 15 psalm cards | integration | 15+ cards visible (14 regular + Psalm 119 sections) |
| Clicking psalm enters reading view | integration | Click Psalm 23 → intro text visible |
| Next advances verse | integration | Click Next → "Verse 2 of X" |
| Previous returns to prior verse | integration | On verse 2, Previous → verse 1 |
| Completion after final verse | integration | Navigate to last verse, Next → "Well done!" |
| Psalm 119 shows section cards | integration | "Psalm 119: Aleph" visible |

**Expected state after completion:**
- [ ] Psalm selection works for all 15 psalms
- [ ] Verse-by-verse reading with progress indicator
- [ ] Psalm 119 sectioned into 22 parts

---

### Step 17: Examen Reflection

**Objective:** Build the 5-step Examen stepper, mirroring the ACTS UX pattern.

**Files to create:**
- `frontend/src/pages/meditate/ExamenReflection.tsx`

**Details:**

- Pre-start note: "The Examen is traditionally an evening practice — perfect for winding down your day."
- "Begin" button to enter stepper
- 5 steps: Gratitude, Review, Emotions, Focus, Look Forward
- Progress indicator: "Step 1 of 5: Gratitude"
- Each step: prompt text (from spec/`getExamenSteps()`) + optional "Add a note" expandable textarea
- Navigation: Next + Previous + Skip (identical UX to ACTS)
- Notes are ephemeral
- Write `'examen'` to completion tracking on completion

**Guardrails (DO NOT):**
- Do NOT time-gate the Examen — available anytime despite evening recommendation
- Do NOT apply crisis detection to Examen notes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Shows evening practice note | integration | "traditionally an evening practice" visible |
| Renders 5 steps | integration | Navigate through all 5 steps |
| Mirrors ACTS navigation | integration | Next/Previous/Skip work identically |
| Completion after step 5 | integration | After step 5 → "Well done!" |

**Expected state after completion:**
- [ ] 5-step Examen stepper works identically to ACTS pattern
- [ ] Evening practice note displays on pre-start

---

### Step 18: Pray Page

**Objective:** Build the Pray page with textarea, starter chips, mock prayer generation, action buttons, classic prayers, Read Aloud, and crisis detection.

**Files to create:**
- `frontend/src/pages/Pray.tsx`

**Details:**

**Page structure:**
```typescript
export function Pray() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <PrayContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
```

Follow the PrayerWall provider-wrapping pattern.

**Input Section:**
- Auto-expanding textarea: use `onInput` to set `style.height` based on `scrollHeight`
- Start at ~3 rows (`rows={3}`)
- Placeholder: "What would you like to pray about?"
- `maxLength={500}` for character limit
- Character count display: "X/500"

**Starter Chips:**
- 8 chips from `PRAYER_STARTER_CHIPS` constant
- `useState<string | null>(selectedChip)` — when a chip is selected, fill textarea + hide other chips
- Desktop: `flex flex-wrap gap-2`
- Mobile: `flex gap-2 overflow-x-auto` with `-webkit-overflow-scrolling: touch`
- Each chip: `rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:border-primary`

**"Generate Prayer" button:**
- `const { isLoggedIn } = useAuth()`
- `const authModal = useAuthModal()`
- Logged out: `onClick={() => authModal?.openAuthModal()}`
- Logged in (or for mock — since always logged out, generate anyway in Phase 1):
  - DECISION: Since `useAuth()` always returns `isLoggedIn: false`, and the spec says "Generate Prayer" requires login — we'd NEVER generate. But the spec also says to show the full experience with mock data. Resolution: For Phase 1, generate mock prayers regardless of auth state so the UI can be tested. Add a `TODO` comment noting auth gating activates in Phase 3.
  - Empty input: show nudge "Tell God what's on your heart — even a few words is enough."
  - Non-empty: show loading state (1-2s delay), then display mock prayer from `getMockPrayer(input)`
- Loading state: animated dots or spinner with "Generating prayer for you..."

**Generated Prayer Display:**
- Input section collapses (hide textarea/chips)
- Prayer text in `font-serif text-lg leading-relaxed text-text-dark`
- "Dear God, ... Amen." structure

**Action Buttons:**
- Copy: `navigator.clipboard.writeText(prayer.text)`
- Read Aloud: `<ReadAloudButton text={prayer.text} />` + `<KaraokeText>` for the prayer body
- Save: auth-gated (show toast "Saved!" for logged in — mock; auth modal for logged out)
- Share: `<ShareButton shareUrl={`/prayer/${prayer.id}`} ... />`
- "Journal about this →": `<Link to="/journal" state={{ from: 'pray', topic: extractedTopic }}>`
- "Pray about something else": reset state — clear prayer, show textarea + chips

**Mobile layout:** Primary 3 buttons (Copy, Read Aloud, Save) + overflow menu for Share and other actions. Use a `...` (MoreHorizontal) button that toggles a dropdown.

**Classic Prayers Section:**
- Collapsible (collapsed by default): `<details>` element or `useState<boolean>`
- Title: "Classic Prayers"
- 6 prayers from `getClassicPrayers()`
- Each: card with title, attribution, full text
- Per-prayer buttons: Copy, Read Aloud (`<ReadAloudButton>`), Share (`<ShareButton>`)

**Crisis Detection:**
- `<CrisisBanner text={textareaValue} />` rendered below textarea

**Completion Signal:**
- After prayer is generated: `markPrayComplete()` from `useCompletionTracking()`

**Guardrails (DO NOT):**
- Do NOT render AI-generated HTML — plain text only, `whitespace-pre-wrap`
- Do NOT use `dangerouslySetInnerHTML` anywhere
- Do NOT skip the loading delay — spec requires 1-2 second simulated delay
- Do NOT auto-generate prayer on page load — only on explicit "Generate Prayer" click
- Do NOT apply crisis detection to classic prayers section — only to user textarea input

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Textarea renders with placeholder | integration | "What would you like to pray about?" visible |
| 8 starter chips render | integration | 8 chip buttons visible |
| Chip fills textarea and hides others | integration | Click chip → textarea filled, 7 chips hidden |
| Empty submit shows nudge | integration | Click Generate with empty textarea → nudge message |
| Generated prayer shows after loading | integration | Enter text, click Generate → prayer visible after delay |
| Prayer has "Dear God...Amen" structure | integration | Prayer text starts with "Dear God" and ends with "Amen" |
| Copy button copies to clipboard | integration | Click Copy → clipboard.writeText called |
| "Pray about something else" resets | integration | Click → textarea visible, chips reappear, prayer hidden |
| Classic prayers section collapsed by default | integration | Classic prayers content not visible initially |
| Classic prayers expand on click | integration | Click title → 6 prayers visible |
| Crisis banner shows for keywords | integration | Type "suicide" → crisis banner visible |
| Crisis banner hidden for normal text | integration | Type "I'm sad" → no crisis banner |
| Writes completion to localStorage | integration | After prayer generated → pray: true in storage |

**Expected state after completion:**
- [ ] Full Pray page works with mock data
- [ ] All interaction patterns match spec
- [ ] Crisis detection works
- [ ] Read Aloud with karaoke highlighting works

---

### Step 19: Shared Prayer Page

**Objective:** Build the public shared prayer page at `/prayer/:id`.

**Files to create:**
- `frontend/src/pages/SharedPrayer.tsx`

**Details:**

- Nearly identical layout to `SharedVerse.tsx` — purple hero, branding, Spotify embed, CTAs
- `useParams<{ id: string }>()` to get prayer ID
- For Phase 1 (mock data): store generated prayers in React state/context — shared prayers won't persist across sessions. Show a fallback message if prayer not found.
- Prayer text in Lora serif on purple hero
- OG meta tags: `<title>A Prayer from Worship Room</title>`
- CTAs: "Explore Worship Room →" to `/`, "Start your daily time with God →" to `/daily`

**Note:** Since prayers are generated in-session and not persisted, the shared prayer page will often show "Prayer not found" when accessed directly. This is acceptable for Phase 1 — real persistence comes in Phase 3.

**Guardrails (DO NOT):**
- Do NOT require auth
- Do NOT attempt to persist prayers to backend

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders fallback for unknown ID | integration | Navigate to /prayer/unknown → fallback message |
| Renders Spotify embed | integration | iframe present |
| Renders CTAs | integration | Links to / and /daily present |

**Expected state after completion:**
- [ ] `/prayer/:id` page renders correctly
- [ ] Graceful fallback for missing prayers

---

### Step 20: Journal Page

**Objective:** Build the Journal page with guided/free modes, draft persistence, save, reflect, and "Done journaling" CTAs.

**Files to create:**
- `frontend/src/pages/Journal.tsx`

**Details:**

**Page structure:**
```typescript
export function Journal() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <JournalContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
```

**Date/Time Header:**
- Format: "Tuesday, March 3, 2026 — 8:42 AM"
- Use `new Date()` with `toLocaleDateString` + `toLocaleTimeString`

**Mode Toggle:**
- `useState<JournalMode>` initialized from localStorage (`JOURNAL_MODE_KEY`)
- Two buttons styled as a toggle: "Guided" | "Free Write"
- Active button: `bg-primary text-white`, inactive: `bg-white text-text-dark border`
- Switching preserves textarea text

**Guided Mode:**
- Prompt card above textarea: soft purple/violet background (`bg-primary/5 border-primary/20 rounded-lg p-4`)
- Prompt text from `getJournalPrompts()` — select one randomly
- "Try a different prompt" link below card — shuffles (excludes current)
- **Context from Pray:** Check `location.state` for `{ from: 'pray', topic: 'anxiety' }`
  - If present: show banner "Continuing from your prayer about [topic]" with contextual prompt
  - "Write about something else" link dismisses banner, shows standard prompt
  - Automatically opens in Guided mode regardless of localStorage preference

**Free Write Mode:**
- Prompt card disappears
- If context from Pray: subtle note "Continuing from your prayer about [topic]" with dismiss
- Otherwise: just textarea

**Textarea:**
- `font-serif text-lg leading-relaxed` (Lora)
- Auto-expand: `onInput` adjusts height
- `maxLength={5000}`
- Character count: "X/5,000"

**Draft Persistence:**
- Debounced save to localStorage (`JOURNAL_DRAFT_KEY`) every 1 second of inactivity
- "Draft saved" indicator: small text that fades in, with `aria-live="polite"` for screen readers
- On mount: restore draft from localStorage if exists
- Draft clears after explicit "Save Entry"

**Crisis Detection:**
- `<CrisisBanner text={textareaValue} />` below textarea

**Save Entry:**
- Logged out: `authModal?.openAuthModal()` (Phase 1: since always logged out, allow save to local state for testing — add TODO for auth gating)
- On save: textarea becomes read-only, entry added to `savedEntries` state array
- Clear draft from localStorage
- New entry object: `{ id, content, timestamp, mode, promptText?, reflection? }`

**After Saving:**
- "Reflect on my entry" button below saved entry
  - Logged out: auth modal
  - Phase 1: show mock reflection from `getJournalReflection()` inline below entry
- "Write another" button: new timestamp, fresh textarea, previous entries stack below
- Multiple entries display in reverse chronological order (newest at top of editing area, older below)

**Done Journaling:**
- Appears after >= 1 entry saved
- "Done journaling" button/link
- Shows CTAs: "Return to Daily →" (primary `<Link to="/daily">`), "Continue to Meditate" and "Visit the Prayer Wall" (secondary text links)
- CTAs appear ONLY when user clicks "Done journaling", not after every save

**Completion Signal:**
- After first entry saved: `markJournalComplete()` from `useCompletionTracking()`

**Guardrails (DO NOT):**
- Do NOT render journal content as HTML — plain text only, `whitespace-pre-wrap`
- Do NOT save entries to backend — all in component state for Phase 1
- Do NOT lose text when toggling between Guided and Free Write
- Do NOT clear the draft on page navigation (only on explicit Save)
- Do NOT apply crisis detection to the prompt text — only to user's textarea input
- Do NOT show "Done journaling" CTAs after each individual save — only on explicit "Done" action

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Date/time header renders | integration | Current date visible |
| Toggle defaults to Guided | integration | Guided button has active style |
| Guided mode shows prompt card | integration | Prompt text visible in card |
| "Try a different prompt" changes prompt | integration | Click → prompt text changes |
| Free Write hides prompt card | integration | Switch to Free Write → no prompt card |
| Text preserved on mode switch | integration | Type text → switch mode → text still there |
| Draft auto-saves to localStorage | integration | Type text → localStorage contains draft |
| Draft restores on mount | integration | Set localStorage draft → mount → textarea has text |
| Save creates read-only entry | integration | Click Save → entry visible, textarea becomes read-only |
| "Reflect on my entry" shows reflection | integration | Click Reflect → reflection text appears |
| "Write another" adds new entry area | integration | Click → new timestamp, fresh textarea |
| Multiple entries stack | integration | Save 2 entries → both visible |
| "Done journaling" shows CTAs | integration | After save, click Done → CTAs visible |
| Crisis banner on textarea | integration | Type "suicide" → crisis banner |
| Context from Pray shows banner | integration | Navigate with state → "Continuing from" banner |
| Completion writes to localStorage | integration | After save → journal: true |

**Expected state after completion:**
- [ ] Journal page with both modes works fully
- [ ] Draft persistence works across page reloads
- [ ] Context from Pray page renders correctly
- [ ] Save → Reflect → Write Another flow works
- [ ] Crisis detection active on textarea

---

### Step 21: Tailwind Config Updates

**Objective:** Add any custom keyframes/animations needed by the feature (golden glow for meditation celebration, breathing circle animation).

**Files to modify:**
- `frontend/tailwind.config.js` — add keyframes and animations

**Details:**

Add to `extend.keyframes`:
```javascript
'golden-glow': {
  '0%, 100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' },
  '50%': { boxShadow: '0 0 40px rgba(251, 191, 36, 0.6)' },
},
'breathe-expand': {
  '0%': { transform: 'scale(0.6)', opacity: '0.7' },
  '100%': { transform: 'scale(1)', opacity: '1' },
},
'breathe-contract': {
  '0%': { transform: 'scale(1)', opacity: '1' },
  '100%': { transform: 'scale(0.6)', opacity: '0.7' },
},
'fade-in': {
  '0%': { opacity: '0', transform: 'translateY(8px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
```

Add to `extend.animation`:
```javascript
'golden-glow': 'golden-glow 2s ease-in-out infinite',
'breathe-expand': 'breathe-expand 4s ease-in-out forwards',
'breathe-contract': 'breathe-contract 8s ease-in-out forwards',
'fade-in': 'fade-in 500ms ease-out forwards',
```

**Guardrails (DO NOT):**
- Do NOT remove existing keyframes/animations
- Do NOT change existing color/font definitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build succeeds | build | `pnpm build` completes without errors |

**Expected state after completion:**
- [ ] Custom animations available in Tailwind classes
- [ ] `pnpm build` passes

---

### Step 22: Tests — Shared Hooks and Utilities

**Objective:** Write unit tests for the completion tracking hook, Read Aloud hook, and mock data utilities.

**Files to create:**
- `frontend/src/hooks/__tests__/useCompletionTracking.test.ts`
- `frontend/src/components/daily/__tests__/CrisisBanner.test.tsx`
- `frontend/src/components/daily/__tests__/KaraokeText.test.tsx`
- `frontend/src/mocks/__tests__/daily-experience-mock-data.test.ts`

**Details:**

Follow existing test patterns from `Toast.test.tsx` and `PrayerWall.test.tsx`:
- `describe`/`it` blocks
- `MemoryRouter` wrapper for components using React Router
- `vi.useFakeTimers()` for time-dependent tests
- `screen.getByRole()` preferred queries
- Test helper `renderWithProvider()` where needed

**Tests to implement:** All test specifications from Steps 4, 5, 6, 2, and 3.

**Guardrails (DO NOT):**
- Do NOT mock localStorage — use the real implementation (jsdom provides it)
- Do NOT forget to clear localStorage between tests (`beforeEach(() => localStorage.clear())`)

**Expected state after completion:**
- [ ] All shared utility/hook tests pass
- [ ] `pnpm test` passes

---

### Step 23: Tests — Pages

**Objective:** Write integration tests for Daily Hub, Meditate, Pray, Journal, and shared pages.

**Files to create:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx`
- `frontend/src/pages/__tests__/MeditateLanding.test.tsx`
- `frontend/src/pages/__tests__/Pray.test.tsx`
- `frontend/src/pages/__tests__/Journal.test.tsx`
- `frontend/src/pages/__tests__/SharedVerse.test.tsx`

**Details:**

Follow the test pattern from `PrayerWall.test.tsx`:
```typescript
function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/daily']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <DailyHub />
    </MemoryRouter>,
  )
}
```

**Tests to implement:** All test specifications from Steps 9, 10, 11, 18, 19, and 20.

Focus on:
- Rendering correctness (headings, content, cards)
- User interactions (clicks, typing, toggles)
- State transitions (loading → prayer, guided → free write)
- localStorage reads/writes
- Accessibility landmarks

**Guardrails (DO NOT):**
- Do NOT test implementation details (internal state values) — test user-visible behavior
- Do NOT forget `beforeEach(() => localStorage.clear())`
- Do NOT test Speech Synthesis in jsdom (mock it or skip — browser API not available in test env)

**Expected state after completion:**
- [ ] All page tests pass
- [ ] `pnpm test` passes with no failures
- [ ] Reasonable coverage of critical user flows

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types and constants |
| 2 | 1 | Mock data — verses, songs, prayers, content |
| 3 | 1 | Mock data — Psalm texts |
| 4 | 1 | Completion tracking hook |
| 5 | 1 | Crisis banner component |
| 6 | 1 | Read Aloud hook and components |
| 7 | 4 | Share button and completion screen |
| 8 | 1-7 | Route registration and navigation updates |
| 9 | 2, 4, 7 | Daily Hub page |
| 10 | 2, 7 | Shared Verse page |
| 11 | 4 | Meditate landing page |
| 12 | 2, 4, 7, 21 | Breathing Exercise |
| 13 | 2, 4, 7 | Scripture Soaking |
| 14 | 2, 4, 7 | Gratitude Reflection |
| 15 | 2, 4, 7 | ACTS Prayer Walk |
| 16 | 3, 4, 7 | Psalm Reading |
| 17 | 2, 4, 7 | Examen Reflection |
| 18 | 2, 4, 5, 6, 7 | Pray page |
| 19 | 7 | Shared Prayer page |
| 20 | 2, 4, 5, 6, 7 | Journal page |
| 21 | — | Tailwind config updates |
| 22 | 1-7 | Tests — shared hooks and utilities |
| 23 | 8-20 | Tests — pages |

**Recommended execution order:**
1 → 21 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 22 → 23

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types and constants | [COMPLETE] | 2026-03-03 | Created `types/daily-experience.ts` (all interfaces) and `constants/daily-experience.ts` (localStorage keys, Spotify config, meditation types, chips, breathing phases, durations) |
| 2 | Mock data — verses, songs, prayers, content | [COMPLETE] | 2026-03-03 | Created `mocks/daily-experience-mock-data.ts` with 30 verses, 30 songs (real Spotify IDs from playlist), 9 mock prayers, 6 classic prayers, 18 journal prompts, 8 reflections, 20 breathing verses, 20 soaking verses, gratitude content, ACTS steps, Examen steps |
| 3 | Mock data — Psalm texts | [COMPLETE] | 2026-03-03 | Created `mocks/daily-experience-psalms.ts` — 14 Psalms (23, 27, 34, 42, 46, 51, 62, 63, 91, 100, 103, 121, 139, 145) with full WEB text + 22 Psalm 119 sections (176 verses). Exports: getPsalms, getPsalm, getPsalm119Sections, getPsalm119Section |
| 4 | Completion tracking hook | [COMPLETE] | 2026-03-03 | Created `hooks/useCompletionTracking.ts` — localStorage-based daily completion tracking with midnight date reset, markPrayComplete/markJournalComplete/markMeditationComplete |
| 5 | Crisis banner component | [COMPLETE] | 2026-03-03 | Created `components/daily/CrisisBanner.tsx` — uses `containsCrisisKeyword` from existing crisis-resources, role="alert" aria-live="assertive", shows 988 Lifeline and Crisis Text Line |
| 6 | Read Aloud hook and components | [COMPLETE] | 2026-03-03 | Created `hooks/useReadAloud.ts` (Speech Synthesis API with word boundary tracking), `components/daily/ReadAloudButton.tsx` (Play/Pause/Stop with onWordIndexChange callback), `components/daily/KaraokeText.tsx` (word-by-word highlighting) |
| 7 | Share button and completion screen | [COMPLETE] | 2026-03-03 | Created `components/daily/ShareButton.tsx` (Web Share API + dropdown fallback, keyboard nav, Copy/Email/SMS/Facebook/X), `MiniHubCards.tsx` (3 compact practice cards with completion checkmarks), `CompletionScreen.tsx` (title + MiniHubCards + CTAs with fade-in) |
| 8 | Route registration and navigation updates | [COMPLETE] | 2026-03-03 | Updated `App.tsx` — replaced /daily with DailyHub, added /pray, /journal, /meditate, 6 meditation sub-routes, /verse/:id, /prayer/:id. Created stub pages for all. Updated `SiteFooter.tsx` — Pray link to /pray, added Spotify CTA. Removed unused Daily import. |
| 9 | Daily Hub page | [COMPLETE] | 2026-03-03 | Created `pages/DailyHub.tsx` — time-aware greeting (personalized if logged in), verse hero with purple gradient, ShareButton, Spotify embed with playlist CTA, 3 practice cards with completion checkmarks, follows PrayerWall hero pattern |
| 10 | Shared Verse page | [COMPLETE] | 2026-03-03 | Created `pages/SharedVerse.tsx` — verse lookup by URL param via getVerseById, graceful "not found" fallback, purple gradient hero, Spotify embed + playlist CTA, CTAs to / and /daily, document.title update |
| 11 | Meditate landing page | [COMPLETE] | 2026-03-03 | Created `pages/MeditateLanding.tsx` — 6 meditation cards in 2-column grid, ICON_MAP/ROUTE_MAP, individual checkmarks per type, all-6-complete celebration with animate-golden-glow, Layout wrapper |
| 12 | Breathing Exercise | [COMPLETE] | 2026-03-03 | Created `pages/meditate/BreathingExercise.tsx` — prestart/exercise/complete screens, duration selector, voice/chime toggles, animated circle with CSS scale, phase countdown, requestAnimationFrame timer, Web Audio chime, Speech Synthesis voice, Wake Lock, onbeforeunload guard |
| 13 | Scripture Soaking | [COMPLETE] | 2026-03-03 | Created `pages/meditate/ScriptureSoaking.tsx` — explainer, "Try another verse" shuffle, duration selector, verse in Lora serif, progress bar (fixed bottom), pause/resume, requestAnimationFrame timer, Wake Lock, chime on complete |
| 14 | Gratitude Reflection | [COMPLETE] | 2026-03-03 | Created `pages/meditate/GratitudeReflection.tsx` — 3 text inputs, "+ Add another" after all filled, Done button, count-aware affirmation + scripture verse on completion |
| 15 | ACTS Prayer Walk | [COMPLETE] | 2026-03-03 | Created `pages/meditate/ActsPrayerWalk.tsx` — 4-step stepper (Adoration, Confession, Thanksgiving, Supplication), progress bar, prompt + verse per step, ephemeral notes, Previous/Next/Skip, Finish on last step |
| 16 | Psalm Reading | [COMPLETE] | 2026-03-03 | Created `pages/meditate/PsalmReading.tsx` — psalm selection list (14 psalms + Psalm 119 entry), Psalm 119 section selection (22 sections), one-verse-at-a-time reading with intro screen, Previous/Next, Finish on last verse |
| 17 | Examen Reflection | [COMPLETE] | 2026-03-03 | Created `pages/meditate/ExamenReflection.tsx` — 5-step stepper mirroring ACTS UX, evening practice intro note, ephemeral notes, Previous/Next/Skip, Finish |
| 18 | Pray page | [COMPLETE] | 2026-03-03 | Created `pages/Pray.tsx` — ToastProvider+AuthModalProvider wrapping, auto-expanding textarea, 8 starter chips (horizontal scroll mobile, wrap desktop), mock prayer generation with 1.5s delay, Copy/ReadAloud/Save/Share action buttons, mobile overflow menu, KaraokeText for prayer display, classic prayers collapsible section with per-prayer Copy/ReadAloud/Share, CrisisBanner, "Journal about this" context link, "Pray about something else" reset, completion tracking |
| 19 | Shared Prayer page | [COMPLETE] | 2026-03-03 | Created `pages/SharedPrayer.tsx` — purple gradient hero with branding, graceful message for Phase 1 (no persistence), Spotify embed + playlist CTA, CTAs to / and /daily, document.title update |
| 20 | Journal page | [COMPLETE] | 2026-03-03 | Created `pages/Journal.tsx` — ToastProvider+AuthModalProvider wrapping, date/time header, Guided/Free Write mode toggle with localStorage persistence, prompt card with shuffle, Pray context banner, auto-expanding Lora serif textarea, debounced draft save to localStorage with aria-live indicator, CrisisBanner, Save Entry with completion tracking, Reflect on entry with mock AI reflection, Write Another with entry stacking, Done Journaling CTAs |
| 21 | Tailwind config updates | [COMPLETE] | 2026-03-03 | Added golden-glow, breathe-expand, breathe-contract, fade-in keyframes and animations to `tailwind.config.js` |
| 22 | Tests — shared hooks and utilities | [COMPLETE] | 2026-03-03 | Created `hooks/__tests__/useCompletionTracking.test.ts` (8 tests: default state, markPray, markJournal, markMeditation, multiple types, no duplicates, localStorage persistence, date reset), `components/daily/__tests__/CrisisBanner.test.tsx` (7 tests: normal text, keywords, vague phrases, aria-live), `components/daily/__tests__/KaraokeText.test.tsx` (4 tests), `mocks/__tests__/daily-experience-mock-data.test.ts` (comprehensive tests for all mock data getters) |
| 23 | Tests — pages | [COMPLETE] | 2026-03-03 | Created `pages/__tests__/DailyHub.test.tsx` (7 tests), `pages/__tests__/MeditateLanding.test.tsx` (4 tests), `pages/__tests__/Pray.test.tsx` (11 tests), `pages/__tests__/Journal.test.tsx` (15 tests), `pages/__tests__/SharedVerse.test.tsx` (6 tests). Fixed pre-existing SiteFooter test for /pray route. All 417 tests pass across 52 files. |
