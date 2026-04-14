import { requireVapidPublicKey, getVapidPublicKey } from '@/lib/env'
import type { PushSubscriptionRecord } from './types'

const SUBSCRIPTION_KEY = 'wr_push_subscription'

/**
 * Convert a base64url-encoded VAPID public key to a Uint8Array
 * for use with PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Read stored subscription record from localStorage. */
function getStoredSubscription(): PushSubscriptionRecord | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PushSubscriptionRecord
  } catch {
    return null
  }
}

/** Persist subscription record to localStorage. */
function storeSubscription(record: PushSubscriptionRecord): void {
  try {
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(record))
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

/** Remove subscription record from localStorage. */
function clearSubscription(): void {
  try {
    localStorage.removeItem(SUBSCRIPTION_KEY)
  } catch {
    // localStorage unavailable
  }
}

/**
 * Create a new push subscription using the configured VAPID public key.
 * Stores the subscription in localStorage for future reference.
 *
 * IMPORTANT: Only call after confirming Notification.permission === 'granted'.
 */
export async function subscribeToPush(): Promise<PushSubscriptionRecord | null> {
  try {
    const registration = await navigator.serviceWorker.ready
    const vapidKey = requireVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    })

    const json = subscription.toJSON()
    const record: PushSubscriptionRecord = {
      endpoint: json.endpoint ?? '',
      keys: {
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
      },
      applicationServerKey: vapidKey,
      createdAt: Date.now(),
    }

    storeSubscription(record)
    return record
  } catch {
    return null
  }
}

/**
 * Unsubscribe from push notifications and clear the stored record.
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
  } catch {
    // Unsubscribe failed — still clear localStorage
  }
  clearSubscription()
}

/**
 * Ensure the push subscription is valid and up-to-date.
 *
 * Handles:
 * - Key rotation: if VAPID key has changed, re-subscribes
 * - Invalidation recovery: if browser lost the subscription, re-subscribes
 * - Returns null if user hasn't opted in (no stored subscription)
 */
export async function ensureSubscription(): Promise<PushSubscriptionRecord | null> {
  const stored = getStoredSubscription()
  const currentKey = getVapidPublicKey()

  // No stored subscription — user hasn't opted in
  if (!stored) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const liveSubscription = await registration.pushManager.getSubscription()

    // Key rotation: stored key differs from current VAPID key
    if (currentKey && stored.applicationServerKey !== currentKey) {
      if (liveSubscription) {
        await liveSubscription.unsubscribe()
      }
      clearSubscription()
      return subscribeToPush()
    }

    // Invalidation recovery: localStorage has a record but browser lost it
    if (!liveSubscription) {
      clearSubscription()
      return subscribeToPush()
    }

    // Normal: live subscription matches stored record
    return stored
  } catch {
    return stored // Return stored record even if live check fails
  }
}
