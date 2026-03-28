import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonCard } from './SkeletonCard'

export function MusicSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Tab bar: 3 pills */}
        <div className="flex gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} width={90} height={36} rounded="rounded-full" />
          ))}
        </div>
        {/* Hero playlist card */}
        <SkeletonCard className="mb-6">
          <SkeletonBlock height={200} />
        </SkeletonCard>
        {/* 2x2 playlist grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i}>
              <SkeletonBlock height={120} />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  )
}
