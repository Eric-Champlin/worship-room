import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayTabContent } from '../PrayTabContent'
import type { PrayContext, DevotionalSnapshot } from '@/types/daily-experience'

// --- Granular mocks for audio system ---
const mockLoadScene = vi.fn()
const mockAudioDispatch = vi.fn()
const mockRecordActivity = vi.fn()

let mockAudioState = {
  activeSounds: [] as { id: string }[],
  isPlaying: false,
  currentSceneName: null as string | null,
  currentSceneId: null as string | null,
  pillVisible: false,
  drawerOpen: false,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null as { id: string } | null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.5,
  foregroundEndedCounter: 0,
}

let mockReducedMotion = false

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockAudioDispatch,
}))

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

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: mockRecordActivity,
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

// Mock GuidedPrayerPlayer to avoid TTS/speechSynthesis/wakeLock/timer complexity.
// We only need to verify its structural placement relative to the content wrapper.
vi.mock('@/components/daily/GuidedPrayerPlayer', () => ({
  GuidedPrayerPlayer: ({ session }: { session: { title: string } }) => (
    <div role="dialog" aria-label={`Guided prayer: ${session.title}`} data-testid="mock-guided-player">
      Mock Guided Prayer Player
    </div>
  ),
}))

// --- Helpers ---
interface MockAudioState {
  activeSounds: { id: string }[]
  isPlaying: boolean
  currentSceneName: string | null
  currentSceneId: string | null
  pillVisible: boolean
  drawerOpen: boolean
  foregroundContent: null
  sleepTimer: null
  activeRoutine: { id: string } | null
  masterVolume: number
  foregroundBackgroundBalance: number
  foregroundEndedCounter: number
}

const DEFAULT_AUDIO_STATE: MockAudioState = {
  activeSounds: [],
  isPlaying: false,
  currentSceneName: null,
  currentSceneId: null,
  pillVisible: false,
  drawerOpen: false,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.5,
  foregroundEndedCounter: 0,
}

function resetAudioState(overrides: Partial<MockAudioState> = {}) {
  mockAudioState = { ...DEFAULT_AUDIO_STATE, ...overrides }
}

const mockOnSwitchToJournal = vi.fn()

function renderPrayTab(props: { onSwitchToJournal?: (topic: string) => void; prayContext?: PrayContext | null } = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <PrayTabContent onSwitchToJournal={props.onSwitchToJournal} prayContext={props.prayContext} />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function generatePrayer(user: ReturnType<typeof userEvent.setup>, inputText = 'I am feeling anxious') {
  const textarea = screen.getByLabelText('Prayer request')
  await user.type(textarea, inputText)
  const generateBtn = screen.getByRole('button', { name: /help me pray/i })
  await user.click(generateBtn)
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockRecordActivity.mockClear()
  mockLoadScene.mockClear()
  mockAudioDispatch.mockClear()
  mockOnSwitchToJournal.mockClear()
  mockReducedMotion = false
  resetAudioState()
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

// --- Existing tests ---
describe('PrayTabContent activity integration', () => {
  it('recordActivity("pray") called after prayer generation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    // Advance past the 1500ms prayer generation timeout
    act(() => { vi.advanceTimersByTime(1600) })

    expect(mockRecordActivity).toHaveBeenCalledWith('pray')
  })

  it('recordActivity not called on generate failure (empty text)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    const generateBtn = screen.getByRole('button', { name: /help me pray/i })
    await user.click(generateBtn)

    expect(mockRecordActivity).not.toHaveBeenCalled()
    expect(screen.getByText(/Tell God what/)).toBeInTheDocument()
  })
})

// --- Step 2: Ambient sound auto-play ---
describe('ambient sound auto-play', () => {
  it('auto-plays Upper Room scene on prayer generation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    expect(mockAudioDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.4 },
    })
    expect(mockLoadScene).toHaveBeenCalledTimes(1)
    expect(mockLoadScene).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'the-upper-room' }),
    )
  })

  it('skips auto-play when audio already playing', async () => {
    resetAudioState({ activeSounds: [{ id: 'some-sound' }] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('skips auto-play when prefers-reduced-motion', async () => {
    mockReducedMotion = true
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('skips auto-play when routine active', async () => {
    resetAudioState({ activeRoutine: { id: 'some-routine' } })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('skips auto-play when pill already visible', async () => {
    resetAudioState({ pillVisible: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('sound indicator shows after prayer displays', async () => {
    // Start with no audio so auto-play triggers, but make loadScene
    // immediately populate activeSounds so the indicator renders
    mockLoadScene.mockImplementation(() => {
      mockAudioState = { ...mockAudioState, activeSounds: [{ id: 'cathedral-reverb' }] }
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    // Advance past prayer generation
    act(() => { vi.advanceTimersByTime(1600) })

    expect(mockLoadScene).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Sound: The Upper Room')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('sound indicator hidden when audio was already playing', async () => {
    resetAudioState({ activeSounds: [{ id: 'existing-sound' }] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    // Sound indicator should not appear because auto-play was skipped
    expect(screen.queryByText('Sound: The Upper Room')).not.toBeInTheDocument()
  })

  it('sound indicator "Stop" dispatches STOP_ALL', async () => {
    // Make loadScene populate activeSounds so the indicator renders
    mockLoadScene.mockImplementation(() => {
      mockAudioState = { ...mockAudioState, activeSounds: [{ id: 'cathedral-reverb' }] }
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    const stopBtn = screen.getByRole('button', { name: /stop/i })
    expect(stopBtn).toBeInTheDocument()
    await user.click(stopBtn)
    expect(mockAudioDispatch).toHaveBeenCalledWith({ type: 'STOP_ALL' })
  })
})

// --- Step 3: Karaoke prayer reveal ---
describe('karaoke prayer reveal', () => {
  it('prayer reveals word by word using KaraokeTextReveal', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    // Prayer should be displayed
    expect(screen.getByText('Your prayer:')).toBeInTheDocument()
  })

  it('skip link visible during reveal', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
  })

  it('clicking skip shows full prayer immediately', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    const skipBtn = screen.getByRole('button', { name: /skip/i })
    await user.click(skipBtn)

    // Skip link should disappear after reveal completes
    act(() => { vi.advanceTimersByTime(10) })
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
  })

  it('skip link disappears after reveal completes naturally', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    act(() => { vi.advanceTimersByTime(1600) })

    // Skip should be visible initially
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()

    // Advance enough for all words to reveal (mock prayer ~106 words * 80ms + 200ms buffer)
    act(() => { vi.advanceTimersByTime(9000) })

    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
  })

  it('reveal resets when generating new prayer via reset', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip to complete the reveal
    const skipBtn = screen.getByRole('button', { name: /skip/i })
    await user.click(skipBtn)
    act(() => { vi.advanceTimersByTime(10) })

    // Click "Pray about something else" to reset
    const resetBtn = screen.getByRole('button', { name: /pray about something else/i })
    await user.click(resetBtn)

    // Should see the input section again
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
  })
})

// --- Step 4: Post-prayer reflection prompt ---
describe('post-prayer reflection prompt', () => {
  it('reflection prompt appears after reveal completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip the reveal
    const skipBtn = screen.getByRole('button', { name: /skip/i })
    await user.click(skipBtn)
    act(() => { vi.advanceTimersByTime(10) })

    // Wait for the 500ms delay before reflection appears
    act(() => { vi.advanceTimersByTime(600) })

    expect(screen.getByText('How did that prayer land?')).toBeInTheDocument()
  })

  it('reflection prompt does not appear during reveal', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Don't skip — still in reveal
    expect(screen.queryByText('How did that prayer land?')).not.toBeInTheDocument()
  })

  it('"It resonated" shows encouraging message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip reveal + wait for reflection
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Click "It resonated"
    const resonatedBtn = screen.getByRole('button', { name: /it resonated/i })
    await user.click(resonatedBtn)

    expect(screen.getByText(/carry this prayer with you/i)).toBeInTheDocument()

    // After full fade sequence (4000ms), reflection should be dismissed
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.queryByText('How did that prayer land?')).not.toBeInTheDocument()
  })

  it('"Something different" resets to input view', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip reveal + wait for reflection
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Click "Something different"
    const diffBtn = screen.getByRole('button', { name: /something different/i })
    await user.click(diffBtn)
    act(() => { vi.advanceTimersByTime(200) })

    // Should be back to input
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
    // Retry prompt should be visible
    expect(screen.getByText(/try describing/i)).toBeInTheDocument()
  })

  it('"Journal about this" switches to journal tab', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab({ onSwitchToJournal: mockOnSwitchToJournal })

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip reveal + wait for reflection
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Click "Journal about this"
    const journalBtn = screen.getByRole('button', { name: /journal about this prayer/i })
    await user.click(journalBtn)

    expect(mockOnSwitchToJournal).toHaveBeenCalled()
  })

  it('retry prompt clears on typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip reveal + wait for reflection
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Click "Something different" to go back to input with retry prompt
    await user.click(screen.getByRole('button', { name: /something different/i }))
    act(() => { vi.advanceTimersByTime(200) })

    expect(screen.getByText(/try describing/i)).toBeInTheDocument()

    // Type something
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'New prayer topic')

    expect(screen.queryByText(/try describing/i)).not.toBeInTheDocument()
  })

  it('existing secondary CTAs remain visible', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip to see all CTAs
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Both existing CTAs should still be present
    expect(screen.getByText(/pray about something else/i)).toBeInTheDocument()
    // The "Journal about this →" secondary CTA
    expect(screen.getByText(/journal about this →/i)).toBeInTheDocument()
  })

  it('reflection pills are keyboard accessible', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // All 3 reflection pills should be buttons with accessible names
    expect(screen.getByRole('button', { name: /it resonated/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /something different/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /journal about this prayer/i })).toBeInTheDocument()
  })

  it('pill touch targets are 44px minimum', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    const resonatedBtn = screen.getByRole('button', { name: /it resonated/i })
    expect(resonatedBtn.className).toContain('min-h-[44px]')
  })
})

// --- Full prayer experience flow ---
describe('full prayer experience flow', () => {
  it('generate → reveal → reflection → resonated', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    // Step 1: Generate prayer
    await generatePrayer(user)

    // Verify ambient auto-play
    expect(mockLoadScene).toHaveBeenCalledTimes(1)
    expect(mockAudioDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.4 },
    })

    // Step 2: Wait for prayer display
    act(() => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText('Your prayer:')).toBeInTheDocument()

    // Step 3: Skip reveal
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(10) })
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()

    // Step 4: Wait for reflection
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.getByText('How did that prayer land?')).toBeInTheDocument()

    // Step 5: Click resonated
    await user.click(screen.getByRole('button', { name: /it resonated/i }))
    expect(screen.getByText(/carry this prayer with you/i)).toBeInTheDocument()

    // Step 6: Wait for fade out
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.queryByText('How did that prayer land?')).not.toBeInTheDocument()
  })

  it('generate → skip → something different → regenerate', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    // Generate first prayer
    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    // Skip reveal
    await user.click(screen.getByRole('button', { name: /skip/i }))
    act(() => { vi.advanceTimersByTime(610) })

    // Click "Something different"
    await user.click(screen.getByRole('button', { name: /something different/i }))
    act(() => { vi.advanceTimersByTime(200) })

    // Back to input
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
    expect(screen.getByText(/try describing/i)).toBeInTheDocument()

    // Type new text and generate again
    mockLoadScene.mockClear()
    mockAudioDispatch.mockClear()
    await generatePrayer(user, 'Help me with gratitude')
    act(() => { vi.advanceTimersByTime(1600) })

    // Verify new prayer appears with fresh reveal
    expect(screen.getByText('Your prayer:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
  })

  it('no regressions: logged-out user sees auth modal', async () => {
    localStorage.removeItem('wr_auth_simulated')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    // Should not call loadScene (auth check fails before auto-play)
    expect(mockLoadScene).not.toHaveBeenCalled()
    // Should not start loading
    expect(screen.queryByText(/generating prayer/i)).not.toBeInTheDocument()
    // Should show draft-aware subtitle
    expect(
      screen.getByText('Sign in to pray together. Your draft is safe — we\u2019ll bring it back after.'),
    ).toBeInTheDocument()
  })

  it('no regressions: Copy, Save buttons present after generation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    expect(screen.getByRole('button', { name: /copy prayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save prayer/i })).toBeInTheDocument()
  })

  it('no regressions: existing CTAs unchanged', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })

    expect(screen.getByText(/journal about this →/i)).toBeInTheDocument()
    expect(screen.getByText(/pray about something else/i)).toBeInTheDocument()
  })

  it('prefers-reduced-motion: full flow without auto-play', async () => {
    mockReducedMotion = true
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()

    await generatePrayer(user)

    // No auto-play
    expect(mockLoadScene).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1600) })

    // Prayer should appear
    expect(screen.getByText('Your prayer:')).toBeInTheDocument()

    // Text should appear instantly (KaraokeTextReveal handles prefers-reduced-motion)
    // Skip link should disappear quickly since reveal is instant
    act(() => { vi.advanceTimersByTime(10) })

    // Reflection should still work
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.getByText('How did that prayer land?')).toBeInTheDocument()
  })
})

// --- Guided Prayer Section integration tests ---

describe('PrayTabContent — Guided Prayer Section', () => {
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.clear()
    resetAudioState()
    mockReducedMotion = false
    vi.clearAllMocks()
  })

  it('Guided Prayer Section renders within Pray tab', () => {
    renderPrayTab()
    expect(screen.getByText('Guided Prayer Sessions')).toBeInTheDocument()
    expect(screen.queryByText('Close your eyes and let God lead')).not.toBeInTheDocument()
  })

  it('all 8 session cards are visible', () => {
    renderPrayTab()
    expect(screen.getByText('Morning Offering')).toBeInTheDocument()
    expect(screen.getByText('Evening Surrender')).toBeInTheDocument()
    expect(screen.getByText('Finding Peace')).toBeInTheDocument()
    expect(screen.getByText('Comfort in Sorrow')).toBeInTheDocument()
    expect(screen.getByText('Gratitude Prayer')).toBeInTheDocument()
    expect(screen.getByText('Forgiveness Release')).toBeInTheDocument()
    expect(screen.getByText('Strength for Today')).toBeInTheDocument()
    expect(screen.getByText('Healing Prayer')).toBeInTheDocument()
  })

  it('section visible alongside input area (not hidden by prayer state)', () => {
    renderPrayTab()
    // Prayer textarea is visible
    expect(screen.getByLabelText('Prayer request')).toBeInTheDocument()
    // Guided prayer section is also visible
    expect(screen.getByText('Guided Prayer Sessions')).toBeInTheDocument()
  })

  it('existing Help Me Pray button still present', () => {
    renderPrayTab()
    expect(screen.getByText('Help Me Pray')).toBeInTheDocument()
  })
})

describe('PrayTabContent (accessibility)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAudioState()
    localStorage.clear()
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    mockReducedMotion = false
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('character count renders with CharacterCount component', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'Hello God')
    expect(screen.getByText('9 / 500')).toBeInTheDocument()
  })

  it('character count shows warning color at 400 chars', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    const longText = 'a'.repeat(400)
    await user.click(textarea)
    // Use fireEvent for large text to avoid slow typing
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
      nativeInputValueSetter.call(textarea, longText)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const countEl = screen.getByText('400 / 500')
    expect(countEl).toHaveClass('text-amber-400')
  })

  it('shows inline error with AlertCircle on empty submit', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    await user.click(screen.getByText('Help Me Pray'))
    expect(screen.getByText(/Tell God what's on your heart/)).toBeInTheDocument()
    // Check for AlertCircle icon (SVG)
    const errorP = screen.getByText(/Tell God what's on your heart/).closest('p')
    expect(errorP?.querySelector('svg')).toBeInTheDocument()
  })

  it('error has role=alert', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    await user.click(screen.getByText('Help Me Pray'))
    expect(screen.getByRole('alert')).toHaveTextContent(/Tell God what's on your heart/)
  })

  it('textarea has aria-invalid on empty submit', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    await user.click(screen.getByText('Help Me Pray'))
    expect(screen.getByLabelText('Prayer request')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('PrayTabContent atmospheric visuals', () => {
  it('renders without GlowBackground (stars/glows provided by DailyHub root)', () => {
    renderPrayTab()
    expect(screen.queryByTestId('glow-orb')).not.toBeInTheDocument()
  })

  it('pray tab heading "What\'s On Your Heart?" is removed', () => {
    renderPrayTab()
    expect(screen.queryByRole('heading', { name: /what's on your heart\?/i })).not.toBeInTheDocument()
  })

  it('GuidedPrayerPlayer renders as sibling of the content wrapper, not a descendant', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    // Trigger guided session by clicking the first session card
    const sessionTitle = screen.getByText('Morning Offering')
    const sessionCard = sessionTitle.closest('button')
    expect(sessionCard).not.toBeNull()
    await user.click(sessionCard!)
    // Player dialog now rendered (mocked)
    const playerDialog = screen.getByTestId('mock-guided-player')
    // The content wrapper div contains the prayer input/response and guided section
    const guidedSection = screen.getByText('Morning Offering').closest('.max-w-4xl')
    const contentWrapper = guidedSection?.parentElement
    expect(contentWrapper).not.toBeNull()
    // CRITICAL INVARIANT: Player must NOT be inside the content wrapper
    expect(contentWrapper!.contains(playerDialog)).toBe(false)
  })

  it('submit button reads "Help Me Pray"', () => {
    renderPrayTab()
    expect(screen.getByRole('button', { name: 'Help Me Pray' })).toBeInTheDocument()
  })

  it('ambient sound pill renders inside chips row (same container)', () => {
    renderPrayTab()
    const chip = screen.getByText("I'm struggling with...")
    const pillButton = screen.getByLabelText(/enhance with sound/i)
    expect(chip.closest('div.flex')).toBe(pillButton.closest('div.flex'))
  })

  it('chips row has items-center for vertical alignment', () => {
    renderPrayTab()
    const chip = screen.getByText("I'm struggling with...")
    const chipsContainer = chip.closest('div.flex')
    expect(chipsContainer).toHaveClass('items-center')
  })

  it('pill disappears when user types in textarea', async () => {
    const user = userEvent.setup()
    renderPrayTab()
    expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'Help me')
    expect(screen.queryByLabelText(/enhance with sound/i)).not.toBeInTheDocument()
  })

  it('does not render BackgroundSquiggle', () => {
    renderPrayTab()
    expect(document.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
  })
})

describe('PrayTabContent devotional context', () => {
  it('devotional prayContext pre-fills textarea', () => {
    renderPrayTab({
      prayContext: {
        from: 'devotional',
        topic: 'Trust',
        customPrompt: "I'm reflecting on Proverbs 3:5-6. Where are you relying on your own understanding?",
      },
    })
    const textarea = screen.getByLabelText('Prayer request')
    expect(textarea).toHaveValue("I'm reflecting on Proverbs 3:5-6. Where are you relying on your own understanding?")
  })

  it('devotional pre-fill consumed only once', () => {
    const prayContext: PrayContext = {
      from: 'devotional',
      topic: 'Trust',
      customPrompt: "I'm reflecting on Proverbs 3:5-6. Where are you relying on your own understanding?",
    }
    const { rerender } = renderPrayTab({ prayContext })
    const textarea = screen.getByLabelText('Prayer request')
    expect(textarea).toHaveValue("I'm reflecting on Proverbs 3:5-6. Where are you relying on your own understanding?")
    // Re-render with same context — should not duplicate
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <PrayTabContent prayContext={prayContext} />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(textarea).toHaveValue("I'm reflecting on Proverbs 3:5-6. Where are you relying on your own understanding?")
  })

  it('existing URL param initialContext still works', () => {
    renderPrayTab()
    // Without initialContext, textarea should be empty
    const textarea = screen.getByLabelText('Prayer request')
    expect(textarea).toHaveValue('')
  })

  it('no devotional context banner rendered', () => {
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    expect(screen.queryByText(/praying about today.s devotional on/i)).not.toBeInTheDocument()
  })

  // --- DevotionalPreviewPanel integration ---

  const mockSnapshot: DevotionalSnapshot = {
    date: '2026-04-06',
    title: 'Anchored in Trust',
    passage: {
      reference: 'Proverbs 3:5-6',
      verses: [
        { number: 5, text: 'Trust in Yahweh with all your heart.' },
        { number: 6, text: 'In all your ways acknowledge him.' },
      ],
    },
    reflection: ['Trusting God does not mean you stop thinking.'],
    reflectionQuestion: 'Where are you relying on your own understanding?',
    quote: { text: 'God never made a promise that was too good to be true.', attribution: 'D.L. Moody' },
  }

  it('preview panel appears when devotionalSnapshot is present', () => {
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Reflect on trust', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByText('Anchored in Trust', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
  })

  it('preview panel not shown when no snapshot', () => {
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Reflect on trust' },
    })
    expect(screen.queryByRole('button', { name: /today's devotional/i })).not.toBeInTheDocument()
  })

  it('preview panel disappears when dismiss button clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Reflect on trust', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss devotional preview/i }))
    expect(screen.queryByRole('button', { name: /today's devotional/i })).not.toBeInTheDocument()
  })

  it('preview panel hidden during loading', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Reflect on trust', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    await generatePrayer(user)
    expect(screen.queryByRole('button', { name: /today's devotional/i })).not.toBeInTheDocument()
  })

  it('preview panel has dismiss button', () => {
    renderPrayTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Reflect on trust', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss devotional preview/i })).toBeInTheDocument()
  })
})

describe('prayer draft persistence', () => {
  it('restores draft from localStorage on mount', () => {
    localStorage.setItem('wr_prayer_draft', 'My ongoing prayer')
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('My ongoing prayer')
  })

  it('starts with empty textarea when no draft exists', () => {
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('')
  })

  it('saves draft to localStorage after 1-second debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    await user.type(textarea, 'Help me with anxiety')
    // Before debounce fires
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
    // After debounce
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Help me with anxiety')
  })

  it('does not save draft before debounce completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'Hello')
    act(() => { vi.advanceTimersByTime(500) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  it('removes draft key when textarea is cleared', async () => {
    localStorage.setItem('wr_prayer_draft', 'Existing draft')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    const textarea = screen.getByLabelText('Prayer request')
    await user.clear(textarea)
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  it('clears draft after successful prayer generation', async () => {
    localStorage.setItem('wr_prayer_draft', 'My prayer text')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
  })

  it('preserves draft in localStorage when auth modal opens (logged out)', async () => {
    localStorage.removeItem('wr_auth_simulated')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'Vulnerable prayer')
    act(() => { vi.advanceTimersByTime(1100) })
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Vulnerable prayer')
    // Click generate — auth modal opens
    await user.click(screen.getByRole('button', { name: /help me pray/i }))
    // Draft should still be in localStorage
    expect(localStorage.getItem('wr_prayer_draft')).toBe('Vulnerable prayer')
  })

  it('initialText prop overrides stored draft', () => {
    localStorage.setItem('wr_prayer_draft', 'Stale draft')
    renderPrayTab({
      prayContext: {
        from: 'devotional',
        topic: 'Trust',
        customPrompt: 'Fresh devotional context',
      },
    })
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Fresh devotional context')
  })

  it('prayer draft operations do not affect journal draft', async () => {
    localStorage.setItem('wr_journal_draft', 'My journal entry')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await generatePrayer(user)
    act(() => { vi.advanceTimersByTime(1600) })
    // Prayer draft cleared, journal draft untouched
    expect(localStorage.getItem('wr_prayer_draft')).toBeNull()
    expect(localStorage.getItem('wr_journal_draft')).toBe('My journal entry')
  })

  it('draft persists when component remounts', () => {
    localStorage.setItem('wr_prayer_draft', 'Persisted draft')
    const { unmount } = renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Persisted draft')
    unmount()
    renderPrayTab()
    expect(screen.getByLabelText('Prayer request')).toHaveValue('Persisted draft')
  })

  it('shows draft saved indicator after typing in prayer input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'My heartfelt prayer')
    act(() => { vi.advanceTimersByTime(1100) })
    expect(screen.getByText('Draft saved')).toBeInTheDocument()
  })

  it('draft saved indicator auto-hides after 2 seconds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPrayTab()
    await user.type(screen.getByLabelText('Prayer request'), 'My prayer')
    act(() => { vi.advanceTimersByTime(1100) })
    expect(screen.getByText('Draft saved')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(2100) })
    expect(screen.queryByText('Draft saved')).not.toBeInTheDocument()
  })
})
