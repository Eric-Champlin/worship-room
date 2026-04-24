interface ChartFallbackProps {
  message?: string
}

export function ChartFallback({ message = 'Chart unavailable right now' }: ChartFallbackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"
    >
      <p className="text-sm text-white/60">{message}</p>
    </div>
  )
}
