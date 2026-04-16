# Implementation Plan: Warm Empty States

**Spec:** `_specs/warm-empty-states.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/warm-empty-states`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure
- Components: `frontend/src/components/` — organized by feature (`daily/`, `prayer-wall/`, `dashboard/`, `friends/`, `leaderboard/`, `bible/`, `insights/`, `reading-plans/`, `my-prayers/`)
- Pages: `frontend/src/pages/` — route-level components
- Hooks: `frontend/src/hooks/`
- Services: `frontend/src/services/` (localStorage read functions)
- Tests: co-located `__tests__/` directories next to source files

### Existing Empty State Patterns
1. **PrayerListEmptyState** (`components/my-prayers/PrayerListEmptyState.tsx`): Icon + heading + subtitle + CTA button. Uses light-background colors (`text-text-light/30`, `text-text-dark`, `text-text-light`). This is a **light theme** pattern — the spec's new empty states live on **dark backgrounds** and use `text-white/*` classes instead.
2. **FriendList** (`components/friends/FriendList.tsx` line 20-49): CircleNetwork + heading + description + two CTAs. Dark background (`bg-white/5 border-white/10`).
3. **FriendsPreview** (dashboard widget, `components/dashboard/FriendsPreview.tsx` line 63-91): CircleNetwork + text + invite link + "You vs. Yesterday" card.
4. **FriendsLeaderboard** (`components/leaderboard/FriendsLeaderboard.tsx` line 58-92): "You vs. Yesterday" + message + invite link.
5. **MeditationHistory** (`components/insights/MeditationHistory.tsx` line 279-320): Ghosted chart + centered text overlay.
6. **Insights zero-data** (`pages/Insights.tsx` line 246-253): Card with centered text.
7. **PrayerWall filtered empty** (`pages/PrayerWall.tsx` line 461-479): Text + button CTA.
8. **JournalTabContent** (`components/daily/JournalTabContent.tsx`): Only shows empty state when filtering (`savedEntries.length >= 2`). No empty state when 0 saved entries — the section simply doesn't render.
9. **BibleBrowser** (`pages/BibleBrowser.tsx` line 61-66): Highlights section only renders when data exists. No empty state shown.
10. **ChallengeWidget** (`components/dashboard/ChallengeWidget.tsx` line 160-162): Minimal fallback text.
11. **ReadingPlanWidget** (`components/dashboard/ReadingPlanWidget.tsx` line 218-249): Discovery state with suggested plans.
12. **GratitudeWidget** (`components/dashboard/GratitudeWidget.tsx`): Input mode with 3 fields — no first-time helper text.

### Key Design Observations
- All new empty states live on `bg-dashboard-dark` (dark) backgrounds
- Dashboard widgets use frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Empty states within widgets don't get their own card — they render inside the widget card
- Full-page empty states (Insights, Prayer Wall, Friends) have more padding
- The spec asks for **no frosted glass card** wrapping the empty state itself — it sits directly on the dark background

### Auth Gating Pattern
- `useAuth()` returns `{ isAuthenticated, user }` from `@/hooks/useAuth`
- `useAuthModal()` returns `{ openAuthModal }` from `@/components/prayer-wall/AuthModalProvider`
- Protected pages redirect with `<Navigate to="/" replace />` when not authenticated
- Individual actions call `openAuthModal?.('message')` when user is logged out

### Test Patterns
- Tests in co-located `__tests__/` directories
- Provider wrapping: `AuthModalProvider`, `ToastProvider`, `MemoryRouter` from react-router-dom
- Mock localStorage via `vi.spyOn(Storage.prototype, 'getItem')`
- Assert rendered text, button presence, click behavior
- Existing empty state test file: `components/dashboard/__tests__/empty-states.test.tsx`

---

## Auth Gating Checklist

**This spec modifies components within already auth-gated features. No new auth gates are introduced.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Prayer Wall CTA ("Share a prayer request") | Logged-out → auth modal | Step 3 | Existing `isAuthenticated` + `openAuthModal` pattern in PrayerWall.tsx |
| Prayer Wall filtered CTA | Logged-out → auth modal | Step 3 | Same — already implemented at line 469-472 |
| Reading Plans "Create a custom plan" CTA | May trigger auth-gated AI plan flow | Step 7 | Existing auth check in CreatePlanFlow |

All other empty states are on auth-gated pages (dashboard, friends, insights) or have no auth-sensitive CTA (Bible highlights links to public route `/bible/john/1`).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Empty state container | layout | `max-w-sm mx-auto py-12 text-center` | Spec |
| Empty state container (mobile) | padding | `px-6` | Spec |
| Icon (desktop) | size | `h-12 w-12` (48px) | Spec |
| Icon (mobile < 640px) | size | `h-10 w-10` (40px) | Spec |
| Icon | color | `text-white/20` | Spec |
| Icon | a11y | `aria-hidden="true"` | Spec |
| Heading | font | `text-lg font-bold text-white/70` | Spec |
| Description | font | `text-sm text-white/50` | Spec |
| CTA button (primary) | classes | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | Spec + design system |
| CTA button hover | classes | `hover:bg-primary-lt` | Existing pattern (PrayerWall.tsx:475) |
| CTA button focus | classes | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400` | Spec acceptance criteria |
| CTA link | classes | `text-primary-lt hover:underline` | Spec |
| Inline empty text | classes | `text-white/40 italic text-sm` | Spec |
| Dashboard dark bg | token | `bg-dashboard-dark` | Codebase (Insights.tsx:69, Friends.tsx:69) |
| Primary button bg | hex | `#6D28D9` → `bg-primary` | design-system.md |
| Primary hover | hex | `#8B5CF6` → `bg-primary-lt` / `hover:bg-primary-lt` | design-system.md |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Caveat (`font-script`) is for hero headings. Lora (`font-serif`) is scripture-only. Inter (`font-sans`) is body/headings.
- Dashboard/Insights cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- Empty state icons in existing widgets use `h-8 w-8 text-white/30` (smaller than spec's 48px full-page size)
- Empty state text in existing widgets uses `text-sm text-white/50`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Primary: `#6D28D9` / `bg-primary`. Primary Light: `#8B5CF6` / `text-primary-lt`
- All dark pages use `bg-dashboard-dark` class
- 44px minimum touch targets on all interactive elements
- Focus indicators: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400`

---

## Shared Data Models (from Spec)

No new data models or localStorage keys. All empty states are read-only checks on existing data:

**localStorage keys this spec reads (read-only):**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_mood_entries` | Read | Insights empty state check |
| `wr_meditation_history` | Read | Meditation inline empty state |
| `wr_gratitude_entries` | Read | Gratitude helper + correlation empty state |
| `wr_bible_highlights` | Read | Bible highlights empty state |
| `wr_bible_notes` | Read | Bible notes empty state |
| `wr_prayer_list` | Read | Prayer list verification |
| `wr_reading_plan_progress` | Read | Reading plan widget + all-completed check |
| `wr_challenge_progress` | Read | Challenge widget empty state |
| `wr_friends` | Read | Friends list + leaderboard empty states |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Icon scales to 40px (`sm:h-12 sm:w-12` → `h-10 w-10`). Container uses `px-6`. CTAs full-width. |
| Tablet | 640-1024px | Standard `max-w-sm mx-auto py-12` centered. |
| Desktop | > 1024px | Same centered layout. Widget empty states center within card's content area. |

---

## Vertical Rhythm

Vertical rhythm is not a primary concern for this spec — empty states replace existing content within established containers. Each empty state uses `py-12` internal padding. No new sections are added between existing layout blocks.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from recon + codebase inspection)
- [x] No [UNVERIFIED] values — all values come from the spec or existing codebase
- [x] No master plan or recon report needed
- [x] This is a cross-cutting UX improvement modifying existing files, not creating new routes
- [ ] ⚠️ Design system recon may be stale (captured 2026-03-06, before dashboard/growth features). Dashboard widget styling values confirmed via direct codebase inspection instead.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reusable EmptyState component vs inline | Create a shared `FeatureEmptyState` component | 9+ similar empty states with identical layout. DRY and consistent. Spec explicitly defines a shared pattern. |
| Widget vs full-page empty states | Widget empty states use compact padding (`py-6` instead of `py-12`) | Dashboard widgets have constrained height. Full-page empty states get the full `py-12` treatment. |
| Icon responsive sizing | `h-10 w-10 sm:h-12 sm:w-12` | Spec: 48px desktop, 40px mobile. Tailwind responsive prefix handles this. |
| FriendList existing empty state | Replace entirely with spec's pattern | Spec says "Replaces whatever currently renders for an empty friends list." |
| FriendsPreview (dashboard) existing empty state | Update to match spec's warm copy | Existing already says "Faith grows stronger together." Keep CircleNetwork + "You vs. Yesterday" but update text to match spec exactly. |
| FriendsLeaderboard existing empty state | Replace with spec's Trophy icon pattern | Spec overrides the current "You vs. Yesterday" + invite friends pattern. |
| Insights zero-data state | Replace card with spec's icon + heading + CTA | Current state is minimal text in a card. Spec wants a warmer treatment with icon, heading, description, and CTA. |
| ChallengeWidget fallback state | Replace with spec's Flame icon pattern | Current fallback is just a text line. Spec adds icon, heading, description, and optional next-challenge info. |
| ReadingPlanWidget discovery state | Keep existing discovery state, don't replace | The spec's requirement 7 is for when the user has "no active plan" — the widget already handles this with suggested plans. The spec's simpler empty state applies when there's truly nothing to show (no suggestions either). Add as a fallback before the discovery state. |
| Journal empty state placement | Below the textarea + CTA cards area, replacing where saved entries would normally appear | `hasSavedEntries` gate already prevents the section from rendering. Add the empty state as an else branch. |
| Prayer Wall feed-level empty state | Add above the filtered empty state | Current code only shows empty state when `activeCategory` is set. Add a new check for when the entire feed is empty (mock data makes this unlikely in practice, but the state should be handled). |
| Gratitude widget helper | Add above first input field | Small one-time text, not a full empty state block. Conditionally rendered based on `wr_gratitude_entries` length. |

---

## Implementation Steps

### Step 1: Create Shared `FeatureEmptyState` Component

**Objective:** Build a reusable empty state component that encapsulates the spec's shared pattern, used by all 9+ empty states.

**Files to create/modify:**
- `frontend/src/components/ui/FeatureEmptyState.tsx` — new file

**Details:**

```tsx
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface FeatureEmptyStateProps {
  icon: LucideIcon
  heading: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  /** Render below the description, above the CTA */
  children?: React.ReactNode
  /** Use compact padding for dashboard widgets */
  compact?: boolean
  className?: string
}

export function FeatureEmptyState({
  icon: Icon,
  heading,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  children,
  compact = false,
  className,
}: FeatureEmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center px-6 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      <Icon
        className="mb-3 h-10 w-10 text-white/20 sm:h-12 sm:w-12"
        aria-hidden="true"
      />
      <h3 className="text-lg font-bold text-white/70">{heading}</h3>
      <p className="mt-1 text-sm text-white/50">{description}</p>
      {children}
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {ctaLabel} →
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {ctaLabel} →
        </button>
      )}
    </div>
  )
}
```

**Guardrails (DO NOT):**
- DO NOT add frosted glass card wrapping — empty states sit on dark background directly
- DO NOT add animations or transitions (out of scope per spec)
- DO NOT use `dangerouslySetInnerHTML` for any text content
- DO NOT make the icon focusable — `aria-hidden="true"` is mandatory

**Responsive behavior:**
- Desktop (1440px): `max-w-sm mx-auto py-12`, icon at 48px
- Tablet (768px): Same centered layout
- Mobile (375px): Icon at 40px, `px-6` padding, CTA is full-width if `compact` is false

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders icon with aria-hidden | unit | Verify icon has `aria-hidden="true"` |
| renders heading and description | unit | Verify text content |
| renders CTA link when ctaHref provided | unit | Verify Link to correct path |
| renders CTA button when onCtaClick provided | unit | Verify button with click handler |
| does not render CTA when no ctaLabel | unit | Verify no button/link rendered |
| applies compact padding | unit | Verify `py-6` when compact=true |
| CTA has min-height 44px | unit | Verify 44px touch target class |
| CTA has focus-visible ring | unit | Verify focus ring classes |

**Expected state after completion:**
- [ ] `FeatureEmptyState` component exists with all props
- [ ] All tests pass
- [ ] Component is importable from `@/components/ui/FeatureEmptyState`

---

### Step 2: Journal Saved Entries Empty State

**Objective:** Show warm empty state below the journal textarea when the user has zero saved entries.

**Files to create/modify:**
- `frontend/src/components/daily/JournalTabContent.tsx` — add empty state after the saved entries conditional

**Details:**

In `JournalTabContent.tsx`, the saved entries section is gated by `{hasSavedEntries && (` at line 542. Add an else branch below this section (after the closing `)}` at ~line 716) that shows the empty state when `savedEntries.length === 0` and the user is authenticated.

```tsx
{/* Empty state for no saved entries */}
{!hasSavedEntries && isAuthenticated && (
  <FeatureEmptyState
    icon={PenLine}
    heading="Your journal is waiting"
    description="Every thought you write becomes a conversation with God. Start with whatever's on your heart."
    ctaLabel="Write your first entry"
    onCtaClick={() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth' })
      textareaRef.current?.focus()
    }}
  />
)}
```

Add `PenLine` to the lucide-react imports at the top of the file. Verify `textareaRef` exists (the Journal textarea should already have a ref). If not, add one.

**Auth gating:** Only shown when `isAuthenticated` — logged-out users don't see saved entries at all (they get draft auto-save only).

**Responsive behavior:**
- Desktop (1440px): Centered within `max-w-2xl` tab content container
- Tablet (768px): Same
- Mobile (375px): Full width with `px-6` padding, CTA button full-width

**Guardrails (DO NOT):**
- DO NOT show this empty state when the user has entries but is filtering (that's handled by the existing filter empty state at line 657)
- DO NOT change the existing filter empty state
- DO NOT add a card wrapper around the empty state

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows empty state when no saved entries and authenticated | integration | Mock empty savedEntries, verify heading text |
| does not show empty state when entries exist | integration | Mock 1+ entries, verify empty state not rendered |
| does not show empty state when logged out | integration | Mock logged-out, verify not rendered |
| CTA scrolls to and focuses textarea | integration | Click CTA, verify scrollIntoView + focus called |

**Expected state after completion:**
- [ ] Journal tab shows "Your journal is waiting" when 0 saved entries + authenticated
- [ ] CTA focuses the textarea
- [ ] Tests pass

---

### Step 3: Prayer Wall Empty States

**Objective:** Add warm empty states for (a) completely empty feed and (b) filtered empty feed with category name and pre-selected category.

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — modify the empty state sections

**Details:**

**3a. Empty feed (no posts loaded):** Add a new condition above the existing filtered empty state (line 460-479). When `filteredPrayers.length === 0 && !activeCategory`:

```tsx
{filteredPrayers.length === 0 && !activeCategory && (
  <FeatureEmptyState
    icon={Heart}
    heading="This space is for you"
    description="Share what's on your heart, or simply pray for others."
    ctaLabel="Share a prayer request"
    onCtaClick={() => {
      if (isAuthenticated) {
        setComposerOpen(true)
      } else {
        openAuthModal?.('Sign in to share a prayer request')
      }
    }}
  />
)}
```

**3b. Filtered empty (category active, no results):** Replace the existing empty state (lines 461-479) with the spec's pattern. Need to show the category name and pre-select the category in the composer.

```tsx
{filteredPrayers.length === 0 && activeCategory && (
  <FeatureEmptyState
    icon={Search}
    heading={`No prayers in ${getCategoryLabel(activeCategory)} yet`}
    description="Be the first to share."
    ctaLabel="Share a prayer request"
    onCtaClick={() => {
      if (isAuthenticated) {
        setComposerOpen(true)
        // Pre-select the category if composer supports it
      } else {
        openAuthModal?.('Sign in to share a prayer request')
      }
    }}
  />
)}
```

Need to verify how `activeCategory` maps to display names. Check for a `getCategoryLabel` utility or the category config. The existing code at line 463-464 just says "this category" — need to map category ID to display label.

Import `Heart`, `Search` from lucide-react. Import `FeatureEmptyState` from `@/components/ui/FeatureEmptyState`.

**Auth gating:** CTA triggers auth modal for logged-out users (same pattern as existing code at line 469-472).

**Responsive behavior:**
- Desktop (1440px): Centered in the feed area within `max-w-3xl` container
- Tablet (768px): Same
- Mobile (375px): Full width with `px-6`, CTA full-width

**Guardrails (DO NOT):**
- DO NOT remove the existing auth modal check — preserve the logged-out behavior
- DO NOT change the category filter buttons or sidebar
- DO NOT modify mock data or data loading logic

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows feed empty state when no prayers and no filter | integration | Verify "This space is for you" heading |
| shows filtered empty state with category name | integration | Set category filter, verify "No prayers in [Category] yet" |
| CTA triggers auth modal for logged-out users | integration | Click CTA as logged-out, verify openAuthModal called |
| CTA opens composer for logged-in users | integration | Click CTA as logged-in, verify composer opens |

**Expected state after completion:**
- [ ] Empty feed shows Heart icon + warm message + CTA
- [ ] Filtered empty shows Search icon + category name + CTA
- [ ] Auth gating works for both states
- [ ] Tests pass

---

### Step 4: Bible Highlights & Notes Empty State

**Objective:** Show empty state in the My Highlights & Notes section when both highlights and notes are empty.

**Files to create/modify:**
- `frontend/src/pages/BibleBrowser.tsx` — modify the conditional rendering of `HighlightsNotesSection`

**Details:**

Currently (line 61-66):
```tsx
{isAuthenticated && hasAnnotations && (
  <HighlightsNotesSection highlights={highlights} notes={notes} />
)}
```

Replace with:
```tsx
{isAuthenticated && (
  hasAnnotations ? (
    <HighlightsNotesSection highlights={highlights} notes={notes} />
  ) : (
    <FeatureEmptyState
      icon={Highlighter}
      heading="Your Bible is ready to mark up"
      description="Tap any verse while reading to highlight it or add a personal note."
      ctaLabel="Start reading"
      ctaHref="/bible/john/1"
    />
  )
)}
```

Import `Highlighter` from lucide-react. Import `FeatureEmptyState`.

Note: The spec says this should be visible to ALL users (not just authenticated), but the current codebase gates the section on `isAuthenticated`. The spec's auth gating table says "Visible — the highlights section shows for all users." Change the condition to show the empty state regardless of auth (but only show the populated section for authenticated users):

```tsx
{isAuthenticated && hasAnnotations ? (
  <HighlightsNotesSection highlights={highlights} notes={notes} />
) : (
  <FeatureEmptyState
    icon={Highlighter}
    heading="Your Bible is ready to mark up"
    description="Tap any verse while reading to highlight it or add a personal note."
    ctaLabel="Start reading"
    ctaHref="/bible/john/1"
  />
)}
```

**Auth gating:** CTA links to `/bible/john/1` which is a public route — no auth needed.

**Responsive behavior:**
- Desktop (1440px): Centered within `max-w-4xl` Bible content area
- Tablet (768px): Same
- Mobile (375px): Full width with `px-6`

**Guardrails (DO NOT):**
- DO NOT modify `HighlightsNotesSection` component
- DO NOT change the Bible browsing or search functionality
- DO NOT add auth gating to the CTA link (reading is public)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows empty state when no highlights and no notes | integration | Mock empty data, verify heading |
| shows HighlightsNotesSection when data exists | integration | Mock highlights, verify section renders |
| CTA links to /bible/john/1 | unit | Verify Link href |

**Expected state after completion:**
- [ ] Bible browser shows "Your Bible is ready to mark up" when no annotations
- [ ] Shows populated section when annotations exist
- [ ] CTA links to John 1
- [ ] Tests pass

---

### Step 5: Friends List & Leaderboard Empty States

**Objective:** Replace the FriendList empty state with spec's warm pattern, and replace the FriendsLeaderboard empty state with the spec's Trophy pattern.

**Files to create/modify:**
- `frontend/src/components/friends/FriendList.tsx` — replace empty state (lines 20-49)
- `frontend/src/components/leaderboard/FriendsLeaderboard.tsx` — replace empty state (lines 58-92)

**Details:**

**5a. FriendList:** Replace lines 20-49 in `FriendList.tsx`:

```tsx
if (friends.length === 0) {
  return (
    <section aria-label="Friends list">
      <FeatureEmptyState
        icon={Users}
        heading="Faith grows stronger together"
        description="Invite a friend to join your journey, or find people from the Prayer Wall community."
        ctaLabel="Invite a friend"
        onCtaClick={onScrollToInvite}
      />
    </section>
  )
}
```

Import `Users` from lucide-react. Import `FeatureEmptyState`. Remove the `CircleNetwork` import (no longer used in this component).

**5b. FriendsLeaderboard:** Replace lines 58-92 in `FriendsLeaderboard.tsx`:

```tsx
if (friends.length === 0) {
  return (
    <FeatureEmptyState
      icon={Trophy}
      heading="Friendly accountability"
      description="Add friends to see how you encourage each other. No pressure — just love."
      ctaLabel="Find friends"
      onCtaClick={() => {
        // Switch to friends tab
        // Need to call the tab switch function — check how LeaderboardTab exposes this
      }}
    />
  )
}
```

For the "Find friends" CTA that switches to the Friends tab: The `FriendsLeaderboard` component is rendered inside `LeaderboardTab`, which is used in `Friends.tsx`. Need to pass a callback or use `useSearchParams` to switch tabs. Check how `Friends.tsx` handles tab switching — it uses `setSearchParams`. The leaderboard component can accept an `onSwitchToFriends` prop, or use React Router's `useSearchParams` directly.

Import `Trophy` from lucide-react. Import `FeatureEmptyState`.

**Auth gating:** Both are on the auth-gated `/friends` page — no additional auth checks needed.

**Responsive behavior:**
- Desktop (1440px): Centered within `max-w-4xl` friends content area
- Tablet (768px): Same
- Mobile (375px): Full width with `px-6`, CTA full-width

**Guardrails (DO NOT):**
- DO NOT change the friends data model or storage
- DO NOT modify the leaderboard ranking logic
- DO NOT remove the "You vs. Yesterday" card from the FriendsLeaderboard — the spec replaces the whole empty state with just the Trophy pattern
- DO NOT modify FriendsPreview (dashboard widget) — that's handled separately in Step 9

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| FriendList: shows warm empty state when no friends | integration | Verify "Faith grows stronger together" heading |
| FriendList: CTA triggers invite scroll | unit | Click CTA, verify onScrollToInvite called |
| FriendsLeaderboard: shows Trophy empty state when no friends | integration | Verify "Friendly accountability" heading |
| FriendsLeaderboard: CTA switches to friends tab | integration | Click CTA, verify tab switch |

**Expected state after completion:**
- [ ] FriendList shows Users icon + warm message + invite CTA
- [ ] FriendsLeaderboard shows Trophy icon + warm message + "Find friends" CTA
- [ ] Tests pass

---

### Step 6: Insights Empty States

**Objective:** Replace the Insights zero-data state with the spec's warm pattern, and add inline empty states for meditation history and gratitude correlations.

**Files to create/modify:**
- `frontend/src/pages/Insights.tsx` — replace zero-data empty state (lines 246-253)
- `frontend/src/components/insights/MeditationHistory.tsx` — update no-data text (line 316-318)
- `frontend/src/components/insights/GratitudeCorrelationCard.tsx` — add empty state when no data (line 64)

**Details:**

**6a. Main empty state** (`Insights.tsx`): Replace lines 246-253:

```tsx
{entries.length === 0 && (
  <AnimatedSection index={0}>
    <FeatureEmptyState
      icon={BarChart3}
      heading="Your story is just beginning"
      description="Check in with your mood each day, and watch your journey unfold here."
      ctaLabel="Check in now"
      ctaHref="/"
    />
  </AnimatedSection>
)}
```

Also add the `< 2 entries` check from the spec: show the full empty state when entries < 2 (not just 0). Currently the code shows an "insufficient data" banner for 1-6 entries and the empty state for 0. The spec says show the main empty state for `< 2` entries. Adjust:

```tsx
{entries.length < 2 && (
  <AnimatedSection index={0}>
    <FeatureEmptyState
      icon={BarChart3}
      heading="Your story is just beginning"
      description="Check in with your mood each day, and watch your journey unfold here."
      ctaLabel="Check in now"
      ctaHref="/"
    />
  </AnimatedSection>
)}
```

And update the charts condition to `entries.length >= 2` (instead of `> 0`), and adjust the insufficient data banner to start from 2 entries instead of 1:

```tsx
{entries.length >= 2 && entries.length < 7 && (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60 backdrop-blur-sm">
    After 7 days, you&apos;ll see trends emerge
  </div>
)}
```

Import `BarChart3` from lucide-react. Import `FeatureEmptyState`.

**6b. Meditation history inline empty state** (`MeditationHistory.tsx`): Replace the existing overlay text at line 316-318:

```tsx
<p className="text-sm italic text-white/40">
  Meditation trends will appear after your first few sessions.
</p>
```

This replaces "Start a meditation to see your history here" with the spec's warmer, italic text.

**6c. Gratitude correlation inline empty state** (`GratitudeCorrelationCard.tsx`): Currently returns `null` when no data (line 64). Instead, render an inline message:

```tsx
if (!data) {
  return (
    <section
      aria-label="Gratitude and mood correlation"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="flex items-start gap-3">
        <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" aria-hidden="true" />
        <p className="text-sm italic text-white/40">
          Gratitude insights will grow as you count your blessings.
        </p>
      </div>
    </section>
  )
}
```

**Auth gating:** Insights page is already auth-gated (redirects to `/` when not authenticated).

**Responsive behavior:**
- Desktop (1440px): Centered within `max-w-5xl` insights container
- Tablet (768px): Same
- Mobile (375px): Full width with `px-6`

**Guardrails (DO NOT):**
- DO NOT modify chart rendering logic or data fetching
- DO NOT change the time range pills
- DO NOT remove the "insufficient data" banner (7-day threshold)
- DO NOT modify the MeditationHistory ghost chart — only change the overlay text

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows main empty state when 0 entries | integration | Verify "Your story is just beginning" |
| shows main empty state when 1 entry | integration | Verify still shows empty state |
| shows charts when 2+ entries | integration | Verify charts render |
| meditation: shows italic text when no sessions | unit | Verify italic message text |
| gratitude correlation: shows italic text when no data | unit | Verify italic message instead of null |

**Expected state after completion:**
- [ ] Insights shows warm empty state for < 2 entries
- [ ] Meditation history shows italic message when no sessions
- [ ] Gratitude correlation shows italic message when no data
- [ ] Tests pass

---

### Step 7: Reading Plans Empty States (Dashboard Widget + All Completed)

**Objective:** Update the ReadingPlanWidget's no-plan state and add an all-completed state to the Grow page.

**Files to create/modify:**
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx` — add empty state before discovery state
- `frontend/src/pages/ReadingPlans.tsx` (or `ReadingPlansContent`) — add all-completed state

**Details:**

**7a. Dashboard widget:** The `ReadingPlanWidget` already handles an "all completed" state (line 179-191) and a "discovery" state (line 218-249). The spec wants a warm empty state when there's no active plan. The discovery state with suggested plans is actually a good user experience. Per the spec, add the FeatureEmptyState pattern when there are no suggested plans either (empty `suggestedPlans`):

Currently the discovery state always renders suggestions. The widget shows suggestions based on mood or beginner plans. There will almost always be suggestions (10 plans available). The spec's requirement 7 says:

> Reading Plans dashboard widget when the user has no active plan

The existing discovery state already handles this well with mood-based suggestions. However, the spec wants the warm copy: "Start a guided journey" / "Reading plans walk you through Scripture day by day." Update the discovery state heading to match the spec's warm copy while keeping the plan suggestions:

Replace the heading at line 220-222 from "Start a reading plan" to:
```tsx
<p className="text-sm font-semibold text-white">Start a guided journey</p>
<p className="mt-1 text-xs text-white/50">
  Reading plans walk you through Scripture day by day.
</p>
```

Keep the plan suggestion cards and "Browse all plans" link.

**7b. All Completed on Grow page:** In `ReadingPlansContent` (imported from `pages/ReadingPlans.tsx`), check if all plans are completed and show a special state. Need to find where plans are listed and add a check.

Look at how `ReadingPlansContent` renders plans. It likely shows PlanCards. Add above the plan list:

```tsx
{allCompleted && (
  <FeatureEmptyState
    icon={Star}
    heading="You've completed every plan!"
    description="New plans are coming. In the meantime, revisit your favorites or create your own."
    ctaLabel="Create a custom plan"
    onCtaClick={() => {
      // Trigger AI plan creation flow
      if (isAuthenticated) {
        setShowCreateFlow(true)
      } else {
        openAuthModal?.('Sign in to create a custom plan')
      }
    }}
  />
)}
```

Import `Star` from lucide-react. Need to determine `allCompleted` using the same `READING_PLANS` + `getPlanStatus` pattern as in `ReadingPlanWidget`.

**Auth gating:** The "Create a custom plan" CTA on the Grow page should trigger auth modal for logged-out users per spec auth table.

**Responsive behavior:**
- N/A for widget text change (7a)
- Desktop/Tablet/Mobile: Standard `FeatureEmptyState` responsive (7b)

**Guardrails (DO NOT):**
- DO NOT remove the existing plan suggestion cards from the widget
- DO NOT modify the reading plan data or progress tracking
- DO NOT change the CreatePlanFlow component

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| widget shows warm heading when no active plan | unit | Verify "Start a guided journey" text |
| Grow page shows all-completed state when every plan done | integration | Mock all plans completed, verify Star icon + heading |
| Grow page all-completed CTA triggers auth modal when logged out | integration | Click CTA as logged-out, verify auth modal |

**Expected state after completion:**
- [ ] Widget shows warm heading + suggestions
- [ ] Grow page shows "You've completed every plan!" when all done
- [ ] Tests pass

---

### Step 8: Gratitude Widget First-Time Helper

**Objective:** Add a one-time helper sentence above the first input field when the user has never saved a gratitude entry.

**Files to create/modify:**
- `frontend/src/components/dashboard/GratitudeWidget.tsx` — add conditional helper text

**Details:**

In `GratitudeWidget.tsx`, in the input/editing state section (line 133-162), add a helper text above the input fields when the user has no prior gratitude entries:

```tsx
{isFirstTime && (
  <p className="text-sm italic text-white/40">
    Count three blessings from today
  </p>
)}
```

`isFirstTime` is determined by checking `getGratitudeEntries().length === 0`. Import `getGratitudeEntries` from `@/services/gratitude-storage`. Compute this on mount with `useMemo` or `useState`:

```tsx
const [isFirstTime] = useState(() => getGratitudeEntries().length === 0)
```

Place the helper text inside the input state render, before the `<div className="space-y-2">` that contains the three input fields (line 137).

**Auth gating:** Dashboard is auth-gated — no additional checks needed.

**Responsive behavior:** N/A — single line of text that flows naturally.

**Guardrails (DO NOT):**
- DO NOT change the gratitude input fields, placeholders, or save behavior
- DO NOT persist the helper text dismissal in localStorage (it's based on whether any entries exist)
- DO NOT show a full empty state block — this is just a one-line hint

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| shows helper text when no gratitude entries exist | unit | Mock empty entries, verify italic text |
| hides helper text after first save | unit | Mock entries exist, verify no helper |

**Expected state after completion:**
- [ ] Helper text "Count three blessings from today" shows for first-time users
- [ ] Disappears after first gratitude save
- [ ] Tests pass

---

### Step 9: Challenge Widget & Dashboard Friends Coordination

**Objective:** Update the ChallengeWidget fallback state and verify dashboard empty state coordination.

**Files to create/modify:**
- `frontend/src/components/dashboard/ChallengeWidget.tsx` — replace fallback state (line 159-162)
- `frontend/src/components/dashboard/FriendsPreview.tsx` — verify/update empty state text

**Details:**

**9a. ChallengeWidget:** Replace the fallback state at lines 159-162:

```tsx
// Fallback: no challenges at all
return (
  <FeatureEmptyState
    icon={Flame}
    heading="Challenges bring us together"
    description="Seasonal challenges happen throughout the year. The next one is coming soon!"
    compact
  />
)
```

Import `FeatureEmptyState`. The `Flame` icon is already imported.

Note: The spec says if an upcoming challenge exists, show "Next: [Title] starts [relative date]" — this is already handled by State 3 (line 126-156). The fallback only fires when there's truly no next challenge in the data. The compact prop keeps padding small for the widget.

**9b. FriendsPreview:** The existing empty state (line 63-91) already says "Faith grows stronger together" which matches the spec. Verify the copy is exactly right. The spec says:

> "Faith grows stronger together" / "Invite a friend to join your journey, or find people from the Prayer Wall community."

Currently the description is just the one-liner "Faith grows stronger together" without the longer description. The dashboard widget is compact — the spec says to show a "compact version for dashboard widget." Keep the existing FriendsPreview empty state as-is since it already matches the spec's intent (CircleNetwork + "Faith grows stronger together" + invite CTA + "You vs. Yesterday"). No changes needed.

**9c. Dashboard coordination verification:** The spec asks to verify:
- Mood chart ghosted empty state (from `empty-states-polish.md`) — verify present
- Streak card at 0 shows encouraging message — verify present
- Friends preview shows empty state — verified above
- Challenge widget uses updated empty state — done in 9a
- Reading plan widget uses updated heading — done in Step 7

This verification happens in tests.

**Auth gating:** Dashboard is auth-gated.

**Responsive behavior:**
- Desktop (1440px): Compact empty state within frosted glass card
- Mobile (375px): Same compact layout

**Guardrails (DO NOT):**
- DO NOT change FriendsPreview empty state (it already matches)
- DO NOT modify the ChallengeWidget's active or upcoming states (States 1-3)
- DO NOT change any dashboard layout or card structure

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| ChallengeWidget: shows Flame empty state when no challenges | unit | Verify "Challenges bring us together" |
| FriendsPreview: shows "Faith grows stronger together" when no friends | unit | Verify existing text (regression) |
| Dashboard coordination: mood chart ghost state present | integration | Verify ghost chart renders for 0 entries |
| Dashboard coordination: streak at 0 shows encouraging message | integration | Verify streak message |

**Expected state after completion:**
- [ ] Challenge widget shows warm fallback
- [ ] FriendsPreview empty state verified
- [ ] Dashboard coordination tests pass

---

### Step 10: Prayer List Verification

**Objective:** Verify the existing prayer list empty state on `/my-prayers` matches the spec.

**Files to create/modify:**
- `frontend/src/components/my-prayers/PrayerListEmptyState.tsx` — verify, update if needed

**Details:**

The existing `PrayerListEmptyState` (read above) uses:
- `BookHeart` icon (spec says `Heart`)
- "Your prayer list is empty" heading (spec matches)
- "Start tracking what's on your heart" description (spec says "Start tracking what's on your heart" — matches)
- "Add Prayer" CTA button (spec matches)

But the color classes use light-theme tokens (`text-text-light/30`, `text-text-dark`, `text-text-light`). The `/my-prayers` page uses `bg-dashboard-dark` dark theme. These light-theme colors won't look right on a dark background.

**Update needed:** Change the color classes to match the dark-background empty state pattern:
- Icon: `text-text-light/30` → `text-white/20`
- Heading: `text-text-dark` → `text-white/70`
- Description: `text-text-light` → `text-white/50`
- Icon: `BookHeart` → `Heart` (per spec)

Also update to use the same button style with focus ring.

**Auth gating:** `/my-prayers` is already auth-gated.

**Responsive behavior:** N/A — minor color/icon changes.

**Guardrails (DO NOT):**
- DO NOT change the component API (still accepts `onAddPrayer` callback)
- DO NOT restructure the layout (it works fine)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders Heart icon | unit | Verify Heart icon (not BookHeart) |
| uses dark-theme text colors | unit | Verify text-white/70 heading class |
| CTA button has focus ring | unit | Verify focus-visible ring classes |

**Expected state after completion:**
- [ ] Prayer list empty state uses correct dark-theme colors
- [ ] Heart icon instead of BookHeart
- [ ] Tests pass

---

### Step 11: Comprehensive Test Suite

**Objective:** Create a comprehensive test file that tests all empty states together, including accessibility checks.

**Files to create/modify:**
- `frontend/src/components/ui/__tests__/FeatureEmptyState.test.tsx` — unit tests for shared component
- `frontend/src/components/dashboard/__tests__/warm-empty-states.test.tsx` — integration tests for dashboard widgets
- Additional test updates in existing test files as needed

**Details:**

**11a. FeatureEmptyState unit tests** (from Step 1).

**11b. Dashboard warm empty states integration tests:** Test all dashboard widget empty states together:
- MoodChart ghost state (regression)
- StreakCard encouraging message (regression)
- FriendsPreview empty state (regression)
- ChallengeWidget fallback state (new)
- ReadingPlanWidget warm heading (new)
- GratitudeWidget helper text (new)

**11c. Page-level empty states:** Add/update tests in:
- `pages/__tests__/Insights.test.tsx` — Insights zero-data state
- `pages/__tests__/PrayerWall.test.tsx` — Prayer Wall empty feed + filtered
- `pages/__tests__/BibleBrowser.test.tsx` — Bible highlights empty state
- `pages/__tests__/Friends.test.tsx` — Friends + leaderboard empty states
- `components/daily/__tests__/JournalTabContent.test.tsx` — Journal empty state

All tests follow existing patterns: `MemoryRouter` + `AuthModalProvider` + `ToastProvider` wrapping, `vi.spyOn` for localStorage mocks.

**Accessibility tests in each:**
- Icons have `aria-hidden="true"`
- CTAs have accessible names
- Focus indicators present
- Keyboard navigable (Enter/Space activates CTAs)

**Auth gating:** N/A — test infrastructure.

**Responsive behavior:** N/A — tests.

**Guardrails (DO NOT):**
- DO NOT remove any existing passing tests
- DO NOT mock entire components — test at the integration level where possible
- DO NOT skip accessibility assertions

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| All icons have aria-hidden | unit | Query all Lucide icons in empty states, verify aria-hidden |
| All CTAs are keyboard accessible | integration | Focus + Enter key on each CTA |
| All headings match spec text exactly | unit | Assert exact heading strings |
| Dashboard coordination: not a wall of empty states | integration | Render fresh dashboard, verify Getting Started checklist present alongside widget empty states |

**Expected state after completion:**
- [ ] All empty state tests pass
- [ ] Accessibility assertions pass
- [ ] No regressions in existing tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create shared FeatureEmptyState component |
| 2 | 1 | Journal saved entries empty state |
| 3 | 1 | Prayer Wall empty states |
| 4 | 1 | Bible Highlights & Notes empty state |
| 5 | 1 | Friends List & Leaderboard empty states |
| 6 | 1 | Insights empty states |
| 7 | 1 | Reading Plans empty states |
| 8 | — | Gratitude Widget helper text (no FeatureEmptyState dependency) |
| 9 | 1 | Challenge Widget & dashboard coordination |
| 10 | — | Prayer List verification (updates existing component) |
| 11 | 1-10 | Comprehensive test suite |

Steps 2-7, 8, 9, 10 can be executed in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create Shared FeatureEmptyState Component | [COMPLETE] | 2026-03-26 | Created `frontend/src/components/ui/FeatureEmptyState.tsx` + 11 unit tests in `__tests__/FeatureEmptyState.test.tsx` |
| 2 | Journal Saved Entries Empty State | [COMPLETE] | 2026-03-26 | Modified `JournalTabContent.tsx` — added FeatureEmptyState with PenLine icon. Added 4 tests to `JournalTabContent.test.tsx`. |
| 3 | Prayer Wall Empty States | [COMPLETE] | 2026-03-26 | Modified `PrayerWall.tsx` — added feed-level (Heart icon) + filtered (Search icon with CATEGORY_LABELS) empty states using FeatureEmptyState. Added 1 test to `PrayerWall.test.tsx`. |
| 4 | Bible Highlights & Notes Empty State | [COMPLETE] | 2026-03-26 | Modified `BibleBrowser.tsx` — shows FeatureEmptyState with Highlighter icon when no annotations (visible to all users). Added 2 tests. |
| 5 | Friends List & Leaderboard Empty States | [COMPLETE] | 2026-03-26 | Replaced FriendList empty state (Users icon), replaced FriendsLeaderboard empty state (Trophy icon + tab switch CTA). Removed unused youVsYesterday code. Updated 2 test assertions. |
| 6 | Insights Empty States | [COMPLETE] | 2026-03-26 | Updated `Insights.tsx` (BarChart3 icon, entries < 2 threshold), `MeditationHistory.tsx` (italic text), `GratitudeCorrelationCard.tsx` (inline empty state). Updated 5 tests. |
| 7 | Reading Plans Empty States | [COMPLETE] | 2026-03-26 | Updated `ReadingPlanWidget.tsx` heading to "Start a guided journey". Added all-completed FeatureEmptyState with Star icon to `ReadingPlans.tsx`. Updated 1 test. |
| 8 | Gratitude Widget First-Time Helper | [COMPLETE] | 2026-03-26 | Added `isFirstTime` check + italic helper text to `GratitudeWidget.tsx`. Added 2 tests. |
| 9 | Challenge Widget & Dashboard Coordination | [COMPLETE] | 2026-03-26 | Replaced `ChallengeWidget.tsx` fallback with FeatureEmptyState (Flame icon, compact). FriendsPreview verified — already matches spec. |
| 10 | Prayer List Verification | [COMPLETE] | 2026-03-26 | Updated `PrayerListEmptyState.tsx`: BookHeart→Heart, light→dark theme colors, added min-h-[44px] + focus ring. All existing tests pass unchanged. |
| 11 | Comprehensive Test Suite | [COMPLETE] | 2026-03-26 | Created `warm-empty-states.test.tsx` (7 integration tests). Fixed `Friends.test.tsx` assertion. All 4522 tests pass (3 pre-existing PrayCeremony timeouts excluded). |
