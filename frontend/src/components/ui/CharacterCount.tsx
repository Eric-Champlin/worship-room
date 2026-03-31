import { useRef, useState, useEffect } from 'react'

interface CharacterCountProps {
  current: number
  max: number
  warningAt?: number
  dangerAt?: number
  visibleAt?: number
  id?: string
  className?: string
}

type Zone = 'normal' | 'warning' | 'danger'

function getZone(current: number, warningAt: number, dangerAt: number): Zone {
  if (current >= dangerAt) return 'danger'
  if (current >= warningAt) return 'warning'
  return 'normal'
}

const zoneColors: Record<Zone, string> = {
  normal: 'text-white/60',
  warning: 'text-amber-400',
  danger: 'text-red-400',
}

export function CharacterCount({
  current,
  max,
  warningAt,
  dangerAt,
  visibleAt = 1,
  id,
  className,
}: CharacterCountProps) {
  const effectiveWarningAt = warningAt ?? Math.floor(max * 0.8)
  const effectiveDangerAt = dangerAt ?? Math.floor(max * 0.96)

  const zone = getZone(current, effectiveWarningAt, effectiveDangerAt)
  const remaining = max - current

  const prevZoneRef = useRef<Zone>(zone)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (zone !== prevZoneRef.current) {
      setAnnouncement(`${remaining.toLocaleString()} characters remaining`)
      prevZoneRef.current = zone
    }
  }, [zone, remaining])

  if (current < visibleAt) return null

  return (
    <span id={id} className={className}>
      <span aria-hidden="true" className={`text-xs ${zoneColors[zone]}`}>
        {current.toLocaleString()} / {max.toLocaleString()}
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </span>
  )
}
