# Register Page Redesign — Feature Showcase

**Master Plan Reference:** N/A — standalone polish spec (follows the Round 3 / Local Support facelift visual standard)
**Branch:** `claude/feature/register-page-redesign` (cut from main AFTER Local Support polish merges)
**File under redesign:** `frontend/src/pages/RegisterPage.tsx`
**Route:** `/register`
**Related routes (reference only, not redesigned here):** `/` (home), `/login`

---

## User Story

As a logged-out visitor arriving at `/register`, I want to understand the full scope of what Worship Room offers — not a 4-feature teaser — so that I can make an informed decision to create a free account before clicking the CTA.

---

## Auth Gating

This is a logged-out marketing page. No content is gated behind auth; every interactive element either routes to the auth modal or to another public page.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Hero "Create Your Free Account" CTA | Opens `AuthModal` in `register` mode via `useAuthModal()` | Same (page is public; logged-in users can still visit) | Existing modal copy (not redefined here) |
| Hero "Log in" link | Opens `AuthModal` in `login` mode | Same | Existing modal copy |
| Final "Create Your Free Account" CTA | Opens `AuthModal` in `register` mode | Same | Existing modal copy |
| Navbar links | Navigate to public pages as normal | Same | N/A |
| Footer links | Navigate to public pages as normal | Same | N/A |

**No new auth gates introduced.** This spec does not modify the auth flow or auth modal internals.

---

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | All sections single-column. Pillar grid stacks (1 col). Spotlight grid stacks (1 col). StatsBar grid is 2 cols × 4 rows. Hero H1 at `text-4xl`. Section padding `py-16`. |
| Tablet (640–1024px) | Pillar grid is 2 cols (5 items → 2+2+1). Spotlight grid is 3 cols on `md:` (spec §6 uses `md:grid-cols-3`). StatsBar is 4 cols × 2 rows. Hero H1 at `sm:text-5xl`. Section padding `sm:py-24`. |
| Desktop (> 1024px) | Pillar grid is 3 cols (5 items → 3+2). Spotlight grid is 3 cols. StatsBar is 4 cols × 2 rows. Hero H1 at `lg:text-6xl`. Container `max-w-6xl`. |

**No horizontal scroll at any width from 320px up** (per §acceptance #17). Touch targets ≥ 44px on all CTAs (white-pill spec enforces `min-h-[44px]`).

---

## AI Safety Considerations

N/A — This feature is a static marketing page with no AI-generated content, no user free-text input, and no crisis-detection surface. All copy is hardcoded. Crisis resources live on their own surfaces (Daily Hub, Prayer Wall) and are not duplicated here.

---

## Auth & Persistence

- **Logged-out users:** Zero persistence. No localStorage writes, no cookies, no tracking pixels added by this spec. Page is purely read-only marketing content.
- **Logged-in users:** No persistence (page does not read or write user state; if a logged-in user lands here, they see the same marketing content).
- **localStorage usage:** None.
- **Database tables touched:** None.

---

## Why this spec exists

The current `/register` page undersells six months of solo-dev work. It lists 4 features out of 82 shipped, uses the old `bg-gradient-to-b from-hero-dark to-hero-mid` hero instead of the `<GlowBackground>` pattern every other redesigned page now uses, puts dark-purple `text-primary` on small text (same readability issue we fixed on Local Support), and uses `bg-primary text-white` CTAs instead of the white-pill treatment standardized across Grow/Music/Local Support.

This spec transforms `/register` into an honest feature showcase — a page a visitor can scroll top-to-bottom and think "this is way more than I expected" before they click Create Account.

---

## Canonical visual vocabulary (must match other redesigned pages)

- **Hero background:** `<GlowBackground variant="center">` wrapping the hero. Three soft purple orbs with `animate-glow-float`, `motion-reduce:animate-none`. Import from `@/components/homepage/GlowBackground`.
- **Page background below hero:** `bg-hero-bg` (matches home). Do NOT use `bg-dashboard-dark` — that's for authenticated pages.
- **Hero H1:** `text-4xl sm:text-5xl lg:text-6xl` (matches Music hero after Round 2). Use `GRADIENT_TEXT_STYLE` from `@/constants/gradients` (white → violet gradient clip).
- **Section headings:** `text-3xl sm:text-4xl lg:text-5xl` centered, title-case, gradient-clipped. Reuse `<SectionHeading>` from `@/components/homepage/SectionHeading` OR apply `GRADIENT_TEXT_STYLE` inline — CC's call based on what SectionHeading's API supports.
- **Primary CTA (white pill) — must match Local Support:**
  ```
  inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50
  ```
  Exception for the two big hero/final CTAs: bump padding to `px-8 py-4`, text to `text-lg font-semibold`, keep white pill + white glow halo.
- **Secondary "Log in" link under hero CTA:** `text-white underline hover:text-white/80` — NOT `text-primary`.
- **Check icons in differentiator list:** `text-white` NOT `text-primary` (same readability fix we applied to Local Support CTAs).
- **Body copy color:** `text-white` for emphasis, `text-white/80` for paragraphs, `text-white/60` for tertiary captions. NEVER `text-white/50` or lower — fails WCAG AA on this background.
- **Cards:** Use `<FrostedCard>` from `@/components/homepage/FrostedCard` where glass look is wanted. Otherwise `rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm` (matches current Register feature cards, keep as-is — just make sure contents inside use correct colors).
- **Scroll reveal:** Use `useScrollReveal` hook from `@/hooks/useScrollReveal` with `staggerDelay(index)`. Matches StatsBar pattern. DO NOT reuse the current page's `useInView` — `useScrollReveal` is the newer pattern and is what the home page uses.

---

## Page structure (top to bottom)

The page is a long-scroll marketing showcase with ten sections. Every section sits on `bg-hero-bg` and uses standard `max-w-6xl mx-auto px-4 sm:px-6` container unless noted otherwise. Section vertical padding: `py-16 sm:py-24` (matches Home section rhythm).

### 1. Hero

**Component:** New inline component in `RegisterPage.tsx`, NOT a new file.

**Structure:**
- `<GlowBackground variant="center">` wrapping everything
- Navbar (transparent)
- Content container: `max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20 sm:pt-40 sm:pb-28 text-center`
- H1: "Your sanctuary is ready." — `text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight pb-2` with `GRADIENT_TEXT_STYLE`
- Subtitle (NEW copy — replaces current): "A free, peaceful space for prayer, Scripture, community, and rest. Eighty-two features. Zero ads. No credit card." — `mt-4 max-w-2xl mx-auto text-lg sm:text-xl text-white/80`
- Primary CTA: white pill, "Create Your Free Account" — `mt-8`. OnClick: `authModal?.openAuthModal(undefined, 'register')`
- Secondary line below: "Already have an account? **Log in**" — `mt-4 text-sm text-white/60`. "Log in" is a button inside the <p> with `text-white underline hover:text-white/80`. OnClick: `authModal?.openAuthModal(undefined, 'login')`
- Scroll reveal: hero fades/translates up on mount (use `useScrollReveal` with `threshold: 0.1`, apply `is-visible` class when in view)

**Acceptance:**
- H1 gradient matches other redesigned page heroes (white → violet, 223deg)
- H1 is exactly `text-4xl sm:text-5xl lg:text-6xl`
- Subtitle is `text-white/80` (NOT `text-white/70` or `text-white/50`)
- "Log in" link is white underlined (NOT purple)
- CTA renders white pill (NOT `bg-primary`)
- GlowBackground variant="center" orbs visible behind hero

### 2. Hook / Promise (new section — doesn't exist today)

**Purpose:** Before listing features, anchor WHY this app exists. Emotional hook that makes a visitor want to keep scrolling.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Centered content `max-w-3xl mx-auto px-4 sm:px-6 text-center`
- Small eyebrow label: "Why we built this" — `text-sm uppercase tracking-widest text-white/60 mb-4`
- Main headline (gradient): "Faith tools that meet you where you are." — `text-3xl sm:text-4xl lg:text-5xl font-bold` with `GRADIENT_TEXT_STYLE`
- Supporting paragraph (text-white/80, max-w-2xl, text-base sm:text-lg):

  "Most Bible apps gate premium content, push notifications you didn't ask for, and punish you for missing a day. Worship Room is different. The entire Bible is free to read without an account. Streaks come with grace-based repairs — miss a day, get one back. Your prayers stay private. No ads will ever appear in your worship time. This is a room built for quiet, not performance."

- Scroll reveal: fade-up on enter-viewport

**Acceptance:**
- No purple `text-primary` anywhere in paragraph text
- Heading uses gradient style matching other sections
- Paragraph is `text-white/80`

### 3. Stats Bar (reuse existing `<StatsBar>` component)

**Structure:**
- Import `<StatsBar />` from `@/components/homepage/StatsBar` and drop it in as-is. It's already wrapped in GlowBackground, has animated counters, and matches the home page. Zero new code.
- However: UPDATE `StatsBar.tsx` STATS array to include two more stats so the register showcase is richer. Currently it shows 6 stats (Devotionals, Reading Plans, Ambient Sounds, Meditation Types, Seasonal Challenges, Worship Playlists). Add:
  - `{ value: 66, label: 'Bible Books' }` — before Devotionals
  - `{ value: 12, label: 'Bedtime Stories' }` — after Worship Playlists
  - Grid changes from `lg:grid-cols-6` to `lg:grid-cols-4` (8 items across 2 rows on desktop, 2 rows on tablet, 4 rows on mobile)
- Update the home page consumer if the StatsBar visual changes matter there (it's the same component). If it looks worse on home, flag it and I'll decide.

**Acceptance:**
- Register page shows 8 stats, all with animated counters on scroll reveal
- Counts match the audit exactly (66 / 50 / 10 / 24 / 6 / 5 / 8 / 12)
- No layout regression on home page

### 4. Five Pillars Feature Grid (new section — replaces current 4-feature grid)

**Purpose:** The main feature showcase. Groups 82 features into 5 scannable pillars. User can quickly read pillar headings, then scan 3-5 featured items per pillar, then scroll on. Anyone curious clicks through. Anyone skimming gets the breadth.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Container `max-w-6xl mx-auto px-4 sm:px-6`
- Section heading (gradient, centered, `mb-4`): "Everything included. Free forever."
- Subtitle under heading (`text-white/60 max-w-2xl mx-auto mb-12 text-center text-base sm:text-lg`): "Eighty-two shipped features across five pillars. No paywalls. No premium tier. No upsells inside the app."
- Grid of 5 pillar cards in a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` (5 items → 3+2 on desktop, 2+2+1 on tablet, stack on mobile)
- Each pillar card: `<FrostedCard>` (reuse existing component) containing:
  - Pillar icon (Lucide icon, size 32, color `text-white` — NO purple)
  - Pillar name: `text-xl font-semibold text-white mb-2`
  - Pillar tagline: `text-sm text-white/80 mb-4 leading-relaxed`
  - Feature bullet list: `space-y-1.5 text-sm text-white/80`. Each bullet: a `<Check>` icon (size 16, `text-white`, `mt-0.5 flex-shrink-0`) + the feature name
  - Show 5 features max per pillar (curated, not exhaustive — full list is the pillars)

**The five pillars and their featured items:**

**Pillar 1 — PRAY** (Lucide icon: `HandHeart` or `Hands`)
- Tagline: "Personal prayer, guided sessions, and a quiet place to bring everything you're carrying."
- Features:
  - Personalized prayer generation (Pray tab on Daily Hub)
  - 8 guided prayer sessions (5-15 minutes each)
  - Your personal prayer list with answered tracking
  - Prayer Wall community (9 categories, anonymous option)
  - Crisis support detection with hotline resources

**Pillar 2 — READ** (Lucide icon: `BookOpen` or `ScrollText`)
- Tagline: "The full Bible, never gated — with AI explainers, search, memorization, and visual progress."
- Features:
  - Full 66-book WEB Bible (free, no account needed)
  - AI Explain This Passage (powered by Gemini)
  - Full audio Bible with sleep timer and continuous playback
  - Verse memorization deck (no quizzes, no scoring)
  - Reading heatmap + progress map across all 66 books

**Pillar 3 — GROW** (Lucide icon: `Sprout` or `TrendingUp`)
- Tagline: "Habits that honor presence over perfection. Miss a day — keep your streak."
- Features:
  - 10 reading plans (119 days of content)
  - 5 seasonal community challenges (110 days total)
  - Grace-based streaks with 1 free repair per week
  - Visual Growth Garden that blooms as you grow
  - 45+ badges across 6 achievement categories

**Pillar 4 — REST** (Lucide icon: `Moon` or `CloudMoon`)
- Tagline: "Sleep better. Meditate on Scripture. Build your own ambient mix."
- Features:
  - 24 ambient sounds + 11 scene presets (crossfade mixing)
  - 12 bedtime stories rooted in Scripture
  - 24 scripture readings for rest and sleep
  - 6 meditation practices (Breathing, Soaking, Examen, more)
  - Sleep timer with smooth 20-second fade-out

**Pillar 5 — BELONG** (Lucide icon: `Users` or `Heart`)
- Tagline: "Community without noise. Friends, gentle nudges, and local support when you need it."
- Features:
  - Prayer Wall feed with question of the day
  - Friends with gentle nudges (1/week max)
  - Friends + global faith points leaderboard
  - Local church, counselor, and Celebrate Recovery finders (real Google data)
  - Public growth profiles (engagement, never mood data)

**Acceptance:**
- Exactly 5 pillar cards
- Exactly 5 feature bullets per card (consistent)
- All icons `text-white` — no `text-primary`
- All paragraph/bullet text ≥ `text-white/80`
- Grid responsive: 1/2/3 columns at sm/md/lg
- `useScrollReveal` per-card with staggered delay (50ms per index)
- Each `<FrostedCard>` has hover lift: `hover:translate-y-[-2px]` or `hover:bg-white/[0.07]` — match existing FrostedCard behavior, don't invent new

### 5. Dashboard Preview (reuse existing `<DashboardPreview>` component if possible)

**Purpose:** A visitor reads 5 pillars of text. Now show them what the app actually looks like when they're in it. One focal visual = huge impact, low cost.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Section heading (gradient, centered, `mb-4`): "Your daily rhythm, in one place."
- Subtitle (`text-white/60 max-w-2xl mx-auto mb-12 text-center`): "Mood check-in, devotional, streak, faith points, growth garden — every morning, at a glance."
- Import `<DashboardPreview />` from `@/components/homepage/DashboardPreview`. Drop it in as-is.
- If DashboardPreview is too tall, too narrow, or looks odd in the register layout, flag it. Don't edit it — that component serves the home page too and we don't want cascade bugs.

**Acceptance:**
- DashboardPreview renders at least one frame
- Section heading uses gradient style
- Subtitle is `text-white/60`

### 6. Marketing-Gold Spotlight Section (new — THE differentiator showcase)

**Purpose:** Three features that make Worship Room genuinely different from every other Bible/faith app. Each gets a larger card with a richer description. This is the "oh that's actually new" moment in the page scroll.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Section heading (gradient, centered, `mb-4`): "Small details you won't find anywhere else."
- Subtitle (`text-white/60 max-w-2xl mx-auto mb-12 text-center`): "The things we cared about that no one else seems to."
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-6`
- Each of 3 spotlight cards: `<FrostedCard>` with richer content:
  - Feature name as h3: `text-xl font-semibold text-white mb-3`
  - Description: `text-white/80 text-sm leading-relaxed mb-4`
  - Small proof label: `text-xs uppercase tracking-wide text-white/60`

**The three spotlights:**

**Spotlight 1 — Verse Echoes**
- Description: "Thirty days after you highlight a verse, the app gently reminds you. Six months later, still there. Worship Room remembers your journey and brings it back when it matters — not when an algorithm wants engagement."
- Proof label: "Powered by your own reading history"

**Spotlight 2 — Grace-Based Streaks**
- Description: "Every other app punishes you for missing a day. This one gives you a free repair each week. Because the goal isn't the streak — it's the presence. Miss a day, pick it back up, no shame."
- Proof label: "1 free repair per week, always"

**Spotlight 3 — Midnight Verse**
- Description: "Open the app between 11 PM and 1 AM and a special verse meets you there. Quiet, thoughtful, never pushy. For the nights when sleep won't come and you need something to hold on to."
- Proof label: "Shows once per late-night visit"

**Acceptance:**
- Exactly 3 spotlight cards
- No `text-primary` anywhere
- Headings use `text-white`, not gradient (reserve gradient for section-level)
- Cards hover-lift matching FrostedCard default

### 7. Differentiator Checklist (refactor existing — fix colors, expand items)

**Purpose:** Concrete, scannable "why us vs them" list. Currently exists, needs color fix and 4 more items.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Section heading (gradient, centered, `mb-12`): "Worship Room is different."
- Container `max-w-2xl mx-auto`
- List of 8 items (was 4). Each row: `<Check>` icon (size 20, `text-white mt-0.5 flex-shrink-0`) + text paragraph (`text-white/80`).

**The eight items (update `DIFFERENTIATORS` constant):**
1. Free forever — no subscriptions, no trial periods, no "premium" tier.
2. No ads. Your worship time is sacred, not monetizable.
3. No data harvesting. Your prayers and journal entries stay private.
4. Grace-based streaks that celebrate presence, never punish absence.
5. The entire Bible is free to read — no account required.
6. Crisis keyword detection with real hotline resources when you need them.
7. Works offline as an installable app (iOS, Android, desktop).
8. Real accessibility — WCAG 2.2 AA audited, not an afterthought.

**Acceptance:**
- 8 items (was 4)
- Check icons `text-white` (was `text-primary`)
- Paragraph text `text-white/80` (was `text-white/80` — already correct, verify)
- `useScrollReveal` on each row with staggered delay

### 8. Content Depth Callout (new section — small, text-only)

**Purpose:** Short breather before final CTA that says the quiet part: this took six months.

**Structure:**
- Section wrapper `py-16 sm:py-24`
- Container `max-w-3xl mx-auto px-4 sm:px-6 text-center`
- Small eyebrow label: "Built by one person" — `text-sm uppercase tracking-widest text-white/60 mb-4`
- Headline (gradient): "Six months of nights and weekends." — `text-3xl sm:text-4xl lg:text-5xl font-bold` with `GRADIENT_TEXT_STYLE`
- Paragraph (`text-white/80 text-base sm:text-lg`):

  "Worship Room was built by one developer, after hours, because the tools for faith deserved better. No VC funding. No growth team. No dark patterns. Just someone who wanted a space for prayer and Scripture that felt more like a sanctuary than an app. That's what you're signing up for."

- No CTA here — keep the section quiet.

**Acceptance:**
- Heading uses gradient style
- Paragraph is `text-white/80`, not `text-white/60`

### 9. Final CTA (refactor existing — match canonical white pill)

**Structure:**
- Section wrapper `py-16 text-center sm:py-24`
- Heading (NOT gradient — plain white): "Ready to step inside?" — `text-3xl sm:text-4xl font-bold text-white`
- Primary CTA — white pill, "Create Your Free Account", `mt-8`. Same onClick as hero CTA.
- Bottom reassurance: "No credit card. No trial period. Just peace." — `mt-4 text-sm text-white/60`
- `useScrollReveal` fade-up

**Acceptance:**
- CTA is white pill (NOT `bg-primary`)
- Reassurance line uses `text-white/60` (already correct)

### 10. Footer (unchanged — keeps existing `<SiteFooter />`)

---

## Component reuse (don't reinvent)

| Need | Existing component | File path |
|---|---|---|
| Glow orb background | `<GlowBackground variant="center">` | `@/components/homepage/GlowBackground` |
| Frosted glass card | `<FrostedCard>` | `@/components/homepage/FrostedCard` |
| Animated content-count stats | `<StatsBar>` | `@/components/homepage/StatsBar` |
| Dashboard screenshot frame | `<DashboardPreview>` | `@/components/homepage/DashboardPreview` |
| Gradient heading style | `GRADIENT_TEXT_STYLE` | `@/constants/gradients` |
| Scroll reveal | `useScrollReveal` + `staggerDelay` | `@/hooks/useScrollReveal` |
| Auth modal open | `useAuthModal()` | `@/components/prayer-wall/AuthModalProvider` |
| SEO metadata | `<SEO>` | `@/components/SEO` (keep existing `REGISTER_METADATA`) |
| Navbar | `<Navbar />` | `@/components/Navbar` |
| Site footer | `<SiteFooter />` | `@/components/SiteFooter` |

**Do NOT import `<JourneySection>` or `<StartingPointQuiz>` — those stay on home only. Register should not duplicate them.**

**Do NOT use `useInView` hook (the current Register page uses it). Replace with `useScrollReveal` for consistency with home and redesigned pages.**

---

## Explicit non-goals

1. **Not a full home-page clone.** Register has its own structure. Overlap with home should be through shared components only (StatsBar, DashboardPreview, FrostedCard, GlowBackground). Copy and section order are register-specific.
2. **Not changing auth modal behavior.** Clicking CTAs opens the existing auth modal via `useAuthModal()`. Do not rewire the auth flow.
3. **Not changing routing or SEO.** `REGISTER_METADATA` stays as-is. Route stays `/register`.
4. **Not adding new images or illustrations.** Every visual is CSS/SVG from existing components. No new asset files.
5. **Not changing the Login page or AuthModal internals.** Out of scope.
6. **Not updating the home page**, EXCEPT for the StatsBar change (8 stats instead of 6). If that change looks worse on home, back it out there and inline a separate stats array on Register.

---

## Files that will change

| File | Change type |
|---|---|
| `frontend/src/pages/RegisterPage.tsx` | Major rewrite (entire page) |
| `frontend/src/components/homepage/StatsBar.tsx` | Minor: STATS array + grid columns |
| `frontend/src/pages/__tests__/RegisterPage.test.tsx` (if exists) | Update assertions to match new copy + structure |
| `frontend/src/components/homepage/__tests__/StatsBar.test.tsx` (if exists) | Update count assertions (6 → 8 stats) |

**No new files.** Everything is inline in `RegisterPage.tsx` or reuses existing components.

---

## Testing plan

1. **Unit tests (vitest):**
   - RegisterPage renders the H1 "Your sanctuary is ready."
   - RegisterPage renders all 5 pillar headings
   - RegisterPage renders 3 spotlight cards
   - RegisterPage renders 8 differentiator items
   - Both hero CTA and final CTA open the auth modal in 'register' mode when clicked
   - "Log in" button opens the auth modal in 'login' mode
   - StatsBar renders 8 stat cards with correct values
   - No element has class `text-primary` other than the inside of white-pill buttons (where it's correct)
2. **Manual QA (local dev):**
   - Hard-reload `/register`
   - Scroll top to bottom — no color-contrast issues, no content wrap issues at any breakpoint
   - At 375px: pillars stack vertically, spotlight stacks vertically, CTAs fit single-column
   - At 768px: 2-column pillars + 2-column spotlight
   - At 1440px: 3+2 pillars, 3-column spotlight, 4+4 stats
   - All CTAs visually match Local Support's white-pill treatment
   - All Check icons render white, not purple
   - GlowBackground orbs visible behind hero on load, animate gently
3. **Accessibility checks:**
   - Run browser axe extension on `/register`, expect 0 critical issues
   - Keyboard-tab through entire page — all CTAs and "Log in" reachable, focus ring visible
   - Screen reader reads H1, each pillar heading, each spotlight heading in order
4. **Lighthouse:**
   - Performance score ≥ 85 (current page is likely lower — new StatsBar animations might cost a few points but shouldn't drop below 85)
   - Accessibility score ≥ 95

---

## Acceptance criteria (rollup)

A reviewer should be able to open `/register` and verify, top to bottom:

1. Hero has GlowBackground orbs floating in the background
2. H1 is the canonical white→violet gradient, `text-4xl sm:text-5xl lg:text-6xl`
3. Hero subtitle mentions "Eighty-two features. Zero ads. No credit card."
4. Hero CTA is white pill with purple text
5. "Log in" link is white underlined, not purple
6. Below hero, "Why we built this" section with gradient heading
7. StatsBar with 8 animated counters
8. 5 pillar cards with feature bullet lists, all white text, white check icons
9. DashboardPreview renders
10. 3 spotlight cards (Verse Echoes / Grace-Based Streaks / Midnight Verse)
11. Differentiator checklist with 8 items, white check icons
12. "Six months of nights and weekends" callout section
13. Final CTA section with white-pill CTA
14. Footer unchanged
15. No `text-primary` on body text, links, or icons
16. No `bg-primary` on any CTA or button
17. No horizontal scroll at any breakpoint from 320px up
18. No console errors / warnings / network failures on load

---

## Out of scope (file follow-up specs if needed)

- Animating the gradient (e.g., slow hue rotation) — deferred, not part of this spec
- Adding illustrations or stock photography — deferred
- A/B testing CTAs — deferred, ship one version
- Changing auth modal copy ("Create Your Free Account" vs other variants inside the modal) — deferred
- Adding testimonials (you don't have any users yet, would feel fake)
- Localization / i18n — deferred
- Dark/light mode toggle — deferred (app is dark-only per audit)
