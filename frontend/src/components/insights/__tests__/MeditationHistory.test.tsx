import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MeditationHistory } from '../MeditationHistory'
import type { MeditationSession } from '@/types/meditation'

// Mock recharts ResponsiveContainer (needs explicit width/height in test env)
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 250 }}>{children}</div>
    ),
  }
})

function makeSession(
  overrides: Partial<MeditationSession> = {},
): MeditationSession {
  return {
    id: 'test-id',
    type: 'breathing',
    date: '2026-03-18',
    durationMinutes: 5,
    completedAt: '2026-03-18T12:00:00.000Z',
    ...overrides,
  }
}

function seedStorage(sessions: MeditationSession[]) {
  localStorage.setItem('wr_meditation_history', JSON.stringify(sessions))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 20, 12, 0, 0)) // March 20, 2026
})

describe('MeditationHistory', () => {
  it('renders section title "Meditation History"', () => {
    render(<MeditationHistory rangeDays={30} />)
    expect(
      screen.getByRole('heading', { name: /meditation history/i }),
    ).toBeInTheDocument()
  })

  it('renders 3 summary cards', () => {
    render(<MeditationHistory rangeDays={30} />)
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('This Month')).toBeInTheDocument()
    expect(screen.getByText('All Time')).toBeInTheDocument()
  })

  it('summary cards show correct values', () => {
    seedStorage([
      makeSession({ id: '1', date: '2026-03-18', durationMinutes: 10, type: 'breathing' }),
      makeSession({ id: '2', date: '2026-03-19', durationMinutes: 5, type: 'soaking' }),
      makeSession({ id: '3', date: '2026-03-01', durationMinutes: 8, type: 'gratitude' }),
    ])
    render(<MeditationHistory rangeDays={30} />)
    // This week (Mon Mar 16 - Sun Mar 22): entries on 18 and 19 = 15 min
    expect(screen.getByText('15 min')).toBeInTheDocument()
    // This month: all 3 = 23 min
    expect(screen.getByText('23 min')).toBeInTheDocument()
    // All time: 23 min, 3 sessions
    expect(screen.getByText('23 min (3 sessions)')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<MeditationHistory rangeDays={30} />)
    expect(
      screen.getByText(/meditation trends will appear after your first few sessions/i),
    ).toBeInTheDocument()
  })

  it('renders bar chart when data exists', () => {
    seedStorage([
      makeSession({ id: '1', date: '2026-03-18', durationMinutes: 10 }),
    ])
    const { container } = render(<MeditationHistory rangeDays={30} />)
    // Check that the chart container exists
    expect(
      container.querySelector('[aria-label="Meditation minutes by day"]'),
    ).toBeInTheDocument()
  })

  it('legend shows only types with data', () => {
    seedStorage([
      makeSession({ id: '1', type: 'breathing', date: '2026-03-18' }),
      makeSession({ id: '2', type: 'soaking', date: '2026-03-19' }),
    ])
    const { container } = render(<MeditationHistory rangeDays={30} />)
    // Legend items have colored squares (h-2.5 w-2.5)
    const legendItems = container.querySelectorAll('.h-2\\.5.w-2\\.5')
    expect(legendItems).toHaveLength(2)
    // Gratitude and ACTS should not appear in legend
    expect(screen.queryByText('Gratitude')).not.toBeInTheDocument()
    expect(screen.queryByText('ACTS')).not.toBeInTheDocument()
  })

  it('most practiced callout shows correct type', () => {
    seedStorage([
      makeSession({ id: '1', type: 'breathing', date: '2026-03-18' }),
      makeSession({ id: '2', type: 'breathing', date: '2026-03-19' }),
      makeSession({ id: '3', type: 'soaking', date: '2026-03-20' }),
    ])
    render(<MeditationHistory rangeDays={30} />)
    const callout = screen.getByText(/is your most practiced meditation/i)
    expect(callout).toBeInTheDocument()
    expect(callout.textContent).toContain('Breathing')
    expect(callout.textContent).toContain('67% of sessions')
  })

  it('most practiced callout hidden when no data', () => {
    render(<MeditationHistory rangeDays={30} />)
    expect(
      screen.queryByText(/is your most practiced meditation/i),
    ).not.toBeInTheDocument()
  })

  it('section has aria-label', () => {
    const { container } = render(<MeditationHistory rangeDays={30} />)
    expect(
      container.querySelector('[aria-label="Meditation history"]'),
    ).toBeInTheDocument()
  })

  it('shows "1 session" singular for single session', () => {
    seedStorage([
      makeSession({ id: '1', date: '2026-03-18', durationMinutes: 5 }),
    ])
    render(<MeditationHistory rangeDays={30} />)
    expect(screen.getByText('5 min (1 session)')).toBeInTheDocument()
  })
})
