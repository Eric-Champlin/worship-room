import { useState } from 'react'
import { BoardSelector, type BoardType } from './BoardSelector'
import { FriendsLeaderboard } from './FriendsLeaderboard'
import { GlobalLeaderboard } from './GlobalLeaderboard'

export function LeaderboardTab() {
  const [activeBoard, setActiveBoard] = useState<BoardType>('friends')

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
      <div className="mb-4">
        <BoardSelector activeBoard={activeBoard} onBoardChange={setActiveBoard} />
      </div>

      <div className="motion-safe:transition-opacity motion-safe:duration-150">
        {activeBoard === 'friends' && <FriendsLeaderboard />}
        {activeBoard === 'global' && <GlobalLeaderboard />}
      </div>
    </div>
  )
}
