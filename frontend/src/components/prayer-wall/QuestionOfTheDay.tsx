import { useQotdToday } from '@/hooks/useQotdToday'
import { useWatchMode } from '@/hooks/useWatchMode'
import { ShareButton } from '@/components/daily/ShareButton'
import { FrostedCard } from '@/components/homepage/FrostedCard'

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
  // Spec 6.4 MPD-14 — Watch mode suppresses QOTD entirely.
  // Hook called at top to comply with the React rules of hooks.
  const { active: watchActive } = useWatchMode()
  if (watchActive) return null

  // Skeleton state during initial fetch — anti-pressure (no copy, no spinner).
  // aria-busy + aria-live let assistive tech announce the eventual content.
  if (isLoading || !question) {
    return (
      <div aria-busy="true" aria-live="polite">
        <FrostedCard
          variant="accent"
          eyebrow="Question of the Day"
          eyebrowColor="violet"
          as="section"
          aria-labelledby="qotd-heading"
          className="frosted-card-accent-night-aware"
        >
          <span className="sr-only">Loading today's question</span>
          {/* Heading placeholder — preserves layout height and the qotd-heading id */}
          <h2 id="qotd-heading" className="sr-only">
            Loading
          </h2>
          <div className="mt-2 h-7 w-4/5 rounded bg-white/[0.08]" aria-hidden="true" />
          <div className="mt-3 h-4 w-3/5 rounded bg-white/[0.06]" aria-hidden="true" />
          <div className="mt-4 h-11 w-44 rounded-lg bg-white/[0.08]" aria-hidden="true" />
        </FrostedCard>
      </div>
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
    <FrostedCard
      variant="accent"
      eyebrow="Question of the Day"
      eyebrowColor="violet"
      as="section"
      aria-labelledby="qotd-heading"
      className="frosted-card-accent-night-aware"
    >
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
        className="mt-3 flex min-h-[44px] items-center text-sm text-white/60 transition-colors hover:text-white/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded"
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
    </FrostedCard>
  )
}
