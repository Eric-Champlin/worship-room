import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Test setup: the DBP client reads the FCBH key via env.ts, which reads
// import.meta.env at module load. We stub the env per-test and reset modules.

const GOOD_KEY = 'test-fcbh-key'

async function importClient() {
  const mod = await import('@/lib/audio/dbp-client')
  return mod
}

function mockFetchJson(body: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

function mockFetchReject(error: unknown) {
  const fn = vi.fn().mockRejectedValue(error)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('DBP client (BB-26)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_FCBH_API_KEY', GOOD_KEY)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.useRealTimers()
  })

  describe('listAudioBibles', () => {
    it('returns parsed bibles on 200', async () => {
      mockFetchJson({ data: [{ id: 'ENGWWH', name: 'WEB' }], meta: {} })
      const { listAudioBibles } = await importClient()
      const bibles = await listAudioBibles()
      expect(bibles).toEqual([{ id: 'ENGWWH', name: 'WEB' }])
    })

    it('includes language_code and key query params', async () => {
      const fetchMock = mockFetchJson({ data: [], meta: {} })
      const { listAudioBibles } = await importClient()
      await listAudioBibles()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('language_code=eng')
      expect(url).toContain('key=')
      expect(url).toContain('v=4')
    })

    it('throws kind: http on 404', async () => {
      mockFetchJson({}, false, 404)
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'http', status: 404 })
    })

    it('throws kind: http on 500', async () => {
      mockFetchJson({}, false, 500)
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'http', status: 500 })
    })

    it('throws kind: network on fetch rejection', async () => {
      mockFetchReject(new Error('DNS failure'))
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'network' })
    })

    it('throws kind: timeout on AbortError', async () => {
      const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
      mockFetchReject(abortErr)
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'timeout' })
    })

    it('throws kind: parse on malformed response (missing data array)', async () => {
      mockFetchJson({ notWhatWeExpect: true })
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'parse' })
    })

    it('throws kind: missing-key when key unset', async () => {
      vi.stubEnv('VITE_FCBH_API_KEY', '')
      vi.resetModules()
      mockFetchJson({ data: [] })
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'missing-key' })
    })
  })

  describe('getBibleFilesets', () => {
    it('returns parsed filesets', async () => {
      mockFetchJson({ data: [{ id: 'EN1WEBN2DA', type: 'audio_drama', size: 'NT' }] })
      const { getBibleFilesets } = await importClient()
      const filesets = await getBibleFilesets('ENGWWH')
      expect(filesets).toHaveLength(1)
      expect(filesets[0].id).toBe('EN1WEBN2DA')
    })

    it('throws kind: http on 404', async () => {
      mockFetchJson({}, false, 404)
      const { getBibleFilesets } = await importClient()
      await expect(getBibleFilesets('NOPE')).rejects.toMatchObject({ kind: 'http', status: 404 })
    })
  })

  describe('getChapterAudio', () => {
    it('returns typed DbpChapterAudio on success', async () => {
      mockFetchJson({
        data: [
          {
            book_id: 'JHN',
            chapter_start: 3,
            path: 'https://cdn.example.com/audio/JHN/3.mp3',
            duration: 245,
          },
        ],
      })
      const { getChapterAudio } = await importClient()
      const result = await getChapterAudio('EN1WEBN2DA', 'JHN', 3)
      expect(result).toEqual({
        book: 'JHN',
        chapter: 3,
        url: 'https://cdn.example.com/audio/JHN/3.mp3',
        durationSeconds: 245,
      })
    })

    it('throws kind: http with status 404 when chapter has no audio', async () => {
      mockFetchJson({}, false, 404)
      const { getChapterAudio } = await importClient()
      await expect(getChapterAudio('EN1WEBN2DA', 'JHN', 99)).rejects.toMatchObject({
        kind: 'http',
        status: 404,
      })
    })

    it('throws kind: parse when DBP returns wrong book_id (invalid-code fallback bug)', async () => {
      // Recon § 4: requesting an invalid book code returns a 200 OK pointing to
      // 1 Chronicles. Without this guard, tapping "Nehemiah 5" would play
      // a random 3-hour 1 Chronicles recording.
      mockFetchJson({
        data: [
          {
            book_id: '1CH',
            chapter_start: 1,
            path: 'https://cdn.example.com/audio/1CH/1.m3u8',
          },
        ],
      })
      const { getChapterAudio } = await importClient()
      await expect(getChapterAudio('EN1WEBO2DA', 'NEH', 5)).rejects.toMatchObject({
        kind: 'parse',
        message: 'DBP returned wrong book',
      })
    })

    it('book_id match is case-insensitive', async () => {
      mockFetchJson({
        data: [
          {
            book_id: 'jhn', // lowercase from DBP
            chapter_start: 3,
            path: 'https://cdn.example.com/audio/JHN/3.mp3',
          },
        ],
      })
      const { getChapterAudio } = await importClient()
      const result = await getChapterAudio('EN1WEBN2DA', 'JHN', 3)
      expect(result.book).toBe('jhn')
    })
  })

  describe('getChapterTimestamps (BB-44)', () => {
    it('parses valid response correctly', async () => {
      mockFetchJson({
        data: [
          { book: 'JHN', chapter: '3', verse_start: '0', verse_start_alt: '0', timestamp: 0 },
          { book: 'JHN', chapter: '3', verse_start: '1', verse_start_alt: '1', timestamp: 3.64 },
          { book: 'JHN', chapter: '3', verse_start: '2', verse_start_alt: '2', timestamp: 10.48 },
        ],
      })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      expect(result).toEqual([
        { verse: 1, timestamp: 3.64 },
        { verse: 2, timestamp: 10.48 },
      ])
    })

    it('filters out verse_start "0" (chapter intro marker)', async () => {
      mockFetchJson({
        data: [
          { book: 'JHN', chapter: '3', verse_start: '0', verse_start_alt: '0', timestamp: 0 },
          { book: 'JHN', chapter: '3', verse_start: '1', verse_start_alt: '1', timestamp: 3.64 },
        ],
      })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      expect(result).toHaveLength(1)
      expect(result[0].verse).toBe(1)
    })

    it('returns empty array for empty data (OT chapters)', async () => {
      mockFetchJson({ data: [] })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBO2DA', 'GEN', 1)
      expect(result).toEqual([])
    })

    it('returns empty array for malformed response', async () => {
      mockFetchJson({ notData: true })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      expect(result).toEqual([])
    })

    it('sorts by timestamp ascending', async () => {
      mockFetchJson({
        data: [
          { book: 'JHN', chapter: '3', verse_start: '3', verse_start_alt: '3', timestamp: 18.2 },
          { book: 'JHN', chapter: '3', verse_start: '1', verse_start_alt: '1', timestamp: 3.64 },
          { book: 'JHN', chapter: '3', verse_start: '2', verse_start_alt: '2', timestamp: 10.48 },
        ],
      })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      expect(result.map((t) => t.verse)).toEqual([1, 2, 3])
      expect(result.map((t) => t.timestamp)).toEqual([3.64, 10.48, 18.2])
    })
  })
})
