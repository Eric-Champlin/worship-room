# Feature: Song Pick Redesign

**Master Plan Reference:** N/A — standalone visual redesign

---

## Overview

The "Today's Song Pick" section on the Daily Hub currently uses a centered glass card layout with a Caveat script heading, music note icon, and heading divider. This redesign modernizes it to match the homepage visual language: side-by-side layout (heading left, Spotify player right), split gradient typography, GlowBackground atmosphere, and no glass card wrapper. The goal is a more spacious, editorial layout that feels cohesive with the rest of the site's Round 3 visual identity.

## User Story

As a **logged-out visitor or logged-in user**, I want the Song Pick section to feel visually integrated with the rest of the site's modern design so that the worship music experience feels seamless and immersive.

## Requirements

### Functional Requirements

1. Spotify iframe embed continues to load and play identically (same `src`, `allow`, `loading`, `onLoad` behavior).
2. Offline fallback via `useOnlineStatus` + `OfflineMessage` continues to work identically.
3. "Follow Our Playlist" button links to the same Spotify playlist URL and opens in a new tab.
4. Loading skeleton displays while iframe loads, at the correct height for the compact embed (152px).
5. Section has an accessible heading (`aria-labelledby` + `id`).

### Non-Functional Requirements

- **Performance**: No new JS bundles. Only imports `GlowBackground` (already exists) and `GRADIENT_TEXT_STYLE` (already exists).
- **Accessibility**: Heading structure preserved (`h2`). Skeleton has `aria-busy` and `sr-only` label. External link has `rel="noopener noreferrer"`.

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
| Mobile (< 768px) | Heading stacked above player, both centered. "Follow Our Playlist" button centered. |
| Tablet (768-1024px) | Side-by-side layout activates at `md` breakpoint. Heading left, player right. |
| Desktop (> 1024px) | Side-by-side with larger heading typography (`lg:text-5xl` / `lg:text-4xl`). |

- Heading text is `text-center` on mobile, `md:text-left` on desktop.
- "Follow Our Playlist" button and follower count are `text-center` on mobile, `md:text-left` on desktop.
- Player container uses `max-w-xl` to prevent over-stretching on wide screens.
- GlowBackground glow orb reduces in size on mobile per the standard `GlowBackground` component behavior.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Fully visible and functional. No data saved.
- **Logged-in users:** Fully visible and functional. No data saved.
- **localStorage usage:** None.
- **Route type:** Public (rendered on `/daily` page below tab content).

## Completion & Navigation

N/A — This is a presentational section, not a Daily Hub tab activity. No completion tracking.

## Design Notes

- **Heading**: Uses the `GRADIENT_TEXT_STYLE` constant from `constants/gradients.tsx` for the "Today's" line (purple gradient via `background-clip: text`). "Song Pick" line is plain `text-white`. This mirrors the 2-line heading pattern from `SectionHeading` but is implemented inline (since the split here is semantic — "Today's" is the qualifier, "Song Pick" is the subject).
- **GlowBackground**: Uses `variant="left"` to position the glow orb on the heading side. Standard opacity ranges from `09-design-system.md` (0.25-0.35 for standard sections).
- **Section divider**: `border-t border-white/[0.08]` above content, matching the homepage section divider pattern (content-width, not full viewport). Uses `max-w-xl mx-auto` width constraint.
- **Iframe height**: Reduced from 280px (tall embed) to 152px (compact embed). The compact Spotify embed shows the track art, title, and play button without excess whitespace.
- **"Follow Our Playlist" button**: Existing white pill button style retained (`rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary`). Matches homepage CTA button styling.
- **Removed elements**: Glass card wrapper, `Music` lucide icon, `HeadingDivider` component, Caveat script font on heading, `useElementWidth` hook.
- **Max width**: Section container expanded from `max-w-xl` to `max-w-4xl` to accommodate the side-by-side layout.

## Out of Scope

- Changing the Spotify embed source, track selection logic, or playlist URL.
- Adding new interactive features (favorites, sharing, etc.).
- Changing the `useOnlineStatus` or `OfflineMessage` behavior.
- Backend API changes (none needed).
- Song of the Day rotation logic changes.

## Acceptance Criteria

- [ ] Heading displays as two lines: "Today's" in purple gradient text (matching `GRADIENT_TEXT_STYLE`), "Song Pick" in plain white below it.
- [ ] No music note icon is visible.
- [ ] No `HeadingDivider` line is visible below the heading.
- [ ] No glass card wrapper (no `bg-white/[0.03]`, no `border-white/[0.06]`, no `backdrop-blur-sm` container).
- [ ] Purple glow orb is visible on the left side of the section (via `GlowBackground variant="left"`).
- [ ] Subtle section divider (`border-white/[0.08]`) appears above the Song Pick content.
- [ ] On desktop (1280px), heading is on the left and Spotify player is on the right (side-by-side via `md:flex-row`).
- [ ] On mobile (375px), heading stacks above the player with centered alignment.
- [ ] On tablet (768px), side-by-side layout activates.
- [ ] Spotify iframe height is 152px (compact embed).
- [ ] Loading skeleton renders at 152px height while iframe loads.
- [ ] "Follow Our Playlist" button is present and links to the Spotify playlist in a new tab.
- [ ] Follower count text ("Join 117K+ other followers!") is present below the button.
- [ ] Offline state: `OfflineMessage` renders correctly when offline.
- [ ] Section has proper `aria-labelledby` and heading `id` for accessibility.
- [ ] No Caveat script font (`font-script`) is used on the heading.
- [ ] "Follow Our Playlist" button alignment is centered on mobile, left-aligned on desktop.
