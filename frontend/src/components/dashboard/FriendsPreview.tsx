import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useFriends } from '@/hooks/useFriends'
import { sortByWeeklyPoints, getWeeklyPoints } from '@/utils/leaderboard'
import { getActivityLog, getFaithPoints } from '@/services/faith-points-storage'
import { getLocalDateString, getYesterdayDateString } from '@/utils/date'
import { splitDisplayName } from '@/components/friends/utils'
import { MilestoneFeed } from '@/components/social/MilestoneFeed'
import { CircleNetwork } from './CircleNetwork'

const RANK_COLORS: Record<number, string> = {
  1: 'text-medal-gold',
  2: 'text-medal-silver',
  3: 'text-medal-bronze',
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

  // "You vs. Yesterday" data — used in empty state
  const youVsYesterday = useMemo(() => {
    const activities = getActivityLog()
    const todayKey = getLocalDateString()
    const yesterdayKey = getYesterdayDateString()
    const todayPts = activities[todayKey]?.pointsEarned ?? 0
    const yesterdayPts = activities[yesterdayKey]?.pointsEarned ?? 0
    return { todayPts, yesterdayPts }
  }, [])

  if (friends.length === 0) {
    const { todayPts, yesterdayPts } = youVsYesterday
    const arrow = todayPts > yesterdayPts ? '↑' : todayPts < yesterdayPts ? '↓' : '→'

    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CircleNetwork size="small" />
        <p className="text-sm text-white/60">Faith grows stronger together</p>
        <Link
          to="/friends?tab=friends"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite a friend
        </Link>

        {/* You vs. Yesterday */}
        <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">You vs. Yesterday</p>
          <div className="flex items-center justify-center gap-4 text-sm text-white/70">
            <span>Today: {todayPts} pts</span>
            <span className="text-lg" aria-label={todayPts > yesterdayPts ? 'Up from yesterday' : todayPts < yesterdayPts ? 'Down from yesterday' : 'Same as yesterday'}>
              {arrow}
            </span>
            <span>Yesterday: {yesterdayPts} pts</span>
          </div>
        </div>
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
            {isUser ? (
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/40 text-[10px] font-semibold text-white"
                aria-hidden="true"
              >
                {first.charAt(0)}{last.charAt(0)}
              </div>
            ) : (
              <Link to={`/profile/${entry.id}`} className="flex-shrink-0">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/40 text-[10px] font-semibold text-white"
                  aria-hidden="true"
                >
                  {first.charAt(0)}{last.charAt(0)}
                </div>
              </Link>
            )}
            {isUser ? (
              <span className="min-w-0 max-w-[120px] flex-1 truncate text-sm font-medium text-white">
                You
              </span>
            ) : (
              <Link
                to={`/profile/${entry.id}`}
                className="min-w-0 max-w-[120px] flex-1 truncate text-sm font-medium text-white hover:underline"
              >
                {entry.displayName}
              </Link>
            )}
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
