import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchPrompt, NoResults, SearchError, ListingSkeleton } from '../SearchStates'

describe('SearchStates', () => {
  describe('SearchPrompt', () => {
    it('renders for churches', () => {
      render(<SearchPrompt category="churches" />)
      expect(screen.getByText(/find churches near you/i)).toBeInTheDocument()
    })

    it('renders for celebrate-recovery', () => {
      render(<SearchPrompt category="celebrate-recovery" />)
      expect(screen.getByText(/Celebrate Recovery groups/i)).toBeInTheDocument()
    })
  })

  describe('NoResults', () => {
    it('shows radius', () => {
      render(<NoResults radius={50} category="churches" />)
      expect(screen.getByText(/50 miles/)).toBeInTheDocument()
    })

    it('shows category-specific text', () => {
      render(<NoResults radius={25} category="counselors" />)
      expect(screen.getByText(/counselors/)).toBeInTheDocument()
    })
  })

  describe('SearchError', () => {
    it('renders retry button', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      render(<SearchError message="Something went wrong" onRetry={onRetry} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Try Again' }))
      expect(onRetry).toHaveBeenCalled()
    })
  })

  describe('ListingSkeleton', () => {
    it('renders 3 skeleton cards', () => {
      const { container } = render(<ListingSkeleton />)
      const skeletonCards = container.querySelectorAll('.rounded-xl')
      expect(skeletonCards).toHaveLength(3)
    })
  })
})
