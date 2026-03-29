import { useState, useCallback } from 'react'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'

interface MarkAnsweredFormProps {
  onConfirm: (answeredNote: string) => void
  onCancel: () => void
}

export function MarkAnsweredForm({ onConfirm, onCancel }: MarkAnsweredFormProps) {
  const [note, setNote] = useState('')

  const handleConfirm = useCallback(() => {
    onConfirm(note.trim())
  }, [note, onConfirm])

  return (
    <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-4">
      <h4 className="mb-2 text-sm font-semibold text-white">
        Mark as Answered
      </h4>
      <p className="mb-3 text-sm text-white/50">
        Share what happened (optional)
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        placeholder="What happened?"
        className="w-full resize-none rounded-lg border border-white/15 bg-white/5 p-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ minHeight: '80px' }}
        aria-label="How God answered"
        aria-describedby="testimony-char-count"
      />
      <div className="mt-1">
        <CharacterCount current={note.length} max={500} warningAt={400} dangerAt={480} visibleAt={300} id="testimony-char-count" />
      </div>

      <CrisisBanner text={note} />

      <div className="mt-3 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-white/50 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
