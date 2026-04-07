import { useId, useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DevotionalSnapshot } from '@/types/daily-experience'

interface DevotionalPreviewPanelProps {
  snapshot: DevotionalSnapshot
}

export function DevotionalPreviewPanel({ snapshot }: DevotionalPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const reactId = useId()
  const contentId = `devotional-preview-content${reactId}`

  return (
    <div className="sticky top-2 z-30 mb-4">
      <div
        className={cn(
          'bg-white/[0.06] backdrop-blur-md border border-white/[0.12] rounded-2xl',
          'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          'transition-all duration-200',
        )}
      >
        {/* Collapsed Pill (always visible) */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className={cn(
            'flex w-full items-center gap-3 px-4 py-3 sm:px-5 lg:px-6',
            'text-left transition-colors',
            'hover:bg-white/[0.04]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'rounded-2xl',
          )}
        >
          <BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Today&apos;s Devotional
            </p>
            <p className="truncate text-sm font-medium text-white">
              {snapshot.title} &middot; {snapshot.passage.reference}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-white/60 transition-transform duration-300',
              isExpanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>

        {/* Expanded Content */}
        <div
          id={contentId}
          aria-hidden={!isExpanded}
          className={cn(
            'overflow-hidden transition-[max-height] duration-300 ease-out',
            isExpanded ? 'max-h-[50vh]' : 'max-h-0',
          )}
        >
          <div className="max-h-[50vh] overflow-y-auto border-t border-white/[0.08] px-5 py-5 sm:px-6 sm:py-6 lg:px-6">
            {/* Passage */}
            <div className="mb-5">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/60">
                {snapshot.passage.reference}
              </p>
              <p className="font-serif text-base leading-[1.75] text-white sm:text-lg">
                {snapshot.passage.verses.map((verse) => (
                  <span key={verse.number}>
                    <sup className="mr-1 align-super font-sans text-xs font-medium text-white/50">
                      {verse.number}
                    </sup>
                    {verse.text}{' '}
                  </span>
                ))}
              </p>
            </div>

            {/* Reflection Question Callout */}
            <div className="mb-5 rounded-xl border-l-2 border-l-primary bg-white/[0.04] px-4 py-3">
              <p className="mb-1 text-xs uppercase tracking-widest text-white/60">
                Something to think about
              </p>
              <p className="text-[15px] font-medium leading-[1.5] text-white">
                {snapshot.reflectionQuestion}
              </p>
            </div>

            {/* Reflection Body */}
            <div className="mb-5 space-y-3">
              {snapshot.reflection.map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-[1.75] text-white/90">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="border-l-2 border-white/[0.12] pl-4">
              <p className="font-serif italic text-white/90">
                &ldquo;{snapshot.quote.text}&rdquo;
              </p>
              <p className="mt-1 text-sm text-white/60">
                &mdash; {snapshot.quote.attribution}
              </p>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}
