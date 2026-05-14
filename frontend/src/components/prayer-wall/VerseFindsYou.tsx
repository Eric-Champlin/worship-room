import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { captureDomNodeAsPng, sharePngOrDownload } from '@/lib/prayer-wall/imageGen'
import type { TriggerType, VerseDto } from '@/types/verse-finds-you'

/**
 * Spec 6.8 — Verse-Finds-You card. Surfaces a single curated verse below a
 * post-compose / comment / reading-time trigger.
 *
 * <p>Accessibility (Gate-G-A11Y / spec §"Accessibility"):
 *   - role="note" with aria-label including "scripture"
 *   - aria-live="polite" so screen readers announce the verse without interrupting
 *   - Reference rendered inside <cite> for semantic correctness
 *   - motion-reduce:transition-none — verse appears instantly per spec
 *     §"Reduced-motion: NO fade-in animation"
 *   - Plain text rendering — React escapes; never dangerouslySetInnerHTML (T37)
 *
 * <p>Save flow consumes 6.7's imageGen.ts pipeline verbatim (D-SaveReuse6.7).
 * Inline backgroundColor on the capture target so html2canvas reads it
 * (PrayerReceiptImage precedent: backgroundColor='#08051A').
 *
 * <p>Off-ramp prompt is rendered separately by the parent surface (PrayerWall,
 * PrayerDetail) when the dismiss() hook signal indicates showOffRampPrompt:true.
 */
export interface VerseFindsYouProps {
  verse: VerseDto
  trigger: TriggerType
  /** Stable verse id used to dedupe Save calls and as the saved-image filename. */
  verseId: string
  onDismiss: () => void
  onSaved: () => void
  saved: boolean
}

const PREFIX_BY_TRIGGER: Record<TriggerType, string> = {
  post_compose: 'The word found you today:',
  comment: 'A word as you gave comfort:',
  reading_time: 'A word as you keep watch:',
}

export function VerseFindsYou({
  verse,
  trigger,
  verseId,
  onDismiss,
  onSaved,
  saved,
}: VerseFindsYouProps) {
  const captureRef = useRef<HTMLDivElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (saved || isSaving) return
    if (!captureRef.current) return
    setIsSaving(true)
    try {
      const blob = await captureDomNodeAsPng(captureRef.current)
      if (blob) {
        await sharePngOrDownload(blob, `verse-${verseId}.png`)
        onSaved()
      }
    } finally {
      setIsSaving(false)
    }
  }, [saved, isSaving, verseId, onSaved])

  return (
    <FrostedCard
      variant="default"
      as="section"
      role="note"
      aria-label="Scripture verse"
      className="motion-reduce:transition-none"
    >
      {/*
        Capture target carries an INLINE backgroundColor because imageGen.ts
        invokes html2canvas with backgroundColor:null (it reads the inline
        backgroundColor on the node — PrayerReceiptImage precedent uses
        #08051A which matches hero-bg). Without this inline style, the PNG
        renders with a transparent background — poor share quality on
        iMessage/social/light surfaces.
      */}
      <div
        ref={captureRef}
        aria-live="polite"
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#08051A' }}
      >
        <p className="font-serif italic text-white/80 text-sm">
          {PREFIX_BY_TRIGGER[trigger]}
        </p>
        <p className="mt-3 font-serif text-white text-lg leading-relaxed">
          {verse.text}
        </p>
        <cite className="mt-2 block not-italic text-white/60 text-sm">
          {verse.reference}
        </cite>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={saved || isSaving}
          aria-label="Save this verse as an image"
        >
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss this verse"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Dismiss
        </Button>
      </div>
    </FrostedCard>
  )
}
