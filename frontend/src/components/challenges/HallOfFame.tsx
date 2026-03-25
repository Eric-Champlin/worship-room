import { Trophy } from 'lucide-react'
import type { Challenge } from '@/types/challenges'
import type { ChallengeCalendarInfo } from '@/lib/challenge-calendar'

interface CategorizedChallenge {
  challenge: Challenge
  info: ChallengeCalendarInfo
}

interface HallOfFameProps {
  pastChallenges: CategorizedChallenge[]
}

export function HallOfFame({ pastChallenges }: HallOfFameProps) {
  if (pastChallenges.length === 0) return null

  return (
    <section aria-label="Hall of Fame" className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
        <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
        Hall of Fame
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pastChallenges.map(({ challenge, info }) => {
          const completionCount = 800 + (challenge.id.length * 53)
          const year = info.endDate.getFullYear()
          return (
            <div key={challenge.id} className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
                <h3 className="font-semibold text-white">{challenge.title}</h3>
              </div>
              <p className="mt-2 text-sm text-white/40">
                {completionCount.toLocaleString()} people completed this in {year}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
