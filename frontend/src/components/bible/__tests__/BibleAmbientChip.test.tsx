import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleAmbientChip } from '../BibleAmbientChip'

// --- Mock Audio Provider ---
const mockAudioState = {
  activeSounds: [] as { soundId: string; volume: number; label: string; url: string }[],
  masterVolume: 0.8,
  isPlaying: false,
  pillVisible: false,
  drawerOpen: false,
  currentSceneName: null as string | null,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null,
}

const mockDispatch = vi.fn()

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
}))

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

function renderChip() {
  return render(
    <MemoryRouter>
      <BibleAmbientChip />
    </MemoryRouter>,
  )
}

describe('BibleAmbientChip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAudioState.activeSounds = []
    mockAudioState.pillVisible = false
    mockAudioState.currentSceneName = null
    mockAudioState.drawerOpen = false
  })

  it('renders "Add background sounds" when no audio', () => {
    renderChip()
    expect(screen.getByText('Add background sounds')).toBeInTheDocument()
  })

  it('shows suggestion panel on click', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    expect(screen.getByRole('region', { name: 'Ambient sound suggestions' })).toBeInTheDocument()
  })

  it('shows 3 scene cards in panel', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    expect(screen.getByLabelText('Peaceful Study')).toBeInTheDocument()
    expect(screen.getByLabelText('Evening Scripture')).toBeInTheDocument()
    expect(screen.getByLabelText('Sacred Space')).toBeInTheDocument()
  })

  it('panel collapses on Escape', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    expect(screen.getByRole('region')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('panel toggles closed on pill re-click', async () => {
    const user = userEvent.setup()
    renderChip()

    // Open
    await user.click(screen.getByLabelText('Add background sounds'))
    expect(screen.getByRole('region')).toBeInTheDocument()

    // Close by clicking pill again (toggle)
    await user.click(screen.getByLabelText('Add background sounds'))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('shows "Playing: [scene]" when audio active', () => {
    mockAudioState.activeSounds = [{ soundId: 's1', volume: 0.5, label: 'Rain', url: '' }]
    mockAudioState.pillVisible = true
    mockAudioState.currentSceneName = 'Still Waters'

    renderChip()
    expect(screen.getByText('Playing: Still Waters')).toBeInTheDocument()
  })

  it('opens AudioDrawer when audio playing and chip clicked', async () => {
    const user = userEvent.setup()
    mockAudioState.activeSounds = [{ soundId: 's1', volume: 0.5, label: 'Rain', url: '' }]
    mockAudioState.pillVisible = true
    mockAudioState.currentSceneName = 'Still Waters'

    renderChip()
    await user.click(screen.getByLabelText(/Playing: Still Waters/))

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
  })

  it('waveform bars render when audio playing', () => {
    mockAudioState.activeSounds = [{ soundId: 's1', volume: 0.5, label: 'Rain', url: '' }]
    mockAudioState.pillVisible = true

    renderChip()
    // Waveform bars are 3 spans inside a container
    const waveformContainer = screen.getByRole('button').querySelector('[aria-hidden="true"]')
    expect(waveformContainer).toBeInTheDocument()
    expect(waveformContainer?.children.length).toBe(3)
  })

  it('"Browse all sounds" link points to /music?tab=ambient', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    const link = screen.getByText(/Browse all sounds/)
    expect(link).toHaveAttribute('href', '/music?tab=ambient')
  })

  it('has correct ARIA attributes', () => {
    renderChip()
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'bible-ambient-panel')
    expect(button).toHaveAttribute('aria-label', 'Add background sounds')
  })

  it('aria-expanded is true when panel is open', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    // The pill button should now have aria-expanded=true
    const pillButton = screen.getByLabelText('Add background sounds')
    expect(pillButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('scene card click calls loadScene', async () => {
    const user = userEvent.setup()
    renderChip()

    await user.click(screen.getByLabelText('Add background sounds'))
    await user.click(screen.getByLabelText('Peaceful Study'))

    expect(mockLoadScene).toHaveBeenCalledTimes(1)
    expect(mockLoadScene.mock.calls[0][0]).toHaveProperty('id', 'peaceful-study')
  })
})
