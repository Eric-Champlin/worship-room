import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineMessage } from '../OfflineMessage'

describe('OfflineMessage', () => {
  it('renders default message with WiFiOff icon', () => {
    render(<OfflineMessage />)
    expect(
      screen.getByText("You're offline — this feature needs an internet connection")
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders custom message', () => {
    render(<OfflineMessage message="Spotify playlists available when online" />)
    expect(
      screen.getByText('Spotify playlists available when online')
    ).toBeInTheDocument()
  })

  it('dark variant uses correct colors', () => {
    const { container } = render(<OfflineMessage variant="dark" />)
    const icon = container.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-white/40')
    const text = container.querySelector('p')
    expect(text?.className).toContain('text-white/60')
  })

  it('light variant uses correct colors', () => {
    const { container } = render(<OfflineMessage variant="light" />)
    const icon = container.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-text-light')
    const text = container.querySelector('p')
    expect(text?.className).toContain('text-text-light')
  })

  it('has role="status"', () => {
    render(<OfflineMessage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
