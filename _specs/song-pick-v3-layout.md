# Song Pick V3 — Equal-Width Heading + Bottom-Aligned Column

**Master Plan Reference:** N/A — standalone visual polish iteration

---

## Overview

The Song of the Day embed is often a user's first encounter with worship music in the app. A visually balanced, intentional layout communicates care and quality — reinforcing the sanctuary atmosphere. v3 fixes a lopsided composition from v2 (150px gap between left column content and Spotify player bottom) and refines the heading typography so "Today's" and "Song Pick" render at the same visual width, creating a clean rectangular heading unit.

## User Story

As a visitor (logged-in or logged-out), I want the Song Pick section to feel visually balanced and polished so that the layout communicates intentional design rather than accidental whitespace.

## Requirements

### Functional Requirements

1. **Equal-width heading:** "Today's" (larger, purple gradient) and "Song Pick" (smaller, white) must render at the same visual width on desktop, achieved via letter-spacing on "Song Pick"
2. **Bottom-aligned CTA:** On desktop, the "Follow Our Playlist" button and "Join 117K+ other followers!" caption must align with the bottom edge of the Spotify player (within 8px)
3. **Single CTA block:** Remove the duplicated mobile/desktop CTA pattern — use a single CTA block that flexbox positions correctly at all breakpoints
4. **All existing functionality unchanged:** Iframe attributes, offline message, skeleton loader, Follow link behavior, `useOnlineStatus` hook — zero functional changes

### Non-Functional Requirements

- Performance: No new dependencies, no layout shift changes
- Accessibility: Existing `aria-labelledby`, `aria-busy`, `sr-only` loading text preserved. No new interactive elements.

## Auth Gating

N/A — The Song Pick section has no auth-gated interactions. The "Follow Our Playlist" link opens Spotify in a new tab (external link, no auth required). This section renders identically for logged-in and logged-out users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Stacked column: heading centered, CTA centered below heading (`mt-6`), Spotify player below CTA. All centered, no overflow. |
| Tablet (768-1024px) | Side-by-side row via `md:flex-row`. Left column (heading top, CTA bottom) stretches to match player height via `md:items-stretch` + `md:justify-between`. |
| Desktop (> 1024px) | Same side-by-side row. Heading typography scales up (`lg:text-6xl` / `lg:text-4xl`). Equal-width heading effect most prominent at this size. |

**Key responsive notes:**
- `md:items-stretch` forces both columns to equal height (the taller column = 352px player)
- `md:justify-between` on left column pins heading to top, CTA to bottom
- On mobile, natural stacking order handles layout — no bottom-alignment stretching needed
- Heading centers on mobile (`items-center`), left-aligns on desktop (`md:items-start`)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** See the section identically to logged-in users. No data persistence.
- **Logged-in users:** No additional persistence. Song selection uses `getSongOfTheDay()` (date-based rotation, no user state).
- **localStorage usage:** None

## Completion & Navigation

N/A — The Song Pick section is a passive content display, not a completable activity.

## Design Notes

- **GlowBackground:** Uses existing `GlowBackground` component with `variant="left"`. No changes to glow behavior.
- **GRADIENT_TEXT_STYLE:** "Today's" uses the existing purple-to-white gradient from `constants/gradients.tsx`. "Song Pick" uses plain `text-white`.
- **Section divider:** Existing `border-t border-white/[0.08]` pattern, constrained to `max-w-xl mx-auto`.
- **Typography sizing:** "Today's" at `text-4xl sm:text-5xl lg:text-6xl`, "Song Pick" at `text-2xl sm:text-3xl lg:text-4xl`. Both use `leading-none` to prevent line-height inflation.
- **Letter-spacing for width matching:** Start with `tracking-[0.15em]` on "Song Pick". Tune via Playwright measurement until both heading spans are within 4px of each other. Fallback: `transform: scaleX()` if letter-spacing alone can't achieve parity.
- **FrostedCard:** Not used — the section has no card wrapper (consistent with v2).
- **Text opacity:** "Join 117K+ other followers!" uses `text-white/70` (muted caption, not primary content).

### New patterns

None — this spec uses only existing visual patterns (GlowBackground, GRADIENT_TEXT_STYLE, section dividers, frosted glass button style).

## Out of Scope

- Functional changes to the Spotify iframe (src, allow, loading, onLoad attributes)
- Changes to `useOnlineStatus` hook usage
- Changes to `OfflineMessage` or `SkeletonBlock` behavior
- Adding new interactive elements or auth gates
- Song rotation logic changes
- Any backend work

## Constraints

- **Single file edit:** Only `src/components/SongPickSection.tsx`
- **Visuals only:** All functional behavior must remain identical

## Implementation Notes for /plan

### Letter-Spacing Tuning Process

1. Start with `tracking-[0.15em]` on "Song Pick"
2. Use Playwright to measure `boundingBox().width` of both heading spans at desktop (1440px)
3. If widths differ by more than 4px, adjust tracking:
   - Too narrow: try `tracking-[0.18em]`, `tracking-[0.20em]`, `tracking-[0.25em]`
   - Too wide: try `tracking-[0.12em]`, `tracking-widest` (0.1em)
4. If letter-spacing alone fails, use `transform: scaleX()` with `transformOrigin: 'left'` as fallback

### Playwright Verification Targets

- **Desktop 1440x900:** Both heading spans within 4px width. CTA bottom within 8px of player bottom.
- **Tablet 768x1024:** Side-by-side layout holds. Bottom alignment within 8px.
- **Mobile 375x812:** Stacked layout, all centered, no horizontal overflow.

## Acceptance Criteria

- [ ] "Today's" renders in `GRADIENT_TEXT_STYLE` at `text-4xl sm:text-5xl lg:text-6xl`
- [ ] "Song Pick" renders in plain `text-white` at `text-2xl sm:text-3xl lg:text-4xl`
- [ ] "Song Pick" uses letter-spacing (starting at `tracking-[0.15em]`) to match "Today's" rendered width
- [ ] Playwright-measured widths of both heading spans within 4px of each other on desktop (1440px)
- [ ] Both heading spans use `leading-none`
- [ ] Row uses `md:items-stretch` to force column equal heights
- [ ] Left column uses `md:justify-between` for top/bottom internal distribution
- [ ] "Follow Our Playlist" button + "Join 117K+" caption pinned to bottom of left column on desktop
- [ ] Bottom of "Join 117K+" caption aligns with bottom of Spotify player within 8px on desktop and tablet
- [ ] Mobile layout stacks correctly: heading, CTA, player — all centered, no horizontal overflow
- [ ] No duplicate CTA blocks (single CTA block replaces the previous desktop/mobile variant pair)
- [ ] `GlowBackground variant="left"` wraps the section
- [ ] Section divider `border-t border-white/[0.08]` visible above content
- [ ] No visual regressions on offline state or loading skeleton
- [ ] All existing iframe attributes (`src`, `allow`, `loading`, `onLoad`) unchanged
- [ ] `useOnlineStatus` hook usage unchanged
- [ ] All existing tests continue to pass
