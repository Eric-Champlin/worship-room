# Implementation Plan: Inner Page Hero Redesign

**Spec:** `_specs/inner-page-hero-redesign.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/inner-page-hero-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable (new visual pattern replacing existing)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files

**Shared hero components:**
- `frontend/src/components/PageHero.tsx` — Reusable hero with `title`, `subtitle`, `showDivider`, `dark`, `children` props. Two gradient constants: `HERO_BG_STYLE` (light-end) and `HERO_BG_DARK_STYLE` (dark-end). Used by Ask, Music, My Prayers, Reading Plans, Challenges, and 6 meditation sub-pages.
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — Prayer Wall hero with `action` prop. Inline gradient style matching dark PageHero.
- `frontend/src/components/local-support/LocalSupportHero.tsx` — Local Support hero with `headingId`, `title`, `subtitle`, `extraContent`, `action` props. Inline gradient style matching dark PageHero.

**Custom hero pages:**
- `frontend/src/pages/DailyHub.tsx` (lines 165-193) — `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark`, greeting title, subtitle, quiz teaser link
- `frontend/src/pages/BibleBrowser.tsx` (lines 22-57) — `BIBLE_HERO_STYLE` radial+linear gradient const
- `frontend/src/pages/BibleReader.tsx` (lines 29-445) — `READER_BG_STYLE` identical to BibleBrowser, title as Link
- `frontend/src/pages/DevotionalPage.tsx` (lines 170-221) — Inline radial+linear gradient, date nav arrows, completion badge
- `frontend/src/pages/ReadingPlanDetail.tsx` (lines 21-200) — `DETAIL_HERO_STYLE`, emoji icon, badges, progress bar
- `frontend/src/pages/ChallengeDetail.tsx` (lines 196-250) — `heroStyle` with theme color radial overlay, icon, badges, progress bar
- `frontend/src/pages/RoutinesPage.tsx` (lines 112-131) — Inline radial+linear gradient (light-end!), HeadingDivider

**Dashboard sub-pages (header-style, not hero):**
- `frontend/src/pages/Insights.tsx` (lines 184-201) — `bg-gradient-to-b from-dashboard-gradient to-[#0f0a1e]`, left-aligned, `font-serif`, back link, time range pills below
- `frontend/src/pages/MonthlyReport.tsx` (lines 98-138) — Same gradient, left-aligned, month navigation arrows, back link
- `frontend/src/pages/Friends.tsx` (lines 78-90) — Same gradient, left-aligned, `font-serif`, back link, tab bar below
- `frontend/src/pages/Settings.tsx` (lines 45-57) — Same gradient, left-aligned, regular font bold, back link
- `frontend/src/pages/GrowthProfile.tsx` (lines 104-143) — NO hero section, goes straight to ProfileHeader

**Layout component:**
- `frontend/src/components/Layout.tsx` — `bg-neutral-bg` container. When `hero` prop is passed, renders `<Navbar transparent />` + hero before `<main>`. Used by meditation sub-pages via `<Layout hero={<PageHero>}>`.

**Navbar patterns:**
- `transparent` prop = absolute positioning (hero overlaps navbar area, `pt-32+` creates clearance)
- No `transparent` = relative positioning (hero starts below navbar)
- All hero pages need `<Navbar transparent />` for proper hero-navbar overlap

### Current Gradient Patterns Being Replaced

| Pattern | CSS | Pages |
|---------|-----|-------|
| PageHero light | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | Meditation sub-pages, Music, My Prayers |
| PageHero dark | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)` | Ask, Reading Plans, Challenges, PrayerWall, LocalSupport |
| Radial+linear | `radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0f0a1e 100%)` | Bible, Devotional, ReadingPlanDetail, ChallengeDetail, Routines |
| Dashboard gradient | `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` / `to-[#0f0a1e]` | DailyHub, Insights, MonthlyReport, Friends, Settings |

**All replaced by one pattern:**
```css
background-color: #0f0a1e;
background-image: radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%);
```

### Typography Changes (All Heroes)

| Element | Current | New |
|---------|---------|-----|
| Title font | `font-script text-5xl sm:text-6xl lg:text-7xl` | `font-script text-3xl sm:text-4xl` |
| Title color | `text-white` | `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` |
| Subtitle font | `font-sans` or no font class | `font-serif italic` |
| Subtitle color | `text-white/85` or `text-white/80` | `text-white/60` |
| Subtitle size | `text-base sm:text-lg lg:text-xl` | `text-base sm:text-lg` |

### Spacing Changes (All Heroes)

| Property | Current | New |
|----------|---------|-----|
| Top padding | `pt-32 sm:pt-36 lg:pt-40` (preserved) | `pt-32 sm:pt-36 lg:pt-40` (unchanged) |
| Bottom padding | varies (`pb-10` to `pb-24`) | `pb-8 sm:pb-12` |

### Test Patterns

Tests use Vitest + React Testing Library. Hero tests check heading text content via `getByRole('heading')` and `getByText()`. No tests assert CSS classes or inline gradient styles directly. Test updates will be minimal — mainly checking that headings still render with correct text.

---

## Auth Gating Checklist

**No auth gating changes in this spec.** All existing auth gates remain exactly as they are. This spec is purely visual — CSS classes and inline styles only.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No auth changes | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero section | background-color | `#0f0a1e` | spec section 1.1 |
| Hero section | background-image | `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` | spec section 1.1 |
| Hero section | border/shadow/radius | none | spec section 1.1 |
| Hero section | width | full viewport (`w-full`) | spec section 1.2 |
| Hero padding (mobile) | padding | `pt-32 pb-8` | spec section 1.3 |
| Hero padding (sm+) | padding | `sm:pt-36 sm:pb-12` | spec section 1.3 |
| Hero padding (lg+) | padding-top | `lg:pt-40` | spec section 1.3 |
| Title | font | `font-script text-3xl font-bold sm:text-4xl` | spec section 1.4 |
| Title | color/gradient | `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` | spec section 1.4 |
| Subtitle | font | `font-serif italic text-base sm:text-lg` | spec section 1.4 |
| Subtitle | color | `text-white/60` | spec section 1.4 |
| Back link | color | `text-white/50 hover:text-white/70` | codebase (existing pattern) |
| Action element bg | background | `bg-white/[0.06] rounded-xl` (for grouped elements) | spec section 3 |
| Primary-lt | hex | `#8B5CF6` | tailwind.config.js |
| Dashboard-dark | hex | `#0f0a1e` | tailwind.config.js |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses **Caveat** (`font-script`) for hero titles, not Lora
- Lora (`font-serif`) is used for subtitles and scripture, always with `italic`
- Hero gradient text uses Tailwind utilities: `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` (NOT inline styles like the landing page HeroSection.tsx)
- The atmospheric radial gradient uses **inline style** (not Tailwind) because radial-gradient with custom stops can't be expressed cleanly in Tailwind classes
- All heroes use the **same** background constant — `ATMOSPHERIC_HERO_BG` exported from PageHero.tsx
- ChallengeDetail is the **only** exception — it adds a theme color radial overlay on top of the shared background
- `pt-32 sm:pt-36 lg:pt-40` is navbar clearance padding — NEVER remove it
- Dashboard sub-pages (Insights, Friends, Settings, MonthlyReport) transform from `<header>` to `<section>` and from left-aligned to centered
- HeadingDivider is white SVG — works on dark background without changes

---

## Shared Data Models (from Master Plan)

Not applicable — this spec does not create or modify any data models, localStorage keys, or state.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `pb-8`, `text-3xl` title, `text-base` subtitle, tighter radial gradient (natural with `ellipse at top center`) |
| Tablet | 768px | `pb-12`, `text-4xl` title, `text-lg` subtitle (kicks in at `sm:` = 640px) |
| Desktop | 1440px | Same as tablet, wider gradient spread (natural), `lg:pt-40` top clearance |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → hero content | 128px mobile / 144px sm / 160px lg (navbar clearance) | spec section 1.3 (existing `pt-32 sm:pt-36 lg:pt-40`) |
| Hero content → hero bottom | 32px mobile / 48px sm+ | spec section 1.3 (`pb-8 sm:pb-12`) |
| Hero → first content section | 0px | spec section 1.2 ("no gap, spacer div, or margin-top") |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/inner-page-hero-redesign` is checked out and clean
- [ ] All dark theme conversion commits are merged (spec precondition: "all pages have been converted to dark backgrounds")
- [ ] **Pages with light backgrounds**: Music (`bg-neutral-bg`), My Prayers (`bg-neutral-bg`), meditation sub-pages (via Layout `bg-neutral-bg`) may still have light content areas below the hero. The spec acknowledges Music is out of scope for dark conversion. The hero will be dark (#0f0a1e) with content below potentially light — this creates a visible transition at the hero boundary, similar to the old gradient fade pattern.
- [ ] My Prayers page currently uses `<Navbar />` (not transparent). This will be changed to `<Navbar transparent />` as part of the hero update to ensure proper navbar-hero overlap.
- [ ] All auth-gated actions from the spec are accounted for (N/A — no auth changes)
- [ ] Design system values are verified from spec (authoritative) and codebase inspection
- [ ] No [UNVERIFIED] values — all values specified explicitly in the spec
- [ ] `primary-lt` (#8B5CF6) in Tailwind config supports `from-white to-primary-lt` gradient syntax

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `dark` prop on PageHero | Remove entirely | Single unified gradient replaces both variants; prop is now meaningless |
| Gradient implementation | Exported `ATMOSPHERIC_HERO_BG` const from PageHero | Consistent pattern, reusable by custom hero pages, matches existing codebase pattern (HERO_BG_STYLE etc.) |
| HeadingDivider | Keep where present | White SVG looks fine on dark bg; spec says "can be retained" |
| Back links on dashboard sub-pages | Place above centered title | Spec: "repositioned above the centered title within the hero section" |
| BibleReader title Link | Keep as Link with gradient text | The `bg-clip-text text-transparent` works on `<a>` elements; link styles (underline, hover) still apply |
| GrowthProfile hero content | Title = display name, subtitle = level badge | Spec: "User's display name centered in Caveat script with gradient text effect. Level badge displays below the name." |
| MonthlyReport title | Keep dynamic "Your {monthName} Faith Journey" | Spec says title is "Monthly Report" but current dynamic title is better UX; spec likely intended the page, not the exact string. Flag for user review. |
| My Prayers Navbar | Change `<Navbar />` to `<Navbar transparent />` | Required for hero-navbar overlap pattern; all other hero pages use transparent |
| Layout bg-neutral-bg | Do not change | Spec: "no layout changes below the hero"; meditation sub-pages will have dark hero → light content transition |

---

## Implementation Steps

### Step 1: Update PageHero Component

**Objective:** Replace the floating gradient box hero with the new atmospheric gradient pattern. This is the foundation — all PageHero consumers automatically inherit the new style.

**Files to create/modify:**
- `frontend/src/components/PageHero.tsx` — Replace gradient constants, update styles, remove `dark` prop, export shared constant

**Details:**

1. Replace both gradient constants with one shared constant:
```tsx
export const ATMOSPHERIC_HERO_BG = {
  backgroundColor: '#0f0a1e',
  backgroundImage:
    'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
} as const
```

2. Remove `dark` prop from `PageHeroProps` interface.

3. Update section element:
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`

4. Update title h1:
   - className (without showDivider): `"mb-3 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
   - className (with showDivider): `"inline-block font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
   - Use `cn()` to toggle `mb-3` vs `inline-block` as currently done

5. Update subtitle p:
   - className: `"mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg"`

**Responsive behavior:**
- Mobile (< 640px): `pb-8`, `text-3xl` title, `text-base` subtitle
- Tablet/Desktop (640px+): `pb-12`, `text-4xl` title, `text-lg` subtitle
- lg+: `pt-40` navbar clearance

**Guardrails (DO NOT):**
- Do NOT remove `showDivider` or `children` props — they are still used
- Do NOT change the `aria-labelledby` or `id` attributes
- Do NOT add border, box-shadow, or border-radius to the section
- Do NOT use `bg-gradient-to-b` Tailwind classes — the atmospheric radial gradient requires inline style

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PageHero renders title | unit | Verify `getByRole('heading')` contains provided title text |
| PageHero renders subtitle | unit | Verify subtitle text appears when provided |
| PageHero renders children | unit | Verify child content renders within hero |
| PageHero works without dark prop | unit | Verify no TypeScript errors when `dark` prop is removed from callers |

**Expected state after completion:**
- [ ] PageHero renders with atmospheric gradient background
- [ ] Title uses Caveat script with gradient text effect (white → primary-lt)
- [ ] Subtitle uses Lora italic at text-white/60
- [ ] All pages using PageHero (Ask, Music, My Prayers, Reading Plans, Challenges, meditation sub-pages) inherit the new style
- [ ] No TypeScript errors from removed `dark` prop

---

### Step 2: Update PrayerWallHero and LocalSupportHero

**Objective:** Apply the same atmospheric gradient pattern to the two remaining shared hero components.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — Update gradient, typography, spacing
- `frontend/src/components/local-support/LocalSupportHero.tsx` — Update gradient, typography, spacing

**Details:**

**PrayerWallHero.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update section:
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`
3. Update title h1:
   - className: `"mb-3 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
4. Update subtitle p:
   - className: `"mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg"`
5. Keep `action` slot unchanged

**LocalSupportHero.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update section:
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`
3. Update title h1:
   - className: `"mb-3 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
4. Update subtitle p:
   - className: `"mx-auto max-w-2xl font-serif italic text-base leading-relaxed text-white/60 sm:text-lg"`
5. Keep `extraContent` and `action` slots unchanged

**Responsive behavior:**
- Same as Step 1 — unified responsive pattern across all heroes

**Guardrails (DO NOT):**
- Do NOT change the `headingId` prop behavior on LocalSupportHero
- Do NOT remove the `action` or `extraContent` props
- Do NOT change the CTA button styling within the `action` slot

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWallHero renders heading and subtitle | unit | Verify "Prayer Wall" heading and "You're not alone." subtitle |
| PrayerWallHero renders action | unit | Verify action slot renders CTA |
| LocalSupportHero renders title/subtitle | unit | Verify passed title/subtitle appear |
| LocalSupportHero renders extra content | unit | Verify extraContent slot renders |

**Expected state after completion:**
- [ ] Prayer Wall page (`/prayer-wall`) shows atmospheric gradient hero
- [ ] All 3 Local Support pages (`/local-support/*`) show atmospheric gradient hero
- [ ] CTA buttons and extra content still render within updated heroes
- [ ] All existing tests pass

---

### Step 3: Update DailyHub Hero

**Objective:** Replace the DailyHub's `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` hero with the atmospheric gradient pattern.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — Update hero section (lines 165-193)

**Details:**

1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update section (line 165-167):
   - Remove `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark` from className
   - Add `style={ATMOSPHERIC_HERO_BG}` to section element
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
3. Update greeting h1 (line 169-173):
   - className: `"mb-1 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
4. Update subtitle p (line 175):
   - className: `"font-serif italic text-base text-white/60 sm:text-lg"`
5. Quiz teaser link (lines 178-192): Keep as-is — `text-white/90`, `text-white` for link styling still works on the atmospheric gradient

**Responsive behavior:**
- Mobile: `pb-8`, `text-3xl`, tighter gradient
- sm+: `pb-12`, `text-4xl`
- lg+: `pt-40`

**Guardrails (DO NOT):**
- Do NOT change the quiz teaser link behavior or scroll-to-quiz functionality
- Do NOT change the time-aware greeting logic
- Do NOT modify anything below the hero section (Verse of the Day banner, tabs, etc.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DailyHub renders greeting | integration | Verify time-aware greeting text appears |
| DailyHub renders quiz teaser | integration | Verify "Take a 30-second quiz" link exists |

**Expected state after completion:**
- [ ] Daily Hub hero uses atmospheric gradient instead of dashboard gradient
- [ ] Greeting, subtitle, and quiz teaser all render correctly
- [ ] No visual gap between hero and Verse of the Day banner

---

### Step 4: Update BibleBrowser and BibleReader Heroes

**Objective:** Replace the `BIBLE_HERO_STYLE` and `READER_BG_STYLE` radial+linear gradient constants with the atmospheric gradient.

**Files to create/modify:**
- `frontend/src/pages/BibleBrowser.tsx` — Remove `BIBLE_HERO_STYLE`, update hero section
- `frontend/src/pages/BibleReader.tsx` — Remove `READER_BG_STYLE`, update hero section

**Details:**

**BibleBrowser.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Remove `BIBLE_HERO_STYLE` constant (lines 22-26)
3. Update section (line 43-46):
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`
4. Update title h1 (line 48-52):
   - className: `"font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
5. Update subtitle p (line 54):
   - className: `"mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg"`

**BibleReader.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Remove `READER_BG_STYLE` constant (lines 29-33)
3. Update section (line 432-434):
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`
4. Update title h1 (line 436):
   - className: `"font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
   - The inner `<Link>` element: keep `underline transition-colors hover:text-white` but change `text-white/70` to `text-white/60` (subtle on gradient text, link indication via underline)

**Note on BibleReader gradient text + Link:** The title contains a `<Link>` element. Gradient text (`bg-clip-text text-transparent`) on the outer `h1` won't affect the inner `<Link>` if the Link has its own color. The Link should inherit the gradient OR have its own styling. Since the book name is a link and the chapter text is not, consider applying gradient text to the h1 and letting the Link inherit. Test visually.

**Responsive behavior:**
- Same unified pattern as other heroes

**Guardrails (DO NOT):**
- Do NOT remove the Link element from BibleReader title
- Do NOT change the content area below the hero (SegmentedControl, book browser, chapter selector)
- Do NOT change `backgroundSize` — the new gradient doesn't need it

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleBrowser renders heading | unit | Verify "Bible" heading text |
| BibleBrowser renders subtitle | unit | Verify "The Word of God" subtitle |
| BibleReader renders chapter title | integration | Verify "{Book} Chapter {N}" heading |
| BibleReader title link navigates | integration | Verify book name links to `/bible?book={slug}` |

**Expected state after completion:**
- [ ] `/bible` shows atmospheric gradient hero with "Bible" title
- [ ] `/bible/:book/:chapter` shows atmospheric gradient hero with chapter title
- [ ] Book name link in BibleReader still works
- [ ] Content areas below both heroes unchanged

---

### Step 5: Update DevotionalPage and RoutinesPage Heroes

**Objective:** Replace custom gradient heroes on DevotionalPage and RoutinesPage with the atmospheric gradient.

**Files to create/modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Update hero section (lines 170-221)
- `frontend/src/pages/RoutinesPage.tsx` — Update hero section (lines 112-131)

**Details:**

**DevotionalPage.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update section (lines 171-177):
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}` (replaces inline gradient object)
3. Update title h1 (line 179):
   - className: `"font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
4. Date navigation (lines 182-220): Keep all date nav logic. Update date display:
   - Date text span (line 198): keep `text-lg text-white/85 sm:text-xl` — this is a functional element, not a subtitle
   - Navigation buttons: keep existing `text-white/40 hover:text-white/70` styling (spec: "Navigation arrows use existing styling")
   - Completion badge: keep existing styling

**RoutinesPage.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update section (lines 112-117):
   - className: `"px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}` (replaces inline `background` property)
3. Update title h1 (line 119-123):
   - className: `"font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
4. Update subtitle p (line 125):
   - className: `"mx-auto mt-4 max-w-lg font-serif italic text-base text-white/60 sm:text-lg"`
5. HeadingDivider (lines 128-130): Keep as-is — white SVG on dark background works fine

**Responsive behavior:**
- Same unified pattern

**Guardrails (DO NOT):**
- Do NOT change Devotional date navigation logic or button behavior
- Do NOT change completion badge display logic
- Do NOT remove HeadingDivider from RoutinesPage
- Do NOT change content below either hero

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DevotionalPage renders title | unit | Verify "Daily Devotional" heading |
| DevotionalPage date nav works | integration | Verify date navigation arrows change day |
| RoutinesPage renders title | unit | Verify "Bedtime Routines" heading |
| RoutinesPage renders subtitle | unit | Verify subtitle text |

**Expected state after completion:**
- [ ] `/devotional` shows atmospheric gradient hero with date navigation
- [ ] `/music/routines` shows atmospheric gradient hero with HeadingDivider
- [ ] Date navigation and completion badge function correctly on Devotional
- [ ] All content below both heroes unchanged

---

### Step 6: Update ReadingPlanDetail Hero

**Objective:** Replace the `DETAIL_HERO_STYLE` gradient with the atmospheric gradient. Preserve emoji icon, description, badges, and progress bar within the hero.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Remove `DETAIL_HERO_STYLE`, update hero section

**Details:**

1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Remove `DETAIL_HERO_STYLE` constant (lines 21-25)
3. Update section (line 155-156):
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{ATMOSPHERIC_HERO_BG}`
4. Emoji icon (line 159): Keep as-is
5. Update title h1 (line 163):
   - className: `"mt-4 font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
6. Update description p (line 167):
   - className: `"mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg"`
7. Difficulty/duration badges (lines 171-178): Keep existing `bg-white/10 px-4 py-1 text-sm text-white` styling
8. Progress bar (lines 180-198): Keep existing `h-2 rounded-full bg-white/10` with primary fill

**Responsive behavior:**
- Same unified pattern
- Badges wrap naturally on mobile (already `inline-flex gap-2`)
- Progress bar constrained to `max-w-xs` (already)

**Guardrails (DO NOT):**
- Do NOT change progress bar logic or completion calculations
- Do NOT change badge display or join/complete buttons
- Do NOT change any content below the hero

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ReadingPlanDetail renders plan title | integration | Verify plan title appears in heading |
| ReadingPlanDetail shows progress bar | integration | Verify progress bar renders when joined |
| ReadingPlanDetail shows badges | integration | Verify difficulty and duration badges |

**Expected state after completion:**
- [ ] `/reading-plans/:planId` shows atmospheric gradient hero
- [ ] Plan title, emoji, description, badges, and progress bar all render correctly
- [ ] Content below hero unchanged

---

### Step 7: Update ChallengeDetail Hero

**Objective:** Replace the ChallengeDetail gradient with the atmospheric gradient, preserving the optional theme color accent overlay. This is the only hero that adds a color accent.

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Update `heroStyle` computation and hero section

**Details:**

1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Update `heroStyle` computation (lines 196-199):
```tsx
const heroStyle = {
  ...ATMOSPHERIC_HERO_BG,
  backgroundImage: `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), ${ATMOSPHERIC_HERO_BG.backgroundImage}`,
}
```
This layers the theme color radial overlay on top of the atmospheric gradient, as spec requires: "optional season color accent (existing theme color radial overlay preserved as a subtle addition)."

3. Update section (line 218-219):
   - className: `"relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"`
   - style: `{heroStyle}`
4. ChallengeIcon (line 222-226): Keep as-is
5. Update title h1 (line 229):
   - className: `"mt-4 font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"`
6. Update description p (line 233):
   - className: `"mx-auto mt-3 max-w-xl font-serif italic text-base text-white/60 sm:text-lg"`
7. Season/duration pills (lines 237-244): Keep existing `bg-white/10` styling
8. Progress bar: Keep existing styling

**Responsive behavior:**
- Same unified pattern
- Theme color radial overlay scales naturally with `circle at 50% 30%`

**Guardrails (DO NOT):**
- Do NOT remove the theme color overlay — it's the challenge's visual identity
- Do NOT change participant count display, join/complete logic
- Do NOT change any content below the hero (day selector, day content, etc.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ChallengeDetail renders challenge title | integration | Verify challenge title in heading |
| ChallengeDetail renders challenge icon | integration | Verify ChallengeIcon renders |
| ChallengeDetail shows progress when joined | integration | Verify progress bar appears |

**Expected state after completion:**
- [ ] `/challenges/:challengeId` shows atmospheric gradient with theme color accent
- [ ] Challenge icon, title, description, pills, and progress bar all render correctly
- [ ] Theme color accent visible as subtle radial overlay

---

### Step 8: Update Insights and MonthlyReport

**Objective:** Transform the left-aligned `<header>` elements on Insights and MonthlyReport into centered atmospheric hero `<section>` elements with Caveat script titles. Preserve back links and navigation elements.

**Files to create/modify:**
- `frontend/src/pages/Insights.tsx` — Replace header (lines 184-201) with centered hero section
- `frontend/src/pages/MonthlyReport.tsx` — Replace header (lines 98-138) with centered hero section

**Details:**

**Insights.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Replace `<header>` (lines 184-201) with:
```tsx
<section
  aria-labelledby="insights-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  {/* Back link — above the centered title */}
  <Link
    to="/"
    className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Dashboard
  </Link>
  <h1
    id="insights-heading"
    className="mb-3 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
  >
    Mood Insights
  </h1>
  <p className="font-serif italic text-base text-white/60 sm:text-lg">
    Reflect on your journey
  </p>
</section>
```
3. Time range pills section below hero: keep as-is (it's content below the hero)

**MonthlyReport.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Replace `<header>` (lines 98-138) with:
```tsx
<section
  aria-labelledby="monthly-report-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  {/* Back link */}
  <Link
    to="/insights"
    className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Mood Insights
  </Link>
  <h1
    id="monthly-report-heading"
    className="mb-3 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
  >
    Monthly Report
  </h1>
  {/* Month navigation below title */}
  <div className="mt-2 flex items-center gap-3">
    <button
      onClick={goToPreviousMonth}
      disabled={isAtEarliest}
      aria-label="Previous month"
      className="min-h-[44px] min-w-[44px] rounded-full p-2 text-white/40 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
    <span className="text-lg text-white/85 sm:text-xl">{data.monthName} {data.year ?? selectedYear}</span>
    <button
      onClick={goToNextMonth}
      disabled={isAtLatest}
      aria-label="Next month"
      className="min-h-[44px] min-w-[44px] rounded-full p-2 text-white/40 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <ChevronRight className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
</section>
```
Note: Removed `bg-white/10` from navigation buttons (spec: action elements should blend with the gradient). Kept `text-white/40 hover:text-white/70` for arrows. The date range text from the current implementation can be replaced by month name + year since the title is now "Monthly Report" (static).

**Responsive behavior:**
- Same unified hero pattern
- Back link remains above title on all breakpoints
- MonthlyReport month nav: arrows + text inline, same as Devotional date nav

**Guardrails (DO NOT):**
- Do NOT change time range pills on Insights (they are below the hero, not inside it)
- Do NOT change the sticky time range pills behavior on Insights
- Do NOT change month navigation logic on MonthlyReport
- Do NOT remove back links — they are explicitly required by the spec

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Insights renders heading | unit | Verify "Mood Insights" heading text |
| Insights renders back link | unit | Verify Dashboard back link exists |
| MonthlyReport renders heading | unit | Verify "Monthly Report" heading text |
| MonthlyReport month nav works | integration | Verify month navigation arrows function |

**Expected state after completion:**
- [ ] `/insights` shows centered atmospheric hero with "Mood Insights" in Caveat script
- [ ] `/insights/monthly` shows centered atmospheric hero with "Monthly Report" and month navigation
- [ ] Both pages have back links above their titles
- [ ] Time range pills and content below heroes unchanged

---

### Step 9: Update Friends and Settings

**Objective:** Transform the left-aligned `<header>` elements on Friends and Settings into centered atmospheric hero `<section>` elements with Caveat script titles.

**Files to create/modify:**
- `frontend/src/pages/Friends.tsx` — Replace header (lines 78-90) with centered hero section
- `frontend/src/pages/Settings.tsx` — Replace header (lines 45-57) with centered hero section

**Details:**

**Friends.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Replace `<header>` (lines 78-90) with:
```tsx
<section
  aria-labelledby="friends-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  <Link
    to="/"
    className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Dashboard
  </Link>
  <h1
    id="friends-heading"
    className="font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
  >
    Friends
  </h1>
</section>
```
3. Tab bar below hero: keep in its current location and styling (it's content below the hero)

**Settings.tsx:**
1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. Replace `<header>` (lines 45-57) with:
```tsx
<section
  aria-labelledby="settings-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  <Link
    to="/"
    className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Dashboard
  </Link>
  <h1
    id="settings-heading"
    className="font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
  >
    Settings
  </h1>
</section>
```
3. Mobile tabs and desktop sidebar below hero: keep as-is

**Responsive behavior:**
- Same unified hero pattern
- Back links above centered titles on all breakpoints
- Tab bar (Friends) and mobile tabs (Settings) start immediately below hero

**Guardrails (DO NOT):**
- Do NOT change tab bar behavior on Friends page
- Do NOT change mobile/desktop section navigation on Settings
- Do NOT change any content or functionality below the hero sections

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Friends renders heading | unit | Verify "Friends" heading text |
| Friends renders back link | unit | Verify Dashboard back link |
| Settings renders heading | unit | Verify "Settings" heading text |
| Settings renders back link | unit | Verify Dashboard back link |

**Expected state after completion:**
- [ ] `/friends` shows centered atmospheric hero with "Friends" in Caveat script
- [ ] `/settings` shows centered atmospheric hero with "Settings" in Caveat script
- [ ] Both pages have back links to Dashboard
- [ ] Tab bars and settings navigation below heroes unchanged

---

### Step 10: Update GrowthProfile

**Objective:** Add a new atmospheric hero section to GrowthProfile, which currently has no hero. Display user's name with gradient text and level badge.

**Files to create/modify:**
- `frontend/src/pages/GrowthProfile.tsx` — Add hero section between Navbar and content

**Details:**

1. Import `ATMOSPHERIC_HERO_BG` from `@/components/PageHero`
2. After `<Navbar transparent />` and `<SEO>` (line 111), before the content div (line 112), insert:
```tsx
<section
  aria-labelledby="profile-heading"
  className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
  style={ATMOSPHERIC_HERO_BG}
>
  <Link
    to="/friends"
    className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Back
  </Link>
  <h1
    id="profile-heading"
    className="mb-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
  >
    {profileData.displayName}
  </h1>
  {profileData.currentLevel !== null && (
    <p className="font-serif italic text-base text-white/60 sm:text-lg">
      {/* Level name from the level badge */}
      Level {profileData.currentLevel}
    </p>
  )}
</section>
```
3. Adjust the content div (line 112) padding: the current `pt-8 md:pt-12` may need reduction since the hero now provides spacing. Consider removing `pt-8` or reducing to `pt-4`.
4. Add `ArrowLeft` to imports from `lucide-react` and `Link` from `react-router-dom` (if not already imported — `Link` is already imported)

**Note:** The ProfileHeader component currently renders the user's name and avatar. With the new hero showing the name, ensure there's no visual duplication. The ProfileHeader may need its name display adjusted — but the spec says "no changes to page content below the heroes." Flag this for visual verification. The ProfileHeader already renders below where the hero will be, so having the name in both places may look redundant. The implementer should check if ProfileHeader renders the display name prominently and consider whether it should be hidden in favor of the hero title. If so, that's a content-below-hero change and should be flagged for the user's decision.

**Responsive behavior:**
- Same unified hero pattern
- Back link text is "Back" (contextual — could be Friends, could be elsewhere)

**Guardrails (DO NOT):**
- Do NOT change ProfileHeader component — it's shared and may be used elsewhere
- Do NOT change the GrowthGarden, ProfileBadgeShowcase, or ProfileStats components
- Do NOT change auth gating behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowthProfile renders hero with display name | unit | Verify display name appears in heading |
| GrowthProfile shows back link | unit | Verify back link exists |
| GrowthProfile shows level in hero | unit | Verify level text appears when level data exists |

**Expected state after completion:**
- [ ] `/profile/:userId` shows atmospheric gradient hero with user's display name
- [ ] Level badge/text appears below the name
- [ ] Back link positioned above the title
- [ ] Content below hero (ProfileHeader, GrowthGarden, badges, stats) unchanged

---

### Step 11: Remove `dark` Prop from PageHero Callers

**Objective:** Clean up the removed `dark` prop from all pages that previously passed it to PageHero.

**Files to create/modify:**
- `frontend/src/pages/AskPage.tsx` — Remove `dark` prop from PageHero usage
- `frontend/src/pages/ReadingPlans.tsx` — Remove `dark` prop from PageHero usage
- `frontend/src/pages/Challenges.tsx` — Remove `dark` prop from PageHero usage
- `frontend/src/pages/MyPrayers.tsx` — Change `<Navbar />` to `<Navbar transparent />`

**Details:**

1. **AskPage.tsx** (line 202): Change `<PageHero title="Ask God's Word" showDivider dark>` to `<PageHero title="Ask God's Word" showDivider>`
2. **ReadingPlans.tsx** (line 181): Change `<PageHero title="Reading Plans" subtitle="..." dark />` to `<PageHero title="Reading Plans" subtitle="..." />`
3. **Challenges.tsx** (line 159): Change `<PageHero title="Community Challenges" subtitle="..." dark />` to `<PageHero title="Community Challenges" subtitle="..." />`
4. **MyPrayers.tsx** (line 163): Change `<Navbar />` to `<Navbar transparent />` so the hero overlaps properly with the navbar

**Responsive behavior:**
- No responsive changes — prop removal only

**Guardrails (DO NOT):**
- Do NOT change any other props or behavior on these pages
- Do NOT change any content or layout

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AskPage renders without dark prop | unit | Verify no TypeScript errors, heading renders |
| ReadingPlans renders without dark prop | unit | Verify heading and subtitle render |
| Challenges renders without dark prop | unit | Verify heading and subtitle render |
| MyPrayers renders with transparent Navbar | unit | Verify page renders correctly |

**Expected state after completion:**
- [ ] No TypeScript errors from `dark` prop removal
- [ ] All four pages render correctly with the new PageHero
- [ ] My Prayers page has transparent Navbar for proper hero overlap

---

### Step 12: Update Tests

**Objective:** Ensure all existing tests pass. Update any test assertions that fail due to class name or element changes (e.g., `<header>` → `<section>`, font class changes).

**Files to create/modify:**
- Any test files that fail after Steps 1-11 — fix assertions to match new markup

**Details:**

1. Run `pnpm test` from `frontend/` directory
2. For each failing test:
   - If it asserts on CSS classes: update to match new classes
   - If it asserts on heading text: should pass unchanged (text content not changing)
   - If it asserts on element type (`<header>` queries): update selectors
   - If it asserts on `dark` prop: remove those assertions
3. Common expected test changes:
   - Tests that query `role="banner"` for `<header>` elements — the dashboard sub-pages now use `<section>` instead
   - Tests that assert PageHero receives `dark` prop
   - Tests that use `aria-labelledby` IDs added in Steps 8-10

**Responsive behavior:**
- Not applicable

**Guardrails (DO NOT):**
- Do NOT delete tests — only update assertions
- Do NOT reduce test coverage
- Do NOT skip or `.skip()` tests as a fix

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests | all | `pnpm test` passes with 0 failures |

**Expected state after completion:**
- [ ] `pnpm test` passes with 0 failures
- [ ] No test coverage regression
- [ ] All hero-related assertions updated to match new markup

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update PageHero component (foundation) |
| 2 | 1 | Update PrayerWallHero and LocalSupportHero (import from PageHero) |
| 3 | 1 | Update DailyHub hero (import from PageHero) |
| 4 | 1 | Update BibleBrowser and BibleReader heroes (import from PageHero) |
| 5 | 1 | Update DevotionalPage and RoutinesPage heroes (import from PageHero) |
| 6 | 1 | Update ReadingPlanDetail hero (import from PageHero) |
| 7 | 1 | Update ChallengeDetail hero (import from PageHero) |
| 8 | 1 | Update Insights and MonthlyReport (import from PageHero) |
| 9 | 1 | Update Friends and Settings (import from PageHero) |
| 10 | 1 | Update GrowthProfile (import from PageHero) |
| 11 | 1 | Remove `dark` prop from callers (depends on PageHero change) |
| 12 | 1-11 | Update tests (depends on all implementation steps) |

Steps 2-11 are independent of each other (all only depend on Step 1). They can be executed in any order after Step 1. Step 12 must come last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update PageHero Component | [COMPLETE] | 2026-03-25 | Replaced HERO_BG_STYLE/HERO_BG_DARK_STYLE with ATMOSPHERIC_HERO_BG, removed dark prop, updated title to gradient text (text-3xl/4xl), subtitle to font-serif italic text-white/60, bottom padding to pb-8/pb-12. Also updated AskPage child subtitle color to text-white/60. |
| 2 | Update PrayerWallHero and LocalSupportHero | [COMPLETE] | 2026-03-25 | Imported ATMOSPHERIC_HERO_BG, updated gradient/typography/spacing on both components |
| 3 | Update DailyHub Hero | [COMPLETE] | 2026-03-25 | Imported ATMOSPHERIC_HERO_BG, replaced dashboard gradient, updated title/subtitle typography |
| 4 | Update BibleBrowser and BibleReader Heroes | [COMPLETE] | 2026-03-25 | Removed BIBLE_HERO_STYLE/READER_BG_STYLE, imported ATMOSPHERIC_HERO_BG, updated typography. BibleReader Link color changed to text-white/60. |
| 5 | Update DevotionalPage and RoutinesPage Heroes | [COMPLETE] | 2026-03-25 | Imported ATMOSPHERIC_HERO_BG, replaced inline gradients, updated typography. Date nav and HeadingDivider preserved. |
| 6 | Update ReadingPlanDetail Hero | [COMPLETE] | 2026-03-25 | Removed DETAIL_HERO_STYLE, imported ATMOSPHERIC_HERO_BG, updated typography. Emoji/badges/progress bar preserved. |
| 7 | Update ChallengeDetail Hero | [COMPLETE] | 2026-03-25 | Used spread + theme color radial overlay on ATMOSPHERIC_HERO_BG. Updated typography. Icon/badges/progress bar preserved. |
| 8 | Update Insights and MonthlyReport | [COMPLETE] | 2026-03-25 | Replaced <header> with centered <section>, atmospheric gradient, Caveat titles, back links above centered titles. MonthlyReport: title changed to static "Monthly Report" with month nav below. |
| 9 | Update Friends and Settings | [COMPLETE] | 2026-03-25 | Replaced <header> with centered <section>, atmospheric gradient, Caveat titles, back links above centered titles. |
| 10 | Update GrowthProfile | [COMPLETE] | 2026-03-25 | Added atmospheric hero section with display name and levelName. Back link to /friends. Reduced content div top padding from pt-8 to pt-4. |
| 11 | Remove `dark` Prop from PageHero Callers | [COMPLETE] | 2026-03-25 | Removed dark prop from AskPage, ReadingPlans, Challenges. Changed MyPrayers Navbar to transparent. Done alongside Step 1 to keep build clean. |
| 12 | Update Tests | [COMPLETE] | 2026-03-25 | Fixed GrowthProfile tests (duplicate name text — used getAllByText), MonthlyReport test (updated "faith journey" → "monthly report" heading assertion). All 4254 tests pass. |
