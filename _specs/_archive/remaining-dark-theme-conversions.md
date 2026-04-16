# Feature: Remaining Dark Theme Conversions

**Master Plan Reference:** N/A — standalone visual polish spec. Builds on dark theme established in `dark-theme-remaining-pages.md` (Spec 4 of 6), completing the final four surfaces that were missed or deferred.

---

## Overview

Four surfaces in the app still use light/white backgrounds, breaking the dark sanctuary immersion that the rest of the app maintains. The error boundary fallback, auth modal, Music page browse surface, and (potentially) the 404 page all present jarring white backgrounds when the rest of Worship Room is a cinematic dark experience. This spec converts them all to the dark theme, ensuring no light-themed surface exists anywhere a user can navigate.

For a user in emotional distress seeking comfort, visual consistency matters. A sudden white flash from an error page or login modal disrupts the sanctuary atmosphere the app works hard to maintain.

## User Story

As a **logged-out visitor or logged-in user**, I want every surface in Worship Room to use the dark theme, so that no screen — not even an error page or login modal — breaks the immersive, peaceful atmosphere.

## Requirements

### 1. Error Boundary Page (ChunkErrorBoundary fallback)

**Current state:** White/light gray background, dark navy heading "Something went wrong", gray body text, purple "Refresh Page" button. No Layout wrapper (no navbar/footer).

**Target state:**

- **Background**: `bg-hero-dark` (#0D0620) full-screen, or the dashboard gradient — whichever is already used by similar full-page states
- **Heading**: `text-white font-bold text-2xl` — warm the copy to "Let's try that again" or "We hit a bump"
- **Body text**: `text-white/70` — warm the copy to something like "Sometimes things don't load as expected. A quick refresh usually does the trick."
- **Button**: Keep the purple primary button style (`bg-primary text-white`), ensure sufficient contrast on dark background
- **Branding**: Add the Worship Room logo or a subtle icon (e.g., a small cross or dove SVG) above the heading for brand continuity
- **Layout**: Wrap in `<Layout>` so navbar and footer are present, giving the user navigation options even on error
- **Centering**: Content centered vertically and horizontally within the viewport

### 2. Auth Modal (Login + Create Account + Password Reset views)

**Current state:** White background modal with dark text labels, light-themed input fields with gray borders, purple "Log In" / "Create Account" button, green "Continue with Spotify" button. Feels like a completely different app from the dark content behind it.

**Target state:**

#### Modal Container
- Background: `bg-hero-mid/95 backdrop-blur-xl border border-white/10 rounded-2xl`
- Keep existing backdrop overlay behind the modal

#### Headings & Text
- "Log In" / "Create Account" heading: `text-white font-script` (keep Caveat font)
- Labels (Email, Password, etc.): `text-white/80 font-medium`
- "No account? Create one!" / "Already have an account? Log in": `text-white/60` with link portion in `text-primary-lt`
- "Forgot password?" link: `text-primary-lt hover:text-primary`

#### Input Fields
- Background: `bg-white/[0.06] border border-white/10 text-white placeholder:text-white/40 rounded-xl`
- Focus state: `focus:border-primary focus:ring-1 focus:ring-primary/50`
- Match the Pray tab textarea input style

#### Buttons
- "Log In" / "Create Account": Keep `bg-primary text-white` purple button
- "Continue with Spotify": Convert from solid green to ghost style — `bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 hover:bg-[#1DB954]/30`

#### Decorative Elements
- Divider "or" line: `border-white/10` with `text-white/40`
- Close X button: `text-white/60 hover:text-white`

#### All Three Views
The same dark treatment applies to all three modal states: Login, Create Account, and Password Reset.

### 3. Music Page Browse Surface

**Current state:** Dark gradient hero at top, then switches to `bg-neutral-bg` (#F5F5F5) light background. Tab labels are dark text. Cards use `bg-white rounded-xl border border-gray-200 shadow-sm`.

**Target state:**

#### Page Background
- Replace `bg-neutral-bg` with `bg-hero-dark` or `bg-gradient-to-b from-hero-mid to-hero-dark` — match the pattern used by Daily Hub, Grow, Prayer Wall

#### Tab Bar
- Tab labels: `text-white/70` inactive, `text-white` active (match Daily Hub tab styling)
- Keep purple active indicator underline

#### Ambient Sounds Tab — Scene Cards
- Scene cards already have dark gradient overlays on background images — remove the white card wrapper
- Use `border border-white/10 rounded-xl` for subtle edge definition on the dark background
- Heart/favorite icon: `text-white/60 hover:text-white`

#### Worship Playlists Tab — Playlist Cards
- Convert from white cards to frosted glass: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- Title text: `text-white`
- Description text: `text-white/60`
- Spotify embed iframes already have their own dark theme and should look natural on the dark background

#### Sleep & Rest Tab
- Same frosted glass card treatment as Worship Playlists
- All text follows the same white/opacity hierarchy

#### Section Headings
- All section headings ("All Scenes", "Featured", etc.): `text-white font-semibold` instead of dark text

#### Do NOT Change
- `AudioDrawer` and `AudioPill` — these are already dark-themed
- Only convert the Music page browse surfaces (the page content area)

### 4. 404 Page (verification + fix if needed)

**Current state:** Verify whether the `NotFound` component uses dark or light theme. It's wrapped in `<Layout>` per earlier audit.

**Target state:**
- If already dark-themed: no changes needed
- If light-themed: apply the same dark background treatment as the error boundary — `bg-hero-dark`, `text-white` heading, `text-white/70` body, purple "Go Home" button
- Use warm copy: keep "Page Not Found" heading but warm the body text (e.g., "This page doesn't exist, but there's plenty of peace to find elsewhere.")

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View error boundary | Can view (full page, no auth needed) | Can view | N/A |
| View 404 page | Can view (full page, no auth needed) | Can view | N/A |
| Auth modal interaction | Views the modal itself (this IS the auth surface) | Never sees the modal (already logged in) | N/A |
| Music page browsing | Can browse all tabs, view all cards | Can browse + favorite sounds | N/A (favorites already gated) |

No new auth gates are introduced by this spec. All changes are purely visual.

## Responsive Behavior

| Breakpoint | Error Boundary | Auth Modal | Music Page | 404 Page |
|-----------|---------------|------------|------------|----------|
| Mobile (< 640px) | Centered content, smaller heading, full-width button | Modal takes ~95% width, inputs stack vertically | Single-column card grid, tabs scroll horizontally if needed | Centered content, full-width button |
| Tablet (640-1024px) | Same centered layout | Modal at ~480px max-width | 2-column card grid | Same centered layout |
| Desktop (> 1024px) | Same centered layout | Modal at ~480px max-width | 3-column card grid (scenes), 2-column (playlists) | Same centered layout |

The responsive layout of each component does not change — only the colors and backgrounds are converted. Existing responsive behavior is preserved.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. This is a purely visual/CSS conversion.

## Auth & Persistence

- **Logged-out users:** All four surfaces are visible to logged-out users. No data persistence involved.
- **Logged-in users:** Same visual experience. No new data storage.
- **localStorage usage:** None — no new keys introduced.
- **Route types:** Error boundary (any route), Auth modal (overlay on any route), Music page (public), 404 (public)

## Completion & Navigation

N/A — standalone visual polish feature. No completion tracking.

## Design Notes

- **Design system recon** (`_plans/recon/design-system.md`): Reference the Dashboard Card Pattern for frosted glass treatment: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`. The Music page cards should use this exact pattern.
- **Inner Page Hero gradient** from recon: `radial-gradient(100% 80% at 50% 0%, rgb(59, 7, 100) 0%, rgba(0, 0, 0, 0) 60%), linear-gradient(rgb(13, 6, 32) 0%, rgb(30, 11, 62) 30%, rgb(74, 29, 150) 55%, rgb(245, 245, 245) 100%)` — the Music page hero currently fades to `#F5F5F5`; it should now fade into the dark page background instead.
- **Auth modal** is the existing `AuthModal.tsx` component from `components/prayer-wall/`. The structure and functionality remain unchanged — only visual classes change.
- **Input field dark pattern**: Match the Pray tab textarea style (already dark-themed with `bg-white/[0.06]` inputs and cyan glow). The auth modal should feel like it belongs to the same design language.
- **Spotify embed dark theme**: Spotify iframes render their own dark UI. No wrapper changes needed — just ensure the surrounding card/container is also dark so there's no white gap.
- **Error boundary and 404**: These are rare surfaces but important for brand consistency. A user hitting an error while upset should not get a clinical white screen.
- **No new visual patterns**: All patterns (frosted glass cards, dark backgrounds, white/opacity text hierarchy) are already established. This spec applies existing patterns to surfaces that were missed.

### Design Tokens Reference

| Element | Class |
|---------|-------|
| Page background | `bg-hero-dark` or dashboard gradient |
| Card background | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` |
| Modal background | `bg-hero-mid/95 backdrop-blur-xl border border-white/10 rounded-2xl` |
| Heading text | `text-white` |
| Body text | `text-white/70` |
| Secondary text | `text-white/50` |
| Input background | `bg-white/[0.06] border border-white/10 text-white` |
| Input placeholder | `placeholder:text-white/40` |
| Input focus | `focus:border-primary focus:ring-1 focus:ring-primary/50` |
| Link text | `text-primary-lt hover:text-primary` |
| Divider | `border-white/10` |
| Button primary | `bg-primary text-white` |

## Out of Scope

- Auth modal form validation improvements (separate spec covers this)
- Auth modal "Continue with Spotify" button removal or functional changes
- Music page layout restructuring (only visual theme conversion)
- Content changes to the Music page (same cards, same content, just dark)
- AudioDrawer or AudioPill changes (already dark-themed)
- Light mode toggle (Phase 4)
- Any backend changes

## Acceptance Criteria

- [ ] Error boundary page renders with dark background (`bg-hero-dark`), warm copy ("Let's try that again" or similar), and Worship Room branding element above the heading
- [ ] Error boundary page is wrapped in `<Layout>` with navbar and footer visible
- [ ] Error boundary "Refresh Page" button has sufficient contrast on dark background (WCAG AA)
- [ ] Auth modal Login view renders with dark frosted glass background (`bg-hero-mid/95`), white text labels, dark translucent inputs
- [ ] Auth modal Create Account view renders with the same dark treatment as Login
- [ ] Auth modal Password Reset view (if it exists) renders with the same dark treatment
- [ ] Auth modal inputs show purple focus glow (`focus:border-primary focus:ring-1 focus:ring-primary/50`) when focused
- [ ] Auth modal "Continue with Spotify" button uses ghost/outlined style (`bg-[#1DB954]/20 text-[#1DB954]`) instead of solid green
- [ ] Auth modal close X button is visible on dark background (`text-white/60`)
- [ ] Auth modal divider line uses `border-white/10`
- [ ] Music page has no `bg-neutral-bg` or `#F5F5F5` or white backgrounds anywhere on the page
- [ ] Music page scene cards sit naturally on dark background with `border-white/10` edge definition
- [ ] Music page playlist cards use frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10`)
- [ ] Music page tab labels use `text-white/70` (inactive) and `text-white` (active)
- [ ] Music page section headings use `text-white font-semibold`
- [ ] Music page hero gradient fades into dark background (not into `#F5F5F5`)
- [ ] 404 page is dark-themed (verified or converted)
- [ ] Spotify embed iframes render correctly on dark backgrounds with no white gaps or visual glitches
- [ ] All interactive elements on converted surfaces maintain WCAG AA contrast (4.5:1 for text, 3:1 for large text/UI)
- [ ] All existing Music page functionality still works: tab switching, scene card playback, playlist embed loading, favorite toggling, sleep content browsing
- [ ] Auth modal still functions: tab switching between login/register, form validation messages visible on dark background, focus trapping, Escape to close, focus restoration on close
- [ ] Mobile responsive: all four converted surfaces look correct at 375px width
- [ ] Tablet responsive: all four converted surfaces look correct at 768px width
- [ ] Desktop: all four converted surfaces look correct at 1440px width
- [ ] No light-themed surfaces remain anywhere in the app when navigating all routes
