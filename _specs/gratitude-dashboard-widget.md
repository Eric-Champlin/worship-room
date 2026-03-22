# Feature: Gratitude Dashboard Widget

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section
- Cross-spec dependencies: See "Cross-Spec Integration Points" table
- Activity system: This feature adds a new `gratitude` activity type to the existing `ActivityType` union, `ACTIVITY_POINTS`, `DailyActivities`, and `ActivityChecklist`

## Overview

Gratitude practice is one of the most evidence-backed spiritual disciplines for improving emotional well-being — and it's a core feature in competing apps (Glorify's "Gratitude Space", FaithTime's gratitude tracking, Abide's daily gratitude prompts). Worship Room currently has no dedicated gratitude feature. This widget fills that gap with a lightweight, low-friction entry point directly on the dashboard — no navigation required, no separate page.

The widget lets users log 3 things they're grateful for each day, creating a daily rhythm that integrates with the existing mood insights system. Over time, gratitude data enables correlations ("On days you practiced gratitude, your mood averaged Good") that reinforce the habit and demonstrate its impact on emotional healing.

## User Stories

As a **logged-in user**, I want to quickly log what I'm grateful for each day without leaving the dashboard so that I can build a daily gratitude habit as part of my spiritual growth.

As a **logged-in user**, I want to see how my gratitude practice correlates with my mood so that I'm encouraged to continue counting my blessings.

As a **logged-in user**, I want to earn faith points for practicing gratitude so that it's recognized as part of my daily worship activities.

## Requirements

### Data Model

- localStorage key: `wr_gratitude_entries`
- Stores a JSON array of gratitude entry objects:
  - `id`: UUID (generated via `crypto.randomUUID()`)
  - `date`: string in `YYYY-MM-DD` format (local timezone via `getLocalDateString()`)
  - `items`: array of 1-3 strings (each max 150 characters, non-empty entries only)
  - `createdAt`: ISO 8601 timestamp
- Maximum 365 entries stored; oldest entries pruned on write when the limit is exceeded
- Storage service follows existing patterns: pure functions, typed interfaces, corrupted data recovery (try/catch JSON parse, fallback to empty array)
- All localStorage writes are no-ops when the user is not authenticated

### Widget Card — "Today's Gratitude"

- Positioned in the dashboard widget grid **after the Prayer List widget** (order 6.5 — between Prayer List and Streak & Faith Points in the left column, `lg:col-span-3`)
- Uses the existing `DashboardCard` component
- Card heading: "Today's Gratitude"
- Card icon: Lucide `Heart` icon in pink (`text-pink-400`)
- Card is collapsible (default behavior from `DashboardCard`)

### Input Fields

- 3 single-line text input fields, stacked vertically
- Each input has a small numbered heart icon to the left (1, 2, 3) — numbers rendered inside or beside a small heart shape in `text-pink-400`
- Max 150 characters per input (enforced via `maxLength` attribute)
- No character counter needed (inputs are short enough that users self-regulate)

### Rotating Placeholder Text

Placeholders rotate daily using the same day-of-year modulo pattern used by Verse of the Day:

**Field 1** cycles through:
1. "A person I'm thankful for..."
2. "Something that made me smile..."
3. "A blessing I noticed today..."

**Field 2** cycles through:
1. "A moment of peace today..."
2. "Something I learned..."
3. "A prayer God answered..."

**Field 3** cycles through:
1. "Something beautiful I saw..."
2. "A way God showed up..."
3. "Something I don't want to forget..."

Rotation formula: `Math.floor((dayOfYear) / 1) % 3` for each field (all three rotate together — the same day shows placeholder set 0, 1, or 2 for all fields).

### Save Behavior

- "Save" button below the 3 inputs (primary style, small size)
- Button is **disabled** until at least 1 field has non-empty text (after trimming whitespace)
- On save:
  1. All non-empty entries (trimmed) are saved to `wr_gratitude_entries` as a new object
  2. Oldest entries beyond 365 are pruned
  3. The `gratitude` activity is recorded via `recordActivity('gratitude')` (awards 5 faith points)
  4. Inputs become read-only with a subtle green checkmark (Lucide `Check` in `text-success`) next to each filled entry
  5. Save button text changes to "Saved" (disabled state, green text `text-success`)
  6. A success toast fires: "Gratitude logged! Thank you for counting your blessings." (success tier — no confetti, no overlay)

### Returning Same Day (Already Saved)

- If the user has already saved today's gratitude (detected by checking `wr_gratitude_entries` for an entry matching today's date), show the saved entries as read-only text with green checkmarks instead of empty inputs
- Show an "Edit" button (secondary/text style) that re-enables the fields with the saved values pre-filled
- On re-save after editing: update the existing entry for today's date (overwrite `items` array, update `createdAt`), show confirmation toast, return to read-only state
- The `gratitude` activity is NOT re-awarded on edit (already earned today)

### Faith Points Integration

- Add `gratitude` as a new activity key in the daily activity tracking system:
  - Add to `ActivityType` union type: `'gratitude'`
  - Add to `ACTIVITY_POINTS`: `gratitude: 5`
  - Add to `DailyActivities` interface: `gratitude: boolean`
  - Add to `ACTIVITY_DISPLAY_NAMES`: `gratitude: 'Gave thanks'`
  - Add to `ACTIVITY_CHECKLIST_NAMES`: `gratitude: 'Give thanks'`
  - Add to `ALL_ACTIVITY_TYPES` array
- Gratitude is worth **5 faith points** (same as mood check-in — lightweight daily practices)
- It does NOT replace the journal activity (journaling is separate and worth 25 pts)
- The gratitude activity contributes to the daily checklist multiplier tiers

### Activity Checklist Integration

- Add gratitude as a new item in the `ActivityChecklist` widget
- Display label: "Give thanks" with "+5 pts"
- This item **always shows** (unlike the reading plan item which is conditional on having an active plan)
- Position in the checklist: after `prayerWall` (15 pts) and before `meditate` (20 pts) — follows the ascending-points ordering pattern
- Update the progress ring denominator and "Full Worship Day" thresholds to account for the new activity (7 base activities when no reading plan, 8 when reading plan is active)

### Insights Page Integration

- On the `/insights` page, add a gratitude correlation to the activity correlations section
- Pattern matches existing correlations (journal, meditation, etc.): "On days you practiced gratitude, your mood averaged X"
- Use the same mock data display pattern as other correlations (hardcoded mock insight card)
- Add a "Gratitude streak" stat: count of consecutive days with gratitude entries, displayed alongside the existing streak information if the user has 2+ consecutive gratitude days

### Landing Page Integration

- Add gratitude to the `JourneySection` step list as step 3.5 — between Meditate (step 3) and Music (step 4)
- Step text: "Give Thanks — Count your blessings and watch your perspective shift"
- Step links to the dashboard (`/`) since gratitude lives on the dashboard, not its own page

## Auth & Persistence

- **Logged-out (demo mode)**: The dashboard is entirely auth-gated. Logged-out users see the landing page at `/` and never encounter the gratitude widget. Zero data persistence.
- **Logged-in**: Full access. Data stored in `wr_gratitude_entries` localStorage key. `recordActivity('gratitude')` call updates `wr_daily_activities`. `logout()` clears auth state but preserves gratitude data (consistent with existing behavior).
- **Route type**: No new routes. The widget lives on the dashboard (`/`), which is already a protected route.

## AI Safety Considerations

- **Crisis detection needed?**: Yes — all 3 text inputs accept free-form text. Even though inputs are short (150 chars), crisis keyword detection must be applied. Use the same `containsCrisisKeyword()` check from `constants/crisis-resources.ts` used by the journal textarea.
- **Crisis detection behavior**: If any of the 3 inputs contains a crisis keyword, show the `CrisisBanner` component above the inputs. The entry can still be saved (same pattern as journal — we don't block the save, we show resources).
- **User input involved?**: Yes — three text input fields, each max 150 characters
- **AI-generated content?**: No — all content is user-authored

## UX & Design Notes

- **Tone**: Warm and inviting. The gratitude widget should feel like a gentle daily ritual, not a chore. The pink heart icons and rotating placeholders create a sense of variety and delight.
- **Colors**: Pink accent (`text-pink-400`) for heart icons and numbered indicators. Standard dashboard frosted glass card. Success green (`#27AE60`) for checkmarks and saved state. Primary violet for the Save button.
- **Typography**: Inter (sans-serif) for all text. Placeholder text in standard muted style.
- **Animations**: Gentle transitions — input to read-only state fades, checkmarks appear with subtle scale-up. All animations respect `prefers-reduced-motion`. No elaborate celebrations (the toast is sufficient).

### Design System References

- **Dashboard card**: Uses existing `DashboardCard` component — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` with `p-4 md:p-6`
- **Input fields**: Dark-themed inputs matching the dashboard aesthetic — `bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30` with focus state `focus:border-primary focus:ring-1 focus:ring-primary`
- **Save button**: Primary CTA style from design system — `bg-primary text-white font-semibold rounded-lg` in small size variant
- **Toast**: Uses existing `useToast()` hook with success type
- **Checkmark**: Lucide `Check` icon in `text-success` (`#27AE60`)

**New visual patterns introduced:**
1. **Numbered heart icons** — small pink hearts with numbers (1, 2, 3) as input field prefixes. Not used elsewhere in the app. Simple implementation: a span with the number inside/beside a small Lucide Heart icon.

## Responsive Behavior

### Mobile (< 640px)
- All 3 inputs stack vertically, full width within the card padding
- Heart number icons remain to the left of each input
- Save/Edit button spans full width
- CrisisBanner (if triggered) spans full card width
- Touch targets on inputs and button meet 44px minimum height

### Tablet (640–1024px)
- Same vertical stacking as mobile within the card
- Card follows the single-column dashboard layout at this breakpoint
- Slightly more horizontal padding from the card

### Desktop (> 1024px)
- 3 inputs stacked vertically within the card (NOT side-by-side — vertical stacking feels more like a journal, per spec requirement)
- Card sits in the left column of the 2-column dashboard grid (`lg:col-span-3`)
- Save/Edit button is small size, left-aligned (not full width)

## Acceptance Criteria

### Data Model & Storage
- [ ] `wr_gratitude_entries` localStorage key stores a JSON array of gratitude entry objects
- [ ] Each entry has: `id` (UUID), `date` (YYYY-MM-DD local timezone), `items` (array of 1-3 strings), `createdAt` (ISO timestamp)
- [ ] Storage service uses pure functions with typed interfaces and corrupted data recovery (try/catch JSON parse, fallback to empty array)
- [ ] Maximum 365 entries enforced — oldest entries pruned when limit exceeded
- [ ] All localStorage writes are no-ops when the user is not authenticated
- [ ] Date handling uses `getLocalDateString()` from `utils/date.ts` (never UTC-based date splitting)

### Widget Card
- [ ] "Today's Gratitude" card appears on the dashboard after the Prayer List widget
- [ ] Card heading displays "Today's Gratitude" with a pink Heart icon (`text-pink-400`)
- [ ] Card uses existing `DashboardCard` component with frosted glass styling
- [ ] Card is collapsible (default `DashboardCard` behavior)
- [ ] Card participates in the dashboard staggered entrance animation

### Input Fields
- [ ] 3 single-line text inputs displayed, stacked vertically
- [ ] Each input has a numbered heart icon (1, 2, 3) in pink to the left
- [ ] Inputs enforce max 150 characters via `maxLength`
- [ ] Placeholder text rotates daily using day-of-year modulo pattern (3 placeholder sets)
- [ ] On mobile, inputs are full width; on desktop, inputs are full width within the card column

### Save Flow
- [ ] Save button is disabled when all 3 inputs are empty (after trimming whitespace)
- [ ] Save button is enabled when at least 1 input has non-empty text
- [ ] Clicking Save stores non-empty entries to `wr_gratitude_entries`
- [ ] After saving, inputs become read-only with green checkmarks next to filled entries
- [ ] After saving, Save button changes to "Saved" in green text, disabled
- [ ] After saving, a success toast fires: "Gratitude logged! Thank you for counting your blessings."
- [ ] After saving, `recordActivity('gratitude')` is called to award 5 faith points

### Already-Saved State
- [ ] If today's gratitude is already saved, the widget shows saved entries as read-only text with checkmarks
- [ ] An "Edit" button appears in the already-saved state
- [ ] Clicking "Edit" re-enables the fields with saved values pre-filled
- [ ] Re-saving after edit updates the existing entry (overwrites items, updates timestamp)
- [ ] Re-saving does NOT re-award the `gratitude` faith points activity

### Faith Points Integration
- [ ] `gratitude` is added to the `ActivityType` union type
- [ ] `ACTIVITY_POINTS` includes `gratitude: 5`
- [ ] `DailyActivities` interface includes `gratitude: boolean`
- [ ] `ACTIVITY_DISPLAY_NAMES` includes `gratitude: 'Gave thanks'`
- [ ] `ACTIVITY_CHECKLIST_NAMES` includes `gratitude: 'Give thanks'`
- [ ] `ALL_ACTIVITY_TYPES` includes `'gratitude'`

### Activity Checklist Integration
- [ ] "Give thanks" appears in the Activity Checklist widget with "+5 pts"
- [ ] The item always shows (not conditional like reading plan)
- [ ] The item is positioned between prayerWall (15 pts) and meditate (20 pts) in the list
- [ ] Progress ring denominator updates to reflect the new total activity count
- [ ] "Full Worship Day" multiplier thresholds account for the additional activity

### Insights Page Integration
- [ ] A gratitude correlation mock insight card appears on `/insights`: "On days you practiced gratitude, your mood averaged X"
- [ ] A "Gratitude streak" stat displays when the user has 2+ consecutive days of gratitude entries

### Landing Page Integration
- [ ] A new step appears in the JourneySection between Meditate and Music
- [ ] Step text: "Give Thanks — Count your blessings and watch your perspective shift"
- [ ] Step links to the dashboard (`/`)

### Crisis Detection
- [ ] Crisis keyword detection runs on all 3 input fields (using `containsCrisisKeyword()`)
- [ ] `CrisisBanner` displays above the inputs when crisis keywords are detected in any field
- [ ] Crisis detection does not block saving (same pattern as journal)

### Accessibility
- [ ] All inputs have associated labels (visually hidden labels or `aria-label`)
- [ ] All interactive elements have minimum 44px touch targets
- [ ] Keyboard users can Tab through all inputs and the Save/Edit button
- [ ] Screen readers announce the save confirmation and state changes
- [ ] `CrisisBanner` uses `role="alert"` with `aria-live="assertive"`
- [ ] Animations respect `prefers-reduced-motion`

## Out of Scope

- Separate `/gratitude` page or route — gratitude lives exclusively on the dashboard widget
- Viewing past gratitude entries (history/timeline view) — future enhancement
- AI-generated gratitude prompts or suggestions — future enhancement
- Sharing gratitude entries to Prayer Wall or social features
- Backend API persistence (Phase 3+ — data stays in localStorage)
- Gratitude-specific badges (e.g., "30 days of gratitude") — could be added to badge definitions later
- Gratitude entry search or filtering
- Export/import of gratitude data
- Gratitude reminders or push notifications
- Integration with journal (auto-creating journal entries from gratitude)
- Character counter on inputs (intentionally omitted — 150 chars is short enough)
