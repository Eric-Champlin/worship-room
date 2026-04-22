import { useState, useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { GlowBackground } from '@/components/homepage/GlowBackground'
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
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { ASK_TOPIC_CHIPS, ASK_MAX_LENGTH, ASK_FEEDBACK_KEY } from '@/constants/ask'
import { fetchAskResponse, type ConversationTurn } from '@/services/ask-service'
import type { AskResponse, AskFeedback } from '@/types/ask'
import { SEO } from '@/components/SEO'
import { ASK_METADATA } from '@/lib/seo/routeMetadata'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
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

  const chipsReveal = useScrollReveal({ threshold: 0.1 })

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

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

    // Build conversation history from prior turns, flattened to role/content pairs.
    const history: ConversationTurn[] = conversation.flatMap((pair) => [
      { role: 'user' as const, content: pair.question },
      { role: 'assistant' as const, content: pair.response.answer },
    ])

    fetchAskResponse(submittedText, history).then((result) => {
      setConversation((prev) => [...prev, { question: submittedText, response: result }])
      setText('')
      setPendingQuestion(null)
      setIsLoading(false)

      // Auto-scroll to new response
      scrollTimerRef.current = setTimeout(() => {
        const reducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        document.getElementById('latest-response')?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 100)
    })
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
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  const handleFollowUpClick = (question: string) => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to continue the conversation')
      return
    }
    setPendingQuestion(question)
    setIsLoading(true)

    const history: ConversationTurn[] = conversation.flatMap((pair) => [
      { role: 'user' as const, content: pair.question },
      { role: 'assistant' as const, content: pair.response.answer },
    ])

    fetchAskResponse(question, history).then((result) => {
      setConversation((prev) => [...prev, { question, response: result }])
      setPendingQuestion(null)
      setIsLoading(false)

      scrollTimerRef.current = setTimeout(() => {
        const reducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        document.getElementById('latest-response')?.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 100)
    })
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
    <Layout transparentNav>
      <SEO {...ASK_METADATA} />
      <GlowBackground variant="fullPage">
        <section
          aria-labelledby="ask-hero-heading"
          className="px-4 pt-32 pb-10 text-center sm:px-6 sm:pt-40 sm:pb-12"
        >
          <h1
            id="ask-hero-heading"
            className="pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift"
            style={GRADIENT_TEXT_STYLE}
          >
            Ask God&apos;s Word
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-white sm:text-lg">
            Bring your questions. Find wisdom in Scripture.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
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
                  className="w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <CharacterCount current={charCount} max={ASK_MAX_LENGTH} warningAt={400} dangerAt={480} visibleAt={300} id="ask-char-count" className="absolute bottom-2 right-3" />
              </div>

              {/* Crisis Banner */}
              <CrisisBanner text={text} />

              {/* Topic Chips */}
              <div
                ref={chipsReveal.ref as RefObject<HTMLDivElement>}
                className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center"
              >
                {ASK_TOPIC_CHIPS.map((chip, index) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={cn(
                      'scroll-reveal',
                      chipsReveal.isVisible && 'is-visible',
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
                    )}
                    style={staggerDelay(index, 40)}
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
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
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
                    <div className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-white/80" />
                    <div
                      className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-white/80"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="h-2 w-2 motion-safe:animate-bounce motion-reduce:animate-none rounded-full bg-white/80"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <p className="text-white">Searching Scripture for wisdom...</p>
                  <p className="mt-4 font-serif text-white/80">
                    &ldquo;Your word is a lamp to my feet and a light for my path.&rdquo;
                    <span className="mt-1 block text-sm text-white/60">
                      &mdash; Psalm 119:105 WEB
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Conversion prompt for logged-out users */}
          {!isAuthenticated && conversation.length > 0 && !conversionDismissed && (
            <ConversionPrompt onDismiss={() => setConversionDismissed(true)} />
          )}

          {/* Save conversation button — after 2+ Q&A pairs (logged-in only) */}
          {isAuthenticated && <SaveConversationButton conversation={conversation} />}
        </section>
      </GlowBackground>
    </Layout>
  )
}
