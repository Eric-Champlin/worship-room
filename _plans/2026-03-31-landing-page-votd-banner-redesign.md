# Implementation Plan: Landing Page VOTD Banner Redesign

**Spec:** `_specs/landing-page-votd-banner-redesign.md`
**Date:** 2026-03-31
**Branch:** `claude/feature/landing-page-votd-banner-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Current State

The Daily Hub greeting area (lines 219–297 in `DailyHub.tsx`) renders a **two-column card grid** above the tab bar:

```
[Good Morning, Name!]

[Verse of the Day card]  [Daily Devotional card]
```

Both cards use: `rounded-xl border border-white/10 bg-white/[0.08] p-5 text-left backdrop-blur-sm sm:min-h-[140px]`

- **Left card (VOTD):** Styled `<div>` containing a `<Link>` to Bible reader, verse text in Lora italic, reference with em dash, "Meditate on this verse >" link, Share2 icon button, and `<SharePanel>`.
- **Right card (Devotional):** `<button>` that calls `switchTab('devotional')`. Shows "DAILY DEVOTIONAL" label, title, checkmark (if read), theme pill, "Read today's devotional >" CTA.

### Target State

Remove the devotional card entirely. Transform the VOTD into a **full-width frosted glass banner**:

```
[Good Morning, Name!]

[──────────────────── VOTD full-width banner ────────────────────]

[Tabs: Devotional | Pray | Journal | Meditate]
```

### Relevant Files

| File | Role |
|------|------|
| `frontend/src/pages/DailyHub.tsx` (lines 62–466) | Main page — greeting area + tabs |
| `frontend/src/pages/__tests__/DailyHub.test.tsx` (377 lines) | Tests for greeting area |
| `frontend/src/components/sharing/SharePanel.tsx` | Verse sharing (reused as-is) |
| `frontend/src/constants/verse-of-the-day.ts` | `getTodaysVerse()` function |
| `frontend/src/data/devotionals.ts` | `getTodaysDevotional()` — still used by DevotionalTabContent, NOT removed |
| `frontend/src/components/daily/VerseOfTheDayBanner.tsx` | Separate compact banner (NOT touched by this spec) |
| `frontend/src/components/dashboard/VerseOfTheDayCard.tsx` | Dashboard widget (NOT touched) |
| `frontend/src/components/dashboard/TodaysDevotionalCard.tsx` | Dashboard widget (NOT touched) |

### Patterns to Follow

- **Frosted glass card:** `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (Dashboard Card Pattern from `09-design-system.md`)
- **Scripture typography:** `font-serif italic` (Lora) — existing pattern in VOTD card
- **Hero background:** `ATMOSPHERIC_HERO_BG` from `PageHero.tsx` — already in use
- **Share functionality:** `<SharePanel>` component with `verseText`, `reference`, `isOpen`, `onClose` props
- **Test wrapping:** `MemoryRouter` + `ToastProvider` + `AuthModalProvider` (see existing `DailyHub.test.tsx` lines 78–91)

### Data Sources Preserved

- `getTodaysVerse()` — deterministic daily rotation, seasonal priority
- `getTodaysDevotional()` — still called for `DevotionalTabContent` prop; just not rendered in hero
- `hasReadDevotional` state — still needed for DevotionalTabContent `onComplete`; checkmark no longer in hero
- `parseVerseReferences()` / `verseLink` — still used for Bible reader link behavior

---

## Auth Gating Checklist

**No new auth gates.** The VOTD banner lives in the logged-in greeting area (rendered only when `isAuthenticated`). All existing auth checks remain unchanged.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View VOTD banner | Only for logged-in users | Step 1 | Existing: DailyHub renders greeting area only when authenticated |
| Share verse | Logged-in only (not visible otherwise) | Step 1 | Existing: SharePanel is within auth-gated section |
| "Meditate on this verse" | Logged-in only | Step 1 | Existing: meditation routes have route-level redirects |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| VOTD banner container | background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | 09-design-system.md Dashboard Card Pattern |
| VOTD banner padding | padding | `p-6 sm:p-8` | Spec requirement |
| Verse text | font | `font-serif italic` (Lora) | Existing VOTD card pattern (DailyHub.tsx:239) |
| Verse text | color | `text-white/90` | Spec + existing pattern |
| Verse text | size | `text-lg sm:text-xl` | Spec requirement |
| Verse text | line-height | `leading-relaxed` | Spec requirement |
| Reference | color | `text-white/60` | Spec requirement |
| Reference | size | `text-sm sm:text-base` | Spec requirement |
| Reference | spacing | `mt-3` from verse text | Spec requirement |
| Meditate link | color | `text-primary-lt hover:text-primary text-sm` | Spec requirement |
| Actions row | spacing | `mt-4` from reference | Spec requirement |
| Share button | min size | `min-h-[44px] min-w-[44px]` | Accessibility — 44px touch target |
| Grid container max-width | `max-w-3xl` | Matches existing card grid width (DailyHub.tsx:232) |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan`:**

- Worship Room uses Caveat (`font-script`) for script/highlighted headings, NOT Lora. Lora is for scripture text only.
- Frosted glass cards use `bg-white/5` (not `bg-white/[0.08]`). The spec explicitly calls for the Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`.
- The existing VOTD card uses `bg-white/[0.08]` which is slightly different from the Dashboard Card Pattern. The spec requires the standard pattern.
- Hero background is `ATMOSPHERIC_HERO_BG` (imported from `PageHero.tsx`) — dark with subtle purple radial gradient.
- Text hierarchy on dark: primary text `text-white/90`, secondary text `text-white/60`, muted text `text-white/50`.
- All interactive elements must meet 44px minimum touch target.
- `text-primary-lt` is `#8B5CF6`, `text-primary` is `#6D28D9`.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone feature. No new data models or localStorage keys.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_devotional_reads` | Read | Still read to set `hasReadDevotional` state for DevotionalTabContent — but no longer displayed in hero |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | VOTD banner full-width with `p-6` padding. Verse text `text-lg`. Actions stack below reference. |
| Tablet | 768px | VOTD banner at mid-width within `max-w-3xl`. Verse text `text-xl`. `p-8` padding. |
| Desktop | 1440px | VOTD banner wide horizontal card. Verse text `text-xl`. `p-8` padding. Actions row below reference. |

**No custom breakpoints.** The banner uses a simple stacking layout at all sizes — only padding and font sizes scale.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Greeting H1 → VOTD banner | `mt-6` (~24px) | Spec: "mb-6 or mb-8 — comfortable breathing room" / existing card grid uses `mt-6` (DailyHub.tsx:232) |
| VOTD banner → Quiz teaser | `mt-4` (~16px) | Existing quiz teaser spacing (DailyHub.tsx:300) |
| Quiz teaser → Tab bar sentinel | Existing spacing preserved | No change |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] The spec applies ONLY to the logged-in Daily Hub greeting area (not the logged-out landing page VOTD section)
- [x] `getTodaysDevotional()` is still imported and used — only the hero card rendering is removed
- [x] `hasReadDevotional` state is still needed for `DevotionalTabContent` onComplete callback
- [x] The `VerseOfTheDayBanner` component (`components/daily/VerseOfTheDayBanner.tsx`) is NOT affected
- [x] The dashboard `VotdWidget` component is NOT affected
- [x] All auth-gated actions from the spec are accounted for (none new)
- [x] Design system values are verified from design-system.md and codebase inspection
- [x] No [UNVERIFIED] values — all values come from the spec or existing codebase

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Keep `getTodaysDevotional()` import | Yes — still needed for `DevotionalTabContent` | Removing it would break the Devotional tab |
| Keep `hasReadDevotional` state | Yes — still needed for DevotionalTabContent's `onComplete` | The state tracks completion for the tab, not just the hero card |
| Keep `formatTheme()` helper | Remove — only used by devotional card in hero | Dead code after card removal |
| Bible reader link on verse text | Keep — wrap verse text in `<Link>` to Bible reader | Preserves existing navigation (DailyHub.tsx:235-245) |
| Share button position | Inline in actions row (not absolute-positioned) | Spec shows share button in the actions row, not floating in corner |
| `line-clamp` on verse text | Remove — spec wants full verse visible in banner | The old card needed clamping due to limited height; the full-width banner has space |
| `sm:min-h-[140px]` | Remove — no longer needed without side-by-side cards | The banner adapts to content height naturally |

---

## Implementation Steps

### Step 1: Replace Two-Column Card Grid with Full-Width VOTD Banner

**Objective:** Remove the devotional card from the greeting area and transform the VOTD into a full-width frosted glass banner.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — lines 231–297 (card grid section)

**Details:**

Replace lines 231–297 (the `<div className="mt-6 grid ...">` containing both cards) with a single full-width VOTD banner:

```tsx
{/* Verse of the Day — Full-Width Banner */}
<div className="mt-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm sm:p-8">
  <Link
    to={verseLink}
    className="block transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:rounded"
  >
    <p className="font-serif italic text-lg leading-relaxed text-white/90 sm:text-xl">
      &ldquo;{verse.text}&rdquo;
    </p>
  </Link>
  <p className="mt-3 text-sm text-white/60 sm:text-base">
    — {verse.reference}
  </p>
  <div className="mt-4 flex items-center gap-4">
    <Link
      to={`/meditate/soaking?verse=${encodeURIComponent(verse.reference)}`}
      className="inline-flex min-h-[44px] items-center text-sm text-primary-lt transition-colors hover:text-primary"
    >
      Meditate on this verse &gt;
    </Link>
    <button
      type="button"
      onClick={() => setSharePanelOpen(true)}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      aria-label="Share verse of the day"
      aria-haspopup="dialog"
      aria-expanded={sharePanelOpen}
    >
      <Share2 className="h-4 w-4" />
    </button>
  </div>
  <SharePanel
    verseText={verse.text}
    reference={verse.reference}
    isOpen={sharePanelOpen}
    onClose={() => setSharePanelOpen(false)}
  />
</div>
```

**Also in DailyHub.tsx:**

1. Remove the `formatTheme()` helper function (lines 55–60) — only used by the deleted devotional card.
2. Remove the `Check` and `ChevronRight` icon imports from lucide-react (line 3) — `Check` is still used in the tab bar, so only remove `ChevronRight`. Verify `Check` usage before removing.
3. Keep `getTodaysDevotional` import (line 15) — still used in `DevotionalTabContent` prop.
4. Keep `hasReadDevotional` state and `handleDevotionalComplete` callback — still wired to `DevotionalTabContent`.

**Wait — verify `Check` usage:** `Check` is used at line 285 (devotional card — being removed) AND at line 363 (tab bar checkmarks — kept). So `Check` stays, only remove `ChevronRight`.

**Responsive behavior:**
- Desktop (1440px): Banner full width within `max-w-3xl`, `p-8` padding, verse text `text-xl`
- Tablet (768px): Same as desktop, naturally contained by `max-w-3xl`
- Mobile (375px): Banner full width with `p-6` padding, verse text `text-lg`, actions flex-wrap naturally

**Guardrails (DO NOT):**
- DO NOT remove `getTodaysDevotional` import or `devotional` variable — DevotionalTabContent needs it
- DO NOT remove `hasReadDevotional` state — DevotionalTabContent's onComplete uses it
- DO NOT modify the logged-out landing page `VotdSection` or `HeroSection`
- DO NOT change the `VerseOfTheDayBanner` component (separate component, separate concern)
- DO NOT change `verse-of-the-day.ts` data or `getTodaysVerse()` logic
- DO NOT use `bg-white/[0.08]` — the spec requires the Dashboard Card Pattern `bg-white/5`
- DO NOT add `line-clamp` — the full-width banner should show the complete verse text

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders VOTD banner with verse text` | integration | Verify verse text appears in Lora italic within the banner |
| `renders verse reference with em dash` | integration | Verify "— {reference}" format |
| `verse links to Bible reader` | integration | Verify Link `href` starts with `/bible/` |
| `renders meditate link` | integration | Verify "Meditate on this verse >" link with `/meditate/soaking?verse=` href |
| `share button opens SharePanel` | integration | Verify share button has aria-label, click sets aria-expanded |
| `share button has accessible attributes` | unit | Verify aria-label, aria-haspopup="dialog" |
| `devotional card is NOT rendered` | integration | Verify no "DAILY DEVOTIONAL" label, no theme pill, no "Read today's devotional" text in hero |
| `no devotional checkmark in hero` | integration | Verify no "Already read today" text in hero section |
| `tab bar still functions after redesign` | integration | Verify tab switching works (click Journal, see Journal heading) |
| `VOTD banner has frosted glass styling` | unit | Verify banner container has `rounded-2xl`, `border-white/10`, `bg-white/5` classes |

**Expected state after completion:**
- [ ] Devotional card removed from greeting area
- [ ] VOTD renders as full-width frosted glass banner below greeting
- [ ] All VOTD functionality preserved (link, meditate, share)
- [ ] `ChevronRight` import removed, `Check` retained
- [ ] `formatTheme` helper removed

---

### Step 2: Update Tests

**Objective:** Update `DailyHub.test.tsx` to reflect the new banner layout and remove tests for the deleted devotional card.

**Files to modify:**
- `frontend/src/pages/__tests__/DailyHub.test.tsx`

**Details:**

**Tests to remove or update:**

1. **Remove** `renders devotional card with title` (lines 135–141) — devotional card no longer in hero
2. **Remove** `devotional card switches to devotional tab` (lines 143–156) — devotional card no longer in hero
3. **Remove** `shows "DAILY DEVOTIONAL" label in hero card` (lines 158–164) — label gone
4. **Remove** `shows theme pill` (lines 166–171) — theme pill gone
5. **Remove** `does NOT show devotional checkmark when logged out` (lines 173–177) — checkmark gone from hero
6. **Remove** `shows devotional checkmark when logged in and devotional read` (lines 179–185) — checkmark gone from hero
7. **Update** `renders verse reference with dash prefix` (lines 119–126) — the reference now uses `text-white/60` instead of `text-white/50`. Update selector.

**Tests to add:**

1. `VOTD banner has full-width frosted glass styling` — verify the banner container has `rounded-2xl` and `bg-white/5`
2. `devotional card is not rendered in hero` — verify no "Daily Devotional" or "Read today" text in hero section
3. `verse text is not line-clamped in banner` — verify the verse paragraph does NOT have `line-clamp` classes

**Tests to preserve (verify they still pass):**

- `renders a time-aware greeting with correct capitalization` (line 94)
- `hero title has padding for Caveat flourish fix` (line 100)
- `renders verse card with today's verse text` (line 112)
- `verse card links to Bible reader` (line 128)
- `share button opens SharePanel` (line 187)
- `share button has accessible label` (line 213)
- `verse card is keyboard navigable` (line 220)
- `tab bar still functions after hero redesign` (line 228)
- `Daily Hub VOTD shows meditation link` (line 370)
- All tab-related tests (lines 237–375)

**Responsive behavior:** N/A: no UI impact (test file)

**Guardrails (DO NOT):**
- DO NOT remove tests for tab bar functionality, quiz, or SongPickSection
- DO NOT add tests that mock `getTodaysVerse()` differently — the existing deterministic rotation is fine
- DO NOT change the test rendering wrapper pattern (MemoryRouter + ToastProvider + AuthModalProvider)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All removed tests are gone | verification | Confirm no references to "DAILY DEVOTIONAL", theme pill, devotional checkmark in hero tests |
| All preserved tests pass | verification | Run `pnpm test -- DailyHub` and verify 0 failures |

**Expected state after completion:**
- [ ] 6 obsolete devotional-card tests removed
- [ ] 3 new VOTD banner tests added
- [ ] Reference test updated for new `text-white/60` selector
- [ ] All remaining tests pass with 0 failures
- [ ] No lint or TypeScript errors

---

### Step 3: Verify Logged-Out Landing Page Unaffected

**Objective:** Confirm the logged-out landing page VOTD section is not broken by changes.

**Files to check (read-only, no modifications):**
- `frontend/src/pages/Home.tsx` — verify it does NOT import anything that was deleted
- `frontend/src/components/VotdSection.tsx` (or equivalent) — verify it does NOT reference removed code

**Details:**

Verify that:
1. The `Home` component does not import `formatTheme` or `ChevronRight` from sources we modified
2. The logged-out VOTD section uses its own data source call (likely `getTodaysVerse()` directly)
3. Run `pnpm build` to confirm no broken imports

**Responsive behavior:** N/A: no UI impact (verification only)

**Guardrails (DO NOT):**
- DO NOT modify any landing page files
- DO NOT modify `Home.tsx`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build passes | verification | `pnpm build` completes with 0 errors |
| Full test suite passes | verification | `pnpm test` — all tests pass |

**Expected state after completion:**
- [ ] `pnpm build` passes with 0 errors
- [ ] `pnpm test` passes with 0 failures
- [ ] Logged-out landing page is confirmed unaffected

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Replace card grid with full-width VOTD banner |
| 2 | 1 | Update tests to match new layout |
| 3 | 1, 2 | Verify build + full test suite + landing page unaffected |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Full-width VOTD banner | [COMPLETE] | 2026-03-31 | Modified `DailyHub.tsx`: removed `ChevronRight` import, `formatTheme` helper, two-column card grid. Added full-width VOTD banner with frosted glass styling. **Deviation from plan:** Also removed `getTodaysDevotional` import and `devotional` variable — they were dead code since `DevotionalTabContent` calls `getTodaysDevotional()` internally (plan assumed it was passed as a prop). |
| 2 | Update tests | [COMPLETE] | 2026-03-31 | Removed 6 obsolete devotional-card tests, added 3 new VOTD banner tests (frosted glass styling, no line-clamp, no devotional in hero), updated verse reference selector from `text-white/50` to `text-white/60`. All DailyHub tests pass (0 failures). |
| 3 | Verify build + landing page | [COMPLETE] | 2026-03-31 | Build passes (0 new errors). Full test suite: 4950 pass / 4 fail (all 4 pre-existing in ChallengeDetail/Challenges). Home.tsx does not import any removed code. Landing page unaffected. |
