import type { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { useNightMode } from '@/hooks/useNightMode'
import { useWatchMode } from '@/hooks/useWatchMode'
import { CrisisResourcesBanner } from './CrisisResourcesBanner'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  // Spec 6.3 — Apply night-mode attribute always (off when day, on when night).
  // Post Prayer Wall Redesign (2026-05-13) no CSS consumes this attribute;
  // it remains as a forward-compat signal + a behavioral hook for
  // useWatchMode (Spec 6.4) and tests.
  const { active } = useNightMode()
  // Spec 6.4 — Crisis banner mounts here so all 4 prayer-wall family routes
  // (/prayer-wall, /prayer-wall/:id, /prayer-wall/dashboard, /prayer-wall/user/:id)
  // inherit it. Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE.
  const watchMode = useWatchMode()
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
      {watchMode.active && (
        <div className="mx-auto mt-4 w-full max-w-3xl px-4">
          <CrisisResourcesBanner />
        </div>
      )}
      {children}
    </div>
  )
}
