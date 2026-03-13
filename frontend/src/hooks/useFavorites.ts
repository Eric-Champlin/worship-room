import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { storageService, StorageQuotaError } from '@/services/storage-service'
import type { Favorite, FavoriteType } from '@/types/storage'

export function useFavorites() {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    storageService.setAuthState(isLoggedIn)
    if (isLoggedIn) {
      setFavorites(storageService.getFavorites())
    } else {
      setFavorites([])
    }
    setIsLoading(false)
  }, [isLoggedIn])

  const isFavorite = useCallback(
    (type: FavoriteType, targetId: string) =>
      favorites.some((f) => f.type === type && f.targetId === targetId),
    [favorites],
  )

  const toggleFavorite = useCallback(
    (type: FavoriteType, targetId: string) => {
      if (!isLoggedIn) {
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
    [isLoggedIn, favorites, authModal, showToast],
  )

  return { favorites, isFavorite, toggleFavorite, isLoading }
}
