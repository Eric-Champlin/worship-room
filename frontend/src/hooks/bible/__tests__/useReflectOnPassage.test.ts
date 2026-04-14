import { StrictMode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGenerateReflection } = vi.hoisted(() => ({
  mockGenerateReflection: vi.fn(),
}))

vi.mock('@/lib/ai/geminiClient', () => ({
  generateReflection: (...args: unknown[]) => mockGenerateReflection(...args),
}))

import { useReflectOnPassage, ERROR_COPY } from '../useReflectOnPassage'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'

const REFERENCE = 'Philippians 4:6-7'
const VERSE_TEXT = 'In nothing be anxious, but in everything...'
const SUCCESS_RESULT = {
  content: 'A reader might ask what it would mean to hold this passage gently.',
  model: 'gemini-2.5-flash-lite',
}

beforeEach(() => {
  mockGenerateReflection.mockReset()
})

describe('useReflectOnPassage', () => {
  it('starts in loading state before the request resolves', () => {
    mockGenerateReflection.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )
    expect(result.current.status).toBe('loading')
    expect(result.current.result).toBeNull()
    expect(result.current.errorKind).toBeNull()
  })

  it('updates to success with result on resolve', async () => {
    mockGenerateReflection.mockResolvedValue(SUCCESS_RESULT)
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.result).toEqual(SUCCESS_RESULT)
    expect(result.current.errorKind).toBeNull()
  })

  it('maps GeminiNetworkError to "network" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiNetworkError())
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('network')
    expect(result.current.errorMessage).toContain("Couldn't load")
  })

  it('maps GeminiApiError to "api" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiApiError())
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('api')
    expect(result.current.errorMessage).toContain('temporarily unavailable')
  })

  it('maps GeminiSafetyBlockError to "safety" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiSafetyBlockError())
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('safety')
    // Reuses BB-30 safety copy verbatim per spec — it still says "explain"
    expect(result.current.errorMessage).toContain('too difficult for our AI helper')
  })

  it('maps GeminiTimeoutError to "timeout" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiTimeoutError())
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('timeout')
    expect(result.current.errorMessage).toContain('took too long')
  })

  it('maps GeminiKeyMissingError to "unavailable" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new GeminiKeyMissingError())
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('unavailable')
    expect(result.current.errorMessage).toContain('temporarily unavailable')
  })

  it('maps unknown errors to "unavailable" kind', async () => {
    mockGenerateReflection.mockRejectedValue(new Error('something random'))
    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('unavailable')
  })

  it('does not fire the request when reference is empty', async () => {
    mockGenerateReflection.mockResolvedValue(SUCCESS_RESULT)
    renderHook(() => useReflectOnPassage('', VERSE_TEXT))

    // Flush any pending microtasks
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockGenerateReflection).not.toHaveBeenCalled()
  })

  it('does not fire the request when verseText is empty', async () => {
    mockGenerateReflection.mockResolvedValue(SUCCESS_RESULT)
    renderHook(() => useReflectOnPassage(REFERENCE, ''))

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockGenerateReflection).not.toHaveBeenCalled()
  })

  it('retry() re-fires the request', async () => {
    mockGenerateReflection.mockRejectedValueOnce(new GeminiNetworkError())
    mockGenerateReflection.mockResolvedValueOnce(SUCCESS_RESULT)

    const { result } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(mockGenerateReflection).toHaveBeenCalledTimes(2)
  })

  it('does not call setState after unmount', async () => {
    let resolve: ((v: typeof SUCCESS_RESULT) => void) | undefined
    mockGenerateReflection.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    unmount()

    await act(async () => {
      resolve?.(SUCCESS_RESULT)
      await Promise.resolve()
    })

    const unmountWarnings = errSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Can't perform a React state update on an unmounted"),
    )
    expect(unmountWarnings.length).toBe(0)
    errSpy.mockRestore()
  })

  it('passes an AbortSignal as the third argument to generateReflection', async () => {
    mockGenerateReflection.mockReturnValue(new Promise(() => {}))
    renderHook(() => useReflectOnPassage(REFERENCE, VERSE_TEXT))

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockGenerateReflection).toHaveBeenCalledTimes(1)
    const [ref, text, signal] = mockGenerateReflection.mock.calls[0] as [
      string,
      string,
      AbortSignal,
    ]
    expect(ref).toBe(REFERENCE)
    expect(text).toBe(VERSE_TEXT)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
  })

  it('fires exactly one request when wrapped in React.StrictMode', async () => {
    mockGenerateReflection.mockResolvedValue(SUCCESS_RESULT)

    const { result } = renderHook(
      () => useReflectOnPassage(REFERENCE, VERSE_TEXT),
      { wrapper: StrictMode },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })

    expect(mockGenerateReflection).toHaveBeenCalledTimes(1)
  })

  it('aborts the in-flight request signal on unmount', async () => {
    let capturedSignal: AbortSignal | undefined
    mockGenerateReflection.mockImplementation(
      (_ref: string, _text: string, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          capturedSignal = signal
          signal?.addEventListener('abort', () => {
            const abortErr = new Error('aborted')
            abortErr.name = 'AbortError'
            reject(abortErr)
          })
        }),
    )

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() =>
      useReflectOnPassage(REFERENCE, VERSE_TEXT),
    )

    expect(result.current.status).toBe('loading')

    await act(async () => {
      await Promise.resolve()
    })

    expect(capturedSignal).toBeInstanceOf(AbortSignal)
    expect(capturedSignal?.aborted).toBe(false)

    unmount()

    expect(capturedSignal?.aborted).toBe(true)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const unmountWarnings = errSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Can't perform a React state update on an unmounted"),
    )
    expect(unmountWarnings.length).toBe(0)
    errSpy.mockRestore()
  })

  // ────────────────────────────────────────────────────────────────────────
  // BB-32 — rate-limit error path
  // ────────────────────────────────────────────────────────────────────────

  describe('rate-limit error kind (BB-32)', () => {
    it('maps RateLimitError to the "rate-limit" kind', async () => {
      mockGenerateReflection.mockRejectedValue(new RateLimitError(8))
      const { result } = renderHook(() => useReflectOnPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.errorKind).toBe('rate-limit')
    })

    it('exposes retryAfterSeconds from the RateLimitError on state', async () => {
      mockGenerateReflection.mockRejectedValue(new RateLimitError(12))
      const { result } = renderHook(() => useReflectOnPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.retryAfterSeconds).toBe(12)
    })

    it('leaves retryAfterSeconds null in the success state', async () => {
      mockGenerateReflection.mockResolvedValue(SUCCESS_RESULT)
      const { result } = renderHook(() => useReflectOnPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })
      expect(result.current.retryAfterSeconds).toBeNull()
    })

    it('leaves retryAfterSeconds null for non-rate-limit error kinds', async () => {
      mockGenerateReflection.mockRejectedValue(new GeminiNetworkError())
      const { result } = renderHook(() => useReflectOnPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.errorKind).toBe('network')
      expect(result.current.retryAfterSeconds).toBeNull()
    })

    it('ERROR_COPY["rate-limit"] contains the {seconds} placeholder', () => {
      expect(ERROR_COPY['rate-limit']).toContain('{seconds}')
      expect(ERROR_COPY['rate-limit']).toMatch(/Try again in \{seconds\} seconds/)
    })
  })
})
