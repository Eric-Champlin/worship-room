# Implementation Plan: Song Pick Redesign (v2 — Player-Height Alignment)

**Spec:** `_specs/song-pick-redesign-01.md`
**Date:** 2026-04-04
**Branch:** `claude/feature/song-pick-redesign-01`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06, ⚠️ predates Round 3 Song Pick redesign; current `SongPickSection.tsx` v1 is the authoritative source for existing values)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Files

- **`frontend/src/components/SongPickSection.tsx`** (86 lines) — the **only** production file being modified. Currently renders v1 redesign: `GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent"` wrapper, section divider (`max-w-xl border-t border-white/[0.08]`), 2-line heading ("Today's" gradient `text-3xl sm:text-4xl lg:text-5xl`, "Song Pick" white `text-4xl sm:text-5xl lg:text-6xl`), 152px Spotify iframe, "Follow Our Playlist" button under the heading, offline fallback via `OfflineMessage`.
- **`frontend/src/pages/DailyHub.tsx`** (line 381) — parent page. Renders `<SongPickSection />` at the bottom, after tab panels and before `<SiteFooter>`. Page root has `bg-hero-bg`. No wrapper around SongPickSection.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (85 lines) — glow wrapper. Variants: `center`, `left`, `right`, `split`, `none`. `glowOpacity` prop overrides per-variant defaults. Container applies `bg-hero-bg`. Children wrapped in `relative z-10`. Uses `data-testid="glow-orb"` on orb divs.
- **`frontend/src/constants/gradients.tsx`** — exports `GRADIENT_TEXT_STYLE` (CSSProperties: `backgroundImage: WHITE_PURPLE_GRADIENT`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`) and `WHITE_PURPLE_GRADIENT` (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`).
- **`frontend/src/components/skeletons/SkeletonBlock.tsx`** — loading skeleton. Props: `width`, `height` (number or string), `rounded`, `className`. Renders `aria-hidden="true"` shimmer div. Unchanged but `height` changes from `152` to `352`.
- **`frontend/src/components/pwa/OfflineMessage.tsx`** — offline status component. Props: `message`, `variant: 'dark' | 'light'`. Unchanged.
- **`frontend/src/hooks/useOnlineStatus.ts`** — online/offline detection. Unchanged.
- **`frontend/src/constants/daily-experience.ts`** — exports `SPOTIFY_EMBED_BASE` and `SPOTIFY_PLAYLIST_URL`. Unchanged.
- **`frontend/src/mocks/daily-experience-mock-data.ts`** — exports `getSongOfTheDay(day)`. Unchanged.
- **`frontend/src/components/__tests__/SongPickSection.test.tsx`** (99 lines, 12 tests) — main test file. Wrapper: `MemoryRouter` only. No auth/toast providers.
- **`frontend/src/components/__tests__/SongPickSection-offline.test.tsx`** (52 lines, 3 tests) — offline test. Mocks `useOnlineStatus` via `vi.mock()`. Wrapper: `MemoryRouter` only.

### Key Patterns

- **GlowBackground inside tab content:** `SongPickSection`, `DevotionalTabContent`, and `MeditateTabContent` all wrap their inner content in `<GlowBackground>` with `className="!bg-transparent"` to prevent double-layering with the Daily Hub page-root `bg-hero-bg`. Preserved.
- **Gradient headings:** The 2-line gradient pattern (one line plain white, the other with `GRADIENT_TEXT_STYLE`) is used across Daily Hub tabs. v1 put gradient on the smaller top line; v2 inverts this — gradient goes on the LARGER line ("Today's") as the visual anchor.
- **Section dividers:** `border-t border-white/[0.08]` — content-width (not full viewport). v1 used `max-w-xl`; v2 retains `max-w-xl` per spec requirement #8.
- **Responsive CTA duplication:** Standard Tailwind pattern for rendering the same element in two different DOM positions at different breakpoints: wrap one copy in `hidden md:block`, another in `md:hidden`. Both copies always exist in DOM at every viewport but only one is visible. This avoids JS-based conditional rendering.

### Test Patterns

- Wrapper: `MemoryRouter` only (no auth or toast providers — section is purely presentational).
- Assertions: `screen.getByRole('heading')`, `document.querySelector('iframe')`, `screen.getAllByRole('link')` (for duplicated CTA), class checks via `.closest()` and `.toHaveClass()`, `data-testid` lookup for glow orb.
- Offline tests mock `useOnlineStatus` via `vi.mock()`.
- jsdom **does not apply media queries**, so elements hidden via `hidden md:block` or `md:hidden` are still present in the DOM tree during tests. Tests that assert element counts must use `getAllByRole` / `getAllByText` and assert `.length === 2` for the duplicated CTA and follower caption.

---

## Auth Gating Checklist

No auth gating needed. This section is purely presentational with no user-generated content or saved state. All actions (view, play Spotify, follow playlist) work identically for logged-out and logged-in users. Spec confirms: "No auth gating needed. This section is purely presentational with no user-generated content or saved state."

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground wrapper | variant | `left` | spec req #9 |
| GlowBackground wrapper | glowOpacity | `0.30` | existing v1 code, within 0.25-0.35 standard range per `09-design-system.md` |
| GlowBackground wrapper | className | `!bg-transparent` | pattern from DevotionalTabContent/MeditateTabContent |
| Section container | padding | `px-4 py-12 sm:px-6 sm:py-16` | spec design notes |
| Section container | aria-labelledby | `song-pick-heading` | spec req #7 |
| Section divider | classes | `border-t border-white/[0.08]` | spec req #8, `09-design-system.md` § Section Dividers |
| Section divider | width | `max-w-xl mx-auto` | spec req #8 |
| Section divider | aria | `aria-hidden="true"` | spec acceptance criteria (line 116 of spec) |
| Content flex row | classes | `mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12` | spec design notes + ±8px alignment deviation (2026-04-04) |
| Left column | classes | `flex-shrink-0 text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between` | spec design notes ("`md:pt-2`" replaces v1's `md:pt-4`) + ±8px alignment deviation: stretch via parent `md:items-stretch`; `md:justify-between` pushes CTA to bottom. **Do NOT add `md:h-full` — defining explicit height:100% prevents `align-items:stretch` from taking effect.** (2026-04-04) |
| Heading `<h2>` | id | `song-pick-heading` | spec req #7 |
| Heading `<h2>` | classes | `flex flex-col` | spec design notes ("Heading is `flex flex-col` with stacked spans") |
| "Today's" span | style | `GRADIENT_TEXT_STYLE` from `constants/gradients` | spec req #1, acceptance criteria line 110 |
| "Today's" span | classes | `text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl` | spec heading typography scale (line 55-58) |
| "Song Pick" span | color | `text-white` | spec req #1, acceptance criteria line 111 |
| "Song Pick" span | classes | `mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl` | spec heading typography scale (line 55-58) |
| Desktop CTA wrapper | classes | `mt-6 hidden md:block` | spec responsive behavior (req #6, line 61) |
| Mobile CTA wrapper | classes | `mt-6 text-center md:hidden` | spec responsive behavior (req #6, line 61) |
| Follow button | classes | `inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100` | existing v1 code (retained per spec design notes) |
| Follow button | attributes | `target="_blank" rel="noopener noreferrer"` | spec req #5, acceptance criteria line 122 |
| Follow button | href | `SPOTIFY_PLAYLIST_URL` | existing constant |
| Follower count | classes | `mt-2 text-xs text-white/70` | existing v1 code |
| Follower count | text | `Join 117K+ other followers!` | existing v1 code |
| Right column | classes | `w-full min-w-0 flex-1 max-w-xl` | spec design notes (`min-w-0 flex-1` added so column fills without overflow) |
| Iframe | height | `352` | spec req #2, acceptance criteria line 112 |
| Iframe | width | `100%` | existing v1 code |
| Iframe | src | `${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0` | existing v1 code (unchanged per spec req #1) |
| Iframe | allow | `autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture` | existing v1 code (unchanged per spec req #1) |
| Iframe | loading | `lazy` | existing v1 code (unchanged per spec req #1) |
| Iframe | className | `cn('rounded-xl', !iframeLoaded && 'invisible')` | spec acceptance criteria line 121 |
| SkeletonBlock | height | `352` | spec req #3, acceptance criteria line 112 |
| SkeletonBlock | rounded | `rounded-xl` | existing v1 code (matches iframe) |
| Skeleton wrapper | classes | `absolute inset-0 z-10` | existing v1 code |
| Skeleton wrapper | aria | `aria-busy="true"` | existing v1 code, spec acceptance criteria line 121 |
| Skeleton label | classes | `sr-only` | existing v1 code, spec acceptance criteria line 121 |
| Offline message | variant | `dark` | spec acceptance criteria line 120 |
| Offline message | message | `Spotify playlists available when online` | spec acceptance criteria line 120 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` for gradient text on headings — NOT inline CSS.
- GlowBackground inside tab/section content uses `className="!bg-transparent"` to avoid double-layering with the DailyHub page-root `bg-hero-bg`.
- GlowBackground default opacities (0.12-0.15) are too low per design system rules; use `glowOpacity={0.30}` for standard sections (0.25-0.35 range).
- All text on dark backgrounds uses `text-white` by default on homepage/Daily Hub; muted opacities only for decorative/secondary elements (`text-white/70` for the follower caption is existing).
- Section dividers use `border-t border-white/[0.08]` at content width (not full viewport) and must include `aria-hidden="true"` because they are purely decorative.
- No Caveat font (`font-script`) on redesigned headings — 2-line gradient pattern replaces it entirely.
- v2 inverts the v1 heading sizes: "Today's" is now LARGER (`text-4xl`/`text-5xl`/`text-6xl`) because it is the visual anchor; "Song Pick" is now SMALLER (`text-2xl`/`text-3xl`/`text-4xl`).
- Spotify full embed is `352` tall (v2). v1 was 152 (compact). Skeleton height MUST match iframe height or a layout jump occurs on load.
- The "Follow Our Playlist" CTA must be rendered exactly ONCE per viewport — use `hidden md:block` / `md:hidden` on two DOM copies. In jsdom, BOTH copies are present; tests must use `getAllByRole` and assert `length === 2`.
- Daily Hub root container is `bg-hero-bg`; Song Pick section is a full-bleed below-tabs section, not wrapped in a card.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual refinement with no data model changes.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Stacked layout (`flex-col`). Heading centered above player. Follow CTA (mobile copy, `md:hidden`) centered under player. Desktop CTA copy hidden. Heading: "Today's" `text-4xl`, "Song Pick" `text-2xl`. |
| Tablet (sm) | 640px | Still stacked. Typography upscales: "Today's" `text-5xl`, "Song Pick" `text-3xl`. |
| Tablet (md) | 768px | Side-by-side activates (`md:flex-row`). Heading left-aligned (`md:text-left`). Desktop CTA copy (`hidden md:block`) visible under heading; mobile CTA copy hidden. Columns stretch to match player height (`md:items-stretch`); left column pins heading top + CTA bottom (`md:flex md:flex-col md:justify-between`, `md:pt-2`). Player capped at `max-w-xl`. Gap `md:gap-12`. |
| Desktop (lg) | 1440px | Same side-by-side layout. Typography: "Today's" `lg:text-6xl`, "Song Pick" `lg:text-4xl`. Player 352px tall; bottom edge aligns (±8px) with bottom of "Join 117K+ other followers!" caption. |

**Custom breakpoints:** None. Uses Tailwind defaults: sm=640px, md=768px, lg=1024px.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Preceding DailyHub tab content → section top | Section has `py-12 sm:py-16` (48px mobile, 64px ≥640px) | existing v1 code |
| Section top padding → section divider | `py-12`/`py-16` top half only (top padding of section) | existing v1 code |
| Section divider → content flex row | `pt-8` (32px) via flex container's `pt-8` | existing v1 code |
| Flex row children (mobile stack) | `gap-8` (32px between heading and player) | existing v1 code |
| Flex row children (≥768px side-by-side) | `md:gap-12` (48px horizontal gap between columns) | existing v1 code |
| Heading → Desktop CTA (left column, ≥768px) | `mt-6` (24px) | existing v1 code |
| Player → Mobile CTA (right column, <768px) | `mt-6` (24px) | derived from same spacing pattern as desktop CTA |
| Follow button → follower caption | `mt-2` (8px) | existing v1 code |
| Section bottom → next element (SiteFooter) | Section bottom `py-12 sm:py-16` (48/64px) | existing v1 code |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file exists at `_specs/song-pick-redesign-01.md`
- [x] Branch `claude/feature/song-pick-redesign-01` exists (current branch)
- [x] v1 redesign at `_plans/2026-04-03-song-pick-redesign.md` is complete and merged (commit `b36697a`)
- [x] `GlowBackground` supports `glowOpacity` prop
- [x] `GRADIENT_TEXT_STYLE` constant exists in `constants/gradients.tsx`
- [x] `SkeletonBlock` accepts numeric `height` prop
- [x] `SPOTIFY_EMBED_BASE` and `SPOTIFY_PLAYLIST_URL` exist in `constants/daily-experience.ts`
- [x] `getSongOfTheDay(day)` exists in `mocks/daily-experience-mock-data.ts`
- [x] `useOnlineStatus` exists in `hooks/useOnlineStatus.ts`
- [x] `OfflineMessage` supports `variant="dark"` and `message` props
- [x] No auth-gated actions — no auth checks needed
- [x] Design system values sourced from existing v1 code and spec (all traced in Design System Values table)
- [x] No [UNVERIFIED] values — all values sourced from spec or existing v1 code
- [x] This is a standalone refinement — no master plan dependencies

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CTA appears at two locations (desktop vs mobile) — how to implement? | Duplicate DOM with `hidden md:block` / `md:hidden` wrappers | Standard Tailwind responsive pattern. Avoids JS resize listeners. Per spec req #6: "(never duplicated, never in both locations at once)" refers to visible rendering per breakpoint — DOM duplication is acceptable. |
| Use `<SectionHeading>` component? | No, use inline `<h2>` with two `<span>` children | v1 precedent + spec design notes ("split here is semantic"). The `SectionHeading` topLine/bottomLine pattern has the gradient on the LARGER bottom line, which here would be "Song Pick" — opposite of v2 requirement. |
| Heading element uses `flex flex-col` or block spans? | `flex flex-col` on the `<h2>` | Spec design notes: "Heading is `flex flex-col` with stacked spans." The `flex flex-col` guarantees two lines even if a future CSS change removed `block` from spans. |
| `aria-hidden="true"` on section divider? | Yes, always | Spec acceptance criteria line 116 explicitly requires it. Divider is purely decorative; screen readers should skip it. |
| `isOnline` guard wraps both CTA copies? | Yes, both | Spec req #5 + existing v1 behavior: Spotify link depends on internet; hiding it when offline is consistent with hiding the iframe. |
| `min-w-0 flex-1` on right column? | Yes | Spec design notes: "Player container uses `max-w-xl` and `min-w-0 flex-1` so it fills the remaining space without overflow." `min-w-0` is necessary on a flex child to allow shrinking below intrinsic iframe content width. |
| Mobile CTA placement — new sibling OR inside right column? | Inside right column (sibling of iframe) | Keeps the "under player" visual grouping and ensures it's hidden with the player when offline (since the CTA is inside the `{isOnline ? ... : ...}` branch). |
| Duplicated "Follow Our Playlist" link in DOM affects existing tests? | Yes — tests using `getByRole('link', ...)` and `getByText('117K+')` will fail due to multiple matches | Update tests to use `getAllByRole` / `getAllByText` and assert `length === 2`. |
| Mobile CTA wrapper needs `text-center`? | Yes | Right column has no inherited text-alignment; CTA caption and inline-flex button need explicit centering on mobile per spec (line 48: "centered under the player"). |

---

## Implementation Steps

### Step 1: Update SongPickSection component — v2 layout

**Status:** [COMPLETE]

**Objective:** Rebalance heading typography (gradient "Today's" becomes the larger anchor, "Song Pick" becomes smaller), restore the full-height 352px Spotify embed, and duplicate the "Follow Our Playlist" CTA so it appears under the heading on desktop and under the player on mobile.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — update JSX structure and sizes (imports unchanged from v1)

**Details:**

Open `frontend/src/components/SongPickSection.tsx`. Imports, hook calls, and state are unchanged from v1:

```tsx
import { useState } from 'react'

import { getSongOfTheDay } from '@/mocks/daily-experience-mock-data'
import { SPOTIFY_EMBED_BASE, SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SkeletonBlock } from '@/components/skeletons/SkeletonBlock'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'

export function SongPickSection() {
  const { isOnline } = useOnlineStatus()
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const today = new Date().getDate()
  const song = getSongOfTheDay(today)

  return (
    ...
  )
}
```

Replace the returned JSX (lines 18-85) with the following. This is the complete new `return` body:

```tsx
    <GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
      <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
        {/* Section divider */}
        <div
          aria-hidden="true"
          className="mx-auto max-w-xl border-t border-white/[0.08]"
        />

        {/* Content container — side-by-side at md */}
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12">

          {/* Left: Heading + desktop CTA */}
          <div className="flex-shrink-0 text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between">
            <h2 id="song-pick-heading" className="flex flex-col">
              <span
                className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={GRADIENT_TEXT_STYLE}
              >
                Today&apos;s
              </span>
              <span className="mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                Song Pick
              </span>
            </h2>

            {/* Desktop CTA: below heading, hidden on mobile */}
            {isOnline && (
              <div className="mt-6 hidden md:block">
                <a
                  href={SPOTIFY_PLAYLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
                >
                  Follow Our Playlist
                </a>
                <p className="mt-2 text-xs text-white/70">Join 117K+ other followers!</p>
              </div>
            )}
          </div>

          {/* Right: Spotify player (or offline message) + mobile CTA */}
          <div className="w-full min-w-0 flex-1 max-w-xl">
            {isOnline ? (
              <>
                <div className="relative">
                  {!iframeLoaded && (
                    <div className="absolute inset-0 z-10" aria-busy="true">
                      <span className="sr-only">Loading</span>
                      <SkeletonBlock height={352} rounded="rounded-xl" />
                    </div>
                  )}
                  <iframe
                    title={`${song.title} by ${song.artist}`}
                    src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
                    width="100%"
                    height="352"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className={cn('rounded-xl', !iframeLoaded && 'invisible')}
                    onLoad={() => setIframeLoaded(true)}
                  />
                </div>

                {/* Mobile CTA: below player, hidden on desktop */}
                <div className="mt-6 text-center md:hidden">
                  <a
                    href={SPOTIFY_PLAYLIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
                  >
                    Follow Our Playlist
                  </a>
                  <p className="mt-2 text-xs text-white/70">Join 117K+ other followers!</p>
                </div>
              </>
            ) : (
              <OfflineMessage variant="dark" message="Spotify playlists available when online" />
            )}
          </div>
        </div>
      </section>
    </GlowBackground>
```

**Changes from v1:**
- `<div className="mx-auto max-w-xl border-t border-white/[0.08]" />` → adds `aria-hidden="true"` attribute.
- Heading `<h2>` → adds `className="flex flex-col"` (removes text-center class on `<h2>`; alignment is inherited from parent `text-center md:text-left`).
- "Today's" span → size `text-3xl sm:text-4xl lg:text-5xl` → `text-4xl sm:text-5xl lg:text-6xl` (larger); removes `block` (redundant inside `flex flex-col`).
- "Song Pick" span → size `text-4xl sm:text-5xl lg:text-6xl` → `text-2xl sm:text-3xl lg:text-4xl` (smaller); removes `block` (redundant inside `flex flex-col`).
- Left column `<div>` → classes `flex shrink-0 flex-col items-center md:items-start md:pt-4` → `flex-shrink-0 text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between` (removes mobile `flex flex-col items-center md:items-start`, adds `text-center md:text-left`, changes `md:pt-4` → `md:pt-2`, adds `md:flex md:flex-col md:justify-between` so heading pins to top and CTA pins to bottom at ≥md, satisfying the ±8px player-caption alignment acceptance criterion). **Note:** Do NOT add `md:h-full` — `height: 100%` defines an explicit cross-axis size which prevents the parent's `md:items-stretch` from taking effect. The left column stretches to 352px via `items-stretch` alone.
- Content row → `md:items-start` → `md:items-stretch` so the left column grows to match the 352px player height at ≥md.
- Desktop CTA `<div>` → `mt-6 text-center md:text-left` → `mt-6 hidden md:block` (hides on mobile, shown from `md` breakpoint).
- Right column `<div>` → classes `w-full max-w-xl flex-1` → `w-full min-w-0 flex-1 max-w-xl` (adds `min-w-0`).
- Right column inner `{isOnline ? ... : ...}` now wraps the iframe in a React fragment `<>...</>` and adds a mobile CTA sibling after the iframe container.
- Iframe `height` → `"152"` → `"352"`.
- SkeletonBlock `height` → `152` → `352`.
- New: mobile CTA block (duplicate of desktop CTA, wrapped in `md:hidden text-center`).

**Auth gating:** N/A

**Responsive behavior:**
- Mobile (375px): `flex-col items-center`. Heading centered above player. Desktop CTA hidden. Mobile CTA (inside right column, after iframe) visible, centered. Heading sizes `text-4xl` + `text-2xl`. Glow orb at left 20%, smaller size via `w-[300px] h-[300px]` (GlowBackground mobile defaults).
- Tablet (768px, `md` breakpoint): `md:flex-row`. Heading pinned to top-left of left column (`md:items-start`, `md:pt-2`, `md:text-left`). Desktop CTA visible under heading. Mobile CTA hidden. Player in right column at `max-w-xl`. Heading sizes `text-5xl` + `text-3xl`. Glow orb larger `md:w-[500px] md:h-[500px]`.
- Desktop (1440px, `lg` breakpoint): Same side-by-side layout. Typography upscales to `text-6xl` + `text-4xl`. Player at 352px height. Bottom of player aligns (±8px) with bottom of follower caption per spec acceptance criteria line 113.

**Guardrails (DO NOT):**
- DO NOT change the Spotify iframe `src`, `allow`, `loading`, `title`, or `width` attributes (spec req #1).
- DO NOT change the `useOnlineStatus` or `OfflineMessage` behavior (spec req #4).
- DO NOT use `SectionHeading` component (spec design notes explicitly rule this out for this section).
- DO NOT use Caveat font (`font-script`) on the heading.
- DO NOT add any auth gating.
- DO NOT change the song rotation logic (`getSongOfTheDay(today)`) or the playlist URL constant.
- DO NOT remove `aria-labelledby` on the section or `id` on the heading (spec req #7).
- DO NOT remove `aria-busy="true"` from the skeleton wrapper or `sr-only "Loading"` label (spec acceptance criteria line 121).
- DO NOT remove `aria-hidden="true"` from the section divider (spec acceptance criteria line 116).
- DO NOT add a glass-card / `FrostedCard` wrapper around any element (spec design notes).
- DO NOT render the CTA in BOTH locations visibly at the same breakpoint — `hidden md:block` and `md:hidden` must be paired so exactly one copy is visible per viewport (spec req #6).
- DO NOT import `Music` from `lucide-react`, `HeadingDivider`, or `useElementWidth` (spec req #8 / acceptance criteria line 118-119).
- DO NOT change the offline message text or variant (spec acceptance criteria line 120).

**Test specifications:** (tests updated in Step 2, but this step is verified by the test run at the end of Step 2)

| Test | Type | Description |
|------|------|-------------|
| (verified in Step 2) | integration | All test assertions driven by the new layout |

**Expected state after completion:**
- [ ] `SongPickSection.tsx` JSX matches the code block above exactly.
- [ ] File compiles without TS errors (`pnpm build` or editor diagnostics clean).
- [ ] Existing imports are unchanged; no new imports added.
- [ ] Manual visual check (dev server): on desktop, gradient "Today's" is larger than white "Song Pick"; 352px tall player on the right; bottom of player aligns with follower caption. On mobile, heading stacks above player, CTA appears below player and is centered.
- [ ] Existing tests are EXPECTED to fail after this step (they reference `height="152"` and single CTA link); Step 2 updates them.

---

### Step 2: Update tests for v2 layout

**Status:** [COMPLETE]

**Objective:** Update `SongPickSection.test.tsx` and `SongPickSection-offline.test.tsx` to match the v2 layout — specifically the new iframe/skeleton height (352), the duplicated Follow CTA (2 DOM instances), the `aria-hidden` divider, and the `flex flex-col` heading element.

**Files to modify:**
- `frontend/src/components/__tests__/SongPickSection.test.tsx` — update existing 12 tests and add 2 new tests.
- `frontend/src/components/__tests__/SongPickSection-offline.test.tsx` — no structural change needed (offline tests already use `getByRole('heading')` and `document.querySelector('iframe')`, which still work); add an optional 352 height assertion to the online iframe test.

**Details:**

**`SongPickSection.test.tsx`** — update these specific tests:

1. **`renders Spotify iframe with 152px height`** — rename and change expected height:
   ```typescript
   it('renders Spotify iframe with 352px height', () => {
     renderComponent()
     const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
     expect(iframe).toBeInTheDocument()
     expect(iframe.getAttribute('height')).toBe('352')
     expect(iframe.getAttribute('src')).toContain('open.spotify.com/embed/track')
   })
   ```

2. **`renders Follow Our Playlist link`** — switch from `getByRole` to `getAllByRole` (CTA now rendered twice in DOM: once `hidden md:block`, once `md:hidden`):
   ```typescript
   it('renders two Follow Our Playlist links (one per breakpoint)', () => {
     renderComponent()
     const links = screen.getAllByRole('link', { name: /follow our playlist/i })
     expect(links).toHaveLength(2)
     links.forEach((link) => {
       expect(link).toHaveAttribute('href', SPOTIFY_PLAYLIST_URL)
       expect(link).toHaveAttribute('target', '_blank')
       expect(link).toHaveAttribute('rel', 'noopener noreferrer')
     })
   })
   ```

3. **`renders follower count text`** — switch from `getByText` to `getAllByText`:
   ```typescript
   it('renders follower count text in two places (one per breakpoint)', () => {
     renderComponent()
     const captions = screen.getAllByText(/117K\+/)
     expect(captions).toHaveLength(2)
   })
   ```

4. **`renders section divider`** — add `aria-hidden` assertion:
   ```typescript
   it('renders section divider with aria-hidden', () => {
     renderComponent()
     const section = screen.getByRole('heading', { level: 2 }).closest('section')
     const divider = section?.querySelector('.border-t')
     expect(divider).toBeInTheDocument()
     expect(divider).toHaveAttribute('aria-hidden', 'true')
   })
   ```

Add these **2 new tests** to the existing `describe` block:

5. **Test that desktop CTA has `hidden md:block` classes:**
   ```typescript
   it('desktop CTA is hidden on mobile via responsive class', () => {
     renderComponent()
     const links = screen.getAllByRole('link', { name: /follow our playlist/i })
     // One wrapper has `hidden md:block`, the other has `md:hidden`
     const wrappers = links.map((l) => l.closest('div'))
     const hiddenOnMobile = wrappers.find((w) => w?.className.includes('hidden md:block'))
     const hiddenOnDesktop = wrappers.find((w) => w?.className.includes('md:hidden'))
     expect(hiddenOnMobile).toBeInTheDocument()
     expect(hiddenOnDesktop).toBeInTheDocument()
   })
   ```

6. **Test that heading uses `flex flex-col` and has the correct size classes:**
   ```typescript
   it('heading is flex-col with gradient "Today\'s" as the larger line', () => {
     renderComponent()
     const heading = screen.getByRole('heading', { level: 2 })
     expect(heading).toHaveClass('flex', 'flex-col')
     const spans = heading.querySelectorAll('span')
     expect(spans).toHaveLength(2)
     // First span = "Today's" (gradient, larger)
     expect(spans[0]).toHaveTextContent("Today's")
     expect(spans[0].className).toContain('text-4xl')
     expect(spans[0].className).toContain('sm:text-5xl')
     expect(spans[0].className).toContain('lg:text-6xl')
     // Second span = "Song Pick" (white, smaller)
     expect(spans[1]).toHaveTextContent('Song Pick')
     expect(spans[1]).toHaveClass('text-white')
     expect(spans[1].className).toContain('text-2xl')
     expect(spans[1].className).toContain('sm:text-3xl')
     expect(spans[1].className).toContain('lg:text-4xl')
   })
   ```

Leave these existing tests UNCHANGED (they still pass):
- `renders heading with gradient "Today's" and white "Song Pick"` — uses `toHaveTextContent` which checks combined text
- `applies gradient text style to "Today's" line` — checks `backgroundClip: 'text'` on first span
- `does not render music icon in heading` — no SVG in heading
- `does not render HeadingDivider` — still zero SVGs with viewBox in the section
- `does not render glass card wrapper` — no backdrop-blur on ancestor
- `renders GlowBackground with glow orb` — still uses `data-testid="glow-orb"`
- `has accessible section with aria-labelledby` — unchanged markup
- `does not use Caveat script font` — no `font-script`

Final test count in `SongPickSection.test.tsx`: **14 tests** (12 existing, 4 modified above, 2 new).

**`SongPickSection-offline.test.tsx`** — optional strengthening of the online iframe test:

```typescript
it('shows iframe when online', () => {
  mockUseOnlineStatus.mockReturnValue({ isOnline: true })
  renderWithRouter()
  const iframe = document.querySelector('iframe')
  expect(iframe).toBeInTheDocument()
  expect(iframe?.getAttribute('height')).toBe('352')
  expect(
    screen.queryByText('Spotify playlists available when online')
  ).not.toBeInTheDocument()
})
```

All 3 offline tests remain (both heading assertions use `getByRole('heading')` which still works with `flex-col` spans).

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (test-only step).

**Guardrails (DO NOT):**
- DO NOT add an auth provider wrapper (not needed — section is presentational).
- DO NOT remove any existing offline test coverage.
- DO NOT change the `MemoryRouter` wrapper pattern.
- DO NOT mock `GlowBackground` or `SkeletonBlock` — test the integrated render.
- DO NOT use `getByRole` for the Follow link (will throw on multiple matches).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| 14 tests pass in `SongPickSection.test.tsx` | verification | `pnpm test -- SongPickSection.test` |
| 3 tests pass in `SongPickSection-offline.test.tsx` | verification | `pnpm test -- SongPickSection-offline` |
| Full test suite remains green | verification | `pnpm test` — no other tests should break |

**Expected state after completion:**
- [ ] 14 tests pass in `SongPickSection.test.tsx`
- [ ] 3 tests pass in `SongPickSection-offline.test.tsx`
- [ ] Existing non-SongPickSection tests unchanged and passing
- [ ] `pnpm build` succeeds with 0 TS errors, 0 new lint warnings
- [ ] Every spec acceptance criterion is covered by at least one test OR verified by visual inspection (the ±8px alignment between player and caption is a layout metric, verified by `/verify-with-playwright`, not a unit test)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Update SongPickSection component JSX (heading sizes, 352px iframe, duplicated responsive CTA, `aria-hidden` divider) |
| 2 | 1 | Update tests to match v2 layout (rename/modify 4 tests, add 2 new tests, optionally strengthen online iframe test) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Update SongPickSection component — v2 layout | [COMPLETE] | 2026-04-04 | Updated `frontend/src/components/SongPickSection.tsx` per plan. **Deviation:** Added `md:flex md:flex-col md:justify-between` to the left column and changed the content row from `md:items-start` → `md:items-stretch` to satisfy the ±8px player-caption alignment acceptance criterion (spec line 113). Original plan JSX left a 152px delta between iframe bottom and caption bottom at desktop. `md:h-full` was tried but removed — `height:100%` defines an explicit cross-axis size that prevents `align-items:stretch`. Verified: delta = 0px at both desktop (1440) and tablet (768). TypeScript clean. |
| 2 | Update tests for v2 layout | [COMPLETE] | 2026-04-04 | Modified `frontend/src/components/__tests__/SongPickSection.test.tsx` (4 tests updated: iframe height 152→352, Follow link single→two via `getAllByRole`, follower caption single→two via `getAllByText`, divider + aria-hidden check; 2 new tests added: desktop/mobile CTA responsive class wrappers, heading flex-col + "Today's" larger than "Song Pick"). Modified `frontend/src/components/__tests__/SongPickSection-offline.test.tsx` (strengthened online iframe test with 352 height assertion). Results: 14 SongPickSection tests + 3 offline tests = 17 pass. Build succeeds with 0 TS errors, 0 new lint warnings. Pre-existing FinalCTA test failures confirmed unrelated to this work (verified via stash). |
