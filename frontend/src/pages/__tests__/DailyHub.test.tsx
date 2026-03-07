import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DailyHub } from '../DailyHub'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoggedIn: false })),
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isLoggedIn: false })
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

function renderPage(initialEntry = '/daily') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <DailyHub />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DailyHub', () => {
  it('renders a time-aware greeting with correct capitalization', () => {
    renderPage()
    const greeting = screen.getByText(/Good (Morning|Afternoon|Evening)/)
    expect(greeting).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(
      screen.getByText(/start with any practice below/i),
    ).toBeInTheDocument()
  })

  it('renders tab bar with 3 tabs', () => {
    renderPage()
    const tablist = screen.getByRole('tablist')
    expect(tablist).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent('Pray')
    expect(tabs[1]).toHaveTextContent('Journal')
    expect(tabs[2]).toHaveTextContent('Meditate')
  })

  it('defaults to Pray tab content', () => {
    renderPage()
    // Pray heading unique word "Heart?" identifies the active tab
    expect(screen.getByText('Heart?')).toBeInTheDocument()
    const prayTab = screen.getByRole('tab', { name: /pray/i })
    expect(prayTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows Journal tab content when ?tab=journal', () => {
    renderPage('/daily?tab=journal')
    expect(
      screen.getByRole('heading', { name: /what's on your mind\?/i }),
    ).toBeInTheDocument()
  })

  it('shows Meditate tab content when ?tab=meditate', () => {
    renderPage('/daily?tab=meditate')
    expect(screen.getByText('Breathing Exercise')).toBeInTheDocument()
    expect(screen.getByText('Scripture Soaking')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Reflection')).toBeInTheDocument()
    expect(screen.getByText('ACTS Prayer Walk')).toBeInTheDocument()
    expect(screen.getByText('Psalm Reading')).toBeInTheDocument()
    expect(screen.getByText('Examen')).toBeInTheDocument()
  })

  it('switches tabs on click', async () => {
    const user = userEvent.setup()
    renderPage()
    // Default is Pray
    expect(screen.getByText('Heart?')).toBeInTheDocument()

    // Click Journal tab
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    expect(
      screen.getByRole('heading', { name: /what's on your mind\?/i }),
    ).toBeInTheDocument()
  })

  it('renders the Spotify embed', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: /today's song pick/i }),
    ).toBeInTheDocument()
  })

  it('renders the Starting Point Quiz section', () => {
    renderPage()
    expect(document.getElementById('quiz')).toBeInTheDocument()
  })

  it('renders quiz teaser link in hero', () => {
    renderPage()
    expect(
      screen.getByRole('button', { name: /take a 30-second quiz/i }),
    ).toBeInTheDocument()
  })

  it('does not show checkmarks when logged out', () => {
    renderPage()
    const checkmarks = screen.queryAllByText(/completed today/i)
    expect(checkmarks).toHaveLength(0)
  })

  it('defaults to Pray for invalid tab param', () => {
    renderPage('/daily?tab=invalid')
    expect(screen.getByText('Heart?')).toBeInTheDocument()
  })

  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup()
    renderPage()
    const prayTab = screen.getByRole('tab', { name: /pray/i })
    prayTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /journal/i })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
    // Wraps around
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /pray/i })).toHaveFocus()
    // ArrowLeft wraps backward
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /meditate/i })).toHaveFocus()
  })

  it('preserves textarea text when switching tabs and switching back', async () => {
    const user = userEvent.setup()
    renderPage()
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    await user.type(textarea, 'my prayer text')
    // Switch to Journal
    await user.click(screen.getByRole('tab', { name: /journal/i }))
    // Switch back to Pray
    await user.click(screen.getByRole('tab', { name: /pray/i }))
    expect(screen.getByRole('textbox', { name: /prayer request/i })).toHaveValue('my prayer text')
  })
})
