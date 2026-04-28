import { useMemo, useState } from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import { RadioPillGroup } from './RadioPillGroup'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { ALL_MOCK_USERS } from '@/mocks/friends-mock-data'
import type { UserSettingsPrivacy, NudgePermission, StreakVisibility } from '@/types/settings'

interface PrivacySectionProps {
  privacy: UserSettingsPrivacy
  friendsBlocked: string[]
  onUpdatePrivacy: (updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => void
  onUnblock: (userId: string) => void
}

const NUDGE_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'nobody', label: 'Nobody' },
]

const STREAK_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'only_me', label: 'Only me' },
]

function getBlockedUserName(userId: string): string {
  const user = ALL_MOCK_USERS.find((u) => u.id === userId)
  return user?.displayName ?? 'Unknown User'
}

function getBlockedUserInitial(userId: string): string {
  const name = getBlockedUserName(userId)
  return name.charAt(0).toUpperCase()
}

export function PrivacySection({
  privacy,
  friendsBlocked,
  onUpdatePrivacy,
  onUnblock,
}: PrivacySectionProps) {
  const { showToast } = useToast()
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null)

  // friendsBlocked is canonical going forward (Spec 2.5.6).
  // privacy.blockedUsers is legacy from pre-2.5.6 data; merged so the user can
  // still see and unblock those entries during the one-wave grace period.
  const displayedBlocked = useMemo(
    () => Array.from(new Set([...friendsBlocked, ...privacy.blockedUsers])),
    [friendsBlocked, privacy.blockedUsers],
  )

  function handleUnblockClick(userId: string) {
    setConfirmingUserId(userId)
  }

  function handleConfirmUnblock() {
    if (!confirmingUserId) return
    const name = getBlockedUserName(confirmingUserId)
    onUnblock(confirmingUserId)
    showToast(`${name} has been unblocked.`)
    setConfirmingUserId(null)
  }

  function handleCancelUnblock() {
    setConfirmingUserId(null)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">Privacy</h2>

      <div className="space-y-6">
        {/* Toggles */}
        <div className="space-y-4">
          <ToggleSwitch
            id="privacy-global-leaderboard"
            checked={privacy.showOnGlobalLeaderboard}
            onChange={(v) => onUpdatePrivacy({ showOnGlobalLeaderboard: v })}
            label="Show on global leaderboard"
            description="Appear on the community leaderboard"
          />
          <ToggleSwitch
            id="privacy-activity-status"
            checked={privacy.activityStatus}
            onChange={(v) => onUpdatePrivacy({ activityStatus: v })}
            label="Activity status"
            description="Show friends when you're active"
          />
        </div>

        {/* Radio groups */}
        <div className="space-y-6">
          <RadioPillGroup
            label="Who can send nudges"
            options={NUDGE_OPTIONS}
            value={privacy.nudgePermission}
            onChange={(v) => onUpdatePrivacy({ nudgePermission: v as NudgePermission })}
          />
          <RadioPillGroup
            label="Who can see your streak & level"
            options={STREAK_OPTIONS}
            value={privacy.streakVisibility}
            onChange={(v) => onUpdatePrivacy({ streakVisibility: v as StreakVisibility })}
          />
        </div>

        {/* Blocked Users */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-sm font-medium text-white/80 mb-3">Blocked Users</h3>
          {displayedBlocked.length === 0 ? (
            <p className="text-sm text-white/60">You haven&apos;t blocked anyone</p>
          ) : (
            <div className="space-y-3">
              {displayedBlocked.map((userId) => (
                <div key={userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-white"
                      aria-hidden="true"
                    >
                      {getBlockedUserInitial(userId)}
                    </div>
                    <span className="text-sm text-white">{getBlockedUserName(userId)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblockClick(userId)}
                    className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmingUserId !== null}
        title={confirmingUserId ? `Unblock ${getBlockedUserName(confirmingUserId)}?` : ''}
        body="They'll be able to send you friend requests again. You won't automatically become friends."
        confirmLabel="Unblock"
        variant="destructive"
        onConfirm={handleConfirmUnblock}
        onCancel={handleCancelUnblock}
      />
    </div>
  )
}
