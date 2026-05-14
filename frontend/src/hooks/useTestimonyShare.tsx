import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { ShareTestimonyWarningModal } from '@/components/prayer-wall/ShareTestimonyWarningModal'
import { TestimonyCardImage } from '@/components/prayer-wall/TestimonyCardImage'
import { useToastSafe } from '@/components/ui/Toast'
import {
  PNG_FILENAME,
  SHARE_FAILURE_TOAST,
  SHARE_LOADING_ARIA,
} from '@/constants/testimony-share-copy'
import { useSettings } from '@/hooks/useSettings'
import {
  captureDomNodeAsPng,
  sharePngOrDownload,
} from '@/lib/prayer-wall/imageGen'
import type { PrayerRequest } from '@/types/prayer-wall'

/**
 * Spec 6.7 — Testimony share orchestration hook.
 *
 * Owns the entire share-as-image flow for a single testimony post:
 *   1. Reads `wr_settings.prayerWall.dismissedShareWarning` from useSettings
 *   2. Shows the warning modal on first share (skips on subsequent shares)
 *   3. Mounts the off-screen TestimonyCardImage via local React state
 *   4. Calls captureDomNodeAsPng + sharePngOrDownload from imageGen.ts
 *   5. Announces loading state via aria-live
 *   6. Shows an error toast on failure
 *
 * Gate-G-ANON-ATTRIBUTION: the hook reads `prayer.authorName` +
 * `prayer.isAnonymous` only — NEVER `useAuth().user`. The mapper has
 * already resolved "Anonymous" for anonymous testimonies upstream of this
 * surface.
 *
 * Returns:
 *   - `initiateShare`: imperative trigger for the "Share as image" menu item
 *   - `portal`: JSX the caller renders that mounts the warning modal AND
 *     the off-screen image (only while preparing) AND the aria-live
 *     announcer (only while preparing)
 *   - `isPreparingImage`: true between confirm-or-dismissed-warning and
 *     PNG dispatch (Web Share or download). Useful for caller UI if needed.
 */
export function useTestimonyShare(prayer: PrayerRequest): {
  initiateShare: () => void
  portal: ReactNode
  isPreparingImage: boolean
} {
  const { settings, updatePrayerWall } = useSettings()
  const { showToast } = useToastSafe()
  const [warningOpen, setWarningOpen] = useState(false)
  const [imageMounted, setImageMounted] = useState(false)
  const [isPreparingImage, setIsPreparingImage] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const dismissedShareWarning = settings.prayerWall.dismissedShareWarning

  const proceedToShare = useCallback(async () => {
    setImageMounted(true)
    setIsPreparingImage(true)
    try {
      // One-frame wait for React to commit the off-screen mount so
      // html2canvas can read the painted node.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const node = cardRef.current
      if (!node) return
      const blob = await captureDomNodeAsPng(node)
      if (!blob) return
      await sharePngOrDownload(blob, PNG_FILENAME)
    } catch {
      showToast(SHARE_FAILURE_TOAST, 'error')
    } finally {
      setImageMounted(false)
      setIsPreparingImage(false)
    }
  }, [showToast])

  const initiateShare = useCallback(() => {
    if (dismissedShareWarning) {
      void proceedToShare()
    } else {
      setWarningOpen(true)
    }
  }, [dismissedShareWarning, proceedToShare])

  const handleWarningConfirm = useCallback(() => {
    updatePrayerWall({ dismissedShareWarning: true })
    setWarningOpen(false)
    void proceedToShare()
  }, [updatePrayerWall, proceedToShare])

  const handleWarningCancel = useCallback(() => {
    setWarningOpen(false)
  }, [])

  // Render through a portal to document.body so the warning modal's
  // `position: fixed inset-0` resolves against the viewport, not against
  // the testimony <article> ancestor (which has `backdrop-blur-sm`) or the
  // motion-stagger parent (which has `transform`). Either of those
  // properties creates a CSS containing block, which would otherwise pin
  // the modal inside the article — clipping it on mobile and only dimming
  // the article instead of the page.
  const portal = createPortal(
    <>
      <ShareTestimonyWarningModal
        open={warningOpen}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
      {imageMounted && (
        <TestimonyCardImage
          ref={cardRef}
          content={prayer.content}
          authorName={prayer.authorName}
          isAnonymous={prayer.isAnonymous}
        />
      )}
      {isPreparingImage && (
        <div role="status" aria-live="polite" className="sr-only">
          {SHARE_LOADING_ARIA}
        </div>
      )}
    </>,
    document.body,
  )

  return { initiateShare, portal, isPreparingImage }
}
