import { SkeletonBlock } from './SkeletonBlock'

export function BibleLandingSkeleton() {
  return (
    <div aria-busy="true" className="min-h-screen bg-dashboard-dark">
      <span className="sr-only">Loading</span>
      {/* Hero placeholder */}
      <div className="flex flex-col items-center px-4 pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40">
        <SkeletonBlock height={48} width="280px" className="mb-2" />
        <SkeletonBlock height={48} width="220px" className="mb-4" />
        <SkeletonBlock height={20} width="360px" />
      </div>
      {/* Cards area */}
      <div className="mx-auto max-w-4xl space-y-8 px-4 pb-16">
        {/* Resume + Plan cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonBlock height={120} className="rounded-2xl" />
          <SkeletonBlock height={120} className="rounded-2xl" />
        </div>
        {/* VOTD */}
        <div className="mx-auto max-w-2xl">
          <SkeletonBlock height={160} className="rounded-2xl" />
        </div>
        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonBlock height={100} className="rounded-2xl" />
          <SkeletonBlock height={100} className="rounded-2xl" />
          <SkeletonBlock height={100} className="rounded-2xl" />
        </div>
        {/* Search */}
        <div className="mx-auto max-w-2xl">
          <SkeletonBlock height={48} className="rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** @deprecated Use BibleLandingSkeleton. Kept for /bible/browse route fallback. */
export const BibleBrowserSkeleton = BibleLandingSkeleton
