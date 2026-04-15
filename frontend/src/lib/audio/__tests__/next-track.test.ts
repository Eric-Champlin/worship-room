/**
 * BB-29 — resolveNextTrack unit tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNextTrack } from '@/lib/audio/next-track'
import {
  clearChapterAudioCache,
  setCachedChapterAudio,
} from '@/lib/audio/audio-cache'
import type {
  DbpChapterAudio,
  DbpError,
  PlayerTrack,
} from '@/types/bible-audio'

function makeTrack(overrides: Partial<PlayerTrack> = {}): PlayerTrack {
  return {
    filesetId: 'EN1WEBN2DA',
    book: 'john',
    bookDisplayName: 'John',
    chapter: 3,
    translation: 'World English Bible',
    url: 'https://cdn.example.com/JHN/3.mp3',
    ...overrides,
  }
}

function makeChapterAudio(
  book: string,
  chapter: number,
  url?: string,
): DbpChapterAudio {
  return {
    book,
    chapter,
    url: url ?? `https://cdn.example.com/${book}/${chapter}.mp3`,
  }
}

describe('BB-29 resolveNextTrack', () => {
  beforeEach(() => {
    clearChapterAudioCache()
  })

  afterEach(() => {
    clearChapterAudioCache()
    vi.restoreAllMocks()
  })

  it('returns same-book next chapter', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudio('JHN', 4))
    const result = await resolveNextTrack(makeTrack({ chapter: 3 }), {
      fetchChapterAudio,
    })
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.book).toBe('john')
    expect(result.track.chapter).toBe(4)
    expect(result.track.bookDisplayName).toBe('John')
    expect(result.track.filesetId).toBe('EN1WEBN2DA')
    expect(fetchChapterAudio).toHaveBeenCalledWith('EN1WEBN2DA', 'JHN', 4)
  })

  it('crosses book boundary (Genesis 50 → Exodus 1)', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudio('EXO', 1))
    const result = await resolveNextTrack(
      makeTrack({
        filesetId: 'EN1WEBO2DA',
        book: 'genesis',
        bookDisplayName: 'Genesis',
        chapter: 50,
      }),
      { fetchChapterAudio },
    )
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.book).toBe('exodus')
    expect(result.track.chapter).toBe(1)
    expect(result.track.bookDisplayName).toBe('Exodus')
    expect(result.track.filesetId).toBe('EN1WEBO2DA')
  })

  it('crosses testament boundary with fileset switch (Malachi 4 → Matthew 1)', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudio('MAT', 1))
    const result = await resolveNextTrack(
      makeTrack({
        filesetId: 'EN1WEBO2DA',
        book: 'malachi',
        bookDisplayName: 'Malachi',
        chapter: 4,
      }),
      { fetchChapterAudio },
    )
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.filesetId).toBe('EN1WEBN2DA')
    expect(result.track.book).toBe('matthew')
    expect(result.track.chapter).toBe(1)
    expect(fetchChapterAudio).toHaveBeenCalledWith('EN1WEBN2DA', 'MAT', 1)
  })

  it('returns end-of-bible for Revelation 22', async () => {
    const fetchChapterAudio = vi.fn()
    const result = await resolveNextTrack(
      makeTrack({
        filesetId: 'EN1WEBN2DA',
        book: 'revelation',
        bookDisplayName: 'Revelation',
        chapter: 22,
      }),
      { fetchChapterAudio },
    )
    expect(result).toEqual({ kind: 'end-of-bible' })
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('skips a 404 and advances to the next chapter', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockImplementationOnce(() => {
        const err: DbpError = { kind: 'http', status: 404, message: 'not found' }
        return Promise.reject(err)
      })
      .mockImplementationOnce(() => Promise.resolve(makeChapterAudio('JHN', 5)))

    const result = await resolveNextTrack(makeTrack({ chapter: 3 }), {
      fetchChapterAudio,
    })
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.chapter).toBe(5)
    expect(fetchChapterAudio).toHaveBeenCalledTimes(2)
    expect(fetchChapterAudio).toHaveBeenNthCalledWith(1, 'EN1WEBN2DA', 'JHN', 4)
    expect(fetchChapterAudio).toHaveBeenNthCalledWith(2, 'EN1WEBN2DA', 'JHN', 5)
  })

  it('throws after 3 consecutive 404s', async () => {
    const err: DbpError = { kind: 'http', status: 404, message: 'not found' }
    const fetchChapterAudio = vi.fn().mockRejectedValue(err)

    await expect(
      resolveNextTrack(makeTrack({ chapter: 3 }), { fetchChapterAudio }),
    ).rejects.toEqual(err)
    expect(fetchChapterAudio).toHaveBeenCalledTimes(3)
  })

  it('throws immediately on a network error (no skip)', async () => {
    const err: DbpError = { kind: 'network', message: 'offline' }
    const fetchChapterAudio = vi.fn().mockRejectedValue(err)

    await expect(
      resolveNextTrack(makeTrack({ chapter: 3 }), { fetchChapterAudio }),
    ).rejects.toEqual(err)
    expect(fetchChapterAudio).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on a timeout error (no skip)', async () => {
    const err: DbpError = { kind: 'timeout', message: 'DBP request timed out' }
    const fetchChapterAudio = vi.fn().mockRejectedValue(err)

    await expect(
      resolveNextTrack(makeTrack({ chapter: 3 }), { fetchChapterAudio }),
    ).rejects.toEqual(err)
    expect(fetchChapterAudio).toHaveBeenCalledTimes(1)
  })

  it('hits the in-memory cache without calling DBP', async () => {
    const audio = makeChapterAudio('JHN', 4, 'https://cached.example.com/JHN/4.mp3')
    setCachedChapterAudio('EN1WEBN2DA', 'JHN', 4, audio)

    const fetchChapterAudio = vi.fn().mockImplementation(() => {
      throw new Error('fetch should not be called')
    })
    const result = await resolveNextTrack(makeTrack({ chapter: 3 }), {
      fetchChapterAudio,
    })
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.url).toBe('https://cached.example.com/JHN/4.mp3')
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('preserves translation from current track', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudio('JHN', 4))
    const result = await resolveNextTrack(
      makeTrack({ chapter: 3, translation: 'World English Bible' }),
      { fetchChapterAudio },
    )
    expect(result.kind).toBe('track')
    if (result.kind !== 'track') return
    expect(result.track.translation).toBe('World English Bible')
  })
})
