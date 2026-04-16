# Implementation Plan: Grow Page Tabbed Experience

**Spec:** `_specs/grow-page-tabbed-experience.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/grow-page-tabbed-experience`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no external recon for this feature)
**Master Spec Plan:** not applicable (standalone spec, second of 4 navigation restructure specs)

---

## Architecture Context

### Existing Patterns

- **Tab bar pattern (DailyHub.tsx):** Frosted glass sticky tab bar with Intersection Observer sentinel for shadow. `bg-white/[0.08] backdrop-blur-xl`, `border-b border-white/10`. Animated underline via absolute div with `translateX`. WAI-ARIA tabs pattern: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`. Arrow key navigation. Tab panels use `hidden` attribute for CSS show/hide (all mounted, preserves state).

- **Atmospheric hero (PageHero.tsx):** Exported `ATMOSPHERIC_HERO_BG`:
  ```typescript
  {
    backgroundColor: '#0f0a1e',
    backgroundImage: 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
  }
  ```
  Hero section: `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40`, centered text, Caveat title with gradient text `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`.

- **Page background:** `bg-[#0f0a1e]` (same as `bg-dashboard-dark`, which is `#0f0a1e` in tailwind.config.js). Both `ReadingPlans` and `Challenges` already use this background.

- **Navbar challenge dot (Navbar.tsx:292-297):** `getActiveChallengeInfo()` returns active challenge info. Dot rendered when `link.to === '/challenges'` — this check needs updating to `/grow?tab=challenges`.

- **ReadingPlans page (ReadingPlans.tsx):** Self-contained component with ConfirmDialog, FilterBar, PlanCards, CreatePlanFlow. Uses `useSearchParams` for `?create=true`. Has its own Navbar, PageHero, SiteFooter, SEO. Auth gates via `useAuth` + `useAuthModal`.

- **Challenges page (Challenges.tsx):** Self-contained component with categorized challenges (active/upcoming/past), SwitchChallengeDialog, HallOfFame. Has its own Navbar, PageHero, SiteFooter, SEO. Auth gates via `useAuth` + `useAuthModal`.

### Key Files

| File | Role |
|------|------|
| `frontend/src/pages/DailyHub.tsx` | Tab bar pattern reference (4 tabs) |
| `frontend/src/pages/ReadingPlans.tsx` | Content to move into Plans tab |
| `frontend/src/pages/Challenges.tsx` | Content to move into Challenges tab |
| `frontend/src/components/PageHero.tsx` | `ATMOSPHERIC_HERO_BG` export |
| `frontend/src/components/Navbar.tsx` | NAV_LINKS (lines 23-32), dot logic (line 292, 717) |
| `frontend/src/App.tsx` | Route definitions (lines 143-146) |
| `frontend/src/pages/ReadingPlanDetail.tsx` | Back links (line 136 breadcrumb, line 271 onBrowsePlans) |
| `frontend/src/pages/ChallengeDetail.tsx` | Back link (line 362) |
| `frontend/src/components/reading-plans/PlanNotFound.tsx` | Browse link (line 19) |
| `frontend/src/components/challenges/ChallengeNotFound.tsx` | Browse link (line 19) |
| `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` | Navigate (line 116) |
| `frontend/src/components/dashboard/ReadingPlanWidget.tsx` | Browse links (lines 207, 242) |
| `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx` | onBrowsePlans callback (line 116) |

### Test Patterns

Tests use: `MemoryRouter` with `initialEntries`, `vi.mock` for `useAuth`/`useAuthModal`/`useFaithPoints`, `AuthModalProvider` + `ToastProvider` wrappers. See `ReadingPlans.test.tsx` and `Challenges.test.tsx` for exact patterns.

### Directory Conventions

- Pages: `frontend/src/pages/`
- Page tests: `frontend/src/pages/__tests__/`
- Component tests: `frontend/src/components/<feature>/__tests__/`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| "Create Your Own Plan" click | Auth modal for logged-out | Step 1 | Inherited from ReadingPlans content (useAuth + authModal) |
| "Start Plan" on plan card | Auth modal for logged-out | Step 1 | Inherited from ReadingPlans content |
| "Join Challenge" on active challenge | Auth modal for logged-out | Step 1 | Inherited from Challenges content |
| "Resume" paused challenge | Auth modal for logged-out | Step 1 | Inherited from Challenges content |
| Toggle challenge reminder | Auth modal for logged-out | Step 1 | Inherited from Challenges content |

All auth gates are inherited from existing components -- no new gates introduced.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (`bg-dashboard-dark`) | ReadingPlans.tsx, Challenges.tsx, tailwind.config.js:23 |
| Hero section | background | `ATMOSPHERIC_HERO_BG` = `{ backgroundColor: '#0f0a1e', backgroundImage: 'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)' }` | PageHero.tsx:6-10 |
| Hero title | font | Caveat (`font-script`), `text-3xl sm:text-4xl`, bold, gradient text `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` | PageHero.tsx:32, spec 1.1 |
| Hero subtitle | font | Lora (`font-serif`), italic, `text-base sm:text-lg`, `text-white/60` | PageHero.tsx:44, spec 1.1 |
| Hero padding | padding | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` (navbar clearance + section spacing) | PageHero.tsx:25, DailyHub.tsx:221 |
| Tab bar | background | `bg-white/[0.08] backdrop-blur-xl` | DailyHub.tsx:319 |
| Tab bar border | border-bottom | `border-b border-white/10` | DailyHub.tsx:323 |
| Tab bar sticky shadow | shadow | `shadow-md shadow-black/20` when sticky | DailyHub.tsx:320 |
| Active tab text | color | `text-white` | DailyHub.tsx:350 |
| Inactive tab text | color | `text-white/60 hover:text-white/80` | DailyHub.tsx:351 |
| Tab underline | background | `bg-primary` (#6D28D9) | DailyHub.tsx:371 |
| Tab underline | animation | `transition-transform duration-200 ease-in-out`, width `50%`, translateX | DailyHub.tsx:372-374 |
| Challenge dot | style | `h-1.5 w-1.5 rounded-full`, `motion-safe:animate-challenge-pulse`, theme color | Navbar.tsx:294-296 |
| Content section | padding | `px-4 py-8 sm:px-6 sm:py-10` | ReadingPlans.tsx:183, Challenges.tsx:160 |
| Content max-width | max-width | `max-w-4xl` | ReadingPlans.tsx:184, Challenges.tsx:161 |

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses Caveat (`font-script`) for hero titles, NOT Lora
- Hero gradient text uses `bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`
- The atmospheric hero background is `ATMOSPHERIC_HERO_BG` imported from `@/components/PageHero` -- do NOT write raw gradient CSS
- Tab bar uses `bg-white/[0.08]` (NOT `bg-white/5` which is the dashboard card pattern)
- Tab bar animated underline width is `100 / TABS.length`% per tab, positioned via `translateX(activeTabIndex * 100%)`
- Both tab panels must be mounted simultaneously using `hidden` attribute (NOT conditional rendering)
- Dark page background is `bg-dashboard-dark` which is `#0f0a1e` -- same as what ReadingPlans/Challenges already use
- Navbar challenge dot check uses `link.to === '/challenges'` -- this must be updated to match the new URL
- Tab focus ring offset uses `focus-visible:ring-offset-dashboard-dark` to match dark background

---

## Shared Data Models (from Master Plan)

Not applicable -- standalone spec with no new data models.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_reading_plan_progress` | Read (inherited) | Reading plan progress |
| `wr_custom_plans` | Read (inherited) | AI-generated plan references |
| `wr_challenge_progress` | Read (inherited) | Challenge participation tracking |
| `wr_challenge_reminders` | Read (inherited) | Challenge reminder preferences |

No new keys introduced. All reads inherited from existing ReadingPlans/Challenges content.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero: `py-8`, `text-3xl` title, `text-base` subtitle. Tab bar: 2 tabs with icon + label, full-width. Plan cards: 1-column. Challenge cards: stacked. |
| Tablet | 768px | Hero: intermediate. Tab bar: 2 tabs centered. Plan cards: 2-column grid. |
| Desktop | 1440px | Hero: `py-12`, `text-4xl` title, `text-lg` subtitle. Tab bar: centered within `max-w-3xl`. Plan cards: 2-column with generous spacing. |

---

## Vertical Rhythm

| From -> To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero -> tab bar | 0px (hero flows directly into tab bar, no gap) | Spec 1.1: "Hero flows directly into the tab bar below with no gap" |
| Tab bar -> tab content | 0px (tab bar border provides visual separation) | DailyHub pattern |
| Tab content internal | `px-4 py-8 sm:px-6 sm:py-10` (existing content padding) | ReadingPlans.tsx:183, Challenges.tsx:160 |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file read and understood
- [x] DailyHub tab bar pattern fully documented (DailyHub.tsx)
- [x] All links to `/reading-plans` and `/challenges` (browser routes) identified
- [x] All auth-gated actions from the spec are accounted for (all inherited)
- [x] Design system values verified from PageHero.tsx, DailyHub.tsx, and design-system.md
- [x] No [UNVERIFIED] values -- all patterns exist in the codebase
- [ ] `ReadingPlans` and `Challenges` page content can be extracted without breaking internal state management (their hooks + auth logic must work identically when rendered as children of GrowPage)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| How to extract tab content | Refactor ReadingPlans/Challenges to export content-only components (strip Navbar/PageHero/SiteFooter/SEO wrappers), keeping them as files but the exports change from full pages to content-only | Minimizes code duplication. The existing components become "tab content" components. |
| ConfirmDialog / SwitchChallengeDialog rendering | Rendered inside their respective tab content (portaled to body via fixed positioning) | Already use `fixed inset-0` -- works regardless of parent container |
| CreatePlanFlow rendering | Returned early in ReadingPlans content when `create=true` -- this pattern stays as-is | CreatePlanFlow already handles its own full-screen layout |
| Tab bar max-width | `max-w-3xl` to match Daily Hub | Consistency with Daily Hub pattern |
| Content max-width | `max-w-4xl` (inherited from existing pages) | Existing ReadingPlans/Challenges use `max-w-4xl` |
| SEO for /grow | New SEO title/description for the combined page | Spec section 10 |
| `?create=true` on Challenges tab | Ignored (only affects Reading Plans tab) | Spec edge case |
| Navbar `NavLink` active state | NavLink `to="/grow?tab=plans"` and `to="/grow?tab=challenges"` -- React Router NavLink `isActive` will match based on pathname+search | NavLink compares exact `to` string against current location |

---

## Implementation Steps

### Step 1: Create GrowPage with hero and tab bar

**Objective:** Create the new `/grow` page component with atmospheric hero, 2-tab bar, and render both ReadingPlans and Challenges content as tab panels.

**Files to create/modify:**
- `frontend/src/pages/GrowPage.tsx` -- **create** new page component
- `frontend/src/pages/ReadingPlans.tsx` -- **modify** to export a content-only component (strip page shell)
- `frontend/src/pages/Challenges.tsx` -- **modify** to export a content-only component (strip page shell)

**Details:**

1. **Refactor `ReadingPlans.tsx`:**
   - Rename the current `ReadingPlans` export to `ReadingPlansContent`
   - Add a new `ReadingPlans` export that wraps `ReadingPlansContent` with the page shell (Navbar, PageHero, SiteFooter, SEO, skip link, `min-h-screen bg-[#0f0a1e]` wrapper) -- this keeps the old export working for the redirect route (which will be removed in Step 3, but keeps tests passing in the interim)
   - `ReadingPlansContent` strips: the outer `<div className="min-h-screen bg-[#0f0a1e]">`, `<SEO>`, skip-to-content link, `<Navbar transparent />`, `<PageHero>`, `<SiteFooter>`. It keeps: the `<section>` with content, `<ConfirmDialog>`, and `<CreatePlanFlow>` (early return)
   - Accept an optional `createParam` prop to allow GrowPage to pass the `create=true` state (since GrowPage owns the URL params)

2. **Refactor `Challenges.tsx`:**
   - Same pattern: rename to `ChallengesContent`, add wrapper `Challenges` export
   - `ChallengesContent` strips: outer div, SEO, skip link, Navbar, PageHero, SiteFooter. Keeps: content section, SwitchChallengeDialog

3. **Create `GrowPage.tsx`:**
   - Follow DailyHub.tsx tab bar pattern exactly (lines 117-380)
   - Define `TABS`:
     ```typescript
     const TABS = [
       { id: 'plans', label: 'Reading Plans', icon: BookOpen },
       { id: 'challenges', label: 'Challenges', icon: Flame },
     ] as const
     ```
   - URL param handling: `useSearchParams`, default tab `plans`
   - Hero section with `ATMOSPHERIC_HERO_BG`:
     - Title: "Grow in Faith" -- `font-script text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`
     - Subtitle: "Structured journeys to deepen your walk with God" -- `font-serif italic text-base sm:text-lg text-white/60`
     - Spacing: `pt-32 pb-8 sm:pt-36 sm:pb-10 lg:pt-40 lg:pb-12` (less bottom padding than standard hero since it flows directly into tab bar)
   - Sentinel div for sticky detection (Intersection Observer, same as DailyHub:117-129)
   - Sticky tab bar: `sticky top-0 z-40 bg-white/[0.08] backdrop-blur-xl`, shadow on scroll
     - Inner container: `mx-auto flex max-w-3xl items-center justify-center border-b border-white/10`
     - Tabs: `role="tablist"`, arrow key navigation, `aria-selected`, `tabIndex` management
     - Each tab: `flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium sm:py-4 sm:text-base`
     - Active: `text-white`, Inactive: `text-white/60 hover:text-white/80`
     - Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark`
     - Animated underline: `width: 50%`, `transform: translateX(${activeTabIndex * 100}%)`
   - Challenge notification dot on Challenges tab: use `getActiveChallengeInfo()`, render dot with challenge's `themeColor`, same classes as Navbar dot (`h-1.5 w-1.5 rounded-full motion-safe:animate-challenge-pulse`)
   - Tab panels: both mounted, CSS-hidden via `hidden` attribute
     - `<div role="tabpanel" id="tabpanel-plans" aria-labelledby="tab-plans" tabIndex={0} hidden={activeTab !== 'plans'}>`
     - `<div role="tabpanel" id="tabpanel-challenges" aria-labelledby="tab-challenges" tabIndex={0} hidden={activeTab !== 'challenges'}>`
   - Pass `createParam={searchParams.get('create') === 'true'}` to ReadingPlansContent
   - Page wrapper: `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">`
   - Include: skip-to-content link, `<Navbar transparent />`, SEO, `<SiteFooter />`
   - SEO: `title="Grow in Faith"`, `description="Discover Bible reading plans and seasonal community challenges to deepen your walk with God."`

**Auth gating:** All inherited from ReadingPlansContent and ChallengesContent components. No new gates.

**Responsive behavior:**
- Desktop (1440px): Hero `lg:pb-12`, `text-4xl` title, `text-lg` subtitle. Tabs centered in `max-w-3xl`. Content `max-w-4xl`.
- Tablet (768px): Hero intermediate. Tabs comfortable width.
- Mobile (375px): Hero `py-8`, `text-3xl` title, `text-base` subtitle. Tabs full-width with icon + label.

**Guardrails (DO NOT):**
- Do NOT use conditional rendering (`{activeTab === 'plans' && <ReadingPlansContent />}`) -- must use `hidden` attribute to preserve state
- Do NOT add new auth gates -- all inherited
- Do NOT change the visual appearance of ReadingPlans or Challenges content
- Do NOT use `PageHero` component directly -- the hero is custom with no divider, specific subtitle styling (Lora italic, not Inter)
- Do NOT forget `aria-label` on the tablist ("Grow in Faith sections" or similar)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders hero with correct title and subtitle | integration | Check "Grow in Faith" and subtitle text |
| defaults to Reading Plans tab when no tab param | integration | Navigate to `/grow`, verify plans content visible |
| switches to Challenges tab via URL param | integration | Navigate to `/grow?tab=challenges`, verify challenges content |
| tab click updates URL and switches content | integration | Click Challenges tab, verify URL updates and content switches |
| preserves filter state when switching tabs | integration | Set filter in plans tab, switch to challenges and back, verify filter preserved |
| shows challenge notification dot when challenge active | integration | Mock `getActiveChallengeInfo`, verify dot appears on Challenges tab |
| hides challenge notification dot when no challenge active | integration | Mock `getActiveChallengeInfo` returning null, verify no dot |
| `?create=true` opens CreatePlanFlow | integration | Navigate to `/grow?tab=plans&create=true`, verify CreatePlanFlow renders |
| keyboard navigation between tabs | integration | Arrow keys move between tabs |
| tab bar becomes sticky on scroll | integration | Verify sticky class application (sentinel-based) |
| correct ARIA attributes on tabs and panels | integration | Check role, aria-selected, aria-controls, aria-labelledby |

**Expected state after completion:**
- [ ] `/grow` renders with hero, 2 tabs, correct content in each tab
- [ ] Reading Plans content renders identically in tab as it did standalone
- [ ] Challenges content renders identically in tab as it did standalone
- [ ] Tab switching preserves state (both panels mounted)
- [ ] All auth gates work as before

---

### Step 2: Update routes and redirects

**Objective:** Add `/grow` route, change `/reading-plans` and `/challenges` to redirects, preserve detail page routes.

**Files to modify:**
- `frontend/src/App.tsx` -- add GrowPage route, change ReadingPlans/Challenges to redirects

**Details:**

1. Add lazy import for GrowPage:
   ```typescript
   const GrowPage = lazy(() => import('./pages/GrowPage').then((m) => ({ default: m.GrowPage })))
   ```

2. Replace route definitions:
   ```typescript
   // Before:
   <Route path="/reading-plans" element={<ReadingPlans />} />
   <Route path="/challenges" element={<Challenges />} />

   // After:
   <Route path="/grow" element={<GrowPage />} />
   <Route path="/reading-plans" element={<ReadingPlansRedirect />} />
   <Route path="/challenges" element={<Navigate to="/grow?tab=challenges" replace />} />
   ```

3. Create `ReadingPlansRedirect` inline component that preserves `?create=true`:
   ```typescript
   function ReadingPlansRedirect() {
     const [searchParams] = useSearchParams()
     const create = searchParams.get('create')
     const target = create === 'true' ? '/grow?tab=plans&create=true' : '/grow?tab=plans'
     return <Navigate to={target} replace />
   }
   ```

4. Detail routes stay unchanged:
   ```typescript
   <Route path="/reading-plans/:planId" element={<ReadingPlanDetail />} />
   <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
   ```

**Auth gating:** N/A -- route-level, no auth required.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT use `<Navigate>` without `replace` -- spec requires `replace` to avoid polluting browser history
- Do NOT redirect `/reading-plans/:planId` or `/challenges/:challengeId` -- detail pages stay as-is
- Do NOT remove the lazy imports for `ReadingPlanDetail` and `ChallengeDetail`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `/reading-plans` redirects to `/grow?tab=plans` | integration | Navigate to old route, verify redirect |
| `/reading-plans?create=true` redirects to `/grow?tab=plans&create=true` | integration | Navigate with create param, verify preserved |
| `/challenges` redirects to `/grow?tab=challenges` | integration | Navigate to old route, verify redirect |
| `/reading-plans/:planId` does NOT redirect | integration | Navigate to detail, verify no redirect |
| `/challenges/:challengeId` does NOT redirect | integration | Navigate to detail, verify no redirect |

**Expected state after completion:**
- [ ] `/grow` route works
- [ ] Old routes redirect correctly with `replace`
- [ ] Detail page routes unchanged
- [ ] `?create=true` preserved through redirect

---

### Step 3: Update internal links (Navbar, widgets, back navigation)

**Objective:** Update all links throughout the app that point to the old standalone browser routes.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` -- NAV_LINKS entries + dot logic
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx` -- browse links
- `frontend/src/pages/ReadingPlanDetail.tsx` -- breadcrumb + onBrowsePlans
- `frontend/src/pages/ChallengeDetail.tsx` -- back link
- `frontend/src/components/reading-plans/PlanNotFound.tsx` -- browse link
- `frontend/src/components/challenges/ChallengeNotFound.tsx` -- browse link
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx` -- navigate target

**Details:**

1. **Navbar.tsx (line 28-29):** Update NAV_LINKS:
   ```typescript
   { label: 'Reading Plans', to: '/grow?tab=plans', icon: BookOpen },
   { label: 'Challenges', to: '/grow?tab=challenges', icon: Flame },
   ```

2. **Navbar.tsx (lines 292, 717):** Update challenge dot check:
   ```typescript
   // Before: link.to === '/challenges'
   // After:  link.to === '/grow?tab=challenges'
   ```

3. **ReadingPlanWidget.tsx (lines 207, 242):** Update both `to="/reading-plans"` to `to="/grow?tab=plans"`.

4. **ReadingPlanDetail.tsx (line 136):** Update SEO breadcrumb:
   ```typescript
   { '@type': 'ListItem', position: 2, name: 'Reading Plans', item: `${SITE_URL}/grow?tab=plans` },
   ```

5. **ReadingPlanDetail.tsx (line 271):** Update onBrowsePlans:
   ```typescript
   onBrowsePlans={() => navigate('/grow?tab=plans')}
   ```

6. **ChallengeDetail.tsx (line 362):** Update back link:
   ```typescript
   to="/grow?tab=challenges"
   ```

7. **PlanNotFound.tsx (line 19):** Update:
   ```typescript
   to="/grow?tab=plans"
   ```

8. **ChallengeNotFound.tsx (line 19):** Update:
   ```typescript
   to="/grow?tab=challenges"
   ```

9. **ChallengeCompletionOverlay.tsx (line 116):** Update:
   ```typescript
   navigate('/grow?tab=challenges')
   ```

**Auth gating:** N/A -- link target changes only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT change links to detail pages (`/reading-plans/:planId`, `/challenges/:challengeId`) -- those stay as-is
- Do NOT change `ChallengeWidget` links to `/challenges/:challengeId` -- those are detail page links
- Do NOT change `ChallengeBanner` navigation to `/challenges/:challengeId` -- detail page link
- Do NOT change `MoodRecommendations` links to `/reading-plans/:planId` -- detail page link
- Do NOT change `PlanCard` links to `/reading-plans/:planId` -- detail page link

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Navbar links point to /grow routes | integration | Render Navbar, check link hrefs |
| Navbar challenge dot works with new URL | integration | Mock active challenge, verify dot on Challenges link |
| ReadingPlanWidget browse link points to /grow?tab=plans | integration | Render widget, check link href |
| ReadingPlanDetail back link navigates to /grow?tab=plans | integration | Render detail, check back link href |
| ChallengeDetail back link points to /grow?tab=challenges | integration | Render detail, check link href |
| PlanNotFound browse link points to /grow?tab=plans | integration | Render PlanNotFound, check link |
| ChallengeNotFound browse link points to /grow?tab=challenges | integration | Render ChallengeNotFound, check link |
| ChallengeCompletionOverlay navigates to /grow?tab=challenges | integration | Trigger browse, verify navigation |

**Expected state after completion:**
- [ ] All browser-route links updated to `/grow?tab=...`
- [ ] All detail-page links unchanged
- [ ] Navbar dot logic works with new URL
- [ ] SEO breadcrumbs use new URL

---

### Step 4: Update existing tests for route changes

**Objective:** Fix all existing tests that assert on old route targets or render standalone ReadingPlans/Challenges pages.

**Files to modify:**
- `frontend/src/pages/__tests__/ReadingPlans.test.tsx` -- update to test content component
- `frontend/src/pages/__tests__/ReadingPlans-create.test.tsx` -- update if needed
- `frontend/src/pages/__tests__/Challenges.test.tsx` -- update to test content component
- `frontend/src/pages/__tests__/ReadingPlanDetail.test.tsx` -- update link assertions
- `frontend/src/pages/__tests__/ChallengeDetail.test.tsx` -- update link assertions
- `frontend/src/components/challenges/__tests__/ChallengeCompletionOverlay.test.tsx` -- update navigation assertion
- `frontend/src/components/challenges/__tests__/ChallengeNotFound.test.tsx` (if exists) -- update link assertion
- `frontend/src/components/reading-plans/__tests__/PlanNotFound.test.tsx` (if exists) -- update link assertion
- `frontend/src/components/dashboard/__tests__/ReadingPlanWidget.test.tsx` -- update link assertion (line 27)
- `frontend/src/components/dashboard/__tests__/ChallengeWidget.test.tsx` -- update if it asserts browse links

**Details:**

1. **ReadingPlans.test.tsx:** Update `renderPage` to render `ReadingPlansContent` (or adjust import). Update `initialEntry` from `/reading-plans` to `/grow?tab=plans`. Verify all existing test assertions still pass with the content component.

2. **Challenges.test.tsx:** Same pattern -- update to test `ChallengesContent` or the full page via GrowPage. Update route entries.

3. **ReadingPlanDetail.test.tsx:** Update any assertions that check for `/reading-plans` in links/breadcrumbs to check for `/grow?tab=plans`.

4. **ChallengeDetail.test.tsx:** Update assertion for "Back to Challenges" link from `/challenges` to `/grow?tab=challenges`.

5. **ChallengeCompletionOverlay.test.tsx:** Update navigation assertion from `/challenges` to `/grow?tab=challenges`.

6. **ReadingPlanWidget.test.tsx:** Update assertion on line 27: `'Browse all plans'` link should point to `/grow?tab=plans`.

7. Run full test suite to catch any other broken assertions.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT delete existing test logic -- only update route strings and component references
- Do NOT reduce test coverage -- keep all existing assertions, just update expected values
- Do NOT skip running the full test suite -- route changes can cause subtle failures

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing ReadingPlans tests pass with updated routes | regression | Run ReadingPlans test file |
| All existing Challenges tests pass with updated routes | regression | Run Challenges test file |
| All existing detail page tests pass | regression | Run detail page test files |
| Full test suite passes | regression | `pnpm test` |

**Expected state after completion:**
- [ ] All existing tests pass with updated route assertions
- [ ] No reduction in test coverage
- [ ] Full `pnpm test` passes green

---

### Step 5: Write GrowPage tests

**Objective:** Comprehensive test suite for the new GrowPage component.

**Files to create:**
- `frontend/src/pages/__tests__/GrowPage.test.tsx` -- **create** new test file

**Details:**

Follow the test pattern from `ReadingPlans.test.tsx` and `DailyHub` tests:
- Mock `useAuth`, `useAuthModal`, `useFaithPoints` (same pattern as existing tests)
- Mock `getActiveChallengeInfo` from `@/lib/challenge-calendar`
- Wrap in `MemoryRouter` + `ToastProvider` + `AuthModalProvider`

Test cases (from Step 1 test specs + additional):

1. **Rendering:**
   - Renders hero with "Grow in Faith" title
   - Renders hero subtitle "Structured journeys to deepen your walk with God"
   - Renders two tab buttons: "Reading Plans" and "Challenges"

2. **Tab navigation:**
   - Defaults to Reading Plans tab when no tab param
   - Shows Reading Plans content for `?tab=plans`
   - Shows Challenges content for `?tab=challenges`
   - Invalid tab param defaults to Reading Plans
   - Tab click updates URL search params

3. **State preservation:**
   - Both tab panels are in the DOM (mounted, one hidden)

4. **Challenge notification dot:**
   - Shows pulsing dot on Challenges tab when `getActiveChallengeInfo` returns active challenge
   - No dot when `getActiveChallengeInfo` returns null

5. **CreatePlanFlow:**
   - `?create=true` with plans tab triggers CreatePlanFlow
   - `?create=true` with challenges tab does NOT trigger CreatePlanFlow

6. **Accessibility:**
   - Tab bar has `role="tablist"`
   - Active tab has `aria-selected="true"`
   - Inactive tab has `aria-selected="false"` and `tabIndex={-1}`
   - Tab panels have correct `role="tabpanel"` and `aria-labelledby`
   - Arrow key navigation moves focus between tabs

7. **Auth gating (inherited):**
   - Logged-out user can view both tabs (no auth modal on browse)

**Auth gating:** Tests verify inherited auth gates work.

**Responsive behavior:** N/A: no UI impact (test file).

**Guardrails (DO NOT):**
- Do NOT test internal behavior of ReadingPlansContent or ChallengesContent (those have their own tests)
- Do NOT mock more than necessary -- keep mocks minimal and focused

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ~15 test cases as described above | integration | Full GrowPage test suite |

**Expected state after completion:**
- [ ] GrowPage test file created with ~15 test cases
- [ ] All GrowPage tests pass
- [ ] Full `pnpm test` still passes

---

### Step 6: Cleanup and CLAUDE.md update

**Objective:** Remove standalone page wrappers that are no longer routed, update CLAUDE.md route table.

**Files to modify:**
- `frontend/src/pages/ReadingPlans.tsx` -- remove the `ReadingPlans` wrapper export (keep only `ReadingPlansContent`). Remove unused page-shell imports (Navbar, PageHero, SiteFooter, SEO).
- `frontend/src/pages/Challenges.tsx` -- same cleanup
- `frontend/src/App.tsx` -- remove lazy imports for standalone ReadingPlans/Challenges (they're now only used as content components imported by GrowPage)
- `CLAUDE.md` -- update route table

**Details:**

1. **ReadingPlans.tsx cleanup:**
   - The `ReadingPlans` wrapper (with Navbar/PageHero/SiteFooter) is no longer routed -- the redirect goes to `/grow` now
   - Remove the wrapper, keep only `ReadingPlansContent` export
   - Remove unused imports: `Navbar`, `PageHero`, `SiteFooter`, `SEO`

2. **Challenges.tsx cleanup:**
   - Same as above -- remove wrapper, keep `ChallengesContent`
   - Remove unused imports

3. **App.tsx cleanup:**
   - Remove the lazy import for standalone `ReadingPlans` (line 46)
   - Remove the lazy import for standalone `Challenges` (line 48)
   - The redirect routes use `Navigate` (inline) and `ReadingPlansRedirect` (inline)

4. **CLAUDE.md route table update:**
   ```
   | `/grow`           | `GrowPage`                     | Built  | Tabbed: Reading Plans | Challenges |
   | `/reading-plans`  | Redirect -> /grow?tab=plans    | Built  | Legacy redirect                   |
   | `/challenges`     | Redirect -> /grow?tab=challenges | Built | Legacy redirect                   |
   ```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT remove `ReadingPlanDetail` or `ChallengeDetail` -- those are standalone routes
- Do NOT remove component files in `components/reading-plans/` or `components/challenges/` -- they are still used
- Do NOT remove test files for the content components -- they still test the content logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite still passes after cleanup | regression | `pnpm test` |
| No unused imports flagged by linter | quality | `pnpm lint` |

**Expected state after completion:**
- [ ] ReadingPlans.tsx exports only content component
- [ ] Challenges.tsx exports only content component
- [ ] App.tsx has no unused lazy imports
- [ ] CLAUDE.md route table updated
- [ ] Full test suite passes
- [ ] Linter passes

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | -- | Create GrowPage + refactor ReadingPlans/Challenges to content components |
| 2 | 1 | Update routes and redirects in App.tsx |
| 3 | 1 | Update internal links (Navbar, widgets, detail pages) |
| 4 | 1, 2, 3 | Fix existing tests for route changes |
| 5 | 1 | Write new GrowPage tests |
| 6 | 1, 2, 3, 4, 5 | Cleanup and CLAUDE.md update |

Steps 2, 3, and 5 can run in parallel after Step 1.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create GrowPage + refactor content components | [COMPLETE] | 2026-03-25 | Created `GrowPage.tsx` with atmospheric hero, 2-tab bar (WAI-ARIA), challenge dot. Refactored `ReadingPlans.tsx` to export `ReadingPlansContent` (with `createParam` prop) + wrapper `ReadingPlans`. Refactored `Challenges.tsx` to export `ChallengesContent` + wrapper `Challenges`. All 26 existing tests pass. |
| 2 | Update routes and redirects | [COMPLETE] | 2026-03-25 | Added `/grow` route with lazy GrowPage. `/reading-plans` → `ReadingPlansRedirect` (preserves `?create=true`). `/challenges` → `Navigate` to `/grow?tab=challenges`. Removed unused lazy imports for standalone ReadingPlans/Challenges (pulled forward from Step 6 to fix TS error). |
| 3 | Update internal links | [COMPLETE] | 2026-03-25 | Updated NAV_LINKS in Navbar.tsx, challenge dot checks (2 occurrences). Updated ReadingPlanWidget (2 links), ReadingPlanDetail (breadcrumb + onBrowsePlans), ChallengeDetail (back link), PlanNotFound, ChallengeNotFound, ChallengeCompletionOverlay. |
| 4 | Update existing tests | [COMPLETE] | 2026-03-25 | Fixed `Navbar-challenges.test.tsx` href assertion from `/challenges` to `/grow?tab=challenges`. All other existing tests pass without changes (no href assertions on changed links). Full suite: 4308 pass, 1 pre-existing failure (useNotifications). |
| 5 | Write GrowPage tests | [COMPLETE] | 2026-03-25 | Created `GrowPage.test.tsx` with 19 test cases: rendering (3), tab navigation (5), state preservation (1), challenge dot (2), CreatePlanFlow (1), accessibility (6), auth gating (1). All pass. |
| 6 | Cleanup and CLAUDE.md update | [COMPLETE] | 2026-03-25 | Removed `ReadingPlans` wrapper export and unused imports (Navbar, PageHero, SEO, SiteFooter) from ReadingPlans.tsx. Same for `Challenges` wrapper in Challenges.tsx. Updated test imports to use `ReadingPlansContent`/`ChallengesContent`. Fixed 2 test assertions that checked for PageHero text. Updated CLAUDE.md route table with `/grow` route and legacy redirects. Full suite: 4309 pass, 0 lint errors. |
