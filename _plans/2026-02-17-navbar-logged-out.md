# Plan: Logged-Out Navigation Bar
**Spec**: `_specs/navbar-logged-out.md`
**Branch**: `claude/feature/navbar-logged-out`
**Date**: 2026-02-17

---

## Decision Log
- **2026-02-17**: Reduced top-level nav links from 8 flat to 5 flat + "Connect ▾" dropdown. Prayer Wall, Churches, and Counselors share "people/community/help" intent. Meditate kept top-level as a core content mode.
- **2026-02-17**: Dropdown opens on hover (desktop) with click as fallback. Wrapper `div` pattern used to prevent premature close when moving mouse from trigger to panel. Panel uses `<ul>/<li>` — no `role="menu"` to avoid arrow-key keyboard contract.

---

## Context
The app has no navigation bar yet. Every page uses a minimal `Layout.tsx` that only provides a gradient background and a centered container — no branding, no links, no auth actions. This plan creates the logged-out NavBar as the app's first persistent UI chrome, establishing the visual identity of Worship Room and enabling users to navigate freely without logging in.

---

## Step 1 — Tailwind Design Tokens (Do First)

**File**: `frontend/tailwind.config.js`

Add to `theme.extend`:

```js
colors: {
  'primary':    '#4A90E2',
  'primary-lt': '#5BA3F5',
  'neutral-bg': '#F5F5F5',
  'text-dark':  '#2C3E50',
  'text-light': '#7F8C8D',
  'success':    '#27AE60',
  'warning':    '#F39C12',
  'danger':     '#E74C3C',
},
fontFamily: {
  sans:  ['Inter', 'ui-sans-serif', 'system-ui'],
  serif: ['Lora', 'ui-serif', 'Georgia'],
}
```

**File**: `frontend/index.html`

Add Google Fonts `<link>` tags in `<head>` for Inter (weights 400, 500, 600, 700) and Lora (weights 400, 400 italic, 700).

---

## Step 2 — Navbar Component

**File to create**: `frontend/src/components/Navbar.tsx`

Single file with all sub-components defined inline (they are tightly coupled and not reused elsewhere):

```
<Navbar>
  ├── <NavbarLogo />         — icon + "Worship Room" wordmark, wraps in <Link to="/">
  ├── <DesktopNav />         — horizontal NavLinks + ConnectDropdown (visible ≥1024px only)
  │     ├── 5 flat NavLinks (Pray, Music, Journal, Daily, Meditate)
  │     └── <ConnectDropdown /> — "Connect ▾" trigger + dropdown panel
  ├── <DesktopAuthActions /> — "Log In" + "Get Started" button (visible ≥1024px only)
  ├── <HamburgerButton />    — three-line icon button (visible <1024px)
  └── <MobileDrawer />       — full-width slide-down overlay (<1024px)
        ├── 5 flat nav links
        ├── Connect section header + 3 indented links (Prayer Wall, Churches, Counselors)
        └── auth actions (Log In + Get Started)
```

### Logo
- Use Lucide `Sunrise` icon (24px, `text-primary`) beside "Worship Room" in Inter Semi-bold
- If `Sunrise` is not available in the installed version (`lucide-react@0.356.0`), fall back to a simple inline SVG cross
- Whole logo wraps in `<Link to="/">` with `aria-label="Worship Room home"`

### Navigation Links
Use React Router's `<NavLink>` (not `<Link>`) — it exposes `isActive` for automatic active styling.

**Top-level (flat, 5 links):**

| Label | Route |
|-------|-------|
| Pray | `/pray` |
| Music | `/music` |
| Journal | `/journal` |
| Daily | `/daily` |
| Meditate | `/meditate` |

**Connect ▾ dropdown (3 links):**

| Label | Route |
|-------|-------|
| Prayer Wall | `/prayer-wall` |
| Churches | `/churches` |
| Counselors | `/counselors` |

- **Active flat link**: `border-b-2 border-primary text-primary`
- **Inactive flat link**: `text-text-dark hover:text-primary`
- **Focus**: `focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded`

### Connect Dropdown State
```ts
const [isDropdownOpen, setIsDropdownOpen] = useState(false)
const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**Opening**: hover (`onMouseEnter` on wrapper) OR click/Enter/Space on the trigger button.

**Closing with delay**: `onMouseLeave` on the wrapper starts a 150ms `setTimeout`. If the mouse re-enters before the timer fires (e.g., briefly exits and returns), the timer is cleared. This prevents snap-close when the mouse moves between the trigger and panel.

**Wrapper pattern** — attach hover handlers to a shared wrapper `<div>` containing both the trigger button and the panel:
```tsx
<div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
  <button aria-haspopup="menu" aria-expanded={isDropdownOpen} aria-controls="connect-dropdown">
    Connect <ChevronDown />
  </button>
  {isDropdownOpen && (
    <ul id="connect-dropdown">
      {/* dropdown links */}
    </ul>
  )}
</div>
```

Close triggers:
1. Mouse leaving the wrapper (after 150ms delay)
2. Clicking a dropdown link (route change)
3. Clicking outside the wrapper (document `mousedown` listener)
4. `Escape` key (`keydown` listener)
5. Focus leaving the dropdown (`onBlur` with `relatedTarget` check — close only if new focus target is outside the wrapper)

ARIA on the trigger button:
- `aria-haspopup="menu"`
- `aria-expanded={isDropdownOpen}`
- `aria-controls="connect-dropdown"`

Dropdown panel:
- `id="connect-dropdown"`
- No ARIA role — use natural `<ul>/<li>` semantics with `<NavLink>` inside each `<li>`
- This avoids the arrow-key keyboard contract that `role="menu"` would impose

### Breakpoint Strategy
- **< 1024px** → hamburger menu (mobile + tablet)
- **≥ 1024px** → full horizontal nav with Connect ▾ dropdown

### Mobile Drawer State
```ts
const [isMenuOpen, setIsMenuOpen] = useState(false)
```

Close triggers:
1. X button click
2. Backdrop/overlay click
3. `Escape` key — `useEffect` with `keydown` listener (cleaned up on unmount)
4. Route change — `useEffect` watching `useLocation()` from React Router

### Sticky Navbar
Apply to the `<nav>` element: `sticky top-0 z-50 bg-white shadow-sm`

---

## Step 3 — Layout Integration

**File to modify**: `frontend/src/components/Layout.tsx`

Current Layout wraps everything in a gradient container. Restructure so Navbar sits above the scrollable content area:

```tsx
// New structure:
<div className="min-h-screen bg-neutral-bg font-sans">
  <Navbar />
  <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
    {children}
  </main>
</div>
```

Remove the old gradient background (Navbar has its own white bg + shadow). Individual pages can define their own section backgrounds.

---

## Files Summary

| Action | File |
|--------|------|
| **Create** | `frontend/src/components/Navbar.tsx` |
| **Modify** | `frontend/tailwind.config.js` — design tokens + font families |
| **Modify** | `frontend/index.html` — Google Fonts links |
| **Modify** | `frontend/src/components/Layout.tsx` — integrate Navbar, restructure |
| **Modify** | `frontend/src/components/index.ts` — export Navbar |
| **Create** | `frontend/src/components/__tests__/Navbar.test.tsx` |

---

## Accessibility Requirements

Per `.claude/rules/04-frontend-standards.md`:

- `<nav aria-label="Main navigation">`
- Hamburger button:
  - `aria-label="Open menu"` / `"Close menu"` (toggled dynamically)
  - `aria-expanded={isMenuOpen}`
  - `aria-controls="mobile-menu"`
- Mobile drawer:
  - `id="mobile-menu"`
  - `role="dialog"` with `aria-modal="true"`
  - `aria-label="Navigation menu"`
- All interactive elements: `focus:ring-2 focus:ring-primary focus:ring-offset-2`
- Never `outline-none` without visible replacement
- 44×44px minimum tap targets on all mobile/drawer links
- Color contrast: `#2C3E50` on `#FFFFFF` ≈ 10:1 ✅

---

## Test Plan

**File**: `frontend/src/components/__tests__/Navbar.test.tsx`

- [ ] Renders logo with "Worship Room" text
- [ ] Renders 5 flat nav links on desktop viewport
- [ ] Renders "Connect ▾" dropdown trigger on desktop
- [ ] Hovering over the Connect wrapper opens the dropdown
- [ ] Clicking the Connect trigger also toggles the dropdown
- [ ] Moving mouse from trigger into panel keeps dropdown open (wrapper approach)
- [ ] Moving mouse out of wrapper closes dropdown after 150ms delay
- [ ] Dropdown closes on outside click
- [ ] Dropdown closes on Escape key
- [ ] Dropdown closes when focus leaves the wrapper
- [ ] Dropdown trigger has `aria-haspopup="menu"` and correct `aria-expanded` value
- [ ] Dropdown panel uses `<ul>/<li>` with no ARIA role override
- [ ] "Log In" link points to `/login`
- [ ] "Get Started" button points to `/register`
- [ ] Hamburger button is visible at mobile viewport (mock resize or use `@testing-library/user-event`)
- [ ] Clicking hamburger opens mobile menu
- [ ] Clicking X button closes mobile menu
- [ ] Pressing `Escape` closes mobile menu
- [ ] Route change closes mobile menu
- [ ] Active route link has active styling class
- [ ] `aria-expanded` on hamburger reflects open/closed state
- [ ] Mobile drawer has correct ARIA attributes (`role`, `aria-modal`, `aria-label`)

---

## Implementation Order

1. Add design tokens + fonts (`tailwind.config.js`, `index.html`)
2. Create `Navbar.tsx` — desktop layout first, then mobile drawer
3. Update `Layout.tsx` to render Navbar above main content
4. Export from `components/index.ts`
5. Write `Navbar.test.tsx`
6. Run `pnpm dev` to verify visually at mobile, tablet, desktop
7. Run `pnpm test` to verify all tests pass
