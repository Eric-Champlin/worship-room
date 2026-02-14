import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  )
}
