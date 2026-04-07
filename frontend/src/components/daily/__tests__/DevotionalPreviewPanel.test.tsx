import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DevotionalPreviewPanel } from '../DevotionalPreviewPanel'
import type { DevotionalSnapshot } from '@/types/daily-experience'

const mockSnapshot: DevotionalSnapshot = {
  date: '2026-04-06',
  title: 'Anchored in Trust',
  passage: {
    reference: 'Proverbs 3:5-6',
    verses: [
      { number: 5, text: "Trust in Yahweh with all your heart, and don't lean on your own understanding." },
      { number: 6, text: 'In all your ways acknowledge him, and he will make your paths straight.' },
    ],
  },
  reflection: [
    'There are seasons in life when the road ahead feels unclear.',
    'Trusting God does not mean you stop thinking or planning.',
  ],
  reflectionQuestion: 'Where in your life are you relying on your own understanding instead of trusting God?',
  quote: {
    text: 'God never made a promise that was too good to be true.',
    attribution: 'D.L. Moody',
  },
}

const mockDismiss = vi.fn()

function getExpandButton() {
  return screen.getByRole('button', { name: /today's devotional/i })
}

describe('DevotionalPreviewPanel', () => {
  beforeEach(() => {
    mockDismiss.mockClear()
  })

  it('renders collapsed pill with icon, label, title, and reference', () => {
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    expect(screen.getByText(/today's devotional/i)).toBeInTheDocument()
    // Title and reference appear in the pill (combined with middot)
    expect(screen.getByText(/Anchored in Trust/)).toBeInTheDocument()
    // Reference also appears as expanded passage label, so use getAllByText
    expect(screen.getAllByText(/Proverbs 3:5-6/).length).toBeGreaterThanOrEqual(1)
  })

  it('does not show expanded content by default', () => {
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const button = getExpandButton()
    const contentId = button.getAttribute('aria-controls')!
    const content = document.getElementById(contentId)
    expect(content).toHaveAttribute('aria-hidden', 'true')
  })

  it('expands on click to show passage', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    await user.click(getExpandButton())

    expect(screen.getByText(/Trust in Yahweh with all your heart/)).toBeInTheDocument()
    expect(screen.getByText(/In all your ways acknowledge him/)).toBeInTheDocument()
  })

  it('expands to show reflection question in callout', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    await user.click(getExpandButton())

    expect(screen.getByText('Something to think about')).toBeInTheDocument()
    expect(screen.getByText(/relying on your own understanding/)).toBeInTheDocument()
  })

  it('expands to show reflection paragraphs', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    await user.click(getExpandButton())

    expect(screen.getByText(/seasons in life when the road ahead/)).toBeInTheDocument()
    expect(screen.getByText(/Trusting God does not mean you stop thinking/)).toBeInTheDocument()
  })

  it('expands to show quote with attribution', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    await user.click(getExpandButton())

    expect(screen.getByText(/God never made a promise that was too good to be true/)).toBeInTheDocument()
    expect(screen.getByText(/D\.L\. Moody/)).toBeInTheDocument()
  })

  it('collapses on second click', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const button = getExpandButton()
    await user.click(button)
    await user.click(button)

    const contentId = button.getAttribute('aria-controls')!
    const content = document.getElementById(contentId)
    expect(content).toHaveAttribute('aria-hidden', 'true')
  })

  it('aria-expanded toggles correctly', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const button = getExpandButton()
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('aria-controls matches content id', () => {
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const button = getExpandButton()
    const controlsId = button.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    const content = document.getElementById(controlsId!)
    expect(content).toBeInTheDocument()
  })

  it('chevron rotates on expand', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    // Find chevron by the second SVG (BookOpen is first)
    const svgs = container.querySelectorAll('svg')
    const chevron = svgs[1]

    expect(chevron.className.baseVal).not.toContain('rotate-180')

    await user.click(getExpandButton())
    expect(chevron.className.baseVal).toContain('rotate-180')
  })

  it('has sticky positioning classes', () => {
    const { container } = render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('sticky')
    expect(outer.className).toContain('top-2')
    expect(outer.className).toContain('z-30')
  })

  it('keyboard: Enter toggles panel', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const button = getExpandButton()
    button.focus()

    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('title truncates with long text', () => {
    const longSnapshot: DevotionalSnapshot = {
      ...mockSnapshot,
      title: 'A Very Long Devotional Title That Should Be Truncated When Displayed In The Collapsed Pill',
    }
    render(<DevotionalPreviewPanel snapshot={longSnapshot} onDismiss={mockDismiss} />)

    const titleElement = screen.getByText(/A Very Long Devotional Title/)
    expect(titleElement.className).toContain('truncate')
  })

  it('dismiss button calls onDismiss', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    await user.click(screen.getByRole('button', { name: /dismiss devotional preview/i }))
    expect(mockDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismiss button does not toggle expand', async () => {
    const user = userEvent.setup()
    render(<DevotionalPreviewPanel snapshot={mockSnapshot} onDismiss={mockDismiss} />)

    const expandButton = getExpandButton()
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(screen.getByRole('button', { name: /dismiss devotional preview/i }))
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
  })
})
