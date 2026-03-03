import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListingCard } from '../ListingCard'
import type { LocalSupportPlace } from '@/types/local-support'

const mockPlace: LocalSupportPlace = {
  id: 'church-1',
  name: 'First Baptist Church',
  address: '115 W 7th St, Columbia, TN 38401',
  phone: '(931) 555-0101',
  website: 'https://example.com',
  lat: 35.6151,
  lng: -87.0353,
  rating: 4.5,
  photoUrl: null,
  description: 'A welcoming congregation.',
  hoursOfOperation: ['Sun: 9:00 AM - 12:00 PM'],
  category: 'churches',
  denomination: 'Baptist',
  specialties: null,
}

const defaultProps = {
  place: mockPlace,
  distance: 2.3,
  isBookmarked: false,
  isHighlighted: false,
  onToggleBookmark: vi.fn(),
  onShare: vi.fn(),
  onExpand: vi.fn(),
  isExpanded: false,
}

describe('ListingCard', () => {
  it('renders place name and address', () => {
    render(<ListingCard {...defaultProps} />)
    expect(screen.getByText('First Baptist Church')).toBeInTheDocument()
    expect(screen.getByText('115 W 7th St, Columbia, TN 38401')).toBeInTheDocument()
  })

  it('renders clickable phone link', () => {
    render(<ListingCard {...defaultProps} />)
    const phoneLink = screen.getByRole('link', { name: '(931) 555-0101' })
    expect(phoneLink).toHaveAttribute('href', 'tel:(931) 555-0101')
  })

  it('no phone link when phone is null', () => {
    const noPhonePlace = { ...mockPlace, phone: null }
    render(<ListingCard {...defaultProps} place={noPhonePlace} />)
    expect(screen.queryByRole('link', { name: /555/ })).not.toBeInTheDocument()
  })

  it('renders distance badge', () => {
    render(<ListingCard {...defaultProps} />)
    expect(screen.getByText('2.3 mi')).toBeInTheDocument()
  })

  it('hides distance when null', () => {
    render(<ListingCard {...defaultProps} distance={null} />)
    expect(screen.queryByText(/mi$/)).not.toBeInTheDocument()
  })

  it('star rating renders correctly', () => {
    render(<ListingCard {...defaultProps} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
    const ratingContainer = screen.getByLabelText('4.5 out of 5 stars')
    expect(ratingContainer).toBeInTheDocument()
  })

  it('expands to show details on chevron click', async () => {
    const user = userEvent.setup()
    const onExpand = vi.fn()
    render(<ListingCard {...defaultProps} onExpand={onExpand} />)
    const expandBtn = screen.getByRole('button', { name: /expand details/i })
    await user.click(expandBtn)
    expect(onExpand).toHaveBeenCalledWith('church-1')
  })

  it('shows expanded details when isExpanded', () => {
    render(<ListingCard {...defaultProps} isExpanded={true} />)
    expect(screen.getByText('Visit Website')).toBeInTheDocument()
    expect(screen.getByText('Sun: 9:00 AM - 12:00 PM')).toBeInTheDocument()
    expect(screen.getByText('Baptist')).toBeInTheDocument()
    expect(screen.getByText('Get Directions')).toBeInTheDocument()
  })

  it('shows denomination for churches only', () => {
    render(<ListingCard {...defaultProps} isExpanded={true} />)
    expect(screen.getByText('Denomination:')).toBeInTheDocument()
  })

  it('shows specialties for counselors only', () => {
    const counselorPlace: LocalSupportPlace = {
      ...mockPlace,
      id: 'counselor-1',
      category: 'counselors',
      denomination: null,
      specialties: ['Grief', 'Anxiety'],
    }
    render(<ListingCard {...defaultProps} place={counselorPlace} isExpanded={true} />)
    expect(screen.getByText('Specialties:')).toBeInTheDocument()
    expect(screen.getByText('Grief, Anxiety')).toBeInTheDocument()
    expect(screen.queryByText('Denomination:')).not.toBeInTheDocument()
  })

  it('bookmark toggle calls handler', async () => {
    const user = userEvent.setup()
    const onToggleBookmark = vi.fn()
    render(<ListingCard {...defaultProps} onToggleBookmark={onToggleBookmark} />)
    const bookmarkBtn = screen.getByRole('button', { name: /bookmark/i })
    await user.click(bookmarkBtn)
    expect(onToggleBookmark).toHaveBeenCalledWith('church-1')
  })

  it('bookmark button has aria-pressed', () => {
    render(<ListingCard {...defaultProps} isBookmarked={true} />)
    const bookmarkBtn = screen.getByRole('button', { name: /bookmark/i })
    expect(bookmarkBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlighted card has ring', () => {
    const { container } = render(<ListingCard {...defaultProps} isHighlighted={true} />)
    const article = container.querySelector('article')
    expect(article?.className).toContain('ring-2')
    expect(article?.className).toContain('ring-primary')
  })
})
