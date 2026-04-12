import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { buildCanonicalUrl, SITE_URL } from '@/lib/seo/canonicalUrl'

// Re-export preserved for backwards compatibility. `Home.tsx`, `MyBiblePage.tsx`,
// `MusicPage.tsx`, `PrayerWall.tsx`, `ReadingPlanDetail.tsx`, `Churches.tsx`,
// `Counselors.tsx`, and `CelebrateRecovery.tsx` all `import { SEO, SITE_URL }`
// from this module. BB-40 moved the canonical definition into
// `@/lib/seo/canonicalUrl` for reuse by `routeMetadata.ts` builders.
export { SITE_URL }

interface SEOProps {
  title: string
  description: string
  noSuffix?: boolean
  ogImage?: string
  ogImageAlt?: string
  ogType?: string
  canonical?: string
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export function SEO({
  title,
  description,
  noSuffix,
  ogImage,
  ogImageAlt,
  ogType = 'website',
  canonical,
  noIndex,
  jsonLd,
}: SEOProps) {
  const { pathname, search } = useLocation()

  const fullTitle = noSuffix ? title : `${title} | Worship Room`
  const canonicalUrl = buildCanonicalUrl(pathname, search, canonical)
  const ogImageUrl = `${SITE_URL}${ogImage || '/og-default.png'}`

  const jsonLdItems = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
      <meta property="og:site_name" content="Worship Room" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
      {ogImageAlt && <meta name="twitter:image:alt" content={ogImageAlt} />}

      {noIndex && <meta name="robots" content="noindex" />}

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  )
}
