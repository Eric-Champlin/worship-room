import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharacterCount } from '../CharacterCount'

function renderCount(props: Parameters<typeof CharacterCount>[0]) {
  return render(<CharacterCount {...props} />)
}

describe('CharacterCount', () => {
  it('renders count in X / Y format', () => {
    renderCount({ current: 50, max: 500 })
    expect(screen.getByText('50 / 500')).toBeInTheDocument()
  })

  it('formats numbers with commas', () => {
    renderCount({ current: 4200, max: 5000 })
    expect(screen.getByText('4,200 / 5,000')).toBeInTheDocument()
  })

  it('applies normal color below warning threshold', () => {
    renderCount({ current: 100, max: 500 })
    const display = screen.getByText('100 / 500')
    expect(display).toHaveClass('text-white/40')
  })

  it('applies warning color at warning threshold', () => {
    renderCount({ current: 400, max: 500, warningAt: 400 })
    const display = screen.getByText('400 / 500')
    expect(display).toHaveClass('text-amber-400')
  })

  it('applies danger color at danger threshold', () => {
    renderCount({ current: 480, max: 500, dangerAt: 480 })
    const display = screen.getByText('480 / 500')
    expect(display).toHaveClass('text-red-400')
  })

  it('has aria-hidden on visual display', () => {
    renderCount({ current: 50, max: 500 })
    const display = screen.getByText('50 / 500')
    expect(display).toHaveAttribute('aria-hidden', 'true')
  })

  it('announces when crossing from normal to warning zone', () => {
    const { rerender } = renderCount({ current: 390, max: 500, warningAt: 400 })
    // No announcement initially (same zone)
    const srRegion = screen.getByRole('status')
    expect(srRegion).toHaveTextContent('')

    // Cross into warning zone
    rerender(<CharacterCount current={400} max={500} warningAt={400} />)
    expect(srRegion).toHaveTextContent('100 characters remaining')
  })

  it('announces when crossing from warning to danger zone', () => {
    const { rerender } = renderCount({ current: 400, max: 500, warningAt: 400, dangerAt: 480 })
    // Initial render at warning — no announcement (same zone as initial)
    const srRegion = screen.getByRole('status')

    // Cross into danger zone
    rerender(<CharacterCount current={480} max={500} warningAt={400} dangerAt={480} />)
    expect(srRegion).toHaveTextContent('20 characters remaining')
  })

  it('does not announce within the same zone', () => {
    const { rerender } = renderCount({ current: 100, max: 500 })
    const srRegion = screen.getByRole('status')
    expect(srRegion).toHaveTextContent('')

    // Still in normal zone
    rerender(<CharacterCount current={200} max={500} />)
    expect(srRegion).toHaveTextContent('')
  })

  it('returns null when current is below visibleAt', () => {
    const { container } = renderCount({ current: 0, max: 500, visibleAt: 1 })
    expect(container.firstChild).toBeNull()
  })

  it('renders at visibleAt threshold', () => {
    renderCount({ current: 1, max: 500, visibleAt: 1 })
    expect(screen.getByText('1 / 500')).toBeInTheDocument()
  })

  it('respects custom visibleAt threshold', () => {
    const { container, rerender } = renderCount({ current: 299, max: 500, visibleAt: 300 })
    expect(container.firstChild).toBeNull()

    rerender(<CharacterCount current={300} max={500} visibleAt={300} />)
    expect(screen.getByText('300 / 500')).toBeInTheDocument()
  })
})
