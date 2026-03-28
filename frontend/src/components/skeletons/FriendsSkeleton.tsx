import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonCard } from './SkeletonCard'

export function FriendsSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Tab bar: 2 pills */}
        <div className="flex gap-4 mb-6">
          <SkeletonBlock width={80} height={36} rounded="rounded-full" />
          <SkeletonBlock width={120} height={36} rounded="rounded-full" />
        </div>
        {/* Search input */}
        <SkeletonBlock height={44} className="mb-6" rounded="rounded-lg" />
        {/* 5 friend cards */}
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} className="mb-3">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={44} />
              <SkeletonBlock height={16} width="40%" className="flex-1" />
              <SkeletonBlock width={80} height={32} rounded="rounded-lg" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  )
}
