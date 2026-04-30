import { useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'
import { PRAYER_POST_MAX_LENGTH } from '@/constants/content-limits'
import {
  PRAYER_CATEGORIES,
  CATEGORY_LABELS,
  type PrayerCategory,
} from '@/constants/prayer-categories'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineMessage } from '@/components/pwa/OfflineMessage'
import { getActiveChallengeInfo } from '@/lib/challenge-calendar'
import { getChallenge } from '@/data/challenges'
import { useRovingTabindex } from '@/hooks/useRovingTabindex'

interface InlineComposerProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Submit handler. Return `true` on successful create (composer resets);
   * return `false` to keep the current content and idempotency key so a
   * retry of the SAME content reuses the SAME key (W5 + Spec 3.5 backend
   * dedup contract).
   */
  onSubmit: (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory,
    challengeId?: string,
    idempotencyKey?: string
  ) => boolean | Promise<boolean>
}

export function InlineComposer({ isOpen, onClose, onSubmit }: InlineComposerProps) {
  const { isOnline } = useOnlineStatus()
  const [searchParams] = useSearchParams()
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory | null>(null)
  const [showCategoryError, setShowCategoryError] = useState(false)
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Idempotency key: regenerate whenever the content changes so a fresh
  // post gets a fresh key, but a retry of the SAME content reuses the SAME
  // key (W5 + backend dedup).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(content.length > 0)

  // Challenge prayer checkbox
  const activeChallengeInfo = getActiveChallengeInfo()
  const activeChallenge = activeChallengeInfo ? getChallenge(activeChallengeInfo.challengeId) : null
  const [isChallengePrayer, setIsChallengePrayer] = useState(
    () => searchParams.get('challengePrayer') === 'true'
  )

  const initialCategoryIndex = useMemo(
    () => (selectedCategory ? PRAYER_CATEGORIES.indexOf(selectedCategory) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const { setFocusedIndex: setCategoryFocusedIndex, getItemProps: getCategoryItemProps } =
    useRovingTabindex({
      itemCount: PRAYER_CATEGORIES.length,
      onSelect: (index) => {
        setSelectedCategory(PRAYER_CATEGORIES[index])
        setShowCategoryError(false)
      },
      orientation: 'horizontal',
      initialIndex: initialCategoryIndex,
    })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Bump idempotency key on every content edit so a fresh post gets a fresh
    // key. Retry of the SAME content reuses the SAME key (no edits in between).
    setIdempotencyKey(
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
    )
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }, [])

  // Crisis keyword check is the client-side courtesy fast-path — backend's
  // CrisisAlertService is the canonical entry (Phase 3 Addendum #7).
  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return
    if (!selectedCategory) {
      setShowCategoryError(true)
      return
    }
    if (containsCrisisKeyword(content)) {
      setCrisisDetected(true)
      return
    }
    setIsSubmitting(true)
    try {
      const success = await onSubmit(
        content.trim(),
        isAnonymous,
        selectedCategory,
        isChallengePrayer && activeChallenge ? activeChallenge.id : undefined,
        idempotencyKey
      )
      if (!success) return
      setContent('')
      setIsAnonymous(false)
      setSelectedCategory(null)
      setIsChallengePrayer(false)
      setShowCategoryError(false)
      setCrisisDetected(false)
      // Generate a fresh idempotency key for the next prayer.
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      )
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    content,
    isAnonymous,
    selectedCategory,
    onSubmit,
    isChallengePrayer,
    activeChallenge,
    idempotencyKey,
  ])

  const handleCancel = useCallback(() => {
    setContent('')
    setIsAnonymous(false)
    setSelectedCategory(null)
    setIsChallengePrayer(false)
    setShowCategoryError(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onClose()
  }, [onClose])

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-base ease-standard motion-reduce:transition-none',
        isOpen ? 'visible mb-4 max-h-[800px] opacity-100' : 'invisible max-h-0 opacity-0'
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Share a Prayer Request</h2>

        {!isOnline && (
          <OfflineMessage
            variant="light"
            message="Posting prayers requires an internet connection"
            className="mb-3 rounded-lg border border-white/10"
          />
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="What's on your heart?"
          maxLength={PRAYER_POST_MAX_LENGTH}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 leading-relaxed text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan"
          style={{ minHeight: '120px' }}
          aria-label="Prayer request"
          aria-invalid={content.length > PRAYER_POST_MAX_LENGTH ? 'true' : undefined}
          aria-describedby="composer-char-count"
        />

        {activeChallenge && (
          <label
            className="mt-3 flex items-center gap-2 text-sm text-white/70"
            htmlFor="challenge-prayer-checkbox"
          >
            <input
              type="checkbox"
              checked={isChallengePrayer}
              onChange={(e) => setIsChallengePrayer(e.target.checked)}
              className="h-5 w-5 rounded border-white/20 bg-white/[0.06] accent-primary"
              id="challenge-prayer-checkbox"
            />
            <span>
              This is a{' '}
              <span style={{ color: activeChallenge.themeColor }} className="font-medium">
                {activeChallenge.title}
              </span>{' '}
              prayer
            </span>
          </label>
        )}

        <fieldset
          className="mt-3"
          aria-invalid={showCategoryError || undefined}
          aria-describedby={showCategoryError ? 'composer-category-error' : undefined}
        >
          <legend className="mb-2 text-sm font-medium text-white/70">
            Category
            <span className="ml-0.5 text-red-400" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </legend>
          <div
            role="radiogroup"
            aria-label="Prayer category"
            className="scrollbar-none flex flex-nowrap gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible"
          >
            {PRAYER_CATEGORIES.map((cat, index) => {
              const itemProps = getCategoryItemProps(index)
              return (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={selectedCategory === cat}
                  onClick={() => {
                    setSelectedCategory(cat)
                    setShowCategoryError(false)
                    setCategoryFocusedIndex(index)
                  }}
                  className={cn(
                    'min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-fast ease-standard',
                    selectedCategory === cat
                      ? 'border-primary/40 bg-primary/20 text-primary-lt'
                      : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/15'
                  )}
                  tabIndex={itemProps.tabIndex}
                  onKeyDown={itemProps.onKeyDown}
                  ref={itemProps.ref}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>
          {showCategoryError && (
            <p id="composer-category-error" className="mt-2 text-sm text-warning" role="alert">
              Please choose a category
            </p>
          )}
        </fieldset>

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary accent-primary focus-visible:ring-primary"
          />
          <span className="text-sm text-white/70">Post anonymously</span>
        </label>

        <p className="mt-3 text-xs text-white/60">
          Your prayer will be shared with the community. Be kind and respectful.
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!isOnline || !content.trim() || content.length > PRAYER_POST_MAX_LENGTH}
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Submit Prayer Request
          </Button>
        </div>

        <div className="mt-2">
          <CharacterCount
            current={content.length}
            max={1000}
            warningAt={800}
            dangerAt={960}
            visibleAt={500}
            id="composer-char-count"
          />
        </div>

        {crisisDetected && (
          <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
            <p className="mb-2 text-sm font-semibold text-danger">
              It sounds like you may be going through a difficult time.
            </p>
            <p className="mb-3 text-sm text-white/90">
              If you or someone you know is in crisis, please reach out for help:
            </p>
            <ul className="space-y-1 text-sm text-white/90">
              <li>
                <strong>{CRISIS_RESOURCES.suicide_prevention.name}:</strong>{' '}
                <a
                  href={`tel:${CRISIS_RESOURCES.suicide_prevention.phone}`}
                  className="font-medium text-primary underline"
                >
                  {CRISIS_RESOURCES.suicide_prevention.phone}
                </a>
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.crisis_text.name}:</strong>{' '}
                {CRISIS_RESOURCES.crisis_text.text}
              </li>
              <li>
                <strong>{CRISIS_RESOURCES.samhsa.name}:</strong>{' '}
                <a
                  href={`tel:${CRISIS_RESOURCES.samhsa.phone}`}
                  className="font-medium text-primary underline"
                >
                  {CRISIS_RESOURCES.samhsa.phone}
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
      <UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />
    </div>
  )
}
