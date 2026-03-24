interface SleepTimerProgressRingProps {
  remainingMs: number
  totalDurationMs: number
  onClick: () => void
}

export function SleepTimerProgressRing({
  remainingMs,
  totalDurationMs,
  onClick,
}: SleepTimerProgressRingProps) {
  const radius = 10
  const strokeWidth = 2
  const circumference = 2 * Math.PI * radius
  const progress = totalDurationMs > 0 ? remainingMs / totalDurationMs : 0
  const dashOffset = circumference * (1 - progress)

  const minutes = Math.ceil(remainingMs / 60000)
  const label = `Sleep timer: ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={`${minutes}m remaining`}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        className="rotate-[-90deg]"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="#6D28D9"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
