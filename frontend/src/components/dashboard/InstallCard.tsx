import { useState } from 'react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useToast } from '@/components/ui/Toast'

export function InstallCard() {
  const { isInstallable, isInstalled, isIOS, isDismissed, isDashboardCardShown, promptInstall, markDashboardCardShown } =
    useInstallPrompt()
  const { showToast } = useToast()
  const [visible, setVisible] = useState(true)

  // Show conditions: banner was dismissed + card not shown yet + installable + not installed + not iOS
  // iOS doesn't support beforeinstallprompt — the banner and Settings handle iOS separately
  if (!isDismissed || isDashboardCardShown || !isInstallable || isInstalled || isIOS || !visible) return null

  async function handleInstall() {
    const outcome = await promptInstall()
    markDashboardCardShown()
    setVisible(false)
    if (outcome === 'accepted') {
      showToast('Worship Room is on your home screen now. Welcome home.', 'success')
    }
  }

  function handleDismiss() {
    markDashboardCardShown()
    setVisible(false)
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
      <p className="text-white text-base font-medium">Take Worship Room with you</p>
      <p className="text-white/60 text-sm mt-1">Install the app for a faster, fuller experience.</p>
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleInstall}
          className="bg-primary text-white text-sm rounded-full px-4 py-2 hover:bg-primary-lt transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/40 hover:text-white/60 text-sm transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
