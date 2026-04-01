export interface SeasonalOverlayConfig {
  seasonName: string
  cssFilter?: string
  showSnow: boolean
  showGroundSnow: boolean
  showStar: boolean
  starBrightness: number // 0-1
  showFlowers: boolean
  showCross: boolean
  showWarmGlow: boolean
  foliageSaturation: number // 1.0 default
}

const SEASON_CONFIGS: Record<string, SeasonalOverlayConfig> = {
  Advent: {
    seasonName: 'Advent',
    showSnow: true,
    showGroundSnow: false,
    showStar: true,
    starBrightness: 0.6,
    showFlowers: false,
    showCross: false,
    showWarmGlow: false,
    foliageSaturation: 1.0,
  },
  Christmas: {
    seasonName: 'Christmas',
    showSnow: true,
    showGroundSnow: true,
    showStar: true,
    starBrightness: 0.9,
    showFlowers: false,
    showCross: false,
    showWarmGlow: true,
    foliageSaturation: 1.0,
  },
  Epiphany: {
    seasonName: 'Epiphany',
    showSnow: false,
    showGroundSnow: false,
    showStar: true,
    starBrightness: 0.9,
    showFlowers: false,
    showCross: false,
    showWarmGlow: true,
    foliageSaturation: 1.0,
  },
  Lent: {
    seasonName: 'Lent',
    cssFilter: 'saturate(0.7)',
    showSnow: false,
    showGroundSnow: false,
    showStar: false,
    starBrightness: 0,
    showFlowers: false,
    showCross: false,
    showWarmGlow: false,
    foliageSaturation: 0.7,
  },
  'Holy Week': {
    seasonName: 'Holy Week',
    cssFilter: 'saturate(0.7) brightness(0.85)',
    showSnow: false,
    showGroundSnow: false,
    showStar: false,
    starBrightness: 0,
    showFlowers: false,
    showCross: true,
    showWarmGlow: false,
    foliageSaturation: 0.7,
  },
  Easter: {
    seasonName: 'Easter',
    cssFilter: 'saturate(1.2)',
    showSnow: false,
    showGroundSnow: false,
    showStar: false,
    starBrightness: 0,
    showFlowers: true,
    showCross: false,
    showWarmGlow: false,
    foliageSaturation: 1.0,
  },
  Pentecost: {
    seasonName: 'Pentecost',
    showSnow: false,
    showGroundSnow: false,
    showStar: false,
    starBrightness: 0,
    showFlowers: false,
    showCross: false,
    showWarmGlow: true,
    foliageSaturation: 1.0,
  },
  'Ordinary Time': {
    seasonName: 'Ordinary Time',
    showSnow: false,
    showGroundSnow: false,
    showStar: false,
    starBrightness: 0,
    showFlowers: false,
    showCross: false,
    showWarmGlow: false,
    foliageSaturation: 1.0,
  },
}

export function getSeasonalOverlay(seasonName: string): SeasonalOverlayConfig {
  return SEASON_CONFIGS[seasonName] ?? SEASON_CONFIGS['Ordinary Time']
}
