import { describe, it, expect, beforeEach } from 'vitest'
import {
  MUTES_KEY,
  EMPTY_MUTES_DATA,
  getMutesData,
  saveMutesData,
  muteUser,
  unmuteUser,
  isMuted,
} from '../mutes-storage'

describe('mutes-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns EMPTY_MUTES_DATA when no value in localStorage', () => {
    const data = getMutesData()
    expect(data).toEqual(EMPTY_MUTES_DATA)
    expect(data.muted).toEqual([])
  })

  it('returns EMPTY_MUTES_DATA when localStorage value is corrupt JSON', () => {
    localStorage.setItem(MUTES_KEY, '{not valid json}')
    expect(getMutesData()).toEqual(EMPTY_MUTES_DATA)
  })

  it('round-trips: save then get returns the same data', () => {
    const data = { muted: ['user-1', 'user-2'] }
    expect(saveMutesData(data)).toBe(true)
    expect(getMutesData()).toEqual(data)
  })

  it('muteUser is idempotent: calling twice returns the same object reference on the second call', () => {
    const initial = { muted: ['user-1'] }
    const next = muteUser(initial, 'user-1')
    // Idempotent: identical state, returns the SAME reference (no new array allocation).
    expect(next).toBe(initial)
  })

  it('unmuteUser removes the userId; isMuted reflects the change', () => {
    let data = muteUser({ muted: [] }, 'user-1')
    expect(isMuted(data, 'user-1')).toBe(true)

    data = unmuteUser(data, 'user-1')
    expect(isMuted(data, 'user-1')).toBe(false)
    expect(data.muted).toEqual([])
  })
})
