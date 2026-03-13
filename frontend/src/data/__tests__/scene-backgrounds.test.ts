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

  it('has exactly 8 scene backgrounds', () => {
    expect(Object.keys(SCENE_BACKGROUNDS)).toHaveLength(8)
  })
})
