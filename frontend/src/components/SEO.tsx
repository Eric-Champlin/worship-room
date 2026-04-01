import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

// eslint-disable-next-line react-refresh/only-export-components -- Constant co-located with SEO component
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://worshiproom.com'

/** Query params that represent UI state (not content) and should be stripped from canonical URLs */
const UI_STATE_PARAMS = ['tab']

interface SEOProps {
  title: string
  description: string
  noSuffix?: boolean
  ogImage?: string
  ogType?: string
  canonical?: string
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function buildCanonicalUrl(pathname: string, search: string, canonicalOverride?: string): string {
  const path = canonicalOverride ?? pathname

  // Parse and filter query params — keep content params, strip UI state params
  const params = new URLSearchParams(search)
  const filteredParams = new URLSearchParams()
  params.forEach((value, key) => {
    if (!UI_STATE_PARAMS.includes(key)) {
      filteredParams.set(key, value)
    }
  })

  // If canonical is overridden, don't append query params from current URL
  const queryString = canonicalOverride ? '' : filteredParams.toString()
  const cleanPath = path.replace(/\/+$/, '') || '/'
  const url = `${SITE_URL}${cleanPath}`

  return queryString ? `${url}?${queryString}` : url
}

export function SEO({
  title,
  description,
  noSuffix,
  ogImage,
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
      <meta property="og:site_name" content="Worship Room" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {noIndex && <meta name="robots" content="noindex" />}

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  )
}
