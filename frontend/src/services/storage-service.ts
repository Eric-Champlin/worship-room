import type {
  Favorite,
  FavoriteType,
  ListeningSession,
  RoutineDefinition,
  SavedMix,
  SessionState,
  SharedMixData,
} from '@/types/storage'

// ── localStorage keys ─────────────────────────────────────────────────
const KEYS = {
  favorites: 'wr_favorites',
  savedMixes: 'wr_saved_mixes',
  listeningHistory: 'wr_listening_history',
  sessionState: 'wr_session_state',
  routines: 'wr_routines',
} as const

const LISTENING_HISTORY_CAP = 100
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Error type for quota exceeded ────────────────────────────────────
export class StorageQuotaError extends Error {
  constructor() {
    super('localStorage quota exceeded')
    this.name = 'StorageQuotaError'
  }
}

// ── Interface ─────────────────────────────────────────────────────────
export interface StorageService {
  // Auth
  setAuthState(isAuthenticated: boolean): void

  // Favorites
  getFavorites(): Favorite[]
  addFavorite(type: FavoriteType, targetId: string): void
  removeFavorite(type: FavoriteType, targetId: string): void
  isFavorite(type: FavoriteType, targetId: string): boolean

  // Saved Mixes
  getSavedMixes(): SavedMix[]
  saveMix(name: string, sounds: { soundId: string; volume: number }[]): SavedMix
  updateMixName(id: string, name: string): void
  deleteMix(id: string): void
  duplicateMix(id: string): SavedMix | null

  // Listening History
  getListeningHistory(): ListeningSession[]
  logListeningSession(session: Omit<ListeningSession, 'id'>): void
  getRecentSessions(limit: number): ListeningSession[]

  // Session State
  getSessionState(): SessionState | null
  saveSessionState(state: SessionState): void
  clearSessionState(): void

  // Routines
  getRoutines(): RoutineDefinition[]
  saveRoutine(routine: RoutineDefinition): void
  updateRoutine(routine: RoutineDefinition): void
  deleteRoutine(id: string): void
  duplicateRoutine(id: string): RoutineDefinition | null

  // Sharing (read-only, no auth needed)
  createShareableLink(sounds: { soundId: string; volume: number }[]): string
  decodeSharedMix(encoded: string): SharedMixData | null
}

// ── Helpers ───────────────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new StorageQuotaError()
    }
    throw e
  }
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad === 2) base64 += '=='
  else if (pad === 3) base64 += '='
  return atob(base64)
}

// ── localStorage Implementation ──────────────────────────────────────
export class LocalStorageService implements StorageService {
  private _isAuthenticated = false

  setAuthState(isAuthenticated: boolean): void {
    this._isAuthenticated = isAuthenticated
  }

  private requireAuth(action: string): void {
    if (!this._isAuthenticated) {
      throw new Error(`Cannot ${action}: not logged in`)
    }
  }

  // ── Favorites ─────────────────────────────────────────────────────
  getFavorites(): Favorite[] {
    if (!this._isAuthenticated) return []
    return readJSON<Favorite[]>(KEYS.favorites, [])
  }

  addFavorite(type: FavoriteType, targetId: string): void {
    this.requireAuth('add favorite')
    const favorites = readJSON<Favorite[]>(KEYS.favorites, [])
    if (favorites.some((f) => f.type === type && f.targetId === targetId)) return
    favorites.push({ type, targetId, createdAt: new Date().toISOString() })
    writeJSON(KEYS.favorites, favorites)
  }

  removeFavorite(type: FavoriteType, targetId: string): void {
    this.requireAuth('remove favorite')
    const favorites = readJSON<Favorite[]>(KEYS.favorites, []).filter(
      (f) => !(f.type === type && f.targetId === targetId),
    )
    writeJSON(KEYS.favorites, favorites)
  }

  isFavorite(type: FavoriteType, targetId: string): boolean {
    if (!this._isAuthenticated) return false
    return readJSON<Favorite[]>(KEYS.favorites, []).some(
      (f) => f.type === type && f.targetId === targetId,
    )
  }

  // ── Saved Mixes ──────────────────────────────────────────────────
  getSavedMixes(): SavedMix[] {
    if (!this._isAuthenticated) return []
    return readJSON<SavedMix[]>(KEYS.savedMixes, [])
  }

  saveMix(
    name: string,
    sounds: { soundId: string; volume: number }[],
  ): SavedMix {
    this.requireAuth('save mix')
    const now = new Date().toISOString()
    const mix: SavedMix = {
      id: crypto.randomUUID(),
      name,
      sounds,
      createdAt: now,
      updatedAt: now,
    }
    const mixes = readJSON<SavedMix[]>(KEYS.savedMixes, [])
    mixes.push(mix)
    writeJSON(KEYS.savedMixes, mixes)
    return mix
  }

  updateMixName(id: string, name: string): void {
    this.requireAuth('update mix name')
    const mixes = readJSON<SavedMix[]>(KEYS.savedMixes, [])
    const mix = mixes.find((m) => m.id === id)
    if (!mix) return
    mix.name = name
    mix.updatedAt = new Date().toISOString()
    writeJSON(KEYS.savedMixes, mixes)
  }

  deleteMix(id: string): void {
    this.requireAuth('delete mix')
    const mixes = readJSON<SavedMix[]>(KEYS.savedMixes, []).filter((m) => m.id !== id)
    writeJSON(KEYS.savedMixes, mixes)
  }

  duplicateMix(id: string): SavedMix | null {
    this.requireAuth('duplicate mix')
    const mixes = readJSON<SavedMix[]>(KEYS.savedMixes, [])
    const original = mixes.find((m) => m.id === id)
    if (!original) return null

    const now = new Date().toISOString()
    const copy: SavedMix = {
      id: crypto.randomUUID(),
      name: `${original.name} Copy`,
      sounds: [...original.sounds.map((s) => ({ ...s }))],
      createdAt: now,
      updatedAt: now,
    }
    mixes.push(copy)
    writeJSON(KEYS.savedMixes, mixes)
    return copy
  }

  // ── Listening History ─────────────────────────────────────────────
  getListeningHistory(): ListeningSession[] {
    if (!this._isAuthenticated) return []
    return readJSON<ListeningSession[]>(KEYS.listeningHistory, [])
  }

  logListeningSession(session: Omit<ListeningSession, 'id'>): void {
    this.requireAuth('log listening session')
    const history = readJSON<ListeningSession[]>(KEYS.listeningHistory, [])
    history.push({ ...session, id: crypto.randomUUID() })

    // Cap at LISTENING_HISTORY_CAP — prune oldest
    while (history.length > LISTENING_HISTORY_CAP) {
      history.shift()
    }

    writeJSON(KEYS.listeningHistory, history)
  }

  getRecentSessions(limit: number): ListeningSession[] {
    if (!this._isAuthenticated) return []
    const history = readJSON<ListeningSession[]>(KEYS.listeningHistory, [])
    return history.slice(-limit)
  }

  // ── Session State ─────────────────────────────────────────────────
  getSessionState(): SessionState | null {
    if (!this._isAuthenticated) return null
    const state = readJSON<SessionState | null>(KEYS.sessionState, null)
    if (!state) return null

    // Auto-clear expired sessions
    const savedAt = new Date(state.savedAt).getTime()
    if (Date.now() - savedAt > SESSION_EXPIRY_MS) {
      this.clearSessionState()
      return null
    }

    return state
  }

  saveSessionState(state: SessionState): void {
    this.requireAuth('save session state')
    writeJSON(KEYS.sessionState, state)
  }

  clearSessionState(): void {
    localStorage.removeItem(KEYS.sessionState)
  }

  // ── Routines ────────────────────────────────────────────────────
  getRoutines(): RoutineDefinition[] {
    if (!this._isAuthenticated) return []
    return readJSON<RoutineDefinition[]>(KEYS.routines, [])
  }

  saveRoutine(routine: RoutineDefinition): void {
    this.requireAuth('save routine')
    const routines = readJSON<RoutineDefinition[]>(KEYS.routines, [])
    routines.push(routine)
    writeJSON(KEYS.routines, routines)
  }

  updateRoutine(routine: RoutineDefinition): void {
    this.requireAuth('update routine')
    const routines = readJSON<RoutineDefinition[]>(KEYS.routines, [])
    const idx = routines.findIndex((r) => r.id === routine.id)
    if (idx === -1) return
    routines[idx] = { ...routine, updatedAt: new Date().toISOString() }
    writeJSON(KEYS.routines, routines)
  }

  deleteRoutine(id: string): void {
    this.requireAuth('delete routine')
    const routines = readJSON<RoutineDefinition[]>(KEYS.routines, []).filter(
      (r) => r.id !== id,
    )
    writeJSON(KEYS.routines, routines)
  }

  duplicateRoutine(id: string): RoutineDefinition | null {
    this.requireAuth('duplicate routine')
    const routines = readJSON<RoutineDefinition[]>(KEYS.routines, [])
    const original = routines.find((r) => r.id === id)
    if (!original) return null

    const now = new Date().toISOString()
    const copy: RoutineDefinition = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} Copy`,
      isTemplate: false,
      steps: original.steps.map((s) => ({ ...s, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    }
    routines.push(copy)
    writeJSON(KEYS.routines, routines)
    return copy
  }

  // ── Sharing (no auth required) ──────────────────────────────────
  createShareableLink(sounds: { soundId: string; volume: number }[]): string {
    const data: SharedMixData = {
      sounds: sounds.map((s) => ({ id: s.soundId, v: s.volume })),
    }
    const encoded = toBase64Url(JSON.stringify(data))
    return `${window.location.origin}/music?tab=ambient&mix=${encoded}`
  }

  decodeSharedMix(encoded: string): SharedMixData | null {
    try {
      const json = fromBase64Url(encoded)
      const data = JSON.parse(json) as SharedMixData
      if (!data.sounds || !Array.isArray(data.sounds)) return null
      for (const s of data.sounds) {
        if (typeof s.id !== 'string' || typeof s.v !== 'number') return null
      }
      return data
    } catch (_e) {
      // Malformed base64 or JSON in shared mix URL
      return null
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────
export const storageService: StorageService = new LocalStorageService()
