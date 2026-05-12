import { BrowserRouter, Routes, Route, Navigate, useSearchParams, Link } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Layout } from './components/Layout'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { InstallPromptProvider } from '@/contexts/InstallPromptProvider'
import { LegalVersionGate } from '@/components/legal/LegalVersionGate'
import { useAuth } from '@/hooks/useAuth'
import { SEO } from '@/components/SEO'
import { NOT_FOUND_METADATA } from '@/lib/seo/routeMetadata'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthQueryParamHandler } from '@/components/AuthQueryParamHandler'
import { cn } from '@/lib/utils'
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'
import { ScrollToTop } from '@/components/ScrollToTop'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { WhisperToastProvider } from '@/components/ui/WhisperToast'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'

// BB-26: AudioPlayerSheet is lazy-imported so the player JSX (and Howler,
// indirectly via the engine module) stays out of the main bundle until a
// user first hits play.
const AudioPlayerSheet = lazy(() =>
  import('@/components/audio/AudioPlayerSheet').then((m) => ({
    default: m.AudioPlayerSheet,
  })),
)
import { MidnightVerse } from '@/components/MidnightVerse'
import {
  DashboardSkeleton,
  DailyHubSkeleton,
  PrayerWallSkeleton,
  FriendsSkeleton,
  SettingsSkeleton,
  InsightsSkeleton,
  MyPrayersSkeleton,
  MusicSkeleton,
  GrowPageSkeleton,
  BibleLandingSkeleton,
  BibleBrowserSkeleton,
  ProfileSkeleton,
  MyBibleSkeleton,
} from '@/components/skeletons'

// Route-level lazy loading for code splitting
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Health = lazy(() => import('./pages/Health').then((m) => ({ default: m.Health })))
const Insights = lazy(() => import('./pages/Insights').then((m) => ({ default: m.Insights })))
const MonthlyReport = lazy(() => import('./pages/MonthlyReport').then((m) => ({ default: m.MonthlyReport })))
const Friends = lazy(() => import('./pages/Friends').then((m) => ({ default: m.Friends })))
const DailyHub = lazy(() => import('./pages/DailyHub').then((m) => ({ default: m.DailyHub })))
const BreathingExercise = lazy(() => import('./pages/meditate/BreathingExercise').then((m) => ({ default: m.BreathingExercise })))
const ScriptureSoaking = lazy(() => import('./pages/meditate/ScriptureSoaking').then((m) => ({ default: m.ScriptureSoaking })))
const GratitudeReflection = lazy(() => import('./pages/meditate/GratitudeReflection').then((m) => ({ default: m.GratitudeReflection })))
const ActsPrayerWalk = lazy(() => import('./pages/meditate/ActsPrayerWalk').then((m) => ({ default: m.ActsPrayerWalk })))
const PsalmReading = lazy(() => import('./pages/meditate/PsalmReading').then((m) => ({ default: m.PsalmReading })))
const ExamenReflection = lazy(() => import('./pages/meditate/ExamenReflection').then((m) => ({ default: m.ExamenReflection })))
const SharedVerse = lazy(() => import('./pages/SharedVerse').then((m) => ({ default: m.SharedVerse })))
const SharedPrayer = lazy(() => import('./pages/SharedPrayer').then((m) => ({ default: m.SharedPrayer })))
const PrayerWall = lazy(() => import('./pages/PrayerWall').then((m) => ({ default: m.PrayerWall })))
const PrayerDetail = lazy(() => import('./pages/PrayerDetail').then((m) => ({ default: m.PrayerDetail })))
const PrayerWallProfile = lazy(() => import('./pages/PrayerWallProfile').then((m) => ({ default: m.PrayerWallProfile })))
const PrayerWallDashboard = lazy(() => import('./pages/PrayerWallDashboard').then((m) => ({ default: m.PrayerWallDashboard })))
const Churches = lazy(() => import('./pages/Churches').then((m) => ({ default: m.Churches })))
const Counselors = lazy(() => import('./pages/Counselors').then((m) => ({ default: m.Counselors })))
const CelebrateRecovery = lazy(() => import('./pages/CelebrateRecovery').then((m) => ({ default: m.CelebrateRecovery })))
const MusicPage = lazy(() => import('./pages/MusicPage').then((m) => ({ default: m.MusicPage })))
const RoutinesPage = lazy(() => import('./pages/RoutinesPage').then((m) => ({ default: m.RoutinesPage })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
// Spec 1.5g — Sessions page for /settings/sessions.
const SessionsPage = lazy(() => import('./pages/SessionsPage').then((m) => ({ default: m.SessionsPage })))
const GrowthProfile = lazy(() => import('./pages/GrowthProfile').then((m) => ({ default: m.GrowthProfile })))
const MyPrayers = lazy(() => import('./pages/MyPrayers').then((m) => ({ default: m.MyPrayers })))
const GrowPage = lazy(() => import('./pages/GrowPage').then((m) => ({ default: m.GrowPage })))
const ReadingPlanDetail = lazy(() => import('./pages/ReadingPlanDetail').then((m) => ({ default: m.ReadingPlanDetail })))
const ChallengeDetail = lazy(() => import('./pages/ChallengeDetail').then((m) => ({ default: m.ChallengeDetail })))
const BibleLanding = lazy(() => import('./pages/BibleLanding').then((m) => ({ default: m.BibleLanding })))
const BibleBrowse = lazy(() => import('./pages/BibleBrowse').then((m) => ({ default: m.BibleBrowse })))
// BB-38: BibleStub was used only for `/bible/search` — that route is now a redirect.
// BibleSearchRedirect is tiny (just reads URL and issues <Navigate>) so it's imported synchronously.
import { BibleSearchRedirect } from './components/BibleSearchRedirect'
const PlanBrowserPage = lazy(() => import('./pages/bible/PlanBrowserPage').then((m) => ({ default: m.PlanBrowserPage })))
const BiblePlanDetail = lazy(() => import('./pages/BiblePlanDetail').then((m) => ({ default: m.BiblePlanDetail })))
const BiblePlanDay = lazy(() => import('./pages/BiblePlanDay').then((m) => ({ default: m.BiblePlanDay })))
const MyBiblePage = lazy(() => import('./pages/MyBiblePage'))
const BibleReader = lazy(() => import('./pages/BibleReader').then((m) => ({ default: m.BibleReader })))
const AskPage = lazy(() => import('./pages/AskPage').then((m) => ({ default: m.AskPage })))
const MoodCheckInPreview = lazy(() =>
  import('./pages/MoodCheckInPreview').then((m) => ({ default: m.MoodCheckInPreview }))
)
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines').then((m) => ({ default: m.CommunityGuidelines })))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage })))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })))
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage').then((m) => ({ default: m.AccessibilityPage })))

function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-bg">
      <span
        className={cn(
          'text-3xl font-script select-none',
          prefersReduced ? 'text-white/30' : 'animate-logo-pulse text-white/20'
        )}
      >
        Worship Room
      </span>
    </div>
  )
}

function NotFound() {
  return (
    <Layout>
      <SEO {...NOT_FOUND_METADATA} />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mb-6 text-base text-white/70 sm:text-lg">
            This page doesn&apos;t exist, but there&apos;s plenty of peace to find elsewhere.
          </p>
          <Link
            to="/"
            className="text-base text-white/70 underline transition-colors hover:text-white"
          >
            Go Home
          </Link>
        </div>
      </div>
    </Layout>
  )
}

function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <div key={location.pathname} className="motion-safe:animate-fade-in">{children}</div>
}

function RootRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Dashboard /> : <Home />
}

function DevotionalRedirect() {
  const [searchParams] = useSearchParams()
  const day = searchParams.get('day')
  const target = day ? `/daily?tab=devotional&day=${day}` : '/daily?tab=devotional'
  return <Navigate to={target} replace />
}

function ReadingPlansRedirect() {
  const [searchParams] = useSearchParams()
  const create = searchParams.get('create')
  const target = create === 'true' ? '/grow?tab=plans&create=true' : '/grow?tab=plans'
  return <Navigate to={target} replace />
}

/** BB-41: Fire-and-forget notification scheduling on app load */
function NotificationSchedulerEffect() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    // Dynamic import to avoid loading notification code for users who haven't opted in
    import('@/lib/notifications/preferences').then(({ getNotificationPrefs }) => {
      const prefs = getNotificationPrefs()
      if (!prefs.enabled) return

      import('@/lib/notifications/subscription').then(({ ensureSubscription }) => {
        // Subscription renewal is best-effort — failure is non-fatal
        ensureSubscription().catch(() => {})
      })
      import('@/lib/notifications/scheduler').then(({ prepareAndSchedule, registerPeriodicSync }) => {
        // Notification scheduling is fire-and-forget — failure doesn't affect app functionality
        prepareAndSchedule().catch(() => {})
        registerPeriodicSync().catch(() => {})
      })
    })
  }, [])

  return null
}

function App() {
  return (
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <HelmetProvider>
        <ErrorBoundary>
        <AuthProvider>
        <LegalVersionGate>
        <InstallPromptProvider>
        <ToastProvider>
        <AuthModalProvider>
        <AudioProvider>
        <AudioPlayerProvider>
        <Suspense fallback={null}>
          <AudioPlayerSheet />
        </Suspense>
        <WhisperToastProvider>
        <MidnightVerse />
        <UpdatePrompt />
        <OfflineIndicator />
        <InstallPrompt />
        <NotificationSchedulerEffect />
        <ChunkErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<RouteLoadingFallback />}>
        <RouteTransition>
        <AuthQueryParamHandler />
        <Routes>
          <Route path="/" element={<RouteErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RootRoute /></Suspense></RouteErrorBoundary>} />
          <Route path="/health" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><Health /></Suspense></RouteErrorBoundary>} />
          <Route path="/insights" element={<RouteErrorBoundary><Suspense fallback={<InsightsSkeleton />}><Insights /></Suspense></RouteErrorBoundary>} />
          <Route path="/insights/monthly" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><MonthlyReport /></Suspense></RouteErrorBoundary>} />
          <Route path="/friends" element={<RouteErrorBoundary><Suspense fallback={<FriendsSkeleton />}><Friends /></Suspense></RouteErrorBoundary>} />
          <Route path="/settings" element={<RouteErrorBoundary><Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense></RouteErrorBoundary>} />
          {/* Spec 1.5g — /settings/sessions */}
          <Route path="/settings/sessions" element={<RouteErrorBoundary><Suspense fallback={<SettingsSkeleton />}><SessionsPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/my-prayers" element={<RouteErrorBoundary><Suspense fallback={<MyPrayersSkeleton />}><MyPrayers /></Suspense></RouteErrorBoundary>} />
          <Route path="/daily" element={<RouteErrorBoundary><Suspense fallback={<DailyHubSkeleton />}><DailyHub /></Suspense></RouteErrorBoundary>} />
          <Route path="/ask" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><AskPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/devotional" element={<DevotionalRedirect />} />
          <Route path="/grow" element={<RouteErrorBoundary><Suspense fallback={<GrowPageSkeleton />}><GrowPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/reading-plans" element={<ReadingPlansRedirect />} />
          <Route path="/reading-plans/:planId" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><ReadingPlanDetail /></Suspense></RouteErrorBoundary>} />
          <Route path="/challenges" element={<Navigate to="/grow?tab=challenges" replace />} />
          <Route path="/challenges/:challengeId" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><ChallengeDetail /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible" element={<RouteErrorBoundary><Suspense fallback={<BibleLandingSkeleton />}><BibleLanding /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/browse" element={<RouteErrorBoundary><Suspense fallback={<BibleBrowserSkeleton />}><BibleBrowse /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/my" element={<RouteErrorBoundary><Suspense fallback={<MyBibleSkeleton />}><MyBiblePage /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PlanBrowserPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans/:slug" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BiblePlanDetail /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans/:slug/day/:dayNumber" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BiblePlanDay /></Suspense></RouteErrorBoundary>} />
          {/* BB-38: /bible/search is a legacy path that redirects to /bible?mode=search, forwarding any ?q= */}
          <Route path="/bible/search" element={<BibleSearchRedirect />} />
          <Route path="/bible/:book/:chapter" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BibleReader /></Suspense></RouteErrorBoundary>} />
          <Route path="/pray" element={<Navigate to="/daily?tab=pray" replace />} />
          <Route path="/journal" element={<Navigate to="/daily?tab=journal" replace />} />
          <Route path="/meditate" element={<Navigate to="/daily?tab=meditate" replace />} />
          <Route path="/meditate/breathing" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BreathingExercise /></Suspense></RouteErrorBoundary>} />
          <Route path="/meditate/soaking" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><ScriptureSoaking /></Suspense></RouteErrorBoundary>} />
          <Route path="/meditate/gratitude" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><GratitudeReflection /></Suspense></RouteErrorBoundary>} />
          <Route path="/meditate/acts" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><ActsPrayerWalk /></Suspense></RouteErrorBoundary>} />
          <Route path="/meditate/psalms" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PsalmReading /></Suspense></RouteErrorBoundary>} />
          <Route path="/meditate/examen" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><ExamenReflection /></Suspense></RouteErrorBoundary>} />
          <Route path="/verse/:id" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><SharedVerse /></Suspense></RouteErrorBoundary>} />
          <Route path="/prayer/:id" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><SharedPrayer /></Suspense></RouteErrorBoundary>} />
          <Route path="/scripture" element={<Navigate to="/daily?tab=pray" replace />} />
          <Route path="/music" element={<RouteErrorBoundary><Suspense fallback={<MusicSkeleton />}><MusicPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/music/playlists" element={<Navigate to="/music?tab=playlists" replace />} />
          <Route path="/music/ambient" element={<Navigate to="/music?tab=ambient" replace />} />
          <Route path="/music/sleep" element={<Navigate to="/music?tab=sleep" replace />} />
          <Route path="/music/routines" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><RoutinesPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/prayer-wall" element={<RouteErrorBoundary><Suspense fallback={<PrayerWallSkeleton />}><PrayerWall /></Suspense></RouteErrorBoundary>} />
          {/* Static segments must precede :id to avoid matching "dashboard"/"user" as a prayer ID */}
          <Route path="/prayer-wall/dashboard" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PrayerWallDashboard /></Suspense></RouteErrorBoundary>} />
          <Route path="/prayer-wall/user/:id" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PrayerWallProfile /></Suspense></RouteErrorBoundary>} />
          <Route path="/prayer-wall/:id" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PrayerDetail /></Suspense></RouteErrorBoundary>} />
          <Route path="/local-support/churches" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><Churches /></Suspense></RouteErrorBoundary>} />
          <Route path="/local-support/counselors" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><Counselors /></Suspense></RouteErrorBoundary>} />
          <Route path="/profile/:userId" element={<RouteErrorBoundary><Suspense fallback={<ProfileSkeleton />}><GrowthProfile /></Suspense></RouteErrorBoundary>} />
          <Route path="/local-support/celebrate-recovery" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><CelebrateRecovery /></Suspense></RouteErrorBoundary>} />
          {import.meta.env.DEV && (
            <Route path="/dev/mood-checkin" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><MoodCheckInPreview /></Suspense></RouteErrorBoundary>} />
          )}
          <Route path="/login" element={<Navigate to="/?auth=login" replace />} />
          <Route path="/register" element={<RouteErrorBoundary><Suspense fallback={null}><RegisterPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/community-guidelines" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><CommunityGuidelines /></Suspense></RouteErrorBoundary>} />
          <Route path="/terms-of-service" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><TermsOfServicePage /></Suspense></RouteErrorBoundary>} />
          <Route path="/privacy-policy" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PrivacyPolicyPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/accessibility" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><AccessibilityPage /></Suspense></RouteErrorBoundary>} />
          <Route path="*" element={<RouteErrorBoundary><NotFound /></RouteErrorBoundary>} />
        </Routes>
        </RouteTransition>
        </Suspense>
        </ChunkErrorBoundary>
        </WhisperToastProvider>
        </AudioPlayerProvider>
        </AudioProvider>
        </AuthModalProvider>
        </ToastProvider>
        </InstallPromptProvider>
        </LegalVersionGate>
        </AuthProvider>
        </ErrorBoundary>
        </HelmetProvider>
      </BrowserRouter>
  )
}

export default App
