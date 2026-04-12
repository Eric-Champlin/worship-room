import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Z } from '@/constants/z-index'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1.5 flex items-center gap-2"
      style={{
        zIndex: Z.OFFLINE_INDICATOR,
        bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        left: 'max(16px, env(safe-area-inset-left, 0px))',
      }}
    >
      <WifiOff className="h-3.5 w-3.5 text-white/70" aria-hidden="true" />
      <span className="text-xs text-white/70">Offline</span>
    </div>
  )
}
