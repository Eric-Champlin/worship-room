const STACK_KEY = 'wr_bible_drawer_stack'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export type DrawerView =
  | { type: 'books' }
  | { type: 'chapters'; bookSlug: string }

interface PersistedStack {
  stack: DrawerView[]
  timestamp: number
}

export function readStack(): DrawerView[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STACK_KEY)
    if (!raw) return null
    const parsed: PersistedStack = JSON.parse(raw)
    if (Date.now() - parsed.timestamp > TTL_MS) {
      localStorage.removeItem(STACK_KEY)
      return null
    }
    if (!Array.isArray(parsed.stack) || parsed.stack.length === 0) return null
    return parsed.stack
  } catch {
    return null
  }
}

export function writeStack(stack: DrawerView[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    STACK_KEY,
    JSON.stringify({
      stack,
      timestamp: Date.now(),
    }),
  )
}

export function clearStack(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STACK_KEY)
}
