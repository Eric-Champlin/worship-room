import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import type { MoodEntry, MoodValue } from '@/types/dashboard'

interface MonthHeatmapProps {
  month: number
  year: number
  monthName: string
  entries: MoodEntry[]
}

interface DayCell {
  date: string
  day: number
  dayOfWeek: number // 0=Mon ... 6=Sun
  weekIndex: number
  entry: MoodEntry | null
  inMonth: boolean
}

const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S']

function buildMonthGrid(
  month: number,
  year: number,
  entryMap: Map<string, MoodEntry>,
): { cells: DayCell[]; weeks: number } {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const totalDays = lastDay.getDate()

  // Day-of-week for the 1st (Mon=0 ... Sun=6)
  const firstDow = firstDay.getDay()
  const firstDowMon = firstDow === 0 ? 6 : firstDow - 1

  const cells: DayCell[] = []

  // Fill leading empty cells
  for (let i = 0; i < firstDowMon; i++) {
    cells.push({
      date: '',
      day: 0,
      dayOfWeek: i,
      weekIndex: 0,
      entry: null,
      inMonth: false,
    })
  }

  // Fill month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d)
    const dow = date.getDay()
    const dowMon = dow === 0 ? 6 : dow - 1
    const cellIndex = firstDowMon + d - 1
    const weekIndex = Math.floor(cellIndex / 7)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    cells.push({
      date: dateStr,
      day: d,
      dayOfWeek: dowMon,
      weekIndex,
      entry: entryMap.get(dateStr) ?? null,
      inMonth: true,
    })
  }

  const weeks = Math.ceil(cells.length / 7)
  return { cells, weeks }
}

export function MonthHeatmap({ month, year, monthName, entries }: MonthHeatmapProps) {
  const { cells, weeks } = useMemo(() => {
    const entryMap = new Map(entries.map((e) => [e.date, e]))
    return buildMonthGrid(month, year, entryMap)
  }, [month, year, entries])

  // Build a 7 (rows) x N (cols) grid
  const grid: (DayCell | null)[][] = Array.from({ length: 7 }, () =>
    Array.from<DayCell | null>({ length: weeks }).fill(null),
  )

  for (const cell of cells) {
    if (cell.inMonth) {
      grid[cell.dayOfWeek][cell.weekIndex] = cell
    }
  }

  return (
    <section aria-label={`Mood heatmap for ${monthName}`}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white md:text-lg">
            Your {monthName} at a Glance
          </h2>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-3 w-4 items-center justify-center text-[10px] text-white/40 sm:h-4"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {Array.from({ length: weeks }, (_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, rowIdx) => {
                  const cell = grid[rowIdx][weekIdx]
                  if (!cell) {
                    return (
                      <div
                        key={rowIdx}
                        className="h-3 w-3 rounded-sm opacity-0 sm:h-4 sm:w-4"
                      />
                    )
                  }

                  const bgColor = cell.entry
                    ? MOOD_COLORS[cell.entry.mood as MoodValue]
                    : undefined

                  return (
                    <div
                      key={rowIdx}
                      className={`h-3 w-3 rounded-sm sm:h-4 sm:w-4 ${
                        cell.entry ? '' : 'bg-white/10'
                      }`}
                      style={bgColor ? { backgroundColor: bgColor } : undefined}
                      title={
                        cell.entry
                          ? `${cell.date}: ${cell.entry.moodLabel}`
                          : `${cell.date}: No entry`
                      }
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
