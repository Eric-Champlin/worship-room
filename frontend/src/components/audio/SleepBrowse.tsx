import { Link } from 'react-router-dom'
import { SCRIPTURE_COLLECTIONS } from '@/data/music/scripture-readings'
import { useForegroundPlayer } from '@/hooks/useForegroundPlayer'
import { TonightScripture } from './TonightScripture'
import { ScriptureCollectionRow } from './ScriptureCollectionRow'
import { BedtimeStoriesGrid } from './BedtimeStoriesGrid'
import { ContentSwitchDialog } from './ContentSwitchDialog'
import { RoutineInterruptDialog } from './RoutineInterruptDialog'

export function SleepBrowse() {
  const {
    startSession,
    pendingSwitch,
    confirmSwitch,
    cancelSwitch,
    pendingRoutineInterrupt,
    confirmRoutineInterrupt,
    cancelRoutineInterrupt,
  } = useForegroundPlayer()

  return (
    <div className="min-h-screen bg-hero-dark px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <TonightScripture onPlay={startSession} />

        {SCRIPTURE_COLLECTIONS.map((collection) => (
          <ScriptureCollectionRow
            key={collection.id}
            collection={collection}
            onPlay={startSession}
          />
        ))}

        <BedtimeStoriesGrid onPlay={startSession} />

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <h3 className="mb-2 text-base font-semibold text-white">
            Build a Bedtime Routine
          </h3>
          <p className="mb-4 text-sm text-white/60">
            Chain scenes, scripture, and stories into one seamless sleep experience
          </p>
          <Link
            to="/music/routines"
            className="inline-block rounded-full border border-primary px-6 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Create a Routine
          </Link>
        </div>
      </div>

      {pendingSwitch && (
        <ContentSwitchDialog
          currentTitle={pendingSwitch.currentTitle}
          remainingTime={pendingSwitch.remainingTime}
          newTitle={pendingSwitch.newTitle}
          onSwitch={confirmSwitch}
          onKeepListening={cancelSwitch}
        />
      )}

      {pendingRoutineInterrupt && (
        <RoutineInterruptDialog
          onConfirm={confirmRoutineInterrupt}
          onCancel={cancelRoutineInterrupt}
        />
      )}
    </div>
  )
}
