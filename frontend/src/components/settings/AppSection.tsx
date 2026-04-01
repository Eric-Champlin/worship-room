import { useState } from 'react'
import { Check, Download, Share } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useToast } from '@/components/ui/Toast'

export function AppSection() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt()
  const { showToast } = useToast()
  const [installing, setInstalling] = useState(false)

  if (!isInstallable && !isInstalled) return null

  async function handleInstall() {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome === 'accepted') {
      showToast('Worship Room is on your home screen now. Welcome home.', 'success')
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">App</h2>

      {isInstalled ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.06]">
          <Check className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-emerald-400">App Installed</span>
        </div>
      ) : isIOS ? (
        <div
          className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.06]"
          role="note"
          aria-label="Install Worship Room on iOS"
        >
          <Share className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-medium text-white block">Install Worship Room</span>
            <span className="text-xs text-white/60 block">Tap Share, then &apos;Add to Home Screen&apos;</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="flex w-full items-center gap-4 p-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark disabled:opacity-50"
          aria-label="Install Worship Room"
        >
          <Download className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-medium text-white block">Install Worship Room</span>
            <span className="text-xs text-white/60 block">Add to your home screen for the full experience</span>
          </div>
        </button>
      )}
    </div>
  )
}
