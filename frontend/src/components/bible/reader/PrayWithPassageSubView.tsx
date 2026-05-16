import { POST_TYPES, type PostType } from '@/constants/post-types'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

interface PrayWithPassageSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

/**
 * Spec 7.1 — sub-view for the "Pray with this passage" verse action.
 * Renders 5 post-type buttons. On tap, navigates the user to the Prayer Wall
 * with the selected post type and the verse pre-filled into the composer.
 *
 * The URL emits the reference using hyphen-minus for ranges (NOT formatReference's
 * en-dash) because parseReference at the receiving end requires hyphen-minus.
 *
 * `onBack` is accepted per the `renderSubView` contract but not read —
 * sheet-level back navigation is handled by VerseActionSheet's sub-view
 * header chrome.
 */
export function PrayWithPassageSubView({
  selection,
  onBack: _onBack,
  context,
}: PrayWithPassageSubViewProps) {
  // Build the reference with hyphen-minus for ranges. Mirrors formatReference's
  // structure but emits an ASCII hyphen so parseReference at the receiving end
  // can resolve it.
  const reference =
    selection.startVerse === selection.endVerse
      ? `${selection.bookName} ${selection.chapter}:${selection.startVerse}`
      : `${selection.bookName} ${selection.chapter}:${selection.startVerse}-${selection.endVerse}`

  const handleSelect = (postType: PostType) => {
    const url = `/prayer-wall?compose=${encodeURIComponent(postType)}&scripture=${encodeURIComponent(reference)}`
    context?.closeSheet({ navigating: true })
    context?.navigate(url)
  }

  return (
    <div className="px-2 py-2">
      <p className="px-3 py-2 text-sm text-white/60">
        Take this passage to the Prayer Wall.
      </p>
      <div className="flex flex-col gap-1">
        {POST_TYPES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => handleSelect(entry.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 min-h-[44px] text-left text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <span className="text-sm text-white">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
