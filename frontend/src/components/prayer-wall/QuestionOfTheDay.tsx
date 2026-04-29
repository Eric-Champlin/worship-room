import { MessageCircle } from 'lucide-react'
import { useQotdToday } from '@/hooks/useQotdToday'
import { ShareButton } from '@/components/daily/ShareButton'

interface QuestionOfTheDayProps {
  responseCount: number
  isComposerOpen: boolean
  onToggleComposer: () => void
  onScrollToResponses: () => void
}

export function QuestionOfTheDay({
  responseCount,
  isComposerOpen,
  onToggleComposer,
  onScrollToResponses,
}: QuestionOfTheDayProps) {
  const { question, isLoading } = useQotdToday()

  // Skeleton state during initial fetch — anti-pressure (no copy, no spinner).
  // aria-busy + aria-live let assistive tech announce the eventual content.
  if (isLoading || !question) {
    return (
      <section
        aria-labelledby="qotd-heading"
        aria-busy="true"
        aria-live="polite"
        className="rounded-2xl border border-primary/20 bg-primary/[0.12] p-4 sm:p-5 lg:p-6"
      >
        <span className="sr-only">Loading today's question</span>
        <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="mt-2 text-xs uppercase tracking-wider text-white/50">
          Question of the Day
        </p>
        {/* Heading placeholder — preserves layout height and the qotd-heading id */}
        <h2 id="qotd-heading" className="mt-2 sr-only">
          Loading
        </h2>
        <div
          className="mt-2 h-7 w-4/5 rounded bg-white/[0.08]"
          aria-hidden="true"
        />
        <div
          className="mt-3 h-4 w-3/5 rounded bg-white/[0.06]"
          aria-hidden="true"
        />
        <div
          className="mt-4 h-11 w-44 rounded-lg bg-white/[0.08]"
          aria-hidden="true"
        />
      </section>
    )
  }

  const responseLabel =
    responseCount === 0
      ? 'Be the first to respond'
      : responseCount === 1
        ? '1 response'
        : `${responseCount} responses`

  const handleResponseCountClick = () => {
    if (responseCount === 0) {
      onToggleComposer()
    } else {
      onScrollToResponses()
    }
  }

  return (
    <section
      aria-labelledby="qotd-heading"
      className="rounded-2xl border border-primary/20 bg-primary/[0.12] p-4 sm:p-5 lg:p-6"
    >
      <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />

      <p className="mt-2 text-xs uppercase tracking-wider text-white/50">
        Question of the Day
      </p>

      <h2 id="qotd-heading" className="mt-2 text-lg font-bold text-white">
        {question.text}
      </h2>

      {question.hint && (
        <p className="mt-2 font-serif text-sm italic text-white/50">
          {question.hint}
        </p>
      )}

      <button
        type="button"
        onClick={handleResponseCountClick}
        className="mt-3 flex min-h-[44px] items-center text-sm text-white/60 transition-colors hover:text-white/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        aria-label={
          responseCount === 0
            ? "Be the first to respond to today's question"
            : `View ${responseLabel} to today's question`
        }
      >
        {responseLabel}
      </button>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleComposer}
          aria-expanded={isComposerOpen}
          className="min-h-[44px] rounded-lg border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          Share Your Thoughts
        </button>
        <ShareButton
          shareUrl="/prayer-wall"
          shareText={`Today's question on Worship Room: ${question.text}`}
          shareTitle="Question of the Day"
          className="[&>button]:border-white/30 [&>button]:bg-white/10 [&>button]:text-white [&>button]:hover:bg-white/20"
        />
      </div>
    </section>
  )
}
