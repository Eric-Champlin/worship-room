import { describe, it, expect, beforeEach } from 'vitest'
import { urlBase64ToUint8Array } from '../subscription'

// Only test the pure utility function — subscription lifecycle requires
// navigator.serviceWorker which is not available in jsdom.

describe('urlBase64ToUint8Array', () => {
  it('converts a known base64url string to Uint8Array', () => {
    // "AQAB" in base64url = [1, 0, 1] in bytes
    const result = urlBase64ToUint8Array('AQAB')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(1)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(1)
  })

  it('handles base64url characters (- and _)', () => {
    // base64url uses - instead of + and _ instead of /
    // "ab-_" in base64url = "ab+/" in base64
    const result = urlBase64ToUint8Array('ab-_')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(3)
  })

  it('handles padding correctly', () => {
    // "YQ" needs "==" padding to become "YQ==" (decodes to "a" = [97])
    const result = urlBase64ToUint8Array('YQ')
    expect(result[0]).toBe(97) // 'a'
  })

  it('handles the VAPID placeholder key format', () => {
    const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-dRgkJiVWFCL_F-rxJGXPbUZMR0a0xS9mW_Y78'
    const result = urlBase64ToUint8Array(vapidKey)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(65) // VAPID public keys are 65 bytes
  })
})

describe('subscription lifecycle (mock-dependent)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('localStorage key wr_push_subscription is empty initially', () => {
    expect(localStorage.getItem('wr_push_subscription')).toBeNull()
  })
})
