import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScriptureTextPanel } from '../ScriptureTextPanel'

const SAMPLE_TEXT =
  'Yahweh is my shepherd:\nI shall lack nothing.\nHe makes me lie down in green pastures.\nHe leads me beside still waters.'

describe('ScriptureTextPanel', () => {
  it('renders all verse paragraphs from webText', () => {
    render(
      <ScriptureTextPanel webText={SAMPLE_TEXT} currentPosition={0} duration={300} />,
    )

    expect(screen.getByText('Yahweh is my shepherd:')).toBeInTheDocument()
    expect(screen.getByText('I shall lack nothing.')).toBeInTheDocument()
    expect(
      screen.getByText('He makes me lie down in green pastures.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('He leads me beside still waters.'),
    ).toBeInTheDocument()
  })

  it('highlights estimated current verse based on position/duration', () => {
    // 4 verses, position at 50% should highlight verse 2 (index 2)
    const { container } = render(
      <ScriptureTextPanel webText={SAMPLE_TEXT} currentPosition={150} duration={300} />,
    )

    const verses = container.querySelectorAll('p')
    // 50% of 4 verses = floor(2) = index 2
    expect(verses[2]).toHaveClass('border-primary')
    expect(verses[0]).not.toHaveClass('border-primary')
  })

  it('has role="region" and aria-label="Scripture text"', () => {
    render(
      <ScriptureTextPanel webText={SAMPLE_TEXT} currentPosition={0} duration={300} />,
    )

    const panel = screen.getByRole('region', { name: 'Scripture text' })
    expect(panel).toBeInTheDocument()
  })
})
