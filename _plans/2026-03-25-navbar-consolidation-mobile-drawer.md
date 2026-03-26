# Implementation Plan: Navbar Consolidation and Mobile Drawer Redesign

**Spec:** `_specs/navbar-consolidation-mobile-drawer.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/navbar-consolidation-mobile-drawer`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable (standalone spec, third of 4 navigation restructure specs)

---

## Architecture Context

### Current Navbar Structure (Navbar.tsx — 1030 lines)

8 internal function components, all inside one file:

| Function | Lines | Purpose |
|----------|-------|---------|
| `NavbarLogo()` | 60-83 | Logo with seasonal icon overlay |
| `NavDropdown()` | 94-281 | Reusable dropdown (Local Support, avatar) |
| `DesktopNav()` | 283-310 | 8 desktop nav links + Local Support dropdown |
| `DesktopAuthActions()` | 312-356 | Logged-out: Log In + Get Started buttons |
| `DesktopUserActions()` | 378-542 | Logged-in: bell + avatar dropdown (11 items) |
| `MobileDrawer()` | 550-852 | Full mobile nav panel — flat list |
| `MobileNotificationSheet()` | 863-891 | Bottom sheet notification panel |
| `SeasonalNavLine()` | 893-925 | Seasonal banner (desktop) |
| `Navbar()` (main) | 927-1029 | Root orchestrator |

### Current NAV_LINKS (8 items — lines 23-32)

1. Daily Hub → `/daily`
2. Ask → `/ask` (icon: Sparkles)
3. Bible → `/bible` (icon: Book)
4. Daily Devotional → `/daily?tab=devotional` (icon: Sparkles)
5. Reading Plans → `/grow?tab=plans` (icon: BookOpen)
6. Challenges → `/grow?tab=challenges` (icon: Flame + pulse dot)
7. Prayer Wall → `/prayer-wall`
8. Music → `/music`

### Current AVATAR_MENU_LINKS (7 items — lines 358-366)

Dashboard, Friends, My Prayer Requests, My Prayers, Mood Insights, Monthly Report, Settings

### Current MOBILE_DRAWER_EXTRA_LINKS (6 items — lines 369-376)

Friends, Mood Insights, Monthly Report, My Prayer Requests, My Prayers, Settings

### Existing External Components

- `NotificationBell.tsx` in `components/dashboard/` (64 lines) — already extracted
- `NotificationPanel.tsx` in `components/dashboard/` (141 lines) — already extracted

### Key Hooks

- `useAuth()` from `@/hooks/useAuth` — returns `{ isAuthenticated, user, login, logout }`
- `useLiturgicalSeason()` from `@/hooks/useLiturgicalSeason` — returns `{ isNamedSeason, seasonName, icon, currentSeason, themeColor, greeting, daysUntilNextSeason }`
- `useNotificationActions()` from `@/hooks/useNotificationActions` — returns `{ notifications, unreadCount, markAsRead, markAllAsRead, dismiss, handleTap, handleAcceptFriend, handleDeclineFriend, checkIsAlreadyFriend }`
- `useOnlineStatus()` from `@/hooks/useOnlineStatus` — returns `{ isOnline }`
- `useAuthModal()` from `@/components/prayer-wall/AuthModalProvider` — returns `{ openAuthModal }`

### Test Patterns

- Wraps with `MemoryRouter`, `ToastProvider`, `AuthModalProvider`
- Mocks `useAuth` with `vi.mock` + `vi.mocked` for logged-in/out states
- Helper `setLoggedIn()` and `renderNavbar(initialRoute)` functions
- Tests query by `role`, `aria-label`, `text` — consistent RTL patterns
- 2 test files: `Navbar.test.tsx` (531 lines), `Navbar-seasonal.test.tsx` (161 lines)

### Active State Detection

Desktop links use `NavLink` with `getNavLinkClass(transparent)` callback → `isActive` prop. Animated underline via `after:` pseudo-element with `scale-x-0`/`scale-x-100` transition.

The mobile drawer uses the same `NavLink` `isActive` callback but currently only toggles text color (no left border or background highlight).

### Styling Patterns

| Context | Current Value |
|---------|--------------|
| Navbar glass | `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` |
| Navbar transparent | `liquid-glass` class |
| Mobile drawer (logged-in) | `bg-hero-mid border border-white/15` |
| Mobile drawer (logged-out) | `bg-white border border-gray-200` |
| Dropdown panel | `bg-hero-mid border border-white/15 shadow-lg` |
| Section heading (mobile) | `text-xs font-semibold uppercase tracking-wider text-white/50` (logged-in) |
| Get Started button | `bg-white/20 text-white font-medium text-sm py-2 px-5 rounded-full border border-white/30` |
| Nav link font | Inter 14px 500, `text-white/90` (transparent) |
| Seasonal line text | `text-xs text-white/50` |
| Seasonal link | `text-primary-lt hover:underline` |

---

## Auth Gating Checklist

**No auth modals are triggered by any navbar interaction.** The navbar is purely navigational — auth gates are enforced by destination pages.

| Element | Spec Requirement | Planned In Step | Auth Check Method |
|---------|-----------------|-----------------|-------------------|
| 5 nav links | Visible to all | Step 2 | N/A — no auth gate |
| Avatar dropdown | Logged-in only | Step 3 | `isAuthenticated` conditional render |
| Notification bell | Logged-in only | Step 2 | `isAuthenticated` conditional render (existing) |
| Mobile "MY WORSHIP ROOM" section | Logged-in only | Step 4 | `isAuthenticated` conditional render |
| Mobile "Notifications" row | Logged-in only | Step 4 | `isAuthenticated` conditional render |
| Mobile "Log Out" | Logged-in only | Step 4 | `isAuthenticated` conditional render |
| Mobile "Log In / Get Started" | Logged-out only | Step 4 | `!isAuthenticated` conditional render |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Navbar glass | background | `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` | design-system.md Navigation Pattern |
| Nav link | font | Inter 14px 500 (`text-sm font-medium`) | design-system.md |
| Nav link (transparent) | color | `text-white/90` (inactive), `text-white` (active) | Navbar.tsx:49-55 |
| Active underline | style | `after:bg-white` (transparent) / `after:bg-primary` (opaque) | Navbar.tsx:45 |
| Get Started btn | style | `bg-white/20 text-white font-medium text-sm py-2 px-5 rounded-full border border-white/30` | design-system.md Button Patterns |
| Mobile drawer BG (logged-in) | background | `bg-hero-mid border border-white/15` (#1E0B3E) | design-system.md |
| Mobile drawer BG (logged-out) | background | `bg-white border border-gray-200` | Navbar.tsx:617 |
| Section header (mobile) | style | `text-xs uppercase tracking-wide text-white/30` | Spec §5.3 |
| Active item (mobile) | style | `border-l-2 border-primary bg-white/[0.04]` | Spec §5.5 |
| Seasonal line | text | `text-xs text-white/40` for label, `text-primary-lt` for link | Spec §4 |
| Dropdown animation | timing | `animate-dropdown-in` (150ms ease-out) | design-system.md |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for hero titles, NOT Lora
- Navbar always uses `text-white/90` for inactive links in transparent mode, NOT `text-white/80`
- Mobile drawer has dual theming: `bg-hero-mid border-white/15` (logged-in) vs `bg-white border-gray-200` (logged-out) — the spec says drawer should always use `bg-hero-mid` style now (spec §5: syncs with desktop dropdown styling)
- `liquid-glass` class is used for transparent mode navbar glass effect
- Dropdown animation: `motion-safe:animate-dropdown-in` — never use plain `animate-dropdown-in`
- Nav link active underline: `after:` pseudo-element with `scale-x-0`→`scale-x-100` transition
- Challenge dot check uses `link.to === '/grow?tab=challenges'` (updated in Grow Page spec)
- Seasonal dismissal key: `wr_seasonal_banner_dismissed` in `sessionStorage`
- Focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Mobile touch targets: all items need `min-h-[44px]` (existing pattern)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec with no new data models.

**sessionStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_seasonal_banner_dismissed` | Both | Seasonal line dismiss state (existing, renamed in spec to `wr_seasonal_nav_dismissed`) |

**Note:** The spec says `wr_seasonal_nav_dismissed` but the current code uses `wr_seasonal_banner_dismissed`. The plan will use the spec's key name `wr_seasonal_nav_dismissed` to align with the spec's intent.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 768px (md) | Hamburger + mobile drawer. 5 nav links hidden. Logo + hamburger visible. Seasonal line not in header bar. |
| Tablet | 768px - 1024px (md to lg) | Logo + 5 nav items (icon-only with tooltips if tight, `aria-label`). Auth elements. Seasonal line visible. |
| Desktop | > 1024px (lg+) | Logo + 5 text nav items. Local Support dropdown + auth elements. Seasonal line visible. Full layout. |

**Current breakpoint:** Desktop nav shows at `lg:flex` (1024px). Mobile hamburger shows at `lg:hidden`. The spec keeps this breakpoint. However, the spec introduces a tablet intermediate state (768px–1024px) with icon-only nav items. Currently there is no tablet state — the hamburger shows below 1024px.

**Decision needed:** The spec says "consider" icon-only at tablet (§7.2). Since the navbar currently jumps from hamburger to full desktop at `lg:`, and the spec says "consider" (not "must"), we'll add the tablet icon-only breakpoint as a responsive enhancement. Nav links show icon-only at `md:flex lg:hidden` range, text labels at `lg:`.

---

## Vertical Rhythm

N/A — the navbar is a fixed component, not a page section with vertical spacing between sections.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec 7 (Devotional → Daily Hub tab) is complete and committed
- [x] Spec 8 (Grow page tabbed experience) is complete and committed
- [x] Branch `claude/feature/navbar-consolidation-mobile-drawer` exists
- [ ] All auth-gated actions from the spec are accounted for (no auth modals in navbar — verified)
- [ ] Design system values verified from recon + codebase inspection
- [ ] Mobile drawer theming: spec says `bg-hero-mid` always; current code has dual theming (dark logged-in, light logged-out). **Spec wins** — mobile drawer always uses dark theme with `bg-hero-mid border border-white/15`.
- [ ] The `wr_seasonal_banner_dismissed` sessionStorage key will be renamed to `wr_seasonal_nav_dismissed` per spec
- [ ] The avatar dropdown "My Profile" link (currently only in DesktopUserActions, lines 507-514) is NOT in the spec's avatar dropdown items — it will be removed from the dropdown but preserved in the mobile drawer's MY WORSHIP ROOM section as a decision

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tablet icon-only nav | Implement at `md:flex lg:hidden` with icons + tooltips | Spec §7.2 says "consider" but it improves tablet UX and the 5 items + logo + auth buttons are tight at 768-1024px |
| Mobile drawer theming | Always dark (`bg-hero-mid`) | Spec says drawer syncs with desktop dropdown styling. Memory note confirms this. |
| "My Profile" link | Removed from avatar dropdown; NOT added to mobile drawer | Not in spec's avatar dropdown list (§3) or mobile drawer structure (§5.2). `/profile/:userId` accessible from Friends page. |
| `NavDropdown` reuse | Keep `NavDropdown` in `Navbar.tsx` as shared utility, not extracted | Only used by `LocalSupportDropdown` wrapper. Too small to justify its own file. |
| Active state for `/ask` in desktop | No nav item highlighted | Spec §Edge Cases: "No nav item should show an active underline when on `/ask`" |
| sessionStorage key rename | `wr_seasonal_banner_dismissed` → `wr_seasonal_nav_dismissed` | Spec §Auth & Persistence explicitly names `wr_seasonal_nav_dismissed` |
| Challenge dot | Removed from desktop nav (Challenges removed from top-level) but preserved in mobile drawer | Challenges link moves to mobile drawer STUDY section under Grow |
| `getActiveChallengeInfo` import | Remove from Navbar if no component uses it after consolidation | Was only used for the challenge dot on the Challenges nav link |
| Logged-out mobile drawer text colors | Use white text (`text-white/80`, `text-white`) instead of dark text | Spec mandates dark bg always; existing dark text (`text-nav-text-dark`) was for the light logged-out theme being removed |

---

## Implementation Steps

### Step 1: Extract Sub-Components into Separate Files

**Objective:** Break `Navbar.tsx` (1030 lines) into focused files before making functional changes. Pure refactor — no behavior changes.

**Files to create:**
- `frontend/src/components/LocalSupportDropdown.tsx` — Local Support dropdown (wraps `NavDropdown` logic)
- `frontend/src/components/AvatarDropdown.tsx` — Logged-in avatar dropdown menu
- `frontend/src/components/MobileDrawer.tsx` — Full mobile drawer
- `frontend/src/components/SeasonalNavLine.tsx` — Seasonal notification line

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Import extracted components, remove inlined code

**Details:**

1. **`LocalSupportDropdown.tsx`**: Extract the `NavDropdown` component (lines 94-281) AND the `LOCAL_SUPPORT_LINKS` constant into this file. Export `LocalSupportDropdown` as a wrapper that pre-configures `NavDropdown` with the Local Support links, `dropdownId="local-support-dropdown"`, and `to="/local-support/churches"`. Accept `transparent` prop.

2. **`AvatarDropdown.tsx`**: Extract the avatar-related logic from `DesktopUserActions` (lines 378-542). This includes the avatar button, menu dropdown, menu items, and logout action. Accept props: `user`, `logout`, `notifications/bell state` passed down. Actually, keep the notification bell in Navbar.tsx and only extract the avatar dropdown portion. The bell logic stays in Navbar because it coordinates with `MobileNotificationSheet`.

3. **`MobileDrawer.tsx`**: Extract `MobileDrawer` function (lines 550-852) and `MobileNotificationSheet` (lines 863-891) into `MobileDrawer.tsx`. Move the `MobileDrawerProps` interface. This component already uses its own hooks internally (`useAuth`, `useLiturgicalSeason`, `useAuthModal`, etc.), so it needs no new props beyond `{ isOpen, onClose, onBellTap }`.

4. **`SeasonalNavLine.tsx`**: Extract `SeasonalNavLine` function (lines 893-925). Self-contained — uses `useLiturgicalSeason` internally.

5. **Navbar.tsx**: Import all extracted components. Keep `NavbarLogo`, `getNavLinkClass`, `NAV_LINKS`, `DesktopNav`, `DesktopAuthActions`, and the main `Navbar` export. Move `SEASON_ICON_MAP` to a shared location (export from `SeasonalNavLine.tsx` since both `SeasonalNavLine` and `MobileDrawer` use it, or put in a `constants/` file).

**Guardrails (DO NOT):**
- DO NOT change any behavior, styling, or structure during extraction
- DO NOT rename any functions, props, or CSS classes
- DO NOT change the public API of `Navbar` (still exports `Navbar` with `transparent` prop)
- DO NOT move `NotificationBell` or `NotificationPanel` — they're already extracted in `components/dashboard/`

**Responsive behavior:** N/A: no UI impact — pure refactor.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing Navbar.test.tsx tests pass | integration | Run full test suite to confirm no regressions from extraction |
| All existing Navbar-seasonal.test.tsx tests pass | integration | Seasonal tests still pass with extracted `SeasonalNavLine` |

**Expected state after completion:**
- [ ] `LocalSupportDropdown.tsx`, `AvatarDropdown.tsx`, `MobileDrawer.tsx`, `SeasonalNavLine.tsx` exist in `frontend/src/components/`
- [ ] `Navbar.tsx` imports and uses extracted components
- [ ] `Navbar.tsx` is noticeably shorter (but not yet under 300 lines — functional changes in Step 2-5 will trim further)
- [ ] All 531+ existing Navbar tests pass
- [ ] No visual or behavioral change

---

### Step 2: Consolidate Desktop Nav to 5 Items + Update Active States

**Objective:** Reduce NAV_LINKS from 8 to 5 items. Update active state detection to match spec §1.4. Remove challenge dot from desktop (Challenges no longer top-level).

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — Update `NAV_LINKS`, `DesktopNav`, `getNavLinkClass`

**Details:**

**New NAV_LINKS (5 items):**
```typescript
const NAV_LINKS: ReadonlyArray<{ label: string; to: string; icon?: LucideIcon }> = [
  { label: 'Daily Hub', to: '/daily' },
  { label: 'Bible', to: '/bible', icon: Book },
  { label: 'Grow', to: '/grow' },
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Music', to: '/music' },
]
```

**Removed from top-level:** Ask, Daily Devotional, Reading Plans, Challenges.

**Active state detection:** React Router's `NavLink` `isActive` only matches exact paths or uses `end` prop. For the Grow link to be active on `/grow`, `/reading-plans/:planId`, and `/challenges/:challengeId`, we need a custom `className` callback that checks `location.pathname`:

```typescript
// In DesktopNav, replace simple NavLink usage with custom isActive logic:
const location = useLocation()

function isNavActive(to: string): boolean {
  const path = location.pathname
  switch (to) {
    case '/daily': return path.startsWith('/daily')
    case '/bible': return path.startsWith('/bible')
    case '/grow': return path === '/grow' || path.startsWith('/reading-plans/') || path.startsWith('/challenges/')
    case '/prayer-wall': return path.startsWith('/prayer-wall')
    case '/music': return path.startsWith('/music')
    default: return path === to
  }
}
```

Use `NavLink` with a `className` callback that calls `isNavActive` instead of relying on React Router's built-in `isActive`.

**Remove challenge dot logic** from `DesktopNav`: delete the `activeChallengeInfo` call and the dot JSX. Also remove the `getActiveChallengeInfo` and `CHALLENGES` imports from Navbar.tsx if no longer used.

**Icons for tablet mode:** Add icons to all 5 nav items for the tablet icon-only display:
- Daily Hub: `Calendar` (Lucide)
- Bible: `Book` (already)
- Grow: `TrendingUp` (Lucide)
- Prayer Wall: `Heart` (Lucide) — or `MessageCircleHeart` if available
- Music: `Music` (Lucide)

Add tablet breakpoint display: at `md:flex lg:hidden`, show icon-only with `title` tooltip and `aria-label`. At `lg:flex`, show full text labels. Below `md`, hamburger menu.

```tsx
// Each nav link renders:
<NavLink to={link.to} className={...} aria-label={link.label}>
  {link.icon && <link.icon size={18} className="md:block lg:hidden" aria-hidden="true" />}
  <span className="hidden lg:inline">{link.label}</span>
  {/* For tablet: show icon only. For desktop: show text (icon optional) */}
</NavLink>
```

Update `DesktopNav` wrapper: change `hidden items-center gap-6 lg:flex` to `hidden items-center gap-4 md:gap-6 md:flex` so it shows at md (tablet) as well.

**Auth gating:** N/A — nav links visible to all.

**Responsive behavior:**
- Desktop (1440px): 5 text links with comfortable spacing (`gap-6`)
- Tablet (768px–1024px): 5 icon-only links with `gap-4`, tooltips via `title`, `aria-label` on each
- Mobile (< 768px): Hidden (hamburger + drawer)

**Guardrails (DO NOT):**
- DO NOT change the `getNavLinkClass` function's styling logic — only the active state detection
- DO NOT remove `/ask` route from App.tsx — it stays accessible via URL and footer
- DO NOT change Local Support dropdown behavior
- DO NOT modify any page components

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders exactly 5 nav links: Daily Hub, Bible, Grow, Prayer Wall, Music | integration | Verify link text and hrefs |
| "Ask", "Daily Devotional", "Reading Plans", "Challenges" NOT in desktop nav | integration | `queryByRole('link', { name })` returns null |
| "Grow" active on `/grow` | integration | Check active class |
| "Grow" active on `/reading-plans/finding-peace` | integration | renderNavbar('/reading-plans/finding-peace'), check Grow is active |
| "Grow" active on `/challenges/lent-2026` | integration | renderNavbar('/challenges/lent-2026'), check Grow is active |
| No active state on `/ask` | integration | renderNavbar('/ask'), no nav link has active underline |
| "Daily Hub" active on `/daily?tab=devotional` | integration | Check active class |
| "Bible" active on `/bible/genesis/1` | integration | Check active class |
| "Prayer Wall" active on `/prayer-wall/dashboard` | integration | Check active class |
| "Music" active on `/music/routines` | integration | Check active class |
| Tablet shows icon-only with aria-label | integration | Check `aria-label` exists on links at tablet |

**Expected state after completion:**
- [ ] Desktop nav shows exactly 5 items
- [ ] Active states match spec §1.4 for all route patterns
- [ ] Challenge dot removed from desktop nav
- [ ] Tablet icon-only mode working with accessible labels
- [ ] All tests pass (existing updated + new active state tests)

---

### Step 3: Reorganize Avatar Dropdown

**Objective:** Clean up avatar dropdown to show exactly 7 items per spec §3.

**Files to modify:**
- `frontend/src/components/AvatarDropdown.tsx` — Update menu items

**Details:**

**New AVATAR_MENU_LINKS (5 links + divider + logout = 7 total):**
```typescript
const AVATAR_MENU_LINKS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'My Prayers', to: '/my-prayers', icon: HandHeart },
  { label: 'Friends', to: '/friends', icon: Users },
  { label: 'Mood Insights', to: '/insights', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
] as const
```

**Removed:** My Journal Entries (broken 404), My Favorites (broken 404), My Prayer Requests (redundant with My Prayers), Monthly Report (accessible from /insights), My Profile link (above the menu).

Add Lucide icons: `LayoutDashboard`, `HandHeart`, `Users`, `BarChart3`, `Settings`, `LogOut`.

Render each menu item with icon + label. Divider before Log Out. Log Out rendered with `LogOut` icon.

**Auth gating:** Avatar dropdown only renders when `isAuthenticated` — existing behavior preserved.

**Responsive behavior:**
- Desktop (1440px): Avatar dropdown visible with icon + text menu items
- Tablet (768px–1024px): Same (avatar button visible)
- Mobile (< 768px): Avatar dropdown hidden (mobile drawer handles these items)

**Guardrails (DO NOT):**
- DO NOT change the avatar button styling or animation
- DO NOT change dropdown open/close behavior (click, outside click, Escape, route change)
- DO NOT add any new routes or pages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Avatar dropdown shows: Dashboard, My Prayers, Friends, Mood Insights, Settings, Log Out | integration | Open dropdown, verify text |
| "My Journal Entries" NOT in dropdown | integration | `queryByText` returns null |
| "My Favorites" NOT in dropdown | integration | `queryByText` returns null |
| "My Prayer Requests" NOT in dropdown | integration | `queryByText` returns null |
| "Monthly Report" NOT in dropdown | integration | `queryByText` returns null |
| Each menu item has an icon | integration | Check for SVG elements in links |
| Dashboard links to `/` | integration | Check href |
| My Prayers links to `/my-prayers` | integration | Check href |
| Friends links to `/friends` | integration | Check href |
| Mood Insights links to `/insights` | integration | Check href |
| Settings links to `/settings` | integration | Check href |
| Log Out calls logout | integration | Click and verify mock called |

**Expected state after completion:**
- [ ] Avatar dropdown has exactly 5 links + divider + Log Out
- [ ] Each item has a Lucide icon
- [ ] All broken/redundant links removed
- [ ] Dropdown behavior unchanged
- [ ] Tests updated and passing

---

### Step 4: Redesign Mobile Drawer with Grouped Sections

**Objective:** Transform the flat mobile drawer list into organized sections per spec §5.

**Files to modify:**
- `frontend/src/components/MobileDrawer.tsx` — Complete restructure of drawer content

**Details:**

**Always dark theme:** Remove the dual-theming (light for logged-out, dark for logged-in). The drawer always uses `bg-hero-mid border border-white/15` with white text. This means all conditional color logic like `isAuthenticated ? 'text-white/80' : 'text-nav-text-dark'` becomes just `'text-white/80'`.

**Section header component (reusable within drawer):**
```tsx
function DrawerSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="heading"
      aria-level={2}
      className="px-3 text-xs uppercase tracking-wide text-white/30"
    >
      {children}
    </span>
  )
}
```

**Section structure — Logged-Out:**
```
[Seasonal banner — if active]
[Offline indicator — if offline]

DAILY
  Daily Hub → /daily

STUDY
  Bible → /bible
  Grow → /grow
  Ask God's Word → /ask

COMMUNITY
  Prayer Wall → /prayer-wall

LISTEN
  Music → /music

FIND HELP
  Churches → /local-support/churches
  Counselors → /local-support/counselors
  Celebrate Recovery → /local-support/celebrate-recovery

─── divider ───
[Log In]  [Get Started]
```

**Section structure — Logged-In:**
Same nav sections as above, plus:
```
─── divider ───

MY WORSHIP ROOM
  Dashboard → /
  My Prayers → /my-prayers
  Friends → /friends
  Mood Insights → /insights
  Settings → /settings

─── divider ───
🔔 Notifications (with unread badge)
Log Out
```

**Active item indicator (spec §5.5):**
```tsx
// For each NavLink className callback:
cn(
  'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
  isActive
    ? 'border-l-2 border-primary bg-white/[0.04] text-white'
    : 'text-white/80 hover:bg-white/5 hover:text-white'
)
```

**Active detection:** Use the same `isNavActive` function from Step 2, but also add `/ask` detection for the "Ask God's Word" mobile drawer item. Export `isNavActive` from a shared utility or keep it inline.

**Section spacing:** `mb-4` between sections. Section headers get `mb-1` before their first item. Items within a section have no extra gap (just the 44px min-height creates natural spacing).

**Seasonal banner styling** stays consistent with current implementation (already in MobileDrawer, lines 622-650) but simplified since drawer is always dark now: remove the `isAuthenticated` color conditionals.

**Remove:** Dashboard-first link (now in MY WORSHIP ROOM section), My Profile link, MOBILE_DRAWER_EXTRA_LINKS constant (replaced by inline section definitions).

**Auth gating:**
- Nav sections (DAILY, STUDY, COMMUNITY, LISTEN, FIND HELP) → visible to all
- MY WORSHIP ROOM section → `isAuthenticated` only
- Notifications row → `isAuthenticated` only
- Log Out → `isAuthenticated` only
- Log In / Get Started → `!isAuthenticated` only

**Responsive behavior:**
- Mobile (< 768px): Full drawer visible when hamburger tapped
- Tablet/Desktop: Drawer hidden (`lg:hidden` existing behavior)

**Guardrails (DO NOT):**
- DO NOT change focus trap behavior
- DO NOT change Escape key behavior
- DO NOT change backdrop click-to-close behavior
- DO NOT change the MobileNotificationSheet — it stays as-is
- DO NOT add any section for items that shouldn't be there (no "Monthly Report", no "My Profile")
- DO NOT use heavy visual dividers — use `border-t border-white/15` for section breaks

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Logged-out: sections DAILY, STUDY, COMMUNITY, LISTEN, FIND HELP visible | integration | Check section headers by text |
| Logged-out: Daily Hub in DAILY section | integration | Verify presence |
| Logged-out: Bible, Grow, "Ask God's Word" in STUDY section | integration | Verify 3 items |
| Logged-out: Prayer Wall in COMMUNITY section | integration | Verify presence |
| Logged-out: Music in LISTEN section | integration | Verify presence |
| Logged-out: Churches, Counselors, Celebrate Recovery in FIND HELP section | integration | Verify 3 items |
| Logged-out: Log In and Get Started buttons visible | integration | Verify buttons |
| Logged-out: MY WORSHIP ROOM section NOT visible | integration | queryByText returns null |
| Logged-out: Notifications NOT visible | integration | queryByText returns null |
| Logged-in: MY WORSHIP ROOM section visible | integration | Check header and 5 items |
| Logged-in: Dashboard, My Prayers, Friends, Mood Insights, Settings in MY WORSHIP ROOM | integration | Verify all 5 |
| Logged-in: Notifications row visible | integration | Verify bell icon + text |
| Logged-in: Log Out visible | integration | Verify button |
| Logged-in: Log In / Get Started NOT visible | integration | queryByText returns null |
| Section headers have `role="heading" aria-level="2"` | unit | Check ARIA attributes |
| Active item: "Ask God's Word" active on `/ask` | integration | renderNavbar('/ask'), check left border class |
| Active item: "Grow" active on `/grow` | integration | Check border-l-2 class |
| Active item: "Daily Hub" active on `/daily` | integration | Check border-l-2 class |
| Drawer always dark bg | integration | Check `bg-hero-mid` class regardless of auth state |
| All items meet 44px touch target | unit | Check `min-h-[44px]` class |
| Focus trap maintained | integration | Existing test preserved |
| Escape closes drawer | integration | Existing test preserved |

**Expected state after completion:**
- [ ] Mobile drawer organized into labeled sections
- [ ] Active items have left border accent + background highlight
- [ ] Drawer always uses dark theme
- [ ] Section headers accessible with `role="heading" aria-level="2"`
- [ ] All auth-conditional rendering working
- [ ] All tests pass

---

### Step 5: Update SeasonalNavLine + Remove Old Seasonal Banner

**Objective:** Ensure seasonal line matches spec §4, rename sessionStorage key, remove any old standalone seasonal banner.

**Files to modify:**
- `frontend/src/components/SeasonalNavLine.tsx` — Update text styling, key name
- `frontend/src/components/MobileDrawer.tsx` — Update key name in mobile seasonal banner

**Details:**

1. **Text styling update:** Change `text-white/50` to `text-white/40` per spec §4: `text-xs text-white/40`.

2. **Rename sessionStorage key:** `wr_seasonal_banner_dismissed` → `wr_seasonal_nav_dismissed` in both `SeasonalNavLine.tsx` and `MobileDrawer.tsx`.

3. **Verify no old standalone seasonal banner exists** above the navbar. Search for any component rendering a seasonal banner outside of the navbar's frosted glass container. If found, remove it.

4. **Mobile seasonal line:** Already in MobileDrawer from Step 4. Verify styling is consistent with desktop seasonal line but adapted for drawer context.

**Auth gating:** N/A — seasonal line visible to all.

**Responsive behavior:**
- Desktop (1440px): Seasonal line visible inside glass container, below nav links
- Tablet (768px–1024px): Same
- Mobile (< 768px): Seasonal line in mobile drawer header area (not in navbar header)

**Guardrails (DO NOT):**
- DO NOT change the seasonal line's position (must stay inside the frosted glass container)
- DO NOT show seasonal line during Ordinary Time
- DO NOT change the dismiss behavior (sessionStorage, per-session)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Seasonal line uses `wr_seasonal_nav_dismissed` key | integration | Dismiss and check sessionStorage |
| Seasonal line text is `text-white/40` | unit | Check class |
| Dismiss persists to sessionStorage with correct key | integration | Verify key name |
| Existing seasonal tests still pass (with key name update) | integration | Update test assertions |

**Expected state after completion:**
- [ ] Seasonal line styling matches spec (`text-white/40`)
- [ ] sessionStorage key renamed to `wr_seasonal_nav_dismissed`
- [ ] No old standalone seasonal banner exists
- [ ] All seasonal tests pass

---

### Step 6: Update Tests

**Objective:** Update all existing tests for the new navbar structure and add comprehensive new tests.

**Files to modify:**
- `frontend/src/components/__tests__/Navbar.test.tsx` — Major updates for 5-item nav, new avatar dropdown, grouped mobile drawer
- `frontend/src/components/__tests__/Navbar-seasonal.test.tsx` — Update sessionStorage key name

**Details:**

**Navbar.test.tsx changes:**

1. **Desktop nav links tests:** Update to test for 5 items (Daily Hub, Bible, Grow, Prayer Wall, Music). Remove tests for Ask, Daily Devotional, Reading Plans, Challenges in desktop nav.

2. **Remove** the entire `Daily Devotional nav link` describe block (lines 488-530) — this link no longer exists in nav.

3. **Active state tests:** Add tests for all active state patterns from Step 2.

4. **Avatar dropdown tests:** Update `'avatar dropdown has all menu items'` to check for new 5-item list. Remove assertions for "My Prayer Requests", "My Journal Entries", "My Favorites", "Monthly Report". Add assertions for "My Prayers".

5. **Mobile drawer tests:** Update `'mobile menu contains all nav links'` to check for section headers and grouped items. Update logged-in drawer tests for MY WORSHIP ROOM section.

6. **Mobile active state tests:** Add tests for `border-l-2 border-primary` on active items.

7. **Drawer dark theme test:** Update `'uses dark theme when logged in'` — now drawer ALWAYS uses dark theme. Add test that logged-out drawer also has `bg-hero-mid`.

**Navbar-seasonal.test.tsx changes:**
- Update sessionStorage key from `wr_seasonal_banner_dismissed` to `wr_seasonal_nav_dismissed`

**Auth gating:** N/A — testing step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove tests for existing behavior that hasn't changed (dropdown open/close, Escape, focus trap, etc.)
- DO NOT skip testing edge cases (no active state on `/ask`, Grow active on detail pages)

**Test specifications:** This step IS the test update. See individual test descriptions in Steps 2-5 for the full list.

**Expected state after completion:**
- [ ] All Navbar tests updated for new structure
- [ ] New active state tests added
- [ ] Mobile drawer section tests added
- [ ] Avatar dropdown tests updated
- [ ] Full test suite passes with 0 failures
- [ ] No test references removed nav items

---

### Step 7: Update CLAUDE.md and UX Flows Documentation

**Objective:** Update navigation documentation to reflect the new 5-item navbar structure.

**Files to modify:**
- `CLAUDE.md` — Update navigation notes if any reference the old 8-item nav
- `.claude/rules/10-ux-flows.md` — Update Desktop Navbar, Avatar Dropdown, Mobile Drawer sections

**Details:**

**10-ux-flows.md updates:**

1. **Desktop Navbar (Logged Out)** section: Change from 3 top-level links to 5:
```
[Worship Room logo]   Daily Hub   Bible   Grow   Prayer Wall   Music   [Local Support ▾]   [Log In]  [Get Started]
```

2. **Desktop Navbar (Logged In)** section: Same 5 links + auth elements.

3. **Avatar dropdown** section: Update to spec §3's 5 items + divider + Log Out.

4. **Mobile Drawer (Logged Out)** section: Update to grouped sections format.

5. **Mobile Drawer (Logged In)** section: Update to grouped sections with MY WORSHIP ROOM.

**CLAUDE.md:** Check for any navigation references that need updating. The route table is likely fine since routes haven't changed — only the navbar's link set.

**Guardrails (DO NOT):**
- DO NOT change route definitions in CLAUDE.md
- DO NOT modify any other rule files
- DO NOT add documentation that duplicates the spec

**Responsive behavior:** N/A: no UI impact — documentation only.

**Test specifications:** N/A — documentation step.

**Expected state after completion:**
- [ ] 10-ux-flows.md reflects the new 5-item nav, new avatar dropdown, grouped mobile drawer
- [ ] CLAUDE.md navigation notes updated if applicable
- [ ] Documentation matches implemented behavior

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extract sub-components (pure refactor) |
| 2 | 1 | Consolidate desktop nav to 5 items + active states |
| 3 | 1 | Reorganize avatar dropdown |
| 4 | 1, 2 | Redesign mobile drawer with grouped sections (needs `isNavActive` from Step 2) |
| 5 | 1, 4 | Update seasonal line styling + key name |
| 6 | 2, 3, 4, 5 | Update all tests |
| 7 | 2, 3, 4 | Update documentation |

**Steps 2 and 3 can run in parallel** after Step 1 (they modify different files).
**Steps 6 and 7 can run in parallel** after Steps 2-5.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extract sub-components | [COMPLETE] | 2026-03-25 | Created SeasonalNavLine.tsx, LocalSupportDropdown.tsx, AvatarDropdown.tsx, MobileDrawer.tsx. Navbar.tsx reduced from 1030→372 lines. AvatarDropdown is a controlled component (state managed by DesktopUserActions in Navbar.tsx). NAV_LINKS exported from Navbar.tsx for MobileDrawer circular import. All 61 tests pass. |
| 2 | Consolidate desktop nav to 5 items | [COMPLETE] | 2026-03-25 | NAV_LINKS reduced to 5 with icons. isNavActive() exported. DesktopNav uses custom active detection + tablet icon-only (md:flex). Auth elements + hamburger breakpoints updated (lg→md). getActiveChallengeInfo/CHALLENGES imports removed. Daily Devotional test describe block removed. 56 tests pass. |
| 3 | Reorganize avatar dropdown | [COMPLETE] | 2026-03-25 | AVATAR_MENU_LINKS updated to 5 items (Dashboard, My Prayers, Friends, Mood Insights, Settings) with icons. Removed: My Prayer Requests, Monthly Report, My Profile link. Used Heart icon instead of HandHeart (not in Lucide). Each item renders icon+label with gap-3. Tests updated. 45 tests pass. |
| 4 | Redesign mobile drawer with grouped sections | [COMPLETE] | 2026-03-25 | Drawer restructured with 6 labeled sections (DAILY, STUDY, COMMUNITY, LISTEN, FIND HELP, MY WORSHIP ROOM). Always dark theme. DrawerSectionHeader with role=heading aria-level=2. DrawerLink with custom isNavActive + border-l-2 active indicator. Removed: avatar+name header, My Profile link, MOBILE_DRAWER_EXTRA_LINKS, challenge dot, dual theming. Auth buttons styled for dark bg. 45 tests pass. |
| 5 | Update seasonal line + remove old banner | [COMPLETE] | 2026-03-25 | SeasonalNavLine text changed to text-white/40. sessionStorage key renamed wr_seasonal_banner_dismissed→wr_seasonal_nav_dismissed in SeasonalNavLine.tsx, MobileDrawer.tsx, Navbar-seasonal.test.tsx. Old SeasonalBanner.tsx is unused dead code (not rendered anywhere). 56 tests pass. |
| 6 | Update tests | [COMPLETE] | 2026-03-25 | Added 18 new tests: 5-item nav verification, removed items check, tablet aria-labels, 8 active state tests, section headers, auth gating, drawer dark theme, active item indicators, touch targets. Fixed active state assertions (check after:scale-x-0 instead of after:scale-x-100 to avoid hover substring match). Total: 74 tests pass. |
| 7 | Update documentation | [COMPLETE] | 2026-03-26 | Updated 10-ux-flows.md: Desktop navbar (5 items + active states + tablet), avatar dropdown (5 items with icons), mobile drawer (6 sections + MY WORSHIP ROOM), landing page navbar description. CLAUDE.md checked — no old nav references found. |
