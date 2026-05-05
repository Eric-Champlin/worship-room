import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisitButton, VisitNote, useVisitState } from '../VisitButton'

vi.mock('@/utils/date', () => ({
  getLocalDateString: () => '2026-03-24',
}))

const defaultProps = {
  placeId: 'church-1',
  placeName: 'First Baptist Church',
  placeType: 'church' as const,
  onVisit: vi.fn(),
}

// Test wrapper that uses the hook and renders both button + note
function TestVisitButton(props: typeof defaultProps) {
  const visitState = useVisitState(props)
  return (
    <>
      <VisitButton visitState={visitState} />
      <VisitNote visitState={visitState} />
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('VisitButton', () => {
  it('renders "I visited" default state with no prior visits', () => {
    render(<TestVisitButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /mark .* as visited/i })).toBeInTheDocument()
  })

  it('shows confirmed state after click', async () => {
    const user = userEvent.setup()
    render(<TestVisitButton {...defaultProps} />)
    const button = screen.getByRole('button', { name: /mark .* as visited/i })
    await user.click(button)
    expect(screen.getByRole('button', { name: /visited/i })).toBeInTheDocument()
  })

  it('calls onVisit callback on click', async () => {
    const user = userEvent.setup()
    const onVisit = vi.fn()
    render(<TestVisitButton {...defaultProps} onVisit={onVisit} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    expect(onVisit).toHaveBeenCalledWith('church-1', 'First Baptist Church')
  })

  it('expands note textarea on visit', async () => {
    const user = userEvent.setup()
    render(<TestVisitButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    expect(screen.getByPlaceholderText('How was your experience?')).toBeInTheDocument()
  })

  it('limits note to 300 characters', async () => {
    const user = userEvent.setup()
    render(<TestVisitButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    const textarea = screen.getByPlaceholderText('How was your experience?')
    const longText = 'a'.repeat(350)
    await user.type(textarea, longText)
    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(300)
  })

  it('shows char counter', async () => {
    const user = userEvent.setup()
    render(<TestVisitButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    expect(screen.getByText('0/300')).toBeInTheDocument()
  })

  it('does not call onVisit twice for same place', async () => {
    const user = userEvent.setup()
    const onVisit = vi.fn()
    render(<TestVisitButton {...defaultProps} onVisit={onVisit} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    expect(onVisit).toHaveBeenCalledTimes(1)
    // Second click toggles note, not a new visit
    await user.click(screen.getByRole('button', { name: /visited/i }))
    expect(onVisit).toHaveBeenCalledTimes(1)
  })

  // Spec 5 Step 12 — Tonal Icon Pattern: visited state uses text-amber-300

  it('visited state container uses text-amber-300 (Tonal Icon Pattern; Check icon inherits via currentColor)', async () => {
    const user = userEvent.setup()
    render(<TestVisitButton {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /mark .* as visited/i }))
    const button = screen.getByRole('button', { name: /visited/i })
    expect(button.className).toContain('text-amber-300')
    expect(button.className).not.toContain('text-success')
  })

  it('unvisited state preserves border + text-white/50 + hover:text-primary', () => {
    render(<TestVisitButton {...defaultProps} />)
    const button = screen.getByRole('button', { name: /mark .* as visited/i })
    expect(button.className).toContain('border-white/10')
    expect(button.className).toContain('text-white/50')
    expect(button.className).toContain('hover:text-primary')
  })
})
