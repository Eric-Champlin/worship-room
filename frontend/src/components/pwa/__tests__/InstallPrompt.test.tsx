import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallPrompt } from '../InstallPrompt'

const mockDismissBanner = vi.fn()
const mockPromptInstall = vi.fn()
const mockDismissSession = vi.fn()
const mockShowToast = vi.fn()
const mockShouldShowPrompt = vi.fn()

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: vi.fn().mockReturnValue({
    showToast: (...args: unknown[]) => mockShowToast(...args),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn().mockReturnValue(true),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: vi.fn().mockReturnValue({ pathname: '/daily' }),
  }
})

import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import type { InstallPromptContextValue } from '@/contexts/InstallPromptContext'
const mockUseInstallPrompt = vi.mocked(useInstallPrompt)

const defaultContext: InstallPromptContextValue = {
  isInstallable: true,
  isInstalled: false,
  isIOS: false,
  visitCount: 5,
  isDismissed: false,
  isDashboardCardShown: false,
  promptInstall: mockPromptInstall,
  dismissBanner: mockDismissBanner,
  markDashboardCardShown: vi.fn(),
  sessionPageCount: 5,
  isSessionDismissed: false,
  dismissSession: mockDismissSession,
  shouldShowPrompt: mockShouldShowPrompt,
}

function setContext(overrides: Partial<InstallPromptContextValue> = {}) {
  const ctx = { ...defaultContext, ...overrides }
  mockUseInstallPrompt.mockReturnValue(ctx)
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShouldShowPrompt.mockReturnValue(true)
  })

  it('does not render when shouldShowPrompt returns false', () => {
    mockShouldShowPrompt.mockReturnValue(false)
    setContext()
    const { container } = render(<InstallPrompt />)
    expect(container.querySelector('[role="complementary"]')).not.toBeInTheDocument()
  })

  it('renders when shouldShowPrompt returns true', () => {
    setContext()
    render(<InstallPrompt />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('shows value proposition text', () => {
    setContext()
    render(<InstallPrompt />)
    expect(
      screen.getByText('Install Worship Room for offline reading and faster access')
    ).toBeInTheDocument()
  })

  it('Install button calls promptInstall', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    setContext()
    render(<InstallPrompt />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockPromptInstall).toHaveBeenCalled()
  })

  it('shows success toast when install accepted', async () => {
    mockPromptInstall.mockResolvedValue('accepted')
    setContext()
    render(<InstallPrompt />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Worship Room is on your home screen now. Welcome home.',
      'success'
    )
  })

  it('Not now calls dismissSession', () => {
    setContext()
    render(<InstallPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(mockDismissSession).toHaveBeenCalled()
  })

  it("Don't ask again calls dismissBanner (permanent)", () => {
    setContext()
    render(<InstallPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /don.t ask again/i }))
    expect(mockDismissBanner).toHaveBeenCalled()
  })

  it('iOS variant shows step-by-step instructions', () => {
    setContext({ isIOS: true })
    render(<InstallPrompt />)
    expect(screen.getByText('Add Worship Room to your Home Screen')).toBeInTheDocument()
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
  })

  it('iOS variant does not show Install button', () => {
    setContext({ isIOS: true })
    render(<InstallPrompt />)
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('iOS variant shows Share icon reference', () => {
    setContext({ isIOS: true })
    render(<InstallPrompt />)
    expect(screen.getByText(/Share button/)).toBeInTheDocument()
  })

  it('all buttons have min-h-[44px]', () => {
    setContext()
    render(<InstallPrompt />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })

  it('has correct ARIA attributes', () => {
    setContext()
    render(<InstallPrompt />)
    const card = screen.getByRole('complementary')
    expect(card).toHaveAttribute('aria-label', 'Install app suggestion')
  })
})
