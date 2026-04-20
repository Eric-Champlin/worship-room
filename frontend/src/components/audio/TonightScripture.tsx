import { Play } from 'lucide-react'
import { ALL_SCRIPTURE_READINGS } from '@/data/music/scripture-readings'
import type { ScriptureReading } from '@/types/music'

interface TonightScriptureProps {
  onPlay: (reading: ScriptureReading) => void
}

function getTonightReading(): ScriptureReading {
  const todayIndex = Math.floor(Date.now() / 86400000) % ALL_SCRIPTURE_READINGS.length
  return ALL_SCRIPTURE_READINGS[todayIndex]
}

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`
}

export function TonightScripture({ onPlay }: TonightScriptureProps) {
  const reading = getTonightReading()

  return (
    <section aria-label="Tonight's featured scripture" className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-wide text-white">
        Tonight&apos;s Scripture
      </p>
      <div className="rounded-xl border-2 border-primary/40 bg-white/[0.06] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{reading.title}</p>
            <p className="mt-1 text-sm text-white/60">{reading.scriptureReference}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                {formatDuration(reading.durationSeconds)}
              </span>
              <span className="text-xs text-white/50">
                {reading.voiceId === 'male' ? 'Male' : 'Female'} voice
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPlay(reading)}
            aria-label={`Play ${reading.title}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] active:scale-[0.96]"
          >
            <Play size={20} fill="currentColor" />
          </button>
        </div>
      </div>
    </section>
  )
}
