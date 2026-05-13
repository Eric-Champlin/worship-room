import type { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { useNightMode } from '@/hooks/useNightMode'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  // Spec 6.3 — Apply night-mode attribute always (off when day, on when night)
  // so CSS rules under [data-night-mode='on'] can fire without a wrapper swap.
  const { active } = useNightMode()
  return (
    <div
      data-night-mode={active ? 'on' : 'off'}
      className="min-h-screen bg-dashboard-dark font-sans"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      {children}
    </div>
  )
}
