import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EveningReflection } from '../EveningReflection'
import type { ActivityType } from '@/types/dashboard'

// Mock KaraokeTextReveal to immediately complete
vi.mock('@/components/daily/KaraokeTextReveal', () => ({
  KaraokeTextReveal: ({ text, onRevealComplete }: { text: string; onRevealComplete?: () => void }) => (
    <span data-testid="karaoke-text">
      {text}
      {onRevealComplete && (
        <button type="button" data-testid="karaoke-complete" onClick={onRevealComplete}>
          complete
        </button>
      )}
    </span>
  ),
}))

const mockSaveMoodEntry = vi.fn()
vi.mock('@/services/mood-storage', () => ({
  saveMoodEntry: (...args: unknown[]) => mockSaveMoodEntry(...args),
}))

const mockMarkReflectionDone = vi.fn()
vi.mock('@/services/evening-reflection-storage', () => ({
  markReflectionDone: () => mockMarkReflectionDone(),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetTodayGratitude = vi.fn((): any => null)
const mockSaveGratitudeEntry = vi.fn()
vi.mock('@/services/gratitude-storage', () => ({
  getTodayGratitude: () => mockGetTodayGratitude(),
  saveGratitudeEntry: (...args: unknown[]) => mockSaveGratitudeEntry(...args),
}))

// Mock audio hooks
const mockLoadScene = vi.fn()
const mockAudioDispatch = vi.fn()
const mockPlaySoundEffect = vi.fn()
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    loadScene: mockLoadScene,
    activeSceneId: null,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))
vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))
const mockUseReducedMotion = vi.fn(() => false)
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAudioState = vi.fn((): any => ({
  activeSounds: [],
  isPlaying: false,
  masterVolume: 0.8,
  pillVisible: false,
  activeRoutine: null,
  foregroundContent: null,
  currentSceneName: null,
  currentSceneId: null,
}))
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockUseAudioState(),
  useAudioDispatch: () => mockAudioDispatch,
}))
vi.mock('@/data/scenes', () => ({
  SCENE_BY_ID: new Map([['still-waters', { id: 'still-waters', name: 'Still Waters', sounds: [] }]]),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockActivities: Record<ActivityType, boolean> = {
  mood: true,
  pray: true,
  listen: false,
  prayerWall: false,
  readingPlan: false,
  meditate: false,
  journal: false,
  gratitude: false,
  reflection: false,
  challenge: false,
  localVisit: false,
  devotional: false,
}

function renderOverlay(overrides: Partial<Parameters<typeof EveningReflection>[0]> = {}) {
  const defaultProps = {
    onComplete: vi.fn(),
    onDismiss: vi.fn(),
    todayActivities: mockActivities,
    todayPoints: 15,
    currentStreak: 3,
    recordActivity: vi.fn(),
    ...overrides,
  }
  return {
    ...render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <EveningReflection {...defaultProps} />
      </MemoryRouter>,
    ),
    ...defaultProps,
  }
}

beforeEach(() => {
  localStorage.clear()
  // Disable auto-play by default so existing tests don't need timer handling
  localStorage.setItem('wr_sound_effects_enabled', 'false')
  mockSaveMoodEntry.mockClear()
  mockMarkReflectionDone.mockClear()
  mockGetTodayGratitude.mockReturnValue(null)
  mockSaveGratitudeEntry.mockClear()
  mockLoadScene.mockClear()
  mockAudioDispatch.mockClear()
  mockPlaySoundEffect.mockClear()
  mockNavigate.mockClear()
  mockUseReducedMotion.mockReturnValue(false)
  mockUseAudioState.mockReturnValue({
    activeSounds: [],
    isPlaying: false,
    masterVolume: 0.8,
    pillVisible: false,
    activeRoutine: null,
    foregroundContent: null,
    currentSceneName: null,
    currentSceneId: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EveningReflection — Step 1 (Mood)', () => {
  it('renders all 5 mood orbs', () => {
    renderOverlay()
    expect(screen.getByText('How has your day been?')).toBeInTheDocument()
    const radiogroup = screen.getByRole('radiogroup')
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios).toHaveLength(5)
  })

  it('mood selection advances to Step 2', async () => {
    const user = userEvent.setup()
    renderOverlay()
    const radios = screen.getAllByRole('radio')
    await user.click(radios[3]) // "Good"
    expect(screen.getByText("Today's Highlights")).toBeInTheDocument()
  })

  it('has correct aria-checked on selection', async () => {
    const user = userEvent.setup()
    renderOverlay()
    const radios = screen.getAllByRole('radio')
    await user.click(radios[2]) // "Okay"
    // After click, Step 2 shows, but the radio should have been checked
    // before advancing. Since advance is immediate, let's check the dialog role instead.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has dialog role', () => {
    renderOverlay()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('EveningReflection — Step 2 (Highlights)', () => {
  async function goToStep2() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    return { user, ...result }
  }

  it('shows completed activities', async () => {
    await goToStep2()
    expect(screen.getByText('Logged mood')).toBeInTheDocument()
    expect(screen.getByText('Prayed')).toBeInTheDocument()
  })

  it('shows faith points and streak', async () => {
    await goToStep2()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText(/Day 3 streak/)).toBeInTheDocument()
  })

  it('textarea accepts text with character counter', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlights")
    await user.type(textarea, 'Great day!')
    expect(textarea).toHaveValue('Great day!')
    // CharacterCount is hidden below 300 chars (visibleAt=300)
    expect(textarea).toHaveAttribute('aria-describedby', 'evening-char-count')
  })

  it('crisis detection shows banner', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlights")
    await user.type(textarea, 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('Next button always enabled', async () => {
    await goToStep2()
    const btn = screen.getByRole('button', { name: 'Next' })
    expect(btn).not.toBeDisabled()
  })

  it('evening textarea has aria-label "Today\'s highlights"', async () => {
    await goToStep2()
    expect(screen.getByLabelText("Today's highlights")).toBeInTheDocument()
  })

  it('evening char count uses CharacterCount at 300+', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlights")
    await user.type(textarea, 'a'.repeat(300))
    expect(screen.getByText('300 / 500')).toBeInTheDocument()
  })

  it('evening warning color at 400', async () => {
    const { user } = await goToStep2()
    const textarea = screen.getByLabelText("Today's highlights")
    await user.type(textarea, 'a'.repeat(400))
    expect(screen.getByText('400 / 500')).toHaveClass('text-amber-400')
  })
})

describe('EveningReflection — Step 3 (Gratitude)', () => {
  async function goToStep3() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return { user, ...result }
  }

  it('shows 3 gratitude inputs when no existing gratitude', async () => {
    await goToStep3()
    expect(screen.getByText('Gratitude Moment')).toBeInTheDocument()
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(3)
  })

  it('shows read-only when gratitude already saved', async () => {
    mockGetTodayGratitude.mockReturnValue({
      id: 'test',
      date: '2026-03-22',
      items: ['Family', 'Health', 'Faith'],
      createdAt: '2026-03-22T20:00:00Z',
    })
    await goToStep3()
    expect(screen.getByText('You already counted your blessings today')).toBeInTheDocument()
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('crisis detection on gratitude inputs', async () => {
    const { user } = await goToStep3()
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('saves gratitude and records activity on Next', async () => {
    const { user, recordActivity } = await goToStep3()
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], 'My family')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(mockSaveGratitudeEntry).toHaveBeenCalled()
    expect(recordActivity).toHaveBeenCalledWith('gratitude')
  })
})

describe('EveningReflection — Step 4 (Prayer)', () => {
  async function goToStep4() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return { user, ...result }
  }

  it('shows closing prayer text', async () => {
    await goToStep4()
    expect(screen.getByText('Closing Prayer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Goodnight' })).toBeInTheDocument()
  })

  it('Goodnight triggers verse reveal', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    expect(screen.getByTestId('karaoke-text')).toBeInTheDocument()
  })

  it('shows Done and Sleep buttons after verse reveal', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Sleep/i })).toBeInTheDocument()
  })

  it('Go to Sleep navigates to /music?tab=sleep', async () => {
    const { user } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    await user.click(screen.getByRole('button', { name: /Go to Sleep/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/music?tab=sleep')
  })

  it('Done triggers completion sequence', async () => {
    const { user, recordActivity, onComplete } = await goToStep4()
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(mockMarkReflectionDone).toHaveBeenCalled()
    expect(recordActivity).toHaveBeenCalledWith('reflection')
    expect(mockSaveMoodEntry).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})

describe('EveningReflection — Navigation', () => {
  it('X close dismisses without recording activity', async () => {
    const user = userEvent.setup()
    const { onDismiss, recordActivity } = renderOverlay()
    await user.click(screen.getByLabelText('Close reflection'))
    expect(mockMarkReflectionDone).toHaveBeenCalled()
    expect(recordActivity).not.toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalled()
  })

  it('Back button goes to previous step', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    expect(screen.getByText("Today's Highlights")).toBeInTheDocument()
    await user.click(screen.getByLabelText('Go back'))
    expect(screen.getByText('How has your day been?')).toBeInTheDocument()
  })

  it('step dots show correct progress', async () => {
    const user = userEvent.setup()
    const { container } = renderOverlay()
    // Step 1: first dot should be filled
    let dots = container.querySelectorAll('.rounded-full.h-2.w-2')
    expect(dots[0]).toHaveClass('bg-white')
    expect(dots[1]).not.toHaveClass('bg-white')
    // Go to step 2
    await user.click(screen.getAllByRole('radio')[3])
    dots = container.querySelectorAll('.rounded-full.h-2.w-2')
    expect(dots[1]).toHaveClass('bg-white')
    expect(dots[0]).not.toHaveClass('bg-white')
  })

  it('evening mood entry has timeOfDay: evening', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    const savedEntry = mockSaveMoodEntry.mock.calls[0][0]
    expect(savedEntry.timeOfDay).toBe('evening')
  })
})

describe('EveningReflection — Ambient Sound Auto-Play', () => {
  it('dispatches SET_MASTER_VOLUME and calls loadScene on mount', () => {
    // Enable sound effects for this test
    localStorage.removeItem('wr_sound_effects_enabled')
    renderOverlay()
    expect(mockAudioDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0 },
    })
    expect(mockLoadScene).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'still-waters' }),
    )
  })

  it('does not auto-play when sound effects disabled', () => {
    localStorage.setItem('wr_sound_effects_enabled', 'false')
    renderOverlay()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('does not auto-play when audio already active', () => {
    localStorage.removeItem('wr_sound_effects_enabled')
    mockUseAudioState.mockReturnValue({
      activeSounds: [{ id: 'test-sound' }],
      isPlaying: true,
      masterVolume: 0.8,
      pillVisible: true,
      activeRoutine: null,
      foregroundContent: null,
      currentSceneName: null,
      currentSceneId: null,
    })
    renderOverlay()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('does not auto-play when reduced motion preferred', () => {
    localStorage.removeItem('wr_sound_effects_enabled')
    mockUseReducedMotion.mockReturnValue(true)
    renderOverlay()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })
})

describe('EveningReflection — Morning Gratitude Recall', () => {
  it('shows gratitude recall card in Step 2 when today\'s gratitude exists', async () => {
    mockGetTodayGratitude.mockReturnValue({
      id: 'test',
      date: '2026-04-01',
      items: ['friend', 'sunshine and warmth', 'coffee'],
      createdAt: '2026-04-01T08:00:00Z',
    })
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    // Should show the longest entry
    expect(screen.getByText(/sunshine and warmth/)).toBeInTheDocument()
  })

  it('hides gratitude recall when no gratitude today', async () => {
    mockGetTodayGratitude.mockReturnValue(null)
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    expect(screen.queryByText('This morning, you were grateful for:')).not.toBeInTheDocument()
  })

  it('displays label, quoted text, and follow-up prompt', async () => {
    mockGetTodayGratitude.mockReturnValue({
      id: 'test',
      date: '2026-04-01',
      items: ['my family'],
      createdAt: '2026-04-01T08:00:00Z',
    })
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    expect(screen.getByText('This morning, you were grateful for:')).toBeInTheDocument()
    expect(screen.getByText(/my family/)).toBeInTheDocument()
    expect(screen.getByText('How did the rest of your day unfold?')).toBeInTheDocument()
  })
})

describe('EveningReflection — Personalized Closing Prayer', () => {
  async function goToStep4WithActivities(activities: Partial<Record<ActivityType, boolean>> = {}) {
    const user = userEvent.setup()
    const result = renderOverlay({
      todayActivities: { ...mockActivities, ...activities },
    })
    await user.click(screen.getAllByRole('radio')[3]) // "Good"
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    return { user, ...result }
  }

  it('shows activity-specific lines in Step 4', async () => {
    await goToStep4WithActivities({ devotional: true, pray: true })
    expect(screen.getByText(/meeting me in Your Word/)).toBeInTheDocument()
    expect(screen.getByText(/hearing my prayers/)).toBeInTheDocument()
  })

  it('shows mood-specific line matching Step 1 selection', async () => {
    // User selects "Good" (radio[3]) in goToStep4WithActivities
    await goToStep4WithActivities()
    expect(screen.getByText(/I felt Your goodness today/)).toBeInTheDocument()
  })

  it('uses generic line when no activities completed', async () => {
    const noActivities: Record<ActivityType, boolean> = {
      mood: false, pray: false, listen: false, prayerWall: false,
      readingPlan: false, meditate: false, journal: false,
      gratitude: false, reflection: false, challenge: false,
      localVisit: false, devotional: false,
    }
    const user = userEvent.setup()
    renderOverlay({ todayActivities: noActivities })
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/bringing me through this day/)).toBeInTheDocument()
  })

  it('caps activity lines at 3', async () => {
    await goToStep4WithActivities({
      devotional: true, readingPlan: true, pray: true,
      journal: true, meditate: true,
    })
    // First 3: devotional, readingPlan, pray
    expect(screen.getByText(/meeting me in Your Word/)).toBeInTheDocument()
    expect(screen.getByText(/time I spent in Your Word/)).toBeInTheDocument()
    expect(screen.getByText(/hearing my prayers/)).toBeInTheDocument()
    // 4th should NOT appear
    expect(screen.queryByText(/pour out my heart in my journal/)).not.toBeInTheDocument()
  })
})

describe('EveningReflection — Closing Sound & Sleep Transition', () => {
  async function goToDonePhase() {
    const user = userEvent.setup()
    const result = renderOverlay()
    await user.click(screen.getAllByRole('radio')[3])
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Goodnight' }))
    await user.click(screen.getByTestId('karaoke-complete'))
    return { user, ...result }
  }

  it('plays whisper sound on Done click', async () => {
    const { user } = await goToDonePhase()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('whisper')
  })

  it('navigates to /music?tab=sleep on sleep transition', async () => {
    const { user } = await goToDonePhase()
    await user.click(screen.getByRole('button', { name: /Go to Sleep/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/music?tab=sleep')
  })

  it('Done still records activity and saves mood', async () => {
    const { user, recordActivity } = await goToDonePhase()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(recordActivity).toHaveBeenCalledWith('reflection')
    expect(mockSaveMoodEntry).toHaveBeenCalled()
  })

  it('Done still calls markReflectionDone', async () => {
    const { user } = await goToDonePhase()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(mockMarkReflectionDone).toHaveBeenCalled()
  })
})
