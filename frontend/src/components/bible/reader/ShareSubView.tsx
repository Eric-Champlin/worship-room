import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatReference, getSelectionText } from '@/lib/bible/verseActionRegistry'
import { getHighlightForVerse } from '@/lib/bible/highlightStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useToast } from '@/components/ui/Toast'
import { renderShareCard, renderShareThumbnail } from '@/lib/bible/shareCardRenderer'
import {
  buildShareUrl,
  buildShareFilename,
  canShareFiles,
  downloadImage,
  copyImage,
  shareImage,
} from '@/lib/bible/shareActions'
import { LONG_PASSAGE_THRESHOLD, SHARE_FORMAT_IDS, SHARE_FORMATS } from '@/constants/bible-share'
import type { ShareFormat, ShareCardOptions } from '@/types/bible-share'
import type { HighlightColor } from '@/types/bible'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

// --- Blob cache (module-level, cleared on unmount) ---

const blobCache = new Map<string, Blob>()

function cacheKey(format: ShareFormat, includeRef: boolean, highlightColor: HighlightColor | null): string {
  return `${format}-${includeRef}-${highlightColor ?? 'none'}`
}

// --- Component ---

interface ShareSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

export function ShareSubView({ selection, context }: ShareSubViewProps) {
  const { showToast } = useToast()
  const reducedMotion = useReducedMotion()

  // --- State ---
  const [format, setFormat] = useState<ShareFormat>('square')
  const [includeReference, setIncludeReference] = useState(true)
  const [matchHighlight, setMatchHighlight] = useState(true)
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<ShareFormat, string>>(new Map())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)

  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<string[]>([])

  // --- Derived ---
  const reference = useMemo(() => formatReference(selection), [selection])
  const fullText = useMemo(() => getSelectionText(selection), [selection])
  const isLongPassage = fullText.length > LONG_PASSAGE_THRESHOLD

  // Check highlight for the first verse in selection
  const existingHighlight = useMemo(() => {
    return getHighlightForVerse(selection.book, selection.chapter, selection.startVerse)
  }, [selection])

  const activeHighlightColor: HighlightColor | null =
    matchHighlight && existingHighlight ? existingHighlight.color : null

  const canShare = useMemo(() => canShareFiles(), [])

  // --- Helpers ---
  const getOptions = useCallback(
    (fmt: ShareFormat): ShareCardOptions => ({
      format: fmt,
      includeReference,
      highlightColor: activeHighlightColor,
    }),
    [includeReference, activeHighlightColor],
  )

  const getOrRenderBlob = useCallback(
    async (fmt: ShareFormat): Promise<Blob> => {
      const key = cacheKey(fmt, includeReference, activeHighlightColor)
      const cached = blobCache.get(key)
      if (cached) return cached
      const blob = await renderShareCard(selection.verses, reference, getOptions(fmt))
      blobCache.set(key, blob)
      return blob
    },
    [selection.verses, reference, includeReference, activeHighlightColor, getOptions],
  )

  // --- Render thumbnails ---
  useEffect(() => {
    let cancelled = false

    async function renderThumbs() {
      for (const fmt of SHARE_FORMAT_IDS) {
        if (cancelled) break
        try {
          const blob = await renderShareThumbnail(selection.verses, reference, getOptions(fmt))
          if (cancelled) break
          const url = URL.createObjectURL(blob)
          blobUrlsRef.current.push(url)
          setThumbnailUrls((prev) => new Map(prev).set(fmt, url))
        } catch {
          // Thumbnail render failed silently
        }
      }
    }

    renderThumbs()
    return () => {
      cancelled = true
    }
  }, [selection.verses, reference, getOptions])

  // --- Render main preview ---
  useEffect(() => {
    let cancelled = false
    setIsRendering(true)

    async function renderPreview() {
      try {
        const blob = await getOrRenderBlob(format)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobUrlsRef.current.push(url)
        setPreviewUrl(url)
      } catch {
        // Render failed
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }

    renderPreview()
    return () => {
      cancelled = true
    }
  }, [format, getOrRenderBlob])

  // --- Cleanup on unmount ---
  useEffect(() => {
    const urls = blobUrlsRef.current
    return () => {
      blobCache.clear()
      for (const url of urls) {
        URL.revokeObjectURL(url)
      }
    }
  }, [])

  // --- Invalidate cache when options change ---
  useEffect(() => {
    // Clear cache so next renders use updated options
    blobCache.clear()
    setThumbnailUrls(new Map())
    // Re-render thumbnails will happen via the thumbnail effect
  }, [includeReference, activeHighlightColor])

  // --- Action handlers ---
  const toastFn = context?.showToast ?? showToast

  const handleDownload = useCallback(async () => {
    try {
      const blob = await getOrRenderBlob(format)
      const filename = buildShareFilename(selection)
      await downloadImage(blob, filename, toastFn)
    } catch {
      toastFn('Failed to generate image', 'error')
    }
  }, [format, getOrRenderBlob, selection, toastFn])

  const handleCopy = useCallback(async () => {
    try {
      const blob = await getOrRenderBlob(format)
      await copyImage(blob, toastFn)
    } catch {
      toastFn('Failed to generate image', 'error')
    }
  }, [format, getOrRenderBlob, toastFn])

  const handleShare = useCallback(async () => {
    try {
      const blob = await getOrRenderBlob(format)
      const filename = buildShareFilename(selection)
      const shareUrl = buildShareUrl(selection)
      await shareImage(blob, filename, reference, shareUrl, toastFn)
    } catch {
      toastFn('Failed to generate image', 'error')
    }
  }, [format, getOrRenderBlob, selection, reference, toastFn])

  // --- Format picker keyboard navigation ---
  const handleFormatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = SHARE_FORMAT_IDS.indexOf(format)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFormat(SHARE_FORMAT_IDS[(idx + 1) % SHARE_FORMAT_IDS.length])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFormat(SHARE_FORMAT_IDS[(idx - 1 + SHARE_FORMAT_IDS.length) % SHARE_FORMAT_IDS.length])
      }
    },
    [format],
  )

  // --- Aspect ratio for format ---
  const aspectRatio = useMemo(() => {
    const dims = SHARE_FORMATS[format]
    return dims.exportWidth / dims.exportHeight
  }, [format])

  return (
    <div className="flex flex-col">
      {/* Verse reference subtitle */}
      <div className="px-4 pb-2 pt-3">
        <p className="font-serif text-sm text-white/60">{reference}</p>
      </div>

      {/* Long passage warning */}
      {isLongPassage && (
        <div className="px-4 pb-2">
          <p className="text-xs text-white/50">
            This is a long passage — consider sharing a shorter selection.
          </p>
        </div>
      )}

      {/* Format picker */}
      <div
        className="flex gap-3 px-4 pb-3"
        role="radiogroup"
        aria-label="Card format"
        onKeyDown={handleFormatKeyDown}
      >
        {SHARE_FORMAT_IDS.map((fmt) => {
          const dims = SHARE_FORMATS[fmt]
          const isSelected = fmt === format
          const thumbUrl = thumbnailUrls.get(fmt)
          const thumbAspect = dims.exportWidth / dims.exportHeight

          return (
            <button
              key={fmt}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${dims.label} — ${dims.hint}`}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-lg p-1 transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected &&
                  'ring-2 ring-primary shadow-[0_0_12px_rgba(109,40,217,0.5)]',
              )}
              onClick={() => setFormat(fmt)}
            >
              <div
                className="relative overflow-hidden rounded bg-white/[0.06]"
                style={{ width: `${60 * thumbAspect}px`, height: '60px' }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`${dims.label} preview`}
                    className={cn(
                      'h-full w-full object-cover',
                      !reducedMotion && 'transition-opacity duration-base',
                    )}
                  />
                ) : (
                  <div className="h-full w-full motion-safe:animate-pulse bg-white/[0.08]" />
                )}
              </div>
              <span className="text-xs text-white/60">{dims.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main preview */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center rounded-lg bg-black/20 p-2">
          {isRendering || !previewUrl ? (
            <div
              className="w-full motion-safe:animate-pulse rounded bg-white/[0.08]"
              style={{ aspectRatio }}
            />
          ) : (
            <img
              src={previewUrl}
              alt={`Share card preview — ${reference}`}
              className="max-w-full rounded"
              style={{ aspectRatio }}
            />
          )}
        </div>
      </div>

      {/* Options section */}
      <div className="space-y-3 px-4 pb-3">
        {/* Match highlight color toggle — only when highlight exists */}
        {existingHighlight && (
          <div className="flex items-center justify-between">
            <span id="share-toggle-highlight" className="text-sm text-white/70">Match my highlight color</span>
            <button
              role="switch"
              aria-checked={matchHighlight}
              aria-labelledby="share-toggle-highlight"
              onClick={() => setMatchHighlight((v) => !v)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                matchHighlight ? 'bg-primary' : 'bg-white/20',
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform motion-reduce:transition-none',
                  matchHighlight && 'translate-x-5',
                )}
              />
            </button>
          </div>
        )}

        {/* Include reference toggle */}
        <div className="flex items-center justify-between">
          <span id="share-toggle-reference" className="text-sm text-white/70">Include reference</span>
          <button
            role="switch"
            aria-checked={includeReference}
            aria-labelledby="share-toggle-reference"
            onClick={() => setIncludeReference((v) => !v)}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              includeReference ? 'bg-primary' : 'bg-white/20',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform motion-reduce:transition-none',
                includeReference && 'translate-x-5',
              )}
            />
          </button>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex gap-3 px-4 pb-3">
        <button
          onClick={handleDownload}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm text-white transition-[colors,transform] duration-fast hover:bg-white/15 active:scale-[0.98]"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </button>
        <button
          onClick={handleCopy}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm text-white transition-[colors,transform] duration-fast hover:bg-white/15 active:scale-[0.98]"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copy
        </button>
        {canShare && (
          <button
            onClick={handleShare}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm text-white transition-[colors,transform] duration-fast hover:bg-white/15 active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
        )}
      </div>

      {/* Footer caption */}
      <div className="px-4 pb-4 text-center text-xs text-white/40">
        Cards include a link back to Worship Room
      </div>
    </div>
  )
}
