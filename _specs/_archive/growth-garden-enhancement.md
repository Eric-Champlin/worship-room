# Feature: Growth Garden Enhancement

**Master Plan Reference:** N/A -- standalone feature

---

## Overview

The Growth Garden is the visual heart of the dashboard -- a 765-line animated SVG that grows through 6 stages as the user's faith level increases. It currently responds to faith level (Seedling through Lighthouse) and streak status (sun vs. clouds). This spec enhances it into a living, personal, shareable centerpiece by adding four new dimensions: seasonal appearance tied to the liturgical calendar, activity-diversity elements that reflect how the user engages with the app, time-of-day sky lighting, and the ability to share the garden as a beautiful canvas image.

The competitive comparison is direct: Glorify has a tree that users water by completing devotionals. Users love it but complain that "only completing the daily devotion counts" and that seeing their tree droop makes them sad. Worship Room's garden already responds to multiple activity types and has grace-based streak repair. Enhancing it with seasons, diversity, and shareability makes it genuinely unmatched.

## User Story

As a **logged-in user**, I want my Growth Garden to reflect the liturgical season, the activities I do, and the time of day so that it feels like a living, personal space -- and I want to share it as a beautiful image with friends.

## Requirements

### 1. Seasonal Variations (Liturgical Calendar)

The garden's environment subtly shifts based on the current liturgical season, connecting it to the church calendar.

**Environmental overlays by season:**

| Season | Environmental Change | Visual Approach |
|--------|---------------------|-----------------|
| Advent | Light snowfall, cooler blue-purple sky tint, small Star of Bethlehem above the garden | CSS-animated snow particles (small circles falling slowly), sky gradient shift to cooler tones, star SVG element |
| Christmas | Snow on ground (thin white layer), brighter star, warm golden glow from below | Ground snow overlay path, star brightness increase, warm gradient on lower sky |
| Lent | Muted/desaturated palette, bare branches on deciduous elements (if stage has trees), subtle ash-gray ground tint | CSS filter `saturate(0.7)` on foliage group, optional bare branch variant paths |
| Holy Week | Same as Lent but darker sky, a subtle cross silhouette on the horizon (very small, distant) | Sky gradient darkened, small cross path element at the horizon line |
| Easter | Bright, vibrant colors, flowers blooming everywhere (extra flower SVG elements regardless of stage), warm golden sunrise sky | Additional flower paths, sky gradient to warm gold/pink, increased saturation |
| Pentecost | Warm orange-red accent tones, subtle flame-like flickering on light source elements | CSS color filter with warm shift, subtle flame animation on sun rays |
| Ordinary Time | Default appearance (no seasonal overlay) | No changes |

**Key implementation notes:**
- Driven by the existing `useLiturgicalSeason()` hook
- Prefer CSS-based changes (filters, gradient shifts, opacity overlays) over complex new SVG paths to keep the SVG manageable
- Snow and flowers: separate SVG `<g>` overlay group, conditionally rendered by season
- Snow particles: CSS-animated small circles (reuse confetti animation pattern, white/light-blue, slower, smaller)
- Easter flowers: 4-6 small flower SVG paths at the garden base, 500ms staggered fade-in
- Season transitions: no animated transition; garden renders with new seasonal appearance on next visit. 1-second fade on the seasonal overlay group is sufficient.

### 2. Activity-Diversity Elements

Small decorative SVG elements appear in the garden based on the user's activity patterns, making each garden feel uniquely personal.

| Activity Pattern | Element | Trigger | Visual Description |
|-----------------|---------|---------|-------------------|
| Journaling (10+ entries) | Writing desk | `wr_daily_activities` journal count >= 10 | Small wooden desk with open book, placed at one side of the garden |
| Meditation (10+ sessions) | Meditation cushion | `wr_meditation_history` length >= 10 | Small round cushion on the ground, near flowers |
| Prayer Wall (10+ posts) | Prayer candle | Prayer Wall activity count >= 10 | Lit candle with soft glow, near the base of the main plant/tree |
| Bible reading (10+ chapters) | Open Bible | `wr_bible_progress` total chapters >= 10 | Small open book on a rock or stand |
| Music/ambient (10+ sessions) | Wind chime | `wr_listening_history` length >= 10 | Hanging wind chime from a branch (only at Blooming+ stages) |

**Key behavior:**
- Each element is a small SVG `<g>` group (20-40 lines each -- simple, iconic shapes)
- Elements fade in (500ms) when their threshold is first crossed on a dashboard visit
- Once unlocked, elements persist permanently (they never disappear)
- Elements are positioned in designated non-overlapping areas of the garden
- At early stages (Seedling, Sprout): max 2-3 visible elements. At later stages (Oak, Lighthouse): all 5 can be visible
- Read from existing localStorage data -- no new keys needed
- Thresholds checked on garden mount, cached in component state (one check per render)

### 3. Time-of-Day Lighting

The garden's sky subtly reflects the actual time of day, making it feel alive and connected to the user's real world.

| Time Range | Sky Treatment | Visual Description |
|------------|--------------|-------------------|
| 5:00 AM - 8:00 AM | Dawn | Warm pink/orange gradient at the horizon, soft light from the right |
| 8:00 AM - 5:00 PM | Day | Default bright sky (current appearance), sun prominent |
| 5:00 PM - 8:00 PM | Golden Hour | Warm amber/golden tint on the sky, sun lower and warmer |
| 8:00 PM - 10:00 PM | Dusk | Purple/navy gradient, 2-3 small star dots appearing |
| 10:00 PM - 5:00 AM | Night | Deep navy sky, crescent moon instead of sun, 5-8 stars, 2-4 firefly dots near ground |

**Key behavior:**
- Sky determined by `new Date().getHours()` on component mount only (no interval timer)
- Stars: small white/pale-yellow circles with low opacity (0.3-0.6), subtle twinkle animation (CSS opacity oscillation, 3-4 seconds)
- Moon: simple crescent SVG path replacing the sun conditionally
- Fireflies: 2-4 small circles with a glow-pulse animation variant (green-gold, very dim, slow)
- Lighting is a subtle tint shift, never so dark that garden details are lost
- Garden growth stage content must always be clearly visible regardless of time

### 4. Shareable Canvas Image

Users can share their garden as a beautiful 1080x1080 canvas image.

**Share button:**
- Small share icon in the top-right corner of the GrowthGarden dashboard card
- Lucide `Share2` icon, subtle styling (`text-white/40 hover:text-white/60`)
- On click: generates a canvas image and opens the share flow

**Canvas layout:**
```
+--------------------------------------+
|                                      |
|        [Garden SVG rendered]         |
|           (upper 70%)               |
|                                      |
|   -----------------------------------+
|                                      |
|   {Name}'s Garden                    |
|   Flourishing - Level 4             |
|   14-day streak                      |
|                                      |
|              Worship Room            |
|                                      |
+--------------------------------------+
```

**Canvas rendering approach:**
1. Serialize the garden SVG to a string via `XMLSerializer`
2. Create a Blob URL from the SVG string
3. Draw the SVG Blob onto a canvas via `Image` -> `canvas.drawImage()`
4. Add text overlays: user name, faith level, streak count, "Worship Room" watermark

**Key considerations:**
- External CSS animations won't render on canvas -- static snapshot is fine, the garden is still beautiful
- Inline styles and `<defs>` gradients WILL render -- verify critical colors use inline fill/stroke attributes
- If SVG uses Tailwind classes for colors, those won't render on canvas -- verify garden SVG uses inline attributes
- If SVG-to-canvas proves unreliable, fallback: error toast, NOT a crash. Do NOT add `html2canvas` as a dependency without confirming SVG approach fails first
- Canvas size: 1080x1080 (square). Story size (1080x1350) if straightforward
- Follow the existing pattern in `verse-card-canvas.ts` and `challenge-share-canvas.ts`
- Share flow via existing `SharePanel` component (copy, download, Web Share API)

### 5. localStorage Keys

No new keys required. All data is read from existing keys: `wr_daily_activities`, `wr_meditation_history`, `wr_bible_progress`, `wr_listening_history`, `wr_streak`, `wr_faith_points`.

### 6. Performance

The garden grows from ~765 to ~900-915 lines of SVG (estimated ~100-150 additional lines).

**Mitigations:**
- Seasonal overlays: CSS filters/classes where possible instead of new SVG paths
- Activity elements: each under 40 lines of SVG -- simple, iconic shapes
- Time-of-day: gradient changes only, minimal new elements (stars are small circles, moon is one path)
- Extract seasonal and activity element groups into memoized sub-components to prevent unnecessary re-renders
- No lazy-loading required for this spec (future optimization)

## Auth Gating

The Growth Garden is part of the dashboard, which is entirely auth-gated. No logged-out user can see or interact with it.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View garden | N/A -- dashboard is not rendered; user sees landing page | Garden renders with all enhancements (seasonal, activity, time-of-day) | N/A |
| Share garden | N/A -- not visible | Click share icon to generate canvas image and open SharePanel | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Garden renders at full card width. Share button visible as a 44px tappable icon in the top-right corner. Activity elements scale down proportionally. All overlays render at mobile scale. |
| Tablet (640-1024px) | Garden renders within the dashboard card grid. Same layout as desktop but within the 2-column widget grid constraints. |
| Desktop (> 1024px) | Garden renders in the dashboard widget grid (60%/40% layout). All seasonal overlays, activity elements, time-of-day lighting, and share button visible. |

The garden SVG already uses `viewBox` for proportional scaling -- no breakpoint-specific SVG changes needed. The share button must meet the 44px minimum touch target on mobile.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Cannot see the garden (dashboard is auth-gated). Zero interaction.
- **Logged-in users:** Garden reads existing localStorage data (`wr_faith_points`, `wr_streak`, `wr_daily_activities`, `wr_meditation_history`, `wr_bible_progress`, `wr_listening_history`). No new data is written.
- **localStorage usage:** Reads only -- no new keys introduced.

## Completion & Navigation

N/A -- standalone dashboard widget enhancement. No completion tracking, no CTAs, no cross-tab integration.

## Design Notes

- **Dashboard card pattern:** Garden card uses the existing frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- **Share button:** Lucide `Share2`, styled as `text-white/40 hover:text-white/60` per the text opacity standards for decorative/interactive elements
- **Canvas image:** Background gradient should match `bg-hero-dark` (#0D0620) to `bg-hero-mid` (#1E0B3E), consistent with the dashboard dark theme
- **Text on canvas:** Inter font for user name/stats, matching the app's body font
- **Seasonal colors:** Advent uses cooler blue-purple tones (toward #1E0B3E), Easter uses warm gold/pink (toward #D97706/#F39C12 amber range), Lent uses muted desaturated tones
- **Existing components to reuse:** `SharePanel` for the share flow, `useLiturgicalSeason()` for seasonal detection, `useFaithPoints()` for level/streak data, `useSoundEffects()` for share confirmation chime
- **Design system recon:** Reference `_plans/recon/design-system.md` for exact gradient values and card patterns
- **New visual patterns:** The seasonal SVG overlays (snow particles, Easter flowers, night sky with moon/stars/fireflies) are new visual patterns not yet captured in the design system recon. During planning, derived CSS values for these should be marked `[UNVERIFIED]`.

## Out of Scope

- Interactive garden elements (tapping elements for info or animation)
- Garden history (showing past garden states or a timelapse)
- Friend garden comparison (seeing a friend's garden alongside yours)
- Garden achievements/badges (unlocking garden-specific rewards)
- Custom garden themes or color palettes
- 3D or perspective effects
- The `html2canvas` library (only use if SVG-to-canvas approach fails)
- Weather based on actual user location
- Garden sound effects (rustling leaves, birds) -- the ambient sound system handles atmosphere separately
- Backend/API work (Phase 3+)

## Acceptance Criteria

### Seasonal Variations
- [ ] Garden shows seasonal appearance during Advent (cooler blue-purple tones, CSS-animated snowfall particles, Star of Bethlehem SVG element)
- [ ] Garden shows seasonal appearance during Christmas (snow on ground, brighter star, warm golden glow)
- [ ] Garden shows seasonal appearance during Lent (muted palette via `saturate(0.7)` filter, bare branch variants where applicable)
- [ ] Garden shows seasonal appearance during Holy Week (darker sky gradient, subtle cross silhouette on horizon)
- [ ] Garden shows seasonal appearance during Easter (vibrant colors, 4-6 extra flower SVG elements at base, warm gold/pink sky gradient)
- [ ] Garden shows seasonal appearance during Pentecost (warm orange-red accent tones, subtle flame animation on light sources)
- [ ] Garden shows default appearance during Ordinary Time (no seasonal overlay)
- [ ] Seasonal changes are driven by `useLiturgicalSeason()` hook
- [ ] Seasonal overlay group has a 1-second CSS fade transition

### Activity Elements
- [ ] Writing desk element appears when journal entries >= 10
- [ ] Meditation cushion element appears when meditation sessions >= 10
- [ ] Prayer candle element appears when prayer wall activity >= 10
- [ ] Open Bible element appears when Bible chapters read >= 10
- [ ] Wind chime element appears when listening sessions >= 10 (only visible at Blooming stage and above)
- [ ] Elements fade in with 500ms animation when first unlocked
- [ ] Elements persist once unlocked (do not disappear if user stops that activity)
- [ ] Elements do not overlap each other or the main garden illustration
- [ ] At early stages (Seedling, Sprout), maximum 2-3 activity elements visible

### Time-of-Day Lighting
- [ ] Sky gradient reflects Dawn (5-8 AM): warm pink/orange gradient at horizon
- [ ] Sky gradient reflects Day (8 AM-5 PM): default bright sky, sun prominent
- [ ] Sky gradient reflects Golden Hour (5-8 PM): warm amber/golden tint
- [ ] Sky gradient reflects Dusk (8-10 PM): purple/navy gradient with 2-3 small star dots
- [ ] Sky gradient reflects Night (10 PM-5 AM): deep navy sky, crescent moon, 5-8 stars, 2-4 firefly dots
- [ ] Garden growth stage details remain clearly visible at all times of day (never too dark)
- [ ] Time check happens on component mount only (no interval timer or real-time updates)

### Shareable Garden
- [ ] Share icon button (Lucide `Share2`) appears in the top-right corner of the garden dashboard card
- [ ] Share button meets 44px minimum touch target on mobile
- [ ] Clicking share generates a canvas image of the garden at 1080x1080 minimum
- [ ] Canvas image includes: garden SVG snapshot, user name, faith level name, streak count, "Worship Room" watermark
- [ ] Share flow opens via existing `SharePanel` component (copy, download, Web Share API)
- [ ] If SVG-to-canvas rendering fails, user sees an error toast (not a crash or blank screen)

### General
- [ ] All existing garden functionality preserved (6 growth stages, sun/clouds based on streak, sparkle effect on level-up, ambient swaying animations, butterfly elements at higher levels)
- [ ] Garden renders correctly at all 6 growth stages with seasonal + activity + time-of-day overlays active simultaneously
- [ ] Mobile (375px): garden renders correctly, share button is tappable (44px target)
- [ ] Desktop (1440px): garden renders correctly with all overlays visible
- [ ] `prefers-reduced-motion` disables animations (snow falling, swaying, firefly glow, star twinkle, sparkle) but shows static versions of seasonal/activity elements
- [ ] No visible lag or jank when the garden renders on the dashboard
- [ ] No changes to faith points, levels, or badge triggers (gamification unchanged)

## Test Requirements

- Verify seasonal overlay renders correctly for each of the 7 liturgical seasons (mock `useLiturgicalSeason`)
- Verify activity elements appear when localStorage thresholds are met (mock localStorage data)
- Verify activity elements do NOT appear when below threshold
- Verify time-of-day sky changes for all 5 time ranges (mock `Date`)
- Verify share button click generates a canvas image (mock canvas context)
- Verify share flow opens SharePanel on button click
- Verify garden renders correctly at all 6 growth stages with all enhancements active
- Verify `prefers-reduced-motion` disables animations but preserves static elements
- Run existing GrowthGarden tests to verify zero regressions
