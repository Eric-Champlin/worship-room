import { useEffect, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileBadgeShowcase } from '@/components/profile/ProfileBadgeShowcase'
import { ProfileStats } from '@/components/profile/ProfileStats'
import { GrowthGarden } from '@/components/dashboard/GrowthGarden'
import { useProfileData } from '@/hooks/useProfileData'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useSocialInteractions } from '@/hooks/useSocialInteractions'
import { useFriends } from '@/hooks/useFriends'
import { ALL_MOCK_USERS } from '@/mocks/friends-mock-data'

export function GrowthProfile() {
  const { userId } = useParams<{ userId: string }>()
  const profileData = useProfileData(userId || '')
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { sendEncouragement, canEncourage } = useSocialInteractions()
  const { sendRequest, acceptRequest, pendingIncoming } = useFriends()
  const [relationship, setRelationship] = useState(profileData.relationship)

  // Sync relationship state from profile data
  useEffect(() => {
    setRelationship(profileData.relationship)
  }, [profileData.relationship])

  const canEncourageToday = userId ? canEncourage(userId) : false

  const handleEncourage = useCallback(
    (message: string) => {
      if (!isAuthenticated) {
        authModal?.openAuthModal('Sign in to encourage your friends')
        return
      }
      if (userId) {
        sendEncouragement(userId, profileData.displayName, message)
      }
    },
    [isAuthenticated, authModal, userId, profileData.displayName, sendEncouragement],
  )

  const handleAddFriend = useCallback(() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to add friends')
      return
    }
    if (userId) {
      const userProfile = ALL_MOCK_USERS.find((u) => u.id === userId)
      if (userProfile) {
        sendRequest(userProfile)
        setRelationship('pending-outgoing')
      }
    }
  }, [isAuthenticated, authModal, userId, sendRequest])

  const handleAcceptRequest = useCallback(() => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to add friends')
      return
    }
    if (userId) {
      const request = pendingIncoming.find((r) => r.from.id === userId)
      if (request) {
        acceptRequest(request.id)
        setRelationship('friend')
      }
    }
  }, [isAuthenticated, authModal, userId, pendingIncoming, acceptRequest])

  if (!profileData.found) {
    return (
      <div className="min-h-screen bg-[#0f0a1e]">
        <Navbar transparent />
        <div className="mx-auto max-w-3xl px-4 pt-8 pb-12 text-center sm:px-6 md:pt-12">
          <h1 className="text-2xl font-bold text-white">Profile not found</h1>
          <p className="mt-2 text-white/60">This user doesn&apos;t exist or may have been removed.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/friends"
              className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Go to Friends
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-white transition-colors hover:bg-white/15"
            >
              Go Home
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  // Override relationship with local state for immediate UI updates
  const displayData = { ...profileData, relationship }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <Navbar transparent />
      <SEO
        title={`${profileData.displayName}'s Growth Profile`}
        description={`See ${profileData.displayName}'s spiritual growth journey, badges, and encouragement on Worship Room.`}
        noIndex
      />
      <div className="motion-safe:animate-fade-in mx-auto max-w-3xl px-4 pt-8 pb-12 sm:px-6 md:pt-12">
        <ProfileHeader
          profileData={displayData}
          onEncourage={handleEncourage}
          onAddFriend={handleAddFriend}
          onAcceptRequest={handleAcceptRequest}
          canEncourageToday={canEncourageToday}
        />
        {profileData.currentLevel !== null && (
          <div className="mt-6 flex flex-col items-center">
            <GrowthGarden
              stage={(profileData.currentLevel ?? 1) as 1 | 2 | 3 | 4 | 5 | 6}
              animated={false}
              showSparkle={false}
              streakActive={(profileData.currentStreak ?? 0) > 0}
              size="sm"
            />
          </div>
        )}
        <div className="mt-6">
          <ProfileBadgeShowcase
            badgeData={profileData.badgeData}
            isOwnProfile={profileData.isOwnProfile}
          />
        </div>
        <div className="mt-6">
          <ProfileStats profileData={profileData} />
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
