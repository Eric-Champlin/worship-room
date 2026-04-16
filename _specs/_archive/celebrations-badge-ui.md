# Feature: Celebrations & Badge Collection UI

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec consumes `wr_badges` (owned by Spec 7), `wr_streak` (owned by Spec 5), `wr_faith_points` (owned by Spec 5)
- Cross-spec dependencies: Spec 7 (Badge Definitions & Unlock Logic) provides the `newlyEarned` queue, badge definitions, celebration tiers, level-up verses, and `earned`/`activityCounts` data this spec reads; Spec 5 (Streak & Faith Points Engine) provides streak data for reset detection; Spec 6 (Dashboard Widgets + Activity Integration) provides the Streak card this spec extends with recent badges and streak reset messaging; Spec 2 (Dashboard Shell) provides the dashboard container that triggers the celebration queue
- Shared constants: Badge definitions (IDs, names, tiers), level-up verses, level thresholds from Spec 7; level icon mappings from Spec 6
- Shared utilities: `getLocalDateString()` from Spec 1's `utils/date.ts`; `useFaithPoints()` from Spec 5; badge data access from Spec 7

---

## Overview

The Celebrations & Badge Collection UI is the emotional payoff layer of Worship Room's gentle gamification system. When users earn badges, hit streak milestones, or level up, this system delivers scaled celebrations — from brief toasts for first-time achievements to full-screen cinematic overlays for level-up moments. It also provides the badge collection grid where users can view all earned and locked badges, creating aspirational goals without judgment.

This spec transforms the invisible engine from Spec 7 into visible, felt moments of encouragement. Every celebration is designed to say "we see you, and your faithfulness matters" without ever making the user feel guilty for what they haven't done. Streak resets are handled with quiet grace — a gentle inline message, never a toast or overlay about the loss.

The celebration system extends the existing `Toast.tsx` component (which currently supports `success` and `error` types) with new celebration-specific types, and introduces a full-screen overlay component for major milestones.

---

## User Stories

- As a **logged-in user**, I want to see a brief toast notification when I earn a first-time badge so that I feel recognized without being interrupted.
- As a **logged-in user**, I want to see a toast with confetti particles when I hit activity milestones (50th prayer, 100th journal entry) so that the moment feels special.
- As a **logged-in user**, I want a distinctive celebration when I complete a Full Worship Day (all 6 activities) so that I feel the accomplishment of broad daily engagement.
- As a **logged-in user**, I want a full-screen cinematic overlay when I level up or hit a major streak milestone (60+ days) so that the moment feels truly significant in my spiritual journey.
- As a **logged-in user**, I want the level-up overlay to include a scripture verse so that my growth is grounded in God's word.
- As a **logged-in user**, I want to see my earned badges in full color with a glow and locked badges as gray silhouettes so that I can appreciate what I've achieved and be inspired by what's ahead.
- As a **logged-in user**, I want to see my 3 most recently earned badges on the Streak card so that my recent achievements are always visible on the dashboard.
- As a **logged-in user**, I want celebrations to fire in order (toasts first, full-screen last) after a brief pause when the dashboard loads, so that I'm settled before seeing them.
- As a **logged-in user**, I want a gentle message when my streak resets — not a toast or fanfare — so that I feel encouraged to start again rather than punished for missing a day.

---

## Requirements

### Celebration Tiers

Four tiers of celebration, each mapped to specific badge categories (defined in Spec 7):

**1. `toast` — Simple toast notification**
- Used for: First-time badges (`first_prayer`, `first_journal`, `first_meditate`, `first_listen`, `first_prayerwall`, `first_friend`), streak milestones 7/14/30, Welcome badge, community first actions
- Duration: 4 seconds, auto-dismiss
- Content: Badge icon (small circular badge image or placeholder) + badge name + brief congratulations text (e.g., "You earned First Prayer!")
- Position: Bottom-right on desktop, bottom-center on mobile
- Behavior: Slides in from the right on desktop, slides up from bottom on mobile. Fades out on dismiss.
- Max 3 toasts visible simultaneously (existing Toast.tsx behavior, preserved)

**2. `toast-confetti` — Toast with CSS confetti particles**
- Used for: Activity milestones at higher counts (`prayer_100`, `journal_50`, `journal_100`, `meditate_25`, `listen_50`), community milestones (`friends_10`, `encourage_10`, `encourage_50`)
- Duration: 5 seconds, auto-dismiss
- Content: Same as basic toast but with a slightly wider card + confetti particles bursting from the toast card
- Confetti: 8-12 small colored squares/circles that animate outward from the toast using CSS `@keyframes`. Colors from the mood palette + gold/white. Particles fade out before toast dismisses.
- Falls back to basic toast when `prefers-reduced-motion` is active

**3. `special-toast` — Larger emphasis toast**
- Used for: Full Worship Day (`full_worship_day`)
- Duration: 5 seconds, auto-dismiss
- Content: Larger card with emphasis styling. Message: "Full Worship Day! 2x points earned!" with a golden/warm accent border or glow instead of the standard success green
- Visual distinction: Wider card, slightly larger text, warm accent color (gold/amber), subtle golden glow animation
- Falls back to standard-size toast without glow when `prefers-reduced-motion` is active

**4. `full-screen` — Full-screen cinematic overlay**
- Used for: Level-up badges (`level_1` through `level_6`), major streak milestones (`streak_60`, `streak_90`, `streak_180`, `streak_365`)
- Duration: Persists until user taps "Continue" button (minimum 6 seconds visible before Continue appears — this prevents accidental instant dismissal)
- Layout (vertically centered on the viewport):
  - Dark background overlay with backdrop blur (`bg-black/70 backdrop-blur-md`)
  - Badge/level icon scales in from 0 to 1 with a spring-style CSS `@keyframes` animation (overshoot to ~1.1, settle to 1.0 over ~600ms)
  - Level name (for level-ups) or streak milestone name in large serif typography (`font-serif text-3xl md:text-4xl`)
  - Encouragement message below the name (e.g., "Your faith is taking root" for Sprout, "Your light shines for all to see" for Lighthouse — these map to the level names from the master plan)
  - Scripture verse (for level-ups): the level-up verse from Spec 7's verse table, displayed in italic serif below the encouragement, with the reference beneath
  - For streak milestones: no verse, but an encouragement message (e.g., "60 days of faithfulness. God sees your consistency.")
  - "Continue" button at the bottom, styled as a soft white outline button (`border border-white/30 text-white hover:bg-white/10`). Appears after 6 seconds with a fade-in.
- Confetti: 20-30 small colored squares and circles with randomized `@keyframes` fall animations. Particles originate from the top of the viewport, fall with slight lateral drift, and fade out at the bottom. CSS-only (no JavaScript animation libraries). Color palette: mood colors + white + gold.
- `prefers-reduced-motion`: No confetti, no icon scale animation, no delayed Continue button. Icon appears instantly at full size. Continue button visible immediately. Background overlay still renders (it's functional, not decorative).
- The overlay captures focus and traps it (existing `useFocusTrap` hook) — Continue button receives focus automatically
- Pressing Escape also dismisses the overlay

### Extending the Existing Toast System

The existing `Toast.tsx` has a `ToastProvider` with `showToast(message, type)` supporting `success` and `error` types, positioned at top-right, with 6s auto-dismiss. This spec extends it:

- Add new toast types: `celebration`, `celebration-confetti`, `special-celebration`
- Each new type has its own visual style (dark-themed to match the dashboard, not the current light-on-white style)
- Celebration toasts render at **bottom-right** (desktop) / **bottom-center** (mobile) — separate from the existing top-right position used by success/error toasts. This prevents celebration toasts from conflicting with operational toasts.
- Celebration toast cards use the dashboard dark style: `bg-white/10 backdrop-blur-md border border-white/15 text-white` — matching the frosted glass card pattern
- Extended `showToast` signature accepts an options object for new types: icon, duration override, celebration tier info
- The existing `success`/`error` types continue to work exactly as before — no breaking changes

### Celebration Queue Processing

The celebration queue runs on the dashboard after mood check-in completes (or on direct dashboard load if mood was already logged today):

1. **1.5-second delay** after the dashboard content renders. This lets the user see the dashboard, streak counter, and chart before celebrations start. The delay is implemented via `setTimeout` in a `useEffect`.
2. **Read `newlyEarned`** from `wr_badges` in localStorage
3. **Sort by celebration tier**: All `toast` items first, then `toast-confetti`, then `special-toast`, then `full-screen` last. Within the same tier, preserve the order they were earned (the order in the `newlyEarned` array).
4. **Process sequentially**:
   - Show first toast → wait for it to auto-dismiss (or user-dismiss) + 500ms gap → show next toast → ...
   - After all toasts/toast-confetti/special-toasts are done → show full-screen overlay (if any)
   - If multiple full-screen celebrations exist (e.g., level-up + streak 60 in one session), show them one at a time — user taps Continue to see the next one
5. **Clear `newlyEarned`** array from `wr_badges` in localStorage after ALL celebrations have been shown (or on unmount if user navigates away mid-queue). This prevents re-showing celebrations on page reload.
6. **Edge case — empty queue**: If `newlyEarned` is empty, do nothing. No delay, no side effects.
7. **Edge case — user navigates away**: If the user leaves the dashboard mid-celebration, remaining celebrations are skipped and `newlyEarned` is cleared anyway (they earned them, showing is best-effort).

### Streak Reset Messaging

When the dashboard loads and the streak was recently reset (detected by: `currentStreak` is 0 OR (`currentStreak` is 1 AND `lastActiveDate` is today AND the user's streak was previously higher)):

- **No toast. No celebration. No modal.**
- A gentle inline message appears inside the Streak & Faith Points card, below the streak number: **"Every day is a new beginning. Start fresh today."**
- Styled in warm, muted text (`text-white/50 text-sm italic`) — understated, not prominent
- The message disappears once the user's streak reaches 2+ (i.e., it only shows on the first day after a reset)
- The longest streak record still displays ("Longest: X days") as quiet encouragement that their past faithfulness is remembered

Detection logic: Compare `currentStreak` with a reasonable heuristic. Since we don't persist "previous streak before reset," the simplest approach is: show the message when `currentStreak <= 1` AND `longestStreak > 1`. This means the user had a streak before, and they're starting fresh. The message does NOT show for brand-new users (whose longest streak is also 0 or 1).

### Badge Collection Grid

**Location**: Accessible from the dashboard Streak card ("View all badges" link) and from the profile page (Spec 14). For this spec, implement it as a section/modal accessible from the Streak card.

**Grid layout**:
- Responsive grid: 4 columns on mobile, 5 columns on tablet, 6 columns on desktop
- Each badge cell is a square-ish container (~64px mobile, ~80px desktop)
- Organized by category with section labels: Streak Milestones, Level-Up, Activity Milestones, Full Worship Day, First Steps, Community

**Earned badge appearance**:
- Full-color circular badge icon
- Subtle glow effect around the badge (box-shadow with badge-specific or category-specific color at low opacity)
- On hover/tap: tooltip showing badge name + date earned (e.g., "First Prayer — earned March 10, 2026")
- For `full_worship_day` (repeatable): tooltip also shows count (e.g., "Full Worship Day (x3) — last earned March 15, 2026")

**Locked badge appearance**:
- Grayscale/desaturated circular silhouette of the badge icon
- Small lock icon (Lucide `Lock`, ~16px) overlaid at bottom-right corner
- Reduced opacity (~40%)
- On hover/tap: tooltip showing badge name + requirement text (e.g., "Burning Bright — Reach a 30-day streak")
- No glow effect

**Badge icons (temporary)**:
Since custom badge artwork is Phase 4, use Lucide icons as temporary badge visuals inside colored circles:
- Streak badges: `Flame` icon in warm amber/orange tones
- Level badges: The level icon from Spec 6 (Sprout, Leaf, Flower2, TreePine, Trees, Landmark)
- Activity badges: Activity-specific icons (e.g., `HandHeart` for prayer, `BookOpen` for journal, `Brain` for meditate, `Headphones` for listen)
- Community badges: `Users` for friend badges, `Heart` for encouragement badges
- Welcome: `Sparkles` icon
- Full Worship Day: `Crown` icon in gold

**Sort options**: By category (default, grouped with section headers) — no additional sort needed for MVP.

### Recent Badges in Streak Card

The bottom section of the Streak & Faith Points card (from Spec 6) displays the 3 most recently earned badges:
- 3 small circular badge icons (~32px) in a horizontal row
- Each shows the badge icon in full color
- If fewer than 3 badges earned, show only what exists (1 or 2)
- If zero badges earned (shouldn't happen — Welcome badge is auto-earned), show nothing
- Tapping any badge opens the full badge collection grid
- A "View all badges" text link below the icons also opens the collection

### CSS-Only Confetti

All confetti effects are CSS-only — no JavaScript animation libraries:

**Toast confetti (8-12 particles)**:
- Small squares and circles (4-6px) in randomized colors from mood palette + white + gold
- Animate outward from the toast card's edges using `@keyframes` with `transform: translate()` and `opacity`
- Duration: ~1.5s, ease-out timing
- Particles created as `::before`/`::after` pseudo-elements or small `<span>` elements with unique animation delays

**Full-screen confetti (20-30 particles)**:
- Slightly larger particles (6-10px)
- Originate from top of viewport, fall downward with lateral drift
- Randomized: start position (spread across top), fall speed (2-4s), lateral drift (slight sinusoidal via multi-step keyframes), rotation
- Randomized delays so particles don't fall in sync (stagger by 100-300ms each)
- Fade out at ~80% of the animation
- Loop once — do not repeat after the initial burst

**`prefers-reduced-motion`**: All confetti elements are hidden (`display: none` inside a `@media (prefers-reduced-motion: reduce)` query or via Tailwind's `motion-reduce:hidden`). The celebration still occurs — just without particles.

---

## UX & Design Notes

- **Tone**: Warm, celebratory, never over-the-top. Celebrations should feel like a friend congratulating you, not a slot machine paying out.
- **Colors**: Dark-themed celebrations matching the dashboard. Toast cards use frosted glass (`bg-white/10 backdrop-blur-md border border-white/15`). Full-screen overlay uses `bg-black/70`. Confetti uses mood colors + white + gold.
- **Typography**: Badge names and level names in serif (`font-serif`) for gravitas. Encouragement messages and verse text in serif italic. Toast body text in Inter.
- **Animations**: All transitions gentle and smooth. Spring animation for full-screen icon (not bouncy/playful — more of a graceful reveal). Toast slide-in 300ms ease-out. Confetti particles are the only "energetic" element.
- **Sound**: No sound effects in this spec. Audio celebrations are a potential future enhancement.

### Responsive Behavior

**Mobile (< 640px)**:
- Celebration toasts: bottom-center, full width minus padding (`mx-4`), stacked vertically
- Full-screen overlay: vertically centered, content padded (`px-6`), icon slightly smaller (~80px vs 120px desktop), text sizes scale down (`text-2xl` instead of `text-4xl`)
- Badge collection grid: 4 columns, badges ~56px, scrollable if more than visible
- Confetti particle count reduced (15 for full-screen, 6 for toast) to avoid performance issues
- Continue button: larger touch target (full width, `py-4`)

**Tablet (640-1024px)**:
- Celebration toasts: bottom-right, max-width ~400px
- Full-screen overlay: same as desktop but slightly smaller icon
- Badge collection grid: 5 columns, badges ~64px
- Confetti: full count

**Desktop (> 1024px)**:
- Celebration toasts: bottom-right, max-width ~360px
- Full-screen overlay: centered, icon ~120px, generous spacing
- Badge collection grid: 6 columns, badges ~80px
- Confetti: full count

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec has no user text input. All content is system-generated (badge names, encouragement messages, verses).
- **User input involved?**: No.
- **AI-generated content?**: No — all messages, verses, and encouragement text are hardcoded constants defined in Spec 7 and this spec. No AI calls.

---

## Auth & Persistence

### Logged-out users (demo mode):
- **No celebrations fire.** The celebration queue only runs on the dashboard, which only renders for authenticated users. Logged-out users see the landing page.
- **No badge grid visible.** The badge collection is part of the dashboard/profile experience, which requires authentication.
- **Zero data persistence.** No `wr_badges` reads or writes for logged-out users.

### Logged-in users:
- Celebrations fire based on `newlyEarned` queue in `wr_badges` (localStorage).
- After celebrations complete, `newlyEarned` is cleared in localStorage.
- Badge collection grid reads `earned` and badge definitions to determine earned vs locked state.
- Recent badges in Streak card read from `earned`, sorted by `earnedAt` timestamp descending.
- Data persists across sessions and page reloads.
- `logout()` does NOT clear badge data — user retains all badges.

### Route type:
- No dedicated route. The celebration system renders as an overlay/toast layer on the dashboard. The badge collection grid is a panel/modal accessible from the dashboard Streak card.

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Celebration toasts | Never shown (dashboard not rendered) | Fire from `newlyEarned` queue after dashboard loads |
| Full-screen overlay | Never shown | Fire for level-ups and streak 60+ milestones |
| Celebration queue processing | Never runs | Runs 1.5s after dashboard content renders |
| Badge collection grid | Not accessible | Accessible from Streak card "View all badges" link |
| Recent badges in Streak card | Not visible | Shows 3 most recent earned badges |
| Streak reset message | Not visible | Shows inline in Streak card when streak recently reset |
| Toast dismiss/Continue button | N/A | User can dismiss toasts early; Continue dismisses full-screen overlay |

---

## Edge Cases

- **No badges earned yet (impossible in normal flow)**: Welcome + Seedling are auto-awarded on first auth. If somehow `earned` is empty, badge grid shows all locked. No celebrations fire.
- **Rapid page navigations**: If user leaves dashboard and returns quickly, celebrations should not re-fire if `newlyEarned` was already cleared. Check queue emptiness before starting.
- **Multiple full-screen celebrations in one session**: Extremely rare (e.g., user was offline, earned level-up + streak 60 in one session). Show them sequentially — Continue on first reveals second.
- **`newlyEarned` cleared mid-queue**: If another tab clears localStorage while celebrations are playing, remaining queue items may be lost. Acceptable — celebrations are best-effort, badge `earned` status is the source of truth.
- **Very long `newlyEarned` queue**: Unlikely but possible if user earned many badges before visiting dashboard. Cap visible celebrations at 5 toasts + 2 full-screen to avoid fatigue. Remaining badges are still marked as earned but not individually celebrated.
- **Badge grid with all badges earned**: No locked badges shown with silhouettes. Grid displays all in full color. This is an aspirational end state.
- **Corrupted `wr_badges`**: The celebration system should handle malformed data gracefully — if `newlyEarned` is not an array or `earned` is not an object, treat as empty defaults. No crashes.
- **`prefers-reduced-motion` toggled mid-celebration**: CSS media queries handle this automatically — confetti hides, animations snap to final state.
- **Celebration queue on page refresh**: If user refreshes during celebrations, `newlyEarned` may or may not have been cleared (depending on when in the queue the clear happened). If not cleared, celebrations restart from the beginning on re-render. This is acceptable and preferred over missing celebrations.

---

## Out of Scope

- **Badge artwork/custom SVG icons** — Phase 4. This spec uses Lucide icons as temporary visuals.
- **Badge sharing to social media** — not in MVP
- **Sound effects for celebrations** — potential future enhancement
- **Celebration replay** ("show me that again") — not in MVP
- **Badge detail page/modal** (individual badge with full description, progress bar) — not in MVP. Tooltips provide sufficient info.
- **Profile page badge showcase** — Spec 14 (this spec builds the grid component; Spec 14 embeds it on the profile page)
- **Backend API persistence** — Phase 3
- **Real authentication** — Phase 3 (uses simulated auth from Spec 2's AuthProvider)
- **Custom celebration messages** — all messages are hardcoded in this spec
- **Notification system integration** (badge-earned notifications) — Spec 12
- **Animation libraries** (Framer Motion, React Spring, Lottie) — CSS-only animations are required. No JS animation libraries.
- **Toast for streak reset** — explicitly excluded. Streak resets are handled with inline messaging only.

---

## Acceptance Criteria

### Toast System Extension
- [ ] Existing `Toast.tsx` is extended (not replaced) with new celebration types: `celebration`, `celebration-confetti`, `special-celebration`
- [ ] Existing `success` and `error` toast types continue to work exactly as before (no breaking changes)
- [ ] Celebration toasts render at bottom-right (desktop) / bottom-center (mobile), separate from operational toasts at top-right
- [ ] Celebration toast cards use dark frosted glass styling (`bg-white/10 backdrop-blur-md border border-white/15 text-white`)
- [ ] `celebration` type auto-dismisses after 4 seconds
- [ ] `celebration-confetti` type auto-dismisses after 5 seconds and shows CSS confetti particles
- [ ] `special-celebration` type (Full Worship Day) auto-dismisses after 5 seconds with golden/warm accent styling
- [ ] Max 3 celebration toasts visible simultaneously
- [ ] Toasts slide in from right on desktop, slide up from bottom on mobile

### Full-Screen Celebration Overlay
- [ ] Renders dark overlay with backdrop blur (`bg-black/70 backdrop-blur-md`)
- [ ] Badge/level icon scales in with CSS spring animation (overshoot to ~1.1, settle to 1.0, ~600ms)
- [ ] Level name or streak milestone name displays in serif font (`font-serif text-3xl md:text-4xl`)
- [ ] Encouragement message displays below the name
- [ ] For level-up celebrations: scripture verse from Spec 7's level-up verses table displays in italic serif with reference
- [ ] For streak milestone celebrations (60+): encouragement message displays (no verse)
- [ ] "Continue" button appears after 6-second delay with fade-in animation
- [ ] "Continue" button dismisses the overlay
- [ ] Escape key also dismisses the overlay
- [ ] Focus is trapped within the overlay (using existing `useFocusTrap` hook)
- [ ] Continue button receives focus automatically when it appears

### CSS-Only Confetti
- [ ] Toast confetti: 8-12 particles animate outward from toast card edges, ~1.5s duration
- [ ] Full-screen confetti: 20-30 particles fall from top of viewport with lateral drift, 2-4s duration
- [ ] Particles use colors from mood palette + white + gold
- [ ] Particles have randomized delays, speeds, and positions (no synchronized movement)
- [ ] All confetti is pure CSS (`@keyframes`, no JavaScript animation libraries)
- [ ] Confetti particle count reduced on mobile (6 for toast, 15 for full-screen)

### Celebration Queue Processing
- [ ] Queue processing begins 1.5 seconds after dashboard content renders
- [ ] `newlyEarned` array is read from `wr_badges` in localStorage
- [ ] Celebrations sorted by tier: `toast` first, then `toast-confetti`, then `special-toast`, then `full-screen` last
- [ ] Within the same tier, original `newlyEarned` order is preserved
- [ ] Toasts process sequentially with ~500ms gap between each
- [ ] Full-screen overlays show one at a time — Continue reveals next
- [ ] `newlyEarned` is cleared from localStorage after all celebrations complete
- [ ] Empty `newlyEarned` queue results in no delay and no side effects
- [ ] If user navigates away mid-celebration, remaining celebrations are skipped and `newlyEarned` is cleared
- [ ] Celebration queue capped at 5 toasts + 2 full-screen to avoid celebration fatigue

### Streak Reset Messaging
- [ ] When `currentStreak <= 1` AND `longestStreak > 1`, gentle inline message appears in Streak card: "Every day is a new beginning. Start fresh today."
- [ ] Message is styled in warm muted text (`text-white/50 text-sm italic`)
- [ ] No toast, no modal, no full-screen overlay for streak resets
- [ ] Message disappears when streak reaches 2+
- [ ] Message does NOT appear for brand-new users (longestStreak is 0 or 1)
- [ ] Longest streak record still displays alongside the message

### Badge Collection Grid
- [ ] Grid displays all ~35 badges organized by category with section labels
- [ ] Responsive columns: 4 (mobile), 5 (tablet), 6 (desktop)
- [ ] Badge cell sizes: ~56px (mobile), ~64px (tablet), ~80px (desktop)
- [ ] Earned badges display in full color with subtle glow effect (category-colored box-shadow)
- [ ] Locked badges display as grayscale silhouettes at ~40% opacity with lock icon overlay (Lucide `Lock`, ~16px, bottom-right)
- [ ] Hover/tap on earned badge shows tooltip: badge name + earned date (formatted as "March 10, 2026")
- [ ] Hover/tap on locked badge shows tooltip: badge name + requirement text (e.g., "Reach a 30-day streak")
- [ ] Repeatable badge (`full_worship_day`) tooltip shows count (e.g., "Full Worship Day (x3)")
- [ ] Badge icons use Lucide icons as temporary placeholders (Flame for streak, level icons for level-up, etc.)

### Recent Badges in Streak Card
- [ ] Bottom of Streak & Faith Points card shows up to 3 most recently earned badges as small circular icons (~32px)
- [ ] Badges sorted by `earnedAt` timestamp, most recent first
- [ ] Tapping any badge opens the full badge collection grid
- [ ] "View all badges" text link below the icons also opens the collection
- [ ] If fewer than 3 badges earned, only shows what exists
- [ ] If zero badges (edge case), section is hidden

### Accessibility
- [ ] Full-screen overlay uses `role="dialog"` with `aria-labelledby` pointing to the celebration title
- [ ] Focus trapped within full-screen overlay (existing `useFocusTrap` hook)
- [ ] Continue button has clear accessible name
- [ ] Celebration toasts use `role="status"` with `aria-live="polite"`
- [ ] Badge grid items have `aria-label` describing the badge (name + earned/locked status)
- [ ] Tooltips accessible via keyboard focus (not hover-only)
- [ ] All confetti hidden when `prefers-reduced-motion` is active (`motion-reduce:hidden` or `@media`)
- [ ] Full-screen icon scale animation disabled with `prefers-reduced-motion` — icon appears at full size instantly
- [ ] Continue button appears immediately (no 6s delay) when `prefers-reduced-motion` is active
- [ ] Toast slide animations replaced with instant appear/disappear when `prefers-reduced-motion` is active

### Responsive Behavior
- [ ] Mobile (< 640px): celebration toasts bottom-center, full width minus padding; badge grid 4 columns; full-screen icon ~80px; reduced confetti count
- [ ] Tablet (640-1024px): celebration toasts bottom-right, max-width ~400px; badge grid 5 columns
- [ ] Desktop (> 1024px): celebration toasts bottom-right, max-width ~360px; badge grid 6 columns; full-screen icon ~120px

### Error Handling
- [ ] Corrupted `wr_badges` (invalid JSON): celebration system treats as empty — no celebrations, no crash
- [ ] Malformed `newlyEarned` (not an array): treated as empty array
- [ ] Badge ID in `newlyEarned` not found in badge definitions: skipped silently
- [ ] localStorage unavailable: no celebrations, no badge grid, no crash — graceful degradation

### Visual Verification Criteria
- [ ] Celebration toast card background matches dashboard frosted glass pattern (same opacity, blur, border as DashboardCard)
- [ ] Full-screen overlay backdrop blur is visually distinct from the dashboard content behind it
- [ ] Badge glow effect on earned badges is visible but subtle (not harsh or distracting)
- [ ] Locked badge grayscale + lock icon is clearly distinguishable from earned badges at a glance
- [ ] Special-toast (Full Worship Day) has a warm golden accent that visually differentiates it from standard celebration toasts
- [ ] Confetti colors are a mix of mood palette + white + gold (not a single color)
- [ ] Full-screen scripture verse is legible and properly spaced from the encouragement message above it
