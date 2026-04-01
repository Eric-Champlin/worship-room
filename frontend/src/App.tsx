import { BrowserRouter, Routes, Route, Navigate, useSearchParams, Link } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Layout } from './components/Layout'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'
import { InstallPromptProvider } from '@/contexts/InstallPromptContext'
import { useAuth } from '@/hooks/useAuth'
import { SEO } from '@/components/SEO'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary'
import { WhisperToastProvider } from '@/components/ui/WhisperToast'
import { MidnightVerse } from '@/components/MidnightVerse'
import { PageTransition } from '@/components/ui/PageTransition'
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
  BibleBrowserSkeleton,
  ProfileSkeleton,
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
const BibleBrowser = lazy(() => import('./pages/BibleBrowser').then((m) => ({ default: m.BibleBrowser })))
const BibleReader = lazy(() => import('./pages/BibleReader').then((m) => ({ default: m.BibleReader })))
const AskPage = lazy(() => import('./pages/AskPage').then((m) => ({ default: m.AskPage })))
const MoodCheckInPreview = lazy(() =>
  import('./pages/MoodCheckInPreview').then((m) => ({ default: m.MoodCheckInPreview }))
)

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
      <SEO title={title} description={`${title} — coming soon to Worship Room.`} noIndex />
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
    <Layout dark>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noIndex />
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
        <WhisperToastProvider>
        <MidnightVerse />
        <UpdatePrompt />
        <ChunkErrorBoundary>
        <Suspense fallback={<RouteLoadingFallback />}>
        <PageTransition>
        <Routes>
          <Route path="/" element={<Suspense fallback={<DashboardSkeleton />}><RootRoute /></Suspense>} />
          <Route path="/health" element={<Health />} />
          <Route path="/insights" element={<Suspense fallback={<InsightsSkeleton />}><Insights /></Suspense>} />
          <Route path="/insights/monthly" element={<MonthlyReport />} />
          <Route path="/friends" element={<Suspense fallback={<FriendsSkeleton />}><Friends /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense>} />
          <Route path="/my-prayers" element={<Suspense fallback={<MyPrayersSkeleton />}><MyPrayers /></Suspense>} />
          <Route path="/daily" element={<Suspense fallback={<DailyHubSkeleton />}><DailyHub /></Suspense>} />
          <Route path="/ask" element={<AskPage />} />
          <Route path="/devotional" element={<DevotionalRedirect />} />
          <Route path="/grow" element={<Suspense fallback={<GrowPageSkeleton />}><GrowPage /></Suspense>} />
          <Route path="/reading-plans" element={<ReadingPlansRedirect />} />
          <Route path="/reading-plans/:planId" element={<ReadingPlanDetail />} />
          <Route path="/challenges" element={<Navigate to="/grow?tab=challenges" replace />} />
          <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
          <Route path="/bible" element={<Suspense fallback={<BibleBrowserSkeleton />}><BibleBrowser /></Suspense>} />
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
          <Route path="/music" element={<Suspense fallback={<MusicSkeleton />}><MusicPage /></Suspense>} />
          <Route path="/music/playlists" element={<Navigate to="/music?tab=playlists" replace />} />
          <Route path="/music/ambient" element={<Navigate to="/music?tab=ambient" replace />} />
          <Route path="/music/sleep" element={<Navigate to="/music?tab=sleep" replace />} />
          <Route path="/music/routines" element={<RoutinesPage />} />
          <Route path="/prayer-wall" element={<Suspense fallback={<PrayerWallSkeleton />}><PrayerWall /></Suspense>} />
          {/* Static segments must precede :id to avoid matching "dashboard"/"user" as a prayer ID */}
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
          <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
          <Route path="/local-support/churches" element={<Churches />} />
          <Route path="/local-support/counselors" element={<Counselors />} />
          <Route path="/profile/:userId" element={<Suspense fallback={<ProfileSkeleton />}><GrowthProfile /></Suspense>} />
          <Route path="/local-support/celebrate-recovery" element={<CelebrateRecovery />} />
          {import.meta.env.DEV && (
            <Route path="/dev/mood-checkin" element={<MoodCheckInPreview />} />
          )}
          <Route path="/login" element={<ComingSoon title="Log In" />} />
          <Route path="/register" element={<ComingSoon title="Get Started" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PageTransition>
        </Suspense>
        </ChunkErrorBoundary>
        </WhisperToastProvider>
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
