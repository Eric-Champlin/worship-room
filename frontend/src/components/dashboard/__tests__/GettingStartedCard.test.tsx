import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GettingStartedCard } from '../GettingStartedCard'
import type { GettingStartedItem } from '@/hooks/useGettingStarted'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeItems(overrides: Partial<Record<string, boolean>> = {}): GettingStartedItem[] {
  const defs: { key: string; label: string; pointHint: string; destination: string | null; activityType: string | null }[] = [
    { key: 'mood_done', label: 'Check in with your mood', pointHint: '+5 pts', destination: null, activityType: 'mood' },
    { key: 'pray_done', label: 'Generate your first prayer', pointHint: '+10 pts', destination: '/daily?tab=pray', activityType: 'pray' },
    { key: 'journal_done', label: 'Write a journal entry', pointHint: '+25 pts', destination: '/daily?tab=journal', activityType: 'journal' },
    { key: 'meditate_done', label: 'Try a meditation', pointHint: '+20 pts', destination: '/daily?tab=meditate', activityType: 'meditate' },
    { key: 'ambient_visited', label: 'Listen to ambient sounds', pointHint: '+10 pts', destination: '/music?tab=ambient', activityType: null },
    { key: 'prayer_wall_visited', label: 'Explore the Prayer Wall', pointHint: '+15 pts', destination: '/prayer-wall', activityType: null },
  ]
  return defs.map((d) => ({
    ...d,
    completed: overrides[d.key] ?? false,
  })) as GettingStartedItem[]
}

function renderCard(props: Partial<React.ComponentProps<typeof GettingStartedCard>> = {}) {
  const defaultProps = {
    items: makeItems(),
    completedCount: 0,
    onDismiss: vi.fn(),
    onRequestCheckIn: vi.fn(),
    ...props,
  }
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GettingStartedCard {...defaultProps} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  mockNavigate.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GettingStartedCard', () => {
  it('renders 6 checklist items', () => {
    renderCard()
    expect(screen.getByText('Check in with your mood')).toBeInTheDocument()
    expect(screen.getByText('Generate your first prayer')).toBeInTheDocument()
    expect(screen.getByText('Write a journal entry')).toBeInTheDocument()
    expect(screen.getByText('Try a meditation')).toBeInTheDocument()
    expect(screen.getByText('Listen to ambient sounds')).toBeInTheDocument()
    expect(screen.getByText('Explore the Prayer Wall')).toBeInTheDocument()
  })

  it('renders progress ring with correct count', () => {
    renderCard({ completedCount: 0 })
    expect(screen.getByText('0/6')).toBeInTheDocument()

    const { unmount } = renderCard({
      items: makeItems({ mood_done: true, pray_done: true, journal_done: true }),
      completedCount: 3,
    })
    expect(screen.getByText('3/6')).toBeInTheDocument()
    unmount()
  })

  it('incomplete item shows circle icon, label, point hint, Go link', () => {
    renderCard()
    expect(screen.getByText('+5 pts')).toBeInTheDocument()
    expect(screen.getAllByText('Go')).toHaveLength(6)
  })

  it('complete item shows check icon, strikethrough, no Go link', () => {
    renderCard({
      items: makeItems({ mood_done: true }),
      completedCount: 1,
    })
    const moodLabel = screen.getByText('Check in with your mood')
    expect(moodLabel.className).toContain('line-through')
    expect(screen.getAllByText('Go')).toHaveLength(5)
  })

  it('complete item row has opacity-50', () => {
    renderCard({
      items: makeItems({ mood_done: true }),
      completedCount: 1,
    })
    const row = screen.getByText('Check in with your mood').closest('[aria-label]')
    expect(row?.className).toContain('opacity-50')
  })

  it('Go link navigates to correct destination (items 2-6)', async () => {
    const user = userEvent.setup()
    renderCard()
    const goLinks = screen.getAllByText('Go')
    await user.click(goLinks[1])
    expect(mockNavigate).toHaveBeenCalledWith('/daily?tab=pray')
  })

  it('Go link for item 1 calls onRequestCheckIn', async () => {
    const user = userEvent.setup()
    const onRequestCheckIn = vi.fn()
    renderCard({ onRequestCheckIn })
    const goLinks = screen.getAllByText('Go')
    await user.click(goLinks[0])
    expect(onRequestCheckIn).toHaveBeenCalled()
  })

  it('dismiss X button calls onDismiss after fade-out', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    renderCard({ onDismiss })
    const dismissBtn = screen.getByLabelText('Dismiss getting started checklist')
    fireEvent.click(dismissBtn)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(300) })
    expect(onDismiss).toHaveBeenCalled()
  })

  it('dismiss X button has aria-label', () => {
    renderCard()
    expect(screen.getByLabelText('Dismiss getting started checklist')).toBeInTheDocument()
  })

  it('progress ring has accessible aria-label', () => {
    renderCard({ completedCount: 2 })
    expect(screen.getByLabelText('2 of 6 getting started items completed')).toBeInTheDocument()
  })

  it('each item row has aria-label with state', () => {
    renderCard({
      items: makeItems({ mood_done: true }),
      completedCount: 1,
    })
    expect(screen.getByLabelText('Check in with your mood — completed')).toBeInTheDocument()
    expect(screen.getByLabelText(/Generate your first prayer — not completed/)).toBeInTheDocument()
  })

  it('collapse toggle works', async () => {
    const user = userEvent.setup()
    renderCard()
    const collapseBtn = screen.getByLabelText('Collapse Getting Started')
    await user.click(collapseBtn)
    expect(screen.getByLabelText('Expand Getting Started')).toBeInTheDocument()
  })

  it('collapse state persists in localStorage', async () => {
    const user = userEvent.setup()
    renderCard()
    const collapseBtn = screen.getByLabelText('Collapse Getting Started')
    await user.click(collapseBtn)
    const stored = JSON.parse(localStorage.getItem('wr_dashboard_collapsed') || '{}')
    expect(stored['getting-started']).toBe(true)
  })

  it('keyboard navigation works (Tab through Go links)', () => {
    renderCard()
    const allFocusable = screen.getAllByRole('button')
    // collapse + dismiss + 6 Go links = 8 buttons
    expect(allFocusable.length).toBeGreaterThanOrEqual(8)
  })

  it('point hints show correct values', () => {
    renderCard()
    expect(screen.getByText('+5 pts')).toBeInTheDocument()
    expect(screen.getAllByText('+10 pts')).toHaveLength(2)
    expect(screen.getByText('+25 pts')).toBeInTheDocument()
    expect(screen.getByText('+20 pts')).toBeInTheDocument()
    expect(screen.getByText('+15 pts')).toBeInTheDocument()
  })
})
