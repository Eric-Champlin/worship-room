# Implementation Plan: Dashboard Shell

**Spec:** `_specs/dashboard-shell.md`
**Date:** 2026-03-16
**Branch:** `claude/feature/dashboard-shell`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (new dark-theme dashboard — no existing page to recon)
**Master Spec Plan:** `dashboard-growth-spec-plan-v2.md` (loaded)

---

## Architecture Context

### Relevant Existing Files and Patterns

- **App.tsx** (`frontend/src/App.tsx`): Provider wrapping order is `QueryClientProvider > BrowserRouter > ToastProvider > AuthModalProvider > AudioProvider > Routes`. The `/` route currently renders `<Home />` unconditionally. **AuthProvider must be inserted into this stack** — above `Routes` but below `BrowserRouter` (needs router context for navigation).
- **Navbar.tsx** (`frontend/src/components/Navbar.tsx`, 530 lines): Contains `DesktopNav`, `DesktopAuthActions`, `NavDropdown`, `MobileDrawer`. "Log In" and "Get Started" buttons use `useAuthModal()`. Mobile drawer is currently **light-themed** (`bg-white border border-gray-200`) — spec requires dark theme (`bg-hero-mid border border-white/15`) for logged-in state. Desktop dropdown panels use conditional styling: transparent navbar → `bg-hero-bg/95 backdrop-blur-xl border border-white/10`, opaque → `bg-white border border-gray-200`.
- **useAuth.ts** (`frontend/src/hooks/useAuth.ts`, 22 lines): **Placeholder** returning `{ user: null, isLoggedIn: false }`. Has `AuthUser` interface (id, firstName, lastName, email) and `AuthState`. Comment says `TODO(phase-3): replace with AuthContext`. **Must be replaced** with a real context-based hook that reads from `AuthProvider`.
- **Home.tsx** (`frontend/src/pages/Home.tsx`, 27 lines): Landing page with `Navbar transparent`, `HeroSection`, `JourneySection`, `GrowthTeasersSection`, `StartingPointQuiz`, `SiteFooter`.
- **Layout.tsx** (`frontend/src/components/Layout.tsx`, 35 lines): Wrapper with conditional `Navbar transparent` when `hero` prop provided. Used by inner pages (Prayer Wall, Local Support, etc.). **Dashboard will NOT use Layout** — it has its own full-page dark layout.
- **MoodCheckIn.tsx** (`frontend/src/components/dashboard/MoodCheckIn.tsx`, 298 lines): Already built (Spec 1). Props: `{ userName: string, onComplete: (entry: MoodEntry) => void, onSkip: () => void }`. Tests: 422 lines.
- **mood-storage.ts** (`frontend/src/services/mood-storage.ts`): `getMoodEntries()`, `hasCheckedInToday()`, `saveMoodEntry()`. Uses `wr_mood_entries` key.
- **types/dashboard.ts**: `MoodValue`, `MoodLabel`, `MoodEntry`.
- **constants/dashboard/mood.ts**: `MOOD_OPTIONS`, `MOOD_COLORS`, `MAX_MOOD_TEXT_LENGTH`, etc.
- **utils/date.ts**: `getLocalDateString()`, `getYesterdayDateString()`, `getCurrentWeekStart()`.
- **AuthModalProvider** (`frontend/src/components/prayer-wall/AuthModalProvider.tsx`): Provides `openAuthModal()`. Used by Navbar and auth-gated actions.
- **AuthModal** (`frontend/src/components/prayer-wall/AuthModal.tsx`): UI shell only. Displays login/register forms, calls toast "coming soon".

### Directory Conventions

- Components: `frontend/src/components/dashboard/` (already exists with MoodCheckIn)
- Pages: `frontend/src/pages/` (Dashboard.tsx goes here)
- Hooks: `frontend/src/hooks/`
- Providers: Currently inline in App.tsx or under components (e.g., `AuthModalProvider`). New `AuthProvider` should go in a `providers/` directory or `contexts/` for clarity.
- Tests: `__tests__/` subdirectories colocated with source files
- Constants: `frontend/src/constants/dashboard/`

### Test Patterns

- **Provider wrapping**: Tests wrap in `MemoryRouter` + `ToastProvider` + `AuthModalProvider` as needed. New tests will also need `AuthProvider` wrapping.
- **Assertions**: `screen.getByText()`, `screen.getByRole()`, `screen.queryByText()`. Use `userEvent` for async interactions, `fireEvent` for sync.
- **localStorage**: `localStorage.clear()` in `beforeEach()`. Direct `localStorage.getItem()`/`setItem()` for testing persistence.
- **Fake timers**: `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(ms))`.

### Shared Data Models from Master Plan

The `AuthProvider` context API defined in master plan Spec 2:

```typescript
interface AuthContextValue {
  isAuthenticated: boolean;
  user: { name: string; id: string } | null;
  login: (name: string) => void;
  logout: () => void;
}
```

### Cross-Spec Dependencies

- **Spec 1 (Mood Check-In)**: ✅ Complete. `MoodCheckIn` component renders inside Dashboard conditionally based on `hasCheckedInToday()`.
- **Specs 3-16**: All consume `AuthProvider` context built here. Widget card placeholders are replaced by subsequent specs.
- **Existing codebase**: Navbar's `useAuthModal()` must coexist with new `useAuth()` context. Many components use the old placeholder `useAuth()` — the new provider must match the hook name.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Dashboard rendering at `/` | Only when `isAuthenticated` | Step 3 | Conditional route element in App.tsx |
| Mood check-in display | Only for logged-in users | Step 3 | Dashboard component checks `isAuthenticated` (implicitly — only renders when auth) |
| Widget card collapse toggle | Only on dashboard (auth-gated page) | Step 4 | Implicitly auth-gated (dashboard only renders for authenticated users) |
| Quick Action button navigation | Works for all (same routes accessible via navbar) | Step 5 | No auth gate needed — routes are public |
| Navbar notification bell | Only when `isAuthenticated` | Step 6 | `useAuth()` check in Navbar |
| Navbar avatar dropdown | Only when `isAuthenticated` | Step 6 | `useAuth()` check in Navbar |
| Avatar dropdown "Log Out" | Only when `isAuthenticated` | Step 6 | Calls `auth.logout()` |
| Mobile drawer logged-in state | Only when `isAuthenticated` | Step 6 | `useAuth()` check in MobileDrawer |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Dashboard background | background-color | `#0f0a1e` (deep dark purple) | spec + `bg-[#0f0a1e]` |
| Dashboard hero gradient | background | `linear-gradient(to bottom, #1a0533, #0f0a1e)` | spec (shortened landing hero family) [UNVERIFIED] |
| Hero greeting | font | `font-serif text-2xl md:text-3xl text-white/90` | spec |
| Hero streak text | font | `text-lg font-semibold text-white` | spec |
| Hero level/points | font | `text-sm text-white/60` | spec |
| Progress bar track | style | `h-1.5 rounded-full bg-white/10` | spec |
| Progress bar fill | style | `bg-primary` (`#6D28D9`) | spec + design-system.md |
| Dashboard card | box | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | spec + 09-design-system.md |
| Dashboard card padding | padding | `p-4 md:p-6` | spec |
| Card header title | font | `text-white font-semibold text-base md:text-lg` | spec |
| Card header icon | color | `text-white/60` | spec |
| Card collapse chevron | color | `text-white/40` | spec |
| Placeholder text | font | `text-white/30 text-sm italic` | spec |
| Quick Action button | style | Frosted glass: `bg-white/5 border border-white/10 rounded-xl` | spec [UNVERIFIED] |
| Navbar avatar | style | `w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold` | spec |
| Navbar avatar dropdown | style | `bg-hero-mid border border-white/15 shadow-lg` | spec + design-system.md (dropdown panel) |
| Navbar bell | icon | Lucide `Bell`, `text-white/80` | spec |
| Dev toggle button | style | Fixed bottom-right, subtle, dev-only | spec |

**[UNVERIFIED] values:**

```
[UNVERIFIED] Dashboard hero gradient: `linear-gradient(to bottom, #1a0533, #0f0a1e)`
→ To verify: Run /verify-with-playwright and compare against landing page hero family
→ If wrong: Adjust gradient stops to match the hero-dark (#0D0620) / hero-mid (#1E0B3E) / #3B0764 family

[UNVERIFIED] Quick Action button hover glow: `shadow-[0_0_12px_rgba(109,40,217,0.3)]`
→ To verify: Run /verify-with-playwright and check visual appearance
→ If wrong: Adjust glow color/spread to match existing glow patterns (cyan glow-pulse or primary purple)

[UNVERIFIED] Dashboard hero height: ~180px desktop, ~200px mobile
→ To verify: Run /verify-with-playwright and measure rendered height
→ If wrong: Adjust padding to achieve the correct visual balance
```

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, not Lora. Lora (`font-serif`) is for scripture/journal prompts.
- Dashboard uses frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399
- Navbar is always glassmorphic with `liquid-glass` class (transparent) or `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` (opaque)
- Desktop dropdown panels on transparent navbar: `bg-hero-bg/95 backdrop-blur-xl border border-white/10`
- Avatar dropdown should match: `bg-hero-mid border border-white/15 shadow-lg` per spec
- Mobile drawer currently uses light theme (`bg-white`) — logged-in state should use dark theme per memory note
- Primary color is `#6D28D9` (`bg-primary`)
- All interactive elements need min 44px tap targets on mobile
- `prefers-reduced-motion`: all animations disabled, transitions instant
- Dashboard background is solid dark `#0f0a1e`, NOT neutral-bg `#F5F5F5`

---

## Shared Data Models (from Master Plan)

```typescript
// AuthProvider context (Spec 2 owns this)
interface AuthContextValue {
  isAuthenticated: boolean;
  user: { name: string; id: string } | null;
  login: (name: string) => void;
  logout: () => void;
}

// Existing types consumed (from Spec 1)
import type { MoodEntry } from '@/types/dashboard'; // { id, date, mood, moodLabel, text?, timestamp, verseSeen }
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_auth_simulated` | Both | `"true"` / `"false"` — simulated auth state |
| `wr_user_name` | Both | Display name for simulated user |
| `wr_user_id` | Both | Stable UUID, generated once on first login |
| `wr_dashboard_collapsed` | Both | JSON object: `{ [widgetId: string]: boolean }` |
| `wr_mood_entries` | Read | Read by Dashboard to check if mood check-in needed today |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 768px | Single-column widget grid, hero content centered/stacked, 2x2 Quick Actions, hamburger nav with drawer |
| Tablet | 768-1023px | Single column but wider cards (centered ~720px max), hero left-aligned, 4-across Quick Actions, desktop nav |
| Desktop | 1024px+ | 2-column grid (60/40 via `grid-cols-5`), hero left-aligned, max-w-6xl container, desktop nav + bell + avatar |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → Hero | 0 (hero directly under nav, nav is absolute on dashboard) | Spec: dark gradient hero flows from top |
| Hero → Widget grid | `gap-6` (part of page padding) | Spec: `py-6` section below hero |
| Widget card → Widget card | `gap-4 md:gap-6` | Spec |
| Last widget → Footer | `pb-8` (bottom padding before footer) | Codebase inspection |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 1 (Mood Check-In) is complete and committed
- [x] MoodCheckIn component exists at `components/dashboard/MoodCheckIn.tsx`
- [x] `mood-storage.ts`, `utils/date.ts`, `types/dashboard.ts`, `constants/dashboard/mood.ts` all exist
- [x] No existing `AuthProvider` context — only the placeholder `useAuth()` hook
- [x] The existing `useAuth()` returns `{ user: null, isLoggedIn: false }` and has `AuthUser` / `AuthState` interfaces
- [x] Navbar uses `useAuthModal()` for login/register buttons
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are from spec + design system recon (with [UNVERIFIED] flags for new patterns)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior specs in the sequence are complete and committed (Spec 1 ✅)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put AuthProvider | `frontend/src/contexts/AuthContext.tsx` | Separates context/provider from components; matches common React pattern. Re-export `useAuth` from same file. |
| How to handle existing `useAuth()` | Replace `hooks/useAuth.ts` with a re-export from AuthContext | Consumers using `import { useAuth } from '@/hooks/useAuth'` continue to work without import changes. The file becomes a thin re-export. |
| `useAuth` API shape change | Change from `{ user: AuthUser, isLoggedIn }` to `{ user: { name, id }, isAuthenticated, login, logout }` | Master plan defines this API. Old `AuthUser` has `firstName/lastName/email` which aren't available in simulated auth. Rename `isLoggedIn` → `isAuthenticated` for consistency with spec. Update any consumers. |
| Dashboard page vs component | Dashboard page at `pages/Dashboard.tsx`, widgets in `components/dashboard/` | Follows existing page/component split |
| Navbar always transparent on dashboard | Yes — dashboard has dark hero, same as landing page | Dashboard has its own dark layout; navbar should overlay with `transparent` prop |
| Mobile drawer theme (logged-in) | Dark theme: `bg-hero-mid border border-white/15` | Matches spec + memory note about syncing drawer with dropdowns |
| Dev toggle visibility | `import.meta.env.DEV` conditional rendering in Home.tsx (landing page only) | Tree-shaken from prod builds. Not in Dashboard — only needed on landing page to trigger login. |
| Multi-tab auth sync | Listen for `storage` event on `wr_auth_simulated` key | Spec mentions reflecting auth changes across tabs |
| Long user names | `truncate` class on greeting text with `max-w-[70vw]` | Spec edge case: graceful truncation |
| localStorage unavailable | Wrap reads in try/catch, default to logged-out / expanded cards | Spec edge case: Safari private browsing |

---

## Implementation Steps

### Step 1: AuthProvider Context & useAuth Replacement

**Objective:** Create the `AuthProvider` context that powers frontend-first simulated authentication, and replace the placeholder `useAuth()` hook.

**Files to create/modify:**
- `frontend/src/contexts/AuthContext.tsx` — **Create**: AuthProvider component + useAuth hook
- `frontend/src/hooks/useAuth.ts` — **Modify**: Replace placeholder with re-export from AuthContext
- `frontend/src/App.tsx` — **Modify**: Wrap app with AuthProvider

**Details:**

Create `AuthContext.tsx` with:
```typescript
interface AuthContextValue {
  isAuthenticated: boolean;
  user: { name: string; id: string } | null;
  login: (name: string) => void;
  logout: () => void;
}
```

- `AuthProvider` wraps children in context
- On mount, reads `wr_auth_simulated`, `wr_user_name`, `wr_user_id` from localStorage
- If `wr_auth_simulated === "true"`, sets `isAuthenticated: true` with user object
- `login(name)`: Sets `wr_auth_simulated` to `"true"`, `wr_user_name` to name, generates `wr_user_id` via `crypto.randomUUID()` if not already set, updates React state
- `logout()`: Removes ONLY `wr_auth_simulated` and `wr_user_name` from localStorage. Does NOT remove `wr_user_id` or any other `wr_*` keys. Updates React state.
- Listen for `storage` event to sync auth state across tabs
- `useAuth()` hook: calls `useContext(AuthContext)`, throws if used outside provider

Replace `hooks/useAuth.ts` with:
```typescript
export { useAuth } from '@/contexts/AuthContext';
export type { AuthContextValue } from '@/contexts/AuthContext';
```

In `App.tsx`, add `<AuthProvider>` wrapping — insert between `BrowserRouter` and `ToastProvider` (AuthProvider needs no router context, but placing it high ensures all route components can consume it):
```
QueryClientProvider > BrowserRouter > AuthProvider > ToastProvider > AuthModalProvider > AudioProvider > Routes
```

**Guardrails (DO NOT):**
- DO NOT create a second parallel auth system — replace the existing placeholder
- DO NOT remove or modify `AuthModalProvider` / `AuthModal` — they coexist (modal is the UI prompt, AuthProvider is the state)
- DO NOT persist any data beyond `wr_auth_simulated`, `wr_user_name`, `wr_user_id` for auth state
- DO NOT use `wr_user_id` if already set — only generate on first login

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AuthContext — default state is logged out` | unit | `isAuthenticated` is false, `user` is null when no localStorage data |
| `AuthContext — login sets auth state` | unit | After `login("Eric")`, `isAuthenticated` is true, `user.name` is "Eric" |
| `AuthContext — login persists to localStorage` | unit | After `login()`, `wr_auth_simulated` is "true", `wr_user_name` has value |
| `AuthContext — logout clears auth state` | unit | After `logout()`, `isAuthenticated` is false, `user` is null |
| `AuthContext — logout preserves other wr_ keys` | unit | After `logout()`, `wr_mood_entries` and `wr_dashboard_collapsed` still exist |
| `AuthContext — restores from localStorage on mount` | unit | Set `wr_auth_simulated` to "true" before render → `isAuthenticated` is true |
| `AuthContext — generates stable user id` | unit | `wr_user_id` generated once, same value on re-login |
| `AuthContext — cross-tab sync via storage event` | unit | Dispatch `storage` event for `wr_auth_simulated` → state updates |

**Expected state after completion:**
- [x] `AuthProvider` context available app-wide
- [x] `useAuth()` returns `{ isAuthenticated, user, login, logout }`
- [x] Old placeholder `useAuth()` replaced with context-based version
- [x] App.tsx wraps with AuthProvider
- [x] All 8 tests pass

---

### Step 2: Route Switching (Conditional `/` Route)

**Objective:** Make `/` conditionally render `Dashboard` when authenticated and `Home` when not.

**Files to create/modify:**
- `frontend/src/App.tsx` — **Modify**: Conditional route element at `/`
- `frontend/src/pages/Dashboard.tsx` — **Create**: Minimal Dashboard page (skeleton for now, fleshed out in Steps 3-5)

**Details:**

In App.tsx, replace:
```tsx
<Route path="/" element={<Home />} />
```
With a component that reads auth context:
```tsx
function RootRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Home />;
}
// ...
<Route path="/" element={<RootRoute />} />
```

Create `pages/Dashboard.tsx` as a minimal skeleton:
```tsx
export function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <Navbar transparent />
      <main id="main-content">
        <p className="text-white p-8">Dashboard coming soon</p>
      </main>
      <SiteFooter />
    </div>
  );
}
```

This skeleton is expanded in Steps 3-5. Keeping it minimal here ensures route switching can be tested independently.

**Guardrails (DO NOT):**
- DO NOT use `<Navigate>` redirect — the URL must stay as `/`
- DO NOT modify any other routes
- DO NOT remove the `Home` component or its imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `/ renders Home when not authenticated` | integration | Default state → Home landing page sections visible |
| `/ renders Dashboard when authenticated` | integration | After `login()` → Dashboard content visible, Home content not visible |
| `URL stays as / in both cases` | integration | No redirect occurs |
| `All other routes unchanged` | integration | `/daily`, `/prayer-wall`, `/music` still render correctly |

**Expected state after completion:**
- [x] `/` shows landing page when logged out
- [x] `/` shows Dashboard skeleton when logged in
- [x] URL never changes from `/`
- [x] No other routes affected

---

### Step 3: Dashboard Hero Section

**Objective:** Build the dark gradient hero section with time-of-day greeting, streak display, and level badge.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx` — **Create**: Hero section component
- `frontend/src/pages/Dashboard.tsx` — **Modify**: Add hero section

**Details:**

`DashboardHero` component receives `userName: string` from auth context.

**Time-of-day greeting logic:**
```typescript
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 16) return 'Good afternoon';
  return 'Good evening'; // 17-23, 0-4
}
```

**Hero layout:**
- Background: Dark gradient — `bg-gradient-to-b from-[#1a0533] to-[#0f0a1e]` [UNVERIFIED]
- Container: `max-w-6xl mx-auto px-4 sm:px-6`
- Desktop: Content left-aligned. Greeting on top, streak + level info below in a row.
- Mobile: Content centered, stacked vertically.
- Height: `py-8 md:py-10` (achieves ~180px desktop, ~200px mobile with content)

**Greeting:** `<h1 className="font-serif text-2xl md:text-3xl text-white/90">Good morning, Eric</h1>`
- Long name: `truncate max-w-[70vw] md:max-w-none` on name span

**Streak display (placeholder):**
- Flame icon (Lucide `Flame` or emoji 🔥) + "Start your streak today" (since streak is 0 in this spec)
- `text-lg font-semibold text-white`

**Level badge (placeholder):**
- "Seedling" label + "0 Faith Points"
- `text-sm text-white/60`
- Progress bar: `<div className="h-1.5 rounded-full bg-white/10 w-32"><div className="h-full rounded-full bg-primary" style={{ width: '0%' }} /></div>`

**Responsive behavior:**
- Desktop (1024px+): Left-aligned, greeting + stats in a flex row or two rows
- Tablet (768px): Same as desktop but can stack if needed
- Mobile (< 768px): Centered, all content stacked vertically, `text-center`

**Guardrails (DO NOT):**
- DO NOT add quick action buttons to the hero — they're in their own card
- DO NOT use real streak/level data — placeholder only for this spec
- DO NOT hardcode the user name — read from auth context

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `DashboardHero — shows morning greeting (hours 5-11)` | unit | Mock Date to 9am → "Good morning, Eric" |
| `DashboardHero — shows afternoon greeting (hours 12-16)` | unit | Mock Date to 2pm → "Good afternoon, Eric" |
| `DashboardHero — shows evening greeting (hours 17-4)` | unit | Mock Date to 8pm → "Good evening, Eric" |
| `DashboardHero — shows user name from props` | unit | Pass userName="Sarah" → "Good morning, Sarah" |
| `DashboardHero — shows placeholder streak text` | unit | "Start your streak today" visible |
| `DashboardHero — shows placeholder level text` | unit | "Seedling" and "0 Faith Points" visible |
| `DashboardHero — truncates long names` | unit | Pass very long name → element has `truncate` class |

**Expected state after completion:**
- [x] Dashboard shows dark gradient hero with personalized greeting
- [x] Greeting changes based on time of day
- [x] Placeholder streak and level info displayed
- [x] Responsive: centered on mobile, left-aligned on desktop

---

### Step 4: DashboardCard Component & Widget Grid

**Objective:** Build the reusable `DashboardCard` component with collapse/expand behavior and the 2-column widget grid with 5 placeholder cards.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardCard.tsx` — **Create**: Reusable collapsible card component
- `frontend/src/components/dashboard/DashboardWidgetGrid.tsx` — **Create**: Grid layout with 5 cards
- `frontend/src/pages/Dashboard.tsx` — **Modify**: Add widget grid below hero

**Details:**

**DashboardCard props:**
```typescript
interface DashboardCardProps {
  id: string;           // Used for collapse persistence key
  title: string;
  icon?: ReactNode;
  collapsible?: boolean; // default: true
  defaultCollapsed?: boolean; // default: false
  action?: { label: string; to: string };
  children: ReactNode;
  className?: string;    // Extra classes for grid spanning
}
```

**DashboardCard behavior:**
- Reads/writes collapse state from `wr_dashboard_collapsed` localStorage key (JSON object: `{ [widgetId]: boolean }`)
- Initial state: `defaultCollapsed` prop, then overridden by localStorage if a persisted value exists for this `id`
- Header row: flex with `items-center justify-between`
  - Left: optional `icon` (in `text-white/60`) + `title` (in `text-white font-semibold text-base md:text-lg`)
  - Right: optional `action` link (in `text-primary text-sm`) + collapse chevron button (in `text-white/40`)
- Chevron: Lucide `ChevronDown`, rotates 180deg when expanded
- Collapse uses `aria-expanded` and `aria-controls` attributes
- Content wrapper: `overflow-hidden` with CSS transition on `grid-template-rows` (0fr → 1fr) for smooth height animation (~200ms ease)
- Card semantic: `<section aria-labelledby={titleId}>` with `id={titleId}` on the title heading
- Visual: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`

**Collapse persistence:**
```typescript
function getCollapseState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('wr_dashboard_collapsed');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setCollapseState(id: string, collapsed: boolean) {
  const state = getCollapseState();
  state[id] = collapsed;
  localStorage.setItem('wr_dashboard_collapsed', JSON.stringify(state));
}
```

**DashboardWidgetGrid:**
- Container: `max-w-6xl mx-auto px-4 sm:px-6 pb-8`
- Grid: `grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6`
- Priority order mapping for mobile stacking (CSS `order`):

| Widget | Desktop Position | Mobile Order | Grid Classes |
|--------|-----------------|--------------|--------------|
| 7-Day Mood Chart | Left, row 1 | 2 | `lg:col-span-3 order-2 lg:order-1` |
| Streak & Faith Points | Right, row 1 | 1 | `lg:col-span-2 order-1 lg:order-2` |
| Activity Checklist | Left, row 2 | 3 | `lg:col-span-3 order-3` |
| Friends Preview | Right, row 2 | 4 | `lg:col-span-2 order-4` |
| Quick Actions | Full width, row 3 | 5 | `lg:col-span-5 order-5` |

**Placeholder cards (4 of 5):**
Each placeholder card body shows: `<p className="text-white/30 text-sm italic text-center py-8">Coming in Spec N</p>`

- Mood Chart: title="7-Day Mood", icon=`<TrendingUp />`, placeholder="Coming in Spec 3", action=`{ label: "See More", to: "/insights" }`
- Streak & Points: title="Streak & Faith Points", icon=`<Flame />`, placeholder="Coming in Spec 6"
- Activity Checklist: title="Today's Activity", icon=`<CheckCircle2 />`, placeholder="Coming in Spec 6"
- Friends Preview: title="Friends & Leaderboard", icon=`<Users />`, placeholder="Coming in Spec 9", action=`{ label: "See all", to: "/friends" }`

**Responsive behavior:**
- Desktop (1024px+): 2-column `grid-cols-5` layout, Quick Actions spans both columns
- Tablet (768-1023px): Single column, cards centered with max-width
- Mobile (< 768px): Single column, full-width cards, stacked in priority order

**Guardrails (DO NOT):**
- DO NOT implement real widget content — placeholder only (except Quick Actions in Step 5)
- DO NOT use `display: none` for collapse — use height transition for animation
- DO NOT make cards non-collapsible by default — all are collapsible per spec
- DO NOT forget `min-w-0` on grid items to prevent overflow with long content

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `DashboardCard — renders title and children` | unit | Title text visible, children rendered |
| `DashboardCard — collapse toggle hides content` | unit | Click chevron → content has `grid-rows-[0fr]`, click again → `grid-rows-[1fr]` |
| `DashboardCard — collapse state persists to localStorage` | unit | Toggle → `wr_dashboard_collapsed` has `{ [id]: true }` |
| `DashboardCard — reads initial state from localStorage` | unit | Pre-set `wr_dashboard_collapsed` → card starts collapsed |
| `DashboardCard — aria-expanded toggles` | unit | Chevron button has correct `aria-expanded` value |
| `DashboardCard — action link renders with correct href` | unit | "See More" link visible with correct `to` |
| `DashboardCard — uses section with aria-labelledby` | unit | `<section>` has `aria-labelledby` matching title id |
| `DashboardWidgetGrid — renders all 5 cards` | integration | 5 section elements visible |
| `DashboardWidgetGrid — placeholder text shows spec references` | integration | "Coming in Spec 3", "Coming in Spec 6", etc. |
| `DashboardWidgetGrid — collapse persists across unmount/remount` | integration | Collapse a card, unmount, remount → card still collapsed |

**Expected state after completion:**
- [x] 5 frosted glass cards render on dashboard
- [x] 4 cards show placeholder text
- [x] Cards are collapsible with smooth animation
- [x] Collapse state persists in localStorage
- [x] Grid is 2-column on desktop, single column on mobile

---

### Step 5: Quick Actions Card

**Objective:** Build the functional Quick Actions card with navigation buttons to Pray, Journal, Meditate, and Music.

**Files to create/modify:**
- `frontend/src/components/dashboard/QuickActions.tsx` — **Create**: Quick action navigation buttons

**Details:**

**4 buttons:**
| Button | Icon (Lucide) | Label | Route |
|--------|--------------|-------|-------|
| Pray | `Heart` | Pray | `/daily?tab=pray` |
| Journal | `BookOpen` | Journal | `/daily?tab=journal` |
| Meditate | `Brain` | Meditate | `/daily?tab=meditate` |
| Music | `Music` | Music | `/music` |

**Button styling:**
- Each button is a `<Link>` (React Router) styled as a frosted glass button
- Classes: `flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-4 md:p-6 text-white/80 transition-all hover:bg-white/10 hover:text-white hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`
- Icon: `h-6 w-6 md:h-8 md:w-8`
- Label: `text-xs md:text-sm font-medium`
- `prefers-reduced-motion`: Disable `hover:scale-[1.02]` transition

**Layout:**
- Desktop: Horizontal row of 4 (`grid grid-cols-4 gap-3 md:gap-4`)
- Mobile: 2x2 grid (`grid grid-cols-2 gap-3`)

**Guardrails (DO NOT):**
- DO NOT auth-gate these buttons — the routes they navigate to are public
- DO NOT add icons that aren't from Lucide
- DO NOT use `<a>` tags — use React Router `<Link>` for client-side navigation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `QuickActions — renders 4 buttons` | unit | Pray, Journal, Meditate, Music buttons visible |
| `QuickActions — Pray links to /daily?tab=pray` | unit | Link has correct href |
| `QuickActions — Journal links to /daily?tab=journal` | unit | Link has correct href |
| `QuickActions — Meditate links to /daily?tab=meditate` | unit | Link has correct href |
| `QuickActions — Music links to /music` | unit | Link has correct href |
| `QuickActions — buttons have accessible labels` | unit | Each link has accessible name |

**Expected state after completion:**
- [x] Quick Actions card is functional with 4 navigation buttons
- [x] Buttons navigate to correct routes
- [x] 2x2 grid on mobile, 4-across on desktop
- [x] Hover effects applied

---

### Step 6: Navbar Logged-In State (Global)

**Objective:** Update the Navbar to show notification bell + avatar dropdown when authenticated, and update the mobile drawer for logged-in state.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — **Modify**: Add auth-conditional rendering for desktop and mobile

**Details:**

This is the most complex step. The Navbar currently has `DesktopAuthActions` (Log In / Get Started) and `MobileDrawer` (light theme). Both need conditional rendering based on `useAuth()`.

**Desktop changes (inside Navbar):**

Replace `DesktopAuthActions` with a conditional:
```tsx
const { isAuthenticated, user, logout } = useAuth();

// In the nav bar:
{isAuthenticated ? (
  <DesktopUserActions user={user} onLogout={logout} transparent={transparent} />
) : (
  <DesktopAuthActions transparent={transparent} />
)}
```

**New `DesktopUserActions` component (inside Navbar.tsx):**
- Notification bell: `<button aria-label="Notifications"><Bell className="h-5 w-5 text-white/80" /></button>`
  - No click behavior (no-op placeholder for Spec 12)
  - Badge: Only render when unread count > 0 (hardcoded 0 for this spec, so no badge visible)
- Avatar: `<button aria-haspopup="menu" aria-expanded={isDropdownOpen}>` with user initial in circle
  - Circle: `w-8 h-8 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center`
  - Initial: `user.name.charAt(0).toUpperCase()`
  - Click toggles dropdown

**Avatar dropdown menu:**
- Dropdown uses same patterns as existing `NavDropdown`: open/close, outside click, Escape key, focus management
- Styling: `bg-hero-mid border border-white/15 shadow-lg rounded-xl animate-dropdown-in`
- Menu items (as `<Link>` elements):
  1. Dashboard → `/`
  2. Friends → `/friends`
  3. My Journal Entries → `/journal/my-entries`
  4. My Prayer Requests → `/prayer-wall/dashboard`
  5. My Favorites → `/favorites`
  6. Mood Insights → `/insights`
  7. Settings → `/settings`
  8. `<hr className="my-1 border-white/15" />`
  9. Log Out → `button` calling `logout()` + navigate to `/`

- Each menu item: `min-h-[44px] flex items-center px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white transition-colors rounded`
- Focus management: On open, focus first item. On close, return focus to avatar button.

**Mobile drawer changes:**

`MobileDrawer` receives `isAuthenticated`, `user`, and `logout` from Navbar (via props or direct `useAuth()` call).

**When logged in:**
- Top of drawer: Avatar circle + user name displayed (same circle style as desktop)
- Drawer background: Dark theme `bg-hero-mid border border-white/15 shadow-lg` (replaces light `bg-white`)
- Text colors: `text-white/80` for links, `text-white/50` for section headings
- Nav items (in order): Dashboard `/`, Daily Hub `/daily`, Prayer Wall `/prayer-wall`, Music `/music`, Local Support section (Churches, Counselors, CR), Friends `/friends`, Mood Insights `/insights`, My Journal Entries `/journal/my-entries`, My Prayer Requests `/prayer-wall/dashboard`, My Favorites `/favorites`, Settings `/settings`
- Near bottom: Notifications item (with badge if count > 0)
- Bottom: Log Out button calling `logout()`
- "Log In" / "Get Started" buttons removed

**When logged out:**
- Drawer is unchanged from current implementation (light theme, current nav items, Log In / Get Started at bottom)

**Guardrails (DO NOT):**
- DO NOT break the existing logged-out navbar behavior
- DO NOT add notification click behavior — bell is no-op until Spec 12
- DO NOT add avatar image support — initials only until Spec 14
- DO NOT modify the nav links (Daily Hub, Prayer Wall, Music, Local Support) — they stay the same regardless of auth state
- DO NOT use `dangerouslySetInnerHTML` for any menu content
- DO NOT forget to close dropdown/drawer on route change

**Auth gating:**
- Bell icon: only visible when `isAuthenticated`
- Avatar + dropdown: only visible when `isAuthenticated`
- "Log In" / "Get Started": only visible when NOT `isAuthenticated`
- Mobile drawer: shows different content based on `isAuthenticated`

**Responsive behavior:**
- Desktop (1024px+): Bell + Avatar in navbar, dropdown opens downward
- Tablet (768px+): Same as desktop (Navbar uses `lg:` breakpoint for desktop nav)
- Mobile (< 768px): Hamburger menu opens drawer with logged-in structure

Note: Navbar uses `lg:` (1024px) breakpoint for desktop vs mobile. Bell + Avatar should follow this same breakpoint.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Navbar — shows Log In and Get Started when logged out` | integration | Default state → both buttons visible |
| `Navbar — hides Log In and Get Started when logged in` | integration | After login → buttons not in document |
| `Navbar — shows notification bell when logged in` | integration | Bell icon visible with aria-label "Notifications" |
| `Navbar — bell not visible when logged out` | integration | No bell icon in document |
| `Navbar — shows avatar with initial when logged in` | integration | Circle with "E" for "Eric" |
| `Navbar — avatar not visible when logged out` | integration | No avatar in document |
| `Navbar — avatar dropdown opens on click` | integration | Click avatar → menu items visible |
| `Navbar — avatar dropdown has all menu items` | integration | Dashboard, Friends, My Journal Entries, My Prayer Requests, My Favorites, Mood Insights, Settings, Log Out all present |
| `Navbar — dropdown closes on outside click` | integration | Click outside → dropdown not visible |
| `Navbar — dropdown closes on Escape` | integration | Press Escape → dropdown not visible |
| `Navbar — Log Out calls logout and navigates to /` | integration | Click Log Out → isAuthenticated false |
| `Navbar — logged-in state applies on non-dashboard pages` | integration | Render Navbar at `/daily` when logged in → bell + avatar visible |
| `MobileDrawer — shows avatar and name when logged in` | integration | User avatar + "Eric" visible at top |
| `MobileDrawer — shows logged-in nav items` | integration | Dashboard, Friends, Settings, etc. visible |
| `MobileDrawer — shows Log Out when logged in` | integration | Log Out link visible at bottom |
| `MobileDrawer — shows Log In / Get Started when logged out` | integration | Default state → both buttons visible |
| `MobileDrawer — uses dark theme when logged in` | integration | Drawer element has dark background classes |

**Expected state after completion:**
- [x] Navbar shows bell + avatar when authenticated on ALL pages
- [x] Navbar shows Log In / Get Started when not authenticated
- [x] Avatar dropdown with all 8 menu items + divider + Log Out
- [x] Mobile drawer updated with logged-in structure (dark theme)
- [x] Dropdown/drawer close on outside click, Escape, and route change

---

### Step 7: Dashboard Page Assembly & Mood Check-In Integration

**Objective:** Assemble the full Dashboard page combining hero, widget grid, and MoodCheckIn conditional rendering. Add the dev toggle to the landing page.

**Files to create/modify:**
- `frontend/src/pages/Dashboard.tsx` — **Modify**: Full assembly with MoodCheckIn integration
- `frontend/src/pages/Home.tsx` — **Modify**: Add dev toggle button (dev mode only)

**Details:**

**Dashboard.tsx full assembly:**
```tsx
export function Dashboard() {
  const { user } = useAuth();
  const [showCheckIn, setShowCheckIn] = useState(!hasCheckedInToday());
  const checkedRef = useRef(false); // Prevent re-check on midnight rollover

  // On mount, check once. Don't re-check reactively.
  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true;
      setShowCheckIn(!hasCheckedInToday());
    }
  }, []);

  const handleCheckInComplete = (entry: MoodEntry) => {
    setShowCheckIn(false);
  };

  const handleCheckInSkip = () => {
    setShowCheckIn(false);
  };

  if (showCheckIn) {
    return <MoodCheckIn userName={user!.name} onComplete={handleCheckInComplete} onSkip={handleCheckInSkip} />;
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <Navbar transparent />
      <main id="main-content" className="animate-fade-in motion-reduce:animate-none">
        <DashboardHero userName={user!.name} />
        <DashboardWidgetGrid />
      </main>
      <SiteFooter />
    </div>
  );
}
```

Key points:
- `animate-fade-in` for gentle entrance (400ms). `motion-reduce:animate-none` for reduced motion.
- Skip-to-content link at top (matches pattern from Home.tsx)
- Uses `Navbar transparent` since dashboard has dark background
- MoodCheckIn is rendered instead of dashboard when not checked in

**Dev toggle on Home.tsx (landing page):**
```tsx
// At the bottom of Home component, inside the root div:
{import.meta.env.DEV && <DevAuthToggle />}
```

`DevAuthToggle` component (can be inline in Home.tsx or a small component):
- Position: `fixed bottom-4 right-4 z-50`
- Style: `rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:text-white/90 hover:bg-white/20 transition-colors`
- Label: "Simulate Login" when logged out, "Simulate Logout" when logged in
- Click: calls `auth.login("Eric")` or `auth.logout()` respectively
- **Must be completely absent from production builds** — use `import.meta.env.DEV` conditional rendering (tree-shaken by Vite)

Also add a dev toggle on the Dashboard page itself (so you can log out from dashboard):
```tsx
{import.meta.env.DEV && <DevAuthToggle />}
```

**Guardrails (DO NOT):**
- DO NOT re-check `hasCheckedInToday()` reactively — use `useRef` to prevent midnight rollover re-trigger
- DO NOT use `<Navigate>` for dashboard rendering — it's a conditional render, not a redirect
- DO NOT show the dev toggle in production — `import.meta.env.DEV` only
- DO NOT show the dev toggle via CSS hiding — it must be tree-shaken out entirely

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Dashboard — shows MoodCheckIn when not checked in today` | integration | No mood entries → MoodCheckIn rendered |
| `Dashboard — shows dashboard content when already checked in` | integration | Pre-set today's mood entry → hero + widgets visible |
| `Dashboard — transitions from check-in to dashboard` | integration | Complete check-in → dashboard content appears |
| `Dashboard — skip check-in shows dashboard` | integration | Click "Not right now" → dashboard content appears |
| `Dashboard — does not re-show check-in on same day` | integration | Skip → navigate away → return → dashboard shown (not check-in) |
| `Dashboard — has skip-to-content link` | unit | `a[href="#main-content"]` exists with sr-only |
| `Dashboard — uses Navbar transparent` | unit | Navbar has `transparent` styling |
| `Dashboard — has dark background` | unit | Root element has `bg-[#0f0a1e]` |
| `DevAuthToggle — visible in dev mode` | unit | When `import.meta.env.DEV` is true, button renders |
| `DevAuthToggle — Simulate Login triggers login` | unit | Click → `isAuthenticated` becomes true |
| `DevAuthToggle — Simulate Logout triggers logout` | unit | Click → `isAuthenticated` becomes false |
| `DevAuthToggle — logout preserves wr_ data` | unit | Set mood entries, logout → entries still in localStorage |

**Expected state after completion:**
- [x] Full dashboard page assembled with hero + widget grid
- [x] MoodCheckIn shows on first visit, then dashboard
- [x] Dev toggle works on both landing and dashboard pages
- [x] `animate-fade-in` entrance, respects `prefers-reduced-motion`
- [x] All integration tests pass

---

### Step 8: Accessibility & Polish Pass

**Objective:** Ensure all accessibility requirements are met and add animation polish.

**Files to create/modify:**
- `frontend/src/components/dashboard/DashboardCard.tsx` — **Modify**: Verify ARIA attributes
- `frontend/src/components/dashboard/DashboardHero.tsx` — **Modify**: Add any missing ARIA
- `frontend/src/components/dashboard/QuickActions.tsx` — **Modify**: Verify accessible labels
- `frontend/src/components/Navbar.tsx` — **Modify**: Verify avatar dropdown ARIA
- `frontend/src/pages/Dashboard.tsx` — **Modify**: Verify landmark structure

**Details:**

**Accessibility checklist:**
- [ ] Dashboard page uses `<main>` landmark with `id="main-content"`
- [ ] Each `DashboardCard` uses `<section aria-labelledby={titleId}>`
- [ ] Collapse toggle: `aria-expanded={!collapsed}`, `aria-controls={contentId}`
- [ ] Content panel: `id={contentId}`, `role="region"`, `aria-labelledby={titleId}`
- [ ] Quick Action links have clear accessible names (icon is `aria-hidden`, text provides name)
- [ ] Avatar dropdown trigger: `aria-haspopup="menu"`, `aria-expanded`
- [ ] Avatar dropdown menu: `role="menu"` with `role="menuitem"` on items
- [ ] Bell icon: `aria-label="Notifications"` (or "Notifications, no unread" when count is 0)
- [ ] All interactive elements have visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`)
- [ ] Skip-to-content link present
- [ ] `prefers-reduced-motion`: `motion-reduce:` prefix on all transition/animation classes

**Animation polish:**
- Dashboard entrance: `animate-fade-in` (existing 500ms animation) with `motion-reduce:animate-none`
- Card collapse: CSS grid-template-rows transition (`transition-[grid-template-rows] duration-200 ease-in-out`)
- Quick Action hover: `hover:scale-[1.02] motion-reduce:hover:scale-100 transition-transform duration-200`
- Avatar dropdown: `animate-dropdown-in` (existing 150ms animation)

**Guardrails (DO NOT):**
- DO NOT use `outline-none` without a visible replacement
- DO NOT use `aria-label` where visible text already provides an accessible name
- DO NOT skip `motion-reduce:` prefixes on animations

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Accessibility — Dashboard has main landmark` | unit | `<main>` with `id="main-content"` exists |
| `Accessibility — Cards use section with aria-labelledby` | unit | Each card is a `<section>` with matching title |
| `Accessibility — Collapse toggle has aria-expanded` | unit | Button has `aria-expanded="true"` or `"false"` |
| `Accessibility — Avatar dropdown has aria-haspopup` | unit | Avatar button has `aria-haspopup="menu"` |
| `Accessibility — Skip-to-content link exists` | unit | `a` with `href="#main-content"` and `sr-only` |
| `Accessibility — All buttons have accessible names` | unit | No buttons without text or `aria-label` |

**Expected state after completion:**
- [x] All ARIA attributes correctly applied
- [x] Full keyboard navigation works (Tab, Enter, Escape, Arrow keys for dropdown)
- [x] `prefers-reduced-motion` respected everywhere
- [x] Focus rings visible on all interactive elements
- [x] Accessibility tests pass

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | AuthProvider context & useAuth replacement |
| 2 | 1 | Route switching (conditional `/` route) |
| 3 | 2 | Dashboard hero section |
| 4 | 2 | DashboardCard component & widget grid |
| 5 | 4 | Quick Actions card (fills one widget slot) |
| 6 | 1 | Navbar logged-in state (global) |
| 7 | 1, 2, 3, 4, 5, 6 | Dashboard page assembly & mood check-in integration |
| 8 | 7 | Accessibility & polish pass |

**Parallelizable:** Steps 3, 4, and 6 can be developed in parallel after Step 2, but must all be complete before Step 7.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | AuthProvider Context & useAuth Replacement | [COMPLETE] | 2026-03-16 | Created `contexts/AuthContext.tsx`, replaced `hooks/useAuth.ts` with re-export, wrapped App.tsx with AuthProvider. Bulk renamed `isLoggedIn` → `isAuthenticated` across 76 source files. Updated `user.firstName` → `user.name` in DailyHub.tsx and PrayerWall.tsx. Added `vi.mock('@/hooks/useAuth')` to 13 test files that lacked it. All 1033 tests pass. |
| 2 | Route Switching | [COMPLETE] | 2026-03-16 | Created `pages/Dashboard.tsx` skeleton. Added `RootRoute` component in App.tsx for conditional `/` rendering. Dashboard + Home tests pass. |
| 3 | Dashboard Hero Section | [COMPLETE] | 2026-03-16 | Created `DashboardHero.tsx` with time-of-day greeting, placeholder streak/level, progress bar. Updated `Dashboard.tsx` to use hero. 7 tests pass. |
| 4 | DashboardCard Component & Widget Grid | [COMPLETE] | 2026-03-16 | Created `DashboardCard.tsx` with collapse/expand, localStorage persistence, ARIA. Created `DashboardWidgetGrid.tsx` with 4 placeholder cards in 5-column grid. Removed duplicate `role="region"` from content div (section already provides it). 10 tests pass. |
| 5 | Quick Actions Card | [COMPLETE] | 2026-03-16 | Created `QuickActions.tsx` with 4 navigation links (Pray, Journal, Meditate, Music). Added to DashboardWidgetGrid as 5th card spanning full width. 6 tests pass. |
| 6 | Navbar Logged-In State (Global) | [COMPLETE] | 2026-03-16 | Added `DesktopUserActions` (bell + avatar + dropdown with 8 menu items + Log Out). Updated `MobileDrawer` with dark theme, avatar, logged-in nav items, Log Out. Conditional rendering via `useAuth()`. 43 Navbar tests pass (16 new). |
| 7 | Dashboard Page Assembly & Mood Check-In Integration | [COMPLETE] | 2026-03-16 | Full Dashboard assembly with MoodCheckIn conditional rendering, skip-to-content link, animate-fade-in. DevAuthToggle added to both Home.tsx and Dashboard.tsx (dev-only). 7 tests pass. |
| 8 | Accessibility & Polish Pass | [COMPLETE] | 2026-03-16 | Added `aria-controls` + `id` on avatar dropdown. Removed redundant `aria-label` on faith points. Added `aria-valuetext` on progress bar. Fixed 3 more test files missing `useAuth` mock (Insights, SharedVerse, PrayerWallDashboard). Fixed PrayerWallDashboard mock user shape. 6 accessibility tests + full 1085 test suite passes. |
