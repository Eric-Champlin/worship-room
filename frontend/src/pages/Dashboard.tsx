import { useEffect, useRef, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { DashboardWidgetGrid } from '@/components/dashboard/DashboardWidgetGrid'
import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn'
import { CelebrationQueue } from '@/components/dashboard/CelebrationQueue'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { hasCheckedInToday } from '@/services/mood-storage'
import type { MoodEntry } from '@/types/dashboard'

export function Dashboard() {
  const { user } = useAuth()
  const [showCheckIn, setShowCheckIn] = useState(() => !hasCheckedInToday())
  const checkedRef = useRef(false)

  const faithPoints = useFaithPoints()

  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true
      setShowCheckIn(!hasCheckedInToday())
    }
  }, [])

  const handleCheckInComplete = (_entry: MoodEntry) => {
    setShowCheckIn(false)
  }

  const handleCheckInSkip = () => {
    setShowCheckIn(false)
  }

  if (!user) return null

  if (showCheckIn) {
    return (
      <MoodCheckIn
        userName={user.name}
        onComplete={handleCheckInComplete}
        onSkip={handleCheckInSkip}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <main
        id="main-content"
        className="animate-fade-in motion-reduce:animate-none"
      >
        <DashboardHero userName={user.name} />
        <DashboardWidgetGrid faithPoints={faithPoints} />
      </main>
      <SiteFooter />
      <CelebrationQueue
        newlyEarnedBadges={faithPoints.newlyEarnedBadges}
        clearNewlyEarnedBadges={faithPoints.clearNewlyEarnedBadges}
      />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
