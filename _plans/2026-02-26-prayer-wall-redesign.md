# Implementation Plan: Prayer Wall Redesign

**Spec:** `_specs/prayer-wall-redesign.md`
**Date:** 2026-02-26
**Branch:** claude/feature/prayer-wall-redesign

---

## Architecture Context

### Codebase State
- **No prayer wall files exist.** The route `/prayer-wall` currently renders a `<ComingSoon title="Prayer Wall" />` stub in `App.tsx:66`. All prayer wall code is built from scratch.
- **No `mocks/` directory** exists under `frontend/src/`. Must be created.
- **No toast system** exists. No `sonner`, `react-hot-toast`, or custom toast component. Must be built.
- **No `useAuth` hook** exists. Must create a stub (auth is Phase 3).

### Relevant Existing Files
- `frontend/src/App.tsx` — Router with React Router v6 future flags, QueryClientProvider wrapper
- `frontend/src/components/Layout.tsx` — Wraps pages with Navbar (non-transparent) + skip-to-content + `max-w-7xl` main container
- `frontend/src/components/HeroSection.tsx` — Home page hero with inline-style purple gradient (`#0D0620` → `#1E0B3E` → `#4A1D96` → `#EDE9FE`)
- `frontend/src/components/Navbar.tsx` — Glassmorphic navbar, `transparent` prop for landing page overlay. Prayer Wall already in `NAV_LINKS`.
- `frontend/src/components/ui/Button.tsx` — `forwardRef` pattern, variants (primary/secondary/outline/ghost), focus-visible ring
- `frontend/src/components/ui/Card.tsx` — `rounded-lg border bg-white p-6 shadow-sm` base style
- `frontend/src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `frontend/src/hooks/useInView.ts` — Only custom hook, fire-once IntersectionObserver pattern
- `frontend/src/api/client.ts` — Class-based ApiClient singleton, `request<T>()` pattern
- `frontend/src/components/index.ts` — Barrel file for component exports
- `frontend/tailwind.config.js` — Custom colors (primary, hero-dark, hero-mid, success, etc.), fonts (sans/serif/script), animations (dropdown-in, slide-from-right)

### Page Layout Decision
The Prayer Wall page needs a full-width hero section that extends edge-to-edge. `<Layout>` constrains children to `max-w-7xl` with padding, which breaks the hero design. **Solution:** The Prayer Wall page will render its own page wrapper (like `Home.tsx` does) with `<Navbar />`, skip-to-content link, hero, and feed section — NOT wrapped in `<Layout>`.

### Directory Conventions
- Pages: `frontend/src/pages/<PageName>.tsx`
- Components: `frontend/src/components/<feature>/<ComponentName>.tsx`
- Hooks: `frontend/src/hooks/<hookName>.ts`
- Types: `frontend/src/types/<feature>.ts`
- Tests: co-located in `__tests__/` sibling directories (e.g., `frontend/src/components/__tests__/`, `frontend/src/pages/__tests__/`)
- Mocks: `frontend/src/mocks/` (new directory)

### Test Patterns
- Framework: Vitest + React Testing Library + jsdom
- Wrapper: `<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`
- Imports: `import { describe, it, expect, vi } from 'vitest'`
- User events: `userEvent.setup()` for realistic interactions
- Render helper: local `renderComponent()` function per test file
- Assertions: `toBeInTheDocument()`, `toHaveAttribute()`, `toHaveClass()`

### Design System Values
- **Primary purple**: `#6D28D9` (Tailwind: `text-primary`, `bg-primary`)
- **Amber/candle**: `#F59E0B` (Tailwind: `text-amber-500`, `bg-amber-500`)
- **Success green**: `#27AE60` (Tailwind: `text-success`, `bg-success`)
- **Neutral bg**: `#F5F5F5` (Tailwind: `bg-neutral-bg`)
- **Text dark**: `#2C3E50` (Tailwind: `text-text-dark`)
- **Text light**: `#7F8C8D` (Tailwind: `text-text-light`)
- **Card border**: `#E5E7EB` (Tailwind: `border-gray-200`)
- **Hero dark**: `#0D0620` (Tailwind: `bg-hero-dark`)
- **Fonts**: Inter (sans), Lora (serif), Caveat (script)

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Working tree is clean on `claude/feature/prayer-wall-redesign` branch
- [ ] `pnpm install` has been run and all dependencies are up to date
- [ ] `pnpm test` passes (existing tests green)
- [ ] `pnpm build` succeeds (TypeScript compiles)
- [ ] No other prayer wall files exist in the codebase (the previous implementation was fully discarded)
- [ ] The mock-data-driven approach is confirmed: all new UI components consume hardcoded mock data, no backend API calls for new features
- [ ] The `/prayer-wall/new` route does not exist (no need to remove it)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Page wrapper | Custom wrapper (not `<Layout>`) | Layout constrains to max-w-7xl; hero needs full-width. Follow Home.tsx pattern. |
| Toast library | Custom lightweight `ToastProvider` + `useToast` | Avoids adding a dependency for a simple feature. Can upgrade to `sonner` later. |
| Auth stub | `useAuth()` returns `{ user: null, isLoggedIn: false }` | Auth is Phase 3. Stub allows components to check `isLoggedIn` and `user?.id` without auth infrastructure. |
| Avatar colors | Deterministic hash of user ID to curated 8-color palette | Ensures same user always gets same color across renders. |
| Mock data location | `frontend/src/mocks/prayer-wall-mock-data.ts` | Spec explicitly names this path. |
| @mention parsing | Regex `/(@\w+)/g` to detect and style @mentions | Simple, handles `@FirstName` pattern. Links to `/prayer-wall/user/:id` by looking up user in mock data. |
| Comments initial load | Show 5 newest, "See more comments" links to detail page | Keeps feed cards compact. Detail page shows all. |
| Share URL | Uses `window.location.origin` + `/prayer-wall/:id` | Works in dev and production without hardcoding domain. |
| Bump/sort in mock data | `lastActivityAt` field on mock prayers, sorted client-side | No backend; mock data pre-sorted by `lastActivityAt DESC`. |
| Mobile sticky post button | Fixed at bottom of viewport, above content | Spec: "Fixed bottom 'Share a Prayer Request' button (sticky, above the fold)" for mobile only. |
| Tailwind animation keyframes | Add `slide-down`, `slide-up` to tailwind.config.js | Needed for composer and comments expand/collapse animations. |
| Text truncation | JavaScript `.slice(0, 150)` + "..." + "Show more" link | CSS `line-clamp` doesn't give precise character control. JS truncation is more predictable. |
| No API client changes | Mock data imported directly in components | Spec says "No real backend wiring for new features (use mock data)". |

---

## Implementation Steps

### Step 1: Types, Mock Data, and Utility Foundations

**Objective:** Create the type definitions, comprehensive mock data, `useAuth` stub hook, and time formatting utility that all other steps depend on.

**Files to create:**
- `frontend/src/types/prayer-wall.ts` — TypeScript interfaces
- `frontend/src/mocks/prayer-wall-mock-data.ts` — Mock users, prayers, comments, reactions
- `frontend/src/hooks/useAuth.ts` — Auth stub hook
- `frontend/src/lib/time.ts` — Relative time + full date formatting

**Details:**

`types/prayer-wall.ts`:
```ts
export interface PrayerWallUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null  // null = initials avatar
  bio: string
  joinedDate: string  // ISO 8601
}

export interface PrayerRequest {
  id: string
  userId: string | null  // null = anonymous
  authorName: string     // "Anonymous" or first name
  authorAvatarUrl: string | null
  isAnonymous: boolean
  content: string
  isAnswered: boolean
  answeredText: string | null
  answeredAt: string | null
  createdAt: string
  lastActivityAt: string  // for bump/sort
  prayingCount: number
  candleCount: number
  commentCount: number
}

export interface PrayerComment {
  id: string
  prayerId: string
  userId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string  // may contain @mentions like "@Sarah"
  createdAt: string
}

export interface PrayerReaction {
  prayerId: string
  isPraying: boolean
  isCandleLit: boolean
  isBookmarked: boolean
}
```

`hooks/useAuth.ts`:
```ts
interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
}

export function useAuth(): AuthState {
  return { user: null, isLoggedIn: false }
}
```

`lib/time.ts`:
- `timeAgo(isoDate: string): string` — returns "2 hours ago", "3 days ago", etc.
- `formatFullDate(isoDate: string): string` — returns "Feb 24, 2026" format using `Intl.DateTimeFormat`

`mocks/prayer-wall-mock-data.ts`:
- 10 `PrayerWallUser` objects: 7 with `avatarUrl` (pravatar.cc placeholder URLs), 2 with `null` (initials), 1 anonymous-only user
- 18 `PrayerRequest` objects with varying:
  - Lengths: 4 short (< 80 chars), 10 medium (80-150 chars), 4 long (> 200 chars — triggers "Show more")
  - 2 anonymous prayers, 3 answered (with praise text), varying counts (0 to 50+)
  - Dates: today, yesterday, 3 days ago, last week, 2 weeks ago, last month
  - Pre-sorted by `lastActivityAt DESC`
- 35 `PrayerComment` objects spread across prayers (some with 0, some with 2-3, some with 10+)
  - Include 5+ `@mention` comments (e.g., "@Sarah praying for you!")
- `PrayerReaction` map for a mock logged-in user (keyed by prayerId)
- Helper functions: `getMockPrayers()`, `getMockComments(prayerId)`, `getMockUser(userId)`, `getMockReactions()`

**Guardrails (DO NOT):**
- DO NOT import from `@/api/client` — mock data is self-contained
- DO NOT add real API methods to ApiClient
- DO NOT make mock data mutable/stateful at the module level (export functions that return fresh copies)
- DO NOT use `Date.now()` in mock dates — use fixed ISO strings for deterministic tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `time.test.ts` | unit | `timeAgo` returns correct relative strings for various intervals |
| `time.test.ts` | unit | `formatFullDate` returns "Feb 24, 2026" format |
| `prayer-wall-mock-data.test.ts` | unit | `getMockPrayers()` returns 18 prayers sorted by lastActivityAt DESC |
| `prayer-wall-mock-data.test.ts` | unit | `getMockComments(prayerId)` returns comments for the given prayer |

**Expected state after completion:**
- [ ] All 4 files created with correct types and comprehensive mock data
- [ ] `pnpm build` succeeds (TypeScript compiles)
- [ ] Tests pass for time utilities and mock data helpers

---

### Step 2: Avatar Component and Toast System

**Objective:** Build the reusable Avatar component (initials + image + anonymous variants) and a lightweight toast notification system.

**Files to create:**
- `frontend/src/components/prayer-wall/Avatar.tsx` — Avatar component
- `frontend/src/components/ui/Toast.tsx` — Toast component + ToastProvider + useToast hook

**Details:**

`Avatar.tsx`:
```ts
interface AvatarProps {
  firstName: string
  lastName: string
  avatarUrl: string | null
  size?: 'sm' | 'md' | 'lg'  // 32px, 40-48px, 64px
  isAnonymous?: boolean
  userId?: string  // for deterministic color
  className?: string
}
```
- **Initials**: Display first letter of firstName + firstName of lastName in uppercase, white text, on a colored background
- **Color palette**: 8 curated colors: `['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D']`. Select color via `userId.charCodeAt(0) % 8` for deterministic assignment.
- **Anonymous**: Render a `User` icon from lucide-react (gray silhouette) on a `bg-gray-200` circle
- **Image**: If `avatarUrl` is provided and not anonymous, render `<img>` with `object-cover rounded-full`. Include `onError` fallback to initials.
- **Sizes**: `sm` = `h-8 w-8 text-xs`, `md` = `h-10 w-10 text-sm` (default), `lg` = `h-16 w-16 text-lg`
- All variants: `rounded-full flex items-center justify-center flex-shrink-0`

`Toast.tsx`:
- `ToastProvider` — React context that wraps the app, renders a fixed container `fixed top-4 right-4 z-50 flex flex-col gap-2`
- `useToast()` — Returns `{ showToast: (message: string, type?: 'success' | 'error') => void }`
- `Toast` component — Individual toast item: white card with green/red left border, message text, auto-dismiss after 4s, slide-in-from-right animation (use existing `animate-slide-from-right` from tailwind config)
- Max 3 toasts visible at once; oldest removed when exceeding limit

**Guardrails (DO NOT):**
- DO NOT install external toast libraries (keep it custom and lightweight)
- DO NOT use `dangerouslySetInnerHTML` in toast messages
- DO NOT make Avatar click-navigable here — that's handled by the parent (PrayerCard)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Avatar.test.tsx` | unit | Renders initials "SJ" for firstName="Sarah", lastName="Johnson" |
| `Avatar.test.tsx` | unit | Renders anonymous icon when `isAnonymous=true` |
| `Avatar.test.tsx` | unit | Renders image when avatarUrl is provided |
| `Avatar.test.tsx` | unit | Falls back to initials on image error |
| `Toast.test.tsx` | unit | showToast renders a toast message |
| `Toast.test.tsx` | unit | Toast auto-dismisses after 4 seconds |

**Expected state after completion:**
- [ ] Avatar renders correctly in all 3 variants (initials, image, anonymous)
- [ ] Toast appears and auto-dismisses
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 3: Prayer Wall Hero Section

**Objective:** Build the purple gradient hero section that matches the home page style, with "Prayer Wall" title and "You're not alone." subtitle.

**Files to create:**
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx`

**Details:**

The hero uses an inline `style` prop for the gradient (same approach as `HeroSection.tsx:21-27`):
```tsx
style={{
  backgroundImage: [
    'radial-gradient(ellipse 100% 60% at 50% 0%, #3B0764 0%, transparent 70%)',
    'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 50%, #F5F5F5 100%)',
  ].join(', '),
}}
```
Note the difference from the home hero: this gradient fades to `#F5F5F5` (neutral-bg) instead of `#EDE9FE` since the feed section sits on the neutral background.

Structure:
```tsx
<section aria-label="Prayer Wall" className="relative flex w-full flex-col items-center px-4 pt-32 pb-16 text-center sm:pt-36 sm:pb-20 lg:pt-44 lg:pb-24" style={...}>
  <h1 className="mb-3 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
    Prayer Wall
  </h1>
  <p className="text-lg text-white/85 sm:text-xl">
    You're not alone.
  </p>
</section>
```

- Shorter padding than the home hero (no input box or quiz teaser)
- Same antialiased rendering
- `aria-label="Prayer Wall"` for the section landmark

**Guardrails (DO NOT):**
- DO NOT add a "Share a Prayer Request" button in the hero — spec says it lives in the feed section below
- DO NOT use Caveat (script) font for the title — spec says Inter Bold 700 (unlike the home hero which uses Caveat)
- DO NOT add decorative elements, animations, or input boxes — this is a simple title+subtitle hero

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWallHero.test.tsx` | unit | Renders heading "Prayer Wall" |
| `PrayerWallHero.test.tsx` | unit | Renders subtitle "You're not alone." |
| `PrayerWallHero.test.tsx` | unit | Has accessible section landmark with aria-label |

**Expected state after completion:**
- [ ] Hero renders with purple gradient matching the home page style
- [ ] Title and subtitle display correctly
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 4: Prayer Card with Show More/Less and Answered Badge

**Objective:** Build the redesigned prayer card component with avatar, author line (name + em-dash + date), truncated text with in-place expand/collapse, answered badge with praise text, and hover shadow.

**Files to create:**
- `frontend/src/components/prayer-wall/PrayerCard.tsx`
- `frontend/src/components/prayer-wall/AnsweredBadge.tsx`

**Details:**

`PrayerCard.tsx`:
```ts
interface PrayerCardProps {
  prayer: PrayerRequest
  children?: ReactNode  // slot for InteractionBar + CommentsSection (added in later steps)
}
```

Layout:
```
<article> with white bg, rounded-xl border border-gray-200, p-5 sm:p-6, hover:shadow-md transition-shadow (desktop only)
  <header> — Avatar + Author line
    <Link to={`/prayer-wall/user/${prayer.userId}`}> wrapping Avatar (skip link if anonymous)
    <div>
      <Link> First Name (or "Anonymous") — font-semibold text-text-dark
      <span> " — " </span>
      <time> formatFullDate(prayer.createdAt) — text-text-light
    </div>
  </header>

  <div> — Prayer body
    {isExpanded ? prayer.content : truncate(prayer.content, 150) + "..."}
    {prayer.content.length > 150 && (
      <button onClick={toggle}> "Show more" / "Show less" </button>
    )}
    Text rendered with: text-text-dark leading-relaxed whitespace-pre-wrap
  </div>

  {children}  <!-- InteractionBar + CommentsSection injected by parent -->

  {prayer.isAnswered && <AnsweredBadge ... />}
</article>
```

- The `<Link>` around avatar/name only renders if `!prayer.isAnonymous` and `prayer.userId` exists
- "Show more"/"Show less": `text-primary text-sm font-medium cursor-pointer hover:underline`
- Card: `rounded-xl border border-gray-200 bg-white p-5 sm:p-6 transition-shadow lg:hover:shadow-md`

`AnsweredBadge.tsx`:
```ts
interface AnsweredBadgeProps {
  answeredText: string | null
  answeredAt: string | null
}
```
- Green badge: `inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-medium text-white`
- Badge text: "Answered" with a `CheckCircle` lucide icon (16px)
- If `answeredText`: Below the badge, render praise text in `font-serif italic text-text-dark/80 text-sm leading-relaxed` (Lora italic — testimony style)
- If `answeredAt`: Show date after praise text in `text-text-light text-xs`

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for prayer content — render as plain text with `whitespace-pre-wrap`
- DO NOT put the InteractionBar inside PrayerCard — it comes via the `children` prop (composed by the parent)
- DO NOT add click handlers for the whole card — only avatar/name are clickable links
- DO NOT use CSS `line-clamp` for truncation — use JS `.slice(0, 150)` for precise character control

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerCard.test.tsx` | unit | Renders author name and formatted date |
| `PrayerCard.test.tsx` | unit | Truncates long prayer text and shows "Show more" button |
| `PrayerCard.test.tsx` | unit | Expands text on "Show more" click, shows "Show less" |
| `PrayerCard.test.tsx` | unit | Does NOT show "Show more" for short prayers (< 150 chars) |
| `PrayerCard.test.tsx` | unit | Renders "Anonymous" for anonymous prayers without profile link |
| `PrayerCard.test.tsx` | unit | Renders AnsweredBadge when prayer.isAnswered is true |
| `AnsweredBadge.test.tsx` | unit | Renders "Answered" badge text |
| `AnsweredBadge.test.tsx` | unit | Renders praise text in serif italic when provided |

**Expected state after completion:**
- [ ] Prayer card renders with avatar, author line, truncated text, expand/collapse
- [ ] Answered badge displays correctly with/without praise text
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 5: Interaction Bar

**Objective:** Build the interaction bar with Pray, Candle, Comment, Bookmark, and Share buttons with correct active/inactive/logged-out states.

**Files to create:**
- `frontend/src/components/prayer-wall/InteractionBar.tsx`

**Details:**

```ts
interface InteractionBarProps {
  prayer: PrayerRequest
  reactions: PrayerReaction | undefined
  onTogglePraying: () => void
  onToggleCandle: () => void
  onToggleComments: () => void
  onToggleBookmark: () => void
  onShare: () => void
  isCommentsOpen: boolean
}
```

Layout: `flex flex-wrap items-center gap-3 sm:gap-4 border-t border-gray-100 pt-3 mt-3`

Buttons (all `type="button"`):
1. **Pray**: `HandHelping` icon from lucide-react. Inactive: `text-text-light hover:text-primary`. Active (`reactions?.isPraying`): `text-primary font-medium`. Shows `(count)`.
   - Pulse animation on click: `animate-pulse` for 300ms via state toggle
2. **Candle**: `Flame` icon. Inactive: `text-text-light hover:text-amber-500`. Active: `text-amber-500 font-medium`. Shows `(count)`.
3. **Comment**: `MessageCircle` icon. Always `text-text-light hover:text-text-dark`. Shows `(count)`. Toggles comments open/closed. When open, icon may have a subtle active state.
4. **Bookmark**: `Bookmark` icon. Only rendered if `isLoggedIn` (from `useAuth()`). Inactive: `text-text-light hover:text-primary`. Active: `text-primary fill-primary`.
   - When logged out: `<Link to="/login">` wrapping the icon
5. **Share**: `ExternalLink` or `Share2` icon. Always `text-text-light hover:text-text-dark`. No count. Triggers `onShare`.

Each button: `flex items-center gap-1 text-sm transition-colors` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded`

The `aria-label` on each button describes the action: e.g., `aria-label="Praying for this request, 24 praying"`, `aria-pressed={reactions?.isPraying}` for toggle buttons.

**Guardrails (DO NOT):**
- DO NOT implement actual API calls — callbacks are passed from parent, which manages mock state
- DO NOT implement the Share dropdown here — just call `onShare` callback (ShareDropdown comes in Step 11)
- DO NOT show Bookmark for logged-out users as a button — show it as a Link to /login instead
- DO NOT add conversion prompts — spec explicitly removes them

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `InteractionBar.test.tsx` | unit | Renders all 5 interaction buttons with counts |
| `InteractionBar.test.tsx` | unit | Pray button toggles active state (purple) on click |
| `InteractionBar.test.tsx` | unit | Candle button toggles active state (amber) on click |
| `InteractionBar.test.tsx` | unit | Comment button calls onToggleComments |
| `InteractionBar.test.tsx` | unit | Bookmark renders as Link to /login when logged out |

**Expected state after completion:**
- [ ] Interaction bar renders correctly with all 5 buttons
- [ ] Active/inactive states display correctly
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 6: Feed Page + Route Wiring

**Objective:** Build the main Prayer Wall feed page assembling the hero, "Share a Prayer Request" button, prayer cards with interaction bars, and "Load More" pagination. Wire all prayer wall routes in App.tsx.

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — Main feed page
- `frontend/src/App.tsx` — Replace ComingSoon stub, add all prayer wall routes

**Details:**

`PrayerWall.tsx` — Does NOT use `<Layout>`. Renders its own page wrapper (like `Home.tsx`):

```tsx
<div className="min-h-screen bg-neutral-bg font-sans">
  <a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>
  <Navbar />
  <PrayerWallHero />
  <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6 sm:py-8">
    {/* Share a Prayer Request button */}
    {/* InlineComposer (Step 8 — slot for later) */}
    {/* Prayer cards feed */}
    {/* Load More button */}
  </main>
  {/* Mobile sticky post button (Step 8) */}
</div>
```

State management (all local React state, no React Query — mock data):
- `prayers: PrayerRequest[]` — initialized from `getMockPrayers().slice(0, 20)` (first page)
- `reactions: Map<string, PrayerReaction>` — initialized from `getMockReactions()`
- `openComments: Set<string>` — tracks which prayer IDs have expanded comments
- `page: number` — for Load More pagination

"Share a Prayer Request" button:
- Desktop: Centered at top of feed, `<Button variant="primary" size="lg">`
- Mobile (< 640px): Hidden from flow; rendered as a fixed bottom sticky button: `fixed bottom-4 left-4 right-4 z-40 sm:hidden`
- Logged out: `<Link to="/login?returnTo=/prayer-wall">` styled as a button
- Logged in: Opens the inline composer (Step 8)

Feed rendering:
```tsx
{prayers.map(prayer => (
  <PrayerCard key={prayer.id} prayer={prayer}>
    <InteractionBar
      prayer={prayer}
      reactions={reactions.get(prayer.id)}
      onTogglePraying={() => handleTogglePraying(prayer.id)}
      onToggleCandle={() => handleToggleCandle(prayer.id)}
      onToggleComments={() => handleToggleComments(prayer.id)}
      onToggleBookmark={() => handleToggleBookmark(prayer.id)}
      onShare={() => handleShare(prayer)}
      isCommentsOpen={openComments.has(prayer.id)}
    />
    {/* CommentsSection slot — Step 9 */}
  </PrayerCard>
))}
```

Toggle handlers: Update local state (e.g., toggle `isPraying` in reactions map, increment/decrement count in prayers array). Session dedup via `sessionStorage` for logged-out users.

"Load More": `<Button variant="outline" onClick={() => loadMore()}>Load More</Button>`. Appends next 20 prayers from mock data. Hidden when all prayers loaded.

`App.tsx` changes — replace the single prayer-wall ComingSoon route with:
```tsx
import { PrayerWall } from './pages/PrayerWall'
import { PrayerDetail } from './pages/PrayerDetail'         // Step 10
import { PrayerWallProfile } from './pages/PrayerWallProfile' // Step 12
import { PrayerWallDashboard } from './pages/PrayerWallDashboard' // Step 13

// Replace: <Route path="/prayer-wall" element={<ComingSoon title="Prayer Wall" />} />
// With:
<Route path="/prayer-wall" element={<PrayerWall />} />
<Route path="/prayer-wall/:id" element={<PrayerDetail />} />
<Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
<Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
```

For this step, only `PrayerWall` and the route for it are fully implemented. The other 3 routes point to placeholder components (create minimal stubs that return `<div>Coming soon</div>`) so the routes compile. They get real implementations in Steps 10, 12, 13.

**Guardrails (DO NOT):**
- DO NOT use `<Layout>` — the prayer wall page renders its own Navbar + hero
- DO NOT import from `@/api/client` — all data comes from mock data module
- DO NOT use React Query for mock data — plain `useState` is sufficient
- DO NOT implement the inline composer yet — just the "Share a Prayer Request" button that will trigger it in Step 8
- DO NOT implement the comments section yet — just track `openComments` state for Step 9

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWall.test.tsx` | integration | Renders hero with "Prayer Wall" heading |
| `PrayerWall.test.tsx` | integration | Renders prayer cards from mock data |
| `PrayerWall.test.tsx` | integration | "Share a Prayer Request" button is visible |
| `PrayerWall.test.tsx` | integration | "Load More" button loads additional prayers |
| `PrayerWall.test.tsx` | integration | Pray button toggles and updates count |
| `PrayerWall.test.tsx` | integration | Cards have correct accessible landmarks |

**Expected state after completion:**
- [ ] `/prayer-wall` renders the full feed with hero, cards, interaction bars, and pagination
- [ ] Toggle interactions (pray, candle) work with local state
- [ ] Routes compile (stub pages for detail, profile, dashboard)
- [ ] `pnpm build` succeeds
- [ ] Tests pass
- [ ] Browser: navigating to `/prayer-wall` shows the feed with mock data

---

### Step 7: Inline Post Composer

**Objective:** Build the inline post composer that slides down at the top of the feed when "Share a Prayer Request" is clicked.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — Composer component
- `frontend/src/pages/PrayerWall.tsx` — Integrate composer into feed page

**Details:**

`InlineComposer.tsx`:
```ts
interface InlineComposerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string, isAnonymous: boolean) => void
}
```

Layout:
```tsx
<div
  className={cn(
    'overflow-hidden transition-all duration-300 ease-in-out',
    isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'
  )}
>
  <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 className="mb-4 text-lg font-semibold text-text-dark">
      Share a Prayer Request
    </h2>
    <textarea ... />
    <label> checkbox: Post anonymously </label>
    <p className="text-xs text-text-light">disclaimer</p>
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" disabled={!content.trim()} onClick={handleSubmit}>
        Submit Prayer Request
      </Button>
    </div>
    {content.length >= 500 && (
      <p className="text-xs text-text-light">{content.length} characters</p>
    )}
  </article>
</div>
```

Textarea: `w-full resize-none rounded-lg border border-gray-200 p-3 text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed`
- Auto-grow: Use a `useRef` on the textarea, on each `onChange` set `textarea.style.height = 'auto'` then `textarea.style.height = textarea.scrollHeight + 'px'`. Min height: `120px`.
- Placeholder: "What's on your heart?"

After submit: Call `onSubmit(content, isAnonymous)`. In PrayerWall.tsx:
1. Create a new mock prayer from the submitted content
2. Prepend to `prayers` state array
3. Close the composer (`setComposerOpen(false)`)
4. Show success toast: "Your prayer has been shared." via `useToast()`

Integrate into `PrayerWall.tsx`:
- Add `composerOpen: boolean` state
- "Share a Prayer Request" button sets `composerOpen(true)`
- Render `<InlineComposer isOpen={composerOpen} onClose={...} onSubmit={...} />` between the button and the prayer cards
- Wrap page in `<ToastProvider>`

**Guardrails (DO NOT):**
- DO NOT create a separate page/route for posting — this is inline
- DO NOT render the composer as a modal/overlay — it pushes the feed down
- DO NOT hard-limit character count — only show a soft counter at 500+
- DO NOT submit empty content — disable the submit button when textarea is empty

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `InlineComposer.test.tsx` | unit | Renders textarea and submit button when open |
| `InlineComposer.test.tsx` | unit | Submit button disabled when textarea is empty |
| `InlineComposer.test.tsx` | unit | Character counter appears at 500+ characters |
| `InlineComposer.test.tsx` | unit | Cancel button calls onClose |
| `InlineComposer.test.tsx` | unit | Submit calls onSubmit with content and anonymous flag |

**Expected state after completion:**
- [ ] Composer slides open/closed smoothly at top of feed
- [ ] Submitting a prayer prepends it to the feed and shows a toast
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 8: Inline Comments Section

**Objective:** Build the expand/collapse inline comments section below each prayer card with avatar, @mention styling, comment input, and "See more comments" link.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Main comments container
- `frontend/src/components/prayer-wall/CommentItem.tsx` — Single comment display
- `frontend/src/components/prayer-wall/CommentInput.tsx` — Comment input field
- `frontend/src/pages/PrayerWall.tsx` — Integrate comments into feed

**Details:**

`CommentsSection.tsx`:
```ts
interface CommentsSectionProps {
  prayerId: string
  isOpen: boolean
  comments: PrayerComment[]
  totalCount: number
  onSubmitComment: (prayerId: string, content: string) => void
}
```

Layout:
```tsx
<div className={cn(
  'overflow-hidden transition-all duration-300 ease-in-out',
  isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
)}>
  <div className="border-t border-gray-100 pt-3 mt-3">
    {/* Comment items (max 5) */}
    {comments.slice(0, 5).map(comment => <CommentItem key={comment.id} ... />)}

    {/* See more comments link */}
    {totalCount > 5 && (
      <Link to={`/prayer-wall/${prayerId}`} className="text-sm text-primary hover:underline">
        See more comments (showing 5 of {totalCount})
      </Link>
    )}

    {/* Comment input */}
    <CommentInput prayerId={prayerId} onSubmit={onSubmitComment} />
  </div>
</div>
```

`CommentItem.tsx`:
```ts
interface CommentItemProps {
  comment: PrayerComment
  onReply: (authorName: string) => void
}
```
- Avatar (size "sm") + Author name + " — " + timeAgo(createdAt)
- Content rendered with `whitespace-pre-wrap` and @mention parsing:
  - Parse content with regex `/@(\w+)/g`
  - Replace each @mention with a `<Link to="/prayer-wall/user/:id" className="font-semibold text-primary hover:underline">@Name</Link>`
  - Look up user by firstName in mock data to get userId for the link
  - Non-mention text rendered as plain text
- "Reply" button: small text button that calls `onReply(comment.authorName)`

`CommentInput.tsx`:
```ts
interface CommentInputProps {
  prayerId: string
  onSubmit: (prayerId: string, content: string) => void
  initialValue?: string  // for @mention reply pre-population
}
```
- Logged in: `<input>` that grows to textarea on focus. Placeholder: "Write a comment..."
- Logged out: `<Link to="/login" className="...">Log in to comment</Link>` styled to look like an input
- Submit button: `Send` icon from lucide, only visible when input has content
- On submit: call `onSubmit(prayerId, content)`, clear input

Integrate into `PrayerWall.tsx`:
- Below the InteractionBar in each PrayerCard, render:
```tsx
<CommentsSection
  prayerId={prayer.id}
  isOpen={openComments.has(prayer.id)}
  comments={getMockComments(prayer.id)}
  totalCount={prayer.commentCount}
  onSubmitComment={handleSubmitComment}
/>
```
- `handleSubmitComment` adds the comment to local state and increments the prayer's comment count
- Track `replyTo` state for @mention pre-population

**Guardrails (DO NOT):**
- DO NOT render @mentions using `dangerouslySetInnerHTML` — build the parsed JSX elements programmatically
- DO NOT nest comments — flat list only, @mentions provide reply context
- DO NOT show the comment input for logged-out users — show the "Log in to comment" link instead
- DO NOT load all comments inline — max 5, with "See more" linking to detail page

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `CommentsSection.test.tsx` | unit | Renders comments when isOpen is true |
| `CommentsSection.test.tsx` | unit | Hides comments when isOpen is false |
| `CommentsSection.test.tsx` | unit | Shows "See more comments" when totalCount > 5 |
| `CommentItem.test.tsx` | unit | Renders author name, avatar, and time |
| `CommentItem.test.tsx` | unit | Renders @mentions as purple bold links |
| `CommentInput.test.tsx` | unit | Shows "Log in to comment" when logged out |
| `CommentInput.test.tsx` | unit | Submits comment text on Enter/click |

**Expected state after completion:**
- [ ] Comments expand/collapse inline below each prayer card
- [ ] @mentions render as purple links
- [ ] Comment input works for logged-in state (mock)
- [ ] "See more comments" links to detail page
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 9: Detail Page

**Objective:** Build the standalone prayer detail page for shared links and direct navigation, showing full prayer text, all comments, owner actions, and report link.

**Files to create/modify:**
- `frontend/src/pages/PrayerDetail.tsx` — Replace stub from Step 6
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` — Expandable form for praise update
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — Confirmation dialog
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Report prayer dialog

**Details:**

`PrayerDetail.tsx`:
- Uses `useParams()` to get prayer ID, looks up in `getMockPrayers()`
- Does NOT use `<Layout>` — renders own page wrapper with Navbar (like PrayerWall.tsx, but no hero)
- Layout: `min-h-screen bg-neutral-bg font-sans` > `Navbar` > `main` with `max-w-[720px] mx-auto px-4 py-6`

Content:
1. "Back to Prayer Wall" link: `<Link to="/prayer-wall">` with `ArrowLeft` icon
2. Full prayer card (no truncation — pass full content to PrayerCard but disable truncation via a `showFull` prop)
3. InteractionBar (same as feed)
4. Answered badge + praise text (if applicable)
5. Owner actions (if `user?.id === prayer.userId`):
   - `<MarkAsAnsweredForm>` — expands to textarea for praise text, "Confirm" / "Cancel" buttons
   - `<DeletePrayerDialog>` — confirmation modal with focus trap, "Delete" / "Cancel"
6. Report link: `<ReportDialog prayerId={prayer.id} />` — small "Report" text that opens a dialog with optional reason textarea
7. All comments — no 5-comment limit. Render all `getMockComments(prayer.id)`.
8. Comment input at bottom

`MarkAsAnsweredForm.tsx`: Reuse the same pattern from the previous implementation (expandable form with textarea for optional praise text).

`DeletePrayerDialog.tsx`: Custom modal dialog with `useFocusTrap` hook (create `frontend/src/hooks/useFocusTrap.ts` — same implementation as previous session's hook).

`ReportDialog.tsx`: "Report" button that opens a modal with optional reason textarea and submit confirmation.

**Add PrayerCard `showFull` prop:**
Update `PrayerCard.tsx` to accept an optional `showFull?: boolean` prop. When true, skip truncation and don't show "Show more"/"Show less".

**Guardrails (DO NOT):**
- DO NOT fetch from the API — look up prayer by ID in mock data
- DO NOT use `window.confirm()` for delete — use a custom accessible dialog
- DO NOT navigate to a separate page for owner actions — all inline on the detail page
- DO NOT forget the focus trap in DeletePrayerDialog

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerDetail.test.tsx` | integration | Renders full prayer text without truncation |
| `PrayerDetail.test.tsx` | integration | Shows "Back to Prayer Wall" link |
| `PrayerDetail.test.tsx` | integration | Renders all comments (not limited to 5) |
| `PrayerDetail.test.tsx` | integration | Shows 404-style message for unknown prayer ID |
| `MarkAsAnsweredForm.test.tsx` | unit | Expands form on button click |
| `DeletePrayerDialog.test.tsx` | unit | Opens dialog and has cancel/delete buttons |
| `ReportDialog.test.tsx` | unit | Opens dialog with reason textarea |

**Expected state after completion:**
- [ ] `/prayer-wall/:id` renders full prayer with all comments
- [ ] Owner actions work (mark answered, delete)
- [ ] Report dialog works
- [ ] Back link navigates to feed
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 10: Share Dropdown

**Objective:** Build the share functionality with Web Share API on mobile and a dropdown popover on desktop.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/ShareDropdown.tsx` — Share popover/dropdown
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Integrate ShareDropdown

**Details:**

`ShareDropdown.tsx`:
```ts
interface ShareDropdownProps {
  prayerId: string
  prayerContent: string  // for share text generation
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement>  // for positioning
}
```

Share URL: `${window.location.origin}/prayer-wall/${prayerId}`
Share text: `"Please pray with me — ${prayerContent.slice(0, 100)}${prayerContent.length > 100 ? '...' : ''} — Worship Room Prayer Wall"`

Logic:
1. If `navigator.share` is available (mobile), call `navigator.share({ title, text, url })` directly. No dropdown.
2. If not available (desktop), render a dropdown popover positioned below the share button:
   - 📋 **Copy link** — `navigator.clipboard.writeText(url)`, show "Copied!" briefly
   - ✉️ **Email** — `mailto:?subject=...&body=...`
   - 💬 **SMS** — `sms:?body=...` (only on mobile, hide on desktop)
   - Facebook — `https://www.facebook.com/sharer/sharer.php?u=...` (new tab)
   - Twitter/X — `https://twitter.com/intent/tweet?text=...&url=...` (new tab)

Dropdown styling: `absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50`
Each item: `flex items-center gap-3 px-4 py-2 text-sm text-text-dark hover:bg-gray-50 transition-colors w-full`

Close on click outside (use `useEffect` with document click listener).

Update `InteractionBar.tsx`:
- Instead of calling `onShare` callback directly, manage share dropdown state internally
- The share button toggles the dropdown (desktop) or triggers native share (mobile)
- Remove the `onShare` prop from InteractionBarProps

**Guardrails (DO NOT):**
- DO NOT hardcode `worshiproom.com` in share URLs — use `window.location.origin`
- DO NOT generate social share URLs for authenticated services — just open public share pages
- DO NOT show SMS option on desktop (no `navigator.share` detection needed — just `'sms:' in window` or user agent check)
- DO NOT forget to close the dropdown on outside click

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ShareDropdown.test.tsx` | unit | Renders share options when open |
| `ShareDropdown.test.tsx` | unit | Copy link copies URL to clipboard |
| `ShareDropdown.test.tsx` | unit | Email option has correct mailto link |

**Expected state after completion:**
- [ ] Share button opens dropdown on desktop
- [ ] Copy link, email, social share options work
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 11: Public Profile Page

**Objective:** Build the public user profile page with avatar, bio, join date, and three tabs (Prayers, Replies, Reactions).

**Files to create/modify:**
- `frontend/src/pages/PrayerWallProfile.tsx` — Replace stub from Step 6

**Details:**

Uses `useParams()` to get user ID, looks up in `getMockUser(userId)`. Does NOT use `<Layout>` — renders own page wrapper with Navbar (same as PrayerDetail).

Layout:
```
<Navbar />
<main max-w-[720px] mx-auto px-4 py-6>
  <Link to="/prayer-wall"> ← Back to Prayer Wall </Link>

  <header> Profile info section
    <Avatar size="lg" ... />
    <h1> First Name </h1>
    <p> Bio text (Lora italic, text-text-light) </p>
    <p> Joined: January 2026 </p>
  </header>

  <nav role="tablist"> Tab bar
    <button role="tab" aria-selected="true"> Prayers </button>
    <button role="tab"> Replies </button>
    <button role="tab"> Reactions </button>
  </nav>

  <div role="tabpanel">
    {activeTab === 'prayers' && <PrayerList />}
    {activeTab === 'replies' && <RepliesList />}
    {activeTab === 'reactions' && <ReactionsList />}
  </div>
</main>
```

Tabs:
- **Prayers**: Filter mock prayers by `userId`, render using `PrayerCard` (with InteractionBar). Exclude anonymous prayers.
- **Replies**: Filter mock comments by `userId`, render with prayer reference link
- **Reactions**: Filter from mock reactions where `isPraying || isCandleLit`, show prayer preview

Tab bar styling: `flex border-b border-gray-200`. Active tab: `border-b-2 border-primary text-primary font-medium`. Inactive: `text-text-light hover:text-text-dark`.

**Guardrails (DO NOT):**
- DO NOT show anonymous prayers on the profile
- DO NOT show edit controls — that's the dashboard (Step 13)
- DO NOT make this a protected route — public profiles are accessible to everyone

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWallProfile.test.tsx` | integration | Renders user name, avatar, and bio |
| `PrayerWallProfile.test.tsx` | integration | Shows 3 tabs: Prayers, Replies, Reactions |
| `PrayerWallProfile.test.tsx` | integration | Prayers tab shows user's non-anonymous prayers |
| `PrayerWallProfile.test.tsx` | integration | Shows "Back to Prayer Wall" link |
| `PrayerWallProfile.test.tsx` | integration | Shows user not found for invalid ID |

**Expected state after completion:**
- [ ] `/prayer-wall/user/:id` renders profile with info and tabs
- [ ] Tab switching works
- [ ] Anonymous prayers excluded from profile
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 12: Private Dashboard

**Objective:** Build the private dashboard page with editable profile, and five tabs (My Prayers, My Comments, Bookmarks, Reactions, Settings).

**Files to create/modify:**
- `frontend/src/pages/PrayerWallDashboard.tsx` — Replace stub from Step 6

**Details:**

Protected route — if `!isLoggedIn` (from `useAuth()`), render a `<Navigate to="/login?returnTo=/prayer-wall/dashboard" />` redirect.

For testing/development: Add a `MOCK_LOGGED_IN_USER` constant to the mock data file that `useAuth` can optionally return. The `useAuth` hook should be updatable to return a logged-in user for dashboard testing. Simplest approach: use a `mockCurrentUser` export from the mock data file, and have `useAuth` return it when available.

Layout (similar to profile, but with edit controls):
```
<Navbar />
<main max-w-[720px] mx-auto px-4 py-6>
  <Link to="/prayer-wall"> ← Back to Prayer Wall </Link>

  <header> Editable profile section
    <Avatar size="lg" ... />
    <button> Change Photo (coming soon — disabled) </button>
    <h1> First Name <button>Edit</button> </h1>
    <p> Bio <button>Edit</button> </p>
    <p> Joined: January 2026 </p>
  </header>

  <nav role="tablist"> 5 tabs (scroll horizontally on mobile) </nav>

  <div role="tabpanel"> Active tab content </div>
</main>
```

Tabs:
- **My Prayers**: User's prayers with action buttons (Mark as Answered, Delete). Reuse `MarkAsAnsweredForm` and `DeletePrayerDialog` from Step 9.
- **My Comments**: Comments posted on others' prayers with link to the parent prayer
- **Bookmarks**: Bookmarked prayers rendered as `PrayerCard` components
- **Reactions**: Prayers the user has prayed for or lit candles on
- **Settings**:
  - Profile photo: "Change Photo" button with "(Coming soon)" tooltip/label
  - Display name: Inline editable text field
  - Bio: Inline editable textarea (500 char limit)
  - Notification preferences: 5 toggle switches (all default On) with a "Notifications coming soon" banner at the top

Tab bar: Same styling as public profile. On mobile: `overflow-x-auto flex-nowrap` for horizontal scrolling.

Settings notification toggles:
```tsx
<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
  <p className="text-sm text-amber-800">Notifications coming soon</p>
</div>
{NOTIFICATION_TYPES.map(type => (
  <label className="flex items-center justify-between py-3 border-b border-gray-100">
    <span>{type.label}</span>
    <input type="checkbox" defaultChecked className="..." disabled />
  </label>
))}
```

**Guardrails (DO NOT):**
- DO NOT implement real photo upload — show "Coming soon" on the change photo button
- DO NOT wire notification toggles to any backend — just render the UI with a "coming soon" banner
- DO NOT forget to redirect logged-out users to login
- DO NOT make bio editable beyond 500 characters — enforce the limit

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `PrayerWallDashboard.test.tsx` | integration | Renders 5 tabs |
| `PrayerWallDashboard.test.tsx` | integration | My Prayers tab shows user's prayers with action buttons |
| `PrayerWallDashboard.test.tsx` | integration | Settings tab shows notification toggles with "coming soon" banner |
| `PrayerWallDashboard.test.tsx` | integration | "Change Photo" button shows "coming soon" |
| `PrayerWallDashboard.test.tsx` | integration | Redirects to login when logged out |

**Expected state after completion:**
- [ ] `/prayer-wall/dashboard` renders with editable profile and 5 tabs
- [ ] Settings tab shows notification preferences UI
- [ ] Redirects when logged out
- [ ] `pnpm build` succeeds
- [ ] Tests pass

---

### Step 13: Responsive Polish, Animations, and Accessibility Audit

**Objective:** Final pass to ensure responsive behavior at all breakpoints, smooth animations, and accessibility compliance across all prayer wall components.

**Files to modify:**
- Various prayer wall components (responsive fixes as needed)
- `frontend/tailwind.config.js` — Add any missing animation keyframes
- Multiple test files — Add accessibility-focused tests

**Details:**

**Tailwind animation additions** (if not already present):
```js
keyframes: {
  'slide-down': {
    '0%': { maxHeight: '0', opacity: '0' },
    '100%': { maxHeight: '500px', opacity: '1' },
  },
}
```

**Responsive audit checklist:**
- [ ] Mobile (375px): Full-width cards, sticky bottom "Share" button, interaction bar wraps gracefully, comments take full width, profile tabs scroll horizontally
- [ ] Tablet (768px): Cards with side padding, interaction bar fully inline
- [ ] Desktop (1024px+): Feed centered at max 720px, card hover shadows, comfortable spacing

**Accessibility audit checklist:**
- [ ] All interactive elements have `focus-visible:ring-2 focus-visible:ring-primary` (never bare `outline-none`)
- [ ] All buttons have `type="button"` (except submit buttons in forms)
- [ ] Toast uses `role="status"` with `aria-live="polite"`
- [ ] Delete/Report dialogs have `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- [ ] Dialogs have focus trap (useFocusTrap hook)
- [ ] All form inputs have associated `<label>` elements (or `aria-label` for icon-only buttons)
- [ ] `aria-pressed` on toggle buttons (Pray, Candle, Bookmark)
- [ ] `aria-expanded` on Comment toggle button
- [ ] `aria-label` on all icon-only buttons (Share, Bookmark, etc.)
- [ ] Tab panels use `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- [ ] Minimum 44px tap targets on mobile
- [ ] Prayer text uses `<p>` with `whitespace-pre-wrap` (no `dangerouslySetInnerHTML`)
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)

**Final verification:**
- Run `pnpm build` — must succeed
- Run `pnpm test` — all tests must pass
- Run `pnpm lint` — no errors
- Browser test at 375px (mobile), 768px (tablet), 1440px (desktop)

**Guardrails (DO NOT):**
- DO NOT use `focus:outline-none` without a `focus-visible` replacement
- DO NOT add features not in the spec — this is polish only
- DO NOT skip the browser verification at all 3 breakpoints

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Various | unit | Add `aria-*` attribute assertions to existing tests |
| `PrayerWall.test.tsx` | integration | Verify `role="status"` on toast container |
| `InteractionBar.test.tsx` | unit | Verify `aria-pressed` on toggle buttons |
| `CommentsSection.test.tsx` | unit | Verify `aria-expanded` on comment toggle |

**Expected state after completion:**
- [ ] All responsive breakpoints render correctly
- [ ] All animations are smooth (300ms ease for expand/collapse)
- [ ] All accessibility checks pass
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] Browser verified at mobile, tablet, and desktop

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types, Mock Data, and Utility Foundations |
| 2 | 1 | Avatar Component and Toast System |
| 3 | — | Prayer Wall Hero Section |
| 4 | 1, 2 | Prayer Card with Show More/Less and Answered Badge |
| 5 | 1, 2 | Interaction Bar |
| 6 | 1, 2, 3, 4, 5 | Feed Page + Route Wiring |
| 7 | 2, 6 | Inline Post Composer |
| 8 | 1, 2, 6 | Inline Comments Section |
| 9 | 4, 5, 8 | Detail Page |
| 10 | 5 | Share Dropdown |
| 11 | 1, 2, 4, 5 | Public Profile Page |
| 12 | 1, 2, 4, 5, 9 | Private Dashboard |
| 13 | All | Responsive Polish, Animations, and Accessibility Audit |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types, Mock Data, and Utility Foundations | [COMPLETE] | 2026-02-26 | Created `types/prayer-wall.ts`, `mocks/prayer-wall-mock-data.ts` (10 users, 18 prayers, 35 comments, reactions), `hooks/useAuth.ts` stub, `lib/time.ts` (timeAgo + formatFullDate). Tests: 29 new (17 mock data + 12 time). |
| 2 | Avatar Component and Toast System | [COMPLETE] | 2026-02-26 | Created `Avatar.tsx` (initials/image/anonymous variants, deterministic color), `Toast.tsx` (ToastProvider + useToast, auto-dismiss 4s, max 3). Tests: 11 new (7 Avatar + 4 Toast). |
| 3 | Prayer Wall Hero Section | [COMPLETE] | 2026-02-26 | Created `PrayerWallHero.tsx` with inline gradient fading to #F5F5F5. Tests: 3 new. |
| 4 | Prayer Card with Show More/Less and Answered Badge | [COMPLETE] | 2026-02-26 | Created `PrayerCard.tsx` (truncation, show more/less, avatar, author links, showFull prop) and `AnsweredBadge.tsx` (green badge, Lora italic praise). Tests: 12 new (8 PrayerCard + 4 AnsweredBadge). |
| 5 | Interaction Bar | [COMPLETE] | 2026-02-26 | Created `InteractionBar.tsx` with Pray/Candle/Comment/Bookmark/Share, aria-pressed/aria-expanded, logged-out bookmark as Link. Tests: 7 new. |
| 6 | Feed Page + Route Wiring | [COMPLETE] | 2026-02-26 | Created `PrayerWall.tsx` (feed page with hero, cards, interaction bars, pagination, toggle handlers, mobile sticky button), stub pages (`PrayerDetail`, `PrayerWallProfile`, `PrayerWallDashboard`). Updated `App.tsx` with 4 prayer-wall routes. Tests: 6 new. |
| 7 | Inline Post Composer | [COMPLETE] | 2026-02-26 | Created `InlineComposer.tsx` (textarea, auto-grow, anonymous checkbox, char counter, cancel/submit). Integrated into `PrayerWall.tsx` with ToastProvider wrapper. Tests: 7 new. |
| 8 | Inline Comments Section | [COMPLETE] | 2026-02-26 | Created `CommentsSection.tsx` (expand/collapse, max 5 comments, "See more" link), `CommentItem.tsx` (@mention parsing, Reply button), `CommentInput.tsx` (logged-out "Log in to comment" link, Enter to submit). Integrated into `PrayerWall.tsx` feed with `handleSubmitComment` handler. Tests: 12 new (5 CommentsSection + 5 CommentItem + 2 CommentInput). |
| 9 | Detail Page | [COMPLETE] | 2026-02-26 | Replaced `PrayerDetail.tsx` stub with full implementation (useParams lookup, full prayer card with showFull, all comments, back link, 404 state). Created `MarkAsAnsweredForm.tsx`, `DeletePrayerDialog.tsx`, `ReportDialog.tsx`, `useFocusTrap.ts`. Tests: 15 new (5 PrayerDetail + 4 MarkAsAnsweredForm + 3 DeletePrayerDialog + 3 ReportDialog). |
| 10 | Share Dropdown | [COMPLETE] | 2026-02-26 | Created `ShareDropdown.tsx` (Copy link, Email, SMS mobile-only, Facebook, X/Twitter share options, click-outside close). Updated `InteractionBar.tsx` to manage share state internally (native share on mobile, dropdown on desktop). Tests: 4 new (ShareDropdown) + 1 updated (InteractionBar). |
| 11 | Public Profile Page | [COMPLETE] | 2026-02-26 | Replaced `PrayerWallProfile.tsx` stub with full implementation (avatar, name, bio, join date, 3 tabs: Prayers/Replies/Reactions, user not found state). Tests: 6 new. |
| 12 | Private Dashboard | [COMPLETE] | 2026-02-26 | Replaced `PrayerWallDashboard.tsx` stub with full implementation (editable name/bio, change photo placeholder, 5 tabs: My Prayers/My Comments/Bookmarks/Reactions/Settings, notification prefs with "coming soon" banner, login redirect). Tests: 6 new (5 dashboard + 1 redirect). |
| 13 | Responsive Polish, Animations, and Accessibility Audit | [COMPLETE] | 2026-02-26 | Accessibility audit: all `outline-none` have `focus-visible:ring-2` replacements, no `dangerouslySetInnerHTML`, skip-to-content links on all pages. Fixed 13 rules-of-hooks lint errors across PrayerDetail/PrayerWallProfile/PrayerWallDashboard (hooks before early returns). Fixed unused var eslint-disable placements. Final state: 0 lint errors, 274 tests pass, tsc clean, production build clean. Responsive classes verified (mobile sticky button, desktop-only hover shadows, breakpoint-appropriate gaps/padding). Browser automation blocked (Chrome already running) — manual browser testing recommended. |
