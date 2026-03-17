import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'

const mockRecordActivity = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Eric' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: mockRecordActivity,
  }),
}))

beforeEach(() => {
  localStorage.clear()
  mockRecordActivity.mockClear()
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <PrayerWall />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWall activity integration', () => {
  it('recordActivity("prayerWall") called when praying for someone', async () => {
    const user = userEvent.setup()
    renderPage()

    // Click the first "Praying" button
    const prayButtons = screen.getAllByRole('button', { name: /pray/i })
    const firstPrayButton = prayButtons.find(
      (btn) => btn.textContent?.includes('Praying') || btn.getAttribute('aria-label')?.includes('Pray'),
    )
    expect(firstPrayButton).toBeDefined()
    await user.click(firstPrayButton!)
    expect(mockRecordActivity).toHaveBeenCalledWith('prayerWall')
  })

  it('recordActivity not called when un-praying', async () => {
    const user = userEvent.setup()
    renderPage()

    const prayButtons = screen.getAllByRole('button', { name: /pray/i })
    const firstPrayButton = prayButtons.find(
      (btn) => btn.textContent?.includes('Praying') || btn.getAttribute('aria-label')?.includes('Pray'),
    )
    expect(firstPrayButton).toBeDefined()

    // First click: pray ON → recordActivity called
    await user.click(firstPrayButton!)
    expect(mockRecordActivity).toHaveBeenCalledTimes(1)

    // Second click: pray OFF → recordActivity NOT called again
    mockRecordActivity.mockClear()
    await user.click(firstPrayButton!)
    expect(mockRecordActivity).not.toHaveBeenCalled()
  })

  it('recordActivity("prayerWall") called on comment submit', async () => {
    const user = userEvent.setup()
    renderPage()

    // Open comments on first prayer
    const commentButtons = screen.getAllByRole('button', { name: /comment/i })
    await user.click(commentButtons[0])

    // Find the comment input (inside the now-open section)
    const commentInputs = document.querySelectorAll('input[placeholder="Write a comment..."]')
    const visibleInput = Array.from(commentInputs).find(
      (el) => !el.closest('[aria-hidden="true"]'),
    ) as HTMLInputElement | undefined
    expect(visibleInput).toBeDefined()
    await user.type(visibleInput!, 'Praying for you!')

    const submitBtns = screen.getAllByRole('button', { name: /submit comment/i })
    const visibleSubmit = submitBtns.find(
      (btn) => !btn.closest('[aria-hidden="true"]'),
    )
    expect(visibleSubmit).toBeDefined()
    await user.click(visibleSubmit!)
    expect(mockRecordActivity).toHaveBeenCalledWith('prayerWall')
  })
})
