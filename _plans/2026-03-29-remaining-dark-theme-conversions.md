# Implementation Plan: Remaining Dark Theme Conversions

**Spec:** `_specs/remaining-dark-theme-conversions.md`
**Date:** 2026-03-29
**Branch:** `claude/feature/remaining-dark-theme-conversions`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before the Round 2 dark theme redesign (completed ~2026-03-25). The recon shows old light-themed pages and will not reflect the current dark dashboard or inner-page dark patterns. Do NOT reference recon gradient values for dark pages — use the dark theme plan values and codebase inspection below instead.

---

## Architecture Context

### Relevant Files and Current State

| Surface | File | Current Background | Needs Change |
|---------|------|--------------------|-------------|
| Error Boundary | `frontend/src/components/ChunkErrorBoundary.tsx` | `bg-dashboard-dark` (#0f0a1e), white text | Partially — already dark, but missing Layout wrapper, branding, and warm copy per spec |
| Auth Modal | `frontend/src/components/prayer-wall/AuthModal.tsx` | `bg-white` with `text-nav-text-dark` | Yes — full conversion |
| Music Page | `frontend/src/pages/MusicPage.tsx` | `bg-neutral-bg` (#F5F5F5) | Yes — full conversion |
| Music: AmbientBrowser | `frontend/src/components/audio/AmbientBrowser.tsx` | Light: `bg-gray-50`, `bg-white`, `border-gray-200` | Yes |
| Music: SoundCard | `frontend/src/components/audio/SoundCard.tsx` | `bg-gray-100`, `text-text-dark` | Yes |
| Music: SleepBrowse | `frontend/src/components/audio/SleepBrowse.tsx` | `bg-white`, `border-gray-200` | Yes |
| Music: BibleSleepSection | `frontend/src/components/audio/BibleSleepSection.tsx` | `bg-white`, `border-gray-200` | Yes |
| Music: TonightScripture | `frontend/src/components/audio/TonightScripture.tsx` | `bg-white`, `border-primary/40` | Yes |
| Music: BedtimeStoryCard | `frontend/src/components/audio/BedtimeStoryCard.tsx` | `bg-white`, `border-gray-200` | Yes |
| Music: BedtimeStoriesGrid | `frontend/src/components/audio/BedtimeStoriesGrid.tsx` | `text-text-dark` | Yes |
| Music: ScriptureCollectionRow | `frontend/src/components/audio/ScriptureCollectionRow.tsx` | `text-text-dark` | Yes |
| Music: ScriptureSessionCard | `frontend/src/components/audio/ScriptureSessionCard.tsx` | `bg-white`, `border-gray-200` | Yes |
| Music: SavedMixCard | `frontend/src/components/music/SavedMixCard.tsx` | `bg-white`, `border-gray-200` | Yes |
| Music: WorshipPlaylistsTab | `frontend/src/components/music/WorshipPlaylistsTab.tsx` | `text-text-dark` headings | Yes |
| Music: SceneCard | `frontend/src/components/audio/SceneCard.tsx` | Already has dark gradient overlay | Minimal — ring offset |
| Music: FeaturedSceneCard | `frontend/src/components/audio/FeaturedSceneCard.tsx` | Already has dark gradient overlay | Minimal — ring offset |
| 404 Page | `frontend/src/App.tsx` (NotFound fn, lines 106-128) | `bg-neutral-bg` via Layout, `text-text-dark` | Yes |

### Directory Conventions

- Components: `frontend/src/components/`
- Pages: `frontend/src/pages/`
- Tests: co-located in `__tests__/` directories
- Audio components: `frontend/src/components/audio/`
- Music components: `frontend/src/components/music/`

### Component/Service Patterns

- **Layout component** (`Layout.tsx` line 13): Uses `bg-neutral-bg` as page background. The 404 page inherits this.
- **PageHero component** (`PageHero.tsx`): Uses `ATMOSPHERIC_HERO_BG` with `#0f0a1e` base + purple radial gradient. Already dark-themed.
- **MusicPage** does NOT use `<Layout>` — it composes `<Navbar transparent>`, `<main>`, `<SiteFooter>` directly.
- **Dark page pattern** (from prior dark theme specs): Pages that are fully dark use `bg-dashboard-dark` (#0f0a1e) or `bg-[#0f0a1e]` on the outer container, bypassing `<Layout>` which forces `bg-neutral-bg`.

### Test Patterns

- AuthModal tests: `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` — mocks `useReducedMotion`, renders with `{ isOpen: true, onClose, onShowToast }` props directly (no providers needed).
- MusicPage tests: `frontend/src/pages/__tests__/MusicPage.test.tsx` — wraps in `MemoryRouter`, `ToastProvider`, `AuthModalProvider`. Mocks `useAuth`, `AudioProvider`, `useScenePlayer`, `storageService`.

---

## Auth Gating Checklist

No new auth gates are introduced by this spec. All changes are purely visual.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No new auth gates | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background (dark) | background-color | `#0f0a1e` → `bg-dashboard-dark` | tailwind.config.js:23 |
| Hero dark background | inline style | `{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109,40,217,0.15) 0%, transparent 70%)' }` | PageHero.tsx:9 (`ATMOSPHERIC_HERO_BG`) |
| Frosted glass card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md Dashboard Card Pattern |
| Content card (dark pages) | classes | `bg-white/[0.06] border border-white/10 rounded-xl` | dark-theme-remaining-pages plan, line 111 |
| Modal background | classes | `bg-hero-mid/95 backdrop-blur-xl border border-white/10 rounded-2xl` | Spec |
| Input field (dark) | classes | `bg-white/[0.06] border border-white/10 text-white placeholder:text-white/40 rounded-xl` | Spec + PrayTabContent pattern |
| Input focus (dark) | classes | `focus:border-primary focus:ring-1 focus:ring-primary/50` | Spec |
| Primary text (dark bg) | class | `text-white` | Established pattern |
| Secondary text (dark bg) | class | `text-white/70` | Established pattern |
| Muted text (dark bg) | class | `text-white/60` | Established pattern |
| Section divider (dark bg) | class | `border-white/10` | Established pattern |
| Active tab (dark bg) | class | `text-white` | Daily Hub pattern |
| Inactive tab (dark bg) | class | `text-white/60 hover:text-white/80` | Daily Hub pattern |
| Tab bar sticky bg | class | `bg-dashboard-dark` | Must match page bg |
| Tab bar border | class | `border-b border-white/10` | Established pattern |
| Spotify green (ghost) | classes | `bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 hover:bg-[#1DB954]/30` | Spec |
| Close X (dark bg) | class | `text-white/60 hover:text-white` | Spec |
| Error validation (dark bg) | class | `text-red-400` | Standard dark theme red (red-500 low contrast on dark) |
| Tag pill (dark bg) | classes | `bg-white/10 text-white/50` | dark-theme-remaining-pages plan, line 117 |
| Link accent (dark bg) | class | `text-primary-lt hover:text-primary` | Spec + established |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `font-script` (Caveat) for hero/script headings, not Lora
- Page background on dark pages: `bg-dashboard-dark` = `#0f0a1e` (defined in Tailwind config)
- Content cards on dark pages: `bg-white/[0.06]` (6% opacity) with `border border-white/10 rounded-xl`
- Dashboard frosted glass cards use `bg-white/5` — Music page cards use `bg-white/[0.06]` per prior dark theme spec convention for inner pages
- `PageHero` is already fully dark-themed with `ATMOSPHERIC_HERO_BG` — no changes needed for Music hero
- Focus rings must be visible on dark: `focus-visible:ring-2 focus-visible:ring-primary` with `focus-visible:ring-offset-dashboard-dark` or `focus-visible:ring-offset-[#0f0a1e]`
- SoundCard focus ring offset must change from `focus-visible:ring-offset-gray-100` to `focus-visible:ring-offset-[#0f0a1e]`
- Scene cards (SceneCard, FeaturedSceneCard) already have dark gradient overlays — only ring offset changes needed
- `MusicPage` composes its own Navbar/Footer (not via Layout) so bg change is on the top-level div
- `Layout.tsx` uses `bg-neutral-bg` — the 404 page uses Layout, so Layout needs either a prop or the 404 must bypass Layout
- AuthModal error text: use `text-red-400` not `text-red-500` — red-500 has insufficient contrast on dark modal backgrounds
- Never use `outline-none` without visible replacement
- 44px minimum touch targets on all interactive elements

---

## Shared Data Models (from Master Plan)

Not applicable — this spec is purely visual (CSS class changes). No data model or localStorage changes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Auth modal: ~95% width. Music: single-column cards. Error/404: centered, full-width button. |
| Tablet | 768px | Auth modal: max-w-md. Music: 2-column grids. Error/404: centered. |
| Desktop | 1440px | Auth modal: max-w-md. Music: 3-col scenes, 2-col playlists/sleep. Error/404: centered. |

No layout changes — only color/background conversions. Existing responsive behavior is preserved.

---

## Vertical Rhythm

Not applicable — no new sections or spacing changes. All conversions are background/text color only.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All auth-gated actions from the spec are accounted for (none — purely visual)
- [x] Design system values are verified from codebase inspection and prior dark theme plan
- [x] ChunkErrorBoundary already has dark background — spec requirements for Layout wrapper and warm copy are additions
- [ ] No [UNVERIFIED] values
- [ ] Prior dark theme specs (Specs 1-4 of Round 2) are complete and committed
- [ ] Layout component's `bg-neutral-bg` is understood — 404 page either needs Layout modification or must bypass Layout

**Layout Decision:** The 404 (NotFound) currently uses `<Layout>` which applies `bg-neutral-bg`. Options:
1. Add a `dark` prop to Layout that switches to `bg-dashboard-dark` — used by 404 and potentially other dark pages
2. Have NotFound bypass Layout and compose Navbar/Footer directly (like MusicPage does)

**Chosen:** Option 1 — Add a `dark` prop to Layout. This is cleaner and avoids duplicating Navbar/Footer composition. The prop switches the outer div from `bg-neutral-bg` to `bg-dashboard-dark`, and the skip-to-content link from `bg-white text-primary` to `bg-primary text-white`.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout dark prop vs bypass | Add `dark` prop to Layout | Avoids code duplication. 404 keeps Layout wrapper with Navbar/Footer. Matches spec: "wrapped in Layout" |
| Error boundary + Layout | Wrap ChunkErrorBoundary fallback in Layout | Spec requires navbar/footer visible even on error. Need to import and use Layout. |
| SoundCard bg on dark | `bg-white/[0.06]` | Consistent with other dark-page cards per established convention |
| Auth modal error text color | `text-red-400` instead of `text-red-500` | Red-500 has poor contrast on dark backgrounds; red-400 passes WCAG AA |
| Music tab inactive color | `text-white/60 hover:text-white/80` | Matches Daily Hub inactive tab pattern; spec says `text-white/70` but `/60` is the actual codebase pattern. Using `/60` for consistency. |
| SavedMixCard edit input on dark | `bg-white/[0.06] border border-white/10 text-white` | Match dark input pattern from Pray tab |
| Indigo badge pill (BedtimeStoryCard) | `bg-primary/10 text-primary-lt` | Indigo-100/indigo-700 is light-theme only. Replace with purple accent. |
| BibleSleepSection amber icon box | `bg-primary/10` with `text-primary-lt` icon | Amber-50/amber-600 is light-theme. Replace with purple to match dark aesthetic. |
| BibleSleepSection top gradient bar | Keep `bg-gradient-to-r from-amber-500 to-purple-600` | Accent colors work on dark backgrounds |

---

## Implementation Steps

### Step 1: Add `dark` prop to Layout component

**Objective:** Enable Layout to render with a dark background for pages like 404.

**Files to create/modify:**
- `frontend/src/components/Layout.tsx` — Add optional `dark` boolean prop

**Details:**

In `Layout.tsx`, add a `dark?: boolean` prop to `LayoutProps`. When `dark` is true:
- Outer div: change `bg-neutral-bg` to `bg-dashboard-dark`
- Skip-to-content link: already uses `bg-primary text-white` which works on dark

```tsx
interface LayoutProps {
  children: ReactNode
  hero?: ReactNode
  dark?: boolean  // Add this
}

export function Layout({ children, hero, dark }: LayoutProps) {
  return (
    <div className={cn(
      'flex min-h-screen flex-col overflow-x-hidden font-sans',
      dark ? 'bg-dashboard-dark' : 'bg-neutral-bg',
    )}>
```

No other changes. The skip-to-content link styling works on both backgrounds.

**Responsive behavior:** N/A: no UI impact — prop addition only.

**Guardrails (DO NOT):**
- DO NOT change the default behavior — `dark` defaults to undefined/false, preserving existing light background for all current Layout users
- DO NOT modify the main content area padding or max-width
- DO NOT add any other props or logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Layout renders with bg-neutral-bg by default` | unit | Verify default background class |
| `Layout renders with bg-dashboard-dark when dark prop is true` | unit | Verify dark prop switches background |

**Expected state after completion:**
- [ ] Layout accepts optional `dark` prop
- [ ] `dark={true}` renders `bg-dashboard-dark` instead of `bg-neutral-bg`
- [ ] All existing Layout consumers unchanged (no breaking change)

---

### Step 2: Convert 404 (NotFound) page to dark theme

**Objective:** Dark background, warm copy, consistent with sanctuary aesthetic.

**Files to create/modify:**
- `frontend/src/App.tsx` — Modify `NotFound` function (lines 106-128)

**Details:**

Update the `NotFound` component to use `<Layout dark>` and dark text classes:

```tsx
function NotFound() {
  return (
    <Layout dark>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noIndex />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mb-6 text-base text-white/70 sm:text-lg">
            This page doesn&apos;t exist, but there&apos;s plenty of peace to find elsewhere.
          </p>
          <Link
            to="/"
            className="font-script text-2xl text-primary-lt transition-colors hover:text-primary"
          >
            Go Home
          </Link>
        </div>
      </div>
    </Layout>
  )
}
```

Changes:
- `<Layout>` → `<Layout dark>`
- `text-text-dark` → `text-white`
- `text-text-light` → `text-white/70`
- Body copy warmed: "The page you're looking for doesn't exist." → "This page doesn't exist, but there's plenty of peace to find elsewhere."
- Link: `text-primary` → `text-primary-lt` (better visibility on dark), hover `text-primary-lt` → `text-primary`

**Responsive behavior:**
- Desktop (1440px): Centered card layout, unchanged
- Tablet (768px): Same centered layout
- Mobile (375px): Same centered layout, text sizes already responsive via `sm:text-4xl`

**Guardrails (DO NOT):**
- DO NOT change the Link route or any navigation logic
- DO NOT add branding/logo to 404 (spec only requires it for error boundary)
- DO NOT modify the SEO component props

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `NotFound renders warm body text` | unit | Verify "plenty of peace" copy renders |
| `NotFound renders dark background` | unit | Verify `bg-dashboard-dark` is in DOM |

**Expected state after completion:**
- [ ] 404 page has dark background via `<Layout dark>`
- [ ] Heading is white, body text is white/70
- [ ] Warm copy: "plenty of peace to find elsewhere"
- [ ] Go Home link is purple-lt with hover to purple

---

### Step 3: Convert Auth Modal to dark theme

**Objective:** Transform the white Auth Modal into a frosted glass dark modal matching the sanctuary aesthetic.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx` — Update all visual classes

**Details:**

Class changes by element:

**Modal container** (line 137):
- `bg-white p-6 shadow-xl` → `bg-hero-mid/95 backdrop-blur-xl border border-white/10 p-6 shadow-xl`
- Keep `rounded-xl` and `max-w-md`

**Title h2** (line 142):
- `text-nav-text-dark` → `text-white`

**Subtitle / description p tags** (lines 156, 163):
- `text-text-light` → `text-white/60`

**Close X button** (line 148):
- `text-text-light transition-colors hover:text-text-dark` → `text-white/60 transition-colors hover:text-white`
- Focus ring: keep `focus-visible:ring-2 focus-visible:ring-primary`

**Labels** (lines 169, 205, 217, 232, 256, 281):
- `text-text-dark` → `text-white/80`

**Input fields** (lines 179, 213, 225, 241, 265, 289):
- `rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`
- → `rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50`

**Error messages** (lines 248, 272):
- `text-red-500` → `text-red-400`

**Forgot password link** (line 298):
- `text-nav-text-dark hover:underline` → `text-primary-lt hover:underline`

**Back to Log In link** (line 192):
- `text-nav-text-dark hover:underline` → `text-primary-lt hover:underline`

**Primary Button** (lines 183, 304):
- No change — `bg-primary text-white` works on dark backgrounds

**Divider** (lines 311-313):
- `bg-gray-200` → `bg-white/10`
- `text-text-light` → `text-white/40`

**Spotify button** (line 320):
- `bg-spotify-green/40 px-4 py-2.5 text-sm font-medium text-white opacity-60`
- → `bg-[#1DB954]/20 border border-[#1DB954]/30 px-4 py-2.5 text-sm font-medium text-[#1DB954] opacity-60`
- Remove white text, add green text + ghost border

**Toggle links** (lines 337, 348):
- `text-nav-text-dark hover:underline` → `text-primary-lt hover:underline`

**Surrounding toggle text** (line 330):
- `text-text-light` → `text-white/60`

**Forgot password description** (line 188):
- `text-text-light` → `text-white/60`

**SavedMixCard edit input** (line 109, in SavedMixCard — different file, handled in Step 5):
- Not in this step

**Responsive behavior:**
- Desktop (1440px): Modal at max-w-md centered, no layout change
- Tablet (768px): Same
- Mobile (375px): `mx-4` keeps 16px margins, full-width inputs stack naturally

**Guardrails (DO NOT):**
- DO NOT change form validation logic, submit handlers, or state management
- DO NOT change the modal's open/close animation classes (`animate-modal-spring-in/out`)
- DO NOT change the backdrop overlay (`bg-black/50`)
- DO NOT modify focus trap behavior or aria attributes
- DO NOT change the Button component — it already renders correctly on dark

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AuthModal renders dark background` | unit | Verify modal container has `bg-hero-mid/95` class |
| `AuthModal inputs have dark styling` | unit | Verify inputs have `bg-white/[0.06]` class |
| `AuthModal close button visible on dark` | unit | Verify close button has `text-white/60` |
| `AuthModal error messages use red-400` | unit | Trigger validation, verify `text-red-400` on error text |
| `AuthModal Spotify button has ghost style` | unit | Verify Spotify button has `border-[#1DB954]/30` and `text-[#1DB954]` |
| `AuthModal toggle links use primary-lt` | unit | Verify "Create one!" and "Log in" links have `text-primary-lt` |

**Expected state after completion:**
- [ ] Modal container: frosted glass dark (`bg-hero-mid/95 backdrop-blur-xl border border-white/10`)
- [ ] All text: white hierarchy (white, white/80, white/60, white/40)
- [ ] Inputs: dark translucent (`bg-white/[0.06]`) with purple focus glow
- [ ] Spotify button: ghost green style
- [ ] Divider: `bg-white/10`
- [ ] Error text: `text-red-400`
- [ ] All three views (Login, Register, Forgot Password) consistently dark

---

### Step 4: Convert Music page container, tab bar, and hero transition

**Objective:** Switch Music page from light bg to dark, update sticky tab bar, ensure hero fades into dark.

**Files to create/modify:**
- `frontend/src/pages/MusicPage.tsx` — Update page background, tab bar, and tab styling

**Details:**

**Page container** (line 171):
- `bg-neutral-bg` → `bg-dashboard-dark`

**Skip to content** (line 175):
- `focus:bg-white focus:text-primary` → `focus:bg-primary focus:text-white` (already matches dark page pattern)

**Sticky tab bar** (line 194):
- `bg-neutral-bg` → `bg-dashboard-dark`

**Tab bar border container** (line 198):
- `border-b border-gray-200` → `border-b border-white/10`

**Tab button active** (line 225):
- `text-primary` → `text-white` (match Daily Hub active tab on dark)

**Tab button inactive** (line 226):
- `text-text-light hover:text-text-dark` → `text-white/60 hover:text-white/80`

**Tab button focus ring offset** (line 223):
- Add `focus-visible:ring-offset-[#0f0a1e]` to ensure focus ring is visible on dark background

**Animated underline** (line 236):
- Keep `bg-primary` — works on dark background

**Hero:** No changes needed — `PageHero` already uses `ATMOSPHERIC_HERO_BG` with `#0f0a1e` base. It flows seamlessly into `bg-dashboard-dark`.

**Responsive behavior:**
- Desktop (1440px): No layout changes, only color changes
- Tablet (768px): Same
- Mobile (375px): Tab `shortLabel` still used, same colors

**Guardrails (DO NOT):**
- DO NOT change tab switching logic, search params, or ARIA tab pattern
- DO NOT modify the Navbar `transparent` prop
- DO NOT touch the tooltip, shared mix, or routine interrupt logic
- DO NOT change max-width constraints or padding
- DO NOT modify the SiteFooter (already dark)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `MusicPage renders dark background` | integration | Verify page container has `bg-dashboard-dark` |
| `MusicPage tab bar uses dark border` | integration | Verify tab bar border is `border-white/10` |
| `MusicPage active tab is white text` | integration | Verify active tab has `text-white` class |

**Expected state after completion:**
- [ ] Music page bg: `bg-dashboard-dark`
- [ ] Tab bar bg: `bg-dashboard-dark` with `border-white/10`
- [ ] Active tab: `text-white`, inactive: `text-white/60`
- [ ] Hero seamlessly fades into dark page background

---

### Step 5: Convert Music — Ambient Sounds tab components

**Objective:** Dark-theme all components in the Ambient Sounds tab: AmbientBrowser, SoundCard, SceneCard, FeaturedSceneCard, SavedMixCard, and search results.

**Files to create/modify:**
- `frontend/src/components/audio/AmbientBrowser.tsx` — Update card backgrounds, text colors, section headings
- `frontend/src/components/audio/SoundCard.tsx` — Dark background and text
- `frontend/src/components/music/SavedMixCard.tsx` — Dark card, dark input, dark hover states

**Details:**

#### AmbientBrowser.tsx

**SearchResults section:**
- "No sounds or scenes match" (line 42): `text-text-light` → `text-white/60`
- Scene search heading (line 48): `text-text-light` → `text-white/50`
- Scene search button (line 54): `bg-gray-50 hover:bg-gray-100` → `bg-white/[0.06] hover:bg-white/10`
- Scene search name (line 64): `text-text-dark` → `text-white`
- Scene search desc (line 65): `text-text-light` → `text-white/60`
- Sound search heading (line 73): `text-text-light` → `text-white/50`
- "Not finding it?" (line 88): `text-text-light` → `text-white/60`
- "Search all music" (line 90): `text-primary/50` → `text-primary-lt/50`

**Main content:**
- "Your Saved Mixes" heading (line 138): `text-text-dark` → `text-white`
- "All Scenes" heading (line 168): `text-text-dark` → `text-white`
- "Build Your Own Mix" card (line 185): `border border-gray-200 bg-white p-6 shadow-sm` → `border border-white/10 bg-white/[0.06] p-6`
- "Build Your Own Mix" heading (line 186): `text-text-dark` → `text-white`

#### SoundCard.tsx

- Button bg (line 35): `bg-gray-100` → `bg-white/[0.06]`
- Focus ring offset (line 36): `focus-visible:ring-offset-gray-100` → `focus-visible:ring-offset-[#0f0a1e]`
- Icon inactive (line 52): `text-text-light` → `text-white/50` (keep `text-primary` active)
- Spinner (line 59): `text-text-light` → `text-white/40`
- Sound name (line 65): `text-text-dark` → `text-white/80`

#### SavedMixCard.tsx

- Card container (line 74): `border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-4 transition-shadow hover:shadow-md hover:shadow-black/20`
- Mix name heading (line 112): `text-text-dark` → `text-white`
- Sound icons (line 125): `text-text-light` → `text-white/50`
- Sound count (line 130): `text-text-light` → `text-white/50`
- Edit input (line 109): `border border-gray-300 bg-white px-2 py-1 pr-10 text-sm text-text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-lt` → `bg-white/[0.06] border border-white/10 px-2 py-1 pr-10 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-lt`
- More button hover (line 154): `hover:bg-gray-100 hover:text-text-dark` → `hover:bg-white/10 hover:text-white`
- More button text (line 154): `text-text-light` → `text-white/50`

**SceneCard and FeaturedSceneCard already have dark gradient overlays** — no background changes needed. Only verify they look correct on the dark page (they already use `text-white` for text inside the gradient).

**Responsive behavior:** N/A: no layout changes, only color changes.

**Guardrails (DO NOT):**
- DO NOT change audio playback logic, sound toggle behavior, or scene player
- DO NOT modify the SoundGrid component (it renders SoundCard instances — changes to SoundCard propagate)
- DO NOT change the FavoriteButton component (it handles its own styling)
- DO NOT alter the scrollbar-none or snap behavior
- DO NOT change any aria attributes or accessible names

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `AmbientBrowser Build Your Own Mix has dark card` | unit | Verify "Build Your Own Mix" section has `bg-white/[0.06]` |
| `SoundCard renders dark background` | unit | Verify button has `bg-white/[0.06]` class |
| `SavedMixCard renders dark card` | unit | Verify card has `bg-white/[0.06]` and `border-white/10` |

**Expected state after completion:**
- [ ] All AmbientBrowser sections: dark backgrounds, white text
- [ ] SoundCard: `bg-white/[0.06]` with white/80 labels
- [ ] SavedMixCard: dark frosted card with dark edit input
- [ ] No `bg-gray-50`, `bg-gray-100`, `bg-white`, `border-gray-200` remain in these files

---

### Step 6: Convert Music — Worship Playlists tab

**Objective:** Dark-theme the WorshipPlaylistsTab section headings.

**Files to create/modify:**
- `frontend/src/components/music/WorshipPlaylistsTab.tsx` — Update heading colors

**Details:**

- "Featured" heading (line 32): `text-text-dark` → `text-white`
- "Explore" heading (line 45): `text-text-dark` → `text-white`

The Spotify `SpotifyEmbed` iframes render their own dark UI — no wrapper changes needed. `HeadingDivider` is already white SVG and works on dark backgrounds.

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change the SpotifyEmbed component or iframe dimensions
- DO NOT modify the grid layout or width constraints
- DO NOT remove HeadingDivider or change its behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `WorshipPlaylistsTab headings are white` | unit | Verify "Featured" and "Explore" headings have `text-white` |

**Expected state after completion:**
- [ ] "Featured" heading: `text-white`
- [ ] "Explore" heading: `text-white`
- [ ] Spotify embeds render correctly on dark background

---

### Step 7: Convert Music — Sleep & Rest tab components

**Objective:** Dark-theme all components in the Sleep & Rest tab: SleepBrowse, BibleSleepSection, TonightScripture, ScriptureCollectionRow, ScriptureSessionCard, BedtimeStoriesGrid, BedtimeStoryCard.

**Files to create/modify:**
- `frontend/src/components/audio/SleepBrowse.tsx` — "Build a Bedtime Routine" card
- `frontend/src/components/audio/BibleSleepSection.tsx` — Bible hero card and quick-start cards
- `frontend/src/components/audio/TonightScripture.tsx` — Tonight's scripture card
- `frontend/src/components/audio/ScriptureCollectionRow.tsx` — Collection heading
- `frontend/src/components/audio/ScriptureSessionCard.tsx` — Session card
- `frontend/src/components/audio/BedtimeStoriesGrid.tsx` — Section heading
- `frontend/src/components/audio/BedtimeStoryCard.tsx` — Story card

**Details:**

#### SleepBrowse.tsx

- "Build a Bedtime Routine" card (line 39): `border border-gray-200 bg-white p-6 text-center shadow-sm` → `border border-white/10 bg-white/[0.06] p-6 text-center`
- Heading (line 40): `text-text-dark` → `text-white`
- Description (line 43): `text-text-light` → `text-white/60`
- CTA link border (line 48): `border border-primary` → keep `border border-primary` (works on dark), add `hover:bg-primary/10` (already there)

#### BibleSleepSection.tsx

- "Scripture Reading" heading (line 43): `text-text-dark` → `text-white`
- Bible hero card (line 54): `border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md` → `border border-white/10 bg-white/[0.06] transition-shadow hover:shadow-md hover:shadow-black/20`
- Keep accent bar (line 56): `bg-gradient-to-r from-amber-500 to-purple-600` — works on dark
- Icon container (line 58): `bg-amber-50` → `bg-primary/10`
- Icon (line 59): `text-amber-600` → `text-primary-lt`
- "Read the Bible" heading (line 62): `text-text-dark` → `text-white`
- Description (line 65): `text-text-light` → `text-white/60`
- Quick-start cards (line 83): `border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-4 transition-shadow hover:shadow-md hover:shadow-black/20`
- Scene name (line 88): `text-text-dark` → `text-white`
- Book label (line 90): `text-text-light` → `text-white/60`

#### TonightScripture.tsx

- Card (line 26): `border-2 border-primary/40 bg-white p-6 shadow-sm` → `border-2 border-primary/40 bg-white/[0.06] p-6`
- Title (line 29): `text-text-dark` → `text-white`
- Reference (line 30): `text-text-light` → `text-white/60`
- Duration pill (line 32): `bg-gray-100 px-2 py-0.5 text-xs text-text-light` → `bg-white/10 px-2 py-0.5 text-xs text-white/50`
- Voice text (line 35): `text-text-light` → `text-white/50`

#### ScriptureCollectionRow.tsx

- Collection heading (line 16): `text-text-dark` → `text-white`

#### ScriptureSessionCard.tsx

- Card button (line 21): `border border-gray-200 bg-white p-4 pr-12 shadow-sm transition-colors hover:border-gray-300 hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-4 pr-12 transition-colors hover:border-white/20 hover:shadow-md hover:shadow-black/20`
- Focus ring offset: add `focus-visible:ring-offset-[#0f0a1e]`
- Title (line 23): `text-text-dark` → `text-white`
- Reference (line 24): `text-text-light` → `text-white/60`
- Duration pill (line 27): `bg-gray-100 text-text-light` → `bg-white/10 text-white/50`
- Voice text (line 30): `text-text-light` → `text-white/50`
- Scripture badge (line 33): `bg-primary/10 text-primary` → keep as-is (works on dark)

#### BedtimeStoriesGrid.tsx

- Heading (line 12): `text-text-dark` → `text-white`

#### BedtimeStoryCard.tsx

- Card button (line 25): `border border-gray-200 bg-white p-4 pr-12 shadow-sm transition-colors hover:border-gray-300 hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-4 pr-12 transition-colors hover:border-white/20 hover:shadow-md hover:shadow-black/20`
- Focus ring offset: add `focus-visible:ring-offset-[#0f0a1e]`
- Title (line 27): `text-text-dark` → `text-white`
- Description (line 28): `text-text-light` → `text-white/60`
- Duration pill (line 31): `bg-gray-100 text-text-light` → `bg-white/10 text-white/50`
- Length category (line 34): `text-text-light` → `text-white/50`
- Voice text (line 37): `text-text-light` → `text-white/50`
- "Story" badge (line 40): `bg-indigo-100 text-indigo-700` → `bg-primary/10 text-primary-lt`

**Responsive behavior:** N/A: no layout changes, only color changes.

**Guardrails (DO NOT):**
- DO NOT change the audio playback functions, `useForegroundPlayer` calls, or navigation logic
- DO NOT modify the FavoriteButton component
- DO NOT change the ContentSwitchDialog or RoutineInterruptDialog
- DO NOT alter any aria attributes or accessible names
- DO NOT change the scripture data imports or story data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SleepBrowse routine card has dark styling` | unit | Verify "Build a Bedtime Routine" card has `bg-white/[0.06]` |
| `BibleSleepSection hero card is dark` | unit | Verify Bible hero card has `bg-white/[0.06]` and `border-white/10` |
| `TonightScripture card is dark` | unit | Verify tonight's card has `bg-white/[0.06]` |
| `BedtimeStoryCard has dark card` | unit | Verify story card has `bg-white/[0.06]` |
| `ScriptureSessionCard has dark card` | unit | Verify session card has `bg-white/[0.06]` |

**Expected state after completion:**
- [ ] All Sleep tab cards: `bg-white/[0.06] border border-white/10`
- [ ] All headings: `text-white`
- [ ] All descriptions: `text-white/60`
- [ ] All metadata: `text-white/50`
- [ ] Duration pills: `bg-white/10 text-white/50`
- [ ] No `bg-white`, `bg-gray-100`, `border-gray-200`, `text-text-dark`, or `text-text-light` remain in Sleep tab

---

### Step 8: Update ChunkErrorBoundary with Layout wrapper, branding, and warm copy

**Objective:** Wrap the error boundary fallback in Layout, add Worship Room branding, and warm the copy.

**Files to create/modify:**
- `frontend/src/components/ChunkErrorBoundary.tsx` — Add Layout, branding SVG, warm copy

**Details:**

The error boundary already has `bg-dashboard-dark` and white text. Changes needed:

1. **Import Layout:** `import { Layout } from '@/components/Layout'`
2. **Wrap fallback in `<Layout dark>`:** This adds Navbar and Footer for navigation options
3. **Add branding element:** A simple cross/dove SVG icon above the heading for brand continuity. Use a minimal inline SVG (a subtle cross shape, ~48px, `text-primary/60`).
4. **Warm the copy:**
   - Heading: "Something went wrong loading this page" → "Let's try that again"
   - Body: "This can happen with a slow connection. Please try again." → "Sometimes things don't load as expected. A quick refresh usually does the trick."
5. **Adjust button ring offset:** Already has `focus-visible:ring-offset-dashboard-dark` — keep this since Layout dark uses the same color.

**Important consideration:** Error boundaries must not throw during render. The `<Layout>` component is simple (Navbar, main, Footer) and unlikely to error, but we should keep the implementation simple.

```tsx
render(): ReactNode {
  if (this.state.hasChunkError) {
    return (
      <Layout dark>
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="max-w-md text-center">
            {/* Branding cross icon */}
            <svg
              className="mx-auto mb-6 h-12 w-12 text-primary/60"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="24" y1="8" x2="24" y2="40" />
              <line x1="14" y1="18" x2="34" y2="18" />
            </svg>
            <h1 className="mb-3 text-2xl font-bold text-white">
              Let&apos;s try that again
            </h1>
            <p className="mb-8 text-base text-white/70">
              Sometimes things don&apos;t load as expected. A quick refresh usually does the trick.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </Layout>
    )
  }
  return this.props.children
}
```

**Responsive behavior:**
- Desktop (1440px): Centered content with Navbar/Footer
- Tablet (768px): Same centered layout
- Mobile (375px): Same, `px-6` provides padding

**Guardrails (DO NOT):**
- DO NOT change the error detection logic (`getDerivedStateFromError`)
- DO NOT change `componentDidCatch` logging
- DO NOT add complex components that could throw in the fallback render
- DO NOT use an external SVG file — inline SVG is safer in error boundary context

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `ChunkErrorBoundary fallback shows warm heading` | unit | Verify "Let's try that again" renders |
| `ChunkErrorBoundary fallback shows cross icon` | unit | Verify SVG branding element renders |
| `ChunkErrorBoundary fallback shows refresh button` | unit | Verify "Refresh Page" button present |

**Expected state after completion:**
- [ ] Error boundary wrapped in `<Layout dark>` with Navbar/Footer
- [ ] Cross SVG branding icon above heading
- [ ] Warm copy: "Let's try that again" + "Sometimes things don't load as expected..."
- [ ] Button text changed to "Refresh Page" per spec

---

### Step 9: Update existing tests and add new tests

**Objective:** Update existing tests that assert on old class names and add new tests for dark theme conversions.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/__tests__/AuthModal.test.tsx` — Add dark theme assertions
- `frontend/src/pages/__tests__/MusicPage.test.tsx` — Update for dark background
- `frontend/src/components/__tests__/ChunkErrorBoundary.test.tsx` — Create if doesn't exist, or update
- `frontend/src/components/__tests__/Layout.test.tsx` — Add dark prop test

**Details:**

Check existing tests for class name assertions that reference old light-theme values (`bg-white`, `text-text-dark`, `bg-neutral-bg`, `bg-gray-200`). Update those assertions to match new dark classes.

**New tests to add:**

1. **Layout dark prop test:** Render `<Layout dark>` and verify `bg-dashboard-dark` in output.
2. **AuthModal dark theme tests:** Verify modal container has `bg-hero-mid/95`, inputs have `bg-white/[0.06]`, close button has `text-white/60`.
3. **MusicPage dark background:** Verify page container no longer has `bg-neutral-bg`.
4. **NotFound dark theme:** Render NotFound route and verify warm copy text.

Follow existing test patterns:
- AuthModal: render directly with props, mock `useReducedMotion`
- MusicPage: wrap in `MemoryRouter`, `ToastProvider`, `AuthModalProvider`, mock audio/auth

**Responsive behavior:** N/A: no UI impact — tests only.

**Guardrails (DO NOT):**
- DO NOT remove existing test assertions that test functionality (validation, form behavior, tab switching)
- DO NOT create snapshot tests
- DO NOT test internal implementation details — test what the user sees

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| See individual tests listed above | unit/integration | Dark theme visual assertions |

**Expected state after completion:**
- [ ] All existing tests pass with updated class assertions
- [ ] New dark theme tests added and passing
- [ ] No test references old light-theme class names that have been changed

---

### Step 10: Build verification and visual smoke test

**Objective:** Verify build passes with zero errors and no remaining light-theme artifacts on converted surfaces.

**Files to create/modify:** None — verification only.

**Details:**

1. Run `pnpm build` — must produce zero errors and zero warnings
2. Run `pnpm test` — all tests must pass
3. Run `pnpm lint` — no new lint errors introduced
4. Grep for remaining light-theme artifacts in converted files:
   - Search for `bg-neutral-bg` in MusicPage.tsx — should not exist
   - Search for `bg-white` (without opacity) in AuthModal.tsx — should not exist (except where intended, like button text)
   - Search for `text-text-dark` in all converted Music components — should not exist
   - Search for `border-gray-200` in all converted Music components — should not exist
   - Search for `bg-gray-100` or `bg-gray-50` in converted components — should not exist
5. Verify no `bg-neutral-bg` or `#F5F5F5` references remain in any of the 4 converted surfaces

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any files in this step — verification only
- DO NOT skip the artifact grep — this is the "no light surfaces remain" acceptance criterion

**Test specifications:** N/A — this step IS the verification.

**Expected state after completion:**
- [ ] Build: zero errors, zero warnings
- [ ] Tests: all pass (no regressions)
- [ ] Lint: no new errors
- [ ] Zero light-theme artifacts remain in converted surfaces
- [ ] All 4 surfaces verified dark: Error Boundary, Auth Modal, Music Page, 404 Page

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `dark` prop to Layout |
| 2 | 1 | Convert 404 page (uses `Layout dark`) |
| 3 | — | Convert Auth Modal |
| 4 | — | Convert Music page container + tab bar |
| 5 | 4 | Convert Music Ambient tab components |
| 6 | 4 | Convert Music Worship Playlists tab |
| 7 | 4 | Convert Music Sleep & Rest tab components |
| 8 | 1 | Convert ChunkErrorBoundary (uses `Layout dark`) |
| 9 | 2, 3, 4, 5, 6, 7, 8 | Update and add tests |
| 10 | 9 | Build verification and artifact grep |

**Parallelizable:** Steps 3, 4 can run in parallel with Steps 1+2. Steps 5, 6, 7 can run in parallel (all depend on 4 only). Step 8 depends on 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `dark` prop to Layout | [COMPLETE] | 2026-03-29 | Added `dark?: boolean` prop to LayoutProps. When true, switches `bg-neutral-bg` to `bg-dashboard-dark`. |
| 2 | Convert 404 page | [COMPLETE] | 2026-03-29 | `<Layout dark>`, white text hierarchy, warm copy, primary-lt link color. |
| 3 | Convert Auth Modal | [COMPLETE] | 2026-03-29 | Frosted glass modal (`bg-hero-mid/95 backdrop-blur-xl`), dark inputs, white text hierarchy, ghost Spotify button, red-400 errors, primary-lt links. |
| 4 | Convert Music page container + tab bar | [COMPLETE] | 2026-03-29 | Page bg → `bg-dashboard-dark`, tab bar bg + border dark, active tab white, skip-to-content dark pattern, focus ring offset. |
| 5 | Convert Music Ambient tab components | [COMPLETE] | 2026-03-29 | AmbientBrowser, SoundCard, SavedMixCard all converted. Dark cards, white text, focus ring offsets updated. |
| 6 | Convert Music Worship Playlists tab | [COMPLETE] | 2026-03-29 | "Featured" and "Explore" headings → `text-white`. |
| 7 | Convert Music Sleep & Rest tab components | [COMPLETE] | 2026-03-29 | All 7 files converted: SleepBrowse, BibleSleepSection, TonightScripture, ScriptureCollectionRow, ScriptureSessionCard, BedtimeStoriesGrid, BedtimeStoryCard. Dark cards, white text, focus ring offsets, indigo→primary badge. |
| 8 | Convert ChunkErrorBoundary | [COMPLETE] | 2026-03-29 | Wrapped in `<Layout dark>`, added cross SVG branding, warm copy ("Let's try that again"), button text "Refresh Page". |
| 9 | Update and add tests | [COMPLETE] | 2026-03-29 | Updated ChunkErrorBoundary tests (new copy, Layout mock, cross icon). Added AuthModal dark theme tests (6 new). Created Layout.test.tsx (2 tests). MusicPage tests pass unchanged. 43 tests total. |
| 10 | Build verification | [COMPLETE] | 2026-03-29 | Build: 0 errors. Tests: 4,871 pass / 0 fail. Artifact grep: zero light-theme remnants in all 16 converted files. |
