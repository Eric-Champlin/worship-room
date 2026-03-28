import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function DailyHubSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      {/* Hero area */}
      <div className="px-4 pt-32 pb-8 text-center sm:pt-36 sm:pb-12 lg:pt-40">
        <div className="mx-auto max-w-3xl">
          <SkeletonBlock height={40} width="60%" className="mx-auto" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard className="sm:min-h-[140px]">
              <SkeletonText lines={3} />
            </SkeletonCard>
            <SkeletonCard className="sm:min-h-[140px]">
              <SkeletonText lines={2} />
            </SkeletonCard>
          </div>
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex justify-center gap-4 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} width={60} height={32} rounded="rounded-full" />
        ))}
      </div>
      {/* Content area */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SkeletonBlock height={120} className="mb-4" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} width={100} height={32} rounded="rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
