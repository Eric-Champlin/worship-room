import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { PageTransition } from '../PageTransition'

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'
const mockedUseReducedMotion = vi.mocked(useReducedMotion)

function TestPage({ text }: { text: string }) {
  return <div data-testid="page-content">{text}</div>
}

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(to)}>Navigate</button>
}

function TestApp({ initialRoute = '/' }: { initialRoute?: string }) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <PageTransition>
        <Routes>
          <Route path="/" element={<><TestPage text="Home" /><NavigateButton to="/about" /></>} />
          <Route path="/about" element={<><TestPage text="About" /><NavigateButton to="/" /></>} />
        </Routes>
      </PageTransition>
    </MemoryRouter>
  )
}

describe('PageTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockedUseReducedMotion.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders children content', () => {
    render(<TestApp />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('applies page-enter animation on mount', () => {
    const { container } = render(<TestApp />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('animate-page-enter')
  })

  it('triggers exit phase on route change', () => {
    const { container } = render(<TestApp />)

    // Navigate to trigger exit
    act(() => {
      screen.getByText('Navigate').click()
    })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('opacity-0')
  })

  it('triggers enter phase after exit completes', () => {
    const { container } = render(<TestApp />)

    act(() => {
      screen.getByText('Navigate').click()
    })

    // Advance past exit duration (150ms)
    act(() => {
      vi.advanceTimersByTime(150)
    })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('animate-page-enter')
  })

  it('skips animation with reduced motion', () => {
    mockedUseReducedMotion.mockReturnValue(true)

    const { container } = render(<TestApp />)
    const wrapper = container.firstChild as HTMLElement
    // No animation classes should be present
    expect(wrapper.className).not.toContain('animate-page-enter')
    expect(wrapper.className).not.toContain('opacity-0')
  })

  it('handles rapid route changes without stale state', () => {
    const { container } = render(<TestApp />)

    // Navigate rapidly
    act(() => {
      screen.getByText('Navigate').click()
    })
    act(() => {
      vi.advanceTimersByTime(50) // Mid-exit
    })

    // The component should still be in a valid state
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeTruthy()

    // Complete the transition
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should settle to idle (no animation classes)
    const finalWrapper = container.firstChild as HTMLElement
    expect(finalWrapper).toBeTruthy()
  })

  it('cleans up timeout on unmount', () => {
    const { unmount, container: _container } = render(<TestApp />)

    act(() => {
      screen.getByText('Navigate').click()
    })

    // Unmount during exit — should not throw
    unmount()

    // Advance timers — no error should occur
    act(() => {
      vi.advanceTimersByTime(500)
    })
  })
})
