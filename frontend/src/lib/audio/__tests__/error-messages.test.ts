import { describe, it, expect } from 'vitest'
import {
  audioErrorMessageFor,
  GENERIC_FAILURE,
  SLOW_CONNECTION,
  NETWORK_PROBLEM,
  CHAPTER_UNAVAILABLE,
  RATE_LIMITED,
  NOT_CONFIGURED,
} from '@/lib/audio/error-messages'

describe('audioErrorMessageFor (BB-26)', () => {
  it('network → network problem message', () => {
    expect(audioErrorMessageFor({ kind: 'network', message: '' })).toBe(NETWORK_PROBLEM)
  })

  it('http 404 → chapter unavailable', () => {
    expect(
      audioErrorMessageFor({ kind: 'http', status: 404, message: 'not found' }),
    ).toBe(CHAPTER_UNAVAILABLE)
  })

  it('http 429 → rate limited message', () => {
    expect(
      audioErrorMessageFor({ kind: 'http', status: 429, message: 'rate' }),
    ).toBe(RATE_LIMITED)
  })

  it('http 500 → generic failure', () => {
    expect(
      audioErrorMessageFor({ kind: 'http', status: 500, message: 'oh no' }),
    ).toBe(GENERIC_FAILURE)
  })

  it('timeout → slow connection message', () => {
    expect(audioErrorMessageFor({ kind: 'timeout', message: '' })).toBe(SLOW_CONNECTION)
  })

  it('parse → generic failure', () => {
    expect(audioErrorMessageFor({ kind: 'parse', message: '' })).toBe(GENERIC_FAILURE)
  })

  it('missing-key → not configured message', () => {
    expect(audioErrorMessageFor({ kind: 'missing-key', message: '' })).toBe(NOT_CONFIGURED)
  })

  it('Howler "Connection is slow" string passes through', () => {
    expect(audioErrorMessageFor('Connection is slow. try later')).toBe(SLOW_CONNECTION)
  })

  it('unknown error → generic failure', () => {
    expect(audioErrorMessageFor(undefined)).toBe(GENERIC_FAILURE)
    expect(audioErrorMessageFor(null)).toBe(GENERIC_FAILURE)
    expect(audioErrorMessageFor('random string')).toBe(GENERIC_FAILURE)
  })
})
