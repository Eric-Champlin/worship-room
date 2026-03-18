import { useRef, useState } from 'react'
import type { FriendProfile } from '@/types/dashboard'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { splitDisplayName } from './utils'

interface SuggestionsSectionProps {
  suggestions: FriendProfile[]
  onSendRequest: (profile: FriendProfile) => void
}

export function SuggestionsSection({ suggestions, onSendRequest }: SuggestionsSectionProps) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  // Snapshot initial suggestions so cards persist after sending a request
  const snapshotRef = useRef<FriendProfile[]>(suggestions)
  if (snapshotRef.current.length === 0 && suggestions.length > 0) {
    snapshotRef.current = suggestions
  }
  const displaySuggestions = snapshotRef.current

  if (displaySuggestions.length === 0) {
    return null
  }

  function handleSend(profile: FriendProfile) {
    if (sentIds.has(profile.id)) return
    onSendRequest(profile)
    setSentIds((prev) => new Set(prev).add(profile.id))
  }

  return (
    <section aria-label="People you may know">
      <h2 className="mb-4 text-lg font-semibold text-white">People You May Know</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displaySuggestions.map((suggestion) => {
          const { first, last } = splitDisplayName(suggestion.displayName)
          const isSent = sentIds.has(suggestion.id)
          return (
            <div
              key={suggestion.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar
                  firstName={first}
                  lastName={last}
                  avatarUrl={suggestion.avatar || null}
                  size="md"
                  userId={suggestion.id}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white">{suggestion.displayName}</div>
                  <div className="text-sm text-white/50">{suggestion.levelName}</div>
                </div>
              </div>
              <p className="mb-3 text-sm text-white/40">Active on Prayer Wall</p>
              <button
                onClick={() => handleSend(suggestion)}
                disabled={isSent}
                className={`w-full rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isSent
                    ? 'cursor-not-allowed bg-white/10 text-white/40'
                    : 'bg-primary text-white hover:bg-primary-lt'
                }`}
              >
                {isSent ? 'Request Sent' : 'Add Friend'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
