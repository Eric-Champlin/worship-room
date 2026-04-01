import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallBanner } from '../InstallBanner'

const mockDismissBanner = vi.fn()
const mockPromptInstall = vi.fn()
const mockShowToast = vi.fn()

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
  dismissBanner: mockDismissBanner,
  markDashboardCardShown: vi.fn(),
}

function setContext(overrides: Partial<InstallPromptContextValue> = {}) {
  mockUseInstallPrompt.mockReturnValue({ ...defaultContext, ...overrides })
}

describe('InstallBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders when all conditions met', () => {
    setContext()
    render(<InstallBanner />)
    expect(screen.getByText('Worship Room is better as an app')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()
  })

  it('does not render when visitCount < 3', () => {
    setContext({ visitCount: 2 })
    const { container } = render(<InstallBanner />)
    expect(container.querySelector('[role="complementary"]')).not.toBeInTheDocument()
  })

  it('does not render when dismissed', () => {
    setContext({ isDismissed: true })
    const { container } = render(<InstallBanner />)
    expect(container.querySelector('[role="complementary"]')).not.toBeInTheDocument()
  })

  it('does not render when installed (standalone)', () => {
    setContext({ isInstalled: true })
    const { container } = render(<InstallBanner />)
    expect(container.querySelector('[role="complementary"]')).not.toBeInTheDocument()
  })

  it('Install button triggers native prompt', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    setContext()
    render(<InstallBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockPromptInstall).toHaveBeenCalled()
  })

  it('Install + accepted dismisses banner and shows toast', async () => {
    mockPromptInstall.mockResolvedValue('accepted')
    setContext()
    render(<InstallBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Worship Room is on your home screen now. Welcome home.',
      'success'
    )
    expect(mockDismissBanner).toHaveBeenCalled()
  })

  it('Dismiss X hides banner and calls dismissBanner', () => {
    setContext()
    render(<InstallBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }))
    // With reduced motion mocked to true, dismissBanner is called immediately
    expect(mockDismissBanner).toHaveBeenCalled()
  })

  it('auto-dismisses after 10 seconds', () => {
    setContext()
    render(<InstallBanner />)

    expect(mockDismissBanner).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(mockDismissBanner).toHaveBeenCalled()
  })

  it('auto-dismiss cancelled by manual dismiss', () => {
    setContext()
    render(<InstallBanner />)

    // Dismiss manually before 10s
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }))
    mockDismissBanner.mockClear()

    // Advance past auto-dismiss time
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    // Should not have been called again
    expect(mockDismissBanner).not.toHaveBeenCalled()
  })

  it('auto-dismiss cancelled by Install tap', async () => {
    mockPromptInstall.mockResolvedValue('dismissed')
    setContext()
    render(<InstallBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })
    mockDismissBanner.mockClear()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    // Should not have been called again after install tap
    expect(mockDismissBanner).not.toHaveBeenCalled()
  })

  it('progress line renders with animation style', () => {
    setContext()
    const { container } = render(<InstallBanner />)
    const progressBar = container.querySelector('.bg-white\\/20')
    expect(progressBar).toBeInTheDocument()
  })

  it('banner has animation wrapper styles', () => {
    setContext()
    const { container } = render(<InstallBanner />)
    const wrapper = container.querySelector('[role="complementary"]')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper?.className).toContain('mt-2')
  })

  it('iOS shows Share icon instead of Install button', () => {
    setContext({ isIOS: true })
    render(<InstallBanner />)
    expect(screen.getByText("Tap Share, then 'Add to Home Screen'")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('Install and X buttons have accessible touch targets', () => {
    setContext()
    render(<InstallBanner />)
    const installBtn = screen.getByRole('button', { name: 'Install' })
    expect(installBtn.className).toContain('min-h-[44px]')
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss install prompt' })
    expect(dismissBtn.className).toContain('h-11 w-11')
  })

  it('has correct ARIA attributes', () => {
    setContext()
    render(<InstallBanner />)
    const banner = screen.getByRole('complementary')
    expect(banner).toHaveAttribute('aria-label', 'Install app suggestion')
  })
})
