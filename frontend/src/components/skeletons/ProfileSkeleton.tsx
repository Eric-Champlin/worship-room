import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonCircle } from './SkeletonCircle'
import { SkeletonCard } from './SkeletonCard'

export function ProfileSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Profile header */}
        <SkeletonCard className="mb-6">
          <div className="flex items-center gap-4">
            <SkeletonCircle size={80} />
            <div className="flex-1">
              <SkeletonBlock height={24} width="50%" className="mb-2" />
              <SkeletonBlock height={16} width="30%" />
            </div>
          </div>
        </SkeletonCard>
        {/* Badge grid */}
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCircle key={i} size={48} />
          ))}
        </div>
      </div>
    </div>
  )
}
