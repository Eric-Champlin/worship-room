import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'
import { JourneySection } from '@/components/JourneySection'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar transparent />
      <main>
        <HeroSection />
        <JourneySection />
        {/* Quiz placeholder — will be replaced by StartingPointQuiz component */}
        <div id="quiz" />
      </main>
    </div>
  )
}
