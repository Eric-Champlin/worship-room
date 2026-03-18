import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useFriends } from '@/hooks/useFriends'
import { sortByWeeklyPoints, getWeeklyPoints } from '@/utils/leaderboard'
import { getActivityLog, getFaithPoints } from '@/services/faith-points-storage'
import { splitDisplayName } from '@/components/friends/utils'
import { MilestoneFeed } from '@/components/social/MilestoneFeed'

const RANK_COLORS: Record<number, string> = {
  1: 'text-[#FFD700]',
  2: 'text-[#C0C0C0]',
  3: 'text-[#CD7F32]',
}

export function FriendsPreview() {
  const { friends } = useFriends()

  // Compute current user rank among friends
  const { topThree, userRank, userWeeklyPoints } = useMemo(() => {
    if (friends.length === 0) {
      return { topThree: [], userRank: 0, userWeeklyPoints: 0 }
    }

    const activities = getActivityLog()
    const weeklyPts = getWeeklyPoints(activities)
    const fp = getFaithPoints()

    // Create a combined list with user
    const userEntry = {
      id: '__current_user__',
      displayName: 'You',
      weeklyPoints: weeklyPts,
      faithPoints: fp.totalPoints,
    }

    const allEntries = [...friends.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      weeklyPoints: f.weeklyPoints,
      faithPoints: f.faithPoints,
    })), userEntry]

    const sorted = sortByWeeklyPoints(allEntries)
    const rank = sorted.findIndex((e) => e.id === '__current_user__') + 1
    const top = sorted.slice(0, 3)

    return { topThree: top, userRank: rank, userWeeklyPoints: weeklyPts }
  }, [friends])

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <p className="mb-3 text-sm text-white/50">Add friends to see your leaderboard</p>
        <Link
          to="/friends?tab=friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite a friend
        </Link>
      </div>
    )
  }

  const userInTopThree = userRank <= 3

  return (
    <div className="space-y-3">
      {/* Top 3 ranked by weekly points */}
      {topThree.map((entry, index) => {
        const rank = index + 1
        const rankColor = RANK_COLORS[rank] || 'text-white/70'
        const isUser = entry.id === '__current_user__'
        const { first, last } = splitDisplayName(entry.displayName)

        return (
          <div key={entry.id} className="flex items-center gap-2">
            <span className={`min-w-[24px] text-xs font-bold ${rankColor}`}>#{rank}</span>
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/40 text-[10px] font-semibold text-white"
              aria-hidden="true"
            >
              {first.charAt(0)}{last.charAt(0)}
            </div>
            <span className="min-w-0 max-w-[120px] flex-1 truncate text-sm font-medium text-white">
              {isUser ? 'You' : entry.displayName}
            </span>
            <span className="text-xs text-white/50">{entry.weeklyPoints} pts</span>
          </div>
        )
      })}

      {/* Current user position if not in top 3 */}
      {!userInTopThree && (
        <>
          <div className="border-t border-white/10 my-2" />
          <p className="text-sm text-white/70">
            You &middot; #{userRank} &middot; {userWeeklyPoints} pts
          </p>
        </>
      )}

      {/* Milestone feed */}
      <div className="border-t border-white/10 my-2" />
      <MilestoneFeed maxItems={3} />
    </div>
  )
}
