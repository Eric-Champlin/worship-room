import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { addPrayer, markAnswered, MAX_PRAYERS } from '@/services/prayer-list-storage'
import type { PersonalPrayer } from '@/types/personal-prayer'
import { MyPrayers } from '../MyPrayers'

const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockAuthFn,
}))

const mockUseAuth = mockAuthFn

function renderMyPrayers() {
  return render(
    <MemoryRouter
      initialEntries={['/my-prayers']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Routes>
          <Route path="/my-prayers" element={<MyPrayers />} />
          <Route path="/" element={<div>Landing Page</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )
}

function seedPrayer(overrides: Partial<Omit<PersonalPrayer, 'id' | 'createdAt' | 'updatedAt' | 'answeredAt' | 'answeredNote' | 'lastPrayedAt'>> = {}) {
  return addPrayer({
    title: overrides.title ?? 'Test Prayer',
    description: overrides.description ?? 'Test description',
    category: overrides.category ?? 'health',
  })
}

describe('MyPrayers Page', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  // --- Auth gating ---

  describe('Auth gating', () => {
    it('redirects to / when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null as unknown as { name: string; id: string },
        login: vi.fn(),
        logout: vi.fn(),
      })
      renderMyPrayers()
      expect(screen.getByText('Landing Page')).toBeInTheDocument()
    })

    it('renders page when authenticated', () => {
      renderMyPrayers()
      expect(screen.getByText('My Prayers')).toBeInTheDocument()
      expect(screen.getByText('Your personal conversation with God.')).toBeInTheDocument()
    })
  })

  // --- Empty state ---

  describe('Empty state', () => {
    it('shows empty state with correct text and CTA', () => {
      renderMyPrayers()
      expect(screen.getByText('Your prayer list is empty')).toBeInTheDocument()
      expect(screen.getByText("Start tracking what's on your heart")).toBeInTheDocument()
    })

    it('empty state CTA opens composer', async () => {
      const user = userEvent.setup()
      renderMyPrayers()
      // There are two "Add Prayer" buttons: action bar + empty state CTA. Click the first one visible.
      const addButtons = screen.getAllByRole('button', { name: /Add Prayer/i })
      await user.click(addButtons[0])
      expect(screen.getByText('Add a Prayer')).toBeInTheDocument()
    })
  })

  // --- CRUD flows ---

  describe('CRUD flow', () => {
    it('adding prayer shows it in the list', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      // Open composer
      await user.click(screen.getAllByText('Add Prayer')[0])

      // Fill form
      await user.type(screen.getByLabelText('Title'), 'Healing for Mom')
      await user.type(screen.getByLabelText('Details (optional)'), 'She needs surgery')
      await user.click(screen.getByText('Health'))
      await user.click(screen.getByText('Save Prayer'))

      // Verify card appears
      expect(screen.getByText('Healing for Mom')).toBeInTheDocument()
      expect(screen.getByText('She needs surgery')).toBeInTheDocument()
    })

    it('adding prayer with title and category only (no description)', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getAllByText('Add Prayer')[0])
      await user.type(screen.getByLabelText('Title'), 'Quick prayer')
      await user.click(screen.getByText('Praise'))
      await user.click(screen.getByText('Save Prayer'))

      expect(screen.getByText('Quick prayer')).toBeInTheDocument()
    })

    it('editing prayer updates display', async () => {
      seedPrayer({ title: 'Original Title' })
      const user = userEvent.setup()
      renderMyPrayers()

      // Click Edit (desktop)
      await user.click(screen.getByLabelText('Edit prayer'))

      // Update title
      const titleInput = screen.getByDisplayValue('Original Title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Title')
      await user.click(screen.getByText('Save'))

      expect(screen.getByText('Updated Title')).toBeInTheDocument()
      expect(screen.queryByText('Original Title')).not.toBeInTheDocument()
    })

    it('deleting prayer removes from list', async () => {
      seedPrayer({ title: 'To Be Deleted' })
      const user = userEvent.setup()
      renderMyPrayers()

      expect(screen.getByText('To Be Deleted')).toBeInTheDocument()

      // Click Delete (desktop)
      await user.click(screen.getByLabelText('Delete prayer'))

      // Confirm in dialog
      expect(screen.getByText('Remove this prayer?')).toBeInTheDocument()
      await user.click(screen.getByText('Remove'))

      expect(screen.queryByText('To Be Deleted')).not.toBeInTheDocument()
    })

    it('marking answered updates card appearance', async () => {
      seedPrayer({ title: 'Answered Prayer' })
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getByLabelText('Mark as answered'))
      await user.type(screen.getByLabelText('Testimony note'), 'God provided!')
      await user.click(screen.getByText('Confirm'))

      // Dismiss celebration overlay first
      await user.click(screen.getByText('Praise God!'))

      // Switch to "Answered" filter to see the prayer
      await user.click(screen.getByText(/^Answered/))
      expect(screen.getByText('Answered Prayer')).toBeInTheDocument()
      expect(screen.getByText('Answered')).toBeInTheDocument()
      expect(screen.getByText('God provided!')).toBeInTheDocument()
    })
  })

  // --- Answered Prayers Counter ---

  describe('Answered prayers counter', () => {
    it('is hidden when 0 answered', () => {
      seedPrayer({ title: 'Active Prayer' })
      renderMyPrayers()

      expect(screen.queryByTestId('answered-count')).not.toBeInTheDocument()
    })

    it('shows count when >= 1 answered', () => {
      const prayer = seedPrayer({ title: 'Answered One' })
      if (prayer) {
        markAnswered(prayer.id, 'Done')
      }
      renderMyPrayers()

      expect(screen.getByTestId('answered-count')).toHaveTextContent('1')
      expect(screen.getByText('prayer answered')).toBeInTheDocument()
    })

    it('uses plural for multiple answered', () => {
      for (let i = 0; i < 3; i++) {
        const p = seedPrayer({ title: `Prayer ${i}` })
        if (p) markAnswered(p.id)
      }
      renderMyPrayers()

      expect(screen.getByTestId('answered-count')).toHaveTextContent('3')
      expect(screen.getByText('prayers answered')).toBeInTheDocument()
    })

    it('shows encouraging message at 5+ answered', () => {
      for (let i = 0; i < 5; i++) {
        const p = seedPrayer({ title: `Prayer ${i}` })
        if (p) markAnswered(p.id)
      }
      renderMyPrayers()

      expect(
        screen.getByText('God is faithful. Keep bringing your requests to Him.'),
      ).toBeInTheDocument()
    })

    it('does not show encouraging message below 5', () => {
      for (let i = 0; i < 4; i++) {
        const p = seedPrayer({ title: `Prayer ${i}` })
        if (p) markAnswered(p.id)
      }
      renderMyPrayers()

      expect(
        screen.queryByText('God is faithful. Keep bringing your requests to Him.'),
      ).not.toBeInTheDocument()
    })
  })

  // --- Filtering ---

  describe('Filtering', () => {
    it('"Active" filter selected by default', () => {
      renderMyPrayers()
      const activeFilter = screen.getByRole('radio', { name: /^Active/ })
      expect(activeFilter).toHaveAttribute('aria-checked', 'true')
    })

    it('filter counts are correct', () => {
      seedPrayer({ title: 'Active 1' })
      seedPrayer({ title: 'Active 2' })
      renderMyPrayers()

      expect(screen.getByText('All (2)')).toBeInTheDocument()
      expect(screen.getByText('Active (2)')).toBeInTheDocument()
      expect(screen.getByText('Answered (0)')).toBeInTheDocument()
    })

    it('no-filter-results message shows when filter has 0 matches', async () => {
      seedPrayer({ title: 'Active Prayer' })
      const user = userEvent.setup()
      renderMyPrayers()

      // Switch to Answered filter — no answered prayers exist
      await user.click(screen.getByRole('radio', { name: /^Answered/ }))

      expect(screen.getByText('No answered prayers')).toBeInTheDocument()
    })
  })

  // --- Validation ---

  describe('Validation', () => {
    it('cannot submit without title', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getAllByText('Add Prayer')[0])
      await user.click(screen.getByText('Health'))
      await user.click(screen.getByText('Save Prayer'))

      expect(screen.getByText('Please add a title')).toBeInTheDocument()
    })

    it('cannot submit without category', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getAllByText('Add Prayer')[0])
      await user.type(screen.getByLabelText('Title'), 'Test')
      await user.click(screen.getByText('Save Prayer'))

      expect(screen.getByText('Please choose a category')).toBeInTheDocument()
    })
  })

  // --- Crisis detection ---

  describe('Crisis detection', () => {
    it('crisis banner appears when crisis keywords in title', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getAllByText('Add Prayer')[0])
      await user.type(screen.getByLabelText('Title'), 'I want to kill myself')

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('crisis banner appears when crisis keywords in description', async () => {
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getAllByText('Add Prayer')[0])
      await user.type(screen.getByLabelText('Details (optional)'), 'I want to end it all')

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  // --- Accessibility ---

  describe('Accessibility', () => {
    it('filter pills have correct ARIA attributes', () => {
      renderMyPrayers()
      const radiogroup = screen.getByRole('radiogroup')
      expect(radiogroup).toHaveAttribute('aria-label', 'Filter prayers')

      const radios = within(radiogroup).getAllByRole('radio')
      expect(radios).toHaveLength(3)
    })

    it('delete dialog has role="alertdialog"', async () => {
      seedPrayer({ title: 'Test' })
      const user = userEvent.setup()
      renderMyPrayers()

      await user.click(screen.getByLabelText('Delete prayer'))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('all action buttons have accessible names', () => {
      seedPrayer({ title: 'Test' })
      renderMyPrayers()
      expect(screen.getByLabelText('Pray for this')).toBeInTheDocument()
      expect(screen.getByLabelText('Edit prayer')).toBeInTheDocument()
      expect(screen.getByLabelText('Mark as answered')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete prayer')).toBeInTheDocument()
    })
  })

  // --- Edge cases ---

  describe('Edge cases', () => {
    it('200 prayer limit shows message', { timeout: 15000 }, async () => {
      // Seed 200 prayers directly via localStorage
      const prayers: PersonalPrayer[] = Array.from({ length: MAX_PRAYERS }, (_, i) => ({
        id: `prayer-${i}`,
        title: `Prayer ${i}`,
        description: '',
        category: 'health' as const,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        answeredAt: null,
        answeredNote: null,
        lastPrayedAt: null,
      }))
      localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))

      const user = userEvent.setup()
      renderMyPrayers()

      // Open composer via action bar "Add Prayer" button
      const addButtons = screen.getAllByText('Add Prayer')
      await user.click(addButtons[0])

      await user.type(screen.getByLabelText('Title'), 'One more')
      // Select category by aria-pressed attribute on the composer's category pills
      const composerPills = screen.getAllByRole('button', { name: 'Health' })
      // Click the first pill that has aria-pressed (composer pill, not category badges)
      const pill = composerPills.find((p) => p.hasAttribute('aria-pressed'))
      await user.click(pill!)
      await user.click(screen.getByText('Save Prayer'))

      // Should see error toast (toast text in DOM)
      expect(screen.getByText(/200 prayer limit/)).toBeInTheDocument()
    })

    it('corrupted localStorage recovers to empty array', () => {
      localStorage.setItem('wr_prayer_list', '{not valid json!!!')
      renderMyPrayers()
      // Should show empty state, not crash
      expect(screen.getByText('Your prayer list is empty')).toBeInTheDocument()
    })
  })
})
