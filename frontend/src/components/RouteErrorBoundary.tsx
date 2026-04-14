import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Layout } from '@/components/Layout'

function RouteErrorFallback() {
  return (
    <Layout dark>
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-white">
            This page couldn&apos;t load
          </h1>
          <p className="mb-6 text-base text-white/70">
            Try refreshing or going back to the home page.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Refresh
            </button>
            <Link
              to="/"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
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
