import { useState, useCallback, useRef, useEffect } from 'react'
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
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const isPraying = reactions?.isPraying ?? false
  const isBookmarked = reactions?.isBookmarked ?? false

  const [isAnimating, setIsAnimating] = useState(false)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePrayClick = useCallback(() => {
    if (isPraying) {
      // Untoggle — cancel any running ceremony animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
      setIsAnimating(false)
      onTogglePraying()
      return
    }
    // Toggle ON — start ceremony
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }
    setIsAnimating(true)
    onTogglePraying()
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, 600)
  }, [isPraying, onTogglePraying])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

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
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 sm:gap-4">
      {/* Pray button wrapper — relative for absolute-positioned animation elements */}
      <div className="relative">
        <button
          type="button"
          onClick={handlePrayClick}
          className={cn(
            btnBase,
            isPraying ? 'font-medium text-primary' : 'text-white/50 hover:text-primary',
          )}
          aria-label={isPraying ? `Stop praying for this request (${prayer.prayingCount} praying)` : `Pray for this request (${prayer.prayingCount} praying)`}
          aria-pressed={isPraying}
        >
          <HandHelping
            className={cn(
              'h-4 w-4',
              isAnimating && 'motion-safe:animate-pray-icon-pulse',
            )}
            aria-hidden="true"
          />
          <span>({prayer.prayingCount})</span>
        </button>

        {/* Ripple — absolutely positioned circle behind button */}
        {isAnimating && (
          <span
            className="pointer-events-none absolute inset-0 motion-safe:animate-pray-ripple rounded-full bg-primary/30"
            aria-hidden="true"
          />
        )}

        {/* Floating "+1 prayer" text */}
        {isAnimating && (
          <span
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-sans text-primary motion-safe:animate-pray-float-text"
            aria-hidden="true"
          >
            +1 prayer
          </span>
        )}
      </div>

      {/* Comment button */}
      <button
        type="button"
        onClick={onToggleComments}
        className={cn(btnBase, 'text-white/50 hover:text-white/70')}
        aria-label={`Comments, ${prayer.commentCount} ${prayer.commentCount === 1 ? 'comment' : 'comments'}`}
        aria-expanded={isCommentsOpen}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        <span>({prayer.commentCount})</span>
      </button>

      {/* Bookmark button */}
      {isAuthenticated ? (
        <button
          type="button"
          onClick={onToggleBookmark}
          className={cn(
            btnBase,
            isBookmarked
              ? 'text-primary'
              : 'text-white/50 hover:text-primary',
          )}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this prayer'}
          aria-pressed={isBookmarked}
        >
          <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-primary')} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => authModal?.openAuthModal()}
          className={cn(btnBase, 'text-white/50 hover:text-primary')}
          aria-label="Log in to bookmark"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Share button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleShareClick}
          className={cn(btnBase, 'text-white/50 hover:text-white/70')}
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
