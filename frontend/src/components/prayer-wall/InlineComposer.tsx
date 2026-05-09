import { useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock } from 'lucide-react'
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
import { ScriptureReferenceInput } from './ScriptureReferenceInput'
import { ImageUpload } from './ImageUpload'

interface ComposerCopy {
  header: string
  /** Spec 4.4 — short subline rendered below the header. Currently set only
   * on `question` to soften the framing ("Other believers can share…"). */
  subline?: string
  placeholder: string
  ariaLabel: string
  submitButton: string
  footerNote: string
  showCategoryFieldset: boolean
  showChallengeCheckbox: boolean
  showAttributionNudge: boolean
  /** Spec 4.5 — when true, render <ScriptureReferenceInput> below the textarea.
   *  Currently set only on `discussion`. The field is OPTIONAL — composer submits
   *  successfully whether or not the user fills it in. */
  showScriptureReferenceField?: boolean
  /** Spec 4.6 — when explicitly false, the anonymous toggle is omitted from
   *  the DOM. Defaults to true (visible). Encouragement sets this to false. */
  showAnonymousToggle?: boolean
  /** Spec 4.6 — optional inline callout above the textarea (rose-tinted, with
   *  Clock icon). Encouragement uses this to communicate the 24-hour expiry. */
  expiryWarning?: string
  /** Spec 4.6 — auto-fills `category` at submit time, hiding the fieldset.
   *  Encouragement sets this to 'other'. Generalizes the discussion auto-fill. */
  submitsAsCategory?: PrayerCategory
  /** Spec 4.6b — when true, render <ImageUpload> below the textarea.
   *  Currently set on `testimony` and `question` only. */
  showImageUpload?: boolean
  /** Spec 4.6b — helper text below the "Add a photo" button. */
  imageUploadHelperText?: string
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
    // Spec 4.6b — testimony composer accepts an optional image attachment.
    showImageUpload: true,
    imageUploadHelperText: 'Add a photo if it tells the story.',
    minHeight: '180px',
  },
  question: {
    header: 'Ask a question',
    subline: 'Other believers can share their experience or scripture they have leaned on.',
    placeholder: 'What are you wondering about?',
    ariaLabel: 'Question',
    submitButton: 'Submit Question',
    footerNote: 'Your question will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAttributionNudge: false,
    // Spec 4.6b — question composer accepts an optional image attachment.
    showImageUpload: true,
    imageUploadHelperText: 'A photo can help others understand your question.',
    minHeight: '120px',
  },
  discussion: {
    header: 'Start a discussion',
    placeholder: 'What scripture or topic do you want to think through with others?',
    ariaLabel: 'Discussion',
    submitButton: 'Start Discussion',
    footerNote: 'Your discussion will be shared with the community. Be kind and respectful.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAttributionNudge: false,
    showScriptureReferenceField: true,
    minHeight: '160px', // D17 — between prayer_request 120 and testimony 180
  },
  encouragement: {
    header: 'Send encouragement',
    placeholder: 'A quick word of life. Anything that comes to mind.',
    ariaLabel: 'Encouragement',
    submitButton: 'Send Encouragement',
    footerNote: 'Your encouragement will be shared with the community. Be kind and respectful.',
    expiryWarning: 'Encouragements gently fade after 24 hours. Say what is on your heart and let it go.',
    showCategoryFieldset: false,
    showChallengeCheckbox: false,
    showAnonymousToggle: false,
    showAttributionNudge: false,
    showScriptureReferenceField: false,
    submitsAsCategory: 'other',
    minHeight: '100px',
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
    postType?: PostType,
    // Spec 4.5 — optional scripture pair. Composer guarantees both null or
    // both set (via ScriptureReferenceInput's onChange contract). Only populated
    // for postType === 'discussion' in 4.5; future post types may opt in.
    scriptureReference?: string | null,
    scriptureText?: string | null,
    // Spec 4.6b — optional image upload. When set, alt text is also non-blank
    // (composer enforces submit-disabled when uploadId is set without alt text).
    // Only populated for testimony / question post types.
    imageUploadId?: string | null,
    imageAltText?: string | null,
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
  // Spec 4.5 — scripture pair from <ScriptureReferenceInput>. Both null when
  // empty, invalid, or chapter-only; both set when a verse-level reference
  // resolved successfully. `scriptureFieldHasError` blocks submit on invalid
  // input (D12) — empty/chapter-only/valid all leave it `false`.
  const [scriptureRef, setScriptureRef] = useState<string | null>(null)
  const [scriptureText, setScriptureText] = useState<string | null>(null)
  const [scriptureFieldHasError, setScriptureFieldHasError] = useState(false)
  // Spec 4.6b — image upload state. uploadId is the server-generated UUID from
  // the prayerWallApi.uploadImage call; imageAltText is the user-supplied alt
  // text. Both are submitted on createPost; the backend MOVEs the pending
  // upload into posts/{postId}/ as part of the same transaction.
  const [imageUploadId, setImageUploadId] = useState<string | null>(null)
  const [imageAltText, setImageAltText] = useState<string>('')
  // Spec 4.5 — InlineComposer hides via aria-hidden/inert (line 310-311) rather
  // than unmounting on close, so child components retain their internal state
  // across open/close cycles. ScriptureReferenceInput is uncontrolled (owns its
  // own rawInput); without a forced remount, a previously-typed reference would
  // persist visually after submit/cancel while the parent's scriptureRef has
  // already been cleared, leading to a silent state desync where the next
  // submit ships with no scripture pair despite the user seeing one in the
  // field. Bumping this key on success/cancel discards the stale child instance.
  const [scriptureResetKey, setScriptureResetKey] = useState(0)
  const handleScriptureChange = useCallback(
    (ref: string | null, text: string | null) => {
      setScriptureRef(ref)
      setScriptureText(text)
    },
    [],
  )
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
    // D12 — submit is disabled at the button level when scripture is invalid;
    // this is a defensive check in case the user activates submit via keyboard.
    if (scriptureFieldHasError) return
    if (containsCrisisKeyword(content)) {
      setCrisisDetected(true)
      return
    }
    setIsSubmitting(true)
    try {
      // D15 — discussion auto-fills category since the fieldset is hidden.
      // Spec 4.6 generalized this via copy.submitsAsCategory ('other' for
      // encouragement). Backend's PostController VALID_CATEGORIES already
      // accepts 'discussion' (Phase 3) and 'other' (always).
      const effectiveCategory: PrayerCategory | null =
        copy.submitsAsCategory ??
        (postType === 'discussion'
          ? ('discussion' as PrayerCategory)
          : selectedCategory)
      // Spec 4.6 — defense-in-depth: encouragement never submits anonymous,
      // regardless of any leftover state. Backend rejects with
      // ANONYMOUS_NOT_ALLOWED (W10), but submit-time coercion catches the case
      // where postType changes after the user toggled the now-hidden anonymous
      // checkbox in another mode.
      const isAnonymousToSubmit = postType === 'encouragement' ? false : isAnonymous
      const success = await onSubmit(
        content.trim(),
        isAnonymousToSubmit,
        effectiveCategory,
        isChallengePrayer && activeChallenge ? activeChallenge.id : undefined,
        idempotencyKey,
        postType,
        scriptureRef,
        scriptureText,
        imageUploadId,
        imageUploadId ? imageAltText.trim() : null,
      )
      if (!success) return
      setContent('')
      setIsAnonymous(false)
      setSelectedCategory(null)
      setIsChallengePrayer(false)
      setShowCategoryError(false)
      setCrisisDetected(false)
      setScriptureRef(null)
      setScriptureText(null)
      setScriptureFieldHasError(false)
      setScriptureResetKey((k) => k + 1)
      setImageUploadId(null)
      setImageAltText('')
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
    copy.showCategoryFieldset,
    copy.submitsAsCategory,
    scriptureRef,
    scriptureText,
    scriptureFieldHasError,
    imageUploadId,
    imageAltText,
  ])

  const handleCancel = useCallback(() => {
    setContent('')
    setIsAnonymous(false)
    setSelectedCategory(null)
    setIsChallengePrayer(false)
    setShowCategoryError(false)
    setScriptureRef(null)
    setScriptureText(null)
    setScriptureFieldHasError(false)
    setScriptureResetKey((k) => k + 1)
    setImageUploadId(null)
    setImageAltText('')
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
        <h2
          className={cn(
            'text-lg font-semibold text-white',
            copy.subline ? 'mb-1' : 'mb-4',
          )}
        >
          {copy.header}
        </h2>
        {copy.subline && (
          <p className="mb-4 text-sm text-white/60">{copy.subline}</p>
        )}

        {!isOnline && (
          <OfflineMessage
            variant="light"
            message="Posting prayers requires an internet connection"
            className="mb-3 rounded-lg border border-white/10"
          />
        )}

        {copy.expiryWarning && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md bg-rose-500/10 p-3 text-xs text-rose-200/90"
            role="note"
          >
            <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <p>{copy.expiryWarning}</p>
          </div>
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

        {copy.showScriptureReferenceField && (
          <ScriptureReferenceInput
            key={scriptureResetKey}
            onChange={handleScriptureChange}
            onValidityChange={setScriptureFieldHasError}
          />
        )}

        {/* Spec 4.6b — image upload affordance for testimony / question composers. */}
        {copy.showImageUpload && (
          <ImageUpload
            onUploadSuccess={(id) => setImageUploadId(id)}
            onUploadRemoved={() => {
              setImageUploadId(null)
              setImageAltText('')
            }}
            altText={imageAltText}
            onAltTextChange={setImageAltText}
            helperText={copy.imageUploadHelperText}
          />
        )}

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

        {copy.showAnonymousToggle !== false && (
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.06] text-primary accent-primary focus-visible:ring-primary"
            />
            <span className="text-sm text-white/70">Post anonymously</span>
          </label>
        )}

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
            disabled={
              !isOnline ||
              !content.trim() ||
              content.length > limits.max ||
              scriptureFieldHasError ||
              // Spec 4.6b — when an image is attached, alt text is required.
              (imageUploadId !== null && imageAltText.trim().length === 0)
            }
            onClick={handleSubmit}
            isLoading={isSubmitting}
            title={
              scriptureFieldHasError
                ? 'Fix the scripture reference or clear the field to continue.'
                : imageUploadId !== null && imageAltText.trim().length === 0
                ? 'Add a description of the image so screen readers can announce it.'
                : undefined
            }
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
