# Feature: Getting Started Checklist

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec introduces `wr_getting_started` and `wr_getting_started_complete`
- Cross-spec dependencies: Welcome Wizard Onboarding (Spec 1 of onboarding sequence) sets `wr_onboarding_complete`; Progressive Disclosure Tooltips (Spec 2 of onboarding sequence) provides the `TooltipCallout` component and `wr_tooltips_seen` tracking; Spec 2 (Dashboard Shell) provides `DashboardCard` collapsible card component, dashboard grid layout, and `AuthProvider`; Spec 5 (Streak & Faith Points Engine) provides `useFaithPoints` hook and `recordActivity()`; Spec 6 (Dashboard Widgets & Activity Integration) provides `ActivityChecklist` progress ring pattern; Spec 8 (Celebrations & Badge UI) provides `CelebrationOverlay` with confetti for the all-complete celebration
- Shared constants: Activity types from `dashboard/activity-points.ts`; level thresholds from `dashboard/levels.ts`
- Shared utilities: `useAuth()` from auth context; `useFaithPoints()` from Spec 5
- **Onboarding sequence**: This is Spec 3 of a 3-spec onboarding sequence (Spec 1 = Welcome Wizard, Spec 2 = Progressive Disclosure Tooltips, Spec 3 = Getting Started Checklist)

---

## Overview

The Getting Started Checklist is a one-time dashboard widget that gently guides new users through their first meaningful interactions with Worship Room. After the Welcome Wizard introduces the app and the progressive disclosure tooltips point out key UI elements, the checklist provides a structured but low-pressure set of 6 activities that together give the user a complete first taste of the platform — mood tracking, prayer, journaling, meditation, ambient listening, and community engagement.

This is the final piece of the 3-spec onboarding sequence. Where the wizard personalizes identity and the tooltips orient the user spatially, the checklist motivates action. Each item links directly to the relevant feature, auto-completes when the user performs the action, and shows progress through a visual ring. Completing all 6 items triggers a warm celebration that marks the transition from "new user" to "active member." The checklist can also be manually dismissed at any time — respecting the gentle gamification philosophy of celebrating presence without creating pressure.

---

## User Stories

- As a **logged-in user who just completed the welcome wizard**, I want to see a checklist of suggested first actions so that I know what to try and feel guided rather than overwhelmed.
- As a **logged-in user**, I want checklist items to auto-complete when I actually perform the action so that I don't have to manually check things off.
- As a **logged-in user**, I want to see my progress toward completing all items via a visual progress ring so that I feel a sense of momentum.
- As a **logged-in user**, I want to click a "Go" link on any checklist item to navigate directly to that feature so that I can easily try each one.
- As a **logged-in user**, I want a celebration when I complete all 6 items so that I feel welcomed and accomplished.
- As a **logged-in user**, I want to dismiss the checklist early if I prefer to explore on my own so that it doesn't feel like a requirement.
- As a **logged-in user who was active before this feature was built**, I do not want to see the checklist so that existing users aren't treated as new.

---

## Requirements

### Visibility Conditions

- The checklist card is visible when ALL of the following are true:
  1. User is authenticated (`isAuthenticated === true` from `AuthProvider`)
  2. `localStorage.getItem('wr_onboarding_complete')` === `"true"` (welcome wizard has been completed or skipped)
  3. `localStorage.getItem('wr_getting_started_complete')` is NOT `"true"` (checklist has not been completed or dismissed)
- The checklist card does NOT appear for existing users who were active before this feature shipped — the condition `wr_onboarding_complete` exists as the gating mechanism. Users who never went through the welcome wizard (i.e., users who were active before the onboarding sequence was built) will not have `wr_onboarding_complete` set to `"true"`, so they will never see the checklist.
- The checklist disappears permanently when `wr_getting_started_complete` is set to `"true"` (via completion celebration or manual dismissal).

### Checklist Card Placement

- The checklist card renders at the TOP of the dashboard widget grid, above all other widgets (mood insights, activity checklist, streak card, friends preview, etc.)
- The card spans the full width of the grid on all breakpoints (not confined to the left or right column)
- The card uses the standard Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- The card is collapsible using the existing `DashboardCard` collapse pattern (collapse state persists via `wr_dashboard_collapsed`)

### Card Header

- **Title**: "Getting Started" in white, same heading style as other dashboard cards
- **Progress ring**: A circular SVG progress ring (same style as the Activity Checklist progress ring from Spec 6) showing X/6 items completed. Positioned to the right of the title in the card header area.
- **Dismiss button**: An "X" close button in the top-right corner of the card header. Clicking it sets `wr_getting_started_complete` to `"true"` and hides the card with a fade-out animation (300ms).

### Checklist Items

6 items, displayed as a vertical list inside the card:

| # | Label | Point Hint | "Go" Destination | Completion Detection |
|---|-------|-----------|-----------------|---------------------|
| 1 | Check in with your mood | +5 pts | Triggers mood check-in (scroll to top or re-show check-in) | `wr_daily_activities` for today contains `mood: true` (via existing daily activity tracking from Spec 5/6) |
| 2 | Generate your first prayer | +10 pts | `/daily?tab=pray` | `wr_daily_activities` for today contains `pray: true` (via existing daily activity tracking) |
| 3 | Write a journal entry | +25 pts | `/daily?tab=journal` | `wr_daily_activities` for today contains `journal: true` (via existing daily activity tracking) |
| 4 | Try a meditation | +20 pts | `/daily?tab=meditate` | `wr_daily_activities` for today contains `meditate: true` (via existing daily activity tracking) |
| 5 | Listen to ambient sounds | +10 pts | `/music?tab=ambient` | `wr_getting_started.ambient_visited` === `true` in localStorage |
| 6 | Explore the Prayer Wall | +15 pts | `/prayer-wall` | `wr_getting_started.prayer_wall_visited` === `true` in localStorage |

#### Item Visual States

- **Incomplete**: Empty circle icon (Lucide `Circle`) in `text-white/20`, label text in `text-white/70`, point hint in `text-white/30`, "Go" link in `text-primary hover:text-primary-lt`
- **Complete**: Green filled check icon (Lucide `CircleCheck`) in `text-success` (#27AE60), label text in `text-white/40` with strikethrough (`line-through`), point hint in `text-white/20`, "Go" link hidden. The entire row fades to 50% opacity.
- **Transition**: When an item completes, the icon swaps from circle to check with a brief scale-up animation (150ms), and the row fades to 50% over 300ms.

### Completion Detection

#### Items 1-4: Via Existing Daily Activity Tracking

Items 1-4 (mood, pray, journal, meditate) use the existing `wr_daily_activities` data structure from Spec 5/6. When the user performs any of these activities, `recordActivity()` is called, which updates `wr_daily_activities`. The checklist reads from this same data.

**Important**: These items detect whether the activity was done TODAY (same local date). If the user completed mood check-in yesterday but not today, the mood item shows as incomplete. This is intentional — the checklist encourages first-time exploration during the current session, and the daily activity system naturally resets.

**However**, the Getting Started checklist should also track cumulative "ever done" state for items 1-4. If the user did mood check-in today but not prayer, then returns tomorrow, the mood item should still show as complete (because they've done it at least once). To handle this: when any of items 1-4 is detected as complete via `wr_daily_activities`, also set the corresponding flag in `wr_getting_started` (e.g., `wr_getting_started.mood_done: true`). The checklist item shows as complete if EITHER `wr_daily_activities` has it for today OR `wr_getting_started` has the permanent flag.

#### Items 5-6: Via Getting Started Flags

Items 5-6 (ambient sounds, prayer wall) are tracked by setting flags in the `wr_getting_started` localStorage object when the user visits the relevant page:

- **Item 5 (Ambient Sounds)**: Set `wr_getting_started.ambient_visited` to `true` when the user navigates to `/music?tab=ambient` (or `/music` with the Ambient tab selected). The flag is set on page mount, not after a specific interaction — simply visiting the ambient sounds page counts.
- **Item 6 (Prayer Wall)**: Set `wr_getting_started.prayer_wall_visited` to `true` when the user navigates to `/prayer-wall`. The flag is set on page mount.

These flags persist permanently in localStorage (not date-dependent). Once set, the item stays complete forever.

### localStorage Schema

**`wr_getting_started`** — JSON object tracking per-item completion:
```json
{
  "mood_done": true,
  "pray_done": true,
  "journal_done": true,
  "meditate_done": true,
  "ambient_visited": true,
  "prayer_wall_visited": true
}
```

**`wr_getting_started_complete`** — Simple string flag:
- `"true"` when all 6 items are completed (set after celebration) or when the user manually dismisses the checklist
- Absence (or any value other than `"true"`) means the checklist should show (subject to other visibility conditions)

**`logout()` behavior**: Does NOT clear `wr_getting_started` or `wr_getting_started_complete` — same pattern as `wr_onboarding_complete`.

### All-Complete Celebration

When the 6th and final item is completed (detected reactively when all flags are true):

1. A full-screen celebration overlay renders with confetti animation — reuse the existing `CelebrationOverlay` component from Spec 8 at the "full-screen" tier
2. Celebration message: "You're all set! Welcome to Worship Room." in white, centered, large heading
3. A subtext: "You've explored everything Worship Room has to offer. Your journey starts now." in `text-white/70`
4. A "Let's Go" dismiss button (primary CTA style) that closes the overlay
5. After the celebration overlay is dismissed:
   - `wr_getting_started_complete` is set to `"true"` in localStorage
   - The checklist card fades out (300ms) and is permanently removed from the dashboard

### Manual Dismiss

- The "X" button in the card header allows the user to dismiss the checklist at any time
- Clicking "X":
  1. Sets `wr_getting_started_complete` to `"true"` in localStorage
  2. The checklist card fades out over 300ms
  3. The card is permanently removed from the dashboard
- The celebration does NOT fire on manual dismiss — it only fires when all 6 items are genuinely completed
- The dismiss is immediate and irreversible — no confirmation dialog

### "Go" Link Behavior

- Each incomplete checklist item has a "Go" link/button that navigates the user to the relevant feature
- Item 1 (mood check-in) is special: instead of navigating to a URL, it should trigger the mood check-in flow. If the user has already checked in today, the "Go" link could navigate to `/` (dashboard) where the mood data is visible. If the user has not checked in today, the "Go" action should scroll to top or otherwise signal that the mood check-in should appear.
- Items 2-4 navigate using React Router's `navigate()` function to the specified URLs
- Items 5-6 navigate to `/music?tab=ambient` and `/prayer-wall` respectively
- Completed items do NOT show the "Go" link (it is hidden, not disabled)

---

## AI Safety Considerations

- **Crisis detection needed?**: No — the checklist contains only hardcoded static text. No user input, no free-text fields, no emotional content.
- **User input involved?**: No — the only interactions are clicking "Go" links, the dismiss "X" button, and the collapse toggle. All are navigation or state-change actions.
- **AI-generated content?**: No — all checklist labels, point hints, and celebration messages are hardcoded constants.

---

## Auth Gating

### Logged-out users:
- **Never see the checklist** — the dashboard is auth-gated, so logged-out users see the landing page at `/`. The checklist exists entirely within the authenticated dashboard flow.
- **Zero data persistence** — no reads or writes to `wr_getting_started` or `wr_getting_started_complete`.

### Logged-in users:
- See the checklist on the dashboard if `wr_onboarding_complete === "true"` AND `wr_getting_started_complete !== "true"`
- All checklist interactions are available (Go links, dismiss, collapse)
- Completion data is saved to localStorage

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Getting Started card | Not visible (landing page shown) | Renders at top of dashboard grid if conditions met |
| Progress ring | Not accessible | Shows X/6 completion progress |
| "Go" links | Not accessible | Navigate to relevant features |
| "X" dismiss button | Not accessible | Permanently hides the checklist card |
| Celebration overlay | Not accessible | Fires when all 6 items completed |
| "Let's Go" button on celebration | Not accessible | Closes overlay, hides checklist permanently |
| Collapse toggle | Not accessible | Collapses/expands the card content |

---

## Auth & Persistence

### Logged-out users (demo mode):
- See the landing page at `/` — no dashboard, no checklist
- Zero data persistence

### Logged-in users:
- Checklist reads:
  - `wr_onboarding_complete` — to confirm wizard is complete (prerequisite)
  - `wr_getting_started_complete` — to determine if checklist should show
  - `wr_getting_started` — per-item completion flags
  - `wr_daily_activities` — today's activity completions for items 1-4
- Checklist writes:
  - `wr_getting_started` — updates individual item flags when activities are detected or pages visited
  - `wr_getting_started_complete` — set to `"true"` on all-complete celebration dismiss or manual dismiss

### Route type:
- Not a separate route. The checklist card renders inside the Dashboard page component at `/`, within the existing widget grid. It occupies a full-width slot at the top of the grid.

---

## UX & Design Notes

### Visual Design

- **Card style**: Standard Dashboard Card Pattern — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`, padding `p-4 md:p-6`
- **Card header layout**: Flex row with "Getting Started" title on the left, progress ring in the center-right area, and "X" dismiss button at the far right. The collapse chevron (from `DashboardCard`) sits between the ring and the X.
- **Title**: `text-lg font-semibold text-white`
- **Progress ring**: Same design as the Activity Checklist progress ring from Spec 6:
  - SVG circle, ~40-48px diameter (slightly smaller than the Activity Checklist's 56-64px to fit the card header)
  - Unfilled stroke: `white/10`
  - Filled stroke: `primary` color, animated on change
  - Center text: "X/6" in `text-xs font-semibold text-white`
  - `stroke-linecap="round"`
- **Dismiss "X" button**: Lucide `X` icon, `text-white/40 hover:text-white/60`, 24px icon size, 44px minimum touch target
- **Checklist items**: Vertical list with `gap-2` or `gap-3` spacing between items
  - Each item is a flex row: checkbox icon (24px) + label text + point hint + "Go" link
  - Label: `text-sm md:text-base text-white/70` (incomplete) or `text-white/40 line-through` (complete)
  - Point hint: `text-xs text-white/30` displayed beside or below the label (e.g., "+5 pts")
  - "Go" link: `text-sm font-medium text-primary hover:text-primary-lt` — right-aligned or at the end of the row
  - Completed row: entire row at `opacity-50`
- **Celebration overlay**: Reuse the existing `CelebrationOverlay` from Spec 8 at the full-screen tier with confetti. The message "You're all set! Welcome to Worship Room." uses Caveat script font (`font-script`) in large white text, matching the Welcome Wizard's celebration tone. Subtext in Inter `text-white/70`. "Let's Go" button uses primary CTA style (`bg-primary text-white rounded-lg py-3 px-8 font-semibold`).

### Design System Recon References

- **Frosted glass card**: Dashboard card pattern — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (from `09-design-system.md` and `_plans/recon/design-system.md`)
- **Progress ring**: Same SVG pattern as Activity Checklist (Spec 6) — `stroke-linecap="round"`, animated `stroke-dashoffset`
- **Success green**: `#27AE60` (`text-success`) for completed check icons
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- **Celebration overlay**: Existing `CelebrationOverlay` component from Spec 8

**New visual patterns**: 0 — this spec reuses existing patterns (dashboard card, progress ring, celebration overlay, checklist row styling).

### Animations

- **Item completion**: Check icon scales up briefly (150ms ease-out, 1.0 → 1.2 → 1.0), row fades to 50% opacity over 300ms
- **Progress ring**: Animated fill via CSS transition on `stroke-dashoffset` (500ms ease-out), same as Activity Checklist
- **Card dismiss (manual)**: Fade out over 300ms (`opacity 1 → 0`), then unmount
- **Card dismiss (after celebration)**: Same fade-out as manual dismiss
- **Celebration overlay entrance**: Same animation as `CelebrationOverlay` from Spec 8 (fade + scale + confetti)
- **`prefers-reduced-motion`**: All animations instant — no fade, no scale, no transition. Items swap states immediately. Card unmounts immediately on dismiss.

---

## Responsive Behavior

### Mobile (< 640px)

- Checklist card spans full width (single column layout)
- Card header: "Getting Started" title and progress ring on the same line, dismiss X at right edge. If space is tight, the progress ring can sit below the title row.
- Checklist items stack vertically with each item as a full-width row
- Each item row: icon + label on the left, "Go" link on the right. Point hint displayed as small text below the label (not inline) to avoid crowding.
- "Go" link touch target: minimum 44px height
- Dismiss X touch target: minimum 44px
- Celebration overlay: full-screen, message text centered with `px-4` margins

### Tablet (640px-1024px)

- Checklist card spans full grid width (above the 2-column layout)
- Card header: comfortable spacing between title, ring, and X
- Checklist items: same vertical list, with point hints inline next to labels (more horizontal space available)
- Celebration overlay: centered content with max-width ~560px

### Desktop (> 1024px)

- Checklist card spans full grid width (above both columns)
- Checklist items could optionally display in a 2-column layout (3 items per column) if the card has sufficient width, or remain as a single-column list. Single column is preferred for simplicity and scannability.
- Card padding: `p-6`
- Progress ring and title in the header with generous spacing
- Celebration overlay: centered content with max-width ~560px

---

## Edge Cases

- **Onboarding not complete**: If `wr_onboarding_complete` is not `"true"`, the checklist never renders. The wizard takes priority.
- **Already dismissed**: If `wr_getting_started_complete === "true"`, the checklist never renders regardless of item completion state.
- **Partial completion across days**: Items 1-4 have "ever done" flags in `wr_getting_started` that persist across days. If a user checks in their mood on Day 1, the mood item stays checked on Day 2 even though `wr_daily_activities` has reset. The Getting Started checklist is about first-time exploration, not daily repetition.
- **All items complete before returning to dashboard**: If the user completes all 6 items while navigating between pages and then returns to the dashboard, the celebration should fire immediately on dashboard render (detecting all 6 flags are true).
- **Celebration overlay and other overlays**: The celebration should have a high z-index (same level as `CelebrationOverlay` from Spec 8). If the mood check-in is showing, the celebration should render on top. However, this edge case is unlikely since mood check-in would have already been completed (item 1).
- **Browser refresh during checklist**: Checklist state (`wr_getting_started`) persists in localStorage. The progress is preserved across refreshes.
- **localStorage unavailable**: If localStorage is blocked, `wr_getting_started` and `wr_getting_started_complete` reads fail — treat `wr_getting_started_complete` as not set (checklist shows), treat `wr_getting_started` as empty (all items incomplete). Writes silently fail. Acceptable for MVP.
- **Manual dismiss mid-completion**: If user dismisses with 3/6 items done, the checklist is gone permanently. No way to bring it back. The `wr_getting_started` data persists but is never read again.
- **Item 1 "Go" link when mood already done today**: If the user has already done mood check-in today, the mood item shows as complete and the "Go" link is hidden. No special handling needed.
- **Navigating to ambient sounds or prayer wall without clicking "Go"**: The page-visit flags should be set regardless of how the user arrived at the page — whether via the checklist's "Go" link, the navbar, a direct URL, or any other navigation. The flag-setting logic lives on the target page, not in the checklist.
- **Simulated logout and re-login**: `wr_getting_started` and `wr_getting_started_complete` persist through logout (not cleared). Progress is retained.
- **Multiple tabs**: If item 5 is completed in Tab A by visiting `/music?tab=ambient`, Tab B won't know until it re-reads localStorage (on mount or focus). This is acceptable for MVP.
- **Celebration fires only once**: After the celebration overlay is dismissed and `wr_getting_started_complete` is set, the celebration never fires again even if the user somehow gets back to the dashboard before the state update propagates.

---

## Out of Scope

- **Backend API persistence** — Phase 3 (all data in localStorage)
- **Real authentication (JWT, Spring Security)** — Phase 3 (uses simulated auth from `AuthProvider`)
- **Customizable checklist items** — the 6 items are hardcoded, not configurable by users or admins
- **Onboarding analytics** (completion rate, drop-off item, time-to-complete) — not in MVP
- **Re-showing the checklist after dismissal** — once dismissed, gone permanently. No reset mechanism.
- **Animated confetti library integration** — reuses whatever confetti implementation exists in `CelebrationOverlay` from Spec 8
- **Points actually awarded for checklist completion** — the point hints ("+5 pts", "+10 pts") are informational labels showing what the activity is worth in the faith points system. The actual points are awarded by the existing `recordActivity()` calls in the respective feature components, NOT by the checklist itself. The checklist does not award additional bonus points for completing all 6 items.
- **Per-item reward beyond the faith points system** — no special badges or bonus for completing the Getting Started checklist (the celebration is the reward)
- **Reordering or hiding individual checklist items** — not configurable
- **Multi-language support** — not in MVP
- **The other 2 specs in the onboarding sequence** — Welcome Wizard (Spec 1) and Progressive Disclosure Tooltips (Spec 2) are separate, already-written specs

---

## Acceptance Criteria

### Visibility & Lifecycle

- [ ] Checklist card renders on the dashboard when `wr_onboarding_complete === "true"` AND `wr_getting_started_complete !== "true"` AND user is authenticated
- [ ] Checklist card does NOT render when `wr_getting_started_complete === "true"`
- [ ] Checklist card does NOT render when `wr_onboarding_complete` is not `"true"` (covers existing users who never went through the wizard)
- [ ] Checklist card does NOT render for logged-out users (landing page shown instead)
- [ ] `logout()` does NOT clear `wr_getting_started` or `wr_getting_started_complete`
- [ ] Checklist progress persists across browser refreshes (stored in localStorage)

### Card Placement & Style

- [ ] Checklist card renders at the TOP of the dashboard widget grid, above all other widgets
- [ ] Card spans full grid width on all breakpoints (not confined to left or right column)
- [ ] Card uses Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Card is collapsible using the existing `DashboardCard` collapse pattern
- [ ] Collapse state persists via `wr_dashboard_collapsed`

### Card Header

- [ ] "Getting Started" title renders in `text-lg font-semibold text-white`
- [ ] Circular SVG progress ring shows X/6 completion count with animated fill
- [ ] Progress ring uses `stroke-linecap="round"`, unfilled in `white/10`, filled in `primary`
- [ ] Center text of ring shows "X/6" in `text-xs font-semibold text-white`
- [ ] "X" dismiss button renders with Lucide `X` icon in `text-white/40 hover:text-white/60`
- [ ] "X" button has minimum 44px touch target

### Checklist Items

- [ ] 6 items display in a vertical list: mood, prayer, journal, meditation, ambient, prayer wall
- [ ] Each incomplete item shows: empty circle icon + label in `text-white/70` + point hint in `text-white/30` + "Go" link in `text-primary`
- [ ] Each complete item shows: green check icon (`text-success` #27AE60) + label in `text-white/40` with strikethrough + no "Go" link + row at 50% opacity
- [ ] "Go" links navigate to the correct destinations: mood check-in trigger, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music?tab=ambient`, `/prayer-wall`
- [ ] Completed items hide the "Go" link entirely (not just disabled)
- [ ] Point hints display correct values: +5, +10, +25, +20, +10, +15 pts respectively

### Completion Detection (Items 1-4)

- [ ] Mood check-in completion is detected from `wr_daily_activities` (today) OR `wr_getting_started.mood_done`
- [ ] Prayer generation completion is detected from `wr_daily_activities` (today) OR `wr_getting_started.pray_done`
- [ ] Journal entry completion is detected from `wr_daily_activities` (today) OR `wr_getting_started.journal_done`
- [ ] Meditation completion is detected from `wr_daily_activities` (today) OR `wr_getting_started.meditate_done`
- [ ] When any of items 1-4 is detected as complete via `wr_daily_activities`, the corresponding `wr_getting_started` flag is also set (permanent "ever done" tracking)

### Completion Detection (Items 5-6)

- [ ] Visiting `/music?tab=ambient` (or `/music` with Ambient tab active) sets `wr_getting_started.ambient_visited` to `true`
- [ ] Visiting `/prayer-wall` sets `wr_getting_started.prayer_wall_visited` to `true`
- [ ] These flags are set on page mount regardless of how the user navigated there (not just via "Go" link)
- [ ] These flags persist permanently across sessions (not date-dependent)

### All-Complete Celebration

- [ ] When all 6 items are completed, a full-screen celebration overlay renders with confetti
- [ ] Celebration heading reads "You're all set! Welcome to Worship Room." in large white text (Caveat script font)
- [ ] Celebration subtext reads "You've explored everything Worship Room has to offer. Your journey starts now." in `text-white/70`
- [ ] "Let's Go" primary CTA button dismisses the overlay
- [ ] After overlay dismiss, `wr_getting_started_complete` is set to `"true"`
- [ ] After overlay dismiss, the checklist card fades out (300ms) and is permanently removed
- [ ] Celebration fires even if the user completes all items while away from the dashboard and returns

### Manual Dismiss

- [ ] Clicking the "X" button sets `wr_getting_started_complete` to `"true"` in localStorage
- [ ] Clicking "X" triggers a 300ms fade-out animation on the card
- [ ] After fade-out, the card is permanently removed from the dashboard
- [ ] Manual dismiss does NOT trigger the celebration overlay
- [ ] Manual dismiss is immediate — no confirmation dialog

### Item Completion Animation

- [ ] When an item transitions from incomplete to complete, the check icon scales up briefly (150ms)
- [ ] The completed row fades to 50% opacity over 300ms
- [ ] Progress ring animates its fill via CSS transition (500ms ease-out)
- [ ] `prefers-reduced-motion`: all animations are instant, no transitions

### Responsive Layout

- [ ] Mobile (< 640px): Card spans full width, items stack vertically, point hints below labels, "Go" links have 44px minimum touch target, dismiss X has 44px minimum touch target
- [ ] Tablet (640-1024px): Card spans full grid width above 2-column layout, point hints inline with labels
- [ ] Desktop (> 1024px): Card spans full grid width, `p-6` padding, generous spacing between items

### Visual Verification

- [ ] Card background matches other dashboard cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Progress ring visually matches the Activity Checklist progress ring style (same stroke width, same colors, same animation)
- [ ] Complete items have visible green check icons (`#27AE60`) and strikethrough text
- [ ] Incomplete items have visible empty circle icons and "Go" links in primary purple
- [ ] Celebration overlay uses confetti and full-screen dark background matching `CelebrationOverlay` from Spec 8
- [ ] Celebration heading uses Caveat script font (`font-script`)

### Accessibility

- [ ] Progress ring has `aria-label` describing completion state (e.g., "3 of 6 getting started items completed")
- [ ] Each checklist item row has `aria-label` describing its state (e.g., "Check in with your mood — completed" or "Generate your first prayer — not completed, plus 10 points")
- [ ] "Go" links have descriptive `aria-label` (e.g., "Go to prayer page")
- [ ] Dismiss "X" button has `aria-label="Dismiss getting started checklist"`
- [ ] Celebration overlay has `role="dialog"` with `aria-labelledby` pointing to the heading
- [ ] All interactive elements have visible focus rings
- [ ] Keyboard: Tab navigates through "Go" links, dismiss button, and collapse toggle; Enter/Space activates them
- [ ] Screen reader: item completion state changes are announced (via `aria-live` region or equivalent)
- [ ] All touch targets are minimum 44px on mobile
