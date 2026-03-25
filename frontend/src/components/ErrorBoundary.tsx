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
        <div className="flex min-h-screen items-center justify-center bg-neutral-bg p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-text-dark">
              Something went wrong
            </h1>
            <p className="mb-6 text-text-light">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
