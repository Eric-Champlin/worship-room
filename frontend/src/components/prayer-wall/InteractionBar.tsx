import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { HandHelping, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from './AuthModalProvider'
import { ShareDropdown, getShareText } from './ShareDropdown'
import type { PrayerRequest, PrayerReaction } from '@/types/prayer-wall'

interface InteractionBarProps {
  prayer: PrayerRequest
  reactions: PrayerReaction | undefined
  onTogglePraying: () => void
  onToggleComments: () => void
  onToggleBookmark: () => void
  isCommentsOpen: boolean
}

const btnBase =
  'flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded'

export function InteractionBar({
  prayer,
  reactions,
  onTogglePraying,
  onToggleComments,
  onToggleBookmark,
  isCommentsOpen,
}: InteractionBarProps) {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const isPraying = reactions?.isPraying ?? false
  const isBookmarked = reactions?.isBookmarked ?? false

  const [shareOpen, setShareOpen] = useState(false)

  const handleShareClick = useCallback(async () => {
    // Try native share on mobile devices only
    const isMobile = window.innerWidth < 640
    if (isMobile && navigator.share) {
      const shareUrl = `${window.location.origin}/prayer-wall/${prayer.id}`
      try {
        await navigator.share({
          title: 'Prayer Request',
          text: getShareText(prayer.content),
          url: shareUrl,
        })
        return
      } catch {
        // Fall through to dropdown if native share fails/cancels
      }
    }
    setShareOpen((prev) => !prev)
  }, [prayer.id, prayer.content])

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 sm:gap-4">
      {/* Pray button */}
      <button
        type="button"
        onClick={onTogglePraying}
        className={cn(
          btnBase,
          isPraying ? 'font-medium text-primary' : 'text-text-light hover:text-primary',
        )}
        aria-label={isPraying ? `Stop praying for this request (${prayer.prayingCount} praying)` : `Pray for this request (${prayer.prayingCount} praying)`}
        aria-pressed={isPraying}
      >
        <HandHelping className="h-4 w-4" aria-hidden="true" />
        <span>({prayer.prayingCount})</span>
      </button>

      {/* Comment button */}
      <button
        type="button"
        onClick={onToggleComments}
        className={cn(btnBase, 'text-text-light hover:text-text-dark')}
        aria-label={`Comments, ${prayer.commentCount} ${prayer.commentCount === 1 ? 'comment' : 'comments'}`}
        aria-expanded={isCommentsOpen}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        <span>({prayer.commentCount})</span>
      </button>

      {/* Bookmark button */}
      {isLoggedIn ? (
        <button
          type="button"
          onClick={onToggleBookmark}
          className={cn(
            btnBase,
            isBookmarked
              ? 'text-primary'
              : 'text-text-light hover:text-primary',
          )}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this prayer'}
          aria-pressed={isBookmarked}
        >
          <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-primary')} aria-hidden="true" />
        </button>
      ) : authModal ? (
        <button
          type="button"
          onClick={authModal.openAuthModal}
          className={cn(btnBase, 'text-text-light hover:text-primary')}
          aria-label="Log in to bookmark"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <Link
          to="/login"
          className={cn(btnBase, 'text-text-light hover:text-primary')}
          aria-label="Log in to bookmark"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      {/* Share button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleShareClick}
          className={cn(btnBase, 'text-text-light hover:text-text-dark')}
          aria-label="Share this prayer"
          aria-haspopup="menu"
          aria-expanded={shareOpen}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <ShareDropdown
          prayerId={prayer.id}
          prayerContent={prayer.content}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      </div>
    </div>
  )
}
