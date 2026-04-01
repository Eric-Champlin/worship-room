export type TimeOfDay = 'dawn' | 'day' | 'golden' | 'dusk' | 'night'

export interface SkyConfig {
  timeOfDay: TimeOfDay
  skyGradientColors: [string, string] // [top, bottom] for linearGradient stops
  showSun: boolean
  showMoon: boolean
  starCount: number // 0, 2-3, or 5-8
  fireflyCount: number // 0 or 2-4
}

interface TimeRange {
  timeOfDay: TimeOfDay
  activeColors: [string, string]
  showSun: boolean
  showMoon: boolean
  starCount: number
  fireflyCount: number
}

const TIME_RANGES: TimeRange[] = [
  // Dawn: 5-7
  {
    timeOfDay: 'dawn',
    activeColors: ['#1E0B3E', '#D97706'],
    showSun: true,
    showMoon: false,
    starCount: 0,
    fireflyCount: 0,
  },
  // Day: 8-16
  {
    timeOfDay: 'day',
    activeColors: ['#0D0620', '#1E0B3E'],
    showSun: true,
    showMoon: false,
    starCount: 0,
    fireflyCount: 0,
  },
  // Golden: 17-19
  {
    timeOfDay: 'golden',
    activeColors: ['#1E0B3E', '#D97706'],
    showSun: true,
    showMoon: false,
    starCount: 0,
    fireflyCount: 0,
  },
  // Dusk: 20-21
  {
    timeOfDay: 'dusk',
    activeColors: ['#0D0620', '#251248'],
    showSun: false,
    showMoon: false,
    starCount: 3,
    fireflyCount: 0,
  },
  // Night: 22-4
  {
    timeOfDay: 'night',
    activeColors: ['#050210', '#0D0620'],
    showSun: false,
    showMoon: true,
    starCount: 7,
    fireflyCount: 3,
  },
]

function getTimeRange(hour: number): TimeRange {
  if (hour >= 5 && hour <= 7) return TIME_RANGES[0] // dawn
  if (hour >= 8 && hour <= 16) return TIME_RANGES[1] // day
  if (hour >= 17 && hour <= 19) return TIME_RANGES[2] // golden
  if (hour >= 20 && hour <= 21) return TIME_RANGES[3] // dusk
  return TIME_RANGES[4] // night (22-4)
}

// Dim a hex color by blending toward the inactive base (#1a1025)
function dimColor(hex: string, amount: number = 0.3): string {
  const base = { r: 0x1a, g: 0x10, b: 0x25 }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const blend = (c: number, t: number) => Math.round(c + (t - c) * amount)
  const rr = blend(r, base.r).toString(16).padStart(2, '0')
  const gg = blend(g, base.g).toString(16).padStart(2, '0')
  const bb = blend(b, base.b).toString(16).padStart(2, '0')
  return `#${rr}${gg}${bb}`
}

export function getSkyConfig(hour: number, streakActive: boolean): SkyConfig {
  const range = getTimeRange(hour)

  const skyGradientColors: [string, string] = streakActive
    ? range.activeColors
    : [dimColor(range.activeColors[0]), dimColor(range.activeColors[1])]

  return {
    timeOfDay: range.timeOfDay,
    skyGradientColors,
    showSun: range.showSun,
    showMoon: range.showMoon,
    starCount: range.starCount,
    fireflyCount: range.fireflyCount,
  }
}
