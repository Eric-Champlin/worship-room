/**
 * Single source of truth for canonical URL construction.
 *
 * Previously lived inside `components/SEO.tsx` — extracted in BB-40 so dynamic
 * metadata builders (in `lib/seo/routeMetadata.ts`) can reuse the helper and
 * so the logic can be unit-tested in isolation without mounting <SEO> under a
 * HelmetProvider.
 *
 * `SITE_URL` is also re-exported from `@/components/SEO` for backwards
 * compatibility with the two existing call sites (Home.tsx, MyBiblePage.tsx).
 */

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://worshiproom.com'

/**
 * Query params that represent UI state (not content) and should be stripped
 * from canonical URLs.
 *
 * - 'tab'       — Daily Hub tab selector (Devotional/Pray/Journal/Meditate share /daily);
 *                 also used by /grow, /friends, /music tab-selectors
 * - 'verseRef'  — Spec Z verse pass-through from Devotional → Meditate
 * - 'verseText' — Spec Z verse pass-through
 * - 'verseTheme'— Spec Z verse pass-through
 *
 * Params intentionally NOT in this list:
 * - 'q', 'mode'         — part of /bible?mode=search&q=... canonical;
 *                         stripping would break search SEO
 * - 'verse'             — handled via explicit canonical override at
 *                         BibleReader.tsx and BiblePlanDay metadata builder
 * - 'scroll-to', 'action' — handled via explicit canonical override at
 *                           BibleReader.tsx (same override suppresses them)
 * - 'view'              — MyBible is noIndex; canonical cosmetics don't matter
 * - 'source'            — marketing attribution; harmless to preserve
 * - 'day'               — /daily?day=N is devotional-date content identity
 */
export const UI_STATE_PARAMS = ['tab', 'verseRef', 'verseText', 'verseTheme'] as const

/**
 * Build a canonical URL from a pathname and search string.
 *
 * - Strips all params in `UI_STATE_PARAMS` from the query string
 * - If `canonicalOverride` is provided, uses it as the path AND drops all
 *   query params entirely (for routes like BibleReader that need to collapse
 *   `?verse=`, `?scroll-to=`, `?action=` into a clean canonical)
 * - Normalizes trailing slashes
 * - Handles empty path by falling back to `/`
 */
export function buildCanonicalUrl(
  pathname: string,
  search: string,
  canonicalOverride?: string,
): string {
  const path = canonicalOverride ?? pathname

  // Parse and filter query params — keep content params, strip UI state params
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
