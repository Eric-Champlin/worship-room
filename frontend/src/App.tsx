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
import { useAuth } from '@/hooks/useAuth'
import { SEO } from '@/components/SEO'
import { LOGIN_METADATA, NOT_FOUND_METADATA } from '@/lib/seo/routeMetadata'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
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
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage').then((m) => ({ default: m.AccessibilityPage })))

function RouteLoadingFallback() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-dark">
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

function ComingSoon({ title }: { title: string }) {
  return (
    <Layout>
      {/* BB-40: /login is the only caller of ComingSoon today. LOGIN_METADATA carries the noIndex + stub description. */}
      <SEO {...LOGIN_METADATA} />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            {title}
          </h1>
          <p className="font-script text-2xl text-primary sm:text-3xl">
            Coming Soon
          </p>
        </div>
      </div>
    </Layout>
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
            className="font-script text-2xl text-primary-lt transition-colors hover:text-primary"
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
        <Routes>
          <Route path="/" element={<RouteErrorBoundary><Suspense fallback={<DashboardSkeleton />}><RootRoute /></Suspense></RouteErrorBoundary>} />
          <Route path="/health" element={<Health />} />
          <Route path="/insights" element={<RouteErrorBoundary><Suspense fallback={<InsightsSkeleton />}><Insights /></Suspense></RouteErrorBoundary>} />
          <Route path="/insights/monthly" element={<MonthlyReport />} />
          <Route path="/friends" element={<RouteErrorBoundary><Suspense fallback={<FriendsSkeleton />}><Friends /></Suspense></RouteErrorBoundary>} />
          <Route path="/settings" element={<RouteErrorBoundary><Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense></RouteErrorBoundary>} />
          <Route path="/my-prayers" element={<RouteErrorBoundary><Suspense fallback={<MyPrayersSkeleton />}><MyPrayers /></Suspense></RouteErrorBoundary>} />
          <Route path="/daily" element={<RouteErrorBoundary><Suspense fallback={<DailyHubSkeleton />}><DailyHub /></Suspense></RouteErrorBoundary>} />
          <Route path="/ask" element={<AskPage />} />
          <Route path="/devotional" element={<DevotionalRedirect />} />
          <Route path="/grow" element={<RouteErrorBoundary><Suspense fallback={<GrowPageSkeleton />}><GrowPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/reading-plans" element={<ReadingPlansRedirect />} />
          <Route path="/reading-plans/:planId" element={<ReadingPlanDetail />} />
          <Route path="/challenges" element={<Navigate to="/grow?tab=challenges" replace />} />
          <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
          <Route path="/bible" element={<RouteErrorBoundary><Suspense fallback={<BibleLandingSkeleton />}><BibleLanding /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/browse" element={<RouteErrorBoundary><Suspense fallback={<BibleBrowserSkeleton />}><BibleBrowse /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/my" element={<RouteErrorBoundary><Suspense fallback={<MyBibleSkeleton />}><MyBiblePage /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><PlanBrowserPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans/:slug" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BiblePlanDetail /></Suspense></RouteErrorBoundary>} />
          <Route path="/bible/plans/:slug/day/:dayNumber" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><BiblePlanDay /></Suspense></RouteErrorBoundary>} />
          {/* BB-38: /bible/search is a legacy path that redirects to /bible?mode=search, forwarding any ?q= */}
          <Route path="/bible/search" element={<BibleSearchRedirect />} />
          <Route path="/bible/:book/:chapter" element={<BibleReader />} />
          <Route path="/pray" element={<Navigate to="/daily?tab=pray" replace />} />
          <Route path="/journal" element={<Navigate to="/daily?tab=journal" replace />} />
          <Route path="/meditate" element={<Navigate to="/daily?tab=meditate" replace />} />
          <Route path="/meditate/breathing" element={<BreathingExercise />} />
          <Route path="/meditate/soaking" element={<ScriptureSoaking />} />
          <Route path="/meditate/gratitude" element={<GratitudeReflection />} />
          <Route path="/meditate/acts" element={<ActsPrayerWalk />} />
          <Route path="/meditate/psalms" element={<PsalmReading />} />
          <Route path="/meditate/examen" element={<ExamenReflection />} />
          <Route path="/verse/:id" element={<SharedVerse />} />
          <Route path="/prayer/:id" element={<SharedPrayer />} />
          <Route path="/scripture" element={<Navigate to="/daily?tab=pray" replace />} />
          <Route path="/music" element={<RouteErrorBoundary><Suspense fallback={<MusicSkeleton />}><MusicPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/music/playlists" element={<Navigate to="/music?tab=playlists" replace />} />
          <Route path="/music/ambient" element={<Navigate to="/music?tab=ambient" replace />} />
          <Route path="/music/sleep" element={<Navigate to="/music?tab=sleep" replace />} />
          <Route path="/music/routines" element={<RoutinesPage />} />
          <Route path="/prayer-wall" element={<RouteErrorBoundary><Suspense fallback={<PrayerWallSkeleton />}><PrayerWall /></Suspense></RouteErrorBoundary>} />
          {/* Static segments must precede :id to avoid matching "dashboard"/"user" as a prayer ID */}
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
          <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
          <Route path="/local-support/churches" element={<Churches />} />
          <Route path="/local-support/counselors" element={<Counselors />} />
          <Route path="/profile/:userId" element={<RouteErrorBoundary><Suspense fallback={<ProfileSkeleton />}><GrowthProfile /></Suspense></RouteErrorBoundary>} />
          <Route path="/local-support/celebrate-recovery" element={<CelebrateRecovery />} />
          {import.meta.env.DEV && (
            <Route path="/dev/mood-checkin" element={<MoodCheckInPreview />} />
          )}
          <Route path="/login" element={<ComingSoon title="Log In" />} />
          <Route path="/register" element={<RouteErrorBoundary><Suspense fallback={null}><RegisterPage /></Suspense></RouteErrorBoundary>} />
          <Route path="/accessibility" element={<RouteErrorBoundary><Suspense fallback={<RouteLoadingFallback />}><AccessibilityPage /></Suspense></RouteErrorBoundary>} />
          <Route path="*" element={<NotFound />} />
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
        </AuthProvider>
        </ErrorBoundary>
        </HelmetProvider>
      </BrowserRouter>
  )
}

export default App
