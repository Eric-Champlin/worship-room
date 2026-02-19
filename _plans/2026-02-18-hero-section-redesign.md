# Plan: Landing Page Hero Section Redesign
**Spec**: `_specs/hero-section-redesign.md`
**Branch**: `claude/feature/hero-section-redesign`
**Date**: 2026-02-18

---

## Decision Log
- **2026-02-18**: User selected "Option A" — Navbar keeps white pill appearance unchanged. Hero dark purple gradient simply starts directly below the navbar. No transparent-navbar variant needed. The pill's `shadow-md` provides the natural floating-above effect.
- **2026-02-18**: `Home.tsx` will bypass `Layout.tsx` entirely (Layout enforces `max-w-7xl` padding on `<main>` which prevents full-bleed). Home gets its own wrapper: `<Navbar /> + <main><HeroSection /></main>`. `Layout.tsx` is untouched for all other pages.
- **2026-02-18**: Gradient border implemented via wrapper `<div>` with 2px padding and gradient background — not CSS `border` property. `border-image` does not respect `border-radius`, so the wrapper-div pattern is the only cross-browser technique for a gradient border with rounded corners.
- **2026-02-18**: Typewriter implemented with pure `useEffect` + `useState` + `setTimeout` state machine — no animation libraries. Cursor `|` is a separate decorative `<span aria-hidden>` sibling to the input — `displayText` state stays clean for submission.
- **2026-02-18**: `window.matchMedia` mock added globally to `frontend/src/test/setup.ts` — jsdom does not implement it, and every test that renders `TypewriterInput` (directly or via `HeroSection`) would throw without it.
- **2026-02-18**: `aria-live` region announces full phrases on completion (not character-by-character) to avoid overwhelming screen reader users.

---

## Context
The home page (`/`) currently renders an empty `Layout` with `{null}` as content — there is no landing page at all. This feature adds the top hero section: a full-bleed deep purple-to-white gradient banner with a bold headline, subtitle, and an animated AI input box that demonstrates what users can ask Worship Room. The hero is the first impression visitors get and must immediately communicate the app's spiritual + AI-powered identity and invite engagement.

---

## Step 1 — Tailwind Config: New Color Tokens + Keyframe Animations (Do First)

**File**: `frontend/tailwind.config.js`

Add to `theme.extend.colors`:
```js
'hero-dark': '#0D0620',   // deepest purple — gradient start (top/edges)
'glow-cyan': '#00D4FF',   // cyan end of input glow gradient
```

Add to `theme.extend` (new keys):
```js
keyframes: {
  'glow-pulse': {
    '0%, 100%': {
      boxShadow: '0 0 8px 2px rgba(0, 212, 255, 0.35), 0 0 20px 4px rgba(139, 92, 246, 0.25)',
    },
    '50%': {
      boxShadow: '0 0 16px 4px rgba(0, 212, 255, 0.55), 0 0 36px 8px rgba(139, 92, 246, 0.40)',
    },
  },
  'cursor-blink': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0' },
  },
},
animation: {
  'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
  'cursor-blink': 'cursor-blink 1s step-end infinite',
},
```

**Why step-end for cursor-blink**: `step-end` produces an instant on/off snap — authentic terminal cursor behavior. `ease` would fade in/out which looks wrong.

**Why 2.5s for glow-pulse**: Slow enough to feel like a breathing "AI is listening" pulse rather than a distracting flicker.

---

## Step 2 — CSS: Reduced-Motion Safety Net

**File**: `frontend/src/index.css`

Append after the `@tailwind` directives:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-cursor-blink {
    animation: none;
    opacity: 1;
  }
  .animate-glow-pulse {
    animation: none;
    box-shadow: 0 0 8px 2px rgba(0, 212, 255, 0.35), 0 0 20px 4px rgba(139, 92, 246, 0.25);
  }
}
```

This is the CSS-layer safety net. The JS layer also checks `prefers-reduced-motion` and disables typewriter animation — but if either animated class is ever applied without the JS check running first, this CSS block suppresses it at the style level (WCAG 2.1 SC 2.3.3 compliance).

---

## Step 3 — Test Setup: Global `matchMedia` Mock

**File**: `frontend/src/test/setup.ts`

jsdom does not implement `window.matchMedia`. Every test that renders `TypewriterInput` (directly or via `HeroSection`) throws `TypeError: window.matchMedia is not a function` without a mock. Add a global default mock:

```ts
import { vi } from 'vitest'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,         // default: no reduced-motion preference
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

Individual tests that need `prefers-reduced-motion: reduce` to return `true` override this mock locally with `vi.mocked(window.matchMedia).mockReturnValue({ matches: true, ... })`.

---

## Step 4 — Create `TypewriterInput` Component

**File to create**: `frontend/src/components/TypewriterInput.tsx`

### Interface
```ts
interface TypewriterInputProps {
  onSubmit: (value: string) => void
}
```
`onSubmit` is a callback (not internal navigate) so the component is decoupled from routing and testable in isolation.

### Module-Level Constants
```ts
const PHRASES = [
  "I'm going through a difficult season. What do you recommend I pray about?",
  "I want to journal but I don't know where to start. Can you help me?",
  "My life is crazy and I can't relax. How can I meditate to calm down?",
] as const

const TYPING_SPEED_MS = 55
const DELETING_SPEED_MS = 30
const PAUSE_AFTER_COMPLETE_MS = 1800
const PAUSE_BEFORE_NEXT_MS = 500
```

Kept at module level (not inside component) to avoid re-allocation on every render and to make them easy to patch in tests.

### State Variables
```ts
// Typewriter state machine
const [displayText, setDisplayText] = useState('')
const [phase, setPhase] = useState<
  'typing' | 'pausing-complete' | 'deleting' | 'pausing-empty'
>('typing')
const [phraseIndex, setPhraseIndex] = useState(0)

// User interaction state
const [isFocused, setIsFocused] = useState(false)
const [userValue, setUserValue] = useState('')

// Accessibility: announced when a full phrase finishes typing
const [ariaAnnouncement, setAriaAnnouncement] = useState('')

// Computed once at mount — ref to avoid triggering re-renders
const prefersReducedMotion = useRef(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
)
```

`displayText` never contains the cursor character `|`. The cursor is a separate `<span aria-hidden>` sibling. This keeps `displayText` clean for submission.

### Core `useEffect` — State Machine Loop

```ts
useEffect(() => {
  if (prefersReducedMotion.current || isFocused) return

  let mounted = true
  const currentPhrase = PHRASES[phraseIndex]

  if (phase === 'typing') {
    if (displayText.length < currentPhrase.length) {
      const timer = setTimeout(() => {
        if (mounted) setDisplayText(currentPhrase.slice(0, displayText.length + 1))
      }, TYPING_SPEED_MS)
      return () => { mounted = false; clearTimeout(timer) }
    } else {
      setAriaAnnouncement(currentPhrase)  // announce full phrase to screen readers
      setPhase('pausing-complete')
    }
  }

  if (phase === 'pausing-complete') {
    const timer = setTimeout(() => {
      if (mounted) setPhase('deleting')
    }, PAUSE_AFTER_COMPLETE_MS)
    return () => { mounted = false; clearTimeout(timer) }
  }

  if (phase === 'deleting') {
    if (displayText.length > 0) {
      const timer = setTimeout(() => {
        if (mounted) setDisplayText((prev) => prev.slice(0, -1))
      }, DELETING_SPEED_MS)
      return () => { mounted = false; clearTimeout(timer) }
    } else {
      setPhase('pausing-empty')
    }
  }

  if (phase === 'pausing-empty') {
    const timer = setTimeout(() => {
      if (mounted) {
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length)
        setPhase('typing')
      }
    }, PAUSE_BEFORE_NEXT_MS)
    return () => { mounted = false; clearTimeout(timer) }
  }
}, [phase, displayText, phraseIndex, isFocused])
```

The `mounted` local variable is the React Strict Mode safety guard. Strict Mode double-invokes effects in development; the cleanup sets `mounted = false` and clears the timer before the second invocation fires. State setters are gated on `if (mounted)` to prevent updates after unmount.

### Focus / Blur Handlers
```ts
const handleFocus = () => {
  setIsFocused(true)
  // Input shows userValue when focused. Clear displayText so
  // the controlled value transitions cleanly from typewriter text to empty.
  setDisplayText('')
}

const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  if (e.currentTarget.value === '') {
    // User cleared or never typed — resume animation from start
    setIsFocused(false)
    setPhase('typing')
    setPhraseIndex(0)
    setDisplayText('')
    setAriaAnnouncement('')
  }
  // If user typed something and blurred, stay in focused mode (preserve their text)
}
```

### Input Value Resolution
```ts
const inputValue = isFocused ? userValue : displayText
```

When unfocused: input shows the typewriter `displayText`.
When focused: input shows `userValue` (what the user typed).

### Submit Handler
```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const value = isFocused ? userValue.trim() : displayText.trim()
  if (value) onSubmit(value)
}
```

### Full JSX Structure
```tsx
return (
  <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl px-4 sm:px-0">

    {/* Visually hidden label — required for WCAG 1.3.1 */}
    <label htmlFor="hero-input" className="sr-only">
      Tell us how you're feeling or what you need
    </label>

    {/* aria-live region — announces completed phrases to screen readers */}
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {ariaAnnouncement}
    </div>

    {/* Gradient border wrapper — 2px padding becomes the visual border */}
    <div
      className="animate-glow-pulse rounded-2xl p-[2px]"
      style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)' }}
    >
      {/* Input row — white background, rounded slightly less than wrapper */}
      <div className="flex items-center rounded-[14px] bg-white px-4 py-1">

        {/* Input + cursor wrapper */}
        <div className="relative flex min-h-[44px] flex-1 items-center">
          <input
            id="hero-input"
            type="text"
            value={inputValue}
            onChange={(e) => { if (isFocused) setUserValue(e.target.value) }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={prefersReducedMotion.current ? PHRASES[0] : ''}
            aria-label="Tell us how you're feeling or what you need"
            className="w-full bg-transparent text-base text-text-dark outline-none placeholder:text-text-light"
            autoComplete="off"
          />
          {/* Blinking cursor — decorative, hidden when focused or reduced motion */}
          {!isFocused && !prefersReducedMotion.current && (
            <span
              aria-hidden="true"
              className="animate-cursor-blink pointer-events-none select-none text-primary"
            >
              |
            </span>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          aria-label="Submit your question"
          className={cn(
            'ml-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary p-2.5 text-white',
            'transition-colors hover:bg-primary-lt',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </form>
)
```

**Note on cursor span**: The `|` span renders as a flex sibling after the `<input>`. It appears at the trailing edge of the input container (not trailing edge of typed text). This is visually consistent with modern AI input patterns. Do not attempt to compute text width for pixel-accurate cursor positioning — that requires DOM measurement and adds disproportionate complexity.

**Imports needed**: `useState`, `useEffect`, `useRef` from `react`; `cn` from `@/lib/utils`; `ArrowRight` from `lucide-react`.

---

## Step 5 — Create `HeroSection` Component

**File to create**: `frontend/src/components/HeroSection.tsx`

### Gradient Strategy
Two-layer `backgroundImage` (comma-separated CSS, layered top-to-bottom):

```
Layer 1 (top): radial-gradient — spotlight-from-above vignette effect
Layer 2 (base): linear-gradient — base color flow dark top → light bottom
```

Full value:
```ts
backgroundImage: [
  'radial-gradient(ellipse 100% 60% at 50% 0%, #3B0764 0%, transparent 70%)',
  'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 30%, #4A1D96 60%, #EDE9FE 88%, #F5F5F5 100%)',
].join(', ')
```

Color stops explained:
- `#0D0620` → `#1E0B3E`: Very deep dark purple at the top — maximum contrast for white text
- `#4A1D96`: Rich mid-purple at the center of the hero
- `#EDE9FE`: Pale lavender — the gradient begins softening here
- `#F5F5F5`: Matches `neutral-bg` exactly — seamless transition into the page background below the hero
- Radial layer adds the depth/vignette spotlight from above

### Section Height
```ts
minHeight: 'calc(100vh - 80px)'
```
`80px` is the estimated navbar height (pt-3 + pb-2 outer + py-3 inner + text-4xl logo ≈ 80px). Correct enough for MVP — update if navbar height changes.

### Full Component
```tsx
import { useNavigate } from 'react-router-dom'
import { TypewriterInput } from './TypewriterInput'
import { cn } from '@/lib/utils'

export function HeroSection() {
  const navigate = useNavigate()

  const handleInputSubmit = (value: string) => {
    navigate(`/scripture?q=${encodeURIComponent(value)}`)
  }

  return (
    <section
      aria-label="Welcome to Worship Room"
      className={cn(
        'relative w-full flex flex-col items-center justify-center text-center',
        'px-4 py-20 sm:py-24 lg:py-32',
        'antialiased',
      )}
      style={{
        minHeight: 'calc(100vh - 80px)',
        backgroundImage: [
          'radial-gradient(ellipse 100% 60% at 50% 0%, #3B0764 0%, transparent 70%)',
          'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 30%, #4A1D96 60%, #EDE9FE 88%, #F5F5F5 100%)',
        ].join(', '),
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">

        <h1 className="mb-4 font-sans text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          How're you feeling today?
        </h1>

        <p className="mx-auto mb-10 max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl">
          Get AI-powered guidance built on Biblical principles.
        </p>

        <TypewriterInput onSubmit={handleInputSubmit} />

      </div>
    </section>
  )
}
```

**`aria-label` on `<section>`**: Without it, `<section>` renders as an unlabeled `role="region"` that many screen readers skip. With it, screen readers announce "Welcome to Worship Room, region" during landmark navigation.

**`antialiased`**: Tailwind's `-webkit-font-smoothing: antialiased`. Prevents chunky sub-pixel rendering of white text on dark backgrounds (especially on macOS/iOS).

**Font sizes (mobile-first)**:
- Headline: `text-3xl` (1.875rem) → `sm:text-4xl` (2.25rem) → `lg:text-5xl` (3rem)
- Subtitle: `text-base` (1rem) → `sm:text-lg` (1.125rem) → `lg:text-xl` (1.25rem)

**WCAG contrast**:
- White on `#0D0620`: ~21:1 — passes AAA ✅
- `rgba(255,255,255,0.85)` on `#0D0620`: ~16:1 — passes AA ✅

---

## Step 6 — Update `Home.tsx`

**File to modify**: `frontend/src/pages/Home.tsx`

Replace the `Layout` wrapper with a custom home shell. `Layout`'s `<main>` enforces `max-w-7xl px-4 py-8` which prevents full-bleed.

```tsx
import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar />
      <main>
        <HeroSection />
      </main>
    </div>
  )
}
```

`<main>` with no padding/max-width gives `HeroSection` full-bleed control. The outer `div`'s `bg-neutral-bg` matches the hero gradient's bottom stop (`#F5F5F5`), ensuring a seamless transition as the user scrolls past the hero into future below-fold sections.

`Layout.tsx` is **not modified** — it remains the standard wrapper for all other pages.

---

## Step 7 — Update Component Exports

**File to modify**: `frontend/src/components/index.ts`

Add:
```ts
export { HeroSection } from './HeroSection'
export { TypewriterInput } from './TypewriterInput'
```

Place alphabetically with existing exports, before the `./ui` re-export.

---

## Step 8 — Write Tests

### `TypewriterInput.test.tsx`

**File to create**: `frontend/src/components/__tests__/TypewriterInput.test.tsx`

`TypewriterInput` receives `onSubmit` as a prop and does not call `useNavigate` — no `MemoryRouter` needed.

**Test cases**:
1. **Accessible label** — `getByLabelText(/tell us how you're feeling/i)` finds the input
2. **Submit button present** — `getByRole('button', { name: /submit your question/i })` in DOM, not disabled
3. **Typewriter starts on mount** — `vi.useFakeTimers()`, advance `55 * 5`ms, assert `input.value.length > 0`
4. **Types full first phrase** — advance `55 * PHRASES[0].length`ms, assert `input.value === PHRASES[0]`
5. **Static placeholder with reduced motion** — mock `matchMedia` returning `matches: true`, assert `input.placeholder === PHRASES[0]` and cursor span absent
6. **Animation pauses on focus** — advance timers partially, `userEvent.click(input)`, advance more, assert value is `''`
7. **onSubmit called with typed value** — focus, type "help me", click submit, assert `onSubmit` called with `'help me'`
8. **onSubmit not called for empty input** — submit without typing, assert `onSubmit` not called

### `HeroSection.test.tsx`

**File to create**: `frontend/src/components/__tests__/HeroSection.test.tsx`

`HeroSection` calls `useNavigate` — requires `MemoryRouter`.

```tsx
function renderHero() {
  return render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>
  )
}
```

**Test cases**:
1. **Heading** — `getByRole('heading', { name: /how're you feeling today/i })` found
2. **Subtitle** — `getByText(/AI-powered guidance built on Biblical principles/i)` found
3. **Accessible input** — `getByRole('textbox', { name: /tell us how you're feeling/i })` found
4. **Submit button** — `getByRole('button', { name: /submit your question/i })` found, `button.closest('form')` truthy
5. **Named landmark** — `getByRole('region', { name: /welcome to worship room/i })` found
6. **Navigation on submit** — render with `<Route path="/scripture" element={<div data-testid="scripture-page" />} />`, type text, submit, assert `getByTestId('scripture-page')` present

---

## Files Summary

| Action | File | Key Changes |
|--------|------|-------------|
| **Modify** | `frontend/tailwind.config.js` | Add `hero-dark`, `glow-cyan` colors; `glow-pulse`, `cursor-blink` keyframes + animations |
| **Modify** | `frontend/src/index.css` | `@media (prefers-reduced-motion)` block disabling both animations |
| **Modify** | `frontend/src/test/setup.ts` | Global `window.matchMedia` mock |
| **Create** | `frontend/src/components/TypewriterInput.tsx` | Typewriter state machine, gradient-border input, reduced-motion, `aria-live` |
| **Create** | `frontend/src/components/HeroSection.tsx` | Full-bleed gradient section, h1, subtitle, wires `TypewriterInput` → `useNavigate` |
| **Modify** | `frontend/src/pages/Home.tsx` | Custom shell: `Navbar` + `<main><HeroSection /></main>` (no `Layout`) |
| **Modify** | `frontend/src/components/index.ts` | Export `HeroSection`, `TypewriterInput` |
| **Create** | `frontend/src/components/__tests__/TypewriterInput.test.tsx` | 8 tests |
| **Create** | `frontend/src/components/__tests__/HeroSection.test.tsx` | 6 tests |

---

## Accessibility Requirements

- `<section aria-label="Welcome to Worship Room">` — named landmark (`role="region"`)
- `<label htmlFor="hero-input" className="sr-only">` — visually hidden, WCAG 1.3.1
- `<input aria-label="...">` — belt-and-suspenders alongside the label
- `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">` — announces full phrase completions
- Submit button: `aria-label="Submit your question"`, `focus-visible:ring-2`
- Minimum 44×44px tap targets: `min-h-[44px] min-w-[44px]` on submit button
- `prefers-reduced-motion` respected at JS layer (state machine early return) and CSS layer (`@media` block)
- Cursor `<span>` is `aria-hidden="true"` — decorative only
- `<h1>` is the sole heading on the page at this stage

---

## Potential Pitfalls

**1. React Strict Mode double-effect**
All `useEffect` branches use a local `mounted` variable, set `mounted = false` in cleanup, and gate state setters on `if (mounted)`. This prevents stale timer callbacks from firing during Strict Mode's double-invocation in development.

**2. Cursor span position**
The `|` span is a flex sibling of `<input>`, appearing at the container's trailing edge — not at the trailing edge of the typed text. Acceptable for a hero input; do not attempt DOM text-width measurement for pixel-perfect placement.

**3. `encodeURIComponent` for navigation**
Phrases contain `'`, spaces, `?`. Always `encodeURIComponent(value)` before embedding in URL. Future `/scripture` page decodes with `new URLSearchParams(location.search).get('q')`.

**4. `backgroundSize: '100% 100%'`**
Without this, CSS gradients tile by default. Set explicitly to prevent repeating on ultra-wide viewports.

**5. `bg-neutral-bg` / hero gradient alignment**
`Home.tsx` outer div: `bg-neutral-bg` (#F5F5F5). Hero gradient ends at `#F5F5F5` at 100%. These match exactly — the hero fades seamlessly into the page below.

---

## Implementation Order

1. `frontend/tailwind.config.js` — tokens + keyframes (all components depend on these classes)
2. `frontend/src/index.css` — reduced-motion CSS overrides
3. `frontend/src/test/setup.ts` — `matchMedia` mock (must exist before tests run)
4. `frontend/src/components/TypewriterInput.tsx` — no dependencies on other new files
5. `frontend/src/components/HeroSection.tsx` — depends on `TypewriterInput`
6. `frontend/src/pages/Home.tsx` — depends on `HeroSection`
7. `frontend/src/components/index.ts` — depends on both new components
8. `frontend/src/components/__tests__/TypewriterInput.test.tsx`
9. `frontend/src/components/__tests__/HeroSection.test.tsx`

---

## Verification Checklist

### Visual (dev server — `pnpm dev`)
- [ ] `/` shows dark purple gradient hero immediately below the white pill navbar
- [ ] Typewriter cycles through all 3 phrases: type → pause → delete → next
- [ ] Input glow border pulses cyan-to-violet
- [ ] Clicking input pauses animation and clears the display for free typing
- [ ] Blurring an empty input resumes animation from the first phrase
- [ ] Submit navigates to `/scripture?q=...` (empty page expected — route not yet built)
- [ ] Gradient fades seamlessly into off-white page background at bottom of hero

### Responsive
- [ ] Mobile (< 640px): Headline ~1.875rem, input full-width with `px-4`
- [ ] Tablet (640–1024px): Headline ~2.25rem, input max-width constrained
- [ ] Desktop (> 1024px): Headline 3rem, input centered at `max-w-xl`

### Accessibility
- [ ] Tab → input (fake cursor hides, native cursor appears) → Tab → submit (focus ring) → Enter → submits
- [ ] DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` → reload → no animation, static placeholder
- [ ] Screen reader announces "Welcome to Worship Room, region" and `h1` heading

### Tests & Build
- [ ] `pnpm test` — all new tests pass
- [ ] `pnpm test` — existing `Navbar.test.tsx` passes (no regressions)
- [ ] `pnpm lint` — zero ESLint errors
- [ ] `pnpm build` — TypeScript compiles with zero errors
