import { useState, useRef, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { EDIT_UPDATE_LABEL } from '@/constants/answered-wall-copy'

interface MarkAsAnsweredFormProps {
  onConfirm: (praiseText: string) => void
  /**
   * Spec 6.6b — `'mark'` (default) preserves the legacy mark-as-answered flow:
   * a trigger button that expands into the form. `'edit'` skips the trigger
   * and renders the form directly (the parent is already in edit mode, e.g.,
   * the author tapped "Edit your update" on an already-answered post). The
   * existing call sites in `PrayerDetail.tsx` and `PrayerWallDashboard.tsx`
   * pass nothing and continue to get the legacy `'mark'` behavior.
   */
  mode?: 'mark' | 'edit'
  /** Spec 6.6b — initial textarea value for `mode='edit'`. Ignored in `'mark'` mode. */
  initialText?: string
  /**
   * Spec 6.6b — called when the user cancels in `mode='edit'`. The form does
   * NOT auto-collapse in edit mode (there's no trigger to collapse to), so
   * the parent must dismiss the form via its own state. Ignored in `'mark'`
   * mode (cancel collapses back to the trigger button).
   */
  onCancel?: () => void
}

export function MarkAsAnsweredForm({
  onConfirm,
  mode = 'mark',
  initialText = '',
  onCancel,
}: MarkAsAnsweredFormProps) {
  // In edit mode, the form is always "expanded" (the parent already chose
  // to show it). In mark mode, expansion is local state toggled by the
  // trigger button.
  const [isExpanded, setIsExpanded] = useState(mode === 'edit')
  const [praiseText, setPraiseText] = useState(mode === 'edit' ? initialText : '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isExpanded])

  const handleConfirm = () => {
    onConfirm(praiseText.trim())
    if (mode === 'mark') {
      // Legacy behavior: collapse the trigger after a successful mark.
      setIsExpanded(false)
      setPraiseText('')
    }
    // In edit mode, the parent handles dismissal — don't reset local state
    // (the parent may want to keep the form open if there's a save error).
  }

  const handleCancel = () => {
    if (mode === 'edit') {
      onCancel?.()
      return
    }
    setIsExpanded(false)
    setPraiseText('')
  }

  if (mode === 'mark' && !isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-success hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:rounded"
      >
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Mark as Answered
      </button>
    )
  }

  const label =
    mode === 'edit'
      ? EDIT_UPDATE_LABEL
      : 'Share how God answered this prayer (optional):'

  return (
    <FrostedCard variant="default" as="div">
      <label
        htmlFor="testimony-textarea"
        className="mb-2 block text-sm font-medium text-white"
      >
        {label}
      </label>
      <textarea
        id="testimony-textarea"
        ref={textareaRef}
        value={praiseText}
        onChange={(e) => setPraiseText(e.target.value)}
        placeholder="Share your testimony..."
        className="mb-3 w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        rows={3}
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleConfirm}>
          {mode === 'edit' ? 'Save' : 'Confirm'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </FrostedCard>
  )
}
