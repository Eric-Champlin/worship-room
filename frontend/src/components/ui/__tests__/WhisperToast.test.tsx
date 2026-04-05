import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WhisperToastProvider } from '../WhisperToast'
import { useWhisperToast } from '@/hooks/useWhisperToast'

// ── Mocks ───────────────────────────────────────────────────────────
const mockPlaySoundEffect = vi.fn()

const mockReducedMotion = vi.hoisted(() => ({ value: false }))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion.value,
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

// ── Test helpers ────────────────────────────────────────────────────
function TestTrigger(props: {
  message?: string
  highlightedText?: string
  closingMessage?: string
  ctaLabel?: string
  ctaTo?: string
  duration?: number
  soundId?: 'whisper' | 'sparkle' | 'chime'
}) {
  const { showWhisperToast } = useWhisperToast()
  return (
    <button
      onClick={() =>
        showWhisperToast({
          message: props.message ?? 'Test message',
          highlightedText: props.highlightedText,
          closingMessage: props.closingMessage,
          ctaLabel: props.ctaLabel,
          ctaTo: props.ctaTo,
          duration: props.duration,
          soundId: props.soundId,
        })
      }
    >
      Show Toast
    </button>
  )
}

function renderWithProvider(triggerProps?: Parameters<typeof TestTrigger>[0]) {
  return render(
    <MemoryRouter>
      <WhisperToastProvider>
        <TestTrigger {...triggerProps} />
      </WhisperToastProvider>
    </MemoryRouter>,
  )
}

// ── Tests ───────────────────────────────────────────────────────────
describe('WhisperToast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockReducedMotion.value = false
    mockPlaySoundEffect.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders message text in Lora italic', async () => {
    renderWithProvider({ message: 'Your journey continues' })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    const toast = screen.getByTestId('whisper-toast')
    expect(toast).toBeInTheDocument()
    const msg = screen.getByText('Your journey continues')
    expect(msg.className).toContain('font-serif')
    expect(msg.className).toContain('italic')
  })

  it('renders highlighted text in blockquote', async () => {
    renderWithProvider({ highlightedText: 'Psalm 23:1' })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    const blockquote = screen.getByText(/Psalm 23:1/)
    expect(blockquote.tagName).toBe('BLOCKQUOTE')
  })

  it('renders closing message when provided', async () => {
    renderWithProvider({ closingMessage: "Isn't it beautiful to look back?" })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByText("Isn't it beautiful to look back?")).toBeInTheDocument()
  })

  it('renders CTA link when provided', async () => {
    renderWithProvider({ ctaLabel: 'Listen to sleep sounds', ctaTo: '/music?tab=sleep' })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    const link = screen.getByText('Listen to sleep sounds')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/music?tab=sleep')
  })

  it('auto-dismisses after duration', async () => {
    renderWithProvider({ duration: 1000 })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByTestId('whisper-toast')).toBeInTheDocument()

    // Advance past duration + exit animation
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('whisper-toast')).not.toBeInTheDocument()
  })

  it('dismisses on click/tap', async () => {
    renderWithProvider()
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByTestId('whisper-toast')).toBeInTheDocument()

    await act(async () => {
      screen.getByTestId('whisper-toast').click()
    })
    // Wait for exit animation
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('whisper-toast')).not.toBeInTheDocument()
  })

  it('respects prefers-reduced-motion', async () => {
    mockReducedMotion.value = true
    renderWithProvider()
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    const toast = screen.getByTestId('whisper-toast')
    // Reduced motion: no translate-y-4, uses duration-100
    expect(toast.className).toContain('duration-100')
  })

  it('only shows one toast at a time', async () => {
    const TestMultiple = () => {
      const { showWhisperToast } = useWhisperToast()
      return (
        <>
          <button onClick={() => showWhisperToast({ message: 'First' })}>First</button>
          <button onClick={() => showWhisperToast({ message: 'Second' })}>Second</button>
        </>
      )
    }
    render(
      <MemoryRouter>
        <WhisperToastProvider>
          <TestMultiple />
        </WhisperToastProvider>
      </MemoryRouter>,
    )

    await act(async () => {
      screen.getByText('First').click()
    })
    expect(screen.getByText('First', { selector: 'p' })).toBeInTheDocument()

    await act(async () => {
      screen.getByText('Second').click()
    })
    expect(screen.queryByText('First', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.getByText('Second', { selector: 'p' })).toBeInTheDocument()
  })

  it('plays sound effect when soundId provided', async () => {
    renderWithProvider({ soundId: 'whisper' })
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('whisper')
  })

  it('does not play sound when no soundId', async () => {
    renderWithProvider()
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(mockPlaySoundEffect).not.toHaveBeenCalled()
  })

  it('uses default 6000ms duration', async () => {
    renderWithProvider()
    await act(async () => {
      screen.getByText('Show Toast').click()
    })
    expect(screen.getByTestId('whisper-toast')).toBeInTheDocument()

    // Not dismissed at 5s
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('whisper-toast')).toBeInTheDocument()

    // Dismissed at 6s + exit
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByTestId('whisper-toast')).not.toBeInTheDocument()
  })
})
