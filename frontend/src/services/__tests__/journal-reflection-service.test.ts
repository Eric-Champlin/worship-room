import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJournalReflection } from '../journal-reflection-service'
import type { JournalReflection } from '@/types/daily-experience'

const validEnvelope = () => ({
  data: {
    id: 'reflect-gen-a8f3',
    text: 'There is so much honesty in what you wrote about the weight you are carrying today. Showing up to write these words is itself a kind of prayer. Let yourself be seen here.',
  } satisfies JournalReflection,
  meta: { requestId: 'test-reflect-req-id' },
})

function mockFetchResolvesOnce(resp: Partial<Response>) {
  const fetchMock = vi.fn().mockResolvedValueOnce(resp)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchRejectsOnce(err: Error) {
  const fetchMock = vi.fn().mockRejectedValueOnce(err)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchJournalReflection — happy path', () => {
  it('calls backend proxy with correct URL, method, and body shape', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    await fetchJournalReflection('test entry')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/reflect-journal$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ entry: 'test entry' })
  })

  it('returns parsed envelope.data when backend succeeds', async () => {
    const envelope = validEnvelope()
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => envelope,
    })

    const result = await fetchJournalReflection('An entry about today.')

    expect(result).toEqual(envelope.data)
  })

  it('passes crisis response through when backend emits id=crisis', async () => {
    const crisisEnvelope = {
      data: {
        id: 'crisis',
        text: 'What you wrote here matters, and thank you for trusting this page with it. Please reach out tonight. Call 988 (Suicide and Crisis Lifeline) or text HOME to 741741 for the Crisis Text Line. Both are free and available 24/7.',
      } satisfies JournalReflection,
      meta: { requestId: 'test-crisis-id' },
    }
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => crisisEnvelope,
    })

    const result = await fetchJournalReflection('I want to die')

    expect(result).toEqual(crisisEnvelope.data)
    expect(result.id).toBe('crisis')
    expect(result.text).toContain('988')
    expect(result.text).toContain('741741')
  })
})

describe('fetchJournalReflection — fallback on HTTP errors', () => {
  it('falls back to mock on 400', async () => {
    mockFetchResolvesOnce({ ok: false, status: 400, json: async () => ({}) })
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(result.id.length).toBeGreaterThan(0)
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('falls back to mock on 422 safety block', async () => {
    mockFetchResolvesOnce({ ok: false, status: 422, json: async () => ({}) })
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('falls back to mock on 502', async () => {
    mockFetchResolvesOnce({ ok: false, status: 502, json: async () => ({}) })
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })
})

describe('fetchJournalReflection — fallback on network/timeout/parse', () => {
  it('falls back to mock on network error', async () => {
    mockFetchRejectsOnce(new Error('network down'))
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('falls back to mock when fetch times out (AbortController fires)', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const promise = fetchJournalReflection('An entry.')
    vi.advanceTimersByTime(30_001)
    const result = await promise

    expect(typeof result.id).toBe('string')
    expect(typeof result.text).toBe('string')
    const [, init] = fetchMock.mock.calls[0]
    expect((init.signal as AbortSignal).aborted).toBe(true)
  })

  it('falls back to mock when response has no data field', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('falls back to mock when response is missing id field', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { text: 'valid reflection text here that is long enough to pass the 20 char floor' },
        meta: { requestId: 'r' },
      }),
    })
    const result = await fetchJournalReflection('An entry.')
    expect(typeof result.id).toBe('string')
    expect(result.id).not.toBe('')
    expect(typeof result.text).toBe('string')
  })

  it('falls back to mock when text is shorter than 20-char floor', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: 'x', text: 'short' },
        meta: { requestId: 'r' },
      }),
    })
    const result = await fetchJournalReflection('An entry.')
    expect(result.text).not.toBe('short')
    expect(result.text.length).toBeGreaterThanOrEqual(20)
  })
})
