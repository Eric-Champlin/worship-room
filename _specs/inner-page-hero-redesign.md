# Feature: Inner Page Hero Redesign

## Overview

Every inner page in Worship Room currently renders its hero section as a purple gradient box with visible edges that floats on the page background. Now that all pages have been converted to dark backgrounds (#0f0a1e), these floating gradient boxes look disconnected and dated -- the hero gradient ends abruptly, creating a visible boundary between the hero and the content below.

This spec replaces all floating hero boxes with flush full-width atmospheric gradient heroes that feel integrated with the page. Instead of a gradient box, each hero becomes a full-width section with a subtle radial glow emanating from top center that fades seamlessly into the page background. No edges, no borders, no box constraints. The hero and the content below it feel like one continuous surface.

This is the **fifth of 6 visual foundation specs**.

---

## User Story

As a **logged-out visitor or logged-in user**, I want every inner page hero to feel like a seamless part of the page rather than a floating box, so that the experience feels cohesive and immersive from the moment the page loads.

---

## Requirements

### 1. New Hero Visual Pattern

All inner page heroes adopt a unified visual treatment:

#### 1.1 Background
- **Base color**: The page background (`#0f0a1e`) -- the hero's background IS the page background
- **Gradient overlay**: `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` -- a subtle purple atmospheric glow that fades into the page background seamlessly
- No visible border, box-shadow, or border-radius on the hero container
- No background that stops at a visible edge -- the radial gradient fades to full transparency before reaching the hero's edges

#### 1.2 Layout
- Full viewport width (no max-width constraint on the hero container itself)
- Content within the hero is max-width constrained as needed per page
- Hero height is determined by its content -- no fixed height
- Hero flows directly into the content below with no gap, spacer div, or margin-top on the first content section
- No margin creating a gap between the hero and the navbar above or the content below

#### 1.3 Spacing
- **Desktop**: `py-12` (48px top and bottom)
- **Mobile**: `py-8` (32px top and bottom)
- Additional top padding accounts for the fixed navbar (the existing `pt-32 sm:pt-36 lg:pt-40` pattern for navbar clearance is preserved)

#### 1.4 Typography
- **Page title**: Caveat script font (`font-script`), centered
  - Desktop: `text-4xl` (2.25rem)
  - Mobile: `text-3xl` (1.875rem)
  - Color: white with gradient text effect -- `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` (matching the landing page headline treatment)
- **Subtitle** (when present): Lora italic (`font-serif italic`), centered
  - Desktop: `text-lg`
  - Mobile: `text-base`
  - Color: `text-white/60`

#### 1.5 Responsive Gradient Behavior
- On mobile, the radial gradient ellipse is tighter (closer to the title area)
- On desktop, the gradient spreads wider
- The gradient should never look clipped or abruptly cut off at any viewport width
- This can be achieved naturally with `ellipse at top center` which scales with container width

### 2. Pages to Update

Every inner page hero must be updated to the new pattern. The following table specifies the title, subtitle, and any special elements for each page.

#### 2.1 Pages Using the Shared `PageHero` Component

These pages use the `PageHero` component and will inherit the new style when the component is updated:

| Route | Title | Subtitle | Special Elements |
|-------|-------|----------|-----------------|
| `/ask` | Ask God's Word | _(has HeadingDivider + search input below)_ | HeadingDivider + child content (search subtitle) |
| `/music` | Music | _(existing subtitle)_ | None |
| `/my-prayers` | My Prayers | Your personal conversation with God. | None |

Pages using `PageHero` through `Layout` hero prop (meditation sub-pages):

| Route | Title | Subtitle |
|-------|-------|----------|
| `/meditate/breathing` | Breathing Exercise | _(none)_ |
| `/meditate/soaking` | Scripture Soaking | _(none or existing)_ |
| `/meditate/gratitude` | Gratitude Reflection | _(existing subtitle where present)_ |
| `/meditate/acts` | ACTS Prayer Walk | _(none)_ |
| `/meditate/psalms` | Psalm Reading | _(existing subtitle where present)_ |
| `/meditate/examen` | Examen Reflection | _(none)_ |

#### 2.2 Pages Using `LocalSupportHero` Component

These pages share the `LocalSupportHero` component:

| Route | Title | Subtitle | Special Elements |
|-------|-------|----------|-----------------|
| `/local-support/churches` | Find a Church Near You | _(existing subtitle)_ | Extra content + action button |
| `/local-support/counselors` | Find a Christian Counselor | _(existing subtitle)_ | Extra content + action button |
| `/local-support/celebrate-recovery` | Find Celebrate Recovery | _(existing subtitle)_ | Extra content + action button |

#### 2.3 Pages Using `PrayerWallHero` Component

| Route | Title | Subtitle | Special Elements |
|-------|-------|----------|-----------------|
| `/prayer-wall` | Prayer Wall | You're not alone. | HeadingDivider + "Share a Prayer Request" CTA |

#### 2.4 Pages with Custom Hero Implementations

Each of these pages has a unique hero section that must be individually updated:

| Route | Title | Subtitle | Special Elements |
|-------|-------|----------|-----------------|
| `/daily` | Time-aware greeting (existing) | Start with any practice below. | Quiz teaser link |
| `/bible` | Bible | The Word of God | None (content area follows immediately) |
| `/bible/:book/:chapter` | [Book] Chapter [X] | _(none)_ | Book name as link |
| `/devotional` | Daily Devotional | _(none -- date nav below)_ | Date navigation arrows + date display + completed badge |
| `/reading-plans` | Reading Plans | Guided journeys through Scripture | None |
| `/reading-plans/:planId` | _(plan title)_ | _(none -- progress bar below)_ | Progress bar |
| `/challenges` | Community Challenges | Grow together in faith | None |
| `/challenges/:challengeId` | _(challenge title)_ | _(challenge description)_ | Challenge icon + season pill + participant count + progress bar |
| `/music/routines` | Bedtime Routines | Build your path to peaceful sleep | HeadingDivider |

#### 2.5 Pages with Header-Style Heroes (Dashboard Sub-Pages)

These pages currently use a smaller `<header>` element with a gradient and left-aligned text including a back-arrow link. They should be updated to the new centered hero pattern:

| Route | Title | Subtitle | Special Elements |
|-------|-------|----------|-----------------|
| `/insights` | Mood Insights | Reflect on your journey | Back link to Dashboard |
| `/insights/monthly` | Monthly Report | _(month navigation below)_ | Month navigation arrows + back link |
| `/friends` | Friends | _(none)_ | Back link to Dashboard |
| `/settings` | Settings | _(none)_ | Back link to Dashboard |
| `/profile/:userId` | _(user's display name)_ | _(level badge)_ | Back link |

**Note on back links**: Pages that currently have a "Dashboard" back-arrow link should retain that link, repositioned above the centered title within the hero section.

### 3. Action Elements Within Heroes

For pages that have action elements in the hero (date navigation, progress bars, search inputs, CTA buttons):

- Action elements sit below the title/subtitle within the same hero section
- Use frosted glass or semi-transparent styling: `bg-white/[0.06] rounded-xl` for contained groups
- Individual interactive elements (buttons, pills) follow existing dark theme conventions (e.g., `bg-white/10`, `text-white/60`)
- These elements must blend with the radial gradient -- no additional background that creates a visible box

### 4. HeadingDivider Treatment

Pages that currently use HeadingDivider (Prayer Wall, Ask, Routines):
- The HeadingDivider can be retained or removed at implementation time -- the new hero pattern works with or without it
- If retained, it should be styled to blend with the atmospheric gradient (white divider at reduced opacity)

### 5. What Must NOT Change

- Page content below the heroes -- no layout, functionality, or styling changes to anything below the hero section
- Page functionality -- all interactive elements retain their behavior
- Navigation structure and routing
- Auth gating behavior
- Data persistence or localStorage usage

---

## Acceptance Criteria

### Global Hero Pattern
- [ ] Every inner page hero has full viewport width with no visible border, box-shadow, or border-radius on the hero container
- [ ] Every hero background uses `#0f0a1e` as its base with a `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` overlay
- [ ] No hero has a background that stops at a visible edge -- the gradient fades to full transparency
- [ ] Hero sections flow directly into the content below with no gap, spacer div, or margin-top on the first content section
- [ ] No hero has any margin creating a visual gap between the hero and the navbar above

### Typography
- [ ] All hero titles use Caveat script font (`font-script`) with `text-4xl` desktop / `text-3xl` mobile
- [ ] All hero titles have the gradient text effect (white to `primary-lt`) matching the landing page headline
- [ ] All hero subtitles use Lora italic (`font-serif italic`) with `text-lg` desktop / `text-base` mobile in `text-white/60`
- [ ] All hero text is centered on both mobile and desktop

### Spacing
- [ ] Hero vertical padding is `py-12` on desktop, `py-8` on mobile (plus navbar clearance padding at top)
- [ ] Content below the hero starts immediately after the hero padding ends

### Shared Component: PageHero
- [ ] `PageHero` component updated to use the new atmospheric gradient pattern
- [ ] All pages using `PageHero` (`/ask`, `/music`, `/my-prayers`, meditation sub-pages) inherit the new style
- [ ] `PageHero` children (e.g., search input on Ask page) render correctly within the new hero

### Shared Component: LocalSupportHero
- [ ] `LocalSupportHero` component updated to match the new hero pattern
- [ ] All three Local Support pages (`/local-support/churches`, `/counselors`, `/celebrate-recovery`) display the new hero
- [ ] Extra content and action buttons still render correctly within the hero

### Shared Component: PrayerWallHero
- [ ] `PrayerWallHero` updated to match the new hero pattern
- [ ] "Share a Prayer Request" CTA still visible and functional
- [ ] HeadingDivider blends with the atmospheric gradient (if retained)

### Daily Hub (`/daily`)
- [ ] Hero uses new atmospheric gradient instead of the current `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark`
- [ ] Time-aware greeting, subtitle, and quiz teaser link are all centered with correct typography
- [ ] No visual gap between hero and Verse of the Day banner below

### Bible (`/bible`)
- [ ] Hero uses new atmospheric gradient instead of the current `BIBLE_HERO_STYLE` gradient
- [ ] Title "Bible" + subtitle "The Word of God" centered with correct typography
- [ ] Content area (segmented control, books/search) starts immediately below hero

### Bible Reader (`/bible/:book/:chapter`)
- [ ] Hero uses new atmospheric gradient instead of `READER_BG_STYLE`
- [ ] "[Book] Chapter [X]" title centered with correct typography (book name as link preserved)
- [ ] Chapter selector follows immediately below

### Devotional (`/devotional`)
- [ ] Hero uses new atmospheric gradient instead of the current radial+linear gradient
- [ ] "Daily Devotional" title centered with correct typography
- [ ] Date navigation arrows + date display sit below the title within the hero
- [ ] Navigation arrows use existing styling (`text-white/40 hover:text-white/70`)

### Reading Plans (`/reading-plans`)
- [ ] `PageHero` renders with new atmospheric gradient
- [ ] Title and subtitle centered with correct typography

### Reading Plan Detail (`/reading-plans/:planId`)
- [ ] Hero uses new atmospheric gradient
- [ ] Plan title centered with correct typography
- [ ] Progress bar sits below the title within the hero

### Challenges (`/challenges`)
- [ ] `PageHero` renders with new atmospheric gradient
- [ ] Title and subtitle centered with correct typography

### Challenge Detail (`/challenges/:challengeId`)
- [ ] Hero uses new atmospheric gradient with optional season color accent (existing theme color radial overlay preserved as a subtle addition)
- [ ] Challenge icon, title, description, season pill, and participant count all render correctly
- [ ] Progress bar sits within the hero

### Music (`/music`)
- [ ] `PageHero` renders with new atmospheric gradient

### Routines (`/music/routines`)
- [ ] Hero uses new atmospheric gradient instead of the current radial+linear gradient
- [ ] Title and subtitle centered with correct typography

### Insights (`/insights`)
- [ ] Hero uses new atmospheric gradient instead of `bg-gradient-to-b from-dashboard-gradient to-[#0f0a1e]`
- [ ] "Mood Insights" title centered in Caveat script with gradient text effect
- [ ] "Reflect on your journey" subtitle in Lora italic `text-white/60`
- [ ] Back link to Dashboard repositioned within the hero (above or near the title)

### Monthly Report (`/insights/monthly`)
- [ ] Hero uses new atmospheric gradient
- [ ] "Monthly Report" title centered with correct typography
- [ ] Month navigation arrows sit below the title within the hero
- [ ] Back link repositioned within the hero

### Friends (`/friends`)
- [ ] Hero uses new atmospheric gradient instead of `bg-gradient-to-b from-dashboard-gradient to-[#0f0a1e]`
- [ ] "Friends" title centered in Caveat script with gradient text effect
- [ ] Back link repositioned within the hero

### Settings (`/settings`)
- [ ] Hero uses new atmospheric gradient instead of `bg-gradient-to-b from-dashboard-gradient to-[#0f0a1e]`
- [ ] "Settings" title centered in Caveat script with gradient text effect
- [ ] Back link repositioned within the hero

### Growth Profile (`/profile/:userId`)
- [ ] Hero uses new atmospheric gradient
- [ ] User's display name centered in Caveat script with gradient text effect
- [ ] Level badge displays below the name

### Responsive
- [ ] All heroes render correctly at 375px (mobile) -- tighter gradient, `py-8`, `text-3xl` title, `text-base` subtitle
- [ ] All heroes render correctly at 768px (tablet) -- intermediate sizing
- [ ] All heroes render correctly at 1440px (desktop) -- wider gradient spread, `py-12`, `text-4xl` title, `text-lg` subtitle
- [ ] The radial gradient never looks clipped or abruptly cut off at any viewport width
- [ ] Dark background extends full-width with no light edges or gaps at any breakpoint

### Accessibility
- [ ] All hero text meets WCAG AA contrast on the dark gradient background (white on `#0f0a1e` is approximately 17:1)
- [ ] Gradient text effect on titles maintains sufficient contrast (verify `primary-lt` (#8B5CF6) on `#0f0a1e` meets AA)
- [ ] The gradient is purely decorative -- no information conveyed through color alone
- [ ] Screen readers encounter heading text normally (no ARIA changes)
- [ ] All existing keyboard navigation still works
- [ ] Focus indicators remain visible on the dark background

### General
- [ ] No changes to page functionality, layout below the hero, or interactive behavior
- [ ] No changes to auth gating -- all existing auth gates remain
- [ ] SiteFooter has no visible seam on any page updated in this spec
- [ ] All existing tests pass (update test assertions for class name changes if needed)

---

## UX & Design Notes

- **Tone**: The atmospheric gradient creates a sense of infinite space and calm -- the purple glow feels like ambient light in a dark room rather than a colored box
- **Typography shift**: Reducing title size from `text-5xl/6xl/7xl` to `text-3xl/4xl` creates a more refined, understated look. The gradient text effect (white to purple) adds visual interest without needing the large size
- **Colors**: `#0f0a1e` page background, `rgba(109, 40, 217, 0.15)` radial gradient -- extremely subtle, just enough to create atmospheric depth
- **Design system recon reference**: The "Inner Page Hero" gradient pattern documented in `_plans/recon/design-system.md` is being completely replaced. The current pattern (`linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0f0a1e 100%)`) with a `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%)` overlay is replaced by the much more subtle single `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)`
- **New visual patterns**:
  1. Atmospheric radial glow hero (replaces floating gradient box) -- this is a **new pattern** not captured in the current design system recon
  2. Gradient text on hero titles (white to primary-lt) -- matches landing page but is new for inner pages
  3. Smaller hero title size (text-3xl/4xl vs text-5xl/6xl/7xl) -- new convention
- **Dashboard sub-page transformation**: Settings, Friends, Insights, and Growth Profile currently use a left-aligned header style without the script font. This spec changes them to centered Caveat heroes to match the rest of the app. The back link is preserved but repositioned.

### Responsive Behavior

- **Mobile (< 640px)**: `py-8` padding, `text-3xl` Caveat title, `text-base` Lora subtitle. Radial gradient is tighter. Action elements stack vertically if needed. Back links appear above the title.
- **Tablet (640px - 1024px)**: Intermediate sizing. Gradient spreads to match container width.
- **Desktop (> 1024px)**: `py-12` padding, `text-4xl` Caveat title, `text-lg` Lora subtitle. Radial gradient spreads wide. Action elements display inline where they currently do.

---

## AI Safety Considerations

- **Crisis detection needed?**: No -- this spec does not introduce or modify any user text input. Existing crisis detection on the Daily Hub textarea, Prayer Wall composer, and Ask page input is unchanged.
- **User input involved?**: No new input fields. Existing inputs within heroes (Ask page search, Prayer Wall composer) retain their current behavior.
- **AI-generated content?**: No -- all hero content is static titles and subtitles.

---

## Auth & Persistence

- **No changes to auth gating** -- all existing auth gates remain exactly as they are
- **No changes to persistence** -- no localStorage keys or data flows are affected
- **Route types remain unchanged**:
  - Public: `/daily`, `/bible`, `/bible/:book/:chapter`, `/ask`, `/devotional`, `/reading-plans`, `/reading-plans/:planId`, `/challenges`, `/challenges/:challengeId`, `/prayer-wall`, `/music`, `/music/routines`, `/local-support/*`, `/my-prayers`
  - Protected: `/insights`, `/insights/monthly`, `/friends`, `/settings`, `/profile/:userId`
  - Meditation sub-pages: route-level redirect when logged out
- This spec is purely visual -- it changes CSS classes and inline styles, not component structure or data flow

### Auth Behavior Summary (unchanged, for reference)

All auth behavior is identical to current state. No interactive elements change their auth gating. The only changes are visual: background gradients, font sizes, text colors, and spacing.

---

## Out of Scope

- **Landing page hero** -- handled separately in the Hero Cinematic Dark spec
- **Dashboard hero** -- the `DashboardHero` component (with greeting, streak, level) has its own distinct pattern and is not changed
- **Music page light-theme sections** -- Music may have its own visual treatment addressed in a future spec
- **New component creation** -- prefer updating existing shared components (`PageHero`, `LocalSupportHero`, `PrayerWallHero`) and individual page heroes
- **Backend changes** -- no API or backend changes
- **New animations or interactions** -- all existing animations remain; no new ones added
- **Navbar or footer changes** -- already dark; only verify no visual seams
- **Dark mode toggle** -- this is a permanent change, not a user-togglable setting
- **HeadingDivider removal** -- the divider may be kept or removed at implementation discretion; this spec does not mandate either
- **Content below heroes** -- no changes to any content, cards, forms, or interactive elements below the hero sections
- **Tailwind config additions** -- all values should be achievable with existing Tailwind classes and arbitrary values
