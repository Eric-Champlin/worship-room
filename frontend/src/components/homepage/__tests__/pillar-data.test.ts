import { describe, it, expect } from 'vitest'
import { PILLARS, ACCENT_CLASSES } from '../pillar-data'

describe('pillar-data', () => {
  it('PILLARS has 3 entries', () => {
    expect(PILLARS).toHaveLength(3)
  })

  it('Healing has 6 features', () => {
    expect(PILLARS[0].features).toHaveLength(6)
  })

  it('Growth has 5 features', () => {
    expect(PILLARS[1].features).toHaveLength(5)
  })

  it('Community has 3 features', () => {
    expect(PILLARS[2].features).toHaveLength(3)
  })

  it('all features have non-empty name, description, and previewKey', () => {
    for (const pillar of PILLARS) {
      for (const feature of pillar.features) {
        expect(feature.name).toBeTruthy()
        expect(feature.description).toBeTruthy()
        expect(feature.previewKey).toBeTruthy()
      }
    }
  })

  it('ACCENT_CLASSES has purple, emerald, and amber keys', () => {
    expect(ACCENT_CLASSES).toHaveProperty('purple')
    expect(ACCENT_CLASSES).toHaveProperty('emerald')
    expect(ACCENT_CLASSES).toHaveProperty('amber')
  })

  it('each pillar has correct glowVariant', () => {
    expect(PILLARS[0].glowVariant).toBe('left')
    expect(PILLARS[1].glowVariant).toBe('right')
    expect(PILLARS[2].glowVariant).toBe('center')
  })
})
