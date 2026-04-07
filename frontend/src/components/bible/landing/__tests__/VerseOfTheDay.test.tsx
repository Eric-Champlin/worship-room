import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { VerseOfTheDay } from '../VerseOfTheDay'

vi.mock('@/lib/bible/votdSelector', () => ({
  getTodaysBibleVotd: () => ({
    reference: 'Psalms 23:1',
    book: 'Psalms',
    chapter: 23,
    verse: 1,
    text: 'Yahweh is my shepherd; I shall lack nothing.',
  }),
}))

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('VerseOfTheDay', () => {
  it('renders verse text', () => {
    renderWithRouter(<VerseOfTheDay />)
    expect(
      screen.getByText(/Yahweh is my shepherd; I shall lack nothing\./)
    ).toBeInTheDocument()
  })

  it('renders verse reference', () => {
    renderWithRouter(<VerseOfTheDay />)
    expect(screen.getByText('Psalms 23:1')).toBeInTheDocument()
  })

  it('renders "Verse of the Day" label', () => {
    renderWithRouter(<VerseOfTheDay />)
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
  })

  it('"Read in context" links to correct chapter', () => {
    renderWithRouter(<VerseOfTheDay />)
    const link = screen.getByText('Read in context').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/psalms/23')
  })

  it('share icon logs to console on click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    renderWithRouter(<VerseOfTheDay />)
    fireEvent.click(screen.getByLabelText('Share verse of the day'))
    expect(consoleSpy).toHaveBeenCalledWith('Share VOTD:', 'Psalms 23:1')
    consoleSpy.mockRestore()
  })

  it('share button has min 44px tap target', () => {
    renderWithRouter(<VerseOfTheDay />)
    const button = screen.getByLabelText('Share verse of the day')
    expect(button.className).toContain('min-h-[44px]')
    expect(button.className).toContain('min-w-[44px]')
  })
})
