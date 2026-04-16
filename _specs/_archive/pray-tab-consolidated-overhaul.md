# Pray Tab — Consolidated Overhaul

**Master Plan Reference:** N/A — standalone visual polish spec

---

## Overview

The Pray tab is where hurting users first pour out their hearts. This overhaul removes visual clutter (the redundant heading, a cheesy subtitle), makes the textarea more inviting by giving it real vertical space, elevates the primary "Help Me Pray" CTA to match the homepage's proven white-pill button pattern, and enlarges the Guided Prayer Session cards so they feel substantial and clickable rather than thumbnail-sized. The net effect: less ceremony, more breathing room, faster path to peace.

## User Story

As a **logged-in user**, I want the Pray tab to feel spacious and focused so that I can begin praying without visual friction.

As a **logged-out visitor**, I want the Pray tab to look inviting and professional so that I'm motivated to sign up and use it.

## Requirements

### Functional Requirements

1. **Taller, resizable textarea** — default height ~200px (rows=8), user can drag to resize vertically up to 500px max, cannot shrink below 200px.
2. **Remove "What's On Your Heart?" heading** — the starter chips + ambient pill become the first visual element in the Pray tab. No heading above the input area.
3. **"Help Me Pray" button matches homepage CTA** — white pill shape, `hero-bg` text color, white glow shadow, intensified glow on hover. Visually identical to the "Get Started — It's Free" button in `FinalCTA`.
4. **Remove GuidedPrayerSection subtitle** — "Close your eyes and let God lead" is removed. The "Guided Prayer Sessions" heading gets bottom margin to compensate.
5. **Enlarge Guided Prayer cards** — more padding (p-6), larger icons (h-8 w-8), larger title text (text-base font-semibold), larger description text (text-sm, 3-line clamp), subtle purple hover glow shadow, minimum card height on tablet/desktop (180px).
6. **Increase grid gaps** — tablet gap goes from 12px to 16px, desktop gap from 16px to 20px.
7. **Preserve ambient pill inline layout** — the `AmbientSoundPill` remains inline within the starter chip row (existing Spec C behavior).

### Non-Functional Requirements

- **Performance**: No new network requests, no new dependencies. All changes are CSS/className only.
- **Accessibility**: All existing ARIA attributes preserved. Textarea retains `aria-label="Prayer input"`. Guided prayer cards retain `role` and focus ring. Touch targets remain >= 44px.
- **No behavioral changes**: State management, auth flows, completion tracking, crisis detection — all unchanged.

## Auth Gating

No auth gating changes in this spec. Existing behavior preserved:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Type in textarea | Can type (draft auto-saves) | Can type | N/A |
| Click "Help Me Pray" | Auth modal appears | Generates prayer | "Sign in to generate a prayer" |
| Click starter chip | Fills textarea | Fills textarea | N/A |
| Click Guided Prayer card | Auth modal appears | Navigates to session player | "Sign in to access guided prayer" |

## Responsive Behavior

| Breakpoint | Textarea | Help Me Pray Button | Guided Prayer Cards |
|-----------|----------|-------------------|-------------------|
| Mobile (< 640px) | Full width, min-h-[200px], resize-y | Full width or auto, text-base | Horizontal carousel, min-w-[220px], snap scroll |
| Tablet (640-1024px) | Full width, same height constraints | Auto width, text-base | 2-column grid, min-h-[180px], gap-4 |
| Desktop (> 1024px) | Full width, same height constraints | Auto width, text-lg | 4-column grid, min-h-[180px], gap-5 |

- Mobile carousel retains snap-center scroll behavior
- Cards use flex-col layout with duration badge pushed to bottom via flex-1 on description

## AI Safety Considerations

N/A — This spec makes no changes to AI-generated content, crisis detection, or free-text input handling. Existing crisis keyword detection in PrayerInput is preserved as-is.

## Auth & Persistence

- **Logged-out users:** Can view and type in the Pray tab. Draft text auto-saves to `wr_prayer_draft`. No other persistence.
- **Logged-in users:** Full prayer generation flow. No persistence changes in this spec.
- **localStorage usage:** No new keys. Existing `wr_prayer_draft` behavior unchanged.

## Completion & Navigation

N/A — This spec does not change completion tracking or navigation flows. Existing Daily Hub completion signals are preserved.

## Design Notes

- **"Help Me Pray" button**: Must visually match `FinalCTA`'s "Get Started — It's Free" button exactly — white background, `text-hero-bg` text, `rounded-full`, `shadow-[0_0_30px_rgba(255,255,255,0.20)]`, hover intensifies to `shadow-[0_0_40px_rgba(255,255,255,0.30)]`. This is the homepage CTA pattern from the Round 3 redesign.
- **Guided Prayer cards**: Use the existing `FrostedCard`-adjacent pattern — `bg-white/[0.06]`, `border-white/[0.12]`, `backdrop-blur-sm`. Add subtle purple hover glow (`hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]`) matching the homepage card hover pattern.
- **Card layout**: `flex flex-col` with `flex-1` on description pushes duration badge to card bottom, creating consistent card heights.
- **Icons**: Scale from h-6 w-6 to h-8 w-8 for better visual weight in enlarged cards.
- **Typography**: Card titles upgrade from `text-sm font-medium` to `text-base font-semibold`. Descriptions from `text-xs text-white/60` to `text-sm text-white/70`. Duration badges add `font-medium` and brighten to `text-white/70`.
- **Focus ring offset**: Cards should use `ring-offset-hero-bg` (not `dashboard-dark`) for correct dark background match.
- **Heading removal**: With the "What's On Your Heart?" heading gone, the starter chips row becomes the topmost element. This reduces ceremony and gets the user to the input faster.
- **Gradient text style**: If `GRADIENT_TEXT_STYLE` import becomes unused after heading removal, clean it up.
- **GlowBackground and BackgroundSquiggle**: Existing atmospheric layers behind the Pray tab are untouched.

## Out of Scope

- No changes to prayer generation logic or mock data
- No changes to KaraokeText, PrayerResponse, or post-prayer flow
- No changes to crisis detection or CrisisBanner
- No changes to completion tracking or faith points
- No changes to auth modal content or auth flow
- No changes to ambient sound behavior (only verifying pill placement)
- No new components — all changes are to existing components' className strings and JSX structure
- Backend/API work (Phase 3)
- Light mode styling (Phase 4)

## Acceptance Criteria

### Textarea (PrayerInput)
- [ ] Textarea renders with `rows={8}`, `min-h-[200px]`, `max-h-[500px]`, `resize-y`
- [ ] Textarea can be dragged taller but not shorter than 200px
- [ ] Textarea cannot exceed 500px height via resize

### Heading Removal
- [ ] "What's On Your Heart?" heading and its wrapper div are removed from PrayerInput
- [ ] `GRADIENT_TEXT_STYLE` import removed from PrayerInput if no longer used elsewhere in the file
- [ ] Starter chips row is the first visible content in the Pray tab (when chips are shown)

### Help Me Pray Button
- [ ] Button uses white pill style: `bg-white`, `text-hero-bg`, `rounded-full`, white glow shadow
- [ ] Button hover intensifies glow shadow (matching FinalCTA hover exactly)
- [ ] Button has `text-base` on mobile, `text-lg` on desktop (`sm:text-lg`)
- [ ] Focus ring uses `ring-white/50` with `ring-offset-hero-bg`
- [ ] Disabled state shows `opacity-50` and `cursor-not-allowed`
- [ ] Visually identical to homepage "Get Started — It's Free" button (except for label text)

### GuidedPrayerSection — Subtitle Removal
- [ ] "Close your eyes and let God lead" subtitle is removed
- [ ] "Guided Prayer Sessions" heading has `mb-5` bottom margin
- [ ] Cards container has `mt-0` (not `mt-4`)

### GuidedPrayerSection — Enlarged Cards
- [ ] Cards have `p-6` padding (not `p-4`)
- [ ] Cards have `min-w-[220px]` on mobile carousel
- [ ] Cards have `sm:min-h-[180px]` on tablet/desktop
- [ ] Cards use `flex flex-col` layout
- [ ] Cards have `transition-all duration-200` and `hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]`
- [ ] Card border is `border-white/[0.12]` (not `border-white/10`)
- [ ] Card focus ring offset uses `ring-offset-hero-bg`
- [ ] Card icons are `h-8 w-8` with `mb-3`
- [ ] Card titles are `font-semibold text-base text-white`
- [ ] Card descriptions are `text-sm text-white/70 line-clamp-3 flex-1`
- [ ] Card duration badges have `self-start`, `px-3 py-1`, `font-medium`, `text-white/70`

### Grid
- [ ] Tablet grid gap is `gap-4` (16px)
- [ ] Desktop grid gap is `gap-5` (20px)

### Preservation
- [ ] AmbientSoundPill remains inline with starter chip row
- [ ] All ARIA attributes preserved across all changes
- [ ] All click handlers and auth gating preserved (cards, button, chips)
- [ ] Mobile layout works at 375px with no horizontal overflow
- [ ] Guided prayer card click while logged out shows auth modal
- [ ] Guided prayer card click while logged in navigates to session player
