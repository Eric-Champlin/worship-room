import { describe, it, expect } from 'vitest'
import { getSuggestedScenes } from '../ambient-suggestions'
import type { AmbientContext } from '../ambient-suggestions'

const ALL_CONTEXTS: AmbientContext[] = [
  'pray',
  'journal',
  'meditate',
  'breathing',
  'soaking',
  'other-meditation',
  'bible-reading',
]

describe('getSuggestedScenes', () => {
  it.each(ALL_CONTEXTS)('returns exactly 3 scenes for context "%s"', (context) => {
    const scenes = getSuggestedScenes(context)
    expect(scenes).toHaveLength(3)
  })

  it.each(ALL_CONTEXTS)('returns valid ScenePreset objects for context "%s"', (context) => {
    const scenes = getSuggestedScenes(context)
    for (const scene of scenes) {
      expect(scene).toHaveProperty('id')
      expect(scene).toHaveProperty('name')
      expect(scene).toHaveProperty('sounds')
      expect(typeof scene.id).toBe('string')
      expect(typeof scene.name).toBe('string')
      expect(Array.isArray(scene.sounds)).toBe(true)
    }
  })

  it('returns correct scenes for pray context', () => {
    const scenes = getSuggestedScenes('pray')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['The Upper Room', 'Ember & Stone', 'Still Waters'])
  })

  it('returns correct scenes for journal context', () => {
    const scenes = getSuggestedScenes('journal')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['Midnight Rain', 'Morning Mist', 'Starfield'])
  })

  it('returns correct scenes for meditate context', () => {
    const scenes = getSuggestedScenes('meditate')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['Garden of Gethsemane', 'Still Waters', 'Mountain Refuge'])
  })

  it('returns correct scenes for breathing context', () => {
    const scenes = getSuggestedScenes('breathing')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['Still Waters', 'Morning Mist', 'Garden of Gethsemane'])
  })

  it('returns correct scenes for soaking context', () => {
    const scenes = getSuggestedScenes('soaking')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['The Upper Room', 'Starfield', 'Garden of Gethsemane'])
  })

  it('returns correct scenes for other-meditation context', () => {
    const scenes = getSuggestedScenes('other-meditation')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['Garden of Gethsemane', 'Still Waters', 'Mountain Refuge'])
  })

  it('returns correct scenes for bible-reading context', () => {
    const scenes = getSuggestedScenes('bible-reading')
    const names = scenes.map((s) => s.name)
    expect(names).toEqual(['Peaceful Study', 'Evening Scripture', 'Sacred Space'])
  })

  it('returns unique scenes (no duplicates) per context', () => {
    for (const context of ALL_CONTEXTS) {
      const scenes = getSuggestedScenes(context)
      const ids = scenes.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
