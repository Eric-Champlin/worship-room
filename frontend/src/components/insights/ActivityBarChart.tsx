import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ActivityBarChartProps {
  activityCounts: Record<string, number>
}

const ACTIVITY_CONFIG = [
  { key: 'mood', name: 'Check-in', fill: '#8B7FA8' },
  { key: 'pray', name: 'Pray', fill: '#6D28D9' },
  { key: 'journal', name: 'Journal', fill: '#2DD4BF' },
  { key: 'meditate', name: 'Meditate', fill: '#8B5CF6' },
  { key: 'listen', name: 'Listen', fill: '#00D4FF' },
  { key: 'prayerWall', name: 'Prayer Wall', fill: '#F39C12' },
]

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/15 bg-hero-mid px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-white/70">{payload[0].value} times</p>
    </div>
  )
}

export function ActivityBarChart({ activityCounts }: ActivityBarChartProps) {
  const chartData = useMemo(
    () =>
      ACTIVITY_CONFIG.map((cfg) => ({
        name: cfg.name,
        count: activityCounts[cfg.key] ?? 0,
        fill: cfg.fill,
      })),
    [activityCounts],
  )

  const summaryText = chartData
    .map((d) => `${d.name}: ${d.count}`)
    .join(', ')

  return (
    <section aria-label={`Activity chart showing ${summaryText}`}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h2 className="text-base font-semibold text-white md:text-lg">
            Your Top Activities
          </h2>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
