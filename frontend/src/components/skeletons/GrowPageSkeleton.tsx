import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function GrowPageSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Tab bar: 2 pills */}
        <div className="flex gap-4 mb-6">
          <SkeletonBlock width={100} height={36} rounded="rounded-full" />
          <SkeletonBlock width={120} height={36} rounded="rounded-full" />
        </div>
        {/* Create Your Own Plan CTA */}
        <SkeletonCard className="mb-6">
          <SkeletonText lines={2} lastLineWidth="50%" />
        </SkeletonCard>
        {/* Filter pills row */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} width={70} height={28} rounded="rounded-full" />
          ))}
        </div>
        {/* 2x2 plan card grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i}>
              <SkeletonText lines={3} />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  )
}
