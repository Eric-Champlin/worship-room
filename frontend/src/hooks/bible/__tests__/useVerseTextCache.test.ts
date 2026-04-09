import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { BibleChapter } from '@/types/bible'
import type { ActivityItem } from '@/types/my-bible'

const mockLoadChapterWeb = vi.fn<(book: string, chapter: number) => Promise<BibleChapter | null>>()

vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: (...args: unknown[]) => mockLoadChapterWeb(...(args as [string, number])),
}))

import { useVerseTextCache } from '../useVerseTextCache'

function makeChapterData(bookSlug: string, chapter: number, verses: Array<{ number: number; text: string }>): BibleChapter {
  return { bookSlug, chapter, verses, paragraphs: [] }
}

describe('useVerseTextCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadChapterWeb.mockResolvedValue(null)
  })

  it('returns null before chapter is loaded', () => {
    const { result } = renderHook(() => useVerseTextCache())
    expect(result.current.getVerseText('john', 3, 16, 16)).toBeNull()
  })

  it('returns text after chapter loads', async () => {
    mockLoadChapterWeb.mockResolvedValue(
      makeChapterData('john', 3, [
        { number: 16, text: 'For God so loved the world' },
        { number: 17, text: 'For God sent not his Son' },
      ]),
    )

    const { result } = renderHook(() => useVerseTextCache())

    const items: ActivityItem[] = [
      {
        type: 'highlight',
        id: '1',
        createdAt: 1000,
        updatedAt: 1000,
        book: 'john',
        bookName: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
        data: { type: 'highlight', color: 'joy' },
      },
    ]

    act(() => {
      result.current.preloadChapters(items)
    })

    await waitFor(() => {
      expect(result.current.getVerseText('john', 3, 16, 16)).toBe('For God so loved the world')
    })
  })
})
