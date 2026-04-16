# Song Pick v4 — Centered Column Layout

**Master Plan Reference:** N/A — standalone visual polish iteration

---

## Overview

The Song of the Day embed is often a user's first encounter with worship music in the app. v2 and v3 both attempted side-by-side layouts that felt lopsided or overly complex. v4 abandons side-by-side entirely and returns to a centered column layout — heading on top, player in the middle (stretched full-width of a narrower container), CTAs on the bottom. This reads as a single cohesive rectangle and matches the visual language of a sanctuary: centered, calm, focused.

## User Story

As a visitor (logged-in or logged-out), I want the Song Pick section to feel like a single cohesive visual unit so that the layout communicates intentional design rather than two columns fighting for balance.

## Requirements

### Functional Requirements

1. **Centered column layout:** Heading, player, and CTAs stack vertically within a `max-w-2xl` (~672px) centered container — no side-by-side layout at any breakpoint
2. **Heading stacked centered:** "Today's" (larger, purple gradient) on top, "Song Pick" (smaller, white) directly below, both centered. No letter-spacing manipulation on "Song Pick"
3. **Full-width player:** Spotify iframe stretches to fill the `max-w-2xl` container width with `width="100%"` and `height="352"`
4. **Single CTA block:** "Follow Our Playlist" button + "Join 117K+ other followers!" caption centered below the player
5. **All existing functionality unchanged:** Iframe attributes (`src`, `allow`, `loading`, `onLoad`), offline message, skeleton loader, Follow link behavior, `useOnlineStatus` hook — zero functional changes

### Non-Functional Requirements

- Performance: No new dependencies, no layout shift changes
- Accessibility: Existing `aria-labelledby`, `aria-busy`, `sr-only` loading text preserved. No new interactive elements.

## Auth Gating

N/A — The Song Pick section has no auth-gated interactions. The "Follow Our Playlist" link opens Spotify in a new tab (external link, no auth required). This section renders identically for logged-in and logged-out users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Column layout is naturally vertical. Container `max-w-2xl` is effectively full-width with `px-4` padding. Heading at `text-4xl` / `text-2xl`. Player fills width at 352px tall. CTAs centered. |
| Tablet (640-1024px) | Same centered column. Heading scales to `sm:text-5xl` / `sm:text-3xl`. Container constrained to ~672px. |
| Desktop (> 1024px) | Container hits `max-w-2xl` (672px). Heading at `lg:text-6xl` / `lg:text-4xl`. Rectangle effect most visible — heading, player, and CTAs share the same horizontal center axis. |

No flexbox row layouts, no breakpoint-specific layout changes beyond text size scaling. No `md:flex-row`, `md:justify-between`, or other side-by-side classes.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** See the section identically to logged-in users. No data persistence.
- **Logged-in users:** No additional persistence. Song selection uses `getSongOfTheDay()` (date-based rotation, no user state).
- **localStorage usage:** None

## Completion & Navigation

N/A — The Song Pick section is a passive content display, not a completable activity.

## Design Notes

- **GlowBackground:** Uses existing `GlowBackground` component with `variant="left"`. Kept from v2/v3 so the glow orb positions to the left of the column, providing asymmetric atmospheric depth behind the centered content.
- **GRADIENT_TEXT_STYLE:** "Today's" uses the existing purple-to-white gradient from `constants/gradients.tsx`. "Song Pick" uses plain `text-white`.
- **Section divider:** Existing `border-t border-white/[0.08]` pattern, constrained to `max-w-xl mx-auto`, with `mb-10` spacing before the heading.
- **Container width:** `max-w-2xl` (~672px) replaces v3's `max-w-4xl`. The narrower container ensures the 352px-tall player forms a clean ~2:1 rectangle.
- **Typography:** "Today's" at `text-4xl sm:text-5xl lg:text-6xl` with `GRADIENT_TEXT_STYLE` + `leading-none`. "Song Pick" at `text-2xl sm:text-3xl lg:text-4xl` with `text-white` + `leading-none` + `mt-1`. No letter-spacing manipulation (unlike v3).
- **FrostedCard:** Not used — the section has no card wrapper (consistent with v2/v3).
- **Text opacity:** "Join 117K+ other followers!" uses `text-white/70` (muted caption, not primary content).
- **Spacing:** `mt-8` between heading and player, `mt-6` between player and CTAs.

### New patterns

None — this spec uses only existing visual patterns (GlowBackground, GRADIENT_TEXT_STYLE, section dividers).

## Files to Edit

- `frontend/src/components/SongPickSection.tsx` — single file change

## Constraints

- **Single file edit:** Only `SongPickSection.tsx`
- **Visuals and layout change only:** All functional behavior must remain identical
- Do not modify `src`, `allow`, `loading`, or `onLoad` attributes on the iframe
- Do not touch the section divider logic from prior specs — it stays

## Out of Scope

- Functional changes to the Spotify iframe
- Changes to `useOnlineStatus` hook usage
- Changes to `OfflineMessage` or `SkeletonBlock` behavior
- Adding new interactive elements or auth gates
- Song rotation logic changes
- Any backend work

## Playwright Verification

### Screenshots to capture:
1. **Desktop 1440x900** — heading "Today's" (large purple gradient) centered at top, "Song Pick" (smaller white) directly below, Spotify player below heading stretched to ~672px width, "Follow Our Playlist" button centered below player, "Join 117K+" caption centered below button. Entire section reads as a single centered column.
2. **Tablet 768x1024** — same centered column layout.
3. **Mobile 375x812** — heading + player + CTAs all centered, no horizontal overflow, player fills available width with side padding.
4. **Offline state** — OfflineMessage renders in place of player, heading and CTAs still visible.
5. **Loading state** — 352px skeleton block renders while iframe loads.

### Visual rectangle check:
- At desktop, section content (from top of "Today's" to bottom of "Join 117K+") should form a roughly rectangular bounding box (~672px wide).
- The heading, player, and CTAs should all share the same horizontal center axis.

### Interaction tests:
- "Follow Our Playlist" opens Spotify playlist in new tab.
- No layout shift when iframe finishes loading (SkeletonBlock to iframe transition).

## Acceptance Criteria

- [ ] Section uses `GlowBackground variant="left"` wrapper
- [ ] Inner section uses `max-w-2xl` (not `max-w-4xl` from v3)
- [ ] Section divider (`border-t border-white/[0.08] max-w-xl mx-auto`) preserved above heading with `mb-10`
- [ ] Heading wrapped in `<div className="text-center">` with `<h2>` using `flex flex-col items-center`
- [ ] "Today's" uses `text-4xl sm:text-5xl lg:text-6xl` + `GRADIENT_TEXT_STYLE` + `leading-none`
- [ ] "Song Pick" uses `text-2xl sm:text-3xl lg:text-4xl` + `text-white` + `leading-none` + `mt-1`
- [ ] Both heading spans stack centered (no side-by-side layout)
- [ ] Spotify iframe has `width="100%"` and `height="352"` — no explicit max-width on the player wrapper
- [ ] Player wrapper uses `mt-8` spacing below heading
- [ ] Follow Our Playlist button + caption wrapped in `<div className="mt-6 text-center">`
- [ ] No duplicate desktop/mobile CTA blocks
- [ ] No `md:flex-row`, `md:justify-between`, or other side-by-side layout classes remain
- [ ] No letter-spacing manipulation on "Song Pick" (no `tracking-*` classes)
- [ ] Imports cleaned up: no `Music`, no `HeadingDivider`, no `useElementWidth`
- [ ] Mobile layout works at 375px with no horizontal overflow
- [ ] Offline state and loading state continue to work identically
- [ ] All existing tests continue to pass
