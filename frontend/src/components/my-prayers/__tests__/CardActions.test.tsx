import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { PrayerCardActions } from '../PrayerCardActions'
import { PrayerCardOverflowMenu } from '../PrayerCardOverflowMenu'
import { EditPrayerForm } from '../EditPrayerForm'
import { MarkAnsweredForm } from '../MarkAnsweredForm'
import { DeletePrayerDialog } from '../DeletePrayerDialog'
import type { PersonalPrayer } from '@/types/personal-prayer'

vi.mock('@/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({
    showModal: false,
    confirmLeave: vi.fn(),
    cancelLeave: vi.fn(),
  }),
}))

function makePrayer(overrides: Partial<PersonalPrayer> = {}): PersonalPrayer {
  return {
    id: 'test-1',
    title: 'Healing for Mom',
    description: 'Prayer details here',
    category: 'health',
    status: 'active',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z',
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    ...overrides,
  }
}

const defaultCallbacks = {
  onPray: vi.fn(),
  onEdit: vi.fn(),
  onMarkAnswered: vi.fn(),
  onDelete: vi.fn(),
}

describe('PrayerCardActions (desktop)', () => {
  it('renders Pray, Edit, Mark Answered, Delete buttons for active prayer', () => {
    render(<PrayerCardActions prayer={makePrayer()} {...defaultCallbacks} />)
    expect(screen.getByLabelText('Pray for this')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit prayer')).toBeInTheDocument()
    expect(screen.getByLabelText('Mark as answered')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete prayer')).toBeInTheDocument()
  })

  it('hides Mark Answered for answered prayers', () => {
    render(<PrayerCardActions prayer={makePrayer({ status: 'answered' })} {...defaultCallbacks} />)
    expect(screen.queryByLabelText('Mark as answered')).not.toBeInTheDocument()
  })

  it('Pray button calls onPray', async () => {
    const onPray = vi.fn()
    const user = userEvent.setup()
    render(<PrayerCardActions prayer={makePrayer()} {...defaultCallbacks} onPray={onPray} />)
    await user.click(screen.getByLabelText('Pray for this'))
    expect(onPray).toHaveBeenCalled()
  })
})

describe('PrayerCardOverflowMenu (mobile)', () => {
  it('renders 3-dot overflow menu', () => {
    render(<PrayerCardOverflowMenu prayer={makePrayer()} {...defaultCallbacks} />)
    expect(screen.getByLabelText('Prayer actions')).toBeInTheDocument()
  })

  it('overflow menu shows all action options', async () => {
    const user = userEvent.setup()
    render(<PrayerCardOverflowMenu prayer={makePrayer()} {...defaultCallbacks} />)
    await user.click(screen.getByLabelText('Prayer actions'))
    expect(screen.getByText('Pray for this')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Mark Answered')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('click outside closes overflow menu', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <PrayerCardOverflowMenu prayer={makePrayer()} {...defaultCallbacks} />
        <button type="button">Outside</button>
      </div>,
    )
    await user.click(screen.getByLabelText('Prayer actions'))
    expect(screen.getByText('Pray for this')).toBeInTheDocument()
    await user.click(screen.getByText('Outside'))
    expect(screen.queryByText('Pray for this')).not.toBeInTheDocument()
  })
})

describe('EditPrayerForm', () => {
  it('pre-fills title, description, category', () => {
    render(
      <EditPrayerForm
        prayer={makePrayer()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('Healing for Mom')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Prayer details here')).toBeInTheDocument()
    const healthPill = screen.getByRole('radio', { name: 'Health' })
    expect(healthPill).toHaveAttribute('aria-checked', 'true')
  })

  it('validates title required', async () => {
    const user = userEvent.setup()
    render(
      <EditPrayerForm
        prayer={makePrayer()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    await user.clear(screen.getByDisplayValue('Healing for Mom'))
    await user.click(screen.getByText('Save'))
    expect(screen.getByText('Give your prayer a short title')).toBeInTheDocument()
  })

  it('shows CrisisBanner on crisis keywords', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <EditPrayerForm
          prayer={makePrayer()}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    )
    await user.clear(screen.getByDisplayValue('Healing for Mom'))
    await user.type(screen.getByLabelText('Prayer title'), 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('save calls onSave with updates', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <EditPrayerForm
        prayer={makePrayer()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )
    await user.clear(screen.getByDisplayValue('Healing for Mom'))
    await user.type(screen.getByLabelText('Prayer title'), 'Updated Title')
    await user.click(screen.getByText('Family'))
    await user.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith({
      title: 'Updated Title',
      description: 'Prayer details here',
      category: 'family',
    })
  })
})

describe('MarkAnsweredForm', () => {
  it('has optional testimony input', () => {
    render(<MarkAnsweredForm onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('How God answered')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('What happened?')).toBeInTheDocument()
  })

  it('shows CrisisBanner on crisis keywords', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MarkAnsweredForm onConfirm={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('How God answered'), 'I want to kill myself')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('confirm calls onConfirm with note', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<MarkAnsweredForm onConfirm={onConfirm} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('How God answered'), 'God answered!')
    await user.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledWith('God answered!')
  })
})

describe('DeletePrayerDialog', () => {
  it('shows correct text', () => {
    render(<DeletePrayerDialog isOpen={true} onClose={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Remove this prayer?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('has role="alertdialog"', () => {
    render(<DeletePrayerDialog isOpen={true} onClose={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('Remove button calls onDelete', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<DeletePrayerDialog isOpen={true} onClose={vi.fn()} onDelete={onDelete} />)
    await user.click(screen.getByText('Remove'))
    expect(onDelete).toHaveBeenCalled()
  })

  it('Cancel closes dialog', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DeletePrayerDialog isOpen={true} onClose={onClose} onDelete={vi.fn()} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not render when not open', () => {
    render(<DeletePrayerDialog isOpen={false} onClose={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
