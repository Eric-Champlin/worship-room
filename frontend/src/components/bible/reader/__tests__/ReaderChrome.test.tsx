import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ReaderChrome } from '../ReaderChrome'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'
import { createRef } from 'react'

function renderChrome(props?: Partial<Parameters<typeof ReaderChrome>[0]>) {
  const aaRef = createRef<HTMLButtonElement>()
  return render(
    <MemoryRouter>
      <BibleDrawerProvider>
        <ReaderChrome
          bookName="John"
          chapter={3}
          onTypographyToggle={props?.onTypographyToggle ?? vi.fn()}
          isTypographyOpen={props?.isTypographyOpen ?? false}
          aaRef={aaRef as React.RefObject<HTMLButtonElement | null>}
        />
      </BibleDrawerProvider>
    </MemoryRouter>,
  )
}

describe('ReaderChrome', () => {
  it('renders all 4 interactive elements with correct aria-labels', () => {
    renderChrome()

    expect(screen.getByLabelText('Back to Bible')).toBeTruthy()
    expect(screen.getByLabelText('Open chapter picker')).toBeTruthy()
    expect(screen.getByLabelText('Typography settings')).toBeTruthy()
    expect(screen.getByLabelText('Browse books')).toBeTruthy()
  })

  it('back button links to /bible', () => {
    renderChrome()

    const backLink = screen.getByLabelText('Back to Bible')
    expect(backLink.getAttribute('href')).toBe('/bible')
  })

  it('center label shows book name and chapter', () => {
    renderChrome()

    const label = screen.getByLabelText('Open chapter picker')
    expect(label.textContent).toContain('John')
    expect(label.textContent).toContain('3')
  })

  it('Aa button calls typography toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderChrome({ onTypographyToggle: onToggle })

    await user.click(screen.getByLabelText('Typography settings'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('all icon buttons have 44px minimum size', () => {
    renderChrome()

    const backBtn = screen.getByLabelText('Back to Bible')
    expect(backBtn.className).toContain('min-h-[44px]')
    expect(backBtn.className).toContain('min-w-[44px]')

    const aaBtn = screen.getByLabelText('Typography settings')
    expect(aaBtn.className).toContain('min-h-[44px]')
    expect(aaBtn.className).toContain('min-w-[44px]')

    const booksBtn = screen.getByLabelText('Browse books')
    expect(booksBtn.className).toContain('min-h-[44px]')
    expect(booksBtn.className).toContain('min-w-[44px]')
  })

  it('Aa button has correct aria-expanded when open', () => {
    renderChrome({ isTypographyOpen: true })

    const aaBtn = screen.getByLabelText('Typography settings')
    expect(aaBtn.getAttribute('aria-expanded')).toBe('true')
  })
})
