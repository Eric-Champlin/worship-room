import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renders as button by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button', { name: 'Click' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it('renders primary variant with bg-primary, text-white, rounded-md', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary')
    expect(btn.className).toContain('text-white')
    expect(btn.className).toContain('rounded-md')
  })

  it('renders light variant with white pill classes', () => {
    render(<Button variant="light">Light</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('text-primary')
    expect(btn.className).toContain('rounded-full')
    expect(btn.className).toContain('min-h-[44px]')
  })

  it('light size="sm" uses px-4 py-2 text-sm', () => {
    render(
      <Button variant="light" size="sm">
        Small
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-4')
    expect(btn.className).toContain('py-2')
    expect(btn.className).toContain('text-sm')
  })

  it('light size="md" uses px-6 py-2.5', () => {
    render(
      <Button variant="light" size="md">
        Med
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-6')
    expect(btn.className).toContain('py-2.5')
  })

  it('asChild renders single child element with merged classes', () => {
    render(
      <Button variant="light" asChild>
        <a href="/x">Go</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/x')
    expect(link.className).toContain('bg-white')
    expect(link.className).toContain('rounded-full')
  })

  it('asChild preserves child className alongside Button classes', () => {
    render(
      <Button variant="light" asChild>
        <a href="/x" className="custom-class">
          Go
        </a>
      </Button>,
    )
    const link = screen.getByRole('link')
    expect(link.className).toContain('bg-white')
    expect(link.className).toContain('custom-class')
  })

  it('asChild forwards ref to child element', () => {
    const ref = createRef<HTMLAnchorElement>()
    render(
      <Button variant="light" asChild ref={ref as unknown as React.Ref<HTMLButtonElement>}>
        <a href="/x">Go</a>
      </Button>,
    )
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement)
  })

  it('asChild throws on multiple children', () => {
    // Children.only throws synchronously; suppress console.error noise from React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(
        <Button asChild>
          <a href="/x">A</a>
          <a href="/y">B</a>
        </Button>,
      ),
    ).toThrow()
    spy.mockRestore()
  })

  it('disabled state applies cursor-not-allowed class', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('disabled:cursor-not-allowed')
    expect(btn.className).toContain('disabled:opacity-50')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('has active:scale-[0.98] for press feedback', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('active:scale-[0.98]')
  })

  it('has focus-visible ring classes', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('focus-visible:ring-2')
    expect(btn.className).toContain('focus-visible:ring-primary')
  })
})
