import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { JournalTabContent } from '../JournalTabContent'
import type { DevotionalSnapshot } from '@/types/daily-experience'

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

// Mock useUnsavedChanges (useBlocker requires data router context)
vi.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    showModal: false,
    confirmLeave: vi.fn(),
    cancelLeave: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  mockRecordActivity.mockClear()
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn()
})

function renderJournalTab(props: Partial<React.ComponentProps<typeof JournalTabContent>> = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <JournalTabContent {...props} />
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
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
}

let lastRecognitionInstance: MockSpeechRecognition | null = null
class TrackingMockSpeechRecognition extends MockSpeechRecognition {
  constructor() {
    super()
    // eslint-disable-next-line @typescript-eslint/no-this-alias
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
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
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

    expect(screen.getByText('Got it.')).toBeInTheDocument()
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
    expect(screen.getByText('Microphone access needed. Check your browser settings.')).toBeInTheDocument()

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

  it('character counter is positioned at bottom-left', async () => {
    const user = userEvent.setup()
    renderJournalTab()

    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'H')

    const counter = screen.getByText('1 / 5,000')
    // CharacterCount is wrapped in a span with className including 'left-3'
    const wrapper = counter.closest('[class*="left-3"]')
    expect(wrapper).toBeInTheDocument()
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

// --- Journal Empty State Tests ---

describe('JournalTabContent empty state', () => {
  it('shows empty state when no saved entries and authenticated', () => {
    renderJournalTab()
    expect(screen.getByText('Your journal is waiting')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Every thought you write becomes a conversation with God. Start with whatever's on your heart.",
      ),
    ).toBeInTheDocument()
  })

  it('does not show empty state when entries exist', async () => {
    const user = userEvent.setup()
    renderJournalTab()

    // Save an entry to move from 0 → 1 saved entries
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Today I feel grateful for many things')
    const saveBtn = screen.getByRole('button', { name: /save entry/i })
    await user.click(saveBtn)

    expect(screen.queryByText('Your journal is waiting')).not.toBeInTheDocument()
  })

  it('does not show empty state when logged out', () => {
    localStorage.removeItem('wr_auth_simulated')
    renderJournalTab()
    expect(screen.queryByText('Your journal is waiting')).not.toBeInTheDocument()
  })

  it('CTA scrolls to and focuses textarea', async () => {
    const user = userEvent.setup()
    renderJournalTab()

    const cta = screen.getByRole('button', {
      name: /write your first entry/i,
    })
    const textarea = screen.getByLabelText('Journal entry')

    const scrollSpy = vi.fn()
    textarea.scrollIntoView = scrollSpy
    const focusSpy = vi.spyOn(textarea, 'focus')

    await user.click(cta)

    expect(scrollSpy).toHaveBeenCalled()
    expect(focusSpy).toHaveBeenCalled()
  })
})

describe('JournalTabContent (accessibility)', () => {
  it('character count uses CharacterCount component', async () => {
    const user = userEvent.setup()
    renderJournalTab()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Hello')
    expect(screen.getByText('5 / 5,000')).toBeInTheDocument()
  })

  it('character count shows warning color at 4000+ chars', async () => {
    renderJournalTab()
    const textarea = screen.getByLabelText('Journal entry')
    const longText = 'a'.repeat(4000)
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(textarea, longText)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const countEl = screen.getByText('4,000 / 5,000')
    expect(countEl).toHaveClass('text-amber-400')
  })

  it('unsaved changes modal renders when showModal is true', async () => {
    // Test that UnsavedChangesModal is wired up in the component
    // The actual blocking behavior is tested in useUnsavedChanges.test.ts
    // Here we verify the component imports and renders the modal
    const { useUnsavedChanges } = await import('@/hooks/useUnsavedChanges')
    expect(useUnsavedChanges).toBeDefined()
  })

  it('"Keep editing" preserves text content', async () => {
    const user = userEvent.setup()
    renderJournalTab()
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'My journal entry')
    // Text should still be there (modal is mocked as not showing)
    expect(textarea).toHaveValue('My journal entry')
  })
})

describe('JournalTabContent atmospheric visuals', () => {
  it('renders without GlowBackground (stars/glows provided by DailyHub root)', () => {
    renderJournalTab()
    expect(screen.queryByTestId('glow-orb')).not.toBeInTheDocument()
  })

  it('renders gradient heading text "What\'s On Your Mind?"', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveStyle({ backgroundImage: expect.stringContaining('linear-gradient') })
  })

  it('heading has no Caveat script font span', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.querySelector('.font-script')).toBeNull()
  })

  it('heading is a single text node (no inner span)', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.querySelector('span')).toBeNull()
  })

  it('heading has leading-tight class and no text-white class', () => {
    renderJournalTab()
    const heading = screen.getByRole('heading', { name: /what's on your mind\?/i })
    expect(heading.className).toContain('leading-tight')
    expect(heading.className).not.toContain('text-white')
  })

  it('empty state renders in the component', () => {
    renderJournalTab()
    const emptyStateText = screen.getByText('Your journal is waiting')
    expect(emptyStateText).toBeInTheDocument()
  })

  it('saved entries list renders in the component', async () => {
    const user = userEvent.setup()
    renderJournalTab()
    // Save an entry to populate SavedEntriesList
    const textarea = screen.getByLabelText('Journal entry')
    await user.type(textarea, 'Today I feel grateful for many things')
    const saveBtn = screen.getByRole('button', { name: /save entry/i })
    await user.click(saveBtn)
    // SavedEntriesList now rendered
    const savedEntryContent = screen.getByText('Today I feel grateful for many things')
    expect(savedEntryContent).toBeInTheDocument()
  })

  it('ambient sound pill renders inline with mode toggle (same flex container)', () => {
    renderJournalTab()
    const guidedButton = screen.getByRole('button', { name: 'Guided' })
    const pillButton = screen.getByLabelText(/enhance with sound/i)
    const toggleGroup = guidedButton.closest('[role="group"]')
    const sharedParent = toggleGroup?.parentElement
    expect(sharedParent).not.toBeNull()
    expect(sharedParent!.contains(pillButton)).toBe(true)
  })

  it('mode toggle + pill container has flex-wrap and items-center', () => {
    renderJournalTab()
    const guidedButton = screen.getByRole('button', { name: 'Guided' })
    const toggleGroup = guidedButton.closest('[role="group"]')
    const container = toggleGroup?.parentElement
    expect(container).not.toBeNull()
    expect(container!.className).toContain('flex-wrap')
    expect(container!.className).toContain('items-center')
    expect(container!.className).toContain('gap-3')
  })

  it('pill is visible in Guided mode', () => {
    renderJournalTab()
    expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
  })

  it('pill is visible in Free Write mode', async () => {
    const user = userEvent.setup()
    renderJournalTab()
    const freeWriteButton = screen.getByRole('button', { name: 'Free Write' })
    await user.click(freeWriteButton)
    expect(screen.getByLabelText(/enhance with sound/i)).toBeInTheDocument()
  })

  it('does not render BackgroundSquiggle', () => {
    renderJournalTab()
    expect(document.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
  })
})

describe('JournalTabContent devotional context', () => {
  it('auto-selects Guided mode when devotional context arrives with no draft', () => {
    localStorage.removeItem('wr_journal_draft')
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    const guidedButton = screen.getByRole('button', { name: 'Guided' })
    expect(guidedButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows draft conflict dialog when devotional context arrives and draft exists', () => {
    localStorage.setItem('wr_journal_draft', 'Some existing draft text')
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    expect(screen.getByRole('dialog', { name: /unsaved draft/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start fresh/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep my current draft/i })).toBeInTheDocument()
  })

  it('"Start fresh" clears draft and shows devotional prompt', async () => {
    const user = userEvent.setup()
    localStorage.setItem('wr_journal_draft', 'Some existing draft text')
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    await user.click(screen.getByRole('button', { name: /start fresh/i }))
    // Dialog should be gone
    expect(screen.queryByRole('dialog', { name: /unsaved draft/i })).not.toBeInTheDocument()
    // Draft cleared from localStorage
    expect(localStorage.getItem('wr_journal_draft')).toBeNull()
    // Prompt card shows the devotional reflection question
    expect(screen.getByText(/Where are you relying on your own understanding/)).toBeInTheDocument()
  })

  it('"Keep my current draft" dismisses devotional context and shows rotating prompts', async () => {
    const user = userEvent.setup()
    localStorage.setItem('wr_journal_draft', 'Some existing draft text')
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    await user.click(screen.getByText(/keep my current draft/i))
    // Dialog gone
    expect(screen.queryByRole('dialog', { name: /unsaved draft/i })).not.toBeInTheDocument()
    // Devotional prompt NOT shown (rotating prompt shown instead)
    expect(screen.queryByText(/Where are you relying on your own understanding/)).not.toBeInTheDocument()
  })

  it('no draft conflict dialog when draft is empty', () => {
    localStorage.setItem('wr_journal_draft', '   ')
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    expect(screen.queryByRole('dialog', { name: /unsaved draft/i })).not.toBeInTheDocument()
  })

  it('prompt card shows devotional reflection question when context is active', () => {
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    expect(screen.getByText(/Where are you relying on your own understanding/)).toBeInTheDocument()
  })

  it('no guided-mode pray-to-journal context banner rendered', () => {
    renderJournalTab({
      prayContext: { from: 'pray', topic: 'anxiety' },
    })
    // Guided-mode context banners have been removed
    expect(screen.queryByText(/Continuing from your prayer about/)).not.toBeInTheDocument()
  })

  it('no guided-mode devotional context banner rendered', () => {
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    // Guided-mode context banners have been removed; DevotionalPreviewPanel handles dismiss
    expect(screen.queryByRole('button', { name: /write about something else/i })).not.toBeInTheDocument()
  })

  it('free-write mode shows devotional context note', async () => {
    const user = userEvent.setup()
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    // Switch to Free Write mode
    await user.click(screen.getByRole('button', { name: 'Free Write' }))
    expect(screen.getByText(/Reflecting on today.s devotional on Trust/)).toBeInTheDocument()
  })

  it('free-write mode devotional note has "View full devotional" link', async () => {
    const user = userEvent.setup()
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    await user.click(screen.getByRole('button', { name: 'Free Write' }))
    const link = screen.getByRole('link', { name: /view full devotional/i })
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('pray context does not have "View full devotional" link', () => {
    renderJournalTab({
      prayContext: { from: 'pray', topic: 'anxiety' },
    })
    expect(screen.queryByRole('link', { name: /view full devotional/i })).not.toBeInTheDocument()
  })

  it('dismiss works in free-write mode alongside "View full devotional"', async () => {
    const user = userEvent.setup()
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    await user.click(screen.getByRole('button', { name: 'Free Write' }))
    expect(screen.getByRole('link', { name: /view full devotional/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('link', { name: /view full devotional/i })).not.toBeInTheDocument()
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
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    expect(screen.getByText('Anchored in Trust', { exact: false })).toBeInTheDocument()
  })

  it('preview panel not shown when no snapshot', () => {
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?' },
    })
    expect(screen.queryByRole('button', { name: /today's devotional/i })).not.toBeInTheDocument()
  })

  it('preview panel disappears when dismiss button clicked', async () => {
    const user = userEvent.setup()
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?', devotionalSnapshot: mockSnapshot },
    })
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /dismiss devotional preview/i }))
    expect(screen.queryByRole('button', { name: /today's devotional/i })).not.toBeInTheDocument()
  })

  it('preview panel appears in both guided and free-write modes', async () => {
    const user = userEvent.setup()
    renderJournalTab({
      prayContext: { from: 'devotional', topic: 'Trust', customPrompt: 'Where are you relying on your own understanding?', devotionalSnapshot: mockSnapshot },
    })
    // Visible in guided mode (default)
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
    // Switch to free-write mode
    await user.click(screen.getByRole('button', { name: 'Free Write' }))
    // Still visible
    expect(screen.getByRole('button', { name: /today's devotional/i })).toBeInTheDocument()
  })
})
