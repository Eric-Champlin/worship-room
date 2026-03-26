# Feature: Breadcrumb Navigation

**Master Plan Reference:** N/A — standalone architecture spec (fourth and final navigation restructure spec)

---

## Overview

Worship Room's detail and sub-pages (Bible chapters, reading plan details, challenge details, prayer details) currently have no visual indicator of where the user sits in the page hierarchy. The only way back to a parent page is the browser back button or the navbar. This creates a disconnected feeling that works against the app's mission of creating a calm, guided experience — users exploring scripture or working through a reading plan should always feel oriented, never lost.

This spec adds a shared `Breadcrumb` component that renders a subtle horizontal breadcrumb trail below the hero and above the page content on all detail/sub-pages. It's a wayfinding aid — minimal, quiet, and purely additive. No existing page content, layout, or functionality changes.

This is the **fourth and final architecture and navigation spec**, completing the navigation restructure series that includes Inner Page Hero Redesign, Daily Hub Hero Redesign, Devotional Daily Hub Tab, Grow Page Tabbed Experience, and Navbar Consolidation.

---

## User Stories

- As a **user reading a Bible chapter**, I want to see "Bible > Genesis > Chapter 1" above the content so that I know where I am and can click back to the Bible browser or the book listing.
- As a **user on a reading plan detail page**, I want to see "Grow > Reading Plans > [Plan Title]" so that I can navigate back to the plans tab without using the browser back button.
- As a **user on a challenge detail page**, I want to see "Grow > Challenges > [Challenge Title]" so that I can return to the challenges tab with a single click.
- As a **user who arrived at a Bible chapter via a cross-feature link** (from a devotional, reading plan, or AI chat verse link), I want the breadcrumb to show the full Bible trail so that I can discover the Bible browser even though I didn't start there.
- As a **mobile user**, I want breadcrumbs to be compact enough to fit on one line so they don't waste vertical space on my small screen.

---

## Requirements

### 1. Shared Breadcrumb Component

1. Create a reusable `Breadcrumb` component that accepts a single prop: `items: Array<{ label: string; href?: string }>`.
2. The last item in the array has no `href` — it represents the current page.
3. Render a horizontal trail: items separated by a ChevronRight icon (Lucide, 14px, `text-white/30`).
4. Parent links (items with `href`): `text-white/50 hover:text-white/70` with underline on hover.
5. Current page label (last item, no `href`): `text-white/80`, no link, no underline.
6. The breadcrumb sits in a max-width container matching the page content width, with `px-4` horizontal padding and `py-2` vertical padding.
7. No frosted glass, no background, no border — just text links on the dark background. Minimal and quiet.
8. Uses React Router's `Link` component for navigation. No external dependencies beyond React Router and Lucide icons (both already in the project).

### 2. Semantic HTML & Accessibility

1. Wrap the breadcrumb in a `<nav>` element with `aria-label="Breadcrumb"`.
2. Inside the `<nav>`, use an ordered list (`<ol>`) with `<li>` elements for each breadcrumb item.
3. The last item (current page) has `aria-current="page"`.
4. All links are keyboard navigable with visible focus indicators (`focus-visible:ring-2`).
5. ChevronRight separators are decorative — use `aria-hidden="true"` on separator icons.

### 3. Mobile Truncation

1. On mobile (below 640px), if the breadcrumb trail has 3+ items, show only the immediate parent and current page with an ellipsis prefix: "... > [Parent] > [Current]".
2. The ellipsis is not a link — it's purely visual (rendered as `text-white/30`).
3. On desktop (640px+), show the full trail.
4. This prevents breadcrumbs from wrapping to multiple lines on small screens.

### 4. Primary Pages — Bible Chapter

**Route:** `/bible/:book/:chapter`
**Breadcrumb:** `Bible > [Book Name] > Chapter [X]`

1. "Bible" links to `/bible`.
2. "[Book Name]" links to `/bible?book=[slug]` — the Bible browser scrolls to and expands that book's accordion. The slug should match whatever book identifier the Bible browser uses for its accordion state.
3. "Chapter [X]" is the current page (no link). `[X]` is the chapter number from the route params.
4. The book name should be the full display name (e.g., "Genesis", "1 Corinthians", "Song of Solomon"), not the URL slug.
5. **Cross-feature link edge case:** When the user navigates directly to a chapter via a devotional, reading plan, or AI chat verse link, the breadcrumb still shows the full trail (`Bible > [Book Name] > Chapter [X]`). The breadcrumb is derived from the route, not the navigation history.

### 5. Primary Pages — Reading Plan Detail

**Route:** `/reading-plans/:planId`
**Breadcrumb:** `Grow > Reading Plans > [Plan Title]`

1. "Grow" links to `/grow?tab=plans`.
2. "Reading Plans" also links to `/grow?tab=plans` (same destination — both labels make the hierarchy clear).
3. "[Plan Title]" is the current page (no link). The title comes from the plan data already loaded on the page.
4. Keep the breadcrumb at the plan level — do not add "Day [X]" even if the user is on a specific day.

### 6. Primary Pages — Challenge Detail

**Route:** `/challenges/:challengeId`
**Breadcrumb:** `Grow > Challenges > [Challenge Title]`

1. "Grow" links to `/grow?tab=challenges`.
2. "Challenges" also links to `/grow?tab=challenges`.
3. "[Challenge Title]" is the current page (no link). The title comes from the challenge data already loaded on the page.

### 7. Secondary Pages

Add breadcrumbs to the following secondary pages. These are straightforward single-parent hierarchies:

| Route | Breadcrumb | Parent Link |
|-------|-----------|-------------|
| `/prayer-wall/:id` | `Prayer Wall > [truncated title or "Prayer Request"]` | `/prayer-wall` |
| `/prayer-wall/user/:id` | `Prayer Wall > [User Name]'s Profile` | `/prayer-wall` |
| `/prayer-wall/dashboard` | `Prayer Wall > My Dashboard` | `/prayer-wall` |
| `/insights/monthly` | `Insights > Monthly Report` | `/insights` |

**Prayer detail title:** Use the first ~40 characters of the prayer request text, truncated with an ellipsis if longer. If the prayer text is unavailable, fall back to "Prayer Request".

**Prayer Wall profile name:** Use the user's display name. If unavailable, fall back to "User Profile".

**Growth Profile (`/profile/:userId`):** Do NOT add breadcrumbs to this page. It can be reached from multiple contexts (friends list, leaderboard, prayer wall) and no single parent is clearly correct. The navbar and browser back button are sufficient.

### 8. Pages That Do NOT Get Breadcrumbs

These top-level/root pages are directly accessible from the navbar and do not need breadcrumbs:

- Dashboard (`/`)
- Daily Hub (`/daily`)
- Bible Browser (`/bible`)
- Grow (`/grow`)
- Prayer Wall feed (`/prayer-wall`)
- Music (`/music`, `/music/routines`)
- Local Support pages (`/local-support/*`)
- Settings (`/settings`)
- Insights (`/insights`)
- Friends (`/friends`)
- My Prayers (`/my-prayers`)
- Ask (`/ask`)
- Landing page (logged-out `/`)
- Meditation sub-pages (`/meditate/*`)

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View breadcrumb | Visible on all applicable pages | Visible on all applicable pages | N/A |
| Click breadcrumb link | Navigates to parent page | Navigates to parent page | N/A |

Breadcrumbs are purely navigational — no auth gating required. They appear on whatever pages the user already has access to. If a page itself is auth-gated (e.g., `/prayer-wall/dashboard`, `/insights/monthly`), the breadcrumb is only visible to users who can already see the page.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Truncated trail for 3+ items: `... > [Parent] > [Current]`. Text size `text-xs`. Single line. |
| Tablet (640-1024px) | Full trail. Text size `text-sm`. |
| Desktop (> 1024px) | Full trail. Text size `text-sm`. |

- The breadcrumb never wraps to multiple lines — the mobile truncation ensures this.
- Container width matches the page content's max-width container (same `max-w-*` and horizontal padding).
- Vertical padding is `py-2` — enough to be scannable without wasting space.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Breadcrumbs are visible and functional. No data persistence.
- **Logged-in users:** Breadcrumbs are visible and functional. No data persistence.
- **localStorage usage:** None.
- **Route type:** Breadcrumbs appear on both public and protected routes — they inherit the page's auth requirements.

---

## Completion & Navigation

N/A — standalone navigation component, not a Daily Hub feature.

---

## Design Notes

- **No frosted glass.** Breadcrumbs are minimal text on the dark hero background — no `backdrop-blur`, no `bg-white/5`, no borders. They should be nearly invisible until you need them.
- **Color values from design system recon:** Parent links use `text-white/50` (matches footer muted text `rgba(255,255,255,0.5)` from the design system recon). Hover state `text-white/70`. Current page `text-white/80`. Separator icons `text-white/30`.
- **Typography:** `text-sm` (0.875rem) on tablet/desktop, `text-xs` (0.75rem) on mobile. Inter font (body font, not serif).
- **Separator:** Lucide `ChevronRight` icon at 14px. `text-white/30` — subtle enough to read as a separator, not a visual feature.
- **Placement:** Below the hero section, above the page content. The breadcrumb sits in the transition zone between the dark hero gradient and the content area.
- **Container:** Must match the page content's max-width and horizontal padding so the breadcrumb text aligns with the content below it.
- **No new visual patterns introduced.** This uses existing text colors and standard breadcrumb semantics. No `[UNVERIFIED]` values needed.
- **Existing component reference:** The breadcrumb uses React Router's `Link` component (already used throughout the app) and Lucide's `ChevronRight` icon (Lucide is already a project dependency).

---

## Out of Scope

- **Breadcrumbs on top-level pages** — root pages accessible from the navbar don't need breadcrumbs.
- **Breadcrumbs on Growth Profile** (`/profile/:userId`) — multi-parent ambiguity makes any single breadcrumb misleading.
- **Breadcrumbs on meditation sub-pages** — these redirect to `/daily?tab=meditate` when logged out, and when logged in they're one level deep from a tab (not a page), which makes breadcrumbs awkward.
- **Dynamic "back to referrer" breadcrumbs** — detecting where the user came from and showing a context-sensitive parent (e.g., "Reading Plan > Genesis 1" vs "Bible > Genesis > Chapter 1") adds complexity without proportional value. The breadcrumb always reflects the page's position in the site hierarchy, not the user's navigation history.
- **Breadcrumb schema.org structured data** — JSON-LD breadcrumb markup for SEO could be added later but is not part of this spec.
- **Animated transitions** — breadcrumbs appear instantly, no fade-in or slide animations.
- **Backend changes** — this is a purely frontend feature.

---

## Acceptance Criteria

### Shared Component
- [ ] A reusable `Breadcrumb` component exists that accepts `items: Array<{ label: string; href?: string }>`.
- [ ] The component renders a `<nav>` element with `aria-label="Breadcrumb"`.
- [ ] Inside the `<nav>`, an `<ol>` contains `<li>` elements for each breadcrumb item.
- [ ] The last item has `aria-current="page"` and no link.
- [ ] Separator icons are Lucide `ChevronRight` at 14px with `text-white/30` and `aria-hidden="true"`.
- [ ] Parent links use `text-white/50` with `hover:text-white/70` and underline on hover.
- [ ] Current page label uses `text-white/80`.
- [ ] All links have visible focus indicators (`focus-visible:ring-2`).
- [ ] On mobile (< 640px), trails with 3+ items truncate to `... > [Parent] > [Current]`.
- [ ] On desktop (640px+), the full trail is visible.
- [ ] Breadcrumb text is `text-sm` on tablet/desktop and `text-xs` on mobile.
- [ ] The breadcrumb container matches the page content's max-width and horizontal padding.

### Bible Chapter (`/bible/:book/:chapter`)
- [ ] Breadcrumb shows `Bible > [Book Name] > Chapter [X]`.
- [ ] "Bible" links to `/bible`.
- [ ] "[Book Name]" links to `/bible?book=[slug]`.
- [ ] "Chapter [X]" is the current page with no link.
- [ ] Book name displays as full name (e.g., "1 Corinthians"), not a slug.
- [ ] On mobile, truncates to `... > [Book Name] > Chapter [X]`.
- [ ] Breadcrumb appears even when navigating to the chapter via a cross-feature link.

### Reading Plan Detail (`/reading-plans/:planId`)
- [ ] Breadcrumb shows `Grow > Reading Plans > [Plan Title]`.
- [ ] "Grow" links to `/grow?tab=plans`.
- [ ] "Reading Plans" links to `/grow?tab=plans`.
- [ ] "[Plan Title]" is the current page with no link.
- [ ] On mobile, truncates to `... > Reading Plans > [Plan Title]`.

### Challenge Detail (`/challenges/:challengeId`)
- [ ] Breadcrumb shows `Grow > Challenges > [Challenge Title]`.
- [ ] "Grow" links to `/grow?tab=challenges`.
- [ ] "Challenges" links to `/grow?tab=challenges`.
- [ ] "[Challenge Title]" is the current page with no link.
- [ ] On mobile, truncates to `... > Challenges > [Challenge Title]`.

### Secondary Pages
- [ ] `/prayer-wall/:id` shows `Prayer Wall > [truncated title]` with "Prayer Wall" linking to `/prayer-wall`.
- [ ] `/prayer-wall/user/:id` shows `Prayer Wall > [User Name]'s Profile` with "Prayer Wall" linking to `/prayer-wall`.
- [ ] `/prayer-wall/dashboard` shows `Prayer Wall > My Dashboard` with "Prayer Wall" linking to `/prayer-wall`.
- [ ] `/insights/monthly` shows `Insights > Monthly Report` with "Insights" linking to `/insights`.
- [ ] Prayer detail title truncates at ~40 characters with ellipsis; falls back to "Prayer Request" if unavailable.

### Non-Functional
- [ ] No breadcrumbs appear on any top-level/root page (Dashboard, Daily Hub, Bible Browser, Grow, Prayer Wall feed, Music, Local Support, Settings, Insights, Friends, My Prayers, Ask).
- [ ] No breadcrumbs appear on `/profile/:userId`.
- [ ] No existing page content, layout, or functionality is changed — breadcrumbs are purely additive.
- [ ] Breadcrumbs never wrap to multiple lines on any viewport width.
- [ ] The breadcrumb has no background, no frosted glass, no border — just text.
