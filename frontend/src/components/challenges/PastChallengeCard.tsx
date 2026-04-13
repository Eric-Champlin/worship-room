import { getContrastSafeColor, SEASON_LABELS } from '@/constants/challenges'
import type { Challenge } from '@/types/challenges'

import { ChallengeIcon } from './ChallengeIcon'

interface PastChallengeCardProps {
  challenge: Challenge
  isCompleted: boolean
  onClick: () => void
}

export function PastChallengeCard({ challenge, isCompleted, onClick }: PastChallengeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="min-h-[44px] cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.04] p-4 transition-shadow motion-reduce:transition-none hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChallengeIcon
            name={challenge.icon}
            className="h-5 w-5 shrink-0 text-white/40"
            aria-hidden="true"
          />
          <h3 className="font-semibold text-white/70">{challenge.title}</h3>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${challenge.themeColor}26`,
              color: getContrastSafeColor(challenge.themeColor),
            }}
          >
            {SEASON_LABELS[challenge.season]}
          </span>
        </div>

        {isCompleted ? (
          <span className="rounded-full bg-success/10 px-4 py-2 text-sm font-medium text-success">
            Completed
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60">
            Missed
          </span>
        )}
      </div>
    </div>
  )
}
