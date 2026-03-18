import { cn } from '@/lib/utils'

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-white/10', className)} aria-hidden="true" />
}

export function SkeletonCircle({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-white/10', className)} aria-hidden="true" />
}
