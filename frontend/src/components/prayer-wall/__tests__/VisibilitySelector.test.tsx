import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { VisibilitySelector } from '../VisibilitySelector'
import { VISIBILITY_OPTIONS } from '@/constants/visibility-options'

describe('VisibilitySelector', () => {
  it('renders three chips with the canonical Copy Deck labels', () => {
    render(<VisibilitySelector value="public" onChange={() => undefined} />)
    expect(screen.getByRole('radio', { name: /public/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /friends/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /private/i })).toBeInTheDocument()
  })

  it('exposes role="radiogroup" with aria-label="Post visibility"', () => {
    render(<VisibilitySelector value="public" onChange={() => undefined} />)
    const group = screen.getByRole('radiogroup', { name: 'Post visibility' })
    expect(group).toBeInTheDocument()
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
  })

  it('marks the matching chip aria-checked="true" and others "false"', () => {
    render(<VisibilitySelector value="friends" onChange={() => undefined} />)
    expect(screen.getByRole('radio', { name: /public/i })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByRole('radio', { name: /friends/i })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('radio', { name: /private/i })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('clicking a chip invokes onChange with the matching value', () => {
    const onChange = vi.fn()
    render(<VisibilitySelector value="public" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: /friends/i }))
    expect(onChange).toHaveBeenLastCalledWith('friends')

    fireEvent.click(screen.getByRole('radio', { name: /private/i }))
    expect(onChange).toHaveBeenLastCalledWith('private')

    fireEvent.click(screen.getByRole('radio', { name: /public/i }))
    expect(onChange).toHaveBeenLastCalledWith('public')
  })

  it('exposes the Copy Deck tooltip strings via the title attribute', () => {
    render(<VisibilitySelector value="public" onChange={() => undefined} />)
    for (const opt of VISIBILITY_OPTIONS) {
      const chip = screen.getByRole('radio', { name: new RegExp(opt.label, 'i') })
      expect(chip).toHaveAttribute('title', opt.tooltip)
    }
  })

  it('ArrowRight moves keyboard focus to the next chip; Enter selects the focused chip', () => {
    const onChange = vi.fn()
    render(<VisibilitySelector value="public" onChange={onChange} />)

    const publicChip = screen.getByRole('radio', { name: /public/i })
    const friendsChip = screen.getByRole('radio', { name: /friends/i })

    publicChip.focus()
    expect(document.activeElement).toBe(publicChip)

    fireEvent.keyDown(publicChip, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(friendsChip)

    fireEvent.keyDown(friendsChip, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('friends')
  })

  it('ArrowLeft on the first chip wraps to the last chip', () => {
    render(<VisibilitySelector value="public" onChange={() => undefined} />)

    const publicChip = screen.getByRole('radio', { name: /public/i })
    const privateChip = screen.getByRole('radio', { name: /private/i })

    publicChip.focus()
    fireEvent.keyDown(publicChip, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(privateChip)
  })

  it('disabled prop disables the fieldset', () => {
    const { container } = render(
      <VisibilitySelector value="public" onChange={() => undefined} disabled />
    )
    const fieldset = container.querySelector('fieldset')
    expect(fieldset).toBeDisabled()
  })
})
