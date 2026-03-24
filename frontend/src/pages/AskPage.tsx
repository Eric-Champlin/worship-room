import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { UserQuestionBubble } from '@/components/ask/UserQuestionBubble'
import { AskResponseDisplay } from '@/components/ask/AskResponseDisplay'
import { PopularTopicsSection } from '@/components/ask/PopularTopicsSection'
import { SaveConversationButton } from '@/components/ask/SaveConversationButton'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import { ASK_TOPIC_CHIPS, ASK_MAX_LENGTH, ASK_CHAR_WARNING, ASK_CHAR_DANGER, ASK_LOADING_DELAY_MS, ASK_FEEDBACK_KEY } from '@/constants/ask'
import { getAskResponse } from '@/mocks/ask-mock-data'
import type { AskResponse, AskFeedback } from '@/types/ask'
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
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const handleSubmitRef = useRef<() => void>(() => {})
  const pendingAutoSubmitRef = useRef<string | null>(null)

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
    const submittedText = text.trim()
    setIsLoading(true)
    setPendingQuestion(submittedText)
    setFeedback(null)
    setFeedbackThanks(false)

    setTimeout(() => {
      const result = getAskResponse(submittedText)
      setConversation((prev) => [...prev, { question: submittedText, response: result }])
      setText('')
      setPendingQuestion(null)
      setIsLoading(false)

      // Auto-scroll to new response
      setTimeout(() => {
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
    const qParam = searchParams.get('q')
    if (qParam) {
      setText(qParam)
      if (isAuthenticated) {
        setTimeout(() => handleSubmitRef.current(), 0)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle auto-submit from Popular Topics (Step 7)
  useEffect(() => {
    if (pendingAutoSubmitRef.current && text === pendingAutoSubmitRef.current && isAuthenticated) {
      pendingAutoSubmitRef.current = null
      handleSubmitRef.current()
    }
  }, [text, isAuthenticated])

  const handleChipClick = (chipText: string) => {
    setText(chipText)
    document.getElementById('ask-input')?.focus()
  }

  const handleTopicClick = (starterQuestion: string) => {
    setText(starterQuestion)
    if (isAuthenticated) {
      pendingAutoSubmitRef.current = starterQuestion
    }
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
      authModal?.openAuthModal('Sign in to ask questions')
      return
    }
    setPendingQuestion(question)
    setIsLoading(true)
    setTimeout(() => {
      const result = getAskResponse(question)
      setConversation((prev) => [...prev, { question, response: result }])
      setPendingQuestion(null)
      setIsLoading(false)

      setTimeout(() => {
        document.getElementById('latest-response')?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 100)
    }, ASK_LOADING_DELAY_MS)
  }

  const handleJournal = () => {
    const questionText = conversation.length > 0 ? conversation[0].question : text
    navigate('/daily?tab=journal', { state: { prayWallContext: questionText } })
  }

  const handlePray = () => {
    const questionText = conversation.length > 0 ? conversation[0].question : text
    navigate('/daily?tab=pray', { state: { prayWallContext: questionText } })
  }

  const handleShare = async () => {
    if (conversation.length === 0) return
    const first = conversation[0]
    const shareText = `${first.question}\n\n${first.response.verses[0].reference} — Found on Worship Room`
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

    if (!isAuthenticated || conversation.length === 0) return
    const firstResponse = conversation[0].response
    const existing: AskFeedback[] = JSON.parse(
      localStorage.getItem(ASK_FEEDBACK_KEY) || '[]',
    )
    const entry: AskFeedback = {
      questionId: firstResponse.id,
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

  const showInput = conversation.length === 0 && !isLoading

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
                      'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
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
                        'transition-colors',
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
                      <span className="mt-1 block text-sm not-italic">
                        &mdash; Psalm 119:105 WEB
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Save conversation button — after 2+ Q&A pairs */}
            <SaveConversationButton conversation={conversation} />
          </div>
        </div>
      </main>
    </Layout>
  )
}
