import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DigDeeperSectionProps {
  followUpQuestions: string[]
  onChipClick: (question: string) => void
  disabled?: boolean
}

export function DigDeeperSection({
  followUpQuestions,
  onChipClick,
  disabled,
}: DigDeeperSectionProps) {
  if (!followUpQuestions || followUpQuestions.length === 0) return null

  return (
    <div className="mt-6 border-t border-white/10 pt-4">
      <h3 className="mb-3 font-semibold text-white">Dig Deeper</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
        {followUpQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onChipClick(question)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 min-h-[44px] rounded-full bg-white/10 px-4 py-2',
              'text-sm text-white/70 hover:bg-white/15 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'transition-[colors,transform] duration-fast active:scale-[0.98]',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
