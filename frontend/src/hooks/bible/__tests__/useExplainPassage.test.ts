import { StrictMode } from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGenerateExplanation } = vi.hoisted(() => ({
  mockGenerateExplanation: vi.fn(),
}))

vi.mock('@/lib/ai/geminiClient', () => ({
  generateExplanation: (...args: unknown[]) => mockGenerateExplanation(...args),
}))

import { useExplainPassage, ERROR_COPY } from '../useExplainPassage'
import {
  GeminiApiError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError,
} from '@/lib/ai/errors'

const REFERENCE = '1 Corinthians 13:4-7'
const VERSE_TEXT = 'Love is patient and is kind...'
const SUCCESS_RESULT = {
  content: 'Paul is writing to a factional Corinthian church.',
  model: 'gemini-2.5-flash-lite',
}

beforeEach(() => {
  mockGenerateExplanation.mockReset()
})

describe('useExplainPassage', () => {
  it('starts in loading state before the request resolves', () => {
    mockGenerateExplanation.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
    expect(result.current.status).toBe('loading')
    expect(result.current.result).toBeNull()
    expect(result.current.errorKind).toBeNull()
  })

  it('updates to success with result on resolve', async () => {
    mockGenerateExplanation.mockResolvedValue(SUCCESS_RESULT)
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(result.current.result).toEqual(SUCCESS_RESULT)
    expect(result.current.errorKind).toBeNull()
  })

  it('maps GeminiNetworkError to "network" kind with network copy', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiNetworkError())
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('network')
    expect(result.current.errorMessage).toContain("Couldn't load an explanation")
  })

  it('maps GeminiApiError to "api" kind with temporarily-unavailable copy', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiApiError())
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('api')
    expect(result.current.errorMessage).toContain('temporarily unavailable')
  })

  it('maps GeminiSafetyBlockError to "safety" kind with safety copy', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiSafetyBlockError())
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('safety')
    expect(result.current.errorMessage).toContain('too difficult for our AI helper')
  })

  it('maps GeminiTimeoutError to "timeout" kind with timeout copy', async () => {
    mockGenerateExplanation.mockRejectedValue(new GeminiTimeoutError())
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('timeout')
    expect(result.current.errorMessage).toContain('took too long')
  })

  it('maps unknown errors to "unavailable" kind', async () => {
    mockGenerateExplanation.mockRejectedValue(new Error('something random'))
    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.errorKind).toBe('unavailable')
  })

  it('retry() re-fires the request', async () => {
    mockGenerateExplanation.mockRejectedValueOnce(new GeminiNetworkError())
    mockGenerateExplanation.mockResolvedValueOnce(SUCCESS_RESULT)

    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(2)
  })

  it('retry() resets status to loading before resolving', async () => {
    mockGenerateExplanation.mockRejectedValueOnce(new GeminiNetworkError())
    let resolveSecond: ((v: typeof SUCCESS_RESULT) => void) | undefined
    mockGenerateExplanation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve
        }),
    )

    const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    act(() => {
      result.current.retry()
    })

    expect(result.current.status).toBe('loading')

    // Flush the deferred microtask so the second generateExplanation call
    // runs and captures `resolveSecond`. Without this, the resolve below
    // would be a no-op because the mock hasn't been invoked yet.
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      resolveSecond?.(SUCCESS_RESULT)
    })

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    })
  })

  it('does not call setState after unmount', async () => {
    let resolve: ((v: typeof SUCCESS_RESULT) => void) | undefined
    mockGenerateExplanation.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r
        }),
    )

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

    unmount()

    await act(async () => {
      resolve?.(SUCCESS_RESULT)
      // Flush microtasks
      await Promise.resolve()
    })

    // No React warning about setting state on an unmounted component
    const unmountWarnings = errSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Can't perform a React state update on an unmounted"),
    )
    expect(unmountWarnings.length).toBe(0)
    errSpy.mockRestore()
  })

  it('re-fires when the reference prop changes', async () => {
    mockGenerateExplanation.mockResolvedValue(SUCCESS_RESULT)

    const { result, rerender } = renderHook(
      ({ ref, text }) => useExplainPassage(ref, text),
      { initialProps: { ref: REFERENCE, text: VERSE_TEXT } },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(1)

    rerender({ ref: 'John 3:16', text: 'For God so loved the world.' })

    await waitFor(() => {
      expect(mockGenerateExplanation).toHaveBeenCalledTimes(2)
    })
    expect(mockGenerateExplanation).toHaveBeenLastCalledWith(
      'John 3:16',
      'For God so loved the world.',
      expect.any(AbortSignal),
    )
  })

  describe('AbortController wiring', () => {
    it('passes an AbortSignal as the third argument to generateExplanation', async () => {
      mockGenerateExplanation.mockReturnValue(new Promise(() => {}))
      renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))

      // The hook defers the generateExplanation call by one microtask so
      // that React StrictMode's cleanup can abort stale requests before
      // they fire. Flush the microtask before asserting on call args.
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockGenerateExplanation).toHaveBeenCalledTimes(1)
      const [ref, text, signal] = mockGenerateExplanation.mock.calls[0] as [
        string,
        string,
        AbortSignal,
      ]
      expect(ref).toBe(REFERENCE)
      expect(text).toBe(VERSE_TEXT)
      expect(signal).toBeInstanceOf(AbortSignal)
      expect(signal.aborted).toBe(false)
    })

    it('fires exactly one request when wrapped in React.StrictMode (no dev-mode double-fire)', async () => {
      // This is the critical regression test for the BB-30 StrictMode
      // double-fire bug. Without the queueMicrotask deferral in the hook,
      // React's StrictMode mount → unmount → remount cycle caused the
      // Gemini SDK's synchronous fetch() to dispatch BEFORE the cleanup
      // could abort the first controller, so two real HTTP requests left
      // the browser per Explain click. This test fails loudly if the fix
      // regresses.
      mockGenerateExplanation.mockResolvedValue(SUCCESS_RESULT)

      const { result } = renderHook(
        () => useExplainPassage(REFERENCE, VERSE_TEXT),
        { wrapper: StrictMode },
      )

      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })

      expect(mockGenerateExplanation).toHaveBeenCalledTimes(1)
    })

    it('aborts the in-flight request signal on unmount', async () => {
      let capturedSignal: AbortSignal | undefined
      mockGenerateExplanation.mockImplementation(
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
        useExplainPassage(REFERENCE, VERSE_TEXT),
      )

      expect(result.current.status).toBe('loading')

      // Flush the deferred microtask so the mock actually runs and
      // captures the signal before we unmount.
      await act(async () => {
        await Promise.resolve()
      })

      expect(capturedSignal).toBeInstanceOf(AbortSignal)
      expect(capturedSignal?.aborted).toBe(false)

      unmount()

      // The effect cleanup should have called controller.abort() on the
      // signal the hook handed to generateExplanation.
      expect(capturedSignal?.aborted).toBe(true)

      // Flush microtasks so the rejected-with-AbortError promise settles.
      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      // No React "setState on unmounted" warning — the hook must catch the
      // AbortError silently without attempting to set state.
      const unmountWarnings = errSpy.mock.calls.filter((call) =>
        String(call[0]).includes("Can't perform a React state update on an unmounted"),
      )
      expect(unmountWarnings.length).toBe(0)
      errSpy.mockRestore()
    })

    it('does not transition to error state when a stale request aborts mid-flight', async () => {
      // Scenario: first request is in flight; retry() fires a second
      // request. The first request's AbortController is aborted by the
      // effect cleanup, and the first request rejects with AbortError. That
      // AbortError must NOT overwrite the second request's loading state.
      const firstAbortRejections: Array<() => void> = []
      let resolveSecond: ((v: typeof SUCCESS_RESULT) => void) | undefined

      mockGenerateExplanation.mockImplementationOnce(
        (_ref: string, _text: string, signal?: AbortSignal) =>
          new Promise((_resolve, reject) => {
            const fire = () => {
              const abortErr = new Error('aborted')
              abortErr.name = 'AbortError'
              reject(abortErr)
            }
            // Defer rejection until after retry() has re-rendered, so the
            // stale rejection races the new loading state.
            signal?.addEventListener('abort', () => {
              firstAbortRejections.push(fire)
            })
          }),
      )
      mockGenerateExplanation.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

      const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
      expect(result.current.status).toBe('loading')

      // Flush the first effect's deferred microtask so the first mock runs
      // and registers its abort listener.
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGenerateExplanation).toHaveBeenCalledTimes(1)

      // Retry fires a new request. The first effect's cleanup aborts the
      // first AbortController; the second request's microtask is scheduled.
      act(() => {
        result.current.retry()
      })
      expect(result.current.status).toBe('loading')

      // Flush the second effect's deferred microtask so the second mock runs.
      await act(async () => {
        await Promise.resolve()
      })
      expect(mockGenerateExplanation).toHaveBeenCalledTimes(2)

      // Now let the first promise's AbortError reject and flush microtasks.
      await act(async () => {
        firstAbortRejections.forEach((fn) => fn())
        await Promise.resolve()
        await Promise.resolve()
      })

      // Status MUST still be loading (not error) — the AbortError from the
      // stale first request was silently discarded.
      expect(result.current.status).toBe('loading')
      expect(result.current.errorKind).toBeNull()

      // Resolve the second request and verify normal success flow still works.
      await act(async () => {
        resolveSecond?.(SUCCESS_RESULT)
      })
      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })
      expect(result.current.result).toEqual(SUCCESS_RESULT)
    })
  })

  // ────────────────────────────────────────────────────────────────────────
  // BB-32 — rate-limit error path
  // ────────────────────────────────────────────────────────────────────────

  describe('rate-limit error kind (BB-32)', () => {
    it('maps RateLimitError to the "rate-limit" kind', async () => {
      mockGenerateExplanation.mockRejectedValue(new RateLimitError(8))
      const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.errorKind).toBe('rate-limit')
    })

    it('exposes retryAfterSeconds from the RateLimitError on state', async () => {
      mockGenerateExplanation.mockRejectedValue(new RateLimitError(12))
      const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.retryAfterSeconds).toBe(12)
    })

    it('leaves retryAfterSeconds null in the success state', async () => {
      mockGenerateExplanation.mockResolvedValue(SUCCESS_RESULT)
      const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
      await waitFor(() => {
        expect(result.current.status).toBe('success')
      })
      expect(result.current.retryAfterSeconds).toBeNull()
    })

    it('leaves retryAfterSeconds null for non-rate-limit error kinds', async () => {
      mockGenerateExplanation.mockRejectedValue(new GeminiNetworkError())
      const { result } = renderHook(() => useExplainPassage(REFERENCE, VERSE_TEXT))
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
