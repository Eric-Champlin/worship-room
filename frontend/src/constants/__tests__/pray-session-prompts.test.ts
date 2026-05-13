import { describe, it, expect } from 'vitest'
import {
  PRAY_PROMPTS_1MIN,
  PRAY_PROMPTS_5MIN,
  PRAY_PROMPTS_10MIN,
  PROMPT_VISIBLE_MS,
  PROMPT_FADE_IN_MS,
  PROMPT_FADE_OUT_MS,
  AMEN_SCREEN_HOLD_MS,
  getPromptsForLength,
} from '../pray-session-prompts'

describe('pray-session-prompts', () => {
  it('has 2 prompts for 1-min session with first fixed', () => {
    expect(PRAY_PROMPTS_1MIN).toHaveLength(2)
    expect(PRAY_PROMPTS_1MIN[0].fixedPosition).toBe('first')
  })

  it('has 5 prompts for 5-min session with first and last fixed', () => {
    expect(PRAY_PROMPTS_5MIN).toHaveLength(5)
    expect(PRAY_PROMPTS_5MIN[0].fixedPosition).toBe('first')
    expect(PRAY_PROMPTS_5MIN[4].fixedPosition).toBe('last')
    // Interior positions have no fixedPosition
    expect(PRAY_PROMPTS_5MIN[1].fixedPosition).toBeUndefined()
    expect(PRAY_PROMPTS_5MIN[2].fixedPosition).toBeUndefined()
    expect(PRAY_PROMPTS_5MIN[3].fixedPosition).toBeUndefined()
  })

  it('has 8 prompts for 10-min session with first and last fixed', () => {
    expect(PRAY_PROMPTS_10MIN).toHaveLength(8)
    expect(PRAY_PROMPTS_10MIN[0].fixedPosition).toBe('first')
    expect(PRAY_PROMPTS_10MIN[7].fixedPosition).toBe('last')
    // No interior fixedPosition
    PRAY_PROMPTS_10MIN.slice(1, -1).forEach((p) => {
      expect(p.fixedPosition).toBeUndefined()
    })
  })

  it('exposes timing constants matching spec values', () => {
    expect(PROMPT_VISIBLE_MS).toBe(5_000)
    expect(PROMPT_FADE_IN_MS).toBe(1_500)
    expect(PROMPT_FADE_OUT_MS).toBe(1_500)
    expect(AMEN_SCREEN_HOLD_MS).toBe(3_000)
  })

  it('getPromptsForLength returns the matching readonly array', () => {
    expect(getPromptsForLength(1)).toBe(PRAY_PROMPTS_1MIN)
    expect(getPromptsForLength(5)).toBe(PRAY_PROMPTS_5MIN)
    expect(getPromptsForLength(10)).toBe(PRAY_PROMPTS_10MIN)
  })

  it('all prompts have non-empty text and positive silenceMs', () => {
    const all = [...PRAY_PROMPTS_1MIN, ...PRAY_PROMPTS_5MIN, ...PRAY_PROMPTS_10MIN]
    all.forEach((p) => {
      expect(p.text.trim().length).toBeGreaterThan(0)
      expect(p.silenceMs).toBeGreaterThan(0)
      expect(Number.isFinite(p.silenceMs)).toBe(true)
    })
  })
})
