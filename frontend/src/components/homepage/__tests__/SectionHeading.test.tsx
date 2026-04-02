import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeading } from '../SectionHeading'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'

describe('SectionHeading', () => {
  it('renders heading with gradient style', () => {
    render(<SectionHeading heading="Test Heading" />)
    const h2 = screen.getByRole('heading', { level: 2, name: 'Test Heading' })
    expect(h2.style.backgroundImage).toBe(WHITE_PURPLE_GRADIENT)
  })

  it('renders tagline when provided', () => {
    render(<SectionHeading heading="Title" tagline="A tagline" />)
    const tagline = screen.getByText('A tagline')
    expect(tagline.tagName).toBe('P')
    expect(tagline.className).toContain('text-white/60')
  })

  it('omits tagline when not provided', () => {
    const { container } = render(<SectionHeading heading="Title" />)
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  it('align="center" adds centering classes', () => {
    render(<SectionHeading heading="Title" tagline="Tag" align="center" />)
    const wrapper = screen.getByRole('heading', { level: 2 }).parentElement as HTMLElement
    expect(wrapper.className).toContain('text-center')
    const tagline = screen.getByText('Tag')
    expect(tagline.className).toContain('mx-auto')
  })

  it('align="left" does not add centering classes', () => {
    render(<SectionHeading heading="Title" tagline="Tag" align="left" />)
    const wrapper = screen.getByRole('heading', { level: 2 }).parentElement as HTMLElement
    expect(wrapper.className).not.toContain('text-center')
    const tagline = screen.getByText('Tag')
    expect(tagline.className).not.toContain('mx-auto')
  })

  it('renders h2 with id when provided', () => {
    const { container } = render(<SectionHeading heading="Title" id="test-heading" />)
    const h2 = container.querySelector('#test-heading')
    expect(h2).toBeInTheDocument()
    expect(h2?.tagName).toBe('H2')
  })

  it('renders h2 without id when omitted', () => {
    render(<SectionHeading heading="Title" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2.id).toBe('')
  })
})
