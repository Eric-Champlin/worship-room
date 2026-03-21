import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { addPrayer, markAnswered } from '@/services/prayer-list-storage'
import { PrayerListWidget } from '../PrayerListWidget'

function renderWidget() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrayerListWidget />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('PrayerListWidget', () => {
  it('shows empty state when no prayers', () => {
    renderWidget()

    expect(screen.getByText('Start your prayer list')).toBeInTheDocument()
    expect(screen.getByText('Add Prayer')).toBeInTheDocument()
  })

  it('"Add Prayer" link goes to /my-prayers', () => {
    renderWidget()

    const link = screen.getByText('Add Prayer')
    expect(link.closest('a')).toHaveAttribute('href', '/my-prayers')
  })

  it('shows active count with prayers', () => {
    addPrayer({ title: 'Prayer 1', description: '', category: 'health' })
    addPrayer({ title: 'Prayer 2', description: '', category: 'family' })
    renderWidget()

    expect(screen.getByText('2 active prayers')).toBeInTheDocument()
  })

  it('shows most recent prayer title', () => {
    // Seed directly with known timestamps so sort order is deterministic
    const prayers = [
      {
        id: 'old-1', title: 'Older Prayer', description: '', category: 'health' as const,
        status: 'active' as const, createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z', answeredAt: null, answeredNote: null, lastPrayedAt: null,
      },
      {
        id: 'new-1', title: 'Newest Prayer', description: '', category: 'family' as const,
        status: 'active' as const, createdAt: '2026-03-20T10:00:00.000Z',
        updatedAt: '2026-03-20T10:00:00.000Z', answeredAt: null, answeredNote: null, lastPrayedAt: null,
      },
    ]
    localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))
    renderWidget()

    expect(screen.getByText('Newest Prayer')).toBeInTheDocument()
  })

  it('shows answered this month count', () => {
    const p1 = addPrayer({ title: 'P1', description: '', category: 'health' })
    const p2 = addPrayer({ title: 'P2', description: '', category: 'family' })
    if (p1) markAnswered(p1.id)
    if (p2) markAnswered(p2.id)
    renderWidget()

    expect(screen.getByText(/2 prayers answered this month/)).toBeInTheDocument()
  })

  it('"View all" link goes to /my-prayers', () => {
    addPrayer({ title: 'Prayer', description: '', category: 'health' })
    renderWidget()

    const link = screen.getByText(/View all/)
    expect(link.closest('a')).toHaveAttribute('href', '/my-prayers')
  })

  it('uses singular "prayer" for 1 active', () => {
    addPrayer({ title: 'Solo', description: '', category: 'health' })
    renderWidget()

    expect(screen.getByText('1 active prayer')).toBeInTheDocument()
  })
})
