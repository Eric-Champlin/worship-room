---
paths: ["frontend/**"]
---

## Design System & Component Architecture

This file is the comprehensive design reference for UI implementation. It covers the color palette, typography, component inventory, custom hooks, utility libraries, canonical visual patterns (Round 3 + Daily Hub Round 3 + Bible wave additions), and feature-specific architecture.

### Color Palette

- **Primary**: `#6D28D9` (deep violet) — Tailwind: `primary`
- **Primary Light**: `#8B5CF6` (lighter violet accent) — Tailwind: `primary-lt`
- **Hero Dark**: `#0D0620` (dark purple for hero gradient) — Tailwind: `hero-dark`
- **Hero Mid**: `#1E0B3E` — Tailwind: `hero-mid`
- **Hero Deep**: `#251248` — Tailwind: `hero-deep`
- **Hero BG**: `#08051A` (darkest background, used by homepage and Daily Hub root) — Tailwind: `hero-bg`
- **Glow Cyan**: `#00D4FF` (legacy cyan token, no longer used on Daily Hub textareas — see "Textarea Glow Pattern" below) — Tailwind: `glow-cyan`
- **Neutral Background**: `#F5F5F5` (warm off-white) — Tailwind: `neutral-bg`
- **White**: `#FFFFFF`
- **Text Dark**: `#2C3E50` (dark gray-blue) — Tailwind: `text-dark`
- **Text Light**: `#7F8C8D` (medium gray) — Tailwind: `text-light`
- **Success**: `#27AE60` (green for positive moods) — Tailwind: `success`
- **Warning**: `#F39C12` (orange for neutral moods) — Tailwind: `warning`
- **Danger**: `#E74C3C` (red for negative moods/flags) — Tailwind: `danger`
- **Borders**: `#2a2040` — Tailwind: `dark-border`, `#9CA3AF` — Tailwind: `muted-gray`, `#6B7280` — Tailwind: `subtle-gray`

### Mood Color Palette

Used for check-in orbs, chart dots, heatmap squares, and data visualization accents:

| Mood       | Value | Color               | Hex       |
| ---------- | ----- | ------------------- | --------- |
| Struggling | 1     | Deep warm amber     | `#D97706` |
| Heavy      | 2     | Muted copper/orange | `#C2703E` |
| Okay       | 3     | Neutral gray-purple | `#8B7FA8` |
| Good       | 4     | Soft teal           | `#2DD4BF` |
| Thriving   | 5     | Vibrant green-gold  | `#34D399` |

### Bible Reader Themes (BibleReader chrome only)

The Bible reader supports three reader-only theme variants that apply to the `ReaderChrome` and reading surface only. These do NOT affect the rest of the app — the navbar, footer, and other pages remain on the canonical dark theme regardless of the reader theme selection. Stored in `wr_bible_reader_theme`.

| Theme       | Background          | Text             | Use case                                     |
| ----------- | ------------------- | ---------------- | -------------------------------------------- |
| `midnight`  | Deep dark (default) | White-on-dark    | Default; matches the rest of the app         |
| `parchment` | Warm cream          | Dark brown       | High contrast for sustained reading          |
| `sepia`     | Aged paper tone     | Muted dark sepia | Reduced eye strain in low-light environments |

The reader also exposes per-user controls for type size (`s`/`m`/`l`/`xl`), line height (`compact`/`normal`/`relaxed`), and font family (`serif`/`sans`). All four preferences persist to localStorage. See `11-local-storage-keys.md` for the exact keys.

### Dashboard Card Pattern

Frosted glass cards for the all-dark dashboard:

- `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Padding: `p-4 md:p-6`
- Collapsible with height transition (`overflow-hidden`)

**Homepage and Daily Hub cards** use the upgraded `FrostedCard` component (see "Round 3 Visual Patterns" section below) which has stronger borders, box-shadow, hover states, and a tier system for content prioritization.

### Text Opacity Standards

**Homepage, Daily Hub, and landing page sections (Round 3 standard):** Default to `text-white` for all readable text. Reserve muted opacities only for lock overlays (`text-white/50`), placeholder text (`placeholder:text-white/50`), and purely decorative elements (`text-white/20` to `text-white/40`). StatsBar ALL CAPS labels use `text-white/90`.

**Daily Hub body text readability standard (post Spec T):** Reading-heavy content (devotional reflection body, devotional question, journal prompts) uses `text-white` with `leading-[1.75]` to `leading-[1.8]`, font sizing `text-[17px] sm:text-lg`, and `max-w-2xl` line length. Italic styling has been removed from prose body text (Lora italic was too taxing for sustained reading).

**Dashboard and other inner pages (WCAG AA standard):** All text on dark backgrounds must meet these minimum opacity values:

| Use Case                         | Minimum | Class                              |
| -------------------------------- | ------- | ---------------------------------- |
| Primary text                     | 70%     | `text-white/70`                    |
| Secondary text                   | 60%     | `text-white/60`                    |
| Placeholder text                 | 50%     | `placeholder:text-white/50`        |
| Large headings (18px+)           | 60%     | `text-white/60`                    |
| Interactive text (buttons/links) | 50%     | `text-white/50`                    |
| Decorative / disabled            | 20-40%  | `text-white/20` to `text-white/40` |

Body text below `text-white/60` fails WCAG AA 4.5:1 on hero-dark (#0D0620).
Placeholder text below `placeholder:text-white/50` fails WCAG AA 3:1 on input backgrounds.

**Exempt from contrast requirements:** decorative icons, locked badge silhouettes, verse number superscripts, middot separators, disabled/locked state indicators, background decorations.

**Note:** The homepage and Daily Hub use `text-white` for all readable text (which exceeds WCAG AA). When redesigning inner pages to match the homepage style, prefer `text-white` everywhere. The WCAG minimum table above is a floor, not a target.

### Typography

- **Body Font**: Inter (sans-serif) — Tailwind: `font-sans`
  - Regular: 400, Medium: 500, Semi-bold: 600, Bold: 700
- **Scripture Font**: Lora (serif) — Tailwind: `font-serif`
  - Regular: 400, Italic: 400 italic, Bold: 700
  - **Use case:** Scripture passage rendering (devotional passage, Bible reader, scripture soaking). NOT used for prose body text or journal prompts.
- **Decorative Font**: Caveat (cursive) — Tailwind: `font-script`
  - Used for branding elements (logo) only.
  - **Deprecated for headings.** Homepage and Daily Hub headings use `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) instead. Caveat has been fully removed from Daily Hub. Other inner pages should be migrated to gradient text in future redesigns.
- **Heading Font**: Inter (same as body for consistency)
  - Semi-bold: 600, Bold: 700
- **Font Sizes**: Hero: 3rem (mobile: 2rem), H1: 2.5rem (1.75rem), H2: 2rem (1.5rem), H3: 1.5rem (1.25rem), Body: 1rem, Small: 0.875rem

### Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

---

## Animation Tokens (BB-33 — canonical)

All animations site-wide use canonical duration and easing tokens from `frontend/src/constants/animation.ts`. Do NOT hardcode `200ms` or `cubic-bezier(...)` strings in new components — import from the tokens module instead. The tokens were introduced in BB-33 and 194 files were migrated to use them during the Bible wave polish cluster.

### Duration tokens

| Token     | Value | Use case                                                               |
| --------- | ----- | ---------------------------------------------------------------------- |
| `instant` | 0ms   | Press feedback, immediate state changes (button active, toggle flip)   |
| `fast`    | 150ms | Hover states, tooltip reveals, dropdown open/close, micro-interactions |
| `base`    | 250ms | Modal open/close, drawer slide, tab transitions, panel expand/collapse |
| `slow`    | 400ms | Page transitions, celebration sequences, decorative fade-ins           |

**Source of truth:** `frontend/src/constants/animation.ts` (`ANIMATION_DURATIONS`) and `frontend/tailwind.config.js` `transitionDuration` map. If this table and either of those code locations disagree, the code wins — update the table and grep the rest of the docs (`_protocol/99-project-specific-overrides.md`, in-flight specs/plans) for the same drift.

### Easing tokens

| Token        | Value                          | Use case                                                 |
| ------------ | ------------------------------ | -------------------------------------------------------- |
| `standard`   | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for most transitions (Material standard easing)  |
| `decelerate` | `cubic-bezier(0, 0, 0.2, 1)`   | Elements entering the screen (drawers sliding in)        |
| `accelerate` | `cubic-bezier(0.4, 0, 1, 1)`   | Elements leaving the screen (drawers sliding out)        |
| `sharp`      | `cubic-bezier(0.4, 0, 0.6, 1)` | Toggles, switches, attention-grabbing micro-interactions |

### Spring easings — REMOVED

Spring easings (`cubic-bezier(0.34, 1.56, 0.64, 1)` and similar) were removed from modals, toasts, and drawers in BB-33. They felt too playful for emotionally vulnerable moments. Use `standard`, `decelerate`, or `accelerate` instead. Spring easings are still acceptable on celebration overlays and confetti animations where the bounce serves the emotional moment.

### Button press feedback

Approximately 30 CTAs across the app use `active:scale-[0.98]` for press feedback. This is the canonical micro-interaction for tappable buttons. Apply to any new primary CTA.

### Custom Tailwind animations (still in use)

These are layered on top of the token system for specific named animations:

- `animate-cursor-blink` (1s) — typewriter input cursor
- `animate-dropdown-in` (150ms, uses `decelerate`) — navbar dropdown fade + slide up
- `animate-slide-from-right`, `animate-slide-from-left` (300ms, uses `decelerate`) — tab transitions
- `animate-golden-glow` (2s) — golden box-shadow for completion celebration
- `animate-breathe-expand`, `animate-breathe-contract` (4s, 8s) — meditation breathing
- `animate-fade-in` (500ms, uses `decelerate`) — general fade + slide up
- `animate-confetti-fall` — CSS-only confetti for celebration overlays
- `animate-drawer-slide-in` — AudioDrawer right-side flyout slide-in (uses `decelerate`)
- `animate-bottom-sheet-slide-in` — AudioDrawer mobile bottom-sheet slide-up (uses `decelerate`)

### Removed animations

- ~~`animate-glow-pulse`~~ — **REMOVED in Wave 6.** Previously animated cyan/violet glow on textareas. Replaced with static white box-shadow per Daily Hub Round 3 (see "Textarea Glow Pattern" below). The keyframe and animation registration have been removed from `tailwind.config.js`.

---

## Reduced-Motion Safety Net (BB-33)

A global `prefers-reduced-motion: reduce` rule lives in `frontend/src/styles/animations.css` and disables all animations site-wide when the user has reduced motion enabled. This is the canonical reduced-motion handling — individual components do NOT need to check `prefers-reduced-motion` themselves.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Documented exemptions

Three classes of animation are exempt from the reduced-motion rule because the animation IS the feature:

1. **Shimmer animations (300ms)** — Skeleton loading shimmer is decorative-without-urgency. The shimmer is gentle and conveys loading state more clearly than a static gray box. Exempted via specific selector overrides.
2. **Breathing exercise (`/meditate/breathing`)** — The breath-along animation is the entire feature. Removing it would break the meditation. Exempted via component-level inline animation that does not use the global rule.
3. **Garden ambient SVG animations** — The growth garden's gentle sun/cloud movement is part of the visual metaphor. Removing it would make the garden feel dead. Exempted via SVG-level animation attributes.

When adding new animations, default to using the global rule (do nothing — the animation will be auto-disabled). Only exempt an animation if removing it would meaningfully break the feature, and document the exemption in this file.

---

## Textarea Glow Pattern (Daily Hub Round 4 / DailyHub 1B)

The Pray and Journal textareas use a **static violet box-shadow** that matches the FrostedCard default-tier surface, replacing the prior white-glow pattern. The previous `animate-glow-pulse` (Wave 6) and the white-glow shadow (Round 3) are both deprecated. The current pattern reads as a frosted writing surface consistent with the cards around it on the multi-bloom canvas (DailyHub 1A).

**Canonical class string for textarea glow:**

```
shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)]
border border-violet-400/30 bg-white/[0.04]
focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30
placeholder:text-white/40
```

**Apply to:** PrayerInput textarea, JournalInput textarea. Other textareas (Bible search, AskPage, Reading Plan create flow) may continue using their existing glow treatment or be migrated to this pattern as part of a future spec.

---

## Shared Components

### Layout Components

- **Layout.tsx** — Wrapper: `<Navbar>` + content + `<SiteFooter>`. **Default flipped to `transparentNav: true` in Visual Rollout Spec 12** — the transparent overlay navbar is the canonical production state on every page. Opaque mode is retained as `transparentNav={false}` defensive fallback only.
- **Navbar.tsx** — Glassmorphic navigation. Desktop: 5 top-level items + Local Support dropdown + avatar dropdown. Mobile: hamburger drawer (`MobileDrawer`). `transparent` prop controls absolute vs relative positioning. Logged-in state: replaces Log In/Get Started with notification bell + avatar dropdown (see `10-ux-flows.md` for nav structure). The navbar mounts the canonical skip-to-main-content link.
- **SiteFooter.tsx** — Dark purple footer. Nav columns (Daily, Music, Support), crisis resources, app download badges (Coming Soon), "Listen on Spotify" badge, BB-35 accessibility statement link, copyright.
- ~~**PageTransition.tsx**~~ — **REMOVED.** Previously did 150ms opacity fade-out + 200ms fade-in on route changes. Removed in Wave 2 because it caused a route flicker/white flash. The `html`, `body`, and `#root` backgrounds remain set to `#08051A` in `src/index.css` to prevent any white flash during navigation.

### Layout Exception: BibleReader

**The BibleReader is a documented layout exception.** It does NOT use `Layout.tsx`, `Navbar.tsx`, or `SiteFooter.tsx`. Instead it uses a dedicated `ReaderChrome` component that provides:

- A reader-specific top bar with theme/typography/font controls, the chapter selector, the back button, and the AI Explain/Reflect entry points
- A reader-specific bottom toolbar with audio controls, the bookmarks/notes/highlights drawer trigger, and the verse number toggle
- A focus mode that dims the chrome after a configurable idle delay (`wr_bible_focus_delay`, default 6 seconds)
- An immersive reading surface with no navbar and no footer

The BibleReader has its own root-level skip-to-main-content link because the canonical Navbar skip link is not present. When auditing pages, treat the BibleReader's structure as documented intentional drift. Do NOT flag it as "missing footer" or "missing navbar" — those are intentional design decisions for the immersive reading experience.

The reader's settings drawer also includes BB-41's notification permission entry point (the contextual prompt that fires after a reading session) and BB-39's PWA install affordance when the user is on a supporting browser.

### Design System Components

- **PageHero.tsx** — Purple gradient header with title, subtitle, optional `HeadingDivider`. Used by Prayer Wall, Local Support pages. **Exports `ATMOSPHERIC_HERO_BG` constant** (Visual Rollout Specs 8C / 6A consolidated this) for pages that use the atmospheric hero background without the full PageHero component — Settings and Insights consume the constant directly as part of their documented intentional drift from `BackgroundCanvas`.
- **HeadingDivider.tsx** — White decorative SVG divider with fade gradients. Responsive via `useElementWidth()`.
- **BackgroundSquiggle.tsx** — Decorative SVG squiggle (viewBox 1800×1350, 6 paths). Exported `SQUIGGLE_MASK_STYLE` for consistent fade mask. **Currently used only by the homepage `JourneySection`** as a narrow inline SVG (~150px column, centered, `preserveAspectRatio="none"`). **NOT used on Daily Hub** — squiggles were removed from all Daily Hub tabs in Wave 5 because they competed with the atmospheric layer (now `BackgroundCanvas` post-Visual-Rollout).
- **BackgroundCanvas.tsx** (Visual Rollout Spec 1A — `components/ui/BackgroundCanvas.tsx`) — Canonical inner-page atmospheric layer. Renders the 5-stop multi-bloom CANVAS_BACKGROUND gradient on a `min-h-screen overflow-hidden` root with `data-testid="background-canvas"`. Used by every inner page except Settings, Insights, and Music (documented intentional drift). See "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)" below for the full pages-using list and the canonical gradient string.
- **SongPickSection.tsx** — Centered single-column layout: "Today's" (GRADIENT_TEXT_STYLE) + "Song Pick" (white) heading stacked vertically with equal-width treatment via tracking adjustment, Spotify 352px iframe centered below, `max-w-2xl` container. No glass card wrapper, no music icon, no HeadingDivider. No GlowBackground (transparent — sits over the Daily Hub `BackgroundCanvas` atmospheric layer post-Visual-Rollout Spec 1A).
- **HeroSection.tsx** — Landing page hero: dark purple gradient, typewriter input, quiz teaser link. UNTOUCHED by homepage redesign.
- **JourneySection.tsx** — 7-step vertical timeline with numbered circles, gradient keyword text, inline narrow squiggle SVG, glow orbs. Steps link to feature routes.
- **StartingPointQuiz.tsx** — 5-question quiz inside a frosted glass container (`rounded-3xl`), gradient progress bar. `id="quiz"` for scroll target. Only appears on the landing page (removed from Daily Hub in Round 3 redesign).
- **TypewriterInput.tsx** — Hero input with typewriter placeholder animation.
- **SpotifyBadge.tsx** — "Listen on Spotify" badge link.
- **Breadcrumb.tsx** — Breadcrumb navigation for detail pages.
- **FeatureEmptyState.tsx** — Reusable warm empty state with icon, heading, description. Used in 10+ locations. Standardized as the canonical empty state primitive in BB-34. Any new empty state should use this component.
- **FirstRunWelcome.tsx** (BB-34) — Single-screen welcome card for brand-new visitors. Shows 3-4 "start here" options as tappable cards (Bible reader, Daily Hub, Prayer Wall, Music). Dismissible via X button or any card click. **Triggered only on home/Dashboard for visitors with no `wr_first_run_completed` value set. NEVER appears on deep-linked routes** — a user landing on `/bible/john/3?verse=16` from a shared link bypasses the welcome entirely. The welcome is never a gate; it's an informational layer.
- **FormField.tsx** — Accessible form field with `aria-invalid`, `aria-describedby`, character count, inline validation (built but not yet adopted by production forms).

### Homepage Components (`components/homepage/`)

> These patterns apply to the homepage. **Inner pages (Daily Hub, Bible Landing, MyBible, Local Support, Grow, Ask, RegisterPage, etc.) use a different background architecture (`BackgroundCanvas` at the page root, post-Visual-Rollout Spec 1A — replacing the prior HorizonGlow on Daily Hub).** See "BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)" section below for the inner-page architecture.

Shared building blocks for the landing page, created during the Round 3 homepage redesign (HP-1 through HP-15):

- **SectionHeading.tsx** — 2-line heading: smaller white `topLine` + larger purple gradient `bottomLine`. Backward-compatible single `heading` prop. See "Round 3 Visual Patterns" for sizing.
- **GlowBackground.tsx** — Atmospheric glow wrapper with variants: `center`, `left`, `right`, `split`, `fullPage`, `none`. Glow orb opacity at 0.25-0.50 range. Includes `glowOpacityMultiplier` prop (added in Spec T) for per-instance opacity scaling. The `fullPage` variant distributes 5 orbs across 5%/30%/55%/75%/92% of the scroll length for seam-free long-scroll pages. **Currently used by:** homepage sections only. **NOT used by inner pages** (replaced by `BackgroundCanvas` post-Visual-Rollout Spec 1A — `/register` was migrated as part of the rollout).
- **FrostedCard.tsx** — Glass card: `bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-3xl` with dual box-shadow (post-Visual-Rollout values — earlier `bg-white/[0.06]` + `rounded-2xl` are drift). Variant API: `accent | default | subdued`. Eyebrow API: `eyebrow` + `eyebrowColor`. Optional `onClick` adds hover elevation, but for navigable cards prefer the `<Link> + FrostedCard` group-hover pattern (cross-surface card pattern, Spec 3) where Link handles navigation. See "FrostedCard Tier System" below for content tier guidance.
- **StatsBar.tsx** — 6 animated counters (scroll-triggered via `useAnimatedCounter`). 50 Devotionals, 10 Reading Plans, 24 Ambient Sounds, 6 Meditation Types, 5 Seasonal Challenges, 8 Worship Playlists.
- **DashboardPreview.tsx** — "See How You're Growing" section with 6 locked preview cards + "Create a Free Account" CTA.
- **DashboardPreviewCard.tsx** — Locked preview card: blurred mockup on top, clear icon + title + description below. Each icon has a unique accent color.
- **DifferentiatorSection.tsx** — "Built for Your Heart" section with 6 competitive advantage cards.
- **FinalCTA.tsx** — Bottom CTA: "Your Healing Starts Here", "Get Started — It's Free" button → auth modal. Uses `GlowBackground` with `variant="none"` — no glow orb (removed in 585f186 to let the white button shadow carry the emotional peak).
- **dashboard-preview-data.ts** — Card metadata (icons, titles, descriptions, preview keys).
- **differentiator-data.ts** — 6 differentiator cards (titles, descriptions, icons).
- **index.ts** — Barrel export for all homepage components.

### Daily Experience Components (`components/daily/`)

- **PrayTabContent.tsx** — Pray tab content. Plain `<div>` wrapper with `mx-auto max-w-2xl px-4 py-10 sm:py-14` (no GlowBackground, no BackgroundSquiggle — these were removed in Spec Y). Renders `PrayerInput`, crisis banner, mock prayer generation, `KaraokeText`, action buttons, `GuidedPrayerSection`, cross-tab CTAs.
- **JournalTabContent.tsx** — Journal tab content. Plain `<div>` wrapper with same padding pattern. Renders `JournalInput` (Guided/Free Write toggle, prompt card, draft auto-save, crisis banner, saved entries, AI reflection). No GlowBackground, no BackgroundSquiggle.
- **MeditateTabContent.tsx** — Meditate tab content. Plain `<div>` wrapper. Renders 6 auth-gated FrostedCard meditation cards, completion checkmarks, all-6-complete celebration banner, and the Spec Z verse banner when arriving from devotional with verse params. No heading. No GlowBackground, no BackgroundSquiggle.
- **DevotionalTabContent.tsx** — Devotional tab content. Plain `<div>` wrapper. No heading. Renders date navigation, devotional title, passage (Tier 2 scripture callout), reflection body (Tier 1 FrostedCard), saint quote (Tier 1 FrostedCard, positioned BELOW reflection body per Wave 5), reflection question card with embedded "Journal about this question" CTA (Spec O), authentic Pray flow CTA (Spec P). No GlowBackground (transparent — sits over the Daily Hub `BackgroundCanvas` atmospheric layer post-Visual-Rollout Spec 1A). Theme tags removed (Wave 5).
- **PrayerInput.tsx** — Pray tab textarea with 3 starter chips (`<Button variant="subtle" size="sm">`), `rows={8} min-h-[200px] max-h-[500px] resize-y`, **violet textarea glow** (DailyHub 1B), draft auto-save (1s debounce, `wr_prayer_draft` key), draft saved indicator, "Help Me Pray" `<Button variant="gradient" size="lg">` showstopper.
- **JournalInput.tsx** — Journal tab input with mode toggle (Guided/Free Write — DailyHub 1A-style violet active pill), prompt card (Inter sans, NOT italic, white text, leading-relaxed — stays rolls-own scripture-callout idiom), draft auto-save (`wr_journal_draft` key), **violet textarea glow** (DailyHub 1B), voice mic (`<Button variant="subtle" size="sm">`), "Save Entry" `<Button variant="gradient" size="lg">` showstopper. Mounts `DevotionalPreviewPanel` at the top when arriving from devotional context.
- **DevotionalPreviewPanel.tsx** (Spec X) — Sticky collapsible inline preview panel. Pinned at `top-2 z-30` so it follows the user as they scroll. Collapsed state: small pill showing "TODAY'S DEVOTIONAL" label + title + reference + chevron. Expanded state: smooth max-height animation (300ms `decelerate`) revealing the passage, reflection question (callout), reflection body, and quote with internal scroll capped at `max-h-[50vh]`. Includes an `X` close button next to the chevron (Wave 6) for dismissing the panel. Mounted in JournalInput AND PrayerInput when `prayContext?.from === 'devotional' && devotionalSnapshot && !contextDismissed`.
- **DailyAmbientPillFAB.tsx** (Wave 7) — Sticky bottom-right floating action button wrapping `AmbientSoundPill`. Mounted on the DailyHub root only (not on meditation activity sub-pages, which have their own transport controls). Auto-hides when `state.drawerOpen === true` (chat-widget pattern). Uses `pointer-events-none` outer + `pointer-events-auto` inner so empty space around the pill remains clickable. Includes `env(safe-area-inset-*)` for iOS notch / Android nav bar respect.
- **HorizonGlow.tsx** (Spec Y) — **(Orphaned legacy as of Visual Rollout Spec 1A — pending cleanup, do not import from new code.)** Daily Hub-only atmospheric glow layer. Renders 5 large soft purple/lavender glow blobs at strategic vertical percentages (5%, 15%, 35%, 60%, 85%) of the page body. Each glow is `position: absolute` with percentage `top`/`left`, large `width`/`height` (300-900px), heavy `filter: blur(100-120px)`, and centered via `transform: translate(-50%, -50%)`. **Final tuned opacity values (low intensity for readability):** Glow 1: 0.32, Glow 2: 0.28, Glow 3: 0.35, Glow 4: 0.30, Glow 5: 0.28. Was mounted on the DailyHub root pre-Spec-1A; superseded by `BackgroundCanvas`. Filed for cleanup in `_plans/reconciliation/discoveries.md` D2.
- **AmbientSoundPill.tsx** — Pill-shaped button showing current ambient sound state. **Both idle and active states open the AudioDrawer right-side flyout** (Wave 7 unified the behavior — previously idle state used an inline expanding dropdown). When clicked, dispatches `OPEN_DRAWER` / `CLOSE_DRAWER` to AudioProvider. Used inside `DailyAmbientPillFAB` on the Daily Hub.
- **GuidedPrayerSection.tsx** — Pray tab section displaying 8 guided prayer sessions (5/10/15 min). Cards use `min-h-[260px]` (Wave 6) with no `line-clamp` on descriptions so full session descriptions render. 4-column × 2-row grid on desktop, 2-column on tablet, horizontal carousel with snap on mobile.
- **GuidedPrayerPlayer.tsx** — Audio-guided prayer playback UI with TTS narration and silence intervals.
- **MiniHubCards.tsx** — Small cards linking to Pray/Journal/Meditate with completion badges.
- **ReadAloudButton.tsx** — TTS playback via browser Speech Synthesis API.
- **KaraokeText.tsx** — Word-by-word highlighting during Read Aloud and prayer generation.
- **ShareButton.tsx** — Web Share API with fallback dropdown.
- **CompletionScreen.tsx** — Meditation completion celebration with CTAs and MiniHubCards.
- **CrisisBanner.tsx** — Crisis keyword detection + resource alert banner with `role="alert"`.
- **PrayerResponse.tsx** — Generated prayer display with KaraokeText, ambient auto-play, copy/share/save actions.

### Audio Components (`components/audio/`)

- **AudioDrawer.tsx** — Right-side flyout sidebar (desktop, `lg:right-0 lg:w-[400px] lg:h-full`) / bottom sheet (mobile, `70vh`, swipe-down to dismiss). Dark frosted glass background `rgba(15, 10, 30, 0.95)` with `backdrop-blur(16px)`. Focus trap when open, click-outside dismiss on desktop, Escape key handling via focus trap. Contains `DrawerNowPlaying`, `RoutineStepper`, `DrawerTabs` (ambient browser, sleep browse, etc.). **Always mounted** inside `AudioProvider`, gated by `state.drawerOpen` internally. Opened by both AmbientSoundPill states (Wave 7 unified).
- **AudioPill.tsx** — Now-playing pill (different from AmbientSoundPill) shown when audio is active.
- Other components: `DrawerNowPlaying`, `DrawerTabs`, `AmbientBrowser`, `SleepBrowse`, `RoutineStepper`.

### Bible Reader Components (`components/bible/`)

The BibleReader was rebuilt during the Bible wave (BB-0 through BB-29) and extended throughout the polish cluster (BB-30 through BB-46). The component inventory below reflects the post-wave state.

- **BibleReader.tsx** — The main reader component. Hosts `ReaderChrome`, the verse rendering surface, the focus mode timer, the highlights/notes/bookmarks drawer, the AI Explain/Reflect panels, and the BB-41 contextual notification permission prompt. Reads from `wr_bible_reader_*` preference keys for theme/typography. Subscribes to the chapter visit store on mount (BB-43) so the heatmap reflects today's reading.
- **ReaderChrome.tsx** — Top and bottom toolbars for the reader. Replaces `Navbar` and `SiteFooter` for the BibleReader page. Top bar: theme switcher, type size, line height, font family, focus mode toggle, back button, chapter selector, AI Explain button, AI Reflect button. Bottom bar: audio controls, drawer trigger, verse number toggle. Toolbars dim after `wr_bible_focus_delay` ms of inactivity when focus mode is enabled.
- **BibleBrowser.tsx** — The 66-book browser at `/bible`. Hosts the OT/NT testament tabs (`wr_bible_books_tab`), the book grid, the recent chapters list, the BB-42 search mode, and the Resume Reading card.
- **BibleSearchMode.tsx** — Full-text search UI (BB-42). Wired into BibleBrowser via the `?mode=search` query param. Loads the pre-built inverted index on demand, renders results with verse text, supports keyboard navigation, links each result to the verse via BB-38 deep link contract.
- **MyBible.tsx** (`/bible/my`) — Personal layer page. From top to bottom: the BB-43 reading heatmap, the BB-43 Bible progress map, the BB-45 memorization deck, the unified activity feed (highlights, notes, bookmarks, journal entries). Reads from highlight, bookmark, note, journal, chapter visit, and memorization stores. Subscribes to each via inline `subscribe()` or standalone hook — **does NOT use local `useState` snapshots without subscription** (BB-45 anti-pattern).
- **ReadingHeatmap.tsx** (BB-43) — GitHub-contribution-style heatmap showing daily reading activity for the past 365 days. Each cell is a day; color intensity represents number of chapters read. Hover/tap shows the date and references. Subscribes to `chapterVisitStore` via inline `subscribe()`. Anti-pressure tone — sparse activity is treated as valid.
- **BibleProgressMap.tsx** (BB-43) — Visual map of all 66 books showing read/partially read/unread chapters. Tap a chapter cell to navigate to that chapter via BB-38 deep link.
- **MemorizationDeck.tsx** (BB-45) — Flip-card memorization grid on My Bible. Cards have a front (reference) and back (verse text). Tap to flip. No quiz, no scoring, no spaced repetition. Reads from `useMemorizationStore()`. Add cards via the BibleReader verse menu.
- **EchoCard.tsx** (BB-46) — Single-card display of a verse the user has engaged with in the past. Shows context ("30 days ago you highlighted this") + verse reference + verse text. Tappable, navigates to the verse via BB-38 deep link. Mounted on the home page and Daily Hub. Selection driven by the echo engine at `frontend/src/lib/echoes/`.
- **ExplainPanel.tsx** (BB-30) — AI-generated passage explanation. Triggered from the BibleReader top bar. Calls Gemini 2.5 Flash Lite via the BB-32 cache layer. Anti-pressure voice — explanations are short and explicitly not authoritative.
- **ReflectPanel.tsx** (BB-31) — AI-generated personal reflection prompts for any verse range. Same model and cache as ExplainPanel. Reflections are first-person prompts, not interpretations.
- **NotificationPermissionPrompt.tsx** (BB-41) — Contextual non-modal card that appears at the bottom of the BibleReader after the user completes a reading session. Asks "Want a daily verse to keep this rhythm going?" with Enable / Maybe later buttons. Fires at most once per user (tracked via `wr_notification_prompt_dismissed`). Only fires on the second reading session of the day, not the first.
- **Reactive stores (Bible wave + Phase 0.5):**
  - **Pattern A (subscription via standalone hook, `useSyncExternalStore`):** `useMemorizationStore` (`hooks/bible/useMemorizationStore.ts` over `lib/memorize/store.ts`), `useStreakStore` (`hooks/bible/useStreakStore.ts` over `lib/bible/streakStore.ts`), `usePrayerReactions` (`hooks/usePrayerReactions.ts` over `lib/prayer-wall/reactionsStore.ts`), `useBibleProgress` (`hooks/useBibleProgress.ts` — Visual Rollout Spec 8B converted this from a CRUD-style hook to a reactive store; module and hook live in the same file with cross-tab `storage` event sync).
  - **Pattern B (inline subscription via `subscribe()` in a `useEffect`):** `highlightStore` (`lib/bible/highlightStore.ts`), `bookmarkStore` (`lib/bible/bookmarkStore.ts`), `noteStore` (`lib/bible/notes/store.ts`), `journalStore` (`lib/bible/journalStore.ts`), `chapterVisitStore` (`lib/heatmap/chapterVisitStore.ts`), `plansStore` (`lib/bible/plansStore.ts`). No standalone hook — consumers wire `useState` + `useEffect` + `subscribe()` themselves.
  - Echo dismissal persistence was deferred — `useEcho` (session-scoped) is the only echo-related hook; `useEchoStore` does NOT exist. See `11b-local-storage-keys-bible.md` § "Note on BB-46 echoes".
  - Components consuming any of these **MUST subscribe** (Pattern A automatic via the hook; Pattern B requires the explicit `subscribe()` call). See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the BB-45 anti-pattern.

### Prayer Wall Components (`components/prayer-wall/`)

- **PrayerWallHero.tsx**, **PrayerCard.tsx**, **InlineComposer.tsx**, **CommentInput.tsx**, **CommentItem.tsx**, **CommentsSection.tsx**, **InteractionBar.tsx**, **Avatar.tsx**, **AnsweredBadge.tsx**, **ShareDropdown.tsx**, **ReportDialog.tsx**, **DeletePrayerDialog.tsx**, **MarkAsAnsweredForm.tsx**, **PageShell.tsx**, **QotdComposer.tsx**
- **AuthModal.tsx** / **AuthModalProvider.tsx** — Auth prompt modal with `useAuthModal()` context. UI shell only (Phase 3 for real auth). Subtitle "Your draft is safe — we'll bring it back after" appears when context indicates a pending draft (Spec V).

### Local Support Components (`components/local-support/`)

- **LocalSupportPage.tsx**, **LocalSupportHero.tsx**, **SearchControls.tsx**, **ResultsList.tsx**, **ResultsMap.tsx**, **ListingCard.tsx**, **ListingShareDropdown.tsx**, **SearchStates.tsx**, **VisitButton.tsx**

### UI Components (`components/ui/`)

- **Toast.tsx** — Toast notification system with `ToastProvider` context and `useToast()` hook. Supports celebration types (confetti, shimmer).
- **Card.tsx** — Basic card wrapper.
- **Button.tsx** — Reusable button component.
- **UnsavedChangesModal.tsx** — Confirmation dialog for unsaved changes.
- **CharacterCount.tsx** — Character count with `aria-live="polite"` zone-change announcements.

### Dashboard & Growth Components (`components/dashboard/`)

- **MoodCheckIn.tsx** — Full-screen daily check-in with mood orbs (`role="radiogroup"` with roving tabindex), text input, verse transition, crisis detection
- **MoodRecommendations.tsx** — Mood-aware content recommendations with staggered fade-in
- **DashboardCard.tsx** — Reusable frosted glass card with collapsible behavior
- **DashboardHero.tsx** — Dark gradient hero with time-of-day greeting, streak, level, liturgical season
- **DashboardWidgetGrid.tsx** — Priority-ordered widget grid with customization panel. Desktop: 2-column (60%/40%). Mobile: single column
- **MoodChart.tsx** — 7-day Recharts line chart with mood-colored dots
- **ActivityChecklist.tsx** — Activity checklist with SVG progress ring and multiplier tiers
- **StreakCard.tsx** — Streak counter + faith points + level + recent badges + streak repair
- **FriendsPreview.tsx** — Top 3 friends + milestone feed + "See all" link
- **QuickActions.tsx** — Navigation buttons to Pray/Journal/Meditate/Music
- **BadgeGrid.tsx** — Earned (color) vs locked (silhouette) badge display
- **GrowthGarden.tsx** — 765-line animated SVG with 6 growth stages, ambient animations, streak-responsive sun/clouds
- **GettingStartedCard.tsx** — 6-item onboarding checklist with auto-completion
- **WelcomeWizard.tsx** — 4-screen onboarding wizard (greeting/name, avatar, quiz, results)
- **EveningReflection.tsx** — 4-step evening flow (mood, highlights, gratitude, closing prayer)
- **GratitudeWidget.tsx** — 3 daily gratitude inputs with rotating placeholders
- **VotdWidget.tsx** — Verse of the Day dashboard widget
- **ReadingPlanWidget.tsx** — Active reading plan progress
- **PrayerListWidget.tsx** — Personal prayer list summary
- **NotificationBell.tsx** — Navbar bell icon with unread badge count
- **NotificationPanel.tsx** — Dropdown panel with notification list
- **CelebrationOverlay.tsx** — Full-screen level-up/milestone celebration with confetti
- **CelebrationQueue.tsx** — Queues and sequences multiple celebration events
- **PrayerAnsweredCelebration.tsx** — Answered prayer celebration overlay

### Sharing Components (`components/sharing/`)

- **SharePanel.tsx** — Verse/prayer share UI with canvas-generated images
- **verse-card-canvas.ts** — Canvas API rendering for shareable verse images (4 templates × 3 sizes: square/story/wide)
- **challenge-share-canvas.ts** — Canvas API rendering for challenge progress/completion images

### Skeleton Components (`components/skeletons/`)

13 page-level skeleton components for content-shaped loading states: `DashboardSkeleton`, `DailyHubSkeleton`, `PrayerWallSkeleton`, `FriendsSkeleton`, `SettingsSkeleton`, `InsightsSkeleton`, `MyPrayersSkeleton`, `MusicSkeleton`, `GrowPageSkeleton`, `BibleBrowserSkeleton`, `BibleReaderSkeleton`, `ProfileSkeleton`. 11 are wired to route-level `<Suspense>` boundaries in `App.tsx`. BibleReaderSkeleton is wired inline. MonthlyReport falls back to the generic `RouteLoadingFallback`.

### First-Run & Empty State Components

- **FirstRunWelcome.tsx** (BB-34) — See "Design System Components" above. Critical: never appears on deep-linked routes.
- **FeatureEmptyState.tsx** — See "Design System Components" above. Standardized in BB-34 as the canonical empty state primitive. Use this component for any new empty state. Variants accept icon, heading, description, and optional CTA.

---

## Custom Hooks (`hooks/`)

### Core Hooks

- **useAuth()** — Returns `{ isAuthenticated, user, login(), logout() }` from `AuthProvider` context. Simulated auth via localStorage (`wr_auth_simulated`, `wr_user_name`). Real JWT auth in Phase 3.
- **useCompletionTracking()** — Daily practice completion per session. localStorage with date-based reset.
- **useReadAloud()** — Browser Speech Synthesis TTS. Play/pause/resume/stop, word index tracking.
- **useInView()** — Intersection Observer for lazy animations. Respects `prefers-reduced-motion`. Used by non-homepage components.
- **useScrollReveal()** — Enhanced scroll reveal hook for homepage. `triggerOnce: true` by default. Exports `staggerDelay()` utility for cascading animations. Homepage sections use this instead of `useInView`.
- **useAnimatedCounter()** — RAF-based number counter for StatsBar. Ease-out curve, configurable duration/delay. Respects `prefers-reduced-motion`.
- **useFocusTrap()** — Keyboard focus trapping for modals. Used in 37 modal/dialog components. Stores `previouslyFocused` and restores focus on cleanup. Canonical accessibility primitive for any modal/dialog/drawer.
- **useOpenSet()** — Manages a Set of open item IDs for expand/collapse patterns.
- **usePrayerReactions()** — Prayer Wall reaction state.
- **useElementWidth()** — ResizeObserver for responsive width measurement.
- **useSoundEffects()** — Web Audio API sound effect playback. 6 sounds (chime, ascending, harp, bell, whisper, sparkle). Gated behind `wr_sound_effects_enabled` and `prefers-reduced-motion`.
- **useLiturgicalSeason()** — Returns current liturgical season via Computus algorithm. Used for seasonal content priority.

### Bible Reactive Store Hooks & Subscription (BB-7 through BB-45)

Bible-wave stores use two subscription patterns. **Components consuming these stores MUST subscribe** — never call `getAllX()` and store the result in local `useState` without a `subscribe()` call. See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the full pattern documentation and the BB-45 anti-pattern.

**Standalone hooks (Pattern A — `useSyncExternalStore`):**

- **useMemorizationStore()** (BB-45) — Returns the current array of memorization cards. Hook at `hooks/bible/useMemorizationStore.ts`.
- **useBibleProgress()** (Visual Rollout Spec 8B) — Returns `{ progress, markChapterRead, getBookProgress, isChapterRead, justCompletedBook, clearJustCompletedBook, getCompletedBookCount }`. Hook + reactive store live in the same file at `hooks/useBibleProgress.ts`. Cross-tab `storage` event listener invalidates the cache and notifies subscribers when another tab writes to `wr_bible_progress`. `markChapterRead` is no longer auth-gated post-Spec-8B.
- **useStreakStore()** (BB-17) — Returns `{ streak, atRisk }`. Hook at `hooks/bible/useStreakStore.ts`.

**Inline subscription stores (Pattern B — `subscribe()` + `useState` + `useEffect`):**

- **highlightStore** (BB-7) — `lib/bible/highlightStore.ts`. API: `getHighlightsForChapter()`, `applyHighlight()`, `subscribe()`.
- **bookmarkStore** (BB-7) — `lib/bible/bookmarkStore.ts`. API: `getBookmarksForChapter()`, `toggleBookmark()`, `subscribe()`.
- **noteStore** (BB-8) — `lib/bible/notes/store.ts`. API: `getNotesForChapter()`, `upsertNote()`, `subscribe()`.
- **journalStore** (BB-11b) — `lib/bible/journalStore.ts`. API: `getAllJournalEntries()`, `createJournalEntry()`, `subscribe()`.
- **chapterVisitStore** (BB-43) — `lib/heatmap/chapterVisitStore.ts`. API: `getAllVisits()`, `recordChapterVisit()`, `subscribe()`.
- **plansStore** (BB-21) — `lib/bible/plansStore.ts`. API: `getPlansState()`, `markDayComplete()`, `subscribe()`.

### Dashboard & Growth Hooks

- **useFaithPoints()** — Core gamification hook. Returns `{ totalPoints, currentLevel, levelName, pointsToNextLevel, todayActivities, todayPoints, todayMultiplier, currentStreak, longestStreak, recordActivity(type) }`. Manages `wr_daily_activities`, `wr_faith_points`, `wr_streak` in localStorage.
- **useMoodChartData(days)** — Returns mood entries for the last N days from `wr_mood_entries`. Used by dashboard widget (7 days) and `/insights` page (30/90/180/365 days).
- **useToast()** — Toast system with celebration types (confetti, shimmer). Returns `{ show(message, options), dismiss(id) }`.
- **useGettingStarted()** — Getting started checklist state and progress tracking.
- **useStreakRepair()** — Grace-based streak repair (1 free/week, 50 pts for additional).

---

## Utility Libraries (`lib/`)

- **utils.ts** — `cn()` classname utility (clsx + tailwind-merge).
- **time.ts** — `timeAgo()` relative time, `formatFullDate()` date formatting.
- **geo.ts** — `calculateDistanceMiles()` Haversine formula.
- **audio.ts** — `playChime()` Web Audio API 528 Hz sine wave.
- **sound-effects.ts** — 6 Web Audio API synthesized sounds (chime, ascending, harp, bell, whisper, sparkle).
- **verse-card-canvas.ts** — Canvas rendering for shareable verse images (4 templates, 3 sizes).
- **challenge-share-canvas.ts** — Canvas rendering for shareable challenge images.

### Bible Wave Libraries (`lib/`)

- **lib/ai/cache.ts** (BB-32) — AI cache module managing the `bb32-v1:*` localStorage namespace. Exports `getCached`, `setCached`, `clearExpiredAICache`, `clearAllAICache`. 7-day TTL, 2 MB cap, oldest-first eviction. See `11-local-storage-keys.md` § "AI Cache" for the full contract.
- **lib/ai/explain.ts** (BB-30) — Explain This Passage Gemini call wrapper. Reads/writes the cache.
- **lib/ai/reflect.ts** (BB-31) — Reflect On This Passage Gemini call wrapper.
- **lib/heatmap/** (BB-43) — Daily activity aggregation for the reading heatmap. Pure functions that read from `wr_chapters_visited` and return structured data the visualization consumes.
- **lib/memorize/store.ts** (BB-45) — Memorization card store. Backs `useMemorizationStore()`.
- **lib/echoes/** (BB-46) — Echo selection engine. Pure TypeScript, no React deps. Takes user history (highlights, memorization cards, reading activity) and a context (today's date, current surface) and returns ranked `Echo` objects.
- **lib/notifications/** (BB-41) — Push notification subscription manager and content generators (daily verse, streak reminder).
- **lib/search/** (BB-42) — Full-text search runtime. Loads the pre-built inverted index from `frontend/public/search/bible-index.json`, queries it client-side, returns ranked results.
- **lib/accessibility/** (BB-35) — Accessibility primitives extracted during the BB-35 audit. Reusable patterns for aria-label, aria-hidden, aria-modal, and focus management beyond `useFocusTrap()`.

### Dashboard Utilities

- **utils/date.ts** — `getLocalDateString()`, `getYesterdayDateString()`, `getCurrentWeekStart()`. Shared across all dashboard features. **Critical**: Never use `new Date().toISOString().split('T')[0]` — it returns UTC, not local time.

---

## Constants (`constants/`)

- **animation.ts** (BB-33) — Canonical animation duration and easing tokens. Import from here instead of hardcoding `200ms` or `cubic-bezier(...)`. See "Animation Tokens" section above.
- **crisis-resources.ts** — `CRISIS_RESOURCES` object, `SELF_HARM_KEYWORDS` array, `containsCrisisKeyword(text)` function.
- **daily-experience.ts** — Completion keys, journal keys, Spotify URL, meditation types, prayer chips (`DEFAULT_PRAYER_CHIPS`), breathing phases. Includes `JOURNAL_DRAFT_KEY` and `PRAYER_DRAFT_KEY` constants for draft persistence.
- **verse-of-the-day.ts** — 60 verses (40 general + 20 seasonal) with daily rotation.
- **question-of-the-day.ts** — 72 QOTD entries (60 general + 12 liturgical).
- **bible.ts** — `BIBLE_BOOKS` constant (66 books with chapter counts), `BOOK_LOADERS` for lazy loading.
- **gradients.tsx** — `WHITE_PURPLE_GRADIENT` CSS string and `GRADIENT_TEXT_STYLE` CSSProperties object used for gradient text across homepage and Daily Hub headings.
- **ambient-suggestions.ts** — `AmbientContext` type with valid values: `'pray' | 'journal' | 'meditate' | 'breathing' | 'soaking' | 'other-meditation' | 'bible-reading'`. Each maps to 3 suggested scene IDs in `AMBIENT_SCENE_IDS`.

### Dashboard Constants

- **dashboard/activity-points.ts** — `ACTIVITY_POINTS` (mood:5, pray:10, listen:10, prayerWall:15, meditate:20, journal:25), multiplier tiers (1x/1.25x/1.5x/2x).
- **dashboard/levels.ts** — `LEVEL_THRESHOLDS` (Seedling:0, Sprout:100, Blooming:500, Flourishing:1500, Oak:4000, Lighthouse:10000).
- **dashboard/badges.ts** — All ~45 badge definitions with IDs, triggers, celebration tiers.
- **dashboard/mood-colors.ts** — `MOOD_COLORS` mapping mood values 1-5 to hex colors.
- **dashboard/encouragements.ts** — 4 preset encouragement messages.
- **dashboard/ai-insights.ts** — 16 hardcoded insight cards (rotating by day-of-year). Real AI insights in Phase 3.

## Types (`types/`)

### Existing Types

- **daily-experience.ts** — `DailyVerse`, `DailySong`, `MockPrayer`, `ClassicPrayer`, `JournalPrompt`, `JournalReflection`, `MeditationType`, `DailyCompletion`, `JournalMode`, `SavedJournalEntry`, `PrayContext` (extended with `customPrompt` and `devotionalSnapshot` fields), `DevotionalSnapshot`, `PendingMeditationVerse` (Spec Z).
- **prayer-wall.ts** — `PrayerWallUser`, `PrayerRequest`, `PrayerComment`, `PrayerReaction`.
- **local-support.ts** — `LocalSupportPlace`, `SearchParams`, `SearchResult`, `SortOption`.

### Dashboard & Growth Types

- **dashboard.ts** — `MoodEntry`, `DailyActivityLog`, `StreakData`, `StreakRepairData`, `FaithPointsData`, `BadgeData`, `FriendProfile`, `FriendRequest`, `FriendsData`, `Notification`, `UserSettings`, `LeaderboardEntry`, `MilestoneEvent`, `SocialInteractionsData`.

### Bible Wave Types

- **bible.ts** / **bible-personal.ts** — `Highlight`, `Bookmark`, `Note`, `JournalEntry`, `MemorizationCard`, `Echo`, `ChapterVisit`, `BibleReaderTheme`, `BibleReaderTypeSize`, `BibleReaderLineHeight`, `BibleReaderFontFamily`.
- **notifications.ts** (BB-41) — `PushSubscriptionRecord`, `NotificationPrefs`, `NotificationType`.
- **ai.ts** (BB-30/BB-31/BB-32) — `ExplainResult`, `ReflectResult`, `AICacheEntry`.

## Mock Data (`mocks/`)

- **daily-experience-mock-data.ts** — 30 daily verses (WEB translation), 30 songs (14 unique tracks), 9 mock prayers, journal prompts, reflections, gratitude affirmations, ACTS steps, examen steps, breathing verses, soaking verses.
- **daily-experience-psalms.ts** — 10 Psalms with full verses, intros, historical context.
- **prayer-wall-mock-data.ts** — 10 mock users, 18+ prayer requests, comments, reactions.
- **local-support-mock-data.ts** — Churches, counselors, celebrate-recovery locations near Columbia, TN (URLs use `example.com`).
- **ask-mock-data.ts** — 16 topic-bucketed AI Bible chat responses with follow-up chips.

### Dashboard Mock Data

- **dashboard-mock-data.ts** — 10 mock friends, mock milestone events, mock notifications, mock global leaderboard (50 users).

---

## Content Data Files (`data/`)

- **devotionals.ts** — 50 devotionals (30 general + 20 seasonal) with quote, passage, reflection, prayer, question.
- **challenges.ts** — 5 community challenges (110 total days) with daily scripture, reflection, action.
- **reading-plans/** — 10 individual plan files (119 total days) with passage, reflection, prayer, action step.
- **guided-prayer-sessions.ts** — 8 audio-guided prayer sessions (5/10/15 min).

### Music Data Files (`data/music/`)

- **sound-catalog.ts** — 24 ambient sounds.
- **scenes.ts** — 11 scene presets + 3 featured scene IDs.
- **scene-backgrounds.ts** — CSS gradient patterns for scene cards.
- **scripture-readings.ts** — 24 WEB scripture readings (4 collections × 6).
- **bedtime-stories.ts** — 12 bedtime stories.
- **playlists.ts** — 8 Spotify playlists (4 worship + 4 explore).
- **routines.ts** — 4 bedtime routine templates.

### Bible Data (`data/bible/books/json/`)

66 individual JSON files, one per Bible book. Lazy-loaded via `BOOK_LOADERS` dynamic imports. Range: 0.14 KB (3 John) to 267 KB (Psalms). Total: ~4.5 MB across all books.

### Search Index (`public/search/`)

- **bible-index.json** (BB-42) — Pre-built inverted index for full-text scripture search. Generated at build time by `frontend/scripts/build-search-index.mjs`. Loaded on demand by the search runtime. Compresses to roughly 1-2 MB gzipped.

---

## Storage Service & localStorage Keys

`StorageService` interface with `LocalStorageService` in `services/storage-service.ts`. Most keys prefixed `wr_`. Bible redesign personal-layer stores use `bible:` prefix. AI cache uses `bb32-v1:` prefix. See `11-localstorage-keys.md` for the complete inventory with types, descriptions, and reactive store hook references.

All writes auth-gated. Abstraction designed for API swap in Phase 3+.

### Draft Persistence Pattern (Spec J + V)

The Pray and Journal textareas auto-save user content to localStorage with a 1-second debounce. Pattern:

- **Keys:** `wr_prayer_draft`, `wr_journal_draft`
- **Debounce:** 1 second after last keystroke
- **UI feedback:** "Draft saved" indicator with `CheckCircle2` icon, fades after 2s
- **Restore:** On component mount, read from localStorage and pre-populate textarea
- **Clear:** When user successfully submits OR explicitly discards
- **Auth flow:** When logged-out user hits the auth wall, AuthModal subtitle reads "Your draft is safe — we'll bring it back after" — draft persists across the auth modal interaction so users don't lose their work

This pattern is canonical for any feature where users invest emotional/time effort into content before hitting an auth or submit gate.

### Reactive Store Pattern (BB-7 onward)

Bible-wave personal-layer features use reactive stores instead of plain CRUD services. Two subscription patterns coexist: Pattern A (subscription via standalone hook with `useSyncExternalStore` — `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`, `useBibleProgress` post-Visual-Rollout Spec 8B) and Pattern B (inline `useState` + `useEffect` + `subscribe()` — highlights, bookmarks, notes, journals, chapter visits, plans). Both patterns are correct. **Storing a snapshot in `useState` without calling the store's `subscribe()` function is the BB-45 anti-pattern and ships as a silent correctness bug.** See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the full pattern documentation.

---

## Music Feature — Technical Architecture

### Audio Provider & Context System

Global `AudioProvider` wraps the app (between `AuthModalProvider` and `Routes` in `App.tsx`). Exposes 4 contexts:

- `AudioStateContext` — read-only state via `useAudioState()`
- `AudioDispatchContext` — actions via `useAudioDispatch()`
- `AudioEngineContext` — Web Audio API service via `useAudioEngine()`
- `SleepTimerControlsContext` — timer controls via `useSleepTimerControls()`

**AudioState** includes: `activeSounds`, `masterVolume`, `isPlaying`, `pillVisible`, `drawerOpen`, `currentSceneName`, `foregroundContent`, `sleepTimer`, `activeRoutine`.

`AudioEngineService` manages a single `AudioContext` (suspend/resume, never destroy/recreate). Ambient: `AudioBufferSourceNode` with crossfade looping (double-buffer, 1.5s overlap). Foreground: `<audio>` elements via `MediaElementAudioSourceNode`. Smart fade: `linearRampToValueAtTime`.

### Visual Theme

Music tabs: dark `#0f0a1e` (`bg-dashboard-dark`) background with frosted glass cards (`bg-white/[0.06] border border-white/10 rounded-xl`) and white text. AudioDrawer/AudioPill/overlays: dark-themed (`rgba(15,10,30,0.85)` with white text). Consistent with the rest of the dark-theme app.

**Music is documented intentional drift.** Visual Rollout Spec 11A migrated Music's tab chrome to canonical patterns (Button variants, FrostedCard tier system, muted-white active-state, border opacity unification, etc.) but **deliberately did NOT migrate the atmospheric layer to `BackgroundCanvas`.** Music preserves its rolls-own atmospheric approach because the audio engine + the four contexts (`AudioProvider`, `audioReducer`, `AudioContext`, `AudioEngineService`) form a load-bearing cluster decoupled from the chrome layer; touching the chrome's atmospheric layer without first reconciling against this cluster risks regressing audio behavior.

**Hard rule (cite Decision 24 from Music direction): No future spec migrates Music chrome to `BackgroundCanvas`, `FrostedCard`, or any other canonical atmospheric primitive without first reconciling against the AudioProvider / audioReducer / AudioContext cluster integrity (Decision 24).** This is not a soft preference — Spec 11A's preservation of the rolls-own atmospheric layer was deliberate, and reverting that decision requires explicit Decision 24 reconciliation in the spec body, not an incidental refactor.

Previously listed music re-enable components (`TimeOfDaySection`, `PersonalizationSection`, `RecentlyAddedSection`, `ResumePrompt`, `MusicHint`, `LofiCrossReference`, `AmbientSearchBar`, `AmbientFilterBar`) and hooks (`useMusicHints`, `useTimeOfDayRecommendations`, `useSpotifyAutoPause`) have all been deleted from the codebase. The `WorshipPlaylistsTab.tsx` `useSpotifyAutoPause` commented-out import was removed in Spec 11A.

### Key Audio Components

Audio components in `components/audio/`: `AudioPill`, `AudioDrawer` (right-side flyout / mobile bottom sheet), `DrawerNowPlaying`, `DrawerTabs`, `AmbientBrowser`, `SleepBrowse`, `RoutineStepper`.

### Key Audio Hooks

In `hooks/`: `useSoundToggle`, `useScenePlayer`, `useForegroundPlayer`, `useSleepTimer`, `useRoutinePlayer`, `useAmbientSearch`, `useAnnounce`.

### Audio Constants

In `constants/audio.ts`: `MAX_SIMULTANEOUS_SOUNDS: 6`, `DEFAULT_SOUND_VOLUME: 0.6`, `MASTER_VOLUME: 0.8`, `SCENE_CROSSFADE_MS: 3000`, `SOUND_FADE_IN_MS: 1000`, `SOUND_FADE_OUT_MS: 1000`, `LOAD_RETRY_MAX: 3`, `LOAD_RETRY_DELAYS_MS: [1000, 2000, 4000]`, `SLEEP_TIMER_OPTIONS: [15, 30, 45, 60, 90]`, `FADE_DURATION_OPTIONS: [5, 10, 15, 30]`.

### Audio Files

Placeholder silent MP3s in `public/audio/` (gitignored). Subdirectories: `ambient/`, `scripture/`, `stories/`, `artwork/`. Real TTS via Google Cloud TTS WaveNet (Male: en-US-Wavenet-D, Female: en-US-Wavenet-F). CDN: Cloudflare R2, base URL in `VITE_AUDIO_BASE_URL`.

---

## Round 3 Visual Patterns (Homepage + Daily Hub + Visual Rollout)

These patterns were established during the GitHub-inspired homepage redesign (HP-1 through HP-15), the Daily Hub Round 3 redesign (Specs 1-Z), and extended by the Round 3 Visual Rollout (2026-04-30 → 2026-05-07, 26 specs). They apply site-wide when building or redesigning pages with dark backgrounds. The Visual Rollout introduced `BackgroundCanvas` (replacing the prior HorizonGlow as the canonical inner-page atmospheric layer), the FrostedCard tier system (`accent` / `default` / `subdued` with `rounded-3xl`), Button `variant="gradient"` and `variant="subtle"`, the muted-white active-state for selectable pills, the `text-violet-300` text-button on dark, the Tonal Icon Pattern, and border opacity unification (`border-white/[0.12]`).

### Section Heading — 2-Line Treatment

Use `SectionHeading` component from `src/components/homepage/SectionHeading.tsx`:

- **Top line:** `text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight`
- **Bottom line:** `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight` with `WHITE_PURPLE_GRADIENT` via `background-clip: text` and `text-transparent`
- Size ratio: bottom line is ~1.5x larger than top line
- `mt-1` between lines (tight coupling)
- Props: `topLine`, `bottomLine`, `tagline?`, `align?`

**Used by these surfaces (Visual Rollout consolidated this verbatim):** Daily Hub headings, Local Support hero, Grow hero, Ask hero, Settings hero, Insights hero, Music hero, RoutinesPage hero, RegisterPage hero, FinalCTA, DashboardPreview, DifferentiatorSection, StartingPointQuiz. Spec 13 promoted the homepage to the same verbatim treatment.

### Glow Backgrounds — Homepage Only

Radial glow orbs positioned behind content. Used by homepage sections via `GlowBackground` component. **Inner pages do NOT use this** — they use `BackgroundCanvas` (see "BackgroundCanvas Atmospheric Layer" below). Settings and Insights stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` as documented intentional drift. Music preserves rolls-own atmospheric layers for audio engine integrity.

**Opacity ranges (center of radial gradient):**

- Standard sections: `0.25-0.35`
- Behind card grids: `0.35-0.40`
- CTA / emotional peaks: `0.45-0.50`
- **NEVER use `0.03-0.15`** — invisible on `bg-hero-bg`

**Implementation pattern:**

```
background: radial-gradient(circle, rgba(139,92,246, CENTER) 0%, rgba(139,92,246, MID) 40%, transparent 70%)
width: 400-900px, height: 300-600px
filter: blur(60-80px)
pointer-events: none, z-0 (content at z-10)
```

Two-stop gradient (center → mid → transparent) produces a richer glow pool than single-stop.

**Mobile:** Reduce orb size by 40% and blur by 25% below `md` breakpoint. Use `will-change: transform` for GPU compositing.

**`glowOpacityMultiplier` prop:** Added in Spec T. Allows per-instance opacity scaling for content that needs more readability protection. Multiplies all orb opacities in the chosen variant. Currently used by: nothing on Daily Hub (Daily Hub no longer uses GlowBackground), available for future homepage use.

### BackgroundCanvas Atmospheric Layer (Visual Rollout Spec 1A → site-wide)

`BackgroundCanvas` is the canonical inner-page atmospheric layer post-Visual-Rollout. Lives at `frontend/src/components/ui/BackgroundCanvas.tsx`. It renders a 5-stop multi-bloom radial-and-linear gradient on a `min-h-screen overflow-hidden` root with `data-testid="background-canvas"`, positioning content via `relative z-10` so children sit above the gradient.

**Canonical CANVAS_BACKGROUND constant** (5-stop gradient — copy verbatim into any new BackgroundCanvas-equivalent surface, do not invent your own):

```
linear-gradient(
  135deg,
  radial-gradient(ellipse at 15% 8%, rgba(139, 92, 246, 0.32) 0%, transparent 45%),  /* top-left violet bloom */
  radial-gradient(ellipse at 85% 35%, rgba(139, 92, 246, 0.26) 0%, transparent 50%), /* mid-right violet */
  radial-gradient(ellipse at 12% 78%, rgba(139, 92, 246, 0.30) 0%, transparent 55%), /* bottom-left violet */
  radial-gradient(ellipse at 50% 50%, rgba(13, 6, 32, 0.55) 0%, transparent 70%),    /* dark center vignette */
  linear-gradient(135deg, #08051a 0%, #0d0620 50%, #08051a 100%)                     /* diagonal base */
)
```

(The exact rgba/percentage values live in `BackgroundCanvas.tsx` — if this rule and that file disagree, the file wins; update this rule and the recon report.)

**Pages using `<BackgroundCanvas>`** (post-Visual-Rollout): DailyHub, BibleLanding, MyBiblePage, BiblePlanDetail, BiblePlanDay, PlanBrowserPage, ReadingPlanDetail, ChallengeDetail, GrowPage, LocalSupportPage (Churches, Counselors, CelebrateRecovery), AskPage, RegisterPage, CreatePlanFlow.

**Documented intentional drift** (these pages do NOT use BackgroundCanvas):

- **Settings + Insights:** Stay on `bg-dashboard-dark + ATMOSPHERIC_HERO_BG` (Direction Decision per Visual Rollout Spec 10A). The Insights `InsightsDataContext` provider (Spec 10B) is an Insights-specific data-read pattern — NOT promoted to canonical reusable template; if a second consumer adopts it in a future spec, revisit promotion.
- **Music (Spec 11A):** Preserves rolls-own atmospheric layers. **Hard rule: no future spec migrates Music chrome to `BackgroundCanvas`, `FrostedCard`, or any other canonical atmospheric primitive without first reconciling against the AudioProvider / audioReducer / AudioContext cluster integrity (Decision 24 from Music direction).** The audio engine + the four contexts form a load-bearing cluster decoupled from chrome; touching the chrome without that reconciliation risks regressing audio behavior.
- **BibleReader:** Uses `ReaderChrome` and the reader-only theme variants (midnight / parchment / sepia) — its own immersive layout, documented elsewhere in this file.

**Daily Hub-specific structure (Visual Rollout Spec 1A — what was Spec Y + Wave 7):**

The DailyHub root post-Spec-1A wraps content in `<BackgroundCanvas>` directly (no separate `<HorizonGlow />` layer). Tab content components (DevotionalTabContent, PrayTabContent, JournalTabContent, MeditateTabContent) and SongPickSection use plain `<div>` wrappers with `mx-auto max-w-2xl px-4 py-10 sm:py-14` — no `bg-*`, no GlowBackground wrapper. The BackgroundCanvas gradient shows through. All content sections get `relative z-10` so they sit above the gradient. The `DailyAmbientPillFAB` sticky bottom-right floating button mounts as the last child of the DailyHub root.

**HorizonGlow.tsx is orphaned legacy as of Spec 1A.** The component still exists in `frontend/src/components/daily/HorizonGlow.tsx` along with its test file but has zero production consumers. A future cleanup spec will remove it (filed in `_plans/reconciliation/discoveries.md` D2). Do not import HorizonGlow from new code.

**StarField was experimented with but removed.** A Spec Y component called `StarField.tsx` (110+ small white dots scattered across the page) was built and tested, but the visual effect read as "dust on screen" rather than "stars in space." It has been deleted. Do not re-add stars without explicit reconsideration.

**GlowBackground remains active on the homepage only.** GlowBackground.tsx still exists and is used by the homepage. The BackgroundCanvas pattern is the canonical inner-page atmospheric layer; GlowBackground is the canonical per-homepage-section atmospheric primitive.

### Frosted Glass Cards (FrostedCard Component)

`FrostedCard` component (`src/components/homepage/FrostedCard.tsx`):

- Background: `bg-white/[0.07]` with `backdrop-blur-sm` (post-Visual-Rollout — earlier `bg-white/[0.06]` is drift)
- Border: `border border-white/[0.12]` — visible, not invisible (Visual Rollout border-opacity unification — `border-white/10` is drift)
- Shadow: `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`
- Radius: `rounded-3xl` (post-Visual-Rollout — earlier `rounded-2xl` is drift), Padding: `p-6`
- Hover (when interactive): `bg-white/[0.10] border-white/[0.18]` with intensified shadows

#### FrostedCard Tier System (Spec T + Visual Rollout)

The Daily Hub devotional and inner pages use a content tier system to prioritize reading-heavy elements. Variant API: `accent | default | subdued`. Eyebrow API: `eyebrow` + `eyebrowColor`.

- **Tier 1 (`variant="accent"`, primary reading content):** Surface `bg-violet-500/[0.08]` (post-Visual-Rollout — earlier `[0.04]` is drift), border `border-violet-400/70` (post-Visual-Rollout — earlier `/45` is drift), `text-white`, `leading-[1.75]` to `leading-[1.8]`, font sizing `text-[17px] sm:text-lg`. Reflection body uses this variant with eyebrow ("Today's reflection") + violet leading dot — DailyHub 2 promoted this card to centerpiece tier. Italic styling removed from reading prose for legibility.
- **Tier `variant="default"`** (general content): Surface `bg-white/[0.07]`, border `border-white/[0.12]`, `rounded-3xl`. Saint quote uses this variant for a quieter supporting voice (italic kept on the saint quote because short quoted commentary reads well in italic).
- **Tier 2 (rolls-own scripture callout):** `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` (or `px-5 py-6 sm:px-7 sm:py-7` for content-heavy callouts) — a left-border accent treatment originally introduced for the devotional passage and extended in DailyHub 2 to the reflection question. Both callouts share the same class string for visual unification across the tab. Lighter than a full FrostedCard but still distinct from body prose.
- **`variant="subdued"`** (Visual Rollout Specs 1, 6B): Reduced surface opacity for sub-content panels. `bg-white/[0.05]` with the same border + radius. Use for secondary panels nested inside a larger Tier 1 or default card.

**Eyebrow distinction (DailyHub 2):** Tier 1 (`<FrostedCard variant="accent">`) and Tier 2 (rolls-own callout) both support an uppercase tracked eyebrow above the inner content, but they render the eyebrow differently. Tier 1 — when used with `<FrostedCard variant="accent" eyebrow="..." eyebrowColor="violet">` — renders the eyebrow as a violet leading dot (`bg-violet-400`) followed by the label (`text-violet-300 font-semibold tracking-[0.15em]`). The dot is the visual signature of the most prominent tier. Tier 2 — when used as a rolls-own `<div>` with an inline eyebrow paragraph — renders ONLY the label (`text-white/50 font-medium tracking-[0.15em]`) with NO leading dot. The left-stripe accent (`border-l-4 border-l-primary/60`) is the Tier 2 signature; adding a dot would double up on accent. Apply the dot to Tier 1 eyebrows only.

This tier system is canonical for any future feature with mixed content density (reading content + accent callouts).

#### Cross-surface card pattern (Visual Rollout Spec 3)

Navigable cards use the `<Link> + FrostedCard` group-hover pattern: outer `<Link className="block group focus-visible:outline-none focus-visible:ring-2 ring-white/50 rounded-3xl">` with inner `<FrostedCard variant="default" as="article" className="group-hover:bg-white/[0.10] group-hover:shadow-frosted-hover group-hover:-translate-y-0.5">`. **FrostedCard does NOT receive `onClick`; the Link handles navigation.** This is the canonical for EchoCard, VersePromptCard, PlanBrowseCard, ListingCard, and similar navigable cards.

### Button Component Variants (Visual Rollout)

The `Button` component supports several variants. Use the right one for the surface and emotional weight.

- `variant="primary"` — legacy `bg-primary` solid; **deprecated for new code on dark surfaces.** Use `variant="subtle"` or `variant="gradient"` instead.
- `variant="secondary"` — legacy.
- `variant="outline"` — legacy.
- `variant="ghost"` — `text-white/80 hover:text-white hover:bg-white/5` on dark surfaces (Spec 6, "make-it-right"). Older `text-primary hover:bg-primary/5` is deprecated.
- `variant="light"` — light pill, used pre-rollout.
- `variant="gradient"` — violet gradient pill (`from-violet-400 to-violet-300`, `text-black` post-iteration-1 — earlier `text-violet-900` is deprecated). Used for emotional-peak CTAs ("Help Me Pray", "Save Entry", "Generate"). Canonical `size="lg"`.
- `variant="subtle"` — frosted pill (`rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 gap-2 font-medium min-h-[44px]`). **Default secondary CTA on dark surfaces post-Visual-Rollout** — replaces most `bg-primary` solid usage (Spec 4A counted 12+ instances migrated).
- `variant="alertdialog"` — added in Spec 10A. Used in destructive confirmations. See "AlertDialog Pattern" below.
- `asChild` prop — Button polymorphic via `cloneElement` so it can wrap a `<Link>` while preserving styling.

### Active-State and Selection Patterns (Spec 10A canonical)

- **Muted-white isolated pill** (canonical for `RadioPillGroup`, settings tabs, tonal-pill TimeRange selector): `bg-white/15 text-white border border-white/30`.
- **Muted-white active foreground** (canonical for active foreground without border, e.g., active sidebar item): `bg-white/15 text-white`.
- **Pill+halo tab bar** (canonical for tabbed views — DailyHub, Music, Local Support, Grow): outer `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`; active tab `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`.
- **Selected card ring** (canonical for selectable cards): `ring-violet-400/60`. The pre-rollout `ring-primary` is deprecated.

### Text-Button Pattern (Spec 10A WCAG AA fix)

- Canonical text-button color on dark surfaces: `text-violet-300 hover:text-violet-200`.
- Pre-rollout `text-primary` and `text-primary-lt` are **deprecated for text-buttons on dark backgrounds** (fail WCAG 4.5:1 floor on `bg-hero-bg`).
- Spec 10A's audit migrated all known instances.

### Tonal Icon Pattern (Dashboard widgets — Spec 4B)

Per-widget header icon color taxonomy (Lucide icon stroke color via Tailwind text-color class, applied via `DashboardWidgetGrid.tsx` icon prop):

- `text-pink-300` — gratitude family
- `text-sky-300` — insight/data family
- `text-violet-300` — default/spiritual family
- `text-emerald-300` — positive/success family
- `text-amber-100` / `text-amber-300` — recap/seasonal family
- `text-yellow-300` — achievement family

**Severity-tonal split for status indicators:** `text-emerald-300` / `text-red-300` / `text-amber-300`. Replaces `text-success` / `text-danger` / `text-warning` which referenced the old palette and are now deprecated.

### Border Opacity Unification (Visual Rollout)

All decorative card and chrome borders on dark surfaces use **`border-white/[0.12]`** (NOT `border-white/10`). This was unified across the audio cluster (Spec 11A) and applies app-wide. Tighter (`border-white/[0.18]`) acceptable on hover-emphasis. Looser (`border-white/[0.08]`) acceptable for pill tabs' outer border.

### AlertDialog Pattern (Spec 10A / 11B canonical)

Destructive confirmations (DeleteAccountModal, DeleteRoutineDialog, DeletePrayerDialog, etc.) use:

- `<Button variant="alertdialog">` for the destructive action (semantic discipline — not a generic primary button).
- `AlertTriangle` icon (Lucide) in the heading row.
- Muted destructive treatment: `bg-red-950/30 border border-red-400/30 text-red-100 hover:bg-red-900/40` — saturated `bg-red-700` / `bg-red-800` is deprecated.

### White Pill CTA Patterns

Two distinct white pill button patterns:

**1. Inline CTA (smaller, used inside cards or content blocks):**

```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100
```

Used by: "Journal about this question", "Pray about today's reading", "Meditate on this passage" — all the inline cross-feature CTAs in the devotional.

**2. Homepage primary CTA (larger, used as a section's main action):**

```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

Used by: "Get Started — It's Free" on FinalCTA, "Help Me Pray" on PrayerInput, "Save Entry" on JournalInput, "Generate" buttons on AI flows. The white drop shadow carries the emotional weight of the primary action.

**Use Pattern 1 for inline/secondary CTAs and Pattern 2 for the primary action of a screen.**

**Verbatim only — drift is a regression.** Visual Rollout Specs 7 and 13 reconciled CTAs across DashboardPreview, FinalCTA, RegisterPage, PrayerInput, and JournalInput to the canonical class strings above. Any new white-pill CTA must use the verbatim string. In particular, Pattern 2 uses `text-hero-bg` (NOT `text-primary` — Spec 7 reconciliation; using `text-primary` reverts to a violet-on-white text color that doesn't match the canonical hero-bg dark text on white pill).

**Used by these surfaces (cross-reference for impact assessment):** DashboardPreview, FinalCTA, RegisterPage, PrayerInput "Help Me Pray", JournalInput "Save Entry", AI Generate flows, Devotional "Journal about this question" / "Pray about today's reading" / "Meditate on this passage". Changes to the canonical strings ripple across all of these.

### Locked Preview Card Pattern

For showing auth-gated features to logged-out visitors:

- **Top:** Preview mockup area with `bg-hero-bg/50 backdrop-blur-[3px]` lock overlay. Lock icon only (no text).
- **Bottom:** Clear text area with icon (unique color per card) + title + description. Not behind blur.
- Border between areas: `border-b border-white/[0.06]`

### Section Dividers (Homepage)

Between every major homepage section:

```
<div className="border-t border-white/[0.08] max-w-6xl mx-auto" />
```

Content-width, not full-viewport. Subtle but visible. Daily Hub does NOT use these (the BackgroundCanvas continuous layer makes section boundaries invisible by design).

### Journey Section Squiggles

The homepage `JourneySection` uses narrow inline SVG squiggles (~150px wide column, centered) — NOT the full-width `BackgroundSquiggle` component. The SVG uses `preserveAspectRatio="none"` to stretch vertically and a gradient mask to fade at top/bottom. **This is the only remaining squiggle usage in the app** — squiggles were removed from Daily Hub in Wave 5 and from Music tabs (verify before redesign work).

### Sticky FAB Pattern (Wave 7)

Persistent floating action buttons that anchor to the bottom-right of the viewport with safe-area-inset support:

```tsx
<div
  className="pointer-events-none fixed z-40 transition-opacity duration-200"
  style={{
    bottom: "max(1.5rem, env(safe-area-inset-bottom))",
    right: "max(1.5rem, env(safe-area-inset-right))",
  }}
>
  <div className="pointer-events-auto">{/* Actual interactive content */}</div>
</div>
```

Key principles:

- `pointer-events-none` on the outer fixed div + `pointer-events-auto` on the inner so empty space around the FAB doesn't intercept clicks on underlying content
- `z-40` puts it above content but below modal overlays (which use `z-50`)
- `env(safe-area-inset-*)` respects iOS notches and Android navigation bars
- Drop shadow on the inner element (e.g., `shadow-[0_4px_20px_rgba(0,0,0,0.4)]`) lifts the FAB visually off the page

### Drawer-Aware Visibility Pattern (Wave 7)

Components that auto-hide when the AudioDrawer is open (chat-widget pattern). Used by `DailyAmbientPillFAB`:

```tsx
const audioState = useAudioState();
const isHidden = audioState.drawerOpen;

return (
  <div
    className={cn(
      "fixed ... transition-opacity duration-200",
      isHidden ? "opacity-0 pointer-events-none" : "opacity-100",
    )}
    aria-hidden={isHidden}
  >
    {/* content */}
  </div>
);
```

This prevents the FAB from sitting on top of the AudioDrawer when it slides in. When the drawer closes, the FAB fades back in over 200ms.

### Inline Element Layout — Position Verification

When designing layouts with elements that should be inline (e.g., chips and pills on a single row, label and input on the same line), the visual verification step (`/verify-with-playwright`) should compare `boundingBox().y` values between elements — not just CSS classes. Two elements with correct `flex` classes can still wrap to different rows if their combined width exceeds the container. **A chip row with `flex-wrap` will silently wrap a trailing element to row 2, and CSS-only verification won't catch it.**

When specifying inline layouts, document the expected y-coordinate alignment in the spec/plan so verification has explicit positional assertions.

---

## Accessibility Patterns (BB-35)

BB-35 conducted a full accessibility audit and formalized the canonical patterns below. WCAG 2.2 AA is the project target. Lighthouse Accessibility score target is 95+ on every major page.

### Skip-to-main-content links

- Standard layout: the canonical skip link is mounted by `Navbar.tsx` as the first focusable element on the page. Visible only on keyboard focus. Jumps to the `<main>` element.
- BibleReader exception: because BibleReader uses `ReaderChrome` instead of `Navbar`, it mounts its own root-level skip link. The `ReaderChrome` toolbars are wrapped in `<nav aria-label="Reader controls">` so the skip link can bypass them.
- **Every page must have a skip link.** If a future page uses an alternative layout, it must mount its own skip link or include the canonical one.

### Heading hierarchy

- Every page must have exactly one `<h1>`. Visually-hidden h1s are acceptable for pages where the title appears in chrome rather than in body content (e.g., MyBiblePage uses a visually-hidden h1).
- Heading levels must be sequential (no `<h2>` followed by `<h4>` skipping `<h3>`).
- Section headings within a page use `<h2>` and `<h3>` consistently.

### ARIA patterns

- **Modals/dialogs:** `role="dialog"` + `aria-modal="true"` + labelled by a heading or `aria-label`. Use `useFocusTrap()` for focus management. Restore focus to the trigger on close.
- **Alert banners:** `role="alert"` + `aria-live="assertive"` for crisis content. `role="status"` + `aria-live="polite"` for non-critical announcements.
- **Toggle buttons:** `aria-pressed="true|false"` on toggles where the same button represents two states (mood selector buttons, sound effects toggle).
- **Icon-only buttons:** `aria-label` describing the action (e.g., "Close drawer", "Toggle audio"). Decorative icons inside labelled buttons get `aria-hidden="true"`.
- **Stat card icons:** Decorative icons in stat cards get `aria-hidden="true"` so screen readers don't read the icon name as part of the stat.
- **Form inputs:** Every input must have an associated `<label>` (via `htmlFor`/`id`) or `aria-label`. Placeholder text is not a label. Use `aria-invalid="true"` and `aria-describedby` for error messages.
- **Live regions:** Character count uses `aria-live="polite"` to announce zone changes (e.g., "approaching limit", "limit reached") without interrupting user typing.

### Color contrast

- All text on dark backgrounds must meet the contrast minimums in the "Text Opacity Standards" table above.
- Verify contrast with the canonical opacity values, not by eyeballing.
- When in doubt, use `text-white` — it always passes.

### Focus indicators

- Never use `outline-none` or `focus:outline-none` without a visible replacement.
- Use `focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-hero-bg` or equivalent.
- The white pill primary CTA pattern includes the canonical focus ring already.

### Tab order

- Tab order must follow visual order (top-to-bottom, left-to-right within rows).
- The first focusable element on every page should typically be the skip-to-main-content link.
- Use `tabindex="0"` to add elements to the tab order; use `tabindex="-1"` to remove them. Never use `tabindex` values greater than 0.

### Reduced motion

- The global `prefers-reduced-motion` rule in `frontend/src/styles/animations.css` handles this site-wide. Individual components do not need to check.
- Documented exemptions: shimmer (300ms loading state), breathing exercise (functional), garden ambient SVG. See "Reduced-Motion Safety Net" section above.

### Accessibility statement page (`/accessibility`)

BB-35 added a public `/accessibility` page linked from the site footer. The page publishes:

- Worship Room's accessibility commitment
- The target standard (WCAG 2.2 AA)
- Known limitations (e.g., the BibleReader's reader-mode only theme switching, not site-wide)
- A feedback mechanism (email or form)
- The date of the last accessibility audit

Update the audit date when running the BB-35 protocol or any future accessibility-focused spec.

---

## Deprecated Patterns (Do Not Use on New Code)

The following patterns have been replaced by Round 3 / Daily Hub Round 3 / Bible wave / Visual Rollout work. Do not introduce them into new components:

| Deprecated Pattern                                              | Replacement                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Caveat` font on headings outside wordmark/RouteLoadingFallback | `GRADIENT_TEXT_STYLE` (white-to-purple gradient)                                        |
| `BackgroundSquiggle` on Daily Hub                               | None — Daily Hub uses BackgroundCanvas. Squiggles remain on homepage JourneySection.    |
| `GlowBackground` per Daily Hub section                          | `BackgroundCanvas` at Daily Hub root (Visual Rollout Spec 1A)                           |
| `HorizonGlow` on Daily Hub or any inner page                    | `BackgroundCanvas` (Visual Rollout Spec 1A — HorizonGlow.tsx is orphaned legacy)        |
| `GlowBackground` on inner pages (non-homepage)                  | `BackgroundCanvas` (Visual Rollout)                                                     |
| `animate-glow-pulse` on textareas                               | Violet textarea glow (DailyHub 1B) — see "Textarea Glow Pattern"                        |
| Inline expanding dropdown panel for AmbientSoundPill idle state | Open AudioDrawer right-side flyout in both states                                       |
| `font-serif italic` on Journal prompts                          | `font-sans` Inter, no italic, white text                                                |
| Side-by-side SongPickSection layout                             | Centered single-column with equal-width heading lines                                   |
| "What's On Your Heart/Mind/Spirit?" headings on Daily Hub tabs  | No headings — content speaks for itself                                                 |
| Devotional theme tag pills                                      | Removed; theme is still passed via cross-feature CTAs but not displayed                 |
| Cyan/purple textarea glow border                                | Violet textarea glow (DailyHub 1B) — see "Textarea Glow Pattern"                        |
| White border with white glow shadow on Pray/Journal textareas   | Violet textarea glow (DailyHub 1B) — see "Textarea Glow Pattern"                        |
| `font-serif italic text-white/60` hero subtitles                | Removed; hero typography is `text-white` Inter sans only                                |
| `line-clamp-3` on guided prayer card descriptions               | `min-h-[260px]` with no clamp                                                           |
| Hardcoded `200ms`/`cubic-bezier(...)` in component CSS          | Import canonical tokens from `frontend/src/constants/animation.ts` (BB-33)              |
| Spring easings on modals/toasts/drawers                         | `standard`, `decelerate`, or `accelerate` from `constants/animation.ts` (BB-33)         |
| Per-component `prefers-reduced-motion` checks                   | Global safety net in `frontend/src/styles/animations.css` (BB-33)                       |
| Local `useState(getAllX())` mirrors of reactive store data      | `useXStore()` hook — see "Reactive Store Pattern" above (BB-45 anti-pattern)            |
| Custom empty state components per feature                       | `FeatureEmptyState` — the canonical empty state primitive (BB-34)                       |
| Welcome modals that gate content for new visitors               | `FirstRunWelcome` — informational layer, never a gate, suppressed on deep links (BB-34) |
| Mocking the entire reactive store in tests                      | Use real store + mutate from outside the component to verify subscription (BB-45)       |
| `border-l-4 border-l-primary/60` accent stripe (general use)    | Reserved for Tier 2 scripture callout; general accent is all-around violet border       |
| `bg-white/[0.04]` default tier surface                          | `bg-white/[0.07]` (Visual Rollout)                                                      |
| `bg-white/[0.02]` subdued tier surface                          | `bg-white/[0.05]` via `<FrostedCard variant="subdued">` (Visual Rollout)                |
| `bg-violet-500/[0.04]` accent tier surface                      | `bg-violet-500/[0.08]` (Visual Rollout)                                                 |
| `border-violet-400/45` accent tier border                       | `border-violet-400/70` (Visual Rollout)                                                 |
| `rounded-2xl` as default `FrostedCard` radius                   | `rounded-3xl` (Visual Rollout)                                                          |
| `border-white/10` decorative borders                            | `border-white/[0.12]` (Visual Rollout border-opacity unification)                       |
| `bg-primary` solid CTAs on dark surfaces                        | `<Button variant="subtle">` (default secondary) or `variant="gradient"` (emotional peak)|
| `bg-primary/80` overlay surfaces on dark                        | Use violet-tinted frosted treatment instead (`bg-violet-500/[0.08]` etc.)               |
| `border-primary/40` AudioPill borders                           | `border-white/[0.12]` (border-opacity unification, Spec 11A)                            |
| `text-primary` text-button on dark surfaces                     | `text-violet-300 hover:text-violet-200` (Spec 10A WCAG AA fix)                          |
| `text-primary-lt` text-button on dark surfaces                  | `text-violet-300 hover:text-violet-200` (Spec 10A)                                      |
| `text-success` / `text-danger` / `text-warning` CSS variables   | `text-emerald-300` / `text-red-300` / `text-amber-300` (Visual Rollout severity refresh)|
| `text-violet-900` on `<Button variant="gradient">`              | `text-black` (post-iteration-1 of Visual Rollout)                                       |
| `ring-primary` selected-card ring                               | `ring-violet-400/60` (Visual Rollout)                                                   |
| Inline duplicate `ATMOSPHERIC_HERO_BG` strings                  | Import the constant from PageHero (Visual Rollout Specs 8C / 6A consolidated)           |
| Light dropdowns on dark surfaces                                | Dark frosted dropdowns matching FrostedCard treatment                                   |
| AuthModal trailing-period subtitles                             | Sentence-case subtitles without trailing period (Visual Rollout copy refresh)           |
| Saturated `bg-red-700` / `bg-red-800` destructive               | Muted `bg-red-950/30 border-red-400/30 text-red-100` (AlertDialog Pattern)              |
| Rolls-own `rounded-2xl border-white/10 bg-white/5 backdrop-blur-sm` cards | `<FrostedCard>` with `rounded-3xl border-white/[0.12] bg-white/[0.07]` (Visual Rollout)|
| `STOP_ROUTINE` action name in audio reducer                     | `END_ROUTINE` (canonical post-Spec-11A)                                                 |
| Layout `transparentNav: false` as default                       | `transparentNav: true` is the default post-Spec-12; opaque is defensive fallback only   |
| `bg-dashboard-dark` on RouteLoadingFallback                     | RouteLoadingFallback uses BackgroundCanvas-equivalent treatment (Visual Rollout)        |
| `aria-pressed` on radio-style answer options                    | `role="radio"` + `aria-checked` (semantic correction)                                   |
| Pill+halo tab using `bg-primary` solid active                   | `bg-violet-500/[0.13] border-violet-400/45 + violet halo shadow` (Visual Rollout)       |

---

## Error, Loading, and Empty States

This section is the single authoritative reference for every error, loading, and empty state across the app. Future spec authors should open this section and be able to pick the right component for any UI state without reading source files. Introduced by Spec 1.9b (Forums Wave, 2026-04-23) — replaced and expanded the prior "Error UX Tier System" section.

**Core principle:** A user who sees a clear error message is better served than one who sees silent failure. Four states, each with its own component and its own copy treatment. Empty ≠ zero ≠ loading.

### Component-State Matrix

Canonical primitive per feature area × UI state. "GAP" means no standardized primitive exists today — the first consuming spec that needs it fills the gap following the conventions in this section.

| Feature area | Loading | Error | Empty | Success |
|---|---|---|---|---|
| **Auth forms** (`/register`, AuthModal) | `RouteLoadingFallback` + `FormField` + `<Button isLoading>` | `FormField` (field) + `<FormError>` (form-level) | N/A | `<Toast type="success">` |
| **Navbar / App shell** | `<Suspense fallback>` | `ErrorBoundary` + `ChunkErrorBoundary` | N/A | N/A |
| **Dashboard** (`/`) | `DashboardSkeleton` | `RouteErrorBoundary` | `FeatureEmptyState` (new user widgets) | Widgets render in place |
| **Daily Hub** (`/daily`) | `DailyHubSkeleton` | `RouteErrorBoundary` | `FeatureEmptyState` in sub-states | `<Toast type="success">` |
| **Profile** (`/profile/:userId`) | `ProfileSkeleton` | `RouteErrorBoundary` | `FeatureEmptyState` | In-page data |
| **Prayer Wall** (`/prayer-wall`) | `PrayerWallSkeleton` | `RouteErrorBoundary` (Phase 3 async GAP — see "Deferred primitives") | `FeatureEmptyState` | `<Toast type="success">` on submit |
| **Bible Reader** (`/bible/:book/:chapter`) | `BibleReaderSkeleton` | `ChunkErrorBoundary` + inline AI-panel error states | N/A (Bible always has content) | Verse content renders |
| **Composer** (journal/prayer) | `<Button isLoading>` | `FormField` (field) + `<FormError>` (form-level) + `CrisisBanner` (inline crisis) | N/A | `<Toast type="success">` + draft clear |
| **Friends** (`/friends`) | `FriendsSkeleton` | `RouteErrorBoundary` | `FeatureEmptyState` | In-page |
| **Insights** (`/insights`) | `InsightsSkeleton` | `<ChartFallback>` (chart-level, wrapped by `ErrorBoundary fallback`) + `RouteErrorBoundary` (page-level) | `FeatureEmptyState` (sparse data) | Chart renders |
| **Settings** (`/settings`) | `SettingsSkeleton` | `RouteErrorBoundary` | N/A | `<Toast type="success">` |
| **Admin** (Phase 10 future) | GAP | GAP | GAP | GAP — deferred to Phase 10 |

### Decision Tree: Which component for which state?

The prior 4-tier framing (inline-retry / fallback-alternative / toast / silent) from the pre-1.9b rule is preserved as the *intent* behind this decision tree — when in doubt, escalate the tier.

**Loading?**
1. **First choice — skeleton.** Content-shaped skeleton is the canonical Worship Room loading treatment. Use the matching page skeleton (`DashboardSkeleton`, `DailyHubSkeleton`, `PrayerWallSkeleton`, `BibleReaderSkeleton`, etc.) on the route-level `<Suspense fallback>`. For in-page sub-sections, compose the atomic primitives (`SkeletonBlock`, `SkeletonCard`, `SkeletonCircle`, `SkeletonText`) within an `aria-busy="true"` + sr-only "Loading" wrapper.
2. **Button-internal — `<Button isLoading>`.** Submit buttons and other primary CTAs use the `isLoading` prop, which shows an inline spinner, sets `aria-busy`/`aria-disabled`, and preserves button width so layout does not jump on state change.
3. **Standalone spinner — `<LoadingSpinner>`.** Use only where a skeleton is infeasible (tiny inline indicator, modal content while fetching, button interior). Has `role="status"` and a sr-only label ("Loading" default, override for specific contexts like "Saving your prayer"). Never use a standalone spinner when a skeleton would work.

**Error?**
1. **Render crash in a subtree** → wrap in an error boundary. `ErrorBoundary` for generic subtrees, `RouteErrorBoundary` for top-level routes (wraps a `Layout`), `ChunkErrorBoundary` for dynamic-import failures only (propagates non-chunk errors to the outer boundary). Error-boundary *functional enhancements* (Sentry integration, retry logic) are Spec 16.2b's territory; this section governs copy + a11y only. **Visual Rollout Spec 12 added canonical chrome for `RouteErrorBoundary` and `ChunkErrorBoundary`:** FrostedCard tier 1 (`variant="accent"`) wrap, `role="alert"`, lucide `RefreshCw` icon in the heading row, white-pill primary CTA (Pattern 2 — "Try Again" / "Reload"), `GRADIENT_TEXT_STYLE` heading, optional secondary "Go Home" button as `<Button variant="subtle">`. Use this canonical chrome for any new error-boundary fallback.
2. **Form submission failed (form-level)** → `<FormError>` above the form. Defaults to `severity="error"` with `role="alert"` + `aria-live="assertive"`. Use `severity="warning"` (`role="alert"` + `aria-live="polite"`) for non-critical warnings, `severity="info"` (`role="status"` + `aria-live="polite"`) for passive notices. Caller supplies the message via children — the component is structure + a11y, not copy.
3. **Per-field validation** → `<FormField error="…">`. The field-level `error` prop wires `aria-invalid="true"`, links the message via `aria-describedby`, and renders `role="alert"` on the error paragraph. Focus-move-to-invalid-field on submission failure is the consuming form's responsibility (see Accessibility Checklist below).
4. **Chart failed to render** → `<ChartFallback>` inside `<ErrorBoundary fallback={…}>`. Used by the 4 Insights charts today. Component has `role="status"` + `aria-live="polite"` (not `assertive` — a fallback is a lost-content state, not an interrupt).
5. **Background operation failed** (not the user's foreground action) → `<Toast type="error">`. Auto-dismisses; don't use for primary-action failures — those need `<FormError>` or inline error.
6. **Page-level async-data fetch failed** (first new in Phase 3) → `PageError.tsx` does not exist yet. The first Phase 3 migration spec that needs it creates the component in `ui/` following the conventions here: `role="alert"`, blameless copy (defaults: headline "We couldn't load this page", body "Try reloading. Your other work is safe.", button "Reload"), action button plus optional secondary "Go Home". See `_specs/forums/spec-1-9b.md` § "Copy Deck" for the default strings.
7. **Non-essential side effect failed** (localStorage quota, analytics write, etc.) → silent catch with an inline comment documenting *why* the failure is safe to swallow. Never log to console without user-visible feedback for user-initiated actions.

**Empty?**
1. **Canonical primitive — `<FeatureEmptyState>`.** Icon + heading + description + optional CTA. Used on Prayer Wall, My Bible, Insights, Friends. Any new empty state uses this component.
2. **Empty ≠ zero ≠ loading.**
   - *Empty* = "legitimately nothing here, and that's fine" ("You haven't bookmarked any prayers yet.")
   - *Zero* = "should be something but filter/search turned up nothing" ("No results for 'grace'.")
   - *Loading* = "fetching, answer unknown" — use a skeleton.
   Each gets its own copy treatment; do not reuse empty copy for zero state or vice versa.

**Success?**
1. **Action feedback** → `<Toast type="success">` (top-right, 6s auto-dismiss). Use for saves, submissions, copied-to-clipboard, and other post-action confirmations.
2. **Atmospheric / reflective notice** → `<WhisperToast>` (bottom-center, italic serif, quiet tone). Used by MidnightVerse and useGratitudeCallback. Not a replacement for Toast — they coexist by design. Toast = action feedback, Whisper = atmospheric.
3. **Passive state change** — reflect it directly in the UI without a toast.

### Copy Guidelines

Paired good/bad examples drawn from common Forums Wave surfaces. Every user-facing string passes the [Anti-Pressure Copy Checklist](#anti-pressure-checklist-references) below.

| Surface | ✅ Good | ❌ Bad |
|---|---|---|
| Form submission failed | "We couldn't save that. Please check the fields below." | "Oops! Something went wrong!" |
| Page-level load failure | "We couldn't load this page. Your other work is safe." | "Error loading page. Please try again NOW." |
| Feed empty (new user) | "You haven't bookmarked any prayers yet." | "You haven't saved a single prayer yet!" |
| Search zero results | "No results for 'grace'. Try a broader term." | "Nothing found!!!" |
| Post failed (crisis-adjacent) | "We couldn't post that. Would you like to keep a draft?" | "Failed to send. Your message was lost." |
| Profile load failed | "We couldn't load this profile right now." | "This user could not be found. Connection error." |
| Friends-empty | "Faith grows stronger together." | "You have no friends yet!" |
| Loading | Skeleton shape, no copy | "Loading…" spinner by default on content regions |

**Rules:**
- **Sentence case, complete sentences, period terminators.** "We couldn't finish that." not "WE COULDN'T FINISH THAT" or "we couldn't finish that" or "We couldn't finish that!"
- **Blameless framing.** "We couldn't reach our server" not "Your connection failed". Even when user input IS the cause, phrase it as the field being invalid, not the user being wrong.
- **No exclamation points near vulnerability.** Error, empty, and loading states never use exclamation points. Celebration toasts may.
- **Feature-specific copy lives in the consuming spec's Copy Deck, not here.** This section teaches patterns and shows anchor examples. Consuming specs own their strings.
- **Crisis-adjacent features (Prayer Wall, Journal, Meditate) need extra copy review.** See Universal Rule 13 and `01-ai-safety.md`. The general pattern lives here; crisis-specific strings live in per-feature specs.

### Accessibility Checklist

Every new-or-modified error/loading/empty state must pass:

- [ ] **Error state** — `role="alert"` + `aria-live="assertive"` for user-action-required (form-submission failure, session expired). `role="alert"` + `aria-live="polite"` for warnings. `role="status"` + `aria-live="polite"` for lost-content fallbacks (ChartFallback) and non-critical notices.
- [ ] **Loading state** — `aria-busy="true"` on the region; sr-only "Loading" announcer. Skeletons already do this; new loading regions must match.
- [ ] **Empty state** — semantic `<h3>` for heading; `FeatureEmptyState` is the canonical primitive; decorative icons carry `aria-hidden="true"`.
- [ ] **Form field error** — `<FormField error="…">` handles the wiring automatically (`aria-invalid`, `aria-describedby`, `role="alert"`).
- [ ] **Form-level error** — `<FormError>` handles role/aria-live automatically by severity. Do not wrap `FormError` in another alert.
- [ ] **Focus management on form-submit error** — consuming form moves focus to either (a) the `<FormError>` banner or (b) the first invalid field. Both are correct; choose the one that best fits the form's flow. `FormField` itself does NOT move focus — it's a leaf component, and form-level focus is the container's job. AuthModal (Spec 1.9) is the canonical first consumer.
- [ ] **`prefers-reduced-motion`** — global safety net in `frontend/src/styles/animations.css` disables animations when the OS flag is on. Shimmer and spinner fall back to static opacity-60 via `motion-safe:animate-spin` / `motion-safe:animate-shimmer` + `motion-reduce:opacity-60`. See "Reduced-Motion Safety Net" section above.
- [ ] **WCAG AA contrast** — all severity accent colors meet 4.5:1 for normal text (`text-red-100` on `bg-red-950/30` passes on `bg-hero-bg`). Severity palette uses muted tonal colors — NEVER pure `bg-red-500` or `#FF0000`.
- [ ] **Touch targets** — 44×44 px minimum for dismiss buttons and action buttons.

### Anti-Pressure Checklist references

Every new and modified string in this subsystem must pass the 6-point Anti-Pressure Copy Checklist (master plan Universal Rule 12 + Spec 1.9b):

- [ ] **No comparison** — no "unlike other users", "you're behind", "X people already did this".
- [ ] **No urgency** — no "NOW", "today only", "hurry", "before it's too late".
- [ ] **No exclamation points near vulnerability** — "Something went wrong." (period), not "Something went wrong!".
- [ ] **No therapy-app jargon** — no "take a breath", "center yourself", "be kind to yourself" in error/loading copy.
- [ ] **No streak-as-shame or missed-X framing** — any copy about absence of activity is warm or neutral, never shaming.
- [ ] **No false scarcity** — no "limited time", "only N left".

Plus: **blameless framing**, **empty ≠ zero ≠ loading**, **sentence case + complete sentences + period terminators**.

### Severity color system

FormError and similar error-display components use a muted tonal palette — never emergency-red. Worship Room vulnerability content would feel assaulted by a pure `#FF0000`.

| Severity | Border | Background | Text | Icon |
|---|---|---|---|---|
| `error` | `border-red-400/30` | `bg-red-950/30` | `text-red-100` | `AlertCircle` (lucide-react) |
| `warning` | `border-amber-400/30` | `bg-amber-950/30` | `text-amber-100` | `AlertTriangle` |
| `info` | `border-sky-400/30` | `bg-sky-950/30` | `text-sky-100` | `Info` |

### Cross-spec guidance and deferred primitives

- **Feature-specific empty/error/loading copy** (e.g., "No prayers yet" on Prayer Wall) lives in the consuming spec's Copy Deck, not in this rule file. This section teaches patterns and provides anchor examples.
- **Crisis-adjacent features** (Prayer Wall, Journal, Meditate) need extra copy review per Universal Rule 13. The general pattern is here; crisis-specific strings live in per-feature specs and `01-ai-safety.md`.
- **`PageError.tsx` is deferred.** The first Phase 3 migration spec that needs a page-level async-data-fetch error (likely the Prayer Wall feed backend migration) creates it in `ui/` following the conventions above.
- **`InlineError.tsx` is intentionally NOT created.** 28 ad-hoc inline-error call sites exist in the app, but most fit `<FormField>` or a simple `<p role="alert">` already. Creating a redundant primitive would add a layer without clarity. When migrating those sites in future specs, default to `FormField` for form contexts or inline `<p role="alert">` for non-form text.
- **Hardcoded ms values** in `ScrollRow` (300), `TooltipCallout` (300/200/8000), `UnsavedChangesModal` (150), `WhisperToast` (300/100) are Rule 10 technical debt. Not migrated in this spec per "Design tokens only — no new tokens." Follow-up spec tracks.
- **`Card.tsx` is deprecated** (light-theme `bg-white`, pre-Round-3). Zero documented call sites. Do not use in new components. Removed in a future dedicated cleanup spec.

---

## Known Issues

- **Footer touch targets**: Crisis resource links and App Store badges (40px) undersized on mobile (44px minimum). Pre-existing.
- **Spotify embed loading**: May show fallback in headless/restricted environments.
- **Audio cluster (BB-26, BB-27, BB-28, BB-29)**: SHIPPED on `audio-wave-bb-26-29-44` branch. BB-26 ships the foundation (FCBH DBP v4 client, lazy-loaded Howler engine, bottom-sheet player, Media Session, supersession, FCBH attribution). BB-29 ships continuous playback / auto-advance. BB-28 ships the sleep timer with 8 presets and 20-second exponential fade-out. BB-27 ships pause-coordination (Bible audio plays → ambient pauses; Bible stops → ambient resumes). BB-44 (read-along verse highlighting) is the final spec in the wave, in progress. **Critical engineering note:** BB-26's `crossOrigin='anonymous'` assignment on Howler's internal `<audio>` element in `lib/audio/engine.ts` is load-bearing for any future Web Audio work (BB-27's pause coordination doesn't use it, but a future ducking spec would). The line has a DO-NOT-REMOVE comment and a unit test guard. A BB-37c integrity audit covering the full audio wave is recommended after BB-44 ships and the wave merges to main.
