import { useEffect, useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { SEO } from '@/components/SEO'
import {
  GROWTH_PROFILE_METADATA,
  GROWTH_PROFILE_NOT_FOUND_METADATA,
} from '@/lib/seo/routeMetadata'
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

// Loading state: use ProfileSkeleton
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
      <div className="min-h-screen overflow-x-hidden bg-dashboard-dark">
        <SEO {...GROWTH_PROFILE_NOT_FOUND_METADATA} />
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
    <div className="min-h-screen overflow-x-hidden bg-dashboard-dark">
      <Navbar transparent />
      {/* BB-40: dynamic title overrides static base; constant provides noIndex */}
      <SEO
        {...GROWTH_PROFILE_METADATA}
        title={`${profileData.displayName}'s Growth Profile`}
        description={`See ${profileData.displayName}'s spiritual growth journey, badges, and encouragement on Worship Room.`}
      />
      <section
        aria-labelledby="profile-heading"
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
        style={ATMOSPHERIC_HERO_BG}
      >
        <Link
          to="/friends"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <h1
          id="profile-heading"
          className="mb-2 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
          style={GRADIENT_TEXT_STYLE}
        >
          {profileData.displayName}&apos;s <span className="font-script">Garden</span>
        </h1>
        {profileData.levelName !== null && (
          <p className="font-serif italic text-base text-white/60 sm:text-lg">
            {profileData.levelName}
          </p>
        )}
      </section>
      <div className="motion-safe:animate-fade-in mx-auto max-w-3xl px-4 pt-4 pb-12 sm:px-6">
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
