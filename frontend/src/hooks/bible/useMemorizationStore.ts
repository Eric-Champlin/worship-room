import { useSyncExternalStore } from 'react'
import { getAllCards, subscribe } from '@/lib/memorize'
import type { MemorizationCard } from '@/types/memorize'

function getServerSnapshot(): MemorizationCard[] {
  return []
}

export function useMemorizationStore(): MemorizationCard[] {
  return useSyncExternalStore(subscribe, getAllCards, getServerSnapshot)
}
