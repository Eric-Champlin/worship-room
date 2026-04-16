# Hero Glow Orb Bleed + Verse-to-Soaking Flow

**Master Plan Reference:** N/A -- standalone feature

---

## Overview

Two refinements to the Daily Hub experience that improve atmospheric immersion and fix a broken user flow. The glow orb bleed removes a visual clipping artifact that makes the hero section feel boxed-in rather than sanctuary-like. The verse-to-soaking fix ensures users who click "Meditate on this verse" actually meditate on *that* verse -- not a random unrelated one -- preserving emotional continuity from discovery to contemplation.

## User Story

As a **logged-in user**, I want to click "Meditate on this verse" on the Daily Hub hero and arrive at the Soaking page with that same verse ready to meditate on, so that the emotional thread from reading to meditating is unbroken.

As a **logged-in user**, I want the hero's glow orb to bleed softly into the tab bar below instead of being sharply clipped, so that the page feels like one atmospheric space rather than stacked boxes.

## Requirements

### Functional Requirements

1. **GlowBackground overflow**: The `GlowBackground` root container must allow glow orbs to extend past its boundary (change `overflow-hidden` to `overflow-visible`). Orbs already have `pointer-events-none`, so no click interference.

2. **ScriptureSoaking custom verse from URL**: When navigating to `/meditate/soaking` with `verse`, `verseText`, and optionally `verseTheme` URL params, and the `verse` reference does NOT match any verse in the soaking list, the page must construct a synthetic `DailyVerse` from the URL params and use it instead of falling back to a random soaking verse.

3. **ScriptureSoaking matched verse**: When the `verse` param DOES match a soaking list verse, use that matched verse (existing behavior preserved).

4. **ScriptureSoaking no params**: When no URL params are present, pick a random soaking verse (existing behavior preserved).

5. **Verse preview on prestart**: The prestart screen must show a preview card displaying the queued verse text and reference before the user begins.

6. **"Try another verse"**: Clicking "Try another verse" shuffles through the soaking list only. It does not restore the custom URL verse. Once the user changes verses, that choice is respected.

7. **DailyHub link enhancement**: The "Meditate on this verse" link on the Daily Hub hero must pass `verseText` and `verseTheme` as additional URL params alongside the existing `verse` param.

8. **Dashboard VOTD widget link**: The same enhancement applies to the "Meditate on this verse" link in the `VerseOfTheDayCard` dashboard widget (same pattern, same params).

9. **Missing `verseText` fallback**: If only `verse` is present without `verseText`, fall back to existing behavior (match against soaking list, or random). No custom verse construction without text.

### Non-Functional Requirements

- **Performance**: No performance impact -- `overflow-visible` is a CSS-only change; URL param parsing is negligible.
- **Accessibility**: Verse preview card must be readable by screen readers. No new interactive elements requiring keyboard handling.
- **URL length**: Verse text (100-200 chars) + URL encoding is well within browser URL limits (~2000 chars).

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View Daily Hub hero + verse | Can view verse and "Meditate on this verse" link | Can view verse and link | N/A |
| Click "Meditate on this verse" | Navigates to `/meditate/soaking` which redirects to `/daily?tab=meditate` with auth redirect message | Navigates to `/meditate/soaking` with URL params, prestart screen shown | "Sign in to access guided meditations." (existing) |
| View verse preview on prestart | N/A (auth-gated page) | Sees queued verse text and reference | N/A |
| Click "Try another verse" | N/A (auth-gated page) | Shuffles to random soaking verse | N/A |
| Begin meditation | N/A (auth-gated page) | Meditation starts with the active verse | N/A |

All auth gating is existing and unchanged. ScriptureSoaking already redirects logged-out users.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Verse preview card: full width within `max-w-lg` container, `text-sm` verse text, `text-xs` reference |
| Tablet (640-1024px) | Same as mobile -- single column layout within `max-w-lg` |
| Desktop (> 1024px) | Same layout -- `max-w-lg` container constrains width, verse text scales to `sm:text-base` |

The GlowBackground overflow change is responsive by nature -- orbs already scale between mobile (`w-[300px]`) and desktop (`md:w-[600px]`). The bleed effect is proportional.

The verse preview card uses the existing light-themed styling of the ScriptureSoaking page (`bg-white/50`, `text-text-dark`). No theme changes in this spec.

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. The verse text comes from the curated Verse of the Day list (60 WEB translations) and is passed via URL params, not user-authored. No crisis detection required.

## Auth & Persistence

- **Logged-out users**: Cannot access ScriptureSoaking (redirected). The "Meditate on this verse" link is visible but navigating to it triggers the existing auth redirect.
- **Logged-in users**: All existing persistence is unchanged -- meditation session saves to `wr_meditation_history`, completion tracking via `markMeditationComplete('soaking')`, faith points via `recordActivity('meditate')`.
- **localStorage usage**: No new keys. No changes to existing keys.

## Completion & Navigation

All existing completion tracking is unchanged:
- `markMeditationComplete('soaking')` fires on timer completion
- `recordActivity('meditate')` fires on timer completion
- `saveMeditationSession()` saves to `wr_meditation_history`
- CompletionScreen CTAs remain the same

The only navigation change is enriching the URL params on the "Meditate on this verse" links (DailyHub hero + VerseOfTheDayCard widget).

## Design Notes

- **GlowBackground**: Currently uses `overflow-hidden`. Changing to `overflow-visible` allows the existing glow orbs (absolutely positioned, `pointer-events-none`, `will-change-transform`, `blur-[60px] md:blur-[80px]`) to render past the container edge. The orbs' natural radial gradient fade provides the soft bleed effect -- no new CSS needed.
- **Verse preview card**: Styled to match the ScriptureSoaking page's existing light theme -- `rounded-lg border border-gray-200 bg-white/50 p-4 text-center`. Verse text in `font-serif italic`. Reference in `text-xs text-text-light`. This is a **new visual element** on the prestart screen but uses existing page styling, not a new pattern.
- **No changes to GlowOrbs**: The orb configuration (sizes, positions, opacities, colors) is unchanged. Only the container's overflow property changes.
- **FrostedCard is NOT used** for the verse preview -- the Soaking page is light-themed, so the preview uses `bg-white/50` to match.

## Out of Scope

- Dark theme conversion of ScriptureSoaking page (separate concern)
- Changing glow orb sizes, positions, or opacities
- Adding verse preview to the exercise screen (verse is already shown via KaraokeTextReveal)
- Modifying the "Try another verse" behavior to include the custom verse in the rotation
- Backend API for verse delivery (Phase 3)
- Other pages that use GlowBackground (no changes needed -- overflow-visible is purely cosmetic and backward-compatible)

## Acceptance Criteria

- [ ] GlowBackground root container uses `overflow-visible` instead of `overflow-hidden`
- [ ] Hero glow orb on Daily Hub bleeds softly past the hero section's bottom edge into the tab bar area (no sharp cutoff)
- [ ] No visual regressions on homepage sections (JourneySection, DashboardPreview, DifferentiatorSection, FinalCTA), Song Pick section, or any other GlowBackground consumer
- [ ] ScriptureSoaking reads `verseText` and `verseTheme` URL params from the URL
- [ ] When `verse` + `verseText` are present and the reference does NOT match a soaking list verse, a custom `DailyVerse` is constructed from URL params
- [ ] Prestart screen displays a verse preview card showing the queued verse's text (in serif italic) and reference
- [ ] Preview card updates when "Try another verse" is clicked (shows the newly selected soaking verse)
- [ ] `handleBegin` passes the correct verse (custom from URL or from soaking list) to the exercise screen
- [ ] Exercise screen shows the correct verse text in KaraokeTextReveal when using a custom URL verse
- [ ] "Try another verse" shuffles through soaking list verses only (does not restore the custom URL verse)
- [ ] DailyHub "Meditate on this verse" link passes `verseText` and `verseTheme` URL params alongside `verse`
- [ ] VerseOfTheDayCard "Meditate on this verse" link passes `verseText` and `verseTheme` URL params alongside `verse`
- [ ] When `verse` param matches a soaking list verse, existing behavior preserved (matched verse used)
- [ ] When no URL params are present, existing behavior preserved (random soaking verse)
- [ ] When `verse` is present but `verseText` is absent, existing behavior preserved (match or random, no custom verse)
- [ ] URL-encoded special characters (apostrophes, quotation marks) in verse text decode and render correctly
- [ ] All completion tracking (meditation session, faith points, completion marking) unchanged
- [ ] All auth gating unchanged (logged-out redirect on ScriptureSoaking)
