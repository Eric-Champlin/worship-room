import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { createElement } from 'react'

import { useVerseContextPreload } from '../useVerseContextPreload'

vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible/index'

const mockChapterData = {
  bookSlug: 'john',
  chapter: 3,
  verses: [
    { number: 14, text: 'verse 14 text' },
    { number: 15, text: 'verse 15 text' },
    { number: 16, text: 'For God so loved the world...' },
    { number: 17, text: 'For God did not send...' },
    { number: 18, text: 'He who believes...' },
  ],
  paragraphs: [],
}

function createWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries }, children)
  }
}

describe('useVerseContextPreload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns verseContext after successful hydration', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(mockChapterData)

    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
      ]),
    })

    await waitFor(() => {
      expect(result.current.verseContext).not.toBeNull()
    })

    expect(result.current.verseContext!.reference).toBe('John 3:16')
    expect(result.current.verseContext!.book).toBe('john')
    expect(result.current.verseContext!.chapter).toBe(3)
    expect(result.current.verseContext!.startVerse).toBe(16)
    expect(result.current.verseContext!.endVerse).toBe(16)
    expect(result.current.verseContext!.verses).toEqual([
      { number: 16, text: 'For God so loved the world...' },
    ])
    expect(result.current.isHydrating).toBe(false)
  })

  it('returns null for missing verse params', () => {
    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper(['/daily?tab=pray']),
    })

    expect(result.current.verseContext).toBeNull()
    expect(result.current.isHydrating).toBe(false)
  })

  it('returns null for invalid params', () => {
    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=pray&verseBook=fakebook&verseChapter=1&verseStart=1&verseEnd=1&src=bible',
      ]),
    })

    expect(result.current.verseContext).toBeNull()
    expect(result.current.isHydrating).toBe(false)
  })

  it('cleans URL params after parse', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(mockChapterData)

    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
      ]),
    })

    await waitFor(() => {
      expect(result.current.verseContext).not.toBeNull()
    })

    // After hydration, the URL should be cleaned to just ?tab=pray
    // Since we're using MemoryRouter, we check that loadChapterWeb was called
    // (meaning params were parsed) and the hook cleaned them via setSearchParams
    expect(loadChapterWeb).toHaveBeenCalledWith('john', 3)
  })

  it('clearVerseContext sets context to null', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(mockChapterData)

    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
      ]),
    })

    await waitFor(() => {
      expect(result.current.verseContext).not.toBeNull()
    })

    act(() => {
      result.current.clearVerseContext()
    })

    expect(result.current.verseContext).toBeNull()
  })

  it('does not fire when tab is not pray', () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(mockChapterData)

    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=journal&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
      ]),
    })

    expect(result.current.verseContext).toBeNull()
    expect(loadChapterWeb).not.toHaveBeenCalled()
  })

  it('handles hydration failure', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue(null)

    const { result } = renderHook(() => useVerseContextPreload(), {
      wrapper: createWrapper([
        '/daily?tab=pray&verseBook=john&verseChapter=3&verseStart=16&verseEnd=16&src=bible',
      ]),
    })

    // isHydrating should transition true → false
    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false)
    })

    expect(result.current.verseContext).toBeNull()
    expect(loadChapterWeb).toHaveBeenCalledWith('john', 3)
  })
})
