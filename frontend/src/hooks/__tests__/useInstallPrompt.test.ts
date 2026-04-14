import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { type ReactNode, createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useInstallPrompt } from '../useInstallPrompt'
import { InstallPromptProvider } from '@/contexts/InstallPromptProvider'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, { initialEntries: ['/'] },
    createElement(InstallPromptProvider, null, children)
  )
}

describe('useInstallPrompt (via InstallPromptContext)', () => {
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

  it('captures beforeinstallprompt and sets isInstallable', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isInstallable).toBe(false)

    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({
        outcome: 'accepted',
      })
      window.dispatchEvent(event)
    })

    expect(result.current.isInstallable).toBe(true)
  })

  it('promptInstall calls prompt() and returns outcome', async () => {
    const mockPrompt = vi.fn()
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })

    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = mockPrompt
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = mockUserChoice
      window.dispatchEvent(event)
    })

    let outcome: string | null = null
    await act(async () => {
      outcome = await result.current.promptInstall()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(outcome).toBe('accepted')
  })

  it('dismissBanner sets wr_install_dismissed permanently', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isDismissed).toBe(false)

    act(() => {
      result.current.dismissBanner()
    })

    expect(result.current.isDismissed).toBe(true)
    const stored = localStorage.getItem('wr_install_dismissed')
    expect(stored).toBeTruthy()
    expect(Number(stored)).toBeGreaterThan(0)
  })

  it('no 7-day cooldown — dismissed stays dismissed', () => {
    // Set dismiss timestamp to 30 days ago (would have expired under old 7-day cooldown)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    localStorage.setItem('wr_install_dismissed', String(thirtyDaysAgo))

    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    // Should still be dismissed — no cooldown, permanent dismissal
    expect(result.current.isDismissed).toBe(true)
  })

  it('visitCount incremented once per session', () => {
    renderHook(() => useInstallPrompt(), { wrapper })
    expect(localStorage.getItem('wr_visit_count')).toBe('1')

    // Re-render in same session (sessionStorage still has flag)
    renderHook(() => useInstallPrompt(), { wrapper })
    expect(localStorage.getItem('wr_visit_count')).toBe('1')
  })

  it('isInstalled detects standalone mode', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia

    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isInstalled).toBe(true)
  })

  it('markDashboardCardShown sets localStorage key', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isDashboardCardShown).toBe(false)

    act(() => {
      result.current.markDashboardCardShown()
    })

    expect(result.current.isDashboardCardShown).toBe(true)
    expect(localStorage.getItem('wr_install_dashboard_shown')).toBe('true')
  })

  it('isIOS detects iOS Safari', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    })

    const { result } = renderHook(() => useInstallPrompt(), { wrapper })
    expect(result.current.isIOS).toBe(true)
    // iOS Safari is also installable (manual Add to Home Screen)
    expect(result.current.isInstallable).toBe(true)
  })

  it('appinstalled event sets isInstalled', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isInstalled).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.isInstalled).toBe(true)
  })

  it('returns safe defaults when used outside provider', () => {
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isInstalled).toBe(false)
    expect(result.current.visitCount).toBe(0)
    expect(result.current.sessionPageCount).toBe(0)
    expect(result.current.isSessionDismissed).toBe(false)
    expect(typeof result.current.dismissSession).toBe('function')
    expect(result.current.shouldShowPrompt('/')).toBe(false)
  })

  // BB-39: New session tracking and shouldShowPrompt tests

  it('sessionPageCount starts at 1 (initial page)', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })
    expect(result.current.sessionPageCount).toBe(1)
  })

  it('dismissSession sets isSessionDismissed', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    expect(result.current.isSessionDismissed).toBe(false)

    act(() => {
      result.current.dismissSession()
    })

    expect(result.current.isSessionDismissed).toBe(true)
  })

  it('shouldShowPrompt returns false when < 3 pages visited', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    // Only 1 page visited (the initial '/')
    expect(result.current.sessionPageCount).toBe(1)
    expect(result.current.shouldShowPrompt('/')).toBe(false)
  })

  it('shouldShowPrompt returns false when permanently dismissed', () => {
    localStorage.setItem('wr_install_dismissed', String(Date.now()))

    // Fire beforeinstallprompt so the prompt would otherwise be available
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    act(() => {
      const event = new Event('beforeinstallprompt')
      ;(event as Event & { prompt: () => Promise<void> }).prompt = vi.fn()
      ;(event as Event & { userChoice: Promise<{ outcome: string }> }).userChoice = Promise.resolve({ outcome: 'dismissed' })
      window.dispatchEvent(event)
    })

    expect(result.current.isDismissed).toBe(true)
    expect(result.current.shouldShowPrompt('/')).toBe(false)
  })

  it('shouldShowPrompt returns false on excluded path /bible/genesis/1', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })
    expect(result.current.shouldShowPrompt('/bible/genesis/1')).toBe(false)
  })

  it('shouldShowPrompt returns false on excluded path /ask', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })
    expect(result.current.shouldShowPrompt('/ask')).toBe(false)
  })

  it('shouldShowPrompt returns false when session dismissed', () => {
    const { result } = renderHook(() => useInstallPrompt(), { wrapper })

    act(() => {
      result.current.dismissSession()
    })

    expect(result.current.isSessionDismissed).toBe(true)
    expect(result.current.shouldShowPrompt('/')).toBe(false)
  })
})
