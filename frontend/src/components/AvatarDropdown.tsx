import { Link } from 'react-router-dom'
import { BarChart3, Heart, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const AVATAR_MENU_LINKS: ReadonlyArray<{ label: string; to: string; icon: LucideIcon }> = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'My Prayers', to: '/my-prayers', icon: Heart },
  { label: 'Friends', to: '/friends', icon: Users },
  { label: 'Mood Insights', to: '/insights', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
]

interface AvatarDropdownProps {
  user: { name: string; id: string }
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onLogout: () => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function AvatarDropdown({ user, isOpen, onToggle, onClose, onLogout, triggerRef }: AvatarDropdownProps) {
  const initial = user.name.charAt(0).toUpperCase()

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'user-menu-dropdown' : undefined}
        aria-label="User menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 min-w-[200px] pt-2">
          <div
            id="user-menu-dropdown"
            role="menu"
            className="motion-safe:animate-dropdown-in rounded-xl border border-white/15 bg-hero-mid py-1.5 shadow-lg"
          >
            {AVATAR_MENU_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                role="menuitem"
                onClick={onClose}
                className="flex min-h-[44px] items-center gap-3 rounded px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                <link.icon size={16} aria-hidden="true" />
                {link.label}
              </Link>
            ))}
            <hr className="my-1 border-white/15" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full min-h-[44px] items-center gap-3 rounded px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
