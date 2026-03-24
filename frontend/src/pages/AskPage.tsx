import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { ASK_TOPIC_CHIPS, ASK_MAX_LENGTH, ASK_CHAR_WARNING, ASK_CHAR_DANGER, ASK_LOADING_DELAY_MS, ASK_FEEDBACK_KEY } from '@/constants/ask'
import { getAskResponse } from '@/mocks/ask-mock-data'
import type { AskResponse, AskFeedback } from '@/types/ask'
import { cn } from '@/lib/utils'
import { RefreshCw, BookOpen, Heart, Share2, ThumbsUp, ThumbsDown } from 'lucide-react'

export function AskPage() {
  const [text, setText] = useState('')
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [feedbackThanks, setFeedbackThanks] = useState(false)
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const handleSubmitRef = useRef<() => void>(() => {})

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const handleSubmit = () => {
    if (!text.trim()) return
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to ask questions')
      return
    }
    setIsLoading(true)
    setResponse(null)
    setFeedback(null)
    setFeedbackThanks(false)

    setTimeout(() => {
      const result = getAskResponse(text)
      setResponse(result)
      setIsLoading(false)
    }, ASK_LOADING_DELAY_MS)
  }

  handleSubmitRef.current = handleSubmit

  // Handle ?q= query param on mount
  useEffect(() => {
    const qParam = searchParams.get('q')
    if (qParam) {
      setText(qParam)
      if (isAuthenticated) {
        // Slight delay to let state update
        setTimeout(() => handleSubmitRef.current(), 0)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChipClick = (chipText: string) => {
    setText(chipText)
    document.getElementById('ask-input')?.focus()
  }

  const handleAskAnother = () => {
    setText('')
    setResponse(null)
    setFeedback(null)
    setFeedbackThanks(false)
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const handleJournal = () => {
    navigate('/daily?tab=journal', { state: { prayWallContext: text } })
  }

  const handlePray = () => {
    navigate('/daily?tab=pray', { state: { prayWallContext: text } })
  }

  const handleShare = async () => {
    if (!response) return
    const shareText = `${text}\n\n${response.verses[0].reference} — Found on Worship Room`
    try {
      await navigator.clipboard.writeText(shareText)
      showToast('Copied to clipboard')
    } catch {
      showToast('Could not copy to clipboard', 'error')
    }
  }

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type)
    setFeedbackThanks(true)
    setTimeout(() => setFeedbackThanks(false), 2000)

    if (!isAuthenticated || !response) return
    const existing: AskFeedback[] = JSON.parse(
      localStorage.getItem(ASK_FEEDBACK_KEY) || '[]'
    )
    const entry: AskFeedback = {
      questionId: response.id,
      helpful: type === 'up',
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(ASK_FEEDBACK_KEY, JSON.stringify([...existing, entry]))
  }

  const charCount = text.length
  const charCountColor =
    charCount >= ASK_CHAR_DANGER
      ? 'text-danger'
      : charCount >= ASK_CHAR_WARNING
        ? 'text-warning'
        : 'text-text-light/60'

  const showInput = !isLoading && !response

  return (
    <Layout>
      <PageHero title="Ask God's Word" showDivider>
        <p className="mx-auto max-w-xl font-serif italic text-base text-white/85 sm:text-lg">
          Bring your questions. Find wisdom in Scripture.
        </p>
      </PageHero>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative">
          <div style={SQUIGGLE_MASK_STYLE}>
            <BackgroundSquiggle />
          </div>

          <div className="relative">
            {/* Input section */}
            {showInput && (
              <>
                {/* Textarea */}
                <div className="relative mb-4">
                  <label htmlFor="ask-input" className="sr-only">
                    Your question
                  </label>
                  <textarea
                    id="ask-input"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      autoExpand(e.target)
                    }}
                    placeholder="What's on your heart? Ask anything..."
                    maxLength={ASK_MAX_LENGTH}
                    rows={3}
                    aria-describedby="ask-char-count"
                    className={cn(
                      'w-full resize-none rounded-lg border border-glow-cyan/30 bg-white py-3 px-4',
                      'text-base text-text-dark placeholder:text-text-light/60',
                      'animate-glow-pulse',
                      'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
                    )}
                  />
                  <span
                    id="ask-char-count"
                    className={cn('absolute bottom-2 right-3 text-xs', charCountColor)}
                  >
                    {charCount} / {ASK_MAX_LENGTH}
                  </span>
                </div>

                {/* Crisis Banner */}
                <CrisisBanner text={text} />

                {/* Topic Chips */}
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                  {ASK_TOPIC_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={cn(
                        'min-h-[44px] rounded-full border border-gray-200 bg-white px-4 py-2',
                        'text-sm text-text-dark',
                        'hover:border-primary hover:text-primary',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        'transition-colors'
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!text.trim()}
                    className={cn(
                      'min-h-[44px] rounded-lg bg-primary py-3 px-8 font-semibold text-white',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors hover:bg-primary-lt',
                      !text.trim() && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    Find Answers
                  </button>
                </div>
              </>
            )}

            {/* Loading state */}
            <div aria-live="polite">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-4 flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <p className="text-text-light">Searching Scripture for wisdom...</p>
                  <p className="mt-4 font-serif italic text-text-light">
                    &ldquo;Your word is a lamp to my feet and a light for my path.&rdquo;
                    <span className="mt-1 block text-sm not-italic">&mdash; Psalm 119:105 WEB</span>
                  </p>
                </div>
              )}
            </div>

            {/* Response display */}
            {response && (
              <div className={prefersReducedMotion ? '' : 'animate-fade-in'}>
                {/* Direct answer */}
                <div className="mb-8">
                  {response.answer.split('\n\n').map((p, i) => (
                    <p key={i} className="mb-4 text-base leading-relaxed text-text-dark">
                      {p}
                    </p>
                  ))}
                </div>

                {/* What Scripture Says */}
                <h2 className="mb-4 text-xl font-semibold text-text-dark">What Scripture Says</h2>
                <div className="space-y-4">
                  {response.verses.map((verse, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <p className="font-bold text-text-dark">{verse.reference}</p>
                      <p className="mt-2 font-serif italic text-text-dark">{verse.text}</p>
                      <p className="mt-2 text-sm text-text-light">{verse.explanation}</p>
                    </div>
                  ))}
                </div>

                {/* Closing encouragement */}
                <div className="mt-8 rounded-r-lg border-l-4 border-primary bg-purple-50 p-4">
                  <p className="text-text-dark">{response.encouragement}</p>
                </div>

                {/* Suggested prayer */}
                <div className="mt-8">
                  <p className="mb-2 text-sm font-semibold text-text-dark">Pray About This</p>
                  <p className="font-serif italic leading-relaxed text-text-dark">
                    {response.prayer}
                  </p>
                </div>

                {/* AI disclaimer */}
                <p className="mt-6 text-center text-xs text-text-light">
                  AI-generated content for encouragement. Not professional advice.
                </p>

                {/* Action buttons */}
                <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
                  <button
                    type="button"
                    onClick={handleAskAnother}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                      'text-sm text-text-dark hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors'
                    )}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Ask another question
                  </button>
                  <button
                    type="button"
                    onClick={handleJournal}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                      'text-sm text-text-dark hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors'
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    Journal about this
                  </button>
                  <button
                    type="button"
                    onClick={handlePray}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                      'text-sm text-text-dark hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors'
                    )}
                  >
                    <Heart className="h-4 w-4" />
                    Pray about this
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className={cn(
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2',
                      'text-sm text-text-dark hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors'
                    )}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>

                {/* Feedback row */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  <span className="text-sm text-text-light">Was this helpful?</span>
                  <button
                    type="button"
                    onClick={() => handleFeedback('up')}
                    aria-label="Yes, helpful"
                    aria-pressed={feedback === 'up'}
                    className={cn(
                      'min-h-[44px] min-w-[44px] rounded-lg p-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors hover:bg-gray-50'
                    )}
                  >
                    <ThumbsUp
                      className={cn(
                        'h-5 w-5',
                        feedback === 'up' ? 'fill-primary text-primary' : 'text-text-light'
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback('down')}
                    aria-label="No, not helpful"
                    aria-pressed={feedback === 'down'}
                    className={cn(
                      'min-h-[44px] min-w-[44px] rounded-lg p-2',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'transition-colors hover:bg-gray-50'
                    )}
                  >
                    <ThumbsDown
                      className={cn(
                        'h-5 w-5',
                        feedback === 'down' ? 'fill-danger text-danger' : 'text-text-light'
                      )}
                    />
                  </button>
                </div>
                {feedbackThanks && (
                  <p className={cn('mt-2 text-center text-sm text-text-light', !prefersReducedMotion && 'animate-fade-in')}>
                    Thank you for your feedback!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </Layout>
  )
}
