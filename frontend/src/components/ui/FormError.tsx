import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FormErrorSeverity = 'error' | 'warning' | 'info'

interface FormErrorProps {
  /** The message to announce and display. Caller must supply copy — this primitive handles structure + a11y, not strings. */
  children: ReactNode
  /** Severity controls role, aria-live, icon, and tonal color. Defaults to 'error'. */
  severity?: FormErrorSeverity
  /** When provided, renders a dismiss button. Omit to hide dismissal. */
  onDismiss?: () => void
  className?: string
}

const SEVERITY_META: Record<
  FormErrorSeverity,
  {
    role: 'alert' | 'status'
    ariaLive: 'assertive' | 'polite'
    icon: typeof AlertCircle
    wrapperClass: string
  }
> = {
  error: {
    role: 'alert',
    ariaLive: 'assertive',
    icon: AlertCircle,
    wrapperClass: 'border-red-400/30 bg-red-950/30 text-red-100',
  },
  warning: {
    role: 'alert',
    ariaLive: 'polite',
    icon: AlertTriangle,
    wrapperClass: 'border-amber-400/30 bg-amber-950/30 text-amber-100',
  },
  info: {
    role: 'status',
    ariaLive: 'polite',
    icon: Info,
    wrapperClass: 'border-sky-400/30 bg-sky-950/30 text-sky-100',
  },
}

export function FormError({
  children,
  severity = 'error',
  onDismiss,
  className,
}: FormErrorProps) {
  const meta = SEVERITY_META[severity]
  const Icon = meta.icon

  return (
    <div
      role={meta.role}
      aria-live={meta.ariaLive}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        meta.wrapperClass,
        className,
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-m-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-current/80 transition-colors hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg motion-reduce:transition-none"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
