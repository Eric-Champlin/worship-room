---
paths: ["frontend/**"]
---
 
## Tech Stack
 
### Frontend
 
- **Framework**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Routing**: React Router (required)
- **Data Persistence (Phase 2)**: localStorage via `StorageService` abstraction (`services/storage-service.ts`). All keys prefixed `wr_`. Abstraction designed for API swap in Phase 3+. Canonical inventory of all `wr_*` keys lives in `11-local-storage-keys.md`.
- **Ephemeral Context State (BB-26 onward)**: A third state pattern alongside reactive stores and CRUD storage: React Context holding a `useReducer` + `useRef` to an imperative resource (e.g., the Howler audio engine). Used by `AudioPlayerContext` (BB-26) to hold audio player state that must survive route navigation but must NOT persist across page refreshes. State lives in the reducer, the imperative resource in a ref (never state), action functions stabilized via `useMemo`, and consumers use a single `useAudioPlayer()` hook. No localStorage writes for playback state — ephemeral by design. Use this pattern when: (1) state needs App-level lifetime, (2) state must not persist, (3) state coordinates with an imperative side-effect resource (audio engine, WebSocket, etc.). Use reactive stores when state needs cross-surface broadcast with localStorage persistence. Use CRUD storage services for older pre-reactive-store features.
- **Data Fetching (Phase 3)**: direct `fetch` in custom hooks. Phase 3 will introduce API wiring; if a data-fetching library is adopted then, document it here.
- **Forms**: controlled inputs with `useState` + Zod schemas for validation where needed. **Not using** `react-hook-form` (installed but unused).
- **Icons**: Lucide React
- **Utilities**: clsx + tailwind-merge (`cn()` helper)
- **Testing**: Vitest + React Testing Library + jsdom, Playwright for E2E
 
## Coding Standards
 
### Frontend
 
- Use `@/` path aliases for imports
- Export components from `components/index.ts`
- Use `cn()` utility for conditional classNames
- Validate form input with Zod schemas (controlled inputs, not react-hook-form)
- Persist user data via `StorageService` (`services/storage-service.ts`) using `wr_` prefixed keys — and document any new key in `11-local-storage-keys.md`
- Prefer composition over prop drilling
- Extract complex logic into custom hooks
- Use TypeScript interfaces for props
- Avoid inline styles (use TailwindCSS classes). Exception: dynamic positional styles like `env(safe-area-inset-*)` for sticky FABs, where Tailwind cannot express the value.
 
## Design System
 
See **[09-design-system.md](09-design-system.md)** for the comprehensive design reference: color palette (with Tailwind custom names), typography, breakpoints, custom animations, component inventory, hooks, utilities, constants, types, Round 3 visual patterns, Daily Hub Visual Architecture, and the Deprecated Patterns table.
 
**Do not duplicate design system rules in this file.** When you need to know what color, font, spacing, glow opacity, FrostedCard tier, white pill CTA pattern, or textarea glow class string to use, look it up in `09-design-system.md` directly. The patterns there are the canonical source of truth.
 
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
- **Safe area insets**: Sticky/fixed elements anchored to viewport edges (e.g., `DailyAmbientPillFAB`) must use `env(safe-area-inset-*)` for iOS notch and Android nav bar respect. See `09-design-system.md` § "Sticky FAB Pattern".
 
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
- **Color contrast**: All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text). See `09-design-system.md` § "Text Opacity Standards" for the canonical opacity table.
- **Drawer & modal focus traps**: Use the `useFocusTrap()` hook for any modal, dialog, drawer, or flyout (including AudioDrawer). Stores `previouslyFocused` and restores focus on close.
- **Drawer-aware visibility**: Floating elements that overlap drawers (e.g., `DailyAmbientPillFAB`) must auto-hide via `aria-hidden` and `pointer-events: none` when the drawer is open. See `09-design-system.md` § "Drawer-Aware Visibility Pattern".
 
### Component Patterns
 
The Worship Room app uses a dark cinematic theme throughout. All component patterns should match the Round 3 visual system documented in `09-design-system.md`.
 
- **Mood Selector Buttons**: Abstract colored orbs (~56px mobile, ~64px desktop) using the canonical `MOOD_COLORS` palette. Selected orb scales 1.15x with glow; others fade to 30% opacity. `role="radiogroup"` with roving tabindex.
- **Scripture Display**: Lora serif font (canonical scripture font). Centered, large size, gentle fade-in via CSS transition. Devotional passages use the Tier 2 scripture callout (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`) per the FrostedCard Tier System in `09-design-system.md`.
- **Frosted Glass Cards**: Use the `FrostedCard` component (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow). Do NOT roll your own card with soft shadows and 8px radius — that was the pre-Round-3 light-theme pattern and is deprecated. For reading-heavy content, use the Tier 1 / Tier 2 system documented in `09-design-system.md` § "FrostedCard Tier System".
- **Textareas (Pray, Journal)**: Use the canonical white textarea glow class string from `09-design-system.md` § "Textarea Glow Pattern". Do NOT use `animate-glow-pulse` (removed in Wave 6). Do NOT use cyan border or cyan glow (deprecated). Static white box-shadow only.
- **Primary CTA Buttons**: Use the white pill CTA patterns from `09-design-system.md` § "White Pill CTA Patterns". Pattern 1 (inline, smaller) for cross-feature CTAs inside cards. Pattern 2 (homepage primary, larger with white drop shadow) for the main action of a screen.
- **Forms**: Clear labels, inline validation, accessible error messages. The `FormField` component (`components/FormField.tsx`) provides `aria-invalid`, `aria-describedby`, character count, and inline validation in one accessible wrapper — built but not yet adopted by all production forms.
- **Navigation**: Clean glass-morphism navbar. Transparent variant on landing/hero pages, glassmorphic backdrop blur on inner pages. The Navbar checks `isAuthenticated` and renders different button sets — see `10-ux-flows.md` § "Navigation Structure".
- **Crisis Alert**: Prominent, accessible alert banner with hotline numbers (red/orange, high contrast). `CrisisBanner` component with `role="alert"` and `aria-live="assertive"`.
- **Sticky FABs**: Floating action buttons anchored to viewport edges should use the Sticky FAB Pattern from `09-design-system.md` (outer `pointer-events-none` + inner `pointer-events-auto`, `env(safe-area-inset-*)`, drop shadow on inner). Drawer-aware FABs (like `DailyAmbientPillFAB`) must implement the Drawer-Aware Visibility Pattern.
- **AudioDrawer & Modals**: Right-side flyout (desktop) / bottom sheet (mobile) for ambient sound control. Always mounted inside `AudioProvider`, gated by `state.drawerOpen`. Focus trap when open, click-outside dismiss on desktop, swipe-down to dismiss on mobile.
 
### Inline Element Layout — Position Verification Discipline
 
When designing layouts where multiple elements should sit on the same row (chip rows, button groups, label + input pairs), assume that CSS class verification alone is **not sufficient**. Two elements with correct `flex` and `gap` classes can still wrap to different rows if their combined width exceeds the container. A `flex-wrap` row with one too-wide trailing element will silently break to row 2.
 
**Verification requirement:** Specs and plans for inline-row layouts must explicitly document the expected y-coordinate alignment so `/verify-with-playwright` can compare `boundingBox().y` values between elements (matching y within ±5px = same row, differing y = wrapping bug). This catches an entire class of layout bugs that CSS-only verification misses.
 
See `09-design-system.md` § "Inline Element Layout — Position Verification" for the canonical pattern.
 
### Deprecated Patterns
 
The following frontend patterns are deprecated and must not be used in new components. The full list with replacements lives in `09-design-system.md` § "Deprecated Patterns":
 
- `Caveat` font on headings (use `GRADIENT_TEXT_STYLE` instead)
- `BackgroundSquiggle` on Daily Hub (Daily Hub uses HorizonGlow only; squiggles remain on homepage JourneySection)
- `GlowBackground` per Daily Hub section (replaced by HorizonGlow at Daily Hub root)
- `animate-glow-pulse` on textareas (replaced with static white box-shadow)
- Inline expanding dropdown panel for AmbientSoundPill idle state (Wave 7 unified — both states open AudioDrawer)
- `font-serif italic` on Journal prompts (now Inter sans, no italic, white)
- "What's On Your Heart/Mind/Spirit?" headings on Daily Hub tabs (removed in Wave 5)
- Cyan textarea glow border (replaced with white)
- Soft-shadow 8px-radius cards on dark backgrounds (replaced with `FrostedCard`)
- `line-clamp-3` on guided prayer card descriptions (replaced with `min-h-[260px]`)
- `PageTransition` component (removed in Wave 2; route background continuity is handled by `html`/`body`/`#root` background colors in `src/index.css`)
 
When in doubt about whether a pattern is current or deprecated, check `09-design-system.md` first.

### CRUD Verb Conventions

When adding new functions to stores, services, or modules, follow these naming conventions:

**Read operations:**
- `get*` for synchronous reads (e.g., `getHighlight(id)`, `getAllNotes()`)
- `load*` for asynchronous bulk reads or data that requires I/O (e.g., `loadChapter(book, chapter)`, `loadActivity()`)

**Create operations:**
- `add*` for adding items to a collection (e.g., `addBookmark`, `addCard`)
- `create*` for creating new standalone entities (e.g., `createJournalEntry`, `createPlan`)
- `upsert*` for idempotent writes that create or update based on key (e.g., `upsertNote`)

**Delete operations:**
- `remove*` is the preferred verb (e.g., `removeHighlight`, `removeBookmark`)
- `delete*` is acceptable where it's already established (e.g., `deleteJournalEntry`) but new code should prefer `remove*`

**Update operations:**
- `update*` for partial data changes to an existing entity (e.g., `updateHighlightColor`)
- `set*` for full-value replacement of state or metadata (e.g., `setActivePlan`, `setTheme`)

**Existing inconsistencies:** This convention is forward-looking. Existing code that uses non-conforming verbs does not need to be migrated unless it's being modified for other reasons. Rename opportunistically during other work, not as a dedicated sweep.

### Concept Naming Conventions

**Scripture references:**
- `Verse` — a single verse (e.g., "John 3:16")
- `VerseRange` or `Selection` — a multi-verse span (e.g., "John 3:16-18"). Use `Selection` when describing UI state (what the user has selected) and `VerseRange` when describing data (a stored span).
- `Reference` — a display-formatted string (e.g., "John 3:16 (WEB)"). The canonical "pretty" form.
- `Passage` — deprecated; prefer `VerseRange` or `Selection` depending on context.

**User-created persistent content:**
Different features use different nouns for the items users create, and these are intentional:
- `Card` — memorization cards (spaced-repetition vocabulary metaphor)
- `Entry` — journal entries (diary metaphor)
- `Item` — activity feed items (generic feed metaphor)
- `Highlight` — scripture highlights (visual metaphor)
- `Bookmark` — saved verse locations (browser metaphor)
- `Note` — scripture notes (annotation metaphor)

Do not rename these to be consistent — each noun carries domain meaning.

**Data persistence modules:**
- `Store` — reactive stores with `subscribe()` pattern (Bible wave and new modules)
- `Storage` — CRUD service pattern (pre-wave modules, no subscribe)
- `Service` — older generic helpers; prefer `Storage` or `Store` in new code

Existing modules that use `Service` do not need to be renamed.
