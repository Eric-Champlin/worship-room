import { Link } from 'react-router-dom'
import { RefreshCw, BookOpen, Heart, Share2, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { RefObject } from 'react'
import { cn } from '@/lib/utils'
import { LinkedAnswerText } from '@/components/ask/LinkedAnswerText'
import { VerseCardActions } from '@/components/ask/VerseCardActions'
import { DigDeeperSection } from '@/components/ask/DigDeeperSection'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'
import { parseVerseReferences } from '@/lib/parse-verse-references'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import type { AskResponse } from '@/types/ask'

interface AskResponseDisplayProps {
  response: AskResponse
  isFirstResponse: boolean
  onFollowUpClick: (question: string) => void
  isLoading?: boolean
  isLatestResponse?: boolean
  // First-response-only props
  onAskAnother?: () => void
  onJournal?: () => void
  onPray?: () => void
  onShare?: () => void
  feedback?: 'up' | 'down' | null
  feedbackThanks?: boolean
  onFeedback?: (type: 'up' | 'down') => void
}

export function AskResponseDisplay({
  response,
  isFirstResponse,
  onFollowUpClick,
  isLoading,
  isLatestResponse,
  onAskAnother,
  onJournal,
  onPray,
  onShare,
  feedback,
  feedbackThanks,
  onFeedback,
}: AskResponseDisplayProps) {
  const versesReveal = useScrollReveal({ threshold: 0.1 })
  const actionsReveal = useScrollReveal({ threshold: 0.1 })

  return (
    <div className="motion-safe:animate-fade-in-up">
      {/* Direct answer */}
      <FrostedCard className="mb-8">
        {response.answer.split('\n\n').map((p, i, arr) => (
          <p
            key={i}
            className={cn(
              'text-base leading-relaxed text-white',
              i < arr.length - 1 && 'mb-4',
            )}
          >
            <LinkedAnswerText text={p} />
          </p>
        ))}
      </FrostedCard>

      {/* What Scripture Says */}
      <h2
        id={isLatestResponse ? 'latest-response-heading' : undefined}
        tabIndex={isLatestResponse ? -1 : undefined}
        className="mb-4 text-xl font-semibold text-white focus:outline-none"
      >
        What Scripture Says
      </h2>
      <div ref={versesReveal.ref as RefObject<HTMLDivElement>} className="space-y-4">
        {response.verses.map((verse, i) => {
          const parsed = parseVerseReferences(verse.reference)[0] ?? null
          return (
            <div
              key={i}
              className={cn('scroll-reveal', versesReveal.isVisible && 'is-visible')}
              style={staggerDelay(i, 80)}
            >
              <FrostedCard className="p-5">
                {parsed ? (
                  <Link
                    to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
                    className="font-semibold text-white underline decoration-primary/60 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-base motion-reduce:transition-none hover:decoration-primary hover:decoration-2"
                  >
                    {verse.reference}
                  </Link>
                ) : (
                  <p className="font-bold text-white">{verse.reference}</p>
                )}
                <p className="mt-2 font-serif text-white">{verse.text}</p>
                <p className="mt-2 text-sm text-white/80">{verse.explanation}</p>
                <VerseCardActions verse={verse} parsedRef={parsed} />
              </FrostedCard>
            </div>
          )
        })}
      </div>

      {/* Closing encouragement — Tier 2 scripture callout */}
      <div className="mt-8 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3">
        <p className="text-base leading-relaxed text-white">{response.encouragement}</p>
      </div>

      {/* Suggested prayer */}
      <div className="mt-8">
        <p className="mb-2 text-sm font-semibold text-white">Pray About This</p>
        <p className="leading-relaxed text-white/80">{response.prayer}</p>
      </div>

      {/* AI disclaimer */}
      <p className="mt-6 text-center text-xs text-white/60">
        AI-generated content for encouragement. Not professional advice.
      </p>

      {/* Dig Deeper follow-up chips */}
      <DigDeeperSection
        followUpQuestions={response.followUpQuestions}
        onChipClick={onFollowUpClick}
        disabled={isLoading}
      />

      {/* Action buttons — first response only */}
      {isFirstResponse && (
        <>
          <div
            ref={actionsReveal.ref as RefObject<HTMLDivElement>}
            className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
          >
            <button
              type="button"
              onClick={onAskAnother}
              className={cn(
                'scroll-reveal',
                actionsReveal.isVisible && 'is-visible',
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
              )}
              style={staggerDelay(0, 50)}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Ask another question
            </button>
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={onJournal}
              className={cn('scroll-reveal', actionsReveal.isVisible && 'is-visible')}
              style={staggerDelay(1, 50)}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Journal about this
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={onPray}
              className={cn('scroll-reveal', actionsReveal.isVisible && 'is-visible')}
              style={staggerDelay(2, 50)}
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              Pray about this
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="md"
              onClick={onShare}
              className={cn('scroll-reveal', actionsReveal.isVisible && 'is-visible')}
              style={staggerDelay(3, 50)}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </Button>
          </div>

          {/* Feedback row — first response only */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className="text-sm text-white/60">Was this helpful?</span>
            <button
              type="button"
              onClick={() => onFeedback?.('up')}
              aria-label="Yes, helpful"
              aria-pressed={feedback === 'up'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 border border-white/20 p-2.5 transition-colors duration-base motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
            >
              <ThumbsUp
                className={cn(
                  'h-5 w-5 transition-colors duration-base motion-reduce:transition-none',
                  feedback === 'up' ? 'fill-primary text-primary' : 'text-white',
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.('down')}
              aria-label="No, not helpful"
              aria-pressed={feedback === 'down'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 border border-white/20 p-2.5 transition-colors duration-base motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
            >
              <ThumbsDown
                className={cn(
                  'h-5 w-5 transition-colors duration-base motion-reduce:transition-none',
                  feedback === 'down' ? 'fill-danger text-danger' : 'text-white',
                )}
              />
            </button>
          </div>
          {feedbackThanks && (
            <p className="mt-2 text-center text-sm text-white/60 motion-safe:animate-fade-in">
              Thank you for your feedback!
            </p>
          )}
        </>
      )}
    </div>
  )
}
