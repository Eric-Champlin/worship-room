import { Users } from 'lucide-react'
import type { FriendProfile } from '@/types/dashboard'
import { FriendRow } from './FriendRow'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

interface FriendListProps {
  friends: FriendProfile[]
  onRemove: (friendId: string) => void
  onBlock: (userId: string) => void
  onScrollToInvite: () => void
}

export function FriendList({
  friends,
  onRemove,
  onBlock,
  onScrollToInvite,
}: FriendListProps) {
  if (friends.length === 0) {
    return (
      <section aria-label="Friends list">
        <FeatureEmptyState
          icon={Users}
          heading="Faith grows stronger together"
          description="Invite a friend to join your journey, or find people from the Prayer Wall community."
          ctaLabel="Invite a friend"
          onCtaClick={onScrollToInvite}
        />
      </section>
    )
  }

  return (
    <section aria-label="Friends list">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Friends ({friends.length})
      </h2>
      <div role="list" className="space-y-1">
        {friends.map((friend) => (
          <FriendRow
            key={friend.id}
            friend={friend}
            onRemove={onRemove}
            onBlock={onBlock}
          />
        ))}
      </div>
    </section>
  )
}
