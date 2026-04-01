import { useState, useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { useToastSafe } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface ShareImageButtonProps {
  generateImage: () => Promise<Blob>
  filename: string
  shareTitle?: string
  shareText?: string
  className?: string
  variant?: 'primary' | 'ghost'
  label?: string
}

export function ShareImageButton({
  generateImage,
  filename,
  shareTitle,
  shareText,
  className,
  variant = 'primary',
  label = 'Share',
}: ShareImageButtonProps) {
  const { showToast } = useToastSafe()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = useCallback(async () => {
    setIsGenerating(true)
    try {
      const blob = await generateImage()
      const file = new File([blob], filename, { type: 'image/png' })

      // Try Web Share API first
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            files: [file],
          })
          return
        } catch (err) {
          // User cancelled — silently ignore
          if (err instanceof Error && err.name === 'AbortError') return
          // Other share errors — fall through to clipboard/download
        }
      }

      // Try clipboard
      if (navigator.clipboard && 'ClipboardItem' in window) {
        try {
          await navigator.clipboard.write([
            new window.ClipboardItem({ 'image/png': blob }),
          ])
          showToast('Image copied to clipboard.')
          return
        } catch {
          // Fall through to download
        }
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Image saved.')
    } catch {
      showToast("We couldn't share that. Try again.")
    } finally {
      setIsGenerating(false)
    }
  }, [generateImage, filename, shareTitle, shareText, showToast])

  const variantClasses =
    variant === 'ghost'
      ? 'bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-full'
      : 'bg-primary text-white font-semibold rounded-lg hover:opacity-90'

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isGenerating}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-3 transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
        variantClasses,
        className,
      )}
      aria-label={`Share ${label.toLowerCase()}`}
    >
      {isGenerating ? (
        'Sharing...'
      ) : (
        <>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  )
}
