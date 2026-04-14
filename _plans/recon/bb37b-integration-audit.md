# BB-37b Cross-Spec Integration Audit

**Date:** 2026-04-13
**Auditor:** Claude (BB-37b Step 1)
**Branch:** `bible-redesign`
**Scope:** All Bible wave source files + cross-spec integration points

---

## Summary

| Category | Verified | Issues |
|----------|----------|--------|
| URL contracts | 14 sites verified | 0 issues |
| localStorage schemas | 10 keys verified | 2 issues (1 critical, 1 moderate) |
| Reactive stores | 6 verified | 1 issue (deprecated hook still active) |
| Animation tokens | 66 files verified | 1 borderline violation |
| Accessibility patterns | 48 dialogs verified | 2 issues (cross-ref with BB-35) |
| Typography | 85+ usages verified | 2 issues (1 schema, 1 convention) |
| Container widths | 6 pages verified | 1 intentional deviation (documented) |

**Critical issues:** 2

---

## Detailed Results

### 1a. URL Contracts

#### Bible Reader URLs (`/bible/<book>/<chapter>`)

All 14 navigation sites constructing `/bible/<book>/<chapter>` URLs use **consistent lowercase** slug format. No mixed `/Bible/` vs `/bible/` found anywhere.

| Source File | Line | URL Pattern | Status |
|-------------|------|-------------|--------|
| `pages/BibleReader.tsx` | 594, 597 | `` navigate(`/bible/${prev.bookSlug}/${prev.chapter}`) `` | PASS |
| `pages/BibleReader.tsx` | 657 | `` to={`/bible/${book.slug}/${book.chapters}`} `` | PASS |
| `hooks/useChapterSwipe.ts` | 81 | `` navigate(`/bible/${target.bookSlug}/${target.chapter}`) `` | PASS |
| `components/bible/ChapterGrid.tsx` | 33 | `` to={`/bible/${bookSlug}/${chapter}`} `` | PASS |
| `components/bible/books/ChapterPickerView.tsx` | 82 | `` navigate(`/bible/${bookSlug}/${chapter}`) `` | PASS |
| `components/bible/landing/ResumeReadingCard.tsx` | 38, 46 | `` to={`/bible/${slug}/${chapter}`} `` | PASS |
| `components/bible/landing/VerseOfTheDay.tsx` | 147 | `` to={`/bible/${entry.book}/${entry.chapter}?scroll-to=...`} `` | PASS |
| `components/bible/reader/ReaderChapterNav.tsx` | 46, 58 | `` to={`/bible/${prev.bookSlug}/${prev.chapter}`} `` | PASS |
| `components/bible/BookCompletionCard.tsx` | 48 | `` to={`/bible/${nextBook.slug}/1`} `` | PASS |
| `components/bible/BibleSearchMode.tsx` | 169 | `` to={`/bible/${result.bookSlug}/${result.chapter}?verse=${result.verseNumber}`} `` | PASS |
| `lib/bible/navigateToActivityItem.ts` | 5 | `` navigate(`/bible/${item.book}/${item.chapter}`) `` | PASS |
| `lib/bible/shareActions.ts` | 6 | `` worshiproom.com/bible/${bookSlug}/${sel.chapter} `` | PASS |
| `lib/notifications/content.ts` | 38 | `` `/bible/${votdEntry.book}/${votdEntry.chapter}?verse=${votdEntry.startVerse}` `` | PASS |
| `components/ask/VerseCardActions.tsx` | 48 | `` navigate(`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?scroll-to=...`) `` | PASS |

#### Query Parameters

- `?verse=<N>`: Used by BibleSearchMode, notification content, and plan day links. Consistent.
- `?scroll-to=<N>`: Used by VerseOfTheDay landing link and VerseCardActions. Renamed from `?highlight=` in BB-38. Consistent.
- `?action=highlight|note|bookmark`: Used by URL-driven actions in BibleReader. Consistent.
- All three are stripped by the canonical URL builder (`buildBibleChapterMetadata` at `lib/seo/routeMetadata.ts:394`).

#### Plan URLs (`/bible/plans/<slug>`)

| Source File | Line | Pattern | Status |
|-------------|------|---------|--------|
| `pages/BiblePlanDay.tsx` | 79, 124, 228, 243, 285 | `` to={`/bible/plans/${slug}/day/${dayNumber}`} `` | PASS |
| `pages/BiblePlanDetail.tsx` | 114, 176, 224 | `` to={`/bible/plans/${plan.slug}/day/${day.day}`} `` | PASS |
| `components/bible/plans/*.tsx` | multiple | Consistent slug format | PASS |
| `lib/seo/routeMetadata.ts` | 448, 493 | Canonical: `/bible/plans/${slug}`, `/bible/plans/${slug}/day/${dayNumber}` | PASS |

#### Canonical URLs (BB-40 cross-check)

Verified against `_plans/recon/bb40-seo-metadata.md` approved list:

| Route | Canonical (BB-40) | Actual (routeMetadata.ts) | Status |
|-------|-------------------|--------------------------|--------|
| `/bible/:book/:chapter` | `/bible/<book>/<chapter>` | `/bible/${bookSlug}/${chapterNumber}` (line 394) | PASS |
| `/bible/plans/:slug` | `/bible/plans/<slug>` | `/bible/plans/${slug}` (line 448) | PASS |
| `/bible/plans/:slug/day/:n` | `/bible/plans/<slug>/day/<n>` | `/bible/plans/${slug}/day/${dayNumber}` (line 493) | PASS |

#### Daily Hub tab URLs

All 15+ references to `/daily?tab=<tab>` use consistent lowercase tab names: `devotional`, `pray`, `journal`, `meditate`. No mixed casing.

---

### 1b. localStorage Schemas

#### `wr_bible_highlights` — CRITICAL SCHEMA MISMATCH

**Issue:** Two incompatible type definitions exist for the same localStorage key.

| Consumer | Import | Type | `createdAt` | Verse field | Key |
|----------|--------|------|-------------|-------------|-----|
| `highlightStore.ts` (canonical) | `Highlight` from `@/types/bible:69` | New format | `number` (epoch ms) | `startVerse`/`endVerse` | `wr_bible_highlights` |
| `useScriptureEcho.ts:13` (surprise toasts) | `BibleHighlight` from `@/types/bible:59` | Old format | `string` (ISO date) | `verseNumber` | `wr_bible_highlights` |

The `highlightStore` migrates old-format entries on read and writes back new format. After migration, all data is in `Highlight[]` format with `createdAt: number`. But `useScriptureEcho` reads raw localStorage and casts to `BibleHighlight[]` with `createdAt: string`.

**Impact:**
1. `useScriptureEcho.formatHighlightDate(createdAt)` calls `new Date(createdAt)` expecting a string. For epoch ms numbers, `new Date(1712000000000)` works in JS but the function is typed for string.
2. The `book` and `chapter` fields match between types, so the highlight-finding logic (`h.book === bookSlug && h.chapter === chapter`) works correctly.
3. The date display ("You highlighted a verse here on April 1") may produce garbled output since `new Date(number).toLocaleDateString()` vs `new Date(string).toLocaleDateString()` differ in parsing path.

**Severity:** Moderate (functional but produces incorrect date in toast message)
**Resolution:** Update `useScriptureEcho` to import `getAllHighlights()` from `highlightStore` instead of reading raw localStorage. ~15 min fix.

#### `wr_bible_notes` vs `bible:notes` — CRITICAL SPLIT-BRAIN

**Issue:** The deprecated `useBibleNotes` hook writes to a different localStorage key and schema than the canonical notes store.

| Consumer | Hook/Store | Key | Type | Verse field | `createdAt` |
|----------|-----------|-----|------|-------------|-------------|
| `useBibleNotes.ts` (deprecated) | Hook reads/writes `wr_bible_notes` | `wr_bible_notes` | `BibleNote` | `verseNumber: number` | `string` (ISO) |
| `lib/bible/notes/store.ts` (canonical) | Store reads/writes `bible:notes` | `bible:notes` | `Note` | `startVerse`/`endVerse: number` | `number` (epoch ms) |

**Active consumer of deprecated hook:** `components/ask/VerseCardActions.tsx:7` imports `useBibleNotes` and uses `saveNote()`. Notes saved from the AI Bible Chat "Save note" button go to `wr_bible_notes` — invisible to the Bible reader's My Bible feed, heatmap aggregation, and echoes engine.

**Impact:** Critical — user data written from one feature is invisible to another.
**Resolution:** Migrate `VerseCardActions.tsx` to use the canonical `lib/bible/notes/store.ts`. The API differs (range-based `startVerse`/`endVerse` vs single `verseNumber`; `body` vs `text`; epoch ms vs ISO string), so a thin adapter is needed. ~30 min fix.

#### `wr_bible_streak` / `bible:streak`

The streak store (`lib/bible/streakStore.ts`) uses `bible:streak` as its primary key, with migration from the old `wr_bible_streak` key on first read. The notification scheduler (`lib/notifications/scheduler.ts:64`) reads via `getStreak()` from the canonical store — consistent.

**Consumers verified:**
- `lib/notifications/scheduler.ts` — uses `getStreak()` from store. PASS.
- `hooks/bible/useStreakStore.ts` — uses `getStreak()` + `subscribe()`. PASS.
- `components/bible/landing/StreakChip.tsx` — uses `useStreakStore()` hook. PASS.

**Status:** PASS

#### `wr_chapters_visited`

Written by `lib/heatmap/chapterVisitStore.ts` using constant `CHAPTERS_VISITED_KEY`. Read by `lib/heatmap/aggregation.ts` via `getAllVisits()` from the store. The echoes engine (`lib/echoes/engine.ts`) receives visits as a parameter from `useEcho.ts` which calls `getAllVisits()` from the store.

**Schema shape verification:**
- Store: `Record<string, Array<{ book: string; chapter: number }>>` (date key → chapter array)
- Heatmap `aggregation.ts:73`: iterates `Object.entries(visits)` and reads `.book` and `.chapter`. Matches.
- Echoes `engine.ts:167`: receives `visits` parameter typed as `Record<string, Visit[]>`. Matches.

**Status:** PASS

#### `wr_memorization_cards`

Written by `lib/memorize/store.ts` using constant `MEMORIZATION_CARDS_KEY`. Read by echoes engine via `getAllCards()`. The `useEcho` hook calls `getAllCards()` and `subscribe()` from the memorize store.

**Status:** PASS

#### BB-41 Notification Keys

| Key | Writer | Reader(s) | Consistent |
|-----|--------|-----------|------------|
| `wr_push_subscription` | `lib/notifications/subscription.ts` (constant `SUBSCRIPTION_KEY`) | Same file | PASS |
| `wr_notification_prefs` | `lib/notifications/preferences.ts` (constant `NOTIFICATION_PREFS_KEY`) | Settings `NotificationsSection`, scheduler | PASS |
| `wr_notification_prompt_dismissed` | `pages/BibleReader.tsx:909,913` (inline string) | `pages/BibleReader.tsx:577` (inline string) | PASS (but note: key is inlined, not in a constant) |

**Minor:** `wr_notification_prompt_dismissed` uses an inline string literal in BibleReader.tsx rather than a named constant. Not a bug, but a hygiene issue.

#### `wr_first_run_completed` (BB-34)

**Deep-link guard verification:** `hooks/useFirstRun.ts` checks `localStorage.getItem(FIRST_RUN_KEY) === null`. Once set (via `dismissFirstRun()`), all subsequent calls return `isFirstRun: false` regardless of the arrival path.

**Status:** PASS — deep-linked arrivals will not re-trigger first-run if the key is already set.

---

### 1c. Reactive Store Patterns

#### Store `subscribe()` Exports

All 6 Bible stores export `subscribe()`:

| Store | File | `subscribe()` exported | Line |
|-------|------|----------------------|------|
| Bookmarks | `lib/bible/bookmarkStore.ts` | YES | 271 |
| Highlights | `lib/bible/highlightStore.ts` | YES | 335 |
| Journal | `lib/bible/journalStore.ts` | YES | 188 |
| Notes | `lib/bible/notes/store.ts` | YES | 235 |
| Streak | `lib/bible/streakStore.ts` | YES | 171 |
| Plans | `lib/bible/plansStore.ts` | YES | 330 |

Additionally:
- `lib/memorize/store.ts` — `subscribe()` at line 174. PASS.
- `lib/heatmap/chapterVisitStore.ts` — `subscribe()` at line 100. PASS.

#### React Component Store Consumption

- `useEcho.ts` — Subscribes to highlights, memorize, and visits stores via `hlSubscribe`, `memSubscribe`, `visitSubscribe`. PASS (correct pattern).
- `useStreakStore.ts` — Uses `useState(getStreak)` with `subscribe(() => setStreak(getStreak()))`. PASS (correct sync pattern).
- `heatmap/aggregation.ts` — Uses `getAllHighlights()`, `getAllBookmarks()`, `getAllNotes()` from stores. PASS.

#### Deprecated Hook Usage (Anti-Pattern)

| Deprecated Hook | File | Active Import(s) | Status |
|-----------------|------|-------------------|--------|
| `useBibleHighlights.ts` | `hooks/useBibleHighlights.ts` | No active component imports (tests only) | PASS |
| `useBibleNotes.ts` | `hooks/useBibleNotes.ts` | **`components/ask/VerseCardActions.tsx:7`** | **FAIL** |

`VerseCardActions.tsx` actively imports the deprecated `useBibleNotes` hook, which reads/writes `wr_bible_notes` (old key) instead of `bible:notes` (canonical store). This is the same issue documented in the localStorage section above.

#### Truth Divergence Anti-Pattern

No instances of `useState` mirroring store data without proper subscription found. `useStreakStore.ts` uses `useState(getStreak)` but correctly subscribes and re-syncs.

---

### 1d. Animation Token Compliance

**Methodology:** Grep for hardcoded `duration-200`, `duration-300`, `ease-out`, `ease-in-out`, or raw `cubic-bezier` curves in non-test Bible wave source files.

**Results:**

| Finding | File:Line | Current Value | Classification |
|---------|-----------|---------------|----------------|
| Breathing exercise timing | `pages/meditate/BreathingExercise.tsx:215,218` | `duration-[4000ms] ease-in-out`, `duration-[8000ms] ease-in-out` | **Exempt** (breathing exercise timing) |
| Verse highlight fade-out | `components/bible/VerseDisplay.tsx:330` | `duration-[2000ms]` | **Borderline** — intentional slow fade (2s) for verse highlight glow-out. Not a standard UI animation. |
| Animation constants | `constants/animation.ts:11-14` | Raw `cubic-bezier` values | **Expected** — these ARE the token definitions |

**Hardcoded `duration-200`, `duration-300`:** 0 matches. All standard UI animations use `duration-base` (250ms).

**Token adoption:** 99 occurrences of `duration-base`, `ease-decelerate`, or `ease-standard` across 66 source files. The BB-33 animation token system is well-adopted.

**Violations:** 0 (the VerseDisplay 2s fade is a deliberate design choice for a non-standard animation, not a standard UI transition that should use tokens).

---

### 1e. Accessibility Patterns

#### Icon-Only Buttons Missing `aria-label`

**Result: 0 violations.** Cross-referenced with BB-35 audit finding: "Zero icon-only buttons missing `aria-label`. All form fields have labels."

Bible wave components have extensive `aria-label` coverage across:
- ReaderChrome (5 interactive elements with labels)
- VerseActionSheet (all action buttons labeled)
- AmbientAudioPicker (picker label + individual sound labels)
- HighlightColorPicker (color option labels)
- TypographySheet (settings and close labels)

#### Decorative Icons Missing `aria-hidden="true"`

BB-35 documented ~119 violations across ~45 files. This is a known gap with a planned batch fix. Bible wave components account for ~20 of these (~12 files in `components/bible/`).

#### Dialogs Missing `role="dialog"` + `aria-modal="true"`

| Component | File | `role` | `aria-modal` | Status |
|-----------|------|--------|-------------|--------|
| AmbientAudioPicker (desktop) | `bible/reader/AmbientAudioPicker.tsx:227` | `role="dialog"` | **MISSING** | **FIX** |
| AmbientAudioPicker (mobile) | `bible/reader/AmbientAudioPicker.tsx:250` | `role="dialog"` | **MISSING** | **FIX** |

**Cross-reference with BB-35 audit:** BB-35 identified 6 dialogs missing `aria-modal="true"` (NotificationPanel, WelcomeWizard, MoodCheckIn, GuidedPrayerPlayer x2, JournalTabContent). The AmbientAudioPicker was **not** in the BB-35 list — this is a new finding from the Bible wave.

**Resolution:** Add `aria-modal="true"` to both AmbientAudioPicker render branches. ~5 min fix.

---

### 1f. Typography Patterns

#### `font-serif` Usage Audit

85+ instances of `font-serif` found across the codebase. The vast majority are appropriate (scripture passages, devotional text, verse displays, blockquotes, prayer text).

**Violations:**

| File | Line | Context | Issue | Severity |
|------|------|---------|-------|----------|
| `components/daily/JournalInput.tsx` | 277 | Textarea class: `font-serif text-lg leading-relaxed` | User-input textarea uses serif. Design system says serif is for scripture display only, not prose body text. PrayerInput does NOT use `font-serif` — inconsistency. | Moderate |

#### `font-script` (Caveat) Usage Audit

`font-script` is documented as "deprecated for headings" in the design system. However, it remains in active use on **18+ inner page headings**:

| Page | File:Line | Usage |
|------|-----------|-------|
| Friends | `pages/Friends.tsx:90` | `<span className="font-script">Friends</span>` |
| Settings | `pages/Settings.tsx:65` | `<span className="font-script">Settings</span>` |
| Insights | `pages/Insights.tsx:203` | `Mood <span className="font-script">Insights</span>` |
| GrowPage | `pages/GrowPage.tsx:101` | `Grow in <span className="font-script">Faith</span>` |
| GrowthProfile | `pages/GrowthProfile.tsx:140` | `[Name]'s <span className="font-script">Garden</span>` |
| RoutinesPage | `pages/RoutinesPage.tsx:125` | `Bedtime <span className="font-script">Routines</span>` |
| MonthlyReport | `pages/MonthlyReport.tsx:110` | `Monthly <span className="font-script">Report</span>` |
| ReadingPlanDetail | `pages/ReadingPlanDetail.tsx:197` | Dynamic last-word script |
| ChallengeDetail | `pages/ChallengeDetail.tsx:246` | Dynamic last-word script |
| PrayerWallHero | `components/prayer-wall/PrayerWallHero.tsx:18` | `Prayer <span className="font-script">Wall</span>` |
| WorshipPlaylistsTab | `components/music/WorshipPlaylistsTab.tsx:32,45` | Section headings |
| WelcomeWizard | `components/dashboard/WelcomeWizard.tsx:327,515` | Wizard headings |
| WelcomeBack | `components/dashboard/WelcomeBack.tsx:134` | Banner heading |
| CelebrationOverlay | `components/dashboard/CelebrationOverlay.tsx:196` | Level-up title |
| GettingStartedCelebration | `components/dashboard/GettingStartedCelebration.tsx:77` | Completion title |
| SiteFooter | `components/SiteFooter.tsx:89` | Logo text |
| Navbar | `components/Navbar.tsx:59` | Logo text |

**Note:** The design system says "Deprecated for headings" and "Caveat has been fully removed from Daily Hub. Other inner pages should be migrated to gradient text in future redesigns." The Navbar and SiteFooter logo usage is explicitly permitted ("logo only"). The remaining heading usages are pre-Round-3 patterns that have not yet been migrated. **These are not bugs — they are known technical debt.**

#### Inline `fontFamily` Overrides

All `fontFamily` usages are in legitimate contexts:
- `lib/verse-card-canvas.ts` — Canvas rendering API (must use inline style)
- `components/bible/reader/ReaderBody.tsx` — Bible reader typography setting
- `components/bible/reader/NoteEditorSubView.tsx` — Note editor matching reader font
- `components/bible/reader/TypographySheet.tsx` — Typography picker options
- `hooks/useReaderSettings.ts` — Font family class mapping

**Status:** PASS — no rogue inline `fontFamily` overrides.

---

### 1g. Container Widths

| Page | Documented Width | Actual Width | File:Line | Status |
|------|-----------------|--------------|-----------|--------|
| Dashboard | `max-w-6xl` | `max-w-6xl` | `pages/Dashboard.tsx:522,536` | PASS |
| Daily Hub tabs (Devotional) | `max-w-2xl` | `max-w-2xl` | `components/daily/DevotionalTabContent.tsx:156` | PASS |
| Daily Hub tabs (Pray) | `max-w-2xl` | `max-w-2xl` (main), `max-w-4xl` (guided sessions) | `components/daily/PrayTabContent.tsx:208,255` | PASS (comment: "wider container for square cards") |
| Daily Hub tabs (Journal) | `max-w-2xl` | `max-w-2xl` | `components/daily/JournalTabContent.tsx:291` | PASS |
| Daily Hub tabs (Meditate) | `max-w-2xl` | `max-w-2xl` | `components/daily/MeditateTabContent.tsx:77` | PASS |
| Bible Browser (BibleBrowse) | `max-w-5xl` | `max-w-5xl` | `pages/BibleBrowse.tsx:21` | PASS |
| Bible Reader | `max-w-2xl` | `max-w-2xl` | `pages/BibleReader.tsx:782` | PASS |
| My Bible | `max-w-2xl` content, `max-w-6xl` divider | `max-w-2xl` (content x3), `max-w-6xl` (divider) | `pages/MyBiblePage.tsx:174,182,185,208,216` | PASS |
| Settings | `max-w-4xl` | `max-w-4xl` | `pages/Settings.tsx:71,95` | PASS |

**Pray tab note:** The guided prayer sessions section uses `max-w-4xl` instead of `max-w-2xl`. This is documented with a comment ("wider container for square cards") and is intentional — the square prayer cards in a 4-column grid need more horizontal space than the narrow text column above.

---

## Issues Found

| # | Category | Location | Issue | Severity | Resolution |
|---|----------|----------|-------|----------|------------|
| 1 | localStorage | `hooks/useScriptureEcho.ts:13-23` | Reads raw `wr_bible_highlights` and casts to `BibleHighlight[]` (old schema with `createdAt: string`). After highlight store migration, data is actually `Highlight[]` with `createdAt: number`. Date display in whisper toast may produce garbled output. | Moderate | Refactor to import `getAllHighlights()` from `lib/bible/highlightStore`. ~15 min. |
| 2 | localStorage + Reactive Store | `components/ask/VerseCardActions.tsx:7` | Imports deprecated `useBibleNotes` hook which writes to `wr_bible_notes` (old key). Canonical notes store uses `bible:notes`. Notes saved from AI Bible Chat are invisible to My Bible, heatmap, and echoes. | **Critical** | Migrate to `lib/bible/notes/store.ts`. Needs thin adapter for API differences (`verseNumber` -> `startVerse`/`endVerse`, `text` -> `body`, ISO string -> epoch ms). ~30 min. |
| 3 | Accessibility | `components/bible/reader/AmbientAudioPicker.tsx:227,250` | Both desktop and mobile `role="dialog"` elements missing `aria-modal="true"`. Not in BB-35 audit list (new finding). | Low | Add `aria-modal="true"` to both branches. ~5 min. |
| 4 | Typography | `components/daily/JournalInput.tsx:277` | Textarea uses `font-serif` for user input. Design system says serif is for scripture display only. PrayerInput textarea does not use `font-serif` — inconsistency between the two main Daily Hub textareas. | Low | Change to `font-sans` to match PrayerInput and design system rules. ~5 min. |
| 5 | localStorage (hygiene) | `pages/BibleReader.tsx:577,909,913` | `wr_notification_prompt_dismissed` key is used as an inline string literal rather than a named constant. All other BB-41 keys use constants in their respective modules. | Informational | Extract to a constant in `lib/notifications/` or `constants/bible.ts`. ~5 min. |

### Known Debt (Not Issues)

| Category | Detail | Status |
|----------|--------|--------|
| Typography | 18+ inner page headings use `font-script` (Caveat). Design system marks this as "deprecated for headings" but says "migrated to gradient text in future redesigns." | Known debt — deferred to inner page redesign |
| Accessibility | ~119 decorative icons in labeled buttons missing `aria-hidden="true"` (BB-35 finding). ~20 in Bible wave components. | Known gap — batch fix planned in BB-35 |
| Accessibility | 6 dialogs missing `aria-modal="true"` (BB-35 finding: NotificationPanel, WelcomeWizard, MoodCheckIn, GuidedPrayerPlayer x2, JournalTabContent). | Known gap — batch fix planned in BB-35 |
| Accessibility | Skip link only on pages using `Layout` wrapper (~20 pages without). | Known gap — BB-35 planned fix: move skip link to `Navbar.tsx` |
| Animation | `VerseDisplay.tsx:330` uses `duration-[2000ms]` for verse highlight fade-out. Deliberate 2s slow-fade design choice, not a standard UI transition. | Borderline — acceptable |
