import { Heart } from 'lucide-react'
import { getGratitudeStreak } from '@/services/gratitude-storage'

export function GratitudeStreak() {
  const streak = getGratitudeStreak()

  // Only show when 2+ consecutive days
  if (streak < 2) return null

  return (
    <section
      aria-label="Gratitude streak"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="flex items-center gap-3">
        <Heart className="h-5 w-5 text-pink-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">
            Gratitude Streak: {streak} days
          </p>
          <p className="text-xs text-white/50">
            You&apos;ve counted your blessings {streak} days in a row
          </p>
        </div>
      </div>
    </section>
  )
}
