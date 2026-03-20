import { render, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { StreakCard } from '@/components/dashboard/StreakCard'

// Mock matchMedia — default: no reduced motion
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
})

function renderHero(props: { totalPoints: number; currentLevel?: number }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardHero
        userName="Eric"
        currentStreak={3}
        levelName="Sprout"
        totalPoints={props.totalPoints}
        pointsToNextLevel={400}
        currentLevel={props.currentLevel ?? 2}
      />
    </MemoryRouter>,
  )
}

function renderStreakCard(props: { totalPoints: number; currentLevel?: number }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <StreakCard
          currentStreak={3}
          longestStreak={7}
          totalPoints={props.totalPoints}
          currentLevel={props.currentLevel ?? 2}
          levelName="Sprout"
          pointsToNextLevel={400}
          todayMultiplier={1}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function getProgressBarFill(container: HTMLElement): HTMLElement | null {
  const progressbar = container.querySelector('[role="progressbar"]')
  if (!progressbar) return null
  return progressbar.querySelector('div') as HTMLElement | null
}

beforeEach(() => {
  vi.useFakeTimers()
  matchMediaMock.mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Progress Bar Glow — DashboardHero', () => {
  it('no glow on initial render', () => {
    const { container } = renderHero({ totalPoints: 100 })
    const fill = getProgressBarFill(container)
    expect(fill).not.toBeNull()
    expect(fill!.style.boxShadow).toBe('none')
  })

  it('violet glow on point increase', () => {
    const { container, rerender } = renderHero({ totalPoints: 100 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardHero
          userName="Eric"
          currentStreak={3}
          levelName="Sprout"
          totalPoints={150}
          pointsToNextLevel={350}
          currentLevel={2}
        />
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).toContain('rgba(139, 92, 246')
  })

  it('glow clears after 600ms', () => {
    const { container, rerender } = renderHero({ totalPoints: 100 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardHero
          userName="Eric"
          currentStreak={3}
          levelName="Sprout"
          totalPoints={150}
          pointsToNextLevel={350}
          currentLevel={2}
        />
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).not.toBe('none')

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(fill!.style.boxShadow).toBe('none')
  })

  it('no glow with reduced motion', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { container, rerender } = renderHero({ totalPoints: 100 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardHero
          userName="Eric"
          currentStreak={3}
          levelName="Sprout"
          totalPoints={150}
          pointsToNextLevel={350}
          currentLevel={2}
        />
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).toBe('none')
  })

  it('transition style includes box-shadow', () => {
    const { container } = renderHero({ totalPoints: 100 })
    const fill = getProgressBarFill(container)
    expect(fill!.style.transition).toContain('box-shadow 300ms ease-out')
  })

  it('transition style includes width 600ms', () => {
    const { container } = renderHero({ totalPoints: 100 })
    const fill = getProgressBarFill(container)
    expect(fill!.style.transition).toContain('width 600ms ease-out')
  })
})

describe('Progress Bar Glow — StreakCard', () => {
  it('no glow on initial render', () => {
    const { container } = renderStreakCard({ totalPoints: 200 })
    const fill = getProgressBarFill(container)
    expect(fill).not.toBeNull()
    expect(fill!.style.boxShadow).toBe('none')
  })

  it('violet glow on point increase', () => {
    const { container, rerender } = renderStreakCard({ totalPoints: 200 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <StreakCard
            currentStreak={3}
            longestStreak={7}
            totalPoints={250}
            currentLevel={2}
            levelName="Sprout"
            pointsToNextLevel={250}
            todayMultiplier={1}
          />
        </ToastProvider>
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).toContain('rgba(139, 92, 246')
  })

  it('amber glow on point decrease', () => {
    const { container, rerender } = renderStreakCard({ totalPoints: 200 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <StreakCard
            currentStreak={3}
            longestStreak={7}
            totalPoints={150}
            currentLevel={2}
            levelName="Sprout"
            pointsToNextLevel={350}
            todayMultiplier={1}
          />
        </ToastProvider>
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).toContain('rgba(217, 119, 6')
  })

  it('glow clears after 600ms', () => {
    const { container, rerender } = renderStreakCard({ totalPoints: 200 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <StreakCard
            currentStreak={3}
            longestStreak={7}
            totalPoints={250}
            currentLevel={2}
            levelName="Sprout"
            pointsToNextLevel={250}
            todayMultiplier={1}
          />
        </ToastProvider>
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).not.toBe('none')

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(fill!.style.boxShadow).toBe('none')
  })

  it('no glow with reduced motion', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { container, rerender } = renderStreakCard({ totalPoints: 200 })

    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <StreakCard
            currentStreak={3}
            longestStreak={7}
            totalPoints={250}
            currentLevel={2}
            levelName="Sprout"
            pointsToNextLevel={250}
            todayMultiplier={1}
          />
        </ToastProvider>
      </MemoryRouter>,
    )

    const fill = getProgressBarFill(container)
    expect(fill!.style.boxShadow).toBe('none')
  })
})
