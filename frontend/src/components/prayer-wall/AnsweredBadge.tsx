import { CheckCircle } from 'lucide-react'
import { formatFullDate } from '@/lib/time'

interface AnsweredBadgeProps {
  answeredText: string | null
  answeredAt: string | null
}

export function AnsweredBadge({ answeredText, answeredAt }: AnsweredBadgeProps) {
  return (
    <div className="mt-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-sm font-medium text-white">
        <CheckCircle className="h-4 w-4" aria-hidden="true" />
        Answered Prayer
      </span>
      {answeredText && (
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-text-dark/80">
          {answeredText}
        </p>
      )}
      {answeredAt && (
        <p className="mt-1 text-xs text-text-light">
          {formatFullDate(answeredAt)}
        </p>
      )}
    </div>
  )
}
