import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScriptureReferenceInput } from '../ScriptureReferenceInput'

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible'

beforeEach(() => {
  vi.mocked(loadChapterWeb).mockReset()
})

describe('ScriptureReferenceInput', () => {
  it('renders input with label and placeholder', () => {
    render(<ScriptureReferenceInput onChange={vi.fn()} />)
    expect(screen.getByLabelText(/Scripture reference \(optional\)/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., Romans 8:28')).toBeInTheDocument()
  })

  it('emits onChange(null, null) when input is empty', () => {
    const onChange = vi.fn()
    render(<ScriptureReferenceInput onChange={onChange} />)
    expect(onChange).toHaveBeenLastCalledWith(null, null)
  })

  it('emits onChange(null, null) and shows error for invalid input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    await user.type(screen.getByLabelText(/Scripture reference/), 'Foo 99:99')
    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't match/i)
    expect(onChange).toHaveBeenLastCalledWith(null, null)
  })

  it('chapter-only reference shows note and emits no pair', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    await user.type(screen.getByLabelText(/Scripture reference/), 'Romans 8')
    expect(await screen.findByText(/Specify a verse to attach scripture/)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(null, null)
  })

  it('valid input with verse triggers debounced lookup and emits pair', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 16, text: 'For God so loved the world...' }],
      paragraphs: [],
    } as never)
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    await user.type(screen.getByLabelText(/Scripture reference/), 'John 3:16')
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('John 3:16', 'For God so loved the world...'),
    )
    expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument()
  })

  it('clearing the input after valid lookup emits onChange(null, null) immediately', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 16, text: 'For God so loved the world...' }],
      paragraphs: [],
    } as never)
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    const input = screen.getByLabelText(/Scripture reference/)
    await user.type(input, 'John 3:16')
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('John 3:16', 'For God so loved the world...'),
    )
    await user.clear(input)
    expect(onChange).toHaveBeenLastCalledWith(null, null)
  })

  it('only commits the LAST lookup result when typing rapidly (race-condition guard)', async () => {
    let resolveLookup1: (value: unknown) => void = () => {}
    let resolveLookup2: (value: unknown) => void = () => {}
    vi.mocked(loadChapterWeb)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveLookup1 = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveLookup2 = resolve
          }),
      )
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    const input = screen.getByLabelText(/Scripture reference/)

    await user.type(input, 'John 3:1')
    await new Promise((r) => setTimeout(r, 350))
    await user.type(input, '6') // now 'John 3:16'
    await new Promise((r) => setTimeout(r, 350))

    // Resolve the SECOND lookup first, then the first (stale)
    act(() => {
      resolveLookup2({
        bookSlug: 'john',
        chapter: 3,
        verses: [{ number: 16, text: 'For God so loved...' }],
        paragraphs: [],
      })
    })
    act(() => {
      resolveLookup1({
        bookSlug: 'john',
        chapter: 3,
        verses: [{ number: 1, text: 'There was a man...' }],
        paragraphs: [],
      })
    })

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('John 3:16', 'For God so loved...'),
    )
    expect(onChange).not.toHaveBeenCalledWith('John 3:1', 'There was a man...')
  })

  it('invalid → valid transition replaces error indicator with success state', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 16, text: 'For God so loved the world...' }],
      paragraphs: [],
    } as never)
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScriptureReferenceInput onChange={onChange} />)
    const input = screen.getByLabelText(/Scripture reference/)
    await user.type(input, 'Foo 99:99')
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'John 3:16')
    await waitFor(() =>
      expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('emits onValidityChange(true) for invalid input and (false) otherwise', async () => {
    vi.mocked(loadChapterWeb).mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 16, text: 'For God so loved the world...' }],
      paragraphs: [],
    } as never)
    const onValidityChange = vi.fn()
    const user = userEvent.setup()
    render(
      <ScriptureReferenceInput
        onChange={vi.fn()}
        onValidityChange={onValidityChange}
      />,
    )
    // Initial mount: empty state → not invalid
    expect(onValidityChange).toHaveBeenLastCalledWith(false)

    const input = screen.getByLabelText(/Scripture reference/)
    await user.type(input, 'Foo 99:99')
    await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(true))

    await user.clear(input)
    await user.type(input, 'Romans 8') // chapter-only → not invalid
    await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false))

    await user.clear(input)
    await user.type(input, 'John 3:16') // valid → not invalid
    await waitFor(() => expect(onValidityChange).toHaveBeenLastCalledWith(false))
  })
})
