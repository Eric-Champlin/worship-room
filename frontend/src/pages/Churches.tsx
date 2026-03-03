import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { DENOMINATION_OPTIONS } from '@/types/local-support'

export function Churches() {
  return (
    <LocalSupportPage
      config={{
        category: 'churches',
        headingId: 'churches-heading',
        title: 'Find a Church Near You',
        subtitle:
          'Your healing journey was never meant to be walked alone. A local church can be a place of belonging, encouragement, and spiritual growth — a community that walks with you through every season.',
        searchKeyword: 'church',
        filterOptions: DENOMINATION_OPTIONS,
        filterLabel: 'Denomination',
      }}
    />
  )
}
