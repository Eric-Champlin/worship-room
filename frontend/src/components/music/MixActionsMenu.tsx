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

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const menuItems = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    if (!menuItems?.length) return
    const current = Array.from(menuItems).indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (current + 1) % menuItems.length
      menuItems[next].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (current - 1 + menuItems.length) % menuItems.length
      menuItems[prev].focus()
    }
  }

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
      onKeyDown={handleMenuKeyDown}
      className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-white/15 bg-hero-mid py-1 shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => item.action()}
          className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-lt ${
            item.danger ? 'text-danger' : 'text-white/80'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
