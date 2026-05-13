import { useEffect, useMemo, useState } from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import { RadioPillGroup } from './RadioPillGroup'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useMutes } from '@/hooks/useMutes'
import { ALL_MOCK_USERS } from '@/mocks/friends-mock-data'
import type {
  UserSettingsPrivacy,
  UserSettingsPrayerWall,
  NudgePermission,
  NightModePreference,
  StreakVisibility,
} from '@/types/settings'

interface PrivacySectionProps {
  privacy: UserSettingsPrivacy
  /** Spec 6.1 — Prayer Wall settings namespace. */
  prayerWall: UserSettingsPrayerWall
  friendsBlocked: string[]
  onUpdatePrivacy: (updates: Partial<Omit<UserSettingsPrivacy, 'blockedUsers'>>) => void
  /** Spec 6.1 — Prayer Wall settings updater. */
  onUpdatePrayerWall: (updates: Partial<UserSettingsPrayerWall>) => void
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

// Spec 6.3 — Night Mode 3-state preference.
const NIGHT_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto (9pm – 6am)' },
  { value: 'on', label: 'Always on' },
  { value: 'off', label: 'Always off' },
]

function getMockUserName(userId: string): string {
  const user = ALL_MOCK_USERS.find((u) => u.id === userId)
  return user?.displayName ?? 'Unknown User'
}

function getMockUserInitial(userId: string): string {
  const name = getMockUserName(userId)
  return name.charAt(0).toUpperCase()
}

export function PrivacySection({
  privacy,
  prayerWall,
  friendsBlocked,
  onUpdatePrivacy,
  onUpdatePrayerWall,
  onUnblock,
}: PrivacySectionProps) {
  const { showToast } = useToast()
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null)
  const [confirmingMuteUserId, setConfirmingMuteUserId] = useState<string | null>(null)

  const { muted, unmuteUser: unmuteFromMutes } = useMutes()

  // friendsBlocked is canonical going forward (Spec 2.5.6).
  // privacy.blockedUsers is legacy from pre-2.5.6 data; merged so the user can
  // still see and unblock those entries during the one-wave grace period.
  const displayedBlocked = useMemo(
    () => Array.from(new Set([...friendsBlocked, ...privacy.blockedUsers])),
    [friendsBlocked, privacy.blockedUsers],
  )

  // Spec 6.3 — Hash-fragment scroll to the Night Mode anchor. The
  // NightWatchChip popover Settings link targets `/settings?tab=privacy#night-mode`
  // expecting the page to scroll to the Prayer Wall subsection. React Router
  // does not auto-scroll to hash fragments; this effect wires that behavior.
  // Honors prefers-reduced-motion via the `behavior` choice — the standard
  // `smooth` value is overridden to `auto` (instant) when the user has
  // reduced motion enabled.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#night-mode') return
    const el = document.getElementById('night-mode')
    if (!el) return
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  function handleUnblockClick(userId: string) {
    setConfirmingUserId(userId)
  }

  function handleConfirmUnblock() {
    if (!confirmingUserId) return
    const name = getMockUserName(confirmingUserId)
    onUnblock(confirmingUserId)
    showToast(`${name} has been unblocked.`)
    setConfirmingUserId(null)
  }

  function handleCancelUnblock() {
    setConfirmingUserId(null)
  }

  function handleUnmuteClick(userId: string) {
    setConfirmingMuteUserId(userId)
  }

  function handleConfirmUnmute() {
    if (!confirmingMuteUserId) return
    const name = getMockUserName(confirmingMuteUserId)
    unmuteFromMutes(confirmingMuteUserId)
    showToast(`${name} has been unmuted.`)
    setConfirmingMuteUserId(null)
  }

  function handleCancelUnmute() {
    setConfirmingMuteUserId(null)
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

        {/* Spec 6.1 + 6.3 — Prayer Wall sub-section: Prayer Receipts toggle
            (Spec 6.1) + Night Mode preference (Spec 6.3). The `id="night-mode"`
            anchor matches the NightWatchChip popover link target
            `/settings?tab=privacy#night-mode`. Both controls live in the same
            `UserSettingsPrayerWall` namespace so the co-location is type-aligned. */}
        <div id="night-mode" className="border-t border-white/10 pt-6">
          <h3 className="text-sm font-medium text-white/80 mb-3">Prayer Wall</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="privacy-prayer-receipts"
              checked={prayerWall.prayerReceiptsVisible}
              onChange={(v) =>
                onUpdatePrayerWall({ prayerReceiptsVisible: v })
              }
              label="Show me my prayer receipts"
              description="Turn this off if you'd rather not see who's praying for you right now. You can turn it back on anytime."
            />
            <RadioPillGroup
              label="Night Mode"
              options={NIGHT_MODE_OPTIONS}
              value={prayerWall.nightMode}
              onChange={(v) =>
                onUpdatePrayerWall({ nightMode: v as NightModePreference })
              }
            />
          </div>
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
                      {getMockUserInitial(userId)}
                    </div>
                    <span className="text-sm text-white">{getMockUserName(userId)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblockClick(userId)}
                    className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Muted Users — Spec 2.5.7. Below Blocked Users (gentler action sits below the destructive one). */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-sm font-medium text-white/80 mb-3">Muted Users</h3>
          {muted.length === 0 ? (
            <p className="text-sm text-white/60">You haven&apos;t muted anyone.</p>
          ) : (
            <div className="space-y-3">
              {muted.map((userId) => (
                <div key={userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-white"
                      aria-hidden="true"
                    >
                      {getMockUserInitial(userId)}
                    </div>
                    <span className="text-sm text-white">{getMockUserName(userId)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnmuteClick(userId)}
                    className="text-sm text-violet-300 hover:text-violet-200 transition-colors min-h-[44px] px-2"
                  >
                    Unmute
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmingUserId !== null}
        title={confirmingUserId ? `Unblock ${getMockUserName(confirmingUserId)}?` : ''}
        body="They'll be able to send you friend requests again. You won't automatically become friends."
        confirmLabel="Unblock"
        variant="destructive"
        onConfirm={handleConfirmUnblock}
        onCancel={handleCancelUnblock}
      />
      <ConfirmDialog
        isOpen={confirmingMuteUserId !== null}
        title={confirmingMuteUserId ? `Unmute ${getMockUserName(confirmingMuteUserId)}?` : ''}
        body="Their posts will appear in your feed again."
        confirmLabel="Unmute"
        variant="default"
        onConfirm={handleConfirmUnmute}
        onCancel={handleCancelUnmute}
      />
    </div>
  )
}
