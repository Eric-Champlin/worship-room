import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CreatePlanFlow } from '../CreatePlanFlow'

const mockNavigate = vi.fn()
const mockShowToast = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/utils/plan-matcher', () => ({
  matchPlanByKeywords: (input: string) => {
    if (input.toLowerCase().includes('anxiety')) return 'finding-peace-in-anxiety'
    return 'learning-to-trust-god'
  },
}))

vi.mock('@/utils/custom-plans-storage', () => ({
  addCustomPlanId: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

function renderFlow(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CreatePlanFlow onClose={onClose} />
      </MemoryRouter>,
    ),
  }
}

describe('CreatePlanFlow', () => {
  // --- Step 1 ---

  it('renders Step 1 with heading and textarea', () => {
    renderFlow()
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("I'm struggling with anxiety about my job...")).toBeInTheDocument()
    // CharacterCount has visibleAt=300, so it's not visible at 0 characters
    expect(screen.getByLabelText("What's on your heart")).toBeInTheDocument()
  })

  it('topic chip pre-fills textarea', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    const textarea = screen.getByPlaceholderText("I'm struggling with anxiety about my job...") as HTMLTextAreaElement
    expect(textarea.value).toBe("I've been feeling anxious about...")
  })

  it('Next button disabled when textarea empty', () => {
    renderFlow()
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeDisabled()
  })

  it('Next button enabled when textarea has text', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.type(screen.getByPlaceholderText("I'm struggling with anxiety about my job..."), 'test')
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()
  })

  it('character count not visible below visibleAt threshold', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.type(screen.getByPlaceholderText("I'm struggling with anxiety about my job..."), 'hello')
    // CharacterCount has visibleAt=300, so at 5 characters it returns null
    expect(screen.queryByText(/5 \/ 500/)).not.toBeInTheDocument()
  })

  it('shows all 6 topic chips', () => {
    renderFlow()
    expect(screen.getByText('Anxiety')).toBeInTheDocument()
    expect(screen.getByText('Grief')).toBeInTheDocument()
    expect(screen.getByText('Relationship struggles')).toBeInTheDocument()
    expect(screen.getByText('Finding purpose')).toBeInTheDocument()
    expect(screen.getByText('Strengthening faith')).toBeInTheDocument()
    expect(screen.getByText('Forgiveness')).toBeInTheDocument()
  })

  it('renders progress dots with Step 1 active', () => {
    renderFlow()
    const dots = screen.getByRole('group', { name: /Step 1 of 3/ })
    expect(dots).toBeInTheDocument()
  })

  // --- Step 2 ---

  it('Step 2 renders duration cards after Next', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('How long of a journey?')).toBeInTheDocument()
    expect(screen.getByText('Quick Focus')).toBeInTheDocument()
    expect(screen.getByText('Deeper Dive')).toBeInTheDocument()
    expect(screen.getByText('Full Transformation')).toBeInTheDocument()
  })

  it('duration card selection is radio behavior', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const quickFocus = screen.getByText('Quick Focus').closest('button')!
    const deeperDive = screen.getByText('Deeper Dive').closest('button')!

    await user.click(quickFocus)
    expect(quickFocus).toHaveAttribute('aria-pressed', 'true')
    expect(deeperDive).toHaveAttribute('aria-pressed', 'false')

    await user.click(deeperDive)
    expect(quickFocus).toHaveAttribute('aria-pressed', 'false')
    expect(deeperDive).toHaveAttribute('aria-pressed', 'true')
  })

  it('Generate button disabled when no duration selected', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('button', { name: /Generate My Plan/ })).toBeDisabled()
  })

  it('Generate button enabled when duration selected', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByText('Quick Focus').closest('button')!)
    expect(screen.getByRole('button', { name: /Generate My Plan/ })).not.toBeDisabled()
  })

  // --- Step 3 ---

  it('Step 3 shows loading animation and verse', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByText('Quick Focus').closest('button')!)
    await user.click(screen.getByRole('button', { name: /Generate My Plan/ }))

    expect(screen.getByText('Creating a Scripture journey just for you...')).toBeInTheDocument()
    expect(screen.getByText(/I know the plans I have for you/)).toBeInTheDocument()
    expect(screen.getByText(/Jeremiah 29:11 WEB/)).toBeInTheDocument()
  })

  // --- Navigation ---

  it('Escape navigates back from Step 1', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onClose = vi.fn()
    renderFlow(onClose)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape navigates back from Step 2 to Step 1', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('How long of a journey?')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
  })

  it('back arrow navigates from Step 2 to Step 1', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.click(screen.getByLabelText('Go back'))
    expect(screen.getByText("What's on your heart?")).toBeInTheDocument()
  })

  it('back arrow not visible during Step 3', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByText('Quick Focus').closest('button')!)
    await user.click(screen.getByRole('button', { name: /Generate My Plan/ }))

    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
  })

  it('progress dots update with current step', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderFlow()
    expect(screen.getByRole('group', { name: /Step 1 of 3/ })).toBeInTheDocument()

    await user.click(screen.getByText('Anxiety'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('group', { name: /Step 2 of 3/ })).toBeInTheDocument()
  })
})
