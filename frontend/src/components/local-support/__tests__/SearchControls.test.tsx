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
})
