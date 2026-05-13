import { describe, expect, it } from 'vitest'
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  type AnimationDuration,
  type AnimationEasing,
} from '../animation'

describe('ANIMATION_DURATIONS', () => {
  it('exports exactly 7 duration tokens', () => {
    expect(Object.keys(ANIMATION_DURATIONS)).toHaveLength(7)
  })

  it('instant is 0ms', () => {
    expect(ANIMATION_DURATIONS.instant).toBe(0)
  })

  it('fast is 150ms', () => {
    expect(ANIMATION_DURATIONS.fast).toBe(150)
  })

  it('base is 250ms', () => {
    expect(ANIMATION_DURATIONS.base).toBe(250)
  })

  it('slow is 400ms', () => {
    expect(ANIMATION_DURATIONS.slow).toBe(400)
  })

  it('pulse is 300ms', () => {
    expect(ANIMATION_DURATIONS.pulse).toBe(300)
  })

  it('ceremony is 600ms', () => {
    expect(ANIMATION_DURATIONS.ceremony).toBe(600)
  })

  it('meditative is 1500ms', () => {
    expect(ANIMATION_DURATIONS.meditative).toBe(1500)
  })

  it('has keys base, ceremony, fast, instant, meditative, pulse, slow', () => {
    expect(Object.keys(ANIMATION_DURATIONS).sort()).toEqual([
      'base',
      'ceremony',
      'fast',
      'instant',
      'meditative',
      'pulse',
      'slow',
    ])
  })
})

describe('ANIMATION_EASINGS', () => {
  it('exports exactly 4 easing tokens', () => {
    expect(Object.keys(ANIMATION_EASINGS)).toHaveLength(4)
  })

  it('standard matches Material Design standard curve', () => {
    expect(ANIMATION_EASINGS.standard).toBe('cubic-bezier(0.4, 0, 0.2, 1)')
  })

  it('decelerate matches Material Design decelerate curve', () => {
    expect(ANIMATION_EASINGS.decelerate).toBe('cubic-bezier(0, 0, 0.2, 1)')
  })

  it('accelerate matches Material Design accelerate curve', () => {
    expect(ANIMATION_EASINGS.accelerate).toBe('cubic-bezier(0.4, 0, 1, 1)')
  })

  it('sharp matches Material Design sharp curve', () => {
    expect(ANIMATION_EASINGS.sharp).toBe('cubic-bezier(0.4, 0, 0.6, 1)')
  })

  it('all values are valid cubic-bezier strings', () => {
    const cubicBezierPattern = /^cubic-bezier\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*[\d.]+\s*\)$/
    for (const value of Object.values(ANIMATION_EASINGS)) {
      expect(value).toMatch(cubicBezierPattern)
    }
  })

  it('has keys standard, decelerate, accelerate, sharp', () => {
    expect(Object.keys(ANIMATION_EASINGS).sort()).toEqual([
      'accelerate',
      'decelerate',
      'sharp',
      'standard',
    ])
  })
})

describe('Type exports', () => {
  it('AnimationDuration type constrains to valid keys', () => {
    const key: AnimationDuration = 'fast'
    expect(key).toBe('fast')
  })

  it('AnimationEasing type constrains to valid keys', () => {
    const key: AnimationEasing = 'decelerate'
    expect(key).toBe('decelerate')
  })
})
