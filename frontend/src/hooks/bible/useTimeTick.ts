import { useEffect, useRef, useState } from 'react'

export interface TimeTick {
  now: Date
  today: string // YYYY-MM-DD local
  currentMinute: number // incrementing counter for re-render triggers
}

function getTodayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function makeInitial(minute: number): TimeTick {
  return { now: new Date(), today: getTodayString(), currentMinute: minute }
}

export function useTimeTick(): TimeTick {
  // SSR guard
  if (typeof window === 'undefined') {
    return { now: new Date(), today: '1970-01-01', currentMinute: 0 }
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [tick, setTick] = useState<TimeTick>(() => makeInitial(0))
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const minuteRef = useRef(0)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    function doTick() {
      minuteRef.current += 1
      setTick(makeInitial(minuteRef.current))
    }

    function startInterval() {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(doTick, 60_000)
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Tick immediately on resume, then restart interval
        doTick()
        startInterval()
      }
    }

    startInterval()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return tick
}
