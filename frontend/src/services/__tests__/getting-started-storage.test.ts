import { describe, it, expect, beforeEach } from 'vitest'
import {
  getGettingStartedData,
  setGettingStartedFlag,
  isGettingStartedComplete,
  setGettingStartedComplete,
  freshGettingStartedData,
} from '../getting-started-storage'

beforeEach(() => {
  localStorage.clear()
})

describe('getGettingStartedData', () => {
  it('returns fresh data when empty', () => {
    const data = getGettingStartedData()
    expect(data).toEqual(freshGettingStartedData())
    expect(data.mood_done).toBe(false)
    expect(data.pray_done).toBe(false)
    expect(data.journal_done).toBe(false)
    expect(data.meditate_done).toBe(false)
    expect(data.ambient_visited).toBe(false)
    expect(data.prayer_wall_visited).toBe(false)
  })

  it('handles corrupted JSON', () => {
    localStorage.setItem('wr_getting_started', '{invalid json!')
    const data = getGettingStartedData()
    expect(data).toEqual(freshGettingStartedData())
  })
})

describe('setGettingStartedFlag', () => {
  it('persists individual flags', () => {
    setGettingStartedFlag('mood_done', true)
    const data = getGettingStartedData()
    expect(data.mood_done).toBe(true)
    expect(data.pray_done).toBe(false)
  })
})

describe('isGettingStartedComplete', () => {
  it('returns false by default', () => {
    expect(isGettingStartedComplete()).toBe(false)
  })
})

describe('setGettingStartedComplete', () => {
  it('sets "true" in localStorage', () => {
    setGettingStartedComplete()
    expect(isGettingStartedComplete()).toBe(true)
    expect(localStorage.getItem('wr_getting_started_complete')).toBe('true')
  })
})
