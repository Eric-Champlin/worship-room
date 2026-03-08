import { describe, it, expect } from 'vitest'
import { AUDIO_CONFIG } from '../audio'

describe('AUDIO_CONFIG', () => {
  it('has correct default values from spec', () => {
    expect(AUDIO_CONFIG.MAX_SIMULTANEOUS_SOUNDS).toBe(6)
    expect(AUDIO_CONFIG.DEFAULT_SOUND_VOLUME).toBe(0.6)
    expect(AUDIO_CONFIG.DEFAULT_MASTER_VOLUME).toBe(0.8)
    expect(AUDIO_CONFIG.DEFAULT_FG_BG_BALANCE).toBe(0.5)
    expect(AUDIO_CONFIG.VOLUME_RAMP_MS).toBe(20)
    expect(AUDIO_CONFIG.PILL_FADE_DURATION_MS).toBe(300)
    expect(AUDIO_CONFIG.DRAWER_ANIMATION_MS).toBe(300)
  })

  it('has sleep timer options', () => {
    expect(AUDIO_CONFIG.SLEEP_TIMER_OPTIONS).toEqual([15, 30, 45, 60, 90])
  })

  it('has fade duration options', () => {
    expect(AUDIO_CONFIG.FADE_DURATION_OPTIONS).toEqual([5, 10, 15, 30])
  })
})
