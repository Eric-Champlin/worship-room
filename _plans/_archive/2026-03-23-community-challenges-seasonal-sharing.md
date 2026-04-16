# Implementation Plan: Community Challenges — Seasonal Content & Social Sharing

**Spec:** `_specs/community-challenges-seasonal-sharing.md`
**Date:** 2026-03-23
**Branch:** `claude/feature/community-challenges-seasonal-sharing`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** Spec 1 (`community-challenges-data-page.md`) + Spec 2 (`community-challenges-progress.md`) — loaded via codebase exploration

---

## Architecture Context

### Directory Layout

- **Pages:** `frontend/src/pages/` — `Home.tsx`, `DailyHub.tsx`, `PrayerWall.tsx`, `ChallengeDetail.tsx`, `Challenges.tsx`
- **Challenge components:** `frontend/src/components/challenges/` — `ChallengeDayContent.tsx`, `ChallengeIcon.tsx`, `ChallengeCompletionOverlay.tsx`, etc.
- **Prayer Wall components:** `frontend/src/components/prayer-wall/` — `InlineComposer.tsx`, `CategoryFilterBar.tsx`, `PrayerCard.tsx`
- **Dashboard components:** `frontend/src/components/dashboard/` — `ChallengeWidget.tsx`, `CelebrationOverlay.tsx`
- **Daily components:** `frontend/src/components/daily/` — `PrayTabContent.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`
- **Hooks:** `frontend/src/hooks/` — `useChallengeProgress.ts`, `useFaithPoints.ts`, `useLiturgicalSeason.ts`, `useAuth.ts`
- **Libs:** `frontend/src/lib/` — `challenge-calendar.ts` (calendar computation)
- **Constants:** `frontend/src/constants/` — `challenges.ts`, `prayer-categories.ts`
- **Types:** `frontend/src/types/` — `challenges.ts`, `prayer-wall.ts`
- **Data:** `frontend/src/data/` — `challenges.ts` (5 seasonal challenges)

### Existing Patterns to Follow

- **Context pre-fill via `location.state`**: `PrayTabContent.tsx` reads `location.state?.prayWallContext` to pre-fill the textarea, then clears state with `navigate(path, { replace: true, state: null })`. Challenge deep links should follow this exact pattern.
- **Category filter (Prayer Wall)**: `CategoryFilterBar.tsx` renders filter pills from `PRAYER_CATEGORIES` array. Active filter is stored in URL search params via `useSearchParams`. Adding "Challenge Prayers" means extending this system.
- **Auth gating**: `useAuth()` + `useAuthModal()` pattern. Auth modal triggered via `authModal?.openAuthModal('Sign in to ...')`.
- **Challenge calendar**: `getChallengeCalendarInfo(challenge)` returns `{ status: 'active'|'upcoming'|'past', startDate, endDate, daysRemaining, calendarDay }`.
- **Active challenge**: `useChallengeProgress().getActiveChallenge()` returns `{ challengeId, progress }` or `undefined`.
- **Participant count**: `getParticipantCount(challengeId, calendarDay)` — deterministic mock formula.
- **Banner dismissal**: `SeasonalBanner.tsx` uses `sessionStorage` with animated hide (200ms transition).
- **Canvas share cards**: No existing Canvas implementation (MonthlyShareButton is a stub). Build from scratch following spec's 1080×1080 layout.
- **Celebration system**: `ChallengeCompletionOverlay.tsx` uses `createPortal` to document.body, confetti particles in `[themeColor, '#FFD700', '#FFFFFF']`, focus trap, auto-dismiss after 8s.
- **Toast system**: `useToastSafe()` exposes `showToast(msg, type)` and `showCelebrationToast(badge, msg, tier)`.

### Landing Page Integration Point

`Home.tsx` renders: `SeasonalBanner → HeroSection → JourneySection → TodaysVerseSection → DevotionalTeaser → GrowthTeasersSection → StartingPointQuiz`. The challenge banner goes between `HeroSection` and `JourneySection`.

### Daily Hub Integration Point

`DailyHub.tsx` renders: Hero → `VerseOfTheDayBanner` → sentinel div → Sticky Tab Bar → Tab content. The challenge strip goes between `VerseOfTheDayBanner` and the sentinel (above the tab bar).

### Challenge Detail Page Integration Points

`ChallengeDetail.tsx` renders: Hero → `ChallengeDayContent` → completion celebration → day navigation. The share button and community feed are added inside/after `ChallengeDayContent`. Milestone cards appear above the day content.

### Challenges Browser Page Integration Point

`Challenges.tsx` renders: `PageHero` → Active Now → Countdown → Coming Up → Past. Hall of Fame goes after Past section.

### Test Patterns

- Vitest + React Testing Library + jsdom
- Provider wrapping: `AuthModalProvider`, `ToastProvider`, `MemoryRouter`
- Pattern: `render(<MemoryRouter><AuthModalProvider><ToastProvider><Component /></ToastProvider></AuthModalProvider></MemoryRouter>)`
- Mock `useAuth` via vi.mock: `vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { ... } }) }))`
- Mock localStorage via `vi.spyOn(Storage.prototype, 'getItem')` or direct manipulation

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Join the Challenge" CTA on landing banner (logged-out) | Triggers auth modal | Step 1 | `useAuth` + `useAuthModal` |
| "Join the Challenge" CTA on landing banner (logged-in, non-participant) | Joins directly | Step 1 | `useAuth` check |
| Daily Hub challenge strip visibility | Only for authenticated + active challenge | Step 2 | `useAuth` + `getActiveChallenge()` |
| Prayer Wall challenge checkbox | Inherits composer auth gate | Step 3 | Composer already auth-gated |
| "Share Progress" button | Only for joined users with ≥1 completed day | Step 4 | `isAuthenticated && isJoined && completedDays.length > 0` |
| Milestone card display | Only for joined users | Step 5 | `isAuthenticated && progress` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Landing banner container | background | `bg-hero-dark/95` | spec + design-system.md |
| Landing banner | border-radius | `rounded-2xl` | spec |
| Landing banner | border | `border border-white/10` | adapted from dashboard card pattern |
| Landing banner CTA | style | `bg-[themeColor] text-white font-semibold py-3 px-6 sm:px-8 rounded-lg` | spec |
| Landing banner dismiss | touch target | `min-h-[44px] min-w-[44px]` | accessibility standard |
| Daily Hub strip | container | `rounded-xl p-3 mx-4` | spec |
| Daily Hub strip | background | `bg-[themeColor]/15` (inline style) | spec |
| Daily Hub strip | text | `text-white text-sm truncate` | spec |
| Challenge prayer badge | pill | `rounded-full px-2.5 py-0.5 text-xs font-medium` | spec |
| Milestone card | container | `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8` | spec (frosted glass variant) |
| Milestone heading | font | Caveat, `text-3xl sm:text-4xl`, theme color | spec |
| Share button primary | style | `bg-[themeColor] text-white font-semibold py-3 px-8 rounded-lg` | spec |
| Share button outline | style | `border border-white/30 text-white/80 py-3 px-6 rounded-lg` | spec |
| Community feed item | avatar | `32px circle, white initials text-xs font-semibold` | spec |
| Community feed | divider | `border-b border-white/5 last:border-0` | spec |
| Hall of Fame card | style | `bg-white rounded-xl border border-gray-200 shadow-sm p-5` | design-system.md meditation card pattern |
| Canvas image | dimensions | 1080×1080px | spec |
| Canvas title | font | Caveat ~72px white | spec |
| Canvas subtitle | font | Inter ~36px white | spec |
| Canvas watermark | font | Caveat ~28px white at 40% opacity | spec |
| Canvas progress bar | size | 600px wide, 12px tall, rounded-full | spec |

---

## Design System Reminder

- Worship Room uses **Caveat** (`font-script`) for script/highlighted headings, not Lora
- **Lora** (`font-serif`) is for scripture text and journal prompts only
- **Inter** (`font-sans`) is the body and heading font
- All Daily Hub tabs share `max-w-2xl` container width
- Hero gradients use the radial+linear combo from `design-system.md`
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Challenge theme colors: Lent=#6B21A8, Easter=#FDE68A, Pentecost=#DC2626, Advent=#7C3AED, NewYear=teal
- Primary CTA: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- Outline button (dark bg): `border border-white/30 text-white/80 rounded-lg`
- White card (light bg): `bg-white rounded-xl border border-gray-200 shadow-sm p-5`
- Category filter pills: `min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium`

---

## Shared Data Models (from Specs 1 & 2)

```typescript
// types/challenges.ts — already built
export type ChallengeActionType = 'pray' | 'journal' | 'meditate' | 'music' | 'gratitude' | 'prayerWall'

export interface DayChallengeContent {
  dayNumber: number
  title: string
  scripture: ChallengeScripture
  reflection: string
  dailyAction: string
  actionType: ChallengeActionType
}

export interface Challenge {
  id: string; title: string; description: string
  season: ChallengeSeason; getStartDate: (year: number) => Date
  durationDays: number; icon: string; themeColor: string
  dailyContent: DayChallengeContent[]; communityGoal: string
}

export interface ChallengeProgress {
  joinedAt: string; currentDay: number; completedDays: number[]
  completedAt: string | null; streak: number; missedDays: number[]
  status: ChallengeStatus
  // NEW in Spec 3:
  shownMilestones?: number[]  // tracks which milestone days have been shown
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_challenge_progress` | Both | Adds `shownMilestones` array to each challenge entry |
| `wr_challenge_banner_dismissed_{challengeId}` | Write (sessionStorage) | Ephemeral banner dismiss per challenge |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Banner stacked, strip single-line, milestone stacked, Hall of Fame single column, 44px targets |
| Tablet | 640-1024px | Banner horizontal, milestone horizontal, Hall of Fame 2-column |
| Desktop | > 1024px | Banner `max-w-5xl` centered, milestone `max-w-2xl`, Hall of Fame 2-column `max-w-4xl` |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| HeroSection → Challenge Banner | 0px (banner is a section between them) | spec |
| Challenge Banner → JourneySection | 0px (natural flow) | spec |
| VerseOfTheDayBanner → Challenge Strip → Tab Bar | Strip adds ~56px height | spec |
| Day content → Share button | 8-10px (within action callout card) | spec |
| Share section → Community feed | standard section spacing (`py-8`) | spec |
| Past challenges → Hall of Fame | standard section spacing (`mb-10`) | Challenges.tsx pattern |

---

## Assumptions & Pre-Execution Checklist

- [x] Specs 1 and 2 are complete and committed (community-challenges-data-page, community-challenges-progress)
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from recon + codebase inspection
- [ ] Caveat font must be available for Canvas rendering — need to confirm `document.fonts.ready` works for Caveat in the production build (Google Fonts loaded via `<link>`)
- [ ] `navigator.share()` file attachment support varies by browser — test on Safari iOS and Chrome Android
- [ ] The `toast-confetti` celebration tier referenced in the spec maps to `showCelebrationToast(name, msg, 'celebration-confetti')` from the existing toast system

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Banner between which sections? | Between HeroSection and JourneySection | Spec requirement; most visible position on landing page |
| Challenge strip position | Between VerseOfTheDayBanner and sentinel (above tab bar) | Spec says "above the tab bar"; this is the natural insertion point |
| Multiple active challenges on landing banner | Show challenge with nearest end date | Spec: "shows the one with the nearest end date (more urgent)" |
| 7-day challenge milestones | No separate milestone card at Day 7 | Spec: "completion celebration from Spec 2 is sufficient" |
| Banner dismiss key | `wr_challenge_banner_dismissed_{challengeId}` in sessionStorage | Spec: per-challenge, per-session dismiss. Different challenges can appear independently |
| Canvas font fallback | Fall back to sans-serif if Caveat not loaded | Spec edge case: "If font loading fails, fall back to sans-serif" |
| Share text link | Hardcoded to `/challenges/:challengeId` (relative URL) | No absolute URL available in frontend-first mode; Phase 3+ will use real domain |
| Context consumption | Clear `location.state` after reading via `navigate(path, { replace: true, state: null })` | Follow PrayTabContent pattern; prevent re-fill on refresh |
| "Challenge Prayers" filter approach | Add as a virtual category in the filter bar (not in `PRAYER_CATEGORIES` constant) | Challenge filter is seasonal/ephemeral, not a permanent prayer category |
| Prayer `challengeId` field | Add to mock prayer objects in localStorage-based mock data | Frontend-first; no backend schema changes needed |
| Hall of Fame year computation | Use `getStartDate(currentYear).getFullYear()` or previous year | Spec: "year the challenge last ran" |
| Community feed rotation | `(dayNumber * 7 + index) % totalMockItems` | Spec formula |
| Pre-fill prayer starters | Hardcoded per action type + day theme, ~15 starters total | Not AI-generated; reviewed for crisis keywords |

---

## Implementation Steps

### Step 1: Landing Page Challenge Banner

**Objective:** Add a seasonal challenge banner on the landing page between HeroSection and JourneySection that invites visitors to join an active challenge.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeBanner.tsx` — new component
- `frontend/src/components/challenges/__tests__/ChallengeBanner.test.tsx` — new tests
- `frontend/src/pages/Home.tsx` — import and render banner

**Details:**

Create `ChallengeBanner.tsx`:
- Use `getActiveChallengeInfo()` from `@/lib/challenge-calendar` to find the active challenge
- If multiple active, pick the one with the smallest `daysRemaining`
- Look up the challenge data via `getChallenge(challengeId)` from `@/data/challenges`
- Read `sessionStorage.getItem('wr_challenge_banner_dismissed_' + challengeId)` for dismiss state
- Use `useAuth()` to check authentication
- Use `useChallengeProgress().getProgress(challengeId)` for joined/progress state
- Use `useAuthModal()` for logged-out "Join" click

Layout:
```
<section className="mx-4 sm:mx-8 lg:mx-auto max-w-5xl">
  <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-8"
       style={{ backgroundColor: 'rgba(13,6,32,0.95)' }}>
    {/* Radial gradient accent overlay */}
    <div className="pointer-events-none absolute inset-0"
         style={{ background: `radial-gradient(circle at 70% 50%, ${themeColor}1A 0%, transparent 70%)` }}
         aria-hidden="true" />

    {/* Content: horizontal on desktop, stacked on mobile */}
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">{challenge.title}</h2>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
          <Users className="h-4 w-4" /> {participantCount.toLocaleString()} participants
        </div>
        {/* Progress or countdown text */}
        {isJoined ? (
          <p className="mt-2 text-base font-medium text-white/80">
            Day {progress.currentDay} of {challenge.durationDays}
          </p>
        ) : (
          <p className="mt-2 text-base font-medium text-white/80">
            <span style={{ color: themeColor }}>{daysRemaining} days</span> remaining
          </p>
        )}
      </div>
      <button onClick={handleCTA} style={{ backgroundColor: themeColor }}
              className="w-full font-semibold py-3 px-6 sm:w-auto sm:px-8 rounded-lg text-white min-h-[44px]">
        {isJoined ? "Continue Today's Challenge" : 'Join the Challenge'}
      </button>
    </div>

    {/* Dismiss button */}
    <button onClick={handleDismiss} aria-label="Dismiss challenge banner"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-white/40 hover:text-white/60">
      <X className="h-4 w-4" />
    </button>
  </div>
</section>
```

In `Home.tsx`, add between HeroSection and JourneySection:
```tsx
<HeroSection />
<ChallengeBanner />
<JourneySection />
```

Dismiss: `sessionStorage.setItem('wr_challenge_banner_dismissed_' + challengeId, 'true')`. Use animated hide (200ms opacity+maxHeight transition, same as `SeasonalBanner`). Support `prefers-reduced-motion`.

**Auth gating:**
- Logged-out → "Join the Challenge" → `authModal.openAuthModal('Sign in to join this challenge')`
- Logged-in non-participant → "Join the Challenge" → `joinChallenge(challengeId)` (handle switch dialog if active challenge exists)
- Logged-in participant → "Continue Today's Challenge" → `navigate('/challenges/' + challengeId)`

**Responsive behavior:**
- Desktop (>1024px): `max-w-5xl mx-auto`, horizontal layout (text left, CTA right), `p-8`
- Tablet (640-1024px): `mx-8`, horizontal layout, `p-6`
- Mobile (<640px): `mx-4`, stacked layout, full-width CTA, `p-5`

**Guardrails (DO NOT):**
- DO NOT render the banner when no challenge season is active
- DO NOT persist dismiss state to localStorage (use sessionStorage only)
- DO NOT show a placeholder or empty state when no active season
- DO NOT use theme color at > 10% opacity for the background accent

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders banner when active challenge season | integration | Mock `getActiveChallengeInfo` to return active, verify banner renders |
| does not render when no active season | integration | Mock returns null, verify no banner |
| shows "Join" for logged-out users | integration | Auth false, verify button text |
| triggers auth modal on logged-out "Join" click | integration | Click CTA, verify `openAuthModal` called |
| shows "Continue" for active participants | integration | Auth true, joined progress, verify button text |
| navigates to detail page on "Continue" click | integration | Click CTA, verify navigation |
| dismiss hides banner and writes sessionStorage | integration | Click X, verify hidden + sessionStorage set |
| reappears for different challenge in same session | integration | Dismiss challenge A, active challenge B, verify banner shows |
| responsive: stacked on mobile | unit | Render at mobile viewport, verify stacked layout classes |
| accessible: dismiss button has aria-label | unit | Verify aria-label present |
| CTA has 44px minimum touch target | unit | Verify `min-h-[44px]` class |

**Expected state after completion:**
- [ ] Landing page shows challenge banner during active seasons
- [ ] Banner correctly handles all 3 user states (logged-out, logged-in non-participant, logged-in participant)
- [ ] Banner is dismissable per-challenge per-session
- [ ] All tests pass

---

### Step 2: Daily Hub Challenge Reminder Strip

**Objective:** Add a compact reminder strip above the Daily Hub tab bar for logged-in users with an active challenge.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeStrip.tsx` — new component
- `frontend/src/components/challenges/__tests__/ChallengeStrip.test.tsx` — new tests
- `frontend/src/pages/DailyHub.tsx` — import and render strip

**Details:**

Create `ChallengeStrip.tsx`:
- Use `useAuth()` to gate visibility (only for authenticated users)
- Use `useChallengeProgress().getActiveChallenge()` to get the active challenge
- Look up challenge data via `getChallenge(challengeId)`
- Get current day content: `challenge.dailyContent[progress.currentDay - 1]`

Layout:
```tsx
<div className="mx-4 mb-2 rounded-xl p-3" style={{ backgroundColor: `${themeColor}26` }}>
  <Link to={`/challenges/${challengeId}`}
        className="flex items-center gap-3"
        aria-label={`Day ${progress.currentDay} of ${challenge.title}: ${dayContent.dailyAction}. Go to challenge.`}>
    <ChallengeIcon name={challenge.icon} className="h-4 w-4 shrink-0" style={{ color: themeColor }} />
    <span className="flex-1 truncate text-sm text-white">
      <span className="font-medium">Day {progress.currentDay}:</span>{' '}
      {dayContent.dailyAction}
    </span>
    <span className="flex items-center text-sm font-medium" style={{ color: themeColor }}>
      Go <ChevronRight className="h-3.5 w-3.5" />
    </span>
  </Link>
</div>
```

**Wait — the Daily Hub has a light background (`bg-neutral-bg`).** The strip is between the VerseOfTheDayBanner (which has a gradient background) and the tab bar (neutral-bg). The spec says theme color at 15% opacity. Since the tab bar area uses `bg-neutral-bg` (#F5F5F5), the strip text needs to be dark, not white.

[UNVERIFIED] Strip text color on light background: Use `text-text-dark` instead of `text-white`.
→ To verify: Run /verify-with-playwright and check the strip appearance on the Daily Hub page.
→ If wrong: Switch to `text-white` if the strip sits on a dark background section.

**Actually**, looking more carefully at DailyHub.tsx, the VerseOfTheDayBanner sits in a gradient (`bg-gradient-to-b from-primary to-neutral-bg`), and below it the tab bar has `bg-neutral-bg`. The strip should sit in the neutral-bg zone. So:
- Background: inline style `backgroundColor: ${themeColor}26` (15% opacity) on a `bg-neutral-bg` area
- Text: `text-text-dark` for body, theme color for "Go" link

In `DailyHub.tsx`, insert between the VerseOfTheDayBanner wrapper and the sentinel div:
```tsx
{/* Challenge strip */}
<ChallengeStrip />

{/* Sentinel for sticky tab bar shadow */}
<div ref={sentinelRef} aria-hidden="true" />
```

**Auth gating:**
- Component returns `null` if `!isAuthenticated` or no active challenge

**Responsive behavior:**
- All sizes: single-line horizontal layout, truncated text
- Mobile (<640px): full-width within `mx-4` margins
- Desktop (>1024px): within the page flow (no max-width needed since Daily Hub content column handles it)

**Guardrails (DO NOT):**
- DO NOT show the strip for logged-out users
- DO NOT show the strip when no challenge is active
- DO NOT make the strip sticky (it scrolls normally with the page)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders for authenticated user with active challenge | integration | Auth true, active challenge, verify strip renders |
| does not render for logged-out users | integration | Auth false, verify no strip |
| does not render when no active challenge | integration | Auth true, no active challenge, verify no strip |
| shows correct day and action text | unit | Verify "Day X: [action]" text |
| links to challenge detail page | unit | Verify Link `to` prop |
| truncates long action text | unit | Verify `truncate` class on text |
| has accessible link label | unit | Verify aria-label includes challenge name and day |

**Expected state after completion:**
- [ ] Daily Hub shows challenge strip for logged-in users with active challenge
- [ ] Strip disappears for logged-out users and users with no active challenge
- [ ] Strip links to the challenge detail page
- [ ] All tests pass

---

### Step 3: Prayer Wall Challenge Integration

**Objective:** Add challenge prayer checkbox to InlineComposer, "Challenge Prayers" filter to CategoryFilterBar, and challenge badge to PrayerCard during active challenge seasons.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — add challenge checkbox
- `frontend/src/components/prayer-wall/CategoryFilterBar.tsx` — add "Challenge Prayers" filter
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — add challenge badge
- `frontend/src/types/prayer-wall.ts` — add `challengeId` field to `PrayerRequest`
- `frontend/src/pages/PrayerWall.tsx` — wire up challenge filter logic
- `frontend/src/constants/prayer-categories.ts` — add `CHALLENGE_FILTER_KEY` constant
- Test files for each modified component

**Details:**

**3a. Type update** (`types/prayer-wall.ts`):
Add optional `challengeId?: string` field to `PrayerRequest` interface.

**3b. InlineComposer** (`InlineComposer.tsx`):
- Import `getActiveChallengeInfo` and `getChallenge` from challenge modules
- Compute active challenge: `const activeChallengeInfo = getActiveChallengeInfo(); const activeChallenge = activeChallengeInfo ? getChallenge(activeChallengeInfo.challengeId) : null`
- Add `const [isChallengePrayer, setIsChallengePrayer] = useState(false)` state
- Read URL params for pre-checked state: if `location.search` includes `challengePrayer=true`, default checkbox to checked
- Add checkbox below textarea, above category fieldset:
```tsx
{activeChallenge && (
  <label className="mt-3 flex items-center gap-2 text-sm text-text-dark">
    <input
      type="checkbox"
      checked={isChallengePrayer}
      onChange={(e) => setIsChallengePrayer(e.target.checked)}
      className="h-5 w-5 rounded border-gray-300"
      id="challenge-prayer-checkbox"
    />
    <span>This is a{' '}
      <span style={{ color: activeChallenge.themeColor }} className="font-medium">
        {activeChallenge.title}
      </span>{' '}
      prayer
    </span>
  </label>
)}
```
- Modify `onSubmit` call to pass `challengeId`: `onSubmit(content.trim(), isAnonymous, selectedCategory, isChallengePrayer ? activeChallenge.id : undefined)`
- Update `onSubmit` prop type to include optional `challengeId` parameter

**3c. CategoryFilterBar** (`CategoryFilterBar.tsx`):
- Accept new prop: `activeChallengeId?: string` and `activeChallengeTitle?: string` and `activeChallengeColor?: string`
- When these props are provided, render an additional filter pill after "All" but before category pills:
```tsx
{activeChallengeId && (
  <button
    type="button"
    onClick={() => onSelectCategory('challenge' as PrayerCategory)}
    className={cn(
      'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap',
      activeCategory === ('challenge' as PrayerCategory)
        ? `border-[${activeChallengeColor}]/40 bg-[${activeChallengeColor}]/20`
        : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
    )}
    style={activeCategory === ('challenge' as PrayerCategory) ? { color: activeChallengeColor, borderColor: `${activeChallengeColor}66`, backgroundColor: `${activeChallengeColor}33` } : undefined}
    aria-pressed={activeCategory === ('challenge' as PrayerCategory)}
  >
    {activeChallengeTitle} Prayers
  </button>
)}
```

Actually, `PrayerCategory` is a typed union. Rather than hack it, use a separate prop for the challenge filter state:

- Add new props: `challengeFilter?: { id: string; title: string; color: string } | null`, `isChallengeFilterActive: boolean`, `onToggleChallengeFilter: () => void`
- Render the challenge filter pill when `challengeFilter` is provided

**3d. PrayerCard** (`PrayerCard.tsx`):
- When `prayer.challengeId` is present, look up the challenge: `const challenge = prayer.challengeId ? getChallenge(prayer.challengeId) : null`
- Render a small badge near the category or below author info:
```tsx
{challenge && (
  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${challenge.themeColor}26`, color: challenge.themeColor }}>
    {challenge.title.split(':')[0]}
  </span>
)}
```

**3e. PrayerWall.tsx** wiring:
- Compute active challenge info
- Add `isChallengeFilterActive` state (from URL params: `searchParams.get('filter') === 'challenge'`)
- Pass challenge filter props to `CategoryFilterBar`
- Filter prayers: when challenge filter active, show only prayers with matching `challengeId`
- Handle URL nav from community feed: `/prayer-wall?filter=challenge`

**Auth gating:**
- Composer checkbox inherits composer auth gate (composer only renders for authenticated users)
- "Challenge Prayers" filter is visible to all users (filters public feed)

**Responsive behavior:**
- Checkbox: full-width below textarea, wraps if label is long
- Filter pill: scrolls horizontally with other pills on mobile
- Badge: inline with other metadata, doesn't break card layout

**Guardrails (DO NOT):**
- DO NOT modify the `PRAYER_CATEGORIES` constant (challenge is not a permanent category)
- DO NOT show the checkbox or filter when no challenge season is active
- DO NOT break existing category filtering logic

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| InlineComposer shows checkbox during active season | integration | Mock active challenge, verify checkbox renders |
| InlineComposer hides checkbox when no active season | integration | No active challenge, verify no checkbox |
| checking checkbox adds challengeId to submission | integration | Check box, submit, verify onSubmit receives challengeId |
| CategoryFilterBar shows "Challenge Prayers" pill during active season | unit | Pass challengeFilter prop, verify pill renders |
| filter pill filters prayers by challengeId | integration | Click challenge filter, verify only challenge prayers shown |
| PrayerCard shows challenge badge when challengeId present | unit | Prayer with challengeId, verify badge renders |
| PrayerCard shows no badge when no challengeId | unit | Prayer without challengeId, verify no badge |
| challenge checkbox has accessible label with htmlFor/id | unit | Verify label association |

**Expected state after completion:**
- [ ] InlineComposer shows challenge prayer checkbox during active seasons
- [ ] CategoryFilterBar shows "Challenge Prayers" filter during active seasons
- [ ] PrayerCards display challenge badge for tagged prayers
- [ ] Challenge filter correctly filters the prayer feed
- [ ] All tests pass

---

### Step 4: Share Progress Canvas Image & Button

**Objective:** Add a "Share Progress" button on the challenge detail page that generates a branded 1080×1080 PNG and triggers sharing/download.

**Files to create/modify:**
- `frontend/src/components/challenges/ChallengeShareButton.tsx` — new component (button + canvas generation)
- `frontend/src/lib/challenge-share-canvas.ts` — new utility (canvas drawing logic)
- `frontend/src/components/challenges/__tests__/ChallengeShareButton.test.tsx` — new tests
- `frontend/src/components/challenges/ChallengeDayContent.tsx` — add share button below action callout
- `frontend/src/pages/ChallengeDetail.tsx` — pass additional props to ChallengeDayContent

**Details:**

**4a. Canvas utility** (`lib/challenge-share-canvas.ts`):

```typescript
interface ShareCanvasOptions {
  challengeTitle: string
  themeColor: string
  currentDay: number
  totalDays: number
  streak: number
}

export async function generateChallengeShareImage(options: ShareCanvasOptions): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')!

  // Wait for fonts to be available
  await document.fonts.ready

  // 1. Background gradient (themeColor → darkened shade)
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1080)
  gradient.addColorStop(0, options.themeColor)
  gradient.addColorStop(1, darkenColor(options.themeColor, 0.4))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1080)

  // 2. Challenge title (Caveat ~72px, white, centered, top third)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 72px Caveat, cursive'
  ctx.textAlign = 'center'
  ctx.fillText(options.challengeTitle, 540, 360, 880)

  // 3. "Day X of Y Complete" (Inter ~36px, white, below title)
  ctx.font = '36px Inter, sans-serif'
  ctx.fillText(`Day ${options.currentDay} of ${options.totalDays} Complete`, 540, 440)

  // 4. Progress bar (600px wide, 12px tall, centered)
  const barX = 240, barY = 500, barW = 600, barH = 12
  const pct = options.currentDay / options.totalDays
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  roundedRect(ctx, barX, barY, barW, barH, 6)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  roundedRect(ctx, barX, barY, barW * pct, barH, 6)
  ctx.fill()

  // 5. Streak text (if > 3)
  if (options.streak > 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '24px Inter, sans-serif'
    ctx.fillText(`🔥 ${options.streak} day streak`, 540, 570)
  }

  // 6. Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '28px Caveat, cursive'
  ctx.fillText('Worship Room', 540, 1020)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/png')
  })
}
```

Helper functions: `darkenColor(hex, amount)` — darken hex by amount (0-1). `roundedRect(ctx, x, y, w, h, r)` — draw rounded rect path.

**4b. ChallengeShareButton component**:
- Props: `challengeTitle`, `challengeId`, `themeColor`, `currentDay`, `totalDays`, `streak`
- "Share Progress" primary button + "Copy text" secondary button
- On click:
  1. Generate canvas image via `generateChallengeShareImage()`
  2. If `navigator.share` available + `navigator.canShare({ files: [...] })`: use Web Share API with file
  3. Else: trigger download via `<a>` with `download` attribute and `URL.createObjectURL(blob)`
- "Copy text" button: copy "I'm on Day X of [Title] on Worship Room! Join me: [URL]" to clipboard, show toast "Copied!"
- Guard: only render when `completedDays.length > 0`

**4c. ChallengeDayContent integration**:
- Add new props: `challengeId`, `challengeTitle`, `completedDaysCount`, `streak`
- Render `ChallengeShareButton` below the "Mark Complete" button and "Go to [action]" link, inside the action callout card
- Only show when `isAuthenticated && completedDaysCount > 0`

**Auth gating:**
- Button only renders when authenticated and user has joined (completedDays.length > 0)

**Responsive behavior:**
- Mobile: full-width buttons, stacked ("Share Progress" above "Copy text")
- Desktop: buttons can be inline or stacked (within the max-w-2xl column)

**Guardrails (DO NOT):**
- DO NOT show share button for users who haven't completed any days
- DO NOT show share button for logged-out users
- DO NOT use AI-generated text in the pre-fill (hardcoded only)
- DO NOT forget to await `document.fonts.ready` before Canvas rendering

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders share button when user has completed days | unit | completedDays > 0, verify button renders |
| does not render when no completed days | unit | completedDays = 0, verify no button |
| "Copy text" copies correct text to clipboard | integration | Click copy, verify clipboard content |
| shows "Copied!" toast after clipboard copy | integration | Click copy, verify toast shown |
| canvas generates valid blob | unit | Call generateChallengeShareImage, verify Blob returned |
| uses download fallback when Web Share not available | integration | Mock navigator.share undefined, click share, verify download triggered |
| share button has descriptive aria-label | unit | Verify aria-label includes challenge title |

**Expected state after completion:**
- [ ] "Share Progress" button appears on challenge detail page for joined users with ≥1 completed day
- [ ] Canvas generates a branded 1080×1080 PNG with correct content
- [ ] Sharing works via Web Share API on mobile and download on desktop
- [ ] "Copy text" copies correct text and shows toast
- [ ] All tests pass

---

### Step 5: Milestone Share Prompts

**Objective:** Show celebratory milestone cards at Day 7, 14, 21, and 40 with share image preview and confetti.

**Files to create/modify:**
- `frontend/src/components/challenges/MilestoneCard.tsx` — new component
- `frontend/src/components/challenges/__tests__/MilestoneCard.test.tsx` — new tests
- `frontend/src/hooks/useChallengeProgress.ts` — add `shownMilestones` field support
- `frontend/src/pages/ChallengeDetail.tsx` — integrate milestone display logic

**Details:**

**5a. Update `useChallengeProgress`**:
- When reading progress from localStorage, default `shownMilestones` to `[]` if missing
- Add `markMilestoneShown(challengeId: string, dayNumber: number)` method
- Add `hasMilestoneBeenShown(challengeId: string, dayNumber: number): boolean` method

**5b. Milestone logic** (in `ChallengeDetail.tsx`):

Milestone definitions:
```typescript
const MILESTONES: Record<number, string> = {
  7: 'Week 1 Complete!',
  14: 'Two Weeks Strong!',
  21: 'Three Weeks of Faithfulness!', // or "Halfway There!" for 40-day challenges
  40: 'The Full Journey Complete!',
}
```

For 40-day challenges, Day 21 milestone text = "Halfway There!"

Show milestone when:
1. User just completed the milestone day (it's in `completedDays`)
2. The milestone hasn't been shown before (`!hasMilestoneBeenShown(challengeId, day)`)
3. The day matches applicable milestones for the challenge duration:
   - 7-day: no milestones (Day 7 = completion, handled by Spec 2)
   - 21-day: Day 7, Day 14 (Day 21 = completion)
   - 40-day: Day 7, Day 14, Day 21, Day 40 (Day 40 also triggers completion)

**5c. MilestoneCard component**:
```tsx
<div className="mx-auto max-w-2xl px-4 sm:px-6">
  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 text-center">
    <h2 className="font-script text-3xl sm:text-4xl" style={{ color: themeColor }}>
      {milestoneTitle}
    </h2>
    {/* Pre-generated share image preview */}
    <img src={shareImageUrl} alt="Share preview" className="mx-auto mt-4 max-w-xs rounded-xl shadow-lg" />
    {/* Buttons */}
    <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <button onClick={handleShare} style={{ backgroundColor: themeColor }}
              className="w-full sm:w-auto min-h-[44px] rounded-lg py-3 px-8 font-semibold text-white"
              aria-label={`Share your ${milestoneTitle} milestone for ${challengeTitle}`}>
        Share Your Milestone
      </button>
      <button onClick={handleDismiss}
              className="w-full sm:w-auto min-h-[44px] rounded-lg border border-white/30 py-3 px-6 text-white/80">
        Keep Going
      </button>
    </div>
  </div>
</div>
```

- On mount: generate share image via `generateChallengeShareImage()`, store as `URL.createObjectURL(blob)`
- On mount: fire `toast-confetti` celebration via `showCelebrationToast('', milestoneTitle, 'celebration-confetti')`
- "Share Your Milestone" triggers same share flow as Step 4
- "Keep Going" dismisses the card and calls `markMilestoneShown(challengeId, dayNumber)`
- Respect `prefers-reduced-motion`: skip confetti

**5d. ChallengeDetail.tsx integration**:
- After `handleMarkComplete` succeeds, check if the completed day is a milestone day
- If milestone applicable and not yet shown, set `activeMilestone` state
- Render `MilestoneCard` above `ChallengeDayContent` when `activeMilestone` is set

**Auth gating:**
- Milestone only shows for authenticated, joined users (inherits from challenge detail page)

**Responsive behavior:**
- Mobile: stacked buttons, full-width, image at `max-w-[240px]`
- Tablet: horizontal buttons
- Desktop: `max-w-2xl` centered, image at `max-w-xs`

**Guardrails (DO NOT):**
- DO NOT show milestone for 7-day challenges (completion overlay from Spec 2 handles it)
- DO NOT re-show a milestone that's already been shown (check `shownMilestones`)
- DO NOT fire confetti when `prefers-reduced-motion` is active

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows milestone card at Day 7 for 21-day challenge | integration | Complete Day 7, verify card appears |
| does not show milestone for 7-day challenge | integration | Complete Day 7 on 7-day, verify no milestone card |
| Day 21 shows "Halfway There!" for 40-day challenge | unit | Verify correct title text |
| milestone fires confetti celebration toast | integration | Verify showCelebrationToast called |
| "Keep Going" dismisses card and marks shown | integration | Click dismiss, verify card hidden + shownMilestones updated |
| does not re-show a previously shown milestone | integration | Mark milestone shown, revisit day, verify no card |
| skips confetti with prefers-reduced-motion | integration | Set reduced motion, verify no confetti |
| share button triggers share flow | integration | Click share, verify canvas generation triggered |

**Expected state after completion:**
- [ ] Milestone cards appear at correct days for each challenge duration
- [ ] Confetti fires on milestone display
- [ ] Milestones track `shownMilestones` and don't re-trigger
- [ ] All tests pass

---

### Step 6: Community Activity Feed

**Objective:** Add a mock community activity feed on the challenge detail page showing simulated participant activity.

**Files to create/modify:**
- `frontend/src/components/challenges/CommunityFeed.tsx` — new component
- `frontend/src/data/challenge-community-feed.ts` — mock activity data
- `frontend/src/components/challenges/__tests__/CommunityFeed.test.tsx` — new tests
- `frontend/src/pages/ChallengeDetail.tsx` — render feed below day content

**Details:**

**6a. Mock data** (`data/challenge-community-feed.ts`):
- Pool of ~20 pre-written activity items:
```typescript
interface MockActivityItem {
  name: string
  initials: string
  colorIndex: number  // 0-5 for avatar color palette
  actionTemplate: string  // e.g., "completed Day {day}", "shared a prayer", "hit a {streak}-day challenge streak"
}

const AVATAR_COLORS = ['#6B21A8', '#DC2626', '#059669', '#D97706', '#2563EB', '#DB2777']

const MOCK_ACTIVITY_POOL: MockActivityItem[] = [
  { name: 'Sarah M.', initials: 'SM', colorIndex: 0, actionTemplate: 'completed Day {day}' },
  { name: 'David K.', initials: 'DK', colorIndex: 1, actionTemplate: 'shared a prayer' },
  { name: 'Maria L.', initials: 'ML', colorIndex: 2, actionTemplate: 'hit a 7-day challenge streak' },
  { name: 'James T.', initials: 'JT', colorIndex: 3, actionTemplate: 'joined the challenge' },
  { name: 'Grace P.', initials: 'GP', colorIndex: 4, actionTemplate: 'shared their milestone' },
  // ... 15 more items
]
```

- Selection function: `getActivityItems(dayNumber, challengeDuration, count=6)` uses `(dayNumber * 7 + index) % pool.length`
- Timestamps: deterministic relative times ("2h ago", "just now", "5h ago") based on index
- `{day}` in template replaced with a number near `dayNumber`

**6b. CommunityFeed component**:
```tsx
<section className="border-t border-white/10 py-8 sm:py-10">
  <div className="mb-4 flex items-center gap-2">
    <Users className="h-5 w-5 text-white/60" aria-hidden="true" />
    <h3 className="text-lg font-semibold text-white">Challenge Community</h3>
  </div>
  <ul className="divide-y divide-white/5">
    {items.map((item, i) => (
      <li key={i} className="flex items-center gap-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
             style={{ backgroundColor: AVATAR_COLORS[item.colorIndex] }}>
          {item.initials}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white/90">{item.name}</span>{' '}
          <span className="text-sm text-white/60">{item.action}</span>
        </div>
        <span className="shrink-0 text-xs text-white/40">{item.timestamp}</span>
      </li>
    ))}
  </ul>
  <Link to="/prayer-wall?filter=challenge"
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm text-white/70 hover:bg-white/5">
    <Heart className="h-4 w-4" /> Pray for the community
  </Link>
</section>
```

**6c. ChallengeDetail.tsx integration**:
- Render `CommunityFeed` after `ChallengeDayContent` and before the completion celebration section
- Pass `dayNumber` (selected day or calendar day) and `challengeDuration`
- Visible to all users (logged-in and logged-out)

**Auth gating:**
- None — community feed is visible to all users

**Responsive behavior:**
- All breakpoints: full-width list within `max-w-2xl` column
- Avatar stays 32px, text wraps naturally
- "Pray for the community" button is inline

**Guardrails (DO NOT):**
- DO NOT use competitive framing ("X people are ahead of you")
- DO NOT show real user data (all items are mock)
- DO NOT use random selection — items must be deterministic

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders 5-8 activity items | unit | Verify correct number of items |
| items change based on day number | unit | Day 5 items ≠ Day 6 items |
| items are deterministic (same day = same items) | unit | Call twice with same day, verify identical |
| activity list uses semantic ul/li | unit | Verify DOM structure |
| "Pray for the community" links to prayer wall with filter | unit | Verify Link to `/prayer-wall?filter=challenge` |
| avatar circles have distinct colors | unit | Verify different background colors |

**Expected state after completion:**
- [ ] Community feed renders on challenge detail page with mock activity items
- [ ] Items rotate deterministically by day
- [ ] "Pray for the community" links to Prayer Wall with challenge filter
- [ ] All tests pass

---

### Step 7: Hall of Fame

**Objective:** Add a "Hall of Fame" section on the `/challenges` browser page below past challenges, showing mock completion statistics.

**Files to create/modify:**
- `frontend/src/components/challenges/HallOfFame.tsx` — new component
- `frontend/src/components/challenges/__tests__/HallOfFame.test.tsx` — new tests
- `frontend/src/pages/Challenges.tsx` — render Hall of Fame

**Details:**

Create `HallOfFame.tsx`:
- Accept `challenges` prop (array of past `CategorizedChallenge` entries where `info.status === 'past'`)
- For each past challenge, compute:
  - Completion count: `800 + (challenge.id.length * 53)` (deterministic)
  - Year: `info.endDate.getFullYear()` (most recent season's end year)

```tsx
<section aria-label="Hall of Fame" className="mb-10">
  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-text-dark">
    <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
    Hall of Fame
  </h2>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {pastChallenges.map(({ challenge, info }) => {
      const completionCount = 800 + (challenge.id.length * 53)
      const year = info.endDate.getFullYear()
      return (
        <div key={challenge.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <h3 className="font-semibold text-text-dark">{challenge.title}</h3>
          </div>
          <p className="mt-2 text-sm text-text-light">
            {completionCount.toLocaleString()} people completed this in {year}
          </p>
        </div>
      )
    })}
  </div>
</section>
```

In `Challenges.tsx`, render after the Past section and before the empty state:
```tsx
{/* Hall of Fame */}
{categorized.past.length > 0 && (
  <HallOfFame pastChallenges={categorized.past} />
)}
```

**Auth gating:**
- None — visible to all users

**Responsive behavior:**
- Desktop: 2-column grid within `max-w-4xl`
- Mobile: single column

**Guardrails (DO NOT):**
- DO NOT show challenges that haven't had their first season yet
- DO NOT show challenges that are currently active or upcoming

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders Hall of Fame for past challenges | unit | Past challenges present, verify section renders |
| does not render when no past challenges | unit | Empty array, verify no section |
| shows correct completion count (deterministic) | unit | Known challenge ID, verify count |
| shows correct year from end date | unit | Verify year matches endDate.getFullYear() |
| uses 2-column grid on desktop | unit | Verify grid classes |
| section has accessible heading | unit | Verify h2 with "Hall of Fame" |

**Expected state after completion:**
- [ ] Hall of Fame section renders on `/challenges` page below past challenges
- [ ] Completion counts are deterministic and formatted with commas
- [ ] Section is not rendered when no past challenges exist
- [ ] All tests pass

---

### Step 8: Challenge-to-Feature Deep Links

**Objective:** Make each day's action link pass contextual data to the destination feature for a seamless challenge-to-action transition.

**Files to create/modify:**
- `frontend/src/data/challenge-prefills.ts` — new file with hardcoded pre-fill starters per action type
- `frontend/src/components/challenges/ChallengeDayContent.tsx` — update action link to pass context
- `frontend/src/components/daily/PrayTabContent.tsx` — read challenge context from location.state
- `frontend/src/components/daily/JournalTabContent.tsx` — read challenge context from location.state
- `frontend/src/components/daily/MeditateTabContent.tsx` — read challenge context (highlight specific meditation)
- `frontend/src/pages/PrayerWall.tsx` — read challenge context from URL params
- Test files for deep link context passing

**Details:**

**8a. Pre-fill starters** (`data/challenge-prefills.ts`):
```typescript
export function getPrayerPrefill(dayTitle: string, dayNumber: number): string {
  // Returns a gentle prayer starter based on the day's theme
  // E.g.: "Lord, on this day of [theme], I come before you..."
  // MUST NOT contain crisis keywords
  // MUST follow theological boundaries (encouraging, not authoritative)
  return `Lord, on Day ${dayNumber} of this journey, as I reflect on "${dayTitle}", I pray...`
}

export function getJournalPrompt(dailyAction: string): string {
  return dailyAction  // Use the day's action text as the guided journal prompt
}

export function getMeditationSuggestion(actionType: ChallengeActionType, dayTitle: string): string | null {
  // Map day themes to specific meditation types
  // Prayer-focused → ACTS Prayer Walk
  // Gratitude → Gratitude Reflection
  // Contemplative → Scripture Soaking
  // etc.
  return null // specific meditation sub-page path or null for general tab
}

export function getMusicDestination(dayTitle: string): string {
  // Map day themes to music tabs/scenes
  // Contemplative → /music?tab=sleep
  // Praise → /music?tab=playlists
  // Default → /music
  return '/music'
}
```

**8b. ChallengeDayContent** link update:
- Instead of a simple `<Link to={actionRoute}>`, pass challenge context:
```tsx
<Link
  to={actionRoute}
  state={{
    challengeContext: {
      challengeId,
      dayNumber: day.dayNumber,
      dayTitle: day.title,
      dailyAction: day.dailyAction,
      actionType: day.actionType,
    }
  }}
  // For prayerWall: add ?challengePrayer=true to actionRoute
>
```

For `prayerWall` action type, append `?challengePrayer=true` to the route so InlineComposer can pre-check the challenge checkbox.

For `gratitude` action type, link directly to `/meditate/gratitude` (already handled by `ACTION_TYPE_ROUTES`).

**8c. PrayTabContent** context consumption:
- Read `location.state?.challengeContext`
- If present and `actionType === 'pray'`:
  - Pre-fill textarea with `getPrayerPrefill(dayTitle, dayNumber)`
  - Clear state after reading: `navigate(path, { replace: true, state: null })`
- Existing `prayWallContext` pre-fill continues to work (check challenge context second)

**8d. JournalTabContent** context consumption:
- Read `location.state?.challengeContext`
- If present and `actionType === 'journal'`:
  - Switch to "Guided" mode
  - Set the prompt to `getJournalPrompt(dailyAction)`
  - Clear state after reading

**8e. MeditateTabContent** context consumption:
- Read `location.state?.challengeContext`
- If present and `actionType === 'meditate'`:
  - Highlight/suggest the relevant meditation card (visual emphasis)
  - Clear state after reading

**8f. PrayerWall** context consumption:
- Read `searchParams.get('challengePrayer')` — if `'true'`, InlineComposer pre-checks the challenge checkbox (already handled in Step 3)

**Auth gating:**
- Deep links are visible to all (destination handles its own auth gating)
- Pre-fill is ephemeral — consumed once, not stored

**Responsive behavior:**
- No responsive changes — this is data flow, not layout

**Guardrails (DO NOT):**
- DO NOT use AI-generated pre-fill text (all starters are hardcoded)
- DO NOT include crisis keywords in any pre-fill starter
- DO NOT store challenge context in localStorage (ephemeral only)
- DO NOT break destination pages when no challenge context is provided (graceful degradation)
- DO NOT re-apply context on page refresh (clear state after consumption)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| pray action link passes challenge context in state | integration | Click "Go to Prayer", verify location.state has challengeContext |
| PrayTabContent pre-fills textarea from challenge context | integration | Navigate with context, verify textarea content |
| context is cleared after consumption | integration | After pre-fill, verify state is null |
| page works normally without challenge context | integration | Navigate without context, verify no pre-fill |
| journal action passes daily action as prompt | integration | Navigate with journal context, verify prompt |
| prayerWall action pre-checks challenge checkbox | integration | Navigate with ?challengePrayer=true, verify checkbox checked |
| pre-fill text does not contain crisis keywords | unit | Check all getPrayerPrefill outputs against SELF_HARM_KEYWORDS |
| gratitude links to /meditate/gratitude | unit | Verify actionRoute for gratitude type |

**Expected state after completion:**
- [ ] Each action type's deep link passes contextual data
- [ ] Destination pages consume context and apply pre-fill/suggestions
- [ ] Context is ephemeral — cleared after first read
- [ ] Destination pages work normally without context
- [ ] No pre-fill text contains crisis keywords
- [ ] All tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Landing page challenge banner |
| 2 | — | Daily Hub challenge strip |
| 3 | — | Prayer Wall challenge integration |
| 4 | — | Share progress canvas image & button |
| 5 | 4 | Milestone share prompts (reuses canvas from Step 4) |
| 6 | — | Community activity feed |
| 7 | — | Hall of Fame |
| 8 | 3 | Challenge-to-feature deep links (Step 3 adds challenge checkbox for prayerWall deep link) |

Steps 1, 2, 3, 4, 6, 7 can be implemented in parallel.
Step 5 requires Step 4 (reuses canvas generation).
Step 8 requires Step 3 (prayerWall checkbox pre-check).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Landing Page Challenge Banner | [COMPLETE] | 2026-03-23 | Created `ChallengeBanner.tsx`, integrated into `Home.tsx` between HeroSection and JourneySection. 11 tests passing. Auth modal, dismiss (sessionStorage), switch dialog, navigate all working. |
| 2 | Daily Hub Challenge Strip | [COMPLETE] | 2026-03-23 | Created `ChallengeStrip.tsx`, integrated into `DailyHub.tsx` between VerseOfTheDayBanner and sentinel. Used `text-text-dark` for light bg. 7 tests passing. |
| 3 | Prayer Wall Challenge Integration | [COMPLETE] | 2026-03-23 | Added `challengeId` to PrayerRequest type, challenge checkbox to InlineComposer, challenge filter pill to CategoryFilterBar, challenge badge to PrayerCard, wired challenge filter in PrayerWall.tsx. 10 new tests + 46 total passing. Fixed existing tests needing MemoryRouter. |
| 4 | Share Progress Canvas Image & Button | [COMPLETE] | 2026-03-23 | Created `challenge-share-canvas.ts` utility, `ChallengeShareButton.tsx` component. Integrated into `ChallengeDayContent.tsx` with new props from `ChallengeDetail.tsx`. 7 tests passing. |
| 5 | Milestone Share Prompts | [COMPLETE] | 2026-03-23 | Created `MilestoneCard.tsx`, added `shownMilestones`/`markMilestoneShown`/`hasMilestoneBeenShown` to useChallengeProgress, integrated milestone detection into `ChallengeDetail.tsx` handleMarkComplete. 7 tests passing. |
| 6 | Community Activity Feed | [COMPLETE] | 2026-03-23 | Created `challenge-community-feed.ts` data, `CommunityFeed.tsx` component. Integrated into `ChallengeDetail.tsx`. 6 tests passing. |
| 7 | Hall of Fame | [COMPLETE] | 2026-03-23 | Created `HallOfFame.tsx`, integrated into `Challenges.tsx` after Past section. 6 tests passing. |
| 8 | Challenge-to-Feature Deep Links | [COMPLETE] | 2026-03-23 | Created `challenge-prefills.ts`, updated `ChallengeDayContent.tsx` to pass context via location.state + ?challengePrayer=true for prayerWall. Updated `PrayTabContent.tsx` and `JournalTabContent.tsx` to read challenge context and pre-fill. Skipped MeditateTabContent visual emphasis (gratitude already deep links to /meditate/gratitude). 7 tests passing. |
