# Implementation Plan: Cross-Feature Integration Batch 2

**Spec:** `_specs/cross-feature-integration-batch-2.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/cross-feature-integration-batch-2`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone integration batch)

---

## Architecture Context

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `frontend/src/components/daily/CompletionScreen.tsx` | Generic meditation completion screen (title + MiniHubCards + CTAs) |
| `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` | Full-screen challenge completion with confetti, stats, buttons |
| `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` | Full-screen plan completion with confetti, verse, browse button |
| `frontend/src/components/dashboard/CelebrationOverlay.tsx` | Full-screen badge celebration (icon, name, verse, Continue) |
| `frontend/src/components/dashboard/CelebrationQueue.tsx` | Orchestrates badge celebrations via `useCelebrationQueue` |
| `frontend/src/hooks/useCelebrationQueue.ts` | Queue processor: toasts first (max 5), then overlays (max 2) |
| `frontend/src/hooks/useBibleProgress.ts` | Bible reading progress hook (`wr_bible_progress`) |
| `frontend/src/services/badge-engine.ts` | `checkForNewBadges()` — evaluates badge conditions |
| `frontend/src/services/badge-storage.ts` | `getBadgeData()`, `addEarnedBadge()`, `incrementActivityCount()` |
| `frontend/src/services/meditation-storage.ts` | `getMeditationHistory()`, `getMeditationMinutesForWeek()` |
| `frontend/src/constants/dashboard/badges.ts` | `BADGE_DEFINITIONS`, `BADGE_MAP`, thresholds |
| `frontend/src/constants/dashboard/badge-icons.ts` | `getBadgeIcon()`, confetti colors, encouragement messages |
| `frontend/src/constants/bible.ts` | `BIBLE_BOOKS` array (66 books, canonical order, chapter counts) |
| `frontend/src/lib/challenge-calendar.ts` | `getChallengeCalendarInfo()`, `getActiveChallengeInfo()` |
| `frontend/src/lib/challenge-share-canvas.ts` | `generateChallengeShareImage()` — 1080×1080 PNG |
| `frontend/src/data/challenges.ts` | `CHALLENGES` array (5 seasonal challenges) |
| `frontend/src/data/reading-plans/index.ts` | `READING_PLANS` array (10 plans with `theme` property) |
| `frontend/src/pages/BibleReader.tsx` | Chapter reading page with highlights, notes, audio |
| `frontend/src/components/insights/MeditationHistory.tsx` | Meditation stats + chart (no `id` attribute currently) |
| `frontend/src/components/ui/Toast.tsx` | Toast system with `showCelebrationToast()` |

### Key Patterns

**CompletionScreen** (lines 1-39): Accepts `{ title?, ctas, className? }`. Renders title → MiniHubCards → CTAs (Link elements). Used by all 6 meditation sub-pages. To add meditation stats, extend props with optional stat line and insights link.

**ChallengeCompletionOverlay** (lines 1-216): Portal to `document.body`. Props: `{ challengeTitle, themeColor, daysCompleted, totalPointsEarned, badgeName, onDismiss }`. Auto-dismiss 8s. `handleShare` is a TODO stub. Two buttons: "Share Your Achievement" and "Browse more challenges".

**PlanCompletionOverlay** (lines 1-127): Portal to `document.body`. Props: `{ planTitle, totalDays, onDismiss, onBrowsePlans }`. Shows confetti, title, days count, 2 Timothy 4:7 verse, "Browse more plans" button. Does NOT receive plan `theme` — caller must pass it.

**Badge celebration pipeline**: `useCelebrationQueue` builds queue from `newlyEarnedBadges` string array, sorts by tier priority, processes sequentially. Toast tiers: `showCelebrationToast(name, message, type, icon)` which auto-dismisses (4-5s). Full-screen: renders `CelebrationOverlay` and awaits `dismissCurrent()` via Promise. Toast renders badge name + `"You earned: ${description}"` + optional confetti.

**CelebrationOverlay** (lines 1-191): Shows badge icon circle, name, encouragement message (level/streak only), verse (level only), and Continue button (6s delay). `onDismiss` callback. No suggestion link currently.

**useBibleProgress** (lines 1-67): `markChapterRead(bookSlug, chapter)` — no-ops when not authenticated. Stores `Record<string, number[]>` in `wr_bible_progress`. No book completion detection.

**Badge engine** (lines 1-147): `checkForNewBadges(context, earned)` checks: streaks, levels, activity milestones, Full Worship Day, community, reading plans, local support. Returns `string[]` of newly earned badge IDs. Does NOT check Bible reading badges.

**BIBLE_BOOKS** array in `constants/bible.ts` line 115: 66 entries in canonical order. Each: `{ name, slug, chapters, testament, category, hasFullText }`. Canonical order = array index order.

**Challenge calendar**: `getChallengeCalendarInfo(challenge, today)` returns `{ status, startDate, endDate, daysRemaining?, calendarDay? }`. Status: `'active' | 'upcoming' | 'past'`.

**Reading plan theme**: `ReadingPlan.theme` is `PlanTheme` = `'anxiety' | 'grief' | 'gratitude' | 'identity' | 'forgiveness' | 'trust' | 'hope' | 'healing' | 'purpose' | 'relationships'`.

**Share image**: `generateChallengeShareImage({ challengeTitle, themeColor, currentDay, totalDays, streak })` returns `Promise<Blob>`.

**Test patterns**: Vitest + React Testing Library. Wrap with `MemoryRouter` for routing. Wrap with `ToastProvider` for toasts. Mock localStorage for storage tests. Use `vi.mock()` for module mocking. Inline snapshots avoided; use queries and assertions.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View meditation cumulative stats | Meditation sub-pages redirect when logged out | Step 1 | Existing route-level redirect |
| Click "View meditation trends →" | Can't reach completion screen when logged out | Step 1 | Existing route-level redirect |
| See challenge completion overlay CTAs | Challenge participation requires login | Step 2 | Existing challenge auth gating |
| Click share / navigate from CTA cards | Can't reach overlay when logged out | Step 2 | Existing challenge auth gating |
| See book completion toast | markChapterRead no-ops when not authenticated | Step 4 | Existing `useBibleProgress` auth check |
| See inline celebration card | Card only shows when book is complete (requires auth) | Step 5 | `isAuthenticated` check in BibleReader |
| Earn Bible reading badges | Badge system only runs when authenticated | Step 4 | Existing `useFaithPoints` auth guard |
| See plan completion challenge suggestion | Reading plan progress requires login | Step 6 | Existing reading plan auth gating |
| See badge suggestion link | Badges only earned through authenticated activities | Step 8 | Existing celebration pipeline auth |

No new auth gating needed — all integrations use existing auth checks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Insights text link | color | `text-primary-lt` (#8B5CF6) | design-system.md |
| Insights text link hover | color + decoration | `hover:text-primary hover:underline` | Batch 1 plan |
| Insights text link transition | transition | `transition-colors` | Batch 1 plan |
| Frosted CTA card (overlays) | bg + border | `bg-white/[0.08] border border-white/10 rounded-xl` | spec |
| Frosted CTA card hover | bg | `hover:bg-white/[0.12]` | spec |
| Frosted CTA card padding | padding | `p-3` | spec |
| Card icon | size + color | `h-5 w-5 text-white/70` (20px = h-5) | spec (Lucide 20px) |
| Card label | style | `font-semibold text-white` | spec |
| Card description | style | `text-sm text-white/50` | spec |
| Bible completion card | bg + border | `bg-success/10 border border-success/30 rounded-xl p-4` | spec |
| Success color | hex | `#27AE60` | design-system.md |
| Toast suggestion link | style | `text-primary-lt text-xs hover:text-primary hover:underline transition-colors` | spec |
| Overlay suggestion link | style | `text-primary-lt text-sm hover:text-primary hover:underline transition-colors mt-3` | spec |
| Toast badge rendering | container | `rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-md` | Toast.tsx |
| Toast badge name | style | `font-sans text-sm font-medium text-white` | Toast.tsx |
| Toast badge description | style | `font-sans text-xs text-white/70` | Toast.tsx |

---

## Design System Reminder

- Worship Room uses Caveat (`font-script`) for hero/celebration headings, not Lora
- Lora (`font-serif`) is for scripture text only
- Inter (`font-sans`) is the body and heading font
- Primary: `#6D28D9` (`text-primary`), Primary Light: `#8B5CF6` (`text-primary-lt`)
- Success: `#27AE60` (`text-success` / `bg-success`)
- Dashboard/Insights cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Overlay frosted cards (lighter density): `bg-white/[0.08] border border-white/10 rounded-xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Bible reader uses `bg-dashboard-dark` background with `max-w-2xl` content container
- Overlay pattern: `createPortal(…, document.body)` with `role="dialog"` + `aria-modal="true"`
- Toast badge celebration: `showCelebrationToast(name, message, type, icon)` returns Promise
- CelebrationOverlay has 6s delay before Continue button, respects `prefers-reduced-motion`

---

## Shared Data Models (from Master Plan)

Not applicable — standalone integration batch.

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_meditation_history` | Read | Cumulative meditation stats for completion screen |
| `wr_bible_progress` | Read/Write | Chapter completion → book completion detection |
| `wr_badges` | Read/Write | Bible reading badges + badge suggestions |
| `wr_reading_plan_progress` | Read | Plan completion overlay (existing) |
| `wr_challenge_progress` | Read | Challenge status for plan-to-challenge suggestion |

**sessionStorage key (new, ephemeral):**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_bible_book_complete_dismissed_[bookSlug]` | Read/Write | Inline celebration card dismissal |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | CTA cards stack single column; inline celebration card full-width; toast suggestion is compact second line |
| Tablet | 768px | CTA cards 2-column grid; other additions same as mobile |
| Desktop | 1440px | CTA cards 2-column (5th centered); overlays centered; all else same |

All additions sit within existing responsive layouts — no new breakpoint behavior.

---

## Vertical Rhythm

Not applicable — no new page sections are introduced. All changes are within existing components (completion screens, overlays, toast/celebration system, inline card in existing flow).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Batch 1 (cross-feature-integration-batch-1) is committed and merged to the feature branch
- [ ] `wr_meditation_history` data format is stable (MeditationSession[] with `durationMinutes`)
- [ ] `generateChallengeShareImage()` works correctly with current canvas implementation
- [ ] `BIBLE_BOOKS` array has all 66 books with accurate `chapters` counts
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from reference and codebase inspection)
- [ ] No [UNVERIFIED] values present — all values sourced from spec or codebase

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CompletionScreen stat line: where to compute | Inside CompletionScreen with optional `showMeditationStats` prop | Avoids duplicating logic across 8 meditation pages |
| Insights link threshold | 7+ sessions (from spec) | Fewer than 7 doesn't provide meaningful trends |
| Challenge completion auto-dismiss | Extend to 12s (not disable entirely) | Preserves predictable behavior while giving more time |
| Web Share fallback | Download image as PNG | Consistent with existing share patterns in codebase |
| Bible book completion: where to detect | Inside `useBibleProgress` hook returning `{ justCompletedBook }` | Keeps detection co-located with progress tracking |
| Bible inline card dismissal storage | `sessionStorage` per book slug | Reappears next session (intentional per spec) |
| Badge suggestion: link behavior | Navigate + dismiss celebration | Clicking suggestion = choosing the next action |
| Plan completion: pass `theme` prop | Add `planTheme` prop to PlanCompletionOverlay | Overlay needs theme to map to challenges |
| "Deep Reader" naming | Use "Deep Reader" not "Scripture Scholar" | Avoids collision with existing `plans_10` badge |
| Full-screen celebration: no suggestion for level/special | Skip suggestion mapping entirely | Level celebrations already have rich verse content |

---

## Implementation Steps

### Step 1: Meditation Completion Stats & Insights Link

**Objective:** Add cumulative meditation stats and a conditional insights link to CompletionScreen.

**Files to create/modify:**
- `frontend/src/components/daily/CompletionScreen.tsx` — Add optional meditation stats display
- `frontend/src/components/insights/MeditationHistory.tsx` — Add `id="meditation-history"` to section
- `frontend/src/components/daily/__tests__/CompletionScreen.test.tsx` — New test file

**Details:**

1. **CompletionScreen.tsx** — Add optional `showMeditationStats?: boolean` prop. When true:
   - Import `getMeditationHistory` from `@/services/meditation-storage`
   - Import `Link` from `react-router-dom` (already imported)
   - Compute: `totalSessions = history.length`, `totalMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0)`
   - Render stat line between MiniHubCards and CTAs: `<p className="text-sm text-white/60">You've meditated {totalSessions} times for {totalMinutes} total minutes</p>`
   - Below the CTA links div, if `history.length >= 7`, render: `<Link to="/insights#meditation-history" className="text-primary-lt text-sm hover:text-primary hover:underline transition-colors">View your meditation trends →</Link>`

2. **MeditationHistory.tsx** — Add `id="meditation-history"` to the `<section>` element (currently has `aria-label="Meditation history"` but no `id`).

3. **No changes needed to individual meditation pages** — CompletionScreen is rendered with `showMeditationStats` by the meditation pages. Wait — CompletionScreen is generic. Need to pass `showMeditationStats={true}` from each meditation sub-page. But checking the 8 meditation pages, they all render `<CompletionScreen ctas={[...]} />`. Add `showMeditationStats` to each call.

   Actually, a simpler approach: have CompletionScreen auto-detect meditation context by checking if the current route starts with `/meditate/`. This avoids touching 8 files. Use `useLocation()` from react-router-dom.

   **Final approach:** Add `showMeditationStats?: boolean` prop. Pass it from the 6 meditation sub-pages (BreathingExercise, ScriptureSoaking, GratitudeReflection, ActsPrayerWalk, PsalmReading, ExamenReflection) plus the 2 audio-guided prayer pages that use CompletionScreen if they exist. Check if audio-guided prayer uses CompletionScreen too.

   Simpler: use `showMeditationStats` prop, and since all meditation pages import CompletionScreen identically, the change to each file is one added prop.

**Auth gating:** Meditation sub-pages already redirect to `/daily?tab=meditate` when logged out. No additional gating.

**Responsive behavior:**
- Desktop (1440px): Stat line centered within completion screen column, insights link below
- Tablet (768px): Same as desktop (completion screen is centered column)
- Mobile (375px): Same — full-width text within container

**Guardrails (DO NOT):**
- DO NOT modify MiniHubCards behavior
- DO NOT add new localStorage keys
- DO NOT show stats or insights link for logged-out users (impossible to reach anyway)
- DO NOT change the order of existing CTAs

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders cumulative meditation stats when showMeditationStats is true` | unit | Mock `getMeditationHistory` returning 10 sessions totaling 45 minutes. Verify "You've meditated 10 times for 45 total minutes" appears. |
| `hides meditation stats when showMeditationStats is false or omitted` | unit | Render without prop. Verify no stats text. |
| `shows insights link when 7+ sessions exist` | unit | Mock 7 sessions. Verify link with text "View your meditation trends →" and href `/insights#meditation-history`. |
| `hides insights link when fewer than 7 sessions` | unit | Mock 6 sessions. Verify no insights link. |
| `shows insights link styling correctly` | unit | Verify link has `text-primary-lt text-sm` classes. |
| `handles empty meditation history gracefully` | unit | Mock empty history. Verify "0 times for 0 total minutes" or hidden. |

**Expected state after completion:**
- [ ] Meditation completion screen shows cumulative stats
- [ ] Insights link appears when 7+ sessions exist
- [ ] MeditationHistory section has `id="meditation-history"` for hash nav
- [ ] Tests pass

---

### Step 2: Challenge Completion CTA Grid & Share

**Objective:** Replace the two buttons in ChallengeCompletionOverlay with a 5-card CTA grid and wire the share functionality.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` — Replace buttons with CTA grid, wire share, extend auto-dismiss
- `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` — Update/create tests

**Details:**

1. **Remove** the existing "Share Your Achievement" button and "Browse more challenges" underline link (lines 184-199).

2. **Add imports:**
   - `{ LayoutDashboard, Trophy, Share2, BookOpen, Compass } from 'lucide-react'`
   - `{ generateChallengeShareImage } from '@/lib/challenge-share-canvas'`

3. **Wire `handleShare`** (replace the TODO stub):
   ```typescript
   const handleShare = useCallback(async () => {
     try {
       const blob = await generateChallengeShareImage({
         challengeTitle,
         themeColor,
         currentDay: daysCompleted,
         totalDays: daysCompleted,
         streak: 0, // completion = full, no streak tracking on overlay
       })
       const file = new File([blob], 'challenge-complete.png', { type: 'image/png' })
       if (navigator.share && navigator.canShare?.({ files: [file] })) {
         await navigator.share({
           title: `${challengeTitle} — Challenge Complete!`,
           text: `I completed the ${challengeTitle} challenge on Worship Room!`,
           files: [file],
         })
       } else {
         // Fallback: download
         const url = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = url
         a.download = 'challenge-complete.png'
         document.body.appendChild(a)
         a.click()
         document.body.removeChild(a)
         URL.revokeObjectURL(url)
       }
     } catch {
       // User cancelled or share failed — silently ignore
     }
   }, [challengeTitle, themeColor, daysCompleted])
   ```

4. **CTA grid** — Replace the actions div (lines 183-199) with:
   ```tsx
   const CTA_ITEMS = [
     { icon: LayoutDashboard, label: 'See your growth →', description: 'Your dashboard shows the journey', to: '/' },
     { icon: Trophy, label: 'Check the leaderboard →', description: 'See where you rank now', to: '/friends?tab=leaderboard' },
     { icon: Share2, label: 'Share your achievement', description: 'Celebrate with others', action: handleShare },
     { icon: BookOpen, label: 'Browse more plans →', description: 'Continue growing with a reading plan', to: '/grow?tab=plans' },
     { icon: Compass, label: 'Browse more challenges →', description: 'Find your next journey', to: '/grow?tab=challenges' },
   ]
   ```
   Render as a grid: `grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 w-full`. Each card:
   ```tsx
   <button|Link
     className="flex items-start gap-3 bg-white/[0.08] border border-white/10 rounded-xl p-3 text-left hover:bg-white/[0.12] transition-colors"
   >
     <Icon className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
     <div>
       <span className="font-semibold text-white">{label}</span>
       <p className="text-sm text-white/50">{description}</p>
     </div>
   </button|Link>
   ```
   For navigation CTAs: use `onClick` that calls `onDismiss()` then `navigate(to)`. For share: `onClick={handleShare}`.
   Fifth item (Browse challenges): use `sm:col-span-2 sm:max-w-[calc(50%-0.375rem)] sm:mx-auto` to center it on desktop.

5. **Auto-dismiss**: Change timeout from 8000 to 12000 (line 53).

**Auth gating:** Challenge participation is already auth-gated. No additional gating.

**Responsive behavior:**
- Desktop (1440px): 2-column grid, 5th item centered
- Tablet (768px): 2-column grid, 5th item centered
- Mobile (375px): Single column stacked

**Guardrails (DO NOT):**
- DO NOT change the confetti rendering or animation
- DO NOT change the celebration header (title, "Challenge Complete!", stats, badge)
- DO NOT remove the dismiss button or backdrop click handler
- DO NOT change the focus trap or keyboard handling

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders 5 CTA cards with icons and labels` | unit | Verify all 5 labels present. |
| `"See your growth" navigates to /` | unit | Click, verify `navigate('/')` called + `onDismiss`. |
| `"Check the leaderboard" navigates to /friends?tab=leaderboard` | unit | Click, verify navigate called. |
| `"Share your achievement" calls generateChallengeShareImage` | unit | Mock the canvas function. Click share. Verify called with correct args. |
| `share fallback downloads image when Web Share unavailable` | unit | Mock `navigator.share` as undefined. Click share. Verify download logic. |
| `"Browse more plans" navigates to /grow?tab=plans` | unit | Click, verify navigate. |
| `"Browse more challenges" navigates to /grow?tab=challenges` | unit | Click, verify navigate. |
| `auto-dismiss fires after 12 seconds` | unit | Use fake timers. Advance 12000ms. Verify onDismiss called. |
| `CTA cards have frosted glass styling` | unit | Verify card elements have `bg-white` class substring. |
| `grid is single column on mobile` | unit | Verify grid class includes `grid-cols-1 sm:grid-cols-2`. |

**Expected state after completion:**
- [ ] ChallengeCompletionOverlay shows 5 CTA cards in grid layout
- [ ] Share button generates canvas image and uses Web Share API (or downloads)
- [ ] Auto-dismiss extended to 12 seconds
- [ ] All navigation CTAs dismiss overlay and navigate correctly
- [ ] Tests pass

---

### Step 3: Bible Reading Badges — Definitions & Icons

**Objective:** Add 4 new Bible reading badge definitions and their icon configurations.

**Files to create/modify:**
- `frontend/src/constants/dashboard/badges.ts` — Add Bible reading badge definitions
- `frontend/src/constants/dashboard/badge-icons.ts` — Add icon configs for new badges
- `frontend/src/types/dashboard.ts` — Verify `ActivityCounts` doesn't need changes (it doesn't — Bible books use separate counting)

**Details:**

1. **badges.ts** — Add new badge array after `readingPlanBadges`:
   ```typescript
   const bibleBookBadges: BadgeDefinition[] = [
     {
       id: 'bible_book_1',
       name: 'First Book',
       description: 'Read every chapter of a Bible book',
       category: 'activity',
       celebrationTier: 'toast-confetti',
     },
     {
       id: 'bible_book_5',
       name: 'Bible Explorer',
       description: 'Completed 5 Bible books',
       category: 'activity',
       celebrationTier: 'toast-confetti',
     },
     {
       id: 'bible_book_10',
       name: 'Deep Reader',
       description: 'Completed 10 Bible books',
       category: 'activity',
       celebrationTier: 'full-screen',
       verse: {
         text: 'Your word is a lamp to my feet, and a light for my path.',
         reference: 'Psalm 119:105 WEB',
       },
     },
     {
       id: 'bible_book_66',
       name: 'Bible Master',
       description: 'Read the entire Bible — all 66 books',
       category: 'activity',
       celebrationTier: 'full-screen',
       verse: {
         text: 'Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness.',
         reference: '2 Timothy 3:16 WEB',
       },
     },
   ]
   ```
   Add `...bibleBookBadges` to `BADGE_DEFINITIONS` array.

2. **badge-icons.ts** — Add icon configs for the 4 new badges in the `getBadgeIcon` function:
   - `bible_book_1`: `{ icon: BookOpen, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52, 211, 153, 0.3)' }`
   - `bible_book_5`: `{ icon: BookOpen, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', glowColor: 'rgba(52, 211, 153, 0.3)' }`
   - `bible_book_10`: `{ icon: BookOpen, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-300', glowColor: 'rgba(52, 211, 153, 0.4)' }`
   - `bible_book_66`: `{ icon: Crown, bgColor: 'bg-amber-500/20', textColor: 'text-amber-300', glowColor: 'rgba(251, 191, 36, 0.4)' }` (Crown for the ultimate achievement)

**Auth gating:** N/A — data definitions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing badge definitions
- DO NOT rename the existing `plans_10` "Scripture Scholar" badge
- DO NOT change the existing `BADGE_MAP` construction (it auto-builds from `BADGE_DEFINITIONS`)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BADGE_DEFINITIONS includes 4 bible_book badges` | unit | Filter by id prefix `bible_book_`. Verify 4 entries with correct names. |
| `BADGE_MAP contains bible_book_1, bible_book_5, bible_book_10, bible_book_66` | unit | Verify all 4 keys exist in BADGE_MAP. |
| `bible_book_10 and bible_book_66 have full-screen celebration tier with verses` | unit | Check celebrationTier and verse fields. |
| `getBadgeIcon returns config for bible_book badges` | unit | Call for each ID. Verify icon and colors returned. |

**Expected state after completion:**
- [ ] 4 new Bible reading badges in BADGE_DEFINITIONS
- [ ] Badge icons configured for all 4
- [ ] BADGE_MAP auto-includes the new badges
- [ ] Tests pass

---

### Step 4: Bible Book Completion Detection & Badge Engine

**Objective:** Add book completion detection to `useBibleProgress` and Bible reading badge checking to the badge engine.

**Files to create/modify:**
- `frontend/src/hooks/useBibleProgress.ts` — Add book completion detection, return `justCompletedBook`
- `frontend/src/services/badge-engine.ts` — Add Bible book badge checking
- `frontend/src/services/__tests__/badge-engine.test.ts` — Add tests for Bible book badges
- `frontend/src/hooks/__tests__/useBibleProgress.test.ts` — Add book completion tests

**Details:**

1. **useBibleProgress.ts** — Extend the hook:
   - Import `BIBLE_BOOKS` from `@/constants/bible`
   - Add state: `const [justCompletedBook, setJustCompletedBook] = useState<string | null>(null)`
   - In `markChapterRead`, after writing progress, check if the book is now complete:
     ```typescript
     const bookData = BIBLE_BOOKS.find(b => b.slug === bookSlug)
     if (bookData) {
       const updatedBookProgress = updated[bookSlug] ?? []
       if (updatedBookProgress.length >= bookData.chapters) {
         setJustCompletedBook(bookSlug)
       }
     }
     ```
   - Add `clearJustCompletedBook` callback: `() => setJustCompletedBook(null)`
   - Add `getCompletedBookCount` function:
     ```typescript
     const getCompletedBookCount = useCallback((): number => {
       if (!isAuthenticated) return 0
       const current = readProgress()
       return BIBLE_BOOKS.filter(book => {
         const chapters = current[book.slug] ?? []
         return chapters.length >= book.chapters
       }).length
     }, [isAuthenticated, progress])
     ```
   - Return `{ progress, markChapterRead, getBookProgress, isChapterRead, justCompletedBook, clearJustCompletedBook, getCompletedBookCount }`

2. **badge-engine.ts** — Add Bible book badge checking as section 8:
   ```typescript
   // 8. Bible book completion badges
   const BIBLE_BOOK_BADGES: Record<number, string> = {
     1: 'bible_book_1',
     5: 'bible_book_5',
     10: 'bible_book_10',
     66: 'bible_book_66',
   }

   try {
     const progressJson = localStorage.getItem('wr_bible_progress')
     if (progressJson) {
       const progressMap = JSON.parse(progressJson) as Record<string, number[]>
       // Import BIBLE_BOOKS to check against expected chapter counts
       let completedBooks = 0
       for (const book of BIBLE_BOOKS) {
         const chapters = progressMap[book.slug] ?? []
         if (chapters.length >= book.chapters) {
           completedBooks++
         }
       }
       for (const [threshold, badgeId] of Object.entries(BIBLE_BOOK_BADGES)) {
         if (completedBooks >= Number(threshold) && !earned[badgeId]) {
           result.push(badgeId)
         }
       }
     }
   } catch {
     // Malformed localStorage — skip Bible book badge check
   }
   ```
   Import `BIBLE_BOOKS` from `@/constants/bible` at the top of the file.

**Auth gating:** `markChapterRead` already checks `isAuthenticated`. Badge engine runs in authenticated context.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the existing `markChapterRead` behavior (duplicate prevention, auth check)
- DO NOT add new localStorage keys — reuse `wr_bible_progress`
- DO NOT modify the existing badge engine sections (1-7)
- DO NOT change the `BadgeCheckContext` interface — Bible book badges read localStorage directly (same pattern as reading plan badges in section 6)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `markChapterRead sets justCompletedBook when all chapters read` | unit | Set up progress with N-1 chapters for Genesis (50 chapters). Mark the last one. Verify `justCompletedBook` is `'genesis'`. |
| `markChapterRead does not set justCompletedBook for partial completion` | unit | Mark chapter 1 of Genesis. Verify `justCompletedBook` is null. |
| `getCompletedBookCount returns correct count` | unit | Set progress for 3 fully-read books. Verify returns 3. |
| `getCompletedBookCount returns 0 when not authenticated` | unit | Verify returns 0. |
| `badge engine awards bible_book_1 for 1 completed book` | unit | Set localStorage with 1 fully completed book. Run `checkForNewBadges`. Verify `bible_book_1` in result. |
| `badge engine awards bible_book_5 at 5 books` | unit | 5 completed books → `bible_book_5` in result. |
| `badge engine awards bible_book_10 at 10 books` | unit | 10 completed books → `bible_book_10` in result. |
| `badge engine does not re-award already earned Bible book badges` | unit | Set earned = `{ bible_book_1: ... }`. Verify not in result. |

**Expected state after completion:**
- [ ] `useBibleProgress` detects book completion and exposes `justCompletedBook`
- [ ] `getCompletedBookCount()` correctly counts fully-read books
- [ ] Badge engine checks Bible book completion and awards badges
- [ ] Tests pass

---

### Step 5: Bible Book Completion Inline Card & Toast

**Objective:** Show a celebration toast and inline card when a Bible book is fully read.

**Files to create/modify:**
- `frontend/src/components/bible/BookCompletionCard.tsx` — New inline celebration card component
- `frontend/src/pages/BibleReader.tsx` — Integrate book completion detection, toast, and inline card
- `frontend/src/components/bible/__tests__/BookCompletionCard.test.tsx` — New test file

**Details:**

1. **BookCompletionCard.tsx** — New component:
   ```typescript
   interface BookCompletionCardProps {
     bookName: string
     bookSlug: string
     badgeName?: string
     onDismiss: () => void
   }
   ```
   - Layout: `bg-success/10 border border-success/30 rounded-xl p-4` within `mx-auto max-w-2xl px-4 sm:px-6 mt-4`
   - Content:
     - Row: Green checkmark icon (`CheckCircle` from Lucide, `text-success h-6 w-6`) + "You've completed {bookName}!" (font-semibold text-white)
     - If `badgeName`: small text showing badge name
     - X dismiss button (top-right corner)
     - CTA links row: "View your reading progress →" (`Link to="/insights"`) and "Start the next book →" (`Link to="/bible/{nextBookSlug}/1"`)
   - Compute next book: import `BIBLE_BOOKS` from `@/constants/bible`. Find current book index, next = `BIBLE_BOOKS[index + 1]`. If current is `revelation` (last), don't show "Start the next book" link.
   - Link styling: `text-primary-lt text-sm hover:text-primary hover:underline transition-colors`

2. **BibleReader.tsx** — Integration:
   - Import `BookCompletionCard` and `BIBLE_BOOKS`
   - After `const { markChapterRead, isChapterRead } = useBibleProgress()` → destructure `justCompletedBook`, `clearJustCompletedBook`, `getCompletedBookCount`
   - Add state for showing the card: derive from `justCompletedBook === bookSlug`
   - Add sessionStorage dismissal check:
     ```typescript
     const [cardDismissed, setCardDismissed] = useState(() => {
       return bookSlug ? sessionStorage.getItem(`wr_bible_book_complete_dismissed_${bookSlug}`) === 'true' : false
     })
     ```
   - Show toast when `justCompletedBook` changes to a truthy value (useEffect):
     ```typescript
     useEffect(() => {
       if (!justCompletedBook || justCompletedBook !== bookSlug) return
       const bookData = BIBLE_BOOKS.find(b => b.slug === justCompletedBook)
       if (!bookData) return
       showToast(`${bookData.name} Complete! You've read all ${bookData.chapters} chapters.`, 'success')
     }, [justCompletedBook, bookSlug, showToast])
     ```
     Note: Badge celebrations fire separately through the existing badge pipeline (useFaithPoints → checkForNewBadges → useCelebrationQueue).
   - Render `BookCompletionCard` just before the verse content area (inside the `mx-auto max-w-2xl` container, after audio controls, before the `py-8 sm:py-12` verse div), when book is complete and card is not dismissed:
     ```tsx
     {isAuthenticated && bookSlug && isBookComplete && !cardDismissed && (
       <BookCompletionCard
         bookName={book.name}
         bookSlug={bookSlug}
         badgeName={newlyEarnedBibleBadge}
         onDismiss={() => {
           sessionStorage.setItem(`wr_bible_book_complete_dismissed_${bookSlug}`, 'true')
           setCardDismissed(true)
         }}
       />
     )}
     ```
   - `isBookComplete` check: `book && (progress[bookSlug]?.length ?? 0) >= book.chapters`
   - For badge name: check if any Bible book badge was just earned (read from badge storage newlyEarned).

**Auth gating:** Bible reading is public, but `markChapterRead` no-ops when not authenticated (existing). Inline card only renders when `isAuthenticated`.

**Responsive behavior:**
- Desktop (1440px): Card within `max-w-2xl` container, CTA links in a row
- Tablet (768px): Same as desktop
- Mobile (375px): CTA links stack vertically (`flex flex-col sm:flex-row gap-2`)

**Guardrails (DO NOT):**
- DO NOT modify the verse rendering or highlight/note system
- DO NOT change the Intersection Observer chapter completion logic
- DO NOT persist card dismissal in localStorage (use sessionStorage per spec)
- DO NOT add confetti to the inline card (the toast + badge system handles that)
- DO NOT show the card for logged-out users

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BookCompletionCard renders book name and checkmark` | unit | Render with bookName="Genesis". Verify text and icon. |
| `BookCompletionCard shows badge name when provided` | unit | Pass badgeName="First Book". Verify text appears. |
| `BookCompletionCard "Start the next book" links to correct book` | unit | Pass bookSlug="genesis". Verify link to `/bible/exodus/1`. |
| `BookCompletionCard hides "next book" for Revelation` | unit | Pass bookSlug="revelation". Verify no "Start the next book" link. |
| `BookCompletionCard dismiss sets sessionStorage` | unit | Click X. Verify sessionStorage key set. |
| `BookCompletionCard "View your reading progress" links to /insights` | unit | Verify link href. |
| `BibleReader shows completion card when book is fully read` | integration | Mock full progress for a short book (Ruth, 4 chapters). Verify card renders. |
| `BibleReader hides completion card when dismissed` | integration | Click dismiss. Verify card hidden. |

**Expected state after completion:**
- [ ] Toast fires when book is fully read
- [ ] Inline celebration card appears at top of chapter view
- [ ] Card shows "next book" link (except for Revelation)
- [ ] Card dismissible with sessionStorage persistence
- [ ] Tests pass

---

### Step 6: Reading Plan to Challenge Suggestion

**Objective:** Add a contextual challenge suggestion card to the plan completion overlay.

**Files to create/modify:**
- `frontend/src/lib/plan-challenge-matcher.ts` — New utility for theme-to-challenge mapping
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` — Add challenge suggestion card + accept `planTheme` prop
- `frontend/src/components/reading-plans/__tests__/PlanCompletionOverlay.test.tsx` — Update tests
- `frontend/src/lib/__tests__/plan-challenge-matcher.test.ts` — New test file

**Details:**

1. **plan-challenge-matcher.ts** — New utility:
   ```typescript
   import type { PlanTheme } from '@/types/reading-plans'
   import type { ChallengeSeason, Challenge } from '@/types/challenges'
   import { CHALLENGES } from '@/data/challenges'
   import { getChallengeCalendarInfo, compareDatesOnly } from '@/lib/challenge-calendar'

   const THEME_TO_SEASONS: Record<PlanTheme, ChallengeSeason[] | 'any'> = {
     anxiety: 'any',
     relationships: 'any',
     grief: ['lent'],
     healing: ['lent'],
     forgiveness: ['lent'],
     gratitude: ['advent'],
     hope: ['easter'],
     trust: ['easter'],
     identity: ['newyear'],
     purpose: ['newyear'],
   }

   export interface ChallengeSuggestion {
     challenge: Challenge
     isActive: boolean
     startDate: Date
   }

   export function findMatchingChallenge(theme: PlanTheme, today: Date = new Date()): ChallengeSuggestion | null {
     const preferredSeasons = THEME_TO_SEASONS[theme]
     const thirtyDaysFromNow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)

     const candidates: ChallengeSuggestion[] = []

     for (const challenge of CHALLENGES) {
       const info = getChallengeCalendarInfo(challenge, today)

       // Must be active or upcoming within 30 days
       if (info.status === 'active') {
         if (preferredSeasons === 'any' || preferredSeasons.includes(challenge.season)) {
           candidates.push({ challenge, isActive: true, startDate: info.startDate })
         }
       } else if (info.status === 'upcoming' && compareDatesOnly(info.startDate, thirtyDaysFromNow) <= 0) {
         if (preferredSeasons === 'any' || preferredSeasons.includes(challenge.season)) {
           candidates.push({ challenge, isActive: false, startDate: info.startDate })
         }
       }
     }

     if (candidates.length === 0) return null

     // Prefer active over upcoming
     const active = candidates.find(c => c.isActive)
     if (active) return active

     // Otherwise closest upcoming
     candidates.sort((a, b) => compareDatesOnly(a.startDate, b.startDate))
     return candidates[0]
   }
   ```

2. **PlanCompletionOverlay.tsx** — Extend:
   - Add `planTheme?: PlanTheme` to props interface
   - Import `findMatchingChallenge` from `@/lib/plan-challenge-matcher`
   - Import `getParticipantCount` from `@/constants/challenges`
   - Import `Link` from `react-router-dom`
   - Compute suggestion: `const suggestion = planTheme ? findMatchingChallenge(planTheme) : null`
   - Below the blockquote/verse section and above the "Browse more plans" button, render:
     ```tsx
     {suggestion ? (
       <div className="mt-6 bg-white/[0.08] border border-white/10 rounded-xl p-4 text-left">
         <p className="font-semibold text-white">Continue your journey!</p>
         <p className="mt-1 text-sm text-white/70">
           {suggestion.challenge.title}{' '}
           {suggestion.isActive ? 'is happening now' : `starts ${suggestion.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}.
         </p>
         <p className="text-sm text-white/50">
           {getParticipantCount(suggestion.challenge.id, suggestion.isActive ? 1 : 0)} people are participating.
         </p>
         <Link
           to="/grow?tab=challenges"
           onClick={onDismiss}
           className="mt-2 inline-block text-primary-lt text-sm hover:text-primary hover:underline transition-colors"
         >
           Join Challenge →
         </Link>
       </div>
     ) : (
       <div className="mt-6 bg-white/[0.08] border border-white/10 rounded-xl p-4 text-left">
         <p className="font-semibold text-white">Looking for your next journey?</p>
         <Link
           to="/grow?tab=challenges"
           onClick={onDismiss}
           className="mt-2 inline-block text-primary-lt text-sm hover:text-primary hover:underline transition-colors"
         >
           Browse challenges →
         </Link>
       </div>
     )}
     ```
   - The existing "Browse more plans" button remains after the suggestion card.

3. **Update caller**: The component rendering PlanCompletionOverlay must pass `planTheme`. Find the page that renders it (likely `ReadingPlanDetail.tsx` or similar) and pass the plan's theme. This is a simple prop pass-through from the plan data.

**Auth gating:** Reading plan participation is already auth-gated. No additional gating.

**Responsive behavior:**
- Desktop (1440px): Suggestion card within overlay's `max-w-md` container
- Tablet (768px): Same as desktop
- Mobile (375px): Card full-width within container

**Guardrails (DO NOT):**
- DO NOT remove the existing "Browse more plans" button
- DO NOT change the confetti, verse, or header content
- DO NOT modify challenge data or calendar utilities
- DO NOT modify the focus trap or scroll lock behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `findMatchingChallenge returns active challenge for anxiety theme` | unit | Mock today during active lent. Theme=anxiety → returns the active challenge. |
| `findMatchingChallenge returns lent challenge for grief theme` | unit | Mock today during lent. Theme=grief → returns lent challenge. |
| `findMatchingChallenge returns null when no matching challenge` | unit | Mock today far from any challenge. Theme=grief → null. |
| `findMatchingChallenge prefers active over upcoming` | unit | Mock today during active challenge with upcoming also matching. Verify active returned. |
| `findMatchingChallenge checks 30-day window for upcoming` | unit | Mock upcoming challenge 31 days away. Verify null. Mock 29 days → returns it. |
| `PlanCompletionOverlay shows suggestion card when matching challenge exists` | unit | Pass planTheme. Mock findMatchingChallenge returning challenge. Verify "Continue your journey!" text. |
| `PlanCompletionOverlay shows fallback when no matching challenge` | unit | Pass planTheme with no match. Verify "Looking for your next journey?" text. |
| `PlanCompletionOverlay "Browse more plans" button still exists alongside suggestion` | unit | Verify both suggestion card and browse button present. |

**Expected state after completion:**
- [ ] Plan completion overlay shows contextual challenge suggestion
- [ ] Theme-to-season mapping works correctly
- [ ] Fallback "Looking for your next journey?" appears when no match
- [ ] "Browse more plans" button preserved
- [ ] Tests pass

---

### Step 7: Badge Suggestion Mapping Utility

**Objective:** Create a utility that maps badge IDs to "try this next" suggestion text and link.

**Files to create/modify:**
- `frontend/src/lib/badge-suggestion.ts` — New utility for badge-to-suggestion mapping
- `frontend/src/lib/__tests__/badge-suggestion.test.ts` — New test file

**Details:**

1. **badge-suggestion.ts**:
   ```typescript
   export interface BadgeSuggestion {
     text: string
     link: string
   }

   export function getBadgeSuggestion(badgeId: string, category: string): BadgeSuggestion | null {
     // No suggestion for level or special badges
     if (category === 'level' || category === 'special') return null

     // Streak badges
     if (category === 'streak') {
       return { text: 'Keep it going! Try a reading plan →', link: '/grow?tab=plans' }
     }

     // Challenge badges
     if (category === 'challenge') {
       return { text: 'Keep growing! Try a new plan →', link: '/grow?tab=plans' }
     }

     // Community badges
     if (category === 'community') {
       return { text: 'Join a challenge together →', link: '/grow?tab=challenges' }
     }

     // Activity badges — match by ID prefix
     if (category === 'activity') {
       if (badgeId.startsWith('first_prayer') || badgeId.startsWith('prayer_')) {
         return { text: 'Try audio-guided prayer →', link: '/daily?tab=pray' }
       }
       if (badgeId.startsWith('first_journal') || badgeId.startsWith('journal_')) {
         return { text: 'Explore Bible highlighting →', link: '/bible' }
       }
       if (badgeId.startsWith('first_meditate') || badgeId.startsWith('meditate_') || badgeId.startsWith('meditation_')) {
         return { text: 'Check your meditation trends →', link: '/insights' }
       }
       if (badgeId.startsWith('first_listen') || badgeId.startsWith('listen_')) {
         return { text: 'Discover ambient scenes →', link: '/music' }
       }
       if (badgeId.startsWith('first_prayerwall') || badgeId.startsWith('pray_wall_') || badgeId.startsWith('first_pray_wall')) {
         return { text: 'Join a challenge together →', link: '/grow?tab=challenges' }
       }
       if (badgeId.startsWith('first_plan') || badgeId.startsWith('plans_')) {
         return { text: 'Start another plan →', link: '/grow?tab=plans' }
       }
       if (badgeId.startsWith('bible_book_')) {
         return { text: 'Start a reading plan on what you read →', link: '/grow?tab=plans' }
       }
     }

     return null
   }
   ```

**Auth gating:** N/A — pure utility function.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add suggestions for `level` or `special` category badges
- DO NOT change badge definitions — this is read-only mapping

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `returns null for level badges` | unit | getBadgeSuggestion('level_3', 'level') → null |
| `returns null for special badges` | unit | getBadgeSuggestion('full_worship_day', 'special') → null |
| `returns reading plan suggestion for streak badges` | unit | getBadgeSuggestion('streak_7', 'streak') → link: '/grow?tab=plans' |
| `returns pray suggestion for prayer badges` | unit | getBadgeSuggestion('first_prayer', 'activity') → link: '/daily?tab=pray' |
| `returns journal suggestion for journal badges` | unit | getBadgeSuggestion('journal_50', 'activity') → link: '/bible' |
| `returns insights suggestion for meditation badges` | unit | getBadgeSuggestion('meditate_25', 'activity') → link: '/insights' |
| `returns music suggestion for listen badges` | unit | getBadgeSuggestion('first_listen', 'activity') → link: '/music' |
| `returns challenge suggestion for community badges` | unit | getBadgeSuggestion('first_friend', 'community') → link: '/grow?tab=challenges' |
| `returns plan suggestion for bible_book badges` | unit | getBadgeSuggestion('bible_book_5', 'activity') → link: '/grow?tab=plans' |
| `returns plan suggestion for challenge badges` | unit | getBadgeSuggestion('challenge_lent', 'challenge') → link: '/grow?tab=plans' |

**Expected state after completion:**
- [ ] `getBadgeSuggestion` correctly maps all badge categories to suggestions
- [ ] Returns null for level and special badges
- [ ] Tests pass

---

### Step 8: Badge Celebration Suggestion Links — Toast & Overlay

**Objective:** Add contextual "try this next" suggestion links to badge toast and full-screen celebrations.

**Files to create/modify:**
- `frontend/src/hooks/useCelebrationQueue.ts` — Pass suggestion data to toast and overlay
- `frontend/src/components/ui/Toast.tsx` — Render suggestion link in celebration toasts
- `frontend/src/components/dashboard/CelebrationOverlay.tsx` — Render suggestion link above Continue button
- `frontend/src/components/dashboard/CelebrationQueue.tsx` — Pass suggestion to CelebrationOverlay

**Details:**

1. **useCelebrationQueue.ts** — Compute suggestion for each badge:
   - Import `getBadgeSuggestion` from `@/lib/badge-suggestion`
   - In the toast rendering section (line ~138-155), after creating the icon element, compute suggestion:
     ```typescript
     const suggestion = getBadgeSuggestion(item.badgeId, item.badge.category)
     ```
   - Pass suggestion text to `showCelebrationToast` as additional data. The toast system needs a way to receive and render the suggestion link. Two approaches:
     - **Option A**: Extend `showCelebrationToast` signature to accept optional suggestion
     - **Option B**: Include suggestion as part of the message string with a separator
   - **Chosen: Option A** — Extend `showCelebrationToast` to accept optional `suggestion?: { text: string; link: string }`.

2. **Toast.tsx** — Extend celebration toast rendering:
   - Add `suggestion?: { text: string; link: string }` to `CelebrationToast` interface
   - In the celebration toast render block, below the description `<p>`, add:
     ```tsx
     {toast.suggestion && (
       <Link
         to={toast.suggestion.link}
         onClick={() => dismiss(toast.id)}
         className="block text-primary-lt text-xs hover:text-primary hover:underline transition-colors mt-1"
       >
         {toast.suggestion.text}
       </Link>
     )}
     ```
   - Import `Link` from `react-router-dom`. Note: Toast.tsx must be rendered within Router context (it already is since it's inside `<BrowserRouter>` in App.tsx).
   - Update `showCelebrationToast` signature and the `CelebrationToast` type to include suggestion.

3. **CelebrationOverlay.tsx** — Add suggestion prop:
   - Add `suggestion?: { text: string; link: string }` to `CelebrationOverlayProps`
   - Import `Link` from `react-router-dom`
   - Render between the verse section and the Continue button:
     ```tsx
     {suggestion && (
       <Link
         to={suggestion.link}
         onClick={onDismiss}
         className="mt-3 inline-block text-primary-lt text-sm hover:text-primary hover:underline transition-colors"
       >
         {suggestion.text}
       </Link>
     )}
     ```

4. **CelebrationQueue.tsx** — Pass suggestion to overlay:
   - Import `getBadgeSuggestion` from `@/lib/badge-suggestion`
   - Compute: `const suggestion = currentCelebration ? getBadgeSuggestion(currentCelebration.badgeId, currentCelebration.badge.category) : null`
   - Pass to CelebrationOverlay: `<CelebrationOverlay badge={...} onDismiss={...} suggestion={suggestion} />`

5. **useCelebrationQueue.ts** — Pass suggestion to toast:
   - In the toast processing loop, compute suggestion and pass it:
     ```typescript
     const suggestion = getBadgeSuggestion(item.badgeId, item.badge.category)
     await showCelebrationToast(
       item.badge.name,
       `You earned: ${item.badge.description}`,
       tierToToastType(item.tier),
       iconElement,
       suggestion ?? undefined,
     )
     ```

**Auth gating:** Badge celebrations only fire for authenticated users. No additional gating.

**Responsive behavior:**
- Desktop (1440px): Toast suggestion is inline second line; overlay suggestion centered
- Tablet (768px): Same
- Mobile (375px): Same — toast text wraps naturally, overlay link centered

**Guardrails (DO NOT):**
- DO NOT change existing toast dismiss timing
- DO NOT add suggestions to level or special badges (getBadgeSuggestion already returns null)
- DO NOT modify the celebration queue ordering or caps (5 toast, 2 overlay)
- DO NOT change the Continue button delay or position
- DO NOT change existing badge name, description, or icon rendering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `celebration toast renders suggestion link for streak badge` | unit | Show toast for streak_7. Verify "Keep it going! Try a reading plan →" link appears. |
| `celebration toast suggestion link navigates and dismisses` | unit | Click suggestion link in toast. Verify toast dismissed. |
| `celebration toast has no suggestion for level badge` | unit | Show toast (hypothetically) for level badge. Verify no suggestion link. |
| `CelebrationOverlay renders suggestion above Continue` | unit | Pass suggestion prop. Verify link appears between verse and Continue button. |
| `CelebrationOverlay suggestion navigates and dismisses` | unit | Click suggestion link. Verify `onDismiss` called. |
| `CelebrationOverlay has no suggestion when prop is undefined` | unit | Render without suggestion prop. Verify no suggestion link. |
| `CelebrationQueue passes suggestion to overlay` | integration | Queue a streak badge (full-screen). Verify suggestion computed and passed. |
| `toast suggestion link styling is text-xs` | unit | Verify `text-xs` class on suggestion link. |
| `overlay suggestion link styling is text-sm` | unit | Verify `text-sm` class on suggestion link. |

**Expected state after completion:**
- [ ] Toast celebrations show suggestion link as second line
- [ ] Full-screen celebrations show suggestion link above Continue
- [ ] Level and special badges show no suggestion
- [ ] Clicking suggestion navigates and dismisses celebration
- [ ] Tests pass

---

### Step 9: Wire Plan Theme to PlanCompletionOverlay

**Objective:** Pass the reading plan's `theme` to PlanCompletionOverlay from the caller.

**Files to create/modify:**
- Find and modify the component that renders `<PlanCompletionOverlay>` — likely in `ReadingPlanDetail.tsx` or similar

**Details:**

1. Search for where `PlanCompletionOverlay` is rendered. The caller has access to the plan data (including `theme`). Add `planTheme={plan.theme}` prop.

2. This is a single-line prop addition. The plan data is already available in the parent component since it renders the plan title and day count.

**Auth gating:** N/A — prop pass-through only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the overlay dismissal or browse plans behavior
- DO NOT modify plan data loading

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `PlanCompletionOverlay receives planTheme from parent` | integration | Render the parent with a plan that has theme='anxiety'. Verify overlay receives the theme prop. |

**Expected state after completion:**
- [ ] PlanCompletionOverlay receives `planTheme` prop from its parent
- [ ] Challenge suggestion card renders correctly in the overlay

---

### Step 10: Final Integration Testing & Cleanup

**Objective:** Run all tests, verify no regressions, clean up imports.

**Files to create/modify:**
- No new files — run tests and fix any issues

**Details:**

1. Run `pnpm test` from `frontend/` directory.
2. Fix any failing tests (imports, type errors, mock adjustments).
3. Run `pnpm lint` and fix any linting issues.
4. Verify all new files have proper TypeScript types (no `any`).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change any business logic during cleanup
- DO NOT add features beyond what the spec requires
- DO NOT refactor existing code that wasn't part of this spec

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full test suite passes | integration | `pnpm test` exits cleanly |
| Lint passes | integration | `pnpm lint` exits cleanly |

**Expected state after completion:**
- [ ] All tests pass
- [ ] No lint errors
- [ ] All 5 integrations implemented per spec
- [ ] No new localStorage keys (only sessionStorage for Bible card dismissal)
- [ ] No changes to existing celebration visuals/animations

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Meditation completion stats & insights link |
| 2 | — | Challenge completion CTA grid & share |
| 3 | — | Bible reading badge definitions & icons |
| 4 | 3 | Bible book completion detection & badge engine |
| 5 | 4 | Bible book completion inline card & toast |
| 6 | — | Reading plan to challenge suggestion (utility) |
| 7 | — | Badge suggestion mapping utility |
| 8 | 7 | Badge celebration suggestion links (toast & overlay) |
| 9 | 6 | Wire plan theme to PlanCompletionOverlay |
| 10 | 1-9 | Final integration testing & cleanup |

Steps 1, 2, 3, 6, 7 are independent and can execute in parallel.
Steps 4 depends on 3. Step 5 depends on 4. Step 8 depends on 7. Step 9 depends on 6.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Meditation Completion Stats & Insights Link | [COMPLETE] | 2026-03-26 | Modified CompletionScreen.tsx (added showMeditationStats prop, stats display, insights link), MeditationHistory.tsx (added id), all 6 meditation pages (added showMeditationStats prop), created CompletionScreen.test.tsx (8 tests) |
| 2 | Challenge Completion CTA Grid & Share | [COMPLETE] | 2026-03-26 | Modified ChallengeCompletionOverlay.tsx (5-card CTA grid, share wired, 12s auto-dismiss), updated tests (17 passing) |
| 3 | Bible Reading Badges — Definitions & Icons | [COMPLETE] | 2026-03-26 | Added 4 bible_book badges to badges.ts, 4 icon configs to badge-icons.ts, updated badge count tests (44 total), added bible book badge tests |
| 4 | Bible Book Completion Detection & Badge Engine | [COMPLETE] | 2026-03-26 | Extended useBibleProgress (justCompletedBook, clearJustCompletedBook, getCompletedBookCount), added Bible book badge checking to badge-engine (section 8), all tests passing |
| 5 | Bible Book Completion Inline Card & Toast | [COMPLETE] | 2026-03-26 | Created BookCompletionCard.tsx, integrated into BibleReader.tsx (toast + inline card + sessionStorage dismissal), created BookCompletionCard.test.tsx (7 tests) |
| 6 | Reading Plan to Challenge Suggestion | [COMPLETE] | 2026-03-26 | Created plan-challenge-matcher.ts, added planTheme prop + suggestion card to PlanCompletionOverlay.tsx, created plan-challenge-matcher.test.ts, updated PlanCompletionOverlay.test.tsx (17 tests) |
| 7 | Badge Suggestion Mapping Utility | [COMPLETE] | 2026-03-26 | Created badge-suggestion.ts, badge-suggestion.test.ts (12 tests). Fixed prefix ordering to avoid first_prayerwall matching first_prayer. |
| 8 | Badge Celebration Suggestion Links | [COMPLETE] | 2026-03-26 | Updated Toast.tsx (suggestion in CelebrationToast + Link rendering), CelebrationOverlay.tsx (suggestion prop + Link), CelebrationQueue.tsx (compute + pass suggestion), useCelebrationQueue.ts (compute + pass suggestion to toast). All 36 existing tests pass. |
| 9 | Wire Plan Theme to PlanCompletionOverlay | [COMPLETE] | 2026-03-26 | Added planTheme={plan.theme} to PlanCompletionOverlay in ReadingPlanDetail.tsx |
| 10 | Final Integration Testing & Cleanup | [COMPLETE] | 2026-03-26 | All 4443 tests pass (401 test files). 1 pre-existing Playwright config failure (unrelated). Lint clean for all new/modified files. TypeScript compilation clean. |
