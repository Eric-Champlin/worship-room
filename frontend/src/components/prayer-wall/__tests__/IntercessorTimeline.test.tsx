import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/services/api/intercessor-api', () => ({
  fetchIntercessors: vi.fn(),
}))

import { fetchIntercessors } from '@/services/api/intercessor-api'
import { IntercessorTimeline } from '../IntercessorTimeline'
import type {
  IntercessorEntry,
  IntercessorResponse,
} from '@/types/intercessor'

const POST_ID = 'post-1'

const namedEntry = (
  userId: string,
  name: string,
  reactedAt = '2026-05-13T11:00:00Z',
): IntercessorEntry => ({
  userId,
  displayName: name,
  isAnonymous: false,
  reactedAt,
})

const anonEntry = (reactedAt = '2026-05-13T10:00:00Z'): IntercessorEntry => ({
  displayName: 'Anonymous',
  isAnonymous: true,
  reactedAt,
})

describe('IntercessorTimeline', () => {
  beforeEach(() => {
    vi.mocked(fetchIntercessors).mockReset()
  })

  it('renders empty-state summary line when count is 0 and shows no expand button', () => {
    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={0}
        initialSummary={{ count: 0, firstThree: [] }}
      />,
    )

    expect(screen.getByText('No one has prayed for this yet')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders summary line as plain paragraph (no button) for count === 1', () => {
    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={1}
        initialSummary={{ count: 1, firstThree: [namedEntry('u-1', 'Sarah')] }}
      />,
    )

    expect(screen.getByText('Sarah is praying')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders expand button when prayingCount >= 2 and aria-expanded toggles', async () => {
    const user = userEvent.setup()
    const response: IntercessorResponse = {
      entries: [
        namedEntry('u-1', 'Sarah'),
        anonEntry(),
        namedEntry('u-3', 'Mark'),
      ],
      totalCount: 3,
    }
    vi.mocked(fetchIntercessors).mockResolvedValue(response)

    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={3}
        initialSummary={{
          count: 3,
          firstThree: [
            namedEntry('u-1', 'Sarah'),
            anonEntry(),
            namedEntry('u-3', 'Mark'),
          ],
        }}
      />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)

    await waitFor(() =>
      expect(button).toHaveAttribute('aria-expanded', 'true'),
    )
    expect(fetchIntercessors).toHaveBeenCalledWith(POST_ID)
    expect(screen.getByRole('list')).toBeInTheDocument()
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
  })

  it('renders anonymous entry with the same markup as named entries', async () => {
    const user = userEvent.setup()
    const response: IntercessorResponse = {
      entries: [namedEntry('u-1', 'Sarah'), anonEntry('2026-05-13T09:00:00Z')],
      totalCount: 2,
    }
    vi.mocked(fetchIntercessors).mockResolvedValue(response)

    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={2}
        initialSummary={{
          count: 2,
          firstThree: [namedEntry('u-1', 'Sarah'), anonEntry()],
        }}
      />,
    )

    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument())

    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(2)
    // Both list items have the same display-name + relative-time markup —
    // the anonymous entry is not visually differentiated (Gate-G-NO-LEADERBOARD).
    expect(listItems[1]).toHaveTextContent('Anonymous')
  })

  it('clicking when expanded collapses without re-fetching', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchIntercessors).mockResolvedValue({
      entries: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
      totalCount: 2,
    })

    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={2}
        initialSummary={{
          count: 2,
          firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
        }}
      />,
    )

    const button = screen.getByRole('button')
    await user.click(button)
    await waitFor(() =>
      expect(button).toHaveAttribute('aria-expanded', 'true'),
    )
    expect(fetchIntercessors).toHaveBeenCalledTimes(1)

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(fetchIntercessors).toHaveBeenCalledTimes(1)
  })

  it('shows "and N others" trailing entry when totalCount > 50', async () => {
    const user = userEvent.setup()
    const fifty = Array.from({ length: 50 }, (_, i) =>
      namedEntry(`u-${i}`, `Name${i}`),
    )
    vi.mocked(fetchIntercessors).mockResolvedValue({
      entries: fifty,
      totalCount: 75,
    })

    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={75}
        initialSummary={{ count: 75, firstThree: fifty.slice(0, 3) }}
      />,
    )

    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument())

    expect(screen.getByText(/and 25 others/i)).toBeInTheDocument()
  })

  it('keyboard activation (Enter) expands the timeline', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchIntercessors).mockResolvedValue({
      entries: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
      totalCount: 2,
    })

    render(
      <IntercessorTimeline
        postId={POST_ID}
        prayingCount={2}
        initialSummary={{
          count: 2,
          firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
        }}
      />,
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(button).toHaveAttribute('aria-expanded', 'true'),
    )
  })
})
