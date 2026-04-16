# Feature: Visual Growth Garden

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec reads `wr_faith_points` (for level/stage) and `wr_streak` (for sun/clouds)
- Cross-spec dependencies: Touches DashboardHero (Spec 2), faith points/level system (Spec 5), CelebrationOverlay (Spec 8), GrowthProfile (Spec 14), entrance animations (Spec 9)
- Shared constants: `LEVEL_THRESHOLDS` from Spec 5 (Seedling:0, Sprout:100, Blooming:500, Flourishing:1500, Oak:4000, Lighthouse:10000)

---

## Overview

The dashboard currently communicates faith growth through numbers alone — a points counter, a level name, and a horizontal progress bar. While functional, numeric displays lack the emotional resonance that visual metaphors provide. Competing apps like FaithTime ("Little Lamb" you nurture) and Glorify (tree you water daily) have demonstrated that visual growth metaphors create deeper emotional connection and stronger daily return motivation.

This feature adds an animated visual garden above the DashboardHero content that grows through 6 distinct stages matching the existing faith level system. The garden provides an at-a-glance emotional summary of the user's spiritual journey — a bare sprout becoming a small plant, then a flowering bush, then a tree, and finally a full garden scene with a warm glowing tree. The visual metaphor reinforces the app's mission of emotional healing: the user's engagement with prayer, journaling, meditation, and community literally makes their garden grow.

The garden responds to engagement in real time (sparkle particles when earning faith points), reflects streak health visually (sunny vs. overcast sky), and crossfades between stages on level-up. A smaller static version appears on the Growth Profile page so friends can see each other's garden growth.

---

## User Stories

As a **logged-in user visiting the dashboard**, I want to see a visual garden illustration that reflects my current faith level so that my spiritual growth feels tangible and emotionally meaningful rather than just a number.

As a **logged-in user completing an activity** (prayer, journal, meditation, etc.), I want to see brief sparkle particles rise from my garden so that I feel immediate visual feedback that my engagement is making my garden grow.

As a **logged-in user leveling up**, I want to see my garden crossfade to the next stage with amplified sparkle effects so that the level-up moment feels like a celebration of growth, not just a number incrementing.

As a **logged-in user with an active streak**, I want to see sunshine in my garden background so that my consistency is reflected in the scene's mood.

As a **logged-in user whose streak has reset**, I want to see an overcast sky in my garden (not punitive, just a gentle visual cue) so that I'm softly encouraged to re-engage — and I want to see the sun return immediately when I restore my streak.

As a **logged-in user viewing a friend's profile**, I want to see their garden stage as a small static illustration so that I can appreciate their growth journey visually.

As a **user who prefers reduced motion**, I want all garden animations disabled (static scene, no swaying leaves or floating butterflies) while still seeing the correct garden stage so that my accessibility preferences are fully respected.

---

## Requirements

### Part 1: Garden SVG Component

#### 1.1 Component API

A reusable garden component that accepts the following props:

- **stage** (1–6): Determines which of the 6 SVG scenes to render. Maps directly to the existing faith level system.
- **animated** (boolean): Controls whether ambient CSS animations (leaf sway, butterfly float, water shimmer, glow pulse) play. Default `true` for dashboard, `false` for profile.
- **showSparkle** (boolean): When `true`, triggers the growth sparkle particle effect. Default `false`.
- **streakActive** (boolean): Controls whether the garden background shows sunshine (`true`) or overcast/cloudy sky (`false`). Default `true`.
- **size** (`"sm"` | `"md"` | `"lg"`): Controls the rendered height of the garden SVG.
  - `"sm"` = 150px (profile page)
  - `"md"` = 200px (mobile dashboard)
  - `"lg"` = 300px (desktop dashboard)

#### 1.2 Six Garden Stages

Each stage is a **distinct SVG composition** — 6 separate SVG scenes, not a single SVG being modified. The stages are:

| Stage | Level Name | Points Range | Visual Description |
|-------|-----------|-------------|-------------------|
| 1 | Seedling | 0–99 | Bare soil with a single tiny sprout. Muted earth tones (warm browns). A small cross marker in the ground. Minimal scene — just earth, a sprout, and sky. |
| 2 | Sprout | 100–499 | The sprout has grown into a small plant with 2–3 leaves. A bit of green appears in the scene. A tiny flower bud (primary purple) forming at the top. |
| 3 | Blooming | 500–1,499 | A small flowering bush with 3–4 blooms in primary purple (`#6D28D9`). Butterflies appearing (1–2, using amber and teal mood colors). Grass growing around the base. |
| 4 | Flourishing | 1,500–3,999 | A young tree with a visible trunk (warm brown). Full canopy with leaves (greens). Multiple flowers in primary purple and mood colors (amber, teal, green). A bird perched on a branch. Sunlight rays in the background (`white/60`). |
| 5 | Oak | 4,000–9,999 | A strong established tree with thick trunk, wide canopy. Fruit hanging from branches (amber/teal colors). A small stream running past the base (blue tones). More birds and butterflies. Wildflowers (primary purple, amber, teal, green) in the foreground. |
| 6 | Lighthouse | 10,000+ | The full oak tree from stage 5 with a warm glowing light emanating from within the canopy (referencing the "Lighthouse" level name). Full garden scene: stream, flowers, birds, butterflies. Sun with rays in the background. A small bench under the tree suggesting rest and peace. The glow is a soft warm white/gold emanating from the tree's center. |

#### 1.3 Color Palette for SVG Scenes

All SVGs use the existing app color palette:

- **Primary purple** (`#6D28D9`): Flowers and accents
- **Mood colors for flower varieties**: Amber (`#D97706`), Teal (`#2DD4BF`), Green (`#34D399`)
- **Sunlight effects**: `rgba(255, 255, 255, 0.6)` — soft white glow
- **Earth tones**: Warm browns (`#8B6914`, `#6B4E1B`, `#5C4033`) for soil and tree trunk
- **Greens**: Leaf greens (`#22C55E`, `#16A34A`, `#15803D`) for foliage
- **Sky**: Gradient from hero-dark (`#0D0620`) at top to hero-mid (`#1E0B3E`) — matches the dashboard's dark theme
- **Stream/water**: Soft blue tones (`#3B82F6`, `#60A5FA`)
- **Overcast sky variant**: Slightly muted, gray-tinged version of the sky gradient when streak is inactive

#### 1.4 Ambient Animations (CSS Only)

All ambient animations are purely decorative, use CSS keyframes (not JavaScript), and respect `prefers-reduced-motion` (no animation when reduced motion is requested — static scene only):

| Animation | Element | CSS Properties | Duration | Timing |
|-----------|---------|---------------|----------|--------|
| Leaf sway | Leaf elements (stages 3–6) | `transform: rotate(±3deg)` | 4s | `ease-in-out infinite alternate` |
| Butterfly float | Butterfly elements (stages 3–6) | `translateX/Y` gentle path loop | 6s | `ease-in-out infinite` |
| Water shimmer | Stream element (stages 5–6) | `opacity: 0.6 → 1.0` | 3s | `ease-in-out infinite alternate` |
| Lighthouse glow | Glow element (stage 6 only) | `opacity: 0.7 → 1.0` | 2s | `ease-in-out infinite alternate` |

All animations wrapped in Tailwind's `motion-safe:` prefix or `@media (prefers-reduced-motion: no-preference)`.

### Part 2: Dashboard Integration

#### 2.1 Placement in DashboardHero

The garden is added **above** the existing DashboardHero content (greeting, streak counter, level name, faith points, progress bar). The existing DashboardHero content remains exactly as-is — the garden is an addition, not a replacement.

Layout order within the DashboardHero area:
1. "Your Garden" label — `text-xs text-white/40` above the garden SVG
2. Garden SVG component — responsive height (`"lg"` on desktop, `"md"` on mobile)
3. Existing DashboardHero content (unchanged)

#### 2.2 Size Behavior

- **Desktop (> 1024px)**: Garden renders at `"lg"` size (300px height). Full width within the DashboardHero container.
- **Tablet (640px–1024px)**: Garden renders at `"md"` size (200px height).
- **Mobile (< 640px)**: Garden renders at `"md"` size (200px height).

The garden SVG uses `width: 100%` and the fixed height from the `size` prop, maintaining the scene's aspect ratio with centered content.

#### 2.3 Data Sources

The garden reads from existing data — **no new localStorage keys**:

- **Stage**: Derived from `wr_faith_points` → `getLevelForPoints()` → `currentLevel` (1–6). Uses the same `LEVEL_THRESHOLDS` constant already in use.
- **Streak active**: Derived from `wr_streak` → `currentStreak > 0`. Sun if active, overcast if 0.

### Part 3: Growth Sparkle Effect

#### 3.1 Activity Completion Sparkle

When the user earns faith points during a session (completes any tracked activity: mood check-in, prayer, journal, meditation, etc.):

- 3–4 small particle dots rise from the garden and fade out over 1 second
- Particles are colored `primary/50` (`rgba(109, 40, 217, 0.5)`)
- Particles start at random horizontal positions within the garden's width
- Each particle rises 30–50px upward while fading from `opacity: 1` to `opacity: 0`
- Particles have slight horizontal drift (±10px) for organic feel
- Implementation: Temporary DOM elements with CSS animation, removed after animation completes
- Respects `prefers-reduced-motion` — no sparkle particles when reduced motion is requested

#### 3.2 Level-Up Sparkle (Amplified)

When the user levels up (crosses a `LEVEL_THRESHOLDS` boundary):

- The sparkle effect is amplified: 8–10 particles instead of 3–4
- Particles are slightly larger and brighter (`primary/70`)
- This plays simultaneously with the existing CelebrationOverlay (the garden crossfade + sparkle provides additional visual reinforcement behind the celebration modal)

### Part 4: Stage Transition on Level-Up

When the user's faith points cross a level threshold (triggering a level change):

- The garden crossfades from the old stage SVG to the new stage SVG over **2 seconds**
- Implementation: Both old and new SVGs render simultaneously. The old fades out (`opacity: 1 → 0`) while the new fades in (`opacity: 0 → 1`) over 2 seconds
- The crossfade only plays when `animated` is `true` and `prefers-reduced-motion` is not set
- With reduced motion: The new stage appears instantly (no crossfade)
- The crossfade is coordinated with the CelebrationOverlay — the garden transitions behind the overlay, so when the overlay dismisses, the garden is already showing the new stage

### Part 5: Streak-Responsive Sky

The garden background sky reflects the user's daily streak status:

- **Streak active (currentStreak > 0)**: Sun visible in the garden background. Warm lighting in the scene. Sunlight rays where applicable (stages 4–6).
- **Streak reset (currentStreak === 0)**: Overcast/cloudy sky. The sun is hidden behind soft gray clouds. The scene is slightly muted but NOT dark or punitive — just a gentle visual cue, like a cloudy day. The garden content (plants, tree, flowers) is unchanged.
- The sun returns **immediately** when the streak is restored (either through completing a new activity or through streak repair). No delay, no animation prerequisite.
- This is a visual cue only — it does not affect functionality, points, or any other system.

### Part 6: Garden on Growth Profile

#### 6.1 Profile Integration

The Growth Profile page (`/profile/:userId`) shows the user's garden stage as a smaller static version:

- Rendered at `"sm"` size (150px height)
- `animated` is `false` — no ambient animations (leaf sway, butterflies, etc.)
- `showSparkle` is `false` — no particle effects
- Streak state reflects the viewed user's streak data
- Placed in the profile page in a natural location among the existing stats section

#### 6.2 Accessibility of Static Garden

The static garden is purely decorative on the profile page — it shows the user's garden stage but does not add interactive elements. It includes the same `role="img"` and `aria-label` as the dashboard version.

---

## UX & Design Notes

- **Tone**: The garden should feel warm, gentle, and organic — like a real garden growing over time. Not cartoonish, not hyper-realistic. Soft, illustrative style with clean SVG shapes and warm colors. Think "peaceful children's book illustration" meets the app's dark dashboard aesthetic.
- **Colors**: All from the existing design system palette. The garden sits on the dashboard's dark background, so the SVG scenes should have their own sky/ground that creates a self-contained illustration window. The border between garden and dashboard should feel natural (no harsh frame — the garden's ground/sky gradient blends with the surrounding dark background).
- **Typography**: Only the "Your Garden" label uses text — `text-xs text-white/40`, matching the existing dashboard's muted label style.
- **Dashboard Card Pattern**: The garden is NOT inside a frosted glass card. It sits directly above the DashboardHero content as part of the hero area, creating an immersive header experience.
- **Gentle gamification**: The garden embodies the app's philosophy — celebrate presence, never punish absence. The overcast sky when streak resets is gentle, not gloomy. The garden never withers or dies. Plants don't shrink. Stages never go backward. Even at stage 1 with no streak, the garden shows a hopeful sprout in soil.

### Responsive Behavior

- **Mobile (< 640px)**: Garden at 200px height. Full width. "Your Garden" label centered above. All ambient animations play if motion is allowed. Sparkle particles scale down slightly (fewer pixels of travel). Touch targets are not relevant (garden is not interactive).
- **Tablet (640px–1024px)**: Garden at 200px height. Same as mobile but with more horizontal space for the SVG scene to spread out.
- **Desktop (> 1024px)**: Garden at 300px height. Full width within the DashboardHero container. More visual detail visible due to larger canvas.
- **Profile page (all breakpoints)**: Garden at 150px height. Static, no animations. Centered within its container.

### Visual Integration with Existing Dashboard

The garden sits above the existing DashboardHero greeting, streak, and level display. The vertical flow is:

1. "Your Garden" label (muted, small)
2. Garden SVG (self-contained illustration with its own sky and ground)
3. Brief spacing
4. Existing greeting ("Good morning, [Name]")
5. Existing streak / meditation minutes / level display
6. Existing faith points counter + progress bar

The garden should feel like a natural extension of the hero area, not a separate widget bolted on top. The SVG's bottom edge (ground) should transition smoothly into the space above the greeting text.

### Interaction with Dashboard Entrance Animations (Spec 9)

The garden participates in the existing stagger entrance animation system:
- The garden fades in as part of the DashboardHero (the first element in the stagger sequence, delay: 0ms)
- It does NOT have its own separate stagger delay — it appears with the hero

### Interaction with CelebrationOverlay

On level-up:
1. Garden crossfade begins (2 seconds, behind the overlay)
2. CelebrationOverlay appears on top (confetti, badge, message)
3. When overlay dismisses, garden has already completed its crossfade to the new stage
4. Amplified sparkle plays as the overlay appears

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature involves no user text input
- **User input involved?**: No — the garden is entirely read-only, driven by existing data
- **AI-generated content?**: No — all garden visuals are static SVG illustrations

This is a purely visual feature with no user input, no AI output, and no content changes. No safety concerns.

---

## Auth & Persistence

- **Logged-out (demo mode)**: This feature is invisible to logged-out users. The dashboard is auth-gated; logged-out users see the landing page at `/`. No changes to the logged-out experience.
- **Logged-in**: The garden reads from existing localStorage keys (`wr_faith_points` for level/stage, `wr_streak` for sun/clouds). No new data is written. Sparkle and crossfade effects are ephemeral (in-memory state only).
- **Route type**: Protected (dashboard is auth-gated). Profile garden is on `/profile/:userId` which is viewable by anyone, but the garden data comes from the viewed user's profile data.
- **New localStorage keys**: None
- **New routes**: None

### Auth Gating Summary

| Element | Logged-Out | Logged-In |
|---------|-----------|-----------|
| Dashboard garden | Not visible (dashboard is auth-gated, user sees landing page) | Visible above DashboardHero |
| Growth sparkle on activity | Not visible | Triggers when `recordActivity()` awards points |
| Level-up crossfade | Not visible | Triggers when crossing a level threshold |
| Streak sun/clouds | Not visible | Reflects `currentStreak` from `wr_streak` |
| Profile garden (own profile) | Not visible (profile page auth-gated for actions) | Shows own garden stage at 150px |
| Profile garden (friend's profile) | Viewable (profile page is public for viewing) | Viewable with friend's garden stage |

---

## Acceptance Criteria

### Garden SVG Rendering

- [ ] Garden renders above the existing DashboardHero content (greeting, streak, level, progress bar remain unchanged below the garden)
- [ ] "Your Garden" label appears above the garden SVG in `text-xs text-white/40`
- [ ] Garden displays 6 distinct SVG scenes corresponding to the 6 faith levels (Seedling through Lighthouse)
- [ ] Stage 1 (Seedling, 0–99 pts): bare soil with tiny sprout and cross marker, muted earth tones
- [ ] Stage 2 (Sprout, 100–499 pts): small plant with 2–3 leaves and a tiny flower bud
- [ ] Stage 3 (Blooming, 500–1,499 pts): flowering bush with 3–4 purple blooms, 1–2 butterflies, grass at base
- [ ] Stage 4 (Flourishing, 1,500–3,999 pts): young tree with canopy, multiple flowers, a bird on a branch, sunlight rays
- [ ] Stage 5 (Oak, 4,000–9,999 pts): strong tree with thick trunk, fruit, stream, more birds/butterflies, wildflowers
- [ ] Stage 6 (Lighthouse, 10,000+ pts): full oak with warm inner glow, complete garden scene with stream, flowers, birds, butterflies, sun, and bench
- [ ] Garden correctly reads from `wr_faith_points` → `getLevelForPoints()` to determine current stage
- [ ] All SVG scenes use the app's color palette: primary purple for flowers, mood colors (amber, teal, green) for flower varieties, earth tones for ground/trunk

### Responsive Sizing

- [ ] On desktop (> 1024px), garden renders at 300px height (`"lg"` size)
- [ ] On tablet (640px–1024px), garden renders at 200px height (`"md"` size)
- [ ] On mobile (< 640px), garden renders at 200px height (`"md"` size)
- [ ] Garden uses `width: 100%` and centers content within its container at all breakpoints
- [ ] On profile page, garden renders at 150px height (`"sm"` size) at all breakpoints

### Ambient Animations

- [ ] Leaf elements in stages 3–6 gently sway (`rotate ±3deg`, 4s, ease-in-out infinite)
- [ ] Butterfly elements in stages 3–6 float on a gentle path (`translateX/Y` loop, 6s)
- [ ] Stream water in stages 5–6 shimmers (`opacity 0.6–1.0`, 3s)
- [ ] Lighthouse glow in stage 6 pulses softly (`opacity 0.7–1.0`, 2s)
- [ ] All ambient animations use CSS keyframes only — no JavaScript-driven animation
- [ ] With `prefers-reduced-motion: reduce`, all ambient animations are disabled (static scene displayed)

### Growth Sparkle

- [ ] Completing any tracked activity triggers 3–4 particle dots rising from the garden, fading out over 1 second
- [ ] Sparkle particles are colored `primary/50` (`rgba(109, 40, 217, 0.5)`)
- [ ] Particles rise 30–50px upward with slight horizontal drift (±10px) for organic feel
- [ ] On level-up, sparkle is amplified to 8–10 particles with brighter color (`primary/70`)
- [ ] With `prefers-reduced-motion: reduce`, no sparkle particles appear

### Stage Transition (Level-Up)

- [ ] When faith points cross a level threshold, the garden crossfades from the old stage to the new stage over 2 seconds
- [ ] Both old and new SVGs render simultaneously during the crossfade (old fades out, new fades in)
- [ ] The crossfade plays behind the CelebrationOverlay so the garden is already showing the new stage when the overlay dismisses
- [ ] With `prefers-reduced-motion: reduce`, the new stage appears instantly (no crossfade)

### Streak-Responsive Sky

- [ ] When `currentStreak > 0`, the garden background shows sunshine (sun visible, warm lighting)
- [ ] When `currentStreak === 0`, the garden background shows an overcast/cloudy sky (sun hidden, muted but not dark or punitive)
- [ ] The sun returns immediately when streak is restored (new activity completion or streak repair) — no delay
- [ ] The overcast sky does NOT change the garden content (plants, flowers, tree) — only the sky/lighting

### Profile Integration

- [ ] Growth Profile page (`/profile/:userId`) displays the user's garden at 150px height
- [ ] Profile garden is static — no ambient animations, no sparkle effects
- [ ] Profile garden shows the correct stage for the viewed user's faith level
- [ ] Profile garden shows streak-appropriate sky (sun or overcast) based on the viewed user's streak

### Accessibility

- [ ] Garden SVG includes `role="img"` attribute
- [ ] Garden SVG includes descriptive `aria-label` for each stage (e.g., "Your garden: a flourishing tree with flowers and birds")
- [ ] All ambient animations respect `prefers-reduced-motion` — static scene with no animation when reduced motion is set
- [ ] Sparkle particles and crossfade transitions respect `prefers-reduced-motion`
- [ ] "Your Garden" label is visible but muted (`text-white/40`) — does not compete with primary dashboard content for attention

### Visual Verification Criteria

- [ ] The 6 garden stages are visually distinct from each other — each stage is clearly different in complexity and content
- [ ] Garden integrates naturally with the dark dashboard theme — no harsh borders or jarring contrast between garden and surrounding UI
- [ ] The garden's ground/sky creates a self-contained illustration that doesn't need a visible frame
- [ ] Ambient animations are subtle and gentle — leaves don't flap wildly, butterflies don't zip across the screen
- [ ] The Lighthouse glow (stage 6) reads as warm light from within the tree, not a glitch or error state
- [ ] The overcast sky (streak = 0) is gentle and encouraging, not gloomy or punitive
- [ ] The garden does NOT visually break or overlap the existing DashboardHero content below it
- [ ] Vertical spacing between the garden SVG bottom and the greeting text below feels natural (not cramped, not excessive)

---

## Out of Scope

- **Interactive garden**: The garden is view-only. Users cannot tap/click elements, water the garden, or directly interact with SVG elements. Future enhancement potential.
- **Garden withering or regression**: Stages never go backward. The garden never dies, wilts, or shrinks. This aligns with the "gentle gamification" philosophy — celebrate growth, never punish.
- **Seasonal garden themes**: No Christmas, Easter, or seasonal variations. Future enhancement.
- **Custom garden elements**: Users cannot choose flower types, colors, or arrange elements. Future enhancement.
- **Garden sound effects**: No audio feedback when sparkle plays or stage transitions. Future enhancement.
- **Backend persistence**: Garden state is derived from existing `wr_faith_points` and `wr_streak` localStorage keys. No new API endpoints or database tables.
- **Garden sharing**: No "share your garden" social feature. The profile garden is view-only. Future enhancement.
- **Animated stage transition path**: No "growing" animation that shows the garden gradually building up from stage 1. The user sees their current stage. Future enhancement.
- **Dark mode toggle**: Dashboard is already all-dark. No light-mode garden variant needed.
- **New localStorage keys**: Garden reads from existing keys only.
- **New routes**: No new pages.
