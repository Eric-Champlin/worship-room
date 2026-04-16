# Daily Hub Canvas, Hero & Tab Bar

**Master Plan Reference:** N/A — standalone visual redesign spec

---

## Overview

The Daily Hub is the primary daily touchpoint for users seeking comfort and spiritual practice. This spec transforms its outer shell — root background, hero section, verse card, and tab bar — to match the home page's cinematic visual language established in Round 3. The result is a seamless visual transition from landing page to Daily Hub, reinforcing the sanctuary immersion that emotionally vulnerable users depend on.

## User Story

As a **logged-in user**, I want the Daily Hub to feel as visually immersive as the home page so that my transition into daily spiritual practice feels like entering a sanctuary, not switching to a different app.

As a **logged-out visitor**, I want the Daily Hub to look cohesive with the landing page so that the experience feels polished and trustworthy.

## Requirements

### Functional Requirements

1. Root background color changes from `bg-dashboard-dark` (#0f0a1e) to `bg-hero-bg` (#08051A) to match the home page canvas
2. Hero section wrapped in `GlowBackground` component (center variant) with visible purple glow orbs, replacing the old `ATMOSPHERIC_HERO_BG` inline style
3. Greeting heading uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient) at enlarged sizes (`text-4xl sm:text-5xl lg:text-6xl`), removing the Caveat script font
4. Verse of the Day card compacted: narrower max-width (`max-w-2xl`), tighter padding (`px-5 py-4`), smaller text, `line-clamp-2` on mobile
5. Quiz teaser text ("Not sure where to start?") and `StartingPointQuiz` component removed from the Daily Hub entirely
6. Tab bar redesigned as a pill navigation: rounded-full container with frosted glass styling, active tab has filled pill with subtle purple glow shadow, inactive tabs show muted text with hover brightening
7. Tab switch animation changed from CSS keyframe (`animate-tab-fade-in`) to opacity transition to eliminate white flash
8. All existing functionality preserved: tab switching, keyboard navigation, completion tracking, URL param handling, ARIA attributes, SEO component, skip link, footer

### Non-Functional Requirements

- Performance: No additional network requests; all changes are CSS/className only (except import swaps)
- Accessibility: All ARIA attributes, roles, keyboard navigation (arrow keys, Home/End), and focus management remain unchanged. Focus ring offset color updated from `dashboard-dark` to `hero-bg`

## Auth Gating

This spec is visuals-only. No new interactive elements are added. Existing auth gating is unchanged:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Daily Hub hero | Visible, greeting shows generic text | Visible, greeting shows user's name | N/A |
| Switch tabs | Works (click + keyboard) | Works (click + keyboard) | N/A |
| View Verse of the Day | Visible in hero | Visible in hero | N/A |
| Tab content interactions | Existing auth gates per tab unchanged | Full functionality | Per-tab messages unchanged |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Pill tab bar fits within viewport width. Greeting at `text-4xl`. Verse text clamped to 2 lines (`line-clamp-2`). Tab labels hidden below 400px (icons only with sr-only text). |
| Tablet (640-1024px) | Pill tab bar centered at `max-w-xl`. Greeting at `text-5xl`. Verse text unclamped. Tab labels visible. |
| Desktop (> 1024px) | Same as tablet with greeting at `text-6xl`. Glow orbs at full size. |

- Tab bar pill container uses `flex-1` on buttons so all tabs share equal width
- Mobile: icons + short labels visible at 400px+; below 400px, labels hidden with `sr-only` fallback
- Verse card: `max-w-2xl` keeps it narrower than the previous `max-w-3xl` at all breakpoints

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required. Existing crisis detection in the Pray and Journal tabs is unaffected.

## Auth & Persistence

- **Logged-out users:** See the redesigned Daily Hub visuals. No persistence changes.
- **Logged-in users:** See the redesigned Daily Hub visuals with personalized greeting. No persistence changes.
- **localStorage usage:** No changes to any localStorage keys.

## Completion & Navigation

N/A — This spec only changes the outer shell (background, hero, tab bar). Completion tracking within individual tabs is unchanged.

## Design Notes

- **GlowBackground:** Use `GlowBackground` component from `components/homepage/` with `variant="center"`. This provides the same purple glow orbs used on the home page (0.25-0.35 center opacity per design system).
- **GRADIENT_TEXT_STYLE:** Use the `GRADIENT_TEXT_STYLE` constant from `constants/gradients.tsx` for the greeting heading. This is the same white-to-purple gradient used on home page headings.
- **FrostedCard DNA on verse card:** The compact verse card uses `bg-white/[0.06]`, `border-white/[0.12]`, `rounded-xl`, `backdrop-blur-sm` — matching the FrostedCard component's material but at a smaller scale.
- **Pill tab bar:** New pattern not currently captured in the design system recon. Uses frosted glass container (`bg-white/[0.06]`, `border-white/[0.12]`, `rounded-full`, `p-1`) with active pill (`bg-white/[0.12]`, `border-white/[0.15]`, subtle purple box-shadow). Background uses semi-transparent hero-bg (`rgba(8,5,26,0.85)`) with `backdrop-filter: blur(16px)`.
- **No Caveat font:** The greeting heading drops `font-script` (Caveat) in favor of the default Inter bold, matching the typography phase-out noted in the design system.
- **Tab animation:** Replace CSS keyframe animation with CSS transition (`transition-opacity duration-200 ease-out`) to prevent white flash during tab switches.

**New visual patterns:** 1 (pill tab bar). This will be marked `[UNVERIFIED]` during planning until visually confirmed.

**Design system recon reference:** `_plans/recon/design-system.md` exists — reference GlowBackground and FrostedCard patterns for exact values.

## Files to Edit

- `src/pages/DailyHub.tsx` — sole file affected

## Out of Scope

- Tab content redesign (Devotional, Pray, Journal, Meditate tab internals) — separate specs
- Any logic changes to `switchTab`, `handleTabKeyDown`, completion tracking, or URL param handling
- Changes to `SEO` component, skip link, `SiteFooter`, or tab panel `hidden`/`role`/`aria-*` attributes
- Mobile drawer or navbar changes
- Backend/API work (Phase 3+)
- StartingPointQuiz component file deletion (only removing its usage from DailyHub; the component remains for the landing page)
- Light mode considerations (Phase 4)

## Acceptance Criteria

- [ ] Root container uses `bg-hero-bg` (#08051A) instead of `bg-dashboard-dark` (#0f0a1e)
- [ ] All `dashboard-dark` references in the file replaced with `hero-bg` (including focus ring offsets)
- [ ] Hero section wrapped in `GlowBackground variant="center"` with visible purple glow orbs
- [ ] `ATMOSPHERIC_HERO_BG` import removed; no inline `style` on the hero `<section>`
- [ ] Greeting `<h1>` uses `GRADIENT_TEXT_STYLE` inline style (white-to-purple gradient)
- [ ] Greeting `<h1>` uses `text-4xl sm:text-5xl lg:text-6xl` (no `font-script`, no Tailwind gradient classes)
- [ ] Verse card wrapper uses `max-w-2xl rounded-xl border-white/[0.12] bg-white/[0.06] px-5 py-4`
- [ ] Verse text uses `text-base sm:text-lg text-white/80` with `line-clamp-2 sm:line-clamp-none`
- [ ] Reference text uses `mt-2 text-sm text-white/60` (no `sm:text-base`)
- [ ] Action links container uses `mt-3` instead of `mt-4`
- [ ] Quiz teaser paragraph ("Not sure where to start?") removed from JSX
- [ ] `StartingPointQuiz` component usage removed from JSX
- [ ] `StartingPointQuiz` import removed
- [ ] Tab bar is a pill-shaped container: `rounded-full border-white/[0.12] bg-white/[0.06] p-1 max-w-xl`
- [ ] Active tab pill: `bg-white/[0.12] text-white border-white/[0.15]` with purple glow shadow
- [ ] Inactive tabs: `text-white/50` with `hover:text-white/80 hover:bg-white/[0.04]`
- [ ] Tab bar sticky background uses semi-transparent hero-bg with backdrop blur
- [ ] No animated underline div in the tab bar
- [ ] `activeTabIndex` variable removed
- [ ] Tab panels use `transition-opacity duration-200 ease-out` with conditional `opacity-100`/`opacity-0` instead of `animate-tab-fade-in`
- [ ] No white flash visible during tab switches
- [ ] All ARIA attributes, roles, `tabIndex`, keyboard handlers unchanged
- [ ] Completion checkmarks still display for authenticated users
- [ ] Mobile (375px): pill tab bar fits, labels hidden below 400px, verse clamped to 2 lines
- [ ] Desktop (1280px): greeting renders at large size with visible gradient, glow orbs visible behind hero
- [ ] Focus ring on tab buttons uses `ring-offset-hero-bg` (not `ring-offset-dashboard-dark`)

### Playwright Verification

1. **Hero section** — desktop 1280x800: purple glow orbs visible, gradient text greeting at large size, no Caveat script, compact verse card
2. **No quiz** — scroll to bottom: no "Not sure where to start?" text, no StartingPointQuiz
3. **Tab bar** — zoomed crop: pill-shaped container with rounded-full border, active tab has filled pill with subtle purple glow, no underline
4. **Tab bar hover** — hover inactive tab: text brightens, subtle background fade
5. **Tab switch** — click each tab: no white flash, smooth opacity transition
6. **Mobile** — 375x812: pill tab bar fits, greeting readable, verse compact with line clamp
7. **Keyboard nav** — arrow keys in tab bar: focus ring visible, ring offset uses hero-bg
