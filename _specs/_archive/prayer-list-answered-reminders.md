# Feature: Prayer List Answered Tracking and Reminders

**Master Plan Reference:** This is Spec 19 of Phase 2.9 -- the second of a 2-spec prayer list sequence. Spec 18 (`personal-prayer-list.md`) builds the `/my-prayers` page, data model, CRUD operations, and core interactions.
- Shared data models: Consumes `wr_prayer_list` localStorage key (array of prayer items with `id`, `title`, `description`, `category`, `status`, `createdAt`, `updatedAt`, `answeredAt`, `answeredNote`, `lastPrayedAt`) from Spec 18. Consumes `wr_daily_activities` and `wr_faith_points` from the Dashboard & Growth specs. Consumes `CelebrationOverlay` component from Phase 2.75 celebrations-badge-ui spec. Consumes `DashboardCard` component and dashboard grid layout from Phase 2.75 dashboard-shell spec.
- Cross-spec dependencies: Spec 18 (Personal Prayer List) provides the `/my-prayers` route, data model, prayer storage service, and CRUD components. Spec 2 (Dashboard Shell) provides `DashboardCard`, dashboard grid layout, `AuthProvider`. Spec 17 (Devotional Dashboard Integration) provides the widget positioned before this one in the dashboard grid. Spec 8 (Celebrations Badge UI) provides `CelebrationOverlay` component and confetti pattern. PrayTabContent provides the prayer generation UI where the "Save to my prayer list" button is added.
- Shared constants: Prayer categories (8 slugs: health, family, work, grief, gratitude, praise, relationships, other) from Spec 18. Toast system from `components/ui/Toast.tsx` and `useToast()` hook.

---

## Overview

Spec 18 gave users a private `/my-prayers` page to create, organize, and track their prayer requests. But the most sacred moment in a prayer life -- when God answers -- deserves more than a status change. And the daily discipline of prayer benefits from gentle reminders that keep requests from fading into a forgotten list.

This spec adds three enhancements that transform the personal prayer list from a static tracker into a living spiritual practice. First, **answered prayer celebrations** honor the moment when God moves -- a full-screen celebration overlay with confetti, a "Prayer Answered!" proclamation, and the ability to record a testimony. An answered prayer counter in the hero section becomes a visible record of God's faithfulness. Second, **prayer reminders** add a "Remind me" toggle to each prayer, creating dashboard-level nudges that gently resurface prayer requests when the user opens the app. Third, **dashboard integration** brings the prayer list into the daily flow with a widget card and a "Save to my prayer list" button on the Pray tab, making it effortless to capture prayer requests from anywhere in the app.

---

## User Stories

As a **logged-in user**, I want to see a meaningful celebration when I mark a prayer as answered so that the moment feels sacred and I can reflect on God's faithfulness.

As a **logged-in user**, I want to see how many of my prayers have been answered so that I'm encouraged by a visible record of God's work in my life.

As a **logged-in user**, I want to set reminders on my prayers so that I don't forget to pray for the things on my heart.

As a **logged-in user**, I want to see my prayer list status on the dashboard so that I can quickly check in on my prayer life without navigating away.

As a **logged-in user**, I want to save an AI-generated prayer directly to my personal prayer list so that meaningful prayers generated during my daily practice aren't lost.

---

## Requirements

### Feature 1: Answered Prayer Celebrations

#### Celebration Overlay

1. When a user marks a prayer as "Answered" using the existing inline form from Spec 18 (optional testimony note, "Confirm" and "Cancel" buttons), and clicks "Confirm," the prayer status updates as before AND a full-screen celebration overlay appears.

2. The celebration overlay reuses the existing `CelebrationOverlay` component pattern from Phase 2.75 (celebrations-badge-ui spec). It renders with:
   - Confetti animation (same particle system as existing celebrations)
   - Main text: "Prayer Answered!" displayed in Caveat script font (`font-script`), large and centered
   - Below the main text: the prayer's title in white, slightly smaller
   - Below the title: the testimony note text (if the user provided one in the "Mark Answered" form), displayed in Lora italic (`font-serif italic`) with slightly muted opacity
   - Dismiss button: "Praise God!" (replaces the typical "Continue" button text). Same button styling as existing celebration overlay dismiss button.

3. The overlay appears after the prayer data has been saved to localStorage (not before). The celebration is a reward for the completed action, not a gate.

4. If the user did not provide a testimony note, the testimony section of the overlay simply doesn't render -- no empty placeholder, no "Add a note" prompt on the overlay.

#### Answered Prayers Counter in Hero

5. Add an "answered prayers" counter to the `/my-prayers` page hero section, displayed alongside the existing subtitle ("Your personal conversation with God."). The counter reads: "X prayers answered" where X is the count of prayers with `status === "answered"` in `wr_prayer_list`.

6. The count number uses emerald green (`text-emerald-400`) to visually celebrate God's faithfulness. The rest of the text ("prayers answered") uses the standard hero subtitle color (`text-white/85`).

7. If the count is 0, do not display the answered counter at all. It only appears when the user has at least 1 answered prayer.

8. If the user has 5 or more answered prayers, display an encouraging message below the counter: "God is faithful. Keep bringing your requests to Him." This message uses Lora italic (`font-serif italic`), slightly smaller than the counter text, with `text-white/70` opacity for a gentle, reflective tone.

### Feature 2: Prayer Reminders

#### Reminder Toggle on Prayer Cards

9. Add a "Remind me" toggle to each **active** prayer card on the `/my-prayers` page. The toggle does not appear on answered prayers.

10. The toggle is a compact switch control (pill-shaped toggle, ~40px wide) with a "Remind me" label. When disabled: muted/gray appearance. When enabled: primary violet highlight (`bg-primary`).

11. When the user toggles "Remind me" on, two data fields are set on the prayer item:
    - `reminderEnabled`: `true` (boolean)
    - `reminderTime`: `"09:00"` (string, default value -- HH:MM format)
    Both fields are added to the prayer item in `wr_prayer_list`.

12. When the user toggles "Remind me" off, `reminderEnabled` is set to `false`. The `reminderTime` value is preserved (not cleared) so it persists if the user toggles the reminder back on.

#### Reminder Time Input

13. When `reminderEnabled` is `true`, a time input field appears below the toggle on the card. The field displays the `reminderTime` value and allows the user to change it. It uses a native HTML `<input type="time">` element, styled to match the card's appearance (dark text on white card background, compact sizing).

14. The time input has a tooltip (on hover for desktop, on tap-and-hold for mobile): "Push notification timing coming soon. For now, you'll see reminders when you open the app." The tooltip follows existing tooltip patterns in the app.

15. Changing the time value updates `reminderTime` on the prayer item in localStorage immediately (no separate save action needed).

#### Dashboard Reminder Toast

16. When a logged-in user visits the dashboard and has one or more prayers with `reminderEnabled: true`, a toast notification appears. The toast is an **info** tier toast (not celebration tier) using the existing `useToast()` hook.

17. The toast message reads: "Don't forget to pray for: [title 1], [title 2], [title 3]" listing up to 3 prayer titles from prayers that have `reminderEnabled: true` and `status === "active"`. If there are more than 3, only the first 3 are shown (sorted by `createdAt` ascending -- oldest prayers first, since those are most likely to be forgotten).

18. Each prayer title in the toast is truncated to 30 characters with ellipsis if longer.

19. The toast shows **once per day**. Tracking is via `wr_prayer_reminders_shown` localStorage key, which stores a JSON object: `{ date: "YYYY-MM-DD", shownPrayerIds: ["id1", "id2", "id3"] }`. If today's date matches the stored date, the toast does not show again. The date resets at midnight (local time).

20. If no prayers have `reminderEnabled: true`, or all reminder-enabled prayers are answered, no toast appears.

### Feature 3: Dashboard Integration

#### Prayer List Dashboard Widget

21. Add a "Prayer List" widget card to the dashboard widget grid. Position it after the "Today's Devotional" widget (from Spec 17) in grid order. The widget lives in the left column of the 2-column desktop layout.

22. The widget uses the standard `DashboardCard` component with collapsible behavior. Card title: "My Prayers" with a Lucide `HandHeart` icon (or `Heart` if `HandHeart` is not available) in `text-white/60`. Collapsible like all dashboard cards.

23. Widget content for users **with prayers**:
    - **Active prayers count**: "X active prayers" in `text-sm text-white/60`
    - **Most recent prayer title**: displayed in `text-base font-semibold text-white`, truncated to 1 line (`line-clamp-1`)
    - **Answered this month stat**: "X prayers answered this month" in `text-sm text-emerald-400` (count of prayers answered within the current calendar month -- comparing `answeredAt` month/year to current month/year)
    - **CTA link**: "View all" with a right arrow, styled in `text-sm text-primary-lt hover:text-primary font-medium`. Links to `/my-prayers`.

24. Widget content for users **with no prayers** (empty state):
    - Centered text: "Start your prayer list" in `text-sm text-white/60`
    - "Add Prayer" CTA button: compact primary button style (`bg-primary text-white text-sm font-medium py-2 px-4 rounded-lg`). Navigates to `/my-prayers`.

#### Pray Tab "Save to My Prayer List" Button

25. On the Pray tab (`PrayTabContent`), after an AI prayer has been generated, add a "Save to my prayer list" button alongside the existing action buttons (Copy, Read Aloud, Save, Share). The button uses a Lucide `ListPlus` icon (or `Plus` if unavailable) with the text "Save to List".

26. **Logged-out behavior**: Clicking the button triggers the auth modal with the message: "Sign in to save prayers to your list."

27. **Logged-in behavior**: Clicking the button opens a compact inline form directly below the action buttons (not a modal, not a page navigation). The form contains:
    - **Title input**: pre-filled with the first 8 words of the prayer topic text (from the textarea that the user typed before generating the prayer), truncated to 100 characters. If the topic text is empty or too short, the placeholder "My prayer" is used.
    - **Category selector**: 8 category pills (same styling as the `/my-prayers` inline composer pills), horizontally scrollable on mobile. No default selected -- user must choose.
    - **"Save" button**: primary style, disabled until a category is selected. Title is pre-filled so it's immediately saveable once a category is chosen.
    - **"Cancel" link**: text style, collapses the form.

28. On save: the prayer is added to `wr_prayer_list` with:
    - `id`: generated UUID
    - `title`: from the title input
    - `description`: the full generated prayer text (the AI-generated content)
    - `category`: selected category
    - `status`: `"active"`
    - `createdAt` and `updatedAt`: current timestamp
    - All other fields (`answeredAt`, `answeredNote`, `lastPrayedAt`, `reminderEnabled`, `reminderTime`): `null`/`false`/defaults

29. After saving, the inline form collapses and a success toast appears: "Added to your prayer list." (info tier). The button changes state to show "Saved" with a checkmark icon for the remainder of the session (or until the user generates a new prayer).

30. The 200-prayer limit from Spec 18 applies. If the user has 200 prayers, clicking the button shows a toast with the limit message instead of opening the form.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **Never see any of these features.** The `/my-prayers` page, dashboard widget, and prayer reminders are all part of the authenticated experience.
- The "Save to my prayer list" button on the Pray tab is visible but triggers the auth modal on click with the message: "Sign in to save prayers to your list."
- Zero data persistence. Zero cookies. Zero tracking.

### Logged-in users:
- **Celebration overlay**: Triggers after updating prayer status in `wr_prayer_list`. No new localStorage keys.
- **Answered counter**: Reads from `wr_prayer_list` (computed count). No new localStorage keys.
- **Prayer reminders**: Reads/writes `reminderEnabled` and `reminderTime` fields within existing `wr_prayer_list` items. Writes `wr_prayer_reminders_shown` for daily toast tracking.
- **Dashboard widget**: Reads from `wr_prayer_list` (computed stats). No new localStorage writes.
- **Save from Pray tab**: Writes to `wr_prayer_list` (adds new prayer item).
- `logout()` clears auth state but preserves all prayer data (consistent with existing behavior).

### New localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `wr_prayer_reminders_shown` | JSON object `{ date: string, shownPrayerIds: string[] }` | Tracks which reminder toasts have been shown today. Date resets at midnight. |

### Updated Data Model (extends Spec 18)

Two new optional fields added to each prayer item in `wr_prayer_list`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reminderEnabled` | boolean | `false` | Whether daily reminders are enabled for this prayer |
| `reminderTime` | string (HH:MM) | `"09:00"` | Placeholder time for future push notifications |

### Route type:
- No new routes. Features are added to the existing `/my-prayers` page, dashboard (`/`), and Daily Hub Pray tab (`/daily?tab=pray`).

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Celebration overlay | Not visible (`/my-prayers` is auth-gated) | Appears after confirming "Mark Answered" |
| Answered counter in hero | Not visible (`/my-prayers` is auth-gated) | Shows count when >= 1 answered prayer |
| Encouraging message (5+) | Not visible (`/my-prayers` is auth-gated) | Shows when >= 5 answered prayers |
| "Remind me" toggle | Not visible (`/my-prayers` is auth-gated) | Toggles reminder on/off for active prayers |
| Reminder time input | Not visible (`/my-prayers` is auth-gated) | Editable when reminder is enabled |
| Dashboard widget | Not visible (dashboard is auth-gated) | Shows prayer list stats or empty state |
| Dashboard widget "View all" link | Not visible | Links to `/my-prayers` |
| Dashboard widget "Add Prayer" button | Not visible | Navigates to `/my-prayers` |
| Dashboard reminder toast | Not visible | Shows once daily when reminders exist |
| Pray tab "Save to List" button | Triggers auth modal: "Sign in to save prayers to your list." | Opens inline save form |
| Pray tab save form title input | Not visible (form doesn't open) | Editable, pre-filled from prayer topic |
| Pray tab save form category pills | Not visible | Selectable, required |
| Pray tab save form "Save" button | Not visible | Saves prayer to `wr_prayer_list` |

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes -- the testimony note text input (within the existing "Mark Answered" form from Spec 18) accepts free text. Crisis keywords must be detected via `CrisisBanner` when the user types in the testimony field. This is already specified in Spec 18 for the "Mark Answered" form; this spec does not change that behavior. The title input in the Pray tab save form also accepts user text, but it's pre-filled from the prayer topic which already went through crisis detection on the Pray tab textarea. However, the user can edit the title, so crisis detection via `CrisisBanner` should be active on the title input in the Pray tab save form as well.
- **User input involved?**: Yes -- testimony note (Spec 18, unchanged), prayer title in Pray tab save form (max 100 chars), reminder time (time picker, no free text).
- **AI-generated content?**: The description field of a prayer saved from the Pray tab contains AI-generated prayer text. This is stored as plain text and displayed as plain text only (no HTML rendering). The AI prayer has already been generated and displayed on the Pray tab -- this spec simply copies it into localStorage.
- **Content is private**: All prayer list data remains private to the user. No community moderation applies. Crisis detection is for the user's own safety.

---

## UX & Design Notes

### Emotional Tone

The answered prayer celebration should feel like a genuine moment of worship -- not a gamification achievement. The confetti and "Praise God!" button frame it as a response to God's work, not a personal accomplishment. The green counter in the hero is a testament to faithfulness, not a high score.

Prayer reminders should feel like a gentle friend tapping your shoulder, not a productivity app pinging you. The dashboard toast is warm and brief -- a simple "don't forget" rather than a notification barrage.

The dashboard widget is a quiet window into the user's prayer life -- glanceable, not demanding attention.

### Visual Design -- Celebration Overlay

- **Reuses existing `CelebrationOverlay` pattern**: full-screen dark overlay with backdrop blur, confetti particles, centered content
- **Main text**: "Prayer Answered!" in Caveat script (`font-script`), white, large (`text-4xl sm:text-5xl`), centered
- **Prayer title**: below main text, in Inter (`font-sans`), `text-lg text-white/90`, centered
- **Testimony note** (if present): below prayer title, in Lora italic (`font-serif italic`), `text-base text-white/70`, centered, max-width constrained for readability (`max-w-md`)
- **"Praise God!" button**: same styling as existing celebration dismiss button, centered below content

### Visual Design -- Answered Counter

- **Position**: below the PageHero subtitle, vertically centered
- **Count number**: `text-emerald-400 font-semibold` -- stands out against the dark hero
- **"prayers answered" text**: `text-white/85` -- matches existing subtitle color
- **Encouraging message** (5+ prayers): `font-serif italic text-sm text-white/70` -- gentle and reflective, below the counter

### Visual Design -- Reminder Toggle

- **Toggle switch**: pill-shaped, ~40px wide, ~22px tall. Off: `bg-gray-300`. On: `bg-primary`. White circle thumb that slides left/right.
- **"Remind me" label**: `text-sm text-text-dark` on the white card background
- **Time input** (when enabled): native `<input type="time">` with compact sizing, below the toggle. `text-sm`, matches card text color.
- **Tooltip**: standard dark tooltip with arrow, `bg-gray-900 text-white text-xs rounded-md px-3 py-2`

### Visual Design -- Dashboard Widget

- **Standard frosted glass card**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`
- **Card header**: "My Prayers" with icon in `text-white/60`
- **Active count**: `text-sm text-white/60`
- **Most recent title**: `text-base font-semibold text-white line-clamp-1`
- **Answered this month**: `text-sm text-emerald-400` -- green to match the hero counter
- **CTA link**: `text-sm text-primary-lt hover:text-primary font-medium` with right arrow
- **Empty state**: centered, compact, single "Add Prayer" button

### Visual Design -- Pray Tab Save Form

- **Inline form**: slides open below the action buttons row with 300ms ease animation (matches Spec 18 composer pattern)
- **Title input**: `text-sm`, pre-filled, full width of the form
- **Category pills**: same styling as `/my-prayers` composer -- horizontally scrollable on mobile
- **Compact layout**: the form should feel quick and lightweight, not like a full creation flow

### Design System Recon References

- **CelebrationOverlay**: Existing component at `components/dashboard/CelebrationOverlay.tsx` -- reuse confetti, overlay backdrop, content centering, and dismiss button patterns
- **Dashboard card pattern**: Design system recon "Dashboard Card Pattern" -- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **PageHero subtitle area**: Inner Page Hero pattern from design system recon -- `text-white/85` subtitle color
- **Toast system**: Existing `useToast()` hook and `ToastProvider`
- **Category pill styling**: From Spec 18 -- `text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-1` (unselected), `bg-primary text-white rounded-full` (selected)

### New Visual Patterns

1. **Answered prayer celebration overlay variant**: Uses existing `CelebrationOverlay` but with custom content (prayer title + testimony). The layout within the overlay is **new** -- the existing overlay shows level-up or badge messages, not prayer-specific content. Plan should mark this content layout as `[UNVERIFIED]` until visually verified.
2. **Pill-shaped toggle switch**: A compact on/off toggle control. If an existing toggle component exists in the codebase, reuse it. If not, this is a **new pattern** that should be marked `[UNVERIFIED]`.
3. **Emerald counter in hero subtitle area**: Inline colored text within the hero subtitle zone. The `text-emerald-400` color on the dark hero gradient is a **new color usage** that should be marked `[UNVERIFIED]`.

---

## Responsive Behavior

### Mobile (< 640px)

- **Celebration overlay**: Full-screen, content centered with generous padding (`p-6`). "Prayer Answered!" text scales to `text-3xl`. Prayer title and testimony note stack vertically with comfortable spacing. "Praise God!" button is full-width near the bottom.
- **Answered counter in hero**: Displayed below the subtitle, centered. Counter and encouraging message stack vertically.
- **Reminder toggle**: Full width within the card, toggle and label on the same line. Time input appears below the toggle when enabled, also full width.
- **Dashboard widget**: Full-width in single-column stack. All content stacks vertically. Empty state CTA button is full-width.
- **Pray tab save form**: Full width below the action buttons. Title input full width. Category pills horizontally scrollable with hidden scrollbar. Save/Cancel buttons side by side, or Save full-width with Cancel as text link below.
- **Dashboard reminder toast**: Full-width toast at the bottom of the viewport, matching existing toast mobile behavior.

### Tablet (640-1024px)

- **Celebration overlay**: Same as mobile but with larger text (`text-4xl`).
- **Answered counter in hero**: Centered below subtitle.
- **Reminder toggle**: Same as desktop (inline within card).
- **Dashboard widget**: In the 2-column dashboard grid at its designated position (left column).
- **Pray tab save form**: Constrained width matching the Pray tab content area (`max-w-2xl`).
- **Dashboard reminder toast**: Standard toast positioning.

### Desktop (> 1024px)

- **Celebration overlay**: Full-screen, content centered. "Prayer Answered!" at `text-5xl`. Prayer title at `text-lg`. Testimony note at `text-base`. "Praise God!" button at standard width (~200px), centered.
- **Answered counter in hero**: Centered below subtitle. Counter and message on separate lines.
- **Reminder toggle**: Positioned in the card's action area (right side on desktop, alongside other card action buttons). Toggle and "Remind me" label inline. Time input appears below when enabled.
- **Dashboard widget**: Left column of 2-column dashboard grid, after the Today's Devotional widget. `p-6` padding.
- **Pray tab save form**: Constrained width matching the Pray tab content area. Category pills wrap naturally.
- **Dashboard reminder toast**: Standard toast positioning (top-right or bottom-right per existing toast configuration).

---

## Edge Cases

- **No prayers exist**: Dashboard widget shows empty state. Reminder toast does not fire. Answered counter does not appear.
- **All prayers are answered**: Dashboard widget shows 0 active, "X prayers answered this month" stat. Reminder toast does not fire (no active reminder-enabled prayers). "Remind me" toggle is not shown on answered cards.
- **Celebration overlay and animations**: `prefers-reduced-motion` disables confetti animation and overlay fade-in. Content still appears, just without motion.
- **200-prayer limit reached from Pray tab**: Show toast: "You've reached the 200 prayer limit. Consider archiving answered prayers to make room." (same message as Spec 18). Save form does not open.
- **Prayer deleted while reminder is enabled**: No issue -- the toast reads from `wr_prayer_list` which no longer contains the deleted prayer.
- **Multiple celebrations in sequence**: If the user marks multiple prayers as answered in quick succession, celebrations queue up (one at a time, dismiss → next appears). This follows the existing `CelebrationQueue` pattern from Phase 2.75.
- **Midnight boundary**: Reminder toast date tracking uses local date string (computed via the shared `getLocalDateString()` utility, never `toISOString()`). If the user crosses midnight while on the dashboard, the toast state persists until next page load.
- **Pray tab save after session loss**: If the user generates a prayer, navigates away, and comes back, the prayer text is gone (React state, not persisted). The "Save to my prayer list" button only appears while a generated prayer is actively displayed.
- **Testimony note with crisis keywords**: The crisis detection on the testimony note input is already handled by Spec 18's `CrisisBanner`. This spec doesn't change that behavior -- the celebration overlay fires regardless of crisis detection display (crisis banner is informational, doesn't block the save action).
- **Dashboard widget updates**: Widget reads from `wr_prayer_list` on mount. If the user adds a prayer on `/my-prayers` and returns to the dashboard, the widget reflects the change on next mount. No real-time sync needed.

---

## Out of Scope

- **Push notifications**: Reminder time is stored but not actively used for scheduling. Push notifications are Phase 2.95 (Specs 38-39). The time input is a UI placeholder only.
- **Prayer sharing from personal list to Prayer Wall**: Not in this spec.
- **Backend API persistence**: Entirely frontend. All data in localStorage. Backend wiring is Phase 3+.
- **Gamification integration**: Marking a prayer as answered does not award faith points or trigger badge checks. This could be a future enhancement but is not part of this spec.
- **Custom reminder frequencies**: No "remind me daily/weekly/monthly" options. All reminders are daily (once per app visit).
- **Reminder notification sound**: No audio notification. Toast is visual only.
- **Prayer list sorting by reminder status**: No special sort order for reminder-enabled prayers.
- **Pray tab save form with description editing**: The description (AI prayer text) is saved as-is. The user cannot edit it in the inline save form -- only the title and category are editable.
- **Multiple prayer saves from same generation**: Once a prayer is saved from the Pray tab, the button shows "Saved" state. The user cannot save the same generated prayer twice (duplicate prevention).
- **Prayer list widget click-to-pray**: The dashboard widget does not have a "Pray for this" button. Users must navigate to `/my-prayers` for prayer interactions.
- **Exporting answered prayer testimonies**: No export, share, or print functionality for answered prayer records.

---

## Acceptance Criteria

### Answered Prayer Celebration -- Overlay

- [ ] After confirming "Mark Answered" on a prayer, a full-screen celebration overlay appears
- [ ] Overlay reuses the existing `CelebrationOverlay` component pattern (confetti, dark backdrop, centered content)
- [ ] Main text reads "Prayer Answered!" in Caveat script font (`font-script`), centered, white
- [ ] Prayer title displays below the main text in `text-white/90`
- [ ] Testimony note (if provided) displays below the title in Lora italic (`font-serif italic`) at `text-white/70`
- [ ] If no testimony note was provided, no placeholder or empty space appears in its place
- [ ] Dismiss button reads "Praise God!" (not "Continue")
- [ ] Dismiss button uses the same styling as existing celebration overlay dismiss buttons
- [ ] Overlay appears after the prayer data has been saved to localStorage (not before)
- [ ] Multiple celebrations in quick succession queue up via the existing `CelebrationQueue` pattern
- [ ] `prefers-reduced-motion` disables confetti and fade-in animation while still showing content

### Answered Prayer Celebration -- Hero Counter

- [ ] `/my-prayers` page hero displays "X prayers answered" below the subtitle when X >= 1
- [ ] The count number uses `text-emerald-400`
- [ ] The "prayers answered" text uses `text-white/85`
- [ ] When X is 0, the answered counter is not displayed at all
- [ ] When X >= 5, an encouraging message appears: "God is faithful. Keep bringing your requests to Him."
- [ ] Encouraging message uses Lora italic (`font-serif italic`), `text-sm text-white/70`
- [ ] Counter and message are centered within the hero

### Prayer Reminders -- Toggle

- [ ] Active prayer cards display a "Remind me" toggle
- [ ] Answered prayer cards do NOT display the toggle
- [ ] Toggle is a pill-shaped switch (~40px wide), gray when off, primary violet when on
- [ ] Toggling on sets `reminderEnabled: true` and `reminderTime: "09:00"` on the prayer item
- [ ] Toggling off sets `reminderEnabled: false` but preserves the `reminderTime` value
- [ ] When `reminderEnabled` is true, a time input appears below the toggle
- [ ] Time input uses native `<input type="time">` with the prayer's `reminderTime` value
- [ ] Changing the time input updates `reminderTime` in localStorage immediately
- [ ] Time input has a tooltip: "Push notification timing coming soon. For now, you'll see reminders when you open the app."
- [ ] Toggle meets 44px minimum touch target

### Prayer Reminders -- Dashboard Toast

- [ ] When a logged-in user visits the dashboard with reminder-enabled active prayers, an info toast appears
- [ ] Toast message reads: "Don't forget to pray for: [title 1], [title 2], [title 3]"
- [ ] Toast lists up to 3 prayer titles (sorted by `createdAt` ascending)
- [ ] Prayer titles in the toast are truncated to 30 characters with ellipsis
- [ ] Toast shows once per day, tracked via `wr_prayer_reminders_shown` localStorage key
- [ ] `wr_prayer_reminders_shown` stores `{ date: "YYYY-MM-DD", shownPrayerIds: [...] }`
- [ ] If today's date matches the stored date, the toast does not show again
- [ ] If no prayers have `reminderEnabled: true`, no toast appears
- [ ] If all reminder-enabled prayers are answered, no toast appears

### Dashboard Widget -- With Prayers

- [ ] "My Prayers" widget card appears in the dashboard grid after the Today's Devotional widget
- [ ] Card uses frosted glass style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Card header shows "My Prayers" with an appropriate Lucide icon in `text-white/60`
- [ ] Card is collapsible (matching existing `DashboardCard` behavior)
- [ ] Widget displays active prayers count: "X active prayers" in `text-sm text-white/60`
- [ ] Widget displays most recent prayer title in `text-base font-semibold text-white line-clamp-1`
- [ ] Widget displays "X prayers answered this month" in `text-sm text-emerald-400`
- [ ] "Answered this month" counts prayers where `answeredAt` falls within the current calendar month
- [ ] CTA link reads "View all" with right arrow, styled in `text-sm text-primary-lt hover:text-primary font-medium`
- [ ] CTA link navigates to `/my-prayers`

### Dashboard Widget -- Empty State

- [ ] When user has zero prayers, widget shows "Start your prayer list" text in `text-sm text-white/60`
- [ ] "Add Prayer" button appears with compact primary styling, navigates to `/my-prayers`
- [ ] No stats or prayer title are shown in the empty state

### Pray Tab -- Save to Prayer List Button

- [ ] "Save to List" button (with icon) appears alongside existing action buttons (Copy, Read Aloud, Save, Share) after prayer generation
- [ ] Button only appears when a generated prayer is currently displayed
- [ ] Logged-out user clicking the button sees auth modal: "Sign in to save prayers to your list."
- [ ] Logged-in user clicking the button opens a compact inline form below the action buttons
- [ ] Form title input is pre-filled with the first 8 words of the prayer topic text (max 100 chars)
- [ ] If prayer topic is empty or very short, title defaults to "My prayer"
- [ ] Form shows 8 category pills matching `/my-prayers` composer styling
- [ ] "Save" button is disabled until a category is selected
- [ ] Crisis detection via `CrisisBanner` is active on the title input
- [ ] On save: prayer is added to `wr_prayer_list` with AI prayer text as description
- [ ] Success toast appears: "Added to your prayer list."
- [ ] After saving, the button changes to "Saved" with a checkmark icon
- [ ] The "Saved" state persists until a new prayer is generated
- [ ] If user has 200 prayers, clicking button shows the 200-limit toast instead of opening the form
- [ ] Form slides open with 300ms ease animation
- [ ] "Cancel" link collapses the form

### Responsive

- [ ] Mobile (< 640px): Celebration overlay text scales to `text-3xl`; "Praise God!" button is full-width; reminder toggle full-width in card; dashboard widget full-width; save form full-width with scrollable category pills
- [ ] Tablet (640-1024px): Celebration overlay at `text-4xl`; dashboard widget in 2-column grid; save form matches Pray tab content width
- [ ] Desktop (> 1024px): Celebration overlay at `text-5xl`; reminder toggle in card action area; dashboard widget in left column; save form at `max-w-2xl`

### Accessibility

- [ ] Celebration overlay traps focus while visible (reuses existing CelebrationOverlay focus trap)
- [ ] "Praise God!" dismiss button is keyboard-accessible (Enter/Space)
- [ ] Overlay announces "Prayer Answered" to screen readers on appearance
- [ ] "Remind me" toggle has accessible name (aria-label or associated label element)
- [ ] Toggle state is announced to screen readers (aria-checked or equivalent)
- [ ] Time input has an accessible label
- [ ] Tooltip content is accessible via aria-describedby
- [ ] Dashboard widget uses standard `DashboardCard` accessibility (aria-labelledby, aria-expanded)
- [ ] "Save to List" button has descriptive accessible name
- [ ] Save form inputs have associated labels
- [ ] All interactive elements meet 44px minimum touch targets
- [ ] `prefers-reduced-motion`: celebration confetti and form slide animations are disabled

### Visual Verification

- [ ] Celebration overlay matches existing CelebrationOverlay visual style (confetti, backdrop, centering)
- [ ] `text-emerald-400` counter is legible against the dark hero gradient
- [ ] Reminder toggle visual style is consistent with standard on/off toggles (clear on/off states)
- [ ] Dashboard widget matches other frosted glass dashboard cards in border, backdrop-blur, and padding
- [ ] Pray tab save form integrates visually with the existing action buttons row without layout disruption
- [ ] Category pills in the save form match the `/my-prayers` composer pills exactly

### No Regressions

- [ ] Existing `/my-prayers` CRUD operations (create, edit, delete, mark answered) work unchanged
- [ ] Existing prayer card actions ("Pray for this", "Edit", "Delete") work unchanged
- [ ] Existing Pray tab functionality (textarea, chips, prayer generation, action buttons) works unchanged
- [ ] Existing dashboard widgets are unaffected in position and behavior
- [ ] Existing `wr_prayer_list` data format is backwards-compatible (new `reminderEnabled` and `reminderTime` fields are optional, default to `false` and `"09:00"`)
- [ ] Existing celebration queue (badge/level celebrations) is not disrupted by answered prayer celebrations
