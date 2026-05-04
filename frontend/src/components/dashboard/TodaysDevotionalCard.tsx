import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { getTodaysDevotional } from '@/data/devotionals'
import { formatThemeName } from '@/utils/devotional'
import { getLocalDateString } from '@/utils/date'

export function TodaysDevotionalCard() {
  const devotional = getTodaysDevotional()

  const isRead = useMemo(() => {
    const todayStr = getLocalDateString()
    let reads: string[] = []
    try {
      reads = JSON.parse(localStorage.getItem('wr_devotional_reads') || '[]') as string[]
    } catch (_e) {
      // Malformed localStorage — treat as unread
    }
    return reads.includes(todayStr)
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-white">
          {devotional.title}
          {isRead && (
            <Check
              className="ml-1.5 inline h-4 w-4 text-success"
              aria-label="Completed"
            />
          )}
        </h3>
      </div>

      <span className="mt-1.5 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/60">
        {formatThemeName(devotional.theme)}
      </span>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">
        {devotional.reflection[0]}
      </p>

      {isRead ? (
        <Link
          to="/daily?tab=devotional"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white/70"
        >
          Read again &rarr;
        </Link>
      ) : (
        <Link
          to="/daily?tab=devotional"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
        >
          Read today&apos;s devotional &rarr;
        </Link>
      )}
    </div>
  )
}
