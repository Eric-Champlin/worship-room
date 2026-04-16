# Feature: Welcome Wizard Onboarding

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec introduces `wr_onboarding_complete` and writes to `wr_user_name` and `wr_settings.profile.avatarId`
- Cross-spec dependencies: Spec 2 (Dashboard Shell) provides `AuthProvider`, route switching (`/` renders Dashboard vs Home), and navbar logged-in state; Spec 14 (Profile & Avatars) provides `ProfileAvatar` component and avatar preset definitions; Spec 1 (Mood Check-In) provides the daily check-in flow — the wizard replaces the check-in on first login only
- Shared constants: Avatar presets from `dashboard/avatars.ts`; quiz questions, scoring, and destinations from `quiz-data.ts`
- Shared utilities: `useAuth()` from auth context
- **Onboarding sequence**: This is Spec 1 of a 3-spec onboarding sequence

---

## Overview

The Welcome Wizard is a 4-screen guided onboarding experience that greets users immediately after their first login. In an app built around emotional healing, the first moments matter — the wizard ensures that new users feel welcomed, empowered to personalize their identity, and guided toward the feature most likely to help them right now.

The wizard accomplishes three things:
1. **Personalizes the experience** — the user confirms or edits their display name
2. **Establishes visual identity** — the user selects a faith-themed avatar from 16 presets
3. **Routes to the right starting point** — an embedded quiz determines which feature best fits the user's current needs, and the final screen provides a personalized recommendation with a direct CTA

The wizard renders INSTEAD of the dashboard's normal first-visit flow (mood check-in) on first login. After completing or skipping the wizard, the `wr_onboarding_complete` flag is set in localStorage, and subsequent visits proceed to the mood check-in / dashboard as normal.

---

## User Stories

- As a **logged-in user on my first visit**, I want to be greeted with a warm welcome wizard so that I feel at home and guided rather than overwhelmed.
- As a **logged-in user on my first visit**, I want to edit my display name so that the app addresses me the way I prefer.
- As a **logged-in user on my first visit**, I want to choose a faith-themed avatar so that I have a visual identity in the community from day one.
- As a **logged-in user on my first visit**, I want to take a short quiz about my needs so that I'm guided to the feature most likely to help me right now.
- As a **logged-in user on my first visit**, I want a clear "Start Your Journey" CTA after the quiz so that I know exactly where to go next.
- As a **logged-in user on my first visit**, I want to skip the wizard if I'm not interested so that I can explore on my own immediately.

---

## Requirements

### Trigger & Lifecycle

- The wizard appears when ALL of the following are true:
  1. User is authenticated (`isAuthenticated === true` from `AuthProvider`)
  2. `localStorage.getItem('wr_onboarding_complete')` is NOT `"true"`
- When the wizard is active, it renders INSTEAD of the mood check-in and dashboard content. The normal dashboard phase system (check for today's check-in → show mood check-in or dashboard) is entirely bypassed.
- After completing or skipping the wizard, `wr_onboarding_complete` is set to `"true"` in localStorage. The wizard never appears again.
- On the user's second visit (wizard complete, mood check-in not done today), the mood check-in appears as normal.
- `logout()` does NOT clear `wr_onboarding_complete` — the wizard is a one-time experience tied to the device/browser, not to the auth session.

### Screen 1: Welcome

- **Heading**: "Welcome to Worship Room" in Caveat script font, large, white
- **Subheading**: "A safe place to heal, grow, and connect with God" in Inter, white/80
- **Display Name Input**:
  - Label: "What should we call you?"
  - Pre-filled with the user's current `wr_user_name` value from localStorage (set during simulated login)
  - Editable text input, 2-30 characters
  - Validation: show inline error "Name must be 2-30 characters" if outside range
  - The name is NOT saved until the wizard completes (saved on final screen CTA)
- **Navigation**: "Next" button (primary CTA) — disabled if name is empty or outside the 2-30 character range

### Screen 2: Avatar Selection

- **Heading**: "Choose Your Avatar" in white
- **Subheading**: "Pick an icon that speaks to you" in white/70
- **Avatar Grid**: Display all 16 preset avatars using the existing `ProfileAvatar` component
  - Organized by 4 categories: Nature, Faith, Water, Light
  - Category labels shown above each row
  - Avatars displayed in a 4×4 grid (4 per category row)
  - Each avatar is rendered as a circular icon on its colored background
- **Selection Behavior**:
  - Default selection: the user's current `avatarId` from `wr_settings.profile.avatarId`, or `nature-dove` (default) if none set
  - Selected avatar gets a prominent purple ring highlight (`ring-2 ring-offset-2 ring-primary`, ring-offset uses the wizard background color)
  - Tapping an avatar immediately updates the selection (no confirmation needed on this screen)
  - Avatar selection is NOT saved until the wizard completes
- **Unlockable avatars are NOT shown** — they require badges the user can't have on first login. This keeps the grid clean and avoids confusion.
- **Navigation**: "Next" and "Back" buttons

### Screen 3: Starting Point Quiz

- **Heading**: "What Brought You Here?" in white
- **Subheading**: "Help us point you in the right direction" in white/70
- **Quiz Content**: Reuse the existing quiz logic from `quiz-data.ts` — same 5 questions, same 4 options per question, same scoring logic, same 7 possible destinations
- **Presentation Differences from Landing Page Version**:
  - No section heading, no `BackgroundSquiggle`, no section container — the quiz questions render directly in the wizard card
  - Quiz options styled to match the wizard's dark theme (dark frosted glass cards for options, not the landing page's white cards)
  - Progress indicator: dot stepper at the bottom of the wizard (shared with wizard navigation), not the quiz's own progress bar
  - Auto-advance on option selection: after selecting an option, auto-advance to the next question after ~400ms (same behavior as the landing page quiz)
  - "Back" navigation: wizard Back button goes to the previous question if on Q2-Q5, and to Screen 2 (Avatar) if on Q1
- **Quiz Result**: The quiz result (winning destination with title, description, verse, and route) is passed to Screen 4 via React state — no URL params, no localStorage
- **Navigation**: "Next" is hidden during quiz (auto-advance handles forward movement). "Back" is always visible.

### Screen 4: Results & Launch

- **Heading**: "You're All Set!" in white
- **Quiz Result Section** (frosted glass card):
  - Result title: "We'd recommend starting with [Feature Name]" (same recommendation text from `quiz-data.ts` destinations)
  - Result description: 2-3 sentence explanation from the quiz destination data
  - Scripture verse in italic serif font with reference
- **Primary CTA**: "Start Your Journey" button — navigates to the recommended route from the quiz result
- **Secondary Action**: "Explore on your own" text link — dismisses the wizard and goes to the dashboard
- **On Either CTA**:
  1. Save display name from Screen 1 to `wr_user_name` in localStorage
  2. Update `user.name` in `AuthProvider` context (so the greeting updates everywhere)
  3. Save selected avatar from Screen 2 to `wr_settings.profile.avatarId` in localStorage
  4. Set `wr_onboarding_complete` to `"true"` in localStorage
  5. Navigate to the destination (Start Your Journey → recommended route, Explore on your own → dashboard)

### "Skip for Now" Behavior

- A "Skip for now" text link is visible on ALL 4 screens
- Positioned at the bottom of the screen, small and understated (same treatment as the mood check-in's "Not right now" link)
- Clicking "Skip for now":
  1. Sets `wr_onboarding_complete` to `"true"` in localStorage
  2. Does NOT save display name changes or avatar selection (preserves whatever was already in localStorage)
  3. Navigates to the dashboard
- The wizard never appears again after skipping

### Wizard Navigation & Progress

- **Dot Indicator**: 4 dots at the bottom of the wizard content area, showing the current screen
  - Active dot: filled primary purple, slightly larger
  - Inactive dots: white/30, standard size
  - Dots are not clickable (no random-access navigation)
- **Next Button**: Primary CTA style, right-aligned. Label changes per screen:
  - Screen 1: "Next"
  - Screen 2: "Next"
  - Screen 3: Hidden (auto-advance from quiz handles progression; auto-advances to Screen 4 after Q5)
  - Screen 4: "Start Your Journey"
- **Back Button**: Secondary/ghost style, left-aligned. Behavior:
  - Screen 1: Hidden (no previous screen)
  - Screen 2: Goes to Screen 1
  - Screen 3 (Q1): Goes to Screen 2
  - Screen 3 (Q2-Q5): Goes to previous quiz question
  - Screen 4: Goes to Screen 3 (last quiz question — Q5)

### Transitions & Animation

- **Screen transitions**: Horizontal slide animation between screens
  - Forward (Next/auto-advance): content slides out left, new content slides in from right
  - Backward (Back): content slides out right, new content slides in from left
  - Duration: 300ms ease-in-out
  - `prefers-reduced-motion`: transitions are instant (no slide, immediate swap)
- **Entrance animation**: Wizard fades in on initial render (400ms)
- **Avatar selection**: Selected ring animates with a brief scale pulse (150ms)

---

## AI Safety Considerations

- **Crisis detection needed?**: No — the wizard has no free-text input. Screen 1's display name field is a constrained name input (2-30 chars), not emotional text. The quiz on Screen 3 uses predefined multiple-choice options only.
- **User input involved?**: Minimal — display name text input (constrained, not emotional content) and multiple-choice quiz selections. No text that could express crisis or distress.
- **AI-generated content?**: No — all wizard content is static (headings, descriptions, quiz questions, scripture verses from hardcoded data).

---

## Auth Gating

### Logged-out users:
- **Never see the wizard** — the dashboard is auth-gated, so logged-out users see the landing page at `/`. The wizard exists entirely within the authenticated flow.
- **Zero data persistence** — no reads or writes to `wr_*` keys.

### Logged-in users:
- See the wizard on their first visit after login (when `wr_onboarding_complete` is not `"true"`)
- All wizard interactions are available
- Data is saved to localStorage on wizard completion

### Auth gating per element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Wizard overlay | Not visible (landing page shown) | Renders if `wr_onboarding_complete !== "true"` |
| Display name input | Not accessible | Editable, pre-filled from `wr_user_name` |
| Avatar grid | Not accessible | 16 presets selectable |
| Quiz questions | Not accessible | All 5 questions interactive with auto-advance |
| "Start Your Journey" CTA | Not accessible | Saves data, navigates to recommended route |
| "Explore on your own" link | Not accessible | Saves data, navigates to dashboard |
| "Skip for now" link | Not accessible | Sets `wr_onboarding_complete`, navigates to dashboard |

---

## Auth & Persistence

### Logged-out users (demo mode):
- See the landing page at `/` — no wizard, no dashboard
- Zero data persistence

### Logged-in users:
- Wizard reads:
  - `wr_user_name` — to pre-fill display name on Screen 1
  - `wr_settings.profile.avatarId` — to pre-select avatar on Screen 2 (or default to `nature-dove`)
  - `wr_onboarding_complete` — to determine if wizard should show
- Wizard writes (on completion only — not on skip):
  - `wr_user_name` — updated display name
  - `wr_settings.profile.avatarId` — selected avatar ID
- Wizard writes (on both completion and skip):
  - `wr_onboarding_complete` — set to `"true"`

### Route type:
- Not a separate route. Conditional render inside the Dashboard page component at `/`, same pattern as the mood check-in. The priority order is:
  1. If `wr_onboarding_complete !== "true"` → render wizard
  2. Else if not checked in today and not skipped → render mood check-in (Spec 1)
  3. Else → render dashboard content (Spec 2)

---

## UX & Design Notes

### Visual Design

- **Wizard overlay**: Full-screen, fills the entire viewport (`min-h-screen`). Background: `bg-[#0f0a1e]` (same deep dark purple as dashboard). This is the same background the dashboard uses — the wizard IS the dashboard's first-time state, not a separate modal.
- **Content card**: Frosted glass card centered on screen — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`. Max-width ~560px on desktop, near-full-width on mobile with `mx-4` margins.
- **Heading typography**: Caveat script font (`font-script`) for the welcome title on Screen 1 and the "You're All Set!" on Screen 4. Inter bold for Screen 2 and Screen 3 headings. White color.
- **Subheading typography**: Inter, `text-white/70`, `text-base md:text-lg`
- **Display name input (Screen 1)**: Dark semi-transparent background (`bg-white/5`), white text, `border border-white/15 focus:border-primary rounded-lg`, `py-3 px-4`. Label in `text-white/70 text-sm`. Error text in `text-danger text-sm`.
- **Avatar grid (Screen 2)**: Each avatar uses the existing `ProfileAvatar` component at `sm` size (80px would be too large in the wizard — use `xs` size or a custom size appropriate for the 4×4 grid). Category labels in `text-white/50 text-xs uppercase tracking-wider font-semibold`.
- **Quiz options (Screen 3)**: Dark frosted glass option cards — `bg-white/5 border border-white/10 rounded-xl p-4`. Selected state: `border-primary bg-primary/10` with a checkmark icon. Hover: `bg-white/10`.
- **Result card (Screen 4)**: Frosted glass card with the quiz recommendation. Scripture verse in `font-serif italic text-white/80`. CTA uses primary button style (`bg-primary text-white rounded-lg py-3 px-8 font-semibold`).
- **Skip link**: `text-sm text-white/40 hover:text-white/60 underline-offset-4` — intentionally understated, at the bottom of the screen.
- **Dot indicator**: `flex gap-2` centered below the content card. Active: `w-3 h-3 rounded-full bg-primary`. Inactive: `w-2 h-2 rounded-full bg-white/30`.
- **Back button**: Ghost style — `text-white/60 hover:text-white text-sm font-medium`. Left-aligned.
- **Next button**: Primary CTA — `bg-primary text-white rounded-lg py-3 px-8 font-semibold`. Right-aligned.
- **Navigation row**: `flex justify-between items-center` below the content card, with Back on left, dots in center, Next on right.

### Design System Recon References

- **Frosted glass card**: Match dashboard card pattern — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- **Dark page background**: `bg-[#0f0a1e]` matching the dashboard
- **Primary CTA button**: `bg-primary text-white font-semibold py-3 px-8 rounded-lg`
- **Skip link**: Same treatment as mood check-in's "Not right now" — `text-sm text-white/40`
- **Avatar component**: Existing `ProfileAvatar` from Spec 14
- **Quiz scoring**: Existing `quiz-data.ts` from the landing page Starting Point Quiz

**New visual patterns**: 2
1. **Wizard dot stepper** — 4 dots with active/inactive states. New UI element not in the existing design system.
2. **Dark-themed quiz option cards** — the landing page quiz uses white cards on light background; the wizard uses frosted glass cards on dark background. New variant.

### Animations

- **Wizard entrance**: Fade-in (`opacity 0→1, 400ms ease-in-out`)
- **Screen transitions**: Horizontal slide (300ms ease-in-out). Forward: slide-out-left + slide-in-from-right. Backward: slide-out-right + slide-in-from-left.
- **Quiz auto-advance**: 400ms delay after option selection, then slide transition to next question
- **Avatar selection ring**: Brief scale pulse (150ms) on the ring when a new avatar is selected
- **`prefers-reduced-motion`**: All animations instant — no slide, no fade, no pulse

---

## Responsive Behavior

### Mobile (< 640px)

- **Wizard layout**: Full viewport height, content vertically centered with `px-4` padding
- **Content card**: Near-full-width (`mx-4`), `p-4` internal padding
- **Screen 1 (Welcome)**: Heading `text-3xl`, input full-width, stacked vertically
- **Screen 2 (Avatar)**: 4×4 grid with smaller avatars (~56px per avatar with `gap-3`). Category labels above each row. Grid fits within the card width on 375px screens.
- **Screen 3 (Quiz)**: Options stack vertically (full-width cards). Question text `text-base`.
- **Screen 4 (Results)**: Result card full-width, CTA button full-width, secondary link centered below
- **Navigation row**: Back and Next buttons at edges, dots centered. Minimum 44px touch targets on all interactive elements.
- **Skip link**: Full-width tap target area (44px height minimum), centered text

### Tablet (640px–1024px)

- **Content card**: ~480px max-width centered
- **Screen 2 (Avatar)**: 4×4 grid with ~64px avatars, comfortable spacing
- **Screen 3 (Quiz)**: Options in a single column with generous padding
- **Navigation**: Same layout as mobile but with more breathing room

### Desktop (> 1024px)

- **Content card**: ~560px max-width centered
- **Screen 1 (Welcome)**: Heading `text-4xl` in Caveat
- **Screen 2 (Avatar)**: 4×4 grid with ~72px avatars, category labels, generous spacing
- **Screen 3 (Quiz)**: Options in a single column, wider cards
- **Screen 4 (Results)**: Result card with comfortable padding, CTA button auto-width
- **Navigation**: Generous spacing between Back, dots, and Next

---

## Edge Cases

- **Already completed onboarding**: If `wr_onboarding_complete === "true"`, wizard never renders — user goes straight to mood check-in or dashboard.
- **Skip before making changes**: Skipping preserves whatever was already in localStorage (original name and avatar). No data is overwritten.
- **Empty display name on Screen 1**: Next button is disabled if the input is empty or outside 2-30 chars. User cannot advance until the name is valid.
- **No avatar previously set**: Default selection on Screen 2 is `nature-dove`.
- **Quiz incomplete when pressing Back from Screen 4**: User returns to Screen 3 at Q5 with their previous answer still selected. They can re-answer and auto-advance back to Screen 4 with an updated recommendation.
- **Browser refresh during wizard**: Wizard state (current screen, quiz answers, name edits, avatar selection) lives in React state — a refresh resets the wizard to Screen 1. Since `wr_onboarding_complete` hasn't been set yet, the wizard re-appears.
- **localStorage unavailable**: If localStorage is blocked (e.g., Safari private browsing), `wr_onboarding_complete` can't be read — treat as not complete (wizard shows). Wizard completion attempt to write will silently fail, causing the wizard to show again on next visit. This is acceptable for MVP.
- **Very long display name**: Input enforces 30-char max. Existing display names from `wr_user_name` that exceed 30 chars are truncated in the pre-fill.
- **Multiple tabs**: If the wizard is completed in Tab A, Tab B will still show the wizard until it's refreshed (reads localStorage on mount). This is acceptable for MVP.
- **Simulated login with existing data**: If a user simulates logout and re-login, `wr_onboarding_complete` persists (was not cleared on logout), so the wizard does not re-appear.

---

## Out of Scope

- **Backend API persistence** — Phase 3 (all data in localStorage)
- **Real authentication (JWT, Spring Security)** — Phase 3 (uses simulated auth from `AuthProvider`)
- **Photo upload for avatar** — the wizard only shows the 16 preset avatars. Photo upload is available later via Settings (Spec 13) / Profile (Spec 14)
- **Unlockable avatars in the wizard** — new users can't have the badges required to unlock them
- **Onboarding analytics** (completion rate, drop-off screen, quiz result distribution) — not in MVP
- **A/B testing different wizard flows** — not in MVP
- **Animated avatar preview or 3D effects** — not in MVP
- **Tutorial tooltips or feature walkthroughs** — separate onboarding spec (Spec 2 or 3 of the onboarding sequence)
- **Re-running the wizard** — once completed, no way to re-trigger. Settings changes serve the same purpose.
- **Custom onboarding paths based on referral source** — not in MVP
- **Multi-language support** — not in MVP
- **The other 2 specs in the onboarding sequence** (post-onboarding guided tour, contextual tips) — separate specs

---

## Acceptance Criteria

### Trigger & Lifecycle

- [ ] Wizard renders at `/` when user is authenticated AND `wr_onboarding_complete` is not `"true"`
- [ ] Wizard does NOT render when `wr_onboarding_complete === "true"` (user sees mood check-in or dashboard)
- [ ] Wizard renders INSTEAD of the mood check-in on first login — mood check-in appears on second visit
- [ ] After completing the wizard (either CTA on Screen 4), `wr_onboarding_complete` is set to `"true"` in localStorage
- [ ] After skipping the wizard, `wr_onboarding_complete` is set to `"true"` in localStorage
- [ ] `logout()` does NOT clear `wr_onboarding_complete` — wizard does not re-appear after re-login
- [ ] Browser refresh during the wizard resets to Screen 1 (wizard state is in React state, not localStorage)

### Screen 1: Welcome

- [ ] Heading "Welcome to Worship Room" renders in Caveat script font, large, white
- [ ] Subheading "A safe place to heal, grow, and connect with God" renders in Inter, white/80
- [ ] Display name input is pre-filled with the user's current `wr_user_name` value
- [ ] Display name input accepts 2-30 characters
- [ ] Input shows inline error "Name must be 2-30 characters" when outside range
- [ ] "Next" button is disabled when input is empty or outside 2-30 character range
- [ ] "Next" button advances to Screen 2 with slide animation

### Screen 2: Avatar Selection

- [ ] All 16 preset avatars display in a 4×4 grid organized by category (Nature, Faith, Water, Light)
- [ ] Category labels appear above each row of 4 avatars
- [ ] Avatars use the existing `ProfileAvatar` component
- [ ] Default selection is the user's current `avatarId` or `nature-dove` if none set
- [ ] Selected avatar has a prominent purple ring highlight (`ring-2 ring-primary`)
- [ ] Tapping an avatar immediately updates the selection visual
- [ ] Unlockable avatars are NOT shown in the wizard grid
- [ ] "Next" advances to Screen 3, "Back" returns to Screen 1

### Screen 3: Quiz

- [ ] All 5 quiz questions from `quiz-data.ts` render with correct text and 4 options each
- [ ] Quiz options are styled with dark frosted glass cards (not white landing page style)
- [ ] Selected option shows primary border, tinted background, and checkmark
- [ ] Selecting an option auto-advances to the next question after ~400ms delay
- [ ] "Back" on Q1 returns to Screen 2 (Avatar Selection)
- [ ] "Back" on Q2-Q5 returns to the previous quiz question with the previous answer preserved
- [ ] Quiz scoring uses the same logic as the landing page (`calculateResult` from `quiz-data.ts`)
- [ ] After Q5 answer, auto-advances to Screen 4 with the quiz result passed via React state
- [ ] Going back from Screen 4 returns to Q5 with the previous answer still selected
- [ ] Changing an answer on Q5 recalculates the result before advancing to Screen 4

### Screen 4: Results & Launch

- [ ] Heading "You're All Set!" renders in white
- [ ] Quiz result shows recommendation title: "We'd recommend starting with [Feature Name]"
- [ ] Result description (2-3 sentences) matches the quiz destination data
- [ ] Scripture verse displays in italic serif font with verse reference
- [ ] "Start Your Journey" primary CTA button navigates to the recommended route
- [ ] "Explore on your own" secondary link navigates to the dashboard
- [ ] Both CTAs save display name to `wr_user_name`
- [ ] Both CTAs save avatar selection to `wr_settings.profile.avatarId`
- [ ] Both CTAs set `wr_onboarding_complete` to `"true"`
- [ ] Both CTAs update `user.name` in `AuthProvider` context

### Skip Behavior

- [ ] "Skip for now" link is visible on all 4 screens
- [ ] "Skip for now" sets `wr_onboarding_complete` to `"true"` in localStorage
- [ ] "Skip for now" does NOT save display name changes or avatar selection
- [ ] "Skip for now" navigates to the dashboard
- [ ] "Skip for now" link has minimum 44px touch target

### Navigation & Progress

- [ ] 4-dot progress indicator shows current screen (active dot is larger and primary purple)
- [ ] Dots are not clickable
- [ ] "Next" button is hidden on Screen 3 (quiz auto-advances)
- [ ] "Back" button is hidden on Screen 1
- [ ] "Back" on Screen 3 navigates to previous quiz question (Q2-Q5) or Screen 2 (Q1)
- [ ] "Back" on Screen 4 returns to Screen 3 at Q5

### Transitions & Animation

- [ ] Wizard entrance fades in (400ms ease-in-out)
- [ ] Forward navigation slides content out-left and new content in-from-right (300ms ease-in-out)
- [ ] Backward navigation slides content out-right and new content in-from-left (300ms ease-in-out)
- [ ] `prefers-reduced-motion`: all transitions are instant (no slide, no fade)
- [ ] Quiz auto-advance has ~400ms delay before slide transition

### Accessibility

- [ ] Wizard container has `role="dialog"` with `aria-labelledby` pointing to the current screen heading
- [ ] Display name input has associated `<label>` element
- [ ] Avatar grid uses `role="radiogroup"` with `role="radio"` and `aria-checked` on each avatar
- [ ] Arrow keys navigate between avatar options within a category
- [ ] Quiz option groups use `role="radiogroup"` with `role="radio"` on each option
- [ ] All interactive elements (buttons, avatars, quiz options, skip link) have minimum 44px touch targets
- [ ] Focus is managed on screen transitions — focus moves to the new screen's first heading or interactive element
- [ ] All interactive elements have visible focus rings
- [ ] Keyboard: Tab navigates through interactive elements; Enter/Space activates buttons and selects options
- [ ] Screen reader: screen transitions are announced via `aria-live` region or focus management

### Responsive Layout

- [ ] Mobile (< 640px): Content card near-full-width (`mx-4`), avatar grid with ~56px avatars, quiz options stack vertically, all touch targets 44px minimum
- [ ] Tablet (640-1024px): Content card ~480px centered, ~64px avatars, comfortable spacing
- [ ] Desktop (> 1024px): Content card ~560px centered, ~72px avatars, generous spacing, heading `text-4xl`

### Visual Verification

- [ ] Wizard background matches dashboard (`bg-[#0f0a1e]`)
- [ ] Content card uses frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Welcome heading (Screen 1) uses Caveat script font
- [ ] Display name input matches dark theme styling (`bg-white/5 border border-white/15`)
- [ ] Avatar selection ring uses `ring-primary` purple color
- [ ] Quiz options use dark frosted glass styling (not white cards)
- [ ] "Start Your Journey" button uses primary CTA style (`bg-primary text-white rounded-lg`)
- [ ] "Skip for now" link is understated (`text-white/40`, small text)
- [ ] Dot indicator: active dot is larger and primary purple; inactive dots are small and white/30
- [ ] Scripture verse on Screen 4 uses italic serif font (`font-serif italic`)
