import { SkeletonBlock } from './SkeletonBlock'

interface SkeletonCircleProps {
  size?: number
  className?: string
}

export function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      rounded="rounded-full"
      className={className}
    />
  )
}
