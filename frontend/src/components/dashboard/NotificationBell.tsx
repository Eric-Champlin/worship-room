import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  unreadCount: number
  isOpen: boolean
  onToggle: () => void
}

export function NotificationBell({ unreadCount, isOpen, onToggle }: NotificationBellProps) {
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount)
  const ariaLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications'

  const [isRinging, setIsRinging] = useState(false)
  const prevCountRef = useRef(unreadCount)

  // Shake bell when unread count increases
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setIsRinging(true)
      const timer = setTimeout(() => setIsRinging(false), 300)
      prevCountRef.current = unreadCount
      return () => clearTimeout(timer)
    }
    prevCountRef.current = unreadCount
  }, [unreadCount])

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={onToggle}
        className="rounded-lg p-1.5 text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell
          className={cn(
            'h-5 w-5',
            isRinging && 'motion-safe:animate-bell-ring',
          )}
          aria-hidden="true"
        />
      </button>

      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center',
            'rounded-full bg-red-500 px-1 text-xs font-bold text-white',
            'pointer-events-none',
          )}
          aria-hidden="true"
        >
          {badgeText}
        </span>
      )}
    </div>
  )
}
