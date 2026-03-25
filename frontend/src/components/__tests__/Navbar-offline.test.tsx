import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '../Navbar'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(),
}))

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useAuth } from '@/hooks/useAuth'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)
const mockUseAuth = vi.mocked(useAuth)
const mockUseLiturgicalSeason = vi.mocked(useLiturgicalSeason)

function renderNavbar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <Navbar />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('Navbar offline indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof useAuth>)
    mockUseLiturgicalSeason.mockReturnValue({
      currentSeason: {
        id: 'ordinary-time',
        name: 'Ordinary Time',
        themeColor: '#FFD700',
        icon: 'Star',
        greeting: 'Peace be with you',
        suggestedContent: [],
        themeWord: 'growth',
      },
      icon: 'Star',
      themeColor: '#FFD700',
      isNamedSeason: false,
      seasonName: 'ordinary',
      greeting: 'Peace be with you',
      daysUntilNextSeason: 30,
    } as ReturnType<typeof useLiturgicalSeason>)
  })

  it('WiFiOff icon not shown when online', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    renderNavbar()
    expect(
      screen.queryByLabelText("You're offline — some features are limited")
    ).not.toBeInTheDocument()
  })

  it('WiFiOff icon shown when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    renderNavbar()
    const icons = screen.getAllByLabelText(
      "You're offline — some features are limited"
    )
    expect(icons.length).toBeGreaterThan(0)
  })

  it('icon has correct aria-label', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    renderNavbar()
    const icons = screen.getAllByLabelText(
      "You're offline — some features are limited"
    )
    expect(icons[0]).toBeInTheDocument()
  })

  it('icon has tooltip text', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    renderNavbar()
    const tooltipContainers = document.querySelectorAll(
      '[title="You\'re offline — some features are limited"]'
    )
    expect(tooltipContainers.length).toBeGreaterThan(0)
  })

  it('icon appears reactively on connectivity change', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true })
    const { rerender } = render(
      <MemoryRouter>
        <ToastProvider>
          <AuthModalProvider>
            <Navbar />
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>
    )
    expect(
      screen.queryByLabelText("You're offline — some features are limited")
    ).not.toBeInTheDocument()

    mockUseOnlineStatus.mockReturnValue({ isOnline: false })
    rerender(
      <MemoryRouter>
        <ToastProvider>
          <AuthModalProvider>
            <Navbar />
          </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>
    )
    const icons = screen.getAllByLabelText(
      "You're offline — some features are limited"
    )
    expect(icons.length).toBeGreaterThan(0)
  })
})
