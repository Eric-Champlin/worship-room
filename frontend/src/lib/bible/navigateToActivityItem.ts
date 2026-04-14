import type { NavigateFunction } from 'react-router-dom'
import type { ActivityItem } from '@/types/my-bible'

export function navigateToActivityItem(navigate: NavigateFunction, item: ActivityItem): void {
  navigate(`/bible/${item.book}/${item.chapter}`)
}
