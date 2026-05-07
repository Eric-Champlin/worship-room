import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '@/App'

// Controlled SEO mock: throws when seoState.shouldThrow is true, otherwise no-op.
// Used to trigger an error inside NotFound (inline in App.tsx, not mockable directly)
// so the test can verify the * route is wrapped in RouteErrorBoundary.
const seoState = { shouldThrow: false }

vi.mock('@/components/SEO', () => ({
  SEO: () => {
    if (seoState.shouldThrow) throw new Error('SEO render failure')
    return null
  },
}))

vi.mock('@/pages/RoutinesPage', () => ({
  RoutinesPage: () => {
    throw new Error('RoutinesPage render crash')
  },
}))

vi.mock('@/pages/BibleReader', () => ({
  BibleReader: () => {
    throw new Error('BibleReader render crash')
  },
}))

vi.mock('@/pages/meditate/BreathingExercise', () => ({
  BreathingExercise: () => {
    throw new Error('BreathingExercise render crash')
  },
}))

const ORIGINAL_PATHNAME = window.location.pathname

describe('App route error boundary coverage', () => {
  beforeEach(() => {
    seoState.shouldThrow = false
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    seoState.shouldThrow = false
    window.history.pushState({}, '', ORIGINAL_PATHNAME)
  })

  // --- Step 6: RouteErrorBoundary wraps all routes ---

  it('Music Routines route is wrapped in RouteErrorBoundary', async () => {
    window.history.pushState({}, '', '/music/routines')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
    })
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('BibleReader route is wrapped in RouteErrorBoundary', async () => {
    window.history.pushState({}, '', '/bible/genesis/1')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
    })
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('NotFound route (*) is wrapped in RouteErrorBoundary', async () => {
    seoState.shouldThrow = true
    window.history.pushState({}, '', '/some-nonexistent-route')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
    })
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('Meditate Breathing route is wrapped in RouteErrorBoundary', async () => {
    window.history.pushState({}, '', '/meditate/breathing')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText("This page couldn't load")).toBeInTheDocument()
    })
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  // --- Step 8: NotFound "Go Home" link chrome ---

  it('NotFound Go Home link uses plain text chrome (no Caveat)', async () => {
    window.history.pushState({}, '', '/nonexistent-page-xyz')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: 'Go Home' })
    expect(link.className).toContain('text-base')
    expect(link.className).toContain('underline')
    expect(link.className).not.toContain('font-script')
  })

  it('NotFound Go Home link routes to home', async () => {
    window.history.pushState({}, '', '/nonexistent-page-xyz')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: 'Go Home' })
    expect(link).toHaveAttribute('href', '/')
  })
})
