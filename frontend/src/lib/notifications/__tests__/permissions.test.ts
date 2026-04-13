import { describe, it, expect, afterEach, vi } from 'vitest'
import { getPushSupportStatus, getPermissionState, isIOSSafari, isStandalone } from '../permissions'

// Save originals
const originalNavigator = globalThis.navigator

function mockNavigator(overrides: Partial<Navigator>) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { ...originalNavigator, ...overrides },
    writable: true,
    configurable: true,
  })
}

describe('permissions', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    vi.restoreAllMocks()
  })

  describe('getPushSupportStatus', () => {
    it('returns "supported" when all APIs are present', () => {
      // jsdom provides window and navigator but not PushManager/serviceWorker by default
      // We need to define them on the actual navigator object, not a mock copy
      Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true })
      Object.defineProperty(window, 'Notification', { value: class { static permission = 'default' }, configurable: true })

      // 'serviceWorker' in navigator check requires it on the prototype chain
      const origSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({}) }, configurable: true })

      // Not iOS — override userAgent
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 Chrome/120.0', configurable: true })
      Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })

      expect(getPushSupportStatus()).toBe('supported')

      // Clean up
      if (origSW) {
        Object.defineProperty(navigator, 'serviceWorker', origSW)
      }
    })

    it('returns "unsupported" when PushManager is missing', () => {
      // Remove PushManager if it was set
      delete (window as Record<string, unknown>)['PushManager']

      mockNavigator({ userAgent: 'Mozilla/5.0 Chrome/120.0', platform: 'Win32', maxTouchPoints: 0 })

      expect(getPushSupportStatus()).toBe('unsupported')
    })

    it('returns "ios-needs-install" for iOS Safari 16.4+ not standalone', () => {
      Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true })
      Object.defineProperty(window, 'Notification', { value: class { static permission = 'default' }, configurable: true })
      Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })

      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      })

      // Not standalone
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('standalone') ? false : false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
        configurable: true,
      })

      expect(getPushSupportStatus()).toBe('ios-needs-install')
    })

    it('returns "unsupported" for old iOS Safari', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      })

      expect(getPushSupportStatus()).toBe('unsupported')
    })
  })

  describe('getPermissionState', () => {
    it('returns current Notification.permission', () => {
      Object.defineProperty(window, 'Notification', {
        value: class { static permission = 'granted' as NotificationPermission },
        configurable: true,
      })
      expect(getPermissionState()).toBe('granted')
    })

    it('returns "unsupported" when Notification is missing', () => {
      delete (window as Record<string, unknown>)['Notification']
      expect(getPermissionState()).toBe('unsupported')
    })
  })

  describe('isIOSSafari', () => {
    it('returns false for Chrome on desktop', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 Chrome/120.0',
        platform: 'Win32',
        maxTouchPoints: 0,
      })
      expect(isIOSSafari()).toBe(false)
    })
  })

  describe('isStandalone', () => {
    it('returns false when not in standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: () => ({ matches: false }),
        configurable: true,
      })
      expect(isStandalone()).toBe(false)
    })
  })
})
