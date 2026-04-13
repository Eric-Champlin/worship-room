import { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  hero?: ReactNode
  dark?: boolean
}

export function Layout({ children, hero, dark }: LayoutProps) {
  return (
    <div className={cn(
      'flex min-h-screen flex-col overflow-x-hidden font-sans',
      dark ? 'bg-dashboard-dark' : 'bg-neutral-bg',
    )}>
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
