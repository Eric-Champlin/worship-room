import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { JournalTabContent } from '../JournalTabContent'

// Mock AudioProvider (needed by AmbientSoundPill embedded in JournalTabContent)
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
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
  }),
  useAudioDispatch: () => vi.fn(),
}))

// Mock useScenePlayer (needed by AmbientSoundPill)
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: vi.fn(),
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

// Mock useFaithPoints to spy on recordActivity
const mockRecordActivity = vi.fn()
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockRecordActivity.mockClear()
})

function renderJournalTab() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <JournalTabContent />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('JournalTabContent activity integration', () => {
  it('recordActivity("journal") called after save', async () => {
    const user = userEvent.setup()
    renderJournalTab()

    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Today I feel grateful for many things')

    const saveBtn = screen.getByRole('button', { name: /save entry/i })
    await user.click(saveBtn)

    expect(mockRecordActivity).toHaveBeenCalledWith('journal')
  })
})

// --- Voice Input Integration Tests ---

class MockSpeechRecognition {
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}

let lastRecognitionInstance: MockSpeechRecognition | null = null
class TrackingMockSpeechRecognition extends MockSpeechRecognition {
  constructor() {
    super()
    lastRecognitionInstance = this
  }
}

function installSpeechRecognition() {
  Object.defineProperty(window, 'SpeechRecognition', {
    value: TrackingMockSpeechRecognition,
    writable: true,
    configurable: true,
  })
}

function removeSpeechRecognition() {
  delete (window as any).SpeechRecognition
  delete (window as any).webkitSpeechRecognition
}

describe('Voice Input', () => {
  beforeEach(() => {
    lastRecognitionInstance = null
    installSpeechRecognition()
  })

  afterEach(() => {
    removeSpeechRecognition()
  })

  it('mic button not rendered when logged out', () => {
    localStorage.setItem('wr_auth_simulated', 'false')
    renderJournalTab()

    expect(screen.queryByLabelText('Start voice input')).not.toBeInTheDocument()
  })

  it('mic button not rendered when SpeechRecognition unavailable', () => {
    removeSpeechRecognition()
    renderJournalTab()

    expect(screen.queryByLabelText('Start voice input')).not.toBeInTheDocument()
  })

  it('mic button rendered for authenticated user with SpeechRecognition', () => {
    renderJournalTab()

    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()
  })

  it('mic button visible in both Guided and Free Write modes', async () => {
    const user = userEvent.setup()
    renderJournalTab()

    // Default: Guided mode
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()

    // Switch to Free Write
    await user.click(screen.getByRole('button', { name: 'Free Write' }))
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()

    // Switch back to Guided
    await user.click(screen.getByRole('button', { name: 'Guided' }))
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()
  })

  it('mic button toggles aria-label on click', () => {
    renderJournalTab()

    const micBtn = screen.getByLabelText('Start voice input')

    act(() => {
      fireEvent.click(micBtn)
    })

    // After clicking, aria-label should change to "Stop voice input"
    expect(screen.getByLabelText('Stop voice input')).toBeInTheDocument()
  })

  it('starting recording shows success toast', () => {
    renderJournalTab()

    const micBtn = screen.getByLabelText('Start voice input')

    act(() => {
      fireEvent.click(micBtn)
    })

    expect(screen.getByText('Listening... speak your heart.')).toBeInTheDocument()
  })

  it('stopping recording shows success toast', () => {
    renderJournalTab()

    const micBtn = screen.getByLabelText('Start voice input')

    // Start
    act(() => {
      fireEvent.click(micBtn)
    })

    // Stop
    const stopBtn = screen.getByLabelText('Stop voice input')
    act(() => {
      fireEvent.click(stopBtn)
    })

    expect(screen.getByText('Voice captured.')).toBeInTheDocument()
  })

  it('permission denied shows error toast and disables button', () => {
    renderJournalTab()

    const micBtn = screen.getByLabelText('Start voice input')

    act(() => {
      fireEvent.click(micBtn)
    })

    const recognition = lastRecognitionInstance!

    act(() => {
      recognition.onerror?.({ error: 'not-allowed' })
    })

    // Error toast
    expect(screen.getByText('Microphone access is needed for voice input. Check your browser settings.')).toBeInTheDocument()

    // Button should be disabled with correct aria-label
    const disabledBtn = screen.getByLabelText('Voice input unavailable — microphone access denied')
    expect(disabledBtn).toBeDisabled()
  })

  it('voice text appends to existing textarea content', () => {
    renderJournalTab()

    const textarea = screen.getByLabelText('Journal entry') as HTMLTextAreaElement

    // Type some text first
    fireEvent.change(textarea, { target: { value: 'Hello' } })

    // Start voice
    const micBtn = screen.getByLabelText('Start voice input')
    act(() => {
      fireEvent.click(micBtn)
    })

    const recognition = lastRecognitionInstance!

    // Simulate voice transcript
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            isFinal: true,
            0: { transcript: 'world' },
          },
        },
      })
    })

    expect(textarea.value).toBe('Hello world')
  })

  it('character counter is positioned at bottom-left', () => {
    renderJournalTab()

    const counter = screen.getByText('0/5,000')
    expect(counter.className).toContain('left-3')
    expect(counter.className).not.toContain('right-3')
  })

  it('recording start announced to screen readers', async () => {
    vi.useFakeTimers()
    renderJournalTab()

    const micBtn = screen.getByLabelText('Start voice input')

    act(() => {
      fireEvent.click(micBtn)
    })

    // The announce hook debounces polite messages by 300ms
    act(() => {
      vi.advanceTimersByTime(350)
    })

    const politeRegion = screen.getByTestId('announce-polite')
    expect(politeRegion).toHaveTextContent('Recording started')
    vi.useRealTimers()
  })

  it('all three aria-label states are correct', () => {
    renderJournalTab()

    // Idle state
    expect(screen.getByLabelText('Start voice input')).toBeInTheDocument()

    // Recording state
    const micBtn = screen.getByLabelText('Start voice input')
    act(() => {
      fireEvent.click(micBtn)
    })
    expect(screen.getByLabelText('Stop voice input')).toBeInTheDocument()

    // Trigger permission denied
    const recognition = lastRecognitionInstance!
    act(() => {
      recognition.onerror?.({ error: 'not-allowed' })
    })

    // We need to start a new recognition to test disabled — but since permission is denied,
    // the button should show the denied label
    expect(screen.getByLabelText('Voice input unavailable — microphone access denied')).toBeInTheDocument()
  })
})
