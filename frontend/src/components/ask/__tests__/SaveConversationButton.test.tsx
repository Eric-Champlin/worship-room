import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import { SaveConversationButton } from '../SaveConversationButton'
import { ASK_RESPONSES } from '@/mocks/ask-mock-data'

const PAIR_1 = { question: 'Why does God allow suffering?', response: ASK_RESPONSES.suffering }
const PAIR_2 = { question: 'How do I forgive?', response: ASK_RESPONSES.forgiveness }

function renderButton(conversation: typeof PAIR_1[]) {
  return render(
    <ToastProvider>
      <SaveConversationButton conversation={conversation} />
    </ToastProvider>,
  )
}

const writeTextMock = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
  writeTextMock.mockClear().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    writable: true,
    configurable: true,
  })
})

describe('SaveConversationButton', () => {
  it('button not visible with 0 Q&A pairs', () => {
    renderButton([])
    expect(screen.queryByRole('button', { name: /Save this conversation/i })).not.toBeInTheDocument()
  })

  it('button not visible with 1 Q&A pair', () => {
    renderButton([PAIR_1])
    expect(screen.queryByRole('button', { name: /Save this conversation/i })).not.toBeInTheDocument()
  })

  it('button visible with 2+ Q&A pairs', () => {
    renderButton([PAIR_1, PAIR_2])
    expect(screen.getByRole('button', { name: /Save this conversation/i })).toBeInTheDocument()
  })

  it('button has ClipboardCopy icon + correct label', () => {
    const { container } = renderButton([PAIR_1, PAIR_2])
    expect(screen.getByText('Save this conversation')).toBeInTheDocument()
    const icon = container.querySelector('.lucide-clipboard-copy')
    expect(icon).toBeInTheDocument()
  })

  it('click copies formatted conversation to clipboard', async () => {
    renderButton([PAIR_1, PAIR_2])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save this conversation/i }))
    })
    expect(writeTextMock).toHaveBeenCalledTimes(1)
    const copied = writeTextMock.mock.calls[0][0]
    expect(copied).toContain('Q: Why does God allow suffering?')
    expect(copied).toContain('Q: How do I forgive?')
  })

  it('copy includes all Q&A pairs with truncated answers', async () => {
    renderButton([PAIR_1, PAIR_2])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save this conversation/i }))
    })
    const copied = writeTextMock.mock.calls[0][0]
    expect(copied).toContain('A: ')
    expect(copied).toContain('...')  // Answers > 150 chars are truncated
    expect(copied).toContain('Verses: ')
  })

  it('copy includes "Saved from Worship Room" footer', async () => {
    renderButton([PAIR_1, PAIR_2])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save this conversation/i }))
    })
    const copied = writeTextMock.mock.calls[0][0]
    expect(copied).toContain('Saved from Worship Room (worshiproom.com)')
  })

  it('success toast appears on copy', async () => {
    renderButton([PAIR_1, PAIR_2])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save this conversation/i }))
    })
    expect(screen.getByText('Conversation copied to clipboard!')).toBeInTheDocument()
  })

  it('error toast appears on clipboard failure', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('fail'))
    renderButton([PAIR_1, PAIR_2])
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save this conversation/i }))
    })
    expect(screen.getByText(/try selecting the text manually/i)).toBeInTheDocument()
  })
})
