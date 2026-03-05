import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  hero?: ReactNode
}

export function Layout({ children, hero }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      {hero ? <Navbar transparent /> : <Navbar />}
      {hero}
      <main
        id="main-content"
        className={cn(
          'flex-1',
          hero ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
