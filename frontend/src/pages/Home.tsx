import { Navbar } from '@/components/Navbar'
import { HeroSection } from '@/components/HeroSection'

export function Home() {
  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <Navbar transparent />
      <main>
        <HeroSection />
      </main>
    </div>
  )
}
