# Implementation Plan: Navbar Restructure V2

**Spec:** `_specs/navbar-restructure-v2.md`
**Date:** 2026-02-23
**Branch:** `claude/feature/navbar-restructure-v2`

---

## Architecture Context

### Relevant Existing Files
- `frontend/src/components/Navbar.tsx` (517 lines) — Single file containing: data arrays (`NAV_LINKS`, `EXPLORE_LINKS`, `LOCAL_SUPPORT_LINKS`), helper functions (`getNavLinkClass`, `NavbarLogo`), `ExploreDropdown` component (full dropdown behavior with hover/escape/click-outside/blur/route-change handling), `DesktopNav`, `DesktopAuthActions`, `MobileDrawer`, and the root `Navbar` export.
- `frontend/src/components/__tests__/Navbar.test.tsx` (355 lines) — 29 tests across 6 describe blocks: Logo (1), Desktop nav links (2), Auth actions (2), Explore dropdown (12), Hamburger menu (11), Active route (2).
- `frontend/src/components/Layout.tsx` (17 lines) — Wraps pages with `<Navbar />` (non-transparent) + padded main.
- `frontend/src/pages/Home.tsx` — Uses `<Navbar transparent />` for hero.

### Current Navigation Structure
- **NAV_LINKS** (4): Pray → /scripture, Journal → /journal, Meditate → /meditate, Listen → /listen
- **EXPLORE_LINKS** (4): Music → /music, Prayer Wall → /prayer-wall, Reflect → /insights, Daily Verse & Song → /daily
- **LOCAL_SUPPORT_LINKS** (2): Churches → /churches, Counselors → /counselors
- **Desktop**: 4 top-level NavLinks + 1 ExploreDropdown (containing EXPLORE_LINKS + separator + LOCAL_SUPPORT_LINKS)
- **Mobile**: 4 nav links, then EXPLORE group, then LOCAL SUPPORT group, then auth buttons

### Target Navigation Structure
- **DAILY_LINKS** (4): Pray → /scripture, Journal → /journal, Meditate → /meditate, Verse & Song → /daily
- **NAV_LINKS** (2): Music → /music, Prayer Wall → /prayer-wall
- **LOCAL_SUPPORT_LINKS** (2): Churches → /churches, Counselors → /counselors
- **Desktop**: DailyDropdown (split NavLink+chevron) + 2 top-level NavLinks + LocalSupportDropdown (split NavLink+chevron)
- **Mobile**: DAILY group, then standalone Music + Prayer Wall links, then LOCAL SUPPORT group, then auth buttons

### Key Design Pattern: Split-Trigger Dropdown
Both new dropdowns use a **split-trigger** pattern that differs from the current ExploreDropdown:
- A `NavLink` for the label text (navigates on click)
- A `button` with a `ChevronDown` icon (toggles the dropdown panel on click)
- The outer wrapper `div` handles hover open/close (same as current)
- The underline animation lives on the outer wrapper (spans under both label + chevron)

### Component Patterns to Follow
- Named exports, PascalCase filenames
- `cn()` utility for conditional class names
- TailwindCSS for all styling
- `NavLink` from react-router-dom for active route detection
- `aria-haspopup="true"`, `aria-expanded`, `aria-controls` for dropdown triggers
- `role="group"` with `aria-labelledby` for mobile drawer sections
- `min-h-[44px]` for mobile tap targets

### Test Patterns to Match
- Vitest + React Testing Library
- `MemoryRouter` wrapper with `Routes`/`Route` for route-aware tests
- `renderNavbar(initialRoute)` helper
- `screen.getByRole`, `within()`, `fireEvent.click`, `userEvent`
- `vi.useFakeTimers` for hover delay tests
- `describe`/`it`/`expect` from vitest

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/navbar-restructure-v2` is checked out with a clean working directory
- [ ] The current `Navbar.tsx` has the `ExploreDropdown` component (not still the old `ConnectDropdown` or `LocalSupportDropdown` — it was renamed in the previous restructure)
- [ ] The `getNavLinkClass` helper, `NavbarLogo`, `DesktopAuthActions`, and root `Navbar` component will remain unchanged except for `DesktopNav` and `MobileDrawer` references
- [ ] The `/listen` route and placeholder page can remain in `App.tsx` even though "Listen" is removed from the navbar

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dropdown behavior duplication | Duplicate the state/effect logic in both `DailyDropdown` and `LocalSupportDropdown` rather than extracting a shared hook | Both components are self-contained in the same file, the logic is stable, and a hook extraction adds indirection without clear reuse benefit outside this file. If a third dropdown is needed later, extract then. |
| Underline placement for split triggers | Apply `after:` pseudo-element underline on the outer wrapper div, not the NavLink | The underline should span under both the label text and chevron for visual consistency with other nav items |
| "Verse & Song" label | Use "Verse & Song" (not "Daily Verse & Song") | Shorter label, and the dropdown is already labeled "Daily" — avoids redundancy |
| Dropdown panel widths | `min-w-[180px]` for DailyDropdown, `min-w-[200px]` for LocalSupportDropdown | Sized to fit longest label in each dropdown without excessive whitespace |
| Mobile standalone links | Music and Prayer Wall rendered without a section heading, with border-top separator | They're not part of a named group — they're top-level items shown between the two grouped sections |
| Active detection for dropdowns | `DAILY_LINKS.some(link => location.pathname === link.to)` | Highlights the Daily trigger when user is on any daily route. Same pattern for Local Support. |
| Remove "Listen" from navbar | Yes, remove from all link arrays | Matches CLAUDE.md: audio features are distributed, no standalone Listen page in nav |
| Remove "Reflect" from navbar | Yes, remove from all link arrays | Matches CLAUDE.md: Mood Insights accessible from dashboard + user dropdown only |

---

## Implementation Steps

### Step 1: Restructure Navbar Component

**Objective:** Replace the current navigation layout (4 top-level links + 1 Explore dropdown) with the new layout (Daily dropdown, 2 top-level links, Local Support dropdown). Update the mobile drawer to match.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Replace data arrays, replace `ExploreDropdown` with `DailyDropdown` + `LocalSupportDropdown`, update `DesktopNav`, restructure `MobileDrawer`

**Details:**

#### 1a. Replace data arrays (lines 6–23)

Delete the current `NAV_LINKS`, `EXPLORE_LINKS`, and `LOCAL_SUPPORT_LINKS` arrays. Replace with:

```tsx
const DAILY_LINKS = [
  { label: 'Pray', to: '/scripture' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Verse & Song', to: '/daily' },
] as const

const NAV_LINKS = [
  { label: 'Music', to: '/music' },
  { label: 'Prayer Wall', to: '/prayer-wall' },
] as const

const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/churches' },
  { label: 'Counselors', to: '/counselors' },
] as const
```

#### 1b. Replace `ExploreDropdown` with `DailyDropdown` (lines 61–252)

Delete the entire `ExploreDropdown` function. Replace with `DailyDropdown`:

The component uses the **split-trigger** pattern:
- Outer wrapper `div` with `ref`, hover handlers (`onMouseEnter={open}`, `onMouseLeave={closeWithDelay}`), `onBlur={handleBlur}`, and the underline `after:` pseudo-element
- Inside: a `NavLink to="/daily"` with text "Daily" (just text styling, no underline) + a `button` with `ChevronDown` (aria-label="Daily menu", aria-haspopup="true", aria-expanded, aria-controls="daily-dropdown")
- Dropdown panel: `<ul id="daily-dropdown">` containing `DAILY_LINKS` mapped to `<li><NavLink>` items

State and effects are identical to the current `ExploreDropdown`:
- `useState(false)` for `isOpen`
- `useRef` for `closeTimerRef`, `wrapperRef`, `triggerRef`
- `useLocation()` for route change detection
- `open`, `closeWithDelay`, `close` callbacks (same logic, same 150ms delay)
- Effects: close on route change, close on Escape + return focus to `triggerRef`, close on outside click, close on focus leaving wrapper, cleanup timer on unmount

Active detection: `const isDailyActive = DAILY_LINKS.some(link => location.pathname === link.to)`

Wrapper div className (carries the underline):
```tsx
className={cn(
  'relative flex items-center py-2',
  "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
  transparent ? 'after:bg-white' : 'after:bg-primary',
  isDailyActive
    ? 'after:scale-x-100'
    : 'after:scale-x-0 hover:after:scale-x-100'
)}
```

NavLink className (text only, no underline):
```tsx
className={cn(
  'text-sm font-medium transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
  isDailyActive
    ? transparent ? 'text-white' : 'text-primary'
    : transparent
      ? 'text-white/90 hover:text-white'
      : 'text-text-dark hover:text-primary'
)}
```

Chevron button className:
```tsx
className={cn(
  'ml-0.5 rounded p-0.5 transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  isDailyActive
    ? transparent ? 'text-white' : 'text-primary'
    : transparent
      ? 'text-white/90 hover:text-white'
      : 'text-text-dark hover:text-primary'
)}
```

Dropdown panel (same glassmorphic styling as current):
```tsx
{isOpen && (
  <div className="absolute left-0 top-full min-w-[180px] pt-2">
    <ul
      id="daily-dropdown"
      className={cn(
        'rounded-md py-1 shadow-lg',
        transparent
          ? 'bg-white/[0.08] backdrop-blur-xl saturate-[1.8] border border-white/25 ring-0'
          : 'bg-white ring-1 ring-black/5'
      )}
    >
      {DAILY_LINKS.map((link) => (
        <li key={link.to}>
          <NavLink
            to={link.to}
            className={({ isActive }) =>
              cn(
                'min-h-[44px] flex items-center px-4 py-2 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                transparent
                  ? isActive
                    ? 'text-white bg-white/10'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                  : isActive
                    ? 'bg-primary/5 text-primary'
                    : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
              )
            }
          >
            {link.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </div>
)}
```

#### 1c. Add `LocalSupportDropdown` (after `DailyDropdown`)

Create `LocalSupportDropdown` following the exact same pattern as `DailyDropdown` with these differences:
- NavLink `to="/churches"` with text "Local Support"
- Chevron button `aria-label="Local Support menu"`
- `aria-controls="local-support-dropdown"` (when open)
- `const isLocalSupportActive = LOCAL_SUPPORT_LINKS.some(link => location.pathname === link.to)`
- Dropdown panel `id="local-support-dropdown"`, `min-w-[200px]`
- Maps `LOCAL_SUPPORT_LINKS` instead of `DAILY_LINKS`

Everything else (state, effects, styling classes, glassmorphic dropdown panel) is identical to `DailyDropdown`.

#### 1d. Update `DesktopNav` (lines 254–265)

Replace the current body with:
```tsx
function DesktopNav({ transparent }: { transparent: boolean }) {
  return (
    <div className="hidden items-center gap-6 lg:flex">
      <DailyDropdown transparent={transparent} />
      {NAV_LINKS.map((link) => (
        <NavLink key={link.to} to={link.to} className={getNavLinkClass(transparent)}>
          {link.label}
        </NavLink>
      ))}
      <LocalSupportDropdown transparent={transparent} />
    </div>
  )
}
```

#### 1e. Restructure `MobileDrawer` (lines 303–433)

Replace the content inside the drawer panel's `<div className="flex flex-col px-4 py-4">` with:

1. **Daily section** — `role="group"` with `aria-labelledby="daily-heading"`:
```tsx
<div role="group" aria-labelledby="daily-heading">
  <span
    id="daily-heading"
    className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark"
  >
    Daily
  </span>
  {DAILY_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/5 text-primary'
            : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
        )
      }
    >
      {link.label}
    </NavLink>
  ))}
</div>
```

2. **Standalone links** (Music, Prayer Wall) — with border-top separator, no section heading:
```tsx
<div className="mt-2 border-t border-gray-100 pt-2">
  {NAV_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/5 text-primary'
            : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
        )
      }
    >
      {link.label}
    </NavLink>
  ))}
</div>
```

3. **Local Support section** — `role="group"` with `aria-labelledby="local-support-heading"`:
```tsx
<div
  className="mt-2 border-t border-gray-100 pt-2"
  role="group"
  aria-labelledby="local-support-heading"
>
  <span
    id="local-support-heading"
    className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark"
  >
    Local Support
  </span>
  {LOCAL_SUPPORT_LINKS.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'min-h-[44px] flex items-center rounded-md px-3 pl-6 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/5 text-primary'
            : 'text-text-dark hover:bg-neutral-bg hover:text-primary'
        )
      }
    >
      {link.label}
    </NavLink>
  ))}
</div>
```

4. **Auth actions** — keep the existing auth actions block unchanged (lines 407–427).

**Guardrails (DO NOT):**
- Do NOT change `getNavLinkClass`, `NavbarLogo`, `DesktopAuthActions`, or root `Navbar` component
- Do NOT change the glassmorphic pill styling, transparent mode, or overall `<nav>` structure
- Do NOT change the hamburger button or its aria attributes
- Do NOT add any API calls, state management beyond existing patterns, or user input handling
- Do NOT use `dangerouslySetInnerHTML`
- Do NOT change the 150ms hover close delay value

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (deferred to Step 2) | — | All tests in Step 2 |

**Expected state after completion:**
- [ ] `pnpm build` compiles without errors
- [ ] `pnpm lint` has no new lint errors
- [ ] Desktop navbar shows: logo, Daily dropdown, Music, Prayer Wall, Local Support dropdown, Log In, Get Started
- [ ] Clicking "Daily" text navigates to /daily
- [ ] Hovering the Daily chevron opens a dropdown with Pray, Journal, Meditate, Verse & Song
- [ ] Clicking "Local Support" text navigates to /churches
- [ ] Hovering the Local Support chevron opens a dropdown with Churches, Counselors
- [ ] Mobile drawer shows DAILY section, Music, Prayer Wall, LOCAL SUPPORT section, auth buttons

---

### Step 2: Update Navbar Tests

**Objective:** Rewrite all test assertions to match the new navigation structure. Verify both dropdowns, new top-level links, updated mobile drawer, and active route detection.

**Files to modify:**
- `frontend/src/components/__tests__/Navbar.test.tsx` — Update all 6 describe blocks

**Details:**

#### 2a. "Desktop nav links" describe block (lines 27–42)

Replace "renders 4 top-level nav links" test:
```tsx
it('renders 2 top-level nav links', () => {
  renderNavbar()
  const links = ['Music', 'Prayer Wall']
  for (const label of links) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
  }
})
```

Replace "renders 'Explore' dropdown trigger" test:
```tsx
it('renders "Daily" and "Local Support" dropdown triggers', () => {
  renderNavbar()
  expect(
    screen.getByRole('button', { name: /daily menu/i })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /local support menu/i })
  ).toBeInTheDocument()
})
```

#### 2b. Replace "Explore dropdown" describe block (lines 64–212) with TWO blocks

**"Daily dropdown" describe block** — 13 tests:

```tsx
describe('Daily dropdown', () => {
  it('"Daily" label is a link to /daily', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: 'Daily' })
    expect(link).toHaveAttribute('href', '/daily')
  })

  it('dropdown is closed by default', () => {
    renderNavbar()
    expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
  })

  it('clicking the chevron opens the dropdown', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
    expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
  })

  it('clicking the chevron again closes the dropdown', () => {
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /daily menu/i })
    fireEvent.click(trigger)
    expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
  })

  it('dropdown links point to correct routes', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
    const dropdown = document.getElementById('daily-dropdown')!
    const links = within(dropdown).getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(links[0]).toHaveAttribute('href', '/scripture')
    expect(links[1]).toHaveAttribute('href', '/journal')
    expect(links[2]).toHaveAttribute('href', '/meditate')
    expect(links[3]).toHaveAttribute('href', '/daily')
  })

  it('Escape key closes the dropdown', async () => {
    const user = userEvent.setup()
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
    expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
  })

  it('Escape key returns focus to the chevron trigger', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /daily menu/i })
    fireEvent.click(trigger)
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(trigger)
  })

  it('outside click closes the dropdown', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
    expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByLabelText('Main navigation'))
    expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
  })

  it('chevron trigger has aria-haspopup="true" and correct aria-expanded', () => {
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /daily menu/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('aria-controls is only set when dropdown is open', () => {
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /daily menu/i })
    expect(trigger).not.toHaveAttribute('aria-controls')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-controls', 'daily-dropdown')
  })

  it('dropdown panel uses ul/li with no ARIA role override', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /daily menu/i }))
    const dropdown = document.getElementById('daily-dropdown')!
    expect(dropdown.tagName).toBe('UL')
    expect(dropdown).not.toHaveAttribute('role')
    const links = within(dropdown).getAllByRole('link')
    expect(links).toHaveLength(4)
  })

  it('hovering over the wrapper opens the dropdown', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /daily menu/i })
    const wrapper = trigger.closest('[onmouseenter]') || trigger.parentElement!.closest('.relative')!
    await user.hover(wrapper)
    expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
  })

  it('unhovering the wrapper closes the dropdown after delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    try {
      renderNavbar()
      const trigger = screen.getByRole('button', { name: /daily menu/i })
      const wrapper = trigger.parentElement!.closest('.relative')!
      await user.hover(wrapper)
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
      await user.unhover(wrapper)
      expect(document.getElementById('daily-dropdown')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.getElementById('daily-dropdown')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
```

**"Local Support dropdown" describe block** — 6 tests:

```tsx
describe('Local Support dropdown', () => {
  it('"Local Support" label is a link to /churches', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: 'Local Support' })
    expect(link).toHaveAttribute('href', '/churches')
  })

  it('dropdown is closed by default', () => {
    renderNavbar()
    expect(document.getElementById('local-support-dropdown')).not.toBeInTheDocument()
  })

  it('clicking the chevron opens the dropdown', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /local support menu/i }))
    expect(document.getElementById('local-support-dropdown')).toBeInTheDocument()
  })

  it('clicking the chevron again closes the dropdown', () => {
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /local support menu/i })
    fireEvent.click(trigger)
    expect(document.getElementById('local-support-dropdown')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(document.getElementById('local-support-dropdown')).not.toBeInTheDocument()
  })

  it('dropdown links point to correct routes', () => {
    renderNavbar()
    fireEvent.click(screen.getByRole('button', { name: /local support menu/i }))
    const dropdown = document.getElementById('local-support-dropdown')!
    const links = within(dropdown).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/churches')
    expect(links[1]).toHaveAttribute('href', '/counselors')
  })

  it('chevron trigger has correct ARIA attributes', () => {
    renderNavbar()
    const trigger = screen.getByRole('button', { name: /local support menu/i })
    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', 'local-support-dropdown')
  })
})
```

#### 2c. Update "mobile menu contains all nav links" test (line 302–324)

Replace the labels list:
```tsx
it('mobile menu contains all nav links', async () => {
  const user = userEvent.setup()
  renderNavbar()
  await user.click(screen.getByRole('button', { name: 'Open menu' }))
  const menu = document.getElementById('mobile-menu')!
  const allLabels = [
    'Pray',
    'Journal',
    'Meditate',
    'Verse & Song',
    'Music',
    'Prayer Wall',
    'Churches',
    'Counselors',
  ]
  for (const label of allLabels) {
    expect(within(menu).getByText(label)).toBeInTheDocument()
  }
})
```

#### 2d. Update "Active route" describe block (lines 340–353)

Update to test /scripture route activating the Daily dropdown trigger area:
```tsx
describe('Active route', () => {
  it('active top-level link has active styling', () => {
    renderNavbar('/music')
    const musicLink = screen.getByRole('link', { name: 'Music' })
    expect(musicLink.className).toContain('text-primary')
    expect(musicLink.className).toContain('after:scale-x-100')
  })

  it('active route link has aria-current="page"', () => {
    renderNavbar('/music')
    const musicLink = screen.getByRole('link', { name: 'Music' })
    expect(musicLink).toHaveAttribute('aria-current', 'page')
  })
})
```

**Guardrails (DO NOT):**
- Do NOT change the `renderNavbar` helper function signature
- Do NOT add navigation behavior tests (these are render/interaction tests)
- Do NOT mock any dependencies
- Do NOT add tests for Layout or other components
- Do NOT remove hamburger menu behavioral tests (open/close, Escape, focus return, ARIA attributes)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Desktop nav - 2 top-level links | unit | Music and Prayer Wall links present |
| Desktop nav - dropdown triggers | unit | Daily menu and Local Support menu buttons present |
| Daily - label links to /daily | unit | "Daily" NavLink has href="/daily" |
| Daily - closed by default | unit | daily-dropdown not in DOM |
| Daily - click opens | unit | Click chevron → dropdown appears |
| Daily - click closes | unit | Click chevron twice → dropdown disappears |
| Daily - correct routes | unit | 4 links with correct hrefs |
| Daily - Escape closes | unit | Escape key closes dropdown |
| Daily - Escape returns focus | unit | Focus returns to chevron after Escape |
| Daily - outside click closes | unit | mouseDown outside closes dropdown |
| Daily - ARIA attributes | unit | haspopup, expanded, controls |
| Daily - aria-controls conditional | unit | Only set when open |
| Daily - panel structure | unit | ul/li, 4 links, no role override |
| Daily - hover opens | unit | Hover wrapper → dropdown appears |
| Daily - unhover closes with delay | unit | Unhover → 150ms delay → closes |
| Local Support - label links to /churches | unit | "Local Support" NavLink has href="/churches" |
| Local Support - closed by default | unit | local-support-dropdown not in DOM |
| Local Support - click opens | unit | Click chevron → dropdown appears |
| Local Support - click closes | unit | Click twice → closes |
| Local Support - correct routes | unit | 2 links: /churches, /counselors |
| Local Support - ARIA attributes | unit | haspopup, expanded, controls |
| Mobile - all labels | unit | 8 labels: Pray, Journal, Meditate, Verse & Song, Music, Prayer Wall, Churches, Counselors |
| Active - top-level link styling | unit | /music → Music link has active classes |
| Active - aria-current | unit | /music → Music link has aria-current="page" |

**Expected state after completion:**
- [ ] `pnpm test` — all tests pass (new count: ~38 tests replacing the previous 29)
- [ ] `pnpm lint` — no lint errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Restructure Navbar component |
| 2 | 1 | Update Navbar tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Restructure Navbar Component | [COMPLETE] | 2026-02-23 | Modified `frontend/src/components/Navbar.tsx`: replaced data arrays (DAILY_LINKS, NAV_LINKS, LOCAL_SUPPORT_LINKS), replaced ExploreDropdown with DailyDropdown + LocalSupportDropdown (split-trigger: NavLink + chevron button), updated DesktopNav layout, restructured MobileDrawer with Daily/standalone/Local Support sections |
| 2 | Update Navbar Tests | [COMPLETE] | 2026-02-23 | Modified `frontend/src/components/__tests__/Navbar.test.tsx`: replaced Explore dropdown tests (12) with Daily dropdown (13) + Local Support dropdown (6), updated desktop links (4→2), updated mobile menu labels (10→8), updated active route tests (/scripture→/music). 36 Navbar tests, 73 total pass. |
