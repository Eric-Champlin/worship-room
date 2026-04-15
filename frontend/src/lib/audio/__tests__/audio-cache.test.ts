import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCachedAudioBibles,
  setCachedAudioBibles,
  clearCachedAudioBibles,
  getCachedChapterAudio,
  setCachedChapterAudio,
  clearChapterAudioCache,
} from '@/lib/audio/audio-cache'
import type { DbpBible, DbpChapterAudio } from '@/types/bible-audio'

const CACHE_KEY = 'bb26-v1:audioBibles'

const MOCK_BIBLES: DbpBible[] = [
  {
    id: 'ENGWWH',
    name: 'WEB',
    language: 'English',
    languageCode: 'eng',
    filesets: [],
  },
]

describe('audio-cache — bibles list (BB-26)', () => {
  beforeEach(() => {
    localStorage.clear()
    clearChapterAudioCache()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('getCachedAudioBibles returns null on empty storage', () => {
    expect(getCachedAudioBibles()).toBeNull()
  })

  it('set + get round-trips a bibles list', () => {
    setCachedAudioBibles(MOCK_BIBLES)
    expect(getCachedAudioBibles()).toEqual(MOCK_BIBLES)
  })

  it('returns null on expired entry (>7 days old)', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ v: 1, createdAt: eightDaysAgo, bibles: MOCK_BIBLES }),
    )
    expect(getCachedAudioBibles()).toBeNull()
  })

  it('returns null on corrupt JSON and removes the key', () => {
    localStorage.setItem(CACHE_KEY, 'not valid json {{')
    expect(getCachedAudioBibles()).toBeNull()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })

  it('returns null on version mismatch', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ v: 99, createdAt: Date.now(), bibles: [] }),
    )
    expect(getCachedAudioBibles()).toBeNull()
  })

  it('setCachedAudioBibles fails silently when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => setCachedAudioBibles(MOCK_BIBLES)).not.toThrow()
    spy.mockRestore()
  })

  it('clearCachedAudioBibles removes the key', () => {
    setCachedAudioBibles(MOCK_BIBLES)
    clearCachedAudioBibles()
    expect(localStorage.getItem(CACHE_KEY)).toBeNull()
  })
})

describe('audio-cache — in-memory chapter audio (BB-26)', () => {
  const AUDIO: DbpChapterAudio = {
    book: 'JHN',
    chapter: 3,
    url: 'https://cdn.example.com/JHN/3.mp3',
    durationSeconds: 245,
  }

  beforeEach(() => {
    clearChapterAudioCache()
  })

  it('in-memory chapter audio cache round-trips', () => {
    setCachedChapterAudio('EN1WEBN2DA', 'JHN', 3, AUDIO)
    expect(getCachedChapterAudio('EN1WEBN2DA', 'JHN', 3)).toEqual(AUDIO)
  })

  it('in-memory cache miss returns undefined', () => {
    expect(getCachedChapterAudio('EN1WEBN2DA', 'JHN', 3)).toBeUndefined()
  })
})
