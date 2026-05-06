import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RadioPillGroup } from '../RadioPillGroup'

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
]

function renderGroup(value = 'a', onChange = vi.fn()) {
  return render(
    <RadioPillGroup label="Test Group" options={OPTIONS} value={value} onChange={onChange} />,
  )
}

describe('RadioPillGroup', () => {
  it('renders role="radiogroup" with role="radio" buttons', () => {
    renderGroup()
    expect(screen.getByRole('radiogroup', { name: 'Test Group' })).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('selected pill uses bg-white/15 text-white border border-white/30', () => {
    renderGroup('a')
    const selected = screen.getByRole('radio', { name: 'A' })
    expect(selected.className).toContain('bg-white/15')
    expect(selected.className).toContain('text-white')
    expect(selected.className).toContain('border-white/30')
  })

  it('unselected pill uses bg-white/5 border border-white/15 text-white/60', () => {
    renderGroup('a')
    const unselected = screen.getByRole('radio', { name: 'B' })
    expect(unselected.className).toContain('bg-white/5')
    expect(unselected.className).toContain('border-white/15')
    expect(unselected.className).toContain('text-white/60')
  })

  it('aria-checked reflects selected state', () => {
    renderGroup('b')
    expect(screen.getByRole('radio', { name: 'A' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('false')
  })

  it('tabIndex roves: selected=0, others=-1', () => {
    renderGroup('b')
    expect(screen.getByRole('radio', { name: 'A' }).tabIndex).toBe(-1)
    expect(screen.getByRole('radio', { name: 'B' }).tabIndex).toBe(0)
    expect(screen.getByRole('radio', { name: 'C' }).tabIndex).toBe(-1)
  })

  it('ArrowRight focuses next pill and calls onChange', () => {
    const onChange = vi.fn()
    renderGroup('a', onChange)
    const aBtn = screen.getByRole('radio', { name: 'A' })
    fireEvent.keyDown(aBtn, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('ArrowLeft on first wraps to last', () => {
    const onChange = vi.fn()
    renderGroup('a', onChange)
    const aBtn = screen.getByRole('radio', { name: 'A' })
    fireEvent.keyDown(aBtn, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('ArrowDown advances same as ArrowRight', () => {
    const onChange = vi.fn()
    renderGroup('a', onChange)
    const aBtn = screen.getByRole('radio', { name: 'A' })
    fireEvent.keyDown(aBtn, { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('clicking a pill calls onChange', () => {
    const onChange = vi.fn()
    renderGroup('a', onChange)
    fireEvent.click(screen.getByRole('radio', { name: 'C' }))
    expect(onChange).toHaveBeenCalledWith('c')
  })
})
