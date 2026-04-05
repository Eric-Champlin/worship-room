import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  InstallPromptContext,
  type InstallPromptContextValue,
} from './InstallPromptContext'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const VISIT_COUNT_KEY = 'wr_visit_count'
const DISMISS_KEY = 'wr_install_dismissed'
const SESSION_COUNTED_KEY = 'wr_session_counted'
const DASHBOARD_SHOWN_KEY = 'wr_install_dashboard_shown'

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

function getVisitCount(): number {
  try {
    return Number(localStorage.getItem(VISIT_COUNT_KEY) || '0')
  } catch {
    return 0
  }
}

function incrementVisitCount(): number {
  if (typeof sessionStorage === 'undefined') return getVisitCount()
  if (sessionStorage.getItem(SESSION_COUNTED_KEY)) return getVisitCount()

  const count = getVisitCount() + 1
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count))
  } catch {
    // localStorage write failure is non-critical
  }
  sessionStorage.setItem(SESSION_COUNTED_KEY, 'true')
  return count
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [promptAvailable, setPromptAvailable] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) !== null
    } catch {
      return false
    }
  })
  const [dashboardCardShown, setDashboardCardShown] = useState(() => {
    try {
      return localStorage.getItem(DASHBOARD_SHOWN_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [visitCount, setVisitCount] = useState(0)
  const ios = useMemo(() => isIOSSafari(), [])

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

  // Listen for appinstalled
  useEffect(() => {
    function handleAppInstalled() {
      setInstalled(true)
      deferredPromptRef.current = null
      setPromptAvailable(false)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
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
    } catch {
      // localStorage write failure is non-critical
    }
    setDismissed(true)
  }, [])

  const markDashboardCardShown = useCallback(() => {
    try {
      localStorage.setItem(DASHBOARD_SHOWN_KEY, 'true')
    } catch {
      // localStorage write failure is non-critical
    }
    setDashboardCardShown(true)
  }, [])

  const value = useMemo<InstallPromptContextValue>(
    () => ({
      isInstallable: promptAvailable || ios,
      isInstalled: installed,
      isIOS: ios,
      visitCount,
      isDismissed: dismissed,
      isDashboardCardShown: dashboardCardShown,
      promptInstall,
      dismissBanner,
      markDashboardCardShown,
    }),
    [promptAvailable, ios, installed, visitCount, dismissed, dashboardCardShown, promptInstall, dismissBanner, markDashboardCardShown]
  )

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
    </InstallPromptContext.Provider>
  )
}
