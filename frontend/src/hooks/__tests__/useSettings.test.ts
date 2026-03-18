import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from '../useSettings'
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@/services/settings-storage'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings on first render', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('updateProfile updates state and persists', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateProfile({ displayName: 'Eric' })
    })

    expect(result.current.settings.profile.displayName).toBe('Eric')
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.profile.displayName).toBe('Eric')
  })

  it('updateNotifications updates a single toggle', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateNotifications('pushNotifications', true)
    })

    expect(result.current.settings.notifications.pushNotifications).toBe(true)
    // Other notifications unchanged
    expect(result.current.settings.notifications.inAppNotifications).toBe(true)
  })

  it('updatePrivacy updates privacy settings', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updatePrivacy({ nudgePermission: 'nobody' })
    })

    expect(result.current.settings.privacy.nudgePermission).toBe('nobody')
    expect(result.current.settings.privacy.showOnGlobalLeaderboard).toBe(true)
  })

  it('unblockUser removes user from blocked list', () => {
    // Seed blocked users
    const seeded = {
      ...DEFAULT_SETTINGS,
      privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: ['user-1', 'user-2'] },
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(seeded))

    const { result } = renderHook(() => useSettings())
    expect(result.current.settings.privacy.blockedUsers).toEqual(['user-1', 'user-2'])

    act(() => {
      result.current.unblockUser('user-1')
    })

    expect(result.current.settings.privacy.blockedUsers).toEqual(['user-2'])
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(stored.privacy.blockedUsers).toEqual(['user-2'])
  })

  it('cross-tab sync updates state on storage event', () => {
    const { result } = renderHook(() => useSettings())

    // Simulate another tab writing to wr_settings
    const otherTabSettings = {
      ...DEFAULT_SETTINGS,
      profile: { ...DEFAULT_SETTINGS.profile, displayName: 'Other Tab' },
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(otherTabSettings))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: SETTINGS_KEY,
          newValue: JSON.stringify(otherTabSettings),
        }),
      )
    })

    expect(result.current.settings.profile.displayName).toBe('Other Tab')
  })

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.updateProfile({ displayName: 'Original' })
    })

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'wr_some_other_key',
          newValue: '{}',
        }),
      )
    })

    expect(result.current.settings.profile.displayName).toBe('Original')
  })
})
