import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppSection } from '../AppSection'

const mockPromptInstall = vi.fn()
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
  visitCount: 3,
  isDismissed: false,
  isDashboardCardShown: false,
  promptInstall: mockPromptInstall,
  dismissBanner: vi.fn(),
  markDashboardCardShown: vi.fn(),
}

function setContext(overrides: Partial<InstallPromptContextValue> = {}) {
  mockUseInstallPrompt.mockReturnValue({ ...defaultContext, ...overrides })
}

describe('AppSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders install row when installable', () => {
    setContext({ isInstallable: true, isInstalled: false })
    render(<AppSection />)
    expect(screen.getByText('Install Worship Room')).toBeInTheDocument()
    expect(screen.getByText('Add to your home screen for the full experience')).toBeInTheDocument()
  })

  it('renders "App Installed" when installed', () => {
    setContext({ isInstalled: true })
    render(<AppSection />)
    expect(screen.getByText('App Installed')).toBeInTheDocument()
  })

  it('returns null when not installable and not installed', () => {
    setContext({ isInstallable: false, isInstalled: false })
    const { container } = render(<AppSection />)
    expect(container.innerHTML).toBe('')
  })

  it('tapping install row triggers promptInstall', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    setContext()
    render(<AppSection />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install Worship Room' }))
    })

    expect(mockPromptInstall).toHaveBeenCalled()
  })

  it('successful install shows toast', async () => {
    mockPromptInstall.mockResolvedValue('accepted')
    setContext()
    render(<AppSection />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install Worship Room' }))
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Worship Room is on your home screen now. Welcome home.',
      'success'
    )
  })

  it('iOS shows Share icon and informational text', () => {
    setContext({ isIOS: true })
    render(<AppSection />)
    expect(screen.getByText('Install Worship Room')).toBeInTheDocument()
    expect(screen.getByText("Tap Share, then 'Add to Home Screen'")).toBeInTheDocument()
    // No clickable install button on iOS
    expect(screen.queryByRole('button', { name: 'Install Worship Room' })).not.toBeInTheDocument()
  })

  it('has heading "App"', () => {
    setContext()
    render(<AppSection />)
    expect(screen.getByRole('heading', { name: 'App' })).toBeInTheDocument()
  })

  it('install row has accessible label', () => {
    setContext()
    render(<AppSection />)
    const button = screen.getByRole('button', { name: 'Install Worship Room' })
    expect(button).toBeInTheDocument()
  })
})
