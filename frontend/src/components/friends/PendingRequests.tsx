import { useCallback, useState } from 'react'
import type { FriendRequest } from '@/types/dashboard'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { useToast } from '@/components/ui/Toast'
import { splitDisplayName } from './utils'

interface PendingRequestsProps {
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  onAccept: (requestId: string) => void
  onDecline: (requestId: string) => void
  onCancel: (requestId: string) => void
}

export function PendingRequests({
  incoming,
  outgoing,
  onAccept,
  onDecline,
  onCancel,
}: PendingRequestsProps) {
  const { showToast } = useToast()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())

  const handleAction = useCallback(
    (requestId: string, action: 'accept' | 'decline' | 'cancel', friendName?: string) => {
      if (processingIds.has(requestId)) return
      setProcessingIds((prev) => new Set(prev).add(requestId))
      setFadingIds((prev) => new Set(prev).add(requestId))

      setTimeout(() => {
        if (action === 'accept') {
          onAccept(requestId)
          if (friendName) showToast(`You and ${friendName} are now friends!`, 'success')
        } else if (action === 'decline') {
          onDecline(requestId)
        } else {
          onCancel(requestId)
        }
      }, 300)
    },
    [processingIds, onAccept, onDecline, onCancel, showToast],
  )

  if (incoming.length === 0 && outgoing.length === 0) {
    return null
  }

  return (
    <section aria-label="Pending requests">
      <h2 className="mb-4 text-lg font-semibold text-white">Pending Requests</h2>

      {incoming.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm uppercase tracking-wider text-white/50">Incoming</h3>
          <div className="space-y-2">
            {incoming.map((req) => {
              const { first, last } = splitDisplayName(req.from.displayName)
              const isFading = fadingIds.has(req.id)
              const isProcessing = processingIds.has(req.id)
              return (
                <div
                  key={req.id}
                  className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-opacity duration-300 motion-reduce:duration-0 ${isFading ? 'opacity-0' : 'opacity-100'}`}
                >
                  <Avatar
                    firstName={first}
                    lastName={last}
                    avatarUrl={req.from.avatar || null}
                    size="md"
                    userId={req.from.id}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{req.from.displayName}</span>
                    <span className="ml-2 text-sm text-white/50">{req.from.levelName}</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleAction(req.id, 'accept', req.from.displayName)}
                      disabled={isProcessing}
                      aria-label={`Accept friend request from ${req.from.displayName}`}
                      className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-lt disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'decline')}
                      disabled={isProcessing}
                      aria-label={`Decline friend request from ${req.from.displayName}`}
                      className="min-h-[44px] rounded-lg border border-white/20 px-4 py-2 text-sm text-white/60 transition-colors hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm uppercase tracking-wider text-white/50">Outgoing</h3>
          <div className="space-y-2">
            {outgoing.map((req) => {
              const { first, last } = splitDisplayName(req.to.displayName)
              const isFading = fadingIds.has(req.id)
              const isProcessing = processingIds.has(req.id)
              return (
                <div
                  key={req.id}
                  className={`flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-opacity duration-300 motion-reduce:duration-0 ${isFading ? 'opacity-0' : 'opacity-100'}`}
                >
                  <Avatar
                    firstName={first}
                    lastName={last}
                    avatarUrl={req.to.avatar || null}
                    size="md"
                    userId={req.to.id}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{req.to.displayName}</span>
                    <span className="ml-2 text-sm text-white/60">Pending</span>
                  </div>
                  <button
                    onClick={() => handleAction(req.id, 'cancel')}
                    disabled={isProcessing}
                    className="inline-flex min-h-[44px] items-center text-sm text-white/50 underline transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
