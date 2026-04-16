# Implementation Plan: Cross-Feature Integration Batch 3

**Spec:** `_specs/cross-feature-integration-batch-3.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/cross-feature-integration-batch-3`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone integration batch)

---

## Architecture Context

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `frontend/src/pages/Insights.tsx` | Full insights page with AnimatedSection layout, 9 sections in `space-y-6` stack |
| `frontend/src/pages/MonthlyReport.tsx` | Monthly report with AnimatedSection layout, 6 sections |
| `frontend/src/pages/DailyHub.tsx` | Daily Hub with hero VOTD card (lines 232-264) |
| `frontend/src/pages/meditate/ScriptureSoaking.tsx` | Scripture Soaking meditation, random verse selection |
| `frontend/src/components/prayer-wall/InteractionBar.tsx` | Pray/Comment/Bookmark/Share buttons on PrayerCard |
| `frontend/src/components/prayer-wall/PrayerCard.tsx` | Prayer card with `children` prop for injecting content |
| `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` | Dashboard widget grid with DashboardCard instances |
| `frontend/src/components/dashboard/DashboardCard.tsx` | Collapsible frosted glass card widget |
| `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` | VOTD widget content (verse + share panel) |
| `frontend/src/components/insights/GratitudeCorrelationCard.tsx` | Existing correlation card pattern to follow |
| `frontend/src/components/insights/ActivityCorrelations.tsx` | Existing activity correlation section pattern |
| `frontend/src/services/prayer-list-storage.ts` | Prayer list CRUD (`addPrayer`, `getPrayers`, etc.) |
| `frontend/src/hooks/useBibleHighlights.ts` | Bible highlights read/write with `getAllHighlights()` |
| `frontend/src/hooks/useBibleNotes.ts` | Bible notes read/write with `getAllNotes()` |
| `frontend/src/hooks/useMonthlyReportData.ts` | Monthly report data computation hook |
| `frontend/src/constants/bible.ts` | `BIBLE_HIGHLIGHTS_KEY`, `BIBLE_NOTES_KEY` |
| `frontend/src/constants/prayer-categories.ts` | `PRAYER_CATEGORIES`, `PrayerCategory`, `CATEGORY_LABELS` |
| `frontend/src/constants/verse-of-the-day.ts` | `getTodaysVerse()`, `VerseOfTheDay` type |
| `frontend/src/constants/reading-plans.ts` | `READING_PLAN_PROGRESS_KEY` |
| `frontend/src/types/personal-prayer.ts` | `PersonalPrayer` interface |
| `frontend/src/types/bible.ts` | `BibleHighlight`, `BibleNote` interfaces |
| `frontend/src/mocks/daily-experience-mock-data.ts` | `getSoakingVerses()` — 20 verse pool |
| `frontend/src/types/daily-experience.ts` | `DailyVerse` type (`id`, `reference`, `text`, `theme`) |
| `frontend/src/components/ui/Toast.tsx` | Toast system with `showToast(msg, type, action)` |
| `frontend/src/lib/time.ts` | `timeAgo()` relative time utility |

### Key Patterns

**AnimatedSection (Insights & MonthlyReport):** Wraps each section in fade-in with staggered delay. Index controls timing. Sections in `space-y-6` vertical stack.

**Correlation card pattern (GratitudeCorrelationCard):** `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`. Icon (20px, colored) + text content. Returns `null` when insufficient data. Section-level `aria-label`.

**Insights page section layout (Insights.tsx lines 267-297):**
1. InsightCards (index 2/1)
2. ActivityCorrelations (index 3/2)
3. GratitudeCorrelationCard (index 4/3)
4. CommunityConnections (index 5/4)
5. GratitudeStreak (index 6/5)
6. ScriptureConnections (index 7/6)
7. MeditationHistory (index 8/7)
8. Monthly Report link (index 9/8)

**InteractionBar button pattern:** `btnBase` class = `'flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded'`. Color: `text-white/50 hover:text-primary` (default) or `text-primary` (active). Auth gating via `useAuth()` + `useAuthModal()`.

**PrayerCard:** Renders `children` prop after main content — used for CommentsSection injection. Pattern: `<PrayerCard prayer={p}>{children}</PrayerCard>`.

**DashboardCard:** Props: `{ id, title, icon, collapsible, defaultCollapsed, action, children, className, style }`. Collapse state persisted in `wr_dashboard_collapsed`. Frosted glass: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`.

**Dashboard grid order:** Mood(2→1), VOTD(3→2), Devotional(4), ReadingPlan(5), **PrayerList(6)**, Gratitude(7), Streak(1→3), Activity(8), Challenge(9), Friends(10), WeeklyRecap(11), QuickActions(12). New highlights widget goes after PrayerList as order-7, bumping Gratitude to order-8 etc.

**Toast with action pattern:** `showToast('message', 'success', { label: 'View >', onClick: () => navigate('/path') })`. `ToastAction` interface: `{ label: string; onClick: () => void }`.

**Prayer list addPrayer:** `addPrayer({ title, description, category })` returns `PersonalPrayer | null`. Max 200 prayers.

**Bible data access:** `useBibleHighlights()` hook with `getAllHighlights()` and `useBibleNotes()` hook with `getAllNotes()`. Both read from localStorage (`wr_bible_highlights`, `wr_bible_notes`). For the dashboard widget, we need static reads (not hook-based) since the widget is not inside a re-render loop. Create lightweight static reader functions.

**Scripture Soaking verse selection:** `getSoakingVerses()` returns `DailyVerse[]` (20 verses). Each has `reference` string (e.g., "Psalm 46:10"). Random index on mount (line 33-34). `handleTryAnother()` ensures different verse (lines 59-65).

**useMonthlyReportData:** Returns `MonthlyReportData` with `moodTrendPct`, `activityCounts`, `moodEntries`. Activity counts include `mood`, `pray`, `journal`, `meditate`, `listen`, `prayerWall`.

**Test patterns:** Vitest + React Testing Library. Wrap with `MemoryRouter` for routing, `ToastProvider` for toasts, `AuthModalProvider` for auth modals. Mock localStorage for storage tests. Use `vi.mock()` for module mocking.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View Prayer Life section on `/insights` | `/insights` is auth-gated | Step 1 | Existing page-level redirect (Insights.tsx line 171) |
| See Save button on Prayer Wall | Visible to all users | Step 3 | None — button visible to all |
| Click Save button (logged out) | Auth modal: "Sign in to save prayers to your list." | Step 3 | `useAuth()` + `useAuthModal()` |
| Submit save form | Only logged-in users | Step 3 | Can't open form when logged out |
| View Recent Highlights widget | Dashboard is auth-gated | Step 5 | Existing dashboard auth gate |
| See "Meditate on this verse" on dashboard | Dashboard is auth-gated | Step 6 | Existing dashboard auth gate |
| See "Meditate on this verse" on Daily Hub | Visible to all (Daily Hub is public) | Step 6 | None — link visible to all |
| Click meditation link from Daily Hub (logged out) | Existing meditation redirect | Step 7 | Existing route-level redirect |
| View Suggestions section on monthly report | `/insights/monthly` is auth-gated | Step 8 | Existing page-level redirect |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Frosted glass card (Insights) | bg + border + blur | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` | design-system.md Dashboard Card Pattern |
| Frosted glass card (lighter, overlays/suggestions) | bg + border | `bg-white/[0.08] border border-white/10 rounded-xl p-4` | spec |
| Dashboard widget card | bg + border + blur | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6` | design-system.md |
| Section icon | size + color | `h-5 w-5 text-white/60` | ActivityCorrelations.tsx line 59 |
| Section heading | font | `text-base font-semibold text-white md:text-lg` | ActivityCorrelations.tsx line 62 |
| Stat number | font | `text-2xl font-semibold text-white` | spec (large, white, font-semibold) |
| Stat label | font | `text-sm text-white/60` | spec |
| Correlation text | font | `text-sm font-medium text-white` | GratitudeCorrelationCard.tsx line 74 |
| Sample size text | font | `text-xs text-white/50` | GratitudeCorrelationCard.tsx line 79 |
| Text link | color | `text-primary-lt text-sm hover:text-primary transition-colors` | spec + Batch 1/2 pattern |
| InteractionBar button | base class | `btnBase` (see Architecture Context) | InteractionBar.tsx line 18-19 |
| Category pill (active) | bg + text | `bg-primary text-white` | spec implied |
| Category pill (inactive) | bg + text + border | `bg-white/10 text-white/70 border border-white/15` | spec implied |
| Primary button | bg + text + padding | `bg-primary text-white font-semibold py-2.5 px-6 rounded-lg` | design-system.md |
| Text button | style | `text-white/50 hover:text-white/70 text-sm` | existing patterns |
| Empty state icon | size + color | `h-8 w-8 text-white/30` (32px) | spec |
| Empty state text | font | `text-sm text-white/50` | spec |
| Suggestion card | bg + border | `bg-white/[0.08] border border-white/10 rounded-xl p-4` | spec |
| Suggestion icon | size + color | `h-5 w-5 text-white/60` | spec (20px) |
| Primary: `#6D28D9` | Tailwind | `text-primary` / `bg-primary` | design-system.md |
| Primary Light: `#8B5CF6` | Tailwind | `text-primary-lt` | design-system.md |

---

## Design System Reminder

- Worship Room uses Caveat (`font-script`) for hero headings, not Lora
- Lora (`font-serif`) is for scripture text only
- Inter (`font-sans`) is the body and heading font
- Primary: `#6D28D9` (`text-primary`), Primary Light: `#8B5CF6` (`text-primary-lt`)
- Dashboard/Insights cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Lighter frosted cards (overlays, suggestions): `bg-white/[0.08] border border-white/10 rounded-xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Correlation card pattern: icon + text + sample size in `flex items-start gap-3` layout (GratitudeCorrelationCard.tsx)
- InteractionBar buttons use `btnBase` class with `min-h-[44px] min-w-[44px]` touch targets
- `DashboardCard` uses `id` prop for collapse state persistence — must be unique
- Bible highlights have no `text` field — only `book`, `chapter`, `verseNumber`, `color`, `createdAt`
- Bible notes have `text` (the note content), not verse text — verse text must be loaded separately or shown as reference only
- `PersonalPrayer` type has no `sourceType` or `sourceId` fields — these must be added
- `PrayerCard` uses `children` prop pattern for injecting content below the card body

---

## Shared Data Models (from Master Plan)

Not applicable — standalone integration batch.

**Existing types used:**

```typescript
// PersonalPrayer — will be extended with optional sourceType/sourceId
interface PersonalPrayer {
  id: string
  title: string
  description: string
  category: PrayerCategory
  status: 'active' | 'answered'
  createdAt: string
  updatedAt: string
  answeredAt: string | null
  answeredNote: string | null
  lastPrayedAt: string | null
  reminderEnabled?: boolean
  reminderTime?: string
  sourceType?: 'prayer_wall'  // NEW — optional
  sourceId?: string            // NEW — optional
}

// BibleHighlight (no verse text — only position + color)
interface BibleHighlight {
  book: string       // slug e.g., "john"
  chapter: number
  verseNumber: number
  color: string
  createdAt: string
}

// BibleNote (has note text, not verse text)
interface BibleNote {
  id: string
  book: string
  chapter: number
  verseNumber: number
  text: string       // the user's note, not the verse
  createdAt: string
  updatedAt: string
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_list` | Read (Int 1, 2) / Write (Int 2) | Prayer stats for insights + save from Prayer Wall |
| `wr_mood_entries` | Read (Int 1, 5) | Mood correlation with prayer days + monthly trend |
| `wr_bible_highlights` | Read (Int 3) | Recent highlights for dashboard widget |
| `wr_bible_notes` | Read (Int 3) | Recent notes for dashboard widget |
| `wr_dashboard_collapsed` | Read/Write (Int 3) | Collapse state for new highlights widget |
| `wr_meditation_history` | Read (Int 5) | Monthly meditation count for suggestions |
| `wr_gratitude_entries` | Read (Int 5) | Monthly gratitude count for suggestions |
| `wr_reading_plan_progress` | Read (Int 5) | Plan completions for suggestions |
| `wr_daily_activities` | Read (Int 5) | Activity counts for "what worked" suggestion |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Prayer stats stack vertically; interaction buttons icon-only; inline form full-width; widget full-width; suggestion cards full-width |
| Tablet | 768px | Prayer stats side-by-side; interaction buttons with text labels; inline form full-width; widget takes 1 grid column |
| Desktop | 1440px | Same as tablet; all additions sit within existing responsive containers |

All five integrations are additions to existing responsive layouts. No new breakpoint-specific behavior.

---

## Vertical Rhythm

Not applicable — no new page sections are introduced. All changes are within existing page layouts (insights `space-y-6` stack, dashboard widget grid, monthly report `space-y-6` stack, inline Prayer Wall additions).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Batch 1 and Batch 2 (cross-feature-integration-batch-1, batch-2) are committed
- [ ] `GratitudeCorrelationCard` pattern exists at `components/insights/GratitudeCorrelationCard.tsx` (to follow as pattern)
- [ ] `addPrayer()` in `prayer-list-storage.ts` correctly creates entries with UUID and ISO timestamps
- [ ] `getSoakingVerses()` returns `DailyVerse[]` with `reference` strings that can be matched
- [ ] `useMonthlyReportData` returns `moodTrendPct` as a percentage (positive = improved, negative = declined)
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified (from design-system.md and codebase inspection)
- [ ] No [UNVERIFIED] values present — all values sourced from spec, design-system.md, or codebase inspection with file:line citations

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bible highlight widget verse text | Show reference only (e.g., "John 3:16"), not verse text | `BibleHighlight` has no `text` field — verse text would require loading Bible JSON. Showing reference is sufficient for a dashboard widget. For notes, show note text truncated. |
| Bible highlight `book` slug → display name | Use `BIBLE_BOOKS` constant to map slug → display name for reference display | The `book` field stores slugs like "john", need "John" for display |
| Prayer list `sourceType`/`sourceId` fields | Add as optional fields to `PersonalPrayer` type | Backward-compatible — existing prayers won't have these fields. No migration needed. |
| addPrayer signature | Extend existing `addPrayer` input type to accept optional `sourceType`/`sourceId` | Minimal change to existing storage service — just pass through optional fields |
| Monthly report suggestion data sources | Compute in a new `useMonthlyReportSuggestions` hook that takes `MonthlyReportData` as input | Keeps suggestion logic separate from the existing data hook. Pure function — easy to test. |
| Scripture Soaking verse matching | Match by `reference` string equality (case-sensitive, exact match) | VOTD references like "Psalm 46:10" will match soaking pool entries with the same reference. If no match, fall back to random — no user-facing error. |
| Category bar colors | Use a fixed muted color palette for 8 categories | Prayer categories are fixed (9 total including "discussion", but MyPrayers uses 8). Use distinct muted colors. |
| Inline save form expand/collapse | Use CSS `grid-rows-[0fr]` → `grid-rows-[1fr]` transition matching CommentsSection pattern | Consistent with existing Prayer Wall expand/collapse animations |
| "Saved" state tracking | React component state only (session), not persisted | Per spec: "session-only convenience indicator" |
| PrayerCard Save button + form injection | Add Save button to InteractionBar; inject save form via `children` prop or sibling in PrayerCard's parent | InteractionBar renders after card content, save form renders below the interaction bar via children slot |

---

## Implementation Steps

### Step 1: Prayer Life Section for Insights Page

**Objective:** Create a "Prayer Life" section component with stats card, mood correlation card, and category breakdown card. Add it to the Insights page.

**Files to create/modify:**
- `frontend/src/components/insights/PrayerLifeSection.tsx` — New component
- `frontend/src/pages/Insights.tsx` — Import and insert new section

**Details:**

Create `PrayerLifeSection.tsx` following the `GratitudeCorrelationCard` pattern:

```tsx
// Import getPrayers from prayer-list-storage, getMoodEntries from mood-storage
// Import CATEGORY_LABELS from prayer-categories
// Import HandHeart, Heart from lucide-react

// useMemo to compute:
// 1. activeCount, answeredCount, answerRate from getPrayers()
// 2. prayerDayMoodAvg: cross-reference lastPrayedAt dates with mood entries
// 3. categoryBreakdown: count prayers per category, find top 3

// Return null if no prayers exist (0 total)
```

**Stats card** (always shown when ≥1 prayer):
- Three stats in a row: Active, Answered, Answer Rate
- Layout: `flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8`
- Each stat: number (`text-2xl font-semibold text-white`) + label (`text-sm text-white/60`)
- Answer rate format: `"X of Y prayers answered — Z%"`

**Mood correlation card** (only when ≥5 matching data points):
- Match prayer `lastPrayedAt` dates with `wr_mood_entries` dates
- Show average mood on prayer days
- Pattern: `flex items-start gap-3` with `Heart` icon (`text-pink-400`) + text
- Text: "On days you prayed for your prayer list, your mood averaged X.X"
- Sample size: "Based on N days"

**Category breakdown card** (only when ≥3 prayers total):
- Heading: "You pray most about [top category]"
- Horizontal stacked bar: `h-2.5 rounded-full overflow-hidden flex` with colored segments
- Category colors: health=#2DD4BF, family=#8B5CF6, work=#F59E0B, grief=#D97706, gratitude=#34D399, praise=#EC4899, relationships=#6366F1, other=#6B7280, discussion=#A78BFA
- Top 3 categories below bar: `text-xs text-white/50`

**Section wrapper:**
```tsx
<section aria-labelledby="prayer-life-title" className="space-y-4">
  <div className="flex items-center gap-2">
    <HandHeart className="h-5 w-5 text-white/60" aria-hidden="true" />
    <h2 id="prayer-life-title" className="text-base font-semibold text-white md:text-lg">
      Prayer Life
    </h2>
  </div>
  {/* Stats card, correlation card, category card — each in frosted glass */}
</section>
```

Each sub-card uses: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`

**Insert into Insights.tsx** after ScriptureConnections (line 283) and before MeditationHistory (line 285):
```tsx
<AnimatedSection index={entries.length > 0 ? 8 : 7}>
  <PrayerLifeSection />
</AnimatedSection>
```
Bump MeditationHistory index to `9/8` and Monthly Report link to `10/9`.

**Auth gating:** N/A — `/insights` is already auth-gated (line 171).

**Responsive behavior:**
- Desktop (1440px): Stats side-by-side, cards in natural `space-y-4` flow
- Tablet (768px): Same as desktop
- Mobile (375px): Stats stack vertically (`flex-col`), cards full-width

**Guardrails (DO NOT):**
- DO NOT modify existing insights sections or their AnimatedSection indices except to bump the ones after the insertion point
- DO NOT use real AI-generated analysis — all calculations are from localStorage data
- DO NOT show correlation card if fewer than 5 matching data points
- DO NOT show category breakdown if fewer than 3 total prayers

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders nothing when no prayers exist` | unit | Mock empty `wr_prayer_list`, verify null render |
| `renders stats card with correct counts` | unit | Mock 3 active + 2 answered prayers, verify "2 of 5 prayers answered — 40%" |
| `stats are side-by-side on desktop` | unit | Verify flex-row class present |
| `renders mood correlation when 5+ matching days` | unit | Mock prayers with lastPrayedAt + mood entries, verify correlation text |
| `hides mood correlation when fewer than 5 matching days` | unit | Mock 3 matching days, verify correlation card not rendered |
| `renders category breakdown when 3+ prayers` | unit | Mock 5 prayers across categories, verify top category heading |
| `hides category breakdown when fewer than 3 prayers` | unit | Mock 2 prayers, verify breakdown not rendered |
| `category bar shows proportional segments` | unit | Mock prayers, verify each segment has correct flex proportion |
| `Insights page includes Prayer Life section` | integration | Verify "Prayer Life" heading appears on the page |

**Expected state after completion:**
- [ ] Prayer Life section renders on `/insights` after Scripture Connections
- [ ] Stats card shows active/answered/rate counts
- [ ] Mood correlation card shows average mood on prayer days (when sufficient data)
- [ ] Category breakdown card shows top category and stacked bar (when sufficient data)
- [ ] 9 tests pass

---

### Step 2: Extend PersonalPrayer Type with sourceType/sourceId

**Objective:** Add optional `sourceType` and `sourceId` fields to the `PersonalPrayer` type and extend `addPrayer` to accept them.

**Files to modify:**
- `frontend/src/types/personal-prayer.ts` — Add optional fields
- `frontend/src/services/prayer-list-storage.ts` — Extend `addPrayer` input type

**Details:**

In `personal-prayer.ts`, add after `reminderTime?`:
```typescript
sourceType?: 'prayer_wall'
sourceId?: string
```

In `prayer-list-storage.ts`, extend the `addPrayer` input parameter type:
```typescript
export function addPrayer(input: {
  title: string
  description: string
  category: PrayerCategory
  sourceType?: 'prayer_wall'
  sourceId?: string
}): PersonalPrayer | null {
```

And in the body, include the new fields:
```typescript
const prayer: PersonalPrayer = {
  ...existingFields,
  sourceType: input.sourceType,
  sourceId: input.sourceId,
}
```

**Auth gating:** N/A — data types only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the existing `addPrayer` behavior for callers that don't pass sourceType/sourceId
- DO NOT make sourceType/sourceId required — they must remain optional
- DO NOT modify existing stored prayers

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `addPrayer stores sourceType and sourceId when provided` | unit | Call addPrayer with sourceType: 'prayer_wall', verify stored |
| `addPrayer works without sourceType/sourceId` | unit | Call addPrayer without new fields, verify existing behavior unchanged |

**Expected state after completion:**
- [ ] `PersonalPrayer` type includes optional `sourceType` and `sourceId`
- [ ] `addPrayer` accepts and stores new fields
- [ ] Existing callers unaffected
- [ ] 2 tests pass

---

### Step 3: Prayer Wall Save to My Prayers

**Objective:** Add a Save button to Prayer Wall `InteractionBar`, inline save form, and save-to-prayer-list functionality.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Add Save button
- `frontend/src/components/prayer-wall/SaveToPrayersForm.tsx` — New inline save form component
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Pass through save state
- The parent component that renders PrayerCard+InteractionBar (Prayer Wall feed) — wire save form

**Details:**

**Save button in InteractionBar:**

Add a new prop to `InteractionBarProps`:
```typescript
onToggleSave?: () => void
isSaved?: boolean
```

Insert after the Share button div (line 186), before the closing `</div>`:
```tsx
{/* Save button */}
{isSaved ? (
  <span className={cn(btnBase, 'text-white/50 cursor-default')} aria-label="Saved to your prayer list">
    <Check className="h-4 w-4" aria-hidden="true" />
    <span className="hidden sm:inline">Saved</span>
  </span>
) : isAuthenticated ? (
  <button
    type="button"
    onClick={onToggleSave}
    className={cn(btnBase, 'text-white/50 hover:text-primary')}
    aria-label="Save to your prayer list"
  >
    <Plus className="h-4 w-4" aria-hidden="true" />
    <span className="hidden sm:inline">Save</span>
  </button>
) : (
  <button
    type="button"
    onClick={() => authModal?.openAuthModal('Sign in to save prayers to your list.')}
    className={cn(btnBase, 'text-white/50 hover:text-primary')}
    aria-label="Sign in to save to your prayer list"
  >
    <Plus className="h-4 w-4" aria-hidden="true" />
    <span className="hidden sm:inline">Save</span>
  </button>
)}
```

Import `Plus`, `Check` from `lucide-react`.

**SaveToPrayersForm component:**

```tsx
interface SaveToPrayersFormProps {
  prayerContent: string
  prayerCategory?: PrayerCategory
  prayerId: string
  isOpen: boolean
  onSaved: () => void
  onCancel: () => void
}
```

- Title input: pre-filled with first 100 chars of `prayerContent`
- Category pills: 8 pills (exclude 'discussion'). Pre-select matching category or 'other'
- "Save to My Prayers" primary button + "Cancel" text button
- Expand/collapse: CSS grid-rows transition matching comments pattern
- On save: call `addPrayer({ title, description: prayerContent, category, sourceType: 'prayer_wall', sourceId: prayerId })`
- On save success: call `onSaved()`, show toast via `useToast()`: `showToast('Saved to your prayer list', 'success', { label: 'View >', onClick: () => navigate('/my-prayers') })`
- Use `useNavigate()` for the toast action

Form layout:
```tsx
<div className="mt-3 border-t border-white/10 pt-3">
  <div className="grid transition-[grid-template-rows] duration-300 ease-in-out"
       style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
    <div className="overflow-hidden">
      {/* Title input */}
      <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none" />
      {/* Category pills - flex wrap */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRAYER_CATEGORIES.filter(c => c !== 'discussion').map(cat => (
          <button className={cn('rounded-full px-3 py-1.5 text-xs transition-colors', selected ? 'bg-primary text-white' : 'bg-white/10 text-white/70 border border-white/15 hover:bg-white/15')} />
        ))}
      </div>
      {/* Actions */}
      <div className="mt-3 flex items-center gap-3">
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Save to My Prayers</button>
        <button className="text-sm text-white/50 hover:text-white/70" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
</div>
```

**Wiring in PrayerCard parent:** The Prayer Wall feed renders PrayerCard with InteractionBar. Find the component that combines them (likely in PrayerWall page or a feed component). Add local state per card: `saveFormOpen`, `isSaved`. Pass `onToggleSave` and `isSaved` to InteractionBar. Render `SaveToPrayersForm` after InteractionBar.

**Auth gating:**
- Save button visible to all users
- Logged-out click: auth modal with "Sign in to save prayers to your list."
- Logged-in click: toggle inline form

**Responsive behavior:**
- Desktop (1440px): Save button shows icon + "Save" text; form full-width within card
- Tablet (768px): Same as desktop
- Mobile (375px): Save button icon-only (`hidden sm:inline` on text); form full-width

**Guardrails (DO NOT):**
- DO NOT use a modal — must be inline expandable form matching comment expansion pattern
- DO NOT persist "saved" state in localStorage — session-only React state
- DO NOT modify existing InteractionBar props as required — new props are optional
- DO NOT include 'discussion' category in the pill selector

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Save button renders in InteractionBar` | unit | Verify Plus icon button present |
| `Save button shows icon-only text on mobile` | unit | Verify "Save" text has `hidden sm:inline` class |
| `logged-out click triggers auth modal` | unit | Mock logged-out, click Save, verify `openAuthModal` called with subtitle |
| `logged-in click toggles save form` | integration | Click Save, verify form expands |
| `form pre-fills title with first 100 chars` | unit | Render with 200-char prayer, verify input value is first 100 |
| `form pre-selects matching category` | unit | Render with prayer category 'health', verify 'Health' pill selected |
| `form defaults to Other when no matching category` | unit | Render without category, verify 'Other' selected |
| `save creates entry in wr_prayer_list` | integration | Fill form, click Save, verify localStorage entry with sourceType |
| `save shows success toast with View link` | integration | Save, verify toast message and action label |
| `save button changes to Saved checkmark after save` | integration | Save, verify Check icon and "Saved" text |
| `cancel collapses form` | unit | Open form, click Cancel, verify form collapsed |

**Expected state after completion:**
- [ ] Save button visible on all Prayer Wall prayer cards
- [ ] Auth modal appears for logged-out users
- [ ] Inline form expands/collapses smoothly
- [ ] Save creates prayer in `wr_prayer_list` with sourceType/sourceId
- [ ] Toast with "View >" action link shown after save
- [ ] Button changes to "Saved" checkmark after saving
- [ ] 11 tests pass

---

### Step 4: Bible Highlights Storage Readers

**Objective:** Create lightweight static reader functions for Bible highlights and notes that can be used outside React hooks (for dashboard widget).

**Files to create:**
- `frontend/src/services/bible-annotations-storage.ts` — Static read functions for highlights and notes

**Details:**

The existing `useBibleHighlights` and `useBibleNotes` are React hooks — they can't be called conditionally or outside components. The dashboard widget needs a simpler read-only approach.

```typescript
import { BIBLE_HIGHLIGHTS_KEY, BIBLE_NOTES_KEY } from '@/constants/bible'
import type { BibleHighlight, BibleNote } from '@/types/bible'

export function getRecentBibleAnnotations(limit: number = 3): Array<
  | (BibleHighlight & { type: 'highlight' })
  | (BibleNote & { type: 'note' })
> {
  const highlights = readHighlightsStatic().map(h => ({ ...h, type: 'highlight' as const }))
  const notes = readNotesStatic().map(n => ({ ...n, type: 'note' as const }))

  const combined = [...highlights, ...notes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

  return combined
}

function readHighlightsStatic(): BibleHighlight[] {
  try {
    const raw = localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch { return [] }
}

function readNotesStatic(): BibleNote[] {
  try {
    const raw = localStorage.getItem(BIBLE_NOTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch { return [] }
}
```

Also export a helper to get a display reference string:
```typescript
import { BIBLE_BOOKS } from '@/constants/bible'

export function getBookDisplayName(slug: string): string {
  const book = BIBLE_BOOKS.find(b => b.slug === slug)
  return book?.name ?? slug
}

export function formatVerseReference(bookSlug: string, chapter: number, verseNumber: number): string {
  return `${getBookDisplayName(bookSlug)} ${chapter}:${verseNumber}`
}
```

**Auth gating:** N/A — utility functions only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify existing `useBibleHighlights` or `useBibleNotes` hooks
- DO NOT load Bible JSON verse text — only use stored annotation data
- DO NOT duplicate the localStorage reading logic unnecessarily — keep it minimal

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `returns empty array when no data` | unit | Empty localStorage, verify [] |
| `combines and sorts highlights and notes by createdAt` | unit | Mock both, verify sorted descending |
| `limits to requested count` | unit | Mock 5 highlights + 3 notes, request 3, verify 3 returned |
| `formatVerseReference produces correct string` | unit | Input ("john", 3, 16), verify "John 3:16" |
| `getBookDisplayName falls back to slug for unknown books` | unit | Input "unknown-book", verify returns "unknown-book" |

**Expected state after completion:**
- [ ] `getRecentBibleAnnotations()` returns combined, sorted, limited annotations
- [ ] `formatVerseReference()` produces human-readable references
- [ ] 5 tests pass

---

### Step 5: Recent Highlights Dashboard Widget

**Objective:** Create a "Recent Highlights" dashboard widget showing the 3 most recent Bible highlights and notes.

**Files to create/modify:**
- `frontend/src/components/dashboard/RecentHighlightsWidget.tsx` — New widget component
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Add widget to grid

**Details:**

**RecentHighlightsWidget component:**

```tsx
import { Highlighter, StickyNote, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getRecentBibleAnnotations, formatVerseReference } from '@/services/bible-annotations-storage'
import { timeAgo } from '@/lib/time'

export function RecentHighlightsWidget() {
  const items = getRecentBibleAnnotations(3)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <BookOpen className="mb-2 h-8 w-8 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">Start highlighting as you read</p>
        <Link to="/bible" className="mt-2 text-sm text-primary-lt transition-colors hover:text-primary">
          Open Bible &gt;
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const ref = formatVerseReference(item.book, item.chapter, item.verseNumber)
        const link = `/bible/${item.book}/${item.chapter}#verse-${item.verseNumber}`
        return (
          <Link key={`${item.book}-${item.chapter}-${item.verseNumber}-${i}`} to={link}
            className="flex items-start gap-2 rounded-lg p-2 -mx-2 transition-colors hover:bg-white/5">
            {item.type === 'highlight' ? (
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            ) : (
              <StickyNote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white line-clamp-1">
                {item.type === 'note' ? item.text : ref}
              </p>
              <div className="flex items-center gap-2">
                {item.type === 'note' && (
                  <span className="text-sm text-white/60">{ref}</span>
                )}
                <span className="text-xs text-white/40">{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          </Link>
        )
      })}
      <Link to="/bible" className="block text-sm text-primary-lt transition-colors hover:text-primary">
        See all &gt;
      </Link>
    </div>
  )
}
```

**Add to DashboardWidgetGrid.tsx:**

After the PrayerList DashboardCard (line 123), add:
```tsx
<DashboardCard
  id="recent-highlights"
  title="Recent Highlights"
  icon={<Highlighter className="h-5 w-5" />}
  className={cn('order-7 lg:col-span-3', highlightsAnim.className)}
  style={highlightsAnim.style}
>
  <RecentHighlightsWidget />
</DashboardCard>
```

Add `highlightsAnim` via `getAnimProps()` after `prayerListAnim`.
Import `Highlighter` from `lucide-react`.
Import `RecentHighlightsWidget`.
Bump order values of all subsequent widgets: Gratitude → order-8, Activity → order-9, Challenge → order-10, Friends → order-11, WeeklyRecap → order-12, QuickActions → order-13.

**Auth gating:** N/A — dashboard is already auth-gated.

**Responsive behavior:**
- Desktop (1440px): Widget takes `lg:col-span-3` in dashboard grid
- Tablet (768px): Full-width single column
- Mobile (375px): Full-width, items truncated with `line-clamp-1`

**Guardrails (DO NOT):**
- DO NOT load Bible JSON to get verse text — show reference for highlights, note text for notes
- DO NOT modify existing DashboardCard component
- DO NOT change the collapse behavior or storage key prefix

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders empty state when no highlights or notes` | unit | Mock empty data, verify BookOpen icon + "Start highlighting" text + "Open Bible" link |
| `renders 3 most recent items sorted by date` | unit | Mock 5 items, verify 3 shown, most recent first |
| `renders colored dot for highlights` | unit | Mock highlight with color="#2DD4BF", verify colored dot element |
| `renders StickyNote icon for notes` | unit | Mock note item, verify StickyNote icon rendered |
| `click navigates to correct Bible chapter with verse anchor` | unit | Mock item (john, 3, 16), verify link href is `/bible/john/3#verse-16` |
| `"See all" link points to /bible` | unit | Verify link with "See all" text and href `/bible` |
| `shows relative timestamp via timeAgo` | unit | Mock createdAt, verify timeAgo output rendered |
| `DashboardWidgetGrid includes Recent Highlights widget` | integration | Render grid, verify "Recent Highlights" title present |

**Expected state after completion:**
- [ ] "Recent Highlights" widget appears on dashboard after My Prayers widget
- [ ] Shows 3 most recent highlights/notes with colored dots and StickyNote icons
- [ ] Clicking items navigates to Bible reader with verse anchor
- [ ] Empty state with "Start highlighting as you read" and "Open Bible" link
- [ ] Collapsible via DashboardCard pattern
- [ ] 8 tests pass

---

### Step 6: Verse of the Day Meditation Link

**Objective:** Add a "Meditate on this verse >" link to both the dashboard VOTD widget and the Daily Hub hero VOTD card.

**Files to modify:**
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` — Add meditation link
- `frontend/src/pages/DailyHub.tsx` — Add meditation link to hero VOTD card

**Details:**

**VerseOfTheDayCard.tsx:**

After the reference `<p>` (line 17), before the Share button div (line 18), add:
```tsx
<Link
  to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
  className="mt-1 block text-sm text-primary-lt transition-colors hover:text-primary"
>
  Meditate on this verse &gt;
</Link>
```

Import `Link` from `react-router-dom`.

**DailyHub.tsx hero VOTD card:**

The VOTD card is a `<Link>` element wrapping the verse content (lines 235-245). The meditation link needs to be inside the card but separate from the card's link. Refactor: change the card wrapper from `<Link>` to `<div>` and make the verse text itself the link to the Bible. Then add the meditation link below.

Refactor the left card (lines 234-264):
```tsx
<div className="relative rounded-xl border border-white/10 bg-white/[0.08] p-5 text-left backdrop-blur-sm sm:min-h-[140px]">
  <Link
    to={verseLink}
    className="block transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    <p className="pr-6 font-serif italic text-lg text-white/90 line-clamp-3 sm:line-clamp-4">
      &ldquo;{verse.text}&rdquo;
    </p>
    <p className="mt-2 text-sm text-white/50">
      — {verse.reference}
    </p>
  </Link>
  <Link
    to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
    className="mt-1 block text-sm text-primary-lt transition-colors hover:text-primary"
  >
    Meditate on this verse &gt;
  </Link>
  <button ref={shareBtnRef} ...> {/* existing share button */}
  <VerseSharePanel ...> {/* existing share panel */}
</div>
```

Move the share button `absolute` positioning to `absolute bottom-5 right-5` (already there, line 250).

**Auth gating:**
- Dashboard: N/A — dashboard is auth-gated
- Daily Hub: Link visible to all. Clicking navigates to `/meditate/soaking?verse=...` which redirects logged-out users to `/daily?tab=meditate` via existing route-level redirect

**Responsive behavior:**
- Desktop (1440px): Link below reference, above share button
- Tablet (768px): Same
- Mobile (375px): Same — vertical card flow

**Guardrails (DO NOT):**
- DO NOT change existing VOTD verse selection or share behavior
- DO NOT add auth gating to the meditation link itself — existing meditation route handles auth
- DO NOT modify the share panel or share button behavior

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `dashboard VOTD shows meditation link` | unit | Render VerseOfTheDayCard, verify "Meditate on this verse" link present |
| `dashboard meditation link encodes verse reference` | unit | Verify link href contains encoded reference |
| `Daily Hub VOTD shows meditation link` | integration | Render DailyHub, verify meditation link in hero section |
| `meditation link has correct styling` | unit | Verify `text-primary-lt` and `text-sm` classes |

**Expected state after completion:**
- [ ] "Meditate on this verse >" link appears on dashboard VOTD widget
- [ ] "Meditate on this verse >" link appears on Daily Hub hero VOTD card
- [ ] Links navigate to `/meditate/soaking?verse=[encoded reference]`
- [ ] 4 tests pass

---

### Step 7: Scripture Soaking URL Parameter Support

**Objective:** Make the ScriptureSoaking component accept a `?verse` URL parameter and use the matching verse as the initial soaking verse.

**Files to modify:**
- `frontend/src/pages/meditate/ScriptureSoaking.tsx` — Read URL param, match verse

**Details:**

In `ScriptureSoakingContent` (line 29), add URL param reading:

```tsx
import { useSearchParams } from 'react-router-dom'

// Inside ScriptureSoakingContent:
const [searchParams] = useSearchParams()
const verseParam = searchParams.get('verse')

const [verseIndex, setVerseIndex] = useState(() => {
  if (verseParam) {
    const matchIndex = verses.findIndex(v => v.reference === verseParam)
    if (matchIndex !== -1) return matchIndex
  }
  return Math.floor(Math.random() * verses.length)
})
```

Replace the existing `useState` for `verseIndex` (lines 33-35) with the above.

The `handleTryAnother` function (lines 59-65) remains unchanged — it replaces whatever verse is showing with a random one.

**Auth gating:** Existing route-level redirect handles logged-out users (line 24-25).

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change the existing random selection behavior when no `?verse` param is present
- DO NOT show an error when the verse reference doesn't match — silently fall back to random
- DO NOT modify the `handleTryAnother` function
- DO NOT modify the verse pool data

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `uses matching verse when ?verse param matches pool entry` | integration | Render with `?verse=Psalm 46:10` (assuming in pool), verify that verse is displayed |
| `falls back to random when ?verse param does not match` | integration | Render with `?verse=Nonexistent 99:99`, verify a verse still renders |
| `falls back to random when no ?verse param` | integration | Render without param, verify random verse renders |
| `Try Another replaces VOTD-loaded verse` | integration | Load with ?verse param, click "Try another", verify different verse shown |

**Expected state after completion:**
- [ ] ScriptureSoaking reads `?verse` URL parameter
- [ ] Matching verse used as initial verse
- [ ] Non-matching or missing param falls back to random
- [ ] "Try another verse" still works
- [ ] 4 tests pass

---

### Step 8: Monthly Report Suggestions Section

**Objective:** Add a "Suggestions for Next Month" section to the monthly report with data-driven CTA cards.

**Files to create/modify:**
- `frontend/src/hooks/useMonthlyReportSuggestions.ts` — New hook for suggestion logic
- `frontend/src/components/insights/MonthlySuggestions.tsx` — New suggestion cards component
- `frontend/src/pages/MonthlyReport.tsx` — Insert suggestions section

**Details:**

**useMonthlyReportSuggestions hook:**

```typescript
import type { MonthlyReportData } from '@/hooks/useMonthlyReportData'
import { getMeditationMinutesForRange } from '@/services/meditation-storage'
import { getGratitudeEntries } from '@/services/gratitude-storage'
import { getLocalDateString } from '@/utils/date'
import type { LucideIcon } from 'lucide-react'

export interface MonthSuggestion {
  id: string
  text: string
  icon: 'Heart' | 'Brain' | 'PenLine' | 'Sparkles' | 'BookOpen' | 'TrendingUp'
  ctas: Array<{ text: string; link: string }>
  topActivities?: Array<{ name: string; count: number }>
}

export function useMonthlyReportSuggestions(data: MonthlyReportData): MonthSuggestion[] {
  // Compute date range for the selected month
  const firstDay = new Date(data.year, data.month, 1)
  const lastDay = new Date(data.year, data.month + 1, 0)
  const firstDayStr = getLocalDateString(firstDay)
  const lastDayStr = getLocalDateString(lastDay)

  const suggestions: MonthSuggestion[] = []

  // Priority 1: Mood declined
  if (data.moodTrendPct < 0) {
    suggestions.push({
      id: 'mood-decline',
      text: "This month was tough. You're not alone.",
      icon: 'Heart',
      ctas: [
        { text: 'Talk to God about it >', link: '/daily?tab=pray' },
        { text: 'Find a counselor >', link: '/local-support/counselors' },
      ],
    })
  }

  // Priority 2: Low meditation (< 4 times)
  if (suggestions.length < 3) {
    const meditationSessions = getMeditationMinutesForRange(firstDayStr, lastDayStr)
    if (meditationSessions.length < 4) {
      suggestions.push({
        id: 'low-meditation',
        text: 'Try meditating more — even 2 minutes helps',
        icon: 'Brain',
        ctas: [{ text: 'Start a meditation >', link: '/daily?tab=meditate' }],
      })
    }
  }

  // Priority 3: Low journaling (< 4 times)
  if (suggestions.length < 3 && (data.activityCounts.journal ?? 0) < 4) {
    suggestions.push({
      id: 'low-journaling',
      text: 'Writing helps process emotions — try journaling this week',
      icon: 'PenLine',
      ctas: [{ text: 'Open journal >', link: '/daily?tab=journal' }],
    })
  }

  // Priority 4: No gratitude entries
  if (suggestions.length < 3) {
    const gratitudeEntries = getGratitudeEntries()
    const monthGratitude = gratitudeEntries.filter(e => e.date >= firstDayStr && e.date <= lastDayStr)
    if (monthGratitude.length === 0) {
      suggestions.push({
        id: 'no-gratitude',
        text: "Try gratitude — it's linked to better mood",
        icon: 'Sparkles',
        ctas: [{ text: 'Start today >', link: '/#gratitude' }],
      })
    }
  }

  // Priority 5: Completed a reading plan (check wr_reading_plan_progress)
  if (suggestions.length < 3) {
    try {
      const raw = localStorage.getItem('wr_reading_plan_progress')
      if (raw) {
        const progress = JSON.parse(raw) as Record<string, { completedAt?: string }>
        const completedThisMonth = Object.entries(progress).find(([, p]) => {
          if (!p.completedAt) return false
          return p.completedAt >= firstDayStr && p.completedAt <= lastDayStr
        })
        if (completedThisMonth) {
          suggestions.push({
            id: 'plan-completed',
            text: 'You finished a reading plan! Ready for another?',
            icon: 'BookOpen',
            ctas: [{ text: 'Browse plans >', link: '/grow?tab=plans' }],
          })
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Priority 6: Mood improved
  if (suggestions.length < 3 && data.moodTrendPct > 0) {
    const activityEntries = Object.entries(data.activityCounts)
      .filter(([key]) => key !== 'mood')
      .map(([key, count]) => ({
        name: key === 'pray' ? 'Prayer' : key === 'journal' ? 'Journaling' : key === 'meditate' ? 'Meditation' : key === 'listen' ? 'Listening' : key === 'prayerWall' ? 'Prayer Wall' : key,
        count,
      }))
      .filter(a => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    suggestions.push({
      id: 'mood-improved',
      text: 'Your mood improved this month! Here\'s what worked:',
      icon: 'TrendingUp',
      ctas: [],
      topActivities: activityEntries,
    })
  }

  return suggestions.slice(0, 3)
}
```

**MonthlySuggestions component:**

```tsx
import { Lightbulb, Heart, Brain, PenLine, Sparkles, BookOpen, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MonthSuggestion } from '@/hooks/useMonthlyReportSuggestions'

const ICON_MAP = { Heart, Brain, PenLine, Sparkles, BookOpen, TrendingUp }

interface MonthlySuggestionsProps {
  suggestions: MonthSuggestion[]
}

export function MonthlySuggestions({ suggestions }: MonthlySuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <section aria-labelledby="suggestions-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2 id="suggestions-title" className="text-base font-semibold text-white md:text-lg">
          Suggestions for Next Month
        </h2>
      </div>
      <div className="space-y-3">
        {suggestions.map(s => {
          const Icon = ICON_MAP[s.icon]
          return (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.08] p-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/60" aria-hidden="true" />
                <div>
                  <p className="text-sm text-white">{s.text}</p>
                  {s.topActivities && s.topActivities.length > 0 && (
                    <p className="mt-1 text-xs text-white/50">
                      {s.topActivities.map(a => `${a.name} (${a.count} times)`).join(', ')}
                    </p>
                  )}
                  {s.ctas.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {s.ctas.map(cta => (
                        <Link key={cta.link} to={cta.link}
                          className="block text-sm text-primary-lt transition-colors hover:text-primary">
                          {cta.text}
                        </Link>
                      ))}
                    </div>
                  )}
                  {s.id === 'mood-improved' && s.ctas.length === 0 && (
                    <p className="mt-2 text-sm text-primary-lt">Keep it up!</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

**Insert into MonthlyReport.tsx:**

After `MonthlyInsightCards` (line 179) and before `MonthlyShareButton` (line 181), add:

```tsx
{suggestions.length > 0 && (
  <AnimatedSection index={5}>
    <MonthlySuggestions suggestions={suggestions} />
  </AnimatedSection>
)}
```

Bump `MonthlyShareButton` AnimatedSection index to 6.

Compute suggestions in the component:
```tsx
import { useMonthlyReportSuggestions } from '@/hooks/useMonthlyReportSuggestions'
// Inside MonthlyReport():
const suggestions = useMonthlyReportSuggestions(data)
```

**Auth gating:** N/A — `/insights/monthly` is already auth-gated.

**Responsive behavior:**
- Desktop (1440px): Suggestion cards stack vertically in `space-y-3`
- Tablet (768px): Same
- Mobile (375px): Same — full-width cards

**Guardrails (DO NOT):**
- DO NOT use AI-generated suggestions — all logic is rule-based from activity counts and mood trend
- DO NOT show more than 3 suggestions
- DO NOT modify existing monthly report sections
- DO NOT show the section when no suggestions apply
- DO NOT change the mood decline suggestion — it's the highest priority and connects struggling users to prayer and professional support

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `returns mood decline suggestion when moodTrendPct < 0` | unit | Mock data with moodTrendPct: -5, verify first suggestion is mood-decline with two CTAs |
| `returns low meditation suggestion when < 4 sessions` | unit | Mock 2 meditation sessions, verify suggestion text |
| `returns low journaling suggestion when < 4 times` | unit | Mock journal count 2, verify suggestion |
| `returns no gratitude suggestion when 0 entries in month` | unit | Mock empty gratitude, verify suggestion |
| `returns reading plan completion suggestion` | unit | Mock completed plan in month, verify suggestion |
| `returns mood improved suggestion with top activities` | unit | Mock positive moodTrendPct + activity counts, verify top 3 activities listed |
| `mood decline always takes first slot` | unit | Mock decline + all other conditions, verify first suggestion is mood-decline |
| `limits to 3 suggestions maximum` | unit | Mock all conditions true, verify exactly 3 returned |
| `returns empty array when no conditions match` | unit | Mock stable mood, all activities >4, gratitude present, no plan completion, verify [] |
| `MonthlySuggestions renders nothing when no suggestions` | unit | Pass empty array, verify null render |
| `MonthlySuggestions renders suggestion cards with icons and CTAs` | unit | Pass 2 suggestions, verify cards rendered with correct text and links |
| `mood decline card shows dual CTAs on separate lines` | unit | Pass mood-decline suggestion, verify 2 Link elements |
| `MonthlyReport includes Suggestions section` | integration | Render page with mocked data that triggers suggestions, verify "Suggestions for Next Month" heading |

**Expected state after completion:**
- [ ] "Suggestions for Next Month" section appears after insight cards on monthly report
- [ ] Mood decline takes priority slot with dual CTAs (prayer + counselor)
- [ ] Up to 3 suggestions shown based on data
- [ ] Section hidden when no suggestions apply
- [ ] Each card uses frosted glass styling with icon + text + CTA links
- [ ] 13 tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Prayer Life section for Insights page |
| 2 | — | Extend PersonalPrayer type with sourceType/sourceId |
| 3 | 2 | Prayer Wall Save to My Prayers |
| 4 | — | Bible annotations storage readers |
| 5 | 4 | Recent Highlights dashboard widget |
| 6 | — | VOTD meditation link (dashboard + Daily Hub) |
| 7 | — | Scripture Soaking URL parameter support |
| 8 | — | Monthly report suggestions section |

Steps 1, 2, 4, 6, 7, 8 are independent and can execute in parallel. Step 3 depends on Step 2. Step 5 depends on Step 4.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Prayer Life Section for Insights | [COMPLETE] | 2026-03-26 | Created `PrayerLifeSection.tsx` with stats, mood correlation, category breakdown cards. Inserted into Insights.tsx after ScriptureConnections. Bumped MeditationHistory and Monthly Report link indices. 9 tests pass. |
| 2 | Extend PersonalPrayer Type | [COMPLETE] | 2026-03-26 | Added optional `sourceType`/`sourceId` to PersonalPrayer type and addPrayer function. 2 new tests pass. Existing tests unaffected. |
| 3 | Prayer Wall Save to My Prayers | [COMPLETE] | 2026-03-26 | Added Save button to InteractionBar (Plus/Check icons, auth-gated). Created SaveToPrayersForm with category pills, title input, grid-rows animation. Wired into PrayerWall.tsx with per-card save state. 11 tests pass. Existing InteractionBar tests unaffected. |
| 4 | Bible Annotations Storage Readers | [COMPLETE] | 2026-03-26 | Created `bible-annotations-storage.ts` with `getRecentBibleAnnotations`, `formatVerseReference`, `getBookDisplayName`. 6 tests pass. |
| 5 | Recent Highlights Dashboard Widget | [COMPLETE] | 2026-03-26 | Created `RecentHighlightsWidget.tsx` with empty state, 3-item list, colored dots, StickyNote icons, verse links. Added to DashboardWidgetGrid as order-7 after PrayerList. Bumped subsequent widget orders. 8 tests pass. |
| 6 | VOTD Meditation Link | [COMPLETE] | 2026-03-26 | Added "Meditate on this verse >" link to VerseOfTheDayCard.tsx and DailyHub.tsx hero VOTD card. Refactored DailyHub card from full-Link wrapper to div+Link structure. 4 new tests pass (3 in VOTD card + 1 in DailyHub). |
| 7 | Scripture Soaking URL Param | [COMPLETE] | 2026-03-26 | Added `useSearchParams` to ScriptureSoaking to read `?verse` param. Matches by reference string, falls back to random if no match. 4 tests pass. |
| 8 | Monthly Report Suggestions | [COMPLETE] | 2026-03-26 | Created `useMonthlyReportSuggestions` hook with 6 priority-ordered suggestion rules (mood decline, low meditation, low journaling, no gratitude, plan completion, mood improved). Created `MonthlySuggestions` component with frosted glass cards. Inserted into MonthlyReport after MonthlyInsightCards. 13 new tests pass. Existing MonthlyReport tests unaffected. |
