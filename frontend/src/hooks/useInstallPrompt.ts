import { useState, useEffect, useRef, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UseInstallPromptReturn {
  /** Whether to show the install banner */
  showBanner: boolean
  /** Whether this is iOS Safari (needs manual instructions) */
  isIOS: boolean
  /** Call the deferred prompt's prompt() method (standard browsers only) */
  triggerInstall: () => Promise<'accepted' | 'dismissed' | null>
  /** Dismiss the banner (stores timestamp in localStorage) */
  dismissBanner: () => void
}

const VISIT_COUNT_KEY = 'wr_visit_count'
const DISMISS_KEY = 'wr_install_dismissed'
const SESSION_COUNTED_KEY = 'wr_session_counted'
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIOS && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

function isDismissedRecently(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) return false
    return Date.now() - Number(dismissed) < DISMISS_COOLDOWN_MS
  } catch (_e) {
    return false
  }
}

function getVisitCount(): number {
  try {
    return Number(localStorage.getItem(VISIT_COUNT_KEY) || '0')
  } catch (_e) {
    return 0
  }
}

function incrementVisitCount(): number {
  if (typeof sessionStorage === 'undefined') return getVisitCount()
  if (sessionStorage.getItem(SESSION_COUNTED_KEY)) return getVisitCount()

  const count = getVisitCount() + 1
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count))
  } catch (_e) {
    // localStorage write failure is non-critical
  }
  sessionStorage.setItem(SESSION_COUNTED_KEY, 'true')
  return count
}

export function useInstallPrompt(): UseInstallPromptReturn {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [promptAvailable, setPromptAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [visitCount, setVisitCount] = useState(0)
  const isIOS = isIOSSafari()

  // Increment visit count on mount (once per session)
  useEffect(() => {
    const count = incrementVisitCount()
    setVisitCount(count)
  }, [])

  // Listen for beforeinstallprompt
  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      setPromptAvailable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferredPromptRef.current) return null
    await deferredPromptRef.current.prompt()
    const { outcome } = await deferredPromptRef.current.userChoice
    deferredPromptRef.current = null
    setPromptAvailable(false)
    return outcome
  }, [])

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch (_e) {
      // localStorage write failure is non-critical
    }
    setDismissed(true)
  }, [])

  const showBanner =
    !dismissed &&
    visitCount >= 2 &&
    !isStandalone() &&
    !isDismissedRecently() &&
    (promptAvailable || isIOS)

  return { showBanner, isIOS, triggerInstall, dismissBanner }
}
