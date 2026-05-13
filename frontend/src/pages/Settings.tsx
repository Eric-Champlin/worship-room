import { useCallback } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { PrivacySection } from '@/components/settings/PrivacySection'
import { SensitiveFeaturesSection } from '@/components/settings/SensitiveFeaturesSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { AppSection } from '@/components/settings/AppSection'
import { DashboardSection } from '@/components/settings/DashboardSection'
import { SEO } from '@/components/SEO'
import { SETTINGS_METADATA } from '@/lib/seo/routeMetadata'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { useFriends } from '@/hooks/useFriends'
import { cn } from '@/lib/utils'

type SettingsSection =
  | 'profile'
  | 'dashboard'
  | 'notifications'
  | 'privacy'
  | 'sensitive-features'
  | 'account'
  | 'app'

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  // Spec 6.4 — Sensitive features section (MPD-11). Inserted between Privacy
  // and Account so Night Mode (in Privacy) sits adjacent to 3am Watch.
  { id: 'sensitive-features', label: 'Sensitive features' },
  { id: 'account', label: 'Account' },
  { id: 'app', label: 'App' },
]

const VALID_SECTIONS: SettingsSection[] = [
  'profile',
  'dashboard',
  'notifications',
  'privacy',
  'sensitive-features',
  'account',
  'app',
]

// Loading state: use SettingsSkeleton
export function Settings() {
  const { isAuthenticated, user } = useAuth()
  const {
    settings,
    updateProfile,
    updateNotifications,
    updatePrivacy,
    unblockUser: unblockSettings,
    updatePrayerWall,
  } = useSettings()
  const { blocked: friendsBlocked, unblockUser: unblockFriend } = useFriends()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeSection: SettingsSection = (VALID_SECTIONS as string[]).includes(tabParam ?? '')
    ? (tabParam as SettingsSection)
    : 'profile'

  const setActiveSection = useCallback(
    (section: SettingsSection) => {
      setSearchParams({ tab: section }, { replace: true })
    },
    [setSearchParams],
  )

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const { key } = e
      let nextIndex: number | null = null
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault()
        nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length
      } else if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % SECTIONS.length
      } else if (key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (key === 'End') {
        e.preventDefault()
        nextIndex = SECTIONS.length - 1
      }
      if (nextIndex !== null) {
        const nextSection = SECTIONS[nextIndex].id
        setActiveSection(nextSection)
        const target = e.currentTarget as HTMLElement
        const container = target.closest('[role="tablist"]')
        const next = container?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]
        next?.focus()
      }
    },
    [setActiveSection],
  )

  // Spec 2.5.6 cleanup-on-unblock dual-call: clears the canonical wr_friends.blocked
  // entry AND any legacy wr_settings.privacy.blockedUsers entry for the same userId.
  const handleUnblock = useCallback(
    (userId: string) => {
      unblockFriend(userId)
      unblockSettings(userId)
    },
    [unblockFriend, unblockSettings],
  )

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      <SEO {...SETTINGS_METADATA} />
      <Navbar transparent />

      {/* Hero section */}
      <section
        aria-labelledby="settings-heading"
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
          id="settings-heading"
          className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Settings
        </h1>
      </section>

      {/* Mobile tabs */}
      <div className="sm:hidden bg-white/[0.08] backdrop-blur-xl border-b border-white/10">
        <div
          className="mx-auto max-w-4xl px-4 flex"
          role="tablist"
          aria-label="Settings sections"
        >
          {SECTIONS.map((s, idx) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={activeSection === s.id}
              aria-controls={`settings-panel-${s.id}`}
              tabIndex={activeSection === s.id ? 0 : -1}
              onClick={() => setActiveSection(s.id)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={cn(
                'flex-1 py-3 text-sm font-medium text-center transition-colors',
                activeSection === s.id
                  ? 'bg-white/15 text-white border-b-2 border-white/40'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area with sidebar */}
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div
            role="tablist"
            aria-label="Settings sections"
            aria-orientation="vertical"
            className="hidden sm:block w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2"
          >
            {SECTIONS.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={activeSection === s.id}
                aria-controls={`settings-panel-${s.id}`}
                tabIndex={activeSection === s.id ? 0 : -1}
                onClick={() => setActiveSection(s.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  activeSection === s.id
                    ? 'bg-white/15 text-white border-l-2 border-white/40'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Content panel */}
          <div
            key={activeSection}
            id={`settings-panel-${activeSection}`}
            aria-live="polite"
            className="flex-1 max-w-[640px] motion-safe:animate-tab-fade-in"
          >
            {activeSection === 'profile' && (
              <ProfileSection
                profile={settings.profile}
                userName={user?.name}
                onUpdateProfile={updateProfile}
              />
            )}
            {activeSection === 'dashboard' && <DashboardSection />}
            {activeSection === 'notifications' && (
              <NotificationsSection
                notifications={settings.notifications}
                onUpdateNotifications={updateNotifications}
              />
            )}
            {activeSection === 'privacy' && (
              <PrivacySection
                privacy={settings.privacy}
                prayerWall={settings.prayerWall}
                friendsBlocked={friendsBlocked}
                onUpdatePrivacy={updatePrivacy}
                onUpdatePrayerWall={updatePrayerWall}
                onUnblock={handleUnblock}
              />
            )}
            {activeSection === 'sensitive-features' && (
              <SensitiveFeaturesSection
                prayerWall={settings.prayerWall}
                onUpdatePrayerWall={updatePrayerWall}
              />
            )}
            {activeSection === 'account' && (
              <AccountSection email={settings.profile.email || 'user@example.com'} />
            )}
            {activeSection === 'app' && <AppSection />}
          </div>
        </div>
      </main>

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
