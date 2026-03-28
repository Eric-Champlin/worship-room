import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { SEO, SITE_URL } from '@/components/SEO'
import { useRoutePreload } from '@/hooks/useRoutePreload'

const homepageJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Worship Room',
    url: SITE_URL,
    description:
      'Christian emotional healing and worship platform providing AI-powered prayer, Scripture, journaling, meditation, worship music, and community support.',
    logo: `${SITE_URL}/icon-512.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Worship Room',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/ask?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
]

export function Home() {
  useRoutePreload([
    () => import('@/pages/DailyHub'),
  ])

  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <SEO
        title="Worship Room — Christian Emotional Healing & Worship"
        description="Find comfort, guidance, and spiritual support through AI-powered prayer, Scripture, journaling, meditation, worship music, and community."
        noSuffix
        jsonLd={homepageJsonLd}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <main id="main-content">
        <HeroSection />
        <JourneySection />
        <GrowthTeasersSection />
        <StartingPointQuiz />
      </main>
      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
