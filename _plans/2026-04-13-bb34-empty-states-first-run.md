# Implementation Plan: BB-34 Empty States & First-Run Welcome

**Spec:** `_specs/bb34-empty-states-first-run.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old)
**Recon Report:** N/A — codebase-wide polish pass, no external page to recon
**Master Spec Plan:** N/A — standalone spec

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Components**: Feature-organized under `frontend/src/components/` (ui/, daily/, dashboard/, bible/, memorize/, friends/, leaderboard/, my-prayers/, homepage/, onboarding/ [to be created], etc.)
- **Pages**: `frontend/src/pages/` — route-level page components
- **Constants**: `frontend/src/constants/` — TypeScript constant exports
- **Services**: `frontend/src/services/` — storage services, onboarding storage
- **Tests**: Co-located `__tests__/` directories within each module. Vitest + React Testing Library.

### Existing FeatureEmptyState Component

`frontend/src/components/ui/FeatureEmptyState.tsx` — reusable empty state with:
- Props: `icon: LucideIcon`, `heading: string`, `description: string`, `ctaLabel?`, `ctaHref?`, `onCtaClick?`, `children?`, `compact?`, `className?`
- Icon: `h-10 w-10 text-white/30 sm:h-12 sm:w-12` with `aria-hidden="true"`
- Heading: `text-lg font-bold text-white/70`
- Description: `text-sm text-white/60`
- CTA (current): `rounded-lg bg-primary px-8 py-3 font-semibold text-white` — **does NOT match the spec's white pill CTA pattern**
- Container: `mx-auto max-w-sm flex-col items-center px-6 text-center`, `py-12` (default) or `py-6` (compact)
- 10 tests in `__tests__/FeatureEmptyState.test.tsx`

### Current FeatureEmptyState Consumers (13 files)

| File | Heading Text | Copy Compliant? | CTA? |
|------|-------------|-----------------|------|
| `pages/MyBiblePage.tsx` (line 278) | "Nothing here yet." | **NO** — not second-person, not specific | Yes → `/bible` |
| `pages/MyBiblePage.tsx` (line 293) | "No matches" | Acceptable (filter result) | Clear filters (custom child) |
| `pages/Insights.tsx` (line 253) | "Your story is just beginning" | YES | Yes → `/` |
| `pages/PrayerWall.tsx` (line 498) | "This space is for you" | YES | Yes (onClick) |
| `pages/PrayerWall.tsx` (line 515) | "No prayers in {category} yet" | Acceptable (filter result) | Yes (onClick) |
| `pages/ReadingPlans.tsx` (line 215) | "You've completed every plan!" | YES | Yes (onClick) |
| `components/daily/JournalTabContent.tsx` (line 360) | "Your journal is waiting" | YES | Yes (onClick) |
| `components/memorize/MemorizationDeck.tsx` (line 13) | "No memorization cards yet" | **BORDERLINE** — could be warmer | Yes → `/bible` |
| `components/leaderboard/FriendsLeaderboard.tsx` (line 51) | "Friendly accountability" | YES | Yes (onClick) |
| `components/friends/FriendList.tsx` (line 22) | "Faith grows stronger together" | YES | Yes (onClick) |
| `components/dashboard/ChallengeWidget.tsx` (line 162) | "Challenges bring us together" | YES | No |
| `components/bible/my-bible/EmptySearchResults.tsx` (line 14) | "No matches for \"{query}\"" | Acceptable (search result) | Clear search (custom) |
| `components/pwa/OfflineNotice.tsx` | (utility, not a feature empty state) | N/A | N/A |

### Non-FeatureEmptyState Empty States (custom implementations)

| File | Current Text | Compliant? | Uses FeatureEmptyState? |
|------|-------------|------------|------------------------|
| `components/my-prayers/PrayerListEmptyState.tsx` | "Your prayer list is waiting." | YES (copy) | NO — custom component, `bg-primary` CTA |
| `components/bible/plans/PlanBrowserEmptyState.tsx` | "No plans match these filters" / "No plans available yet" | **BORDERLINE** — first not warm, second OK | NO — custom, but CTA already uses white pill |
| `components/local-support/SearchStates.tsx` | "Enter your location to find..." / "We couldn't find any..." | YES (copy) | NO — custom inline |
| `components/bible/reader/CrossRefsSubView.tsx` (line 40) | "No cross-references for this verse." | Acceptable (factual) | NO — custom inline |
| `components/insights/MonthlyHighlights.tsx` (line 83) | "No data yet — start checking in to see your journey!" | **NO** — "No data yet" is generic | NO — inline paragraph |
| `components/bible/my-bible/ReadingHeatmap.tsx` (line 213) | "Your reading history will show up here as you read." | YES | NO — inline paragraph (BB-43, leave unchanged per spec) |
| `components/daily/SavedEntriesList.tsx` (line 152) | "No entries match your search" | Acceptable (search result) | NO — inline paragraph |
| `pages/Challenges.tsx` (line 257) | "New challenges are coming soon. Check back during the next season." | YES | NO — inline paragraph |
| `pages/PrayerWallProfile.tsx` (line 247) | "No prayers shared yet." | **BORDERLINE** — could be warmer | NO — inline text |

### Routing & Onboarding Context

- `App.tsx` line 151-152: `RootRoute` renders `Dashboard` (authenticated) or `Home` (logged out)
- `Dashboard.tsx` uses a `DashboardPhase` state machine: `onboarding → welcome_back → check_in → recommendations → dashboard_enter → dashboard`
- Existing `WelcomeWizard` (4-screen wizard) fires during the `onboarding` phase for logged-in users who haven't completed `wr_onboarding_complete`
- Existing `GettingStartedCard` (6-item checklist) shows on dashboard after wizard completes
- `wr_onboarding_complete` is managed by `services/onboarding-storage.ts`
- The new `FirstRunWelcome` targets a DIFFERENT audience: brand-new visitors (logged-in or out) who have never visited the site before. It fires on the Home page OR Dashboard based on auth state.
- `StartingPointQuiz` exists at `components/StartingPointQuiz.tsx`, mounted in `Home.tsx` with `id="quiz"` — the "Take the starting point quiz" option can link to `/#quiz`

### Test Patterns

- Vitest + React Testing Library
- `MemoryRouter` wrapper for routing
- `vi.fn()` for click handlers
- `screen.getByRole`, `screen.getByText`, `screen.queryByRole` assertions
- Co-located `__tests__/` directories
- Existing test: `FeatureEmptyState.test.tsx` (10 tests) wraps with `MemoryRouter`

---

## Auth Gating Checklist

**Zero new auth gates per spec.** Empty states and FirstRunWelcome are visible to all users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View empty states | No auth gate | All steps | None needed |
| Click empty state CTA | No auth gate (target pages have their own gates) | All steps | None needed |
| View first-run welcome | No auth gate | Step 5 | None needed |
| Dismiss first-run welcome | No auth gate | Step 4-5 | None needed |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| FeatureEmptyState icon | size/color | `h-10 w-10 text-white/30 sm:h-12 sm:w-12` | FeatureEmptyState.tsx (unchanged) |
| FeatureEmptyState heading | font | `text-lg font-bold text-white/70` | FeatureEmptyState.tsx (unchanged) |
| FeatureEmptyState description | font | `text-sm text-white/60` | FeatureEmptyState.tsx (unchanged) |
| FeatureEmptyState CTA (NEW) | style | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100` | 09-design-system.md § White Pill CTA Patterns (Pattern 1: inline) |
| FrostedCard | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` | 09-design-system.md + design-system.md |
| FrostedCard shadow | box-shadow | `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | 09-design-system.md |
| animate-fade-in-up | animation | `fade-in-up 250ms cubic-bezier(0, 0, 0.2, 1) both` | tailwind.config.js line 347 (BB-33) |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font has been deprecated for headings — used only for the logo.
- All Daily Hub tab content components use `max-w-2xl` container width with the padding pattern `mx-auto max-w-2xl px-4 py-10 sm:py-14`. They have transparent backgrounds — the Daily Hub HorizonGlow layer shows through.
- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. Do NOT add `GlowBackground` to Daily Hub components. GlowBackground is still used by the homepage.
- Frosted glass cards: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow. Use the `FrostedCard` component, not a hand-rolled card.
- White pill CTA patterns: Pattern 1 (inline, smaller, used inside cards) and Pattern 2 (homepage primary, larger with white drop shadow). See `09-design-system.md` § "White Pill CTA Patterns" for the canonical class strings. **BB-34 uses Pattern 1 for FeatureEmptyState CTAs** (smaller, inside content blocks).
- `animate-fade-in-up` from BB-33: `fade-in-up 250ms cubic-bezier(0, 0, 0.2, 1) both` — use for FirstRunWelcome entrance. Guard with `motion-safe:` prefix.
- No GlowBackground on empty states — they inherit whatever background the parent page provides.
- BB-33 standardized `active:scale-[0.98]` on primary action buttons. Include on the FeatureEmptyState CTA and FirstRunWelcome CTAs.
- BB-33 standardized focus-visible: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` for white pill buttons on dark backgrounds. Note: FeatureEmptyState CTA uses `text-primary` on white bg, so use `focus-visible:ring-primary/50 focus-visible:ring-offset-hero-bg`.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_first_run_completed` | Write (on dismiss/click) / Read (on mount to gate visibility) | Timestamp string — gates FirstRunWelcome appearance |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | FeatureEmptyState: full-width centered, icon h-10 w-10. FirstRunWelcome: full-width with `mx-4` margins, "start here" options stack vertically. |
| Tablet | 768px | FeatureEmptyState: same centered layout. FirstRunWelcome: `max-w-md mx-auto`, "start here" options in 2-column grid. |
| Desktop | 1440px | FeatureEmptyState: centered within page content area. FirstRunWelcome: `max-w-[480px] mx-auto`, "start here" options in 2-column grid. |

---

## Inline Element Position Expectations (UI features with inline rows)

N/A — no inline-row layouts in this feature. FeatureEmptyState is a centered vertical stack. FirstRunWelcome "start here" options are a grid, not inline chips.

---

## Vertical Rhythm

N/A — BB-34 modifies existing empty states in-place (inheriting existing page spacing) and adds an overlay card (FirstRunWelcome) that floats over existing content. No new section spacing to verify.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-33 animations spec is committed (provides `animate-fade-in-up`)
- [ ] All BB-30 through BB-46 tests pass on current branch
- [ ] `FeatureEmptyState` has 10 passing tests (baseline before modification)
- [ ] All auth-gated actions from the spec are accounted for in the plan (zero — confirmed)
- [ ] Design system values are verified (from recon + codebase inspection)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] No deprecated patterns used (confirmed — no Caveat headings, no GlowBackground on Daily Hub, no animate-glow-pulse, no cyan borders, no italic Lora prompts, no soft-shadow 8px-radius cards)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FirstRunWelcome on Home vs Dashboard | Show on Home (logged-out) and Dashboard (logged-in) but NOT on deep-linked routes | Spec requirement #13: deep links must show the content, not the welcome |
| Deep-link detection | Check `window.location.pathname !== '/'` — if not root, skip welcome | Root (`/`) is the only route that shows Home or Dashboard; any other path is a deep link |
| Coordination with WelcomeWizard | FirstRunWelcome fires BEFORE WelcomeWizard | FirstRunWelcome uses `wr_first_run_completed`, WelcomeWizard uses `wr_onboarding_complete`. They are independent. A logged-in user on first visit sees FirstRunWelcome (overlay); after dismissing, Dashboard's phase machine takes over (potentially showing WelcomeWizard if `wr_onboarding_complete` is not set). |
| "Start here" options | 4 options: Read the Bible → `/bible`, Try a daily devotional → `/daily`, Take the starting point quiz → `/#quiz`, Browse reading plans → `/grow?tab=plans` | StartingPointQuiz confirmed present in codebase; `/grow?tab=plans` is the correct route for plans (not `/bible/plans` which is the Bible-redesign plan browser) |
| FeatureEmptyState CTA migration | White pill inline CTA (Pattern 1) replaces purple `bg-primary` | Spec requirement #5. Pattern 1 is the correct choice — CTAs are inside content blocks, not the primary action of a screen |
| PrayerListEmptyState custom component | Migrate to use FeatureEmptyState | Reduces duplication and standardizes. The `Plus` icon in the CTA button is the only unique element — can be handled by extending FeatureEmptyState's CTA or accepting the simpler "Add Prayer" text without icon |
| PlanBrowserEmptyState | Leave as-is — already uses white pill CTA | Copy is borderline but functional for filter/empty-manifest states. The "all-started" variant is already warm. No changes unless audit finds a real issue. |
| SearchStates (Local Support) | Leave as-is — already warm and contextual | These are search-prompt/no-results states, not feature empty states. Copy is warm and specific. |
| CrossRefsSubView EmptyState | Leave as-is — factual and appropriate | "No cross-references for this verse" is accurate, not generic. No CTA needed. |
| ReadingHeatmap (BB-43) / MemorizationDeck (BB-45) | Verify compliance, leave unchanged unless real issue found | Spec says "verified to match the standard but left unchanged unless the audit finds a real issue." ReadingHeatmap is already warm. MemorizationDeck copy is borderline — "No memorization cards yet" could be warmer but is specific and actionable. |
| MonthlyHighlights | Fix "No data yet" to warm copy | "No data yet" is generic. Replace with warm, second-person text. |
| PrayerWallProfile | Fix "No prayers shared yet" to warm copy | "No prayers shared yet" is borderline — third-person phrasing. |

---

## Implementation Steps

### Step 1: Empty State Audit Document

**Objective:** Produce a complete audit of every empty state in the app before any code changes.

**Files to create:**
- `_plans/recon/bb34-empty-states.md` — audit document

**Details:**

Run a systematic audit of every route in `App.tsx`, every tab in the Daily Hub, every list-rendering component, and every filter/search/sort affordance that can produce zero results. For each empty state, document:
- Page/feature name
- Route or component path (file:line)
- The empty condition (when does this show?)
- Current behavior (copy text, CTA, component used)
- Standard compliance (warm? second-person? anti-pressure? specific?)
- Action required (none / update copy / migrate to FeatureEmptyState / update CTA)

The audit covers at minimum the surfaces listed in the spec's "Preliminary Empty States Inventory" (high/medium/low priority). Discover any surfaces the spec missed.

**Auth gating:** N/A — audit document only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT modify any source files in this step — audit only
- Do NOT skip any route or tab
- Do NOT assume compliance without reading the actual code

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Audit is a document, not code |

**Expected state after completion:**
- [ ] `_plans/recon/bb34-empty-states.md` exists with every empty state cataloged
- [ ] Each entry has: page name, file path, empty condition, current behavior, compliance assessment, action required
- [ ] Zero source files modified

---

### Step 2: Update FeatureEmptyState CTA to White Pill Pattern

**Objective:** Migrate the `FeatureEmptyState` CTA from `bg-primary rounded-lg` to the inline white pill CTA pattern (Pattern 1 from `09-design-system.md`).

**Files to modify:**
- `frontend/src/components/ui/FeatureEmptyState.tsx` — update CTA class strings
- `frontend/src/components/ui/__tests__/FeatureEmptyState.test.tsx` — update assertions that check class names

**Details:**

Replace the CTA `<Link>` and `<button>` class strings in `FeatureEmptyState.tsx`:

**Current (both Link and button):**
```
inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400
```

**New (Pattern 1 — inline white pill):**
```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

Also remove the ` →` arrow appended to `{ctaLabel}` in both the Link and button — the white pill CTA pattern does not include a trailing arrow.

Update the test file: the existing test "CTA has focus-visible ring" checks for `focus-visible:ring-purple-400` — update to `focus-visible:ring-primary/50`. The test "CTA has min-height 44px" continues to pass unchanged.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): CTA centered within `max-w-sm` container, no change
- Tablet (768px): Same
- Mobile (375px): Same — `min-h-[44px]` ensures 44px touch target

**Guardrails (DO NOT):**
- Do NOT change the component's layout structure (vertical centering, max-w-sm, padding)
- Do NOT change the icon, heading, or description styling
- Do NOT change the `compact` prop behavior
- Do NOT use Pattern 2 (homepage primary CTA) — Pattern 1 (inline) is correct for CTAs inside content blocks
- Do NOT use `animate-glow-pulse`, cyan borders, or `rounded-lg bg-primary` (deprecated for empty state CTAs)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CTA has white pill styling | unit | Verify Link/button has `rounded-full bg-white text-primary` classes |
| CTA has focus-visible ring | unit | Verify `focus-visible:ring-primary/50` (update existing test) |
| CTA has min-height 44px | unit | Existing test — passes unchanged |
| CTA has active scale | unit | Verify `active:scale-[0.98]` class |
| Arrow removed from CTA | unit | Verify CTA text does not contain `→` |

**Expected state after completion:**
- [ ] FeatureEmptyState CTA renders as white pill (Pattern 1)
- [ ] All 13 consumers automatically get the new CTA style
- [ ] All FeatureEmptyState tests pass
- [ ] Build passes

---

### Step 3: Empty State Copy Standardization

**Objective:** Update non-compliant empty state copy across the app to meet the warm, second-person, anti-pressure rules. Migrate custom empty states to `FeatureEmptyState` where appropriate.

**Files to modify (based on audit findings — exact list from Step 1):**
- `frontend/src/pages/MyBiblePage.tsx` — update "Nothing here yet." heading
- `frontend/src/components/memorize/MemorizationDeck.tsx` — warm up "No memorization cards yet"
- `frontend/src/components/insights/MonthlyHighlights.tsx` — fix "No data yet" text
- `frontend/src/pages/PrayerWallProfile.tsx` — fix "No prayers shared yet."
- `frontend/src/components/my-prayers/PrayerListEmptyState.tsx` — migrate to use `FeatureEmptyState`
- `frontend/src/pages/MyPrayers.tsx` — update import after PrayerListEmptyState migration

**Details:**

**MyBiblePage.tsx line 278:**
- Current: `heading="Nothing here yet."` / `description="Tap a verse in the reader and choose Highlight, Bookmark, or Note. They'll show up here."`
- New: `heading="Your Bible highlights will show up here"` / `description="Tap any verse in the reader to highlight, bookmark, or add a note. They'll all be collected here for you."`
- Rationale: "Nothing here yet" is generic. New copy is second-person, specific, and warm.

**MemorizationDeck.tsx line 13:**
- Current: `heading="No memorization cards yet"` / `description="Tap the memorize action on any verse in the Bible reader to start your deck."`
- New: `heading="Your memorization deck is ready"` / `description="Tap the memorize action on any verse in the Bible reader, and it'll appear here as a flip card."`
- Rationale: "No X yet" pattern is borderline. "Your X is ready" is warmer and implies the feature is waiting for them, not that they're missing something.

**MonthlyHighlights.tsx line 83:**
- Current: `"No data yet — start checking in to see your journey!"`
- New: `"Your highlights will appear here once you've been checking in for a while."`
- Rationale: "No data yet" is generic system language. New copy is warm, second-person, no pressure ("once you've been checking in for a while" is gentler than "start checking in").

**PrayerWallProfile.tsx line 247:**
- Current: `"No prayers shared yet."`
- New: `"This person hasn't shared any prayers yet."`
- Rationale: Third-person is appropriate here (viewing someone else's profile), but making it warmer.

**PrayerListEmptyState.tsx → migrate to FeatureEmptyState:**
- Replace the custom component with a usage of `FeatureEmptyState`
- Preserve the `onAddPrayer` callback via `onCtaClick`
- Copy is already warm ("Your prayer list is waiting.") — keep the heading/description
- Update heading to use `FeatureEmptyState` h3 (was custom h2) — this is a minor heading level change but keeps hierarchy consistent
- Remove the `Plus` icon from the CTA text (FeatureEmptyState CTA is text-only). CTA text: "Add a prayer"
- Update `MyPrayers.tsx` import

**Auth gating:** N/A.

**Responsive behavior:** N/A: copy changes only, no layout changes.

**Guardrails (DO NOT):**
- Do NOT change empty states that already comply with the standard (verified in Step 1 audit)
- Do NOT change BB-43 ReadingHeatmap or BB-45 MemorizationDeck beyond copy fixes (spec says leave unchanged unless real issue found — the MemorizationDeck copy IS a real issue per the audit)
- Do NOT change filter/search zero-results states ("No matches for X") — these are contextual, not feature empty states
- Do NOT change seeded content or populated state copy
- Do NOT change the Challenges empty state or ChallengeWidget empty state (both already warm)
- Do NOT introduce "start your journey today!" or "begin your streak!" pressure language
- Do NOT add CTAs to empty states that don't need them (e.g., ReadingHeatmap "Your reading history will show up here as you read" is complete without a CTA)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| MyBiblePage empty state renders warm copy | unit | Verify "Your Bible highlights will show up here" text |
| MemorizationDeck empty state renders warm copy | unit | Verify "Your memorization deck is ready" text |
| MonthlyHighlights empty state renders warm copy | unit | Verify "Your highlights will appear here" text |
| PrayerListEmptyState renders via FeatureEmptyState | unit | Verify FeatureEmptyState is used, CTA fires onAddPrayer |

**Expected state after completion:**
- [ ] All non-compliant empty state copy is updated to warm, second-person, anti-pressure text
- [ ] PrayerListEmptyState migrated to use FeatureEmptyState
- [ ] No empty state text contains "No data", "Nothing here", or impersonal phrasing
- [ ] All existing tests pass (update assertions as needed)
- [ ] Build passes

---

### Step 4: FirstRunWelcome Component

**Objective:** Build the `FirstRunWelcome` component — a single-screen overlay card with greeting, description, "start here" options, and dismiss.

**Files to create:**
- `frontend/src/components/onboarding/FirstRunWelcome.tsx` — component
- `frontend/src/components/onboarding/__tests__/FirstRunWelcome.test.tsx` — tests

**Details:**

**Component interface:**
```typescript
interface FirstRunWelcomeProps {
  onDismiss: () => void
}
```

**Structure:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
     role="dialog"
     aria-modal="true"
     aria-label="Welcome to Worship Room"
>
  <div className={cn(
    'relative w-full max-w-[480px] p-6 sm:p-8',
    'bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl',
    'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
    'motion-safe:animate-fade-in-up',
  )}>
    {/* Heading */}
    <h2 className="text-2xl font-bold text-white sm:text-3xl">Welcome to Worship Room</h2>

    {/* Description */}
    <p className="mt-3 text-base text-white/80 leading-relaxed">
      A quiet place to read Scripture, pray, journal, and find peace —
      at your own pace, whenever you need it.
    </p>

    {/* Start here options — 2-column grid on sm+, stacked on mobile */}
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StartHereCard icon={BookOpen} label="Read the Bible" to="/bible" onNavigate={handleNavigate} />
      <StartHereCard icon={Sun} label="Try a daily devotional" to="/daily" onNavigate={handleNavigate} />
      <StartHereCard icon={HelpCircle} label="Take the starting quiz" to="/#quiz" onNavigate={handleNavigate} />
      <StartHereCard icon={ListChecks} label="Browse reading plans" to="/grow?tab=plans" onNavigate={handleNavigate} />
    </div>

    {/* Dismiss link */}
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={handleDismiss}
        className="text-sm text-white/50 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
      >
        Maybe later
      </button>
    </div>
  </div>
</div>
```

**StartHereCard** (local sub-component, not exported):
```tsx
function StartHereCard({ icon: Icon, label, to, onNavigate }: {
  icon: LucideIcon; label: string; to: string; onNavigate: (to: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3',
        'min-h-[44px] text-left text-sm font-medium text-white',
        'transition-colors hover:bg-white/[0.08]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
        'active:scale-[0.98]',
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary-lt" aria-hidden="true" />
      {label}
    </button>
  )
}
```

**Behavior:**
- `handleNavigate(to)`: calls `onDismiss()` then uses `navigate(to)` (from `useNavigate()`) — except for `/#quiz` which uses `window.location.href = '/#quiz'` to trigger scroll-to anchor on the home page
- `handleDismiss()`: calls `onDismiss()` (parent sets localStorage and unmounts)
- Escape key: `useEffect` with `keydown` listener calls `handleDismiss()` on Escape
- The component is NOT a gate — the page behind the overlay is fully rendered and accessible (the overlay has `bg-black/60` backdrop but the page scrolls underneath)
- `prefers-reduced-motion`: `motion-safe:animate-fade-in-up` is the only animation; users with reduced motion preference see instant appearance

**Auth gating:** None.

**Responsive behavior:**
- Desktop (1440px): `max-w-[480px] mx-auto`, 2-column grid
- Tablet (768px): `max-w-md mx-auto` (sm breakpoint), 2-column grid
- Mobile (375px): full-width with `px-4` margins, single-column stacked options

**Guardrails (DO NOT):**
- Do NOT use `FrostedCard` component here — the welcome card has custom sizing (`max-w-[480px]`) and the FrostedCard component adds `p-6` which conflicts with the custom `p-6 sm:p-8` padding. Use the raw frosted glass classes directly.
- Do NOT add GlowBackground inside the welcome card
- Do NOT add animated illustrations or Lottie files
- Do NOT add a progress indicator or checklist
- Do NOT use Caveat font
- Do NOT add sound effects to the welcome
- Do NOT use `useFocusTrap` — the welcome is NOT a blocking modal (spec: "The welcome is NOT a gate — the home page or Dashboard is fully accessible behind it"). Focus trap would prevent interaction with the page behind it.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders heading "Welcome to Worship Room" | unit | `screen.getByText('Welcome to Worship Room')` |
| Renders description text | unit | Verify description paragraph |
| Renders 4 start-here options | unit | 4 buttons: "Read the Bible", "Try a daily devotional", "Take the starting quiz", "Browse reading plans" |
| Clicking start-here option calls onDismiss | unit | Click "Read the Bible" → `onDismiss` called |
| Clicking "Maybe later" calls onDismiss | unit | Click "Maybe later" → `onDismiss` called |
| Escape key calls onDismiss | unit | Fire keydown Escape → `onDismiss` called |
| Has role="dialog" and aria-modal="true" | unit | Accessibility check |
| Has aria-label | unit | Verify `aria-label="Welcome to Worship Room"` |
| Uses frosted glass classes | unit | Check for `bg-white/[0.06]`, `backdrop-blur-sm` |
| Motion-safe animation class | unit | Check for `motion-safe:animate-fade-in-up` |
| Start-here cards have min-h-[44px] | unit | Touch target verification |
| Maybe later has focus-visible ring | unit | `focus-visible:ring-2` on dismiss button |

**Expected state after completion:**
- [ ] `FirstRunWelcome.tsx` created at `frontend/src/components/onboarding/FirstRunWelcome.tsx`
- [ ] 12 tests passing in `FirstRunWelcome.test.tsx`
- [ ] Component renders correctly in isolation (no page integration yet)
- [ ] Build passes

---

### Step 5: Integrate FirstRunWelcome into Home and Dashboard

**Objective:** Wire `FirstRunWelcome` into the Home page (logged-out) and Dashboard (logged-in) with `wr_first_run_completed` localStorage gating.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — add FirstRunWelcome overlay for logged-out first-time visitors
- `frontend/src/pages/Dashboard.tsx` — add FirstRunWelcome overlay for logged-in first-time visitors

**Files to create:**
- `frontend/src/hooks/useFirstRun.ts` — shared hook for first-run detection + dismissal
- `frontend/src/hooks/__tests__/useFirstRun.test.ts` — tests for the hook

**Details:**

**useFirstRun hook:**
```typescript
const FIRST_RUN_KEY = 'wr_first_run_completed'

export function useFirstRun(): { isFirstRun: boolean; dismissFirstRun: () => void } {
  const [isFirstRun, setIsFirstRun] = useState(() => {
    try {
      return localStorage.getItem(FIRST_RUN_KEY) === null
    } catch {
      return false // localStorage unavailable — don't show welcome
    }
  })

  const dismissFirstRun = useCallback(() => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, String(Date.now()))
    } catch {
      // localStorage unavailable — welcome will show again next visit (acceptable)
    }
    setIsFirstRun(false)
  }, [])

  return { isFirstRun, dismissFirstRun }
}
```

**Home.tsx integration (logged-out users):**
```tsx
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome'
import { useFirstRun } from '@/hooks/useFirstRun'

export function Home() {
  const { isFirstRun, dismissFirstRun } = useFirstRun()
  // ... existing code ...

  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      {/* ... existing SEO, skip-to-content, Navbar, main ... */}
      {isFirstRun && <FirstRunWelcome onDismiss={dismissFirstRun} />}
    </div>
  )
}
```

**Dashboard.tsx integration (logged-in users):**

The Dashboard has a phase state machine. FirstRunWelcome is independent of the phase machine — it overlays on top of whatever phase is active.

```tsx
import { FirstRunWelcome } from '@/components/onboarding/FirstRunWelcome'
import { useFirstRun } from '@/hooks/useFirstRun'

export function Dashboard() {
  const { isFirstRun, dismissFirstRun } = useFirstRun()
  // ... existing code ...

  return (
    <>
      {/* ... existing dashboard rendering ... */}
      {isFirstRun && <FirstRunWelcome onDismiss={dismissFirstRun} />}
    </>
  )
}
```

**Deep-link protection:**
The FirstRunWelcome appears ONLY on `/` (which renders Home or Dashboard via `RootRoute`). Deep links (e.g., `/bible/john/3?verse=16`, `/daily?tab=pray`) render their own page components that do NOT mount FirstRunWelcome. No deep-link detection code is needed — the welcome is simply not rendered on non-root routes.

**Auth gating:** None — both Home (logged-out) and Dashboard (logged-in) show the welcome.

**Responsive behavior:**
- Desktop (1440px): Welcome card centered, page visible behind backdrop
- Tablet (768px): Welcome card centered, `max-w-md`
- Mobile (375px): Welcome card nearly full-width, `mx-4` from viewport edges

**Guardrails (DO NOT):**
- Do NOT add FirstRunWelcome to any route other than `/` (Home/Dashboard)
- Do NOT make FirstRunWelcome a blocking gate — the page behind it must be fully rendered
- Do NOT clear `wr_first_run_completed` on logout (it's a UI preference, not user data)
- Do NOT integrate with the Dashboard phase machine — the welcome is independent
- Do NOT add the welcome to DailyHub, BibleLanding, or any other page

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| useFirstRun: returns true when key is absent | unit | Clear localStorage → `isFirstRun === true` |
| useFirstRun: returns false when key is present | unit | Set key → `isFirstRun === false` |
| useFirstRun: dismissFirstRun sets key | unit | Call dismiss → `localStorage.getItem(key)` is a timestamp |
| useFirstRun: dismissFirstRun updates state | unit | Call dismiss → `isFirstRun === false` |
| Home shows FirstRunWelcome on first visit | integration | Render Home with empty localStorage → welcome visible |
| Home hides FirstRunWelcome after dismiss | integration | Click "Maybe later" → welcome disappears |
| Home hides FirstRunWelcome on return visit | integration | Set key → render Home → welcome not visible |
| Dashboard shows FirstRunWelcome on first visit | integration | Render Dashboard with auth + empty localStorage → welcome visible |

**Expected state after completion:**
- [ ] `useFirstRun.ts` hook created with 4 unit tests
- [ ] Home.tsx renders FirstRunWelcome for first-time visitors
- [ ] Dashboard.tsx renders FirstRunWelcome for first-time logged-in visitors
- [ ] Deep-linked routes do NOT show welcome
- [ ] Dismissing welcome sets `wr_first_run_completed` localStorage key
- [ ] Welcome does not reappear after dismissal
- [ ] Build passes, all tests pass

---

### Step 6: Document localStorage Key

**Objective:** Add `wr_first_run_completed` to the localStorage key inventory.

**Files to modify:**
- `.claude/rules/11-local-storage-keys.md` — add new key

**Details:**

Add to the "Dashboard & UI State" section of `11-local-storage-keys.md`:

```markdown
| `wr_first_run_completed` | timestamp string | FirstRunWelcome completion (BB-34) — when set, welcome overlay never shows again |
```

**Auth gating:** N/A — documentation only.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- Do NOT add to Auth Keys section (this key is NOT cleared on logout)
- Do NOT add multiple keys — the spec requires exactly one new key

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Documentation change only |

**Expected state after completion:**
- [ ] `wr_first_run_completed` documented in `11-local-storage-keys.md`
- [ ] Key documented under "Dashboard & UI State" section

---

### Step 7: Empty State Rendering Tests

**Objective:** Add component tests covering empty state rendering across representative pages, as required by the spec (20+ tests).

**Files to create/modify:**
- `frontend/src/pages/__tests__/empty-states.test.tsx` — new test file for page-level empty state rendering
- Various existing test files updated as needed from Steps 2-3

**Details:**

Create a comprehensive test file that verifies empty state rendering across representative surfaces. Each test renders a component/page with empty data and asserts:
1. FeatureEmptyState is used (check for the component's characteristic classes or heading text)
2. Copy matches the warm, second-person standard (no "No data", no generic text)
3. CTA (if present) uses white pill styling
4. Icon has `aria-hidden="true"`

**Representative surfaces to test (covering all categories from the spec):**

| Surface | Component | Empty Condition | Expected Heading |
|---------|-----------|----------------|------------------|
| My Bible feed | MyBiblePage | No highlights/notes/bookmarks | "Your Bible highlights will show up here" |
| My Bible filtered | MyBiblePage (filtered) | Filter returns zero | "No matches" (acceptable) |
| Journal saved entries | JournalTabContent | No saved entries, authenticated | "Your journal is waiting" |
| Friends list | FriendList | Empty friends array | "Faith grows stronger together" |
| Leaderboard | FriendsLeaderboard | Empty friends array | "Friendly accountability" |
| Prayer Wall | PrayerWall | Empty feed | "This space is for you" |
| Insights | Insights | <2 mood entries | "Your story is just beginning" |
| Reading Plans | ReadingPlans | All completed | "You've completed every plan!" |
| Challenge Widget | ChallengeWidget | No challenges | "Challenges bring us together" |
| My Prayers | MyPrayers | Empty list | "Your prayer list is waiting." |
| Memorization Deck | MemorizationDeck | No cards | "Your memorization deck is ready" |

Each test needs provider wrapping appropriate for the component (MemoryRouter, AuthModalProvider if needed).

The tests from Steps 2-4 plus this file should total at least 20 empty state rendering tests and 12 FirstRunWelcome tests.

**Auth gating:** N/A.

**Responsive behavior:** N/A: tests, not UI.

**Guardrails (DO NOT):**
- Do NOT test components that require complex provider setups beyond MemoryRouter + basic context unless they already have test infrastructure
- Do NOT test BB-43 ReadingHeatmap or BB-45 MemorizationDeck internal empty states beyond verifying BB-34's copy changes
- Do NOT test search/filter zero-result states (those are contextual, not the focus of BB-34)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 11+ empty state rendering tests | unit/integration | Verify warm copy + FeatureEmptyState usage across representative surfaces |
| Each test checks heading text | unit | Warm, second-person, specific heading |
| Each test checks CTA style (if CTA present) | unit | White pill classes OR no CTA |
| Each test checks icon aria-hidden | unit | `aria-hidden="true"` on SVG |

**Expected state after completion:**
- [ ] 20+ empty state rendering tests across representative pages (sum of Steps 2-4 + this file)
- [ ] All tests pass
- [ ] Build passes

---

### Step 8: Final Verification Sweep

**Objective:** Run a repo-wide sweep confirming zero empty states with generic "No data" text, run build + test suite, and verify Lighthouse does not regress.

**Files to modify:** None (verification only). Fix any issues found.

**Details:**

1. **Grep sweep:** Search the entire `frontend/src/` directory for patterns like `"No data"`, `"Nothing here"`, `"No results"` (excluding search/filter contexts), and any other generic empty-state text. The sweep should confirm zero instances of generic text in feature empty states.

2. **Build:** `pnpm build` — must pass with zero errors, zero warnings.

3. **Test suite:** `pnpm test` — all existing tests plus new BB-34 tests must pass. Verify the total test count has increased by the expected amount (approximately 30-35 new tests).

4. **TypeScript:** Zero new TS errors.

5. **Lint:** `pnpm lint` — no new warnings.

6. **Audit document commit:** Verify `_plans/recon/bb34-empty-states.md` is tracked and will be committed.

**Auth gating:** N/A.

**Responsive behavior:** N/A: verification only.

**Guardrails (DO NOT):**
- Do NOT skip the grep sweep (BB-33 process lesson: a final sweep catches stragglers)
- Do NOT skip the build verification
- Do NOT modify code in this step unless the sweep reveals a genuine issue

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | integration | `pnpm build` — 0 errors |
| All tests pass | integration | `pnpm test` — 0 failures |
| Grep sweep clean | manual | Zero generic empty state text in feature components |

**Expected state after completion:**
- [ ] Zero generic "No data" text in feature empty states
- [ ] Build passes
- [ ] All tests pass (existing + new)
- [ ] Zero TS errors, no new lint warnings
- [ ] Audit document committed
- [ ] BB-34 is complete

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Empty state audit document |
| 2 | — | FeatureEmptyState CTA migration to white pill |
| 3 | 1, 2 | Copy standardization (uses audit findings, relies on new CTA style) |
| 4 | 2 | FirstRunWelcome component (uses same CTA patterns) |
| 5 | 4 | Integrate FirstRunWelcome into Home + Dashboard |
| 6 | 5 | Document localStorage key |
| 7 | 2, 3, 4, 5 | Empty state rendering tests |
| 8 | 1, 2, 3, 4, 5, 6, 7 | Final verification sweep |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Empty State Audit Document | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb34-empty-states.md` — 28 empty states cataloged across 24 files. 4 copy fixes, 1 migration, 11 CTA style fixes (via Step 2). 17 already compliant. |
| 2 | FeatureEmptyState CTA to White Pill | [COMPLETE] | 2026-04-13 | Updated CTA classes to Pattern 1 white pill (rounded-full bg-white text-primary), removed → arrows, updated focus ring to ring-primary/50, added active:scale-[0.98]. 14 tests pass (3 new: white pill, active scale, arrow removal). |
| 3 | Copy Standardization | [COMPLETE] | 2026-04-13 | Updated 4 copy strings (MyBiblePage, MemorizationDeck, MonthlyHighlights, PrayerWallProfile). Migrated PrayerListEmptyState to FeatureEmptyState. Updated 2 test assertions. All tests pass. |
| 4 | FirstRunWelcome Component | [COMPLETE] | 2026-04-13 | Created `components/onboarding/FirstRunWelcome.tsx` + 12 tests. Frosted glass card, 4 start-here options, Escape dismiss, a11y attrs, motion-safe animation. |
| 5 | Integrate FirstRunWelcome | [COMPLETE] | 2026-04-13 | Created `useFirstRun.ts` hook (4 tests). Integrated into Home.tsx and Dashboard.tsx. Deep-linked routes unaffected (welcome only renders on `/`). Build passes (3174 modules). |
| 6 | Document localStorage Key | [COMPLETE] | 2026-04-13 | Added `wr_first_run_completed` to Dashboard & UI State section of 11-local-storage-keys.md. |
| 7 | Empty State Rendering Tests | [COMPLETE] | 2026-04-13 | Created `pages/__tests__/empty-states.test.tsx` with 15 tests. Total BB-34 tests: 45 (14 FeatureEmptyState + 12 FirstRunWelcome + 4 useFirstRun + 15 empty-states). All pass. |
| 8 | Final Verification Sweep | [COMPLETE] | 2026-04-13 | Grep sweep: zero "No data"/"Nothing here" in source. Build: 3174 modules, passes. Lint: zero issues in BB-34 files. Fixed 2 additional test assertions in MyBiblePage.test.tsx and MyBiblePageHeatmap.test.tsx that referenced old copy. All BB-34 tests pass. Pre-existing failures unchanged (8 files). |
