import { describe, expect, it, vi } from 'vitest'
import { navigateToActivityItem } from '../navigateToActivityItem'
import type { ActivityItem } from '@/types/my-bible'
import type { NavigateFunction } from 'react-router-dom'

describe('navigateToActivityItem', () => {
  it('calls navigate with correct path', () => {
    const navigate = vi.fn() as unknown as NavigateFunction
    const item: ActivityItem = {
      type: 'highlight',
      id: 'hl-1',
      createdAt: 1000,
      updatedAt: 1000,
      book: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      data: { type: 'highlight', color: 'joy' },
    }

    navigateToActivityItem(navigate, item)
    expect(navigate).toHaveBeenCalledWith('/bible/john/3')
  })
})
