# Implementation Plan: Song Pick v4 — Centered Column Layout

**Spec:** `_specs/song-pick-v4-centered-column.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/song-pick-v4-centered-column`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a visual-only layout refactor of a single file: `frontend/src/components/SongPickSection.tsx` (88 lines). The v3 layout uses a side-by-side `md:flex-row` layout with heading+CTA on the left and Spotify player on the right. v4 abandons side-by-side entirely and returns to a centered column: heading on top, player in the middle (full-width of a narrower container), CTAs on the bottom.

**File to modify:**

1. `frontend/src/components/SongPickSection.tsx` — Replace side-by-side layout with centered column in `max-w-2xl` container. Remove letter-spacing on "Song Pick". Add `mt-8` between heading and player, `mt-6` between player and CTAs. Center everything with `text-center`.

**Test file to modify:**

2. `frontend/src/components/__tests__/SongPickSection.test.tsx` — Remove letter-spacing tests, update layout assertions (no `md:flex-row`, `max-w-2xl` instead of `max-w-4xl`), verify centered layout.

**Current structure (v3 — from `SongPickSection.tsx`):**

```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    <div aria-hidden="true" className="mx-auto max-w-xl border-t border-white/[0.08]" />
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12">
      {/* Left: heading top, CTA bottom */}
      <div className="flex shrink-0 flex-col items-center md:items-start md:justify-between">
        <h2 className="flex flex-col items-center md:items-start">
          <span className="... leading-none" style={GRADIENT_TEXT_STYLE}>Today's</span>
          <span className="... leading-none tracking-[0.18em] text-white">Song Pick</span>
        </h2>
        {isOnline && <div className="mt-6">...CTA...</div>}
      </div>
      {/* Right: player only */}
      <div className="w-full min-w-0 flex-1 max-w-xl">...iframe...</div>
    </div>
  </section>
</GlowBackground>
```

**Target structure (v4):**

```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    <div aria-hidden="true" className="mx-auto max-w-xl border-t border-white/[0.08] mb-10" />
    <div className="mx-auto max-w-2xl">
      {/* Centered heading */}
      <div className="text-center">
        <h2 id="song-pick-heading" className="flex flex-col items-center">
          <span className="text-4xl font-bold leading-none sm:text-5xl lg:text-6xl" style={GRADIENT_TEXT_STYLE}>Today's</span>
          <span className="mt-1 text-2xl font-bold leading-none text-white sm:text-3xl lg:text-4xl">Song Pick</span>
        </h2>
      </div>
      {/* Player */}
      <div className="mt-8">...iframe...</div>
      {/* CTA */}
      {isOnline && <div className="mt-6 text-center">...button + caption...</div>}
    </div>
  </section>
</GlowBackground>
```

**Key layout differences v3 → v4:**

1. `max-w-4xl` → `max-w-2xl` (~672px container)
2. Remove `flex`, `flex-col`, `md:flex-row`, `md:items-stretch`, `gap-8`, `md:gap-12`, `pt-8` from outer container
3. Remove left/right column wrappers entirely — flat centered structure
4. Remove `tracking-[0.18em]` from "Song Pick" span
5. Remove `items-center md:items-start` responsive alignment — always `items-center`
6. Add `mb-10` to section divider (was using `pt-8` on container)
7. Add `mt-8` between heading and player, `mt-6` between player and CTAs
8. Heading and CTA wrapped in `text-center` divs
9. Player wrapper no longer needs `min-w-0 flex-1 max-w-xl shrink-0` flex child classes

**Provider wrapping for tests:** `MemoryRouter` only (no AuthProvider, ToastProvider, or AuthModalProvider needed).

**Imports to verify after refactor:**
- `cn` — still used for iframe `className`
- `GRADIENT_TEXT_STYLE` — still used on "Today's"
- `GlowBackground` — still used
- `SkeletonBlock` — still used
- `useOnlineStatus` — still used
- `OfflineMessage` — still used
- No unused imports should remain (verify no `Music`, `HeadingDivider`, `useElementWidth` — these were already removed in v2)

---

## Auth Gating Checklist

No auth-gated actions. SongPickSection renders identically for logged-in and logged-out users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | No auth gating | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | variant + opacity | `variant="left" glowOpacity={0.30}` | design-system.md (line 93) |
| Section padding | class | `px-4 py-12 sm:px-6 sm:py-16` | design-system.md (line 535) |
| Top divider | class | `mx-auto max-w-xl border-t border-white/[0.08]` | spec (line 62) |
| Divider bottom spacing | class | `mb-10` | spec (line 62) |
| Content container | class | `mx-auto max-w-2xl` | spec (line 19, line 63) |
| "Today's" heading | font | `text-4xl font-bold leading-none sm:text-5xl lg:text-6xl` + `GRADIENT_TEXT_STYLE` | spec (line 64) |
| "Song Pick" heading | font | `mt-1 text-2xl font-bold leading-none text-white sm:text-3xl lg:text-4xl` | spec (line 64) — NO letter-spacing |
| Heading-to-player gap | class | `mt-8` | spec (line 67) |
| Player-to-CTA gap | class | `mt-6` | spec (line 67) |
| CTA button | class | `inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100` | SongPickSection.tsx (line 50) |
| CTA caption | class | `mt-2 text-xs text-white/70` | SongPickSection.tsx (line 54) |
| GRADIENT_TEXT_STYLE | CSS | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | gradients.tsx (line 6) |
| `!bg-transparent` | className on GlowBackground | Prevents default background | existing code |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- GRADIENT_TEXT_STYLE is imported from `@/constants/gradients` — it's a CSSProperties object applied via `style={}`, not a Tailwind class.
- All readable text on dark backgrounds uses `text-white` — `text-white/70` is only for the "Join 117K+" muted caption.
- SongPickSection uses GlowBackground `variant="left"` with `glowOpacity={0.30}` — DO NOT change these values.
- The section has NO FrostedCard wrapper — this is intentional (consistent across all Song Pick versions).
- The `!bg-transparent` className on GlowBackground is required to prevent the component's default background from rendering.
- `leading-none` (line-height: 1) — DO NOT use `leading-tight` (1.25).
- v4 removes ALL letter-spacing from "Song Pick" — DO NOT add any `tracking-*` classes.
- `max-w-2xl` is the container width — DO NOT use `max-w-4xl` (v3) or `max-w-xl`.
- v3 deviation: `tracking-[0.15em]` → `tracking-[0.18em]` during Playwright tuning. v4 removes tracking entirely, so this is moot.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `max-w-2xl` is effectively full-width with `px-4` padding. Heading at `text-4xl` / `text-2xl`. Player fills width at 352px tall. CTAs centered. Single vertical column. |
| Tablet | 768px | Same centered column. Heading scales to `sm:text-5xl` / `sm:text-3xl`. Container constrained to ~672px. |
| Desktop | 1440px | Container hits `max-w-2xl` (672px). Heading at `lg:text-6xl` / `lg:text-4xl`. Rectangle effect most visible — heading, player, and CTAs share the same horizontal center axis. |

No breakpoint-specific layout changes. No `md:flex-row`. No side-by-side at any viewport.

---

## Vertical Rhythm

No changes to outer section vertical rhythm. Internal spacing changes from gap-based (flex gap-8) to explicit margin-based (mt-8, mt-6).

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Divider → heading | `mb-10` (40px) | spec (line 62) |
| Heading → player | `mt-8` (32px) | spec (line 67) |
| Player → CTA | `mt-6` (24px) | spec (line 67) |
| Section outer padding | `py-12 sm:py-16` (48px / 64px) | existing code, unchanged |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/song-pick-v4-centered-column` exists and is checked out
- [ ] No auth gating changes needed (confirmed by spec)
- [ ] Design system values verified from design-system.md (captured 2026-04-05)
- [ ] No [UNVERIFIED] values — all values come from spec + design-system.md + existing code
- [ ] Recon report not applicable (layout refactor of existing section)
- [ ] All imports in current file are verified (no stale imports from v1/v2)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Divider spacing: `pt-8` on container vs `mb-10` on divider | `mb-10` on divider | Spec explicitly calls for `mb-10` on the divider. The `pt-8` on the v3 outer flex container is removed along with the flex container itself. |
| Player wrapper classes | Simple `<div className="mt-8">` | v3's `w-full min-w-0 flex-1 max-w-xl` were flex-child utilities. v4 is not a flex layout — the player inherits `max-w-2xl` from the parent. No explicit max-width on the player wrapper per spec. |
| `id="song-pick-heading"` placement | On the `<h2>` element | Spec acceptance criteria: h2 uses `flex flex-col items-center`. The `id` moves to the h2 (it was already there in v3). |
| Offline/loading state wrapping | Inside `mt-8` player wrapper | OfflineMessage and SkeletonBlock render in the same position as the iframe — inside the player area div. |
| CTA block visibility when offline | Hidden (wrapped in `isOnline &&`) | Same as v3 — CTA only shows when online. Spec says "heading and CTAs still visible" in offline state, but the existing behavior hides CTA when offline and spec acceptance criteria don't override this. Kept for consistency. |

---

## Implementation Steps

### Step 1: Refactor SongPickSection to centered column layout

**Objective:** Replace the side-by-side flex layout with a centered single-column layout using `max-w-2xl` container.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — Full layout restructure

**Details:**

Replace the component body from the `{/* Content container */}` comment through the end of the section content. The GlowBackground wrapper and section element remain unchanged except the divider gets `mb-10`.

1. **Section divider:** Add `mb-10` class.
   - From: `className="mx-auto max-w-xl border-t border-white/[0.08]"`
   - To: `className="mx-auto max-w-xl border-t border-white/[0.08] mb-10"`

2. **Replace outer flex container** with a simple centered container:
   - From: `<div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12">`
   - To: `<div className="mx-auto max-w-2xl">`

3. **Remove left column wrapper** (`<div className="flex shrink-0 flex-col items-center md:items-start md:justify-between">`) — replace with a `<div className="text-center">` that wraps only the heading.

4. **Update h2 element:**
   - From: `<h2 id="song-pick-heading" className="flex flex-col items-center md:items-start">`
   - To: `<h2 id="song-pick-heading" className="flex flex-col items-center">`
   - Remove `md:items-start` — always centered.

5. **Update "Song Pick" span:** Remove `tracking-[0.18em]`.
   - From: `className="mt-1 text-2xl font-bold leading-none tracking-[0.18em] text-white sm:text-3xl lg:text-4xl"`
   - To: `className="mt-1 text-2xl font-bold leading-none text-white sm:text-3xl lg:text-4xl"`

6. **Close the `text-center` heading wrapper** after `</h2>`.

7. **Player wrapper:** Replace the right-column div with a simple `mt-8` wrapper.
   - From: `<div className="w-full min-w-0 flex-1 max-w-xl">`
   - To: `<div className="mt-8">`
   - Contents (iframe, SkeletonBlock, OfflineMessage) remain unchanged.

8. **CTA block:** Move from inside the left column (after h2) to after the player wrapper. Wrap in `<div className="mt-6 text-center">`.
   - The `<a>` and `<p>` elements remain unchanged.
   - Still wrapped in `{isOnline && (...)}`.

9. **Close the `max-w-2xl` container** after the CTA block.

**Final component structure:**
```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    <div aria-hidden="true" className="mx-auto max-w-xl border-t border-white/[0.08] mb-10" />
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h2 id="song-pick-heading" className="flex flex-col items-center">
          <span className="text-4xl font-bold leading-none sm:text-5xl lg:text-6xl" style={GRADIENT_TEXT_STYLE}>
            Today&apos;s
          </span>
          <span className="mt-1 text-2xl font-bold leading-none text-white sm:text-3xl lg:text-4xl">
            Song Pick
          </span>
        </h2>
      </div>
      <div className="mt-8">
        {isOnline ? (
          <div className="relative">
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10" aria-busy="true">
                <span className="sr-only">Loading</span>
                <SkeletonBlock height={352} rounded="rounded-xl" />
              </div>
            )}
            <iframe ... unchanged ... />
          </div>
        ) : (
          <OfflineMessage variant="dark" message="Spotify playlists available when online" />
        )}
      </div>
      {isOnline && (
        <div className="mt-6 text-center">
          <a href={SPOTIFY_PLAYLIST_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100">
            Follow Our Playlist
          </a>
          <p className="mt-2 text-xs text-white/70">Join 117K+ other followers!</p>
        </div>
      )}
    </div>
  </section>
</GlowBackground>
```

**Auth gating:** N/A — no auth-gated actions.

**Responsive behavior:**
- Desktop (1440px): `max-w-2xl` (672px) centered. Heading, player, CTA all share horizontal center axis. Player forms ~2:1 rectangle.
- Tablet (768px): Same centered column. Container constrained to ~672px. Typography scales with `sm:` breakpoint.
- Mobile (375px): `max-w-2xl` effectively full-width. `px-4` provides side padding. Player fills available width. All centered.

**Guardrails (DO NOT):**
- DO NOT change GlowBackground variant or glowOpacity
- DO NOT change the section outer padding (`px-4 py-12 sm:px-6 sm:py-16`)
- DO NOT modify iframe attributes (src, allow, loading, onLoad, height, width)
- DO NOT change `useOnlineStatus` hook usage
- DO NOT change OfflineMessage or SkeletonBlock behavior
- DO NOT add any `tracking-*` classes to "Song Pick"
- DO NOT add any `md:flex-row` or side-by-side layout classes
- DO NOT add max-width to the player wrapper — it inherits from the `max-w-2xl` container
- DO NOT add new imports or dependencies
- DO NOT use `leading-tight` — keep `leading-none`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify build compiles | unit | `pnpm build` succeeds |
| Existing tests still pass | unit | `pnpm test -- --run SongPickSection` |

**Expected state after completion:**
- [ ] Single centered column layout at all breakpoints
- [ ] `max-w-2xl` container (not `max-w-4xl`)
- [ ] No `md:flex-row` or side-by-side layout classes
- [ ] No `tracking-*` classes on "Song Pick"
- [ ] `mb-10` on section divider
- [ ] `mt-8` between heading and player
- [ ] `mt-6 text-center` on CTA wrapper
- [ ] CTA appears below player (not beside heading)
- [ ] Iframe and functional behavior unchanged

---

### Step 2: Update tests for v4 centered column layout

**Objective:** Remove letter-spacing tests, update layout assertions to reflect centered column structure, add new assertions for v4.

**Files to modify:**
- `frontend/src/components/__tests__/SongPickSection.test.tsx` — Test updates

**Details:**

1. **Update test `'heading is flex-col with gradient "Today\'s" as the larger line'`:**
   - Remove assertion: `expect(spans[1].className).toContain('tracking-[0.18em]')`
   - Verify "Song Pick" span does NOT contain `tracking-` class:
     `expect(spans[1].className).not.toContain('tracking-')`

2. **Remove test `'Song Pick has letter-spacing for width matching'`:**
   - This test asserts `tracking-` class presence which no longer exists.

3. **Add new test `'uses max-w-2xl centered column layout'`:**
   ```tsx
   it('uses max-w-2xl centered column layout', () => {
     renderComponent()
     const heading = screen.getByRole('heading', { level: 2 })
     const container = heading.closest('.max-w-2xl')
     expect(container).toBeInTheDocument()
     // No side-by-side layout classes
     expect(container?.className).not.toContain('md:flex-row')
     expect(container?.className).not.toContain('max-w-4xl')
   })
   ```

4. **Add new test `'Song Pick has no letter-spacing manipulation'`:**
   ```tsx
   it('Song Pick has no letter-spacing manipulation', () => {
     renderComponent()
     const heading = screen.getByRole('heading', { level: 2 })
     const spans = heading.querySelectorAll('span')
     expect(spans[1]).toHaveTextContent('Song Pick')
     expect(spans[1].className).not.toContain('tracking-')
   })
   ```

5. **All other tests remain unchanged:** heading text, gradient style, no SVG, no card, glow orb, iframe, aria-labelledby, divider, no Caveat, single CTA, single caption — all still valid for v4.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (test-only step)

**Guardrails (DO NOT):**
- DO NOT remove tests that still apply (heading text, gradient style, no SVG, no card, glow orb, iframe, aria-labelledby, divider, no Caveat, single CTA, follower count)
- DO NOT change the `renderComponent()` wrapper

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Run SongPickSection tests | unit | `pnpm test -- --run SongPickSection` — all pass |
| Run full test suite | unit | `pnpm test -- --run` — 0 new failures |

**Expected state after completion:**
- [ ] All tests in SongPickSection.test.tsx pass
- [ ] No test asserts `tracking-` class presence
- [ ] New test asserts `max-w-2xl` container and absence of `md:flex-row`
- [ ] New test asserts no letter-spacing on "Song Pick"
- [ ] Full test suite passes with 0 new failures

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Refactor SongPickSection to centered column layout |
| 2 | 1 | Update tests for v4 centered column layout |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Refactor SongPickSection to centered column | [COMPLETE] | 2026-04-06 | Modified `frontend/src/components/SongPickSection.tsx`. Replaced side-by-side flex layout with centered column in `max-w-2xl` container. Removed `tracking-[0.18em]`, `md:flex-row`, `md:items-stretch`, `md:items-start`. Added `mb-10` to divider, `mt-8` to player, `mt-6 text-center` to CTA. Pre-existing build failure (workbox-window) unrelated. |
| 2 | Update tests for v4 layout | [COMPLETE] | 2026-04-06 | Modified `frontend/src/components/__tests__/SongPickSection.test.tsx`. Removed `tracking-[0.18em]` assertion, removed "Song Pick has letter-spacing" test. Added `max-w-2xl` centered column test + no letter-spacing test. 16/16 tests pass. Full suite: 5591 pass, 1 pre-existing flaky failure (ChunkLoadError in JournalSearchFilter — unrelated). |
