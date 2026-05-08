import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CommentItem } from '../CommentItem'
import type { PrayerComment } from '@/types/prayer-wall'
import type { PostType } from '@/constants/post-types'

// Mock useAuth so tests can switch between authenticated and unauthenticated states.
const mockAuth = {
  user: null as { id: string } | null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
}
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

const POST_AUTHOR_ID = 'post-author-1'

const mockComment: PrayerComment = {
  id: 'c1',
  prayerId: 'prayer-1',
  userId: 'user-1',
  authorName: 'David',
  authorAvatarUrl: null,
  content: 'Praying for you right now!',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
}

function renderItem(overrides?: {
  comment?: PrayerComment
  postType?: PostType
  postAuthorId?: string
  onReply?: (name: string) => void
  onResolve?: (commentId: string) => void
}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommentItem
        comment={overrides?.comment ?? mockComment}
        postType={overrides?.postType ?? 'prayer_request'}
        postAuthorId={overrides?.postAuthorId ?? POST_AUTHOR_ID}
        onReply={overrides?.onReply ?? vi.fn()}
        onResolve={overrides?.onResolve}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Default: unauthenticated. Individual tests opt into authenticated state.
  mockAuth.user = null
  mockAuth.isAuthenticated = false
})

describe('CommentItem', () => {
  it('renders author name and comment text', () => {
    renderItem()
    expect(screen.getByText('David')).toBeInTheDocument()
    expect(screen.getByText('Praying for you right now!')).toBeInTheDocument()
  })

  it('renders relative time', () => {
    renderItem()
    expect(screen.getByText(/hour ago/i)).toBeInTheDocument()
  })

  it('renders Reply button', () => {
    renderItem()
    expect(screen.getByText('Reply')).toBeInTheDocument()
  })

  it('calls onReply with author name when Reply clicked', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn()
    renderItem({ onReply })
    await user.click(screen.getByText('Reply'))
    expect(onReply).toHaveBeenCalledWith('David')
  })

  it('renders @mentions as styled text', () => {
    const mentionComment: PrayerComment = {
      ...mockComment,
      id: 'c2',
      content: '@Sarah praying for you!',
    }
    renderItem({ comment: mentionComment })
    expect(screen.getByText('@Sarah')).toBeInTheDocument()
    expect(screen.getByText('@Sarah').className).toContain('text-primary')
  })
})

// =====================================================================
// Spec 4.4 — 'This helped' button + inline ResolvedBadge
// =====================================================================

describe('CommentItem — Spec 4.4 helpful comment marker', () => {
  it('renders this-helped button when current user is post author and postType is question', () => {
    mockAuth.user = { id: POST_AUTHOR_ID }
    mockAuth.isAuthenticated = true
    renderItem({ postType: 'question', onResolve: vi.fn() })
    expect(screen.getByText('This helped')).toBeInTheDocument()
  })

  it('does NOT render this-helped button when current user is NOT the post author', () => {
    mockAuth.user = { id: 'someone-else' }
    mockAuth.isAuthenticated = true
    renderItem({ postType: 'question', onResolve: vi.fn() })
    expect(screen.queryByText('This helped')).not.toBeInTheDocument()
    expect(screen.queryByText('Most helpful')).not.toBeInTheDocument()
  })

  it('does NOT render this-helped button when not authenticated', () => {
    // mockAuth.user is null by default
    renderItem({ postType: 'question', onResolve: vi.fn() })
    expect(screen.queryByText('This helped')).not.toBeInTheDocument()
  })

  it('does NOT render this-helped button on prayer_request post even when current user is author', () => {
    mockAuth.user = { id: POST_AUTHOR_ID }
    mockAuth.isAuthenticated = true
    renderItem({ postType: 'prayer_request', onResolve: vi.fn() })
    expect(screen.queryByText('This helped')).not.toBeInTheDocument()
  })

  it('button label reads "This helped" when comment is not yet helpful', () => {
    mockAuth.user = { id: POST_AUTHOR_ID }
    mockAuth.isAuthenticated = true
    renderItem({
      comment: { ...mockComment, isHelpful: false },
      postType: 'question',
      onResolve: vi.fn(),
    })
    expect(screen.getByText('This helped')).toBeInTheDocument()
    expect(screen.queryByText('Most helpful')).not.toBeInTheDocument()
  })

  it('button label reads "Most helpful" when comment is helpful', () => {
    mockAuth.user = { id: POST_AUTHOR_ID }
    mockAuth.isAuthenticated = true
    renderItem({
      comment: { ...mockComment, isHelpful: true },
      postType: 'question',
      onResolve: vi.fn(),
    })
    // The button label and the badge label both read "Most helpful" — assert
    // there are at least 2 occurrences (one in button text, one in badge text).
    expect(screen.getAllByText('Most helpful').length).toBeGreaterThanOrEqual(2)
  })

  it('clicking this-helped button calls onResolve with the comment id', async () => {
    const user = userEvent.setup()
    const onResolve = vi.fn()
    mockAuth.user = { id: POST_AUTHOR_ID }
    mockAuth.isAuthenticated = true
    renderItem({ postType: 'question', onResolve })
    await user.click(screen.getByText('This helped'))
    expect(onResolve).toHaveBeenCalledWith('c1')
  })

  it('renders ResolvedBadge inline with author name when isHelpful is true', () => {
    renderItem({
      comment: { ...mockComment, isHelpful: true },
      postType: 'question',
    })
    // The badge has an aria-label that the standalone test asserted; reuse it.
    expect(
      screen.getByLabelText('Most helpful comment, marked by post author'),
    ).toBeInTheDocument()
  })

  it('does NOT render ResolvedBadge when isHelpful is false', () => {
    renderItem({
      comment: { ...mockComment, isHelpful: false },
      postType: 'question',
    })
    expect(
      screen.queryByLabelText('Most helpful comment, marked by post author'),
    ).not.toBeInTheDocument()
  })
})
