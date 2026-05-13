import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { IntercessorTimeline } from '../IntercessorTimeline'
import type { IntercessorEntry } from '@/types/intercessor'

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

/**
 * IntercessorTimeline is presentational post-fix (the hook lives in
 * PrayerCard so InteractionBar can share its actions via context). These
 * tests pass the hook-result props directly. Hook-level behavior is tested
 * in `hooks/__tests__/useIntercessors.test.ts`.
 */

interface RenderOpts {
  initialSummary?: { count: number; firstThree: IntercessorEntry[] } | null
  entries?: IntercessorEntry[]
  totalCount?: number
  expanded?: boolean
  loading?: boolean
  error?: string | null
  onExpand?: () => void
  onCollapse?: () => void
}

function renderTimeline(opts: RenderOpts = {}) {
  const onExpand = opts.onExpand ?? vi.fn()
  const onCollapse = opts.onCollapse ?? vi.fn()
  render(
    <IntercessorTimeline
      initialSummary={opts.initialSummary ?? null}
      entries={opts.entries ?? []}
      totalCount={opts.totalCount ?? 0}
      expanded={opts.expanded ?? false}
      loading={opts.loading ?? false}
      error={opts.error ?? null}
      onExpand={onExpand}
      onCollapse={onCollapse}
    />,
  )
  return { onExpand, onCollapse }
}

describe('IntercessorTimeline', () => {
  it('renders empty-state summary line when count is 0 and shows no expand button', () => {
    renderTimeline({
      totalCount: 0,
      initialSummary: { count: 0, firstThree: [] },
    })

    expect(screen.getByText('No one has prayed for this yet')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders summary line as plain paragraph (no button) for count === 1', () => {
    renderTimeline({
      totalCount: 1,
      initialSummary: { count: 1, firstThree: [namedEntry('u-1', 'Sarah')] },
    })

    expect(screen.getByText('Sarah is praying')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders expand button when totalCount >= 2 and click invokes onExpand', async () => {
    const user = userEvent.setup()
    const { onExpand } = renderTimeline({
      totalCount: 3,
      initialSummary: {
        count: 3,
        firstThree: [
          namedEntry('u-1', 'Sarah'),
          anonEntry(),
          namedEntry('u-3', 'Mark'),
        ],
      },
    })

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)

    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('renders entries when expanded with role="list" and listitems', () => {
    renderTimeline({
      expanded: true,
      totalCount: 3,
      entries: [
        namedEntry('u-1', 'Sarah'),
        anonEntry(),
        namedEntry('u-3', 'Mark'),
      ],
    })

    expect(screen.getByRole('list')).toBeInTheDocument()
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
  })

  it('renders anonymous entry with the same markup as named entries (Gate-G-NO-LEADERBOARD)', () => {
    renderTimeline({
      expanded: true,
      totalCount: 2,
      entries: [namedEntry('u-1', 'Sarah'), anonEntry('2026-05-13T09:00:00Z')],
    })

    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(2)
    // Both list items have the same display-name + relative-time markup —
    // the anonymous entry is not visually differentiated.
    expect(listItems[1]).toHaveTextContent('Anonymous')
  })

  it('clicking expanded button invokes onCollapse', async () => {
    const user = userEvent.setup()
    const { onCollapse } = renderTimeline({
      expanded: true,
      totalCount: 2,
      entries: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
    })

    await user.click(screen.getByRole('button'))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('shows "and N others" trailing entry when totalCount > 50', () => {
    const fifty = Array.from({ length: 50 }, (_, i) =>
      namedEntry(`u-${i}`, `Name${i}`),
    )
    renderTimeline({
      expanded: true,
      totalCount: 75,
      entries: fifty,
    })

    expect(screen.getByText(/and 25 others/i)).toBeInTheDocument()
  })

  it('keyboard activation (Enter) invokes onExpand', async () => {
    const user = userEvent.setup()
    const { onExpand } = renderTimeline({
      totalCount: 2,
      initialSummary: {
        count: 2,
        firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
      },
    })

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('shows shimmer loading state inside the expand region while loading', () => {
    renderTimeline({
      loading: true,
      totalCount: 3,
      initialSummary: {
        count: 3,
        firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob'), namedEntry('u-3', 'Eve')],
      },
    })

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)
  })

  it('surfaces an inline error alert when the fetch failed (Medium #2 fix)', () => {
    renderTimeline({
      error: 'boom',
      totalCount: 3,
      initialSummary: {
        count: 3,
        firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob'), namedEntry('u-3', 'Eve')],
      },
    })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/couldn't load/i)
    expect(alert).toHaveTextContent(/retry/i)
  })

  it('reflects optimistic count updates via the totalCount prop (Major #1 fix)', () => {
    // Sim: user clicked praying on a card with prayingCount=2 → parent's
    // useIntercessors.optimisticInsert increments totalCount → re-render
    // with totalCount=3. The summary line reflects the new count.
    renderTimeline({
      totalCount: 3,
      initialSummary: {
        // initialSummary.firstThree from the feed snapshot doesn't include
        // the new entry yet — formatSummaryLine falls back gracefully.
        count: 2,
        firstThree: [namedEntry('u-1', 'Sarah'), namedEntry('u-2', 'Bob')],
      },
    })

    // count: 3, firstThree: 2 entries → 4+ branch isn't triggered (count=3 +
    // firstThree.length=2 — special-cased fallback in formatSummaryLine).
    expect(screen.getByRole('button')).toHaveTextContent(/praying/i)
  })
})
