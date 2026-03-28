import { cn } from '@/lib/utils'

interface SkeletonBlockProps {
  width?: string | number
  height?: string | number
  rounded?: string
  className?: string
}

export function SkeletonBlock({
  width = '100%',
  height = 16,
  rounded = 'rounded-md',
  className,
}: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-white/[0.06] motion-safe:animate-shimmer', rounded, className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundImage:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}
