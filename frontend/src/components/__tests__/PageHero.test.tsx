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

  it('uses lg:text-5xl sizing', () => {
    render(<PageHero title="Test" />)
    const heading = screen.getByRole('heading', { name: 'Test' })
    expect(heading.className).toContain('lg:text-5xl')
  })

  it('does not use font-script on h1', () => {
    render(<PageHero title="My Prayers" scriptWord="Prayers" />)
    const heading = screen.getByRole('heading', { name: 'My Prayers' })
    expect(heading.className).not.toContain('font-script')
  })
})
