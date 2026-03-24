import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { DevAuthToggle } from '@/components/dev/DevAuthToggle'
import { ProfileSection } from '@/components/settings/ProfileSection'
import { NotificationsSection } from '@/components/settings/NotificationsSection'
import { PrivacySection } from '@/components/settings/PrivacySection'
import { AccountSection } from '@/components/settings/AccountSection'
import { SEO } from '@/components/SEO'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

type SettingsSection = 'profile' | 'notifications' | 'privacy' | 'account'

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'account', label: 'Account' },
]

export function Settings() {
  const { isAuthenticated, user } = useAuth()
  const { settings, updateProfile, updateNotifications, updatePrivacy, unblockUser } = useSettings()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-[#0f0a1e]">
      <SEO title="Settings" description="Manage your Worship Room account, notifications, and privacy preferences." noIndex />
      <a
        href="#settings-content"
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
          <h1 className="text-2xl font-bold text-white md:text-3xl">Settings</h1>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="sm:hidden border-b border-white/10">
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
                    : 'text-white/50',
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
            className="hidden sm:block w-[200px] lg:w-[240px] shrink-0"
          >
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  activeSection === s.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/5',
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content panel */}
          <div
            id={`settings-panel-${activeSection}`}
            aria-live="polite"
            className="flex-1 max-w-[640px]"
          >
            {activeSection === 'profile' && (
              <ProfileSection
                profile={settings.profile}
                userName={user?.name}
                onUpdateProfile={updateProfile}
              />
            )}
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
