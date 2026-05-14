import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFilters } from '../CategoryFilters'

const onSelectCategory = vi.fn()
const onSelectPostType = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

function renderFilters(
  overrides: Partial<Parameters<typeof CategoryFilters>[0]> = {},
) {
  return render(
    <CategoryFilters
      variant="desktop"
      activeCategory={null}
      activePostType={null}
      onSelectCategory={onSelectCategory}
      onSelectPostType={onSelectPostType}
      {...overrides}
    />,
  )
}

describe('CategoryFilters', () => {
  it('desktop variant renders stacked list with section headings', () => {
    renderFilters({ variant: 'desktop' })
    expect(screen.getByText(/filter posts/i)).toBeInTheDocument()
    expect(screen.getByText(/by type/i)).toBeInTheDocument()
    expect(screen.getByText(/by topic/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All posts' })).toBeInTheDocument()
    // 5 enabled post types
    expect(screen.getByRole('button', { name: 'Prayer requests' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Testimonies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Questions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discussions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encouragements' })).toBeInTheDocument()
    // 8 topics
    expect(screen.getByRole('button', { name: 'Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mental Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Family' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grief' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gratitude' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Praise' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Relationships' })).toBeInTheDocument()
  })

  it('mobile variant renders horizontal chip row with All first', () => {
    renderFilters({ variant: 'mobile' })
    const nav = screen.getByRole('navigation', { name: /filter prayer wall posts/i })
    const buttons = within(nav).getAllByRole('button')
    // "All" should be the first chip in the row
    expect(buttons[0]).toHaveTextContent('All')
  })

  it('tapping a topic clears the active post type', async () => {
    const user = userEvent.setup()
    renderFilters({ activePostType: 'prayer_request' })
    await user.click(screen.getByRole('button', { name: 'Health' }))
    expect(onSelectPostType).toHaveBeenCalledWith(null)
    expect(onSelectCategory).toHaveBeenCalledWith('health')
  })

  it('tapping a post type clears the active topic', async () => {
    const user = userEvent.setup()
    renderFilters({ activeCategory: 'family' })
    await user.click(screen.getByRole('button', { name: 'Testimonies' }))
    expect(onSelectCategory).toHaveBeenCalledWith(null)
    expect(onSelectPostType).toHaveBeenCalledWith('testimony')
  })

  it('tapping "All posts" clears both axes', async () => {
    const user = userEvent.setup()
    renderFilters({ activeCategory: 'health', activePostType: 'prayer_request' })
    await user.click(screen.getByRole('button', { name: 'All posts' }))
    expect(onSelectCategory).toHaveBeenCalledWith(null)
    expect(onSelectPostType).toHaveBeenCalledWith(null)
  })

  it('renders no count badges or parenthesized numbers', () => {
    renderFilters({ variant: 'desktop' })
    // No parenthesized digits in any button text (Gate-G-NO-METRICS-IN-SIDEBARS).
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.textContent ?? '').not.toMatch(/\(\d+\)/)
    }
  })

  it('topic list excludes Discussion (in topic group) and Other', () => {
    renderFilters({ variant: 'desktop' })
    // "Discussion" should appear only as a post-type label ("Discussions" plural),
    // not as a topic chip. The plural label disambiguates.
    expect(screen.queryByRole('button', { name: 'Discussion' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Other' })).not.toBeInTheDocument()
  })

  it('active filter button has aria-pressed=true', () => {
    renderFilters({ activeCategory: 'health' })
    const healthBtn = screen.getByRole('button', { name: 'Health' })
    expect(healthBtn).toHaveAttribute('aria-pressed', 'true')
    const familyBtn = screen.getByRole('button', { name: 'Family' })
    expect(familyBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
