import { Link } from 'react-router-dom'
import { SCRIPTURE_COLLECTIONS } from '@/data/music/scripture-readings'
import { useForegroundPlayer } from '@/hooks/useForegroundPlayer'
import { BibleSleepSection } from './BibleSleepSection'
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
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <BibleSleepSection />

        <TonightScripture onPlay={startSession} />

        {SCRIPTURE_COLLECTIONS.map((collection) => (
          <ScriptureCollectionRow
            key={collection.id}
            collection={collection}
            onPlay={startSession}
          />
        ))}

        <BedtimeStoriesGrid onPlay={startSession} />

        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-6 text-center">
          <h3 className="mb-2 text-base font-semibold text-white">
            Build a Bedtime Routine
          </h3>
          <p className="mb-4 text-sm text-white/60">
            Chain scenes, scripture, and stories into one seamless sleep experience
          </p>
          <Link
            to="/music/routines"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] active:scale-[0.98] transition-colors motion-reduce:transition-none"
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
