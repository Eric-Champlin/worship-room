import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoundCard } from '../SoundCard'
import type { Sound } from '@/types/music'

const TEST_SOUND: Sound = {
  id: 'gentle-rain',
  name: 'Gentle Rain',
  category: 'nature',
  lucideIcon: 'CloudRain',
  filename: 'rain-gentle.mp3',
  loopDurationMs: 240_000,
  tags: { mood: ['peaceful'], activity: ['relaxation'], intensity: 'very_calm' },
}

describe('SoundCard', () => {
  it('renders sound name and icon in inactive state', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Gentle Rain')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows aria-pressed="false" when inactive, "true" when active', () => {
    const { rerender } = render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(
      <SoundCard
        sound={TEST_SOUND}
        isActive={true}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows loading spinner when isLoading=true', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={true}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    // Loader2 renders with animate-spin class
    const btn = screen.getByRole('button')
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows orange error dot when hasError=true and not loading', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={true}
        onToggle={() => {}}
      />,
    )
    const dot = screen.getByRole('button').querySelector('.bg-warning')
    expect(dot).toBeInTheDocument()
  })

  it('calls onToggle with sound when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={false}
        onToggle={onToggle}
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith(TEST_SOUND)
  })

  it('has correct aria-label for each state', () => {
    const { rerender } = render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Gentle Rain — tap to add to mix',
    )

    rerender(
      <SoundCard
        sound={TEST_SOUND}
        isActive={true}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Gentle Rain — playing, tap to remove',
    )

    rerender(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={true}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Loading Gentle Rain',
    )

    rerender(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={true}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      "Couldn't load Gentle Rain — tap to retry",
    )
  })

  it('has aria-busy="true" when loading', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={true}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('active state applies sound-pulse animation class with motion-safe prefix', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={true}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('motion-safe:animate-sound-pulse')
  })
})
