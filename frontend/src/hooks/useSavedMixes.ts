import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { storageService, StorageQuotaError } from '@/services/storage-service'
import type { SavedMix } from '@/types/storage'

export function useSavedMixes() {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const [mixes, setMixes] = useState<SavedMix[]>([])

  useEffect(() => {
    storageService.setAuthState(isLoggedIn)
    if (isLoggedIn) {
      setMixes(storageService.getSavedMixes())
    } else {
      setMixes([])
    }
  }, [isLoggedIn])

  const saveMix = useCallback(
    (name: string, sounds: { soundId: string; volume: number }[]) => {
      if (!isLoggedIn) {
        authModal?.openAuthModal('Sign in to save your mix')
        return null
      }

      try {
        const mix = storageService.saveMix(name, sounds)
        setMixes(storageService.getSavedMixes())
        return mix
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Please remove some items.', 'error')
        }
        return null
      }
    },
    [isLoggedIn, authModal, showToast],
  )

  const updateName = useCallback(
    (id: string, name: string) => {
      if (!isLoggedIn) return

      try {
        storageService.updateMixName(id, name)
        setMixes(storageService.getSavedMixes())
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full.', 'error')
        }
      }
    },
    [isLoggedIn, showToast],
  )

  const deleteMix = useCallback(
    (id: string) => {
      if (!isLoggedIn) return
      storageService.deleteMix(id)
      setMixes(storageService.getSavedMixes())
    },
    [isLoggedIn],
  )

  const duplicateMix = useCallback(
    (id: string) => {
      if (!isLoggedIn) return null

      try {
        const copy = storageService.duplicateMix(id)
        if (copy) {
          setMixes(storageService.getSavedMixes())
        }
        return copy
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          showToast('Storage is full. Please remove some items.', 'error')
        }
        return null
      }
    },
    [isLoggedIn, showToast],
  )

  return { mixes, saveMix, updateName, deleteMix, duplicateMix }
}
