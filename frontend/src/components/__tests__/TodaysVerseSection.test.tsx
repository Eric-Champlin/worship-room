import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TodaysVerseSection } from '../TodaysVerseSection'
import { ToastProvider } from '@/components/ui/Toast'

// Mock canvas generation
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

function renderSection() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <TodaysVerseSection />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('TodaysVerseSection', () => {
  it('renders verse text in blockquote', () => {
    renderSection()

    const blockquote = document.querySelector('blockquote')
    expect(blockquote).toBeInTheDocument()

    const verseText = blockquote?.querySelector('.font-serif.italic')
    expect(verseText).toBeInTheDocument()
    expect(verseText?.textContent).toBeTruthy()
  })

  it('renders verse reference in footer element', () => {
    renderSection()

    const footer = document.querySelector('blockquote footer')
    expect(footer).toBeInTheDocument()
    expect(footer?.textContent).toMatch(/^—/)
  })

  it('"Today\'s Verse" label is visible', () => {
    renderSection()

    expect(screen.getByText("Today's Verse")).toBeInTheDocument()
  })

  it('"Share this verse" button is present with aria attributes', () => {
    renderSection()

    const button = screen.getByText('Share this verse')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('share panel opens on CTA click', () => {
    renderSection()

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Share this verse'))

    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('section has aria-labelledby linked to heading', () => {
    renderSection()

    const section = document.querySelector('section[aria-labelledby="todays-verse-heading"]')
    expect(section).toBeInTheDocument()

    const heading = document.getElementById('todays-verse-heading')
    expect(heading).toBeInTheDocument()
    expect(heading?.textContent).toBe("Today's Verse")
  })
})
