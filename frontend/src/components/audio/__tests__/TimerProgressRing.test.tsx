import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TimerProgressRing } from '../TimerProgressRing'

describe('TimerProgressRing', () => {
  const SIZE = 160
  const STROKE_WIDTH = 3
  const RADIUS = (SIZE - STROKE_WIDTH) / 2
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  it('renders full ring when progress=1', () => {
    const { container } = render(<TimerProgressRing progress={1} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle).toBeDefined()
    // offset = circumference * (1 - 1) = 0
    expect(progressCircle.getAttribute('stroke-dashoffset')).toBe('0')
  })

  it('renders empty ring when progress=0', () => {
    const { container } = render(<TimerProgressRing progress={0} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    const offset = Number(progressCircle.getAttribute('stroke-dashoffset'))
    // offset = circumference * (1 - 0) = circumference
    expect(offset).toBeCloseTo(CIRCUMFERENCE, 0)
  })

  it('renders half ring when progress=0.5', () => {
    const { container } = render(<TimerProgressRing progress={0.5} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    const offset = Number(progressCircle.getAttribute('stroke-dashoffset'))
    // offset = circumference * (1 - 0.5) = circumference / 2
    expect(offset).toBeCloseTo(CIRCUMFERENCE / 2, 0)
  })

  it('clamps progress between 0 and 1', () => {
    const { container: c1 } = render(<TimerProgressRing progress={1.5} />)
    const over = Number(c1.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))
    expect(over).toBe(0) // clamped to 1

    const { container: c2 } = render(<TimerProgressRing progress={-0.5} />)
    const under = Number(c2.querySelectorAll('circle')[1].getAttribute('stroke-dashoffset'))
    expect(under).toBeCloseTo(CIRCUMFERENCE, 0) // clamped to 0
  })

  it('applies custom size', () => {
    const { container } = render(<TimerProgressRing progress={0.5} size={200} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('has aria-hidden on svg', () => {
    const { container } = render(<TimerProgressRing progress={0.5} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('uses primary purple stroke on progress circle', () => {
    const { container } = render(<TimerProgressRing progress={0.5} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle.getAttribute('stroke')).toBe('#6D28D9')
  })

  it('has CSS transition for smooth animation', () => {
    const { container } = render(<TimerProgressRing progress={0.5} />)
    const progressCircle = container.querySelectorAll('circle')[1]
    expect(progressCircle.getAttribute('style')).toContain('transition')
  })
})
