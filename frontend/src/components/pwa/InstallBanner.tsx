import { useState } from 'react'
import { Share, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useAudioState } from '@/components/audio/AudioProvider'
import { useToast } from '@/components/ui/Toast'

export function InstallBanner() {
  const { showBanner, isIOS, triggerInstall, dismissBanner } = useInstallPrompt()
  const { pillVisible } = useAudioState()
  const { showToast } = useToast()
  const [installing, setInstalling] = useState(false)

  if (!showBanner) return null

  async function handleInstall() {
    setInstalling(true)
    const outcome = await triggerInstall()
    setInstalling(false)
    if (outcome === 'accepted') {
      showToast('Worship Room installed! Find it on your home screen.', 'success')
      dismissBanner()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Install Worship Room"
      className={cn(
        'fixed left-1/2 z-[9997] -translate-x-1/2 motion-safe:animate-fade-in',
        'w-[calc(100%-32px)] sm:max-w-[560px]',
        'rounded-xl border-t border-white/15 bg-white/10 shadow-2xl backdrop-blur-md',
        'px-4 py-3 sm:px-5 sm:py-4',
        'pb-[max(12px,env(safe-area-inset-bottom))]',
        pillVisible ? 'bottom-24' : 'bottom-6'
      )}
    >
      <div className="flex items-center gap-3">
        {/* App icon or iOS share icon */}
        {isIOS ? (
          <Share className="h-8 w-8 shrink-0 text-white/70" aria-hidden="true" />
        ) : (
          <img
            src="/icon-192.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg"
            aria-hidden="true"
          />
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install Worship Room</p>
          <p className="text-xs text-white/50">
            {isIOS
              ? "Tap the Share button below, then 'Add to Home Screen'"
              : 'Get the full app experience'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!isIOS && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss install prompt"
            className="rounded p-1 text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
