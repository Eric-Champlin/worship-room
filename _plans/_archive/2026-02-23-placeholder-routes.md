# Implementation Plan: Placeholder Routes

**Spec:** `_specs/placeholder-routes.md`
**Date:** 2026-02-23
**Branch:** `claude/feature/placeholder-routes`

---

## Architecture Context

### Relevant Existing Files
- `frontend/src/App.tsx` (20 lines) — BrowserRouter with 2 routes: `/` → `Home`, `/health` → `Health`. Uses `QueryClientProvider` wrapper.
- `frontend/src/pages/Home.tsx` (15 lines) — Uses `Navbar transparent` + `<main>` with `HeroSection` and `JourneySection`. No `Layout` wrapper.
- `frontend/src/pages/Health.tsx` (97 lines) — Uses `Layout` component wrapper (Navbar + max-w-7xl padded main).
- `frontend/src/components/Layout.tsx` (17 lines) — Provides non-transparent `Navbar` + `<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">`. Suitable for interior pages.

### Directory Conventions
- Pages in `frontend/src/pages/` (named exports, PascalCase filenames)
- No existing `pages/__tests__/` directory — tests will go in `frontend/src/pages/__tests__/`
- Components in `frontend/src/components/`
- Uses `@/` path alias for imports

### Component Patterns to Follow
- Named exports: `export function PageName() { ... }`
- `Layout` wrapper for interior (non-hero) pages — provides Navbar + padded main
- `cn()` utility for conditional class names
- TailwindCSS for all styling, no inline styles (except font-family for Caveat)
- Lucide React for icons

### Test Patterns to Match
- Vitest + React Testing Library
- `MemoryRouter` wrapper for components using router
- `screen.getByRole('heading', { name: ... })` for heading checks
- `screen.getByText(...)` for content checks
- `describe`/`it`/`expect` from vitest
- Helper `renderXxx()` function at top of test file

### Design System
- Primary: `#6D28D9` (violet) — Tailwind class `text-primary`
- Neutral BG: `#F5F5F5` — Tailwind class `bg-neutral-bg`
- Text Dark: `#2C3E50` — Tailwind class `text-text-dark`
- Text Light: `#7F8C8D` — Tailwind class `text-text-light`
- Decorative font: Caveat — `style={{ fontFamily: "'Caveat', cursive" }}`
- Body font: Inter — applied via `font-sans` class

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/placeholder-routes` is checked out with a clean working directory
- [ ] The `Layout` component exists at `frontend/src/components/Layout.tsx` and provides Navbar + padded main
- [ ] These placeholder pages will be completely replaced when the real features are built — no need to design for extensibility
- [ ] No `frontend/src/pages/__tests__/` directory exists yet — it will be created

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Page wrapper | Use `Layout` component | Provides consistent Navbar + padded main for interior pages, matching `Health.tsx` pattern |
| "Coming Soon" style | Use Caveat font for decorative touch | Matches site personality per spec's UX notes |
| Shared vs individual components | 3 separate page files, no shared "ComingSoon" component | These are temporary pages that will be replaced — a shared component adds unnecessary abstraction |
| Test location | `frontend/src/pages/__tests__/` | Follows the `__tests__` co-location pattern used by components |
| Vertical centering | Use `min-h-[60vh] flex items-center justify-center` on content wrapper | Centers content visually within the Layout's main area without fighting the Layout's padding |

---

## Implementation Steps

### Step 1: Create 3 Placeholder Page Components

**Objective:** Create Listen.tsx, Insights.tsx, and Daily.tsx as minimal placeholder pages using the Layout component.

**Files to create:**
- `frontend/src/pages/Listen.tsx`
- `frontend/src/pages/Insights.tsx`
- `frontend/src/pages/Daily.tsx`

**Details:**

Each page follows the same structure. Use `Layout` wrapper. Content is a centered block with:
1. An h1 heading (the page title)
2. A paragraph describing the upcoming feature
3. A "Coming Soon" indicator in Caveat font with primary color

**Listen.tsx:**
```tsx
import { Layout } from '@/components/Layout'

export function Listen() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Listen
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Hear God's Word spoken over you. Audio scripture, spoken prayers, and
            calming content for rest and renewal — coming to this space soon.
          </p>
          <p
            className="text-2xl text-primary sm:text-3xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
  )
}
```

**Insights.tsx:**
```tsx
import { Layout } from '@/components/Layout'

export function Insights() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Reflect
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Track your spiritual journey and discover patterns in your growth.
            See how far you've come — this space will help you reflect on
            what God is doing in your life.
          </p>
          <p
            className="text-2xl text-primary sm:text-3xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
  )
}
```

**Daily.tsx:**
```tsx
import { Layout } from '@/components/Layout'

export function Daily() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Daily Verse & Song
          </h1>
          <p className="mb-6 text-base leading-relaxed text-text-dark sm:text-lg">
            Start each day with a scripture verse and a worship song
            recommendation chosen just for you. A daily moment of peace
            and inspiration is on its way.
          </p>
          <p
            className="text-2xl text-primary sm:text-3xl"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
  )
}
```

**Guardrails (DO NOT):**
- Do NOT add any user input fields, forms, or interactive elements
- Do NOT add any API calls or data fetching
- Do NOT add any state management
- Do NOT create a shared "ComingSoon" component — these are temporary pages
- Do NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (deferred to Step 3) | — | All tests in Step 3 |

**Expected state after completion:**
- [ ] 3 new files exist in `frontend/src/pages/`
- [ ] `pnpm build` compiles without errors

---

### Step 2: Register Routes in App.tsx

**Objective:** Add `/listen`, `/insights`, and `/daily` routes to the application router.

**Files to modify:**
- `frontend/src/App.tsx` — Add 3 imports and 3 Route elements

**Details:**

Add imports for the 3 new page components:
```tsx
import { Listen } from './pages/Listen'
import { Insights } from './pages/Insights'
import { Daily } from './pages/Daily'
```

Add 3 Route elements inside the existing `<Routes>` block, after the existing routes:
```tsx
<Route path="/listen" element={<Listen />} />
<Route path="/insights" element={<Insights />} />
<Route path="/daily" element={<Daily />} />
```

**Guardrails (DO NOT):**
- Do NOT change existing routes (`/` and `/health`)
- Do NOT add route guards or authentication checks — these are public routes
- Do NOT change the QueryClientProvider or BrowserRouter wrappers

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (deferred to Step 3) | — | All tests in Step 3 |

**Expected state after completion:**
- [ ] `pnpm build` compiles without errors
- [ ] Navigating to `/listen`, `/insights`, `/daily` in the browser renders the placeholder pages

---

### Step 3: Add Tests for All 3 Placeholder Pages

**Objective:** Create test files for Listen, Insights, and Daily pages verifying they render their heading, description, and "Coming Soon" indicator.

**Files to create:**
- `frontend/src/pages/__tests__/Listen.test.tsx`
- `frontend/src/pages/__tests__/Insights.test.tsx`
- `frontend/src/pages/__tests__/Daily.test.tsx`

**Details:**

Each test file follows the same pattern. Use `MemoryRouter` wrapper (required because `Layout` renders `Navbar` which uses `useLocation`).

**Listen.test.tsx:**
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Listen } from '@/pages/Listen'

function renderListen() {
  return render(
    <MemoryRouter>
      <Listen />
    </MemoryRouter>
  )
}

describe('Listen', () => {
  it('renders the page heading', () => {
    renderListen()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Listen' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderListen()
    expect(
      screen.getByText(/audio scripture, spoken prayers, and calming content/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderListen()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
```

**Insights.test.tsx:**
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Insights } from '@/pages/Insights'

function renderInsights() {
  return render(
    <MemoryRouter>
      <Insights />
    </MemoryRouter>
  )
}

describe('Insights', () => {
  it('renders the page heading', () => {
    renderInsights()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reflect' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderInsights()
    expect(
      screen.getByText(/track your spiritual journey and discover patterns/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderInsights()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
```

**Daily.test.tsx:**
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Daily } from '@/pages/Daily'

function renderDaily() {
  return render(
    <MemoryRouter>
      <Daily />
    </MemoryRouter>
  )
}

describe('Daily', () => {
  it('renders the page heading', () => {
    renderDaily()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Daily Verse & Song' })
    ).toBeInTheDocument()
  })

  it('renders the description text', () => {
    renderDaily()
    expect(
      screen.getByText(/scripture verse and a worship song recommendation/i)
    ).toBeInTheDocument()
  })

  it('renders the Coming Soon indicator', () => {
    renderDaily()
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })
})
```

**Guardrails (DO NOT):**
- Do NOT test navigation behavior (these are simple render tests)
- Do NOT test the Layout or Navbar (those have their own tests)
- Do NOT mock any dependencies — these pages have no external deps

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Listen - renders heading | unit | h1 with text "Listen" |
| Listen - renders description | unit | Description text about audio scripture |
| Listen - renders Coming Soon | unit | "Coming Soon" text present |
| Insights - renders heading | unit | h1 with text "Reflect" |
| Insights - renders description | unit | Description text about spiritual journey |
| Insights - renders Coming Soon | unit | "Coming Soon" text present |
| Daily - renders heading | unit | h1 with text "Daily Verse & Song" |
| Daily - renders description | unit | Description text about verse and song |
| Daily - renders Coming Soon | unit | "Coming Soon" text present |

**Expected state after completion:**
- [ ] `pnpm test` — all tests pass (9 new + 57 existing = 66 total)
- [ ] `pnpm lint` — no lint errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create 3 placeholder page components |
| 2 | 1 | Register routes in App.tsx |
| 3 | 1 | Add tests for all 3 placeholder pages |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create 3 Placeholder Page Components | [COMPLETE] | 2026-02-23 | Created `frontend/src/pages/Listen.tsx`, `Insights.tsx`, `Daily.tsx` — each uses Layout wrapper, centered content with h1, description, and Caveat "Coming Soon" |
| 2 | Register Routes in App.tsx | [COMPLETE] | 2026-02-23 | Modified `frontend/src/App.tsx`: added imports for Listen, Insights, Daily + 3 Route elements for `/listen`, `/insights`, `/daily` |
| 3 | Add Tests for All 3 Placeholder Pages | [COMPLETE] | 2026-02-23 | Created `frontend/src/pages/__tests__/Listen.test.tsx`, `Insights.test.tsx`, `Daily.test.tsx` — 3 tests each (heading, description, Coming Soon). 66 total tests pass. |
