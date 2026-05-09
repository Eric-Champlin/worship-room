import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostImage } from '../PostImage'
import type { PostImage as PostImageType } from '@/types/prayer-wall'

const sampleImage: PostImageType = {
  full: 'https://signed/full.jpg',
  medium: 'https://signed/medium.jpg',
  thumb: 'https://signed/thumb.jpg',
  altText: 'A baby smiling at the camera',
}

describe('PostImage', () => {
  it('renders the medium rendition by default', () => {
    render(<PostImage image={sampleImage} />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toContain('medium.jpg')
  })

  it('alt text is set on the img element', () => {
    render(<PostImage image={sampleImage} />)
    expect(screen.getByAltText('A baby smiling at the camera')).toBeInTheDocument()
  })

  it('button wrapper aria-label includes alt text', () => {
    render(<PostImage image={sampleImage} />)
    expect(
      screen.getByRole('button', { name: /open image: a baby smiling/i }),
    ).toBeInTheDocument()
  })

  it('uses eager loading for index < 5', () => {
    render(<PostImage image={sampleImage} index={2} />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
  })

  it('uses lazy loading for index >= 5', () => {
    render(<PostImage image={sampleImage} index={5} />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy')
  })

  it('opens the lightbox on click', () => {
    render(<PostImage image={sampleImage} />)
    fireEvent.click(screen.getByRole('button', { name: /open image/i }))
    // Lightbox dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
