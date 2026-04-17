import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  hero?: ReactNode
  /**
   * When true, renders the navbar in transparent overlay mode (absolute positioning,
   * no background, matching `/daily` and `/grow`). Ignored when `hero` is supplied,
   * because hero mode already uses a transparent navbar.
   * Defaults to false for backward compatibility with all existing consumers.
   */
  transparentNav?: boolean
}

export function Layout({ children, hero, transparentNav = false }: LayoutProps) {
  const navTransparent = Boolean(hero) || transparentNav
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-hero-bg font-sans">
      <Navbar transparent={navTransparent} />
      {hero}
      <main
        id="main-content"
        className={cn(
          'flex-1',
          hero && 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
          !hero && !transparentNav && 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8',
          !hero && transparentNav && 'contents',
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
