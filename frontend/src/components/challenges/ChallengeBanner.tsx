import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, X } from 'lucide-react'

import { ChallengeIcon } from '@/components/challenges/ChallengeIcon'
import { SwitchChallengeDialog } from '@/components/challenges/SwitchChallengeDialog'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { getChallengeCalendarInfo } from '@/lib/challenge-calendar'
import { getChallenge, CHALLENGES } from '@/data/challenges'
import { getParticipantCount } from '@/constants/challenges'

function getActiveBannerChallenge() {
  // Find all active challenges, pick the one with the smallest daysRemaining
  const active: { challengeId: string; daysRemaining: number; calendarDay: number }[] = []
  for (const challenge of CHALLENGES) {
    const info = getChallengeCalendarInfo(challenge)
    if (info.status === 'active' && info.daysRemaining != null && info.calendarDay != null) {
      active.push({
        challengeId: challenge.id,
        daysRemaining: info.daysRemaining,
        calendarDay: info.calendarDay,
      })
    }
  }
  if (active.length === 0) return null
  active.sort((a, b) => a.daysRemaining - b.daysRemaining)
  return active[0]
}

export function ChallengeBanner() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { getProgress, joinChallenge, getActiveChallenge, pauseChallenge } = useChallengeProgress()
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()

  const activeChallengeInfo = getActiveBannerChallenge()
  const challengeId = activeChallengeInfo?.challengeId
  const challenge = challengeId ? getChallenge(challengeId) : undefined

  const [dismissed, setDismissed] = useState(() => {
    if (!challengeId) return false
    try {
      return sessionStorage.getItem(`wr_challenge_banner_dismissed_${challengeId}`) === 'true'
    } catch (_e) {
      return false
    }
  })
  const [hiding, setHiding] = useState(false)
  const [switchDialog, setSwitchDialog] = useState<{ activeId: string } | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDismiss = useCallback(() => {
    if (!challengeId) return
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (prefersReduced) {
      sessionStorage.setItem(`wr_challenge_banner_dismissed_${challengeId}`, 'true')
      setDismissed(true)
      return
    }
    setHiding(true)
    dismissTimerRef.current = setTimeout(() => {
      sessionStorage.setItem(`wr_challenge_banner_dismissed_${challengeId}`, 'true')
      setDismissed(true)
    }, 200)
  }, [challengeId, prefersReduced])

  const handleCTA = useCallback(() => {
    if (!challengeId) return

    const progress = getProgress(challengeId)
    const isJoined = !!progress

    if (isJoined) {
      navigate(`/challenges/${challengeId}`)
      return
    }

    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to join this challenge')
      return
    }

    // Logged in, not joined — check for existing active challenge
    const active = getActiveChallenge()
    if (active && active.challengeId !== challengeId) {
      setSwitchDialog({ activeId: active.challengeId })
      return
    }

    joinChallenge(challengeId)
    navigate(`/challenges/${challengeId}`)
  }, [challengeId, isAuthenticated, authModal, getProgress, getActiveChallenge, joinChallenge, navigate])

  const handleSwitchConfirm = useCallback(() => {
    if (!challengeId || !switchDialog) return
    const activeChallenge = getActiveChallenge()
    if (activeChallenge) {
      pauseChallenge(activeChallenge.challengeId)
    }
    joinChallenge(challengeId)
    setSwitchDialog(null)
    navigate(`/challenges/${challengeId}`)
  }, [challengeId, switchDialog, getActiveChallenge, pauseChallenge, joinChallenge, navigate])

  if (!activeChallengeInfo || !challenge || dismissed) return null

  const progress = getProgress(challengeId!)
  const isJoined = !!progress
  const { daysRemaining, calendarDay } = activeChallengeInfo
  const participantCount = getParticipantCount(challenge.id, calendarDay)
  const themeColor = challenge.themeColor

  return (
    <>
      <section
        className="mx-4 sm:mx-8 lg:mx-auto lg:max-w-5xl"
        style={{
          maxHeight: hiding ? 0 : 500,
          overflow: 'hidden',
          opacity: hiding ? 0 : 1,
          transition: prefersReduced ? 'none' : 'max-height 200ms ease-out, opacity 200ms ease-out',
        }}
        aria-label={`${challenge.title} challenge banner`}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-8"
          style={{ backgroundColor: 'rgba(13,6,32,0.95)' }}
        >
          {/* Radial gradient accent overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(circle at 70% 50%, ${themeColor}1A 0%, transparent 70%)` }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="pr-8">
              <div className="flex items-center gap-2">
                <ChallengeIcon name={challenge.icon} className="h-5 w-5" style={{ color: themeColor }} aria-hidden="true" />
                <h2 className="text-xl font-bold text-white sm:text-2xl">{challenge.title}</h2>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>{participantCount.toLocaleString()} participants</span>
              </div>
              {isJoined && progress ? (
                <p className="mt-2 text-base font-medium text-white/80">
                  Day {progress.currentDay} of {challenge.durationDays}
                </p>
              ) : (
                <p className="mt-2 text-base font-medium text-white/80">
                  <span style={{ color: themeColor }}>{daysRemaining} days</span> remaining
                </p>
              )}
            </div>
            <button
              onClick={handleCTA}
              style={{ backgroundColor: themeColor }}
              className="min-h-[44px] w-full shrink-0 rounded-lg px-6 py-3 font-semibold text-white sm:w-auto sm:px-8"
            >
              {isJoined ? "Continue Today's Challenge" : 'Join the Challenge'}
            </button>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss challenge banner"
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-white/50 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </section>

      {switchDialog && challengeId && challenge && (() => {
        const activeChallenge = getChallenge(switchDialog.activeId)
        const activeProgress = getProgress(switchDialog.activeId)
        return (
          <SwitchChallengeDialog
            isOpen
            currentChallengeName={activeChallenge?.title ?? 'Current Challenge'}
            currentDay={activeProgress?.currentDay ?? 1}
            newChallengeTitle={challenge.title}
            themeColor={challenge.themeColor}
            onConfirm={handleSwitchConfirm}
            onCancel={() => setSwitchDialog(null)}
          />
        )
      })()}
    </>
  )
}
