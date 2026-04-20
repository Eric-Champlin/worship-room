import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { SEO, SITE_URL } from '@/components/SEO'
import { COUNSELORS_METADATA } from '@/lib/seo/routeMetadata'
import { SPECIALTY_OPTIONS } from '@/types/local-support'
const counselorsBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Local Support', item: `${SITE_URL}/local-support/churches` },
    { '@type': 'ListItem', position: 3, name: 'Counselors' },
  ],
}

export function Counselors() {
  return (
    <>
      <SEO {...COUNSELORS_METADATA} jsonLd={counselorsBreadcrumbs} />
      <LocalSupportPage
      config={{
        category: 'counselors',
        headingId: 'counselors-heading',
        title: 'Find a Christian Counselor',
        subtitle:
          'Sometimes the bravest step in healing is asking for help. A faith-based counselor can offer professional guidance rooted in compassion, understanding, and Biblical truth.',
        searchKeyword: 'Christian counselor',
        filterOptions: SPECIALTY_OPTIONS,
        filterLabel: 'Specialty',
        disclaimer:
          'Worship Room does not endorse or verify any counselor listed here. Please research any counselor before scheduling an appointment.',
      }}
    />
    </>
  )
}
