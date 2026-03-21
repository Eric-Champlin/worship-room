import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrayerAnsweredCelebration } from '../PrayerAnsweredCelebration'

describe('PrayerAnsweredCelebration', () => {
  it('renders "Prayer Answered!" heading', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Healing for Mom"
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('Prayer Answered!')).toBeInTheDocument()
  })

  it('renders prayer title', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Healing for Mom"
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('Healing for Mom')).toBeInTheDocument()
  })

  it('renders testimony note when provided', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Healing for Mom"
        testimonyNote="God provided complete healing"
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('God provided complete healing')).toBeInTheDocument()
  })

  it('does not render testimony section when absent', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Healing for Mom"
        onDismiss={vi.fn()}
      />,
    )

    // Only 2 text elements: heading + title (no testimony)
    expect(screen.queryByText('God provided complete healing')).not.toBeInTheDocument()
  })

  it('dismiss button says "Praise God!"', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Test"
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText('Praise God!')).toBeInTheDocument()
  })

  it('calls onDismiss when button clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Test"
        onDismiss={onDismiss}
      />,
    )

    await user.click(screen.getByText('Praise God!'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('has dialog role and aria-modal', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Test"
        onDismiss={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'prayer-celebration-title')
  })

  it('confetti has motion-reduce:hidden class', () => {
    render(
      <PrayerAnsweredCelebration
        prayerTitle="Test"
        onDismiss={vi.fn()}
      />,
    )

    // Portal renders to document.body, not the test container
    const confettiSpans = document.body.querySelectorAll('.animate-confetti-fall')
    expect(confettiSpans.length).toBeGreaterThan(0)
    confettiSpans.forEach((span) => {
      expect(span.className).toContain('motion-reduce:hidden')
    })
  })
})
