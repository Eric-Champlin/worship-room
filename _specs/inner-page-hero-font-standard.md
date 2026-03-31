# Feature: Inner Page Hero Font Standardization

**Master Plan Reference:** N/A -- standalone visual polish feature (Round 3)

**Related Spec:** `_specs/inner-page-hero-redesign.md` (completed in Round 2 -- established atmospheric hero backgrounds; this spec standardizes the heading typography within those heroes)

---

## Overview

The home page hero heading ("How're You Feeling Today?") uses a striking gradient text treatment -- large, bold Inter font with the signature 223-degree white-to-purple gradient via `background-clip: text`. The inner page heroes all use Caveat script font at `text-3xl sm:text-4xl` with a simpler left-to-right Tailwind gradient. This creates visual inconsistency: the home page feels bold and modern, while inner pages feel smaller and less cohesive.

This spec standardizes all inner page hero headings to match the home page hero's visual language -- larger font, the same 223-degree gradient, and consistent subtitle styling -- while preserving Caveat script as an accent on one word per heading for personality. The result: navigating between pages feels like moving through rooms of the same sanctuary.

---

## User Story

As a **logged-out visitor or logged-in user**, I want all page hero headings to share the same bold gradient text treatment as the home page, so that the app feels like one unified, beautiful experience rather than a collection of separate pages.

---

## Requirements

### 1. Standard Hero Heading Pattern

The home page hero (`HeroSection.tsx`) establishes the reference:

- **Gradient**: `WHITE_PURPLE_GRADIENT` constant -- `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` applied via inline style with `backgroundClip: 'text'` and `WebkitTextFillColor: 'transparent'`
- **Font sizing**: `text-4xl sm:text-5xl lg:text-7xl font-bold`
- **Font family**: Inter (the default sans-serif body font)

**The standard for inner page heroes:**

- **Heading text**: `text-3xl sm:text-4xl lg:text-5xl font-bold` -- slightly smaller than the home page hero (which is `lg:text-7xl`) since inner page titles are shorter and shouldn't dominate
- **Gradient treatment**: Apply the same `WHITE_PURPLE_GRADIENT` via inline style (matching `HeroSection.tsx` exactly), NOT the current Tailwind `bg-gradient-to-r from-white to-primary-lt` which produces a different angle
- **Caveat script accent**: One word in each heading uses `font-script` (Caveat) for personality -- rendered inline within the gradient heading
- **Subtitle**: `text-white/60 text-base sm:text-lg` in `font-serif italic` (Lora) -- consistent across all pages

**Currently inner pages use:** `font-script text-3xl sm:text-4xl` with Tailwind gradient classes. The entire heading is in Caveat. This spec changes the heading to Inter with only the accent word in Caveat, scales up the size, and switches to the correct 223-degree gradient.

### 2. Heading Content Per Page

| Page | Heading | Script Accent Word | Subtitle |
|------|---------|-------------------|----------|
| Prayer Wall | "Prayer *Wall*" | Wall | "You're not alone." |
| Bible Browser | "The *Bible*" | Bible | "The Word of God" |
| Grow | "Your *Growth*" | Growth | "Plans and challenges to deepen your faith." |
| Music | "*Music*" | Music | "Worship, rest, and find peace in God's presence." |
| Churches | "Find a *Church*" | Church | "Connect with a local faith community." |
| Counselors | "Find a *Counselor*" | Counselor | "Professional support for your journey." |
| Celebrate Recovery | "Celebrate *Recovery*" | Recovery | "Healing from hurts, habits, and hang-ups." |
| Ask | "Ask God's *Word*" | Word | _(existing subtitle/search area preserved)_ |
| My Prayers | "My *Prayers*" | Prayers | "Your personal conversation with God." |
| Insights | "Mood *Insights*" | Insights | _(existing subtitle)_ |
| Monthly Report | "Monthly *Report*" | Report | _(existing subtitle)_ |
| Friends | "*Friends*" | Friends | _(existing subtitle)_ |
| Settings | "*Settings*" | Settings | _(existing subtitle)_ |
| Routines | "Bedtime *Routines*" | Routines | _(existing subtitle)_ |
| Challenge Detail | _(challenge title)_ | _(last word)_ | _(existing subtitle)_ |
| Bible Reader | _(book + chapter)_ | _(book name)_ | _(none -- dynamic content)_ |
| Growth Profile | _(user name's) *Garden*_ | Garden | _(existing subtitle)_ |

**Note:** The exact heading text and script word choices above are suggestions. If a page's current heading text works well, keep it and just apply the visual standardization. The key requirement is visual consistency (gradient + sizing + one Caveat accent word), not necessarily changing words.

### 3. Update PageHero.tsx (Shared Component)

The shared `PageHero` component is used by multiple pages. Update it to:

- Apply the `WHITE_PURPLE_GRADIENT` inline style (same technique as `HeroSection.tsx`) instead of the current Tailwind gradient classes
- Support a `scriptWord` prop to specify which word in the title gets `font-script` treatment
- Scale up to the standardized font sizing (`text-3xl sm:text-4xl lg:text-5xl`)
- Keep existing `HeadingDivider` support
- Keep existing `ATMOSPHERIC_HERO_BG` background (from the inner-page-hero-redesign spec)

### 4. Update PrayerWallHero and LocalSupportHero

These are separate hero components that need the same gradient + sizing treatment:

- **PrayerWallHero**: Currently `font-script text-3xl sm:text-4xl` with Tailwind gradient. Update to match the standard pattern.
- **LocalSupportHero**: Currently `font-script text-3xl sm:text-4xl` with Tailwind gradient. Update to match.

### 5. Update Individual Page Heroes

Several pages render their own hero heading inline (not via a shared component). Each needs updating:

- `pages/BibleBrowser.tsx`
- `pages/BibleReader.tsx`
- `pages/GrowPage.tsx` (if it has its own hero)
- `pages/MusicPage.tsx` (if it has its own hero)
- `pages/Insights.tsx`
- `pages/MonthlyReport.tsx`
- `pages/Friends.tsx`
- `pages/Settings.tsx`
- `pages/RoutinesPage.tsx`
- `pages/GrowthProfile.tsx`
- `pages/ChallengeDetail.tsx`

For each: replace the current `font-script text-3xl sm:text-4xl bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent` pattern with the standardized gradient + sizing + Caveat accent word pattern.

### 6. Daily Hub Greeting -- Special Case (DO NOT CHANGE)

The Daily Hub has a time-of-day greeting ("Good Morning!", "Good Afternoon!", "Good Evening!") in Caveat script. This is a personalized warm greeting, not a structural page heading. **Do not change it.** The Caveat greeting is part of the Daily Hub's unique personality.

If the Daily Hub has a separate static heading below the greeting, apply the gradient treatment to that. But the greeting itself stays as-is.

### 7. Gradient Implementation Consistency

The `WHITE_PURPLE_GRADIENT` constant already exists at `constants/gradients.ts`. All inner page heroes must use this constant applied via inline style (matching `HeroSection.tsx`), not Tailwind gradient classes. This ensures the 223-degree angle is consistent everywhere.

The Tailwind approach (`bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`) produces a 90-degree left-to-right gradient. The home page uses 223 degrees. These look visibly different. Standardize on the 223-degree version.

---

## Responsive Behavior

| Breakpoint | Heading Size | Subtitle Size |
|-----------|-------------|---------------|
| Mobile (< 640px) | `text-3xl` (1.875rem) | `text-base` (1rem) |
| Tablet (640-1024px) | `text-4xl` (2.25rem) | `text-lg` (1.125rem) |
| Desktop (> 1024px) | `text-5xl` (3rem) | `text-lg` (1.125rem) |

- No heading text should be cut off at any viewport width (375px, 768px, 1440px)
- The Caveat accent word should wrap naturally with the heading -- no forced line breaks
- Responsive sizing uses Tailwind responsive prefixes: `text-3xl sm:text-4xl lg:text-5xl`

---

## Auth Gating

N/A -- this is a visual-only change to heading styles. No interactive elements are being added or modified. All existing auth behavior on these pages remains unchanged.

---

## AI Safety Considerations

N/A -- this feature does not involve AI-generated content or free-text user input. No crisis detection required.

---

## Auth & Persistence

- **Logged-out users:** See the updated hero headings on all public pages
- **Logged-in users:** See the updated hero headings on all pages including protected routes
- **localStorage usage:** None -- purely visual change
- **Route types:** Affects both public and protected routes (visual only)

---

## Completion & Navigation

N/A -- standalone visual polish feature. No completion tracking or navigation changes.

---

## Design Notes

- **Gradient constant**: Use the existing `WHITE_PURPLE_GRADIENT` from `constants/gradients.ts` (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`)
- **Application technique**: Match `HeroSection.tsx` exactly -- inline style with `backgroundImage`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`
- **Caveat accent**: The accent word should be wrapped in a `<span className="font-script">` within the heading. The gradient should flow across both the Inter and Caveat portions seamlessly (since the gradient is on the parent `<h1>`)
- **Hero backgrounds**: The `ATMOSPHERIC_HERO_BG` pattern (radial gradient with subtle purple glow on `#0f0a1e`) from the inner-page-hero-redesign spec is preserved. This spec only changes the text treatment within the hero, not the hero background.
- **Design system recon**: The design system recon (`_plans/recon/design-system.md`) documents the current state where Hero H1 is Caveat 72px/48px bold white. This spec intentionally changes that pattern.
- **New visual pattern**: The "Inter heading with inline Caveat accent word + 223-degree gradient" pattern is new. It exists conceptually on the home page (minus the Caveat accent) but the combination of Inter + Caveat accent within a single gradient heading is new. Mark derived values as `[UNVERIFIED]` during planning until visually confirmed.

---

## Out of Scope

- **Home page hero changes** -- it's already the reference; don't touch it
- **Daily Hub time-of-day greeting** -- "Good Morning!" stays in Caveat as-is
- **Daily Hub tab headings** -- "What's On Your Heart?", "What's On Your Mind?", "What's On Your Spirit?" are tab-level headings inside content areas, not page heroes
- **Hero background changes** -- backgrounds were standardized in the inner-page-hero-redesign spec
- **Landing page VOTD section** -- separate spec
- **Content width changes** -- handled by prior specs
- **Seasonal banner changes** -- separate concern
- **Dashboard hero** -- the `DashboardHero` has its own greeting pattern; evaluate separately if needed
- **Backend changes** -- purely frontend visual work

---

## Test Requirements

- Run existing tests -- heading text changes may require test updates if tests assert on heading content or class names
- Visual verification at 375px, 768px, and 1440px on all affected pages
- Verify the gradient renders correctly (not falling back to solid color) on all pages
- Verify the Caveat accent word renders correctly within the gradient heading (same gradient flows across both fonts)
- Verify no text cutoff on any heading at any viewport width
- Verify the Daily Hub greeting is unchanged
- Verify `HeadingDivider` still works correctly on pages that use it (Ask, Prayer Wall)

---

## Acceptance Criteria

- [ ] All inner page hero headings use the `WHITE_PURPLE_GRADIENT` constant (`linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)`) applied via inline style with `backgroundClip: 'text'`
- [ ] The gradient is visually identical to the home page hero (same 223-degree angle, same colors, same `background-clip` technique)
- [ ] Each inner page heading has exactly one word rendered in Caveat script font (`font-script`) for personality, with the rest in Inter
- [ ] Inner page hero headings use `text-3xl sm:text-4xl lg:text-5xl font-bold` sizing
- [ ] Subtitles use consistent styling across all pages: `font-serif italic text-base sm:text-lg text-white/60`
- [ ] `PageHero.tsx` supports the gradient treatment and `scriptWord` prop
- [ ] `PrayerWallHero.tsx` uses the standardized gradient + font pattern
- [ ] `LocalSupportHero.tsx` uses the standardized gradient + font pattern
- [ ] Pages with inline hero headings (BibleBrowser, BibleReader, Insights, Friends, Settings, etc.) are all updated
- [ ] Daily Hub "Good Morning!" greeting remains in Caveat script and is not changed
- [ ] No heading text is cut off at any viewport width (375px, 768px, 1440px)
- [ ] `HeadingDivider` continues to render correctly on pages that use it
- [ ] The Caveat accent word and Inter text share the same gradient seamlessly (no color break at font boundary)
- [ ] All existing hero functionality is preserved (atmospheric backgrounds, navigation, scroll behavior, seasonal banners)
- [ ] All existing tests pass (with updates as needed for changed heading text/classes)
- [ ] The overall effect: navigating between pages feels like moving through rooms of the same sanctuary
