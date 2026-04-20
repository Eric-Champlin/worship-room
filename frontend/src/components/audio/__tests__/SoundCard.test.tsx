import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoundCard } from '../SoundCard'
import { SOUND_CATEGORY_COLORS } from '@/constants/soundCategoryColors'
import type { Sound } from '@/types/music'

const NATURE_TOKENS = SOUND_CATEGORY_COLORS.nature
const SPIRITUAL_TOKENS = SOUND_CATEGORY_COLORS.spiritual

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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.querySelector('.motion-safe\\:animate-spin')).toBeInTheDocument()
  })

  it('shows orange error dot when hasError=true and not loading', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={true}
        onToggle={() => {}}
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
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
        categoryTokens={NATURE_TOKENS}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('motion-safe:animate-sound-pulse')
  })

  it('applies category-themed inactive tile styles (Nature = emerald)', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={false}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
        categoryTokens={NATURE_TOKENS}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-emerald-500/[0.08]')
    expect(btn.className).toContain('border-emerald-400/20')
  })

  it('applies category-themed active glow (Nature = emerald shadow)', () => {
    render(
      <SoundCard
        sound={TEST_SOUND}
        isActive={true}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
        categoryTokens={NATURE_TOKENS}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('shadow-[0_0_16px_rgba(52,211,153,0.45)]')
  })

  it('different category produces different active glow (Spiritual = violet)', () => {
    render(
      <SoundCard
        sound={{ ...TEST_SOUND, id: 'choir-hum', category: 'spiritual' }}
        isActive={true}
        isLoading={false}
        hasError={false}
        onToggle={() => {}}
        categoryTokens={SPIRITUAL_TOKENS}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('shadow-[0_0_16px_rgba(167,139,250,0.45)]')
    expect(btn.className).not.toContain('rgba(52,211,153')
  })
})
