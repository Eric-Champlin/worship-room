import { useState, useRef, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'

interface MarkAsAnsweredFormProps {
  onConfirm: (praiseText: string) => void
}

export function MarkAsAnsweredForm({ onConfirm }: MarkAsAnsweredFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [praiseText, setPraiseText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isExpanded])

  const handleConfirm = () => {
    onConfirm(praiseText.trim())
    setIsExpanded(false)
    setPraiseText('')
  }

  if (!isExpanded) {
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

  return (
    <FrostedCard variant="default" as="div">
      <label htmlFor="testimony-textarea" className="mb-2 block text-sm font-medium text-white">
        Share how God answered this prayer (optional):
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
          Confirm
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsExpanded(false)
            setPraiseText('')
          }}
        >
          Cancel
        </Button>
      </div>
    </FrostedCard>
  )
}
