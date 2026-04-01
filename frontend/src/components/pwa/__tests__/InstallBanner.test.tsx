import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallBanner } from '../InstallBanner'

const mockDismissBanner = vi.fn()
const mockTriggerInstall = vi.fn()
const mockShowToast = vi.fn()

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: vi.fn(),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: vi.fn().mockReturnValue({ pillVisible: false }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: vi.fn().mockReturnValue({
    showToast: (...args: unknown[]) => mockShowToast(...args),
  }),
}))

import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useAudioState } from '@/components/audio/AudioProvider'
const mockUseInstallPrompt = vi.mocked(useInstallPrompt)
const mockUseAudioState = vi.mocked(useAudioState)

function setPromptState(overrides: Partial<ReturnType<typeof useInstallPrompt>> = {}) {
  mockUseInstallPrompt.mockReturnValue({
    showBanner: true,
    isIOS: false,
    triggerInstall: mockTriggerInstall,
    dismissBanner: mockDismissBanner,
    ...overrides,
  })
}

describe('InstallBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAudioState.mockReturnValue({ pillVisible: false } as ReturnType<typeof useAudioState>)
    mockShowToast.mockClear()
  })

  it('renders standard banner when showBanner and not iOS', () => {
    setPromptState({ showBanner: true, isIOS: false })
    render(<InstallBanner />)
    expect(screen.getByText('Install Worship Room')).toBeInTheDocument()
    expect(screen.getByText('Get the full app experience')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()
  })

  it('renders iOS banner when showBanner and isIOS', () => {
    setPromptState({ showBanner: true, isIOS: true })
    render(<InstallBanner />)
    expect(screen.getByText('Install Worship Room')).toBeInTheDocument()
    expect(
      screen.getByText("Tap the Share button below, then 'Add to Home Screen'")
    ).toBeInTheDocument()
    // No Install button on iOS
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('Install button triggers install', async () => {
    mockTriggerInstall.mockResolvedValue('dismissed')
    setPromptState()
    render(<InstallBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockTriggerInstall).toHaveBeenCalled()
  })

  it('Dismiss button calls dismissBanner', () => {
    setPromptState()
    render(<InstallBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss install prompt' }))
    expect(mockDismissBanner).toHaveBeenCalled()
  })

  it('shows celebration toast on successful install', async () => {
    mockTriggerInstall.mockResolvedValue('accepted')
    setPromptState()
    render(<InstallBanner />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Worship Room is on your home screen now. Welcome home.',
      'success'
    )
  })

  it('banner has correct z-index', () => {
    setPromptState()
    const { container } = render(<InstallBanner />)
    const banner = container.querySelector('[role="dialog"]')
    expect(banner?.className).toContain('z-[9997]')
  })

  it('adjusts bottom when AudioPill visible', () => {
    mockUseAudioState.mockReturnValue({ pillVisible: true } as ReturnType<typeof useAudioState>)
    setPromptState()
    const { container } = render(<InstallBanner />)
    const banner = container.querySelector('[role="dialog"]')
    expect(banner?.className).toContain('bottom-24')
  })

  it('has safe area padding on mobile', () => {
    setPromptState()
    const { container } = render(<InstallBanner />)
    const banner = container.querySelector('[role="dialog"]')
    expect(banner?.className).toContain('env(safe-area-inset-bottom)')
  })

  it('does not render when showBanner is false', () => {
    setPromptState({ showBanner: false })
    const { container } = render(<InstallBanner />)
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    setPromptState()
    render(<InstallBanner />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Install Worship Room')
  })
})
