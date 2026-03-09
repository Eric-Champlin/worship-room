import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ScriptureSessionCard } from '../ScriptureSessionCard'
import type { ScriptureReading } from '@/types/music'

const MOCK_READING: ScriptureReading = {
  id: 'psalm-23',
  title: 'The Lord is My Shepherd',
  scriptureReference: 'Psalm 23',
  collectionId: 'psalms-of-peace',
  webText: 'Yahweh is my shepherd.',
  audioFilename: 'scripture/psalm-23.mp3',
  durationSeconds: 300,
  voiceId: 'male',
  tags: ['peace'],
}

describe('ScriptureSessionCard', () => {
  it('renders title, reference, duration, and Scripture badge', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    expect(screen.getByText('The Lord is My Shepherd')).toBeInTheDocument()
    expect(screen.getByText('Psalm 23')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
    expect(screen.getByText('Scripture')).toBeInTheDocument()
  })

  it('has correct aria-label with reference, title, duration, and voice', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)

    expect(
      screen.getByRole('button', {
        name: 'Play Psalm 23: The Lord is My Shepherd, 5 min, male voice',
      }),
    ).toBeInTheDocument()
  })

  it('calls onPlay when card is clicked', async () => {
    const onPlay = vi.fn()
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={onPlay} />)

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Play Psalm 23: The Lord is My Shepherd, 5 min, male voice',
      }),
    )
    expect(onPlay).toHaveBeenCalledWith(MOCK_READING)
  })

  it('shows voice gender indicator', () => {
    render(<ScriptureSessionCard reading={MOCK_READING} onPlay={vi.fn()} />)
    expect(screen.getByText('Male voice')).toBeInTheDocument()
  })
})
