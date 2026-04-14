import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveRegion } from '@/lib/accessibility/LiveRegion'

describe('LiveRegion', () => {
  it('renders with aria-live="polite" by default', () => {
    render(<LiveRegion>Status update</LiveRegion>)
    const el = screen.getByText('Status update')
    expect(el.getAttribute('aria-live')).toBe('polite')
  })

  it('renders with aria-atomic="true" by default', () => {
    render(<LiveRegion>Atomic content</LiveRegion>)
    const el = screen.getByText('Atomic content')
    expect(el.getAttribute('aria-atomic')).toBe('true')
  })

  it('supports politeness="assertive"', () => {
    render(<LiveRegion politeness="assertive">Urgent update</LiveRegion>)
    const el = screen.getByText('Urgent update')
    expect(el.getAttribute('aria-live')).toBe('assertive')
  })

  it('supports atomic={false}', () => {
    render(<LiveRegion atomic={false}>Partial update</LiveRegion>)
    const el = screen.getByText('Partial update')
    expect(el.getAttribute('aria-atomic')).toBe('false')
  })

  it('renders children content', () => {
    render(<LiveRegion>Announcement text</LiveRegion>)
    expect(screen.getByText('Announcement text')).toBeInTheDocument()
  })
})
