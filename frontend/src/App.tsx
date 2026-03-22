import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { Home } from './pages/Home'
import { Health } from './pages/Health'
import { Insights } from './pages/Insights'
import { MonthlyReport } from './pages/MonthlyReport'
import { Friends } from './pages/Friends'
import { DailyHub } from './pages/DailyHub'
import { BreathingExercise } from './pages/meditate/BreathingExercise'
import { ScriptureSoaking } from './pages/meditate/ScriptureSoaking'
import { GratitudeReflection } from './pages/meditate/GratitudeReflection'
import { ActsPrayerWalk } from './pages/meditate/ActsPrayerWalk'
import { PsalmReading } from './pages/meditate/PsalmReading'
import { ExamenReflection } from './pages/meditate/ExamenReflection'
import { SharedVerse } from './pages/SharedVerse'
import { SharedPrayer } from './pages/SharedPrayer'
import { PrayerWall } from './pages/PrayerWall'
import { PrayerDetail } from './pages/PrayerDetail'
import { PrayerWallProfile } from './pages/PrayerWallProfile'
import { PrayerWallDashboard } from './pages/PrayerWallDashboard'
import { Layout } from './components/Layout'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { Churches } from './pages/Churches'
import { Counselors } from './pages/Counselors'
import { CelebrateRecovery } from './pages/CelebrateRecovery'
import { MusicPage } from './pages/MusicPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { GrowthProfile } from './pages/GrowthProfile'
import { DevotionalPage } from './pages/DevotionalPage'
import { MyPrayers } from './pages/MyPrayers'
import { ReadingPlans } from './pages/ReadingPlans'
import { ReadingPlanDetail } from './pages/ReadingPlanDetail'
import { BibleBrowser } from './pages/BibleBrowser'
import { BibleReader } from './pages/BibleReader'
import { useAuth } from '@/hooks/useAuth'
import { lazy, Suspense } from 'react'

const MoodCheckInPreview = lazy(() =>
  import('./pages/MoodCheckInPreview').then((m) => ({ default: m.MoodCheckInPreview }))
)

function ComingSoon({ title }: { title: string }) {
  return (
    <Layout>
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold text-text-dark sm:text-4xl">
            Page Not Found
          </h1>
          <p className="mb-6 text-base text-text-light sm:text-lg">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <a
            href="/"
            className="font-script text-2xl text-primary transition-colors hover:text-primary-lt"
          >
            Go Home
          </a>
        </div>
      </div>
    </Layout>
  )
}

function RootRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Dashboard /> : <Home />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
        <ToastProvider>
        <AuthModalProvider>
        <AudioProvider>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/health" element={<Health />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/monthly" element={<MonthlyReport />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-prayers" element={<MyPrayers />} />
          <Route path="/daily" element={<DailyHub />} />
          <Route path="/devotional" element={<DevotionalPage />} />
          <Route path="/reading-plans" element={<ReadingPlans />} />
          <Route path="/reading-plans/:planId" element={<ReadingPlanDetail />} />
          <Route path="/bible" element={<BibleBrowser />} />
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
          <Route path="/music" element={<MusicPage />} />
          <Route path="/music/playlists" element={<Navigate to="/music?tab=playlists" replace />} />
          <Route path="/music/ambient" element={<Navigate to="/music?tab=ambient" replace />} />
          <Route path="/music/sleep" element={<Navigate to="/music?tab=sleep" replace />} />
          <Route path="/music/routines" element={<RoutinesPage />} />
          <Route path="/prayer-wall" element={<PrayerWall />} />
          {/* Static segments must precede :id to avoid matching "dashboard"/"user" as a prayer ID */}
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
          <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
          <Route path="/local-support/churches" element={<Churches />} />
          <Route path="/local-support/counselors" element={<Counselors />} />
          <Route path="/profile/:userId" element={<GrowthProfile />} />
          <Route path="/local-support/celebrate-recovery" element={<CelebrateRecovery />} />
          {import.meta.env.DEV && (
            <Route path="/dev/mood-checkin" element={<Suspense><MoodCheckInPreview /></Suspense>} />
          )}
          <Route path="/login" element={<ComingSoon title="Log In" />} />
          <Route path="/register" element={<ComingSoon title="Get Started" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AudioProvider>
        </AuthModalProvider>
        </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
