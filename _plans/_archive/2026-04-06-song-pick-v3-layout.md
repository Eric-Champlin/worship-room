# Implementation Plan: Song Pick V3 — Equal-Width Heading + Bottom-Aligned Column

**Spec:** `_specs/song-pick-v3-layout.md`
**Date:** 2026-04-06
**Branch:** `claude/feature/song-pick-v3-layout`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, fresh)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

This is a visual-only refactor of a single file: `frontend/src/components/SongPickSection.tsx` (104 lines). No new components, no new hooks, no new state, no data model changes, no localStorage changes, no routing changes.

**File to modify:**

1. `frontend/src/components/SongPickSection.tsx` — Refactor heading to use `leading-none` instead of `leading-tight`, add `tracking-[0.15em]` to "Song Pick" for width matching, replace dual desktop/mobile CTA blocks with a single CTA block that flexbox positions correctly at all breakpoints, ensure `md:items-stretch` + `md:justify-between` on left column for bottom-alignment.

**Test file to modify:**

2. `frontend/src/components/__tests__/SongPickSection.test.tsx` (132 lines) — Update test for dual CTA (currently asserts 2 links, 2 captions) to assert 1 link, 1 caption. Add tests for `leading-none`, `tracking-[0.15em]`, and the unified CTA block.

**Current structure (v2):**

```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    <div aria-hidden="true" className="mx-auto max-w-xl border-t border-white/[0.08]" />
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12">
      {/* Left: heading + desktop-only CTA (hidden md:block) */}
      <div className="shrink-0 text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between">
        <h2 className="flex flex-col">
          <span className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl" style={GRADIENT_TEXT_STYLE}>Today's</span>
          <span className="mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">Song Pick</span>
        </h2>
        {isOnline && <div className="mt-6 hidden md:block">...CTA...</div>}
      </div>
      {/* Right: player + mobile-only CTA (md:hidden) */}
      <div className="w-full min-w-0 flex-1 max-w-xl">
        {isOnline && <>...iframe...  <div className="mt-6 text-center md:hidden">...CTA...</div></>}
      </div>
    </div>
  </section>
</GlowBackground>
```

**Target structure (v3):**

```tsx
<GlowBackground variant="left" glowOpacity={0.30} className="!bg-transparent">
  <section aria-labelledby="song-pick-heading" className="px-4 py-12 sm:px-6 sm:py-16">
    <div aria-hidden="true" className="mx-auto max-w-xl border-t border-white/[0.08]" />
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12">
      {/* Left: heading top, CTA bottom — stretch fills to player height */}
      <div className="flex shrink-0 flex-col items-center md:items-start md:justify-between">
        <h2 className="flex flex-col items-center md:items-start">
          <span className="text-4xl font-bold leading-none sm:text-5xl lg:text-6xl" style={GRADIENT_TEXT_STYLE}>Today's</span>
          <span className="mt-1 text-2xl font-bold leading-none tracking-[0.15em] text-white sm:text-3xl lg:text-4xl">Song Pick</span>
        </h2>
        {isOnline && (
          <div className="mt-6">
            <a ...>Follow Our Playlist</a>
            <p className="mt-2 text-xs text-white/70">Join 117K+ other followers!</p>
          </div>
        )}
      </div>
      {/* Right: player only — no CTA in this column */}
      <div className="w-full min-w-0 flex-1 max-w-xl">
        {isOnline ? <>...iframe unchanged...</> : <OfflineMessage ... />}
      </div>
    </div>
  </section>
</GlowBackground>
```

**Key layout differences v2 → v3:**

1. `leading-tight` → `leading-none` on both heading spans (removes line-height inflation)
2. `tracking-[0.15em]` added to "Song Pick" span for visual width matching
3. Dual CTA blocks (desktop `hidden md:block` + mobile `md:hidden`) → single CTA block inside left column, always rendered
4. Left column: `text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between` → `flex shrink-0 flex-col items-center md:items-start md:justify-between` (always flex, centered on mobile, start-aligned on desktop)
5. `md:pt-2` removed from left column (not needed with `leading-none`)

**Provider wrapping for tests:** `MemoryRouter` only (no AuthProvider, ToastProvider, or AuthModalProvider needed — SongPickSection has no auth gates or toasts).

**Test assertion changes:**

- Test `'renders two Follow Our Playlist links (one per breakpoint)'` → update to assert exactly 1 link
- Test `'renders follower count text in two places (one per breakpoint)'` → update to assert exactly 1 caption
- Test `'desktop CTA is hidden on mobile via responsive class'` → remove entirely (no responsive hiding; single CTA block always visible)
- Test `'heading is flex-col with gradient "Today\'s" as the larger line'` → update to assert `leading-none` instead of checking for leading-tight class absence
- Add new test for `tracking-[0.15em]` on "Song Pick" span

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
| GlowBackground | variant + opacity | `variant="left" glowOpacity={0.30}` | design-system.md (SongPickSection section, line 533) |
| Section padding | class | `px-4 py-12 sm:px-6 sm:py-16` | design-system.md (line 535) |
| Top divider | class | `mx-auto max-w-xl border-t border-white/[0.08]` | design-system.md (line 537) |
| Layout container | class | `mx-auto flex max-w-4xl flex-col items-center gap-8 pt-8 md:flex-row md:items-stretch md:gap-12` | design-system.md (line 539) |
| "Today's" heading | font | `text-4xl font-bold leading-none sm:text-5xl lg:text-6xl` + `GRADIENT_TEXT_STYLE` | spec (line 66) + design-system.md (line 544) — `leading-tight` → `leading-none` per spec |
| "Song Pick" heading | font | `mt-1 text-2xl font-bold leading-none tracking-[0.15em] text-white sm:text-3xl lg:text-4xl` | spec (lines 66-67) — `leading-tight` → `leading-none`, add `tracking-[0.15em]` |
| CTA button | class | `inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100` | design-system.md (lines 553-555) |
| CTA caption | class | `mt-2 text-xs text-white/70` | SongPickSection.tsx (line 55) |
| GRADIENT_TEXT_STYLE | CSS | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` via `background-clip: text` | gradients.tsx (line 6) |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before each UI step:**

- GRADIENT_TEXT_STYLE is imported from `@/constants/gradients` — it's a CSSProperties object applied via `style={}`, not a Tailwind class.
- All readable text on dark backgrounds uses `text-white` — `text-white/70` is only for the "Join 117K+" muted caption.
- SongPickSection uses GlowBackground `variant="left"` with `glowOpacity={0.30}` — DO NOT change these values.
- The section has NO FrostedCard wrapper — this is intentional (matches v2).
- The `!bg-transparent` className on GlowBackground is required to prevent the component's default background from rendering.
- `md:items-stretch` on the outer flex container forces both columns to equal height (352px Spotify player).
- `md:justify-between` on the left column pins heading to top and CTA to bottom.
- `leading-none` (line-height: 1) is the spec requirement — DO NOT use `leading-tight` (1.25).
- `tracking-[0.15em]` is the starting value for letter-spacing — this will be tuned via Playwright measurement after implementation.

---

## Shared Data Models (from Master Plan)

Not applicable — standalone spec. No new interfaces, no new localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 768px | Stacked column (`flex-col`): heading centered, CTA centered below heading (`mt-6`), Spotify player below CTA. All `items-center`. |
| Tablet | ≥ 768px | Side-by-side (`md:flex-row`). Left column stretches to player height (`md:items-stretch`). Heading left-aligned (`md:items-start`). CTA pinned to bottom (`md:justify-between`). |
| Desktop | ≥ 1024px | Same side-by-side. Typography scales up (`lg:text-6xl` / `lg:text-4xl`). Letter-spacing width-matching most prominent. |

---

## Vertical Rhythm

No changes to vertical rhythm. The section padding `py-12 sm:py-16` is preserved unchanged.

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Devotional → SongPickSection | SongPickSection's `py-12 sm:py-16` | design-system.md (line 845) |
| SongPickSection → Footer | Footer's own top padding | design-system.md (line 846) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/song-pick-v3-layout` exists and is checked out
- [ ] No auth gating changes needed (confirmed by spec)
- [ ] Design system values verified from design-system.md (captured 2026-04-05)
- [ ] No [UNVERIFIED] values — all values come from spec + design-system.md + existing code
- [ ] Recon report not applicable (layout refactor of existing section)
- [ ] Letter-spacing `tracking-[0.15em]` is a starting point — Playwright tuning in Step 3

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single CTA vs dual CTA | Single block, always rendered | Spec requirement 3: "Remove the duplicated mobile/desktop CTA pattern." Flexbox handles positioning at all breakpoints. |
| Remove `md:pt-2` from left column? | Yes | With `leading-none`, the top padding tweak is no longer needed to align the heading top with the player top. |
| Keep `shrink-0` on left column? | Yes | Prevents the heading column from being compressed by the flex-1 player column. |
| `items-center` vs `text-center` for mobile centering? | `items-center` on the flex column | `items-center` centers flex children; `text-center` centers inline text. Since the heading and CTA are block-level flex children, `items-center` is the correct approach. |
| Letter-spacing fallback if 0.15em fails? | `scaleX()` transform | Spec defines: try 0.12em → 0.18em → 0.20em → 0.25em. If all fail, use `transform: scaleX()` with `transformOrigin: 'left'`. |
| Heading `items-center md:items-start` | On the h2 element | The h2 is `flex flex-col` — its children (the two spans) need centering on mobile and left-alignment on desktop. |

---

## Implementation Steps

### Step 1: Refactor SongPickSection layout and heading [COMPLETE]

**Objective:** Replace the dual CTA pattern with a single CTA block, update heading to use `leading-none` + `tracking-[0.15em]`, and ensure bottom-aligned CTA on desktop via flexbox.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — Layout and heading refactor

**Details:**

Replace the entire component body with the v3 structure. Specific changes:

1. **Left column wrapper class:** Change from `shrink-0 text-center md:text-left md:pt-2 md:flex md:flex-col md:justify-between` to `flex shrink-0 flex-col items-center md:items-start md:justify-between`
   - Always `flex flex-col` (not just at `md:`)
   - `items-center` centers children on mobile, `md:items-start` left-aligns on desktop
   - Remove `text-center md:text-left` (replaced by flex alignment)
   - Remove `md:pt-2` (not needed with `leading-none`)

2. **h2 element class:** Change from `flex flex-col` to `flex flex-col items-center md:items-start`
   - The heading spans need explicit alignment because h2 is a flex child of the left column

3. **"Today's" span class:** Change `leading-tight` to `leading-none`
   - From: `text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl`
   - To: `text-4xl font-bold leading-none sm:text-5xl lg:text-6xl`

4. **"Song Pick" span class:** Change `leading-tight` to `leading-none`, add `tracking-[0.15em]`
   - From: `mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl`
   - To: `mt-1 text-2xl font-bold leading-none tracking-[0.15em] text-white sm:text-3xl lg:text-4xl`

5. **Remove desktop CTA block** (lines 44-57): Delete the `{isOnline && (<div className="mt-6 hidden md:block">...` block entirely.

6. **Remove mobile CTA block** (lines 83-94): Delete the `<div className="mt-6 text-center md:hidden">...` block entirely.

7. **Add single CTA block** after the `</h2>` closing tag, inside the left column:
   ```tsx
   {isOnline && (
     <div className="mt-6">
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
   ```

8. **Right column** remains unchanged except: remove the mobile CTA that was inside the `<>` fragment after the iframe. The right column now contains only the iframe wrapper (+ skeleton + OfflineMessage).

**Auth gating:** N/A — no auth-gated actions.

**Responsive behavior:**
- Desktop (≥768px): Side-by-side. Left column stretches to player height. Heading at top, CTA pinned to bottom via `md:justify-between`. CTA left-aligned via `md:items-start`.
- Mobile (<768px): Stacked. Heading centered, CTA centered below heading (`mt-6`), player below CTA. All centered via `items-center`.

**Guardrails (DO NOT):**
- DO NOT change GlowBackground variant or glowOpacity
- DO NOT change the section padding, top divider, or outer layout container classes
- DO NOT modify iframe attributes (src, allow, loading, onLoad, height, width)
- DO NOT change `useOnlineStatus` hook usage
- DO NOT change OfflineMessage or SkeletonBlock behavior
- DO NOT add any new imports or dependencies
- DO NOT use `leading-tight` — spec requires `leading-none`
- DO NOT add `text-center` or `md:text-left` — use flex alignment instead

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Update: single Follow link | unit | Assert exactly 1 "Follow Our Playlist" link (was 2) |
| Update: single caption | unit | Assert exactly 1 "117K+" caption (was 2) |
| Remove: responsive CTA classes | unit | Remove test asserting `hidden md:block` / `md:hidden` wrappers |
| Add: leading-none on heading spans | unit | Assert both heading spans have `leading-none` class |
| Add: tracking on Song Pick | unit | Assert "Song Pick" span has `tracking-[0.15em]` class |
| Preserve: all existing functional tests | unit | Heading text, gradient style, no SVG, no card, glow orb, iframe, aria-labelledby, divider, no Caveat — all pass unchanged |

**Expected state after completion:**
- [ ] Single CTA block visible in left column, no duplicate
- [ ] "Today's" uses `leading-none` with `GRADIENT_TEXT_STYLE`
- [ ] "Song Pick" uses `leading-none tracking-[0.15em] text-white`
- [ ] Desktop: CTA bottom-aligns with player bottom via stretch + justify-between
- [ ] Mobile: stacked, centered layout with heading → CTA → player
- [ ] All existing tests updated and passing

---

### Step 2: Update tests for v3 layout [COMPLETE]

**Objective:** Update existing tests to match v3 structure (single CTA, leading-none, tracking) and add new assertions.

**Files to modify:**
- `frontend/src/components/__tests__/SongPickSection.test.tsx` — Test updates

**Details:**

1. **Update test `'renders two Follow Our Playlist links (one per breakpoint)'`:**
   - Rename to `'renders Follow Our Playlist link'`
   - Change: `expect(links).toHaveLength(2)` → `expect(links).toHaveLength(1)`
   - Change: `links.forEach(...)` → assert single link attributes

2. **Update test `'renders follower count text in two places (one per breakpoint)'`:**
   - Rename to `'renders follower count text'`
   - Change: `expect(captions).toHaveLength(2)` → `expect(captions).toHaveLength(1)`

3. **Remove test `'desktop CTA is hidden on mobile via responsive class'`:**
   - This test asserted `hidden md:block` and `md:hidden` wrappers which no longer exist.

4. **Update test `'heading is flex-col with gradient "Today\'s" as the larger line'`:**
   - Add assertion: `expect(spans[0].className).toContain('leading-none')`
   - Add assertion: `expect(spans[1].className).toContain('leading-none')`
   - Add assertion: `expect(spans[1].className).toContain('tracking-[0.15em]')`
   - The text-size assertions (`text-4xl`, `sm:text-5xl`, etc.) remain unchanged.

5. **Add new test `'Song Pick has letter-spacing for width matching'`:**
   ```tsx
   it('Song Pick has letter-spacing for width matching', () => {
     renderComponent()
     const heading = screen.getByRole('heading', { level: 2 })
     const spans = heading.querySelectorAll('span')
     const songPickSpan = spans[1]
     expect(songPickSpan).toHaveTextContent('Song Pick')
     expect(songPickSpan.className).toContain('tracking-')
   })
   ```

6. **Add new test `'uses single CTA block without responsive duplication'`:**
   ```tsx
   it('uses single CTA block without responsive duplication', () => {
     renderComponent()
     const links = screen.getAllByRole('link', { name: /follow our playlist/i })
     expect(links).toHaveLength(1)
     // No hidden/md:hidden wrappers — single always-visible block
     const wrapper = links[0].closest('div')
     expect(wrapper?.className).not.toContain('hidden')
     expect(wrapper?.className).not.toContain('md:hidden')
   })
   ```

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact (test-only step)

**Guardrails (DO NOT):**
- DO NOT remove existing tests that still apply (heading text, gradient style, no SVG, no card, glow orb, iframe, aria-labelledby, divider, no Caveat)
- DO NOT change the `renderComponent()` wrapper

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Run full test suite | unit | `pnpm test -- --run` to verify all tests pass |

**Expected state after completion:**
- [ ] All tests in SongPickSection.test.tsx pass
- [ ] Full test suite passes with 0 failures
- [ ] No test asserts 2 CTA links or 2 captions
- [ ] Letter-spacing assertion present

---

### Step 3: Playwright letter-spacing tuning [COMPLETE]

**Objective:** Verify that `tracking-[0.15em]` produces equal-width heading spans at desktop resolution. Adjust if needed.

**Files to modify:**
- `frontend/src/components/SongPickSection.tsx` — Only if tracking value needs adjustment

**Details:**

1. Use Playwright to navigate to `http://localhost:5173/daily` (SongPickSection appears below tab content)
2. Measure `boundingBox().width` of both heading spans at 1440×900 viewport:
   - "Today's" span: `h2 span:first-child`
   - "Song Pick" span: `h2 span:last-child`
3. Compare widths:
   - If within 4px → `tracking-[0.15em]` is correct, done
   - If "Song Pick" too narrow → increase to `tracking-[0.18em]`, then `tracking-[0.20em]`, then `tracking-[0.25em]`
   - If "Song Pick" too wide → decrease to `tracking-[0.12em]`, then `tracking-widest` (0.1em)
4. If no letter-spacing value produces within-4px parity, apply `scaleX()` fallback:
   - Calculate ratio: `todaysWidth / songPickWidth`
   - Apply inline style: `style={{ transform: 'scaleX(<ratio>)', transformOrigin: 'left' }}` (on mobile: `transformOrigin: 'center'` via responsive conditional or media query)
5. Also verify bottom alignment: CTA bottom edge within 8px of player bottom edge at desktop and tablet

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Primary measurement viewport. Both spans must be within 4px width.
- Tablet (768px): Verify side-by-side holds and CTA bottom-aligns within 8px of player bottom.
- Mobile (375px): Verify stacked layout, centered, no horizontal overflow.

**Guardrails (DO NOT):**
- DO NOT change the font-size responsive classes (`text-4xl sm:text-5xl lg:text-6xl` etc.)
- DO NOT use JavaScript runtime measurement — this is a build-time CSS property
- DO NOT add width constraints to the heading — use only letter-spacing or scaleX

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Playwright width measurement | e2e | Measure both heading span widths at 1440px — within 4px |
| Playwright bottom alignment | e2e | CTA bottom within 8px of player bottom at 1440px and 768px |
| Playwright mobile no overflow | e2e | No horizontal scrollbar at 375px |

**Expected state after completion:**
- [ ] Both heading spans within 4px width at 1440px desktop
- [ ] CTA bottom within 8px of Spotify player bottom at desktop and tablet
- [ ] Mobile layout stacked, centered, no overflow
- [ ] Tracking value finalized (or scaleX fallback applied)
- [ ] If tracking value changed from 0.15em, test assertion in Step 2 updated to match

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Refactor SongPickSection layout and heading |
| 2 | 1 | Update tests for v3 structure |
| 3 | 1, 2 | Playwright letter-spacing tuning + bottom alignment verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Refactor SongPickSection layout | [COMPLETE] | 2026-04-06 | `SongPickSection.tsx`: left column now always-flex with `items-center md:items-start md:justify-between`, heading uses `leading-none`, "Song Pick" has `tracking-[0.15em]`, single CTA block (no responsive duplication), right column simplified (removed mobile CTA). No deviations. |
| 2 | Update tests for v3 | [COMPLETE] | 2026-04-06 | `SongPickSection.test.tsx`: Updated 3 tests (single CTA link, single caption, no responsive hiding), added 2 new tests (letter-spacing, leading-none assertions). 15/15 pass. Full suite: 13 pre-existing failures, 0 new failures. |
| 3 | Playwright letter-spacing tuning | [COMPLETE] | 2026-04-06 | `tracking-[0.15em]` → `tracking-[0.18em]` (0.55px diff at 1440px, within 4px target). Bottom alignment: 0px diff at both 1440px and 768px. Mobile: stacked, centered, no overflow. Test assertion updated to match `0.18em`. |
