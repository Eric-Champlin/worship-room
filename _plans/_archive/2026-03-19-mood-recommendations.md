# Implementation Plan: Mood-to-Content Personalized Recommendations

**Spec:** `_specs/mood-recommendations.md`
**Date:** 2026-03-19
**Branch:** `claude/feature/mood-recommendations`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

> **Note:** Design system recon was captured 2026-03-06, before Phase 2.75 dashboard components were built. The recon does not include Dashboard or MoodCheckIn visuals. However, this spec uses the **same dark radial gradient** as MoodCheckIn (verified from source code) and **frosted glass cards** (defined in `09-design-system.md`), so stale recon is not a blocker here.

---

## Architecture Context

### Relevant Existing Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/Dashboard.tsx` | Main dashboard page with `DashboardPhase` state machine |
| `frontend/src/components/dashboard/MoodCheckIn.tsx` | Mood check-in component, calls `onComplete(entry: MoodEntry)` |
| `frontend/src/constants/dashboard/mood.ts` | `MOOD_OPTIONS`, `MOOD_COLORS`, `VERSE_DISPLAY_DURATION_MS` |
| `frontend/src/types/dashboard.ts` | `MoodEntry`, `MoodValue`, `MoodLabel` types |
| `frontend/src/hooks/useReducedMotion.ts` | Returns boolean for `prefers-reduced-motion` |
| `frontend/src/hooks/useAuth.ts` | Auth hook, `{ user, isAuthenticated }` |
| `frontend/src/pages/__tests__/Dashboard.test.tsx` | Dashboard test with provider wrapping pattern |
| `frontend/src/components/dashboard/__tests__/MoodCheckIn.test.tsx` | MoodCheckIn test patterns |

### Directory Conventions

- Components: `frontend/src/components/dashboard/`
- Constants: `frontend/src/constants/dashboard/`
- Tests: `frontend/src/components/dashboard/__tests__/` or `frontend/src/pages/__tests__/`
- Types: `frontend/src/types/dashboard.ts`

### Current DashboardPhase State Machine (Dashboard.tsx:23)

```
type DashboardPhase = 'onboarding' | 'check_in' | 'dashboard_enter' | 'dashboard'
```

Current flow:
```
onboarding → check_in → dashboard_enter (800ms) → dashboard
                      ↘ (skip) → dashboard
```

Target flow after this spec:
```
onboarding → check_in → recommendations (5s) → dashboard_enter (800ms) → dashboard
                      ↘ (skip) → dashboard
```

### Key Patterns

- **Phase transitions**: `useState<DashboardPhase>` with `useEffect` auto-advance timers
- **Reduced motion**: `useReducedMotion()` hook, `prefersReduced` skips animation phases
- **MoodCheckIn background**: `bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]` (MoodCheckIn.tsx:124)
- **Skip link style**: `text-sm text-white/40 underline underline-offset-4 hover:text-white/60 min-h-[44px] inline-flex items-center` (MoodCheckIn.tsx:224)
- **Test wrapper**: `MemoryRouter > ToastProvider > AuthModalProvider` (Dashboard.test.tsx:57-66)
- **Auth mock**: `vi.mock('@/hooks/useAuth', ...)` returning `{ user: { name, id }, isAuthenticated: true }` (Dashboard.test.tsx:18-25)
- **Timer testing**: `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(ms))` (MoodCheckIn.test.tsx:159-181)
- **Navigation**: React Router `useNavigate()` for programmatic navigation

### Cross-Spec Dependencies (from Master Plan)

- **Consumes from Spec 1**: `MoodEntry` type (specifically the `mood` field, value 1-5), passed via `onComplete` callback
- **Modifies Spec 2**: `DashboardPhase` type in Dashboard.tsx — adds `'recommendations'` phase
- **No new localStorage keys** — purely stateless, mood comes from React state
- **Mood colors**: From `MOOD_COLORS` in `constants/dashboard/mood.ts`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View recommendations screen | Only authenticated users (part of mood check-in flow) | Step 3 | Dashboard.tsx returns `null` if `!user` (line 109) — no additional gate needed |
| Click suggestion card | Navigate to route | Step 2 | Already auth-gated via Dashboard parent; routes like `/prayer-wall` work for all users |
| Click "Go to Dashboard" | Advance to dashboard | Step 2 | Already auth-gated via Dashboard parent |
| Auto-advance timer | Transitions phase | Step 3 | Already auth-gated via Dashboard parent |

**Note:** This feature is inherently auth-gated because it renders inside the Dashboard component, which returns `null` when `!user` (Dashboard.tsx:109). Logged-out users see the landing page. No additional auth modal gates needed.

---

## Design System Values (for UI steps)

Values from **codebase inspection** and **design-system.md recon**:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Background gradient | background | `bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]` | MoodCheckIn.tsx:124 |
| Heading | font | `font-serif italic text-xl md:text-2xl text-white/80` | Spec requirement (Lora italic) |
| Frosted glass card | styles | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl` | 09-design-system.md:41 |
| Card padding | padding | `p-4` | Spec requirement |
| Card hover | background | `bg-white/10` (200ms transition) | Spec requirement |
| Card focus | ring | `focus-visible:ring-2 focus-visible:ring-white/50` | Matches MoodCheckIn orbs (MoodCheckIn.tsx:159) |
| Skip link | styles | `text-sm text-white/40 hover:text-white/60 underline underline-offset-4 min-h-[44px] inline-flex items-center` | MoodCheckIn.tsx:224 |
| Mood color (Struggling) | border-left | `#D97706` | mood.ts:58 |
| Mood color (Heavy) | border-left | `#C2703E` | mood.ts:59 |
| Mood color (Okay) | border-left | `#8B7FA8` | mood.ts:60 |
| Mood color (Good) | border-left | `#2DD4BF` | mood.ts:61 |
| Mood color (Thriving) | border-left | `#34D399` | mood.ts:62 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for hero H1s and script emphasis, **Lora** (`font-serif`) for scripture/journal text. This spec heading uses Lora italic, NOT Caveat.
- Mood colors: Struggling=`#D97706`, Heavy=`#C2703E`, Okay=`#8B7FA8`, Good=`#2DD4BF`, Thriving=`#34D399`
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (2xl for dashboard widgets). This spec uses `rounded-xl` for smaller cards.
- All motion-aware animations use `motion-safe:` prefix (not bare `animate-` classes)
- Focus rings match pattern: `focus-visible:ring-2 focus-visible:ring-white/50`
- Skip/dismiss links match: `text-sm text-white/40 hover:text-white/60 underline underline-offset-4`
- MoodCheckIn background is a radial gradient with `ellipse_at_50%_30%` — this spec uses the **same** gradient
- Icons use Lucide React (`lucide-react` package)

---

## Shared Data Models (from Master Plan)

```typescript
// From types/dashboard.ts — consumed by this spec (read-only)
export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;
  mood: MoodValue;        // ← This is the field used for recommendation lookup
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | This spec is entirely stateless. Mood comes from React state via `onComplete(entry)` |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Cards stack vertically, full width, `gap-3`, heading `text-xl` |
| Tablet | 640px-1024px | Cards stack vertically, max-w-[600px] centered, `gap-4`, heading `text-xl md:text-2xl` |
| Desktop | > 1024px | Cards in horizontal row (3 across, `flex-1`), max-w-[800px] centered, `gap-4`, heading `text-2xl` |

**Custom breakpoints:** None. Uses standard Tailwind `md:` (768px) and `lg:` (1024px).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Heading → first card | `gap-3` (mobile) / `gap-4` (tablet+) via flex container | Spec requirement |
| Last card → "Go to Dashboard" | `mt-6` (mobile) / `mt-8` (desktop) | Spec requirement |

This is a full-screen centered layout — no section-to-section vertical rhythm to enforce.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (Mood Check-In) and Spec 2 (Dashboard Shell) are complete and committed
- [x] `MoodEntry` type exists in `types/dashboard.ts`
- [x] `MOOD_COLORS` exists in `constants/dashboard/mood.ts`
- [x] `useReducedMotion` hook exists in `hooks/useReducedMotion.ts`
- [x] Dashboard.tsx has the `DashboardPhase` type at line 23
- [x] MoodCheckIn `onComplete` passes `MoodEntry` with `.mood` field (1-5)
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from codebase inspection)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] `lucide-react` is installed (check `package.json`)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| How to pass mood value to recommendations | Store `MoodEntry` in Dashboard state from `onComplete`, read `.mood` during `'recommendations'` phase | Spec says "mood value from entry is available in Dashboard component state — no new localStorage keys needed" |
| Card implementation | `<Link>` elements from React Router (not `<button>` + `useNavigate`) | Cards are navigation links — `<Link>` gives correct semantics (`role="link"` via anchor), keyboard behavior, and right-click "open in new tab" |
| Desktop card layout | Icon left, text right (horizontal) | Simpler than icon-top for 3 equally-sized cards. Spec says "either pattern works as long as balanced" |
| Timer cleanup on navigation | Clear timer in cleanup function + use ref flag | Prevents auto-advance firing after user already navigated away via card click |
| `handleCheckInComplete` needs refactoring | Store entry in state, change phase to `'recommendations'` (not `'dashboard_enter'`) | The entry's `.mood` is needed during the recommendations phase |
| Where does `'recommendations'` phase render? | In Dashboard.tsx, as a new conditional block between check_in and dashboard rendering | Follows existing pattern (line 120-128 for check_in) |

---

## Implementation Steps

### Step 1: Recommendation Constants

**Objective:** Create the static mood-to-recommendations mapping as a constants file with TypeScript types.

**Files to create:**
- `frontend/src/constants/dashboard/recommendations.ts` — Recommendation mapping and types

**Details:**

Define the recommendation data structure and mapping:

```typescript
import type { MoodValue } from '@/types/dashboard';

export interface MoodRecommendation {
  title: string;
  description: string;
  icon: string;       // Lucide icon name (e.g., 'HandHeart', 'BookOpen')
  route: string;      // React Router path
}

export const MOOD_RECOMMENDATIONS: Record<MoodValue, MoodRecommendation[]> = {
  1: [ /* Struggling */ ],
  2: [ /* Heavy */ ],
  3: [ /* Okay */ ],
  4: [ /* Good */ ],
  5: [ /* Thriving */ ],
};
```

Exact content for each mood from the spec:

**Mood 1 (Struggling):**
1. `{ title: 'Talk to God', description: 'Let prayer carry what feels too heavy to hold.', icon: 'HandHeart', route: '/daily?tab=pray' }`
2. `{ title: 'Find Comfort in Scripture', description: 'Rest in words that have held others through the storm.', icon: 'BookOpen', route: '/music?tab=sleep' }`
3. `{ title: "You're Not Alone", description: 'See how others are lifting each other up right now.', icon: 'Users', route: '/prayer-wall' }`

**Mood 2 (Heavy):**
1. `{ title: 'Write It Out', description: 'Sometimes the weight lifts when you put it into words.', icon: 'PenLine', route: '/daily?tab=journal' }`
2. `{ title: 'Breathe and Be Still', description: 'A quiet moment to slow down and just breathe.', icon: 'Wind', route: '/daily?tab=meditate' }`
3. `{ title: 'Listen to Calming Sounds', description: 'Let gentle sounds create space for peace.', icon: 'Headphones', route: '/music?tab=ambient' }`

**Mood 3 (Okay):**
1. `{ title: 'Reflect on Your Day', description: 'Take a few minutes to notice what God is doing.', icon: 'PenLine', route: '/daily?tab=journal' }`
2. `{ title: 'Worship with Music', description: 'Let worship shift your focus and lift your spirit.', icon: 'Music', route: '/music?tab=playlists' }`
3. `{ title: 'Explore a Meditation', description: 'A guided moment of stillness and presence.', icon: 'Sparkles', route: '/daily?tab=meditate' }`

**Mood 4 (Good):**
1. `{ title: 'Give Thanks', description: 'Gratitude turns what you have into more than enough.', icon: 'Heart', route: '/meditate/gratitude' }`
2. `{ title: 'Encourage Someone', description: 'Your words could be exactly what someone needs today.', icon: 'MessageCircleHeart', route: '/prayer-wall' }`
3. `{ title: 'Deepen Your Worship', description: "Let music draw you closer to God's heart.", icon: 'Music', route: '/music?tab=playlists' }`

**Mood 5 (Thriving):**
1. `{ title: 'Celebrate with Worship', description: 'Let your joy overflow into praise.', icon: 'Music', route: '/music?tab=playlists' }`
2. `{ title: 'Share Your Joy', description: 'Spread encouragement to those who need it most.', icon: 'Megaphone', route: '/prayer-wall' }`
3. `{ title: 'Pour into Others', description: 'Your strength today can lift someone else up.', icon: 'HeartHandshake', route: '/friends' }`

**Lucide icon choices:** Use icons that exist in `lucide-react`. Verify each icon name is valid during implementation. The icon name is stored as a string and mapped to the component at render time via a lookup object.

**Guardrails (DO NOT):**
- DO NOT create a lookup that imports all Lucide icons — import only the specific icons used
- DO NOT add any localStorage persistence
- DO NOT add any AI-generated content — all text is hardcoded
- DO NOT change any existing files in this step

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `MOOD_RECOMMENDATIONS has entries for all 5 mood values` | unit | Verify keys 1-5 all exist with 3 items each |
| `Each recommendation has required fields` | unit | title, description, icon, route are all non-empty strings |
| `All routes are valid app routes` | unit | Each route starts with `/` and matches a known route pattern |
| `Struggling suggestions match spec` | unit | Verify exact titles and routes for mood 1 |
| `Thriving suggestions match spec` | unit | Verify exact titles and routes for mood 5 |

**Expected state after completion:**
- [ ] `frontend/src/constants/dashboard/recommendations.ts` exists with typed constant
- [ ] All 5 moods map to exactly 3 suggestions each
- [ ] All suggestion text matches spec exactly
- [ ] Test file created and passing

---

### Step 2: MoodRecommendations Component

**Objective:** Build the recommendations display component with stagger animation, mood-colored card borders, and navigation.

**Files to create:**
- `frontend/src/components/dashboard/MoodRecommendations.tsx` — The recommendations screen component

**Details:**

**Props interface:**
```typescript
interface MoodRecommendationsProps {
  moodValue: MoodValue;
  onAdvanceToDashboard: () => void;
}
```

**Component structure:**

1. Import `MOOD_RECOMMENDATIONS` from constants and `MOOD_COLORS` from `constants/dashboard/mood.ts`
2. Import `useReducedMotion` hook
3. Import specific Lucide icons and create a lookup map:
   ```typescript
   import { HandHeart, BookOpen, Users, PenLine, Wind, Headphones, Music, Sparkles, Heart, MessageCircleHeart, Megaphone, HeartHandshake } from 'lucide-react';

   const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
     HandHeart, BookOpen, Users, PenLine, Wind, Headphones, Music, Sparkles, Heart, MessageCircleHeart, Megaphone, HeartHandshake,
   };
   ```
4. Look up `recommendations = MOOD_RECOMMENDATIONS[moodValue]` and `moodColor = MOOD_COLORS[moodValue]`
5. Set up 5-second auto-advance timer with `useEffect` + `useRef` for cleanup flag
6. Use React Router `Link` for card navigation (clears timer on click)

**Auto-advance timer:**
```typescript
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const navigatedRef = useRef(false);

useEffect(() => {
  timerRef.current = setTimeout(() => {
    if (!navigatedRef.current) {
      onAdvanceToDashboard();
    }
  }, 5000);
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, [onAdvanceToDashboard]);

const handleCardClick = () => {
  navigatedRef.current = true;
  if (timerRef.current) clearTimeout(timerRef.current);
};

const handleSkipClick = () => {
  navigatedRef.current = true;
  if (timerRef.current) clearTimeout(timerRef.current);
  onAdvanceToDashboard();
};
```

**Root element:**
```jsx
<div
  role="region"
  aria-label="Recommended activities based on your mood"
  className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]"
>
```

Use the same background as MoodCheckIn.tsx:124.

**Heading:**
```jsx
<h2
  ref={headingRef}
  tabIndex={-1}
  className="mb-6 text-center font-serif italic text-xl text-white/80 outline-none motion-safe:animate-fade-in md:text-2xl"
>
  Based on how you're feeling...
</h2>
```

Focus management: `headingRef` receives focus on mount via `useEffect`.

**Card layout container:**
```jsx
<div className="flex w-full flex-col gap-3 sm:gap-4 lg:flex-row lg:gap-4">
```

Mobile/tablet: column. Desktop (lg+): row with `flex-1` on each card.

**Each card (as `<Link>`):**
```jsx
<Link
  to={rec.route}
  onClick={handleCardClick}
  className="flex min-h-[44px] items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:flex-1 lg:flex-col lg:items-start lg:gap-2"
  style={{
    borderLeftWidth: '4px',
    borderLeftColor: moodColor,
    animationDelay: prefersReduced ? '0ms' : `${index * 150}ms`,
  }}
>
  <IconComponent size={24} className="shrink-0" style={{ color: moodColor }} />
  <div>
    <span className="font-semibold text-base text-white">{rec.title}</span>
    <p className="text-sm text-white/60">{rec.description}</p>
  </div>
</Link>
```

**Stagger animation:** Apply a custom CSS class for staggered entrance. Use `motion-safe:` prefix. Each card gets `opacity: 0` initially and transitions to `opacity: 1, translateY: 0` via inline style animation or a utility class.

Since Tailwind's `animate-fade-in` is defined in the project (500ms), create card-level stagger using inline styles:
```jsx
style={{
  borderLeftWidth: '4px',
  borderLeftColor: moodColor,
  animation: prefersReduced ? 'none' : `fadeSlideUp 300ms ease-out ${index * 150}ms both`,
}}
```

Define `fadeSlideUp` as a `@keyframes` in the component via a `<style>` tag or add to `tailwind.config.js`. **Preferred approach:** Use inline styles with CSS custom properties to avoid adding global keyframes for a one-off animation. Or reuse the existing `animate-fade-in` with delay:

Better approach — use the existing `motion-safe:animate-fade-in` class (which does fade + slide up per `tailwind.config.js`) with `animation-delay` via inline style and `animation-fill-mode: both` (so cards start invisible):

```jsx
className={cn(
  'flex min-h-[44px] items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:flex-1 lg:flex-col lg:items-start lg:gap-2',
  !prefersReduced && 'animate-fade-in opacity-0'
)}
style={{
  borderLeftWidth: '4px',
  borderLeftColor: moodColor,
  animationDelay: prefersReduced ? undefined : `${index * 150}ms`,
  animationFillMode: prefersReduced ? undefined : 'both',
}}
```

**Check existing `animate-fade-in` definition** to confirm it includes translateY. If it does, this approach works. If not, add a small `@keyframes fadeSlideUp` to `tailwind.config.js`.

[UNVERIFIED] `animate-fade-in` includes translateY slide-up
→ To verify: Check `tailwind.config.js` for the `fade-in` keyframe definition
→ If wrong: Add `fadeSlideUp` keyframes to `tailwind.config.js` or use inline style animation

**"Go to Dashboard" link:**
```jsx
<button
  onClick={handleSkipClick}
  className="mt-6 inline-flex min-h-[44px] items-center text-sm text-white/40 underline underline-offset-4 hover:text-white/60 focus-visible:text-white/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 lg:mt-8"
>
  Go to Dashboard
</button>
```

**Responsive behavior:**
- Mobile (< 640px): `flex-col gap-3`, cards full width, heading `text-xl`, "Go to Dashboard" `mt-6`
- Tablet (640-1024px): `flex-col gap-4`, content `max-w-[600px]` centered, heading `text-xl md:text-2xl`
- Desktop (> 1024px): `lg:flex-row gap-4`, content `max-w-[800px]` centered, cards `lg:flex-1`, heading `text-2xl`, "Go to Dashboard" `lg:mt-8`

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT use `useNavigate` for card clicks — use `<Link>` for correct semantics
- DO NOT persist anything to localStorage
- DO NOT add AI-generated or dynamic content — all text is from the constants file
- DO NOT use bare `animate-*` classes — always prefix with `motion-safe:` or check `prefersReduced`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `renders heading text` | unit | "Based on how you're feeling..." is present |
| `renders 3 suggestion cards for mood 1 (Struggling)` | unit | Titles: "Talk to God", "Find Comfort in Scripture", "You're Not Alone" |
| `renders 3 suggestion cards for mood 5 (Thriving)` | unit | Titles: "Celebrate with Worship", "Share Your Joy", "Pour into Others" |
| `each card is a link to the correct route` | unit | Check `href` attributes match spec routes |
| `cards have mood-colored left border` | unit | Check inline style `borderLeftColor` matches `MOOD_COLORS[moodValue]` |
| `"Go to Dashboard" button calls onAdvanceToDashboard` | unit | Click → callback called once |
| `auto-advances after 5 seconds` | unit | `vi.useFakeTimers()`, advance 5000ms, verify callback |
| `clicking a card clears auto-advance timer` | unit | Click card, advance 5000ms, callback NOT called |
| `clicking "Go to Dashboard" clears auto-advance timer` | unit | Click button, advance 5000ms, callback called only once (from click) |
| `focus moves to heading on mount` | unit | `headingRef` receives focus |
| `cards have accessible link text` | unit | Each card link has accessible name (from title text content) |
| `cards have 44px min touch target` | unit | Check `min-h-[44px]` class |
| `"Go to Dashboard" has 44px min touch target` | unit | Check `min-h-[44px]` class |
| `Lucide icons render with mood color` | unit | Check icon element has correct color style |
| `region has aria-label` | unit | `role="region"` with descriptive `aria-label` |

**Expected state after completion:**
- [ ] `MoodRecommendations.tsx` renders correctly for all 5 moods
- [ ] Cards navigate via `<Link>` elements
- [ ] Auto-advance timer works with 5s delay
- [ ] Timer is cleared on any user interaction
- [ ] Focus management: heading focused on mount
- [ ] All tests passing

---

### Step 3: Dashboard Phase Integration

**Objective:** Wire the `'recommendations'` phase into the Dashboard's state machine and pass the mood entry through.

**Files to modify:**
- `frontend/src/pages/Dashboard.tsx` — Add `'recommendations'` phase, store mood entry, render `MoodRecommendations`

**Details:**

**3a. Update `DashboardPhase` type (line 23):**
```typescript
type DashboardPhase = 'onboarding' | 'check_in' | 'recommendations' | 'dashboard_enter' | 'dashboard'
```

**3b. Add state for the last mood entry (after line 30):**
```typescript
const [lastMoodEntry, setLastMoodEntry] = useState<MoodEntry | null>(null)
```

**3c. Update `handleCheckInComplete` (line 81-83):**

Current:
```typescript
const handleCheckInComplete = (_entry: MoodEntry) => {
  setPhase(prefersReduced ? 'dashboard' : 'dashboard_enter')
}
```

New:
```typescript
const handleCheckInComplete = (entry: MoodEntry) => {
  setLastMoodEntry(entry)
  setPhase(prefersReduced ? 'dashboard' : 'recommendations')
}
```

When `prefersReduced` is true, skip recommendations entirely (go straight to dashboard). When false, enter recommendations phase.

**3d. Add `handleRecommendationsAdvance` handler:**
```typescript
const handleRecommendationsAdvance = () => {
  setPhase('dashboard_enter')
}
```

**3e. Add rendering block for recommendations phase (after check_in block, before `justCompletedCheckIn`):**

After line 128, before line 130:
```typescript
if (phase === 'recommendations' && lastMoodEntry) {
  return (
    <MoodRecommendations
      moodValue={lastMoodEntry.mood}
      onAdvanceToDashboard={handleRecommendationsAdvance}
    />
  )
}
```

**3f. Import `MoodRecommendations`:**
```typescript
import { MoodRecommendations } from '@/components/dashboard/MoodRecommendations'
```

**Flow after changes:**
1. User completes check-in → `handleCheckInComplete(entry)` stores entry, sets phase to `'recommendations'`
2. `MoodRecommendations` renders with the mood value
3. After 5s auto-advance OR user clicks "Go to Dashboard" → `handleRecommendationsAdvance()` → phase `'dashboard_enter'`
4. User clicks a card → React Router navigates away (timer cleared). When they return to `/`, `hasCheckedInToday()` returns true → dashboard renders directly
5. If `prefersReduced` → skip recommendations entirely, go to `'dashboard'`

**Guardrails (DO NOT):**
- DO NOT change the existing `dashboard_enter` → `dashboard` auto-advance logic (lines 64-75)
- DO NOT change `handleCheckInSkip` — skip still goes directly to `'dashboard'` (no recommendations)
- DO NOT change `handleOnboardingComplete` — still checks `hasCheckedInToday()`
- DO NOT add any new localStorage keys
- DO NOT modify MoodCheckIn.tsx — the `onComplete` callback signature is unchanged
- DO NOT change the crisis banner flow — after crisis dismiss, `onComplete` is called with the entry, which triggers recommendations normally (spec confirms this is the intended behavior)

**Responsive behavior:** N/A — this step is logic/wiring only, no new UI.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `DashboardPhase type includes 'recommendations'` | integration | TypeScript compilation passes with new phase |
| `check-in completion transitions to recommendations phase` | integration | Complete check-in flow → recommendations heading visible |
| `recommendations advance transitions to dashboard_enter` | integration | Click "Go to Dashboard" in recommendations → dashboard content appears |
| `skip check-in does NOT show recommendations` | integration | Click "Not right now" → dashboard shows directly, no recommendations |
| `reduced motion skips recommendations` | integration | Mock `prefers-reduced-motion`, complete check-in → dashboard directly |
| `recommendations show correct mood suggestions` | integration | Select "Good" mood, complete → see "Give Thanks", "Encourage Someone", "Deepen Your Worship" |
| `clicking recommendation card navigates away` | integration | Click a card in recommendations → `useNavigate` / `<Link>` navigates to correct route |
| `crisis banner dismiss still shows recommendations` | integration | Trigger crisis → dismiss → recommendations phase appears (not direct dashboard) |
| `returning to / after navigating shows dashboard` | integration | After clicking a card and navigating, going to `/` shows dashboard (check-in already done today) |

**Expected state after completion:**
- [ ] Dashboard phase machine includes `'recommendations'`
- [ ] Check-in completion → recommendations → dashboard_enter → dashboard flow works
- [ ] Skip flow unchanged (no recommendations)
- [ ] Reduced motion skips recommendations
- [ ] Crisis banner dismiss → recommendations works
- [ ] All existing Dashboard tests still pass
- [ ] New integration tests pass

---

### Step 4: Stagger Animation Keyframes

**Objective:** Verify or add the `fadeSlideUp` animation keyframes needed for the stagger entrance.

**Files to modify (if needed):**
- `frontend/tailwind.config.js` — Add `fadeSlideUp` keyframes if `fade-in` doesn't include translateY

**Details:**

Check the existing `fade-in` keyframe in `tailwind.config.js`. If it already includes:
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Then **no changes needed** — Step 2's stagger approach using `animate-fade-in` with `animationDelay` works.

If `fade-in` does NOT include translateY, add a new keyframe:
```javascript
// In tailwind.config.js extend.keyframes:
'fade-slide-up': {
  '0%': { opacity: '0', transform: 'translateY(8px)' },
  '100%': { opacity: '1', transform: 'translateY(0)' },
},
// In extend.animation:
'fade-slide-up': 'fade-slide-up 300ms ease-out both',
```

And update Step 2's card classes to use `animate-fade-slide-up` instead of `animate-fade-in`.

**Guardrails (DO NOT):**
- DO NOT modify existing animation definitions — only add new if needed
- DO NOT remove or rename any existing animations

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `stagger animation delays are correct` | unit | Card 0: 0ms, Card 1: 150ms, Card 2: 300ms delay |
| `reduced motion disables animations` | unit | Cards render immediately with no animation when `prefersReduced` is true |

**Expected state after completion:**
- [ ] Stagger animation works visually (fade-in + slide-up, 150ms between cards)
- [ ] `prefers-reduced-motion` disables all animations — cards render instantly

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Recommendation constants (data only, no UI) |
| 2 | 1, 4 | MoodRecommendations component (needs constants + animation) |
| 3 | 2 | Dashboard phase integration (needs component to render) |
| 4 | — | Animation keyframes (independent, verify early) |

**Recommended execution order:** 4 → 1 → 2 → 3 (verify animations first, then build data → component → integration)

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Recommendation Constants | [COMPLETE] | 2026-03-19 | Created `constants/dashboard/recommendations.ts` with typed `MOOD_RECOMMENDATIONS` mapping and `__tests__/recommendations.test.ts` (5 tests). All text matches spec exactly. |
| 2 | MoodRecommendations Component | [COMPLETE] | 2026-03-19 | Created `MoodRecommendations.tsx` + `__tests__/MoodRecommendations.test.tsx` (17 tests). Used `LucideIcon` type instead of manual type annotation. Visual verification deferred to Step 3 (component not visible until Dashboard integration). |
| 3 | Dashboard Phase Integration | [COMPLETE] | 2026-03-19 | Modified `Dashboard.tsx`: added `'recommendations'` to DashboardPhase, stored `lastMoodEntry` state, wired `handleRecommendationsAdvance`, rendered `MoodRecommendations` in phase. Added 5 integration tests to `Dashboard.test.tsx` (9 total). Visual verification passed at 375px, 768px, 1440px. |
| 4 | Stagger Animation Keyframes | [COMPLETE] | 2026-03-19 | No changes needed — `animate-fade-in` already includes `translateY(8px)` slide-up. Step 2 will use `animationDelay` + `animationFillMode: 'both'` for stagger. |
