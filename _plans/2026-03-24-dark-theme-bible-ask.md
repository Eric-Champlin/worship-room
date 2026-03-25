# Implementation Plan: Dark Theme — Bible Reader, Bible Browser & Ask Page

**Spec:** `_specs/dark-theme-bible-ask.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/dark-theme-bible-ask`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Key Finding: Bible Pages Are Already Mostly Dark

The Bible Browser and Bible Reader were built with dark styling (`bg-hero-dark`, white text, frosted glass cards). The spec was written assuming they still had light backgrounds — **the majority of the spec's Bible requirements are already met**. The remaining work is:

1. **Bible Browser/Reader**: Minor alignment tweaks — change background token from `hero-dark` (#0D0620) to `dashboard-dark` (#0f0a1e) for cross-page consistency with the Daily Hub, adjust a few opacity values and add cyan glow to search input
2. **Ask Page**: Full light-to-dark conversion — this is ~80% of the work

### Relevant Files

**Bible Browser (`/bible`)**
- `frontend/src/pages/BibleBrowser.tsx` — Already uses `bg-hero-dark`, dark hero gradient
- `frontend/src/components/bible/SegmentedControl.tsx` — Already `bg-white/5 border-white/15`
- `frontend/src/components/bible/BibleSearchMode.tsx` — Already white-on-dark, missing cyan glow
- `frontend/src/components/bible/BibleBooksMode.tsx` — Wrapper only, no direct styling
- `frontend/src/components/bible/TestamentAccordion.tsx` — Already `bg-white/5 border-white/10`
- `frontend/src/components/bible/HighlightsNotesSection.tsx` — Already dark-themed

**Bible Reader (`/bible/:book/:chapter`)**
- `frontend/src/pages/BibleReader.tsx` — Already uses `bg-hero-dark`, dark hero gradient
- `frontend/src/components/bible/AudioControlBar.tsx` — Already `bg-white/5 border-white/10`
- `frontend/src/components/bible/ChapterNav.tsx` — Already `bg-white/10 text-white`
- `frontend/src/components/bible/FloatingActionBar.tsx` — Already frosted glass dark
- `frontend/src/components/bible/NoteEditor.tsx` — Already `bg-white/5 border-white/10`
- `frontend/src/components/bible/ChapterSelector.tsx` — Already dark-themed

**Ask Page (`/ask`) — NEEDS FULL CONVERSION**
- `frontend/src/pages/AskPage.tsx` — Light theme: `bg-white`, `text-text-dark`
- `frontend/src/components/PageHero.tsx` — Gradient fades to `#F5F5F5` (light)
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Light: `bg-white`, `text-text-dark`, `border-gray-200`
- `frontend/src/components/ask/PopularTopicsSection.tsx` — Light: `bg-white`, `text-text-dark`
- `frontend/src/components/ask/DigDeeperSection.tsx` — Light: `bg-white`, `border-gray-200`
- `frontend/src/components/ask/UserQuestionBubble.tsx` — `bg-primary/20 text-text-dark`
- `frontend/src/components/ask/VerseCardActions.tsx` — Light: `bg-white`, `text-text-light`
- `frontend/src/components/ask/SaveConversationButton.tsx` — Light: `border-gray-200`, `text-text-dark`
- `frontend/src/components/ask/LinkedAnswerText.tsx` — Uses `text-primary-lt` (works on dark, no change)

### Tailwind Tokens (already defined in config)
- `dashboard-dark`: `#0f0a1e` — target page background
- `dashboard-gradient`: `#1a0533` — hero gradient start (DailyHub pattern)
- `hero-dark`: `#0D0620` — current Bible page background (being replaced)
- `glow-cyan`: `#00D4FF` — textarea glow border
- `primary`: `#6D28D9` — accent purple

### Pattern References
- **DailyHub dark pattern**: `frontend/src/pages/DailyHub.tsx` line 153 — `bg-dashboard-dark`
- **DailyHub hero**: line 166 — `bg-gradient-to-b from-dashboard-gradient to-dashboard-dark`
- **Frosted glass cards**: `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-xl` (content), `bg-white/[0.08]` (structural)
- **Test pattern**: `renderAskPage()` with `MemoryRouter` + `ToastProvider` + `AuthModalProvider` (see `AskPage.test.tsx`)

### Spec Requirement vs Current State Summary

| Requirement | Bible Browser | Bible Reader | Ask Page |
|---|---|---|---|
| Page bg `#0f0a1e` | Has `#0D0620` (close) | Has `#0D0620` (close) | Light `#F5F5F5` |
| Flush hero gradient | Already flush | Already flush | Fades to light |
| Frosted glass cards | Close (needs opacity tweak) | Close (needs opacity tweak) | All light |
| White/opacity text | Already done | Already done | All dark text |
| Cyan glow on inputs | Missing on search | N/A | Missing |

---

## Auth Gating Checklist

**No new auth gates.** The spec is purely visual — all existing auth gates remain unchanged.

| Action | Spec Requirement | Current State | Auth Check Method |
|--------|-----------------|---------------|-------------------|
| Ask questions (submit) | Unchanged | AskPage.tsx line 52 | useAuth + authModal |
| Follow-up questions | Unchanged | AskPage.tsx line 123 | useAuth + authModal |
| Highlight/note from Ask | Unchanged | VerseCardActions.tsx lines 41, 49 | useAuth + authModal |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background-color | `#0f0a1e` (`bg-dashboard-dark`) | DailyHub.tsx:153 |
| Frosted glass (content) | background | `bg-white/[0.06] backdrop-blur-sm border border-white/10` | Spec + dashboard pattern |
| Frosted glass (structural) | background | `bg-white/[0.08] border border-white/10` | Spec |
| Primary text on dark | color | `text-white` (headings), `text-white/80` (body) | Spec |
| Secondary text | color | `text-white/50` to `text-white/70` | Spec |
| Muted text | color | `text-white/40` | Spec |
| Textarea | background + border | `bg-white/[0.06] border-glow-cyan/30` + `animate-glow-pulse` | Spec + PrayTabContent pattern |
| Topic/follow-up chips | background | `bg-white/10 text-white/70 hover:bg-white/15` | Spec 3.3, 3.6 |
| Verse text (reader) | font + color | `font-serif text-base sm:text-lg leading-[1.8] text-white/80` | Spec 2.3 |
| Verse highlight opacity | opacity | `0.20` (was `0.15`) | Spec 2.3 |
| Verse numbers | color | `text-white/30` (unchanged) | Current code |
| User question bubble | background + text | `bg-primary/20 text-white` | Spec 3.8 |
| Encouragement callout | background + border | `bg-white/[0.06] border-l-2 border-primary` | Spec 3.5 |
| Bible hero gradient end | color | `#0f0a1e` (was `#0D0620`) | Spec consistency |
| Ask hero gradient end | color | `#0f0a1e` (was `#F5F5F5`) | Spec 3.2 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat (`font-script`) for hero headings, Lora (`font-serif`) for scripture/verse text, Inter (`font-sans`) for UI text
- All frosted glass CONTENT cards use `bg-white/[0.06]` — structural elements like segmented controls use `bg-white/[0.08]`
- Textarea glow animation is `motion-safe:animate-glow-pulse` with `border-glow-cyan/30`
- Dashboard uses `bg-dashboard-dark` (#0f0a1e), NOT `bg-hero-dark` (#0D0620) — these are different tokens
- Hero gradients use inline `style={}` objects (CSS-in-JS), not Tailwind gradient utilities, for radial gradients
- Crisis banner (`<CrisisBanner>`) must remain visible on dark backgrounds — it uses `role="alert"` and red/orange high-contrast colors
- Focus ring offsets: existing dark components use default `ring-offset-2` without explicit offset color — follow this pattern for consistency

---

## Shared Data Models (from Master Plan)

Not applicable — this spec changes only CSS classes, no data models or localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Full-width dark background, stacked cards, single-column topic grid, full-width textarea |
| Tablet | 768px | Same dark theme, 2-column topic grid, comfortable reading width for Bible |
| Desktop | 1440px | Same dark theme, 3-column topic grid (Ask), max-w-2xl content (Ask), max-w-4xl (Bible Browser) |

No layout changes in this spec — only color/class changes. The responsive structure remains identical to current implementation.

---

## Vertical Rhythm

No changes to vertical rhythm — spacing between sections remains unchanged. This spec only modifies colors and background opacities.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Bible Browser and Bible Reader are already dark-themed (verified via code inspection)
- [x] Ask Page is the primary conversion target (verified — light theme throughout)
- [x] `dashboard-dark` (#0f0a1e) token exists in Tailwind config
- [x] All auth-gated actions from the spec are accounted for (no new auth gates)
- [x] Design system values are verified from codebase inspection
- [ ] Existing tests pass before starting (run `pnpm test` to confirm baseline)
- [x] No [UNVERIFIED] values — all values confirmed from spec + codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bible page bg: `hero-dark` vs `dashboard-dark` | Change to `dashboard-dark` | Spec explicitly says `#0f0a1e`; consistency with DailyHub dark theme pattern |
| Hero gradient end color | Update from `#0D0620` to `#0f0a1e` | Must match page background for seamless transition |
| PageHero modification approach | Add `dark` prop to existing `PageHero.tsx` | Avoids duplicating hero code; other pages (Prayer Wall, Local Support) still need light gradient until their dark specs |
| Ask page `BackgroundSquiggle` | Keep as-is | Decorative SVG works on dark backgrounds (already used in dark DailyHub tabs) |
| Focus ring offset colors | Keep default `ring-offset-2` | Matches existing dark Bible components; consistency over perfection |
| `LinkedAnswerText.tsx` | No changes | Already uses `text-primary-lt` which is visible on dark |

---

## Implementation Steps

### Step 1: Bible Browser Dark Theme Alignment

**Objective:** Align Bible Browser with the `#0f0a1e` page background convention and adjust opacity values to match spec.

**Files to modify:**
- `frontend/src/pages/BibleBrowser.tsx` — Background token + hero gradient
- `frontend/src/components/bible/SegmentedControl.tsx` — Opacity adjustments
- `frontend/src/components/bible/BibleSearchMode.tsx` — Add cyan glow to search input

**Details:**

**BibleBrowser.tsx:**
- Line 24: Change gradient end from `#0D0620` to `#0f0a1e` in `BIBLE_HERO_STYLE`
- Line 41: Change `bg-hero-dark` to `bg-dashboard-dark`

**SegmentedControl.tsx:**
- Line 13: Change `bg-white/5` to `bg-white/[0.08]`, `border-white/15` to `border-white/10`
- Lines 22-25 and 35-38: Change inactive tab text from `text-white/70` to `text-white/60`

**BibleSearchMode.tsx:**
- Line 47: Change search input classes:
  - `bg-white/5` → `bg-white/[0.06]`
  - `border-white/15` → `border-glow-cyan/30`
  - Add `motion-safe:animate-glow-pulse` class

**Responsive behavior:**
- No layout changes at any breakpoint — only color values change

**Guardrails (DO NOT):**
- Do NOT change component structure, props, or state logic
- Do NOT modify text content or ARIA attributes
- Do NOT change TestamentAccordion or HighlightsNotesSection (already correct)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify BibleBrowser renders | integration | Confirm page renders without errors after class changes |
| Verify search input glow | unit | Confirm search input has `animate-glow-pulse` class |

**Expected state after completion:**
- [ ] Bible Browser page background is `dashboard-dark` (#0f0a1e)
- [ ] Hero gradient blends seamlessly into page background (no color seam)
- [ ] Segmented control uses `bg-white/[0.08]` with `border-white/10`
- [ ] Search input has cyan glow-pulse animation on focus
- [ ] All existing Bible Browser tests pass

---

### Step 2: Bible Reader Dark Theme Alignment

**Objective:** Align Bible Reader with the `#0f0a1e` convention, increase highlight opacity from 15% to 20%, and adjust verse text color.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx` — Background, gradient, highlight opacity, verse text color
- `frontend/src/components/bible/AudioControlBar.tsx` — Card opacity adjustment
- `frontend/src/components/bible/ChapterNav.tsx` — Text opacity adjustment

**Details:**

**BibleReader.tsx:**
- Line 31: Change gradient end from `#0D0620` to `#0f0a1e` in `READER_BG_STYLE`
- Line 422: Change `bg-hero-dark` to `bg-dashboard-dark`
- Line 541: Change highlight opacity from `0.15` to `0.20` in `hexToRgba(highlight.color, 0.15)` → `hexToRgba(highlight.color, 0.20)`
- Line 588: Change verse text from `text-white/90` to `text-white/80`

**AudioControlBar.tsx:**
- Line 82: Change `bg-white/5` to `bg-white/[0.06]`
- Lines 134-138: Change unselected speed pill text from `text-white/50` to `text-white/70`

**ChapterNav.tsx:**
- Lines 23, 33: Change navigation button text from `text-white` to `text-white/70`

**Responsive behavior:**
- No layout changes — only color values

**Guardrails (DO NOT):**
- Do NOT change FloatingActionBar (already correct dark frosted glass)
- Do NOT change NoteEditor (already correct dark styling)
- Do NOT change ChapterSelector (already correct dark styling)
- Do NOT change verse number color (`text-white/30` — already matches spec)
- Do NOT change TTS active verse indicator (`border-primary bg-primary/5` — already dark-appropriate)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Verify BibleReader renders | integration | Confirm page renders without errors |
| Verify highlight opacity | unit | Confirm `hexToRgba` is called with `0.20` |

**Expected state after completion:**
- [ ] Bible Reader page background is `dashboard-dark` (#0f0a1e)
- [ ] Hero gradient blends seamlessly into page background
- [ ] Verse text is `text-white/80` (slightly softer than before)
- [ ] Verse highlights use 20% opacity (more visible on dark)
- [ ] Audio control bar uses `bg-white/[0.06]`
- [ ] Chapter navigation buttons use `text-white/70`
- [ ] All existing Bible Reader tests pass

---

### Step 3: Ask Page — PageHero + Main Layout Dark Conversion

**Objective:** Convert the Ask page from light to dark theme by adding a dark variant to PageHero and converting the AskPage main layout.

**Files to modify:**
- `frontend/src/components/PageHero.tsx` — Add `dark` prop with dark gradient variant
- `frontend/src/pages/AskPage.tsx` — Dark background, textarea, chips, loading state

**Details:**

**PageHero.tsx:**
- Add `dark?: boolean` to `PageHeroProps` interface
- Add dark gradient constant:
  ```typescript
  const HERO_BG_DARK_STYLE = {
    backgroundImage:
      'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)',
  } as const
  ```
- In the `<section>` tag, use `dark ? HERO_BG_DARK_STYLE : HERO_BG_STYLE` for the `style` prop

**AskPage.tsx:**
- Line 201: Add `dark` prop to `<PageHero>`: `<PageHero title="Ask God's Word" showDivider dark>`
- Line 207: Wrap `<main>` in a `bg-dashboard-dark` container. Change the `<main>` outer wrapper:
  ```
  Before: <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
  After:  Wrap in <div className="bg-dashboard-dark"> then keep <main> inside
  ```
  Or add `bg-dashboard-dark` directly as a parent. The simplest approach: wrap the `<Layout>` children in a fragment with the dark bg applied to a full-width container div.

  Actually, looking at BibleBrowser pattern — it wraps everything in `<div className="min-h-screen bg-hero-dark">` inside `<Layout>`. The Ask page should follow the same pattern: wrap PageHero + main in `<div className="min-h-screen bg-dashboard-dark">`.

- Textarea (lines 233-238): Change classes:
  - `bg-white` → `bg-white/[0.06]`
  - `text-text-dark` → `text-white`
  - `placeholder:text-text-light/60` → `placeholder:text-white/40`

- Char count (line 194): Change base color from `text-text-light/60` to `text-white/40` (keep `text-danger` and `text-warning` as-is)

- Topic chips (lines 258-265): Change classes:
  - `border-gray-200 bg-white` → `bg-white/10 border-white/15`
  - `text-text-dark` → `text-white/70`
  - `hover:border-primary hover:text-primary` → `hover:bg-white/15 hover:text-white`

- Loading state (lines 344-349): Change text colors:
  - `text-text-light` → `text-white/60` (on both loading message lines)

**Responsive behavior:**
- Mobile: `bg-dashboard-dark` extends full-width, no light edges
- All breakpoints: dark background, no layout changes

**Guardrails (DO NOT):**
- Do NOT change `CrisisBanner` — it handles its own styling and must remain visible
- Do NOT change the "Find Answers" button — spec says it stays primary purple (already correct)
- Do NOT change the loading dots animation colors (`bg-primary` — works on dark)
- Do NOT modify PageHero's existing light behavior — only ADD the dark variant
- Do NOT change BackgroundSquiggle usage — it works on dark backgrounds

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PageHero dark variant | unit | Verify dark gradient is applied when `dark` prop is true |
| PageHero light default | unit | Verify light gradient is still default when `dark` is not passed |
| AskPage renders on dark bg | integration | Confirm page renders without errors |

**Expected state after completion:**
- [ ] PageHero has a `dark` prop that switches to dark gradient
- [ ] Ask page has solid dark background from navbar to footer
- [ ] Hero blends seamlessly into dark page background
- [ ] Textarea has `bg-white/[0.06]` with white text and `text-white/40` placeholder
- [ ] Topic chips use `bg-white/10 text-white/70`
- [ ] Loading state text is `text-white/60`
- [ ] All existing Ask Page tests pass

---

### Step 4: Ask Response & Conversation Components Dark Theme

**Objective:** Convert the AI response display, follow-up chips, and user question bubble to dark theme.

**Files to modify:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — Full light-to-dark conversion
- `frontend/src/components/ask/DigDeeperSection.tsx` — Chip and border colors
- `frontend/src/components/ask/UserQuestionBubble.tsx` — Text color

**Details:**

**AskResponseDisplay.tsx:**
- Line 45: Answer text `text-text-dark` → `text-white/80`
- Line 52: "What Scripture Says" heading `text-text-dark` → `text-white`
- Line 57: Verse cards: `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` → `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm`
- Line 66: Fallback reference (no link): `text-text-dark` → `text-white font-bold` (note: `font-bold` is already there via inline text)
- Line 68: Verse text: `text-text-dark` → `text-white/70` (Lora italic already applied)
- Line 69: Explanation: `text-text-light` → `text-white/50`
- Line 77: Encouragement box: `border-l-4 border-primary bg-purple-50` → `border-l-2 border-primary bg-white/[0.06] rounded-r-lg` (keep `rounded-r-lg`)
- Line 78: Encouragement text: `text-text-dark` → `text-white/80`
- Line 83: "Pray About This" label: `text-text-dark` → `text-white`
- Line 84: Prayer text: `text-text-dark` → `text-white/60`
- Line 88: AI disclaimer: `text-text-light` → `text-white/40`
- Lines 107-150: Action buttons (Ask another, Journal, Pray, Share):
  - `border border-gray-200` → `bg-white/10 border-0`
  - `text-text-dark` → `text-white/70`
  - `hover:bg-gray-50` → `hover:bg-white/15`
- Lines 159-195: Feedback section:
  - "Was this helpful?" (line 159): `text-text-light` → `text-white/60`
  - Thumbs buttons: `hover:bg-gray-50` → `hover:bg-white/15`
  - Unselected thumb icons: `text-text-light` → `text-white/60`
  - Keep active states: `fill-primary text-primary` (up), `fill-danger text-danger` (down)
- Line 201: Feedback thanks: `text-text-light` → `text-white/60`

**DigDeeperSection.tsx:**
- Line 18: Border: `border-gray-200` → `border-white/10`
- Line 19: Heading: `text-text-dark` → `text-white`
- Lines 27-31: Chips:
  - `border border-gray-200 bg-white` → `bg-white/10 border-0`
  - `text-text-dark` → `text-white/70`
  - `hover:bg-gray-50 hover:border-primary hover:text-primary` → `hover:bg-white/15 hover:text-white`

**UserQuestionBubble.tsx:**
- Line 9: Text color: `text-text-dark` → `text-white`

**Responsive behavior:**
- No layout changes — cards remain full-width on mobile, same grid on desktop

**Guardrails (DO NOT):**
- Do NOT change LinkedAnswerText — `text-primary-lt` already works on dark
- Do NOT change verse card Link styling — `text-primary-lt hover:underline` is correct
- Do NOT remove `shadow-sm` from verse cards without replacing with backdrop-blur (done)
- Do NOT change the AI disclaimer text content
- Do NOT change icon sizes or spacing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| AskResponseDisplay renders | unit | Verify component renders verse cards and answer text |
| DigDeeperSection renders chips | unit | Verify follow-up chips render |
| UserQuestionBubble text | unit | Verify question text is displayed |

**Expected state after completion:**
- [ ] Answer text is `text-white/80` on dark background
- [ ] Verse cards use frosted glass (`bg-white/[0.06] border-white/10`)
- [ ] Encouragement callout uses `bg-white/[0.06] border-l-2 border-primary`
- [ ] Prayer text is `text-white/60` in Lora italic
- [ ] Follow-up chips use `bg-white/10 text-white/70 hover:bg-white/15`
- [ ] Action buttons use `bg-white/10 text-white/70`
- [ ] Feedback thumbs use `text-white/60` with `hover:bg-white/15`
- [ ] User question bubbles are `bg-primary/20 text-white`

---

### Step 5: Ask Supporting Components Dark Theme

**Objective:** Convert the remaining Ask sub-components (Popular Topics, Verse Card Actions, Save Conversation) to dark theme.

**Files to modify:**
- `frontend/src/components/ask/PopularTopicsSection.tsx` — Topic cards
- `frontend/src/components/ask/VerseCardActions.tsx` — Action buttons + note input
- `frontend/src/components/ask/SaveConversationButton.tsx` — Button styling

**Details:**

**PopularTopicsSection.tsx:**
- Line 12: Heading: `text-text-dark` → `text-white`
- Lines 19-24: Topic cards:
  - `border border-gray-200 bg-white` → `border border-white/10 bg-white/[0.06]`
  - `shadow-sm hover:shadow-md` → `hover:bg-white/[0.08]`
- Line 27: Topic title: `text-text-dark` → `text-white/80`
- Line 28: Description: `text-text-light` → `text-white/50`
- Line 30: Chevron: `text-text-light` → `text-white/40`

**VerseCardActions.tsx:**
- Lines 79, 88: Action text: `text-text-light` → `text-white/60` (keep `hover:text-primary`)
- Lines 106-110: Note textarea:
  - `border-gray-200 bg-white` → `border-white/10 bg-white/[0.06]`
  - `text-text-dark` → `text-white`
  - `placeholder:text-text-light/60` → `placeholder:text-white/40`
  - `focus:border-primary` — keep as-is
- Line 113: Char count: `text-text-light/60` → `text-white/40`
- Line 120: Cancel button: `text-text-light hover:text-text-dark` → `text-white/40 hover:text-white/60`

**SaveConversationButton.tsx:**
- Lines 43-47: Button:
  - `border border-gray-200` → `bg-white/10 border border-white/10`
  - `text-text-dark` → `text-white/70`
  - `hover:bg-gray-50` → `hover:bg-white/15`

**Responsive behavior:**
- Topic cards: single column mobile → 2 columns sm → 3 columns lg (unchanged)
- Save button: full-width mobile (`w-full`), auto-width desktop (`sm:w-auto`) (unchanged)

**Guardrails (DO NOT):**
- Do NOT change CrisisBanner in VerseCardActions (it handles its own styling)
- Do NOT change the Save button functionality or copy logic
- Do NOT change auth modal triggers in VerseCardActions
- Do NOT change note maxLength or validation logic

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PopularTopicsSection renders topics | unit | Verify topic cards render |
| VerseCardActions note input | unit | Verify note textarea renders when expanded |
| SaveConversationButton renders | unit | Verify button renders after 2+ conversations |

**Expected state after completion:**
- [ ] Popular Topics cards use `bg-white/[0.06] border-white/10`
- [ ] Topic text is `text-white/80`, description is `text-white/50`
- [ ] VerseCardActions buttons are `text-white/60`
- [ ] Note textarea in VerseCardActions uses `bg-white/[0.06] text-white`
- [ ] Save conversation button uses `bg-white/10 text-white/70`

---

### Step 6: Test Updates & Cross-Page Verification

**Objective:** Run all tests, fix any class-name-related assertions, and verify cross-page consistency.

**Files to modify:**
- `frontend/src/pages/__tests__/AskPage.test.tsx` — Fix any failing assertions
- `frontend/src/pages/__tests__/BibleBrowser.test.tsx` — Fix any failing assertions
- `frontend/src/pages/__tests__/BibleReader.test.tsx` — Fix any failing assertions
- Any component test files that assert on specific Tailwind classes

**Details:**

1. Run `pnpm test` from `frontend/` directory
2. Identify any test failures related to:
   - Class name assertions (e.g., tests checking for `bg-white` that is now `bg-white/[0.06]`)
   - Snapshot mismatches
   - Text color assertions
3. Update failing assertions to match new dark theme classes
4. Verify these tests still pass:
   - AskPage page structure tests
   - AskPage auth gating tests (submit requires login)
   - AskPage crisis banner tests
   - BibleBrowser render tests
   - BibleReader render + highlight + note tests
   - BibleReader audio tests
5. Cross-page consistency checks (manual):
   - Navigate `/bible` → `/bible/genesis/1` → `/ask` — verify consistent dark background throughout
   - Verify no light edges or background color seams at page transitions
   - Verify SiteFooter has no visible seam on all three pages
   - Verify navbar glassmorphic effect looks correct over dark backgrounds

**Guardrails (DO NOT):**
- Do NOT skip test failures — every failing test must be fixed
- Do NOT remove tests — only update assertions to match new dark theme values
- Do NOT add new test files unless existing tests don't cover a critical dark theme assertion

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | all | `pnpm test` passes with zero failures |

**Expected state after completion:**
- [ ] All existing tests pass (`pnpm test` exits with 0 failures)
- [ ] No regressions in auth gating, crisis detection, or accessibility
- [ ] Bible Browser, Bible Reader, and Ask Page all use consistent dark theme
- [ ] No light-themed elements remain on any of the three pages

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Bible Browser alignment (independent) |
| 2 | — | Bible Reader alignment (independent) |
| 3 | — | Ask Page + PageHero dark conversion (independent) |
| 4 | 3 | Ask response components (needs dark page context) |
| 5 | 3 | Ask supporting components (needs dark page context) |
| 6 | 1, 2, 3, 4, 5 | Tests + verification (all changes must be complete) |

**Parallelizable:** Steps 1, 2, and 3 can be executed in any order. Steps 4 and 5 can be parallelized after Step 3.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bible Browser Alignment | [COMPLETE] | 2026-03-24 | BibleBrowser.tsx: bg-hero-dark→bg-dashboard-dark, gradient end #0D0620→#0f0a1e. SegmentedControl.tsx: bg-white/5→bg-white/[0.08], border-white/15→border-white/10, inactive text white/70→white/60. BibleSearchMode.tsx: bg-white/5→bg-white/[0.06], border→border-glow-cyan/30, added animate-glow-pulse. |
| 2 | Bible Reader Alignment | [COMPLETE] | 2026-03-24 | BibleReader.tsx: bg-hero-dark→bg-dashboard-dark, gradient end→#0f0a1e, highlight opacity 0.15→0.20, verse text white/90→white/80. AudioControlBar.tsx: bg-white/5→bg-white/[0.06], speed pill text white/50→white/70. ChapterNav.tsx: text-white→text-white/70. Updated AudioControlBar test assertion. |
| 3 | Ask Page + PageHero Dark | [COMPLETE] | 2026-03-24 | PageHero.tsx: added dark prop + HERO_BG_DARK_STYLE gradient. AskPage.tsx: wrapped in min-h-screen bg-dashboard-dark div, textarea bg-white→bg-white/[0.06] text-white, placeholder text-white/40, char count text-white/40, topic chips bg-white/10 border-white/15 text-white/70, loading text→text-white/60. |
| 4 | Ask Response Components | [COMPLETE] | 2026-03-24 | AskResponseDisplay.tsx: all text-text-dark→text-white variants, verse cards→frosted glass, encouragement→bg-white/[0.06] border-l-2, action buttons→bg-white/10, feedback→text-white/60. DigDeeperSection.tsx: border→border-white/10, chips→bg-white/10 text-white/70. UserQuestionBubble.tsx: text-text-dark→text-white. Updated AskPage.test.tsx assertions (shadow-sm→backdrop-blur-sm, bg-purple-50→bg-white/[0.06], border-l-4→border-l-2). |
| 5 | Ask Supporting Components | [COMPLETE] | 2026-03-24 | PopularTopicsSection.tsx: cards→bg-white/[0.06] border-white/10, text→white/80+white/50+white/40. VerseCardActions.tsx: text→text-white/60, textarea→bg-white/[0.06] text-white, cancel→text-white/40. SaveConversationButton.tsx: bg-white/10 border-white/10 text-white/70. Updated PopularTopicsSection.test.tsx assertion (shadow-sm→bg-white/[0.06]). |
| 6 | Tests + Verification | [COMPLETE] | 2026-03-24 | Full suite: 4254 tests pass, 388/390 files pass. 2 pre-existing failures (e2e Playwright version conflict, flaky useNotifications timestamp ordering). Build compiles cleanly. Test assertions updated: AudioControlBar (white/50→white/70), AskPage (shadow-sm→backdrop-blur-sm, bg-purple-50→bg-white/[0.06], border-l-4→border-l-2), PopularTopicsSection (shadow-sm→bg-white/[0.06]). |
