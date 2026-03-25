import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileAvatar } from '@/components/shared/ProfileAvatar'
import { AvatarPickerModal } from '@/components/shared/AvatarPickerModal'
import { getBadgeData } from '@/services/badge-storage'
import type { UserSettingsProfile } from '@/types/settings'

const NAME_PATTERN = /^[a-zA-Z0-9 ]+$/
const NAME_MIN = 2
const NAME_MAX = 30
const BIO_MAX = 160

interface ProfileSectionProps {
  profile: UserSettingsProfile
  userName: string | undefined
  onUpdateProfile: (updates: Partial<UserSettingsProfile>) => void
}

export function ProfileSection({ profile, userName, onUpdateProfile }: ProfileSectionProps) {
  const { user } = useAuth()
  const userId = user?.id || ''
  const [displayName, setDisplayName] = useState(profile.displayName || userName || '')
  const [nameError, setNameError] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const previousNameRef = useRef(displayName)

  const [bio, setBio] = useState(profile.bio || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const badgeData = useMemo(() => getBadgeData(), [])

  // Sync when profile changes externally (e.g. cross-tab)
  useEffect(() => {
    if (profile.displayName) {
      setDisplayName(profile.displayName)
      previousNameRef.current = profile.displayName
    }
  }, [profile.displayName])

  useEffect(() => {
    setBio(profile.bio || '')
  }, [profile.bio])

  function validateName(value: string): string | null {
    if (value.length < NAME_MIN || value.length > NAME_MAX) {
      return `Display name must be ${NAME_MIN}-${NAME_MAX} characters, letters, numbers, and spaces only`
    }
    if (!NAME_PATTERN.test(value)) {
      return `Display name must be ${NAME_MIN}-${NAME_MAX} characters, letters, numbers, and spaces only`
    }
    return null
  }

  function handleNameBlur() {
    const trimmed = displayName.trim()
    if (!trimmed) {
      // Revert to previous valid name
      setDisplayName(previousNameRef.current)
      setNameError('')
      return
    }
    const error = validateName(trimmed)
    if (error) {
      setNameError(error)
      setDisplayName(previousNameRef.current)
      return
    }
    setNameError('')
    setDisplayName(trimmed)
    onUpdateProfile({ displayName: trimmed })
    localStorage.setItem('wr_user_name', trimmed)
    previousNameRef.current = trimmed

    // Show "Saved" indicator
    setNameSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setNameSaved(false), 2000)
  }

  function handleBioBlur() {
    onUpdateProfile({ bio })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <h2 className="text-base font-semibold text-white md:text-lg mb-6">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <ProfileAvatar
          avatarId={profile.avatarId}
          avatarUrl={profile.avatarUrl}
          displayName={displayName || userName || ''}
          userId={userId}
          size="sm"
          badges={badgeData}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-sm text-primary hover:text-primary-lt transition-colors min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
          aria-label="Change avatar"
        >
          Change
        </button>
      </div>

      <AvatarPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentAvatarId={profile.avatarId}
        currentAvatarUrl={profile.avatarUrl}
        badges={badgeData}
        displayName={displayName || userName || ''}
        userId={userId}
        onSave={(avatarId, avatarUrl) => {
          onUpdateProfile({ avatarId, avatarUrl })
        }}
      />

      {/* Display Name */}
      <div className="space-y-4">
        <div>
          <label htmlFor="settings-display-name" className="block text-sm font-medium text-white/80 mb-2">
            Display Name
          </label>
          <input
            id="settings-display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setNameError('')
              setNameSaved(false)
            }}
            onBlur={handleNameBlur}
            maxLength={NAME_MAX}
            className="w-full bg-white/10 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/50 focus-visible:outline-none min-h-[44px]"
            placeholder="Your display name"
          />
          <div className="mt-1 flex items-center justify-between">
            <div>
              {nameError && <p className="text-xs text-red-400" role="alert">{nameError}</p>}
              {nameSaved && <p className="text-xs text-green-400" aria-live="polite">Saved</p>}
            </div>
            <span className="text-xs text-white/40">{displayName.length}/{NAME_MAX}</span>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="settings-bio" className="block text-sm font-medium text-white/80 mb-2">
            Bio
          </label>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= BIO_MAX) setBio(e.target.value)
            }}
            onBlur={handleBioBlur}
            rows={3}
            className="w-full bg-white/10 border border-white/15 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary/50 focus-visible:outline-none resize-none"
            placeholder="Tell your friends a little about yourself..."
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-white/40">Your bio will appear on your profile (coming soon)</p>
            <span className="text-xs text-white/40">{bio.length}/{BIO_MAX}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
