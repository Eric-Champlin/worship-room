/**
 * Spec 4.6b — image upload affordance for the testimony / question composer.
 *
 * Controlled component (alt text and uploadId state lives in the parent
 * InlineComposer). Handles the file picker, drag-drop, upload state, and
 * the alt text input.
 *
 * Client-side validation:
 *   - HEIC extension and HEIC MIME type → reject with helpful copy
 *   - File size > 5 MB → reject before upload
 *
 * Server-side decode and dimension validation happens after the upload
 * completes; if the server rejects we show the error message returned.
 */

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { ApiError } from '@/types/auth'

const ACCEPT_MIME = 'image/jpeg,image/png,image/webp'
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const HEIC_EXTENSIONS = new Set(['heic', 'heif'])

type UploadState = 'idle' | 'uploading' | 'preview' | 'error'

export interface ImageUploadProps {
  /** Called when an upload succeeds — parent stores the uploadId for the create-post call. */
  onUploadSuccess: (uploadId: string, mediumUrl: string) => void
  /** Called when the user clicks Remove — parent clears uploadId and altText. */
  onUploadRemoved: () => void
  /** Alt text value (controlled by parent). */
  altText: string
  /** Alt text change handler (parent updates state). */
  onAltTextChange: (value: string) => void
  /** Optional helper text below the "Add a photo" button. */
  helperText?: string
}

export function ImageUpload({
  onUploadSuccess,
  onUploadRemoved,
  altText,
  onAltTextChange,
  helperText,
}: ImageUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const fileType = file.type.toLowerCase()
      if (
        HEIC_EXTENSIONS.has(ext) ||
        fileType.includes('heic') ||
        fileType.includes('heif')
      ) {
        setState('error')
        setErrorMessage(
          "HEIC images aren't supported yet. Open the Photos app, share the image, and choose JPEG.",
        )
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setState('error')
        setErrorMessage('Image is larger than 5 MB. Try a smaller version.')
        return
      }
      setState('uploading')
      setErrorMessage(null)
      try {
        const result = await prayerWallApi.uploadImage(file)
        setPreviewUrl(result.medium)
        setState('preview')
        onUploadSuccess(result.uploadId, result.medium)
      } catch (e) {
        setState('error')
        setErrorMessage(
          e instanceof ApiError
            ? e.message
            : 'Upload failed. Please try again.',
        )
      }
    },
    [onUploadSuccess],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])
  const handleDragLeave = useCallback(() => setIsDragOver(false), [])
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        void handleFile(file)
      }
    },
    [handleFile],
  )

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    setState('idle')
    setErrorMessage(null)
    onUploadRemoved()
  }, [onUploadRemoved])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'mt-3 rounded-lg border border-white/[0.12] bg-white/[0.04] p-3',
        isDragOver && 'border-violet-400/50 bg-violet-500/[0.06]',
      )}
    >
      {state === 'idle' && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-4 py-2 text-sm text-white hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Add a photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MIME}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void handleFile(file)
              }
            }}
          />
          {helperText && (
            <p className="mt-2 text-xs text-white/60">{helperText}</p>
          )}
          {isDragOver && (
            <p
              className="mt-2 text-sm font-medium text-violet-200"
              role="status"
            >
              Drop image here
            </p>
          )}
        </>
      )}

      {state === 'uploading' && (
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="h-20 w-20 animate-pulse rounded-md bg-white/10" />
          <p className="text-sm text-white/80">Uploading…</p>
        </div>
      )}

      {state === 'preview' && previewUrl && (
        <>
          <div className="flex items-start gap-3">
            <img
              src={previewUrl}
              alt={altText || 'Uploaded image preview'}
              className="h-32 w-32 rounded-md object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-white/80">
              Describe this image for screen readers
            </span>
            <input
              type="text"
              value={altText}
              onChange={(e) => onAltTextChange(e.target.value)}
              placeholder="A short description of what's in the photo"
              maxLength={500}
              required
              aria-required="true"
              className="mt-1 w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/50 focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            />
            <span className="mt-1 block text-xs text-white/60">
              Required for accessibility — screen readers will read this aloud.
            </span>
          </label>
        </>
      )}

      {state === 'error' && errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100"
        >
          {errorMessage}
          <button
            type="button"
            onClick={() => setState('idle')}
            className="ml-2 underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
