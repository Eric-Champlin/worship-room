import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'
import { SiteFooter } from '@/components/SiteFooter'

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
        <GrowthTeasersSection />
        <StartingPointQuiz />
      </main>
      <SiteFooter />
    </div>
  )
}
