# Implementation Plan: Cross-Feature Integration Batch 1

**Spec:** `_specs/cross-feature-integration-batch-1.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/cross-feature-integration-batch-1`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone integration batch)

---

## Architecture Context

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `frontend/src/components/` | Feature-organized components |
| `frontend/src/components/ask/` | AI Bible Chat components (LinkedAnswerText lives here) |
| `frontend/src/components/daily/` | Daily Hub tabs: CrisisBanner, DevotionalTabContent, VerseOfTheDayBanner |
| `frontend/src/components/insights/` | Insights widgets: ActivityCorrelations, GratitudeStreak |
| `frontend/src/components/reading-plans/` | DayContent for reading plan detail |
| `frontend/src/components/local-support/` | LocalSupportPage, VisitButton |
| `frontend/src/components/dashboard/` | MoodCheckIn |
| `frontend/src/components/verse-of-the-day/` | VerseSharePanel |
| `frontend/src/lib/` | Shared utilities (parse-verse-references) |
| `frontend/src/services/` | Storage services (mood, gratitude, badge, local-visit, faith-points) |
| `frontend/src/constants/dashboard/` | Badge definitions, activity points |
| `frontend/src/hooks/` | Custom hooks (useFaithPoints, useAuth, useToast) |
| `frontend/src/types/` | TypeScript interfaces (dashboard.ts) |

### Key Patterns

**Verse linking (existing):** `LinkedAnswerText` at `components/ask/LinkedAnswerText.tsx` parses free text with `parseVerseReferences()` from `lib/parse-verse-references.ts`. Returns `ParsedVerseReference[]` with `bookSlug`, `chapter`, `verseStart`. Links styled `text-primary-lt transition-colors hover:underline`. Link target: `/bible/{bookSlug}/{chapter}#verse-{verseStart}`.

**Crisis banner:** `CrisisBanner` at `components/daily/CrisisBanner.tsx` — `role="alert"`, `aria-live="assertive"`, `bg-warning/10 border border-warning/30`. Hotline links: `font-semibold text-primary underline`. Simple component with no provider wrapping needed for tests.

**Frosted glass card (Insights):** `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`. Used by ActivityCorrelations, GratitudeStreak, CommunityConnections, etc.

**Badge definitions:** Array-based in `constants/dashboard/badges.ts`. Categories: streak, level, activity, community, challenge, special. Celebration tiers: toast, toast-confetti, special-toast, full-screen. Badge engine at `services/badge-engine.ts` checks thresholds in `checkForNewBadges()`.

**Activity counts:** `ActivityCounts` type in `types/dashboard.ts` does NOT include `localVisit`. The `ACTIVITY_TYPE_TO_COUNT_KEY` map in `badge-storage.ts` skips `localVisit` (and `mood`). Badge for local visits must read from `wr_local_visits` via `getUniqueVisitedPlaces()` in `local-visit-storage.ts`.

**Toast system:** `useToast()` from `components/ui/Toast.tsx`. Usage: `showToast('message', 'success')`. Requires `ToastProvider` wrapping.

**Test patterns:**
- `LinkedAnswerText.test.tsx`: wraps in `MemoryRouter`, queries by role/attribute
- `CrisisBanner.test.tsx`: no provider wrapping, queries `[role="alert"]`, uses regex partial matching
- `ActivityCorrelations.test.tsx`: mocks `ResizeObserver`, no provider wrapping
- Vitest + React Testing Library + jsdom

### Insights Page Layout (Insights.tsx lines 255-294)

Components in `space-y-6` vertical stack:
1. CalendarHeatmap
2. MoodTrendChart
3. InsightCards
4. **ActivityCorrelations** ← gratitude correlation card goes AFTER this
5. CommunityConnections
6. **GratitudeStreak** ← already exists, renders when streak ≥ 2
7. ScriptureConnections
8. MeditationHistory
9. Monthly Report link

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click verse link | No auth needed — Bible reader is public | Steps 1-3 | None needed |
| Click counselor CTA | No auth needed — counselors page is public | Step 4 | None needed |
| View gratitude correlation | `/insights` is auth-gated | Step 6 | Existing page-level redirect (Insights.tsx line 170-172) |
| View gratitude streak | `/insights` is auth-gated | Step 6 | Existing page-level redirect |
| "I visited" toast | Visit button only shown when authenticated | Step 7 | Existing `showVisitButton={isAuthenticated}` on LocalSupportPage |
| Earn "Local Support Seeker" badge | Badge system only runs when authenticated | Step 8 | Existing `useFaithPoints` auth guard (line 139) |

No new auth gating needed — all integrations use existing auth checks.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Verse link (default) | color | `text-primary-lt` (#8B5CF6) | design-system.md Color System |
| Verse link hover | color + decoration | `hover:text-primary hover:underline` (#6D28D9) | LinkedAnswerText.tsx line 31 |
| Verse link transition | transition | `transition-colors` | LinkedAnswerText.tsx line 31 |
| Crisis banner bg | background | `bg-warning/10` | CrisisBanner.tsx line 14 |
| Crisis banner border | border | `border-warning/30` | CrisisBanner.tsx line 14 |
| Crisis hotline links | styling | `font-semibold text-primary underline` | CrisisBanner.tsx line 24 |
| Frosted glass card | bg + border | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | design-system.md Dashboard Card Pattern |
| Card padding | padding | `p-4 md:p-6` | design-system.md Dashboard Card Pattern |
| GratitudeStreak icon | color | `text-pink-400` | GratitudeStreak.tsx line 16 |
| Toast success | type | `'success'` | Toast.tsx StandardToastType |

---

## Design System Reminder

- Worship Room uses Caveat (`font-script`) for hero headings and highlighted words, not Lora
- Lora (`font-serif`) is for scripture text and journal prompts (italic)
- Inter (`font-sans`) is the body and heading font
- Dashboard/Insights cards use frosted glass: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Primary color: `#6D28D9` (`text-primary`), Primary Light: `#8B5CF6` (`text-primary-lt`)
- All tabs share `max-w-2xl` container width
- Verse references in devotional use `text-xs font-medium uppercase tracking-widest text-primary-lt`
- Verse references in Verse of the Day banner use `text-xs text-white/40`
- Verse references in reading plan DayContent use `text-xs font-medium uppercase tracking-widest text-white/40`
- Mood check-in verse references use `text-sm text-white/50`
- Landing page verse references use `text-sm not-italic text-white/50` in a `<cite>` element

---

## Shared Data Models (from Master Plan)

Not applicable — standalone integration batch. No new types introduced.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_gratitude_entries` | Read | Cross-reference gratitude dates with mood dates |
| `wr_mood_entries` | Read | Cross-reference mood values with gratitude dates |
| `wr_local_visits` | Read | Count unique visited placeIds for badge check |
| `wr_badges` | Read/Write | Store new `local_support_5` badge |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Verse links: inline text links with inherent touch target from line height. Crisis CTA: stacks in single column. Gratitude card: full-width. Toast: standard bottom position. |
| Tablet | 768px | Same as mobile — all integrations are minor additions to existing layouts |
| Desktop | 1440px | Same — text links, card in vertical stack, toast at standard position |

All four integrations are additions to existing responsive layouts. No new breakpoint-specific behavior.

---

## Vertical Rhythm

Not applicable — no new page sections are introduced. All changes are within existing sections (inline text links, extra list item in banner, new card in existing `space-y-6` stack).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] `parseVerseReferences()` correctly handles all verse formats referenced in the spec (single verses, ranges, numbered books, Psalm/Psalms alias)
- [ ] `getUniqueVisitedPlaces()` in `local-visit-storage.ts` returns accurate unique count
- [ ] `ToastProvider` wraps the local support pages (needed for `useToast()`)
- [ ] All auth-gated actions from the spec are accounted for in the plan (confirmed: none new needed)
- [ ] Design system values are verified (from design-system.md and codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods (none in this plan)
- [ ] Prior specs in the sequence are complete and committed (standalone batch — no dependencies)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Verse link component strategy | Create lightweight `VerseLink` for single known references; keep `LinkedAnswerText` for free-text parsing | 4 of 5 locations display a single known reference string — a `VerseLink` component is simpler and avoids regex overhead. Move `LinkedAnswerText` out of `ask/` into shared location for the remaining free-text case and future reuse. |
| VerseLink vs LinkedAnswerText for mood check-in | Use `VerseLink` with the `verseReference` string | The mood check-in shows a single known reference like "Psalm 34:18" from `MOOD_OPTIONS` — no free-text parsing needed |
| VerseLink link styling | Accept `className` prop for base text color override, apply `hover:text-primary hover:underline transition-colors` always | Locations have different base text colors (primary-lt, white/40, white/50) but need consistent hover behavior |
| Gratitude correlation card placement | After ActivityCorrelations (index 4), before CommunityConnections (index 5) | Logically groups activity-mood correlation data together |
| Badge unique location count source | Read `wr_local_visits` via `getUniqueVisitedPlaces()` — NOT from ActivityCounts | `ActivityCounts` has no `localVisit` counter field. The spec requires unique `placeId` count, which `getUniqueVisitedPlaces().total` provides. |
| Toast trigger location | Inside `handleVisit` callback in `LocalSupportPage.tsx` | The callback already calls `recordActivity('localVisit')` — the toast goes right after. |
| Gratitude correlation minimum threshold | 5 days with BOTH gratitude + mood entries on the same date | Per spec requirement — prevents misleading calculations from sparse data |

---

## Implementation Steps

### Step 1: Create VerseLink Shared Component

**Objective:** Create a lightweight `VerseLink` component for single known verse references and relocate `LinkedAnswerText` to shared location.

**Files to create/modify:**
- `frontend/src/components/shared/VerseLink.tsx` — New single-reference link component
- `frontend/src/components/shared/LinkedAnswerText.tsx` — Relocated from `ask/` for shared use
- `frontend/src/components/ask/LinkedAnswerText.tsx` — Re-export from shared location for backwards compatibility

**Details:**

**VerseLink component** (`components/shared/VerseLink.tsx`):
```tsx
interface VerseLinkProps {
  reference: string       // e.g., "Psalm 34:18", "Proverbs 3:5-6"
  className?: string      // Base text styling (overrides default)
  children?: React.ReactNode  // If provided, renders children instead of reference text
}
```
- Calls `parseVerseReferences(reference)` to extract the first match
- If a match is found, renders a React Router `<Link>` to `/bible/{bookSlug}/{chapter}#verse-{verseStart}`
- If no match (unparseable reference), renders the reference as plain text (graceful fallback)
- Default className: `text-primary-lt` (can be overridden via `className` prop)
- Always applies: `hover:text-primary hover:underline transition-colors`
- Memoize the parse result with `useMemo` to avoid re-parsing on every render

**LinkedAnswerText relocation:**
- Copy `components/ask/LinkedAnswerText.tsx` to `components/shared/LinkedAnswerText.tsx` with identical logic
- Replace `components/ask/LinkedAnswerText.tsx` content with: `export { LinkedAnswerText } from '@/components/shared/LinkedAnswerText'` (re-export for backward compatibility — existing Ask page import is unchanged)

**Auth gating:** None — Bible reader is a public route.

**Responsive behavior:** N/A: no UI impact (component definition only).

**Guardrails (DO NOT):**
- DO NOT modify `parseVerseReferences()` — it already handles all required formats
- DO NOT change the existing `LinkedAnswerText` behavior or styling
- DO NOT add any new dependencies

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders link for valid single verse | unit | `<VerseLink reference="John 3:16" />` renders `<a href="/bible/john/3#verse-16">` |
| renders link for verse range | unit | `<VerseLink reference="Romans 8:28-30" />` links to first verse (`#verse-28`) |
| renders link for numbered book | unit | `<VerseLink reference="1 Corinthians 13:4" />` links to `/bible/1-corinthians/13#verse-4` |
| renders plain text for unparseable reference | unit | `<VerseLink reference="unknown" />` renders as `<span>` |
| applies custom className | unit | `<VerseLink reference="Psalm 34:18" className="text-white/40" />` has `text-white/40` base class |
| always has hover styles | unit | Link element has `hover:text-primary` and `hover:underline` classes |
| LinkedAnswerText re-export works | unit | Importing from `@/components/ask/LinkedAnswerText` still works |

**Expected state after completion:**
- [ ] `VerseLink` component exists at `components/shared/VerseLink.tsx`
- [ ] `LinkedAnswerText` exists at both `components/shared/` and `components/ask/` (re-export)
- [ ] 7 tests pass
- [ ] Existing Ask page tests still pass (LinkedAnswerText unchanged)

---

### Step 2: Apply Verse Linking to DevotionalTabContent and VerseOfTheDayBanner

**Objective:** Make the devotional passage reference and the Verse of the Day banner reference clickable links to the Bible reader.

**Files to modify:**
- `frontend/src/components/daily/DevotionalTabContent.tsx` — Replace plain text reference with `VerseLink`
- `frontend/src/components/daily/VerseOfTheDayBanner.tsx` — Replace plain text reference with `VerseLink`

**Details:**

**DevotionalTabContent** (line 216-218):
Replace:
```tsx
<p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary-lt">
  {devotional.passage.reference}
</p>
```
With:
```tsx
<p className="mb-4 text-xs font-medium uppercase tracking-widest">
  <VerseLink
    reference={devotional.passage.reference}
    className="text-primary-lt"
  />
</p>
```
The `text-primary-lt` base color stays the same. `VerseLink` adds `hover:text-primary hover:underline transition-colors`.

**VerseOfTheDayBanner** (line 19-21):
Replace:
```tsx
<p className="mt-0.5 text-xs text-white/40 sm:mt-0 sm:ml-2 sm:inline">
  — {verse.reference}
</p>
```
With:
```tsx
<p className="mt-0.5 text-xs sm:mt-0 sm:ml-2 sm:inline">
  —{' '}
  <VerseLink
    reference={verse.reference}
    className="text-white/40"
  />
</p>
```
Import `VerseLink` from `@/components/shared/VerseLink`. The `text-white/40` base color is preserved. Hover adds `text-primary underline`.

**Auth gating:** None needed — Bible reader is public.

**Responsive behavior:**
- Desktop (1440px): Inline text links, same visual weight as current text
- Tablet (768px): Same
- Mobile (375px): Same — links inherit line height for touch targets

**Guardrails (DO NOT):**
- DO NOT change any other styling or layout in these components
- DO NOT modify the verse text itself — only the reference
- DO NOT add `<Link>` directly — use the `VerseLink` component for consistency

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| devotional passage reference is a link | integration | Reference text renders as a link with correct href to `/bible/...` |
| devotional link has correct styling | integration | Link has `text-primary-lt` class |
| VOTD banner reference is a link | integration | Reference text renders as a link with correct href |
| VOTD banner link has correct base color | integration | Link has `text-white/40` class |

**Expected state after completion:**
- [ ] Devotional passage reference (e.g., "PROVERBS 3:5-6") is a clickable link
- [ ] Verse of the Day banner reference (e.g., "— Psalm 34:18") is a clickable link
- [ ] Both links navigate to `/bible/:book/:chapter#verse-:verseStart`
- [ ] 4 new tests pass
- [ ] All existing DevotionalTabContent and VerseOfTheDayBanner tests pass

---

### Step 3: Apply Verse Linking to MoodCheckIn, DayContent, and TodaysVerseSection

**Objective:** Make verse references clickable in the mood check-in encouragement, reading plan day content, and landing page Today's Verse section.

**Files to modify:**
- `frontend/src/components/dashboard/MoodCheckIn.tsx` — Replace plain reference with `VerseLink`
- `frontend/src/components/reading-plans/DayContent.tsx` — Replace plain reference with `VerseLink`
- `frontend/src/components/TodaysVerseSection.tsx` — Replace plain reference with `VerseLink`

**Details:**

**MoodCheckIn** (lines 251-258):
Replace:
```tsx
<p
  className={cn(
    'mt-3 text-center font-sans text-sm text-white/50 transition-opacity duration-300',
    verseRevealed ? 'opacity-100' : 'opacity-0'
  )}
>
  {selectedMood.verseReference}
</p>
```
With:
```tsx
<p
  className={cn(
    'mt-3 text-center font-sans text-sm transition-opacity duration-300',
    verseRevealed ? 'opacity-100' : 'opacity-0'
  )}
>
  <VerseLink
    reference={selectedMood.verseReference}
    className="text-white/50"
  />
</p>
```
The fade-in animation via `transition-opacity` is preserved on the parent `<p>`. The `text-white/50` base color moves to `VerseLink`'s className.

**DayContent** (lines 20-22):
Replace:
```tsx
<p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
  {day.passage.reference}
</p>
```
With:
```tsx
<p className="mb-4 text-xs font-medium uppercase tracking-widest">
  <VerseLink
    reference={day.passage.reference}
    className="text-white/40"
  />
</p>
```

**TodaysVerseSection** (lines 27-29):
Replace:
```tsx
<cite className="mt-3 block text-sm not-italic text-white/50">
  — {verse.reference}
</cite>
```
With:
```tsx
<cite className="mt-3 block text-sm not-italic">
  —{' '}
  <VerseLink
    reference={verse.reference}
    className="text-white/50"
  />
</cite>
```

Import `VerseLink` from `@/components/shared/VerseLink` in all three files.

**Auth gating:** None needed.

**Responsive behavior:**
- Desktop (1440px): Inline text links
- Tablet (768px): Same
- Mobile (375px): Same — text links with inherent touch targets from line height

**Guardrails (DO NOT):**
- DO NOT change the MoodCheckIn animation or phase logic — only the reference text rendering
- DO NOT modify DayContent's passage verse rendering — only the reference header
- DO NOT change the TodaysVerseSection layout or share button behavior
- DO NOT remove the `<cite>` element in TodaysVerseSection — it's semantic HTML

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| mood check-in verse reference is a link | integration | After mood selection, verse reference renders as a link |
| reading plan day reference is a link | integration | Passage reference in DayContent is a link to Bible reader |
| landing page verse reference is a link | integration | Today's Verse reference in TodaysVerseSection is a link |
| mood check-in link preserves fade animation | integration | Link parent has `transition-opacity` class |

**Expected state after completion:**
- [ ] Mood check-in encouragement verse reference is a clickable link
- [ ] Reading plan daily scripture reference is a clickable link
- [ ] Landing page Verse of the Day reference is a clickable link
- [ ] All 5 locations from the spec now have linked verse references
- [ ] 4 new tests pass

---

### Step 4: Add Counselor CTA to CrisisBanner

**Objective:** Add a "Find a counselor near you →" link to the CrisisBanner component, linking to `/local-support/counselors`.

**Files to modify:**
- `frontend/src/components/daily/CrisisBanner.tsx` — Add counselor CTA below hotline list

**Details:**

Add below the closing `</ul>` (after line 42, before the closing `</div>`):

```tsx
<div className="mt-3 border-t border-warning/20 pt-3">
  <Link
    to="/local-support/counselors"
    className="text-sm font-semibold text-primary underline"
  >
    Find a counselor near you →
  </Link>
</div>
```

Import `Link` from `react-router-dom` at the top of the file.

The `mt-3 border-t border-warning/20 pt-3` provides visual separation from the hotline list per spec requirement. The border uses `warning/20` (lighter than the container border `warning/30`) for subtlety.

The link styling `font-semibold text-primary underline` matches the existing hotline link pattern (lines 24, 37: `className="font-semibold text-primary underline"`).

**WCAG AA contrast check:** `#6D28D9` (primary) on `warning/10` background (effectively `rgba(243, 156, 18, 0.1)` on white ≈ `#FEF5E0`). The contrast ratio of deep violet on light amber/cream exceeds 4.5:1 for AA compliance.

**Auth gating:** None needed — `/local-support/counselors` is a public route.

**Responsive behavior:**
- Desktop (1440px): Link appears below hotlines with divider, single line
- Tablet (768px): Same
- Mobile (375px): Same — CrisisBanner already stacks vertically in its host layouts

**Guardrails (DO NOT):**
- DO NOT modify the crisis detection logic (`containsCrisisKeyword`)
- DO NOT change the existing hotline resources or their order
- DO NOT change the `role="alert"` or `aria-live="assertive"` attributes
- DO NOT add any conditional display logic — the CTA appears on every CrisisBanner instance

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders counselor CTA link | integration | CrisisBanner shows "Find a counselor near you" when triggered |
| counselor link navigates to /local-support/counselors | integration | Link has `href="/local-support/counselors"` (React Router Link) |
| counselor link has correct styling | integration | Link has `text-primary`, `font-semibold`, `underline` classes |
| counselor CTA has visual separator | integration | A border-top element separates CTA from hotlines |
| existing hotline resources still render | integration | 988, Crisis Text Line, SAMHSA all still present |

**Expected state after completion:**
- [ ] CrisisBanner shows "Find a counselor near you →" below the 3 hotline resources
- [ ] Link navigates to `/local-support/counselors`
- [ ] Visual divider separates counselor CTA from hotline list
- [ ] CTA appears on every CrisisBanner instance (Pray, Journal, Mood, Prayer Wall, Comment)
- [ ] 5 new tests pass
- [ ] All existing CrisisBanner tests pass

---

### Step 5: Create GratitudeCorrelationCard Component

**Objective:** Build a frosted glass card showing real gratitude-mood correlation data, calculated from localStorage.

**Files to create:**
- `frontend/src/components/insights/GratitudeCorrelationCard.tsx` — New component

**Details:**

```tsx
interface GratitudeCorrelationCardProps {
  // No props — reads directly from localStorage services
}
```

**Logic:**
1. Call `getGratitudeEntries()` from `@/services/gratitude-storage` → get all entries with dates
2. Call `getMoodEntries()` from `@/services/mood-storage` → get all entries with dates and mood values
3. Build a date-to-mood map from mood entries (if multiple entries per date, average them)
4. For each gratitude entry date, look up the mood value. Collect all days that have BOTH.
5. If qualifying days < 5, return `null` (do not render)
6. Calculate:
   - `gratitudeDayAvg`: average mood value for days WITH gratitude entries
   - `nonGratitudeDayAvg`: average mood value for days WITHOUT gratitude entries (but that do have mood entries)
   - `qualifyingDayCount`: number of days with both gratitude + mood
7. Determine encouraging text:
   - If `gratitudeDayAvg > nonGratitudeDayAvg`: "Gratitude seems to lift your spirits! Keep counting your blessings."
   - If equal or lower: "Every act of gratitude matters, even when it doesn't feel like it."

**JSX structure:**
```tsx
<section
  aria-label="Gratitude and mood correlation"
  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
>
  <div className="flex items-start gap-3">
    <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" aria-hidden="true" />
    <div>
      <p className="text-sm font-medium text-white">
        On days you practiced gratitude, your mood averaged{' '}
        <span className="font-bold text-pink-400">{gratitudeDayAvg.toFixed(1)}</span>
      </p>
      <p className="mt-1 text-xs text-white/50">
        Based on {qualifyingDayCount} days of data
      </p>
      <p className="mt-2 text-xs text-white/60 italic">
        {encouragingText}
      </p>
    </div>
  </div>
</section>
```

Wrap calculation in `useMemo` to avoid recalculating on every render.

Import `Heart` from `lucide-react`.

**Auth gating:** Not needed — the component lives on `/insights` which is already auth-gated.

**Responsive behavior:**
- Desktop (1440px): Card in vertical stack, same width as other insights cards
- Tablet (768px): Full-width card
- Mobile (375px): Full-width card, text wraps naturally

**Guardrails (DO NOT):**
- DO NOT modify any existing components (ActivityCorrelations, GratitudeStreak)
- DO NOT add new localStorage keys — only read from existing `wr_gratitude_entries` and `wr_mood_entries`
- DO NOT show the card when fewer than 5 qualifying days exist
- DO NOT access mood data privacy fields — this is the user's own data on their own Insights page

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| returns null when fewer than 5 qualifying days | unit | No gratitude entries → renders nothing |
| returns null when exactly 4 qualifying days | unit | 4 overlapping days → renders nothing |
| renders card when 5+ qualifying days exist | unit | 5+ days with both → renders card with Heart icon |
| calculates correct average mood for gratitude days | unit | Mock 5 gratitude days with mood values → verify displayed average |
| shows positive message when gratitude days have higher mood | unit | Gratitude avg > non-gratitude avg → "Gratitude seems to lift your spirits!" |
| shows neutral message when gratitude days have equal/lower mood | unit | Gratitude avg ≤ non-gratitude avg → "Every act of gratitude matters" |
| displays correct qualifying day count | unit | Mock 7 qualifying days → shows "Based on 7 days of data" |
| card uses frosted glass styling | unit | Has `bg-white/5`, `backdrop-blur-sm`, `border-white/10`, `rounded-2xl` classes |

**Expected state after completion:**
- [ ] `GratitudeCorrelationCard` component exists and renders correctly
- [ ] Returns null when < 5 qualifying days
- [ ] Shows real calculated average and encouraging message when ≥ 5 days
- [ ] 8 tests pass

---

### Step 6: Integrate GratitudeCorrelationCard into Insights Page

**Objective:** Add the GratitudeCorrelationCard to the Insights page between ActivityCorrelations and CommunityConnections.

**Files to modify:**
- `frontend/src/pages/Insights.tsx` — Import and render GratitudeCorrelationCard

**Details:**

Import `GratitudeCorrelationCard` from `@/components/insights/GratitudeCorrelationCard`.

Insert after the ActivityCorrelations `AnimatedSection` (after line 271) and before CommunityConnections:

```tsx
<AnimatedSection index={entries.length > 0 ? 4 : 3}>
  <GratitudeCorrelationCard />
</AnimatedSection>
```

Increment all subsequent `AnimatedSection` index values by 1:
- CommunityConnections: `5 : 4` → `6 : 5`  (was `4 : 3`)
- GratitudeStreak: `6 : 5` → `7 : 6` (was `5 : 4`)
- ScriptureConnections: `7 : 6` → `8 : 7` (was `6 : 5`)
- MeditationHistory: `8 : 7` → `9 : 8` (was `7 : 6`)
- Monthly Report link: `9 : 8` → `10 : 9` (was `8 : 7`)

The `GratitudeCorrelationCard` returns null when data is insufficient, so no conditional wrapper is needed — the AnimatedSection will simply render nothing.

**Auth gating:** Existing page-level redirect handles this (Insights.tsx lines 170-172).

**Responsive behavior:**
- Desktop (1440px): Card appears in `space-y-6` vertical stack between ActivityCorrelations and CommunityConnections
- Tablet (768px): Same — full-width card
- Mobile (375px): Same — full-width card

**Guardrails (DO NOT):**
- DO NOT change the existing GratitudeStreak component (it remains in its current position)
- DO NOT modify any other widget's logic or styling
- DO NOT change the time range pills or their behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders GratitudeCorrelationCard in insights layout | integration | Insights page includes the gratitude correlation section |

**Expected state after completion:**
- [ ] GratitudeCorrelationCard appears on `/insights` between ActivityCorrelations and CommunityConnections
- [ ] Card shows/hides based on data availability (5+ qualifying days)
- [ ] GratitudeStreak remains in its existing position (unchanged)
- [ ] AnimatedSection indices are correct for staggered animation
- [ ] 1 new test passes
- [ ] All existing Insights tests pass

---

### Step 7: Add Success Toast to Local Support Visit Recording

**Objective:** Show a "Visit recorded! +10 faith points" success toast after recording a local support visit.

**Files to modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — Add toast after `recordActivity`

**Details:**

In `LocalSupportPageContent` (line 40), add `useToast` import and call:

```tsx
const { showToast } = useToast()
```

Modify `handleVisit` (lines 48-50):
```tsx
const handleVisit = useCallback((_placeId: string, _placeName: string) => {
  recordActivity('localVisit')
  showToast('Visit recorded! +10 faith points', 'success')
}, [recordActivity, showToast])
```

Import `useToast` from `@/components/ui/Toast`.

The `showToast` call goes after `recordActivity` — the toast confirms the action to the user. The `'success'` tier matches spec requirements.

**Auth gating:** `handleVisit` is only called when `showVisitButton={isAuthenticated}` (existing pattern at LocalSupportPage lines 337, 406). No additional auth check needed.

**Responsive behavior:**
- Desktop (1440px): Toast appears at standard toast position
- Tablet (768px): Same
- Mobile (375px): Same — toast system handles responsive positioning

**Guardrails (DO NOT):**
- DO NOT change the `recordActivity` call or its arguments
- DO NOT modify the VisitButton component
- DO NOT add a toast for badge earning — the badge celebration system (CelebrationOverlay) handles that separately
- DO NOT change the toast message — the spec defines it as "Visit recorded! +10 faith points"

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows success toast after recording visit | integration | After handleVisit is called, toast with "Visit recorded! +10 faith points" appears |
| toast uses success tier | integration | `showToast` called with `'success'` type argument |

**Expected state after completion:**
- [ ] Clicking "I visited" on a local support listing shows a success toast
- [ ] Toast message is "Visit recorded! +10 faith points"
- [ ] Toast uses `success` tier
- [ ] 2 new tests pass
- [ ] All existing local support tests pass

---

### Step 8: Add "Local Support Seeker" Badge Definition and Engine Check

**Objective:** Define the "Local Support Seeker" badge and add the unique-location-count check to the badge engine.

**Files to modify:**
- `frontend/src/constants/dashboard/badges.ts` — Add badge definition
- `frontend/src/services/badge-engine.ts` — Add local visit badge check

**Details:**

**Badge definition** (badges.ts, add to `communityBadges` array after line 152):
```typescript
{
  id: 'local_support_5',
  name: 'Local Support Seeker',
  description: "You've visited 5 local support locations. Your faith is lived, not just digital.",
  category: 'community',
  celebrationTier: 'toast-confetti',
},
```

The `toast-confetti` tier is the standard for milestone badges that aren't full-screen (consistent with `friends_10`, `encourage_50`, `journal_50`). Category is `community` to match the badge grid section alongside prayer wall and friends badges.

**Badge engine check** (badge-engine.ts, add after community badges section, around line 108):

```typescript
// 7. Local Support Seeker badge
try {
  const { getUniqueVisitedPlaces } = await import('@/services/local-visit-storage');
  // ... no, this needs to be synchronous
} catch { /* ignore */ }
```

Wait — `checkForNewBadges` is synchronous. Use a direct import instead:

Add import at top of `badge-engine.ts`:
```typescript
import { getUniqueVisitedPlaces } from '@/services/local-visit-storage';
```

Add check after community badges block (after line 108):
```typescript
// 7. Local Support Seeker badge
const LOCAL_SUPPORT_BADGE_ID = 'local_support_5';
if (!earned[LOCAL_SUPPORT_BADGE_ID]) {
  try {
    const { total } = getUniqueVisitedPlaces();
    if (total >= 5) {
      result.push(LOCAL_SUPPORT_BADGE_ID);
    }
  } catch {
    // Malformed localStorage — skip local support badge check
  }
}
```

The `getUniqueVisitedPlaces()` function (in `local-visit-storage.ts` lines 68-90) reads `wr_local_visits`, deduplicates by `placeId`, and returns `{ total, churches, counselors, cr }`. The `total` field is the unique place count.

The badge fires through the normal path: `checkForNewBadges` → `addEarnedBadge` → `CelebrationOverlay` fires via `newlyEarnedBadges` in useFaithPoints state.

**Auth gating:** Badge engine only runs when authenticated (useFaithPoints line 139: `if (!isAuthenticated) return;`).

**Responsive behavior:** N/A: no UI impact (data logic only).

**Guardrails (DO NOT):**
- DO NOT add `localVisit` to the `ActivityCounts` type — the badge uses `wr_local_visits` unique count, not an activity counter
- DO NOT add `localVisit` to `ACTIVITY_TYPE_TO_COUNT_KEY` — it's intentionally excluded
- DO NOT modify the existing badge check flow — only add a new check section
- DO NOT change the celebration overlay or badge grid — the badge appears automatically through the existing system

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| local_support_5 badge exists in BADGE_DEFINITIONS | unit | `BADGE_MAP['local_support_5']` is defined with correct name and category |
| badge has community category | unit | Badge definition has `category: 'community'` |
| badge has toast-confetti tier | unit | Badge definition has `celebrationTier: 'toast-confetti'` |
| checkForNewBadges awards local_support_5 at 5 unique visits | unit | Mock `wr_local_visits` with 5 unique placeIds → badge ID in result |
| checkForNewBadges does not award at 4 unique visits | unit | Mock `wr_local_visits` with 4 unique placeIds → badge ID NOT in result |
| checkForNewBadges does not re-award earned badge | unit | Badge already in `earned` map → not in result |
| badge check handles empty localStorage | unit | No `wr_local_visits` key → no error, badge not awarded |

**Expected state after completion:**
- [ ] `local_support_5` badge definition exists in `BADGE_DEFINITIONS` with MapPin-ready ID
- [ ] Badge engine checks unique visited places from `wr_local_visits`
- [ ] Badge fires when 5th unique location is visited
- [ ] Badge appears in community category of the badge grid
- [ ] CelebrationOverlay fires with toast-confetti when badge is earned
- [ ] 7 new tests pass
- [ ] All existing badge tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create VerseLink component + relocate LinkedAnswerText |
| 2 | 1 | Apply verse linking to DevotionalTabContent + VerseOfTheDayBanner |
| 3 | 1 | Apply verse linking to MoodCheckIn + DayContent + TodaysVerseSection |
| 4 | — | Add counselor CTA to CrisisBanner |
| 5 | — | Create GratitudeCorrelationCard component |
| 6 | 5 | Integrate GratitudeCorrelationCard into Insights page |
| 7 | — | Add success toast to local support visit recording |
| 8 | — | Add "Local Support Seeker" badge definition + engine check |

Steps 1, 4, 5, 7, 8 are independent and can be executed in parallel. Steps 2-3 depend on Step 1. Step 6 depends on Step 5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create VerseLink + relocate LinkedAnswerText | [COMPLETE] | 2026-03-26 | Created `shared/VerseLink.tsx`, relocated `LinkedAnswerText` to `shared/`, re-export from `ask/`. 7 new tests + 6 existing pass. |
| 2 | Verse link: DevotionalTabContent + VerseOfTheDayBanner | [COMPLETE] | 2026-03-26 | Applied VerseLink to devotional passage reference and VOTD banner. 4 new tests pass. |
| 3 | Verse link: MoodCheckIn + DayContent + TodaysVerseSection | [COMPLETE] | 2026-03-26 | Applied VerseLink to MoodCheckIn, DayContent, TodaysVerseSection. Fixed existing MoodCheckIn test to use closest('p') for opacity check. Added MemoryRouter wrapper. 4 new tests + all existing pass. |
| 4 | Crisis banner counselor CTA | [COMPLETE] | 2026-03-26 | Added counselor CTA link with visual separator. Wrapped existing tests in MemoryRouter. 5 new tests + 7 existing pass. |
| 5 | GratitudeCorrelationCard component | [COMPLETE] | 2026-03-26 | Created `insights/GratitudeCorrelationCard.tsx` with frosted glass styling, min 5-day threshold, encouraging messages. 8 tests pass. |
| 6 | Integrate GratitudeCorrelationCard in Insights | [COMPLETE] | 2026-03-26 | Inserted between ActivityCorrelations and CommunityConnections. Updated AnimatedSection indices. Fixed existing section count test (8→9). 1 new test + 13 existing pass. |
| 7 | Local support visit success toast | [COMPLETE] | 2026-03-26 | Added `showToast('Visit recorded! +10 faith points', 'success')` to handleVisit callback. 2 integration tests verify toast wiring. All 62 local support tests pass. |
| 8 | "Local Support Seeker" badge + engine check | [COMPLETE] | 2026-03-26 | Added `local_support_5` badge to communityBadges array. Added section 7 to badge-engine.ts with `getUniqueVisitedPlaces()` check. Updated badge count tests (39→40, community 4→5). 7 new tests + all existing pass. |
