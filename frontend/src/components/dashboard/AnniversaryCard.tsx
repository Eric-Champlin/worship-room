import { useEffect, useRef } from 'react'
import { PartyPopper } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useSoundEffects } from '@/hooks/useSoundEffects'

export interface AnniversaryCardProps {
  heading: string
  closingMessage: string
  stats: Array<{ label: string; value: string }>
  onDismiss: () => void
}

export function AnniversaryCard({
  heading,
  closingMessage,
  stats,
  onDismiss,
}: AnniversaryCardProps) {
  const { playSoundEffect } = useSoundEffects()
  const soundPlayedRef = useRef(false)

  useEffect(() => {
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true
      playSoundEffect('sparkle')
    }
  }, [playSoundEffect])

  return (
    <FrostedCard
      variant="default"
      as="section"
      className="ring-1 ring-amber-500/10"
    >
      <div data-testid="anniversary-card">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-amber-300" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white">{heading}</h3>
        </div>

        {stats.length > 0 && (
          <ul className="mt-3 space-y-1">
            {stats.map((stat) => (
              <li key={stat.label} className="text-sm text-white/70">
                {stat.label}: <span className="font-medium">{stat.value}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-white/60">
          {closingMessage}
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] min-w-[44px] px-3 text-sm text-white/40 transition-colors hover:text-white/60"
          >
            Dismiss
          </button>
        </div>
      </div>
    </FrostedCard>
  )
}
