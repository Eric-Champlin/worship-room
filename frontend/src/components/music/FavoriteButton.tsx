import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useFavorites } from '@/hooks/useFavorites'
import type { FavoriteType } from '@/types/storage'

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
  const { isLoggedIn } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [bouncing, setBouncing] = useState(false)

  const favorited = isFavorite(type, targetId)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()

    toggleFavorite(type, targetId)

    if (isLoggedIn) {
      setBouncing(true)
      setTimeout(() => setBouncing(false), 100)
    }
  }

  // Logged-out: visible but triggers auth modal on click
  if (!isLoggedIn) {
    return (
      <button
        type="button"
        aria-label={`Sign in to add ${targetName} to favorites`}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/30',
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
        'flex h-8 w-8 items-center justify-center rounded-full bg-black/20 transition-transform duration-100',
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
  )
}
