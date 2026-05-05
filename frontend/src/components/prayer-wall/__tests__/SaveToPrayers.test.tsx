import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InteractionBar } from '../InteractionBar'
import { SaveToPrayersForm } from '../SaveToPrayersForm'
import { ToastProvider } from '@/components/ui/Toast'
import type { PrayerRequest, PrayerReaction } from '@/types/prayer-wall'

// Default: logged out
const mockAuth = { user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

const mockOpenAuthModal = vi.fn()
vi.mock('../AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

const mockPrayer: PrayerRequest = {
  id: 'prayer-1',
  userId: 'user-1',
  authorName: 'Sarah',
  authorAvatarUrl: null,
  isAnonymous: false,
  content: 'Please pray for my recovery from surgery. I am feeling anxious and need strength to get through this difficult time.',
  category: 'health',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-02-24T14:30:00Z',
  lastActivityAt: '2026-02-24T14:30:00Z',
  prayingCount: 24,
  commentCount: 3,
}

const mockReactions: PrayerReaction = {
  prayerId: 'prayer-1',
  isPraying: false,
  isBookmarked: false,
}

function renderBar(overrides?: { isSaved?: boolean; onToggleSave?: () => void }) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <InteractionBar
          prayer={mockPrayer}
          reactions={mockReactions}
          onTogglePraying={vi.fn()}
          onToggleComments={vi.fn()}
          onToggleBookmark={vi.fn()}
          isCommentsOpen={false}
          onToggleSave={overrides?.onToggleSave ?? vi.fn()}
          isSaved={overrides?.isSaved ?? false}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderForm(overrides?: Partial<React.ComponentProps<typeof SaveToPrayersForm>>) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SaveToPrayersForm
          prayerContent={mockPrayer.content}
          prayerCategory="health"
          prayerId={mockPrayer.id}
          isOpen={true}
          onSaved={overrides?.onSaved ?? vi.fn()}
          onCancel={overrides?.onCancel ?? vi.fn()}
          {...overrides}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mockAuth.isAuthenticated = false
})

describe('Save button in InteractionBar', () => {
  it('Save button renders in InteractionBar', () => {
    renderBar()
    expect(screen.getByLabelText(/save/i)).toBeInTheDocument()
  })

  it('Save button shows icon-only text on mobile', () => {
    renderBar()
    const saveText = screen.getByLabelText(/save/i).querySelector('span')
    expect(saveText?.className).toContain('hidden')
    expect(saveText?.className).toContain('sm:inline')
  })

  it('logged-out click triggers auth modal', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByLabelText(/sign in to save/i))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save prayers to your list')
  })

  it('logged-in click calls onToggleSave', async () => {
    mockAuth.isAuthenticated = true
    const onToggleSave = vi.fn()
    const user = userEvent.setup()
    renderBar({ onToggleSave })
    await user.click(screen.getByLabelText('Save to your prayer list'))
    expect(onToggleSave).toHaveBeenCalled()
  })

  it('save button changes to Saved checkmark after save', () => {
    mockAuth.isAuthenticated = true
    renderBar({ isSaved: true })
    expect(screen.getByLabelText('Saved to your prayer list')).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})

describe('SaveToPrayersForm', () => {
  it('form pre-fills title with first 100 chars', () => {
    const longContent = 'A'.repeat(200)
    render(
      <MemoryRouter>
        <ToastProvider>
          <SaveToPrayersForm
            prayerContent={longContent}
            prayerId="pw-1"
            isOpen={true}
            onSaved={vi.fn()}
            onCancel={vi.fn()}
          />
        </ToastProvider>
      </MemoryRouter>,
    )
    const input = screen.getByPlaceholderText('Prayer title...') as HTMLInputElement
    expect(input.value).toBe('A'.repeat(100))
  })

  it('form pre-selects matching category', () => {
    renderForm({ prayerCategory: 'health' })
    const healthButton = screen.getByRole('radio', { name: 'Health' })
    expect(healthButton.getAttribute('aria-checked')).toBe('true')
  })

  it('form defaults to Other when no matching category', () => {
    renderForm({ prayerCategory: undefined })
    const otherButton = screen.getByRole('radio', { name: 'Other' })
    expect(otherButton.getAttribute('aria-checked')).toBe('true')
  })

  it('save creates entry in wr_prayer_list', async () => {
    const onSaved = vi.fn()
    const user = userEvent.setup()
    renderForm({ onSaved })

    await user.click(screen.getByText('Save to My Prayers'))

    const stored = JSON.parse(localStorage.getItem('wr_prayer_list') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].sourceType).toBe('prayer_wall')
    expect(stored[0].sourceId).toBe(mockPrayer.id)
    expect(onSaved).toHaveBeenCalled()
  })

  it('save shows success toast with View link', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByText('Save to My Prayers'))

    expect(screen.getByText('Saved to your prayer list')).toBeInTheDocument()
    expect(screen.getByText('View >')).toBeInTheDocument()
  })

  it('cancel collapses form', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    renderForm({ onCancel })

    await user.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
