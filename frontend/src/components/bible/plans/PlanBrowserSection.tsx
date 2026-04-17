import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PlanBrowserSectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function PlanBrowserSection({ title, children, className }: PlanBrowserSectionProps) {
  return (
    <section className={cn(className)}>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}
