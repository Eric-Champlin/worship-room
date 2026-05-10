import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HandHelping, Heart, HelpCircle, MessagesSquare, Sparkles, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'
import { POST_TYPES, type PostType } from '@/constants/post-types'

interface ComposerChooserProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (postType: PostType) => void
}

const POST_TYPE_ICON_COMPONENTS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles,
  question: HelpCircle,
  discussion: MessagesSquare,
  encouragement: Heart,
}

const POST_TYPE_CARD_ACCENT: Record<PostType, { iconBg: string; iconText: string }> = {
  prayer_request: { iconBg: 'bg-white/10', iconText: 'text-white' },
  testimony: { iconBg: 'bg-amber-500/15', iconText: 'text-amber-200' },
  question: { iconBg: 'bg-cyan-500/15', iconText: 'text-cyan-200' },
  discussion: { iconBg: 'bg-violet-500/15', iconText: 'text-violet-200' },
  encouragement: { iconBg: 'bg-rose-500/15', iconText: 'text-rose-200' },
}

export function ComposerChooser({ isOpen, onClose, onSelect }: ComposerChooserProps) {
  const focusTrapRef = useFocusTrap(isOpen, onClose)
  // Mount in the "from" state, then flip to the "to" state on the next frame so
  // the CSS transition has a delta to interpolate. The global prefers-reduced-motion
  // rule in `frontend/src/styles/animations.css` collapses the transition to 0.01ms
  // for users who opt out — no per-component check needed.
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setHasEntered(false)
      return
    }
    const frame = requestAnimationFrame(() => setHasEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-chooser-title"
        className={cn(
          'relative w-full rounded-t-2xl border-t border-white/[0.12] bg-[#0D0620]/95 px-5 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur-xl',
          'sm:max-w-2xl sm:rounded-2xl sm:border sm:border-white/[0.12] sm:px-8 sm:pb-8 sm:pt-6',
          'transition-[transform,opacity] duration-base ease-decelerate',
          // Mobile: slide up from bottom edge. Desktop: fade in + subtle scale.
          // (`transform` covers both translate and scale, so a single transition target works.)
          hasEntered
            ? 'translate-y-0 opacity-100 sm:scale-100'
            : 'translate-y-full opacity-0 sm:translate-y-0 sm:scale-95',
        )}
      >
        {/* Mobile drag handle (visual-only) */}
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />

        {/* Title row */}
        <div className="flex items-center justify-between">
          <h2 id="composer-chooser-title" className="text-lg font-medium text-white sm:text-xl">
            What would you like to share?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[44px] w-[44px] items-center justify-center text-white/60 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Card grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {POST_TYPES.filter((entry) => entry.enabled).map((entry) => {
            const Icon = POST_TYPE_ICON_COMPONENTS[entry.id]
            const accent = POST_TYPE_CARD_ACCENT[entry.id]
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-label={entry.label}
                className={cn(
                  'group flex min-h-[44px] flex-col items-start gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 text-left',
                  'transition-[transform,background-color,border-color,box-shadow] duration-fast ease-standard',
                  'hover:bg-white/[0.08] hover:border-white/[0.18]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                  'active:scale-[0.98]',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    accent.iconBg,
                    accent.iconText,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-base font-semibold text-white">{entry.label}</span>
                <span className="text-sm text-white/70">{entry.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
