import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonText } from './SkeletonText'

const VERSE_WIDTHS = [
  '75%', '90%', '60%', '85%', '70%',
  '95%', '65%', '80%', '55%', '88%',
  '72%', '92%', '68%', '83%', '58%',
  '90%', '76%', '85%', '62%', '78%',
]

export function BibleReaderSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {VERSE_WIDTHS.map((width, i) => (
          <div key={i} className="mb-4 flex items-start gap-2">
            <SkeletonBlock width={16} height={12} rounded="rounded-sm" />
            <SkeletonText lines={2} lastLineWidth={width} className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
