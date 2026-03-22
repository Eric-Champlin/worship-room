import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MeditationType } from '@/types/daily-experience'
import {
  getMeditationHistory,
  getMeditationMinutesForWeek,
  getMeditationMinutesForRange,
  getMostPracticedType,
} from '@/services/meditation-storage'
import { getLocalDateString } from '@/utils/date'

interface MeditationHistoryProps {
  rangeDays: number
}

const MEDITATION_TYPE_COLORS: Record<MeditationType, string> = {
  breathing: '#06B6D4',
  soaking: '#A855F7',
  gratitude: '#EC4899',
  acts: '#F59E0B',
  psalm: '#22C55E',
  examen: '#3B82F6',
  'bible-audio': '#6D28D9',
  'guided-prayer': '#8B5CF6',
}

const MEDITATION_TYPE_LABELS: Record<MeditationType, string> = {
  breathing: 'Breathing',
  soaking: 'Soaking',
  gratitude: 'Gratitude',
  acts: 'ACTS',
  psalm: 'Psalms',
  examen: 'Examen',
  'bible-audio': 'Bible Audio',
  'guided-prayer': 'Guided Prayer',
}

const ALL_TYPES: MeditationType[] = [
  'breathing',
  'soaking',
  'gratitude',
  'acts',
  'psalm',
  'examen',
  'bible-audio',
  'guided-prayer',
]

function formatChartDate(dateStr: string, rangeDays: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (rangeDays <= 30) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  color?: string
  payload?: Record<string, unknown>
}

interface MeditationTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function MeditationTooltip({ active, payload, label }: MeditationTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{formatTooltipDate(label ?? '')}</p>
      {payload
        .filter((p) => (p.value ?? 0) > 0)
        .map((p) => (
          <p key={p.dataKey} className="text-white/70">
            <span style={{ color: p.color }}>
              {MEDITATION_TYPE_LABELS[p.dataKey as MeditationType]}
            </span>
            : {p.value} min
          </p>
        ))}
    </div>
  )
}

function getChartHeight(width: number): number {
  if (width < 640) return 200
  if (width <= 1024) return 220
  return 250
}

export function MeditationHistory({ rangeDays }: MeditationHistoryProps) {
  const [chartHeight, setChartHeight] = useState(250)

  useEffect(() => {
    const update = () => setChartHeight(getChartHeight(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const isMobile = chartHeight === 200

  // Compute data
  const allEntries = getMeditationHistory()
  const today = getLocalDateString()
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - rangeDays)
  const rangeStartStr = getLocalDateString(rangeStart)
  const rangeEntries = getMeditationMinutesForRange(rangeStartStr, today)

  // Summary stats
  const thisWeekMinutes = getMeditationMinutesForWeek()

  const now = new Date()
  const monthStart = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1))
  const thisMonthEntries = allEntries.filter((e) => e.date >= monthStart && e.date <= today)
  const thisMonthMinutes = thisMonthEntries.reduce((sum, e) => sum + e.durationMinutes, 0)

  const allTimeMinutes = allEntries.reduce((sum, e) => sum + e.durationMinutes, 0)
  const allTimeSessions = allEntries.length

  // Bar chart data
  const dateMap = new Map<string, Record<string, number>>()
  for (const entry of rangeEntries) {
    const existing = dateMap.get(entry.date) ?? {}
    existing[entry.type] = (existing[entry.type] ?? 0) + entry.durationMinutes
    dateMap.set(entry.date, existing)
  }
  const chartData = Array.from(dateMap.entries())
    .map(([date, types]) => ({ date, ...types }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Types that have data
  const typesWithData = ALL_TYPES.filter((type) =>
    rangeEntries.some((e) => e.type === type),
  )

  // Most practiced
  const mostPracticed = getMostPracticedType(rangeEntries)

  // Tick interval
  const tickInterval = Math.max(1, Math.floor(rangeDays / 6))

  const hasData = rangeEntries.length > 0

  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
      aria-label="Meditation history"
    >
      <h2 className="text-lg font-semibold text-white md:text-xl">
        Meditation History
      </h2>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-white/40">
            This Week
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {thisWeekMinutes} min
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-white/40">
            This Month
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {thisMonthMinutes} min
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-white/40">
            All Time
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {allTimeMinutes} min ({allTimeSessions} session
            {allTimeSessions !== 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Bar chart */}
      {hasData ? (
        <>
          <div
            className="mt-4"
            style={{ height: chartHeight }}
            aria-label="Meditation minutes by day"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, bottom: 5, left: -15 }}
              >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatChartDate(d, rangeDays)}
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.5)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.5)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 30 : 40}
                  label={
                    isMobile
                      ? undefined
                      : {
                          value: 'min',
                          angle: -90,
                          position: 'insideLeft',
                          fill: 'rgba(255,255,255,0.4)',
                          fontSize: 11,
                        }
                  }
                />
                <Tooltip content={<MeditationTooltip />} />
                {typesWithData.map((type) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="meditation"
                    fill={MEDITATION_TYPE_COLORS[type]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {typesWithData.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: MEDITATION_TYPE_COLORS[type] }}
                />
                <span className="text-xs text-white/60">
                  {MEDITATION_TYPE_LABELS[type]}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="relative mt-4">
          <div className="opacity-[0.15]" aria-hidden="true">
            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { date: 'Mon', breathing: 5, soaking: 3 },
                    { date: 'Tue', breathing: 10 },
                    { date: 'Wed', gratitude: 8, acts: 5 },
                    { date: 'Thu', soaking: 12 },
                    { date: 'Fri', breathing: 7, examen: 5 },
                  ]}
                  margin={{ top: 5, right: 5, bottom: 5, left: -15 }}
                >
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={isMobile ? 30 : 40}
                  />
                  <Bar dataKey="breathing" stackId="g" fill={MEDITATION_TYPE_COLORS.breathing} isAnimationActive={false} />
                  <Bar dataKey="soaking" stackId="g" fill={MEDITATION_TYPE_COLORS.soaking} isAnimationActive={false} />
                  <Bar dataKey="gratitude" stackId="g" fill={MEDITATION_TYPE_COLORS.gratitude} isAnimationActive={false} />
                  <Bar dataKey="acts" stackId="g" fill={MEDITATION_TYPE_COLORS.acts} isAnimationActive={false} />
                  <Bar dataKey="examen" stackId="g" fill={MEDITATION_TYPE_COLORS.examen} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-white/50">
              Start a meditation to see your history here
            </p>
          </div>
        </div>
      )}

      {/* Most practiced callout */}
      {mostPracticed && (
        <p className="mt-4 text-sm text-white/60">
          <span
            style={{ color: MEDITATION_TYPE_COLORS[mostPracticed.type] }}
            className="font-medium"
          >
            {MEDITATION_TYPE_LABELS[mostPracticed.type]}
          </span>{' '}
          is your most practiced meditation ({mostPracticed.percentage}% of
          sessions)
        </p>
      )}
    </section>
  )
}
