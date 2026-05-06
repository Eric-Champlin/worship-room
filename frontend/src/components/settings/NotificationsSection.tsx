import { useState, useCallback } from 'react'
import { Share } from 'lucide-react'
import { ToggleSwitch } from './ToggleSwitch'
import { useToast } from '@/components/ui/Toast'
import type { UserSettingsNotifications } from '@/types/settings'
import {
  getNotificationPrefs,
  updateNotificationPrefs,
} from '@/lib/notifications/preferences'
import {
  getPushSupportStatus,
  getPermissionState,
  requestPermission,
} from '@/lib/notifications/permissions'
import { subscribeToPush, unsubscribeFromPush } from '@/lib/notifications/subscription'
import { fireTestNotification } from '@/lib/notifications/scheduler'
import type { NotificationPrefs } from '@/lib/notifications/types'
import type { PushSupportStatus } from '@/lib/notifications/permissions'

const SOUND_EFFECTS_KEY = 'wr_sound_effects_enabled'

interface NotificationsSectionProps {
  notifications: UserSettingsNotifications
  onUpdateNotifications: (key: keyof UserSettingsNotifications, value: boolean) => void
}

function getBrowserInstructions(): string {
  if (typeof navigator === 'undefined') return 'Open your browser settings and allow notifications for this site.'
  const ua = navigator.userAgent
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
    return 'Click the lock icon in the address bar \u2192 Site settings \u2192 Notifications \u2192 Allow'
  }
  if (/Firefox/.test(ua)) {
    return 'Click the lock icon \u2192 Connection secure \u2192 More Information \u2192 Permissions \u2192 Notifications'
  }
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    return 'Safari \u2192 Settings for This Website \u2192 Allow Notifications'
  }
  return 'Open your browser settings and allow notifications for this site.'
}

function PushStatusIndicator({ permission, pushSupport }: {
  permission: NotificationPermission | 'unsupported'
  pushSupport: PushSupportStatus
}) {
  if (pushSupport === 'unsupported' || permission === 'unsupported') {
    return (
      <span className="text-sm text-white/60">
        Your browser doesn&apos;t support push notifications
      </span>
    )
  }
  if (permission === 'granted') {
    return (
      <span className="text-sm font-medium text-emerald-300">
        &#10003; Notifications enabled
      </span>
    )
  }
  if (permission === 'denied') {
    return (
      <span className="text-sm font-medium text-red-300">
        &#10007; Notifications blocked
      </span>
    )
  }
  return (
    <span className="text-sm text-white/60">Not yet enabled</span>
  )
}

export function NotificationsSection({ notifications, onUpdateNotifications }: NotificationsSectionProps) {
  const { showToast } = useToast()
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    try {
      return localStorage.getItem(SOUND_EFFECTS_KEY) !== 'false'
    } catch {
      return true
    }
  })

  const [pushSupport] = useState<PushSupportStatus>(() => getPushSupportStatus())
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() => getPermissionState())
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs())
  const [testSending, setTestSending] = useState(false)

  function handleSoundEffectsToggle(value: boolean) {
    setSoundEffectsEnabled(value)
    try {
      localStorage.setItem(SOUND_EFFECTS_KEY, String(value))
    } catch {
      // localStorage unavailable
    }
  }

  const handleMasterToggle = useCallback(async (value: boolean) => {
    if (value) {
      // Enabling — may need to request permission
      let currentPermission = permissionState
      if (currentPermission === 'default') {
        currentPermission = await requestPermission()
        setPermissionState(currentPermission)
      }

      if (currentPermission === 'granted') {
        await subscribeToPush()
        const updated = updateNotificationPrefs({ enabled: true })
        setPrefs(updated)
      }
      // If denied, toggle stays off — denied instructions will show
    } else {
      // Disabling
      await unsubscribeFromPush()
      const updated = updateNotificationPrefs({ enabled: false })
      setPrefs(updated)
    }
  }, [permissionState])

  const handlePerTypeToggle = useCallback((key: 'dailyVerse' | 'streakReminder', value: boolean) => {
    const updated = updateNotificationPrefs({ [key]: value })
    setPrefs(updated)
  }, [])

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = updateNotificationPrefs({ dailyVerseTime: e.target.value })
    setPrefs(updated)
  }, [])

  const handleTestNotification = useCallback(async () => {
    setTestSending(true)
    const sent = await fireTestNotification()
    setTestSending(false)
    if (sent) {
      showToast('Sent!', 'success')
    }
  }, [showToast])

  const showPushControls = pushSupport !== 'unsupported' && pushSupport !== 'ios-needs-install'
  const showDeniedInstructions = permissionState === 'denied'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">Notifications</h2>

      <div className="space-y-6">
        {/* Sound */}
        <div>
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Sound</h3>
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

        {/* Push Notifications */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Push Notifications</h3>

          <div className="mb-3">
            <PushStatusIndicator permission={permissionState} pushSupport={pushSupport} />
          </div>

          {/* iOS needs-install variant */}
          {pushSupport === 'ios-needs-install' && (
            <div
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.06]"
              role="note"
              aria-label="Install Worship Room for notifications"
            >
              <Share className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <span className="text-sm font-medium text-white block">
                  To receive notifications on iOS, add Worship Room to your home screen first.
                </span>
                <span className="text-xs text-white/60 block mt-1">
                  Tap the Share button, then &quot;Add to Home Screen&quot;
                </span>
              </div>
            </div>
          )}

          {/* Master toggle + sub-controls */}
          {showPushControls && (
            <div className="space-y-4">
              <ToggleSwitch
                id="notif-push-master"
                checked={prefs.enabled && permissionState === 'granted'}
                onChange={handleMasterToggle}
                label="Enable notifications"
                description="Receive a daily verse and gentle reminders"
              />

              {/* Per-type toggles (progressive disclosure) */}
              {prefs.enabled && permissionState === 'granted' && (
                <div className="ml-0 space-y-4 pt-2">
                  <ToggleSwitch
                    id="notif-daily-verse"
                    checked={prefs.dailyVerse}
                    onChange={(v) => handlePerTypeToggle('dailyVerse', v)}
                    label="Daily verse"
                    description="A verse delivered to your device each day"
                  />

                  <ToggleSwitch
                    id="notif-streak-reminder"
                    checked={prefs.streakReminder}
                    onChange={(v) => handlePerTypeToggle('streakReminder', v)}
                    label="Streak reminders"
                    description="A gentle nudge in the evening if you haven't read yet today"
                  />

                  {/* Time picker (visible when daily verse is on) */}
                  {prefs.dailyVerse && (
                    <div className="flex items-center justify-between gap-4 min-h-[44px]">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-white">Daily verse time</span>
                      </div>
                      <input
                        type="time"
                        value={prefs.dailyVerseTime}
                        onChange={handleTimeChange}
                        aria-label="Daily verse notification time"
                        className="bg-white/[0.06] border border-white/15 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Test notification button */}
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    disabled={testSending}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
                  >
                    {testSending ? 'Sending\u2026' : 'Send test notification'}
                  </button>
                </div>
              )}

              {/* Denied permission instructions */}
              {showDeniedInstructions && (
                <div className="bg-white/[0.04] rounded-xl p-4 mt-3">
                  <p className="text-sm font-semibold text-white mb-2">
                    Notifications are blocked
                  </p>
                  <p className="text-xs text-white/60">
                    To re-enable: {getBrowserInstructions()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* In-app */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">In-app</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-in-app"
              checked={notifications.inAppNotifications}
              onChange={(v) => onUpdateNotifications('inAppNotifications', v)}
              label="In-app notifications"
              description="Show notifications in the bell icon"
            />
          </div>
        </div>

        {/* Email */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Email</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-weekly-digest"
              checked={notifications.emailWeeklyDigest}
              onChange={(v) => onUpdateNotifications('emailWeeklyDigest', v)}
              label="Weekly digest"
              description="Weekly summary of your faith journey (coming soon)"
            />
            <ToggleSwitch
              id="notif-monthly-report"
              checked={notifications.emailMonthlyReport}
              onChange={(v) => onUpdateNotifications('emailMonthlyReport', v)}
              label="Monthly report"
              description="Monthly insights and growth recap (coming soon)"
            />
          </div>
        </div>

        {/* Activity */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Activity</h3>
          <div className="space-y-4">
            <ToggleSwitch
              id="notif-encouragements"
              checked={notifications.encouragements}
              onChange={(v) => onUpdateNotifications('encouragements', v)}
              label="Encouragements"
              description="When friends send you encouragement"
            />
            <ToggleSwitch
              id="notif-milestones"
              checked={notifications.milestones}
              onChange={(v) => onUpdateNotifications('milestones', v)}
              label="Milestones"
              description="When you earn badges or level up"
            />
            <ToggleSwitch
              id="notif-friend-requests"
              checked={notifications.friendRequests}
              onChange={(v) => onUpdateNotifications('friendRequests', v)}
              label="Friend requests"
              description="When someone wants to be your friend"
            />
            <ToggleSwitch
              id="notif-nudges"
              checked={notifications.nudges}
              onChange={(v) => onUpdateNotifications('nudges', v)}
              label="Nudges"
              description="When friends send a gentle nudge"
            />
            <ToggleSwitch
              id="notif-weekly-recap"
              checked={notifications.weeklyRecap}
              onChange={(v) => onUpdateNotifications('weeklyRecap', v)}
              label="Weekly recap"
              description="Your weekly community highlights"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
