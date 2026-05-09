/**
 * Spec 4.6b — image rendering inside a PrayerCard.
 *
 * Renders the medium rendition for in-feed display. Tapping the image opens
 * the lightbox overlay, which displays the full rendition. Decoupled from
 * `postType` — renders whenever `prayer.image` is non-null.
 *
 * Accessibility: alt text is required server-side; the button wrapper
 * exposes the alt text via aria-label so screen readers announce the
 * action ("Open image: [alt text]"). The img itself also carries the alt
 * text so users hovering the image hear it.
 */

import { useState } from 'react'
import type { PostImage as PostImageType } from '@/types/prayer-wall'
import { ImageLightbox } from './ImageLightbox'

export interface PostImageProps {
  image: PostImageType
  /** Index in the feed; used to decide eager vs lazy loading. First 5 images load eagerly. */
  index?: number
}

export function PostImage({ image, index = 99 }: PostImageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="mb-3 block w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        aria-label={`Open image: ${image.altText}`}
      >
        <img
          src={image.medium}
          alt={image.altText}
          loading={index < 5 ? 'eager' : 'lazy'}
          className="h-auto w-full object-cover"
        />
      </button>
      {lightboxOpen && (
        <ImageLightbox image={image} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}
