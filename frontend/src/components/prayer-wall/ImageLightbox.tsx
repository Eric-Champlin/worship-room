/**
 * Spec 4.6b — fullscreen image lightbox overlay.
 *
 * Displays the full rendition of an image with the alt text caption.
 * Dismissable via:
 *   - X button (top-right, 44×44 px)
 *   - Backdrop click (outside the image)
 *   - Escape key (handled by useFocusTrap)
 *
 * Accessibility: role="dialog" + aria-modal="true" + aria-labelledby points
 * to the caption so screen readers announce the image description on open.
 * Focus trap activates on mount; previous focus restored on close.
 */

import { useId } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { PostImage as PostImageType } from '@/types/prayer-wall'

export interface ImageLightboxProps {
  image: PostImageType
  onClose: () => void
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const trapRef = useFocusTrap(true, onClose)
  const captionId = useId()

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={captionId}
      className="motion-safe:animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label="Close image viewer"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* The inner click handler stops propagation so clicking on the image itself
          doesn't dismiss the lightbox — only the backdrop dismisses it. */}
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.full}
          alt={image.altText}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
        <p
          id={captionId}
          className="mt-2 text-center text-sm text-white/80"
        >
          {image.altText}
        </p>
      </div>
    </div>
  )
}
