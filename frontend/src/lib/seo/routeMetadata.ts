/**
 * Single source of truth for every route's SEO metadata — titles,
 * descriptions, OG images, OG image alt text, noIndex flags, and JSON-LD.
 *
 * Pages import the constant for their route (or call the dynamic builder) and
 * spread it into `<SEO {...CONSTANT} />`. This keeps strings out of JSX and
 * lets the length-limit tests parameterize over all exported metadata so
 * adding a new constant auto-tests it.
 *
 * All title/description strings were approved in Step 1 (HARD STOP) of BB-40.
 * The iteration 3 approvals are recorded in `_plans/recon/bb40-seo-metadata.md`
 * — see §3 (static constants), §3.4 (dynamic builders), §14 (titles flagged
 * for future revision).
 *
 * Length budgets:
 * - Raw title ≤ 45 chars for suffixed routes (→ 60 chars total with
 *   ` | Worship Room` suffix which is 15 chars long, not 14 as the plan said)
 * - Raw title ≤ 60 chars for `noSuffix: true` routes (Home only)
 * - Description ≤ 160 chars
 */

import { SITE_URL } from './canonicalUrl'

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

// ─── Homepage ───────────────────────────────────────────────────────────────

export const HOME_METADATA: StaticRouteMetadata = {
  title: 'Worship Room — Christian Emotional Healing & Worship',
  description:
    'Find comfort, guidance, and spiritual support through AI prayer, Scripture, journaling, meditation, worship music, and a caring community.',
  ogImage: '/og/home.png',
  ogImageAlt: 'Worship Room — a free Christian space for prayer, Scripture, and healing',
  noSuffix: true,
}

// ─── Daily Hub tab variants (all share canonical /daily) ───────────────────

export const DAILY_HUB_DEVOTIONAL_METADATA: StaticRouteMetadata = {
  title: "Today's Devotional",
  description:
    'A short Scripture reading, a reflection, and a closing prayer. Unhurried, quiet, and written for ordinary days.',
  ogImage: '/og/daily-devotional.png',
  ogImageAlt: "Today's devotional on Worship Room",
}

export const DAILY_HUB_PRAY_METADATA: StaticRouteMetadata = {
  title: 'Write a Prayer',
  description:
    "Write what's on your heart and get back a Scripture-grounded prayer for this moment. Honest, unhurried, and always free.",
  ogImage: '/og/daily-pray.png',
  ogImageAlt: 'Write a prayer on Worship Room — Scripture-grounded and honest',
}

export const DAILY_HUB_JOURNAL_METADATA: StaticRouteMetadata = {
  title: 'Daily Journal',
  description:
    'A private journal for the things you need to think through. Guided prompts or free write — your entries stay yours, on your device.',
  ogImage: '/og/daily-journal.png',
  ogImageAlt: 'A private daily journal on Worship Room',
}

export const DAILY_HUB_MEDITATE_METADATA: StaticRouteMetadata = {
  title: 'Contemplative Prayer',
  description:
    'Six contemplative practices from the Christian tradition — breathing, Scripture soaking, gratitude, ACTS, Psalms, and the Ignatian Examen. Slow and unhurried.',
  ogImage: '/og/daily-meditate.png',
  ogImageAlt:
    'Contemplative prayer on Worship Room — breathing, Scripture soaking, Examen, and more',
}

// ─── Bible section ──────────────────────────────────────────────────────────

export const BIBLE_LANDING_METADATA: StaticRouteMetadata = {
  title: 'Read the Bible (WEB)',
  description:
    'Read the World English Bible free online — all 66 books, no account needed. Resume where you left off, save highlights and notes, and listen aloud.',
  ogImage: '/og/bible-landing.png',
  ogImageAlt: 'The World English Bible on Worship Room',
}

export const BIBLE_BROWSE_METADATA: StaticRouteMetadata = {
  title: 'Browse the Bible (WEB)',
  description:
    'Browse all 66 books of the World English Bible by testament, book, and chapter. Free, ad-free, public-domain — yours to read at your own pace.',
  ogImage: '/og/bible-landing.png',
  ogImageAlt: 'Browse the World English Bible on Worship Room',
}

export const BIBLE_PLANS_BROWSER_METADATA: StaticRouteMetadata = {
  title: 'Reading Plans for Hard Days',
  description:
    'Short guided Bible reading plans for anxiety, sleepless nights, the life of Jesus, and the Psalms. 7 to 30 days. No guilt, no streaks, just reading.',
  ogImage: '/og/plans-browser.png',
  ogImageAlt: 'Bible reading plans for hard days on Worship Room',
}

export const MY_BIBLE_METADATA: StaticRouteMetadata = {
  title: 'My Bible',
  description:
    'Your highlights, notes, and bookmarks from the Bible reader — all in one private feed. Stored locally on your device, no account needed to use it.',
  ogImage: '/og/my-bible.png',
  ogImageAlt: 'Your Bible highlights and notes on Worship Room',
  noIndex: true,
}

// ─── Ask / Grow / Music / Prayer Wall ──────────────────────────────────────

export const ASK_METADATA: StaticRouteMetadata = {
  title: 'Ask the Bible',
  description:
    'Ask life questions and receive Scripture-grounded answers with verse links and follow-ups. For hard days and honest questions.',
  ogImage: '/og/ask.png',
  ogImageAlt: 'Ask the Bible on Worship Room',
}

export const GROW_METADATA: StaticRouteMetadata = {
  title: 'Reading Plans & Challenges',
  description:
    'Bible reading plans and seasonal community challenges: Lent, Easter, Pentecost, Advent, and New Year. Short guided paths, no streaks, no guilt.',
  ogImageAlt: 'Bible reading plans and seasonal challenges on Worship Room',
}

export const MUSIC_METADATA: StaticRouteMetadata = {
  title: 'Worship Music & Ambient Sounds',
  description:
    'Stream worship playlists, mix ambient sounds for prayer and meditation, and fall asleep to Scripture readings. No ads, no subscriptions, all free.',
  ogImageAlt: 'Worship music and ambient sounds on Worship Room',
}

export const MUSIC_ROUTINES_METADATA: StaticRouteMetadata = {
  title: 'Bedtime Routines',
  description:
    'Wind down with guided Christian bedtime routines combining Scripture, ambient sounds, and gentle prayers. Four templates to help you rest in peace.',
  ogImageAlt: 'Bedtime routines on Worship Room',
}

export const PRAYER_WALL_METADATA: StaticRouteMetadata = {
  title: 'Community Prayer Wall',
  description:
    'Share prayer requests, pray for others, and receive encouragement in a caring Christian community. No ads, no harvesting — just prayers lifted together.',
  ogImageAlt: 'The Worship Room community prayer wall',
}

export const PRAYER_DETAIL_METADATA: StaticRouteMetadata = {
  title: 'Prayer Request',
  description:
    'A prayer request shared on the Worship Room community prayer wall. Read, pray along, or leave a word of encouragement for the person asking.',
  ogImageAlt: 'A prayer request on the Worship Room community prayer wall',
}

export const PRAYER_WALL_PROFILE_METADATA: StaticRouteMetadata = {
  title: 'Prayer Profile',
  description:
    'Prayers shared publicly by a Worship Room community member. Read, pray along, and encourage.',
  ogImageAlt: 'A Worship Room prayer profile',
}

export const PRAYER_WALL_DASHBOARD_METADATA: StaticRouteMetadata = {
  title: 'Prayer Dashboard',
  description:
    'Your private prayer wall dashboard — track requests, activity, answered prayers, and drafts, all in one place.',
  noIndex: true,
}

// ─── Local Support ──────────────────────────────────────────────────────────

export const CHURCHES_METADATA: StaticRouteMetadata = {
  title: 'Find Churches Near You',
  description:
    'Locate churches in your area with service times, directions, and contact information. A simple, faith-friendly directory for finding a worship community.',
  ogImageAlt: 'Find churches near you on Worship Room',
}

export const COUNSELORS_METADATA: StaticRouteMetadata = {
  title: 'Find Christian Counselors Near You',
  description:
    'Locate Christian counselors and therapists in your area for faith-based professional support. We list profiles so you can reach out directly to the counselor.',
  ogImageAlt: 'Find Christian counselors near you on Worship Room',
}

export const CELEBRATE_RECOVERY_METADATA: StaticRouteMetadata = {
  title: 'Find Celebrate Recovery Near You',
  description:
    'Locate Celebrate Recovery meetings in your area for faith-based addiction, habit, and hurt recovery support. A Christ-centered 12-step community.',
  ogImageAlt: 'Find Celebrate Recovery meetings near you on Worship Room',
}

// ─── Private / auth-gated (noIndex) ────────────────────────────────────────

export const MY_PRAYERS_METADATA: StaticRouteMetadata = {
  title: 'My Saved Prayers',
  description:
    'Your saved prayers and prayer history on Worship Room. Track answered prayers, set reminders, and revisit the words that carried you through.',
  noIndex: true,
}

export const FRIENDS_METADATA: StaticRouteMetadata = {
  title: 'Friends',
  description:
    'Grow together in faith with friends, gentle encouragement, and friendly accountability. Your mood data stays private — only engagement is shareable.',
  noIndex: true,
}

export const SETTINGS_METADATA: StaticRouteMetadata = {
  title: 'Settings',
  description:
    'Manage your Worship Room account, notifications, privacy preferences, and data controls.',
  noIndex: true,
}

export const INSIGHTS_METADATA: StaticRouteMetadata = {
  title: 'Mood & Practice Insights',
  description:
    'Track your mood trends, meditation minutes, and daily activity patterns over time. Private analytics from your own data — nothing shared, nothing sold.',
  noIndex: true,
}

export const INSIGHTS_MONTHLY_METADATA: StaticRouteMetadata = {
  title: 'Monthly Mood Report',
  description:
    'Your monthly spiritual growth and mood tracking summary, visualized and exportable to your own archive.',
  noIndex: true,
}

export const GROWTH_PROFILE_METADATA: StaticRouteMetadata = {
  title: 'Growth Profile',
  description: 'A spiritual growth profile on Worship Room — badges, streaks, and encouragement.',
  noIndex: true,
}

export const GROWTH_PROFILE_NOT_FOUND_METADATA: StaticRouteMetadata = {
  title: 'Profile Not Found',
  description: "This user profile doesn't exist or may have been removed.",
  noIndex: true,
}

// ─── Meditate sub-pages (all noIndex) ──────────────────────────────────────

export const MEDITATE_BREATHING_METADATA: StaticRouteMetadata = {
  title: 'Breathing Exercise',
  description:
    'A calming 4-7-8 breathing exercise paired with a Scripture verse for peace and focus. Free and guided.',
  noIndex: true,
}

export const MEDITATE_SOAKING_METADATA: StaticRouteMetadata = {
  title: 'Scripture Soaking',
  description:
    'Contemplate and meditate on a single Bible verse with guided reflection prompts. Slow, quiet, restorative.',
  noIndex: true,
}

export const MEDITATE_GRATITUDE_METADATA: StaticRouteMetadata = {
  title: 'Gratitude Reflection',
  description:
    'A guided gratitude meditation rooted in Scripture — name three gifts, carry them with you through the day.',
  noIndex: true,
}

export const MEDITATE_ACTS_METADATA: StaticRouteMetadata = {
  title: 'ACTS Prayer Walk',
  description:
    'A structured prayer using the ACTS framework — Adoration, Confession, Thanksgiving, Supplication. Step by step.',
  noIndex: true,
}

export const MEDITATE_PSALMS_METADATA: StaticRouteMetadata = {
  title: 'Psalm Reading',
  description:
    'Read and reflect on a curated Psalm with historical context and guided meditation. Ten Psalms to rotate through.',
  noIndex: true,
}

export const MEDITATE_EXAMEN_METADATA: StaticRouteMetadata = {
  title: 'Examen Reflection',
  description:
    'The Ignatian Examen — a reflective prayer reviewing your day with God. Where did you feel alive? Where did you resist?',
  noIndex: true,
}

// ─── Stubs & system (noIndex) ──────────────────────────────────────────────

export const REGISTER_METADATA: StaticRouteMetadata = {
  title: 'Get Started',
  description:
    'Create your free Worship Room account — AI-assisted prayer, Bible reading, journaling, meditation, worship music, and community. Completely free, forever.',
  noIndex: true,
}

export const LOGIN_METADATA: StaticRouteMetadata = {
  title: 'Log In',
  description:
    'Log in to your Worship Room account — secure sign-in coming soon to our sanctuary on the web.',
  noIndex: true,
}

export const NOT_FOUND_METADATA: StaticRouteMetadata = {
  title: 'Page Not Found',
  description:
    "The page you're looking for doesn't exist, but there's plenty of peace to find elsewhere.",
  noIndex: true,
}

export const HEALTH_METADATA: StaticRouteMetadata = {
  title: 'Health Check',
  description: 'System health status.',
  noIndex: true,
}

// ─── Sharing routes ────────────────────────────────────────────────────────

export const SHARED_VERSE_METADATA: StaticRouteMetadata = {
  title: 'Shared Verse',
  description:
    'A Bible verse shared from Worship Room — Christian emotional healing and worship through Scripture.',
  ogImageAlt: 'A Bible verse shared from Worship Room',
}

export const SHARED_PRAYER_METADATA: StaticRouteMetadata = {
  title: 'Shared Prayer',
  description:
    'A prayer shared from Worship Room — Christian emotional healing and worship through Scripture, prayer, and community.',
  ogImageAlt: 'A prayer shared from Worship Room',
}

// ─── Legacy reading plan + challenge detail (dynamic titles at call site) ──

export const READING_PLAN_DETAIL_METADATA: StaticRouteMetadata = {
  title: 'Reading Plan',
  description:
    'A guided Bible reading plan on Worship Room. Track your progress day by day and grow at your own pace.',
  ogImageAlt: 'A Bible reading plan on Worship Room',
}

export const CHALLENGE_DETAIL_METADATA: StaticRouteMetadata = {
  title: 'Community Challenge',
  description:
    'A seasonal community challenge on Worship Room — daily Scripture, reflection, and action, walked together with others.',
  ogImageAlt: 'A community challenge on Worship Room',
}

// ─── Dynamic builders ───────────────────────────────────────────────────────

/**
 * Build metadata for `/bible/:book/:chapter` (BibleReader).
 * Returns the full DynamicMetadata including a BreadcrumbList JSON-LD and an
 * explicit `canonical` override that collapses `?verse=`, `?scroll-to=`,
 * `?action=` into a clean canonical URL.
 */
export function buildBibleChapterMetadata(
  bookName: string,
  chapterNumber: number,
  bookSlug: string,
): DynamicMetadata {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Worship Room', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Study Bible', item: `${SITE_URL}/bible` },
      { '@type': 'ListItem', position: 3, name: bookName, item: `${SITE_URL}/bible/browse` },
      {
        '@type': 'ListItem',
        position: 4,
        name: `${bookName} ${chapterNumber}`,
        item: `${SITE_URL}/bible/${bookSlug}/${chapterNumber}`,
      },
    ],
  }

  return {
    title: `${bookName} ${chapterNumber} (WEB)`,
    description: `Read ${bookName} chapter ${chapterNumber} from the World English Bible. Highlight verses, add notes, and listen to an audio reading.`,
    ogImage: '/og/bible-chapter.png',
    ogImageAlt: `${bookName} ${chapterNumber} — World English Bible`,
    canonical: `/bible/${bookSlug}/${chapterNumber}`,
    jsonLd,
  }
}

/** OG image lookup for the 4 Bible-redesign reading plan slugs. */
const PLAN_OG_IMAGES: Record<string, string> = {
  'psalms-30-days': '/og/plans/psalms-30-days.png',
  'john-story-of-jesus': '/og/plans/john-story-of-jesus.png',
  "when-youre-anxious": '/og/plans/when-youre-anxious.png',
  'when-you-cant-sleep': '/og/plans/when-you-cant-sleep.png',
}

const PLAN_OG_FALLBACK = '/og/bible-chapter.png'

/** Title/description truncation ceilings (matches iteration 3 Rev 3 budgets). */
const TITLE_MAX_CHARS = 45
const DESCRIPTION_MAX_CHARS = 160
const ELLIPSIS = '…'

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + ELLIPSIS
}

/**
 * Build metadata for `/bible/plans/:slug` (BiblePlanDetail).
 * Truncates long plan descriptions to the 160-char limit with ellipsis.
 */
export function buildBiblePlanMetadata(
  slug: string,
  planTitle: string,
  planDescription: string,
): DynamicMetadata {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Study Bible', item: `${SITE_URL}/bible` },
      { '@type': 'ListItem', position: 2, name: 'Plans', item: `${SITE_URL}/bible/plans` },
      {
        '@type': 'ListItem',
        position: 3,
        name: planTitle,
        item: `${SITE_URL}/bible/plans/${slug}`,
      },
    ],
  }

  return {
    title: truncate(planTitle, TITLE_MAX_CHARS),
    description: truncate(planDescription, DESCRIPTION_MAX_CHARS),
    ogImage: PLAN_OG_IMAGES[slug] ?? PLAN_OG_FALLBACK,
    ogImageAlt: `${planTitle} — Worship Room reading plan`,
    canonical: `/bible/plans/${slug}`,
    jsonLd,
  }
}

/**
 * Build metadata for `/bible/plans/:slug/day/:dayNumber` (BiblePlanDay).
 * `dayTitle` comes from the plan's `day.title` field (e.g., "Psalm 23 — The
 * Lord is my Shepherd"). Strips `?verse=` via explicit canonical override.
 */
export function buildBiblePlanDayMetadata(
  slug: string,
  planTitle: string,
  dayNumber: number,
  dayTitle: string,
): DynamicMetadata {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Study Bible', item: `${SITE_URL}/bible` },
      { '@type': 'ListItem', position: 2, name: 'Plans', item: `${SITE_URL}/bible/plans` },
      {
        '@type': 'ListItem',
        position: 3,
        name: planTitle,
        item: `${SITE_URL}/bible/plans/${slug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `Day ${dayNumber}`,
        item: `${SITE_URL}/bible/plans/${slug}/day/${dayNumber}`,
      },
    ],
  }

  const rawTitle = `Day ${dayNumber}: ${dayTitle}`
  const rawDescription = `Day ${dayNumber} of ${planTitle} — read ${dayTitle} and reflect with a short devotional from Worship Room.`

  return {
    title: truncate(rawTitle, TITLE_MAX_CHARS),
    description: truncate(rawDescription, DESCRIPTION_MAX_CHARS),
    ogImage: PLAN_OG_IMAGES[slug] ?? PLAN_OG_FALLBACK,
    ogImageAlt: `Day ${dayNumber} of ${planTitle}`,
    canonical: `/bible/plans/${slug}/day/${dayNumber}`,
    jsonLd,
  }
}

/**
 * Build metadata for `/bible?mode=search&q=...` (BibleLanding in search mode).
 * When query is empty/whitespace/null, returns a generic "Search the Bible"
 * default. When a query is provided, slices it to 37 chars to keep the
 * prefixed title within the 45-char raw budget (`Search: ` is 8 chars).
 *
 * Note: no `canonical` override — `UI_STATE_PARAMS` preserves `?mode=search&q=`
 * in the canonical because search is a content identity, not UI state.
 */
export function buildBibleSearchMetadata(query: string | null | undefined): DynamicMetadata {
  if (!query || !query.trim()) {
    return {
      title: 'Search the Bible',
      description: 'Search the entire World English Bible for any word, phrase, or theme. Free and ad-free.',
      ogImage: '/og/bible-landing.png',
      ogImageAlt: 'Search the Bible on Worship Room',
    }
  }

  // Slice to 37 chars so "Search: " (8) + query stays ≤ 45 chars
  const trimmed = query.trim().slice(0, 37)
  return {
    title: `Search: ${trimmed}`,
    description: `Search results for "${trimmed}" in the World English Bible on Worship Room.`,
    ogImage: '/og/bible-landing.png',
    ogImageAlt: `Bible search results for ${trimmed}`,
  }
}
