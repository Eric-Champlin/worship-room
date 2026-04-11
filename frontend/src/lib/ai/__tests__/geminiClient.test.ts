import { beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted so the mocks are available in the vi.mock factory (which is
// hoisted above imports). Plain `const` declarations are not hoisted.
const { mockGenerateContent, mockRequireGeminiApiKey } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockRequireGeminiApiKey: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  // Use a function declaration (not arrow) so vitest allows it as a constructor
  GoogleGenAI: vi.fn(function GoogleGenAI(this: { models: unknown }) {
    this.models = { generateContent: mockGenerateContent }
  }),
}))

vi.mock('@/lib/env', () => ({
  requireGeminiApiKey: () => mockRequireGeminiApiKey(),
}))

// NOTE: These imports must come AFTER the vi.mock calls above.
import { GoogleGenAI } from '@google/genai'
import {
  generateExplanation,
  generateReflection,
  __resetGeminiClientForTests,
} from '../geminiClient'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
} from '../errors'
import { EXPLAIN_PASSAGE_SYSTEM_PROMPT } from '../prompts/explainPassagePrompt'
import {
  REFLECT_PASSAGE_SYSTEM_PROMPT,
  buildReflectPassageUserPrompt,
} from '../prompts/reflectPassagePrompt'

const REFERENCE = '1 Corinthians 13:4-7'
const VERSE_TEXT = 'Love is patient and is kind; love doesn\'t envy.'
const HAPPY_RESPONSE = {
  text: 'Paul is writing to a factional Corinthian church, not a wedding audience.',
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ok' }] } }],
  promptFeedback: undefined,
}

beforeEach(() => {
  __resetGeminiClientForTests()
  vi.clearAllMocks()
  mockRequireGeminiApiKey.mockReturnValue('fake-test-key')
})

describe('generateExplanation — key missing', () => {
  it('throws GeminiKeyMissingError when requireGeminiApiKey throws', async () => {
    mockRequireGeminiApiKey.mockImplementation(() => {
      throw new Error('VITE_GEMINI_API_KEY not set')
    })
    // Silence the expected console.error for this test
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      generateExplanation(REFERENCE, VERSE_TEXT),
    ).rejects.toBeInstanceOf(GeminiKeyMissingError)

    errSpy.mockRestore()
  })

  it('preserves the original error as `cause` on GeminiKeyMissingError', async () => {
    const original = new Error('VITE_GEMINI_API_KEY not set')
    mockRequireGeminiApiKey.mockImplementation(() => {
      throw original
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      await generateExplanation(REFERENCE, VERSE_TEXT)
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(GeminiKeyMissingError)
      expect((err as Error).cause).toBe(original)
    }

    errSpy.mockRestore()
  })
})

describe('generateExplanation — lazy init', () => {
  it('does not instantiate GoogleGenAI at module load', () => {
    // Module was already imported above. The constructor should not have been
    // called yet if no generateExplanation call has been made.
    __resetGeminiClientForTests()
    vi.clearAllMocks()
    expect(GoogleGenAI).not.toHaveBeenCalled()
  })

  it('instantiates GoogleGenAI on the first call', async () => {
    mockGenerateContent.mockResolvedValue(HAPPY_RESPONSE)
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'fake-test-key' })
  })

  it('reuses the client on subsequent calls (memoized)', async () => {
    mockGenerateContent.mockResolvedValue(HAPPY_RESPONSE)
    await generateExplanation(REFERENCE, VERSE_TEXT)
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)
  })

  it('__resetGeminiClientForTests clears the memoized client', async () => {
    mockGenerateContent.mockResolvedValue(HAPPY_RESPONSE)
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)

    __resetGeminiClientForTests()
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(2)
  })
})

describe('generateExplanation — request payload shape', () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue(HAPPY_RESPONSE)
  })

  it('passes the model string gemini-2.5-flash-lite', async () => {
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash-lite' }),
    )
  })

  it('routes the system prompt through config.systemInstruction', async () => {
    await generateExplanation(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { systemInstruction: string } },
    ]
    expect(payload.config.systemInstruction).toBe(EXPLAIN_PASSAGE_SYSTEM_PROMPT)
  })

  it('does NOT prepend the system prompt to contents', async () => {
    await generateExplanation(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [{ contents: string }]
    expect(payload.contents.startsWith('Explain this passage from the World English Bible:')).toBe(
      true,
    )
    expect(payload.contents).not.toContain('You are a thoughtful biblical scholar')
  })

  it('passes temperature 0.7 and maxOutputTokens 600', async () => {
    await generateExplanation(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { temperature: number; maxOutputTokens: number } },
    ]
    expect(payload.config.temperature).toBe(0.7)
    expect(payload.config.maxOutputTokens).toBe(600)
  })

  it('passes an AbortSignal via config.abortSignal', async () => {
    await generateExplanation(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { abortSignal: unknown } },
    ]
    expect(payload.config.abortSignal).toBeInstanceOf(AbortSignal)
  })
})

describe('generateExplanation — success response', () => {
  it('returns { content, model } on success', async () => {
    mockGenerateContent.mockResolvedValue(HAPPY_RESPONSE)
    const result = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(result).toEqual({
      content: HAPPY_RESPONSE.text,
      model: 'gemini-2.5-flash-lite',
    })
  })

  it('trims leading/trailing whitespace from content', async () => {
    mockGenerateContent.mockResolvedValue({
      ...HAPPY_RESPONSE,
      text: '  hello world  \n\n',
    })
    const result = await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(result.content).toBe('hello world')
  })
})

describe('generateExplanation — safety block detection', () => {
  it('throws GeminiSafetyBlockError when promptFeedback.blockReason is set', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [],
      promptFeedback: { blockReason: 'SAFETY' },
    })
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when finishReason === SAFETY', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [{ finishReason: 'SAFETY' }],
      promptFeedback: undefined,
    })
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when finishReason === PROHIBITED_CONTENT', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [{ finishReason: 'PROHIBITED_CONTENT' }],
      promptFeedback: undefined,
    })
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when response text is empty/whitespace', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '   ',
      candidates: [{ finishReason: 'STOP' }],
      promptFeedback: undefined,
    })
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })
})

describe('generateExplanation — error classification', () => {
  it('throws GeminiTimeoutError on DOMException(name=TimeoutError)', async () => {
    mockGenerateContent.mockRejectedValue(new DOMException('timeout', 'TimeoutError'))
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('throws GeminiTimeoutError on AbortError', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    mockGenerateContent.mockRejectedValue(abortErr)
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('throws GeminiNetworkError on TypeError from fetch', async () => {
    mockGenerateContent.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiNetworkError,
    )
  })

  it('throws GeminiNetworkError on Error with network-ish message', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network disconnected'))
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiNetworkError,
    )
  })

  it('throws GeminiApiError on generic Error (invalid key, quota, etc.)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Invalid API key'))
    await expect(generateExplanation(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('preserves the original error as `cause`', async () => {
    const original = new Error('Invalid API key')
    mockGenerateContent.mockRejectedValue(original)
    try {
      await generateExplanation(REFERENCE, VERSE_TEXT)
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(GeminiApiError)
      expect((err as Error).cause).toBe(original)
    }
  })
})

// ─── BB-31 generateReflection tests ────────────────────────────────────────
// These tests are ADDITIVE to the BB-30 tests above. They do NOT modify any
// existing test. The mock surface (GoogleGenAI, requireGeminiApiKey) is
// shared, so any state (client singleton, call counters) must be reset via
// the global beforeEach at the top of the file.

const REFLECT_HAPPY_RESPONSE = {
  text: 'A reader might ask what it would mean to hold this passage gently.',
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ok' }] } }],
  promptFeedback: undefined,
}

describe('generateReflection — key missing', () => {
  it('throws GeminiKeyMissingError when requireGeminiApiKey throws', async () => {
    mockRequireGeminiApiKey.mockImplementation(() => {
      throw new Error('VITE_GEMINI_API_KEY not set')
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      generateReflection(REFERENCE, VERSE_TEXT),
    ).rejects.toBeInstanceOf(GeminiKeyMissingError)

    errSpy.mockRestore()
  })
})

describe('generateReflection — request payload shape', () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue(REFLECT_HAPPY_RESPONSE)
  })

  it('passes the model string gemini-2.5-flash-lite', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash-lite' }),
    )
  })

  it('routes REFLECT_PASSAGE_SYSTEM_PROMPT through config.systemInstruction', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { systemInstruction: string } },
    ]
    expect(payload.config.systemInstruction).toBe(REFLECT_PASSAGE_SYSTEM_PROMPT)
  })

  it('passes the built reflect user prompt as contents', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [{ contents: string }]
    expect(payload.contents).toBe(
      buildReflectPassageUserPrompt(REFERENCE, VERSE_TEXT),
    )
  })

  it('does NOT prepend the system prompt to contents', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [{ contents: string }]
    expect(payload.contents).not.toContain(
      'You are helping a reader think about how a scripture passage',
    )
  })

  it('passes temperature 0.7 and maxOutputTokens 600', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { temperature: number; maxOutputTokens: number } },
    ]
    expect(payload.config.temperature).toBe(0.7)
    expect(payload.config.maxOutputTokens).toBe(600)
  })

  it('passes an AbortSignal via config.abortSignal', async () => {
    await generateReflection(REFERENCE, VERSE_TEXT)
    const [payload] = mockGenerateContent.mock.calls[0] as [
      { config: { abortSignal: unknown } },
    ]
    expect(payload.config.abortSignal).toBeInstanceOf(AbortSignal)
  })
})

describe('generateReflection — shared client singleton', () => {
  it('reuses the same GoogleGenAI instance as generateExplanation', async () => {
    mockGenerateContent.mockResolvedValue(REFLECT_HAPPY_RESPONSE)
    // Call generateExplanation first to initialize the singleton
    await generateExplanation(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)
    // Now call generateReflection — should reuse the same client instance
    await generateReflection(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)
  })

  it('reuses client across multiple generateReflection calls', async () => {
    mockGenerateContent.mockResolvedValue(REFLECT_HAPPY_RESPONSE)
    await generateReflection(REFERENCE, VERSE_TEXT)
    await generateReflection(REFERENCE, VERSE_TEXT)
    expect(GoogleGenAI).toHaveBeenCalledTimes(1)
  })
})

describe('generateReflection — success response', () => {
  it('returns { content, model } on success', async () => {
    mockGenerateContent.mockResolvedValue(REFLECT_HAPPY_RESPONSE)
    const result = await generateReflection(REFERENCE, VERSE_TEXT)
    expect(result).toEqual({
      content: REFLECT_HAPPY_RESPONSE.text,
      model: 'gemini-2.5-flash-lite',
    })
  })

  it('trims leading/trailing whitespace from content', async () => {
    mockGenerateContent.mockResolvedValue({
      ...REFLECT_HAPPY_RESPONSE,
      text: '  a reader might ask  \n\n',
    })
    const result = await generateReflection(REFERENCE, VERSE_TEXT)
    expect(result.content).toBe('a reader might ask')
  })
})

describe('generateReflection — safety block detection', () => {
  it('throws GeminiSafetyBlockError when promptFeedback.blockReason is set', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [],
      promptFeedback: { blockReason: 'SAFETY' },
    })
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when finishReason === SAFETY', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [{ finishReason: 'SAFETY' }],
      promptFeedback: undefined,
    })
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when finishReason === PROHIBITED_CONTENT', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '',
      candidates: [{ finishReason: 'PROHIBITED_CONTENT' }],
      promptFeedback: undefined,
    })
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })

  it('throws GeminiSafetyBlockError when response text is empty/whitespace', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '   ',
      candidates: [{ finishReason: 'STOP' }],
      promptFeedback: undefined,
    })
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiSafetyBlockError,
    )
  })
})

describe('generateReflection — error classification', () => {
  it('throws GeminiTimeoutError on DOMException(name=TimeoutError)', async () => {
    mockGenerateContent.mockRejectedValue(
      new DOMException('timeout', 'TimeoutError'),
    )
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('throws GeminiTimeoutError on AbortError', async () => {
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    mockGenerateContent.mockRejectedValue(abortErr)
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiTimeoutError,
    )
  })

  it('throws GeminiNetworkError on TypeError from fetch', async () => {
    mockGenerateContent.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiNetworkError,
    )
  })

  it('throws GeminiApiError on generic Error (invalid key, quota, etc.)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Invalid API key'))
    await expect(generateReflection(REFERENCE, VERSE_TEXT)).rejects.toBeInstanceOf(
      GeminiApiError,
    )
  })

  it('re-throws caller AbortError unchanged (silent discard path)', async () => {
    // Pre-abort the caller's signal
    const controller = new AbortController()
    controller.abort()
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    mockGenerateContent.mockRejectedValue(abortErr)

    try {
      await generateReflection(REFERENCE, VERSE_TEXT, controller.signal)
      expect.fail('should have thrown')
    } catch (err) {
      // Must be the raw AbortError, NOT wrapped as GeminiTimeoutError
      expect(err).toBe(abortErr)
      expect((err as Error).name).toBe('AbortError')
      expect(err).not.toBeInstanceOf(GeminiTimeoutError)
    }
  })
})
