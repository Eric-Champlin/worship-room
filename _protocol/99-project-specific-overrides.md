# Project-Specific Overrides — Worship Room

**Protocol:** Repository-Wide Deep Review v1.0
**Purpose:** Worship Room specific values that override or supplement the generic prompts in this protocol.

---

## Why this file exists

The five prompts in this protocol are written to be reusable across React/TypeScript projects. Anything that's specific to Worship Room — file paths, key names, route names, conventions — lives here so the generic prompts stay clean and the project-specific knowledge is in one place.

When running any prompt, read the relevant section of this file alongside the prompt. Apply project-specific values where the generic prompt references them by purpose.

---

## Project shape

- **Framework:** React 18 with TypeScript
- **Build tool:** Vite
- **Package manager:** pnpm
- **Routing:** React Router
- **Styling:** Tailwind CSS with custom theme tokens
- **Testing:** Vitest + Testing Library + Playwright
- **State management:** React state, custom hooks, localStorage-backed stores
- **Backend:** Spring Boot + PostgreSQL (Phase 3, not yet built — current Bible wave is frontend-only)
- **Auth:** Firebase Auth (planned), localStorage simulation in development

---

## File structure conventions

- **Components:** `frontend/src/components/{feature}/ComponentName.tsx`
- **Pages:** `frontend/src/pages/{feature}/PageName.tsx`
- **Hooks:** `frontend/src/hooks/{feature}/useThing.ts` (when feature-specific) or `frontend/src/hooks/useThing.ts` (when global)
- **Lib:** `frontend/src/lib/{feature}/thing.ts` for utility modules
- **Stores (Bible):** `frontend/src/lib/bible/thingStore.ts` for reactive stores
- **Services (older Daily Hub features):** `frontend/src/services/thing-storage.ts` for plain CRUD services
- **Types:** `frontend/src/types/thing.ts` for shared type definitions
- **Tests:** Co-located with source as `Thing.test.tsx` OR in `__tests__/` parallel directory (the codebase mixes both — Prompt 4 should flag this)

---

## Path alias

The project uses `@/` as the path alias for `frontend/src/`. Imports should use `@/components/...` rather than relative paths beyond one directory level.

---

## Storage key conventions

The codebase has multiple storage key prefix conventions, which is documented in Prompt 4 as a known drift:

- **`wr_*`** — older keys, used by Daily Hub features and the prayer/meditation services
- **`bible:*`** — newer keys, used by the Bible wave reactive stores
- **`dailyHub:*`** — used by some Daily Hub features

The full registry of keys is documented at `.claude/rules/11-localstorage-keys.md`. Any key not in that registry is undocumented and should be flagged.

Specific known keys (used by the Bible wave):

- `wr_bible_highlights` — highlights store
- `bible:bookmarks` — bookmarks store
- `bible:notes` — notes store
- `bible:journalEntries` — journal entries store
- `wr_prayer_list` — prayer service (CRUD, not reactive)
- `wr_meditation_history` — meditation service (CRUD, not reactive)
- `bible:lastRead` — last-read chapter
- `bible:lastReadByBook` — last-read chapter per book
- `bible:readChapters` — read chapters per book
- `bible:streak` — reading streak
- `bible:readerSettings` — reader theme/typography settings
- `bible:focusMode` — focus mode preferences
- `bible:drawerStack` — drawer view stack persistence

This list should be kept in sync with the actual key registry file.

---

## Authentication simulation keys

For Prompt 5 (Visual Verification), the logged-in browser context is configured by setting:

- `wr_auth_simulated` → `"true"`
- `wr_user_name` → a test username (e.g., `"TestUser"`)
- `wr_onboarding_complete` → `"true"`
- `wr_getting_started_complete` → `"true"`

And clearing any `wr_seasonal_banner_dismissed_*` keys so banners are visible.

---

## Key feature areas and routes

For Prompt 5 page inventory, the major routes to test:

### Public / always-accessible

- `/` — Landing page
- `/daily` — Daily Hub
- `/daily?tab=devotional` — Daily Hub Devotional tab
- `/daily?tab=pray` — Daily Hub Pray tab
- `/daily?tab=journal` — Daily Hub Journal tab
- `/daily?tab=meditate` — Daily Hub Meditate tab
- `/bible` — Bible landing
- `/bible/my` — My Bible (personal layer dashboard)
- `/bible/[book]/[chapter]` — Bible reader (test with `/bible/john/3`, `/bible/psalms/23`, `/bible/genesis/1`, `/bible/revelation/22`, `/bible/songofsolomon/8`)
- `/grow` — Grow landing
- `/grow?tab=challenges` — Grow Challenges tab
- `/prayer-wall` — Prayer Wall
- `/music` — Music landing
- `/music?tab=ambient` — Music Ambient tab
- `/music?tab=sleep` — Music Sleep tab
- `/ask` — Ask AI
- `/local-support/churches` — Churches finder
- `/local-support/counselors` — Counselors finder
- `/local-support/celebrate-recovery` — Celebrate Recovery finder
- `/reading-plans/[slug]` — Reading plan detail
- `/challenges/[slug]` — Challenge detail
- `/nonexistent-page` — 404 fallback

### Logged-in only

- `/` — Dashboard (different rendering when authenticated)
- `/prayer-wall/dashboard` — Prayer wall personal dashboard
- `/settings` — Settings page
- `/friends` — Friends list
- `/my-prayers` — Personal prayers
- `/insights` — Mood insights
- `/insights/monthly` — Monthly report
- `/profile/[id]` — Growth profile
- `/meditate/breathing` — Meditation: breathing
- `/meditate/soaking` — Meditation: scripture soaking
- `/meditate/gratitude` — Meditation: gratitude
- `/meditate/acts` — Meditation: ACTS prayer
- `/meditate/psalms` — Meditation: psalms
- `/meditate/examen` — Meditation: examen
- `/music/routines` — Music routines

This list will change as new features ship. Update it when running the protocol.

---

## Theme conventions

The project uses a dark cinematic theme system established in the homepage redesign and extended into the Bible wave.

- **Background tokens:** `bg-dashboard-dark`, gradients defined in the design system
- **Text tokens:** `text-foreground`, `text-foreground/80`, `text-foreground/60` (anything below 60% is a contrast risk)
- **Card tokens:** `FrostedCard` component with glass-effect background
- **Heading pattern:** `SectionHeading` component with the 2-line treatment
- **Glow orbs:** `BibleLandingOrbs` and similar components, opacity range 0.25–0.50

Light-theme classes (`bg-white`, `bg-gray-`, `text-gray-`, etc.) should be flagged as theme violations except where explicitly intentional.

Specific exceptions where light themes are acceptable:

- The starting point quiz (may have a light variant)
- Print stylesheets if they exist

---

## Test conventions

- **Test runner:** Vitest
- **Testing library:** `@testing-library/react`
- **Mocking library:** Vitest's built-in `vi.mock`
- **Playwright location:** `frontend/playwright/` for end-to-end tests
- **Coverage tool:** Vitest's built-in coverage with v8

The codebase mixes co-located tests (`Foo.test.tsx` next to `Foo.tsx`) with parallel `__tests__/` directories. This should be flagged in Prompt 4.

---

## Critical paths that must always have test coverage

For Prompt 2's coverage gap analysis, these paths are P1 if they lack tests regardless of recency:

- Auth flows (login, signup, logout, session restoration)
- Storage layer for all six personal-layer types: highlights, bookmarks, notes, journals, prayers, meditations
- Routing and protected route guards
- Error boundaries (route-level and component-level)
- Bible reader verse-tap action sheet (BB-6 architecture)
- Daily Hub bridge URL handling
- My Bible activity feed loader
- Bible export and import flow

---

## Spec wave history

The protocol's "comparison to previous run" sections should reference the wave history when explaining changes. Major waves and their date ranges:

- **Homepage wave** (early 2026) — landing page redesign with cinematic dark theme
- **Daily Hub Round 2** (March 2026) — 4-tab redesign with ambient features
- **Daily Hub Round 3** (April 2026) — atmospheric polish
- **Bible wave** (April 2026, in progress) — full /bible feature redesign, BB-0 through BB-46

When Prompt 4 finds pattern divergence between Bible wave code and older Daily Hub code, the wave history is the explanation.

---

## Known intentional drift

These drift patterns are documented and intentional. Prompt 4 should still report them but with a "documented" flag rather than "violation":

- **Reactive store vs CRUD service split.** The Bible wave introduced reactive stores (`getAll*` + `subscribe`) for highlights, bookmarks, notes, journals. The older Daily Hub features use plain CRUD services for prayers and meditations. Unification is a future cleanup but not blocking.
- **Storage key prefix mixing.** `wr_*`, `bible:*`, and `dailyHub:*` all coexist. New code should use the prefix matching its feature area.
- **Test placement mixing.** Co-located and parallel `__tests__/` both exist. New tests should follow the local convention of the directory they're in.

---

## Contact and ownership

- **Project owner:** Eric Champlin
- **Repo:** `Eric-Champlin/worship-room`
- **Main branch:** `main`
- **Active feature branch (as of v1.0 of this protocol):** `bible-redesign`

---

## Changelog for this overrides file

### v1.0 — 2026-04-09
- Initial appendix file
- Documents file structure, key conventions, route inventory, theme conventions, test conventions, critical paths, wave history, known intentional drift
