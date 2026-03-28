import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function InsightsSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Time range selector pills */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} width={60} height={32} rounded="rounded-full" />
          ))}
        </div>
        {/* Large chart area */}
        <SkeletonCard className="mb-6">
          <SkeletonBlock height={300} />
        </SkeletonCard>
        {/* 3 AI insight cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-4">
            <SkeletonText lines={3} />
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}
