import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ActivityChecklist } from '../ActivityChecklist'
import type { ActivityType } from '@/types/dashboard'
import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'

// Mock useAuth used by useReadingPlanProgress
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test' } }),
}))

// Mock evening time check so tests are time-independent
vi.mock('@/services/evening-reflection-storage', () => ({
  isEveningTime: () => false,
}))

const ALL_FALSE: Record<ActivityType, boolean> = {
  mood: false,
  pray: false,
  listen: false,
  prayerWall: false,
  readingPlan: false,
  gratitude: false,
  meditate: false,
  journal: false,
  reflection: false,
  challenge: false,
  localVisit: false,
}

const ALL_TRUE: Record<ActivityType, boolean> = {
  mood: true,
  pray: true,
  listen: true,
  prayerWall: true,
  readingPlan: true,
  gratitude: true,
  meditate: true,
  journal: true,
  reflection: true,
  challenge: true,
  localVisit: true,
}

beforeEach(() => {
  localStorage.clear()
})

function renderChecklist(
  overrides?: Partial<{ todayActivities: Record<ActivityType, boolean>; todayMultiplier: number }>,
) {
  return render(
    <ActivityChecklist
      todayActivities={overrides?.todayActivities ?? ALL_FALSE}
      todayMultiplier={overrides?.todayMultiplier ?? 1}
    />,
  )
}

function seedActivePlan() {
  localStorage.setItem(
    READING_PLAN_PROGRESS_KEY,
    JSON.stringify({
      'test-plan': {
        startedAt: '2026-01-01',
        currentDay: 3,
        completedDays: [1, 2],
        completedAt: null,
      },
    }),
  )
}

describe('ActivityChecklist', () => {
  it('shows 7 items when no active plan', () => {
    renderChecklist()
    const labels = screen.getAllByText(/^(Log your mood|Pray|Listen to worship|Pray for someone|Give thanks|Meditate|Journal)$/)
    expect(labels).toHaveLength(7)
    expect(screen.getByText('0/7')).toBeInTheDocument()
    expect(screen.queryByText('Complete a reading')).not.toBeInTheDocument()
  })

  it('shows 8 items when active plan exists', () => {
    seedActivePlan()
    renderChecklist()
    expect(screen.getByText('Complete a reading')).toBeInTheDocument()
    expect(screen.getByText('0/8')).toBeInTheDocument()
  })

  it('8th item shows +15 pts', () => {
    seedActivePlan()
    renderChecklist()
    const readingRow = screen.getByLabelText(/Complete a reading — not yet completed/)
    expect(readingRow).toHaveTextContent('+15 pts')
  })

  it('8th item checked when readingPlan activity recorded', () => {
    seedActivePlan()
    renderChecklist({ todayActivities: { ...ALL_FALSE, readingPlan: true } })
    const readingRow = screen.getByLabelText(/Complete a reading — completed/)
    expect(readingRow).toBeInTheDocument()
  })

  it('progress ring shows correct fraction with 8 items', () => {
    seedActivePlan()
    const activities = { ...ALL_FALSE, mood: true, pray: true, readingPlan: true }
    renderChecklist({ todayActivities: activities })
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('renders progress ring with correct count (7 items)', () => {
    const activities = { ...ALL_FALSE, mood: true, pray: true, listen: true }
    renderChecklist({ todayActivities: activities })
    expect(screen.getByText('3/7')).toBeInTheDocument()
  })

  it('SVG stroke-dashoffset is correct for 0, 3, 7 activities (no active plan)', () => {
    const circumference = 2 * Math.PI * 24

    // 0 activities
    const { unmount: u1 } = renderChecklist({ todayActivities: ALL_FALSE })
    const circles0 = document.querySelectorAll('circle')
    const progressCircle0 = circles0[1]
    expect(progressCircle0.getAttribute('stroke-dashoffset')).toBe(
      String(circumference),
    )
    u1()

    // 3 activities out of 7 → offset = circumference * (1 - 3/7)
    const threeActivities = { ...ALL_FALSE, mood: true, pray: true, listen: true }
    const { unmount: u2 } = renderChecklist({ todayActivities: threeActivities })
    const circles3 = document.querySelectorAll('circle')
    const progressCircle3 = circles3[1]
    expect(Number(progressCircle3.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      circumference * (4 / 7),
      1,
    )
    u2()

    // 7 activities (all base complete, no active plan so readingPlan ignored in count)
    const sevenActivities = {
      ...ALL_FALSE,
      mood: true,
      pray: true,
      listen: true,
      prayerWall: true,
      gratitude: true,
      meditate: true,
      journal: true,
    }
    renderChecklist({ todayActivities: sevenActivities })
    const circles7 = document.querySelectorAll('circle')
    const progressCircle7 = circles7[1]
    expect(Number(progressCircle7.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1)
  })

  it('lists all 7 activities in correct order (no active plan)', () => {
    renderChecklist()
    const labels = screen.getAllByText(/^(Log your mood|Pray|Listen to worship|Pray for someone|Give thanks|Meditate|Journal)$/)
    expect(labels).toHaveLength(7)
    expect(labels[0]).toHaveTextContent('Log your mood')
    expect(labels[1]).toHaveTextContent('Pray')
    expect(labels[2]).toHaveTextContent('Listen to worship')
    expect(labels[3]).toHaveTextContent('Pray for someone')
    expect(labels[4]).toHaveTextContent('Give thanks')
    expect(labels[5]).toHaveTextContent('Meditate')
    expect(labels[6]).toHaveTextContent('Journal')
  })

  it('completed activity shows check icon and success color', () => {
    renderChecklist({ todayActivities: { ...ALL_FALSE, pray: true } })
    const prayRow = screen.getByLabelText(/Pray — completed/)
    expect(prayRow).toBeInTheDocument()
    const checkIcon = prayRow.querySelector('.text-success')
    expect(checkIcon).toBeInTheDocument()
  })

  it('incomplete activity shows circle icon and muted color', () => {
    renderChecklist({ todayActivities: ALL_FALSE })
    const journalRow = screen.getByLabelText(/Journal — not yet completed/)
    expect(journalRow).toBeInTheDocument()
    const circleIcon = journalRow.querySelector('.text-white\\/20')
    expect(circleIcon).toBeInTheDocument()
  })

  it('shows correct multiplier preview for each tier', () => {
    // 0 activities
    const { unmount: u0 } = renderChecklist({ todayActivities: ALL_FALSE })
    expect(screen.getByText('Complete 2 activities for 1.25x bonus!')).toBeInTheDocument()
    u0()

    // 1 activity
    const { unmount: u1 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true },
    })
    expect(screen.getByText('Complete 1 more for 1.25x bonus!')).toBeInTheDocument()
    u1()

    // 2 activities
    const { unmount: u2 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true, pray: true },
    })
    expect(screen.getByText('Complete 2 more for 1.5x bonus!')).toBeInTheDocument()
    u2()

    // 3 activities
    const { unmount: u3 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true, pray: true, listen: true },
    })
    expect(screen.getByText('Complete 1 more for 1.5x bonus!')).toBeInTheDocument()
    u3()

    // 4 activities
    const { unmount: u4 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true, pray: true, listen: true, prayerWall: true },
    })
    expect(screen.getByText('Complete 3 more for 2x Full Worship Day!')).toBeInTheDocument()
    u4()

    // 5 activities
    const { unmount: u5 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true, pray: true, listen: true, prayerWall: true, meditate: true },
    })
    expect(screen.getByText('Complete 2 more for 2x Full Worship Day!')).toBeInTheDocument()
    u5()

    // 6 activities (no active plan → total is 7, so "1 more")
    const { unmount: u6 } = renderChecklist({
      todayActivities: { ...ALL_FALSE, mood: true, pray: true, listen: true, prayerWall: true, gratitude: true, meditate: true },
    })
    expect(screen.getByText('Complete 1 more for 2x Full Worship Day!')).toBeInTheDocument()
    u6()
  })

  it('7/7 shows celebration multiplier message (no active plan)', () => {
    const sevenActivities = {
      ...ALL_FALSE,
      mood: true,
      pray: true,
      listen: true,
      prayerWall: true,
      gratitude: true,
      meditate: true,
      journal: true,
    }
    renderChecklist({ todayActivities: sevenActivities, todayMultiplier: 2 })
    const celebration = screen.getByText('Full Worship Day! 2x points earned!')
    expect(celebration).toBeInTheDocument()
    expect(celebration).toHaveClass('text-amber-300')
    expect(celebration).toHaveClass('font-medium')
  })

  it('8/8 shows celebration multiplier message (with active plan)', () => {
    seedActivePlan()
    renderChecklist({ todayActivities: ALL_TRUE, todayMultiplier: 2 })
    expect(screen.getByText('8/8')).toBeInTheDocument()
    expect(screen.getByText('Full Worship Day! 2x points earned!')).toBeInTheDocument()
  })

  it('progress ring has aria-label', () => {
    const activities = { ...ALL_FALSE, mood: true, pray: true }
    renderChecklist({ todayActivities: activities })
    const ring = screen.getByRole('img')
    expect(ring).toHaveAttribute('aria-label', '2 of 7 daily activities completed')
  })

  it('progress ring has correct aria-label with 8 items', () => {
    seedActivePlan()
    const activities = { ...ALL_FALSE, mood: true, pray: true }
    renderChecklist({ todayActivities: activities })
    const ring = screen.getByRole('img')
    expect(ring).toHaveAttribute('aria-label', '2 of 8 daily activities completed')
  })

  it('activity rows have aria-labels describing state', () => {
    renderChecklist({
      todayActivities: { ...ALL_FALSE, pray: true, journal: true },
    })
    expect(screen.getByLabelText('Pray — completed, 10 points earned')).toBeInTheDocument()
    expect(screen.getByLabelText('Journal — completed, 25 points earned')).toBeInTheDocument()
    expect(screen.getByLabelText('Log your mood — not yet completed, 5 points available')).toBeInTheDocument()
  })

  it('mobile layout: ring above list', () => {
    renderChecklist()
    // The wrapper has flex-col at base and sm:flex-row
    const wrapper = document.querySelector('.flex.flex-col.items-center')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('sm:flex-row')
  })

  it('does not show "Challenge" even when challenge activity is true', () => {
    renderChecklist({
      todayActivities: { ...ALL_FALSE, challenge: true },
    })
    expect(screen.queryByText('Challenge')).not.toBeInTheDocument()
  })

  it('shows "Visit local support" when wr_local_visits has entries', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'p1', placeName: 'Church', placeType: 'church', visitDate: '2026-03-24', note: '' },
    ]))
    renderChecklist()
    expect(screen.getByText('Visit local support')).toBeInTheDocument()
  })

  it('hides "Visit local support" when wr_local_visits is empty', () => {
    localStorage.removeItem('wr_local_visits')
    renderChecklist()
    expect(screen.queryByText('Visit local support')).not.toBeInTheDocument()
  })

  it('hides "Visit local support" when wr_local_visits is empty array', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([]))
    renderChecklist()
    expect(screen.queryByText('Visit local support')).not.toBeInTheDocument()
  })
})
