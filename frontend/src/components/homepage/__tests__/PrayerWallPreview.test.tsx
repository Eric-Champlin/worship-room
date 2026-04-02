import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PrayerWallPreview } from '../previews/PrayerWallPreview'

describe('PrayerWallPreview', () => {
  it('renders 3 prayer card names', () => {
    render(<PrayerWallPreview />)
    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('David K.')).toBeInTheDocument()
    expect(screen.getByText('Rachel P.')).toBeInTheDocument()
  })

  it('renders prayer counts', () => {
    render(<PrayerWallPreview />)
    expect(screen.getByText('12 praying')).toBeInTheDocument()
    expect(screen.getByText('8 praying')).toBeInTheDocument()
    expect(screen.getByText('15 praying')).toBeInTheDocument()
  })

  it('renders "Pray for someone" pill', () => {
    render(<PrayerWallPreview />)
    expect(screen.getByText('Pray for someone')).toBeInTheDocument()
  })
})
