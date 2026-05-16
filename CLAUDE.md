# Worship Room - Project Guide

## Project Overview

**Worship Room** is a Christian emotional healing and worship web application that provides a safe, peaceful online space where users can find comfort, guidance, and spiritual support through AI-powered scripture matching, prayer generation, journaling, audio content, community support, worship music, Bible reading, daily devotionals, community challenges, and personal growth tracking.

### Mission

Create an accessible platform where anyone (especially Christians) can find emotional healing through worship, scripture, prayer, community support, and measurable spiritual growth.

### Competitive Positioning

Worship Room is free, ad-free, and privacy-respecting in a market where competitors charge $40–$100/yr and harvest user data. Key differentiators: AI-generated personalized prayers, ambient sound crossfade mixing, grace-based streak system (never punitive), mood-to-content recommendation pipeline, visual growth garden, liturgical calendar with Computus algorithm, crisis resource integration, local support directory, AI-powered scripture explanation and reflection, full-text scripture search, offline-capable PWA, and verse memorization that doesn't quiz or shame.

---

## Implementation Details

**All technical standards, security policies, coding conventions, design system details, UX flows, and component architecture are in `.claude/rules/`. Read the relevant rule file before implementing any feature.**

- 🚨 **[AI Safety & Ethics](.claude/rules/01-ai-safety.md)** - Crisis detection, content boundaries, moderation
- 🔒 **[Security](.claude/rules/02-security.md)** - Auth, rate limiting, encryption, input validation, auth gating strategy, demo mode data policy
- ⚙️ **[Backend Standards](.claude/rules/03-backend-standards.md)** - Spring Boot conventions, API contract
- 🎨 **[Frontend Standards](.claude/rules/04-frontend-standards.md)** - React patterns, accessibility, responsive design
- 🗄️ **[Database](.claude/rules/05-database.md)** - Schema, indexes, data retention
- ✅ **[Testing](.claude/rules/06-testing.md)** - Testing strategy, coverage requirements, definition of done, reactive store consumer patterns
- 📊 **[Logging & Monitoring](.claude/rules/07-logging-monitoring.md)** - Structured logging, PII handling
- 🚀 **[Deployment](.claude/rules/08-deployment.md)** - Environment variables, deployment platforms, dev commands
- 🎨 **[Design System & Components](.claude/rules/09-design-system.md)** - Color palette, typography, component inventory, hooks, utilities, Music architecture, Round 3 visual patterns, Daily Hub Visual Architecture, BB-33 animation tokens, Bible reader component inventory
- 🔄 **[UX Flows](.claude/rules/10-ux-flows.md)** - Navigation structure, all user flows including Bible wave additions
- 💾 **[localStorage Keys](.claude/rules/11-local-storage-keys.md)** - Complete inventory of all storage keys with types, descriptions, and reactive store hook references
- 🗺️ **[Project Reference](.claude/rules/12-project-reference.md)** - Full route inventory (public + protected) and verified content inventory

**Source of truth**: If CLAUDE.md conflicts with a rule file, rule file wins.

---

## Deep Code Health Reviews

This project uses a multi-protocol deep review system documented in `_protocol/`. The protocols catch issues that per-spec code review cannot — cross-spec contract violations, accumulated drift, dependency rot, visual regressions across the full app, and reactive store consumer anti-patterns. Run them between major feature waves or quarterly at minimum.

The protocol system has seven files:

- `_protocol/00-protocol-overview.md` — execution conventions, severity scale, reporting standards
- `_protocol/01-prompt-build-and-code-health.md` — static analysis, lint, type, dead code, storage keys
- `_protocol/02-prompt-test-suite-audit.md` — failing tests, coverage gaps, BB-45 anti-pattern detection
- `_protocol/03-prompt-dependency-and-supply-chain.md` — vulnerabilities, staleness, bundle size, license
- `_protocol/04-prompt-architecture-and-pattern-consistency.md` — cross-spec contracts, store consumer audit
- `_protocol/05-prompt-visual-verification.md` — full-site Playwright sweep, accessibility, Lighthouse
- `_protocol/99-project-specific-overrides.md` — Worship Room-specific paths, keys, layout exceptions, wave audit artifacts

Protocols run in order on a single deep-review branch and produce a consolidated report at `_reports/deep-review-YYYY-MM-DD.md`. Each protocol appends its section to the same dated report.

---

## Key Decisions

- **Bible Translation**: WEB (World English Bible) — modern English, public domain, no licensing required. Full 66-book Bible available via lazy-loaded JSON files.
- **Spotify Integration**: No Spotify API required. Song of the Day embed uses track IDs from the Worship Room playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si).
- **Gamification Philosophy**: "Gentle gamification" — celebrate presence, never punish absence. Grace-based streak repair (1 free/week, 50 pts for additional). Mood data always private; only engagement data visible to friends.
- **Visual Growth Metaphor**: Animated SVG garden on dashboard that grows through 6 stages matching faith levels.
- **Content Strategy**: Most AI content now uses real Gemini 2.5 Flash Lite via the backend proxy at `/api/v1/proxy/ai/*` (shipped in the AI Integration + Key Protection Waves). Real AI integrations: Ask (`/ask`), Pray (AI prayer generation), Journal Reflection, BB-30 Explain Passage, BB-31 Reflect on Passage — all cached via the BB-32 `bb32-v1:` localStorage layer. AI Plan Generation remains mock (deferred). **Forums Wave** (Phase 3) keeps Prayer Wall content as user-generated plain text — no LLM generation in MVP.
- **Liturgical Calendar**: Algorithmic Easter calculation (Computus) with automatic season detection. Seasons affect dashboard greeting, devotional priority, Verse of the Day, landing page banner, QOTD, and navbar icon.
- **Dark Theme**: App uses dark theme throughout. Light mode deferred to Phase 4. Bible reader supports three reader-only themes (midnight default, parchment, sepia) scoped to the BibleReader chrome only.
- **Navigation**: 5 top-level nav items (Daily Hub, Bible, Grow, Prayer Wall, Music) + Local Support dropdown + avatar dropdown for authenticated users. Mobile: grouped section drawer.
- **Sound Design**: Web Audio API synthesized sound effects, on by default, gated behind `wr_sound_effects_enabled` and `prefers-reduced-motion`.
- **Visual Design Authority**: All visual patterns live in `09-design-system.md`. CLAUDE.md does not duplicate them.
- **Reactive Store Pattern**: Bible-wave and Phase 0.5 personal-layer features use reactive stores. Real Pattern A (subscription via standalone hook, `useSyncExternalStore`) hooks: `useMemorizationStore`, `useStreakStore`, `usePrayerReactions`. Pattern B (inline `subscribe()` in `useEffect`) stores: `highlightStore`, `bookmarkStore`, `noteStore`, `journalStore`, `chapterVisitStore`, `plansStore` — consumers wire subscription themselves. See `11b-local-storage-keys-bible.md` § "Reactive Store Consumption" for the BB-45 anti-pattern documentation.
- **Anti-pressure voice**: All AI features and personal data displays use anti-pressure copy. Reading heatmaps, memorization decks, and echo callbacks treat sparse activity as valid. No streaks-as-shame, no "you missed N days" messaging, no gamified verse quizzes.

---

## Feature Summary

For full feature details see the rule files. This section is an at-a-glance index, not a spec.

### Foundation

Authentication (real JWT — Spring Security + BCrypt — shipped in Forums Wave Phase 1 Specs 1.4 + 1.5 + 1.9; legacy `wr_auth_simulated` mock kept for transitional test seeding), Prayer Wall (real backend — shipped in Forums Wave Phase 3 Specs 3.1–3.12; localStorage seed data preserved for tests via flag-off branch), React Router, Landing Page, Dashboard with visual garden, Design System (dark theme, frosted glass cards via `FrostedCard` tier system, `BackgroundCanvas` 5-stop atmospheric layer on Daily Hub and most inner pages, BB-33 canonical animation tokens), First-Run Welcome (BB-34, never on deep-linked routes).

### Daily Experience

Mood Check-In (5 moods, crisis detection, mood-to-content recommendations), Prayer (real Gemini AI generation via backend proxy, KaraokeText reveal, draft auto-save with auth-wall persistence), Journal (Guided/Free Write, voice input, draft auto-save, real Gemini Reflection via backend proxy), Meditation (6 types, verse-aware navigation from devotional via Spec Z), Audio-Guided Prayer (8 sessions, TTS narration), Persistent Ambient Pill (Wave 7 sticky FAB).

### Bible & Scripture (post-wave)

Full 66-book WEB Bible, lazy-loaded per book. BibleReader chrome (three themes, four type sizes, three line heights, serif/sans, focus mode). Personal layer (BB-7/BB-8/BB-11b): 4-color highlights, range-based notes, bookmarks, verse-linked and freeform journal entries — all reactive-store backed, surfaced in `/bible/my`. AI Explain (BB-30) and Reflect (BB-31) via real Gemini through the backend proxy. AI cache (BB-32) with `bb32-v1:` namespace, 7-day TTL, 2 MB cap. Full-text search (BB-42, client-side inverted index, sub-100ms, offline). PWA with runtime caching and offline indicator (BB-39). Reading heatmap + 66-book progress map (BB-43). Verse memorization deck (BB-45, no quiz, no scoring). Verse echoes (BB-46). Web push for daily verse and streak reminders (BB-41, iOS Safari 16.4+ via PWA install). Bible audio (BB-26 playback + BB-27 ambient coordination + BB-28 sleep timer + BB-29 auto-advance + BB-44 read-along highlighting) on the dramatized WEB (ENGWWH variant) via FCBH DBP v4 with Howler.js. Verse of the Day: 60 verses, daily rotation, shareable Canvas image.

### Devotional & Reading

Daily Devotional (50 entries with Tier 1/Tier 2 content tiers), Reading Plans (10 plans, 119 days), Gratitude Journal.

### Community

Prayer Wall (9 categories, QOTD, ceremony animation), Community Challenges (5 seasonal, 110 days total), Question of the Day (72 rotating questions).

### Personal Growth

Streak System (12 activities, grace-based repair), Faith Points (weighted, multiplier tiers), Faith Levels (6 tiers Seedling → Lighthouse), Badges (~45 across 6 categories), Visual Garden (6 growth stages), Insights (mood heatmap, trends, correlations).

### Social

Friends (mutual model, encouragements 3/day, nudges 1/week), Leaderboard (friends + global), Notifications (in-app bell + BB-41 push for daily verse and streak reminders).

### AI Features

All five real AI features route through the backend proxy at `/api/v1/proxy/ai/*` (no frontend Gemini key): AI Bible Chat (`/ask`, AI-1), AI Prayer Generation (AI-2, devotional-context aware), AI Journal Reflection (AI-3), BB-30 Explain Passage, BB-31 Reflect on Passage. All cached via the BB-32 `bb32-v1:` localStorage layer. AI Plan Generation remains mock (deferred).

### Music & Audio

Ambient Mixer (24 sounds, 11 scenes, crossfade looping), Sleep & Rest (24 scripture readings, 12 stories, smart sleep timer), Worship Playlists (8 Spotify embeds), AudioDrawer Unified Entry (Wave 7).

### Other

Local Support (Church/Counselor/CR locators), My Prayers (`/my-prayers`), Onboarding (Welcome Wizard, BB-34 first-run, tooltips, getting started checklist), Evening Reflection (after 6 PM, keeps streak alive).

### Accessibility (BB-35)

Public `/accessibility` page with WCAG 2.2 AA target, accessibility statement, feedback mechanism, last audit date. Skip-to-main-content links on every page (BibleReader has its own root-level skip link). `useFocusTrap()` in 37 modal/dialog components. Global reduced-motion safety net at `frontend/src/styles/animations.css`.

### Infrastructure

PWA (BB-39), SEO (BB-40 — every route has `<SEO>`, JSON-LD on 7+ pages), Deep Linking (BB-38 — verse-level URLs), Animation Tokens (BB-33 — canonical durations and easings at `frontend/src/constants/animation.ts`), Reduced-Motion Safety Net (BB-33), Seasonal Calendar, Sound Effects, Skeleton Loading (13 page-level skeletons), Route Code Splitting (34+ lazy routes), Verse Sharing (Canvas-generated images).

---

## Content Inventory

See `.claude/rules/12-project-reference.md` for verified content counts (devotionals, reading plans, ambient sounds, verses, QOTD, challenges, badges, etc.). All scripture uses WEB translation.

---

## Routes

See `.claude/rules/12-project-reference.md` for the complete route inventory (public + protected).

---

## Implementation Phases

**Phases 1 through 2.95** ✅ Pre-wave foundation (Daily Experience, Music, Dashboard & Growth, content expansion, community, visual garden, local support, PWA v1). ~4,862 tests at Round 2 wrap-up baseline.

**Bible Content Migration** ✅ Full 66-book WEB Bible via lazy-loaded JSON (scrollmapper/bible_databases).

**Round 2 — Full-Site Polish** ✅ 23 specs: dark theme foundation, nav consolidation, hero redesigns, cross-feature integration, sound effects, skeletons, code splitting, verse image sharing.

**Round 3 — Enhancement & Engagement** ✅ Homepage redesign (HP-1→HP-15) + Daily Hub Round 3 (Specs 1-Z + Waves 1-7). Established dark cinematic theme, visible glow orbs, FrostedCard, HorizonGlow, DevotionalPreviewPanel, AudioDrawer unified entry. See `09-design-system.md` § "Round 3 Visual Patterns".

**Bible Redesign + Polish Wave (BB-0 through BB-46)** ✅ Merged 2026-04-13. The largest single wave. Rebuilt Bible reader, AI features (BB-30/31/32), PWA (BB-39), SEO (BB-40), web push (BB-41), full-text search (BB-42), heatmap + progress map (BB-43), memorization deck (BB-45), verse echoes (BB-46), audio Bible (BB-26/27/28/29/44). Introduced BB-45 store-consumer anti-pattern (see `11b-local-storage-keys-bible.md` § "Reactive Store Consumption"). Final certification at `_plans/recon/bb37b-final-audit.md`.

**AI Integration Wave** ✅ Three frontend features converted from mock to real Gemini: Ask (AI-1), Pray (AI-2), Journal Reflection (AI-3). Transitional frontend-direct-call footprint migrated to backend proxy in the next wave.

**Key Protection Wave** ✅ First backend-heavy wave. Spring Boot proxy at `com.example.worshiproom.proxy.*` (renamed to `com.worshiproom.proxy` in Phase 1 Spec 1.1, ✅ shipped). Four specs: `ai-proxy-foundation` (filters, exception handlers, WebClient, `/api/v1/health`), `ai-proxy-gemini`, `ai-proxy-maps`, `ai-proxy-fcbh`. All three external APIs migrated — zero `VITE_*_API_KEY` in frontend bundle. ~280 backend tests at wave wrap. Deviation #1: narrow `ExchangeFunctions=INFO` log suppression in dev profile to prevent query-string key leaks.

**Phase 3 — Forums Wave** IN PROGRESS. 156 specs across 19 phases. **Phase 1 (Backend Foundation):** 25/30 shipped, 5 deferred (1.5b password reset, 1.5d email verification, 1.5e change email, 1.5g session invalidation — all SMTP-blocked until domain purchase; 1.10c database backup — $20/month deferred). 1.10f Terms/Privacy and 1.10m Community Guidelines are tracked ✅ with partial-shipped notes — canonical legal markdown shipped at `content/{terms-of-service,privacy-policy,community-guidelines}.md`, but the `users.terms_version` / `users.privacy_version` columns + consent modal + `/community-guidelines` page component + endpoints are still pending and will be closed out under their original spec IDs. **Phase 2 (Activity Engine Migration)** complete: 10/10 specs shipped, dual-write live in dev. **Phase 2.5 (Friends Migration)** complete: 7/8 specs shipped. 2.5.6 Block User Feature reverted to ⬜ after the 2026-04-28 audit found no implementation despite an earlier ✅ marker (no `com.worshiproom.block/` package, no `user_blocks` Liquibase changeset); the sibling 2.5.7 Mute did ship correctly (`user_mutes` table at changeset 013, `MutesService`, `useMutes` hook). **Phase 3 (Prayer Wall Backend)** complete: 12/12 specs shipped (3.1–3.12 incl. 3.8 Reports — `ReportController`, `ReportsRateLimitConfig`, post-reports Liquibase changesets all live — and 3.12 cutover). **Phase 6 (Engagement Features)** complete 2026-05-15: 11 specs shipped (6.1 Prayer Receipt, 6.2 Quick Lift, 6.2b Prayer Length Options, 6.3 Night Mode, 6.4 3am Watch v1, 6.5 Intercessor Timeline Path B, 6.6 + 6.6b Answered Wall + 6.6b-deferred-2 answered_text crisis-scan, 6.7 Shareable Testimony Cards, 6.8 Verse-Finds-You + 180-passage curation, 6.9 Composer Drafts, 6.11 Sound Effects audit + coverage, 6.11b Live Presence Path B wide commit, 6.12 Phase 6 cutover); 1 deferred to Phase 8 (6.10 Search by Author — needs `/u/:username` route); 4 deferred items parked (6.6b-deferred-1 CommentInput placeholder / -3 anonymous-author affordances / -4 cross-route Celebrate+Praising / Prayer Wall Redesign side quest); 1 potential prod bug tracked (PrayCeremony runaway-timer test, no production component exists); 4 anomalies documented in tracker (brief-drift remediation arc, 6.10 deferral, 6.11 collapse-on-recon, 6.11b Path B wide commit). New Forums Wave gate: `CRITICAL_NO_AI_AUTO_REPLY.md` HARD ENFORCEMENT GATE established by 6.4 — no LLM ever invoked on crisis-flagged user content. Master plan: `_forums_master_plan/round3-master-plan.md` (v2.9 with **Phase 1, Phase 2, and Phase 3 Execution Reality Addendums** — addendums are AUTHORITATIVE over older spec body text where they disagree). Pipeline: `/spec-forums` → `/plan-forums` → `/execute-plan-forums` → `/code-review` → `/verify-with-playwright` (skipped for backend-only specs).

**Round 3 Visual Rollout** ✅ Merged 2026-05-07 (parallel with Forums Wave). 26 specs across 8 days migrated every page except Prayer Wall to canonical Round-3 patterns: `FrostedCard` tier system (`accent` / `default` / `subdued` with `rounded-3xl`, eyebrow + violet leading dot for Tier 1), `BackgroundCanvas` 5-stop multi-bloom atmospheric layer (replaces HorizonGlow on Daily Hub and adopted by most inner pages), violet-glow textarea (`shadow-[0_0_20px...0_0_40px...] border-violet-400/30`), muted-white active-state for selectable pills (`bg-white/15 text-white border-white/30`), `Button variant="gradient"` and `variant="subtle"` (replacing most `bg-primary` solid usage), `text-violet-300` text-button (replacing `text-primary` on dark surfaces for WCAG AA), Tonal Icon Pattern for widget headers, border opacity unification (`border-white/[0.12]`), GRADIENT_TEXT_STYLE on every h1/h2 outside wordmark/RouteLoadingFallback, Layout default `transparentNav: true`, query-param-driven AuthModal (`/?auth=login|register`). Patterns documented in `09-design-system.md`. Prayer Wall migration is the focus of Forums Wave Phase 5 (Prayer Wall Visual Migration). Reconciliation report: `_plans/reconciliation/2026-05-07-post-rollout-audit.md`.

**Phase 4 — Light Mode & Native Prep** (deferred) — Light mode toggle, real TTS audio files, performance optimization, native app planning.

---

## Build Health

Verify current state with `./mvnw test` (backend), `pnpm test` (frontend), `pnpm build`, `pnpm lint`, and `frontend/scripts/measure-bundle.mjs` (bundle size). Numbers drift; always run before relying.

**Frontend regression baseline (post-Visual-Rollout Spec 13, 2026-05-07):** 9,830 pass / 1 known fail across 1 file (`Pray.test.tsx — shows loading then prayer after generating` looking for the loading-state copy "generating prayer for you" that may have been bypassed by an animation-timing change during DailyHub 1B — see `_plans/reconciliation/discoveries.md` D1). The prior `useFaithPoints — intercession` and `useNotifications — sorted newest first` flakes from the post-Spec-5 baseline were not observed in the post-Spec-13 run. **Any NEW failing file or any increase in fail count after a Forums Wave spec or Visual Rollout spec lands is a regression.**

**Backend baseline:** ~720 pass / 0 fail (post-Phase-2; verified at 736 invocations after Spec 2.5.1 = 720 + 16 added). Reported by Maven's `Tests run: N` aggregate, which counts each `@Nested` JUnit5 invocation. Note that `<testsuite tests=N>` in surefire XML undercounts by ~190 because it does not sum nested testsuite blocks — always trust Maven's aggregate or the `<testcase>` element count, not a top-level XML grep. Wall-clock `./mvnw test` ~110s. Growth expected as Phase 2.5 / Phase 3 land. Per-phase regression baselines anchor here, not at the older ~280 (Key Protection wrap) or stale ~552 estimate.

**Enforced standards:** TypeScript strict, WCAG 2.2 AA (Lighthouse Accessibility 95+), Lighthouse Performance 90+, zero `VITE_*_API_KEY` in frontend bundle, WEB translation throughout, Recharts isolated via `manualChunks`.

---

## Production Deployment (Railway)

**Platform:** Railway Hobby plan, US-East region.
**Projects:** Single Railway project named `worship-room` with three services — backend, postgres, frontend.
**Dashboard:** https://railway.com/project/<project-id>
**Runbook:** `_plans/forums/phase01-cutover-checklist.md`

### URLs
- Backend: https://<backend-service>.up.railway.app
- Frontend: https://worshiproom.com (Railway-hosted or external — confirm at deploy time)
- Health: https://<backend-service>.up.railway.app/actuator/health

### CLI commands
- `railway login` — one-time auth
- `railway link` — link local checkout to the project
- `railway logs --service backend --tail 200` — view recent backend logs
- `railway variables --service backend` — inspect env vars
- `railway connect postgres` — open a psql session to the prod DB (use sparingly)

### Env vars (set in Railway Variables UI, never committed)
- Backend: `SPRING_PROFILES_ACTIVE=prod`, `JWT_SECRET`, `JWT_EXPIRATION=3600`, `SERVER_PORT=$PORT`, optional `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `FCBH_API_KEY`
- Frontend (if Railway-hosted): `VITE_API_BASE_URL=<backend-service-url>`
- Auto-injected by Railway: `DATABASE_URL`, `PORT`

### Redeploy / rollback
- Redeploy latest: push to `main`, or `railway up` from a clean checkout
- Rollback: Railway dashboard → service → Deployments → pick previous → Redeploy
- See `_plans/forums/phase01-cutover-checklist.md` § 8 for full rollback scenarios

### Playwright prod smoke
- Run: `PLAYWRIGHT_BASE_URL=https://<frontend-url> pnpm test:e2e phase01-auth-roundtrip`
- Cleanup: `railway connect postgres` → `DELETE FROM users WHERE email LIKE 'playwright-test+%';`

---

## Build Approach

### Frontend Spec-Driven Workflow (pre-Forums-Wave features, Bible wave, visual polish)

1. **`/spec <feature description>`** — Generates spec file + feature branch
2. **`/plan _specs/<feature>.md`** — Generates implementation plan
3. **Review** — User approves plan
4. **`/execute-plan _plans/<plan>.md`** — Implements step-by-step
5. **`/code-review`** — Pre-commit quality check
6. **`/verify-with-playwright`** — Visual verification

### Forums Wave Workflow (Phase 3 — backend + full-stack features)

1. **`/spec-forums <spec-id-or-description>`** — Extracts spec from master plan (`_forums_master_plan/round3-master-plan.md`) into standalone `_specs/` file + feature branch
2. **`/plan-forums _specs/<spec>.md`** — Generates backend-aware implementation plan (Liquibase, JPA, services, endpoints, Testcontainers)
3. **Review** — User approves plan
4. **`/execute-plan-forums _plans/<plan>.md`** — Implements with backend verification (compile → test → API shape → Liquibase applies)
5. **`/code-review`** — Pre-commit quality check (Forums Wave safety checks included)
6. **`/verify-with-playwright`** — Visual verification (only for specs with UI components; skipped for backend-only specs)

### Deep Review Workflow

Between major waves or quarterly, run the deep review protocols in `_protocol/`:

1. Create a new branch off main (`deep-review-YYYY-MM-DD`)
2. Run protocols 01-05 in order, each as a separate Claude Code session
3. Each protocol appends to `_reports/deep-review-YYYY-MM-DD.md`
4. Review the consolidated report and create follow-up specs for findings
5. Merge the deep review branch to main when complete

The protocols catch issues that the per-spec workflow can't: cross-spec contract drift, accumulated dependency rot, BB-45 store consumer anti-patterns, visual regressions across the full app, and accessibility/performance regressions against prior baselines.

### Working Guidelines

- **AI Safety First** — Crisis detection mandatory, never replace professional help
- **Run tests automatically** after code changes; ensure tests pass before commits
- **Feature branches only** — never commit directly to main
- **Responsive + accessible** — mobile-first, semantic HTML, ARIA, keyboard nav, 44px touch targets
- **Security** — never commit API keys, sanitize all input, validate everything
- **Empathy** — emotional/spiritual topics require care and respect
- **Gentle gamification** — celebrate presence, never punish absence
- **Privacy by default** — mood data always private; users control engagement data visibility
- **Bible translation** — all scripture uses WEB (World English Bible)
- **Seasonal awareness** — useLiturgicalSeason hook provides current season; features respect seasonal content priority
- **Dark theme** — all pages use dark theme; maintain sanctuary immersion across navigation. Bible reader theme variants are scoped to the reader chrome only.
- **Sound as atmosphere** — sound effects enhance emotional moments; gated behind user preference and prefers-reduced-motion
- **Warm copy** — every user-facing message should feel like a caring friend, not a system notification
- **Anti-pressure voice** — personal data displays (heatmaps, memorization decks, echoes, AI explanations, AI reflections) treat sparse activity as valid and avoid quiz-or-shame tone
- **Shareable moments** — features that produce emotional peaks should have share affordances with beautiful visual output
- **Reactive store discipline** — components consuming reactive stores must use the store's hook, never local `useState`. The BB-45 anti-pattern is a real correctness bug that ships silently. See `11-local-storage-keys.md` and `_protocol/99-project-specific-overrides.md`.
- **Animation token discipline** — all animation durations and easings come from `frontend/src/constants/animation.ts`. Don't hardcode `200ms` or `cubic-bezier(...)` strings in new components. See `09-design-system.md` § "Animation Tokens".
- **Visual patterns live in `09-design-system.md`** — glow opacities, text color defaults, heading treatments, FrostedCard tier system, white pill CTAs, textarea glow, sticky FAB pattern, drawer-aware visibility, Daily Hub HorizonGlow architecture, animation tokens, deprecated patterns. Always read it before working on UI.
- **BibleReader is a documented layout exception** — uses `ReaderChrome` instead of `Navbar`/`SiteFooter`, has its own root-level skip link, no SiteFooter (intentional immersive design). When auditing pages, treat BibleReader's structure as documented intentional drift, not a violation.

### Forums Wave Working Guidelines (Phase 3)

- **Master plan is authoritative** — `_forums_master_plan/round3-master-plan.md` (v2.9 + Phase 1 / Phase 2 / Phase 3 Execution Reality Addendums) contains all 156 specs, 17 Universal Rules, and 17 Decisions. Read the relevant spec section AND the relevant addendum before executing any work — addendums are authoritative over older spec body text where they disagree.
- **Liquibase for all schema changes** — every table creation, column addition, and index must be a Liquibase changeset. No raw SQL migrations. Changeset filenames follow `YYYY-MM-DD-NNN-description.xml` pattern.
- **Dual-write discipline** — Phases 2, 2.5, and 3 use the dual-write migration pattern: localStorage remains primary for reads, backend receives shadow writes. Feature flags (`VITE_USE_BACKEND_*`) control the read source. Never flip a flag default without a cutover spec's smoke test passing.
- **Crisis content supersedes everything** — Universal Rule 13. Any feature touching user-generated content must handle crisis detection. When crisis resources are needed, they override all other feature behavior. See Spec 10.5 (three-tier escalation) and the master plan's crisis-related Decisions.
- **Anti-pressure copy** — extends to Prayer Wall, welcome emails, moderation notifications, and all community features. No "we miss you!", no streak-as-shame, no comparison metrics. See the Anti-Pressure Copy Checklist in each spec's Copy Deck section.
- **Plain text only for user content** — NO HTML, NO Markdown rendering for user-generated posts, comments, or messages. Store as plain text, render with `white-space: pre-wrap`. Never use `dangerouslySetInnerHTML` on user content. Same policy as frontend (see `02-security.md`).
- **User handles all git operations** — CC never commits, pushes, or checks out branches. CC creates feature branches via `/spec-forums` but all other git operations are manual.
- **Testcontainers for integration tests** — all backend integration tests use Testcontainers PostgreSQL. No H2, no mocking the database layer for integration tests.
- **BCrypt for passwords** — Spring Security default. See Spec 1.4 and `02-security.md`.
- **WEB translation for all scripture** — same as frontend. No exceptions.
