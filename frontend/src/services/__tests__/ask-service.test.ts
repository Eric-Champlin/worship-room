import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAskResponse } from '../ask-service'
import { ASK_RESPONSES } from '@/mocks/ask-mock-data'
import type { AskResponse } from '@/types/ask'

const validEnvelope = () => ({
  data: {
    id: 'suffering',
    topic: 'Why Suffering Exists',
    answer: 'A thoughtful answer.',
    verses: [
      { reference: 'Romans 8:28', text: 'All things...', explanation: 'a' },
      { reference: 'Psalm 34:18', text: 'Near...', explanation: 'b' },
      { reference: '2 Cor 1:3-4', text: 'Blessed...', explanation: 'c' },
    ],
    encouragement: 'God is close.',
    prayer: 'Lord, sit with me.',
    followUpQuestions: ['Q1', 'Q2', 'Q3'],
  } satisfies AskResponse,
  meta: { requestId: 'test-req-id' },
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

describe('fetchAskResponse — happy path', () => {
  it('calls backend proxy with correct URL, method, and body shape', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    await fetchAskResponse('Why?', [])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/ask$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    const body = JSON.parse(init.body as string)
    expect(body.question).toBe('Why?')
    // Empty history coerced to null per spec ternary
    expect(body.conversationHistory).toBeNull()
  })

  it('returns parsed envelope.data when backend succeeds', async () => {
    const envelope = validEnvelope()
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => envelope,
    })

    const result = await fetchAskResponse('Why?')

    expect(result).toEqual(envelope.data)
  })

  it('passes conversation history in request body when provided', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: 'First q' },
      { role: 'assistant', content: 'First a' },
    ]
    await fetchAskResponse('Second q', history)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.conversationHistory).toHaveLength(2)
    expect(body.conversationHistory[0]).toEqual({ role: 'user', content: 'First q' })
    expect(body.conversationHistory[1]).toEqual({ role: 'assistant', content: 'First a' })
  })
})

describe('fetchAskResponse — fallback on HTTP errors', () => {
  it('falls back to mock on 400', async () => {
    mockFetchResolvesOnce({ ok: false, status: 400, json: async () => ({}) })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })

  it('falls back to mock on 422 safety block', async () => {
    mockFetchResolvesOnce({ ok: false, status: 422, json: async () => ({}) })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })

  it('falls back to mock on 429', async () => {
    mockFetchResolvesOnce({ ok: false, status: 429, json: async () => ({}) })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })

  it('falls back to mock on 502', async () => {
    mockFetchResolvesOnce({ ok: false, status: 502, json: async () => ({}) })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })

  it('falls back to mock on 504', async () => {
    mockFetchResolvesOnce({ ok: false, status: 504, json: async () => ({}) })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })
})

describe('fetchAskResponse — fallback on network/timeout/parse', () => {
  it('falls back to mock on network error', async () => {
    mockFetchRejectsOnce(new Error('network down'))
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
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

    const promise = fetchAskResponse('Why does God allow suffering?')
    vi.advanceTimersByTime(30_001)
    const result = await promise

    expect(result).toBe(ASK_RESPONSES.suffering)
    // Verify the signal was aborted
    const [, init] = fetchMock.mock.calls[0]
    expect((init.signal as AbortSignal).aborted).toBe(true)
  })

  it('falls back to mock when response JSON has malformed shape', async () => {
    mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: null } }),
    })
    const result = await fetchAskResponse('Why does God allow suffering?')
    expect(result).toBe(ASK_RESPONSES.suffering)
  })
})

describe('fetchAskResponse — edge cases', () => {
  it('sends conversationHistory: null when history arg is omitted', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    await fetchAskResponse('Why?')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.conversationHistory).toBeNull()
  })

  it('treats empty history array as null in body', async () => {
    const fetchMock = mockFetchResolvesOnce({
      ok: true,
      status: 200,
      json: async () => validEnvelope(),
    })

    await fetchAskResponse('Why?', [])

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.conversationHistory).toBeNull()
  })

  it('fallback response always has the full AskResponse shape', async () => {
    mockFetchRejectsOnce(new Error('net'))
    const result = await fetchAskResponse('Why does God allow suffering?')

    expect(result.id).toBeTruthy()
    expect(result.topic).toBeTruthy()
    expect(result.answer).toBeTruthy()
    expect(result.verses).toHaveLength(3)
    expect(result.encouragement).toBeTruthy()
    expect(result.prayer).toBeTruthy()
    expect(result.followUpQuestions).toHaveLength(3)
  })

  it('falls back to mock using keyword match when backend fails', async () => {
    mockFetchRejectsOnce(new Error('net'))
    const result = await fetchAskResponse('Why does God allow suffering?')

    expect(result).toBe(ASK_RESPONSES.suffering)
    expect(result.id).toBe('suffering')
  })
})
