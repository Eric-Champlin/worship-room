import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { BreathingExercise } from '../BreathingExercise'
import { ScriptureSoaking } from '../ScriptureSoaking'
import { GratitudeReflection } from '../GratitudeReflection'
import { ActsPrayerWalk } from '../ActsPrayerWalk'
import { PsalmReading } from '../PsalmReading'
import { ExamenReflection } from '../ExamenReflection'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoggedIn: false })),
}))

const { useAuth } = await import('@/hooks/useAuth')
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isLoggedIn: false })
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

function renderWithRouter(path: string, Component: React.ComponentType) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={path} element={<Component />} />
        <Route path="/daily" element={<div data-testid="daily-hub">Daily Hub</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const subPages = [
  { name: 'BreathingExercise', path: '/meditate/breathing', Component: BreathingExercise },
  { name: 'ScriptureSoaking', path: '/meditate/soaking', Component: ScriptureSoaking },
  { name: 'GratitudeReflection', path: '/meditate/gratitude', Component: GratitudeReflection },
  { name: 'ActsPrayerWalk', path: '/meditate/acts', Component: ActsPrayerWalk },
  { name: 'PsalmReading', path: '/meditate/psalms', Component: PsalmReading },
  { name: 'ExamenReflection', path: '/meditate/examen', Component: ExamenReflection },
]

describe('Meditation sub-page auth redirect', () => {
  it.each(subPages)(
    '$name redirects to /daily?tab=meditate when logged out',
    ({ path, Component }) => {
      renderWithRouter(path, Component)
      expect(screen.getByTestId('daily-hub')).toBeInTheDocument()
    },
  )

  it.each(subPages)(
    '$name renders content when logged in',
    ({ path, Component }) => {
      mockUseAuth.mockReturnValue({ user: null, isLoggedIn: true })
      renderWithRouter(path, Component)
      expect(screen.queryByTestId('daily-hub')).not.toBeInTheDocument()
      // Verify component actually rendered content (not an empty tree)
      expect(document.body.textContent?.trim().length).toBeGreaterThan(0)
    },
  )
})
