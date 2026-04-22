import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ReaderChrome } from '../ReaderChrome'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { createRef } from 'react'

// BB-26 / Spec 4: AudioPlayButton mounts inside ReaderChrome. Stub readiness
// to false so the button stays null and doesn't disturb existing ReaderChrome tests.
vi.mock('@/services/fcbh-readiness', () => ({
  getFcbhReadiness: () => Promise.resolve(false),
  resetFcbhReadinessCache: () => {},
}))
vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(),
}))
vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))
// BB-27 — AudioPlayerProvider requires AudioProvider; mock its deps
vi.mock('@/lib/audio-engine', () => {
  class MockAudioEngineService {
    ensureContext = vi.fn(); addSound = vi.fn().mockResolvedValue(undefined)
    removeSound = vi.fn(); setSoundVolume = vi.fn(); setMasterVolume = vi.fn()
    playForeground = vi.fn(); seekForeground = vi.fn(); setForegroundBalance = vi.fn()
    pauseAll = vi.fn(); resumeAll = vi.fn(); stopAll = vi.fn()
    getSoundCount = vi.fn(() => 0); getForegroundElement = vi.fn(() => null)
  }
  return { AudioEngineService: MockAudioEngineService }
})
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

function renderChrome(props?: Partial<Parameters<typeof ReaderChrome>[0]>) {
  const aaRef = createRef<HTMLButtonElement>()
  const audioButtonRef = createRef<HTMLButtonElement>()
  return render(
    <MemoryRouter>
      <AudioProvider>
      <AudioPlayerProvider>
      <BibleDrawerProvider>
        <ReaderChrome
          bookName="John"
          bookSlug="john"
          chapter={3}
          onTypographyToggle={props?.onTypographyToggle ?? vi.fn()}
          isTypographyOpen={props?.isTypographyOpen ?? false}
          aaRef={aaRef as React.RefObject<HTMLButtonElement | null>}
          chromeOpacity={props?.chromeOpacity ?? 1}
          chromePointerEvents={props?.chromePointerEvents ?? 'auto'}
          chromeTransitionMs={props?.chromeTransitionMs ?? 200}
          focusEnabled={props?.focusEnabled ?? false}
          onFocusEnabledToggle={props?.onFocusEnabledToggle ?? vi.fn()}
          ambientAudioVisible={props?.ambientAudioVisible ?? true}
          isAudioPlaying={props?.isAudioPlaying ?? false}
          onAudioToggle={props?.onAudioToggle ?? vi.fn()}
          audioButtonRef={audioButtonRef as React.RefObject<HTMLButtonElement | null>}
          isAudioPickerOpen={props?.isAudioPickerOpen ?? false}
          reducedMotion={props?.reducedMotion ?? false}
        />
      </BibleDrawerProvider>
      </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
}

describe('ReaderChrome', () => {
  it('renders all 5 interactive elements with correct aria-labels', () => {
    renderChrome()

    expect(screen.getByLabelText('Back to Study Bible')).toBeTruthy()
    expect(screen.getByLabelText('Open chapter picker')).toBeTruthy()
    expect(screen.getByLabelText('Typography settings')).toBeTruthy()
    // BB-52: focus toggle aria-label reflects state (Eye/EyeOff icon swap)
    expect(screen.getByLabelText('Enable focus mode (auto-hide toolbar)')).toBeTruthy()
    expect(screen.getByLabelText('Browse books')).toBeTruthy()
  })

  it('back button links to /bible', () => {
    renderChrome()

    const backLink = screen.getByLabelText('Back to Study Bible')
    expect(backLink.getAttribute('href')).toBe('/bible')
  })

  it('center label shows book name and chapter', () => {
    renderChrome()

    const label = screen.getByLabelText('Open chapter picker')
    expect(label.textContent).toContain('John')
    expect(label.textContent).toContain('3')
  })

  it('Aa button calls typography toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderChrome({ onTypographyToggle: onToggle })

    await user.click(screen.getByLabelText('Typography settings'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('all icon buttons have 44px minimum size', () => {
    renderChrome()

    const backBtn = screen.getByLabelText('Back to Study Bible')
    expect(backBtn.className).toContain('min-h-[44px]')
    expect(backBtn.className).toContain('min-w-[44px]')

    const aaBtn = screen.getByLabelText('Typography settings')
    expect(aaBtn.className).toContain('min-h-[44px]')
    expect(aaBtn.className).toContain('min-w-[44px]')

    const booksBtn = screen.getByLabelText('Browse books')
    expect(booksBtn.className).toContain('min-h-[44px]')
    expect(booksBtn.className).toContain('min-w-[44px]')
  })

  it('Aa button has correct aria-expanded when open', () => {
    renderChrome({ isTypographyOpen: true })

    const aaBtn = screen.getByLabelText('Typography settings')
    expect(aaBtn.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders focus toggle between Aa and Books', () => {
    renderChrome()

    const buttons = screen.getAllByRole('button')
    const aaIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Typography settings',
    )
    const focusIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Enable focus mode (auto-hide toolbar)',
    )
    const booksIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Browse books',
    )

    expect(focusIndex).toBeGreaterThan(aaIndex)
    expect(focusIndex).toBeLessThan(booksIndex)
  })

  it('focus toggle calls onFocusEnabledToggle', async () => {
    const user = userEvent.setup()
    const onFocusEnabledToggle = vi.fn()
    renderChrome({ onFocusEnabledToggle })

    await user.click(screen.getByLabelText('Enable focus mode (auto-hide toolbar)'))
    expect(onFocusEnabledToggle).toHaveBeenCalledOnce()
  })

  it('focus toggle aria-label and aria-pressed reflect state', () => {
    // When disabled (default): label says "Enable", pressed=false
    const { rerender } = renderChrome({ focusEnabled: false })
    const offBtn = screen.getByLabelText('Enable focus mode (auto-hide toolbar)')
    expect(offBtn.getAttribute('aria-pressed')).toBe('false')

    // When enabled: label says "Disable", pressed=true
    rerender(
      <MemoryRouter>
        <AudioProvider>
          <AudioPlayerProvider>
            <BibleDrawerProvider>
              <ReaderChrome
                bookName="John"
                bookSlug="john"
                chapter={3}
                onTypographyToggle={vi.fn()}
                isTypographyOpen={false}
                aaRef={createRef<HTMLButtonElement>() as React.RefObject<HTMLButtonElement | null>}
                chromeOpacity={1}
                chromePointerEvents="auto"
                chromeTransitionMs={200}
                focusEnabled={true}
                onFocusEnabledToggle={vi.fn()}
                ambientAudioVisible={true}
                isAudioPlaying={false}
                onAudioToggle={vi.fn()}
                audioButtonRef={createRef<HTMLButtonElement>() as React.RefObject<HTMLButtonElement | null>}
                isAudioPickerOpen={false}
                reducedMotion={false}
              />
            </BibleDrawerProvider>
          </AudioPlayerProvider>
        </AudioProvider>
      </MemoryRouter>,
    )
    const onBtn = screen.getByLabelText('Disable focus mode (keep toolbar visible)')
    expect(onBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('applies chromeOpacity and pointerEvents from props', () => {
    const { container } = renderChrome({
      chromeOpacity: 0,
      chromePointerEvents: 'none',
    })

    const chromeDiv = container.firstElementChild as HTMLElement
    expect(chromeDiv.style.opacity).toBe('0')
    expect(chromeDiv.style.pointerEvents).toBe('none')
  })

  it('applies transition duration from chromeTransitionMs', () => {
    const { container } = renderChrome({ chromeTransitionMs: 600 })

    const chromeDiv = container.firstElementChild as HTMLElement
    expect(chromeDiv.style.transition).toContain('600ms')
  })

  // --- BB-20: Ambient audio control ---

  it('audio icon renders when ambientAudioVisible is true', () => {
    renderChrome({ ambientAudioVisible: true })
    expect(screen.getByLabelText('Open ambient sounds')).toBeTruthy()
  })

  it('audio icon hidden when ambientAudioVisible is false', () => {
    renderChrome({ ambientAudioVisible: false })
    expect(screen.queryByLabelText('Open ambient sounds')).toBeNull()
    expect(screen.queryByLabelText(/Ambient audio playing/)).toBeNull()
  })

  it('audio icon at reduced opacity when no audio playing', () => {
    renderChrome({ isAudioPlaying: false })
    const svg = screen.getByLabelText('Open ambient sounds').querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('opacity-50')
  })

  it('audio icon at full opacity when audio playing', () => {
    renderChrome({ isAudioPlaying: true, reducedMotion: false })
    const svg = screen.getByLabelText(/Ambient audio playing/).querySelector('svg')!
    expect(svg.getAttribute('class')).not.toContain('opacity-50')
    expect(svg.getAttribute('class')).toContain('text-white')
  })

  it('pulse animation when audio playing and motion not reduced', () => {
    renderChrome({ isAudioPlaying: true, reducedMotion: false })
    const btn = screen.getByLabelText(/Ambient audio playing/)
    const pulseSpan = btn.querySelector('span[aria-hidden="true"]')
    expect(pulseSpan).toBeTruthy()
    expect(pulseSpan!.className).toContain('animate-audio-pulse')
  })

  it('no pulse animation when reduced motion', () => {
    renderChrome({ isAudioPlaying: true, reducedMotion: true })
    const btn = screen.getByLabelText(/Ambient audio playing/)
    const pulseSpan = btn.querySelector('span[aria-hidden="true"]')
    expect(pulseSpan).toBeNull()
  })

  it('reduced motion uses text-primary-lt on icon', () => {
    renderChrome({ isAudioPlaying: true, reducedMotion: true })
    const svg = screen.getByLabelText(/Ambient audio playing/).querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('text-primary-lt')
  })

  it('clicking audio icon calls onAudioToggle', async () => {
    const user = userEvent.setup()
    const onAudioToggle = vi.fn()
    renderChrome({ onAudioToggle })

    await user.click(screen.getByLabelText('Open ambient sounds'))
    expect(onAudioToggle).toHaveBeenCalledOnce()
  })

  it('audio button has correct aria-expanded when picker open', () => {
    renderChrome({ isAudioPickerOpen: true })
    const btn = screen.getByLabelText('Open ambient sounds')
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('audio icon positioned between Aa and Focus buttons', () => {
    renderChrome({ ambientAudioVisible: true })
    const buttons = screen.getAllByRole('button')
    const aaIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Typography settings',
    )
    const audioIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Open ambient sounds',
    )
    const focusIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Enable focus mode (auto-hide toolbar)',
    )

    expect(audioIndex).toBeGreaterThan(aaIndex)
    expect(audioIndex).toBeLessThan(focusIndex)
  })

  it('audio icon has 44px minimum size', () => {
    renderChrome({ ambientAudioVisible: true })
    const audioBtn = screen.getByLabelText('Open ambient sounds')
    expect(audioBtn.className).toContain('min-h-[44px]')
    expect(audioBtn.className).toContain('min-w-[44px]')
  })

  it('chapter selector is positioned in right cluster, precedes Typography button', () => {
    renderChrome()
    const buttons = screen.getAllByRole('button')
    const chapterIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Open chapter picker',
    )
    const aaIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Typography settings',
    )
    expect(chapterIndex).toBeGreaterThanOrEqual(0)
    expect(aaIndex).toBeGreaterThan(chapterIndex)
  })

  it('chapter selector click opens chapter drawer', async () => {
    const user = userEvent.setup()
    renderChrome()
    const chapterBtn = screen.getByLabelText('Open chapter picker')
    // Should not throw — drawer action wires correctly
    await user.click(chapterBtn)
  })
})
