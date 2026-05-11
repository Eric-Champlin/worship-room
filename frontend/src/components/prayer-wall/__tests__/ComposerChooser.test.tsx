import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComposerChooser } from '../ComposerChooser'
import { POST_TYPES, type PostType } from '@/constants/post-types'

describe('ComposerChooser', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders all 5 enabled post-type cards plus a close button when isOpen', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)

    for (const entry of POST_TYPES.filter((t) => t.enabled)) {
      expect(screen.getByRole('button', { name: entry.label })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('returns null when isOpen=false (no DOM mount)', () => {
    const { container } = render(
      <ComposerChooser isOpen={false} onSelect={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog with role, aria-modal, and aria-labelledby pointing at the title', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'composer-chooser-title')
    const title = document.getElementById('composer-chooser-title')
    expect(title).not.toBeNull()
    expect(title?.textContent).toMatch(/what would you like to share/i)
  })

  it('shows the correct icon, label, and description for each card', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    for (const entry of POST_TYPES.filter((t) => t.enabled)) {
      const card = screen.getByRole('button', { name: entry.label })
      expect(card).toHaveTextContent(entry.label)
      expect(card).toHaveTextContent(entry.description)
      // Each card has an SVG icon child marked aria-hidden
      const icon = card.querySelector('svg[aria-hidden="true"]')
      expect(icon).not.toBeNull()
    }
  })

  it('every card meets the 44x44 minimum touch target via min-h-[44px]', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    for (const entry of POST_TYPES.filter((t) => t.enabled)) {
      const card = screen.getByRole('button', { name: entry.label })
      expect(card.className).toContain('min-h-[44px]')
    }
  })

  it('every card is a <button type="button">', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    for (const entry of POST_TYPES.filter((t) => t.enabled)) {
      const card = screen.getByRole('button', { name: entry.label })
      expect(card.tagName).toBe('BUTTON')
      expect(card.getAttribute('type')).toBe('button')
    }
  })

  it('every card has an aria-label matching its label', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    for (const entry of POST_TYPES.filter((t) => t.enabled)) {
      const card = screen.getByLabelText(entry.label)
      expect(card.tagName).toBe('BUTTON')
    }
  })

  it('focus trap focuses the close button (first focusable in DOM order) on mount', async () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    // useFocusTrap focuses the first focusable. DOM order: drag handle (aria-hidden),
    // title h2 (not focusable), close button (first focusable), then the card grid.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close/i }))
  })

  it.each(
    POST_TYPES.filter((t) => t.enabled).map((entry) => [entry.id, entry.label] as const),
  )('Enter on focused %s card calls onSelect with %s', async (id, label) => {
    const onSelect = vi.fn()
    render(<ComposerChooser isOpen onSelect={onSelect} onClose={vi.fn()} />)
    const card = screen.getByRole('button', { name: label }) as HTMLButtonElement
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(id)
  })

  it.each(
    POST_TYPES.filter((t) => t.enabled).map((entry) => [entry.id, entry.label] as const),
  )('Space on focused %s card calls onSelect with %s', async (id, label) => {
    const onSelect = vi.fn()
    render(<ComposerChooser isOpen onSelect={onSelect} onClose={vi.fn()} />)
    const card = screen.getByRole('button', { name: label }) as HTMLButtonElement
    card.focus()
    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledWith(id)
  })

  it('Escape calls onClose', async () => {
    const onClose = vi.fn()
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={onClose} />)
    // Focus a button inside the panel so the keydown listener (attached to the container)
    // receives the event via bubbling.
    const card = screen.getByRole('button', { name: /prayer request/i }) as HTMLButtonElement
    card.focus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop (scrim) click calls onClose', () => {
    const onClose = vi.fn()
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    // The scrim sits as a sibling div with aria-hidden="true" inside the same fixed wrapper.
    const scrim = dialog.parentElement?.querySelector('[aria-hidden="true"].absolute')
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim as Element)
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking a card calls onSelect with the postType but does NOT call onClose itself', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<ComposerChooser isOpen onSelect={onSelect} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Testimony' }))
    expect(onSelect).toHaveBeenCalledWith('testimony' satisfies PostType)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('close (X) button calls onClose', async () => {
    const onClose = vi.fn()
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders FrostedCard with canonical radius inside dialog (W5 — outer panel only)', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('[class*="rounded-t-3xl"]')).toBeInTheDocument()
  })

  it('5 inner type-card buttons remain as <button> elements (W5 enforcement)', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    const enabledTypes = POST_TYPES.filter((t) => t.enabled)
    for (const entry of enabledTypes) {
      const card = screen.getByRole('button', { name: entry.label })
      expect(card.tagName).toBe('BUTTON')
    }
    expect(enabledTypes.length).toBe(5)
  })

  it('animation classes are on the wrapping div (not FrostedCard)', () => {
    render(<ComposerChooser isOpen onSelect={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('transition-[transform,opacity]')
    expect(dialog.className).toContain('duration-base')
  })
})
