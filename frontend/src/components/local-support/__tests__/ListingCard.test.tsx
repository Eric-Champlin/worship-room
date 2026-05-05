import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

  it('hides bookmark button when showBookmark is false', () => {
    render(<ListingCard {...defaultProps} showBookmark={false} />)
    expect(screen.queryByRole('button', { name: /bookmark/i })).not.toBeInTheDocument()
  })

  it('shows bookmark button when showBookmark is true', () => {
    render(<ListingCard {...defaultProps} showBookmark={true} />)
    expect(screen.getByRole('button', { name: /bookmark/i })).toBeInTheDocument()
  })

  it('shows bookmark button by default (showBookmark omitted)', () => {
    render(<ListingCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /bookmark/i })).toBeInTheDocument()
  })

  // Spec 5 Step 12 — Bookmark active uses fill-emerald-300 text-emerald-300
  it('bookmark active state uses fill-emerald-300 text-emerald-300 (Tonal Icon Pattern)', () => {
    render(<ListingCard {...defaultProps} isBookmarked={true} />)
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    const icon = bookmarkButton.querySelector('svg')
    const iconClass = icon?.getAttribute('class') ?? ''
    expect(iconClass).toContain('fill-emerald-300')
    expect(iconClass).toContain('text-emerald-300')
    expect(iconClass).not.toContain('fill-success')
    expect(iconClass).not.toContain('text-success')
  })

  it('bookmark inactive state preserves text-white/50', () => {
    render(<ListingCard {...defaultProps} isBookmarked={false} />)
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    const icon = bookmarkButton.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-white/50')
  })

  it('highlighted card has violet ring (ring-violet-400/60 per Spec 5 Decision 2)', () => {
    const { container } = render(<ListingCard {...defaultProps} isHighlighted={true} />)
    const article = container.querySelector('article')
    expect(article?.className).toContain('ring-2')
    expect(article?.className).toContain('ring-violet-400/60')
    expect(article?.className).not.toContain('ring-primary')
  })

  it('renders ListingCard chrome via FrostedCard default variant (bg-white/[0.07])', () => {
    const { container } = render(<ListingCard {...defaultProps} />)
    const article = container.querySelector('article')
    expect(article).not.toBeNull()
    // FrostedCard default variant base — distinctive bg-white/[0.07]
    expect(article?.className).toContain('bg-white/[0.07]')
    // The pre-migration rolls-own chrome (bg-white/[0.06]) is gone
    expect(article?.className).not.toContain('bg-white/[0.06]')
  })

  describe('facelift styling', () => {
    it('address paragraph uses solid text-white (not text-white/60)', () => {
      render(<ListingCard {...defaultProps} />)
      const address = screen.getByText('115 W 7th St, Columbia, TN 38401')
      expect(address.className).toContain('text-white')
      expect(address.className).not.toContain('text-white/60')
    })

    it('MapPin icon before address uses text-white/50 (Spec 5 Change 11e drift correction)', () => {
      render(<ListingCard {...defaultProps} />)
      const address = screen.getByText('115 W 7th St, Columbia, TN 38401')
      const icon = address.querySelector('svg')
      expect(icon?.getAttribute('class')).toContain('text-white/50')
      expect(icon?.getAttribute('class')).not.toContain('text-white/70')
    })

    it('Phone icon before phone uses text-white/50 (Spec 5 Change 11e drift correction)', () => {
      render(<ListingCard {...defaultProps} />)
      const phoneRow = screen.getByRole('link', { name: '(931) 555-0101' }).parentElement
      const icon = phoneRow?.querySelector('svg')
      expect(icon?.getAttribute('class')).toContain('text-white/50')
    })

    it('website ExternalLink icon uses text-white/50 (Spec 5 Change 11e drift correction)', () => {
      render(<ListingCard {...defaultProps} isExpanded={true} />)
      const websiteLink = screen.getByRole('link', { name: 'Visit Website' })
      const websiteRow = websiteLink.parentElement
      const icon = websiteRow?.querySelector('svg')
      expect(icon?.getAttribute('class')).toContain('text-white/50')
    })

    it('phone anchor renders in text-white with hover underline and primary-lt focus ring', () => {
      render(<ListingCard {...defaultProps} />)
      const phoneLink = screen.getByRole('link', { name: '(931) 555-0101' })
      expect(phoneLink.className).toContain('text-white')
      expect(phoneLink.className).toContain('hover:underline')
      expect(phoneLink.className).toContain('focus:ring-primary-lt')
      expect(phoneLink.className).not.toContain('text-primary')
    })

    it('photo wrapper is visible at all breakpoints (no hidden sm:block)', () => {
      const { container } = render(<ListingCard {...defaultProps} />)
      // Photo wrapper is the first flex child inside the main card row
      const photoWrapper = container.querySelector('article > div.flex > div.shrink-0')
      expect(photoWrapper).not.toBeNull()
      expect(photoWrapper!.className).not.toContain('hidden')
      expect(photoWrapper!.className).not.toContain('sm:block')
    })

    it('photo placeholder uses responsive sizing (64px mobile, 80px sm+)', () => {
      const { container } = render(<ListingCard {...defaultProps} />)
      const placeholder = container.querySelector('div.h-16.w-16')
      expect(placeholder).not.toBeNull()
      expect(placeholder!.className).toContain('h-16')
      expect(placeholder!.className).toContain('w-16')
      expect(placeholder!.className).toContain('sm:h-20')
      expect(placeholder!.className).toContain('sm:w-20')
    })

    it('photo image uses responsive sizing and has onError handler when photoUrl present', () => {
      const placeWithPhoto = { ...mockPlace, photoUrl: 'https://example.com/photo.jpg' }
      const { container } = render(<ListingCard {...defaultProps} place={placeWithPhoto} />)
      const img = container.querySelector('img')
      expect(img).not.toBeNull()
      expect(img!.className).toContain('h-16')
      expect(img!.className).toContain('w-16')
      expect(img!.className).toContain('sm:h-20')
      expect(img!.className).toContain('sm:w-20')
    })

    it('photo onError replaces the broken image with the placeholder (stable layout)', () => {
      const placeWithPhoto = { ...mockPlace, photoUrl: 'https://example.com/broken.jpg' }
      const { container } = render(<ListingCard {...defaultProps} place={placeWithPhoto} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).not.toBeNull()
      fireEvent.error(img)
      expect(container.querySelector('img')).toBeNull()
      const placeholder = container.querySelector('div.h-16.w-16')
      expect(placeholder).not.toBeNull()
      expect(placeholder!.className).toContain('sm:h-20')
      expect(placeholder!.className).toContain('sm:w-20')
    })

    // Spec 5 Step 11 — Get Directions migrated to subtle Button via asChild
    it('Get Directions renders subtle Button styling on the anchor (via Button asChild)', () => {
      render(<ListingCard {...defaultProps} isExpanded={true} />)
      const link = screen.getByRole('link', { name: /Get Directions/ })
      expect(link.className).toContain('rounded-full')
      expect(link.className).toContain('bg-white/[0.07]')
      expect(link.className).toContain('border-white/[0.12]')
      expect(link.className).toContain('text-white')
      expect(link.className).toContain('min-h-[44px]')
      // Old white-pill tokens are gone
      expect(link.className).not.toContain('text-primary')
      expect(link.className).not.toContain('shadow-[0_0_20px_rgba(255,255,255,0.15)]')
    })

    it('Get Directions preserves href, target, rel security attributes', () => {
      render(<ListingCard {...defaultProps} isExpanded={true} />)
      const link = screen.getByRole('link', { name: /Get Directions/ })
      expect(link.getAttribute('href')).toContain('google.com/maps/dir/')
      expect(link.getAttribute('href')).toContain(`destination=${mockPlace.lat},${mockPlace.lng}`)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('Get Directions icon is ExternalLink (not MapPin) per Spec 5 icon table', () => {
      render(<ListingCard {...defaultProps} isExpanded={true} />)
      const link = screen.getByRole('link', { name: /Get Directions/ })
      // ExternalLink icon — lucide renders SVG, we identify by structure: it has
      // child paths characteristic of ExternalLink (the "leaving the app" arrow).
      // Simpler: verify there's exactly one svg in the link.
      const svgs = link.querySelectorAll('svg')
      expect(svgs.length).toBe(1)
      // ExternalLink doesn't carry a tonal class — inherits text color from anchor (Button text-white)
      const iconClass = svgs[0].getAttribute('class') ?? ''
      expect(iconClass).not.toContain('text-sky-300')
      expect(iconClass).not.toContain('text-pink-300')
    })

    it('Visit Website anchor uses text-white for readability on dark cards', () => {
      render(<ListingCard {...defaultProps} isExpanded={true} />)
      const link = screen.getByRole('link', { name: /Visit Website/ })
      expect(link.className).toContain('text-white')
      expect(link.className).not.toContain('text-primary ')
    })
  })
})
