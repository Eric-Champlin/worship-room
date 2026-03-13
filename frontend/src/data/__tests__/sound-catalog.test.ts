import { describe, it, expect } from 'vitest'
import { SOUND_CATALOG, SOUND_CATEGORIES } from '../sound-catalog'

describe('SOUND_CATALOG', () => {
  it('has exactly 24 sounds', () => {
    expect(SOUND_CATALOG).toHaveLength(24)
  })

  it('each sound has all required fields', () => {
    for (const sound of SOUND_CATALOG) {
      expect(sound.id).toBeTruthy()
      expect(sound.name).toBeTruthy()
      expect(sound.category).toBeTruthy()
      expect(sound.lucideIcon).toBeTruthy()
      expect(sound.filename).toBeTruthy()
      expect(sound.loopDurationMs).toBeGreaterThan(0)
      expect(sound.tags.mood.length).toBeGreaterThanOrEqual(1)
      expect(sound.tags.activity.length).toBeGreaterThanOrEqual(1)
      expect(sound.tags.intensity).toBeTruthy()
    }
  })

  it('has correct category counts: Nature 7, Environments 6, Spiritual 5, Instruments 6', () => {
    const counts = { nature: 0, environments: 0, spiritual: 0, instruments: 0 }
    for (const sound of SOUND_CATALOG) {
      counts[sound.category]++
    }
    expect(counts.nature).toBe(7)
    expect(counts.environments).toBe(6)
    expect(counts.spiritual).toBe(5)
    expect(counts.instruments).toBe(6)
  })

  it('has all unique sound IDs', () => {
    const ids = SOUND_CATALOG.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all filenames end in .mp3', () => {
    for (const sound of SOUND_CATALOG) {
      expect(sound.filename).toMatch(/\.mp3$/)
    }
  })
})

describe('SOUND_CATEGORIES', () => {
  it('has exactly 4 groups in order: nature, environments, spiritual, instruments', () => {
    expect(SOUND_CATEGORIES).toHaveLength(4)
    expect(SOUND_CATEGORIES.map((g) => g.category)).toEqual([
      'nature',
      'environments',
      'spiritual',
      'instruments',
    ])
  })

  it('groups have correct labels', () => {
    expect(SOUND_CATEGORIES.map((g) => g.label)).toEqual([
      'Nature',
      'Environments',
      'Spiritual',
      'Instruments',
    ])
  })

  it('total sounds across all groups equals 24', () => {
    const total = SOUND_CATEGORIES.reduce((sum, g) => sum + g.sounds.length, 0)
    expect(total).toBe(24)
  })
})
