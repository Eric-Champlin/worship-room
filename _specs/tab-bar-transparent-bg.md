# Tab Bar Transparent Background — Let Glow Orb Bleed Through

**Master Plan Reference:** N/A — standalone visual refinement

---

## Overview

After the glow orb bleed-through enhancement (Spec H's `overflow-visible` on GlowBackground), the Daily Hub hero's atmospheric purple glow now extends softly below the hero section. However, the sticky tab bar's nearly-opaque dark purple background (`rgba(8, 5, 26, 0.85)`) creates a visible "dark block" that cuts the orb's continuation. This spec removes the tab bar's background fill and relies purely on `backdrop-blur` for legibility separation — the orb shows through as a soft atmospheric glow while the tab bar content stays readable via the inner pill container's own frosted glass treatment.

This is a small but emotionally important refinement: the sanctuary atmosphere should flow seamlessly from hero into content, not be interrupted by a hard-edged rectangle.

## User Story

As a **logged-out visitor or logged-in user** on the Daily Hub, I want the hero's glow orb to bleed softly through the tab bar area so that the page feels like one continuous atmospheric space — not two sections divided by a dark block.

---

## Requirements

### Functional Requirements

1. The outer tab bar wrapper's `backgroundColor` style property is removed entirely — no solid or semi-transparent color fill.
2. The outer tab bar wrapper uses `backdropFilter: blur(12px)` (reduced from 16px) so the glow orb's color bleeds through more naturally while still frosting content for legibility.
3. The inner pill-shaped tab container (`bg-white/[0.06]` with border and shadow) remains unchanged — it provides the primary visual anchor for tab labels.
4. All tab bar functionality is unchanged: sticky behavior, ARIA attributes, keyboard navigation, state management, active/inactive styling, focus rings, hover states.

### Non-Functional Requirements

- **Performance:** No change — `backdrop-filter` is already GPU-composited.
- **Accessibility:** Inactive tab labels (`text-white/50`) must maintain WCAG AA contrast (4.5:1 for normal text) against the blurred background. If contrast fails during visual verification, the fallback is bumping inactive labels to `text-white/70`.

---

## Auth Gating

N/A — This is a visual-only change to the tab bar wrapper. No interactive elements are added or modified. All existing auth gating on tab content remains unchanged.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Same change applies. Glow orbs scale down but should still bleed through the transparent tab bar area. |
| Tablet (640-1024px) | Same as mobile. |
| Desktop (> 1024px) | Primary verification target — the larger glow orb is most visible at desktop size. |

No layout changes at any breakpoint. The only difference is the outer wrapper's inline `style` prop.

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

N/A — No data reads or writes. No localStorage keys affected. Pure CSS change.

---

## Completion & Navigation

N/A — No completion signals or navigation changes.

---

## Design Notes

- The `GlowBackground` component (from `src/components/homepage/GlowBackground.tsx`) already has `overflow-visible` from a prior spec, allowing its glow orbs to bleed outside the hero section's bounds. This spec removes the last visual blocker to that bleed-through: the tab bar's opaque background.
- The inner pill container uses the existing `FrostedCard`-style treatment (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12]`) which provides enough visual presence on its own.
- The reduced blur (16px to 12px) is intentional: less aggressive frosting lets the orb's purple warmth come through while still providing separation. The inner pill's own background and border carry the legibility burden.
- Per the design system recon, the glow orb uses `rgba(139,92,246, 0.25-0.35)` center opacity — the blurred version of this through 12px blur should produce a muted purple wash, not an overpowering glow.
- Active tab styling (`bg-white/[0.12] border border-white/[0.15]` + purple glow shadow) and focus rings (`focus-visible:ring-primary`) remain visible over the blurred background.

---

## Out of Scope

- Changing the inner pill container's styling
- Changing any tab button classes, ARIA attributes, or keyboard behavior
- Adjusting glow orb opacity or size in GlowBackground
- Applying this transparent treatment to tab bars on other pages (this spec targets Daily Hub only)
- Light mode considerations (deferred to Phase 4)

---

## Acceptance Criteria

- [ ] Outer tab bar wrapper `style` prop no longer includes `backgroundColor`
- [ ] Outer tab bar wrapper `style` prop uses `backdropFilter: blur(12px)` and `WebkitBackdropFilter: blur(12px)`
- [ ] Inner pill container styling (`bg-white/[0.06] border border-white/[0.12] rounded-full`) is unchanged
- [ ] All tab button classes are unchanged
- [ ] All ARIA attributes are preserved (`role="tablist"`, `aria-label`, `aria-selected`, etc.)
- [ ] Sticky behavior (`sticky top-0 z-40`) is unchanged
- [ ] Hero glow orb visibly bleeds through the tab bar area — no dark purple rectangle cutting the orb
- [ ] Active tab is clearly distinguishable from inactive tabs
- [ ] Inactive tab labels pass WCAG AA contrast (4.5:1) against the blurred background — if not, bump to `text-white/70`
- [ ] Sticky shadow (`shadow-md shadow-black/20`) still appears when scrolled past the sentinel
- [ ] Hover state on inactive tabs (`hover:bg-white/[0.04]`, `hover:text-white/80`) still provides visible feedback
- [ ] No visual regressions on non-hero sections of the Daily Hub (tab bar appearance when scrolled past the glow area should still look reasonable)
