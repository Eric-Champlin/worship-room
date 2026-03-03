import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { SPECIALTY_OPTIONS } from '@/types/local-support'

export function Counselors() {
  return (
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
  )
}
