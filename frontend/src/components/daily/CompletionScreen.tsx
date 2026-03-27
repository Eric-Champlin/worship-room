import { Link } from 'react-router-dom'
import { MiniHubCards } from './MiniHubCards'
import { cn } from '@/lib/utils'
import { getMeditationHistory } from '@/services/meditation-storage'

interface CompletionScreenProps {
  title?: string
  ctas: { label: string; to: string; primary?: boolean }[]
  className?: string
  showMeditationStats?: boolean
}

export function CompletionScreen({
  title = 'Well done!',
  ctas,
  className,
  showMeditationStats,
}: CompletionScreenProps) {
  const history = showMeditationStats ? getMeditationHistory() : []
  const totalSessions = history.length
  const totalMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0)

  return (
    <div
      className={cn(
        'flex motion-safe:animate-fade-in flex-col items-center gap-8 py-12 text-center',
        className,
      )}
    >
      <h2 className="font-lora text-3xl font-bold text-text-dark">{title}</h2>

      <MiniHubCards />

      {showMeditationStats && (
        <p className="text-sm text-white/60">
          You've meditated {totalSessions} {totalSessions === 1 ? 'time' : 'times'} for {totalMinutes} total minutes
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {ctas.map(({ label, to, primary }) =>
          primary ? (
            <Link
              key={to}
              to={to}
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-light"
            >
              {label}
            </Link>
          ) : (
            <Link
              key={to}
              to={to}
              className="text-sm text-primary underline transition-colors hover:text-primary-light"
            >
              {label}
            </Link>
          ),
        )}
      </div>

      {showMeditationStats && history.length >= 7 && (
        <Link
          to="/insights#meditation-history"
          className="text-sm text-primary-lt transition-colors hover:text-primary hover:underline"
        >
          View your meditation trends →
        </Link>
      )}
    </div>
  )
}
