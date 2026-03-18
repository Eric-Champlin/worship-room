import type { FriendProfile } from '@/types/dashboard'
import { FriendRow } from './FriendRow'
import { CircleNetwork } from '@/components/dashboard/CircleNetwork'

interface FriendListProps {
  friends: FriendProfile[]
  onRemove: (friendId: string) => void
  onBlock: (userId: string) => void
  onScrollToInvite: () => void
  onFocusSearch: () => void
}

export function FriendList({
  friends,
  onRemove,
  onBlock,
  onScrollToInvite,
  onFocusSearch,
}: FriendListProps) {
  if (friends.length === 0) {
    return (
      <section aria-label="Friends list">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
          <div className="mb-4">
            <CircleNetwork size="large" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Invite someone to grow together
          </h3>
          <p className="mb-6 text-sm text-white/50">
            Invite friends or search for people you know
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onScrollToInvite}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt"
            >
              Invite a Friend
            </button>
            <button
              onClick={onFocusSearch}
              className="text-sm text-white/50 underline transition-colors hover:text-white/70"
            >
              Search for friends
            </button>
          </div>
        </div>
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
