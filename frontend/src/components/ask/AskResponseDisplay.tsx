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
    <div className={prefersReducedMotion ? '' : 'animate-fade-in-up'}>
      {/* Direct answer */}
      <div className="mb-8">
        {response.answer.split('\n\n').map((p, i) => (
          <p key={i} className="mb-4 text-base leading-relaxed text-white/80">
            <LinkedAnswerText text={p} />
          </p>
        ))}
      </div>

      {/* What Scripture Says */}
      <h2 className="mb-4 text-xl font-semibold text-white">What Scripture Says</h2>
      <div className="space-y-4">
        {response.verses.map((verse, i) => {
          const parsed = parseVerseReferences(verse.reference)[0] ?? null
          return (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
              {parsed ? (
                <Link
                  to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
                  className="font-bold text-primary-lt transition-colors hover:underline"
                >
                  {verse.reference}
                </Link>
              ) : (
                <p className="font-bold text-white">{verse.reference}</p>
              )}
              <p className="mt-2 font-serif italic text-white/70">{verse.text}</p>
              <p className="mt-2 text-sm text-white/50">{verse.explanation}</p>
              <VerseCardActions verse={verse} parsedRef={parsed} />
            </div>
          )
        })}
      </div>

      {/* Closing encouragement */}
      <div className="mt-8 rounded-r-lg border-l-2 border-primary bg-white/[0.06] p-4">
        <p className="text-white/80">{response.encouragement}</p>
      </div>

      {/* Suggested prayer */}
      <div className="mt-8">
        <p className="mb-2 text-sm font-semibold text-white">Pray About This</p>
        <p className="font-serif italic leading-relaxed text-white/60">{response.prayer}</p>
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
            <button
              type="button"
              onClick={onAskAnother}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2',
                'text-sm text-white/70 hover:bg-white/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Ask another question
            </button>
            <button
              type="button"
              onClick={onJournal}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2',
                'text-sm text-white/70 hover:bg-white/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Journal about this
            </button>
            <button
              type="button"
              onClick={onPray}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2',
                'text-sm text-white/70 hover:bg-white/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              Pray about this
            </button>
            <button
              type="button"
              onClick={onShare}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2',
                'text-sm text-white/70 hover:bg-white/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors',
              )}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>
          </div>

          {/* Feedback row — first response only */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className="text-sm text-white/60">Was this helpful?</span>
            <button
              type="button"
              onClick={() => onFeedback?.('up')}
              aria-label="Yes, helpful"
              aria-pressed={feedback === 'up'}
              className={cn(
                'min-h-[44px] min-w-[44px] rounded-lg bg-white/10 p-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors hover:bg-white/15',
              )}
            >
              <ThumbsUp
                className={cn(
                  'h-5 w-5',
                  feedback === 'up' ? 'fill-primary text-primary' : 'text-white/60',
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onFeedback?.('down')}
              aria-label="No, not helpful"
              aria-pressed={feedback === 'down'}
              className={cn(
                'min-h-[44px] min-w-[44px] rounded-lg bg-white/10 p-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'transition-colors hover:bg-white/15',
              )}
            >
              <ThumbsDown
                className={cn(
                  'h-5 w-5',
                  feedback === 'down' ? 'fill-danger text-danger' : 'text-white/60',
                )}
              />
            </button>
          </div>
          {feedbackThanks && (
            <p
              className={cn(
                'mt-2 text-center text-sm text-white/60',
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
