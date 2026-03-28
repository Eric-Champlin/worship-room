import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'
import { SkeletonCard } from './SkeletonCard'

export function SettingsSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar: 4 nav items */}
          <div className="w-full sm:w-[200px] lg:w-[240px] shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} height={40} className="mb-2" rounded="rounded-lg" />
            ))}
          </div>
          {/* Content area: 3 setting sections */}
          <div className="flex-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="mb-4">
                <SkeletonText lines={3} />
                <div className="mt-3 flex gap-4">
                  <SkeletonBlock width={44} height={24} rounded="rounded-full" />
                  <SkeletonBlock width={44} height={24} rounded="rounded-full" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
