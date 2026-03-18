import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { useFriends } from '@/hooks/useFriends'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getWeeklyPoints, sortByWeeklyPoints, sortByTotalPoints } from '@/utils/leaderboard'
import { getActivityLog } from '@/services/faith-points-storage'
import { getLocalDateString, getYesterdayDateString } from '@/utils/date'
import { TimeToggle, type TimeRange } from './TimeToggle'
import { LeaderboardRow } from './LeaderboardRow'

export function FriendsLeaderboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const { friends } = useFriends()
  const { user } = useAuth()
  const faithPoints = useFaithPoints()

  // Compute current user's weekly points from activity log
  const currentUserWeeklyPoints = useMemo(() => {
    const activities = getActivityLog()
    return getWeeklyPoints(activities)
  }, [])

  // Build current user as FriendProfile
  const currentUserEntry: FriendProfile | null = useMemo(() => {
    if (!user) return null
    return {
      id: user.id,
      displayName: user.name,
      avatar: '',
      level: faithPoints.currentLevel,
      levelName: faithPoints.levelName,
      currentStreak: faithPoints.currentStreak,
      faithPoints: faithPoints.totalPoints,
      weeklyPoints: currentUserWeeklyPoints,
      lastActive: new Date().toISOString(),
    }
  }, [user, faithPoints.currentLevel, faithPoints.levelName, faithPoints.currentStreak, faithPoints.totalPoints, currentUserWeeklyPoints])

  // Combine friends + current user, then sort
  const rankedEntries = useMemo(() => {
    const all = currentUserEntry ? [...friends, currentUserEntry] : [...friends]
    return timeRange === 'weekly' ? sortByWeeklyPoints(all) : sortByTotalPoints(all)
  }, [friends, currentUserEntry, timeRange])

  // "You vs. Yesterday" data for empty state
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
      <div className="flex flex-col items-center gap-6 py-8">
        {/* You vs. Yesterday (full-width) */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50">You vs. Yesterday</p>
          <div className="flex items-center justify-center gap-6 text-white/70">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{todayPts}</p>
              <p className="text-xs text-white/50">Today</p>
            </div>
            <span className="text-2xl" aria-label={todayPts > yesterdayPts ? 'Up from yesterday' : todayPts < yesterdayPts ? 'Down from yesterday' : 'Same as yesterday'}>
              {arrow}
            </span>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{yesterdayPts}</p>
              <p className="text-xs text-white/50">Yesterday</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/50">Your friends will appear here. In the meantime, compete with yourself!</p>

        <Link
          to="/friends?tab=friends"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite friends
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Time toggle */}
      <div className="flex justify-end">
        <TimeToggle activeRange={timeRange} onRangeChange={setTimeRange} />
      </div>

      {/* Ranked list */}
      <ol className="space-y-1" aria-label="Friends leaderboard">
        {rankedEntries.map((entry, index) => (
          <LeaderboardRow
            key={entry.id}
            rank={index + 1}
            friend={entry}
            isCurrentUser={entry.id === user?.id}
            metric={timeRange === 'weekly' ? 'weekly' : 'allTime'}
            index={index}
            showEncourage
          />
        ))}
      </ol>
    </div>
  )
}
