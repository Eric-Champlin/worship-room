import { describe, it, expect } from 'vitest'
import { getSkyConfig } from '../gardenTimeOfDay'

describe('getSkyConfig', () => {
  it('returns dawn config for hours 5-7', () => {
    for (const hour of [5, 6, 7]) {
      const config = getSkyConfig(hour, true)
      expect(config.timeOfDay).toBe('dawn')
      expect(config.skyGradientColors).toEqual(['#1E0B3E', '#D97706'])
      expect(config.showSun).toBe(true)
      expect(config.showMoon).toBe(false)
      expect(config.starCount).toBe(0)
      expect(config.fireflyCount).toBe(0)
    }
  })

  it('returns day config for hours 8-16', () => {
    for (const hour of [8, 12, 16]) {
      const config = getSkyConfig(hour, true)
      expect(config.timeOfDay).toBe('day')
      expect(config.skyGradientColors).toEqual(['#0D0620', '#1E0B3E'])
      expect(config.showSun).toBe(true)
      expect(config.showMoon).toBe(false)
      expect(config.starCount).toBe(0)
    }
  })

  it('returns golden config for hours 17-19', () => {
    for (const hour of [17, 18, 19]) {
      const config = getSkyConfig(hour, true)
      expect(config.timeOfDay).toBe('golden')
      expect(config.skyGradientColors).toEqual(['#1E0B3E', '#D97706'])
      expect(config.showSun).toBe(true)
      expect(config.showMoon).toBe(false)
    }
  })

  it('returns dusk config for hours 20-21', () => {
    for (const hour of [20, 21]) {
      const config = getSkyConfig(hour, true)
      expect(config.timeOfDay).toBe('dusk')
      expect(config.skyGradientColors).toEqual(['#0D0620', '#251248'])
      expect(config.showSun).toBe(false)
      expect(config.showMoon).toBe(false)
      expect(config.starCount).toBe(3)
      expect(config.fireflyCount).toBe(0)
    }
  })

  it('returns night config for hours 22-4', () => {
    for (const hour of [22, 23, 0, 1, 2, 3, 4]) {
      const config = getSkyConfig(hour, true)
      expect(config.timeOfDay).toBe('night')
      expect(config.showSun).toBe(false)
      expect(config.showMoon).toBe(true)
      expect(config.starCount).toBe(7)
      expect(config.fireflyCount).toBe(3)
    }
  })

  it('handles hour 0 (midnight) as night', () => {
    const config = getSkyConfig(0, true)
    expect(config.timeOfDay).toBe('night')
    expect(config.showMoon).toBe(true)
  })

  it('handles hour 4 as night', () => {
    const config = getSkyConfig(4, true)
    expect(config.timeOfDay).toBe('night')
  })

  it('handles hour 5 as dawn', () => {
    const config = getSkyConfig(5, true)
    expect(config.timeOfDay).toBe('dawn')
  })

  it('dims gradient when streakActive is false', () => {
    const active = getSkyConfig(12, true)
    const inactive = getSkyConfig(12, false)
    // Inactive colors should be shifted toward #1a1025
    expect(inactive.skyGradientColors[0]).not.toEqual(active.skyGradientColors[0])
    expect(inactive.skyGradientColors[1]).not.toEqual(active.skyGradientColors[1])
    // Sun/moon/star visibility is unchanged
    expect(inactive.showSun).toBe(active.showSun)
    expect(inactive.starCount).toBe(active.starCount)
  })
})
