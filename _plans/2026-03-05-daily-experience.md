# Implementation Plan: Daily Experience — Tabbed Hub Refactor

**Spec:** `_specs/daily-experience.md`
**Date:** 2026-03-05
**Branch:** `claude/feature/daily-experience`

---

## Architecture Context

### Current State

All Daily Experience pages are **already fully implemented** as standalone pages:

- `pages/DailyHub.tsx` — greeting + 3 practice cards linking away + SongPickSection + StartingPointQuiz
- `pages/Pray.tsx` — full standalone Pray page (PrayContent inner component + Pray wrapper with providers)
- `pages/Journal.tsx` — full standalone Journal page (JournalContent inner component + Journal wrapper)
- `pages/MeditateLanding.tsx` — standalone Meditate page with 6 card grid
- `pages/meditate/*.tsx` — 6 meditation sub-experience pages (BreathingExercise, ScriptureSoaking, etc.)
- `pages/SharedVerse.tsx` + `pages/SharedPrayer.tsx` — shareable pages, already done
- `components/daily/` — ReadAloudButton, KaraokeText, ShareButton, CrisisBanner, MiniHubCards, CompletionScreen
- `hooks/useCompletionTracking.ts` — localStorage-based daily completion tracking
- `mocks/daily-experience-mock-data.ts` — all mock data (30 verses, 30 songs, prayers, prompts, reflections)
- `types/daily-experience.ts` — all TypeScript types
- `constants/daily-experience.ts` — completion keys, Spotify URLs, meditation types, chips, breathing phases

### What the Updated Spec Requires

The spec has been updated to a **tabbed single-page architecture**:

1. **DailyHub becomes a tabbed page** — Hero + sticky tab bar (Pray | Journal | Meditate) + tab content + SongPickSection + Quiz + Footer
2. **Pray/Journal/Meditate content moves inline into tabs** — no standalone pages
3. **Route redirects** — `/pray` → `/daily?tab=pray`, `/journal` → `/daily?tab=journal`, `/meditate` → `/daily?tab=meditate`
4. **Navbar "Daily Hub" flat link → "Daily" dropdown** with Pray, Journal, Meditate, Verse & Song items
5. **Context passing via shared state** — "Journal about this →" stays within the Hub (no route change, just tab switch + state pass)
6. **MiniHubCards links update** — `/pray` → `/daily?tab=pray`, etc.

### Key Patterns to Follow

- **Page shell**: Skip link → `<Navbar transparent />` → Hero → `<main id="main-content">` → SongPickSection → StartingPointQuiz → SiteFooter
- **Provider wrapping**: DailyHub must wrap with `ToastProvider` + `AuthModalProvider` since Pray/Journal content needs them
- **Tab state**: `useSearchParams` from React Router to read/write `?tab=pray|journal|meditate`
- **Existing NavDropdown component**: `Navbar.tsx` already has a `NavDropdown` component used by Music and Local Support — reuse it for Daily
- **Test pattern**: `vi.mock('@/hooks/useAuth')`, `MemoryRouter` with `initialEntries`, `beforeEach` with `localStorage.clear()` + `vi.resetAllMocks()` + matchMedia restore

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Current standalone pages (`Pray.tsx`, `Journal.tsx`, `MeditateLanding.tsx`) are working and tested
- [x] All 6 meditation sub-pages exist and work independently
- [x] SharedVerse and SharedPrayer pages exist and need no changes
- [x] All daily components (ReadAloudButton, KaraokeText, ShareButton, CrisisBanner, MiniHubCards, CompletionScreen) exist
- [x] `useCompletionTracking` hook exists and works
- [x] NavDropdown component exists in Navbar.tsx and can be reused
- [ ] Confirm: Tab content should keep React state when switching (components not unmounted) — spec says "Content preserves state"

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab state preservation | Keep all 3 tab panels mounted, use CSS visibility/display to show/hide | Spec requires "Content preserves state" — unmounting loses typing progress |
| Tab animation | Opacity crossfade via CSS transition (150-200ms) | Spec says "subtle crossfade animation" |
| Sticky tab bar | `position: sticky; top: 0; z-index: 40` on the tab bar container | Spec says "Tabs stick below the hero when user scrolls" |
| Provider placement | Single `ToastProvider` + `AuthModalProvider` wrapping entire DailyHub | Pray and Journal content need toast + auth modal; placing at Hub level avoids duplication |
| Context passing (Pray → Journal) | React state lifted into DailyHub: `prayContext` state passed to Journal tab | Spec says "React state within the Daily Hub component" |
| "Journal about this →" CTA | Switches tab to journal + sets prayContext state (no route navigation) | Within same page, just tab switch |
| Old standalone page files | Convert to redirect-only components (or remove and put redirects in App.tsx) | Keep the files to avoid breaking any imports, but make them minimal |
| Navbar dropdown items | Pray → `/daily?tab=pray`, Journal → `/daily?tab=journal`, Meditate → `/daily?tab=meditate`, Verse & Song → `/daily` | Spec shows these 4 items under Daily dropdown |

---

## Implementation Steps

### Step 1: Extract Pray/Journal/Meditate Inner Content into Standalone Tab Components

**Objective:** Create reusable tab content components by extracting the inner content functions from the existing standalone pages. These components will be imported into the new DailyHub.

**Files to create:**
- `frontend/src/components/daily/PrayTabContent.tsx` — extracted from `Pray.tsx:PrayContent` (lines 39-473), modified to remove page shell (Navbar, PageHero, SiteFooter, SongPickSection, JourneySection)
- `frontend/src/components/daily/JournalTabContent.tsx` — extracted from `Journal.tsx:JournalContent` (lines 43-458), same shell removal
- `frontend/src/components/daily/MeditateTabContent.tsx` — extracted from `MeditateLanding.tsx` (lines 36-91), same shell removal

**Details:**

For `PrayTabContent.tsx`:
- Copy `PrayContent` function body from `Pray.tsx`
- Remove: skip-to-content link, `<Navbar>`, `<PageHero>`, `<SiteFooter>`, `<SongPickSection>`, `<JourneySection>`, outer `<div className="flex min-h-screen...">` shell
- Keep: everything inside `<main>` — the `max-w-2xl` content container with squiggle background, heading, chips, textarea, crisis banner, prayer display, action buttons, classic prayers, navigation cards
- Accept props: `prayContext?: { topic: string } | null`, `onSwitchToJournal?: (topic: string) => void` (for "Journal about this →" CTA)
- Change "Journal about this →" `<Link>` to call `onSwitchToJournal?.(extractTopic())` instead of `<Link to="/journal" state={...}>`
- Change navigation cards' `<Link to="/journal">` and `<Link to="/meditate">` to call `onSwitchTab?.('journal')` / `onSwitchTab?.('meditate')` — accept `onSwitchTab?: (tab: string) => void` prop
- Export: `export function PrayTabContent({ onSwitchToJournal, onSwitchTab }: PrayTabContentProps)`
- Do NOT wrap with ToastProvider/AuthModalProvider — the parent DailyHub will provide these

For `JournalTabContent.tsx`:
- Copy `JournalContent` function body from `Journal.tsx`
- Remove same page shell elements
- Accept props: `prayContext?: PrayContext | null` (passed from Hub state instead of `useLocation().state`)
- Remove `useLocation()` — context comes from props
- Change "Return to Daily →" link to call `onSwitchTab?.('pray')`
- Change "Continue to Meditate" link to call `onSwitchTab?.('meditate')`
- Keep "Visit the Prayer Wall" as `<Link to="/prayer-wall">` (leaves the page)
- Export: `export function JournalTabContent({ prayContext, onSwitchTab }: JournalTabContentProps)`

For `MeditateTabContent.tsx`:
- Copy the grid content from `MeditateLanding.tsx`
- Remove `<Layout>` and `<PageHero>` wrapper
- Add the intro text: "Take a moment to slow down and be present with God. Choose how you'd like to be still today."
- Keep meditation card links pointing to `/meditate/*` routes (these leave the page — per spec)
- Export: `export function MeditateTabContent()`

Also copy the `ClassicPrayerCard` function from `Pray.tsx` into `PrayTabContent.tsx` (or keep it alongside).

**Guardrails (DO NOT):**
- Do NOT delete the original `Pray.tsx`, `Journal.tsx`, `MeditateLanding.tsx` yet — they'll be updated in Step 3
- Do NOT change any provider wrapping — parent Hub will handle that
- Do NOT change any mock data imports or hook usage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayTabContent renders heading | unit | Renders "What's On Your Heart?" heading |
| PrayTabContent calls onSwitchToJournal | unit | Clicking "Journal about this →" calls the prop callback |
| JournalTabContent renders heading | unit | Renders "What's On Your Mind?" heading |
| JournalTabContent receives prayContext via props | unit | Context banner appears when prayContext prop is set |
| MeditateTabContent renders 6 cards | unit | All 6 meditation type cards render with correct titles |

**Expected state after completion:**
- [ ] 3 new tab content components exist in `components/daily/`
- [ ] Components render the same UI as the standalone pages (minus the page shell)
- [ ] Components accept callback props for tab switching
- [ ] No existing pages are broken

---

### Step 2: Rewrite DailyHub as Tabbed Single-Page

**Objective:** Transform DailyHub from a simple card-based page into the tabbed single-page experience with Hero + sticky tab bar + tab content + SongPickSection + Quiz + Footer.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — complete rewrite

**Details:**

The new DailyHub structure:

```tsx
export function DailyHub() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <DailyHubContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
```

`DailyHubContent` internals:

1. **Read tab from URL**: `const [searchParams, setSearchParams] = useSearchParams()` — `const activeTab = searchParams.get('tab') ?? 'pray'`

2. **Shared state for context passing**:
   - `const [prayContext, setPrayContext] = useState<PrayContext | null>(null)`
   - When Pray tab's "Journal about this →" fires: `setPrayContext({ from: 'pray', topic })` + `setSearchParams({ tab: 'journal' })`

3. **Tab switching function**:
   ```tsx
   const switchTab = useCallback((tab: string, context?: PrayContext) => {
     setSearchParams({ tab })
     if (context) setPrayContext(context)
   }, [setSearchParams])
   ```

4. **Layout (top to bottom)**:

   a. Skip-to-content link
   b. `<Navbar transparent />`
   c. **Hero section** — same as current DailyHub: greeting, subtitle, quiz teaser. Remove the practice cards section entirely.
   d. **Sticky tab bar** — 3 tabs (Pray, Journal, Meditate). Active tab: purple text + animated underline. Inactive: grey text. `role="tablist"` with `role="tab"` buttons. Sticky: `sticky top-0 z-40 bg-neutral-bg` with shadow on scroll (use `IntersectionObserver` or scroll listener).
   e. **Tab content area** — All 3 panels always mounted (CSS `hidden`/`block` or `opacity-0`/`opacity-100` for crossfade). Each panel wrapped in `<div role="tabpanel" id="tabpanel-{name}" aria-labelledby="tab-{name}">`.
   f. `<SongPickSection />`
   g. `<StartingPointQuiz hideTopGradient />`
   h. `<SiteFooter />`

5. **Tab bar component** (inline or extracted):
   - 3 buttons in a row, evenly spaced on mobile, centered on desktop
   - Active tab: `text-primary font-semibold` + purple underline bar (animated with `transform` and `transition`)
   - Use a `<div>` underline indicator that translates left/center/right based on active tab (CSS transform)
   - Sticky behavior: wrap tab bar in a sentinel div. Use `IntersectionObserver` on a sentinel element above the tab bar — when sentinel leaves viewport, add shadow class.
   - `aria-selected` on active tab button, `tabindex="-1"` on inactive tabs

6. **Tab content preservation**: Render all 3 tab contents always. Use `className={activeTab === 'pray' ? 'block' : 'hidden'}` pattern. This keeps React state (typing in textarea) alive across tab switches.

   Alternative for crossfade: use `opacity-0 pointer-events-none h-0 overflow-hidden` for hidden tabs vs `opacity-100 transition-opacity duration-200` for active. The spec mentions "subtle crossfade animation (150-200ms opacity transition)".

**Guardrails (DO NOT):**
- Do NOT use `{activeTab === 'pray' && <PrayTabContent />}` conditional rendering — this unmounts and loses state
- Do NOT add new Navbar/PageHero/SiteFooter inside tab content — they're part of the Hub shell
- Do NOT change the hero gradient — keep it identical to current DailyHub
- Do NOT change SongPickSection or StartingPointQuiz — reuse as-is

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders greeting in hero | unit | Time-aware greeting displays |
| default tab is Pray | unit | When no `?tab` param, Pray tab content is visible |
| tab switching via URL | unit | `?tab=journal` shows Journal content |
| tab bar renders 3 tabs | unit | Pray, Journal, Meditate tabs present |
| active tab has aria-selected | unit | Active tab button has `aria-selected="true"` |
| switching tabs updates URL | integration | Clicking Journal tab changes searchParams to `?tab=journal` |
| tab content preserves state | integration | Type in Pray textarea, switch to Journal, switch back — text still present |
| Spotify embed renders | unit | SongPickSection iframe present |
| Starting Point Quiz renders | unit | `#quiz` element present |
| context passing Pray→Journal | integration | "Journal about this →" switches to Journal tab with prayContext |

**Expected state after completion:**
- [ ] DailyHub renders as tabbed page with Hero + tab bar + tab content + Song + Quiz + Footer
- [ ] Tab switching works via URL query params
- [ ] Tab content state is preserved when switching
- [ ] All 3 tab contents render correctly
- [ ] Sticky tab bar works on scroll

---

### Step 3: Update Route Redirects in App.tsx

**Objective:** Change `/pray`, `/journal`, `/meditate` from rendering standalone pages to redirecting to `/daily?tab=...`. Update `/scripture` redirect.

**Files to modify:**
- `frontend/src/App.tsx` — change routes

**Details:**

Replace:
```tsx
<Route path="/pray" element={<Pray />} />
<Route path="/journal" element={<Journal />} />
<Route path="/meditate" element={<MeditateLanding />} />
```

With:
```tsx
<Route path="/pray" element={<Navigate to="/daily?tab=pray" replace />} />
<Route path="/journal" element={<Navigate to="/daily?tab=journal" replace />} />
<Route path="/meditate" element={<Navigate to="/daily?tab=meditate" replace />} />
```

Also update the existing `/scripture` redirect:
```tsx
<Route path="/scripture" element={<Navigate to="/daily?tab=pray" replace />} />
```

Remove unused imports: `Pray`, `Journal`, `MeditateLanding` (if no longer referenced).

**Guardrails (DO NOT):**
- Do NOT delete the original page files yet — they may still be imported by tests
- Do NOT change meditation sub-page routes (`/meditate/breathing`, etc.) — those stay as-is
- Do NOT change SharedVerse or SharedPrayer routes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| /pray redirects to /daily?tab=pray | integration | MemoryRouter with `/pray` → renders DailyHub with Pray tab active |
| /journal redirects to /daily?tab=journal | integration | Same pattern |
| /meditate redirects to /daily?tab=meditate | integration | Same pattern |
| /scripture redirects to /daily?tab=pray | integration | Same pattern |

**Expected state after completion:**
- [ ] Navigating to `/pray`, `/journal`, `/meditate` redirects to `/daily?tab=...`
- [ ] Meditation sub-pages still work at their existing routes
- [ ] No broken routes

---

### Step 4: Update Navbar — "Daily Hub" → "Daily" Dropdown

**Objective:** Replace the "Daily Hub" flat link in the navbar with a "Daily" dropdown containing Pray, Journal, Meditate, and Verse & Song items. Update the mobile drawer to match.

**Files to modify:**
- `frontend/src/components/Navbar.tsx`

**Details:**

1. **Add DAILY_LINKS constant** (similar to MUSIC_LINKS, LOCAL_SUPPORT_LINKS):
   ```tsx
   const DAILY_LINKS = [
     { label: 'Pray', to: '/daily?tab=pray' },
     { label: 'Journal', to: '/daily?tab=journal' },
     { label: 'Meditate', to: '/daily?tab=meditate' },
     { label: 'Verse & Song', to: '/daily' },
   ] as const
   ```

2. **Update NAV_LINKS** — remove "Daily Hub" entry:
   ```tsx
   const NAV_LINKS = [
     { label: 'Prayer Wall', to: '/prayer-wall' },
   ] as const
   ```

3. **Update DesktopNav** — add Daily dropdown before Prayer Wall:
   ```tsx
   <NavDropdown
     label="Daily"
     to="/daily"
     links={DAILY_LINKS}
     dropdownId="daily-dropdown"
     transparent={transparent}
     extraActivePaths={['/daily']}
   />
   ```

4. **Update MobileDrawer** — add "Daily" section with sub-links (matching the Music/Local Support pattern):
   ```tsx
   {/* Daily section */}
   <div role="group" aria-labelledby="daily-heading">
     <span id="daily-heading" className="px-3 text-xs font-semibold uppercase tracking-wider text-primary/50">
       Daily
     </span>
     {DAILY_LINKS.map((link) => (
       <NavLink key={link.to} to={link.to} onClick={onClose} className={...}>
         {link.label}
       </NavLink>
     ))}
   </div>
   ```

5. **NavDropdown active state** — need to handle query param matching. The current `isActive` check uses `location.pathname === link.to`. For `/daily?tab=pray`, the pathname is `/daily` but the link `to` includes `?tab=pray`. Add `extraActivePaths` to include `/daily` and also update isActive logic to check `location.pathname + location.search` against link.to. Alternatively, since all Daily links have pathname `/daily`, use `extraActivePaths={['/daily']}` and that will highlight the dropdown when on any `/daily` page.

6. **Order in DesktopNav**: Daily dropdown → Prayer Wall (flat link) → Music dropdown → Local Support dropdown

**Guardrails (DO NOT):**
- Do NOT change the NavDropdown component internals (hover, close delay, Escape handling, etc.)
- Do NOT change the glassmorphic pill styling
- Do NOT change auth actions (Log In / Get Started)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Desktop nav renders Daily dropdown | unit | "Daily" label and chevron visible in desktop nav |
| Daily dropdown shows 4 items | unit | Pray, Journal, Meditate, Verse & Song links in dropdown |
| Mobile drawer shows Daily section | unit | Daily heading with 4 sub-links in mobile drawer |
| Prayer Wall is still a flat link | unit | Prayer Wall renders as NavLink, not inside a dropdown |

**Expected state after completion:**
- [ ] Desktop navbar shows: Daily (dropdown) | Prayer Wall | Music (dropdown) | Local Support (dropdown)
- [ ] Daily dropdown items: Pray, Journal, Meditate, Verse & Song
- [ ] Mobile drawer shows Daily section with sub-links
- [ ] Active state highlights when on `/daily` or any `/daily?tab=...`

---

### Step 5: Update MiniHubCards Links

**Objective:** Update the MiniHubCards component (used in meditation completion screens) to link to `/daily?tab=...` instead of the old standalone routes.

**Files to modify:**
- `frontend/src/components/daily/MiniHubCards.tsx`

**Details:**

Change the `practices` array:
```tsx
const practices = [
  { label: 'Pray', to: '/daily?tab=pray', icon: HandMetal },
  { label: 'Journal', to: '/daily?tab=journal', icon: PenLine },
  { label: 'Meditate', to: '/daily?tab=meditate', icon: Wind },
] as const
```

This ensures completion screens in meditation sub-pages route back to the tabbed hub.

**Guardrails (DO NOT):**
- Do NOT change the visual styling of the cards
- Do NOT change the completion tracking logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MiniHubCards links to /daily?tab=* | unit | Verify href attributes contain correct query params |

**Expected state after completion:**
- [ ] MiniHubCards links point to `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`

---

### Step 6: Update CompletionScreen CTAs

**Objective:** Update the CompletionScreen component CTAs to route back to `/daily?tab=...` instead of standalone routes.

**Files to modify:**
- `frontend/src/components/daily/CompletionScreen.tsx`

**Details:**

Review and update any links that currently point to `/pray`, `/journal`, `/meditate`, `/daily`:
- "Continue to Pray →" → `/daily?tab=pray`
- "Continue to Journal →" → `/daily?tab=journal`
- "Try a different meditation" → `/daily?tab=meditate`
- "Meditate more (same exercise)" stays as-is (refresh same route)
- "Visit the Prayer Wall →" stays as `/prayer-wall`

**Guardrails (DO NOT):**
- Do NOT change the CompletionScreen visual layout
- Do NOT change the "Well done!" messaging

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CompletionScreen CTAs use tabbed routes | unit | Verify CTA hrefs contain `/daily?tab=...` |

**Expected state after completion:**
- [ ] All meditation completion screen CTAs route to tabbed hub URLs

---

### Step 7: Update All Existing Tests

**Objective:** Update all tests that reference the old standalone routes or render standalone page components directly.

**Files to modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx` — rewrite for tabbed architecture
- `frontend/src/pages/__tests__/Pray.test.tsx` — update to test PrayTabContent or test via DailyHub
- `frontend/src/pages/__tests__/Journal.test.tsx` — same
- `frontend/src/pages/__tests__/MeditateLanding.test.tsx` — same
- `frontend/src/components/daily/__tests__/MiniHubCards.test.tsx` — update link assertions (if exists)
- New: `frontend/src/components/daily/__tests__/PrayTabContent.test.tsx`
- New: `frontend/src/components/daily/__tests__/JournalTabContent.test.tsx`
- New: `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx`

**Details:**

**DailyHub.test.tsx** — major rewrite:
- Render with `MemoryRouter initialEntries={['/daily']}` (default Pray tab)
- Test default tab is Pray: verify "What's On Your Heart?" heading visible
- Test `?tab=journal`: verify "What's On Your Mind?" heading visible
- Test `?tab=meditate`: verify 6 meditation cards visible
- Test tab bar renders 3 buttons with correct labels
- Test sticky behavior (may be hard to test — skip or just test the element exists)
- Test SongPickSection and StartingPointQuiz still render
- Test greeting still renders
- Mock `useAuth` same pattern as Pray.test.tsx

**Pray.test.tsx** → convert to test `PrayTabContent`:
- Render `PrayTabContent` inside MemoryRouter with ToastProvider + AuthModalProvider
- Keep all existing test assertions (heading, chips, textarea, auth modal, prayer generation, etc.)
- Add test for `onSwitchToJournal` callback
- Add test for `onSwitchTab` callback on navigation cards

**Journal.test.tsx** → convert to test `JournalTabContent`:
- Render `JournalTabContent` inside MemoryRouter with providers
- Keep all existing test assertions
- Pass `prayContext` prop instead of `location.state`

**MeditateLanding.test.tsx** → convert to test `MeditateTabContent`:
- Keep 6-card grid assertions
- Update link href assertions from `/meditate/*` to stay at `/meditate/*` (meditation sub-pages don't change)

**Route redirect tests** — add to DailyHub.test.tsx or a new redirect test file:
- Test `/pray` → renders Pray tab content
- Test `/journal` → renders Journal tab content
- Test `/meditate` → renders Meditate tab content

**Guardrails (DO NOT):**
- Do NOT skip updating tests — they must pass
- Do NOT delete test files — update them
- Do NOT change test assertion patterns (keep `screen.getByRole`, `userEvent.setup`, etc.)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing test assertions still pass | regression | Every existing assertion adapted to new architecture |
| New tab switching tests | integration | Tab click → correct content visible |
| New context passing tests | integration | Pray → Journal context flow |
| New redirect tests | integration | Old routes redirect correctly |

**Expected state after completion:**
- [ ] `pnpm test` passes with 0 failures
- [ ] All existing functionality still has test coverage
- [ ] New tabbed behavior has test coverage

---

### Step 8: Clean Up Old Standalone Page Files

**Objective:** Remove or slim down the old standalone page files that are no longer needed as full pages.

**Files to modify:**
- `frontend/src/pages/Pray.tsx` — reduce to a redirect component or delete (redirect is in App.tsx)
- `frontend/src/pages/Journal.tsx` — same
- `frontend/src/pages/MeditateLanding.tsx` — same

**Details:**

Since `App.tsx` now has `<Navigate>` redirects for `/pray`, `/journal`, `/meditate`, the standalone page components are no longer rendered by any route. Options:

**Option A (preferred):** Delete the standalone page files entirely. Remove imports from `App.tsx`. All content now lives in `components/daily/PrayTabContent.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`.

**Option B:** Keep them as minimal re-export files that import the tab content components (for backwards compatibility if anything imports them). Not recommended — nothing should import them after this refactor.

Go with Option A. Delete:
- `frontend/src/pages/Pray.tsx`
- `frontend/src/pages/Journal.tsx`
- `frontend/src/pages/MeditateLanding.tsx`

Update `App.tsx` to remove their imports.

Move old test files:
- `pages/__tests__/Pray.test.tsx` → delete (replaced by `components/daily/__tests__/PrayTabContent.test.tsx`)
- `pages/__tests__/Journal.test.tsx` → delete (replaced by `components/daily/__tests__/JournalTabContent.test.tsx`)
- `pages/__tests__/MeditateLanding.test.tsx` → delete (replaced by `components/daily/__tests__/MeditateTabContent.test.tsx`)

**Guardrails (DO NOT):**
- Do NOT delete files that are still imported somewhere — check with grep first
- Do NOT delete SharedVerse.tsx or SharedPrayer.tsx
- Do NOT delete meditation sub-page files (`pages/meditate/*.tsx`)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| No broken imports | build | `pnpm build` succeeds with no errors |
| All tests pass | regression | `pnpm test` passes |

**Expected state after completion:**
- [ ] Old standalone page files deleted
- [ ] No broken imports
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Extract Pray/Journal/Meditate inner content into tab components |
| 2 | 1 | Rewrite DailyHub as tabbed single-page |
| 3 | 2 | Update route redirects in App.tsx |
| 4 | — | Update Navbar: "Daily Hub" → "Daily" dropdown |
| 5 | — | Update MiniHubCards links |
| 6 | — | Update CompletionScreen CTAs |
| 7 | 1, 2, 3, 4, 5, 6 | Update all tests |
| 8 | 7 | Clean up old standalone page files |

**Parallelizable:** Steps 1, 4, 5, 6 can all be done in parallel. Step 2 depends on Step 1. Step 3 depends on Step 2. Steps 7 and 8 are sequential after everything else.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Extract tab content components | [COMPLETE] | 2026-03-05 | Created `components/daily/PrayTabContent.tsx`, `JournalTabContent.tsx`, `MeditateTabContent.tsx`. All 423 tests pass, build clean. |
| 2 | Rewrite DailyHub as tabbed page | [COMPLETE] | 2026-03-05 | Rewrote `pages/DailyHub.tsx` with Hero + sticky tab bar (IntersectionObserver) + 3 always-mounted tab panels + SongPickSection + Quiz + Footer. ToastProvider + AuthModalProvider at top level. Build clean, browser verified. |
| 3 | Update route redirects | [COMPLETE] | 2026-03-05 | Changed `/pray`, `/journal`, `/meditate`, `/scripture` to `<Navigate>` redirects in `App.tsx`. Removed unused imports. Browser verified all redirects work. |
| 4 | Update Navbar dropdown | [COMPLETE] | 2026-03-05 | Added `DAILY_LINKS` constant, replaced "Daily Hub" flat link with "Daily" `NavDropdown` (Pray, Journal, Meditate, Verse & Song). Updated mobile drawer with Daily section. Added `location.search` to route-change close effect. Build clean, browser verified. |
| 5 | Update MiniHubCards links | [COMPLETE] | 2026-03-05 | Updated `MiniHubCards.tsx` practices array to `/daily?tab=*` routes. Build clean. |
| 6 | Update CompletionScreen CTAs | [COMPLETE] | 2026-03-05 | Updated all 6 meditation sub-page CTAs (BreathingExercise, ScriptureSoaking, GratitudeReflection, ActsPrayerWalk, PsalmReading, ExamenReflection) to use `/daily?tab=*` routes. `/prayer-wall` and self-links unchanged. Build clean. |
| 7 | Update all tests | [COMPLETE] | 2026-03-05 | Rewrote `DailyHub.test.tsx` for tabbed architecture (tab bar, default tab, tab switching, greeting, quiz). Converted `Pray.test.tsx` to test `PrayTabContent` with providers + onSwitchToJournal/onSwitchTab callbacks. Converted `Journal.test.tsx` to test `JournalTabContent` with prayContext prop + onSwitchTab callback. Converted `MeditateLanding.test.tsx` to test `MeditateTabContent`. Updated `Navbar.test.tsx` for Daily dropdown (3 tests). All 425 tests pass, build clean. |
| 8 | Clean up old files | [COMPLETE] | 2026-03-05 | Deleted `pages/Pray.tsx`, `pages/Journal.tsx`, `pages/MeditateLanding.tsx`. Verified no remaining imports. Build clean, all 425 tests pass. |
