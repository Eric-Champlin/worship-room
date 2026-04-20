import type { ScriptureCollection } from '@/types/music'
import type { ScriptureReading } from '@/types/music'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ScriptureSessionCard } from './ScriptureSessionCard'

interface ScriptureCollectionRowProps {
  collection: ScriptureCollection
  onPlay: (reading: ScriptureReading) => void
}

export function ScriptureCollectionRow({
  collection,
  onPlay,
}: ScriptureCollectionRowProps) {
  return (
    <section className="space-y-3">
      <SectionHeader>{collection.name}</SectionHeader>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none">
        {collection.readings.map((reading) => (
          <ScriptureSessionCard
            key={reading.id}
            reading={reading}
            onPlay={onPlay}
          />
        ))}
      </div>
    </section>
  )
}
