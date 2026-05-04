import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Button } from '@/components/ui/Button'
import type { VerseContext } from '@/types/daily-experience'

interface VersePromptCardProps {
  context: VerseContext
  onRemove: () => void
  framingLine: string
}

export function VersePromptCard({ context, onRemove, framingLine }: VersePromptCardProps) {
  const prefersReduced = useReducedMotion()

  return (
    <div
      className={cn(
        'relative mb-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7',
        !prefersReduced && 'motion-safe:animate-fade-in',
      )}
      role="region"
      aria-label={`Verse prompt: ${context.reference}`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        aria-label="Remove verse prompt"
        className="absolute right-2 top-2 rounded-full !p-0 h-11 w-11"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </Button>

      <p className="pr-12 font-serif text-base font-semibold text-white sm:text-lg">
        {context.reference}
      </p>

      <div className="mt-2 text-[17px] leading-[1.75] text-white sm:text-lg">
        {context.verses.map((v) => (
          <span key={v.number}>
            {context.verses.length > 1 && (
              <sup className="mr-1 align-super font-sans text-xs text-white/30">
                {v.number}
              </sup>
            )}
            {v.text}{' '}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm text-white/60">
        {framingLine}
      </p>
    </div>
  )
}

export function VersePromptSkeleton() {
  return (
    <div
      className="mb-4 rounded-xl border-l-4 border-l-primary/30 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7"
      aria-hidden="true"
    >
      <div className="h-5 w-32 motion-safe:animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-16 w-full motion-safe:animate-pulse rounded bg-white/10" />
      <div className="mt-3 h-4 w-48 motion-safe:animate-pulse rounded bg-white/10" />
    </div>
  )
}
