import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActiveChallengeCard } from '@/components/challenges/ActiveChallengeCard'
import { HallOfFame } from '@/components/challenges/HallOfFame'
import { NextChallengeCountdown } from '@/components/challenges/NextChallengeCountdown'
import { PastChallengeCard } from '@/components/challenges/PastChallengeCard'
import { UpcomingChallengeCard } from '@/components/challenges/UpcomingChallengeCard'
import { SwitchChallengeDialog } from '@/components/challenges/SwitchChallengeDialog'
import { Layout } from '@/components/Layout'
import { PageHero } from '@/components/PageHero'
import { SEO } from '@/components/SEO'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { CHALLENGES } from '@/data/challenges'
import { useAuth } from '@/hooks/useAuth'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import {
  compareDatesOnly,
  getChallengeCalendarInfo,
  type ChallengeCalendarInfo,
} from '@/lib/challenge-calendar'
import type { Challenge } from '@/types/challenges'

// ---------------------------------------------------------------------------
// Internal types for categorized challenges
// ---------------------------------------------------------------------------

interface CategorizedChallenge {
  challenge: Challenge
  info: ChallengeCalendarInfo
}

// ---------------------------------------------------------------------------
// Challenges Page
// ---------------------------------------------------------------------------

export function Challenges() {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const {
    isChallengeJoined, isChallengeCompleted, joinChallenge, getReminders, toggleReminder, getProgress,
    getActiveChallenge, pauseChallenge, resumeChallenge,
  } = useChallengeProgress()
  const [switchDialog, setSwitchDialog] = useState<{ activeId: string; targetId: string; isResume: boolean } | null>(null)

  const reminders = getReminders()

  const categorized = useMemo(() => {
    const today = new Date()
    const active: CategorizedChallenge[] = []
    const upcoming: CategorizedChallenge[] = []
    const past: CategorizedChallenge[] = []

    for (const challenge of CHALLENGES) {
      const info = getChallengeCalendarInfo(challenge, today)
      const entry: CategorizedChallenge = { challenge, info }

      switch (info.status) {
        case 'active':
          active.push(entry)
          break
        case 'upcoming':
          upcoming.push(entry)
          break
        case 'past':
          past.push(entry)
          break
      }
    }

    // Sort upcoming by start date (soonest first)
    upcoming.sort((a, b) => compareDatesOnly(a.info.startDate, b.info.startDate))

    // Sort past by end date (most recent first)
    past.sort((a, b) => compareDatesOnly(b.info.endDate, a.info.endDate))

    return { active, upcoming, past }
  }, [])

  // The next upcoming challenge (for the countdown section)
  const nextUpcoming = categorized.upcoming[0] ?? null

  const hasAnyChallenges =
    categorized.active.length > 0 ||
    categorized.upcoming.length > 0 ||
    categorized.past.length > 0

  function handleJoin(challengeId: string) {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to join this challenge')
      return
    }
    const active = getActiveChallenge()
    if (active && active.challengeId !== challengeId) {
      setSwitchDialog({ activeId: active.challengeId, targetId: challengeId, isResume: false })
      return
    }
    joinChallenge(challengeId)
  }

  function handleResume(challengeId: string) {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to resume this challenge')
      return
    }
    const active = getActiveChallenge()
    if (active && active.challengeId !== challengeId) {
      setSwitchDialog({ activeId: active.challengeId, targetId: challengeId, isResume: true })
      return
    }
    resumeChallenge(challengeId)
    navigate(`/challenges/${challengeId}`)
  }

  const handleSwitchConfirm = useCallback(() => {
    if (!switchDialog) return
    pauseChallenge(switchDialog.activeId)
    if (switchDialog.isResume) {
      resumeChallenge(switchDialog.targetId)
    } else {
      joinChallenge(switchDialog.targetId)
    }
    setSwitchDialog(null)
    navigate(`/challenges/${switchDialog.targetId}`)
  }, [switchDialog, pauseChallenge, resumeChallenge, joinChallenge, navigate])

  const handleSwitchCancel = useCallback(() => {
    setSwitchDialog(null)
  }, [])

  function handleContinue(challengeId: string) {
    navigate(`/challenges/${challengeId}`)
  }

  function handleToggleReminder(challengeId: string) {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to set a reminder')
      return
    }
    toggleReminder(challengeId)
  }

  function handleChallengeClick(challengeId: string) {
    navigate(`/challenges/${challengeId}`)
  }

  return (
    <Layout>
      <SEO title="Community Challenges" description="Join seasonal faith challenges with thousands of other believers during Lent, Advent, Easter, and more." />
      <PageHero title="Community Challenges" subtitle="Grow together in faith" />
      <section className="bg-neutral-bg px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        {/* Active Challenges */}
        {categorized.active.length > 0 && (
          <section className="mb-10" aria-label="Active challenges">
            <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-text-light">
              Active Now
            </h2>
            <div className="space-y-6">
              {categorized.active.map(({ challenge, info }) => {
                const progress = getProgress(challenge.id)
                const isPaused = progress?.status === 'paused'
                return (
                  <ActiveChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    daysRemaining={info.daysRemaining ?? 0}
                    calendarDay={info.calendarDay ?? 1}
                    onJoin={() => handleJoin(challenge.id)}
                    onContinue={() => handleContinue(challenge.id)}
                    onResume={() => handleResume(challenge.id)}
                    isJoined={isChallengeJoined(challenge.id)}
                    isCompleted={isChallengeCompleted(challenge.id)}
                    isPaused={isPaused}
                    currentDay={progress?.currentDay}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Next Challenge Countdown (shown when no active challenges) */}
        {categorized.active.length === 0 && nextUpcoming && (
          <section className="mb-10" aria-label="Next challenge countdown">
            <NextChallengeCountdown
              challenge={nextUpcoming.challenge}
              startDate={nextUpcoming.info.startDate}
              isReminderSet={reminders.includes(nextUpcoming.challenge.id)}
              onToggleReminder={() => handleToggleReminder(nextUpcoming.challenge.id)}
            />
          </section>
        )}

        {/* Upcoming Challenges */}
        {categorized.upcoming.length > 0 && (
          <section className="mb-10" aria-label="Upcoming challenges">
            <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-text-light">
              Coming Up
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {categorized.upcoming.map(({ challenge, info }) => (
                <UpcomingChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  startDate={info.startDate}
                  isReminderSet={reminders.includes(challenge.id)}
                  onToggleReminder={() => handleToggleReminder(challenge.id)}
                  onClick={() => handleChallengeClick(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Challenges */}
        {categorized.past.length > 0 && (
          <section className="mb-10" aria-label="Past challenges">
            <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-text-light">
              Past
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categorized.past.map(({ challenge }) => (
                <PastChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isCompleted={isChallengeCompleted(challenge.id)}
                  onClick={() => handleChallengeClick(challenge.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Hall of Fame */}
        {categorized.past.length > 0 && (
          <HallOfFame pastChallenges={categorized.past} />
        )}

        {/* Empty state fallback */}
        {!hasAnyChallenges && (
          <div className="py-16 text-center">
            <p className="text-lg text-text-light">
              New challenges are coming soon. Check back during the next season.
            </p>
          </div>
        )}
      </div>
      </section>

      {/* Switch challenge dialog */}
      {switchDialog && (() => {
        const activeChallenge = CHALLENGES.find((c) => c.id === switchDialog.activeId)
        const targetChallenge = CHALLENGES.find((c) => c.id === switchDialog.targetId)
        const activeProgress = getProgress(switchDialog.activeId)
        return (
          <SwitchChallengeDialog
            isOpen
            currentChallengeName={activeChallenge?.title ?? 'current challenge'}
            currentDay={activeProgress?.currentDay ?? 1}
            newChallengeTitle={targetChallenge?.title ?? 'new challenge'}
            themeColor={targetChallenge?.themeColor ?? '#6D28D9'}
            onConfirm={handleSwitchConfirm}
            onCancel={handleSwitchCancel}
          />
        )
      })()}
    </Layout>
  )
}
