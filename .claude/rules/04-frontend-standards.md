---
paths: ["frontend/**"]
---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router (required)
- **Data Fetching**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge
- **Testing**: Vitest + React Testing Library + jsdom

## Coding Standards

### Frontend
- Use `@/` path aliases for imports
- Export components from `components/index.ts`
- Use `cn()` utility for conditional classNames
- Validate forms with Zod schemas
- Use React Query for data fetching
- Prefer composition over prop drilling
- Extract complex logic into custom hooks
- Use TypeScript interfaces for props
- Avoid inline styles (use TailwindCSS classes)

## Design System

### Color Palette
- **Primary Blue**: `#4A90E2` (soft, calming blue)
- **Secondary Blue**: `#5BA3F5` (lighter accent)
- **Neutral Background**: `#F5F5F5` (warm off-white)
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue)
- **Text Light**: `#7F8C8D` (medium gray)
- **Success**: `#27AE60` (green for positive moods)
- **Warning**: `#F39C12` (orange for neutral moods)
- **Error**: `#E74C3C` (red for negative moods/flags)

### Typography
- **Body Font**: Inter or Open Sans (sans-serif)
  - Regular: 400
  - Medium: 500
  - Bold: 700
- **Scripture Font**: Lora or Merriweather (serif)
  - Regular: 400
  - Italic: 400 italic
  - Bold: 700
- **Font Sizes**:
  - Hero: 3rem (mobile: 2rem)
  - H1: 2.5rem (mobile: 1.75rem)
  - H2: 2rem (mobile: 1.5rem)
  - H3: 1.5rem (mobile: 1.25rem)
  - Body: 1rem
  - Small: 0.875rem

### Responsive Breakpoints (TailwindCSS defaults)
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

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
- **Navigation**: Clean, minimal, sticky header
- **Crisis Alert**: Prominent, accessible alert banner with hotline numbers (red/orange, high contrast)
