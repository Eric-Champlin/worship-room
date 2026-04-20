import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleSleepSection } from '../BibleSleepSection'

// --- Mock Scene Player ---
const mockLoadScene = vi.fn()
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderSection() {
  return render(
    <MemoryRouter>
      <BibleSleepSection />
    </MemoryRouter>,
  )
}

describe('BibleSleepSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Read the Bible" card', () => {
    renderSection()
    expect(screen.getByText('Read the Bible')).toBeInTheDocument()
    expect(screen.getByText('Fall asleep to any chapter read aloud')).toBeInTheDocument()
  })

  it('"Read the Bible" card navigates to /bible', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByText('Read the Bible'))
    expect(mockNavigate).toHaveBeenCalledWith('/bible')
  })

  it('renders 3 quick-start options', () => {
    renderSection()
    expect(screen.getByText('Peaceful Study')).toBeInTheDocument()
    expect(screen.getByText('Evening Scripture')).toBeInTheDocument()
    expect(screen.getByText('Sacred Space')).toBeInTheDocument()
  })

  it('renders target book labels', () => {
    renderSection()
    expect(screen.getByText('Psalms 1')).toBeInTheDocument()
    expect(screen.getByText('Proverbs 1')).toBeInTheDocument()
    expect(screen.getByText('John 1')).toBeInTheDocument()
  })

  it('quick-start click calls loadScene', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(
      screen.getByLabelText('Start Peaceful Study and read Psalms 1'),
    )

    expect(mockLoadScene).toHaveBeenCalledTimes(1)
    expect(mockLoadScene.mock.calls[0][0]).toHaveProperty('id', 'peaceful-study')
  })

  it('renders Scripture Reading heading as SectionHeader (uppercase text-white/50)', () => {
    renderSection()
    const heading = screen.getByRole('heading', { level: 2, name: /scripture reading/i })
    expect(heading.className).toContain('uppercase')
    expect(heading.className).toContain('text-white/50')
  })

  it('quick-start play icons use text-primary-lt (WCAG AA)', () => {
    renderSection()
    const btn = screen.getByLabelText('Start Peaceful Study and read Psalms 1')
    const icon = btn.querySelector('svg')
    expect(icon?.getAttribute('class')).toContain('text-primary-lt')
    expect(icon?.getAttribute('class')).not.toMatch(/\btext-primary\b(?!-)/)
  })

  it('Read the Bible BookOpen icon remains text-primary-lt', () => {
    renderSection()
    const link = screen.getByText('Read the Bible').closest('a') as HTMLElement
    const bookIcon = link.querySelector('svg')
    expect(bookIcon?.getAttribute('class')).toContain('text-primary-lt')
  })

  it('quick-start cards stack on mobile (grid-cols-1)', () => {
    renderSection()
    const grid = screen.getByText('Peaceful Study').closest('.grid')
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('sm:grid-cols-3')
  })
})
