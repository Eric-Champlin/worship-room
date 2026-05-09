import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageLightbox } from '../ImageLightbox'
import type { PostImage as PostImageType } from '@/types/prayer-wall'

const sampleImage: PostImageType = {
  full: 'https://signed/full.jpg',
  medium: 'https://signed/medium.jpg',
  thumb: 'https://signed/thumb.jpg',
  altText: 'A baby smiling at the camera',
}

describe('ImageLightbox', () => {
  it('renders the FULL rendition (not medium)', () => {
    render(<ImageLightbox image={sampleImage} onClose={vi.fn()} />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toContain('full.jpg')
    expect(img.src).not.toContain('medium.jpg')
  })

  it('renders alt text both as img alt AND as visible caption', () => {
    render(<ImageLightbox image={sampleImage} onClose={vi.fn()} />)
    // Alt text on img + caption paragraph = 2 elements with the text.
    const matches = screen.getAllByText('A baby smiling at the camera')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByAltText('A baby smiling at the camera')).toBeInTheDocument()
  })

  it('has role="dialog" + aria-modal="true"', () => {
    render(<ImageLightbox image={sampleImage} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('Close button calls onClose', () => {
    const onClose = vi.fn()
    render(<ImageLightbox image={sampleImage} onClose={onClose} />)
    const closeButton = screen.getByRole('button', { name: /close image viewer/i })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('Close button is at least 44px tall', () => {
    render(<ImageLightbox image={sampleImage} onClose={vi.fn()} />)
    const closeButton = screen.getByRole('button', { name: /close image viewer/i })
    expect(closeButton.className).toMatch(/h-11/) // h-11 = 44px (Tailwind: 11 * 0.25rem = 2.75rem = 44px)
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    render(<ImageLightbox image={sampleImage} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking the image content area does NOT call onClose', () => {
    const onClose = vi.fn()
    render(<ImageLightbox image={sampleImage} onClose={onClose} />)
    const img = screen.getByRole('img')
    fireEvent.click(img)
    expect(onClose).not.toHaveBeenCalled()
  })
})
