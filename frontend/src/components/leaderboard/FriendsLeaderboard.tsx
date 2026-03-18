import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { useFriends } from '@/hooks/useFriends'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getWeeklyPoints, sortByWeeklyPoints, sortByTotalPoints } from '@/utils/leaderboard'
import { getActivityLog } from '@/services/faith-points-storage'
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

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="mb-4 text-white/50">Add friends to see your leaderboard</p>
        <Link
          to="/friends?tab=friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt"
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
