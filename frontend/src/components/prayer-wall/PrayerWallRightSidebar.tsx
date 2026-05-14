import { QotdSidebar } from '@/components/prayer-wall/QotdSidebar'
import { LocalSupportPromo } from '@/components/prayer-wall/LocalSupportPromo'
import { CommunityGuidelinesCard } from '@/components/prayer-wall/CommunityGuidelinesCard'

interface PrayerWallRightSidebarProps {
  qotdResponseCount: number
  qotdComposerOpen: boolean
  onToggleQotdComposer: () => void
  onScrollToQotdResponses: () => void
}

/**
 * Prayer Wall Redesign (2026-05-13) — right sidebar (desktop only) composing
 * QOTD widget + Local Support promo + Community Guidelines card.
 */
export function PrayerWallRightSidebar({
  qotdResponseCount,
  qotdComposerOpen,
  onToggleQotdComposer,
  onScrollToQotdResponses,
}: PrayerWallRightSidebarProps) {
  return (
    <aside
      aria-label="Prayer Wall secondary content"
      className="sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto flex flex-col gap-4 px-2 py-4"
    >
      <QotdSidebar
        responseCount={qotdResponseCount}
        isComposerOpen={qotdComposerOpen}
        onToggleComposer={onToggleQotdComposer}
        onScrollToResponses={onScrollToQotdResponses}
      />
      <LocalSupportPromo />
      <CommunityGuidelinesCard />
    </aside>
  )
}
