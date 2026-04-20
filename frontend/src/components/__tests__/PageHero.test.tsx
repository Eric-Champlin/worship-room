import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHero } from '../PageHero'
import { WHITE_PURPLE_GRADIENT } from '@/constants/gradients'

describe('PageHero', () => {
  it('renders title with padding to prevent gradient text clipping', () => {
    render(<PageHero title="Test Title" />)
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    expect(heading.className).toContain('px-1')
    expect(heading.className).toContain('sm:px-2')
  })

  it('renders title with gradient inline style', () => {
    render(<PageHero title="Test Title" />)
    const heading = screen.getByRole('heading', { name: 'Test Title' })
    expect(heading.style.backgroundImage).toBe(WHITE_PURPLE_GRADIENT)
  })

  it('renders scriptWord in font-script span', () => {
    render(<PageHero title="My Prayers" scriptWord="Prayers" />)
    const heading = screen.getByRole('heading', { name: 'My Prayers' })
    const scriptSpan = heading.querySelector('.font-script')
    expect(scriptSpan).toBeInTheDocument()
    expect(scriptSpan?.textContent).toBe('Prayers')
  })

  it('renders title without accent when scriptWord omitted', () => {
    render(<PageHero title="Music" />)
    const heading = screen.getByRole('heading', { name: 'Music' })
    const scriptSpan = heading.querySelector('.font-script')
    expect(scriptSpan).toBeNull()
  })

  it('uses text-4xl sm:text-5xl lg:text-6xl sizing (Round 2 bump)', () => {
    render(<PageHero title="Test" />)
    const heading = screen.getByRole('heading', { name: 'Test' })
    expect(heading.className).toContain('text-4xl')
    expect(heading.className).toContain('sm:text-5xl')
    expect(heading.className).toContain('lg:text-6xl')
    expect(heading.className).not.toContain('lg:text-5xl')
  })

  it('does not use font-script on h1', () => {
    render(<PageHero title="My Prayers" scriptWord="Prayers" />)
    const heading = screen.getByRole('heading', { name: 'My Prayers' })
    expect(heading.className).not.toContain('font-script')
  })

  it('subtitle renders solid white, not muted', () => {
    render(<PageHero title="Test" subtitle="A warm subtitle line" />)
    const subtitle = screen.getByText('A warm subtitle line')
    expect(subtitle.className).toContain('text-white')
    expect(subtitle.className).not.toContain('text-white/60')
  })

  it('subtitle is not italic and not font-serif', () => {
    render(<PageHero title="Test" subtitle="A warm subtitle line" />)
    const subtitle = screen.getByText('A warm subtitle line')
    expect(subtitle.className).not.toContain('italic')
    expect(subtitle.className).not.toContain('font-serif')
  })

  it('subtitle preserves responsive sizing and max-width', () => {
    render(<PageHero title="Test" subtitle="A warm subtitle line" />)
    const subtitle = screen.getByText('A warm subtitle line')
    expect(subtitle.className).toContain('max-w-xl')
    expect(subtitle.className).toContain('text-base')
    expect(subtitle.className).toContain('sm:text-lg')
  })
})
