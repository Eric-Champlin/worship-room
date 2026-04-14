import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getIntensity } from '@/lib/heatmap'
import { BIBLE_BOOKS } from '@/constants/bible'
import type { DailyActivity, HeatmapIntensity } from '@/types/heatmap'

// --- Constants ---

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS_FULL = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const DAY_LABELS_SHORT = ['', 'M', '', 'W', '', 'F', '']

const INTENSITY_CLASSES: Record<HeatmapIntensity, string> = {
  0: 'bg-white/5',
  1: 'bg-primary/30',
  2: 'bg-primary/50',
  3: 'bg-primary/70',
  4: 'bg-primary/90',
}

// --- Types ---

interface HeatmapCell {
  date: string
  activity: DailyActivity | null // null = padding cell (outside data range)
  isToday: boolean
  dayOfWeek: number // 0=Sun ... 6=Sat
  column: number
}

interface TooltipData {
  date: string
  chapterCount: number
  chapters: Array<{ book: string; chapter: number }>
  rect: DOMRect
}

// --- Props ---

export interface ReadingHeatmapProps {
  dailyActivity: DailyActivity[]
  currentStreak: number
  activeDays: number
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const BOOK_NAME_MAP = new Map(BIBLE_BOOKS.map((b) => [b.slug, b.name]))

function formatBookName(slug: string): string {
  return BOOK_NAME_MAP.get(slug) ?? slug
}

/** Build the grid of cells: 7 rows × up to 53 columns. */
function buildGrid(dailyActivity: DailyActivity[], today: string): { cells: HeatmapCell[][]; monthLabels: Array<{ label: string; column: number }> } {
  // Build a date→activity lookup
  const activityMap = new Map<string, DailyActivity>()
  for (const day of dailyActivity) {
    activityMap.set(day.date, day)
  }

  const startDate = dailyActivity[0]?.date
  if (!startDate) return { cells: [], monthLabels: [] }

  // Find the Sunday on or before the start date
  const startD = new Date(startDate + 'T00:00:00')
  const startDow = startD.getDay() // 0=Sun
  const gridStart = new Date(startD)
  gridStart.setDate(gridStart.getDate() - startDow)

  // Find the Saturday on or after today
  const endD = new Date(today + 'T00:00:00')
  const endDow = endD.getDay()
  const gridEnd = new Date(endD)
  gridEnd.setDate(gridEnd.getDate() + (6 - endDow))

  // Calculate total columns (weeks)
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1
  const totalColumns = Math.ceil(totalDays / 7)

  // Build cells row by row (7 rows × totalColumns columns)
  const cells: HeatmapCell[][] = []
  const monthLabels: Array<{ label: string; column: number }> = []
  const seenMonths = new Set<string>()

  for (let row = 0; row < 7; row++) {
    const rowCells: HeatmapCell[] = []
    for (let col = 0; col < totalColumns; col++) {
      const dayOffset = col * 7 + row
      const cellDate = new Date(gridStart)
      cellDate.setDate(cellDate.getDate() + dayOffset)

      const y = cellDate.getFullYear()
      const m = String(cellDate.getMonth() + 1).padStart(2, '0')
      const d = String(cellDate.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`

      const isInRange = dateStr >= startDate && dateStr <= today
      const isToday = dateStr === today

      // Track month labels (first row only)
      if (row === 0) {
        const monthKey = `${y}-${m}`
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey)
          monthLabels.push({ label: MONTH_LABELS[cellDate.getMonth()], column: col })
        }
      }

      rowCells.push({
        date: dateStr,
        activity: isInRange ? (activityMap.get(dateStr) ?? { date: dateStr, chapterCount: 0, chapters: [] }) : null,
        isToday,
        dayOfWeek: row,
        column: col,
      })
    }
    cells.push(rowCells)
  }

  return { cells, monthLabels }
}

// --- Component ---

export function ReadingHeatmap({ dailyActivity, currentStreak, activeDays }: ReadingHeatmapProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = dailyActivity[dailyActivity.length - 1]?.date ?? ''
  const allEmpty = dailyActivity.every((d) => d.chapterCount === 0)

  const { cells, monthLabels } = useMemo(() => buildGrid(dailyActivity, today), [dailyActivity, today])
  const totalColumns = cells[0]?.length ?? 0

  // Scroll to the right on mount (show most recent data)
  useEffect(() => {
    const el = containerRef.current
    if (el) {
      el.scrollLeft = el.scrollWidth
    }
  }, [cells])

  // Close tooltip on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-heatmap-cell]') && !target.closest('[data-heatmap-tooltip]')) {
        setTooltip(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleCellInteraction = useCallback(
    (cell: HeatmapCell, rect: DOMRect) => {
      if (cell.isToday) {
        navigate('/bible')
        return
      }
      if (!cell.activity) return

      setTooltip({
        date: cell.date,
        chapterCount: cell.activity.chapterCount,
        chapters: cell.activity.chapters,
        rect,
      })
    },
    [navigate],
  )

  const handleCellHover = useCallback(
    (cell: HeatmapCell, rect: DOMRect) => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
      if (!cell.activity) return
      setTooltip({
        date: cell.date,
        chapterCount: cell.activity.chapterCount,
        chapters: cell.activity.chapters,
        rect,
      })
    },
    [],
  )

  const handleCellLeave = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltip(null), 200)
  }, [])

  return (
    <section aria-label="Reading heatmap">
      {/* Summary */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm text-white">
          You've read on <strong>{activeDays}</strong> of the past 365 days
        </p>
        {currentStreak > 0 && (
          <p className="text-sm text-white/60">Current streak: {currentStreak} days</p>
        )}
      </div>

      {allEmpty ? (
        <p className="text-sm text-white/60">Your reading history will show up here as you read.</p>
      ) : (
        <>
          {/* Heatmap grid */}
          <div
            ref={containerRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="inline-grid gap-[2px]"
              style={{ gridTemplateColumns: `24px repeat(${totalColumns}, 1fr)` }}
              role="grid"
              aria-label="Reading activity grid"
            >
              {/* Month labels row */}
              <div /> {/* empty corner cell */}
              {Array.from({ length: totalColumns }, (_, col) => {
                const monthLabel = monthLabels.find((m) => m.column === col)
                return (
                  <div key={`month-${col}`} className="text-[10px] text-white/40 leading-none pb-0.5">
                    {monthLabel?.label ?? ''}
                  </div>
                )
              })}

              {/* Day rows */}
              {cells.map((row, rowIndex) => (
                <React.Fragment key={`row-${rowIndex}`}>
                  {/* Day label */}
                  <div className="flex items-center text-[10px] text-white/40 leading-none pr-1">
                    <span className="hidden sm:inline">{DAY_LABELS_FULL[rowIndex]}</span>
                    <span className="sm:hidden">{DAY_LABELS_SHORT[rowIndex]}</span>
                  </div>

                  {/* Cells for this row */}
                  {row.map((cell) => {
                    if (!cell.activity) {
                      // Padding cell (outside data range)
                      return (
                        <div
                          key={cell.date}
                          className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3"
                        />
                      )
                    }

                    const intensity = getIntensity(cell.activity.chapterCount)

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        data-heatmap-cell
                        role="gridcell"
                        aria-label={
                          cell.isToday
                            ? 'Today — tap to open the Bible'
                            : `${formatDate(cell.date)}: ${cell.activity.chapterCount} chapters read`
                        }
                        tabIndex={0}
                        className={cn(
                          'w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 rounded-[1px] sm:rounded-[2px] transition-opacity motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50',
                          INTENSITY_CLASSES[intensity],
                          cell.isToday && 'ring-2 ring-white/50',
                        )}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          handleCellInteraction(cell, rect)
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          handleCellHover(cell, rect)
                        }}
                        onMouseLeave={handleCellLeave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            const rect = e.currentTarget.getBoundingClientRect()
                            handleCellInteraction(cell, rect)
                          }
                        }}
                      />
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs text-white/50">Less</span>
            {([0, 1, 2, 3, 4] as HeatmapIntensity[]).map((level) => (
              <div
                key={level}
                className={cn('w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px]', INTENSITY_CLASSES[level])}
              />
            ))}
            <span className="text-xs text-white/50">More</span>
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && (
        <HeatmapTooltip
          date={tooltip.date}
          chapterCount={tooltip.chapterCount}
          chapters={tooltip.chapters}
          rect={tooltip.rect}
        />
      )}
    </section>
  )
}

// --- Tooltip Sub-Component ---

function HeatmapTooltip({
  date,
  chapterCount,
  chapters,
  rect,
}: {
  date: string
  chapterCount: number
  chapters: Array<{ book: string; chapter: number }>
  rect: DOMRect
}) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const el = tooltipRef.current
    if (!el) return

    const tooltipRect = el.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Position above the cell
    let top = rect.top - tooltipRect.height - 8
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2

    // Clamp to viewport
    if (top < 8) top = rect.bottom + 8 // below if no room above
    if (left < 8) left = 8
    if (left + tooltipRect.width > viewportWidth - 8) left = viewportWidth - tooltipRect.width - 8
    if (top + tooltipRect.height > viewportHeight - 8) top = viewportHeight - tooltipRect.height - 8

    setPosition({ top, left })
  }, [rect])

  const chapterSummary =
    chapterCount === 0
      ? 'No reading'
      : chapters
          .slice(0, 5)
          .map((c) => `${formatBookName(c.book)} ${c.chapter}`)
          .join(', ') + (chapters.length > 5 ? `, +${chapters.length - 5} more` : '')

  return (
    <div
      ref={tooltipRef}
      data-heatmap-tooltip
      className="fixed z-50 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm"
      style={{ top: position.top, left: position.left }}
      role="tooltip"
    >
      <p className="font-medium">{formatDate(date)}</p>
      <p className="mt-0.5 text-white/60">{chapterSummary}</p>
    </div>
  )
}
