import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchControls } from '../SearchControls'

const mockGeocode = vi.fn().mockResolvedValue({ lat: 35.6151, lng: -87.0353 })

describe('SearchControls', () => {
  it('renders location input and search button', () => {
    render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
    expect(screen.getByPlaceholderText('City or zip code')).toBeInTheDocument()
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
  })

  it('renders radius slider with default value 25', () => {
    render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
    const slider = screen.getByRole('slider', { name: 'Search radius' })
    expect(slider).toHaveValue('25')
    expect(screen.getByText('Search radius: 25 miles')).toBeInTheDocument()
  })

  it('radius slider updates displayed value', async () => {
    render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
    const slider = screen.getByRole('slider', { name: 'Search radius' })

    fireEvent.change(slider, { target: { value: '50' } })

    expect(screen.getByText('Search radius: 50 miles')).toBeInTheDocument()
  })

  it('search button calls onSearch after geocoding', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<SearchControls onSearch={onSearch} onGeocode={mockGeocode} isLoading={false} />)

    const input = screen.getByPlaceholderText('City or zip code')
    await user.type(input, 'Nashville')
    await user.click(screen.getByRole('button', { name: /search/i }))

    // Mock geocode returns Columbia TN coords
    await vi.waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith(35.6151, -87.0353, 25)
    }, { timeout: 1000 })
  })

  it('renders mile marker labels', () => {
    render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  describe('onInteractionBlocked', () => {
    it('calls onInteractionBlocked when Use My Location is clicked', async () => {
      const user = userEvent.setup()
      const blocked = vi.fn()
      render(
        <SearchControls
          onSearch={vi.fn()}
          onGeocode={mockGeocode}
          isLoading={false}
          onInteractionBlocked={blocked}
        />,
      )

      await user.click(screen.getByLabelText('Use my current location'))
      expect(blocked).toHaveBeenCalledTimes(1)
    })

    it('calls onInteractionBlocked when search form is submitted', async () => {
      const user = userEvent.setup()
      const blocked = vi.fn()
      const onSearch = vi.fn()
      render(
        <SearchControls
          onSearch={onSearch}
          onGeocode={mockGeocode}
          isLoading={false}
          onInteractionBlocked={blocked}
        />,
      )

      const input = screen.getByPlaceholderText('City or zip code')
      await user.type(input, 'Nashville')
      await user.click(screen.getByRole('button', { name: /search/i }))

      expect(blocked).toHaveBeenCalled()
      expect(onSearch).not.toHaveBeenCalled()
    })

    it('calls onInteractionBlocked on input click', async () => {
      const user = userEvent.setup()
      const blocked = vi.fn()
      render(
        <SearchControls
          onSearch={vi.fn()}
          onGeocode={mockGeocode}
          isLoading={false}
          onInteractionBlocked={blocked}
        />,
      )

      await user.click(screen.getByPlaceholderText('City or zip code'))
      expect(blocked).toHaveBeenCalledTimes(1)
    })

    it('calls onInteractionBlocked when radius slider is clicked', () => {
      const blocked = vi.fn()
      render(
        <SearchControls
          onSearch={vi.fn()}
          onGeocode={mockGeocode}
          isLoading={false}
          onInteractionBlocked={blocked}
        />,
      )

      const slider = screen.getByRole('slider', { name: 'Search radius' })
      fireEvent.click(slider)

      expect(blocked).toHaveBeenCalled()
    })
  })

  describe('white-pill CTA styling', () => {
    // Spec 5 Step 8 — Use My Location + Search migrated to subtle Button
    it('Use My Location renders subtle Button (bg-white/[0.07] + min-h-[44px] + text-white)', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const button = screen.getByLabelText('Use my current location')
      expect(button.className).toContain('bg-white/[0.07]')
      expect(button.className).toContain('border-white/[0.12]')
      expect(button.className).toContain('text-white')
      expect(button.className).toContain('rounded-full')
      expect(button.className).toContain('min-h-[44px]')
      expect(button.className).not.toContain('text-primary')
    })

    it('Use My Location MapPin icon uses text-sky-300 per Tonal Icon Pattern', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const button = screen.getByLabelText('Use my current location')
      const mapPinIcon = button.querySelector('svg')
      expect(mapPinIcon?.getAttribute('class')).toContain('text-sky-300')
    })

    it('Search submit renders subtle Button (bg-white/[0.07] + text-white)', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const button = screen.getByRole('button', { name: /search/i })
      expect(button.className).toContain('bg-white/[0.07]')
      expect(button.className).toContain('text-white')
      expect(button.className).toContain('rounded-full')
      expect(button.className).toContain('min-h-[44px]')
    })

    it('Search icon stays neutral (no tonal color override)', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const button = screen.getByRole('button', { name: /search/i })
      const searchIcon = button.querySelector('svg')
      // Neutral = inherits Button text color (white). No tonal class on the icon itself.
      const iconClass = searchIcon?.getAttribute('class') ?? ''
      expect(iconClass).not.toContain('text-sky-300')
      expect(iconClass).not.toContain('text-pink-300')
      expect(iconClass).not.toContain('text-violet-300')
    })

    it('Both buttons preserve disabled:opacity-50 (subtle Button base)', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const useLoc = screen.getByLabelText('Use my current location')
      const search = screen.getByRole('button', { name: /search/i })
      expect(useLoc.className).toContain('disabled:opacity-50')
      expect(search.className).toContain('disabled:opacity-50')
    })

    // Form input chrome preserved per Decision 8
    it('Form input chrome preserved (utility input idiom — Decision 8)', () => {
      render(<SearchControls onSearch={vi.fn()} onGeocode={mockGeocode} isLoading={false} />)
      const input = screen.getByPlaceholderText('City or zip code')
      expect(input.className).toContain('bg-white/[0.06]')
      expect(input.className).toContain('border-white/10')
      expect(input.className).toContain('focus:border-primary')
      expect(input.className).toContain('focus:ring-primary/20')
    })
  })
})
