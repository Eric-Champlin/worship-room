import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { useVerseFindsYou } from '../useVerseFindsYou'
import { saveSettings } from '@/services/settings-storage'
import { VERSE_DISMISSALS_KEY } from '@/services/verse-dismissals-storage'

// Mock api-client to avoid real network. apiFetch becomes a controllable spy.
vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client')
  return {
    ...actual,
    apiFetch: vi.fn(),
  }
})

import { apiFetch } from '@/lib/api-client'

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  apiFetchMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function setVerseFindsYouEnabled(enabled: boolean) {
  saveSettings({
    profile: { displayName: '', avatarId: 'default', bio: '', email: 'u@example.com' },
    notifications: {
      inAppNotifications: true, pushNotifications: false, emailWeeklyDigest: true,
      emailMonthlyReport: true, encouragements: true, milestones: true,
      friendRequests: true, nudges: true, weeklyRecap: true,
    },
    privacy: {
      showOnGlobalLeaderboard: true, activityStatus: true,
      nudgePermission: 'friends', streakVisibility: 'friends', blockedUsers: [],
    },
    prayerWall: {
      prayerReceiptsVisible: true,
      nightMode: 'auto',
      watchEnabled: 'off',
      dismissedShareWarning: false,
    },
    verseFindsYou: { enabled },
  })
}

describe('useVerseFindsYou', () => {
  describe('T-SEC-1 / T31 / W28: toggle OFF → no API call', () => {
    it('does NOT call apiFetch when enabled is false', async () => {
      setVerseFindsYouEnabled(false)
      const { result } = renderHook(() => useVerseFindsYou())

      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
      })

      expect(apiFetchMock).not.toHaveBeenCalled()
      expect(result.current.verse).toBeNull()
    })

    it('does NOT call apiFetch on any trigger type when enabled is false', async () => {
      setVerseFindsYouEnabled(false)
      const { result } = renderHook(() => useVerseFindsYou())

      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
        await result.current.trigger('comment', 'mental-health')
        await result.current.trigger('reading_time', 'health')
      })

      expect(apiFetchMock).not.toHaveBeenCalled()
    })
  })

  describe('happy path: toggle ON → API call fires', () => {
    it('calls apiFetch with trigger + context + enabled=true', async () => {
      setVerseFindsYouEnabled(true)
      apiFetchMock.mockResolvedValueOnce({
        verse: { reference: 'Test 1:1', text: 'Test verse.' },
        cooldownUntil: null,
        reason: null,
      })

      const { result } = renderHook(() => useVerseFindsYou())
      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
      })

      expect(apiFetchMock).toHaveBeenCalledTimes(1)
      const url = apiFetchMock.mock.calls[0][0]
      expect(url).toContain('/api/v1/verse-finds-you?')
      expect(url).toContain('trigger=post_compose')
      expect(url).toContain('context=grief')
      expect(url).toContain('enabled=true')

      await waitFor(() => {
        expect(result.current.verse?.verse?.reference).toBe('Test 1:1')
      })
    })

    it('exposes lastTrigger so consumers can render the correct per-trigger prefix (Gate-G-COPY)', async () => {
      setVerseFindsYouEnabled(true)
      apiFetchMock.mockResolvedValue({
        verse: { reference: 'Test 1:1', text: 'Test verse.' },
        cooldownUntil: null,
        reason: null,
      })

      const { result } = renderHook(() => useVerseFindsYou())

      // No trigger yet → null
      expect(result.current.lastTrigger).toBeNull()

      await act(async () => {
        await result.current.trigger('reading_time', 'grief')
      })
      expect(result.current.lastTrigger).toBe('reading_time')

      // Dismiss clears both verse and lastTrigger
      act(() => {
        result.current.dismiss()
      })
      expect(result.current.lastTrigger).toBeNull()
      expect(result.current.verse).toBeNull()
    })

    it('lastTrigger stays null when API returns verse=null (no surfacing)', async () => {
      setVerseFindsYouEnabled(true)
      apiFetchMock.mockResolvedValueOnce({
        verse: null,
        cooldownUntil: null,
        reason: 'no_match',
      })

      const { result } = renderHook(() => useVerseFindsYou())
      await act(async () => {
        await result.current.trigger('post_compose', 'discussion')
      })

      expect(result.current.verse).toBeNull()
      expect(result.current.lastTrigger).toBeNull()
    })

    it('NEVER includes user post text in the API URL (Gate-G-NO-TEXT-FLOW)', async () => {
      setVerseFindsYouEnabled(true)
      apiFetchMock.mockResolvedValueOnce({ verse: null, cooldownUntil: null, reason: 'no_match' })

      const { result } = renderHook(() => useVerseFindsYou())
      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
      })

      const url = apiFetchMock.mock.calls[0][0] as string
      // Only safe params: trigger, context, enabled. NO user-content fields.
      const params = new URL(`http://localhost${url.split('?')[1] ? '/?' + url.split('?')[1] : '/'}`).searchParams
      expect([...params.keys()].sort()).toEqual(['context', 'enabled', 'trigger'])
    })
  })

  describe('session suppression', () => {
    it('after dismiss(), no further API call until next page mount', async () => {
      setVerseFindsYouEnabled(true)
      apiFetchMock.mockResolvedValue({
        verse: { reference: 'V', text: 'T' },
        cooldownUntil: null,
        reason: null,
      })

      const { result } = renderHook(() => useVerseFindsYou())
      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
      })
      expect(apiFetchMock).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.dismiss()
      })

      await act(async () => {
        await result.current.trigger('post_compose', 'grief')
      })
      // Still 1 call — session suppression blocked the second.
      expect(apiFetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('3-in-a-row off-ramp prompt', () => {
    it('signals showOffRampPrompt=true on the third dismissal', () => {
      setVerseFindsYouEnabled(true)
      const { result } = renderHook(() => useVerseFindsYou())

      let outcome: { showOffRampPrompt: boolean }
      act(() => {
        outcome = result.current.dismiss()
      })
      expect(outcome!.showOffRampPrompt).toBe(false)

      act(() => {
        outcome = result.current.dismiss()
      })
      expect(outcome!.showOffRampPrompt).toBe(false)

      act(() => {
        outcome = result.current.dismiss()
      })
      expect(outcome!.showOffRampPrompt).toBe(true)
    })

    it('persists count in wr_verse_dismissals across hook re-mounts', () => {
      setVerseFindsYouEnabled(true)
      const { result, unmount } = renderHook(() => useVerseFindsYou())
      act(() => {
        result.current.dismiss()
        result.current.dismiss()
      })
      unmount()

      const stored = JSON.parse(localStorage.getItem(VERSE_DISMISSALS_KEY) ?? '{}')
      expect(stored.count).toBe(2)
    })
  })
})
