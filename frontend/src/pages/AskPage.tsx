import { useState, useCallback, useEffect, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UserQuestionBubble } from '@/components/ask/UserQuestionBubble'
import { AskResponseDisplay } from '@/components/ask/AskResponseDisplay'
import { PopularTopicsSection } from '@/components/ask/PopularTopicsSection'
import { SaveConversationButton } from '@/components/ask/SaveConversationButton'
import { ConversionPrompt } from '@/components/ask/ConversionPrompt'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { ASK_TOPIC_CHIPS, ASK_MAX_LENGTH, ASK_LOADING_DELAY_MS, ASK_FEEDBACK_KEY } from '@/constants/ask'
import { getAskResponse } from '@/mocks/ask-mock-data'
import type { AskResponse, AskFeedback } from '@/types/ask'
import { SEO } from '@/components/SEO'
import { ASK_METADATA } from '@/lib/seo/routeMetadata'
import { cn } from '@/lib/utils'

interface ConversationPair {
  question: string
  response: AskResponse
}

export function AskPage() {
  const [text, setText] = useState('')
  const [conversation, setConversation] = useState<ConversationPair[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [feedbackThanks, setFeedbackThanks] = useState(false)
  const [conversionDismissed, setConversionDismissed] = useState(false)
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const { isOnline } = useOnlineStatus()
  const handleSubmitRef = useRef<() => void>(() => {})
  const pendingAutoSubmitRef = useRef<string | null>(null)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const autoExpand = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const handleSubmit = () => {
    if (!text.trim()) return
    const submittedText = text.trim()
    setIsLoading(true)
    setPendingQuestion(submittedText)
    setFeedback(null)
    setFeedbackThanks(false)

    loadingTimerRef.current = setTimeout(() => {
      const result = getAskResponse(submittedText)
      setConversation((prev) => [...prev, { question: submittedText, response: result }])
      setText('')
      setPendingQuestion(null)
      setIsLoading(false)

      // Auto-scroll to new response
      scrollTimerRef.current = setTimeout(() => {
        document.getElementById('latest-response')?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 100)
    }, ASK_LOADING_DELAY_MS)
  }

  handleSubmitRef.current = handleSubmit

  // Handle ?q= query param on mount
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const qParam = searchParams.get('q')
    if (qParam) {
      setText(qParam)
      timeoutId = setTimeout(() => handleSubmitRef.current(), 0)
    }
    return () => clearTimeout(timeoutId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle auto-submit from Popular Topics
  useEffect(() => {
    if (pendingAutoSubmitRef.current && text === pendingAutoSubmitRef.current) {
      pendingAutoSubmitRef.current = null
      handleSubmitRef.current()
    }
  }, [text])

  const handleChipClick = (chipText: string) => {
    setText(chipText)
    document.getElementById('ask-input')?.focus()
  }

  const handleTopicClick = (starterQuestion: string) => {
    setText(starterQuestion)
    pendingAutoSubmitRef.current = starterQuestion
  }

  const handleAskAnother = () => {
    setConversation([])
    setText('')
    setFeedback(null)
    setFeedbackThanks(false)
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  const handleFollowUpClick = (question: string) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to continue the conversation')
      return
    }
    setPendingQuestion(question)
    setIsLoading(true)
    loadingTimerRef.current = setTimeout(() => {
      const result = getAskResponse(question)
      setConversation((prev) => [...prev, { question, response: result }])
      setPendingQuestion(null)
      setIsLoading(false)

      scrollTimerRef.current = setTimeout(() => {
        document.getElementById('latest-response')?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 100)
    }, ASK_LOADING_DELAY_MS)
  }

  const handleJournal = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save journal entries')
      return
    }
    const questionText = conversation.length > 0 ? conversation[0].question : text
    navigate('/daily?tab=journal', { state: { prayWallContext: questionText } })
  }

  const handlePray = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to generate prayers')
      return
    }
    const questionText = conversation.length > 0 ? conversation[0].question : text
    navigate('/daily?tab=pray', { state: { prayWallContext: questionText } })
  }

  const handleShare = async () => {
    if (conversation.length === 0) return
    const first = conversation[0]
    const shareText = `${first.question}\n\n${first.response.verses[0].reference} — Found on Worship Room`
    try {
      await navigator.clipboard.writeText(shareText)
      showToast('Copied — ready to share.')
    } catch (_e) {
      showToast("We couldn't copy that. Try again.", 'error')
    }
  }

  const handleFeedback = (type: 'up' | 'down') => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to give feedback')
      return
    }
    setFeedback(type)
    setFeedbackThanks(true)
    feedbackTimerRef.current = setTimeout(() => setFeedbackThanks(false), 2000)

    if (conversation.length === 0) return
    const firstResponse = conversation[0].response
    let existing: AskFeedback[] = []
    try {
      existing = JSON.parse(
        localStorage.getItem(ASK_FEEDBACK_KEY) || '[]',
      )
    } catch (_e) {
      // Malformed localStorage — reset to empty
    }
    const entry: AskFeedback = {
      questionId: firstResponse.id,
      helpful: type === 'up',
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(ASK_FEEDBACK_KEY, JSON.stringify([...existing, entry]))
  }

  const charCount = text.length

  const showInput = conversation.length === 0 && !isLoading

  if (!isOnline) {
    return (
      <OfflineNotice
        featureName="Ask"
        fallbackRoute="/bible"
        fallbackLabel="Read the Bible"
      />
    )
  }

  return (
    <Layout>
      <SEO {...ASK_METADATA} />
      <div className="min-h-screen bg-dashboard-dark">
        <PageHero title="Ask God's Word" scriptWord="Word" showDivider>
          <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
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
                      aria-label="Your question"
                      aria-describedby="ask-char-count"
                      className={cn(
                        'w-full resize-none rounded-lg border border-glow-cyan/30 bg-white/[0.06] py-3 px-4',
                        'text-base text-white placeholder:text-white/50',
                        'shadow-[0_0_12px_2px_rgba(0,212,255,0.35),0_0_27px_5px_rgba(139,92,246,0.26)]',
                        'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
                      )}
                    />
                    <CharacterCount current={charCount} max={ASK_MAX_LENGTH} warningAt={400} dangerAt={480} visibleAt={300} id="ask-char-count" className="absolute bottom-2 right-3" />
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
                          'min-h-[44px] rounded-full bg-white/10 border border-white/15 px-4 py-2',
                          'text-sm text-white/70',
                          'hover:bg-white/15 hover:text-white',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                          'transition-[colors,transform] duration-fast active:scale-[0.98]',
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
                        'transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]',
                        !text.trim() && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      Find Answers
                    </button>
                  </div>

                  {/* Popular Topics */}
                  <PopularTopicsSection onTopicClick={handleTopicClick} />
                </>
              )}

              {/* Conversation thread + loading — aria-live announces new responses */}
              <div aria-live="polite">
                {conversation.map((pair, index) => (
                  <div
                    key={index}
                    id={index === conversation.length - 1 ? 'latest-response' : undefined}
                  >
                    {index > 0 && <div className="my-8 border-t border-white/5" />}
                    <UserQuestionBubble question={pair.question} />
                    <div className="mt-6">
                      <AskResponseDisplay
                        response={pair.response}
                        isFirstResponse={index === 0}
                        onFollowUpClick={handleFollowUpClick}
                        prefersReducedMotion={prefersReducedMotion}
                        isLoading={isLoading}
                        onAskAnother={handleAskAnother}
                        onJournal={handleJournal}
                        onPray={handlePray}
                        onShare={handleShare}
                        feedback={feedback}
                        feedbackThanks={feedbackThanks}
                        onFeedback={handleFeedback}
                      />
                    </div>
                  </div>
                ))}

                {/* Loading state — shown below pending question */}
                {isLoading && (
                  <>
                    {pendingQuestion && conversation.length > 0 && (
                      <div className="my-8 border-t border-white/5" />
                    )}
                    {pendingQuestion && (
                      <div className="mb-6">
                        <UserQuestionBubble question={pendingQuestion} />
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="mb-4 flex gap-1">
                        <div className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary" />
                        <div
                          className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-primary"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <p className="text-white/60">Searching Scripture for wisdom...</p>
                      <p className="mt-4 font-serif italic text-white/60">
                        &ldquo;Your word is a lamp to my feet and a light for my path.&rdquo;
                        <span className="mt-1 block text-sm not-italic">
                          &mdash; Psalm 119:105 WEB
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Conversion prompt for logged-out users */}
              {!isAuthenticated && conversation.length > 0 && !conversionDismissed && (
                <ConversionPrompt
                  onDismiss={() => setConversionDismissed(true)}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )}

              {/* Save conversation button — after 2+ Q&A pairs (logged-in only) */}
              {isAuthenticated && <SaveConversationButton conversation={conversation} />}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
