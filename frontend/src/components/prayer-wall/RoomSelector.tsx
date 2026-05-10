import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { POST_TYPES, type PostType } from '@/constants/post-types'

interface RoomSelectorProps {
  activePostType: PostType | null
  onSelectPostType: (postType: PostType | null) => void
}

// Per-type accent classes mirror PrayerCard's per-type chrome. Inline to avoid
// a single-consumer constants file (deferred per spec 4.8 plan Edge Cases).
const POST_TYPE_ACCENTS: Record<PostType | 'all', { active: string; inactive: string }> = {
  all: {
    active: 'border-primary/40 bg-primary/20 text-primary-lt',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
  prayer_request: {
    active: 'border-white/40 bg-white/15 text-white',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
  testimony: {
    active: 'border-amber-300/40 bg-amber-500/20 text-amber-100',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
  question: {
    active: 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
  discussion: {
    active: 'border-violet-300/40 bg-violet-500/20 text-violet-100',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
  encouragement: {
    active: 'border-rose-300/40 bg-rose-500/20 text-rose-100',
    inactive:
      'border-white/15 bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90',
  },
}

export function RoomSelector({ activePostType, onSelectPostType }: RoomSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const checkOverflow = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setShowFade(hasOverflow && !atEnd)
    }

    checkOverflow()
    el.addEventListener('scroll', checkOverflow, { passive: true })
    const observer = new ResizeObserver(checkOverflow)
    observer.observe(el)

    return () => {
      el.removeEventListener('scroll', checkOverflow)
      observer.disconnect()
    }
  }, [])

  const rooms: Array<{ id: PostType | null; label: string }> = [
    { id: null, label: 'All' },
    ...POST_TYPES.map((t) => ({ id: t.id, label: t.pluralLabel })),
  ]

  return (
    <div
      role="toolbar"
      aria-label="Filter by post type"
      className="w-full border-b border-white/10 bg-hero-mid/90 backdrop-blur-sm"
    >
      <div className="relative mx-auto max-w-5xl">
        <div
          ref={scrollRef}
          className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth px-4 py-3 scrollbar-none"
        >
          {rooms.map((room) => {
            const isActive = activePostType === room.id
            const accentKey = (room.id ?? 'all') as keyof typeof POST_TYPE_ACCENTS
            const accent = POST_TYPE_ACCENTS[accentKey]
            return (
              <button
                key={room.id ?? 'all'}
                type="button"
                onClick={() => onSelectPostType(room.id)}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-[colors,transform] duration-fast whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 active:scale-[0.98]',
                  isActive ? accent.active : accent.inactive,
                )}
                aria-pressed={isActive}
              >
                {room.label}
              </button>
            )
          })}
        </div>

        {showFade && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(30, 11, 62, 0.9))',
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
