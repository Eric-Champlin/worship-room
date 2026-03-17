import { useState, useEffect, useRef, useCallback, createElement } from 'react'
import { BADGE_MAP } from '@/constants/dashboard/badges'
import { getBadgeIcon } from '@/constants/dashboard/badge-icons'
import { useToast } from '@/components/ui/Toast'
import type { BadgeDefinition, CelebrationTier } from '@/types/dashboard'

// --- Types ---

export interface CelebrationQueueItem {
  badgeId: string
  badge: BadgeDefinition
  tier: CelebrationTier
}

interface UseCelebrationQueueOptions {
  newlyEarnedBadges: string[]
  clearNewlyEarnedBadges: () => void
}

interface UseCelebrationQueueReturn {
  currentCelebration: CelebrationQueueItem | null
  celebrationType: 'toast' | 'overlay' | null
  dismissCurrent: () => void
  isProcessing: boolean
}

// --- Tier priority for sorting ---

const TIER_PRIORITY: Record<CelebrationTier, number> = {
  toast: 0,
  'toast-confetti': 1,
  'special-toast': 2,
  'full-screen': 3,
}

// --- Map celebration tier to toast type ---

function tierToToastType(tier: CelebrationTier) {
  switch (tier) {
    case 'toast':
      return 'celebration' as const
    case 'toast-confetti':
      return 'celebration-confetti' as const
    case 'special-toast':
      return 'special-celebration' as const
    default:
      return 'celebration' as const
  }
}

// --- Hook ---

export function useCelebrationQueue({
  newlyEarnedBadges,
  clearNewlyEarnedBadges,
}: UseCelebrationQueueOptions): UseCelebrationQueueReturn {
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationQueueItem | null>(null)
  const [celebrationType, setCelebrationType] = useState<'toast' | 'overlay' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { showCelebrationToast } = useToast()
  const dismissResolveRef = useRef<(() => void) | null>(null)

  // Capture badge IDs in a ref so the queue survives StrictMode cleanup/re-run
  const badgesRef = useRef<string[]>(newlyEarnedBadges)
  const clearRef = useRef(clearNewlyEarnedBadges)
  clearRef.current = clearNewlyEarnedBadges

  // Dismiss current overlay and resolve the waiting promise
  const dismissCurrent = useCallback(() => {
    setCurrentCelebration(null)
    setCelebrationType(null)
    dismissResolveRef.current?.()
    dismissResolveRef.current = null
  }, [])

  useEffect(() => {
    if (badgesRef.current.length === 0) return

    // Local abort flag scoped to this effect invocation.
    // Each StrictMode re-run gets its own flag, so the cleanup
    // of one run doesn't interfere with the other.
    let aborted = false

    // Build queue from the ref snapshot
    const queue: CelebrationQueueItem[] = badgesRef.current
      .map((id) => {
        const badge = BADGE_MAP[id]
        if (!badge) return null
        return { badgeId: id, badge, tier: badge.celebrationTier }
      })
      .filter((item): item is CelebrationQueueItem => item !== null)
      .sort((a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier])

    // Cap: max 5 toast-tier + 2 full-screen
    let toastCount = 0
    let fullScreenCount = 0
    const capped: CelebrationQueueItem[] = []

    for (const item of queue) {
      if (item.tier === 'full-screen') {
        if (fullScreenCount < 2) {
          capped.push(item)
          fullScreenCount++
        }
      } else {
        if (toastCount < 5) {
          capped.push(item)
          toastCount++
        }
      }
    }

    // Re-sort: toasts first, then full-screen
    capped.sort((a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier])

    async function processQueue() {
      setIsProcessing(true)

      // Initial 1.5s delay
      await new Promise((r) => setTimeout(r, 1500))
      if (aborted) return

      for (const item of capped) {
        if (aborted) break

        if (item.tier === 'full-screen') {
          // Show overlay — wait for dismissCurrent to be called
          setCurrentCelebration(item)
          setCelebrationType('overlay')

          await new Promise<void>((resolve) => {
            dismissResolveRef.current = resolve
          })

          if (aborted) break
        } else {
          // Show toast — await its auto-dismiss promise
          const iconConfig = getBadgeIcon(item.badgeId)
          const IconComponent = iconConfig.icon
          const iconElement = createElement(
            'div',
            {
              className: `flex h-8 w-8 items-center justify-center rounded-full ${iconConfig.bgColor}`,
            },
            createElement(IconComponent, {
              className: `h-4 w-4 ${iconConfig.textColor}`,
            }),
          )

          await showCelebrationToast(
            item.badge.name,
            `You earned: ${item.badge.description}`,
            tierToToastType(item.tier),
            iconElement,
          )

          // 500ms gap between toasts
          if (!aborted) {
            await new Promise((r) => setTimeout(r, 500))
          }
        }
      }

      if (!aborted) {
        clearRef.current()
      }
      setIsProcessing(false)
    }

    processQueue()

    // Cleanup: abort this invocation only. Badge data stays in the ref
    // so the StrictMode re-run can pick it up and process correctly.
    return () => {
      aborted = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  return {
    currentCelebration,
    celebrationType,
    dismissCurrent,
    isProcessing,
  }
}
