import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallCard } from '../InstallCard'

const mockPromptInstall = vi.fn()
const mockMarkDashboardCardShown = vi.fn()
const mockShowToast = vi.fn()

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn().mockReturnValue({
    showToast: (...args: unknown[]) => mockShowToast(...args),
  }),
}))

import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import type { InstallPromptContextValue } from '@/contexts/InstallPromptContext'
const mockUseInstallPrompt = vi.mocked(useInstallPrompt)

const defaultContext: InstallPromptContextValue = {
  isInstallable: true,
  isInstalled: false,
  isIOS: false,
  visitCount: 5,
  isDismissed: true,
  isDashboardCardShown: false,
  promptInstall: mockPromptInstall,
  dismissBanner: vi.fn(),
  markDashboardCardShown: mockMarkDashboardCardShown,
}

function setContext(overrides: Partial<InstallPromptContextValue> = {}) {
  mockUseInstallPrompt.mockReturnValue({ ...defaultContext, ...overrides })
}

describe('InstallCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when all conditions met', () => {
    setContext()
    render(<InstallCard />)
    expect(screen.getByText('Take Worship Room with you')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument()
  })

  it('does not render if banner not dismissed', () => {
    setContext({ isDismissed: false })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('does not render if already shown', () => {
    setContext({ isDashboardCardShown: true })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('does not render if not installable', () => {
    setContext({ isInstallable: false })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('does not render if installed', () => {
    setContext({ isInstalled: true })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('does not render for iOS users', () => {
    setContext({ isIOS: true })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('Install button triggers prompt and marks card shown', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    setContext()
    render(<InstallCard />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockPromptInstall).toHaveBeenCalled()
    expect(mockMarkDashboardCardShown).toHaveBeenCalled()
  })

  it('"Not now" marks card shown and hides', () => {
    setContext()
    render(<InstallCard />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(mockMarkDashboardCardShown).toHaveBeenCalled()
    expect(screen.queryByText('Take Worship Room with you')).not.toBeInTheDocument()
  })

  it('successful install shows toast', async () => {
    mockPromptInstall.mockResolvedValue('accepted')
    setContext()
    render(<InstallCard />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Worship Room is on your home screen now. Welcome home.',
      'success'
    )
  })

  it('card never reappears after interaction', () => {
    setContext({ isDashboardCardShown: true })
    const { container } = render(<InstallCard />)
    expect(container.innerHTML).toBe('')
  })

  it('Install and Not now buttons have 44px touch targets', () => {
    setContext()
    render(<InstallCard />)
    const installBtn = screen.getByRole('button', { name: 'Install' })
    expect(installBtn.className).toContain('min-h-[44px]')
    const notNowBtn = screen.getByRole('button', { name: 'Not now' })
    expect(notNowBtn.className).toContain('min-h-[44px]')
  })
})
