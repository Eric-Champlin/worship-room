import { cn } from '@/lib/utils'
import { SkeletonBlock } from './SkeletonBlock'

interface SkeletonTextProps {
  lines?: number
  gap?: string
  lastLineWidth?: string
  className?: string
}

export function SkeletonText({
  lines = 3,
  gap = 'gap-2',
  lastLineWidth = '60%',
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn('flex flex-col', gap, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}
