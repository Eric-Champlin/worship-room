import { useState, useCallback, useRef } from 'react'
import { Heart } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useSocialInteractions } from '@/hooks/useSocialInteractions'
import { MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY } from '@/constants/dashboard/encouragements'
import { EncouragePopover } from './EncouragePopover'

interface EncourageButtonProps {
  friendId: string
  friendName: string
  iconOnly?: boolean
}

export function EncourageButton({ friendId, friendName, iconOnly }: EncourageButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const lastSendRef = useRef(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { showToast } = useToast()
  const { sendEncouragement, canEncourage } = useSocialInteractions()

  const isDisabled = !canEncourage(friendId)

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isDisabled) return
      setPopoverOpen((prev) => !prev)
    },
    [isDisabled],
  )

  const handleClose = useCallback(() => {
    setPopoverOpen(false)
    buttonRef.current?.focus()
  }, [])

  const handleSend = useCallback(
    (message: string) => {
      // 300ms debounce to prevent double-sends
      const now = Date.now()
      if (now - lastSendRef.current < 300) return
      lastSendRef.current = now

      setPopoverOpen(false)
      sendEncouragement(friendId, friendName, message)
      showToast(`Encouragement sent to ${friendName}!`, 'success')
    },
    [friendId, friendName, sendEncouragement, showToast],
  )

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={popoverOpen}
        aria-disabled={isDisabled || undefined}
        aria-label={
          isDisabled
            ? `You've encouraged ${friendName} ${MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY} times today`
            : `Encourage ${friendName}`
        }
        title={
          isDisabled
            ? `You've encouraged ${friendName} ${MAX_ENCOURAGEMENTS_PER_FRIEND_PER_DAY} times today`
            : undefined
        }
        className={
          isDisabled
            ? 'flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white/40 opacity-40'
            : 'flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white/50 transition-colors hover:text-white/70'
        }
        disabled={false}
        tabIndex={isDisabled ? -1 : 0}
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        {!iconOnly && <span className="hidden sm:inline">Encourage</span>}
      </button>
      {popoverOpen && (
        <EncouragePopover
          friendName={friendName}
          onClose={handleClose}
          onSend={handleSend}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
