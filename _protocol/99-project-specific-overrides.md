# Project-Specific Overrides — Worship Room
 
**Protocol:** Repository-Wide Deep Review v1.1
**Version:** 1.1
**Last updated:** 2026-04-13
**Purpose:** Worship Room specific values that override or supplement the generic prompts in this protocol.
 
---
 
## Why this file exists
 
The five prompts in this protocol are written to be reusable across React/TypeScript projects. Anything that's specific to Worship Room — file paths, key names, route names, conventions, wave history — lives here so the generic prompts stay clean and the project-specific knowledge is in one place.
 
When running any prompt, read the relevant section of this file alongside the prompt. Apply project-specific values where the generic prompt references them by purpose.
 
**This file is the forward-looking maintenance surface for the protocol.** When a new feature wave ships, update this file with the wave's keys, routes, patterns, and audit artifacts. The protocols themselves should rarely need updating — this file absorbs the project's evolution.
 
---
 
## Project shape
 
- **Framework:** React 18 with TypeScript
- **Build tool:** Vite
- **Package manager:** pnpm
- **Routing:** React Router
- **Styling:** Tailwind CSS with custom theme tokens
- **Testing:** Vitest + Testing Library + Playwright
- **State management:** React state, custom hooks, localStorage-backed reactive stores and CRUD services
- **PWA:** vite-plugin-pwa with Workbox precaching (BB-39)
- **Backend:** Spring Boot + PostgreSQL (Phase 3, not yet built — the current codebase is frontend-only)
- **Auth:** Firebase Auth (planned), localStorage simulation in development
 
---
 
## File structure conventions
 
- **Components:** `frontend/src/components/{feature}/ComponentName.tsx`
- **Pages:** `frontend/src/pages/{feature}/PageName.tsx`
- **Hooks:** `frontend/src/hooks/{feature}/useThing.ts` (when feature-specific) or `frontend/src/hooks/useThing.ts` (when global)
- **Lib:** `frontend/src/lib/{feature}/thing.ts` for utility modules
- **Stores (Bible wave):** `frontend/src/lib/bible/thingStore.ts` for reactive stores
- **Services (older Daily Hub features):** `frontend/src/services/thing-storage.ts` for plain CRUD services
- **Types:** `frontend/src/types/thing.ts` for shared type definitions
- **Tests:** Co-located with source as `Thing.test.tsx` OR in `__tests__/` parallel directory (the codebase mixes both — documented as known intentional drift)
- **Playwright tests:** `frontend/tests/integration/` for real-browser integration tests (BB-37 added this directory for the deferred BB-41 tests)
- **Constants:** `frontend/src/constants/thing.ts` (BB-33 added `animation.ts` here for the animation token system)
- **Accessibility primitives:** `frontend/src/lib/accessibility/` if this directory exists (BB-35 may have added it)
 
---
 
## Path alias
 
The project uses `@/` as the path alias for `frontend/src/`. Imports should use `@/components/...` rather than relative paths beyond one directory level.
 
---
 
## Storage key conventions
 
The codebase has multiple storage key prefix conventions, which is documented as known drift:
 
- **`wr_*`** — older keys, used by Daily Hub features, personal services, and wave-level user state
- **`bible:*`** — newer keys, used by the Bible wave reactive stores
- **`dailyHub:*`** — used by some Daily Hub features
 
The full registry of keys is documented at `.claude/rules/11-localstorage-keys.md`. Any key not in that registry is undocumented and should be flagged.
 
**Complete key list as of end of BB-37b (post-wave state):**
 
### Bible wave reactive stores
- `wr_bible_highlights` — highlights store (BB-7)
- `bible:bookmarks` — bookmarks store
- `bible:notes` — notes store
- `bible:journalEntries` — journal entries store
- `bible:lastRead` — last-read chapter
- `bible:lastReadByBook` — last-read chapter per book
- `bible:readChapters` — read chapters per book
- `bible:streak` — reading streak data (BB-17)
- `bible:readerSettings` — reader theme/typography settings
- `bible:focusMode` — focus mode preferences
- `bible:drawerStack` — drawer view stack persistence
 
### Older Daily Hub CRUD services
- `wr_prayer_list` — prayer service (CRUD, not reactive)
- `wr_meditation_history` — meditation service (CRUD, not reactive)
 
### Bible wave BB-33 through BB-46 additions
- `wr_first_run_completed` — first-run welcome dismissal state (BB-34)
- `wr_push_subscription` — push notification subscription (BB-41)
- `wr_notification_prefs` — notification preferences (BB-41)
- `wr_notification_prompt_dismissed` — notification prompt dismissal tracking (BB-41)
- `wr_chapters_visited` — chapter visit log for progress map and echo engine (BB-43)
- `wr_memorization_cards` — memorization deck cards (BB-45)
- `wr_echo_dismissals` — echo card dismissal state (BB-46) — verify exact name in code
 
### Other
- Any key matching `wr_seasonal_banner_dismissed_*` — seasonal banner dismissal tracking
 
**When running Prompt 1 Category G, cross-reference every localStorage call against this list. Any key not here is undocumented drift and should be flagged.**
 
**When adding a new key in a future spec, update this section AND `.claude/rules/11-localstorage-keys.md` in the same commit.**
 
---
 
## Authentication simulation keys
 
For Prompt 5 (Visual Verification), the logged-in browser context is configured by setting:
 
- `wr_auth_simulated` → `"true"`
- `wr_user_name` → a test username (e.g., `"TestUser"`)
- `wr_onboarding_complete` → `"true"`
- `wr_getting_started_complete` → `"true"`
- `wr_first_run_completed` → `"true"` (BB-34 — set this to suppress the first-run welcome on Dashboard/home unless you're specifically testing the welcome)
 
And clearing any `wr_seasonal_banner_dismissed_*` keys so banners are visible.
 
For testing the BB-34 first-run welcome specifically, create a third context that clears `wr_first_run_completed` and navigates to the home page or Dashboard to verify the welcome appears.
 
---
 
## Key feature areas and routes
 
For Prompt 5 page inventory, the major routes to test:
 
### Public / always-accessible
 
- `/` — Landing page (BB-34 first-run welcome triggers here on empty localStorage)
- `/daily` — Daily Hub
- `/daily?tab=devotional` — Daily Hub Devotional tab
- `/daily?tab=pray` — Daily Hub Pray tab
- `/daily?tab=journal` — Daily Hub Journal tab
- `/daily?tab=meditate` — Daily Hub Meditate tab
- `/bible` — Bible landing
- `/bible?mode=search&q=love` — Bible search mode (BB-42 full-text search)
- `/bible?mode=search&q=hope` — Bible search alternate query
- `/bible/my` — My Bible (personal layer dashboard with heatmap, progress map, memorization deck, echoes, activity feed)
- `/bible/[book]/[chapter]` — Bible reader. Test with:
  - `/bible/john/3` — common case
  - `/bible/john/3?verse=16` — deep-linked verse (BB-38 URL contract)
  - `/bible/psalms/23` — poetry formatting
  - `/bible/genesis/1` — first chapter boundary
  - `/bible/revelation/22` — last chapter boundary
  - `/bible/songofsolomon/8` — long book name
- `/grow` — Grow landing (reading plans)
- `/grow?tab=challenges` — Grow Challenges tab
- `/prayer-wall` — Prayer Wall
- `/music` — Music landing
- `/music?tab=ambient` — Music Ambient tab
- `/music?tab=sleep` — Music Sleep tab
- `/ask` — Ask AI
- `/accessibility` — Accessibility statement page (BB-35 added)
- `/local-support/churches` — Churches finder
- `/local-support/counselors` — Counselors finder
- `/local-support/celebrate-recovery` — Celebrate Recovery finder
- `/reading-plans/[slug]` — Reading plan detail
- `/challenges/[slug]` — Challenge detail
- `/register` — Signup flow
- `/nonexistent-page` — 404 fallback
 
### Logged-in only
 
- `/` — Dashboard (different rendering when authenticated)
- `/dashboard` — Explicit dashboard route (if different from home)
- `/prayer-wall/dashboard` — Prayer wall personal dashboard
- `/prayer-wall/user/:id` — Prayer wall user profile
- `/settings` — Settings page
- `/friends` — Friends list
- `/my-prayers` — Personal prayers
- `/insights` — Mood insights
- `/insights/monthly` — Monthly report
- `/leaderboard` — Leaderboard (if shipped)
- `/profile/[id]` — Growth profile
- `/meditate/breathing` — Meditation: breathing (BB-33 exempt animation)
- `/meditate/soaking` — Meditation: scripture soaking
- `/meditate/gratitude` — Meditation: gratitude
- `/meditate/acts` — Meditation: ACTS prayer
- `/meditate/psalms` — Meditation: psalms
- `/meditate/examen` — Meditation: examen
- `/music/routines` — Music routines
 
This list will change as new features ship. Update it when running the protocol.
 
---
 
## Theme conventions
 
The project uses a dark cinematic theme system established in the homepage redesign and extended throughout the Bible wave.
 
### Color and surface tokens
 
- **Background tokens:** `bg-dashboard-dark`, gradients defined in the design system
- **Text tokens:** `text-foreground`, `text-foreground/80`, `text-foreground/60`
  - `text-white` for primary text
  - `text-white/60` for secondary text
  - `text-white/40` to `text-white/50` for decorative/tertiary text
  - **Anything below `text-white/40` is a contrast risk and should be flagged**
- **Card tokens:** `FrostedCard` component with glass-effect background
- **Frosted glass pattern:** `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow — this is the canonical card treatment
- **Heading pattern:** `SectionHeading` component with the 2-line treatment
- **Glow orbs:** `BibleLandingOrbs` and similar components, opacity range 0.25–0.50
 
Light-theme classes (`bg-white`, `bg-gray-`, `text-gray-`, etc.) should be flagged as theme violations except where explicitly intentional.
 
### Typography tokens
 
- **Scripture text:** Lora (serif) — any scripture rendered in a sans-serif is a violation
- **UI chrome:** Inter (sans-serif)
- **Logo only:** Caveat — any non-logo heading in Caveat is a violation (BB-wave round 3 decision)
 
### Animation tokens (BB-33)
 
BB-33 established a canonical animation token system. The tokens live in `frontend/src/constants/animation.ts` and are registered in `tailwind.config.js`. Every animation in the codebase should use these tokens.
 
**Duration tokens:**
- `duration-instant` — 0ms
- `duration-fast` — 150ms
- `duration-base` — 250ms
- `duration-slow` — 400ms
 
**Easing tokens:**
- `ease-standard` — `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard curve)
- `ease-decelerate` — `cubic-bezier(0, 0, 0.2, 1)`
- `ease-accelerate` — `cubic-bezier(0.4, 0, 1, 1)`
- `ease-sharp` — `cubic-bezier(0.4, 0, 0.6, 1)`
 
**Violations to flag:**
- `duration-100`, `duration-150`, `duration-200`, `duration-300`, `duration-500`, `duration-700` anywhere in production code
- `ease-out`, `ease-in`, `ease-in-out` anywhere in production code
- Hardcoded cubic-bezier strings in className or style props (except in the tailwind config itself)
- Spring easing curves like `cubic-bezier(0.34, 1.56, 0.64, 1)` — BB-33 removed all spring easings from the system
 
**Exempt animations (documented, do not flag):**
- Shimmer animations (300ms) — BB-33 explicitly exempt
- `BreathingExercise.tsx` lines 215-218 — functional animation for meditation, exempt from reduced-motion override
- Garden/SVG ambient animations — documented as exempt in `tailwind.config.js` grouping comments
 
### Accessibility patterns (BB-35)
 
BB-35 established canonical accessibility patterns. Every interactive surface should follow them.
 
**Required patterns:**
- Icon-only buttons must have `aria-label` with a descriptive name
- Decorative icons inside labeled buttons must have `aria-hidden="true"`
- Every form field must have an associated `<label>`, `aria-label`, or `aria-labelledby`
- Every dialog must have `role="dialog"` and `aria-modal="true"`
- Every page must have a skip-to-main-content link (or a documented layout exception — see known intentional drift)
- Every page must have exactly one `<h1>` and a logical heading hierarchy with no skipped levels
- Every interactive element must be at least 44×44 CSS pixels
- Every form field with validation must have `aria-invalid` when invalid and `aria-describedby` pointing to the error message
- Every dynamic content update must be announced via `aria-live` where appropriate
- Every page must meet WCAG 2.2 Level AA (not AAA)
 
**Violations to flag in Prompt 1 and Prompt 4:**
- `<button>` elements containing only icon components without `aria-label`
- `<svg>` or icon component inside a button without `aria-hidden="true"`
- Form inputs without associated labels
- Dialogs using `role="dialog"` but missing `aria-modal="true"`
- Multiple `<h1>` elements on a single page
- Heading hierarchy that skips levels (h2 → h4 without h3)
- Interactive elements smaller than 44×44 (check by class name or explicit sizing)
 
---
 
## Component primitives established by the wave
 
The wave established several reusable component primitives. Any page that reinvents these should be flagged.
 
- **`FeatureEmptyState`** — canonical empty state component (BB-34). All empty states should use this or a documented variant. Pages with "No data" or similar generic placeholders should be flagged.
- **`FrostedCard`** — canonical card treatment. Pages using raw divs with manually-applied glass classes should be flagged as "should use FrostedCard primitive."
- **`SectionHeading`** — canonical section heading with 2-line treatment.
- **`FirstRunWelcome`** — BB-34 first-run welcome component. Should only appear on `/` and `/dashboard` on fresh localStorage.
 
---
 
## Test conventions
 
- **Test runner:** Vitest
- **Testing library:** `@testing-library/react`
- **Mocking library:** Vitest's built-in `vi.mock`
- **Playwright location:** `frontend/playwright/` for end-to-end tests, `frontend/tests/integration/` for BB-37 integration tests
- **Coverage tool:** Vitest's built-in coverage with v8
 
The codebase mixes co-located tests (`Foo.test.tsx` next to `Foo.tsx`) with parallel `__tests__/` directories. This is documented as known intentional drift.
 
**Test baseline as of end of BB-37:** Zero failing tests. BB-37 resolved the pre-existing 44-failing-test baseline that was maintained throughout BB-33 through BB-36 as a frozen reference. Any test failures Prompt 2 finds should not be attributed to a "legacy baseline" — they are new failures that need resolution.
 
---
 
## Critical paths that must always have test coverage
 
For Prompt 2's coverage gap analysis, these paths are P1 if they lack tests regardless of recency:
 
### Foundational paths
- Auth flows (login, signup, logout, session restoration)
- Storage layer for all personal-layer types: highlights, bookmarks, notes, journals, prayers, meditations
- Routing and protected route guards
- Error boundaries (route-level and component-level)
 
### Bible wave critical paths
- Bible reader verse-tap action sheet (BB-6 architecture)
- Bible chapter navigation (chapter-to-chapter and chapter-to-verse deep linking)
- BB-42 search index loading and query execution
- BB-43 reading heatmap data computation from streak data
- BB-43 chapter visit log and progress map
- BB-45 memorization card deck rendering — **specifically test reactive store consumption (see BB-45 anti-pattern below)**
- BB-46 echo engine selection logic and freshness penalty
- BB-41 notification permission flow, subscription lifecycle, and scheduler
- BB-41 BibleReader contextual prompt trigger (BB-37 migrated this from jsdom to Playwright integration test)
- BB-41 service worker `notificationclick` deep-link handler (BB-37 migrated this to Playwright integration test)
- BB-34 first-run welcome detection and dismissal
- BB-34 empty state rendering across all personal-layer pages
- BB-39 PWA install prompt and offline indicator
- BB-39 service worker precache and runtime caching rules
- Daily Hub bridge URL handling
- My Bible activity feed loader
- Bible export and import flow
 
### BB-45 anti-pattern (critical test case)
 
BB-45 almost shipped with a component that read reactive store data into local `useState`, which would have caused a truth divergence bug when the store mutated from a different surface. This is a specific regression pattern the wave exposed.
 
**Required test pattern for every component consuming a reactive store:** the test must mutate the store from outside the component (directly calling the store's mutation method) and verify the component re-renders with the new data. A test that only renders the component with seeded data and checks the initial render does NOT catch this anti-pattern.
 
Prompt 2 Phase 4C should verify this test pattern exists for every reactive store consumer identified in Prompt 4 Phase 1.
 
---
 
## Wave audit artifacts (available as inputs to protocol runs)
 
The BB-30 through BB-46 wave ended with two audit spec pairs that produced durable recon documents. Protocol runs should reference these as starting points and avoid duplicating the work they already did.
 
### BB-37 (Code Health + Playwright Full Audit) artifacts
 
- `_plans/recon/bb37-debt-audit.md` — Every lint problem, failing test, orphan file, deprecated pattern, and dead code item as of BB-37's shipping, with resolutions
- `_plans/recon/bb37-playwright-full-audit.md` — 25-route Playwright sweep results
- `_plans/recon/bb37-final-state.md` — End-of-BB-37 metrics (lint count, test count, bundle size, Lighthouse scores)
- `frontend/docs/process-lessons.md` — Process patterns identified during the wave
 
### BB-37b (Bible Wave Integrity Audit) artifacts
 
- `_plans/recon/bb37b-integration-audit.md` — Cross-spec integration verification (URL contracts, localStorage schemas, reactive stores, animation tokens, accessibility patterns, typography, layout widths)
- `_plans/recon/bb37b-voice-audit.md` — User-facing copy audit against brand voice
- `_plans/recon/bb37b-metrics-reconciliation.md` — End-of-wave metrics vs spec targets
- `_plans/recon/bb37b-known-issues.md` — Consolidated known issues from the wave
- `_plans/recon/bb37b-final-audit.md` — Wave certification document with sign-off statement
 
### Earlier wave audits (available but older)
 
- `_plans/recon/bb33-animation-audit.md` — BB-33 animation migration audit
- `_plans/recon/bb34-empty-states.md` — BB-34 empty state inventory
- `_plans/recon/bb35-accessibility-audit.md` — BB-35 accessibility audit
- `_plans/recon/bb36-performance-baseline.md` — BB-36 performance baseline with before/after comparison
 
### How protocols should use these artifacts
 
**Before running any protocol:**
 
1. Read the BB-37 and BB-37b artifacts to understand what was already audited and resolved
2. Read `frontend/docs/process-lessons.md` for specific failure modes to watch for
3. When the protocol would flag something, first check whether BB-37 or BB-37b already addressed it
4. If an item is in a prior audit as "resolved," verify it's still resolved (a silent regression is a high-signal finding)
5. If an item is in a prior audit as "deferred," it's a known issue — report it but don't treat it as a new finding
 
**During protocol runs:**
 
- Protocol 01: read `bb37-debt-audit.md` to know which lint/test items were resolved
- Protocol 02: read `bb37-final-state.md` to confirm the zero-failing-test baseline
- Protocol 03: read `bb37b-metrics-reconciliation.md` for bundle size and Lighthouse baselines
- Protocol 04: read `bb37b-integration-audit.md` for cross-spec contracts already verified
- Protocol 05: read `bb37-playwright-full-audit.md`, `bb35-accessibility-audit.md`, and `bb36-performance-baseline.md` for the state the sweep should match
 
---
 
## Known intentional drift
 
These drift patterns are documented and intentional. Protocol 04 should still report them but with a "documented" flag rather than "violation":
 
### Pattern-level drift
 
- **Reactive store vs CRUD service split.** The Bible wave introduced reactive stores (`getAll*` + `subscribe`) for highlights, bookmarks, notes, journals, chapter visits, memorization, and echoes. The older Daily Hub features use plain CRUD services for prayers and meditations. Unification is a future cleanup but not blocking.
- **Storage key prefix mixing.** `wr_*`, `bible:*`, and `dailyHub:*` all coexist. New code should use the prefix matching its feature area.
- **Test placement mixing.** Co-located (`Foo.test.tsx` next to `Foo.tsx`) and parallel `__tests__/` both exist. New tests should follow the local convention of the directory they're in.
 
### Layout and structure drift
 
- **BibleReader layout exception.** BibleReader uses `ReaderChrome` instead of the standard `Navbar`/`SiteFooter` for immersive reading. This means:
  - BibleReader does NOT have the Navbar-level skip-to-main-content link. It has its own skip link at the reader root (added in BB-35 follow-up).
  - BibleReader does NOT render `SiteFooter`. Crisis resources and the Accessibility link are accessible from every other page. This is intentional for the sanctuary immersion experience.
  - Protocol 05 should NOT flag BibleReader as "missing footer" or "missing standard skip link" — the deviations are documented.
 
### Behavior drift
 
- **BB-34 first-run welcome deep-link bypass.** The welcome appears only on the home page or Dashboard on fresh localStorage. A user arriving via a deep link (e.g., `/bible/john/3?verse=16` from a shared link) sees the target route, not the welcome. This is intentional.
- **BB-46 freshness penalty session-only.** The echo engine's freshness penalty is not persisted across page reloads. Echoes shown in the current session won't reappear, but reloading resets the penalty state. Documented as acceptable.
- **BB-45 memorization cards single-verse only.** Cards cover one verse each, not verse ranges. A multi-verse highlight creates one card for the starting verse, not one card per verse in the range. Documented limitation.
- **BB-33 animation exemptions.** Shimmer (300ms), breathing (`BreathingExercise.tsx`), and garden/SVG ambient animations are exempt from the global reduced-motion safety net because they are functional (breathing) or decorative-without-urgency (shimmer, garden). Documented in `tailwind.config.js` grouping comments.
 
### Audio cluster status
 
- **Audio cluster (BB-26, BB-27, BB-28, BB-29).** SHIPPED on `audio-wave-bb-26-29-44` branch. BB-26 added the FCBH DBP v4 audio foundation (Howler.js engine, bottom-sheet player, Media Session, supersession logic, attribution). BB-29 added continuous playback / auto-advance. BB-28 added the sleep timer with 20-second exponential fade-out. BB-27 added pause-coordination so ambient pauses when Bible audio plays. **BB-44 (read-along verse highlighting) is the final spec in the wave, in progress on the same branch.** Protocol 04 should treat audio code as live and audited, not deferred.
- **Phase 3 backend (Spring Boot + PostgreSQL).** Still planned but not built. All current data is localStorage-only. Protocol 04 should NOT flag "no API calls" or "missing backend integration" — the backend is a future phase.
 
---
 
## Contact and ownership
 
- **Project owner:** Eric Champlin
- **Repo:** `Eric-Champlin/worship-room`
- **Main branch:** `main`
- **Most recent wave:** Audio Wave (BB-26, BB-27, BB-28, BB-29) shipped to `audio-wave-bb-26-29-44` branch. BB-44 in progress on the same branch as the final spec.
- **Next wave:** Round 3 (Prayer Wall and Profile expansions, see `_forums_master_plan/round3-master-plan.md`).
 
---
 
## Changelog for this overrides file
 
### v1.2 — 2026-04-15
- Audio cluster (BB-26, BB-27, BB-28, BB-29) shipped to `audio-wave-bb-26-29-44` branch. BB-44 in progress on same branch.
- Updated "Deferred work" section: removed audio cluster from deferred list, replaced with "Audio cluster status" section reflecting shipped state. Phase 3 backend remains the only deferred item.
- Updated "Most recent wave" and "Next wave" in Contact and ownership section.
 
### v1.1 — 2026-04-13
- Added every wave-introduced localStorage key (`wr_first_run_completed`, `wr_push_subscription`, `wr_notification_prefs`, `wr_notification_prompt_dismissed`, `wr_chapters_visited`, `wr_memorization_cards`, `wr_echo_dismissals`)
- Added every wave-introduced route (`/accessibility`, `/bible?mode=search&q=`, deep-linked verse URLs)
- Added BB-33 animation token system documentation with violations to flag and exempt animations
- Added BB-35 accessibility pattern documentation with violations to flag
- Added "Component primitives established by the wave" section (`FeatureEmptyState`, `FrostedCard`, `SectionHeading`, `FirstRunWelcome`)
- Added "Wave audit artifacts" section with every BB-37 and BB-37b audit document and usage guidance for each protocol
- Added BB-45 anti-pattern documentation and required test pattern for reactive store consumers
- Added "known intentional drift" entries for BibleReader layout exception, first-run deep-link bypass, BB-46 freshness penalty, BB-45 single-verse cards, BB-33 animation exemptions, audio cluster deferral, Phase 3 backend deferral
- Added critical paths from the wave to the Prompt 2 coverage section
- Added `/accessibility` page from BB-35
- Added integration test directory `frontend/tests/integration/` from BB-37
- Added `frontend/src/constants/animation.ts` from BB-33
- Updated contact section with wave merge date and next wave state
 
### v1.0 — 2026-04-09
- Initial appendix file
- Documents file structure, key conventions, route inventory, theme conventions, test conventions, critical paths, wave history, known intentional drift