# Implementation Plan: WCAG AA Contrast Remediation

**Spec:** `_specs/wcag-aa-contrast-remediation.md`
**Date:** 2026-03-30
**Branch:** `claude/feature/wcag-aa-contrast-remediation`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (cross-cutting CSS change, not a page build)
**Master Spec Plan:** not applicable — standalone accessibility remediation

---

## Architecture Context

**Scope:** 264 occurrences of `text-white/30` or `text-white/40` across 133 source files, plus ~16 occurrences of `text-white/20` across 11 files. 5 test files assert specific opacity classes. 34 placeholder inputs use `placeholder:text-white/30` or `placeholder:text-white/40`.

**Background colors in use:**
- `hero-dark` = `#0D0620` (rgb 13,6,32) — main page backgrounds
- `hero-mid` = `#1E0B3E` (rgb 30,11,62) — nav, drawer, dropdowns
- `hero-deep` = `#251248` (rgb 37,18,72) — some hero sections
- `bg-white/5` = rgba(255,255,255,0.05) — card interiors, inputs
- `bg-white/[0.06]` = rgba(255,255,255,0.06) — form inputs
- `bg-white/10` = rgba(255,255,255,0.10) — some inputs, buttons

**Contrast ratios on `#0D0620`:**
| Opacity | Effective | Ratio | AA body (4.5:1) | AA large (3:1) |
|---------|-----------|-------|-----------------|----------------|
| `/20` | ~#363036 | ~1.3:1 | FAIL | FAIL |
| `/30` | ~#4F4850 | ~1.8:1 | FAIL | FAIL |
| `/40` | ~#686068 | ~2.5:1 | FAIL | FAIL |
| `/50` | ~#807880 | ~3.2:1 | FAIL | PASS |
| `/60` | ~#999298 | ~4.6:1 | PASS | PASS |
| `/70` | ~#B2ABB0 | ~6.5:1 | PASS | PASS |

**Decision rules (from spec):**

| Classification | Current | Target | Rationale |
|---|---|---|---|
| Body text, labels, descriptions, timestamps | `/30` or `/40` | `/60` | Meets 4.5:1 AA minimum |
| Primary readable text | `/30` or `/40` | `/70` | Comfortable reading |
| Placeholder text | `placeholder:text-white/30` or `/40` | `placeholder:text-white/50` | Meets 3:1 for transient hints |
| Large text headings (18px+) | `/30` or `/40` | `/60` min | Meets 3:1 large text |
| Interactive text (buttons/links with hover states) | `/40` | `/50` | Button labels are transient action cues; `/50` meets 3:1 large text |
| Decorative icons, locked badges, dividers, borders | `/20`-`/40` | Keep as-is | Non-text elements exempt |
| Disabled/locked state indicators | `/20`-`/30` | Keep as-is | Intentionally de-emphasized |
| FeatureEmptyState icon | `/20` | `/30` | Visible but still subtle |

**Hierarchy principle:** After remediation, the visual hierarchy must remain: primary text (`/70`-`/80`) > secondary text (`/60`) > placeholder/hint text (`/50`) > decorative (`/20`-`/40`).

**Test files that assert opacity classes:**
1. `components/daily/__tests__/VerseOfTheDayBanner.test.tsx:81` — asserts `text-white/40`
2. `components/shared/__tests__/VerseLink.test.tsx:40,42` — passes and asserts `text-white/40`
3. `components/ui/__tests__/CharacterCount.test.tsx:23` — asserts `text-white/40`
4. `components/pwa/__tests__/OfflineMessage.test.tsx:24` — asserts `text-white/40`
5. `components/dashboard/__tests__/GrowthGarden.test.tsx:189` — renders `text-white/40` in JSX

**Component patterns to follow:**
- `cn()` utility from `@/lib/utils` for conditional classNames
- Tailwind classes, no inline styles
- All files in `frontend/src/`

**Note on step sizes:** This is a bulk CSS remediation touching 133 files. Each file change is a mechanical class-name swap (1-5 edits per file). Steps are grouped by functional area (5-12 files each) rather than the usual ≤3 files, because each individual edit is trivial and the grouping makes execution more efficient.

---

## Auth Gating Checklist

N/A — This is a cross-cutting CSS change. No interactive elements are added, removed, or gated. All existing auth gating remains unchanged.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| hero-dark background | background-color | `#0D0620` | design-system.md |
| hero-mid background | background-color | `#1E0B3E` | design-system.md |
| hero-deep background | background-color | `#251248` | design-system.md |
| Input background | background | `bg-white/5` or `bg-white/[0.06]` | codebase inspection |
| Primary text on dark | color | `text-white` or `text-white/90` | design-system.md |
| Secondary text on dark | color | `text-white/60` (new minimum) | spec |
| Placeholder on dark | color | `placeholder:text-white/50` (new minimum) | spec |
| Footer muted text | color | `text-white/50` | design-system.md |

---

## Design System Reminder

- Body text at `text-white/30` (ratio ~1.8:1) and `text-white/40` (ratio ~2.5:1) both FAIL WCAG AA on all dark backgrounds in the app.
- Placeholder text is used as emotional prompts ("What's on your heart?") — these are invitations, not generic placeholders. They must be visible.
- `FeatureEmptyState` icon at `text-white/20` makes empty states feel ghostly. Bump to `/30`.
- Decorative elements (locked badge silhouettes, background icons, middot separators, verse number superscripts) are EXEMPT from contrast requirements.
- Disabled/locked states (`cursor-not-allowed text-white/30` on locked days) are EXEMPT — they communicate unavailability.
- The app must still feel like a dark sanctuary after remediation, not a high-contrast accessibility theme. Use `/60` for secondary text, not `/70`.
- Interactive text in buttons/links that already have hover states (e.g., `text-white/40 hover:text-white/60`) — bump base to `/50` and hover to `/70`.
- Verse number superscripts (`<sup>` with `/30`) are small reference marks at ~12px. They're decorative numbering, not body text. Keep at `/30`.

---

## Shared Data Models (from Master Plan)

N/A — no data models affected.

---

## Responsive Structure

No layout changes. Opacity remediations apply identically across all breakpoints.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | No change — same opacity values |
| Tablet | 768px | No change |
| Desktop | 1440px | No change |

---

## Vertical Rhythm

N/A — no spacing or layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/wcag-aa-contrast-remediation` exists
- [ ] All tests pass before starting (baseline: 4,862 pass / 0 fail)
- [ ] No other branches are modifying the same files concurrently
- [ ] The decision rules in Architecture Context are accepted (especially: verse superscripts stay at `/30`, interactive hover text goes to `/50` base)
- [ ] Design system values verified from design-system.md and codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Verse number superscripts (`<sup>` at `/30`) | Keep `/30` | Decorative reference marks, not body text. Small (10-12px), used for numbering. Changing would make verse numbers compete with verse text. |
| Interactive text with hover states (`/40 hover:/60`) | Base to `/50`, hover to `/70` | These are clickable action labels (dismiss, share, etc.). Need baseline legibility but are secondary to content. |
| Locked day indicators (`cursor-not-allowed text-white/30`) | Keep `/30` | Intentionally communicates unavailability. Exempt per spec. |
| Locked badge silhouettes (`text-white/40` on unearned badges) | Keep `/40` | Intentionally muted to create earned/unearned contrast. Decorative. |
| Lock icons on badges/days | Keep `/30` | Decorative icon, not readable text |
| "or" divider text in AuthModal | `/40` → `/50` | Per spec: divider text goes to `/50` |
| Calendar heatmap day-of-week labels | `/40` → `/60` | Readable reference labels |
| Middot separators (·) at `/20` | Keep `/20` | Purely decorative separators |
| App loading spinner at `/20`/`/30` | Keep as-is | Decorative animation, not readable text |
| Breadcrumb separators at `/30` | Keep `/30` | Decorative chevrons and ellipsis |
| Empty state icons at `/20` (FeatureEmptyState, PrayerListEmptyState) | `/20` → `/30` | Per spec: visible but still subtle |
| Search icons at `/40` (JournalSearchFilter, FriendSearch) | Keep `/40` | Decorative icons, not text |
| Character count normal state | `/40` → `/60` | Users need to read character count to know remaining characters |
| Drag handle on CustomizePanel | Keep `/30` | Decorative grip indicator |
| Star ratings unfilled at `/20` | Keep `/20` | Decorative contrast between filled/unfilled stars |

---

## Implementation Steps

### Step 1: Shared UI Components

**Objective:** Fix FeatureEmptyState icon opacity and remediate shared UI components used across the entire app.

**Files to modify:**
- `frontend/src/components/ui/FeatureEmptyState.tsx` — icon `/20` → `/30`
- `frontend/src/components/my-prayers/PrayerListEmptyState.tsx` — icon `/20` → `/30`
- `frontend/src/components/ui/CharacterCount.tsx` — normal state `/40` → `/60`
- `frontend/src/components/ui/FormField.tsx` — help text `/40` → `/60`
- `frontend/src/components/ui/Breadcrumb.tsx` — NO CHANGES (decorative separators, keep `/30`)

**Details:**

`FeatureEmptyState.tsx`:
- Line 39: `text-white/20` → `text-white/30` (icon, still subtle but visible)
- Line 42: `text-white/70` — already meets standard (heading). No change.
- Line 43: `text-white/50` — description at `/50` is below the `/60` minimum for readable body text. Change to `text-white/60`.

`PrayerListEmptyState.tsx`:
- Line 10: `text-white/20` → `text-white/30` (heart icon, match FeatureEmptyState)

`CharacterCount.tsx`:
- Line 22: `text-white/40` → `text-white/60` (character count must be readable)

`FormField.tsx`:
- Line 92: `text-white/40` → `text-white/60` (help text must be readable)

**Responsive behavior:** N/A: no layout changes. Opacity applies identically at all breakpoints.

**Guardrails (DO NOT):**
- DO NOT change `Breadcrumb.tsx` — its `/30` usages are decorative separators (chevrons, ellipsis)
- DO NOT make empty state icons brighter than `/30` — they should remain subtle

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| CharacterCount test update | unit | Update `CharacterCount.test.tsx:23` assertion from `text-white/40` to `text-white/60` |
| Existing FeatureEmptyState tests | regression | Verify existing tests still pass |

**Expected state after completion:**
- [ ] FeatureEmptyState icon at `/30`, description at `/60`
- [ ] PrayerListEmptyState icon at `/30`
- [ ] CharacterCount at `/60`
- [ ] FormField help text at `/60`
- [ ] All existing tests pass (after updating CharacterCount test)

---

### Step 2: Dashboard Components — Core Cards

**Objective:** Remediate high-traffic dashboard components.

**Files to modify:**
- `frontend/src/components/dashboard/DashboardHero.tsx`
- `frontend/src/components/dashboard/DashboardCard.tsx`
- `frontend/src/components/dashboard/MoodCheckIn.tsx`
- `frontend/src/components/dashboard/ActivityChecklist.tsx`
- `frontend/src/components/dashboard/StreakCard.tsx`
- `frontend/src/components/dashboard/GettingStartedCard.tsx`
- `frontend/src/pages/Dashboard.tsx`

**Details:**

`DashboardHero.tsx`:
- Line 122: `text-white/30` on flame icon when streak is 0 → KEEP (decorative icon showing inactive state)

`DashboardCard.tsx`:
- Line 83: `text-white/40` on collapse/expand button → `/50` (interactive, has hover state)

`MoodCheckIn.tsx`:
- Line 208: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 229: `text-white/40` on "Not right now" link → `/50` (interactive link)

`ActivityChecklist.tsx`:
- Line 178,189: `text-white/20` on uncompleted circle icons → KEEP (decorative state indicator)
- Line 214: `text-white/30` on points label ("ml-auto text-xs text-white/30") → `/60` (readable label showing earned points)

`StreakCard.tsx`:
- Line 263: `text-white/30` on icon → KEEP (decorative icon for zero-streak state)

`GettingStartedCard.tsx`:
- Line 166,180: `text-white/40` on dismiss/skip buttons → `/50` (interactive buttons)
- Line 237: `text-white/20` on uncompleted circle icon → KEEP (decorative state indicator)
- Line 248: `text-white/40` on completed item text → KEEP (intentionally muted completed items)
- Line 257: `text-white/20` for completed, `/30` for uncompleted link text → The uncompleted `/30` is readable link text → `/60`. The completed `/20` stays (intentionally de-emphasized).

`Dashboard.tsx`:
- Line 410: `text-white/40` on "Your Garden" label → `/60` (readable label)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change decorative icons (flame, circle indicators) — these communicate state visually
- DO NOT change StreakCard's zero-state icon — intentionally dim when no streak
- DO NOT change completed item styling in GettingStartedCard (`/20`) — intentionally de-emphasized

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| GrowthGarden test | unit | Update `GrowthGarden.test.tsx:189` — change `text-white/40` to `text-white/60` in rendered JSX |
| Existing dashboard tests | regression | Run full suite, verify no failures |

**Expected state after completion:**
- [ ] Points labels, readable text at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Decorative icons unchanged
- [ ] Placeholders at `/50`

---

### Step 3: Dashboard Widgets — Batch 1

**Objective:** Remediate dashboard widget secondary text and labels.

**Files to modify:**
- `frontend/src/components/dashboard/GratitudeWidget.tsx`
- `frontend/src/components/dashboard/RecentHighlightsWidget.tsx`
- `frontend/src/components/dashboard/VerseOfTheDayCard.tsx`
- `frontend/src/components/dashboard/ReadingPlanWidget.tsx`
- `frontend/src/components/dashboard/ChallengeWidget.tsx`
- `frontend/src/components/dashboard/BadgeGrid.tsx`
- `frontend/src/components/dashboard/WeeklyRecap.tsx`
- `frontend/src/components/dashboard/WeeklyGodMoments.tsx`

**Details:**

`GratitudeWidget.tsx`:
- Line 143: `text-white/40` description text → `/60`
- Line 159: `placeholder:text-white/30` → `placeholder:text-white/50`

`RecentHighlightsWidget.tsx`:
- Line 12: `text-white/30` empty state icon → KEEP (decorative, matches FeatureEmptyState pattern at `/30`)
- Line 43: `text-white/40` icon → KEEP (decorative icon)
- Line 55: `text-white/40` timestamp → `/60` (readable timestamp)

`VerseOfTheDayCard.tsx`:
- Line 28: `text-white/40` button text → `/50` (interactive)

`ReadingPlanWidget.tsx`:
- Line 170: `text-white/40` text → `/60` (readable progress text)

`ChallengeWidget.tsx`:
- Line 80: `text-white/40` text → `/60` (readable label)
- Line 109: `text-white/40` text → `/60` (readable label)

`BadgeGrid.tsx`:
- Line 150: `text-white/40` unearned badge → KEEP (intentionally muted, decorative locked state)
- Line 157: `text-white/40` lock icon → KEEP (decorative locked indicator)

`WeeklyRecap.tsx`:
- Line 37: `text-white/40` dismiss button → `/50` (interactive)
- Line 49: `text-white/40` icon → KEEP (decorative)

`WeeklyGodMoments.tsx`:
- Line 18: `text-white/40` in color config for insufficient mood data → KEEP (intentionally muted state indicator)
- Line 64: `text-white/40` button → `/50` (interactive)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change BadgeGrid locked badge styling — decorative earned/unearned distinction
- DO NOT change WeeklyGodMoments color config — data visualization state

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing widget tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All readable timestamps and labels at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Decorative icons and locked badges unchanged
- [ ] Placeholders at `/50`

---

### Step 4: Dashboard Widgets — Batch 2

**Objective:** Remediate evening reflection, wizard, notifications, and customization panel.

**Files to modify:**
- `frontend/src/components/dashboard/WelcomeWizard.tsx`
- `frontend/src/components/dashboard/EveningReflection.tsx`
- `frontend/src/components/dashboard/EveningReflectionBanner.tsx`
- `frontend/src/components/dashboard/CustomizePanel.tsx`
- `frontend/src/components/dashboard/MoodRecommendations.tsx`
- `frontend/src/components/dashboard/NotificationPanel.tsx`
- `frontend/src/components/dashboard/NotificationItem.tsx`

**Details:**

`WelcomeWizard.tsx`:
- Line 297: `text-white/40` button → `/50` (interactive)
- Line 345: `placeholder:text-white/30` → `placeholder:text-white/50`

`EveningReflection.tsx`:
- Line 231: `text-white/40` button → `/50` (interactive)
- Line 328: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 384: `placeholder:text-white/30` → `placeholder:text-white/50`

`EveningReflectionBanner.tsx`:
- Line 37: `text-white/40` dismiss button → `/50` (interactive)

`CustomizePanel.tsx`:
- Line 183: `text-white/30` drag handle → KEEP (decorative grip indicator)

`MoodRecommendations.tsx`:
- Line 202: `text-white/40` link → `/50` (interactive link)

`NotificationPanel.tsx`:
- Line 81: `text-white/30` disabled "Mark all as read" → KEEP (disabled state, cursor-default)

`NotificationItem.tsx`:
- Line 184: `text-white/40` button → `/50` (interactive)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change CustomizePanel drag handle — decorative
- DO NOT change NotificationPanel disabled state — intentionally dim

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Interactive buttons at `/50`
- [ ] Decorative/disabled elements unchanged

---

### Step 5: Daily Hub + Pray Tab

**Objective:** Remediate the Daily Hub shell and prayer-related components.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx`
- `frontend/src/components/daily/PrayerInput.tsx`
- `frontend/src/components/daily/PrayerResponse.tsx`
- `frontend/src/components/daily/AmbientSoundPill.tsx`
- `frontend/src/components/daily/JournalInput.tsx`
- `frontend/src/components/daily/JournalSearchFilter.tsx`

**Details:**

`DailyHub.tsx`:
- Line 255: `text-white/40` button with hover → `/50` (interactive)

`PrayerInput.tsx`:
- Line 122: `placeholder:text-white/40` → `placeholder:text-white/50`

`PrayerResponse.tsx`:
- Line 238: `text-white/40` link with hover → `/50` (interactive)
- Line 248: `text-white/40` secondary text → `/60` (readable metadata)
- Line 250: `text-white/20` middot → KEEP (decorative separator)
- Line 254,262: `text-white/40` links with hover → `/50` (interactive)
- Line 258: `text-white/20` middot → KEEP (decorative separator)

`AmbientSoundPill.tsx`:
- Line 218: `text-white/40` button with hover → `/50` (interactive)

`JournalInput.tsx`:
- Line 257: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 280: `text-white/30` on disabled button state (`bg-white/10 text-white/30 hover:bg-white/15 hover:text-white/50`) → KEEP (disabled button state — intentionally dim)

`JournalSearchFilter.tsx`:
- Line 29: `text-white/40` search icon → KEEP (decorative icon)
- Line 36: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 42: `text-white/40` clear button → `/50` (interactive)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change middot separators (`text-white/20` · characters) — decorative
- DO NOT change JournalInput disabled button state — intentionally muted
- DO NOT change JournalSearchFilter search icon — decorative

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing daily tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Interactive links/buttons at `/50`
- [ ] Readable metadata at `/60`
- [ ] Decorative separators and icons unchanged

---

### Step 6: Daily Hub — Remaining Tabs

**Objective:** Remediate devotional, verse-of-the-day, guided prayer, and saved entries components.

**Files to modify:**
- `frontend/src/components/daily/SavedEntriesList.tsx`
- `frontend/src/components/daily/DevotionalTabContent.tsx`
- `frontend/src/components/daily/VerseOfTheDayBanner.tsx`
- `frontend/src/components/daily/GuidedPrayerSection.tsx`
- `frontend/src/components/daily/GuidedPrayerPlayer.tsx`
- `frontend/src/components/devotional/RelatedPlanCallout.tsx`

**Details:**

`SavedEntriesList.tsx`:
- Line 174: `text-white/40` timestamp → `/60` (readable)
- Line 183: `text-white/40` text → `/60` (readable)

`DevotionalTabContent.tsx`:
- Line 169: `text-white/40` button with hover → `/50` (interactive)
- Line 192: `text-white/40` button with hover → `/50` (interactive)
- Line 214: `text-white/20` decorative large quotation mark → KEEP (decorative, aria-hidden)
- Line 220: `text-white/40` attribution text → `/60` (readable attribution)
- Line 236: `text-white/40` button → `/50` (interactive)
- Line 245: `text-white/30` verse number superscript → KEEP (decorative reference mark)
- Line 271: `text-white/40` label → `/60` (readable)
- Line 282: `text-white/40` text → `/60` (readable)

`VerseOfTheDayBanner.tsx`:
- Line 23: `text-white/40` icon → KEEP (decorative)
- Line 31: `text-white/40` verse reference link → `/60` (readable reference — users need to see which verse this is)

`GuidedPrayerSection.tsx`:
- Line 87: `text-white/40` duration badge → `/60` (readable — users need to see session duration)

`GuidedPrayerPlayer.tsx`:
- Line 113: `text-white/40` description → `/60` (readable)
- Line 172: `text-white/30` empty state icon → KEEP (decorative)
- Line 203: `text-white/30` placeholder text in empty state → `/60` (readable descriptive text)
- Line 223: `text-white/40` label → `/60` (readable)
- Line 254: `text-white/40` text → `/60` (readable)
- Line 256: `text-white/20` middot → KEEP (decorative separator)
- Line 260,268: `text-white/40` links with hover → `/50` (interactive)
- Line 264: `text-white/20` middot → KEEP (decorative separator)

`RelatedPlanCallout.tsx`:
- Line with `text-white/40` → `/60` (readable callout text)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change verse number superscripts — decorative reference marks
- DO NOT change decorative quotation marks or middot separators
- DO NOT change empty state icons

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| VerseOfTheDayBanner test | unit | Update `VerseOfTheDayBanner.test.tsx:81` assertion from `text-white/40` to `text-white/60` |
| Existing tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All readable labels, descriptions, attributions at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Decorative elements unchanged
- [ ] VerseOfTheDayBanner test updated

---

### Step 7: Ask Page + Prayer Wall

**Objective:** Remediate Ask page and Prayer Wall card components.

**Files to modify:**
- `frontend/src/pages/AskPage.tsx`
- `frontend/src/components/ask/AskResponseDisplay.tsx`
- `frontend/src/components/ask/PopularTopicsSection.tsx`
- `frontend/src/components/ask/VerseCardActions.tsx`
- `frontend/src/components/prayer-wall/PrayerCard.tsx`
- `frontend/src/components/prayer-wall/InlineComposer.tsx`
- `frontend/src/components/prayer-wall/CommentInput.tsx`
- `frontend/src/components/prayer-wall/CommentItem.tsx`
- `frontend/src/components/prayer-wall/CategoryBadge.tsx`

**Details:**

`AskPage.tsx`:
- Line 249: `placeholder:text-white/40` → `placeholder:text-white/50`

`AskResponseDisplay.tsx`:
- Line 88: `text-white/40` response metadata → `/60` (readable)

`PopularTopicsSection.tsx`:
- Line 30: `text-white/40` icon → KEEP (decorative)

`VerseCardActions.tsx`:
- Line 125: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 130: `text-white/40` text → `/60` (readable label)
- Line 137: `text-white/40` button with hover → `/50` (interactive)

`PrayerCard.tsx`:
- Line 102: `text-white/40` separator → KEEP (decorative ·)
- Line 105: `text-white/40` timestamp → `/60` (readable)

`InlineComposer.tsx`:
- Line 111: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 177: `text-white/40` secondary text → `/60` (readable)

`CommentInput.tsx`:
- Line 37: `text-white/40` button text → `/50` (interactive button)
- Line 80: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 91: `text-white/20` disabled send icon → KEEP (disabled state)

`CommentItem.tsx`:
- Line 55: `text-white/40` separator → KEEP (decorative ·)
- Line 56: `text-white/40` timestamp → `/60` (readable)
- Line 66: `text-white/40` button with hover → `/50` (interactive)

`CategoryBadge.tsx`:
- Line 16: `text-white/40` badge with hover → `/50` (interactive, clickable category)
- Line 25: `text-white/40` badge text → `/60` (readable label on non-interactive badge)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change PopularTopicsSection icon — decorative
- DO NOT change PrayerCard separator dot — decorative
- DO NOT change CommentInput disabled send icon — disabled state
- DO NOT change CommentItem separator dot — decorative

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Timestamps at `/60`
- [ ] Interactive elements at `/50`
- [ ] Decorative separators unchanged

---

### Step 8: Prayer Wall Forms + Auth Modal

**Objective:** Remediate auth modal, report dialog, and prayer wall dashboard.

**Files to modify:**
- `frontend/src/components/prayer-wall/AuthModal.tsx`
- `frontend/src/components/prayer-wall/ReportDialog.tsx`
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx`
- `frontend/src/pages/PrayerWallDashboard.tsx`

**Details:**

`AuthModal.tsx` (7 occurrences):
- Lines 179, 213, 225, 241, 265, 289: `placeholder:text-white/40` → `placeholder:text-white/50` (all form inputs)
- Line 312: `text-white/40` "or" divider text → `/50` (per spec: divider text to `/50`)

`ReportDialog.tsx`:
- Line 76: `text-white/40` button with hover → `/50` (interactive)
- Line 116: `placeholder:text-white/40` → `placeholder:text-white/50`

`MarkAsAnsweredForm.tsx`:
- Line 49: `placeholder:text-white/40` → `placeholder:text-white/50`

`PrayerWallDashboard.tsx`:
- Line 187: `text-white/40` text → `/60` (readable)
- Line 221: `text-white/40` button with hover → `/50` (interactive)
- Line 243: `text-white/40` text → `/60` (readable)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change AuthModal input field styling beyond placeholder color

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing auth modal tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All AuthModal placeholders at `/50`
- [ ] "Or" divider at `/50`
- [ ] Report dialog placeholder at `/50`
- [ ] PrayerWallDashboard readable text at `/60`

---

### Step 9: My Prayers + Settings

**Objective:** Remediate personal prayer management and settings pages.

**Files to modify:**
- `frontend/src/components/my-prayers/PrayerComposer.tsx`
- `frontend/src/components/my-prayers/MarkAnsweredForm.tsx`
- `frontend/src/components/my-prayers/ReminderToggle.tsx`
- `frontend/src/components/settings/ProfileSection.tsx`
- `frontend/src/components/settings/NotificationsSection.tsx`
- `frontend/src/components/settings/DashboardSection.tsx`
- `frontend/src/components/settings/PrivacySection.tsx`
- `frontend/src/components/settings/ToggleSwitch.tsx`

**Details:**

`PrayerComposer.tsx`:
- Line 78: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 105: `placeholder:text-white/40` → `placeholder:text-white/50`

`MarkAnsweredForm.tsx`:
- Line 31: `placeholder:text-white/40` → `placeholder:text-white/50`

`ReminderToggle.tsx`:
- Line 55: `text-white/40` help text → `/60` (readable)

`ProfileSection.tsx`:
- Lines 144, 172: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 155: `text-white/40` character counter → `/60` (readable, users need to see remaining chars)
- Line 178: `text-white/40` help text → `/60` (readable)

`NotificationsSection.tsx`:
- Lines 43, 57, 85, 106: `text-white/40` section headers → `/60` (readable section labels)
- Line 75: `text-white/40` help text → `/60` (readable)

`DashboardSection.tsx`:
- Line 18: `text-white/40` link → `/50` (interactive)

`PrivacySection.tsx`:
- Line 101: `text-white/40` description → `/60` (readable)

`ToggleSwitch.tsx`:
- Line 22: `text-white/40` description → `/60` (readable setting description)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change any Settings input field styling beyond placeholder and text color

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing settings tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Section headers, descriptions, help text at `/60`
- [ ] Character counters at `/60`

---

### Step 10: Friends + Social + Leaderboard

**Objective:** Remediate social features.

**Files to modify:**
- `frontend/src/components/friends/FriendSearch.tsx`
- `frontend/src/components/friends/FriendRow.tsx`
- `frontend/src/components/friends/InviteSection.tsx`
- `frontend/src/components/friends/SuggestionsSection.tsx`
- `frontend/src/components/friends/PendingRequests.tsx`
- `frontend/src/components/social/NudgeButton.tsx`
- `frontend/src/components/social/EncourageButton.tsx`
- `frontend/src/components/social/MilestoneFeed.tsx`
- `frontend/src/components/leaderboard/GlobalLeaderboard.tsx`
- `frontend/src/components/leaderboard/TimeToggle.tsx`
- `frontend/src/components/leaderboard/ProfilePopup.tsx`

**Details:**

`FriendSearch.tsx`:
- Line 108: `text-white/40` search icon → KEEP (decorative)
- Line 124: `placeholder:text-white/30` → `placeholder:text-white/50`
- Line 136: `text-white/40` text → `/60` (readable)
- Line 167,170: `text-white/40` status text → `/60` (readable)

`FriendRow.tsx`:
- Line 99: `text-white/40` activity text → `/60` (readable)
- Line 121: `text-white/40` button → `/50` (interactive)

`InviteSection.tsx`:
- Line 104: `placeholder:text-white/30` → `placeholder:text-white/50`

`SuggestionsSection.tsx`:
- Line 55: `text-white/40` text → `/60` (readable)
- Line 61: `text-white/40` disabled badge → KEEP (intentionally muted disabled state)

`PendingRequests.tsx`:
- Line 125: `text-white/40` status badge → `/60` (readable status)
- Line 130: `text-white/40` link → `/50` (interactive)

`NudgeButton.tsx`:
- Line 69: `text-white/30` cooldown text → `/60` (readable — tells user when nudge is available)
- Line 80: `text-white/40` button with hover → `/50` (interactive)

`EncourageButton.tsx`:
- Line 74: `text-white/40` disabled state → KEEP (disabled)
- Line 75: `text-white/40` button with hover → `/50` (interactive)

`MilestoneFeed.tsx`:
- Line 71: `text-white/40` timestamp → `/60` (readable)

`GlobalLeaderboard.tsx`:
- Line 112: `text-white/40` text → `/60` (readable)
- Line 154: `text-white/30` disabled state → KEEP (disabled, cursor-default)

`TimeToggle.tsx`:
- Line 27: `text-white/40` button with hover → `/50` (interactive)

`ProfilePopup.tsx`:
- Line 54: `text-white/40` separator → KEEP (decorative)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change FriendSearch icon — decorative
- DO NOT change SuggestionsSection disabled badge — disabled state
- DO NOT change EncourageButton disabled state — disabled
- DO NOT change GlobalLeaderboard disabled state — disabled
- DO NOT change ProfilePopup separator — decorative

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing social/friends tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Readable text, timestamps at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Disabled/decorative elements unchanged

---

### Step 11: Bible Reader Components

**Objective:** Remediate Bible reader, notes, highlights, and audio controls.

**Files to modify:**
- `frontend/src/components/bible/VerseDisplay.tsx`
- `frontend/src/components/bible/TestamentAccordion.tsx`
- `frontend/src/components/bible/BookEntry.tsx`
- `frontend/src/components/bible/BibleSearchMode.tsx`
- `frontend/src/components/bible/AudioControlBar.tsx`
- `frontend/src/components/bible/SleepTimerPanel.tsx`
- `frontend/src/components/bible/NoteEditor.tsx`
- `frontend/src/components/bible/NoteIndicator.tsx`
- `frontend/src/components/bible/HighlightsNotesSection.tsx`
- `frontend/src/components/bible/BibleAmbientChip.tsx`
- `frontend/src/components/bible/BookCompletionCard.tsx`
- `frontend/src/components/bible/CategoryGroup.tsx`

**Details:**

`VerseDisplay.tsx`:
- Line 330: `text-white/30` verse number superscript → KEEP (decorative reference mark)
- Line 371: `text-white/40` link with hover → `/50` (interactive)

`TestamentAccordion.tsx`:
- Line 46: `text-white/40` text → `/60` (readable chapter/verse count)
- Line 51: `text-white/40` button → `/50` (interactive)

`BookEntry.tsx`:
- Line 34: `text-white/40` badge → `/60` (readable percentage badge)
- Line 39: `text-white/40` text → `/60` (readable)
- Line 45: `text-white/40` text → `/60` (readable)
- Line 51: `text-white/40` button → `/50` (interactive)

`BibleSearchMode.tsx`:
- Lines 54, 90, 108, 116: `text-white/40` text → `/60` (readable search results and labels)

`AudioControlBar.tsx`:
- Line 110: `text-white/20` disabled button → KEEP (disabled state)
- Line 111: `text-white/40` button with hover → `/50` (interactive)
- Line 168,180: `text-white/30` inactive gender toggle → KEEP (indicates non-selected option, decorative toggle state)
- Line 205: `text-white/40` button conditional → `/50` (interactive)

`SleepTimerPanel.tsx`:
- Line 148: `text-white/40` button → `/50` (interactive)
- Line 247: `placeholder:text-white/30` → `placeholder:text-white/50`
- Line 254: `text-white/40` label → `/60` (readable)
- Line 270: `text-white/40` button with hover → `/50` (interactive)

`NoteEditor.tsx`:
- Line 63: `placeholder:text-white/30` → `placeholder:text-white/50`
- Line 89: `text-white/40` button → `/50` (interactive)
- Line 98: `text-white/30` "Cancel" button → `/50` (interactive text, users need to find it)
- Line 121: `text-white/40` button → `/50` (interactive)

`NoteIndicator.tsx`:
- Lines 92, 101: `text-white/30` note/link text with hover → `/50` (interactive)
- Line 121: `text-white/40` button → `/50` (interactive)

`HighlightsNotesSection.tsx`:
- Line 114: `text-white/40` text → `/60` (readable)
- Line 152: `text-white/40` text → `/60` (readable)

`BibleAmbientChip.tsx`:
- Line 189: `text-white/40` button with hover → `/50` (interactive)

`BookCompletionCard.tsx`:
- Line 26: `text-white/40` button → `/50` (interactive)

`CategoryGroup.tsx`:
- Line 27: `text-white/40` header → `/60` (readable section header)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change verse number superscripts — decorative reference marks
- DO NOT change AudioControlBar disabled button or inactive gender toggle — state indicators
- DO NOT change `text-white/90` on NoteEditor textarea text color — already meets standards

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing bible tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Readable labels, text at `/60`
- [ ] Interactive buttons/links at `/50`
- [ ] Verse superscripts unchanged
- [ ] Disabled/toggle state indicators unchanged

---

### Step 12: Reading Plans + Challenges

**Objective:** Remediate reading plan and challenge components.

**Files to modify:**
- `frontend/src/components/reading-plans/DaySelector.tsx`
- `frontend/src/components/reading-plans/DayContent.tsx`
- `frontend/src/components/reading-plans/CreatePlanFlow.tsx`
- `frontend/src/components/reading-plans/PlanCompletionOverlay.tsx`
- `frontend/src/components/challenges/ChallengeDaySelector.tsx`
- `frontend/src/components/challenges/ChallengeDayContent.tsx`
- `frontend/src/components/challenges/PastChallengeCard.tsx`
- `frontend/src/components/challenges/ChallengeCompletionOverlay.tsx`
- `frontend/src/components/challenges/ChallengeBanner.tsx`
- `frontend/src/components/challenges/HallOfFame.tsx`
- `frontend/src/components/challenges/CommunityFeed.tsx`

**Details:**

`DaySelector.tsx`:
- Line 160: `text-white/30` locked day text → KEEP (locked/disabled state)
- Line 168: `text-white/30` lock icon → KEEP (decorative lock on locked days)

`DayContent.tsx`:
- Line 24: `text-white/40` button → `/50` (interactive)
- Line 30: `text-white/30` verse superscript → KEEP (decorative reference mark)
- Line 41,53: `text-white/40` labels → `/60` (readable section labels)
- Line 64: `text-white/40` text → `/60` (readable)

`CreatePlanFlow.tsx`:
- Line 195: `placeholder:text-white/30` → `placeholder:text-white/50`
- Line 317: `text-white/40` attribution → `/60` (readable)

`PlanCompletionOverlay.tsx`:
- Line 119: `text-white/40` attribution → `/60` (readable)

`ChallengeDaySelector.tsx`:
- Line 163: `text-white/30` locked day → KEEP (locked/disabled)
- Line 171: `text-white/30` lock icon → KEEP (decorative)

`ChallengeDayContent.tsx`:
- Line 60: `text-white/40` label → `/60` (readable)
- Line 70: `text-white/40` header → `/60` (readable)
- Line 89: `text-white/40` text → `/60` (readable)

`PastChallengeCard.tsx`:
- Line 30: `text-white/40` icon → KEEP (decorative)
- Line 50: `text-white/40` badge → `/60` (readable status badge)

`ChallengeCompletionOverlay.tsx`:
- Line 247: `text-white/40` link with hover → `/50` (interactive)

`ChallengeBanner.tsx`:
- Line 174: `text-white/40` close button with hover → `/50` (interactive)

`HallOfFame.tsx`:
- Line 33: `text-white/40` text → `/60` (readable)

`CommunityFeed.tsx`:
- Line 38: `text-white/40` timestamp → `/60` (readable)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change locked day indicators — intentional disabled/locked state
- DO NOT change lock icons — decorative
- DO NOT change verse superscripts — decorative reference marks
- DO NOT change PastChallengeCard decorative icon

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Readable labels, timestamps, attributions at `/60`
- [ ] Interactive elements at `/50`
- [ ] Locked/disabled states unchanged

---

### Step 13: Insights + Monthly Report

**Objective:** Remediate insights analytics and reporting components.

**Files to modify:**
- `frontend/src/components/insights/InsightCards.tsx`
- `frontend/src/components/insights/MeditationHistory.tsx`
- `frontend/src/components/insights/GratitudeCorrelationCard.tsx`
- `frontend/src/components/insights/MonthHeatmap.tsx`
- `frontend/src/components/insights/CalendarHeatmap.tsx`
- `frontend/src/components/insights/EmailPreviewModal.tsx`
- `frontend/src/components/insights/ActivityCorrelations.tsx`
- `frontend/src/components/insights/MonthlyInsightCards.tsx`
- `frontend/src/components/insights/ScriptureConnections.tsx`
- `frontend/src/pages/MonthlyReport.tsx`

**Details:**

`InsightCards.tsx`:
- Line 86: `text-white/30` icon → KEEP (decorative empty state icon)
- Line 123,140: `text-white/40` labels → `/60` (readable chart labels)
- Line 151: `text-white/40` text → `/60` (readable)

`MeditationHistory.tsx`:
- Lines 178, 186, 194: `text-white/40` stat labels → `/60` (readable — "Total Sessions", "Total Minutes", etc.)
- Line 316: `text-white/40` text → `/60` (readable)

`GratitudeCorrelationCard.tsx`:
- Line 66: `text-white/40` text → `/60` (readable)

`MonthHeatmap.tsx`:
- Line 108: `text-white/40` calendar day number → `/60` (readable — users need to see dates)

`CalendarHeatmap.tsx`:
- Lines 199, 220: `text-white/40` labels → `/60` (readable day-of-week and month labels)

`EmailPreviewModal.tsx`:
- Line 103: `text-white/40` text → `/60` (readable)

`ActivityCorrelations.tsx`:
- Line 133: `text-white/40` text → `/60` (readable)

`MonthlyInsightCards.tsx`:
- Line 36: `text-white/40` label → `/60` (readable)

`ScriptureConnections.tsx`:
- Line 59: `text-white/40` text → `/60` (readable)

`MonthlyReport.tsx`:
- Line 120: `text-white/40` button with hover → `/50` (interactive)
- Line 129: `text-white/40` button with hover → `/50` (interactive)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change InsightCards empty state icon — decorative
- DO NOT change any data visualization colors (chart dots, heatmap squares use mood colors, not white opacity)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing insight tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All chart labels, stat labels at `/60`
- [ ] Readable text at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Empty state icon unchanged

---

### Step 14: Audio + Music Components

**Objective:** Remediate audio mixer, sleep timer, and music components.

**Files to modify:**
- `frontend/src/components/audio/SoundCard.tsx`
- `frontend/src/components/audio/AudioPill.tsx`
- `frontend/src/components/audio/RoutineStepper.tsx`
- `frontend/src/components/audio/SavedMixRow.tsx`
- `frontend/src/components/audio/SaveMixButton.tsx`
- `frontend/src/components/audio/MixerTabContent.tsx`
- `frontend/src/components/audio/TimerTabContent.tsx`
- `frontend/src/components/music/SpotifyEmbed.tsx`
- `frontend/src/components/music/RoutineBuilder.tsx`
- `frontend/src/components/music/FavoriteButton.tsx`

**Details:**

`SoundCard.tsx`:
- Line 59: `text-white/40` loading icon → KEEP (decorative loading state)

`AudioPill.tsx`:
- Line 86: `text-white/40` button with hover → `/50` (interactive)

`RoutineStepper.tsx`:
- Line 43: `text-white/40` badge → `/60` (readable step indicator)
- Line 58: `text-white/40` badge text → `/60` (readable)

`SavedMixRow.tsx`:
- Line 138: `text-white/40` icon → KEEP (decorative)
- Line 143: `text-white/30` label text → `/60` (readable — shows sound count)
- Line 156: `text-white/40` button → `/50` (interactive)

`SaveMixButton.tsx`:
- Line 136: `placeholder:text-white/30` → `placeholder:text-white/50`

`MixerTabContent.tsx`:
- Line 35: `text-white/30` empty state icon → KEEP (decorative)

`TimerTabContent.tsx`:
- Line 308: `placeholder:text-white/30` → `placeholder:text-white/50`

`SpotifyEmbed.tsx`:
- Line 44: `text-white/40` offline icon → KEEP (decorative)

`RoutineBuilder.tsx`:
- Line 157: `text-white/40` text → `/60` (readable)
- Line 172: `text-white/30` clock icon → KEEP (decorative icon)
- Line 173: `text-white/40` duration label → `/60` (readable)
- Line 185: `text-white/40` label → `/60` (readable)
- Line 231: `text-white/40` button → `/50` (interactive)

`FavoriteButton.tsx`:
- Line 63: `text-white/30` unfavorited heart → KEEP (decorative state indicator)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change decorative icons (loading, offline, clock, unfavorited heart)
- DO NOT change MixerTabContent empty state icon

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing audio/music tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Readable labels and text at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Decorative icons unchanged

---

### Step 15: Local Support + Navigation + Remaining Files

**Objective:** Remediate local support, navigation, sharing, profile, PWA, and all remaining files.

**Files to modify:**
- `frontend/src/components/local-support/SearchControls.tsx`
- `frontend/src/components/local-support/ListingCard.tsx`
- `frontend/src/components/local-support/VisitButton.tsx`
- `frontend/src/components/local-support/SearchStates.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/MobileDrawer.tsx`
- `frontend/src/components/DesktopUserActions.tsx`
- `frontend/src/components/SeasonalBanner.tsx`
- `frontend/src/components/GrowthTeasersSection.tsx`
- `frontend/src/components/sharing/SharePanel.tsx`
- `frontend/src/components/shared/AvatarPickerModal.tsx`
- `frontend/src/components/shared/ProfileAvatar.tsx`
- `frontend/src/components/profile/ProfileBadgeShowcase.tsx`
- `frontend/src/components/profile/ProfileStats.tsx`
- `frontend/src/components/pwa/OfflineMessage.tsx`
- `frontend/src/App.tsx`

**Details:**

`SearchControls.tsx`:
- Line 157: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 206: `text-white/40` aria-hidden text → KEEP (hidden from users, decorative)

`ListingCard.tsx`:
- Line 34: `text-white/20` unfilled star → KEEP (decorative star rating)
- Line 94: `text-white/30` ImageOff icon → KEEP (decorative placeholder icon)

`VisitButton.tsx`:
- Line 147: `placeholder:text-white/40` → `placeholder:text-white/50`
- Line 150: `text-white/40` text → `/60` (readable)

`SearchStates.tsx`:
- Lines 24, 42: `text-white/40` empty state icons → KEEP (decorative)

`Navbar.tsx`:
- Line 100: `text-white/40` icon → KEEP (decorative)

`MobileDrawer.tsx`:
- Line 45: `text-white/30` section heading ("LOCAL SUPPORT" etc.) → `/50` (readable section heading, uppercase small text)
- Line 201: `text-white/40` icon → KEEP (decorative)
- Line 204: `text-white/40` text → `/60` (readable label)

`DesktopUserActions.tsx`:
- Line 86: `text-white/40` icon → KEEP (decorative)

`SeasonalBanner.tsx`:
- Line 81: `text-white/40` icon → KEEP (decorative)
- Line 84: `text-white/40` separator → KEEP (decorative)
- Line 97: `text-white/40` close button with hover → `/50` (interactive)

`GrowthTeasersSection.tsx`:
- Line 27: `text-white/40` lock icon → KEEP (decorative locked state)
- Line 79: `text-white/30` lock icon → KEEP (decorative locked state)

`SharePanel.tsx`:
- Line 333: `text-white/40` button → `/50` (interactive)

`AvatarPickerModal.tsx`:
- Lines 243, 284: `text-white/40` section headers → `/60` (readable)
- Line 326: `text-white/40` locked avatar icon → KEEP (decorative locked state)
- Line 398: `text-white/40` upload zone text → `/60` (readable instruction)

`ProfileAvatar.tsx`:
- Line 117: `text-white/40` icon → KEEP (decorative fallback avatar icon)

`ProfileBadgeShowcase.tsx`:
- Line 102: `text-white/40` unearned badge → KEEP (intentionally muted, decorative locked)
- Line 109: `text-white/40` lock icon → KEEP (decorative)

`ProfileStats.tsx`:
- Line 11: `text-white/40` text → `/60` (readable stat label)
- Line 58: `text-white/40` extra info → `/60` (readable)

`OfflineMessage.tsx`:
- Line 7: Comment referencing `text-white/40` → update comment if present
- Line 17: `text-white/40` conditional icon → KEEP (decorative offline icon)

`App.tsx`:
- Line 79: `text-white/30`/`text-white/20` loading animation → KEEP (decorative loading spinner)

**Responsive behavior:** N/A: no layout changes.

**Guardrails (DO NOT):**
- DO NOT change any decorative icons (Navbar, DesktopUserActions, SeasonalBanner, SearchStates, etc.)
- DO NOT change lock icons on GrowthTeasersSection — decorative locked preview
- DO NOT change unfilled star ratings — decorative
- DO NOT change ProfileAvatar fallback icon — decorative
- DO NOT change locked badge styling — decorative
- DO NOT change App.tsx loading animation — decorative
- DO NOT change aria-hidden text — not visible to users

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| OfflineMessage test | unit | Update `OfflineMessage.test.tsx:24` if assertion references `text-white/40` |
| Existing tests | regression | Run full suite |

**Expected state after completion:**
- [ ] All placeholders at `/50`
- [ ] Readable text, labels, section headers at `/60`
- [ ] Interactive buttons at `/50`
- [ ] Mobile drawer section headings at `/50`
- [ ] All decorative elements unchanged

---

### Step 16: Test File Updates

**Objective:** Update remaining test files that assert specific opacity classes changed in prior steps.

**Files to modify:**
- `frontend/src/components/shared/__tests__/VerseLink.test.tsx`
- `frontend/src/components/pwa/__tests__/OfflineMessage.test.tsx`

**Details:**

`VerseLink.test.tsx`:
- Line 40: Change test input className from `text-white/40` to `text-white/60`
- Line 42: Update assertion from `text-white/40` to `text-white/60`
- Note: Check the VerseLink component itself — if it accepts a className prop and the test is passing a custom class, the test may be testing that the component applies the passed class. In that case, the test value should match whatever the consuming component now passes. Read the VerseLink component to confirm.

`OfflineMessage.test.tsx`:
- Line 24: If the assertion still references `text-white/40`, update to match whatever the component now uses. (May already be handled in Step 15 if the icon was kept.)

Note: `CharacterCount.test.tsx` was updated in Step 1. `VerseOfTheDayBanner.test.tsx` was updated in Step 6. `GrowthGarden.test.tsx` was updated in Step 2.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT change test logic, only update class name assertions to match new component values
- DO NOT remove any tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Updated tests | regression | Run full suite to confirm all 4,862+ tests pass |

**Expected state after completion:**
- [ ] All test assertions match new opacity values
- [ ] Full test suite passes with 0 failures

---

### Step 17: Design System Documentation

**Objective:** Add Text Opacity Standards section to the design system rules file.

**Files to modify:**
- `frontend/src/.claude/rules/09-design-system.md` — No, this is at project root: `.claude/rules/09-design-system.md`

**Details:**

Add the following section after the "Dashboard Card Pattern" section in `.claude/rules/09-design-system.md`:

```markdown
### Text Opacity Standards (WCAG AA)

All text on dark backgrounds must meet these minimum opacity values:

| Use Case | Minimum | Class |
|----------|---------|-------|
| Primary text | 70% | `text-white/70` |
| Secondary text | 60% | `text-white/60` |
| Placeholder text | 50% | `placeholder:text-white/50` |
| Large headings (18px+) | 60% | `text-white/60` |
| Interactive text (buttons/links) | 50% | `text-white/50` |
| Decorative / disabled | 20-40% | `text-white/20` to `text-white/40` |

Body text below `text-white/60` fails WCAG AA 4.5:1 on hero-dark (#0D0620).
Placeholder text below `placeholder:text-white/50` fails WCAG AA 3:1 on input backgrounds.

**Exempt from contrast requirements:** decorative icons, locked badge silhouettes, verse number superscripts, middot separators, disabled/locked state indicators, background decorations.
```

Also update the "Known Issues" section to remove the WCAG AA contrast bullet point since it's been resolved.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT modify any other sections of the design system file
- DO NOT change color palette or typography values

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | Documentation change, no tests needed |

**Expected state after completion:**
- [ ] Text Opacity Standards section added to `09-design-system.md`
- [ ] Known Issues updated to remove WCAG contrast bullet
- [ ] Standards available for all future feature development

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Shared UI components (FeatureEmptyState, CharacterCount, FormField) |
| 2 | — | Dashboard core cards |
| 3 | — | Dashboard widgets batch 1 |
| 4 | — | Dashboard widgets batch 2 |
| 5 | — | Daily Hub + Pray tab |
| 6 | — | Daily Hub remaining tabs |
| 7 | — | Ask page + Prayer Wall cards |
| 8 | — | Prayer Wall forms + Auth Modal |
| 9 | — | My Prayers + Settings |
| 10 | — | Friends + Social + Leaderboard |
| 11 | — | Bible reader components |
| 12 | — | Reading Plans + Challenges |
| 13 | — | Insights + Monthly Report |
| 14 | — | Audio + Music components |
| 15 | — | Local Support + Navigation + Remaining |
| 16 | 1-15 | Test file updates (depends on all component changes) |
| 17 | — | Design system documentation |

Note: Steps 1-15 are independent of each other (no cross-dependencies) and could theoretically run in parallel. Step 16 depends on all prior steps being complete to know final class values for assertions.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Shared UI Components | [COMPLETE] | 2026-03-30 | FeatureEmptyState icon /20→/30, desc /50→/60; PrayerListEmptyState icon /20→/30; CharacterCount normal /40→/60; FormField help /40→/60; CharacterCount test updated |
| 2 | Dashboard Core Cards | [COMPLETE] | 2026-03-30 | DashboardCard collapse /40→/50; MoodCheckIn placeholder /40→/50, skip link /40→/50; ActivityChecklist pts /30→/60; GettingStartedCard buttons /40→/50, hint /30→/60; Dashboard garden label /40→/60; GrowthGarden test updated |
| 3 | Dashboard Widgets Batch 1 | [COMPLETE] | 2026-03-30 | GratitudeWidget desc /40→/60, placeholder /30→/50; RecentHighlightsWidget timestamp /40→/60; VerseOfTheDayCard btn /40→/50; ReadingPlanWidget /40→/60; ChallengeWidget labels /40→/60; WeeklyRecap dismiss /40→/50; WeeklyGodMoments dismiss /40→/50 |
| 4 | Dashboard Widgets Batch 2 | [COMPLETE] | 2026-03-30 | WelcomeWizard btn /40→/50, placeholder /30→/50; EveningReflection close /40→/50, placeholders /40→/50 and /30→/50; EveningReflectionBanner dismiss /40→/50; MoodRecommendations link /40→/50; NotificationItem dismiss /40→/50 |
| 5 | Daily Hub + Pray Tab | [COMPLETE] | 2026-03-30 | DailyHub share btn /40→/50; PrayerInput placeholder /40→/50; PrayerResponse skip /40→/50, sound text /40→/60, links /40→/50; AmbientSoundPill /40→/50; JournalInput placeholder /40→/50; JournalSearchFilter placeholder /40→/50, clear btn /40→/50 |
| 6 | Daily Hub Remaining Tabs | [COMPLETE] | 2026-03-30 | SavedEntriesList timestamps /40→/60; DevotionalTabContent nav /40→/50, attribution /40→/60, share /40→/50, labels /40→/60; VerseOfTheDayBanner ref /40→/60; GuidedPrayerSection /40→/60; GuidedPrayerPlayer desc /40→/60, still text /30→/60, time /40→/60, sound /40→/60, links /40→/50; RelatedPlanCallout /40→/60; VotdBanner test updated |
| 7 | Ask Page + Prayer Wall | [COMPLETE] | 2026-03-30 | AskPage placeholder /40→/50; AskResponseDisplay /40→/60; VerseCardActions placeholder /40→/50, count /40→/60, cancel /40→/50; PrayerCard timestamp /40→/60; InlineComposer placeholder /40→/50, text /40→/60; CommentInput btn /40→/50, placeholder /40→/50; CommentItem timestamp /40→/60, reply /40→/50; CategoryBadge interactive /40→/50, static /40→/60 |
| 8 | Prayer Wall Forms + Auth Modal | [COMPLETE] | 2026-03-30 | AuthModal 6 placeholders /40→/50, "or" /40→/50; ReportDialog btn /40→/50, placeholder /40→/50; MarkAsAnsweredForm placeholder /40→/50; PrayerWallDashboard text /40→/60, edit btn /40→/50, bio count /40→/60 |
| 9 | My Prayers + Settings | [COMPLETE] | 2026-03-30 | 8 files edited, 132 tests pass |
| 10 | Friends + Social + Leaderboard | [COMPLETE] | 2026-03-30 | 11 files edited, 143 tests pass |
| 11 | Bible Reader Components | [COMPLETE] | 2026-03-30 | 12 files edited, 108 tests pass |
| 12 | Reading Plans + Challenges | [COMPLETE] | 2026-03-30 | 11 files, 43 edits across steps 12-14 |
| 13 | Insights + Monthly Report | [COMPLETE] | 2026-03-30 | 10 files, insights + monthly report |
| 14 | Audio + Music Components | [COMPLETE] | 2026-03-30 | 6 files, audio + music components |
| 15 | Local Support + Nav + Remaining | [COMPLETE] | 2026-03-30 | 8 files edited, 147 tests pass |
| 16 | Test File Updates | [COMPLETE] | 2026-03-30 | VerseLink test /40→/60; OfflineMessage test unchanged (icon kept at /40); CharacterCount test updated in Step 1; VerseOfTheDayBanner test updated in Step 6; GrowthGarden test updated in Step 2. Full suite: 4944 pass, 6 fail (pre-existing date-dependent challenge test failures, verified on unchanged code) |
| 17 | Design System Documentation | [COMPLETE] | 2026-03-30 | Added Text Opacity Standards section to 09-design-system.md after Dashboard Card Pattern; removed WCAG AA contrast bullet from Known Issues |
