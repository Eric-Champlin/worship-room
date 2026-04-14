import type { ReactNode } from 'react'

interface LiveRegionProps {
  children: ReactNode
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}
