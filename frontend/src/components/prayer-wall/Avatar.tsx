import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  '#6D28D9',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#BE185D',
]

function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const

interface AvatarProps {
  firstName: string
  lastName: string
  avatarUrl: string | null
  size?: 'sm' | 'md' | 'lg'
  isAnonymous?: boolean
  userId?: string
  className?: string
  alt?: string
}

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  isAnonymous = false,
  userId = '',
  className,
  alt = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const baseClasses = cn(
    'rounded-full flex items-center justify-center flex-shrink-0',
    SIZE_CLASSES[size],
    className,
  )

  if (isAnonymous) {
    return (
      <div className={cn(baseClasses, 'bg-gray-200')} aria-hidden="true">
        <User className="h-1/2 w-1/2 text-gray-500" />
      </div>
    )
  }

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={alt}
        className={cn(baseClasses, 'object-cover')}
        onError={() => setImgError(true)}
      />
    )
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const bgColor = getAvatarColor(userId || firstName)

  return (
    <div
      className={cn(baseClasses, 'font-semibold text-white')}
      style={{ backgroundColor: bgColor }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}
