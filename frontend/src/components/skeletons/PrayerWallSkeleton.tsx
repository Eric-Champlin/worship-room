import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonCard } from './SkeletonCard'

export function PrayerWallSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-3xl px-4 pt-8">
        {/* Composer card */}
        <SkeletonCard className="mb-4">
          <SkeletonText lines={2} />
        </SkeletonCard>
        {/* Category filter pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} width={80} height={32} rounded="rounded-full" />
          ))}
        </div>
        {/* 4 prayer cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-4">
            <div className="flex items-start gap-3">
              <SkeletonCircle size={40} />
              <div className="flex-1">
                <SkeletonText lines={2} lastLineWidth="80%" />
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} width={60} height={20} />
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}
