/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { RangeRequestsPlugin } from 'workbox-range-requests'

declare const self: ServiceWorkerGlobalScope

// ── Precache (manifest injected by vite-plugin-pwa at build time) ──
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Navigation fallback (replaces generateSW navigateFallback) ──
const navHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navHandler, { denylist: [/^\/api\//] }))

// ──────────────────────────────────────────────────────────────────────
// Runtime caching rules — replicated EXACTLY from the previous
// generateSW workbox config in vite.config.ts (lines 36-111).
// Each rule preserves the original urlPattern, handler, cacheName,
// plugins, and options.
// ──────────────────────────────────────────────────────────────────────

// Rule 1: Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({
    cacheName: 'wr-google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
)

// Rule 2: Google Fonts webfonts
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'wr-google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  }),
)

// Rule 3: API routes
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'wr-api-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
    networkTimeoutSeconds: 10,
  }),
)

// Rule 4: Images
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  new CacheFirst({
    cacheName: 'wr-images-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
)

// Rule 5: Audio files
registerRoute(
  /\.(?:mp3|wav|ogg|m4a)$/,
  new CacheFirst({
    cacheName: 'wr-audio-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 10,
      }),
      new RangeRequestsPlugin(),
    ],
  }),
)

// Rule 6: Search index — CacheFirst after initial fetch (removed from precache in BB-36)
registerRoute(
  /\/search\/.*\.json$/,
  new CacheFirst({
    cacheName: 'wr-search-index-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  }),
)

// Rule 7: Same-origin catch-all
registerRoute(
  ({ sameOrigin }) => sameOrigin,
  new NetworkFirst({
    cacheName: 'wr-runtime-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
)

// ──────────────────────────────────────────────────────────────────────
// BB-41: Push notification handlers
// ──────────────────────────────────────────────────────────────────────

// Push event — parse payload from push server and show notification
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: { url?: string }
  }

  try {
    payload = event.data.json()
  } catch {
    return // Malformed payload — ignore
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag,
      data: payload.data,
    }),
  )
})

// Notification click — open or focus the app at the deep-link URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = (event.notification.data?.url as string) || '/'
  // Validate the URL is a same-origin relative path to prevent open-redirect via crafted push payloads
  const targetUrl = rawUrl.startsWith('/') ? rawUrl : '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus()
            ;(client as WindowClient).navigate(targetUrl)
            return
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl)
      }),
  )
})

// ──────────────────────────────────────────────────────────────────────
// BB-41: Local-fallback delivery (opportunistic, not perfect)
// ──────────────────────────────────────────────────────────────────────

// Periodic sync (Chrome/Edge only) — fires when OS wakes the SW
self.addEventListener('periodicsync', ((event: ExtendableEvent & { tag?: string }) => {
  if (event.tag === 'wr-notification-check') {
    event.waitUntil(checkAndFireFromIDB())
  }
}) as EventListener)

// Opportunistic on activate — fires when SW takes over
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      checkAndFireFromIDB(),
    ]),
  )
})

// ── IDB helpers (inline — sw.ts cannot use @/ imports) ──

const IDB_NAME = 'wr-notifications'
const IDB_VERSION = 1
const IDB_STORE = 'payloads'

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGet<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

interface StoredPayloadSW {
  key: string
  payload: {
    title: string
    body: string
    icon: string
    badge: string
    tag: string
    data: { url: string }
  }
  scheduledDate: string
  fired: boolean
}

async function checkAndFireFromIDB(): Promise<void> {
  try {
    const db = await openIDB()
    const d = new Date()
    const today =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')

    for (const key of ['daily-verse', 'streak-reminder']) {
      const readTx = db.transaction(IDB_STORE, 'readonly')
      const readStore = readTx.objectStore(IDB_STORE)
      const entry = await idbGet<StoredPayloadSW>(readStore, key)

      if (entry && entry.scheduledDate === today && !entry.fired) {
        await self.registration.showNotification(entry.payload.title, {
          body: entry.payload.body,
          icon: entry.payload.icon,
          badge: entry.payload.badge,
          tag: entry.payload.tag,
          data: entry.payload.data,
        })

        // Mark as fired
        const writeTx = db.transaction(IDB_STORE, 'readwrite')
        const writeStore = writeTx.objectStore(IDB_STORE)
        writeStore.put({ ...entry, fired: true })
      }
    }
    db.close()
  } catch {
    // IDB unavailable — silent no-op
  }
}
