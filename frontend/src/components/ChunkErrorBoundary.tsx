import { Component, type ErrorInfo, type ReactNode } from 'react'

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
        <div className="flex min-h-screen items-center justify-center bg-dashboard-dark px-6">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-white">
              Something went wrong loading this page
            </h1>
            <p className="mb-8 text-base text-white/70">
              This can happen with a slow connection. Please try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
