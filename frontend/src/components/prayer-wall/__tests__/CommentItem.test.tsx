import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CommentItem } from '../CommentItem'
import type { PrayerComment } from '@/types/prayer-wall'

const mockComment: PrayerComment = {
  id: 'c1',
  prayerId: 'prayer-1',
  userId: 'user-1',
  authorName: 'David',
  authorAvatarUrl: null,
  content: 'Praying for you right now!',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
}

function renderItem(comment?: PrayerComment, onReply?: (name: string) => void) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommentItem
        comment={comment ?? mockComment}
        onReply={onReply ?? vi.fn()}
      />
    </MemoryRouter>,
  )
}

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
    renderItem(undefined, onReply)
    await user.click(screen.getByText('Reply'))
    expect(onReply).toHaveBeenCalledWith('David')
  })

  it('renders @mentions as styled text', () => {
    const mentionComment: PrayerComment = {
      ...mockComment,
      id: 'c2',
      content: '@Sarah praying for you!',
    }
    renderItem(mentionComment)
    expect(screen.getByText('@Sarah')).toBeInTheDocument()
    expect(screen.getByText('@Sarah').className).toContain('text-primary')
  })
})
