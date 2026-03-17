import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMoodChartData } from '@/hooks/useMoodChartData';
import type { MoodChartDataPoint } from '@/hooks/useMoodChartData';

const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Heavy',
  3: 'Okay',
  4: 'Good',
  5: 'Thriving',
};

function formatMoodLabel(value: number): string {
  return MOOD_LABELS[value] ?? '';
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: MoodChartDataPoint;
}

function CustomDot({ cx, cy, payload }: DotProps) {
  if (!payload?.color || cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.color}
      className="transition-transform duration-150 motion-reduce:transition-none"
    />
  );
}

function CustomActiveDot({ cx, cy, payload }: DotProps) {
  if (!payload?.color || cx == null || cy == null) return null;
  return (
    <g>
      {/* Invisible larger circle for 44px touch target */}
      <circle cx={cx} cy={cy} r={22} fill="transparent" />
      <circle cx={cx} cy={cy} r={7} fill={payload.color} />
    </g>
  );
}

interface TooltipPayloadItem {
  payload?: MoodChartDataPoint;
}

interface MoodTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function MoodTooltip({ active, payload }: MoodTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data?.mood || !data.moodLabel) return null;

  return (
    <div className="rounded-lg border border-white/15 bg-[#1E0B3E] px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-medium">{formatTooltipDate(data.date)}</p>
      <p className="text-white/70">{data.moodLabel}</p>
    </div>
  );
}

const EMPTY_STATE_DATA: MoodChartDataPoint[] = [
  { date: '', dayLabel: 'Mon', mood: 3, moodLabel: 'Okay', color: '#8B7FA8' },
  { date: '', dayLabel: 'Tue', mood: 4, moodLabel: 'Good', color: '#2DD4BF' },
  { date: '', dayLabel: 'Wed', mood: 2, moodLabel: 'Heavy', color: '#C2703E' },
  { date: '', dayLabel: 'Thu', mood: 5, moodLabel: 'Thriving', color: '#34D399' },
  { date: '', dayLabel: 'Fri', mood: 3, moodLabel: 'Okay', color: '#8B7FA8' },
  { date: '', dayLabel: 'Sat', mood: 4, moodLabel: 'Good', color: '#2DD4BF' },
  { date: '', dayLabel: 'Sun', mood: 5, moodLabel: 'Thriving', color: '#34D399' },
];

function MoodChartEmptyState() {
  return (
    <div className="relative">
      <div className="opacity-[0.15]" aria-hidden="true">
        <div className="h-[160px] sm:h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={EMPTY_STATE_DATA}
              margin={{ top: 5, right: 5, bottom: 5, left: -15 }}
            >
              <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                axisLine={false}
                tickLine={false}
                hide
              />
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
        <p className="text-sm text-white/50">Your mood journey starts today</p>
      </div>
    </div>
  );
}

export function MoodChart() {
  const data = useMoodChartData(7);
  const hasData = data.some((d) => d.mood !== null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!hasData) {
    return <MoodChartEmptyState />;
  }

  const checkedInCount = data.filter((d) => d.mood !== null).length;
  const moodValues = data.filter((d) => d.mood !== null).map((d) => d.mood!);
  const averageMood = Math.round(
    moodValues.reduce((a, b) => a + b, 0) / moodValues.length,
  );
  const averageMoodLabel = MOOD_LABELS[averageMood] ?? 'Okay';

  return (
    <div>
      <p className="sr-only">
        Over the last 7 days, you checked in {checkedInCount} time
        {checkedInCount !== 1 ? 's' : ''}. Average mood: {averageMoodLabel}.
      </p>

      <div
        aria-label="Your mood over the last 7 days"
        role="img"
        className="h-[160px] sm:h-[180px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, bottom: 5, left: isMobile ? -15 : 0 }}
          >
            <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickFormatter={formatMoodLabel}
              tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              hide={isMobile}
              width={80}
            />
            <Tooltip content={<MoodTooltip />} />
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
