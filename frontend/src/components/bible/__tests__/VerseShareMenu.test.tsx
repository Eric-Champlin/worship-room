import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { VerseShareMenu } from '../VerseShareMenu'

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}))

const defaultProps = {
  verseText: 'In the beginning, God created the heavens and the earth.',
  reference: 'Genesis 1:1 WEB',
  isOpen: true,
  onClose: vi.fn(),
  anchorElement: null as HTMLElement | null,
}

function createAnchor(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  el.getBoundingClientRect = () => ({
    top: 200,
    bottom: 230,
    left: 100,
    right: 300,
    width: 200,
    height: 30,
    x: 100,
    y: 200,
    toJSON: () => {},
  })
  return el
}

describe('VerseShareMenu', () => {
  let anchor: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    anchor = createAnchor()
  })

  it('renders 3 menu items when open', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    expect(screen.getByText('Copy verse')).toBeInTheDocument()
    expect(screen.getByText('Share as image')).toBeInTheDocument()
    expect(screen.getByText('Download image')).toBeInTheDocument()
  })

  it('does not render when not open', () => {
    render(<VerseShareMenu {...defaultProps} isOpen={false} anchorElement={anchor} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('has role="menu" with aria-label', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    expect(screen.getByRole('menu', { name: 'Share verse options' })).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('supports arrow key navigation', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    const items = screen.getAllByRole('menuitem')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
  })

  it('supports Home/End navigation', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    const items = screen.getAllByRole('menuitem')
    items[0].focus()
    fireEvent.keyDown(items[0], { key: 'End' })
    expect(document.activeElement).toBe(items[2])
  })

  it('wraps around on ArrowDown at end', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    const items = screen.getAllByRole('menuitem')
    items[2].focus()
    fireEvent.keyDown(items[2], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
  })

  it('calls onClose on click outside', () => {
    render(<VerseShareMenu {...defaultProps} anchorElement={anchor} />)
    fireEvent.mouseDown(document.body)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
