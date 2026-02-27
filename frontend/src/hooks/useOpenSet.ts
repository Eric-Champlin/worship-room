import { useState, useCallback } from 'react'

export function useOpenSet() {
  const [openSet, setOpenSet] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return { openSet, toggle } as const
}
