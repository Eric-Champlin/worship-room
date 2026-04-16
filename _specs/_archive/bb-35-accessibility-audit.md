# BB-35: Accessibility Audit

**Master Plan Reference:** N/A — standalone audit-and-remediation spec on `bible-redesign` branch

**Branch:** `bible-redesign` (no new branch — all work commits directly here)

**Depends on:**
- BB-34 (Empty states & first-run — shipped) — empty states need accessibility verification
- BB-33 (Animations & micro-interactions — shipped) — reduced-motion safety net is the foundation
- BB-30 through BB-46 (feature wave substantially complete) — audit requires features in final form
- Existing `useSafeTabIndex` hook and ARIA patterns across the codebase

**Hands off to:**
- BB-36 (Performance) — verifies accessibility additions don't impact bundle size or render performance
- BB-37 (Code health + Playwright full audit) — real-browser screen reader testing that jsdom can't do
- BB-37b (Bible Wave Integrity Audit) — verifies accessibility claims across the final wave
- Future dedicated accessibility maintenance spec for complex surfaces (Bible reader verse selection, audio player, prayer wall composer)

---

## Overview

Worship Room serves users seeking emotional healing and spiritual support — a user base that skews older than the general app population and is disproportionately affected by accessibility barriers. Low vision, reduced dexterity, hearing loss, and cognitive fatigue are common among the app's most engaged users. A devotional app that's hard to use with assistive technology is failing the people who need it most.

BB-35 audits the entire Worship Room frontend for WCAG 2.2 AA compliance and remediates every gap found. After BB-35 ships, every interactive element is keyboard-accessible, every image has appropriate alt text, every form field has a proper label, every landmark region is correctly identified, every color combination meets contrast minimums, every dynamic content update is announced to screen readers, and the app works end-to-end for users navigating with only a keyboard or only a screen reader.

This is an audit-and-remediation spec, not a new-feature spec. Worship Room already has accessibility infrastructure in many places — `useSafeTabIndex`, ARIA labels on most buttons, `role="dialog"` on modals, `prefers-reduced-motion` respected via BB-33's safety net. What it lacks is consistency. BB-35 fixes the gaps and establishes patterns that future specs apply by default.

## User Story

As a **logged-out visitor or logged-in user with a disability or using assistive technology**, I want to **navigate and use every feature in Worship Room with a keyboard, screen reader, or other assistive device** so that **I can fully participate in the devotional experience regardless of my abilities**.

## Requirements

### Functional Requirements

#### Audit Document

1. A comprehensive accessibility audit document is produced at `_plans/recon/bb35-accessibility-audit.md` covering every page and interactive element in the app
2. The audit uses `App.tsx` routes as the canonical page list and the component tree as the component index
3. Every surface is tested against the full 38-item WCAG 2.2 AA checklist (see Architecture section)
4. Each surface records: surface name, file path, pass/fail/needs-verification per checklist item, specific remediation required for failures, and whether remediation is in BB-35 scope or deferred
5. The audit is completed before any remediation code changes begin

#### Remediation — Icon-Only Buttons (Pattern 1)

6. Every button containing only an icon gets an `aria-label` with a descriptive name
7. Decorative icons inside labeled buttons get `aria-hidden="true"` to prevent double-announcement

#### Remediation — Dynamic Content Announcements (Pattern 2)

8. Content that updates in response to user action (filter results, search results, form validation, loading state changes) is accompanied by an `aria-live` region
9. Politeness level: `polite` for informational updates, `assertive` for errors and critical feedback

#### Remediation — Focus Management (Pattern 3)

10. Every modal, drawer, dialog, and bottom sheet traps focus while open and returns focus to the trigger element when closed
11. Existing focus management that already works is left unchanged — only gaps are fixed

#### Remediation — Form Error Announcements (Pattern 4)

12. Every form field that can produce a validation error has `aria-invalid="true"` when invalid and `aria-describedby` pointing to the error message
13. Error messages render in the DOM as soon as the error is detected, not just on submit

#### Remediation — Heading Hierarchy (Pattern 5)

14. Every page has exactly one `<h1>` and uses `<h2>` through `<h6>` in a logical, non-skipping hierarchy
15. Pages with multiple h1s or skipped levels are fixed

#### Remediation — Image Alt Text (Pattern 6)

16. Every `<img>` is classified as decorative (`alt=""`) or meaningful (descriptive alt text)
17. Lucide icons inside buttons are decorative; content images (book illustrations, plan thumbnails) get real alt text

#### Remediation — Skip-to-Main-Content Link (Pattern 7)

18. A skip link at the top of every page is visible only when focused via keyboard
19. Tab from a fresh page load lands on the skip link first; activating it jumps past the navigation to `<main>`

#### Remediation — Touch Target Sizing (Pattern 8)

20. Every interactive element is at least 44x44 CSS pixels
21. Adjacent touch targets have at least 8px of spacing
22. Elements that genuinely cannot accommodate the size are documented as known exceptions in the audit

#### Accessibility Statement Page

23. A new page at `/accessibility` publishes Worship Room's accessibility commitment
24. Page content includes: statement of intent, target standard (WCAG 2.2 Level AA), known limitations, feedback mechanism (email or contact link), and date of last audit
25. The page is linked from `SiteFooter.tsx` under a small "Accessibility" link
26. The page uses the same dark theme and design system as all other pages

#### Accessibility Primitives (conditional)

27. If the audit finds inconsistent patterns used in 3+ places, extract reusable primitives to `frontend/src/lib/accessibility/`
28. Candidates: `useFocusTrap` hook, `LiveRegion` component, `VisuallyHidden` utility
29. If patterns are used in 1-2 places or are already consistent, no extraction needed

#### Keyboard Navigation Verification

30. An end-to-end keyboard-only walkthrough of the app completes successfully using only Tab, Shift+Tab, Enter, Space, and Escape
31. The walkthrough covers: navigate to Bible reader, open a chapter, highlight a verse, add verse to memorization deck, navigate to My Bible, view memorization deck, flip a memorization card, navigate to Daily Hub, complete a journal entry, navigate to Settings, toggle a notification preference, return to home page
32. Every step must be achievable with keyboard only — any step requiring a mouse is a failure

#### Screen Reader Smoke Test

33. A VoiceOver (macOS) smoke test walks through the same flows as the keyboard walkthrough
34. The test notes any: unlabeled buttons, unlabeled form fields, unannounced dynamic content updates, modals that don't announce themselves, unannounced error messages, unclear or confusing flows
35. Critical issues are remediated in BB-35; minor issues are documented for BB-37

### Non-Functional Requirements

- **Performance:** No Lighthouse performance score regression after BB-35 ships
- **Accessibility score:** Lighthouse accessibility score reaches or exceeds 95 on all major pages (home, dashboard, bible reader, my bible, daily hub, settings)
- **Bundle size:** Accessibility primitives (if extracted) add negligible overhead — no new npm packages
- **Existing tests:** All BB-30 through BB-34 tests continue to pass unchanged

## Auth Gating

BB-35 does not add any new auth gates. The accessibility statement page is a public route.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View `/accessibility` page | Full access, no restrictions | Full access, no restrictions | N/A |
| Use skip-to-main-content link | Works on all pages | Works on all pages | N/A |
| Keyboard navigation | Works everywhere | Works everywhere | N/A |

All existing auth gates on features (prayer generation, journal saving, meditation cards, etc.) remain unchanged. BB-35 only adds accessibility attributes and semantic markup — it does not change feature behavior or auth boundaries.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Skip link appears at top on keyboard focus. Accessibility statement page uses single-column layout with standard mobile padding. Touch targets verified at 44x44px minimum. |
| Tablet (640-1024px) | Same as mobile with wider content area. |
| Desktop (> 1024px) | Same accessibility patterns. Accessibility statement page uses `max-w-3xl` centered layout. |

The skip-to-main-content link is absolutely positioned and only visible on keyboard focus — it does not affect visual layout at any breakpoint.

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required. BB-35 only modifies accessibility attributes and semantic markup on existing components.

## Auth & Persistence

- **Logged-out users:** Full access to accessibility statement page. All accessibility improvements (keyboard nav, screen reader support, focus management) work for all users regardless of auth state.
- **Logged-in users:** Same as logged-out. No auth-specific accessibility behavior.
- **localStorage usage:** Zero new localStorage keys. BB-35 does not persist any data.
- **Route type:** `/accessibility` is a public route.

## Completion & Navigation

N/A — standalone audit spec, not part of Daily Hub tabbed experience.

## Architecture

BB-35 builds four things:

### 1. Comprehensive Audit Document

A systematic audit at `_plans/recon/bb35-accessibility-audit.md` testing every surface against this 38-item checklist:

**Keyboard accessibility (items 1-8):**
1. Every interactive element is focusable via Tab
2. Focus order follows visual reading order
3. Visible focus ring on keyboard focus (not mouse)
4. Focus rings not suppressed with `outline: none` without replacement
5. Custom controls activatable via Enter and Space (e.g., BB-45 memorization flip card)
6. Modals trap focus and return focus to trigger on close
7. Dropdown menus and popovers close on Escape
8. No keyboard traps

**Screen reader accessibility (items 9-18):**
9. Every image has an `alt` attribute (empty for decorative, descriptive for content)
10. Every form field has `<label>`, `aria-label`, or `aria-labelledby`
11. Every button has text label or `aria-label`
12. Logical heading hierarchy (no skipping, one h1 per page)
13. Landmark regions properly identified (`main`, `nav`, `banner`, `contentinfo`, `complementary`)
14. Dynamic content updates announced via `aria-live`
15. Error messages announced via `aria-invalid` + `aria-describedby`
16. Loading states announced via `aria-busy` or `role="status"`
17. Icon-only buttons have descriptive `aria-label`
18. Decorative icons have `aria-hidden="true"`

**Color and contrast (items 19-23):**
19. Body text at least 4.5:1 contrast (WCAG AA)
20. Large text at least 3:1 contrast
21. Interactive element borders and focus rings at least 3:1 contrast
22. Color not the only information channel (error states use icon + text)
23. Links distinguishable from surrounding text (not just by color)

**Motion and animation (items 24-26):**
24. `prefers-reduced-motion` respected (BB-33 safety net — already verified)
25. No seizure-risk animation (no flashing > 3/second)
26. No essential content conveyed through motion alone

**Forms and validation (items 27-31):**
27. Form fields have clear labels (not placeholder-only)
28. Required fields marked visually and via `aria-required="true"`
29. Error messages are specific
30. Error messages associated with field via `aria-describedby`
31. Submission failures announced to screen readers

**Touch targets (items 32-34):**
32. Interactive elements at least 44x44 CSS pixels
33. Adjacent touch targets have at least 8px spacing
34. No tiny close buttons or icon-only controls below threshold

**Navigation and structure (items 35-38):**
35. Skip-to-main-content link on every page
36. Main content region marked with `<main>`
37. Every page has meaningful `<title>` (BB-40 handles this)
38. Page transitions announce new page title to screen readers

### 2. Remediation

Eight canonical patterns applied consistently:
- **Pattern 1:** Icon-only buttons → `aria-label` + `aria-hidden` on decorative icons
- **Pattern 2:** Dynamic content → `aria-live` regions (`polite` or `assertive`)
- **Pattern 3:** Focus management → focus trap + focus restore on modals/drawers
- **Pattern 4:** Form errors → `aria-invalid` + `aria-describedby`
- **Pattern 5:** Heading hierarchy → one h1 per page, logical h2-h6
- **Pattern 6:** Image alt text → decorative `alt=""` vs descriptive alt
- **Pattern 7:** Skip link → visible on keyboard focus, jumps to `<main>`
- **Pattern 8:** Touch targets → minimum 44x44px, 8px spacing

### 3. Accessibility Statement Page

New route `/accessibility` with:
- Statement of intent
- Target standard (WCAG 2.2 Level AA)
- Known limitations (audio content without transcripts, third-party Spotify embeds, etc.)
- Feedback mechanism (email link)
- Last audit date
- Dark theme, same design system as all other pages
- Linked from `SiteFooter.tsx`

### 4. Accessibility Primitives (conditional)

If 3+ inconsistent usages found during audit, extract to `frontend/src/lib/accessibility/`:
- `useFocusTrap` hook
- `LiveRegion` component
- `VisuallyHidden` utility (`.sr-only` equivalent)

## Design Notes

- The accessibility statement page uses the same dark theme as all other pages — `hero-bg` background, white text, Inter font
- The skip-to-main-content link should use `sr-only` positioning (off-screen) that becomes visible on focus — standard Tailwind pattern: `absolute left-4 top-4 z-50 bg-primary text-white px-4 py-2 rounded-lg opacity-0 focus:opacity-100 focus:outline-none transition-opacity` (or equivalent)
- Focus rings should use the design system's primary violet or white with sufficient contrast against `hero-dark` backgrounds
- The accessibility statement page does not need a PageHero — a simple heading + body text layout is appropriate for a compliance page
- Reference existing `FrostedCard` component if the page needs visual structure
- Reference existing `SiteFooter.tsx` for the footer link placement

## Out of Scope

- **No AAA compliance.** Target is WCAG 2.2 Level AA only. AAA requires 7:1 contrast and larger minimum fonts that conflict with the cinematic design.
- **No full screen reader rewrite.** Surfaces needing major work (Bible reader verse selection) are flagged for follow-up, not fully rebuilt.
- **No new features.** The accessibility statement is a static content page, not a feature.
- **No automated a11y testing infrastructure.** No axe-core, Pa11y, or CI integration. Manual audit + React Testing Library patterns only.
- **No high-contrast mode or theme switcher.** Dark theme is the only theme in scope.
- **No text-size controls or zoom affordances.** Browser zoom verified at 200% but no in-app controls added.
- **No RTL language support.** English-only in v1.
- **No live captions or transcripts for audio.** Future spec when audio cluster ships.
- **No sign language support.**
- **No assistive technology detection or adaptive UI.**
- **No new animation exceptions** beyond BB-33's existing exemptions.
- **No changes to BB-33's reduced-motion safety net.**
- **No changes to feature behavior.** Only accessibility attributes and semantic markup change.
- **No backend.** Pure client-side.
- **No new auth gates.**
- **No new localStorage keys.**
- **No new npm packages.** Uses existing React, Tailwind, and `sr-only` patterns.
- **No refactoring of existing working accessibility patterns.** If `useSafeTabIndex` works, it stays.

## Acceptance Criteria

### Audit

- [ ] Complete audit document exists at `_plans/recon/bb35-accessibility-audit.md` covering every page, major component, and interactive pattern
- [ ] Audit tests every surface against the full 38-item WCAG 2.2 AA checklist
- [ ] Audit records pass, fail, or "needs verification" for every checklist item on every surface
- [ ] Every audit failure is either remediated in BB-35 or explicitly deferred with documented reason
- [ ] Audit document committed as durable reference for future specs

### Icon-Only Buttons & Decorative Icons

- [ ] Every icon-only button in the app has an `aria-label` with a descriptive name
- [ ] Every decorative icon inside a labeled button has `aria-hidden="true"`

### Form Accessibility

- [ ] Every form field has an associated `<label>`, `aria-label`, or `aria-labelledby`
- [ ] Every form field with validation has `aria-invalid` when invalid and `aria-describedby` pointing to the error message

### Dynamic Content & Loading

- [ ] Every dynamic content update has an appropriate `aria-live` region announcement
- [ ] Loading states use `aria-busy` or `role="status"` where appropriate

### Focus Management

- [ ] Every modal, drawer, dialog, and bottom sheet traps focus while open and restores focus on close

### Images

- [ ] Every `<img>` has an `alt` attribute (empty for decorative, descriptive for meaningful)

### Heading Hierarchy

- [ ] Every page has exactly one `<h1>` and follows a logical heading hierarchy with no skipped levels

### Skip Link

- [ ] A skip-to-main-content link exists at the top of every page and is visible only on keyboard focus

### Touch Targets

- [ ] Every interactive element is at least 44x44 CSS pixels, or is explicitly documented as an exception in the audit

### Color & Contrast

- [ ] Every text color combination verified to meet 4.5:1 contrast for body text or 3:1 for large text
- [ ] Every color-only indication (error states, status) supplemented with a non-color signal (icon, text)

### Accessibility Statement Page

- [ ] New `/accessibility` page exists with accessibility statement, target standard, known limitations, feedback mechanism, and last audit date
- [ ] `/accessibility` page linked from site footer
- [ ] Page uses dark theme and matches design system

### Keyboard Walkthrough

- [ ] End-to-end keyboard-only walkthrough completes: Bible reader → chapter → highlight → memorization → My Bible → Daily Hub → journal → Settings → home
- [ ] Every step achievable with Tab, Shift+Tab, Enter, Space, and Escape only

### Screen Reader Smoke Test

- [ ] VoiceOver smoke test completes without critical issues (unlabeled buttons, unlabeled fields, unannounced modals)

### Testing

- [ ] All BB-30 through BB-34 tests continue to pass unchanged
- [ ] At least 25 component tests verify accessibility attributes added by BB-35
- [ ] At least 10 integration tests verify keyboard-only flows
- [ ] At least 5 tests verify screen reader announcement patterns using `toHaveAccessibleName` and `toHaveAccessibleDescription`

### Build Health

- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys, zero new npm packages
- [ ] Lighthouse accessibility score >= 95 on: home, dashboard, bible reader, my bible, daily hub (all tabs), settings, accessibility statement page
- [ ] Lighthouse performance score does not regress

### Primitives (if applicable)

- [ ] Any reusable accessibility primitives extracted during the spec live at `frontend/src/lib/accessibility/` and are documented

## Notes for Execution

- **The audit is the load-bearing step.** Complete audit must exist before any remediation begins. Page by page, element by element, through the full checklist. Skipping the audit leads to piecemeal remediation that misses surfaces.
- **Apply the BB-33/BB-34 process lesson.** Final verification must include Lighthouse accessibility score check on every major page, automated test coverage of key patterns, and explicit grep/route sweep confirming every audit item was addressed. "I worked through the audit list" is not enough — "Lighthouse reports 95+ on every page" is the success criterion.
- **Don't over-engineer focus traps.** If a modal's focus trap isn't perfect but the user can navigate in and out reasonably, document it as "acceptable" rather than refactoring.
- **The keyboard walkthrough and screen reader smoke test are required verifications, not optional.** Run on a real browser, not in tests.
- **Contrast checking:** Use Chrome DevTools Accessibility panel or WebAIM contrast checker. Verify every text color combination in the design system once and document the result.
- **Pre-existing failing tests are NOT touched.**

## Pre-Execution Checklist

1. BB-34 is shipped and committed
2. Full accessibility audit produced at `_plans/recon/bb35-accessibility-audit.md` before code changes
3. Target WCAG level confirmed as 2.2 AA (not AAA)
4. Accessibility statement page copy proposed in plan phase and reviewed before execution
5. Lighthouse pages confirmed: home, dashboard, bible reader, my bible, daily hub (all 4 tabs), settings, accessibility page
6. Keyboard walkthrough run during recon with gaps recorded in audit
7. Screen reader smoke test run during recon with findings recorded
8. Stay on `bible-redesign` branch — no new branch, no merge
9. Zero new auth gates, zero new localStorage keys, zero new npm packages
10. Lighthouse accessibility baseline captured before execution starts
