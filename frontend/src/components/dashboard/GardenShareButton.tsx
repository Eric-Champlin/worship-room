import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { generateGardenShareImage } from '@/lib/garden-share-canvas'
import { useToastSafe } from '@/components/ui/Toast'
import { useSoundEffects } from '@/hooks/useSoundEffects'

interface GardenShareButtonProps {
  gardenRef: React.RefObject<SVGSVGElement | null>
  userName: string
  levelName: string
  streakCount: number
}

export function GardenShareButton({
  gardenRef,
  userName,
  levelName,
  streakCount,
}: GardenShareButtonProps) {
  const showToast = useToastSafe()
  const { play: playSound } = useSoundEffects()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = async () => {
    if (!gardenRef.current || isGenerating) return
    setIsGenerating(true)

    try {
      const blob = await generateGardenShareImage({
        gardenSvgElement: gardenRef.current,
        userName,
        levelName,
        streakCount,
      })

      // Try Web Share API first (mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'my-garden.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${userName}'s Growth Garden` })
          playSound('chime')
          return
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-garden.png'
      a.click()
      URL.revokeObjectURL(url)
      playSound('chime')
      showToast?.('Garden image saved.', { type: 'success' })
    } catch {
      showToast?.('We couldn\'t create the image. Try again.', { type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isGenerating}
      className="rounded-lg p-2 text-white/40 transition-colors hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50"
      aria-label="Share your garden"
      title="Share your garden"
    >
      <Share2 className="h-5 w-5" />
    </button>
  )
}
