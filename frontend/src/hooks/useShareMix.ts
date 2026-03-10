import { useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { storageService } from '@/services/storage-service'

export function useShareMix() {
  const { showToast } = useToast()

  const shareMix = useCallback(
    async (sounds: { soundId: string; volume: number }[]) => {
      const url = storageService.createShareableLink(sounds)

      // Try native share first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            url,
            title: 'Check out this ambient mix on Worship Room',
          })
          return
        } catch {
          // User cancelled or share failed — fall through to clipboard
        }
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(url)
        showToast('Mix link copied!')
      } catch {
        // Last resort: show toast with manual copy instruction
        showToast('Could not copy link. Try again.', 'error')
      }
    },
    [showToast],
  )

  return { shareMix }
}
