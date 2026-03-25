import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useMoodChartData } from '@/hooks/useMoodChartData'
import { MOOD_LABELS } from '@/constants/dashboard/mood'
import type { MoodChartDataPoint } from '@/hooks/useMoodChartData'
import type { MoodLabel, MoodValue } from '@/types/dashboard'

interface MoodTrendChartProps {
  rangeDays: number
}

function formatMoodLabel(value: number): string {
  return MOOD_LABELS[value as MoodValue] ?? ''
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatXAxisTick(dateStr: string, rangeDays: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (rangeDays <= 30) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short' })
}

interface ExtendedDataPoint extends MoodChartDataPoint {
  movingAvg: number | null
}

export function computeMovingAverage(
  data: MoodChartDataPoint[],
  windowSize: number = 7,
): ExtendedDataPoint[] {
  return data.map((point, i) => {
    const windowStart = Math.max(0, i - windowSize + 1)
    const window = data.slice(windowStart, i + 1)
    const validMoods = window
      .filter((p) => p.mood !== null)
      .map((p) => p.mood!)

    const movingAvg =
      validMoods.length > 0
        ? Math.round((validMoods.reduce((a, b) => a + b, 0) / validMoods.length) * 100) / 100
        : null

    return { ...point, movingAvg }
  })
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: MoodChartDataPoint
}

function CustomDot({ cx, cy, payload }: DotProps) {
  if (!payload?.color || cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={4} fill={payload.color} />
}

function CustomActiveDot({ cx, cy, payload }: DotProps) {
  if (!payload?.color || cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={22} fill="transparent" />
      <circle cx={cx} cy={cy} r={6} fill={payload.color} />
    </g>
  )
}

function EveningDot({ cx, cy, payload }: DotProps) {
  if (!payload?.eveningColor || cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={payload.eveningColor} />
      <circle cx={cx} cy={cy} r={5} fill="none" stroke="white" strokeWidth={2} />
    </g>
  )
}

/** Props shape passed by Recharts <Customized> to its component. */
interface RechartsCustomizedProps {
  formattedGraphicalItems?: {
    props?: { points?: RechartsPoint[] }
  }[]
}

interface RechartsPoint {
  x: number
  y: number
  payload?: MoodChartDataPoint
}

function ConnectingLines(props: RechartsCustomizedProps) {
  const items = props.formattedGraphicalItems
  if (!items || items.length < 2) return null

  const morningPoints = items[0]?.props?.points
  const eveningPoints = items[1]?.props?.points
  if (!morningPoints || !eveningPoints) return null

  return (
    <g>
      {morningPoints.map((mp: RechartsPoint, i: number) => {
        const ep = eveningPoints[i]
        if (!mp?.payload || !ep) return null
        if (mp.payload.mood == null || mp.payload.eveningMood == null) return null
        if (!Number.isFinite(mp.y) || !Number.isFinite(ep.y)) return null
        return (
          <line
            key={i}
            x1={mp.x}
            y1={mp.y}
            x2={ep.x}
            y2={ep.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
        )
      })}
    </g>
  )
}

interface TooltipPayloadItem {
  payload?: ExtendedDataPoint
}

interface MoodTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function ChartTooltip({ active, payload }: MoodTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data?.mood || !data.moodLabel) return null

  return (
    <div className="rounded-lg border border-white/10 bg-[#1a0f2e] px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{formatTooltipDate(data.date)}</p>
      <p className="text-white/70">{data.moodLabel}</p>
      {data.movingAvg !== null && data.movingAvg !== undefined && (
        <p className="text-white/50">
          7-day avg: {MOOD_LABELS[Math.round(data.movingAvg) as MoodValue] ?? data.movingAvg.toFixed(1)}
        </p>
      )}
    </div>
  )
}

const EMPTY_STATE_DATA: MoodChartDataPoint[] = Array.from({ length: 14 }, (_, i) => {
  const moods = [3, 4, 2, 5, 3, 4, 4, 3, 5, 4, 2, 3, 4, 5]
  const labels: MoodLabel[] = [
    'Okay', 'Good', 'Heavy', 'Thriving', 'Okay', 'Good', 'Good',
    'Okay', 'Thriving', 'Good', 'Heavy', 'Okay', 'Good', 'Thriving',
  ]
  const colors = ['#8B7FA8', '#2DD4BF', '#C2703E', '#34D399', '#8B7FA8', '#2DD4BF', '#2DD4BF', '#8B7FA8', '#34D399', '#2DD4BF', '#C2703E', '#8B7FA8', '#2DD4BF', '#34D399']
  return {
    date: '',
    dayLabel: `D${i + 1}`,
    mood: moods[i],
    moodLabel: labels[i],
    color: colors[i],
    eveningMood: null,
    eveningMoodLabel: null,
    eveningColor: null,
  }
})

function MoodTrendEmptyState() {
  return (
    <div className="relative">
      <div className="opacity-[0.15]" aria-hidden="true">
        <div className="h-[220px] sm:h-[250px] lg:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={EMPTY_STATE_DATA}
              margin={{ top: 5, right: 5, bottom: 5, left: -15 }}
            >
              <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} hide axisLine={false} tickLine={false} />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={<CustomDot />}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-white/50">
          Start checking in to see your mood trend
        </p>
      </div>
    </div>
  )
}

export function MoodTrendChart({ rangeDays }: MoodTrendChartProps) {
  const rawData = useMoodChartData(rangeDays)
  const hasData = rawData.some((d) => d.mood !== null)
  const [showAverage, setShowAverage] = useState(false)

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 639px)').matches
  })

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const data = computeMovingAverage(rawData)

  const checkedInCount = data.filter((d) => d.mood !== null).length
  const moodValues = data.filter((d) => d.mood !== null).map((d) => d.mood!)
  const averageMood =
    moodValues.length > 0
      ? Math.round(moodValues.reduce((a, b) => a + b, 0) / moodValues.length)
      : 3
  const averageMoodLabel = MOOD_LABELS[averageMood as MoodValue] ?? 'Okay'

  const tickInterval = Math.max(1, Math.floor(rangeDays / 6))

  return (
    <section
      aria-labelledby="trend-title"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h2
            id="trend-title"
            className="text-base font-semibold text-white md:text-lg"
          >
            Mood Over Time
          </h2>
        </div>

        <button
          type="button"
          aria-pressed={showAverage}
          onClick={() => setShowAverage((prev) => !prev)}
          className={
            showAverage
              ? 'rounded-full border border-purple-500/30 bg-purple-600/30 px-3 py-1 text-xs text-white transition-colors duration-150 motion-reduce:transition-none'
              : 'rounded-full border border-white/15 px-3 py-1 text-xs text-white/50 transition-colors duration-150 hover:text-white/70 motion-reduce:transition-none'
          }
        >
          7-day average
        </button>
      </div>

      {!hasData ? (
        <MoodTrendEmptyState />
      ) : (
        <div>
          <p className="sr-only">
            {checkedInCount} check-ins over {rangeDays} days. Average mood:{' '}
            {averageMoodLabel}.
          </p>

          <div
            role="img"
            aria-label={`Your mood trend over the last ${rangeDays} days`}
            className="h-[220px] sm:h-[250px] lg:h-[280px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 5,
                  bottom: 5,
                  left: isMobile ? -15 : 0,
                }}
              >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => formatXAxisTick(v, rangeDays)}
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={formatMoodLabel}
                  tick={{
                    fill: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                  hide={isMobile}
                  width={80}
                />
                <Tooltip content={<ChartTooltip />} />
                <Customized component={ConnectingLines} />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={<CustomDot />}
                  activeDot={<CustomActiveDot />}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="eveningMood"
                  stroke="rgba(139, 92, 246, 0.3)"
                  strokeWidth={0}
                  connectNulls={false}
                  dot={<EveningDot />}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {showAverage && (
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="rgba(139, 92, 246, 0.4)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    connectNulls={true}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}
