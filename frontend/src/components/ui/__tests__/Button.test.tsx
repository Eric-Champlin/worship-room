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

  describe('isLoading prop', () => {
    it('sets aria-busy and aria-disabled when loading', () => {
      render(<Button isLoading>Submit</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveAttribute('aria-busy', 'true')
      expect(btn).toHaveAttribute('aria-disabled', 'true')
    })

    it('does not set aria-busy when not loading', () => {
      render(<Button>Submit</Button>)
      const btn = screen.getByRole('button')
      expect(btn).not.toHaveAttribute('aria-busy')
      expect(btn).not.toHaveAttribute('aria-disabled')
    })

    it('disables the button so clicks do not fire', () => {
      const onClick = vi.fn()
      render(
        <Button isLoading onClick={onClick}>
          Submit
        </Button>,
      )
      const btn = screen.getByRole('button')
      expect(btn).toBeDisabled()
      fireEvent.click(btn)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('renders an embedded LoadingSpinner with the "Loading" sr-only label', () => {
      render(<Button isLoading>Submit</Button>)
      expect(screen.getByText('Loading')).toBeInTheDocument()
    })

    it('hides the children visually while keeping them in the DOM for width stability', () => {
      render(<Button isLoading>Save Entry</Button>)
      const text = screen.getByText('Save Entry')
      expect(text).toBeInTheDocument()
      const wrapper = text.closest('span')
      expect(wrapper?.className).toContain('opacity-0')
    })

    it('does not hide children when not loading', () => {
      render(<Button>Save Entry</Button>)
      const btn = screen.getByRole('button')
      expect(btn).toHaveTextContent('Save Entry')
      expect(btn.className).not.toContain('opacity-0')
      // When isLoading is absent, the button does not wrap its children in a positioning span.
      expect(btn.querySelector('span[aria-hidden="true"]')).toBeNull()
    })

    it('sizes the spinner by the button size prop', () => {
      const { container, rerender } = render(
        <Button isLoading size="sm">
          A
        </Button>,
      )
      expect(container.querySelector('svg')).toHaveAttribute('width', '16')

      rerender(
        <Button isLoading size="md">
          A
        </Button>,
      )
      expect(container.querySelector('svg')).toHaveAttribute('width', '18')

      rerender(
        <Button isLoading size="lg">
          A
        </Button>,
      )
      expect(container.querySelector('svg')).toHaveAttribute('width', '20')
    })

    it('does not warn in dev when isLoading is used on a <button>', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(<Button isLoading>Submit</Button>)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('warns in dev when asChild + isLoading are combined and falls back to asChild rendering', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      render(
        <Button asChild isLoading>
          <a href="/x">Go</a>
        </Button>,
      )
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('isLoading is ignored when asChild is true'),
      )
      // Fall-back behavior: child renders as a normal anchor — no spinner, no aria-busy,
      // no opacity wrapper. The warning is the only signal; isLoading is a no-op.
      const link = screen.getByRole('link', { name: 'Go' })
      expect(link).not.toHaveAttribute('aria-busy')
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
      spy.mockRestore()
    })
  })
})
