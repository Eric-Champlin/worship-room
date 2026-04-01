import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Share2, Copy, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useToast } from '@/components/ui/Toast'
import { generateTestimonyCardImage } from '@/lib/testimony-card-canvas'

interface TestimonyShareActionsProps {
  isOpen: boolean
  onClose: () => void
  prayerTitle: string
  testimonyNote?: string
  scriptureText: string
  scriptureReference: string
}

function canUseWebShare(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    return navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] }) ?? false
  } catch {
    return false
  }
}

export function TestimonyShareActions({
  isOpen,
  onClose,
  prayerTitle,
  testimonyNote,
  scriptureText,
  scriptureReference,
}: TestimonyShareActionsProps) {
  const { showToast } = useToast()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useFocusTrap(isOpen, onClose)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const options = { prayerTitle, testimonyNote, scriptureText, scriptureReference }

  // Generate preview on open
  useEffect(() => {
    if (!isOpen) return
    let revoked = false
    generateTestimonyCardImage(options).then((blob) => {
      if (revoked) return
      setPreviewUrl(URL.createObjectURL(blob))
    })
    return () => {
      revoked = true
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Focus close button on open
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
  }, [isOpen])

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const handleDownload = async () => {
    setIsActioning(true)
    try {
      const blob = await generateTestimonyCardImage(options)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `worship-room-testimony-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Image downloaded!')
    } catch {
      showToast('Failed to generate image', 'error')
    } finally {
      setIsActioning(false)
    }
  }

  const handleShare = async () => {
    setIsActioning(true)
    try {
      const blob = await generateTestimonyCardImage(options)
      if (canUseWebShare()) {
        const file = new File([blob], 'worship-room-testimony.png', { type: 'image/png' })
        await navigator.share({ files: [file] })
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        showToast('Image copied!')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      showToast('Failed to share image', 'error')
    } finally {
      setIsActioning(false)
    }
  }

  if (!isOpen) return null

  const showWebShare = canUseWebShare()

  return createPortal(
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Share your testimony"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-safe:animate-backdrop-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="rounded-t-2xl border border-white/10 bg-surface-dark shadow-2xl sm:max-w-[420px] sm:rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-lg font-semibold text-white">Share Testimony</h3>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close share panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preview */}
          <div className="px-4 py-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Testimony card preview"
                className="mx-auto w-full rounded-lg sm:max-w-[300px]"
              />
            ) : (
              <div className="mx-auto flex aspect-square w-full items-center justify-center rounded-lg bg-white/5 sm:max-w-[300px]">
                <p className="text-sm text-white/40">Generating preview...</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 px-4 pb-4 sm:flex-row">
            <button
              onClick={handleDownload}
              disabled={isActioning}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleShare}
              disabled={isActioning}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {showWebShare ? (
                <>
                  <Share2 className="h-4 w-4" />
                  Share
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Image
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
