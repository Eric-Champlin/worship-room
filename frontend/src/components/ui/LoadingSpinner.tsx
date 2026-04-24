import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /** Pixel size of the rendered SVG. Defaults to 18. */
  size?: number
  /** Additional classNames merged with defaults. */
  className?: string
  /** Screen-reader label. Defaults to "Loading". */
  label?: string
}

export function LoadingSpinner({ size = 18, className, label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        aria-hidden="true"
        className="motion-safe:animate-spin motion-reduce:opacity-60"
      >
        <circle cx="12" cy="12" r="9" opacity="0.25" />
        <path d="M21 12a9 9 0 0 1-9 9" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
