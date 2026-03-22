import { MessageCircle } from 'lucide-react'
import { getTodaysQuestion } from '@/constants/question-of-the-day'
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
  const question = getTodaysQuestion()

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
      className="rounded-2xl border border-primary/30 bg-hero-mid p-4 sm:p-5 lg:p-6"
    >
      <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />

      <p className="mt-2 text-xs uppercase tracking-wider text-white/50">
        Question of the Day
      </p>

      <h2
        id="qotd-heading"
        className="mt-2 text-lg font-bold text-white"
      >
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
        aria-label={responseCount === 0 ? 'Be the first to respond to today\'s question' : `View ${responseLabel} to today's question`}
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
