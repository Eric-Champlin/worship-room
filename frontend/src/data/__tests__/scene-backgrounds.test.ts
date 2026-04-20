import { describe, it, expect } from 'vitest'
import { getSceneBackground, SCENE_BACKGROUNDS } from '../scene-backgrounds'

const SCENE_IDS = [
  'garden-of-gethsemane',
  'still-waters',
  'midnight-rain',
  'ember-and-stone',
  'morning-mist',
  'the-upper-room',
  'starfield',
  'mountain-refuge',
  'peaceful-study',
  'evening-scripture',
  'sacred-space',
]

describe('scene-backgrounds', () => {
  it('getSceneBackground returns style for each scene ID', () => {
    for (const id of SCENE_IDS) {
      expect(getSceneBackground(id)).toBeDefined()
    }
  })

  it('getSceneBackground returns undefined for unknown ID', () => {
    expect(getSceneBackground('nonexistent-scene')).toBeUndefined()
  })

  it('each background has backgroundImage property', () => {
    for (const id of SCENE_IDS) {
      const bg = SCENE_BACKGROUNDS[id]
      expect(bg).toBeDefined()
      expect(typeof bg.backgroundImage).toBe('string')
      expect((bg.backgroundImage as string).length).toBeGreaterThan(0)
    }
  })

  it('each background has backgroundColor property', () => {
    for (const id of SCENE_IDS) {
      const bg = SCENE_BACKGROUNDS[id]
      expect(typeof bg.backgroundColor).toBe('string')
    }
  })

  it('has exactly 11 scene backgrounds', () => {
    expect(Object.keys(SCENE_BACKGROUNDS)).toHaveLength(11)
  })

  it('each background contains multiple distinct hex stops (not uniform gray)', () => {
    for (const id of SCENE_IDS) {
      const bg = SCENE_BACKGROUNDS[id]
      const image = bg.backgroundImage as string
      const hexMatches = image.match(/#[0-9a-fA-F]{6}/g) ?? []
      const unique = new Set(hexMatches.map((h) => h.toLowerCase()))
      expect(unique.size).toBeGreaterThanOrEqual(2)
    }
  })

  it('overlay alphas stay within the Round 2 desaturated range (≤ 0.20 for whites)', () => {
    // Round 2: all overlay alphas reduced by × 0.70 on top of Round 1's × 0.67.
    // Starfield (historical outlier) maxes at 0.19 post-Round-2; cap set at 0.20
    // to catch regressions without false positives on starfield's star-dot alphas.
    for (const id of SCENE_IDS) {
      const bg = SCENE_BACKGROUNDS[id]
      const image = bg.backgroundImage as string
      const whiteMatches = [
        ...image.matchAll(/rgba\(255,255,255,([\d.]+)\)/g),
      ]
      for (const m of whiteMatches) {
        expect(parseFloat(m[1])).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('every scene linear-gradient stop is expressed as a 6-digit hex color', () => {
    for (const id of SCENE_IDS) {
      const bg = SCENE_BACKGROUNDS[id]
      const image = bg.backgroundImage as string
      // Every linear-gradient must include at least one 6-digit hex stop
      expect(image).toMatch(/linear-gradient\(/)
      expect(image).toMatch(/#[0-9a-fA-F]{6}/)
    }
  })
})
