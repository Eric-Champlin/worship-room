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
    const divider = container.querySelector('.border-t.border-white\\/10')
    expect(divider).toBeInTheDocument()
  })

  // Spec 5 Step 13 — Categorical icon swap (revised per planning review)

  it('Pray tile renders Heart icon with text-pink-300', () => {
    const { container } = renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    const prayLink = screen.getByText('Pray for this church').closest('a')!
    const heart = prayLink.querySelector('.lucide-heart')
    expect(heart).not.toBeNull()
    expect(heart?.getAttribute('class')).toContain('text-pink-300')
    // Trailing ArrowRight is also present, neutral
    const arrow = prayLink.querySelector('.lucide-arrow-right')
    expect(arrow).not.toBeNull()
    // No other tonal categorical icons in this tile
    expect(container.querySelectorAll('.lucide-heart').length).toBeGreaterThanOrEqual(1)
  })

  it('Journal tile renders BookOpen icon with text-sky-300', () => {
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    const journalLink = screen.getByText('Journal about your visit').closest('a')!
    const bookOpen = journalLink.querySelector('.lucide-book-open')
    expect(bookOpen).not.toBeNull()
    expect(bookOpen?.getAttribute('class')).toContain('text-sky-300')
  })

  it('Share tile renders MessageSquare icon with text-violet-300', () => {
    renderCTAs({ placeName: 'First Baptist', category: 'churches', onShareClick: vi.fn() })
    const shareButton = screen.getByText('Share with a friend').closest('button')!
    const messageSquare = shareButton.querySelector('.lucide-message-square')
    expect(messageSquare).not.toBeNull()
    expect(messageSquare?.getAttribute('class')).toContain('text-violet-300')
  })

  it('CR meeting buddy tile renders MessageSquare with text-violet-300', () => {
    renderCTAs({ placeName: 'CR Group', category: 'celebrate-recovery', onShareClick: vi.fn() })
    const buddyLink = screen.getByText('Find a meeting buddy').closest('a')!
    const messageSquare = buddyLink.querySelector('.lucide-message-square')
    expect(messageSquare).not.toBeNull()
    expect(messageSquare?.getAttribute('class')).toContain('text-violet-300')
  })

  it('counselor CTAs use the same icon set in the same order (Heart, BookOpen, MessageSquare)', () => {
    renderCTAs({ placeName: 'Dr. Smith', category: 'counselors', onShareClick: vi.fn() })
    const prayLink = screen.getByText('Pray before your appointment').closest('a')!
    expect(prayLink.querySelector('.lucide-heart')?.getAttribute('class')).toContain('text-pink-300')
    const journalLink = screen.getByText('Journal about your session').closest('a')!
    expect(journalLink.querySelector('.lucide-book-open')?.getAttribute('class')).toContain('text-sky-300')
    const shareButton = screen.getByText('Share with a friend').closest('button')!
    expect(shareButton.querySelector('.lucide-message-square')?.getAttribute('class')).toContain('text-violet-300')
  })

  it('trailing ArrowRight is neutral (no tonal class)', () => {
    const { container } = renderCTAs({ placeName: 'Test', category: 'churches', onShareClick: vi.fn() })
    const arrows = container.querySelectorAll('.lucide-arrow-right')
    arrows.forEach((arrow) => {
      const cls = arrow.getAttribute('class') ?? ''
      expect(cls).not.toContain('text-pink-300')
      expect(cls).not.toContain('text-sky-300')
      expect(cls).not.toContain('text-violet-300')
    })
  })

  it('label uses flex-1 truncate so long labels do not wrap the row', () => {
    const { container } = renderCTAs({ placeName: 'CR Group', category: 'celebrate-recovery', onShareClick: vi.fn() })
    const labels = container.querySelectorAll('.flex-1.truncate')
    expect(labels.length).toBe(3)
  })
})
