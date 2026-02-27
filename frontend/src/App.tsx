import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { Home } from './pages/Home'
import { Health } from './pages/Health'
import { Insights } from './pages/Insights'
import { Daily } from './pages/Daily'
import { PrayerWall } from './pages/PrayerWall'
import { PrayerDetail } from './pages/PrayerDetail'
import { PrayerWallProfile } from './pages/PrayerWallProfile'
import { PrayerWallDashboard } from './pages/PrayerWallDashboard'
import { Layout } from './components/Layout'

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/health" element={<Health />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/daily" element={<Daily />} />
          <Route path="/scripture" element={<ComingSoon title="Pray" />} />
          <Route path="/journal" element={<ComingSoon title="Journal" />} />
          <Route path="/meditate" element={<ComingSoon title="Meditate" />} />
          <Route path="/music" element={<ComingSoon title="Music" />} />
          <Route path="/music/playlists" element={<ComingSoon title="Worship Playlists" />} />
          <Route path="/music/ambient" element={<ComingSoon title="Ambient Sounds" />} />
          <Route path="/music/sleep" element={<ComingSoon title="Sleep & Rest" />} />
          <Route path="/prayer-wall" element={<PrayerWall />} />
          {/* Static segments must precede :id to avoid matching "dashboard"/"user" as a prayer ID */}
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/prayer-wall/user/:id" element={<PrayerWallProfile />} />
          <Route path="/prayer-wall/:id" element={<PrayerDetail />} />
          <Route path="/churches" element={<ComingSoon title="Churches" />} />
          <Route path="/counselors" element={<ComingSoon title="Counselors" />} />
          <Route path="/login" element={<ComingSoon title="Log In" />} />
          <Route path="/register" element={<ComingSoon title="Get Started" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
