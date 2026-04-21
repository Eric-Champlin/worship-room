import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// The fetch mock is the single mocking surface after the proxy migration.
// No SDK to stub, no env to mock — the client just POSTs to the backend.
const mockFetch = vi.fn()

import {
  generateExplanation,
  generateReflection,
  __resetGeminiClientForTests,
} from '../geminiClient'
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '../errors'
import { clearAllAICache } from '../cache'
import { getRateLimitState, resetRateLimitForTests } from '../rateLimit'

const REFERENCE = '1 Corinthians 13:4-7'
const VERSE_TEXT = "Love is patient and is kind; love doesn't envy."

// Helper: build a mock Response for a success case.
function okResponse(content: string, model = 'gemini-2.5-flash-lite'): Response {
  return new Response(
    JSON.stringify({
      data: { content, model },
      meta: { requestId: 'test-req-id-22chars0000' },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

// Helper: build a mock Response for a backend error case.
function errorResponse(
  status: number,
  code: string,
  message = 'err',
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      code,
      message,
      requestId: 'test-req-id-22chars0000',
      timestamp: '2026-04-21T10:30:00Z',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    },
  )
}

beforeEach(() => {
  __resetGeminiClientForTests()
  mockFetch.mockReset()
  // Vitest's stubGlobal sets global fetch for this test only.
  vi.stubGlobal('fetch', mockFetch)
  clearAllAICache()
  resetRateLimitForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateExplanation — happy path', () => {
  it('posts to /api/v1/proxy/ai/explain with correct body', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse('Paul is writing to a factional church.'),
    )

    const result = await generateExplanation(REFERENCE, VERSE_TEXT)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/explain$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      reference: REFERENCE,
      verseText: VERSE_TEXT,
    })
    expect(result).toEqual({
      content: 'Paul is writing to a factional church.',
      model: 'gemini-2.5-flash-lite',
    })
  })

  it('returns ExplainResult shape {content, model}', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('Some explanation.'))
    const result = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(result).toHaveProperty('content')
    expect(result).toHaveProperty('model')
  })

  it('passes the caller-provided AbortSignal into fetch', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('ok'))
    const controller = new AbortController()

    await generateExplanation(REFERENCE, VERSE_TEXT, controller.signal)

    const [, init] = mockFetch.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('generateReflection — happy path', () => {
  it('posts to /api/v1/proxy/ai/reflect with correct body', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('A reader might ask...'))

    const result = await generateReflection(REFERENCE, VERSE_TEXT)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/proxy\/ai\/reflect$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      reference: REFERENCE,
      verseText: VERSE_TEXT,
    })
    expect(result).toEqual({
      content: 'A reader might ask...',
      model: 'gemini-2.5-flash-lite',
    })
  })
})

describe('Abort semantics', () => {
  it('re-throws caller-driven AbortError unchanged', async () => {
    const controller = new AbortController()
    mockFetch.mockImplementationOnce(() => {
      controller.abort()
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    await expect(
      generateExplanation(REFERENCE, VERSE_TEXT, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('internal AbortSignal.timeout (TimeoutError) maps to GeminiTimeoutError', async () => {
    mockFetch.mockRejectedValueOnce(
      new DOMException('timed out', 'TimeoutError'),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('AbortError from a non-caller source is surfaced as GeminiTimeoutError', async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })
})

describe('Network failures', () => {
  it('TypeError from fetch maps to GeminiNetworkError', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiNetworkError,
    )
  })

  it('network-ish error message also maps to GeminiNetworkError', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network unreachable'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiNetworkError,
    )
  })

  it('unknown Error type maps to GeminiApiError', async () => {
    mockFetch.mockRejectedValueOnce(new Error('something odd happened'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })
})

describe('Backend error code mapping', () => {
  it('502 UPSTREAM_ERROR maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(502, 'UPSTREAM_ERROR', 'upstream down'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('504 UPSTREAM_TIMEOUT maps to GeminiTimeoutError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(504, 'UPSTREAM_TIMEOUT', 'slow'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('422 SAFETY_BLOCK maps to GeminiSafetyBlockError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(422, 'SAFETY_BLOCK', 'blocked'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('429 RATE_LIMITED maps to RateLimitError with Retry-After seconds', async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(429, 'RATE_LIMITED', 'slow down', { 'Retry-After': '17' }),
    )

    const err = await generateExplanation(REFERENCE, VERSE_TEXT).catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).retryAfterSeconds).toBe(17)
  })

  it('429 RATE_LIMITED with missing Retry-After defaults to 60 seconds', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(429, 'RATE_LIMITED', 'slow down'))

    const err = await generateExplanation(REFERENCE, VERSE_TEXT).catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).retryAfterSeconds).toBe(60)
  })

  it('429 RATE_LIMITED with unparseable Retry-After falls back to 1 second minimum', async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(429, 'RATE_LIMITED', 'slow down', { 'Retry-After': 'abc' }),
    )

    const err = await generateExplanation(REFERENCE, VERSE_TEXT).catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it('400 INVALID_INPUT maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, 'INVALID_INPUT', 'bad input'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('500 INTERNAL_ERROR maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'INTERNAL_ERROR', 'server error'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('unknown error code maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(418, 'TEAPOT', 'short and stout'))

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })
})

describe('Malformed backend responses', () => {
  it('malformed JSON body maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('not json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('missing data.content maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { model: 'gemini-2.5-flash-lite' }, meta: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('missing data.model maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ data: { content: 'some text' }, meta: {} }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('empty data object maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {}, meta: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('error response with unparseable body still maps to GeminiApiError', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('not json', {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })
})

describe('BB-32 cache composition', () => {
  it('cache hit short-circuits the network call', async () => {
    // First call populates the cache.
    mockFetch.mockResolvedValueOnce(okResponse('cached explanation'))
    const first = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(first.content).toBe('cached explanation')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call for the same reference+verse should hit the cache —
    // NO fetch should be issued.
    const second = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(second.content).toBe('cached explanation')
    expect(mockFetch).toHaveBeenCalledTimes(1) // still 1, no new call
  })

  it('different references miss the cache (fetch called again)', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('first'))
    await generateExplanation('John 3:16', VERSE_TEXT)

    mockFetch.mockResolvedValueOnce(okResponse('second'))
    await generateExplanation('John 3:17', VERSE_TEXT)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('explain and reflect use separate cache partitions', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('explain result'))
    await generateExplanation(REFERENCE, VERSE_TEXT)

    mockFetch.mockResolvedValueOnce(okResponse('reflect result'))
    const reflectResult = await generateReflection(REFERENCE, VERSE_TEXT)

    expect(reflectResult.content).toBe('reflect result')
    expect(mockFetch).toHaveBeenCalledTimes(2) // not cache hit
  })

  it('errors are NOT cached — second call after error fires fresh fetch', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(502, 'UPSTREAM_ERROR'))
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )

    mockFetch.mockResolvedValueOnce(okResponse('recovered'))
    const result = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(result.content).toBe('recovered')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('BB-32 rate-limit composition', () => {
  it('rate-limit denial throws BEFORE the fetch', async () => {
    // Exhaust the client-side rate limit bucket synchronously.
    // (getRateLimitState gives visibility; we drive by repeated calls.)
    // Easier: fill the bucket with a loop of mocked successes, then
    // observe that the next call hits the limiter.
    const stateBefore = getRateLimitState('explain')
    const capacity = stateBefore.tokensRemaining

    // Burn all tokens with successful calls, each using a distinct ref to
    // avoid the cache. `okResponse` is cheap; we mock `capacity` of them.
    for (let i = 0; i < capacity; i++) {
      mockFetch.mockResolvedValueOnce(okResponse(`burn ${i}`))
      await generateExplanation(`Ref ${i}`, VERSE_TEXT)
    }

    // Bucket is now empty. Next call should throw RateLimitError without
    // issuing a fetch.
    mockFetch.mockResolvedValueOnce(okResponse('should not reach'))
    await expect(
      generateExplanation('Ref after burn', VERSE_TEXT),
    ).rejects.toBeInstanceOf(RateLimitError)

    // Verify fetch was NOT called for the denied attempt.
    expect(mockFetch).toHaveBeenCalledTimes(capacity) // only the burn calls
  })
})

describe('__resetGeminiClientForTests', () => {
  it('clears the cache and rate-limit state', async () => {
    // Populate cache
    mockFetch.mockResolvedValueOnce(okResponse('cached'))
    await generateExplanation(REFERENCE, VERSE_TEXT)

    // Reset
    __resetGeminiClientForTests()

    // Next call should hit the network again (cache was cleared)
    mockFetch.mockResolvedValueOnce(okResponse('fresh'))
    const result = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(result.content).toBe('fresh')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('Request body shape', () => {
  it('body contains reference and verseText exactly, no extra fields', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('ok'))
    await generateExplanation(REFERENCE, VERSE_TEXT)

    const [, init] = mockFetch.mock.calls[0]
    const body = JSON.parse(init.body as string)
    expect(Object.keys(body).sort()).toEqual(['reference', 'verseText'])
  })

  it('body does not include system prompt (backend owns prompts)', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('ok'))
    await generateExplanation(REFERENCE, VERSE_TEXT)

    const [, init] = mockFetch.mock.calls[0]
    const bodyStr = init.body as string
    expect(bodyStr).not.toMatch(/systemInstruction/i)
    expect(bodyStr).not.toMatch(/thoughtful biblical scholar/i)
  })
})
