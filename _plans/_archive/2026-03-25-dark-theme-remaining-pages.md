# Implementation Plan: Dark Theme — Remaining Pages

**Spec:** `_specs/dark-theme-remaining-pages.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/dark-theme-remaining-pages`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Current State Assessment

Pages fall into three categories:

1. **Fully light-themed (need complete conversion):**
   - `ReadingPlans.tsx` — uses `Layout` + `PageHero` (light variant) + `bg-neutral-bg` content section
   - `Challenges.tsx` — uses `Layout` + `PageHero` (light variant) + `bg-neutral-bg` content section

2. **Already dark but need spec alignment adjustments:**
   - `ReadingPlanDetail.tsx` — uses `bg-hero-dark`, already dark hero+content
   - `ChallengeDetail.tsx` — uses `bg-hero-dark`, already dark hero+content
   - `DevotionalPage.tsx` — uses `bg-hero-dark`, already dark hero+content
   - `GrowthProfile.tsx` — uses `bg-gradient-to-b from-hero-dark to-hero-mid` (needs solid `#0f0a1e`)

3. **Already dark (dashboard-style pages, need sub-component alignment):**
   - `Settings.tsx` — uses `bg-dashboard-dark`
   - `Insights.tsx` — uses `bg-dashboard-dark`
   - `MonthlyReport.tsx` — uses `bg-dashboard-dark`
   - `Friends.tsx` — uses `bg-dashboard-dark`

### Sub-Components Needing Full Conversion (light → dark)

These use `bg-white`, `border-gray-200`, `text-text-dark`, `text-text-light`, `bg-gray-*`:
- `components/reading-plans/PlanCard.tsx`
- `components/reading-plans/FilterBar.tsx`
- `components/challenges/ActiveChallengeCard.tsx`
- `components/challenges/UpcomingChallengeCard.tsx`
- `components/challenges/PastChallengeCard.tsx`
- `components/challenges/NextChallengeCountdown.tsx`
- `components/challenges/HallOfFame.tsx`
- `components/challenges/ChallengeStrip.tsx`
- `components/challenges/ChallengeNotFound.tsx`
- `components/reading-plans/PlanNotFound.tsx`
- `components/insights/EmailPreviewModal.tsx`

### Sub-Components Already Dark (verify only)

These already use `bg-white/5`, `border-white/10`, `text-white` patterns:
- All `components/settings/*.tsx` — already dark
- All `components/insights/*.tsx` (except EmailPreviewModal) — already dark
- All `components/friends/*.tsx` — already dark
- All `components/leaderboard/*.tsx` — already dark
- All `components/profile/*.tsx` — already dark
- `components/devotional/RelatedPlanCallout.tsx` — already dark
- `components/reading-plans/DayContent.tsx`, `DaySelector.tsx`, `CreatePlanFlow.tsx` — already dark
- `components/challenges/ChallengeDayContent.tsx`, `ChallengeDaySelector.tsx`, `CommunityFeed.tsx`, `MilestoneCard.tsx`, `ChallengeShareButton.tsx`, `SwitchChallengeDialog.tsx`, `ChallengeCompletionOverlay.tsx` — already dark

### Key Patterns

- **Page background**: `bg-dashboard-dark` (= `#0f0a1e` in Tailwind config) or `bg-[#0f0a1e]`
- **Flush dark hero**: gradient ending in `#0f0a1e` instead of `#F5F5F5`
- **PageHero component**: Already has `dark` prop — `<PageHero dark>` uses `HERO_BG_DARK_STYLE` ending in `#0f0a1e`
- **Content cards**: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl`
- **Structural elements**: `bg-white/[0.08] backdrop-blur-xl`
- **Text hierarchy**: `text-white` → `text-white/85` → `text-white/70` → `text-white/60` → `text-white/40`
- **Form inputs**: `bg-white/[0.06] text-white border border-white/10 focus:border-primary`
- **Pills unselected**: `bg-white/10 text-white/60`; selected: `bg-primary/20 text-primary-lt`

### Test Patterns

Tests use Vitest + React Testing Library. Components are wrapped with `MemoryRouter`, `AuthModalProvider`, `ToastProvider` as needed. Tests assert on rendered text, accessibility roles, user interactions. Class name assertions are rare — tests focus on behavior. When dark theme changes break assertions (e.g., `text-text-dark` → `text-white` in test queries), update selectors but don't add new tests for CSS classes.

### Directory Structure

```
frontend/src/
├── pages/           # Page components (route-level)
├── components/      # Feature-grouped sub-components
│   ├── reading-plans/
│   ├── challenges/
│   ├── devotional/
│   ├── settings/
│   ├── insights/
│   ├── friends/
│   ├── leaderboard/
│   └── profile/
```

---

## Auth Gating Checklist

**No auth gating changes in this spec.** All existing auth gates remain unchanged. This is a purely visual conversion.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A — no auth changes | "No changes to auth gating" (spec line 499) | N/A | Existing gates preserved |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (`bg-dashboard-dark` or `bg-[#0f0a1e]`) | Tailwind config + prior specs |
| Flush dark hero (PageHero) | gradient | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)` | PageHero.tsx `HERO_BG_DARK_STYLE` |
| Content card | classes | `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl` | Spec + prior dark theme pages |
| Structural element | classes | `bg-white/[0.08] backdrop-blur-xl border border-white/10` | Spec |
| Muted card (past) | classes | `bg-white/[0.04] border border-white/[0.06]` | Spec |
| CTA accent card | classes | `bg-primary/[0.08] border border-primary/20` | Spec |
| Danger zone card | classes | `bg-red-500/[0.06] border border-red-500/20` | Spec |
| Filter pill (unselected) | classes | `bg-white/10 text-white/60` | Spec |
| Filter pill (selected) | classes | `bg-primary/20 text-primary-lt` | Spec |
| Metadata pill | classes | `bg-white/10 text-white/50` | Spec |
| Form input | classes | `bg-white/[0.06] text-white border border-white/10 focus:border-primary` | Spec |
| Placeholder text | class | `placeholder-white/40` or `text-white/40` | Spec |
| Primary text | class | `text-white` | Spec |
| Secondary text | class | `text-white/70` or `text-white/80` | Spec |
| Muted text | class | `text-white/60` | Spec |
| Hint text | class | `text-white/40` | Spec |
| Section divider | class | `border-white/10` | Spec |
| Dark modal bg | class | `bg-[#1a0f2e] border border-white/10` | Spec |
| Recharts grid | stroke | `rgba(255,255,255,0.1)` | Spec |
| Recharts axis | fill | `rgba(255,255,255,0.4)` | Spec |
| Recharts tooltip | bg | `#1a0f2e` with `border-white/10` | Spec |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `font-script` (Caveat) for hero headings, not Lora
- Page background: `bg-dashboard-dark` = `#0f0a1e` (defined in Tailwind config)
- `PageHero` component has `dark` prop — pass it to get flush dark gradient ending in `#0f0a1e`
- Content cards: `bg-white/[0.06]` (6% opacity), NOT `bg-white/5` (5%). The spec is explicit about `[0.06]`
- Structural elements (sticky bars, sidebars, tab bars): `bg-white/[0.08]`
- Dashboard/growth pages already use `bg-white/5` — the spec says `bg-white/[0.06]` for these pages. Update where spec explicitly calls for `[0.06]`.
- Frosted glass hover: `lg:hover:shadow-md lg:hover:shadow-black/20`
- Focus rings must be visible on dark: use `focus:ring-primary` or `focus:ring-2 focus:ring-primary/50`
- Never use `outline-none` without visible replacement
- 44px minimum touch targets on all interactive elements

---

## Shared Data Models (from Master Plan)

Not applicable — this spec is purely visual (CSS class changes). No data model or localStorage changes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column, full-width cards, stacked sections. Settings: tab bar replaces sidebar. Insights sticky bar scrolls if pills overflow. |
| Tablet | 768px | 2-column grids where existing. Settings may show sidebar. |
| Desktop | 1440px | Max-width containers, multi-column grids. Settings sidebar + content side-by-side. |

No responsive layout changes in this spec — only ensuring dark background extends full-width at all breakpoints with no light edges.

---

## Vertical Rhythm

Not applicable — no spacing changes. All existing spacing preserved.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec read and internalized
- [x] All target files identified via codebase exploration
- [x] PageHero `dark` prop exists and works (confirmed in PageHero.tsx lines 11-14, 31)
- [x] `bg-dashboard-dark` Tailwind token exists (confirmed in tailwind.config.js)
- [x] Prior dark theme specs (1-3) are committed on the branch
- [x] No auth gating changes needed
- [x] Design system values confirmed from spec + codebase
- [ ] All [UNVERIFIED] values flagged with verification methods — none in this plan (all values from spec)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `bg-white/5` vs `bg-white/[0.06]` | Use `bg-white/[0.06]` for cards on pages being converted in this spec | Spec is explicit. Existing pages (Settings, Friends, etc.) already use `bg-white/5` — only update where the spec explicitly calls for `[0.06]` |
| GrowthProfile background | Change from `bg-gradient-to-b from-hero-dark to-hero-mid` to `bg-[#0f0a1e]` | Spec requires solid `#0f0a1e` edge-to-edge |
| ReadingPlans/Challenges page structure | Replace `Layout` wrapper with direct `Navbar`+`SiteFooter` pattern used by dark pages | Dark pages (Settings, Friends, Insights) use `<div className="min-h-screen bg-dashboard-dark">` + `<Navbar transparent />` + `<SiteFooter />` directly. This avoids the `Layout` component which may add unwanted wrappers. |
| Insights charts — already dark? | Verify and adjust if needed | Insights chart components already use `bg-white/5` with dark text. Need to check Recharts props specifically for grid/axis/tooltip dark treatment. |
| EmailPreviewModal | Convert to dark | Currently fully light-themed. Spec says `bg-[#1a0f2e] border border-white/10`. This is an email preview so the inner email content can stay light (it's a preview of a light email), but the modal frame should be dark. |
| Settings sub-components | Verify alignment | Already dark-themed. Check for any remaining light patterns per spec requirements. |

---

## Implementation Steps

### Step 1: Reading Plans Browser — Page & Sub-Components

**Objective:** Convert `/reading-plans` from light to dark theme.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlans.tsx` — Replace `Layout` + `PageHero` + `bg-neutral-bg` with dark page structure
- `frontend/src/components/reading-plans/PlanCard.tsx` — Convert from `bg-white` to frosted glass
- `frontend/src/components/reading-plans/FilterBar.tsx` — Convert filter pills from light to dark
- `frontend/src/components/reading-plans/PlanNotFound.tsx` — Convert text colors

**Details:**

**ReadingPlans.tsx:**
- Replace `<Layout>` with `<div className="min-h-screen bg-[#0f0a1e]">` + manual `<Navbar transparent />` + `<SiteFooter />`
- Add skip-to-content link (pattern from Settings.tsx)
- Replace `<PageHero title="Reading Plans" subtitle="..." />` with `<PageHero title="Reading Plans" subtitle="..." dark />`
- Change `<section className="bg-neutral-bg px-4 py-8 sm:px-6 sm:py-10">` to `<section className="px-4 py-8 sm:px-6 sm:py-10">`
- "Create Your Own Plan" card: change from `rounded-xl border border-primary/10 bg-white p-6 shadow-sm` to `rounded-xl border border-primary/20 bg-primary/[0.08] p-6`
- Card text: `text-text-dark` → `text-white`, `text-text-light` → `text-white/60`
- Sparkles icon container: `bg-primary/10` stays (OK on dark)
- Empty state text: `text-text-light` → `text-white/60`
- Add SEO component (already present)
- Import `Navbar` and `SiteFooter` (remove `Layout` import)

**PlanCard.tsx:**
- Card container: `border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-shadow lg:hover:shadow-md lg:hover:shadow-black/20`
- Title: `text-text-dark` → `text-white`
- Description: `text-text-light` → `text-white/60`
- Metadata pills (duration, difficulty, theme): `bg-gray-100 px-3 py-1 text-xs text-text-dark` → `bg-white/10 px-3 py-1 text-xs text-white/50`
- Progress text: `text-text-light` → `text-white/50`
- "Custom" badge: `bg-primary/20 text-primary-lt` (stays — already works on dark)
- StatusButton: "Start Plan" button stays `bg-primary` (works). "Completed" badge stays `bg-success/10 text-success` (works).

**FilterBar.tsx:**
- Section labels: `text-text-light` → `text-white/60`
- Unselected pills: `border border-gray-200 bg-white text-text-dark hover:bg-gray-50` → `bg-white/10 text-white/60 hover:bg-white/15`
- Selected pills: `bg-primary text-white` → `bg-primary/20 text-primary-lt` (per spec)

**PlanNotFound.tsx:**
- `text-text-dark` → `text-white`
- `text-text-light` → `text-white/60`

**Responsive behavior:**
- No layout changes — dark background extends full-width at all breakpoints
- Mobile: single column stacked (existing)
- Desktop: 2-column grid (existing)

**Guardrails (DO NOT):**
- DO NOT change the ConfirmDialog — it already uses dark theme (`bg-hero-mid border-white/15 text-white`)
- DO NOT change button functionality or auth gating
- DO NOT add new components or abstractions
- DO NOT change the CreatePlanFlow — it's already dark-themed

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update ReadingPlans test imports | unit | If tests import `Layout`, update. Fix any text-color-based selectors if they exist. |
| Verify PlanCard test | unit | Ensure tests still pass (they test behavior, not CSS classes) |

**Expected state after completion:**
- [ ] `/reading-plans` has solid dark background from navbar to footer
- [ ] Plan cards use frosted glass styling
- [ ] Filter pills use dark theme colors
- [ ] "Create Your Own Plan" card uses primary accent on dark
- [ ] All text meets WCAG AA contrast on dark
- [ ] `pnpm test` passes for reading-plans related tests

---

### Step 2: Reading Plan Detail — Verify & Align

**Objective:** Verify `/reading-plans/:planId` matches spec. Make targeted adjustments if needed.

**Files to create/modify:**
- `frontend/src/pages/ReadingPlanDetail.tsx` — Verify, potentially change `bg-hero-dark` to `bg-[#0f0a1e]`

**Details:**

ReadingPlanDetail already uses dark theme throughout. Verify these specific items:
- Page background: `bg-hero-dark` (= `#0D0620`). Spec says `#0f0a1e`. Change to `bg-[#0f0a1e]` for consistency with other pages.
- Hero gradient: Already uses `DETAIL_HERO_STYLE` ending in `#0D0620`. Update to end in `#0f0a1e`.
- Progress bar: Already `bg-white/10` track, `bg-primary` fill — matches spec.
- Day navigation buttons: Already `bg-white/10` — matches spec.
- DayContent, DaySelector, CreatePlanFlow, DayCompletionCelebration — all already dark-themed (confirmed during recon).

**Guardrails (DO NOT):**
- DO NOT change DayContent, DaySelector, CreatePlanFlow — they are already dark
- DO NOT change functionality or data flow

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify existing tests pass | unit | No test changes expected |

**Expected state after completion:**
- [ ] Background is `#0f0a1e` (not `#0D0620`)
- [ ] Hero gradient blends into `#0f0a1e`
- [ ] All existing dark styling preserved
- [ ] Tests pass

---

### Step 3: Challenge Browser — Page & Sub-Components

**Objective:** Convert `/challenges` from light to dark theme.

**Files to create/modify:**
- `frontend/src/pages/Challenges.tsx` — Replace `Layout` + `PageHero` + `bg-neutral-bg` with dark structure
- `frontend/src/components/challenges/ActiveChallengeCard.tsx` — Convert from `bg-white` to frosted glass
- `frontend/src/components/challenges/UpcomingChallengeCard.tsx` — Convert from `bg-white` to frosted glass
- `frontend/src/components/challenges/PastChallengeCard.tsx` — Convert to muted dark card
- `frontend/src/components/challenges/NextChallengeCountdown.tsx` — Convert from light to dark
- `frontend/src/components/challenges/HallOfFame.tsx` — Convert from light to dark
- `frontend/src/components/challenges/ChallengeNotFound.tsx` — Convert text colors
- `frontend/src/components/challenges/ChallengeStrip.tsx` — Convert text colors

**Details:**

**Challenges.tsx:**
- Replace `<Layout>` with `<div className="min-h-screen bg-[#0f0a1e]">` + `<Navbar transparent />` + `<SiteFooter />`
- Add skip-to-content link
- Replace `<PageHero ... />` with `<PageHero ... dark />`
- Change `<section className="bg-neutral-bg px-4 py-8 sm:px-6 sm:py-10">` to `<section className="px-4 py-8 sm:px-6 sm:py-10">`
- Section headings: `text-text-light` → `text-white/50`
- Empty state text: `text-text-light` → `text-white/60`

**ActiveChallengeCard.tsx:**
- Container: `rounded-2xl border border-gray-200 bg-white p-6 shadow-lg` → `rounded-2xl border-2 border-primary/30 bg-white/[0.06] p-6 backdrop-blur-sm`
- Remove inline `borderTopWidth`/`borderTopColor` style (replace with the `border-2 border-primary/30` from spec)
- Title: `text-text-dark` → `text-white`
- Description: `text-text-light` → `text-white/70`
- Participant count: `text-text-light` → `text-white/50`
- Community goal label: `text-text-light` → `text-white/50`
- Progress bar track: `bg-gray-100` → `bg-white/10`
- Day progress text: `text-text-dark` → `text-white/70`
- `getContrastSafeColor` for days remaining — verify it returns a visible color on dark backgrounds

**UpcomingChallengeCard.tsx:**
- Container: `border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md` → `border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm lg:hover:shadow-md lg:hover:shadow-black/20`
- Title: `text-text-dark` → `text-white`
- Description: `text-text-light` → `text-white/70`
- Info text: `text-text-light` → `text-white/50`
- "Remind me" button (not set): `border border-gray-300 ... text-text-dark hover:bg-gray-50` → `bg-white/10 text-white/60 hover:bg-white/15`
- "Reminder set" button: `bg-gray-100 text-text-light` → `bg-white/10 text-white/60`

**PastChallengeCard.tsx:**
- Container: `border border-gray-200 bg-gray-50` → `border border-white/[0.06] bg-white/[0.04]`
- Title: `text-text-dark` → `text-white/70`
- Icon: `text-text-light` → `text-white/40`
- "Missed" badge: `bg-gray-100 text-text-light` → `bg-white/10 text-white/40`
- "Completed" badge: stays `bg-success/10 text-success`

**NextChallengeCountdown.tsx:**
- Convert from light card (`bg-white border-gray-200`) to frosted glass (`bg-white/[0.06] border border-white/10`)
- Convert all `text-text-dark` → `text-white`, `text-text-light` → `text-white/60`
- Convert buttons from `border-gray-*` to `bg-white/10 text-white/60`
- Progress bars: `bg-gray-100` → `bg-white/10`

**HallOfFame.tsx:**
- Convert from light card (`bg-white border-gray-200`) to frosted glass (`bg-white/[0.06] border border-white/10`)
- Convert all `text-text-dark` → `text-white`, `text-text-light` → `text-white/40` (per spec: Hall of Fame stats use `text-white/40`)

**ChallengeNotFound.tsx:**
- `text-text-dark` → `text-white`, `text-text-light` → `text-white/60`

**ChallengeStrip.tsx:**
- `text-text-dark` → `text-white`

**Responsive behavior:**
- No layout changes — dark extends full-width
- Existing grid layouts preserved (1-col mobile, 2-col tablet, 3-col desktop for past cards)

**Guardrails (DO NOT):**
- DO NOT change ChallengeDetail — handled in Step 4
- DO NOT change SwitchChallengeDialog — already dark
- DO NOT change challenge functionality or auth gating
- DO NOT change theme colors (themeColor prop on challenge cards stays as-is)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update Challenges tests | unit | Fix any broken selectors due to class changes |
| Update challenge card tests | unit | Fix text-color-based selectors if present |

**Expected state after completion:**
- [ ] `/challenges` has solid dark background
- [ ] Active challenge card uses accent border on frosted glass
- [ ] Upcoming cards use frosted glass
- [ ] Past cards use muted dark treatment
- [ ] Section headings visible on dark
- [ ] Tests pass

---

### Step 4: Challenge Detail — Verify & Align

**Objective:** Verify `/challenges/:challengeId` matches spec. Adjust background color.

**Files to create/modify:**
- `frontend/src/pages/ChallengeDetail.tsx` — Change `bg-hero-dark` to `bg-[#0f0a1e]`, update hero gradient end color

**Details:**

ChallengeDetail is already extensively dark-themed. Adjustments:
- Page background: `bg-hero-dark` → `bg-[#0f0a1e]`
- Hero gradient (line 197): Update the `linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)` — change final `#0D0620` to `#0f0a1e`
- All sub-components (ChallengeDayContent, ChallengeDaySelector, CommunityFeed, MilestoneCard, ChallengeShareButton) are already dark — no changes needed
- ChallengeCompletionOverlay — already dark, no changes

**Guardrails (DO NOT):**
- DO NOT change any sub-components — they are already dark
- DO NOT change theme color logic or functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify existing tests pass | unit | No test changes expected |

**Expected state after completion:**
- [ ] Background is `#0f0a1e`
- [ ] Hero gradient blends into `#0f0a1e`
- [ ] All dark sub-components unchanged
- [ ] Tests pass

---

### Step 5: Devotional Page — Verify & Align

**Objective:** Verify `/devotional` matches spec. Adjust background if needed.

**Files to create/modify:**
- `frontend/src/pages/DevotionalPage.tsx` — Potentially change `bg-hero-dark` to `bg-[#0f0a1e]`, verify text colors

**Details:**

DevotionalPage is already extensively dark-themed (confirmed during recon). Check alignment:
- Page background: `bg-hero-dark` (= `#0D0620`). Spec says `#0f0a1e`. Change outer div to `bg-[#0f0a1e]`.
- Hero gradient: Currently ends in `#0D0620`. Change to `#0f0a1e`.
- Quote section: Currently `text-white` quote, `text-white/50` attribution, `text-white/20` quotation marks — spec says `text-white/70` quote, `text-white/40` attribution, `text-white/20` marks. Adjust quote text to `text-white/70` (Lora italic — it's `text-white` in the `<blockquote>` currently) and attribution to `text-white/40` (currently `text-white/50`).
- Scripture: Currently `text-white/90` — spec says `text-white/70`. Adjust.
- Scripture reference: Currently `text-white/40` uppercase — spec says `text-primary-lt`. Change to `text-primary-lt`.
- Reflection: Currently `text-white/80` — matches spec.
- Prayer: Currently `text-white/80` — spec says `text-white/60`. Adjust.
- Reflection question callout: Currently `bg-white/5 border-white/10` — spec says `bg-white/[0.06] border-l-2 border-primary`. Adjust to add left border accent.
- Section dividers: Currently `border-white/10` — matches spec.
- Action buttons: Currently `bg-white/10 border-white/20 text-white` — matches spec.
- RelatedPlanCallout — already dark, no changes.

**Guardrails (DO NOT):**
- DO NOT change functionality, swipe behavior, or read-aloud logic
- DO NOT change SEO/JSON-LD
- DO NOT change the Layout wrapper (it provides Navbar + footer)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify existing tests pass | unit | No test changes expected |

**Expected state after completion:**
- [ ] Background is `#0f0a1e`
- [ ] Quote text uses Lora italic `text-white/70`
- [ ] Scripture reference uses `text-primary-lt`
- [ ] Prayer text uses `text-white/60`
- [ ] Reflection question callout has `border-l-2 border-primary`
- [ ] Tests pass

---

### Step 6: Settings — Verify & Align Sub-Components

**Objective:** Verify `/settings` and sub-components match spec. Apply targeted fixes.

**Files to create/modify:**
- `frontend/src/pages/Settings.tsx` — Verify sidebar and mobile tabs match spec
- `frontend/src/components/settings/ProfileSection.tsx` — Verify form controls match spec
- `frontend/src/components/settings/AccountSection.tsx` — Verify danger zone matches spec
- `frontend/src/components/settings/DeleteAccountModal.tsx` — Verify matches spec

**Details:**

Settings page is already dark. Check for spec-specific refinements:

**Settings.tsx:**
- Page background: Already `bg-dashboard-dark` — correct.
- Desktop sidebar: Currently `hidden sm:block w-[200px]` with nav buttons using `bg-white/10 text-white` (active) and `text-white/60 hover:text-white/80 hover:bg-white/5` (inactive). Spec says sidebar bg should be `bg-white/[0.04] border-r border-white/10`. Add background and border to the `<nav>` element.
- Active nav item: Currently `bg-white/10 text-white`. Spec says `bg-primary/10 text-primary-lt`. Change.
- Inactive nav item: Currently `text-white/60 hover:text-white/80 hover:bg-white/5`. Spec says `text-white/60 hover:text-white hover:bg-white/[0.06]`. Adjust.
- Mobile tabs: Currently `border-b border-white/10`. Spec says frosted glass `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`. Add background.
- Inactive tab: Currently `text-white/50`. Spec says `text-white/60`. Adjust.

**ProfileSection.tsx:**
- Verify form inputs match: `bg-white/[0.06] text-white border border-white/10 focus:border-primary`
- Check if inputs already use this pattern (likely `bg-white/5` — adjust to `bg-white/[0.06]` per spec)
- Labels: verify `text-white/70`
- Placeholder: verify `text-white/40` or `placeholder-white/40`

**AccountSection.tsx:**
- Danger zone card: should use `bg-red-500/[0.06] border border-red-500/20`
- Danger text: `text-red-400`
- DELETE input: `bg-white/[0.06]` with `focus:border-red-500`

**DeleteAccountModal.tsx:**
- Modal bg: should use `bg-[#1a0f2e] border border-white/10`

**ToggleSwitch.tsx:**
- Track: `bg-white/10` (off), `bg-primary` (on) — verify against current implementation

**Responsive behavior:**
- Desktop: sidebar visible at `sm:block` — spec says sidebar pattern
- Mobile: tab bar — add frosted glass background

**Guardrails (DO NOT):**
- DO NOT change settings functionality or data flow
- DO NOT change NotificationsSection or PrivacySection unless they have light-theme artifacts

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify settings tests pass | unit | No breaking changes expected |

**Expected state after completion:**
- [ ] Desktop sidebar has `bg-white/[0.04] border-r border-white/10`
- [ ] Active nav uses `bg-primary/10 text-primary-lt`
- [ ] Mobile tab bar uses frosted glass
- [ ] Danger zone uses red accent card
- [ ] Form inputs match spec
- [ ] Tests pass

---

### Step 7: Insights & Monthly Report — Verify Charts & Align

**Objective:** Verify `/insights` and `/insights/monthly` charts use dark Recharts treatment. Align sub-components.

**Files to create/modify:**
- `frontend/src/pages/Insights.tsx` — Verify time range pills, "View Monthly Report" CTA
- `frontend/src/components/insights/MoodTrendChart.tsx` — Apply dark Recharts treatment
- `frontend/src/components/insights/ActivityBarChart.tsx` — Apply dark Recharts treatment
- `frontend/src/components/insights/CalendarHeatmap.tsx` — Verify empty cells and labels
- `frontend/src/components/insights/MonthHeatmap.tsx` — Verify same
- `frontend/src/components/insights/EmailPreviewModal.tsx` — Convert modal frame to dark

**Details:**

**Insights.tsx:**
- Already `bg-dashboard-dark` — correct.
- Time range pills: Currently uses `bg-purple-600` (selected) and `border border-white/20 text-white/60` (unselected). Spec says selected: `bg-primary/20 text-primary-lt`, unselected: `bg-white/10 text-white/60`. Update the `TimeRangePills` component inline.
- "View Monthly Report" CTA: Currently `bg-primary text-white`. Spec says `bg-white/10 text-white/70 hover:bg-white/15`. Change.
- Sticky bar: Currently `bg-dashboard-dark/90 backdrop-blur-sm`. Spec says frosted glass `bg-white/[0.08] backdrop-blur-xl`. Adjust.

**MoodTrendChart.tsx:**
- Verify Recharts `<CartesianGrid>` uses `stroke="rgba(255,255,255,0.1)"`
- Verify `<XAxis>` and `<YAxis>` use `tick={{ fill: 'rgba(255,255,255,0.4)' }}`
- Verify chart background is transparent (no `fill` on `<ResponsiveContainer>` or `<LineChart>`)
- Verify `<Tooltip>` uses dark content style: `contentStyle={{ backgroundColor: '#1a0f2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}`

**ActivityBarChart.tsx:**
- Same dark Recharts treatment as MoodTrendChart

**CalendarHeatmap.tsx:**
- Verify empty day cells use `bg-white/[0.04]`
- Verify day labels use `text-white/40`
- Verify month labels use `text-white/50`

**MonthHeatmap.tsx:**
- Same treatment as CalendarHeatmap

**EmailPreviewModal.tsx:**
- Modal backdrop/frame: Convert from light to `bg-[#1a0f2e] border border-white/10`
- The inner email preview content (the simulated email) can remain light-themed since it's previewing what the email will actually look like
- Modal close button, header text: use white text

**MonthlyReport.tsx:**
- Already `bg-dashboard-dark` — correct.
- Month navigation: Already uses `bg-white/10 text-white/60` — verify matches spec.
- MonthlyShareButton: Verify uses `bg-white/10 text-white/70`

**Responsive behavior:**
- Sticky bar must remain functional at all breakpoints
- Charts fill available width

**Guardrails (DO NOT):**
- DO NOT change chart data, calculations, or logic
- DO NOT change the MonthlyStatCards, MonthlyHighlights, MonthlyInsightCards — they already use `bg-white/5 border-white/10` (close enough to spec)
- DO NOT change InsightCards, ActivityCorrelations, ScriptureConnections, CommunityConnections, GratitudeStreak, MeditationHistory — they already use dark patterns

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify insights tests pass | unit | No breaking changes expected |
| Verify EmailPreviewModal test | unit | May need selector updates if testing for bg-white |

**Expected state after completion:**
- [ ] Time range pills use `bg-primary/20 text-primary-lt` (selected)
- [ ] Charts have transparent bg, white/10 grid, white/40 axis labels
- [ ] Chart tooltips use dark background
- [ ] "View Monthly Report" CTA uses `bg-white/10`
- [ ] Sticky bar uses frosted glass
- [ ] EmailPreviewModal frame is dark
- [ ] Tests pass

---

### Step 8: Friends & Leaderboard — Verify & Align

**Objective:** Verify `/friends` page and sub-components match spec.

**Files to create/modify:**
- `frontend/src/pages/Friends.tsx` — Verify tab bar matches spec
- `frontend/src/components/leaderboard/BoardSelector.tsx` — Verify pill colors
- `frontend/src/components/leaderboard/LeaderboardRow.tsx` — Verify alternating row colors
- `frontend/src/components/leaderboard/GlobalRow.tsx` — Verify same

**Details:**

Friends page is already dark. Check for spec-specific refinements:

**Friends.tsx:**
- Tab bar: Currently uses `rounded-full px-6 py-2` pill buttons with `bg-primary text-white` (active) and `border border-white/20 text-white/60` (inactive). Spec envisions a tab bar with `bg-white/[0.08] border-b border-white/10`. The current pill-style tabs work on dark but don't match the spec's tab bar vision. Consider whether to add a tab bar background container or keep pills. **Decision: Keep pills** — the current pill style works well on dark and changing to a tab bar would be a structural change beyond the visual scope.
- Page header heading: Currently `font-serif text-2xl text-white/90`. This is fine.

**BoardSelector.tsx:**
- Verify pills: unselected `bg-white/10 text-white/60`, selected `bg-primary/20 text-primary-lt`
- Current implementation likely uses similar pattern — verify and adjust if needed.

**LeaderboardRow.tsx / GlobalRow.tsx:**
- Spec says odd rows `bg-white/[0.04]`, even rows `bg-white/[0.06]`
- Current user row: `bg-primary/[0.08]`
- Verify current implementation and adjust if needed.

**FriendSearch.tsx, InviteSection.tsx, PendingRequests.tsx, FriendList.tsx, FriendRow.tsx, FriendMenu.tsx, SuggestionsSection.tsx:**
- All already use `bg-white/5` and `border-white/10` patterns — close to spec
- Verify against spec requirements; adjust where spec is explicit about `bg-white/[0.06]` vs `bg-white/5`

**Responsive behavior:**
- No layout changes

**Guardrails (DO NOT):**
- DO NOT change Friends page structure (tabs, panels)
- DO NOT change friend/leaderboard functionality

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify friends/leaderboard tests pass | unit | No breaking changes expected |

**Expected state after completion:**
- [ ] Leaderboard rows use alternating `bg-white/[0.04]` / `bg-white/[0.06]`
- [ ] Current user row highlighted with `bg-primary/[0.08]`
- [ ] Board selector pills match spec colors
- [ ] Tests pass

---

### Step 9: Growth Profile — Align Background

**Objective:** Align `/profile/:userId` background with spec.

**Files to create/modify:**
- `frontend/src/pages/GrowthProfile.tsx` — Change background from gradient to solid `#0f0a1e`

**Details:**

- Change `bg-gradient-to-b from-hero-dark to-hero-mid` to `bg-[#0f0a1e]` (both in the found and not-found states)
- Not-found state (line 76): `bg-gradient-to-b from-hero-dark to-hero-mid` → `bg-[#0f0a1e]`
- Main view (line 110): `bg-gradient-to-b from-hero-dark to-hero-mid` → `bg-[#0f0a1e]`
- ProfileHeader, ProfileBadgeShowcase, ProfileStats — already use dark patterns (`bg-white/5`, `bg-white/10`, `border-white/10`). Verify locked badges use `bg-white/[0.04]` with lock icon `text-white/20`.
- GrowthGarden SVG — verify it renders correctly on `#0f0a1e` (the SVG likely has its own background elements)

**Guardrails (DO NOT):**
- DO NOT change profile functionality or social interactions
- DO NOT change GrowthGarden SVG internals

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify profile tests pass | unit | No breaking changes expected |

**Expected state after completion:**
- [ ] Background is solid `#0f0a1e`
- [ ] No gradient visible
- [ ] Garden SVG renders correctly
- [ ] Tests pass

---

### Step 10: Run Full Test Suite & Cross-Page Verification

**Objective:** Run all tests, verify no regressions.

**Files to create/modify:**
- None — verification only

**Details:**

1. Run `cd frontend && pnpm test` — all tests must pass
2. Fix any test failures caused by class name changes (e.g., tests that assert on `text-text-dark` or `bg-white` classes)
3. Verify no TypeScript errors: `pnpm build`

**Guardrails (DO NOT):**
- DO NOT skip failing tests
- DO NOT add `skip` to existing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | all | `pnpm test` — zero failures |
| TypeScript build | build | `pnpm build` — zero errors |

**Expected state after completion:**
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Reading Plans Browser dark theme |
| 2 | — | Reading Plan Detail verify & align |
| 3 | — | Challenge Browser dark theme |
| 4 | — | Challenge Detail verify & align |
| 5 | — | Devotional verify & align |
| 6 | — | Settings verify & align |
| 7 | — | Insights & Monthly Report charts + align |
| 8 | — | Friends & Leaderboard verify & align |
| 9 | — | Growth Profile align background |
| 10 | 1-9 | Full test suite & verification |

Steps 1-9 are independent and can be executed in any order. Step 10 must run after all others.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Reading Plans Browser dark theme | [COMPLETE] | 2026-03-25 | Modified ReadingPlans.tsx (Layout→Navbar+SiteFooter, dark bg, dark PageHero, dark CTA card), PlanCard.tsx (frosted glass, white text, metadata pills), FilterBar.tsx (dark pills), PlanNotFound.tsx (dark bg, white text). All tests pass. |
| 2 | Reading Plan Detail verify & align | [COMPLETE] | 2026-03-25 | Changed bg-hero-dark→bg-[#0f0a1e], updated hero gradient end color from #0D0620 to #0f0a1e in ReadingPlanDetail.tsx |
| 3 | Challenge Browser dark theme | [COMPLETE] | 2026-03-25 | Modified Challenges.tsx (Layout→Navbar+SiteFooter, dark bg, dark PageHero), ActiveChallengeCard (frosted glass, white text), UpcomingChallengeCard (frosted glass), PastChallengeCard (muted dark), NextChallengeCountdown (frosted glass), HallOfFame (frosted glass), ChallengeNotFound (dark bg), ChallengeStrip (white text). All tests pass. |
| 4 | Challenge Detail verify & align | [COMPLETE] | 2026-03-25 | Changed bg-hero-dark→bg-[#0f0a1e], updated hero gradient end color from #0D0620 to #0f0a1e in ChallengeDetail.tsx |
| 5 | Devotional verify & align | [COMPLETE] | 2026-03-25 | Changed bg-hero-dark→bg-[#0f0a1e], gradient end to #0f0a1e, quote text→text-white/70, attribution→text-white/40, scripture ref→text-primary-lt, scripture text→text-white/70, prayer→text-white/60, reflection callout→border-l-2 border-l-primary bg-white/[0.06] |
| 6 | Settings verify & align | [COMPLETE] | 2026-03-25 | Settings.tsx: sidebar bg-white/[0.04]+border-r, active nav bg-primary/10 text-primary-lt, inactive hover:text-white, mobile tab bar frosted glass+text-white/60. ProfileSection: inputs bg-white/[0.06]+border-white/10, labels text-white/70, placeholders text-white/40. AccountSection: danger zone bg-red-500/[0.06]+border-red-500/20. DeleteAccountModal: bg-[#1a0f2e]. |
| 7 | Insights & Monthly Report charts | [COMPLETE] | 2026-03-25 | Insights.tsx: time range pills bg-primary/20 text-primary-lt, sticky bar bg-white/[0.08] backdrop-blur-xl, CTA bg-white/10. MoodTrendChart: grid 0.1, axis 0.4, tooltip bg-[#1a0f2e]. ActivityBarChart: tooltip bg-[#1a0f2e], grid 0.1. CalendarHeatmap: empty cells bg-white/[0.04]. MonthHeatmap: empty cells bg-white/[0.04]. EmailPreviewModal: frame bg-[#1a0f2e] border-white/10. |
| 8 | Friends & Leaderboard verify & align | [COMPLETE] | 2026-03-25 | BoardSelector: selected pills bg-primary/20 text-primary-lt. LeaderboardRow: alternating bg-white/[0.04]/[0.06], current user bg-primary/[0.08]. GlobalRow: added index prop, alternating rows, current user bg-primary/[0.08]. GlobalLeaderboard: pass index to GlobalRow. |
| 9 | Growth Profile align background | [COMPLETE] | 2026-03-25 | Changed both bg-gradient-to-b from-hero-dark to-hero-mid → bg-[#0f0a1e] (not-found + main view) in GrowthProfile.tsx |
| 10 | Full test suite & verification | [COMPLETE] | 2026-03-25 | Fixed 4 test assertions (GrowthProfile bg class, Settings active nav, CalendarHeatmap empty cells, MonthHeatmap empty cells). All 4254 tests pass. Build succeeds. Only pre-existing e2e/full-site-audit.spec.ts fails (Playwright test in Vitest context — unrelated). |
