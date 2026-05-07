import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RouteErrorBoundary } from '../RouteErrorBoundary'

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

function ThrowingChild({ error }: { error?: Error }) {
  if (error) throw error
  return <div>child content</div>
}

function renderBoundary(child: React.ReactNode) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteErrorBoundary>{child}</RouteErrorBoundary>
    </MemoryRouter>,
  )
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    renderBoundary(<div>hello world</div>)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('shows error fallback with role="alert" when child throws', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('error fallback uses canonical FrostedCard chrome', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('border-white/[0.12]')
    expect(alert.className).toContain('bg-white/[0.06]')
    expect(alert.className).toContain('rounded-2xl')
    expect(alert.className).toContain('backdrop-blur-sm')
    expect(alert.className).toContain('mx-auto')
    expect(alert.className).toContain('max-w-md')
  })

  it('preserves heading copy', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
  })

  it('preserves body copy', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    expect(screen.getByText(/Try refreshing or going back/)).toBeInTheDocument()
  })

  it('Refresh button has min-h-[44px] and reconciled focus ring', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const refresh = screen.getByRole('button', { name: 'Refresh' })
    expect(refresh.className).toContain('min-h-[44px]')
    expect(refresh.className).toContain('ring-offset-hero-bg')
  })

  it('Go Home link is canonical white-pill peer-tier', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const goHome = screen.getByRole('link', { name: 'Go Home' })
    expect(goHome.className).toContain('bg-white')
    expect(goHome.className).toContain('text-hero-bg')
    expect(goHome.className).toContain('rounded-full')
    expect(goHome.className).toContain('min-h-[44px]')
  })

  it('Go Home link does NOT use deprecated bg-primary', () => {
    renderBoundary(<ThrowingChild error={new Error('boom')} />)
    const goHome = screen.getByRole('link', { name: 'Go Home' })
    expect(goHome.className).not.toContain('bg-primary')
  })
})
