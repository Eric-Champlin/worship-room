# Spec: Music Page Facelift

**Scope:** `/music` across all three tabs (Worship Playlists, Ambient Sounds, Sleep & Rest), plus the shared hero, tab bar, and default routing.
**Outcome:** Visual and structural parity with the Grow + Daily Hub design system established in prior specs. Resolution of WCAG AA contrast failures on Sleep & Rest. Honest Spotify playback UX that funnels logged-out listeners to full playback in the Spotify app. Cleanup of the featured-scene duplication bug and the deprecated italic serif subtitle.
**Recon sources:** `_plans/recon/music-recon-playlists.json`, `_plans/recon/music-recon-ambient.json`, `_plans/recon/music-recon-sleep.json`, plus existing `_plans/recon/daily-hub-recon.json` and `_plans/recon/grow-recon.json` for pattern parity.

---

## Context

Six screenshots surfaced ~20 defects across the three Music tabs. Playwright recon confirmed root causes, found two bugs (featured scenes render twice in Ambient; Spotify embed error copy has no path to the white-pill treatment), and surfaced four WCAG AA contrast failures on the Sleep & Rest tab.

This spec is organized by component area, not by screenshot. Each fix references the originating screenshot callout.

## Out of scope

- Play button style inversion across the other 15 files (`AudioPlayerMini`, `AudioPlayerExpanded`, `AudioPlayButton`, `ScriptureSoaking`, `RoutineCard`, `ReadAloudButton`, `SharedMixHero`, `SavedMixCard`, `TimerTabContent`, `SceneCard`, `FeaturedSceneCard`, `BibleSleepSection`, `AudioPill`, `BedtimeStoryCard`, `DrawerNowPlaying`). This spec inverts only `TonightScripture` and `ScriptureSessionCard` — the two specifically called out in screenshot #6. The broader inversion is its own follow-up spec.
- Spotify OAuth integration. Preview-only playback for logged-out users is accepted as a Spotify platform constraint; the spec addresses UX around it rather than trying to work around it.
- Refactoring `AmbientBrowser`, `SleepBrowse`, `SoundGrid`, or other audio components beyond the specific visual and structural changes called out here.
- Ambient scene data model changes beyond adding an optional `themeColor` field.
- Shared `<PageHero>` component refactor. Hero changes happen inline in `MusicPage.tsx` props, not in `PageHero.tsx` itself.

---

## Prerequisites

### Files modified

| Path | Change |
|---|---|
| `frontend/src/pages/MusicPage.tsx` | Hero subtitle, default tab, shared `<Tabs>` migration, remove `scriptWord` prop to `PageHero` |
| `frontend/src/components/music/WorshipPlaylistsTab.tsx` | Section heading treatment, Spotify disclaimer row, white pill CTAs where applicable |
| `frontend/src/components/music/SpotifyEmbed.tsx` | Error card — white pill CTA, stronger copy |
| `frontend/src/components/audio/AmbientBrowser.tsx` | Dedupe featured scenes from grid, section heading treatment, mix row overflow behavior |
| `frontend/src/components/audio/FeaturedSceneCard.tsx` | Desaturate scene gradient overlay, copy pattern to `SceneCard` |
| `frontend/src/components/audio/SceneCard.tsx` | Desaturate scene gradient overlay |
| `frontend/src/components/audio/SoundGrid.tsx` | Horizontal scroll with edge-fade, category color theming, active-glow intensity bump |
| `frontend/src/components/audio/SoundCard.tsx` | Category-color tinting, active glow, consume new `categoryColor` prop |
| `frontend/src/components/audio/SleepBrowse.tsx` | Section heading treatment throughout |
| `frontend/src/components/audio/BibleSleepSection.tsx` | Quick-start card play icon color, heading treatment |
| `frontend/src/components/audio/TonightScripture.tsx` | Label contrast fix, heading color, play button inversion, tag pill contrast |
| `frontend/src/components/audio/ScriptureCollectionRow.tsx` | Section heading treatment |
| `frontend/src/components/audio/ScriptureSessionCard.tsx` | Scripture badge contrast, inline play button inversion |
| `frontend/src/components/audio/BedtimeStoriesGrid.tsx` | Section heading treatment |
| `frontend/src/data/scenes.ts` | Add optional `themeColor` field per scene (for future use — not consumed this spec) |

### Files created

| Path | Purpose |
|---|---|
| `frontend/src/constants/soundCategoryColors.ts` | Central color map for Nature / Environments / Spiritual / Instruments categories with WCAG AA compliant foregrounds |
| `frontend/src/components/ui/SectionHeader.tsx` | Shared left-aligned uppercase section heading primitive (matches Grow "Coming Up" treatment) |
| `frontend/src/components/ui/ScrollRow.tsx` | Horizontal scroll container with edge-fade gradients and overflow-aware "See more →" affordance |

---

# Part 1: Shared header + tab bar

## 1.1 Hero heading — remove `font-script` accent

**Screenshot:** 1 (callout #1)
**Problem:** "Music" renders in Caveat 48px via `<PageHero scriptWord="Music">`. Matches the deprecated pattern we removed from Grow and Challenge Detail heroes.

### Change

**File:** `frontend/src/pages/MusicPage.tsx` — remove `scriptWord` prop from the `PageHero` invocation. Pass `title="Music"` without a script accent.

```tsx
// Before
<PageHero
  title="Music"
  scriptWord="Music"
  subtitle="Worship, rest, and find peace in God's presence."
  {...}
/>

// After
<PageHero
  title="Music"
  subtitle="Worship, rest, and find peace in God's presence."
  {...}
/>
```

If `PageHero` does not support a title without a script word (i.e., if `scriptWord` is a required prop that always wraps the last word in `font-script`), verify and make it optional. The rendered h1 should be the full title in Inter, gradient-clipped via `GRADIENT_TEXT_STYLE`.

### Acceptance

- `/music` h1 renders "Music" in Inter, gradient-clipped.
- No `font-script` class anywhere in the h1 or its descendants.
- Visual weight matches `/grow` h1 treatment.

---

## 1.2 Hero subtitle — remove deprecated italic

**Screenshot:** 1 (callout #2)
**Problem:** Subtitle uses `mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg` — the italic Lora serif treatment removed from prose body text in the Daily Hub round.

### Change

**File:** `frontend/src/components/layout/PageHero.tsx` OR `frontend/src/pages/MusicPage.tsx` (wherever the subtitle classes are defined — the recon didn't confirm this, treat as verify-and-match)

```tsx
// Before
<p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
  {subtitle}
</p>

// After
<p className="mx-auto max-w-xl text-base text-white sm:text-lg">
  {subtitle}
</p>
```

### Notes

If the subtitle color change breaks other pages' treatment (`/grow`, `/daily`, challenge details all use `PageHero`), scope the color change to only pages where it was previously `text-white/60 font-serif italic`. Grep for `subtitle` prop usages on `PageHero` before editing. If the treatment is shared across all consuming pages, flag this as a cross-page change rather than a Music-only change — it's a net improvement per the design system doc but worth calling out in the code review.

### Acceptance

- Subtitle is Inter (not Lora), non-italic, solid white (not 60% white).
- If `PageHero` change affects other pages, those pages are visually improved (not broken) — verify via Playwright on `/grow`, `/daily`, and at least one challenge detail page.

---

## 1.3 Tab bar — migrate to shared `<Tabs>` primitive

**Screenshot:** 1 (callout #3)
**Problem:** `MusicPage.tsx:186-241` implements a bespoke underline tab bar — same pattern Grow had before we migrated it. `<Tabs>` already exists at `@/components/ui/Tabs` and matches Daily Hub visually.

### Change

**File:** `frontend/src/pages/MusicPage.tsx`

Replace the custom tab bar block (lines ~186-241) with:

```tsx
import { Tabs } from '@/components/ui/Tabs'
import { Music, Wind, Moon } from 'lucide-react'

// Inside MusicPage, replacing the bespoke tab bar:
<div className="sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none">
  <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
    <Tabs
      ariaLabel="Music content type"
      activeId={activeTab}
      onChange={(id) => setActiveTab(id as MusicTabId)}
      items={[
        { id: 'playlists', label: 'Worship Playlists', icon: <Music className="h-4 w-4" aria-hidden="true" /> },
        { id: 'ambient', label: 'Ambient Sounds', icon: <Wind className="h-4 w-4" aria-hidden="true" /> },
        { id: 'sleep', label: 'Sleep & Rest', icon: <Moon className="h-4 w-4" aria-hidden="true" /> },
      ]}
    />
  </div>
</div>
```

Remove the old underline-sliding logic: `activeTabIndex` ref math, `translateX` inline style computation, animated underline `<div>`, and the bespoke `handleTabKeyDown` arrow-key handler (Tabs primitive owns this). `setActiveTab` (including querystring sync) stays.

### Acceptance

- `/music` tabs visually indistinguishable from `/grow` tabs and `/daily` tabs.
- All three tabs share y ±2px at every breakpoint.
- Pill container `rounded-full border border-white/[0.12] bg-white/[0.06] p-1`.
- Active tab fill `bg-white/[0.12] border border-white/[0.15]` + purple halo `shadow-[0_0_12px_rgba(139,92,246,0.15)]`.
- Arrow-key roving tabindex works.
- Deep links `/music?tab=playlists`, `/music?tab=ambient`, `/music?tab=sleep` all work unchanged.
- Keyboard focus ring matches Daily Hub pattern.

---

## 1.4 Default tab — land on Worship Playlists

**Not in screenshots, but in the user ask:**
> "When users click on 'Music' in the NavBar, I want them to land on the Worship Playlists tab. Right now it's set for them to land on Ambient Sounds."

### Change

**File:** `frontend/src/pages/MusicPage.tsx:51`

```tsx
// Before
const defaultTab: MusicTabId = 'ambient'

// After
const defaultTab: MusicTabId = 'playlists'
```

### Notes

The three other `setSearchParams({ tab: 'ambient' })` calls at lines 82, 112, 117 belong to the shared-mix deep-link flow (user lands on `/music` from a shared mix link). Do NOT change those — the shared-mix flow is intentionally routed to Ambient.

### Acceptance

- Navigating from Navbar `Music` link → lands on `?tab=playlists`.
- Direct visits to `/music` (no querystring) → land on `?tab=playlists`.
- Shared-mix deep links still land on `?tab=ambient` (verify one example still works).

---

# Part 2: Worship Playlists tab

## 2.1 Section headings — "Featured" and "Explore"

**Screenshot:** 1 (callout #4), Screenshot 2 (callout #1)
**Problem:** Both use `font-script text-3xl font-bold text-white` (Caveat 36px) with a `<HeadingDivider>` SVG drawing fading lines and a centered dot. It's the web-magazine pattern we've been removing.

### New shared primitive

**File:** `frontend/src/components/ui/SectionHeader.tsx` (new)

```tsx
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  /** The heading text */
  children: ReactNode
  /** Optional icon rendered left of the label */
  icon?: ReactNode
  /** Heading level — defaults to h2 */
  as?: 'h2' | 'h3'
  /** Optional right-aligned content (e.g. "See all" link) */
  action?: ReactNode
  className?: string
}

/**
 * Shared section heading matching the "Coming Up" pattern on /grow.
 * Left-aligned, uppercase, tracking-wide, text-white/50.
 * No decorative dividers. No script font.
 */
export function SectionHeader({ children, icon, as = 'h2', action, className }: SectionHeaderProps) {
  const Tag = as
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <Tag className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50">
        {icon}
        <span>{children}</span>
      </Tag>
      {action}
    </div>
  )
}
```

### Change

**File:** `frontend/src/components/music/WorshipPlaylistsTab.tsx`

```tsx
// Before
<div className="mb-8 text-center">
  <h2 className="font-script text-3xl font-bold text-white sm:text-4xl">
    Featured
  </h2>
  <HeadingDivider />
</div>

// After
<SectionHeader>Featured</SectionHeader>
```

Same treatment for "Explore". Remove `HeadingDivider` imports from this file if no longer used.

### Acceptance

- "Featured" and "Explore" headings are left-aligned uppercase `text-sm text-white/50`.
- No decorative SVG dividers.
- No Caveat font.
- Section heading treatment is visually identical to Grow "Coming Up" heading.

---

## 2.2 Spotify playback UX — honest preview messaging

**Screenshot:** 3 (callout #1) and follow-up conversation on Spotify auth
**Problem:** Logged-out listeners hear 30-second previews only (Spotify platform constraint — not fixable in the Embed). Users currently don't know this and experience it as "broken."

### Product approach

Preview-only playback is accepted as the constraint. The goal shifts from "enable full playback in-browser" (impossible) to "funnel logged-out listeners to full playback in the Spotify app, where their listens count as streams." The Spotify Embed already exposes "Save on Spotify" / track-tap flows that open the Spotify app. Users just need honest expectation-setting so they don't think the preview cap is a bug.

### Change

**File:** `frontend/src/components/music/WorshipPlaylistsTab.tsx`

Add a single-line disclaimer above the Featured embed and the Explore grid:

```tsx
import { Info } from 'lucide-react'

// Place above the Featured section's SpotifyEmbed:
<p className="mx-auto mb-3 flex max-w-2xl items-center justify-center gap-2 text-xs text-white/50">
  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  <span>30-second previews play here. Tap any track or playlist to open in Spotify for full listening.</span>
</p>
```

Render the same disclaimer once above the Explore grid. Do NOT render it per-embed — that's visual noise.

### Acceptance

- Disclaimer renders once above the Featured embed and once above the Explore grid.
- Copy reads exactly: "30-second previews play here. Tap any track or playlist to open in Spotify for full listening."
- Icon is `Info` from lucide, `h-3.5 w-3.5`, same `text-white/50` color as the text.
- Disclaimer does not render if the tab is not the active tab (hidden by the existing tab-panel `hidden` attr).

---

## 2.3 Spotify embed error card — white pill CTA

**Screenshot:** 3 (callout continued)
**Problem:** When the iframe fails to load within 10s, the fallback card shows "Open in Spotify" as an outlined primary pill. User wants it to match Daily Hub / Grow white pill pattern for conversion prominence.

### Change

**File:** `frontend/src/components/music/SpotifyEmbed.tsx` (lines ~52-71)

```tsx
// Before
<div className="rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-6 text-center">
  <p className="font-medium text-white">{playlist.name}</p>
  <p className="mt-1 text-sm text-white/60">Player couldn't load — tap to open in Spotify</p>
  <a
    href={spotifyUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-4 inline-block rounded-full border border-primary px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10"
  >
    Open in Spotify
  </a>
</div>

// After
<div className="rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-center shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]">
  <p className="font-medium text-white">{playlist.name}</p>
  <p className="mt-1 text-sm text-white/60">Player couldn't load. Tap below for full listening in the Spotify app.</p>
  <Button variant="light" size="sm" asChild className="mt-4">
    <a href={spotifyUrl} target="_blank" rel="noopener noreferrer">
      Open in Spotify →
    </a>
  </Button>
</div>
```

### Notes

- Copy strengthened from "Open in Spotify" (weak) to "Open in Spotify →" with right arrow — conveys outbound action.
- Card treatment upgraded from faded `bg-[rgba(15,10,30,0.3)]` to canonical FrostedCard (matches all other cards on the page).
- Button uses existing `variant="light"` established in the Grow spec. Import: `import { Button } from '@/components/ui/Button'`.

### Acceptance

- Error card uses canonical FrostedCard treatment.
- CTA is a white pill with `text-primary` foreground.
- CTA contains a trailing `→` character.
- `target="_blank" rel="noopener noreferrer"` attributes preserved (security).
- Clicking the CTA opens the Spotify URL in a new tab.

---

# Part 3: Ambient Sounds tab

## 3.1 Dedupe featured scenes from All Scenes grid

**Recon finding:** `AmbientBrowser.tsx` renders featured scenes in the Featured row AND again in the All Scenes grid below. Users see 11 cards with 3 duplicates instead of 8 unique ones.

### Change

**File:** `frontend/src/components/audio/AmbientBrowser.tsx`

Filter `FEATURED_SCENE_IDS` out of the grid render:

```tsx
import { SCENES, FEATURED_SCENE_IDS } from '@/data/scenes'

// Before (wherever the All Scenes grid is mapped)
{SCENES.map((scene) => <SceneCard key={scene.id} scene={scene} />)}

// After
{SCENES.filter((scene) => !FEATURED_SCENE_IDS.includes(scene.id)).map((scene) => (
  <SceneCard key={scene.id} scene={scene} />
))}
```

### Acceptance

- Featured row renders 3 cards (Garden of Gethsemane, Still Waters, Midnight Rain).
- All Scenes grid renders 8 cards (all scenes except the 3 featured ones).
- No scene renders twice on the page.
- Total scene card count: 11 (down from 14 with duplicates).

---

## 3.2 Section headings — "All Scenes" and "Build Your Own Mix"

**Recon finding:** Currently `mb-4 text-base font-medium text-white` (Inter 16px) — inconsistent with playlists tab's Caveat 36px. The whole spec unifies on the new `<SectionHeader>` primitive.

### Change

**File:** `frontend/src/components/audio/AmbientBrowser.tsx`

```tsx
// Before
<h2 className="mb-4 text-base font-medium text-white">All Scenes</h2>

// After
<SectionHeader>All Scenes</SectionHeader>

// And for Build Your Own Mix:
<SectionHeader>Build Your Own Mix</SectionHeader>
```

Apply the same treatment to "Saved Mixes" (conditional section above Featured) and "Featured" (currently implicit — add an explicit header for consistency). The Featured row is currently rendered without a section heading; add one.

### Acceptance

- Every top-level section on Ambient uses `<SectionHeader>`.
- Section heading hierarchy on Ambient tab: Saved Mixes (if any) → Featured → All Scenes → Build Your Own Mix.
- All headings identical treatment.

---

## 3.3 Scene cards — desaturate gradients

**Screenshot:** 4 (callout)
**Problem:** Scene gradient backgrounds (#2D3A1C olive, #1A5A5A teal, #0F1F2F navy, etc.) are highly saturated. On the `#0F0A1E` dashboard-dark page background, they clash — each card looks like it belongs to a different app.

### Approach

Per user preference: keep the per-scene gradient identity (Gethsemane = olive-green, Still Waters = teal, etc.) but desaturate 30-40% so the color feels tinted rather than illustrative. The existing card structure and `getSceneBackground()` helper remain.

### Change

**File:** `frontend/src/data/scene-backgrounds.ts`

Update each scene's gradient to use lower saturation. The approach: take existing hex colors and reduce their chroma while preserving hue. For each gradient, pass through a desaturation transform OR manually pick equivalent desaturated hex values.

Example transformation table (concrete values — the AI agent executing this spec should apply the same shift to all scenes):

| Scene | Original primary | Desaturated primary | Delta |
|---|---|---|---|
| Garden of Gethsemane | `#2D3A1C` → `#4A5A32` → `#3D4A2C` | `#282E1F` → `#3D4536` → `#343A2E` | ~35% saturation reduction |
| Still Waters | `#1A5A5A` → `#2A7A7A` → `#3A8A8A` | `#1E3E3E` → `#2F5454` → `#3E6262` | ~35% |
| Midnight Rain | `#0F1F2F` → `#1A2A3A` → `#253545` | unchanged (already muted) | 0% |
| Ember & Stone | capture current, desaturate | |  |
| Morning Mist | capture current, desaturate | |  |
| The Upper Room | capture current, desaturate | |  |
| Starfield | capture current, desaturate | |  |
| Mountain Refuge | capture current, desaturate | |  |
| Peaceful Study | capture current, desaturate | |  |
| Evening Scripture | capture current, desaturate | |  |
| Sacred Space | capture current, desaturate | |  |

**Executor guidance:** use a tool like `culori` or manual HSL manipulation — convert each hex to HSL, reduce saturation value by 35% (multiplicatively, e.g., `s * 0.65`), convert back to hex. The repeating-pattern overlays (`repeating-linear-gradient` noise textures) should also be reduced in opacity from their current `rgba(255,255,255,0.06-0.08)` to `rgba(255,255,255,0.04-0.06)` to match.

Alternative if per-gradient math is too fiddly: overlay a `rgba(15, 10, 30, 0.25)` layer on top of every scene gradient to muffle uniformly. Less surgical but more consistent.

### Acceptance

- All 11 scene cards visually feel like they belong to the same dark-purple app canvas.
- Color identity per scene is still recognizable (Gethsemane still reads green, Still Waters still reads teal, etc.).
- Placed side-by-side with the current design, the difference is obvious — scenes look "muted" or "dusk-lit" rather than "full daylight."
- Text overlays (`h3` scene name, description) remain legible on every card — run visual pass on all 11.

---

## 3.4 Build Your Own Mix — category color tiles + active glow

**Screenshot:** 5 (callout #2)
**Problem:** All 24 sound tiles are identical `bg-white/[0.06]` — a wall of gray. Groupings (Nature, Environments, Spiritual, Instruments) are structural but invisible.

### New constant file

**File:** `frontend/src/constants/soundCategoryColors.ts` (new)

```ts
/**
 * Color tokens for the Build Your Own Mix category groupings.
 *
 * Each category maps to a Tailwind color family with tuned shades for:
 * - Tile background tint (~8% opacity over dark card bg)
 * - Icon foreground (inactive state)
 * - Active-state glow halo color
 *
 * Foregrounds are tuned to meet WCAG AA for decorative icons over
 * FrostedCard bg (rgba(255,255,255,0.06) on #0F0A1E ≈ #1A1628).
 */
export type SoundCategory = 'nature' | 'environments' | 'spiritual' | 'instruments'

export interface SoundCategoryTokens {
  /** Tile background tint */
  bgClass: string
  /** Tile border (subtle, category-tinted) */
  borderClass: string
  /** Icon color when inactive */
  iconInactiveClass: string
  /** Icon color when active */
  iconActiveClass: string
  /** Active-state glow halo CSS */
  activeGlow: string
}

export const SOUND_CATEGORY_COLORS: Record<SoundCategory, SoundCategoryTokens> = {
  nature: {
    bgClass: 'bg-emerald-500/[0.08]',
    borderClass: 'border-emerald-400/20',
    iconInactiveClass: 'text-emerald-300/70',
    iconActiveClass: 'text-emerald-200',
    activeGlow: 'shadow-[0_0_16px_rgba(52,211,153,0.45)]',
  },
  environments: {
    bgClass: 'bg-amber-500/[0.08]',
    borderClass: 'border-amber-400/20',
    iconInactiveClass: 'text-amber-300/70',
    iconActiveClass: 'text-amber-200',
    activeGlow: 'shadow-[0_0_16px_rgba(251,191,36,0.45)]',
  },
  spiritual: {
    bgClass: 'bg-violet-500/[0.08]',
    borderClass: 'border-violet-400/20',
    iconInactiveClass: 'text-violet-300/70',
    iconActiveClass: 'text-violet-200',
    activeGlow: 'shadow-[0_0_16px_rgba(167,139,250,0.45)]',
  },
  instruments: {
    bgClass: 'bg-sky-500/[0.08]',
    borderClass: 'border-sky-400/20',
    iconInactiveClass: 'text-sky-300/70',
    iconActiveClass: 'text-sky-200',
    activeGlow: 'shadow-[0_0_16px_rgba(125,211,252,0.45)]',
  },
}

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  nature: 'Nature',
  environments: 'Environments',
  spiritual: 'Spiritual',
  instruments: 'Instruments',
}
```

### Change

**File:** `frontend/src/components/audio/SoundGrid.tsx`

Pass category tokens into each `SoundCard`:

```tsx
import { SOUND_CATEGORY_COLORS, SOUND_CATEGORY_LABELS, type SoundCategory } from '@/constants/soundCategoryColors'

// Inside the categories map (assuming data already groups sounds by category):
{categories.map(({ id, sounds }) => (
  <section key={id} aria-label={SOUND_CATEGORY_LABELS[id]}>
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
      {SOUND_CATEGORY_LABELS[id]}
    </h3>
    <ScrollRow ariaLabel={SOUND_CATEGORY_LABELS[id]} itemCount={sounds.length}>
      {sounds.map((sound) => (
        <SoundCard
          key={sound.id}
          sound={sound}
          categoryTokens={SOUND_CATEGORY_COLORS[id]}
          isActive={/* existing active check */}
          onToggle={/* existing handler */}
        />
      ))}
    </ScrollRow>
  </section>
))}
```

**File:** `frontend/src/components/audio/SoundCard.tsx`

Consume the new `categoryTokens` prop and apply classes:

```tsx
import { cn } from '@/lib/utils'
import type { SoundCategoryTokens } from '@/constants/soundCategoryColors'

interface SoundCardProps {
  sound: Sound
  categoryTokens: SoundCategoryTokens
  isActive: boolean
  onToggle: () => void
}

export function SoundCard({ sound, categoryTokens, isActive, onToggle }: SoundCardProps) {
  const Icon = /* existing icon resolution */
  return (
    <button
      type="button"
      role="switch"
      aria-pressed={isActive}
      aria-label={sound.label}
      onClick={onToggle}
      className={cn(
        'relative flex h-[90px] w-[90px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl',
        'border backdrop-blur-sm transition-shadow duration-base motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
        'active:scale-[0.98]',
        categoryTokens.bgClass,
        categoryTokens.borderClass,
        isActive && cn(categoryTokens.activeGlow, 'motion-safe:animate-sound-pulse'),
      )}
    >
      <Icon
        className={cn(
          'h-6 w-6 transition-colors duration-base',
          isActive ? categoryTokens.iconActiveClass : categoryTokens.iconInactiveClass,
        )}
        aria-hidden="true"
      />
      <span className="line-clamp-2 text-center text-xs leading-tight text-white/80">
        {sound.label}
      </span>
    </button>
  )
}
```

### Notes

- Active glow intensity bumped from `shadow-[0_0_12px_rgba(147,51,234,0.4)]` (original, purple for all categories) to `shadow-[0_0_16px_...]` with per-category color. The extra 4px radius + category color makes active state more immediately legible.
- `motion-safe:animate-sound-pulse` preserved — it was already there.
- Inactive icons use `/70` opacity on the category color (subtle); active icons go full opacity.

### Acceptance

- Nature tiles render green-tinted, Environments amber-tinted, Spiritual violet-tinted, Instruments blue-tinted.
- Inactive state: subtle category color tint on bg and icon; no glow.
- Active state: bright category color icon, category-colored glow halo, `animate-sound-pulse` preserved.
- Tapping a tile toggles it; active visual state reflects it within 250ms.
- All 4 categories render cleanly on the Ambient tab.

---

## 3.5 Mix rows — horizontal scroll with edge fade + overflow affordance

**Screenshot:** 5 (callout #1)
**Problem:** Rows with more than 6 items wrap to a second line. User wants single-row layout with horizontal scroll and a "See more →" affordance where applicable.

### New shared primitive

**File:** `frontend/src/components/ui/ScrollRow.tsx` (new)

```tsx
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScrollRowProps {
  children: ReactNode
  ariaLabel: string
  /** Used to determine whether to render the "See more" affordance */
  itemCount: number
  /** Override overflow threshold — defaults to 6 */
  overflowThreshold?: number
  className?: string
}

/**
 * Horizontal-scroll container with:
 * - Native scrollbar on desktop (hidden until hover)
 * - Edge-fade gradients on both sides to signal scrollability
 * - "See more →" affordance on the right when content overflows viewport
 * - Touch-friendly scroll on mobile (snap-x)
 */
export function ScrollRow({ children, ariaLabel, itemCount, overflowThreshold = 6, className }: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [showRightFade, setShowRightFade] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)

  // Recompute fade visibility based on scroll position
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const updateFades = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShowLeftFade(scrollLeft > 4)
      setShowRightFade(scrollLeft + clientWidth < scrollWidth - 4)
    }

    updateFades()
    el.addEventListener('scroll', updateFades, { passive: true })
    window.addEventListener('resize', updateFades)
    return () => {
      el.removeEventListener('scroll', updateFades)
      window.removeEventListener('resize', updateFades)
    }
  }, [])

  const hasOverflow = itemCount > overflowThreshold

  const scrollRight = () => {
    scrollerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })
  }

  return (
    <div className={cn('relative', className)} role="region" aria-label={ariaLabel}>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-thin"
      >
        {children}
      </div>

      {/* Left edge fade — only when scrolled */}
      {showLeftFade && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-hero-bg to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Right edge fade — when more content to the right */}
      {showRightFade && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-hero-bg to-transparent"
          aria-hidden="true"
        />
      )}

      {/* "See more" affordance — only if overflow detected by item count heuristic */}
      {hasOverflow && showRightFade && (
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.12] border border-white/[0.15] text-white/80 hover:bg-white/[0.18] transition-colors motion-reduce:transition-none"
          aria-label="See more"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
```

### Change

Use `<ScrollRow>` in `SoundGrid.tsx` (wrapping each category row, see §3.4), and in `AmbientBrowser.tsx` for the Featured scenes row (currently already scroll-x on mobile but adds edge-fade + overflow indicator for consistency).

### Notes

- The scroll affordance button auto-hides when the user has scrolled to the rightmost end (via `showRightFade` state).
- Left-edge fade appears when scrolled right (signals you can scroll back).
- On mobile, native touch scrolling is preserved; the "See more" button stays visible.
- `scrollbar-thin` is a Tailwind plugin class — if not available in the project, use `scrollbar-none` (hides scrollbar entirely) and rely on edge fades + trackpad scroll only. Verify plugin availability during implementation.

### Acceptance

- Nature row (7 items) shows scroll affordance and left/right edge fades when scrolled.
- Environments row (6 items) — no affordance at 1440px (fits natively), shows at smaller viewports if overflow detected.
- Instruments row (6 items) — same as Environments.
- Featured scenes row (3 items) — no affordance ever.
- Clicking "See more →" button scrolls 300px right smoothly.
- Left fade hides when scrolled all the way left; right fade hides when scrolled all the way right.

---

# Part 4: Sleep & Rest tab

## 4.1 Section headings

**Recon finding:** Multiple h2/h3 scattered at `text-lg font-semibold text-white` or `text-xl font-semibold text-white`. Unify on `<SectionHeader>`.

### Change

**Files:** `frontend/src/components/audio/BibleSleepSection.tsx`, `frontend/src/components/audio/ScriptureCollectionRow.tsx`, `frontend/src/components/audio/BedtimeStoriesGrid.tsx`, any top-level section heading in `SleepBrowse.tsx`.

Replace every top-level section heading with `<SectionHeader>`:

- "Scripture Reading" (BibleSleepSection)
- "Psalms of Peace", "Comfort & Rest", "Trust in God", "Hope & Promise" (ScriptureCollectionRow, 4 instances)
- "Bedtime Stories" (BedtimeStoriesGrid)
- "Build a Bedtime Routine" heading in the routine CTA card — stays as an `<h3>` inside the card (not a section header)

### Acceptance

- All Sleep tab top-level section headings use `<SectionHeader>`.
- Treatment visually identical to Ambient and Playlists tabs.
- "Tonight's Scripture" label — see §4.2 (separate treatment, not a section header).

---

## 4.2 "Tonight's Scripture" label — contrast fix + color change

**Screenshot:** 6 (callout #2)
**Problem:** Label currently `text-sm font-medium uppercase tracking-wide text-primary` (`#6D28D9`) — that's ~3.0:1 contrast on `#08051A`. Fails WCAG AA.

### Change

**File:** `frontend/src/components/audio/TonightScripture.tsx`

```tsx
// Before
<span className="text-sm font-medium uppercase tracking-wide text-primary">
  Tonight's Scripture
</span>

// After
<span className="text-sm font-medium uppercase tracking-wide text-white">
  Tonight's Scripture
</span>
```

### Acceptance

- Label renders in solid white.
- Contrast ratio on `#08051A` background: 21:1 (pure white, WCAG AAA).
- Visual prominence matches "COMING UP" treatment on `/grow`.

---

## 4.3 TonightScripture play button — inversion

**Screenshot:** 6 (callout #3)
**Problem:** Current `bg-primary text-white` 48px button. User wants white bg, purple arrow.

### Change

**File:** `frontend/src/components/audio/TonightScripture.tsx`

```tsx
// Before
<button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-lt">
  <Play size={20} fill="currentColor" />
</button>

// After
<button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.96]">
  <Play size={20} fill="currentColor" />
</button>
```

### Notes

- White glow shadow (`rgba(255,255,255,0.15)`) gives the inverted button visual weight on the dark background.
- `active:scale-[0.96]` matches the press feedback on Daily Hub's large play buttons.
- Hover darkens slightly (`gray-100`).

### Acceptance

- Button renders white with a purple Play triangle.
- Subtle white glow halo behind the button.
- Hover state darkens button by ~5%.
- Press feedback visible on click.

---

## 4.4 ScriptureSessionCard Scripture tag — contrast fix

**Screenshot:** 6 (callout #4) + recon flag
**Problem:** `bg-primary/10 text-primary` — approximately 3.1:1 on the composited background. Fails WCAG AA.

### Change

**File:** `frontend/src/components/audio/ScriptureSessionCard.tsx`

```tsx
// Before
<span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
  <BookOpen size={10} />
  Scripture
</span>

// After
<span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
  <BookOpen size={10} aria-hidden="true" />
  Scripture
</span>
```

### Notes

- Color treatment mirrors the `CATEGORY_COLORS.advent` pattern from the Grow spec (same rationale: violet-300 on violet-500/15 tint hits AA cleanly).
- If there's a parallel "Story" badge on `BedtimeStoryCard.tsx`, apply the same `bg-violet-500/15 text-violet-300` pattern there too — worth a grep for all badge variants on Sleep & Rest.

### Acceptance

- "Scripture" tag renders readable violet on violet-tinted background.
- WCAG AA contrast ≥ 4.5:1 at 12px — verify with axe DevTools on `/music?tab=sleep`.
- If "Story" tag exists elsewhere, same treatment applied.

---

## 4.5 ScriptureSessionCard inline play button — inversion

**Screenshot:** 6 (callout #3 — inline play buttons)
**Problem:** 32px `bg-primary text-white` circular button. User wants white bg, purple arrow across all Sleep tab play buttons.

### Change

**File:** `frontend/src/components/audio/ScriptureSessionCard.tsx`

```tsx
// Before
<div className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
  <Play size={14} fill="currentColor" />
</div>

// After
<div className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]">
  <Play size={14} fill="currentColor" aria-hidden="true" />
</div>
```

### Notes

- No hover/focus logic on the inner `<div>` because the parent `<button>` handles interaction state. Keeping the visual consistent with the TonightScripture button but scaled down.
- Smaller glow halo (12px, 0.12 opacity) to match the smaller button size.

### Acceptance

- Inline 32px play buttons on each ScriptureSessionCard render white with purple arrow.
- Subtle white glow.
- Clicking the parent card triggers playback (existing behavior, unchanged).

---

## 4.6 Quick-start card play icons — color fix

**Screenshot:** 6 (callout #1)
**Problem:** BibleSleepSection quick-start cards (Peaceful Study, Evening Scripture, Sacred Space) have `text-primary` play icons (`#6D28D9`) that fail contrast on `bg-white/[0.06]`.

### Change

**File:** `frontend/src/components/audio/BibleSleepSection.tsx`

```tsx
// Before
<Play className="h-4 w-4 flex-shrink-0 text-primary" />

// After
<Play className="h-4 w-4 flex-shrink-0 text-primary-lt" aria-hidden="true" />
```

### Notes

- `text-primary-lt` is the lighter primary variant (`#a78bfa` violet-400). Passes WCAG AA over the card bg.
- If `text-primary-lt` doesn't exist in the Tailwind config, use `text-violet-300` directly.
- Same fix applies to the Read the Bible card's BookOpen icon: `text-primary` → `text-primary-lt`.

### Acceptance

- All play icons on BibleSleepSection render in a visibly lighter purple.
- Contrast ≥ 4.5:1 against the card bg.
- Read the Bible card's BookOpen icon consistent with play icons.

---

## 4.7 "Create a Routine" CTA — contrast fix

**Recon flag:** Outlined `border border-primary text-primary` button on the routine CTA card fails WCAG AA.

### Change

**File:** `frontend/src/components/audio/SleepBrowse.tsx` (the routine CTA card at the bottom of the tab)

```tsx
// Before
<a href="/music/routines" className="inline-block rounded-full border border-primary px-6 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
  Create a Routine
</a>

// After
<Button variant="light" size="sm" asChild>
  <a href="/music/routines">Create a Routine</a>
</Button>
```

### Notes

- Matches white pill pattern used elsewhere. Aligns visually with the updated Spotify error card CTA.

### Acceptance

- "Create a Routine" is a white pill with `text-primary` foreground.
- Contrast passes WCAG AA.

---

# Part 5: Verification checklist

## Visual regression (Playwright)

Run `/verify-with-playwright` on these routes at 1440px and 375px:

- `/music` (confirm defaults to `?tab=playlists`)
- `/music?tab=playlists`
- `/music?tab=ambient`
- `/music?tab=sleep`

Tolerance: ±2px per design system. No "CLOSE" verdicts.

## Automated accessibility checks

Run Lighthouse Accessibility on `/music?tab=sleep` (the tab with the most contrast risk). Target ≥ 95. Specifically verify:

- "Tonight's Scripture" label contrast: 21:1.
- "Scripture" tag on every ScriptureSessionCard: ≥ 4.5:1.
- "Create a Routine" CTA: ≥ 4.5:1.
- Quick-start card play icons on BibleSleepSection: ≥ 4.5:1.

## Manual checks

- Click through all three tabs on `/music` — confirm pill + purple halo active state, no width shift, keyboard focus ring.
- Navigate to `/music` from the Navbar — confirm lands on Worship Playlists.
- Navigate to a shared-mix link (if you have one) — confirm still lands on Ambient.
- Disable network (DevTools → Offline) and reload `/music?tab=playlists` — confirm Spotify embed error card renders with the white pill CTA.
- Scroll a Build-Your-Own-Mix row with > 6 items on desktop — confirm right edge fade + "See more →" button appear, scroll left → left edge fade appears.
- Tap through every sound tile category — confirm Nature/Environments/Spiritual/Instruments colors distinguish at a glance.
- Compare Ambient scene cards before/after — confirm saturation reduction visible but per-scene color identity preserved.

## Edge cases

- Playlist with a long name (exceeds the embed card width): confirm wraps or ellipsizes gracefully.
- Empty "Saved Mixes" (logged-out user): section hidden, no empty state leak.
- User with 20+ saved mixes: ScrollRow handles arbitrary count.
- Reduced motion preference: active-glow `animate-sound-pulse` respects `motion-reduce:transition-none`.
- Screen reader on Sleep tab: "Tonight's Scripture" is announced as "Tonight's Scripture" (label), then "The Lord is Near" (card title), then the chips, then "Play" button. Order matches visual.

---

# Part 6: Acceptance summary

This spec is complete when:

1. ✅ `/music` hero renders "Music" in Inter gradient (no Caveat script).
2. ✅ Hero subtitle is Inter solid white (no Lora italic).
3. ✅ `/music` tabs are visually identical to `/grow` and `/daily` tabs.
4. ✅ `/music` default lands on Worship Playlists.
5. ✅ "Featured" and "Explore" section headers use new `<SectionHeader>` primitive.
6. ✅ Spotify preview disclaimer renders once above Featured and once above Explore on the Playlists tab.
7. ✅ Spotify embed error card uses FrostedCard treatment and white pill CTA with `→`.
8. ✅ Ambient scenes: featured 3 no longer duplicate in the All Scenes grid.
9. ✅ Ambient scene gradients desaturated ~35% — color identity preserved.
10. ✅ Build Your Own Mix tiles render with category colors (Nature green, Environments amber, Spiritual violet, Instruments blue).
11. ✅ Active sound tile glows in its category color, animates via `animate-sound-pulse`.
12. ✅ Build Your Own Mix rows use `<ScrollRow>` with edge-fade + overflow-aware "See more →" button.
13. ✅ Sleep & Rest section headings use `<SectionHeader>`.
14. ✅ "Tonight's Scripture" label renders in solid white.
15. ✅ TonightScripture 48px play button: white bg, purple arrow, glow halo.
16. ✅ ScriptureSessionCard inline 32px play buttons: white bg, purple arrow.
17. ✅ "Scripture" tag pills render violet-300 on violet-500/15 tint, AA-compliant.
18. ✅ BibleSleepSection play icons use `text-primary-lt` (or `text-violet-300`).
19. ✅ "Create a Routine" CTA is a white pill.
20. ✅ New `<SectionHeader>` and `<ScrollRow>` components exported from `@/components/ui/` for future use.
21. ✅ New `SOUND_CATEGORY_COLORS` constant available for future sound tile consumers.
22. ✅ Lighthouse Accessibility ≥ 95 on `/music?tab=sleep`.

---

## Change summary for `/code-review`

- **Files created:** `SectionHeader.tsx`, `ScrollRow.tsx`, `soundCategoryColors.ts`
- **Files modified:** `MusicPage.tsx`, `WorshipPlaylistsTab.tsx`, `SpotifyEmbed.tsx`, `AmbientBrowser.tsx`, `FeaturedSceneCard.tsx`, `SceneCard.tsx`, `SoundGrid.tsx`, `SoundCard.tsx`, `SleepBrowse.tsx`, `BibleSleepSection.tsx`, `TonightScripture.tsx`, `ScriptureCollectionRow.tsx`, `ScriptureSessionCard.tsx`, `BedtimeStoriesGrid.tsx`, `scene-backgrounds.ts`, `scenes.ts`
- **Patterns introduced:** `<SectionHeader>` left-aligned uppercase pattern, `<ScrollRow>` with edge-fade + overflow affordance, `SOUND_CATEGORY_COLORS` central category color map, preview-aware Spotify disclaimer pattern
- **Patterns retired from these files:** `<HeadingDivider>` decorative SVG dividers (still exists in file tree — other consumers may still use it, grep before deleting), `font-script` hero accent on `/music`, italic serif subtitle, `text-primary` on dark backgrounds for decorative icons, outlined-primary CTAs
- **Known follow-ups:** Play button inversion across the other 15 files, `<HeadingDivider>` full removal if this spec leaves no remaining consumers, scene `themeColor` field consumption if a future spec reintroduces the atmospheric-base pattern for scenes
