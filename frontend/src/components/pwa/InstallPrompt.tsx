import { useCallback } from 'react'
import { Share } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useToastSafe } from '@/components/ui/Toast'
import { Z } from '@/constants/z-index'

export function InstallPrompt() {
  const { shouldShowPrompt, isIOS, promptInstall, dismissSession, dismissBanner } =
    useInstallPrompt()
  const { pathname } = useLocation()
  const { showToast } = useToastSafe()

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      showToast('Worship Room is on your home screen now. Welcome home.', 'success')
    }
  }, [promptInstall, showToast])

  if (!shouldShowPrompt(pathname)) return null

  return (
    <div
      role="complementary"
      aria-label="Install app suggestion"
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-32px)] sm:w-auto sm:max-w-[480px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 motion-safe:animate-fade-in"
      style={{
        bottom: `max(16px, env(safe-area-inset-bottom, 0px))`,
        zIndex: Z.INSTALL_PROMPT,
      }}
    >
      {isIOS ? (
        <>
          <p className="text-white text-base font-medium">
            Add Worship Room to your Home Screen
          </p>
          <ol className="mt-2 space-y-1.5 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-white/90 font-medium">1.</span>
              <span>
                Tap the{' '}
                <Share className="inline h-4 w-4 text-white/90 -mt-0.5" aria-hidden="true" />{' '}
                Share button
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/90 font-medium">2.</span>
              <span>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</span>
            </li>
          </ol>
          <button
            type="button"
            onClick={dismissSession}
            className="text-white/60 text-sm mt-3 transition-colors hover:text-white/80 min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            className="block text-white/40 text-xs mt-1 transition-colors hover:text-white/60 hover:underline min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Don&rsquo;t ask again
          </button>
        </>
      ) : (
        <>
          <p className="text-white text-base font-medium">
            Install Worship Room for offline reading and faster access
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#08051A] shadow-sm transition-all motion-reduce:transition-none hover:bg-white/90 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismissSession}
              className="text-white/60 text-sm transition-colors hover:text-white/80 min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
            >
              Not now
            </button>
          </div>
          <button
            type="button"
            onClick={dismissBanner}
            className="block text-white/40 text-xs mt-2 transition-colors hover:text-white/60 hover:underline min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Don&rsquo;t ask again
          </button>
        </>
      )}
    </div>
  )
}
