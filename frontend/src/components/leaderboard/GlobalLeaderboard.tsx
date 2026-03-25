import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import type { LeaderboardEntry } from '@/types/dashboard'
import { getGlobalLeaderboard } from '@/services/leaderboard-storage'
import { getWeeklyPoints } from '@/utils/leaderboard'
import { getActivityLog } from '@/services/faith-points-storage'
import { getOrInitBadgeData } from '@/services/badge-storage'
import { GlobalRow } from './GlobalRow'
import { ProfilePopup } from './ProfilePopup'

const BATCH_SIZE = 50

export function GlobalLeaderboard() {
  const { user } = useAuth()
  const faithPoints = useFaithPoints()
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const [popupEntryId, setPopupEntryId] = useState<string | null>(null)

  // Compute current user's weekly points
  const currentUserWeeklyPoints = useMemo(() => {
    const activities = getActivityLog()
    return getWeeklyPoints(activities)
  }, [])

  // Build current user as LeaderboardEntry
  const currentUserEntry: LeaderboardEntry | null = useMemo(() => {
    if (!user) return null
    const badgeData = getOrInitBadgeData(true)
    return {
      id: user.id,
      displayName: user.name,
      weeklyPoints: currentUserWeeklyPoints,
      totalPoints: faithPoints.totalPoints,
      level: faithPoints.currentLevel,
      levelName: faithPoints.levelName,
      badgeCount: Object.keys(badgeData.earned).length,
    }
  }, [user, currentUserWeeklyPoints, faithPoints.totalPoints, faithPoints.currentLevel, faithPoints.levelName])

  // Sort global entries + insert current user at correct rank
  const { sortedEntries, userRank } = useMemo(() => {
    const globalData = getGlobalLeaderboard()

    // Sort by weekly points descending, then total points, then name alphabetically
    const sorted = [...globalData].sort((a, b) => {
      if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      return a.displayName.localeCompare(b.displayName)
    })

    if (!currentUserEntry) {
      return { sortedEntries: sorted, userRank: -1 }
    }

    // Find where the user would slot in
    let insertIdx = sorted.length
    for (let i = 0; i < sorted.length; i++) {
      if (
        currentUserEntry.weeklyPoints > sorted[i].weeklyPoints ||
        (currentUserEntry.weeklyPoints === sorted[i].weeklyPoints &&
          currentUserEntry.totalPoints > sorted[i].totalPoints) ||
        (currentUserEntry.weeklyPoints === sorted[i].weeklyPoints &&
          currentUserEntry.totalPoints === sorted[i].totalPoints &&
          currentUserEntry.displayName.localeCompare(sorted[i].displayName) < 0)
      ) {
        insertIdx = i
        break
      }
    }

    const withUser = [...sorted]
    withUser.splice(insertIdx, 0, currentUserEntry)

    return { sortedEntries: withUser, userRank: insertIdx + 1 }
  }, [currentUserEntry])

  const visibleEntries = sortedEntries.slice(0, visibleCount)
  const allLoaded = visibleCount >= sortedEntries.length
  const userInVisibleRange = userRank > 0 && userRank <= visibleCount
  const showPinnedRow = currentUserEntry && !userInVisibleRange

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + BATCH_SIZE)
  }, [])

  const handleRowClick = useCallback((entryId: string) => {
    setPopupEntryId((prev) => (prev === entryId ? null : entryId))
  }, [])

  const handlePopupClose = useCallback(() => {
    setPopupEntryId(null)
  }, [])

  // Find the popup entry
  const popupEntry = popupEntryId ? sortedEntries.find((e) => e.id === popupEntryId) : null

  return (
    <div className="space-y-4">
      {/* Pinned user row */}
      {showPinnedRow && currentUserEntry && (
        <div className="border-t border-b border-white/10 py-2">
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
            <span className="min-w-[40px] text-center text-lg font-bold text-white/70">
              {userRank}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-white">
              {currentUserEntry.displayName} (You)
            </span>
            <span className="text-sm text-white/70">{currentUserEntry.weeklyPoints} pts</span>
          </div>
          <p className="mt-1 text-center text-xs text-white/40">
            You&apos;re #{userRank} this week
          </p>
        </div>
      )}

      {/* Ranked list */}
      <ol className="space-y-1" aria-label="Global leaderboard">
        {visibleEntries.map((entry, index) => {
          const rank = index + 1
          const isCurrentUser = entry.id === user?.id
          return (
            <li
              key={entry.id}
              className="relative motion-safe:opacity-0 motion-safe:animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 50, 500)}ms`, animationDuration: '300ms' }}
              aria-label={isCurrentUser ? `Your position: rank ${rank}` : undefined}
            >
              <GlobalRow
                rank={rank}
                entry={entry}
                isCurrentUser={isCurrentUser}
                onClick={() => handleRowClick(entry.id)}
                index={index}
              />
              {popupEntryId === entry.id && popupEntry && (
                <div className="relative">
                  <ProfilePopup entry={popupEntry} onClose={handlePopupClose} />
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Load more button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleLoadMore}
          disabled={allLoaded}
          className={`min-h-[44px] rounded-full px-6 py-2 text-sm font-medium transition-colors ${
            allLoaded
              ? 'cursor-default text-white/30'
              : 'border border-white/20 text-white/60 hover:text-white/80'
          }`}
        >
          {allLoaded ? 'All users loaded' : 'Load more'}
        </button>
      </div>
    </div>
  )
}
