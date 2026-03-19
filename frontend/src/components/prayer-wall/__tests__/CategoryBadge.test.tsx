import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryBadge } from '../CategoryBadge'

describe('CategoryBadge', () => {
  it('renders label text', () => {
    render(<CategoryBadge category="health" />)
    expect(screen.getByText('Health')).toBeInTheDocument()
  })

  it('with onClick renders as button', () => {
    render(<CategoryBadge category="health" onClick={vi.fn()} />)
    const button = screen.getByRole('button', { name: /filter by health/i })
    expect(button).toBeInTheDocument()
  })

  it('without onClick renders as span', () => {
    render(<CategoryBadge category="health" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Health').tagName).toBe('SPAN')
  })

  it('click calls onClick with category', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<CategoryBadge category="grief" onClick={onClick} />)
    await user.click(screen.getByText('Grief'))
    expect(onClick).toHaveBeenCalledWith('grief')
  })
})
