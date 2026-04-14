import { useState, useRef, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import type { FavoriteType } from '@/types/storage'

const ANNOUNCEMENT_CLEAR_MS = 3000

interface FavoriteButtonProps {
  type: FavoriteType
  targetId: string
  targetName: string
  className?: string
}

export function FavoriteButton({
  type,
  targetId,
  targetName,
  className,
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [bouncing, setBouncing] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => {
    clearTimeout(announcementTimerRef.current)
    clearTimeout(bounceTimerRef.current)
  }, [])

  const favorited = isFavorite(type, targetId)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()

    toggleFavorite(type, targetId)

    if (isAuthenticated) {
      setBouncing(true)
      clearTimeout(bounceTimerRef.current)
      bounceTimerRef.current = setTimeout(() => setBouncing(false), 100)
      setAnnouncement(
        favorited
          ? `${targetName} removed from favorites`
          : `${targetName} added to favorites`,
      )
      clearTimeout(announcementTimerRef.current)
      announcementTimerRef.current = setTimeout(() => setAnnouncement(''), ANNOUNCEMENT_CLEAR_MS)
    }
  }

  // Logged-out: visible but triggers auth modal on click
  if (!isAuthenticated) {
    return (
      <button
        type="button"
        aria-label={`Sign in to add ${targetName} to favorites`}
        className={cn(
          'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/20 text-white/30',
          className,
        )}
        onClick={(e) => {
          e.stopPropagation()
          toggleFavorite(type, targetId)
        }}
      >
        <Heart className="h-5 w-5" />
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={favorited}
        aria-label={
          favorited
            ? `Remove ${targetName} from favorites`
            : `Add ${targetName} to favorites`
        }
        onClick={handleClick}
        className={cn(
          'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/20 transition-transform motion-reduce:transition-none duration-fast',
          favorited ? 'text-danger' : 'text-white/50',
          bouncing && 'scale-125',
          className,
        )}
      >
        <Heart
          className="h-5 w-5"
          fill={favorited ? 'currentColor' : 'none'}
        />
      </button>
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </>
  )
}
