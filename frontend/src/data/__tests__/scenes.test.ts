import { describe, it, expect } from 'vitest'
import { SCENE_PRESETS, FEATURED_SCENE_IDS, SCENE_BY_ID } from '../scenes'
import { SOUND_BY_ID } from '../sound-catalog'

describe('SCENE_PRESETS', () => {
  it('has exactly 8 scenes', () => {
    expect(SCENE_PRESETS).toHaveLength(8)
  })

  it('each scene has all required fields', () => {
    for (const scene of SCENE_PRESETS) {
      expect(scene.id).toBeTruthy()
      expect(scene.name).toBeTruthy()
      expect(scene.description).toBeTruthy()
      expect(scene.artworkFilename).toBeTruthy()
      expect(scene.sounds.length).toBeGreaterThanOrEqual(3)
      expect(scene.tags.mood.length).toBeGreaterThanOrEqual(1)
      expect(scene.tags.activity.length).toBeGreaterThanOrEqual(1)
      expect(scene.tags.intensity).toBeTruthy()
      expect(scene.animationCategory).toBeTruthy()
    }
  })

  it('all soundIds in every scene exist in the sound catalog', () => {
    for (const scene of SCENE_PRESETS) {
      for (const { soundId } of scene.sounds) {
        expect(
          SOUND_BY_ID.has(soundId),
          `Scene "${scene.name}" references unknown soundId "${soundId}"`,
        ).toBe(true)
      }
    }
  })

  it('all volumes are in 0-1 range', () => {
    for (const scene of SCENE_PRESETS) {
      for (const { soundId, volume } of scene.sounds) {
        expect(
          volume,
          `Scene "${scene.name}" sound "${soundId}" has volume ${volume} out of range`,
        ).toBeGreaterThanOrEqual(0)
        expect(volume).toBeLessThanOrEqual(1)
      }
    }
  })

  it('all animation categories are valid', () => {
    const validCategories = ['drift', 'pulse', 'glow']
    for (const scene of SCENE_PRESETS) {
      expect(
        validCategories,
        `Scene "${scene.name}" has invalid animationCategory "${scene.animationCategory}"`,
      ).toContain(scene.animationCategory)
    }
  })

  it('all tag structures are valid', () => {
    const validMoods = ['peaceful', 'uplifting', 'contemplative', 'restful']
    const validActivities = ['prayer', 'sleep', 'study', 'relaxation']
    const validIntensities = ['very_calm', 'moderate', 'immersive']

    for (const scene of SCENE_PRESETS) {
      for (const mood of scene.tags.mood) {
        expect(validMoods, `Scene "${scene.name}" has invalid mood "${mood}"`).toContain(mood)
      }
      for (const activity of scene.tags.activity) {
        expect(validActivities, `Scene "${scene.name}" has invalid activity "${activity}"`).toContain(activity)
      }
      expect(
        validIntensities,
        `Scene "${scene.name}" has invalid intensity "${scene.tags.intensity}"`,
      ).toContain(scene.tags.intensity)

      if (scene.tags.scriptureTheme) {
        expect(Array.isArray(scene.tags.scriptureTheme)).toBe(true)
        for (const theme of scene.tags.scriptureTheme) {
          expect(typeof theme).toBe('string')
          expect(theme.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('all scene IDs are unique', () => {
    const ids = SCENE_PRESETS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('FEATURED_SCENE_IDS', () => {
  it('all featured scene IDs exist in SCENE_BY_ID', () => {
    for (const id of FEATURED_SCENE_IDS) {
      expect(
        SCENE_BY_ID.has(id),
        `Featured scene ID "${id}" not found in SCENE_BY_ID`,
      ).toBe(true)
    }
  })

  it('has 3 featured scenes', () => {
    expect(FEATURED_SCENE_IDS).toHaveLength(3)
  })
})

describe('SCENE_BY_ID', () => {
  it('contains all 8 scenes', () => {
    expect(SCENE_BY_ID.size).toBe(8)
  })

  it('maps IDs to correct scenes', () => {
    for (const scene of SCENE_PRESETS) {
      expect(SCENE_BY_ID.get(scene.id)).toBe(scene)
    }
  })
})
