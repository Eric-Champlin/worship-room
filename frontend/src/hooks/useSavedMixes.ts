import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { storageService, StorageQuotaError } from '@/services/storage-service'
import type { SavedMix } from '@/types/storage'

export function useSavedMixes(): {
  mixes: SavedMix[]
  saveMix: (name: string, sounds: { soundId: string; volume: number }[]) => SavedMix | null
  updateName: (id: string, name: string) => void
  deleteMix: (id: string) => void
  duplicateMix: (id: string) => SavedMix | null | undefined
} {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const [mixes, setMixes] = useState<SavedMix[]>([])

  useEffect(() => {
    storageService.setAuthState(isAuthenticated)
    if (isAuthenticated) {
      setMixes(storageService.getSavedMixes())
    } else {
      setMixes([])
    }
  }, [isAuthenticated])

  const saveMix = useCallback(
    (name: string, sounds: { soundId: string; volume: number }[]) => {
      if (!isAuthenticated) {
        authModal?.openAuthModal('Sign in to save your mix')
        return null
      }

      try {
        const mix = storageService.saveMix(name, sounds)
        setMixes(storageService.getSavedMixes())
        return mix
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Remove some items to make room.', 'error')
        }
        return null
      }
    },
    [isAuthenticated, authModal, showToast],
  )

  const updateName = useCallback(
    (id: string, name: string) => {
      if (!isAuthenticated) return

      try {
        storageService.updateMixName(id, name)
        setMixes(storageService.getSavedMixes())
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Remove some items to make room.', 'error')
        }
      }
    },
    [isAuthenticated, showToast],
  )

  const deleteMix = useCallback(
    (id: string) => {
      if (!isAuthenticated) return
      storageService.deleteMix(id)
      setMixes(storageService.getSavedMixes())
    },
    [isAuthenticated],
  )

  const duplicateMix = useCallback(
    (id: string) => {
      if (!isAuthenticated) return null

      try {
        const copy = storageService.duplicateMix(id)
        if (copy) {
          setMixes(storageService.getSavedMixes())
        }
        return copy
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Remove some items to make room.', 'error')
        }
        return null
      }
    },
    [isAuthenticated, showToast],
  )

  return { mixes, saveMix, updateName, deleteMix, duplicateMix }
}
