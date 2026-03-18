import { ToggleSwitch } from './ToggleSwitch'
import { RadioPillGroup } from './RadioPillGroup'
import { useToast } from '@/components/ui/Toast'
import { ALL_MOCK_USERS } from '@/mocks/friends-mock-data'
import { getFriendsData, saveFriendsData } from '@/services/friends-storage'
import type { UserSettingsPrivacy, NudgePermission, StreakVisibility } from '@/types/settings'

interface PrivacySectionProps {
  privacy: UserSettingsPrivacy
  onUpdatePrivacy: (updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => void
  onUnblockUser: (userId: string) => void
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

export function PrivacySection({ privacy, onUpdatePrivacy, onUnblockUser }: PrivacySectionProps) {
  const { showToast } = useToast()

  function handleUnblock(userId: string) {
    const name = getBlockedUserName(userId)

    // Remove from wr_settings.privacy.blockedUsers
    onUnblockUser(userId)

    // Also remove from wr_friends.blocked
    const friendsData = getFriendsData()
    if (friendsData.blocked.includes(userId)) {
      const updated = {
        ...friendsData,
        blocked: friendsData.blocked.filter((id) => id !== userId),
      }
      saveFriendsData(updated)
    }

    showToast(`Unblocked ${name}`)
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
          {privacy.blockedUsers.length === 0 ? (
            <p className="text-sm text-white/40">You haven&apos;t blocked anyone</p>
          ) : (
            <div className="space-y-3">
              {privacy.blockedUsers.map((userId) => (
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
                    onClick={() => handleUnblock(userId)}
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
    </div>
  )
}
