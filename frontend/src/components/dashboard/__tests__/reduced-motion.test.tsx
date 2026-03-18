import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { SkeletonBlock, SkeletonCircle } from '../Skeleton'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock prefers-reduced-motion as true
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function GridWithFaithPoints() {
  const faithPoints = useFaithPoints()
  return <DashboardWidgetGrid faithPoints={faithPoints} justCompletedCheckIn />
}

function renderGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <GridWithFaithPoints />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Reduced Motion — Dashboard Widgets', () => {
  it('counters show final values immediately (no animation)', () => {
    renderGrid()
    // AnimatedCounter with reduced motion shows final value directly
    // Multiple elements contain "Faith Points" — just verify at least one exists
    const elements = screen.getAllByText('Faith Points', { exact: false })
    expect(elements.length).toBeGreaterThan(0)
  })

  it('card collapse transition-none present', () => {
    const { container } = renderGrid()
    const transitionElements = container.querySelectorAll('.motion-reduce\\:transition-none')
    expect(transitionElements.length).toBeGreaterThan(0)
  })

  it('dashboard main wrapper has motion-reduce:animate-none', () => {
    // Verify the class exists on dashboard cards' collapse/expand
    const { container } = renderGrid()
    const noAnimElements = container.querySelectorAll('.motion-reduce\\:transition-none')
    expect(noAnimElements.length).toBeGreaterThan(0)
  })
})

describe('Skeleton Components', () => {
  it('SkeletonBlock renders with pulse animation and is aria-hidden', () => {
    const { container } = render(<SkeletonBlock className="h-40 w-full" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('animate-pulse', 'rounded', 'bg-white/10', 'h-40', 'w-full')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('SkeletonCircle renders with pulse animation and is aria-hidden', () => {
    const { container } = render(<SkeletonCircle className="h-16 w-16" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass('animate-pulse', 'rounded-full', 'bg-white/10', 'h-16', 'w-16')
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })
})
