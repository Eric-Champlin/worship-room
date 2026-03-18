import { useCallback, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import {
  FriendSearch,
  InviteSection,
  PendingRequests,
  FriendList,
  SuggestionsSection,
} from '@/components/friends'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'

type FriendsTab = 'friends' | 'leaderboard'

const TAB_CONFIG: { id: FriendsTab; label: string }[] = [
  { id: 'friends', label: 'Friends' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

function LeaderboardPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Trophy className="mb-4 h-12 w-12 text-white/20" aria-hidden="true" />
      <p className="text-white/40">Leaderboard coming soon</p>
    </div>
  )
}

export function Friends() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    friends,
    pendingIncoming,
    pendingOutgoing,
    suggestions,
    searchUsers,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    blockUser,
  } = useFriends()

  const activeTab = (searchParams.get('tab') as FriendsTab) || 'friends'

  const handleTabChange = useCallback(
    (tab: FriendsTab) => {
      setSearchParams(tab === 'friends' ? {} : { tab })
    },
    [setSearchParams],
  )

  const handleScrollToInvite = useCallback(() => {
    document.getElementById('invite-section')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus()
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <a
        href="#friends-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />

      {/* Page header */}
      <header className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <h1 className="font-serif text-2xl text-white/90 md:text-3xl">Friends</h1>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-[#0f0a1e] pb-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div role="tablist" aria-label="Friends page tabs" className="flex gap-2">
            {TAB_CONFIG.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'border border-white/20 text-white/60 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab panels */}
      <main id="friends-content" className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <div
          role="tabpanel"
          id="panel-friends"
          aria-labelledby="tab-friends"
          className="space-y-8"
          hidden={activeTab !== 'friends'}
        >
          {activeTab === 'friends' && (
            <>
              <FriendSearch
                searchUsers={searchUsers}
                onSendRequest={sendRequest}
                inputRef={searchInputRef}
              />
              <InviteSection />
              <PendingRequests
                incoming={pendingIncoming}
                outgoing={pendingOutgoing}
                onAccept={acceptRequest}
                onDecline={declineRequest}
                onCancel={cancelRequest}
              />
              <FriendList
                friends={friends}
                onRemove={removeFriend}
                onBlock={blockUser}
                onScrollToInvite={handleScrollToInvite}
                onFocusSearch={handleFocusSearch}
              />
              <SuggestionsSection
                suggestions={suggestions}
                onSendRequest={sendRequest}
              />
            </>
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-leaderboard"
          aria-labelledby="tab-leaderboard"
          hidden={activeTab !== 'leaderboard'}
        >
          {activeTab === 'leaderboard' && <LeaderboardPlaceholder />}
        </div>
      </main>

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
