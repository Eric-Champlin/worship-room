import { useCallback, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { getMoodEntries } from '@/services/mood-storage'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry, MoodValue } from '@/types/dashboard'

interface CalendarHeatmapProps {
  rangeDays: number
}

interface DayCell {
  date: string
  dayOfWeek: number // 0=Mon ... 6=Sun
  weekIndex: number
  entry: MoodEntry | null
}

function buildGrid(rangeDays: number): { cells: DayCell[]; weeks: number; entryMap: Map<string, MoodEntry> } {
  const entries = getMoodEntries()
  const entryMap = new Map(entries.map((e) => [e.date, e]))

  const today = new Date()

  // Start date
  const start = new Date()
  start.setDate(today.getDate() - rangeDays + 1)

  // Align start to Monday (go back to previous Monday)
  const startDow = start.getDay() // 0=Sun
  const mondayOffset = startDow === 0 ? 6 : startDow - 1
  start.setDate(start.getDate() - mondayOffset)

  const rawCells: Omit<DayCell, 'weekIndex'>[] = []
  const current = new Date(start)

  while (current <= today) {
    const dateStr = getLocalDateString(current)
    const dow = current.getDay()
    const dayOfWeek = dow === 0 ? 6 : dow - 1 // Mon=0 ... Sun=6

    rawCells.push({
      date: dateStr,
      dayOfWeek,
      entry: entryMap.get(dateStr) ?? null,
    })

    current.setDate(current.getDate() + 1)
  }

  // Assign weekIndex: increments every time we hit a Monday
  const cells: DayCell[] = []
  let wk = 0
  for (let i = 0; i < rawCells.length; i++) {
    if (i > 0 && rawCells[i].dayOfWeek === 0) {
      wk++
    }
    cells.push({ ...rawCells[i], weekIndex: wk })
  }

  return { cells, weeks: wk + 1, entryMap }
}

function getMonthLabels(cells: DayCell[]): { label: string; weekIndex: number }[] {
  const months: { label: string; weekIndex: number }[] = []
  let lastMonth = -1

  for (const cell of cells) {
    if (cell.dayOfWeek !== 0) continue // only check Mondays
    const d = new Date(cell.date + 'T12:00:00')
    const month = d.getMonth()
    if (month !== lastMonth) {
      lastMonth = month
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        weekIndex: cell.weekIndex,
      })
    }
  }

  return months
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatAriaDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

const DAY_LABELS = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
]

interface TooltipInfo {
  date: string
  left: number
  top: number
}

export function CalendarHeatmap({ rangeDays }: CalendarHeatmapProps) {
  const { cells, weeks } = useMemo(() => buildGrid(rangeDays), [rangeDays])
  const monthLabels = useMemo(() => getMonthLabels(cells), [cells])
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const checkedInCount = cells.filter((c) => c.entry !== null).length
  const totalDays = cells.length

  const hoveredCell = tooltipInfo
    ? cells.find((c) => c.date === tooltipInfo.date) ?? null
    : null

  const getTooltipPosition = useCallback(
    (el: HTMLElement): { left: number; top: number } => {
      const container = containerRef.current
      if (!container) return { left: 0, top: 0 }
      const containerRect = container.getBoundingClientRect()
      const squareRect = el.getBoundingClientRect()
      return {
        left: squareRect.left - containerRect.left + squareRect.width / 2,
        top: squareRect.top - containerRect.top,
      }
    },
    [],
  )

  const handleMouseEnter = useCallback(
    (date: string, e: React.MouseEvent) => {
      const pos = getTooltipPosition(e.currentTarget as HTMLElement)
      setTooltipInfo({ date, ...pos })
    },
    [getTooltipPosition],
  )

  const handleMouseLeave = useCallback(() => {
    setTooltipInfo(null)
  }, [])

  // Mobile: toggle tooltip on tap
  const handleClick = useCallback(
    (date: string, e: React.MouseEvent) => {
      setTooltipInfo((prev) => {
        if (prev?.date === date) return null
        const pos = getTooltipPosition(e.currentTarget as HTMLElement)
        return { date, ...pos }
      })
    },
    [getTooltipPosition],
  )

  const rangeLabel =
    rangeDays <= 30
      ? '30 days'
      : rangeDays <= 90
        ? '90 days'
        : rangeDays <= 180
          ? '6 months'
          : rangeDays <= 365
            ? '1 year'
            : 'all time'

  return (
    <section
      aria-labelledby="heatmap-title"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="heatmap-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Your Mood Calendar
        </h2>
      </div>

      <p className="sr-only">
        {checkedInCount} days with check-ins out of {totalDays} days
      </p>

      <div
        ref={containerRef}
        role="img"
        aria-label={`Mood calendar heatmap for the last ${rangeLabel}`}
        className="relative"
      >
        {/* Month labels */}
        <div
          className="mb-1 flex text-xs text-white/60"
          style={{ paddingLeft: '28px' }}
          aria-hidden="true"
        >
          {monthLabels.map((m, i) => (
            <span
              key={`${m.label}-${i}`}
              className="shrink-0"
              style={{
                width: `${(100 / weeks) * (i < monthLabels.length - 1 ? monthLabels[i + 1].weekIndex - m.weekIndex : weeks - m.weekIndex)}%`,
                minWidth: 0,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex">
          {/* Day labels */}
          <div
            className="mr-1 flex shrink-0 flex-col text-xs text-white/60"
            style={{ width: '24px' }}
            aria-hidden="true"
          >
            {Array.from({ length: 7 }, (_, row) => {
              const dayLabel = DAY_LABELS.find((d) => d.row === row)
              return (
                <div
                  key={row}
                  className="flex h-3 items-center sm:h-4"
                  style={{ marginBottom: '4px' }}
                >
                  <span className="text-[10px] leading-none sm:text-xs">
                    {dayLabel?.label ?? ''}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Heatmap grid — scrollable container */}
          <div
            className="flex-1 overflow-x-auto"
            style={{
              maskImage:
                weeks > 8
                  ? 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
                  : undefined,
              WebkitMaskImage:
                weeks > 8
                  ? 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)'
                  : undefined,
            }}
          >
            <div
              className="grid gap-1"
              style={{
                gridTemplateRows: 'repeat(7, 1fr)',
                gridAutoFlow: 'column',
                gridAutoColumns: 'minmax(0, 1fr)',
                width:
                  weeks > 8
                    ? `${weeks * 20}px`
                    : '100%',
              }}
            >
              {cells.map((cell) => {
                const bgColor = cell.entry
                  ? MOOD_COLORS[cell.entry.mood as MoodValue]
                  : undefined

                return (
                  <div
                    key={cell.date}
                    className={
                      cell.entry
                        ? 'h-3 w-3 rounded-sm transition-[filter] duration-100 hover:brightness-125 motion-reduce:transition-none motion-reduce:hover:brightness-100 sm:h-4 sm:w-4'
                        : 'h-3 w-3 rounded-sm bg-white/[0.04] sm:h-4 sm:w-4'
                    }
                    style={bgColor ? { backgroundColor: bgColor } : undefined}
                    aria-label={`${formatAriaDate(cell.date)}: ${cell.entry?.moodLabel ?? 'No check-in'}`}
                    onMouseEnter={(e) => handleMouseEnter(cell.date, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleClick(cell.date, e)}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Tooltip — positioned above the hovered square */}
        {hoveredCell && tooltipInfo && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-white/15 bg-hero-mid px-3 py-2 text-sm text-white shadow-lg"
            style={{
              left: tooltipInfo.left,
              top: tooltipInfo.top,
              transform: 'translate(-50%, -100%)',
              marginTop: '-8px',
            }}
            role="tooltip"
          >
            <p className="font-medium">{formatTooltipDate(hoveredCell.date)}</p>
            <p className="text-white/70">
              {hoveredCell.entry?.moodLabel ?? 'No check-in'}
            </p>
            {hoveredCell.entry?.text && (
              <p className="mt-1 text-white/50">
                {hoveredCell.entry.text.length > 50
                  ? hoveredCell.entry.text.slice(0, 50) + '...'
                  : hoveredCell.entry.text}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
