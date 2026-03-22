# Feature: Evening Reflection Prompt

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec extends `wr_mood_entries` with a `timeOfDay` field
- Cross-spec dependencies: Spec 1 (Mood Check-In) owns the morning check-in and `MoodEntry` type; Spec 5 (Streak & Faith Points) provides `recordActivity()` and `ActivityType`; Spec 27 (Gratitude Dashboard Widget) owns `wr_gratitude_entries` and the gratitude input pattern; Spec 10 (KaraokeText) provides word-by-word verse reveal
- Shared constants: Mood colors (Spec 1), activity points (Spec 5), existing `ACTIVITY_POINTS` and `ALL_ACTIVITY_TYPES` arrays

---

## Overview

The morning mood check-in opens the user's day with God; the evening reflection closes it. This feature adds an optional end-of-day reflection experience that appears on the dashboard after 6 PM local time when the user has been active that day. It bookends the daily spiritual rhythm — morning check-in + daytime activities + evening reflection — creating a complete daily worship cycle that mirrors traditional Christian practices of morning and evening prayer.

The evening reflection captures a second mood data point, reviews the day's spiritual activities, offers a gratitude moment, and closes with a rotating evening prayer and scripture. This creates richer mood data (morning vs. evening trends) and encourages a nighttime wind-down routine connected to the Sleep & Rest content.

---

## User Stories

- As a **logged-in user**, I want to reflect on my day in the evening so that I can close my day with gratitude and prayer, bookending the morning check-in.
- As a **logged-in user**, I want to see how my mood changed from morning to evening so that I can notice patterns in my emotional and spiritual well-being.
- As a **logged-in user**, I want a gentle evening prompt that I can dismiss without guilt so that the reflection feels like an invitation, not an obligation.
- As a **logged-in user**, I want the evening reflection to connect me to bedtime content so that my spiritual wind-down naturally flows into restful sleep.

---

## Requirements

### Banner — "Evening Reflection"

**Trigger conditions (ALL must be met):**
1. User is authenticated
2. Current local time is 6:00 PM or later
3. User has completed at least one tracked activity today (mood check-in, prayer, journal, meditation, listen, prayerWall, readingPlan, gratitude — any item in the daily activities log)
4. User has NOT dismissed or completed the evening reflection today (checked via `wr_evening_reflection` localStorage key containing today's date string)

**Banner placement:**
- Positioned below the `DashboardHero` and above the widget grid
- Below the weekly summary banner if present
- Below the Getting Started checklist if present
- Full width of the content area

**Banner design:**
- Background: `bg-indigo-900/30`
- Border: `border border-indigo-400/20`
- Rounded: `rounded-2xl`
- Padding: `p-4 md:p-6`
- Icon: Lucide `Moon` in `text-indigo-300`, positioned to the left of the text
- Heading: "Evening Reflection" in `text-white font-semibold text-lg`
- Subheading: "Take a moment to close your day with God." in `text-white/70 text-sm`
- "Reflect Now" button: primary style (`bg-primary text-white rounded-lg`)
- "Not tonight" dismiss link: `text-white/40 text-sm hover:text-white/60` — understated, not a button

**Dismiss behavior:**
- Clicking "Not tonight" stores today's date string (from `getLocalDateString()`) to `wr_evening_reflection` localStorage key
- Banner does not reappear until the next day after 6 PM
- Dismissing earns no faith points

**Time-of-day check:**
- Use `new Date().getHours() >= 18` for the 6 PM threshold
- Check is performed on component mount only (not reactively — same pattern as mood check-in midnight rollover guard)

### Full-Screen Overlay — 4-Step Evening Reflection

Clicking "Reflect Now" opens a full-screen overlay with the same dark background as the morning mood check-in (dark radial gradient — deep purple center to near-black edges, matching the design system recon hero gradient values).

**Navigation controls:**
- Steps 2–4: Back button (top-left) to revisit previous steps
- All steps: X close button (top-right) to dismiss entirely (marks as dismissed for today via `wr_evening_reflection`, no points earned)
- Step indicators: 4 small dots at the bottom showing current progress (filled dot for current step, hollow for others)

### Step 1 — "How are you feeling now?"

- Prompt: "How has your day been?" in warm serif typography (`font-serif text-2xl md:text-3xl text-white/90`)
- Display the same 5 mood orbs as the morning check-in: Struggling (#D97706), Heavy (#C2703E), Okay (#8B7FA8), Good (#2DD4BF), Thriving (#34D399)
- Same orb behavior: 56px mobile / 64px desktop, idle pulse, hover glow, selected scale 1.15x + unselected fade to 30% opacity
- Selecting a mood advances to Step 2 (same auto-advance pattern as the morning check-in after mood selection, but without the textarea — evening is quicker)
- **Data storage:** The evening mood is stored as a new entry in `wr_mood_entries` with all existing `MoodEntry` fields plus a new `timeOfDay` field:
  - `timeOfDay: 'evening'` for evening entries
  - `timeOfDay: 'morning'` for morning entries (backwards-compatible: existing entries without `timeOfDay` are treated as `'morning'`)
  - The `verseSeen` field stores the closing verse reference from Step 4 (set when the reflection is completed, not during Step 1)

### Step 2 — "Today's highlights"

- Heading: "Today's Highlights" in serif typography
- **Activity summary:** Show a list of activities completed today, each with a green checkmark (Lucide `Check` in `text-success`):
  - Pull from the daily activities log (`wr_daily_activities` for today's date)
  - Display using `ACTIVITY_DISPLAY_NAMES` (e.g., "Logged mood", "Prayed", "Journaled", etc.)
  - Show only completed activities (boolean `true`), not uncompleted ones
- **Faith points earned:** Display today's total points earned (from `wr_daily_activities[today].pointsEarned`) in a highlighted stat: "[N] faith points earned today"
- **Streak status:** Show current streak count with flame icon (🔥): "Day [N] streak" — same display pattern as dashboard hero
- **Optional textarea:** Below the summary, a textarea with:
  - Placeholder: "What was the best part of your day?"
  - Max 500 characters with live character counter
  - Crisis keyword detection (same `containsCrisisKeyword()` pattern as morning check-in and journal)
  - If crisis keywords detected, show `CrisisBanner` above the textarea
  - This text is saved as the `text` field on the evening `MoodEntry`
  - Optional — user can skip by clicking Next without entering text
- **Next button:** Primary CTA style, always enabled (text is optional)

### Step 3 — "Gratitude moment"

- Heading: "Gratitude Moment" in serif typography

**If user has NOT filled in the gratitude widget today** (check `wr_gratitude_entries` for an entry matching today's date):
- Show 3 quick gratitude text inputs inline, matching the pattern from the Gratitude Dashboard Widget (Spec 27):
  - Numbered heart icons (1, 2, 3) in `text-pink-400`
  - Max 150 characters per input
  - Same rotating placeholder text as the gratitude widget (day-of-year modulo pattern)
  - Crisis keyword detection on all 3 inputs
- Saving these entries writes to `wr_gratitude_entries` and calls `recordActivity('gratitude')` (same as the dashboard widget)
- "Next" button below inputs

**If user HAS already filled in gratitude today:**
- Show their saved entries as read-only text with green checkmarks
- Message: "You already counted your blessings today" with a green checkmark icon
- "Next" button below

### Step 4 — "Closing prayer"

- Heading: "Closing Prayer" in serif typography

**Evening prayer display:**
- Display a short evening prayer in Lora italic (`font-serif italic`)
- Rotate through 7 hardcoded evening prayers, one per day of the week (day-of-week index: 0=Sunday through 6=Saturday)
- All prayers are original content written in a gentle second-person voice ("May you...", "Rest in...", "As you close your eyes...")

**7 Evening Prayers (original content):**

| Day | Prayer |
|-----|--------|
| Sunday | "May the peace of this Lord's day stay with you through the night. You have worshipped, you have rested, and God is pleased with your faithfulness. Sleep now in the shelter of His love." |
| Monday | "As this new week begins, release every worry into God's hands. He has already gone before you into tomorrow. Tonight, simply rest — you have done enough for today." |
| Tuesday | "You have carried much today, and God sees every effort. Lay your burdens down at the foot of the cross. His strength will be renewed in you by morning." |
| Wednesday | "Halfway through the week, pause and breathe. God's mercies are new every morning, and tonight His peace guards your heart. You are held, you are known, you are loved." |
| Thursday | "Thank you for showing up today — for every prayer whispered, every kindness given, every moment you chose faith over fear. Rest well in the arms of your Father." |
| Friday | "The week is nearly done, and you have persevered. Let gratitude fill your heart as you reflect on God's faithfulness. He who began a good work in you will carry it to completion." |
| Saturday | "As this day of rest draws to a close, let stillness wash over you. God delights in you — not for what you have done, but for who you are. Sleep deeply, beloved." |

**"Goodnight" button:**
- After reading the prayer, a "Goodnight" button appears (primary style)
- Clicking "Goodnight" triggers a KaraokeText word-by-word reveal of the closing verse

**7 Closing Verses (WEB translation, rotate by day of week):**

| Day | Verse | Reference |
|-----|-------|-----------|
| Sunday | "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you." | Isaiah 26:3 |
| Monday | "In peace I will both lay myself down and sleep, for you alone, Lord, make me live in safety." | Psalm 4:8 |
| Tuesday | "He who keeps you will not slumber." | Psalm 121:3 |
| Wednesday | "When you lie down, you will not be afraid. Yes, you will lie down, and your sleep will be sweet." | Proverbs 3:24 |
| Thursday | "He who dwells in the secret place of the Most High will rest in the shadow of the Almighty." | Psalm 91:1 |
| Friday | "On my bed I remember you. I think about you in the watches of the night." | Psalm 63:6 |
| Saturday | "Come to me, all you who labor and are heavily burdened, and I will give you rest." | Matthew 11:28 |

**After verse reveal completes:**
- Two buttons appear below the verse:
  - "Go to Sleep & Rest" — links to `/music?tab=sleep` (connecting evening reflection to bedtime content). Secondary/outline style.
  - "Done" — closes the overlay and returns to the dashboard. Primary style.
- Completing Step 4 (reaching this final state) triggers:
  1. Store today's date to `wr_evening_reflection` localStorage key (prevents re-showing)
  2. Call `recordActivity('reflection')` to award 10 faith points
  3. Set the `verseSeen` field on the evening mood entry to the closing verse reference
  4. The evening mood entry (from Step 1) is finalized and written to `wr_mood_entries`

### Faith Points & Activity Integration

**New activity type: `reflection`**
- Add `'reflection'` to the `ActivityType` union type
- Add to `ACTIVITY_POINTS`: `reflection: 10`
- Add to `DailyActivities` interface: `reflection: boolean`
- Add to `ACTIVITY_DISPLAY_NAMES`: `reflection: 'Evening reflection'`
- Add to `ACTIVITY_CHECKLIST_NAMES`: `reflection: 'Evening reflection'`
- Add to `ALL_ACTIVITY_TYPES` array
- Update `MAX_DAILY_BASE_POINTS` to include the new 10 points
- Update `MAX_DAILY_POINTS` accordingly
- Update `MULTIPLIER_TIERS` thresholds to account for 9 total activities

**Activity Checklist widget integration:**
- Add "Evening reflection" as a new item showing "+10 pts"
- This item is **only visible after 6 PM local time** (same time-of-day check as the banner)
- Position: last in the checklist (since it can only be completed in the evening)

**Streak contribution:**
- Completing the evening reflection counts as daily activity for streak purposes
- The evening reflection alone keeps the streak alive even if the user didn't do any morning activities (grace mechanic — the evening reflection is a valid daily touchpoint)

### Mood Data Extension

**`MoodEntry` type extension:**
- Add optional field: `timeOfDay?: 'morning' | 'evening'`
- Existing entries without `timeOfDay` are treated as `'morning'` (backwards compatible)
- Morning check-in entries should set `timeOfDay: 'morning'` going forward
- Evening reflection entries set `timeOfDay: 'evening'`

**localStorage key:** `wr_mood_entries` (same key — evening entries are added alongside morning entries)

### Insights Page Integration

**Mood trend chart updates:**
- When both morning and evening mood entries exist for a day, show two data points for that day:
  - Morning dot at its mood level position
  - Evening dot at its mood level position
  - A vertical line connecting the two dots (thin, semi-transparent white, ~1px)
- When only one entry exists for a day (morning or evening), show a single dot as before
- Morning dots use the existing mood-colored dot style
- Evening dots use the same mood-colored dot style but with a subtle ring/outline to distinguish them visually (e.g., a 2px white ring around the dot)

**New insight card:**
- "Your mood tends to [improve/decline] by evening" based on the average difference between morning and evening moods over the selected time range
- Only displayed when the user has at least 5 days with both morning and evening entries
- If average evening mood > average morning mood: "Your mood tends to improve by evening — your daily practices are making a difference!"
- If average evening mood < average morning mood: "Your mood tends to dip by evening — consider adding a restful practice to your afternoon routine."
- If average evening mood ≈ average morning mood (difference < 0.3): "Your mood stays steady throughout the day — a sign of emotional resilience."

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes — Step 2 has a 500-character textarea, and Step 3 has 3 gratitude text inputs (150 chars each)
- **User input involved?**: Yes — textarea in Step 2 ("What was the best part of your day?") and gratitude inputs in Step 3
- **AI-generated content?**: No — all prayers and verses are hardcoded constants, not AI-generated
- **Crisis keyword handling:** Use the existing `containsCrisisKeyword()` function from `crisis-resources.ts`. If crisis keywords detected:
  - Step 2: Show `CrisisBanner` above the textarea (same pattern as morning check-in and journal)
  - Step 3: Show `CrisisBanner` above the gratitude inputs (same pattern as Gratitude Widget)
  - The mood entry and reflection are still saved (mood selection is valid even during crisis)
  - Crisis detection does not block advancing to the next step

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Never see the evening reflection** — the dashboard is entirely auth-gated. Logged-out users see the landing page at `/`. Zero data persistence.

### Logged-in users:
- See the evening reflection banner after 6 PM when they've been active today
- Evening mood entry saved to `wr_mood_entries` in localStorage
- Step 2 text saved as the `text` field on the evening mood entry
- Step 3 gratitude saved to `wr_gratitude_entries` (if not already saved today)
- Reflection completion saved to `wr_evening_reflection` with today's date
- `recordActivity('reflection')` updates `wr_daily_activities`

### Route type:
- No new routes. The banner and overlay are rendered within the Dashboard component at `/`, which is already auth-gated.

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Evening reflection banner | Not visible (landing page shown instead) | Visible after 6 PM if conditions met |
| "Reflect Now" button | Not visible | Opens the 4-step reflection overlay |
| "Not tonight" dismiss | Not visible | Dismisses banner for today |
| Mood orbs (Step 1) | Not visible | Selectable; stores evening mood |
| Textarea (Step 2) | Not visible | Optional; 500-char limit |
| Gratitude inputs (Step 3) | Not visible | 3 inputs or read-only if already saved |
| Prayer + verse (Step 4) | Not visible | Displays prayer and KaraokeText verse |
| "Go to Sleep & Rest" CTA | Not visible | Links to `/music?tab=sleep` |
| "Done" button | Not visible | Closes overlay, awards points |
| X close button | Not visible | Dismisses reflection (no points) |

---

## UX & Design Notes

### Visual Design

- **Banner**: Evening-themed with indigo tones — distinct from the purple/violet of the rest of the dashboard. The `bg-indigo-900/30` with `border-indigo-400/20` creates a moonlit, twilight feeling. The Moon icon reinforces the evening context.
- **Overlay background**: Same dark radial gradient as the morning mood check-in (deep purple center fading to near-black edges). This creates visual continuity between morning and evening rituals.
- **Step indicators**: 4 small circles at the bottom of the overlay. Current step is filled (`bg-white`), others are outlined (`border border-white/30`). Transitions between steps fade content in/out.
- **Prayer typography**: Lora italic (`font-serif italic`), `text-lg md:text-xl`, `text-white/90`. The prayer text should feel warm and intimate — like someone speaking gently to you.
- **Verse typography**: Same italic serif style as the morning encouragement verse. KaraokeText reveal uses the existing word-by-word highlight pattern.
- **"Goodnight" button**: Primary style but with a softer feel — consider `bg-indigo-600 hover:bg-indigo-500` instead of the standard primary violet, to maintain the evening indigo theme. If this conflicts with design system consistency, use standard primary.

### Design System References

- **Overlay background**: Matches the morning mood check-in gradient from the design system recon — `radial-gradient` with `rgb(59, 7, 100)` center fading through `rgb(13, 6, 32)`
- **Mood orbs**: Reuse the exact same mood orb component from the morning check-in (colors, sizes, animations, accessibility)
- **Dashboard card pattern**: Banner uses a variation of the frosted glass pattern but with indigo tones instead of white/10
- **KaraokeText**: Reuse the existing KaraokeText component from Spec 10
- **CrisisBanner**: Reuse the existing CrisisBanner component
- **Gratitude inputs**: Reuse the same input pattern from the Gratitude Dashboard Widget (Spec 27)

**New visual patterns introduced:**
1. **Indigo banner** — `bg-indigo-900/30 border-indigo-400/20` evening-themed card. Not used elsewhere. Simple pattern — no complex CSS.
2. **Step progress dots** — 4 small circles showing flow progress. Not currently used in the app (the morning check-in doesn't have visible step indicators). Simple implementation: `flex gap-2` row of 8px circles.
3. **Dual-dot mood chart points** — morning + evening dots connected by a vertical line on the insights chart. New Recharts rendering pattern.

### Animations

- **Banner entrance**: Fade-in when dashboard loads (same staggered animation pattern as other dashboard widgets)
- **Overlay entrance**: Fade-in from black (opacity 0→1, 400ms ease-in-out)
- **Step transitions**: Content fades out (200ms), new content fades in (300ms)
- **Mood orb interactions**: Same animations as morning check-in (pulse, hover glow, selection scale)
- **KaraokeText verse reveal**: Existing word-by-word highlight animation from Spec 10
- **`prefers-reduced-motion`**: All animations disabled. Step transitions become instant. Mood orb pulse disabled. KaraokeText reveals all words at once.

---

## Responsive Behavior

### Mobile (< 640px)
- **Banner**: Full width, stacked layout — Moon icon + text above, "Reflect Now" button and "Not tonight" link below. Button is full width. Touch targets ≥ 44px.
- **Overlay**: Full viewport height and width (`fixed inset-0`). Content centered vertically with `px-4` side padding.
- **Mood orbs**: 56px diameter, 2 rows — 3 on top (Struggling, Heavy, Okay), 2 on bottom centered (Good, Thriving). Same layout as morning check-in.
- **Step 2 activity summary**: Single column list of completed activities. Textarea full width.
- **Step 3 gratitude inputs**: Full width, stacked vertically with heart icons.
- **Step 4 prayer text**: Full width, comfortable reading line length via padding.
- **Step 4 buttons**: Stacked vertically, full width. "Done" on top, "Go to Sleep & Rest" below.
- **Navigation**: Back button and X close button are in a fixed top bar within the overlay. Step dots at the bottom.

### Tablet (640–1024px)
- **Banner**: Horizontal layout — Moon icon + text on the left, "Reflect Now" button on the right. "Not tonight" link below the button.
- **Overlay**: Same as mobile but content area max-width ~600px centered.
- **Mood orbs**: 60px diameter, single horizontal row (5 across).
- **Step 4 buttons**: Side by side, not full width.

### Desktop (> 1024px)
- **Banner**: Same horizontal layout as tablet, comfortably spaced within the dashboard content width.
- **Overlay**: Content max-width ~640px centered. Generous vertical spacing.
- **Mood orbs**: 64px diameter, single horizontal row with generous spacing.
- **Step 2**: Activity summary in a clean list. Textarea at comfortable reading width.
- **Step 4 buttons**: Side by side with spacing.
- **All interactive elements**: Visible focus rings for keyboard users.

---

## Edge Cases

- **Time zone handling**: Use `new Date().getHours()` for local time check (browser timezone). Do not use UTC.
- **No activities today**: If user has no completed activities, the banner does not appear (even after 6 PM). This prevents showing the reflection to users who haven't engaged at all.
- **Morning check-in not done**: The evening reflection can still appear if other activities were completed (e.g., prayed, journaled). The banner checks `wr_daily_activities` for any `true` value, not specifically the mood check-in.
- **Already dismissed today**: If `wr_evening_reflection` contains today's date, the banner doesn't show regardless of time or activity.
- **Already completed today**: Same check — if the reflection was completed (which also writes today's date), the banner doesn't reappear.
- **Midnight rollover during reflection**: If the user starts the reflection before midnight and finishes after, the reflection should still complete normally. The date used is the date when "Reflect Now" was clicked, not the current time at each step.
- **Multiple tabs**: localStorage is shared. Dismissing/completing in one tab should prevent the banner from showing in other tabs on next mount.
- **Step 3 gratitude race condition**: If the user completes gratitude in the dashboard widget between opening the reflection and reaching Step 3, Step 3 should show the read-only "already counted" state (re-check `wr_gratitude_entries` on Step 3 mount).
- **Backwards compatibility**: Existing `MoodEntry` objects without `timeOfDay` should be treated as `'morning'` entries. Never crash on missing field.
- **Empty daily activities**: If `wr_daily_activities` has no entry for today, treat as "no activities completed" (banner hidden).

---

## Acceptance Criteria

### Banner Display
- [ ] Banner appears on the dashboard when: user is authenticated, local time ≥ 6 PM, at least one daily activity is completed, and the reflection has not been dismissed or completed today
- [ ] Banner does NOT appear before 6 PM local time
- [ ] Banner does NOT appear when no daily activities have been completed
- [ ] Banner does NOT appear when `wr_evening_reflection` contains today's date (dismissed or completed)
- [ ] Banner is positioned below DashboardHero, below weekly summary banner (if present), below Getting Started checklist (if present), and above the widget grid
- [ ] Banner uses `bg-indigo-900/30 border border-indigo-400/20 rounded-2xl` styling
- [ ] Moon icon displays in `text-indigo-300`
- [ ] Heading reads "Evening Reflection" and subheading reads "Take a moment to close your day with God."
- [ ] "Reflect Now" button uses primary style
- [ ] "Not tonight" dismiss link is understated (`text-white/40 text-sm`)

### Dismiss Behavior
- [ ] Clicking "Not tonight" stores today's date string to `wr_evening_reflection` localStorage key
- [ ] After dismissing, the banner does not reappear for the rest of the day
- [ ] Dismissing earns no faith points

### Overlay — General
- [ ] Clicking "Reflect Now" opens a full-screen overlay with dark radial gradient background matching the morning mood check-in
- [ ] X close button appears on all 4 steps (top-right)
- [ ] Clicking X dismisses the reflection (stores today's date to `wr_evening_reflection`, no points earned)
- [ ] Back button appears on steps 2, 3, and 4 (top-left) to return to previous step
- [ ] Step progress dots (4 dots) display at the bottom, current step filled, others outlined
- [ ] All animations respect `prefers-reduced-motion` (instant transitions when reduced motion preferred)

### Step 1 — Mood Selection
- [ ] Prompt displays "How has your day been?" in warm serif typography
- [ ] All 5 mood orbs render with correct colors: Struggling (#D97706), Heavy (#C2703E), Okay (#8B7FA8), Good (#2DD4BF), Thriving (#34D399)
- [ ] Orb sizes: 56px mobile, 60px tablet, 64px desktop
- [ ] Selecting a mood orb scales it to 1.15x, fades others to 30%, and auto-advances to Step 2
- [ ] Mood selection creates an evening mood entry (not yet written to localStorage — finalized at Step 4 completion)

### Step 2 — Today's Highlights
- [ ] Shows a list of completed activities with green checkmarks and display names
- [ ] Shows faith points earned today as a highlighted stat
- [ ] Shows current streak count with flame icon
- [ ] Textarea has placeholder "What was the best part of your day?" and 500-character limit with live counter
- [ ] Crisis keyword detection runs on textarea input; `CrisisBanner` shown if detected
- [ ] "Next" button is always enabled (textarea is optional)
- [ ] Text from the textarea is saved as the `text` field on the evening mood entry

### Step 3 — Gratitude Moment
- [ ] If no gratitude entry exists for today: shows 3 text inputs with numbered heart icons, max 150 chars each, rotating placeholders
- [ ] If gratitude was already saved today: shows saved entries as read-only text with green checkmarks and message "You already counted your blessings today"
- [ ] New gratitude entries are saved to `wr_gratitude_entries` and `recordActivity('gratitude')` is called
- [ ] Crisis keyword detection runs on gratitude inputs; `CrisisBanner` shown if detected
- [ ] "Next" button advances to Step 4

### Step 4 — Closing Prayer
- [ ] Displays an evening prayer in Lora italic, rotating by day of the week (7 unique prayers)
- [ ] "Goodnight" button appears below the prayer
- [ ] Clicking "Goodnight" triggers KaraokeText word-by-word reveal of the closing verse (7 verses rotating by day of week, all WEB translation)
- [ ] After verse reveal completes, two buttons appear: "Go to Sleep & Rest" and "Done"
- [ ] "Go to Sleep & Rest" links to `/music?tab=sleep`
- [ ] "Done" closes the overlay and returns to the dashboard
- [ ] Completing Step 4 stores today's date to `wr_evening_reflection`
- [ ] Completing Step 4 calls `recordActivity('reflection')` to award 10 faith points
- [ ] Evening mood entry (from Step 1) is written to `wr_mood_entries` with `timeOfDay: 'evening'`

### Verses (WEB Translation)
- [ ] Sunday: Isaiah 26:3
- [ ] Monday: Psalm 4:8
- [ ] Tuesday: Psalm 121:3
- [ ] Wednesday: Proverbs 3:24
- [ ] Thursday: Psalm 91:1
- [ ] Friday: Psalm 63:6
- [ ] Saturday: Matthew 11:28

### Faith Points & Activity Integration
- [ ] `'reflection'` is added to the `ActivityType` union type
- [ ] `ACTIVITY_POINTS` includes `reflection: 10`
- [ ] `DailyActivities` interface includes `reflection: boolean`
- [ ] `ACTIVITY_DISPLAY_NAMES` includes `reflection: 'Evening reflection'`
- [ ] `ACTIVITY_CHECKLIST_NAMES` includes `reflection: 'Evening reflection'`
- [ ] `ALL_ACTIVITY_TYPES` includes `'reflection'`
- [ ] `MAX_DAILY_BASE_POINTS` and `MAX_DAILY_POINTS` are updated to include the new 10 points
- [ ] "Evening reflection" appears in the Activity Checklist widget with "+10 pts"
- [ ] The checklist item is only visible after 6 PM local time
- [ ] Completing the evening reflection contributes to streak maintenance (keeps streak alive even without morning activities)

### Mood Data Extension
- [ ] `MoodEntry` type gains an optional `timeOfDay?: 'morning' | 'evening'` field
- [ ] Morning check-in sets `timeOfDay: 'morning'` on new entries
- [ ] Evening reflection sets `timeOfDay: 'evening'` on new entries
- [ ] Existing entries without `timeOfDay` are treated as `'morning'` (backwards compatible)

### Insights Page Integration
- [ ] When both morning and evening entries exist for a day, two dots appear on the mood trend chart connected by a thin vertical line
- [ ] Evening dots have a visual distinction from morning dots (e.g., 2px white ring outline)
- [ ] Insight card "Your mood tends to improve/decline by evening" appears when user has ≥ 5 days with both entries
- [ ] Insight card message is contextual: improves, declines, or stays steady (based on ≤ 0.3 average difference threshold)

### Accessibility
- [ ] Overlay has `role="dialog"` with `aria-labelledby` pointing to the step heading
- [ ] Mood buttons use `role="radiogroup"` with `role="radio"` and `aria-checked` (same as morning check-in)
- [ ] Arrow keys navigate between mood options, Enter/Space selects
- [ ] All interactive elements have minimum 44px touch targets on mobile
- [ ] X close, Back, and all buttons are keyboard-focusable with visible focus rings
- [ ] `CrisisBanner` uses `role="alert"` with `aria-live="assertive"`
- [ ] KaraokeText verse text is accessible to screen readers (announced via `aria-live`)
- [ ] Step progress dots have appropriate `aria-label` (e.g., "Step 1 of 4")
- [ ] `prefers-reduced-motion`: all animations disabled, transitions instant, KaraokeText shows full text immediately

### Responsive Layout
- [ ] Mobile (< 640px): Banner is stacked (text above, button below). Overlay content has `px-4` padding. Mood orbs at 56px in 2 rows. Step 4 buttons stacked vertically full width.
- [ ] Tablet (640–1024px): Banner is horizontal (text left, button right). Overlay max-width ~600px. Mood orbs at 60px in single row. Step 4 buttons side by side.
- [ ] Desktop (> 1024px): Same horizontal banner. Overlay max-width ~640px. Mood orbs at 64px with generous spacing. Focus rings visible on all interactive elements.

### Edge Cases
- [ ] Time check uses `new Date().getHours()` (local time, not UTC)
- [ ] Midnight rollover during reflection does not interrupt the flow (date captured on "Reflect Now" click)
- [ ] Missing `timeOfDay` on existing mood entries does not cause errors (treated as 'morning')
- [ ] Step 3 re-checks `wr_gratitude_entries` on mount (handles race condition with dashboard widget)
- [ ] Multiple tabs: dismissing in one tab prevents banner in other tabs on next mount

---

## Out of Scope

- **Separate route for evening reflection** — it's an overlay within the dashboard, not a page
- **Backend API persistence** — Phase 3+ (data stays in localStorage)
- **AI-generated evening prayers or personalized content** — prayers are hardcoded
- **Configurable reflection time** (e.g., user choosing 7 PM instead of 6 PM) — future enhancement
- **Evening reflection push notifications or reminders** — future enhancement (Phase 2.95 push notifications spec)
- **Evening reflection in the morning** (e.g., reflecting on yesterday before the new day's check-in) — future enhancement
- **Audio playback of evening prayers** — future enhancement (TTS integration)
- **Sharing evening reflections to Prayer Wall or social** — not in scope
- **Evening reflection badges** (e.g., "7-day evening reflector") — could be added to badge definitions later
- **Journaling integration** (auto-creating journal entry from reflection text) — future enhancement
- **Morning check-in modifications** beyond adding `timeOfDay: 'morning'` — the morning flow is unchanged
