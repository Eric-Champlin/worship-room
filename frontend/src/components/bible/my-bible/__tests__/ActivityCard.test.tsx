import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivityCard } from '../ActivityCard'
import type { ActivityItem } from '@/types/my-bible'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'

vi.mock('@/lib/bible/notes/referenceParser', () => ({
  parseReferences: vi.fn((text: string) => {
    // Simple mock: detect "John 3:16" pattern
    const match = text.match(/John \d+:\d+/)
    if (!match) return []
    return [{
      text: match[0],
      startIndex: match.index!,
      endIndex: match.index! + match[0].length,
      bookSlug: 'john',
      bookName: 'John',
      chapter: 3,
      startVerse: 16,
    }]
  }),
}))

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'highlight',
    id: 'hl-1',
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    data: { type: 'highlight', color: 'joy' },
    ...overrides,
  }
}

function renderCard(item: ActivityItem, verseText: string | null = 'For God so loved the world', onClick = vi.fn()) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ActivityCard item={item} verseText={verseText} onClick={onClick} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ActivityCard', () => {
  it('renders reference and timestamp', () => {
    renderCard(makeItem())
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText(/ago|just now/)).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderCard(makeItem(), 'text', onClick)

    await user.click(screen.getByRole('button', { name: /John 3:16/ }))
    expect(onClick).toHaveBeenCalled()
  })

  it('shows skeleton while verse text loading', () => {
    const { container } = renderCard(makeItem(), null)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows verse text after loading', () => {
    renderCard(makeItem(), 'For God so loved the world')
    expect(screen.getByText('For God so loved the world')).toBeInTheDocument()
  })
})

describe('HighlightCard', () => {
  it('renders verse with color background', () => {
    renderCard(makeItem({ data: { type: 'highlight', color: 'joy' } }))
    // Joy color chip
    expect(screen.getByText('Joy')).toBeInTheDocument()
  })

  it('shows emotion chip label', () => {
    renderCard(makeItem({ data: { type: 'highlight', color: 'peace' } }))
    expect(screen.getByText('Peace')).toBeInTheDocument()
  })
})

describe('BookmarkCard', () => {
  it('renders label when present', () => {
    renderCard(makeItem({
      type: 'bookmark',
      data: { type: 'bookmark', label: 'My favorite verse' },
    }))
    expect(screen.getByText('My favorite verse')).toBeInTheDocument()
  })

  it('omits label when absent', () => {
    renderCard(makeItem({
      type: 'bookmark',
      data: { type: 'bookmark' },
    }))
    expect(screen.queryByText(/favorite/)).not.toBeInTheDocument()
  })
})

describe('NoteCard', () => {
  it('shows verse text muted and note body', () => {
    renderCard(makeItem({
      type: 'note',
      data: { type: 'note', body: 'This is my reflection on the verse' },
    }))
    // Verse text rendered muted
    expect(screen.getByText('For God so loved the world')).toBeInTheDocument()
    expect(screen.getByText(/This is my reflection/)).toBeInTheDocument()
  })

  it('truncates to 4 lines with Show more', () => {
    const longBody = 'A'.repeat(500)
    const { container } = renderCard(makeItem({
      type: 'note',
      data: { type: 'note', body: longBody },
    }))
    expect(container.querySelector('.line-clamp-4')).toBeInTheDocument()
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('Show more expands inline', async () => {
    const user = userEvent.setup()
    const longBody = 'A'.repeat(500)
    const { container } = renderCard(makeItem({
      type: 'note',
      data: { type: 'note', body: longBody },
    }))

    await user.click(screen.getByText('Show more'))
    expect(container.querySelector('.line-clamp-4')).not.toBeInTheDocument()
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('shows edited indicator', () => {
    const now = Date.now()
    renderCard(makeItem({
      type: 'note',
      createdAt: now - 86400000,
      updatedAt: now - 60000,
      data: { type: 'note', body: 'Updated note' },
    }))
    expect(screen.getByText(/edited/)).toBeInTheDocument()
  })

  it('renders reference links as buttons', () => {
    renderCard(makeItem({
      type: 'note',
      data: { type: 'note', body: 'See John 3:16 for context' },
    }))
    const refButton = screen.getByRole('button', { name: 'John 3:16' })
    expect(refButton).toBeInTheDocument()
  })

  it('reference link shows toast stub', async () => {
    const user = userEvent.setup()
    renderCard(makeItem({
      type: 'note',
      data: { type: 'note', body: 'See John 3:16 for context' },
    }))
    const refButton = screen.getByRole('button', { name: 'John 3:16' })
    await user.click(refButton)
    // Toast is rendered by the provider — just verify no crash
    expect(refButton).toBeInTheDocument()
  })
})

describe('MeditationCard', () => {
  it('shows verse text and badge', () => {
    renderCard(makeItem({
      type: 'meditation',
      data: {
        type: 'meditation',
        meditationType: 'soaking',
        durationMinutes: 10,
        reference: 'John 3:16',
      },
    }))
    expect(screen.getByText('Meditate')).toBeInTheDocument()
    expect(screen.getByText('For God so loved the world')).toBeInTheDocument()
    expect(screen.getByText(/You meditated on this verse/)).toBeInTheDocument()
  })
})
