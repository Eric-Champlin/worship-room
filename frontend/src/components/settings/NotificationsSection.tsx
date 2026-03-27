import { useState } from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import type { UserSettingsNotifications } from '@/types/settings'

const SOUND_EFFECTS_KEY = 'wr_sound_effects_enabled'

interface NotificationsSectionProps {
  notifications: UserSettingsNotifications
  onUpdateNotifications: (key: keyof UserSettingsNotifications, value: boolean) => void
}

export function NotificationsSection({ notifications, onUpdateNotifications }: NotificationsSectionProps) {
  const [showPushNote, setShowPushNote] = useState(notifications.pushNotifications)
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_EFFECTS_KEY) !== 'false'
    } catch {
      return true
    }
  })

  function handleSoundEffectsToggle(value: boolean) {
    setSoundEffectsEnabled(value)
    try {
      localStorage.setItem(SOUND_EFFECTS_KEY, String(value))
    } catch {
      // localStorage unavailable
    }
  }

  function handleToggle(key: keyof UserSettingsNotifications, value: boolean) {
    onUpdateNotifications(key, value)
    if (key === 'pushNotifications') setShowPushNote(value)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">Notifications</h2>

      <div className="space-y-6">
        {/* Sound */}
        <div>
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Sound</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-sound-effects"
              checked={soundEffectsEnabled}
              onChange={handleSoundEffectsToggle}
              label="Sound Effects"
              description="Play subtle sounds on achievements and milestones."
            />
          </div>
        </div>

        {/* General */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">General</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-in-app"
              checked={notifications.inAppNotifications}
              onChange={(v) => handleToggle('inAppNotifications', v)}
              label="In-app notifications"
              description="Show notifications in the bell icon"
            />
            <div>
              <ToggleSwitch
                id="notif-push"
                checked={notifications.pushNotifications}
                onChange={(v) => handleToggle('pushNotifications', v)}
                label="Push notifications"
                description="Get notified even when you're away (coming soon)"
              />
              {showPushNote && (
                <p className="mt-1 ml-0 text-xs text-white/40">
                  Push notifications will be available in a future update
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Email</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-weekly-digest"
              checked={notifications.emailWeeklyDigest}
              onChange={(v) => handleToggle('emailWeeklyDigest', v)}
              label="Weekly digest"
              description="Weekly summary of your faith journey (coming soon)"
            />
            <ToggleSwitch
              id="notif-monthly-report"
              checked={notifications.emailMonthlyReport}
              onChange={(v) => handleToggle('emailMonthlyReport', v)}
              label="Monthly report"
              description="Monthly insights and growth recap (coming soon)"
            />
          </div>
        </div>

        {/* Activity */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Activity</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-encouragements"
              checked={notifications.encouragements}
              onChange={(v) => handleToggle('encouragements', v)}
              label="Encouragements"
              description="When friends send you encouragement"
            />
            <ToggleSwitch
              id="notif-milestones"
              checked={notifications.milestones}
              onChange={(v) => handleToggle('milestones', v)}
              label="Milestones"
              description="When you earn badges or level up"
            />
            <ToggleSwitch
              id="notif-friend-requests"
              checked={notifications.friendRequests}
              onChange={(v) => handleToggle('friendRequests', v)}
              label="Friend requests"
              description="When someone wants to be your friend"
            />
            <ToggleSwitch
              id="notif-nudges"
              checked={notifications.nudges}
              onChange={(v) => handleToggle('nudges', v)}
              label="Nudges"
              description="When friends send a gentle nudge"
            />
            <ToggleSwitch
              id="notif-weekly-recap"
              checked={notifications.weeklyRecap}
              onChange={(v) => handleToggle('weeklyRecap', v)}
              label="Weekly recap"
              description="Your weekly community highlights"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
