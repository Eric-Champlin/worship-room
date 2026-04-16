# Implementation Plan: BB-40 SEO + Open Graph Cards

**Spec:** `_specs/bb-40-seo-and-open-graph-cards.md`
**Date:** 2026-04-11
**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 6 days old — fresh)
**Recon Report:** N/A — BB-40 has no visual page work; OG cards are the only design asset and will be captured in `_plans/recon/bb40-seo-metadata.md` (produced by Step 1)
**Master Spec Plan:** N/A — standalone infrastructure + content spec in the Bible-redesign wave

---

## Architecture Context

### Existing infrastructure (verified during recon, matches spec "Reality check" section)

- `react-helmet-async@^2.0.5` is installed (`frontend/package.json`)
- `<HelmetProvider>` wraps the React tree in `frontend/src/App.tsx:162-241`
- `<SEO>` component at `frontend/src/components/SEO.tsx` (87 lines). Props: `title`, `description`, `noSuffix`, `ogImage`, `ogType`, `canonical`, `noIndex`, `jsonLd`. Exports `SITE_URL` constant.
- `SITE_URL` reads from `import.meta.env.VITE_SITE_URL` with fallback `'https://worshiproom.com'`
- `buildCanonicalUrl` helper (lines 21-39 of `SEO.tsx`) strips `UI_STATE_PARAMS = ['tab']` and supports a `canonicalOverride` param that suppresses query-param pass-through
- `frontend/public/og-default.png` exists as fallback OG image
- `frontend/src/test/setup.ts` globally mocks `react-helmet-async` (Helmet → null, HelmetProvider → children passthrough)
- `frontend/src/components/__tests__/SEO.test.tsx` unmocks `react-helmet-async` via `vi.unmock(...)` at the top of the file to assert real Helmet behavior

### Current `<SEO>` coverage — 39 routes render `<SEO>` inline

Confirmed via `grep "<SEO" frontend/src/pages`: 39 pages already render `<SEO>` with inline `title`/`description` string literals. Inventory in Step 1.

### Confirmed coverage gaps (no `<SEO>` render today)

- `frontend/src/pages/BiblePlanDetail.tsx` — no SEO import, no SEO render (grep confirmed)
- `frontend/src/pages/BiblePlanDay.tsx` — no SEO import, no SEO render (grep confirmed)

Step 1 re-runs the grep pass during recon doc generation to rule out any other gaps.

### JSON-LD baseline (verified during recon)

- `Home.tsx:11-35` renders `homepageJsonLd` array = `[Organization, WebSite]`. The `WebSite` entry includes `potentialAction` (SearchAction → `/ask?q={search_term_string}`). This meets the spec's "verify existing" requirement.
- `DailyHub.tsx:200` passes `jsonLd={dailyHubBreadcrumbs}`
- `MyBiblePage.tsx:151` passes `jsonLd={myBibleBreadcrumbs}`
- `BibleLanding.tsx` passes a `jsonLd` prop (verified via grep — file present in jsonLd hit list)
- `BibleReader.tsx:676-680` passes NO `jsonLd` — BB-40 adds `BreadcrumbList` here
- `ReadingPlanDetail.tsx`, `PrayerWall.tsx`, `MusicPage.tsx`, `Counselors.tsx`, `Churches.tsx`, `CelebrateRecovery.tsx` all pass some `jsonLd`

### `noIndex` baseline (grep-verified)

Already `noIndex`:
- `/health`, `/insights`, `/insights/monthly`, `/friends`, `/settings`, `/my-prayers`, `/profile/:userId`, `/prayer-wall/dashboard`
- All 6 `/meditate/*` sub-pages
- `NotFound` (`App.tsx:119`)
- `ComingSoon` stub (`App.tsx:101`) — used by `/login`

NOT yet `noIndex` (BB-40 must fix):
- `/bible/my` (MyBiblePage.tsx:148 — the spec flags this as a required `noIndex` route)
- `/register` (RegisterPage.tsx:68 uses canonical but not noIndex — BB-40 must add)

Dashboard (`/` when logged in) does NOT currently set `noIndex` and must NOT be given `noIndex` — the root route serves Home to crawlers and that must remain indexable.

### Route registry

Full route inventory from `App.tsx:174-230`. Content routes (indexable): `/`, `/daily`, `/ask`, `/grow`, `/bible`, `/bible/browse`, `/bible/plans`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`, `/bible/:book/:chapter`, `/music`, `/music/routines`, `/prayer-wall`, `/prayer-wall/:id`, `/prayer-wall/user/:id`, `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`, `/reading-plans/:planId`, `/challenges/:challengeId`, `/verse/:id`, `/prayer/:id`. Redirect routes: `/devotional`, `/reading-plans`, `/challenges`, `/pray`, `/journal`, `/meditate`, `/scripture`, `/bible/search`, `/music/playlists`, `/music/ambient`, `/music/sleep`. Stub routes: `/login`, `/register`. Dev routes: `/dev/mood-checkin`. System routes: `/health`.

### Bible plans manifest (for dynamic metadata + OG card filenames)

`frontend/src/data/bible/plans/manifest.json` contains 4 plans — slug / shortTitle / duration:
- `psalms-30-days` / "Psalms" / 30 days
- `john-story-of-jesus` / "John" / 21 days
- `when-youre-anxious` / "Anxious" / 14 days
- `when-you-cant-sleep` / "Sleep" / 7 days

These are the Bible-redesign plans that `/bible/plans/:slug` and `/bible/plans/:slug/day/:dayNumber` render. The spec's inventory refers to them via legacy filenames (`anxiety.png`, `sleep.png`, `psalms-30.png`, `jesus-john.png`) — Step 7 reconciles the filenames to match the actual slugs for clarity: `when-youre-anxious.png`, `when-you-cant-sleep.png`, `psalms-30-days.png`, `john-story-of-jesus.png`.

### BB-38 URL param contract (verified via `_plans/recon/bb38-url-formats.md` reference in spec)

- `/bible/:book/:chapter` uses `?verse=`, `?scroll-to=`, `?action=` params. `BibleReader.tsx:679` already passes explicit `canonical={...}` override to collapse all three.
- `/daily` uses `?tab=` (stripped via UI_STATE_PARAMS), and also `?verseRef=`, `?verseText=`, `?verseTheme=` (Spec Z verse pass-through). The latter three are NOT in `UI_STATE_PARAMS` today — Step 3 adds them.
- `/bible` uses `?mode=search&q=...` — these must survive in the canonical URL (they ARE the content identity for search pages)
- `/bible/plans/:slug/day/:dayNumber` uses `?verse=` — must strip via explicit canonical override (same pattern as BibleReader)

### Test patterns to match

- Page tests use `MemoryRouter` with `initialEntries` — `<SEO>` renders are no-ops due to the global `react-helmet-async` mock in `test/setup.ts`
- `SEO.test.tsx` is the only test that unmocks `react-helmet-async`. It uses `vi.unmock('react-helmet-async')` + `const { HelmetProvider } = await import('react-helmet-async')` + helper `renderSEO(props, initialEntry = '/')` that wraps with `HelmetProvider` + `MemoryRouter`
- Test cleanup: `beforeEach` clears `document.title` and removes all meta/link/script tags from `document.head`
- BB-38 pattern for URL-writing hook tests: `LocationSpy` component mounted inside MemoryRouter reads `useLocation()` into a ref for assertion (`frontend/src/hooks/url/__tests__/useVerseSelection.test.tsx` is the canonical example)

### Shared data models from master plan

N/A — standalone spec. No shared models.

---

## Auth Gating Checklist

**BB-40 adds zero new auth gates.** The `<SEO>` component emits the same metadata regardless of authentication state — intentional and correct because crawlers and social scrapers are by definition unauthenticated.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| (none) | N/A | N/A | N/A |

The Auth Gating Checklist is empty by design. If this plan adds an auth check anywhere, it is a scope violation.

---

## Design System Values (for OG card images — Step 7)

OG card visual composition must match the Worship Room cinematic dark theme. Values pulled from `_plans/recon/design-system.md` and `.claude/rules/09-design-system.md`:

| Element | Property | Value | Source |
|---------|----------|-------|--------|
| Background base | color | `#08051A` (`bg-hero-bg`) | 09-design-system.md § "Color Palette" |
| Background accent | gradient | `radial-gradient(circle at 50% 40%, rgba(139,92,246,0.35) 0%, rgba(109,40,217,0.18) 40%, transparent 70%)` | 09-design-system.md § "Round 3 Visual Patterns / Glow Backgrounds" (emotional-peak opacity range 0.35-0.50) |
| Primary purple | hex | `#6D28D9` (`primary`) | 09-design-system.md § "Color Palette" |
| Primary light | hex | `#8B5CF6` (`primary-lt`) | 09-design-system.md § "Color Palette" |
| Wordmark font | family | Caveat 700 (the app's logo font — NOT for headings, but IS the brand wordmark) | 09-design-system.md § "Typography" + `04-frontend-standards.md` (Caveat reserved for logo/wordmark) |
| Title font | family | Inter 700 | 09-design-system.md § "Typography" |
| Title color | effect | `WHITE_PURPLE_GRADIENT` (white `#FFFFFF` → purple `#8B5CF6`) via linear-gradient clipped to text, mimicking `GRADIENT_TEXT_STYLE` | `frontend/src/constants/gradients.tsx` (canonical) |
| Subtitle color | hex | `#FFFFFF` at 80% alpha | 09-design-system.md § "Text Opacity Standards" |
| Image dimensions | px | 1200 × 630 | Facebook/LinkedIn/Twitter canonical OG size (spec) |
| Safe zone | px | Center 1100 × 530 (50px margin each side) | spec § "Design Notes" |
| File size ceiling | bytes | 102400 (100 KB per file) | spec acceptance criterion |
| Total weight ceiling | bytes | 1572864 (1.5 MB for full set) | spec acceptance criterion |

**Wordmark decision:** The codebase renders the Worship Room wordmark in the navbar via a text node styled with `font-script` (Caveat). There is NO SVG or PNG wordmark asset in `frontend/public/`. Step 7 creates the wordmark inside the OG card rendering path — either by embedding Caveat via `canvas.font = '700 64px Caveat'` (Node `canvas` package supports registered fonts via `registerFont`) or by rasterizing the text via `sharp` + SVG.

---

## Design System Reminder

**BB-40 has almost no page UI work**, so most Daily Hub Round 3 reminders do NOT apply. The reminders below are the ones relevant to this spec:

- **Do NOT move `<SEO>` out of `frontend/src/components/SEO.tsx`.** The inbound spec's proposed `components/seo/SEO.tsx` path is rejected. Moving the component breaks 39 existing import paths with zero upside.
- **Do NOT rename or remove any existing `<SEO>` prop.** Additive props only (the plan adds `ogImageAlt` as an optional prop — nothing else).
- **Do NOT touch `index.html` `<head>` defaults.** They are the fallback for non-JS crawlers and for routes without per-route metadata.
- **Do NOT add a sitemap, robots.txt, or any deployment-layer config.** `frontend/public/robots.txt` and `frontend/public/sitemap.xml` already exist — BB-40 does not modify them (deployment spec concern). The spec explicitly excludes this.
- **Do NOT remove the global `react-helmet-async` mock in `test/setup.ts`.** Tests that need real Helmet behavior must use `vi.unmock('react-helmet-async')` at the top of the individual test file (follow `SEO.test.tsx` pattern).
- **Do NOT touch pre-existing failing tests.** Same posture as BB-30 through BB-38.
- **OG card design must NOT feel default or generic.** The app's positioning is cinematic dark sanctuary. A stock-photo or clip-art card undermines that. But also must NOT over-design to the point of being unreadable at thumbnail (500×260). Primary readability target: wordmark + page title legible at thumbnail.
- **Every new title must be ≤ 46 characters raw** (60 chars minus the 14-char ` | Worship Room` suffix the `SEO` component appends). Routes that pass `noSuffix` (Home) can use up to 60 chars raw.
- **Every new description must be ≤ 160 characters** (Google SERP snippet cutoff).
- **`SEO.tsx` appends the suffix via `noSuffix ? title : \`${title} | Worship Room\``.** This is the 14-char suffix. The plan's title length validation in Step 4's test file uses this formula.
- **Do NOT introduce any new npm packages.** BB-40 uses only what's already installed. (If Step 7 chooses the generation-script approach, it adds `sharp` as a dev dependency only if not already present — Step 7 verifies before adding.)

**Source:** `.claude/rules/09-design-system.md`, the spec's "Reality check" section, recent BB-38 plan Execution Log (no design system deviations — BB-38 was a routing spec).

---

## Shared Data Models

**BB-40 adds one new TypeScript module at `frontend/src/lib/seo/routeMetadata.ts`. Type shapes:**

```typescript
// frontend/src/lib/seo/routeMetadata.ts

export interface StaticRouteMetadata {
  title: string
  description: string
  ogImage?: string    // path under /public/ — defaults to /og-default.png via SEO.tsx fallback
  ogImageAlt?: string // NEW optional prop (additive to SEO component — Step 2 adds it)
  noIndex?: boolean
  noSuffix?: boolean  // only used for HOME_METADATA which supplies its own full title
}

export interface DynamicMetadata {
  title: string
  description: string
  ogImage?: string
  ogImageAlt?: string
  canonical?: string  // builder may override canonical for routes whose path contains variable segments
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noIndex?: boolean
}
```

**localStorage keys this spec touches:** NONE. BB-40 reads exclusively from bundled static content (`routeMetadata.ts`, `frontend/src/data/bible/plans/manifest.json` via existing `usePlan` hook, `frontend/src/data/bible/books/json/*.json` via existing `getBookBySlug`).

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | BB-40 introduces zero localStorage keys |

---

## Responsive Structure

BB-40 has no visible page UI. The only "responsive" surface is the OG card images, which render at a fixed 1200×630 and are downscaled by each platform. No app-side breakpoints apply.

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| (none) | — | BB-40 emits meta tags only. No visible UI. No responsive breakpoints. |

---

## Inline Element Position Expectations

N/A — BB-40 has no inline-row layouts. No visible UI is introduced.

---

## Vertical Rhythm

N/A — BB-40 has no section layout work. No vertical-rhythm assertions apply.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-38 is shipped and committed (verified — `f5eabf5 bb-38-verification-followups`, `1339c6b bb-38-deep-linking-architecture` on `bible-redesign`)
- [ ] `react-helmet-async@^2.0.5` is installed (verified)
- [ ] `<HelmetProvider>` wraps the React tree (verified at `App.tsx:162-241`)
- [ ] `<SEO>` component exists at `frontend/src/components/SEO.tsx` (verified)
- [ ] `frontend/public/og-default.png` exists as fallback (verified)
- [ ] Bible plans manifest contains 4 slugs (verified — `psalms-30-days`, `john-story-of-jesus`, `when-youre-anxious`, `when-you-cant-sleep`)
- [ ] `VITE_SITE_URL` fallback to `'https://worshiproom.com'` is acceptable for local dev (verified — no `.env.local` setting required for BB-40 to function)
- [ ] All auth-gated actions from the spec are accounted for (N/A — zero auth gates)
- [ ] Design system values are verified (loaded from 2026-04-05 recon, 6 days old, fresh)
- [ ] All [UNVERIFIED] values flagged with verification methods (see below)
- [ ] Prior specs in the sequence are complete and committed (BB-30 through BB-38)
- [ ] No deprecated patterns introduced (BB-40 touches no visible UI)
- [ ] **User has approved the final title/description draft list produced in Step 1 before Step 5 begins.** This is a hard stop gate.
- [ ] **User has approved the OG card generation approach (script vs hand-designed) and at least one sample card before Step 7 produces the remaining 13 cards.** This is a hard stop gate.
- [ ] **User has made the `canonicalUrl.ts` extraction decision (Step 3) — the plan's recommendation is to extract.**

### [UNVERIFIED] values

1. **The exact character budgets for titles and descriptions.**
   - Current guess: Raw title ≤ 46 chars (so suffixed ≤ 60). Description ≤ 160 chars.
   - To verify: Run Google's SERP snippet preview tool (manual, post-deploy checklist item) against a few representative titles after production `VITE_SITE_URL` is set. The 46/160 limits are conservative industry defaults and safe for Step 4's length-limit tests.
   - If wrong: Adjust the limits in `routeMetadata.test.ts` and re-run; the constants file is unchanged.

2. **Whether `<script type="application/ld+json">` tags survive `HelmetProvider` as direct children.**
   - Current behavior: `SEO.tsx:79-83` renders `<script type="application/ld+json">{JSON.stringify(item)}</script>` as direct children of `<Helmet>`. The existing DailyHub, MyBible, Home, BibleLanding pages do this successfully.
   - To verify: Step 9 adds an integration test that mounts `BibleReader` with real Helmet and asserts the JSON-LD `<script>` tag is present in `document.head`. If react-helmet-async v2 does not render script tags inside Helmet, the test fails and we fall back to rendering the script tag outside of `<Helmet>` in a hidden wrapper (existing BB-38/pre-BB-38 code does NOT hit this — it works today, so this is a safety [UNVERIFIED] only).
   - If wrong: Render JSON-LD outside of `<Helmet>` via a `<Helmet>` sibling with `{ script: [...] }` helmet prop, per react-helmet-async v2 API.

3. **Whether `sharp` is already installed as a dev dependency.**
   - To verify: Step 7 runs `grep '"sharp"' frontend/package.json` before invoking it.
   - If not installed: Step 7 either adds `sharp` as a dev dependency (user approval required since the scope guarantee says "zero new npm packages") OR falls back to generating cards via the `canvas` package (same scope concern) OR falls back to hand-designing PNGs in Figma (no dependency change but more manual work). Default: hand-design the 14 cards in Figma/Canva and commit the optimized PNGs directly, so BB-40's scope guarantee of zero new packages holds. Step 7 pauses for user approval on the approach before proceeding.

4. **Whether existing tests for pages that render `<SEO>` break when those pages are changed to import from `routeMetadata.ts`.**
   - Baseline: The global `react-helmet-async` mock in `test/setup.ts` means the `<SEO>` render is a no-op in every page test. Changing `<SEO title="..." description="..." />` to `<SEO {...DAILY_HUB_PRAY_METADATA} />` spreads the same props object — same behavior, test result should be unchanged.
   - To verify: Step 5 runs `pnpm test` before and after each page migration. If any page test fails, it fails because of a structural issue (e.g., the page reads a prop from the metadata object that doesn't exist), not because of the Helmet mock. Fix in place.
   - If wrong: Abort the migration for the offending page, file a note in the Execution Log, and investigate.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Should `canonicalUrl.ts` be extracted from `SEO.tsx` into its own module? | YES — extract | The helper is used by the metadata module's dynamic builders (search canonical, plan day canonical), unit tests exercise it in isolation without rendering `<SEO>` under a provider, and the extraction is one file + one import swap with low regression risk. The spec lists it as "optional — plan phase decides." This plan decides to extract. |
| Which OG card generation approach? | Hand-designed in Figma/Canva, exported as optimized PNGs | Zero new npm packages (scope guarantee). Figma/Canva can batch-export consistently. The 14-card set is small enough to hand-iterate. Script-based generation would add `sharp` or `canvas` as a dependency, violating scope. |
| Does `frontend/public/og-default.png` move into `/og/`? | NO — leave it at the root `/og-default.png` path | Any external cache (Facebook, Twitter, LinkedIn) that has fetched the old URL would 404 if moved. The cost of moving is higher than the cost of leaving it in place. The spec explicitly allows this choice. |
| Should `<SEO>` get an `ogImageAlt` prop? | YES — additive optional prop | Accessibility improvement for the rendered `og:image:alt` meta tag. Purely additive, does not break any call site. Step 2 adds it. Default behavior (no `alt` tag emitted) preserved when prop is absent. |
| Is the `/login` stub noIndex? | YES | Phase 3 will ship real auth; until then the page is a stub that should not be indexed. `ComingSoon` already sets `noIndex`. Verify, do not change. |
| Is `/register` stub noIndex? | YES — add noIndex to `RegisterPage.tsx` | Currently NOT noIndex. Step 5 adds it as part of the migration pass. |
| Is `/bible/my` noIndex? | YES — add noIndex to `MyBiblePage.tsx` | Currently NOT noIndex. Step 5 adds it. |
| Is `/prayer-wall/user/:id` noIndex? | NO — leave indexable | Public prayer profile pages are intentionally shareable. The spec's default posture. |
| Should the Dashboard (`/` logged-in) be `noIndex`? | NO — MUST remain indexable | The root route serves `Home` to logged-out crawlers, and `Home` must be indexable. `noIndex` on the root route de-indexes the home page. The current behavior is correct; do not change. |
| Which Daily Hub tabs get per-tab metadata? | All 4 — devotional, pray, journal, meditate | All four tabs share canonical `/daily` but have distinct OG previews. Step 6 implements. |
| Is `?view=` on `/bible/my` added to UI_STATE_PARAMS? | NO | The page is `noIndex`. Canonical cosmetics do not matter when the page is de-indexed. Scope guard. |
| Does BB-40 add `q`, `mode`, or `verse` to UI_STATE_PARAMS? | NO | `?q=` and `?mode=` ARE part of the search canonical (`/bible?mode=search&q=love`). `?verse=` is handled via explicit `canonical` override at the call site. Adding any of these to the strip list would break search SEO. |
| Does BB-40 add `verseRef`, `verseText`, `verseTheme` to UI_STATE_PARAMS? | YES — Step 3 | Spec Z verse pass-through. Must be stripped from the `/daily` canonical. No other route uses these param names (verified via grep in Step 3). |
| Should `BibleReader.tsx` also call an explicit canonical builder from `routeMetadata.ts`? | YES — use `buildBibleChapterMetadata` which internally sets `canonical: \`/bible/${bookSlug}/${chapterNumber}\`` | Keeps the canonical override next to the rest of the metadata. The existing inline `canonical={...}` prop is replaced by spreading the builder result. |
| Does BB-40 add a build-time check for OG image file sizes? | YES — a pnpm script `pnpm og-check` that runs `node scripts/check-og-sizes.mjs` and exits non-zero if any file under `frontend/public/og/*.png` exceeds 100 KB | Prevents future accidental bloat. Step 7 adds the script. Not wired to CI (deployment concern), just runnable locally. |
| How is the `ogImage` path passed through? | Relative path under `/public/` (e.g. `'/og/daily-pray.png'`) | `SEO.tsx:55` prepends `${SITE_URL}` to the path to produce the absolute OG image URL. The metadata module uses relative paths only; `SEO.tsx` does the URL composition. |
| Does Home's OG image change? | Migrate from `/og-default.png` fallback to explicit `/og/home.png` | `Home.tsx` today passes no `ogImage` prop, falling back to `/og-default.png`. Step 5 migrates it to import `HOME_METADATA` from `routeMetadata.ts` which explicitly sets `ogImage: '/og/home.png'`. The old `og-default.png` remains as the module-level default for routes that don't specify an image. |
| Is `?verse=` on `/bible/plans/:slug/day/:dayNumber` stripped? | YES — via explicit canonical override in `buildBiblePlanDayMetadata` | Same pattern as BibleReader: the builder sets `canonical: \`/bible/plans/${slug}/day/${dayNumber}\`` so `SEO.tsx` skips query-param pass-through. |
| Does `AskPage` get JSON-LD? | NO (beyond what exists today — verify during recon Step 1) | The spec's JSON-LD inventory does not add AskPage. The page is content-thin for crawlers (AI responses are runtime-generated and not indexable). |
| How are BiblePlanDetail/BiblePlanDay titles built when `plan.title` contains a colon or special characters? | Pass through verbatim; trust the manifest content | Plan titles in the manifest are curated strings. No sanitization needed. Step 4 tests with real manifest titles to confirm the length limit still holds. |
| What happens if `BiblePlanDetail` is rendered with an invalid slug? | The page already renders an error state (`isError || !plan`) at line 35-46. The SEO component is rendered BEFORE the error return, or is rendered inside each branch. Step 8 renders `<SEO>` inside the valid branch only, with a separate minimal `<SEO noIndex>` for the error branch (titled "Reading Plan Not Found"). | Matches the existing NotFound pattern. |

---

## Implementation Steps

### Step 1: Draft all titles and descriptions + produce `_plans/recon/bb40-seo-metadata.md` (HARD STOP — user approval required before Step 2)

**Objective:** Produce the full route inventory, canonical URL strategy, OG card image inventory, noindex list, and every title/description string as an open-review document. **Pause for user approval before any code changes.**

**Files to create/modify:**

- `_plans/recon/bb40-seo-metadata.md` — NEW. Full recon documentation.

**Details:**

1. Re-grep `frontend/src/pages` for `<SEO` to confirm the 39-page baseline and the 2 gap files (`BiblePlanDetail.tsx`, `BiblePlanDay.tsx`). Report any newly-discovered gaps.
2. Enumerate every route from `frontend/src/App.tsx:174-230` into a table: path → component → current SEO state → target canonical URL → target noIndex flag → target OG image → notes.
3. For each route, draft:
   - **Title** (raw, without suffix) — ≤ 46 chars for suffixed routes, ≤ 60 for `noSuffix` routes (Home only)
   - **Description** — ≤ 160 chars, specific to the page (not boilerplate)
4. For dynamic routes (`/bible/:book/:chapter`, `/bible/plans/:slug`, `/bible/plans/:slug/day/:dayNumber`, `/bible?mode=search&q=...`), draft a template string and show 2-3 concrete examples with real data (e.g., "Philippians 4", "30 Days in the Psalms", "Day 5 — 30 Days in the Psalms", "Search: anxiety").
5. For the 4 Daily Hub tab variants, draft 4 distinct titles + descriptions + OG image paths sharing canonical `/daily`.
6. Document the canonical URL strategy table from the spec, reconciled against reality after recon. Note which params are stripped, which survive, which are handled via explicit overrides.
7. List all 14 new OG card paths plus the existing `og-default.png`, with filename, dimensions, size budget, and a one-line visual brief.
8. List all routes that will be flagged `noIndex` (with rationale for each).
9. Include a **Manual post-deploy validation checklist**: Twitter Card Validator URL, Facebook Sharing Debugger URL, LinkedIn Post Inspector URL, Google Rich Results Test URL, a list of representative URLs to test (home, 1 Bible chapter, 1 Daily Hub tab variant, 1 plan day), and a list of manual share tests (iMessage, Discord, Slack, WhatsApp).
10. List follow-up items deferred to future specs (sitemap, dynamic OG images, SSR).
11. Append a **BB-39 handoff note** at the bottom listing the full set of routes that BB-39 should precache in the service worker (every indexable content route).
12. **Test compatibility enumeration** (new deliverable, same posture as BB-38's test compatibility analysis): produce a "BB-40 Test Compatibility Analysis" section in the recon doc containing:

    a. **Affected test files.** Enumerate every existing test file that renders or snapshots a page BB-40 will touch. Run `find frontend/src -name "*.test.tsx" -o -name "*.test.ts"` and cross-reference against the list of pages edited in Steps 5, 6, 8, 9. Likely candidates (verify each during recon, do not trust this list verbatim):
       - `frontend/src/pages/__tests__/BibleReader.test.tsx`
       - `frontend/src/pages/__tests__/DailyHub.test.tsx`
       - `frontend/src/pages/__tests__/BiblePlanDay.test.tsx` (may not exist — BB-40 adds it in Step 8 if absent)
       - `frontend/src/pages/__tests__/BiblePlanDetail.test.tsx` (may not exist)
       - `frontend/src/pages/__tests__/MyBiblePage.test.tsx` or `MyBible.test.tsx`
       - `frontend/src/pages/__tests__/BibleLanding.test.tsx`
       - `frontend/src/pages/__tests__/Home.test.tsx`
       - `frontend/src/pages/__tests__/Dashboard.test.tsx`
       - `frontend/src/pages/__tests__/AskPage.test.tsx`
       - `frontend/src/pages/__tests__/PrayerWall.test.tsx`
       - `frontend/src/pages/__tests__/Settings.test.tsx` (confirmed present via grep — already imports `<SEO`)
       - `frontend/src/pages/__tests__/GrowthProfile.test.tsx` (confirmed present)
       - Any other `pages/__tests__/*.test.tsx` and `pages/meditate/__tests__/*.test.tsx`

       For each file, record: path, which BB-40-touched page it covers, number of tests, and whether the test file currently imports `HelmetProvider` or relies on the global `react-helmet-async` mock.

    b. **Classification by sensitivity.** For each file, classify how it asserts against meta tags (if at all):
       - **Category 1 — Global mock only (no sensitivity):** Test relies entirely on the `test/setup.ts` global `react-helmet-async` mock. `<SEO>` is a no-op. Changing the `<SEO>` call site props is invisible to the test. **Expected: zero test changes.**
       - **Category 2 — Snapshot of page render:** Test uses `toMatchSnapshot()` or `toMatchInlineSnapshot()` against the page render. Since `<SEO>` is mocked to return null, the snapshot does not contain meta tags — changing SEO props is invisible. **Expected: zero test changes unless the snapshot was captured AFTER unmocking Helmet locally, which is unusual.**
       - **Category 3 — Direct `document.head` / `document.title` assertions:** Test queries `document.querySelector('meta[...]')`, `document.title`, `document.querySelector('link[rel="canonical"]')`, or `document.querySelector('script[type="application/ld+json"]')`. These tests must unmock `react-helmet-async` locally AND wrap with `HelmetProvider`. **Expected: if the test already does this (like `SEO.test.tsx`), it's fine. If it was asserting the OLD inline literal strings, it must be updated to reference the metadata constants from `routeMetadata.ts`.**
       - **Category 4 — Page integration test that happens to mount `<SEO>` but does not assert against it:** The test renders the full page tree. `<SEO>` is mocked to null. These tests work unchanged. **Expected: zero test changes.**
       - **Category 5 — Tests that unwrap `<SEO>` via a custom render helper or rely on `HelmetProvider` being wrapped manually:** Rare, but possible. **Expected: render setup may need a HelmetProvider wrapper added if the page now uses a new import path that forces re-evaluation of the module.**

    c. **Change scope estimate per test file.** For each affected file, mark one of:
       - **NO CHANGE** — the test works unchanged because it's Category 1, 2, or 4
       - **RENDER SETUP UPDATE** — add `HelmetProvider` wrapper to the test's render helper (expected for Category 3 tests that currently assert real meta tags)
       - **ASSERTION UPDATE** — the test asserts against specific inline title/description strings that are now in `routeMetadata.ts`. Update the test to import the constant and assert against it.
       - **SNAPSHOT UPDATE** — a Category 2 test's snapshot was captured with real Helmet output and needs a refresh. Run the test once after Step 5's migration for that page; if the snapshot diffs, review the diff manually and update via `pnpm test -- -u` if the new snapshot matches the new metadata constant's values.
       - **SUBSTANTIAL REWRITE FLAG** — anything beyond the above (e.g., the test asserts against `SEO` internals in a way the metadata consolidation breaks). **If any test file is flagged SUBSTANTIAL REWRITE, pause and surface it to the user in the Step 1 HARD STOP report — it may indicate a scope problem.**

    d. **Baseline test count.** Run `pnpm test 2>&1 | tail -20` in `frontend/` during recon and capture the current pass/fail count. This becomes the baseline Step 10 compares against — "zero test regressions" means the post-BB-40 count matches this baseline exactly (pre-existing failures unchanged, no new failures introduced).

    e. **Flag SUBSTANTIAL REWRITE cases.** Any test that requires more than RENDER SETUP UPDATE / ASSERTION UPDATE / SNAPSHOT UPDATE is flagged in the recon doc as a risk item. Same posture as BB-38: if the list is non-empty, the user decides whether to proceed, scope-trim the affected page from BB-40, or rewrite the test.

**HARD STOP after writing this document.** The plan does not proceed to Step 2 until the user has reviewed and approved (a) the draft titles and descriptions for every route, (b) the OG card inventory, and (c) the BB-40 Test Compatibility Analysis. The user may request string rewrites or scope adjustments before approval — iterate on the document until approved.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT start editing page files or creating `routeMetadata.ts` before this document is approved.
- DO NOT invent plan slugs or titles — use the actual values from `frontend/src/data/bible/plans/manifest.json`.
- DO NOT default any description to "Worship Room is a Christian emotional healing app" — every description must be page-specific.
- DO NOT include any user-identifying content in drafts (no `${userName}` interpolation, no personal content).
- DO NOT begin Step 2 before explicit user approval is recorded in the chat.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (none) | — | Step 1 produces a documentation artifact only. No code, no tests. |

**Expected state after completion:**
- [ ] `_plans/recon/bb40-seo-metadata.md` exists with every section populated
- [ ] All 41 route inventory rows are complete (39 existing + 2 gap)
- [ ] All draft titles are ≤ 46 chars (or ≤ 60 for `noSuffix` routes)
- [ ] All draft descriptions are ≤ 160 chars
- [ ] All OG card paths listed with per-card visual brief
- [ ] BB-40 Test Compatibility Analysis section populated with every affected test file enumerated, classified by category, and assigned a change scope
- [ ] Baseline `pnpm test` count captured in the recon doc
- [ ] Zero test files flagged SUBSTANTIAL REWRITE (or, if any are flagged, surfaced in the HARD STOP report)
- [ ] User has reviewed and approved (a) the strings, (b) the OG card inventory, and (c) the test compatibility analysis

---

### Step 2: Add `ogImageAlt` optional prop to `SEO.tsx`

**Objective:** Add a single optional prop to the existing SEO component so metadata entries can supply an alt description for the OG image. Pure additive change — no other behavior changes.

**Files to create/modify:**

- `frontend/src/components/SEO.tsx` — MODIFY. Add `ogImageAlt?: string` to `SEOProps` and emit `<meta property="og:image:alt" content={ogImageAlt} />` + `<meta name="twitter:image:alt" content={ogImageAlt} />` when provided.

**Details:**

1. Add `ogImageAlt?: string` to the `SEOProps` interface (after `ogType`, before `canonical`).
2. Destructure `ogImageAlt` in the component signature.
3. Inside the `<Helmet>` render, AFTER the existing `<meta property="og:image" ... />` line, conditionally emit:
   ```tsx
   {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
   ```
4. AFTER the existing `<meta name="twitter:image" ... />` line, conditionally emit:
   ```tsx
   {ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}
   ```
5. Do NOT change any other prop, default, or render order.
6. Update `frontend/src/components/__tests__/SEO.test.tsx` with 2 new cases:
   - When `ogImageAlt="Daily Hub pray tab preview"` is passed, `document.querySelector('meta[property="og:image:alt"]').getAttribute('content')` equals `"Daily Hub pray tab preview"`.
   - When `ogImageAlt` is absent, `document.querySelector('meta[property="og:image:alt"]')` is `null`.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT rename or remove any existing prop.
- DO NOT change the default value of `ogType` from `'website'`.
- DO NOT modify the existing `buildCanonicalUrl` helper inside this step — Step 3 handles that.
- DO NOT move `<SEO>` to a different path.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Passes `ogImageAlt` renders `og:image:alt` meta tag with correct content | unit | Extends `SEO.test.tsx`. |
| Omits `ogImageAlt` does NOT render `og:image:alt` meta tag | unit | Extends `SEO.test.tsx`. |
| Passes `ogImageAlt` renders `twitter:image:alt` meta tag | unit | Extends `SEO.test.tsx`. |

**Expected state after completion:**
- [ ] `SEO.tsx` has the new prop
- [ ] All 39 existing `<SEO>` call sites still compile (no breaking changes)
- [ ] 3 new tests pass in `SEO.test.tsx`
- [ ] `pnpm test` green, no regressions

---

### Step 3: Extract `buildCanonicalUrl` to `frontend/src/lib/seo/canonicalUrl.ts` and extend UI_STATE_PARAMS

**Objective:** Move the canonical URL helper out of `SEO.tsx` so it can be unit-tested directly and reused by `routeMetadata.ts` builders. Extend `UI_STATE_PARAMS` to strip Spec Z verse pass-through params from the `/daily` canonical.

**Files to create/modify:**

- `frontend/src/lib/seo/canonicalUrl.ts` — NEW. Exports `buildCanonicalUrl(pathname, search, canonicalOverride?)` and `UI_STATE_PARAMS` constant. Reads `SITE_URL` from `frontend/src/components/SEO.tsx` (re-exported constant) — actually, move `SITE_URL` into this file and re-export it from `SEO.tsx` for backwards compatibility.
- `frontend/src/components/SEO.tsx` — MODIFY. Import `buildCanonicalUrl` and `SITE_URL` from `@/lib/seo/canonicalUrl`. Re-export `SITE_URL` as a named export so the 2 existing importers (`Home.tsx:10`, `MyBiblePage.tsx:8`) keep working.
- `frontend/src/lib/seo/__tests__/canonicalUrl.test.ts` — NEW. At least 10 unit tests.

**Details:**

1. Create `frontend/src/lib/seo/canonicalUrl.ts`:

   ```typescript
   // Single source of truth for canonical URL construction.
   // Previously lived inside SEO.tsx — extracted in BB-40 so dynamic metadata
   // builders can reuse the helper and so the logic can be unit-tested in isolation.

   export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://worshiproom.com'

   /**
    * Query params that represent UI state (not content) and should be stripped
    * from canonical URLs.
    *
    * - 'tab'       — Daily Hub tab selector (Devotional/Pray/Journal/Meditate share /daily)
    * - 'verseRef'  — Spec Z verse pass-through from Devotional → Meditate
    * - 'verseText' — Spec Z verse pass-through
    * - 'verseTheme'— Spec Z verse pass-through
    *
    * Params intentionally NOT in this list:
    * - 'q', 'mode'         — part of /bible?mode=search&q=... canonical; stripping would break search SEO
    * - 'verse'             — handled via explicit canonical override at BibleReader.tsx and BiblePlanDay metadata builder
    * - 'scroll-to', 'action' — handled via explicit canonical override at BibleReader.tsx (same override suppresses them)
    * - 'view'              — MyBible is noIndex; canonical cosmetics don't matter
    */
   export const UI_STATE_PARAMS = ['tab', 'verseRef', 'verseText', 'verseTheme'] as const

   export function buildCanonicalUrl(
     pathname: string,
     search: string,
     canonicalOverride?: string,
   ): string {
     const path = canonicalOverride ?? pathname

     const params = new URLSearchParams(search)
     const filteredParams = new URLSearchParams()
     params.forEach((value, key) => {
       if (!(UI_STATE_PARAMS as readonly string[]).includes(key)) {
         filteredParams.set(key, value)
       }
     })

     // If canonical is overridden, don't append query params from current URL
     const queryString = canonicalOverride ? '' : filteredParams.toString()
     const cleanPath = path.replace(/\/+$/, '') || '/'
     const url = `${SITE_URL}${cleanPath}`

     return queryString ? `${url}?${queryString}` : url
   }
   ```

2. Update `frontend/src/components/SEO.tsx`:
   - Remove the local `SITE_URL` declaration, `UI_STATE_PARAMS` constant, and `buildCanonicalUrl` function.
   - Add `import { buildCanonicalUrl, SITE_URL } from '@/lib/seo/canonicalUrl'`.
   - Re-export `SITE_URL` as a named export: `export { SITE_URL } from '@/lib/seo/canonicalUrl'` (or add `// eslint-disable-next-line react-refresh/only-export-components` comment if needed — match the existing disable comment style at SEO.tsx:4).
   - Verify `Home.tsx:10` (`import { SEO, SITE_URL } from '@/components/SEO'`) and `MyBiblePage.tsx:8` (same import) continue to work.

3. Create `frontend/src/lib/seo/__tests__/canonicalUrl.test.ts` with at least 10 tests:
   - Test: `buildCanonicalUrl('/', '')` returns `'https://worshiproom.com/'`
   - Test: `buildCanonicalUrl('/daily', '')` returns `'https://worshiproom.com/daily'`
   - Test: `buildCanonicalUrl('/daily', '?tab=pray')` strips `?tab=pray`, returns `'https://worshiproom.com/daily'`
   - Test: `buildCanonicalUrl('/daily', '?tab=meditate&verseRef=John%204%3A14&verseText=Whoever&verseTheme=living-water')` strips all 4 params, returns `'https://worshiproom.com/daily'`
   - Test: `buildCanonicalUrl('/bible', '?mode=search&q=love')` preserves `?mode=search&q=love`, returns `'https://worshiproom.com/bible?mode=search&q=love'`
   - Test: `buildCanonicalUrl('/bible/genesis/1', '?verse=3&action=reflect', '/bible/genesis/1')` uses the override, does NOT append `?verse=3&action=reflect`, returns `'https://worshiproom.com/bible/genesis/1'`
   - Test: `buildCanonicalUrl('/bible/plans/psalms-30-days/day/5', '?verse=3', '/bible/plans/psalms-30-days/day/5')` uses the override, does NOT append `?verse=3`
   - Test: `buildCanonicalUrl('/settings/', '')` normalizes trailing slash → `'https://worshiproom.com/settings'`
   - Test: `buildCanonicalUrl('', '')` handles empty path → `'https://worshiproom.com/'`
   - Test: `buildCanonicalUrl('/grow', '?tab=plans&source=email')` strips `?tab=plans` but preserves `?source=email` → `'https://worshiproom.com/grow?source=email'`

4. Run `pnpm test` to confirm `SEO.test.tsx` still passes (the SEO component behavior is unchanged; only the helper location moved).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT remove the `SITE_URL` re-export from `SEO.tsx` — it is imported by `Home.tsx:10` and `MyBiblePage.tsx:8`. Breaking those imports would be a regression outside BB-40's scope.
- DO NOT add `q`, `mode`, `verse`, `scroll-to`, `action`, or `view` to `UI_STATE_PARAMS`.
- DO NOT change the behavior of the `canonicalOverride` parameter — it still suppresses query-param pass-through entirely.
- DO NOT remove the `// eslint-disable-next-line react-refresh/only-export-components` comment on `SITE_URL` if the re-export triggers the lint rule — match the existing disable style.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `buildCanonicalUrl` base behavior (pathname only, trailing slash normalization, empty path) | unit | 3 tests |
| `buildCanonicalUrl` strips UI_STATE_PARAMS | unit | 2 tests (`tab`, all 4 Spec Z params) |
| `buildCanonicalUrl` preserves non-UI params (`q`, `mode`, `source`) | unit | 2 tests |
| `buildCanonicalUrl` with `canonicalOverride` suppresses query pass-through | unit | 2 tests (chapter override, plan day override) |
| `buildCanonicalUrl` mixed strip + preserve | unit | 1 test (`?tab=plans&source=email`) |
| `SEO.test.tsx` still passes unchanged | regression | existing tests |

**Expected state after completion:**
- [ ] `frontend/src/lib/seo/canonicalUrl.ts` exists
- [ ] `SEO.tsx` imports from the new module
- [ ] `SITE_URL` named export is still available from `@/components/SEO`
- [ ] 10+ new tests pass in `canonicalUrl.test.ts`
- [ ] All existing SEO tests still pass
- [ ] `Home.tsx` and `MyBiblePage.tsx` imports still resolve
- [ ] `pnpm lint` clean

---

### Step 4: Create `frontend/src/lib/seo/routeMetadata.ts` with all static constants and builders

**Objective:** Create the single source-of-truth module for every title, description, and metadata property. Use the approved strings from Step 1.

**Files to create/modify:**

- `frontend/src/lib/seo/routeMetadata.ts` — NEW. Static constants + dynamic builders.
- `frontend/src/lib/seo/__tests__/routeMetadata.test.ts` — NEW. At least 15 tests.

**Details:**

1. Create the types and static constants. Structure:

   ```typescript
   import type { Plan } from '@/types/bible-plans' // or wherever the Plan type lives — verify via usePlan hook

   export interface StaticRouteMetadata {
     title: string
     description: string
     ogImage?: string
     ogImageAlt?: string
     noIndex?: boolean
     noSuffix?: boolean
   }

   export interface DynamicMetadata {
     title: string
     description: string
     ogImage?: string
     ogImageAlt?: string
     canonical?: string
     jsonLd?: Record<string, unknown> | Record<string, unknown>[]
     noIndex?: boolean
   }

   // Every title and description string BELOW comes from the Step 1 draft,
   // approved by the user before this step executes.

   export const HOME_METADATA: StaticRouteMetadata = {
     title: '<approved Home title — noSuffix, ≤60 chars>',
     description: '<approved Home description — ≤160 chars>',
     ogImage: '/og/home.png',
     ogImageAlt: 'Worship Room — Christian emotional healing and worship',
     noSuffix: true,
   }

   export const DAILY_HUB_DEVOTIONAL_METADATA: StaticRouteMetadata = { ... }
   export const DAILY_HUB_PRAY_METADATA: StaticRouteMetadata = { ... }
   export const DAILY_HUB_JOURNAL_METADATA: StaticRouteMetadata = { ... }
   export const DAILY_HUB_MEDITATE_METADATA: StaticRouteMetadata = { ... }

   export const BIBLE_LANDING_METADATA: StaticRouteMetadata = { ... }
   export const BIBLE_BROWSE_METADATA: StaticRouteMetadata = { ... }
   export const BIBLE_PLANS_BROWSER_METADATA: StaticRouteMetadata = { ... }
   export const MY_BIBLE_METADATA: StaticRouteMetadata = { ..., noIndex: true }

   export const ASK_METADATA: StaticRouteMetadata = { ... }
   export const GROW_METADATA: StaticRouteMetadata = { ... }
   export const MUSIC_METADATA: StaticRouteMetadata = { ... }
   export const MUSIC_ROUTINES_METADATA: StaticRouteMetadata = { ... }

   export const PRAYER_WALL_METADATA: StaticRouteMetadata = { ... }
   export const PRAYER_WALL_DASHBOARD_METADATA: StaticRouteMetadata = { ..., noIndex: true }

   export const CHURCHES_METADATA: StaticRouteMetadata = { ... }
   export const COUNSELORS_METADATA: StaticRouteMetadata = { ... }
   export const CELEBRATE_RECOVERY_METADATA: StaticRouteMetadata = { ... }

   export const MY_PRAYERS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const FRIENDS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const SETTINGS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const INSIGHTS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const INSIGHTS_MONTHLY_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const GROWTH_PROFILE_METADATA: StaticRouteMetadata = { ..., noIndex: true }

   export const MEDITATE_BREATHING_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const MEDITATE_SOAKING_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const MEDITATE_GRATITUDE_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const MEDITATE_ACTS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const MEDITATE_PSALMS_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const MEDITATE_EXAMEN_METADATA: StaticRouteMetadata = { ..., noIndex: true }

   export const REGISTER_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const LOGIN_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const NOT_FOUND_METADATA: StaticRouteMetadata = { ..., noIndex: true }
   export const HEALTH_METADATA: StaticRouteMetadata = { ..., noIndex: true }

   export const SHARED_VERSE_METADATA: StaticRouteMetadata = { ... }
   export const SHARED_PRAYER_METADATA: StaticRouteMetadata = { ... }

   export const READING_PLAN_DETAIL_METADATA: StaticRouteMetadata = { ... }
   export const CHALLENGE_DETAIL_METADATA: StaticRouteMetadata = { ... }
   export const PRAYER_DETAIL_METADATA: StaticRouteMetadata = { ... }
   export const PRAYER_WALL_PROFILE_METADATA: StaticRouteMetadata = { ... }
   ```

2. Create the dynamic builder functions. All builders import `buildCanonicalUrl` from `@/lib/seo/canonicalUrl` when they need to compute a canonical URL:

   ```typescript
   import { SITE_URL } from '@/lib/seo/canonicalUrl'

   export function buildBibleChapterMetadata(
     bookName: string,
     chapterNumber: number,
     bookSlug: string,
   ): DynamicMetadata {
     // Build the BreadcrumbList JSON-LD inline
     const jsonLd = {
       '@context': 'https://schema.org',
       '@type': 'BreadcrumbList',
       itemListElement: [
         { '@type': 'ListItem', position: 1, name: 'Worship Room', item: `${SITE_URL}/` },
         { '@type': 'ListItem', position: 2, name: 'Bible', item: `${SITE_URL}/bible` },
         { '@type': 'ListItem', position: 3, name: bookName, item: `${SITE_URL}/bible/browse` },
         { '@type': 'ListItem', position: 4, name: `${bookName} ${chapterNumber}`, item: `${SITE_URL}/bible/${bookSlug}/${chapterNumber}` },
       ],
     }

     return {
       title: `${bookName} ${chapterNumber} (WEB)`, // verify length ≤ 46 for longest book name; longest OT book name is "Ecclesiastes" (12 chars) + " 150 (WEB)" (10) = 22 — fits
       description: `Read ${bookName} chapter ${chapterNumber} from the World English Bible. Highlight verses, add notes, and listen to an audio reading.`,
       ogImage: '/og/bible-chapter.png',
       ogImageAlt: `${bookName} ${chapterNumber} — World English Bible`,
       canonical: `/bible/${bookSlug}/${chapterNumber}`,
       jsonLd,
     }
   }

   export function buildBiblePlanMetadata(
     slug: string,
     planTitle: string,
     planDescription: string,
   ): DynamicMetadata {
     const planOgImages: Record<string, string> = {
       'psalms-30-days': '/og/plans/psalms-30-days.png',
       'john-story-of-jesus': '/og/plans/john-story-of-jesus.png',
       'when-youre-anxious': '/og/plans/when-youre-anxious.png',
       'when-you-cant-sleep': '/og/plans/when-you-cant-sleep.png',
     }
     const jsonLd = {
       '@context': 'https://schema.org',
       '@type': 'BreadcrumbList',
       itemListElement: [
         { '@type': 'ListItem', position: 1, name: 'Bible', item: `${SITE_URL}/bible` },
         { '@type': 'ListItem', position: 2, name: 'Plans', item: `${SITE_URL}/bible/plans` },
         { '@type': 'ListItem', position: 3, name: planTitle, item: `${SITE_URL}/bible/plans/${slug}` },
       ],
     }
     // Truncate description to 157 chars + '...' if > 160
     const desc = planDescription.length > 160 ? `${planDescription.slice(0, 157)}...` : planDescription
     return {
       title: planTitle.length > 46 ? planTitle.slice(0, 43) + '...' : planTitle,
       description: desc,
       ogImage: planOgImages[slug] ?? '/og/bible-chapter.png',
       ogImageAlt: `${planTitle} — Worship Room reading plan`,
       canonical: `/bible/plans/${slug}`,
       jsonLd,
     }
   }

   export function buildBiblePlanDayMetadata(
     slug: string,
     planTitle: string,
     dayNumber: number,
     dayPassage: string,  // e.g., "John 1" or "Psalm 23"
   ): DynamicMetadata {
     const planOgImages: Record<string, string> = { /* same as above */ }
     const jsonLd = {
       '@context': 'https://schema.org',
       '@type': 'BreadcrumbList',
       itemListElement: [
         { '@type': 'ListItem', position: 1, name: 'Bible', item: `${SITE_URL}/bible` },
         { '@type': 'ListItem', position: 2, name: 'Plans', item: `${SITE_URL}/bible/plans` },
         { '@type': 'ListItem', position: 3, name: planTitle, item: `${SITE_URL}/bible/plans/${slug}` },
         { '@type': 'ListItem', position: 4, name: `Day ${dayNumber}`, item: `${SITE_URL}/bible/plans/${slug}/day/${dayNumber}` },
       ],
     }
     return {
       title: `Day ${dayNumber}: ${dayPassage}`,  // e.g., "Day 5: Psalm 23" — 15 chars, fits
       description: `Day ${dayNumber} of ${planTitle} — read ${dayPassage} and reflect with a short devotional from Worship Room.`,
       ogImage: planOgImages[slug] ?? '/og/bible-chapter.png',
       ogImageAlt: `Day ${dayNumber} of ${planTitle}`,
       canonical: `/bible/plans/${slug}/day/${dayNumber}`,
       jsonLd,
     }
   }

   export function buildBibleSearchMetadata(query: string | null): DynamicMetadata {
     if (!query || !query.trim()) {
       return {
         title: 'Search the Bible',
         description: 'Search the entire World English Bible for any word, phrase, or theme.',
         ogImage: '/og/bible-landing.png',
         ogImageAlt: 'Search the Bible on Worship Room',
         // Note: no canonical override — UI_STATE_PARAMS preserves ?mode=search&q=<query> in canonical
       }
     }
     const trimmed = query.trim().slice(0, 60) // guard against absurdly long queries
     return {
       title: `Search: ${trimmed}`,
       description: `Search results for "${trimmed}" in the World English Bible on Worship Room.`,
       ogImage: '/og/bible-landing.png',
       ogImageAlt: `Bible search results for ${trimmed}`,
     }
   }
   ```

3. Create `routeMetadata.test.ts` with at least 15 tests:

   **Static constants pass length limits (parameterized):**
   - Test: Every exported `*_METADATA` constant has non-empty `title` and `description`.
   - Test: Every title ≤ 46 chars raw (or ≤ 60 if `noSuffix: true`).
   - Test: Every description ≤ 160 chars.
   - Test: Every `ogImage` path (when present) starts with `/og/` or is `/og-default.png`.
   - Test: Every `noIndex: true` constant is one of the expected private routes.

   **Dynamic builders:**
   - Test: `buildBibleChapterMetadata('Philippians', 4, 'philippians')` returns title `'Philippians 4 (WEB)'`, description containing "Read Philippians chapter 4", canonical `/bible/philippians/4`, jsonLd with 4 BreadcrumbList items.
   - Test: `buildBibleChapterMetadata('Psalms', 119, 'psalms')` → title 18 chars, description ≤ 160 chars (longest Bible chapter reference).
   - Test: `buildBiblePlanMetadata('psalms-30-days', '30 Days in the Psalms', 'The Psalms are the prayer book...')` returns title `'30 Days in the Psalms'`, ogImage `/og/plans/psalms-30-days.png`, canonical `/bible/plans/psalms-30-days`, jsonLd with 3 items.
   - Test: `buildBiblePlanMetadata('unknown-slug', 'Unknown Plan', 'desc')` falls back to `/og/bible-chapter.png`.
   - Test: `buildBiblePlanMetadata(slug, title, longDescription)` truncates description to ≤ 160 chars with `...` suffix.
   - Test: `buildBiblePlanDayMetadata('psalms-30-days', '30 Days in the Psalms', 5, 'Psalm 23')` returns title `'Day 5: Psalm 23'`, canonical `/bible/plans/psalms-30-days/day/5`, jsonLd with 4 items.
   - Test: `buildBibleSearchMetadata(null)` returns "Search the Bible" default (not `"Search: null"`).
   - Test: `buildBibleSearchMetadata('')` returns the empty default.
   - Test: `buildBibleSearchMetadata('   ')` returns the empty default (whitespace-only).
   - Test: `buildBibleSearchMetadata('love')` returns title `'Search: love'`.
   - Test: `buildBibleSearchMetadata('a'.repeat(200))` truncates to 60 chars in the title.

   **Schema validation:**
   - Test: Every BreadcrumbList JSON-LD block produced by a builder has `@context: 'https://schema.org'`, `@type: 'BreadcrumbList'`, and `itemListElement` that is an array of `ListItem` entries with `position` ascending from 1.

4. Parameterize the length-limit tests using a loop over all exported constants so that adding a new constant auto-tests it:

   ```typescript
   import * as routeMetadata from '../routeMetadata'

   const TITLE_SUFFIX_LENGTH = ' | Worship Room'.length // 15

   describe('routeMetadata length limits', () => {
     const entries = Object.entries(routeMetadata).filter(
       ([_, value]) => value && typeof value === 'object' && 'title' in value && 'description' in value,
     ) as [string, routeMetadata.StaticRouteMetadata][]

     entries.forEach(([name, meta]) => {
       it(`${name}: title within limit`, () => {
         const limit = meta.noSuffix ? 60 : 60 - TITLE_SUFFIX_LENGTH
         expect(meta.title.length).toBeLessThanOrEqual(limit)
         expect(meta.title.trim().length).toBeGreaterThan(0)
       })
       it(`${name}: description within limit`, () => {
         expect(meta.description.length).toBeLessThanOrEqual(160)
         expect(meta.description.trim().length).toBeGreaterThan(0)
       })
     })
   })
   ```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT import from `@/components/SEO` into `routeMetadata.ts` — import from `@/lib/seo/canonicalUrl` instead to avoid a cycle (SEO.tsx will import from routeMetadata indirectly through its page callers).
- DO NOT compute canonical URLs using raw string concatenation — use `buildCanonicalUrl` when the builder needs a fully-resolved URL. For cases where the builder just needs a canonical PATH (to pass to the `<SEO canonical={...}>` prop), a template literal is fine because `SEO.tsx` runs the path through `buildCanonicalUrl` on its own.
- DO NOT put JSON-LD builders in a separate module — keep them inline in `routeMetadata.ts` so every page that imports its metadata also gets its JSON-LD for free.
- DO NOT export a "catch-all" metadata constant that pages can fall back to — every page that BB-40 touches must pick a specific constant.
- DO NOT use string literals that contain the word "Worship Room" in the title (the suffix adds it automatically); "Worship Room" may appear in descriptions but not in raw titles unless `noSuffix: true`.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Every static constant has non-empty title + description within length limits | unit | ~30 parameterized assertions (2 per constant) |
| Every static constant's `ogImage` (if set) starts with `/og/` or `/og-default.png` | unit | parameterized |
| `buildBibleChapterMetadata` output for Philippians 4 | unit | 1 test |
| `buildBibleChapterMetadata` output for Psalm 119 (longest reference) | unit | 1 test |
| `buildBiblePlanMetadata` output for each of 4 real plans | unit | 4 tests |
| `buildBiblePlanMetadata` fallback for unknown slug | unit | 1 test |
| `buildBiblePlanMetadata` truncates long description | unit | 1 test |
| `buildBiblePlanDayMetadata` output | unit | 1 test |
| `buildBibleSearchMetadata` null/empty/whitespace defaults | unit | 3 tests |
| `buildBibleSearchMetadata` valid query | unit | 1 test |
| `buildBibleSearchMetadata` truncates very long query | unit | 1 test |
| Every BreadcrumbList JSON-LD validates against a minimal Schema.org shape | unit | 3 tests (chapter, plan, plan day) |

**Expected state after completion:**
- [ ] `routeMetadata.ts` exports all static constants listed in Step 1
- [ ] All 4 builder functions exist and return valid `DynamicMetadata`
- [ ] 30+ tests pass in `routeMetadata.test.ts`
- [ ] All constants respect length limits
- [ ] `pnpm test` green

---

### Step 5: Migrate 39 existing `<SEO>` call sites to import from `routeMetadata.ts` + fix `noIndex` gaps (MyBible, Register)

**Objective:** Replace every inline title/description string literal at an existing `<SEO>` call site with a spread of the corresponding metadata constant. Add `noIndex` to MyBiblePage and RegisterPage. Keep the migration atomic per page — one edit at a time, run tests after each.

**Files to create/modify:** (one edit per page, grouped for review)

Pages to migrate (39 files, listed by group):

**Group A — Daily Hub and bibliotheca:** `Home.tsx`, `Dashboard.tsx`, `DailyHub.tsx` (Step 6 handles the tab-aware logic separately — this step just migrates Home and Dashboard and prepares DailyHub to import the 4 tab constants), `BibleLanding.tsx`, `BibleBrowse.tsx`, `MyBiblePage.tsx`, `bible/PlanBrowserPage.tsx`, `BibleReader.tsx` (uses `buildBibleChapterMetadata`).

**Group B — Content hubs:** `AskPage.tsx`, `GrowPage.tsx`, `MusicPage.tsx`, `RoutinesPage.tsx`, `ReadingPlanDetail.tsx`, `ChallengeDetail.tsx`.

**Group C — Prayer Wall:** `PrayerWall.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx`, `PrayerWallDashboard.tsx`.

**Group D — Local Support:** `Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx`.

**Group E — Personal + private:** `MyPrayers.tsx`, `Friends.tsx`, `Settings.tsx`, `Insights.tsx`, `MonthlyReport.tsx`, `GrowthProfile.tsx`.

**Group F — Meditate sub-pages:** `meditate/BreathingExercise.tsx`, `meditate/ScriptureSoaking.tsx`, `meditate/GratitudeReflection.tsx`, `meditate/ActsPrayerWalk.tsx`, `meditate/PsalmReading.tsx`, `meditate/ExamenReflection.tsx`.

**Group G — Sharing:** `SharedVerse.tsx`, `SharedPrayer.tsx`.

**Group H — Stubs and system:** `RegisterPage.tsx`, `Health.tsx`, `BibleStub.tsx` (if still rendered — check App.tsx; if dead code, skip). Also `App.tsx` inline `ComingSoon` and `NotFound` components — they pass inline strings to `<SEO>`. Step 5 migrates them to use `LOGIN_METADATA` and `NOT_FOUND_METADATA`.

**Details per page (example pattern — applies to all):**

Before:
```tsx
<SEO title="Prayer Wall" description="Share prayer requests with a supportive community..." jsonLd={prayerWallJsonLd} />
```

After:
```tsx
import { PRAYER_WALL_METADATA } from '@/lib/seo/routeMetadata'
// ...
<SEO {...PRAYER_WALL_METADATA} jsonLd={prayerWallJsonLd} />
```

**Special cases:**

- **Home.tsx:** Already passes `noSuffix`. `HOME_METADATA.noSuffix = true` covers this. The existing `jsonLd={homepageJsonLd}` is preserved — spread `HOME_METADATA` and keep `jsonLd` as an explicit prop.
- **Dashboard.tsx:** Reuses `HOME_METADATA` since the root route serves Home to crawlers. The existing Dashboard `<SEO>` passes generic strings — Step 5 replaces them by importing `HOME_METADATA` (same title and description as the landing page, since Dashboard is only rendered for authenticated users and crawlers see Home). Alternative: use a distinct `DASHBOARD_METADATA` constant with the same strings as Home — choose the distinct constant for clarity but verify the Step 1 draft shows them as identical.
- **BibleReader.tsx:** Replace the 3 inline props with `<SEO {...buildBibleChapterMetadata(book.name, chapterNumber, bookSlug!)} />`. The `canonical` override is now returned by the builder; do not pass a separate `canonical` prop. JSON-LD BreadcrumbList comes from the builder for free.
- **MyBiblePage.tsx:** Spread `MY_BIBLE_METADATA` (which sets `noIndex: true`) + keep `jsonLd={myBibleBreadcrumbs}` as explicit prop.
- **RegisterPage.tsx:** Spread `REGISTER_METADATA` (which sets `noIndex: true`). Remove the inline `canonical="/register"` if `REGISTER_METADATA` doesn't need a canonical override (the default canonical build already resolves to `/register`).
- **`App.tsx` inline components (`ComingSoon`, `NotFound`):** `ComingSoon` takes a `title` prop. The migration picks `LOGIN_METADATA` for the `/login` route only (the only current usage). Rewrite `ComingSoon` to hardcode the `LOGIN_METADATA` spread, or accept the StaticRouteMetadata as a prop. Simpler: delete the generic `title` prop and hardcode `<SEO {...LOGIN_METADATA} />` since `/login` is the only caller. `NotFound` spreads `NOT_FOUND_METADATA`.

**Per-page migration procedure (atomic edits):**

1. Open the page file
2. Add the import for the metadata constant from `@/lib/seo/routeMetadata`
3. Replace the inline `<SEO title="..." description="..." [other props] />` with `<SEO {...CONSTANT} [other props preserved] />`
4. Run the specific test file for that page (if one exists): `pnpm test -- <page>.test.tsx`
5. If green, move to the next page
6. If red, investigate (most likely the test asserts against the literal strings in the page — update the test to import from `routeMetadata.ts` and reference the constant)
7. Batch runs every 5-10 pages: `pnpm test` to catch cross-page regressions

**Gap fixes in this step:**
- `MyBiblePage.tsx`: add `noIndex` (via `MY_BIBLE_METADATA`).
- `RegisterPage.tsx`: add `noIndex` (via `REGISTER_METADATA`).

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT rename any page component.
- DO NOT move any page file.
- DO NOT touch the page's existing `jsonLd` prop if it is page-specific (e.g., `dailyHubBreadcrumbs`, `myBibleBreadcrumbs`, `homepageJsonLd`) — the metadata constant does not contain these, they are explicit props that override/extend the metadata spread.
- DO NOT merge the `jsonLd` prop into the metadata constant for pages with a large custom JSON-LD block (Home). Keep such blocks in their owning page file.
- DO NOT touch pre-existing failing tests.
- DO NOT remove the `canonical` prop from `BibleReader.tsx` if the builder doesn't supply one — verify the builder returns `canonical` before the migration.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm test` is green after each page migration | regression | full suite runs, must not introduce new failures |
| No new lint errors introduced | regression | `pnpm lint` after the group |

**Expected state after completion:**
- [ ] All 39 pages spread `routeMetadata.ts` constants
- [ ] Zero inline title/description literals at `<SEO>` call sites (except `DailyHub.tsx` which Step 6 rewrites separately, and `BibleReader.tsx` which uses the builder)
- [ ] `MyBiblePage` and `RegisterPage` now set `noIndex`
- [ ] `pnpm test` fully green
- [ ] `pnpm lint` clean

---

### Step 6: Add tab-aware metadata to `DailyHub.tsx`

**Objective:** Replace the single generic `<SEO>` render in `DailyHub.tsx` with a tab-aware render that picks one of 4 metadata constants per active tab.

**Files to create/modify:**

- `frontend/src/pages/DailyHub.tsx` — MODIFY. Use `useDailyHubTab()` (already imported for tab switching) to pick the metadata constant.
- `frontend/src/pages/__tests__/DailyHub.test.tsx` (verify existing — if not present, add a small test file) — add 4 integration tests that render DailyHub with each tab and assert the `<SEO>` prop.

**Details:**

1. In `DailyHub.tsx`, near the top of the component, read the tab and pick the metadata:

   ```tsx
   import {
     DAILY_HUB_DEVOTIONAL_METADATA,
     DAILY_HUB_PRAY_METADATA,
     DAILY_HUB_JOURNAL_METADATA,
     DAILY_HUB_MEDITATE_METADATA,
   } from '@/lib/seo/routeMetadata'
   import { useDailyHubTab } from '@/hooks/url/useDailyHubTab'

   // Inside DailyHub component, before render:
   const { tab } = useDailyHubTab() // verify whether this is already called upstream

   const tabMetadata = {
     devotional: DAILY_HUB_DEVOTIONAL_METADATA,
     pray: DAILY_HUB_PRAY_METADATA,
     journal: DAILY_HUB_JOURNAL_METADATA,
     meditate: DAILY_HUB_MEDITATE_METADATA,
   }[tab]
   ```

2. Replace the existing `<SEO>` render at line 200 with:

   ```tsx
   <SEO {...tabMetadata} jsonLd={dailyHubBreadcrumbs} />
   ```

   The canonical URL still resolves to `/daily` because `UI_STATE_PARAMS` strips `?tab=` (already in place via Step 3).

3. Verify `useDailyHubTab` is already called upstream in `DailyHub.tsx` (recon showed the file already imports it). If it is, reuse the existing `tab` variable. If it's not, import and call the hook.

4. Verify that no existing tab-switch side effect clears the SEO metadata — the `<SEO>` component re-renders on every tab change because `tabMetadata` changes, and `react-helmet-async` handles the meta tag update. The existing `dailyHubBreadcrumbs` JSON-LD stays the same regardless of active tab (correctly — the breadcrumbs describe the Daily Hub page itself).

5. Add integration tests in `frontend/src/pages/__tests__/DailyHub.seo.test.tsx` (new file — do not pollute existing DailyHub test file):

   ```tsx
   // DailyHub.seo.test.tsx
   import { describe, it, expect, beforeEach, vi } from 'vitest'
   import { render, waitFor } from '@testing-library/react'
   import { MemoryRouter } from 'react-router-dom'

   vi.unmock('react-helmet-async')
   const { HelmetProvider } = await import('react-helmet-async')
   const { DailyHub } = await import('../DailyHub')

   // Mock heavy deps that are not relevant to SEO — e.g. AuthProvider, ToastProvider, AudioProvider

   function renderDailyHubWithTab(tab: string) {
     return render(
       <HelmetProvider>
         <MemoryRouter initialEntries={[`/daily?tab=${tab}`]}>
           {/* Providers required by DailyHub */}
           <DailyHub />
         </MemoryRouter>
       </HelmetProvider>
     )
   }

   describe('DailyHub SEO tab-awareness', () => {
     beforeEach(() => {
       document.title = ''
       document.querySelectorAll('meta, link[rel="canonical"]').forEach((el) => el.remove())
     })

     it('devotional tab renders devotional title and og:image', async () => {
       renderDailyHubWithTab('devotional')
       await waitFor(() => {
         expect(document.title).toContain('<expected devotional title from DAILY_HUB_DEVOTIONAL_METADATA>')
         expect(document.querySelector('meta[property="og:image"]')!.getAttribute('content'))
           .toContain('/og/daily-devotional.png')
       })
     })
     // 3 more tests for pray, journal, meditate
   })
   ```

   **Note on test feasibility:** If the full `DailyHub` component pulls in too many providers (AudioProvider, AuthModalProvider, ToastProvider, ...) to mount cleanly in a test, fall back to a narrow unit test: render a stub component that replicates only the `useDailyHubTab` + `<SEO>` pick logic. Assert against the stub. The goal is to lock in the mapping from tab → metadata constant, not to re-test DailyHub end-to-end.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact. The tab-aware metadata is pure meta tag emission.

**Guardrails (DO NOT):**
- DO NOT change the canonical URL behavior — all 4 tabs share canonical `/daily`.
- DO NOT remove the `jsonLd={dailyHubBreadcrumbs}` prop.
- DO NOT hoist the `tabMetadata` mapping outside the component (it doesn't depend on state, but keeping it inside the component keeps the `tab` read adjacent to its consumer).
- DO NOT add `?tab=` to the canonical — the strip via `UI_STATE_PARAMS` is correct.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Each of 4 tabs renders the correct `document.title` | integration | 4 tests |
| Each of 4 tabs renders the correct `og:image` meta tag | integration | 4 tests |
| All 4 tabs render canonical `<link rel="canonical" href=".../daily">` (no ?tab) | integration | 4 tests |
| DailyHub breadcrumbs JSON-LD still rendered | integration | 1 test |

**Expected state after completion:**
- [ ] `DailyHub.tsx` uses tab-aware metadata picker
- [ ] 4+ integration tests pass
- [ ] All 4 tabs share `/daily` canonical
- [ ] `pnpm test` green

---

### Step 7: Produce 14 new OG card PNG images (HARD STOP — user approval of 1 sample required before producing remaining 13)

**Objective:** Hand-design 14 new OG card images in Figma/Canva, export as optimized 1200×630 PNGs ≤ 100 KB each, commit to `frontend/public/og/`. Add a build-time size-check script.

**Files to create/modify:**

- `frontend/public/og/home.png` — NEW
- `frontend/public/og/bible-landing.png` — NEW
- `frontend/public/og/bible-chapter.png` — NEW
- `frontend/public/og/daily-devotional.png` — NEW
- `frontend/public/og/daily-pray.png` — NEW
- `frontend/public/og/daily-journal.png` — NEW
- `frontend/public/og/daily-meditate.png` — NEW
- `frontend/public/og/my-bible.png` — NEW
- `frontend/public/og/plans-browser.png` — NEW
- `frontend/public/og/plans/psalms-30-days.png` — NEW (renamed from spec's `psalms-30.png`)
- `frontend/public/og/plans/john-story-of-jesus.png` — NEW (renamed from spec's `jesus-john.png`)
- `frontend/public/og/plans/when-youre-anxious.png` — NEW (renamed from spec's `anxiety.png`)
- `frontend/public/og/plans/when-you-cant-sleep.png` — NEW (renamed from spec's `sleep.png`)
- `frontend/public/og/ask.png` — NEW
- `frontend/scripts/check-og-sizes.mjs` — NEW build-time size checker
- `frontend/package.json` — MODIFY. Add `"og-check": "node scripts/check-og-sizes.mjs"` to the `scripts` block.

**Details:**

1. **Generation approach decision (HARD STOP):** Before producing any images, report to the user:
   - Recommendation: Hand-design in Figma (or the user's preferred tool).
   - Rationale: Avoids adding `sharp` or `canvas` as a dependency (scope guarantee: zero new npm packages).
   - Alternative: If the user wants programmatic generation, add `sharp` as a dev dependency and build a small Node script. This requires scope-exception approval.
   - **Wait for user decision before proceeding.**

2. **Sample card (HARD STOP):** After the approach is chosen, produce ONE sample card first — recommended: `og/bible-chapter.png` because it serves as the default for the 66-book set and has the simplest visual brief ("Bible — Worship Room" wordmark + title). Commit the sample + render at thumbnail (500×260) and present to the user for approval. Iterate on the single sample until approved. Only then proceed to produce the remaining 13.

3. **Visual brief for every card (applies to all 14):**
   - Canvas: 1200×630 PNG, 8-bit color, no transparency (background fills the entire canvas)
   - Background: `#08051A` base with a radial `rgba(139,92,246,0.35)` glow in the upper-center, fading to transparent at the edges (match the homepage glow-orb aesthetic at "emotional peak" intensity). Use a `radial-gradient` effect.
   - Safe zone: center 1100×530 — all critical elements must stay inside this region
   - Wordmark: "Worship Room" in Caveat 700 at ~64px, color white, positioned top-center at y≈90. Optional subtle purple drop shadow (`rgba(109,40,217,0.4)` blur 12px) to lift it off the background.
   - Title: page-specific in Inter 700, 72-88px depending on length, white→purple gradient via linear-gradient masked to text. Position center-horizontal, y≈320.
   - Subtitle (optional): page-specific reference or tagline in Inter 500, 32px, white at 80% alpha. Position below title, y≈430.
   - No stock photos, no clip art, no emojis on-card.

4. **Per-card titles (draft — finalized in Step 1):**
   - `home.png` — "Worship Room"
   - `bible-landing.png` — "Read the Bible"
   - `bible-chapter.png` — "Read Scripture"
   - `daily-devotional.png` — "Today's Devotional"
   - `daily-pray.png` — "Pray"
   - `daily-journal.png` — "Journal"
   - `daily-meditate.png` — "Meditate"
   - `my-bible.png` — "My Bible"
   - `plans-browser.png` — "Reading Plans"
   - `plans/psalms-30-days.png` — "30 Days in the Psalms"
   - `plans/john-story-of-jesus.png` — "The Story of Jesus"
   - `plans/when-youre-anxious.png` — "When You're Anxious"
   - `plans/when-you-cant-sleep.png` — "When You Can't Sleep"
   - `ask.png` — "Ask the Bible"

   All per-card titles also appear in Step 1 recon doc for user review.

5. **Export settings:** PNG with palette quantization if it helps hit the size target (tools: `pngquant`, `ImageOptim`, Squoosh.app). Ensure every file is ≤ 100 KB and the full set fits in 1.5 MB total. The `og-default.png` fallback stays as-is at the root.

6. **Size-check script** (`frontend/scripts/check-og-sizes.mjs`):

   ```javascript
   // Build-time guard: fails if any OG card PNG exceeds 100 KB or the full set exceeds 1.5 MB.
   import { readdirSync, statSync } from 'node:fs'
   import { join, resolve } from 'node:path'

   const OG_DIR = resolve('public/og')
   const MAX_FILE_BYTES = 100 * 1024      // 100 KB per file
   const MAX_TOTAL_BYTES = 1500 * 1024    // 1.5 MB total

   function walk(dir) {
     const entries = readdirSync(dir, { withFileTypes: true })
     return entries.flatMap((e) =>
       e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
     )
   }

   try {
     const files = walk(OG_DIR).filter((f) => f.endsWith('.png'))
     const violations = []
     let total = 0
     for (const f of files) {
       const size = statSync(f).size
       total += size
       if (size > MAX_FILE_BYTES) {
         violations.push(`${f} — ${(size / 1024).toFixed(1)} KB (limit: 100 KB)`)
       }
     }
     if (total > MAX_TOTAL_BYTES) {
       violations.push(`TOTAL — ${(total / 1024).toFixed(1)} KB (limit: 1500 KB)`)
     }
     if (violations.length > 0) {
       console.error('OG card size violations:\n' + violations.map((v) => `  - ${v}`).join('\n'))
       process.exit(1)
     }
     console.log(`OG cards OK — ${files.length} files, ${(total / 1024).toFixed(1)} KB total`)
   } catch (err) {
     console.error('og-check failed:', err.message)
     process.exit(1)
   }
   ```

7. Add `"og-check": "node scripts/check-og-sizes.mjs"` to `frontend/package.json` scripts.

8. Run `pnpm og-check` locally. Must exit 0. If any file exceeds the limit, re-export with more aggressive compression.

**Auth gating:** N/A.

**Responsive behavior:** N/A: OG cards render at fixed 1200×630 on every platform.

**Guardrails (DO NOT):**
- DO NOT add `sharp` or `canvas` without explicit user approval (scope guarantee: zero new npm packages).
- DO NOT delete or move `frontend/public/og-default.png` — it stays at the root as the module-level fallback for any metadata constant that omits `ogImage`.
- DO NOT produce all 14 cards before the 1 sample is approved.
- DO NOT commit unoptimized PNG exports — every file must fit under 100 KB. If the hand-designed PNG is too large, re-export with palette quantization.
- DO NOT include any personally-identifying content, stock photography, or clip art in the card designs.
- DO NOT use Caveat for the title — Caveat is ONLY for the wordmark. Titles use Inter 700.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm og-check` exits 0 | build-time | Validates all PNGs ≤ 100 KB and total ≤ 1.5 MB |

(No unit tests for image files — visual review by user is the verification.)

**Expected state after completion:**
- [ ] All 14 new PNGs committed under `frontend/public/og/` (and `public/og/plans/`)
- [ ] Each PNG is 1200×630
- [ ] Each PNG ≤ 100 KB
- [ ] Total set ≤ 1.5 MB
- [ ] `pnpm og-check` exits 0
- [ ] Existing `og-default.png` unchanged at `public/og-default.png`
- [ ] User approved the 1 sample before the remaining 13 were produced

---

### Step 8: Add `<SEO>` coverage + JSON-LD to BiblePlanDetail and BiblePlanDay (gap fill)

**Objective:** The 2 confirmed gap files now render `<SEO>` via the dynamic builders from Step 4. Add BreadcrumbList JSON-LD via the same builders.

**Files to create/modify:**

- `frontend/src/pages/BiblePlanDetail.tsx` — MODIFY. Import builder, render `<SEO>` inside the success branch and a fallback `<SEO>` inside the error branch.
- `frontend/src/pages/BiblePlanDay.tsx` — MODIFY. Same pattern.

**Details:**

1. **BiblePlanDetail.tsx:**
   - Add import: `import { SEO } from '@/components/SEO'` and `import { buildBiblePlanMetadata } from '@/lib/seo/routeMetadata'`
   - In the early-return error branch (lines 35-46), render `<SEO title="Reading Plan Not Found" description="This reading plan doesn't exist or may have been removed." noIndex />` before the existing error JSX.
   - In the main render (after line 58), as the first child of the outer `<div>`, render:
     ```tsx
     <SEO {...buildBiblePlanMetadata(plan.slug, plan.title, plan.description)} />
     ```
   - Verify `plan.slug` and `plan.title` and `plan.description` are available from the `usePlan` hook return (recon confirmed they are).

2. **BiblePlanDay.tsx:**
   - Add import: `import { SEO } from '@/components/SEO'` and `import { buildBiblePlanDayMetadata } from '@/lib/seo/routeMetadata'`
   - In the plan-not-found branch, render `<SEO title="Reading Plan Not Found" description="..." noIndex />`.
   - In the day-not-found branch (lines 60-72), render `<SEO title="Day Not Found" description="This day doesn't exist in this plan." noIndex />`.
   - In the main render, derive `dayPassage` from `day.passageReference` or similar (verify the `day` object's passage field via `usePlan` return — recon didn't inspect this; if the field is `day.reference` or `day.passage` or similar, use whichever is canonical).
   - Render `<SEO {...buildBiblePlanDayMetadata(plan.slug, plan.title, day.day, dayPassage)} />` as the first child of the main render.

3. **Canonical override verification:**
   - Both builders return `canonical: '/bible/plans/...'` — the explicit override means `SEO.tsx:34` skips query-param pass-through, so `?verse=3` on `/bible/plans/psalms-30-days/day/5` correctly resolves to canonical `/bible/plans/psalms-30-days/day/5` with no query params.

4. **Tests:** Add a small integration test per page under `frontend/src/pages/__tests__/BiblePlanDetail.seo.test.tsx` and `BiblePlanDay.seo.test.tsx`:
   - Render the page under `MemoryRouter` + `HelmetProvider` (with `vi.unmock('react-helmet-async')` at the top) with a valid slug and stub the `usePlan` hook to return a known plan.
   - Assert `document.title` contains the expected title.
   - Assert the canonical `<link>` is the expected plan/day path with no query params (including when the URL contains `?verse=3`).
   - Assert the JSON-LD `<script type="application/ld+json">` tag is present and contains a BreadcrumbList with the expected crumbs.

**Auth gating:** N/A — the pages themselves have internal auth gating for start/mark-complete actions but the page SEO is unauthenticated.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT place the `<SEO>` render inside a conditional branch that skips rendering when `plan` is undefined — the main render requires `plan` to be defined (the earlier early-return guards this). Place the `<SEO>` inside the main branch only.
- DO NOT compute the canonical path by hand — use the builder.
- DO NOT skip the error-branch SEO — even error states need a noIndex tag so the page doesn't pollute search indexes.
- DO NOT add the plan metadata to the Group A migration in Step 5 — these two pages are explicitly gap fills handled in Step 8 (keeping them separate makes the migration and gap-fill easier to review).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `BiblePlanDetail` valid slug renders plan title in `document.title` | integration | 1 test |
| `BiblePlanDetail` valid slug renders canonical `/bible/plans/:slug` | integration | 1 test |
| `BiblePlanDetail` JSON-LD BreadcrumbList with 3 crumbs | integration | 1 test |
| `BiblePlanDetail` invalid slug renders `noIndex` | integration | 1 test |
| `BiblePlanDay` valid day renders `Day N: <passage>` title | integration | 1 test |
| `BiblePlanDay` valid day + `?verse=3` renders canonical without query params | integration | 1 test |
| `BiblePlanDay` JSON-LD BreadcrumbList with 4 crumbs | integration | 1 test |
| `BiblePlanDay` day-not-found renders `noIndex` | integration | 1 test |

**Expected state after completion:**
- [ ] `BiblePlanDetail.tsx` renders `<SEO>` in valid + error branches
- [ ] `BiblePlanDay.tsx` renders `<SEO>` in valid + plan-error + day-error branches
- [ ] 8+ integration tests pass
- [ ] `pnpm test` green
- [ ] Route inventory in Step 1 recon doc updated to reflect the 2 now-covered routes

---

### Step 9: Add BreadcrumbList JSON-LD to BibleReader.tsx

**Objective:** The main Bible chapter reader currently renders `<SEO>` with no JSON-LD. Add a BreadcrumbList via the Step 4 builder.

**Files to create/modify:**

- `frontend/src/pages/BibleReader.tsx` — MODIFY. Replace the inline `<SEO title=... description=... canonical=... />` at lines 676-680 with `<SEO {...buildBibleChapterMetadata(book.name, chapterNumber, bookSlug!)} />`.

**Details:**

1. This step overlaps with Step 5's `BibleReader.tsx` migration — the steps are logically separated because Step 5 does the consolidation pass and Step 9 does the JSON-LD addition. In practice, Step 5's `BibleReader.tsx` edit already calls `buildBibleChapterMetadata`, which already returns the BreadcrumbList in `jsonLd`. Step 9 is a verification step: confirm that after Step 5, the `BreadcrumbList` is present in the rendered `<head>`, and add a focused integration test.

2. Integration test in `frontend/src/pages/__tests__/BibleReader.seo.test.tsx`:
   - `vi.unmock('react-helmet-async')`
   - Render `BibleReader` at `/bible/philippians/4` (mock `usePlan`/book loaders as needed; if the full component is too heavy, render a small stub that calls `buildBibleChapterMetadata` and renders `<SEO>` — same feasibility fallback as Step 6).
   - Assert `document.querySelector('script[type="application/ld+json"]')` contains a string matching `"@type":"BreadcrumbList"` with 4 items.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**
- DO NOT add JSON-LD to `BibleReader.tsx` via a second `<script>` tag — the builder returns it in `jsonLd` for `SEO.tsx` to render.
- DO NOT add JSON-LD to personal-layer routes (MyBible, MyPrayers, Insights, Settings, Friends) beyond what already exists — they are `noIndex` so structured data adds nothing.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| BibleReader renders JSON-LD BreadcrumbList script | integration | 1 test |
| BreadcrumbList has 4 items with correct positions and URLs | integration | 1 test |

**Expected state after completion:**
- [ ] `BibleReader.tsx` (already migrated in Step 5) emits BreadcrumbList JSON-LD
- [ ] 2 new integration tests pass

---

### Step 10: Final coverage grep + recon doc update + test + lint + build

**Objective:** Final sweep to confirm no inline title/description literals remain, no routes are missing `<SEO>`, the recon doc reflects reality, and the full suite is green.

**Files to create/modify:**

- `_plans/recon/bb40-seo-metadata.md` — UPDATE. Record the final state (all gap fills completed, all metadata constants in use).
- No code files unless the sweep finds a gap.

**Details:**

1. **Grep pass 1 — unmigrated inline literals:**
   ```
   grep -rn '<SEO title="' frontend/src/pages
   grep -rn '<SEO title={`' frontend/src/pages  # template literals inside pages
   ```
   Expected: zero hits (every call site should spread a constant or call a builder). If hits found, file is unmigrated — go back to Step 5 and finish.

2. **Grep pass 2 — new gap routes:**
   ```
   grep -rL "import.*SEO" frontend/src/pages --include="*.tsx"
   ```
   List files that do NOT import `SEO`. Cross-reference against the route inventory in `App.tsx`. Any user-facing route with no `SEO` import is a gap — investigate and fix.

3. **Grep pass 3 — redirects and non-page components:**
   - `BibleSearchRedirect` — no SEO needed (issues `<Navigate>`)
   - `DevotionalRedirect`, `ReadingPlansRedirect` — no SEO needed
   - `RootRoute` — delegates to `Home` or `Dashboard`, both of which render `<SEO>`

4. **Update the recon doc:**
   - Mark every row in the route inventory table as "complete" or "N/A (redirect)"
   - Add a "BB-40 ship state" section summarizing what was delivered
   - Confirm the manual post-deploy validation checklist is still relevant
   - Add a "BB-39 handoff" section listing the final precache manifest (all indexable content routes)

5. **Run the full suite:**
   - `pnpm lint` — must be clean (no new warnings vs baseline)
   - `pnpm test` — must be fully green; zero regressions
   - `pnpm build` — must succeed with 0 errors, 0 warnings
   - `pnpm og-check` — must exit 0

6. **Bundle size verification:**
   - Confirm the JS delta is ~0 (metadata module is small, ~2 KB gzipped; SEO component unchanged in size)
   - Confirm the public/ delta is ≤ 1.5 MB (the 14 new PNGs)

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- DO NOT skip the grep passes — this is the only way to catch stray inline literals that the migration missed.
- DO NOT skip `pnpm build` — a successful test run does not guarantee a successful production build.
- DO NOT commit the final recon doc update before the user has reviewed the ship-state summary.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm lint` exit 0 | build | full lint |
| `pnpm test` exit 0 | regression | full suite |
| `pnpm build` exit 0 | build | production build |
| `pnpm og-check` exit 0 | build-time | OG size check |

**Expected state after completion:**
- [ ] Zero inline title/description literals at `<SEO>` call sites (verified via grep)
- [ ] Every user-facing route renders `<SEO>` (verified via grep cross-reference)
- [ ] `_plans/recon/bb40-seo-metadata.md` reflects final ship state
- [ ] `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm og-check` all green
- [ ] All acceptance criteria from the spec are satisfied

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Draft all titles/descriptions + recon doc (HARD STOP — user approval) |
| 2 | 1 | Add `ogImageAlt` prop to `SEO.tsx` |
| 3 | 2 | Extract `buildCanonicalUrl` + extend UI_STATE_PARAMS |
| 4 | 1, 3 | Create `routeMetadata.ts` with constants + builders |
| 5 | 4 | Migrate 39 existing `<SEO>` call sites to metadata module (+ fix noIndex gaps) |
| 6 | 4 | Daily Hub tab-aware metadata |
| 7 | 1 | Produce 14 OG card PNGs (HARD STOP — user approval) |
| 8 | 4, 7 | Gap fill: BiblePlanDetail + BiblePlanDay |
| 9 | 5 | Verify BibleReader JSON-LD BreadcrumbList |
| 10 | 5, 6, 8, 9 | Final sweep + recon doc update + CI checks |

**Parallelism note:** Steps 5, 6, 7 can run in parallel after Step 4 is complete, because they touch disjoint files (Step 5: page call sites; Step 6: DailyHub.tsx only; Step 7: `public/og/` assets and `package.json` scripts block). Step 8 depends on both Step 4 (builder) and Step 7 (OG images exist and pass size check). Step 9 depends on Step 5 for the BibleReader migration.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Draft titles/descriptions + recon doc (HARD STOP) | [COMPLETE] | 2026-04-11 | `_plans/recon/bb40-seo-metadata.md`. Three iterations on the recon doc before approval: iter 1 = full draft, iter 2 = revised 6 titles (Pray, Journal, Meditate, Devotional, Ask, Grow), iter 3 = swapped Meditate to "Contemplative Prayer" + 3 smaller swaps (Friends → "Friends", Insights → "Mood & Practice Insights", Plans Browser → "Reading Plans for Hard Days"). §14 added as notes-to-self for 4 titles flagged for future revision. |
| 2 | Add `ogImageAlt` prop to `SEO.tsx` | [COMPLETE] | 2026-04-11 | `frontend/src/components/SEO.tsx` — additive prop + conditional emission of `og:image:alt` and `twitter:image:alt`. 3 new tests in `SEO.test.tsx` — all pass, failing count held at baseline 44. |
| 3 | Extract `buildCanonicalUrl` + extend UI_STATE_PARAMS | [COMPLETE] | 2026-04-11 | `frontend/src/lib/seo/canonicalUrl.ts` (new). `SITE_URL` re-exported from `SEO.tsx` for backwards compat. `UI_STATE_PARAMS` extended to `['tab', 'verseRef', 'verseText', 'verseTheme']`. 21 new tests in `canonicalUrl.test.ts`, all pass. |
| 4 | Create `routeMetadata.ts` constants + builders | [COMPLETE] | 2026-04-11 | `frontend/src/lib/seo/routeMetadata.ts` (new). 33 static constants + 4 dynamic builders (`buildBibleChapterMetadata`, `buildBiblePlanMetadata`, `buildBiblePlanDayMetadata`, `buildBibleSearchMetadata`). 158 tests in `routeMetadata.test.ts` (parameterized length-limit + identity + builder tests). All pass. |
| 5 | Migrate 39 existing `<SEO>` call sites | [COMPLETE] | 2026-04-11 | All 39 migrated. `MyBiblePage` + `RegisterPage` gained `noIndex`. BibleReader error branches gained `noIndex`. SharedVerse error branch gained `noIndex`. `BibleLanding` conditionally swaps to `buildBibleSearchMetadata` in search mode. `BibleReader` main render uses `buildBibleChapterMetadata` (BreadcrumbList JSON-LD inherited for free). Dashboard spreads `HOME_METADATA` per iteration 3 decision. Post-migration: 7590 tests pass (612 files), zero new failures. |
| 6 | Daily Hub tab-aware metadata | [COMPLETE] | 2026-04-11 | `DailyHub.tsx` renders `<SEO {...TAB_METADATA[activeTab]} jsonLd={dailyHubBreadcrumbs} />`. 9-test contract check in new `DailyHub.seo.test.tsx` — all pass. Used narrow contract-test approach instead of full page mount (DailyHub provider stack is too heavy). |
| 7 | Produce 14 OG card PNGs (HARD STOP) | [COMPLETE] | 2026-04-11 | **Deviation:** Switched from hand-design to Playwright-based deterministic generation mid-execution per user approval. `frontend/scripts/generate-og-cards.mjs` uses `@playwright/test`'s headless chromium + `sharp` palette quantization. `frontend/scripts/check-og-sizes.mjs` validates ≤100 KB/file, ≤1.5 MB/total. `pnpm og-generate` + `pnpm og-check` wired. All 14 cards generated in a single pass — every file ≤67 KB, total 804.7 KB. Cards live at `frontend/public/og/` (10 top-level + 4 under `/plans/`). |
| 8 | Gap fill: BiblePlanDetail + BiblePlanDay | [COMPLETE] | 2026-04-11 | Both pages now render `<SEO>` via builders (`buildBiblePlanMetadata` / `buildBiblePlanDayMetadata`). Error branches (plan-not-found, day-not-found) gained `noIndex`. 21 tests in `BiblePlanDetail.seo.test.tsx` + 6 tests in `BiblePlanDay.seo.test.tsx` — all pass. |
| 9 | Verify BibleReader JSON-LD BreadcrumbList | [COMPLETE] | 2026-04-11 | 7 contract tests in `BibleReader.seo.test.tsx` — all pass. Verifies `buildBibleChapterMetadata` returns a 4-item BreadcrumbList JSON-LD with correct positions, names, URLs, and the canonical override. |
| 10 | Final sweep + recon doc update + CI checks | [COMPLETE] | 2026-04-11 | Grep sweeps clean. `pnpm lint`: 16 errors / 5 warnings remaining, all pre-existing baseline (BB-40 introduced 0, fixed 1 — the now-unused `eslint-disable` on `SEO.tsx`). `pnpm test`: 7633 tests total / 45 failed (all in baseline 8 files, zero new). `pnpm build`: clean, 10.58s, 14 OG cards copied to `dist/og/`. `pnpm og-check`: OK, 14 files, 804.7 KB. Recon doc §11 ship-state section populated. |
