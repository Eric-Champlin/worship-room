# Navbar & Seasonal Banner Polish

**Master Plan Reference:** N/A — standalone feature

---

## Overview

The navbar is the ever-present gateway to Worship Room's sanctuary experience. Two visual issues currently break the feeling of intentional design: a small liturgical cross icon that appears next to the "Worship Room" logo (feeling like a bug rather than a feature), and the seasonal announcement banner that renders inside the navbar as an afterthought rather than its own visually distinct strip. This spec cleans up the logo area and extracts the seasonal banner into a standalone glassmorphic strip below the navbar, giving liturgical season messaging the prominence it deserves.

## User Story

As a **logged-out visitor or logged-in user**, I want the navbar to feel clean and polished, with a seasonal banner that draws my eye to the current liturgical season without cluttering the brand logo, so that the overall experience feels intentional and the seasonal CTA is easy to find.

## Requirements

### Functional Requirements

1. **Remove the liturgical cross icon from the navbar logo area.** The `NavbarLogo` component currently renders a seasonal `SeasonIcon` (from `SEASON_ICON_MAP`) to the right of the "Worship Room" text. Remove this icon entirely. The logo should render only the "Worship Room" text (font-script styling). The `useLiturgicalSeason` hook call in `NavbarLogo` can be removed since the icon was its only purpose there.

2. **Extract the seasonal banner from inside `Navbar` into a standalone component.** The `SeasonalBanner` component already exists (`components/SeasonalBanner.tsx`) and renders a seasonal message with a dismiss button. It currently renders inside the navbar's rounded glass container (via the `SeasonalNavLine` component at `Navbar.tsx` line 230-232). Remove the `SeasonalNavLine` rendering from `Navbar.tsx` and instead render `SeasonalBanner` in the `Layout` component between `<Navbar>` and `<main>`.

3. **Restyle `SeasonalBanner` as a glassmorphic strip.** The banner should be its own visually distinct bar below the navbar:
   - Background: `bg-white/[0.04] backdrop-blur-md border-b border-white/10`
   - Content: centered single line with seasonal sparkle icon, season message, a middle dot separator, CTA link, and dismiss X
   - Layout example: `[sparkle icon]  It's Holy Week — a season of sacrifice and redemption  ·  Read today's devotional ->  [X]`
   - Season message: `text-white/70`
   - CTA link: `text-primary-lt hover:text-primary` linking to `/daily?tab=devotional`
   - Dismiss X: `text-white/40 hover:text-white/70`, 44px touch target
   - Height: compact (~36-40px)
   - Not fixed/sticky — scrolls with the page

4. **Seasonal content per liturgical season.** Use the `useLiturgicalSeason` hook's `seasonName` and `currentSeason.themeWord` to build the message. The existing `SeasonalBanner` already does `"It's {seasonName} — a season of {currentSeason.themeWord}"`. The spec provides preferred copy for specific seasons — use the following messages where they differ from the generic pattern:
   - Advent: "It's Advent — a season of waiting and hope"
   - Christmas: "Merry Christmas — celebrate the gift of Emmanuel"
   - Lent: "It's Lent — a season of reflection and renewal"
   - Holy Week: "It's Holy Week — a season of sacrifice and redemption"
   - Easter: "He is risen! — celebrate the joy of Easter"
   - Pentecost: "It's Pentecost — the Spirit is moving"
   - Ordinary: no banner rendered

5. **Dismissal persistence.** The existing `SeasonalBanner` uses `sessionStorage` with key `wr_seasonal_banner_dismissed`. Change this to `localStorage` so dismissal persists across browser sessions. The banner should not reappear for the remainder of the current liturgical season once dismissed. Consider keying dismissal by season ID (e.g., `wr_seasonal_banner_dismissed_lent`) so a new season triggers a fresh banner.

6. **Remove or deprecate `SeasonalNavLine`.** After extraction, `SeasonalNavLine` is no longer used in the navbar. If no other component imports it, remove the file. If it's still imported elsewhere, leave it but remove the navbar usage.

7. **The `NavbarLogo` should no longer import `SEASON_ICON_MAP` from `SeasonalNavLine`.** Clean up the import in `Navbar.tsx`.

### Non-Functional Requirements

- Accessibility: dismiss button must have `aria-label`, banner should use `role="complementary"` with `aria-label="Seasonal announcement"`
- Performance: no additional network requests — uses existing `useLiturgicalSeason` hook data

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View seasonal banner | Visible on all pages | Visible on all pages | N/A |
| Click "Read today's devotional" CTA | Navigates to `/daily?tab=devotional` (public route) | Navigates to `/daily?tab=devotional` | N/A |
| Dismiss banner | Dismisses, persists to localStorage | Dismisses, persists to localStorage | N/A |

No auth gating is needed — all banner interactions are available to all users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Banner content may wrap to 2 lines. Sparkle icon + message on first line, CTA link on second. Dismiss X positioned absolute right, vertically centered. |
| Tablet (640-1024px) | Single line: icon + message + dot + CTA + dismiss X |
| Desktop (> 1024px) | Single line: icon + message + dot + CTA + dismiss X |

- Dismiss X button must maintain 44px touch target at all breakpoints
- CTA link and dismiss X must not overlap at 375px
- Banner has horizontal padding matching the navbar's `px-4 sm:px-6`

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Banner visible, dismiss persists to localStorage (keyed by season ID)
- **Logged-in users:** Same behavior as logged-out (localStorage only, no server-side state)
- **localStorage key:** `wr_seasonal_banner_dismissed_{seasonId}` (e.g., `wr_seasonal_banner_dismissed_lent`)

## Completion & Navigation

N/A — standalone feature, not part of Daily Hub tab system.

## Design Notes

- The banner should use the glassmorphic style from the design system: `bg-white/[0.04] backdrop-blur-md border-b border-white/10` — visually similar to the navbar glass but with slightly different opacity to create separation
- The sparkle decorative icon should use `text-white/40` — a purely decorative element, not the seasonal Lucide icon (Cross, Star, etc.) that was removed from the logo
- CTA link uses `text-primary-lt hover:text-primary` per the design system's primary light color (`#8B5CF6`)
- The existing `SeasonalBanner` component uses `themeColor` for background tinting and CTA color — the refactored version should use the glassmorphic glass style instead of `themeColor`-tinted backgrounds, keeping the seasonal color only for the decorative icon if desired
- On pages with the `transparent` navbar (landing page), the banner still renders in the same position in the layout flow — between navbar and hero/content. Since the transparent navbar is absolutely positioned, the banner should appear at the top of the page flow as the first non-absolute element
- **New pattern flagged:** A standalone glassmorphic strip below the navbar is a new layout pattern not captured in the existing design system recon. Values should be marked `[UNVERIFIED]` during planning until visually verified.

## Out of Scope

- Changes to the liturgical calendar algorithm or season detection logic
- Changes to navbar links, dropdowns, or active states
- Hero font standardization (separate spec)
- Navbar link additions (e.g., `/ask` in footer — already completed)
- Light mode styling (deferred to Phase 4)
- Backend persistence of banner dismissal state

## Acceptance Criteria

- [ ] No cross icon or any liturgical icon appears next to the "Worship Room" logo text in the navbar on any page (landing, dashboard, Daily Hub, Prayer Wall, Bible, Music, etc.)
- [ ] "Worship Room" logo renders as plain `font-script` text with no adjacent icons
- [ ] Seasonal banner renders as its own glassmorphic strip below the navbar, outside the navbar's rounded glass container
- [ ] Banner background uses `bg-white/[0.04] backdrop-blur-md border-b border-white/10`
- [ ] Banner content shows: decorative sparkle + season message + middle dot + "Read today's devotional" CTA link + dismiss X, all on one line at 768px+
- [ ] CTA link navigates to `/daily?tab=devotional`
- [ ] CTA link uses `text-primary-lt` color (`#8B5CF6`)
- [ ] Dismiss button hides the banner immediately (with 200ms fade-out animation, respecting `prefers-reduced-motion`)
- [ ] Dismiss state persists in localStorage keyed by season ID — banner does not reappear after dismissal during the same liturgical season
- [ ] A new liturgical season triggers a fresh banner even if a previous season's banner was dismissed
- [ ] When no liturgical season is active (ordinary time), no banner renders and no empty gap exists
- [ ] Banner is not fixed/sticky — scrolls with page content
- [ ] At 375px width, banner text wraps gracefully and dismiss X does not overlap the CTA link
- [ ] At 768px and 1440px, banner content is a single centered line
- [ ] Dismiss X has a minimum 44px touch target at all breakpoints
- [ ] All navbar functionality is unchanged: nav links work, Local Support dropdown works, avatar dropdown works, notification bell works, mobile hamburger drawer works
- [ ] The `useLiturgicalSeason` hook and all other seasonal features (devotional priority, VOTD seasonal selection, dashboard greeting, seasonal challenge detection) continue to function
- [ ] `SeasonalNavLine` component is no longer rendered inside the navbar
- [ ] No unused imports remain in `Navbar.tsx` related to `SeasonalNavLine` or `SEASON_ICON_MAP`
