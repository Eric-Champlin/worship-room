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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
