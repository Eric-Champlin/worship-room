import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BackgroundCanvas } from '../BackgroundCanvas'

describe('BackgroundCanvas', () => {
  it('renders children', () => {
    render(<BackgroundCanvas>Hello world</BackgroundCanvas>)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('applies custom className alongside base classes', () => {
    const { container } = render(
      <BackgroundCanvas className="flex flex-col font-sans">child</BackgroundCanvas>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('relative')
    expect(root.className).toContain('min-h-screen')
    expect(root.className).toContain('overflow-hidden')
    expect(root.className).toContain('flex')
    expect(root.className).toContain('flex-col')
    expect(root.className).toContain('font-sans')
  })

  it('has min-h-screen + relative + overflow-hidden in the merged className', () => {
    const { container } = render(<BackgroundCanvas>x</BackgroundCanvas>)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('relative')
    expect(root.className).toContain('min-h-screen')
    expect(root.className).toContain('overflow-hidden')
  })

  it('exposes data-testid="background-canvas" on the root', () => {
    const { container } = render(<BackgroundCanvas>x</BackgroundCanvas>)
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('background-canvas')
  })
})
