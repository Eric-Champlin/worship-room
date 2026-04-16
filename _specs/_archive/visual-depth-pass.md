# HP-11: Visual Depth Pass — GitHub-Quality Glows, Borders & Shadows

**Master Plan Reference:** N/A — standalone homepage visual polish spec
**Branch Strategy:** Continue on `homepage-redesign` branch (no new branch)

---

## Overview

The homepage sections currently feel flat — glow orbs are invisible at 0.03-0.08 opacity, card borders blend into the background, and there's no box-shadow depth. This spec upgrades the visual treatment across every homepage section to create atmosphere and depth, using GitHub's dark homepage as the quality bar. It also wraps the Starting Point Quiz in a frosted glass container for visual containment.

The goal is sanctuary-level immersion: every section should feel alive with soft purple atmospheric lighting, visible card edges, and layered depth — not a flat dark rectangle with white text pasted on.

## User Story

As a **logged-out visitor**, I want to feel drawn into the homepage's visual atmosphere so that the page feels alive, premium, and worth exploring — building trust before I engage with any feature.

## Requirements

### Functional Requirements

1. **GlowBackground component** — All 4 variants (`center`, `left`, `right`, `split`) updated with visible opacity values (0.12-0.15 minimum for primary orbs, up from 0.03-0.08)
2. **GlowBackground mobile performance** — Glow orbs reduced to 300px diameter / 60px blur below `md` breakpoint to prevent scroll jank from compositing large blurred elements
3. **FrostedCard component** — Border upgraded to `white/[0.12]`, background to `white/[0.06]`, new dual box-shadow (purple glow + dark drop shadow), hover state intensifies both glow and shadow
4. **StatsBar** — Border separators upgraded to `white/[0.10]`; gradient text rendering verified (background-clip + text-fill-color)
5. **DashboardPreview** — Lock overlay text brightened to `white/50`, lock icon to `white/40`, CTA button gets white glow shadow
6. **DifferentiatorSection** — Icon containers get border (`white/[0.06]`) and slightly brighter background (`white/[0.08]`)
7. **StartingPointQuiz** — Quiz UI (question, options, progress bar, result) wrapped in a frosted glass container with `rounded-3xl`, visible border, purple glow shadow; SectionHeading stays outside the container; result area gets an extra glow orb behind it
8. **FinalCTA** — Custom glow orb at 0.18 opacity (strongest on page), CTA button gets prominent white glow shadow with hover intensification

### Non-Functional Requirements

- **Performance**: No scroll jank on mobile from large blurred divs; glow orbs use `will-change: transform` or reduced sizes on mobile
- **Accessibility**: All changes are purely decorative — no impact on screen reader content, keyboard navigation, or ARIA. All glow divs use `pointer-events-none`. No content or interactive elements are affected.

## Auth Gating

N/A — All changes are visual/decorative on the public homepage. No interactive elements are added or modified. No auth gating required.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View homepage sections | All visual upgrades visible | Same | N/A |
| Hover on FrostedCards | Intensified glow + shadow | Same | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Glow orbs: 300px diameter, 60px blur. All other changes apply identically. |
| Tablet (768-1024px) | Glow orbs: full desktop size (400-600px). All changes apply. |
| Desktop (> 1024px) | Full visual treatment as specified. |

- GlowBackground orbs use responsive classes: `w-[300px] h-[300px] md:w-[500px] md:h-[500px]` (or equivalent per variant)
- FrostedCard, StatsBar, DashboardPreview, DifferentiatorSection, FinalCTA changes are not breakpoint-dependent
- StartingPointQuiz frosted glass container uses `p-6 sm:p-8 lg:p-10` for responsive padding

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** All visual changes are visible. No data persistence involved.
- **Logged-in users:** Same visual treatment. No data persistence involved.
- **localStorage usage:** None.

## Completion & Navigation

N/A — standalone visual polish feature. No completion tracking or navigation changes.

## Design Notes

### Reference: GitHub's Dark Homepage Visual Approach

Key values from Playwright recon that set the quality bar:

- **Page background:** `#0D1117` — similar to Worship Room's `#08051A` / `#0D0620`
- **Purple/violet radial glow backgrounds** on major sections — clearly visible, not hidden
- **Card borders:** Visible white borders (not invisible 0.08 opacity)
- **Text opacity:** Muted text at `rgba(255,255,255,0.85)` for subtitles — not ultra-faint `white/30`
- **No excessive blur** — sections feel crisp, not foggy

### Component-Specific Values

#### GlowBackground Variants

| Variant | Orb Count | Primary Opacity | Blur | Desktop Size | Mobile Size |
|---------|-----------|----------------|------|-------------|-------------|
| `center` | 1 | 0.15 | 80px | 600px | 300px |
| `left` | 1 | 0.12 | 80px | 500px | 300px |
| `right` | 1 | 0.12 | 80px | 500px | 300px |
| `split` | 2 | 0.14 / 0.08 | 80px | 500px / 400px | 300px / 250px |

Color: `rgba(139, 92, 246, ...)` (matches `primary-lt` / `#8B5CF6`)
Split secondary: `rgba(168, 130, 255, 0.08)`

#### FrostedCard Values

| Property | Old | New |
|----------|-----|-----|
| Border | `white/[0.08]` | `white/[0.12]` |
| Background | `white/[0.05]` | `white/[0.06]` |
| Box shadow | none | `0 0 25px rgba(139,92,246,0.06), 0 4px 20px rgba(0,0,0,0.3)` |
| Hover border | `white/[0.12]` | `white/[0.18]` |
| Hover background | `white/[0.08]` | `white/[0.09]` |
| Hover shadow | none | `0 0 35px rgba(139,92,246,0.10), 0 6px 25px rgba(0,0,0,0.35)` |

#### FinalCTA Glow

Strongest on page: `rgba(139, 92, 246, 0.18)` — intentionally the highest opacity glow, placed at the climactic conversion moment.

#### StartingPointQuiz Frosted Container

- `bg-white/[0.04]`, `backdrop-blur-sm`, `border border-white/[0.10]`, `rounded-3xl`
- Shadow: `0 0 30px rgba(139,92,246,0.08), 0 4px 25px rgba(0,0,0,0.25)`
- `max-w-3xl mx-auto`
- SectionHeading stays OUTSIDE the container
- Progress bar sits at TOP inside the container
- Result card gets extra glow orb: `rgba(139,92,246,0.12)`, 300px, 60px blur

### Glow Opacity Hierarchy (low to high)

1. `0.08` — split secondary orb, icon container borders
2. `0.12` — left, right orbs; result card glow
3. `0.14` — split primary orb
4. `0.15` — center orb (default sections)
5. `0.18` — FinalCTA (strongest, emotional peak)

### Existing Components Referenced

- `GlowBackground` — existing homepage component, all 4 variants modified
- `FrostedCard` — existing homepage component, border/bg/shadow upgraded
- `StatsBar` — existing homepage component, border separator upgraded
- `DashboardPreview` / `DashboardPreviewCard` — existing homepage components, overlay text/icon brightness and CTA glow
- `DifferentiatorSection` — existing homepage component, icon container treatment
- `StartingPointQuiz` — existing component, new frosted glass wrapper added
- `FinalCTA` — existing homepage component, custom glow orb and button glow
- `SectionHeading` — existing component, no changes (stays outside quiz glass container)

### New Visual Patterns

1. **Dual box-shadow on cards** — purple glow + dark drop shadow combination. New pattern not in the existing design system recon.
2. **Button glow shadows** — white glow (`rgba(255,255,255,0.15-0.30)`) on CTA buttons. New pattern.
3. **Frosted glass quiz container** — `rounded-3xl` container with `backdrop-blur-sm`. Similar to existing dashboard cards but with larger radius and different shadow treatment.

## Out of Scope

- Hero section glow changes (already handled in HP-8b)
- JourneySection glow changes (already handled in HP-8b)
- Text opacity changes beyond lock overlay (e.g., section body text, subtitles)
- Color palette changes
- Typography changes
- Layout or spacing changes
- Animation changes
- Any non-homepage pages
- Backend changes
- Light mode considerations

## Acceptance Criteria

### GlowBackground
- [ ] `center` variant: single orb at `rgba(139,92,246,0.15)`, 600px desktop / 300px mobile, 80px / 60px blur
- [ ] `left` variant: single orb at `rgba(139,92,246,0.12)`, 500px desktop / 300px mobile, 80px / 60px blur
- [ ] `right` variant: single orb at `rgba(139,92,246,0.12)`, 500px desktop / 300px mobile, 80px / 60px blur
- [ ] `split` variant: two orbs at `rgba(139,92,246,0.14)` + `rgba(168,130,255,0.08)`, 500/400px desktop / 300/250px mobile
- [ ] All glow orbs clearly visible on the page (not invisible)
- [ ] Mobile: orbs use smaller sizes below `md` breakpoint

### FrostedCard
- [ ] Border: `white/[0.12]` (up from `0.08`)
- [ ] Background: `white/[0.06]` (up from `0.05`)
- [ ] Box shadow: `0 0 25px rgba(139,92,246,0.06), 0 4px 20px rgba(0,0,0,0.3)`
- [ ] Hover (when interactive): border `white/[0.18]`, bg `white/[0.09]`, shadow intensified
- [ ] Cards visually lift off the background — not flat

### StatsBar
- [ ] Border separators: `white/[0.10]` (up from `0.06`)
- [ ] Gradient text on stat numbers renders correctly (background-clip + text-fill-color verified)

### DashboardPreview
- [ ] Lock overlay text: `text-white/50` (up from `/40`)
- [ ] Lock icon: `text-white/40` (up from `/30`)
- [ ] CTA button: `shadow-[0_0_20px_rgba(255,255,255,0.15)]`

### DifferentiatorSection
- [ ] Icon containers: `bg-white/[0.08]` with `border border-white/[0.06]`

### StartingPointQuiz
- [ ] Quiz UI wrapped in frosted glass container (`bg-white/[0.04]`, `border-white/[0.10]`, `rounded-3xl`)
- [ ] SectionHeading ("Not Sure Where to Start?") remains OUTSIDE the glass container
- [ ] Progress bar sits at TOP inside the glass container
- [ ] Quiz result area has extra glow orb behind it (`rgba(139,92,246,0.12)`, 300px, 60px blur)
- [ ] Glass container max-width: `max-w-3xl`

### FinalCTA
- [ ] Custom glow orb at `rgba(139,92,246,0.18)` — strongest glow on the entire page
- [ ] CTA button: `shadow-[0_0_30px_rgba(255,255,255,0.20)]`
- [ ] CTA button hover: `shadow-[0_0_40px_rgba(255,255,255,0.30)]`

### Visual Verification (full page scroll)
- [ ] Every section between Hero and Footer has visible atmospheric purple glow
- [ ] No section looks like a plain dark rectangle with white text
- [ ] The page has a sense of depth — elements feel layered, not pasted on
- [ ] Glow intensity builds: sections < FinalCTA (strongest at bottom)

### Technical
- [ ] Build passes with 0 errors
- [ ] All existing tests pass
- [ ] No scroll jank on mobile from blurred glow divs
- [ ] Committed on `homepage-redesign` branch

## Files Modified

| Action | File |
|--------|------|
| MODIFY | `src/components/homepage/GlowBackground.tsx` |
| MODIFY | `src/components/homepage/FrostedCard.tsx` |
| MODIFY | `src/components/homepage/StatsBar.tsx` |
| MODIFY | `src/components/homepage/DashboardPreview.tsx` |
| MODIFY | `src/components/homepage/DashboardPreviewCard.tsx` |
| MODIFY | `src/components/homepage/DifferentiatorSection.tsx` |
| MODIFY | `src/components/StartingPointQuiz.tsx` |
| MODIFY | `src/components/homepage/FinalCTA.tsx` |
