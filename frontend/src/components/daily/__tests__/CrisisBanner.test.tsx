import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrisisBanner } from '../CrisisBanner'

describe('CrisisBanner', () => {
  it('does not render for normal text', () => {
    const { container } = render(<CrisisBanner text="I feel sad today" />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('renders crisis resources for self-harm keyword "suicide"', () => {
    render(<CrisisBanner text="I am thinking about suicide" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByText(/988/).length).toBeGreaterThan(0)
  })

  it('renders for "kill myself"', () => {
    render(<CrisisBanner text="I want to kill myself" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders for "end my life"', () => {
    render(<CrisisBanner text="I want to end my life" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not render for empty text', () => {
    const { container } = render(<CrisisBanner text="" />)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not render for vague emotional phrases', () => {
    const { container } = render(
      <CrisisBanner text="nobody cares about me and I feel hopeless" />,
    )
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('uses aria-live="assertive" for accessibility', () => {
    render(<CrisisBanner text="suicide" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })
})
