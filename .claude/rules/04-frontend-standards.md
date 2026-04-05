---
paths: ["frontend/**"]
---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router (required)
- **Data Persistence (Phase 2)**: localStorage via `StorageService` abstraction (`services/storage-service.ts`). All keys prefixed `wr_`. Abstraction designed for API swap in Phase 3+.
- **Data Fetching (Phase 3)**: direct `fetch` in custom hooks. Phase 3 will introduce API wiring; if a data-fetching library is adopted then, document it here.
- **Forms**: controlled inputs with `useState` + Zod schemas for validation where needed. **Not using** `react-hook-form` (installed but unused).
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge
- **Testing**: Vitest + React Testing Library + jsdom, Playwright for E2E

## Coding Standards

### Frontend
- Use `@/` path aliases for imports
- Export components from `components/index.ts`
- Use `cn()` utility for conditional classNames
- Validate form input with Zod schemas (controlled inputs, not react-hook-form)
- Persist user data via `StorageService` (`services/storage-service.ts`) using `wr_` prefixed keys
- Prefer composition over prop drilling
- Extract complex logic into custom hooks
- Use TypeScript interfaces for props
- Avoid inline styles (use TailwindCSS classes)

## Design System

See **[09-design-system.md](09-design-system.md)** for the comprehensive design reference including color palette (with Tailwind custom names), typography, breakpoints, custom animations, component inventory, hooks, utilities, constants, and types.

### Responsive Design Requirements
- **Mobile-first approach**: Design for mobile, enhance for larger screens
- **Touch-friendly**: Minimum 44px tap targets on mobile
- **Readable text**: Minimum 16px body font on mobile
- **Optimized layouts**:
  - Mobile: Single column, stacked navigation
  - Tablet: Two columns where appropriate, side navigation
  - Desktop: Multi-column layouts, expanded navigation
- **Responsive images**: Use `srcset` and `sizes` for optimal loading
- **Fluid typography**: Scale font sizes smoothly between breakpoints

### Accessibility Standards
- **Semantic HTML first**: Use correct elements (`<button>`, `<nav>`, `<main>`, `<label>`) before reaching for ARIA
- **Focus indicators**: Never use `outline-none` or `focus:outline-none` without a visible replacement (use `focus:ring-2` or equivalent TailwindCSS utilities)
- **Interactive elements**: All clickable/interactive elements must be keyboard accessible and have an accessible name
- **Form inputs**: Every input must have an associated `<label>` — placeholder text is not a label
- **Error states**: Use `aria-invalid="true"` and `aria-describedby` to associate error messages with inputs
- **Dynamic content**: Use `aria-live` regions for content that updates without a page reload
- **Crisis alert banner**: Must use `role="alert"` with `aria-live="assertive"` — this is a safety-critical component
- **Mood selector buttons**: Use `aria-pressed` for toggle state; if icons/emojis are used, add `aria-label`
- **Minimum tap targets**: 44×44px on mobile
- **Color contrast**: All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)

### Component Patterns
- **Mood Selector Buttons**: Large, clear buttons with subtle icons (emoji or Lucide icons)
- **Scripture Display**: Centered text, large serif font, gentle fade-in animation (CSS transition)
- **Cards**: Soft shadows, rounded corners (8px border-radius)
- **Forms**: Clear labels, inline validation, accessible error messages
- **Navigation**: Clean, minimal header (non-sticky); transparent glass-morphism variant on hero sections
- **Crisis Alert**: Prominent, accessible alert banner with hotline numbers (red/orange, high contrast)
