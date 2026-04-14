import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-screen items-center justify-center bg-hero-bg p-4">
          <div className="relative w-full max-w-md">
            {/* Subtle glow orb behind the card */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px]"
              style={{ background: 'rgba(139, 92, 246, 0.20)' }}
              aria-hidden="true"
            />

            {/* Frosted glass card */}
            <div className="relative rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-8 shadow-[0_0_40px_rgba(139,92,246,0.15),0_8px_30px_rgba(0,0,0,0.4)] text-center">
              <h1
                className="text-3xl font-bold sm:text-4xl pb-1"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Something went wrong
              </h1>
              <p className="mt-4 text-base text-white/70 leading-relaxed">
                We&apos;re sorry for the inconvenience. Please try refreshing the page.
              </p>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.reload()
                }}
                className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
