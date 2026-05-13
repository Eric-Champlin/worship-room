import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('@/services/api/intercessor-api', () => ({
  fetchIntercessors: vi.fn(),
}))

import { fetchIntercessors } from '@/services/api/intercessor-api'
import { useIntercessors } from '../useIntercessors'
import type {
  IntercessorEntry,
  IntercessorResponse,
} from '@/types/intercessor'

const POST_ID = 'post-1'

describe('useIntercessors', () => {
  beforeEach(() => {
    vi.mocked(fetchIntercessors).mockReset()
  })

  it('initial state is collapsed with empty entries and zero totalCount', () => {
    const { result } = renderHook(() => useIntercessors(POST_ID))
    expect(result.current.expanded).toBe(false)
    expect(result.current.entries).toEqual([])
    expect(result.current.totalCount).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('expand() fetches and populates entries + totalCount', async () => {
    const response: IntercessorResponse = {
      entries: [
        {
          userId: 'u-1',
          displayName: 'Sarah',
          isAnonymous: false,
          reactedAt: '2026-05-13T12:00:00Z',
        } as IntercessorEntry,
      ],
      totalCount: 1,
    }
    vi.mocked(fetchIntercessors).mockResolvedValue(response)

    const { result } = renderHook(() => useIntercessors(POST_ID))

    await act(async () => {
      await result.current.expand()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchIntercessors).toHaveBeenCalledWith(POST_ID)
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.totalCount).toBe(1)
    expect(result.current.expanded).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('collapse() clears expanded without re-fetching', async () => {
    vi.mocked(fetchIntercessors).mockResolvedValue({ entries: [], totalCount: 0 })
    const { result } = renderHook(() => useIntercessors(POST_ID))

    await act(async () => {
      await result.current.expand()
    })
    expect(result.current.expanded).toBe(true)

    act(() => {
      result.current.collapse()
    })
    expect(result.current.expanded).toBe(false)
    // No second fetch
    expect(fetchIntercessors).toHaveBeenCalledTimes(1)
  })

  it('optimisticInsert puts the entry at index 0 and increments totalCount', () => {
    const { result } = renderHook(() => useIntercessors(POST_ID))
    const newEntry: IntercessorEntry = {
      userId: 'u-me',
      displayName: 'Me',
      isAnonymous: false,
      reactedAt: '2026-05-13T12:00:00Z',
    }

    act(() => {
      result.current.optimisticInsert(newEntry)
    })

    expect(result.current.entries[0]).toEqual(newEntry)
    expect(result.current.totalCount).toBe(1)
  })

  it('optimisticRemove removes the viewer entry by userId and decrements totalCount', async () => {
    const me: IntercessorEntry = {
      userId: 'u-me',
      displayName: 'Me',
      isAnonymous: false,
      reactedAt: '2026-05-13T12:00:00Z',
    }
    const friend: IntercessorEntry = {
      userId: 'u-friend',
      displayName: 'Friend',
      isAnonymous: false,
      reactedAt: '2026-05-13T11:55:00Z',
    }
    vi.mocked(fetchIntercessors).mockResolvedValue({
      entries: [me, friend],
      totalCount: 2,
    })

    const { result } = renderHook(() => useIntercessors(POST_ID))
    await act(async () => {
      await result.current.expand()
    })

    act(() => {
      result.current.optimisticRemove('u-me')
    })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].isAnonymous).toBe(false)
    if (!result.current.entries[0].isAnonymous) {
      expect(result.current.entries[0].userId).toBe('u-friend')
    }
    expect(result.current.totalCount).toBe(1)
  })

  it('failed fetch surfaces the error message in state.error', async () => {
    vi.mocked(fetchIntercessors).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useIntercessors(POST_ID))

    await act(async () => {
      await result.current.expand()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('boom')
    expect(result.current.expanded).toBe(false)
  })
})
