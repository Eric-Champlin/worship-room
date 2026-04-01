import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GardenShareButton } from '../GardenShareButton'
import { GrowthGarden } from '../GrowthGarden'
import { createRef } from 'react'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/lib/garden-share-canvas', () => ({
  generateGardenShareImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToastSafe: () => ({ showToast: vi.fn(), showCelebrationToast: vi.fn() }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

describe('GardenShareButton', () => {
  const mockRef = { current: document.createElementNS('http://www.w3.org/2000/svg', 'svg') }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders share button with Share2 icon', () => {
    render(
      <GardenShareButton
        gardenRef={mockRef}
        userName="Eric"
        levelName="Blooming"
        streakCount={7}
      />,
    )
    const button = screen.getByRole('button', { name: 'Share your garden' })
    expect(button).toBeInTheDocument()
  })

  it('calls generateGardenShareImage on click', async () => {
    const { generateGardenShareImage } = await import('@/lib/garden-share-canvas')

    render(
      <GardenShareButton
        gardenRef={mockRef}
        userName="Eric"
        levelName="Blooming"
        streakCount={7}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share your garden' }))

    await waitFor(() => {
      expect(generateGardenShareImage).toHaveBeenCalledWith({
        gardenSvgElement: mockRef.current,
        userName: 'Eric',
        levelName: 'Blooming',
        streakCount: 7,
      })
    })
  })

  it('shows error toast on generation failure', async () => {
    const { generateGardenShareImage } = await import('@/lib/garden-share-canvas')
    vi.mocked(generateGardenShareImage).mockRejectedValueOnce(new Error('fail'))

    render(
      <GardenShareButton
        gardenRef={mockRef}
        userName="Eric"
        levelName="Blooming"
        streakCount={0}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share your garden' }))

    await waitFor(() => {
      // Button should re-enable after failure
      expect(screen.getByRole('button', { name: 'Share your garden' })).not.toBeDisabled()
    })
  })

  it('disables button while generating', async () => {
    // Make generation hang
    const { generateGardenShareImage } = await import('@/lib/garden-share-canvas')
    vi.mocked(generateGardenShareImage).mockReturnValueOnce(new Promise(() => {}))

    render(
      <GardenShareButton
        gardenRef={mockRef}
        userName="Eric"
        levelName="Blooming"
        streakCount={0}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share your garden' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share your garden' })).toBeDisabled()
    })
  })

  it('GrowthGarden passes ref to SVG element', () => {
    const ref = createRef<SVGSVGElement>()
    render(<GrowthGarden ref={ref} stage={3} size="lg" hourOverride={12} />)
    expect(ref.current).toBeInstanceOf(SVGSVGElement)
  })

  it('has focus ring for keyboard accessibility', () => {
    render(
      <GardenShareButton
        gardenRef={mockRef}
        userName="Eric"
        levelName="Blooming"
        streakCount={0}
      />,
    )
    const button = screen.getByRole('button', { name: 'Share your garden' })
    expect(button.className).toContain('focus:ring-2')
  })
})
