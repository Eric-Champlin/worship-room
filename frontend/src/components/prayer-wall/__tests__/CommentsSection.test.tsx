import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CommentsSection } from '../CommentsSection'
import type { PrayerComment } from '@/types/prayer-wall'

const mockComments: PrayerComment[] = [
  {
    id: 'c1',
    prayerId: 'prayer-1',
    userId: 'user-1',
    authorName: 'David',
    authorAvatarUrl: null,
    content: 'Praying for you right now!',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'c2',
    prayerId: 'prayer-1',
    userId: 'user-2',
    authorName: 'Emily',
    authorAvatarUrl: null,
    content: '@Sarah Standing with you in prayer.',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'c3',
    prayerId: 'prayer-1',
    userId: 'user-3',
    authorName: 'James',
    authorAvatarUrl: null,
    content: 'God bless you and your family.',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
]

function renderSection(overrides?: {
  isOpen?: boolean
  comments?: PrayerComment[]
  totalCount?: number
}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommentsSection
        prayerId="prayer-1"
        isOpen={overrides?.isOpen ?? true}
        comments={overrides?.comments ?? mockComments}
        totalCount={overrides?.totalCount ?? mockComments.length}
        onSubmitComment={vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('CommentsSection', () => {
  it('renders comments when open', () => {
    renderSection({ isOpen: true })
    expect(screen.getByText('Praying for you right now!')).toBeInTheDocument()
    expect(screen.getByText('God bless you and your family.')).toBeInTheDocument()
  })

  it('has collapsed styles when closed', () => {
    const { container } = renderSection({ isOpen: false })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('max-h-0')
    expect(wrapper.className).toContain('opacity-0')
  })

  it('shows "See more comments" link when totalCount exceeds 5', () => {
    const manyComments = Array.from({ length: 6 }, (_, i) => ({
      id: `c${i}`,
      prayerId: 'prayer-1',
      userId: `user-${i}`,
      authorName: `User${i}`,
      authorAvatarUrl: null,
      content: `Comment ${i}`,
      createdAt: new Date().toISOString(),
    }))
    renderSection({ comments: manyComments, totalCount: 12 })
    expect(screen.getByText(/See more comments/)).toBeInTheDocument()
    expect(screen.getByText(/showing 5 of 12/)).toBeInTheDocument()
  })

  it('does not show "See more" when totalCount is within limit', () => {
    renderSection({ totalCount: 3 })
    expect(screen.queryByText(/See more comments/)).not.toBeInTheDocument()
  })

  it('renders the comment input', () => {
    renderSection()
    expect(screen.getByText('Log in to comment')).toBeInTheDocument()
  })
})
