import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileAvatar } from '@/components/shared/ProfileAvatar'
import { EncouragePopover } from '@/components/social/EncouragePopover'
import { useToast } from '@/components/ui/Toast'
import { getBadgeIcon } from '@/constants/dashboard/badge-icons'
import type { ProfileData } from '@/hooks/useProfileData'

interface ProfileHeaderProps {
  profileData: ProfileData
  onEncourage: (message: string) => void
  onAddFriend: () => void
  onAcceptRequest: () => void
  canEncourageToday: boolean
}

export function ProfileHeader({
  profileData,
  onEncourage,
  onAddFriend,
  onAcceptRequest,
  canEncourageToday,
}: ProfileHeaderProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [sentFeedback, setSentFeedback] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const sentFeedbackTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const { showToast } = useToast()

  useEffect(() => {
    return () => { if (sentFeedbackTimerRef.current) clearTimeout(sentFeedbackTimerRef.current) }
  }, [])

  const handleEncourageSend = useCallback(
    (message: string) => {
      setPopoverOpen(false)
      onEncourage(message)
      setSentFeedback(true)
      showToast(`Encouragement sent to ${profileData.displayName}!`, 'success')
      sentFeedbackTimerRef.current = setTimeout(() => setSentFeedback(false), 3000)
    },
    [onEncourage, profileData.displayName, showToast],
  )

  const truncatedName =
    profileData.displayName.length > 30
      ? profileData.displayName.slice(0, 30) + '...'
      : profileData.displayName

  // Level progress percentage
  let progressPercent = 0
  if (profileData.statsVisible && profileData.totalPoints != null && profileData.pointsToNextLevel != null) {
    const pointsInCurrentLevel = profileData.totalPoints - getLevelThreshold(profileData.currentLevel ?? 1)
    const levelRange = (profileData.pointsToNextLevel ?? 0) + pointsInCurrentLevel
    progressPercent = levelRange > 0 ? Math.round((pointsInCurrentLevel / levelRange) * 100) : 100
  }

  const levelIcon = profileData.currentLevel ? getBadgeIcon(`level_${profileData.currentLevel}`) : null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <div className="flex flex-col items-center lg:flex-row lg:items-start lg:gap-8">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <ProfileAvatar
          avatarId={profileData.avatarId}
          avatarUrl={profileData.avatarUrl}
          displayName={profileData.displayName}
          userId={profileData.userId}
          size="xl"
          badges={profileData.badgeData}
          className="hidden lg:flex"
        />
        <ProfileAvatar
          avatarId={profileData.avatarId}
          avatarUrl={profileData.avatarUrl}
          displayName={profileData.displayName}
          userId={profileData.userId}
          size="lg"
          badges={profileData.badgeData}
          className="hidden sm:flex lg:hidden"
        />
        <ProfileAvatar
          avatarId={profileData.avatarId}
          avatarUrl={profileData.avatarUrl}
          displayName={profileData.displayName}
          userId={profileData.userId}
          size="md"
          badges={profileData.badgeData}
          className="flex sm:hidden"
        />
      </div>

      {/* Info */}
      <div className="mt-4 flex flex-col items-center text-center lg:mt-0 lg:items-start lg:text-left">
        {/* Name + Friends badge */}
        <div className="flex items-center gap-2">
          <h2
            className="text-2xl font-bold text-white md:text-3xl"
            title={profileData.displayName.length > 30 ? profileData.displayName : undefined}
          >
            {truncatedName}
          </h2>
          {profileData.relationship === 'friend' && (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
              <Check className="h-3 w-3" /> Friends
            </span>
          )}
        </div>

        {/* Level */}
        {profileData.statsVisible && profileData.levelName && levelIcon && (
          <div className="mt-1 flex items-center gap-2">
            <levelIcon.icon className={cn('h-5 w-5', levelIcon.textColor)} />
            <span className="text-lg font-medium text-primary-lt">
              {profileData.levelName}
            </span>
          </div>
        )}

        {/* Streak */}
        {profileData.statsVisible && profileData.currentStreak != null && (
          <p className="mt-1 text-base text-white/80">
            🔥 {profileData.currentStreak}-day streak
          </p>
        )}

        {/* Progress bar */}
        {profileData.statsVisible && profileData.currentLevel != null && (
          <div className="mt-2 w-full max-w-xs">
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="relative mt-4 flex gap-2">
          {profileData.relationship === 'self' && (
            <Link
              to="/settings"
              className="inline-flex items-center rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-white transition-colors hover:bg-white/15"
            >
              Edit Profile
            </Link>
          )}

          {profileData.relationship === 'friend' && (
            <>
              <button
                ref={buttonRef}
                onClick={() => {
                  if (!canEncourageToday) return
                  setPopoverOpen((prev) => !prev)
                }}
                disabled={!canEncourageToday}
                className={cn(
                  'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-6 py-2 font-semibold transition-colors',
                  canEncourageToday && !sentFeedback
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'cursor-not-allowed bg-white/10 text-white/50',
                )}
                aria-haspopup="menu"
                aria-expanded={popoverOpen}
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                {sentFeedback
                  ? 'Encouragement Sent ✓'
                  : canEncourageToday
                    ? 'Send Encouragement'
                    : 'Encouraged today'}
              </button>
              {popoverOpen && (
                <EncouragePopover
                  friendName={profileData.displayName}
                  onClose={() => {
                    setPopoverOpen(false)
                    buttonRef.current?.focus()
                  }}
                  onSend={handleEncourageSend}
                  isMobile={isMobile}
                />
              )}
            </>
          )}

          {profileData.relationship === 'pending-outgoing' && (
            <button
              disabled
              className="inline-flex min-h-[44px] cursor-not-allowed items-center rounded-lg bg-white/10 px-6 py-2 text-white/50"
            >
              Request Sent
            </button>
          )}

          {profileData.relationship === 'pending-incoming' && (
            <button
              onClick={onAcceptRequest}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Accept Request
            </button>
          )}

          {profileData.relationship === 'none' && (
            <button
              onClick={onAddFriend}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Add Friend
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper to get level threshold
function getLevelThreshold(level: number): number {
  const thresholds: Record<number, number> = { 1: 0, 2: 100, 3: 500, 4: 1500, 5: 4000, 6: 10000 }
  return thresholds[level] ?? 0
}
