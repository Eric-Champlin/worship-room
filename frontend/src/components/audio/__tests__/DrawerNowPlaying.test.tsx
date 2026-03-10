import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DrawerNowPlaying } from '../DrawerNowPlaying'
import type { AudioState } from '@/types/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockDispatch = vi.fn()

let mockState: AudioState = {
  activeSounds: [],
  foregroundContent: null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.5,
  isPlaying: false,
  sleepTimer: null,
  activeRoutine: null,
  pillVisible: true,
  drawerOpen: true,
  currentSceneName: null,
  currentSceneId: null,
}

vi.mock('../AudioProvider', () => ({
  useAudioState: () => mockState,
  useAudioDispatch: () => mockDispatch,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: false }),
}))

vi.mock('@/hooks/useSavedMixes', () => ({
  useSavedMixes: () => ({
    mixes: [],
    saveMix: vi.fn(),
    updateName: vi.fn(),
    deleteMix: vi.fn(),
    duplicateMix: vi.fn(),
  }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('DrawerNowPlaying', () => {
  it('shows gradient placeholder when no scene is active', () => {
    mockState = { ...mockState, currentSceneName: null }
    const { container } = render(<DrawerNowPlaying />)

    // Gradient placeholder div should be present (no <img>)
    const gradientDiv = container.querySelector('.bg-gradient-to-br')
    expect(gradientDiv).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('shows scene artwork when scene is active', () => {
    mockState = { ...mockState, currentSceneName: 'Garden of Gethsemane' }
    const { container } = render(<DrawerNowPlaying />)

    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img?.getAttribute('src')).toContain('garden-of-gethsemane.svg')
    // Gradient placeholder should NOT be present
    expect(container.querySelector('.bg-gradient-to-br')).not.toBeInTheDocument()
  })

  it('applies drift animation class for drift scenes', () => {
    // Still Waters has animationCategory: 'drift'
    mockState = { ...mockState, currentSceneName: 'Still Waters' }
    const { container } = render(<DrawerNowPlaying />)

    const img = container.querySelector('img')
    expect(img?.className).toContain('animate-artwork-drift')
  })

  it('applies pulse animation class for pulse scenes', () => {
    // Garden of Gethsemane has animationCategory: 'pulse'
    mockState = { ...mockState, currentSceneName: 'Garden of Gethsemane' }
    const { container } = render(<DrawerNowPlaying />)

    const img = container.querySelector('img')
    expect(img?.className).toContain('animate-scene-pulse')
  })

  it('applies glow animation class for glow scenes', () => {
    // The Upper Room has animationCategory: 'glow'
    mockState = { ...mockState, currentSceneName: 'The Upper Room' }
    const { container } = render(<DrawerNowPlaying />)

    const img = container.querySelector('img')
    expect(img?.className).toContain('animate-scene-glow')
  })
})
