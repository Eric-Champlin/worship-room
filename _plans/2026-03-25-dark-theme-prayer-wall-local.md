# Implementation Plan: Dark Theme — Prayer Wall & Local Support

**Spec:** `_specs/dark-theme-prayer-wall-local.md`
**Date:** 2026-03-25
**Branch:** `claude/feature/dark-theme-prayer-wall-local`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Existing Dark Theme Pattern (Established in Specs 1 & 2)

The DailyHub (`pages/DailyHub.tsx`) and Bible pages (`pages/BibleBrowser.tsx`, `pages/AskGodsWord.tsx`) established the dark theme conversion pattern:

- **Page background**: `bg-dashboard-dark` (Tailwind token mapping to `#0f0a1e`)
- **Hero gradient**: Fades to `#0f0a1e` instead of `#F5F5F5` — `PageHero` already has `dark` prop using `HERO_BG_DARK_STYLE`
- **Sticky tab bar**: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- **Content cards**: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl` (content); `bg-white/[0.08]` (structural elements)
- **Text hierarchy**: Primary `text-white`, secondary `text-white/70`, muted `text-white/40`, content `text-white/80`
- **Inputs**: `bg-white/[0.06] text-white placeholder:text-white/40`
- **Buttons (secondary)**: `bg-white/10 text-white/70 hover:bg-white/15`

### Key Files to Modify

**Prayer Wall Pages (4 pages):**
- `frontend/src/pages/PrayerWall.tsx` — Main feed (bg, empty state text)
- `frontend/src/pages/PrayerDetail.tsx` — Prayer detail (back link, not-found card)
- `frontend/src/pages/PrayerWallProfile.tsx` — User profile (header, tabs, content cards)
- `frontend/src/pages/PrayerWallDashboard.tsx` — Private dashboard (profile, tabs, settings card)

**Prayer Wall Components (13 components):**
- `frontend/src/components/prayer-wall/PageShell.tsx` — Shared page wrapper (bg)
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — Hero gradient
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Card bg, text
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Button colors, border
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Borders, CTA links
- `frontend/src/components/prayer-wall/CommentItem.tsx` — Text colors
- `frontend/src/components/prayer-wall/CommentInput.tsx` — Input, login button, crisis banner
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — Card, textarea, pills, crisis banner
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` — Badge bg/text
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Modal bg, text, input
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — Modal bg, text
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` — Form card, input
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — Already dark-ish (uses `bg-hero-mid`)

**Local Support Components (8+ files):**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — Page wrapper (bg, disclaimer, tabs, toggle, saved empty state)
- `frontend/src/components/local-support/LocalSupportHero.tsx` — Hero gradient
- `frontend/src/components/local-support/SearchControls.tsx` — Input, button, slider, labels
- `frontend/src/components/local-support/ResultsList.tsx` — Sort dropdown, filter dropdown
- `frontend/src/components/local-support/ResultsMap.tsx` — Map container, tile URL, popups
- `frontend/src/components/local-support/ListingCard.tsx` — Card bg, text, buttons, expanded details
- `frontend/src/components/local-support/ListingCTAs.tsx` — CTA border
- `frontend/src/components/local-support/SearchStates.tsx` — Icons, text, skeleton colors

**Local Support Page Components (pass config — no changes needed):**
- `frontend/src/pages/Churches.tsx` — No light classes
- `frontend/src/pages/Counselors.tsx` — Disclaimer text uses `border-amber-200 bg-amber-50 text-amber-800` (needs dark)
- `frontend/src/pages/CelebrateRecovery.tsx` — CR info panel already dark (`bg-white/10 text-white/80`)

### Already Dark (No Changes Required)
- `CategoryFilterBar.tsx` — Already uses `bg-hero-mid/90 backdrop-blur-sm border-b border-white/10` with white text
- `QuestionOfTheDay.tsx` — Already dark (`bg-hero-mid border-primary/30 text-white`)
- `CelebrateRecovery.tsx` CR info panel — Already `bg-white/10 text-white/80`
- `PageHero.tsx` — Has `dark` prop with `HERO_BG_DARK_STYLE` (gradient ending at `#0f0a1e`)

### Test Patterns
- Tests in `frontend/src/__tests__/` use Vitest + React Testing Library
- Components wrapped in `MemoryRouter` + `AuthModalProvider` + `ToastProvider` as needed
- Tests check `getByText`, `getByRole`, class assertions via `toHaveClass`
- Light-theme class assertions (e.g., `bg-white`, `text-text-dark`) will need updating to dark-theme equivalents

---

## Auth Gating Checklist

**No auth gating changes.** This spec is purely visual — all existing auth gates remain exactly as they are. The plan does not add, remove, or modify any auth checks.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No changes to auth gating | N/A | Existing gates preserved |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (`bg-dashboard-dark`) | tailwind.config.js:23 |
| Hero (dark) | gradient endpoint | `#0f0a1e` (via `HERO_BG_DARK_STYLE`) | PageHero.tsx:11-14 |
| Content card | bg + border | `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl` | Spec 1 pattern |
| Structural element | bg | `bg-white/[0.08]` | Spec 1 pattern |
| Primary text | color | `text-white` | DailyHub.tsx dark pattern |
| Secondary text | color | `text-white/70` | DailyHub.tsx dark pattern |
| Muted text | color | `text-white/40` | DailyHub.tsx dark pattern |
| Content text | color | `text-white/80` | Spec requirement |
| Input field | bg + text | `bg-white/[0.06] text-white placeholder:text-white/40` | Spec requirement |
| Button (secondary) | bg + text | `bg-white/10 text-white/70 hover:bg-white/15` | Spec requirement |
| Category pill (selected) | bg + border | `bg-primary/20 border-primary/40 text-primary-lt` | Spec requirement |
| Category pill (unselected) | bg + text | `bg-white/10 text-white/70` | Spec requirement |
| Comment nesting | bg | `bg-white/[0.04]` | Spec requirement |
| Dialog panel | bg + border | `bg-[#1a0f2e] border border-white/10` | Spec requirement |
| Skeleton pulse | from → to | `white/[0.04]` to `white/[0.08]` | Spec requirement |
| Dark map tiles | URL | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | CartoDB Dark Matter |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `bg-dashboard-dark` (Tailwind token) for the `#0f0a1e` page background — NOT a raw hex inline style
- Content cards: `bg-white/[0.06]` (0.06 opacity). Structural elements: `bg-white/[0.08]` (0.08 opacity). Do not confuse.
- Crisis banners use `role="alert"` — never change the role or aria attributes, only visual classes
- `CategoryFilterBar` is already dark themed — do NOT re-style it
- `QuestionOfTheDay` is already dark themed (`bg-hero-mid`) — do NOT re-style it
- `CelebrateRecovery` CR info panel is already dark — do NOT re-style it
- `PageHero` has a `dark` prop — use it instead of duplicating gradient styles
- Existing `text-primary` and `text-primary-lt` colors work on both light and dark backgrounds — don't change them
- The `AnsweredBadge` component stays green — don't change it
- Star ratings stay amber — don't change `fill-amber-400 text-amber-400`
- All focus ring styles (`focus-visible:ring-2 focus-visible:ring-primary`) remain unchanged

---

## Responsive Structure

**Breakpoints and layout behavior for `/execute-plan` and `/verify-with-playwright`:**

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column. Prayer cards stack. Local support listing cards stack. Search controls stack vertically. Map full-width. Filter bar scrollable. |
| Tablet | 768px | Prayer Wall centered `max-w-[720px]`. Local support wider layout. Side-by-side not yet active. |
| Desktop | 1440px | Prayer Wall centered `max-w-[720px]`. Local support: list + map side-by-side (`lg:grid-cols-2`). |

No responsive layout changes — only color/background changes. Dark bg extends full-width at all breakpoints.

---

## Vertical Rhythm

No spacing changes. All existing padding, margins, and gaps remain unchanged. Only colors change.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Dark theme pattern established in Specs 1 & 2 (DailyHub, Bible, Ask) is committed and working
- [x] `dashboard-dark` Tailwind token (`#0f0a1e`) is defined in `tailwind.config.js`
- [x] `PageHero` component has `dark` prop with `HERO_BG_DARK_STYLE`
- [x] No auth gating changes required — purely visual
- [x] CartoDB Dark Matter tiles are freely available (no API key needed)
- [x] All [UNVERIFIED] values are flagged with verification methods
- [ ] Feature branch `claude/feature/dark-theme-prayer-wall-local` is checked out

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map tile provider | CartoDB Dark Matter | Free, no API key, widely used, good dark aesthetic. URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |
| Map popup styling | Leaflet CSS override via inline styles on popup content | Leaflet popups use their own DOM — Tailwind classes work inside `<Popup>` but the popup wrapper needs CSS override for background |
| PrayerWallHero vs PageHero | Keep PrayerWallHero as separate component, update gradient inline | PrayerWallHero has unique structure (action slot) different from PageHero. Just update the gradient endpoint. |
| LocalSupportHero | Same approach as PrayerWallHero — update gradient inline | Same reasoning — unique structure with extraContent/action slots. |
| CategoryFilterBar | No changes | Already fully dark themed |
| QuestionOfTheDay | Minimal change — update border from `border-primary/30` to `border-primary/20` per spec | Spec says `bg-primary/[0.12] border border-primary/20` but current `bg-hero-mid border-primary/30` is close. Apply spec values. |
| Crisis banner dark theme | `bg-danger/10 border border-danger/30` with `text-white` | Replace `bg-red-50` (light) with dark-compatible variant |
| Counselor disclaimer | `bg-amber-900/20 border border-amber-500/30 text-amber-200` | Dark-compatible amber callout replacing `bg-amber-50 text-amber-800` |
| Sort/filter dropdowns | Custom dark styling with `bg-white/[0.08] border border-white/10 text-white` | Native `<select>` elements on dark backgrounds — the dropdown options are OS-rendered so we style the select wrapper |
| Skeleton animation | Custom Tailwind animation or inline opacity change | `animate-pulse` with `bg-white/[0.06]` base should work — the default pulse keyframe reduces opacity |
| Button outline variant | The `Button` component's `outline` variant needs dark theme compatibility | Check Button.tsx — if it uses `border-gray-200` or `text-text-dark`, it needs dark variants |

---

## Implementation Steps

### Step 1: Prayer Wall Shared Components (PageShell + Hero)

**Objective:** Convert the shared page wrapper and hero components to dark theme. This unlocks the dark background for PrayerDetail, PrayerWallProfile, and PrayerWallDashboard (which all use PageShell).

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PageShell.tsx` — Change `bg-neutral-bg` to `bg-dashboard-dark`
- `frontend/src/components/prayer-wall/PrayerWallHero.tsx` — Change gradient endpoint from `#F5F5F5` to `#0f0a1e`

**Details:**

PageShell.tsx line 10:
```diff
- <div className="min-h-screen bg-neutral-bg font-sans">
+ <div className="min-h-screen bg-dashboard-dark font-sans">
```

PrayerWallHero.tsx line 15:
```diff
- 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
+ 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)',
```

**Guardrails (DO NOT):**
- Do NOT change the hero title/subtitle text colors (they are already white)
- Do NOT change the skip-to-content link styling
- Do NOT modify the Navbar component or its `transparent` prop behavior
- Do NOT change any padding, spacing, or layout

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PageShell renders dark bg | unit | Verify the root div has `bg-dashboard-dark` class |
| PrayerWallHero has dark gradient | unit | Verify gradient ends in `#0f0a1e` |

**Expected state after completion:**
- [ ] PageShell background is `#0f0a1e` (dark)
- [ ] PrayerWallHero gradient blends seamlessly into dark background
- [ ] PrayerDetail, PrayerWallProfile, and PrayerWallDashboard pages now have dark backgrounds (via PageShell)

---

### Step 2: Prayer Wall Feed Page (PrayerWall.tsx)

**Objective:** Convert the main Prayer Wall feed page background and empty state text to dark theme.

**Files to create/modify:**
- `frontend/src/pages/PrayerWall.tsx` — Change `bg-neutral-bg` to `bg-dashboard-dark`, update empty state text colors

**Details:**

Line 316:
```diff
- <div className="flex min-h-screen flex-col overflow-x-hidden bg-neutral-bg font-sans">
+ <div className="flex min-h-screen flex-col overflow-x-hidden bg-dashboard-dark font-sans">
```

Empty state (line ~447-448):
```diff
- <p className="mb-4 text-lg text-text-light">
+ <p className="mb-4 text-lg text-white/60">
```

**Guardrails (DO NOT):**
- Do NOT change the PrayerWallHero action buttons (they are already styled for dark hero)
- Do NOT change the CategoryFilterBar (already dark)
- Do NOT change the QuestionOfTheDay component reference
- Do NOT modify any prayer filtering, pagination, or interaction logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerWall has dark background | unit | Root container has `bg-dashboard-dark` |
| Empty state uses white text | unit | Empty state text has `text-white/60` |

**Expected state after completion:**
- [ ] Prayer Wall feed page has dark background
- [ ] Empty state text is readable on dark background

---

### Step 3: PrayerCard + CategoryBadge (Shared Card Components)

**Objective:** Convert prayer cards and category badges to dark frosted glass. These are used across PrayerWall, PrayerDetail, PrayerWallProfile, and PrayerWallDashboard.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/PrayerCard.tsx` — Card bg, text colors
- `frontend/src/components/prayer-wall/CategoryBadge.tsx` — Badge bg, text

**Details:**

PrayerCard.tsx line 40:
```diff
- className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md"
+ className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20"
```

Author name (lines 73 and 79):
```diff
- className="font-semibold text-text-dark hover:underline"
+ className="font-semibold text-white hover:underline"
```
```diff
- <span className="font-semibold text-text-dark">
+ <span className="font-semibold text-white">
```

Separator and timestamp (lines 83-88):
```diff
- <span className="text-text-light"> &mdash; </span>
+ <span className="text-white/40"> &mdash; </span>
```
```diff
- className="text-sm text-text-light"
+ className="text-sm text-white/40"
```

Prayer content (line 108):
```diff
- <p className="whitespace-pre-wrap leading-relaxed text-text-dark">
+ <p className="whitespace-pre-wrap leading-relaxed text-white/80">
```

"Show more/less" button — keep `text-primary` (works on dark).

CategoryBadge.tsx:
```diff
- className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
+ className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white/60"
```
(Same for the non-button variant)

**Guardrails (DO NOT):**
- Do NOT change `AnsweredBadge` component (stays green)
- Do NOT change QotdBadge styling
- Do NOT change challenge badge inline color styling (`style={{ backgroundColor: ... }}`)
- Do NOT change any aria attributes or semantic structure

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerCard has frosted glass bg | unit | Card has `bg-white/[0.06]` and `border-white/10` |
| Author name is white | unit | Author span has `text-white` |
| Content text is white/80 | unit | Content paragraph has `text-white/80` |
| CategoryBadge has dark styling | unit | Badge has `bg-white/[0.06] text-white/40` |

**Expected state after completion:**
- [ ] Prayer cards are frosted glass on dark background across all pages
- [ ] Category badges are visible against dark cards

---

### Step 4: InteractionBar + CommentsSection + CommentItem + CommentInput

**Objective:** Convert the interaction bar, comments section, comment items, and comment input to dark theme.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — Button colors, border
- `frontend/src/components/prayer-wall/CommentsSection.tsx` — Border colors, CTA links
- `frontend/src/components/prayer-wall/CommentItem.tsx` — Text colors
- `frontend/src/components/prayer-wall/CommentInput.tsx` — Input, login button, crisis banner

**Details:**

InteractionBar.tsx line 87:
```diff
- <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 sm:gap-4">
+ <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 sm:gap-4">
```

Pray button (line 95):
```diff
- isPraying ? 'font-medium text-primary' : 'text-text-light hover:text-primary',
+ isPraying ? 'font-medium text-primary' : 'text-white/50 hover:text-primary',
```

Comment button (line 133):
```diff
- className={cn(btnBase, 'text-text-light hover:text-text-dark')}
+ className={cn(btnBase, 'text-white/50 hover:text-white/70')}
```

Bookmark buttons (lines 148-151, 162):
```diff
- 'text-text-light hover:text-primary',
+ 'text-white/50 hover:text-primary',
```
(logged-out variant same change)

Share button (line 173):
```diff
- className={cn(btnBase, 'text-text-light hover:text-text-dark')}
+ className={cn(btnBase, 'text-white/50 hover:text-white/70')}
```

CommentsSection.tsx line 45:
```diff
- <div className="mt-3 border-t border-gray-100 pt-3">
+ <div className="mt-3 border-t border-white/10 pt-3">
```

Cross-feature CTAs border (line 72):
```diff
- <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:gap-3">
+ <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:gap-3">
```

CommentItem.tsx:
- Author name (line 52): `text-text-dark` → `text-white`
- Separator (line 55): `text-text-light` → `text-white/40`
- Timestamp (line 56): `text-text-light` → `text-white/40`
- Comment text (line 60): `text-text-dark` → `text-white/70`
- Reply button (line 66): `text-text-light hover:text-primary` → `text-white/40 hover:text-primary`

CommentInput.tsx:
- Logged-out button (line 36):
```diff
- className="mt-3 block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-text-light transition-colors hover:border-primary"
+ className="mt-3 block w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm text-white/40 transition-colors hover:border-primary"
```

- Input (line 79):
```diff
- className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
+ className="flex-1 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
```

- Send button disabled state (line 90): `text-gray-300` → `text-white/20`

- Crisis banner (line 98):
```diff
- className="mt-3 rounded-lg border border-danger/30 bg-red-50 p-3"
+ className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3"
```
- Crisis text (line 102): `text-text-dark` → `text-white/90`

**Guardrails (DO NOT):**
- Do NOT change the `animate-pray-icon-pulse`, `animate-pray-ripple`, or `animate-pray-float-text` animation classes
- Do NOT change any `role="alert"` or `aria-*` attributes
- Do NOT change the crisis resource phone number links or `text-primary` color on links
- Do NOT change the ceremony `bg-primary/30` ripple color (already visible on dark)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| InteractionBar has dark borders | unit | Border uses `border-white/10` |
| Comment buttons are white/50 | unit | Buttons default to `text-white/50` |
| CommentInput has dark input | unit | Input has `bg-white/[0.06]` and `text-white` |
| Crisis banner uses dark bg | unit | Banner has `bg-danger/10` not `bg-red-50` |

**Expected state after completion:**
- [ ] Interaction bar buttons are visible on dark cards
- [ ] Comments section has dark borders and text
- [ ] Comment input is styled for dark
- [ ] Crisis banners are visible on dark background

---

### Step 5: InlineComposer

**Objective:** Convert the prayer request composer to dark frosted glass.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/InlineComposer.tsx` — Card, textarea, category pills, checkbox, crisis banner

**Details:**

Card container (line 88):
```diff
- <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
+ <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6">
```

Heading (line 89):
```diff
- <h2 className="mb-4 text-lg font-semibold text-text-dark">
+ <h2 className="mb-4 text-lg font-semibold text-white">
```

OfflineMessage variant (line 95-96): Change `variant="light"` to `variant="dark"` if available, or update the border:
```diff
- className="mb-3 rounded-lg border border-gray-100"
+ className="mb-3 rounded-lg border border-white/10"
```

Textarea (line 107):
```diff
- className="w-full resize-none rounded-lg border border-gray-200 p-3 leading-relaxed text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
+ className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 leading-relaxed text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan"
```

Challenge checkbox label (line 114):
```diff
- className="mt-3 flex items-center gap-2 text-sm text-text-dark"
+ className="mt-3 flex items-center gap-2 text-sm text-white/70"
```

Checkbox (line 119):
```diff
- className="h-5 w-5 rounded border-gray-300"
+ className="h-5 w-5 rounded border-white/20 bg-white/[0.06] accent-primary"
```

Category legend (line 133):
```diff
- <legend className="mb-2 text-sm font-medium text-text-dark">Category</legend>
+ <legend className="mb-2 text-sm font-medium text-white/70">Category</legend>
```

Category pills (lines 140-144):
```diff
- selectedCategory === cat
-   ? 'border-primary/40 bg-primary/10 text-primary'
-   : 'border-gray-200 bg-white text-text-dark hover:bg-gray-50',
+ selectedCategory === cat
+   ? 'border-primary/40 bg-primary/20 text-primary-lt'
+   : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15',
```

Anonymous checkbox (line 164):
```diff
- className="h-4 w-4 rounded border-gray-300 text-primary focus-visible:ring-primary"
+ className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary accent-primary focus-visible:ring-primary"
```

Anonymous label (line 166):
```diff
- <span className="text-sm text-text-dark">Post anonymously</span>
+ <span className="text-sm text-white/70">Post anonymously</span>
```

Helper text (line 169):
```diff
- <p className="mt-3 text-xs text-text-light">
+ <p className="mt-3 text-xs text-white/40">
```

Character count (line 192): `text-text-light` → `text-white/40`

Crisis banner (line 198):
```diff
- <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-4">
+ <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
```
- Crisis text lines 199-205: `text-text-dark` → `text-white/90`

**Guardrails (DO NOT):**
- Do NOT change `containsCrisisKeyword` logic
- Do NOT change the `role="alert"` attribute on crisis banner
- Do NOT change the Button component's variant props — the `ghost` and `primary` variants should be checked in Step 8

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Composer card has frosted glass | unit | Card container has `bg-white/[0.06]` |
| Textarea has dark styling | unit | Textarea has `bg-white/[0.06] text-white` |
| Category pills dark | unit | Selected pill has `bg-primary/20 text-primary-lt` |
| Crisis banner dark | unit | Crisis banner has `bg-danger/10` |

**Expected state after completion:**
- [ ] Inline composer is frosted glass on dark background
- [ ] Textarea and inputs are styled for dark
- [ ] Category pills are visible and distinguishable
- [ ] Crisis banner is visible on dark

---

### Step 6: QuestionOfTheDay + ReportDialog + DeletePrayerDialog + MarkAsAnsweredForm

**Objective:** Fine-tune QOTD to match spec values and convert dialogs/forms to dark theme.

**Files to create/modify:**
- `frontend/src/components/prayer-wall/QuestionOfTheDay.tsx` — Update border/bg to match spec exactly
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — Modal dark styling
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — Modal dark styling
- `frontend/src/components/prayer-wall/MarkAsAnsweredForm.tsx` — Form card dark styling

**Details:**

QuestionOfTheDay.tsx line 38:
```diff
- className="rounded-2xl border border-primary/30 bg-hero-mid p-4 sm:p-5 lg:p-6"
+ className="rounded-2xl border border-primary/20 bg-primary/[0.12] p-4 sm:p-5 lg:p-6"
```

ReportDialog.tsx modal panel (line 68):
```diff
- className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
+ className="mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-[#1a0f2e] p-6 shadow-xl"
```

Report title (line 79): `text-text-dark` → `text-white`
Report description (line 83): `text-text-light` → `text-white/60`
Report textarea (line 91):
```diff
- className="mt-3 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
+ className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
```

Report trigger button (line 47): `text-text-light hover:text-danger` → `text-white/40 hover:text-danger`

DeletePrayerDialog.tsx modal panel (line 50):
```diff
- className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
+ className="mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-[#1a0f2e] p-6 shadow-xl"
```

Delete title (line 55): `text-text-dark` → `text-white`
Delete description (line 61): `text-text-light` → `text-white/60`

MarkAsAnsweredForm.tsx card (line 40):
```diff
- <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
+ <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
```

Form text (line 41): `text-text-dark` → `text-white`
Form textarea (line 49):
```diff
- className="mb-3 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-text-dark placeholder:text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
+ className="mb-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
```

**Guardrails (DO NOT):**
- Do NOT change `useFocusTrap` behavior
- Do NOT change `role="dialog"`, `role="alertdialog"`, or `aria-modal` attributes
- Do NOT change the `body.style.overflow` scroll locking
- Do NOT change the Delete button's danger styling (red stays red)
- Do NOT change the "Mark as Answered" success green text
- Do NOT change the Button component variants (outline, primary) — handled separately if needed

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| QOTD uses spec bg/border | unit | Has `bg-primary/[0.12] border-primary/20` |
| ReportDialog has dark panel | unit | Panel has `bg-[#1a0f2e]` and `border-white/10` |
| DeleteDialog has dark panel | unit | Panel has `bg-[#1a0f2e]` and `border-white/10` |
| MarkAsAnswered form is dark | unit | Card has `bg-white/[0.06]` |

**Expected state after completion:**
- [ ] QOTD card matches spec styling
- [ ] Report and Delete dialogs have dark panels with white text
- [ ] MarkAsAnswered form is dark themed

---

### Step 7: PrayerDetail + PrayerWallProfile + PrayerWallDashboard Pages

**Objective:** Update page-specific elements (back links, not-found cards, profile headers, tab bars, content cards) that aren't covered by shared component changes.

**Files to create/modify:**
- `frontend/src/pages/PrayerDetail.tsx` — Back link, not-found card
- `frontend/src/pages/PrayerWallProfile.tsx` — Profile header, tab bar, reply cards, empty states
- `frontend/src/pages/PrayerWallDashboard.tsx` — Profile header, tab bar, comment/settings cards, empty states, inputs

**Details:**

**PrayerDetail.tsx:**

Back link (lines 97, 129):
```diff
- className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt ..."
+ className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white ..."
```

Not-found card (line 102):
```diff
- <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
+ <div className="rounded-xl border border-white/10 bg-white/[0.06] p-8 text-center">
```
- Title (line 103): `text-text-dark` → `text-white`
- Description (line 106): `text-text-light` → `text-white/60`

Owner action row — border (in PrayerWallDashboard line 330):
```diff
- className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3"
+ className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3"
```

**PrayerWallProfile.tsx:**

Back link (lines 68, 106): same change as PrayerDetail

Not-found card (line 73): same change as PrayerDetail
- Title (line 74): `text-text-dark` → `text-white`
- Description (line 77): `text-text-light` → `text-white/60`

Profile header — name (line 122):
```diff
- className="mt-3 text-xl font-semibold text-text-dark"
+ className="mt-3 text-xl font-semibold text-white"
```

Bio (line 126): `text-text-light` → `text-white/70`
Joined date (line 130): `text-text-light` → `text-white/60`

Tab bar (line 139):
```diff
- className="mb-6 flex border-b border-gray-200"
+ className="mb-6 flex border-b border-white/10"
```

Active tab (line 164-165):
```diff
- activeTab === tab.key
-   ? 'border-b-2 border-primary text-primary'
-   : 'text-text-light hover:text-text-dark',
+ activeTab === tab.key
+   ? 'border-b-2 border-primary text-white'
+   : 'text-white/60 hover:text-white/80',
```

Reply cards (line 216):
```diff
- className="rounded-xl border border-gray-200 bg-white p-4"
+ className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
```
- Text (line 218): `text-text-dark` → `text-white/80`

Empty states (lines 203, 230): `text-text-light` → `text-white/50`

**PrayerWallDashboard.tsx:**

Back link (line 153): same change

Profile — "Change Photo" (line 173): `text-text-light` → `text-white/40`

Display name input (line 184):
```diff
- className="rounded-lg border border-gray-200 px-3 py-1 text-xl font-semibold text-text-dark ..."
+ className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-xl font-semibold text-white ..."
```

Display name h1 (line 200): `text-text-dark` → `text-white`
Edit icon buttons (lines 206, 251): `text-text-light hover:text-primary` → `text-white/40 hover:text-primary`
Bio textarea (line 223): same dark input pattern
Bio counter (line 228): `text-text-light` → `text-white/40`
Bio text (line 245): `text-text-light` → `text-white/70`
Joined date (line 259): `text-text-light` → `text-white/60`

Tab bar (line 268):
```diff
- className="mb-6 flex overflow-x-auto border-b border-gray-200"
+ className="mb-6 flex overflow-x-auto border-b border-white/10"
```

Tab active/inactive (lines 293-295): Same as Profile tabs

Comment cards (line 357):
```diff
- className="rounded-xl border border-gray-200 bg-white p-4"
+ className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
```
- Comment text (line 359): `text-text-dark` → `text-white/80`

Owner action row border (line 330): `border-gray-100` → `border-white/10`

Empty states (lines 344, 371, 401, 431): `text-text-light` → `text-white/50`

Settings card (line 439):
```diff
- <div className="rounded-xl border border-gray-200 bg-white p-5">
+ <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5">
```

Settings heading (line 440): `text-text-dark` → `text-white`

Settings "coming soon" banner (lines 443-446):
```diff
- <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
-   <p className="text-sm text-amber-800">
+ <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
+   <p className="text-sm text-amber-200">
```

Notification type labels (line 451, 453):
- Border: `border-gray-100` → `border-white/10`
- Label text: `text-text-dark` → `text-white/70`
- Checkbox: `border-gray-300` → `border-white/20`

**Guardrails (DO NOT):**
- Do NOT change the `<Navigate>` redirect for unauthenticated dashboard access
- Do NOT change any `role="tablist"`, `role="tab"`, `role="tabpanel"` attributes
- Do NOT change keyboard navigation handlers
- Do NOT change mock data references

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PrayerDetail back link white | unit | Back link has `text-white/70` |
| Profile tab bar dark | unit | Tab bar has `border-white/10` |
| Dashboard settings card dark | unit | Settings card has `bg-white/[0.06]` |
| Dashboard tabs active=white | unit | Active tab has `text-white` |

**Expected state after completion:**
- [ ] PrayerDetail page fully dark (back link, not-found card)
- [ ] PrayerWallProfile page fully dark (header, tabs, cards)
- [ ] PrayerWallDashboard page fully dark (header, tabs, settings, cards)

---

### Step 8: Local Support Hero + Page Container

**Objective:** Convert LocalSupportHero gradient and LocalSupportPage container to dark theme.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportHero.tsx` — Gradient endpoint
- `frontend/src/components/local-support/LocalSupportPage.tsx` — Page bg, disclaimer, tabs, toggle, empty state

**Details:**

LocalSupportHero.tsx line 24:
```diff
- 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
+ 'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)',
```

LocalSupportPage.tsx line 229:
```diff
- <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
+ <div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
```

Disclaimer (line 248-252):
```diff
- className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
+ className="mb-6 rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200"
```

Search/Saved tabs (lines 292-297):
```diff
- activeTab === tab
-   ? 'bg-primary text-white'
-   : 'bg-gray-100 text-text-dark hover:bg-gray-200',
+ activeTab === tab
+   ? 'bg-primary/20 text-white'
+   : 'bg-white/10 text-white/60 hover:bg-white/15',
```

Mobile view toggle (lines 372-375, 386-389):
```diff
- mobileView === 'list'
-   ? 'bg-primary text-white'
-   : 'bg-gray-100 text-text-dark hover:bg-gray-200',
+ mobileView === 'list'
+   ? 'bg-primary/20 text-white'
+   : 'bg-white/10 text-white/60 hover:bg-white/15',
```
(Same pattern for both list and map buttons)

Saved empty state (line 437-438):
```diff
- <p className="text-base text-text-light">
+ <p className="text-base text-white/60">
```

**Guardrails (DO NOT):**
- Do NOT change the CR info panel in CelebrateRecovery.tsx (already dark)
- Do NOT change any search logic, geolocation, or pagination
- Do NOT change `role="tablist"` or keyboard navigation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| LocalSupportHero dark gradient | unit | Gradient ends with `#0f0a1e` |
| LocalSupportPage dark bg | unit | Root has `bg-dashboard-dark` |
| Disclaimer uses dark amber | unit | Disclaimer has `bg-amber-900/20` |
| Tabs dark styling | unit | Inactive tab has `bg-white/10 text-white/60` |

**Expected state after completion:**
- [ ] All 3 Local Support pages have dark backgrounds
- [ ] Heroes blend seamlessly into dark content
- [ ] Tabs and toggle buttons are dark styled

---

### Step 9: SearchControls + ResultsList (Sort/Filter Dropdowns)

**Objective:** Convert search controls and results list UI to dark theme.

**Files to create/modify:**
- `frontend/src/components/local-support/SearchControls.tsx` — Input, slider, labels, geo button
- `frontend/src/components/local-support/ResultsList.tsx` — Sort/filter dropdowns

**Details:**

SearchControls.tsx:

Location input (line 157):
```diff
- className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
+ className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
```

Geo message (line 174): `text-text-light` → `text-white/60`

Radius label (line 181):
```diff
- className="mb-1 block text-sm font-medium text-text-dark"
+ className="mb-1 block text-sm font-medium text-white/70"
```

Mile markers (line 206): `text-text-light` → `text-white/40`

ResultsList.tsx:

Sort select (line 128):
```diff
- className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
+ className="rounded-lg border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
```

Filter select (line 143): Same change.

**Note:** Native `<select>` dropdown options are OS-rendered and may not be fully dark-styled on all browsers. The select element itself will have the dark background and white text. This is acceptable for MVP.

**Guardrails (DO NOT):**
- Do NOT change the "Use My Location" button (already `bg-primary text-white`)
- Do NOT change the Search submit button (already `bg-primary text-white`)
- Do NOT change the slider's `accent-primary` (works on dark)
- Do NOT change any search/geocode/radius logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Location input dark | unit | Input has `bg-white/[0.06] text-white` |
| Sort select dark | unit | Select has `bg-white/[0.08] text-white` |
| Radius label white | unit | Label has `text-white/70` |

**Expected state after completion:**
- [ ] Search controls are styled for dark background
- [ ] Sort/filter dropdowns are dark styled

---

### Step 10: ListingCard + ListingCTAs + SearchStates

**Objective:** Convert listing cards, CTAs, and search/loading states to dark theme.

**Files to create/modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — Card bg, text, buttons, expanded details
- `frontend/src/components/local-support/ListingCTAs.tsx` — Border color
- `frontend/src/components/local-support/SearchStates.tsx` — Icon colors, text, skeleton

**Details:**

ListingCard.tsx:

Card container (lines 76-78):
```diff
- 'rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md',
+ 'rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20',
```

Photo placeholder (line 93):
```diff
- <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
-   <ImageOff size={24} className="text-gray-400" aria-hidden="true" />
+ <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/[0.06]">
+   <ImageOff size={24} className="text-white/30" aria-hidden="true" />
```

Place name (line 102): `text-text-dark` → `text-white`

Distance badge (line 104):
```diff
- className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
+ className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/50"
```

Address (line 110): `text-text-light` → `text-white/60`
Address icon: `text-text-light` stays (icon inherits from parent, update if separate)

Phone (line 117): Phone icon `text-text-light` → `text-white/60`
Phone link: `text-primary` stays (already works on dark)

Star rating empty star (line 34): `text-gray-300` → `text-white/20`
Star rating text (line 42): `text-text-light` → `text-white/50`

Actions border (line 134):
```diff
- className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3"
+ className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"
```

Bookmark/Share hover (lines 142, 157):
```diff
- className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors hover:bg-gray-100"
+ className="flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] transition-colors hover:bg-white/10"
```

Icon colors — Bookmark: `text-text-light` → `text-white/50` (isBookmarked keeps `fill-success text-success`)
Share icon (line 159): `text-text-light` → `text-white/50`

Expand button hover (line 172): `hover:bg-gray-100` → `hover:bg-white/10`
Chevron (line 178): `text-text-light` → `text-white/50`

Expanded details border (line 199):
```diff
- className="space-y-3 border-t border-gray-100 pt-4 text-sm"
+ className="space-y-3 border-t border-white/10 pt-4 text-sm"
```

Hours heading and denomination heading (lines 216, 226): `text-text-dark` → `text-white`
Hours list items (line 218): `text-text-light` → `text-white/60`
Specialties and description (lines 234, 240): `text-text-light` → `text-white/60`

"Get Directions" link (line 247): `bg-primary/10 text-primary hover:bg-primary/20` stays (works on dark)

ListingCTAs.tsx line 71:
```diff
- className="border-t border-gray-200 pt-3"
+ className="border-t border-white/10 pt-3"
```
(CTA links `text-primary-lt` already work on dark)

SearchStates.tsx:

SearchPrompt icon (line 24): `text-text-light` → `text-white/40`
SearchPrompt text (line 25): `text-text-light` → `text-white/60`

NoResults icon (line 42): `text-text-light` → `text-white/40`
NoResults text (line 43): `text-text-light` → `text-white/60`

SearchError text (line 62): `text-text-light` → `text-white/60`
(Retry button `bg-primary text-white` stays)

ListingSkeleton card (line 83):
```diff
- className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
+ className="rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6"
```

Skeleton bars (lines 86-89, 95-98):
```diff
- bg-gray-200
+ bg-white/[0.08]
```

Skeleton footer border (line 92):
```diff
- className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3"
+ className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"
```

**Guardrails (DO NOT):**
- Do NOT change star rating amber colors (`fill-amber-400 text-amber-400`)
- Do NOT change `text-primary` or `text-primary-lt` link colors
- Do NOT change `VisitButton` or `VisitNote` internal styling (check if it needs dark treatment — if it uses `text-text-dark` or `bg-gray-*`, update it)
- Do NOT change any expand/collapse logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| ListingCard dark card | unit | Card has `bg-white/[0.06] border-white/10` |
| Skeleton dark | unit | Skeleton bars use `bg-white/[0.08]` |
| SearchPrompt dark text | unit | Text uses `text-white/60` |
| Distance badge dark | unit | Badge uses `bg-white/10 text-white/50` |

**Expected state after completion:**
- [ ] Listing cards are frosted glass on dark background
- [ ] All text hierarchy correct on dark
- [ ] Skeleton loading animation visible on dark
- [ ] Empty/error states readable on dark

---

### Step 11: ResultsMap (Dark Tiles + Popup Styling)

**Objective:** Switch map tiles to dark provider and style popups for dark theme.

**Files to create/modify:**
- `frontend/src/components/local-support/ResultsMap.tsx` — Tile URL, attribution, popup styling, container border

**Details:**

Map container (line 67):
```diff
- className="h-[400px] w-full overflow-hidden rounded-xl border border-gray-200 lg:h-full"
+ className="h-[400px] w-full overflow-hidden rounded-xl border border-white/10 lg:h-full"
```

TileLayer (lines 77-79):
```diff
- <TileLayer
-   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
-   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
- />
+ <TileLayer
+   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
+   url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
+ />
```

Popup content (lines 95-109):
```diff
- <div className="min-w-[160px] font-sans">
-   <p className="text-sm font-semibold text-text-dark">{place.name}</p>
-   <p className="mt-0.5 text-xs text-text-light">{place.address}</p>
+ <div className="min-w-[160px] font-sans text-white">
+   <p className="text-sm font-semibold">{place.name}</p>
+   <p className="mt-0.5 text-xs text-white/60">{place.address}</p>
```

Distance (line 100): `text-primary` stays

View Details button (line 106): `text-primary hover:underline` stays

Add Leaflet popup dark CSS. Create (or append to) a small CSS file or add to the app's global CSS to override Leaflet popup background:

Add to `frontend/src/index.css` (or wherever Leaflet CSS overrides live):
```css
/* Dark theme for Leaflet popups */
.leaflet-popup-content-wrapper {
  background: #1a0f2e;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.leaflet-popup-tip {
  background: #1a0f2e;
}
.leaflet-popup-content-wrapper .leaflet-popup-content a {
  color: #8B5CF6;
}
.leaflet-popup-close-button {
  color: rgba(255, 255, 255, 0.6) !important;
}
.leaflet-popup-close-button:hover {
  color: #fff !important;
}
```

**Guardrails (DO NOT):**
- Do NOT change marker icon configuration
- Do NOT change map center/zoom/scroll behavior
- Do NOT change the `MapUpdater` or `SelectedMarkerOpener` components
- Do NOT change any click handlers or event handlers
- Verify that CartoDB dark tiles have readable street labels (they do — labels are in white/light gray)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Map uses dark tiles | unit | TileLayer url contains `cartocdn.com/dark_all` |
| Map container dark border | unit | Container has `border-white/10` |

**Expected state after completion:**
- [ ] Map tiles are dark (CartoDB Dark Matter)
- [ ] Map popups have dark background with white text
- [ ] Popup close button is visible
- [ ] Map labels are readable

---

### Step 12: VisitButton Dark Theme Check + Button Component Audit

**Objective:** Check and update VisitButton and the shared Button component for dark theme compatibility.

**Files to create/modify:**
- `frontend/src/components/local-support/VisitButton.tsx` — Check for light-theme classes
- `frontend/src/components/ui/Button.tsx` — Check `outline` variant for dark compatibility

**Details:**

Check `VisitButton.tsx` for any `text-text-dark`, `bg-gray-*`, `border-gray-*` classes and update to dark equivalents. The "I visited" button should use `bg-white/10 text-white/60 hover:bg-white/15` per spec.

Check `Button.tsx` for the `outline` variant — if it uses `border-gray-200` or `text-text-dark`, add dark-compatible classes. The `ghost` variant also needs checking.

This step is discovery-based — read the files, identify any remaining light-theme classes, and update them.

**Guardrails (DO NOT):**
- Do NOT change the `primary` or `danger` button variants (they should already work on dark)
- Do NOT change button sizing or padding

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| VisitButton dark styled | unit | "I visited" button uses dark classes |
| Button outline dark | unit | Outline variant is visible on dark |

**Expected state after completion:**
- [ ] VisitButton is styled for dark
- [ ] Button outline variant works on dark backgrounds

---

### Step 13: Test Updates

**Objective:** Update test assertions that reference light-theme classes (e.g., `bg-white`, `text-text-dark`, `border-gray-200`) to match new dark-theme classes.

**Files to create/modify:**
- Any test files in `frontend/src/__tests__/` that assert on class names changed in Steps 1-12

**Details:**

Run the full test suite (`pnpm test`) to identify failing tests. For each failure:
1. If the test asserts on a class name that was changed (e.g., checks for `bg-white`), update to the new class
2. If the test asserts on text content or behavior, it should pass unchanged
3. Do NOT change test logic or test structure — only class name assertions

Common patterns to search for in tests:
- `bg-neutral-bg` → `bg-dashboard-dark`
- `bg-white` → `bg-white/[0.06]`
- `text-text-dark` → `text-white` or `text-white/80`
- `text-text-light` → `text-white/60` or `text-white/40`
- `border-gray-200` → `border-white/10`
- `bg-gray-100` → `bg-white/[0.06]`
- `bg-gray-200` → `bg-white/[0.08]`

**Guardrails (DO NOT):**
- Do NOT change test coverage or delete tests
- Do NOT change what tests are testing — only update expected class names
- Do NOT skip or disable tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | integration | Full test suite passes with updated assertions |

**Expected state after completion:**
- [ ] `pnpm test` passes with zero failures
- [ ] No tests were deleted or disabled

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | PageShell + PrayerWallHero (shared wrapper + hero) |
| 2 | 1 | PrayerWall feed page background |
| 3 | — | PrayerCard + CategoryBadge (shared card components) |
| 4 | 3 | InteractionBar + Comments (depend on card context) |
| 5 | 3 | InlineComposer (card + inputs) |
| 6 | — | QOTD + Dialogs + MarkAsAnswered |
| 7 | 1, 3, 4 | Page-level elements for Detail, Profile, Dashboard |
| 8 | — | LocalSupportHero + LocalSupportPage container |
| 9 | 8 | SearchControls + ResultsList dropdowns |
| 10 | 8 | ListingCard + SearchStates |
| 11 | 8 | ResultsMap dark tiles + popups |
| 12 | 8, 10 | VisitButton + Button audit |
| 13 | 1-12 | Test updates |

**Parallelizable groups:**
- Steps 1-2 (Prayer Wall wrapper) can run in parallel with Steps 8 (Local Support wrapper)
- Steps 3-6 (Prayer Wall components) can run in parallel with Steps 9-12 (Local Support components)
- Step 13 (tests) must run last after all component changes

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | PageShell + PrayerWallHero | [COMPLETE] | 2026-03-25 | PageShell.tsx: bg-neutral-bg → bg-dashboard-dark. PrayerWallHero.tsx: gradient endpoint #F5F5F5 → #0f0a1e. |
| 2 | PrayerWall feed page | [COMPLETE] | 2026-03-25 | PrayerWall.tsx: bg-neutral-bg → bg-dashboard-dark, empty state text-text-light → text-white/60. |
| 3 | PrayerCard + CategoryBadge | [COMPLETE] | 2026-03-25 | PrayerCard.tsx: frosted glass card, white text hierarchy. CategoryBadge.tsx: dark bg/text for both button and span variants. |
| 4 | InteractionBar + Comments | [COMPLETE] | 2026-03-25 | InteractionBar: borders + button colors dark. CommentsSection: borders dark. CommentItem: text hierarchy dark. CommentInput: input dark, crisis banner dark. |
| 5 | InlineComposer | [COMPLETE] | 2026-03-25 | Frosted glass card, dark textarea, dark pills (selected/unselected), dark checkboxes, crisis banner dark. |
| 6 | QOTD + Dialogs + MarkAsAnswered | [COMPLETE] | 2026-03-25 | QOTD: bg-primary/[0.12] border-primary/20. ReportDialog + DeleteDialog: dark panels. MarkAsAnswered: dark card + inputs. |
| 7 | PrayerDetail + Profile + Dashboard pages | [COMPLETE] | 2026-03-25 | All 3 pages: back links, not-found cards, profile headers, tab bars, content cards, settings, empty states converted to dark. |
| 8 | LocalSupportHero + LocalSupportPage | [COMPLETE] | 2026-03-25 | Hero gradient → #0f0a1e. Page bg → bg-dashboard-dark. Disclaimer → dark amber. Tabs + toggle → dark. Saved empty state → dark. |
| 9 | SearchControls + ResultsList | [COMPLETE] | 2026-03-25 | SearchControls: dark input, labels, mile markers. ResultsList: dark selects, load more button, empty state. |
| 10 | ListingCard + ListingCTAs + SearchStates | [COMPLETE] | 2026-03-25 | ListingCard: frosted glass, all text/icons dark. ListingCTAs: dark border. SearchStates: dark icons/text/skeleton. |
| 11 | ResultsMap dark tiles + popups | [COMPLETE] | 2026-03-25 | Dark CartoDB tiles, dark popup CSS in index.css, dark popup content classes, dark border. |
| 12 | VisitButton + Button audit | [COMPLETE] | 2026-03-25 | VisitButton: dark border/text, dark textarea. Button: secondary → bg-white/10, outline → border-white/10, ghost → text-white/70. |
| 13 | Test updates | [COMPLETE] | 2026-03-25 | Fixed ListingCTAs.test.tsx border-gray-200 → border-white/10 selector. WelcomeWizard keyboard test is pre-existing flaky (passes on re-run). Build clean. |
