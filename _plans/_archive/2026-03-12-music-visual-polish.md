# Implementation Plan: Music Visual Polish — Light Theme, Layout Cleanup, Card Redesign

**Spec:** `_specs/music-visual-polish.md`
**Date:** 2026-03-12
**Branch:** `claude/feature/music-visual-polish`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** Not applicable (visual polish, no external recon)

---

## Architecture Context

### Directory Structure
- **Pages:** `frontend/src/pages/MusicPage.tsx` — root page component
- **Music components:** `frontend/src/components/music/` — WorshipPlaylistsTab, SpotifyEmbed, SavedMixCard, MusicHint, LofiCrossReference, PersonalizationSection, ResumePrompt, RecentlyAddedSection, TimeOfDaySection, SharedMixHero
- **Audio components:** `frontend/src/components/audio/` — AmbientBrowser, SleepBrowse, SceneCard, FeaturedSceneCard, SoundCard, SoundGrid, ScriptureSessionCard, BedtimeStoryCard, TonightScripture, ScriptureCollectionRow, BedtimeStoriesGrid, SceneUndoToast, AmbientSearchBar, AmbientFilterBar
- **Data files:** `frontend/src/data/music/playlists.ts`, `frontend/src/data/scenes.ts`
- **Hooks:** `frontend/src/hooks/` — useSpotifyAutoPause, useMusicHints, useTimeOfDayRecommendations, useAmbientSearch
- **Shared components:** `frontend/src/components/HeadingDivider.tsx`, `frontend/src/components/PageHero.tsx`
- **Tests:** `frontend/src/pages/__tests__/MusicPage.test.tsx`, `frontend/src/components/audio/__tests__/SleepBrowse.test.tsx`, `frontend/src/components/audio/__tests__/AmbientBrowser.test.tsx`, etc.

### Current Color Architecture
| Component | Current Theme | Background | Text |
|-----------|--------------|------------|------|
| MusicPage wrapper | Light | `bg-neutral-bg` | `text-text-dark` |
| Ambient tab wrapper (in MusicPage) | **Dark** | `bg-hero-dark` | n/a |
| AmbientBrowser | **Dark** | transparent (inherits `bg-hero-dark`) | `text-white` |
| SleepBrowse | **Dark** | `bg-hero-dark` | `text-white` |
| SceneCard | **Dark** | img + gradient overlay | `text-white` |
| FeaturedSceneCard | **Dark** | img + gradient overlay | `text-white` |
| SoundCard | **Dark** | `bg-[rgba(15,10,30,0.3)]` | `text-white/50`, `text-white/70` |
| SoundGrid | **Dark** | transparent | `text-white` |
| ScriptureSessionCard | **Dark** | `bg-gradient-to-br from-hero-mid/50 to-primary/10` | `text-white` |
| BedtimeStoryCard | **Dark** | `bg-gradient-to-br from-hero-mid/50 to-primary/10` | `text-white` |
| TonightScripture | **Dark** | `bg-gradient-to-br from-hero-mid/50 to-primary/10` | `text-white` |
| SceneUndoToast | **Dark** | `bg-[rgba(15,10,30,0.9)]` | `text-white` |
| SavedMixCard | Light | `bg-white` | `text-text-dark` |
| WorshipPlaylistsTab | Light | transparent (inherits `bg-neutral-bg`) | `text-text-dark` |

### Key Patterns
- Tab bar: WAI-ARIA Tabs pattern with animated underline, keyboard navigation (Arrow keys, Home, End)
- Card pattern (light): `bg-white rounded-xl border border-gray-200 shadow-sm` (from meditation cards, saved mix cards)
- HeadingDivider: `import { HeadingDivider } from '@/components/HeadingDivider'` — decorative white SVG divider, uses `useElementWidth()`
- Tests: Vitest + RTL, mocked AudioProvider/auth/hooks, MemoryRouter + ToastProvider + AuthModalProvider wrappers

### Components That Stay Dark-Themed (DO NOT TOUCH)
AudioDrawer, AudioPill, DrawerNowPlaying, DrawerTabs, TimerTabContent, MixerTabContent, SavedTabContent, RoutinesPage

---

## Auth Gating Checklist

**No new auth gates.** This is a visual-only change. All existing auth gates remain unchanged.

| Action | Current Status | Notes |
|--------|---------------|-------|
| Sound toggle | Auth-gated (existing) | No change |
| Scene play | Auth-gated (existing) | No change |
| Favorites | Auth-gated (existing) | No change |
| Sleep content play | Auth-gated (existing) | No change |
| Saved mixes | Auth-gated (existing) | No change |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Light card | background | `bg-white` | design-system.md Card Pattern |
| Light card | border-radius | `rounded-xl` (12px) | design-system.md |
| Light card | border | `border border-gray-200` (1px solid #E5E7EB) | design-system.md |
| Light card | box-shadow | `shadow-sm` (0 1px 2px rgba(0,0,0,0.05)) | design-system.md |
| Neutral background | background | `bg-neutral-bg` (#F5F5F5) | design-system.md |
| Dark text heading | color | `text-text-dark` (#2C3E50) | design-system.md |
| Muted text | color | `text-text-light` (#7F8C8D) | design-system.md |
| Script heading | font-family | `font-script` (Caveat) | design-system.md |
| Primary accent | color | `text-primary` (#6D28D9) | design-system.md |
| Primary light | color | `text-primary-lt` (#8B5CF6) | design-system.md |
| Chip/pill | border-radius | `rounded-full` (9999px) | design-system.md |
| Duration pill | styling | `rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-light` | [UNVERIFIED] → derived from chip pattern |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for decorative/hero headings, NOT Lora
- HeadingDivider is white SVG — use it with `useElementWidth()` (import from `@/components/HeadingDivider`)
- All tabs share `max-w-6xl` content width (playlists, ambient, sleep)
- The `cn()` utility from `@/lib/utils` combines clsx + tailwind-merge — always use it for conditional classes
- Music page uses `bg-neutral-bg` (#F5F5F5) for the page wrapper and sticky tab bar
- Do NOT touch: AudioDrawer, AudioPill, DrawerNowPlaying, DrawerTabs, any overlay components
- Keep removed components in codebase — just stop rendering them

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px (default) | Single column playlists, 2-col scene grid, 3-col sound grid |
| Small/Tablet | >= 640px (`sm:`) | 2-col playlists grid, 3-col scene grid, 4-col sound grid |
| Large/Desktop | >= 1024px (`lg:`) | Same 2-col playlists, 4-col scene grid, 6-col sound grid |

No layout changes from current responsive behavior — only colors change.

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero → tab bar | 0px (sticky, follows hero) | MusicPage.tsx codebase |
| Tab bar → tab content | 0px (tab content starts immediately) | MusicPage.tsx codebase |
| Section → section within tabs | `space-y-8` (32px) | AmbientBrowser.tsx, SleepBrowse.tsx |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Feature branch `claude/feature/music-visual-polish` is checked out
- [ ] `pnpm install` has been run
- [ ] `pnpm build` succeeds on the current branch before changes
- [ ] All existing tests pass before changes (`pnpm test`)
- [ ] All auth-gated actions from the spec are accounted for (N/A — no new gates)
- [ ] Design system values are verified from design-system.md reference
- [ ] Scene card CSS patterns are [UNVERIFIED] — will need visual verification via Playwright

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| How to remove sections from MusicPage | Comment out JSX with `{/* Removed in visual polish */}` comment, keep imports | Spec says keep components in codebase |
| How to exclude Lofi playlist from data | Filter it out in WorshipPlaylistsTab, don't modify data file | Data file may be referenced elsewhere; safer to filter at consumption |
| How to add scene backgrounds | Add a `getSceneBackground(sceneId)` utility function in a new `scene-backgrounds.ts` file | Keeps CSS patterns centralized, reused by both SceneCard and FeaturedSceneCard |
| SoundCard dark bg on light page | Change from `bg-[rgba(15,10,30,0.3)]` to `bg-gray-100` | Light neutral background that matches the light theme |
| SoundCard active glow on light bg | Change purple glow shadow to work on light bg | Keep purple glow, adjust offset color |
| Search/filter components | Stop rendering in AmbientBrowser, keep recoloring them for future | Spec says recolor AND hide — do both in same step |
| Playlists data restructure | Filter at component level to separate hero from explore | Clean, no data file changes needed beyond lofi exclusion |
| Night mode tab default | Remove the conditional in MusicPage.tsx | Change `defaultTab` from conditional to always `'ambient'` |

---

## Implementation Steps

### Step 1: MusicPage Cleanup — Remove Sections & Night-Mode Override

**Objective:** Remove TimeOfDaySection, PersonalizationSection, RecentlyAddedSection, ResumePrompt rendering from MusicPage.tsx. Remove night-mode default tab override. Remove LofiCrossReference from ambient tab. Remove MusicHint rendering.

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx`

**Details:**

1. Change the `defaultTab` logic on line 44 from:
   ```ts
   const defaultTab: MusicTabId = timeBracket === 'night' ? 'sleep' : 'ambient'
   ```
   to:
   ```ts
   const defaultTab: MusicTabId = 'ambient'
   ```

2. Comment out (or remove JSX for) these rendered sections, keeping imports:
   - `<ResumePrompt />` (line 201)
   - `<PersonalizationSection />` (line 204)
   - `<RecentlyAddedSection />` (line 207)
   - `<TimeOfDaySection ... />` (lines 210-213)
   - `<MusicHint ... />` sound grid hint (lines 298-303)
   - `<LofiCrossReference ... />` section (lines 306-319)
   - Pill hint `<MusicHint>` at bottom (lines 343-351)

3. Remove the `handlePlayScene` callback and `scenePlayer` usage for time-of-day (lines 149-159) since TimeOfDaySection is no longer rendered. Keep `useScenePlayer` if it's used elsewhere in the file (it's used by AmbientBrowser indirectly — check).

4. Remove the `useMusicHints` hook call and related `useEffect`s (lines 121-139) since hints are no longer rendered.

5. Remove the `useTimeOfDayRecommendations` hook call (line 43) and `timeBracket` usage.

6. Change the ambient tab wrapper from dark to light background:
   ```tsx
   // Before:
   <div className="bg-hero-dark px-4 py-8 sm:px-6">
   // After:
   <div className="px-4 py-8 sm:px-6">
   ```
   (The page wrapper already has `bg-neutral-bg`, so removing `bg-hero-dark` lets it inherit.)

7. Clean up unused imports after removing rendered components. Keep the import statements for removed components but comment them out:
   ```ts
   // Removed in visual polish — keeping for potential re-enable
   // import { LofiCrossReference } from '@/components/music/LofiCrossReference'
   ```

**Guardrails (DO NOT):**
- DO NOT delete component files (LofiCrossReference, MusicHint, PersonalizationSection, etc.)
- DO NOT delete hook files (useMusicHints, useTimeOfDayRecommendations, useSpotifyAutoPause)
- DO NOT change the SharedMixHero rendering (it stays)
- DO NOT change the tab bar styling or ARIA attributes
- DO NOT touch the RoutineInterruptDialog at the bottom

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Default tab is always ambient | unit | Update `MusicPage.test.tsx` — verify ambient tab is selected by default regardless of `timeBracket` mock value |
| No time-of-day section rendered | unit | Verify no "Great for Focus" / "Suggested for You" text in rendered output |
| No lofi references | unit | Verify no element with text "Lofi" or "lofi" visible |

**Expected state after completion:**
- [ ] MusicPage renders without TimeOfDaySection, PersonalizationSection, RecentlyAddedSection, ResumePrompt, MusicHint, LofiCrossReference
- [ ] Default tab is always `ambient` regardless of time
- [ ] Ambient tab wrapper has no `bg-hero-dark` class
- [ ] Build succeeds
- [ ] Existing MusicPage tests pass (may need assertion updates)

---

### Step 2: Playlists Tab Restructure

**Objective:** Restructure WorshipPlaylistsTab: remove auto-pause toggle, rename headings to "Featured"/"Explore" with Caveat font + HeadingDivider, restructure layout (1 hero + 6 explore), remove follower count, exclude Lofi.

**Files to modify:**
- `frontend/src/components/music/WorshipPlaylistsTab.tsx`

**Details:**

1. Remove `useSpotifyAutoPause` import and usage (lines 2, 6-7). Remove all `spotifyDetected`, `manualPauseEnabled`, `handleManualPause` references and the manual pause toggle (lines 29-42) and all "Pause ambient sounds" buttons.

2. Add imports:
   ```ts
   import { HeadingDivider } from '@/components/HeadingDivider'
   import { useElementWidth } from '@/hooks/useElementWidth'
   ```

3. Restructure playlists:
   - **Featured**: Only the `hero` playlist (Top Christian Hits 2026).
   - **Explore**: All remaining playlists EXCEPT lofi. Combine from both arrays:
     - From WORSHIP_PLAYLISTS: `prominent` (Top Christian Songs 2025) + `standard` (Top Worship Hits 2026, Top Christian Pop 2026)
     - From EXPLORE_PLAYLISTS: All except `id.includes('lofi')` (Indie, Rap, Afrobeats)
     - Total: 6 playlists

4. Replace "Worship & Praise" heading with:
   ```tsx
   <div className="mb-8 text-center" ref={featuredRef}>
     <h2 className="font-script text-3xl font-bold text-text-dark sm:text-4xl">
       Featured
     </h2>
     <HeadingDivider width={featuredWidth} />
   </div>
   ```
   Use `const [featuredRef, featuredWidth] = useElementWidth()` for the divider.

5. Remove follower count `<p>` (line 52-54): `117,000+ followers`.

6. Remove the `prominent` embed section (lines 67-78).

7. Remove the existing standard embeds section (lines 81-96).

8. Replace "Explore" heading with same Caveat + HeadingDivider pattern:
   ```tsx
   <div className="mb-8 mt-12 text-center" ref={exploreRef}>
     <h2 className="font-script text-3xl font-bold text-text-dark sm:text-4xl">
       Explore
     </h2>
     <HeadingDivider width={exploreWidth} />
   </div>
   ```

9. Explore grid: 2-column grid with all 6 playlists at standard height (352px):
   ```tsx
   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
     {explorePlaylists.map((playlist) => (
       <div key={playlist.id}>
         <SpotifyEmbed playlist={playlist} />
       </div>
     ))}
   </div>
   ```

10. Remove the `lofiPlaylist` variable and `id="lofi-embed"` logic.

**Responsive behavior:**
- Mobile (< 640px): Hero embed full width. Explore grid single column.
- Tablet/Desktop (>= 640px): Hero embed centered at `lg:w-[70%]`. Explore grid 2-column.

**Guardrails (DO NOT):**
- DO NOT modify `playlists.ts` data file — filter at component level
- DO NOT delete `useSpotifyAutoPause` hook file
- DO NOT change SpotifyEmbed component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders "Featured" heading | unit | Check for heading with text "Featured" |
| Renders "Explore" heading | unit | Check for heading with text "Explore" |
| No "Worship & Praise" heading | unit | Verify old heading text is gone |
| No follower count | unit | Verify no "117,000+" text |
| No Lofi playlist | unit | Verify no "Lofi" text rendered |
| No pause toggle | unit | Verify no "Pause ambient" text |
| 6 Spotify embeds in Explore | unit | Count iframe embeds in explore section |

**Expected state after completion:**
- [ ] Featured section: Caveat heading + divider + 1 hero playlist
- [ ] Explore section: Caveat heading + divider + 6 playlists in 2-col grid
- [ ] No follower count, no Lofi, no pause toggle
- [ ] Build succeeds

---

### Step 3: Scene Card CSS Background Patterns

**Objective:** Create nature-themed CSS-only background patterns for each of the 8 ambient scenes. Add a utility function that maps scene IDs to `background-image` CSS.

**Files to create:**
- `frontend/src/data/scene-backgrounds.ts`

**Details:**

Create a map of scene IDs to CSS `style` objects (background-image + background-color). Each pattern uses layered CSS gradients at 10-20% opacity over a base gradient. All patterns are static (no animation).

```ts
export const SCENE_BACKGROUNDS: Record<string, React.CSSProperties> = {
  'garden-of-gethsemane': {
    backgroundColor: '#3d4a2c',
    backgroundImage: `
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,0.06) 0px,
        rgba(255,255,255,0.06) 2px,
        transparent 2px,
        transparent 12px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,0.04) 0px,
        rgba(255,255,255,0.04) 2px,
        transparent 2px,
        transparent 16px
      ),
      linear-gradient(135deg, #2d3a1c 0%, #4a5a32 50%, #3d4a2c 100%)
    `,
  },
  'still-waters': {
    backgroundColor: '#2a6b6b',
    backgroundImage: `
      repeating-radial-gradient(
        ellipse 200% 40% at 50% 60%,
        rgba(255,255,255,0.08) 0px,
        transparent 4px,
        transparent 20px,
        rgba(255,255,255,0.05) 22px,
        transparent 24px
      ),
      linear-gradient(180deg, #1a5a5a 0%, #2a7a7a 40%, #3a8a8a 100%)
    `,
  },
  'midnight-rain': {
    backgroundColor: '#1a2a3a',
    backgroundImage: `
      repeating-linear-gradient(
        180deg,
        rgba(180,200,220,0.08) 0px,
        rgba(180,200,220,0.08) 1px,
        transparent 1px,
        transparent 8px
      ),
      repeating-linear-gradient(
        175deg,
        rgba(180,200,220,0.05) 0px,
        rgba(180,200,220,0.05) 1px,
        transparent 1px,
        transparent 12px
      ),
      linear-gradient(180deg, #0f1f2f 0%, #1a2a3a 50%, #253545 100%)
    `,
  },
  'ember-and-stone': {
    backgroundColor: '#8a4a1a',
    backgroundImage: `
      radial-gradient(circle 2px at 20% 30%, rgba(255,200,100,0.2) 0%, transparent 100%),
      radial-gradient(circle 3px at 60% 20%, rgba(255,180,80,0.15) 0%, transparent 100%),
      radial-gradient(circle 2px at 80% 60%, rgba(255,220,120,0.18) 0%, transparent 100%),
      radial-gradient(circle 2px at 40% 80%, rgba(255,190,90,0.12) 0%, transparent 100%),
      radial-gradient(circle 3px at 10% 70%, rgba(255,200,100,0.16) 0%, transparent 100%),
      radial-gradient(circle 2px at 90% 40%, rgba(255,210,110,0.14) 0%, transparent 100%),
      linear-gradient(135deg, #7a3a0a 0%, #9a5a2a 50%, #8a4a1a 100%)
    `,
  },
  'morning-mist': {
    backgroundColor: '#7a8a5a',
    backgroundImage: `
      radial-gradient(ellipse 60% 60% at 20% 40%, rgba(255,255,255,0.12) 0%, transparent 70%),
      radial-gradient(ellipse 80% 50% at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 50% 70% at 50% 70%, rgba(255,255,255,0.1) 0%, transparent 70%),
      linear-gradient(135deg, #6a7a4a 0%, #8a9a6a 40%, #9aa87a 100%)
    `,
  },
  'the-upper-room': {
    backgroundColor: '#6a4a2a',
    backgroundImage: `
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 30px,
        rgba(255,220,160,0.06) 30px,
        rgba(255,220,160,0.06) 32px,
        transparent 32px,
        transparent 60px
      ),
      repeating-radial-gradient(
        ellipse 30% 50% at 50% 100%,
        rgba(255,220,160,0.08) 0px,
        transparent 20px,
        transparent 40px
      ),
      linear-gradient(180deg, #5a3a1a 0%, #7a5a3a 50%, #6a4a2a 100%)
    `,
  },
  'starfield': {
    backgroundColor: '#1a1040',
    backgroundImage: `
      radial-gradient(circle 1px at 15% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(circle 1px at 45% 10%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 2px at 75% 35%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(circle 1px at 25% 55%, rgba(255,255,255,0.25) 0%, transparent 100%),
      radial-gradient(circle 1px at 85% 65%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 2px at 55% 80%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(circle 1px at 35% 90%, rgba(255,255,255,0.2) 0%, transparent 100%),
      radial-gradient(circle 1px at 65% 50%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(circle 1px at 5% 75%, rgba(255,255,255,0.25) 0%, transparent 100%),
      radial-gradient(circle 1px at 95% 15%, rgba(255,255,255,0.3) 0%, transparent 100%),
      linear-gradient(135deg, #0f0830 0%, #1a1050 50%, #251570 100%)
    `,
  },
  'mountain-refuge': {
    backgroundColor: '#6a5a3a',
    backgroundImage: `
      linear-gradient(
        165deg,
        transparent 40%,
        rgba(80,60,30,0.15) 40%,
        rgba(80,60,30,0.15) 42%,
        transparent 42%
      ),
      linear-gradient(
        195deg,
        transparent 50%,
        rgba(60,45,20,0.12) 50%,
        rgba(60,45,20,0.12) 53%,
        transparent 53%
      ),
      linear-gradient(
        175deg,
        transparent 35%,
        rgba(90,70,40,0.1) 35%,
        rgba(90,70,40,0.1) 38%,
        transparent 38%
      ),
      linear-gradient(135deg, #5a4a2a 0%, #7a6a4a 40%, #8a7a5a 100%)
    `,
  },
}

export function getSceneBackground(sceneId: string): React.CSSProperties | undefined {
  return SCENE_BACKGROUNDS[sceneId]
}
```

[UNVERIFIED] All 8 scene background patterns
→ To verify: Run `/verify-with-playwright` at `/music?tab=ambient` and visually inspect scene cards
→ If wrong: Adjust gradient colors, pattern density, or opacity values

**Guardrails (DO NOT):**
- DO NOT use image files — CSS-only patterns
- DO NOT add animations — all patterns must be static
- DO NOT modify scenes.ts data file

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| getSceneBackground returns style for each scene ID | unit | Test all 8 scene IDs return non-undefined objects |
| getSceneBackground returns undefined for unknown ID | unit | Test an unknown ID returns undefined |
| Each background has backgroundImage property | unit | Verify all 8 entries have backgroundImage string |

**Expected state after completion:**
- [ ] New file `scene-backgrounds.ts` exists with 8 scene patterns
- [ ] `getSceneBackground()` utility exported
- [ ] Build succeeds

---

### Step 4: Ambient Tab — Light Theme Recolor

**Objective:** Recolor all ambient components from white-on-dark to dark-on-light. Apply scene card CSS backgrounds. Hide search/filter. Wrap "Build Your Own Mix" in card container.

**Files to modify:**
- `frontend/src/components/audio/AmbientBrowser.tsx`
- `frontend/src/components/audio/SceneCard.tsx`
- `frontend/src/components/audio/FeaturedSceneCard.tsx`
- `frontend/src/components/audio/SoundCard.tsx`
- `frontend/src/components/audio/SoundGrid.tsx`
- `frontend/src/components/audio/SceneUndoToast.tsx`
- `frontend/src/components/audio/AmbientSearchBar.tsx`
- `frontend/src/components/audio/AmbientFilterBar.tsx`

**Details:**

#### AmbientBrowser.tsx
1. Remove `<AmbientSearchBar>` and `<AmbientFilterBar>` rendering (comment out JSX, keep imports).
2. Change "Your Saved Mixes" heading: `text-white` → `text-text-dark`
3. Change "All Scenes" heading: `text-white` → `text-text-dark`
4. Change "Build Your Own Mix" heading: `text-white` → `text-text-dark`
5. Wrap the "Build Your Own Mix" section in a card container:
   ```tsx
   <section aria-label="Build your own mix">
     <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
       <h2 className="mb-4 text-base font-medium text-text-dark">Build Your Own Mix</h2>
       <SoundGrid ... />
     </div>
   </section>
   ```
6. Change search results text colors: `text-white/50` → `text-text-light`, `text-white` → `text-text-dark` in SearchResults component.
7. Change search result item: `bg-[rgba(15,10,30,0.3)]` → `bg-gray-50`, `hover:bg-[rgba(15,10,30,0.5)]` → `hover:bg-gray-100`.

#### SceneCard.tsx
1. Import `getSceneBackground` from `@/data/scene-backgrounds`.
2. Replace the `<img>` + gradient overlay with the CSS background pattern:
   ```tsx
   const bgStyle = getSceneBackground(scene.id)
   ```
   Apply `style={bgStyle}` to the button element. Keep the gradient overlay div but adjust: `from-black/60` → `from-black/50` (slightly lighter since base patterns are already dark).
   Remove the `<img>` tag (scene artwork replaced by CSS patterns).
3. Tag chips: `bg-white/10 text-white/60` stays (these overlay the dark CSS pattern).

#### FeaturedSceneCard.tsx
1. Import `getSceneBackground`.
2. Same pattern as SceneCard: apply `style={bgStyle}`, remove `<img>` tag, keep gradient overlay.
3. Text stays white (overlays dark CSS pattern).

#### SoundCard.tsx
1. Change background: `bg-[rgba(15,10,30,0.3)]` → `bg-gray-100`
2. Change focus ring offset: `focus-visible:ring-offset-[rgba(15,10,30,0.3)]` → `focus-visible:ring-offset-gray-100`
3. Change icon colors: `text-white` (active) → `text-primary` (active), `text-white/50` (inactive) → `text-text-light` (inactive)
4. Change loading spinner: `text-white/70` → `text-text-light`
5. Change sound name: `text-white/70` → `text-text-dark`
6. Active glow shadow stays purple but adjust: `shadow-[0_0_12px_rgba(147,51,234,0.4)]` — this works on light bg too

#### SoundGrid.tsx
1. Category heading: `text-white` → `text-text-dark`

#### SceneUndoToast.tsx
1. Change toast card: `border-primary/30 bg-[rgba(15,10,30,0.9)] backdrop-blur-sm` → `border-gray-200 bg-white shadow-lg`
2. Change text: `text-white` → `text-text-dark`
3. Change undo button: `text-primary-lt hover:text-white` → `text-primary hover:text-primary-lt`

#### AmbientSearchBar.tsx (recolor for future re-enable, currently hidden)
1. Search icon: `text-white/50` → `text-text-light`
2. Input: `border-white/20 bg-[rgba(15,10,30,0.3)] text-white placeholder:text-white/50` → `border-gray-300 bg-white text-text-dark placeholder:text-text-light`
3. Focus: `focus:border-primary/50` stays
4. Clear button: `text-white/50 hover:text-white` → `text-text-light hover:text-text-dark`

#### AmbientFilterBar.tsx (recolor for future re-enable, currently hidden)
1. Inactive chips: `border-white/30 bg-transparent text-white/85` → `border-gray-300 bg-white text-text-dark`
2. Active chips: `border-primary bg-primary text-white` stays (purple on light works fine)
3. Filter panel: `border-white/15 bg-[rgba(15,10,30,0.5)]` → `border-gray-200 bg-white`
4. Dimension labels: `text-white/50` → `text-text-light`
5. Filter buttons inactive: `border-white/30 bg-transparent text-white/85` → `border-gray-300 bg-white text-text-dark`

**Responsive behavior:**
- No layout changes — only color changes
- Scene cards maintain same grid: 2-col mobile, 3-col sm, 4-col lg
- Sound grid: 3-col mobile, 4-col sm, 6-col lg

**Guardrails (DO NOT):**
- DO NOT change SoundGrid keyboard navigation logic
- DO NOT change AmbientBrowser data flow or hook usage
- DO NOT modify SavedMixCard (already light-themed)
- DO NOT touch any drawer/pill components
- DO NOT change FavoriteButton styling (it handles its own theme)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AmbientBrowser renders without search bar | integration | Verify no search input rendered |
| AmbientBrowser renders without filter bar | integration | Verify no filter chips rendered |
| SceneCard renders with background-image style | unit | Verify button has style attribute with backgroundImage |
| SoundCard active state has purple glow | unit | Verify active card has shadow class |
| SoundGrid headings use dark text | unit | Verify category headings have text-text-dark class |

**Expected state after completion:**
- [ ] Ambient tab has light background (inherits `bg-neutral-bg` from page)
- [ ] All text is dark on light backgrounds
- [ ] Scene cards show CSS pattern backgrounds
- [ ] Sound cards have light gray backgrounds with dark icons/text
- [ ] No search bar or filter chips visible
- [ ] "Build Your Own Mix" wrapped in white card
- [ ] SceneUndoToast is light-themed
- [ ] Build succeeds

---

### Step 5: Sleep Tab — Light Theme Recolor + Bug Fixes

**Objective:** Recolor all sleep components from white-on-dark to dark-on-light. Fix duration badge overflow (circle → pill). Fix squished play buttons.

**Files to modify:**
- `frontend/src/components/audio/SleepBrowse.tsx`
- `frontend/src/components/audio/TonightScripture.tsx`
- `frontend/src/components/audio/ScriptureSessionCard.tsx`
- `frontend/src/components/audio/BedtimeStoryCard.tsx`
- `frontend/src/components/audio/ScriptureCollectionRow.tsx`
- `frontend/src/components/audio/BedtimeStoriesGrid.tsx`

**Details:**

#### SleepBrowse.tsx
1. Change root: `bg-hero-dark` → remove (inherits `bg-neutral-bg` from page wrapper). Remove `min-h-screen`.
   ```tsx
   // Before:
   <div className="min-h-screen bg-hero-dark px-4 py-8 sm:px-6">
   // After:
   <div className="px-4 py-8 sm:px-6">
   ```
2. Change "Build a Bedtime Routine" CTA card:
   ```tsx
   // Before:
   <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
     <h3 className="mb-2 text-base font-semibold text-white">
     <p className="mb-4 text-sm text-white/60">
   // After:
   <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
     <h3 className="mb-2 text-base font-semibold text-text-dark">
     <p className="mb-4 text-sm text-text-light">
   ```
   Routine link button stays: `border-primary text-primary hover:bg-primary/10` (works on light bg).

#### TonightScripture.tsx
1. Label: `text-primary-lt` → `text-primary` (primary works better on light bg)
2. Card: `border-primary/60 bg-gradient-to-br from-hero-mid/50 to-primary/10` → `border-primary/40 bg-white shadow-sm`
3. Title: `text-white` → `text-text-dark`
4. Reference: `text-white/60` → `text-text-light`
5. Duration badge: `bg-white/10 text-white/70` → `bg-gray-100 text-text-light`
6. Voice text: `text-white/50` → `text-text-light`
7. Play button stays: `bg-primary text-white hover:bg-primary-lt` (works on any bg)

#### ScriptureSessionCard.tsx
1. Card button: `border-white/10 bg-gradient-to-br from-hero-mid/50 to-primary/10 hover:border-white/20` → `border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md`
2. Title: `text-white` → `text-text-dark`
3. Reference: `text-white/60` → `text-text-light`
4. Duration badge: `bg-white/10 text-white/70` → `bg-gray-100 text-text-light` + ensure pill shape: `rounded-full px-2 py-0.5 text-xs`
5. Voice label: `text-white/50` → `text-text-light`
6. Scripture tag: `bg-primary/20 text-primary-lt` → `bg-primary/10 text-primary` (slightly adjusted for light bg)
7. **Fix play button squish**: Change from `<span>` to proper button/div with `flex-shrink-0`:
   ```tsx
   <span
     className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white"
     aria-hidden="true"
   >
     <Play size={14} fill="currentColor" />
   </span>
   ```
   Add `flex-shrink-0` to prevent compression.

#### BedtimeStoryCard.tsx
1. Card button: same changes as ScriptureSessionCard (border, bg, hover)
2. Title: `text-white` → `text-text-dark`
3. Description: `text-white/60` → `text-text-light`
4. Duration badge: same changes (bg-gray-100, pill shape)
5. Length label: `text-white/60` → `text-text-light`
6. Voice label: `text-white/50` → `text-text-light`
7. Story tag: `bg-indigo-500/20 text-indigo-300` → `bg-indigo-100 text-indigo-700` (light-friendly indigo)
8. **Fix play button squish**: Add `flex-shrink-0` to play button span. Change `bg-primary/80` → `bg-primary`.

#### ScriptureCollectionRow.tsx
1. Heading: `text-white` → `text-text-dark`

#### BedtimeStoriesGrid.tsx
1. Heading: `text-white` → `text-text-dark`

**Responsive behavior:**
- No layout changes — only colors change
- Duration pills naturally fit text at all breakpoints (pill shape vs circle)
- Play buttons maintain 32x32px (h-8 w-8) at all breakpoints

**Guardrails (DO NOT):**
- DO NOT change the ContentSwitchDialog or RoutineInterruptDialog styling (overlay components)
- DO NOT change the FavoriteButton (self-contained)
- DO NOT change the audio playback logic
- DO NOT change scripture/story data files

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| SleepBrowse renders without dark bg | unit | Verify no `bg-hero-dark` class in rendered output |
| ScriptureSessionCard has light card styling | unit | Verify card has `bg-white` and `border-gray-200` |
| BedtimeStoryCard has light card styling | unit | Verify card has `bg-white` and `border-gray-200` |
| Play button has flex-shrink-0 | unit | Verify play button span has `flex-shrink-0` |
| Duration badge is pill-shaped | unit | Verify badge has `rounded-full` and `px-2` |
| Section headings use dark text | unit | Update SleepBrowse tests for dark heading text |

**Expected state after completion:**
- [ ] Sleep tab has light background
- [ ] All cards are white with gray borders and shadows
- [ ] All text is dark on light backgrounds
- [ ] Duration badges are pill-shaped and text fits
- [ ] Play buttons are circular and not squished
- [ ] Routine CTA card matches light card pattern
- [ ] Build succeeds

---

### Step 6: Test Updates & Final Verification

**Objective:** Update all existing tests for changed classes/text. Run full test suite. Verify build.

**Files to modify:**
- `frontend/src/pages/__tests__/MusicPage.test.tsx`
- `frontend/src/components/audio/__tests__/AmbientBrowser.test.tsx`
- `frontend/src/components/audio/__tests__/AmbientBrowser.integration.test.tsx`
- `frontend/src/components/audio/__tests__/SleepBrowse.test.tsx`
- `frontend/src/components/audio/__tests__/AmbientSearchBar.test.tsx`
- `frontend/src/components/audio/__tests__/AmbientFilterBar.test.tsx`
- Any other test files that reference changed text content or class names

**Details:**

1. **MusicPage.test.tsx**:
   - Remove/update the `useTimeOfDayRecommendations` mock if the hook import was removed
   - Remove/update `useMusicHints` mock if the hook import was removed
   - Update the "defaults to ambient tab" test to ensure it always passes (no night-mode override)
   - Remove the "personalization section not rendered when logged out" test if the section is completely removed from rendering

2. **AmbientBrowser tests**:
   - Update any assertions that check for search bar or filter bar presence (these are now hidden)
   - Update text color assertions if any exist

3. **SleepBrowse tests**:
   - Update assertions for changed text/class values (e.g., heading text colors)
   - The test on line 131 checking "Build a Bedtime Routine" text should still pass
   - The test for routine CTA link should still pass

4. Run full test suite: `pnpm test`
5. Run build: `pnpm build`
6. Run lint: `pnpm lint`

**Guardrails (DO NOT):**
- DO NOT skip failing tests — fix them
- DO NOT add `@ts-ignore` or `eslint-disable` comments
- DO NOT modify test infrastructure (providers, mocking patterns)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | all | `pnpm test` — all tests pass |
| Build | build | `pnpm build` — no errors |
| Lint | lint | `pnpm lint` — no errors |

**Expected state after completion:**
- [ ] All existing tests pass with updated assertions
- [ ] Build succeeds with no errors
- [ ] Lint passes with no errors
- [ ] No TypeScript errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | MusicPage cleanup — remove sections, night-mode override, dark bg |
| 2 | — | Playlists tab restructure (independent of Step 1) |
| 3 | — | Scene card CSS backgrounds (new data file, independent) |
| 4 | 1, 3 | Ambient tab light theme recolor (needs dark bg removed + scene backgrounds) |
| 5 | 1 | Sleep tab light theme recolor (needs dark bg context from Step 1) |
| 6 | 1, 2, 3, 4, 5 | Test updates & final verification (all changes complete) |

**Parallelizable:** Steps 1, 2, and 3 can be done in parallel. Steps 4 and 5 can be done in parallel after Step 1 completes (Step 4 also needs Step 3).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | MusicPage cleanup | [COMPLETE] | 2026-03-12 | Modified MusicPage.tsx — removed 7 rendered sections, night-mode override, hints, dark bg wrapper. Commented out 8 imports. Updated MusicPage.test.tsx — removed 2 stale mocks, added 3 new tests (19 total). |
| 2 | Playlists tab restructure | [COMPLETE] | 2026-03-12 | Rewrote WorshipPlaylistsTab.tsx — Featured/Explore with Caveat headings + HeadingDivider, 1 hero + 6 explore, removed auto-pause toggle, follower count, lofi. Rewrote tests (8 tests). |
| 3 | Scene card CSS backgrounds | [COMPLETE] | 2026-03-12 | Created scene-backgrounds.ts with 8 CSS gradient patterns + getSceneBackground(). Created scene-backgrounds.test.ts (5 tests). |
| 4 | Ambient tab light theme recolor | [COMPLETE] | 2026-03-12 | Recolored AmbientBrowser, SceneCard, FeaturedSceneCard, SoundCard, SoundGrid, SceneUndoToast, AmbientSearchBar, AmbientFilterBar. Hidden search/filter. Added CSS backgrounds to scene cards. Wrapped Build Your Own Mix in card. 65 existing tests pass. |
| 5 | Sleep tab light theme recolor + bug fixes | [COMPLETE] | 2026-03-12 | Recolored SleepBrowse, TonightScripture, ScriptureSessionCard, BedtimeStoryCard, ScriptureCollectionRow, BedtimeStoriesGrid. Fixed play button squish (flex-shrink-0). Light card styling throughout. 25 existing tests pass. |
| 6 | Test updates & final verification | [COMPLETE] | 2026-03-12 | 973 tests pass (121 files). Build clean. 4 pre-existing lint errors (none introduced). No TS errors. |
