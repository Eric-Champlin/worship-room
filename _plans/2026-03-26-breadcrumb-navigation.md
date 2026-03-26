# Implementation Plan: Breadcrumb Navigation

**Spec:** `_specs/breadcrumb-navigation.md`
**Date:** 2026-03-26
**Branch:** `claude/feature/breadcrumb-navigation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- **Shared components:** `frontend/src/components/shared/` (minimal — AvatarPickerModal, ProfileAvatar) and `frontend/src/components/ui/` (Button, Card, Toast)
- **Page components:** `frontend/src/pages/` (route-level components)
- **Data helpers:** `frontend/src/data/bible/index.ts` — `getBookBySlug(slug)` returns `BibleBook` with `.name` (display name) and `.slug`
- **Constants:** `frontend/src/constants/bible.ts` — `BIBLE_BOOKS` array with 66 books
- **Routes:** `frontend/src/App.tsx` — React Router v7 with lazy loading

### Pages Receiving Breadcrumbs

All detail pages follow this pattern:
```tsx
<Layout>
  <div className="min-h-screen bg-[#0f0a1e]"> {/* or bg-dashboard-dark */}
    <section style={ATMOSPHERIC_HERO_BG}><!-- hero --></section>
    {/* BREADCRUMB GOES HERE — between hero </section> and content <main>/<div> */}
    <main className="mx-auto max-w-Xxl px-4"><!-- content --></main>
  </div>
</Layout>
```

**Key differences by page:**

| Page | Route | Wrapper | Content Width | Has "Back" Link |
|------|-------|---------|---------------|-----------------|
| BibleReader | `/bible/:book/:chapter` | `<Layout>` | `max-w-2xl` (chapter selector), `max-w-4xl` (verses) | No (book name is a link in h1) |
| ReadingPlanDetail | `/reading-plans/:planId` | `<Layout>` | `max-w-2xl` | No |
| ChallengeDetail | `/challenges/:challengeId` | `<Layout>` | `max-w-2xl` | No |
| PrayerDetail | `/prayer-wall/:id` | `<PageShell>` | `max-w-[720px]` | Yes (ArrowLeft "Back to Prayer Wall") |
| PrayerWallProfile | `/prayer-wall/user/:id` | `<PageShell>` | `max-w-[720px]` | Yes (ArrowLeft "Back to Prayer Wall") |
| PrayerWallDashboard | `/prayer-wall/dashboard` | `<PageShell>` | `max-w-[720px]` | Yes (ArrowLeft "Back to Prayer Wall") |
| MonthlyReport | `/insights/monthly` | Custom (Navbar+Footer) | `max-w-5xl` | Yes (ArrowLeft "Mood Insights") |

**Prayer Wall pages use `<PageShell>`** (dark bg + Navbar, no hero section). They have "Back to Prayer Wall" links instead of heroes. The breadcrumb replaces these back links.

**MonthlyReport** has its own hero section with a "Mood Insights" back link inside the hero. The breadcrumb replaces this.

### Bible Browser `?book=` Support

`BibleBooksMode` already reads `useSearchParams().get('book')` and passes it as `autoExpandSlug` to `TestamentAccordion`. So linking to `/bible?book=genesis` correctly expands that book's accordion.

### Existing JSON-LD Breadcrumbs

BibleReader and ReadingPlanDetail already have `BreadcrumbList` JSON-LD in their SEO. The visual breadcrumb complements this.

### Test Patterns

Tests use:
- Vitest + React Testing Library
- `MemoryRouter` with `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`
- Provider wrapping: `ToastProvider` > `AuthModalProvider` > `Routes`
- Mock hooks: `vi.mock('@/hooks/useAuth', ...)`
- `screen.getByRole('navigation', { name: /breadcrumb/i })` for nav elements
- `screen.getByText()`, `screen.getByRole('link')` for assertions
- `localStorage.clear()` in `beforeEach`

---

## Auth Gating Checklist

**No auth gating required.** Breadcrumbs are purely navigational — they appear on whatever pages the user already has access to. If a page is auth-gated (e.g., `/prayer-wall/dashboard`, `/insights/monthly`), the breadcrumb only shows for users who can already see the page.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View breadcrumb | Visible on all applicable pages | All steps | Inherits page-level auth |
| Click breadcrumb link | Navigates to parent page | All steps | N/A — standard navigation |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Parent link (default) | color | `text-white/50` (`rgba(255,255,255,0.5)`) | Spec + design-system.md (footer muted text) |
| Parent link (hover) | color | `text-white/70` | Spec |
| Current page label | color | `text-white/80` | Spec |
| Separator icon | color | `text-white/30` | Spec |
| Separator icon | size | 14px (`h-3.5 w-3.5`) | Spec |
| Text (tablet/desktop) | font-size | `text-sm` (0.875rem / 14px) | Spec |
| Text (mobile) | font-size | `text-xs` (0.75rem / 12px) | Spec |
| Font family | font | Inter (body font) | Spec — `font-sans` |
| Container | padding | `px-4` horizontal, `py-2` vertical | Spec |
| Focus indicator | ring | `focus-visible:ring-2 focus-visible:ring-primary` | Frontend standards |
| Hover underline | text-decoration | `hover:underline` | Spec |
| Ellipsis (mobile) | color | `text-white/30` | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Hero sections use `ATMOSPHERIC_HERO_BG` from `@/components/PageHero` — dark radial gradient on `#0f0a1e`
- All detail page heroes use identical padding: `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`
- Breadcrumb sits in the dark zone between hero and content — use white-based text colors (`text-white/*`), not dark theme colors
- Prayer Wall detail pages use `<PageShell>` (no hero section), not `<Layout>` — breadcrumb replaces existing "Back to..." links
- MonthlyReport has its own hero with a back link — breadcrumb replaces that back link
- Container widths vary by page — breadcrumb should match each page's content max-width
- Caveat is for headings only, never for breadcrumb text — use Inter (`font-sans` default)
- Focus indicators: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded`

---

## Shared Data Models (from Master Plan)

N/A — standalone feature, no shared data models.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | Truncated trail for 3+ items: `... > [Parent] > [Current]`. Text `text-xs`. |
| Tablet | 640-1024px | Full trail. Text `text-sm`. |
| Desktop | > 1024px | Full trail. Text `text-sm`. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero `</section>` → Breadcrumb | 0px (breadcrumb sits immediately after hero) | Codebase — hero has `pb-8 sm:pb-12` built in |
| Breadcrumb → Content | `py-2` on breadcrumb provides 8px above + 8px below | Spec |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is clear and complete — no ambiguities identified
- [x] All auth-gated actions from the spec are accounted for (none required)
- [x] Design system values are verified from spec + design system recon
- [x] No [UNVERIFIED] values — spec explicitly defines all colors, sizes, and behavior
- [x] Recon report not applicable (no new visual patterns beyond spec-defined values)
- [x] BibleBooksMode already handles `?book=` query param for accordion auto-expand
- [ ] Lucide `ChevronRight` icon is available in the project (Lucide is already a dependency)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Breadcrumb container width | Match each page's content max-width | Spec says "matches page content's max-width and horizontal padding" — varies by page |
| Prayer Wall pages: replace back links | Yes — breadcrumb replaces "Back to Prayer Wall" links | Breadcrumb serves same purpose + shows hierarchy; keep both would be redundant |
| MonthlyReport: replace hero back link | Yes — breadcrumb replaces "Mood Insights" back link in hero | Same rationale as Prayer Wall pages |
| BibleReader: book link in h1 | Keep the existing link — breadcrumb provides separate navigation | The h1 link (`book.name` in gradient text) is part of the hero design; breadcrumb is a separate wayfinding aid below |
| Prayer detail title truncation | Truncate at 40 chars with `…` | Spec: "first ~40 characters of the prayer request text, truncated with an ellipsis if longer" |
| Container approach | Pass `maxWidth` prop to Breadcrumb | Each page uses different max-width; the Breadcrumb needs to match |

---

## Implementation Steps

### Step 1: Create Shared Breadcrumb Component

**Objective:** Build a reusable, accessible `Breadcrumb` component.

**Files to create:**
- `frontend/src/components/ui/Breadcrumb.tsx` — The component

**Details:**

```tsx
interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  maxWidth?: string // Tailwind max-w class, e.g. "max-w-2xl", "max-w-4xl", "max-w-[720px]"
}
```

Implementation:
- Wrap in `<nav aria-label="Breadcrumb">`
- Inside: `<ol className="flex items-center gap-1.5 ...">` with `<li>` per item
- Items with `href`: `<Link to={href} className="text-white/50 hover:text-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded">`
- Last item (no `href`): `<span aria-current="page" className="text-white/80">`
- Separators: `<ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" aria-hidden="true" />` — placed BETWEEN items (not after last)
- Container: `<div className={cn("mx-auto px-4 sm:px-6", maxWidth ?? "max-w-2xl")}>`
- Outer wrapper padding: `py-2`
- Text size: `text-xs sm:text-sm`
- Font: Inter (default, no explicit class needed)

**Mobile truncation (< 640px, 3+ items):**
- Use a responsive approach: on `sm:` breakpoint, show all items. Below `sm:`, show only the last 2 items with an ellipsis prefix.
- Render all items, but use `hidden sm:flex` on the early items and `flex sm:hidden` on the ellipsis span.
- Ellipsis: `<span className="text-white/30" aria-hidden="true">…</span>`

**Responsive behavior:**
- Desktop (1440px): Full trail, `text-sm`
- Tablet (768px): Full trail, `text-sm`
- Mobile (375px): Truncated to `... > [Parent] > [Current]` for 3+ items, `text-xs`

**Guardrails (DO NOT):**
- DO NOT add any background, border, backdrop-blur, or frosted glass styling
- DO NOT use Caveat or Lora fonts — breadcrumb is always Inter
- DO NOT make the last item (current page) a link
- DO NOT add separators after the last item
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders nav with aria-label | unit | `<nav>` has `aria-label="Breadcrumb"` |
| renders ol with li items | unit | `<ol>` contains correct number of `<li>` elements |
| parent items are links | unit | Items with `href` render as `<Link>` with correct `to` prop |
| last item has aria-current | unit | Last item has `aria-current="page"` and no link |
| separators are aria-hidden | unit | ChevronRight icons have `aria-hidden="true"` |
| mobile truncation for 3+ items | unit | On narrow viewport, only last 2 items + ellipsis are visible (check hidden/flex classes) |
| full trail for 2 items | unit | 2-item trail shows both items on all viewports (no ellipsis) |
| applies maxWidth prop | unit | Container has the specified max-width class |
| focus indicators on links | unit | Links have `focus-visible:ring-2` class |

**Expected state after completion:**
- [ ] `Breadcrumb` component exists at `frontend/src/components/ui/Breadcrumb.tsx`
- [ ] Component is exported
- [ ] All 9 tests pass
- [ ] Component renders correctly with 2, 3, and 4-item trails

---

### Step 2: Add Breadcrumb to BibleReader

**Objective:** Add `Bible > [Book Name] > Chapter [X]` breadcrumb to `/bible/:book/:chapter`.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx` — Add Breadcrumb between hero `</section>` and chapter selector

**Details:**

Import `Breadcrumb` from `@/components/ui/Breadcrumb`.

Build breadcrumb items array after the `book` and `chapterNumber` variables are defined:
```tsx
const breadcrumbItems = book ? [
  { label: 'Bible', href: '/bible' },
  { label: book.name, href: `/bible?book=${book.slug}` },
  { label: `Chapter ${chapterNumber}` },
] : []
```

Insert `{book && <Breadcrumb items={breadcrumbItems} maxWidth="max-w-2xl" />}` between the hero `</section>` and the chapter selector `<div>`.

Use `maxWidth="max-w-2xl"` to match the chapter selector's container width (the narrowest content block directly below the hero).

**Responsive behavior:**
- Desktop (1440px): `Bible > Genesis > Chapter 1` (full trail)
- Tablet (768px): `Bible > Genesis > Chapter 1` (full trail)
- Mobile (375px): `... > Genesis > Chapter 1` (truncated — 3 items)

**Guardrails (DO NOT):**
- DO NOT remove or modify the existing JSON-LD breadcrumbs — they serve SEO
- DO NOT change the h1 link (book name link in hero) — it's a separate navigation element
- DO NOT change any existing layout, spacing, or functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders breadcrumb with Bible trail | integration | Breadcrumb shows "Bible", book name, and "Chapter N" |
| Bible link points to /bible | integration | First breadcrumb item links to `/bible` |
| Book name link points to /bible?book=slug | integration | Second item links to `/bible?book={slug}` |
| displays full book name | integration | Shows "1 Corinthians" not "1-corinthians" |

**Expected state after completion:**
- [ ] BibleReader shows breadcrumb below hero
- [ ] Breadcrumb items link to correct routes
- [ ] All existing BibleReader tests still pass
- [ ] 4 new tests pass

---

### Step 3: Add Breadcrumb to ReadingPlanDetail

**Objective:** Add `Grow > Reading Plans > [Plan Title]` breadcrumb to `/reading-plans/:planId`.

**Files to modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Add Breadcrumb between hero `</section>` and `DayContent`

**Details:**

Import `Breadcrumb` from `@/components/ui/Breadcrumb`.

Build breadcrumb items after `plan` is validated (after the `if (!plan) return <PlanNotFound />` guard):
```tsx
const breadcrumbItems = [
  { label: 'Grow', href: '/grow?tab=plans' },
  { label: 'Reading Plans', href: '/grow?tab=plans' },
  { label: plan.title },
]
```

Insert `<Breadcrumb items={breadcrumbItems} maxWidth="max-w-2xl" />` between `</section>` (hero) and the `{currentDayContent && ...}` block.

**Responsive behavior:**
- Desktop: `Grow > Reading Plans > 7 Days of Gratitude` (full trail)
- Mobile: `... > Reading Plans > 7 Days of Gratitude` (truncated — 3 items)

**Guardrails (DO NOT):**
- DO NOT add "Day X" to the breadcrumb — spec explicitly says keep at plan level
- DO NOT modify the existing JSON-LD breadcrumbs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders breadcrumb with plan trail | integration | Shows "Grow", "Reading Plans", and plan title |
| Grow and Reading Plans link to /grow?tab=plans | integration | Both parent items link correctly |
| current page shows plan title | integration | Last item shows the plan's title text |

**Expected state after completion:**
- [ ] ReadingPlanDetail shows breadcrumb below hero
- [ ] All existing ReadingPlanDetail tests still pass
- [ ] 3 new tests pass

---

### Step 4: Add Breadcrumb to ChallengeDetail

**Objective:** Add `Grow > Challenges > [Challenge Title]` breadcrumb to `/challenges/:challengeId`.

**Files to modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Add Breadcrumb between hero `</section>` and content

**Details:**

Import `Breadcrumb` from `@/components/ui/Breadcrumb`.

Build breadcrumb items after the `if (!challenge) return <ChallengeNotFound />` guard:
```tsx
const breadcrumbItems = [
  { label: 'Grow', href: '/grow?tab=challenges' },
  { label: 'Challenges', href: '/grow?tab=challenges' },
  { label: challenge.title },
]
```

Insert `<Breadcrumb items={breadcrumbItems} maxWidth="max-w-2xl" />` between hero `</section>` and the content below it.

**Responsive behavior:**
- Desktop: `Grow > Challenges > Lenten Journey` (full trail)
- Mobile: `... > Challenges > Lenten Journey` (truncated — 3 items)

**Guardrails (DO NOT):**
- DO NOT modify any challenge logic or hero styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders breadcrumb with challenge trail | integration | Shows "Grow", "Challenges", and challenge title |
| Grow and Challenges link to /grow?tab=challenges | integration | Both parent items link correctly |

**Expected state after completion:**
- [ ] ChallengeDetail shows breadcrumb below hero
- [ ] All existing ChallengeDetail tests still pass
- [ ] 2 new tests pass

---

### Step 5: Add Breadcrumb to Prayer Wall Detail Pages

**Objective:** Add breadcrumbs to `/prayer-wall/:id`, `/prayer-wall/user/:id`, and `/prayer-wall/dashboard`. Replace existing "Back to Prayer Wall" links.

**Files to modify:**
- `frontend/src/pages/PrayerDetail.tsx` — Replace back link with breadcrumb
- `frontend/src/pages/PrayerWallProfile.tsx` — Replace back link with breadcrumb
- `frontend/src/pages/PrayerWallDashboard.tsx` — Replace back link with breadcrumb

**Details:**

**PrayerDetail (`/prayer-wall/:id`):**
- Import `Breadcrumb` from `@/components/ui/Breadcrumb`
- Build items: `[ { label: 'Prayer Wall', href: '/prayer-wall' }, { label: truncatedTitle } ]`
- Truncation logic: `prayer.content.length > 40 ? prayer.content.slice(0, 40).trim() + '…' : prayer.content`. If `prayer` is null, fall back to `"Prayer Request"`.
- Place `<Breadcrumb items={items} maxWidth="max-w-[720px]" />` inside `<main>` at the top, replacing the `<Link to="/prayer-wall" ...>Back to Prayer Wall</Link>` element.
- Also replace the back link in the "not found" branch.
- These pages use `<PageShell>` which has no hero — the breadcrumb sits at the top of `<main>`.
- Add `pt-32 sm:pt-36` to `<main>` to provide navbar clearance (previously the back link had `py-6` but the breadcrumb needs consistent top spacing matching the hero-based pages).

Wait — actually, the Prayer Wall pages already have `py-6 sm:py-8` on `<main>`. The breadcrumb replaces the back link so it should sit at the same position. The `py-2` padding on the Breadcrumb itself provides vertical space. Keep the existing `py-6 sm:py-8` on `<main>`.

**PrayerWallProfile (`/prayer-wall/user/:id`):**
- Build items: `[ { label: 'Prayer Wall', href: '/prayer-wall' }, { label: user ? `${user.firstName}'s Profile` : 'User Profile' } ]`
- Replace the `<Link to="/prayer-wall" ...>Back to Prayer Wall</Link>` with `<Breadcrumb items={items} maxWidth="max-w-[720px]" />`
- Also replace in the "not found" branch.

**PrayerWallDashboard (`/prayer-wall/dashboard`):**
- Build items: `[ { label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'My Dashboard' } ]`
- Replace the `<Link to="/prayer-wall" ...>Back to Prayer Wall</Link>` with `<Breadcrumb items={items} maxWidth="max-w-[720px]" />`

For all three: since these are 2-item breadcrumbs, no mobile truncation occurs (truncation only happens at 3+ items).

**Responsive behavior:**
- All viewports: `Prayer Wall > [Title]` (2 items, no truncation needed)

**Guardrails (DO NOT):**
- DO NOT change the `<PageShell>` component itself
- DO NOT add a hero section to these pages — they intentionally don't have one
- DO NOT change the `max-w-[720px]` container width
- DO NOT remove the `mb-6` spacing that was on the old back link — ensure the breadcrumb has equivalent margin-bottom so the content below it stays properly spaced

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerDetail: renders breadcrumb | integration | Shows "Prayer Wall" and truncated prayer title |
| PrayerDetail: truncates long titles at 40 chars | unit | Title > 40 chars shows ellipsis |
| PrayerDetail: falls back to "Prayer Request" | integration | When prayer not found, breadcrumb shows fallback text |
| PrayerWallProfile: renders breadcrumb | integration | Shows "Prayer Wall" and user name |
| PrayerWallProfile: falls back to "User Profile" | integration | When user not found, shows fallback |
| PrayerWallDashboard: renders breadcrumb | integration | Shows "Prayer Wall" and "My Dashboard" |
| All three: back link removed | integration | No "Back to Prayer Wall" text/ArrowLeft icon |

**Expected state after completion:**
- [ ] All 3 Prayer Wall detail pages show breadcrumb instead of back link
- [ ] All existing tests still pass (update assertions that checked for "Back to Prayer Wall")
- [ ] 7 new tests pass

---

### Step 6: Add Breadcrumb to MonthlyReport

**Objective:** Add `Insights > Monthly Report` breadcrumb to `/insights/monthly`. Replace the existing back link in the hero.

**Files to modify:**
- `frontend/src/pages/MonthlyReport.tsx` — Replace back link with breadcrumb below hero

**Details:**

Import `Breadcrumb` from `@/components/ui/Breadcrumb`.

Build items:
```tsx
const breadcrumbItems = [
  { label: 'Insights', href: '/insights' },
  { label: 'Monthly Report' },
]
```

Remove the existing back link from inside the hero section:
```tsx
// REMOVE this block from inside <section>:
<Link to="/insights" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 ...">
  <ArrowLeft ... /> Mood Insights
</Link>
```

Insert `<Breadcrumb items={breadcrumbItems} maxWidth="max-w-5xl" />` between the hero `</section>` and the content area.

Use `maxWidth="max-w-5xl"` to match the MonthlyReport content container.

**Responsive behavior:**
- All viewports: `Insights > Monthly Report` (2 items, no truncation)

**Guardrails (DO NOT):**
- DO NOT change the month navigation controls in the hero
- DO NOT modify the auth redirect logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders breadcrumb with Insights trail | integration | Shows "Insights" and "Monthly Report" |
| Insights link points to /insights | integration | First item links to `/insights` |
| back link removed from hero | integration | No "Mood Insights" back link text or ArrowLeft in hero |

**Expected state after completion:**
- [ ] MonthlyReport shows breadcrumb below hero
- [ ] Back link removed from hero
- [ ] All existing MonthlyReport tests still pass (update any back link assertions)
- [ ] 3 new tests pass

---

### Step 7: Verify No Breadcrumbs on Excluded Pages

**Objective:** Ensure no breadcrumbs appear on top-level pages or explicitly excluded pages.

**Files to modify:** None — this is a verification step only.

**Details:**

Verify by code inspection that the `Breadcrumb` component is NOT imported or rendered in:
- Dashboard (`/`) — `pages/Dashboard.tsx`
- Home (landing) — `pages/Home.tsx`
- Daily Hub (`/daily`) — `pages/DailyHub.tsx`
- Bible Browser (`/bible`) — `pages/BibleBrowser.tsx`
- Grow (`/grow`) — `pages/GrowPage.tsx`
- Prayer Wall (`/prayer-wall`) — `pages/PrayerWall.tsx`
- Music pages — `pages/MusicPage.tsx`, `pages/RoutinesPage.tsx`
- Local Support — `pages/Churches.tsx`, `pages/Counselors.tsx`, `pages/CelebrateRecovery.tsx`
- Settings — `pages/Settings.tsx`
- Insights — `pages/MoodInsights.tsx`
- Friends — `pages/Friends.tsx`
- My Prayers — `pages/MyPrayers.tsx`
- Ask — `pages/AskPage.tsx`
- Growth Profile — `pages/GrowthProfile.tsx`
- Meditation sub-pages

**Responsive behavior:** N/A: no UI impact.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Breadcrumb not on excluded pages | integration | Render each excluded page and verify no `<nav aria-label="Breadcrumb">` exists |

This can be a single test file that spot-checks 3-4 representative excluded pages (Dashboard, BibleBrowser, PrayerWall feed, GrowPage).

**Expected state after completion:**
- [ ] Verified: no breadcrumbs on any excluded page
- [ ] 1 test file with 4 assertions passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create shared Breadcrumb component |
| 2 | 1 | Add to BibleReader |
| 3 | 1 | Add to ReadingPlanDetail |
| 4 | 1 | Add to ChallengeDetail |
| 5 | 1 | Add to Prayer Wall detail pages |
| 6 | 1 | Add to MonthlyReport |
| 7 | 2-6 | Verify excluded pages |

Steps 2-6 are independent of each other and can be executed in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create shared Breadcrumb component | [COMPLETE] | 2026-03-26 | Created `frontend/src/components/ui/Breadcrumb.tsx` and `frontend/src/components/ui/__tests__/Breadcrumb.test.tsx`. 10 tests pass. |
| 2 | Add to BibleReader | [COMPLETE] | 2026-03-26 | Modified `BibleReader.tsx` — added Breadcrumb import and component between hero and chapter selector. Updated existing hero link test to scope to heading. 4 new breadcrumb tests pass. |
| 3 | Add to ReadingPlanDetail | [COMPLETE] | 2026-03-26 | Modified `ReadingPlanDetail.tsx`. Fixed existing hero test to scope to heading. 3 new breadcrumb tests pass. |
| 4 | Add to ChallengeDetail | [COMPLETE] | 2026-03-26 | Modified `ChallengeDetail.tsx`. Fixed existing hero test. 2 new breadcrumb tests pass. |
| 5 | Add to Prayer Wall detail pages | [COMPLETE] | 2026-03-26 | Modified `PrayerDetail.tsx`, `PrayerWallProfile.tsx`, `PrayerWallDashboard.tsx` — replaced back links with Breadcrumb. Removed unused ArrowLeft imports. Updated 3 existing "Back to Prayer Wall" tests. Added breadcrumb tests (3 in PrayerDetail, 2 in PrayerWallProfile, 1 in PrayerWallDashboard). All pass. |
| 6 | Add to MonthlyReport | [COMPLETE] | 2026-03-26 | Modified `MonthlyReport.tsx` — removed back link from hero, added Breadcrumb below hero. Removed unused ArrowLeft/Link imports. Updated existing back link test to verify breadcrumb. All 20 tests pass. |
| 7 | Verify no breadcrumbs on excluded pages | [COMPLETE] | 2026-03-26 | Created `BreadcrumbExcluded.test.tsx` with 4 assertions (BibleBrowser, PrayerWall, GrowPage, DailyHub). All pass. Code inspection confirms Breadcrumb only imported in 7 target pages. Full suite: 4347 passed, 1 flaky pre-existing failure (useNotifications timing). |
