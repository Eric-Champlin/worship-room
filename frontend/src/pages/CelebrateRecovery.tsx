import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { SEO, SITE_URL } from '@/components/SEO'
const crBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Local Support', item: `${SITE_URL}/local-support/churches` },
    { '@type': 'ListItem', position: 3, name: 'Celebrate Recovery' },
  ],
}

export function CelebrateRecovery() {
  return (
    <>
      <SEO title="Find Celebrate Recovery Near You" description="Locate Celebrate Recovery meetings in your area for faith-based addiction and hurt recovery support." jsonLd={crBreadcrumbs} />
      <LocalSupportPage
      config={{
        category: 'celebrate-recovery',
        headingId: 'celebrate-recovery-heading',
        title: 'Find Celebrate Recovery',
        subtitle:
          "Freedom from hurts, habits, and hang-ups starts with showing up. Celebrate Recovery is a Christ-centered 12-step recovery program where you'll find people who understand — because they've been there too.",
        extraHeroContent: (
          <div className="mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm">
            <p className="font-semibold text-white">What is Celebrate Recovery?</p>
            <p className="mt-1">
              Celebrate Recovery is a Christ-centered, 12-step recovery program for anyone
              struggling with hurts, habits, and hang-ups. Based on the Beatitudes, it meets
              weekly at local churches across the country and offers a safe space for healing
              through small groups, worship, and community support.
            </p>
          </div>
        ),
        searchKeyword: 'Celebrate Recovery',
        filterOptions: null,
        filterLabel: null,
      }}
    />
    </>
  )
}
