export type PushSupportStatus =
  | 'supported' // Full push support
  | 'ios-needs-install' // iOS Safari 16.4+ but not standalone (needs home screen install)
  | 'unsupported' // Browser doesn't support push

/**
 * Detect iOS Safari via user agent. Matches the pattern from
 * InstallPromptProvider.tsx:25-32.
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIOS && isSafari
}

/** Check if the app is running in standalone (PWA) mode. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Parse Safari version from user agent.
 * Returns the major.minor version as a number, or 0 if not Safari.
 */
function getSafariVersion(): number {
  if (typeof navigator === 'undefined') return 0
  const match = navigator.userAgent.match(/Version\/(\d+\.\d+)/)
  return match ? parseFloat(match[1]) : 0
}

/**
 * Determine the push notification support status for the current browser.
 *
 * iOS Safari requires version 16.4+ AND standalone (PWA) mode.
 * All other browsers need serviceWorker + PushManager + Notification APIs.
 */
export function getPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined') return 'unsupported'

  // iOS Safari has special requirements
  if (isIOSSafari()) {
    const version = getSafariVersion()
    if (version >= 16.4) {
      return isStandalone() ? 'supported' : 'ios-needs-install'
    }
    return 'unsupported'
  }

  // Non-iOS: check for required APIs
  const hasServiceWorker = 'serviceWorker' in navigator
  const hasPushManager = 'PushManager' in window
  const hasNotification = 'Notification' in window

  if (hasServiceWorker && hasPushManager && hasNotification) {
    return 'supported'
  }

  return 'unsupported'
}

/**
 * Get the current notification permission state.
 * Returns 'unsupported' if the Notification API is not available.
 */
export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Request notification permission from the user.
 * Only call this in response to an explicit user action (toggle click, button press).
 */
export async function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission()
}
