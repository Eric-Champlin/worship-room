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
    expect(tagline.className).toContain('text-white')
    expect(tagline.className).not.toContain('text-white/')
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

  it('renders 2-line heading with topLine + bottomLine', () => {
    render(<SectionHeading topLine="Your Journey to" bottomLine="Healing" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    expect(h2).toHaveTextContent('Your Journey toHealing')
    const spans = h2.querySelectorAll('span')
    expect(spans).toHaveLength(2)
    expect(spans[0]).toHaveTextContent('Your Journey to')
    expect(spans[1]).toHaveTextContent('Healing')
  })

  it('top line renders in white without gradient', () => {
    render(<SectionHeading topLine="Your Journey to" bottomLine="Healing" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    const topSpan = h2.querySelectorAll('span')[0]
    expect(topSpan.className).toContain('text-white')
    expect(topSpan.style.backgroundImage).toBe('')
  })

  it('bottom line renders with gradient', () => {
    render(<SectionHeading topLine="Your Journey to" bottomLine="Healing" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    const bottomSpan = h2.querySelectorAll('span')[1]
    expect(bottomSpan.style.backgroundImage).toBe(WHITE_PURPLE_GRADIENT)
  })

  it('backward compat: heading prop still works', () => {
    render(<SectionHeading heading="Single Line" />)
    const h2 = screen.getByRole('heading', { level: 2, name: 'Single Line' })
    expect(h2.style.backgroundImage).toBe(WHITE_PURPLE_GRADIENT)
    expect(h2.querySelectorAll('span')).toHaveLength(0)
  })

  it('tagline uses text-white (not text-white/60)', () => {
    render(<SectionHeading heading="Title" tagline="Some tagline" />)
    const tagline = screen.getByText('Some tagline')
    expect(tagline.className).toContain('text-white')
    expect(tagline.className).not.toContain('text-white/')
  })

  it('top line has correct responsive sizing', () => {
    render(<SectionHeading topLine="Top" bottomLine="Bottom" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    const topSpan = h2.querySelectorAll('span')[0]
    expect(topSpan.className).toContain('text-2xl')
    expect(topSpan.className).toContain('sm:text-3xl')
    expect(topSpan.className).toContain('lg:text-4xl')
  })

  it('bottom line has correct responsive sizing', () => {
    render(<SectionHeading topLine="Top" bottomLine="Bottom" />)
    const h2 = screen.getByRole('heading', { level: 2 })
    const bottomSpan = h2.querySelectorAll('span')[1]
    expect(bottomSpan.className).toContain('text-4xl')
    expect(bottomSpan.className).toContain('sm:text-5xl')
    expect(bottomSpan.className).toContain('lg:text-6xl')
  })
})
