import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { UpdatePrompt } from './UpdatePrompt'

// Mock useRegisterSW
const mockUpdateServiceWorker = vi.fn()
let mockNeedRefresh = false

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockNeedRefresh],
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}))

// Mock useAudioState
let mockPillVisible = false

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    pillVisible: mockPillVisible,
  }),
}))

describe('UpdatePrompt', () => {
  beforeEach(() => {
    mockNeedRefresh = false
    mockPillVisible = false
    mockUpdateServiceWorker.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when no update available', () => {
    mockNeedRefresh = false
    const { container } = render(<UpdatePrompt />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toast when update available', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Update now')).toBeInTheDocument()
  })

  it('displays correct message text', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    expect(
      screen.getByText('A new version of Worship Room is available')
    ).toBeInTheDocument()
  })

  it('"Update now" calls updateServiceWorker', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    fireEvent.click(screen.getByText('Update now'))
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('dismiss button hides toast', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Dismiss update notification'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('auto-dismisses after 30 seconds', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    mockNeedRefresh = true
    render(<UpdatePrompt />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(
      screen.getByLabelText('Dismiss update notification')
    ).toBeInTheDocument()
  })

  it('adjusts position when AudioPill visible', () => {
    mockNeedRefresh = true
    mockPillVisible = true
    render(<UpdatePrompt />)
    const status = screen.getByRole('status')
    expect(status.className).toContain('bottom-24')
    expect(status.className).not.toContain('bottom-6')
  })

  it('uses default position when AudioPill not visible', () => {
    mockNeedRefresh = true
    mockPillVisible = false
    render(<UpdatePrompt />)
    const status = screen.getByRole('status')
    expect(status.className).toContain('bottom-6')
    expect(status.className).not.toContain('bottom-24')
  })
})
