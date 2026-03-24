# Implementation Plan: SEO — Per-Page Titles, Meta Descriptions, Open Graph, Sitemap & Structured Data

**Spec:** `_specs/seo-meta-sitemap-opengraph.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/seo-meta-sitemap-opengraph`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable (no visual UI changes)
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS
- **Entry point:** `frontend/src/main.tsx` → renders `App` component
- **Provider chain (App.tsx):** `QueryClientProvider` → `BrowserRouter` → `AuthProvider` → `ToastProvider` → `AuthModalProvider` → `AudioProvider` → `<Routes>`
- **Pages directory:** `frontend/src/pages/` — ~35 page components rendered by routes
- **Public assets:** `frontend/public/` — icons, manifest, offline.html, audio/
- **Test pattern:** Vitest + RTL, MemoryRouter wrapper, vi.mock for hooks

### Key Files
- **App.tsx** (`frontend/src/App.tsx`) — Routes + provider chain. HelmetProvider goes here.
- **index.html** (`frontend/index.html`) — Static `<title>Worship Room</title>` + basic meta description. Will keep as fallback.
- **package.json** (`frontend/package.json`) — No `react-helmet-async` installed yet.
- **.env.example** (`frontend/.env.example`) — Only `VITE_API_BASE_URL`. Need to add `VITE_SITE_URL`.
- **Bible books constant** (`frontend/src/constants/bible.ts:115-205`) — `BIBLE_BOOKS` array with slug + chapter count for all 66 books. Used to generate sitemap URLs.

### Routing (App.tsx lines 108-156)
- `/` → `RootRoute` (Dashboard if auth, Home if not)
- 30+ public routes (DailyHub, PrayerWall, Music, Bible, etc.)
- 6 protected routes (Insights, Friends, Settings, MyPrayers, GrowthProfile)
- 6 redirect routes (/pray, /journal, /meditate, /scripture, /music/*)
- 2 stub routes (/login, /register)
- 1 dev route (/dev/mood-checkin)

### Test Pattern (from DailyHub.test.tsx)
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// vi.mock('@/hooks/useAuth', ...)
// Render with MemoryRouter + ToastProvider + AuthModalProvider
```

For Helmet tests, we'll need `HelmetProvider` in the wrapper. Since Helmet renders to `<head>`, we test via `document.title` and `document.querySelector('meta[name="description"]')`.

### Existing SEO State
- **No react-helmet-async** installed
- **No OG tags** anywhere
- **No canonical URLs**
- **No sitemap.xml or robots.txt**
- **No structured data**
- **Static title:** "Worship Room" in index.html
- **Static description** in index.html (generic)
- **Hero video** (HeroSection.tsx:105-115) — no `fetchpriority` attribute
- **Some images** already have `loading="lazy"` (SharedVerse, SharedPrayer, SpotifyEmbed, SongPickSection)

---

## Auth Gating Checklist

**No auth gating required.** SEO metadata renders for all users regardless of auth state. Search engines crawl as logged-out users.

The only auth-conditional behavior is the homepage title: "Worship Room — Christian Emotional Healing & Worship" (logged out) vs "Dashboard | Worship Room" (logged in). Both are valid SEO titles — the `RootRoute` component already switches between `Home` and `Dashboard`, so each page component sets its own Helmet.

---

## Design System Values (for UI steps)

**No visual UI changes.** The only design asset is the OG default image:

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| OG image background | gradient | `#0D0620` → `#1E0B3E` (135deg) | design-system.md (hero-dark → hero-mid) |
| OG image title font | font | Caveat, white, ~72px equivalent | design-system.md (font-script) |
| OG image subtitle font | font | Inter, white, ~24px equivalent | design-system.md (font-sans) |
| OG image dimensions | size | 1200 x 630px | Spec requirement |

---

## Design System Reminder

- Worship Room uses Caveat for script/highlighted headings, not Lora
- Hero gradients use hero-dark (#0D0620) and hero-mid (#1E0B3E)
- No trailing slashes on URLs
- All tabs use query params (?tab=), not separate routes

---

## Responsive Structure

**Not applicable.** This feature has no visible UI. SEO metadata renders identically at all breakpoints. The OG image is a static 1200x630px PNG.

---

## Vertical Rhythm

**Not applicable.** No visible layout changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] `react-helmet-async` is compatible with React 18 + Vite (yes — widely used, no SSR required)
- [ ] The production domain is `https://worshiproom.com` (used in sitemap, robots.txt, canonical URLs). Configurable via `VITE_SITE_URL`.
- [ ] The OG default image will be created as a static PNG (not dynamically generated). A simple branded image is sufficient for MVP.
- [ ] Bible chapter URLs in sitemap total ~1,189 entries (from BIBLE_BOOKS constant). This is a large but valid sitemap.
- [ ] No SSR/prerendering is needed — react-helmet-async works client-side for browser tab titles and social sharing. Search engine crawlers for SPAs may not execute JS, but that's a known limitation addressed in "Out of Scope" (prerendering service is future).
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Design system values are verified (from reference)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Helmet library | `react-helmet-async` | Spec requires it. Widely used, React 18 compatible, SSR-ready if needed later. |
| Sitemap format | Static XML in `public/` | Spec says static. Dynamic generation is out of scope. |
| Bible sitemap generation | Build-time script generates XML from BIBLE_BOOKS constant | Too many URLs (1,189) to hand-write. Script runs once, output committed to public/. |
| OG image creation | Static PNG committed to repo | No dynamic generation. Created with a script using `sharp` (already a devDependency). |
| Canonical URL domain | `VITE_SITE_URL` env var, defaults to `https://worshiproom.com` | Configurable for different environments. |
| Tab query params in canonical | Stripped | Spec: `?tab=` is UI state, not separate pages. |
| SEO component location | Single `SEO.tsx` component in `components/` | Reused by every page. |
| Sitemap `lastmod` | Date the sitemap script was run | Spec: "date the sitemap was generated" |
| `index.html` meta description | Keep as fallback | Helmet overrides it per-page at runtime. The static tag is a fallback for crawlers that don't execute JS. |
| Redirect routes | No Helmet needed | They immediately navigate away — never render content. |

---

## Implementation Steps

### Step 1: Install react-helmet-async and add HelmetProvider

**Objective:** Install the library and wrap the app in `<HelmetProvider>`.

**Files to create/modify:**
- `frontend/package.json` — add dependency
- `frontend/src/App.tsx` — wrap with `<HelmetProvider>`

**Details:**

1. Run `pnpm add react-helmet-async` in `frontend/`
2. In `App.tsx`, import `HelmetProvider` from `react-helmet-async`
3. Wrap inside `BrowserRouter` but outside `AuthProvider`:
   ```tsx
   <BrowserRouter ...>
     <HelmetProvider>
       <AuthProvider>
         ...
       </AuthProvider>
     </HelmetProvider>
   </BrowserRouter>
   ```

**Guardrails (DO NOT):**
- DO NOT remove the existing `<title>` or `<meta name="description">` from `index.html` — they serve as static fallbacks
- DO NOT install any other SEO library
- DO NOT add Helmet to any page yet (Step 3)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| App renders with HelmetProvider | integration | Verify App renders without errors after adding HelmetProvider |

**Expected state after completion:**
- [ ] `react-helmet-async` in package.json dependencies
- [ ] `HelmetProvider` wraps the app inside BrowserRouter
- [ ] App still renders and all existing tests pass

---

### Step 2: Create SEO component and SITE_URL config

**Objective:** Build the reusable `<SEO>` component and configure the site URL environment variable.

**Files to create/modify:**
- `frontend/src/components/SEO.tsx` — new file, the shared SEO component
- `frontend/.env.example` — add `VITE_SITE_URL`
- `frontend/.env` — add `VITE_SITE_URL`

**Details:**

Create `SEO.tsx` with the following interface:
```typescript
interface SEOProps {
  title: string               // Full page title (component appends " | Worship Room" unless noSuffix)
  description: string         // Meta description (aim for 150-160 chars)
  noSuffix?: boolean          // If true, use title as-is (for homepage)
  ogImage?: string            // Override OG image (defaults to /og-default.png)
  ogType?: string             // Override og:type (defaults to "website")
  canonical?: string          // Override canonical path (defaults to current pathname)
  noIndex?: boolean           // If true, add noindex meta tag
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]  // JSON-LD structured data
}
```

Implementation:
- Use `Helmet` from `react-helmet-async`
- Build canonical URL: `VITE_SITE_URL` + `canonical` (or current `pathname`), strip trailing slashes, strip UI-state query params (`?tab=`)
- Strip these query params from canonical: `tab`
- Preserve content-meaningful query params: `category`
- Title format: `noSuffix ? title : \`${title} | Worship Room\``
- OG image: absolute URL — `VITE_SITE_URL + (ogImage || '/og-default.png')`
- Render all meta tags specified in the spec:
  - `<title>`
  - `<meta name="description">`
  - `<link rel="canonical">`
  - `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`
  - `twitter:card` ("summary_large_image"), `twitter:title`, `twitter:description`, `twitter:image`
  - Optional `<script type="application/ld+json">` for jsonLd
  - Optional `<meta name="robots" content="noindex">` for noIndex

Environment variable:
- Add `VITE_SITE_URL=https://worshiproom.com` to `.env.example` and `.env`
- Access via `import.meta.env.VITE_SITE_URL` with fallback: `const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://worshiproom.com'`

Use `useLocation()` from react-router-dom to get the current pathname for canonical URL generation.

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` for JSON-LD — use Helmet's `<script>` tag with `type="application/ld+json"` and `JSON.stringify()`
- DO NOT hardcode `localhost` in any URL
- DO NOT add the component to any pages yet (Step 3)
- DO NOT strip the `category` query param from canonical URLs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders title with suffix | unit | `<SEO title="Foo" ...>` → `<title>Foo | Worship Room</title>` |
| renders title without suffix | unit | `<SEO title="Foo" noSuffix ...>` → `<title>Foo</title>` |
| renders meta description | unit | `description` prop → `<meta name="description">` |
| renders canonical URL | unit | Canonical URL uses SITE_URL + pathname, no trailing slash |
| strips tab query params from canonical | unit | Path `/daily?tab=pray` → canonical `/daily` |
| preserves content query params | unit | Path `/prayer-wall?category=health` → canonical includes `?category=health` |
| renders OG tags | unit | All 6 OG tags present with correct values |
| renders Twitter card tags | unit | All 4 Twitter card tags present |
| renders default OG image | unit | When no ogImage prop, uses `/og-default.png` |
| renders custom OG image | unit | When ogImage prop provided, uses it |
| renders JSON-LD | unit | When jsonLd prop provided, renders script tag with correct content |
| renders noindex | unit | When noIndex=true, renders `<meta name="robots" content="noindex">` |
| does not render noindex by default | unit | When noIndex not set, no robots noindex tag |

**Expected state after completion:**
- [ ] `SEO.tsx` component exists with all meta tag rendering
- [ ] `VITE_SITE_URL` configured in .env and .env.example
- [ ] All SEO component unit tests pass
- [ ] Component not yet used by any page

---

### Step 3: Add SEO component to all page components

**Objective:** Every page component renders `<SEO>` with its unique title and description per the spec's route table.

**Files to modify:** Every page component listed below.

**Details:**

Add `import { SEO } from '@/components/SEO'` and render `<SEO ... />` as the first child inside each page component's root element.

#### Static Routes — Titles and Descriptions

| Page File | Title | Description | Extra Props |
|-----------|-------|-------------|-------------|
| `Home.tsx` | `Worship Room — Christian Emotional Healing & Worship` | Find comfort, guidance, and spiritual support through AI-powered prayer, Scripture, journaling, meditation, worship music, and community. | `noSuffix`, `jsonLd` (Organization + WebSite) |
| `Dashboard.tsx` | `Dashboard` | Your daily spiritual growth dashboard — mood tracking, streaks, faith points, and personalized encouragement. | |
| `DailyHub.tsx` | `Daily Prayer, Journal & Meditation` | Start your day with AI-powered prayer, guided journaling, and Christian meditation rooted in Scripture. | `jsonLd` (BreadcrumbList: Home > Daily Hub) |
| `PrayerWall.tsx` | `Community Prayer Wall` | Share prayer requests and pray for others in a supportive Christian community. | `jsonLd` (BreadcrumbList: Home > Prayer Wall) |
| `MusicPage.tsx` | `Worship Music & Ambient Sounds` | Listen to worship playlists, mix ambient sounds for prayer and meditation, and fall asleep to Scripture readings. | `jsonLd` (BreadcrumbList: Home > Music) |
| `BibleBrowser.tsx` | `Read the Bible (WEB)` | Read the full World English Bible with highlighting, notes, and audio playback. | `jsonLd` (BreadcrumbList: Home > Bible) |
| `AskPage.tsx` | `Ask God's Word` | Ask life questions and receive AI-powered answers grounded in Biblical wisdom and Scripture. | |
| `DevotionalPage.tsx` | `Daily Devotional` | Start each morning with an inspiring quote, Bible passage, reflection, and prayer. | `ogType: "article"`, `jsonLd` (BreadcrumbList + Article) |
| `ReadingPlans.tsx` | `Bible Reading Plans` | Guided multi-day Scripture journeys through topics like anxiety, grief, gratitude, forgiveness, and hope. | |
| `Challenges.tsx` | `Community Challenges` | Join seasonal faith challenges with thousands of other believers during Lent, Advent, Easter, and more. | |
| `Churches.tsx` | `Find Churches Near You` | Locate churches in your area with service times, directions, and contact information. | `jsonLd` (BreadcrumbList: Home > Local Support > Churches) |
| `Counselors.tsx` | `Find Christian Counselors Near You` | Locate Christian counselors and therapists in your area for professional faith-based support. | `jsonLd` (BreadcrumbList: Home > Local Support > Counselors) |
| `CelebrateRecovery.tsx` | `Find Celebrate Recovery Near You` | Locate Celebrate Recovery meetings in your area for faith-based addiction and hurt recovery support. | `jsonLd` (BreadcrumbList: Home > Local Support > Celebrate Recovery) |
| `Insights.tsx` | `Mood Insights & Spiritual Growth` | Track your mood patterns, meditation minutes, and spiritual growth over time. | `noIndex` (auth-gated) |
| `MonthlyReport.tsx` | `Monthly Mood Report` | Your monthly spiritual growth and mood tracking summary. | `noIndex` (auth-gated) |
| `Friends.tsx` | `Friends & Leaderboard` | Grow together in faith with friends, encouragement, and friendly accountability. | `noIndex` (auth-gated) |
| `Settings.tsx` | `Settings` | Manage your Worship Room account, notifications, and privacy preferences. | `noIndex` (auth-gated) |
| `RoutinesPage.tsx` | `Bedtime Routines` | Wind down with guided bedtime routines combining Scripture, ambient sounds, and gentle prayers. | |
| `MyPrayers.tsx` | `My Saved Prayers` | Your saved prayers and prayer history on Worship Room. | `noIndex` (auth-gated) |
| `PrayerWallDashboard.tsx` | `Prayer Dashboard` | Your private prayer wall dashboard — track your requests and prayer activity. | `noIndex` (auth-gated) |
| `GrowthProfile.tsx` | (dynamic — see Step 4) | (dynamic) | |
| `Health.tsx` | `Health Check` | System health status. | `noIndex` |

#### Meditation sub-pages (6 files in `pages/meditate/`):

All meditation sub-pages redirect to `/daily?tab=meditate` when logged out, but when logged in they render content. Add SEO with `noIndex` since they're auth-gated experiences:

| Page | Title | Description |
|------|-------|-------------|
| `BreathingExercise.tsx` | `Breathing Exercise` | A calming 4-7-8 breathing exercise for peace and focus. |
| `ScriptureSoaking.tsx` | `Scripture Soaking` | Contemplate and meditate on a Bible verse with guided reflection. |
| `GratitudeReflection.tsx` | `Gratitude Reflection` | A guided gratitude journaling meditation rooted in Scripture. |
| `ActsPrayerWalk.tsx` | `ACTS Prayer Walk` | A structured prayer using the ACTS framework — Adoration, Confession, Thanksgiving, Supplication. |
| `PsalmReading.tsx` | `Psalm Reading` | Read and reflect on a Psalm with historical context and guided meditation. |
| `ExamenReflection.tsx` | `Examen Reflection` | The Ignatian Examen — a reflective prayer reviewing your day with God. |

All get `noIndex` since they are auth-gated content.

#### Stub pages (ComingSoon in App.tsx):

The `ComingSoon` component in App.tsx is inline and receives `title` as a prop. Add SEO inside it:
```tsx
function ComingSoon({ title }: { title: string }) {
  return (
    <Layout>
      <SEO title={title} description={`${title} — coming soon to Worship Room.`} noIndex />
      ...
    </Layout>
  )
}
```

#### NotFound (in App.tsx):

```tsx
function NotFound() {
  return (
    <Layout>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noIndex />
      ...
    </Layout>
  )
}
```

**Guardrails (DO NOT):**
- DO NOT add SEO to redirect routes (`/pray`, `/journal`, `/meditate`, `/scripture`, `/music/playlists`, `/music/ambient`, `/music/sleep`) — they navigate immediately
- DO NOT add SEO to the dev-only `MoodCheckInPreview` page
- DO NOT duplicate the same description across multiple pages
- DO NOT exceed ~160 characters for descriptions
- DO NOT forget `noIndex` on auth-gated and system pages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Home renders homepage title | integration | `document.title` === "Worship Room — Christian Emotional Healing & Worship" |
| Dashboard renders dashboard title | integration | `document.title` === "Dashboard \| Worship Room" |
| DailyHub renders correct title | integration | title === "Daily Prayer, Journal & Meditation \| Worship Room" |
| PrayerWall renders correct title | integration | title check |
| MusicPage renders correct title | integration | title check |
| BibleBrowser renders correct title | integration | title check |
| Each page has unique description | integration | meta description exists and is not empty |
| Auth-gated pages have noIndex | integration | Insights, Friends, Settings have `<meta name="robots" content="noindex">` |
| ComingSoon renders with title prop | unit | title uses the provided title prop |
| NotFound has noIndex | unit | robots noindex present |

**Expected state after completion:**
- [ ] Every page component renders `<SEO>` with unique title and description
- [ ] Auth-gated and system pages have `noIndex`
- [ ] Browser tab shows correct titles on each page
- [ ] All tests pass

---

### Step 4: Add SEO to dynamic routes

**Objective:** Dynamic routes (Bible chapters, reading plan details, challenge details, prayer requests, profiles, shared verses/prayers) render titles with entity data interpolated.

**Files to modify:**
- `frontend/src/pages/BibleReader.tsx`
- `frontend/src/pages/ReadingPlanDetail.tsx`
- `frontend/src/pages/ChallengeDetail.tsx`
- `frontend/src/pages/PrayerDetail.tsx`
- `frontend/src/pages/PrayerWallProfile.tsx`
- `frontend/src/pages/GrowthProfile.tsx`
- `frontend/src/pages/SharedVerse.tsx`
- `frontend/src/pages/SharedPrayer.tsx`

**Details:**

Each dynamic page should use its loaded entity data to construct the title and description:

| Page | Title Pattern | Description Pattern | BreadcrumbList |
|------|---------------|---------------------|----------------|
| `BibleReader` | `[Book] Chapter [X] (WEB)` | Read [Book] chapter [X] from the World English Bible with highlights and notes. | Home > Bible > [Book] > Chapter [X] |
| `ReadingPlanDetail` | `[Plan Title] \| Reading Plans` | [Plan description, first 155 chars] | Home > Reading Plans > [Plan Title] |
| `ChallengeDetail` | `[Challenge Title] \| Community Challenges` | [Challenge description, first 155 chars] | |
| `PrayerDetail` | `Prayer Request` | A prayer request shared on the Worship Room community prayer wall. | |
| `PrayerWallProfile` | `[User Name]'s Prayers` | Prayers shared by [User Name] on the Worship Room community prayer wall. | |
| `GrowthProfile` | `[User Name]'s Growth Profile` | See [User Name]'s spiritual growth journey, badges, and encouragement on Worship Room. | |
| `SharedVerse` | `[Verse Reference]` | [Verse text, truncated to 155 chars] — from the World English Bible. | |
| `SharedPrayer` | `Shared Prayer` | A prayer shared from Worship Room — Christian emotional healing and worship. | |

Implementation pattern: render `<SEO>` after loading the entity data. Use a fallback title while loading (e.g., `"Loading... | Worship Room"`).

For `BibleReader`, construct the canonical URL as `/bible/${bookSlug}/${chapter}` — use the route params directly.

For breadcrumbs, pass `jsonLd` prop with the BreadcrumbList schema. Bible reader example:
```typescript
const breadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Bible', item: `${SITE_URL}/bible` },
    { '@type': 'ListItem', position: 3, name: bookName, item: `${SITE_URL}/bible/${bookSlug}/1` },
    { '@type': 'ListItem', position: 4, name: `Chapter ${chapter}` },
  ],
}
```

**Guardrails (DO NOT):**
- DO NOT render SEO tags before entity data is loaded (show a loading/fallback title until ready)
- DO NOT expose sensitive user data in meta descriptions (prayer text should be generic, not the actual prayer content)
- DO NOT include user-generated content verbatim in meta tags without truncation (155 char max for descriptions)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| BibleReader renders book/chapter title | integration | Title includes book name and chapter number from route params |
| ReadingPlanDetail renders plan title | integration | Title includes the plan name |
| SharedVerse renders verse reference | integration | Title includes the verse reference |
| Dynamic pages have correct canonical | unit | Canonical URL uses the entity's clean path |
| BibleReader renders breadcrumb JSON-LD | unit | BreadcrumbList includes Home > Bible > Book > Chapter |

**Expected state after completion:**
- [ ] All dynamic pages render entity-specific titles and descriptions
- [ ] Breadcrumbs JSON-LD on Bible reader, reading plan detail
- [ ] Canonical URLs are correct for all dynamic routes
- [ ] Tests pass

---

### Step 5: Add structured data (JSON-LD) to homepage and inner pages

**Objective:** Homepage gets Organization + WebSite JSON-LD. Key inner pages get BreadcrumbList. Devotional page gets Article.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — Organization + WebSite JSON-LD
- `frontend/src/pages/DevotionalPage.tsx` — Article JSON-LD (in addition to BreadcrumbList from Step 3)
- Pages from Steps 3 & 4 that need BreadcrumbList (already handled via `jsonLd` prop)

**Details:**

#### Homepage JSON-LD (Home.tsx):

Pass an array of two JSON-LD objects:

```typescript
const homepageJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Worship Room',
    url: SITE_URL,
    description: 'Christian emotional healing and worship platform providing AI-powered prayer, Scripture, journaling, meditation, worship music, and community support.',
    logo: `${SITE_URL}/icon-512.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Worship Room',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/ask?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
]
```

#### Devotional Page Article JSON-LD (DevotionalPage.tsx):

```typescript
const devotionalJsonLd = [
  breadcrumbJsonLd,  // Home > Daily Devotional
  {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: devotionalTitle,       // From the loaded devotional data
    datePublished: new Date().toISOString().split('T')[0],
    description: devotionalDescription,
    author: {
      '@type': 'Organization',
      name: 'Worship Room',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Worship Room',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    },
  },
]
```

#### SEO component update for array jsonLd:

The SEO component should handle `jsonLd` as a single object OR an array of objects. If array, render multiple `<script type="application/ld+json">` tags (one per object).

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML` — use Helmet's script tag support
- DO NOT include user-specific data in structured data
- DO NOT forget the `@context` property on every JSON-LD object

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Homepage renders Organization JSON-LD | integration | Script tag with @type Organization exists |
| Homepage renders WebSite JSON-LD with SearchAction | integration | Script tag with SearchAction pointing to /ask |
| Devotional renders Article JSON-LD | integration | Script tag with @type Article, datePublished is today |
| SEO component handles jsonLd array | unit | Multiple script tags rendered for array input |

**Expected state after completion:**
- [ ] Homepage has Organization + WebSite structured data
- [ ] Devotional page has Article structured data
- [ ] Inner pages have BreadcrumbList structured data
- [ ] All JSON-LD validates (can verify with Google Rich Results Test later)

---

### Step 6: Create sitemap.xml with Bible chapter generation script

**Objective:** Generate a comprehensive sitemap.xml including all public routes and all 1,189 Bible chapter URLs.

**Files to create:**
- `frontend/scripts/generate-sitemap.ts` — Node script to generate sitemap
- `frontend/public/sitemap.xml` — Generated output (committed)

**Details:**

Create a TypeScript script that:

1. Imports `BIBLE_BOOKS` data (the book slugs and chapter counts from `constants/bible.ts`)
2. Defines static route entries with priority and changefreq per the spec table
3. Generates Bible chapter URLs by iterating all books × chapters
4. Writes a valid XML sitemap to `frontend/public/sitemap.xml`

The script uses the BIBLE_BOOKS data inline (copy the slug/chapter data) rather than importing from the frontend source (to avoid TypeScript path alias issues in a standalone script). This is acceptable since Bible books don't change.

Static routes (from spec):
```
/ → priority 1.0, daily
/daily → 0.9, daily
/prayer-wall → 0.8, daily
/devotional → 0.8, daily
/music → 0.7, weekly
/bible → 0.8, monthly
/ask → 0.7, monthly
/reading-plans → 0.7, weekly
/challenges → 0.7, weekly
/local-support/churches → 0.6, monthly
/local-support/counselors → 0.6, monthly
/local-support/celebrate-recovery → 0.6, monthly
/music/routines → 0.5, monthly
```

Bible chapters: `/bible/{slug}/{chapter}` → priority 0.6, monthly

`lastmod`: Use the script execution date in `YYYY-MM-DD` format.

Base URL: `https://worshiproom.com` (hardcoded in the script — this is for production crawlers only).

Run the script: `npx tsx frontend/scripts/generate-sitemap.ts`

The generated file is committed to the repo. Re-run when routes change or before deployment.

**Guardrails (DO NOT):**
- DO NOT include auth-gated routes (settings, insights, friends, profile, admin, login, register, prayer-wall/dashboard, my-prayers, favorites, journal/my-entries)
- DO NOT include redirect routes
- DO NOT include dev-only routes
- DO NOT include dynamic user-content routes (individual prayer requests, user profiles) — these are either auth-gated or have unpredictable IDs
- DO NOT forget the XML declaration and namespace

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| sitemap.xml is valid XML | unit | Script output parses as valid XML |
| sitemap includes all static public routes | unit | All 13 static routes present |
| sitemap includes Bible chapter URLs | unit | At least 1,189 Bible chapter URLs (spot-check: genesis/1, revelation/22) |
| sitemap excludes private routes | unit | No /settings, /insights, /friends, /admin in output |
| sitemap has correct priority values | unit | / has 1.0, /daily has 0.9, Bible chapters have 0.6 |

**Expected state after completion:**
- [ ] `frontend/public/sitemap.xml` exists with all public routes + Bible chapters
- [ ] Sitemap is valid XML with correct URL, priority, changefreq, lastmod
- [ ] ~1,200+ URLs total in sitemap

---

### Step 7: Create robots.txt

**Objective:** Add a robots.txt file to the public directory.

**Files to create:**
- `frontend/public/robots.txt`

**Details:**

Create a static `robots.txt`:

```
User-agent: *
Allow: /

Disallow: /settings
Disallow: /insights
Disallow: /friends
Disallow: /profile/
Disallow: /admin/
Disallow: /login
Disallow: /register
Disallow: /health
Disallow: /prayer-wall/dashboard
Disallow: /journal/
Disallow: /favorites
Disallow: /my-prayers
Disallow: /dev/

Sitemap: https://worshiproom.com/sitemap.xml
```

Note: Added `/my-prayers` and `/dev/` to the disallow list (not in spec but they are auth-gated / dev-only).

**Guardrails (DO NOT):**
- DO NOT disallow public routes that should be indexed (prayer-wall, music, bible, etc.)
- DO NOT use `localhost` in the sitemap URL

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| robots.txt exists | manual | File at `frontend/public/robots.txt` |
| robots.txt references sitemap | manual | Contains `Sitemap: https://worshiproom.com/sitemap.xml` |

**Expected state after completion:**
- [ ] `frontend/public/robots.txt` exists with correct Allow/Disallow rules
- [ ] Sitemap reference uses production URL

---

### Step 8: Create OG default social share image

**Objective:** Create a branded 1200x630px PNG for social media link previews.

**Files to create:**
- `frontend/scripts/generate-og-image.ts` — Script to generate the image
- `frontend/public/og-default.png` — Generated output (committed)

**Details:**

Use the `sharp` library (already a devDependency) to generate a 1200x630px PNG:

1. Create a dark purple gradient background (`#0D0620` → `#1E0B3E`, 135deg angle)
2. Overlay white text: "Worship Room" (large, centered, ~72px) and "Christian Emotional Healing & Worship" (subtitle, ~24px, below)
3. Optional: subtle decorative accent (a faint radial glow or cross watermark)

Since `sharp` can create images from SVG, the script will:
- Build an SVG string with the gradient, text (using web-safe fonts since Caveat/Inter won't be available in the node context — use a serif for title, sans-serif for subtitle), and styling
- Convert to PNG via `sharp(Buffer.from(svgString)).png().toFile()`

The result won't perfectly match Caveat/Inter since those fonts aren't available in node's SVG renderer, but it will be a clean branded image. For pixel-perfect results, the image could be manually designed in Figma later.

[UNVERIFIED] Font rendering in sharp SVG — web fonts (Caveat, Inter) are NOT available in sharp's SVG renderer.
→ To verify: Run the script and check the output image
→ If wrong: Use generic serif/sans-serif fonts, or create the image manually in a design tool

Run: `npx tsx frontend/scripts/generate-og-image.ts`

**Guardrails (DO NOT):**
- DO NOT use complex imagery — keep it clean and simple
- DO NOT exceed 1200x630px (social media standard)
- DO NOT use colors that don't match the brand palette

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| og-default.png exists | manual | File at `frontend/public/og-default.png` |
| Image is 1200x630px | manual | Verify dimensions |

**Expected state after completion:**
- [ ] `frontend/public/og-default.png` exists at 1200x630px
- [ ] Image has dark purple gradient with white text branding

---

### Step 9: Performance SEO — image attributes and HTML audit

**Objective:** Add `loading="lazy"` to below-the-fold images, `fetchpriority="high"` to hero elements, and verify HTML semantics.

**Files to modify:**
- `frontend/src/components/HeroSection.tsx` — add `fetchpriority="high"` to video poster (if any) or ensure video has proper priority
- Any components with `<img>` tags missing `loading="lazy"` (audit needed)

**Details:**

1. **Hero video** (HeroSection.tsx line 105): The `<video>` element doesn't need `fetchpriority` (it's a video, not an image, and it autoplays). However, the video source is a CDN URL — browsers handle video loading independently. No change needed here.

2. **Image audit**: Search for `<img` tags across the codebase and verify:
   - Below-the-fold images have `loading="lazy"` (most already do per the grep results)
   - Above-the-fold images (if any exist in hero sections) have `fetchpriority="high"`

3. **HTML semantics audit (landing page):**
   - Verify exactly one `<h1>` tag (confirmed: HeroSection.tsx line 130)
   - Verify h1 text is in a real HTML element (confirmed: it's a `<h1>` with CSS gradient text)
   - Verify hero text is selectable and indexable (confirmed: it's plain text in a `<h1>`)

4. **Check for missing lazy loading**: Look at JourneySection, GrowthTeasersSection, and other landing page components for any `<img>` tags without `loading="lazy"`.

**Guardrails (DO NOT):**
- DO NOT add `loading="lazy"` to above-the-fold images (it delays their loading)
- DO NOT change the visual appearance of any component
- DO NOT modify the HTML structure — only add attributes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Landing page has exactly one h1 | integration | `document.querySelectorAll('h1').length === 1` in Home render |
| h1 contains expected text | integration | h1 text is "How're You Feeling Today?" |

**Expected state after completion:**
- [ ] All below-the-fold images have `loading="lazy"`
- [ ] Landing page has exactly one `<h1>`
- [ ] Hero text is in real HTML elements (not canvas/SVG)

---

### Step 10: Update test infrastructure and run full test suite

**Objective:** Ensure all existing tests still pass with HelmetProvider added, and that new SEO tests work correctly.

**Files to modify:**
- `frontend/src/test/setup.ts` — may need to mock Helmet if it causes issues in jsdom
- Various `__tests__/` files — add HelmetProvider to test wrappers if needed

**Details:**

`react-helmet-async` requires `<HelmetProvider>` in the tree. Since we added it to App.tsx, tests that render full pages via App will inherit it. But tests that render individual page components with `MemoryRouter` directly may need `HelmetProvider` added to their wrapper.

Check if existing tests break after Step 1. If they do, create a shared test utility:

```typescript
// frontend/src/test/test-utils.tsx
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <AuthModalProvider>
            {children}
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>
    </HelmetProvider>
  )
}
```

However, only add this if tests fail. Many tests already mock heavily and may not be affected.

Run `pnpm test` after every step and fix any failures.

**Guardrails (DO NOT):**
- DO NOT refactor existing test patterns unnecessarily — only add HelmetProvider where needed
- DO NOT create a new test utility file unless tests actually break
- DO NOT remove any existing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All existing tests pass | integration | `pnpm test` returns 0 exit code |
| SEO component tests pass | unit | All tests from Step 2 |
| Page title tests pass | integration | All tests from Steps 3 and 4 |

**Expected state after completion:**
- [ ] Full test suite passes (`pnpm test`)
- [ ] No regressions from adding HelmetProvider
- [ ] All new SEO tests pass
- [ ] Build succeeds (`pnpm build`)

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Install react-helmet-async + HelmetProvider |
| 2 | 1 | Create SEO component + SITE_URL config |
| 3 | 2 | Add SEO to all static page components |
| 4 | 2 | Add SEO to dynamic route pages |
| 5 | 2 | Add JSON-LD structured data |
| 6 | — | Generate sitemap.xml (independent of Helmet) |
| 7 | — | Create robots.txt (independent) |
| 8 | — | Create OG default image (independent) |
| 9 | — | Performance SEO image audit (independent) |
| 10 | 1-9 | Run full test suite, fix any issues |

Steps 3, 4, 5 can be done in parallel after Step 2.
Steps 6, 7, 8, 9 are independent of Steps 1-5 and can be done in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Install react-helmet-async + HelmetProvider | [COMPLETE] | 2026-03-24 | Installed react-helmet-async 3.0.0. Added HelmetProvider inside BrowserRouter, wrapping AuthProvider in App.tsx. |
| 2 | Create SEO component + SITE_URL config | [COMPLETE] | 2026-03-24 | Created SEO.tsx with all meta tags, canonical URL building, JSON-LD support. Added VITE_SITE_URL to .env and .env.example. 13 tests pass. |
| 3 | Add SEO to all static pages | [COMPLETE] | 2026-03-24 | Added SEO to 25 pages + ComingSoon + NotFound in App.tsx. Global react-helmet-async mock in test/setup.ts for existing tests. Auth-gated pages have noIndex. 524+ tests pass. |
| 4 | Add SEO to dynamic routes | [COMPLETE] | 2026-03-24 | Added SEO to 8 dynamic pages: BibleReader (with breadcrumbs), ReadingPlanDetail (with breadcrumbs), ChallengeDetail, PrayerDetail, PrayerWallProfile, GrowthProfile (noIndex), SharedVerse, SharedPrayer. Fixed Helmet mock to return null. |
| 5 | Add JSON-LD structured data | [COMPLETE] | 2026-03-24 | Homepage: Organization + WebSite JSON-LD. DevotionalPage: BreadcrumbList + Article. BreadcrumbList added to DailyHub, PrayerWall, MusicPage, BibleBrowser, Churches, Counselors, CelebrateRecovery. All tests pass. |
| 6 | Generate sitemap.xml | [COMPLETE] | 2026-03-24 | Created generate-sitemap.ts script. Generated sitemap.xml with 1,202 URLs (13 static + 1,189 Bible chapters). No private routes included. |
| 7 | Create robots.txt | [COMPLETE] | 2026-03-24 | Created robots.txt with Allow/Disallow rules for all public/private routes, sitemap reference. |
| 8 | Create OG default image | [COMPLETE] | 2026-03-24 | Created generate-og-image.ts script using sharp. Generated og-default.png (1200x630px) with dark purple gradient, cross watermark, serif title, sans subtitle. |
| 9 | Performance SEO audit | [COMPLETE] | 2026-03-24 | Added loading="lazy" to ListingCard, AmbientBrowser scene thumbnails, MilestoneCard share preview. Verified landing page has exactly one h1 in HeroSection. Hero text is real HTML. |
| 10 | Test suite verification | [COMPLETE] | 2026-03-24 | Full suite: 4,304/4,305 pass (398/399 files). Single flaky timeout (MyPrayers 200-prayer limit) passes in isolation — pre-existing resource contention. Vite build succeeds. |
