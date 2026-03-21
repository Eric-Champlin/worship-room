import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePrayerReminders } from '../usePrayerReminders'
import {
  addPrayer,
  updateReminder,
  hasShownRemindersToday,
} from '@/services/prayer-list-storage'

const mockShowToast = vi.fn()

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
}))

beforeEach(() => {
  localStorage.clear()
  mockShowToast.mockClear()
})

function seedPrayerWithReminder(title: string) {
  const p = addPrayer({ title, description: '', category: 'health' })
  if (p) updateReminder(p.id, true)
  return p
}

describe('usePrayerReminders', () => {
  it('shows toast when reminders exist and isActive', () => {
    seedPrayerWithReminder('Heal my back')
    renderHook(() => usePrayerReminders(true))

    expect(mockShowToast).toHaveBeenCalledOnce()
    expect(mockShowToast.mock.calls[0][0]).toContain('Heal my back')
  })

  it('does not show toast when isActive is false', () => {
    seedPrayerWithReminder('Test')
    renderHook(() => usePrayerReminders(false))

    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show toast when no reminders enabled', () => {
    addPrayer({ title: 'No reminder', description: '', category: 'health' })
    renderHook(() => usePrayerReminders(true))

    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('does not show toast when already shown today', () => {
    seedPrayerWithReminder('Test')
    // First render shows toast
    renderHook(() => usePrayerReminders(true))
    mockShowToast.mockClear()

    // Second render should not show
    expect(hasShownRemindersToday()).toBe(true)
    renderHook(() => usePrayerReminders(true))
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('shows up to 3 titles', () => {
    for (let i = 0; i < 5; i++) {
      seedPrayerWithReminder(`Prayer ${i}`)
    }
    renderHook(() => usePrayerReminders(true))

    const msg = mockShowToast.mock.calls[0][0] as string
    // Should have exactly 3 prayers listed (comma-separated)
    const matches = msg.match(/Prayer \d/g)
    expect(matches).toHaveLength(3)
  })

  it('truncates long titles to 30 chars', () => {
    seedPrayerWithReminder('A very long prayer title that exceeds thirty characters easily')
    renderHook(() => usePrayerReminders(true))

    const msg = mockShowToast.mock.calls[0][0] as string
    expect(msg).toContain('A very long prayer title that ...')
  })
})
