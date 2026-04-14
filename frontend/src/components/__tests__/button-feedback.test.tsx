import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button press feedback', () => {
  it('primary Button has active:scale-[0.98] for press feedback', () => {
    const { container } = render(<Button>Help Me Pray</Button>)
    const btn = container.querySelector('button')!
    expect(btn.className).toContain('active:scale-[0.98]')
  })

  it('primary Button uses transition-[colors,transform] for combined transitions', () => {
    const { container } = render(<Button>Save Entry</Button>)
    const btn = container.querySelector('button')!
    expect(btn.className).toContain('transition-[colors,transform]')
  })

  it('primary Button uses duration-fast token', () => {
    const { container } = render(<Button>Submit</Button>)
    const btn = container.querySelector('button')!
    expect(btn.className).toContain('duration-fast')
  })

  it('disabled Button still has active:scale but is visually inert via disabled styles', () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const btn = container.querySelector('button')!
    // The class is present — browser ignores :active on disabled buttons natively
    expect(btn.className).toContain('disabled:cursor-not-allowed')
    expect(btn.className).toContain('disabled:opacity-50')
  })
})
