# Implementation Plan: Site Footer

**Spec:** `_specs/site-footer.md`
**Date:** 2026-02-24
**Branch:** `claude/feature/site-footer`

---

## Architecture Context

### Project Structure
- Components live in `frontend/src/components/` with a barrel export in `index.ts`
- Tests live in `frontend/src/components/__tests/` following `<ComponentName>.test.tsx` naming
- Pages live in `frontend/src/pages/` — `Home.tsx` assembles landing page sections
- Shared utilities in `frontend/src/lib/utils.ts` — `cn()` for conditional classNames
- Custom hooks in `frontend/src/hooks/` — `useInView` for scroll-triggered animations

### Existing Patterns
- **Section components**: Each landing page section (HeroSection, JourneySection, GrowthTeasersSection, StartingPointQuiz) is a standalone component exported from `components/`
- **Gradient transitions**: Sections use div elements with `linear-gradient` styles for smooth background transitions between sections (e.g., GrowthTeasersSection uses `linear-gradient(to bottom, #F5F5F5 0%, #251248 100%)`, StartingPointQuiz uses `linear-gradient(to bottom, #251248 0%, #FFFFFF 100%)`)
- **Colors**: GrowthTeasersSection uses `#251248` as its solid background (not `#0D0620`). The footer should match the hero's `#0D0620` per spec
- **Navigation links**: Navbar defines link arrays as `const` objects with `{ label, to }` shape — `DAILY_LINKS`, `MUSIC_LINKS`, `LOCAL_SUPPORT_LINKS`, plus `NAV_LINKS` for Prayer Wall
- **React Router**: Uses `Link` from `react-router-dom` for client-side navigation
- **Styling**: TailwindCSS classes via `cn()`, inline styles only for non-Tailwind values (fontFamily, specific colors not in config). Design system colors registered in `tailwind.config.js` include `primary`, `primary-lt`, `neutral-bg`, `text-dark`, `text-light`, `hero-dark`, `glow-cyan`
- **Fonts**: Caveat loaded globally, applied via `style={{ fontFamily: "'Caveat', cursive" }}`. Inter is the default sans font. Logo pattern: `<span className="text-4xl font-bold text-white" style={{ fontFamily: "'Caveat', cursive" }}>Worship Room</span>` (see Navbar `NavbarLogo`)
- **Accessibility**: Components use `aria-labelledby`, `aria-label`, visible focus rings via `focus-visible:ring-2`, `role="region"` via named sections

### Test Patterns
- Wrap components in `<MemoryRouter>` for router context
- Use `screen.getByRole()`, `screen.getByText()`, `screen.getAllByRole()` for queries
- Helper `render` function at top of describe block
- `describe` block per component, `it` blocks per assertion
- Import from `@testing-library/react` + `vitest`

### Home.tsx Assembly
Currently renders in order: `Navbar` → `HeroSection` → `JourneySection` → `GrowthTeasersSection` → `StartingPointQuiz`. Footer will be appended as the final child inside `<main>`.

### StartingPointQuiz Bottom
The quiz section has a white background (`bg-white`) with padding `pb-20 sm:pb-24`. The footer needs a transition from this white into `#0D0620`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] `react-router-dom` is installed and `Link` is available
- [x] `cn()` utility exists at `@/lib/utils`
- [x] Tailwind config has `hero-dark: '#0D0620'` registered as a color
- [x] The barrel export at `components/index.ts` is the convention for all section components
- [x] No `constants/crisis-resources.ts` file exists yet (will not be created — crisis data hardcoded in component per existing patterns)
- [x] App Store badges will be inline SVGs (no external images, no npm packages)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Background transition from quiz (white) to footer (#0D0620) | Gradient div at top of footer component, matching the pattern used by GrowthTeasersSection and StartingPointQuiz | Consistent with existing section transition patterns |
| App Store badge implementation | Inline SVG placeholder badges styled as black rounded rectangles with text | Spec says "inline SVGs or styled placeholder buttons — do NOT use external image URLs" |
| 988 tel: link format | `<a href="tel:988">` | Standard tel: URI for immediate phone access |
| Crisis Text Line | Plain text "Text HOME to 741741" (not a link) | Text messaging doesn't have a universal URI scheme; display as instructional text |
| Heading hierarchy | `h3` for nav column headings inside the footer | Footer is not a primary content section; h3 avoids conflating with page h2 sections. Spec explicitly requests h3 |
| Footer HTML element | `<footer>` wrapping everything, with `<nav aria-label="Footer navigation">` for the link columns | Semantic HTML; spec requests `aria-label="Footer navigation"` |
| "Coming Soon" placement | Text below the badges, centered | Cleaner than beside each badge |

---

## Implementation Steps

### Step 1: Create Footer Component

**Objective:** Build the `SiteFooter` component with all 6 sections (logo + nav, divider, app download, divider, crisis resources, copyright).

**Files to create:**
- `frontend/src/components/SiteFooter.tsx` — The footer component

**Details:**

The component structure:

```
<footer> (bg hero-dark #0D0620)
  <div> gradient transition (white → #0D0620)
  <div> content wrapper (max-w-6xl mx-auto, px-4 sm:px-6, py-16)
    Section 1: Logo + Nav Columns
      <div> flex row (lg:flex-row, flex-col on mobile)
        Left: "Worship Room" in Caveat, white, text-3xl
        Right: <nav aria-label="Footer navigation">
          3 columns in a grid (grid-cols-3 on sm+, grid-cols-1 on mobile)
          Each column:
            <h3> heading (white, font-semibold, text-sm uppercase tracking-wider)
            <ul> links (Link from react-router-dom)
              <li><Link> text-[#9CA3AF] hover:text-white transition-colors

    <hr> divider (border-[#2a2040], my-8)

    Section 2: App Download
      <div> flex row (lg:flex-row, flex-col on mobile)
        Left: "Take Worship Room With You" (white, font-medium, text-lg)
        Right: two badge links side-by-side
          Apple App Store badge (inline SVG, black bg, rounded-lg, h-10)
          Google Play badge (inline SVG, black bg, rounded-lg, h-10)
          Both href="#"
          "Coming Soon" text below (text-[#9CA3AF], text-xs)

    <hr> divider

    Section 3: Crisis Resources
      <div> flex-wrap, items-center, gap-x-4, justify-center
        "If you're in crisis:" (text-[#9CA3AF], text-xs)
        "988 Suicide & Crisis Lifeline: " <a href="tel:988">988</a> (text-[#9CA3AF])
        "Crisis Text Line: Text HOME to 741741" (text-[#9CA3AF])

    Section 4: Copyright
      <p> centered, text-[#6B7280], text-xs, mt-6
        "© 2026 Worship Room. All rights reserved."
```

**Navigation link data** — define as constants at top of file (same `{ label, to }` pattern as Navbar):

```typescript
const FOOTER_DAILY_LINKS = [
  { label: 'Pray', to: '/scripture' },
  { label: 'Journal', to: '/journal' },
  { label: 'Meditate', to: '/meditate' },
  { label: 'Verse & Song', to: '/daily' },
]

const FOOTER_MUSIC_LINKS = [
  { label: 'Worship Playlists', to: '/music/playlists' },
  { label: 'Ambient Sounds', to: '/music/ambient' },
  { label: 'Sleep & Rest', to: '/music/sleep' },
]

const FOOTER_SUPPORT_LINKS = [
  { label: 'Prayer Wall', to: '/prayer-wall' },
  { label: 'Churches', to: '/churches' },
  { label: 'Counselors', to: '/counselors' },
]

const FOOTER_COLUMNS = [
  { heading: 'Daily', links: FOOTER_DAILY_LINKS },
  { heading: 'Music', links: FOOTER_MUSIC_LINKS },
  { heading: 'Support', links: FOOTER_SUPPORT_LINKS },
]
```

**App Store badge SVGs**: Create simplified inline SVG badges. Each badge is an `<a>` element wrapping a styled div with text — black background, rounded corners, white text. Apple badge shows Apple logo (unicode or simple path) + "Download on the" + "App Store". Google Play badge shows play triangle + "GET IT ON" + "Google Play". Both have `href="#"`, `rel="noopener noreferrer"`, `aria-label` for accessibility.

**Gradient transition div**: At the very top of the `<footer>`, before the content wrapper:
```
<div className="h-32 sm:h-40" style={{ background: 'linear-gradient(to bottom, #FFFFFF 0%, #0D0620 100%)' }} />
```
This matches the exact pattern from GrowthTeasersSection (line 146-151) and StartingPointQuiz (line 76-81).

**Focus styles on all links**: Use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0620]` — the `ring-offset` color must match the dark background so the focus ring is visible.

**Guardrails (DO NOT):**
- DO NOT use `NavLink` — footer links don't need active state styling, use `Link`
- DO NOT use external image URLs for badges
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT add social media, newsletter, or mission statement content
- DO NOT import or reuse Navbar link constants (footer is independent; duplicating the data is fine for separation of concerns)
- DO NOT use `text-text-light` for the muted gray — spec says `#9CA3AF`, which is different from `text-light: #7F8C8D`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| renders footer landmark | unit | `screen.getByRole('contentinfo')` exists (semantic `<footer>`) |
| renders footer navigation | unit | `screen.getByRole('navigation', { name: /footer navigation/i })` exists |
| renders Worship Room logo text | unit | `screen.getByText('Worship Room')` exists within footer |
| renders 3 column headings | unit | `screen.getByRole('heading', { name: 'Daily' })`, `'Music'`, `'Support'` all exist at level 3 |
| renders all 10 nav links with correct hrefs | unit | Check each of the 10 links by name and verify `href` attribute: Pray→/scripture, Journal→/journal, Meditate→/meditate, Verse & Song→/daily, Worship Playlists→/music/playlists, Ambient Sounds→/music/ambient, Sleep & Rest→/music/sleep, Prayer Wall→/prayer-wall, Churches→/churches, Counselors→/counselors |
| renders App Store badge | unit | `screen.getByLabelText(/download on the app store/i)` exists with `href="#"` |
| renders Google Play badge | unit | `screen.getByLabelText(/get it on google play/i)` exists with `href="#"` |
| renders Coming Soon text | unit | `screen.getByText(/coming soon/i)` exists |
| renders crisis resources | unit | `screen.getByText(/if you're in crisis/i)` exists |
| renders 988 tel link | unit | `screen.getByRole('link', { name: /988/i })` has `href="tel:988"` |
| renders Crisis Text Line info | unit | `screen.getByText(/text home to 741741/i)` exists |
| renders copyright | unit | `screen.getByText(/© 2026 worship room/i)` exists |

**Expected state after completion:**
- [ ] `SiteFooter.tsx` created with all sections
- [ ] All tests pass
- [ ] Component exported but not yet added to Home.tsx

---

### Step 2: Export Component and Add to Home.tsx

**Objective:** Wire the footer into the landing page as the last element.

**Files to modify:**
- `frontend/src/components/index.ts` — Add `SiteFooter` export
- `frontend/src/pages/Home.tsx` — Import and render `<SiteFooter />` as the last child inside `<main>` (after `<StartingPointQuiz />`)

**Details:**

Add to `index.ts`:
```typescript
export { SiteFooter } from './SiteFooter'
```

Update `Home.tsx`:
```typescript
import { SiteFooter } from '@/components/SiteFooter'
// ... existing imports

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar transparent />
      <main>
        <HeroSection />
        <JourneySection />
        <GrowthTeasersSection />
        <StartingPointQuiz />
        <SiteFooter />
      </main>
    </div>
  )
}
```

Note: The `<SiteFooter />` goes inside `<main>` for now (landing page only). When footer is later promoted to a shared layout, it will move outside `<main>` — but that's out of scope for this ticket.

**Guardrails (DO NOT):**
- DO NOT move the footer outside of `<main>` — keep it as a landing page section for now
- DO NOT modify any other existing components
- DO NOT remove or reorder existing sections

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Home renders SiteFooter | integration | Render `<Home />` (in MemoryRouter), verify `screen.getByRole('contentinfo')` exists |

**Expected state after completion:**
- [ ] Footer visible on landing page as the last section
- [ ] Gradient transition from white (quiz) to dark purple (footer) renders smoothly
- [ ] All existing tests still pass
- [ ] New tests pass
- [ ] `pnpm build` succeeds without errors

---

### Step 3: Write Tests

**Objective:** Create comprehensive test file for SiteFooter.

**Files to create:**
- `frontend/src/components/__tests__/SiteFooter.test.tsx`

**Details:**

Follow the exact pattern from `GrowthTeasersSection.test.tsx`:
- Helper `renderSiteFooter()` function wrapping in `<MemoryRouter>`
- Import from `@testing-library/react` and `vitest`
- Import component from `@/components/SiteFooter`

Implement all tests listed in Step 1's test specifications table.

**Guardrails (DO NOT):**
- DO NOT test visual styling (colors, fonts) — test structure and content only
- DO NOT test hover states — those are CSS/interaction tests better suited for E2E
- DO NOT snapshot test — use explicit assertions

**Expected state after completion:**
- [ ] `SiteFooter.test.tsx` exists with 12+ test cases
- [ ] All tests pass via `pnpm test`
- [ ] No test warnings or console errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create SiteFooter component |
| 2 | 1 | Export and add to Home.tsx |
| 3 | 1 | Write tests |

Steps 2 and 3 can be executed in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create SiteFooter component | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/SiteFooter.tsx` with all 6 sections: logo+nav, divider, app download badges, divider, crisis resources, copyright. Inline SVG badges for App Store and Google Play. |
| 2 | Export and add to Home.tsx | [COMPLETE] | 2026-02-24 | Added export to `frontend/src/components/index.ts`, imported and rendered `<SiteFooter />` as last child in `<main>` in `frontend/src/pages/Home.tsx`. |
| 3 | Write tests | [COMPLETE] | 2026-02-24 | Created `frontend/src/components/__tests__/SiteFooter.test.tsx` with 12 test cases. All 149 tests pass (12 new + 137 existing). |
