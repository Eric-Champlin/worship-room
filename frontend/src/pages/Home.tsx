import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { StatsBar, DifferentiatorSection, DashboardPreview, FinalCTA } from '@/components/homepage'
import { JourneySection } from '@/components/JourneySection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { SEO, SITE_URL } from '@/components/SEO'
import { HOME_METADATA } from '@/lib/seo/routeMetadata'
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
      <SEO {...HOME_METADATA} jsonLd={homepageJsonLd} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent hideBanner />
      <main id="main-content">
        <HeroSection />
        <JourneySection />
        <div className="bg-hero-bg"><div className="border-t border-white/[0.08] max-w-6xl mx-auto" /></div>
        <StatsBar />
        <div className="bg-hero-bg"><div className="border-t border-white/[0.08] max-w-6xl mx-auto" /></div>
        <DashboardPreview />
        <div className="bg-hero-bg"><div className="border-t border-white/[0.08] max-w-6xl mx-auto" /></div>
        <DifferentiatorSection />
        <div className="bg-hero-bg"><div className="border-t border-white/[0.08] max-w-6xl mx-auto" /></div>
        <StartingPointQuiz />
        <div className="bg-hero-bg"><div className="border-t border-white/[0.08] max-w-6xl mx-auto" /></div>
        <FinalCTA />
      </main>
      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
