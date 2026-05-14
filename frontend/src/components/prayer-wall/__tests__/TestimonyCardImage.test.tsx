import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TestimonyCardImage } from '../TestimonyCardImage'
import { TRUNCATION_LINE } from '@/constants/testimony-share-copy'

const SHORT_CONTENT =
  'God restored my marriage after years of doubt. I cannot explain it any other way.'

// Longer than 600 chars to force the truncation path.
const LONG_CONTENT = 'A '.repeat(500)

describe('TestimonyCardImage', () => {
  it('renders testimony content text', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(screen.getByText(SHORT_CONTENT)).toBeInTheDocument()
  })

  it('renders author display name for non-anonymous testimony', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(screen.getByText('John S.')).toBeInTheDocument()
    expect(
      screen.getByTestId('testimony-attribution-avatar-named'),
    ).toBeInTheDocument()
  })

  // STRUCTURAL ONLY — see Step 6's Gate-G-ANON-ATTRIBUTION end-to-end test
  // for the load-bearing privacy evidence. This test verifies the component
  // faithfully renders what it's given; it does NOT prove the mapper
  // resolves isAnonymous → "Anonymous" upstream.
  it('renders "Anonymous" label + neutral-gradient avatar for anonymous testimony (structural)', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="Anonymous"
        isAnonymous={true}
      />,
    )
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    expect(
      screen.getByTestId('testimony-attribution-avatar-anonymous'),
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('testimony-attribution-avatar-named'),
    ).not.toBeInTheDocument()
  })

  it('renders initials in stylized circle, NOT an avatar URL', () => {
    const { container } = render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(container.querySelector('img')).toBeNull()
    // Avatar slot displays the uppercased initial 'J'.
    const namedAvatar = screen.getByTestId('testimony-attribution-avatar-named')
    expect(namedAvatar.textContent).toBe('J')
  })

  it('truncates long content with "Read the full testimony" line', () => {
    render(
      <TestimonyCardImage
        content={LONG_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(screen.getByText(TRUNCATION_LINE)).toBeInTheDocument()
    const root = screen.getByTestId('testimony-card-image')
    // Full input is 1000 chars; truncated body is < input length.
    expect(root.textContent ?? '').not.toContain(LONG_CONTENT)
  })

  it('renders short content WITHOUT the truncation line', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(screen.queryByText(TRUNCATION_LINE)).not.toBeInTheDocument()
  })

  it('renders the Worship Room wordmark', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    expect(screen.getByText('Worship Room')).toBeInTheDocument()
  })

  it('positions the capture target off-screen at 1080×1080 (W34)', () => {
    render(
      <TestimonyCardImage
        content={SHORT_CONTENT}
        authorName="John S."
        isAnonymous={false}
      />,
    )
    const root = screen.getByTestId('testimony-card-image')
    expect(root.style.position).toBe('fixed')
    expect(root.style.left).toBe('-99999px')
    expect(root.style.width).toBe('1080px')
    expect(root.style.height).toBe('1080px')
    expect(root.getAttribute('aria-hidden')).toBe('true')
  })
})
