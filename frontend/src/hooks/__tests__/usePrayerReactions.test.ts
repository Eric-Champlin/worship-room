import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrayerReactions } from '../usePrayerReactions'
import {
  getSnapshot,
  _resetForTesting,
} from '@/lib/prayer-wall/reactionsStore'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import * as useAuthModule from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth')
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn(), showCelebrationToast: vi.fn() }),
}))
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))
vi.mock('@/services/api/prayer-wall-api')
vi.mock('@/lib/env', async (importOriginal) => {
  const actual =
    (await importOriginal()) as typeof import('@/lib/env')
  return { ...actual, isBackendPrayerWallEnabled: vi.fn(() => true) }
})

function mockUser(id: string | null) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    isAuthenticated: id !== null,
    isAuthResolving: false,
    user:
      id === null
        ? null
        : {
            id,
            name: 'Test',
            displayName: 'Test',
            email: 't@example.com',
            firstName: 'Test',
            lastName: 'User',
            isAdmin: false,
            timezone: null,
            isEmailVerified: true,
            termsVersion: null,
            privacyVersion: null,
          },
    // The hook only consumes `user`, but typings require these stubs.
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    acceptLatestVersions: vi.fn(),
    refreshCurrentUser: vi.fn(),
  } as unknown as ReturnType<typeof useAuthModule.useAuth>)
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  vi.clearAllMocks()
  vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({})
  vi.mocked(prayerWallApi.listMyBookmarks).mockResolvedValue({
    posts: [],
    pagination: { page: 1, limit: 100, total: 0, hasMore: false },
  })
})

describe('usePrayerReactions — auth state integration', () => {
  it('calls init(user.id) on first render when user is logged in', async () => {
    mockUser('user-1')

    await act(async () => {
      renderHook(() => usePrayerReactions())
      // Drain microtasks so the init() useEffect's Promise.allSettled
      // resolves and React flushes the resulting state update.
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(prayerWallApi.getMyReactions).toHaveBeenCalled()
    expect(prayerWallApi.listMyBookmarks).toHaveBeenCalled()
  })

  it('does NOT call init(null) on hook unmount (cache survives navigation)', async () => {
    mockUser('user-1')
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-Z': {
        prayerId: 'prayer-Z',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })

    let unmount: () => void = () => {}
    await act(async () => {
      const result = renderHook(() => usePrayerReactions())
      unmount = result.unmount
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(getSnapshot()['prayer-Z']).toBeDefined()

    act(() => {
      unmount()
    })

    // Cache survives unmount — Watch-for #15. If the hook called init(null)
    // on cleanup, getSnapshot() would be {}.
    expect(getSnapshot()['prayer-Z']).toBeDefined()
  })

  it('calls init(null) when user becomes null (logout)', async () => {
    mockUser('user-1')
    vi.mocked(prayerWallApi.getMyReactions).mockResolvedValue({
      'prayer-Z': {
        prayerId: 'prayer-Z',
        isPraying: true,
        isBookmarked: false,
        isCandle: false,
      },
    })

    let rerender: () => void = () => {}
    await act(async () => {
      const result = renderHook(() => usePrayerReactions())
      rerender = result.rerender
      await new Promise((r) => setTimeout(r, 10))
    })
    expect(getSnapshot()['prayer-Z']).toBeDefined()

    // Switch to logged-out and re-render.
    mockUser(null)
    await act(async () => {
      rerender()
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(getSnapshot()).toEqual({})
  })
})
