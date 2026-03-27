import { useNavigate } from 'react-router-dom'
import { Flame, Sprout, Leaf, Flower2, TreePine, Trees, Landmark } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { EncourageButton } from '@/components/social/EncourageButton'
import { splitDisplayName } from '@/components/friends/utils'

const LEVEL_ICONS: Record<number, React.ElementType> = {
  1: Sprout,
  2: Leaf,
  3: Flower2,
  4: TreePine,
  5: Trees,
  6: Landmark,
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-medal-gold',
  2: 'text-medal-silver',
  3: 'text-medal-bronze',
}

interface LeaderboardRowProps {
  rank: number
  friend: FriendProfile
  isCurrentUser: boolean
  metric: 'weekly' | 'allTime'
  index: number
  showEncourage?: boolean
}

export function LeaderboardRow({ rank, friend, isCurrentUser, metric, index, showEncourage }: LeaderboardRowProps) {
  const navigate = useNavigate()
  const { first, last } = splitDisplayName(friend.displayName)
  const LevelIcon = LEVEL_ICONS[friend.level] || Sprout
  const points = metric === 'weekly' ? friend.weeklyPoints : friend.faithPoints
  const rankColor = RANK_COLORS[rank] || 'text-white/70'
  const delay = Math.min(index * 30, 500)

  const handleRowClick = () => {
    navigate(`/profile/${friend.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(`/profile/${friend.id}`)
    }
  }

  return (
    <li
      className={`group motion-safe:opacity-0 motion-safe:animate-fade-in transition-transform duration-300 ease-in-out motion-reduce:transition-none rounded-xl ${
        isCurrentUser
          ? 'border-l-2 border-primary bg-primary/[0.08]'
          : index % 2 === 0
            ? 'bg-white/[0.04]'
            : 'bg-white/[0.06]'
      }`}
      style={{ animationDelay: `${delay}ms`, animationDuration: '300ms' }}
      aria-label={isCurrentUser ? `Your position: rank ${rank}` : undefined}
    >
      <div
        className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5"
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
      >
        {/* Rank */}
        <span className={`min-w-[40px] text-center text-lg font-bold ${rankColor}`}>
          {rank}
        </span>

        {/* Avatar */}
        <Avatar
          firstName={first}
          lastName={last}
          avatarUrl={friend.avatar || null}
          size="sm"
          userId={friend.id}
        />

        {/* Desktop: single line, Mobile: two lines */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-white">
              {isCurrentUser ? `${friend.displayName} (You)` : friend.displayName}
            </span>
            {/* Level — hidden on mobile, shown sm+ */}
            <span className="hidden items-center gap-1 text-xs text-white/50 sm:flex">
              <LevelIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {friend.levelName}
            </span>
          </div>
          {/* Mobile second line */}
          <div className="flex items-center gap-3 text-sm sm:hidden">
            <span className="text-white/60">{points} pts</span>
            {friend.currentStreak > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {friend.currentStreak}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-white/50">
              <LevelIcon className="h-3 w-3" aria-hidden="true" />
              {friend.levelName}
            </span>
          </div>
        </div>

        {/* Points — hidden on mobile (shown in second line) */}
        <span className="hidden text-sm text-white/70 sm:block">{points} pts</span>

        {/* Streak — hidden on mobile */}
        {friend.currentStreak > 0 && (
          <span className="hidden items-center gap-1 text-sm text-amber-400 sm:flex">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {friend.currentStreak}
          </span>
        )}

        {/* Encourage — Friends board only, not current user */}
        {showEncourage && !isCurrentUser && (
          <div className="sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <EncourageButton
              friendId={friend.id}
              friendName={friend.displayName}
              iconOnly
            />
          </div>
        )}
      </div>
    </li>
  )
}
