import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navbar } from '@/components/Navbar'
import { AuthModal } from '@/components/prayer-wall/AuthModal'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// --- Mocks ---

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
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

// Return true so AuthModal calls onClose synchronously (without setTimeout)
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
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

beforeEach(() => {
  localStorage.clear()
})

function renderWithProviders(ui: React.ReactNode, initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          {ui}
          <Routes>
            <Route path="*" element={null} />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('BB-35 Keyboard Flows', () => {
  it('skip-to-content link is the first focusable element on Tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />)

    // Tab once from the document — first focus should land on skip link
    await user.tab()
    const focused = document.activeElement
    expect(focused).toHaveAttribute('href', '#main-content')
    expect(focused).toHaveTextContent('Skip to content')
  })

  it('Enter key activates a button', async () => {
    const handler = vi.fn()
    const user = userEvent.setup()
    render(<button onClick={handler}>Click me</button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    button.focus()
    await user.keyboard('{Enter}')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('Space key activates a button', async () => {
    const handler = vi.fn()
    const user = userEvent.setup()
    render(<button onClick={handler}>Press me</button>)

    const button = screen.getByRole('button', { name: 'Press me' })
    button.focus()
    await user.keyboard(' ')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('Escape closes the AuthModal', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <AuthModal isOpen={true} onClose={onClose} onShowToast={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Focus is auto-moved into the dialog by useFocusTrap
    // Escape is handled by the focus trap's keydown listener on the container
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('Tab navigates through form fields in sequence', async () => {
    const user = userEvent.setup()
    render(
      <form>
        <label htmlFor="f1">First</label>
        <input id="f1" type="text" />
        <label htmlFor="f2">Second</label>
        <input id="f2" type="text" />
        <label htmlFor="f3">Third</label>
        <input id="f3" type="text" />
      </form>,
    )

    const first = screen.getByLabelText('First')
    const second = screen.getByLabelText('Second')
    const third = screen.getByLabelText('Third')

    await user.tab()
    expect(document.activeElement).toBe(first)

    await user.tab()
    expect(document.activeElement).toBe(second)

    await user.tab()
    expect(document.activeElement).toBe(third)
  })

  it('AuthModal traps focus — Tab cycles within modal boundaries', async () => {
    const user = userEvent.setup()
    render(
      <AuthModal isOpen={true} onClose={vi.fn()} onShowToast={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog')
    // Gather all focusable elements within the dialog
    const focusable = within(dialog).queryAllByRole('button')
      .concat(within(dialog).queryAllByRole('textbox'))
      .concat(Array.from(dialog.querySelectorAll('input[type="password"], input[type="email"], a[href]')) as HTMLElement[])
    // Should have at least a close button and form fields
    expect(focusable.length).toBeGreaterThanOrEqual(2)

    // Tab many times — focus should never leave the dialog
    for (let i = 0; i < focusable.length + 3; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('focus returns to trigger element after modal close', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open Modal</button>
          {open && (
            <AuthModal
              isOpen={true}
              onClose={() => setOpen(false)}
              onShowToast={vi.fn()}
            />
          )}
        </>
      )
    }

    render(<TestHarness />)
    const trigger = screen.getByRole('button', { name: 'Open Modal' })

    // Focus trigger, then open modal
    trigger.focus()
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close via the modal Close button (X) — click it directly
    const closeBtn = screen.getByRole('button', { name: 'Close' })
    await user.click(closeBtn)

    // The useFocusTrap cleanup restores focus to previouslyFocused (the trigger)
    expect(document.activeElement).toBe(trigger)
  })

  it('toggle buttons respond to both Space and Enter', async () => {
    const user = userEvent.setup()
    const handler = vi.fn()
    render(
      <button aria-pressed="false" onClick={handler}>
        Toggle
      </button>,
    )

    const toggle = screen.getByRole('button', { name: 'Toggle' })
    toggle.focus()

    await user.keyboard('{Enter}')
    expect(handler).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('navbar links are keyboard accessible via Tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />)

    // Tab past skip link and into the navbar
    await user.tab() // skip link
    await user.tab() // first focusable nav element (logo link)

    // Keep tabbing — should reach at least one nav link with href
    let foundNavLink = false
    for (let i = 0; i < 10; i++) {
      await user.tab()
      const active = document.activeElement
      if (active?.tagName === 'A' && active.getAttribute('href')?.startsWith('/')) {
        foundNavLink = true
        break
      }
    }
    expect(foundNavLink).toBe(true)
  })

  it('AuthModal dialog has role="dialog" and aria-modal="true"', () => {
    render(
      <AuthModal isOpen={true} onClose={vi.fn()} onShowToast={vi.fn()} />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'auth-modal-title')
  })
})
