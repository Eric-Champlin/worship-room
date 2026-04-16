# Implementation Plan: Mobile Drawer Restyle

**Spec:** `_specs/mobile-drawer-restyle.md`
**Date:** 2026-02-24
**Branch:** claude/feature/mobile-drawer-restyle

---

## Architecture Context

**Primary file:** `frontend/src/components/Navbar.tsx` — contains the `MobileDrawer` component (lines 337-531) as a private function component within the Navbar module.

**Current drawer structure (MobileDrawer component):**
- Backdrop overlay: `fixed inset-0 z-40 bg-black/20` (line 375) — **unchanged**
- Drawer panel: `<nav>` with class `relative z-50 border-t border-gray-100 lg:hidden` (line 387)
- Inner container: `flex flex-col px-4 py-4` (line 389)
- Section headings: `px-3 text-xs font-semibold uppercase tracking-wider text-text-dark` (lines 394, 426, 480)
- Nav links: use `cn()` with active/inactive states — active: `bg-primary/5 text-primary`, inactive: `text-text-dark hover:bg-neutral-bg hover:text-primary` (lines 403-410, etc.)
- Dividers: `border-t border-gray-100` (lines 420, 451, 474, 505)
- Log In: `text-text-dark hover:text-primary` with underline effect (lines 509-514)
- Get Started: `bg-primary text-white hover:bg-primary-lt` (line 521)

**Key observation:** The drawer panel itself has NO glassmorphic/blur/gradient classes. The purple appearance comes from the drawer being rendered **inside** the navbar's `rounded-2xl` container (line 576) which has `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` when `transparent=true`. The drawer inherits the parent's glassmorphic background. The hamburger button and X close button also inherit color from the parent context.

**Hamburger/Close button:** Located in the parent `Navbar` component (lines 587-606), styled with `transparent ? 'text-white hover:bg-white/10 hover:text-white' : 'text-text-dark hover:bg-neutral-bg hover:text-primary'`.

**Logo:** `NavbarLogo` component (lines 48-61), styled with `transparent ? 'text-white' : 'text-primary'`.

**Tailwind color tokens (from tailwind.config.js):**
- `text-dark`: #2C3E50
- `text-light`: #7F8C8D
- `primary`: #6D28D9
- `primary-lt`: #8B5CF6
- `neutral-bg`: #F5F5F5

**Test file:** `frontend/src/components/__tests__/Navbar.test.tsx` — 498 lines, comprehensive tests for dropdowns, mobile menu, ARIA attributes, and keyboard behavior. No tests assert specific colors/styles except:
- Line 488: `expect(link.className).toContain('text-primary')` (active route styling)
- Line 489: `expect(link.className).toContain('after:scale-x-100')` (active underline)
These tests are for the desktop nav active state and should not be affected.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] The drawer's purple appearance is inherited from the parent glassmorphic container, not from the drawer itself
- [x] The `transparent` prop on `Navbar` is `true` on the landing page (hero) — this is the main case where the drawer looks purple
- [x] No tests assert specific drawer background colors or styles
- [x] The `border-gray-100` Tailwind class maps to a light enough gray for the spec's #E5E7EB requirement (gray-100 = #F3F4F6, gray-200 = #E5E7EB)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| How to give drawer a white background when parent is glassmorphic | Add explicit `bg-white` to the drawer's `<nav>` element and apply `rounded-b-2xl` to match parent shape | The drawer sits inside the glassmorphic pill; it needs its own opaque background to override the parent's transparency |
| Section heading color | Change from `text-text-dark` to `text-text-light` | Spec requires muted gray (#7F8C8D) for section headings, which maps to the `text-light` token |
| Divider color | Change from `border-gray-100` to `border-gray-200` | Spec requires #E5E7EB which is Tailwind's `gray-200` (gray-100 is #F3F4F6, too light) |
| Hover/active state for links | Light violet background tint + violet underline | Spec suggests using both if it looks good; combining `hover:bg-primary-lt/10` with the existing underline pattern gives clear feedback |
| Logo color when drawer is open | Primary violet (#6D28D9) | Spec says choose whichever looks better; violet provides brand continuity and visual interest against white |
| Close button (X) color when drawer is open | Text Dark (#2C3E50) | Must be dark for contrast against the new white background |
| Hamburger button color when drawer is closed (transparent mode) | Keep white (unchanged) | Spec only covers the drawer styling; the hamburger on the hero should stay white against the dark hero background |

---

## Implementation Steps

### Step 1: Restyle the MobileDrawer panel background and dividers

**Objective:** Give the drawer an opaque white background and update dividers to match spec.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — MobileDrawer component (lines 382-528)

**Details:**

1. On the drawer `<nav>` element (line 387), change:
   - From: `className="relative z-50 border-t border-gray-100 lg:hidden"`
   - To: `className="relative z-50 rounded-b-2xl bg-white border-t border-gray-200 lg:hidden"`
   - Adds `bg-white` for opaque white background, `rounded-b-2xl` to match the parent pill's bottom corners, changes `border-gray-100` to `border-gray-200` (#E5E7EB)

2. Update all section dividers from `border-gray-100` to `border-gray-200`:
   - Line 420: Music section divider
   - Line 451: Prayer Wall section divider
   - Line 474: Local Support section divider
   - Line 505: Auth actions divider

**Guardrails (DO NOT):**
- Do not modify the backdrop overlay (line 375) — it stays as-is
- Do not add any `backdrop-filter` or blur effects to the drawer
- Do not change the DesktopNav or any non-mobile components
- Do not change any links, routes, or ARIA attributes

**Test specifications:**
No new tests needed for this step — existing tests verify structure and behavior, not background colors.

**Expected state after completion:**
- [ ] Drawer panel renders with white background
- [ ] Dividers are visible but subtle (#E5E7EB)
- [ ] Drawer corners match the parent pill shape

---

### Step 2: Update section headings, link hover states, and close/logo colors

**Objective:** Update text colors, hover states, and the hamburger/logo appearance when the drawer is open.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — MobileDrawer component + Navbar component

**Details:**

1. **Section headings** — Change heading color from `text-text-dark` to `text-text-light` on all three section labels:
   - Line 394 (Daily heading): change `text-text-dark` → `text-text-light`
   - Line 426 (Music heading): change `text-text-dark` → `text-text-light`
   - Line 480 (Local Support heading): change `text-text-dark` → `text-text-light`

2. **Link hover/active states** — Update the inactive link classes across all nav link groups (Daily, Music, Prayer Wall, Local Support). Change the hover pattern from `hover:bg-neutral-bg hover:text-primary` to add a violet tint and underline. Replace the inactive class string in all four link groups:
   - From: `'text-text-dark hover:bg-neutral-bg hover:text-primary'`
   - To: `'text-text-dark hover:bg-primary-lt/10 hover:text-primary hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4'`
   - Apply to: lines 409, 441, 463, 495

3. **Hamburger / Close button** — In the main `Navbar` component, the hamburger button (lines 587-606) needs to show dark when the drawer is open (white background) even if `transparent` is true. Update the hamburger button's className:
   - From: `transparent ? 'text-white hover:bg-white/10 hover:text-white' : 'text-text-dark hover:bg-neutral-bg hover:text-primary'`
   - To: `transparent && !isMenuOpen ? 'text-white hover:bg-white/10 hover:text-white' : 'text-text-dark hover:bg-neutral-bg hover:text-primary'`
   - This makes the close button (X) dark when the drawer is open, regardless of the `transparent` prop

4. **Logo** — Similarly, the `NavbarLogo` renders inside the same glassmorphic container. When the drawer is open on a transparent navbar, the logo should also switch to Primary violet. Pass `isMenuOpen` state to the logo, or handle inline:
   - Update the `NavbarLogo` call at line 582 to: `<NavbarLogo transparent={transparent && !isMenuOpen} />`
   - This makes the logo use `text-primary` (violet) when the drawer is open, `text-white` when closed on hero

**Guardrails (DO NOT):**
- Do not change the active link state (`bg-primary/5 text-primary`) — this already looks correct on white
- Do not change the "Get Started" button styling — it already has `bg-primary text-white`
- Do not change the "Log In" button styling — it already has `text-text-dark` with a violet underline hover
- Do not modify desktop nav link colors or behavior
- Do not change any functional behavior (routing, ARIA, focus management)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Mobile drawer section headings are visible | integration | Open mobile menu, verify "Daily", "Music", "Local Support" headings are present (existing test at line 446 already covers link presence) |

No new test assertions needed — existing tests verify all links are present and drawer opens/closes correctly. The active route test (line 488) checks desktop nav, not the mobile drawer.

**Expected state after completion:**
- [ ] Section headings appear in muted gray
- [ ] Links show violet tint + underline on hover
- [ ] Close button (X) is dark against white drawer background
- [ ] Logo shows as violet against white drawer background
- [ ] "Log In" text is dark, "Get Started" button is violet — unchanged
- [ ] All existing tests pass

---

### Step 3: Run tests and visual verification

**Objective:** Confirm all tests pass and the drawer renders correctly.

**Files to modify:** None (verification step only)

**Details:**

1. Run the full frontend test suite: `cd frontend && pnpm test`
2. Verify all Navbar tests pass (especially the Hamburger menu test suite)
3. Visual check: open `http://localhost:5173/` on mobile viewport, open the drawer, verify:
   - White background, no purple/blur
   - Dark link text, muted section headings
   - Violet hover states on links
   - Dark close button (X)
   - Violet logo text
   - Light gray dividers
   - Purple "Get Started" button
   - Dark "Log In" text

**Guardrails (DO NOT):**
- Do not make any code changes in this step unless tests fail

**Expected state after completion:**
- [ ] All frontend tests pass
- [ ] Visual appearance matches spec requirements

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Restyle drawer panel background and dividers |
| 2 | 1 | Update text colors, hover states, close button, and logo |
| 3 | 1, 2 | Run tests and visual verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Restyle drawer panel background and dividers | [COMPLETE] | 2026-02-24 | `Navbar.tsx`: added `bg-white rounded-b-2xl` to drawer nav, changed all `border-gray-100` to `border-gray-200` |
| 2 | Update text colors, hover states, close/logo colors | [COMPLETE] | 2026-02-24 | `Navbar.tsx`: headings → `text-text-light`, links → `hover:bg-primary-lt/10` + underline, hamburger/logo/parent container use `transparent && !isMenuOpen` |
| 3 | Run tests and visual verification | [COMPLETE] | 2026-02-24 | 156/156 tests pass. Visual verified: white drawer, dark text, muted headings, violet logo, dark X, purple Get Started, desktop navbar unchanged |
| 4 | Revised approach: popup card style | [COMPLETE] | 2026-02-24 | User feedback: keep header unchanged, style drawer as popup card. Reverted `transparent && !isMenuOpen` on parent/logo/hamburger back to `transparent`. Moved `<MobileDrawer>` outside glassmorphic container. Restyled drawer nav as `rounded-xl bg-white shadow-[0_4px_24px_-4px_rgba(109,40,217,0.25)] ring-1 ring-primary/10 animate-dropdown-in` matching desktop dropdown style. 156/156 tests pass. Visual verified. |
