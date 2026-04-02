import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PrayerPreview } from '../previews/PrayerPreview'

describe('PrayerPreview', () => {
  it('renders input text and prayer text', () => {
    render(<PrayerPreview />)
    expect(
      screen.getByText("I'm feeling anxious about the future...")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Lord, I bring my anxiety before You today/)
    ).toBeInTheDocument()
  })

  it('has border-pulse-glow class on outer container', () => {
    const { container } = render(<PrayerPreview />)
    expect(
      (container.firstElementChild as HTMLElement).className
    ).toContain('border-pulse-glow')
  })

  it('renders visible and faded prayer text spans', () => {
    render(<PrayerPreview />)
    const visibleSpan = screen.getByText(
      /Lord, I bring my anxiety before You today/
    )
    expect(visibleSpan.className).toContain('text-white/90')

    const fadedSpan = screen.getByText(/in Your loving hands/)
    expect(fadedSpan.className).toContain('text-white/20')
  })

  it('renders 3 waveform bar divs', () => {
    const { container } = render(<PrayerPreview />)
    const waveformBars = container.querySelectorAll('.bg-purple-500\\/60, .bg-purple-500\\/80, .bg-purple-500\\/50')
    expect(waveformBars).toHaveLength(3)
  })
})
