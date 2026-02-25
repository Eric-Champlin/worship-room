import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'
import { StartingPointQuiz } from '@/components/StartingPointQuiz'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar transparent />
      <main>
        <HeroSection />
        <JourneySection />
        <GrowthTeasersSection />
        <StartingPointQuiz />
      </main>
    </div>
  )
}
