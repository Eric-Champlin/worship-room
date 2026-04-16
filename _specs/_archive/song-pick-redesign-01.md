# Feature: Song Pick Redesign (v2 — Player-Height Alignment)

**Master Plan Reference:** N/A — standalone visual refinement

---

## Overview

The "Today's Song Pick" section on the Daily Hub was previously redesigned into a side-by-side layout with a split-gradient heading and compact 152px Spotify embed. This v2 refinement rebalances the visual hierarchy and restores the tall 352px player. The gradient word becomes the visual anchor ("Today's" is large + purple gradient, "Song Pick" is smaller + white), and the taller player lets the bottom edge align naturally with the "Join 117K+" follower count on the left column. This creates a calmer, more editorial composition that still slots cleanly into the dark-theme visual language of the Daily Hub.

## User Story

As a **logged-out visitor or logged-in user**, I want the Song Pick section to feel visually balanced — with the gradient "Today's" anchoring my eye and the full Spotify player aligning neatly beside the call-to-action — so the worship music moment feels intentional rather than lopsided.

## Requirements

### Functional Requirements

1. Spotify iframe embed continues to load and play identically (same `src`, `allow`, `loading`, `onLoad` behavior as current implementation).
2. Iframe height returns to **352px** (the full Spotify embed, not the compact 152px variant).
3. Skeleton loading block matches the iframe height (352px) while the iframe is loading.
4. Offline fallback via `useOnlineStatus` + `OfflineMessage` continues to work identically.
5. "Follow Our Playlist" button links to `SPOTIFY_PLAYLIST_URL` and opens in a new tab with `rel="noopener noreferrer"`.
6. "Follow Our Playlist" button + follower count appear **under the heading on desktop** and **under the player on mobile** (never duplicated, never in both locations at once).
7. Section has an accessible heading (`h2` with `id="song-pick-heading"`, referenced by `aria-labelledby` on the section).
8. A subtle section divider (`border-white/[0.08]`, constrained to `max-w-xl`) sits above the Song Pick content.
9. Section is wrapped in `GlowBackground variant="left"` so the purple glow orb sits on the same side as the heading.

### Non-Functional Requirements

- **Performance:** No new JS bundles. Removes `Music` icon, `HeadingDivider`, and `useElementWidth` hook imports. Adds `GlowBackground` and `GRADIENT_TEXT_STYLE` (both already exist).
- **Accessibility:** Heading structure preserved (`h2` with stacked spans). Skeleton retains `aria-busy` and `sr-only` "Loading" label. External link has `rel="noopener noreferrer"`. Decorative divider marked `aria-hidden="true"`.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Song Pick section | Visible, fully functional | Visible, fully functional | N/A |
| Play Spotify embed | Works (Spotify handles its own auth) | Works | N/A |
| Click "Follow Our Playlist" | Opens Spotify in new tab | Opens Spotify in new tab | N/A |

No auth gating needed. This section is purely presentational with no user-generated content or saved state.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Stacked: heading centered at top, player centered below, "Follow Our Playlist" button + follower count centered under the player. `flex-col items-center gap-8`. |
| Tablet (768-1024px) | Side-by-side at `md`: heading left (`md:text-left`, pinned to top of column via `md:items-start` + `md:pt-2`), player right. "Follow Our Playlist" + follower count sit under the heading (`hidden md:block`). `gap-12`. |
| Desktop (> 1024px) | Same side-by-side layout with larger heading typography (`lg:text-6xl` for "Today's", `lg:text-4xl` for "Song Pick"). |

**Heading typography scale:**

| Breakpoint | "Today's" (gradient) | "Song Pick" (white) |
|-----------|---------------------|---------------------|
| Mobile (base) | `text-4xl` | `text-2xl` |
| sm (640px+) | `text-5xl` | `text-3xl` |
| lg (1024px+) | `text-6xl` | `text-4xl` |

- The gradient word "Today's" is intentionally LARGER than "Song Pick" — it is the visual anchor.
- The CTA block uses `hidden md:block` on the left side and `md:hidden` on the right side to ensure it appears exactly once at each breakpoint.
- Player container uses `max-w-xl` and `min-w-0 flex-1` so it fills the remaining space without overflow.
- `md:items-start` (instead of `md:items-center`) pins the heading to the top of its column so the tall player can stretch downward alongside it.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Fully visible and functional. No data saved.
- **Logged-in users:** Fully visible and functional. No data saved.
- **localStorage usage:** None. No keys read or written by this section.

## Completion & Navigation

N/A — This is a site-wide below-tabs section (rendered beneath the Daily Hub tab content and beneath other pages that use `SongPickSection`). It does not feed into the Daily Hub completion tracking system.

## Design Notes

- **Reuses existing components/constants:** `GlowBackground` (from `components/homepage/GlowBackground`), `GRADIENT_TEXT_STYLE` (from `constants/gradients`), `SkeletonBlock`, `OfflineMessage`, `useOnlineStatus`, `cn`. Reuses existing data helpers `getSongOfTheDay`, `SPOTIFY_EMBED_BASE`, `SPOTIFY_PLAYLIST_URL`.
- **Removes** the following from the current `SongPickSection.tsx`: the `Music` Lucide icon, `HeadingDivider` component, `useElementWidth` hook, and any glass-card/FrostedCard wrapper around the content.
- **Matches Homepage Visual Patterns (Round 3)** from `.claude/rules/09-design-system.md`:
  - Section divider: `border-t border-white/[0.08]`, constrained to `max-w-xl` and centered.
  - GRADIENT_TEXT_STYLE on the anchor word — same pattern used by `SectionHeading`'s `bottomLine`.
  - `GlowBackground variant="left"` — purple glow orb positioned on the heading side, following the standard glow opacity range (0.25-0.50).
- **Visual aspects that must match existing patterns:**
  - Gradient on "Today's" uses the exact `GRADIENT_TEXT_STYLE` constant (same white→purple gradient as all other homepage/Daily Hub gradient headings).
  - Glow orb opacity and blur follow the `GlowBackground` component's standard variant="left" behavior (no custom overrides).
  - "Follow Our Playlist" pill button retains its current white background, primary-colored text, rounded-full shape, and hover state (`bg-white → hover:bg-gray-100`).
- **Content container:** `max-w-4xl` wrapping the flex row; outer section uses `px-4 py-12 sm:px-6 sm:py-16`.
- **Flex row:** `flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12`.
- **Left column:** `flex-shrink-0 text-center md:text-left md:pt-2`. Heading is `flex flex-col` with stacked spans.
- **Right column:** `w-full min-w-0 flex-1 max-w-xl`.

**No new visual patterns introduced** — this spec rearranges and resizes existing homepage patterns. All values trace to the design system recon or existing component behavior.

## Out of Scope

- Dynamic song metadata from the Spotify Web API (rotation remains based on `getSongOfTheDay(today)` using day-of-month).
- Any change to which track is featured on which day.
- Changing the playlist URL or adding additional playlist CTAs.
- Adding a "favorite song" or "save song" affordance.
- Replacing the Spotify iframe with a custom player.
- Light mode support (dark theme only — Phase 4).
- Backend/API work.

## Acceptance Criteria

- [ ] "Today's" renders on its own line in purple gradient via `GRADIENT_TEXT_STYLE` at `text-4xl` base, `sm:text-5xl`, `lg:text-6xl`, `font-bold`.
- [ ] "Song Pick" renders on its own line in plain `text-white` at `text-2xl` base, `sm:text-3xl`, `lg:text-4xl`, `font-bold` — visibly smaller than "Today's" at every breakpoint.
- [ ] The Spotify iframe renders at `height="352"` and the skeleton block renders at `height={352}` to match.
- [ ] On desktop (≥ 768px): heading sits on the left column, Spotify player sits on the right column, and the bottom edge of the 352px player aligns (within ~8px) with the bottom of the "Join 117K+ other followers!" text on the left column.
- [ ] On desktop (≥ 768px): "Follow Our Playlist" button + "Join 117K+ other followers!" caption appear only under the heading (not below the player) — controlled by `hidden md:block` / `md:hidden`.
- [ ] On mobile (< 768px): heading stacks above player, both centered (`items-center` + `text-center`), and "Follow Our Playlist" appears below the player, centered.
- [ ] A subtle horizontal divider (`border-t border-white/[0.08]`, `max-w-xl`, centered, `aria-hidden="true"`) sits above the heading/player content.
- [ ] The section is wrapped in `<GlowBackground variant="left">` and a visible purple glow orb renders on the heading side on desktop.
- [ ] The Music icon, `HeadingDivider` component, and any glass-card/FrostedCard wrapper are NOT present in the rendered output.
- [ ] `useElementWidth` hook is NOT called in the component (imports for `Music`, `HeadingDivider`, and `useElementWidth` are removed).
- [ ] Offline state renders `OfflineMessage variant="dark"` with message "Spotify playlists available when online" inside the right column, replacing the iframe.
- [ ] Skeleton block displays with `aria-busy="true"` + `sr-only` "Loading" label while iframe loads; iframe has `invisible` class until `onLoad` fires.
- [ ] External "Follow Our Playlist" link uses `target="_blank"` and `rel="noopener noreferrer"`.
- [ ] Section has accessible heading: `aria-labelledby="song-pick-heading"` on the `<section>` and `id="song-pick-heading"` on the `<h2>`.
- [ ] Tablet (768×1024): side-by-side layout holds at the `md` breakpoint without overflow.
- [ ] Mobile (375×812): all content fits within viewport width, no horizontal scroll, heading is centered, player is centered, CTA is centered below player.
- [ ] Vite build succeeds with no new TypeScript errors or lint warnings introduced by this change.
