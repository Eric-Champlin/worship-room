# Feature: Welcome Back Re-engagement Flow

**Master Plan Reference:** N/A — standalone feature (builds on existing streak repair from `streak-repair-grace.md` spec)

---

## Overview

When a user returns after 3 or more days of inactivity, the app currently offers no acknowledgment — no warm greeting, no streak repair offer, no summary of what they missed. The streak resets silently, the mood check-in fires as if it's a normal day, and the user feels like they failed. For a healing app, the user likely missed days because of the very struggles the app exists to help with. This feature intercepts the return with a warm Welcome Back screen that acknowledges the gap with grace, offers streak repair, shows what's new, and provides a gentle re-entry path.

The 3-7 day inactivity window is the highest-churn-risk period. No competitor does this well — Hallow shows a transactional repair button, Glorify's tree droops (users complain about this). Worship Room can be the first app that makes coming back feel safe.

---

## User Stories

- As a **logged-in user** returning after 3+ days away, I want to see a warm welcome screen so that I feel supported rather than judged for my absence.
- As a **logged-in user** with a broken streak, I want to repair my streak from the welcome screen so that I can restore my progress without hunting for the repair option.
- As a **logged-in user** returning after time away, I want to see what's new since I left so that I feel reconnected and curious about what I missed.
- As a **logged-in user** who just wants to get back to my dashboard, I want to skip the welcome screen and mood check-in so that I'm not forced through a flow I don't need.

---

## Requirements

### 1. Inactivity Detection

- Read `wr_streak` from localStorage — it contains `lastActiveDate`
- Calculate days between `lastActiveDate` and today using the `getLocalDateString()` utility (never use UTC)
- If `daysSinceLastActive >= 3`, trigger the Welcome Back flow before mood check-in
- If `daysSinceLastActive < 3` OR no previous activity exists (brand-new user), skip Welcome Back entirely — proceed to normal flow (onboarding wizard for new users, mood check-in for returning users)

### 2. Dashboard Phase Machine Update

The Dashboard currently sequences phases: `onboarding -> check_in -> recommendations -> dashboard_enter -> dashboard`. Add a new `welcome_back` phase:

**Updated phases:** `onboarding -> welcome_back -> check_in -> recommendations -> dashboard_enter -> dashboard`

**Phase routing logic:**
1. If onboarding not complete -> `onboarding`
2. Else if `daysSinceLastActive >= 3` AND Welcome Back not already shown this session -> `welcome_back`
3. Else if no mood entry today -> `check_in`
4. Else -> `dashboard_enter` (or `dashboard`)

**Welcome Back phase transitions:**
- "Step Back In" -> transitions to `check_in` phase (mood check-in)
- "Skip to Dashboard" -> transitions to `dashboard` phase (bypasses mood check-in)
- After streak repair -> transitions to `check_in` phase

**Same-day dismissal:** Use `sessionStorage` (not localStorage) to track that Welcome Back was shown this session. This means:
- Welcome Back doesn't re-show if the user navigates away and returns the same session
- Welcome Back shows again if the user closes the browser and returns while still 3+ days inactive
- Welcome Back shows again if the user is inactive for another 3+ days in the future

### 3. Welcome Back Screen

Full-screen overlay matching the mood check-in pattern (dark background, centered content, no navbar visible). The screen should feel like a warm embrace, not a popup or modal.

**Content structure:**

**Greeting section:**
- Heading: "Welcome Back" — warm, personal, in script font (Caveat)
- Subheading: "We've been holding your spot." — reassuring, muted
- If user has a name (from `wr_user_name`): "Welcome back, {name}" instead

**Streak section (conditional — only if previous streak existed):**
- Message: "You had a {X}-day streak going."
- Grace line: "Life happens — and God's grace covers every gap." — italic, gentle. This is critical emotional copy; it must feel like grace, not a platitude.

**Streak Repair Card (conditional — only if repair is available):**
- Frosted glass card with fire emoji and "Restore your streak?" heading
- Integrates with the existing `useStreakRepair` hook — this is a new consumer, not a replacement
- If `freeRepairAvailable` is true: show "Use Free Repair" as primary action
- If free repair already used this week but user has 50+ faith points: show "Repair for 50 pts" as primary action
- If no repair available (free used, not enough points): don't show the repair card at all — just show the warm greeting and CTAs
- After repair: update streak immediately, play `ascending` sound, show toast with restored count, then auto-advance to check_in phase after brief delay

**"What's New" section (conditional — omit entirely if no items):**
- Header: "While you were away:"
- Show 1-3 relevant items based on what changed since `lastActiveDate`:
  - **New challenge available:** Compare challenge start dates from liturgical calendar against `lastActiveDate`
  - **Friend activity:** Estimated prayer count on Prayer Wall since last active (mock/estimated counts acceptable for frontend-only phase)
  - **New devotional content:** If a seasonal devotional series started since last active date
- If no relevant items detected, omit the entire section (no empty "While you were away:" header)

**CTAs:**
- Primary: "Step Back In" — proceeds to mood check-in
- Secondary: "Skip to Dashboard" — goes directly to dashboard, skipping mood check-in

### 4. Sound Effects

- Play a gentle `chime` sound when the Welcome Back screen appears (via `useSoundEffects`)
- Play `ascending` sound if streak is successfully repaired
- Respect `wr_sound_effects_enabled` setting and `prefers-reduced-motion`

### 5. Animation

- Welcome Back screen fades in (300ms opacity + slight Y-translate, same pattern as mood check-in)
- Streak repair card slides in from bottom (200ms) after main content appears (staggered 500ms delay)
- "What's New" items stagger in (100ms each, 700ms delay from screen appear)
- All animations respect `prefers-reduced-motion` — if reduced motion, show everything immediately with no animation

---

## Auth Gating

This feature is entirely within the authenticated dashboard. Logged-out users never see the dashboard and therefore never see the Welcome Back screen.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Welcome Back screen | Never shown (dashboard not rendered for logged-out users) | Shown when returning after 3+ days of inactivity | N/A |
| Streak repair from Welcome Back | Never available | Available per existing `useStreakRepair` rules | N/A |
| "Step Back In" button | Never shown | Advances to mood check-in phase | N/A |
| "Skip to Dashboard" button | Never shown | Advances directly to dashboard phase | N/A |
| "What's New" section | Never shown | Shown if relevant items exist since `lastActiveDate` | N/A |

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Full-screen centered. Content stacks vertically with comfortable spacing. Buttons are full-width. Streak repair card has full-width within padding. "What's New" items stack with 8px gap. 44px minimum touch targets on all interactive elements. |
| Tablet (640-1024px) | Same full-screen centered layout. Content max-width ~500px. Buttons auto-width, centered. Slightly more generous padding. |
| Desktop (> 1024px) | Full-screen centered. Content max-width ~480px. Buttons auto-width, centered. Comfortable vertical spacing between sections. |

All breakpoints: the screen fills the viewport with the radial gradient background. Content is vertically and horizontally centered. No navbar is visible (same pattern as mood check-in overlay).

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. All copy is hardcoded constants. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users (demo mode):** Never see this feature. The dashboard is auth-gated; logged-out users see the landing page. Zero persistence applies.
- **Logged-in users:** Welcome Back reads from `wr_streak` (existing) and `wr_streak_repairs` (existing) to determine inactivity and repair availability. Streak repair modifies `wr_streak` and potentially `wr_faith_points` via the existing `useStreakRepair` hook.
- **Same-day dismissal:** Tracked via `sessionStorage` (not localStorage) so it resets on browser close but persists within a session.
- **Route type:** No dedicated route. This is a new phase within the existing Dashboard component at `/`.

### localStorage keys used (all existing — no new keys):
- `wr_streak` — read `lastActiveDate` and `currentStreak` for inactivity detection and streak display
- `wr_streak_repairs` — read `previousStreak` and repair availability via `useStreakRepair` hook
- `wr_faith_points` — read for paid repair availability check
- `wr_user_name` — read for personalized greeting
- `wr_challenge_progress` — read for "What's New" challenge detection
- `wr_friends` — read for "What's New" friend activity estimation

### sessionStorage keys (new):
- `wr_welcome_back_shown` — `"true"` when Welcome Back has been shown this session. Prevents re-showing on same-session navigations.

---

## Completion & Navigation

N/A — This is a re-entry flow, not a completable activity. `recordActivity()` is NOT called by Welcome Back. It does not contribute to streaks, faith points, or badges. After Welcome Back is dismissed, the normal dashboard flow continues (mood check-in or dashboard).

---

## Design Notes

### Background & Layout
- Full-screen overlay with radial gradient background matching the mood check-in pattern (dark purple radial gradient, similar to what's documented in the design system recon under "Inner Page Hero" gradients)
- This is a new full-screen phase overlay in the dashboard, using the same approach as the existing `MoodCheckIn` component

### Typography
- "Welcome Back" heading: `font-script` (Caveat), large — warm and personal
- "We've been holding your spot.": `font-sans` (Inter), muted white — reassuring
- Grace line "Life happens...": italic, muted — gentle emotional copy
- "What's New" items: muted white with slightly brighter content names

### Components to Reuse
- **`useStreakRepair` hook** — existing streak repair logic, this screen is a new consumer
- **`useSoundEffects` hook** — for chime on appear and ascending on repair
- **`useToast` hook** — for repair success toast
- **`useFaithPoints` hook** — for reading streak data and faith points
- **Frosted glass card pattern** — same as dashboard cards (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **`useLiturgicalSeason` hook** — for "What's New" seasonal content detection

### New Visual Patterns
- **Welcome Back full-screen overlay** — similar to mood check-in but with different content structure (greeting + optional repair card + optional "What's New" + dual CTAs). The mood check-in overlay pattern already exists; this adapts it for a different purpose.
- **Staggered content reveal** — content sections appear in sequence with animation delays. This is a new animation pattern not yet used elsewhere (mood check-in fades in as a whole).

---

## Edge Cases

- **Brand-new user (no `wr_streak` data):** Welcome Back is skipped entirely. Onboarding wizard takes precedence.
- **User with `wr_streak` but `lastActiveDate` is yesterday (1 day ago):** Normal mood check-in. No Welcome Back.
- **User with `wr_streak` but `lastActiveDate` is exactly 3 days ago:** Welcome Back triggers (>= 3).
- **User repairs streak from Welcome Back, then navigates away and returns same session:** Welcome Back does not re-show (sessionStorage flag).
- **User repairs streak from Welcome Back, closes browser, reopens next day:** `lastActiveDate` was updated by the repair to today, so tomorrow they'll be 1 day inactive — no Welcome Back.
- **User dismisses Welcome Back without repairing, navigates away, returns same session:** Welcome Back does not re-show (sessionStorage flag).
- **User clicks "Skip to Dashboard":** Mood check-in is bypassed. User goes straight to the dashboard. This is intentional — forcing a mood check-in on a returning user adds friction at the worst possible moment.
- **No "What's New" items available:** The "While you were away" section is omitted entirely. The screen shows greeting + optional repair + CTAs.
- **User has no previous streak (streak was 0 before inactivity):** No streak section shown. Just the warm greeting and CTAs.
- **`wr_streak` data is corrupted:** Treat as no data. Skip Welcome Back. Let normal flow handle it.
- **sessionStorage unavailable:** Welcome Back may re-show on same-session navigation. This is a minor UX annoyance, not a crash.

---

## Out of Scope

- **Push notifications or email re-engagement** — Phase 3 backend
- **Real "What's New" data from backend** — mock/estimated counts are fine for frontend-only phase
- **Changes to the mood check-in flow itself** — mood check-in is untouched
- **Changes to the streak repair logic** — uses the existing `useStreakRepair` hook as-is
- **Dashboard widget changes or priority reordering** — dashboard content is untouched
- **New localStorage keys** — all data is read from existing keys
- **Backend API endpoints** — Phase 3
- **A/B testing or analytics for re-engagement** — Phase 3
- **Customizable "What's New" items** — hardcoded detection logic is sufficient
- **Welcome Back for logged-out users** — dashboard is auth-gated; this feature only applies to authenticated users

---

## Acceptance Criteria

### Inactivity Detection
- [ ] User returning after 3+ days of inactivity sees the Welcome Back screen before mood check-in
- [ ] User returning after 1-2 days sees normal mood check-in (no Welcome Back)
- [ ] User returning after exactly 3 days sees Welcome Back (boundary: >= 3)
- [ ] Brand-new user (no `wr_streak` data) sees onboarding wizard (no Welcome Back)
- [ ] User with `wr_streak` data but no `lastActiveDate` is treated as a new user (no Welcome Back)

### Welcome Back Screen Content
- [ ] Welcome Back screen shows warm greeting with the user's name (from `wr_user_name`) when available
- [ ] Welcome Back screen shows "Welcome Back" (without name) when `wr_user_name` is not set
- [ ] Subheading "We've been holding your spot." is visible
- [ ] If previous streak existed (> 1), the message mentions the streak count: "You had a {X}-day streak going."
- [ ] Grace line "Life happens — and God's grace covers every gap." is shown in italic when streak section is visible
- [ ] If no previous streak (streak was 0 or 1 before inactivity), streak section is omitted

### Streak Repair Integration
- [ ] Streak repair card appears when repair is available (free or paid) and `previousStreak` > 1
- [ ] "Use Free Repair" button appears when `freeRepairAvailable` is true
- [ ] "Repair for 50 pts" button appears when free repair is used and user has 50+ faith points
- [ ] Repair card is hidden when no repair is available (free used, insufficient points)
- [ ] Repair card is hidden when no `previousStreak` exists
- [ ] Successful repair restores the streak, shows toast, and plays ascending sound
- [ ] After successful repair, screen auto-advances to mood check-in phase

### "What's New" Section
- [ ] "While you were away:" section shows 1-3 relevant items when available
- [ ] "While you were away:" section is completely hidden when no items are relevant
- [ ] Items display with muted text and brighter content names

### Navigation & Phase Flow
- [ ] "Step Back In" proceeds to mood check-in phase
- [ ] "Skip to Dashboard" goes directly to dashboard, skipping mood check-in
- [ ] Welcome Back does not re-show if user navigates away and returns the same session (sessionStorage)
- [ ] Welcome Back shows again if user is inactive for another 3+ days in a future session
- [ ] Existing dashboard functionality is unchanged for users who don't trigger Welcome Back
- [ ] Phase machine correctly sequences: onboarding -> welcome_back -> check_in -> recommendations -> dashboard_enter -> dashboard

### Sound & Animation
- [ ] Chime sound plays when Welcome Back screen appears (respects `wr_sound_effects_enabled` and `prefers-reduced-motion`)
- [ ] Ascending sound plays on successful streak repair
- [ ] Welcome Back screen fades in with 300ms opacity + Y-translate animation
- [ ] Streak repair card slides in from bottom with staggered 500ms delay
- [ ] "What's New" items stagger in with 100ms intervals at 700ms delay
- [ ] All animations disabled when `prefers-reduced-motion` is active — content appears immediately

### Responsive
- [ ] Mobile (375px): content centered, buttons full-width, 44px minimum touch targets, comfortable vertical spacing
- [ ] Tablet (768px): content centered with ~500px max-width, buttons auto-width
- [ ] Desktop (1440px): content centered with ~480px max-width, buttons auto-width

### Visual Verification
- [ ] Background uses dark radial gradient matching the mood check-in overlay pattern
- [ ] "Welcome Back" heading uses Caveat (font-script) in white at large size
- [ ] Subheading uses Inter in muted white (white/70)
- [ ] Streak repair card uses frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] "Step Back In" primary CTA uses primary purple (`bg-primary text-white rounded-full`)
- [ ] "Skip to Dashboard" uses subtle muted style (`text-white/50`)
- [ ] No navbar visible during Welcome Back screen (full-screen overlay)

### Gamification Guard
- [ ] `recordActivity()` is NOT called by Welcome Back — it's a re-entry flow, not an activity

### Accessibility
- [ ] All interactive elements are keyboard accessible with visible focus indicators
- [ ] Screen reader announces the Welcome Back greeting
- [ ] Repair button has clear accessible name (visible text serves as label)
- [ ] After repair, restored streak is announced via `aria-live` region
- [ ] "Skip to Dashboard" link is keyboard-focusable and has clear accessible name
- [ ] `prefers-reduced-motion` respected for all animations and sound triggers
