import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInstallPrompt } from '../useInstallPrompt'

describe('useInstallPrompt', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    originalMatchMedia = window.matchMedia

    // Default: not standalone
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia

    // Default: not iOS
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('increments wr_visit_count on first call', () => {
    renderHook(() => useInstallPrompt())
    expect(localStorage.getItem('wr_visit_count')).toBe('1')
  })

  it('does not increment twice in same session', () => {
    const { unmount } = renderHook(() => useInstallPrompt())
    unmount()
    renderHook(() => useInstallPrompt())
    expect(localStorage.getItem('wr_visit_count')).toBe('1')
  })

  it('showBanner is false on first visit', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.showBanner).toBe(false)
  })

  it('showBanner is true on second visit with beforeinstallprompt', () => {
    // Simulate second visit (count already at 2, session already counted)
    localStorage.setItem('wr_visit_count', '2')
    sessionStorage.setItem('wr_session_counted', 'true')

    const { result } = renderHook(() => useInstallPrompt())

    // Fire beforeinstallprompt
    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({
        outcome: 'accepted',
      })
      window.dispatchEvent(event)
    })

    expect(result.current.showBanner).toBe(true)
  })

  it('showBanner is false when dismissed less than 7 days ago', () => {
    localStorage.setItem('wr_visit_count', '2')
    sessionStorage.setItem('wr_session_counted', 'true')
    localStorage.setItem('wr_install_dismissed', String(Date.now() - 1000)) // 1 second ago

    const { result } = renderHook(() => useInstallPrompt())

    // Fire beforeinstallprompt
    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({
        outcome: 'accepted',
      })
      window.dispatchEvent(event)
    })

    expect(result.current.showBanner).toBe(false)
  })

  it('showBanner is true when dismissed more than 7 days ago', () => {
    localStorage.setItem('wr_visit_count', '2')
    sessionStorage.setItem('wr_session_counted', 'true')
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem('wr_install_dismissed', String(eightDaysAgo))

    const { result } = renderHook(() => useInstallPrompt())

    // Fire beforeinstallprompt
    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({
        outcome: 'accepted',
      })
      window.dispatchEvent(event)
    })

    expect(result.current.showBanner).toBe(true)
  })

  it('showBanner is false in standalone mode', () => {
    localStorage.setItem('wr_visit_count', '2')
    sessionStorage.setItem('wr_session_counted', 'true')
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia

    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({
        outcome: 'accepted',
      })
      window.dispatchEvent(event)
    })

    expect(result.current.showBanner).toBe(false)
  })

  it('isIOS is true for iPhone Safari UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    })

    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isIOS).toBe(true)
  })

  it('isIOS is false for Chrome on iOS', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    })

    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isIOS).toBe(false)
  })

  it('triggerInstall calls prompt() on deferred event', async () => {
    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })

    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = mockPrompt
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = mockUserChoice
      window.dispatchEvent(event)
    })

    let outcome: string | null = null
    await act(async () => {
      outcome = await result.current.triggerInstall()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(outcome).toBe('accepted')
  })

  it('dismissBanner stores timestamp', () => {
    const { result } = renderHook(() => useInstallPrompt())

    act(() => {
      result.current.dismissBanner()
    })

    const stored = localStorage.getItem('wr_install_dismissed')
    expect(stored).toBeTruthy()
    expect(Number(stored)).toBeGreaterThan(0)
  })
})
