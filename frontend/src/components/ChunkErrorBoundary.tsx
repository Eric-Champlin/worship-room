import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
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
          <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div
              role="alert"
              className="mx-auto max-w-md rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] text-center"
            >
              <RefreshCw className="mx-auto h-8 w-8 text-violet-300" aria-hidden="true" />
              <h1 className="mt-4 text-2xl font-bold text-white">
                Let&apos;s try that again
              </h1>
              <p className="mt-2 text-base text-white/70">
                Sometimes things don&apos;t load as expected. A quick refresh usually does the trick.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
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
