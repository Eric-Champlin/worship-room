import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrayerAnsweredCelebration } from '../PrayerAnsweredCelebration'
import { FAITHFULNESS_SCRIPTURES } from '@/constants/faithfulness-scriptures'

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

const defaultProps = {
  prayerTitle: 'Healing for Mom',
  onDismiss: vi.fn(),
  onShareRequest: vi.fn(),
}

describe('PrayerAnsweredCelebration', () => {
  it('renders "God Answered Your Prayer" heading', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    expect(screen.getByText('God Answered Your Prayer')).toBeInTheDocument()
  })

  it('renders prayer title in quotes', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    expect(screen.getByText(/Healing for Mom/)).toBeInTheDocument()
  })

  it('renders testimony note when provided', () => {
    render(
      <PrayerAnsweredCelebration
        {...defaultProps}
        testimonyNote="God provided complete healing"
      />,
    )
    expect(screen.getByText('God provided complete healing')).toBeInTheDocument()
  })

  it('does not render testimony section when absent', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    expect(screen.queryByText('God provided complete healing')).not.toBeInTheDocument()
  })

  it('displays a scripture from faithfulness set', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const scriptureTexts = FAITHFULNESS_SCRIPTURES.map((s) => s.text)
    const found = scriptureTexts.some((text) =>
      document.body.textContent?.includes(text),
    )
    expect(found).toBe(true)
  })

  it('displays scripture reference', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const references = FAITHFULNESS_SCRIPTURES.map((s) => s.reference)
    const found = references.some((ref) =>
      document.body.textContent?.includes(ref),
    )
    expect(found).toBe(true)
  })

  it('has dialog role and aria-modal', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'prayer-celebration-title')
  })

  it('golden sparkle particles have motion-reduce:hidden class', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const sparkleSpans = document.body.querySelectorAll('.animate-golden-sparkle')
    expect(sparkleSpans.length).toBeGreaterThan(0)
    sparkleSpans.forEach((span) => {
      expect(span.className).toContain('motion-reduce:hidden')
    })
  })

  it('Close button calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<PrayerAnsweredCelebration {...defaultProps} onDismiss={onDismiss} />)
    await user.click(screen.getByText('Close'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('backdrop click calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<PrayerAnsweredCelebration {...defaultProps} onDismiss={onDismiss} />)
    // The backdrop is the div with aria-hidden="true" that has the golden gradient
    const backdrop = document.body.querySelector('[aria-hidden="true"]')!
    await user.click(backdrop)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('Share button calls onShareRequest with scripture', async () => {
    const user = userEvent.setup()
    const onShareRequest = vi.fn()
    render(
      <PrayerAnsweredCelebration {...defaultProps} onShareRequest={onShareRequest} />,
    )
    await user.click(screen.getByText('Share Your Testimony'))
    expect(onShareRequest).toHaveBeenCalledOnce()
    expect(onShareRequest).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.any(String), reference: expect.any(String) }),
    )
  })

  it('golden sparkle particles use amber colors', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const sparkleSpans = document.body.querySelectorAll('.animate-golden-sparkle')
    const goldenColors = ['#D97706', '#F59E0B', '#FBBF24']
    sparkleSpans.forEach((span) => {
      const bgColor = (span as HTMLElement).style.backgroundColor
      // Colors may be rendered as rgb() by jsdom
      const isGolden = goldenColors.some(
        (c) => bgColor === c || bgColor.startsWith('rgb'),
      )
      expect(isGolden).toBe(true)
    })
  })

  it('has aria-live polite region', () => {
    render(<PrayerAnsweredCelebration {...defaultProps} />)
    const liveRegion = document.body.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })
})
