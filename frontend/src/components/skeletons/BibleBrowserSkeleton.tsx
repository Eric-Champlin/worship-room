import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonCard } from './SkeletonCard'

const OT_WIDTHS = ['85%', '72%', '90%', '78%', '82%', '88%']
const NT_WIDTHS = ['80%', '75%', '92%', '70%', '86%']

export function BibleBrowserSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Books/Search toggle */}
        <SkeletonBlock height={40} width="200px" className="mx-auto mb-6" rounded="rounded-lg" />
        {/* OT section */}
        <SkeletonCard className="mb-4">
          <SkeletonBlock height={24} width="160px" className="mb-4" />
          {OT_WIDTHS.map((width, i) => (
            <SkeletonBlock key={i} height={20} className="mb-2" width={width} />
          ))}
        </SkeletonCard>
        {/* NT section */}
        <SkeletonCard>
          <SkeletonBlock height={24} width="180px" className="mb-4" />
          {NT_WIDTHS.map((width, i) => (
            <SkeletonBlock key={i} height={20} className="mb-2" width={width} />
          ))}
        </SkeletonCard>
      </div>
    </div>
  )
}
