import { useEffect, useRef } from 'react'
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
    <div
      data-testid="anniversary-card"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 ring-1 ring-amber-500/10 backdrop-blur-sm"
    >
      <h3 className="text-lg font-semibold text-white">{heading}</h3>

      {stats.length > 0 && (
        <ul className="mt-3 space-y-1">
          {stats.map((stat) => (
            <li key={stat.label} className="text-sm text-white/70">
              {stat.label}: <span className="font-medium">{stat.value}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 font-serif text-sm italic text-white/60">
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
  )
}
