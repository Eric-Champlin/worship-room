import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bell, BellOff, ChevronLeft, ChevronRight, Users } from 'lucide-react'

import { Layout } from '@/components/Layout'
import { SEO } from '@/components/SEO'
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon'
import { ChallengeDayContent } from '@/components/challenges/ChallengeDayContent'
import { ChallengeDaySelector } from '@/components/challenges/ChallengeDaySelector'
import { ChallengeNotFound } from '@/components/challenges/ChallengeNotFound'
import { SwitchChallengeDialog } from '@/components/challenges/SwitchChallengeDialog'
import { ChallengeCompletionOverlay } from '@/components/challenges/ChallengeCompletionOverlay'
import { MilestoneCard } from '@/components/challenges/MilestoneCard'
import { CommunityFeed } from '@/components/challenges/CommunityFeed'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToastSafe } from '@/components/ui/Toast'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import type { CompletionResult } from '@/hooks/useChallengeProgress'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useChallengeAutoDetect } from '@/hooks/useChallengeAutoDetect'
import { getChallenge, CHALLENGES } from '@/data/challenges'
import { BADGE_MAP } from '@/constants/dashboard/badges'
import {
  getParticipantCount,
  getCommunityGoalProgress,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ROUTES,
  SEASON_LABELS,
} from '@/constants/challenges'
import { getChallengeCalendarInfo } from '@/lib/challenge-calendar'
import { cn } from '@/lib/utils'

export function ChallengeDetail() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const {
    getProgress, joinChallenge, completeDay, getReminders, toggleReminder,
    getActiveChallenge, pauseChallenge, markMilestoneShown, hasMilestoneBeenShown,
  } = useChallengeProgress()
  const [switchDialog, setSwitchDialog] = useState<{ activeId: string } | null>(null)
  const [completionOverlay, setCompletionOverlay] = useState<{
    title: string; themeColor: string; days: number; points: number; badgeName: string
  } | null>(null)
  const [activeMilestone, setActiveMilestone] = useState<{ day: number; title: string } | null>(null)

  const faithPoints = useFaithPoints()
  const { showToast } = useToastSafe()

  // Auto-detection: auto-complete challenge day if action already done
  useChallengeAutoDetect({
    isAuthenticated,
    getActiveChallenge,
    completeDay,
    recordActivity: faithPoints.recordActivity,
    showToast,
  })

  const challenge = challengeId ? getChallenge(challengeId) : undefined
  const progress = challengeId ? getProgress(challengeId) : undefined

  const calendarInfo = useMemo(() => {
    if (!challenge) return undefined
    return getChallengeCalendarInfo(challenge)
  }, [challenge])

  const isPastChallenge = calendarInfo?.status === 'past'
  const isFutureChallenge = calendarInfo?.status === 'upcoming'
  const isActiveChallenge = calendarInfo?.status === 'active'

  const initialDay = progress?.currentDay ?? 1
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [justCompletedFinalDay, setJustCompletedFinalDay] = useState(false)

  const currentDayContent = useMemo(() => {
    if (!challenge) return undefined
    return challenge.dailyContent.find((d) => d.dayNumber === selectedDay)
  }, [challenge, selectedDay])

  const isDayAccessible = useCallback(
    (day: number): boolean => {
      if (isPastChallenge) return true
      if (day === 1) return true
      if (!isAuthenticated) return false
      if (!progress) return false
      if (progress.completedDays.includes(day)) return true
      return day <= progress.currentDay
    },
    [isAuthenticated, progress, isPastChallenge],
  )

  const handleDayChange = useCallback(
    (day: number) => {
      if (!isDayAccessible(day)) {
        if (!isAuthenticated) {
          authModal?.openAuthModal('Sign in to join this challenge')
          return
        }
        return
      }
      setSelectedDay(day)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [isDayAccessible, isAuthenticated, authModal],
  )

  const handlePreviousDay = useCallback(() => {
    if (selectedDay <= 1) return
    handleDayChange(selectedDay - 1)
  }, [selectedDay, handleDayChange])

  const handleNextDay = useCallback(() => {
    if (!challenge || selectedDay >= challenge.durationDays) return
    handleDayChange(selectedDay + 1)
  }, [selectedDay, challenge, handleDayChange])

  const handleMarkComplete = useCallback(() => {
    if (!challengeId || !challenge || !progress) return
    if (selectedDay !== progress.currentDay) return
    if (progress.completedDays.includes(selectedDay)) return

    const result: CompletionResult = completeDay(challengeId, selectedDay, faithPoints.recordActivity)

    if (result.isCompletion) {
      setJustCompletedFinalDay(true)
      // Find the badge name for the completion overlay
      const badgeId = result.newBadgeIds.find((id) => id.startsWith('challenge_') && !id.includes('first') && !id.includes('master'))
      const badge = badgeId ? BADGE_MAP[badgeId] : undefined
      setCompletionOverlay({
        title: challenge.title,
        themeColor: challenge.themeColor,
        days: challenge.durationDays,
        points: challenge.durationDays * 20 + result.bonusPoints,
        badgeName: badge?.name ?? 'Challenge Complete',
      })
    } else {
      // Check for milestone
      const MILESTONES: Record<number, string> = {
        7: 'Week 1 Complete!',
        14: 'Two Weeks Strong!',
        21: challenge.durationDays === 40 ? 'Halfway There!' : 'Three Weeks of Faithfulness!',
        40: 'The Full Journey Complete!',
      }
      // 7-day challenges: no milestones (completion overlay from Spec 2 handles it)
      if (challenge.durationDays > 7) {
        const milestoneTitle = MILESTONES[selectedDay]
        if (milestoneTitle && !hasMilestoneBeenShown(challengeId, selectedDay)) {
          setActiveMilestone({ day: selectedDay, title: milestoneTitle })
        }
      }
    }
  }, [challengeId, challenge, progress, selectedDay, completeDay, faithPoints.recordActivity, hasMilestoneBeenShown])

  const handleJoin = useCallback(() => {
    if (!challengeId) return
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to join this challenge')
      return
    }
    const active = getActiveChallenge()
    if (active && active.challengeId !== challengeId) {
      setSwitchDialog({ activeId: active.challengeId })
      return
    }
    joinChallenge(challengeId)
  }, [challengeId, isAuthenticated, authModal, joinChallenge, getActiveChallenge])

  const handleSwitchConfirm = useCallback(() => {
    if (!challengeId || !switchDialog) return
    pauseChallenge(switchDialog.activeId)
    joinChallenge(challengeId)
    setSwitchDialog(null)
  }, [challengeId, switchDialog, pauseChallenge, joinChallenge])

  const handleSwitchCancel = useCallback(() => {
    setSwitchDialog(null)
  }, [])

  if (!challenge) return <ChallengeNotFound />

  const isJoined = progress != null
  const isCompleted = progress?.completedAt != null

  const completionPercent = progress
    ? Math.round((progress.completedDays.length / challenge.durationDays) * 100)
    : 0

  const calendarDay = calendarInfo?.calendarDay ?? 1
  const participantCount = getParticipantCount(challenge.id, calendarDay)
  const goalNumber =
    parseInt(challenge.communityGoal.replace(/[^0-9]/g, ''), 10) || 10000
  const communityProgress = getCommunityGoalProgress(participantCount, goalNumber)
  const communityPercent = Math.min((communityProgress / goalNumber) * 100, 100)

  const heroStyle = {
    backgroundImage: `radial-gradient(circle at 50% 30%, ${challenge.themeColor}20 0%, transparent 60%), radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)`,
    backgroundSize: '100% 100%',
  }

  // Days until a future challenge starts
  const daysUntilStart = isFutureChallenge && calendarInfo
    ? Math.ceil(
        (calendarInfo.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : 0

  const showDayContent = !isFutureChallenge && currentDayContent

  return (
    <Layout>
      <SEO
        title={`${challenge.title} | Community Challenges`}
        description={challenge.description.slice(0, 155).trim()}
      />
      <div className="min-h-screen bg-hero-dark">
        {/* Hero section */}
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-10 text-center antialiased sm:pt-36 sm:pb-14"
          style={heroStyle}
        >
          <ChallengeIcon
            name={challenge.icon}
            className="h-12 w-12"
            style={{ color: challenge.themeColor }}
            aria-hidden="true"
          />

          <h1 className="mt-4 font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl">
            {challenge.title}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-base text-white/85 sm:text-lg">
            {challenge.description}
          </p>

          <div className="mt-4 inline-flex gap-2">
            <span className="rounded-full bg-white/10 px-4 py-1 text-sm text-white">
              {SEASON_LABELS[challenge.season]}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1 text-sm text-white">
              {challenge.durationDays} days
            </span>
          </div>

          {/* Progress bar — visible when joined, not completed, not past */}
          {isJoined && !isCompleted && !isPastChallenge && (
            <div className="mx-auto mt-4 w-full max-w-xs">
              <div
                className="h-2 rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${completionPercent}% complete`}
              >
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: challenge.themeColor,
                  }}
                />
              </div>
              <p className="mt-1 text-sm text-white/50">
                {completionPercent}% complete
              </p>
            </div>
          )}

          {/* Participant count */}
          {!isFutureChallenge && (
            <div className="mt-4 flex items-center gap-1.5 text-sm text-white/60">
              <Users className="h-4 w-4" aria-hidden="true" />
              {participantCount.toLocaleString()} participants
            </div>
          )}

          {/* Community goal */}
          {!isFutureChallenge && (
            <div className="mx-auto mt-2 w-full max-w-xs">
              <div
                className="h-1.5 rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={Math.round(communityPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Community goal: ${Math.round(communityPercent)}% complete`}
              >
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${communityPercent}%`,
                    backgroundColor: challenge.themeColor,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-white/50">
                Community goal: {challenge.communityGoal}
              </p>
            </div>
          )}

          {/* Join Challenge button — active challenge, not joined */}
          {isActiveChallenge && !isJoined && (
            <button
              type="button"
              onClick={handleJoin}
              className="mt-6 inline-flex min-h-[44px] items-center rounded-full px-8 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: challenge.themeColor }}
            >
              Join Challenge
            </button>
          )}

          {/* Future challenge — countdown + remind me */}
          {isFutureChallenge && (
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-white">
                Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {calendarInfo?.startDate.toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      authModal?.openAuthModal('Sign in to set a reminder')
                      return
                    }
                    if (challengeId) toggleReminder(challengeId)
                  }}
                  className={cn(
                    'inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors',
                    getReminders().includes(challengeId ?? '')
                      ? 'bg-white/20 text-white/70'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/15',
                  )}
                  aria-label={getReminders().includes(challengeId ?? '') ? 'Remove reminder' : 'Set reminder'}
                  aria-pressed={getReminders().includes(challengeId ?? '')}
                >
                  {getReminders().includes(challengeId ?? '') ? (
                    <>
                      <BellOff className="h-4 w-4" aria-hidden="true" />
                      Reminder set
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" aria-hidden="true" />
                      Remind me
                    </>
                  )}
                </button>
                <Link
                  to="/challenges"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
                >
                  Back to Challenges
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Milestone card */}
        {activeMilestone && challengeId && challenge && (
          <MilestoneCard
            milestoneTitle={activeMilestone.title}
            challengeTitle={challenge.title}
            challengeId={challengeId}
            themeColor={challenge.themeColor}
            currentDay={activeMilestone.day}
            totalDays={challenge.durationDays}
            streak={progress?.streak ?? 0}
            onDismiss={() => {
              markMilestoneShown(challengeId, activeMilestone.day)
              setActiveMilestone(null)
            }}
          />
        )}

        {/* Day content */}
        {showDayContent && (
          <ChallengeDayContent
            day={currentDayContent}
            themeColor={challenge.themeColor}
            isCurrentDay={
              isJoined && !isCompleted && selectedDay === progress?.currentDay
            }
            isAuthenticated={isAuthenticated}
            isPastChallenge={isPastChallenge}
            onMarkComplete={handleMarkComplete}
            actionRoute={ACTION_TYPE_ROUTES[currentDayContent.actionType]}
            actionLabel={ACTION_TYPE_LABELS[currentDayContent.actionType]}
            challengeId={challenge.id}
            challengeTitle={challenge.title}
            completedDaysCount={progress?.completedDays.length ?? 0}
            streak={progress?.streak ?? 0}
            totalDays={challenge.durationDays}
          />
        )}

        {/* Community feed */}
        {challenge && (
          <CommunityFeed
            dayNumber={selectedDay}
            challengeDuration={challenge.durationDays}
          />
        )}

        {/* Completion celebration */}
        {justCompletedFinalDay && (
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="rounded-2xl border border-success/20 bg-success/10 p-6 text-center">
              <p className="text-lg font-semibold text-white">
                You&apos;ve completed {challenge.title}!
              </p>
              <p className="mt-2 text-sm text-white/70">
                What an incredible journey. {participantCount.toLocaleString()} others
                completed this challenge with you.
              </p>
            </div>
          </div>
        )}

        {/* Day navigation */}
        {!isFutureChallenge && (
          <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
            <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
              <ChallengeDaySelector
                totalDays={challenge.durationDays}
                selectedDay={selectedDay}
                progress={progress}
                dayTitles={challenge.dailyContent.map((d) => d.title)}
                onSelectDay={handleDayChange}
                isPastChallenge={isPastChallenge}
              />

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handlePreviousDay}
                  disabled={selectedDay <= 1}
                  aria-label="Go to previous day"
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors',
                    selectedDay <= 1
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-white/15',
                  )}
                >
                  <ChevronLeft size={16} />
                  Previous Day
                </button>

                <button
                  type="button"
                  onClick={handleNextDay}
                  disabled={selectedDay >= challenge.durationDays}
                  aria-label="Go to next day"
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors',
                    selectedDay >= challenge.durationDays
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-white/15',
                  )}
                >
                  Next Day
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Switch challenge dialog */}
      {switchDialog && (() => {
        const activeChallenge = CHALLENGES.find((c) => c.id === switchDialog.activeId)
        const activeProgress = getProgress(switchDialog.activeId)
        return (
          <SwitchChallengeDialog
            isOpen
            currentChallengeName={activeChallenge?.title ?? 'current challenge'}
            currentDay={activeProgress?.currentDay ?? 1}
            newChallengeTitle={challenge.title}
            themeColor={challenge.themeColor}
            onConfirm={handleSwitchConfirm}
            onCancel={handleSwitchCancel}
          />
        )
      })()}

      {/* Challenge completion celebration overlay */}
      {completionOverlay && (
        <ChallengeCompletionOverlay
          challengeTitle={completionOverlay.title}
          themeColor={completionOverlay.themeColor}
          daysCompleted={completionOverlay.days}
          totalPointsEarned={completionOverlay.points}
          badgeName={completionOverlay.badgeName}
          onDismiss={() => setCompletionOverlay(null)}
        />
      )}
    </Layout>
  )
}
