import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AnimatedCounter } from '../AnimatedCounter'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'
const mockUseReducedMotion = vi.mocked(useReducedMotion)

beforeEach(() => {
  vi.useFakeTimers()
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AnimatedCounter', () => {
  it('renders final value immediately when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<AnimatedCounter from={0} to={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('starts at from value and animates to target', () => {
    let rafCallback: FrameRequestCallback | null = null
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    render(<AnimatedCounter from={0} to={100} duration={600} />)

    // Initially shows 0
    expect(screen.getByText('0')).toBeInTheDocument()

    // Simulate animation complete
    if (rafCallback) {
      act(() => {
        rafCallback!(performance.now() + 600)
      })
    }

    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('formats numbers with commas', () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<AnimatedCounter from={0} to={1234} />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('accepts custom formatFn', () => {
    mockUseReducedMotion.mockReturnValue(true)
    const formatFn = (n: number) => `${n} pts`
    render(<AnimatedCounter from={0} to={50} formatFn={formatFn} />)
    expect(screen.getByText('50 pts')).toBeInTheDocument()
  })

  it('applies className to span element', () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<AnimatedCounter from={0} to={10} className="text-xl font-bold" />)
    const span = screen.getByText('10')
    expect(span).toHaveClass('text-xl', 'font-bold')
  })
})
