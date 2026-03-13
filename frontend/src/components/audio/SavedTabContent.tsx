import { useSavedMixes } from '@/hooks/useSavedMixes'
import { SavedMixRow } from './SavedMixRow'
import type { SavedMix } from '@/types/storage'

interface SavedTabContentProps {
  onShareMix?: (mix: SavedMix) => void
}

export function SavedTabContent({ onShareMix }: SavedTabContentProps) {
  const { mixes } = useSavedMixes()

  function handleShare(mix: SavedMix) {
    onShareMix?.(mix)
  }

  if (mixes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-white/70">
          No saved mixes yet
        </p>
        <p className="mt-1 text-xs text-white/60">
          Create a custom mix and tap Save to keep it
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {mixes.map((mix) => (
        <SavedMixRow key={mix.id} mix={mix} onShare={handleShare} />
      ))}
    </div>
  )
}
