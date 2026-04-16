# Implementation Plan: Navbar Restructure

**Spec:** `_specs/navbar-restructure.md`
**Date:** 2026-02-23
**Branch:** `claude/feature/navbar-restructure`

---

## Architecture Context

### Relevant Existing Files
- `frontend/src/components/Navbar.tsx` (452 lines) — Full navbar component with:
  - `NAV_LINKS` array (5 items: Pray `/pray`, Journal, Meditate, Music, Prayer Wall)
  - `CONNECT_LINKS` array (2 items: Churches, Counselors)
  - `ConnectDropdown` component — hover-open dropdown with delay close, escape key, focus management, click-outside close, ARIA attributes (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls="connect-dropdown"`)
  - `DesktopNav` — maps NAV_LINKS + renders ConnectDropdown
  - `MobileDrawer` — flat list of NAV_LINKS, then "Local Support" section heading + CONNECT_LINKS, then auth actions
  - `getNavLinkClass(transparent)` — shared active/hover styling utility for top-level NavLinks
  - `NavbarLogo`, `DesktopAuthActions` — unchanged by this spec
  - `Navbar` — top-level component with transparent mode, hamburger toggle, escape key handling
- `frontend/src/components/__tests__/Navbar.test.tsx` (347 lines) — 29 tests across 6 describe blocks:
  - Logo (1 test)
  - Desktop nav links (2 tests) — checks 5 link labels + "Local Support" dropdown trigger
  - Auth actions (2 tests) — Log In and Get Started
  - Local Support dropdown (10 tests) — open/close/toggle, escape, focus return, outside click, ARIA, hover open/close, routes check (`2 links`, `connect-dropdown` ID)
  - Hamburger menu (9 tests) — open/close, escape, focus return, ARIA, mobile menu content check (7 labels), route change closes
  - Active route (2 tests) — uses `/pray` route, checks `text-primary` + `after:scale-x-100` + `aria-current="page"`

### Directory Conventions
- Components in `frontend/src/components/`
- Tests in `frontend/src/components/__tests__/`
- Uses `@/` path alias for imports

### Component Patterns to Follow
- `cn()` utility for conditional class names (from `@/lib/utils`)
- `NavLink` from react-router-dom for active route detection
- `Link` for non-route-aware links (auth actions)
- Lucide React for icons (`ChevronDown`, `Menu`, `X`)
- `as const` on link arrays for type narrowing
- `useCallback` for memoized handlers
- `useRef` for DOM element references
- Minimum 44px tap targets on mobile (`min-h-[44px]`)
- Focus-visible ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

### Test Patterns to Match
- `renderNavbar(initialRoute?)` helper with `MemoryRouter` + `Routes`
- `screen.getByRole('link' | 'button', { name })` for element queries
- `fireEvent.click` for synchronous clicks, `userEvent.setup()` for async interactions
- `document.getElementById('...')` for dropdown/menu panel access
- `within(container).getAllByRole('link')` for scoped queries
- `vi.useFakeTimers` + `vi.advanceTimersByTime` for hover delay tests
- Tests use `toBeInTheDocument()`, `toHaveAttribute()`, `toHaveLength()`, `.className.toContain()`

### Design Details
- Dropdown background: `bg-white ring-1 ring-black/5` (normal), `bg-white/[0.08] backdrop-blur-xl saturate-[1.8] border border-white/25` (transparent)
- Section headings in mobile drawer: `text-xs font-semibold uppercase tracking-wider text-text-dark`
- Dropdown section heading: `text-xs font-semibold uppercase tracking-wider text-text-light` (#7F8C8D)
- Current dropdown width: `w-44` — needs to widen to `min-w-[220px]` for "Daily Verse & Song"

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/navbar-restructure` is checked out with a clean working directory
- [ ] The current Navbar.tsx has 5 top-level NAV_LINKS and a ConnectDropdown with 2 CONNECT_LINKS (as read during reconnaissance)
- [ ] The routes `/listen`, `/insights`, `/daily` may not have page components yet — that's okay, the navbar just links to them
- [ ] The Pray route change from `/pray` to `/scripture` is intentional and matches the JourneySection update already on main

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dropdown ID | Rename `connect-dropdown` → `explore-dropdown` | Matches new component name and avoids stale references |
| Dropdown width | `min-w-[220px]` | Accommodates "Daily Verse & Song" without truncation |
| Dropdown divider structure | `<li role="separator">` with heading text inside a single `<ul>` | Keeps existing single-list pattern; `role="separator"` communicates grouping to assistive tech |
| Active state on Explore button | Check both `EXPLORE_LINKS` and `LOCAL_SUPPORT_LINKS` | Any child route being active should highlight the parent dropdown trigger |
| Mobile section headings | Use `role="group"` with `aria-labelledby` on wrapper div, heading text as `<span>` with id | Matches existing Local Support pattern in current MobileDrawer |
| Mobile EXPLORE heading | New `role="group"` section between NAV_LINKS and LOCAL_SUPPORT | Spec requires "EXPLORE" and "LOCAL SUPPORT" as distinct sections |

---

## Implementation Steps

### Step 1: Update Navbar Component

**Objective:** Restructure link arrays, rename and expand the dropdown, and reorganize the mobile drawer to match the new navigation structure.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — All changes in this one file

**Details:**

**1a. Replace link arrays** (lines 6-17):
```typescript
const NAV_LINKS = [
  { label: 'Pray', to: '/scripture' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Listen', to: '/listen' },
] as const

const EXPLORE_LINKS = [
  { label: 'Music', to: '/music' },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Reflect', to: '/insights' },
  { label: 'Daily Verse & Song', to: '/daily' },
] as const

const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/churches' },
  { label: 'Counselors', to: '/counselors' },
] as const
```

**1b. Rename `ConnectDropdown` → `ExploreDropdown`** (line 55):
- Rename the function
- Rename `isConnectActive` → `isExploreActive`, check both arrays: `[...EXPLORE_LINKS, ...LOCAL_SUPPORT_LINKS].some(...)`
- Change trigger button text: `Local Support` → `Explore`
- Change `aria-controls` value: `connect-dropdown` → `explore-dropdown`
- Change dropdown `<ul>` id: `connect-dropdown` → `explore-dropdown`
- Widen dropdown container: `w-44` → `min-w-[220px]`
- Replace single `CONNECT_LINKS.map(...)` with: `EXPLORE_LINKS.map(...)`, then a separator `<li>`, then `LOCAL_SUPPORT_LINKS.map(...)`

The separator `<li>` inside the `<ul>`:
```tsx
<li role="separator" aria-hidden="true" className="mx-3 my-1 border-t border-gray-200 pt-2">
  <span className="block px-1 text-xs font-semibold uppercase tracking-wider text-text-light">
    Local Support
  </span>
</li>
```

**1c. Update `DesktopNav`** (line 229):
- Change `ConnectDropdown` → `ExploreDropdown`

**1d. Restructure `MobileDrawer`** (lines 270-368):
- Top section: render `NAV_LINKS` (now 4 items: Pray, Journal, Meditate, Listen)
- Add "EXPLORE" section with `role="group"` and `aria-labelledby="explore-heading"`:
  ```tsx
  <div className="mt-2 border-t border-gray-100 pt-2" role="group" aria-labelledby="explore-heading">
    <span id="explore-heading" className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark">
      Explore
    </span>
    {EXPLORE_LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} onClick={onClose} className={...}>
        {link.label}
      </NavLink>
    ))}
  </div>
  ```
- Rename existing "LOCAL SUPPORT" section to use `LOCAL_SUPPORT_LINKS`:
  ```tsx
  <div className="mt-2 border-t border-gray-100 pt-2" role="group" aria-labelledby="local-support-heading">
    <span id="local-support-heading" className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark">
      Local Support
    </span>
    {LOCAL_SUPPORT_LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} onClick={onClose} className={...}>
        {link.label}
      </NavLink>
    ))}
  </div>
  ```
- Auth actions remain at the bottom (unchanged)
- Mobile drawer NavLink styling for section items: use same `pl-6` indent pattern from current Local Support section

**Guardrails (DO NOT):**
- Do NOT change `NavbarLogo`, `DesktopAuthActions`, or the main `Navbar` component structure
- Do NOT change the glassmorphic pill styling, transparent mode logic, or animation transitions
- Do NOT change the hover-open/delay-close/escape/focus-return/click-outside behavior — only rename references
- Do NOT remove `getNavLinkClass` — it's still used by `DesktopNav` for top-level links
- Do NOT change the hamburger button behavior or mobile drawer open/close logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (deferred to Step 2) | — | All test updates in Step 2 |

**Expected state after completion:**
- [ ] `pnpm build` compiles without errors
- [ ] Desktop nav shows 4 top-level links: Pray, Journal, Meditate, Listen
- [ ] Desktop "Explore" dropdown shows 6 links in 2 groups with divider
- [ ] Mobile drawer shows all links organized under EXPLORE and LOCAL SUPPORT headings
- [ ] All existing keyboard, focus, and ARIA behaviors preserved

---

### Step 2: Update Navbar Tests

**Objective:** Update all test assertions to match the new link structure, dropdown name, and mobile drawer organization.

**Files to modify:**
- `frontend/src/components/__tests__/Navbar.test.tsx` — All changes in this one file

**Details:**

**2a. Desktop nav links describe block** (lines 27-42):
- Change test name: `'renders 5 flat nav links'` → `'renders 4 top-level nav links'`
- Update links array: `['Pray', 'Journal', 'Meditate', 'Listen']`
- Change test name: `'renders "Local Support" dropdown trigger'` → `'renders "Explore" dropdown trigger'`
- Update button name matcher: `/local support/i` → `/explore/i`

**2b. Rename describe block** (line 64):
- `'Local Support dropdown'` → `'Explore dropdown'`

**2c. Update all dropdown tests** (lines 65-208):
- All `screen.getByRole('button', { name: /local support/i })` → `screen.getByRole('button', { name: /explore/i })`
- `'dropdown is closed by default'` test: Change `screen.queryByText('Churches')` → `screen.queryByText('Music')` (Music is the first explore link, visible when dropdown opens)
- `'clicking the trigger opens the dropdown'` test: Check for `'Music'` and `'Churches'` (one from each group)
- `'clicking the trigger again closes the dropdown'` test: Use `'Music'` instead of `'Churches'` for open/close checks
- `'dropdown links point to correct routes'` test:
  - Update ID: `document.getElementById('explore-dropdown')`
  - Update expected links: 6 links total with routes `/music`, `/prayer-wall`, `/insights`, `/daily`, `/churches`, `/counselors`
- `'Escape key closes the dropdown'` test: Use `'Music'` for open/close check
- `'Escape key returns focus to the trigger'` test: Use `'Music'` for open check, update trigger query
- `'outside click closes the dropdown'` test: Use `'Music'` for open/close check
- `'trigger has aria-haspopup="menu" and correct aria-expanded'` test: Update trigger query
- `'aria-controls is only set when dropdown is open'` test: Update trigger query + expected value `'explore-dropdown'`
- `'dropdown panel uses ul/li'` test: Update ID to `'explore-dropdown'`, update expected `<li>` count to 7 (4 explore + 1 separator + 2 local support)
- `'hovering over the wrapper opens the dropdown'` test: Update trigger query, check for `'Music'`
- `'unhovering the wrapper closes the dropdown after delay'` test: Update trigger query, use `'Music'` for open/close checks

**2d. Mobile menu tests** (lines 298-331):
- `'mobile menu contains all nav links and connect links'` test: Update `allLabels` to:
  ```typescript
  const allLabels = [
    'Pray', 'Journal', 'Meditate', 'Listen',
    'Music', 'Prayer Wall', 'Reflect', 'Daily Verse & Song',
    'Churches', 'Counselors',
  ]
  ```

**2e. Active route tests** (lines 333-346):
- Change initial route: `renderNavbar('/pray')` → `renderNavbar('/scripture')`
- Change link query: `screen.getByRole('link', { name: 'Pray' })` (label stays "Pray", only route changed)

**Guardrails (DO NOT):**
- Do NOT change Logo, Auth actions, or Hamburger menu tests (except the mobile menu content test)
- Do NOT add new test cases beyond what's specified — only update existing tests to match the new structure
- Do NOT change the test helper `renderNavbar()` function

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Desktop nav links - 4 top-level links | unit | Verifies Pray, Journal, Meditate, Listen visible |
| Desktop nav links - Explore trigger | unit | Verifies "Explore" dropdown button present |
| Explore dropdown - all 10 tests | unit | Open/close/toggle, escape, focus, ARIA, hover, routes (6 links) |
| Mobile menu content | unit | All 10 link labels present (4 nav + 4 explore + 2 local support) |
| Active route | unit | `/scripture` route highlights "Pray" link |

**Expected state after completion:**
- [ ] `pnpm test` — all tests pass (0 failures)
- [ ] `pnpm lint` — no lint errors
- [ ] No test count change (still 29 tests, just updated assertions)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update Navbar component (links, dropdown, mobile drawer) |
| 2 | 1 | Update Navbar tests to match new structure |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update Navbar Component | [COMPLETE] | 2026-02-23 | Modified `frontend/src/components/Navbar.tsx`: replaced NAV_LINKS (5→4, `/pray`→`/scripture`, added `/listen`), added EXPLORE_LINKS (4 items) + LOCAL_SUPPORT_LINKS (2 items), renamed ConnectDropdown→ExploreDropdown, widened dropdown to min-w-[220px], added separator `<li>` with "Local Support" heading, restructured MobileDrawer with EXPLORE + LOCAL SUPPORT sections |
| 2 | Update Navbar Tests | [COMPLETE] | 2026-02-23 | Modified `frontend/src/components/__tests__/Navbar.test.tsx`: updated desktop links (5→4), renamed dropdown describe/queries (`/local support/i`→`/explore/i`), updated dropdown ID (`connect-dropdown`→`explore-dropdown`), updated route checks (6 links), updated li count (7), mobile menu labels (10 total), active route (`/pray`→`/scripture`). All 29 tests pass. |
