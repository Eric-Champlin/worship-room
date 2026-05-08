import { useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { containsCrisisKeyword, CRISIS_RESOURCES } from '@/constants/crisis-resources'
import { POST_TYPE_LIMITS } from '@/constants/content-limits'
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
import type { PostType } from '@/constants/post-types'

interface ComposerCopy {
  header: string
  placeholder: string
  ariaLabel: string
  submitButton: string
  footerNote: string
  showCategoryFieldset: boolean
  showChallengeCheckbox: boolean
  showAttributionNudge: boolean
  minHeight: string
}

// Spec 4.3 — per-type composer copy. testimony differs from prayer_request in
// header, placeholder, submit-button label, footer note, fieldset/checkbox
// visibility, attribution nudge, and minHeight. The other 4 types are
// placeholders matching prayer_request defaults until 4.4–4.6 ship.
const composerCopyByType: Record<PostType, ComposerCopy> = {
  prayer_request: {
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
    minHeight: '120px',
  },
  testimony: {
    header: 'Share a testimony',
    placeholder: 'What has God done?',
    ariaLabel: 'Testimony',
    submitButton: 'Submit Testimony',
    footerNote: 'Your testimony will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAttributionNudge: true,
    minHeight: '180px',
  },
  question: {
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
    minHeight: '120px',
  },
  discussion: {
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
    minHeight: '120px',
  },
  encouragement: {
    header: 'Share a Prayer Request',
    placeholder: "What's on your heart?",
    ariaLabel: 'Prayer request',
    submitButton: 'Submit Prayer Request',
    footerNote: 'Your prayer will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: true,
    showChallengeCheckbox: true,
    showAttributionNudge: false,
    minHeight: '120px',
  },
}

interface InlineComposerProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Post type for the composer. Defaults to 'prayer_request' so existing
   * call sites (Phase 4.2 — single composer instance) work without change.
   * Phase 4.7 Composer Chooser will pass other values for testimony/
   * question/discussion/encouragement variants.
   */
  postType?: PostType
  /**
   * Submit handler. Return `true` on successful create (composer resets);
   * return `false` to keep the current content and idempotency key so a
   * retry of the SAME content reuses the SAME key (W5 + Spec 3.5 backend
   * dedup contract).
   *
   * Phase 4.2 added `postType` as the 6th argument with default
   * `'prayer_request'` propagated from the prop. Existing handlers that
   * accept fewer args continue to work via TypeScript optional-arg rules.
   */
  onSubmit: (
    content: string,
    isAnonymous: boolean,
    category: PrayerCategory | null,
    challengeId?: string,
    idempotencyKey?: string,
    postType?: PostType
  ) => boolean | Promise<boolean>
}

export function InlineComposer({ isOpen, onClose, postType = 'prayer_request', onSubmit }: InlineComposerProps) {
  const copy = composerCopyByType[postType]
  const limits = POST_TYPE_LIMITS[postType]
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
    if (copy.showCategoryFieldset && !selectedCategory) {
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
        idempotencyKey,
        postType
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
    postType,
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
        'transition-all duration-base ease-standard motion-reduce:transition-none',
        isOpen
          ? // Spec 4.3 W19 — testimony composer can grow past 800px when crisis
            // resources render alongside long content. Use 1200px cap + internal
            // scroll so the submit button and footer stay reachable. prayer_request
            // keeps the original 800px cap (its content + required category fieldset
            // fits comfortably).
            postType === 'testimony'
            ? 'visible mb-4 max-h-[1200px] overflow-y-auto opacity-100'
            : 'visible mb-4 max-h-[800px] overflow-hidden opacity-100'
          : 'invisible max-h-0 overflow-hidden opacity-0'
      )}
      aria-hidden={!isOpen}
      {...(!isOpen && { inert: '' as unknown as string })}
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{copy.header}</h2>

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
          placeholder={copy.placeholder}
          maxLength={limits.max}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 leading-relaxed text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-cyan"
          style={{ minHeight: copy.minHeight }}
          aria-label={copy.ariaLabel}
          aria-invalid={content.length > limits.max ? 'true' : undefined}
          aria-describedby="composer-char-count"
        />

        {copy.showChallengeCheckbox && activeChallenge && (
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

        {copy.showCategoryFieldset && (
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
        )}

        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary accent-primary focus-visible:ring-primary"
          />
          <span className="text-sm text-white/70">Post anonymously</span>
        </label>

        {copy.showAttributionNudge && (
          <p className="mt-1.5 text-xs text-white/60">
            Testimonies often mean more when others know who they came from. Anonymous is welcome, too.
          </p>
        )}

        <p className="mt-3 text-xs text-white/60">{copy.footerNote}</p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!isOnline || !content.trim() || content.length > limits.max}
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {copy.submitButton}
          </Button>
        </div>

        <div className="mt-2">
          <CharacterCount
            current={content.length}
            max={limits.max}
            warningAt={limits.warningAt}
            dangerAt={limits.dangerAt}
            visibleAt={limits.visibleAt}
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
