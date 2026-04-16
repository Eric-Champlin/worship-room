# Implementation Plan: Personal Prayer List

**Spec:** `_specs/personal-prayer-list.md`
**Date:** 2026-03-20
**Branch:** `claude/feature/personal-prayer-list`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Pages: `frontend/src/pages/` — e.g., `PrayerWall.tsx`, `Dashboard.tsx`
- Components: `frontend/src/components/` — organized by feature (e.g., `prayer-wall/`, `dashboard/`, `daily/`)
- Types: `frontend/src/types/` — e.g., `prayer-wall.ts`, `daily-experience.ts`
- Services: `frontend/src/services/storage-service.ts` — `LocalStorageService` singleton with `readJSON`/`writeJSON` helpers
- Hooks: `frontend/src/hooks/` — e.g., `useAuth.ts` (re-exports from `AuthContext`)
- Constants: `frontend/src/constants/` — e.g., `crisis-resources.ts`, `prayer-categories.ts`
- Lib: `frontend/src/lib/` — `time.ts` (`timeAgo()`, `formatFullDate()`), `utils.ts` (`cn()`)
- Tests: Co-located `__tests__/` directories alongside components

### Routing Pattern

Routes defined in `frontend/src/App.tsx`. Provider hierarchy:
```
QueryClientProvider → BrowserRouter → AuthProvider → ToastProvider → AuthModalProvider → AudioProvider → Routes
```

Protected routes use component-level auth checks — the component reads `isAuthenticated` from `useAuth()` and either redirects or shows auth modal. Example: `RootRoute` renders `<Dashboard />` or `<Home />` based on auth state. Meditation sub-pages use `<Navigate to="/daily?tab=meditate" />` when logged out.

### Auth Pattern

`AuthProvider` (in `contexts/AuthContext.tsx`) manages simulated auth via localStorage keys `wr_auth_simulated`, `wr_user_name`, `wr_user_id`. Exposes `{ isAuthenticated, user: { name, id }, login(), logout() }` via `useAuth()` hook. `logout()` clears auth state but preserves all user data.

### Storage Service Pattern

`LocalStorageService` in `services/storage-service.ts`:
- `readJSON<T>(key, fallback)` — try/catch JSON parse with fallback
- `writeJSON(key, value)` — JSON stringify with `QuotaExceededError` handling
- Auth gating: `_isAuthenticated` flag, `requireAuth()` guard method
- Keys defined in `KEYS` const object with `wr_` prefix

### Prayer Wall Card Pattern

`PrayerCard.tsx`: `<article className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md">` with header (avatar, name, date, category badge), content (truncation with Show more/less), children slot for actions.

### InlineComposer Pattern

`InlineComposer.tsx`: Slide animation via `overflow-hidden transition-all duration-300 ease-in-out` toggling between `max-h-0 opacity-0 invisible` and `max-h-[800px] opacity-100 visible`. Contains textarea, category pills (horizontal scroll mobile, wrap desktop), char counter, submit/cancel buttons.

### Category System

Categories defined in `constants/prayer-categories.ts`: `PRAYER_CATEGORIES` array (8 values) + `CATEGORY_LABELS` mapping + `PrayerCategory` type. Category badge: `<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">`.

### Category Filter Bar Pattern

`CategoryFilterBar.tsx` on Prayer Wall: `role="toolbar"` with `aria-label`, pills with `aria-pressed`, counts in parentheses. Dark-themed (`bg-hero-mid/90`). This feature needs a light-themed variant.

### CrisisBanner Pattern

`CrisisBanner.tsx`: Takes `text` prop, returns `null` if no crisis keywords detected. Renders `role="alert" aria-live="assertive"` banner with crisis resources. Used in `PrayTabContent`, `JournalTabContent`, `InlineComposer`.

### DeletePrayerDialog Pattern

`DeletePrayerDialog.tsx`: `role="alertdialog" aria-modal="true"` with `useFocusTrap()`. Overlay: `fixed inset-0 z-50 bg-black/50`. Dialog: `mx-4 w-full max-w-sm rounded-xl bg-white p-6`. Body overflow locked when open.

### Toast System

`useToast()` from `ToastProvider`. `showToast(message, type)` — types: `'success'`, `'error'`.

### PageHero Component

`PageHero.tsx`: Props `{ title, subtitle?, showDivider?, children? }`. Uses inner page hero gradient. Title: `font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl`. Subtitle: `text-base text-white/85 sm:text-lg lg:text-xl`.

### Navbar Structure

`Navbar.tsx`: `AVATAR_MENU_LINKS` array defines avatar dropdown items. Mobile drawer uses same logical items. Menu item styling: `flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white`.

### Test Patterns

vitest + React Testing Library + `@testing-library/user-event`. Helper `render*()` functions wrapping in `<MemoryRouter>` (with `future` flags). Auth tests: set `localStorage.setItem('wr_auth_simulated', 'true')` in `beforeEach`. Provider wrapping: `AuthProvider → ToastProvider` when needed.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Visit `/my-prayers` | Redirect to `/` when logged out | Step 2 | `useAuth()` + `<Navigate to="/" />` |
| View prayer list | Only for authenticated users | Step 2 | Component renders nothing if not auth'd |
| Add prayer | Logged-in only | Step 5 | Page already auth-gated (redirect) |
| Edit prayer | Logged-in only | Step 6 | Page already auth-gated |
| Delete prayer | Logged-in only | Step 6 | Page already auth-gated |
| Mark answered | Logged-in only | Step 6 | Page already auth-gated |
| Pray for this | Logged-in only | Step 6 | Page already auth-gated |
| Navbar link visible | Only when `isAuthenticated` | Step 3 | Conditional render in `Navbar.tsx` |
| localStorage reads/writes | No-op when not authenticated | Step 1 | Storage service auth guard |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| PageHero | background | Inner page gradient (via `PageHero` component) | design-system.md |
| PageHero title | font | Caveat 72px/48px bold white | design-system.md |
| PageHero subtitle | font | Inter 18px 400 white/85 | design-system.md |
| Content area | background | `#F5F5F5` (`bg-neutral-bg`) | design-system.md |
| Content max-width | width | 720px (`max-w-3xl`) | design-system.md / spec |
| Prayer card | classes | `rounded-xl border border-gray-200 bg-white p-6` | design-system.md |
| Prayer card hover | shadow | `lg:hover:shadow-md` | design-system.md |
| Category badge | classes | `rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500` | design-system.md |
| Primary CTA button | classes | `bg-primary text-white font-semibold py-3 px-8 rounded-lg` | design-system.md |
| Filter pill (selected) | classes | `bg-primary text-white rounded-full` | spec |
| Filter pill (unselected) | classes | `bg-white border border-gray-200 text-text-dark rounded-full` | spec |
| Chip/pill padding | padding | `py-2 px-4` with `min-h-[44px]` | design-system.md |
| Success color | hex | `#27AE60` / `text-success` / `border-success` | design-system.md |
| Warning color | hex | `#F39C12` / `text-warning` | design-system.md |
| Danger color | hex | `#E74C3C` / `text-danger` / `bg-danger` | design-system.md |
| Delete dialog | classes | `mx-4 w-full max-w-sm rounded-xl bg-white p-6` | codebase: `DeletePrayerDialog.tsx` |
| Answered badge | color | `text-success` with `CheckCircle` icon | spec + design-system.md |
| Testimony text | font | Lora italic (journal-like quality) | spec |

---

## Design System Reminder

- Worship Room uses **Caveat** for script/highlighted headings (hero titles), not Lora
- **Lora** is used for scripture text and journal prompts (italic)
- All inner pages fade hero gradient to `#F5F5F5` (neutral-bg), not `#EDE9FE`
- Prayer Wall uses `max-w-3xl` (720px) for content — this page matches
- Category pills use `aria-pressed` for toggle state
- All interactive elements need `min-h-[44px]` for 44px touch targets
- CrisisBanner uses `role="alert" aria-live="assertive"` — safety-critical
- Animations respect `prefers-reduced-motion` via media query checks
- Card text uses `whitespace-pre-wrap` to preserve line breaks
- Delete dialogs use `role="alertdialog"` with `useFocusTrap()`

---

## Shared Data Models

```typescript
// New types for this spec
export interface PersonalPrayer {
  id: string                    // UUID via crypto.randomUUID()
  title: string                 // required, max 100 chars
  description: string           // optional, max 1000 chars
  category: PrayerCategory      // reuses existing PrayerCategory type
  status: 'active' | 'answered'
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
  answeredAt: string | null     // set when marked answered
  answeredNote: string | null   // testimony text, max 500 chars
  lastPrayedAt: string | null   // set when "Pray for this" tapped
}

export type PrayerListFilter = 'all' | 'active' | 'answered'
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_prayer_list` | Both | Array of `PersonalPrayer` items (max 200) |
| `wr_auth_simulated` | Read | Check auth state (existing) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Full-width cards with `px-4`, card actions in 3-dot overflow menu, category pills horizontally scrollable, sticky bar below mobile navbar |
| Tablet | 640–1024px | Cards at 720px max-width centered, card actions inline, pills may wrap |
| Desktop | > 1024px | Cards at 720px max-width centered, card actions inline with hover states, pills wrap naturally, hover shadow on cards |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → action bar | 0px (action bar directly below) | spec |
| Action bar → first card | 16px (`pt-4` or `space-y-4`) | codebase inspection (Prayer Wall) |
| Card → card | 16px (`space-y-4`) | codebase inspection (Prayer Wall) |
| Last card → footer | 48px+ (standard page bottom padding) | codebase inspection |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is finalized and approved
- [x] `PageHero` component exists and is reusable
- [x] `CrisisBanner` component exists with `containsCrisisKeyword()` function
- [x] `PRAYER_CATEGORIES` and `PrayerCategory` type exist in `constants/prayer-categories.ts`
- [x] `timeAgo()` and `formatFullDate()` exist in `lib/time.ts`
- [x] `useFocusTrap()` hook exists for dialog focus management
- [x] `useAuth()` hook returns `{ isAuthenticated, user, login, logout }`
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified from reference
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior specs in the sequence are complete (this is Spec 18, first in a 2-spec sequence — no dependencies)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to put storage logic | Dedicated `prayerListStorage.ts` file with pure functions, same pattern as `storage-service.ts` helpers | Spec says "Storage service follows the same pattern" — keeping it modular avoids bloating the existing storage service |
| Category type reuse | Reuse `PrayerCategory` from `constants/prayer-categories.ts` | Spec says "same categories as Prayer Wall" |
| Sort order | Active first (by `createdAt` desc), then answered (by `createdAt` desc) | Spec requirement |
| Default filter | "Active" not "All" | Spec: "The 'Active' filter is selected by default" |
| Max prayers limit (200) | Check count before add, show message if at limit | Spec requirement — no auto-archiving |
| Testimony text font | Lora italic | Spec says "journal-like quality" |
| Mobile action buttons | 3-dot overflow menu below 640px | Spec requirement |
| Pray glow animation | CSS transition on card with primary color at low opacity, 1s duration | Spec: "approximately 1 second" |
| Sticky action bar offset | Dynamic based on navbar height (~56px mobile, ~94px desktop) | Spec says "sticks below navbar" — use `top` value matching navbar |

---

## Implementation Steps

### Step 1: Types & Storage Service

**Objective:** Define the `PersonalPrayer` type and create localStorage CRUD functions.

**Files to create:**
- `frontend/src/types/personal-prayer.ts` — Type definitions
- `frontend/src/services/prayer-list-storage.ts` — Storage CRUD functions

**Details:**

`types/personal-prayer.ts`:
```typescript
import type { PrayerCategory } from '@/constants/prayer-categories'

export interface PersonalPrayer {
  id: string
  title: string
  description: string
  category: PrayerCategory
  status: 'active' | 'answered'
  createdAt: string
  updatedAt: string
  answeredAt: string | null
  answeredNote: string | null
  lastPrayedAt: string | null
}

export type PrayerListFilter = 'all' | 'active' | 'answered'
```

`services/prayer-list-storage.ts`:
- `PRAYER_LIST_KEY = 'wr_prayer_list'`
- `MAX_PRAYERS = 200`
- `getPrayers(): PersonalPrayer[]` — read with try/catch fallback to `[]`
- `addPrayer(prayer: Omit<PersonalPrayer, 'id' | 'createdAt' | 'updatedAt' | 'answeredAt' | 'answeredNote' | 'lastPrayedAt'>): PersonalPrayer | null` — returns null if at max limit. Generates UUID, timestamps.
- `updatePrayer(id: string, updates: Partial<Pick<PersonalPrayer, 'title' | 'description' | 'category'>>): void` — sets `updatedAt`
- `deletePrayer(id: string): void`
- `markAnswered(id: string, answeredNote?: string): void` — sets `status`, `answeredAt`, `answeredNote`
- `markPrayed(id: string): void` — sets `lastPrayedAt`
- `getPrayerCounts(): { all: number; active: number; answered: number }`

Follow the `readJSON`/`writeJSON` pattern from `storage-service.ts`. Use pure functions (no class needed — this is a simpler service than the music storage).

**Guardrails (DO NOT):**
- DO NOT store auth state in this service — the page-level auth redirect handles access control
- DO NOT use `new Date().toISOString().split('T')[0]` — use full ISO timestamps
- DO NOT mutate arrays in place — always spread/filter into new arrays

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getPrayers returns empty array when key missing` | unit | Verify fallback behavior |
| `getPrayers returns empty array on corrupted JSON` | unit | Verify try/catch recovery |
| `addPrayer creates prayer with UUID and timestamps` | unit | Verify ID generation and timestamp fields |
| `addPrayer returns null when at 200 limit` | unit | Verify max limit enforcement |
| `updatePrayer updates fields and updatedAt` | unit | Verify partial update |
| `deletePrayer removes prayer by ID` | unit | Verify removal |
| `markAnswered sets status, answeredAt, answeredNote` | unit | Verify answered state |
| `markPrayed updates lastPrayedAt` | unit | Verify pray tracking |
| `getPrayerCounts returns correct counts` | unit | Verify count computation |

**Expected state after completion:**
- [ ] `PersonalPrayer` type is defined and exported
- [ ] Storage service has full CRUD with max limit enforcement
- [ ] All unit tests pass
- [ ] No imports from components (pure data layer)

---

### Step 2: Page Shell, Route & Auth Gating

**Objective:** Create the `/my-prayers` page skeleton with auth-gated routing, PageHero, and neutral content area.

**Files to create:**
- `frontend/src/pages/MyPrayers.tsx` — Page component

**Files to modify:**
- `frontend/src/App.tsx` — Add route

**Details:**

`pages/MyPrayers.tsx`:
- Import `useAuth()` from `@/hooks/useAuth`
- If `!isAuthenticated`, return `<Navigate to="/" replace />`
- Render `<Layout>` wrapper (Navbar + Footer)
- Render `<PageHero title="My Prayers" subtitle="Your personal conversation with God." />`
- Below hero: `<main className="min-h-[50vh] bg-neutral-bg px-4 py-8">` with `<div className="mx-auto max-w-3xl">`
- Content area will be populated in later steps — for now render a placeholder or empty state

`App.tsx`:
- Add `<Route path="/my-prayers" element={<MyPrayers />} />` alongside other routes
- Import `MyPrayers` from `@/pages/MyPrayers`

**Auth gating:**
- Route-level redirect: `const { isAuthenticated } = useAuth(); if (!isAuthenticated) return <Navigate to="/" replace />`
- This mirrors the meditation sub-page pattern (redirect when logged out)

**Responsive behavior:**
- Desktop (1440px): Content area at 720px max-width centered
- Tablet (768px): Same, with auto margins
- Mobile (375px): Full width with `px-4` padding

**Guardrails (DO NOT):**
- DO NOT use `useAuthModal()` — this page redirects, not modals
- DO NOT render any content for logged-out users
- DO NOT add Layout wrapper if PageHero already includes it — check PageHero usage in Prayer Wall first

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `redirects to / when not authenticated` | integration | Verify `<Navigate>` fires |
| `renders PageHero with correct title and subtitle` | integration | Verify hero content |
| `renders content area with neutral background` | integration | Verify layout structure |

**Expected state after completion:**
- [ ] `/my-prayers` route is accessible
- [ ] Logged-out users are redirected to `/`
- [ ] Logged-in users see the hero and content area
- [ ] Page is wrapped in Layout (Navbar + Footer)

---

### Step 3: Navbar Integration

**Objective:** Add "My Prayers" link to the avatar dropdown and mobile drawer for logged-in users.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Add menu item

**Details:**

Add to `AVATAR_MENU_LINKS` array, after the `'My Prayer Requests'` entry:
```typescript
{ label: 'My Prayers', to: '/my-prayers' },
```

This places "My Prayers" near the existing "My Prayer Requests" (Prayer Wall dashboard) since they're both prayer-related.

The mobile drawer uses the same `AVATAR_MENU_LINKS` array or a similar `MOBILE_DRAWER_EXTRA_LINKS` — add the same entry there.

The link only renders when `isAuthenticated` is true — this is already handled by the Navbar's conditional rendering of the avatar dropdown / logged-in mobile drawer sections.

**Responsive behavior:**
- Desktop: Link appears in avatar dropdown panel
- Mobile: Link appears in mobile drawer under the personal links section

**Guardrails (DO NOT):**
- DO NOT add this link to the public nav links (Daily Hub, Prayer Wall, Music)
- DO NOT change the link styling — use existing menu item classes
- DO NOT add an icon — existing menu items are text-only links

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `"My Prayers" link appears in avatar dropdown when logged in` | integration | Verify link presence |
| `"My Prayers" link not present when logged out` | integration | Verify absence |
| `"My Prayers" link navigates to /my-prayers` | integration | Verify href |
| `"My Prayers" link appears in mobile drawer when logged in` | integration | Verify mobile menu |

**Expected state after completion:**
- [ ] "My Prayers" appears in avatar dropdown for logged-in users
- [ ] "My Prayers" appears in mobile drawer for logged-in users
- [ ] Link navigates to `/my-prayers`
- [ ] Link is not visible for logged-out users

---

### Step 4: Prayer Card Component

**Objective:** Create the prayer card component for displaying individual prayers with title, description (truncation), category badge, timestamp, and "prayed" indicator.

**Files to create:**
- `frontend/src/components/my-prayers/PrayerItemCard.tsx` — Card component

**Details:**

Follow the Prayer Wall `PrayerCard.tsx` pattern (lines in `components/prayer-wall/PrayerCard.tsx`).

Card structure:
```tsx
<article
  className={cn(
    'rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md',
    prayer.status === 'answered' && 'border-l-4 border-l-success',
  )}
>
```

Card content:
1. **Header row**: Title (bold, `text-lg font-semibold text-text-dark`) + category badge + relative timestamp
2. **Description**: Truncated to 2 lines with CSS `line-clamp-2` and "Show more"/"Show less" toggle button
3. **"Prayed" indicator**: If `lastPrayedAt` is set, show `<p className="text-xs text-text-light">Prayed {timeAgo(prayer.lastPrayedAt)}</p>`
4. **Answered section** (when `status === 'answered'`):
   - `<div>` with CheckCircle icon (`text-success`) + "Answered" text + `formatFullDate(prayer.answeredAt)`
   - Testimony note (if present): `<p className="font-serif italic text-text-light">` (Lora italic)
5. **Actions slot**: `children` prop for action buttons (populated in Step 6)

Props interface:
```typescript
interface PrayerItemCardProps {
  prayer: PersonalPrayer
  children?: ReactNode  // Action buttons
  glowing?: boolean     // For "Pray for this" glow effect
}
```

Glow effect: When `glowing` is true, apply `ring-2 ring-primary/30 bg-primary/5` with CSS transition. The parent manages the `glowing` state (set true for 1s, then false).

**Responsive behavior:**
- Desktop (1440px): Card at full container width (720px max), hover shadow
- Tablet (768px): Same layout
- Mobile (375px): Full width with reduced padding

**Guardrails (DO NOT):**
- DO NOT include avatar/author info — these are personal prayers, no author display needed
- DO NOT use `dangerouslySetInnerHTML` for any text content
- DO NOT add action buttons directly — use `children` prop for composability

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders prayer title and category badge` | unit | Verify basic display |
| `truncates long description with "Show more" button` | unit | Verify 2-line truncation |
| `"Show more" expands full description` | unit | Verify toggle |
| `shows "Prayed" indicator when lastPrayedAt is set` | unit | Verify prayed display |
| `does not show "Prayed" indicator when lastPrayedAt is null` | unit | Verify absence |
| `shows answered badge with date for answered prayers` | unit | Verify answered display |
| `shows testimony note in italic when present` | unit | Verify testimony |
| `applies green left border for answered prayers` | unit | Verify CSS class |
| `applies glow effect when glowing prop is true` | unit | Verify glow classes |
| `renders children (action buttons)` | unit | Verify children slot |

**Expected state after completion:**
- [ ] Prayer cards display correctly with all fields
- [ ] Description truncation works with toggle
- [ ] Answered prayers have distinct visual treatment (green border, badge, testimony)
- [ ] Glow effect applies via prop
- [ ] All tests pass

---

### Step 5: Action Bar, Filtering & Inline Composer

**Objective:** Build the sticky action bar with filter pills and "Add Prayer" button, client-side filtering logic, and the inline composer for adding new prayers.

**Files to create:**
- `frontend/src/components/my-prayers/PrayerListActionBar.tsx` — Action bar with filters
- `frontend/src/components/my-prayers/PrayerComposer.tsx` — Inline add prayer form

**Details:**

**PrayerListActionBar:**
```tsx
interface PrayerListActionBarProps {
  filter: PrayerListFilter
  onFilterChange: (filter: PrayerListFilter) => void
  counts: { all: number; active: number; answered: number }
  onAddPrayer: () => void
}
```

Layout:
- Container: `bg-white border-b border-gray-200 py-3 px-4` (light background variant of Prayer Wall filter bar)
- Inner: `mx-auto max-w-3xl flex items-center gap-3`
- Left: "Add Prayer" button — `bg-primary text-white font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2` with `Plus` icon from Lucide (20px)
- Right: Filter pills — "All (N)", "Active (N)", "Answered (N)"
- Selected pill: `bg-primary text-white rounded-full px-4 py-2 text-sm font-medium min-h-[44px]`
- Unselected pill: `bg-white border border-gray-200 text-text-dark rounded-full px-4 py-2 text-sm font-medium min-h-[44px] hover:bg-gray-50`
- Pills use `role="radiogroup"` with `aria-label="Filter prayers"`, each pill uses `role="radio"` with `aria-checked`

Sticky behavior:
- Use `sticky top-[56px] sm:top-[94px] z-30` (navbar heights from design system)
- [UNVERIFIED] Sticky offset values (56px mobile, 94px desktop) — these match the navbar heights from the design system recon nav section (94px computed height)
  - To verify: Run `/verify-with-playwright` and check actual navbar heights at each breakpoint
  - If wrong: Update the `top-[]` values to match actual navbar height

**PrayerComposer:**

Follow `InlineComposer.tsx` pattern from Prayer Wall.

```tsx
interface PrayerComposerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, description: string, category: PrayerCategory) => void
}
```

- Slide animation: `overflow-hidden transition-all duration-300 ease-in-out`, toggle `max-h-0 opacity-0 invisible` ↔ `max-h-[800px] opacity-100 visible`
- Container: `rounded-xl border border-gray-200 bg-white p-5 sm:p-6 mb-4`
- Title input: `<input type="text" maxLength={100} placeholder="What do you want to pray about?" className="w-full rounded-lg border border-gray-200 p-3 text-base text-text-dark focus-visible:ring-2 focus-visible:ring-primary" />`
- Character counter for title: shown when > 80 chars, `text-xs text-text-light`
- Description textarea: `<textarea maxLength={1000} placeholder="Add details..." className="w-full resize-none rounded-lg border border-gray-200 p-3 text-base text-text-dark focus-visible:ring-2 focus-visible:ring-primary" style={{ minHeight: '100px' }} />`
- Character counter for description: shown when > 800 chars
- Category pills: reuse exact pattern from `InlineComposer.tsx` — `fieldset` with `legend`, pills with `aria-pressed`, selected: `border-primary/40 bg-primary/10 text-primary`, unselected: `border-gray-200 bg-white text-text-dark hover:bg-gray-50`. Mobile: `flex flex-nowrap gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible`
- Validation messages (shown on submit attempt):
  - Missing title: `<p className="text-sm text-warning" role="alert">Please add a title</p>`
  - Missing category: `<p className="text-sm text-warning" role="alert">Please choose a category</p>`
- "Save Prayer" button: `bg-primary text-white font-semibold py-3 px-8 rounded-lg` — disabled with `opacity-50 cursor-not-allowed` until title and category are set
- "Cancel" button: `text-sm font-medium text-text-light hover:text-text-dark`
- `CrisisBanner` below title and description inputs: `<CrisisBanner text={title + ' ' + description} />`
- Auto-reset state on save: clear title, description, category, validation errors
- On save: call `addPrayer()` from storage service, if returns null (at limit) show toast: "You've reached the 200 prayer limit. Consider archiving answered prayers to make room."

**Responsive behavior:**
- Desktop: Action bar has button on left, pills in a row on right
- Tablet: Same layout
- Mobile (< 640px): If space is tight, stack (button above, pills below). Filter pills horizontally scrollable with `overflow-x-auto` and hidden scrollbar. Composer full width, category pills scroll horizontally.

**Guardrails (DO NOT):**
- DO NOT use the dark-themed filter bar from Prayer Wall — this page has a light content area
- DO NOT skip crisis detection on any text input
- DO NOT allow submit with empty title or no category
- DO NOT forget `aria-pressed` on category pills and `aria-checked` on filter pills

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders "Add Prayer" button with Plus icon` | unit | Verify button |
| `renders filter pills with correct counts` | unit | Verify counts |
| `"Active" filter is selected by default` | unit | Verify default state |
| `clicking a filter pill calls onFilterChange` | unit | Verify callback |
| `action bar has correct ARIA roles` | unit | Verify radiogroup/radio |
| `composer opens with slide animation classes` | unit | Verify animation toggle |
| `title input enforces maxLength 100` | unit | Verify constraint |
| `description textarea enforces maxLength 1000` | unit | Verify constraint |
| `character counter appears at 80+ chars for title` | unit | Verify threshold |
| `character counter appears at 800+ chars for description` | unit | Verify threshold |
| `"Save Prayer" disabled when title empty` | unit | Verify disabled state |
| `"Save Prayer" disabled when no category selected` | unit | Verify disabled state |
| `shows "Please add a title" validation on empty submit` | unit | Verify validation |
| `shows "Please choose a category" validation on empty submit` | unit | Verify validation |
| `CrisisBanner appears when crisis keywords typed` | unit | Verify crisis detection |
| `successful save calls onSave with correct data` | unit | Verify callback args |
| `composer resets fields after save` | unit | Verify reset |
| `Cancel collapses the composer` | unit | Verify close |
| `category pills have aria-pressed` | unit | Verify a11y |

**Expected state after completion:**
- [ ] Action bar renders with button and filter pills
- [ ] Sticky behavior works below navbar
- [ ] Composer slides open/close with animation
- [ ] All form validation works (title required, category required, char limits)
- [ ] Crisis detection active on text inputs
- [ ] All tests pass

---

### Step 6: Card Actions (Pray, Edit, Mark Answered, Delete) & Mobile Overflow

**Objective:** Implement all card action interactions: "Pray for this" glow, inline edit mode, "Mark Answered" form, delete confirmation, and mobile overflow menu.

**Files to create:**
- `frontend/src/components/my-prayers/PrayerCardActions.tsx` — Desktop action buttons
- `frontend/src/components/my-prayers/PrayerCardOverflowMenu.tsx` — Mobile 3-dot menu
- `frontend/src/components/my-prayers/EditPrayerForm.tsx` — Inline edit form
- `frontend/src/components/my-prayers/MarkAnsweredForm.tsx` — Mark answered inline form
- `frontend/src/components/my-prayers/DeletePrayerDialog.tsx` — Delete confirmation dialog

**Details:**

**PrayerCardActions (desktop — hidden below sm breakpoint):**
```tsx
interface PrayerCardActionsProps {
  prayer: PersonalPrayer
  onPray: () => void
  onEdit: () => void
  onMarkAnswered: () => void
  onDelete: () => void
}
```
- Layout: `flex items-center gap-2` row of icon buttons
- "Pray for this": `HandHeart` or `Heart` icon button, `text-primary hover:text-primary-lt`, with tooltip
- "Edit": `Pencil` icon button, `text-text-light hover:text-text-dark`
- "Mark Answered" (active only): `CheckCircle` icon + text button, `text-success hover:text-green-700`
- "Delete": `Trash2` icon button, `text-text-light hover:text-danger`
- All buttons: `min-h-[44px] min-w-[44px]` for touch targets
- Hidden on mobile: `hidden sm:flex`

**PrayerCardOverflowMenu (mobile — visible below sm breakpoint):**
```tsx
interface PrayerCardOverflowMenuProps {
  prayer: PersonalPrayer
  onPray: () => void
  onEdit: () => void
  onMarkAnswered: () => void
  onDelete: () => void
}
```
- Trigger: `MoreVertical` (3-dot) icon button, `sm:hidden`
- Dropdown: `absolute right-0 top-full mt-1 w-48 rounded-xl bg-hero-mid border border-white/15 shadow-lg z-20 animate-dropdown-in`
- Items: `flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10`
- "Pray for this", "Edit", "Mark Answered" (if active), "Delete" (with `text-danger` coloring)
- Click outside closes menu
- Follow existing `animate-dropdown-in` pattern

**EditPrayerForm:**
```tsx
interface EditPrayerFormProps {
  prayer: PersonalPrayer
  onSave: (updates: { title: string; description: string; category: PrayerCategory }) => void
  onCancel: () => void
}
```
- Renders inline replacing the card content (managed by parent state `editingId`)
- Pre-filled title input, description textarea, category pills
- Same validation as composer (title required, category required, char limits)
- `CrisisBanner` on title + description
- "Save" and "Cancel" buttons
- On save: calls `updatePrayer()` from storage service

**MarkAnsweredForm:**
```tsx
interface MarkAnsweredFormProps {
  onConfirm: (answeredNote: string) => void
  onCancel: () => void
}
```
- Follow `MarkAsAnsweredForm.tsx` pattern from Prayer Wall
- Renders inline below the card content (managed by parent state `answeringId`)
- Container: `rounded-lg border border-gray-200 bg-gray-50 p-4 mt-3`
- Optional testimony textarea: `placeholder="What happened?" maxLength={500}`, char counter at 400+
- `CrisisBanner` on testimony text
- "Confirm" and "Cancel" buttons
- On confirm: calls `markAnswered()` from storage service

**DeletePrayerDialog:**
- Follow `DeletePrayerDialog.tsx` pattern from Prayer Wall exactly
- `role="alertdialog" aria-modal="true"` with `useFocusTrap()`
- Overlay: `fixed inset-0 z-50 bg-black/50`
- Dialog: `mx-4 w-full max-w-sm rounded-xl bg-white p-6`
- Title: "Remove this prayer?"
- Description: "This cannot be undone."
- "Remove" button: `bg-danger text-white rounded-lg px-4 py-2 text-sm font-medium`
- "Cancel" button: outline style
- Body overflow locked when open

**"Pray for this" glow logic (in page component):**
- State: `glowingId: string | null`
- On pray: set `glowingId` to prayer ID, call `markPrayed()`, then `setTimeout(() => setGlowingId(null), 1000)`
- Pass `glowing={glowingId === prayer.id}` to `PrayerItemCard`
- Respect `prefers-reduced-motion`: check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — if true, skip the glow animation but still update `lastPrayedAt`

**Responsive behavior:**
- Desktop (> 640px): Icon buttons visible inline on card, tooltips on hover
- Mobile (< 640px): 3-dot overflow menu, dropdown with full text labels

**Guardrails (DO NOT):**
- DO NOT skip crisis detection on the testimony text input or edit form inputs
- DO NOT forget `useFocusTrap()` on the delete dialog
- DO NOT use `dangerouslySetInnerHTML` anywhere
- DO NOT forget `prefers-reduced-motion` check for the glow animation
- DO NOT use inline styles for animation — use Tailwind transition classes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `desktop: renders Pray, Edit, Mark Answered, Delete buttons` | unit | Verify button rendering |
| `desktop: hides Mark Answered for answered prayers` | unit | Verify conditional |
| `desktop: Pray button calls onPray` | unit | Verify callback |
| `mobile: renders 3-dot overflow menu` | unit | Verify mobile trigger |
| `mobile: overflow menu shows all action options` | unit | Verify menu items |
| `mobile: click outside closes overflow menu` | unit | Verify close behavior |
| `edit form pre-fills title, description, category` | unit | Verify pre-fill |
| `edit form validates title required` | unit | Verify validation |
| `edit form shows CrisisBanner on crisis keywords` | unit | Verify crisis detection |
| `edit form save calls onSave with updates` | unit | Verify callback |
| `mark answered form has optional testimony input` | unit | Verify optional field |
| `mark answered form shows CrisisBanner on crisis keywords` | unit | Verify crisis detection |
| `mark answered form confirm calls onConfirm` | unit | Verify callback |
| `delete dialog shows correct text` | unit | Verify dialog content |
| `delete dialog traps focus` | unit | Verify focus trap |
| `delete dialog Remove button calls onDelete` | unit | Verify callback |
| `delete dialog Cancel closes dialog` | unit | Verify close |
| `glow effect applies and fades after 1 second` | unit | Verify glow timing |
| `glow skipped with prefers-reduced-motion` | unit | Verify a11y |

**Expected state after completion:**
- [ ] All 4 card actions work on desktop (inline buttons)
- [ ] All 4 card actions work on mobile (overflow menu)
- [ ] Edit mode works with validation and crisis detection
- [ ] Mark answered works with optional testimony and crisis detection
- [ ] Delete dialog has focus trap and correct a11y
- [ ] Pray glow effect works with 1s timing
- [ ] All tests pass

---

### Step 7: Page Assembly & Empty State

**Objective:** Wire everything together in `MyPrayers.tsx` — state management, filtering, sorting, empty state, and all sub-components integrated.

**Files to create:**
- `frontend/src/components/my-prayers/PrayerListEmptyState.tsx` — Empty state component

**Files to modify:**
- `frontend/src/pages/MyPrayers.tsx` — Full page assembly

**Details:**

**PrayerListEmptyState:**
```tsx
interface PrayerListEmptyStateProps {
  onAddPrayer: () => void
}
```
- Centered layout: `flex flex-col items-center justify-center py-16 text-center`
- Icon: `HandHeart` or `BookHeart` from Lucide, `h-16 w-16 text-text-light/30 mb-4`
- Heading: `text-xl font-semibold text-text-dark mb-2` — "Your prayer list is empty"
- Subtext: `text-text-light mb-6` — "Start tracking what's on your heart"
- CTA: "Add Prayer" button with Plus icon — `bg-primary text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2`
- Follow empty state patterns from Phase 2.75 (ghosted preview not needed here — simple centered CTA)

**MyPrayers.tsx page assembly:**

State:
```typescript
const [prayers, setPrayers] = useState<PersonalPrayer[]>([])
const [filter, setFilter] = useState<PrayerListFilter>('active')
const [composerOpen, setComposerOpen] = useState(false)
const [editingId, setEditingId] = useState<string | null>(null)
const [answeringId, setAnsweringId] = useState<string | null>(null)
const [glowingId, setGlowingId] = useState<string | null>(null)
```

Load prayers from localStorage on mount:
```typescript
useEffect(() => {
  setPrayers(getPrayers())
}, [])
```

Filtering logic:
```typescript
const filteredPrayers = useMemo(() => {
  let list = prayers
  if (filter === 'active') list = list.filter(p => p.status === 'active')
  if (filter === 'answered') list = list.filter(p => p.status === 'answered')
  // Sort: active first by createdAt desc, then answered by createdAt desc
  return list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}, [prayers, filter])
```

Note: When filter is "all", the sort puts active before answered. When filter is "active" or "answered", the sort is purely by `createdAt` desc within that group.

Counts:
```typescript
const counts = useMemo(() => ({
  all: prayers.length,
  active: prayers.filter(p => p.status === 'active').length,
  answered: prayers.filter(p => p.status === 'answered').length,
}), [prayers])
```

Handler functions:
- `handleAddPrayer(title, description, category)` — calls `addPrayer()`, updates state, shows toast on success or limit error
- `handleUpdatePrayer(id, updates)` — calls `updatePrayer()`, refreshes state, clears `editingId`
- `handleDeletePrayer(id)` — calls `deletePrayer()`, refreshes state
- `handleMarkAnswered(id, note)` — calls `markAnswered()`, refreshes state, clears `answeringId`, shows success toast
- `handlePray(id)` — calls `markPrayed()`, sets `glowingId`, refreshes state, `setTimeout(() => setGlowingId(null), 1000)`

Render structure:
```
<Navigate if not auth'd />
<Layout>
  <PageHero title="My Prayers" subtitle="Your personal conversation with God." />
  <main bg-neutral-bg>
    <PrayerListActionBar ... sticky />
    <div max-w-3xl mx-auto px-4 py-4>
      <PrayerComposer isOpen={composerOpen} ... />
      {prayers.length === 0 ? (
        <PrayerListEmptyState onAddPrayer={() => setComposerOpen(true)} />
      ) : filteredPrayers.length === 0 ? (
        <p>No {filter} prayers</p>  // When filter has no results
      ) : (
        <div className="space-y-4">
          {filteredPrayers.map(prayer => (
            editingId === prayer.id ? (
              <EditPrayerForm ... />
            ) : (
              <PrayerItemCard prayer={prayer} glowing={glowingId === prayer.id}>
                {answeringId === prayer.id ? (
                  <MarkAnsweredForm ... />
                ) : (
                  <>
                    <PrayerCardActions ... />  {/* desktop */}
                    <PrayerCardOverflowMenu ... />  {/* mobile */}
                  </>
                )}
              </PrayerItemCard>
            )
          ))}
        </div>
      )}
    </div>
  </main>
</Layout>
```

**Responsive behavior:**
- Desktop: 720px centered content, cards with hover states
- Tablet: Same layout, auto margins
- Mobile: Full-width cards, `px-4` padding, overflow menus

**Guardrails (DO NOT):**
- DO NOT read/write localStorage if not authenticated (the redirect handles this, but defense-in-depth)
- DO NOT show empty state when there are prayers but the filter just yields zero results — show a different "no matching prayers" message instead
- DO NOT forget to refresh `prayers` state after every mutation (re-read from localStorage)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `empty state renders when no prayers exist` | integration | Verify empty state display |
| `empty state CTA opens composer` | integration | Verify CTA behavior |
| `prayers render as cards after adding` | integration | Verify list display |
| `filtering shows correct subset` | integration | Verify filter logic |
| `"Active" filter selected by default` | integration | Verify default filter |
| `answered prayers sort to bottom` | integration | Verify sort order |
| `adding prayer shows it at top of list` | integration | Verify add + display |
| `editing prayer updates display` | integration | Verify edit flow |
| `deleting prayer removes from list` | integration | Verify delete flow |
| `marking answered updates card appearance` | integration | Verify answer flow |
| `praying triggers glow effect` | integration | Verify glow |
| `200 prayer limit shows message` | integration | Verify limit |
| `no-filter-results message shows when filter has 0 matches` | integration | Verify UX |
| `all ARIA live regions announce filter changes` | integration | Verify a11y |

**Expected state after completion:**
- [ ] Full page is functional with all CRUD operations
- [ ] Filtering works correctly with counts
- [ ] Sorting puts active before answered
- [ ] Empty state displays when no prayers
- [ ] All sub-components are wired together
- [ ] Toast notifications on key actions
- [ ] All tests pass

---

### Step 8: Comprehensive Integration Tests

**Objective:** Write integration tests covering the full user flow, edge cases, accessibility, and responsive behavior.

**Files to create:**
- `frontend/src/pages/__tests__/MyPrayers.test.tsx` — Full page integration tests
- `frontend/src/services/__tests__/prayer-list-storage.test.ts` — Storage unit tests (if not created in Step 1)

**Details:**

Test file structure follows the pattern in `components/prayer-wall/__tests__/`:

```tsx
// Helper render function
function renderMyPrayers() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  return render(
    <MemoryRouter initialEntries={['/my-prayers']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/my-prayers" element={<MyPrayers />} />
            <Route path="/" element={<div>Landing Page</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
```

**Test categories:**

1. **Auth gating tests:**
   - Redirects to `/` when not authenticated
   - Renders page when authenticated
   - No localStorage reads/writes when not authenticated

2. **Empty state tests:**
   - Shows empty state with correct text and CTA
   - Empty state CTA opens composer

3. **CRUD flow tests:**
   - Full add → display → edit → mark answered → delete cycle
   - Add prayer with all fields
   - Add prayer with title and category only (no description)
   - Edit prayer updates display immediately
   - Delete prayer removes from list
   - Mark answered shows green border and badge

4. **Filtering tests:**
   - Default filter is "Active"
   - Filter counts are correct
   - Switching filter shows correct prayers
   - "All" shows both active and answered (active first)

5. **Validation tests:**
   - Cannot submit without title
   - Cannot submit without category
   - Character limits enforced
   - Validation messages appear in warning color

6. **Crisis detection tests:**
   - Crisis banner appears when crisis keywords in title
   - Crisis banner appears when crisis keywords in description
   - Crisis banner appears when crisis keywords in testimony note

7. **Accessibility tests:**
   - Filter pills have correct ARIA attributes
   - Delete dialog has `role="alertdialog"`
   - Screen reader announcements for filter changes
   - All buttons have accessible names

8. **Edge case tests:**
   - 200 prayer limit message
   - Corrupted localStorage recovers to empty array
   - Very long title/description truncation

**Guardrails (DO NOT):**
- DO NOT mock localStorage — use real `localStorage.setItem`/`getItem` with `localStorage.clear()` in `beforeEach`
- DO NOT skip crisis detection tests — these are safety-critical
- DO NOT forget MemoryRouter `future` flags
- DO NOT use `container.querySelector` — prefer RTL queries (`getByRole`, `getByText`, `getByLabelText`)

**Expected state after completion:**
- [ ] All integration tests pass
- [ ] Storage unit tests pass
- [ ] Crisis detection is verified
- [ ] Auth gating is verified
- [ ] Filter logic is verified
- [ ] Edge cases are covered
- [ ] `pnpm test` passes with no regressions

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Storage Service (data layer) |
| 2 | 1 | Page Shell, Route & Auth Gating |
| 3 | 2 | Navbar Integration |
| 4 | 1 | Prayer Card Component |
| 5 | 1 | Action Bar, Filtering & Inline Composer |
| 6 | 1, 4 | Card Actions (Pray, Edit, Answered, Delete) |
| 7 | 2, 4, 5, 6 | Page Assembly & Empty State (wires everything) |
| 8 | 7 | Comprehensive Integration Tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Storage Service | [COMPLETE] | 2026-03-20 | Created `types/personal-prayer.ts` and `services/prayer-list-storage.ts` with full CRUD + 12 unit tests passing |
| 2 | Page Shell, Route & Auth Gating | [COMPLETE] | 2026-03-20 | Created `pages/MyPrayers.tsx` with auth redirect, PageHero, neutral content area. Added route in `App.tsx`. 3 tests passing. |
| 3 | Navbar Integration | [COMPLETE] | 2026-03-20 | Added "My Prayers" to `AVATAR_MENU_LINKS` and `MOBILE_DRAWER_EXTRA_LINKS` in `Navbar.tsx`. Updated existing Navbar test. 50 tests passing. |
| 4 | Prayer Card Component | [COMPLETE] | 2026-03-20 | Created `PrayerItemCard.tsx` with truncation, answered badge, glow effect, children slot. 10 tests passing. |
| 5 | Action Bar, Filtering & Inline Composer | [COMPLETE] | 2026-03-20 | Created `PrayerListActionBar.tsx` (sticky filter pills, radiogroup ARIA) and `PrayerComposer.tsx` (inline add form, crisis banner, validation). Button not disabled — validation fires on click. 20 tests passing. |
| 6 | Card Actions | [COMPLETE] | 2026-03-20 | Created 5 components: `PrayerCardActions`, `PrayerCardOverflowMenu`, `EditPrayerForm`, `MarkAnsweredForm`, `DeletePrayerDialog`. All with crisis detection, a11y, focus trap. 18 tests passing. |
| 7 | Page Assembly & Empty State | [COMPLETE] | 2026-03-20 | Full page assembly in `MyPrayers.tsx` with state management, filtering, sorting, CRUD, glow effect, delete dialog, empty state. Created `PrayerListEmptyState.tsx`. 63 total tests passing. |
| 8 | Comprehensive Integration Tests | [COMPLETE] | 2026-03-20 | 21 integration tests covering auth gating, empty state, CRUD flows, filtering, validation, crisis detection, accessibility, edge cases (200 limit, corrupted localStorage). 131 total tests across 7 files. |
