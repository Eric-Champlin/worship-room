import { useEffect, useRef } from 'react'
import { Sprout, Leaf, Flower2, TreePine, Trees, Landmark } from 'lucide-react'
import type { LeaderboardEntry } from '@/types/dashboard'

const LEVEL_ICONS: Record<number, React.ElementType> = {
  1: Sprout,
  2: Leaf,
  3: Flower2,
  4: TreePine,
  5: Trees,
  6: Landmark,
}

interface ProfilePopupProps {
  entry: LeaderboardEntry
  onClose: () => void
}

export function ProfilePopup({ entry, onClose }: ProfilePopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  const LevelIcon = LEVEL_ICONS[entry.level] || Sprout

  useEffect(() => {
    ref.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Profile of ${entry.displayName}`}
      tabIndex={-1}
      className="absolute left-0 top-full z-10 mt-1 max-w-xs rounded-xl border border-white/15 bg-dashboard-gradient p-3 shadow-lg"
    >
      <div className="flex items-center gap-2 text-sm text-white">
        <LevelIcon className="h-4 w-4 text-white/60" aria-hidden="true" />
        <span>{entry.levelName}</span>
        <span className="text-white/40">&middot;</span>
        <span className="text-white/60">{entry.badgeCount} badges</span>
      </div>
    </div>
  )
}
