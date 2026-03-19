import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GettingStartedCard } from '../GettingStartedCard'
import { GettingStartedCelebration } from '../GettingStartedCelebration'
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

beforeEach(() => {
  localStorage.clear()
})

describe('GettingStartedCard — Accessibility', () => {
  function renderCard(items = makeItems(), completedCount = 0) {
    return render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GettingStartedCard
          items={items}
          completedCount={completedCount}
          onDismiss={vi.fn()}
          onRequestCheckIn={vi.fn()}
        />
      </MemoryRouter>,
    )
  }

  it('aria-live region announces item completion', () => {
    const itemsBefore = makeItems()
    const { rerender } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GettingStartedCard
          items={itemsBefore}
          completedCount={0}
          onDismiss={vi.fn()}
          onRequestCheckIn={vi.fn()}
        />
      </MemoryRouter>,
    )

    const itemsAfter = makeItems({ mood_done: true })
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GettingStartedCard
          items={itemsAfter}
          completedCount={1}
          onDismiss={vi.fn()}
          onRequestCheckIn={vi.fn()}
        />
      </MemoryRouter>,
    )

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion?.textContent).toContain('Check in with your mood completed')
  })

  it('all interactive elements have visible focus rings', () => {
    renderCard()
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.className).toContain('focus-visible:ring-2')
    }
  })

  it('Go links have descriptive aria-labels', () => {
    renderCard()
    expect(screen.getByLabelText('Go to check in with your mood')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to generate your first prayer')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to write a journal entry')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to try a meditation')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to listen to ambient sounds')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to explore the prayer wall')).toBeInTheDocument()
  })

  it('reduced motion: card has motion-reduce:transition-none', () => {
    renderCard()
    const section = screen.getByRole('region')
    expect(section.className).toContain('motion-reduce:transition-none')
  })

  it('progress ring has role="img" and aria-label', () => {
    renderCard(makeItems(), 3)
    const ring = screen.getByLabelText('3 of 6 getting started items completed')
    expect(ring.tagName.toLowerCase()).toBe('svg')
    expect(ring).toHaveAttribute('role', 'img')
  })
})

describe('GettingStartedCelebration — Accessibility', () => {
  it('celebration overlay traps focus', () => {
    render(<GettingStartedCelebration onDismiss={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const focusable = dialog.querySelectorAll('button')
    expect(focusable.length).toBeGreaterThanOrEqual(1)
    expect(document.activeElement?.textContent).toBe("Let's Go")
  })

  it('reduced motion hides confetti', () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    Object.defineProperty(mql, 'matches', { value: true, writable: true })
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as MediaQueryList)

    render(<GettingStartedCelebration onDismiss={vi.fn()} />)
    const particles = document.querySelectorAll('.animate-confetti-fall')
    expect(particles.length).toBe(0)

    vi.restoreAllMocks()
  })

  it('reduced motion: GettingStartedCard dismiss calls onDismiss immediately (no 300ms delay)', () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    Object.defineProperty(mql, 'matches', { value: true, writable: true })
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as MediaQueryList)

    const onDismiss = vi.fn()
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GettingStartedCard
          items={makeItems()}
          completedCount={0}
          onDismiss={onDismiss}
          onRequestCheckIn={vi.fn()}
        />
      </MemoryRouter>,
    )
    const dismissBtn = screen.getByLabelText('Dismiss getting started checklist')
    fireEvent.click(dismissBtn)
    // With reduced motion, onDismiss is called immediately (no 300ms setTimeout)
    expect(onDismiss).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()
  })
})
