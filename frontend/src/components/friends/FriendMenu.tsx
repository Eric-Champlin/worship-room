import { useEffect, useRef } from 'react'

interface FriendMenuProps {
  friendName: string
  onRemove: () => void
  onBlock: () => void
  onClose: () => void
}

export function FriendMenu({ friendName, onRemove, onBlock, onClose }: FriendMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  // Focus first item on open
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Remove ${friendName} from friends?`)) {
      onRemove()
    }
    onClose()
  }

  function handleBlock(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Block ${friendName}? This will remove them and prevent future requests.`)) {
      onBlock()
    }
    onClose()
  }

  return (
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
        onClick={handleBlock}
        className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-white/5 hover:text-red-300 focus:bg-white/5 focus:outline-none"
      >
        Block
      </button>
    </div>
  )
}
