import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Layout } from '@/components/Layout'

interface ChunkErrorBoundaryProps {
  children: ReactNode
}

interface ChunkErrorBoundaryState {
  hasChunkError: boolean
}

export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props)
    this.state = { hasChunkError: false }
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState | null {
    // Only catch chunk loading errors (dynamic import failures)
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk')
    ) {
      return { hasChunkError: true }
    }
    // Let other errors propagate to the general ErrorBoundary
    return null
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ChunkErrorBoundary] Chunk loading failed:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasChunkError) {
      return (
        <Layout>
          <div className="flex min-h-[60vh] items-center justify-center px-6">
            <div className="max-w-md text-center">
              <svg
                className="mx-auto mb-6 h-12 w-12 text-primary/60"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="24" y1="8" x2="24" y2="40" />
                <line x1="14" y1="18" x2="34" y2="18" />
              </svg>
              <h1 className="mb-3 text-2xl font-bold text-white">
                Let&apos;s try that again
              </h1>
              <p className="mb-8 text-base text-white/70">
                Sometimes things don&apos;t load as expected. A quick refresh usually does the trick.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </Layout>
      )
    }

    return this.props.children
  }
}
