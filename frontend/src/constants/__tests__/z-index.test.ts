import { describe, it, expect } from 'vitest'
import { Z } from '../z-index'

describe('z-index constants', () => {
  it('does not include INSTALL_BANNER', () => {
    expect('INSTALL_BANNER' in Z).toBe(false)
  })
})
