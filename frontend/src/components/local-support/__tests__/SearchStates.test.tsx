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

    // Spec 5 Step 10 — Try Again uses subtle Button variant
    it('Try Again button uses subtle Button variant (bg-white/[0.07] + text-white)', () => {
      render(<SearchError message="x" onRetry={vi.fn()} />)
      const button = screen.getByRole('button', { name: 'Try Again' })
      expect(button.className).toContain('bg-white/[0.07]')
      expect(button.className).toContain('text-white')
      expect(button.className).toContain('rounded-full')
      expect(button.className).toContain('min-h-[44px]')
      expect(button.className).not.toContain('text-primary')
    })

    it('AlertCircle preserves text-danger semantic color (Decision 7 exception)', () => {
      const { container } = render(<SearchError message="x" onRetry={vi.fn()} />)
      const alertIcon = container.querySelector('svg')
      expect(alertIcon?.getAttribute('class')).toContain('text-danger')
    })
  })

  describe('ListingSkeleton', () => {
    it('renders 3 skeleton cards via FrostedCard default chrome (Spec 5 Step 6)', () => {
      const { container } = render(<ListingSkeleton />)
      // FrostedCard default variant uses rounded-3xl. The three skeleton cards
      // are the direct children of the role="status" wrapper that carry both
      // motion-safe:animate-pulse AND rounded-3xl.
      const skeletonCards = container.querySelectorAll('.rounded-3xl.motion-safe\\:animate-pulse')
      expect(skeletonCards).toHaveLength(3)
    })

    it('exposes role=status with sr-only Loading announcer', () => {
      render(<ListingSkeleton />)
      const status = screen.getByRole('status', { name: /loading results/i })
      expect(status).toBeInTheDocument()
      expect(screen.getByText(/loading results/i)).toBeInTheDocument()
    })
  })
})
