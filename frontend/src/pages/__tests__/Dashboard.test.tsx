import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
})

function seedTodayMoodEntry() {
  const entry: MoodEntry = {
    id: 'test-1',
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
  }
  localStorage.setItem('wr_mood_entries', JSON.stringify([entry]))
}

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <Dashboard />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  it('renders dashboard with dark background when checked in', () => {
    seedTodayMoodEntry()
    renderDashboard()
    const root = screen.getByRole('main').closest('.min-h-screen')
    expect(root).toHaveClass('bg-[#0f0a1e]')
  })

  it('has main content landmark when checked in', () => {
    seedTodayMoodEntry()
    renderDashboard()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
