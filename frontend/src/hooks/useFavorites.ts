import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { storageService, StorageQuotaError } from '@/services/storage-service'
import type { Favorite, FavoriteType } from '@/types/storage'

export function useFavorites(): {
  favorites: Favorite[]
  isFavorite: (type: FavoriteType, targetId: string) => boolean
  toggleFavorite: (type: FavoriteType, targetId: string) => void
  isLoading: boolean
} {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    storageService.setAuthState(isAuthenticated)
    if (isAuthenticated) {
      setFavorites(storageService.getFavorites())
    } else {
      setFavorites([])
    }
    setIsLoading(false)
  }, [isAuthenticated])

  const isFavorite = useCallback(
    (type: FavoriteType, targetId: string) =>
      favorites.some((f) => f.type === type && f.targetId === targetId),
    [favorites],
  )

  const toggleFavorite = useCallback(
    (type: FavoriteType, targetId: string) => {
      if (!isAuthenticated) {
        authModal?.openAuthModal('Sign in to save favorites')
        return
      }

      const alreadyFav = favorites.some(
        (f) => f.type === type && f.targetId === targetId,
      )

      // Optimistic UI update
      if (alreadyFav) {
        setFavorites((prev) =>
          prev.filter((f) => !(f.type === type && f.targetId === targetId)),
        )
      } else {
        setFavorites((prev) => [
          ...prev,
          { type, targetId, createdAt: new Date().toISOString() },
        ])
      }

      try {
        if (alreadyFav) {
          storageService.removeFavorite(type, targetId)
        } else {
          storageService.addFavorite(type, targetId)
        }
      } catch (e) {
        // Revert optimistic update
        setFavorites(storageService.getFavorites())
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Please remove some items.', 'error')
        }
      }
    },
    [isAuthenticated, favorites, authModal, showToast],
  )

  return { favorites, isFavorite, toggleFavorite, isLoading }
}
