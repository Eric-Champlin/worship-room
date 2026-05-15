import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GentleExtrasSection } from '../GentleExtrasSection'

function renderSection(
  overrides: { verseEnabled?: boolean; presenceOptedOut?: boolean } = {},
) {
  const onUpdateVerseFindsYou = vi.fn()
  const onUpdatePresence = vi.fn()
  render(
    <GentleExtrasSection
      verseFindsYou={{ enabled: overrides.verseEnabled ?? false }}
      onUpdateVerseFindsYou={onUpdateVerseFindsYou}
      presence={{ optedOut: overrides.presenceOptedOut ?? false }}
      onUpdatePresence={onUpdatePresence}
    />,
  )
  return { onUpdateVerseFindsYou, onUpdatePresence }
}

describe('GentleExtrasSection — Spec 6.11b presence toggle', () => {
  it('renders both toggle switches', () => {
    renderSection()
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(2)
  })

  it('presence toggle aria-checked=true when optedOut=false (counted)', () => {
    renderSection({ presenceOptedOut: false })
    const presenceToggle = screen.getByRole('switch', { name: /Count me as present when I'm reading/i })
    expect(presenceToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('presence toggle aria-checked=false when optedOut=true (hidden)', () => {
    renderSection({ presenceOptedOut: true })
    const presenceToggle = screen.getByRole('switch', { name: /Count me as present when I'm reading/i })
    expect(presenceToggle).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking presence toggle when counted fires onUpdatePresence({ optedOut: true })', async () => {
    const user = userEvent.setup()
    const { onUpdatePresence } = renderSection({ presenceOptedOut: false })
    const presenceToggle = screen.getByRole('switch', { name: /Count me as present when I'm reading/i })
    await user.click(presenceToggle)
    expect(onUpdatePresence).toHaveBeenCalledWith({ optedOut: true })
  })

  it('clicking presence toggle when hidden fires onUpdatePresence({ optedOut: false })', async () => {
    const user = userEvent.setup()
    const { onUpdatePresence } = renderSection({ presenceOptedOut: true })
    const presenceToggle = screen.getByRole('switch', { name: /Count me as present when I'm reading/i })
    await user.click(presenceToggle)
    expect(onUpdatePresence).toHaveBeenCalledWith({ optedOut: false })
  })

  it('renders the canonical presence toggle label', () => {
    renderSection()
    expect(
      screen.getByText(/Count me as present when I'm reading/i),
    ).toBeInTheDocument()
  })

  it('renders the canonical presence helper text', () => {
    renderSection()
    expect(
      screen.getByText(
        /Others see how many people are on the Prayer Wall\. Turn this off to hide yourself from the count\./i,
      ),
    ).toBeInTheDocument()
  })
})
