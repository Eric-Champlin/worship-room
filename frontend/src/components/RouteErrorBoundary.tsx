import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'

function RouteErrorFallback() {
  return (
    <Layout>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div
          role="alert"
          className="mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] text-center"
        >
          <h1 className="text-2xl font-bold text-white">
            This page couldn&apos;t load
          </h1>
          <p className="mt-2 text-base text-white/70">
            Try refreshing or going back to the home page.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
            >
              Refresh
            </button>
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

interface RouteErrorBoundaryProps {
  children: ReactNode
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={<RouteErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}
