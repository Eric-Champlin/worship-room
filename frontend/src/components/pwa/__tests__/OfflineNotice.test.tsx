import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { OfflineNotice } from '../OfflineNotice'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('OfflineNotice', () => {
  it('renders "You\'re offline" heading', () => {
    renderWithRouter(<OfflineNotice featureName="Prayer Wall" />)
    expect(screen.getByText("You're offline")).toBeInTheDocument()
  })

  it('includes feature name in description', () => {
    renderWithRouter(<OfflineNotice featureName="Prayer Wall" />)
    expect(
      screen.getByText(/Prayer Wall needs an internet connection/),
    ).toBeInTheDocument()
  })

  it('renders default fallback CTA linking to /bible', () => {
    renderWithRouter(<OfflineNotice featureName="Prayer Wall" />)
    const link = screen.getByRole('link', { name: /Read the Bible/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/bible')
  })

  it('uses custom fallback route and label when provided', () => {
    renderWithRouter(
      <OfflineNotice
        featureName="Music"
        fallbackRoute="/daily"
        fallbackLabel="Go to Daily Hub"
      />,
    )
    const link = screen.getByRole('link', { name: /Go to Daily Hub/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/daily')
  })

  it('renders the WifiOff icon as an svg element', () => {
    const { container } = renderWithRouter(
      <OfflineNotice featureName="Prayer Wall" />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
