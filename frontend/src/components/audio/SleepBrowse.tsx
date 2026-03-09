import { SCRIPTURE_COLLECTIONS } from '@/data/music/scripture-readings'
import { useForegroundPlayer } from '@/hooks/useForegroundPlayer'
import { TonightScripture } from './TonightScripture'
import { ScriptureCollectionRow } from './ScriptureCollectionRow'
import { BedtimeStoriesGrid } from './BedtimeStoriesGrid'
import { ContentSwitchDialog } from './ContentSwitchDialog'

export function SleepBrowse() {
  const { startSession, pendingSwitch, confirmSwitch, cancelSwitch } =
    useForegroundPlayer()

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
    </div>
  )
}
