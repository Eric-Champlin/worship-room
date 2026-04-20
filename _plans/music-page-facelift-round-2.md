# Spec: Music Page Facelift — Round 2

**Scope:** `/music` across all three tabs — follow-up polish to the Round 1 facelift that shipped on `claude/feature/music-page-facelift`.
**Outcome:** Resolves 12 user-surfaced issues from Round 1 review: hero heading sizing, section header tiering (gradient vs white), Spotify disclaimer rewording + repositioning, further scene desaturation, Sleep & Rest layout fixes (grid wrap, equal-height cards, unified pill rows, play button inversion on BedtimeStoryCard).
**Prerequisites:** Round 1 shipped. Branch `claude/feature/music-page-facelift` has the baseline. This spec extends it.
**Branch strategy:** Same branch. Commits on top of Round 1 work. Single PR when Round 2 ships.

---

## Context

User reviewed Round 1 shipped results and flagged 12 issues across all three tabs. This spec addresses each with minimal new infrastructure — reusing the `<SectionHeader>` primitive (adding one variant), the existing gradient constants, and the scene color pipeline.

Major Round 2 deviations from Round 1 assumptions:

1. **Section headers split into two tiers.** Round 1 committed to one treatment (uppercase tracking-wide `text-white/50`). User now wants some headers gradient-centered (matching hero) and others plain white. A new `variant="gradient"` prop on `<SectionHeader>` + a color bump on the existing variant handles both.

2. **Spotify disclaimer copy and placement change.** Round 1 placed the disclaimer above each embed with an Info icon. User tested and found: (a) the Info icon doesn't render visibly, (b) current copy overstates the restrictiveness (previews happen unless user is Premium; most users won't hit full songs in embed). Round 2 moves disclaimer below the hero embed only, drops the icon, uses tighter copy.

3. **Sleep & Rest horizontal scroll → grid.** Round 1 shipped `flex snap-x overflow-x-auto` for ScriptureCollectionRow. User disliked the scrollbar — wants all cards visible via grid wrap.

4. **BedtimeStoryCard play button was deferred in Round 1 but is in scope now.** Round 1's out-of-scope list kept 15 play-button files deferred. Round 2 pulls BedtimeStoryCard into scope (it's a Sleep & Rest card and was missed in Round 1's inversion pass). Other 14 files stay deferred.

## Out of scope

- Play button inversion on the other 14 files still deferred (AudioPlayerMini, AudioPlayerExpanded, AudioPlayButton, ScriptureSoaking, RoutineCard, ReadAloudButton, SharedMixHero, SavedMixCard, TimerTabContent, SceneCard, FeaturedSceneCard, AudioPill, DrawerNowPlaying, and BibleSleepSection quick-start icons which use text-primary-lt not inversion).
- Spotify OAuth / Web Playback SDK integration for Premium users. The disclaimer acknowledges this is a thing; building it is a separate future spec.
- Any changes to the tab bar, hero video, navbar, footer, or non-Music pages.
- Refactoring `AmbientBrowser`, `SleepBrowse`, `SoundGrid`, or other audio components beyond the specific visual changes below.
- Creating a dedicated gradient heading component — the approach is to add a variant to the existing `<SectionHeader>` to avoid component proliferation.

---

## Prerequisites

### Files modified

| Path | Change |
|---|---|
| `frontend/src/components/PageHero.tsx` | Hero h1 sizing bump (`text-3xl sm:text-4xl lg:text-5xl` → `text-4xl sm:text-5xl lg:text-6xl`) |
| `frontend/src/components/ui/SectionHeader.tsx` | Add `variant: 'default' \| 'gradient'` prop. Bump default variant color from `text-white/50` to `text-white` |
| `frontend/src/components/music/WorshipPlaylistsTab.tsx` | Use `variant="gradient"` on "Featured" and "Explore". Reposition disclaimer below hero embed only. Remove Explore disclaimer. Drop Info icon. |
| `frontend/src/components/audio/AmbientBrowser.tsx` | Use `variant="gradient"` on "Build Your Own Mix". Other section headers stay default (inherit new white color). |
| `frontend/src/components/audio/FeaturedSceneCard.tsx` | Further scene gradient desaturation (~30% more on top of Round 1's 35%, totaling ~55-60% reduction from original) |
| `frontend/src/components/audio/SceneCard.tsx` | Same further desaturation |
| `frontend/src/data/scene-backgrounds.ts` | Update per-scene gradient hex values to the further-desaturated targets |
| `frontend/src/components/audio/ScriptureCollectionRow.tsx` | Replace horizontal scroll wrapper with responsive grid wrap |
| `frontend/src/components/audio/ScriptureSessionCard.tsx` | Remove `min-w-[220px]`. Add `flex h-full flex-col` + `mt-auto`. Unify pill treatment (duration pill, voice pill, Scripture pill — all same shape, single line) |
| `frontend/src/components/audio/BedtimeStoryCard.tsx` | Invert play button (bg-primary → bg-white). Add `flex h-full flex-col` + `mt-auto`. Unify pill treatment (duration, length, voice, Story — all same shape, single line where possible, flex-wrap fallback) |
| `frontend/src/components/audio/BedtimeStoriesGrid.tsx` | If height equalization requires parent grid change, update here. Otherwise no changes. |

### Files created

None. Everything extends existing primitives.

---

# Part 1: Hero & Section Header Tiering

## 1.1 Hero "Music" heading — bump up one size step

**User ask:** "'Music' header: Make slightly larger in font size."
**Rationale:** Gives the page more presence. Current sizing looks understated relative to Daily Hub and Grow heroes now that the facelift is live.

### Change

**File:** `frontend/src/components/PageHero.tsx`

```tsx
// Before
className={cn(
  'px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2',
  showDivider ? 'inline-block' : 'mb-3'
)}

// After
className={cn(
  'px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2',
  showDivider ? 'inline-block' : 'mb-3'
)}
```

Sizing change: `text-3xl` (30px) → `text-4xl` (36px) mobile, `text-4xl` (36px) → `text-5xl` (48px) tablet, `text-5xl` (48px) → `text-6xl` (60px) desktop.

### Cross-page impact

`<PageHero>` is used by 6 pages: `/music`, `/my-prayers`, `/ask`, `/meditate/breathing`, `/meditate/soaking`, `/meditate/psalms`. The bump applies to all six. This is intentional — aligns all pages to the larger hero visual weight.

### Acceptance

- `/music` h1 renders at `text-6xl` (60px) at `lg` breakpoint.
- Scales responsively per breakpoint.
- All 6 PageHero consumer pages get the same bump. Verify none break layout at 1440px or 375px.
- No horizontal overflow on mobile (375px viewport).

---

## 1.2 SectionHeader gradient variant

**User ask:** "Move 'Featured' and 'Explore' to center and give it the same text style as 'music' — keep it at the original Music size (before enlargement). Title-case, not uppercase." Same for "Build Your Own Mix" on Ambient.

### Change

**File:** `frontend/src/components/ui/SectionHeader.tsx`

Add a `variant` prop with two modes:

- `'default'` (existing usage) — uppercase tracking-wide, but color bumped from `text-white/50` to `text-white` (see §1.3)
- `'gradient'` (new) — centered, title-case, gradient-clipped, sized at the original Music h1 (`text-3xl sm:text-4xl lg:text-5xl`)

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export interface SectionHeaderProps {
  children: ReactNode
  icon?: ReactNode
  as?: 'h2' | 'h3'
  action?: ReactNode
  className?: string
  id?: string
  /**
   * Visual variant.
   * - 'default': left-aligned uppercase tracking-wide white (small, for section grouping)
   * - 'gradient': centered title-case gradient-clipped (large, for hero-adjacent headings)
   */
  variant?: 'default' | 'gradient'
}

export function SectionHeader({
  children,
  icon,
  as: Tag = 'h2',
  action,
  className,
  id,
  variant = 'default',
}: SectionHeaderProps) {
  if (variant === 'gradient') {
    return (
      <Tag
        id={id}
        className={cn(
          'mb-4 text-center text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl',
          className,
        )}
        style={GRADIENT_TEXT_STYLE}
      >
        {children}
      </Tag>
    )
  }

  // Default variant
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <Tag
        id={id}
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white"
      >
        {icon}
        <span>{children}</span>
      </Tag>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
```

### Notes

- Gradient variant ignores the `icon` and `action` props. If someone tries to pass them on a gradient variant, they're silently dropped. Document this in the JSDoc. (Alternative: throw a warning in dev mode.)
- The size `text-3xl sm:text-4xl lg:text-5xl` intentionally matches the OLD Music hero size (before the §1.1 bump). This creates a visual hierarchy: enlarged Music hero > gradient section headers > default section headers.
- Gradient variant is a `<Tag>` directly (h2 or h3) — no wrapper div. Simpler DOM.
- Text rendering is title-case (as written by caller). Caller passes "Featured", "Explore", "Build Your Own Mix" — primitive doesn't transform case.

### Acceptance

- `<SectionHeader variant="gradient">Featured</SectionHeader>` renders centered, title-case, gradient-clipped, sized at `text-5xl` (48px) at lg breakpoint.
- Visual size is smaller than the new Music h1 (60px at lg) — clear hierarchy.
- `<SectionHeader>` with no variant prop or `variant="default"` renders the existing left-aligned uppercase treatment.
- Default variant color is now full `text-white`, not `text-white/50`.

### Test updates

- Update `frontend/src/components/ui/__tests__/SectionHeader.test.tsx` (if exists) to cover both variants.
- Add test: default variant renders `text-white` class (not `text-white/50`).
- Add test: gradient variant renders with `style` containing `backgroundImage`.
- Add test: gradient variant is centered (`text-center` class present).

---

## 1.3 Default SectionHeader: bump to full white

**User asks combined:**
- Sleep & Rest: "Scripture Reading, Psalms of Peace, Comfort & Rest, Trust in God, God's Promises, Bedtime Stories also white"
- Ambient: "Change font color to white of 'Nature, Environments, Spiritual, Instruments'"
- Ambient "Featured" (for scenes): white per clarification

### Change

Already covered in §1.2 above. The default SectionHeader variant now uses `text-white` instead of `text-white/50`.

### Cross-file impact

This one color change cascades automatically to every consumer of the default `<SectionHeader>` variant:

- `AmbientBrowser.tsx` — "Featured" (scenes), "All Scenes", "Saved Mixes" — all become full white
- `ScriptureCollectionRow.tsx` — "Psalms of Peace", "Comfort & Rest", "Trust in God", "God's Promises" — all become full white
- `BibleSleepSection.tsx` — "Scripture Reading" — full white
- `BedtimeStoriesGrid.tsx` — "Bedtime Stories" — full white
- `SoundGrid.tsx` — "Nature", "Environments", "Spiritual", "Instruments" subheadings — full white

No per-file change required beyond the one primitive edit.

### Acceptance

- All default-variant section headers on `/music` render in solid white (`rgb(255, 255, 255)`).
- Uppercase + tracking-wide treatment preserved.
- WCAG contrast: 21:1 on `#0f0a1e` background (WCAG AAA).

---

# Part 2: Worship Playlists Tab

## 2.1 "Featured" and "Explore" → gradient variant

### Change

**File:** `frontend/src/components/music/WorshipPlaylistsTab.tsx`

```tsx
// Before
<SectionHeader>Featured</SectionHeader>
...
<SectionHeader>Explore</SectionHeader>

// After
<SectionHeader variant="gradient">Featured</SectionHeader>
...
<SectionHeader variant="gradient">Explore</SectionHeader>
```

### Acceptance

- "Featured" and "Explore" render centered, title-case, gradient-clipped, sized at `text-3xl sm:text-4xl lg:text-5xl`.
- Visually smaller than the "Music" hero h1 above them (clear hierarchy: hero > section).
- Same treatment as each other (visual consistency).

---

## 2.2 Spotify disclaimer — reposition, rewrite, remove Info icon

**User's decision:** "Below the main player, in small grey font: 'Previews play here unless you're logged into a Spotify Premium account.'"

### Change

**File:** `frontend/src/components/music/WorshipPlaylistsTab.tsx`

Three simultaneous changes:
1. **Move** the disclaimer from above each embed to below the hero (Featured) embed only
2. **Remove** the second disclaimer that was rendered above the Explore grid
3. **Rewrite** copy and drop the `<Info>` icon

```tsx
import { EXPLORE_PLAYLISTS, WORSHIP_PLAYLISTS } from '@/data/music/playlists'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SpotifyEmbed } from './SpotifyEmbed'

// Removed in visual polish — keeping for potential re-enable
// import { useSpotifyAutoPause } from '@/hooks/useSpotifyAutoPause'

const PREVIEW_DISCLAIMER =
  "Previews play here unless you're logged into a Spotify Premium account."

export function WorshipPlaylistsTab() {
  const hero = WORSHIP_PLAYLISTS.find((p) => p.displaySize === 'hero')

  const explorePlaylists = [
    ...WORSHIP_PLAYLISTS.filter((p) => p.displaySize !== 'hero'),
    ...EXPLORE_PLAYLISTS.filter((p) => !p.id.includes('lofi')),
  ]

  if (!hero) {
    if (import.meta.env.DEV) {
      throw new Error('WorshipPlaylistsTab: hero playlist not found in WORSHIP_PLAYLISTS')
    }
    return null
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Featured */}
      <SectionHeader variant="gradient">Featured</SectionHeader>

      {/* Hero embed */}
      <div className="mx-auto w-full lg:w-[70%]">
        <SpotifyEmbed playlist={hero} height={500} />
      </div>

      {/* Disclaimer — below hero embed only */}
      <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-white/40">
        {PREVIEW_DISCLAIMER}
      </p>

      {/* Explore */}
      <div className="mt-12">
        <SectionHeader variant="gradient">Explore</SectionHeader>
        {/* No disclaimer here — it's only needed once per page */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {explorePlaylists.map((playlist) => (
            <div key={playlist.id}>
              <SpotifyEmbed playlist={playlist} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Notes

- Removed `Info` import from 'lucide-react' — no longer used.
- Removed `PreviewDisclaimer` wrapper component — it's now a single inline `<p>`.
- Color `text-white/40` is deliberately subtle — this is informational, not a call to action. If QA finds it too subtle, bump to `text-white/50` or `text-white/60`.
- `text-xs` keeps it visually minor. Font weight default (400) for small grey body text feel.
- Positioned `mt-3` below the hero embed to feel connected to it without crowding.
- Centered via `text-center` + `mx-auto max-w-2xl` to match the width of the hero embed wrapper visually.

### Acceptance

- Exactly ONE disclaimer renders on the Playlists tab, below the hero (Featured) Spotify embed.
- NO disclaimer renders above the hero embed.
- NO disclaimer renders above or below the Explore grid.
- Copy reads exactly: `Previews play here unless you're logged into a Spotify Premium account.`
- No `<Info>` icon anywhere in the disclaimer.
- Color is a small grey (`text-white/40` or as tuned in QA).
- Text is `text-xs`.
- Centered horizontally.

---

# Part 3: Ambient Sounds Tab

## 3.1 "Build Your Own Mix" → gradient variant

### Change

**File:** `frontend/src/components/audio/AmbientBrowser.tsx`

```tsx
// Before
<SectionHeader>Build Your Own Mix</SectionHeader>

// After
<SectionHeader variant="gradient">Build Your Own Mix</SectionHeader>
```

All other section headers on this tab (Featured, All Scenes, Saved Mixes) stay on the default variant and automatically inherit the new `text-white` color from §1.3.

### Acceptance

- "Build Your Own Mix" renders centered gradient-clipped title-case, sized at `text-3xl sm:text-4xl lg:text-5xl`.
- "Featured" (scenes), "All Scenes", "Saved Mixes" render left-aligned uppercase white (default variant) — smaller than BYOM, consistent with each other.

---

## 3.2 Nature / Environments / Spiritual / Instruments — inherit white

**User ask:** "Change font color to white of 'Nature, Environments, Spiritual, Instruments'"

### Change

No file change needed. These subheadings already use `<SectionHeader>` (as h3). When §1.3 bumps the default variant from `text-white/50` to `text-white`, these get the color change for free.

### Verification

After §1.3 lands, verify in `SoundGrid.tsx` that Nature/Environments/Spiritual/Instruments h3 renders in full white. If for any reason these use a different component or a direct inline class, convert to `<SectionHeader as="h3">`.

---

## 3.3 Scene cards: further desaturation (~55-60% total reduction)

**User ask:** "I still think the color cards pop too much and conflict. Would the best option to be to continue to dull their colors?"
**User's pick:** "Further desaturate to ~55-60% total reduction (keep per-scene tint, dull further)"

### Context

Round 1 applied ~35% saturation reduction to the 11 scene gradients. User wants another ~30% on top of that, totaling ~55-60% from the original illustrative colors.

### Approach

Apply a second HSL saturation reduction pass on each scene's primary gradient colors. For each color stop: convert to HSL, multiply saturation by `0.6-0.65` (compound with Round 1's reduction, so total from original is `0.65 × 0.65 ≈ 0.42` saturation remaining — about 58% total reduction). Convert back to hex.

### Change

**File:** `frontend/src/data/scene-backgrounds.ts`

Apply the transformation to all 11 scenes. Executor methodology:

1. For each scene, read current (Round 1) hex values
2. Convert each to HSL
3. Multiply S by 0.63 (target ~37% additional reduction)
4. Convert back to hex
5. Also reduce the `repeating-linear-gradient` overlay opacity by ~30% relative (if currently `rgba(255,255,255,0.06)`, target `rgba(255,255,255,0.04)`)

Alternatively, if per-gradient math is tedious: add an overlay `rgba(15, 10, 30, 0.22)` on top of every scene (uniform muffle) in addition to the per-scene gradient. Less surgical, but more consistent.

Preferred approach: per-gradient HSL transform for surgical identity preservation.

### Acceptance

- Visual comparison at 1440px side-by-side (Round 1 screenshot vs Round 2 screenshot): Round 2 cards look noticeably duller, more muted, more like twilight versions of their former selves.
- Per-scene color identity is still recognizable: Gethsemane still reads green-ish, Still Waters still teal-ish, Midnight Rain still navy-ish, etc.
- Text overlays on every card remain legible (WCAG AA for scene names + descriptions).
- Cards no longer visually "pop out" of the dashboard-dark page background — they feel like quiet rectangles with a tint, not illustrations.

### QA edge case

If any scene becomes illegible or loses too much identity at ~0.63 saturation multiplier, bump that specific scene's multiplier up to `0.7` for more retention. Document any per-scene overrides in a code comment.

---

# Part 4: Sleep & Rest Tab

## 4.1 Scripture Collection rows — horizontal scroll → grid wrap

**User ask:** "The cards were all put on 1 row per category and there is a scrollbar. This shouldn't have happened. Remove the scrolling and have all of the cards show."

### Change

**File:** `frontend/src/components/audio/ScriptureCollectionRow.tsx`

```tsx
// Before
<section className="space-y-3">
  <SectionHeader>{collection.name}</SectionHeader>
  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
    {collection.readings.map((reading) => (
      <ScriptureSessionCard key={reading.id} reading={reading} onPlay={onPlay} />
    ))}
  </div>
</section>

// After
<section className="space-y-3">
  <SectionHeader>{collection.name}</SectionHeader>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {collection.readings.map((reading) => (
      <ScriptureSessionCard key={reading.id} reading={reading} onPlay={onPlay} />
    ))}
  </div>
</section>
```

### Notes

- Grid matches the pattern used by `BedtimeStoriesGrid` (assumption to verify — if Bedtime Stories uses a different breakpoint pattern, align both to match).
- `snap-x snap-mandatory` removed — no longer scrolling.
- `overflow-x-auto` removed.
- `scrollbar-none` removed — no scrollbar to hide.
- `pb-2` removed — no scroll shadow to accommodate.

### Related file change required

**File:** `frontend/src/components/audio/ScriptureSessionCard.tsx`

Remove `min-w-[220px]` and `shrink-0` (these were for the horizontal scroll layout and now prevent the card from filling its grid cell).

```tsx
// Before
className="w-full min-w-[220px] shrink-0 snap-start cursor-pointer rounded-xl border border-white/10 ..."

// After
className="w-full cursor-pointer rounded-xl border border-white/10 ..."
```

Also remove `snap-start` (no snap container anymore).

### Acceptance

- All 4 Scripture Collection sections (Psalms of Peace, Comfort & Rest, Trust in God, God's Promises) render as grids at `/music?tab=sleep`.
- At 1440px: 3 columns.
- At 768px (tablet): 2 columns.
- At 375px (mobile): 1 column.
- No horizontal scrollbar on any row.
- All cards within a row visible without user scrolling.

---

## 4.2 Sleep & Rest cards — equal height

**User ask:** "Make sure all cards are the same size; some cards are larger because there is more font on them."

### Change

**File:** `frontend/src/components/audio/ScriptureSessionCard.tsx`

```tsx
// Before — card interior is roughly:
<button className="w-full cursor-pointer rounded-xl border ... p-4 pr-12 text-left ...">
  <p className="text-sm font-medium text-white">{reading.title}</p>
  <p className="mt-0.5 text-xs text-white/60">{reading.scriptureReference}</p>
  <div className="mt-3 flex items-center gap-2">
    {/* pills + play button */}
  </div>
</button>

// After
<button className="flex h-full w-full cursor-pointer flex-col rounded-xl border ... p-4 pr-12 text-left ...">
  <p className="text-sm font-medium text-white">{reading.title}</p>
  <p className="mt-0.5 text-xs text-white/60">{reading.scriptureReference}</p>
  <div className="mt-auto pt-3 flex items-center gap-2">
    {/* pills + play button */}
  </div>
</button>
```

Key additions: `flex h-full flex-col` on the button; `mt-auto` on the action row (replacing `mt-3`); `pt-3` on the action row to preserve visual spacing between body and actions when body is short.

**File:** `frontend/src/components/audio/BedtimeStoryCard.tsx`

Same pattern:

```tsx
// Before
<button className="w-full cursor-pointer rounded-xl border ... p-4 pr-12 text-left ...">
  <p className="text-sm font-medium text-white">{story.title}</p>
  <p className="mt-1 line-clamp-2 text-xs text-white/60">{story.description}</p>
  <div className="mt-3 flex flex-wrap items-center gap-2">
    {/* pills + play button */}
  </div>
</button>

// After
<button className="flex h-full w-full cursor-pointer flex-col rounded-xl border ... p-4 pr-12 text-left ...">
  <p className="text-sm font-medium text-white">{story.title}</p>
  <p className="mt-1 line-clamp-2 text-xs text-white/60">{story.description}</p>
  <div className="mt-auto pt-3 flex items-center gap-2">
    {/* pills + play button */}
  </div>
</button>
```

### Notes

- `flex-wrap` on BedtimeStoryCard's action row is replaced with `items-center gap-2` single-line. See §4.4 for the pill unification that makes this fit.
- If a card's body content is short (e.g., a 2-word title), `mt-auto` on the action row pushes it to the bottom, matching taller neighbor cards.
- Parent grid must use `items-stretch` (default) so cells pass through available height. Verify the parent grids (ScriptureCollectionRow §4.1 and BedtimeStoriesGrid) don't override with `items-start` or `items-center` — if they do, remove that override.

### Wrapper change

`ScriptureSessionCard` is wrapped in a `<div className="relative">` with an absolutely-positioned `<FavoriteButton>`. The wrapper currently doesn't have height info. Add `h-full` to the wrapper:

```tsx
// Before
<div className="relative">
  <button ...>...</button>
  <FavoriteButton ... />
</div>

// After
<div className="relative h-full">
  <button ...>...</button>
  <FavoriteButton ... />
</div>
```

Same for `BedtimeStoryCard` wrapper.

### Acceptance

- Open `/music?tab=sleep` at 1440px and check a row that contains a short-title card next to a long-title card: both cards have the same rendered height.
- Pill rows align to the bottom of every card in a row.
- No visual jump/jitter when cards change content.

---

## 4.3 BedtimeStoryCard play button — invert

**User ask:** "I asked you to invert the colors of the play button, and the cards underneath 'bedtime stories' were ignored. Fix this please."
**Scope decision:** Only Sleep & Rest cards (BedtimeStoryCard and any other Sleep play buttons missed). Other 14 files stay deferred.

### Change

**File:** `frontend/src/components/audio/BedtimeStoryCard.tsx`

```tsx
// Before
<span
  className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white"
  aria-hidden="true"
>
  <Play size={14} fill="currentColor" />
</span>

// After
<span
  className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]"
  aria-hidden="true"
>
  <Play size={14} fill="currentColor" aria-hidden="true" />
</span>
```

### Notes

- Treatment matches `ScriptureSessionCard`'s 32px play button (shipped Round 1).
- Subtle white glow (12px, 0.12 opacity) on the dark background.
- Parent `<button>` handles interaction state — inner `<span>` doesn't need hover/focus logic.

### Other Sleep tab play buttons to verify

Grep for play buttons in Sleep & Rest components beyond `ScriptureSessionCard` (already inverted) and `BedtimeStoryCard` (this spec):

- `TonightScripture.tsx` — 48px button, already inverted in Round 1
- `BibleSleepSection.tsx` quick-start icons — use `text-primary-lt` (lighter purple), NOT inversion. This was Round 1's intentional choice. Do NOT re-treat here.

If the grep finds any other interactive play controls on the Sleep tab that still have `bg-primary text-white`, invert them matching this pattern.

### Acceptance

- Every BedtimeStoryCard play button renders white with a purple Play triangle.
- Subtle white glow halo.
- No regression on `ScriptureSessionCard` or `TonightScripture` play buttons (already inverted).
- No regression on `BibleSleepSection` quick-start icons (they stay `text-primary-lt`).

---

## 4.4 Sleep & Rest pill rows — unified three/four-pill treatment

**User ask:** "All cards have a '(X) Min' timestamp within a circle... This looks not great. Would it make sense to try to squeeze it all on 1 line instead of the 2 lines like it is now?"
**User's pick:** "Three pills same treatment single line" and "this would be for all the cards on sleep and rest, not just the one I screenshotted."

### ScriptureSessionCard pill row

**File:** `frontend/src/components/audio/ScriptureSessionCard.tsx`

```tsx
// Before
<div className="mt-3 flex items-center gap-2">
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
    {formatDuration(reading.durationSeconds)}
  </span>
  <span className="text-xs text-white/50">
    {reading.voiceId === 'male' ? 'Male voice' : 'Female voice'}
  </span>
  <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
    <BookOpen size={10} aria-hidden="true" />
    Scripture
  </span>
  <span className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]" aria-hidden="true">
    <Play size={14} fill="currentColor" />
  </span>
</div>

// After (with mt-auto replacing mt-3 per §4.2)
<div className="mt-auto pt-3 flex items-center gap-1.5">
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
    {formatDuration(reading.durationSeconds)}
  </span>
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
    {reading.voiceId === 'male' ? 'Male' : 'Female'}
  </span>
  <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300 whitespace-nowrap">
    <BookOpen size={10} aria-hidden="true" />
    Scripture
  </span>
  <span className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]" aria-hidden="true">
    <Play size={14} fill="currentColor" />
  </span>
</div>
```

Key changes:
1. **Gap:** `gap-2` → `gap-1.5` to tighten horizontally and help single-line fit.
2. **Duration pill:** bumped `text-white/50` → `text-white/70` for readability; added `font-medium`.
3. **Voice:** wrapped in a pill (previously plain text); label shortened "Male voice" → "Male", "Female voice" → "Female" for single-line fit. Same styling as duration pill.
4. **Scripture pill:** unchanged colors, but added `whitespace-nowrap`.
5. **All pills:** add `whitespace-nowrap` to prevent wrapping within a pill.
6. **`aria-label`:** update to reflect new copy ("Male" / "Female" instead of "Male voice" / "Female voice"). User-facing aria-label on the parent `<button>` should stay descriptive — use "Male voice" in the aria-label even though the visible pill says "Male".

```tsx
aria-label={`Play ${reading.scriptureReference}: ${reading.title}, ${formatDuration(reading.durationSeconds)}, ${reading.voiceId} voice`}
// aria-label stays the same as before — only the visible pill text shortens.
```

### BedtimeStoryCard pill row

**File:** `frontend/src/components/audio/BedtimeStoryCard.tsx`

Four pills: duration, length (Short/Medium/Long), voice, Story. Attempting single-line.

```tsx
// Before
<div className="mt-3 flex flex-wrap items-center gap-2">
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
    {formatDuration(story.durationSeconds)}
  </span>
  <span className="text-xs font-medium text-white/50">
    {capitalize(story.lengthCategory)}
  </span>
  <span className="text-xs text-white/50">
    {story.voiceId === 'male' ? 'Male voice' : 'Female voice'}
  </span>
  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
    <Moon size={10} aria-hidden="true" />
    Story
  </span>
  <span className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
    <Play size={14} fill="currentColor" />
  </span>
</div>

// After (with inversion from §4.3 and mt-auto from §4.2)
<div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
    {formatDuration(story.durationSeconds)}
  </span>
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
    {capitalize(story.lengthCategory)}
  </span>
  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70 whitespace-nowrap">
    {story.voiceId === 'male' ? 'Male' : 'Female'}
  </span>
  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300 whitespace-nowrap">
    <Moon size={10} aria-hidden="true" />
    Story
  </span>
  <span className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]" aria-hidden="true">
    <Play size={14} fill="currentColor" />
  </span>
</div>
```

### Notes

- **`flex-wrap` retained** on BedtimeStoryCard because four pills + play button may not fit on narrow cards (e.g., 1-column mobile). When it wraps, all pills wrap together cleanly (not one-off).
- **`flex-wrap` removed** on ScriptureSessionCard (three pills + play — should fit single-line at 220px+ card widths).
- **Voice text shortened** from "Male voice" / "Female voice" to "Male" / "Female" — necessary for single-line fit. Semantic meaning preserved via `aria-label` on parent button.
- **Consistent pill treatment:** duration, length, voice pills all use `bg-white/10 text-white/70 font-medium rounded-full px-2 py-0.5 text-xs whitespace-nowrap`. Scripture/Story pills retain their violet treatment for category identity.
- **`gap-1.5`** instead of `gap-2` gives a tighter row that's more likely to fit on one line.

### Acceptance

- Every Sleep & Rest card pill row renders with unified pill shape for duration + length (BedtimeStoryCard only) + voice + category.
- On 1440px viewport at 3-column grid: all ScriptureSessionCard pills fit single-line (three pills + play button).
- On 1440px: BedtimeStoryCard pills fit single-line (four pills + play button) OR wrap cleanly if width too narrow.
- On 768px tablet: ScriptureSessionCard still single-line.
- On 375px mobile (1-column, full width): all pills fit single-line OR wrap cleanly if width too narrow.
- No text wrapping WITHIN a pill (all pills use `whitespace-nowrap`).
- Scripture/Story violet treatment preserved for category identity.

---

# Part 5: Verification Checklist

## Visual regression (Playwright)

Run `/verify-with-playwright` on all three tabs at 1440px, 768px, 375px:

- `/music?tab=playlists` — verify new hero size, gradient section headers, repositioned disclaimer below hero only
- `/music?tab=ambient` — verify gradient "Build Your Own Mix" header, white "Featured/All Scenes/Saved Mixes/Nature/Environments/Spiritual/Instruments" headers, desaturated scene cards
- `/music?tab=sleep` — verify grid wrap for Scripture Collection rows, equal-height cards, inverted BedtimeStoryCard play button, unified pill rows

## Automated accessibility

- Lighthouse Accessibility on `/music?tab=sleep` — target ≥ 95 (same as Round 1 target).
- Verify WCAG AA contrast on every new pill color (voice pill at `text-white/70` on `bg-white/10`).

## Cross-page PageHero check

Hero h1 bump affects 6 pages. Playwright-verify one screenshot at 1440px on each:
- `/music` ✓ (covered above)
- `/my-prayers`
- `/ask`
- `/meditate/breathing`
- `/meditate/soaking`
- `/meditate/psalms`

Acceptance: each page's hero feels bigger but doesn't cause overflow, awkward wrapping, or layout break.

## Manual QA

- Tap any track on `/music?tab=playlists` in an incognito window — confirms 30s preview behavior. Verify disclaimer renders below hero embed with new copy.
- Compare Ambient scene cards Round 1 vs Round 2 side-by-side screenshots — confirm further desaturation is visible.
- Reload `/music?tab=sleep` and confirm all four Scripture Collection sections render as grids, no horizontal scrollbars.
- Inspect a row containing short-title and long-title cards — confirm equal height.
- BedtimeStoryCard play button: tap one — confirms playback still works (inversion is visual only, no JS change).
- Section header hierarchy: "Music" (60px) > "Featured"/"Explore"/"Build Your Own Mix" (48px gradient) > default uppercase section headers (14px white). Visually clear.

---

# Part 6: Acceptance Summary

This spec is complete when:

1. ✅ `/music` h1 "Music" renders at `text-4xl sm:text-5xl lg:text-6xl`.
2. ✅ `<SectionHeader>` has `variant: 'default' | 'gradient'` prop.
3. ✅ Default variant renders `text-white` (not `text-white/50`).
4. ✅ Gradient variant renders centered, title-case, gradient-clipped, `text-3xl sm:text-4xl lg:text-5xl`.
5. ✅ "Featured" and "Explore" on Playlists tab use gradient variant.
6. ✅ "Build Your Own Mix" on Ambient tab uses gradient variant.
7. ✅ All other section headers on `/music` use default variant and render full white.
8. ✅ Spotify disclaimer repositioned below hero Featured embed only; Explore disclaimer removed.
9. ✅ Disclaimer copy: `Previews play here unless you're logged into a Spotify Premium account.`
10. ✅ `<Info>` icon removed from disclaimer. Disclaimer is grey text only.
11. ✅ Ambient scene gradients further desaturated ~30% from Round 1 (total ~55-60% from original).
12. ✅ ScriptureCollectionRow renders as responsive grid (1→2→3 columns) instead of horizontal scroll.
13. ✅ ScriptureSessionCard removes `min-w-[220px]` and `shrink-0`.
14. ✅ BedtimeStoryCard play button is inverted (white bg, purple arrow, subtle white glow halo).
15. ✅ All Sleep & Rest cards use `flex h-full flex-col` + `mt-auto` on action row for equal heights.
16. ✅ ScriptureSessionCard pill row: three unified pills (duration, voice, Scripture), single line, Scripture keeps violet tint.
17. ✅ BedtimeStoryCard pill row: four unified pills (duration, length, voice, Story), single line where possible, Story keeps violet tint.
18. ✅ Voice pill text shortened: "Male voice" → "Male", "Female voice" → "Female" (aria-labels preserve full semantic meaning).
19. ✅ Lighthouse Accessibility ≥ 95 on `/music?tab=sleep`.
20. ✅ 6 PageHero consumer pages verified at 1440px — no layout breaks from hero size bump.

---

## Change summary for `/code-review`

**Files created:** 0.
**Files modified:** 10.
- `PageHero.tsx` — hero size bump
- `SectionHeader.tsx` — variant prop + default color bump
- `WorshipPlaylistsTab.tsx` — gradient variant on h2s, disclaimer repositioned/rewritten/de-iconed
- `AmbientBrowser.tsx` — gradient variant on BYOM h2
- `FeaturedSceneCard.tsx` / `SceneCard.tsx` / `scene-backgrounds.ts` — further desaturation
- `ScriptureCollectionRow.tsx` — scroll → grid wrap
- `ScriptureSessionCard.tsx` — remove min-width, flex h-full, unified pill row, voice label shortening
- `BedtimeStoryCard.tsx` — play button inversion, flex h-full, unified pill row, voice label shortening

**Patterns introduced:** `variant` prop on `<SectionHeader>` allowing same primitive to render as either the small uppercase section grouping OR a centered gradient hero-adjacent heading.

**Patterns retired:** Info icon in Spotify disclaimer. Horizontal scroll for Scripture Collection rows. `text-white/50` on default SectionHeader. Plain-text "Male voice" / "Female voice" labels (now pills with shorter text).

**Known follow-ups:** Play button inversion on the remaining 14 files (AudioPlayerMini/Expanded, AudioPlayButton, etc.) still deferred — tracked for a future spec. Spotify OAuth / Web Playback SDK integration for Premium in-page listening — separate future feature, not a polish item.
