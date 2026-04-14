import { describe, it, expect, beforeEach } from 'vitest'
import { getNotificationPrefs, setNotificationPrefs, updateNotificationPrefs } from '../preferences'
import { DEFAULT_PREFS } from '../types'

describe('notification preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns DEFAULT_PREFS when localStorage is empty', () => {
    const prefs = getNotificationPrefs()
    expect(prefs).toEqual(DEFAULT_PREFS)
  })

  it('reads saved prefs from localStorage', () => {
    const saved = { ...DEFAULT_PREFS, enabled: true, dailyVerseTime: '09:30' }
    localStorage.setItem('wr_notification_prefs', JSON.stringify(saved))
    const prefs = getNotificationPrefs()
    expect(prefs.enabled).toBe(true)
    expect(prefs.dailyVerseTime).toBe('09:30')
  })

  it('returns defaults for malformed JSON', () => {
    localStorage.setItem('wr_notification_prefs', '{bad json')
    const prefs = getNotificationPrefs()
    expect(prefs).toEqual(DEFAULT_PREFS)
  })

  it('fills missing fields with defaults', () => {
    localStorage.setItem('wr_notification_prefs', JSON.stringify({ enabled: true }))
    const prefs = getNotificationPrefs()
    expect(prefs.enabled).toBe(true)
    expect(prefs.dailyVerse).toBe(true) // default
    expect(prefs.dailyVerseTime).toBe('08:00') // default
  })

  it('setNotificationPrefs persists to localStorage', () => {
    const prefs = { ...DEFAULT_PREFS, enabled: true }
    setNotificationPrefs(prefs)
    const raw = localStorage.getItem('wr_notification_prefs')
    expect(JSON.parse(raw!).enabled).toBe(true)
  })

  it('updateNotificationPrefs merges and persists', () => {
    setNotificationPrefs(DEFAULT_PREFS)
    const result = updateNotificationPrefs({ dailyVerseTime: '07:00' })
    expect(result.dailyVerseTime).toBe('07:00')
    expect(result.enabled).toBe(false) // unchanged
    // Also persisted
    const stored = JSON.parse(localStorage.getItem('wr_notification_prefs')!)
    expect(stored.dailyVerseTime).toBe('07:00')
  })
})
