/**
 * BB-44 — useReadAlongScroll hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock useReducedMotion
let mockReducedMotion = false
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

import { useReadAlongScroll } from '@/hooks/bible/useReadAlongScroll'

describe('BB-44 useReadAlongScroll', () => {
  let scrollBySpy: ReturnType<typeof vi.fn>
  let addEventListenerSpy: ReturnType<typeof vi.fn>
  let removeEventListenerSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockReducedMotion = false
    scrollBySpy = vi.fn()
    window.scrollBy = scrollBySpy

    // Track scroll listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  function createVerseElement(verseNumber: number, top = 500) {
    const el = document.createElement('span')
    el.id = `verse-${verseNumber}`
    el.getBoundingClientRect = vi.fn().mockReturnValue({
      top,
      left: 0,
      right: 100,
      bottom: top + 20,
      width: 100,
      height: 20,
    })
    document.body.appendChild(el)
    return el
  }

  it('when disabled, no scroll listeners are added', () => {
    renderHook(() =>
      useReadAlongScroll({ readAlongVerse: null, enabled: false }),
    )
    const scrollCalls = addEventListenerSpy.mock.calls.filter(
      (c: unknown[]) => c[0] === 'scroll',
    )
    expect(scrollCalls).toHaveLength(0)
  })

  it('when verse changes and element exists, auto-scroll fires', () => {
    createVerseElement(5, 500)
    // Mock innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: null as number | null } },
    )

    rerender({ verse: 5 })

    // scrollBy should have been called to position verse at 1/3 viewport
    expect(scrollBySpy).toHaveBeenCalledTimes(1)
    const call = scrollBySpy.mock.calls[0][0]
    expect(call.behavior).toBe('smooth')
    // 500 - (900/3) = 200
    expect(call.top).toBe(200)
  })

  it('auto-scroll uses behavior "instant" when reduced motion is true', () => {
    mockReducedMotion = true
    createVerseElement(5, 500)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: null as number | null } },
    )

    rerender({ verse: 5 })

    expect(scrollBySpy).toHaveBeenCalledTimes(1)
    expect(scrollBySpy.mock.calls[0][0].behavior).toBe('instant')
  })

  it('skips auto-scroll when verse element is already in viewport within tolerance', () => {
    // Position at roughly the target Y (1/3 of viewport = 300)
    createVerseElement(5, 310)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: null as number | null } },
    )

    rerender({ verse: 5 })

    // 310 - 300 = 10, which is < 50 tolerance
    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('when readAlongVerse becomes null, no auto-scroll fires', () => {
    createVerseElement(5, 500)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: 5 as number | null } },
    )

    scrollBySpy.mockClear()
    rerender({ verse: null })

    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('cleanup removes scroll listener and clears timeouts', () => {
    const { unmount } = renderHook(() =>
      useReadAlongScroll({ readAlongVerse: 1, enabled: true }),
    )

    unmount()

    const scrollRemoves = removeEventListenerSpy.mock.calls.filter(
      (c: unknown[]) => c[0] === 'scroll',
    )
    expect(scrollRemoves.length).toBeGreaterThanOrEqual(1)
  })

  // ─── F4: Manual-scroll-override tests ───────────────────────────────

  it('manual scroll suppresses auto-scroll on next verse change', () => {
    createVerseElement(5, 500)
    createVerseElement(6, 600)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: 5 as number | null } },
    )

    // The initial render triggered auto-scroll for verse 5, which sets
    // isAutoScrollingRef = true. Advance past the settle timeout (600ms)
    // so scroll events are no longer treated as programmatic.
    vi.advanceTimersByTime(600)
    scrollBySpy.mockClear()

    // Simulate a user scroll event
    window.dispatchEvent(new Event('scroll'))

    // Now change the verse — auto-scroll should be suppressed because
    // the user is scrolling
    rerender({ verse: 6 })

    expect(scrollBySpy).not.toHaveBeenCalled()
  })

  it('after 5 seconds of no user scroll, auto-scroll resumes', () => {
    createVerseElement(5, 500)
    createVerseElement(6, 600)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: 5 as number | null } },
    )

    // Let the auto-scroll settle timeout (600ms) clear isAutoScrollingRef
    vi.advanceTimersByTime(600)
    scrollBySpy.mockClear()

    // Simulate a user scroll
    window.dispatchEvent(new Event('scroll'))

    // Advance 4999ms — still suppressed
    vi.advanceTimersByTime(4999)
    rerender({ verse: 6 })
    expect(scrollBySpy).not.toHaveBeenCalled()

    // Advance 1ms more (total 5000ms) — user-is-scrolling should clear.
    // The timeout callback also scrolls back to the current verse, so
    // scrollBy fires from the timeout resume.
    vi.advanceTimersByTime(1)
    scrollBySpy.mockClear()

    // Now a new verse change should auto-scroll
    createVerseElement(7, 700)
    rerender({ verse: 7 })
    expect(scrollBySpy).toHaveBeenCalled()
  })

  it('programmatic scrolls (auto-scroll) do not trigger manual-scroll detection', () => {
    createVerseElement(5, 500)
    createVerseElement(6, 600)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: null as number | null } },
    )

    // Trigger an auto-scroll by changing the verse — this sets
    // isAutoScrollingRef = true before the scroll fires
    rerender({ verse: 5 })
    expect(scrollBySpy).toHaveBeenCalledTimes(1)
    scrollBySpy.mockClear()

    // The scroll event that results from the programmatic scrollBy
    // fires while isAutoScrollingRef is true. Simulate it:
    window.dispatchEvent(new Event('scroll'))

    // Now change the verse again — if the programmatic scroll was
    // incorrectly treated as a manual scroll, this would be suppressed.
    // Instead, auto-scroll should fire normally.
    createVerseElement(6, 600)
    rerender({ verse: 6 })
    expect(scrollBySpy).toHaveBeenCalledTimes(1)
  })

  it('user scroll timer resets on each scroll event', () => {
    createVerseElement(5, 500)
    createVerseElement(6, 600)
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })

    const { rerender } = renderHook(
      ({ verse }) =>
        useReadAlongScroll({ readAlongVerse: verse, enabled: true }),
      { initialProps: { verse: 5 as number | null } },
    )

    // Let auto-scroll settle so scroll events are detected as user-initiated
    vi.advanceTimersByTime(600)
    scrollBySpy.mockClear()

    // First user scroll
    window.dispatchEvent(new Event('scroll'))
    // Wait 3 seconds
    vi.advanceTimersByTime(3000)
    // Second user scroll — timer should reset
    window.dispatchEvent(new Event('scroll'))
    // Wait 3 more seconds (6s total since first scroll, 3s since second)
    vi.advanceTimersByTime(3000)

    // Should still be suppressed — only 3s since last scroll, not 5s
    rerender({ verse: 6 })
    expect(scrollBySpy).not.toHaveBeenCalled()

    // Wait 2 more seconds (5s since last scroll)
    vi.advanceTimersByTime(2000)
    scrollBySpy.mockClear()

    // Now auto-scroll should resume
    createVerseElement(7, 700)
    rerender({ verse: 7 })
    expect(scrollBySpy).toHaveBeenCalled()
  })
})
