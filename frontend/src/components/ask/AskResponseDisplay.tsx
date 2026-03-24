import { Link } from 'react-router-dom'
import { RefreshCw, BookOpen, Heart, Share2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LinkedAnswerText } from '@/components/ask/LinkedAnswerText'
import { VerseCardActions } from '@/components/ask/VerseCardActions'
import { DigDeeperSection } from '@/components/ask/DigDeeperSection'
import { parseVerseReferences } from '@/lib/parse-verse-references'
import type { AskResponse } from '@/types/ask'

interface AskResponseDisplayProps {
  response: AskResponse
  isFirstResponse: boolean
  onFollowUpClick: (question: string) => void
  prefersReducedMotion: boolean
  isLoading?: boolean
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
  prefersReducedMotion,
  isLoading,
  onAskAnother,
  onJournal,
  onPray,
  onShare,
  feedback,
  feedbackThanks,
  onFeedback,
}: AskResponseDisplayProps) {
  return (
    <div className={prefersReducedMotion ? '' : 'animate-fade-in'}>
      {/* Direct answer */}
      <div className="mb-8">
        {response.answer.split('\n\n').map((p, i) => (
          <p key={i} className="mb-4 text-base leading-relaxed text-text-dark">
            <LinkedAnswerText text={p} />
          </p>
        ))}
      </div>

      {/* What Scripture Says */}
      <h2 className="mb-4 text-xl font-semibold text-text-dark">What Scripture Says</h2>
      <div className="space-y-4">
        {response.verses.map((verse, i) => {
          const parsed = parseVerseReferences(verse.reference)[0] ?? null
          return (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {parsed ? (
                <Link
                  to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
                  className="font-bold text-primary-lt transition-colors hover:underline"
                >
                  {verse.reference}
                </Link>
              ) : (
                <p className="font-bold text-text-dark">{verse.reference}</p>
              )}
              <p className="mt-2 font-serif italic text-text-dark">{verse.text}</p>
              <p className="mt-2 text-sm text-text-light">{verse.explanation}</p>
              <VerseCardActions verse={verse} parsedRef={parsed} />
            </div>
          )
        })}
      </div>

      {/* Closing encouragement */}
      <div className="mt-8 rounded-r-lg border-l-4 border-primary bg-purple-50 p-4">
        <p className="text-text-dark">{response.encouragement}</p>
      </div>

      {/* Suggested prayer */}
      <div className="mt-8">
        <p className="mb-2 text-sm font-semibold text-text-dark">Pray About This</p>
        <p className="font-serif italic leading-relaxed text-text-dark">{response.prayer}</p>
      </div>

      {/* AI disclaimer */}
      <p className="mt-6 text-center text-xs text-text-light">
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
            <button
              type="button"
              onClick={onAskAnother}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                'text-sm text-text-dark hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Ask another question
            </button>
            <button
              type="button"
              onClick={onJournal}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                'text-sm text-text-dark hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <BookOpen className="h-4 w-4" />
              Journal about this
            </button>
            <button
              type="button"
              onClick={onPray}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                'text-sm text-text-dark hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <Heart className="h-4 w-4" />
              Pray about this
            </button>
            <button
              type="button"
              onClick={onShare}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                'text-sm text-text-dark hover:bg-gray-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {/* Feedback row — first response only */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className="text-sm text-text-light">Was this helpful?</span>
            <button
              type="button"
              onClick={() => onFeedback?.('up')}
              aria-label="Yes, helpful"
              aria-pressed={feedback === 'up'}
              className={cn(
                'min-h-[44px] min-w-[44px] rounded-lg p-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors hover:bg-gray-50',
              )}
            >
              <ThumbsUp
                className={cn(
                  'h-5 w-5',
                  feedback === 'up' ? 'fill-primary text-primary' : 'text-text-light',
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.('down')}
              aria-label="No, not helpful"
              aria-pressed={feedback === 'down'}
              className={cn(
                'min-h-[44px] min-w-[44px] rounded-lg p-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors hover:bg-gray-50',
              )}
            >
              <ThumbsDown
                className={cn(
                  'h-5 w-5',
                  feedback === 'down' ? 'fill-danger text-danger' : 'text-text-light',
                )}
              />
            </button>
          </div>
          {feedbackThanks && (
            <p
              className={cn(
                'mt-2 text-center text-sm text-text-light',
                !prefersReducedMotion && 'animate-fade-in',
              )}
            >
              Thank you for your feedback!
            </p>
          )}
        </>
      )}
    </div>
  )
}
