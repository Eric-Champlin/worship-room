import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrayerWallHero } from '../PrayerWallHero'

describe('PrayerWallHero', () => {
  it('renders heading "Prayer Wall"', () => {
    render(<PrayerWallHero />)
    expect(screen.getByRole('heading', { name: 'Prayer Wall', level: 1 })).toBeInTheDocument()
  })

  it('renders subtitle "You\'re not alone."', () => {
    render(<PrayerWallHero />)
    expect(screen.getByText("You're not alone.")).toBeInTheDocument()
  })

  it('has accessible section landmark with aria-label', () => {
    render(<PrayerWallHero />)
    const section = screen.getByRole('region', { name: 'Prayer Wall' })
    expect(section).toBeInTheDocument()
  })
})
