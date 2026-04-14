import { useCallback, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import { FRIENDS_METADATA } from '@/lib/seo/routeMetadata'
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
import { LeaderboardTab } from '@/components/leaderboard'

type FriendsTab = 'friends' | 'leaderboard'

const TAB_CONFIG: { id: FriendsTab; label: string }[] = [
  { id: 'friends', label: 'Friends' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

// Loading state: use FriendsSkeleton
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


  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      <SEO {...FRIENDS_METADATA} />
      <Navbar transparent />

      {/* Hero section */}
      <section
        aria-labelledby="friends-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <h1
          id="friends-heading"
          className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
          style={GRADIENT_TEXT_STYLE}
        >
          <span className="font-script">Friends</span>
        </h1>
      </section>

      {/* Tab bar */}
      <div className="bg-dashboard-dark pb-6">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div role="tablist" aria-label="Friends page tabs" className="relative flex gap-2">
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
                  className={`min-h-[44px] rounded-full px-6 py-2 text-sm font-medium transition-[colors,transform] duration-fast active:scale-[0.98] ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'border border-white/20 text-white/60 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
            {/* Animated underline */}
            <div
              className="absolute bottom-0 h-0.5 bg-primary motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-standard"
              style={{
                width: `${100 / TAB_CONFIG.length}%`,
                transform: `translateX(${TAB_CONFIG.findIndex(t => t.id === activeTab) * 100}%)`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Tab panels */}
      <main id="main-content" className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <div
          role="tabpanel"
          id="panel-friends"
          aria-labelledby="tab-friends"
          className="space-y-8"
          hidden={activeTab !== 'friends'}
        >
          {activeTab === 'friends' && (
            <div key="friends-content" className="motion-safe:animate-tab-fade-in">
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
              />
              <SuggestionsSection
                suggestions={suggestions}
                onSendRequest={sendRequest}
              />
            </div>
          )}
        </div>
        <div
          role="tabpanel"
          id="panel-leaderboard"
          aria-labelledby="tab-leaderboard"
          hidden={activeTab !== 'leaderboard'}
        >
          {activeTab === 'leaderboard' && <div key="leaderboard-content" className="motion-safe:animate-tab-fade-in"><LeaderboardTab /></div>}
        </div>
      </main>

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
