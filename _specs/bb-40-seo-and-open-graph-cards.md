# BB-40: SEO + Open Graph Cards

**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)

**Master Plan Reference:** N/A — standalone infrastructure + content spec in the Bible-redesign wave. Sequenced after BB-38 and directly enables BB-39 (PWA + offline reading), which will reuse BB-40's route inventory as the service worker precache list.

**Depends on:**

- BB-38 (Deep linking architecture — shipped) — provides the URL contract at `_plans/recon/bb38-url-formats.md` that BB-40 uses to define canonical URL strategy (which params strip, which preserve)
- BB-0 through BB-21.5 (the user-facing Bible-redesign routes BB-40 adds/audits metadata for)
- The existing `<SEO>` component at `frontend/src/components/SEO.tsx` and `<HelmetProvider>` wiring in `App.tsx` (already shipped — see "Reality check" below)

**Hands off to:**

- BB-39 (PWA + offline reading) — will use BB-40's canonical URL list at `_plans/recon/bb40-seo-metadata.md` to determine which routes the service worker precaches
- A future production deployment spec that configures the real production `VITE_SITE_URL`, `sitemap.xml`, and `robots.txt`
- A future SSR / pre-rendering spec if and when crawler coverage of non-JS crawlers becomes a concern
- A future dynamic OG image generation spec (per-verse, per-passage) if the static card approach proves insufficient

---

## Reality check — what already exists (revised inbound spec scope)

The inbound spec text assumed BB-40 was installing and wiring SEO infrastructure from scratch. **That assumption is wrong.** Reconnaissance before drafting this spec confirmed the following infrastructure already ships on `bible-redesign`:

- ✅ `react-helmet-async@^2.0.5` is installed in `frontend/package.json`.
- ✅ `<HelmetProvider>` wraps the React tree in `frontend/src/App.tsx:162-241`.
- ✅ A `<SEO>` component exists at `frontend/src/components/SEO.tsx` (NOT `components/seo/SEO.tsx` — the inbound spec's proposed path conflicts with reality). It accepts `title`, `description`, `noSuffix`, `ogImage`, `ogType`, `canonical`, `noIndex`, and `jsonLd` props and renders the full Open Graph + Twitter Card + canonical + robots noindex + JSON-LD tag set.
- ✅ The SEO component reads `VITE_SITE_URL` from `import.meta.env` (via `SITE_URL` export) with a fallback to `https://worshiproom.com`.
- ✅ `frontend/.env.example` already documents `VITE_SITE_URL` (line 15, not a new addition).
- ✅ The SEO component already strips `?tab=` from canonical URLs via an internal `UI_STATE_PARAMS` allowlist. Daily Hub canonical is already `/daily`, not `/daily?tab=pray`.
- ✅ 39 page components already render `<SEO>` with inline title/description props: Home, Dashboard, DailyHub, BibleLanding, BibleReader, MyBiblePage, BibleBrowse, PlanBrowserPage, all six `/meditate/*` sub-pages, AskPage, GrowPage, MusicPage, RoutinesPage, Friends, Settings, Insights, MonthlyReport, MyPrayers, ReadingPlanDetail, ChallengeDetail, PrayerWall, PrayerDetail, PrayerWallProfile, PrayerWallDashboard, Churches, Counselors, CelebrateRecovery, GrowthProfile, SharedVerse, SharedPrayer, RegisterPage, Health, BibleStub.
- ✅ `frontend/src/test/setup.ts` globally mocks `react-helmet-async` so existing tests that don't wrap with `HelmetProvider` continue to pass.
- ✅ `frontend/public/og-default.png` exists as the fallback OG card image referenced by the SEO component's default.
- ✅ Bible chapter reader already sets `canonical={`/bible/${bookSlug}/${chapterNumber}`}` explicitly (BibleReader.tsx:679), so `?verse=`, `?scroll-to=`, `?action=` variants from BB-38 collapse to the chapter canonical.
- ✅ Home, DailyHub, MyBiblePage, and BibleReader already render JSON-LD blocks (`jsonLd` prop passed).

**What BB-40 still needs to do** is materially different from the inbound spec. The remaining work is:

1. **Audit and fill coverage gaps.** Find every user-facing route and confirm it renders `<SEO>`. Reconnaissance found gaps at `BiblePlanDetail.tsx` and `BiblePlanDay.tsx` — neither renders `<SEO>` today. Those routes currently fall back to `index.html` defaults. The plan phase will enumerate every route and produce a gap list.
2. **Consolidate inline metadata strings into a single source of truth** at `frontend/src/lib/seo/routeMetadata.ts`. Today, titles and descriptions live as string literals at the `<SEO>` call sites — duplicated if two routes render similar metadata, hard to review all at once, hard to spot-check for length and tone, and at risk of drifting over time. BB-40 moves every string into one module so (a) content reviewers can see all 20+ title/description pairs in one file, (b) length and style consistency can be enforced by a single lint/review pass, and (c) dynamic builders (chapter name + number, plan + day) live next to their static siblings.
3. **Add tab-specific Daily Hub metadata.** Today, DailyHub.tsx renders one generic `<SEO title="Daily Prayer, Journal & Meditation" ...>` regardless of active tab. BB-40 uses the `useDailyHubTab` hook from BB-38 to pick a tab-specific title, description, and OG image on each render. The canonical URL stays `/daily` (already correct via `UI_STATE_PARAMS`), but the share preview and search snippet change per tab.
4. **Produce 14 new OG card images** (1200×630 PNG, under 100 KB each) to complement the existing `og-default.png`, and migrate the existing inline `ogImage` references to point at them. Target inventory in the "OG Card Images" section below.
5. **Fill JSON-LD gaps.** Verify the Home `WebSite`/`WebApplication` block is present and correct. Add `BreadcrumbList` JSON-LD to Bible chapter pages (Bible → Book → Chapter) and to plan day pages (Plans → Plan → Day). Confirm existing blocks are not malformed.
6. **Noindex audit.** Verify `/bible/my` is flagged `noIndex`. Add `noIndex` to any other routes that surface personal state (`/my-prayers`, `/insights`, `/insights/monthly`, `/settings`, `/friends`, `/profile/:userId`, `/prayer-wall/dashboard`) — plan phase decides the final list based on whether the page content is user-specific enough to warrant de-indexing.
7. **Optional architectural cleanup** — extract the `buildCanonicalUrl` helper currently inside `SEO.tsx` into `frontend/src/lib/seo/canonicalUrl.ts` so it can be unit-tested in isolation and reused by the metadata module for dynamic builders. The existing SEO component re-imports it. This is optional — the plan phase decides whether the refactor is worth the churn or whether keeping the helper internal to `SEO.tsx` is fine.
8. **Document the full route inventory** at `_plans/recon/bb40-seo-metadata.md` so BB-39 can reuse it for service worker precaching without re-doing the recon.

**BB-40 does NOT reinvent what already exists.** The `<SEO>` component stays at `frontend/src/components/SEO.tsx` — do not move it to `components/seo/SEO.tsx` and break 39 existing import paths. The existing prop API stays compatible — BB-40 may add props (e.g. `ogImageAlt`) but does not rename or remove any.

---

## Overview

Worship Room's 39 `<SEO>`-wired pages ship with generic branded metadata today. Titles and descriptions are authored inline at each call site, OG cards fall back to a single default image, Daily Hub tabs all share one generic description, and the Bible reading plan routes don't render `<SEO>` at all so they fall through to `index.html` defaults. The metadata is technically present but is neither reviewed as a holistic set nor optimized for how the app actually wants to present itself when a user shares a deep link.

BB-40 is the pass that closes those gaps. It consolidates every title and description into one reviewable module, adds tab-specific and route-specific OG cards, covers the handful of routes still missing `<SEO>`, and documents the canonical URL strategy and full inventory so the next wave (BB-39 PWA precaching) can lean on it. The load-bearing work is content authoring — the 20+ title/description pairs and the OG card visuals — because that is what determines how a shared URL actually feels when it lands in someone's feed, timeline, or inbox.

## User Story

As a **person sharing Worship Room**, I want links I paste into a DM, social post, or group chat to render a rich preview card that accurately names the page and visually represents the content, so that the person on the receiving end sees a specific invitation ("Philippians 4 — World English Bible" with a chapter-themed card) instead of a bare URL string and generic favicon.

As a **search engine crawler** indexing Worship Room, I want each route to present a distinct title, a distinct description, a canonical URL that collapses deep-link variants to their canonical resource, and structured data where it clarifies the content hierarchy, so that search results show meaningful snippets and don't penalize the app for duplicate content.

## Why this matters and what BB-40 explicitly does NOT cover

**What BB-40 covers:**

- A single `routeMetadata.ts` module that holds every title and description string as the source of truth, eliminating inline duplication.
- Static metadata constants for every route whose metadata never changes at runtime.
- Dynamic metadata builders for routes whose metadata depends on runtime data (Bible chapter needs book + chapter number; plan day needs plan + day; search needs query).
- Tab-aware metadata for the Daily Hub (four distinct previews sharing one canonical URL).
- 14 new OG card images + the existing `og-default.png`, covering the top-level pages and the Bible reading plans.
- JSON-LD additions on Bible chapter and plan day pages (BreadcrumbList), plus verification of existing blocks.
- `noIndex` coverage for personal-state routes.
- BB-38-aware canonical URL behavior — the existing `UI_STATE_PARAMS` stripping is kept, audited, and extended only if reconnaissance discovers gaps (e.g. `?verse=`, `?scroll-to=`, `?action=` variants should already collapse because the chapter page passes an explicit `canonical` prop, but the plan phase confirms).
- Route inventory documentation at `_plans/recon/bb40-seo-metadata.md`.

**What BB-40 explicitly does NOT cover:**

- **No SSR or pre-rendering.** Client-side meta tag injection via `react-helmet-async` only. Modern social crawlers (Twitter, Facebook, LinkedIn, Discord, iMessage, Slack, WhatsApp) and Google's crawler all execute JavaScript and parse client-rendered meta tags. Less-common crawlers without JS will see the `index.html` defaults — acceptable for the scope and demographic.
- **No `sitemap.xml` or `robots.txt` authoring.** Deployment-time concerns tied to the production domain. Deferred to a future deployment spec.
- **No dynamic OG image generation.** Static PNGs committed to `frontend/public/og/`. Dynamic per-verse or per-passage images would require an edge function or backend — future spec.
- **No per-user OG cards.** Personal layer pages use generic Worship Room metadata. Personal data is not shareable as a rich card.
- **No Schema.org coverage beyond `WebSite`/`WebApplication` and `BreadcrumbList`.** Other types (Article, Book, CreativeWork) are not used — the plan phase may evaluate whether adding them for Bible chapters has meaningful SEO value, but the default posture is to keep JSON-LD minimal and focused.
- **No multilingual metadata.** App is English-only. Future i18n spec.
- **No A/B tested or rotating titles.** Each route has one canonical definition per state.
- **No analytics tracking of share preview impressions.** Future spec if ever.
- **No user-customizable share preview content.** Out of scope.
- **No changes to BB-38 deep linking behavior.** BB-40 reads URLs; it does not modify routing or URL-state hooks.
- **No new auth gates.** Zero, same posture as BB-30 through BB-38.
- **No new localStorage keys.** Zero persistence.
- **No backend changes.** Pure frontend.
- **No renaming or moving the existing `<SEO>` component.** Stays at `frontend/src/components/SEO.tsx`. The 39 existing import paths do not change.
- **No breaking the existing `<SEO>` prop API.** BB-40 may add optional props (e.g. `ogImageAlt`) but does not rename, remove, or change the semantics of `title`, `description`, `noSuffix`, `ogImage`, `ogType`, `canonical`, `noIndex`, or `jsonLd`.
- **No automated verification against real social platforms.** Twitter, Facebook, LinkedIn, Discord, and iMessage each have their own crawler quirks and there is no reliable automated way to test all of them. Post-deploy manual verification is a documentation item in the "Notes for execution" section, not an acceptance criterion.
- **No changes to `index.html` `<head>` content.** The existing defaults remain as a fallback for routes without per-route metadata and for crawlers that do not execute JS.
- **No coverage of AI-generated content caching by search engines.** Ask page responses and AI prayers are not indexable — only the page shells are.

## Architecture — metadata module + existing SEO component

BB-40 introduces one new module (`frontend/src/lib/seo/routeMetadata.ts`), optionally one extracted helper (`frontend/src/lib/seo/canonicalUrl.ts`), one recon documentation file, a batch of new OG card images, and a pass of mechanical edits across the 39 SEO-wired pages to replace inline strings with module imports. The existing `<SEO>` component at `frontend/src/components/SEO.tsx` stays put. No new React components.

### `lib/seo/routeMetadata.ts` — the content module

One TypeScript module, one responsibility: every title, description, and default OG image Worship Room exposes to the outside world lives here. Two kinds of exports:

**Static constants** for routes whose metadata never changes at runtime:

```typescript
interface StaticRouteMetadata {
  title: string
  description: string
  ogImage?: string // path under /public/og/ — defaults to og-default.png if absent
  noIndex?: boolean
}

export const HOME_METADATA: StaticRouteMetadata = { ... }
export const DAILY_HUB_DEVOTIONAL_METADATA: StaticRouteMetadata = { ... }
export const DAILY_HUB_PRAY_METADATA: StaticRouteMetadata = { ... }
export const DAILY_HUB_JOURNAL_METADATA: StaticRouteMetadata = { ... }
export const DAILY_HUB_MEDITATE_METADATA: StaticRouteMetadata = { ... }
export const BIBLE_LANDING_METADATA: StaticRouteMetadata = { ... }
export const MY_BIBLE_METADATA: StaticRouteMetadata = { ..., noIndex: true }
// ... etc for every static route
```

**Builder functions** for routes whose metadata depends on runtime data:

```typescript
interface DynamicMetadata {
  title: string
  description: string
  ogImage?: string
  canonical?: string // builder may override canonical when the default behavior is wrong
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function buildBibleChapterMetadata(bookName: string, chapter: number): DynamicMetadata { ... }
export function buildBiblePlanMetadata(planSlug: string, planTitle: string): DynamicMetadata { ... }
export function buildBiblePlanDayMetadata(planSlug: string, planTitle: string, dayNumber: number, dayTitle?: string): DynamicMetadata { ... }
export function buildBibleSearchMetadata(query: string | null): DynamicMetadata { ... }
```

**The invariant:** every `<SEO>` call site in the codebase imports from `routeMetadata.ts` and passes the result in. No new inline strings at call sites. Simple static pages become two-line diffs:

```tsx
import { SEO } from '@/components/SEO'
import { DAILY_HUB_PRAY_METADATA } from '@/lib/seo/routeMetadata'
// ...
<SEO {...DAILY_HUB_PRAY_METADATA} />
```

Dynamic pages call a builder:

```tsx
<SEO {...buildBibleChapterMetadata(book.name, chapterNumber)} />
```

**Source of truth rule:** `/code-review --spec` should flag any new inline title/description literal at a `<SEO>` call site. The plan phase may propose a lightweight ESLint rule or a code-review checklist item — final decision deferred to the plan phase.

### Daily Hub tab-aware metadata

DailyHub.tsx currently renders one `<SEO>` block. BB-40 changes this to read the current tab via the BB-38 hook (`useDailyHubTab`) and pick one of four metadata constants:

```tsx
const tab = useDailyHubTab() // 'devotional' | 'pray' | 'journal' | 'meditate'
const metadata = {
  devotional: DAILY_HUB_DEVOTIONAL_METADATA,
  pray: DAILY_HUB_PRAY_METADATA,
  journal: DAILY_HUB_JOURNAL_METADATA,
  meditate: DAILY_HUB_MEDITATE_METADATA,
}[tab]
return <SEO {...metadata} jsonLd={dailyHubBreadcrumbs} />
```

The canonical URL still resolves to `/daily` because `UI_STATE_PARAMS` in `SEO.tsx` strips `?tab=`. All four tab variants share one canonical — that is the correct SEO posture because they are variants of the same resource, not separate resources. But each tab still gets a distinct title, description, and OG image in the live preview, so sharing a specific tab lands with a specific card.

### `lib/seo/canonicalUrl.ts` — optional helper extraction

The current `buildCanonicalUrl` function lives inside `SEO.tsx` (lines 21-39). It is already correct — it reads `SITE_URL` from `VITE_SITE_URL`, strips `UI_STATE_PARAMS`, accepts an override path, and preserves non-UI-state query params.

BB-40 **may** extract this helper into `frontend/src/lib/seo/canonicalUrl.ts` so:

1. Unit tests can exercise it directly without rendering `<SEO>` under a `HelmetProvider`.
2. The metadata builders in `routeMetadata.ts` can reuse it for routes where the canonical depends on runtime state (e.g. a plan day's canonical includes the day path).

The extraction is optional because:

- The helper already works correctly inside `SEO.tsx`.
- Extracting it touches an existing file that 39 other files depend on, which has some regression risk.
- Builders that need to override canonical can just pass the path string and let `SEO.tsx`'s existing `canonicalOverride` param handle the rest.

**Plan phase decides.** The cleanest call is probably to extract, but the plan phase owns the final judgment and explains the reasoning in the plan document.

### OG card images

Stored under `frontend/public/og/`. Each image is 1200×630 (Facebook/LinkedIn/Twitter canonical OG size), PNG, under 100 KB. Total weight budget for the full set: under 1.5 MB in `public/` (not bundled — served as static assets).

**Existing:**

- `frontend/public/og-default.png` (already present at repo root of `public/`, NOT inside an `og/` subdirectory). BB-40 either keeps it at its existing path as the fallback or moves it to `frontend/public/og/default.png` — plan phase reconciles. The safer call is to keep it at its existing path so any external cache invalidation does not strand the old URL.

**New images to produce (14 total):**

| Path | Purpose |
|---|---|
| `frontend/public/og/home.png` | Home page branded card |
| `frontend/public/og/bible-landing.png` | `/bible` landing page |
| `frontend/public/og/bible-chapter.png` | Default chapter card (used by `/bible/:book/:chapter` when no book-specific card exists) |
| `frontend/public/og/daily-devotional.png` | Daily Hub devotional tab |
| `frontend/public/og/daily-pray.png` | Daily Hub pray tab |
| `frontend/public/og/daily-journal.png` | Daily Hub journal tab |
| `frontend/public/og/daily-meditate.png` | Daily Hub meditate tab |
| `frontend/public/og/my-bible.png` | `/bible/my` personal layer |
| `frontend/public/og/plans-browser.png` | `/bible/plans` browser |
| `frontend/public/og/plans/anxiety.png` | When You're Anxious plan |
| `frontend/public/og/plans/sleep.png` | When You Can't Sleep plan |
| `frontend/public/og/plans/psalms-30.png` | 30 Days in the Psalms plan |
| `frontend/public/og/plans/jesus-john.png` | The Story of Jesus (John) plan |
| `frontend/public/og/ask.png` | `/ask` AI Bible chat |

**Visual design brief:** Dark cinematic background matching `bg-hero-bg` (#08051A), Worship Room wordmark top-left or center, large Inter bold page title (dominant visual element), optional subtle accent — a verse reference, a tab name, a plan name. No stock photography. No cheap clip art. The cinematic dark theme is the visual reference; OG cards that feel default-y undermine the app's positioning.

**Generation approach:** The plan phase proposes either (a) a Node script using `sharp` or `canvas` that reads from a template and produces all 14 images programmatically, or (b) hand-designed images exported from Figma. Each approach has trade-offs — generated images are cheaper to iterate and add to, hand-designed images give finer control over visual quality. **The plan phase chooses one approach, reports it, and pauses for user approval before producing the images.** The default preference is the generation script, because it is easier to keep the set visually consistent and easier to extend in future specs (adding a card for a new plan becomes one data-file line plus a regeneration run).

**Image weight enforcement:** The plan phase adds a build-time check (CI or a pnpm script) that fails if any `frontend/public/og/**/*.png` exceeds 100 KB. This prevents future accidental bloat from unoptimized PNGs landing in the repo.

### JSON-LD additions

**Verify existing:**

- `Home.tsx` — should render a `WebSite` or `WebApplication` block with `name`, `url`, `description`, and a `potentialAction` for the AI Bible chat search (`SearchAction` targeting `/ask?q=...`). The plan phase reads the existing `homepageJsonLd` constant and confirms it meets Schema.org expectations.
- `DailyHub.tsx` — already renders a `dailyHubBreadcrumbs` JSON-LD block. Plan phase confirms the structure.
- `MyBiblePage.tsx` — already renders a `myBibleBreadcrumbs` block. Plan phase confirms.
- `BibleReader.tsx` — currently renders no JSON-LD. BB-40 adds a `BreadcrumbList` of `Home → Bible → Book → Chapter`.

**Add:**

- `BibleReader.tsx` — `BreadcrumbList` with four crumbs: `Worship Room` (`/`), `Bible` (`/bible`), `<book name>` (`/bible/:book`), `<book> <chapter>` (current URL).
- `BiblePlanDetail.tsx` — `BreadcrumbList`: `Bible → Plans → <plan title>`.
- `BiblePlanDay.tsx` — `BreadcrumbList`: `Bible → Plans → <plan title> → Day <n>`.

**Do not add:**

- JSON-LD on personal-layer pages (`/bible/my`, `/my-prayers`, `/insights`, `/settings`, `/friends`) beyond the existing minimal breadcrumbs — those pages are flagged `noIndex` anyway, so structured data has no value.
- JSON-LD on redirect routes (`/devotional`, `/reading-plans`, etc.).

### Route inventory and coverage

The plan phase reads `frontend/src/App.tsx` and produces a full enumerated list. The expected outcome matches what reconnaissance already found:

**Already renders `<SEO>` (39 routes, may need metadata consolidation):**

- `/` (RootRoute → Home or Dashboard)
- `/daily` (DailyHub)
- `/bible` (BibleLanding) — also serves `?mode=search` and `?mode=search&q=<query>`
- `/bible/browse` (BibleBrowse)
- `/bible/my` (MyBiblePage)
- `/bible/plans` (PlanBrowserPage)
- `/bible/:book/:chapter` (BibleReader) — also handles 404 chapter/book states
- `/ask` (AskPage)
- `/grow` (GrowPage) — tabbed plans/challenges hub
- `/reading-plans/:planId` (ReadingPlanDetail) — legacy route, still has SEO
- `/challenges/:challengeId` (ChallengeDetail)
- `/music` (MusicPage)
- `/music/routines` (RoutinesPage)
- `/prayer-wall` (PrayerWall)
- `/prayer-wall/:id` (PrayerDetail)
- `/prayer-wall/user/:id` (PrayerWallProfile)
- `/prayer-wall/dashboard` (PrayerWallDashboard)
- `/local-support/churches` (Churches)
- `/local-support/counselors` (Counselors)
- `/local-support/celebrate-recovery` (CelebrateRecovery)
- `/my-prayers` (MyPrayers)
- `/friends` (Friends)
- `/settings` (Settings)
- `/insights` (Insights)
- `/insights/monthly` (MonthlyReport)
- `/profile/:userId` (GrowthProfile)
- `/meditate/breathing` through `/meditate/examen` (6 sub-pages)
- `/verse/:id` (SharedVerse)
- `/prayer/:id` (SharedPrayer)
- `/register` (RegisterPage)
- `/health` (Health) — may be excluded from metadata work since it's a backend health probe route
- BibleStub (if still reachable)

**Known coverage gaps — `<SEO>` missing today (confirmed by recon):**

- `/bible/plans/:slug` (`BiblePlanDetail.tsx`) — no `<SEO>` import, no `<SEO>` render
- `/bible/plans/:slug/day/:dayNumber` (`BiblePlanDay.tsx`) — no `<SEO>` import, no `<SEO>` render

BB-40 adds `<SEO>` to both via builder functions. The plan phase greps the full pages/ directory one more time to confirm no other gaps were missed.

**Routes that intentionally have no metadata work:**

- `/pray`, `/journal`, `/meditate`, `/scripture`, `/devotional`, `/challenges`, `/reading-plans`, `/bible/search`, `/music/playlists`, `/music/ambient`, `/music/sleep` — all redirects via `<Navigate>` or internal redirect components. Metadata is handled by whatever route they redirect to.
- `/dev/mood-checkin` — dev-only, should be flagged `noIndex` if it is rendered at all in production bundles.
- `/login` — currently a `ComingSoon` stub; minimal metadata or `noIndex` is fine. Plan phase picks.
- `*` (NotFound) — already has or should have `<SEO title="Page Not Found" noIndex />`. Plan phase verifies.

### Canonical URL strategy (BB-38 reconciliation)

BB-38 introduced several URL parameters. The canonical strategy for each:

| Route / param | Behavior in canonical | Reasoning |
|---|---|---|
| `/bible/:book/:chapter?verse=16` | Canonical is `/bible/:book/:chapter`, no `?verse=` | The chapter is the canonical resource; a verse selection is a deep-link variant of the same resource |
| `/bible/:book/:chapter?verse=16-18&action=reflect` | Canonical is `/bible/:book/:chapter`, no `?verse=`, no `?action=` | Same — sub-view state is not a separate resource |
| `/bible/:book/:chapter?scroll-to=16` | Canonical is `/bible/:book/:chapter`, no `?scroll-to=` | One-shot scroll target is UI state, not content identity |
| `/daily?tab=pray` | Canonical is `/daily`, no `?tab=` (already works via `UI_STATE_PARAMS`) | All four tabs are variants of the same canonical Daily Hub page |
| `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` | Canonical is `/daily`, strip all params | Verse params are transient context pass-through, not identity |
| `/bible?mode=search&q=love` | Canonical preserves `?mode=search&q=love` | The search query IS the resource identifier; a search for "love" is a different resource from a search for "peace" |
| `/bible/plans/:slug/day/:dayNumber` | Canonical is the full path | Each day is its own canonical resource |
| `/bible/plans/:slug/day/:dayNumber?verse=5` | Canonical strips `?verse=` | Verse selection inside a plan day is sub-state of the day resource |
| `/bible/my?view=highlights` | Canonical is `/bible/my`, strip `?view=` IF BB-40 decides `?view=` is UI state | Plan phase decides based on whether view sub-tabs should compete in search results |

**Concrete actions for canonical handling:**

1. `?verse=`, `?scroll-to=`, `?action=` — **already handled** at the BibleReader.tsx call site because it passes an explicit `canonical={`/bible/${bookSlug}/${chapterNumber}`}`. Plan phase verifies, and extends the same override pattern to any additional chapter-level routes that pass verse params.
2. `?tab=` — **already stripped** by `UI_STATE_PARAMS`. No change.
3. `?verseRef=`, `?verseText=`, `?verseTheme=` — add to `UI_STATE_PARAMS` so they are stripped from the Daily Hub canonical. Plan phase confirms via grep that these are the only param names used for the Spec Z verse pass-through.
4. `?q=` on `/bible?mode=search` — needs a builder function in `routeMetadata.ts` because this is the one case where a query param IS meaningful to the canonical. The builder passes `canonical={`/bible?mode=search&q=${encodeURIComponent(query)}`}` through to `<SEO>`. `<SEO>` currently strips non-UI params by default — verify by reading `buildCanonicalUrl` in SEO.tsx. The behavior looks correct today: `UI_STATE_PARAMS` only contains `'tab'`, so `?q=` and `?mode=` survive the default canonical path. Plan phase confirms.
5. `?view=` on `/bible/my` — plan phase decides whether to add it to `UI_STATE_PARAMS` or leave it. The MyBiblePage is `noIndex` anyway, so the canonical value is cosmetic — the SEO signal that matters is `noIndex`, not the canonical itself. Default posture: leave it, since there is no ranking consequence.

**Scope guard:** `UI_STATE_PARAMS` currently contains only `'tab'`. BB-40 adds `'verseRef'`, `'verseText'`, `'verseTheme'`, and any other params the plan phase identifies via `grep`. It does NOT add `'q'`, `'mode'`, or `'verse'` (chapter verse is handled via explicit `canonical` override, not via the strip list).

### Noindex strategy

Routes flagged `noIndex`:

- `/bible/my` and any sub-view states — already recommended in the inbound spec, verify current state during plan phase
- `/my-prayers` — personal prayer list
- `/insights` and `/insights/monthly` — personal mood analytics
- `/settings` — user settings
- `/friends` — friends and leaderboard
- `/profile/:userId` — growth profile (even though URL is not auth-gated, the content is user-specific enough that competing with other growth profiles in search results has no value)
- `/prayer-wall/dashboard` — private prayer dashboard
- `/prayer-wall/user/:id` — public prayer profile page. Plan phase decides — the URL is public and the content is intentionally shareable, so `noIndex` may be wrong here. Default posture: leave indexable.
- `/dev/mood-checkin` — dev-only. `noIndex` if ever rendered in production.
- `*` NotFound — `noIndex` so 404 pages don't accumulate in search indexes.
- `/login`, `/register` — stub pages, `noIndex` until Phase 3 real auth ships.

**Not flagged `noIndex`:**

- Dashboard (`/`) — the root route serves both Home (logged-out) and Dashboard (logged-in). The canonical metadata is the Home metadata; crawlers see Home because they are logged out. `noIndex` would de-index the Home page, which is wrong.
- All content routes: Bible reader, Daily Hub, devotional, prayers wall feed, ask, music, challenges, plans.

### Test approach

**New unit tests:**

- `frontend/src/lib/seo/__tests__/routeMetadata.test.ts` — at least 15 tests exercising:
  - Every static constant has a non-empty title and description.
  - Every title is ≤ 60 characters after the "| Worship Room" suffix would be applied (titles feeding into the `<SEO>` component get a 14-character suffix appended, so raw strings must be ≤ 46 characters to stay under the 60-character hard SEO limit; plan phase finalizes the exact cutoff and whether to use `noSuffix`).
  - Every description is ≤ 160 characters (Google's typical SERP snippet cutoff).
  - Every builder function returns a complete `DynamicMetadata` object given valid input.
  - Builders handle missing/invalid inputs gracefully (return sensible defaults, do not throw).
  - `buildBibleSearchMetadata(null)` returns a "Search the Bible" default, not a broken "Search for: null" string.
- `frontend/src/lib/seo/__tests__/canonicalUrl.test.ts` (if the helper is extracted) — at least 10 tests covering:
  - Reads `SITE_URL` from env with fallback
  - Strips `UI_STATE_PARAMS` (`tab`, `verseRef`, `verseText`, `verseTheme`)
  - Preserves non-UI params (`q`, `mode`)
  - Handles `canonicalOverride` correctly (does not merge query from current URL when override is provided)
  - Normalizes trailing slash
  - Handles empty path → `/`
  - Handles query param with `&` separators

**Augment existing unit tests:**

- `frontend/src/components/__tests__/SEO.test.tsx` already exists and unmocks `react-helmet-async` to assert real Helmet behavior. BB-40 adds cases for any new props (e.g. `ogImageAlt`) and for any changes to default behavior.

**Integration tests (per page):**

- For each of the 2 gap routes (`BiblePlanDetail`, `BiblePlanDay`), add a test that renders the page under `HelmetProvider` + `MemoryRouter`, then queries `document.head` for the expected `og:title`, `og:description`, `og:image`, and `canonical` tags. Use `react-helmet-async`'s `Helmet.peek()` API or direct `document.querySelector` against the test DOM.
- For the 4 Daily Hub tab variants, add tests that render `DailyHub` with different `?tab=` URL params and assert that the meta tags change accordingly.
- Bible chapter reader: add one test that verifies the `BreadcrumbList` JSON-LD is serialized into a `<script type="application/ld+json">` tag with the correct shape.

**Pre-existing failing tests:** NOT touched. Same posture as BB-38.

**Test wrapper helper:** If the plan phase finds that more than a handful of existing page tests break because they render `<SEO>` without wrapping in `HelmetProvider`, add a shared `renderWithHelmet` helper to `frontend/src/test/helpers.ts` (or equivalent). The current `test/setup.ts` global mock should make this unnecessary, but the plan phase verifies by running the full test suite before and after changes. **Zero test regressions** is a hard acceptance criterion.

---

## Auth Gating

**BB-40 adds zero auth gates.** Same posture as BB-30 through BB-38. The `<SEO>` component renders the same metadata regardless of authentication state — this is intentional and correct, because a search crawler or social scraper is by definition never authenticated, and the metadata needs to reflect what a logged-out visitor sees.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Share a deep link to a Bible chapter | Rich OG preview renders on the target platform using metadata from `routeMetadata.ts`. No auth required. | Same. | N/A |
| Share a deep link to `/daily?tab=pray` | Rich OG preview renders using `DAILY_HUB_PRAY_METADATA`. Canonical collapses to `/daily`. | Same. | N/A |
| Share a deep link to `/bible/my` or `/insights` | Rich OG preview renders using the generic `noIndex` metadata; search engines do not index the page. Social previews still render because OG is separate from search indexing. | Same. | N/A |
| Search engine crawls `/settings` | Page returns `<meta name="robots" content="noindex" />`. | Same. | N/A |
| User clicks a shared deep link | BB-38 handles the routing and content. BB-40 has no runtime behavior beyond the meta tag emission. | Same. | N/A |

The only runtime behavior change is the meta tags in `<head>`. The user never sees BB-40 directly — they only feel its effects when someone shares a Worship Room URL and the preview looks intentional.

---

## Responsive Behavior

BB-40 has **no visible UI**. The only "UI" is the OG card images, which are 1200×630 static PNGs rendered by whatever platform (Twitter, Facebook, LinkedIn, iMessage, Discord, Slack, WhatsApp) consumes them. Each platform has its own responsive rendering rules for OG cards — Twitter large-summary at top, LinkedIn side-by-side preview, iMessage full-width card preview, etc.

| Surface | Rendering |
|---|---|
| Twitter `summary_large_image` | 1200×630, top-cropped if the platform client enforces 1.91:1 ratio |
| Facebook | 1200×630 displayed full-width in feed, 1.91:1 ratio enforced |
| LinkedIn | ~1200×630 side-by-side preview |
| Discord embed | Adapts to embed width |
| iMessage rich link preview | ~1200×630 card below the message |
| Slack unfurl | Same OG card |
| Google search result rich snippet | Title + description + optional image thumbnail |

The 1200×630 target was chosen because it satisfies all major platforms simultaneously. Smaller images get upscaled; larger images get downscaled. No additional responsive breakpoints for OG images are required.

Image design guidance: **safe zone for critical visual elements is the center 1100×530** (allowing 50px margin on each side for platforms that crop or round the corners). Keep the wordmark and page title inside the safe zone.

---

## AI Safety Considerations

N/A — BB-40 does not generate AI content and does not accept free-text user input. It reads static content from `routeMetadata.ts` and renders it into meta tags. No crisis detection path, no moderation path, no user-facing input.

Note: Bible chapter pages do render verse text from the WEB Bible in their descriptions (via the dynamic builder). Verse text is WEB-licensed public domain content already shipping in the app; BB-40 does not process it beyond truncating for the 160-character description limit.

---

## Auth & Persistence

- **Logged-out users:** See the same meta tags as logged-in users. Zero persistence. Zero localStorage writes. Zero backend calls. BB-40's runtime is entirely React → `<head>` tag emission.
- **Logged-in users:** Same as above. No per-user customization of metadata.
- **localStorage usage:** None. BB-40 reads exclusively from bundled static content (`routeMetadata.ts` + content data files like `frontend/src/data/bible/books/json/*.json` and `frontend/src/data/reading-plans/*`).
- **Environment variables read:** `VITE_SITE_URL` (already documented in `.env.example`, already read by existing `SEO.tsx`). No new env vars.

---

## Completion & Navigation

N/A — BB-40 is infrastructure, not a Daily Hub tab, not a completion-tracked activity, not a navigation feature. It has no "done" state from the user's perspective.

---

## Design Notes

- **No new visual patterns on Worship Room pages.** The existing `<SEO>` component is invisible to the user — BB-40 does not introduce any new React components.
- **OG card visual design is the only design work.** Reference the Worship Room cinematic dark theme: `bg-hero-bg` (#08051A) background, white and purple gradient text (via the `GRADIENT_TEXT_STYLE` pattern used in `SectionHeading`), Inter bold typography, subtle purple glow accents. OG cards should feel consistent with the cards in `DashboardPreview` and the section headings across the homepage and Daily Hub.
- **OG cards are NOT reactive** — they are static PNGs committed to `frontend/public/og/`. Do not try to render them via React or server-side templating. Crawlers fetch them as static HTTP resources.
- **Reference `09-design-system.md` § "Round 3 Visual Patterns"** for the color palette, typography, and glow opacity range. The OG card generation script (if chosen) reads these values directly.
- **The Worship Room wordmark** is the primary brand element on every OG card. If the codebase already has a branded wordmark asset (SVG or PNG), reuse it. If not, the plan phase produces one as part of the OG image work.
- **Do not over-design the cards.** The inbound spec explicitly warns against "cheap" or "default-y" designs, but the opposite failure mode is cards that are so elaborate they don't read at thumbnail sizes in a feed. The primary readability target is a 500×260 preview tile — the Worship Room wordmark and the page title must be legible at that size. Accent elements (verse references, plan names) can be smaller.
- **New visual patterns flagged as new:** The OG card layout is a new pattern not captured in `09-design-system.md` today. The plan phase may propose adding a brief "OG Card Design" section to the design system rules file as part of BB-40, or it may defer that to a future documentation pass. Default: add it if the image work is non-trivial.

---

## Out of Scope

- **No `sitemap.xml` or `robots.txt`.** Deferred to deployment spec.
- **No dynamic OG image generation** (per-verse, per-plan-day cards beyond the hand-selected set). Deferred to a future spec.
- **No personal-page OG cards.** `/bible/my`, `/my-prayers`, `/settings`, `/insights`, `/friends`, `/profile/:userId` use the generic Worship Room default card.
- **No SSR / pre-rendering.** Client-side meta tag injection only.
- **No multi-language metadata.** English only.
- **No A/B tested titles.** One canonical definition per route.
- **No analytics for share preview impressions.** Out of scope.
- **No "click to regenerate preview" admin UI.** Out of scope.
- **No changes to `index.html` `<head>` defaults.**
- **No migration of the existing `<SEO>` component path.** Stays at `frontend/src/components/SEO.tsx`. The inbound spec's proposed `components/seo/SEO.tsx` path is rejected because moving it breaks 39 existing imports with no upside.
- **No changes to BB-38 routing, URL parameter contracts, or the `verseActionRegistry`.**
- **No auth gating work.** Zero new auth gates.
- **No new localStorage keys.** Zero persistence.
- **No backend changes.** Pure frontend.
- **No production `VITE_SITE_URL` value set.** The default fallback in `SEO.tsx` (`https://worshiproom.com`) is a placeholder — real production domain configuration is a deployment concern.
- **No automated verification against real social platforms.** Manual post-deploy validation only, documented as a follow-up checklist in the recon doc.
- **No removal of the existing `og-default.png`.** Stays at `frontend/public/og-default.png` as the fallback.
- **Pre-existing failing tests are NOT touched.**

---

## Acceptance Criteria

### Infrastructure (already satisfied — verify during plan)

- [ ] `react-helmet-async@^2.0.5` (or newer compatible version) is present in `frontend/package.json` (verified during recon — currently installed)
- [ ] `<HelmetProvider>` wraps the React tree in `frontend/src/App.tsx` (verified during recon)
- [ ] `<SEO>` component exists at `frontend/src/components/SEO.tsx` and accepts `title`, `description`, `noSuffix`, `ogImage`, `ogType`, `canonical`, `noIndex`, and `jsonLd` props (verified during recon)
- [ ] `frontend/.env.example` documents `VITE_SITE_URL` (verified during recon)
- [ ] `frontend/src/test/setup.ts` globally mocks `react-helmet-async` for page tests that do not wrap with `HelmetProvider` (verified during recon)

### New infrastructure added by BB-40

- [ ] `frontend/src/lib/seo/routeMetadata.ts` exists and exports static constants for every static route plus builder functions for every dynamic route
- [ ] `frontend/src/lib/seo/routeMetadata.ts` is the single source of truth for every user-facing title and description string — no inline literals at `<SEO>` call sites
- [ ] (Optional — plan phase decides) `frontend/src/lib/seo/canonicalUrl.ts` exists with the extracted `buildCanonicalUrl` helper, OR the helper remains inside `SEO.tsx` with a documented rationale in the plan
- [ ] `_plans/recon/bb40-seo-metadata.md` documents the full route inventory, canonical URL strategy, OG card image inventory, noindex routes, and every title/description string for review

### Content consolidation pass

- [ ] Every page already rendering `<SEO>` (39 routes) now imports its metadata from `routeMetadata.ts` instead of passing inline string literals
- [ ] Every title is ≤ 60 characters (including the " | Worship Room" suffix applied by `SEO.tsx`)
- [ ] Every description is ≤ 160 characters
- [ ] No description is generic boilerplate ("Worship Room is a Christian emotional healing app") — each describes what the user will find on that specific page
- [ ] Draft titles and descriptions are reviewed and approved by the user before any page files are touched (plan phase MUST pause after producing the draft strings — see "Notes for execution")

### Coverage gap fill

- [ ] `BiblePlanDetail.tsx` renders `<SEO>` using `buildBiblePlanMetadata(slug, title)`
- [ ] `BiblePlanDay.tsx` renders `<SEO>` using `buildBiblePlanDayMetadata(slug, title, dayNumber, dayTitle)`
- [ ] Plan phase confirms via grep pass that no other user-facing routes are missing `<SEO>`
- [ ] Any routes discovered during the grep pass are added to the inventory and receive `<SEO>`

### Daily Hub tab-aware metadata

- [ ] `DailyHub.tsx` uses the BB-38 `useDailyHubTab` hook to pick one of 4 static metadata constants per tab
- [ ] Canonical URL for all 4 Daily Hub tabs resolves to `https://<site>/daily` with no query parameters
- [ ] Each tab has a distinct `og:image` path (`/og/daily-devotional.png`, `/og/daily-pray.png`, `/og/daily-journal.png`, `/og/daily-meditate.png`)
- [ ] Each tab has a distinct `og:title` and `og:description`
- [ ] Switching tabs in the browser updates the rendered `<title>` and OG meta tags (verified via integration test, not just by inspection)

### Canonical URL behavior (BB-38 reconciliation)

- [ ] `/bible/:book/:chapter?verse=16` canonical is `/bible/:book/:chapter`
- [ ] `/bible/:book/:chapter?verse=16-18&action=reflect` canonical is `/bible/:book/:chapter`
- [ ] `/bible/:book/:chapter?scroll-to=16` canonical is `/bible/:book/:chapter`
- [ ] `/daily?tab=pray` canonical is `/daily` (already works via existing `UI_STATE_PARAMS`, verify)
- [ ] `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` canonical is `/daily` (requires adding `verseRef`, `verseText`, `verseTheme` to `UI_STATE_PARAMS`)
- [ ] `/bible?mode=search&q=love` canonical preserves `?mode=search&q=love`
- [ ] `/bible/plans/:slug/day/:dayNumber` canonical is the full path
- [ ] `/bible/plans/:slug/day/:dayNumber?verse=5` canonical strips `?verse=`

### OG card images

- [ ] All 14 new OG card PNGs exist under `frontend/public/og/` at the paths documented above
- [ ] Existing `frontend/public/og-default.png` is preserved as the fallback (not deleted, not moved)
- [ ] Each PNG is exactly 1200×630 pixels
- [ ] Each PNG is ≤ 100 KB file size
- [ ] Total weight of all OG card PNGs (existing default + 14 new) is ≤ 1.5 MB
- [ ] A pnpm script or CI check exists that fails if any file under `frontend/public/og/*.png` exceeds 100 KB
- [ ] Plan phase proposes the generation approach (script vs hand-designed) and pauses for user approval before producing images
- [ ] The user approves at least one sample card before the remaining 13 are generated or exported

### JSON-LD

- [ ] `Home.tsx` JSON-LD is verified to contain a `WebSite` or `WebApplication` block with `name`, `url`, `description`
- [ ] `BibleReader.tsx` renders a `BreadcrumbList` JSON-LD with 4 crumbs (`Worship Room`, `Bible`, `<book name>`, `<book> <chapter>`)
- [ ] `BiblePlanDetail.tsx` renders a `BreadcrumbList` JSON-LD with 3 crumbs (`Bible`, `Plans`, `<plan title>`)
- [ ] `BiblePlanDay.tsx` renders a `BreadcrumbList` JSON-LD with 4 crumbs (`Bible`, `Plans`, `<plan title>`, `Day <n>`)
- [ ] Every JSON-LD block serializes to valid JSON in the rendered `<script type="application/ld+json">` tag
- [ ] Every JSON-LD block passes validation against Schema.org expectations (manual verification via Google's Rich Results Test is a post-deploy step, not an automated AC)

### Noindex

- [ ] `/bible/my` has `noIndex` set
- [ ] `/my-prayers` has `noIndex` set
- [ ] `/insights` has `noIndex` set
- [ ] `/insights/monthly` has `noIndex` set
- [ ] `/settings` has `noIndex` set
- [ ] `/friends` has `noIndex` set
- [ ] `/profile/:userId` has `noIndex` set
- [ ] `/prayer-wall/dashboard` has `noIndex` set
- [ ] `*` NotFound route has `noIndex` set
- [ ] `/login`, `/register` (stub) have `noIndex` set until Phase 3 real auth ships
- [ ] Dashboard (`/` when logged in) does NOT have `noIndex` set — the canonical metadata is the Home page metadata, which must remain indexable
- [ ] Plan phase produces a short decision table for `/prayer-wall/user/:id` and gets user approval on whether it is indexable or `noIndex` (default: indexable)

### Testing

- [ ] `frontend/src/lib/seo/__tests__/routeMetadata.test.ts` has at least 15 tests covering static constants, builder functions, title length limits, description length limits, and edge cases
- [ ] If `canonicalUrl.ts` is extracted, its test file has at least 10 tests
- [ ] `frontend/src/components/__tests__/SEO.test.tsx` is updated for any new props added in BB-40 (likely just a handful of additional cases, not a rewrite)
- [ ] At least one integration test renders `DailyHub` with each of the 4 `?tab=` values and asserts the meta tags change accordingly
- [ ] At least one integration test renders `BibleReader` and asserts the `BreadcrumbList` JSON-LD is present and correctly shaped
- [ ] At least one integration test per new-coverage page (`BiblePlanDetail`, `BiblePlanDay`) asserts the rendered meta tags
- [ ] All BB-30, BB-31, BB-32, BB-38 tests continue to pass unchanged (`pnpm test` is clean)
- [ ] Pre-existing failing tests are NOT touched and do not increase in count

### Build and lint

- [ ] `pnpm build` passes with 0 errors, 0 warnings
- [ ] `pnpm lint` does not introduce any new warnings
- [ ] No TypeScript errors
- [ ] Bundle size impact is documented in the plan output — the dependency is already installed so the JS delta is 0; the OG images add ≤ 1.5 MB to `public/` (not bundled)

### Documentation

- [ ] `_plans/recon/bb40-seo-metadata.md` exists and includes:
  - Full route inventory table (path → component → status → canonical URL → noindex flag)
  - Canonical URL strategy (the table in this spec, reconciled with reality after recon)
  - OG card image inventory (path → purpose → source → design notes)
  - Every title and description string as written (for review)
  - Manual post-deploy validation checklist (Twitter card validator, Facebook sharing debugger, LinkedIn post inspector, Google Rich Results Test, iMessage / Discord / Slack manual share tests)
  - Follow-up items deferred to future specs

### Scope guarantees

- [ ] Zero new auth gates
- [ ] Zero new localStorage keys
- [ ] Zero new backend dependencies
- [ ] Zero new npm packages (react-helmet-async is already installed)
- [ ] Zero changes to BB-38 routing or URL parameter contracts
- [ ] Zero changes to `index.html` `<head>` defaults
- [ ] Zero changes to the path of the existing `<SEO>` component
- [ ] Zero changes to the public prop API of the existing `<SEO>` component beyond additive prop additions

---

## Notes for execution

- **The content is the load-bearing work.** The plan phase MUST produce draft titles and descriptions for every route as a pre-commit deliverable and pause for user review before any page files are touched. Strings that are too generic ("Worship Room — Bible reader"), too long (over 60 characters for titles, over 160 for descriptions), or too vague to distinguish one page from another are the #1 failure mode. The user has final approval on every string.
- **OG card design matters.** The plan phase produces at least one sample card (probably the home card or the Bible chapter default card) and pauses for approval before producing the remaining 13. Iterating on 1 card is cheap; iterating on 14 after the fact is expensive.
- **Do NOT break the 39 existing `<SEO>` imports.** The component stays at `frontend/src/components/SEO.tsx`. Any migration of inline strings to `routeMetadata.ts` should be a series of small, atomic edits — import the constant/builder, replace the props, run the test suite. Not a mass rename.
- **The Daily Hub tab-aware metadata change is the highest-risk code edit** because DailyHub.tsx is a large file with many providers and effects. The plan phase confirms the `useDailyHubTab` import path and runs a pre-edit test to establish baseline behavior before changing the `<SEO>` render call.
- **Use the existing test mock as the default.** `frontend/src/test/setup.ts` globally mocks `react-helmet-async`. Tests that need to assert real Helmet behavior (like the existing `SEO.test.tsx`) use `vi.unmock('react-helmet-async')` at the top of the file. The plan phase does NOT remove the global mock.
- **Post-deploy manual verification** is the only reliable way to confirm OG cards render correctly on every platform. The recon doc includes a checklist of platforms to test. Do not try to automate it — each platform's crawler has quirks that no automated test harness catches.
- **`VITE_SITE_URL` in local dev** defaults to `https://worshiproom.com` via `SEO.tsx`'s fallback. For accurate canonical URLs in dev, the developer may set `VITE_SITE_URL=http://localhost:5173` in `.env.local`. BB-40 does NOT require this — the fallback means BB-40 works without any env configuration.
- **The plan phase reads `frontend/src/App.tsx` fully** to produce the route inventory. It does not rely on this spec's list as exhaustive. Any routes discovered during the read that aren't in this spec are added to the plan's inventory and receive metadata per the patterns here.
- **Pre-existing failing tests are NOT touched.** Same posture as BB-30 through BB-38.
- **Do not add a sitemap, robots.txt, or any deployment-layer configuration.** Those are deployment concerns. BB-40 is application-layer only.
- **Do not touch the `<head>` content in `index.html`.** The existing defaults are the fallback for non-JS crawlers and for routes without `<SEO>`. Changing them has side effects on every page.
- **After BB-40 ships, BB-39 (PWA + offline) is next.** BB-39 will read `_plans/recon/bb40-seo-metadata.md` to determine the service worker precache list. BB-40's route inventory becomes BB-39's precache manifest source of truth, so the recon doc is not just a documentation artifact — it's a load-bearing handoff.

---

## Pre-execution checklist (for CC, before `/execute-plan`)

Before CC runs `/execute-plan`, confirm these items:

1. **BB-38 is shipped and committed.** Verified — the most recent commits on `bible-redesign` are `f5eabf5 bb-38-verification-followups` and `1339c6b bb-38-deep-linking-architecture`.
2. **The `<SEO>` component and `<HelmetProvider>` already exist.** Verified during recon — see "Reality check" section above.
3. **The route map in `frontend/src/App.tsx` is current.** The plan phase re-reads it during recon and enumerates every route. Any discrepancies between this spec and the actual file are resolved in favor of the file.
4. **`frontend/.env.local` does not need to set `VITE_SITE_URL` for BB-40 to function.** The fallback in `SEO.tsx` handles unset cases. Setting it locally is recommended for accurate canonical URL display in dev but is not a precondition.
5. **Decision on `canonicalUrl.ts` extraction is deferred to the plan phase.** CC proposes one approach, reports the reasoning, and gets user approval before committing.
6. **Decision on OG image generation approach (script vs hand-designed) is deferred to the plan phase.** CC proposes one approach, produces a sample, and gets user approval before producing the remaining cards.
7. **Stay on `bible-redesign` branch.** No new branch, no merge. Verified — BB-40 commits directly to `bible-redesign`.
8. **No new SDK packages.** `react-helmet-async` is already installed; BB-40 adds zero dependencies.
9. **`<SEO>` component stays at `frontend/src/components/SEO.tsx`.** Do not move it to `components/seo/SEO.tsx`. The inbound spec's proposed path is rejected.
10. **Pre-existing failing tests are NOT touched.** Same posture as BB-38.

No user action is required before `/execute-plan` can run beyond the approvals called out in item 5 and 6 during the plan phase itself.
