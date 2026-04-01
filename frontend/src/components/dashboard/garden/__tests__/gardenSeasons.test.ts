import { describe, it, expect } from 'vitest'
import { getSeasonalOverlay } from '../gardenSeasons'

describe('getSeasonalOverlay', () => {
  it('returns snow config for Advent', () => {
    const config = getSeasonalOverlay('Advent')
    expect(config.showSnow).toBe(true)
    expect(config.showGroundSnow).toBe(false)
    expect(config.showStar).toBe(true)
    expect(config.starBrightness).toBe(0.6)
    expect(config.showWarmGlow).toBe(false)
  })

  it('returns Christmas config', () => {
    const config = getSeasonalOverlay('Christmas')
    expect(config.showSnow).toBe(true)
    expect(config.showGroundSnow).toBe(true)
    expect(config.showStar).toBe(true)
    expect(config.starBrightness).toBe(0.9)
    expect(config.showWarmGlow).toBe(true)
  })

  it('returns Lent desaturation filter', () => {
    const config = getSeasonalOverlay('Lent')
    expect(config.cssFilter).toBe('saturate(0.7)')
    expect(config.foliageSaturation).toBe(0.7)
    expect(config.showSnow).toBe(false)
    expect(config.showFlowers).toBe(false)
  })

  it('returns Holy Week darker config', () => {
    const config = getSeasonalOverlay('Holy Week')
    expect(config.cssFilter).toBe('saturate(0.7) brightness(0.85)')
    expect(config.showCross).toBe(true)
    expect(config.foliageSaturation).toBe(0.7)
  })

  it('returns Easter vibrant config', () => {
    const config = getSeasonalOverlay('Easter')
    expect(config.showFlowers).toBe(true)
    expect(config.cssFilter).toBe('saturate(1.2)')
    expect(config.foliageSaturation).toBe(1.0)
  })

  it('returns Pentecost warm glow', () => {
    const config = getSeasonalOverlay('Pentecost')
    expect(config.showWarmGlow).toBe(true)
    expect(config.showSnow).toBe(false)
    expect(config.showFlowers).toBe(false)
  })

  it('returns empty config for Ordinary Time', () => {
    const config = getSeasonalOverlay('Ordinary Time')
    expect(config.showSnow).toBe(false)
    expect(config.showGroundSnow).toBe(false)
    expect(config.showStar).toBe(false)
    expect(config.showFlowers).toBe(false)
    expect(config.showCross).toBe(false)
    expect(config.showWarmGlow).toBe(false)
    expect(config.cssFilter).toBeUndefined()
    expect(config.foliageSaturation).toBe(1.0)
  })

  it('handles Epiphany as Christmas variant', () => {
    const config = getSeasonalOverlay('Epiphany')
    expect(config.showStar).toBe(true)
    expect(config.starBrightness).toBe(0.9)
    expect(config.showWarmGlow).toBe(true)
    expect(config.showSnow).toBe(false)
    expect(config.showGroundSnow).toBe(false)
  })
})
