import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineMessageProps {
  /** Message to display. Defaults to "You're offline — this feature needs an internet connection" */
  message?: string
  /** 'dark' for dark backgrounds (text-white/40 icon, text-white/60 text), 'light' for neutral-bg */
  variant?: 'dark' | 'light'
  className?: string
}

export function OfflineMessage({
  message = "You're offline — this feature needs an internet connection",
  variant = 'dark',
  className,
}: OfflineMessageProps) {
  const iconColor = variant === 'dark' ? 'text-white/40' : 'text-text-light'
  const textColor = variant === 'dark' ? 'text-white/60' : 'text-text-light'

  return (
    <div
      role="status"
      className={cn('flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-4', className)}
    >
      <WifiOff className={cn('h-4 w-4 shrink-0', iconColor)} aria-hidden="true" />
      <p className={cn('text-sm', textColor)}>{message}</p>
    </div>
  )
}
