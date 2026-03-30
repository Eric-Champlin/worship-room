import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { PrivacySection } from '@/components/settings/PrivacySection'
import { AccountSection } from '@/components/settings/AccountSection'
import { DashboardSection } from '@/components/settings/DashboardSection'
import { SEO } from '@/components/SEO'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

type SettingsSection = 'profile' | 'dashboard' | 'notifications' | 'privacy' | 'account'

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'account', label: 'Account' },
]

// Loading state: use SettingsSkeleton
export function Settings() {
  const { isAuthenticated, user } = useAuth()
  const { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser } = useSettings()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-dashboard-dark">
      <SEO title="Settings" description="Manage your Worship Room account, notifications, and privacy preferences." noIndex />
      <a
        href="#settings-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
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
          className="px-1 sm:px-2 font-script text-3xl font-bold leading-tight bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl"
        >
          Settings
        </h1>
      </section>

      {/* Mobile tabs */}
      <div className="sm:hidden bg-white/[0.08] backdrop-blur-xl border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4" role="tablist" aria-label="Settings sections">
          <div className="flex">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={activeSection === s.id}
                aria-controls={`settings-panel-${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium text-center transition-colors',
                  activeSection === s.id
                    ? 'text-white border-b-2 border-primary'
                    : 'text-white/60',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area with sidebar */}
      <main id="settings-content" className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <nav
            role="navigation"
            aria-label="Settings"
            className="hidden sm:block w-[200px] lg:w-[240px] shrink-0 bg-white/[0.04] border-r border-white/10 rounded-lg p-2"
          >
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary-lt'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.06]',
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

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
                onUpdatePrivacy={updatePrivacy}
                onUnblockUser={unblockUser}
              />
            )}
            {activeSection === 'account' && (
              <AccountSection email={settings.profile.email || 'user@example.com'} />
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
      {import.meta.env.DEV && <DevAuthToggle />}
    </div>
  )
}
