import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function MyPrayersSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Composer card */}
        <SkeletonCard className="mb-6">
          <SkeletonText lines={2} />
        </SkeletonCard>
        {/* 4 prayer cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-4">
            <SkeletonText lines={2} lastLineWidth="70%" />
            <div className="mt-3 flex gap-2">
              <SkeletonBlock width={80} height={24} rounded="rounded-full" />
              <SkeletonBlock width={70} height={24} rounded="rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}
