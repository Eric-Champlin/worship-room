interface ProgressArcProps {
  progress: number // 0-1
}

export function ProgressArc({ progress }: ProgressArcProps) {
  if (progress <= 0) return null

  // SVG rounded rect path that traces the pill border
  const width = 100
  const height = 56
  const rx = 28
  const perimeter = 2 * (width - 2 * rx) + 2 * Math.PI * rx
  const dashOffset = perimeter * (1 - progress)

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect
        x="0.75"
        y="0.75"
        width={width - 1.5}
        height={height - 1.5}
        rx={rx}
        ry={rx}
        fill="none"
        stroke="rgba(109, 40, 217, 0.6)"
        strokeWidth="1.5"
        strokeDasharray={perimeter}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </svg>
  )
}
