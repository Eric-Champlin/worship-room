import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// --- Mocks ---

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test', id: 'test-1' } }),
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: () => ({
    currentSeason: { id: 'ordinary', name: 'Ordinary Time', themeColor: '#6D28D9', icon: '✝️', greeting: 'Peace be with you', suggestedContent: [], themeWord: 'faith' },
    seasonName: 'Ordinary Time', themeColor: '#6D28D9', icon: '✝️', greeting: 'Peace be with you',
    daysUntilNextSeason: 30, isNamedSeason: false,
  }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudioState: () => ({
    activeSounds: [], isPlaying: false, currentSceneName: null, currentSceneId: null,
    pillVisible: false, drawerOpen: false, foregroundContent: null, sleepTimer: null,
    activeRoutine: null, masterVolume: 0.8, foregroundBackgroundBalance: 0.5, foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => vi.fn(),
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null, loadScene: vi.fn(), isLoading: false,
    undoAvailable: false, undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null, confirmRoutineInterrupt: vi.fn(), cancelRoutineInterrupt: vi.fn(),
  }),
}))

vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isSupported: false, isListening: false, isPermissionDenied: false,
    startListening: vi.fn(), stopListening: vi.fn(),
  }),
}))

vi.mock('@/hooks/useBibleSearch', () => ({
  useBibleSearch: () => ({
    query: '', setQuery: vi.fn(), results: [], isSearching: false,
    isLoadingIndex: false, hasMore: false, totalResults: 0, loadMore: vi.fn(), error: null,
  }),
}))

beforeEach(() => {
  localStorage.clear()
})

// Providers wrapper for components that need Router + AuthModal + Toast
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          {children}
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('BB-35 Form Accessibility', () => {
  it('PrayerInput textarea has aria-label', async () => {
    const { PrayerInput } = await import('@/components/daily/PrayerInput')
    render(
      <Providers>
        <PrayerInput onSubmit={vi.fn()} isLoading={false} />
      </Providers>,
    )
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    expect(textarea).toHaveAttribute('aria-label', 'Prayer request')
  })

  it('JournalInput textarea has aria-label', async () => {
    const { JournalInput } = await import('@/components/daily/JournalInput')
    render(
      <Providers>
        <JournalInput
          mode="free"
          onModeChange={vi.fn()}
          currentPrompt="Test prompt"
          onTryDifferentPrompt={vi.fn()}
          showPromptRefresh={false}
          contextDismissed={false}
          onDismissContext={vi.fn()}
          onSave={vi.fn()}
        />
      </Providers>,
    )
    const textarea = screen.getByRole('textbox', { name: /journal entry/i })
    expect(textarea).toHaveAttribute('aria-label', 'Journal entry')
  })

  it('AskPage textarea has aria-label', async () => {
    // AskPage is complex — we test the aria-label attribute directly
    const { AskPage } = await import('@/pages/AskPage')
    render(
      <Providers>
        <AskPage />
      </Providers>,
    )
    const textarea = screen.getByRole('textbox', { name: /your question/i })
    expect(textarea).toHaveAttribute('aria-label', 'Your question')
  })

  it('Bible search input has aria-label', async () => {
    const { BibleSearchMode } = await import('@/components/bible/BibleSearchMode')
    render(
      <Providers>
        <BibleSearchMode />
      </Providers>,
    )
    const input = screen.getByRole('textbox', { name: /search the bible/i })
    expect(input).toHaveAttribute('aria-label', 'Search the Bible')
  })

  it('PrayerInput shows aria-invalid when nudge error is triggered', async () => {
    const { PrayerInput } = await import('@/components/daily/PrayerInput')
    const user = userEvent.setup()
    render(
      <Providers>
        <PrayerInput onSubmit={vi.fn()} isLoading={false} />
      </Providers>,
    )

    // Submit with empty text to trigger nudge/error
    const submitButton = screen.getByRole('button', { name: /help me pray/i })
    await user.click(submitButton)

    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('PrayerInput textarea has aria-describedby linking to character count', async () => {
    const { PrayerInput } = await import('@/components/daily/PrayerInput')
    render(
      <Providers>
        <PrayerInput onSubmit={vi.fn()} isLoading={false} />
      </Providers>,
    )
    const textarea = screen.getByRole('textbox', { name: /prayer request/i })
    const describedBy = textarea.getAttribute('aria-describedby')
    expect(describedBy).toContain('pray-char-count')
  })

  it('CharacterCount renders with aria-live="polite"', async () => {
    const { CharacterCount } = await import('@/components/ui/CharacterCount')
    render(<CharacterCount current={50} max={500} id="test-count" />)

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })

  it('MarkAsAnsweredForm has label htmlFor matching textarea id', async () => {
    const { MarkAsAnsweredForm } = await import('@/components/prayer-wall/MarkAsAnsweredForm')
    const user = userEvent.setup()
    render(<MarkAsAnsweredForm onConfirm={vi.fn()} />)

    // Expand the form first
    await user.click(screen.getByRole('button', { name: /mark as answered/i }))

    const label = screen.getByText(/share how god answered/i)
    expect(label.tagName).toBe('LABEL')
    expect(label).toHaveAttribute('for', 'testimony-textarea')

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('id', 'testimony-textarea')
  })

  it('FormField injects aria-describedby and aria-invalid on child input', async () => {
    const { FormField } = await import('@/components/ui/FormField')
    render(
      <FormField label="Email" error="Invalid email" helpText="Enter your email address">
        <input type="email" />
      </FormField>,
    )

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')

    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()

    // The error message should be present and linked
    const errorMsg = screen.getByRole('alert')
    expect(errorMsg).toHaveTextContent('Invalid email')
    expect(describedBy).toContain(errorMsg.id)
  })

  it('FormField provides accessible description via help text', async () => {
    const { FormField } = await import('@/components/ui/FormField')
    render(
      <FormField label="Username" helpText="Choose a unique username">
        <input type="text" />
      </FormField>,
    )

    const input = screen.getByRole('textbox')
    // toHaveAccessibleDescription checks the linked aria-describedby content
    expect(input).toHaveAccessibleDescription(/choose a unique username/i)
  })

  it('PrayerInput error message has role="alert" for screen reader announcement', async () => {
    const { PrayerInput } = await import('@/components/daily/PrayerInput')
    const user = userEvent.setup()
    render(
      <Providers>
        <PrayerInput onSubmit={vi.fn()} isLoading={false} />
      </Providers>,
    )

    await user.click(screen.getByRole('button', { name: /help me pray/i }))

    const errorAlert = screen.getByRole('alert')
    expect(errorAlert).toHaveTextContent(/tell god what/i)
  })
})
