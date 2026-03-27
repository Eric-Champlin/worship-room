import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { useFriends } from '@/hooks/useFriends'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getWeeklyPoints, sortByWeeklyPoints, sortByTotalPoints } from '@/utils/leaderboard'
import { getActivityLog } from '@/services/faith-points-storage'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { TimeToggle, type TimeRange } from './TimeToggle'
import { LeaderboardRow } from './LeaderboardRow'

export function FriendsLeaderboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly')
  const [, setSearchParams] = useSearchParams()
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
      <FeatureEmptyState
        icon={Trophy}
        heading="Friendly accountability"
        description="Add friends to see how you encourage each other. No pressure — just love."
        ctaLabel="Find friends"
        onCtaClick={() => setSearchParams({ tab: 'friends' })}
      />
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
