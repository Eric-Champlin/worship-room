import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface FriendMenuProps {
  friendName: string
  onRemove: () => void
  onMute: () => void
  onBlock: () => void
  onClose: () => void
}

export function FriendMenu({ friendName, onRemove, onMute, onBlock, onClose }: FriendMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const [confirmAction, setConfirmAction] = useState<'remove' | 'mute' | 'block' | null>(null)

  // Focus first item on open
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  // Close on outside click — but only when no confirm dialog is open;
  // otherwise the dialog backdrop click would race with this handler.
  useEffect(() => {
    if (confirmAction !== null) return
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose, confirmAction])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmAction('remove')
  }

  function handleMute(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmAction('mute')
  }

  function handleBlock(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmAction('block')
  }

  function handleConfirm() {
    if (confirmAction === 'remove') onRemove()
    else if (confirmAction === 'mute') onMute()
    else if (confirmAction === 'block') onBlock()
    setConfirmAction(null)
    onClose()
  }

  function handleCancel() {
    setConfirmAction(null)
  }

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Options for ${friendName}`}
        onKeyDown={handleKeyDown}
        className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-white/15 bg-hero-mid shadow-lg"
      >
        <button
          ref={firstItemRef}
          role="menuitem"
          onClick={handleRemove}
          className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-none"
        >
          Remove Friend
        </button>
        <button
          role="menuitem"
          onClick={handleMute}
          className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-none"
        >
          Mute
        </button>
        <button
          role="menuitem"
          onClick={handleBlock}
          className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-white/5 hover:text-red-300 focus:bg-white/5 focus:outline-none"
        >
          Block
        </button>
      </div>
      <ConfirmDialog
        isOpen={confirmAction === 'remove'}
        title={`Remove ${friendName} from friends?`}
        body="You can send another friend request later if you change your mind."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <ConfirmDialog
        isOpen={confirmAction === 'mute'}
        title={`Mute ${friendName}?`}
        body="Their posts won't appear in your feed. They won't know you've muted them. You can unmute anytime in Settings → Privacy."
        confirmLabel="Mute"
        variant="default"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <ConfirmDialog
        isOpen={confirmAction === 'block'}
        title={`Block ${friendName}?`}
        body="They won't be able to send you friend requests, encouragements, or nudges. Existing friendship and pending requests will be removed."
        confirmLabel="Block"
        variant="destructive"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
