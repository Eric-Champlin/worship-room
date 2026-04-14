import { AmbientSoundPill } from '@/components/daily/AmbientSoundPill'
import { useAudioState } from '@/components/audio/AudioProvider'
import { cn } from '@/lib/utils'
import type { AmbientContext } from '@/constants/ambient-suggestions'

interface DailyAmbientPillFABProps {
  context: AmbientContext
}

/**
 * DailyAmbientPillFAB — sticky bottom-right floating action button
 * wrapping the AmbientSoundPill. Renders on the Daily Hub root so the
 * pill is accessible from devotional, pray, journal, and meditate tabs.
 *
 * Auto-hides when the AudioDrawer is open (same pattern as chat widgets
 * that hide their bubble while the chat panel is open).
 */
export function DailyAmbientPillFAB({ context }: DailyAmbientPillFABProps) {
  const audioState = useAudioState()
  const isHidden = audioState.drawerOpen

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-40 transition-opacity motion-reduce:transition-none duration-base',
        isHidden ? 'opacity-0' : 'opacity-100',
      )}
      style={{
        bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        right: 'max(1.5rem, env(safe-area-inset-right))',
      }}
      aria-hidden={isHidden}
    >
      <div className={cn('pointer-events-auto', isHidden && 'pointer-events-none')}>
        <AmbientSoundPill
          context={context}
          variant="dark"
          className="!mb-0 !w-auto shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        />
      </div>
    </div>
  )
}
