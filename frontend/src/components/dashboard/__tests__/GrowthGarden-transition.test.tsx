import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { GrowthGarden, STAGE_LABELS } from '../GrowthGarden'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

describe('GrowthGarden — Stage Transition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('crossfades when stage changes', () => {
    const { rerender } = render(<GrowthGarden stage={2} size="lg" animated={true} />)

    rerender(<GrowthGarden stage={3} size="lg" animated={true} />)

    // Both old and new stages should be rendered during transition
    expect(screen.getByTestId('garden-transition-old')).toBeInTheDocument()
    expect(screen.getByTestId('garden-transition-new')).toBeInTheDocument()
  })

  it('crossfade completes after 2 seconds', () => {
    const { rerender } = render(<GrowthGarden stage={2} size="lg" animated={true} />)

    rerender(<GrowthGarden stage={3} size="lg" animated={true} />)
    expect(screen.getByTestId('garden-transition-old')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Old stage should be gone, only new stage remains
    expect(screen.queryByTestId('garden-transition-old')).not.toBeInTheDocument()
    expect(screen.queryByTestId('garden-transition-new')).not.toBeInTheDocument()
    // Normal SVG with role="img" should be there
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[3])
  })

  it('instant switch with reduced motion', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const { rerender } = render(<GrowthGarden stage={2} size="lg" animated={true} />)

    rerender(<GrowthGarden stage={3} size="lg" animated={true} />)

    // No transition elements
    expect(screen.queryByTestId('garden-transition-old')).not.toBeInTheDocument()
    expect(screen.queryByTestId('garden-transition-new')).not.toBeInTheDocument()
    // New stage immediately visible
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[3])
  })

  it('no crossfade on initial render', () => {
    render(<GrowthGarden stage={3} size="lg" animated={true} />)

    expect(screen.queryByTestId('garden-transition-old')).not.toBeInTheDocument()
    expect(screen.queryByTestId('garden-transition-new')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[3])
  })

  it('no crossfade when animated=false', () => {
    const { rerender } = render(<GrowthGarden stage={2} size="lg" animated={false} />)

    rerender(<GrowthGarden stage={3} size="lg" animated={false} />)

    // No transition elements — instant switch
    expect(screen.queryByTestId('garden-transition-old')).not.toBeInTheDocument()
    expect(screen.queryByTestId('garden-transition-new')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', STAGE_LABELS[3])
  })
})
