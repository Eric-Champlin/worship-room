import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TypewriterInput } from '@/components/TypewriterInput'

const FIRST_PHRASE = "I'm going through a difficult season."

/** Advance fake timers one character at a time so each chained setTimeout fires and React re-renders between steps. */
function advanceByChars(count: number, speedMs: number) {
  for (let i = 0; i < count; i++) {
    act(() => {
      vi.advanceTimersByTime(speedMs)
    })
  }
}

function mockReducedMotion(enabled: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches:
      query === '(prefers-reduced-motion: reduce)' ? enabled : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function renderTypewriter(onSubmit = vi.fn()) {
  return { onSubmit, ...render(<TypewriterInput onSubmit={onSubmit} />) }
}

describe('TypewriterInput', () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  describe('accessibility', () => {
    it('has an accessible label', () => {
      renderTypewriter()
      expect(
        screen.getByLabelText(/tell us how you're feeling/i)
      ).toBeInTheDocument()
    })

    it('has a submit button', () => {
      renderTypewriter()
      const button = screen.getByRole('button', {
        name: /submit your question/i,
      })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
      expect(button.closest('form')).toBeInTheDocument()
    })
  })

  describe('typewriter animation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('starts typing on mount', () => {
      renderTypewriter()
      const input = screen.getByRole('textbox')

      expect(input).toHaveValue('')

      advanceByChars(5, 55)

      expect((input as HTMLInputElement).value.length).toBeGreaterThan(0)
    })

    it('types the full first phrase', () => {
      renderTypewriter()
      const input = screen.getByRole('textbox')

      advanceByChars(FIRST_PHRASE.length, 55)

      expect(input).toHaveValue(FIRST_PHRASE)
    })

    it('pauses on focus and clears display', () => {
      renderTypewriter()
      const input = screen.getByRole('textbox')

      advanceByChars(10, 55)
      expect((input as HTMLInputElement).value.length).toBeGreaterThan(0)

      fireEvent.focus(input)

      expect(input).toHaveValue('')

      advanceByChars(10, 55)
      expect(input).toHaveValue('')
    })
  })

  describe('reduced motion', () => {
    it('shows static placeholder with first phrase', () => {
      mockReducedMotion(true)
      renderTypewriter()
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', FIRST_PHRASE)
    })

  })

  describe('submit', () => {
    it('calls onSubmit with typed value', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TypewriterInput onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.type(input, 'I need prayer')
      await user.click(
        screen.getByRole('button', { name: /submit your question/i })
      )

      expect(onSubmit).toHaveBeenCalledWith('I need prayer')
    })

    it('does not call onSubmit for empty input', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TypewriterInput onSubmit={onSubmit} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.click(
        screen.getByRole('button', { name: /submit your question/i })
      )

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
