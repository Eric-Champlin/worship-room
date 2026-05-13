/**
 * Spec 6.5 D-Copy — summary line formatters for the Intercessor Timeline.
 *
 * Pastor's-wife voice: no exclamation, no leaderboard framing, "praying"
 * not "prayed for" (present-tense, ongoing intercession).
 *
 * Anonymous singletons read as "Someone is praying anonymously" rather than
 * "Anonymous is praying" — the indefinite "Someone" reads as warmer than the
 * literal display name in the singular case.
 */

export interface SummaryLineEntry {
  displayName: string
  isAnonymous: boolean
}

export function formatSummaryLine(
  count: number,
  firstThree: SummaryLineEntry[],
): string {
  if (count === 0) return 'No one has prayed for this yet'

  // Fallback when count > 0 but firstThree is empty — happens when
  // `intercessorSummary` is null (non-feed surfaces like getById, or before
  // the feed query has populated the summary). Count-only copy avoids a
  // crash while still surfacing presence.
  if (firstThree.length === 0) {
    return count === 1
      ? 'Someone is praying'
      : `${count} people are praying`
  }

  if (count === 1) {
    const only = firstThree[0]
    if (only.isAnonymous) return 'Someone is praying anonymously'
    return `${only.displayName} is praying`
  }

  if (count === 2) {
    if (firstThree.length < 2) {
      return `${firstThree[0].displayName} and 1 other are praying`
    }
    return `${firstThree[0].displayName} and ${firstThree[1].displayName} are praying`
  }

  if (count === 3) {
    if (firstThree.length < 3) {
      const remaining = count - firstThree.length
      const names = firstThree.map((e) => e.displayName).join(', ')
      return `${names}, and ${remaining} other${remaining === 1 ? '' : 's'} are praying`
    }
    return `${firstThree[0].displayName}, ${firstThree[1].displayName}, and ${firstThree[2].displayName} are praying`
  }

  // count >= 4: cap at three named + "and N others"
  const remaining = count - firstThree.length
  const names = firstThree
    .slice(0, 3)
    .map((e) => e.displayName)
    .join(', ')
  if (remaining === 0) {
    // firstThree has all of them already (count was 4 but firstThree has 4? defensive)
    return `${names} are praying`
  }
  return `${names}, and ${remaining} other${remaining === 1 ? '' : 's'} are praying`
}
