import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPrayer } from '../prayer-service'
import type { MockPrayer } from '@/types/daily-experience'

const validEnvelope = () => ({
  data: {
    id: 'prayer-anxiety-gen-a8f3',
    topic: 'anxiety',
    text: 'Dear God, I come to You with the weight of tomorrow pressing on me. I trust You. Amen.',
  } satisfies MockPrayer,
  meta: { requestId: 'test-pray-req-id' },
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

describe('fetchPrayer — happy path', () => {
  it('calls backend proxy with correct URL, method, and body shape', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    await fetchPrayer('I feel anxious')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/pray$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ request: 'I feel anxious' })
  })

  it('returns parsed envelope.data when backend succeeds', async () => {
    const envelope = validEnvelope()
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => envelope,
    })

    const result = await fetchPrayer('I feel anxious')

    expect(result).toEqual(envelope.data)
  })

  it('passes crisis response through when backend emits topic=crisis', async () => {
    const crisisEnvelope = {
      data: {
        id: 'crisis',
        topic: 'crisis',
        text: 'Dear God, I carry a weight that feels unbearable. Help me call 988. Text HOME to 741741. Hold me close. Amen.',
      } satisfies MockPrayer,
      meta: { requestId: 'test-crisis-id' },
    }
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => crisisEnvelope,
    })

    const result = await fetchPrayer('I want to die')

    expect(result).toEqual(crisisEnvelope.data)
    expect(result.topic).toBe('crisis')
    expect(result.text).toContain('988')
  })
})

describe('fetchPrayer — fallback on HTTP errors', () => {
  it('falls back to mock on 400', async () => {
    mockFetchResolvesOnce({ ok: false, status: 400, json: async () => ({}) })
    const result = await fetchPrayer('I feel anxious')
    // Mock fallback: getMockPrayer('I feel anxious') keyword-matches to anxiety topic
    expect(result.topic).toBe('anxiety')
    expect(result.text).toMatch(/^Dear God/)
    expect(result.text).toMatch(/Amen\.$/)
  })

  it('falls back to mock on 422 safety block', async () => {
    mockFetchResolvesOnce({ ok: false, status: 422, json: async () => ({}) })
    const result = await fetchPrayer('I feel anxious')
    expect(result.topic).toBe('anxiety')
  })

  it('falls back to mock on 502', async () => {
    mockFetchResolvesOnce({ ok: false, status: 502, json: async () => ({}) })
    const result = await fetchPrayer('I feel anxious')
    expect(result.topic).toBe('anxiety')
  })
})

describe('fetchPrayer — fallback on network/timeout/parse', () => {
  it('falls back to mock on network error', async () => {
    mockFetchRejectsOnce(new Error('network down'))
    const result = await fetchPrayer('I feel anxious')
    expect(result.topic).toBe('anxiety')
    expect(result.text).toMatch(/^Dear God/)
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

    const promise = fetchPrayer('I feel anxious')
    vi.advanceTimersByTime(30_001)
    const result = await promise

    expect(result.topic).toBe('anxiety')
    const [, init] = fetchMock.mock.calls[0]
    expect((init.signal as AbortSignal).aborted).toBe(true)
  })

  it('falls back to mock when response JSON has malformed shape', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: null } }),
    })
    const result = await fetchPrayer('I feel anxious')
    expect(result.topic).toBe('anxiety')
    expect(result.text).toMatch(/^Dear God/)
  })
})

describe('fetchPrayer — shape validation', () => {
  it('falls back to mock when text is missing Dear salutation', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'x',
          topic: 'anxiety',
          text: 'Lord, please help me today. Amen.',
        },
        meta: { requestId: 'r' },
      }),
    })
    const result = await fetchPrayer('I feel anxious')
    // Fallback returned; mock anxiety prayer ALSO starts "Dear God" so both would match /^Dear /.
    // The key assertion is the backend DTO was rejected because "Lord, please" doesn't match /^Dear /.
    // The returned mock will be the keyword-matched MOCK_PRAYERS anxiety entry, which starts "Dear God, I come to You".
    expect(result.text).toMatch(/^Dear God/)
    expect(result.text).not.toBe('Lord, please help me today. Amen.')
  })

  it('falls back to mock when text is missing Amen ending', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'x',
          topic: 'anxiety',
          text: 'Dear God, please help me today.',
        },
        meta: { requestId: 'r' },
      }),
    })
    const result = await fetchPrayer('I feel anxious')
    expect(result.text).toMatch(/Amen\.$/)
    expect(result.text).not.toBe('Dear God, please help me today.')
  })

  it('selects keyword-matched mock on fallback', async () => {
    mockFetchRejectsOnce(new Error('net'))
    const result = await fetchPrayer('I feel anxious')
    // Confirms the mock's keyword matcher routes 'anxious' → anxiety topic
    expect(result.topic).toBe('anxiety')
    expect(result.id).toBe('prayer-anxiety')
  })
})
