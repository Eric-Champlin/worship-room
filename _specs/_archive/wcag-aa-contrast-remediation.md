# Feature: WCAG AA Contrast Remediation

**Master Plan Reference:** N/A — standalone accessibility remediation

---

## Overview

`text-white/30` and `text-white/40` appear 271 times across 133 files. These opacities fail WCAG AA contrast ratios on all dark backgrounds used in the app. Placeholder text at these opacities is functionally invisible to low-vision users, and body text is difficult to read for everyone. This spec establishes minimum opacity standards and systematically remediates every occurrence.

This is a P0 accessibility blocker. The app's dark theme uses backgrounds ranging from `#0D0620` (hero-dark) to `#1E0B3E` (hero-mid). White text at 30% opacity on these backgrounds produces contrast ratios around 1.8:1 — far below the 4.5:1 WCAG AA minimum for body text and 3:1 minimum for large text.

This is particularly harmful for a healing app. A user who is anxious, exhausted, or reading through tears needs text to be effortlessly readable. Placeholder prompts like "What's on your heart?" are emotional entry points — they must be visible.

## User Story

As a **user (logged-in or logged-out)**, I want to **read all text on every page without straining** so that **the app feels like a sanctuary rather than a puzzle I have to squint at**.

## Context

**Contrast math on `#0D0620` (hero-dark):**

| Opacity | Effective Color | Contrast Ratio | WCAG AA (body) | WCAG AA (large) |
|---------|----------------|----------------|----------------|-----------------|
| `text-white/20` | ~#363036 | ~1.3:1 | FAIL | FAIL |
| `text-white/30` | ~#4F4850 | ~1.8:1 | FAIL | FAIL |
| `text-white/40` | ~#686068 | ~2.5:1 | FAIL | FAIL |
| `text-white/50` | ~#807880 | ~3.2:1 | FAIL | PASS (large only) |
| `text-white/60` | ~#999298 | ~4.6:1 | PASS | PASS |
| `text-white/70` | ~#B2ABB0 | ~6.5:1 | PASS | PASS |

---

## Requirements

### 1. Opacity Standards

These are the new minimum opacity rules for all text on dark backgrounds:

| Use Case | Minimum Opacity | Rationale |
|----------|----------------|-----------|
| Body text (any readable content) | `text-white/70` | Comfortable reading, exceeds 4.5:1 |
| Secondary body text | `text-white/60` | Meets 4.5:1 AA minimum |
| Placeholder text | `text-white/50` | Meets 3:1 for large text; placeholders are transient hints. Combined with the input's lighter bg (`bg-white/[0.06]`), effective contrast improves slightly |
| Large text headings (18px+ or 14px bold) | `text-white/60` minimum | Meets 3:1 AA for large text |
| Decorative elements (icons, dividers, borders) | `text-white/20` to `text-white/40` OK | Non-text elements exempt from contrast requirements |
| Disabled / locked state indicators | `text-white/20` to `text-white/30` OK | Intentionally de-emphasized, not meant to be read |
| Hover/focus helper text | `text-white/50` minimum | Meets 3:1 for large text context |

After implementation, document these standards in `09-design-system.md`.

### 2. Systematic Replacement Rules

**Must change (readable text):**
- `text-white/30` used on body text, labels, descriptions, messages, timestamps → change to `text-white/60` or `text-white/70`
- `text-white/40` used on body text, labels, descriptions, messages, timestamps → change to `text-white/60` or `text-white/70`
- `placeholder:text-white/30` → change to `placeholder:text-white/50`
- `placeholder:text-white/40` → change to `placeholder:text-white/50`

**Evaluate case by case (may be decorative):**
- `text-white/30` on icons → OK to keep if purely decorative (e.g., locked badge silhouettes)
- `text-white/40` on divider text ("or" between login options) → change to `text-white/50`
- `text-white/20` on anything → OK only if it's a decorative element or intentionally hidden (locked badges, background decorations). If it's text a user should read, change to `text-white/60`

**Do NOT blanket find-and-replace.** Each occurrence needs individual evaluation because some `/30` and `/40` usages are intentionally decorative. The goal is: if a human is expected to read it, it must meet contrast requirements. If it's decorative or intentionally muted (locked badges, background patterns), it can stay low.

### 3. Component-by-Component Approach

Work through the codebase by component area in priority order:

**Priority 1 — High-traffic pages:**
- `HeroSection` — hero subtitle, placeholder text
- `Dashboard` and all dashboard widgets — card labels, secondary text, helper text
- `DailyHub` and all tab contents — section labels, hints, placeholder text
- `AskPage` — input placeholder, response secondary text
- `PrayerWall` — card secondary text, timestamps, category labels

**Priority 2 — Forms and inputs:**
- `AuthModal` — all placeholder text, helper text, divider text
- `InlineComposer` — placeholder, character count
- `PrayerComposer` — placeholder, labels
- `ReportDialog` — placeholder
- `RoutineBuilder` — input labels
- All other form components with placeholder or helper text

**Priority 3 — Content pages:**
- `BibleReader` — verse numbers, chapter navigation text
- `ReadingPlanDetail` — day labels, progress text
- `ChallengeDetail` — progress text, day labels
- `Insights` — chart labels, secondary text
- `Settings` — section descriptions, toggle labels

**Priority 4 — Everything else:**
- `SiteFooter` — footer text, crisis resource text
- `NotificationPanel` — timestamps, secondary text
- `Friends` — status text, streak displays
- All remaining files with `/30` or `/40` text opacity

### 4. Placeholder Text Special Handling

Placeholder text deserves special attention because this app uses placeholders as emotional prompts — "What's on your heart?", "Tell us how you're feeling...", "Share what's on your mind...". These are invitations, not generic "Enter email" placeholders. They must be visible.

- All `placeholder:text-white/30` → `placeholder:text-white/50`
- All `placeholder:text-white/40` → `placeholder:text-white/50`
- Verify the placeholder is legible against the input's background (usually `bg-white/5` or `bg-white/[0.06]`)

### 5. FeatureEmptyState Component

The `FeatureEmptyState` component uses `text-white/20` for the icon, making empty states feel ghostly rather than inviting:

- Icon opacity: `text-white/20` → `text-white/30` (still subtle but visible)
- Heading: verify at least `text-white/70`
- Description: verify at least `text-white/60`

### 6. Tailwind Config — No Changes Needed

Opacity values are standard Tailwind utilities. The fix is per-file class changes, not a config change.

### 7. Design System Documentation

After implementation, add a "Text Opacity Standards (WCAG AA)" section to `09-design-system.md`:

```markdown
### Text Opacity Standards (WCAG AA)

All text on dark backgrounds must meet these minimum opacity values:

| Use Case | Minimum | Class |
|----------|---------|-------|
| Primary text | 70% | `text-white/70` |
| Secondary text | 60% | `text-white/60` |
| Placeholder text | 50% | `placeholder:text-white/50` |
| Large headings (18px+) | 60% | `text-white/60` |
| Decorative / disabled | 20-40% | `text-white/20` to `text-white/40` |

Body text below `text-white/60` fails WCAG AA 4.5:1 on hero-dark (#0D0620).
Placeholder text below `placeholder:text-white/50` fails WCAG AA 3:1 on input backgrounds.
```

---

## Auth Gating

N/A — This is a cross-cutting CSS change. No interactive elements are added, removed, or changed. Existing auth gating on all features remains unchanged.

## Responsive Behavior

No layout changes. The opacity remediations apply identically across all breakpoints:

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 640px) | Same opacity standards; spot-check at 375px for legibility |
| Tablet (640-1024px) | Same opacity standards |
| Desktop (> 1024px) | Same opacity standards; spot-check at 1440px for legibility |

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

N/A — No data is stored. This is a pure CSS class change across the frontend codebase.

## Completion & Navigation

N/A — standalone remediation, not a Daily Hub feature.

## Design Notes

- Reference the existing dark theme: backgrounds range from `hero-dark` (#0D0620) to `hero-mid` (#1E0B3E) to `hero-deep` (#251248)
- The Dashboard Card Pattern uses `bg-white/5 backdrop-blur-sm border border-white/10`
- Inputs typically use `bg-white/5` or `bg-white/[0.06]` backgrounds
- The design system recon at `_plans/recon/design-system.md` has exact computed values for reference
- The `FeatureEmptyState` component is used in 10+ locations — changes propagate widely
- Visual hierarchy must be preserved: secondary text (`/60`) should still feel quieter than primary text (`/70` or `/80`), and decorative elements should remain subtle
- The app should still feel like a dark sanctuary, not a high-contrast accessibility theme

## Process

For each file:
1. Search for `text-white/30`, `text-white/40`, `placeholder:text-white/30`, `placeholder:text-white/40`, and `text-white/20`
2. For each occurrence, determine: is this readable text or decorative?
3. If readable text: increase to the appropriate minimum per the standards table
4. If decorative (icon, border, locked badge, background element): leave as-is
5. Ensure the change doesn't make previously-subtle elements too prominent (e.g., a timestamp that was intentionally quiet shouldn't become as loud as a heading)

## Out of Scope

- Color palette changes (hex values stay the same — only opacity values change)
- Background color changes (backgrounds stay as-is)
- Adding a high-contrast mode or theme toggle
- Font size changes
- Non-text contrast (icons, borders, decorative elements are exempt unless they convey meaning)
- Tailwind config changes

## Acceptance Criteria

- [ ] Zero occurrences of `text-white/30` on readable text (labels, descriptions, messages, timestamps)
- [ ] Zero occurrences of `text-white/40` on readable text
- [ ] Zero occurrences of `placeholder:text-white/30` or `placeholder:text-white/40`
- [ ] All body text meets WCAG AA 4.5:1 contrast ratio on its background
- [ ] All large text (18px+ or 14px bold) meets WCAG AA 3:1 contrast ratio
- [ ] All placeholder text is legible (minimum `placeholder:text-white/50`)
- [ ] Decorative elements (locked badges, background icons, dividers) may retain low opacity — explicitly exempt
- [ ] `FeatureEmptyState` icon is visible (minimum `/30`) and heading/description meet contrast standards
- [ ] Visual hierarchy is preserved — secondary text feels secondary (`/60`), not the same weight as primary text (`/70` or `/80`)
- [ ] No visual regressions: app still feels like a dark sanctuary, not a high-contrast accessibility theme
- [ ] All existing tests pass after changes (update any tests that assert specific opacity classes)
- [ ] Design system documentation updated in `09-design-system.md` with Text Opacity Standards section
- [ ] Visual spot-check on: landing page hero, dashboard (all widgets), Daily Hub (all 4 tabs), Ask page, Prayer Wall, Bible reader, Music page, Settings, Auth modal

## Test Requirements

- Run the full existing test suite — class name changes should not break functionality tests
- If any tests assert specific opacity classes (e.g., `expect(element).toHaveClass('text-white/40')`), update them to match the new values
- Visual spot-check at 375px and 1440px on 5+ pages for legibility
