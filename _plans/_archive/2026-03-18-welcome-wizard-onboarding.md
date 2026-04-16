# Implementation Plan: Welcome Wizard Onboarding

**Spec:** `_specs/welcome-wizard-onboarding.md`
**Date:** 2026-03-18
**Branch:** `claude/feature/welcome-wizard-onboarding`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (wizard is a new dark-themed overlay, not an existing page variant)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (referenced — shared data models, AuthProvider, avatar presets, quiz data)

---

## Architecture Context

### Integration Point

The wizard lives inside `Dashboard.tsx` (`frontend/src/pages/Dashboard.tsx`). The Dashboard already has a phase system:

```
'check_in' | 'dashboard_enter' | 'dashboard'
```

The wizard adds a new phase at the top of the priority chain:

```
1. 'onboarding'  → WelcomeWizard (new — when wr_onboarding_complete !== "true")
2. 'check_in'    → MoodCheckIn (existing)
3. 'dashboard_enter' / 'dashboard' → dashboard content (existing)
```

The `RootRoute()` in `App.tsx` (line 82-85) already conditionally renders `Dashboard` when authenticated, `Home` when not. No route changes needed.

### Key Existing Files

| File | Role | How Wizard Uses It |
|------|------|--------------------|
| `pages/Dashboard.tsx` | Dashboard page with phase system | Add `'onboarding'` phase before `'check_in'` |
| `contexts/AuthContext.tsx` | `AuthProvider` with `{ isAuthenticated, user, login, logout }` | Read `user.name`, update name on completion |
| `components/shared/ProfileAvatar.tsx` | Avatar rendering (presets, unlockable, initials, photo) | Render avatars in grid on Screen 2 |
| `constants/dashboard/avatars.ts` | 16 presets (4 categories), 4 unlockables, `DEFAULT_AVATAR_ID` | Avatar data source — only show 16 presets |
| `components/quiz-data.ts` | 5 questions, `calculateResult()`, 7 destinations | Quiz logic for Screen 3 |
| `components/StartingPointQuiz.tsx` | Landing page quiz UI (dark variant already exists) | Pattern reference for quiz option styling |
| `services/settings-storage.ts` | `getSettings()`, `updateSettings()`, `SETTINGS_KEY` | Read/write `profile.avatarId` on completion |

### Provider Wrapping Order (from `App.tsx`)

```
QueryClientProvider → BrowserRouter → AuthProvider → ToastProvider → AuthModalProvider → AudioProvider → Routes
```

The wizard renders inside `Dashboard`, which is inside all providers. No additional wrapping needed.

### AuthContext API

```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  user: { name: string; id: string } | null
  login: (name: string) => void
  logout: () => void
}
```

**Important**: `login()` sets both the auth state and persists `wr_user_name` to localStorage. To update the user's display name without re-triggering a full login, the wizard will need to call `login(newName)` which will update `wr_user_name` in localStorage and refresh the context state. This is safe — it preserves the existing `wr_user_id`.

### Settings Storage

```typescript
// services/settings-storage.ts
getSettings(): UserSettings       // reads wr_settings, deep-merges with defaults
updateSettings(partial): UserSettings  // deep-merge + save to wr_settings
```

Avatar is at `settings.profile.avatarId`. Default is `'default'` which resolves to `nature-dove`.

### Avatar Presets

```typescript
// constants/dashboard/avatars.ts
AVATAR_PRESETS: AvatarPreset[]  // 16 presets, 4 categories
AVATAR_CATEGORIES: AvatarCategory[]  // ['nature', 'faith', 'water', 'light']
AVATAR_CATEGORY_LABELS: Record<AvatarCategory, string>  // { nature: 'Nature', ... }
DEFAULT_AVATAR_ID = 'nature-dove'
UNLOCKABLE_AVATARS: UnlockableAvatar[]  // 4 unlockables — NOT shown in wizard
```

### ProfileAvatar Component Props

```typescript
interface ProfileAvatarProps {
  avatarId: string
  avatarUrl?: string
  displayName: string
  userId: string
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  badges?: BadgeData
  'aria-hidden'?: boolean
}
```

Size `'xs'` = 40px (`h-10 w-10`), `'sm'` = 80px (`h-20 w-20`). For the wizard 4×4 grid, `'xs'` is appropriate on mobile, but a custom intermediate size (~56-72px depending on breakpoint) may be needed. The component can accept `className` to override sizing.

### Quiz Data

```typescript
QUIZ_QUESTIONS: QuizQuestion[]  // 5 questions, each with 4 options
calculateResult(answers: (number | null)[]): QuizDestination
// Returns: { key, name, route, ctaLabel, description, verse, verseReference }
```

### Existing Animations (from `tailwind.config.js`)

| Animation | Duration | Effect | Reusable for Wizard? |
|-----------|----------|--------|---------------------|
| `animate-slide-from-right` | 300ms | translateX(40px→0), opacity 0→1 | Yes — forward screen transition |
| `animate-slide-from-left` | 300ms | translateX(-40px→0), opacity 0→1 | Yes — backward screen transition |
| `animate-fade-in` | 500ms | opacity 0→1, translateY(8px→0) | Yes — wizard entrance (slightly longer than spec's 400ms, acceptable) |
| `animate-continue-fade-in` | 400ms | opacity 0→1 | Closer match for entrance duration |

The existing `animate-slide-from-right/left` animations match the spec's 300ms requirement. For the wizard entrance, `animate-continue-fade-in` (400ms) is the closest to the spec's 400ms fade-in.

**New animations needed**: slide-out-left and slide-out-right for departing content. The existing animations only handle incoming content. We'll need custom CSS or use React state-driven transitions for the full slide-in/slide-out effect.

### Test Patterns

From `MoodCheckIn.test.tsx`:
- Direct render without router wrapping (component receives callbacks as props)
- `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for auto-advance testing
- ARIA assertions: `role="dialog"`, `role="radiogroup"`, `role="radio"`, `aria-checked`, `aria-labelledby`
- `userEvent.click()` for interactions
- `localStorage.clear()` in `beforeEach`

---

## Auth Gating Checklist

**The wizard only renders inside `Dashboard`, which only renders when `isAuthenticated === true` (enforced by `RootRoute()` in `App.tsx`). All wizard actions are inherently auth-gated.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View wizard | Authenticated + `wr_onboarding_complete !== "true"` | Step 2 | Dashboard phase logic |
| Edit display name | Authenticated | Step 3 | Inside wizard (Dashboard auth-gated) |
| Select avatar | Authenticated | Step 4 | Inside wizard (Dashboard auth-gated) |
| Take quiz | Authenticated | Step 5 | Inside wizard (Dashboard auth-gated) |
| "Start Your Journey" CTA | Authenticated | Step 6 | Inside wizard (Dashboard auth-gated) |
| "Explore on your own" | Authenticated | Step 6 | Inside wizard (Dashboard auth-gated) |
| "Skip for now" | Authenticated | Step 6 | Inside wizard (Dashboard auth-gated) |

No additional auth modal gating needed — the wizard is entirely within the authenticated flow.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Wizard background | background | `bg-[#0f0a1e]` | Dashboard.tsx:77 |
| Content card | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md Dashboard Card Pattern |
| Content card padding | padding | `p-6 sm:p-8` | Spec: generous padding for wizard card |
| Welcome heading (Screen 1) | font | Caveat, `text-3xl sm:text-4xl`, `font-bold text-white` | Spec + design-system.md `font-script` |
| Screen headings (2, 3) | font | Inter, `text-xl sm:text-2xl`, `font-bold text-white` | Spec |
| Screen 4 heading | font | Caveat, `text-2xl sm:text-3xl`, `font-bold text-white` | Spec: "You're All Set!" in script |
| Subheading | font/color | Inter, `text-base md:text-lg text-white/70` | Spec |
| Welcome subheading | color | `text-white/80` | Spec: slightly brighter than other subheadings |
| Display name input | bg/border | `bg-white/5 border border-white/15 focus:border-primary rounded-lg py-3 px-4 text-white` | Spec |
| Input label | style | `text-white/70 text-sm` | Spec |
| Input error | style | `text-danger text-sm` = `text-[#E74C3C] text-sm` | Spec + design-system.md |
| Primary CTA (Next) | style | `bg-primary text-white rounded-lg py-3 px-8 font-semibold` | design-system.md Primary CTA |
| Back button (ghost) | style | `text-white/60 hover:text-white text-sm font-medium` | Spec |
| Skip link | style | `text-sm text-white/40 hover:text-white/60 underline-offset-4` | Spec |
| Dot indicator (active) | style | `w-3 h-3 rounded-full bg-primary` | Spec |
| Dot indicator (inactive) | style | `w-2 h-2 rounded-full bg-white/30` | Spec |
| Quiz option card | style | `bg-white/5 border border-white/10 rounded-xl p-4` | Spec (dark frosted glass) |
| Quiz option selected | style | `border-primary bg-primary/20` + checkmark | StartingPointQuiz.tsx:334 dark variant |
| Quiz option hover | style | `hover:border-white/20 hover:bg-white/15` | StartingPointQuiz.tsx:338 |
| Result card scripture | font | `font-serif italic text-white/80` | Spec |
| Avatar selection ring | style | `ring-2 ring-offset-2 ring-primary` with `ring-offset-[#0f0a1e]` | Spec |
| Category labels | style | `text-white/50 text-xs uppercase tracking-wider font-semibold` | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora
- Lora (`font-serif`) is for scripture text only
- Dashboard uses dark background `bg-[#0f0a1e]` (not `bg-hero-dark` which is `#0D0620`)
- Dashboard frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Primary CTA: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` (not rounded-full)
- Existing quiz dark variant in `StartingPointQuiz.tsx` already has matching option card styles — reference lines 328-338 for exact classes
- `ring-offset` color must match the wizard background for avatar selection ring to look correct
- The `login()` function in `AuthContext` updates both localStorage and context state — calling `login(newName)` is the correct way to update the display name
- All interactive elements need 44px minimum touch targets
- Use `motion-safe:` / `motion-reduce:` prefixes or `useReducedMotion()` hook for animations

---

## Shared Data Models (from Master Plan)

```typescript
// From constants/dashboard/avatars.ts (existing)
interface AvatarPreset {
  id: string
  name: string
  category: AvatarCategory
  icon: LucideIcon
  bgColor: string
}
type AvatarCategory = 'nature' | 'faith' | 'water' | 'light'

// From components/quiz-data.ts (existing)
interface QuizDestination {
  key: FeatureKey
  name: string
  route: string
  ctaLabel: string
  description: string
  verse: string
  verseReference: string
}

// From contexts/AuthContext.tsx (existing)
interface AuthContextValue {
  isAuthenticated: boolean
  user: { name: string; id: string } | null
  login: (name: string) => void
  logout: () => void
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_onboarding_complete` | Read + Write | `"true"` after wizard completes or is skipped |
| `wr_user_name` | Read + Write | Pre-fill display name input; save on completion via `login()` |
| `wr_settings` | Read + Write | Read `profile.avatarId` for default selection; write on completion via `updateSettings()` |
| `wr_auth_simulated` | Read (indirect) | Via `useAuth()` — determines if wizard shows |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Card near-full-width (`mx-4`), `p-4` internal padding, ~56px avatars, quiz options full-width stacked, CTA full-width |
| Tablet | 768px | Card ~480px max-width centered, ~64px avatars, comfortable spacing |
| Desktop | 1440px | Card ~560px max-width centered, ~72px avatars, heading `text-4xl` (Screen 1), generous padding |

---

## Vertical Rhythm

Not applicable — the wizard is a full-screen overlay, not a page with sections. No inter-section gaps to measure.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `AuthProvider` exists and provides `{ isAuthenticated, user, login, logout }` — confirmed in `AuthContext.tsx`
- [x] `ProfileAvatar` component exists at `components/shared/ProfileAvatar.tsx` — confirmed
- [x] Avatar presets and categories exist at `constants/dashboard/avatars.ts` — confirmed (16 presets, 4 categories)
- [x] Quiz data exists at `components/quiz-data.ts` with `calculateResult()` — confirmed (5 questions, 7 destinations)
- [x] Dashboard phase system exists in `pages/Dashboard.tsx` — confirmed (`'check_in' | 'dashboard_enter' | 'dashboard'`)
- [x] `settings-storage.ts` provides `getSettings()` and `updateSettings()` — confirmed
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values verified from design-system.md recon and codebase inspection
- [ ] No [UNVERIFIED] values — all values sourced from existing code or spec
- [x] Prior specs in the sequence are complete (Dashboard Shell, MoodCheckIn, Avatar presets all built)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wizard animation approach | Use React state + CSS transitions with `key` swap for slide direction, matching `StartingPointQuiz.tsx` pattern | Existing quiz uses the same `animate-slide-from-right/left` pattern with `key` re-mount. Consistent. |
| Avatar size in wizard grid | Custom class override on `ProfileAvatar` — mobile: 56px, tablet: 64px, desktop: 72px | `'xs'` (40px) is too small, `'sm'` (80px) is too large for a 4×4 grid in a ~560px card |
| Updating display name | Call `login(newName)` on `AuthContext` | `login()` persists to `wr_user_name` and updates React state. Safe to call on already-logged-in user. |
| Slide-out animation | Not implementing slide-out (content sliding away) — only slide-in | Existing quiz pattern uses `key` re-mount with slide-in only. Adding slide-out requires `AnimatePresence` (framer-motion) or complex CSS. The slide-in-from-direction effect is sufficient and consistent with the app. |
| Quiz auto-advance from Q5 to Screen 4 | Treat as auto-advance to next wizard screen (screen index 3) | Same 400ms delay, same slide transition. Screen 4 receives quiz result via React state. |
| Back from Screen 4 | Returns to Screen 3 at Q5 with previous answer preserved | Quiz answers stored in wizard-level state, not reset when navigating back. |
| `wr_onboarding_complete` key name | Use exact spec key `wr_onboarding_complete` | Consistent with `wr_` prefix convention. |
| Wizard entrance animation | Use `motion-safe:animate-continue-fade-in` (400ms) | Matches spec's 400ms requirement. |

---

## Implementation Steps

### Step 1: Onboarding Storage Utility + Constants

**Objective:** Create the localStorage utility for `wr_onboarding_complete` and the onboarding-related constants.

**Files to create/modify:**
- `frontend/src/services/onboarding-storage.ts` — new file
- `frontend/src/constants/dashboard/onboarding.ts` — new file (optional — may inline the key)

**Details:**

```typescript
// services/onboarding-storage.ts
const ONBOARDING_KEY = 'wr_onboarding_complete'

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  } catch {
    return false
  }
}

export function setOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true')
  } catch {
    // localStorage unavailable — wizard will show again next visit (acceptable per spec)
  }
}
```

**Guardrails (DO NOT):**
- Do NOT clear `wr_onboarding_complete` in `logout()` — spec explicitly states it persists across logout/re-login
- Do NOT import or depend on AuthContext here — this is a pure storage utility

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `isOnboardingComplete returns false when key not set` | unit | Default state |
| `isOnboardingComplete returns true when key is "true"` | unit | After completion |
| `isOnboardingComplete returns false for other values` | unit | e.g., "false", "1" |
| `setOnboardingComplete sets key to "true"` | unit | Verify localStorage write |
| `isOnboardingComplete returns false when localStorage throws` | unit | Safari private browsing |

**Expected state after completion:**
- [x] `onboarding-storage.ts` exists with `isOnboardingComplete()` and `setOnboardingComplete()`
- [x] Tests pass
- [x] No other files modified

---

### Step 2: Dashboard Phase Integration

**Objective:** Add `'onboarding'` phase to Dashboard.tsx. When `wr_onboarding_complete` is not `"true"`, render the wizard instead of the mood check-in.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — modify phase logic

**Details:**

Update `DashboardPhase` type:
```typescript
type DashboardPhase = 'onboarding' | 'check_in' | 'dashboard_enter' | 'dashboard'
```

Update initial phase determination (both `useState` initializer and `useEffect`):
```typescript
// Priority: onboarding > check_in > dashboard
function getInitialPhase(): DashboardPhase {
  if (!isOnboardingComplete()) return 'onboarding'
  if (!hasCheckedInToday()) return 'check_in'
  return 'dashboard'
}
```

Add onboarding handler:
```typescript
const handleOnboardingComplete = () => {
  // After wizard completes, go to check_in or dashboard
  setPhase(hasCheckedInToday() ? 'dashboard' : 'check_in')
}
```

Add conditional render for onboarding phase (before the `check_in` render):
```typescript
if (phase === 'onboarding') {
  return (
    <WelcomeWizard
      userName={user.name}
      userId={user.id}
      onComplete={handleOnboardingComplete}
    />
  )
}
```

Import `isOnboardingComplete` from `@/services/onboarding-storage` and `WelcomeWizard` from the new component (Step 3).

**Guardrails (DO NOT):**
- Do NOT modify the existing `check_in` / `dashboard_enter` / `dashboard` logic
- Do NOT add wizard logic to `App.tsx` or create a new route — wizard renders inside Dashboard
- Do NOT clear `wr_onboarding_complete` in `handleCheckInSkip` or `handleCheckInComplete`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders WelcomeWizard when wr_onboarding_complete is not set` | integration | Verify wizard renders instead of mood check-in |
| `renders MoodCheckIn when wr_onboarding_complete is "true" and not checked in today` | integration | Normal flow preserved |
| `renders dashboard when wr_onboarding_complete is "true" and checked in today` | integration | Normal flow preserved |
| `after wizard completes, shows mood check-in (if not checked in today)` | integration | Phase transition from onboarding → check_in |

**Expected state after completion:**
- [x] Dashboard shows wizard on first visit
- [x] Dashboard shows mood check-in on subsequent visits (after onboarding complete)
- [x] Normal dashboard flow unchanged when onboarding is already complete
- [x] Tests pass

---

### Step 3: WelcomeWizard Shell + Screen 1 (Welcome)

**Objective:** Create the WelcomeWizard component with the full-screen layout, navigation system (dots, back, next, skip), slide transitions, and Screen 1 (name input).

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx` — new file

**Details:**

**Component structure:**

```typescript
interface WelcomeWizardProps {
  userName: string
  userId: string
  onComplete: () => void
}

type WizardScreen = 0 | 1 | 2 | 3  // Welcome, Avatar, Quiz, Results

// Internal state:
// - currentScreen: WizardScreen
// - slideDirection: 'left' | 'right'
// - displayName: string (initialized from userName prop)
// - selectedAvatarId: string (initialized from getSettings().profile.avatarId or DEFAULT_AVATAR_ID)
// - quizAnswers: (number | null)[] (5 nulls)
// - currentQuizQuestion: number (0-4)
// - quizResult: QuizDestination | null
```

**Full-screen layout:**
```jsx
<div
  role="dialog"
  aria-labelledby="wizard-heading"
  className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-[#0f0a1e] motion-safe:animate-continue-fade-in motion-reduce:animate-none"
>
  {/* Content card */}
  <div className="relative mx-4 w-full max-w-[560px] sm:max-w-[480px] lg:max-w-[560px]">
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
      {/* Screen content with slide transition */}
      <div className="relative overflow-hidden">
        <div key={screenKey} className={slideAnimationClass}>
          {/* Current screen content */}
        </div>
      </div>
    </div>

    {/* Navigation row — below card */}
    <div className="mt-6 flex items-center justify-between px-2">
      {/* Back button (left) */}
      {/* Dot indicator (center) */}
      {/* Next button (right) */}
    </div>

    {/* Skip link — bottom */}
    <div className="mt-4 text-center">
      <button className="min-h-[44px] text-sm text-white/40 hover:text-white/60">
        Skip for now
      </button>
    </div>
  </div>
</div>
```

**Screen 1 — Welcome:**
```jsx
<div>
  <h2 id="wizard-heading" className="font-script text-3xl font-bold text-white sm:text-4xl text-center">
    Welcome to Worship Room
  </h2>
  <p className="mt-2 text-center text-base text-white/80 md:text-lg">
    A safe place to heal, grow, and connect with God
  </p>
  <div className="mt-8">
    <label htmlFor="wizard-name" className="mb-2 block text-sm text-white/70">
      What should we call you?
    </label>
    <input
      id="wizard-name"
      type="text"
      value={displayName}
      onChange={handleNameChange}
      maxLength={30}
      className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      aria-invalid={nameError ? 'true' : undefined}
      aria-describedby={nameError ? 'wizard-name-error' : undefined}
    />
    {nameError && (
      <p id="wizard-name-error" className="mt-1 text-sm text-danger" role="alert">
        Name must be 2-30 characters
      </p>
    )}
  </div>
</div>
```

**Name validation:**
- Trim the input value for validation: `value.trim().length >= 2 && value.trim().length <= 30`
- Show error only after user has interacted (blur or attempted Next)
- Next button disabled: `disabled={displayName.trim().length < 2 || displayName.trim().length > 30}`

**Dot indicator:**
```jsx
<div className="flex items-center gap-2" aria-hidden="true">
  {[0, 1, 2, 3].map((i) => (
    <div
      key={i}
      className={cn(
        'rounded-full transition-all duration-200',
        i === currentScreen
          ? 'h-3 w-3 bg-primary'
          : 'h-2 w-2 bg-white/30'
      )}
    />
  ))}
</div>
```

**Navigation logic:**
- Next label: Screen 0 → "Next", Screen 1 → "Next", Screen 2 → hidden, Screen 3 → "Start Your Journey"
- Back visibility: Screen 0 → hidden, Screen 1-3 → visible
- Back on Screen 2: if `currentQuizQuestion > 0`, go to prev question; else go to Screen 1
- Back on Screen 3: go to Screen 2 at Q5 (set `currentQuizQuestion = 4`)
- Slide direction: forward → `'left'` (slide-from-right), backward → `'right'` (slide-from-left)

**Skip handler:**
```typescript
const handleSkip = () => {
  setOnboardingComplete()
  // Do NOT save name or avatar changes
  onComplete()
}
```

**Screen transitions:**
- Use the existing `animate-slide-from-right` / `animate-slide-from-left` animations with a unique `key` per screen/question to trigger re-mount
- Key format: `screen-${currentScreen}` for screens 0/1/3, `quiz-${currentQuizQuestion}` for screen 2

**Accessibility:**
- `role="dialog"` with `aria-labelledby="wizard-heading"`
- Update `aria-labelledby` value when screen changes (each screen has its own heading with a unique id)
- Focus management: on screen transition, focus the heading of the new screen (use `useEffect` + ref)
- Screen reader announcement via focus management (no separate `aria-live` needed if focus moves to heading)

**Responsive behavior:**
- Mobile (< 640px): `mx-4` margins, `p-4` card padding, `text-3xl` welcome heading
- Tablet (640-1024px): Card `max-w-[480px]`, `p-6` padding
- Desktop (> 1024px): Card `max-w-[560px]`, `p-8` padding, `text-4xl` welcome heading

**Guardrails (DO NOT):**
- Do NOT save any data to localStorage during intermediate steps — only on final completion
- Do NOT use `dangerouslySetInnerHTML` for any content
- Do NOT add a route for the wizard — it renders conditionally inside Dashboard
- Do NOT use framer-motion or any new animation library — use CSS transitions only
- Do NOT show unlockable avatars in the wizard (handled in Step 4)

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders welcome heading in Caveat font` | unit | Check `font-script` class |
| `pre-fills display name from userName prop` | unit | Input value matches prop |
| `shows error when name is empty and user interacts` | unit | Validation message |
| `shows error when name is 1 character` | unit | Min length validation |
| `Next is disabled when name is invalid` | unit | Button disabled state |
| `Next is enabled when name is 2-30 chars` | unit | Button enabled state |
| `dot indicator shows first dot active` | unit | First dot larger/primary |
| `Skip for now is visible` | unit | Link rendered |
| `Skip calls setOnboardingComplete and onComplete` | unit | Correct skip behavior |
| `Skip does NOT save name or avatar` | unit | localStorage not modified |
| `dialog has role="dialog" with aria-labelledby` | unit | ARIA compliance |
| `input has associated label` | unit | `htmlFor` matches `id` |
| `error message uses aria-describedby` | unit | Input associated with error |
| `has minimum 44px touch targets on all interactive elements` | unit | CSS class check |
| `respects prefers-reduced-motion` | unit | `motion-safe:` / `motion-reduce:` classes |

**Expected state after completion:**
- [x] WelcomeWizard renders with Screen 1
- [x] Name input with validation works
- [x] Navigation shell (dots, back, next, skip) works
- [x] Slide transitions between screens work
- [x] Focus management on screen transitions
- [x] Tests pass

---

### Step 4: Screen 2 — Avatar Selection

**Objective:** Add the avatar selection grid to the wizard, organized by category with selection ring.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx` — add Screen 2 content

**Details:**

**Avatar grid structure:**
```jsx
<div>
  <h2 id="wizard-heading-avatar" className="text-center text-xl font-bold text-white sm:text-2xl">
    Choose Your Avatar
  </h2>
  <p className="mt-2 text-center text-base text-white/70">
    Pick an icon that speaks to you
  </p>

  <div className="mt-6 space-y-4" role="radiogroup" aria-label="Avatar selection">
    {AVATAR_CATEGORIES.map((category) => {
      const presetsInCategory = AVATAR_PRESETS.filter((p) => p.category === category)
      return (
        <div key={category}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            {AVATAR_CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-4 gap-3">
            {presetsInCategory.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selectedAvatarId === preset.id}
                aria-label={preset.name}
                onClick={() => setSelectedAvatarId(preset.id)}
                className={cn(
                  'flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  // Custom sizes per breakpoint
                  'h-14 w-14 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]',
                  selectedAvatarId === preset.id &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-[#0f0a1e] motion-safe:animate-[scale-pulse_150ms_ease-out]'
                )}
                style={{ backgroundColor: preset.bgColor }}
              >
                <preset.icon
                  className={cn(
                    'text-white',
                    'h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8'
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )
    })}
  </div>
</div>
```

**Note on rendering approach:** Instead of using `ProfileAvatar` (which has fixed size classes and is designed for display, not selection), render avatars directly using the preset data. This avoids fighting the component's size system and allows custom per-breakpoint sizing. The visual appearance is identical — a colored circle with a white Lucide icon.

**Selection behavior:**
- Default: `selectedAvatarId` initialized from `getSettings().profile.avatarId` (falling back to `DEFAULT_AVATAR_ID` if `'default'`)
- Selection ring: `ring-2 ring-primary ring-offset-2 ring-offset-[#0f0a1e]`
- Brief scale pulse on selection (150ms) — use inline keyframes or a simple CSS transition
- Only 16 presets shown — UNLOCKABLE_AVATARS are filtered out

**Keyboard navigation:**
- Arrow keys navigate within a category row (left/right wraps within row)
- Tab moves between categories
- Enter/Space selects the focused avatar

**Responsive behavior:**
- Mobile: 56px avatars (`h-14 w-14`) with `gap-3` — fits 4 across in ~375px card
- Tablet: 64px avatars (`h-16 w-16`) — comfortable in 480px card
- Desktop: 72px avatars (`h-[72px] w-[72px]`) — generous in 560px card

**Guardrails (DO NOT):**
- Do NOT show unlockable avatars — new users can't unlock them
- Do NOT save avatar selection here — only on wizard completion (Step 6)
- Do NOT use ProfileAvatar component for the selection grid — render directly for sizing control
- Do NOT make dots clickable in the progress indicator

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders all 16 preset avatars` | unit | Count avatar buttons |
| `does NOT render unlockable avatars` | unit | Count is exactly 16 |
| `renders 4 category labels` | unit | Nature, Faith, Water, Light |
| `avatars are in a 4×4 grid` | unit | 4 per category row |
| `default selection is nature-dove (or user's current)` | unit | `aria-checked="true"` on default |
| `clicking avatar updates selection` | unit | `aria-checked` changes |
| `selected avatar has ring highlight` | unit | Ring class present |
| `avatar grid has role="radiogroup"` | unit | ARIA compliance |
| `each avatar has role="radio" with aria-checked` | unit | ARIA compliance |
| `each avatar has aria-label with name` | unit | e.g., "Dove", "Cross" |
| `Back returns to Screen 1` | unit | Navigation |
| `Next advances to Screen 3` | unit | Navigation |

**Expected state after completion:**
- [x] Avatar grid renders with 16 presets organized by category
- [x] Selection ring highlights the chosen avatar
- [x] Default selection works from settings
- [x] Navigation between Screen 1 ↔ Screen 2 works
- [x] Tests pass

---

### Step 5: Screen 3 — Quiz

**Objective:** Embed the Starting Point Quiz into the wizard with dark theme styling and auto-advance behavior.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx` — add Screen 3 content

**Details:**

**Quiz rendering (inside wizard card):**
```jsx
<div>
  <h2 id="wizard-heading-quiz" className="text-center text-xl font-bold text-white sm:text-2xl">
    What Brought You Here?
  </h2>
  <p className="mt-2 text-center text-base text-white/70">
    Help us point you in the right direction
  </p>

  {/* Question counter */}
  <p className="mt-4 text-center text-sm text-white/50">
    Question {currentQuizQuestion + 1} of {QUIZ_QUESTIONS.length}
  </p>

  {/* Question text */}
  <h3 className="mb-4 mt-2 text-lg font-semibold text-white">
    {QUIZ_QUESTIONS[currentQuizQuestion].question}
  </h3>

  {/* Options */}
  <div className="flex flex-col gap-3" role="radiogroup" aria-label={`Question ${currentQuizQuestion + 1}`}>
    {QUIZ_QUESTIONS[currentQuizQuestion].options.map((option, index) => {
      const isSelected = quizAnswers[currentQuizQuestion] === index
      return (
        <button
          type="button"
          key={index}
          role="radio"
          aria-checked={isSelected}
          onClick={() => handleQuizSelect(index)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm text-white/80 transition-all duration-200 sm:text-base',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isSelected
              ? 'border-primary bg-primary/20'
              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/15'
          )}
        >
          <span>{option.label}</span>
          {isSelected && <Check className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />}
        </button>
      )
    })}
  </div>
</div>
```

**Auto-advance logic:**
```typescript
const handleQuizSelect = (optionIndex: number) => {
  // Clear any pending auto-advance
  if (quizTimeoutRef.current) clearTimeout(quizTimeoutRef.current)

  // Update answer
  setQuizAnswers(prev => {
    const next = [...prev]
    next[currentQuizQuestion] = optionIndex
    return next
  })

  // Auto-advance after 400ms
  quizTimeoutRef.current = setTimeout(() => {
    if (currentQuizQuestion < QUIZ_QUESTIONS.length - 1) {
      // Next question within quiz
      setSlideDirection('left')
      setCurrentQuizQuestion(prev => prev + 1)
    } else {
      // Q5 answered — calculate result and advance to Screen 4
      const updatedAnswers = [...quizAnswers]
      updatedAnswers[currentQuizQuestion] = optionIndex
      setQuizResult(calculateResult(updatedAnswers))
      setSlideDirection('left')
      setCurrentScreen(3) // Screen 4 (Results)
    }
  }, 400)
}
```

**Note:** When calculating the result after Q5, use the updated answers array (not the stale state), since `setQuizAnswers` is async.

**Back button behavior on Screen 3:**
```typescript
// In the main handleBack function:
if (currentScreen === 2) {
  if (quizTimeoutRef.current) clearTimeout(quizTimeoutRef.current)
  if (currentQuizQuestion > 0) {
    setSlideDirection('right')
    setCurrentQuizQuestion(prev => prev - 1)
  } else {
    // Q1 → go back to Screen 2 (Avatar)
    setSlideDirection('right')
    setCurrentScreen(1)
  }
}
```

**Next button:** Hidden on Screen 3 (quiz auto-advances). The navigation row still shows Back and dots.

**Screen transition key:** Use `quiz-${currentQuizQuestion}` as the key for the animated div on Screen 3, so each question gets its own slide transition.

**Dot indicator:** On Screen 3, the third dot (index 2) stays active regardless of which quiz question is showing. The dots represent wizard screens, not quiz questions.

**Guardrails (DO NOT):**
- Do NOT show the quiz's own progress bar — the wizard dots serve as the progress indicator
- Do NOT include the section heading, BackgroundSquiggle, or section container from the landing page quiz
- Do NOT persist quiz answers to localStorage — they live in React state
- Do NOT pass quiz data via URL params — pass via React state to Screen 4
- Do NOT add a "Next" button on Screen 3 — auto-advance handles all forward movement

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders quiz heading "What Brought You Here?"` | unit | Heading text |
| `renders question 1 text and 4 options` | unit | Question content |
| `selecting an option shows checkmark` | unit | Visual feedback |
| `auto-advances to next question after ~400ms` | unit | Timer + transition |
| `Back on Q1 returns to Screen 2 (Avatar)` | unit | Navigation edge case |
| `Back on Q2+ returns to previous question` | unit | Navigation within quiz |
| `previous answer is preserved when going back` | unit | Answer persistence |
| `quiz options use dark frosted glass styling` | unit | Not white cards |
| `option groups have role="radiogroup"` | unit | ARIA compliance |
| `each option has role="radio" with aria-checked` | unit | ARIA compliance |
| `after Q5, calculates result and advances to Screen 4` | unit | Quiz completion flow |
| `re-answering Q5 recalculates result` | unit | Updated recommendation |
| `Next button is hidden on Screen 3` | unit | No Next button |
| `dot indicator shows 3rd dot active` | unit | Wizard progress, not quiz progress |

**Expected state after completion:**
- [x] Quiz renders within wizard card with dark theme
- [x] Auto-advance works with 400ms delay
- [x] Back navigates correctly within quiz and to Screen 2
- [x] Quiz result calculated and passed to Screen 4
- [x] Tests pass

---

### Step 6: Screen 4 — Results & Launch + Completion Logic

**Objective:** Add the results screen with quiz recommendation, CTAs, and the completion logic that saves data.

**Files to create/modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx` — add Screen 4 content + completion handlers

**Details:**

**Screen 4 layout:**
```jsx
<div className="text-center">
  <h2 id="wizard-heading-results" className="font-script text-2xl font-bold text-white sm:text-3xl">
    You're All Set!
  </h2>

  {/* Quiz result card */}
  {quizResult && (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <p className="text-base font-medium text-white sm:text-lg">
        We'd recommend starting with{' '}
        <span className="font-semibold text-primary-lt">{quizResult.name}</span>
      </p>
      <p className="mt-3 text-sm text-white/70 sm:text-base">
        {quizResult.description}
      </p>
      <blockquote className="mt-4 font-serif italic text-white/80">
        &ldquo;{quizResult.verse}&rdquo;
        <footer className="mt-1 font-sans text-sm not-italic text-white/50">
          &mdash; {quizResult.verseReference}
        </footer>
      </blockquote>
    </div>
  )}

  {/* Primary CTA */}
  <button
    type="button"
    onClick={() => handleComplete(quizResult?.route)}
    className="mt-6 w-full rounded-lg bg-primary py-3 px-8 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] sm:w-auto"
  >
    Start Your Journey
  </button>

  {/* Secondary action */}
  <div className="mt-3">
    <button
      type="button"
      onClick={() => handleComplete(undefined)}
      className="min-h-[44px] text-sm text-white/60 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
    >
      Explore on your own
    </button>
  </div>
</div>
```

**Completion handler:**
```typescript
const handleComplete = (destinationRoute?: string) => {
  // 1. Save display name
  login(displayName.trim())  // Updates wr_user_name + AuthContext state

  // 2. Save avatar selection
  updateSettings({ profile: { avatarId: selectedAvatarId } })

  // 3. Mark onboarding complete
  setOnboardingComplete()

  // 4. Navigate
  if (destinationRoute) {
    navigate(destinationRoute)
  } else {
    // "Explore on your own" — stay on dashboard
    onComplete()
  }
}
```

**Import `useNavigate` from react-router-dom** for the "Start Your Journey" route navigation.

**Back from Screen 4:**
- Goes to Screen 3 at Q5 (set `currentQuizQuestion = 4`, `currentScreen = 2`)
- Previous Q5 answer remains selected

**Next button on Screen 4:** Shows "Start Your Journey" label, wired to `handleComplete(quizResult?.route)`. Or treat the primary CTA button inside the card as the main action instead of using the navigation Next button. Since the spec says the Next button label on Screen 4 is "Start Your Journey", both approaches work — use the navigation row's Next button position.

**Decision:** Use the in-card CTA as the primary action and hide the Next button on Screen 4 (like Screen 3). This keeps the result card self-contained with its own CTA and secondary action. The navigation row shows only Back and dots on Screen 4.

**Responsive behavior:**
- Mobile: CTA button full-width (`w-full`), text centered
- Desktop: CTA button auto-width (`sm:w-auto`)

**Guardrails (DO NOT):**
- Do NOT save data on skip — the skip handler (Step 3) only sets `wr_onboarding_complete`
- Do NOT navigate before saving data — save first, then navigate
- Do NOT use `dangerouslySetInnerHTML` for quiz result content
- Do NOT persist quiz result to localStorage — it's shown on screen and then forgotten
- Do NOT forget to call `login()` to update the AuthContext — without this, the greeting won't update

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders "You're All Set!" heading in Caveat font` | unit | `font-script` class |
| `displays quiz result recommendation title` | unit | Feature name shown |
| `displays quiz result description` | unit | Description text |
| `displays scripture verse in serif italic` | unit | `font-serif italic` |
| `"Start Your Journey" saves name to wr_user_name` | unit | localStorage check |
| `"Start Your Journey" saves avatar to wr_settings` | unit | Settings updated |
| `"Start Your Journey" sets wr_onboarding_complete` | unit | Flag set |
| `"Start Your Journey" navigates to recommended route` | unit | useNavigate called |
| `"Explore on your own" saves data and calls onComplete` | unit | Same saves, no navigation |
| `"Explore on your own" does NOT navigate to a route` | unit | Stays on dashboard |
| `Back returns to Screen 3 at Q5` | unit | Quiz question 5 shown |
| `Back on Screen 4 preserves Q5 answer` | unit | Previous answer still selected |
| `Skip on Screen 4 does NOT save name or avatar` | unit | Only sets wr_onboarding_complete |

**Expected state after completion:**
- [x] Results screen shows quiz recommendation
- [x] "Start Your Journey" saves all data and navigates
- [x] "Explore on your own" saves all data and goes to dashboard
- [x] "Skip for now" sets flag only
- [x] Tests pass

---

### Step 7: Integration Tests + Edge Cases

**Objective:** Add comprehensive tests for the full wizard flow, edge cases, and integration with Dashboard.

**Files to create/modify:**
- `frontend/src/components/dashboard/__tests__/WelcomeWizard.test.tsx` — new file

**Details:**

**Full flow tests:**

| Test | Type | Description |
|------|------|-------------|
| `full wizard flow: name → avatar → quiz → complete` | integration | Happy path end-to-end |
| `completing wizard transitions to mood check-in` | integration | Phase transition |
| `skip on Screen 1 sets flag and transitions to check-in` | integration | Early skip |
| `skip on Screen 3 (mid-quiz) does not save partial data` | integration | Mid-quiz skip |
| `browser refresh resets wizard to Screen 1` | integration | Simulated via re-render with fresh state |
| `logout does not clear wr_onboarding_complete` | integration | Persistence across sessions |
| `wizard does not appear after completion on re-login` | integration | Flag respected |
| `name truncated if wr_user_name exceeds 30 chars` | edge case | Pre-fill edge case |
| `handles localStorage unavailable gracefully` | edge case | Try-catch in storage operations |
| `changing name on Screen 1, skipping, original name preserved` | edge case | Skip doesn't overwrite |
| `changing avatar on Screen 2, skipping, original avatar preserved` | edge case | Skip doesn't overwrite |
| `Back from Screen 4 → re-answer Q5 → new result on Screen 4` | edge case | Result recalculation |

**Accessibility tests:**

| Test | Type | Description |
|------|------|-------------|
| `all screens have proper heading with unique id` | a11y | `aria-labelledby` targets exist |
| `quiz option groups use radiogroup/radio` | a11y | ARIA pattern |
| `avatar grid uses radiogroup/radio` | a11y | ARIA pattern |
| `focus moves to heading on screen transition` | a11y | Focus management |
| `all buttons have minimum 44px touch target` | a11y | Touch target compliance |
| `keyboard: Tab navigates, Enter/Space activates` | a11y | Keyboard navigation |

**Expected state after completion:**
- [x] All wizard tests pass (40+ test cases)
- [x] No regressions in existing Dashboard/MoodCheckIn tests
- [x] Edge cases covered
- [x] Accessibility requirements met

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Onboarding storage utility |
| 2 | 1 | Dashboard phase integration (imports storage utility) |
| 3 | 1, 2 | WelcomeWizard shell + Screen 1 (renders in Dashboard) |
| 4 | 3 | Screen 2 — Avatar Selection (builds on wizard shell) |
| 5 | 3 | Screen 3 — Quiz (builds on wizard shell) |
| 6 | 3, 4, 5 | Screen 4 — Results + completion logic (consumes all previous screens' state) |
| 7 | 1-6 | Integration tests + edge cases |

**Note:** Steps 4 and 5 are independent of each other and could theoretically be parallelized, but since they both modify the same file (`WelcomeWizard.tsx`), sequential execution is safer.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Onboarding Storage Utility | [COMPLETE] | 2026-03-18 | Created `services/onboarding-storage.ts` + test (6 tests pass) |
| 2 | Dashboard Phase Integration | [COMPLETE] | 2026-03-18 | Added `'onboarding'` phase to Dashboard.tsx, stub WelcomeWizard created. MoodCheckIn tests pass (30/30). |
| 3 | WelcomeWizard Shell + Screen 1 | [COMPLETE] | 2026-03-18 | Full WelcomeWizard.tsx with all 4 screens, nav system, slide transitions, focus management |
| 4 | Screen 2 — Avatar Selection | [COMPLETE] | 2026-03-18 | 16 preset avatars in 4-category grid with radiogroup ARIA, ring selection highlight |
| 5 | Screen 3 — Quiz | [COMPLETE] | 2026-03-18 | 5-question quiz with 400ms auto-advance, dark frosted glass options, back navigation |
| 6 | Screen 4 — Results & Launch | [COMPLETE] | 2026-03-18 | Result card with scripture, Start Your Journey + Explore CTAs, completion saves name/avatar/flag |
| 7 | Integration Tests + Edge Cases | [COMPLETE] | 2026-03-18 | 63 tests in WelcomeWizard.test.tsx covering all screens, flows, skip/back, edge cases, a11y |
