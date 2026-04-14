import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { MOOD_LABELS } from '@/constants/dashboard/mood'
import type { MoodValue } from '@/types/dashboard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ChartFallback } from '@/components/ui/ChartFallback'

interface ActivityCorrelationsProps {
  hasData: boolean
}

const MOCK_CORRELATION_DATA = [
  { activity: 'Journaling', withActivity: 4.2, withoutActivity: 3.1 },
  { activity: 'Prayer', withActivity: 4.0, withoutActivity: 3.3 },
  { activity: 'Meditation', withActivity: 4.4, withoutActivity: 3.0 },
  { activity: 'Gratitude', withActivity: 4.3, withoutActivity: 3.1 },
  { activity: 'Reading Plan', withActivity: 4.1, withoutActivity: 3.2 },
]

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

interface CorrelationTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
}

function CorrelationTooltip({ active, label, payload }: CorrelationTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/15 bg-hero-mid px-3 py-2 text-sm text-white shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="text-white/70">
          {item.name === 'withActivity' ? 'With activity' : 'Without'}: {MOOD_LABELS[Math.round(item.value) as MoodValue] ?? item.value.toFixed(1)}
        </p>
      ))}
    </div>
  )
}

export function ActivityCorrelations({ hasData }: ActivityCorrelationsProps) {
  return (
    <ErrorBoundary fallback={<ChartFallback />}>
      <ActivityCorrelationsInner hasData={hasData} />
    </ErrorBoundary>
  )
}

function ActivityCorrelationsInner({ hasData }: ActivityCorrelationsProps) {
  return (
    <section
      aria-labelledby="correlations-title"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="correlations-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Activity & Mood
        </h2>
      </div>

      {!hasData ? (
        <p className="py-6 text-center text-sm text-white/60 leading-relaxed md:text-base">
          Check in for a few days to start seeing how your activities connect
          with your mood.
        </p>
      ) : (
        <>
          {/* Legend */}
          <div className="mb-3 flex items-center justify-center gap-6 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: '#2DD4BF' }}
              />
              Days with activity
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: '#6B6185' }}
              />
              Days without
            </span>
          </div>

          <div
            role="img"
            aria-label="Activity and mood correlation chart"
            className="h-[200px] sm:h-[240px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CORRELATION_DATA} barGap={4}>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis
                  dataKey="activity"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(v: number) => MOOD_LABELS[v as MoodValue] ?? ''}
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CorrelationTooltip />} />
                <Bar
                  dataKey="withActivity"
                  fill="#2DD4BF"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="withoutActivity"
                  fill="#6B6185"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-xs text-white/60">
            Based on example data. Real correlations coming soon.
          </p>
        </>
      )}
    </section>
  )
}
