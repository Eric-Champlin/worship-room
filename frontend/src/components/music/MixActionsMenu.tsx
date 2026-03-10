import { useEffect, useRef } from 'react'

interface MixActionsMenuProps {
  mixName: string
  onLoad: () => void
  onEditName: () => void
  onDuplicate: () => void
  onShare: () => void
  onDelete: () => void
  onClose: () => void
}

export function MixActionsMenu({
  mixName,
  onLoad,
  onEditName,
  onDuplicate,
  onShare,
  onDelete,
  onClose,
}: MixActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Focus first menu item on open
  useEffect(() => {
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
  }, [])

  const items = [
    { label: 'Load', action: onLoad },
    { label: 'Edit Name', action: onEditName },
    { label: 'Duplicate', action: onDuplicate },
    { label: 'Share', action: onShare },
    { label: 'Delete', action: onDelete, danger: true },
  ]

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${mixName}`}
      className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-white/15 bg-hero-mid py-1 shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => item.action()}
          className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 ${
            item.danger ? 'text-danger' : 'text-white/80'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
