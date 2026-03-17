import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../Toast'

function TestComponent() {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast('Test message', 'success')}>
      Show Toast
    </button>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>,
  )
}

describe('Toast (standard)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('showToast renders a toast message', () => {
    renderWithProvider()
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('Toast auto-dismisses after 6 seconds', () => {
    vi.useFakeTimers()
    renderWithProvider()
    act(() => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText('Test message')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('success toast has role="status" and error toast has role="alert"', () => {
    function RoleTestComponent() {
      const { showToast } = useToast()
      return (
        <>
          <button onClick={() => showToast('Success msg', 'success')}>Success</button>
          <button onClick={() => showToast('Error msg', 'error')}>Error</button>
        </>
      )
    }
    render(
      <ToastProvider>
        <RoleTestComponent />
      </ToastProvider>,
    )
    act(() => { screen.getByText('Success').click() })
    expect(screen.getByRole('status')).toHaveTextContent('Success msg')

    act(() => { screen.getByText('Error').click() })
    expect(screen.getByRole('alert')).toHaveTextContent('Error msg')
  })

  it('limits to 3 toasts visible at once', () => {
    function MultiToastTest() {
      const { showToast } = useToast()
      return (
        <button
          onClick={() => {
            showToast('Toast 1')
            showToast('Toast 2')
            showToast('Toast 3')
            showToast('Toast 4')
          }}
        >
          Show Many
        </button>
      )
    }

    render(
      <ToastProvider>
        <MultiToastTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Show Many').click()
    })

    const toasts = screen.getAllByRole('status')
    expect(toasts.length).toBeLessThanOrEqual(3)
  })
})

describe('Toast (celebration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('celebration toast renders at bottom with correct styling', () => {
    vi.useFakeTimers()
    function CelebrationTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('First Flame', 'Congrats!', 'celebration')}>
          Celebrate
        </button>
      )
    }

    render(
      <ToastProvider>
        <CelebrationTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Celebrate').click()
    })

    expect(screen.getByText('First Flame')).toBeInTheDocument()
    expect(screen.getByText('Congrats!')).toBeInTheDocument()

    // Should be in the bottom container (celebration toasts have role="status")
    const celebrationToasts = screen.getAllByRole('status')
    const celebrationToast = celebrationToasts.find((el) => el.textContent?.includes('First Flame'))
    expect(celebrationToast).toBeDefined()
    expect(celebrationToast?.className).toContain('rounded-xl')
    expect(celebrationToast?.className).toContain('backdrop-blur-md')

    vi.useRealTimers()
  })

  it('celebration-confetti toast includes confetti particle elements', () => {
    vi.useFakeTimers()
    function ConfettiTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Prayer Warrior', 'Great job!', 'celebration-confetti')}>
          Confetti
        </button>
      )
    }

    render(
      <ToastProvider>
        <ConfettiTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Confetti').click()
    })

    // Confetti particles are aria-hidden spans
    const toastContainer = screen.getByText('Prayer Warrior').closest('[role="status"]')
    expect(toastContainer).toBeDefined()

    const confettiParticles = toastContainer?.querySelectorAll('[aria-hidden="true"]')
    expect(confettiParticles).toBeDefined()
    expect(confettiParticles!.length).toBeGreaterThan(0)

    vi.useRealTimers()
  })

  it('special-celebration toast has golden accent border', () => {
    vi.useFakeTimers()
    function SpecialTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Full Worship Day', 'Amazing!', 'special-celebration')}>
          Special
        </button>
      )
    }

    render(
      <ToastProvider>
        <SpecialTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Special').click()
    })

    const toastEl = screen.getByText('Full Worship Day').closest('[role="status"]')
    expect(toastEl).toBeDefined()
    expect(toastEl?.className).toContain('border-amber-400/50')

    vi.useRealTimers()
  })

  it('max 3 celebration toasts visible simultaneously', () => {
    vi.useFakeTimers()
    function MultiCelebrationTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => {
          showCelebrationToast('Badge 1', 'msg', 'celebration')
          showCelebrationToast('Badge 2', 'msg', 'celebration')
          showCelebrationToast('Badge 3', 'msg', 'celebration')
          showCelebrationToast('Badge 4', 'msg', 'celebration')
        }}>
          Many
        </button>
      )
    }

    render(
      <ToastProvider>
        <MultiCelebrationTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Many').click()
    })

    const celebrationToasts = screen.getAllByRole('status')
    // At most 3 celebration toasts visible
    expect(celebrationToasts.length).toBeLessThanOrEqual(3)

    vi.useRealTimers()
  })

  it('auto-dismiss durations: celebration 4s, confetti 5s, special 5s', () => {
    vi.useFakeTimers()
    function DurationTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Test Badge', 'msg', 'celebration')}>
          Go
        </button>
      )
    }

    render(
      <ToastProvider>
        <DurationTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Go').click()
    })

    expect(screen.getByText('Test Badge')).toBeInTheDocument()

    // Still visible at 3.9s
    act(() => {
      vi.advanceTimersByTime(3900)
    })
    expect(screen.getByText('Test Badge')).toBeInTheDocument()

    // Gone after 4s
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByText('Test Badge')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('celebration toasts have role="status" and aria-live="polite"', () => {
    vi.useFakeTimers()
    function AriaTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Aria Badge', 'msg', 'celebration')}>
          ARIA
        </button>
      )
    }

    render(
      <ToastProvider>
        <AriaTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('ARIA').click()
    })

    const toastEl = screen.getByText('Aria Badge').closest('[role="status"]')
    expect(toastEl).toBeDefined()
    expect(toastEl?.getAttribute('aria-live')).toBe('polite')

    vi.useRealTimers()
  })

  it('celebration toasts do NOT appear in the top-right container', () => {
    vi.useFakeTimers()
    function SeparateContainerTest() {
      const { showToast, showCelebrationToast } = useToast()
      return (
        <>
          <button onClick={() => showToast('Standard msg', 'success')}>Standard</button>
          <button onClick={() => showCelebrationToast('Celeb Badge', 'msg', 'celebration')}>Celeb</button>
        </>
      )
    }

    render(
      <ToastProvider>
        <SeparateContainerTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Standard').click()
      screen.getByText('Celeb').click()
    })

    // Standard toast is in top-right container (bg-white)
    const standardToast = screen.getByText('Standard msg').closest('[role="status"]')
    expect(standardToast?.className).toContain('bg-white')

    // Celebration toast is in bottom container (backdrop-blur-md)
    const celebrationToast = screen.getByText('Celeb Badge').closest('[role="status"]')
    expect(celebrationToast?.className).toContain('backdrop-blur-md')

    vi.useRealTimers()
  })

  it('confetti particles hidden with prefers-reduced-motion', () => {
    vi.useFakeTimers()
    function ReducedMotionTest() {
      const { showCelebrationToast } = useToast()
      return (
        <button onClick={() => showCelebrationToast('Badge', 'msg', 'celebration-confetti')}>
          Go
        </button>
      )
    }

    render(
      <ToastProvider>
        <ReducedMotionTest />
      </ToastProvider>,
    )

    act(() => {
      screen.getByText('Go').click()
    })

    const toastContainer = screen.getByText('Badge').closest('[role="status"]')
    const confettiParticles = toastContainer?.querySelectorAll('[aria-hidden="true"]')
    expect(confettiParticles).toBeDefined()

    // All confetti particles have motion-reduce:hidden class
    confettiParticles?.forEach((particle) => {
      expect(particle.className).toContain('motion-reduce:hidden')
    })

    vi.useRealTimers()
  })
})
