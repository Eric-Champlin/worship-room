# Implementation Plan: Prayer List Answered Tracking and Reminders

**Spec:** `_specs/prayer-list-answered-reminders.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/prayer-list-answered-reminders`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** Spec 18 (`_specs/personal-prayer-list.md`) — loaded

---

## Architecture Context

### Project Structure

- Pages: `frontend/src/pages/` — `MyPrayers.tsx`, `Dashboard.tsx`, `DailyHub.tsx`
- Components: `frontend/src/components/` — organized by feature (`my-prayers/`, `dashboard/`, `daily/`, `ui/`)
- Types: `frontend/src/types/personal-prayer.ts` — `PersonalPrayer` interface
- Services: `frontend/src/services/prayer-list-storage.ts` — CRUD for `wr_prayer_list`
- Constants: `frontend/src/constants/prayer-categories.ts` — 8 categories + labels
- Hooks: `frontend/src/hooks/` — `useAuth()`, `useFaithPoints()`, `useCelebrationQueue()`
- Utils: `frontend/src/utils/date.ts` — `getLocalDateString()`

### Key Existing Patterns

- **Prayer list storage** (`services/prayer-list-storage.ts`): Pure functions `readPrayers()` / `writePrayers()` with `wr_prayer_list` key. Functions: `getPrayers`, `addPrayer`, `updatePrayer`, `deletePrayer`, `markAnswered`, `markPrayed`, `getPrayerCounts`. `addPrayer` returns `null` if at 200-prayer limit.
- **PersonalPrayer type** (`types/personal-prayer.ts`): `{ id, title, description, category, status, createdAt, updatedAt, answeredAt, answeredNote, lastPrayedAt }`. Need to add optional `reminderEnabled` and `reminderTime`.
- **MyPrayers page** (`pages/MyPrayers.tsx`): Auth-gated via `useAuth()` + `<Navigate to="/" />`. Uses `PageHero`, `PrayerListActionBar`, `PrayerComposer`, `PrayerItemCard`, card actions, overflow menu, `DeletePrayerDialog`, `PrayerListEmptyState`. `handleMarkAnswered` calls `markAnswered()` + `refreshPrayers()` + `showToast()`.
- **CelebrationOverlay** (`components/dashboard/CelebrationOverlay.tsx`): Takes `badge: BadgeDefinition` + `onDismiss`. Uses `createPortal(... , document.body)`, `useFocusTrap`, confetti via `generateOverlayConfetti()`, delayed "Continue" button (6s), `motion-reduce:hidden` on confetti. Fixed inset overlay: `bg-black/70 backdrop-blur-md`.
- **CelebrationQueue** (`components/dashboard/CelebrationQueue.tsx`): Renders `CelebrationOverlay` from a queue driven by `useCelebrationQueue`. Only handles badge celebrations — prayer celebrations need a separate approach (different props).
- **DashboardWidgetGrid** (`components/dashboard/DashboardWidgetGrid.tsx`): Grid layout using `DashboardCard`. Widget order: Mood Chart → Verse of the Day → Today's Devotional → Streak & Points → Activity Checklist → Friends Preview → Weekly Recap → Quick Actions. Uses CSS `order-*` classes and `lg:col-span-3` / `lg:col-span-2`.
- **DashboardCard** (`components/dashboard/DashboardCard.tsx`): Props: `{ id, title, icon, collapsible?, action?, children, className?, style? }`. Frosted glass: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`.
- **PrayTabContent** (`components/daily/PrayTabContent.tsx`): Action buttons at lines 392-458: Copy, ReadAloud, Save, Share (mobile overflow + desktop). The "Save to List" button inserts alongside these.
- **Toast system** (`components/ui/Toast.tsx`): `useToast()` returns `{ showToast, showCelebrationToast }`. `showToast(message, type?)` — type defaults to `'success'`. Standard types: `success | error | warning`. Toasts render top-right.
- **Auth gating**: `useAuth()` returns `{ isAuthenticated, user }`. `useAuthModal()` from `AuthModalProvider` returns `{ openAuthModal(message) }`.
- **Test patterns** (`pages/__tests__/MyPrayers.test.tsx`): `vi.mock('@/hooks/useAuth')`, wrap in `MemoryRouter` + `ToastProvider`. `seedPrayer()` helper. `localStorage.clear()` in `beforeEach`.

### Dashboard Reminder Toast Integration

The Dashboard page (`pages/Dashboard.tsx`) renders phases: onboarding → check_in → recommendations → dashboard_enter → dashboard. The reminder toast fires during the `dashboard` phase. The toast should trigger via a `useEffect` in Dashboard that reads `wr_prayer_list` and `wr_prayer_reminders_shown`, fires `showToast()`, and updates the tracking key.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Celebration overlay display | Only on `/my-prayers` (auth-gated route) | Step 2 | Route-level redirect (existing) |
| Answered counter in hero | Only on `/my-prayers` (auth-gated route) | Step 3 | Route-level redirect (existing) |
| "Remind me" toggle | Only on `/my-prayers` (auth-gated route) | Step 4 | Route-level redirect (existing) |
| Reminder time input | Only on `/my-prayers` (auth-gated route) | Step 4 | Route-level redirect (existing) |
| Dashboard widget | Only on dashboard (auth-gated) | Step 5 | Dashboard only renders when `isAuthenticated` |
| Dashboard widget "View all" | Only on dashboard | Step 5 | Dashboard-level |
| Dashboard widget "Add Prayer" | Only on dashboard | Step 5 | Dashboard-level |
| Dashboard reminder toast | Only on dashboard | Step 6 | Dashboard `useEffect` checks `isAuthenticated` |
| Pray tab "Save to List" button | Visible to all; auth modal for logged-out | Step 7 | `useAuth()` + `authModal.openAuthModal()` |
| Save form title/category/save | Only opens when authenticated | Step 7 | Button gated — form only opens after auth check |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard card | background | `bg-white/5 backdrop-blur-sm` | design-system.md |
| Dashboard card | border | `border border-white/10 rounded-2xl` | design-system.md |
| Dashboard card | padding | `p-4 md:p-6` | design-system.md |
| Celebration overlay | backdrop | `bg-black/70 backdrop-blur-md` | CelebrationOverlay.tsx:136 |
| Celebration overlay | button | `rounded-lg border border-white/30 px-8 py-3 text-white hover:bg-white/10` | CelebrationOverlay.tsx:178 |
| Hero subtitle | color | `text-white/85` | design-system.md Inner Page Hero |
| Caveat script | class | `font-script` | design-system.md Typography |
| Primary CTA button | style | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Category pill (unselected) | style | `text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5` | PrayerItemCard.tsx:36 |
| Category pill (selected) | style | `bg-primary text-white rounded-full` | prayer-list spec |
| Action button (Pray tab) | style | `inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark hover:bg-gray-50` | PrayTabContent.tsx:396 |
| CTA link (dashboard) | style | `text-sm text-primary-lt hover:text-primary font-medium` | Devotional widget pattern |
| Emerald counter | color | `text-emerald-400` | [UNVERIFIED] — new color on dark hero gradient |
| Toggle switch on | bg | `bg-primary` (#6D28D9) | spec |
| Toggle switch off | bg | `bg-gray-300` | spec |

---

## Design System Reminder

- Caveat (`font-script`) for decorative headings — "Prayer Answered!" uses this
- Lora (`font-serif`) for scripture/journal content — testimony notes in italic
- Inter (`font-sans`) for all body text and UI
- Dashboard cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Emerald-400 is a new usage — verify legibility on dark hero gradient
- Use `getLocalDateString()` from `utils/date.ts` for date strings — never `toISOString().split('T')[0]`
- Toast `showToast(msg, 'success')` for standard. No `'info'` type exists — use `'success'` for info-tier
- `motion-reduce:hidden` on confetti animations
- All interactive elements: min 44px touch targets

---

## Shared Data Models

```typescript
// Extended PersonalPrayer type (from types/personal-prayer.ts)
export interface PersonalPrayer {
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
  reminderEnabled?: boolean   // NEW — defaults to false
  reminderTime?: string       // NEW — defaults to "09:00"
}

// Prayer reminder tracking (new key)
interface PrayerReminderShown {
  date: string               // YYYY-MM-DD local
  shownPrayerIds: string[]
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_list` | Both | Prayer items — adds reminderEnabled/reminderTime fields, reads for stats |
| `wr_prayer_reminders_shown` | Both | Tracks daily toast display `{ date, shownPrayerIds }` |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Overlay text `text-3xl`, button full-width; toggle full-width in card; widget single-column; save form full-width, pills scrollable |
| Tablet | 640-1024px | Overlay text `text-4xl`; widget in 2-col grid; save form at `max-w-2xl` |
| Desktop | > 1024px | Overlay text `text-5xl`, button ~200px; toggle in card action area; widget in left col `lg:col-span-3` |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| PageHero → answered counter | 0px (within hero) | Part of PageHero subtitle area |
| PageHero → action bar | 0px (adjacent) | Existing MyPrayers layout |
| Devotional widget → Prayer widget | `gap-4 md:gap-6` (grid gap) | DashboardWidgetGrid grid classes |

---

## Assumptions & Pre-Execution Checklist

- [x] Spec 18 (Personal Prayer List) is merged to main and functional
- [x] `CelebrationOverlay` component exists and renders badge celebrations
- [x] `DashboardWidgetGrid` exists with the Today's Devotional widget
- [x] `PrayTabContent` has action buttons row for generated prayers
- [x] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values verified from reference and codebase inspection
- [ ] `text-emerald-400` is legible against dark hero gradient — [UNVERIFIED]
- [ ] Pill-shaped toggle switch — check if existing toggle exists in codebase — [UNVERIFIED]
- [x] Toast system does NOT have an `'info'` type — use `'success'` (green left border)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Celebration approach | Standalone `PrayerAnsweredCelebration` component (not via `CelebrationQueue`) | The existing queue is tightly coupled to `BadgeDefinition` type and `useCelebrationQueue`. Creating a separate component is simpler and avoids modifying the badge celebration pipeline. |
| Toast type for reminders | `'success'` (standard toast) | No `'info'` tier exists in the toast system. `'success'` gives a green left border which is appropriate for a gentle reminder. |
| "Save to List" button position | After the Share button (desktop), inside the mobile overflow menu | Matches the existing pattern of action buttons + overflow menu |
| Widget grid order | After Today's Devotional (`order-5 lg:col-span-3`) | Spec says "after the devotional widget." Insert between Devotional and Activity Checklist. Bump subsequent order classes. |
| No `HandHeart` in Lucide | Use `Heart` icon | `HandHeart` is not a standard Lucide icon. `Heart` is available and semantically appropriate. |

---

## Implementation Steps

### Step 1: Extend Data Model & Storage Service

**Objective:** Add `reminderEnabled` and `reminderTime` fields to the `PersonalPrayer` type and add new storage helpers.

**Files to create/modify:**
- `frontend/src/types/personal-prayer.ts` — Add 2 optional fields
- `frontend/src/services/prayer-list-storage.ts` — Add `updateReminder()`, `getActivePrayersWithReminders()`, `getAnsweredThisMonth()` functions

**Details:**

1. In `types/personal-prayer.ts`, add:
   ```typescript
   reminderEnabled?: boolean
   reminderTime?: string
   ```
   These are optional to maintain backwards compatibility with existing `wr_prayer_list` data.

2. In `services/prayer-list-storage.ts`, add:
   ```typescript
   export function updateReminder(id: string, enabled: boolean, time?: string): void
   export function getActivePrayersWithReminders(): PersonalPrayer[]
   export function getAnsweredThisMonth(): number
   ```
   - `updateReminder`: sets `reminderEnabled` and optionally `reminderTime` on a prayer item. When toggling on and no time exists, defaults to `"09:00"`.
   - `getActivePrayersWithReminders`: filters `readPrayers()` for `status === 'active' && reminderEnabled === true`.
   - `getAnsweredThisMonth`: counts prayers where `answeredAt` falls in the current calendar month.

3. Add `wr_prayer_reminders_shown` key helpers:
   ```typescript
   const REMINDERS_SHOWN_KEY = 'wr_prayer_reminders_shown'

   export function hasShownRemindersToday(): boolean
   export function markRemindersShown(prayerIds: string[]): void
   ```
   Uses `getLocalDateString()` from `@/utils/date` for date comparison.

**Guardrails (DO NOT):**
- DO NOT change the shape of existing prayer items in localStorage — new fields are optional
- DO NOT use `toISOString()` for date comparisons — use `getLocalDateString()`
- DO NOT break the existing `addPrayer()` return signature

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| updateReminder sets fields | unit | `updateReminder(id, true)` → prayer.reminderEnabled === true, reminderTime === "09:00" |
| updateReminder preserves time on disable | unit | Toggle on with time "14:00", toggle off → reminderTime still "14:00" |
| getActivePrayersWithReminders filters correctly | unit | Mix of active/answered/reminder-enabled → returns only active+enabled |
| getAnsweredThisMonth counts current month | unit | Prayers answered in different months → only current month counted |
| hasShownRemindersToday returns true when same date | unit | Set today's date → returns true |
| hasShownRemindersToday returns false for yesterday | unit | Set yesterday's date → returns false |
| backwards compatibility | unit | Prayers without reminderEnabled field still work in all existing functions |

**Expected state after completion:**
- [ ] `PersonalPrayer` type has optional `reminderEnabled` and `reminderTime` fields
- [ ] Storage service has `updateReminder`, `getActivePrayersWithReminders`, `getAnsweredThisMonth`, `hasShownRemindersToday`, `markRemindersShown`
- [ ] All existing tests pass (backwards compatible)
- [ ] New unit tests pass

---

### Step 2: Answered Prayer Celebration Overlay

**Objective:** Create a `PrayerAnsweredCelebration` component and integrate it into the MyPrayers page so it fires when a prayer is marked as answered.

**Files to create/modify:**
- `frontend/src/components/my-prayers/PrayerAnsweredCelebration.tsx` — New component
- `frontend/src/pages/MyPrayers.tsx` — Add celebration state + render overlay

**Details:**

1. Create `PrayerAnsweredCelebration.tsx`:
   - Props: `{ prayerTitle: string; testimonyNote?: string; onDismiss: () => void }`
   - Pattern: Follow `CelebrationOverlay.tsx` structure — `createPortal`, `useFocusTrap`, confetti, scroll lock
   - Reuse `generateOverlayConfetti()` from `CelebrationOverlay` (or duplicate the confetti generation logic since it references badge-specific constants — import `CONFETTI_COLORS` from `@/constants/dashboard/badge-icons`)
   - Layout:
     ```
     [confetti particles]
     "Prayer Answered!" — font-script text-4xl sm:text-5xl text-white text-center
     {prayerTitle} — font-sans text-lg text-white/90 text-center mt-4
     {testimonyNote && <p className="mt-4 max-w-md font-serif italic text-base text-white/70 text-center">}
     "Praise God!" button — same style as CelebrationOverlay Continue button, but text = "Praise God!"
     ```
   - Show button immediately (no 6s delay — answered prayer celebration should be brief)
   - `motion-reduce:hidden` on confetti spans
   - Full-screen: `fixed inset-0 z-[60] bg-black/70 backdrop-blur-md`
   - `role="dialog"` + `aria-labelledby` + `aria-modal="true"`
   - Focus trap via `useFocusTrap(true, onDismiss)`
   - Auto-focus "Praise God!" button on mount

2. In `MyPrayers.tsx`:
   - Add state: `const [celebrationPrayer, setCelebrationPrayer] = useState<{ title: string; note?: string } | null>(null)`
   - Modify `handleMarkAnswered`: after `markAnswered()` + `refreshPrayers()`, set `setCelebrationPrayer({ title: prayerTitle, note: note || undefined })`
   - Remove the existing `showToast('Prayer marked as answered', 'success')` — the celebration overlay replaces it
   - Render `PrayerAnsweredCelebration` when `celebrationPrayer` is not null:
     ```tsx
     {celebrationPrayer && (
       <PrayerAnsweredCelebration
         prayerTitle={celebrationPrayer.title}
         testimonyNote={celebrationPrayer.note}
         onDismiss={() => setCelebrationPrayer(null)}
       />
     )}
     ```
   - Need to look up the prayer title before it gets answered — capture it from `prayers` state using `answeringId`

**Responsive behavior:**
- Mobile: `text-3xl` for "Prayer Answered!", `p-6` padding, button full-width (`w-full py-4`)
- Tablet: `text-4xl`, standard layout
- Desktop: `text-5xl`, button standard width

**Guardrails (DO NOT):**
- DO NOT modify `CelebrationOverlay.tsx` — create a separate component
- DO NOT modify `CelebrationQueue.tsx` or `useCelebrationQueue.ts`
- DO NOT add a delay to showing the dismiss button (badges have 6s delay, prayer celebration should be immediate)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders overlay with prayer title | unit | PrayerAnsweredCelebration renders "Prayer Answered!" and prayer title |
| renders testimony note when provided | unit | Pass testimonyNote → appears in italic serif |
| does not render testimony when absent | unit | No testimonyNote → no empty space |
| dismiss button says "Praise God!" | unit | Button text is "Praise God!", not "Continue" |
| calls onDismiss when button clicked | unit | Click "Praise God!" → onDismiss called |
| focus trap is active | unit | Dialog has role="dialog" and aria-modal="true" |
| reduced motion hides confetti | unit | `prefers-reduced-motion: reduce` → confetti hidden |
| MyPrayers shows celebration after marking answered | integration | Mark prayer answered → celebration overlay appears |
| celebration dismisses correctly | integration | Click "Praise God!" → overlay disappears |

**Expected state after completion:**
- [ ] `PrayerAnsweredCelebration` component renders with confetti, title, optional note, "Praise God!" button
- [ ] Marking a prayer as answered on `/my-prayers` triggers the celebration overlay
- [ ] Overlay dismisses on button click
- [ ] All tests pass

---

### Step 3: Answered Prayers Counter in Hero

**Objective:** Add an answered prayers counter and encouraging message to the `/my-prayers` page hero.

**Files to create/modify:**
- `frontend/src/pages/MyPrayers.tsx` — Add counter below PageHero

**Details:**

1. The `PageHero` component is used for the hero section. The counter needs to be positioned visually within/below the hero gradient but outside the `PageHero` component. Add it as a `<div>` between the `<PageHero>` and `<PrayerListActionBar>`.

2. Structure:
   ```tsx
   {counts.answered > 0 && (
     <div className="bg-gradient-to-b from-[#4A1D96] to-neutral-bg pb-6 text-center">
       <p className="text-base text-white/85">
         <span className="font-semibold text-emerald-400">{counts.answered}</span>{' '}
         {counts.answered === 1 ? 'prayer answered' : 'prayers answered'}
       </p>
       {counts.answered >= 5 && (
         <p className="mx-auto mt-2 max-w-md font-serif text-sm italic text-white/70">
           God is faithful. Keep bringing your requests to Him.
         </p>
       )}
     </div>
   )}
   ```

3. The gradient `from-[#4A1D96] to-neutral-bg` connects the hero gradient to the content area. [UNVERIFIED] — the exact gradient start color should match the bottom of the inner page hero. Verify visually.
   → To verify: Run `/verify-with-playwright` on `/my-prayers` with answered prayers
   → If wrong: Adjust gradient start to match `PageHero` bottom edge

**Responsive behavior:**
- All breakpoints: centered text, stacked vertically. No layout changes needed.

**Guardrails (DO NOT):**
- DO NOT modify the `PageHero` component — add the counter as a separate element
- DO NOT show the counter when answered count is 0

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| counter hidden when 0 answered | unit | No answered prayers → no counter visible |
| counter shows count when >= 1 | unit | 3 answered → "3 prayers answered" visible |
| singular form for 1 | unit | 1 answered → "1 prayer answered" |
| encouraging message at 5+ | unit | 5 answered → "God is faithful..." message visible |
| no encouraging message below 5 | unit | 4 answered → message not visible |
| emerald-400 on count number | unit | Counter number has `text-emerald-400` class |

**Expected state after completion:**
- [ ] Hero shows "X prayers answered" in emerald green when X >= 1
- [ ] Encouraging message appears at 5+ answered prayers
- [ ] Counter hidden at 0

---

### Step 4: Prayer Reminder Toggle & Time Input

**Objective:** Add a "Remind me" toggle switch and time input to active prayer cards.

**Files to create/modify:**
- `frontend/src/components/my-prayers/ReminderToggle.tsx` — New toggle component
- `frontend/src/components/my-prayers/PrayerItemCard.tsx` — Integrate toggle
- `frontend/src/pages/MyPrayers.tsx` — Wire toggle to storage

**Details:**

1. Create `ReminderToggle.tsx`:
   - Props: `{ enabled: boolean; time: string; onToggle: (enabled: boolean) => void; onTimeChange: (time: string) => void }`
   - Toggle switch: `<button role="switch" aria-checked={enabled}>` with pill shape
     - Outer: `w-10 h-[22px] rounded-full transition-colors` + `bg-primary` when on, `bg-gray-300` when off
     - Thumb: `w-4 h-4 rounded-full bg-white shadow-sm` + `translate-x-5` when on, `translate-x-0.5` when off
   - Label: `<label>` with "Remind me" text in `text-sm text-text-dark`
   - Min touch target: 44px achieved via padding on the button container
   - When enabled, show time input below:
     ```tsx
     {enabled && (
       <div className="mt-2 flex items-center gap-2">
         <input
           type="time"
           value={time}
           onChange={(e) => onTimeChange(e.target.value)}
           className="rounded border border-gray-200 px-2 py-1 text-sm text-text-dark"
           aria-label="Reminder time"
           aria-describedby="reminder-time-tooltip"
         />
         <span
           id="reminder-time-tooltip"
           className="text-xs text-text-light"
           title="Push notification timing coming soon. For now, you'll see reminders when you open the app."
         >
           ?
         </span>
       </div>
     )}
     ```
   - Tooltip: The `?` icon with `title` attribute provides hover tooltip. For accessibility, the tooltip text is available via `aria-describedby`.

   [UNVERIFIED] Pill-shaped toggle switch — no existing toggle component found in the codebase. This is a new pattern.
   → To verify: Run `/verify-with-playwright` to check toggle visual appearance
   → If wrong: Adjust dimensions/colors to match platform conventions

2. In `PrayerItemCard.tsx`:
   - Add the `ReminderToggle` in the card body, after the "Prayed" indicator and before `{children}` (action buttons)
   - Only render for active prayers: `{prayer.status === 'active' && <ReminderToggle ... />}`
   - Pass `enabled={prayer.reminderEnabled ?? false}` and `time={prayer.reminderTime ?? '09:00'}`

3. In `MyPrayers.tsx`:
   - Add handler:
     ```typescript
     const handleToggleReminder = useCallback((id: string, enabled: boolean) => {
       updateReminder(id, enabled)
       refreshPrayers()
     }, [refreshPrayers])

     const handleReminderTimeChange = useCallback((id: string, time: string) => {
       updateReminder(id, true, time)
       refreshPrayers()
     }, [refreshPrayers])
     ```
   - Pass handlers to `PrayerItemCard` via new props or via the children pattern

**Responsive behavior:**
- Mobile: Toggle and label on same row, full width within card. Time input below.
- Tablet/Desktop: Toggle inline in the card body area. Time input below.

**Guardrails (DO NOT):**
- DO NOT show the toggle on answered prayer cards
- DO NOT lose reminder time when toggling off (preserve `reminderTime`)
- DO NOT use a non-native time picker — use `<input type="time">`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| toggle renders on active cards | unit | Active prayer card shows "Remind me" toggle |
| toggle hidden on answered cards | unit | Answered prayer card does NOT show toggle |
| toggle on sets reminderEnabled | integration | Toggle on → storage updated with reminderEnabled: true |
| toggle off preserves time | integration | Toggle off → reminderEnabled: false, reminderTime unchanged |
| time input appears when enabled | unit | reminderEnabled: true → time input visible |
| time input hidden when disabled | unit | reminderEnabled: false → no time input |
| time change updates storage | integration | Change time → prayer.reminderTime updated |
| toggle has accessible role | unit | Button has role="switch" and aria-checked |
| time input has accessible label | unit | Input has aria-label |
| tooltip text accessible | unit | aria-describedby links to tooltip text |
| toggle meets 44px touch target | unit | Container has min-h-[44px] or equivalent |

**Expected state after completion:**
- [ ] Active prayer cards show "Remind me" toggle
- [ ] Toggle state persists to localStorage
- [ ] Time input appears when toggle is on
- [ ] Answered cards don't show toggle

---

### Step 5: Dashboard Prayer List Widget

**Objective:** Add a "My Prayers" widget card to the dashboard grid.

**Files to create/modify:**
- `frontend/src/components/dashboard/PrayerListWidget.tsx` — New widget component
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — Add widget to grid

**Details:**

1. Create `PrayerListWidget.tsx`:
   - Reads from `getPrayers()`, `getPrayerCounts()`, `getAnsweredThisMonth()` from prayer-list-storage
   - **With prayers state:**
     ```tsx
     <div className="space-y-2">
       <p className="text-sm text-white/60">{counts.active} active prayers</p>
       {mostRecent && (
         <p className="line-clamp-1 text-base font-semibold text-white">
           {mostRecent.title}
         </p>
       )}
       <p className="text-sm text-emerald-400">
         {answeredThisMonth} {answeredThisMonth === 1 ? 'prayer' : 'prayers'} answered this month
       </p>
       <Link to="/my-prayers" className="mt-2 inline-block text-sm font-medium text-primary-lt transition-colors hover:text-primary">
         View all &rarr;
       </Link>
     </div>
     ```
   - **Empty state:**
     ```tsx
     <div className="flex flex-col items-center gap-3 py-4 text-center">
       <p className="text-sm text-white/60">Start your prayer list</p>
       <Link
         to="/my-prayers"
         className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt"
       >
         Add Prayer
       </Link>
     </div>
     ```
   - `mostRecent`: First active prayer sorted by `createdAt` descending. Use `getPrayers().filter(p => p.status === 'active').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]`

2. In `DashboardWidgetGrid.tsx`:
   - Import `PrayerListWidget` and `Heart` from lucide-react
   - Add animation props: `const prayerListAnim = getAnimProps()` after `devotionalAnim`
   - Add the widget after the Today's Devotional card:
     ```tsx
     <DashboardCard
       id="prayer-list"
       title="My Prayers"
       icon={<Heart className="h-5 w-5" />}
       className={cn('order-5 lg:col-span-3', prayerListAnim.className)}
       style={prayerListAnim.style}
     >
       <PrayerListWidget />
     </DashboardCard>
     ```
   - Bump subsequent order classes: Activity Checklist `order-4` → `order-6`, Friends `order-5` → `order-7`, Weekly Recap `order-6` → `order-8`, Quick Actions `order-7` → `order-9`

**Responsive behavior:**
- Mobile: Full-width in single-column stack
- Tablet: In 2-column grid, `lg:col-span-3` (left column)
- Desktop: Left column, after devotional

**Guardrails (DO NOT):**
- DO NOT add "Pray for this" or other prayer interactions to the widget — view-only + navigation
- DO NOT modify DashboardCard component — use its existing API
- DO NOT read wr_prayer_list on every render — read on mount via useState/useEffect

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| widget renders with prayers | unit | Seed prayers → shows active count, most recent title, answered this month |
| widget shows empty state | unit | No prayers → "Start your prayer list" + "Add Prayer" button |
| most recent title truncated to 1 line | unit | Long title → line-clamp-1 class present |
| answered this month counts correctly | unit | 2 answered this month, 1 last month → shows "2" |
| "View all" link goes to /my-prayers | unit | Link has href="/my-prayers" |
| "Add Prayer" button goes to /my-prayers | unit | Button/link navigates to /my-prayers |
| widget appears in dashboard grid | integration | Dashboard renders → "My Prayers" card visible |

**Expected state after completion:**
- [ ] "My Prayers" widget appears in dashboard grid after the devotional
- [ ] Shows active count, most recent prayer, answered this month
- [ ] Shows empty state when no prayers exist
- [ ] Grid order is correct — no visual layout disruption

---

### Step 6: Dashboard Prayer Reminder Toast

**Objective:** Show a "Don't forget to pray for..." toast when the user visits the dashboard and has reminder-enabled prayers.

**Files to create/modify:**
- `frontend/src/hooks/usePrayerReminders.ts` — New hook
- `frontend/src/pages/Dashboard.tsx` — Integrate hook

**Details:**

1. Create `usePrayerReminders.ts`:
   ```typescript
   import { useEffect } from 'react'
   import { useToast } from '@/components/ui/Toast'
   import {
     getActivePrayersWithReminders,
     hasShownRemindersToday,
     markRemindersShown,
   } from '@/services/prayer-list-storage'

   export function usePrayerReminders(isActive: boolean) {
     const { showToast } = useToast()

     useEffect(() => {
       if (!isActive) return
       if (hasShownRemindersToday()) return

       const prayers = getActivePrayersWithReminders()
       if (prayers.length === 0) return

       // Sort by createdAt ascending (oldest first), take first 3
       const sorted = [...prayers].sort(
         (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
       )
       const top3 = sorted.slice(0, 3)

       // Truncate titles to 30 chars
       const titles = top3.map(p =>
         p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title
       )

       const message = `Don't forget to pray for: ${titles.join(', ')}`
       showToast(message, 'success')

       markRemindersShown(top3.map(p => p.id))
     }, [isActive, showToast])
   }
   ```

2. In `Dashboard.tsx`:
   - Import `usePrayerReminders`
   - Call: `usePrayerReminders(phase === 'dashboard')` — only fires when dashboard phase is active (not during check-in or onboarding)

**Guardrails (DO NOT):**
- DO NOT show the toast during onboarding, check-in, or recommendations phases
- DO NOT show the toast more than once per day
- DO NOT use `toISOString()` for date comparison — use `getLocalDateString()`
- DO NOT show toast if all reminder-enabled prayers are answered (filtered by `getActivePrayersWithReminders`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| toast fires when reminders exist | unit | Active prayers with reminderEnabled → toast shown |
| toast not shown when already shown today | unit | markRemindersShown called → next call no-ops |
| toast not shown when no reminders | unit | No reminderEnabled prayers → no toast |
| toast shows up to 3 titles | unit | 5 prayers → only 3 titles in message |
| titles truncated to 30 chars | unit | 40-char title → truncated with "..." |
| toast not shown during check_in phase | unit | isActive=false → no toast |

**Expected state after completion:**
- [ ] Dashboard shows reminder toast on first visit of the day
- [ ] Toast displays up to 3 prayer titles, truncated
- [ ] Toast only fires once per day
- [ ] No toast when no reminders are enabled

---

### Step 7: Pray Tab "Save to Prayer List" Button

**Objective:** Add a "Save to List" button to the Pray tab action buttons, with an inline form for title and category selection.

**Files to create/modify:**
- `frontend/src/components/daily/SaveToPrayerListForm.tsx` — New inline form component
- `frontend/src/components/daily/PrayTabContent.tsx` — Add button + form

**Details:**

1. Create `SaveToPrayerListForm.tsx`:
   - Props: `{ topicText: string; prayerText: string; onSave: () => void; onCancel: () => void }`
   - Pre-fill title with first 8 words of `topicText`, capped at 100 chars. If empty/short, default to "My prayer".
   - Category pills: import `PRAYER_CATEGORIES`, `CATEGORY_LABELS` from `@/constants/prayer-categories`
   - Crisis detection: `<CrisisBanner text={title} />`
   - Save logic: calls `addPrayer({ title, description: prayerText, category })` from prayer-list-storage
   - Returns `null` from `addPrayer` → show 200-limit toast (handled by caller)
   - Slide-open animation: `overflow-hidden transition-all duration-300` with height animation via `grid-rows-[0fr]` → `grid-rows-[1fr]` pattern (same as DashboardCard collapse)

   ```tsx
   // Category pills
   <div className="flex flex-wrap gap-2 overflow-x-auto sm:overflow-visible">
     {PRAYER_CATEGORIES.map(cat => (
       <button
         key={cat}
         type="button"
         onClick={() => setCategory(cat)}
         className={cn(
           'min-h-[44px] shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors',
           category === cat
             ? 'bg-primary text-white'
             : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
         )}
       >
         {CATEGORY_LABELS[cat]}
       </button>
     ))}
   </div>
   ```

2. In `PrayTabContent.tsx`:
   - Add state: `const [saveToListOpen, setSaveToListOpen] = useState(false)`, `const [savedToList, setSavedToList] = useState(false)`
   - Reset `savedToList` to `false` in `handleReset()` (when user generates a new prayer)
   - Add button in the action buttons row (line ~392), after the Share button (desktop) / inside mobile overflow menu:
     ```tsx
     {!savedToList ? (
       <button
         type="button"
         onClick={handleSaveToList}
         className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark transition-colors hover:bg-gray-50"
         aria-label="Save to prayer list"
       >
         <ListPlus className="h-4 w-4" />
         <span className="hidden sm:inline">Save to List</span>
       </button>
     ) : (
       <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-success">
         <Check className="h-4 w-4" />
         <span className="hidden sm:inline">Saved</span>
       </span>
     )}
     ```
   - `handleSaveToList`:
     ```typescript
     const handleSaveToList = () => {
       if (!isAuthenticated) {
         authModal?.openAuthModal('Sign in to save prayers to your list.')
         return
       }
       // Check 200-prayer limit
       const prayers = getPrayers()
       if (prayers.length >= MAX_PRAYERS) {
         showToast("You've reached the 200 prayer limit. Consider archiving answered prayers to make room.", 'error')
         return
       }
       setSaveToListOpen(true)
     }
     ```
   - Render `SaveToPrayerListForm` below the action buttons row when `saveToListOpen`:
     ```tsx
     {saveToListOpen && (
       <SaveToPrayerListForm
         topicText={text}
         prayerText={prayer.text}
         onSave={() => {
           setSaveToListOpen(false)
           setSavedToList(true)
           showToast('Added to your prayer list.')
         }}
         onCancel={() => setSaveToListOpen(false)}
       />
     )}
     ```
   - Add `ListPlus` and `Check` to lucide-react imports
   - Also add "Save to List" option in the mobile overflow menu (inside the `{mobileMenuOpen && ...}` dropdown)

**Auth gating:**
- Logged-out: `handleSaveToList` → `authModal.openAuthModal('Sign in to save prayers to your list.')`
- Logged-in: opens the inline save form

**Responsive behavior:**
- Mobile: Button shows icon only (text hidden via `hidden sm:inline`); also available in overflow menu
- Tablet/Desktop: Full button with text "Save to List"
- Save form: full-width, category pills scroll horizontally on mobile

**Guardrails (DO NOT):**
- DO NOT allow saving the same prayer twice (button becomes "Saved" after save)
- DO NOT let the user edit the description (AI prayer text) — only title and category
- DO NOT skip crisis detection on the title input
- DO NOT forget to import `getPrayers`, `addPrayer`, `MAX_PRAYERS` from prayer-list-storage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| button appears after prayer generation | unit | Generate prayer → "Save to List" button visible |
| button hidden before generation | unit | No prayer → no button |
| logged-out triggers auth modal | integration | Click button when logged out → auth modal with correct message |
| logged-in opens save form | integration | Click button when logged in → form appears |
| title pre-filled from topic | unit | Topic "Help me with anxiety" → title pre-filled |
| empty topic defaults to "My prayer" | unit | Empty topic → title is "My prayer" |
| save disabled without category | unit | No category selected → save button disabled |
| save adds to wr_prayer_list | integration | Select category + save → prayer in localStorage |
| success toast appears | integration | After save → "Added to your prayer list." toast |
| button changes to "Saved" | integration | After save → button shows checkmark + "Saved" |
| 200 limit shows error toast | integration | 200 prayers in storage → error toast on click |
| crisis banner on title input | unit | Type crisis keyword in title → CrisisBanner visible |
| cancel collapses form | unit | Click cancel → form hidden |

**Expected state after completion:**
- [ ] "Save to List" button appears on Pray tab after prayer generation
- [ ] Auth modal for logged-out users
- [ ] Inline form with pre-filled title, category pills, save/cancel
- [ ] Saves to `wr_prayer_list` with correct fields
- [ ] "Saved" state prevents duplicate saves

---

### Step 8: Integration Tests & Final Verification

**Objective:** End-to-end integration tests verifying all features work together.

**Files to create/modify:**
- `frontend/src/components/my-prayers/__tests__/PrayerAnsweredCelebration.test.tsx` — Overlay tests
- `frontend/src/components/my-prayers/__tests__/ReminderToggle.test.tsx` — Toggle tests
- `frontend/src/components/dashboard/__tests__/PrayerListWidget.test.tsx` — Widget tests
- `frontend/src/components/daily/__tests__/SaveToPrayerListForm.test.tsx` — Save form tests
- `frontend/src/hooks/__tests__/usePrayerReminders.test.ts` — Reminder hook tests

**Details:**

Test file structure follows existing patterns:
- Mock `useAuth` via `vi.mock('@/hooks/useAuth')`
- Wrap in `MemoryRouter` + `ToastProvider`
- `localStorage.clear()` in `beforeEach`
- Use `userEvent` for interactions
- Use `screen.getByRole`, `screen.getByText`, `screen.queryByText` for assertions

Key integration scenarios:
1. Mark prayer answered → celebration fires → dismiss → prayer now shows answered badge + counter updates
2. Enable reminder on prayer → visit dashboard → toast appears → revisit dashboard same day → no toast
3. Generate prayer on Pray tab → save to list → visit /my-prayers → prayer appears in list
4. Dashboard widget shows correct stats → add prayer → revisit dashboard → stats update

**Guardrails (DO NOT):**
- DO NOT duplicate test coverage from individual step tests
- DO NOT test CelebrationOverlay internals — only the prayer-specific overlay
- DO NOT mock localStorage — use real localStorage with cleanup

**Expected state after completion:**
- [ ] All new tests pass
- [ ] All existing tests pass (run full suite)
- [ ] No regressions in existing features

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extend data model & storage service |
| 2 | 1 | Answered prayer celebration overlay |
| 3 | 1 | Answered prayers counter in hero |
| 4 | 1 | Prayer reminder toggle & time input |
| 5 | 1 | Dashboard prayer list widget |
| 6 | 1, 5 | Dashboard prayer reminder toast |
| 7 | 1 | Pray tab "Save to List" button |
| 8 | 1-7 | Integration tests & final verification |

Steps 2, 3, 4, 5, 7 can be done in parallel after Step 1.
Step 6 depends on Step 5 (widget must exist before toast integration in Dashboard).
Step 8 depends on all others.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extend Data Model & Storage | [COMPLETE] | 2026-03-20 | types/personal-prayer.ts + services/prayer-list-storage.ts: added reminderEnabled, reminderTime, updateReminder, getActivePrayersWithReminders, getAnsweredThisMonth, hasShownRemindersToday, markRemindersShown. 25 tests pass. |
| 2 | Answered Prayer Celebration | [COMPLETE] | 2026-03-20 | New: components/my-prayers/PrayerAnsweredCelebration.tsx. Modified: pages/MyPrayers.tsx (celebration state, replaces toast). Fixed existing test to dismiss celebration before asserting. 29 tests pass. |
| 3 | Answered Prayers Counter | [COMPLETE] | 2026-03-20 | Modified: pages/MyPrayers.tsx (gradient section with emerald counter + encouraging message). 26 tests pass. |
| 4 | Reminder Toggle & Time Input | [COMPLETE] | 2026-03-20 | New: components/my-prayers/ReminderToggle.tsx. Modified: PrayerItemCard.tsx (toggle props), MyPrayers.tsx (handlers). 33 tests pass. |
| 5 | Dashboard Widget | [COMPLETE] | 2026-03-20 | New: components/dashboard/PrayerListWidget.tsx. Modified: DashboardWidgetGrid.tsx (added widget after devotional, bumped order classes). 7 tests pass. |
| 6 | Dashboard Reminder Toast | [COMPLETE] | 2026-03-20 | New: hooks/usePrayerReminders.ts. Modified: pages/Dashboard.tsx (hook integration). 6 tests pass. |
| 7 | Pray Tab Save to List | [COMPLETE] | 2026-03-20 | New: components/daily/SaveToPrayerListForm.tsx. Modified: PrayTabContent.tsx (button, form, auth gate, state). 9 tests pass. |
| 8 | Integration Tests | [COMPLETE] | 2026-03-20 | Full suite: 2881 passed, 9 pre-existing failures (Dashboard Accessibility + transition-animation — confirmed failing before changes). Zero regressions. |
