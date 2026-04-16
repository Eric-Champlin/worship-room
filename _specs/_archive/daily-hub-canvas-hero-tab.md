# Daily Hub Canvas, Hero & Tab Bar

**Master Plan Reference:** N/A — standalone visual upgrade spec

---

## Overview

The Daily Hub is the heart of the daily spiritual practice experience — where users come to pray, journal, meditate, and read devotionals. Currently its visual shell (background, hero, verse card, tab bar) uses an older style that doesn't match the cinematic dark visual language established on the homepage during Round 3. This spec transforms the Daily Hub's outer shell to match the homepage's design language (GlowBackground, FrostedCard, gradient text, pill tab bar) and fixes a white flash during tab transitions — creating visual continuity that sustains the sanctuary immersion as users move from the homepage into their daily practices.

## User Story

As a **logged-in user or logged-out visitor**, I want the Daily Hub to feel like a seamless continuation of the homepage's peaceful, cinematic atmosphere so that the visual transition into my daily practices feels immersive rather than jarring.

## Requirements

### Functional Requirements

1. **Root background color** changes from `bg-dashboard-dark` (`#0f0a1e`) to `bg-hero-bg` (`#08051A`) throughout the entire DailyHub page, including focus ring offsets.
2. **Hero section** wraps in a `GlowBackground` component (center variant) providing visible purple glow orbs behind the greeting and verse card. The previous `ATMOSPHERIC_HERO_BG` inline style is removed.
3. **Greeting heading** uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) instead of the current Caveat script font + Tailwind gradient classes.
4. **Verse of the Day card** uses the `FrostedCard` component (`bg-white/[0.06]`, `border-white/[0.12]`, purple box-shadow glow) instead of the current `bg-white/5 border-white/10` card.
5. **Tab bar** redesigned from a flat strip with animated underline to a pill-shaped container (`rounded-full`) where the active tab has a filled pill indicator with subtle purple glow, and inactive tabs show muted text with hover fade.
6. **Tab switch transitions** use CSS opacity transitions (`transition-opacity duration-200`) instead of the `animate-tab-fade-in` keyframe animation, eliminating the white flash.

### Non-Functional Requirements

- **Performance**: No additional JS bundle size beyond the existing `GlowBackground` and `FrostedCard` components (already in the bundle via homepage). Tab transitions should feel instant (200ms opacity fade).
- **Accessibility**: All existing ARIA attributes, keyboard navigation (arrow keys on tablist), focus rings, screen reader labels, completion check announcements, and skip links remain unchanged.
- **Visual consistency**: Hero gradient text, frosted card styling, and glow backgrounds must visually match the homepage equivalents within tolerance.

## Auth Gating

This spec is **visuals only** — no interactive behavior changes. Auth gating is unchanged:

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| View Daily Hub hero + verse | Visible, fully rendered | Visible, fully rendered | N/A |
| Click tab buttons | Switches tabs (all tabs accessible) | Switches tabs (all tabs accessible) | N/A |
| Keyboard navigate tabs | Arrow keys work, focus visible | Arrow keys work, focus visible | N/A |
| Tab content interactions | Varies per tab (existing auth gates) | Varies per tab (existing behavior) | Varies per tab |

No new auth gates are introduced by this spec.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero padding `pt-32 pb-8`. Tab bar pill fits full width with abbreviated `mobileLabel` text. Below 400px, tab labels hidden (icon + sr-only text). Glow orbs reduced ~40% size per homepage pattern. |
| Tablet (640-1024px) | Hero padding `pt-36 pb-12`. Tab labels visible. Pill tab bar contained at `max-w-xl`. |
| Desktop (> 1024px) | Hero padding `pt-40`. Full tab labels. Pill bar centered with comfortable spacing. |

- Greeting text: `text-3xl` mobile, `text-4xl` sm+
- Tab buttons: `text-sm py-2` mobile, `text-base py-2.5` sm+
- Tab icons: `h-4 w-4` mobile, `h-5 w-5` sm+
- FrostedCard: inherits responsive padding from component defaults (`p-6`)

## AI Safety Considerations

N/A — This spec is purely visual. No user text input, no AI-generated content, no crisis detection needed.

## Auth & Persistence

- **Logged-out users:** See the same visual updates (background, hero, tab bar, verse card styling). Zero persistence — no change from current behavior.
- **Logged-in users:** See the same visual updates. No new data stored. Existing completion tracking and tab state management unchanged.
- **localStorage usage:** No new keys. No changes to existing keys.

## Completion & Navigation

N/A — This spec does not change completion signals, CTAs, or cross-tab navigation. All existing completion tracking (`useCompletionTracking`), tab switching (`switchTab`), URL param handling, and cross-tab CTAs remain unchanged.

## Design Notes

- **GlowBackground**: Use the existing `GlowBackground` component from `components/homepage/` with `variant="center"`. Per `09-design-system.md`, glow orb center opacity should be 0.25-0.35 for standard sections. The component handles this internally.
- **FrostedCard**: Use the existing `FrostedCard` component from `components/homepage/`. Per the design system recon, it provides `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with purple box-shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`.
- **Gradient text**: Use `GRADIENT_TEXT_STYLE` from `constants/gradients` (same white-to-purple gradient used on homepage headings). Removes the Caveat (`font-script`) font — greeting now uses Inter (the body/heading font).
- **Tab bar pill**: New pattern not yet captured in design system. Outer container uses `rgba(8, 5, 26, 0.85)` background with `blur(16px)`. Inner pill uses `rounded-full border border-white/[0.12] bg-white/[0.06] p-1`. Active tab: `bg-white/[0.12] border border-white/[0.15] shadow-[0_0_12px_rgba(139,92,246,0.15)]`. Inactive: `text-white/50` with `hover:text-white/80 hover:bg-white/[0.04]`.
- **Animated underline removed**: The current animated underline indicator (position-tracked div) is completely removed in favor of the pill highlight pattern.
- **Background unification**: `bg-hero-bg` (`#08051A`) matches the homepage. Replaces `bg-dashboard-dark` (`#0f0a1e`).

**New visual patterns**: 1 — the pill tab bar. This pattern is not yet in the design system recon and should be marked `[UNVERIFIED]` during planning until visually confirmed.

## Out of Scope

- Tab content redesign (Devotional, Pray, Journal, Meditate tab internals)
- Any logic changes (tab switching, completion tracking, URL params, auth)
- SEO component changes
- SiteFooter or StartingPointQuiz changes
- Skip link changes
- Mobile drawer or navbar changes
- New animations beyond the opacity transition fix
- Sound effects or audio changes
- Backend/API work (Phase 3+)

## Acceptance Criteria

- [ ] Root background is `bg-hero-bg` (`#08051A`) — no remaining `bg-dashboard-dark` or `dashboard-dark` references in `DailyHub.tsx`
- [ ] Hero section has visible purple glow orbs behind greeting (GlowBackground center variant)
- [ ] Greeting heading uses white-to-purple gradient text (GRADIENT_TEXT_STYLE), not Caveat font
- [ ] Greeting heading font is Inter (sans-serif), not Caveat (cursive)
- [ ] Verse of the Day card uses FrostedCard component with visible border (`border-white/[0.12]`) and purple box-shadow glow
- [ ] Tab bar has pill-shaped container (`rounded-full`) with visible border
- [ ] Active tab shows filled pill with `bg-white/[0.12]`, white text, and subtle purple glow shadow
- [ ] Inactive tabs show `text-white/50` muted text
- [ ] Hovering an inactive tab brightens text to `text-white/80` and shows subtle `bg-white/[0.04]` background
- [ ] No animated underline div present in the tab bar
- [ ] Tab switching produces no white flash — smooth opacity transition (200ms)
- [ ] All ARIA attributes preserved: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` roving
- [ ] Keyboard navigation works: arrow keys move focus between tabs, Enter/Space activates
- [ ] Focus ring visible on tab buttons (`focus-visible:ring-2 ring-primary`)
- [ ] Completion check icons (green checkmark) still display for authenticated users on completed tabs
- [ ] Mobile (375px): pill tab bar fits within viewport, labels show `mobileLabel` abbreviations, glow orbs visible but appropriately sized
- [ ] Desktop (1280px): hero glow orbs clearly visible, frosted card shadow visible, pill tab bar centered at `max-w-xl`
- [ ] Visual match: hero gradient text style matches homepage heading gradient (same `GRADIENT_TEXT_STYLE` constant)
- [ ] Visual match: verse card styling matches homepage FrostedCard instances (same component)
