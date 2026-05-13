import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, Heart, LayoutDashboard, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { PrayerWallHero } from '@/components/prayer-wall/PrayerWallHero'
import { NightWatchChip } from '@/components/prayer-wall/NightWatchChip'
import { useNightMode } from '@/hooks/useNightMode'
import { getNightModeCopy } from '@/constants/night-mode-copy'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { PrayerReceipt } from '@/components/prayer-wall/PrayerReceipt'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { SaveToPrayersForm } from '@/components/prayer-wall/SaveToPrayersForm'
import { InlineComposer } from '@/components/prayer-wall/InlineComposer'
import { ComposerChooser } from '@/components/prayer-wall/ComposerChooser'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { CategoryFilterBar } from '@/components/prayer-wall/CategoryFilterBar'
import { RoomSelector } from '@/components/prayer-wall/RoomSelector'
import { QuestionOfTheDay } from '@/components/prayer-wall/QuestionOfTheDay'
import { QotdComposer } from '@/components/prayer-wall/QotdComposer'
import { Button } from '@/components/ui/Button'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { PrayerWallSkeleton } from '@/components/skeletons/PrayerWallSkeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { ApiError } from '@/types/auth'
import { mapApiErrorToToast, AnonymousWriteAttemptError } from '@/lib/prayer-wall/apiErrors'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { setGettingStartedFlag, isGettingStartedComplete } from '@/services/getting-started-storage'
import {
  isValidCategory,
  PRAYER_CATEGORIES,
  CATEGORY_LABELS,
  type PrayerCategory,
} from '@/constants/prayer-categories'
import { getTodaysQuestion } from '@/constants/question-of-the-day'
import { SEO, SITE_URL } from '@/components/SEO'
import { PRAYER_WALL_METADATA } from '@/lib/seo/routeMetadata'
import { getActiveChallengeInfo } from '@/lib/challenge-calendar'
const prayerWallBreadcrumbs = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Prayer Wall' },
  ],
}
import { getChallenge } from '@/data/challenges'
import type { PrayerRequest, PrayerComment } from '@/types/prayer-wall'
import { isValidPostType, getPostType, type PostType } from '@/constants/post-types'

const PRAYERS_PER_PAGE = 20

// Spec 4.3 — per-type lookup maps for success-toast and auth-modal CTA copy.
// Other 4 types currently default to prayer_request strings; 4.4–4.6 will tune.
// Module-level so they're stable across renders and don't require useCallback deps.
const successToastByType: Record<PostType, string> = {
  prayer_request: 'Your prayer is on the wall. Others can now lift it up.',
  testimony: 'Your testimony is on the wall. Others can rejoice with you.',
  question: 'Your question is on the wall. Others can weigh in.',
  discussion: 'Your discussion is on the wall. Others can think it through with you.',
  encouragement: 'Your encouragement is on the wall. It will fade gently in 24 hours.',
}

const authModalCtaByType: Record<PostType, string> = {
  prayer_request: 'Sign in to share a prayer request',
  testimony: 'Sign in to share a testimony',
  question: 'Sign in to ask a question',
  discussion: 'Sign in to start a discussion',
  encouragement: 'Sign in to send encouragement',
}

function PrayerWallContent() {
  const { isAuthenticated, user } = useAuth()
  const { showToast, showCelebrationToast } = useToast()
  const { recordActivity } = useFaithPoints()
  const authModal = useAuthModal()
  const openAuthModal = authModal?.openAuthModal
  // Spec 6.3 — Night Mode (active state + source for chip aria-label).
  const { active: nightActive, source: nightSource } = useNightMode()
  const allPrayers = useMemo(() => getMockPrayers(), [])

  // Flag-on uses initial empty state populated by the load effect; flag-off
  // populates synchronously from mock data.
  const [prayers, setPrayers] = useState<PrayerRequest[]>(() =>
    isBackendPrayerWallEnabled() ? [] : allPrayers.slice(0, PRAYERS_PER_PAGE)
  )
  const [isLoading, setIsLoading] = useState<boolean>(() => isBackendPrayerWallEnabled())
  const [fetchError, setFetchError] = useState<{
    message: string
    severity: 'error' | 'warning' | 'info'
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreFromServer, setHasMoreFromServer] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  // Per-prayer comment cache populated lazily on expand (flag-on only).
  const [fetchedComments, setFetchedComments] = useState<Record<string, PrayerComment[]>>({})
  const fetchingCommentsRef = useRef<Set<string>>(new Set())
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const { openSet: openComments, toggle: rawToggleComments } = useOpenSet()
  const [composerOpen, setComposerOpen] = useState(false)
  // 4.7 — Composer Chooser state
  const [chooserOpen, setChooserOpen] = useState(false)
  const [chosenPostType, setChosenPostType] = useState<PostType>('prayer_request')
  const [localComments, setLocalComments] = useState<Record<string, PrayerComment[]>>({})
  const [saveFormOpen, setSaveFormOpen] = useState<string | null>(null)
  const [savedPrayers, setSavedPrayers] = useState<Set<string>>(new Set())

  // QOTD state
  const todaysQuestion = useMemo(() => getTodaysQuestion(), [])
  const [qotdComposerOpen, setQotdComposerOpen] = useState(false)
  const firstQotdResponseRef = useRef<HTMLDivElement>(null)

  // Category filter via URL params
  const [searchParams, setSearchParams] = useSearchParams()
  const rawCategory = searchParams.get('category')
  const activeCategory: PrayerCategory | null = isValidCategory(rawCategory) ? rawCategory : null
  const rawPostType = searchParams.get('postType')
  const activePostType: PostType | null = isValidPostType(rawPostType) ? rawPostType : null

  // Challenge filter — computed once (pure functions, stable across renders)
  const activeChallenge = useMemo(() => {
    const info = getActiveChallengeInfo()
    return info ? (getChallenge(info.challengeId) ?? null) : null
  }, [])
  const challengeFilter = useMemo(
    () =>
      activeChallenge
        ? {
            id: activeChallenge.id,
            title: activeChallenge.title.split(':')[0],
            color: activeChallenge.themeColor,
          }
        : null,
    [activeChallenge]
  )
  const [isChallengeFilterActive, setIsChallengeFilterActive] = useState(
    () => searchParams.get('filter') === 'challenge'
  )
  const handleToggleChallengeFilter = useCallback(() => {
    setIsChallengeFilterActive((prev) => !prev)
  }, [])

  const filteredPrayers = useMemo(() => {
    // Flag-on: server-side filtering already applied via listPosts params.
    if (isBackendPrayerWallEnabled()) {
      if (isChallengeFilterActive && activeChallenge) {
        return prayers.filter((p) => p.challengeId === activeChallenge.id)
      }
      return prayers
    }
    // Flag-off: client-side filtering against the full mock set.
    if (isChallengeFilterActive && activeChallenge) {
      return allPrayers.filter((p) => p.challengeId === activeChallenge.id)
    }
    if (!activeCategory && !activePostType) return prayers
    let filtered: PrayerRequest[] = allPrayers
    if (activePostType) {
      filtered = filtered.filter((p) => p.postType === activePostType)
    }
    if (activeCategory) {
      filtered = filtered.filter((p) => p.category === activeCategory)
    }
    return filtered
  }, [
    allPrayers,
    prayers,
    activeCategory,
    activePostType,
    isChallengeFilterActive,
    activeChallenge,
  ])

  const firstQotdResponseIndex = useMemo(
    () => filteredPrayers.findIndex((p) => p.qotdId === todaysQuestion.id),
    [filteredPrayers, todaysQuestion.id]
  )

  const { containerRef: prayerListRef, getStaggerProps: getPrayerStaggerProps } =
    useStaggeredEntrance({ staggerDelay: 50, itemCount: filteredPrayers.length })

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<PrayerCategory, number>
    for (const cat of PRAYER_CATEGORIES) counts[cat] = 0
    for (const p of allPrayers) {
      if (p.category) counts[p.category]++
    }
    return counts
  }, [allPrayers])

  // Spec 4.8 D11 — empty-state heading adapts to combined filter state.
  const emptyHeading = useMemo(() => {
    if (activePostType && activeCategory) {
      return `No ${getPostType(activePostType).pluralLabel} in ${CATEGORY_LABELS[activeCategory]} yet`
    }
    if (activePostType) {
      return `No ${getPostType(activePostType).pluralLabel} yet`
    }
    if (activeCategory) {
      return `No prayers in ${CATEGORY_LABELS[activeCategory]} yet`
    }
    return 'This space is for you'
  }, [activePostType, activeCategory])

  // Functional-callback form preserves other params (e.g. ?postType=) when
  // toggling category. Spec 4.8 D4 — filter independence.
  const handleSelectCategory = useCallback(
    (category: PrayerCategory | null) => {
      setSearchParams(
        (prev) => {
          if (category) {
            prev.set('category', category)
          } else {
            prev.delete('category')
          }
          return prev
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const handleSelectPostType = useCallback(
    (postType: PostType | null) => {
      setSearchParams(
        (prev) => {
          if (postType) {
            prev.set('postType', postType)
          } else {
            prev.delete('postType')
          }
          return prev
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // Sticky filter bar sentinel
  const filterSentinelRef = useRef<HTMLDivElement>(null)
  const [isFilterSticky, setIsFilterSticky] = useState(false)

  useEffect(() => {
    const sentinel = filterSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsFilterSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Getting Started checklist: flag prayer wall visit
  useEffect(() => {
    if (isAuthenticated && !isGettingStartedComplete()) {
      setGettingStartedFlag('prayer_wall_visited', true)
    }
  }, [isAuthenticated])

  // 4.7 — Defensive guard: chooser is never rendered to unauthenticated users.
  useEffect(() => {
    if (!isAuthenticated && chooserOpen) {
      setChooserOpen(false)
    }
  }, [isAuthenticated, chooserOpen])

  // Tooltip for composer
  const composerRef = useRef<HTMLDivElement>(null)
  const composerTooltip = useTooltipCallout('prayer-wall-composer', composerRef)

  // Ceremony toast timeouts — cleaned up on unmount and rapid toggle
  const ceremonyTimeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      ceremonyTimeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  // Initial load: flag-off uses synchronous mock slice; flag-on fetches from backend.
  // Refetches only when the server-side filter (category) or retry trigger changes.
  // Challenge filter is applied client-side in `filteredPrayers`, so it does NOT
  // belong in the deps — including it would cause a wasted refetch + skeleton
  // flash whenever the user toggles the challenge pill.
  useEffect(() => {
    if (!isBackendPrayerWallEnabled()) {
      // Flag-off branch — keep mock-data initialization and let the synchronous
      // useState initializer + filteredPrayers handle filtering.
      return
    }
    let cancelled = false
    async function loadInitial() {
      setIsLoading(true)
      setFetchError(null)
      try {
        const result = await prayerWallApi.listPosts({
          page: 1,
          limit: PRAYERS_PER_PAGE,
          category: activeCategory ?? undefined,
          postType: activePostType ?? undefined,
          sort: 'bumped',
        })
        if (cancelled) return
        setPrayers(result.posts)
        setHasMoreFromServer(result.pagination.hasMore)
        setCurrentPage(1)
        // Drop both comment caches on a feed refetch — stale comment lists
        // for posts that may no longer be in the loaded set are not useful.
        setFetchedComments({})
        setLocalComments({})
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setFetchError(mapApiErrorToToast(err))
        } else {
          setFetchError({
            message: 'Something went wrong. Try again in a moment.',
            severity: 'error',
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadInitial()
    return () => {
      cancelled = true
    }
  }, [activeCategory, activePostType, reloadTrigger])

  const hasMore = isBackendPrayerWallEnabled()
    ? hasMoreFromServer
    : prayers.length < allPrayers.length

  const loadMore = useCallback(async () => {
    if (!isBackendPrayerWallEnabled()) {
      setPrayers((prev) => allPrayers.slice(0, prev.length + PRAYERS_PER_PAGE))
      return
    }
    setIsLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const result = await prayerWallApi.listPosts({
        page: nextPage,
        limit: PRAYERS_PER_PAGE,
        category: activeCategory ?? undefined,
        postType: activePostType ?? undefined,
        sort: 'bumped',
      })
      setPrayers((prev) => [...prev, ...result.posts])
      setHasMoreFromServer(result.pagination.hasMore)
      setCurrentPage(nextPage)
    } catch (err) {
      if (err instanceof ApiError) {
        const descriptor = mapApiErrorToToast(err)
        if (descriptor.message) showToast(descriptor.message)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [allPrayers, currentPage, activeCategory, activePostType, showToast])

  const handleComposerSubmit = useCallback(
    async (
      content: string,
      isAnonymous: boolean,
      category: PrayerCategory | null,
      challengeId?: string,
      idempotencyKey?: string,
      postType: PostType = 'prayer_request',
      scriptureReference?: string | null,
      scriptureText?: string | null,
      // Spec 4.6b — image-claim parameters. Both null when no image attached.
      imageUploadId?: string | null,
      imageAltText?: string | null,
    ): Promise<boolean> => {
      if (!isAuthenticated) {
        openAuthModal?.(authModalCtaByType[postType])
        return false
      }
      if (!isBackendPrayerWallEnabled()) {
        const newPrayer: PrayerRequest = {
          id: `prayer-new-${Date.now()}`,
          userId: isAnonymous ? null : (user?.id ?? null),
          authorName: isAnonymous ? 'Anonymous' : (user?.name ?? 'You'),
          authorAvatarUrl: null,
          isAnonymous,
          content,
          category,
          postType,
          challengeId,
          isAnswered: false,
          answeredText: null,
          answeredAt: null,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          prayingCount: 0,
          commentCount: 0,
          // Spec 4.5 — persist scripture pair on the mock object so the
          // ScriptureChip renders for newly-posted discussions in flag-off mode.
          ...(scriptureReference && scriptureText
            ? { scriptureReference, scriptureText }
            : {}),
        }
        setPrayers((prev) => [newPrayer, ...prev])
        setComposerOpen(false)
        recordActivity('prayerWall', 'prayer_wall')
        const badgeData = getBadgeData()
        saveBadgeData({
          ...badgeData,
          activityCounts: {
            ...badgeData.activityCounts,
            prayerWallPosts: badgeData.activityCounts.prayerWallPosts + 1,
          },
        })
        showToast(successToastByType[postType])
        return true
      }
      try {
        const created = await prayerWallApi.createPost(
          {
            postType,
            content,
            category,
            isAnonymous,
            challengeId: challengeId ?? null,
            // Spec 4.5 — thread scripture pair through to backend. Backend's
            // PostService validates that both are present or both are null
            // (InvalidScripturePairException). InlineComposer's onChange
            // contract guarantees this invariant.
            scriptureReference: scriptureReference ?? null,
            scriptureText: scriptureText ?? null,
            // Spec 4.6b — image-claim. Backend MOVEs the pending upload from
            // posts/pending/{userId}/{uploadId}/ to posts/{postId}/ as part
            // of the same transaction. InlineComposer guarantees imageAltText
            // is non-blank when imageUploadId is set (submit-disabled rule).
            imageUploadId: imageUploadId ?? null,
            imageAltText: imageAltText ?? null,
          },
          idempotencyKey
        )
        setPrayers((prev) => [created, ...prev])
        setComposerOpen(false)
        recordActivity('prayerWall', 'prayer_wall')
        const badgeData = getBadgeData()
        saveBadgeData({
          ...badgeData,
          activityCounts: {
            ...badgeData.activityCounts,
            prayerWallPosts: badgeData.activityCounts.prayerWallPosts + 1,
          },
        })
        showToast(successToastByType[postType])
        return true
      } catch (err) {
        if (err instanceof AnonymousWriteAttemptError) {
          openAuthModal?.(authModalCtaByType[postType])
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [user, isAuthenticated, showToast, recordActivity, openAuthModal]
  )

  // QOTD response count.
  // Flag-on: derived from currently-loaded server posts (approximate; full count
  //   would need a dedicated server endpoint, deferred to a future spec).
  // Flag-off: count across allPrayers + any new locally-added prayers.
  const qotdResponseCount = useMemo(() => {
    if (isBackendPrayerWallEnabled()) {
      return prayers.filter((p) => p.qotdId === todaysQuestion.id).length
    }
    return (
      allPrayers.filter((p) => p.qotdId === todaysQuestion.id).length +
      prayers.filter(
        (p) => p.qotdId === todaysQuestion.id && !allPrayers.some((a) => a.id === p.id)
      ).length
    )
  }, [allPrayers, prayers, todaysQuestion.id])

  // QOTD composer toggle with auth gating
  const handleToggleQotdComposer = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal?.('Sign in to share your thoughts')
      return
    }
    setQotdComposerOpen((prev) => !prev)
  }, [isAuthenticated, openAuthModal])

  // QOTD response submission
  const handleQotdSubmit = useCallback(
    async (content: string, idempotencyKey?: string): Promise<boolean> => {
      if (!isAuthenticated) {
        openAuthModal?.('Sign in to share your thoughts')
        return false
      }
      if (!isBackendPrayerWallEnabled()) {
        const newResponse: PrayerRequest = {
          id: `prayer-qotd-${Date.now()}`,
          userId: user?.id ?? null,
          authorName: user?.name ?? 'You',
          authorAvatarUrl: null,
          isAnonymous: false,
          content,
          category: 'discussion',
          postType: 'discussion',
          qotdId: todaysQuestion.id,
          isAnswered: false,
          answeredText: null,
          answeredAt: null,
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          prayingCount: 0,
          commentCount: 0,
        }
        setPrayers((prev) => [newResponse, ...prev])
        setQotdComposerOpen(false)
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Your response has been shared.')
        return true
      }
      try {
        const created = await prayerWallApi.createPost(
          {
            postType: 'discussion',
            content,
            category: 'discussion',
            qotdId: todaysQuestion.id,
            isAnonymous: false,
          },
          idempotencyKey
        )
        setPrayers((prev) => [created, ...prev])
        setQotdComposerOpen(false)
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Your response has been shared.')
        return true
      } catch (err) {
        if (err instanceof AnonymousWriteAttemptError) {
          openAuthModal?.('Sign in to share your thoughts')
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [isAuthenticated, user, todaysQuestion.id, recordActivity, showToast, openAuthModal]
  )

  // Scroll to first QOTD response
  const handleScrollToQotdResponses = useCallback(() => {
    if (qotdResponseCount === 0) {
      handleToggleQotdComposer()
      return
    }
    firstQotdResponseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [qotdResponseCount, handleToggleQotdComposer])

  const handleTogglePraying = useCallback(
    (prayerId: string) => {
      // Clear any pending ceremony timeouts (rapid toggle protection)
      ceremonyTimeoutRefs.current.forEach(clearTimeout)
      ceremonyTimeoutRefs.current = []

      const wasPraying = togglePraying(prayerId)
      if (!wasPraying) {
        recordActivity('prayerWall', 'prayer_wall')

        // Only count as intercession if not praying for own prayer
        const prayer = prayers.find((p) => p.id === prayerId)
        if (prayer?.userId !== user?.id) {
          const badgeData = getBadgeData()
          saveBadgeData({
            ...badgeData,
            activityCounts: {
              ...badgeData.activityCounts,
              intercessionCount: badgeData.activityCounts.intercessionCount + 1,
            },
          })
        }

        // Success toast after 600ms ceremony
        const successTimeout = setTimeout(() => {
          showToast('Your prayer has been lifted up')
        }, 600)
        ceremonyTimeoutRefs.current.push(successTimeout)

        // Author notification: check if prayer author is the logged-in user
        if (prayer?.userId && prayer.userId === user?.id) {
          const authorTimeout = setTimeout(() => {
            showCelebrationToast('', '\u{1F64F} Someone is praying for your request', 'celebration')
          }, 800)
          ceremonyTimeoutRefs.current.push(authorTimeout)
        }
      }
      // No toast on untoggle

      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId ? { ...p, prayingCount: p.prayingCount + (wasPraying ? -1 : 1) } : p
        )
      )
    },
    [togglePraying, recordActivity, showToast, showCelebrationToast, prayers, user]
  )

  // Wraps useOpenSet's toggle so that, in flag-on mode, expanding a comments
  // section fires a one-time backend fetch to populate the comment list. The
  // result is cached in `fetchedComments` so collapse-and-re-expand reuses it
  // and only mutations (new comment) invalidate the cache.
  //
  // When the backend response lands, drop any optimistic comments held in
  // `localComments[prayerId]` for this prayer — the backend list is the source
  // of truth at that point and already includes the comment(s) the user just
  // created. Without this clear, the render `[...local, ...fetched]` would
  // double-render any comment the user posted before first expanding the
  // section.
  const handleToggleComments = useCallback(
    (prayerId: string) => {
      const wasOpen = openComments.has(prayerId)
      rawToggleComments(prayerId)
      if (wasOpen || !isBackendPrayerWallEnabled()) return
      if (prayerId in fetchedComments) return
      if (fetchingCommentsRef.current.has(prayerId)) return
      fetchingCommentsRef.current.add(prayerId)
      prayerWallApi
        .listComments(prayerId, { page: 1, limit: 50 })
        .then((result) => {
          setFetchedComments((prev) => ({ ...prev, [prayerId]: result.comments }))
          setLocalComments((prev) => {
            if (!(prayerId in prev)) return prev
            const next = { ...prev }
            delete next[prayerId]
            return next
          })
        })
        .catch((err) => {
          if (err instanceof ApiError) {
            const descriptor = mapApiErrorToToast(err)
            if (descriptor.message) showToast(descriptor.message)
          }
        })
        .finally(() => {
          fetchingCommentsRef.current.delete(prayerId)
        })
    },
    [openComments, rawToggleComments, fetchedComments, showToast]
  )

  const handleSubmitComment = useCallback(
    async (prayerId: string, content: string, idempotencyKey?: string): Promise<boolean> => {
      if (!isAuthenticated) {
        openAuthModal?.('Sign in to comment')
        return false
      }
      if (!isBackendPrayerWallEnabled()) {
        const newComment: PrayerComment = {
          id: `comment-local-${Date.now()}`,
          prayerId,
          userId: user?.id ?? 'anonymous',
          authorName: user?.name ?? 'You',
          authorAvatarUrl: null,
          content,
          createdAt: new Date().toISOString(),
        }
        setLocalComments((prev) => ({
          ...prev,
          [prayerId]: [newComment, ...(prev[prayerId] ?? [])],
        }))
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId
              ? {
                  ...p,
                  commentCount: p.commentCount + 1,
                  lastActivityAt: new Date().toISOString(),
                }
              : p
          )
        )
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Comment shared.')
        return true
      }
      try {
        const newComment = await prayerWallApi.createComment(prayerId, content, idempotencyKey)
        // If the comments section was already expanded once (and we therefore
        // have a fetched cache for this prayer), append to fetched. Otherwise
        // hold the comment in localComments until the user expands and the
        // lazy fetch lands — at which point handleToggleComments clears local.
        if (prayerId in fetchedComments) {
          setFetchedComments((prev) => ({
            ...prev,
            [prayerId]: [...(prev[prayerId] ?? []), newComment],
          }))
        } else {
          setLocalComments((prev) => ({
            ...prev,
            [prayerId]: [newComment, ...(prev[prayerId] ?? [])],
          }))
        }
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId
              ? {
                  ...p,
                  commentCount: p.commentCount + 1,
                  lastActivityAt: new Date().toISOString(),
                }
              : p
          )
        )
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Comment shared.')
        return true
      } catch (err) {
        if (err instanceof AnonymousWriteAttemptError) {
          openAuthModal?.('Sign in to comment')
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [isAuthenticated, showToast, user, recordActivity, openAuthModal, fetchedComments]
  )

  /**
   * Spec 4.4 — Mark a comment helpful on a question post (post-author-only at the
   * UI level; backend enforces strictly). Optimistic update with exact-state
   * rollback (W15) — captures the prior `questionResolvedCommentId` BEFORE
   * mutating, restores that exact value on backend failure (NOT all-set-to-false).
   */
  const handleResolve = useCallback(
    async (postId: string, commentId: string): Promise<void> => {
      if (!isAuthenticated) {
        openAuthModal?.('Sign in to mark a comment as helpful')
        return
      }

      // Capture prior state for rollback.
      const targetPrayer = prayers.find((p) => p.id === postId)
      const previousHelpfulCommentId = targetPrayer?.questionResolvedCommentId

      const applyOptimistic = (newHelpfulId: string | undefined) => {
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, questionResolvedCommentId: newHelpfulId } : p,
          ),
        )
        const updateComments = (prev: Record<string, PrayerComment[]>) => {
          const list = prev[postId] ?? []
          return {
            ...prev,
            [postId]: list.map((c) => ({ ...c, isHelpful: c.id === newHelpfulId })),
          }
        }
        setLocalComments(updateComments)
        setFetchedComments(updateComments)
      }

      applyOptimistic(commentId)

      if (!isBackendPrayerWallEnabled()) {
        // Flag-off — optimistic update is the entire change. No backend call.
        return
      }

      try {
        await prayerWallApi.resolveQuestion(postId, commentId)
      } catch (err) {
        // Rollback to the EXACT prior state, not all-set-to-false (W15).
        applyOptimistic(previousHelpfulCommentId)
        if (err instanceof AnonymousWriteAttemptError) {
          openAuthModal?.('Sign in to mark a comment as helpful')
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        } else {
          showToast('Could not mark as helpful. Try again.')
        }
      }
    },
    [isAuthenticated, openAuthModal, prayers, showToast],
  )

  return (
    <BackgroundCanvas
      className="flex min-h-screen flex-col font-sans"
      nightMode={nightActive ? 'on' : 'off'}
    >
      {nightActive ? (
        // Spec 6.3 — only override SEO title at night; day-state stays on the
        // canonical PRAYER_WALL_METADATA suffixed title. `noSuffix` because the
        // night copy already includes "Worship Room" in the string.
        <SEO
          {...PRAYER_WALL_METADATA}
          title={getNightModeCopy('pageTitle', true)}
          noSuffix
          jsonLd={prayerWallBreadcrumbs}
        />
      ) : (
        <SEO {...PRAYER_WALL_METADATA} jsonLd={prayerWallBreadcrumbs} />
      )}
      <Navbar transparent />
      <PrayerWallHero
        subtitle={getNightModeCopy('heroSubtitle', nightActive)}
        nightWatchChip={
          nightActive ? <NightWatchChip source={nightSource} /> : null
        }
        action={
          isAuthenticated ? (
            <div
              ref={composerRef}
              className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
              {...(composerTooltip.shouldShow
                ? { 'aria-describedby': 'prayer-wall-composer' }
                : {})}
            >
              <Button
                variant="subtle"
                size="lg"
                onClick={() => setChooserOpen(true)}
                aria-label={
                  nightActive
                    ? getNightModeCopy('composeFabTooltip', true)
                    : undefined
                }
              >
                Share something
              </Button>
              <Link
                to="/prayer-wall/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                My Dashboard
              </Link>
            </div>
          ) : (
            <Button
              variant="subtle"
              size="lg"
              onClick={() => openAuthModal?.('Sign in to share something')}
              aria-label={
                nightActive
                  ? getNightModeCopy('composeFabTooltip', true)
                  : undefined
              }
            >
              Share something
            </Button>
          )
        }
      />

      <main id="main-content" className="mx-auto w-full max-w-[720px] flex-1 px-4 py-6 sm:py-8">
        {isLoading ? (
          <PrayerWallSkeleton />
        ) : fetchError ? (
          <FeatureEmptyState
            icon={AlertCircle}
            heading="We couldn't load prayers"
            description={fetchError.message}
            ctaLabel="Try again"
            onCtaClick={() => {
              setFetchError(null)
              setReloadTrigger((n) => n + 1)
            }}
          />
        ) : (
          <>
            {/* 4.7 — Composer Chooser (only mounted while open) */}
            {chooserOpen && (
              <ComposerChooser
                isOpen={chooserOpen}
                onClose={() => setChooserOpen(false)}
                onSelect={(postType) => {
                  setChosenPostType(postType)
                  setChooserOpen(false)
                  setComposerOpen(true)
                }}
              />
            )}
            <InlineComposer
              isOpen={composerOpen}
              onClose={() => setComposerOpen(false)}
              postType={chosenPostType}
              onSubmit={handleComposerSubmit}
            />

            {/* QOTD Card — above filters, visible in any filter state */}
            <div className="mb-4">
              <QuestionOfTheDay
                responseCount={qotdResponseCount}
                isComposerOpen={qotdComposerOpen}
                onToggleComposer={handleToggleQotdComposer}
                onScrollToResponses={handleScrollToQotdResponses}
              />
              <QotdComposer
                isOpen={qotdComposerOpen}
                onClose={() => setQotdComposerOpen(false)}
                onSubmit={handleQotdSubmit}
              />
            </div>

            {/* Sentinel for sticky filter bar */}
            <div ref={filterSentinelRef} aria-hidden="true" />

            {/* Sticky Filter Bar — RoomSelector + CategoryFilterBar together (Spec 4.8) */}
            <div
              className={cn(
                'sticky top-0 z-30 transition-shadow motion-reduce:transition-none',
                isFilterSticky && 'shadow-md'
              )}
            >
              <RoomSelector
                activePostType={activePostType}
                onSelectPostType={handleSelectPostType}
              />
              <CategoryFilterBar
                activeCategory={activeCategory}
                onSelectCategory={handleSelectCategory}
                categoryCounts={categoryCounts}
                showCounts={activeCategory !== null}
                challengeFilter={challengeFilter}
                isChallengeFilterActive={isChallengeFilterActive}
                onToggleChallengeFilter={handleToggleChallengeFilter}
              />
            </div>

            {/* Screen reader announcement for filter changes */}
            <div className="sr-only" aria-live="polite">
              {isChallengeFilterActive && challengeFilter
                ? `Showing ${filteredPrayers.length} ${challengeFilter.title} challenge prayers`
                : activePostType && activeCategory
                  ? `Showing ${filteredPrayers.length} ${getPostType(activePostType).pluralLabel} in ${CATEGORY_LABELS[activeCategory]}`
                  : activePostType
                    ? `Showing ${filteredPrayers.length} ${getPostType(activePostType).pluralLabel}`
                    : activeCategory
                      ? `Showing ${filteredPrayers.length} ${CATEGORY_LABELS[activeCategory]} prayers`
                      : `Showing all ${allPrayers.length} prayers`}
            </div>

            {/* Prayer cards feed */}
            <div className="flex flex-col gap-4" ref={prayerListRef}>
              {filteredPrayers.map((prayer, index) => {
                const isFirstQotd = index === firstQotdResponseIndex
                const stagger = getPrayerStaggerProps(index)
                return (
                  <div
                    key={prayer.id}
                    ref={isFirstQotd ? firstQotdResponseRef : undefined}
                    className={stagger.className}
                    style={stagger.style}
                  >
                    <PrayerCard prayer={prayer} index={index} onCategoryClick={handleSelectCategory}>
                      {/* Spec 6.1 — Prayer Receipt above InteractionBar. Internally
                          gates: only renders when viewer === author AND prayingCount > 0
                          AND settings.prayerWall.prayerReceiptsVisible. */}
                      {prayer.userId && (
                        <PrayerReceipt
                          postId={prayer.id}
                          postAuthorId={prayer.userId}
                          prayingCount={prayer.prayingCount ?? 0}
                          postExcerpt={prayer.content}
                        />
                      )}
                      <InteractionBar
                        prayer={prayer}
                        reactions={reactions[prayer.id]}
                        onTogglePraying={() => handleTogglePraying(prayer.id)}
                        onToggleComments={() => handleToggleComments(prayer.id)}
                        onToggleBookmark={() => toggleBookmark(prayer.id)}
                        isCommentsOpen={openComments.has(prayer.id)}
                        onToggleSave={() =>
                          setSaveFormOpen(saveFormOpen === prayer.id ? null : prayer.id)
                        }
                        isSaved={savedPrayers.has(prayer.id)}
                      />
                      <SaveToPrayersForm
                        prayerContent={prayer.content}
                        prayerCategory={prayer.category ?? undefined}
                        prayerId={prayer.id}
                        isOpen={saveFormOpen === prayer.id}
                        onSaved={() => {
                          setSavedPrayers((prev) => new Set(prev).add(prayer.id))
                          setSaveFormOpen(null)
                        }}
                        onCancel={() => setSaveFormOpen(null)}
                      />
                      {prayer.postType !== 'encouragement' && (
                        <CommentsSection
                          prayerId={prayer.id}
                          isOpen={openComments.has(prayer.id)}
                          comments={
                            isBackendPrayerWallEnabled()
                              ? [
                                  ...(localComments[prayer.id] ?? []),
                                  ...(fetchedComments[prayer.id] ?? []),
                                ]
                              : [...(localComments[prayer.id] ?? []), ...getMockComments(prayer.id)]
                          }
                          totalCount={prayer.commentCount}
                          onSubmitComment={handleSubmitComment}
                          prayerContent={prayer.content}
                          postType={prayer.postType}
                          postAuthorId={prayer.userId}
                          onResolve={(commentId) => handleResolve(prayer.id, commentId)}
                        />
                      )}
                    </PrayerCard>
                  </div>
                )
              })}
            </div>

            {/* Empty state for empty feed (no posts at all) */}
            {filteredPrayers.length === 0 && !activeCategory && !activePostType && (
              <FeatureEmptyState
                icon={Heart}
                heading={emptyHeading}
                description={
                  nightActive
                    ? getNightModeCopy('emptyFeedState', true)
                    : "Share what's on your heart, or simply pray for others."
                }
                ctaLabel="Share something"
                onCtaClick={() => {
                  if (isAuthenticated) {
                    setChooserOpen(true)
                  } else {
                    openAuthModal?.('Sign in to share something')
                  }
                }}
              />
            )}

            {/* Empty state for filtered views */}
            {filteredPrayers.length === 0 && (activeCategory || activePostType) && (
              <FeatureEmptyState
                icon={Search}
                heading={emptyHeading}
                description="Be the first to share."
                ctaLabel="Share something"
                onCtaClick={() => {
                  if (isAuthenticated) {
                    setChooserOpen(true)
                  } else {
                    openAuthModal?.('Sign in to share something')
                  }
                }}
              />
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  className="min-h-[44px]"
                  isLoading={isLoadingMore}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
      {composerTooltip.shouldShow && (
        <TooltipCallout
          targetRef={composerRef}
          message={TOOLTIP_DEFINITIONS['prayer-wall-composer'].message}
          tooltipId="prayer-wall-composer"
          position={TOOLTIP_DEFINITIONS['prayer-wall-composer'].position}
          onDismiss={composerTooltip.dismiss}
        />
      )}
    </BackgroundCanvas>
  )
}

// Loading state: use PrayerWallSkeleton
export function PrayerWall() {
  const { isOnline } = useOnlineStatus()

  if (!isOnline) {
    return (
      <OfflineNotice
        featureName="Prayer Wall"
        fallbackRoute="/daily"
        fallbackLabel="Go to Daily Hub"
      />
    )
  }

  return <PrayerWallContent />
}
