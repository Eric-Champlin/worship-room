import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonCard } from './SkeletonCard'

export function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      {/* Hero section */}
      <div className="px-4 pt-24 pb-6 md:pt-28 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <SkeletonText lines={2} lastLineWidth="40%" />
        </div>
      </div>
      {/* Widget grid */}
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
          {/* Garden: large block */}
          <div className="lg:col-span-3">
            <SkeletonCard className="rounded-2xl">
              <SkeletonBlock height={200} rounded="rounded-2xl" />
            </SkeletonCard>
          </div>
          {/* Streak card */}
          <div className="lg:col-span-2">
            <SkeletonCard className="rounded-2xl">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={48} />
                <SkeletonText lines={2} lastLineWidth="80%" />
              </div>
            </SkeletonCard>
          </div>
          {/* Mood chart */}
          <div className="lg:col-span-3">
            <SkeletonCard className="rounded-2xl">
              <SkeletonBlock height={180} />
            </SkeletonCard>
          </div>
          {/* Activity checklist */}
          <div className="lg:col-span-2">
            <SkeletonCard className="rounded-2xl">
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonCircle size={24} />
                    <SkeletonBlock height={16} width="70%" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>
          {/* Two generic widget cards */}
          <div className="lg:col-span-3">
            <SkeletonCard className="rounded-2xl">
              <SkeletonText lines={3} />
            </SkeletonCard>
          </div>
          <div className="lg:col-span-2">
            <SkeletonCard className="rounded-2xl">
              <SkeletonText lines={3} />
            </SkeletonCard>
          </div>
        </div>
      </div>
    </div>
  )
}
