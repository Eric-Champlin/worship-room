# Feature: SEO — Per-Page Titles, Meta Descriptions, Open Graph, Sitemap & Structured Data

## Overview

Worship Room is invisible to search engines. Every page renders the static title "Worship Room" with a single global meta description. There are no Open Graph tags, no Twitter cards, no sitemap, no robots.txt, no structured data, and no per-page titles. This means shared links show a generic preview, Google indexes every page with the same title, and crawlers have no sitemap to discover content.

This feature adds comprehensive SEO infrastructure so that Worship Room is discoverable through organic search and looks polished when links are shared on social media, messaging apps, and link previews. For a Christian emotional healing app, discoverability is a mission-critical concern — people searching "Christian prayer app" or "Bible meditation" need to find this.

## User Stories

- As a **logged-out visitor arriving from Google**, I want each page to have a unique, descriptive title and meta description so I can tell from search results which page matches my need (prayer, journaling, Bible reading, etc.).
- As a **user sharing a link on social media**, I want the shared link to display a branded preview image with the page title and description so the link looks inviting and trustworthy.
- As a **search engine crawler**, I want a sitemap listing all public URLs with priority and update frequency so I can efficiently discover and index all content.
- As the **site owner**, I want structured data (Organization, WebSite, BreadcrumbList, Article) so Google can display rich results and understand the site's purpose.

## Requirements

### 1. Shared SEO Component

A reusable component that accepts `title`, `description`, and optional overrides (`ogImage`, `ogType`, `canonical`, `noIndex`, `jsonLd`). Every page/route includes this component with unique, keyword-rich content.

**Title format:** `[Page Title] | Worship Room` — except the homepage, which uses `Worship Room — Christian Emotional Healing & Worship` (no suffix pattern).

**The component renders into `<head>`:**
- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- Open Graph tags: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`
- Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Optional JSON-LD `<script type="application/ld+json">`

**Library choice:** `react-helmet-async` (widely used, compatible with React 18 and Vite, supports SSR if needed later). Wrap the app in `<HelmetProvider>`.

### 2. Per-Page Titles & Descriptions

Every route gets a unique title and description. The SEO component is added to every page component.

#### Static Routes

| Route | Title | Description |
|-------|-------|-------------|
| `/` (logged out) | Worship Room — Christian Emotional Healing & Worship | Find comfort, guidance, and spiritual support through AI-powered prayer, Scripture, journaling, meditation, worship music, and community. |
| `/` (logged in) | Dashboard \| Worship Room | Your daily spiritual growth dashboard — mood tracking, streaks, faith points, and personalized encouragement. |
| `/daily` (default / pray tab) | Daily Prayer, Journal & Meditation \| Worship Room | Start your day with AI-powered prayer, guided journaling, and Christian meditation rooted in Scripture. |
| `/prayer-wall` | Community Prayer Wall \| Worship Room | Share prayer requests and pray for others in a supportive Christian community. |
| `/music` | Worship Music & Ambient Sounds \| Worship Room | Listen to worship playlists, mix ambient sounds for prayer and meditation, and fall asleep to Scripture readings. |
| `/bible` | Read the Bible (WEB) \| Worship Room | Read the full World English Bible with highlighting, notes, and audio playback. |
| `/ask` | Ask God's Word \| Worship Room | Ask life questions and receive AI-powered answers grounded in Biblical wisdom and Scripture. |
| `/devotional` | Daily Devotional \| Worship Room | Start each morning with an inspiring quote, Bible passage, reflection, and prayer. |
| `/reading-plans` | Bible Reading Plans \| Worship Room | Guided multi-day Scripture journeys through topics like anxiety, grief, gratitude, forgiveness, and hope. |
| `/challenges` | Community Challenges \| Worship Room | Join seasonal faith challenges with thousands of other believers during Lent, Advent, Easter, and more. |
| `/local-support/churches` | Find Churches Near You \| Worship Room | Locate churches in your area with service times, directions, and contact information. |
| `/local-support/counselors` | Find Christian Counselors Near You \| Worship Room | Locate Christian counselors and therapists in your area for professional faith-based support. |
| `/local-support/celebrate-recovery` | Find Celebrate Recovery Near You \| Worship Room | Locate Celebrate Recovery meetings in your area for faith-based addiction and hurt recovery support. |
| `/insights` | Mood Insights & Spiritual Growth \| Worship Room | Track your mood patterns, meditation minutes, and spiritual growth over time. |
| `/friends` | Friends & Leaderboard \| Worship Room | Grow together in faith with friends, encouragement, and friendly accountability. |
| `/settings` | Settings \| Worship Room | Manage your Worship Room account, notifications, and privacy preferences. |
| `/music/routines` | Bedtime Routines \| Worship Room | Wind down with guided bedtime routines combining Scripture, ambient sounds, and gentle prayers. |

#### Dynamic Routes

| Route Pattern | Title Pattern | Description Pattern |
|---------------|---------------|---------------------|
| `/bible/:book/:chapter` | [Book] Chapter [X] (WEB) \| Worship Room | Read [Book] chapter [X] from the World English Bible with highlights and notes. |
| `/reading-plans/:planId` | [Plan Title] \| Reading Plans \| Worship Room | [Plan description or first 155 chars]. |
| `/challenges/:challengeId` | [Challenge Title] \| Community Challenges \| Worship Room | [Challenge description or first 155 chars]. |
| `/prayer-wall/:id` | Prayer Request \| Worship Room | A prayer request shared on the Worship Room community prayer wall. |
| `/profile/:userId` | [User Name]'s Growth Profile \| Worship Room | See [User Name]'s spiritual growth journey, badges, and encouragement on Worship Room. |
| `/verse/:id` | [Verse Reference] \| Worship Room | [Verse text, truncated to 155 chars] — from the World English Bible. |
| `/prayer/:id` | Shared Prayer \| Worship Room | A prayer shared from Worship Room — Christian emotional healing and worship. |

#### Tab-Based Routes

For routes with tabs (Daily Hub, Music, Friends), the title and description reflect the **default tab** content. Tab changes via query params do NOT change the document title (tabs are UI state, not separate pages). The canonical URL excludes tab query params.

**Exception:** If a deep link includes a meaningful tab (e.g., `/daily?tab=meditate`), the title MAY reflect the tab content, but this is optional and should not create duplicate page entries in the sitemap.

### 3. Open Graph & Twitter Card Tags

The SEO component renders these on every page:

- `og:title` — same as `<title>` (or a slightly more descriptive variant)
- `og:description` — same as `<meta name="description">`
- `og:type` — `"website"` for all pages, `"article"` for devotional
- `og:url` — the canonical URL for the page
- `og:image` — default social share image (see below), overridable per page
- `og:site_name` — `"Worship Room"`
- `twitter:card` — `"summary_large_image"`
- `twitter:title` — same as `og:title`
- `twitter:description` — same as `og:description`
- `twitter:image` — same as `og:image`

### 4. Default Social Share Image

A static 1200x630px PNG in the `public/` directory (`/og-default.png`). Design:

- Dark purple gradient background matching the landing page hero (`#0D0620` → `#1E0B3E`)
- "Worship Room" centered in white Caveat font (large, ~72px equivalent)
- "Christian Emotional Healing & Worship" subtitle below in white Inter font (~24px equivalent)
- Subtle decorative accent (matching the verse share card watermark style — faded cross or light glow)
- No photo, no complex imagery — clean branded text on gradient

For Bible reader, devotional, and verse share pages: use the dynamically generated share image if one exists (e.g., from the Verse of the Day share card feature), otherwise fall back to `/og-default.png`.

### 5. Canonical URLs

Every page gets a `<link rel="canonical">` pointing to its clean URL.

**Rules:**
- Strip query params that are UI state: `?tab=pray`, `?tab=journal`, `?tab=meditate`, `?tab=playlists`, `?tab=ambient`, `?tab=sleep`, `?tab=friends`, `?tab=leaderboard`
- Preserve query params that are content-meaningful: `?category=health` (Prayer Wall filtering)
- Use the production domain (configurable via environment variable, e.g., `VITE_SITE_URL`)
- Trailing slashes: no trailing slash (e.g., `https://worshiproom.com/prayer-wall`, not `https://worshiproom.com/prayer-wall/`)

### 6. Structured Data (JSON-LD)

#### Homepage — Organization + WebSite

```
Organization: name, url, description, logo
WebSite: name, url, potentialAction → SearchAction pointing to /ask?q={search_term_string}
```

The SearchAction enables Google's sitelinks search box, directing searches to the AI Bible chat.

#### Inner Pages — BreadcrumbList

Add BreadcrumbList schema to pages with logical hierarchy:
- `/daily` → Home > Daily Hub
- `/prayer-wall` → Home > Prayer Wall
- `/music` → Home > Music
- `/local-support/churches` → Home > Local Support > Churches
- `/local-support/counselors` → Home > Local Support > Counselors
- `/local-support/celebrate-recovery` → Home > Local Support > Celebrate Recovery
- `/bible/:book/:chapter` → Home > Bible > [Book] > Chapter [X]
- `/reading-plans/:planId` → Home > Reading Plans > [Plan Title]
- `/insights` → Home > Mood Insights
- `/devotional` → Home > Daily Devotional

#### Devotional Page — Article

```
Article: headline, datePublished (today's date), description, author (Organization), publisher (Organization)
```

### 7. Sitemap (`/sitemap.xml`)

A static XML sitemap in the `public/` directory listing all public routes.

**Included URLs (with priority and changefreq):**

| URL Pattern | Priority | Change Frequency | Notes |
|-------------|----------|-----------------|-------|
| `/` | 1.0 | daily | Homepage |
| `/daily` | 0.9 | daily | Daily Hub |
| `/prayer-wall` | 0.8 | daily | New posts daily |
| `/devotional` | 0.8 | daily | New content daily |
| `/music` | 0.7 | weekly | |
| `/bible` | 0.8 | monthly | |
| `/bible/[book]/[chapter]` | 0.6 | monthly | All 1,189 Bible chapters (66 books) |
| `/ask` | 0.7 | monthly | |
| `/reading-plans` | 0.7 | weekly | |
| `/challenges` | 0.7 | weekly | |
| `/local-support/churches` | 0.6 | monthly | |
| `/local-support/counselors` | 0.6 | monthly | |
| `/local-support/celebrate-recovery` | 0.6 | monthly | |
| `/music/routines` | 0.5 | monthly | |

**Excluded from sitemap (private/auth-gated):**
- `/settings`
- `/insights`
- `/insights/monthly`
- `/friends`
- `/profile/:userId`
- `/login`, `/register`
- `/health`
- `/admin/*`
- `/prayer-wall/dashboard`
- `/journal/my-entries`
- `/favorites`

**`lastmod`**: Set to the date of the most recent deployment or content update. For the static sitemap, use the date the sitemap was generated.

**Bible chapter URLs**: Include all chapters for all 66 books of the Bible (Genesis 1-50, Exodus 1-40, ... Revelation 1-22). This is high-volume, high-value SEO content — Bible chapter pages are the most likely to attract organic search traffic.

### 8. Robots.txt (`/robots.txt`)

A static file in the `public/` directory:

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

Sitemap: https://worshiproom.com/sitemap.xml
```

The sitemap URL should use the production domain. For local development, this is fine as-is — crawlers only read robots.txt in production.

### 9. Performance SEO

- Add `loading="lazy"` to all `<img>` elements not in the initial viewport (below-the-fold images)
- Add `fetchpriority="high"` to the hero video/poster and any above-the-fold hero images
- Verify the landing page hero text is rendered in actual HTML elements (not canvas, SVG-only, or image) for crawler readability
- Verify the landing page has exactly one `<h1>` tag
- Ensure the landing page hero heading text is selectable and indexable

## UX & Design Notes

- **No visual UI changes** — this feature is entirely in `<head>` tags, static files, and image attributes. No new visible components, no layout changes.
- **The SEO component is invisible** — it only modifies document metadata. Users see no difference.
- **The default social share image** is the only new visual asset. It should match the app's dark purple branding and feel premium when previewed in social media link cards.
- **Responsive**: N/A — no UI changes. The SEO component works identically at all breakpoints.

## AI Safety Considerations

- **Crisis detection needed?**: No — no user input involved
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out**: Full SEO metadata on every page. Search engines crawl as logged-out users, so all SEO elements must render without authentication.
- **Logged-in**: Same SEO metadata. The only difference is the homepage title changes from the marketing title to "Dashboard | Worship Room" when authenticated.
- **Route type**: All SEO elements work on all route types (public, protected, admin). Even protected routes get proper titles for browser tab labeling.
- **No new localStorage keys**: This feature stores nothing.
- **No database changes**: This is frontend-only.

## Auth Gating

- **No auth gating whatsoever.** Every SEO element (title, description, OG tags, canonical, structured data) renders for all users regardless of auth state.
- Search engines crawl as logged-out users. If any SEO element were auth-gated, it would be invisible to Google.
- The homepage SEO component conditionally renders the appropriate title based on auth state (marketing title for logged-out, dashboard title for logged-in), but both are valid SEO content.

## Responsive Behavior

- **Not applicable** — this feature has no visible UI. The SEO component renders `<head>` metadata only. The social share image is a static file served at a fixed resolution (1200x630px) regardless of device.
- The one relevant responsive concern: `fetchpriority="high"` and `loading="lazy"` image attributes should be applied consistently regardless of viewport size.

## Out of Scope

- **Server-side rendering (SSR)**: react-helmet-async supports SSR, but the app is a Vite SPA. SSR/prerendering is a future enhancement, not part of this spec.
- **Dynamic sitemap generation**: The sitemap is static. A build-time or server-side generated sitemap (e.g., from database content) is a future enhancement.
- **Twitter/X site handle**: No `twitter:site` tag until a Worship Room Twitter account exists.
- **Per-page custom OG images**: Only the default image is created. Dynamic OG image generation (e.g., unique images per Bible chapter or devotional) is a future enhancement. Pages that already have share images (Verse of the Day cards) use them.
- **Google Search Console verification**: Manual setup by the site owner, not part of this implementation.
- **Prerendering service** (Prerender.io, Rendertron): Future enhancement for SPA SEO limitations with dynamic content.
- **Internationalization/hreflang**: Not applicable (English only, per Non-Goals for MVP).
- **Analytics/tracking tags**: Google Analytics, Meta Pixel, etc. are separate from SEO metadata.
- **Backend SEO** (API response headers, server-side redirects): This is a frontend-only feature.

## Acceptance Criteria

### SEO Component & Titles
- [ ] A shared SEO component exists and is used by every page/route in the app
- [ ] `react-helmet-async` (or equivalent) is installed and `<HelmetProvider>` wraps the app
- [ ] Homepage (logged out) renders `<title>Worship Room — Christian Emotional Healing & Worship</title>`
- [ ] Homepage (logged in) renders `<title>Dashboard | Worship Room</title>`
- [ ] Daily Hub renders `<title>Daily Prayer, Journal & Meditation | Worship Room</title>`
- [ ] Prayer Wall renders `<title>Community Prayer Wall | Worship Room</title>`
- [ ] Music page renders `<title>Worship Music & Ambient Sounds | Worship Room</title>`
- [ ] Bible page renders `<title>Read the Bible (WEB) | Worship Room</title>`
- [ ] Ask page renders `<title>Ask God's Word | Worship Room</title>`
- [ ] Devotional page renders `<title>Daily Devotional | Worship Room</title>`
- [ ] Reading Plans page renders `<title>Bible Reading Plans | Worship Room</title>`
- [ ] Challenges page renders `<title>Community Challenges | Worship Room</title>`
- [ ] Local Support churches page renders `<title>Find Churches Near You | Worship Room</title>`
- [ ] Local Support counselors page renders `<title>Find Christian Counselors Near You | Worship Room</title>`
- [ ] Local Support celebrate recovery page renders `<title>Find Celebrate Recovery Near You | Worship Room</title>`
- [ ] Insights page renders `<title>Mood Insights & Spiritual Growth | Worship Room</title>`
- [ ] Friends page renders `<title>Friends & Leaderboard | Worship Room</title>`
- [ ] Settings page renders `<title>Settings | Worship Room</title>`
- [ ] Every page has a unique `<meta name="description">` (no two pages share the same description)
- [ ] Dynamic routes (Bible chapters, reading plans, challenges, prayer requests, profiles, verses) render titles with the entity name interpolated

### Open Graph & Twitter Cards
- [ ] Every page renders `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`
- [ ] Every page renders `twitter:card` as `"summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] `og:image` defaults to `/og-default.png` (1200x630px)
- [ ] Pages with existing share images (verse cards) use the dynamic image as `og:image`

### Canonical URLs
- [ ] Every page has a `<link rel="canonical">` tag
- [ ] Canonical URLs exclude UI-state query params (`?tab=pray`, `?tab=journal`, etc.)
- [ ] Canonical URLs preserve content-meaningful query params (`?category=health`)
- [ ] Canonical URLs use the configured production domain (not `localhost`)
- [ ] Canonical URLs have no trailing slash

### Structured Data
- [ ] Homepage includes Organization JSON-LD with name, url, description, logo
- [ ] Homepage includes WebSite JSON-LD with SearchAction pointing to `/ask`
- [ ] Inner pages include BreadcrumbList JSON-LD with correct hierarchy
- [ ] Devotional page includes Article JSON-LD with headline, datePublished, description

### Sitemap & Robots
- [ ] `/sitemap.xml` exists in the public directory and is accessible
- [ ] Sitemap includes all public static routes with appropriate priority and changefreq values
- [ ] Sitemap includes all Bible chapter URLs (all 66 books, all chapters)
- [ ] Sitemap excludes private/auth-gated routes (settings, insights, friends, profile, admin, login, register)
- [ ] `/robots.txt` exists in the public directory and is accessible
- [ ] `robots.txt` allows all crawlers, references the sitemap, and disallows private routes

### Performance SEO
- [ ] Below-the-fold images have `loading="lazy"` attribute
- [ ] Above-the-fold hero images/video have `fetchpriority="high"` attribute
- [ ] Landing page hero text is rendered in HTML elements (not canvas/SVG-only), is selectable, and is indexable
- [ ] Landing page has exactly one `<h1>` tag

### Social Share Image
- [ ] `/og-default.png` exists at 1200x630px in the public directory
- [ ] Image has dark purple gradient background matching the landing page hero palette
- [ ] Image shows "Worship Room" in white Caveat-style font centered
- [ ] Image shows "Christian Emotional Healing & Worship" subtitle in white Inter-style font below

### General
- [ ] All SEO elements render for logged-out users (crawlers see everything)
- [ ] No new localStorage keys are introduced
- [ ] No new routes are created
- [ ] Tests verify that the SEO component renders correct metadata for key pages
