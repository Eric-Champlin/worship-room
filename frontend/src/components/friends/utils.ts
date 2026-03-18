/**
 * Splits a display name like "Sarah M." into first and last parts for the Avatar component.
 */
export function splitDisplayName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/**
 * Formats an ISO timestamp as compact "Active Xh ago" / "Active Xd ago" / "Active Xm ago".
 */
export function formatFriendActivity(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'Active now'
  if (minutes < 60) return `Active ${minutes}m ago`
  if (hours < 24) return `Active ${hours}h ago`
  return `Active ${days}d ago`
}
