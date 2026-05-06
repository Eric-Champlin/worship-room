import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommunityConnections } from '../CommunityConnections'
import { InsightsDataProvider } from '@/contexts/InsightsDataContext'

beforeEach(() => {
  localStorage.clear()
})

describe('CommunityConnections', () => {
  it('returns null when no visits exist', () => {
    const { container } = render(
      <InsightsDataProvider>
        <CommunityConnections hasData={false} />
      </InsightsDataProvider>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows visit count and breakdown', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'p1', placeName: 'First Baptist', placeType: 'church', visitDate: '2026-03-24', note: '' },
      { id: '2', placeId: 'p2', placeName: 'Dr. Smith', placeType: 'counselor', visitDate: '2026-03-23', note: '' },
      { id: '3', placeId: 'p1', placeName: 'First Baptist', placeType: 'church', visitDate: '2026-03-22', note: '' },
    ]))
    render(
      <InsightsDataProvider>
        <CommunityConnections hasData={false} />
      </InsightsDataProvider>,
    )
    expect(screen.getByText('2')).toBeInTheDocument() // 2 unique places
    expect(screen.getByText(/1 church, 1 counselor/)).toBeInTheDocument()
  })

  it('shows mood correlation when data exists', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'p1', placeName: 'First Baptist', placeType: 'church', visitDate: '2026-03-24', note: '' },
    ]))
    localStorage.setItem('wr_mood_entries', JSON.stringify([
      { id: 'm1', date: '2026-03-24', mood: 4, moodLabel: 'Good', timestamp: Date.now(), verseSeen: 'Ps 107:1' },
    ]))
    render(
      <InsightsDataProvider>
        <CommunityConnections hasData={true} />
      </InsightsDataProvider>,
    )
    expect(screen.getByText('4.0')).toBeInTheDocument()
    expect(screen.getByText(/your mood averaged/)).toBeInTheDocument()
  })

  it('hides mood correlation when no overlap', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'p1', placeName: 'First Baptist', placeType: 'church', visitDate: '2026-03-24', note: '' },
    ]))
    localStorage.setItem('wr_mood_entries', JSON.stringify([
      { id: 'm1', date: '2026-03-20', mood: 4, moodLabel: 'Good', timestamp: Date.now(), verseSeen: 'Ps 107:1' },
    ]))
    render(
      <InsightsDataProvider>
        <CommunityConnections hasData={true} />
      </InsightsDataProvider>,
    )
    expect(screen.queryByText(/your mood averaged/)).not.toBeInTheDocument()
  })

  it('handles corrupted visit data gracefully', () => {
    localStorage.setItem('wr_local_visits', 'invalid json')
    const { container } = render(
      <InsightsDataProvider>
        <CommunityConnections hasData={false} />
      </InsightsDataProvider>,
    )
    expect(container.innerHTML).toBe('')
  })
})
