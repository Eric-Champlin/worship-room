import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { VerseFindsYou } from '../VerseFindsYou'

const SAFE_VERSE = { reference: 'Psalm 23:1', text: 'The Lord is my shepherd; I lack nothing.' }

function renderCard(overrides: Partial<React.ComponentProps<typeof VerseFindsYou>> = {}) {
  const defaults: React.ComponentProps<typeof VerseFindsYou> = {
    verse: SAFE_VERSE,
    trigger: 'post_compose',
    verseId: 'psalm-23-1',
    onDismiss: vi.fn(),
    onSaved: vi.fn(),
    saved: false,
  }
  return render(<VerseFindsYou {...defaults} {...overrides} />)
}

describe('VerseFindsYou', () => {
  describe('T32 / T35: accessibility', () => {
    it('has role="note" with accessible name including "scripture"', () => {
      renderCard()
      const note = screen.getByRole('note')
      expect(note).toBeInTheDocument()
      // aria-label includes "scripture" so screen-readers announce intent.
      expect(note).toHaveAttribute('aria-label', expect.stringMatching(/scripture/i))
    })

    it('uses aria-live="polite" so announcements do not interrupt', () => {
      const { container } = renderCard()
      const live = container.querySelector('[aria-live="polite"]')
      expect(live).not.toBeNull()
    })
  })

  describe('T33: reference inside <cite>', () => {
    it('renders the verse reference inside a cite element', () => {
      const { container } = renderCard()
      const cite = container.querySelector('cite')
      expect(cite).not.toBeNull()
      expect(cite).toHaveTextContent('Psalm 23:1')
    })
  })

  describe('T34: reduced-motion safety', () => {
    it('applies motion-reduce:transition-none on the card root', () => {
      renderCard()
      const note = screen.getByRole('note')
      expect(note.className).toContain('motion-reduce:transition-none')
    })
  })

  describe('T37: HTML in verse text renders as escaped text, not as DOM', () => {
    it('does NOT execute injected script tags or render injected DOM nodes', () => {
      const malicious = {
        reference: 'Test 1:1',
        text: "<script>alert('xss')</script><img src=x onerror='alert(1)'/>",
      }
      const { container } = renderCard({ verse: malicious })

      // No script element should have been added to the rendered DOM.
      expect(container.querySelector('script')).toBeNull()
      // No injected <img> either.
      expect(container.querySelector('img')).toBeNull()
      // The literal text appears verbatim (React-escaped) in the rendered text.
      expect(container.textContent).toContain("<script>alert('xss')</script>")
    })
  })

  describe('trigger prefix copy', () => {
    it('shows "The word found you today:" for post_compose', () => {
      renderCard({ trigger: 'post_compose' })
      expect(screen.getByText('The word found you today:')).toBeInTheDocument()
    })

    it('shows "A word as you gave comfort:" for comment', () => {
      renderCard({ trigger: 'comment' })
      expect(screen.getByText('A word as you gave comfort:')).toBeInTheDocument()
    })

    it('shows "A word as you keep watch:" for reading_time', () => {
      renderCard({ trigger: 'reading_time' })
      expect(screen.getByText('A word as you keep watch:')).toBeInTheDocument()
    })
  })

  describe('dismiss + save controls', () => {
    it('renders Dismiss button with accessible name', () => {
      renderCard()
      expect(screen.getByRole('button', { name: /dismiss this verse/i })).toBeInTheDocument()
    })

    it('renders Save button with accessible name when not yet saved', () => {
      renderCard({ saved: false })
      const save = screen.getByRole('button', { name: /save this verse as an image/i })
      expect(save).not.toBeDisabled()
      expect(save).toHaveTextContent(/save/i)
    })

    it('disables Save button and shows "Saved" once saved=true', () => {
      renderCard({ saved: true })
      const save = screen.getByRole('button', { name: /save this verse as an image/i })
      expect(save).toBeDisabled()
      expect(save).toHaveTextContent(/saved/i)
    })
  })
})
