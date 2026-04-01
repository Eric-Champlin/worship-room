import { useState, useEffect, useRef, useCallback } from 'react'
import { Share, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useToastSafe } from '@/components/ui/Toast'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const AUTO_DISMISS_MS = 10_000

export function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, isDismissed, visitCount, promptInstall, dismissBanner } =
    useInstallPrompt()
  const { showToast } = useToastSafe()
  const prefersReduced = useReducedMotion()
  const [hiding, setHiding] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = isInstallable && !isInstalled && !isDismissed && visitCount >= 3

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (prefersReduced) {
      dismissBanner()
      return
    }
    setHiding(true)
    hideTransitionRef.current = setTimeout(() => {
      dismissBanner()
    }, 200)
  }, [prefersReduced, dismissBanner])

  const handleInstall = useCallback(async () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      showToast('Worship Room is on your home screen now. Welcome home.', 'success')
      dismissBanner()
    }
  }, [promptInstall, showToast, dismissBanner])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!show || hiding) return
    dismissTimerRef.current = setTimeout(() => {
      handleDismiss()
    }, AUTO_DISMISS_MS)
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [show, hiding, handleDismiss])

  // Cleanup hide transition timer
  useEffect(() => {
    return () => {
      if (hideTransitionRef.current) clearTimeout(hideTransitionRef.current)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="mt-2 w-full"
      style={{
        maxHeight: hiding ? 0 : 200,
        opacity: hiding ? 0 : 1,
        overflow: 'hidden',
        transition: prefersReduced
          ? 'none'
          : 'max-height 200ms ease-out, opacity 200ms ease-out',
      }}
      role="complementary"
      aria-label="Install app suggestion"
    >
      <div className="relative flex items-center gap-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 px-4 py-2 sm:px-6">
        {/* App icon or iOS share icon */}
        {isIOS ? (
          <Share className="h-6 w-6 shrink-0 text-white/70" aria-hidden="true" />
        ) : (
          <img
            src="/icon-192.png"
            alt=""
            className="h-6 w-6 shrink-0 rounded-md"
            aria-hidden="true"
          />
        )}

        {/* Message */}
        <span className="min-w-0 flex-1 truncate text-sm text-white/70">
          {isIOS
            ? "Tap Share, then 'Add to Home Screen'"
            : 'Worship Room is better as an app'}
        </span>

        {/* Install button (non-iOS only) */}
        {!isIOS && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
          >
            Install
          </button>
        )}

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Auto-dismiss progress line */}
        {!hiding && (
          <div
            className="absolute bottom-0 left-4 right-4 h-0.5 overflow-hidden rounded-full sm:left-6 sm:right-6"
          >
            <div
              className="h-full w-full rounded-full bg-white/20"
              style={{
                animation: prefersReduced ? 'none' : `install-progress ${AUTO_DISMISS_MS}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      {/* Keyframes for progress bar */}
      <style>{`
        @keyframes install-progress {
          from { transform: scaleX(1); transform-origin: left; }
          to { transform: scaleX(0); transform-origin: left; }
        }
      `}</style>
    </div>
  )
}
