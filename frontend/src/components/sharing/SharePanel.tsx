import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { X, Download, Share2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useToast } from '@/components/ui/Toast'
import { generateVerseImageTemplated } from '@/lib/verse-card-canvas'
import type { ShareTemplate, ShareSize } from '@/types/verse-sharing'
import {
  SHARE_SIZES,
  SHARE_TEMPLATES,
  DEFAULT_TEMPLATE,
  DEFAULT_SIZE,
  SHARE_PREF_TEMPLATE_KEY,
  SHARE_PREF_SIZE_KEY,
} from '@/constants/verse-sharing'

interface SharePanelProps {
  verseText: string
  reference: string
  isOpen: boolean
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function loadPref<T extends string>(key: string, fallback: T, validValues: T[]): T {
  try {
    const stored = localStorage.getItem(key) as T | null
    if (stored && validValues.includes(stored)) return stored
  } catch (_e) {
    // localStorage unavailable
  }
  return fallback
}

function savePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch (_e) {
    // localStorage unavailable
  }
}

const TEMPLATE_IDS: ShareTemplate[] = SHARE_TEMPLATES.map((t) => t.id)
const SIZE_IDS: ShareSize[] = Object.keys(SHARE_SIZES) as ShareSize[]

function canUseWebShare(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  try {
    return navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] }) ?? false
  } catch (_e) {
    return false
  }
}

export function SharePanel({ verseText, reference, isOpen, onClose }: SharePanelProps) {
  const id = useId()
  const headingId = `${id}-heading`
  const { showToast } = useToast()
  const reducedMotion = useReducedMotion()
  const [isClosing, setIsClosing] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const [template, setTemplate] = useState<ShareTemplate>(() =>
    loadPref(SHARE_PREF_TEMPLATE_KEY, DEFAULT_TEMPLATE, TEMPLATE_IDS),
  )
  const [size, setSize] = useState<ShareSize>(() =>
    loadPref(SHARE_PREF_SIZE_KEY, DEFAULT_SIZE, SIZE_IDS),
  )
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [isActioning, setIsActioning] = useState(false)

  // Thumbnail cache
  const thumbnailUrls = useRef<Record<string, string>>({})
  const thumbnailGenerated = useRef(false)
  const [, setThumbVersion] = useState(0)

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Track if component is mounted
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const handleClose = useCallback(() => {
    if (reducedMotion) {
      onClose()
      return
    }
    setIsClosing(true)
    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }, [onClose, reducedMotion])

  const containerRef = useFocusTrap(isOpen, handleClose)

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Cleanup close timeout
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Generate thumbnails on open
  useEffect(() => {
    if (!isOpen || thumbnailGenerated.current) return
    thumbnailGenerated.current = true

    const generateThumbs = async () => {
      for (const t of SHARE_TEMPLATES) {
        try {
          const blob = await generateVerseImageTemplated(verseText, reference, t.id, 'square')
          if (mountedRef.current) {
            thumbnailUrls.current[t.id] = URL.createObjectURL(blob)
          }
        } catch (_e) {
          // Skip failed thumbnail
        }
      }
      // Force re-render to show thumbnails
      if (mountedRef.current) setThumbVersion((v) => v + 1)
    }
    generateThumbs()
  }, [isOpen, verseText, reference])

  // Cleanup thumbnails on unmount
  useEffect(() => {
    return () => {
      Object.values(thumbnailUrls.current).forEach(URL.revokeObjectURL)
      thumbnailUrls.current = {}
      thumbnailGenerated.current = false
    }
  }, [])

  // Render preview on template/size change (debounced)
  useEffect(() => {
    if (!isOpen) return

    setIsRendering(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        const blob = await generateVerseImageTemplated(verseText, reference, template, size)
        if (mountedRef.current) {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(blob)
          })
          setIsRendering(false)
        }
      } catch (_e) {
        if (mountedRef.current) {
          setIsRendering(false)
          showToast('Failed to generate image', 'error')
        }
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isOpen, template, size, verseText, reference, showToast])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  const handleTemplateChange = (t: ShareTemplate) => {
    setTemplate(t)
    savePref(SHARE_PREF_TEMPLATE_KEY, t)
  }

  const handleSizeChange = (s: ShareSize) => {
    setSize(s)
    savePref(SHARE_PREF_SIZE_KEY, s)
  }

  const handleTemplateKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % SHARE_TEMPLATES.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + SHARE_TEMPLATES.length) % SHARE_TEMPLATES.length
    }
    if (nextIndex !== index) {
      handleTemplateChange(SHARE_TEMPLATES[nextIndex].id)
      // Focus the new item
      const el = document.getElementById(`${id}-tmpl-${SHARE_TEMPLATES[nextIndex].id}`)
      el?.focus()
    }
  }

  const handleSizeKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % SIZE_IDS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + SIZE_IDS.length) % SIZE_IDS.length
    }
    if (nextIndex !== index) {
      handleSizeChange(SIZE_IDS[nextIndex])
      const el = document.getElementById(`${id}-size-${SIZE_IDS[nextIndex]}`)
      el?.focus()
    }
  }

  const handleDownload = async () => {
    setIsActioning(true)
    try {
      const blob = await generateVerseImageTemplated(verseText, reference, template, size)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `worship-room-${slugify(reference)}-${template}-${size}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Image downloaded!')
    } catch (_e) {
      showToast('Failed to generate image', 'error')
    } finally {
      setIsActioning(false)
    }
  }

  const handleShare = async () => {
    setIsActioning(true)
    try {
      const blob = await generateVerseImageTemplated(verseText, reference, template, size)

      if (canUseWebShare()) {
        const file = new File([blob], `worship-room-${slugify(reference)}.png`, { type: 'image/png' })
        await navigator.share({ files: [file] })
      } else {
        // Copy image to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        showToast('Image copied!')
      }
    } catch (err) {
      // User cancelled share is not an error
      if (err instanceof Error && err.name === 'AbortError') return
      showToast('Failed to share image', 'error')
    } finally {
      setIsActioning(false)
    }
  }

  if (!isOpen) return null

  const showWebShare = canUseWebShare()
  const { width: sizeW, height: sizeH } = SHARE_SIZES[size]
  const aspectRatio = sizeW / sizeH

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          isClosing
            ? 'motion-safe:animate-backdrop-fade-out'
            : 'motion-safe:animate-backdrop-fade-in',
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={cn(
          'relative z-10 bg-surface-dark border border-white/10 shadow-2xl overflow-y-auto',
          // Mobile: bottom sheet
          'w-full max-h-[90vh] rounded-t-2xl',
          // Desktop: centered modal
          'sm:rounded-xl sm:max-w-[480px] lg:max-w-[520px] sm:max-h-[85vh]',
          isClosing
            ? 'motion-safe:animate-modal-spring-out'
            : 'motion-safe:animate-modal-spring-in',
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 id={headingId} className="text-lg font-semibold text-white">
            Share Verse
          </h2>
          <button
            onClick={handleClose}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template picker */}
        <div className="px-5 pb-3">
          <div
            role="radiogroup"
            aria-label="Template style"
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
          >
            {SHARE_TEMPLATES.map((t, i) => {
              const selected = template === t.id
              const thumbUrl = thumbnailUrls.current[t.id]
              return (
                <button
                  key={t.id}
                  id={`${id}-tmpl-${t.id}`}
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${t.name} template`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => handleTemplateChange(t.id)}
                  onKeyDown={(e) => handleTemplateKeyDown(e, i)}
                  className="flex flex-col items-center shrink-0 focus-visible:outline-none"
                >
                  <div
                    className={cn(
                      'w-[70px] h-[70px] sm:w-20 sm:h-20 rounded-lg overflow-hidden transition-all',
                      selected
                        ? 'border-2 border-primary ring-2 ring-primary/30'
                        : 'border border-white/10 bg-white/[0.06]',
                    )}
                    style={{ aspectRatio: '1' }}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`${t.name} template preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs text-white/50 mt-1 text-center">
                    {t.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Live preview */}
        <div className="px-5 pb-4 flex justify-center">
          <div
            className="relative w-full shadow-inner rounded-lg"
            style={{
              maxWidth: size === 'story' ? '200px' : '300px',
              aspectRatio: String(aspectRatio),
            }}
          >
            {isRendering || !previewUrl ? (
              <div
                className="w-full h-full bg-white/5 animate-pulse rounded-lg"
                style={{ aspectRatio: String(aspectRatio) }}
              />
            ) : (
              <img
                src={previewUrl}
                alt={`Preview of ${reference} in ${template} template`}
                className="w-full h-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>

        {/* Size pills */}
        <div className="px-5 pb-4">
          <div
            role="radiogroup"
            aria-label="Image size"
            className="flex gap-2 justify-center"
          >
            {SIZE_IDS.map((s, i) => {
              const selected = size === s
              const dim = SHARE_SIZES[s]
              return (
                <button
                  key={s}
                  id={`${id}-size-${s}`}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => handleSizeChange(s)}
                  onKeyDown={(e) => handleSizeKeyDown(e, i)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    selected
                      ? 'bg-primary/20 text-white border border-primary/30'
                      : 'bg-white/10 text-white/60 border border-transparent',
                  )}
                >
                  <span className="block font-medium">{dim.label}</span>
                  <span className="block text-[10px] opacity-60">{dim.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isActioning || isRendering}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white/80 border border-white/10 py-3 px-6 rounded-xl min-h-[44px] hover:bg-white/15 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Download
          </button>
          <button
            onClick={handleShare}
            disabled={isActioning || isRendering}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-medium py-3 px-6 rounded-xl min-h-[44px] hover:bg-primary-lt transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {showWebShare ? (
              <>
                <Share2 className="w-4 h-4" aria-hidden="true" />
                Share
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                Copy Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
