import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VerseOfTheDayCard } from '../VerseOfTheDayCard'
import { ToastProvider } from '@/components/ui/Toast'

// Mock canvas generation
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

function renderCard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <VerseOfTheDayCard />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('VerseOfTheDayCard', () => {
  it('renders verse text in Lora italic', () => {
    renderCard()

    // The verse text should be in the DOM with font-serif italic classes
    const verseElement = document.querySelector('.font-serif.italic')
    expect(verseElement).toBeInTheDocument()
    expect(verseElement?.textContent).toBeTruthy()
  })

  it('renders verse reference', () => {
    renderCard()

    // Reference is rendered with text-white/50 class
    const refElement = document.querySelector('.text-white\\/50')
    expect(refElement).toBeInTheDocument()
    expect(refElement?.textContent).toBeTruthy()
  })

  it('share button toggles share panel', () => {
    renderCard()

    // Panel should not be visible initially
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    // Click share button
    const shareButton = screen.getByLabelText('Share verse of the day')
    fireEvent.click(shareButton)

    // Panel should now be visible
    expect(screen.getByRole('menu')).toBeInTheDocument()

    // Click again to close
    fireEvent.click(shareButton)

    // Panel should be hidden
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('share button has correct aria attributes', () => {
    renderCard()

    const shareButton = screen.getByLabelText('Share verse of the day')
    expect(shareButton).toHaveAttribute('aria-haspopup', 'menu')
    expect(shareButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(shareButton)
    expect(shareButton).toHaveAttribute('aria-expanded', 'true')
  })
})
