import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials, getInitialsColor } from '@/lib/avatar-utils'
import {
  getAvatarById,
  isUnlockableAvatar,
  isPresetAvatar,
} from '@/constants/dashboard/avatars'
import type { BadgeData } from '@/types/dashboard'

export interface ProfileAvatarProps {
  avatarId: string
  avatarUrl?: string
  displayName: string
  userId: string
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  badges?: BadgeData
  'aria-hidden'?: boolean
}

const SIZE_CLASSES: Record<ProfileAvatarProps['size'], string> = {
  xs: 'h-10 w-10',
  sm: 'h-20 w-20',
  md: 'h-[120px] w-[120px]',
  lg: 'h-[140px] w-[140px]',
  xl: 'h-[160px] w-[160px]',
}

const ICON_SIZE_CLASSES: Record<ProfileAvatarProps['size'], string> = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
  xl: 'h-16 w-16',
}

const INITIALS_TEXT_SIZE: Record<ProfileAvatarProps['size'], string> = {
  xs: 'text-sm',
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
}

const LOCK_SIZE_CLASSES: Record<ProfileAvatarProps['size'], string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-6 w-6',
}

export function ProfileAvatar({
  avatarId,
  avatarUrl,
  displayName,
  userId,
  size,
  className,
  badges,
  'aria-hidden': ariaHidden,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const baseClasses = cn(
    'rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
    SIZE_CLASSES[size],
    className,
  )

  const ariaProps = ariaHidden
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': `${displayName}'s avatar` }

  // 1. Custom photo
  if (avatarId === 'custom' && avatarUrl && !imgError) {
    return (
      <div className={baseClasses} {...ariaProps}>
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  const avatar = getAvatarById(avatarId)

  // 2. Unlockable avatar (unlocked)
  if (avatar && isUnlockableAvatar(avatar)) {
    const isUnlocked = badges ? avatar.unlockCheck(badges) : false

    if (isUnlocked) {
      const Icon = avatar.icon
      return (
        <div
          className={baseClasses}
          style={{ background: avatar.gradient }}
          {...ariaProps}
        >
          <Icon className={cn(ICON_SIZE_CLASSES[size], 'text-white drop-shadow-md')} />
        </div>
      )
    }

    // 4. Locked unlockable — grayscale with lock overlay
    const Icon = avatar.icon
    return (
      <div
        className={cn(baseClasses, 'relative bg-white/10 grayscale')}
        {...ariaProps}
      >
        <Icon className={cn(ICON_SIZE_CLASSES[size], 'text-white/40')} />
        <div className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-white/20 p-0.5">
          <Lock className={cn(LOCK_SIZE_CLASSES[size], 'text-white/60')} />
        </div>
      </div>
    )
  }

  // 3. Preset avatar
  if (avatar && isPresetAvatar(avatar)) {
    const Icon = avatar.icon
    return (
      <div
        className={baseClasses}
        style={{ backgroundColor: avatar.bgColor }}
        {...ariaProps}
      >
        <Icon className={cn(ICON_SIZE_CLASSES[size], 'text-white')} />
      </div>
    )
  }

  // 5. Fallback — initials
  const initials = getInitials(displayName)
  const bgColor = getInitialsColor(userId)

  return (
    <div
      className={cn(baseClasses, INITIALS_TEXT_SIZE[size], 'font-bold text-white')}
      style={{ backgroundColor: bgColor }}
      {...ariaProps}
    >
      {initials}
    </div>
  )
}
