# Implementation Plan: Hero Quiz Teaser

**Spec:** `_specs/hero-quiz-teaser.md`
**Date:** 2026-02-24
**Branch:** `claude/feature/hero-quiz-teaser`

---

## Architecture Context

### Relevant Existing Files

- **`frontend/src/components/HeroSection.tsx`** — The hero section component. Contains the heading, subtitle, and `<TypewriterInput />`. The teaser text will be added inside the `<div className="mx-auto w-full max-w-3xl">` wrapper, after the `<TypewriterInput />` call on line 38.
- **`frontend/src/components/TypewriterInput.tsx`** — The typewriter input form component. The teaser sits *outside* this component, in the parent `HeroSection`.
- **`frontend/src/pages/Home.tsx`** — The landing page. Currently renders `<Navbar transparent />`, `<HeroSection />`, and `<JourneySection />` inside `<main>`. The quiz placeholder `<div id="quiz" />` goes after `<JourneySection />`.
- **`frontend/src/index.css`** — Global styles. Currently has `@tailwind` directives and a `prefers-reduced-motion` block. The `scroll-behavior: smooth` rule goes here on the `html` element.
- **`frontend/src/components/__tests__/HeroSection.test.tsx`** — Existing tests for HeroSection. Uses `@testing-library/react`, `userEvent`, `MemoryRouter`, and `vitest`. New tests follow this exact pattern.
- **`frontend/tailwind.config.js`** — Tailwind config with custom colors including `primary-lt: '#8B5CF6'` which maps to the link color specified in the spec.

### Patterns to Follow

- Components use named exports (`export function HeroSection()`)
- Tailwind utility classes for all styling — no CSS modules, no inline styles except for complex gradients
- `cn()` utility from `@/lib/utils` for conditional class merging
- Tests use `describe`/`it` blocks with `@testing-library/react` queries (`getByRole`, `getByText`)
- Test files live in `__tests__/` subdirectories adjacent to their source

### Design System References

- **Primary Light**: `#8B5CF6` → Tailwind class `text-primary-lt` (for the clickable link)
- **White at 60%**: `text-white/60` (for the surrounding muted text)
- **Text size**: `text-sm` (14px) — smaller than the subtitle which uses `text-base`/`text-lg`/`text-xl`
- **Spacing**: `mt-5` (20px) provides a comfortable gap below the input without crowding

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The current branch is `claude/feature/hero-quiz-teaser`
- [ ] Working directory is clean (no uncommitted changes)
- [ ] `HeroSection.tsx` still has `<TypewriterInput onSubmit={handleInputSubmit} />` on line 38 as the last child in the wrapper div
- [ ] `Home.tsx` still renders `<JourneySection />` as the last component in `<main>`

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scroll method | `scrollIntoView({ behavior: 'smooth' })` on click handler + CSS `scroll-behavior: smooth` on html | Belt-and-suspenders: JS handles the click, CSS ensures any anchor-based navigation also smooth-scrolls |
| Link element | `<button>` with `onClick` that calls `scrollIntoView` | Semantically this is an in-page action, not a navigation. A button with scroll behavior is appropriate. Using an `<a href="#quiz">` would also work but could cause a URL hash change we don't want. |
| Teaser text color | `text-white/60` for surrounding text, `text-primary-lt` for the link | White/60 provides enough contrast against the dark hero gradient without competing with the subtitle (white/85). Primary Light (#8B5CF6) is a recognizable interactive color. |
| Quiz placeholder | Empty `<div id="quiz" />` with no visible content | Minimal placeholder — will be entirely replaced by the StartingPointQuiz component later. No need for placeholder text or styling. |
| Responsive behavior | No special breakpoint handling | The text is short enough to flow naturally. `text-sm` is readable at all sizes. |

---

## Implementation Steps

### Step 1: Add `scroll-behavior: smooth` to Global Styles

**Objective:** Enable smooth scrolling globally so all anchor-based and `scrollIntoView` navigation animates smoothly.

**Files to modify:**
- `frontend/src/index.css` — Add `html { scroll-behavior: smooth }` in the base layer

**Details:**

Add a `@layer base` block with the `html` rule. Place it after the `@tailwind utilities;` line and before the existing `@media` block:

```css
@layer base {
  html {
    scroll-behavior: smooth;
  }
}
```

This uses Tailwind's `@layer base` to ensure proper specificity ordering.

**Guardrails (DO NOT):**
- Do not remove or modify the existing `@media (prefers-reduced-motion: reduce)` block
- Do not add `scroll-behavior: auto` inside the reduced-motion media query (browsers already handle this — `scroll-behavior: smooth` is ignored when reduced motion is preferred in modern browsers)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | manual | Verify in browser that clicking the teaser link scrolls smoothly |

**Expected state after completion:**
- [ ] `index.css` contains `scroll-behavior: smooth` on the `html` element

---

### Step 2: Add Quiz Teaser Text to HeroSection

**Objective:** Display the teaser text below the typewriter input with the clickable "Take a 30-second quiz" link that scrolls to `#quiz`.

**Files to modify:**
- `frontend/src/components/HeroSection.tsx` — Add teaser paragraph after `<TypewriterInput />`

**Details:**

After the `<TypewriterInput onSubmit={handleInputSubmit} />` line (currently line 38), add:

```tsx
<p className="mt-5 font-sans text-sm text-white/60">
  Not sure where to start?{' '}
  <button
    type="button"
    onClick={() => {
      document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })
    }}
    className="text-primary-lt underline-offset-2 transition-colors hover:text-white hover:underline"
  >
    Take a 30-second quiz
  </button>{' '}
  and we&apos;ll help you find your path.
</p>
```

Key styling decisions:
- `mt-5` (20px) — comfortable gap below the input, within the 16-24px spec range
- `text-sm` (14px) — smaller than subtitle, appropriately secondary
- `text-white/60` — muted but legible against the dark gradient
- `text-primary-lt` on the button — the #8B5CF6 violet stands out as interactive
- `hover:text-white hover:underline` — clear hover feedback
- `underline-offset-2` — slight offset for cleaner underline appearance
- `type="button"` — prevents form submission if somehow nested

**Guardrails (DO NOT):**
- Do not use an `<a href="#quiz">` tag — this would add `#quiz` to the URL hash
- Do not add any data persistence, analytics, or tracking
- Do not modify the `TypewriterInput` component
- Do not change any existing heading, subtitle, or input styling

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders quiz teaser text | unit | Verify "Not sure where to start?" text is present |
| renders clickable quiz link | unit | Verify a button with "Take a 30-second quiz" text exists |
| quiz link calls scrollIntoView | unit | Mock `document.getElementById` and verify `scrollIntoView` is called with `{ behavior: 'smooth' }` on click |

**Expected state after completion:**
- [ ] Teaser text appears below the input in the browser
- [ ] The link portion is visually distinct (purple, hover underline)
- [ ] Clicking the link does not navigate or change URL

---

### Step 3: Add Quiz Placeholder to Home Page

**Objective:** Add a temporary empty `<div id="quiz" />` in the landing page layout so the scroll target exists.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Add placeholder div after `<JourneySection />`

**Details:**

After `<JourneySection />` and before the closing `</main>` tag, add:

```tsx
{/* Quiz placeholder — will be replaced by StartingPointQuiz component */}
<div id="quiz" />
```

No imports needed. No styling needed. This is a pure scroll target.

**Guardrails (DO NOT):**
- Do not add any visible content, text, or styling to the placeholder
- Do not create a new component for this — it's a temporary div
- Do not modify `JourneySection` or any other existing component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| N/A | — | The placeholder is invisible and temporary; no dedicated test needed. The HeroSection scroll test in Step 4 implicitly validates the target exists. |

**Expected state after completion:**
- [ ] `Home.tsx` contains `<div id="quiz" />` after `<JourneySection />`
- [ ] No visual change to the landing page

---

### Step 4: Update HeroSection Tests

**Objective:** Add tests verifying the quiz teaser text, link, and scroll behavior.

**Files to modify:**
- `frontend/src/components/__tests__/HeroSection.test.tsx` — Add new test cases

**Details:**

Add the following tests to the existing `describe('HeroSection', ...)` block:

1. **Test: renders quiz teaser text**
```tsx
it('renders the quiz teaser text', () => {
  renderHero()
  expect(screen.getByText(/not sure where to start/i)).toBeInTheDocument()
})
```

2. **Test: renders quiz link button**
```tsx
it('renders the quiz teaser link', () => {
  renderHero()
  expect(
    screen.getByRole('button', { name: /take a 30-second quiz/i })
  ).toBeInTheDocument()
})
```

3. **Test: quiz link scrolls to target**
```tsx
it('scrolls to #quiz on teaser link click', async () => {
  const user = userEvent.setup()
  renderHero()

  const scrollIntoViewMock = vi.fn()
  const mockElement = { scrollIntoView: scrollIntoViewMock }
  vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as unknown as HTMLElement)

  await user.click(screen.getByRole('button', { name: /take a 30-second quiz/i }))

  expect(document.getElementById).toHaveBeenCalledWith('quiz')
  expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' })

  vi.restoreAllMocks()
})
```

Add `vi` to the vitest import on line 4: `import { describe, it, expect, vi } from 'vitest'`

**Guardrails (DO NOT):**
- Do not modify or remove any existing tests
- Do not change the `renderHero()` helper function
- Do not test the CSS `scroll-behavior` property (that's a browser behavior, not unit-testable)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders the quiz teaser text | unit | Confirms teaser paragraph is rendered |
| renders the quiz teaser link | unit | Confirms the button with link text exists |
| scrolls to #quiz on teaser link click | unit | Confirms `scrollIntoView({ behavior: 'smooth' })` is called on the element with id `quiz` |

**Expected state after completion:**
- [ ] All existing HeroSection tests still pass
- [ ] 3 new tests pass
- [ ] `pnpm test` exits cleanly

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `scroll-behavior: smooth` to global styles |
| 2 | — | Add quiz teaser text to HeroSection |
| 3 | — | Add quiz placeholder to Home page |
| 4 | 2 | Update HeroSection tests |

Steps 1, 2, and 3 are independent and can be done in any order. Step 4 depends on Step 2 (the teaser must exist before tests can verify it).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add scroll-behavior smooth | [COMPLETE] | 2026-02-24 | `frontend/src/index.css` — added `@layer base { html { scroll-behavior: smooth } }` |
| 2 | Add quiz teaser to HeroSection | [COMPLETE] | 2026-02-24 | `frontend/src/components/HeroSection.tsx` — added teaser paragraph with scroll button after TypewriterInput |
| 3 | Add quiz placeholder to Home | [COMPLETE] | 2026-02-24 | `frontend/src/pages/Home.tsx` — added `<div id="quiz" />` after JourneySection |
| 4 | Update HeroSection tests | [COMPLETE] | 2026-02-24 | `frontend/src/components/__tests__/HeroSection.test.tsx` — added 3 tests (teaser text, link button, scrollIntoView mock). All 89 tests pass. |
