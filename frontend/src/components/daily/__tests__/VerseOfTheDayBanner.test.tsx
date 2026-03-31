import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VerseOfTheDayBanner } from '../VerseOfTheDayBanner'
import { ToastProvider } from '@/components/ui/Toast'

// Mock canvas generation
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

function renderBanner() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <VerseOfTheDayBanner />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('VerseOfTheDayBanner', () => {
  it('renders verse text in Lora italic', () => {
    renderBanner()

    const verseElement = document.querySelector('.font-serif.italic')
    expect(verseElement).toBeInTheDocument()
    expect(verseElement?.textContent).toBeTruthy()
  })

  it('renders verse reference', () => {
    renderBanner()

    // Reference has a dash prefix
    const refElements = screen.getAllByText(/^—/)
    expect(refElements.length).toBeGreaterThan(0)
  })

  it('share icon button is present with aria-label', () => {
    renderBanner()

    const shareButton = screen.getByLabelText('Share verse of the day')
    expect(shareButton).toBeInTheDocument()
    expect(shareButton).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('mobile truncation class applied', () => {
    renderBanner()

    const verseElement = document.querySelector('.line-clamp-1')
    expect(verseElement).toBeInTheDocument()
  })

  it('share panel opens on click', () => {
    renderBanner()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Share verse of the day'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('VOTD banner reference is a link', () => {
    renderBanner()
    const links = screen.getAllByRole('link')
    const verseLink = links.find((l) => l.getAttribute('href')?.startsWith('/bible/'))
    expect(verseLink).toBeDefined()
  })

  it('VOTD banner link has correct base color', () => {
    renderBanner()
    const links = screen.getAllByRole('link')
    const verseLink = links.find((l) => l.getAttribute('href')?.startsWith('/bible/'))
    expect(verseLink?.className).toContain('text-white/60')
  })
})
