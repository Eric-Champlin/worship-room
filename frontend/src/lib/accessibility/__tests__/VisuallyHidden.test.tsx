import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisuallyHidden } from '@/lib/accessibility/VisuallyHidden'

describe('VisuallyHidden', () => {
  it('renders children with sr-only class as a span by default', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>)
    const el = screen.getByText('Hidden text')
    expect(el.tagName).toBe('SPAN')
    expect(el.className).toBe('sr-only')
  })

  it('supports as="div" to render a div', () => {
    render(<VisuallyHidden as="div">Div content</VisuallyHidden>)
    const el = screen.getByText('Div content')
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('sr-only')
  })

  it('renders text content accessible to screen readers', () => {
    render(<VisuallyHidden>Screen reader only</VisuallyHidden>)
    expect(screen.getByText('Screen reader only')).toBeInTheDocument()
  })
})
