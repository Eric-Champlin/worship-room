import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  children?: React.ReactNode
  className?: string
}

export function SkeletonCard({ children, className }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-white/[0.06] border border-white/10 rounded-xl p-4',
        className
      )}
    >
      {children}
    </div>
  )
}
