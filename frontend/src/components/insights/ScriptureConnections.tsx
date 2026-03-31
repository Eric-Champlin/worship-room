import { BookOpen } from 'lucide-react'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import type { MoodValue } from '@/types/dashboard'

interface ScriptureConnectionsProps {
  hasData: boolean
}

const MOCK_SCRIPTURE_CONNECTIONS = [
  { reference: 'Psalm 34:18', context: 'Appeared on 3 of your Good days', moodValue: 4 as MoodValue },
  { reference: 'Psalm 46:10', context: 'Your most common verse during Okay moods', moodValue: 3 as MoodValue },
  { reference: 'Psalm 107:1', context: 'Featured on your Thriving days', moodValue: 5 as MoodValue },
  { reference: 'Psalm 55:22', context: 'A comfort during Heavy moments', moodValue: 2 as MoodValue },
]

export function ScriptureConnections({ hasData }: ScriptureConnectionsProps) {
  return (
    <section
      aria-labelledby="scripture-connections-title"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="scripture-connections-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Scriptures That Spoke to You
        </h2>
      </div>

      {!hasData ? (
        <p className="py-6 text-center text-sm text-white/60 leading-relaxed md:text-base">
          As you check in and read scripture, we&apos;ll start connecting the
          dots between what you read and how you feel.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {MOCK_SCRIPTURE_CONNECTIONS.map((item) => (
              <div key={item.reference} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: MOOD_COLORS[item.moodValue] }}
                  aria-hidden="true"
                />
                <div>
                  <span className="font-serif text-white">
                    {item.reference}
                  </span>
                  <p className="mt-0.5 font-sans text-sm text-white/60">
                    {item.context}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-white/60">
            Based on example data. Personalized connections coming soon.
          </p>
        </>
      )}
    </section>
  )
}
