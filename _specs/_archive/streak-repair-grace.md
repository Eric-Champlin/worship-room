# Feature: Streak Repair & Grace Mechanic

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec extends `wr_streak` (owned by Spec 5) and `wr_faith_points` (owned by Spec 5) with a new `wr_streak_repairs` key
- Cross-spec dependencies: Spec 5 (Streak & Faith Points Engine) owns streak logic and the `useFaithPoints` hook that this spec extends; Spec 6 (Dashboard Widgets + Activity Integration) owns the `StreakCard` component this spec modifies; Spec 8 (Celebrations & Badge Collection UI) provides the `toast-confetti` celebration tier this spec reuses for repair animations
- Shared constants: Level thresholds, level icons from Spec 6; faith points deduction requires `wr_faith_points` write access from Spec 5
- Shared utilities: `getLocalDateString()`, `getCurrentWeekStart()` from Spec 1's `utils/date.ts`; `useFaithPoints()` from Spec 5

---

## Overview

The Streak Repair & Grace Mechanic softens the blow of missed days in the streak system by offering users a way to restore a broken streak. Instead of silently resetting to zero, users see a gentle encouragement message and a one-tap option to repair their streak — embodying the theological principle that grace is built into every journey.

This feature directly aligns with the app's gentle gamification philosophy: "celebrate presence, never punish absence." A broken streak should feel like a moment of grace, not a punishment. The repair system provides one free repair per week (resetting every Monday) and allows additional repairs for 50 faith points each, creating a meaningful but not punitive cost that ties into the existing points economy.

The repair mechanic also addresses competitor parity with apps like Glorify that offer streak repair tools, positioning Worship Room's implementation within its theological framing of grace.

---

## User Stories

- As a **logged-in user**, I want to see an encouraging message when my streak resets so that I feel supported rather than punished for missing a day.
- As a **logged-in user**, I want to restore my streak with a single tap when I have a free weekly repair available so that an occasional missed day doesn't erase my progress.
- As a **logged-in user**, I want to spend 50 faith points to repair my streak when my free weekly repair is used so that I have a fallback option that still feels meaningful.
- As a **logged-in user**, I want my repaired streak to return to the value it had before the reset so that the repair truly restores my progress.
- As a **logged-in user**, I want to see a brief celebration when my streak is restored so that the moment feels encouraging and worth acknowledging.
- As a **logged-in user**, I want to know when my next free repair becomes available so that I can plan around it.

---

## Requirements

### Streak Repair Data Model

A new localStorage key `wr_streak_repairs` stores repair state:

- **`previousStreak`**: The streak value before the most recent reset. Captured at the moment the streak resets from a value > 0 to 1 (or 0). This is the value the repair restores to.
- **`lastFreeRepairDate`**: The YYYY-MM-DD date string of when the user last used their free weekly repair. Null if never used.
- **`repairsUsedThisWeek`**: Number of repairs (free + paid) used since the most recent Monday. Resets weekly.
- **`weekStartDate`**: The YYYY-MM-DD date string of the Monday that `repairsUsedThisWeek` is tracking. Used to determine when to reset the counter.

### When Streak Resets — Capture Previous Value

When the streak engine (Spec 5) detects a missed day and resets `currentStreak` to 1, it must also write the old streak value into `wr_streak_repairs.previousStreak`. This is the value the repair will restore.

- Only capture `previousStreak` when the streak is actively being reset (transitioning from a value > 1 to 1). Do not overwrite `previousStreak` if the streak is already at 0 or 1.
- If `previousStreak` is already set (from a prior reset that was never repaired), do not overwrite it — preserve the original pre-reset value so the user can still repair their longest recent streak.

### Free Weekly Repair

- Users get **one free streak repair per week**.
- The free repair resets every Monday at midnight (local time). The Monday boundary is determined by `getCurrentWeekStart()`.
- A free repair is available when: `lastFreeRepairDate` is null OR the `weekStartDate` in repair data is before the current week's Monday.
- When the user uses their free repair: set `lastFreeRepairDate` to today, increment `repairsUsedThisWeek`, update `weekStartDate` to current Monday.

### Paid Repair (50 Faith Points)

- After the free repair is used for the current week, additional repairs cost **50 faith points each**.
- The "Repair with 50 points" button is only shown when:
  1. The free repair has been used this week, AND
  2. The user has at least 50 faith points, AND
  3. A `previousStreak` value exists (there's something to repair)
- When the user pays for a repair: deduct 50 points from `wr_faith_points.totalPoints`, increment `repairsUsedThisWeek`.
- Point deduction must never cause `totalPoints` to go below 0.
- Point deduction does **not** affect the user's level — levels are based on lifetime peak, not current balance. However, since the existing system defines points as "never decrease" and "no spending mechanism," this spec introduces the first point-spending mechanic. The deduction is a simple subtraction from `totalPoints`. Level thresholds are checked against the new (lower) total, which means a user could technically lose a level. This is acceptable — spending points is a conscious choice.

### Repair Action

When a repair is triggered (free or paid):

1. Read `previousStreak` from `wr_streak_repairs`
2. Set `wr_streak.currentStreak` to `previousStreak`
3. Set `wr_streak.lastActiveDate` to today (so the streak continues from today)
4. Update `wr_streak.longestStreak` to `max(longestStreak, previousStreak)` (in case the restored streak is the longest)
5. Clear `previousStreak` from `wr_streak_repairs` (set to null) — the repair has been used
6. If paid: deduct 50 from `wr_faith_points.totalPoints` and recalculate level
7. Trigger a `toast-confetti` celebration (reusing Spec 8's celebration system)
8. Update React state so the StreakCard re-renders with the restored streak

### Repair Availability Logic

The repair option is shown in the StreakCard when ALL of these conditions are true:
- User is authenticated
- `currentStreak` is 0 or 1 (streak was recently reset)
- `previousStreak` exists and is > 1 (there's a meaningful streak to restore)
- `longestStreak` > 1 (user has had a streak before — not a brand-new user)

Within the repair section, which button appears depends on:
- **Free repair available** (not used this week): Show "Restore Streak" button
- **Free repair used, 50+ points available**: Show "Repair with 50 points" button
- **Free repair used, < 50 points**: Show only the encouragement message, no button

### StreakCard UI Integration

The repair UI appears **inline within the existing StreakCard component** when the streak is 0 or 1 and a repair is available. It replaces or augments the existing streak reset messaging (currently: "Every day is a new beginning. Start fresh today.").

**When repair is available (free):**
- Grace message: "Everyone misses a day. Grace is built into your journey."
- Below the message: "Restore Streak" button — primary CTA style, warm/encouraging color (amber or primary accent)
- Small helper text below the button: "1 free repair per week"

**When repair is available (paid):**
- Same grace message: "Everyone misses a day. Grace is built into your journey."
- Below the message: "Repair with 50 points" button — secondary CTA style, slightly less prominent than the free button
- Small helper text: "Free repair resets Monday"

**When no repair is available (used this week, not enough points):**
- Grace message: "Everyone misses a day. Grace is built into your journey."
- No button — only the message
- Small helper text: "Free repair resets Monday" (so the user knows when they can repair next)

**When no previous streak to repair (brand-new user or `previousStreak` is null):**
- Show the existing streak reset messaging as-is. No repair UI.

### Celebration on Repair

When a streak is successfully repaired, trigger a `toast-confetti` celebration:
- Toast message: "Streak restored! {previousStreak}-day streak is back!"
- Uses the existing celebration toast system from Spec 8 (dark frosted glass card, bottom-right desktop / bottom-center mobile, CSS confetti particles)
- Auto-dismisses after 5 seconds
- Falls back to basic toast when `prefers-reduced-motion` is active

### Weekly Reset Logic

The `repairsUsedThisWeek` counter resets when the current week's Monday (from `getCurrentWeekStart()`) is different from the stored `weekStartDate`:
- On any read of repair data, check if `weekStartDate` < current Monday
- If so: reset `repairsUsedThisWeek` to 0 and update `weekStartDate` to current Monday
- This lazy reset means no background timer is needed — it's checked on access

---

## UX & Design Notes

- **Tone**: Warm, grace-centered, never transactional. The repair is framed as grace, not a purchase. Even the paid option should feel like "investing in your journey" rather than "buying back your streak."
- **Colors**: The "Restore Streak" button should use a warm, encouraging color — amber/gold accent (`bg-amber-500/20 text-amber-300 hover:bg-amber-500/30`) matching the existing multiplier badge styling in the StreakCard. The "Repair with 50 points" button uses a more muted style to differentiate from the free option.
- **Typography**: Grace message in italic, warm muted text (`text-white/60 text-sm italic`) — gentle and understated, similar to the existing streak reset messaging style. Button text in `text-sm font-medium`.
- **Animations**: Button has a subtle hover scale (`hover:scale-[1.02]`). After repair, the streak number animates from 0/1 to the restored value using the existing `AnimatedCounter` component. Confetti celebration fires from the toast system.

### Responsive Behavior

**Mobile (< 640px):**
- Repair message and button stack vertically within the StreakCard
- Button is full-width within the card padding
- Touch target: minimum 44px height on the repair button
- Helper text below button, centered

**Tablet (640-1024px):**
- Same as mobile — repair section stacks vertically
- Button width auto (not full-width)

**Desktop (> 1024px):**
- Repair section fits within the right-column StreakCard
- Button width auto, left-aligned below the grace message
- Helper text inline or below the button

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature has no user text input. All content is system-generated (grace messages, button labels).
- **User input involved?**: No — the only interaction is tapping a button (Restore Streak / Repair with 50 points).
- **AI-generated content?**: No — all messages are hardcoded constants. No AI calls.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **No repair UI shown.** Logged-out users never see the dashboard, the StreakCard, or any streak data. Zero persistence applies.
- **No `wr_streak_repairs` reads or writes** for unauthenticated users.

### Logged-in users:
- Repair data persisted to `wr_streak_repairs` in localStorage.
- Repair modifies `wr_streak` (restoring currentStreak) and potentially `wr_faith_points` (deducting 50 points for paid repairs).
- `logout()` does NOT clear `wr_streak_repairs` — repair state persists like all other `wr_*` data.
- In Phase 3, this data migrates to the backend API.

### Route type:
- No dedicated route. This feature is entirely within the existing dashboard StreakCard component and streak storage service.

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Grace message | Not visible (dashboard not rendered) | Shown inline in StreakCard when streak is 0/1 and previousStreak exists |
| "Restore Streak" button | Not visible | Shown when free repair is available |
| "Repair with 50 points" button | Not visible | Shown when free repair used and user has 50+ points |
| Helper text ("Free repair resets Monday") | Not visible | Shown below button or in place of button when no repair available |
| Celebration toast on repair | Never fires | Fires `toast-confetti` after successful repair |
| `previousStreak` capture on reset | Never happens (no streak data) | Automatically captured when streak resets from > 1 to 1 |

---

## Edge Cases

- **Brand-new user with streak 0**: No `previousStreak` exists. No repair UI shown. Standard "Start your streak today" messaging applies.
- **User repairs, then misses another day**: The streak resets again. `previousStreak` is captured at the new (restored) value. The user can repair again if they have a free repair or enough points. However, if they already used the free repair this week, they'd need 50 points.
- **Multiple resets in one week**: Each reset captures the streak value at the time of reset. `previousStreak` is only overwritten if the streak was > 1 when it reset (it won't overwrite with 1 if the user already had a pending repair from a higher value).
- **Free repair used on Sunday, Monday arrives**: `repairsUsedThisWeek` resets to 0. User gets a new free repair.
- **User has exactly 50 points and pays for repair**: Points go to 0. Level may drop to Seedling. This is acceptable — it was a conscious choice.
- **User has 49 points, free repair used**: No repair button shown. Only the grace message and "Free repair resets Monday" helper.
- **Corrupted `wr_streak_repairs`**: If invalid JSON, treat as empty defaults (no previousStreak, no repairs used). No crash.
- **localStorage unavailable**: All repair operations degrade gracefully — repair UI not shown, no crash.
- **Midnight rollover**: Monday boundary uses `getCurrentWeekStart()` with local timezone. A repair used at 11:59 PM Sunday still counts as the previous week's repair; at 12:01 AM Monday, a new free repair is available.
- **Streak restored then user is inactive the rest of the day**: The repair sets `lastActiveDate` to today, so the streak will continue tomorrow if the user is active. If inactive tomorrow, the streak resets again (and `previousStreak` is recaptured).
- **Repair when `previousStreak` would be the new longestStreak**: The repair logic updates `longestStreak` to `max(longestStreak, previousStreak)` to handle this case.
- **Simultaneous `wr_streak` and `wr_faith_points` writes**: Both keys must be updated atomically (same try/catch block, write all or none) to prevent partial state.

---

## Out of Scope

- **New routes or pages** — this feature is entirely within the existing StreakCard and streak storage; no new navigation entries
- **Streak freeze / grace period** (automatic forgiveness without user action) — this is an opt-in repair, not an automatic grace period
- **Multiple repairs per reset** — once a repair is used, the `previousStreak` is cleared; if the user resets again, it's a new reset with a new `previousStreak`
- **Repair history or audit log** — not tracking historical repairs beyond the current week counter
- **Backend API persistence** — Phase 3 (this spec uses localStorage only)
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Custom grace messages** — all messages are hardcoded
- **Notification when free repair becomes available** — user discovers it on next dashboard visit
- **Badge for using streak repair** — not adding new badge definitions in this spec
- **Undo repair** — once repaired, the action is final
- **Point spending UI beyond this feature** — this introduces the first point-spending mechanic but does not create a general "store" or "spending" system

---

## Acceptance Criteria

### Data Model & Storage
- [ ] New localStorage key `wr_streak_repairs` stores: `previousStreak`, `lastFreeRepairDate`, `repairsUsedThisWeek`, `weekStartDate`
- [ ] `previousStreak` is captured when streak resets from > 1 to 1 (not when already at 0 or 1)
- [ ] `previousStreak` is not overwritten if a pending repair value already exists from a higher streak
- [ ] Corrupted `wr_streak_repairs` (invalid JSON) is treated as empty defaults — no crash
- [ ] localStorage unavailable degrades gracefully — no repair UI, no crash

### Free Weekly Repair
- [ ] One free repair is available per week, resetting every Monday at midnight (local time)
- [ ] Monday boundary is determined by `getCurrentWeekStart()` using local timezone
- [ ] After using free repair: `lastFreeRepairDate` is set to today, `repairsUsedThisWeek` is incremented, `weekStartDate` is updated
- [ ] `repairsUsedThisWeek` resets lazily on read when `weekStartDate` is before current Monday

### Paid Repair
- [ ] Paid repair costs exactly 50 faith points, deducted from `wr_faith_points.totalPoints`
- [ ] Paid repair button only shown when: free repair used this week AND user has 50+ faith points AND `previousStreak` exists
- [ ] Point deduction never causes `totalPoints` to go below 0
- [ ] Level is recalculated after point deduction (user may lose a level)

### Repair Action
- [ ] Repair restores `wr_streak.currentStreak` to the `previousStreak` value
- [ ] Repair sets `wr_streak.lastActiveDate` to today
- [ ] Repair updates `wr_streak.longestStreak` to `max(longestStreak, previousStreak)`
- [ ] Repair clears `previousStreak` from `wr_streak_repairs` (set to null)
- [ ] Both `wr_streak` and `wr_faith_points` (if paid) are updated atomically
- [ ] React state updates so StreakCard re-renders with restored streak value

### StreakCard UI
- [ ] Grace message "Everyone misses a day. Grace is built into your journey." appears when streak is 0/1 and `previousStreak` exists and is > 1
- [ ] "Restore Streak" button appears when free repair is available
- [ ] "Repair with 50 points" button appears when free repair is used and user has 50+ points
- [ ] No button appears when free repair is used and user has < 50 points — only grace message and "Free repair resets Monday" helper
- [ ] No repair UI appears for brand-new users (no `previousStreak` or `longestStreak` <= 1)
- [ ] Helper text "1 free repair per week" appears below the free repair button
- [ ] Helper text "Free repair resets Monday" appears below the paid repair button or when no button is available
- [ ] Repair UI replaces/augments the existing streak reset messaging within the StreakCard

### Celebration
- [ ] Successful repair triggers a `toast-confetti` celebration toast
- [ ] Toast message reads "Streak restored! {N}-day streak is back!" where N is the restored streak value
- [ ] Celebration uses the existing Spec 8 toast-confetti system (dark frosted glass card, CSS confetti, 5s auto-dismiss)
- [ ] `prefers-reduced-motion`: confetti hidden, toast appears without animation

### Responsive Behavior
- [ ] Mobile (< 640px): repair button is full-width within StreakCard padding, 44px minimum touch target height, message and button stack vertically
- [ ] Tablet (640-1024px): button auto-width, stacked layout
- [ ] Desktop (> 1024px): button auto-width, left-aligned below grace message, fits within right-column StreakCard

### Accessibility
- [ ] "Restore Streak" and "Repair with 50 points" buttons have clear accessible names (the visible text serves as the accessible name)
- [ ] After repair, the restored streak value is announced via `aria-live` region (leveraging existing StreakCard ARIA)
- [ ] Grace message is readable by screen readers (not hidden or decorative)
- [ ] All interactive elements keyboard accessible with visible focus indicators
- [ ] `prefers-reduced-motion` respected: no confetti, no hover scale animation, toast appears instantly

### Visual Verification Criteria
- [ ] "Restore Streak" button uses warm amber accent styling matching the existing multiplier badge in StreakCard (`bg-amber-500/20 text-amber-300`)
- [ ] Grace message is styled in italic muted text (`text-white/60 text-sm italic`) matching the existing streak reset messaging
- [ ] Repair section fits naturally within the StreakCard without overflowing or causing layout shift
- [ ] After repair, streak number animates from 0/1 to restored value using existing `AnimatedCounter`
- [ ] Celebration toast matches the existing `toast-confetti` visual style from Spec 8

### Error Handling
- [ ] If `previousStreak` is null or undefined when repair is attempted, repair is a no-op (button should not have been shown)
- [ ] If faith points deduction would go below 0, repair is blocked (button should not have been shown)
- [ ] Partial localStorage write failure (e.g., one key succeeds, another fails) does not leave inconsistent state — wrap in try/catch

### Test Coverage
- [ ] `previousStreak` is captured correctly when streak resets from > 1 to 1
- [ ] `previousStreak` is NOT captured when streak is already 0 or 1
- [ ] `previousStreak` is NOT overwritten when a pending higher value exists
- [ ] Free repair availability: available on first use, unavailable after use, resets on Monday
- [ ] Paid repair: deducts exactly 50 points, blocks when insufficient points
- [ ] Repair action: restores streak, updates lastActiveDate, updates longestStreak, clears previousStreak
- [ ] Weekly reset: `repairsUsedThisWeek` resets when new week starts
- [ ] UI states: free button shown, paid button shown, no button shown, no repair UI for new users
- [ ] Celebration fires on successful repair
- [ ] Corrupted localStorage recovery for `wr_streak_repairs`
- [ ] Auth guard: repair UI not shown when not authenticated
