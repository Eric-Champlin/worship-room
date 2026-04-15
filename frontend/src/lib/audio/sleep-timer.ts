/**
 * BB-28 — Sleep timer presets and formatting helpers.
 *
 * Consumed by the AudioPlayerContext reducer, AudioPlayerProvider,
 * SleepTimerPanel, and the sleep timer indicators in both the
 * expanded and minimized player surfaces.
 */

export const SLEEP_FADE_DURATION_MS = 20_000

export interface SleepTimerPreset {
  id: string
  label: string
  type: 'duration' | 'end-of-chapter' | 'end-of-book'
  durationMs?: number
}

export const SLEEP_TIMER_PRESETS: SleepTimerPreset[] = [
  { id: '15', label: '15 min', type: 'duration', durationMs: 15 * 60_000 },
  { id: '30', label: '30 min', type: 'duration', durationMs: 30 * 60_000 },
  { id: '45', label: '45 min', type: 'duration', durationMs: 45 * 60_000 },
  { id: '60', label: '1 hour', type: 'duration', durationMs: 60 * 60_000 },
  { id: '90', label: '1 hr 30 min', type: 'duration', durationMs: 90 * 60_000 },
  { id: '120', label: '2 hours', type: 'duration', durationMs: 120 * 60_000 },
  { id: 'chapter', label: 'End of chapter', type: 'end-of-chapter' },
  { id: 'book', label: 'End of book', type: 'end-of-book' },
]

export function formatSleepTimerRemaining(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
