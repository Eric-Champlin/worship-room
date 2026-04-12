import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { SEO, SITE_URL } from '@/components/SEO'
import { CHURCHES_METADATA } from '@/lib/seo/routeMetadata'
import { DENOMINATION_OPTIONS } from '@/types/local-support'
const churchesBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Local Support', item: `${SITE_URL}/local-support/churches` },
    { '@type': 'ListItem', position: 3, name: 'Churches' },
  ],
}

export function Churches() {
  return (
    <>
      <SEO {...CHURCHES_METADATA} jsonLd={churchesBreadcrumbs} />
      <LocalSupportPage
      config={{
        category: 'churches',
        headingId: 'churches-heading',
        title: 'Find a Church Near You',
        scriptWord: 'Church',
        subtitle:
          'Your healing journey was never meant to be walked alone. A local church can be a place of belonging, encouragement, and spiritual growth — a community that walks with you through every season.',
        searchKeyword: 'church',
        filterOptions: DENOMINATION_OPTIONS,
        filterLabel: 'Denomination',
      }}
    />
    </>
  )
}
