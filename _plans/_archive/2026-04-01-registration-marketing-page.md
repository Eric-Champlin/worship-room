# Implementation Plan: Registration Marketing Page

**Spec:** `_specs/registration-marketing-page.md`
**Date:** 2026-04-01
**Branch:** `claude/feature/registration-marketing-page`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files & Patterns

- **Route config:** `frontend/src/App.tsx:213` — `/register` currently renders `<ComingSoon title="Get Started" />`. Replace with lazy-loaded `RegisterPage`.
- **ComingSoon stub:** `frontend/src/App.tsx:88-104` — inline component using `<Layout>` wrapper. The new `RegisterPage` will NOT use `<Layout>` because it needs full-width dark sections (same reason `Home.tsx`, `GrowPage.tsx`, and `DailyHub.tsx` build their own structure).
- **Navbar desktop "Get Started":** `frontend/src/components/Navbar.tsx:125-136` — `<button>` with `onClick={() => authModal?.openAuthModal(undefined, 'register')}`. Change to `<Link to="/register">` preserving identical styling.
- **Navbar mobile "Get Started":** `frontend/src/components/MobileDrawer.tsx:262-268` — `<button>` with same auth modal handler + `onClose()`. Change to `<Link to="/register" onClick={onClose}>` preserving identical styling.
- **Auth modal:** `AuthModalProvider.tsx` exposes `useAuthModal()` with `openAuthModal(subtitle?, 'login' | 'register')`. RegisterPage will call this for CTA buttons.
- **SEO component:** `frontend/src/components/SEO.tsx` — accepts `title`, `description`, `canonical`, `noIndex`, `jsonLd`. RegisterPage uses it without `noIndex` (page is indexable).
- **Gradient text:** `frontend/src/constants/gradients.tsx:6-15` — `WHITE_PURPLE_GRADIENT` (223deg, white→#8B5CF6), `GRADIENT_TEXT_STYLE` CSSProperties object. Used by HeroSection, PageHero, GrowPage, BibleBrowser.
- **useInView hook:** `frontend/src/hooks/useInView.ts` — IntersectionObserver-based, returns `[ref, inView]` tuple, respects `prefers-reduced-motion` (immediately true). Used in JourneySection, StartingPointQuiz, GrowthTeasersSection.
- **Dark page structure pattern:** Pages like `GrowPage.tsx`, `BibleBrowser.tsx` build their own shell: `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">` → `<Navbar />` → `<main>` → sections → `<SiteFooter />`. RegisterPage follows this pattern.
- **Frosted glass cards:** Dashboard Card Pattern from design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`.
- **Primary CTA (rounded) button:** `bg-primary text-white font-medium py-3 px-8 rounded-full` (design-system.md:266).

### Directory Conventions

- Pages: `frontend/src/pages/RegisterPage.tsx` (new)
- Tests: `frontend/src/pages/__tests__/RegisterPage.test.tsx` (new)
- No new components, hooks, constants, or utilities needed.

### Test Patterns

- Provider wrapping: `MemoryRouter` + `ToastProvider` + `AuthModalProvider` (see `Home.test.tsx:12-22`, `GrowPage.test.tsx:65-78`)
- Mock `useAuth`: `vi.mock('@/hooks/useAuth', ...)` returning `{ isAuthenticated: false, ... }`
- Mock `useAuthModal`: mock `openAuthModal` as `vi.fn()` to assert calls
- MemoryRouter uses `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`
- Use `screen.getByRole('heading', ...)`, `screen.getByText(...)`, `userEvent.click(...)` patterns

---

## Auth Gating Checklist

**This page is fully public. No content is auth-gated. Auth modal is triggered only by explicit CTA clicks.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Create Your Free Account" (hero) | Opens auth modal to Register view | Step 2 | `useAuthModal().openAuthModal(undefined, 'register')` |
| Click "Create Your Free Account" (final CTA) | Opens auth modal to Register view | Step 2 | `useAuthModal().openAuthModal(undefined, 'register')` |
| Click "Log in" link (hero) | Opens auth modal to Login view | Step 2 | `useAuthModal().openAuthModal(undefined, 'login')` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Page background | background | `bg-dashboard-dark` (solid dark) | GrowPage.tsx:84, tailwind config |
| Hero background | gradient | `linear-gradient(to bottom, #0D0620, #1E0B3E)` (`from-hero-dark to-hero-mid`) | design-system.md:54-55, spec |
| Hero heading gradient text | style object | `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` (223deg white→#8B5CF6) | gradients.tsx:9-15 |
| Hero heading | font | Inter, bold, `text-3xl sm:text-4xl lg:text-5xl` (not Caveat — this is a sentence, not a script accent) | [UNVERIFIED] see note below |
| Hero subtitle | font/color | Inter 400, `text-white/70 text-lg sm:text-xl` | design-system.md text opacity standards |
| Primary CTA button | classes | `bg-primary hover:bg-primary-lt text-white font-medium text-lg px-8 py-4 rounded-full` | design-system.md:266, spec says scale up for hero |
| Frosted glass card | classes | `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` | design-system.md:40-43 |
| Card hover | classes | `hover:bg-white/[0.07] transition-colors` | spec |
| Card padding | classes | `p-6 sm:p-8` | design-system.md:43 |
| Stat number | classes | `text-white text-2xl font-bold` | spec |
| Stat label | classes | `text-white/60 text-sm` | spec |
| Check icon color | classes | `text-primary` (#6D28D9) | spec |
| Checklist text | classes | `text-white/80` | spec |
| Section spacing | classes | `py-16 sm:py-24` | spec |
| Max content width | classes | `max-w-4xl mx-auto px-4 sm:px-6` | [UNVERIFIED] based on marketing page needs |
| Muted text ("Already have an account?") | classes | `text-white/50 text-sm` | design-system.md text opacity |
| "Log in" link | classes | `text-primary hover:text-primary-lt underline` | codebase pattern |

**[UNVERIFIED] Hero heading font choice:**
The spec says "large, bold" with gradient text. Landing page hero uses Caveat (font-script), but that heading is short/poetic ("How're You Feeling Today?"). The register page heading "Your sanctuary is ready." is a full sentence — more natural in Inter bold (matching GrowPage, BibleBrowser hero headings). The gradient text treatment still applies.
→ To verify: Run `/verify-with-playwright` and compare visual feel
→ If wrong: Switch to `font-script` Caveat if the user prefers the landing page style

**[UNVERIFIED] Max content width:**
Using `max-w-4xl` (896px) for marketing sections — wider than Daily Hub's `max-w-2xl` but narrower than full `max-w-7xl`. Good for readability of marketing copy.
→ To verify: Visual inspection during execution
→ If wrong: Adjust to `max-w-3xl` or `max-w-5xl` as needed

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses `Caveat` (`font-script`) for script/highlighted headings — NOT for full sentences. Full-sentence headings use Inter bold.
- `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` is the canonical way to apply white-to-purple gradient text. Do NOT hand-roll the CSS.
- Frosted glass cards: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` — exact dashboard card pattern.
- Primary CTA (rounded): `bg-primary text-white font-medium py-3 px-8 rounded-full` — scale up with `text-lg py-4` for hero prominence.
- Text opacity on dark backgrounds: primary body `text-white/70`, secondary `text-white/60`, muted/interactive `text-white/50`. Body text below `text-white/60` fails WCAG AA.
- Dark page shell pattern: `<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">` (not `<Layout dark>`).
- All `useInView()` animations must respect `prefers-reduced-motion` — the hook handles this automatically.
- `Link` from react-router-dom for internal navigation — NOT `<a href>`.
- Navbar "Get Started" button has two style variants: transparent mode (`bg-white/20 border border-white/30`) and solid mode (`bg-primary hover:bg-primary-lt`). Both must become `<Link>` elements with identical visual styles.

---

## Shared Data Models (from Master Plan)

N/A — standalone feature. No shared data models, no localStorage keys.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Single column throughout. Hero text centered, CTA button full-width (`w-full`). Feature cards stacked single column. Stats in 2-column grid. Checklist left-aligned. Final CTA full-width button. |
| Tablet | 768px | Feature cards in 2x2 grid (`grid-cols-2`). Stats in 3-column grid (`grid-cols-3`). Hero and final CTA centered with auto-width buttons (`sm:w-auto`). |
| Desktop | 1440px | Full layout — 2x2 feature cards, 3x2 stats grid. Generous section spacing (`py-16 sm:py-24`). Max content width constrained (`max-w-4xl`). |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → hero top | ~0px (hero has its own `pt-32 sm:pt-40`) | GrowPage pattern |
| Hero → feature showcase | `py-16 sm:py-24` on each section | spec |
| Feature showcase → stats | `py-16 sm:py-24` | spec |
| Stats → differentiator | `py-16 sm:py-24` | spec |
| Differentiator → final CTA | `py-16 sm:py-24` | spec |
| Final CTA → footer | 0px (section padding handles it) | pattern |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/registration-marketing-page` exists and is checked out
- [ ] `pnpm build` passes cleanly on current branch
- [ ] `pnpm test` passes on current branch
- [ ] All auth-gated actions from the spec are accounted for in the plan (3 CTA interactions)
- [ ] Design system values verified from design-system.md and codebase inspection
- [ ] All [UNVERIFIED] values flagged with verification methods (2 items)
- [ ] No prior specs in a sequence to wait for (standalone feature)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Page structure | Custom shell (not `<Layout>`) | Page needs full-width dark sections like GrowPage, BibleBrowser. `<Layout>` wraps content in `max-w-7xl px-4 py-8` which constrains section backgrounds. |
| Navbar transparency | Non-transparent (`<Navbar />`) | Spec says "not transparent — this is not the landing page." Consistent with inner pages. |
| Hero heading font | Inter bold (not Caveat) | "Your sanctuary is ready." is a complete sentence. Caveat is for short poetic/script words. Gradient text still applied via `GRADIENT_TEXT_STYLE`. |
| Emoji icons in cards | Native emoji characters, not images | Spec explicitly states "render natively across all platforms without asset loading." Use `<span role="img" aria-hidden="true">` since decorative. |
| Link implementation for "Get Started" | `<Link>` from react-router-dom | Internal route navigation. Must preserve all existing CSS classes from the current `<button>`. |
| Mobile "Get Started" link | `<Link>` + `onClick={onClose}` | Must close the mobile drawer when navigating, same as current button behavior. |
| Logged-in user sees same page | No conditional rendering | Spec: "page is useful as a feature overview even if logged in." CTAs still open auth modal (harmless in simulated auth). |
| `<Link>` vs `<button>` styling | Use `className` on `<Link>` matching current button classes | react-router `<Link>` accepts `className`. No wrapper needed. |

---

## Implementation Steps

### Step 1: Create RegisterPage component

**Objective:** Build the full `/register` marketing page with all 5 sections, animations, and responsive layout.

**Files to create:**
- `frontend/src/pages/RegisterPage.tsx` — new page component

**Details:**

Page follows the dark page shell pattern from `GrowPage.tsx:84-97`:

```tsx
<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
  <SEO title="Get Started" description="Create your free Worship Room account — AI-powered prayer, Bible reading, journaling, meditation, worship music, and community. Completely free, forever." canonical="/register" />
  <a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>
  <Navbar />
  <main id="main-content">
    {/* 5 sections */}
  </main>
  <SiteFooter />
</div>
```

**Section 1 — Hero:**
- `<section>` with `aria-labelledby="register-hero-heading"`, background `bg-gradient-to-b from-hero-dark to-hero-mid`, padding `pt-32 pb-16 sm:pt-40 sm:pb-24`
- Content wrapper: `max-w-4xl mx-auto px-4 sm:px-6 text-center`
- `<h1>` with `GRADIENT_TEXT_STYLE` inline style, classes `text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl`
- Subtitle: `<p className="mt-4 text-lg text-white/70 sm:text-xl max-w-2xl mx-auto">`
- CTA button: `<button onClick={() => authModal?.openAuthModal(undefined, 'register')} className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full sm:w-auto min-h-[44px]">Create Your Free Account</button>`
- Login link: `<p className="mt-4 text-sm text-white/50">Already have an account? <button onClick={() => authModal?.openAuthModal(undefined, 'login')} className="text-primary hover:text-primary-lt underline">Log in</button></p>`
- `useInView` on the section for fade-in animation

**Section 2 — Feature Showcase (4 cards):**
- `<section>` with `py-16 sm:py-24`, `aria-labelledby="register-features-heading"`
- Content wrapper: `max-w-4xl mx-auto px-4 sm:px-6`
- `<h2>` not needed per spec (no heading for this section — cards speak for themselves). Actually, reviewing the spec: there's no explicit heading for this section. The 4 cards are the section. Use `aria-label="Feature highlights"` on the section instead.
- Grid: `grid grid-cols-1 sm:grid-cols-2 gap-6`
- Each card: `<div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 text-center hover:bg-white/[0.07] transition-colors">`
  - Emoji: `<div className="text-4xl mb-4"><span role="img" aria-hidden="true">{emoji}</span></div>`
  - Title: `<h3 className="text-lg font-semibold text-white mb-2">{title}</h3>`
  - Description: `<p className="text-sm text-white/60 leading-relaxed">{description}</p>`
- `useInView` on grid container; each card gets staggered `transition-delay` (0ms, 100ms, 200ms, 300ms) with `opacity` and `translateY` animation

**Section 3 — Stats:**
- `<section>` with `py-16 sm:py-24`, `aria-labelledby="register-stats-heading"`
- `<h2>` "The numbers behind the room" — `text-2xl font-bold text-white sm:text-3xl text-center mb-12`
- Grid: `grid grid-cols-2 sm:grid-cols-3 gap-8`
- Each stat: `<div className="text-center">`
  - Number: `<div className="text-2xl font-bold text-white">{value}</div>`
  - Label: `<div className="text-sm text-white/60 mt-1">{label}</div>`
- `useInView` with staggered delays (50ms increments)

**Section 4 — Differentiator Checklist:**
- `<section>` with `py-16 sm:py-24`, `aria-labelledby="register-why-heading"`
- `<h2>` "Why Worship Room is different" — `text-2xl font-bold text-white sm:text-3xl text-center mb-12`
- List wrapper: `max-w-2xl mx-auto` (narrower for readability)
- Each item: `<div className="flex items-start gap-3 mb-6">`
  - Check icon: Lucide `Check` or `CheckCircle`, `className="text-primary flex-shrink-0 mt-0.5"`, size 20
  - Text: `<p className="text-white/80">{text}</p>`

**Section 5 — Final CTA:**
- `<section>` with `py-16 sm:py-24 text-center`
- `<h2>` "Ready to step inside?" — `text-2xl font-bold text-white sm:text-3xl`
- Same CTA button as hero: `mt-8`, same classes
- Subtext: `<p className="mt-4 text-sm text-white/50">No credit card. No trial period. Just peace.</p>`
- `useInView` for fade-in

**Animation pattern (all sections):**
```tsx
const [sectionRef, inView] = useInView<HTMLElement>({ threshold: 0.1 })
// On the element:
ref={sectionRef}
className={cn(
  'transition-all duration-500 ease-out',
  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
)}
```

For staggered children (cards, stats), use inline `style={{ transitionDelay: `${index * delayMs}ms` }}` on each child, wrapped in same `inView` parent check.

**Imports:**
- `{ Navbar }` from `@/components/Navbar`
- `{ SiteFooter }` from `@/components/SiteFooter`
- `{ SEO }` from `@/components/SEO`
- `{ GRADIENT_TEXT_STYLE }` from `@/constants/gradients`
- `{ useAuthModal }` from `@/components/prayer-wall/AuthModalProvider`
- `{ useInView }` from `@/hooks/useInView`
- `{ cn }` from `@/lib/utils`
- `{ Check }` from `lucide-react`

**Auth gating:**
- N/A — page is public. Auth modal called only on explicit CTA clicks.

**Responsive behavior:**
- Desktop (1440px): `max-w-4xl` centered content, 2x2 feature grid, 3x2 stats grid, generous `py-24` sections
- Tablet (768px): Same 2x2 feature grid via `sm:grid-cols-2`, 3-col stats via `sm:grid-cols-3`, buttons `sm:w-auto`
- Mobile (375px): Single column cards, 2-col stats, full-width CTAs (`w-full`), `py-16` sections

**Guardrails (DO NOT):**
- DO NOT use `<Layout>` wrapper — page needs full-width dark sections
- DO NOT use Caveat/font-script for the h1 — it's a full sentence, not a script accent
- DO NOT add images, videos, or heavy assets — text + CSS + emoji only
- DO NOT add `noIndex` to SEO — page must be indexable
- DO NOT use `dangerouslySetInnerHTML` anywhere
- DO NOT hand-roll gradient text CSS — use `GRADIENT_TEXT_STYLE` from constants
- DO NOT make the navbar transparent — this is not the landing page
- DO NOT add any localStorage reads/writes
- DO NOT conditionally render content based on auth state — page content is the same for logged-in and logged-out users

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders hero heading | integration | `getByRole('heading', { level: 1, name: /your sanctuary is ready/i })` |
| renders all 4 feature cards | integration | All 4 titles present: "Prayers written for your heart", "Watch your faith grow", "You're not alone", heading with "Bible, Devotionals..." |
| renders all 6 stats | integration | All 6 stat values present: "66 books", "50 devotionals", "24 ambient sounds", "10 reading plans", "5 seasonal challenges", "Completely free" |
| renders 4 differentiator items | integration | 4 items with "free", "No ads", "No data harvesting", "Grace-based" text |
| hero CTA opens auth modal in register mode | integration | Click "Create Your Free Account" (hero), assert `openAuthModal(undefined, 'register')` called |
| final CTA opens auth modal in register mode | integration | Click "Create Your Free Account" (final), assert `openAuthModal` called |
| "Log in" link opens auth modal in login mode | integration | Click "Log in" link, assert `openAuthModal(undefined, 'login')` called |
| SEO renders correct meta | integration | Check title contains "Get Started", no `noindex` meta |
| heading hierarchy | integration | Single h1, multiple h2s (stats heading, differentiator heading, final CTA heading) |
| accessible button labels | integration | All buttons have accessible names |
| renders navbar (non-transparent) | integration | Navigation landmark present |
| renders footer | integration | Contentinfo landmark present |

**Expected state after completion:**
- [ ] `RegisterPage.tsx` exists with all 5 sections
- [ ] All animations use `useInView` with `prefers-reduced-motion` support
- [ ] Responsive layout works at all 3 breakpoints
- [ ] Auth modal opens correctly from all 3 trigger points

---

### Step 2: Wire route and update navbar

**Objective:** Replace the `/register` ComingSoon stub with RegisterPage, change "Get Started" button to a `<Link>` in both desktop navbar and mobile drawer.

**Files to modify:**
- `frontend/src/App.tsx` — update `/register` route to lazy-load `RegisterPage`
- `frontend/src/components/Navbar.tsx` — change desktop "Get Started" button to `<Link>`
- `frontend/src/components/MobileDrawer.tsx` — change mobile "Get Started" button to `<Link>`

**Details:**

**App.tsx changes:**

Add lazy import near the top with other lazy imports:
```tsx
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
```

Replace line 213:
```tsx
// OLD: <Route path="/register" element={<ComingSoon title="Get Started" />} />
// NEW:
<Route path="/register" element={<Suspense fallback={null}><RegisterPage /></Suspense>} />
```

Use `fallback={null}` — the page is text-only and loads instantly. No skeleton needed.

**Navbar.tsx changes (lines 125-136):**

Replace the `<button>` with a `<Link>`:
```tsx
// OLD:
<button
  type="button"
  onClick={() => authModal?.openAuthModal(undefined, 'register')}
  className={cn(
    'inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    transparent
      ? 'bg-white/20 hover:bg-white/30 border border-white/30'
      : 'bg-primary hover:bg-primary-lt'
  )}
>
  Get Started
</button>

// NEW:
<Link
  to="/register"
  className={cn(
    'inline-flex items-center rounded-full px-5 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    transparent
      ? 'bg-white/20 hover:bg-white/30 border border-white/30'
      : 'bg-primary hover:bg-primary-lt'
  )}
>
  Get Started
</Link>
```

Add `Link` to the `react-router-dom` import if not already present.

**MobileDrawer.tsx changes (lines 262-268):**

Replace the `<button>` with a `<Link>`:
```tsx
// OLD:
<button
  type="button"
  onClick={() => { authModal?.openAuthModal(undefined, 'register'); onClose() }}
  className="min-h-[44px] flex items-center justify-center rounded-full bg-white/20 border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  Get Started
</button>

// NEW:
<Link
  to="/register"
  onClick={onClose}
  className="min-h-[44px] flex items-center justify-center rounded-full bg-white/20 border border-white/30 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  Get Started
</Link>
```

Add `Link` to the `react-router-dom` import if not already present.

**Auth gating:** N/A — no UI impact on auth gating.

**Responsive behavior:** N/A: no UI impact (navbar responsive behavior unchanged).

**Guardrails (DO NOT):**
- DO NOT change the "Log In" button — it must remain a button opening the auth modal
- DO NOT change any CSS classes on the "Get Started" element — only the element type changes
- DO NOT remove the `onClose` call on mobile — the drawer must close when navigating
- DO NOT change the `/login` route — it stays as `ComingSoon`
- DO NOT add `RegisterPage` to the non-lazy imports — use `React.lazy()` for code splitting

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| "Get Started" desktop link navigates to /register | unit | Render `Navbar`, verify "Get Started" has `href="/register"` (Link renders as `<a>`) |
| "Get Started" mobile link navigates to /register | unit | Render `MobileDrawer`, verify "Get Started" has `href="/register"` |
| "Log In" still opens auth modal | unit | Verify desktop "Log In" button still calls `openAuthModal` on click |
| /register route renders RegisterPage | integration | Render app at `/register`, verify hero heading appears (not "Coming Soon") |

**Expected state after completion:**
- [ ] `/register` renders `RegisterPage` (not `ComingSoon`)
- [ ] "Get Started" in desktop navbar is a `<Link to="/register">`
- [ ] "Get Started" in mobile drawer is a `<Link to="/register">` with `onClick={onClose}`
- [ ] "Log In" button behavior unchanged
- [ ] `/login` route unchanged
- [ ] RegisterPage is lazy-loaded (code-split)

---

### Step 3: Write tests

**Objective:** Create comprehensive tests for the RegisterPage and navbar changes.

**Files to create:**
- `frontend/src/pages/__tests__/RegisterPage.test.tsx` — new test file

**Files to modify:**
- Existing navbar tests (if they exist and test "Get Started" behavior)

**Details:**

**RegisterPage.test.tsx** — follow the `Home.test.tsx` and `GrowPage.test.tsx` patterns:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { RegisterPage } from '@/pages/RegisterPage'

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

// Mock useAuthModal with trackable fn
const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<typeof import('@/components/prayer-wall/AuthModalProvider')>('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  }
})
```

Render helper:
```tsx
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <RegisterPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}
```

Tests:
1. `renders hero heading` — `getByRole('heading', { level: 1, name: /your sanctuary is ready/i })`
2. `renders hero subtitle` — `getByText(/free, peaceful space/i)`
3. `renders all 4 feature cards` — assert 4 card titles present
4. `renders stats heading` — `getByRole('heading', { name: /numbers behind the room/i })`
5. `renders all 6 stats` — assert "66 books", "50 devotionals", etc.
6. `renders differentiator heading` — `getByRole('heading', { name: /why worship room is different/i })`
7. `renders 4 differentiator items` — assert all 4 texts present
8. `renders final CTA heading` — `getByRole('heading', { name: /ready to step inside/i })`
9. `hero CTA opens auth modal in register mode` — click first "Create Your Free Account", assert `mockOpenAuthModal(undefined, 'register')`
10. `final CTA opens auth modal in register mode` — click second "Create Your Free Account", assert `mockOpenAuthModal(undefined, 'register')`
11. `"Log in" link opens auth modal in login mode` — click "Log in", assert `mockOpenAuthModal(undefined, 'login')`
12. `heading hierarchy: single h1, h2s for sections` — `getAllByRole('heading', { level: 1 })` has length 1; `getAllByRole('heading', { level: 2 })` has length >= 3
13. `renders navbar` — `getByRole('navigation', { name: /main navigation/i })`
14. `renders footer` — `getAllByRole('contentinfo')` length >= 1
15. `all CTA buttons have accessible names` — `getAllByRole('button', { name: /create your free account/i })` has length 2

**Auth gating:** N/A: no UI impact.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT test animation timing or CSS transitions — brittle and not meaningful
- DO NOT test `prefers-reduced-motion` behavior — the `useInView` hook is already tested
- DO NOT import from `@testing-library/jest-dom` — it's auto-loaded via Vitest setup
- DO NOT snapshot test — prefer explicit assertions

**Test specifications:** (this step IS the test step)

**Expected state after completion:**
- [ ] `RegisterPage.test.tsx` passes all 15 tests
- [ ] `pnpm test` passes with 0 failures
- [ ] Coverage: all CTA interactions, all sections, heading hierarchy, a11y basics

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Create RegisterPage component with all 5 sections |
| 2 | 1 | Wire route and update navbar links |
| 3 | 1, 2 | Write comprehensive tests |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create RegisterPage component | [COMPLETE] | 2026-04-01 | Created `frontend/src/pages/RegisterPage.tsx` with all 5 sections (hero, features, stats, differentiators, final CTA). All useInView animations. Build passes. Visual verification deferred to Step 2 route wiring. |
| 2 | Wire route and update navbar | [COMPLETE] | 2026-04-01 | Updated App.tsx (lazy route), Navbar.tsx (Link), MobileDrawer.tsx (Link+onClose), Navbar.test.tsx (button→link assertion). Build passes, 5311 tests pass. Visual verification confirmed at 3 breakpoints. |
| 3 | Write tests | [COMPLETE] | 2026-04-01 | Created `frontend/src/pages/__tests__/RegisterPage.test.tsx` with 15 tests. Updated existing Navbar.test.tsx (button→link assertion). Full suite: 467 files, 5326 tests, 0 failures. |
