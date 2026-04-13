import type { StoredPayload } from './types'

const DB_NAME = 'wr-notifications'
const DB_VERSION = 1
const STORE_NAME = 'payloads'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storePayload(entry: StoredPayload): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(entry)
    db.close()
  } catch {
    // IDB unavailable — degrade gracefully
  }
}

export async function getPayload(key: string): Promise<StoredPayload | undefined> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const result = await idbRequest(tx.objectStore(STORE_NAME).get(key))
    db.close()
    return result as StoredPayload | undefined
  } catch {
    return undefined
  }
}

export async function markFired(key: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const entry = await idbRequest(store.get(key))
    if (entry) {
      store.put({ ...entry, fired: true })
    }
    db.close()
  } catch {
    // IDB unavailable — degrade gracefully
  }
}
