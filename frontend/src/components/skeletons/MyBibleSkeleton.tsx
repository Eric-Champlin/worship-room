import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function MyBibleSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="min-h-screen bg-dashboard-dark">
        {/* Hero placeholder */}
        <div className="px-4 pb-8 pt-24 text-center">
          <SkeletonBlock width={180} height={36} className="mx-auto" />
          <SkeletonBlock width={260} height={28} className="mx-auto mt-2" />
          <SkeletonBlock width={300} height={16} className="mx-auto mt-4" />
        </div>

        <div className="mx-auto max-w-2xl px-4">
          {/* Stats row */}
          <div className="flex justify-center gap-3 py-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} width={100} height={80} rounded="rounded-xl" />
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} width={80} height={32} rounded="rounded-full" />
            ))}
          </div>

          {/* Activity cards */}
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="mb-3">
              <div className="flex items-center gap-2">
                <SkeletonBlock width={16} height={16} rounded="rounded" />
                <SkeletonBlock width={120} height={16} />
                <div className="ml-auto">
                  <SkeletonBlock width={60} height={12} />
                </div>
              </div>
              <SkeletonText lines={2} className="mt-3" lastLineWidth="60%" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  )
}
