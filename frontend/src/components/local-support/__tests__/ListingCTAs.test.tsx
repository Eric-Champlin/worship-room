import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ListingCTAs } from '../ListingCTAs'

function renderCTAs(props: Parameters<typeof ListingCTAs>[0]) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ListingCTAs {...props} />
    </MemoryRouter>,
  )
}

describe('ListingCTAs', () => {
  it('renders 3 CTAs for churches', () => {
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    expect(screen.getByText('Pray for this church')).toBeInTheDocument()
    expect(screen.getByText('Journal about your visit')).toBeInTheDocument()
    expect(screen.getByText('Share with a friend')).toBeInTheDocument()
  })

  it('renders correct CTAs for counselors', () => {
    renderCTAs({ placeName: 'Dr. Smith', category: 'counselors', onShareClick: vi.fn() })
    expect(screen.getByText('Pray before your appointment')).toBeInTheDocument()
    expect(screen.getByText('Journal about your session')).toBeInTheDocument()
    expect(screen.getByText('Share with a friend')).toBeInTheDocument()
  })

  it('renders correct CTAs for celebrate-recovery', () => {
    renderCTAs({ placeName: 'CR Group', category: 'celebrate-recovery', onShareClick: vi.fn() })
    expect(screen.getByText('Pray for your recovery journey')).toBeInTheDocument()
    expect(screen.getByText('Journal your progress')).toBeInTheDocument()
    expect(screen.getByText('Find a meeting buddy')).toBeInTheDocument()
  })

  it('Pray CTA links to correct URL', () => {
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    const prayLink = screen.getByText('Pray for this church').closest('a')
    expect(prayLink?.getAttribute('href')).toContain('/daily?tab=pray&context=')
    expect(prayLink?.getAttribute('href')).toContain(encodeURIComponent('Praying for First Baptist'))
  })

  it('Journal CTA links to correct URL', () => {
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    const journalLink = screen.getByText('Journal about your visit').closest('a')
    expect(journalLink?.getAttribute('href')).toContain('/daily?tab=journal&prompt=')
    expect(journalLink?.getAttribute('href')).toContain(encodeURIComponent('Reflect on your experience at First Baptist...'))
  })

  it('Share CTA calls onShareClick', async () => {
    const user = userEvent.setup()
    const onShareClick = vi.fn()
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick })
    await user.click(screen.getByText('Share with a friend'))
    expect(onShareClick).toHaveBeenCalledTimes(1)
  })

  it('Find a meeting buddy links to prayer-wall', () => {
    renderCTAs({ placeName: 'CR Group', category: 'celebrate-recovery', onShareClick: vi.fn() })
    const buddyLink = screen.getByText('Find a meeting buddy').closest('a')
    expect(buddyLink?.getAttribute('href')).toBe('/prayer-wall?template=cr-buddy')
  })

  it('each CTA has an ArrowRight icon', () => {
    const { container } = renderCTAs({ placeName: 'Test', category: 'churches', onShareClick: vi.fn() })
    const arrows = container.querySelectorAll('.lucide-arrow-right')
    expect(arrows.length).toBe(3)
  })

  it('CTA divider (border-t) is present', () => {
    const { container } = renderCTAs({ placeName: 'Test', category: 'churches', onShareClick: vi.fn() })
    const divider = container.querySelector('.border-t.border-gray-200')
    expect(divider).toBeInTheDocument()
  })
})
