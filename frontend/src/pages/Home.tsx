import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
import { TodaysVerseSection } from '@/components/TodaysVerseSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { DevotionalTeaser } from '@/components/DevotionalTeaser'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
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
        <TodaysVerseSection />
        <DevotionalTeaser />
        <GrowthTeasersSection />
        <StartingPointQuiz />
      </main>
      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
