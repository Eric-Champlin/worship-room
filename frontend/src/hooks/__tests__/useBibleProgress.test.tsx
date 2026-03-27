import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BIBLE_PROGRESS_KEY } from '@/constants/bible'

import { useBibleProgress } from '../useBibleProgress'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

describe('useBibleProgress', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('returns empty progress when no data in localStorage', () => {
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('markChapterRead no-ops when not authenticated', () => {
    const { result } = renderHook(() => useBibleProgress())
    act(() => result.current.markChapterRead('genesis', 1))
    expect(result.current.progress).toEqual({})
    expect(localStorage.getItem(BIBLE_PROGRESS_KEY)).toBeNull()
  })

  it('markChapterRead adds chapter to book progress when authenticated', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('genesis', 1))

    expect(result.current.progress).toEqual({ genesis: [1] })
    const stored = JSON.parse(localStorage.getItem(BIBLE_PROGRESS_KEY)!)
    expect(stored).toEqual({ genesis: [1] })
  })

  it('markChapterRead is idempotent (no duplicates)', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('genesis', 1))
    act(() => result.current.markChapterRead('genesis', 1))

    expect(result.current.progress).toEqual({ genesis: [1] })
  })

  it('markChapterRead tracks multiple chapters', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('genesis', 1))
    act(() => result.current.markChapterRead('genesis', 3))
    act(() => result.current.markChapterRead('john', 1))

    expect(result.current.progress).toEqual({
      genesis: [1, 3],
      john: [1],
    })
  })

  it('getBookProgress returns empty array when not authenticated', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 2] }))
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('genesis')).toEqual([])
  })

  it('getBookProgress returns correct chapters when authenticated', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 2, 5] }))
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('genesis')).toEqual([1, 2, 5])
  })

  it('getBookProgress returns empty array for untracked book', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getBookProgress('exodus')).toEqual([])
  })

  it('isChapterRead returns false when not authenticated', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1] }))
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 1)).toBe(false)
  })

  it('isChapterRead returns true for read chapters', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1, 3] }))
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 1)).toBe(true)
    expect(result.current.isChapterRead('genesis', 3)).toBe(true)
  })

  it('isChapterRead returns false for unread chapters', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ genesis: [1] }))
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.isChapterRead('genesis', 2)).toBe(false)
  })

  it('corrupted JSON in localStorage recovers to empty object', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, 'not valid json!!!')
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('non-object JSON in localStorage recovers to empty object', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, '"just a string"')
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.progress).toEqual({})
  })

  it('progress persists across hook re-mounts', () => {
    mockAuth.isAuthenticated = true
    const { result, unmount } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('john', 3))
    unmount()

    const { result: result2 } = renderHook(() => useBibleProgress())
    expect(result2.current.getBookProgress('john')).toEqual([3])
  })

  it('markChapterRead sets justCompletedBook when all chapters read', () => {
    mockAuth.isAuthenticated = true
    // Ruth has 4 chapters — mark 3, then the last one
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3] }))
    const { result } = renderHook(() => useBibleProgress())

    expect(result.current.justCompletedBook).toBeNull()

    act(() => result.current.markChapterRead('ruth', 4))

    expect(result.current.justCompletedBook).toBe('ruth')
  })

  it('markChapterRead does not set justCompletedBook for partial completion', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('genesis', 1))

    expect(result.current.justCompletedBook).toBeNull()
  })

  it('clearJustCompletedBook resets to null', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({ ruth: [1, 2, 3] }))
    const { result } = renderHook(() => useBibleProgress())

    act(() => result.current.markChapterRead('ruth', 4))
    expect(result.current.justCompletedBook).toBe('ruth')

    act(() => result.current.clearJustCompletedBook())
    expect(result.current.justCompletedBook).toBeNull()
  })

  it('getCompletedBookCount returns correct count', () => {
    mockAuth.isAuthenticated = true
    // Ruth (4 chapters) + Obadiah (1 chapter) + Philemon (1 chapter) = 3 complete books
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({
      ruth: [1, 2, 3, 4],
      obadiah: [1],
      philemon: [1],
      genesis: [1, 2], // incomplete
    }))
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getCompletedBookCount()).toBe(3)
  })

  it('getCompletedBookCount returns 0 when not authenticated', () => {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify({
      ruth: [1, 2, 3, 4],
    }))
    const { result } = renderHook(() => useBibleProgress())
    expect(result.current.getCompletedBookCount()).toBe(0)
  })
})
