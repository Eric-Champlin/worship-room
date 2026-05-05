import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { BIBLE_PROGRESS_KEY } from '@/constants/bible'

import { useBibleProgress, markChapterRead, _resetForTesting } from '../useBibleProgress'

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
})

describe('useBibleProgress', () => {
  it('returns empty progress when no data in localStorage', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('returns the 7-property hook contract (regression guard)', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current).toEqual({
      progress: expect.any(Object),
      markChapterRead: expect.any(Function),
      getBookProgress: expect.any(Function),
      isChapterRead: expect.any(Function),
      justCompletedBook: null,
      clearJustCompletedBook: expect.any(Function),
      getCompletedBookCount: expect.any(Function),
    })
  })

  it('markChapterRead writes progress for any user (Spec 8B — auth gate removed)', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('genesis', 1))
    expect(result.current.progress).toEqual({ genesis: [1] })
    const stored = JSON.parse(localStorage.getItem(BIBLE_PROGRESS_KEY)!)
    expect(stored).toEqual({ genesis: [1] })
  })

  it('markChapterRead is idempotent (no duplicates)', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('genesis', 1))
    act(() => result.current.markChapterRead('genesis', 1))
    expect(result.current.progress).toEqual({ genesis: [1] })
  })

  it('markChapterRead tracks multiple chapters', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('genesis', 1))
    act(() => result.current.markChapterRead('genesis', 3))
    act(() => result.current.markChapterRead('john', 1))
    expect(result.current.progress).toEqual({
      genesis: [1, 3],
      john: [1],
    })
  })

  it('getBookProgress returns chapters from localStorage (Spec 8B — auth gate removed)', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 2] }))
    _resetForTesting() // force cache re-read
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('genesis')).toEqual([1, 2])
  })

  it('getBookProgress returns correct chapters for tracked books', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 2, 5] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('genesis')).toEqual([1, 2, 5])
  })

  it('getBookProgress returns empty array for untracked book', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('exodus')).toEqual([])
  })

  it('isChapterRead returns true for read chapters (Spec 8B — auth gate removed)', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 1)).toBe(true)
  })

  it('isChapterRead returns true for read chapters', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 3] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 1)).toBe(true)
    expect(result.current.isChapterRead('genesis', 3)).toBe(true)
  })

  it('isChapterRead returns false for unread chapters', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 2)).toBe(false)
  })

  it('corrupted JSON in localStorage recovers to empty object', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, 'not valid json!!!')
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('non-object JSON in localStorage recovers to empty object', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, '"just a string"')
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('progress persists across hook re-mounts', () => {
    const { result, unmount } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('john', 3))
    unmount()
    const { result: result2 } = renderHook(() => useBibleProgress())
    expect(result2.current.getBookProgress('john')).toEqual([3])
  })

  it('markChapterRead sets justCompletedBook when all chapters read', () => {
    // Ruth has 4 chapters — mark 3, then the last one
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.justCompletedBook).toBeNull()
    act(() => result.current.markChapterRead('ruth', 4))
    expect(result.current.justCompletedBook).toBe('ruth')
  })

  it('markChapterRead does not set justCompletedBook for partial completion', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('genesis', 1))
    expect(result.current.justCompletedBook).toBeNull()
  })

  it('clearJustCompletedBook resets to null', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('ruth', 4))
    expect(result.current.justCompletedBook).toBe('ruth')
    act(() => result.current.clearJustCompletedBook())
    expect(result.current.justCompletedBook).toBeNull()
  })

  it('getCompletedBookCount returns correct count', () => {
    // Ruth (4) + Obadiah (1) + Philemon (1) = 3 complete books
    localStorage.setItem(
      BIBLE_PROGRESS_KEY,
      JSON.stringify({
        ruth: [1, 2, 3, 4],
        obadiah: [1],
        philemon: [1],
        genesis: [1, 2], // incomplete
      }),
    )
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getCompletedBookCount()).toBe(3)
  })

  it('getCompletedBookCount counts books for any user (Spec 8B — auth gate removed)', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3, 4] }))
    _resetForTesting()
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getCompletedBookCount()).toBe(1)
  })
})

describe('useBibleProgress reactive store (Spec 8B Change 5)', () => {
  it('updates reactively when markChapterRead is called from outside the component', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})

    act(() => {
      markChapterRead('john', 3) // module-level export, NOT through the hook
    })

    expect(result.current.progress).toEqual({ john: [3] })
    expect(result.current.isChapterRead('john', 3)).toBe(true)
  })

  it('cross-component subscriptions update when one component mutates', () => {
    function ConsumerA() {
      const { progress } = useBibleProgress()
      return <span data-testid="a">{Object.keys(progress).length}</span>
    }
    function ConsumerB() {
      const { progress } = useBibleProgress()
      return <span data-testid="b">{progress.john?.length ?? 0}</span>
    }

    render(
      <>
        <ConsumerA />
        <ConsumerB />
      </>,
    )
    expect(screen.getByTestId('a').textContent).toBe('0')
    expect(screen.getByTestId('b').textContent).toBe('0')

    act(() => {
      markChapterRead('john', 3)
    })

    expect(screen.getByTestId('a').textContent).toBe('1')
    expect(screen.getByTestId('b').textContent).toBe('1')
  })

  it('module-level markChapterRead writes through to localStorage', () => {
    act(() => {
      markChapterRead('john', 3)
    })
    expect(JSON.parse(localStorage.getItem(BIBLE_PROGRESS_KEY)!)).toEqual({ john: [3] })
  })

  it('cross-tab storage event invalidates cache and notifies listeners', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})

    // Simulate another tab writing
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ romans: [8] }))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: BIBLE_PROGRESS_KEY }))
    })
    expect(result.current.progress).toEqual({ romans: [8] })
  })

  it('storage event for unrelated key does not invalidate cache', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => {
      markChapterRead('john', 3)
    })
    expect(result.current.progress).toEqual({ john: [3] })

    // Simulate another key changing
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'wr_some_other_key' }))
    })
    expect(result.current.progress).toEqual({ john: [3] })
  })

  it('module-level markChapterRead returns justCompletedBook metadata', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3] }))
    _resetForTesting()

    const partial = markChapterRead('genesis', 1)
    expect(partial.justCompletedBook).toBeNull()

    const completing = markChapterRead('ruth', 4)
    expect(completing.justCompletedBook).toBe('ruth')
  })

  it('module-level markChapterRead is idempotent', () => {
    markChapterRead('john', 3)
    markChapterRead('john', 3)
    expect(JSON.parse(localStorage.getItem(BIBLE_PROGRESS_KEY)!)).toEqual({ john: [3] })
  })
})
