import { useId } from 'react'

interface HeadingDividerProps {
  width: number
}

export function HeadingDivider({ width }: HeadingDividerProps) {
  const uid = useId()
  if (width <= 0) return null

  const leftGradId = `hd-fade-left-${uid}`
  const rightGradId = `hd-fade-right-${uid}`
  const h = 12
  // Proportions: 18% short line, 2% gap, 2% dot, 2% gap, 56% center, 2% gap, 2% dot, 2% gap, 18% short line
  // but dots have fixed radius so we compute positions proportionally
  const lineH = 1.5
  const dotR = 2.5
  const lineY = (h - lineH) / 2
  const dotCY = h / 2

  // Percentage-based positions
  const shortLen = width * 0.18
  const gap = width * 0.02
  const centerLen = width * 0.52

  // Left short line: 0 → shortLen
  const leftLineEnd = shortLen
  // Left dot center
  const leftDotCX = leftLineEnd + gap + dotR
  // Center line start
  const centerStart = leftDotCX + dotR + gap
  // Center line end
  const centerEnd = centerStart + centerLen
  // Right dot center
  const rightDotCX = centerEnd + gap + dotR
  // Right short line start
  const rightLineStart = rightDotCX + dotR + gap
  const rightLineEnd = rightLineStart + shortLen

  // Use the actual computed width for the viewBox
  const totalW = rightLineEnd

  return (
    <svg
      width={totalW}
      height={h}
      viewBox={`0 0 ${totalW} ${h}`}
      aria-hidden="true"
      className="block"
    >
      <defs>
        <linearGradient id={leftGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={rightGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Left faded line */}
      <rect
        x={0}
        y={lineY}
        width={shortLen}
        height={lineH}
        fill={`url(#${leftGradId})`}
      />

      {/* Left dot */}
      <circle cx={leftDotCX} cy={dotCY} r={dotR} fill="#FFFFFF" />

      {/* Center line */}
      <rect
        x={centerStart}
        y={lineY}
        width={centerLen}
        height={lineH}
        fill="#FFFFFF"
      />

      {/* Right dot */}
      <circle cx={rightDotCX} cy={dotCY} r={dotR} fill="#FFFFFF" />

      {/* Right faded line */}
      <rect
        x={rightLineStart}
        y={lineY}
        width={shortLen}
        height={lineH}
        fill={`url(#${rightGradId})`}
      />
    </svg>
  )
}
