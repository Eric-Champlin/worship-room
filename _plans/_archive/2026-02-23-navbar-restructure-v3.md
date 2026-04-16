# Implementation Plan: Navbar Restructure V3

**Spec:** `_specs/navbar-restructure-v3.md`
**Date:** 2026-02-23
**Branch:** `claude/feature/navbar-restructure-v3`

---

## Architecture Context

### Existing Files & Patterns

- **`frontend/src/components/Navbar.tsx`** — Main navbar component (679 lines). Contains:
  - `DAILY_LINKS` array (lines 6-11): Pray → /scripture, Journal → /journal, Meditate → /meditate, Verse & Song → /daily
  - `NAV_LINKS` array (lines 13-16): Music → /music, Prayer Wall → /prayer-wall (these are standalone top-level links)
  - `LOCAL_SUPPORT_LINKS` array (lines 18-21): Churches → /churches, Counselors → /counselors
  - `getNavLinkClass()` (lines 23-41): Shared className generator for top-level NavLinks, handles transparent/opaque + active/hover
  - `NavbarLogo` component (lines 43-57): Caveat font logo
  - `DailyDropdown` component (lines 59-236): Split-trigger dropdown with hover open, Escape close, outside click close, focus management
  - `LocalSupportDropdown` component (lines 238-415): Identical pattern to DailyDropdown
  - `DesktopNav` component (lines 417-429): Renders DailyDropdown + NAV_LINKS standalone links + LocalSupportDropdown
  - `DesktopAuthActions` component (lines 431-460): Log In + Get Started
  - `MobileDrawer` component (lines 467-596): Daily section with heading, standalone links section, Local Support section with heading, auth actions
  - `Navbar` component (lines 602-679): Root — hamburger state, route-change close, Escape close

- **`frontend/src/components/__tests__/Navbar.test.tsx`** — 375 lines. Test structure:
  - `renderNavbar()` helper wraps in MemoryRouter + Routes
  - Sections: Logo, Desktop nav links, Auth actions, Daily dropdown, Local Support dropdown, Hamburger menu, Active route
  - Uses `fireEvent.click` for dropdown open, `userEvent` for Escape/hover, `vi.useFakeTimers` for delay tests
  - References `NAV_LINKS` by name: tests assert `['Music', 'Prayer Wall']` as top-level links

- **`frontend/src/App.tsx`** — Routes: `/`, `/health`, `/listen`, `/insights`, `/daily`. **Missing routes for**: `/scripture`, `/journal`, `/meditate`, `/music`, `/prayer-wall`, `/churches`, `/counselors`, `/login`, `/register`, `/music/playlists`, `/music/ambient`, `/music/sleep`

- **`frontend/tailwind.config.js`** — Already has `dropdown-in` keyframe and `animate-dropdown-in` animation (150ms ease-out)

### Patterns to Follow

- **Dropdown pattern**: `DailyDropdown` and `LocalSupportDropdown` share an identical structure. The new `MusicDropdown` should follow this exact pattern:
  - `useState` for open/close
  - `useRef` for closeTimer, wrapper, trigger
  - `useLocation` for route change close
  - `useCallback` for open/closeWithDelay/close
  - 5 `useEffect` hooks: route change, Escape key, outside click, focus blur, cleanup
  - Split-trigger: NavLink label + button chevron
  - Dropdown panel: absolute positioned `<ul>` with `animate-dropdown-in rounded-xl bg-white py-1.5 shadow-[...] ring-1 ring-primary/10`
  - Items: NavLink with `group` class + render function children wrapping text in `<span>` for word-only underline

- **Mobile drawer pattern**: Sections use `role="group"` with `aria-labelledby` pointing to an uppercase heading `<span>`. Links use `NavLink` with `min-h-[44px]`, indented with `pl-6` for grouped items.

- **Test pattern**: Describe blocks per feature area. `fireEvent.click` for click tests. `userEvent.setup()` for keyboard/hover. `document.getElementById()` for dropdown panel checks. `within()` for scoped queries. `vi.useFakeTimers` for delay assertions.

### Key Design Values

- Dropdown panel: `animate-dropdown-in rounded-xl bg-white py-1.5 shadow-[0_4px_24px_-4px_rgba(109,40,217,0.25)] ring-1 ring-primary/10`
- Item: `group min-h-[44px] flex items-center px-4 py-2 text-sm font-medium transition-colors`
- Word underline on inner `<span>`: `relative pb-0.5 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']`
- Active: `after:scale-x-100` / Inactive: `after:scale-x-0 group-hover:after:scale-x-100`

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The current branch is `claude/feature/navbar-restructure-v3` and working directory is clean
- [ ] The current `Navbar.tsx` has the `DailyDropdown` and `LocalSupportDropdown` components as documented above (lines 59-415)
- [ ] `NAV_LINKS` currently contains exactly `['Music', 'Prayer Wall']` (2 standalone links)
- [ ] Placeholder routes already exist for `/scripture`, `/journal`, `/meditate`, etc. (they render `null` via the catch-all `Route path="*"`)
- [ ] The `animate-dropdown-in` animation already exists in `tailwind.config.js`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Music dropdown ID | `music-dropdown` | Consistent with `daily-dropdown` and `local-support-dropdown` naming |
| Music dropdown label link | NavLink to `/music` | Same pattern as Daily → `/daily` and Local Support → `/churches` |
| Music active detection | Check `location.pathname.startsWith('/music')` | Covers `/music`, `/music/playlists`, `/music/ambient`, `/music/sleep` |
| New placeholder routes | Add `/music/playlists`, `/music/ambient`, `/music/sleep` to `App.tsx` | Spec says "only placeholder routes needed" — reuse existing placeholder page pattern |
| Mobile drawer Music section | Add between Daily and Prayer Wall | Matches the CLAUDE.md mobile drawer spec order: DAILY → MUSIC → Prayer Wall → LOCAL SUPPORT |
| NAV_LINKS reduction | Change from `[Music, Prayer Wall]` to `[Prayer Wall]` only | Music moves to dropdown; Prayer Wall stays standalone |

---

## Implementation Steps

### Step 1: Add MusicDropdown and Update Desktop Nav

**Objective:** Create the `MusicDropdown` component following the exact same pattern as `DailyDropdown`, update `NAV_LINKS` to only contain Prayer Wall, and wire it into `DesktopNav`.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — Add `MUSIC_LINKS` array, add `MusicDropdown` component, update `NAV_LINKS`, update `DesktopNav`

**Details:**

1. Add `MUSIC_LINKS` constant after `DAILY_LINKS` (after line 11):
```typescript
const MUSIC_LINKS = [
  { label: 'Worship Playlists', to: '/music/playlists' },
  { label: 'Ambient Sounds', to: '/music/ambient' },
  { label: 'Sleep & Rest', to: '/music/sleep' },
] as const
```

2. Update `NAV_LINKS` to remove Music (only Prayer Wall remains):
```typescript
const NAV_LINKS = [
  { label: 'Prayer Wall', to: '/prayer-wall' },
] as const
```

3. Create `MusicDropdown` component — copy the entire `DailyDropdown` component and modify:
   - Rename to `MusicDropdown`
   - Use `MUSIC_LINKS` instead of `DAILY_LINKS`
   - Label text: "Music" instead of "Daily"
   - NavLink `to="/music"` instead of `to="/daily"`
   - Dropdown ID: `music-dropdown` instead of `daily-dropdown`
   - Button `aria-label`: "Music menu" instead of "Daily menu"
   - Button `aria-controls`: `music-dropdown`
   - Active detection: `const isMusicActive = MUSIC_LINKS.some(link => location.pathname === link.to) || location.pathname === '/music'`
   - Variable names: `isMusicActive` instead of `isDailyActive`
   - Min-width on dropdown panel: `min-w-[200px]` (wider to fit "Worship Playlists")

4. Update `DesktopNav` to include MusicDropdown between DailyDropdown and standalone links:
```tsx
function DesktopNav({ transparent }: { transparent: boolean }) {
  return (
    <div className="hidden items-center gap-6 lg:flex">
      <DailyDropdown transparent={transparent} />
      <MusicDropdown transparent={transparent} />
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

**Guardrails (DO NOT):**
- Do NOT change any styling on existing DailyDropdown or LocalSupportDropdown
- Do NOT remove the Prayer Wall from NAV_LINKS (it stays as the only standalone link)
- Do NOT modify `getNavLinkClass`, `NavbarLogo`, `DesktopAuthActions`, or `Navbar` root
- Do NOT touch the MobileDrawer yet (that's Step 2)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Music dropdown tests | unit | Full suite mirroring Daily dropdown tests (see Step 3) |

**Expected state after completion:**
- [ ] App compiles without errors (`pnpm build`)
- [ ] Desktop navbar renders: Logo | Daily ▾ | Music ▾ | Prayer Wall | Local Support ▾ | Log In | Get Started
- [ ] Music dropdown opens/closes with correct 3 links
- [ ] Existing Daily and Local Support dropdowns still work

---

### Step 2: Update Mobile Drawer with Music Section

**Objective:** Add the MUSIC section to the mobile drawer between Daily and Prayer Wall, matching the spec's mobile drawer layout.

**Files to create/modify:**
- `frontend/src/components/Navbar.tsx` — Modify `MobileDrawer` component

**Details:**

The current mobile drawer structure is:
1. Daily section (with heading)
2. Standalone links (Music, Prayer Wall) — no heading
3. Local Support section (with heading)
4. Auth actions

Change to:
1. Daily section (with heading) — unchanged
2. **MUSIC section (with heading)** — NEW
3. Prayer Wall — standalone link
4. Local Support section (with heading) — unchanged
5. Auth actions — unchanged

Replace the "Standalone links" `<div>` (current lines 516-535) with:

```tsx
{/* Music section */}
<div
  className="mt-2 border-t border-gray-100 pt-2"
  role="group"
  aria-labelledby="music-heading"
>
  <span
    id="music-heading"
    className="px-3 text-xs font-semibold uppercase tracking-wider text-text-dark"
  >
    Music
  </span>
  {MUSIC_LINKS.map((link) => (
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

{/* Standalone link: Prayer Wall */}
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

Note: The standalone links section continues to iterate `NAV_LINKS`, which now only contains Prayer Wall. The indentation for Music section items uses `pl-6` (same as Daily and Local Support sections).

**Guardrails (DO NOT):**
- Do NOT change the Daily section or Local Support section
- Do NOT change the auth actions section
- Do NOT change the drawer open/close mechanics
- Do NOT change the backdrop overlay

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Mobile menu labels | unit | Updated to include Music section links (see Step 3) |

**Expected state after completion:**
- [ ] App compiles without errors (`pnpm build`)
- [ ] Mobile drawer shows: DAILY section → MUSIC section → Prayer Wall → LOCAL SUPPORT section → Auth

---

### Step 3: Add Placeholder Routes for Music Sub-Pages

**Objective:** Add placeholder routes for `/music/playlists`, `/music/ambient`, `/music/sleep` so the new dropdown links don't 404.

**Files to create/modify:**
- `frontend/src/App.tsx` — Add 3 new routes

**Details:**

Add placeholder routes alongside existing ones. Follow the existing pattern — other routes like `/scripture`, `/journal`, `/meditate`, `/music`, `/prayer-wall`, `/churches`, `/counselors`, `/login`, `/register` don't have explicit routes yet (they fall through to `Route path="*"`). However, since Music sub-pages are new and might benefit from explicit routes, add them as simple placeholder elements:

```tsx
<Route path="/music/playlists" element={<div>Worship Playlists — Coming Soon</div>} />
<Route path="/music/ambient" element={<div>Ambient Sounds — Coming Soon</div>} />
<Route path="/music/sleep" element={<div>Sleep & Rest — Coming Soon</div>} />
```

Place these after the existing `/daily` route.

**Guardrails (DO NOT):**
- Do NOT create separate page component files for these placeholders
- Do NOT add Layout wrappers — keep them minimal until real pages are built
- Do NOT remove any existing routes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | These are simple placeholders; no tests needed |

**Expected state after completion:**
- [ ] App compiles without errors
- [ ] Navigating to `/music/playlists`, `/music/ambient`, `/music/sleep` renders placeholder text

---

### Step 4: Update Tests

**Objective:** Update `Navbar.test.tsx` to reflect the new structure: 1 standalone link (Prayer Wall), new Music dropdown, updated mobile drawer.

**Files to create/modify:**
- `frontend/src/components/__tests__/Navbar.test.tsx` — Update existing tests, add Music dropdown tests

**Details:**

**Changes to existing tests:**

1. **"Desktop nav links" → "renders 2 top-level nav links" (line 28-34)**: Change to "renders 1 top-level nav link":
   - Change assertion from `['Music', 'Prayer Wall']` to `['Prayer Wall']`
   - Test now checks for only 1 standalone link

2. **"Desktop nav links" → "renders ... dropdown triggers" (line 36-44)**: Update to check for 3 dropdown triggers:
   - Add assertion for `screen.getByRole('button', { name: /music menu/i })`

3. **"Active route" → "active top-level link has active styling" (lines 362-367)**: Change from testing `/music` active state to testing `/prayer-wall` active state:
   - `renderNavbar('/prayer-wall')` instead of `renderNavbar('/music')`
   - Query `screen.getByRole('link', { name: 'Prayer Wall' })` instead of Music
   - Same assertions for `text-primary` and `after:scale-x-100`

4. **"Active route" → "active route link has aria-current=page" (lines 369-373)**: Same change — use `/prayer-wall` and Prayer Wall link

5. **"mobile menu contains all nav links" (lines 325-345)**: Update `allLabels` array:
   ```typescript
   const allLabels = [
     'Pray',
     'Journal',
     'Meditate',
     'Verse & Song',
     'Worship Playlists',
     'Ambient Sounds',
     'Sleep & Rest',
     'Prayer Wall',
     'Churches',
     'Counselors',
   ]
   ```

**New Music dropdown test section** (add after Local Support dropdown describe block, before Hamburger menu):

Add a `describe('Music dropdown', ...)` block with the same test structure as the Daily dropdown tests:

| Test | Type | Description |
|------|------|-------------|
| "Music" label is a link to /music | unit | `screen.getByRole('link', { name: 'Music' })` has href `/music` |
| dropdown is closed by default | unit | `document.getElementById('music-dropdown')` is null |
| clicking the chevron opens the dropdown | unit | After click, `music-dropdown` exists |
| clicking the chevron again closes the dropdown | unit | Toggle behavior |
| dropdown links point to correct routes | unit | 3 links: `/music/playlists`, `/music/ambient`, `/music/sleep` |
| Escape key closes the dropdown | unit | Open → Escape → closed |
| Escape key returns focus to chevron trigger | unit | Focus check |
| outside click closes the dropdown | unit | mouseDown on nav → closed |
| chevron trigger has aria-haspopup and correct aria-expanded | unit | `aria-haspopup="true"`, `aria-expanded` toggles |
| aria-controls is only set when dropdown is open | unit | Absent when closed, `"music-dropdown"` when open |
| dropdown panel uses ul/li | unit | `tagName === 'UL'`, no role override, 3 links |
| hovering over the wrapper opens the dropdown | unit | `userEvent.hover(wrapper)` → open |
| unhovering closes after delay | unit | `vi.useFakeTimers` → 200ms → closed |

**Guardrails (DO NOT):**
- Do NOT change any Daily dropdown or Local Support dropdown tests
- Do NOT change the `renderNavbar()` helper function
- Do NOT remove any existing tests — only modify the ones listed above

**Expected state after completion:**
- [ ] All tests pass (`pnpm test`)
- [ ] No test regressions in Daily dropdown, Local Support dropdown, or Hamburger menu sections
- [ ] Music dropdown has full test coverage matching Daily dropdown pattern

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add MusicDropdown and update DesktopNav |
| 2 | 1 | Update Mobile Drawer with Music section |
| 3 | — | Add placeholder routes for music sub-pages |
| 4 | 1, 2 | Update tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add MusicDropdown and update DesktopNav | [COMPLETE] | 2026-02-23 | Added `MUSIC_LINKS` array, `MusicDropdown` component (follows DailyDropdown pattern exactly), updated `NAV_LINKS` to Prayer Wall only, wired into `DesktopNav`. File: `frontend/src/components/Navbar.tsx` |
| 2 | Update Mobile Drawer with Music section | [COMPLETE] | 2026-02-23 | Replaced standalone links div with MUSIC section (role="group", aria-labelledby="music-heading") + standalone Prayer Wall div. File: `frontend/src/components/Navbar.tsx` |
| 3 | Add placeholder routes for music sub-pages | [COMPLETE] | 2026-02-23 | Added 3 placeholder routes: `/music/playlists`, `/music/ambient`, `/music/sleep`. File: `frontend/src/App.tsx` |
| 4 | Update tests | [COMPLETE] | 2026-02-23 | Updated 5 existing tests (top-level links, dropdown triggers, mobile labels, active route x2). Added 13 new Music dropdown tests. All 86 tests pass. File: `frontend/src/components/__tests__/Navbar.test.tsx` |
