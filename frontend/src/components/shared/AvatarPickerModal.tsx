import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { processAvatarPhoto } from '@/lib/avatar-utils'
import {
  AVATAR_PRESETS,
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  UNLOCKABLE_AVATARS,
} from '@/constants/dashboard/avatars'
import { BADGE_MAP } from '@/constants/dashboard/badges'
import { ProfileAvatar } from './ProfileAvatar'
import type { BadgeData } from '@/types/dashboard'

export interface AvatarPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarId: string
  currentAvatarUrl?: string
  badges: BadgeData
  onSave: (avatarId: string, avatarUrl?: string) => void
  displayName: string
  userId: string
}

type TabId = 'presets' | 'upload'

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarId,
  currentAvatarUrl,
  badges,
  onSave,
  displayName,
  userId,
}: AvatarPickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('presets')
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const containerRef = useFocusTrap(isOpen, onClose)

  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    setSaveError(null)
    try {
      if (activeTab === 'upload' && photoPreview) {
        onSave('custom', photoPreview)
      } else {
        onSave(selectedAvatarId)
      }
      onClose()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setSaveError('Unable to save avatar — storage is full. Try removing some data.')
      } else {
        setSaveError('Failed to save avatar. Please try again.')
      }
    }
  }, [activeTab, photoPreview, selectedAvatarId, onSave, onClose])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoError(null)
    setIsProcessing(true)

    try {
      const dataUrl = await processAvatarPhoto(file)
      setPhotoPreview(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to process photo.')
    } finally {
      setIsProcessing(false)
      // Reset the file input so re-selecting the same file triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  const handleRemovePhoto = useCallback(() => {
    setPhotoPreview(null)
    setPhotoError(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    setPhotoError(null)
    setIsProcessing(true)
    try {
      const dataUrl = await processAvatarPhoto(file)
      setPhotoPreview(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to process photo.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  // Build flat list of all selectable preset IDs for arrow key navigation
  const selectablePresetIds = useRef<string[]>([])
  useEffect(() => {
    const ids: string[] = AVATAR_PRESETS.map((p) => p.id)
    for (const u of UNLOCKABLE_AVATARS) {
      if (u.unlockCheck(badges)) ids.push(u.id)
    }
    selectablePresetIds.current = ids
  }, [badges])

  const handlePresetKeyDown = useCallback(
    (e: React.KeyboardEvent, currentId: string) => {
      const ids = selectablePresetIds.current
      const idx = ids.indexOf(currentId)
      if (idx === -1) return

      let nextIdx = -1
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextIdx = (idx + 1) % ids.length
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        nextIdx = (idx - 1 + ids.length) % ids.length
      }

      if (nextIdx >= 0) {
        setSelectedAvatarId(ids[nextIdx])
        // Focus the newly selected button
        const nextButton = document.querySelector<HTMLElement>(`[data-avatar-id="${ids[nextIdx]}"]`)
        nextButton?.focus()
      }
    },
    [],
  )

  if (!isOpen) return null

  const presetsByCategory = AVATAR_CATEGORIES.map((category) => ({
    category,
    label: AVATAR_CATEGORY_LABELS[category],
    presets: AVATAR_PRESETS.filter((p) => p.category === category),
  }))

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-labelledby="avatar-picker-title"
        aria-modal="true"
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[500px] lg:max-w-[560px] sm:w-full max-h-[90vh] overflow-y-auto bg-hero-mid border border-white/15 rounded-2xl shadow-xl motion-safe:animate-dropdown-in"
      >
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 id="avatar-picker-title" className="text-xl font-bold text-white">
              Choose Your Avatar
            </h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
              aria-label="Close avatar picker"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Avatar selection method" className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
            <button
              role="tab"
              id="tab-presets"
              aria-selected={activeTab === 'presets'}
              aria-controls="panel-presets"
              onClick={() => setActiveTab('presets')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                activeTab === 'presets' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70',
              )}
            >
              Presets
            </button>
            <button
              role="tab"
              id="tab-upload"
              aria-selected={activeTab === 'upload'}
              aria-controls="panel-upload"
              onClick={() => setActiveTab('upload')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                activeTab === 'upload' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70',
              )}
            >
              Upload Photo
            </button>
          </div>

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div role="tabpanel" id="panel-presets" aria-labelledby="tab-presets">
              {/* Preview */}
              <div className="flex justify-center mb-4">
                <ProfileAvatar
                  avatarId={selectedAvatarId}
                  displayName={displayName}
                  userId={userId}
                  size="sm"
                  badges={badges}
                />
              </div>

              {/* Save error */}
              {saveError && (
                <p className="text-sm text-red-400 text-center mb-3" role="alert">
                  {saveError}
                </p>
              )}

              {/* Category sections */}
              <div role="radiogroup" aria-label="Avatar presets">
                {presetsByCategory.map(({ category, label, presets }) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                      {label}
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {presets.map((preset) => {
                        const isSelected = selectedAvatarId === preset.id
                        return (
                          <button
                            key={preset.id}
                            data-avatar-id={preset.id}
                            onClick={() => setSelectedAvatarId(preset.id)}
                            onKeyDown={(e) => handlePresetKeyDown(e, preset.id)}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={isSelected ? 0 : -1}
                            className={cn(
                              'flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                              isSelected
                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-hero-mid'
                                : 'hover:bg-white/5',
                            )}
                            aria-label={`${preset.name} avatar`}
                          >
                            <div
                              className="h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: preset.bgColor }}
                            >
                              <preset.icon className="h-7 w-7 text-white" />
                            </div>
                            <span className="text-xs text-white/60 truncate max-w-full">
                              {preset.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Unlockable section */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                    Unlockable Avatars
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {UNLOCKABLE_AVATARS.map((avatar) => {
                      const isUnlocked = avatar.unlockCheck(badges)
                      const requirement = getUnlockRequirement(avatar.requiredBadgeId)
                      const isSelected = isUnlocked && selectedAvatarId === avatar.id
                      return (
                        <button
                          key={avatar.id}
                          data-avatar-id={avatar.id}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedAvatarId(avatar.id)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (isUnlocked) handlePresetKeyDown(e, avatar.id)
                          }}
                          disabled={!isUnlocked}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected ? 0 : isUnlocked ? -1 : undefined}
                          className={cn(
                            'flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-2 ring-offset-hero-mid'
                              : isUnlocked
                                ? 'hover:bg-white/5'
                                : 'opacity-50 cursor-not-allowed',
                          )}
                          aria-label={isUnlocked ? `${avatar.name} avatar` : `${avatar.name} — ${requirement}`}
                          title={isUnlocked ? avatar.name : requirement}
                        >
                          <div
                            className={cn(
                              'h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 relative',
                              !isUnlocked && 'grayscale bg-white/10',
                            )}
                            style={isUnlocked ? { background: avatar.gradient } : undefined}
                          >
                            <avatar.icon className={cn('h-7 w-7', isUnlocked ? 'text-white drop-shadow-md' : 'text-white/40')} />
                            {!isUnlocked && (
                              <div className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-white/20 p-0.5">
                                <Lock className="h-3 w-3 text-white/60" />
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-white/60 truncate max-w-full">
                            {avatar.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                className="w-full bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
              >
                Save
              </button>
            </div>
          )}

          {/* Upload Photo Tab */}
          {activeTab === 'upload' && (
            <div role="tabpanel" id="panel-upload" aria-labelledby="tab-upload">
              {/* Preview */}
              <div className="flex justify-center mb-4">
                <ProfileAvatar
                  avatarId={photoPreview ? 'custom' : currentAvatarId}
                  avatarUrl={photoPreview ?? currentAvatarUrl}
                  displayName={displayName}
                  userId={userId}
                  size="md"
                  badges={badges}
                />
              </div>

              {/* Error message */}
              {photoError && (
                <p className="text-sm text-red-400 text-center mb-3" role="alert">
                  {photoError}
                </p>
              )}

              {/* File input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload avatar photo"
              />

              {/* Choose File button */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-white/10 text-white border border-white/20 rounded-lg py-3 px-6 hover:bg-white/15 transition-colors disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                >
                  <Upload className="h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>

                {/* Desktop drag-and-drop zone */}
                <div
                  className="hidden sm:flex w-full border-2 border-dashed border-white/20 rounded-xl p-8 items-center justify-center text-white/60 text-sm"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  or drag and drop an image here
                </div>
              </div>

              {/* Save error */}
              {saveError && (
                <p className="mt-3 text-sm text-red-400 text-center" role="alert">
                  {saveError}
                </p>
              )}

              {/* Action buttons */}
              <div className="mt-4 flex flex-col gap-2">
                {photoPreview && (
                  <button
                    onClick={handleSave}
                    className="w-full bg-primary text-white font-semibold py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                  >
                    Use This Photo
                  </button>
                )}

                {(currentAvatarId === 'custom' || photoPreview) && (
                  <button
                    onClick={handleRemovePhoto}
                    className="w-full text-white/50 hover:text-white text-sm py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getUnlockRequirement(requiredBadgeId: string | string[]): string {
  if (Array.isArray(requiredBadgeId)) {
    return 'Earn all streak milestones'
  }
  const badge = BADGE_MAP[requiredBadgeId]
  return badge ? badge.description : 'Complete a special achievement'
}
