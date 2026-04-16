# Feature: Song Pick & Sound Enhancement Visual Polish

**Master Plan Reference:** N/A -- standalone visual polish spec

---

## Overview

Two visual elements on the Daily Hub feel out of place. The "Today's Song Pick" section blends into the surrounding page with no visual distinction -- it reads as flat dark content rather than a curated daily moment. The "Enhance with Sound" pill floats between the tab heading and content on the Pray, Journal, and Meditate tabs with no clear visual home, feeling like a stray UI element. This spec gives both elements intentional visual treatment that fits the sanctuary aesthetic, creating a more cohesive and immersive experience for users seeking peace and restoration.

## User Story

As a **logged-out visitor or logged-in user**, I want the Song Pick section to feel like a special daily feature and the sound enhancement pill to look like an integrated part of the tab layout, so that the Daily Hub feels polished and intentional rather than assembled from disconnected parts.

---

## Requirements

### 1. Today's Song Pick Section -- Visual Enhancement

**Current state:** The `SongPickSection` component renders the "Today's Song Pick" heading in Caveat script font, a `HeadingDivider`, the Spotify embed iframe (352px height), a "Follow Our Playlist" button (outlined, primary color, rounded-full), and a follower count. The background uses the same dark gradient as the footer (`hero-dark` to `hero-mid`) with no visual separation from the surrounding page content.

**Target state:** Add visual distinction so the section reads as a curated daily moment. Two approaches (choose whichever looks better during implementation):

**Approach A -- Frosted glass card wrapper:**
Wrap the entire Song Pick section (heading + divider + embed + CTA) in a frosted glass card container using the existing Dashboard Card Pattern: `bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl` with `p-6 sm:p-8` padding. This creates a contained "card" boundary that separates the section from the page flow.

**Approach B -- Radial gradient glow:**
Add a subtle radial gradient behind the section: `radial-gradient(ellipse at center, rgba(109, 40, 217, 0.08) 0%, transparent 70%)`. This creates a soft spotlight effect centered on the Spotify embed, warming the section without hard edges.

**Additional polish (both approaches):**
- Add breathing room: `my-8` or equivalent margin above and below the section
- Consider a small music note icon (Lucide `Music` or `Disc3`) next to the "Today's Song Pick" Caveat heading for visual reinforcement
- The `HeadingDivider` below the title must remain
- The "Follow Our Playlist" button and follower count remain below the embed
- The Spotify iframe embed (352px) must load and play correctly within the new container

### 2. "Enhance with Sound" Pill -- Relocation

**Current state:** The ambient cross-pollination pill renders as a floating element between the tab heading (e.g., "What's On Your Heart?") and the tab content (textarea, meditation cards, etc.) on the Pray, Journal, and Meditate tabs. It shows a music note icon and "Enhance with sound" text. It feels disconnected -- not part of the heading, not part of the content.

**Target state:** Relocate the pill so it has a clear visual home. Three options in order of preference:

**Option A (recommended) -- Integrate into the tab heading row:**
Place the pill on the same horizontal line as the tab heading, right-aligned:

```
What's On Your Heart?                    [music-icon Enhance with sound]
```

- The heading stays left-aligned (or centered), the pill sits to the right
- On mobile (< 640px): if insufficient horizontal space, the pill drops below the heading as a centered element with `mt-2`
- The pill's existing frosted glass styling remains -- only its position changes
- Use flexbox: `flex items-center justify-between flex-wrap` on the heading row container

**Option B -- Above textarea as a toolbar element:**
For Pray and Journal tabs (which have textareas), place the pill flush-left directly above the textarea:

```
[music-icon Enhance with sound]
+------------------------------------+
| What's on your heart today?        |
+------------------------------------+
```

**Option C -- Below heading, centered with reduced weight:**
Center the pill below the heading with subtle styling:
- `text-sm text-white/50` (reduced from default opacity)
- `mt-1 mb-4` spacing

**Choose the option that looks most natural.** The key requirement: the pill must look intentional, not accidental.

### 3. Consistency Across Tabs

Whichever pill position is chosen, it must be consistent across all tabs that show it:
- Pray tab
- Journal tab
- Meditate tab

Verify whether the Devotional tab has the pill. If not, don't add it. If it does, relocate it consistently with the other tabs.

### 4. Pill Functionality -- No Changes

The pill's behavior stays identical:
- Click opens the audio drawer or activates ambient sound
- Active state displays when ambient sound is playing
- Respects audio state from `AudioProvider`
- No functional changes -- position and visual treatment only

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Song Pick section | Can view, Spotify embed loads and plays | Same | N/A |
| Click "Follow Our Playlist" | Opens Spotify link | Same | N/A |
| View "Enhance with Sound" pill | Can view pill | Same | N/A |
| Click "Enhance with Sound" pill | Opens audio drawer (audio features are not auth-gated) | Same | N/A |

No auth gating changes. Both elements are viewable and interactive for all users.

---

## Responsive Behavior

| Breakpoint | Song Pick Section | Sound Pill |
|-----------|-------------------|------------|
| Mobile (< 640px) | Card/glow fills available width, `p-4` padding, Spotify embed at full width within container | If Option A: pill drops below heading as centered element. If Option B/C: renders as described. |
| Tablet (640-1024px) | Card/glow at natural width with `p-6` padding | Pill stays inline with heading (Option A) or in chosen position |
| Desktop (> 1024px) | Card/glow at natural width with `p-8` padding, content constrained by parent max-width | Pill inline with heading, right-aligned |

The Spotify iframe must remain responsive -- it already uses `w-full` and should continue to fill its container at all breakpoints.

---

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** Can view and interact with both elements. Zero persistence.
- **Logged-in users:** Same experience. No new data to persist.
- **localStorage usage:** None. These are purely visual changes.
- **Route type:** Public (Daily Hub is a public route)

---

## Completion & Navigation

N/A -- These are visual polish changes to existing elements. No completion tracking or navigation changes.

---

## Design Notes

- **Song Pick section** already uses the Song Pick Section Pattern from the design system recon: Caveat heading, 352px Spotify iframe, outlined primary-color Follow button. The visual enhancement adds a container treatment around this existing pattern.
- **Frosted glass card** (if chosen) should match the Dashboard Card Pattern: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`. Use slightly more transparent values (`bg-white/[0.03]`, `border-white/[0.06]`) since the Song Pick is on a dark page background, not a dashboard widget grid.
- **Radial gradient glow** (if chosen) uses the same `rgba(109, 40, 217, ...)` primary violet as the inner page hero radial gradients, but at lower opacity (0.08 vs 0.15) since this is a section accent, not a page-level hero.
- The pill component's existing frosted glass styling should be preserved. Reference `AmbientCrossPollination` or similar component name in the codebase.
- The "Today's Song Pick" Caveat heading size matches the design system recon: Caveat `text-4xl` white on dark background.
- **New visual pattern:** If the frosted glass card approach is used for Song Pick, this would be the first use of a frosted glass card outside the dashboard widget grid. Flag as potentially new pattern -- values should be verified visually during implementation.

---

## Out of Scope

- Spotify embed content changes (track IDs, playlist changes)
- Audio drawer redesign
- Ambient sound catalog changes
- Song of the Day rotation logic
- Tab heading text changes ("What's On Your Heart?" etc.)
- VOTD section changes
- Song Pick section on any page other than the Daily Hub
- Adding the sound pill to the Devotional tab (unless it already has one)
- Any functional changes to the audio system

---

## Acceptance Criteria

- [ ] Today's Song Pick section has visual distinction from surrounding content (frosted glass card wrapper OR radial gradient glow -- either is acceptable)
- [ ] Song Pick section container has breathing room: visible margin/padding separating it from content above and below
- [ ] Song Pick heading ("Today's Song Pick" in Caveat), `HeadingDivider`, Spotify embed, "Follow Our Playlist" button, and follower count all render correctly within the new visual treatment
- [ ] Spotify embed iframe (352px) loads and plays correctly within the new container
- [ ] "Enhance with Sound" pill has a clear visual home on the Pray tab -- it is visually associated with the heading area or textarea area, not floating in empty space
- [ ] "Enhance with Sound" pill position is identical across Pray, Journal, and Meditate tabs
- [ ] Pill click still opens the audio drawer / activates ambient sound
- [ ] Pill shows active state (visual indicator) when ambient sound is playing
- [ ] Mobile (375px): Song Pick section card/glow fills available width without horizontal overflow; pill position works on narrow viewport without overlapping other elements
- [ ] Tablet (768px): Both elements render well at mid-width with appropriate spacing
- [ ] Desktop (1440px): Song Pick section has appropriate width constrained by parent layout; pill position looks intentional alongside the heading
- [ ] No existing audio functionality is broken (ambient playback, drawer, scenes, sleep timer)
- [ ] The visual changes use the dark sanctuary color palette (no light-theme colors introduced)
- [ ] If frosted glass card approach is used: card uses translucent white background with backdrop-blur and subtle border matching the sanctuary aesthetic
- [ ] If radial gradient approach is used: gradient uses primary violet (`#6D28D9`) at low opacity, fading to transparent with no hard edges
