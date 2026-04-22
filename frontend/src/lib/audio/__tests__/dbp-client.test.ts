import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Test setup: Spec 4 (ai-proxy-fcbh) migrated dbp-client.ts from direct DBP
// calls to `/api/v1/proxy/bible/*`. The frontend no longer owns the FCBH key;
// the proxy wraps the DBP envelope in a `ProxyResponse` envelope, so responses
// have shape `{ data: { data: [...], meta: {} }, meta: { requestId } }`.

async function importClient() {
  const mod = await import('@/lib/audio/dbp-client')
  return mod
}

/** Wraps a DBP-shaped body in the outer ProxyResponse envelope. */
function mockFetchProxy(dbpBody: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ data: dbpBody, meta: { requestId: 'test-req-id' } }),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

/** For error cases where the body isn't wrapped (e.g., Spring's default 404 body). */
function mockFetchRaw(body: unknown, ok = true, status = 200) {
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

describe('DBP client (BB-26 / Spec 4 proxy migration)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.useRealTimers()
  })

  describe('listAudioBibles', () => {
    it('returns parsed bibles on 200', async () => {
      mockFetchProxy({ data: [{ id: 'ENGWWH', name: 'WEB' }], meta: {} })
      const { listAudioBibles } = await importClient()
      const bibles = await listAudioBibles()
      expect(bibles).toEqual([{ id: 'ENGWWH', name: 'WEB' }])
    })

    it('calls the proxy URL with the language query param (not direct DBP)', async () => {
      const fetchMock = mockFetchProxy({ data: [], meta: {} })
      const { listAudioBibles } = await importClient()
      await listAudioBibles()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/api/v1/proxy/bible/bibles')
      expect(url).toContain('language=eng')
      expect(url).not.toContain('4.dbt.io')
      expect(url).not.toContain('key=')
    })

    it('throws kind: http on 404', async () => {
      mockFetchRaw({}, false, 404)
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'http', status: 404 })
    })

    it('throws kind: http on 500', async () => {
      mockFetchRaw({}, false, 500)
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

    it('throws kind: parse when proxy envelope is missing data field', async () => {
      // Outer envelope has no `data` field — should fail parse on proxyFetch.
      const fn = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ meta: {} }),
      })
      vi.stubGlobal('fetch', fn)
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'parse' })
    })

    it('throws kind: parse when DBP inner envelope is malformed (no data array)', async () => {
      mockFetchProxy({ notWhatWeExpect: true })
      const { listAudioBibles } = await importClient()
      await expect(listAudioBibles()).rejects.toMatchObject({ kind: 'parse' })
    })
  })

  describe('getBibleFilesets', () => {
    it('returns parsed filesets', async () => {
      mockFetchProxy({
        data: [{ id: 'EN1WEBN2DA', type: 'audio_drama', size: 'NT' }],
      })
      const { getBibleFilesets } = await importClient()
      const filesets = await getBibleFilesets('ENGWWH')
      expect(filesets).toHaveLength(1)
      expect(filesets[0].id).toBe('EN1WEBN2DA')
    })

    it('calls the proxy URL /filesets/{bibleId}', async () => {
      const fetchMock = mockFetchProxy({ data: [] })
      const { getBibleFilesets } = await importClient()
      await getBibleFilesets('ENGWWH')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/api/v1/proxy/bible/filesets/ENGWWH')
      expect(url).not.toContain('4.dbt.io')
    })

    it('throws kind: http on 404', async () => {
      mockFetchRaw({}, false, 404)
      const { getBibleFilesets } = await importClient()
      await expect(getBibleFilesets('NOPE')).rejects.toMatchObject({ kind: 'http', status: 404 })
    })
  })

  describe('getChapterAudio', () => {
    it('returns typed DbpChapterAudio on success', async () => {
      mockFetchProxy({
        data: [
          {
            book_id: 'JHN',
            chapter_start: 3,
            path: 'https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?Signature=sig',
            duration: 245,
          },
        ],
      })
      const { getChapterAudio } = await importClient()
      const result = await getChapterAudio('EN1WEBN2DA', 'JHN', 3)
      expect(result).toEqual({
        book: 'JHN',
        chapter: 3,
        url: 'https://d1gd73roq7kqw6.cloudfront.net/.../john3.mp3?Signature=sig',
        durationSeconds: 245,
      })
    })

    it('calls the proxy URL /filesets/{fileset}/{book}/{chapter}', async () => {
      const fetchMock = mockFetchProxy({
        data: [
          {
            book_id: 'JHN',
            path: 'https://cdn.example.com/audio/JHN/3.mp3',
            duration: 245,
          },
        ],
      })
      const { getChapterAudio } = await importClient()
      await getChapterAudio('EN1WEBN2DA', 'JHN', 3)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/api/v1/proxy/bible/filesets/EN1WEBN2DA/JHN/3')
      expect(url).not.toContain('4.dbt.io')
    })

    it('throws kind: http with status 404 when chapter has no audio', async () => {
      mockFetchRaw({}, false, 404)
      const { getChapterAudio } = await importClient()
      await expect(getChapterAudio('EN1WEBN2DA', 'JHN', 99)).rejects.toMatchObject({
        kind: 'http',
        status: 404,
      })
    })

    it('throws kind: parse when DBP returns wrong book_id (invalid-code fallback bug)', async () => {
      // Recon § 4: requesting an invalid book code returns a 200 OK pointing to
      // 1 Chronicles. Without this guard, tapping "Nehemiah 5" would play
      // a random 3-hour 1 Chronicles recording. The backend passes the DBP
      // response through unchanged — the client-side guard stays authoritative.
      mockFetchProxy({
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
      mockFetchProxy({
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
      mockFetchProxy({
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
      mockFetchProxy({
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
      mockFetchProxy({ data: [] })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBO2DA', 'GEN', 1)
      expect(result).toEqual([])
    })

    it('returns empty array for malformed response (missing DBP data array)', async () => {
      mockFetchProxy({ notData: true })
      const { getChapterTimestamps } = await importClient()
      const result = await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      expect(result).toEqual([])
    })

    it('sorts by timestamp ascending', async () => {
      mockFetchProxy({
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

    it('calls the proxy URL /timestamps/{fileset}/{book}/{chapter}', async () => {
      const fetchMock = mockFetchProxy({ data: [] })
      const { getChapterTimestamps } = await importClient()
      await getChapterTimestamps('EN1WEBN2DA', 'JHN', 3)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/api/v1/proxy/bible/timestamps/EN1WEBN2DA/JHN/3')
      expect(url).not.toContain('4.dbt.io')
    })
  })
})
