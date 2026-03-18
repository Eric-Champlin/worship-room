import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useFriends } from '@/hooks/useFriends'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { splitDisplayName } from '@/components/friends/utils'

export function FriendsPreview() {
  const { friends } = useFriends()

  // Show top 3 most recently active friends
  const topFriends = friends.slice(0, 3)

  if (topFriends.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <p className="mb-3 text-sm text-white/50">Faith grows stronger together</p>
        <Link
          to="/friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite a friend
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topFriends.map((friend) => {
        const { first, last } = splitDisplayName(friend.displayName)
        return (
          <div key={friend.id} className="flex items-center gap-3">
            <Avatar
              firstName={first}
              lastName={last}
              avatarUrl={friend.avatar || null}
              size="sm"
              userId={friend.id}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-white">{friend.displayName}</span>
              <span className="ml-2 text-xs text-white/40">{friend.levelName}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
