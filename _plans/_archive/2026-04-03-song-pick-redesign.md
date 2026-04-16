# Implementation Plan: Song Pick Redesign

**Spec:** `_specs/song-pick-redesign.md`
**Date:** 2026-04-03
**Branch:** `claude/feature/song-pick-redesign`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-03-06)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Files

- **`frontend/src/components/SongPickSection.tsx`** (80 lines) — the **only** production file being modified. Currently renders: glass card wrapper (`bg-white/[0.03] border-white/[0.06] backdrop-blur-sm rounded-2xl`), Caveat heading with Music icon + HeadingDivider, 280px Spotify iframe, "Follow Our Playlist" button, offline fallback.
- **`frontend/src/pages/DailyHub.tsx`** (424 lines) — parent page. SongPickSection rendered at line 398, after all tab panels, before StartingPointQuiz. Page root has `bg-hero-bg`. No wrapper around SongPickSection — it renders bare inside `<main>`.
- **`frontend/src/components/homepage/GlowBackground.tsx`** (85 lines) — glow wrapper. Variants: `center`, `left`, `right`, `split`, `none`. Has `glowOpacity` prop. Container applies `bg-hero-bg`. Children wrapped in `relative z-10`.
- **`frontend/src/constants/gradients.tsx`** (32 lines) — `GRADIENT_TEXT_STYLE` (CSSProperties with `backgroundImage: WHITE_PURPLE_GRADIENT`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`) and `WHITE_PURPLE_GRADIENT` string (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`).
- **`frontend/src/components/HeadingDivider.tsx`** — decorative SVG divider. **Being removed** from SongPickSection.
- **`frontend/src/hooks/useElementWidth.ts`** — ResizeObserver hook. **Being removed** from SongPickSection (was only used for HeadingDivider).
- **`frontend/src/components/pwa/OfflineMessage.tsx`** — offline status component. Unchanged.
- **`frontend/src/hooks/useOnlineStatus.ts`** — online/offline detection. Unchanged.
- **`frontend/src/components/skeletons/SkeletonBlock.tsx`** — loading skeleton. Unchanged but height changes from 280 to 152.
- **`frontend/src/components/__tests__/SongPickSection.test.tsx`** (56 lines) — main test file. Tests heading, iframe, Follow link, frosted glass card, music icon. Wrapper: `MemoryRouter` only.
- **`frontend/src/components/__tests__/SongPickSection-offline.test.tsx`** (52 lines) — offline test. Mocks `useOnlineStatus`. Tests offline message, heading persistence, iframe online presence. Wrapper: `MemoryRouter` only.

### Key Patterns

- **GlowBackground inside tab content:** DevotionalTabContent and MeditateTabContent both wrap themselves in `<GlowBackground>` with `className="!bg-transparent"` to avoid double-layering with the DailyHub's `bg-hero-bg`. SongPickSection follows the same pattern.
- **Gradient headings:** DevotionalTabContent and MeditateTabContent apply `GRADIENT_TEXT_STYLE` to the second line of a 2-line heading (smaller white top line + larger gradient bottom line). This spec follows the same pattern but inline (not using `SectionHeading` component).
- **Section dividers:** Homepage sections use `border-t border-white/[0.08] max-w-6xl mx-auto`. This spec uses `border-t border-white/[0.08]` constrained to `max-w-xl mx-auto` (spec requirement).
- **Compact Spotify embed:** Height changes from 280px (tall) to 152px (compact). The compact embed shows track art, title, and play button without excess whitespace.
- **Side-by-side layout:** `flex flex-col md:flex-row` pattern with heading on the left, content on the right. Responsive: stacks on mobile, side-by-side at `md` breakpoint.

### Test Patterns

- Wrapper: `MemoryRouter` (no auth or toast providers needed — section is purely presentational).
- Assertions: `screen.getByRole('heading')`, `document.querySelector('iframe')`, `screen.getByRole('link')`, class checks via `.closest()` and `.toHaveClass()`.
- Offline tests mock `useOnlineStatus` via `vi.mock()`.

---

## Auth Gating Checklist

No auth gating needed. This section is purely presentational with no user-generated content or saved state. All actions (view, play Spotify, follow playlist) work identically for logged-out and logged-in users.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground wrapper | variant | `left` | spec: "glow orb on the heading side" |
| GlowBackground wrapper | glowOpacity | `0.30` | `09-design-system.md`: standard sections 0.25-0.35 |
| GlowBackground wrapper | className | `!bg-transparent` | pattern from DevotionalTabContent/MeditateTabContent |
| Section container | max-width | `max-w-4xl` | spec: "expanded from max-w-xl to max-w-4xl" |
| Section divider | border | `border-t border-white/[0.08]` | `09-design-system.md` § Section Dividers |
| Section divider | width | `max-w-xl mx-auto` | spec: design notes |
| Heading "Today's" | style | `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` | spec: "purple gradient text matching GRADIENT_TEXT_STYLE" |
| Heading "Today's" | size | `text-3xl sm:text-4xl lg:text-5xl font-bold` | spec: responsive sizing, follows SectionHeading topLine → bottomLine ratio but these are flipped (smaller top is "Today's", larger bottom is "Song Pick") |
| Heading "Song Pick" | color | `text-white` | spec: "plain white" |
| Heading "Song Pick" | size | `text-4xl sm:text-5xl lg:text-6xl font-bold` | spec: larger line |
| Heading alignment | mobile | `text-center` | spec |
| Heading alignment | desktop | `md:text-left` | spec |
| "Follow Our Playlist" button | classes | `rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100` | existing code (retained per spec) |
| Follower count | classes | `text-xs text-white/70` | existing code |
| Iframe | height | `152` | spec: compact embed |
| Skeleton | height | `152` | spec: match iframe |
| Player container | max-width | `max-w-xl` | spec: prevent over-stretching |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` for gradient text on headings — NOT inline CSS
- GlowBackground inside tab/section content uses `className="!bg-transparent"` to avoid double bg-hero-bg layering
- GlowBackground default opacities (0.12-0.15) are too low per spec; use `glowOpacity={0.30}` for standard sections (0.25-0.35 range)
- All text on dark backgrounds uses `text-white` by default; muted opacities only for decorative/secondary elements
- Section dividers: `border-t border-white/[0.08]` — content-width, not full viewport
- No Caveat font (`font-script`) on redesigned headings — 2-line gradient pattern replaces it
- Spotify compact embed is 152px tall (not 280px or 352px)
- `max-w-4xl` for side-by-side layouts (not `max-w-xl` which is too narrow)

---

## Shared Data Models (from Master Plan)

Not applicable — standalone visual redesign with no data model changes.

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Heading stacked above player, both centered. Button + follower text centered. Single column. |
| Tablet | 768px | Side-by-side layout activates (`md:flex-row`). Heading left, player right. Text left-aligned. |
| Desktop | 1440px | Larger heading sizes (`lg:text-5xl` / `lg:text-6xl`). Player capped at `max-w-xl`. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Tab content → Song Pick section divider | `py-12 sm:py-16` (48/64px) | existing padding on section |
| Section divider → Song Pick content | `pt-8` (32px) | spec: space below divider |
| Song Pick → StartingPointQuiz | Natural flow (no extra margin) | existing: rendered sequentially in DailyHub |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file exists at `_specs/song-pick-redesign.md`
- [x] Branch `claude/feature/song-pick-redesign` exists
- [x] `GlowBackground` already supports `glowOpacity` prop (added during devotional-atmosphere)
- [x] `GRADIENT_TEXT_STYLE` constant available in `constants/gradients.tsx`
- [x] No auth-gated actions — no auth checks needed
- [x] Design system values verified from codebase inspection and design-system.md
- [x] No [UNVERIFIED] values — all values sourced from spec or existing code
- [x] This is a standalone redesign — no master plan dependencies

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Use SectionHeading component vs inline heading? | Inline heading | Spec says "implemented inline (since the split here is semantic — 'Today's' is the qualifier, 'Song Pick' is the subject)". SectionHeading's topLine/bottomLine ratio is inverted here. |
| Heading tag for the "Today's" line | Decorative `<span>` inside `<h2>` | "Song Pick" is the heading subject; "Today's" is a qualifier. Both lines are inside a single `<h2>` for accessibility. |
| GlowBackground variant | `left` | Spec: "variant='left' to position the glow orb on the heading side". On desktop, heading is left. |
| `!bg-transparent` on GlowBackground | Yes | Prevents double `bg-hero-bg` with DailyHub's root container. Pattern established by DevotionalTabContent and MeditateTabContent. |
| Remove `useElementWidth` import | Yes | Only used for HeadingDivider, which is being removed. |
| Follow button style | Retain existing white pill | Spec: "Existing white pill button style retained". |
| Section divider width | `max-w-xl mx-auto` | Spec design notes: matches previous content width, narrower than homepage's `max-w-6xl`. |

---

## Implementation Steps

### Step 1: Redesign SongPickSection component

**Objective:** Replace the current glass-card-centered layout with the side-by-side editorial layout using GlowBackground, gradient heading, section divider, and compact Spotify embed.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — full rewrite of JSX and imports

**Details:**

Remove these imports:
- `Music` from `lucide-react`
- `HeadingDivider` from `@/components/HeadingDivider`
- `useElementWidth` from `@/hooks/useElementWidth`

Add these imports:
- `GlowBackground` from `@/components/homepage/GlowBackground`
- `GRADIENT_TEXT_STYLE` from `@/constants/gradients`

Remove from component body:
- `const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()` (line 19)

New JSX structure (outermost to innermost):

```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    {/* Section divider */}
    <div className="mx-auto max-w-xl border-t border-white/[0.08]" />

    {/* Content container — side-by-side at md */}
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-start md:gap-12">

      {/* Left: Heading + button */}
      <div className="flex shrink-0 flex-col items-center md:items-start md:pt-4">
        <h2 id="song-pick-heading" className="text-center md:text-left">
          <span
            className="block text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
            style={GRADIENT_TEXT_STYLE}
          >
            Today&apos;s
          </span>
          <span className="mt-1 block text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Song Pick
          </span>
        </h2>

        {/* Follow button + follower count — below heading */}
        {isOnline && (
          <div className="mt-6 text-center md:text-left">
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

      {/* Right: Spotify player or offline message */}
      <div className="w-full max-w-xl flex-1">
        {isOnline ? (
          <div className="relative">
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10" aria-busy="true">
                <span className="sr-only">Loading</span>
                <SkeletonBlock height={152} rounded="rounded-xl" />
              </div>
            )}
            <iframe
              title={`${song.title} by ${song.artist}`}
              src={`${SPOTIFY_EMBED_BASE}/${song.trackId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className={cn('rounded-xl', !iframeLoaded && 'invisible')}
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        ) : (
          <OfflineMessage variant="dark" message="Spotify playlists available when online" />
        )}
      </div>
    </div>
  </section>
</GlowBackground>
```

Key changes from current code:
- **Removed:** Glass card wrapper (`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm`)
- **Removed:** `Music` icon, `HeadingDivider`, `useElementWidth`
- **Removed:** Caveat font (`font-script`) from heading
- **Added:** `GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent"`
- **Added:** Section divider (`border-t border-white/[0.08] max-w-xl mx-auto`)
- **Added:** 2-line heading: "Today's" with `GRADIENT_TEXT_STYLE`, "Song Pick" with `text-white`
- **Changed:** `max-w-xl` → `max-w-4xl` on content container
- **Changed:** iframe height `280` → `152`
- **Changed:** skeleton height `280` → `152`
- **Changed:** Layout from centered single-column to `flex-col md:flex-row`
- **Moved:** Follow button from below iframe to below heading (in left column)

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Side-by-side via `md:flex-row`. Heading `lg:text-5xl`/`lg:text-6xl`. Player capped at `max-w-xl`. Text left-aligned.
- Tablet (768px): Side-by-side activates at `md` breakpoint. Heading `sm:text-4xl`/`sm:text-5xl`.
- Mobile (375px): Stacked via `flex-col`. Heading + player centered. Button centered.

**Guardrails (DO NOT):**
- DO NOT change the Spotify iframe `src`, `allow`, or `loading` attributes
- DO NOT change the `useOnlineStatus` or `OfflineMessage` behavior
- DO NOT use `SectionHeading` component (spec says inline heading)
- DO NOT use Caveat font (`font-script`) on the heading
- DO NOT add any auth gating
- DO NOT change the song rotation logic or playlist URL
- DO NOT remove `aria-labelledby` or `id` on the heading

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders heading with "Today's" and "Song Pick" | integration | Verify heading has both text spans, "Song Pick" is visible |
| heading uses gradient text style on "Today's" | integration | Verify the "Today's" span has `backgroundImage` style |
| no music icon in heading | integration | Verify no `<svg>` inside heading |
| no HeadingDivider | integration | Verify no HeadingDivider SVG in section |
| no glass card wrapper | integration | Verify no `backdrop-blur-sm` container |
| renders GlowBackground with glow orb | integration | Verify `[data-testid="glow-orb"]` present |
| Spotify iframe present with 152px height | integration | Verify iframe height="152" |
| skeleton shows 152px height before load | integration | Verify SkeletonBlock renders at 152px |
| Follow Our Playlist link | integration | Verify link href, target, rel attributes |
| follower count text | integration | Verify "Join 117K+" text present |
| section has aria-labelledby | integration | Verify section `aria-labelledby="song-pick-heading"` |
| section divider present | integration | Verify `border-white/[0.08]` divider element |

**Expected state after completion:**
- [ ] SongPickSection renders with side-by-side layout on desktop
- [ ] Purple glow orb visible on the left side
- [ ] Heading: "Today's" in gradient, "Song Pick" in white
- [ ] No music icon, no HeadingDivider, no glass card wrapper
- [ ] Spotify iframe at 152px height (compact embed)
- [ ] Follow button + follower count below heading (left column)
- [ ] Section divider visible above content
- [ ] Offline state still works
- [ ] Build passes with zero errors

---

### Step 2: Update tests

**Objective:** Update both test files to match the redesigned component — remove obsolete assertions (glass card, music icon) and add new assertions (gradient heading, glow background, section divider, 152px iframe).

**Files to modify:**
- `frontend/src/components/__tests__/SongPickSection.test.tsx` — rewrite tests
- `frontend/src/components/__tests__/SongPickSection-offline.test.tsx` — update heading assertion

**Details:**

**`SongPickSection.test.tsx`** — replace all 5 tests with 12 new tests:

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SongPickSection } from '../SongPickSection'
import { SPOTIFY_PLAYLIST_URL } from '@/constants/daily-experience'

function renderComponent() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SongPickSection />
    </MemoryRouter>,
  )
}

describe('SongPickSection', () => {
  it('renders heading with gradient "Today\'s" and white "Song Pick"', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent("Today's")
    expect(heading).toHaveTextContent('Song Pick')
  })

  it('applies gradient text style to "Today\'s" line', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const gradientSpan = heading.querySelector('span')
    expect(gradientSpan).toHaveStyle({ backgroundClip: 'text' })
  })

  it('does not render music icon in heading', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.querySelector('svg')).not.toBeInTheDocument()
  })

  it('does not render HeadingDivider', () => {
    renderComponent()
    // HeadingDivider renders an SVG with specific viewBox
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    const svgs = section?.querySelectorAll('svg[viewBox]') ?? []
    // GlowBackground doesn't render SVGs — only HeadingDivider would
    expect(svgs.length).toBe(0)
  })

  it('does not render glass card wrapper', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    const card = heading.closest('.backdrop-blur-sm.border.rounded-2xl.bg-white\\/\\[0\\.03\\]')
    expect(card).not.toBeInTheDocument()
  })

  it('renders GlowBackground with glow orb', () => {
    renderComponent()
    expect(screen.getByTestId('glow-orb')).toBeInTheDocument()
  })

  it('renders Spotify iframe with 152px height', () => {
    renderComponent()
    const iframe = document.querySelector('iframe[title]') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('height')).toBe('152')
    expect(iframe.getAttribute('src')).toContain('open.spotify.com/embed/track')
  })

  it('renders Follow Our Playlist link', () => {
    renderComponent()
    const link = screen.getByRole('link', { name: /follow our playlist/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', SPOTIFY_PLAYLIST_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders follower count text', () => {
    renderComponent()
    expect(screen.getByText(/117K\+/)).toBeInTheDocument()
  })

  it('has accessible section with aria-labelledby', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    expect(section).toHaveAttribute('aria-labelledby', 'song-pick-heading')
  })

  it('renders section divider', () => {
    renderComponent()
    const section = screen.getByRole('heading', { level: 2 }).closest('section')
    const divider = section?.querySelector('.border-t')
    expect(divider).toBeInTheDocument()
  })

  it('does not use Caveat script font', () => {
    renderComponent()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).not.toHaveClass('font-script')
    expect(heading.querySelector('.font-script')).not.toBeInTheDocument()
  })
})
```

**`SongPickSection-offline.test.tsx`** — update the heading text assertion:

The test at line 38 checks for `screen.getByText("Today's Song Pick")` — this will fail because the heading now has two separate `<span>` elements. Update to use `screen.getByRole('heading', { level: 2 })` which checks the full text content.

```typescript
it('keeps heading when offline', () => {
  mockUseOnlineStatus.mockReturnValue({ isOnline: false })
  renderWithRouter()
  const heading = screen.getByRole('heading', { level: 2 })
  expect(heading).toHaveTextContent("Today's")
  expect(heading).toHaveTextContent('Song Pick')
})
```

Also update the online iframe test to check for 152px height instead of 280px (if asserting height):
```typescript
it('shows iframe when online', () => {
  mockUseOnlineStatus.mockReturnValue({ isOnline: true })
  renderWithRouter()
  const iframe = document.querySelector('iframe')
  expect(iframe).toBeInTheDocument()
  expect(screen.queryByText('Spotify playlists available when online')).not.toBeInTheDocument()
})
```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT add auth provider wrapping (not needed — section is presentational)
- DO NOT remove offline test coverage
- DO NOT change MemoryRouter wrapper pattern

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 12 new tests pass | verification | Run `pnpm test -- SongPickSection` |
| All 3 offline tests pass | verification | Run `pnpm test -- SongPickSection-offline` |

**Expected state after completion:**
- [ ] 12 tests pass in `SongPickSection.test.tsx`
- [ ] 3 tests pass in `SongPickSection-offline.test.tsx`
- [ ] No other tests broken (`pnpm test` passes fully)
- [ ] All acceptance criteria from spec are covered by at least one test

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Redesign SongPickSection component |
| 2 | 1 | Update tests to match redesigned component |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Redesign SongPickSection component | [COMPLETE] | 2026-04-03 | Modified `SongPickSection.tsx`: removed Music icon, HeadingDivider, useElementWidth, glass card wrapper. Added GlowBackground (left, 0.30), GRADIENT_TEXT_STYLE heading, section divider, side-by-side layout (md:flex-row), compact 152px iframe. Follow button moved to left column below heading. |
| 2 | Update tests | [COMPLETE] | 2026-04-03 | Rewrote `SongPickSection.test.tsx` (5→12 tests). Updated `SongPickSection-offline.test.tsx` heading assertion for split spans. All 15 tests pass. Pre-existing failures in 4 unrelated files (DailyHub, PrayerWall, FinalCTA, PrayCeremony) unchanged. |
